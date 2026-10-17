-- Staff authentication and request review for El Afak.
-- Apply after 202610150001_initial_join_requests.sql.
-- Auth users are provisioned only by trusted Edge Functions; never from browser code.

create table if not exists public.staff_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-zA-Z0-9_]{4,32}$'),
  full_name text not null check (char_length(trim(full_name)) between 2 and 160),
  role text not null check (role in ('platform_admin','president','secretary_general','treasurer','deputy_president','deputy_secretary_general','deputy_treasurer')),
  active boolean not null default true,
  must_change_password boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists staff_profiles_role_idx on public.staff_profiles(role);
alter table public.staff_profiles enable row level security;

create or replace function public.current_staff_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.staff_profiles
  where user_id = auth.uid() and active = true
  limit 1
$$;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.staff_profiles
    where user_id = auth.uid() and active = true and role = 'platform_admin'
  )
$$;

revoke all on function public.current_staff_role() from public;
revoke all on function public.is_platform_admin() from public;
grant execute on function public.current_staff_role() to authenticated;
grant execute on function public.is_platform_admin() to authenticated;

drop policy if exists "Staff can read own profile" on public.staff_profiles;
create policy "Staff can read own profile"
on public.staff_profiles for select to authenticated
using (user_id = auth.uid());

drop policy if exists "Platform admin can manage staff profiles" on public.staff_profiles;
create policy "Platform admin can manage staff profiles"
on public.staff_profiles for all to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

-- Only the president and platform administrator may review incoming requests.
drop policy if exists "Authorized staff can read join requests" on public.join_requests;
create policy "Authorized staff can read join requests"
on public.join_requests for select to authenticated
using (public.current_staff_role() in ('platform_admin', 'president'));

drop policy if exists "Authorized staff can review join requests" on public.join_requests;
create policy "Authorized staff can review join requests"
on public.join_requests for update to authenticated
using (public.current_staff_role() in ('platform_admin', 'president'))
with check (
  public.current_staff_role() in ('platform_admin', 'president')
  and status in ('pending','needs_information','approved','declined')
  and (status = 'pending' or reviewed_at is not null)
);

grant select on public.staff_profiles to authenticated;
grant select on public.join_requests to authenticated;
grant update (status, reviewer_note, reviewed_at) on public.join_requests to authenticated;

comment on table public.staff_profiles is
'Internal staff identity and role mapping. Passwords are handled only by Supabase Auth.';
