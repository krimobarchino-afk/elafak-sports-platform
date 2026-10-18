-- Public join requests must pass through submit-join-request so validation and rate limits cannot be bypassed.
revoke insert on table public.join_requests from anon, authenticated;
