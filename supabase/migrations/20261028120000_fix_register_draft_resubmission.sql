-- Allow the responsible officer to resubmit a draft after addressing the president's change request.
-- Resubmission clears review metadata and notifies the president again.
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
   or new.status not in ('draft','changes_requested')
   or (new.status is distinct from old.status and not (old.status='changes_requested' and new.status='draft'))
   or new.official_entry_id is not null then raise exception 'لا تملك صلاحية هذا التغيير'; end if;
  if old.status='changes_requested' and new.status='draft' then
   new.review_note:=null; new.reviewed_by:=null; new.reviewed_at:=null;
  else
   if new.review_note is distinct from old.review_note
    or new.reviewed_by is distinct from old.reviewed_by
    or new.reviewed_at is distinct from old.reviewed_at then
    raise exception 'لا يمكن لصاحب المسودة تغيير بيانات مراجعة الرئيس';
   end if;
  end if;
 end if;
 new.updated_at:=now(); return new;
end $$;
create or replace function private.notify_association_register_draft()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public, private, auth
as $$
declare v_event text; v_role text; v_title text; v_body text;
begin
 if tg_op='INSERT' or (old.status='changes_requested' and new.status='draft') then v_event:='draft_created'; v_role:='president'; v_title:='مسودة سجل جديدة للمراجعة'; v_body:='أُعيد إرسال مسودة بعد استكمال التعديلات في سجل '||new.register_key||'.';
 elsif new.status='changes_requested' and old.status is distinct from new.status then v_event:='changes_requested'; v_role:=case new.register_key when 'accounting' then 'treasurer' when 'equipment' then 'treasurer' when 'activities' then 'technical_director' else 'secretary_general' end; v_title:='طلب تعديل مسودة'; v_body:=coalesce(new.review_note,'طلب الرئيس تعديل المسودة.');
 elsif new.status='approved' and old.status is distinct from new.status then v_event:='approved'; v_role:=case new.register_key when 'accounting' then 'treasurer' when 'equipment' then 'treasurer' when 'activities' then 'technical_director' else 'secretary_general' end; v_title:='اعتماد مسودة سجل'; v_body:='اعتمد الرئيس المسودة وأدرجها في السجل الرسمي.';
 else return new; end if;
 insert into public.association_register_notifications(recipient_user_id,draft_id,register_key,event_type,title,body)
 select sp.user_id,new.id,new.register_key,v_event,v_title,v_body from public.staff_profiles sp
 where sp.role=v_role and sp.is_active=true and sp.is_frozen=false
 and sp.user_id <> coalesce(auth.uid(),'00000000-0000-0000-0000-000000000000'::uuid);
 return new;
end $$;
