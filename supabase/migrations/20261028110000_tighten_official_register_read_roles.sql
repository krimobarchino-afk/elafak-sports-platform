-- Tighten official register read access to the approved role matrix.
-- Safe additive correction for the development workflow; no data changes.
create or replace function private.can_view_association_register(p_key text)
returns boolean language sql stable security definer
set search_path = pg_catalog, public, private, auth
as $$
 select case p_key
  when 'deliberation' then private.current_staff_role() in ('president','deputy_president','secretary_general','deputy_secretary_general','inspection_inspector')
  when 'accounting' then private.current_staff_role() in ('president','treasurer','deputy_treasurer','technical_director','inspection_inspector')
  when 'equipment' then private.current_staff_role() in ('president','treasurer','deputy_treasurer','technical_director','inspection_inspector')
  when 'outgoing_mail' then private.current_staff_role() in ('president','deputy_president','secretary_general','deputy_secretary_general','inspection_inspector')
  when 'incoming_mail' then private.current_staff_role() in ('president','deputy_president','secretary_general','deputy_secretary_general','inspection_inspector')
  when 'activities' then private.current_staff_role() in ('president','deputy_president','secretary_general','deputy_secretary_general','treasurer','deputy_treasurer','technical_director','inspection_inspector')
  when 'tasks' then private.current_staff_role() = 'president'
  when 'inspection' then private.current_staff_role() in ('president','deputy_president','secretary_general','deputy_secretary_general','treasurer','deputy_treasurer','technical_director','inspection_inspector')
  else false end
$$;
revoke all on function private.can_view_association_register(text) from public, anon;
grant execute on function private.can_view_association_register(text) to authenticated;
