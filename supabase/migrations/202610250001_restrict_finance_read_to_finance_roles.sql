-- Restrict financial read access to finance roles.
-- The deputy treasurer is view-only; write policies remain limited to president/treasurer/admin.

drop policy if exists "Finance roles read transactions" on public.finance_transactions;
create policy "Finance roles read transactions"
on public.finance_transactions
for select
to authenticated
using (
  (select private.current_staff_role()) = any (
    array['site_admin'::text, 'president'::text, 'treasurer'::text, 'deputy_treasurer'::text]
  )
);

drop policy if exists "Finance roles read years" on public.financial_years;
create policy "Finance roles read years"
on public.financial_years
for select
to authenticated
using (
  (select private.current_staff_role()) = any (
    array['site_admin'::text, 'president'::text, 'treasurer'::text, 'deputy_treasurer'::text]
  )
);
