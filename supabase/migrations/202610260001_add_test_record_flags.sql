-- Distinguish records entered for testing from records confirmed in the official conversation.
-- Existing rows remain official by default; application forms explicitly mark new direct entries as test.
ALTER TABLE public.finance_transactions
  ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;
ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;
ALTER TABLE public.equipment
  ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;
ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;
ALTER TABLE public.join_requests
  ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.finance_transactions.is_test IS 'True for test entries; excluded from official financial totals and exports until confirmed in the chat.';
COMMENT ON COLUMN public.activities.is_test IS 'True for test entries; excluded from official counts and exports until confirmed in the chat.';
COMMENT ON COLUMN public.equipment.is_test IS 'True for test entries; excluded from official inventory totals and exports until confirmed in the chat.';
COMMENT ON COLUMN public.meetings.is_test IS 'True for test entries; cannot be used as an official decision or invitation source until confirmed in the chat.';
COMMENT ON COLUMN public.join_requests.is_test IS 'True for test submissions; cannot be finalized into official membership until confirmed in the chat.';
COMMENT ON COLUMN public.members.is_test IS 'True for test membership records; excluded from official membership decisions until confirmed in the chat.';
