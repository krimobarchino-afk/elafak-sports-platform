-- Official office roster schema. The roster starts empty; historic office-holder names
-- are entered later from verified approved minutes, not seeded into a fresh environment.
create table if not exists public.executive_office_roster (
  id uuid primary key default gen_random_uuid(),
  position_key text not null unique
    check (position_key in ('president','deputy_president','secretary_general','deputy_secretary_general','treasurer','deputy_treasurer')),
  position_label text not null,
  full_name text check (full_name is null or char_length(full_name) <= 180),
  notes text,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  constraint executive_office_roster_name_length check (full_name is null or char_length(full_name) <= 180)
);
alter table public.executive_office_roster enable row level security;
grant select, insert, update, delete on public.executive_office_roster to authenticated;
grant all privileges on public.executive_office_roster to service_role;

drop policy if exists "Authorized staff can read official executive roster" on public.executive_office_roster;
create policy "Authorized staff can read official executive roster"
on public.executive_office_roster
for select to authenticated
using ((select private.current_staff_role()) = any (array[
  'president','deputy_president','secretary_general','treasurer',
  'deputy_secretary_general','deputy_treasurer','technical_director'
]));

drop policy if exists "President and secretary manage official executive roster" on public.executive_office_roster;
create policy "President and secretary manage official executive roster"
on public.executive_office_roster
for all to authenticated
using ((select private.current_staff_role()) = any (array['president','secretary_general']))
with check ((select private.current_staff_role()) = any (array['president','secretary_general']));
