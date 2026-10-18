-- Seed only official meeting facts already supplied by the association.
-- Titles/dates are used for idempotence; no attendee names or missing details are invented.
insert into public.meetings
  (title, meeting_type, meeting_date, location, attendees_count, quorum_note, decisions, minutes_text, status)
select
  'اجتماع المكتب التنفيذي', 'executive', date '2026-02-02',
  'المركب الرياضي الجواري، حي السلام، الشلف', null, null,
  'انعقد الاجتماع برئاسة رحماني محمد.',
  'التاريخ والوقت المسجلان: 02/02/2026 على الساعة 15:30. لا تُضاف تفاصيل أخرى إلى المحضر إلا بعد الرجوع إلى الوثيقة الرسمية.',
  'draft'
where not exists (select 1 from public.meetings where title='اجتماع المكتب التنفيذي' and meeting_date=date '2026-02-02');

insert into public.meetings
  (title, meeting_type, meeting_date, location, attendees_count, quorum_note, decisions, minutes_text, status)
select
  'الجمعية العامة العادية — المحاولة الأولى', 'general_assembly', date '2026-02-10',
  null, null, 'لم يتحقق النصاب القانوني المطلوب (الثلثان).',
  'تعذر عقد الجمعية العامة في هذه المحاولة لعدم تحقق النصاب؛ تقرر عقدها في جلسة مؤجلة.',
  'التاريخ والوقت المسجلان: 10/02/2026 على الساعة 17:00. مكان الاجتماع وعدد الحاضرين الفعلي غير مثبتين هنا.',
  'draft'
where not exists (select 1 from public.meetings where title='الجمعية العامة العادية — المحاولة الأولى' and meeting_date=date '2026-02-10');

insert into public.meetings
  (title, meeting_type, meeting_date, location, attendees_count, quorum_note, decisions, minutes_text, status)
select
  'الجمعية العامة العادية — الاجتماع المؤجل', 'general_assembly', date '2026-02-16',
  'المركب الرياضي الجواري فرجي عبد القادر، حي السلام، الشلف', 11,
  'حضور 11 من أصل 16 مؤسسًا.',
  'المصادقة بالإجماع عن طريق الاقتراع على التقارير المعروضة.',
  'انعقد الاجتماع المؤجل يوم 16/02/2026 على الساعة 17:00. تُستكمل تفاصيل المحضر من النسخة الرسمية المعتمدة عند توفرها.',
  'approved'
where not exists (select 1 from public.meetings where title='الجمعية العامة العادية — الاجتماع المؤجل' and meeting_date=date '2026-02-16');
