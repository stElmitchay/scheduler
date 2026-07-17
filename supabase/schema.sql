create extension if not exists "pgcrypto";
create extension if not exists "btree_gist";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'booking_status') then
    create type booking_status as enum ('confirmed', 'cancelled');
  end if;
end $$;

create table if not exists public.spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  access_code_hash text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  id boolean primary key default true,
  pastor_access_code_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_settings_single_row check (id = true)
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments(id),
  space_id uuid not null references public.spaces(id),
  activity_name text not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  status booking_status not null default 'confirmed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_activity_name_not_blank check (length(trim(activity_name)) > 0),
  constraint bookings_end_after_start check (end_at > start_at)
);

alter table public.bookings
  drop constraint if exists bookings_no_confirmed_overlap;

alter table public.bookings
  add constraint bookings_no_confirmed_overlap
  exclude using gist (
    space_id with =,
    tstzrange(start_at, end_at, '[)') with &&
  )
  where (status = 'confirmed');

create index if not exists bookings_start_at_idx on public.bookings (start_at);
create index if not exists bookings_status_idx on public.bookings (status);
create index if not exists bookings_department_id_idx on public.bookings (department_id);
create index if not exists bookings_space_id_idx on public.bookings (space_id);

insert into public.spaces (name)
values
  ('Main Auditorium'),
  ('Second Floor Room'),
  ('Balcony')
on conflict (name) do nothing;

alter table public.spaces enable row level security;
alter table public.departments enable row level security;
alter table public.app_settings enable row level security;
alter table public.bookings enable row level security;
