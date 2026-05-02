# Control Entradas y Salidas LSA

Sistema de gestión de entradas y salidas de combustible para LSA. Construido con Next.js 14, TypeScript, Tailwind CSS y deployado en Netlify.

## Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Auth**: next-auth v4 (JWT, 8h sesión)
- **Backend**: Google Apps Script Web App (API REST)
- **PWA**: next-pwa (Service Worker, modo offline)
- **Deploy**: Netlify + @netlify/plugin-nextjs

## Setup local

### 1. Clonar e instalar

```bash
git clone <repo-url>
cd lsa-control
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env.local
```

Editá `.env.local`:

```env
NEXT_PUBLIC_API_URL=https://script.google.com/macros/s/TU_SCRIPT_ID/exec
NEXTAUTH_SECRET=genera-con-openssl-rand-base64-32
NEXTAUTH_URL=http://localhost:3000
```

### 3. Obtener la URL del Apps Script

1. Abrí tu Google Apps Script
2. Deploy → New deployment → Web App
3. Execute as: **Me**, Who has access: **Anyone**
4. Copiá la URL generada → pegala en `NEXT_PUBLIC_API_URL`

### 4. Correr en desarrollo

```bash
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000)

## Primer acceso

| Campo | Valor |
|-------|-------|
| Email | `admin@lsa.com` |
| Contraseña | `Admin1234!` |

Después del primer login, cambiá la contraseña desde la sección **Usuarios**.

## Crear usuarios nuevos

1. Logueate como admin
2. Ir a **Usuarios** en el sidebar
3. Click en **Nuevo usuario**
4. Completar: Nombre, Email, Rol (admin/empleado), Contraseña
5. Guardar

## Registrar biométrico (Face ID / Huella)

1. Ir a **Usuarios** como admin
2. Encontrá el usuario en la tabla
3. Click en el ícono de huella digital
4. El navegador pedirá autenticación biométrica
5. Completar el proceso

Para usarlo: en la pantalla de login aparecerá el botón "Face ID / Huella digital" automáticamente si el dispositivo tiene autenticador biométrico.

## Deploy en Netlify

### 1. Conectar repositorio

1. Push el código a GitHub/GitLab
2. En Netlify: **Add new site** → **Import an existing project**
3. Seleccioná el repositorio

### 2. Variables de entorno en Netlify

En **Site settings → Environment variables** agregar:

| Variable | Valor |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | URL del Apps Script |
| `NEXTAUTH_SECRET` | String secreto (mínimo 32 chars) |
| `NEXTAUTH_URL` | URL de tu sitio en Netlify (ej: https://tu-app.netlify.app) |

### 3. Build settings

El `netlify.toml` ya está configurado:
- Build command: `npm run build`
- Publish directory: `.next`
- Plugin: `@netlify/plugin-nextjs`

### 4. Deploy

Click en **Deploy site**. El primer deploy tarda ~2-3 minutos.

## Estructura del proyecto

```
app/
  (auth)/login/        → Pantalla de login
  (empleado)/          → Vistas del empleado
    empleado/          → Dashboard hoy
    empleado/nueva-carga/
    empleado/medicion/
  (admin)/             → Panel de administración
    admin/             → Dashboard principal
    admin/proveedores/
    admin/usuarios/
    admin/registros/
    admin/exportar/
  api/auth/[...nextauth]/

lib/
  api.ts       → Cliente API central (apiCall)
  auth.ts      → Configuración next-auth
  offline.ts   → IndexedDB para modo offline
  webauthn.ts  → Autenticación biométrica
  utils.ts     → Utilidades y formateadores

components/   → Componentes reutilizables
```

## Modo offline

La app funciona sin conexión a internet:

1. Las cargas y mediciones se guardan localmente en IndexedDB
2. Aparece un banner rojo "Sin conexión — X registros pendientes"
3. Al recuperar la conexión, se sincronizan automáticamente en orden cronológico
4. Toast de confirmación con cantidad de registros sincronizados

## Arquitectura API

Todos los llamados al backend usan la función central `apiCall()`:

```ts
apiCall('acción', { ...datos }, token)
```

Nunca se llama al Apps Script directamente desde los componentes — todo pasa por `lib/api.ts`.

## Seguridad

Para detalles completos ver [SECURITY.md](./SECURITY.md).

### Cómo funciona la autenticación

1. Usuario envía username/password al login.
2. `next-auth` (CredentialsProvider) llama a Apps Script `handleLogin`.
3. Apps Script compara la contraseña hasheada (SHA-256 + salt) y devuelve un
   token de sesión con TTL 8h.
4. `next-auth` guarda el token dentro de un JWT firmado con `NEXTAUTH_SECRET`,
   en una cookie `httpOnly` `sameSite=lax`.
5. Cada request al backend va por `/api/proxy` (server-side), que reenvía a
   Apps Script. El backend valida el token + expiración en cada llamada.

### Si se sospecha que un token fue comprometido

Abrir el Sheet `Usuarios` y borrar las celdas `ApiToken` (col 7) y
`Token_Expira` (col 11) de la fila correspondiente. La sesión queda invalidada
inmediatamente.

### Si NEXTAUTH_SECRET pudo haberse leakeado

1. Generar nuevo: `openssl rand -base64 32`.
2. Actualizar en Netlify → Environment variables.
3. Trigger redeploy. Esto invalida todas las sesiones activas (todos deben
   loguearse de nuevo).

### Regenerar acceso del portal de proveedores

Como admin, en la sección de proveedores → portal → click en "Generar acceso".
Reescribe `Codigo_Acceso` y `Link_Token` y bloquea el código anterior.

### Variables de entorno requeridas

Ver `.env.example`. Crítica: **`NEXTAUTH_SECRET`** debe estar presente — el
build falla si falta. Las credenciales de Apps Script se configuran en
**Project Settings → Script Properties** (`SPREADSHEET_ID`, `PASSWORD_SALT`).
