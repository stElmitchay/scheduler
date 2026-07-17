-- Run this on the existing Supabase project before deploying the activity-calendar code.
-- This script only alters the existing bookings model and seeds default services.

alter type public.booking_status add value if not exists 'pending';

alter table public.bookings
  alter column space_id drop not null;

alter table public.bookings
  add column if not exists activity_type text not null default 'Meeting';

alter table public.bookings
  drop constraint if exists bookings_activity_type_valid;

alter table public.bookings
  add constraint bookings_activity_type_valid check (
    activity_type in (
      'Service',
      'Rehearsal',
      'Prayer',
      'Cleaning',
      'Meeting',
      'Evangelism',
      'Social',
      'Other'
    )
  );

alter table public.bookings
  drop constraint if exists bookings_no_confirmed_overlap;

alter table public.bookings
  add constraint bookings_no_confirmed_overlap
  exclude using gist (
    space_id with =,
    tstzrange(start_at, end_at, '[)') with &&
  )
  where (status = 'confirmed' and space_id is not null);

create index if not exists bookings_status_idx on public.bookings (status);
create index if not exists bookings_space_id_idx on public.bookings (space_id);

with service_settings as (
  select
    departments.id as department_id,
    spaces.id as space_id
  from public.departments
  cross join public.spaces
  where departments.name = 'Admin'
    and spaces.name = 'Main Auditorium'
  limit 1
),
service_templates(activity_name, weekday, start_time, end_time) as (
  values
    ('Sunday Service', 0, time '11:00', time '13:00'),
    ('Wednesday Service', 3, time '18:00', time '20:00'),
    ('Friday Service', 5, time '18:00', time '20:00')
),
service_occurrences as (
  select
    service_settings.department_id,
    service_settings.space_id,
    service_templates.activity_name,
    (
      current_date
      + ((service_templates.weekday - extract(dow from current_date)::int + 7) % 7)
      + (week_index * 7)
      + service_templates.start_time
    )::timestamptz as start_at,
    (
      current_date
      + ((service_templates.weekday - extract(dow from current_date)::int + 7) % 7)
      + (week_index * 7)
      + service_templates.end_time
    )::timestamptz as end_at
  from service_settings
  cross join service_templates
  cross join generate_series(0, 11) as week_index
)
insert into public.bookings (
  department_id,
  space_id,
  activity_type,
  activity_name,
  start_at,
  end_at,
  status
)
select
  service_occurrences.department_id,
  service_occurrences.space_id,
  'Service',
  service_occurrences.activity_name,
  service_occurrences.start_at,
  service_occurrences.end_at,
  'confirmed'
from service_occurrences
where not exists (
  select 1
  from public.bookings
  where bookings.activity_name = service_occurrences.activity_name
    and bookings.start_at = service_occurrences.start_at
    and bookings.space_id = service_occurrences.space_id
)
and not exists (
  select 1
  from public.bookings
  where bookings.status = 'confirmed'
    and bookings.space_id = service_occurrences.space_id
    and tstzrange(bookings.start_at, bookings.end_at, '[)')
      && tstzrange(service_occurrences.start_at, service_occurrences.end_at, '[)')
);
