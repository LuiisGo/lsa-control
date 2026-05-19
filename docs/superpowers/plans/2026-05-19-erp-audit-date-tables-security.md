# ERP Audit Date Tables Security Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add production-ready date range filtering, professional tables, core validation fixes, and security hardening to the LSA Control ERP-lite app.

**Architecture:** Keep the current Next.js + Apps Script + Google Sheets architecture. Add small reusable UI primitives for date ranges and tables, then apply them to historical admin/portal views. Backend validation remains authoritative in Apps Script.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, NextAuth, Google Apps Script, Google Sheets, Vitest.

---

### Task 1: Shared Date Range Helpers And UI

**Files:**
- Create: `lib/dateRange.ts`
- Create: `lib/dateRange.test.ts`
- Create: `components/DateRangeFilter.tsx`
- Create: `components/DataTable.tsx`
- Create: `components/EmptyState.tsx`
- Create: `components/LoadingState.tsx`

- [ ] Write tests for date range validation and active-label formatting.
- [ ] Implement the helper functions and reusable UI components.
- [ ] Run `npm run test -- lib/dateRange.test.ts`.

### Task 2: Historical Admin Views

**Files:**
- Modify: `app/(admin)/admin/envios/page.tsx`
- Modify: `app/(admin)/admin/gastos/page.tsx`
- Modify: `app/(admin)/admin/comparativa-proveedores/page.tsx`
- Modify: `app/(admin)/admin/finanzas/page.tsx`
- Modify: `app/(admin)/admin/registros/page.tsx`
- Modify: `apps-script/Sheets.gs`

- [ ] Apply DateRangeFilter with Apply/Clear behavior.
- [ ] Use the professional table component or existing `data-table` classes consistently.
- [ ] Add range endpoints for records that currently only support one day.
- [ ] Keep destructive actions behind confirmation modals.

### Task 3: Catalog And Portal Tables

**Files:**
- Modify: `app/(admin)/admin/compradores/page.tsx`
- Modify: `app/(admin)/admin/proveedores/page.tsx`
- Modify: `app/(admin)/admin/tarifas/page.tsx`
- Modify: `app/portal/[token]/PortalClient.tsx`

- [ ] Convert important historical/list data to bordered responsive tables.
- [ ] Preserve current row actions and portal access controls.
- [ ] Add empty/loading states where missing.

### Task 4: Backend Logic And Security

**Files:**
- Modify: `apps-script/Finanzas.gs`
- Modify: `apps-script/Gastos.gs`
- Modify: `apps-script/Sheets.gs`
- Modify: `apps-script/Code.gs`
- Modify: `apps-script/Utils.gs`
- Modify: `app/api/proxy/route.ts`

- [ ] Block stock-negative envío saves.
- [ ] Validate negative and incomplete quantities on remanentes and mediciones.
- [ ] Recalculate or constrain editable totals.
- [ ] Sanitize persisted text fields consistently.
- [ ] Add a proxy action allowlist.
- [ ] Reduce insecure production fallbacks for secrets/config.

### Task 5: Verification

**Files:**
- All touched files.

- [ ] Run `npm run test`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Start the dev server and smoke-test primary rendered flows if possible.
