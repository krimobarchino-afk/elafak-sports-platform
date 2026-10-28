-- Ensure fixed executive-office position placeholders exist. These are reference slots,
-- not historical names or claims about who held office in the past.
insert into public.executive_office_roster (position_key, position_label) values
  ('president', 'الرئيس'),
  ('deputy_president', 'نائب الرئيس'),
  ('secretary_general', 'الأمين العام'),
  ('deputy_secretary_general', 'نائب الأمين العام'),
  ('treasurer', 'أمين المال'),
  ('deputy_treasurer', 'نائب أمين المال')
on conflict (position_key) do nothing;
