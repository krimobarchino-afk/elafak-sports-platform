-- Inspection reports are authored by the inspector and immutable after submission.
-- Association responses are stored separately; they never overwrite the inspector's report.
alter table public.staff_profiles
  drop constraint if exists staff_profiles_role_check;

alter table public.staff_profiles
  add constraint staff_profiles_role_check
  check (role in (
    'site_admin',
    'president',
    'deputy_president',
    'secretary_general',
    'treasurer',
    'deputy_secretary_general',
    'deputy_treasurer',
    'technical_director',
    'inspection_inspector'
  ));

create table if not exists public.inspection_reports (
  id uuid primary key default gen_random_uuid(),
  report_number text not null unique check (char_length(trim(report_number)) between 3 and 80),
  inspection_date date not null,
  inspected_entity text not null check (char_length(trim(inspected_entity)) between 2 and 240),
  subject text not null check (char_length(trim(subject)) between 3 and 240),
  scope text not null default '',
  findings text not null check (char_length(trim(findings)) between 3 and 20000),
  recommendations text not null default '',
  status text not null default 'draft' check (status in ('draft','submitted')),
  attachment_object_keys text[] not null default '{}',
  created_by uuid not null references auth.users(id) on delete restrict,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inspection_reports_submission_state_check
    check ((status = 'draft' and submitted_at is null) or (status = 'submitted' and submitted_at is not null))
);

create index if not exists inspection_reports_date_idx
  on public.inspection_reports (inspection_date desc, created_at desc);
create index if not exists inspection_reports_status_idx
  on public.inspection_reports (status, created_at desc);

alter table public.inspection_reports enable row level security;
revoke all on table public.inspection_reports from anon, authenticated;
grant select, insert, update on table public.inspection_reports to authenticated;

drop policy if exists "Inspector and association leads read inspection reports" on public.inspection_reports;
create policy "Inspector and association leads read inspection reports"
on public.inspection_reports for select to authenticated
using ((select private.current_staff_role()) in ('inspection_inspector','president','secretary_general'));

drop policy if exists "Inspector creates own inspection drafts" on public.inspection_reports;
create policy "Inspector creates own inspection drafts"
on public.inspection_reports for insert to authenticated
with check (
  (select private.current_staff_role()) = 'inspection_inspector'
  and created_by = (select auth.uid())
  and status = 'draft'
  and submitted_at is null
);

drop policy if exists "Inspector edits own drafts only" on public.inspection_reports;
create policy "Inspector edits own drafts only"
on public.inspection_reports for update to authenticated
using (
  (select private.current_staff_role()) = 'inspection_inspector'
  and created_by = (select auth.uid())
  and status = 'draft'
)
with check (
  (select private.current_staff_role()) = 'inspection_inspector'
  and created_by = (select auth.uid())
  and (
    (status = 'draft' and submitted_at is null)
    or (status = 'submitted' and submitted_at is not null)
  )
);

create or replace function private.protect_submitted_inspection_report()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Inspection reports cannot be deleted; preserve the official record.';
  end if;

  if old.status = 'submitted' then
    raise exception 'Submitted inspection reports are immutable; issue a correction/addendum instead.';
  end if;

  if new.status = 'submitted' and new.submitted_at is null then
    raise exception 'submitted_at is required when submitting an inspection report.';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists protect_submitted_inspection_report on public.inspection_reports;
create trigger protect_submitted_inspection_report
before update or delete on public.inspection_reports
for each row execute function private.protect_submitted_inspection_report();

create table if not exists public.inspection_followups (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.inspection_reports(id) on delete restrict,
  response_text text not null check (char_length(trim(response_text)) between 3 and 20000),
  corrective_action text not null default '',
  responsible_person text not null default '',
  due_date date,
  status text not null default 'open' check (status in ('open','in_progress','completed')),
  evidence_references text[] not null default '{}',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists inspection_followups_report_idx
  on public.inspection_followups (report_id, created_at desc);

alter table public.inspection_followups enable row level security;
revoke all on table public.inspection_followups from anon, authenticated;
grant select, insert, update on table public.inspection_followups to authenticated;

drop policy if exists "Inspection parties read followups" on public.inspection_followups;
create policy "Inspection parties read followups"
on public.inspection_followups for select to authenticated
using (
  (select private.current_staff_role()) in ('inspection_inspector','president','secretary_general')
);

drop policy if exists "Association leads record followups" on public.inspection_followups;
create policy "Association leads record followups"
on public.inspection_followups for insert to authenticated
with check (
  (select private.current_staff_role()) in ('president','secretary_general')
  and created_by = (select auth.uid())
  and exists (
    select 1 from public.inspection_reports r
    where r.id = report_id and r.status = 'submitted'
  )
);

drop policy if exists "Association leads update followups" on public.inspection_followups;
create policy "Association leads update followups"
on public.inspection_followups for update to authenticated
using (
  (select private.current_staff_role()) in ('president','secretary_general')
)
with check (
  (select private.current_staff_role()) in ('president','secretary_general')
  and exists (
    select 1 from public.inspection_reports r
    where r.id = report_id and r.status = 'submitted'
  )
);

create or replace function private.touch_inspection_followup_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists touch_inspection_followup_updated_at on public.inspection_followups;
create trigger touch_inspection_followup_updated_at
before update on public.inspection_followups
for each row execute function private.touch_inspection_followup_updated_at();

comment on table public.inspection_reports is
'Official inspection reports authored by the inspection inspector. Readable by inspector, president and secretary-general; submitted reports cannot be edited or deleted.';
comment on table public.inspection_followups is
'Association response and corrective-action tracking linked to an official inspection report; separate from and never overwrites the inspector report.';
comment on column public.inspection_reports.attachment_object_keys is
'Private storage object keys only; never store public URLs. Upload UI must remain disabled until private Storage policies are deployed.';
