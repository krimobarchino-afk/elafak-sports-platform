-- Tighten management visibility to the association's role model.
drop policy if exists "Finance roles read years" on public.financial_years;
create policy "Finance roles read years" on public.financial_years for select to authenticated
using ((select private.current_staff_role()) in ('site_admin','president','deputy_president','treasurer','deputy_treasurer'));

drop policy if exists "Finance roles read transactions" on public.finance_transactions;
create policy "Finance roles read transactions" on public.finance_transactions for select to authenticated
using ((select private.current_staff_role()) in ('site_admin','president','deputy_president','treasurer','deputy_treasurer'));

drop policy if exists "Staff read activities" on public.activities;
create policy "Staff read activities" on public.activities for select to authenticated
using ((select private.current_staff_role()) in ('site_admin','president','deputy_president','secretary_general','deputy_secretary_general','technical_director'));

drop policy if exists "Staff read equipment" on public.equipment;
create policy "Staff read equipment" on public.equipment for select to authenticated
using ((select private.current_staff_role()) in ('site_admin','president','deputy_president','secretary_general','deputy_secretary_general','technical_director'));

drop policy if exists "Bureau reads meetings" on public.meetings;
create policy "Bureau reads meetings" on public.meetings for select to authenticated
using ((select private.current_staff_role()) in ('site_admin','president','deputy_president','secretary_general','deputy_secretary_general','technical_director'));

create index if not exists finance_transactions_entered_by_idx on public.finance_transactions(entered_by);
create index if not exists financial_years_closed_by_idx on public.financial_years(closed_by);
create index if not exists activities_entered_by_idx on public.activities(entered_by);
create index if not exists equipment_entered_by_idx on public.equipment(entered_by);
create index if not exists meetings_approved_by_idx on public.meetings(approved_by);
create index if not exists meetings_entered_by_idx on public.meetings(entered_by);
