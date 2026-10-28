-- Private PDF storage for join-request documents.
-- All upload, listing, replacement, removal, and signed-link actions run through
-- authenticated/service-side Edge Functions. No public bucket access is granted.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('join-request-files', 'join-request-files', false, 15728640, array['application/pdf'])
on conflict (id) do update
set name = excluded.name,
    public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
