-- Restrict the Youth and Sports inspector account to inspection/monitoring records only.
-- The inspector must not read any other association register.
-- Align official-register read permissions with the association's approved role matrix.
create or replace function private.can_view_association_register(p_key text)
returns boolean language sql stable security definer
set search_path = pg_catalog, public, private, auth
as $$
 select case p_key
  when 'deliberation' then private.current_staff_role() in ('president','deputy_president','secretary_general','deputy_secretary_general')
  when 'accounting' then private.current_staff_role() in ('president','treasurer','deputy_treasurer','technical_director')
  when 'equipment' then private.current_staff_role() in ('president','treasurer','deputy_treasurer','technical_director')
  when 'outgoing_mail' then private.current_staff_role() in ('president','deputy_president','secretary_general','deputy_secretary_general')
  when 'incoming_mail' then private.current_staff_role() in ('president','deputy_president','secretary_general','deputy_secretary_general')
  when 'activities' then private.current_staff_role() in ('president','deputy_president','secretary_general','deputy_secretary_general','treasurer','deputy_treasurer','technical_director')
  when 'tasks' then private.current_staff_role() = 'president'
  when 'inspection' then private.current_staff_role() in ('president','deputy_president','secretary_general','deputy_secretary_general','treasurer','deputy_treasurer','technical_director','inspection_inspector')
  else false end
$$;
revoke all on function private.can_view_association_register(text) from public, anon;
grant execute on function private.can_view_association_register(text) to authenticated;
