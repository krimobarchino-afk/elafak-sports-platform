-- Full association management modules for the El Afak website.
-- Additive migration: does not drop or rewrite existing join-request/member data.
create table if not exists public.financial_years (
  fiscal_year integer primary key check (fiscal_year between 2020 and 2100),
  opening_balance numeric(14,2) not null default 0 check (opening_balance >= 0),
  closing_balance numeric(14,2),
  is_closed boolean not null default false,
  closed_at timestamptz,
  closed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.finance_transactions (
  id uuid primary key default gen_random_uuid(),
  fiscal_year integer not null references public.financial_years(fiscal_year),
  transaction_date date,
  transaction_type text not null check (transaction_type in ('income','expense')),
  category text not null check (char_length(btrim(category)) between 2 and 120),
  description text not null check (char_length(btrim(description)) between 2 and 1000),
  amount numeric(14,2) not null check (amount > 0),
  payment_method text not null default 'bank' check (payment_method in ('bank','cash','transfer','other')),
  reference text,
  entered_by uuid references auth.users(id) on delete set null,
  source_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists finance_transactions_year_date_idx
  on public.finance_transactions (fiscal_year, transaction_date desc, created_at desc);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 2 and 180),
  activity_date date,
  location text,
  activity_type text not null default 'other' check (activity_type in ('paragliding','hiking','training','volunteering','other')),
  status text not null default 'planned' check (status in ('planned','completed','cancelled')),
  leader text,
  planned_budget numeric(14,2) not null default 0 check (planned_budget >= 0),
  actual_budget numeric(14,2) not null default 0 check (actual_budget >= 0),
  notes text,
  entered_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists activities_date_idx on public.activities (activity_date desc nulls last, created_at desc);

create table if not exists public.equipment (
  id uuid primary key default gen_random_uuid(),
  item_name text not null check (char_length(btrim(item_name)) between 2 and 180),
  category text not null default 'other',
  quantity integer not null default 1 check (quantity >= 0),
  condition text not null default 'good' check (condition in ('new','good','needs_repair','out_of_service','retired')),
  serial_number text,
  acquisition_date date,
  acquisition_cost numeric(14,2) check (acquisition_cost is null or acquisition_cost >= 0),
  storage_location text,
  notes text,
  entered_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists equipment_name_idx on public.equipment (item_name);

create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 2 and 180),
  meeting_type text not null default 'executive' check (meeting_type in ('executive','general_assembly','committee','technical','other')),
  meeting_date date,
  location text,
  attendees_count integer check (attendees_count is null or attendees_count >= 0),
  quorum_note text,
  decisions text,
  minutes_text text,
  status text not null default 'draft' check (status in ('draft','approved')),
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  entered_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists meetings_date_idx on public.meetings (meeting_date desc nulls last, created_at desc);

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  table_name text not null,
  record_id text,
  action text not null check (action in ('INSERT','UPDATE','DELETE')),
  actor_id uuid,
  changed_at timestamptz not null default now(),
  details jsonb not null default '{}'::jsonb
);
create index if not exists audit_log_changed_at_idx on public.audit_log (changed_at desc);

alter table public.financial_years enable row level security;
alter table public.finance_transactions enable row level security;
alter table public.activities enable row level security;
alter table public.equipment enable row level security;
alter table public.meetings enable row level security;
alter table public.audit_log enable row level security;

revoke all on public.financial_years, public.finance_transactions, public.activities, public.equipment, public.meetings, public.audit_log from anon, authenticated;
grant select, insert, update on public.financial_years to authenticated;
grant select, insert, update, delete on public.finance_transactions, public.activities, public.equipment, public.meetings to authenticated;
grant select on public.audit_log to authenticated;

drop policy if exists "Finance roles read years" on public.financial_years;
create policy "Finance roles read years" on public.financial_years for select to authenticated
using ((select private.current_staff_role()) in ('site_admin','president','treasurer'));
drop policy if exists "President manages years" on public.financial_years;
create policy "President manages years" on public.financial_years for insert to authenticated
with check ((select private.current_staff_role()) in ('site_admin','president'));
drop policy if exists "President updates years" on public.financial_years;
create policy "President updates years" on public.financial_years for update to authenticated
using ((select private.current_staff_role()) in ('site_admin','president'))
with check ((select private.current_staff_role()) in ('site_admin','president'));

drop policy if exists "Finance roles read transactions" on public.finance_transactions;
create policy "Finance roles read transactions" on public.finance_transactions for select to authenticated
using ((select private.current_staff_role()) in ('site_admin','president','treasurer'));
drop policy if exists "Finance roles insert transactions" on public.finance_transactions;
create policy "Finance roles insert transactions" on public.finance_transactions for insert to authenticated
with check ((select private.current_staff_role()) in ('site_admin','president','treasurer'));
drop policy if exists "Finance roles update transactions" on public.finance_transactions;
create policy "Finance roles update transactions" on public.finance_transactions for update to authenticated
using ((select private.current_staff_role()) in ('site_admin','president','treasurer'))
with check ((select private.current_staff_role()) in ('site_admin','president','treasurer'));
drop policy if exists "President deletes transactions" on public.finance_transactions;
create policy "President deletes transactions" on public.finance_transactions for delete to authenticated
using ((select private.current_staff_role()) in ('site_admin','president'));

drop policy if exists "Staff read activities" on public.activities;
create policy "Staff read activities" on public.activities for select to authenticated
using ((select private.current_staff_role()) in ('site_admin','president','secretary_general','deputy_president','deputy_secretary_general','deputy_treasurer','treasurer','technical_director'));
drop policy if exists "Activity leads insert" on public.activities;
create policy "Activity leads insert" on public.activities for insert to authenticated
with check ((select private.current_staff_role()) in ('site_admin','president','technical_director'));
drop policy if exists "Activity leads update" on public.activities;
create policy "Activity leads update" on public.activities for update to authenticated
using ((select private.current_staff_role()) in ('site_admin','president','technical_director'))
with check ((select private.current_staff_role()) in ('site_admin','president','technical_director'));
drop policy if exists "President deletes activities" on public.activities;
create policy "President deletes activities" on public.activities for delete to authenticated
using ((select private.current_staff_role()) in ('site_admin','president'));

drop policy if exists "Staff read equipment" on public.equipment;
create policy "Staff read equipment" on public.equipment for select to authenticated
using ((select private.current_staff_role()) in ('site_admin','president','secretary_general','technical_director'));
drop policy if exists "Technical roles insert equipment" on public.equipment;
create policy "Technical roles insert equipment" on public.equipment for insert to authenticated
with check ((select private.current_staff_role()) in ('site_admin','president','technical_director'));
drop policy if exists "Technical roles update equipment" on public.equipment;
create policy "Technical roles update equipment" on public.equipment for update to authenticated
using ((select private.current_staff_role()) in ('site_admin','president','technical_director'))
with check ((select private.current_staff_role()) in ('site_admin','president','technical_director'));
drop policy if exists "President deletes equipment" on public.equipment;
create policy "President deletes equipment" on public.equipment for delete to authenticated
using ((select private.current_staff_role()) in ('site_admin','president'));

drop policy if exists "Bureau reads meetings" on public.meetings;
create policy "Bureau reads meetings" on public.meetings for select to authenticated
using ((select private.current_staff_role()) in ('site_admin','president','deputy_president','secretary_general','deputy_secretary_general','treasurer','deputy_treasurer','technical_director'));
drop policy if exists "Secretary and president insert meetings" on public.meetings;
create policy "Secretary and president insert meetings" on public.meetings for insert to authenticated
with check ((select private.current_staff_role()) in ('site_admin','president','secretary_general'));
drop policy if exists "Secretary and president update meetings" on public.meetings;
create policy "Secretary and president update meetings" on public.meetings for update to authenticated
using ((select private.current_staff_role()) in ('site_admin','president','secretary_general'))
with check (
  (select private.current_staff_role()) in ('site_admin','president')
  or (status = 'draft' and (select private.current_staff_role()) = 'secretary_general')
);
drop policy if exists "President deletes meetings" on public.meetings;
create policy "President deletes meetings" on public.meetings for delete to authenticated
using ((select private.current_staff_role()) in ('site_admin','president'));

drop policy if exists "President and admin read audit log" on public.audit_log;
create policy "President and admin read audit log" on public.audit_log for select to authenticated
using ((select private.current_staff_role()) in ('site_admin','president'));

create or replace function private.prevent_closed_finance_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_year integer;
  v_closed boolean;
begin
  v_year := case when TG_OP = 'DELETE' then OLD.fiscal_year else NEW.fiscal_year end;
  select fy.is_closed into v_closed from public.financial_years fy where fy.fiscal_year = v_year;
  if coalesce(v_closed, false) then
    raise exception 'السنة المالية مغلقة ولا يمكن تعديل أو حذف عملياتها';
  end if;
  if TG_OP = 'DELETE' then return OLD; end if;
  return NEW;
end;
$$;
revoke all on function private.prevent_closed_finance_mutation() from public, anon, authenticated;
drop trigger if exists prevent_closed_finance_mutation on public.finance_transactions;
create trigger prevent_closed_finance_mutation before insert or update or delete on public.finance_transactions
for each row execute function private.prevent_closed_finance_mutation();

create or replace function private.write_management_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb;
  v_id text;
begin
  if TG_OP = 'DELETE' then v_row := to_jsonb(OLD); else v_row := to_jsonb(NEW); end if;
  v_id := coalesce(v_row ->> 'id', v_row ->> 'fiscal_year', 'unknown');
  insert into public.audit_log(table_name, record_id, action, actor_id, details)
  values (TG_TABLE_NAME, v_id, TG_OP, auth.uid(),
    jsonb_build_object('record', v_row - 'entered_by' - 'approved_by' - 'closed_by'));
  if TG_OP = 'DELETE' then return OLD; end if;
  return NEW;
end;
$$;
revoke all on function private.write_management_audit() from public, anon, authenticated;
drop trigger if exists audit_finance_transactions on public.finance_transactions;
create trigger audit_finance_transactions after insert or update or delete on public.finance_transactions for each row execute function private.write_management_audit();
drop trigger if exists audit_activities on public.activities;
create trigger audit_activities after insert or update or delete on public.activities for each row execute function private.write_management_audit();
drop trigger if exists audit_equipment on public.equipment;
create trigger audit_equipment after insert or update or delete on public.equipment for each row execute function private.write_management_audit();
drop trigger if exists audit_meetings on public.meetings;
create trigger audit_meetings after insert or update or delete on public.meetings for each row execute function private.write_management_audit();
drop trigger if exists audit_financial_years on public.financial_years;
create trigger audit_financial_years after insert or update on public.financial_years for each row execute function private.write_management_audit();

-- Historical facts provided by the association: 1,000 DZD deposited and 595 DZD bank fees.
-- Dates are left null because the exact transaction dates were not supplied.
insert into public.financial_years (fiscal_year, opening_balance, is_closed)
values (2025, 0, false)
on conflict (fiscal_year) do nothing;

insert into public.finance_transactions
  (fiscal_year, transaction_date, transaction_type, category, description, amount, payment_method, source_key)
values
  (2025, null, 'income', 'مساهمة/إيداع بنكي', 'إيداع موثق في تقرير السنة المالية 2025؛ التاريخ الدقيق غير متوفر', 1000.00, 'bank', 'historical-2025-bank-deposit'),
  (2025, null, 'expense', 'رسوم بنكية', 'رسوم بنكية موثقة في تقرير السنة المالية 2025؛ التاريخ الدقيق غير متوفر', 595.00, 'bank', 'historical-2025-bank-fees')
on conflict (source_key) do nothing;

update public.financial_years
set closing_balance = 405.00, is_closed = true, closed_at = coalesce(closed_at, now())
where fiscal_year = 2025 and not is_closed;

insert into public.financial_years (fiscal_year, opening_balance, is_closed)
values (2026, 405.00, false)
on conflict (fiscal_year) do nothing;

comment on table public.finance_transactions is 'Association financial ledger. No membership fees or packages are predefined.';
comment on table public.activities is 'Association activities and planned/actual budgets; activity expenses should also be recorded in the financial ledger when actually incurred.';
comment on table public.equipment is 'Inventory. Only enter equipment after physical verification; no unverified inventory is preloaded.';
comment on table public.meetings is 'Meeting minutes and decisions. Final approval is controlled by president/site admin.';
comment on table public.audit_log is 'Management change audit trail, readable only by president and site admin.';
