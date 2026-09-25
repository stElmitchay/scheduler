# Kharis Church Scheduler

Space bookings, serving rota, and opportunities board for Kharis Church,
Freetown. One Next.js app over one Supabase project, sharing a single set of
access codes.

| Page | Who it's for |
|---|---|
| `/` | Everyone — the weekly bulletin and month calendar |
| `/rota` | Department leaders — build and publish a monthly serving rota |
| `/r/[slug]` | Everyone — a published rota, read-only, no code needed |
| `/opportunities` | Everyone — jobs, scholarships, and more from the Welfare team |
| `/opportunities/dashboard` | Welfare team and the branch pastor — post and manage them |

## Setup

Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
ACCESS_CODE_PEPPER=...            # any long random string, keep it secret
NEXT_PUBLIC_SITE_URL=https://...  # the deployed URL; see note below
```

`NEXT_PUBLIC_SITE_URL` is what share links are built from. Without it the app
falls back to whatever origin the browser is on, so a rota built on localhost
would be shared as a `localhost` link that nobody else can open.

Run the SQL in `supabase/` against the project, in this order:

| File | When |
|---|---|
| `schema.sql` | Always — spaces, departments, settings, bookings |
| `activity-calendar-migration.sql` | Only on a project created before activity types existed |
| `rota-schema.sql` | To enable `/rota` |
| `opportunity-board-schema.sql` | To enable `/opportunities` on a new project |
| `opportunities-rename-migration.sql` | Instead of the line above, on a project that already ran the old `job-board-schema.sql` |

Each file is safe to run more than once.

Then:

```bash
npm install
npm run dev     # http://localhost:3000
```

### Access codes

Codes are never stored in plain text. Hash one and paste the result into
Supabase — `departments.access_code_hash` for a department, or
`app_settings.pastor_access_code_hash` for the branch pastor:

```bash
ACCESS_CODE_PEPPER="..." npm run hash-code -- "MYCODE"
```

The pepper used to hash a code must match the one in `.env.local`, so changing
`ACCESS_CODE_PEPPER` invalidates every existing code.

To set up all twelve departments at once, `ACCESS_CODE_PEPPER="..." npm run
department-sql` prints an `INSERT` you can paste into Supabase, with each
department's code listed in a comment at the top. Re-running it overwrites the
stored hashes, so it doubles as a way to rotate every department code.

A department code unlocks booking and managing for that department only. The
pastor code unlocks everything, plus the metrics dashboard.

## Booking rules

- **Space conflicts** — two confirmed activities can't overlap in the same
  space. This is blocked outright.
- **Department conflicts** — if another department already has something
  scheduled at an overlapping time (in a different space), the new activity is
  saved as *pending* instead of *confirmed*, so it can be reviewed before it's
  treated as final.
- **Daily activity limit** — no more than 3 confirmed activities can be
  scheduled church-wide on any single calendar day. Services are exempt: they
  don't count toward the limit and are never blocked by it.

Ticking *repeat weekly* on a booking creates 12 occurrences, and the rules above
are checked against all of them.

## Serving rota

Department leaders can build and share a monthly serving rota at `/rota`.

- **Signing in** — enter your department access code, the same one used for
  bookings. The session lasts until you close the tab, so a reload keeps you
  signed in but a shared phone does not stay unlocked. Sessions also expire
  after 12 hours.
- **Serving days come from the calendar** — the rota reads confirmed bookings
  with an activity type of `Service`. Configure which of those your department
  serves at, and the roles under each, in *Services and roles*. Move or cancel a
  service in the scheduler and the rota follows.
- **Filling a month** — tap an empty slot and pick someone. The app warns when a
  person is over their monthly cap, doing noticeably more than the rest of the
  team, or serving several weeks in a row, and blocks anyone who is on break,
  away, or already serving at that service. *Auto-generate* fills only the empty
  slots and never changes a pick made by hand.
- **Sharing** — a month stays a draft until you publish it. The share link under
  *Services and roles* is public and read-only; ushers open it and search their
  name to find their dates. Generating a new link stops the old one working.

## Opportunities board

The Welfare team posts vetted opportunities at `/opportunities` — jobs,
scholarships, grants, and anything else worth passing on. Anyone can browse them,
no code and no account. Visitors can search by title, organisation, location, or
description, and filter by kind, employment type, and location.

- **Kinds** — every posting is one of Job, Scholarship, Internship, Training,
  Grant, Volunteer, or Other, shown as a badge on the board and picked at the
  top of the form. **Employment type** (full-time, part-time, and so on) only
  appears for a Job, since it says nothing useful about a scholarship. Switching
  a posting away from Job clears it.
- **Signing in** — the dashboard at `/opportunities/dashboard` opens with the
  Welfare department code or the pastor code. No other department code works. As
  with the rota, the session is per-tab and expires after 12 hours.
- **Posting** — a draft needs a title, organisation, location, and description.
  Before it can be published it also needs a way to apply: a link, written
  instructions, or an organisation contact. You can attach a PDF or an image
  (PNG, JPG, or WEBP) up to 10 MB.
- **The life of a posting** — *draft* → *published* → *closed* → *archived*, and
  an archived posting can be sent back to draft to reuse. A published posting
  with a deadline closes itself once that date passes. Closing or archiving
  takes it off the public board; it is never deleted.
- **Sharing** — every published posting has its own link at
  `/opportunities/<slug>`. The slug comes from the title, so renaming one
  changes its link and the old one stops working. Links shared back when this
  was the job board (`/jobs/<slug>`) still work — they redirect.
- **WhatsApp help** — set a Welfare WhatsApp number in *Opportunity settings*
  and each page gains a button that opens WhatsApp with the details filled in,
  so someone who needs help applying can just send it. Use international format
  with no `+`, for example `23276123456`. Leave it blank to hide the button.

## Tests

```bash
node --test "{lib,scripts}/**/__tests__/*.test.mjs"
```

## Deploying

Deploy on [Vercel](https://vercel.com/new). Set the four environment variables
in the project settings — including `NEXT_PUBLIC_SITE_URL`, pointing at the
deployed domain — and run the SQL files against the Supabase project first.
