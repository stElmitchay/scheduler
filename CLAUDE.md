# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Note:** This is Next.js 16 with React 19 — read `node_modules/next/dist/docs/` before writing any code. APIs and conventions may differ from training data.

## Commands

```bash
npm run dev        # Start dev server (Turbopack enabled)
npm run build      # Production build
npm run lint       # ESLint (bare `eslint`, config in eslint.config.mjs)
```

### Tests

Node's built-in test runner, no framework. Tests live in `__tests__/` next to the
code they cover and are always `.mjs`.

```bash
node --test "{lib,scripts}/**/__tests__/*.test.mjs"   # whole suite
node --test lib/rota/__tests__/fairness.test.mjs      # single file
```

Current test files: `lib/scheduler/__tests__/{calendar-utils,daily-limit}.test.mjs`,
`lib/rota/__tests__/{session,fairness,auto-assign}.test.mjs`,
`scripts/__tests__/department-sql.test.mjs`.

Only `.mjs` modules are testable — anything in a `.ts` file (all Supabase access)
has no test coverage, so logic worth testing belongs in an `.mjs` module.

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
- `ACCESS_CODE_PEPPER` — pepper for SHA-256 access code hashing **and** the HMAC key for rota and opportunity session tokens

Optional:
- `NEXT_PUBLIC_SITE_URL` — public base URL used to build the rota and opportunity share
  links (e.g. `https://kcf-schedule.vercel.app`). Falls back to
  `window.location.origin`, which is wrong when a leader builds a rota on
  localhost and shares the link.

## Architecture

A Next.js App Router app for Kharis Church (Freetown). Three features share one
Supabase project and one access-code system:

1. **Scheduler** (`/`) — space booking bulletin and calendar
2. **Serving rota** (`/rota`, `/r/[slug]`) — monthly serving assignments
3. **Opportunities board** (`/opportunities`, `/opportunities/[slug]`, `/opportunities/dashboard`) — jobs, scholarships, and more

### Cross-cutting conventions

**Service-role Supabase only.** There is no Supabase Auth and no RLS policy in
use. `lib/supabase/server.ts#createServerSupabaseClient()` uses the service role
key and is `server-only`. Every authorization decision is made in application
code before the query runs — the database will not stop a bad query.

**`.mjs` for anything shared with tests.** Pure logic that must run in both the
browser and the Node test runner is written as native ESM `.mjs`
(`calendar-utils`, `daily-limit`, `session`, `fairness`, `auto-assign`).
Declarations for these are `.d.mts`, **not** `.d.ts`: with `allowJs` enabled, a
`.d.ts` is not consulted for an explicit `.mjs` import, so literal types never
narrow. (`lib/scheduler/*.d.ts` predate this and are the exception.)

**Session tokens, not codes.** The rota and opportunities board both unlock with an access
code once, then issue an opaque HMAC-signed 12-hour token
(`subject.expiresAt.signature`). Every later action takes the **token** and
derives the subject from it — a department id is never accepted from the client.
Tokens live in `sessionStorage`; the raw access code is never persisted.

### Access control

Two access context kinds: `{ kind: "department", departmentId, departmentName }`
and `{ kind: "pastor" }`.

Codes are normalized (uppercase + trim) and hashed with SHA-256 +
`ACCESS_CODE_PEPPER`. Department hashes live in `departments.access_code_hash`;
the pastor hash lives in `app_settings.pastor_access_code_hash`. Resolution logic
is in `lib/scheduler/access.ts` and `lib/scheduler/data.ts#resolveAccessCode` —
every feature funnels through that one function.

A department code unlocks add/manage for that department only. A pastor code
unlocks all bookings and the pastor dashboard. The opportunities dashboard additionally
requires the department to be named `Welfare` (checked by name, in
`resolveOpportunityDashboardAccess` and again in `assertOpportunityDashboardSession`).

## Scheduler

### Data flow

`app/page.tsx` (Server Component) fetches all bookings, departments, and spaces
from Supabase in parallel and passes them as props to `<BulletinApp>`. If any
fetch throws it renders a "Supabase setup required" page instead. All subsequent
navigation is client-side state — there is no routing inside the scheduler.

Mutations go through Server Actions in `app/actions.ts`, which call
`lib/scheduler/data.ts` and then `revalidatePath("/")`.

### Screen state machine

`BulletinApp` (`components/scheduler/bulletin-app.tsx`) holds all state and
routes a `screen` variable to a component in `components/scheduler/screens/`:

- `home` — public weekly bulletin
- `menu` — navigation (also links out to `/opportunities`, `/opportunities/dashboard`, `/rota`)
- `calendar` — full month calendar with space filter chips
- `add` — booking form (create or edit, controlled by `editingId`)
- `manage` — editable bookings for the active access context
- `pastor` — metrics dashboard (pastor code only)

### Booking rules

Three tiers, checked in `lib/scheduler/data.ts#createBooking` / `updateBooking`:

1. **Hard space conflict** — same `space_id`, overlapping time, both confirmed.
   Blocked by an app-level pre-check *and* the Postgres exclusion constraint
   `bookings_no_confirmed_overlap` (`btree_gist`). Returns an error.
2. **Soft department conflict** — overlapping time with a different department in
   any space. The booking saves as `pending` instead of `confirmed`.
3. **Daily activity limit** — at most `MAX_ACTIVITIES_PER_DAY` (3) confirmed
   activities church-wide per calendar day. `activity_type = 'Service'` is exempt:
   services neither count toward the limit nor are blocked by it. Logic in
   `lib/scheduler/daily-limit.mjs`.

`repeatWeekly: true` creates 12 weekly occurrences in a single insert batch, so
the limit checks operate on a set of occurrences, not one row.

### Key modules

| Path | Purpose |
|---|---|
| `lib/scheduler/types.ts` | Shared types: `Booking`, `Department`, `Space`, `AccessContext`, `ActivityType` |
| `lib/scheduler/data.ts` | All Supabase queries and mutations |
| `lib/scheduler/access.ts` | `hashAccessCode`, `normalizeAccessCode` |
| `lib/scheduler/validation.ts` | `validateBookingInput`, `rangesOverlap` |
| `lib/scheduler/calendar-utils.mjs` | Calendar grid/week utilities |
| `lib/scheduler/daily-limit.mjs` | Daily cap counting and exemption |
| `lib/scheduler/time.ts` | `getCurrentTimestamp()` — server-only, so "now" is never taken from the client |

## Serving rota module

Self-contained beside the scheduler. Adds `rota_*` tables and new routes; does
not migrate `bookings`, `departments`, or `app_settings`.

| Route | Audience | Purpose |
|---|---|---|
| `/rota` | leader | Code gate, then build and manage the rota |
| `/r/[slug]` | public | Published rota, read-only, no code |

### Serving days

Derived from `bookings` rows where `activity_type = 'Service'` and
`status = 'confirmed'`, matched against `rota_service.service_name`. Service
names are chosen from a dropdown of real `activity_name` values, never typed, so
they cannot drift. Slots are derived from (booking × role × `slot_count`) and are
not stored; only filled slots exist, in `rota_assignment`. Move or cancel a
service in the scheduler and the rota follows.

A month stays a draft until published. Regenerating the share slug invalidates
the old public link.

### Key modules

| Path | Purpose |
|---|---|
| `lib/rota/types.ts` | Shared types |
| `lib/rota/data.ts` | All Supabase queries and mutations |
| `lib/rota/session.mjs` | Session token sign/verify |
| `lib/rota/fairness.mjs` | The seven warning rules and the period summary |
| `lib/rota/auto-assign.mjs` | Deterministic greedy fill of empty slots (never overwrites a manual pick) |
| `lib/rota/share-url.ts` | `buildShareUrl` |
| `app/rota/actions.ts` | Server actions |
| `components/rota/` | Leader screens and the public view |

## Opportunities board module

Welfare-team postings — jobs, scholarships, grants, and so on. Adds
`opportunities` and `opportunity_board_settings` plus a public Supabase Storage
bucket; touches nothing else.

| Route | Audience | Purpose |
|---|---|---|
| `/opportunities` | public | Published list |
| `/opportunities/[slug]` | public | Single published opportunity |
| `/opportunities/dashboard` | Welfare / pastor | Code gate, then create, publish, and manage |

This was the "job board" until it started carrying scholarships. `next.config.ts`
holds permanent redirects from `/jobs`, `/jobs/dashboard`, and `/jobs/:slug`, so
already-shared links still resolve — keep them.

### Kind vs employment type

Two separate classifiers, easy to confuse:

- **`kind`** (`opportunity_kind`) — what the posting *is*: `job`, `scholarship`,
  `internship`, `training`, `grant`, `volunteer`, `other`. Required, defaults to
  `job`, drives the board's Kind filter and the card badge.
- **`employment_type`** (`employment_type`, formerly `job_type`) — `full_time`,
  `part_time`, … Only meaningful for `kind = 'job'`.

That last rule is enforced in three places on purpose: the form hides the field
unless kind is Job, `toMutation` in `data.ts` forces `employment_type` to null
for any other kind, and a check constraint
(`opportunities_employment_type_only_for_jobs`) backs both. Switching a posting
from Job to Scholarship must never leave a stale "Part-time" behind.

### Status lifecycle

`draft → published → closed → archived`, with `archived → draft` to restore.
Transitions are enforced in `assertAllowedStatusTransition`; nothing else is
legal. Publishing requires an application route — at least one of
`application_link`, `application_instructions`, or `organisation_contact` — and
that is also a Postgres check constraint
(`opportunities_application_route_when_published`).

`closeExpiredPublishedOpportunities()` runs at the top of every read path and
flips published rows past their `deadline` to `closed`. There is no cron; expiry
only happens when someone loads a page.

### Attachments

Uploaded to the public `job-attachments` bucket (10 MB cap; PDF, PNG, JPEG,
WebP). The row stores `attachment_path`; the public URL is derived at read time
in `publicAttachmentUrl`. Replacing or deleting a posting removes the old object.

The bucket kept its original id through the rename: it appears in every
attachment URL already published, and renaming a bucket means copying every
object into a new one.

### Slugs

`buildUniqueSlug` slugifies the title, caps at 80 chars, and appends `-2`, `-3`,
… against the full set of existing slugs. Slugs are the public URL, so renaming a
posting changes its link.

### Key modules

| Path | Purpose |
|---|---|
| `lib/opportunities/types.ts` | Shared types, `opportunityStatuses`, `opportunityKinds`, `employmentTypes`, and their label maps |
| `lib/opportunities/data.ts` | Supabase queries, mutations, storage, status transitions |
| `lib/opportunities/session.mjs` | Dashboard session token sign/verify |
| `lib/opportunities/validation.ts` | Draft vs publish validation, WhatsApp number, attachment |
| `lib/opportunities/slug.ts` | `slugifyOpportunityTitle`, `buildUniqueSlug` |
| `app/opportunities/dashboard/actions.ts` | Server actions; `runDashboardAction` wraps each one and revalidates `/opportunities` + `/opportunities/dashboard` |
| `components/opportunities/` | Board, detail, gate, dashboard, form, settings |

Dashboard actions return `OpportunityActionResult<T>` — `{ ok: true }`,
`{ ok: "expired" }` (the client re-prompts for the code), or
`{ ok: false, message }`. They never throw to the client.

## Database

All SQL lives in `supabase/` and every file is idempotent. Run against the same
Supabase project:

| File | When |
|---|---|
| `schema.sql` | Base setup: `spaces`, `departments`, `app_settings` (single row), `bookings` |
| `activity-calendar-migration.sql` | One-off migration on an existing project — adds the `pending` status and `activity_type`, makes `space_id` nullable, rebuilds the overlap constraint, seeds 12 weeks of services |
| `rota-schema.sql` | `rota_*` tables |
| `opportunity-board-schema.sql` | Fresh install: `opportunities`, `opportunity_board_settings`, `job-attachments` storage bucket |
| `opportunities-rename-migration.sql` | One-off, only on a project that ran the old `job-board-schema.sql` — renames the types, tables, columns, constraints and indexes in place and adds `kind` |

Every schema enables RLS on its tables and defines **no policies** — so anon/authed
clients can read nothing. The app works only because it queries with the service
role key from the server. Adding a client-side Supabase call will silently return
empty results, not an error.
