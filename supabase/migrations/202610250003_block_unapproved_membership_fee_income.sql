-- Enforce the association's current rule: membership fees/subscriptions are not approved.
-- A later migration may relax this only after the General Assembly formally approves fees.
create or replace function private.prevent_unapproved_membership_fee_income()
returns trigger
language plpgsql
set search_path to ''
as $function$
declare
  new_fee_like boolean;
  old_fee_like boolean := false;
  fee_text text;
begin
  fee_text := coalesce(new.category, '') || ' ' || coalesce(new.description, '');
  new_fee_like := new.transaction_type = 'income'
    and fee_text ~* '(اشتراك|انخراط|رسوم[[:space:]]*(العضوية|الانخراط)|membership[[:space:]]*(fee|dues)|annual[[:space:]]*(subscription|dues))';

  if tg_op = 'UPDATE' then
    fee_text := coalesce(old.category, '') || ' ' || coalesce(old.description, '');
    old_fee_like := old.transaction_type = 'income'
      and fee_text ~* '(اشتراك|انخراط|رسوم[[:space:]]*(العضوية|الانخراط)|membership[[:space:]]*(fee|dues)|annual[[:space:]]*(subscription|dues))';
  end if;

  if new_fee_like and (tg_op = 'INSERT' or not old_fee_like) then
    raise exception 'Membership fee income is disabled until General Assembly approval'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$function$;

drop trigger if exists prevent_unapproved_membership_fee_income on public.finance_transactions;
create trigger prevent_unapproved_membership_fee_income
before insert or update on public.finance_transactions
for each row execute function private.prevent_unapproved_membership_fee_income();
