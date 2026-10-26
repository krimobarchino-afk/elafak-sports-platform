-- Enforce test-only classification for all normal API writes.
-- Trusted server-side service_role workflows and database administrators may
-- create/reclassify official rows after the user confirms them in the conversation.

CREATE OR REPLACE FUNCTION private.enforce_test_record_flags()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
DECLARE
  request_role text := coalesce(current_setting('request.jwt.claim.role', true), '');
BEGIN
  IF current_user IN ('postgres', 'supabase_admin') OR request_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.is_test := true;
  ELSIF NEW.is_test IS DISTINCT FROM OLD.is_test THEN
    RAISE EXCEPTION 'The test/official classification can only be changed by a trusted administrative workflow after chat confirmation.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_test_flag_finance_transactions ON public.finance_transactions;
CREATE TRIGGER enforce_test_flag_finance_transactions
BEFORE INSERT OR UPDATE ON public.finance_transactions
FOR EACH ROW EXECUTE FUNCTION private.enforce_test_record_flags();

DROP TRIGGER IF EXISTS enforce_test_flag_activities ON public.activities;
CREATE TRIGGER enforce_test_flag_activities
BEFORE INSERT OR UPDATE ON public.activities
FOR EACH ROW EXECUTE FUNCTION private.enforce_test_record_flags();

DROP TRIGGER IF EXISTS enforce_test_flag_equipment ON public.equipment;
CREATE TRIGGER enforce_test_flag_equipment
BEFORE INSERT OR UPDATE ON public.equipment
FOR EACH ROW EXECUTE FUNCTION private.enforce_test_record_flags();

DROP TRIGGER IF EXISTS enforce_test_flag_meetings ON public.meetings;
CREATE TRIGGER enforce_test_flag_meetings
BEFORE INSERT OR UPDATE ON public.meetings
FOR EACH ROW EXECUTE FUNCTION private.enforce_test_record_flags();

DROP TRIGGER IF EXISTS enforce_test_flag_join_requests ON public.join_requests;
CREATE TRIGGER enforce_test_flag_join_requests
BEFORE INSERT OR UPDATE ON public.join_requests
FOR EACH ROW EXECUTE FUNCTION private.enforce_test_record_flags();

DROP TRIGGER IF EXISTS enforce_test_flag_members ON public.members;
CREATE TRIGGER enforce_test_flag_members
BEFORE INSERT OR UPDATE ON public.members
FOR EACH ROW EXECUTE FUNCTION private.enforce_test_record_flags();
