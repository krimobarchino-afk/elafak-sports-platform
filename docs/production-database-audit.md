# Production database reconciliation audit

Date: 2026-10-25

Supabase project reference: `lfubzohsbwdoiagfkpkt`

## Verified live state

The live database contains the public tables `activities`, `audit_log`, `equipment`, `finance_transactions`, `financial_years`, `join_request_document_requirements`, `join_request_file_submissions`, `join_request_lookup_rate_limits`, `join_request_rate_limits`, `join_requests`, `meetings`, `members`, and `staff_profiles`.

The linked project has seven active Edge Functions: `staff-admin`, `submit-join-request`, `lookup-join-request`, `submit-join-file`, `staff-join-files`, `staff-finalize-member`, and `member-activate-account`. All seven deployed Edge Function sources now match the corresponding repository files. `staff-admin` retains the production CORS restriction. `submit-join-request` is deployed as version 4 and uses the rightmost forwarded address as a fallback rather than trusting the leftmost `x-forwarded-for` value for rate limiting.

## Migration source discrepancy

The live Supabase migration history includes these names for which corresponding standalone SQL files were not found in the repository:
- `create_join_request_lookup_rate_limits`
- `join_request_document_requirements`
- `security_review_least_privilege_and_fk_indexes`

Do not recreate these by guessing or reapply them to production. Their exact historical SQL should be recovered from a trusted backup or reviewed against the live schema before reconstructing the original migration files. The current schema contains the related tables and policies, but that does not prove an invented migration would be equivalent or safe to replay.

## Additional policy correction applied

Migration `202610250002_consolidate_members_select_policy.sql` was applied and saved to the repository. It consolidates the two permissive `members` SELECT policies into one equivalent policy: president and secretary-general can read member records, while a member can read only their own linked record. This clears the advisor's multiple-permissive-policy warning without broadening access.

Migration `202610250003_block_unapproved_membership_fee_income.sql` was applied and saved. A database trigger blocks new income entries classified as membership subscriptions until a General Assembly decision approves the fee. Migration `202610250004_decision_driven_membership_fee_settings.sql` adds the protected `association_settings` table and binds the annual fee to an approved General Assembly meeting and an exact excerpt from its decisions/minutes. Migration `202610250005_tighten_decision_source_validation.sql` further requires the excerpt to explicitly mention the fee and contain the amount being activated. The management interface can suggest a fee amount from the report text, but requires the president/site admin to verify and confirm it; the database rejects a source that is not an approved General Assembly report. After activation, new fee-like income must match the approved amount. The existing 1,000 DZD entry described as an annual subscription dated 2026-10-18 was not altered.

## Financial read-policy correction applied

Migration `202610250001_restrict_finance_read_to_finance_roles.sql` was applied to the linked project and checked into this repository. It removes deputy president from read access to finance transactions and financial years. The deputy treasurer retains read-only access; write policies remain limited to site admin, president, and treasurer.

## Current production snapshot (2026-10-25)

- All 13 public application tables have Row Level Security enabled.
- The private Storage bucket `join-request-files` is configured for PDF files only, with a 15 MiB maximum per file.
- Eight staff profiles are active. The production setup guide now reflects these existing accounts; do not run the initial-admin bootstrap SQL against production.
- The `members` table currently has zero rows; the database contains 11 join requests (5 pending, 1 needing information, and 5 provisionally approved). There is one file-submission record. These counts are a snapshot, not proof that the end-to-end workflow has been tested.
- The 2026 ledger contains a 1,000 DZD income entry described as an annual subscription. It remains flagged for manual verification and was not deleted or changed. A decision-driven settings workflow now requires a president/site admin to link the fee to an approved General Assembly record before new subscription income is allowed.
- The member-policy performance warning was cleared after consolidation. The advisor still reports 16 unused indexes (informational in a new/lightly used system); do not drop them without workload evidence because several support foreign keys and expected workflows.

## Decision-driven operations

The first decision-linked rule is implemented for the annual membership fee. Other decision types (such as approved activity plans, equipment purchases, training, and budgets) are not yet auto-applied; they should be added as explicit, typed actions with source-meeting references and approval gates rather than interpreting arbitrary report prose as executable instructions.

## Remaining operational checks

- Test public join-request submission through the `submit-join-request` Edge Function (direct anonymous table INSERT is intentionally not granted).
- Test request lookup, document upload, staff review, final approval, and member account activation with test records.
- Confirm Vercel's production project is connected to this repository and that the public URL does not require Vercel authentication.
- Review the Supabase Auth leaked-password protection warning; enable it if supported by the subscription.

Never commit project secrets, service-role keys, or user passwords to this repository.


## Fresh free development environment (2026-10-27)

A separate free-tier development Supabase project was created for the feature branch:
- Name: `elafak-sports-dev`
- Project ref: `yflokiwvbbxtjjpdhned`
- Region: `eu-west-1`
- API URL: `https://yflokiwvbbxtjjpdhned.supabase.co`

The development database was built without copying production rows. Its 28 public application tables had RLS enabled; all operational tables were empty at the schema check. Six rows in `executive_office_roster` are static position placeholders only (president/deputies/secretary/treasurer); their holder names remain NULL. The founding-member roster is empty and the UI now offers manual insertion from verified documents.

The original tracked migrations were found to omit the historical schema source for `members`, `join_request_document_requirements`, `join_request_file_submissions`, `join_request_lookup_rate_limits`, and `executive_office_roster`. The feature branch adds fresh-environment migrations reconstructed against reviewed production schema metadata. They are not claimed to be exact recovery of the original historical SQL and must not be run against production as a replacement for missing migration history.

Historical-data seeds have been removed from the fresh-environment path: no 2025 accounting entries or opening balances, no historical meeting rows, no founder names, and no automatic founder active/eligibility decisions. A private `join-request-files` Storage bucket was added to development with PDF-only type and 15 MiB maximum.

Seven Edge Functions were deployed to the development project using the feature-branch sources. The static client configuration now selects production only for the exact hostname `horizon-barchino.vercel.app`; preview and local hosts default to the development project. The known preview alias was added to the function CORS allowlist. The main production project, its schema, its Auth accounts, its Storage files and its operational rows were not modified by this development setup.

Validation performed: browser JavaScript syntax parsing succeeded for all six page scripts and the configuration file; static checks confirmed one config script tag is loaded before the page script on all six pages. The Supabase Security Advisor returned no security lints for the development schema. Performance Advisor reports informational foreign-key index and multiple-permissive-policy warnings; review these as load develops, and do not delete unused indexes without workload evidence.

Still required before calling the workflow fully tested or merging PR #24: configure Authentication URL/redirect allowlist for the stable preview host in the development project, create a separate development site-admin user, confirm Vercel's latest preview build and target, and test authentication, public request submission/lookup/file upload, role permissions, official-register visibility and inspector read-only boundaries with test data only.
