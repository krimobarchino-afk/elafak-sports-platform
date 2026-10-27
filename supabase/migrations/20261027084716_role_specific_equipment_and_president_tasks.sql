-- Equipment register: restricted to the president and treasurer.
DROP POLICY IF EXISTS "Staff read equipment" ON public.equipment;
DROP POLICY IF EXISTS "Technical roles insert equipment" ON public.equipment;
DROP POLICY IF EXISTS "Technical roles update equipment" ON public.equipment;
DROP POLICY IF EXISTS "President deletes equipment" ON public.equipment;

CREATE POLICY "President and treasurer read equipment"
ON public.equipment FOR SELECT TO authenticated
USING ((SELECT private.current_staff_role()) IN ('president', 'treasurer'));

CREATE POLICY "President and treasurer insert equipment"
ON public.equipment FOR INSERT TO authenticated
WITH CHECK (
  (SELECT private.current_staff_role()) IN ('president', 'treasurer')
  AND (entered_by IS NULL OR entered_by = (SELECT auth.uid()))
);

CREATE POLICY "President and treasurer update equipment"
ON public.equipment FOR UPDATE TO authenticated
USING ((SELECT private.current_staff_role()) IN ('president', 'treasurer'))
WITH CHECK ((SELECT private.current_staff_role()) IN ('president', 'treasurer'));

CREATE POLICY "President deletes equipment"
ON public.equipment FOR DELETE TO authenticated
USING ((SELECT private.current_staff_role()) = 'president');

CREATE TABLE IF NOT EXISTS public.executive_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 3 AND 180),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 5000),
  assigned_to text NOT NULL DEFAULT '' CHECK (char_length(assigned_to) <= 180),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  due_date date,
  completion_note text NOT NULL DEFAULT '' CHECK (char_length(completion_note) <= 3000),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  is_test boolean NOT NULL DEFAULT false,
  CONSTRAINT executive_tasks_completion_consistency
    CHECK ((status = 'completed' AND completed_at IS NOT NULL) OR (status <> 'completed' AND completed_at IS NULL))
);

ALTER TABLE public.executive_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "President manages executive tasks" ON public.executive_tasks;
CREATE POLICY "President manages executive tasks"
ON public.executive_tasks FOR ALL TO authenticated
USING ((SELECT private.current_staff_role()) = 'president')
WITH CHECK (
  (SELECT private.current_staff_role()) = 'president'
  AND created_by = (SELECT auth.uid())
);

CREATE INDEX IF NOT EXISTS executive_tasks_status_due_date_idx
ON public.executive_tasks (status, due_date);

COMMENT ON TABLE public.executive_tasks IS
'President-only task and assignment register. Access is enforced by RLS; task records do not grant office or voting status.';
COMMENT ON TABLE public.equipment IS
'Association equipment register; read/write limited to president and treasurer, deletion limited to president.';
