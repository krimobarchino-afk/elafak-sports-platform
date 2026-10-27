-- Role-based access to membership requests
grant select on public.join_requests to authenticated;
grant update (status, reviewer_note, reviewed_at) on public.join_requests to authenticated;
drop policy if exists "President and secretary can read join requests" on public.join_requests;
create policy "President and secretary can read join requests" on public.join_requests for select to authenticated using ((select private.current_staff_role()) in ('site_admin','president','secretary_general'));
drop policy if exists "President and secretary can update join requests" on public.join_requests;
create policy "President and secretary can update join requests" on public.join_requests for update to authenticated using ((select private.current_staff_role()) in ('site_admin','president','secretary_general')) with check (((select private.current_staff_role()) in ('site_admin','president') and status in ('pending','needs_information','approved','declined')) or ((select private.current_staff_role())='secretary_general' and status in ('pending','needs_information')));
revoke insert,update,delete on public.staff_profiles from anon,authenticated;