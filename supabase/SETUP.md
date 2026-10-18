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
- `supabase/migrations/202610180004_join_request_rate_limits.sql`
- `supabase/migrations/202610180005_route_public_join_requests_through_edge_function.sql`

## إنشاء أول مدير — مطلوب قبل الاختبار
لا يوجد حساب مدير موقع حتى الآن؛ لا يمكن إنشاء أول مدير بأمان من صفحة عامة. من لوحة Supabase:
1. افتح Authentication → Users وأنشئ مستخدمًا بالبريد `siteadmin@staff.elafak.invalid` وكلمة مرور قوية، مع تأكيد البريد إن ظهر الخيار.
2. انسخ UUID للحساب.
3. في SQL Editor نفّذ التالي بعد استبدال القيمة بالـ UUID الفعلي:
```sql
insert into public.staff_profiles (user_id, username, role, is_active)
values ('PUT_AUTH_USER_UUID_HERE'::uuid, 'siteadmin', 'site_admin', true);
```
لا تضع كلمة المرور في SQL أو GitHub. هذه خطوة bootstrap واحدة؛ بعد ذلك أنشئ الحسابات الأخرى من `/staff.html`.

## أسماء الدخول المقترحة
- `siteadmin` — مدير الموقع (التهيئة الأولى أعلاه).
- `president` — الرئيس.
- `secretary` — الأمين العام.
- `treasurer` — أمين المال.
- `deputy.secretary` — نائب الأمين العام.
- `deputy.treasurer` — نائب أمين المال.
- `technical` — المدير التقني.

الأسماء الأخرى ليست حسابات منشأة حتى الآن؛ ينشئها مدير الموقع مع كلمة مرور أولية لا تقل عن 12 خانة. يمكن تعديل الاسم والدور وإعادة تعيين كلمة المرور لاحقًا.

## أمان وتشغيل
- لا تضع مفتاح service-role/secret أو كلمة مرور في الواجهة أو GitHub.
- وظيفة `staff-admin` تتحقق من هوية المستخدم ودوره النشط قبل إنشاء الحسابات أو تعديلها.
- وظيفة `submit-join-request` عامة لاستقبال الطلبات فقط، وتستخدم مفتاح الخدمة من جهة الخادم ولا تكشفه للواجهة.
- `staff_profiles` محمي بـ RLS ولا يستطيع الموظف تعديل دوره بنفسه.
- تعطيل الحساب يمنع طلبات قاعدة البيانات الجديدة عبر فحص الدور النشط؛ لا تعتبر الاختبار مكتملًا قبل تجربة كل دور بحساب مستقل.
- راجع Security Advisor بعد أي تغيير سياسات.
