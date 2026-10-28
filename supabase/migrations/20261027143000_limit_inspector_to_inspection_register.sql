-- Final inspector policy model:
-- The inspector's data access is limited to inspection reports and their follow-ups.
-- All other association registers (finance, equipment, meetings, deliberations,
-- membership, activities, tasks, staff administration, notifications and audit logs)
-- remain out of scope. The staff profile is retained only for role/session checks.
--
-- Drop the older blanket restrictive policy first (if a prior draft of this
-- migration was applied), so these exact exceptions can be re-established.
do $$
declare
  v_table text;
begin
  for v_table in
    select tablename from pg_tables where schemaname = 'public'
  loop
    execute format(
      'drop policy if exists %I on public.%I',
      'Exclude inspection inspector from non-inspection records',
      v_table
    );
  end loop;

  for v_table in
    select tablename
    from pg_tables
    where schemaname = 'public'
      and tablename not in (
        'inspection_reports',
        'inspection_followups',
        'staff_profiles'
      )
  loop
    execute format('alter table public.%I enable row level security', v_table);
    execute format(
      'create policy %I on public.%I as restrictive for all to authenticated using (coalesce((select private.current_staff_role()), %L) <> %L) with check (coalesce((select private.current_staff_role()), %L) <> %L)',
      'Exclude inspection inspector from non-inspection records',
      v_table,
      '',
      'inspection_inspector',
      '',
      'inspection_inspector'
    );
  end loop;
end $$;

-- Replace broad legacy oversight policies on the permitted register tables
-- with explicit read policies. The inspector cannot read test rows.
drop policy if exists "Inspector oversight read finance_transactions" on public.finance_transactions;
create policy "Inspector reads official accounting register"
  on public.finance_transactions for select to authenticated
  using ((select private.current_staff_role()) = 'inspection_inspector'
         and coalesce(is_test, false) = false);

drop policy if exists "Inspector oversight read financial_years" on public.financial_years;
create policy "Inspector reads financial register years"
  on public.financial_years for select to authenticated
  using ((select private.current_staff_role()) = 'inspection_inspector');

drop policy if exists "Inspector oversight read equipment" on public.equipment;
create policy "Inspector reads official inventory register"
  on public.equipment for select to authenticated
  using ((select private.current_staff_role()) = 'inspection_inspector'
         and coalesce(is_test, false) = false);

drop policy if exists "Inspector oversight read meetings" on public.meetings;
create policy "Inspector reads approved meeting register"
  on public.meetings for select to authenticated
  using ((select private.current_staff_role()) = 'inspection_inspector'
         and status = 'approved'
         and coalesce(is_test, false) = false);

drop policy if exists "Inspector reads official deliberation register" on public.deliberation_outputs;
create policy "Inspector reads official deliberation register"
  on public.deliberation_outputs for select to authenticated
  using ((select private.current_staff_role()) = 'inspection_inspector'
         and status = 'approved'
         and register_year is not null
         and register_number is not null);

-- Restrictive read filters protect these registers from any other permissive
-- SELECT policies that may have been created earlier.
drop policy if exists "Inspector sees official accounting rows only" on public.finance_transactions;
create policy "Inspector sees official accounting rows only"
  on public.finance_transactions as restrictive for select to authenticated
  using ((select private.current_staff_role()) is distinct from 'inspection_inspector'
         or coalesce(is_test, false) = false);

drop policy if exists "Inspector sees official inventory rows only" on public.equipment;
create policy "Inspector sees official inventory rows only"
  on public.equipment as restrictive for select to authenticated
  using ((select private.current_staff_role()) is distinct from 'inspection_inspector'
         or coalesce(is_test, false) = false);

drop policy if exists "Inspector sees approved meeting rows only" on public.meetings;
create policy "Inspector sees approved meeting rows only"
  on public.meetings as restrictive for select to authenticated
  using ((select private.current_staff_role()) is distinct from 'inspection_inspector'
         or (status = 'approved' and coalesce(is_test, false) = false));

drop policy if exists "Inspector sees numbered approved deliberation rows only" on public.deliberation_outputs;
create policy "Inspector sees numbered approved deliberation rows only"
  on public.deliberation_outputs as restrictive for select to authenticated
  using ((select private.current_staff_role()) is distinct from 'inspection_inspector'
         or (status = 'approved' and register_year is not null and register_number is not null));

-- Read access never implies permission to write. Add restrictive write guards
-- even if a permissive policy is broadened later.
do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'finance_transactions',
    'financial_years',
    'equipment',
    'meetings',
    'deliberation_outputs'
  ]
  loop
    execute format('alter table public.%I enable row level security', v_table);

    execute format('drop policy if exists %I on public.%I',
      'Inspector cannot insert official register records', v_table);
    execute format(
      'create policy %I on public.%I as restrictive for insert to authenticated with check (coalesce((select private.current_staff_role()), %L) <> %L)',
      'Inspector cannot insert official register records', v_table, '', 'inspection_inspector'
    );

    execute format('drop policy if exists %I on public.%I',
      'Inspector cannot update official register records', v_table);
    execute format(
      'create policy %I on public.%I as restrictive for update to authenticated using (coalesce((select private.current_staff_role()), %L) <> %L) with check (coalesce((select private.current_staff_role()), %L) <> %L)',
      'Inspector cannot update official register records', v_table, '', 'inspection_inspector', '', 'inspection_inspector'
    );

    execute format('drop policy if exists %I on public.%I',
      'Inspector cannot delete official register records', v_table);
    execute format(
      'create policy %I on public.%I as restrictive for delete to authenticated using (coalesce((select private.current_staff_role()), %L) <> %L)',
      'Inspector cannot delete official register records', v_table, '', 'inspection_inspector'
    );
  end loop;
end $$;

-- The inspection account remains able to read inspection_reports and
-- inspection_followups via their dedicated inspection policies, and cannot
-- view administrative drafts, membership, activities, roster, or tasks.
