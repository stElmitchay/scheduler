-- Serving rota schema.
-- Run this against the same Supabase project as schema.sql, after it.
-- Idempotent: safe to run more than once.

create extension if not exists "pgcrypto";

create table if not exists public.rota_settings (
  department_id uuid primary key references public.departments(id) on delete cascade,
  share_slug text not null unique,
  max_serves_per_month int not null default 3 check (max_serves_per_month between 1 and 31),
  created_at timestamptz not null default now()
);

create table if not exists public.rota_service (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments(id) on delete cascade,
  service_name text not null,
  created_at timestamptz not null default now(),
  constraint rota_service_name_not_blank check (length(trim(service_name)) > 0),
  unique (department_id, service_name)
);

create table if not exists public.rota_role (
  id uuid primary key default gen_random_uuid(),
  rota_service_id uuid not null references public.rota_service(id) on delete cascade,
  name text not null,
  slot_count int not null default 1 check (slot_count between 1 and 20),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  constraint rota_role_name_not_blank check (length(trim(name)) > 0)
);

create table if not exists public.rota_person (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments(id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint rota_person_name_not_blank check (length(trim(name)) > 0),
  unique (department_id, name)
);

create table if not exists public.rota_unavailability (
  id uuid primary key default gen_random_uuid(),
  rota_person_id uuid not null references public.rota_person(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now(),
  constraint rota_unavailability_end_after_start check (end_date >= start_date)
);

create table if not exists public.rota_period (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments(id) on delete cascade,
  month date not null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  constraint rota_period_month_is_first check (extract(day from month) = 1),
  unique (department_id, month)
);

-- A slot is derived from (booking x role x slot_count); only filled slots exist here.
-- unique (booking_id, rota_person_id) is the database-level guarantee that one
-- person cannot hold two posts at the same service.
create table if not exists public.rota_assignment (
  id uuid primary key default gen_random_uuid(),
  rota_period_id uuid not null references public.rota_period(id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  rota_role_id uuid not null references public.rota_role(id) on delete cascade,
  slot_index int not null check (slot_index >= 0),
  rota_person_id uuid not null references public.rota_person(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (booking_id, rota_role_id, slot_index),
  unique (booking_id, rota_person_id)
);

create index if not exists rota_service_department_idx on public.rota_service (department_id);
create index if not exists rota_role_service_idx on public.rota_role (rota_service_id);
create index if not exists rota_person_department_idx on public.rota_person (department_id);
create index if not exists rota_unavailability_person_idx on public.rota_unavailability (rota_person_id);
create index if not exists rota_period_department_idx on public.rota_period (department_id, month);
create index if not exists rota_assignment_period_idx on public.rota_assignment (rota_period_id);
create index if not exists rota_assignment_booking_idx on public.rota_assignment (booking_id);
create index if not exists rota_assignment_person_idx on public.rota_assignment (rota_person_id);

alter table public.rota_settings enable row level security;
alter table public.rota_service enable row level security;
alter table public.rota_role enable row level security;
alter table public.rota_person enable row level security;
alter table public.rota_unavailability enable row level security;
alter table public.rota_period enable row level security;
alter table public.rota_assignment enable row level security;
