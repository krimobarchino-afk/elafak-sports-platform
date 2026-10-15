-- El Afak Sports Platform — initial public membership-request intake
-- Apply this migration in Supabase SQL Editor before connecting the website.
-- Public visitors can submit a request, but cannot read, update, or delete any request.
-- Do not put Supabase service-role keys in browser code or the public GitHub repository.

create extension if not exists pgcrypto;

create table if not exists public.join_requests (
  id uuid primary key default gen_random_uuid(),
  request_ref text not null unique default (
    'AF-' || to_char(now() at time zone 'utc', 'YYYYMMDD') || '-' ||
    upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 8))
  ),
  full_name text not null check (char_length(trim(full_name)) between 3 and 160),
  birth_date date,
  municipality text not null check (char_length(trim(municipality)) between 2 and 100),
  phone text not null check (char_length(trim(phone)) between 6 and 40),
  email text check (email is null or char_length(email) <= 254),
  interests text[] not null default '{}'
    check (interests <@ array['paragliding','hiking','volunteering']::text[]),
  experience text check (experience is null or char_length(experience) <= 1500),
  consent boolean not null default false check (consent = true),
  status text not null default 'pending'
    check (status in ('pending','needs_information','approved','declined')),
  reviewer_note text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint reviewer_fields_consistent check (
    (status = 'pending' and reviewed_at is null and reviewer_note is null)
    or status <> 'pending'
  )
);

alter table public.join_requests enable row level security;

-- Anonymous and authenticated visitors may only INSERT a new pending request.
-- No SELECT/UPDATE/DELETE policy is granted to the public.
drop policy if exists "Public can submit pending join requests" on public.join_requests;
create policy "Public can submit pending join requests"
on public.join_requests
for insert
to anon, authenticated
with check (
  status = 'pending'
  and reviewed_at is null
  and reviewer_note is null
  and consent = true
);

revoke all on table public.join_requests from anon, authenticated;
grant insert (
  full_name, birth_date, municipality, phone, email, interests, experience, consent
) on public.join_requests to anon, authenticated;

comment on table public.join_requests is
'Initial public membership-interest requests. Membership is not granted by submitting this form. Staff review access must be configured separately with authenticated roles.';
