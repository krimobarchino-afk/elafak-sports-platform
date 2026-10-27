-- Keep the inspection account strictly within the inspection register.
-- Restrictive policies are ANDed with existing permissive policies, closing
-- access granted by any older broad SELECT/ALL policy without changing access
-- for other authenticated roles.
do $$
declare
  v_table text;
begin
  for v_table in
    select tablename
    from pg_tables
    where schemaname = 'public'
      and tablename not in ('inspection_reports','inspection_followups','staff_profiles')
  loop
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
  end loop;
end $$;

-- The inspection account can still read and create its own reports through
-- inspection-specific policies. It cannot edit submitted reports or alter
-- administrative drafts, financial records, equipment, membership, or tasks.
