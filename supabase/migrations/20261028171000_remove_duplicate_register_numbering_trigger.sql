-- Remove the redundant numbering trigger added during diagnosis.
-- The existing private.number_direct_association_register_entry trigger already
-- validates role-specific direct writes and assigns the official sequential number.
drop trigger if exists trg_assign_association_register_entry_number
  on public.association_register_entries;
drop function if exists private.assign_association_register_entry_number();
