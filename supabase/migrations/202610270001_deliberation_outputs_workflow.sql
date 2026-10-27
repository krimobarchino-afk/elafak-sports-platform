-- Deliberation outputs: secretary drafts, president review, approved register
create table if not exists public.deliberation_outputs (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete restrict,
  output_type text not null check (output_type in ('report','minutes','decision')),
  title text not null check (char_length(trim(title)) between 3 and 240),
  content text not null default '',
  status text not null default 'draft'
    check (status in ('draft','pending_review','changes_requested','approved')),
  register_year integer,
  register_number bigint,
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid references auth.users(id) on delete set null,
  submitted_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint deliberation_register_number_state_check check (
    (status = 'approved' and register_year is not null and register_number is not null)
    or
    (status <> 'approved' and register_year is null and register_number is null)
  )
);

create unique index if not exists deliberation_outputs_register_no_uidx
  on public.deliberation_outputs(register_year, register_number)
  where register_year is not null and register_number is not null;
create index if not exists deliberation_outputs_meeting_idx
  on public.deliberation_outputs(meeting_id, created_at desc);
create index if not exists deliberation_outputs_status_idx
  on public.deliberation_outputs(status, created_at desc);

alter table public.deliberation_outputs enable row level security;
grant select, insert, update on public.deliberation_outputs to authenticated;

drop policy if exists "Bureau reads deliberation outputs" on public.deliberation_outputs;
create policy "Bureau reads deliberation outputs"
  on public.deliberation_outputs for select to authenticated
  using ((select private.current_staff_role()) in (
    'site_admin','president','secretary_general','deputy_president',
    'deputy_secretary_general','technical_director'
  ));

drop policy if exists "Secretary and president create deliberation drafts" on public.deliberation_outputs;
create policy "Secretary and president create deliberation drafts"
  on public.deliberation_outputs for insert to authenticated
  with check (
    (select private.current_staff_role()) in ('president','secretary_general')
    and created_by = (select auth.uid())
    and status = 'draft'
    and register_year is null
    and register_number is null
  );

drop policy if exists "Authors edit unapproved deliberation drafts" on public.deliberation_outputs;
create policy "Authors edit unapproved deliberation drafts"
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

create or replace function public.submit_deliberation_output(p_output_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_role text;
  v_owner uuid;
  v_status text;
begin
  if (select auth.uid()) is null then
    raise exception 'يجب تسجيل الدخول أولًا';
  end if;

  v_role := private.current_staff_role();
  if v_role not in ('president','secretary_general') then
    raise exception 'هذه العملية متاحة للرئيس والأمين العام فقط';
  end if;

  select created_by, status into v_owner, v_status
  from public.deliberation_outputs
  where id = p_output_id
  for update;

  if not found then raise exception 'المسودة غير موجودة'; end if;
  if v_role = 'secretary_general' and v_owner <> (select auth.uid()) then
    raise exception 'لا يمكنك إرسال مسودة أنشأها مستخدم آخر';
  end if;
  if v_status not in ('draft','changes_requested') then
    raise exception 'لا يمكن إرسال هذه الحالة للمراجعة';
  end if;

  update public.deliberation_outputs
  set status = 'pending_review',
      submitted_at = now(),
      review_note = null,
      updated_by = (select auth.uid()),
      updated_at = now()
  where id = p_output_id;
end;
$$;

create or replace function public.review_deliberation_output(
  p_output_id uuid,
  p_action text,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_role text;
  v_status text;
  v_year integer;
  v_next bigint;
begin
  if (select auth.uid()) is null then
    raise exception 'يجب تسجيل الدخول أولًا';
  end if;

  v_role := private.current_staff_role();
  if v_role <> 'president' then
    raise exception 'اعتماد المخرجات وطلب تعديلها من صلاحية الرئيس فقط';
  end if;
  if p_action not in ('approve','request_changes') then
    raise exception 'إجراء مراجعة غير صالح';
  end if;
  if p_action = 'request_changes' and char_length(trim(coalesce(p_note,''))) < 3 then
    raise exception 'اكتب ملاحظة واضحة بالتعديل المطلوب';
  end if;

  select status into v_status
  from public.deliberation_outputs
  where id = p_output_id
  for update;

  if not found then raise exception 'المخرج غير موجود'; end if;
  if v_status <> 'pending_review' then
    raise exception 'لا يمكن مراجعة هذا المخرج إلا بعد إرساله للرئيس';
  end if;

  if p_action = 'approve' then
    v_year := extract(year from now())::integer;
    perform pg_advisory_xact_lock(hashtext('deliberation-register-' || v_year::text)::bigint);
    select coalesce(max(register_number), 0) + 1
      into v_next
      from public.deliberation_outputs
      where register_year = v_year;

    update public.deliberation_outputs
    set status = 'approved',
        register_year = v_year,
        register_number = v_next,
        reviewed_by = (select auth.uid()),
        reviewed_at = now(),
        review_note = null,
        updated_by = (select auth.uid()),
        updated_at = now()
    where id = p_output_id;
  else
    update public.deliberation_outputs
    set status = 'changes_requested',
        register_year = null,
        register_number = null,
        reviewed_by = (select auth.uid()),
        reviewed_at = now(),
        review_note = trim(p_note),
        updated_by = (select auth.uid()),
        updated_at = now()
    where id = p_output_id;
  end if;
end;
$$;

revoke all on function public.submit_deliberation_output(uuid) from public, anon;
revoke all on function public.review_deliberation_output(uuid,text,text) from public, anon;
grant execute on function public.submit_deliberation_output(uuid) to authenticated;
grant execute on function public.review_deliberation_output(uuid,text,text) to authenticated;
