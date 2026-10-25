# Production database reconciliation audit

Date: 2026-10-25

Supabase project reference: `lfubzohsbwdoiagfkpkt`

## Verified live state

The live database contains the public tables `activities`, `audit_log`, `equipment`, `finance_transactions`, `financial_years`, `join_request_document_requirements`, `join_request_file_submissions`, `join_request_lookup_rate_limits`, `join_request_rate_limits`, `join_requests`, `meetings`, `members`, and `staff_profiles`.

The linked project has seven active Edge Functions: `staff-admin`, `submit-join-request`, `lookup-join-request`, `submit-join-file`, `staff-join-files`, `staff-finalize-member`, and `member-activate-account`. The sources of the last five match the repository. The `staff-admin` repository source was aligned with the deployed production CORS restriction. `submit-join-request` was updated in production to version 4 and aligned with the repository to avoid trusting the leftmost `x-forwarded-for` value for rate limiting.

## Migration source discrepancy

The live Supabase migration history includes these names for which corresponding standalone SQL files were not found in the repository:
- `create_join_request_lookup_rate_limits`
- `join_request_document_requirements`
- `security_review_least_privilege_and_fk_indexes`

Do not recreate these by guessing or reapply them to production. Their exact historical SQL should be recovered from a trusted backup or reviewed against the live schema before reconstructing the original migration files. The current schema contains the related tables and policies, but that does not prove an invented migration would be equivalent or safe to replay.

## Additional policy correction applied

Migration `202610250002_consolidate_members_select_policy.sql` was applied and saved to the repository. It consolidates the two permissive `members` SELECT policies into one equivalent policy: president and secretary-general can read member records, while a member can read only their own linked record. This clears the advisor's multiple-permissive-policy warning without broadening access.

Migration `202610250003_block_unapproved_membership_fee_income.sql` was applied and saved. A database trigger now blocks new income entries classified in Arabic/English as membership subscriptions or dues until a future migration changes the rule after General Assembly approval. A rollback-only SQL probe confirmed that an unapproved subscription entry is rejected and a voluntary-contribution entry is accepted. The existing 1,000 DZD entry described as an annual subscription dated 2026-10-18 was not altered.

## Financial read-policy correction applied

Migration `202610250001_restrict_finance_read_to_finance_roles.sql` was applied to the linked project and checked into this repository. It removes deputy president from read access to finance transactions and financial years. The deputy treasurer retains read-only access; write policies remain limited to site admin, president, and treasurer.

## Current production snapshot (2026-10-25)

- All 13 public application tables have Row Level Security enabled.
- The private Storage bucket `join-request-files` is configured for PDF files only, with a 15 MiB maximum per file.
- Eight staff profiles are active. The production setup guide now reflects these existing accounts; do not run the initial-admin bootstrap SQL against production.
- The `members` table currently has zero rows; the database contains 11 join requests (5 pending, 1 needing information, and 5 provisionally approved). There is one file-submission record. These counts are a snapshot, not proof that the end-to-end workflow has been tested.
- The 2026 ledger contains a 1,000 DZD income entry described as an annual subscription. Because membership fees have not been approved, it is flagged for manual verification and was not deleted or changed. The UI now warns finance users about it; the database blocks new fee-like income entries.
- The member-policy performance warning was cleared after consolidation. The advisor still reports 16 unused indexes (informational in a new/lightly used system); do not drop them without workload evidence because several support foreign keys and expected workflows.

## Remaining operational checks

- Test public join-request submission through the `submit-join-request` Edge Function (direct anonymous table INSERT is intentionally not granted).
- Test request lookup, document upload, staff review, final approval, and member account activation with test records.
- Confirm Vercel's production project is connected to this repository and that the public URL does not require Vercel authentication.
- Review the Supabase Auth leaked-password protection warning; enable it if supported by the subscription.

Never commit project secrets, service-role keys, or user passwords to this repository.
