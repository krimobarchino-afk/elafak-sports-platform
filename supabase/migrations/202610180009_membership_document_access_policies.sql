-- Read/write access for the membership-document workflow. No rows are seeded.
drop policy if exists "Authorized staff can view document requirements" on public.join_request_document_requirements;
create policy "Authorized staff can view document requirements"
on public.join_request_document_requirements
for select to authenticated
using ((select private.current_staff_role()) = any (array['site_admin','president','secretary_general']));

drop policy if exists "Site admin can add document requirements with bureau order" on public.join_request_document_requirements;
create policy "Site admin can add document requirements with bureau order"
on public.join_request_document_requirements
for insert to authenticated
with check (
  (select private.current_staff_role()) = 'site_admin'
  and bureau_order_reference is not null
  and length(btrim(bureau_order_reference)) >= 3
  and bureau_order_date is not null
  and (updated_by is null or updated_by = (select auth.uid()))
);

drop policy if exists "Site admin can edit document requirements with bureau order" on public.join_request_document_requirements;
create policy "Site admin can edit document requirements with bureau order"
on public.join_request_document_requirements
for update to authenticated
using ((select private.current_staff_role()) = 'site_admin')
with check (
  (select private.current_staff_role()) = 'site_admin'
  and bureau_order_reference is not null
  and length(btrim(bureau_order_reference)) >= 3
  and bureau_order_date is not null
  and (updated_by is null or updated_by = (select auth.uid()))
);

drop policy if exists "Authorized staff can view submitted join files" on public.join_request_file_submissions;
create policy "Authorized staff can view submitted join files"
on public.join_request_file_submissions
for select to authenticated
using ((select private.current_staff_role()) = any (array['president','secretary_general','treasurer']));

drop policy if exists "deny_all_external_access" on public.join_request_lookup_rate_limits;
create policy "deny_all_external_access"
on public.join_request_lookup_rate_limits
for all to anon, authenticated
using (false)
with check (false);
