-- Official status confirmed in the conversation by the association treasurer on 2026-10-26.
-- All 16 founding members are currently active members of the General Assembly.
-- No membership dues/fees have been approved; do not deny voting eligibility based on unapproved dues.
UPDATE public.founding_member_roster
SET current_status = 'active',
    assembly_eligibility = 'eligible',
    review_note = concat_ws(E'\n', NULLIF(btrim(review_note), ''),
      'تثبيت رسمي وفق تأكيد أمين المال بتاريخ 2026-10-26: عضو مؤسس نشط ضمن الجمعية العامة. لا توجد اشتراكات محددة مصادق عليها حاليًا؛ تعاد مراجعة شرط الاشتراكات إذا صدر قرار صحيح باعتمادها.'),
    updated_at = now()
WHERE founder_status = 'founder'
  AND founder_number BETWEEN 1 AND 16;
