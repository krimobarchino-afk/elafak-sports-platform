import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-bootstrap-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const respond = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
const internalEmail = (username: string) => `${username.toLowerCase()}@staff.elafak.invalid`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return respond({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const bootstrapToken = Deno.env.get("BOOTSTRAP_ADMIN_TOKEN");
  if (!url || !anonKey || !serviceKey) return respond({ error: "Server configuration incomplete" }, 500);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  try {
    const body = await req.json();
    const action = body?.action;

    if (action === "bootstrap") {
      if (!bootstrapToken || req.headers.get("x-bootstrap-token") !== bootstrapToken) {
        return respond({ error: "غير مصرح." }, 401);
      }
      const { count, error: countError } = await admin
        .from("staff_profiles")
        .select("user_id", { count: "exact", head: true })
        .eq("role", "platform_admin");
      if (countError) return respond({ error: "تعذر التحقق من إعداد المسؤول." }, 500);
      if ((count ?? 0) > 0) return respond({ error: "تم إنشاء مسؤول المنصة بالفعل." }, 409);

      const username = String(body.username || "").trim().toLowerCase();
      const password = String(body.password || "");
      const fullName = String(body.full_name || "").trim();
      if (!/^[a-zA-Z0-9_]{4,32}$/.test(username) || password.length < 12 || fullName.length < 2) {
        return respond({ error: "أدخل اسم مستخدم صحيحًا، واسمًا كاملًا، وكلمة مرور لا تقل عن 12 محرفًا." }, 400);
      }

      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email: internalEmail(username),
        password,
        email_confirm: true,
        user_metadata: { username, full_name: fullName },
      });
      if (createError || !created.user) return respond({ error: "تعذر إنشاء حساب المسؤول." }, 400);

      const { error: profileError } = await admin.from("staff_profiles").insert({
        user_id: created.user.id,
        username,
        full_name: fullName,
        role: "platform_admin",
        active: true,
        must_change_password: false,
      });
      if (profileError) {
        await admin.auth.admin.deleteUser(created.user.id);
        return respond({ error: "تعذر حفظ بيانات المسؤول." }, 500);
      }
      return respond({ message: "تم إنشاء حساب مسؤول المنصة. احذف سر التهيئة بعد ذلك." }, 201);
    }

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return respond({ error: "يلزم تسجيل الدخول." }, 401);
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData.user) return respond({ error: "جلسة غير صالحة." }, 401);

    const { data: actor, error: actorError } = await admin
      .from("staff_profiles")
      .select("role, active, must_change_password")
      .eq("user_id", authData.user.id)
      .maybeSingle();
    if (actorError || !actor?.active) {
      return respond({ error: "الحساب غير نشط أو غير صالح." }, 403);
    }

    // The password update happens server-side so the temporary password cannot be bypassed
    // by simply clearing a client-side flag.
    if (action === "change_own_password") {
      const newPassword = String(body.new_password || "");
      if (newPassword.length < 12) {
        return respond({ error: "يجب أن تتكون كلمة المرور الجديدة من 12 محرفًا على الأقل." }, 400);
      }
      const { error: passwordError } = await admin.auth.admin.updateUserById(authData.user.id, {
        password: newPassword,
      });
      if (passwordError) return respond({ error: "تعذر تحديث كلمة المرور." }, 400);
      const { error: profileError } = await admin.from("staff_profiles")
        .update({ must_change_password: false, updated_at: new Date().toISOString() })
        .eq("user_id", authData.user.id);
      if (profileError) return respond({ error: "تغيرت كلمة المرور لكن تعذر تحديث حالة الحساب. تواصل مع مسؤول المنصة." }, 500);
      return respond({ message: "تم تغيير كلمة المرور بنجاح." });
    }

    if (actor.role !== "platform_admin") {
      return respond({ error: "هذه العملية متاحة لمسؤول المنصة فقط." }, 403);
    }

    if (action === "create_staff") {
      const username = String(body.username || "").trim().toLowerCase();
      const password = String(body.temporary_password || "");
      const fullName = String(body.full_name || "").trim();
      const role = String(body.role || "");
      const allowedRoles = [
        "president", "secretary_general", "treasurer",
        "deputy_president", "deputy_secretary_general", "deputy_treasurer",
      ];
      if (!/^[a-zA-Z0-9_]{4,32}$/.test(username) || password.length < 12 ||
          fullName.length < 2 || !allowedRoles.includes(role)) {
        return respond({ error: "تحقق من اسم المستخدم والاسم الكامل والدور وكلمة المرور المؤقتة (12 محرفًا على الأقل)." }, 400);
      }

      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email: internalEmail(username),
        password,
        email_confirm: true,
        user_metadata: { username, full_name: fullName },
      });
      if (createError || !created.user) return respond({ error: "تعذر إنشاء الحساب. تحقق من عدم تكرار اسم المستخدم." }, 400);

      const { error: profileError } = await admin.from("staff_profiles").insert({
        user_id: created.user.id,
        username,
        full_name: fullName,
        role,
        active: true,
        must_change_password: true,
        created_by: authData.user.id,
      });
      if (profileError) {
        await admin.auth.admin.deleteUser(created.user.id);
        return respond({ error: "تعذر حفظ صلاحيات الحساب." }, 500);
      }
      return respond({ message: "تم إنشاء حساب العضو. سلّمه كلمة المرور المؤقتة عبر قناة آمنة." }, 201);
    }

    if (action === "deactivate_staff") {
      const targetId = String(body.user_id || "");
      if (!targetId || targetId === authData.user.id) {
        return respond({ error: "لا يمكن تعطيل الحساب الحالي أو معرّف غير صالح." }, 400);
      }
      const { data: target } = await admin.from("staff_profiles")
        .select("role").eq("user_id", targetId).maybeSingle();
      if (!target || target.role === "platform_admin") {
        return respond({ error: "لا يمكن تعطيل مسؤول المنصة من هذه الواجهة." }, 403);
      }
      const { error } = await admin.from("staff_profiles")
        .update({ active: false, updated_at: new Date().toISOString() }).eq("user_id", targetId);
      if (error) return respond({ error: "تعذر تعطيل الحساب." }, 500);
      return respond({ message: "تم تعطيل الحساب." });
    }

    return respond({ error: "إجراء غير معروف." }, 400);
  } catch {
    return respond({ error: "تعذر إتمام العملية." }, 400);
  }
});
