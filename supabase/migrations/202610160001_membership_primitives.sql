-- Minimal membership and document-submission schema recovered from the reviewed live schema.
-- This migration creates structures only: it deliberately inserts no people, join requests,
-- document requirements, member records, payments, or historic activity.
create schema if not exists private;

create sequence if not exists public.member_number_seq;

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  member_no text not null default ('AF-'::text || lpad((nextval('public.member_number_seq'::regclass))::text, 6, '0'::text)),
  join_request_id uuid not null unique references public.join_requests(id) on delete restrict,
  user_id uuid unique references auth.users(id) on delete set null,
  membership_status text not null default 'active'
    check (membership_status in ('active', 'suspended', 'ended')),
  account_status text not null default 'awaiting_account'
    check (account_status in ('awaiting_account', 'invitation_pending', 'active', 'disabled')),
  membership_started_at timestamptz not null default now(),
  membership_ended_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint members_account_link_check check (
    (user_id is null and account_status = 'awaiting_account')
    or (user_id is not null and account_status in ('invitation_pending', 'active', 'disabled'))
  ),
  constraint members_end_date_check check (
    membership_ended_at is null or membership_ended_at >= membership_started_at
  )
);
create index if not exists members_created_by_idx on public.members(created_by);
comment on table public.members is 'Minimal membership registry. Personal documents remain in private storage; member records must only be created after final approval and confirmed payment.';
comment on column public.members.member_no is 'Permanent internal membership number; never reused.';
comment on column public.members.join_request_id is 'Unique link to the original join request; source of personal profile details.';
comment on column public.members.user_id is 'Linked Supabase Auth account. Must not be assigned before final approval.';

create table if not exists public.join_request_document_requirements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 3 and 160),
  description text check (description is null or char_length(description) <= 500),
  is_required boolean not null default false,
  is_enabled boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  bureau_order_reference text,
  bureau_order_date date
);
create index if not exists join_request_document_requirements_order_idx
  on public.join_request_document_requirements(is_enabled, sort_order, created_at);
create index if not exists join_request_document_requirements_updated_by_idx
  on public.join_request_document_requirements(updated_by);

create table if not exists public.join_request_file_submissions (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.join_requests(id) on delete cascade,
  status text not null default 'awaiting_upload'
    check (status in ('awaiting_upload', 'submitted', 'in_review', 'needs_correction', 'ready_for_final_approval', 'finalized')),
  pdf_path text unique,
  submitted_at timestamptz,
  reviewer_note text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  payment_confirmed boolean not null default false,
  payment_confirmed_by uuid references auth.users(id),
  payment_confirmed_at timestamptz,
  final_approved_by uuid references auth.users(id),
  final_approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint final_approval_consistency check (
    (status <> 'finalized' and final_approved_by is null and final_approved_at is null)
    or (status = 'finalized' and final_approved_by is not null and final_approved_at is not null)
  ),
  constraint payment_confirmation_consistency check (
    (payment_confirmed = false and payment_confirmed_by is null and payment_confirmed_at is null)
    or (payment_confirmed = true and payment_confirmed_by is not null and payment_confirmed_at is not null)
  ),
  constraint join_request_file_submissions_pdf_path_private check (
    pdf_path is null or (
      pdf_path like (request_id::text || '/%')
      and pdf_path not like '%..%'
    )
  )
);
create index if not exists join_request_file_submissions_final_approved_by_idx on public.join_request_file_submissions(final_approved_by);
create index if not exists join_request_file_submissions_payment_confirmed_by_idx on public.join_request_file_submissions(payment_confirmed_by);
create index if not exists join_request_file_submissions_reviewed_by_idx on public.join_request_file_submissions(reviewed_by);

create table if not exists public.join_request_lookup_rate_limits (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  created_at timestamptz not null default now()
);
create index if not exists join_request_lookup_rate_limits_ip_created_idx
  on public.join_request_lookup_rate_limits(ip_hash, created_at desc);

alter table public.members enable row level security;
alter table public.join_request_document_requirements enable row level security;
alter table public.join_request_file_submissions enable row level security;
alter table public.join_request_lookup_rate_limits enable row level security;

grant select on public.members to authenticated;
grant all privileges on public.members to service_role;
grant usage, select on sequence public.member_number_seq to service_role;

grant select, insert, update, delete on public.join_request_document_requirements to authenticated;
grant all privileges on public.join_request_document_requirements to service_role;
grant select on public.join_request_file_submissions to authenticated;
grant all privileges on public.join_request_file_submissions to service_role;
grant all privileges on public.join_request_lookup_rate_limits to service_role;

create or replace function private.enforce_member_final_approval()
returns trigger
language plpgsql
set search_path to ''
as $function$
declare
  request_status text;
  file_status text;
  payment_ok boolean;
  approved_at timestamptz;
  approved_by uuid;
begin
  select jr.status into request_status
  from public.join_requests jr
  where jr.id = new.join_request_id;

  select fs.status, fs.payment_confirmed, fs.final_approved_at, fs.final_approved_by
    into file_status, payment_ok, approved_at, approved_by
  from public.join_request_file_submissions fs
  where fs.request_id = new.join_request_id;

  if request_status is distinct from 'approved'
     or file_status is distinct from 'finalized'
     or payment_ok is distinct from true
     or approved_at is null
     or approved_by is null then
    raise exception 'Membership record requires final approval, finalized documents, and confirmed payment';
  end if;

  if new.user_id is not null and new.account_status = 'awaiting_account' then
    raise exception 'A linked account cannot have awaiting_account status';
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_enforce_member_final_approval on public.members;
create trigger trg_enforce_member_final_approval
before insert or update on public.members
for each row execute function private.enforce_member_final_approval();
