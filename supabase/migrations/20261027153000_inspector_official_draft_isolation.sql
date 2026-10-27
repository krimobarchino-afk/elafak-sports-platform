-- Defense in depth: the inspector can read approved official registers only,
-- not the internal draft queue that holds unapproved payloads and review notes.
-- This migration runs after official_record_drafts is created.
drop policy if exists "Inspector excluded from official draft workflow"
  on public.official_record_drafts;

create policy "Inspector excluded from official draft workflow"
  on public.official_record_drafts
  as restrictive
  for all
  to authenticated
  using ((select private.current_staff_role()) is distinct from 'inspection_inspector')
  with check ((select private.current_staff_role()) is distinct from 'inspection_inspector');
