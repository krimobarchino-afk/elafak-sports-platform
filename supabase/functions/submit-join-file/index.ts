import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE_ORIGIN = "https://horizon-barchino.vercel.app";
const isAllowedOrigin = (origin: string | null) => origin === SITE_ORIGIN || origin === "https://horizon-git-feature-deliberation-workflow-barchino.vercel.app";
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
const clean = (v: unknown, max: number) => typeof v === "string" ? v.trim().slice(0, max) : "";
const digits = (v: string) => v.replace(/\D/g, "");

async function digest(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map(v => v.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return reply({ error: "الطريقة غير مسموحة." }, 405);
  if (!isAllowedOrigin(req.headers.get("origin")) ) return reply({ error: "مصدر الطلب غير مسموح." }, 403);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return reply({ error: "الخدمة غير متاحة مؤقتًا." }, 503);

  const length = Number(req.headers.get("content-length") || "0");
  if (length > 16 * 1024 * 1024) return reply({ error: "حجم الملف أكبر من الحد المسموح (15 ميغابايت)." }, 413);

  let form: FormData;
  try { form = await req.formData(); }
  catch { return reply({ error: "تعذر قراءة الملف المرسل." }, 400); }

  const requestRef = clean(form.get("request_ref"), 80);
  const phone = digits(clean(form.get("phone"), 40));
  const file = form.get("file");
  if (requestRef.length < 4 || phone.length < 6 || phone.length > 20 || !(file instanceof File)) {
    return reply({ error: "يرجى إدخال رقم المرجع والهاتف واختيار ملف PDF." }, 400);
  }
  if (file.size < 100 || file.size > 15 * 1024 * 1024) return reply({ error: "حجم الملف غير مقبول. الحد الأقصى 15 ميغابايت." }, 413);
  if (file.type !== "application/pdf" || !file.name.toLowerCase().endsWith(".pdf")) {
    return reply({ error: "يُقبل ملف واحد بصيغة PDF فقط." }, 415);
  }
  const firstBytes = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  if (new TextDecoder().decode(firstBytes) !== "%PDF-") return reply({ error: "محتوى الملف لا يبدو ملف PDF صالحًا." }, 415);

  const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",").map((value) => value.trim()).filter(Boolean).at(-1) || "unknown";
  const ipHash = await digest(serviceKey + ":document-upload:" + ip);
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const cutoff15m = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  await admin.from("join_request_lookup_rate_limits").delete().lt("created_at", cutoff24h);
  const { count, error: countError } = await admin.from("join_request_lookup_rate_limits")
    .select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("created_at", cutoff15m);
  if (countError) return reply({ error: "تعذر التحقق الآن. حاول لاحقًا." }, 503);
  if ((count || 0) >= 5) return reply({ error: "تجاوزت عدد محاولات الإرسال المسموح بها. حاول بعد 15 دقيقة." }, 429);
  const { error: rateError } = await admin.from("join_request_lookup_rate_limits").insert({ ip_hash: ipHash });
  if (rateError) return reply({ error: "تعذر التحقق الآن. حاول لاحقًا." }, 503);

  const { data: request, error: requestError } = await admin.from("join_requests")
    .select("id,phone,status").eq("request_ref", requestRef).maybeSingle();
  if (requestError) return reply({ error: "تعذر التحقق من الطلب الآن." }, 503);
  if (!request || digits(String(request.phone || "")) !== phone) {
    return reply({ error: "لم نتمكن من مطابقة البيانات. تحقق من رقم المرجع والهاتف." }, 404);
  }
  if (request.status !== "approved") {
    return reply({ error: "رفع الملف متاح بعد القبول المبدئي فقط." }, 403);
  }

  const { data: existing, error: existingError } = await admin.from("join_request_file_submissions")
    .select("id,status,pdf_path").eq("request_id", request.id).maybeSingle();
  if (existingError) return reply({ error: "تعذر التحقق من حالة الملف." }, 503);
  if (existing && !["awaiting_upload", "needs_correction"].includes(existing.status)) {
    return reply({ error: "الملف مستلم أو قيد المراجعة بالفعل. يرجى انتظار رد الإدارة." }, 409);
  }

  const path = request.id + "/" + crypto.randomUUID() + ".pdf";
  const bytes = await file.arrayBuffer();
  const { error: uploadError } = await admin.storage.from("join-request-files").upload(path, bytes, {
    contentType: "application/pdf", upsert: false, cacheControl: "0",
  });
  if (uploadError) {
    console.error("Private join-file upload failed:", uploadError.message);
    return reply({ error: "تعذر حفظ الملف بأمان. حاول لاحقًا." }, 500);
  }

  const now = new Date().toISOString();
  const record = {
    request_id: request.id,
    status: "submitted",
    pdf_path: path,
    submitted_at: now,
    reviewer_note: null,
    reviewed_by: null,
    reviewed_at: null,
    updated_at: now,
  };
  const { error: saveError } = await admin.from("join_request_file_submissions").upsert(record, { onConflict: "request_id" });
  if (saveError) {
    await admin.storage.from("join-request-files").remove([path]);
    console.error("Join-file metadata save failed:", saveError.code || "unknown");
    return reply({ error: "لم يكتمل تسجيل الملف. يرجى المحاولة لاحقًا." }, 500);
  }
  if (existing?.pdf_path) {
    const { error: removeError } = await admin.storage.from("join-request-files").remove([existing.pdf_path]);
    if (removeError) console.error("Superseded join file cleanup failed:", removeError.message);
  }
  return reply({ ok: true, status: "submitted", message: "تم استلام ملف PDF بنجاح. سيبقى الانخراط غير نهائي إلى حين مراجعة الوثائق وتأكيد التسديد واعتماد الإدارة." }, 201);
});