# ReportRx Codebase Audit Report

**Date:** 2026-04-10
**Auditor:** Claude Code (automated)
**Codebase:** Next.js 15.5.14 / Supabase / Tailwind / shadcn/ui

---

## Summary

| Area | Rating | Notes |
|------|--------|-------|
| 1. Build Health | **PASS** | Clean build, zero warnings |
| 2. TypeScript Strictness | **PASS** | `strict: true`, zero type errors |
| 3. Dependency Audit | **PASS** | 0 vulnerabilities, some outdated packages |
| 4. Dead Code | **WARN** | 9 unused files, ~15 unused exports |
| 5. Environment Variables | **WARN** | `SUPABASE_SERVICE_ROLE_KEY` missing from `.env.example` |
| 6. Supabase Query Patterns | **WARN** | 1 confirmed N+1 pattern; many queries rely solely on RLS |
| 7. RLS Safety | **WARN** | Multiple tables queried without explicit org filtering |
| 8. API Route Security | **PASS** | All routes validate sessions; service role usage is gated |
| 9. Bundle Size | **PASS** | Clean imports, no server code in client components |
| 10. Test Coverage | **FAIL** | 18 smoke tests only; zero unit/component tests; no authenticated flows tested |
| 11. Accessibility | **WARN** | ~8 form inputs missing label associations |
| 12. Console Statements | **PASS** | Zero `console.log` calls in `src/` |

---

## 1. Build Health — PASS

```
next build completed in 2.5s
16 routes (10 static pages, 6 dynamic)
Zero errors, zero warnings
```

| Route | Size | First Load JS |
|-------|------|---------------|
| `/` | 655 B | 222 kB |
| `/reporting` | 10.3 kB | 229 kB |
| `/admin` | 18.7 kB | 127 kB |
| `/activity` | 6.95 kB | 122 kB |
| `/settings` | 6.42 kB | 115 kB |
| `/clinicians` | 1.95 kB | 117 kB |
| `/login` | 1.54 kB | 166 kB |
| Shared JS | 102 kB | — |

---

## 2. TypeScript Strictness — PASS

- `tsconfig.json` has `"strict": true`
- `npx tsc --noEmit` — **zero errors**
- Target: ES2017, module resolution: bundler

---

## 3. Dependency Audit — PASS

**Vulnerabilities:** 0 (critical/high/moderate/low)

**Outdated packages (11):**

| Package | Current | Latest | Severity |
|---------|---------|--------|----------|
| `next` | 15.5.14 | 16.2.3 | Major available, patch 15.5.15 wanted |
| `react` / `react-dom` | 19.2.4 | 19.2.5 | Patch |
| `tailwindcss` | 3.4.19 | 4.2.2 | Major |
| `typescript` | 5.9.3 | 6.0.2 | Major |
| `eslint` | 9.39.4 | 10.2.0 | Major |
| `lucide-react` | 0.487.0 | 1.8.0 | Major |
| `@types/node` | 22.19.17 | 25.6.0 | Major |
| `postcss` | 8.5.8 | 8.5.9 | Patch |
| `tailwind-merge` | 2.6.1 | 3.5.0 | Major |

No packages with known security issues.

---

## 4. Dead Code — WARN

### Unused files (never imported)

| File | What it exports |
|------|-----------------|
| `src/app/(app)/reporting/reporting-loader.tsx` | `ReportingLoader` — superseded by `ReportingDashboardClient` |
| `src/app/(app)/reporting/reporting-client.tsx` | `ReportingClient` — only imported by dead `reporting-loader.tsx` |
| `src/components/settings/settings-client.tsx` | `SettingsClient` — superseded by `SettingsPageClient` |
| `src/components/settings/pcns-settings-section.tsx` | `PcnsSettingsSection` |
| `src/components/ui/separator.tsx` | `Separator` (shadcn) |
| `src/components/ui/avatar.tsx` | `Avatar`, `AvatarImage`, `AvatarFallback` (shadcn) |
| `src/lib/supabase/activity-flags.ts` | `createFlag`, `resolveFlag`, `listFlags` |
| `src/lib/supabase/anon-server.ts` | `createAnonAuthClient` |
| `src/lib/supabase/clinician-types.ts` | `listClinicianTypes` |

### Unused exports in otherwise-used files

| File | Unused export(s) |
|------|-------------------|
| `src/lib/supabase/reporting.ts` | `getDailyTrend`, `getRecentLogs`, `getDataCompleteness` |
| `src/lib/supabase/activity.ts` | `getReportingChartsData`, `getReportingTable`, `listRecentLogs`, `DashboardRecentEntry` |
| `src/lib/supabase/permissions.ts` | `getUserPermissions`, `userIsAdmin`, `getUserRoles` |
| `src/lib/supabase/auth.ts` | `signOut` (superseded by `signOutAction`) |
| `src/lib/supabase/data.ts` | `getClinicians`, `listPracticesWithPcn` |

---

## 5. Environment Variables — WARN

**Vars used in code (4):**

| Variable | In `.env.example`? |
|----------|---------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes |
| `NEXT_PUBLIC_SITE_URL` | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | **No — MISSING** |

`SUPABASE_SERVICE_ROLE_KEY` is used in `src/app/api/invite/route.ts` and `src/lib/supabase/admin.ts`. Without it, the invite flow will fail. It should be documented in `.env.example` (as a placeholder, not a real value).

---

## 6. Supabase Query Patterns — WARN

### Raw SQL / RPC calls
None found. All queries use the PostgREST query builder.

### N+1 Patterns

**Confirmed:** `src/app/actions/activity.ts` lines 417–457 — `bulkSaveActivityLogs`

```typescript
for (const clinician_id of input.clinician_ids) {
    await supabase.from('activity_logs').upsert(...)       // 1 query
    await supabase.from('activity_log_entries').delete(...) // 1 query
    await supabase.from('activity_log_entries').insert(...) // 1 query
}
// = 3N sequential round-trips for N clinicians
```

### Queries without org scoping (relying on RLS alone)

Many queries omit explicit `.eq('organisation_id', ...)` — see Section 7 for the full list.

---

## 7. RLS Safety — WARN

### Tables queried WITHOUT explicit org filtering

These queries rely entirely on Supabase Row Level Security for tenant isolation:

| Table | File | Notes |
|-------|------|-------|
| `practices` | `activity.ts:148` | `listPractices()` — **no filter at all** |
| `practices` | `data.ts:115,289,306,326,342,361,439` | Multiple CRUD operations with no org filter |
| `practices` | `practice-scope.ts:48,69,79` | Superadmin path and PCN lookup |
| `clinicians` | `data.ts:424,566,635,727` | All CRUD — no org filter on any operation |
| `clinician_practices` | `data.ts:98,438,654,665,710` | Junction table — no org filter |
| `clinician_pcns` | `data.ts:440,678,689,719` | Junction table — no org filter |
| `pcns` | `data.ts:239,257,275,280,300,310,441` | Reads and mutations — no org filter |
| `activity_report` | `reporting.ts:351,410,694` | When `practiceScope` is null |
| `activity_report` | `activity.ts:230,438,576,625,671` | Scoped by practice IDs only |
| `activity_logs` | `data.ts:144`, `activity.ts:256` | Filtered by clinician/practice ID only |
| `activity_log_entries` | Multiple files | Always by `log_id` only |
| `clinician_types` | `clinician-types.ts:6` | No filter at all (shared reference data?) |
| `user_roles` | `permissions.ts:26` | By `profile_id` only |
| `profiles` | Multiple files | Always by `user.id` (own row) |
| `organisation_invites` | `invite/route.ts:163,166` | Service-role client — **RLS bypassed** |

**Highest risk:** `listPractices()` in `activity.ts:148`, and the `clinicians`/`clinician_practices`/`clinician_pcns`/`pcns` CRUD in `data.ts` — these have zero application-level org scoping.

---

## 8. API Route Security — PASS

| Route | Auth Check | Service Role | Permission Gating | Status |
|-------|-----------|-------------|-------------------|--------|
| `GET /api/export` | `getUser()` + org lookup → 401/403 | No | N/A | **Secure** |
| `GET /api/report` | `getUser()` + `getProfile()` | No | N/A | **Secure** (relies on RLS for data scoping) |
| `POST /api/invite` | `getUser()` + role check (admin/superadmin) | Yes (`createAdminClient`) | Yes — full role + org check before service role use | **Secure** |

**Minor notes:**
- `/api/report` uses `redirect('/login')` inside the API handler (via `getProfile()`), which is atypical for API routes — non-browser callers would receive a redirect instead of a 401 JSON response.
- `/api/invite` returns a `500` with a message revealing the missing env var configuration, though this is low severity.

---

## 9. Bundle Size — PASS

- **No `import *` issues** — all `import *` patterns are standard Radix UI primitives (individually scoped packages).
- **No heavy library imports** — no lodash, moment, or similar. Dependencies are lean.
- **No server code in client components** — all cross-boundary imports use `import type` (erased at compile time).
- **Shared JS bundle:** 102 kB (reasonable).
- **Largest page:** `/reporting` at 229 kB first load (includes chart library).

---

## 10. Test Coverage — FAIL

### Existing tests

**1 Playwright spec file:** `tests/e2e/reportrx.spec.ts` — 18 tests, Chromium only.

| Suite | Tests | What it covers |
|-------|-------|----------------|
| Auth flow | 3 | Redirect to login, callback without code |
| Page navigation (unauth) | 8 | Routes return < 500, redirect to login |
| Login page content | 3 | Branding, email input, submit button |
| Mobile responsiveness | 2 | No horizontal scroll at 375px |
| API routes (unauth) | 2 | Export/report return 401, not 500 |

### Unit/component tests
**Zero.** No `.test.ts`, `.test.tsx`, or `.spec.ts` files in `src/`.

### Untested pages/features

- Dashboard (authenticated)
- Activity log form (create, edit, bulk save)
- Activity day view
- Reporting / chart generation / export
- Report preview / print
- Clinician management (add, edit, delete, practice assignments)
- Settings (profile, org, categories, PCN/practice management)
- Admin (invite, role management, org creation)
- Onboarding flow
- Toast notifications
- Error/not-found boundaries

---

## 11. Accessibility — WARN

### Images without alt — PASS
No `<img>` tags without `alt` found.

### Icon-only buttons without aria-label — PASS (minor)
All icon-only buttons have `aria-label`. One marginal case: `UserNav.tsx:43` — the avatar toggle button has no explicit `aria-label`; on mobile the text name is hidden.

### Form inputs without labels — WARN

| File | Line | Element | Issue |
|------|------|---------|-------|
| `admin-invite-form.tsx` | 79 | Email input + role select | No `<label>`, no `aria-label` |
| `admin/page.tsx` | 109 | "New organisation name" input | Placeholder only |
| `admin/page.tsx` | 151 | "New PCN name" input | Placeholder only |
| `admin/page.tsx` | 194 | "New practice name" input | Placeholder only |
| `onboarding/page.tsx` | 134 | "Your full name" input | Label exists but no `htmlFor`/`id` pairing |
| `ActivityLogForm.tsx` | 449 | "Add new category" input | Placeholder only |
| `reporting-dashboard-client.tsx` | 207, 216 | Start/End date inputs | Labels exist but no `htmlFor`/`id` pairing |

### onClick on non-interactive elements — PASS
No `<div onClick>` or `<span onClick>` patterns found.

---

## 12. Console Statements — PASS

Zero `console.log` calls found in `src/`. Clean.

(`console.error` and `console.warn` are present where appropriate and were not flagged.)

---

## Recommendations (Priority Order)

1. **Test coverage** — Add authenticated E2E tests for core workflows (activity logging, reporting, admin invite). Add component tests for form validation logic.
2. **Explicit org scoping** — Add `.eq('organisation_id', ...)` to queries on `practices`, `clinicians`, `clinician_practices`, `clinician_pcns`, and `pcns` in `data.ts` as belt-and-suspenders alongside RLS.
3. **N+1 fix** — Refactor `bulkSaveActivityLogs` to batch operations instead of looping with sequential queries.
4. **Dead code cleanup** — Remove the 9 orphaned files and ~15 unused exports identified in Section 4.
5. **Accessibility** — Add `htmlFor`/`id` pairings or `aria-label` to the 8 form inputs identified in Section 11.
6. **Env example** — Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.example` with a placeholder value.
