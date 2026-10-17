-- El Afak platform: staff identity and role foundation
-- This migration does NOT create accounts or expose staff review access yet.
-- Create actual Auth users only through a trusted administrative workflow.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table if not exists public.staff_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique
    check (username = lower(username)
      and username ~ '^[a-z0-9][a-z0-9._-]{2,31}$'),
  role text not null
    check (role in (
      'site_admin',
      'president',
      'secretary_general',
      'treasurer',
      'deputy_secretary_general',
      'deputy_treasurer',
      'technical_director'
    )),
  is_active boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists staff_profiles_role_active_idx
  on public.staff_profiles (role)
  where is_active = true;

alter table public.staff_profiles enable row level security;

revoke all on table public.staff_profiles from anon, authenticated;
grant select on table public.staff_profiles to authenticated;

drop policy if exists "Staff can read own active profile" on public.staff_profiles;
create policy "Staff can read own active profile"
on public.staff_profiles
for select
to authenticated
using ((select auth.uid()) = user_id and is_active = true);

-- Internal role lookup for future RLS policies. It only reveals the caller's
-- active role, and cannot be used to edit profiles or assign privileges.
create or replace function private.current_staff_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select sp.role
  from public.staff_profiles as sp
  where sp.user_id = (select auth.uid())
    and sp.is_active = true
  limit 1
$$;

revoke all on function private.current_staff_role() from public, anon;
grant execute on function private.current_staff_role() to authenticated;

comment on table public.staff_profiles is
'Internal staff account profile. Auth users and staff profiles must be provisioned through a trusted administrative workflow; public signup is not allowed.';
comment on function private.current_staff_role() is
'Returns only the active role of the current authenticated user for use in server-side/RLS authorization.';
