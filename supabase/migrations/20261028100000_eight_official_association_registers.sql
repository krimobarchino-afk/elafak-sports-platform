-- Eight official association registers with draft/review/approval workflow.
-- Development migration; do not apply to production without explicit approval.
create table if not exists public.association_register_entries (
  id uuid primary key default gen_random_uuid(),
  register_key text not null check (register_key in ('deliberation','accounting','equipment','outgoing_mail','incoming_mail','activities','tasks','inspection')),
  register_year integer not null,
  register_number bigint not null,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  created_by uuid not null references auth.users(id) on delete restrict,
  approved_by uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  approved_at timestamptz not null default now(),
  is_test boolean not null default false,
  unique(register_key, register_year, register_number)
);
create index if not exists association_register_entries_key_date_idx
  on public.association_register_entries(register_key, register_year desc, register_number desc);
alter table public.association_register_entries enable row level security;
grant select, insert on public.association_register_entries to authenticated;
revoke update, delete on public.association_register_entries from anon, authenticated;

create table if not exists public.association_register_drafts (
  id uuid primary key default gen_random_uuid(),
  register_key text not null check (register_key in ('deliberation','accounting','equipment','outgoing_mail','incoming_mail','activities')),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  status text not null default 'draft' check (status in ('draft','changes_requested','approved')),
  review_note text,
  created_by uuid not null references auth.users(id) on delete restrict,
  reviewed_by uuid references auth.users(id) on delete restrict,
  reviewed_at timestamptz,
  official_entry_id uuid references public.association_register_entries(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'approved' and official_entry_id is not null) or (status <> 'approved' and official_entry_id is null))
);
create index if not exists association_register_drafts_queue_idx
  on public.association_register_drafts(register_key, status, created_at desc);
alter table public.association_register_drafts enable row level security;
grant select, insert, update on public.association_register_drafts to authenticated;
revoke delete on public.association_register_drafts from anon, authenticated;

create table if not exists public.association_register_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  draft_id uuid references public.association_register_drafts(id) on delete cascade,
  register_key text not null,
  event_type text not null check (event_type in ('draft_created','changes_requested','approved')),
  title text not null,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
alter table public.association_register_notifications enable row level security;
grant select, update(read_at) on public.association_register_notifications to authenticated;
revoke insert, delete on public.association_register_notifications from anon, authenticated;
create policy "Read own register notifications" on public.association_register_notifications
 for select to authenticated using (recipient_user_id = (select auth.uid()));
create policy "Mark own register notifications read" on public.association_register_notifications
 for update to authenticated using (recipient_user_id = (select auth.uid()))
 with check (recipient_user_id = (select auth.uid()));

create or replace function private.can_view_association_register(p_key text)
returns boolean language sql stable security definer
set search_path = pg_catalog, public, private, auth
as $$
 select case p_key
  when 'deliberation' then private.current_staff_role() in ('president','deputy_president','secretary_general','deputy_secretary_general','inspection_inspector')
  when 'accounting' then private.current_staff_role() in ('president','deputy_president','treasurer','deputy_treasurer','technical_director','inspection_inspector')
  when 'equipment' then private.current_staff_role() in ('president','deputy_president','treasurer','deputy_treasurer','technical_director','inspection_inspector')
  when 'outgoing_mail' then private.current_staff_role() in ('president','deputy_president','secretary_general','deputy_secretary_general','inspection_inspector')
  when 'incoming_mail' then private.current_staff_role() in ('president','deputy_president','secretary_general','deputy_secretary_general','inspection_inspector')
  when 'activities' then private.current_staff_role() in ('president','deputy_president','secretary_general','deputy_secretary_general','treasurer','deputy_treasurer','technical_director','inspection_inspector')
  when 'tasks' then private.current_staff_role() in ('president','deputy_president','secretary_general','deputy_secretary_general','treasurer','deputy_treasurer','technical_director')
  when 'inspection' then private.current_staff_role() in ('president','deputy_president','secretary_general','deputy_secretary_general','treasurer','deputy_treasurer','technical_director','inspection_inspector')
  else false end
$$;
revoke all on function private.can_view_association_register(text) from public, anon;
grant execute on function private.can_view_association_register(text) to authenticated;

create policy "Read permitted official association registers" on public.association_register_entries
 for select to authenticated using (private.can_view_association_register(register_key) and is_test = false);
create policy "President tasks and inspector reports are direct official entries" on public.association_register_entries
 for insert to authenticated with check (
  created_by = (select auth.uid()) and is_test = false and
  ((register_key = 'tasks' and private.current_staff_role() = 'president')
   or (register_key = 'inspection' and private.current_staff_role() = 'inspection_inspector'))
);

create policy "Creator and president read permitted register drafts" on public.association_register_drafts
 for select to authenticated using (
  (created_by = (select auth.uid()) and (
    (register_key in ('deliberation','outgoing_mail','incoming_mail') and private.current_staff_role() = 'secretary_general')
    or (register_key in ('accounting','equipment') and private.current_staff_role() = 'treasurer')
    or (register_key = 'activities' and private.current_staff_role() = 'technical_director')
  ))
  or private.current_staff_role() = 'president'
);
create policy "Responsible role creates register drafts" on public.association_register_drafts
 for insert to authenticated with check (
  created_by = (select auth.uid()) and status = 'draft' and official_entry_id is null
  and reviewed_by is null and reviewed_at is null and review_note is null
  and ((register_key in ('deliberation','outgoing_mail','incoming_mail') and private.current_staff_role() = 'secretary_general')
    or (register_key in ('accounting','equipment') and private.current_staff_role() = 'treasurer')
    or (register_key = 'activities' and private.current_staff_role() = 'technical_director'))
);
create policy "Creator edits unapproved own drafts" on public.association_register_drafts
 for update to authenticated using (
  created_by = (select auth.uid()) and status in ('draft','changes_requested')
  and ((register_key in ('deliberation','outgoing_mail','incoming_mail') and private.current_staff_role() = 'secretary_general')
    or (register_key in ('accounting','equipment') and private.current_staff_role() = 'treasurer')
    or (register_key = 'activities' and private.current_staff_role() = 'technical_director'))
) with check (
  created_by = (select auth.uid()) and status in ('draft','changes_requested') and official_entry_id is null
);
create policy "President reviews register drafts" on public.association_register_drafts
 for update to authenticated using (private.current_staff_role() = 'president' and status in ('draft','changes_requested'))
 with check (private.current_staff_role() = 'president' and status in ('changes_requested','approved'));

create or replace function private.guard_association_register_draft()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public, private, auth
as $$
declare v_role text; v_year integer; v_number bigint; v_entry uuid;
begin
 v_role := private.current_staff_role();
 if tg_op = 'INSERT' then
  if new.created_by <> (select auth.uid()) or new.status <> 'draft' or new.review_note is not null
   or new.reviewed_by is not null or new.reviewed_at is not null or new.official_entry_id is not null then
   raise exception 'بيانات المسودة الأولية غير صالحة';
  end if;
  if not ((new.register_key in ('deliberation','outgoing_mail','incoming_mail') and v_role='secretary_general')
   or (new.register_key in ('accounting','equipment') and v_role='treasurer')
   or (new.register_key='activities' and v_role='technical_director')) then
   raise exception 'إنشاء مسودة هذا السجل غير مسموح لهذا الحساب';
  end if;
  new.updated_at := now(); return new;
 end if;
 if old.status='approved' then raise exception 'السجل المعتمد محفوظ ولا يقبل التعديل'; end if;
 if new.register_key is distinct from old.register_key or new.created_by is distinct from old.created_by or new.created_at is distinct from old.created_at then
  raise exception 'لا يمكن تغيير نوع السجل أو منشئ المسودة';
 end if;
 if v_role='president' then
  if new.payload is distinct from old.payload then raise exception 'الرئيس يراجع المسودة ولا يحرر بياناتها'; end if;
  if new.status='changes_requested' then
   if length(trim(coalesce(new.review_note,'')))<3 then raise exception 'اكتب ملاحظة واضحة بالتعديل المطلوب'; end if;
   new.official_entry_id:=null; new.reviewed_by:=(select auth.uid()); new.reviewed_at:=now();
  elsif new.status='approved' then
   v_year:=extract(year from now())::integer;
   perform pg_advisory_xact_lock(hashtext('association-register-'||new.register_key||'-'||v_year::text)::bigint);
   select coalesce(max(register_number),0)+1 into v_number from public.association_register_entries where register_key=new.register_key and register_year=v_year;
   insert into public.association_register_entries(register_key,register_year,register_number,payload,created_by,approved_by)
    values(new.register_key,v_year,v_number,new.payload,new.created_by,(select auth.uid())) returning id into v_entry;
   new.official_entry_id:=v_entry; new.review_note:=null; new.reviewed_by:=(select auth.uid()); new.reviewed_at:=now();
  else raise exception 'يجب طلب التعديل أو اعتماد المسودة'; end if;
 else
  if old.created_by <> (select auth.uid()) or v_role not in ('secretary_general','treasurer','technical_director')
   or new.status not in ('draft','changes_requested') or new.review_note is distinct from old.review_note
   or new.reviewed_by is distinct from old.reviewed_by or new.reviewed_at is distinct from old.reviewed_at
   or new.official_entry_id is not null then raise exception 'لا تملك صلاحية هذا التغيير'; end if;
 end if;
 new.updated_at:=now(); return new;
end $$;
revoke all on function private.guard_association_register_draft() from public, anon, authenticated;
drop trigger if exists guard_association_register_draft on public.association_register_drafts;
create trigger guard_association_register_draft before insert or update on public.association_register_drafts
 for each row execute function private.guard_association_register_draft();

create or replace function private.notify_association_register_draft()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public, private, auth
as $$
declare v_event text; v_role text; v_title text; v_body text;
begin
 if tg_op='INSERT' then v_event:='draft_created'; v_role:='president'; v_title:='مسودة سجل جديدة'; v_body:='توجد مسودة جديدة للمراجعة في سجل '||new.register_key||'.';
 elsif new.status='changes_requested' and old.status is distinct from new.status then v_event:='changes_requested'; v_role:=case new.register_key when 'accounting' then 'treasurer' when 'equipment' then 'treasurer' when 'activities' then 'technical_director' else 'secretary_general' end; v_title:='طلب تعديل مسودة'; v_body:=coalesce(new.review_note,'طلب الرئيس تعديل المسودة.');
 elsif new.status='approved' and old.status is distinct from new.status then v_event:='approved'; v_role:=case new.register_key when 'accounting' then 'treasurer' when 'equipment' then 'treasurer' when 'activities' then 'technical_director' else 'secretary_general' end; v_title:='اعتماد مسودة سجل'; v_body:='اعتمد الرئيس المسودة وأدرجها في السجل الرسمي.';
 else return new; end if;
 insert into public.association_register_notifications(recipient_user_id,draft_id,register_key,event_type,title,body)
 select sp.user_id,new.id,new.register_key,v_event,v_title,v_body from public.staff_profiles sp
 where sp.role=v_role and sp.is_active=true and sp.is_frozen=false
 and sp.user_id <> coalesce(auth.uid(),'00000000-0000-0000-0000-000000000000'::uuid);
 return new;
end $$;
revoke all on function private.notify_association_register_draft() from public, anon, authenticated;
drop trigger if exists notify_association_register_draft on public.association_register_drafts;
create trigger notify_association_register_draft after insert or update on public.association_register_drafts
 for each row execute function private.notify_association_register_draft();

create policy "Inspector does not read drafts" on public.association_register_drafts as restrictive
 for all to authenticated using (private.current_staff_role() is distinct from 'inspection_inspector')
 with check (private.current_staff_role() is distinct from 'inspection_inspector');
