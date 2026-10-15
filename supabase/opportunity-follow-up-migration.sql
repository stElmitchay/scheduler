-- Run this against the same Supabase project as opportunity-board-schema.sql.

create table if not exists public.opportunity_follow_ups (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete restrict,
  name text not null,
  contact_detail text not null,
  contact_key text not null,
  did_apply boolean not null,
  shortlisted_or_interviewed boolean not null,
  offered_position boolean not null,
  started_working boolean not null,
  started_at date,
  retained_after_three_months boolean,
  follow_up_consent boolean not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint opportunity_follow_ups_name_not_blank check (length(trim(name)) > 0),
  constraint opportunity_follow_ups_contact_not_blank check (
    length(trim(contact_detail)) > 0 and length(trim(contact_key)) > 0
  ),
  constraint opportunity_follow_ups_start_date check (
    (started_working and started_at is not null)
    or (not started_working and started_at is null)
  ),
  constraint opportunity_follow_ups_retention check (
    retained_after_three_months is null or started_working
  ),
  constraint opportunity_follow_ups_consent check (follow_up_consent)
);

create unique index if not exists opportunity_follow_ups_person_opportunity_idx
  on public.opportunity_follow_ups (opportunity_id, contact_key);

create index if not exists opportunity_follow_ups_started_at_idx
  on public.opportunity_follow_ups (started_at)
  where started_working and retained_after_three_months is null;

alter table public.opportunity_follow_ups enable row level security;

revoke all on table public.opportunity_follow_ups from anon, authenticated;
grant all on table public.opportunity_follow_ups to service_role;
