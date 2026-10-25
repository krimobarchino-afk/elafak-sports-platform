-- Decision-driven association settings: only approved General Assembly decisions may set annual fees.
create table if not exists public.association_settings (
  setting_key text primary key,
  setting_value jsonb not null,
  source_meeting_id uuid not null references public.meetings(id) on delete restrict,
  source_decision text not null check (char_length(btrim(source_decision)) between 5 and 3000),
  effective_date date,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint association_settings_key_check check (setting_key in ('annual_membership_fee_dzd'))
);
alter table public.association_settings enable row level security;
revoke all on public.association_settings from anon, authenticated;
grant select, insert, update on public.association_settings to authenticated;
drop policy if exists "Staff read association settings" on public.association_settings;
create policy "Staff read association settings" on public.association_settings for select to authenticated
using ((select private.current_staff_role()) in ('site_admin','president','deputy_president','secretary_general','deputy_secretary_general','treasurer','deputy_treasurer','technical_director'));
drop policy if exists "President manages association settings" on public.association_settings;
create policy "President manages association settings" on public.association_settings for insert to authenticated
with check ((select private.current_staff_role()) in ('site_admin','president') and exists (select 1 from public.meetings m where m.id=source_meeting_id and m.meeting_type='general_assembly' and m.status='approved'));
drop policy if exists "President updates association settings" on public.association_settings;
create policy "President updates association settings" on public.association_settings for update to authenticated
using ((select private.current_staff_role()) in ('site_admin','president'))
with check ((select private.current_staff_role()) in ('site_admin','president') and exists (select 1 from public.meetings m where m.id=source_meeting_id and m.meeting_type='general_assembly' and m.status='approved'));
create or replace function private.validate_membership_fee_decision_source()
returns trigger language plpgsql set search_path to '' as $function$
begin
  if new.setting_key='annual_membership_fee_dzd' then
    if coalesce((new.setting_value->>'amount')::numeric,0)<=0 then
      raise exception 'Annual membership fee must be greater than zero' using errcode='check_violation';
    end if;
    if not exists (
      select 1 from public.meetings m
      where m.id=new.source_meeting_id and m.meeting_type='general_assembly' and m.status='approved'
        and (coalesce(m.decisions,'') || ' ' || coalesce(m.minutes_text,'')) like '%' || new.source_decision || '%'
    ) then
      raise exception 'Setting must reference text contained in an approved General Assembly report' using errcode='check_violation';
    end if;
  end if;
  return new;
end;
$function$;
drop trigger if exists validate_membership_fee_decision_source on public.association_settings;
create trigger validate_membership_fee_decision_source before insert or update on public.association_settings
for each row execute function private.validate_membership_fee_decision_source();
create or replace function private.prevent_unapproved_membership_fee_income()
returns trigger language plpgsql set search_path to '' as $function$
declare
  new_fee_like boolean;
  old_fee_like boolean := false;
  fee_text text;
  approved_fee numeric;
begin
  fee_text := coalesce(new.category,'') || ' ' || coalesce(new.description,'');
  new_fee_like := new.transaction_type='income'
    and fee_text ~* '(اشتراك|انخراط|رسوم[[:space:]]*(العضوية|الانخراط)|membership[[:space:]]*(fee|dues)|annual[[:space:]]*(subscription|dues))';
  if tg_op='UPDATE' then
    fee_text := coalesce(old.category,'') || ' ' || coalesce(old.description,'');
    old_fee_like := old.transaction_type='income'
      and fee_text ~* '(اشتراك|انخراط|رسوم[[:space:]]*(العضوية|الانخراط)|membership[[:space:]]*(fee|dues)|annual[[:space:]]*(subscription|dues))';
  end if;
  if new_fee_like and (tg_op='INSERT' or not old_fee_like) then
    select (s.setting_value->>'amount')::numeric into approved_fee
    from public.association_settings s join public.meetings m on m.id=s.source_meeting_id
    where s.setting_key='annual_membership_fee_dzd' and m.meeting_type='general_assembly' and m.status='approved'
    limit 1;
    if coalesce(approved_fee,0)<=0 then
      raise exception 'Membership fee income is disabled until an approved General Assembly decision sets the fee' using errcode='check_violation';
    end if;
    if abs(new.amount-approved_fee)>0.001 then
      raise exception 'Membership fee income amount must match the approved annual fee (%)',approved_fee using errcode='check_violation';
    end if;
  end if;
  return new;
end;
$function$;
