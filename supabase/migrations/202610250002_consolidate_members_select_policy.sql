-- Consolidate equivalent member SELECT access paths into one policy.
-- Preserves the existing rule: president/secretary general may read all member rows;
-- a member may read only their own linked row.
drop policy if exists "members_select_authorized_staff" on public.members;
drop policy if exists "members_select_own_record" on public.members;

create policy "members_select_authorized_staff_or_own_record"
on public.members
for select
to authenticated
using (
  (select private.current_staff_role()) = any (
    array['president'::text, 'secretary_general'::text]
  )
  or user_id = (select auth.uid())
);
