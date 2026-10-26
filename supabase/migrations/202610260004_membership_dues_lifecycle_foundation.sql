-- Foundation for configurable annual dues. This migration creates no fee and activates no rule.
create table public.association_members (
 id uuid primary key default gen_random_uuid(),
 source_kind text not null check (source_kind in ('founder','member')),
 founder_number integer references public.founding_member_roster(founder_number) on delete restrict,
 member_record_id uuid references public.members(id) on delete restrict,
 user_id uuid references auth.users(id) on delete set null,
 full_name text not null,
 membership_status text not null default 'active' check (membership_status in ('active','suspended','loss_review','ended','resigned','deceased')),
 status_reason text,
 status_effective_at date,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check ((source_kind='founder' and founder_number is not null and member_record_id is null) or (source_kind='member' and member_record_id is not null and founder_number is null)),
 check (membership_status not in ('loss_review','ended','resigned','deceased') or nullif(btrim(status_reason),'') is not null)
);
create unique index association_members_founder_uq on public.association_members(founder_number) where founder_number is not null;
create unique index association_members_member_uq on public.association_members(member_record_id) where member_record_id is not null;
create unique index association_members_user_uq on public.association_members(user_id) where user_id is not null;
create index association_members_status_idx on public.association_members(membership_status);

insert into public.association_members(source_kind,founder_number,full_name,membership_status)
select 'founder',founder_number,full_name,'active'
from public.founding_member_roster
where founder_status='founder' and current_status='active'
on conflict (founder_number) where founder_number is not null do nothing;

create table public.membership_fee_rules (
 id uuid primary key default gen_random_uuid(),
 title text not null,
 annual_amount numeric(12,2) not null check (annual_amount>0),
 currency text not null default 'DZD' check (currency='DZD'),
 applies_from date not null,
 applies_through date,
 first_due_date date not null,
 recurring_due_month smallint check (recurring_due_month between 1 and 12),
 recurring_due_day smallint check (recurring_due_day between 1 and 31),
 reminder_days_before_due integer check (reminder_days_before_due>=0),
 warning_days_after_due integer check (warning_days_after_due>=0),
 review_after_days_unpaid integer check (review_after_days_unpaid>=0),
 source_meeting_id uuid references public.meetings(id) on delete restrict,
 source_decision text,
 legal_article_refs text[] not null default array['12','13','16']::text[],
 status text not null default 'draft' check (status in ('draft','approved','active','retired')),
 approved_by uuid references auth.users(id) on delete set null,
 approved_at timestamptz,
 activated_by uuid references auth.users(id) on delete set null,
 activated_at timestamptz,
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check (applies_through is null or applies_through>=applies_from),
 check ((recurring_due_month is null)=(recurring_due_day is null)),
 check (status not in ('approved','active') or (source_meeting_id is not null and nullif(btrim(source_decision),'') is not null and approved_by is not null and approved_at is not null))
);
create index membership_fee_rules_status_idx on public.membership_fee_rules(status,applies_from,applies_through);

create table public.membership_dues_obligations (
 id uuid primary key default gen_random_uuid(),
 association_member_id uuid not null references public.association_members(id) on delete restrict,
 fee_rule_id uuid not null references public.membership_fee_rules(id) on delete restrict,
 period_year integer not null check (period_year between 2000 and 2200),
 amount_due numeric(12,2) not null check (amount_due>0),
 due_date date not null,
 status text not null default 'pending' check (status in ('pending','paid','overdue','reminder_sent','warned','loss_review','closed')),
 status_note text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(association_member_id,fee_rule_id,period_year),
 check (status not in ('warned','loss_review','closed') or nullif(btrim(status_note),'') is not null)
);
create index membership_dues_due_idx on public.membership_dues_obligations(status,due_date);
create index membership_dues_member_idx on public.membership_dues_obligations(association_member_id,period_year desc);

create table public.membership_dues_payments (
 id uuid primary key default gen_random_uuid(),
 obligation_id uuid not null references public.membership_dues_obligations(id) on delete restrict,
 finance_transaction_id uuid references public.finance_transactions(id) on delete restrict,
 amount numeric(12,2) not null check (amount>0),
 payment_date date not null,
 receipt_reference text,
 verification_status text not null default 'pending' check (verification_status in ('pending','verified','rejected')),
 verified_by uuid references auth.users(id) on delete set null,
 verified_at timestamptz,
 verification_note text,
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 check ((verification_status='verified')=(verified_at is not null and verified_by is not null)),
 check (verification_status<>'rejected' or nullif(btrim(verification_note),'') is not null)
);
create index membership_dues_payments_obligation_idx on public.membership_dues_payments(obligation_id,payment_date);

create table public.member_notifications (
 id uuid primary key default gen_random_uuid(),
 association_member_id uuid not null references public.association_members(id) on delete restrict,
 obligation_id uuid references public.membership_dues_obligations(id) on delete restrict,
 notification_type text not null check (notification_type in ('dues_reminder','dues_warning','payment_received','membership_review','membership_decision','general')),
 title text not null,
 body text not null,
 channel text not null default 'in_app' check (channel in ('in_app','email','sms','paper','other')),
 delivery_status text not null default 'created' check (delivery_status in ('created','delivered','failed','read','acknowledged','served','service_failed')),
 created_at timestamptz not null default now(),
 delivered_at timestamptz,
 read_at timestamptz,
 acknowledged_at timestamptz,
 service_evidence text,
 service_note text,
 created_by uuid references auth.users(id) on delete set null,
 check (delivery_status not in ('served','service_failed') or channel in ('paper','email','sms','other')),
 check (delivery_status<>'served' or nullif(btrim(service_evidence),'') is not null)
);
create index member_notifications_member_idx on public.member_notifications(association_member_id,created_at desc);
create index member_notifications_unread_idx on public.member_notifications(association_member_id,read_at) where read_at is null;

create table public.membership_status_events (
 id uuid primary key default gen_random_uuid(),
 association_member_id uuid not null references public.association_members(id) on delete restrict,
 from_status text,
 to_status text not null check (to_status in ('active','suspended','loss_review','ended','resigned','deceased')),
 event_type text not null check (event_type in ('status_review','warning_issued','payment_confirmed','member_response','membership_ended','reinstated','correction')),
 reason text not null,
 legal_article_refs text[] not null default '{}'::text[],
 source_fee_rule_id uuid references public.membership_fee_rules(id) on delete restrict,
 source_obligation_id uuid references public.membership_dues_obligations(id) on delete restrict,
 evidence_reference text,
 reviewed_by uuid references auth.users(id) on delete set null,
 reviewed_at timestamptz,
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 check (to_status not in ('loss_review','ended','resigned','deceased') or nullif(btrim(reason),'') is not null)
);
create index membership_status_events_member_idx on public.membership_status_events(association_member_id,created_at desc);

-- Validate any future activation against an approved, non-test General Assembly record.
create or replace function private.validate_membership_fee_rule()
returns trigger language plpgsql security definer
set search_path=public,private,pg_temp as $$
declare v_meeting public.meetings%rowtype;
begin
 if new.status in ('approved','active') then
  if new.source_meeting_id is null or nullif(btrim(new.source_decision),'') is null or new.approved_by is null or new.approved_at is null then
   raise exception 'A fee rule requires an approved General Assembly decision and approval metadata.';
  end if;
  select * into v_meeting from public.meetings where id=new.source_meeting_id;
  if not found or v_meeting.meeting_type<>'general_assembly' or v_meeting.status<>'approved' or v_meeting.is_test is true then
   raise exception 'The source must be an approved, non-test General Assembly meeting.';
  end if;
 end if;
 if new.status='active' then
  if new.activated_by is null or new.activated_at is null then raise exception 'Activation requires actor and timestamp.'; end if;
  if exists(select 1 from public.membership_fee_rules r where r.status='active' and r.id<>new.id
    and daterange(r.applies_from,coalesce(r.applies_through+1,'infinity'::date),'[)')
        && daterange(new.applies_from,coalesce(new.applies_through+1,'infinity'::date),'[)')) then
   raise exception 'Another active fee rule overlaps this effective period.';
  end if;
 end if;
 new.updated_at:=now();
 return new;
end; $$;
revoke all on function private.validate_membership_fee_rule() from public,anon,authenticated;
create trigger membership_fee_rule_validate before insert or update on public.membership_fee_rules
for each row execute function private.validate_membership_fee_rule();

create or replace function private.sync_membership_registry_from_members()
returns trigger language plpgsql security definer
set search_path=public,private,pg_temp as $$
declare v_name text; v_status text;
begin
 select full_name into v_name from public.join_requests where id=new.join_request_id;
 v_status:=case new.membership_status when 'active' then 'active' when 'suspended' then 'suspended' when 'ended' then 'ended' else 'active' end;
 insert into public.association_members(source_kind,member_record_id,user_id,full_name,membership_status,status_reason,status_effective_at)
 values('member',new.id,new.user_id,coalesce(nullif(btrim(v_name),''),new.member_no),v_status,
   case when v_status='ended' then 'منتهٍ وفق سجل العضوية؛ يلزم توثيق السبب عند المراجعة' else null end,
   case when v_status='ended' then current_date else null end)
 on conflict (member_record_id) where member_record_id is not null
 do update set user_id=excluded.user_id,full_name=excluded.full_name,
   membership_status=case when association_members.membership_status in ('loss_review','resigned','deceased') then association_members.membership_status else excluded.membership_status end,
   status_reason=case when association_members.membership_status in ('loss_review','resigned','deceased') then association_members.status_reason else excluded.status_reason end,
   status_effective_at=case when association_members.membership_status in ('loss_review','resigned','deceased') then association_members.status_effective_at else excluded.status_effective_at end,
   updated_at=now();
 return new;
end; $$;
revoke all on function private.sync_membership_registry_from_members() from public,anon,authenticated;
create trigger members_sync_membership_registry after insert or update of user_id,membership_status,join_request_id on public.members
for each row execute function private.sync_membership_registry_from_members();

-- RLS enabled, with read-only access until authenticated RPCs and UI are implemented.
alter table public.association_members enable row level security;
alter table public.membership_fee_rules enable row level security;
alter table public.membership_dues_obligations enable row level security;
alter table public.membership_dues_payments enable row level security;
alter table public.member_notifications enable row level security;
alter table public.membership_status_events enable row level security;
revoke all on public.association_members,public.membership_fee_rules,public.membership_dues_obligations,public.membership_dues_payments,public.member_notifications,public.membership_status_events from anon;
grant select on public.association_members,public.membership_fee_rules,public.membership_dues_obligations,public.membership_dues_payments,public.member_notifications,public.membership_status_events to authenticated;

create policy association_members_read_own on public.association_members for select to authenticated using (user_id=(select auth.uid()));
create policy association_members_staff_read on public.association_members for select to authenticated using (
 exists(select 1 from public.staff_profiles sp where sp.user_id=(select auth.uid()) and sp.is_active=true
 and sp.role in ('site_admin','president','deputy_president','secretary_general','deputy_secretary_general','treasurer','deputy_treasurer')));
create policy membership_fee_rules_staff_read on public.membership_fee_rules for select to authenticated using (
 exists(select 1 from public.staff_profiles sp where sp.user_id=(select auth.uid()) and sp.is_active=true
 and sp.role in ('site_admin','president','secretary_general','treasurer','deputy_treasurer')));
create policy membership_dues_obligations_member_read on public.membership_dues_obligations for select to authenticated using (
 exists(select 1 from public.association_members am where am.id=association_member_id and am.user_id=(select auth.uid())));
create policy membership_dues_obligations_staff_read on public.membership_dues_obligations for select to authenticated using (
 exists(select 1 from public.staff_profiles sp where sp.user_id=(select auth.uid()) and sp.is_active=true
 and sp.role in ('site_admin','president','secretary_general','treasurer','deputy_treasurer')));
create policy membership_dues_payments_staff_read on public.membership_dues_payments for select to authenticated using (
 exists(select 1 from public.staff_profiles sp where sp.user_id=(select auth.uid()) and sp.is_active=true
 and sp.role in ('site_admin','president','treasurer','deputy_treasurer')));
create policy member_notifications_read_own on public.member_notifications for select to authenticated using (
 exists(select 1 from public.association_members am where am.id=association_member_id and am.user_id=(select auth.uid())));
create policy member_notifications_staff_read on public.member_notifications for select to authenticated using (
 exists(select 1 from public.staff_profiles sp where sp.user_id=(select auth.uid()) and sp.is_active=true
 and sp.role in ('site_admin','president','secretary_general','treasurer','deputy_treasurer')));
create policy membership_status_events_staff_read on public.membership_status_events for select to authenticated using (
 exists(select 1 from public.staff_profiles sp where sp.user_id=(select auth.uid()) and sp.is_active=true
 and sp.role in ('site_admin','president','secretary_general','treasurer','deputy_treasurer')));

-- Intentionally no client write policies. Add narrow, audited RPCs before the UI can change dues or membership state.
