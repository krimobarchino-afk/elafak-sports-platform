# Production database reconciliation audit

Date: 2026-10-25

Supabase project reference: `lfubzohsbwdoiagfkpkt`

## Verified live state

The live database contains the public tables `activities`, `audit_log`, `equipment`, `finance_transactions`, `financial_years`, `join_request_document_requirements`, `join_request_file_submissions`, `join_request_lookup_rate_limits`, `join_request_rate_limits`, `join_requests`, `meetings`, `members`, and `staff_profiles`.

The linked project has active Edge Functions including `lookup-join-request`, `submit-join-file`, `staff-join-files`, `staff-finalize-member`, and `member-activate-account`. Their deployed source was copied into this repository during the audit; no functions were redeployed as part of that copy.

## Migration source discrepancy

The live Supabase migration history includes these names for which corresponding standalone SQL files were not found in the repository:
- `create_join_request_lookup_rate_limits`
- `join_request_document_requirements`
- `security_review_least_privilege_and_fk_indexes`

Do not recreate these by guessing or reapply them to production. Their exact historical SQL should be recovered from a trusted backup or reviewed against the live schema before reconstructing the original migration files. The current schema contains the related tables and policies, but that does not prove an invented migration would be equivalent or safe to replay.

## Financial read-policy correction applied

Migration `202610250001_restrict_finance_read_to_finance_roles.sql` was applied to the linked project and checked into this repository. It removes deputy president from read access to finance transactions and financial years. The deputy treasurer retains read-only access; write policies remain limited to site admin, president, and treasurer.

## Remaining operational checks

- Test public join-request submission through the `submit-join-request` Edge Function (direct anonymous table INSERT is intentionally not granted).
- Test request lookup, document upload, staff review, final approval, and member account activation with test records.
- Confirm Vercel's production project is connected to this repository and that the public URL does not require Vercel authentication.
- Review the Supabase Auth leaked-password protection warning; enable it if supported by the subscription.

Never commit project secrets, service-role keys, or user passwords to this repository.
