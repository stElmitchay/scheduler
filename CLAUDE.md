# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Note:** This is Next.js 16 with React 19 — read `node_modules/next/dist/docs/` before writing any code. APIs and conventions may differ from training data.

## Commands

```bash
npm run dev        # Start dev server (Turbopack enabled)
npm run build      # Production build
npm run lint       # ESLint
node --test lib/scheduler/__tests__/calendar-utils.test.mjs  # Run tests (Node built-in runner)
```

### Utility scripts

```bash
# Generate a hashed access code to store in Supabase
ACCESS_CODE_PEPPER="..." npm run hash-code -- "MYCODE"

# Generate department INSERT SQL
npm run department-sql
```

## Environment variables

Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ACCESS_CODE_PEPPER` — pepper for SHA-256 access code hashing

Optional:
- `NEXT_PUBLIC_SITE_URL` — public base URL used to build the rota share link
  (e.g. `https://kcf-schedule.vercel.app`). Falls back to `window.location.origin`,
  which is wrong when a leader builds the rota on localhost and shares the link.

## Architecture

This is a single-route Next.js App Router app for Kharis Church (Freetown) — a space booking scheduler.

### Data flow

`app/page.tsx` (Server Component) fetches all bookings, departments, and spaces from Supabase in parallel, then passes them as props to `<BulletinApp>`. All subsequent navigation is client-side state changes — there is no routing.

Mutations go through Next.js Server Actions in `app/actions.ts`, which call functions in `lib/scheduler/data.ts` and then `revalidatePath("/")` to refresh server data.

### Screen state machine

`BulletinApp` (`components/scheduler/bulletin-app.tsx`) is a single client component managing all UI via a `screen` state variable:
- `home` — public weekly bulletin
- `menu` — navigation
- `calendar` — full month calendar with space filter chips
- `add` — booking form (create or edit, controlled by `editingId`)
- `manage` — list of editable bookings for the active access context
- `pastor` — metrics dashboard (pastor code only)

### Access control

Two access context kinds: `{ kind: "department", departmentId, departmentName }` and `{ kind: "pastor" }`.

Codes are normalized (uppercase + trim) and hashed with SHA-256 + `ACCESS_CODE_PEPPER`. Department hashes live in `departments.access_code_hash`; the pastor hash lives in `app_settings.pastor_access_code_hash`. Resolution logic is in `lib/scheduler/access.ts` and `lib/scheduler/data.ts#resolveAccessCode`.

A department access code unlocks add/manage for that department only. A pastor code unlocks all bookings and the pastor dashboard.

### Conflict logic

Two conflict tiers:
1. **Hard space conflict** — same `space_id`, overlapping time, both confirmed. Blocked by both app-level pre-check and Postgres exclusion constraint `bookings_no_confirmed_overlap` (using `btree_gist`). Returns an error.
2. **Soft department conflict** — overlapping time with a different department in any space. Booking is saved as `pending` instead of `confirmed`.

### Key modules

| Path | Purpose |
|---|---|
| `lib/scheduler/types.ts` | All shared types: `Booking`, `Department`, `Space`, `AccessContext`, `ActivityType`, etc. |
| `lib/scheduler/data.ts` | All Supabase queries and mutations |
| `lib/scheduler/access.ts` | `hashAccessCode`, `normalizeAccessCode` |
| `lib/scheduler/validation.ts` | `validateBookingInput`, `rangesOverlap` |
| `lib/scheduler/calendar-utils.mjs` | Calendar grid/week utilities — `.mjs` (native ESM) so it works in both Node test runner and browser |
| `lib/supabase/server.ts` | `createServerSupabaseClient()` factory |

### `calendar-utils.mjs`

This file is intentionally `.mjs` (not `.ts`) because it is imported by both the browser client component and the Node.js test runner. Its types are declared in `calendar-utils.d.ts`.

### Database schema

Tables: `spaces`, `departments`, `app_settings` (single-row), `bookings`. Schema and migrations are in `supabase/schema.sql` — run it against a Supabase project to set up. The schema is idempotent (`IF NOT EXISTS`, `IF NOT EXISTS` constraints, `ON CONFLICT DO NOTHING`).

`repeatWeekly: true` on a booking form creates 12 weekly occurrences in a single insert batch.

## Serving rota module

A self-contained feature beside the scheduler. It adds `rota_*` tables and new
routes, and does not migrate `bookings`, `departments`, or `app_settings`.

### Routes

| Route | Audience | Purpose |
|---|---|---|
| `/rota` | leader | Code gate, then build and manage the rota |
| `/r/[slug]` | public | Published rota, read-only, no code |

`/rota` is a client shell. `unlockRotaAction` verifies a department access code
via the existing `resolveAccessCode` and returns a payload plus an opaque
12-hour session token. Every other action takes the **token**, not the code, and
reads the department id out of it — a department id is never accepted from the
client. The token lives in `sessionStorage`; the raw access code is never
persisted anywhere.

### Serving days

Derived from `bookings` rows where `activity_type = 'Service'` and
`status = 'confirmed'`, matched against `rota_service.service_name`. Service
names are chosen from a dropdown of real `activity_name` values, never typed, so
they cannot drift. Slots are derived from (booking × role × `slot_count`) and are
not stored; only filled slots exist, in `rota_assignment`.

### Key modules

| Path | Purpose |
|---|---|
| `lib/rota/types.ts` | Shared types |
| `lib/rota/data.ts` | All Supabase queries and mutations |
| `lib/rota/session.mjs` | Session token sign/verify (HMAC + `ACCESS_CODE_PEPPER`) |
| `lib/rota/fairness.mjs` | The seven warning rules and the period summary |
| `lib/rota/auto-assign.mjs` | Deterministic greedy fill of empty slots |
| `app/rota/actions.ts` | Server actions |
| `components/rota/` | Leader screens and the public view |

`fairness.mjs` and `auto-assign.mjs` are `.mjs` because they run in **both** the
browser and the Node test runner — the same reason as `calendar-utils.mjs`.
Their declarations are `.d.mts`, not `.d.ts`: with `allowJs` enabled, a `.d.ts`
is not consulted for an explicit `.mjs` import, so literal types never narrow.

### Database schema

Rota tables live in `supabase/rota-schema.sql`, run separately from
`schema.sql` and also idempotent.

### Tests

```bash
node --test lib/rota/__tests__/session.test.mjs
node --test lib/rota/__tests__/fairness.test.mjs
node --test lib/rota/__tests__/auto-assign.test.mjs
```
