-- Add optional structured fields for the editable meeting minutes template.
-- Existing meeting records remain valid; new fields are nullable.
alter table public.meetings
  add column if not exists meeting_start_time time,
  add column if not exists meeting_end_time time,
  add column if not exists meeting_chair text,
  add column if not exists meeting_attendees text,
  add column if not exists meeting_agenda text,
  add column if not exists meeting_discussion text,
  add column if not exists meeting_attachments text;
