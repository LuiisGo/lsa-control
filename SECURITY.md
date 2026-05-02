# Seguridad — LSA Control

Este documento resume la postura de seguridad del sistema, las vulnerabilidades
encontradas en la auditoría del 2026-05-01, su estado de remediación, y los pasos
manuales que el cliente debe ejecutar.

## Arquitectura de seguridad (1 página)

```
┌──────────────────────────┐         ┌─────────────────────────────┐
│   Browser (cliente)      │         │   Next.js (Netlify)         │
│                          │         │                             │
│  /login    /admin/*      │  HTTPS  │  middleware.ts              │
│  /empleado/*  /portal/*  │ ──────► │   - protege /admin /empleado│
│                          │         │   - excluye /portal/*       │
│  next-auth JWT cookie    │         │  /api/proxy (server-side)   │
│  (httpOnly, sameSite)    │         │   - única salida a GAS      │
└──────────────────────────┘         └──────────────┬──────────────┘
                                                    │
                                                    │ HTTPS
                                                    ▼
                                        ┌──────────────────────────┐
                                        │  Apps Script Web App     │
                                        │                          │
                                        │  Code.gs / doPost        │
                                        │   - acciones públicas:   │
                                        │     login, portal*       │
                                        │   - acciones privadas:   │
                                        │     validateToken()      │
                                        │       - SHA-256 password │
                                        │       - 8h token TTL     │
                                        │   - registrarLog()       │
                                        └──────────────┬───────────┘
                                                       │
                                                       ▼
                                        ┌──────────────────────────┐
                                        │ Google Sheets (privado)  │
                                        │                          │
                                        │  Usuarios, Cargas,       │
                                        │  PLANILLAS, GASTOS, ...  │
                                        │                          │
                                        │  USUARIOS protegida con  │
                                        │  warning + hash SHA-256  │
                                        └──────────────────────────┘
```

### Principios

1. **Toda salida del cliente al backend pasa por `/api/proxy`** (server-side
   Next.js) — nunca el browser habla directo con Apps Script.
2. **Tokens de sesión Apps Script con TTL de 8h** — invalidación automática.
3. **Contraseñas siempre hasheadas (SHA-256 + salt)** — nunca texto plano.
4. **Toda escritura/edición/eliminación pasa por `validateToken()` + role check**.
5. **Inputs sanitizados** contra formula injection en celdas (`=`, `+`, `-`, `@`).
6. **Headers de seguridad estrictos** — CSP, X-Frame-Options DENY, HSTS,
   Permissions-Policy.

## Vulnerabilidades — auditoría 2026-05-01

### 🔴 CRÍTICO

| ID | Descripción | Status |
|----|-------------|--------|
| C1 | Portal `/portal/[token]` retornaba HTTP 500 (`use(params)` Next 15 en proyecto Next 14) | **FIXED** |
| C2 | `NEXTAUTH_SECRET` con fallback hardcodeado en repo | **FIXED** |
| C3 | Contraseñas en texto plano en Sheets | **FIXED** + migración `migrarPasswords()` |
| C4 | Tokens de sesión sin expiración | **FIXED** — 8h TTL + columna `Token_Expira` |

### 🟠 ALTO

| ID | Descripción | Status |
|----|-------------|--------|
| A1 | `apiToken` Apps Script expuesto en `session.user` cliente (XSS lo lee) | **ACCEPTED RISK** — refactor mayor; mitigado por CSP + sameSite cookies |
| A2 | `err.message` filtrado al cliente en `doPost` y `subirFoto` | **FIXED** — log interno + mensaje genérico |
| A3 | Faltaban checks de role en `editarCarga`, `deleteCarga`, `deleteMedicion`, `saveProveedor`, `toggleProveedor` | **FIXED** |
| A4 | `registrarLog` casi nunca llamado | **FIXED** — agregado en saveCarga, editarCarga, deleteCarga, deleteMedicion, saveUsuario, deleteGasto |
| A5 | Formula injection en Sheets (sin sanitizar `=`, `+`, `-`, `@`) | **FIXED** — `sanitizarValor()` en proveedor, foto_url, username, nombre |
| A6 | Validación de fotos ausente (sin tamaño, MIME real) | **FIXED** — 5MB max, MIME validado, compresión >1MB cliente |
| A7 | `saveUsuario` no validaba username duplicado en edit | **FIXED** |
| A8 | Sin rate limiting en login | **FIXED** — 5 intentos / lockout 5min (cliente) |
| A9 | `generateToken()` con `Math.random()` (no CSPRNG) | **FIXED** — usa `Utilities.generateKey(32)` |
| A10 | CSP + Permissions-Policy ausentes | **FIXED** en `next.config.js` |
| A11 | Códigos portal regenerables sin invalidar sesiones previas | **ACCEPTED RISK** — sessionStorage cliente expira al cerrar pestaña |

### 🟡 MEDIO

| ID | Descripción | Status |
|----|-------------|--------|
| M1 | Códigos portal 6 chars / 32 alfabeto = ~30 bits entropy | PENDING — agregar lockout server-side |
| M2 | `marcarPlanillaPagada` sin `registrarLog` | PENDING |
| M3 | No verifica fecha futura en `generarPlanilla` | PENDING |
| M4 | `email: rowUser` confunde — es username, no email | PENDING (cosmético) |

### ℹ️ INFO

- Rate limiting solo en cliente — atacante con curl puede bypass. Agregar
  rate limiting en Apps Script con `PropertiesService` requiere segunda iteración.
- CSRF no usa tokens explícitos — mitigado por sameSite cookies de NextAuth.

## Pasos manuales (deben ejecutarse en orden)

### 1. Configurar variables de entorno en Netlify

En **Site settings → Environment variables**, definir:

```
NEXT_PUBLIC_API_URL = (URL del Web App de Apps Script)
NEXTAUTH_SECRET     = (output de: openssl rand -base64 32)
NEXTAUTH_URL        = https://controldiario-lsa.netlify.app
```

> El build falla explícitamente si `NEXTAUTH_SECRET` no está definido.

### 2. Configurar Script Properties en Apps Script

Abrir Apps Script → **Project Settings** → **Script Properties** → **Add script property**:

| Property | Value |
|----------|-------|
| `SPREADSHEET_ID` | (ID del Sheet de producción) |
| `PASSWORD_SALT` | (string aleatorio, generar una vez y nunca rotar) |

> Para generar PASSWORD_SALT: `openssl rand -hex 32` y pegarlo.

### 3. Deploy y migración de Apps Script

1. Copiar todos los `.gs` actualizados al editor de Apps Script.
2. Desde el menú **Run** ejecutar `migrateSheets()` una vez. Esto:
   - Agrega columnas `CredentialId`, `PublicKey`, `Permisos`, `Token_Expira` a `Usuarios`.
   - Hashea las contraseñas existentes en texto plano (SHA-256 + salt).
   - Genera códigos faltantes para proveedores legacy.
3. **Deploy → Manage deployments → New version**. Copiar la URL.
4. Actualizar `NEXT_PUBLIC_API_URL` en Netlify si la URL cambió.

### 4. Verificar permisos del Spreadsheet

1. Abrir el Sheet de producción → **Share**.
2. Solo debe figurar la cuenta propietaria de Agrícola San Antonio.
3. **Anyone with the link** debe estar **deshabilitado**.
4. La hoja `Usuarios` queda protegida automáticamente con warning al editar
   manualmente (gracias a `setup()` actualizado).

### 5. Confirmar `.env.local` no está en el repo

```bash
git ls-files | grep -E "^\.env" || echo "OK — sin archivos .env tracked"
```

Si aparece algún `.env*`, ejecutar `git rm --cached <archivo>` y commit.

### 6. Si el repo es público o se sospecha leak

- **Rotar `NEXTAUTH_SECRET`** en Netlify y redeploy. Esto invalida todas las
  sesiones existentes.
- Forzar logout de todos los usuarios desde Sheet `Usuarios`: borrar la
  columna `ApiToken` completa.

## Cómo invalidar una sesión sospechosa

1. Abrir el Sheet `Usuarios`.
2. Encontrar la fila del usuario.
3. Borrar el contenido de `ApiToken` (col 7) y `Token_Expira` (col 11).
4. Esa sesión queda invalidada inmediatamente — el próximo request retornará
   "Token inválido o sesión expirada".

## Cómo regenerar acceso del portal de proveedores

1. Como admin, ir a la sección de proveedores → portal.
2. Click en **Generar acceso** sobre el proveedor — esto reescribe `Codigo_Acceso`
   y `Link_Token` en `ACCESOS_PROVEEDORES`.
3. El proveedor anterior queda automáticamente bloqueado (su código viejo deja
   de matchear).

## Convenciones para nuevo código

- **Toda función que escriba en Sheets debe**:
  - Recibir `user` y validar permiso/role.
  - Sanitizar inputs string con `sanitizarValor()`.
  - Llamar a `registrarLog()` con before/after.
- **Nunca retornar `err.message` al cliente** — usar `Logger.log` interno y
  responder mensaje genérico.
- **Nunca usar `Math.random()` para tokens, IDs de seguridad, o salts** — usar
  `Utilities.generateKey()` o `Utilities.getUuid()`.
- **Frontend: nunca tocar el token directamente** — pasarlo solo a `apiCall()`
  desde `useSession()`. Nunca loguear con `console.log`.
