This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Booking Rules

- **Space conflicts** — two confirmed activities can't overlap in the same space. This is blocked outright.
- **Department conflicts** — if another department already has something scheduled at an overlapping time (in a different space), the new activity is saved as *pending* instead of *confirmed*, so it can be reviewed before it's treated as final.
- **Daily activity limit** — no more than 3 confirmed activities can be scheduled church-wide on any single calendar day. Sunday services are exempt: they don't count toward the limit and are never blocked by it.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Serving Rota

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

Run `supabase/rota-schema.sql` once against the Supabase project to create the
rota tables, and set `NEXT_PUBLIC_SITE_URL` to the deployed URL so the share link
points there rather than at localhost.
