-- Assign consecutive official numbers per register and year.
-- This fixes direct-write registers (tasks and inspection) where the UI supplied 1
-- on every insert, causing the UNIQUE(register_key, register_year, register_number)
-- constraint to reject the second and subsequent records.
create or replace function private.assign_association_register_entry_number()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  perform pg_advisory_xact_lock(hashtext(new.register_key), new.register_year);

  select coalesce(max(e.register_number), 0) + 1
    into new.register_number
    from public.association_register_entries e
   where e.register_key = new.register_key
     and e.register_year = new.register_year;

  return new;
end;
$$;

revoke all on function private.assign_association_register_entry_number() from public, anon, authenticated;

drop trigger if exists trg_assign_association_register_entry_number
  on public.association_register_entries;

create trigger trg_assign_association_register_entry_number
before insert on public.association_register_entries
for each row
execute function private.assign_association_register_entry_number();
