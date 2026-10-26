import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ORIGIN = "https://horizon-barchino.vercel.app";
const headers = {
  "Access-Control-Allow-Origin": ORIGIN,
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const out = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return out({ error: "الطريقة غير مسموحة." }, 405);
  if (req.headers.get("origin") !== ORIGIN) return out({ error: "مصدر الطلب غير مسموح." }, 403);

  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return out({ error: "خدمة الاعتماد غير مهيأة." }, 503);

  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return out({ error: "يلزم تسجيل الدخول." }, 401);

  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: auth, error: authError } = await admin.auth.getUser(token);
  if (authError || !auth.user) return out({ error: "جلسة غير صالحة." }, 401);

  const { data: actor, error: actorError } = await admin.from("staff_profiles")
    .select("role,is_active").eq("user_id", auth.user.id).maybeSingle();
  if (actorError || !actor || actor.role !== "president" || actor.is_active !== true) {
    return out({ error: "الاعتماد النهائي وإنشاء حساب المنخرط من صلاحية الرئيس فقط." }, 403);
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return out({ error: "الطلب غير صالح." }, 400); }
  const fileId = typeof body.file_id === "string" ? body.file_id : "";
  if (!fileId) return out({ error: "معرّف ملف الانخراط مطلوب." }, 400);

  const { data: file, error: fileError } = await admin.from("join_request_file_submissions")
    .select("id,request_id,status,payment_confirmed,final_approved_at,final_approved_by,join_requests!inner(id,request_ref,full_name,email,status,is_test)")
    .eq("id", fileId).maybeSingle();
  if (fileError || !file) return out({ error: "ملف الانخراط غير موجود." }, 404);

  const request = Array.isArray(file.join_requests) ? file.join_requests[0] : file.join_requests;
  if (request?.is_test === true) {
    return out({ error: "هذا الطلب موسوم كتجريبي، ولا يمكن إنشاء عضوية رسمية منه قبل تأكيده في المحادثة وتغيير تصنيفه إداريًا." }, 409);
  }
  if (!request || request.status !== "approved") {
    return out({ error: "الطلب لم يحصل على القبول المبدئي من الرئيس." }, 409);
  }
  const email = typeof request.email === "string" ? request.email.trim().toLowerCase() : "";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return out({ error: "لا يمكن إنشاء الحساب قبل تسجيل بريد إلكتروني صحيح في طلب الانخراط." }, 400);
  }
  if (file.payment_confirmed !== true) {
    return out({ error: "لا يمكن الاعتماد النهائي قبل تأكيد أمين المال للتسديد." }, 409);
  }
  if (file.status !== "ready_for_final_approval" && file.status !== "finalized") {
    return out({ error: "يجب أن ينهي الرئيس أو الأمين العام مراجعة الملف قبل الاعتماد النهائي." }, 409);
  }

  const now = new Date().toISOString();
  if (file.status !== "finalized") {
    const { data: updated, error: updateError } = await admin.from("join_request_file_submissions")
      .update({
        status: "finalized",
        final_approved_by: auth.user.id,
        final_approved_at: now,
        updated_at: now,
      })
      .eq("id", fileId)
      .eq("status", "ready_for_final_approval")
      .eq("payment_confirmed", true)
      .select("id").maybeSingle();
    if (updateError || !updated) {
      return out({ error: "تعذر تثبيت الاعتماد النهائي؛ أعد تحميل الملف وتحقق من حالته." }, 409);
    }
  } else if (!file.final_approved_at || !file.final_approved_by) {
    return out({ error: "حالة الملف غير متسقة؛ يلزم فحص إداري قبل إنشاء الحساب." }, 409);
  }

  let { data: member, error: memberLookupError } = await admin.from("members")
    .select("id,member_no,user_id,account_status,membership_status")
    .eq("join_request_id", request.id).maybeSingle();
  if (memberLookupError) {
    console.error("Member lookup failed:", memberLookupError.code || "unknown");
    return out({ error: "تعذر تحميل سجل المنخرط." }, 500);
  }

  if (!member) {
    const { data: inserted, error: insertError } = await admin.from("members")
      .insert({ join_request_id: request.id, created_by: auth.user.id, account_status: "awaiting_account" })
      .select("id,member_no,user_id,account_status,membership_status").single();
    if (insertError || !inserted) {
      console.error("Member insert failed:", insertError?.code || "unknown");
      return out({ error: "تم تسجيل الاعتماد النهائي، لكن تعذر إنشاء سجل المنخرط؛ أعد المحاولة أو راجع الإدارة." }, 500);
    }
    member = inserted;
  }

  if (member.user_id) {
    return out({
      ok: true,
      finalized: true,
      member_no: member.member_no,
      account_status: member.account_status,
      message: "الانخراط معتمد وسجل المنخرط موجود، والحساب مرتبط بالفعل.",
    });
  }

  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: ORIGIN + "/member.html",
    data: { member_no: member.member_no },
  });
  if (inviteError || !invited.user) {
    console.error("Member invite failed:", inviteError?.name || "unknown");
    return out({
      ok: true,
      finalized: true,
      member_no: member.member_no,
      account_status: "awaiting_account",
      account_created: false,
      message: "الانخراط معتمد وسجل المنخرط محفوظ، لكن تعذر إرسال دعوة الحساب. يمكن إعادة المحاولة بعد معالجة سبب البريد أو إعدادات البريد.",
    }, 202);
  }

  const { error: linkError } = await admin.from("members").update({
    user_id: invited.user.id,
    account_status: "invitation_pending",
    updated_at: new Date().toISOString(),
  }).eq("id", member.id).is("user_id", null);

  if (linkError) {
    console.error("Member account link failed:", linkError.code || "unknown");
    return out({
      ok: true,
      finalized: true,
      member_no: member.member_no,
      account_created: true,
      account_linked: false,
      message: "أُنشئ حساب الدعوة بعد الاعتماد النهائي، لكن تعذر ربطه بسجل المنخرط. أوقف إعادة المحاولة اليدوية وراجع الإدارة.",
    }, 202);
  }

  return out({
    ok: true,
    finalized: true,
    member_no: member.member_no,
    account_status: "invitation_pending",
    message: "تم الاعتماد النهائي وإنشاء سجل المنخرط وإرسال دعوة الحساب إلى البريد المسجل.",
  }, 201);
});