# إعداد Supabase — منصة جمعية الأفق

## الحالة
- نموذج طلب الانخراط العام يرسل إلى Edge Function `submit-join-request`؛ لا يُسمح للزوار بالإدخال المباشر في `public.join_requests`.
- وظيفة الإرسال تتحقق من الحقول والموافقة، وتستخدم حقلًا خادعًا مخفيًا ووقتًا أدنى لإكمال النموذج، وتحدّ الإرسال إلى 5 محاولات لكل مصدر IP خلال 15 دقيقة. تحفظ بصمة IP مجزأة مؤقتًا فقط في `public.join_request_rate_limits`.
- بوابة الموظفين في `/staff.html` تستخدم Supabase Auth؛ أسماء المستخدمين ترتبط بهويات دخول داخلية على نطاق `.invalid` ولا يُطلب البريد الشخصي.
- سياسة مراجعة الطلبات تسمح بالاطلاع للرئيس والأمين العام ومدير الموقع، وتسمح بالاعتماد النهائي للرئيس ومدير الموقع فقط.
- إدارة الحسابات عبر Edge Function `staff-admin` محصورة بحساب نشط دوره `site_admin`.
- لا يُنشأ حساب من نموذج الانخراط. الرسوم والباقات مجمّدة حتى مصادقة الجمعية العامة.

## الترحيلات
- `supabase/migrations/202610150001_initial_join_requests.sql`
- `supabase/migrations/202610170001_staff_profiles.sql`
- `supabase/migrations/202610170002_staff_join_request_review_policies.sql`
- `supabase/migrations/202610180001_add_deputy_president_role.sql`
- `supabase/migrations/202610180002_restrict_join_request_access.sql`
- `supabase/migrations/202610180003_limit_secretary_review_to_open_requests.sql`
- `supabase/migrations/202610180004_join_request_rate_limits.sql`
- `supabase/migrations/202610180005_route_public_join_requests_through_edge_function.sql`
- `supabase/migrations/202610180006_full_management_modules.sql`
- `supabase/migrations/202610180007_seed_official_meetings.sql`
- `supabase/migrations/202610180008_tighten_management_role_visibility.sql`
- `supabase/migrations/202610250001_restrict_finance_read_to_finance_roles.sql`
- `supabase/migrations/202610250002_consolidate_members_select_policy.sql`
- `supabase/migrations/202610250003_block_unapproved_membership_fee_income.sql`
- `supabase/migrations/202610250004_decision_driven_membership_fee_settings.sql`
- `supabase/migrations/202610250005_tighten_decision_source_validation.sql`
- `supabase/migrations/202610250006_founding_member_review_roster.sql`
- `supabase/migrations/202610250007_add_dynamic_meeting_minutes_fields.sql`
- `supabase/migrations/202610260001_add_test_record_flags.sql`
- `supabase/migrations/202610260002_enforce_test_record_flags.sql`
- `supabase/migrations/202610260003_confirm_founders_active_general_assembly.sql`
- `supabase/migrations/202610260004_membership_dues_lifecycle_foundation.sql`
- `supabase/migrations/202610260005_restrict_finance_to_president_treasurer.sql`
- `supabase/migrations/202610270001_inspection_reports_role.sql`
- `supabase/migrations/20261027084716_role_specific_equipment_and_president_tasks.sql`
- `supabase/migrations/20261027093609_restrict_inspector_to_inspection_records.sql`
- `supabase/migrations/20261027101303_restore_inspector_read_only_oversight_access.sql`
- `supabase/migrations/20261027121500_deliberation_outputs_workflow.sql`
- `supabase/migrations/20261027122500_deliberation_workflow_rls_transitions.sql`
- `supabase/migrations/20261027123000_consolidate_deliberation_update_policy.sql`
- `supabase/migrations/20261027131500_shared_deliberation_workspace.sql`
- `supabase/migrations/20261027140000_inspection_register_shared_with_bureau.sql`
- `supabase/migrations/20261027143000_limit_inspector_to_inspection_register.sql`
- `supabase/migrations/20261027150000_official_record_draft_workflow.sql`
- `supabase/migrations/20261027153000_inspector_official_draft_isolation.sql`
- `supabase/migrations/202610160001_membership_primitives.sql`
- `supabase/migrations/202610180009_membership_document_access_policies.sql`
- `supabase/migrations/20261027090000_executive_office_roster_schema.sql`
- `supabase/migrations/20261027160000_private_join_request_storage.sql`

## حالة حسابات المكتب الحالية
تم التحقق من قاعدة الإنتاج بتاريخ 2026-10-25: يوجد 8 حسابات موظفين نشطة بالفعل، تشمل `siteadmin` و`president` و`deputy.president` و`secretary` و`deputy.secretary` و`treasurer` و`deputy.treasurer` و`technical`.
لا تنفذ إجراء إنشاء المدير الأول على قاعدة الإنتاج الحالية، ولا تعِد إدخال صفوف `staff_profiles` يدويًا. كلمات المرور غير محفوظة في هذا المستند؛ إذا تعذر الدخول، يعاد تعيين كلمة المرور من مسار إداري موثوق دون مشاركة كلمة المرور أو حفظها في GitHub.

## تهيئة بيئة جديدة فقط
عند إنشاء بيئة Supabase جديدة خالية، أنشئ مستخدم `siteadmin@staff.elafak.invalid` من Authentication → Users، ثم أضف صف `site_admin` المرتبط بمعرّف المستخدم الفعلي في `staff_profiles`. لا تنفذ هذا الإجراء على قاعدة الإنتاج القائمة.

## بيئة التطوير المجانية ومبدأ البداية الفارغة

- مشروع التطوير المنفصل: `elafak-sports-dev`، المرجع `yflokiwvbbxtjjpdhned`، المنطقة `eu-west-1`. رابط API هو `https://yflokiwvbbxtjjpdhned.supabase.co`.
- أُنشئت البنية في هذا المشروع من دون نقل بيانات الإنتاج. تحقق الفحص من وجود 28 جدولًا عامًا، وكل جدول مفعّل عليه RLS، وكانت جميع جداول السجلات التشغيلية فارغة وقت الفحص.
- عُدّلت ترحيلات التهيئة حتى لا تُدخل تلقائيًا أرصدة أو حركات مالية قديمة أو اجتماعات سابقة أو أسماء المؤسسين أو حالاتهم. أدخل المعلومات السابقة لاحقًا يدويًا/باستيراد مقصود بعد مراجعة المستندات الرسمية.
- الملفات `202610160001_membership_primitives.sql` و`202610180009_membership_document_access_policies.sql` و`20261027090000_executive_office_roster_schema.sql` تعيد بناء جداول كانت موجودة في قاعدة الإنتاج ولم يكن ملف إنشائها التاريخي محفوظًا كاملًا في المستودع. اعتمدت على بنية قاعدة الإنتاج التي تمت مراجعتها، لكنها ليست استرجاعًا حرفيًا للترحيلات التاريخية الأصلية. هذه الترحيلات مخصصة لبيئة التطوير الجديدة، ولا تُطبّق رجعيًا على الإنتاج.
- نُشرت وظائف Edge السبعة في مشروع التطوير: `submit-join-request` و`lookup-join-request` و`submit-join-file` و`staff-admin` و`staff-join-files` و`staff-finalize-member` و`member-activate-account`. هذا يؤكد النشر فقط، وليس اكتمال اختبار مسار الانخراط من البداية إلى النهاية.
- أُنشئت الحاوية الخاصة `join-request-files` للملفات بصيغة PDF فقط وبحد أقصى 15 MiB. تبقى خاصة؛ تتم عمليات الرفع والاطلاع عبر وظائف الخادم وصلاحياتها.

## فصل الإنتاج عن المعاينة

- ملف `/supabase-config.js` يختار مشروع الإنتاج فقط عندما يكون المضيف بالضبط `horizon-barchino.vercel.app`. معاينات Vercel وسير العمل المحلي تستخدم مشروع التطوير المنفصل افتراضيًا.
- يستخدم كل مشروع مفتاحًا منشورًا (publishable) مختلفًا ومفتاح تخزين جلسة مستقلًا. لا توضع مفاتيح الخدمة أو كلمات المرور في واجهة الموقع أو المستودع.
- قاعدة الإنتاج الحالية `lfubzohsbwdoiagfkpkt` تحتوي معلومات وسجلات قائمة؛ لا تحذفها أو تفرغها لجعل الواجهة تبدو فارغة. لم تُطبق ترحيلات هذا العمل على الإنتاج.
- قبل اعتبار المعاينة جاهزة للاختبار الفعلي، تحقق من نجاح بناء Vercel، ثم اختبر تسجيل الدخول والصلاحيات وكل مسار Edge Function باستخدام حسابات وسجلات اختبار فقط. لا تدمج PR قبل هذه الفحوصات.

## السجلات الرسمية

- السجل المحاسبي وسجل العتاد ومحاضر الاجتماعات ومخرجات المداولة تبدأ فارغة في مشروع التطوير. لا يُنشأ عام مالي أو رصيد افتتاحي أو عملية إيراد/مصروف تلقائيًا.
- لا توجد رسوم أو باقات انخراط مفعلة أو مفترضة. لا تضف رسومًا إلى الواجهة أو سجل المالية حتى صدور قرار صحيح من الجمعية العامة ومراجعته ضمن مسار الاعتماد.
- بيانات العتاد لا تُسجّل إلا بعد الجرد والتحقق الفعلي. وتُدخل المحاضر القديمة بعد مطابقتها مع النسخ الرسمية، مع عدم اختلاق التفاصيل غير المتوفرة.
- المفتش يطّلع فقط على السجلات الرسمية المعتمدة/المسجلة (المحاسبة، جرد العتاد، ومخرجات المداولة المعتمدة والمرقمة) وتقاريره ومتابعاته؛ لا يُمنح صلاحية إدخال أو اعتماد سجلات الجمعية الأخرى.
- سجل المهام والتكليفات للرئيس فقط. مدير الموقع حساب إداري تقني وليس منصبًا في المكتب التنفيذي، والمدير التقني الولائي دور وظيفي لا ينشئ عضوية في المكتب التنفيذي أو حق تصويت.
- صادرات CSV/JSON من الواجهة لا تُعد بديلًا عن النسخ الاحتياطي الكامل من لوحة Supabase.

## أمان وتشغيل
- لا تضع مفتاح service-role/secret أو كلمة مرور في الواجهة أو GitHub.
- وظيفة `staff-admin` تتحقق من هوية المستخدم ودوره النشط قبل إنشاء الحسابات أو تعديلها.
- وظيفة `submit-join-request` عامة لاستقبال الطلبات فقط، وتستخدم مفتاح الخدمة من جهة الخادم ولا تكشفه للواجهة.
- `staff_profiles` محمي بـ RLS ولا يستطيع الموظف تعديل دوره بنفسه.
- تعطيل الحساب يمنع طلبات قاعدة البيانات الجديدة عبر فحص الدور النشط؛ لا تعتبر الاختبار مكتملًا قبل تجربة كل دور بحساب مستقل.
- راجع Security Advisor بعد أي تغيير سياسات.


## سجل مراجعة الأعضاء المؤسسين
- الترحيل `202610250006_founding_member_review_roster.sql` ينشئ سجلًا منفصلًا للمؤسسين الـ16، ويبدأ حالة كل عضو وأهلية الجمعية العامة بـ«قيد المراجعة» دون افتراض النشاط أو الأهلية ودون إنشاء حركات مالية.
- تعديل الحالات متاح للرئيس والأمين العام ومدير الموقع؛ الاطلاع متاح لأدوار المكتب المحددة. يجب مراجعة كل حالة وفق النظام الأساسي والوثائق الرسمية قبل اختيار «مؤهل للمشاركة».
- مولّد استدعاءات الجمعية العامة موجّه لجميع المؤسسين الـ16 المسجلين دون استبعاد أي اسم بسبب حالة المراجعة أو أهلية التصويت. طباعة الاستدعاء لا تثبت تبليغه أو استلامه، ولا تحسم أهلية التصويت.
- تنص المادة 12 من القانون الأساسي المحفوظ في المكتبة على فقدان صفة العضو بسبب «عدم دفع الاشتراكات لمدة سنة». لذلك لا يؤدي اعتماد المبلغ وحده إلى إسقاط العضوية؛ يجب توثيق مبلغ الاشتراك وتاريخ استحقاقه، ثم مراجعة مرور سنة دون دفع قبل تحديث حالة العضو وفق النظام الأساسي. لا يغيّر مولّد الاستدعاءات حالة العضوية آليًا.


## نموذج محضر الاجتماع المتغير
- الترحيل `202610250007_add_dynamic_meeting_minutes_fields.sql` يضيف حقولًا اختيارية لساعة البداية والرفع، رئيس الاجتماع، الحضور، جدول الأعمال، المناقشات والمرفقات إلى `meetings`.
- تبقى الحقول القديمة كما هي، ولا يتطلب الترحيل إدخال بيانات سابقة. يحفظ النموذج الجديد الحقول المنظمة لتظهر عند إعادة فتح المحضر والطباعة.
- إنشاء نص المحضر لا يعني اعتماده؛ يبقى المحضر مسودة إلى أن يعتمده صاحب الصلاحية وفق إجراءات الجمعية.
