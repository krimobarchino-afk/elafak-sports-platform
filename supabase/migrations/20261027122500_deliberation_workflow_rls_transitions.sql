-- Enforce deliberation workflow with RLS and a non-definer trigger.
-- Replace public SECURITY DEFINER RPCs with row-policy-checked transitions.
drop function if exists public.submit_deliberation_output(uuid);
drop function if exists public.review_deliberation_output(uuid,text,text);

drop policy if exists "Authors edit unapproved deliberation drafts" on public.deliberation_outputs;
drop policy if exists "Authors edit deliberation drafts" on public.deliberation_outputs;
create policy "Authors edit deliberation drafts"
  on public.deliberation_outputs for update to authenticated
  using (
    (select private.current_staff_role()) in ('president','secretary_general')
    and created_by = (select auth.uid())
    and status in ('draft','changes_requested')
  )
  with check (
    (select private.current_staff_role()) in ('president','secretary_general')
    and created_by = (select auth.uid())
    and status in ('draft','changes_requested')
    and register_year is null
    and register_number is null
  );

drop policy if exists "Authors submit deliberation drafts" on public.deliberation_outputs;
create policy "Authors submit deliberation drafts"
  on public.deliberation_outputs for update to authenticated
  using (
    (select private.current_staff_role()) in ('president','secretary_general')
    and created_by = (select auth.uid())
    and status in ('draft','changes_requested')
  )
  with check (
    (select private.current_staff_role()) in ('president','secretary_general')
    and created_by = (select auth.uid())
    and status = 'pending_review'
    and register_year is null
    and register_number is null
  );

drop policy if exists "President reviews deliberation outputs" on public.deliberation_outputs;
create policy "President reviews deliberation outputs"
  on public.deliberation_outputs for update to authenticated
  using (
    (select private.current_staff_role()) = 'president'
    and status = 'pending_review'
  )
  with check (
    (select private.current_staff_role()) = 'president'
    and (
      (status = 'approved' and register_year is not null and register_number is not null)
      or
      (status = 'changes_requested' and register_year is null and register_number is null)
    )
  );

create or replace function private.handle_deliberation_output_status()
returns trigger
language plpgsql
set search_path = pg_catalog, public, private
as $$
declare
  v_year integer;
  v_next bigint;
  v_role text;
begin
  if tg_op <> 'UPDATE' or new.status is not distinct from old.status then
    return new;
  end if;

  v_role := private.current_staff_role();

  if old.status in ('draft','changes_requested') and new.status = 'pending_review' then
    if v_role not in ('president','secretary_general') or new.created_by <> (select auth.uid()) then
      raise exception 'لا يمكنك إرسال هذه المسودة للمراجعة';
    end if;
    if not exists (
      select 1 from public.meetings m
      where m.id = new.meeting_id and coalesce(m.is_test,false) = false
    ) then
      raise exception 'يجب ربط المخرج باجتماع رسمي غير تجريبي';
    end if;
    new.submitted_at := now();
    new.review_note := null;
    new.register_year := null;
    new.register_number := null;
    new.updated_by := (select auth.uid());
    new.updated_at := now();
  elsif old.status = 'pending_review' and new.status in ('approved','changes_requested') then
    if v_role <> 'president' then
      raise exception 'مراجعة مخرجات المداولة من صلاحية الرئيس فقط';
    end if;
    new.reviewed_by := (select auth.uid());
    new.reviewed_at := now();
    new.updated_by := (select auth.uid());
    new.updated_at := now();

    if new.status = 'approved' then
      v_year := extract(year from now())::integer;
      perform pg_advisory_xact_lock(hashtext('deliberation-register-' || v_year::text)::bigint);
      select coalesce(max(register_number), 0) + 1
        into v_next
        from public.deliberation_outputs
        where register_year = v_year;
      new.register_year := v_year;
      new.register_number := v_next;
      new.review_note := null;
    else
      if char_length(trim(coalesce(new.review_note,''))) < 3 then
        raise exception 'اكتب ملاحظة واضحة بالتعديل المطلوب';
      end if;
      new.register_year := null;
      new.register_number := null;
      new.review_note := trim(new.review_note);
    end if;
  elsif old.status = 'approved' then
    raise exception 'المخرج المعتمد محفوظ ولا يجوز تعديله';
  else
    raise exception 'انتقال حالة المخرج غير مسموح';
  end if;

  return new;
end;
$$;

revoke all on function private.handle_deliberation_output_status() from public, anon, authenticated;
drop trigger if exists deliberation_output_status_guard on public.deliberation_outputs;
create trigger deliberation_output_status_guard
  before update on public.deliberation_outputs
  for each row execute function private.handle_deliberation_output_status();
