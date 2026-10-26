-- Financial records are restricted to the president and treasurer.
-- Members may read only their own dues, verified payments and in-app notices.
drop policy if exists "Finance roles read transactions" on public.finance_transactions;
create policy "President and treasurer read transactions" on public.finance_transactions
for select to authenticated using ((select private.current_staff_role()) in ('president','treasurer'));

drop policy if exists "Finance roles insert transactions" on public.finance_transactions;
create policy "President and treasurer insert transactions" on public.finance_transactions
for insert to authenticated with check ((select private.current_staff_role()) in ('president','treasurer'));

drop policy if exists "Finance roles update transactions" on public.finance_transactions;
create policy "President and treasurer update transactions" on public.finance_transactions
for update to authenticated using ((select private.current_staff_role()) in ('president','treasurer'))
with check ((select private.current_staff_role()) in ('president','treasurer'));

drop policy if exists "President deletes transactions" on public.finance_transactions;
create policy "President deletes transactions" on public.finance_transactions
for delete to authenticated using ((select private.current_staff_role()) = 'president');

drop policy if exists "Finance roles read years" on public.financial_years;
create policy "President and treasurer read years" on public.financial_years
for select to authenticated using ((select private.current_staff_role()) in ('president','treasurer'));

drop policy if exists "President manages years" on public.financial_years;
create policy "President manages years" on public.financial_years
for insert to authenticated with check ((select private.current_staff_role()) = 'president');

drop policy if exists "President updates years" on public.financial_years;
create policy "President updates years" on public.financial_years
for update to authenticated using ((select private.current_staff_role()) = 'president')
with check ((select private.current_staff_role()) = 'president');

drop policy if exists membership_fee_rules_staff_read on public.membership_fee_rules;
create policy membership_fee_rules_finance_read on public.membership_fee_rules
for select to authenticated using (
 exists(select 1 from public.staff_profiles sp where sp.user_id=(select auth.uid()) and sp.is_active=true
 and sp.role in ('president','treasurer'))
);

drop policy if exists membership_dues_obligations_staff_read on public.membership_dues_obligations;
create policy membership_dues_obligations_finance_read on public.membership_dues_obligations
for select to authenticated using (
 exists(select 1 from public.staff_profiles sp where sp.user_id=(select auth.uid()) and sp.is_active=true
 and sp.role in ('president','treasurer'))
);

drop policy if exists membership_dues_payments_staff_read on public.membership_dues_payments;
create policy membership_dues_payments_finance_read on public.membership_dues_payments
for select to authenticated using (
 exists(select 1 from public.staff_profiles sp where sp.user_id=(select auth.uid()) and sp.is_active=true
 and sp.role in ('president','treasurer'))
);
create policy membership_dues_payments_read_own on public.membership_dues_payments
for select to authenticated using (
 exists(select 1 from public.membership_dues_obligations o
 join public.association_members am on am.id=o.association_member_id
 where o.id=membership_dues_payments.obligation_id and am.user_id=(select auth.uid()))
);

drop policy if exists member_notifications_staff_read on public.member_notifications;
create policy member_notifications_finance_read on public.member_notifications
for select to authenticated using (
 exists(select 1 from public.staff_profiles sp where sp.user_id=(select auth.uid()) and sp.is_active=true
 and sp.role in ('president','treasurer'))
);

drop policy if exists membership_status_events_staff_read on public.membership_status_events;
create policy membership_status_events_finance_read on public.membership_status_events
for select to authenticated using (
 exists(select 1 from public.staff_profiles sp where sp.user_id=(select auth.uid()) and sp.is_active=true
 and sp.role in ('president','treasurer'))
);
