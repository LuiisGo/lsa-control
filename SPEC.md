# Control LSA — Phase 2 Specification

## Overview

Extension of the existing "Control Entradas y Salidas LSA" system (Phase 1) with a complete financial layer: buyer management, milk dispatch tracking, payroll generation for suppliers, expense tracking, provider portal, and automated alerts.

**Stack:** Next.js 14 App Router · Google Apps Script Web App · Google Sheets as DB · Netlify · chart.js

---

## Architecture Decisions (Confirmed)

| Decision | Choice |
|----------|--------|
| Auth scheme | Username (unchanged from Phase 1) |
| Apps Script folder | `/apps-script/` — full combined Phase 1+2 codebase |
| Quincena dates | A = 1–15, B = 16–last day of month |
| Portal auth | Middleware exclusion only (`/portal/*`) |
| Sheet names | Keep existing: Cargas, Mediciones, Proveedores, Usuarios |
| Finance data | Starting from zero (no migration needed) |
| Offline sync | Auto-sync like Phase 1 |
| Receipt name | "Agrícola San Antonio" |
| Nav structure | Flat sidebar with section headers |
| Build order | Frontend + Backend in parallel |

---

## Google Sheets — Existing (Phase 1)

| Sheet | Status |
|-------|--------|
| Cargas | Exists — cols: ID, Fecha, Hora, Proveedor, Litros_T1, Litros_T2, Total, Foto_URL |
| Mediciones | Exists — cols: ID, Fecha, Litros_Real_T1, Litros_Real_T2, Total_Real, Dif_Litros, Dif_Pct, Foto_URL |
| Proveedores | Exists — cols: ID, Nombre, Activo |
| Usuarios | Exists — cols: ID, Nombre, Username, PasswordHash, Role, Activo, ApiToken |

---

## Google Sheets — New (Phase 2)

| Sheet | Headers |
|-------|---------|
| COMPRADORES | ID, Nombre, NIT, Activo |
| ENVIOS | ID, Fecha, Comprador_ID, Comprador_Nombre, Litros_Enviados, Monto_Total, Notas, Usuario_ID, Usuario_Nombre, Timestamp |
| PRECIOS_COMPRADOR | ID, Comprador_ID, Fecha, Precio_Litro |
| REMANENTES | ID, Fecha_Origen, Litros_T1, Litros_T2, Total, Usado_Como_Inicial, Fecha_Uso |
| TARIFAS_PROVEEDORES | ID, Proveedor_ID, Proveedor_Nombre, Precio_Litro, Vigente_Desde, Activo |
| PLANILLAS | ID, Quincena_Inicio, Quincena_Fin, Proveedor_ID, Proveedor_Nombre, Total_Litros, Precio_Litro, Subtotal, IVA, Total_Con_IVA, Estado, Fecha_Generada |
| GASTOS | ID, Fecha, Categoria_ID, Categoria_Nombre, Descripcion, Monto, IVA_Incluido, Usuario_ID, Usuario_Nombre, Comprobante_URL |
| CATEGORIAS_GASTOS | ID, Nombre, Activo |
| ALERTAS_CONFIG | ID, Tipo, Descripcion, Umbral, Emails, Activo |
| ACCESOS_PROVEEDORES | ID, Proveedor_ID, Proveedor_Nombre, Codigo_Acceso, Link_Token, Activo |

---

## Apps Script Files (`/apps-script/`)

### Code.gs
- SPREADSHEET_ID constant
- HOJAS object with all sheet name constants (both Phase 1 and Phase 2)
- `doGet()` → status JSON
- `doPost()` → parse body, verify token (except login/webauthn/portalLogin/portalData), switch/case dispatch for ALL actions
- `respond(data)` helper
- `generarId()` UUID
- `getFechaHoy()` America/Guatemala timezone
- `getHoraActual()`
- `rowToObj(headers, row)`
- `registrarLog(session, accion, hoja, id, anterior, nuevo)` → LOG_CAMBIOS sheet
- `setup()` → calls `initSheets()`, shows alert with initial credentials
- `onOpen()` → adds "Control LSA" menu

**Phase 2 actions in switch:**
```
getCompradores, saveComprador, toggleComprador, deleteComprador
getPrecioComprador, savePrecioComprador, getPreciosHistorial
saveEnvio, getEnviosPorFecha, getEnviosPorRango, editarEnvio
saveRemanente, getRemanentePendiente, usarRemanente, ignorarRemanente
getResumenFinancieroDia, getDashboardFinanciero
getTarifaProveedor, getAllTarifas, saveTarifa
generarPlanilla, generarTodasLasPlanillas, marcarPlanillaPagada
getPlanillasQuincena, getPlanillasPorProveedor
getComparativaProveedores
getCategorias, saveCategoria, toggleCategoria
saveGasto, getGastosPorFecha, getGastosPorRango, editarGasto, deleteGasto
getAlertasConfig, saveAlertaConfig, toggleAlerta
getAccesosProveedores, generarAccesoProveedor
portalLogin, portalData
```

### Auth.gs (username-based, unchanged from Phase 1)
- `hashPassword(password)` → SHA-256 hex
- `doLogin(data)` → search by username + hash, generate token, save with 8h expiry
- `verificarToken(token)` → validate + return session object
- `doLogout(token)`
- `getChallenge(data)`, `verifyWebAuthn(data)`, `saveWebAuthnCredential(data)`

### Sheets.gs (Phase 1 + initSheets extended)
- `initSheets()` — creates ALL Phase 2 sheets if not present, initial admin+proveedores
- All existing Phase 1 functions unchanged

### Finanzas.gs
- `getCompradores`, `saveComprador`, `toggleComprador`
- `getPrecioComprador(data)` — most recent price ≤ date
- `savePrecioComprador(data)`, `getPreciosHistorial(data)`
- `saveEnvio(data, session)` — validates litros>0 && monto>0, calls `verificarAlertasTanque`
- `getEnviosPorFecha(data)`, `getEnviosPorRango(data)`, `editarEnvio(data, session)`
- `saveRemanente(data, session)`
- `getRemanentePendiente()` — finds yesterday's remanente with Usado_Como_Inicial=FALSE
- `usarRemanente(data, session)` — marks used + creates Cargas entry with proveedor="Remanente día anterior"
- `ignorarRemanente(data, session)` — marks used with date IGNORADO
- `getResumenFinancieroDia(data, session)`
- `getDashboardFinanciero()` — current quincena: ingresos, costo_proveedores, gastos, margen, precio_promedio_compra/venta, by_comprador, by_proveedor
- Helpers: `getResumenPorComprador(envios)`, `getResumenPorProveedor(fechaInicio, fechaFin)`

### Pagos.gs
- `getTarifaProveedor(data)` — Activo=TRUE for proveedor
- `getAllTarifas()`, `saveTarifa(data, session)` — deactivates previous before creating
- `generarPlanilla(data, session)` — sum litros from Cargas by proveedor+range, calc subtotal+IVA 12%+total, save with estado=GENERADA
- `generarTodasLasPlanillas(data, session)` — iterate active proveedores
- `getPlanillasQuincena(data)`, `getPlanillasPorProveedor(data)`
- `getComparativaProveedores(data, session)` — group Cargas by proveedor, calc totals

### Gastos.gs
- `getCategorias()`, `saveCategoria(data, session)`, `toggleCategoria(data, session)`
- `saveGasto(data, session)` — validates monto>0
- `getGastosPorFecha(data)`, `getGastosPorRango(data)` — includes total + breakdown by category
- `editarGasto(data, session)` — admin only
- `deleteGasto(data, session)` — admin only + registrarLog

### Alertas.gs
- `getAlertasConfig()`, `saveAlertaConfig(data, session)`, `toggleAlerta(data, session)`
- `verificarAlertasTanque()` — TANQUE_MINIMO alerts, MailApp, wrapped in try/catch
- `verificarAlertaDiferencia(totalCarga, totalReal)` — DIFERENCIA_ALTA alerts, try/catch

### Quincena.gs (extended, same A=1-15 B=16-last logic)
- `calcularQuincena(fecha)` → {tipo, inicio, fin}
- `calcularQuincenaAnterior(fecha)`
- `getDatasForRange(fechaInicio, fechaFin)`
- `getQuincenaData()`, `getQuincenaAnteriorData()`, `getComparativa()`

### Portal.gs
- `getAccesosProveedores(session)`
- `generarAccesoProveedor(data, session)` — 6-char alphanumeric uppercase code (no ambiguous chars), regen if exists
- `loginPortalProveedor(data)` — verify token+code
- `getPortalProveedor(data)` — last 7 days cargas, current quincena summary+planilla, previous quincena, last 12 planillas history

### Utils.gs
- `getFechaAyer()` — yesterday yyyy-MM-dd Guatemala
- `formatFecha(date)` — Date → yyyy-MM-dd Guatemala

### Drive.gs (unchanged from Phase 1)
- `subirFoto(data, session)` — base64 → Drive folder → shared URL

---

## Next.js — New Routes

### Empleado (`/empleado/*`)

**`/empleado/envio`**
- Load: `getRemanentePendiente` → show `AlertaRemanente` if pending
- Form: Select comprador, litros enviados (number), monto total Q (number), notas (textarea)
- Submit: `saveEnvio`

**`/empleado/remanente`**
- Form: litros T1 (number), litros T2 (number), live total preview
- Submit: `saveRemanente`

**`/empleado/gasto`**
- Form: Select categoría, descripción (text), monto Q (number), IVA checkbox, comprobante (file optional)
- Submit: `saveGasto` (with optional photo upload via `subirFoto`)

### Admin (`/admin/*`)

**`/admin/finanzas`**
- `getDashboardFinanciero` → 4 big metric cards (ingresos, costo, gastos, margen)
- 3 secondary cards (litros, precio_compra, precio_venta)
- Bar chart: ingresos vs costo_proveedores vs gastos por día
- Table: por comprador
- Table: por proveedor
- Export button

**`/admin/compradores`**
- List with toggle, add button (nombre + NIT)
- Per comprador: price history table + "Agregar precio" modal

**`/admin/envios`**
- Date picker → `getEnviosPorFecha`
- Table with edit modal (`editarEnvio`)

**`/admin/planillas`**
- Quincena selector (last 6) → `getPlanillasQuincena`
- "Generar todas" button → `generarTodasLasPlanillas`
- Per-planilla: "Ver recibo" → `ReciboPlanilla` modal with print

**`/admin/tarifas`**
- Per active proveedor: current tariff + history + update modal

**`/admin/gastos`**
- Date range picker → `getGastosPorRango`
- Total card + donut chart by category + table
- Category management accordion

**`/admin/comparativa-proveedores`**
- Date range or preset quincena → `getComparativaProveedores`
- Comparison table with inline % bars
- Horizontal bar chart (litros by proveedor)

**`/admin/alertas`**
- `getAlertasConfig` → 2 configurable alerts (TANQUE_MINIMO, DIFERENCIA_ALTA)
- Each: description, threshold field, emails field, toggle

**`/admin/portal-proveedores`**
- Per active proveedor: access status, censored code, generate/regen button
- On generate: `ModalAccesoProveedor` with code + link + copy buttons

### Public Portal (`/portal/[token]`)
- No next-auth — excluded from middleware
- Screen 1: Logo + code input (auto-uppercase) → `portalLogin`
- Screen 2: `portalData` → last 7 days table, current quincena, prev quincena, last 12 history
- Logout: clear local state, back to Screen 1

---

## Updates to Existing Files

**`lib/api.ts`** — no changes needed (generic apiCall already works)

**`lib/offline.ts`** — add stores: `envios_pending`, `gastos_pending`, `remanentes_pending` with auto-sync

**`middleware.ts`** — add `/portal` to public paths bypass

**`app/(admin)/layout.tsx`** — sidebar section headers: "Operaciones" (Phase 1) + "Finanzas" + "Configuración"

**`app/(empleado)/empleado/page.tsx`** — add envíos hoy card + remanente card + updated bottom nav (5 buttons)

**`app/(admin)/admin/page.tsx`** — add mini financial day card below HOY section

---

## New Components

| Component | Purpose |
|-----------|---------|
| `TarjetaFinanciera.tsx` | Monto card with label, color, optional % change |
| `ReciboPlanilla.tsx` | Printable planilla receipt with @media print CSS |
| `TablaComparativa.tsx` | Table with inline percentage bars |
| `ModalAccesoProveedor.tsx` | Access code + link + copy buttons modal |
| `AlertaRemanente.tsx` | Yellow banner with usar/ignorar actions |
| `GraficaBarrasHorizontal.tsx` | Horizontal bar chart wrapper (Chart.js) |

---

## Business Rules

- IVA always 12%
- Prices always in Quetzales, 2 decimal places (Q 1,234.56)
- Quincena A: days 1–15; Quincena B: days 16–last day of month
- planilla estado: GENERADA only (no PAGADA flow in Phase 2)
- Remanente: one per day, consumed by next day's first batch
- Portal code: 6 chars, A-Z0-9 excluding I, O, 0, 1 (ambiguous)
- Print receipt: hides nav via @media print, shows only ReciboPlanilla
- Offline: envios/gastos/remanentes stored in IndexedDB, auto-sync on reconnect

---

## Deploy Checklist

1. Copy `/apps-script/` files to Apps Script IDE (or `clasp push`)
2. Run `setup()` once in Apps Script editor
3. Deploy as Web App (new version)
4. Update `NEXT_PUBLIC_API_URL` in Netlify env vars
5. Push Next.js code → Netlify auto-deploys

---

# Phase 2 Patch — 7 Cambios

## Interview Decisions (2026-04-17)

Key decisions made during requirements interview — these override or refine the original change descriptions.

| # | Topic | Decision |
|---|-------|----------|
| 1 | IVA storage | Per-proveedor default (`Aplica_IVA` in PROVEEDORES) AND overridable per individual planilla |
| 1 | IVA new proveedor | Required field — admin must explicitly choose; no default |
| 1 | Generar todas | Use stored default per proveedor; no pre-confirmation dialog |
| 2 | Tarifas date | Remove `vigenteDesde` date picker from form — backend auto-sets to today |
| 3 | Corte semanal | Cut day = **first** day of weekly period (Monday → Mon–Sun) |
| 3 | Planilla semanal | Free date-range selector for weekly providers |
| 3 | Generar todas | Only generates quincenales; semanales are done individually |
| 4 | Permisos default | Empty column = ALL permissions (backwards-compat) |
| 4 | Permisos session | Included in NextAuth session at login time (no extra request) |
| 4 | UX sin permiso | Hide buttons completely (not disabled) |
| 5 | Total cargas | Sum ALL providers + remanente entries for the day |
| 5 | Offline resto | Show card with "Sin conexión — resto no disponible" |
| 5 | Dashboard HOY | Add to existing `getResumenFinancieroDia` endpoint |
| 5 | Home empleado | Recepcionado/Enviado/Resto card always visible on home |
| 6 | Fotos | Remove `capture="environment"` only — no dual buttons |
| 7 | Portal bug | Client-side exception on load (full reconstruction needed) |
| 7 | Portal session | `sessionStorage` (expires on tab close) |
| 7 | Portal nav | Accordion sections (not tabs) |
| 7 | Portal chart | Chart.js only if ≥ 5 days **with at least 1 carga entry** in the period; otherwise table only |
| 7 | Portal weekly label | "Semana del 15/04 al 21/04" (explicit date range) |
| 7 | Portal medición | Omit — medición is tank-wide, not per-provider |
| — | Estado PAGADA | Add "Marcar como pagada" button in /admin/planillas |
| — | Migración | `migrateSheets()` separate function (not in initSheets) |
| — | Planillas duplicadas | Keep current behavior (allow duplicates) |

---

## Schema Changes (Patch)

### PROVEEDORES — 3 new columns

| Column | Type | Notes |
|--------|------|-------|
| `Aplica_IVA` | TRUE/FALSE | Required — admin sets on create/edit; no default |
| `Frecuencia_Pago` | string | `'quincenal'` (default) or `'semanal'` |
| `Dia_Corte_Semanal` | number | 1=Mon … 7=Sun; only relevant when Frecuencia_Pago='semanal' |

### USUARIOS — 1 new column

| Column | Type | Notes |
|--------|------|-------|
| `Permisos` | string (JSON) | Array of allowed actions. Empty/null → ALL permissions. Example: `'["cargas","medicion","envios","gastos","remanentes"]'` |

### PLANILLAS — 1 new column

| Column | Type | Notes |
|--------|------|-------|
| `IVA_Aplicado` | TRUE/FALSE | Stored at generation time; drives portal and receipt display |

PLANILLAS `Estado` values: `GENERADA` | `PAGADA` (new)

---

## Apps Script Changes

### Sheets.gs

**`migrateSheets()`** — new top-level function, callable once from the Apps Script editor:

```
migrateSheets():
  addColIfMissing('Proveedores', 'Aplica_IVA')
  addColIfMissing('Proveedores', 'Frecuencia_Pago')
  addColIfMissing('Proveedores', 'Dia_Corte_Semanal')
  addColIfMissing('Usuarios',    'Permisos')
  addColIfMissing('PLANILLAS',   'IVA_Aplicado')

addColIfMissing(sheetName, colName):
  Read row 1 (headers)
  If colName not in headers → append colName as new header in next empty column
  Log result
```

**`getProveedores()`** — extend returned object to include `aplicaIVA`, `frecuenciaPago`, `diaCorte`.

**`saveProveedor()` / edit** — accept and persist `aplicaIVA` (required, boolean), `frecuenciaPago`, `diaCorte`.

### Auth.gs

**Column positions after migration:**
- USUARIOS after migration: ID(0), Nombre(1), Username(2), Password(3), Role(4), Activo(5), ApiToken(6), credentialId(7), publicKey(8), **Permisos(9)**
- Read as `row[9]`. If cell is empty string, `null`, or the column is absent in old rows: default to full access.

**`handleLogin()`** — read `Permisos` column (`row[9]`) from matched row. Parse JSON; if empty/null/`""` return full list `["cargas","medicion","envios","gastos","remanentes"]`. Include in returned data object:

```js
return {
  success: true,
  data: {
    token, userId, nombre, email, role,
    permisos: [...],  // new
  }
}
```

**`validateToken()`** — same: read `Permisos` column, return in session object:

```js
return { id, nombre, username, role, permisos: [...] }
```

**`tienePermiso(session, permiso)`** — new helper:

```js
function tienePermiso(session, permiso) {
  if (session.role === 'admin') return true;
  return (session.permisos || []).indexOf(permiso) !== -1;
}
```

### Pagos.gs

**`generarPlanilla(body, user)`** — changes:
- Accept `aplicarIVA` boolean in body (optional; if missing, read from PROVEEDORES `Aplica_IVA` column)
- If `aplicarIVA = true`: IVA = subtotal × 0.12, totalConIVA = subtotal + IVA
- If `aplicarIVA = false`: IVA = 0, totalConIVA = subtotal
- Append `IVA_Aplicado` value (TRUE/FALSE) to PLANILLAS row (col 12)
- Estado supports new value `PAGADA`; add action **`marcarPlanillaPagada(body, user)`** — admin only, finds planilla by ID, updates Estado column to `PAGADA`

**`generarTodasLasPlanillas(body, user)`** — changes:
- Only iterate proveedores where `frecuenciaPago = 'quincenal'` (or column is empty/null)
- For each proveedor, read `Aplica_IVA` from PROVEEDORES row; pass as `aplicarIVA` to `generarPlanilla`

**`_planillaObj(row)`** — add `ivaAplicado: row[12] === true || row[12] === 'true'` field.

**`saveTarifa(body, user)`** — remove `vigenteDesde` from accepted body fields; always use `getFechaHoy()` as `Vigente_Desde`. Remove the `vigenteDesde` parameter from the function entirely.

**`calcularPeriodoProveedor(proveedorId)`** — new helper:

```
Read Frecuencia_Pago and Dia_Corte_Semanal for proveedorId
If quincenal (or empty): return calcularQuincena(null)
If semanal:
  cutDow = Dia_Corte_Semanal || 1  // default Monday if not set
  hoy = getFechaHoy() as Date
  hoyDow = hoy.getDay() mapped to 1-7 (JS Sunday=0 → 7)
  daysFromCut = (hoyDow - cutDow + 7) % 7
  periodoInicio = hoy - daysFromCut days
  periodoFin   = periodoInicio + 6 days
  label = 'Semana del ' + formatDD_MM(periodoInicio) + ' al ' + formatDD_MM(periodoFin)
  return { inicio: formatDate(periodoInicio), fin: formatDate(periodoFin), tipo: label }
```

If `Dia_Corte_Semanal` is empty/null and `Frecuencia_Pago = 'semanal'`, default to 1 (Monday).

### Finanzas.gs

**`saveEnvio(body, user)`** — changes:
- Remove validation `monto_total > 0` — monto is optional; if missing, store empty string in `Monto_Total` column
- Apply permission check: `if (!tienePermiso(user, 'envios')) return error`
- After saving, calculate resto:
  - `totalCargaDia` = sum all Cargas rows where `Fecha = hoy` (all providers including remanente entries)
  - `totalEnviadoDia` = sum all ENVIOS rows where `Fecha = hoy` including this new entry
  - `resto = totalCargaDia - totalEnviadoDia`
- Return: `{ success, id, totalCargaDia, totalEnviadoDia, resto, advertencia? }`
  - `advertencia = 'Total enviado supera la recepción del día'` only if `totalEnviadoDia > totalCargaDia`
- **Keep** `verificarAlertasTanque()` call unchanged

**`saveCarga(body, user)`** — add: `if (!tienePermiso(user, 'cargas')) return error`

**`saveMedicion(body, user)`** — add: `if (!tienePermiso(user, 'medicion')) return error`

**`saveRemanente(body, user)`** — add: `if (!tienePermiso(user, 'remanentes')) return error`

**`saveGasto(body, user)`** — add: `if (!tienePermiso(user, 'gastos')) return error`

**`getResumenFinancieroDia(body, user)`** — extend returned object to include:

```js
{
  // existing fields...
  litrosRecepcionados: number,  // sum Cargas.Total for hoy
  litrosEnviados: number,       // sum ENVIOS.Litros_Enviados for hoy
  restoEstimado: number,        // litrosRecepcionados - litrosEnviados
}
```

### Portal.gs

**`getPortalProveedor(body)`** — full rewrite. Returns:

```js
{
  ok: true,
  proveedorNombre: string,
  frecuenciaPago: 'quincenal' | 'semanal',

  hoy: {
    fecha: string,                              // yyyy-MM-dd Guatemala
    cargas: [{ hora, litrosT1, litrosT2, total }],
    totalLitros: number
    // medición omitted — tank-wide, not per provider
  },

  periodoActual: {
    tipo: string,          // e.g. 'Quincena A' | 'Semana del 15/04 al 21/04'
    inicio: string,
    fin: string,
    cargas: [{ fecha, totalLitros }],           // one entry per day
    totalLitros: number,
    planilla: PlanillaResumen | null,
  },

  periodoAnterior: {
    tipo: string,
    inicio: string,
    fin: string,
    totalLitros: number,
    planilla: PlanillaResumen | null,
  },

  historial: [                                  // last 10 closed planillas
    PlanillaResumen & { inicio, fin }
  ]
}

PlanillaResumen = {
  litros, precioLitro, subtotal,
  iva, totalConIva, aplicaIva, estado
}
```

- For `periodoActual` / `periodoAnterior`: use `calcularPeriodoProveedor` based on provider's `Frecuencia_Pago` and `Dia_Corte_Semanal`
- For the weekly label: format as `"Semana del DD/MM al DD/MM"`
- `hoy` section: filter Cargas by `proveedorNombre` and today's date
- `periodoActual.cargas`: one row per day within the period range, sum litros per day
- `historial`: last 10 planillas for this provider sorted newest first
- `planilla.aplicaIva`: read from `IVA_Aplicado` column (col 12)

---

## Next.js Changes

### lib/auth.ts

In `authorize()` callback: add `permisos` to the returned API data type and pass it through:

```ts
const res = await apiCall<{
  token: string; userId: string; nombre: string;
  email: string; role: 'admin' | 'empleado';
  permisos: string[];  // new
}>('login', ...)

return {
  id: res.data.userId,
  name: res.data.nombre,
  email: res.data.email,
  role: res.data.role,
  apiToken: res.data.token,
  permisos: res.data.permisos ?? [],  // new
}
```

In `jwt` callback: `token.permisos = u.permisos`
In `session` callback: `(session.user as {...}).permisos = token.permisos`

### /admin/proveedores

- Add `Aplica_IVA` checkbox (required; label "¿Aplica IVA?") to create and edit forms
- Add `Frecuencia_Pago` select (options: Quincenal / Semanal; default Quincenal) to create and edit forms
- When Semanal selected: show `Dia_Corte_Semanal` select (Lunes → Domingo; maps to 1–7)
- In the provider list table: add badge column showing `QUINCENAL` or `SEMANAL`

### /admin/planillas

- Add `marcarPlanillaPagada` action: per-row button "Marcar pagada" visible only on GENERADA planillas
- On click: confirm dialog → `apiCall('marcarPlanillaPagada', { id: p.id }, token)` → reload
- Badge colors: GENERADA = slate, PAGADA = green
- New section "Proveedores Semanales" below the main quincena section:
  - Date-range inputs: `desde` / `hasta`
  - List shows semanales only; "Generar" button per proveedor (individual, not batch)
- "Generar todas" button unchanged: only generates quincenales with the quincena selector

### /admin/tarifas

- Remove `vigenteDesde` date input from "Nueva Tarifa" form entirely
- Form now has only: Proveedor select + Q/Litro input + Guardar button
- History table unchanged (shows `vigenteDesde` read-only)

### /admin/usuarios

- When creating/editing an `empleado`:
  - Show checkboxes section "Permisos de acceso":
    - ☐ Registrar cargas de leche (`cargas`)
    - ☐ Registrar medición con regla (`medicion`)
    - ☐ Registrar envíos (`envios`)
    - ☐ Registrar gastos operativos (`gastos`)
    - ☐ Registrar remanentes (`remanentes`)
  - Default: all checked for new empleados
- In user table: for empleados, show permission badges inline

### /admin/page.tsx (dashboard admin)

In the "HOY" section, after the existing metric cards, add a new row:

```
Litros recepcionados | Litros enviados | Resto estimado
```

Data source: existing `getResumenFinancieroDia` call — use the three new fields.
Color: Resto in green if ≥ 0, red if negative.

### /empleado/page.tsx (home empleado)

- Load `getEnviosPorFecha({ fecha: hoy })` in addition to existing `getDashboardHoy`
- Add card "Movimiento del tanque hoy" showing:
  - Recepcionado: X L
  - Enviado: X L
  - Resto: X L (green if ≥ 0, red if negative)
  - Visual progress bar: `enviado / recepcionado` width, capped at 100%
- Apply permissions: only show FAB buttons the employee has permission for
  - `cargas` → "Nueva Carga" button
  - `medicion` → "Registrar Medición" button
  - `envios` → "Registrar Envío" button
  - `remanentes` → "Remanente" button
  - `gastos` → "Registrar Gasto" button
  - Admins always see all buttons

### /empleado/envio

- Remove `monto` state, input field, and all references to `montoTotal`
- Remove the "Precio implícito" preview line
- Form now: Comprador select + Litros input + Notas textarea + Guardar
- After successful save: show `ConfirmacionEnvio` card (new inline component):
  ```
  ✓ Envío registrado: X litros a [Comprador]
  Total enviado hoy: X L
  Recepcionado hoy: X L
  Resto en tanque: X L   ← green/red
  [advertencia in yellow if total enviado > recepcionado]
  ```
- If offline (save via IndexedDB): card shows litros/comprador only; resto row replaced with "Sin conexión — resto no disponible"
- Update `savePendingEnvio()` in `lib/offline.ts`: remove `montoTotal` from the stored object type

### /empleado/nueva-carga, /empleado/medicion, /empleado/gasto

- Remove `capture="environment"` from all `<input type="file">` elements
- No other changes to these pages

### app/portal/[token]/page.tsx — full rewrite

**State machine:** `'login' | 'data'`

**Screen: login**
- Logo + "Agrícola San Antonio" + "Portal de Proveedores" subtitle
- Input: código (6 chars, auto-uppercase)
- Button: "Ingresar"
- On submit → `apiCall portalLogin { token, codigo }` (uses `/api/proxy`, no auth token)
- On success → store `{ proveedorNombre, proveedorId, token, codigo }` in `sessionStorage` → set state to `'data'`
- On error → "Código incorrecto, intentá de nuevo"

**Screen: data**
- Load `portalData` with `{ token, codigo }` from sessionStorage
- Header: Logo + nombre proveedor + "Cerrar sesión" button (clears sessionStorage → state `'login'`)

- **4 accordion sections** (default: "Hoy" open, others closed):

  **Sección 1 — Hoy**
  - Today's date
  - If cargas > 0: table with Hora | T1 | T2 | Total + bold total row
  - If cargas = 0: "Sin recepciones registradas hoy"

  **Sección 2 — Período actual**
  - Header chip with `tipo` label (e.g., "Quincena A" or "Semana del 15/04 al 21/04") + date range
  - "X litros en X días"
  - Table: Fecha | Litros | Acumulado (one row per day)
  - If ≥ 5 days of data: also show a Chart.js bar chart (litros per day)
  - Planilla block: same logic as current portal (GENERADA/PAGADA badge; show IVA only if `aplicaIva = true`)

  **Sección 3 — Período anterior**
  - Same structure as Período actual but read-only summary (no per-day table needed)
  - Planilla block if exists

  **Sección 4 — Historial**
  - Table: Período | Litros | Q/L | Total | Estado
  - Last 10 planillas, newest first

**Design:** white + green `#16a34a` + navy `#1e3a5f` | mobile-first | read-only everywhere

---

## Business Rules (Patch additions)

- **IVA change:** Base spec said "IVA always 12%". Patch overrides this: IVA is now per-proveedor, required field. Existing proveedores without `Aplica_IVA` set should be updated manually or via migration default.
- `Aplica_IVA` per proveedor is required at creation — no silent default
- `generarTodasLasPlanillas` skips providers where `Frecuencia_Pago = 'semanal'`
- `Permisos` JSON empty/null/`""` → full access (all 5 permissions implied). Applies to empty string as well as null.
- `role = 'admin'` always bypasses permission checks (frontend + backend)
- **Permisos staleness:** Permissions are stored in the NextAuth JWT at login time. If an admin revokes permissions, the change takes effect on next login. No real-time re-validation on reconnect or offline sync.
- Resto calculation includes cargas with `Proveedor = 'Remanente día anterior'`
- Negative resto: not blocked. `advertencia` flag is returned; frontend shows a yellow warning. No confirmation dialog required.
- `Estado = PAGADA` can only be set via `marcarPlanillaPagada` (admin only)
- Portal chart renders only when `periodoActual.cargas.filter(c => c.totalLitros > 0).length >= 5`
- Portal session stored in `sessionStorage` — expires when tab is closed
- Weekly provider with `Dia_Corte_Semanal` empty: default cut day = Monday (1)

---

## Migration Steps (one-time, run before first use)

1. Deploy new Apps Script code (all `.gs` files) as new Web App version
2. Run `migrateSheets()` from Apps Script editor — adds 5 new columns to existing sheets
3. Verify columns added: PROVEEDORES (cols 4–6), USUARIOS (col 9+), PLANILLAS (col 13)
4. Deploy Next.js code → Netlify auto-deploys
5. Test: create a proveedor (verify IVA required field), generate planilla with IVA off, check portal

---

## Updated Deploy Checklist

1. Copy `/apps-script/` files to Apps Script IDE (or `clasp push`)
2. Deploy as Web App — **new version** (required after any `.gs` change)
3. Run `migrateSheets()` once in Apps Script editor
4. _(Skip `setup()` — only needed for fresh installs)_
5. Update `NEXT_PUBLIC_API_URL` in Netlify env vars if URL changed
6. Push Next.js code → Netlify auto-deploys
7. Smoke-test: portal login, planilla with IVA=false, envío → verify resto card, employee home permission buttons
