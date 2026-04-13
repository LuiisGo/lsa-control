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
generarPlanilla, generarTodasLasPlanillas
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
