create table if not exists public.founding_member_roster (
  founder_number integer primary key check (founder_number between 1 and 16),
  full_name text not null check (char_length(btrim(full_name)) between 3 and 180),
  founder_status text not null default 'founder' check (founder_status = 'founder'),
  current_status text not null default 'pending_review'
    check (current_status in ('pending_review','active','inactive','resigned','deceased','unknown')),
  assembly_eligibility text not null default 'pending_review'
    check (assembly_eligibility in ('pending_review','eligible','ineligible')),
  review_note text,
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.founding_member_roster enable row level security;
drop policy if exists "Authorized bureau reads founding member roster" on public.founding_member_roster;
create policy "Authorized bureau reads founding member roster"
on public.founding_member_roster for select to authenticated
using ((select private.current_staff_role()) = any (array['site_admin','president','deputy_president','secretary_general','deputy_secretary_general','technical_director']));
drop policy if exists "President and secretary manage founding member roster" on public.founding_member_roster;
create policy "President and secretary manage founding member roster"
on public.founding_member_roster for all to authenticated
using ((select private.current_staff_role()) = any (array['site_admin','president','secretary_general']))
with check ((select private.current_staff_role()) = any (array['site_admin','president','secretary_general']));
grant select, insert, update, delete on public.founding_member_roster to authenticated;
-- Founding-member roster intentionally starts empty; enter names only from verified records.

create or replace function public.touch_founding_member_roster_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
 new.updated_at = now();
 if new.current_status <> 'pending_review' or new.assembly_eligibility <> 'pending_review' then
   new.verified_by = auth.uid();
   new.verified_at = now();
 end if;
 return new;
end;
$$;
drop trigger if exists founding_member_roster_touch_updated_at on public.founding_member_roster;
create trigger founding_member_roster_touch_updated_at before update on public.founding_member_roster
for each row execute function public.touch_founding_member_roster_updated_at();
