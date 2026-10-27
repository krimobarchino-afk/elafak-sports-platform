-- Official record drafts for finance transactions, equipment and activities.
-- Responsible staff prepare the payload; only the president can approve it.
-- Approved payloads are applied by a restricted trigger and retained as an audit record.
create table if not exists public.official_record_drafts (
  id uuid primary key default gen_random_uuid(),
  record_type text not null check (record_type in ('finance_transaction','equipment','activity')),
  operation text not null check (operation in ('create','update')),
  target_record_id uuid,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  status text not null default 'draft' check (status in ('draft','changes_requested','approved')),
  review_note text,
  register_year integer,
  register_number bigint,
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid references auth.users(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint official_record_drafts_operation_target_check
    check ((operation = 'create' and target_record_id is null) or (operation = 'update' and target_record_id is not null)),
  constraint official_record_drafts_register_check
    check (
      (status = 'approved' and register_year is not null and register_number is not null and target_record_id is not null)
      or
      (status <> 'approved' and register_year is null and register_number is null)
    )
);
create unique index if not exists official_record_drafts_register_uidx
  on public.official_record_drafts(register_year, register_number)
  where register_year is not null and register_number is not null;
create index if not exists official_record_drafts_type_status_idx
  on public.official_record_drafts(record_type, status, created_at desc);
create index if not exists official_record_drafts_creator_idx
  on public.official_record_drafts(created_by, created_at desc);

alter table public.official_record_drafts enable row level security;
grant select, insert, update on public.official_record_drafts to authenticated;
revoke delete on public.official_record_drafts from anon, authenticated;

drop policy if exists "Responsible staff and president read official drafts" on public.official_record_drafts;
create policy "Responsible staff and president read official drafts"
  on public.official_record_drafts for select to authenticated
  using (
    (select private.current_staff_role()) = 'president'
    or (
      created_by = (select auth.uid())
      and (
        ((select private.current_staff_role()) = 'treasurer' and record_type in ('finance_transaction','equipment'))
        or ((select private.current_staff_role()) = 'technical_director' and record_type = 'activity')
      )
    )
  );

drop policy if exists "Responsible staff create official drafts" on public.official_record_drafts;
create policy "Responsible staff create official drafts"
  on public.official_record_drafts for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and status = 'draft'
    and register_year is null and register_number is null
    and reviewed_by is null and reviewed_at is null and review_note is null
    and (
      ((select private.current_staff_role()) = 'treasurer' and record_type in ('finance_transaction','equipment'))
      or ((select private.current_staff_role()) = 'technical_director' and record_type = 'activity')
    )
    and ((operation = 'create' and target_record_id is null) or (operation = 'update' and target_record_id is not null))
  );

drop policy if exists "Responsible staff update own drafts" on public.official_record_drafts;
create policy "Responsible staff update own drafts"
  on public.official_record_drafts for update to authenticated
  using (
    created_by = (select auth.uid())
    and status in ('draft','changes_requested')
    and (
      ((select private.current_staff_role()) = 'treasurer' and record_type in ('finance_transaction','equipment'))
      or ((select private.current_staff_role()) = 'technical_director' and record_type = 'activity')
    )
  )
  with check (
    created_by = (select auth.uid())
    and status in ('draft','changes_requested')
    and register_year is null and register_number is null
    and (
      ((select private.current_staff_role()) = 'treasurer' and record_type in ('finance_transaction','equipment'))
      or ((select private.current_staff_role()) = 'technical_director' and record_type = 'activity')
    )
  );

drop policy if exists "President reviews official drafts" on public.official_record_drafts;
create policy "President reviews official drafts"
  on public.official_record_drafts for update to authenticated
  using ((select private.current_staff_role()) = 'president' and status in ('draft','changes_requested'))
  with check (
    (select private.current_staff_role()) = 'president'
    and (
      (status = 'approved' and register_year is not null and register_number is not null and target_record_id is not null)
      or (status = 'changes_requested' and register_year is null and register_number is null)
    )
  );

create or replace function private.apply_official_record_draft()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private, auth
as $$
declare
  v_role text;
  v_expected_role text;
  v_year integer;
  v_next bigint;
  v_target uuid;
  v_count integer;
  v_fee_setting jsonb;
  v_fee_amount numeric;
  v_transaction_text text;
begin
  v_role := private.current_staff_role();

  if tg_op = 'INSERT' then
    v_expected_role := case when new.record_type in ('finance_transaction','equipment') then 'treasurer' else 'technical_director' end;
    if v_role <> v_expected_role or new.created_by <> (select auth.uid()) or new.status <> 'draft'
      or new.register_year is not null or new.register_number is not null
      or new.review_note is not null or new.reviewed_by is not null or new.reviewed_at is not null then
      raise exception 'إنشاء مسودات هذا السجل من صلاحية المسؤول المختص فقط';
    end if;
    new.updated_by := (select auth.uid());
    new.updated_at := now();
    return new;
  end if;

  if old.status = 'approved' then
    raise exception 'المسودة المعتمدة محفوظة ولا يجوز تعديلها';
  end if;

  if new.record_type is distinct from old.record_type
    or new.operation is distinct from old.operation
    or new.target_record_id is distinct from old.target_record_id
    or new.created_by is distinct from old.created_by
    or new.created_at is distinct from old.created_at then
    raise exception 'لا يمكن تغيير نوع السجل أو العملية أو صاحب المسودة';
  end if;

  if v_role = 'president' then
    if new.payload is distinct from old.payload then
      raise exception 'لا يحرر الرئيس بيانات المسودة؛ يسجل ملاحظة أو يعتمدها';
    end if;
    if new.status = 'changes_requested' then
      if char_length(trim(coalesce(new.review_note,''))) < 3 then
        raise exception 'اكتب ملاحظة واضحة بالتعديل المطلوب';
      end if;
      new.register_year := null;
      new.register_number := null;
      new.reviewed_by := (select auth.uid());
      new.reviewed_at := now();
    elsif new.status = 'approved' then
      v_year := extract(year from now())::integer;
      perform pg_advisory_xact_lock(hashtext('official-record-register-' || v_year::text)::bigint);
      select coalesce(max(register_number),0)+1 into v_next
        from public.official_record_drafts where register_year = v_year;
      new.register_year := v_year;
      new.register_number := v_next;
      new.review_note := null;
      new.reviewed_by := (select auth.uid());
      new.reviewed_at := now();

      if new.record_type = 'finance_transaction' then
        if new.payload - array['fiscal_year','transaction_date','transaction_type','category','description','amount','payment_method','reference']::text[] <> '{}'::jsonb then
          raise exception 'تحتوي مسودة العملية المالية على حقول غير مسموح بها';
        end if;
        if not exists (
          select 1 from public.financial_years fy
          where fy.fiscal_year = (new.payload->>'fiscal_year')::integer and fy.is_closed = false
        ) then raise exception 'لا يمكن اعتماد عملية مالية لسنة غير مفتوحة'; end if;

        v_transaction_text := coalesce(new.payload->>'category','') || ' ' || coalesce(new.payload->>'description','');
        if coalesce(new.payload->>'transaction_type','') = 'income'
          and v_transaction_text ~* '(اشتراك|انخراط|رسوم[[:space:]]*(العضوية|الانخراط)|membership[[:space:]]*(fee|dues)|annual[[:space:]]*(subscription|dues))' then
          select setting_value into v_fee_setting from public.association_settings where setting_key = 'annual_membership_fee_dzd';
          v_fee_amount := nullif(v_fee_setting->>'amount','')::numeric;
          if v_fee_amount is null or abs((new.payload->>'amount')::numeric - v_fee_amount) > 0.001 then
            raise exception 'لا يمكن اعتماد إيراد اشتراك دون قرار جمعية عامة معتمد وبمبلغ مطابق';
          end if;
        end if;

        if new.operation = 'create' then
          insert into public.finance_transactions(
            fiscal_year, transaction_date, transaction_type, category, description, amount,
            payment_method, reference, entered_by, is_test, updated_at
          ) values (
            (new.payload->>'fiscal_year')::integer,
            nullif(new.payload->>'transaction_date','')::date,
            new.payload->>'transaction_type',
            new.payload->>'category',
            new.payload->>'description',
            (new.payload->>'amount')::numeric,
            coalesce(nullif(new.payload->>'payment_method',''),'bank'),
            nullif(new.payload->>'reference',''),
            new.created_by, false, now()
          ) returning id into v_target;
          new.target_record_id := v_target;
        else
          update public.finance_transactions set
            transaction_date = nullif(new.payload->>'transaction_date','')::date,
            transaction_type = new.payload->>'transaction_type',
            category = new.payload->>'category',
            description = new.payload->>'description',
            amount = (new.payload->>'amount')::numeric,
            payment_method = coalesce(nullif(new.payload->>'payment_method',''),'bank'),
            reference = nullif(new.payload->>'reference',''),
            updated_at = now()
          where id = new.target_record_id and is_test = false
            and fiscal_year = (new.payload->>'fiscal_year')::integer
            and exists (select 1 from public.financial_years fy where fy.fiscal_year = finance_transactions.fiscal_year and fy.is_closed = false);
          get diagnostics v_count = row_count;
          if v_count <> 1 then raise exception 'العملية غير موجودة أو أن سنتها المالية مغلقة'; end if;
        end if;

      elsif new.record_type = 'equipment' then
        if new.payload - array['item_name','category','quantity','condition','serial_number','acquisition_date','acquisition_cost','storage_location','notes']::text[] <> '{}'::jsonb then
          raise exception 'تحتوي مسودة العتاد على حقول غير مسموح بها';
        end if;
        if new.operation = 'create' then
          insert into public.equipment(
            item_name, category, quantity, condition, serial_number, acquisition_date,
            acquisition_cost, storage_location, notes, entered_by, is_test, updated_at
          ) values (
            new.payload->>'item_name', coalesce(nullif(new.payload->>'category',''),'other'),
            coalesce(nullif(new.payload->>'quantity','')::integer,1),
            coalesce(nullif(new.payload->>'condition',''),'good'),
            nullif(new.payload->>'serial_number',''),
            nullif(new.payload->>'acquisition_date','')::date,
            nullif(new.payload->>'acquisition_cost','')::numeric,
            nullif(new.payload->>'storage_location',''), nullif(new.payload->>'notes',''),
            new.created_by, false, now()
          ) returning id into v_target;
          new.target_record_id := v_target;
        else
          update public.equipment set
            item_name = new.payload->>'item_name',
            category = coalesce(nullif(new.payload->>'category',''),'other'),
            quantity = coalesce(nullif(new.payload->>'quantity','')::integer,1),
            condition = coalesce(nullif(new.payload->>'condition',''),'good'),
            serial_number = nullif(new.payload->>'serial_number',''),
            acquisition_date = nullif(new.payload->>'acquisition_date','')::date,
            acquisition_cost = nullif(new.payload->>'acquisition_cost','')::numeric,
            storage_location = nullif(new.payload->>'storage_location',''),
            notes = nullif(new.payload->>'notes',''),
            updated_at = now()
          where id = new.target_record_id and is_test = false;
          get diagnostics v_count = row_count;
          if v_count <> 1 then raise exception 'معدة الجرد غير موجودة'; end if;
        end if;

      elsif new.record_type = 'activity' then
        if new.payload - array['title','activity_date','location','activity_type','status','leader','planned_budget','actual_budget','notes']::text[] <> '{}'::jsonb then
          raise exception 'تحتوي مسودة النشاط على حقول غير مسموح بها';
        end if;
        if new.operation = 'create' then
          insert into public.activities(
            title, activity_date, location, activity_type, status, leader,
            planned_budget, actual_budget, notes, entered_by, is_test, updated_at
          ) values (
            new.payload->>'title',
            nullif(new.payload->>'activity_date','')::date,
            nullif(new.payload->>'location',''),
            coalesce(nullif(new.payload->>'activity_type',''),'other'),
            coalesce(nullif(new.payload->>'status',''),'planned'),
            nullif(new.payload->>'leader',''),
            coalesce(nullif(new.payload->>'planned_budget','')::numeric,0),
            coalesce(nullif(new.payload->>'actual_budget','')::numeric,0),
            nullif(new.payload->>'notes',''),
            new.created_by, false, now()
          ) returning id into v_target;
          new.target_record_id := v_target;
        else
          update public.activities set
            title = new.payload->>'title',
            activity_date = nullif(new.payload->>'activity_date','')::date,
            location = nullif(new.payload->>'location',''),
            activity_type = coalesce(nullif(new.payload->>'activity_type',''),'other'),
            status = coalesce(nullif(new.payload->>'status',''),'planned'),
            leader = nullif(new.payload->>'leader',''),
            planned_budget = coalesce(nullif(new.payload->>'planned_budget','')::numeric,0),
            actual_budget = coalesce(nullif(new.payload->>'actual_budget','')::numeric,0),
            notes = nullif(new.payload->>'notes',''),
            updated_at = now()
          where id = new.target_record_id and is_test = false;
          get diagnostics v_count = row_count;
          if v_count <> 1 then raise exception 'النشاط غير موجود'; end if;
        end if;
      end if;
    else
      raise exception 'يستطيع الرئيس فقط طلب التعديل أو الاعتماد النهائي';
    end if;
  else
    v_expected_role := case when old.record_type in ('finance_transaction','equipment') then 'treasurer' else 'technical_director' end;
    if v_role <> v_expected_role or old.created_by <> (select auth.uid())
      or old.status not in ('draft','changes_requested')
      or new.status is distinct from old.status
      or new.review_note is distinct from old.review_note
      or new.reviewed_by is distinct from old.reviewed_by
      or new.reviewed_at is distinct from old.reviewed_at
      or new.register_year is not null or new.register_number is not null then
      raise exception 'يمكن للمسؤول المختص تحرير مسودته فقط، ولا يمكنه اعتمادها';
    end if;
  end if;

  new.updated_by := (select auth.uid());
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function private.apply_official_record_draft() from public, anon, authenticated;
drop trigger if exists official_record_draft_guard on public.official_record_drafts;
create trigger official_record_draft_guard
  before insert or update on public.official_record_drafts
  for each row execute function private.apply_official_record_draft();

-- Direct edits/deletes are disabled; official changes must pass through a draft.
drop policy if exists "President and treasurer insert transactions" on public.finance_transactions;
drop policy if exists "President and treasurer update transactions" on public.finance_transactions;
drop policy if exists "President deletes transactions" on public.finance_transactions;
drop policy if exists "President and treasurer insert equipment" on public.equipment;
drop policy if exists "President and treasurer update equipment" on public.equipment;
drop policy if exists "President deletes equipment" on public.equipment;
drop policy if exists "Activity leads insert" on public.activities;
drop policy if exists "Activity leads update" on public.activities;
drop policy if exists "President deletes activities" on public.activities;
