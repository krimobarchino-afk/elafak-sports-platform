-- Shared deliberation workspace: secretary general drafts, president comments or approves.
alter table public.deliberation_outputs
  drop constraint if exists deliberation_outputs_status_check;
alter table public.deliberation_outputs
  add constraint deliberation_outputs_status_check
  check (status in ('draft','changes_requested','approved'));

drop policy if exists "Secretary and president create deliberation drafts" on public.deliberation_outputs;
drop policy if exists "Secretary general creates deliberation drafts" on public.deliberation_outputs;
create policy "Secretary general creates deliberation drafts"
  on public.deliberation_outputs for insert to authenticated
  with check (
    (select private.current_staff_role()) = 'secretary_general'
    and created_by = (select auth.uid())
    and status = 'draft'
    and register_year is null and register_number is null
  );

drop policy if exists "Authorized deliberation workflow updates" on public.deliberation_outputs;
drop policy if exists "Shared deliberation workspace updates" on public.deliberation_outputs;
create policy "Shared deliberation workspace updates"
  on public.deliberation_outputs for update to authenticated
  using (
    (
      (select private.current_staff_role()) = 'secretary_general'
      and created_by = (select auth.uid())
      and status in ('draft','changes_requested')
    )
    or
    (
      (select private.current_staff_role()) = 'president'
      and status in ('draft','changes_requested')
    )
  )
  with check (
    (
      (select private.current_staff_role()) = 'secretary_general'
      and created_by = (select auth.uid())
      and status in ('draft','changes_requested')
      and register_year is null and register_number is null
    )
    or
    (
      (select private.current_staff_role()) = 'president'
      and (
        (status in ('draft','changes_requested') and register_year is null and register_number is null)
        or
        (status = 'approved' and register_year is not null and register_number is not null)
      )
    )
  );

create table if not exists public.deliberation_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  output_id uuid references public.deliberation_outputs(id) on delete cascade,
  event_type text not null check (event_type in ('draft_created','draft_updated','president_note','approved')),
  title text not null,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists deliberation_notifications_recipient_created_idx
  on public.deliberation_notifications(recipient_user_id, created_at desc);
alter table public.deliberation_notifications enable row level security;
revoke all on public.deliberation_notifications from anon, authenticated;
grant select, update(read_at) on public.deliberation_notifications to authenticated;
drop policy if exists "Users read their deliberation notifications" on public.deliberation_notifications;
create policy "Users read their deliberation notifications"
  on public.deliberation_notifications for select to authenticated
  using (recipient_user_id = (select auth.uid()));
drop policy if exists "Users mark their deliberation notifications read" on public.deliberation_notifications;
create policy "Users mark their deliberation notifications read"
  on public.deliberation_notifications for update to authenticated
  using (recipient_user_id = (select auth.uid()))
  with check (recipient_user_id = (select auth.uid()));

create or replace function private.handle_deliberation_output_status()
returns trigger
language plpgsql
set search_path = pg_catalog, public, private, auth
as $$
declare
  v_year integer;
  v_next bigint;
  v_role text;
begin
  v_role := private.current_staff_role();

  if tg_op = 'INSERT' then
    if v_role <> 'secretary_general' or new.created_by <> (select auth.uid()) or new.status <> 'draft' then
      raise exception 'إنشاء المسودات من صلاحية الأمين العام فقط';
    end if;
    new.updated_by := (select auth.uid());
    new.updated_at := now();
    return new;
  end if;

  if new.meeting_id is distinct from old.meeting_id
    or new.output_type is distinct from old.output_type
    or new.title is distinct from old.title
    or new.content is distinct from old.content then
    if v_role <> 'secretary_general' or old.created_by <> (select auth.uid()) or old.status not in ('draft','changes_requested') then
      raise exception 'تعديل نص المخرج من صلاحية الأمين العام فقط';
    end if;
  end if;

  if v_role = 'secretary_general' then
    if old.created_by <> (select auth.uid()) or old.status not in ('draft','changes_requested')
      or new.status not in ('draft','changes_requested')
      or new.review_note is distinct from old.review_note
      or new.reviewed_by is distinct from old.reviewed_by
      or new.reviewed_at is distinct from old.reviewed_at
      or new.register_year is not null or new.register_number is not null then
      raise exception 'لا يملك الأمين العام صلاحية اعتماد المخرج أو تغيير ملاحظة الرئيس';
    end if;
  elsif v_role = 'president' then
    if old.status not in ('draft','changes_requested')
      or new.created_by is distinct from old.created_by
      or new.meeting_id is distinct from old.meeting_id
      or new.output_type is distinct from old.output_type
      or new.title is distinct from old.title
      or new.content is distinct from old.content then
      raise exception 'يستطيع الرئيس تدوين ملاحظة أو اعتماد المخرج، ولا ينشئ المسودات ولا يحرر نصها';
    end if;

    if new.status = 'approved' then
      v_year := extract(year from now())::integer;
      perform pg_advisory_xact_lock(hashtext('deliberation-register-' || v_year::text)::bigint);
      select coalesce(max(register_number),0)+1 into v_next
        from public.deliberation_outputs where register_year=v_year;
      new.register_year := v_year;
      new.register_number := v_next;
      new.reviewed_by := (select auth.uid());
      new.reviewed_at := now();
      new.review_note := null;
    elsif new.review_note is distinct from old.review_note and length(trim(coalesce(new.review_note,''))) >= 3 then
      new.status := 'changes_requested';
      new.register_year := null;
      new.register_number := null;
      new.reviewed_by := (select auth.uid());
      new.reviewed_at := now();
    elsif new.status is distinct from old.status then
      raise exception 'يسجل الرئيس ملاحظة تعديل أو يعتمد المخرج';
    end if;
  else
    raise exception 'لا تملك صلاحية العمل على مخرجات المداولة';
  end if;

  if new.status = 'approved' and old.status <> 'approved' then
    if v_role <> 'president' then raise exception 'اعتماد المخرجات من صلاحية الرئيس فقط'; end if;
  else
    new.register_year := null;
    new.register_number := null;
  end if;
  new.updated_by := (select auth.uid());
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function private.handle_deliberation_output_status() from public, anon, authenticated;
drop trigger if exists deliberation_output_status_guard on public.deliberation_outputs;
create trigger deliberation_output_status_guard
  before insert or update on public.deliberation_outputs
  for each row execute function private.handle_deliberation_output_status();

create or replace function private.notify_deliberation_activity()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private, auth
as $$
declare
  v_role text := private.current_staff_role();
  v_recipient_role text;
  v_event text;
  v_title text;
  v_body text;
begin
  if tg_op = 'INSERT' then
    v_recipient_role := 'president';
    v_event := 'draft_created';
    v_title := 'مسودة جديدة للمداولة';
    v_body := 'أنشأ الأمين العام مسودة: ' || new.title;
  elsif new.status = 'approved' and old.status is distinct from 'approved' then
    v_recipient_role := 'secretary_general';
    v_event := 'approved';
    v_title := 'تم اعتماد مخرج المداولة';
    v_body := 'اعتمد الرئيس "' || new.title || '" وقُيد في سجل المداولة.';
  elsif new.review_note is distinct from old.review_note and length(trim(coalesce(new.review_note,''))) >= 3 then
    v_recipient_role := 'secretary_general';
    v_event := 'president_note';
    v_title := 'ملاحظة جديدة من الرئيس';
    v_body := 'دوّن الرئيس ملاحظة على "' || new.title || '": ' || new.review_note;
  elsif v_role = 'secretary_general' and (
    new.content is distinct from old.content or new.title is distinct from old.title or new.meeting_id is distinct from old.meeting_id
  ) then
    v_recipient_role := 'president';
    v_event := 'draft_updated';
    v_title := 'تحديث مسودة المداولة';
    v_body := 'حدّث الأمين العام المسودة: ' || new.title;
  else
    return new;
  end if;

  insert into public.deliberation_notifications(recipient_user_id,output_id,event_type,title,body)
  select sp.user_id,new.id,v_event,v_title,v_body
  from public.staff_profiles sp
  where sp.role = v_recipient_role and sp.is_active = true and sp.is_frozen = false
    and sp.user_id <> coalesce(auth.uid(),'00000000-0000-0000-0000-000000000000'::uuid);
  return new;
end;
$$;
revoke all on function private.notify_deliberation_activity() from public, anon, authenticated;
drop trigger if exists deliberation_output_activity_notification on public.deliberation_outputs;
create trigger deliberation_output_activity_notification
  after insert or update on public.deliberation_outputs
  for each row execute function private.notify_deliberation_activity();

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='deliberation_outputs') then
      alter publication supabase_realtime add table public.deliberation_outputs;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='deliberation_notifications') then
      alter publication supabase_realtime add table public.deliberation_notifications;
    end if;
  end if;
end $$;
