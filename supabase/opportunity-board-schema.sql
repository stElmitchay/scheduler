-- Opportunities Board schema.
-- Run this against the same Supabase project as schema.sql.
-- Idempotent: safe to run more than once.
--
-- On a project that already ran the old job-board-schema.sql, run
-- opportunities-rename-migration.sql instead — it renames in place and keeps
-- every row.

create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'opportunity_status') then
    create type opportunity_status as enum ('draft', 'published', 'closed', 'archived');
  end if;

  if not exists (select 1 from pg_type where typname = 'opportunity_kind') then
    create type opportunity_kind as enum (
      'job',
      'scholarship',
      'internship',
      'training',
      'grant',
      'volunteer',
      'other'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'employment_type') then
    create type employment_type as enum (
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

create table if not exists public.opportunity_board_settings (
  id boolean primary key default true,
  welfare_whatsapp_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint opportunity_board_settings_single_row check (id = true),
  constraint opportunity_board_settings_whatsapp_not_blank check (
    welfare_whatsapp_number is null or length(trim(welfare_whatsapp_number)) > 0
  )
);

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  kind opportunity_kind not null default 'job',
  organisation text not null,
  location text not null,
  description text not null,
  requirements text,
  application_instructions text,
  application_link text,
  deadline date,
  salary text,
  employment_type employment_type,
  organisation_contact text,
  attachment_path text,
  attachment_name text,
  attachment_content_type text,
  status opportunity_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint opportunities_title_not_blank check (length(trim(title)) > 0),
  constraint opportunities_slug_not_blank check (length(trim(slug)) > 0),
  constraint opportunities_organisation_not_blank check (length(trim(organisation)) > 0),
  constraint opportunities_location_not_blank check (length(trim(location)) > 0),
  constraint opportunities_description_not_blank check (length(trim(description)) > 0),
  constraint opportunities_application_link_not_blank check (
    application_link is null or length(trim(application_link)) > 0
  ),
  constraint opportunities_application_route_when_published check (
    status <> 'published'
    or application_link is not null
    or application_instructions is not null
    or organisation_contact is not null
  ),
  -- Employment type describes a job. A scholarship is never "Part-time".
  constraint opportunities_employment_type_only_for_jobs check (
    kind = 'job' or employment_type is null
  )
);

create index if not exists opportunities_status_idx on public.opportunities (status);
create index if not exists opportunities_kind_idx on public.opportunities (kind);
create index if not exists opportunities_deadline_idx on public.opportunities (deadline);
create index if not exists opportunities_employment_type_idx on public.opportunities (employment_type);
create index if not exists opportunities_location_idx on public.opportunities (location);
create index if not exists opportunities_created_at_idx on public.opportunities (created_at desc);

insert into public.opportunity_board_settings (id)
values (true)
on conflict (id) do nothing;

-- The bucket id keeps its original name: it is baked into every attachment URL
-- already published, and renaming a bucket means copying every object.
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

alter table public.opportunity_board_settings enable row level security;
alter table public.opportunities enable row level security;
