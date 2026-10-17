-- Keep the staff role constraint in source control in sync with production.
ALTER TABLE public.staff_profiles
  DROP CONSTRAINT IF EXISTS staff_profiles_role_check;

ALTER TABLE public.staff_profiles
  ADD CONSTRAINT staff_profiles_role_check
  CHECK (
    role = ANY (
      ARRAY[
        'site_admin',
        'president',
        'deputy_president',
        'secretary_general',
        'treasurer',
        'deputy_secretary_general',
        'deputy_treasurer',
        'technical_director'
      ]::text[]
    )
  );
