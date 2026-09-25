-- Job Board -> Opportunities Board.
-- Run this once on a project that already ran the old job-board-schema.sql.
-- Renames in place, so no row is copied and no attachment moves.
-- Idempotent: safe to run more than once.
--
-- On a fresh project run opportunity-board-schema.sql instead.

-- 1. Types -------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_type where typname = 'job_opportunity_status')
     and not exists (select 1 from pg_type where typname = 'opportunity_status') then
    alter type public.job_opportunity_status rename to opportunity_status;
  end if;

  -- The old enum named job_type becomes employment_type. Renaming it frees the
  -- name and keeps every stored value.
  if exists (select 1 from pg_type where typname = 'job_type')
     and not exists (select 1 from pg_type where typname = 'employment_type') then
    alter type public.job_type rename to employment_type;
  end if;

  if not exists (select 1 from pg_type where typname = 'opportunity_kind') then
    create type public.opportunity_kind as enum (
      'job',
      'scholarship',
      'internship',
      'training',
      'grant',
      'volunteer',
      'other'
    );
  end if;
end $$;

-- 2. Tables ------------------------------------------------------------------

do $$
begin
  if to_regclass('public.job_opportunities') is not null
     and to_regclass('public.opportunities') is null then
    alter table public.job_opportunities rename to opportunities;
  end if;

  if to_regclass('public.job_board_settings') is not null
     and to_regclass('public.opportunity_board_settings') is null then
    alter table public.job_board_settings rename to opportunity_board_settings;
  end if;
end $$;

-- 3. Columns -----------------------------------------------------------------

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'opportunities'
      and column_name = 'job_type'
  ) then
    alter table public.opportunities rename column job_type to employment_type;
  end if;
end $$;

-- Every existing posting was a job, which is exactly what the default says.
alter table public.opportunities
  add column if not exists kind public.opportunity_kind not null default 'job';

-- 4. Constraints -------------------------------------------------------------

-- rename constraint has no IF EXISTS, so each one is guarded to keep the file
-- re-runnable.
do $$
declare
  renames text[][] := array[
    ['opportunity_board_settings', 'job_board_settings_single_row', 'opportunity_board_settings_single_row'],
    ['opportunity_board_settings', 'job_board_settings_whatsapp_not_blank', 'opportunity_board_settings_whatsapp_not_blank'],
    ['opportunities', 'job_opportunities_title_not_blank', 'opportunities_title_not_blank'],
    ['opportunities', 'job_opportunities_slug_not_blank', 'opportunities_slug_not_blank'],
    ['opportunities', 'job_opportunities_organisation_not_blank', 'opportunities_organisation_not_blank'],
    ['opportunities', 'job_opportunities_location_not_blank', 'opportunities_location_not_blank'],
    ['opportunities', 'job_opportunities_description_not_blank', 'opportunities_description_not_blank'],
    ['opportunities', 'job_opportunities_application_link_not_blank', 'opportunities_application_link_not_blank'],
    ['opportunities', 'job_opportunities_application_route_when_published', 'opportunities_application_route_when_published'],
    -- Postgres does not rename a table's auto-generated primary key and unique
    -- constraints when the table is renamed, so a migrated project would keep
    -- the old names while a fresh one gets the new ones.
    ['opportunities', 'job_opportunities_pkey', 'opportunities_pkey'],
    ['opportunities', 'job_opportunities_slug_key', 'opportunities_slug_key'],
    ['opportunity_board_settings', 'job_board_settings_pkey', 'opportunity_board_settings_pkey']
  ];
  entry text[];
begin
  foreach entry slice 1 in array renames loop
    if exists (
      select 1
      from pg_constraint
      join pg_class on pg_class.oid = pg_constraint.conrelid
      join pg_namespace on pg_namespace.oid = pg_class.relnamespace
      where pg_namespace.nspname = 'public'
        and pg_class.relname = entry[1]
        and pg_constraint.conname = entry[2]
    ) then
      execute format(
        'alter table public.%I rename constraint %I to %I',
        entry[1], entry[2], entry[3]
      );
    end if;
  end loop;
end $$;

alter table public.opportunities
  drop constraint if exists opportunities_employment_type_only_for_jobs;

alter table public.opportunities
  add constraint opportunities_employment_type_only_for_jobs check (
    kind = 'job' or employment_type is null
  );

-- 5. Indexes -----------------------------------------------------------------

alter index if exists public.job_opportunities_status_idx rename to opportunities_status_idx;
alter index if exists public.job_opportunities_deadline_idx rename to opportunities_deadline_idx;
alter index if exists public.job_opportunities_job_type_idx rename to opportunities_employment_type_idx;
alter index if exists public.job_opportunities_location_idx rename to opportunities_location_idx;
alter index if exists public.job_opportunities_created_at_idx rename to opportunities_created_at_idx;

create index if not exists opportunities_kind_idx on public.opportunities (kind);
