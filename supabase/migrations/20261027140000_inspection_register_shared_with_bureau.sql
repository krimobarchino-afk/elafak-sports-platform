-- Share inspection register and reports with the full executive bureau.
-- The inspector can create and submit inspection reports, but does not participate
-- in the association's administrative draft/approval workflow.
drop policy if exists "Inspector and association leads read inspection reports" on public.inspection_reports;
create policy "Inspection reports readable by inspector and executive bureau"
  on public.inspection_reports
  for select
  to authenticated
  using (
    (select private.current_staff_role()) in (
      'inspection_inspector',
      'president',
      'deputy_president',
      'secretary_general',
      'deputy_secretary_general',
      'treasurer',
      'deputy_treasurer'
    )
  );

drop policy if exists "Inspection parties read followups" on public.inspection_followups;
create policy "Inspection followups readable by inspector and executive bureau"
  on public.inspection_followups
  for select
  to authenticated
  using (
    (select private.current_staff_role()) in (
      'inspection_inspector',
      'president',
      'deputy_president',
      'secretary_general',
      'deputy_secretary_general',
      'treasurer',
      'deputy_treasurer'
    )
  );
