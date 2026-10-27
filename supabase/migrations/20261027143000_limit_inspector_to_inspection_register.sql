-- Keep the inspection account strictly within the inspection register.
-- Restrictive policies are ANDed with existing permissive policies, so this
-- also closes access granted by any older broad SELECT/ALL policy.
do $$
declare
  v_table text;
  v_tables text[] := array[
    'activities',
    'association_members',
    'association_settings',
    'audit_log',
    'deliberation_notifications',
    'deliberation_outputs',
    'equipment',
    'executive_office_roster',
    'executive_tasks',
    'finance_transactions',
    'financial_years',
    'founding_member_roster',
    'join_requests',
    'meetings',
    'membership_dues_obligations',
    'membership_dues_payments',
    'membership_fee_rules'
  ];
begin
  foreach v_table in array v_tables loop
    if to_regclass(format('public.%I', v_table)) is not null then
      execute format('alter table public.%I enable row level security', v_table);
      execute format(
        'drop policy if exists %I on public.%I',
        'Exclude inspection inspector from non-inspection records',
        v_table
      );
      execute format(
        'create policy %I on public.%I as restrictive for all to authenticated using ((select private.current_staff_role()) <> %L) with check ((select private.current_staff_role()) <> %L)',
        'Exclude inspection inspector from non-inspection records',
        v_table,
        'inspection_inspector',
        'inspection_inspector'
      );
    end if;
  end loop;
end $$;

-- The inspection account must still be able to read and create inspection
-- reports through the separate inspection-specific policies.
