# Control LSA

App web para llevar el control diario de leche de Agrícola San Antonio.

Sirve para registrar cargas, mediciones, envíos, gastos, remanentes, proveedores,
compradores, planillas de pago y el portal de proveedores.

## Cómo está hecho

- **App web:** Next.js en Netlify.
- **Base de datos:** Google Sheets.
- **Backend:** Google Apps Script, carpeta oficial `apps-script/`.
- **Login:** usuario y contraseña.
- **Offline:** guarda registros pendientes y los sincroniza cuando vuelve internet.

La carpeta `legacy/scripts/` queda solo como respaldo viejo. No usarla para deploy.

## Primer uso local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abrir `http://localhost:3000`.

Variables necesarias en `.env.local`:

```env
NEXT_PUBLIC_API_URL=https://script.google.com/macros/s/TU_SCRIPT_ID/exec
NEXTAUTH_SECRET=genera-con-openssl-rand-base64-32
NEXTAUTH_URL=http://localhost:3000
```

## Backend en Apps Script

1. Abrir Google Apps Script.
2. Copiar los archivos de `apps-script/`.
3. Configurar Script Properties:
   - `SPREADSHEET_ID`
   - `PASSWORD_SALT`
4. Ejecutar `setup()` una vez.
5. Hacer deploy como Web App.
6. Pegar la URL en `NEXT_PUBLIC_API_URL`.

## Usuarios

El acceso es solo con usuario y contraseña. No hay huella ni Face ID.

Después del primer setup, cambiar las contraseñas iniciales desde **Usuarios**.

## Deploy en Netlify

Configurar estas variables:

| Variable | Uso |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL del Apps Script |
| `NEXTAUTH_SECRET` | Secreto para sesiones |
| `NEXTAUTH_URL` | URL pública del sitio |

Build:

```bash
npm run build
```

## Pruebas

```bash
npm run test
npm run typecheck
npm run lint
npm run build
```

## Seguridad básica

- El token real de Apps Script queda en la sesión segura del servidor.
- El navegador llama a `/api/proxy`.
- Apps Script valida token y expiración en cada acción privada.
- El login tiene límite de intentos en backend.
- Si se sospecha un token comprometido, borrar `ApiToken` y `Token_Expira` en la hoja `Usuarios`.

## Portal de proveedores

Cada proveedor entra con link + código. El portal muestra:

- entregas de hoy,
- período actual,
- período anterior,
- últimos pagos.
