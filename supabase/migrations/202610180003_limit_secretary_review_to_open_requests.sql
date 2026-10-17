-- A secretary general may process only requests that are still awaiting review.
-- This prevents reopening a request after the president has made a final decision.
DROP POLICY IF EXISTS "President and secretary can update join requests" ON public.join_requests;

CREATE POLICY "President and secretary can update join requests"
ON public.join_requests
FOR UPDATE
TO authenticated
USING (
  (SELECT private.current_staff_role()) = 'president'
  OR (
    (SELECT private.current_staff_role()) = 'secretary_general'
    AND status IN ('pending', 'needs_information')
  )
)
WITH CHECK (
  (
    (SELECT private.current_staff_role()) = 'president'
    AND status IN ('pending', 'needs_information', 'approved', 'declined')
  )
  OR (
    (SELECT private.current_staff_role()) = 'secretary_general'
    AND status IN ('pending', 'needs_information')
  )
);
