-- Fix official numbering so presidential approval can insert draft-backed register entries.
-- Direct entries remain limited to president tasks and inspector reports.
create or replace function private.number_direct_association_register_entry()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private, auth
as $$
declare
  v_year integer;
  v_number bigint;
  v_role text;
begin
  v_role := private.current_staff_role();

  -- Entries created by the president's draft-approval trigger retain the original
  -- draft creator and carry the authenticated president in approved_by.
  if new.approved_by is not null then
    if v_role <> 'president'
       or new.approved_by is distinct from (select auth.uid())
       or new.register_key not in (
         'deliberation','accounting','equipment',
         'outgoing_mail','incoming_mail','activities'
       )
       or new.is_test then
      raise exception 'إدراج القيود المعتمدة مسموح للرئيس فقط ومن خلال مسار الاعتماد';
    end if;
  else
    -- Direct entries: tasks by the president, inspection reports by the inspector.
    if new.created_by is distinct from (select auth.uid()) or new.is_test then
      raise exception 'مصدر القيد المباشر غير صالح';
    end if;
    if not (
      (new.register_key = 'tasks' and v_role = 'president')
      or (new.register_key = 'inspection' and v_role = 'inspection_inspector')
    ) then
      raise exception 'القيد المباشر مسموح لسجل المهام للرئيس ولسجل التفتيش للمفتش فقط';
    end if;
  end if;

  v_year := extract(year from now())::integer;
  perform pg_advisory_xact_lock(
    hashtext('association-register-' || new.register_key || '-' || v_year::text)::bigint
  );
  select coalesce(max(register_number), 0) + 1
    into v_number
    from public.association_register_entries
   where register_key = new.register_key
     and register_year = v_year;

  new.register_year := v_year;
  new.register_number := v_number;
  new.approved_at := now();
  return new;
end
$$;

revoke all on function private.number_direct_association_register_entry()
  from public, anon, authenticated;
