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
