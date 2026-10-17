-- Site administration manages staff accounts only; association decisions belong to association officers.
DROP POLICY IF EXISTS "President and secretary can read join requests" ON public.join_requests;
DROP POLICY IF EXISTS "President and secretary can update join requests" ON public.join_requests;

CREATE POLICY "President and secretary can read join requests"
ON public.join_requests
FOR SELECT
TO authenticated
USING ((SELECT private.current_staff_role()) IN ('president','secretary_general'));

CREATE POLICY "President and secretary can update join requests"
ON public.join_requests
FOR UPDATE
TO authenticated
USING ((SELECT private.current_staff_role()) IN ('president','secretary_general'))
WITH CHECK (
  ((SELECT private.current_staff_role()) = 'president'
    AND status IN ('pending','needs_information','approved','declined'))
  OR
  ((SELECT private.current_staff_role()) = 'secretary_general'
    AND status IN ('pending','needs_information'))
);

REVOKE INSERT, UPDATE, DELETE ON public.staff_profiles FROM anon, authenticated;
