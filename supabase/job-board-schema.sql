-- Job Board schema.
-- Run this against the same Supabase project as schema.sql.
-- Idempotent: safe to run more than once.

create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'job_opportunity_status') then
    create type job_opportunity_status as enum ('draft', 'published', 'closed', 'archived');
  end if;

  if not exists (select 1 from pg_type where typname = 'job_type') then
    create type job_type as enum (
      'full_time',
      'part_time',
      'contract',
      'internship',
      'temporary',
      'volunteer',
      'other'
    );
  end if;
end $$;

create table if not exists public.job_board_settings (
  id boolean primary key default true,
  welfare_whatsapp_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint job_board_settings_single_row check (id = true),
  constraint job_board_settings_whatsapp_not_blank check (
    welfare_whatsapp_number is null or length(trim(welfare_whatsapp_number)) > 0
  )
);

create table if not exists public.job_opportunities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  organisation text not null,
  location text not null,
  description text not null,
  requirements text,
  application_instructions text,
  application_link text,
  deadline date,
  salary text,
  job_type job_type,
  organisation_contact text,
  attachment_path text,
  attachment_name text,
  attachment_content_type text,
  status job_opportunity_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint job_opportunities_title_not_blank check (length(trim(title)) > 0),
  constraint job_opportunities_slug_not_blank check (length(trim(slug)) > 0),
  constraint job_opportunities_organisation_not_blank check (length(trim(organisation)) > 0),
  constraint job_opportunities_location_not_blank check (length(trim(location)) > 0),
  constraint job_opportunities_description_not_blank check (length(trim(description)) > 0),
  constraint job_opportunities_application_link_not_blank check (
    application_link is null or length(trim(application_link)) > 0
  ),
  constraint job_opportunities_application_route_when_published check (
    status <> 'published'
    or application_link is not null
    or application_instructions is not null
    or organisation_contact is not null
  )
);

create index if not exists job_opportunities_status_idx on public.job_opportunities (status);
create index if not exists job_opportunities_deadline_idx on public.job_opportunities (deadline);
create index if not exists job_opportunities_job_type_idx on public.job_opportunities (job_type);
create index if not exists job_opportunities_location_idx on public.job_opportunities (location);
create index if not exists job_opportunities_created_at_idx on public.job_opportunities (created_at desc);

insert into public.job_board_settings (id)
values (true)
on conflict (id) do nothing;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'job-attachments',
  'job-attachments',
  true,
  10485760,
  array['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.job_board_settings enable row level security;
alter table public.job_opportunities enable row level security;
