import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors = {
  "Access-Control-Allow-Origin": "https://horizon-barchino.vercel.app",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const out = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return out({ error: "الطريقة غير مسموحة." }, 405);
  if (req.headers.get("origin") !== "https://horizon-barchino.vercel.app") return out({ error: "مصدر الطلب غير مسموح." }, 403);
  const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return out({ error: "خدمة الملفات غير مهيأة." }, 503);
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return out({ error: "يلزم تسجيل الدخول." }, 401);
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: auth, error: authError } = await admin.auth.getUser(token);
  if (authError || !auth.user) return out({ error: "جلسة غير صالحة." }, 401);
  const { data: actor, error: actorError } = await admin.from("staff_profiles")
    .select("role,is_active").eq("user_id", auth.user.id).maybeSingle();
  if (actorError || !actor || actor.is_active !== true) return out({ error: "الحساب غير مخول أو معطل." }, 403);
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return out({ error: "الطلب غير صالح." }, 400); }
  const action = typeof body.action === "string" ? body.action : "";
  const role = actor.role;
  if (!["president", "secretary_general", "treasurer"].includes(role)) return out({ error: "غير مخول لعرض ملفات الانخراط." }, 403);

  if (action === "list") {
    const { data, error } = await admin.from("join_request_file_submissions")
      .select("id,request_id,status,pdf_path,submitted_at,reviewer_note,reviewed_at,payment_confirmed,payment_confirmed_at,final_approved_at,join_requests!inner(request_ref,full_name)")
      .order("submitted_at", { ascending: false });
    if (error) {
      console.error("Staff join-file list failed:", error.code || "unknown");
      return out({ error: "تعذر تحميل ملفات الانخراط." }, 500);
    }
    return out({ files: (data || []).map((x: any) => ({
      id: x.id, request_id: x.request_id, status: x.status, submitted_at: x.submitted_at,
      reviewer_note: x.reviewer_note, reviewed_at: x.reviewed_at,
      payment_confirmed: x.payment_confirmed, payment_confirmed_at: x.payment_confirmed_at,
      final_approved_at: x.final_approved_at,
      request_ref: x.join_requests?.request_ref, full_name: x.join_requests?.full_name,
      
    })) });
  }
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return out({ error: "معرّف الملف مطلوب." }, 400);
  const { data: record, error: recordError } = await admin.from("join_request_file_submissions")
    .select("id,request_id,status,pdf_path,payment_confirmed").eq("id", id).maybeSingle();
  if (recordError || !record) return out({ error: "ملف الانخراط غير موجود." }, 404);

  if (action === "signed_url") {
    if (role === "treasurer") return out({ error: "صلاحية أمين المال مالية فقط، ولا تشمل الاطلاع على وثائق الهوية أو الملف الشخصي." }, 403);
    const { data, error } = await admin.storage.from("join-request-files").createSignedUrl(record.pdf_path, 60);
    if (error || !data?.signedUrl) return out({ error: "تعذر إنشاء رابط خاص مؤقت للملف." }, 500);
    return out({ url: data.signedUrl, expires_in: 60 });
  }

  if (action === "review") {
    if (!["president", "secretary_general"].includes(role)) return out({ error: "المراجعة متاحة للرئيس والأمين العام فقط." }, 403);
    const next = typeof body.status === "string" ? body.status : "";
    const note = typeof body.note === "string" ? body.note.trim().slice(0, 1500) : "";
    if (!["in_review", "needs_correction", "ready_for_final_approval"].includes(next)) return out({ error: "حالة المراجعة غير صالحة." }, 400);
    if (!["submitted", "in_review", "needs_correction", "ready_for_final_approval"].includes(record.status)) return out({ error: "لا يمكن تغيير حالة هذا الملف الآن." }, 409);
    if (next === "needs_correction" && note.length < 3) return out({ error: "اكتب ملاحظة واضحة توضح ما يجب تصحيحه." }, 400);
    const now = new Date().toISOString();
    const { error } = await admin.from("join_request_file_submissions").update({
      status: next, reviewer_note: note || null, reviewed_by: auth.user.id, reviewed_at: now, updated_at: now,
    }).eq("id", id);
    if (error) return out({ error: "تعذر حفظ قرار المراجعة." }, 500);
    return out({ ok: true });
  }

  if (action === "confirm_payment") {
    if (role !== "treasurer") return out({ error: "تأكيد التسديد من صلاحية أمين المال فقط." }, 403);
    if (record.payment_confirmed) return out({ error: "التسديد مؤكد مسبقًا." }, 409);
    if (!["submitted", "in_review", "ready_for_final_approval"].includes(record.status)) return out({ error: "لا يمكن تأكيد التسديد في حالة الملف الحالية." }, 409);
    const now = new Date().toISOString();
    const { error } = await admin.from("join_request_file_submissions").update({
      payment_confirmed: true, payment_confirmed_by: auth.user.id, payment_confirmed_at: now, updated_at: now,
    }).eq("id", id).eq("payment_confirmed", false);
    if (error) return out({ error: "تعذر تسجيل تأكيد التسديد." }, 500);
    return out({ ok: true });
  }
  return out({ error: "إجراء غير معروف." }, 400);
});