-- Keep the inspector's database access limited to inspection reports and related follow-ups.
-- This removes previously added read-only access to unrelated association registers.
drop policy if exists "Inspector reads association activities" on public.activities;
drop policy if exists "Inspector reads association member register" on public.association_members;
drop policy if exists "Inspector reads equipment register" on public.equipment;
drop policy if exists "Inspector reads official office roster" on public.executive_office_roster;
drop policy if exists "Inspector reads financial transactions" on public.finance_transactions;
drop policy if exists "Inspector reads financial years" on public.financial_years;
drop policy if exists "Inspector reads founding roster" on public.founding_member_roster;
drop policy if exists "Inspector reads meeting records" on public.meetings;
drop policy if exists "Inspector reads membership dues obligations" on public.membership_dues_obligations;
drop policy if exists "Inspector reads membership dues payments" on public.membership_dues_payments;
drop policy if exists "Inspector reads approved membership fee rules" on public.membership_fee_rules;
drop policy if exists "Inspector reads membership status events" on public.membership_status_events;
