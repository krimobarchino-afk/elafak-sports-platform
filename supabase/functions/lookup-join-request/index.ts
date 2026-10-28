import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });
const clean = (v: unknown, max: number) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";
const digits = (v: string) => v.replace(/\D/g, "");

async function digest(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map(v => v.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return reply({ error: "الطريقة غير مسموحة." }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return reply({ error: "الخدمة غير متاحة مؤقتًا." }, 503);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("invalid");
  } catch {
    return reply({ error: "يرجى إدخال رقم المرجع ورقم الهاتف بصورة صحيحة." }, 400);
  }

  const requestRef = clean(body.request_ref, 80);
  const phone = digits(clean(body.phone, 40));
  if (requestRef.length < 4 || phone.length < 6 || phone.length > 20) {
    return reply({ error: "يرجى التحقق من رقم المرجع ورقم الهاتف." }, 400);
  }

  const ip = req.headers.get("cf-connecting-ip")
    || req.headers.get("x-real-ip")
    || req.headers.get("x-forwarded-for")?.split(",").map((value) => value.trim()).filter(Boolean).at(-1)
    || "unknown";
  const ipHash = await digest(serviceKey + ":lookup:" + ip);
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const cutoff15m = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  await admin.from("join_request_lookup_rate_limits").delete().lt("created_at", cutoff24h);
  const { count, error: countError } = await admin
    .from("join_request_lookup_rate_limits")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", cutoff15m);
  if (countError) return reply({ error: "تعذر التحقق الآن. يرجى المحاولة لاحقًا." }, 503);
  if ((count || 0) >= 5) {
    return reply({ error: "تجاوزت عدد محاولات المتابعة المسموح به مؤقتًا. حاول بعد 15 دقيقة." }, 429);
  }
  const { error: rateError } = await admin.from("join_request_lookup_rate_limits").insert({ ip_hash: ipHash });
  if (rateError) return reply({ error: "تعذر التحقق الآن. يرجى المحاولة لاحقًا." }, 503);

  const { data, error } = await admin
    .from("join_requests")
    .select("id,phone,status")
    .eq("request_ref", requestRef)
    .maybeSingle();

  // Do not reveal whether a reference exists if either credential does not match.
  if (error) {
    console.error("Join request lookup query failed:", error.code || "unknown");
    return reply({ error: "تعذر التحقق الآن. يرجى المحاولة لاحقًا." }, 503);
  }
  if (!data || digits(String(data.phone || "")) !== phone) {
    return reply({ error: "لم نتمكن من مطابقة البيانات. تحقق من رقم المرجع والهاتف وحاول مجددًا." }, 404);
  }

  const status = String(data.status || "");
  const messages: Record<string, { label: string; message: string }> = {
    pending: {
      label: "قيد المراجعة",
      message: "استلمت الجمعية طلبك، وهو قيد المراجعة. لا يلزمك إجراء إضافي في هذه المرحلة.",
    },
    needs_information: {
      label: "يتطلب استكمال المعلومات",
      message: "يرجى التواصل مع الجمعية عبر قنواتها الرسمية لاستلام التعليمات الخاصة باستكمال الطلب.",
    },
    approved: {
      label: "مقبول مبدئيًا",
      message: "الطلب مقبول مبدئيًا فقط. يرجى اتباع تعليمات استكمال الملف لدى الجمعية. هذا لا يعني الانخراط النهائي ولا يفعّل حسابًا.",
    },
    declined: {
      label: "لم تتم الموافقة على الطلب",
      message: "لم تتم الموافقة على الطلب. للاستفسار، تواصل مع الجمعية عبر قنواتها الرسمية.",
    },
  };
  const result = messages[status] || {
    label: "قيد المعالجة",
    message: "الطلب قيد المعالجة. يرجى التواصل مع الجمعية عبر قنواتها الرسمية عند الحاجة.",
  };
  let requirements: { title: string; description: string | null; is_required: boolean }[] = [];
  if (status === "approved") {
    const { data: requirementRows, error: requirementsError } = await admin
      .from("join_request_document_requirements")
      .select("title,description,is_required")
      .eq("is_enabled", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (requirementsError) {
      console.error("Join request requirements query failed:", requirementsError.code || "unknown");
    } else {
      requirements = (requirementRows || []).slice(0, 30);
    }
  }
  let fileStatus: string | null = null;
  let correctionNote: string | null = null;
  if (status === "approved") {
    const { data: fileRecord, error: fileError } = await admin
      .from("join_request_file_submissions")
      .select("status,reviewer_note")
      .eq("request_id", data.id)
      .maybeSingle();
    if (fileError) {
      console.error("Join file status query failed:", fileError.code || "unknown");
    } else if (fileRecord) {
      fileStatus = String(fileRecord.status || "");
      correctionNote = fileStatus === "needs_correction" ? (typeof fileRecord.reviewer_note === "string" ? fileRecord.reviewer_note.slice(0, 1500) : null) : null;
    }
  }
  const fileMessages: Record<string, string> = {
    awaiting_upload: "يمكنك الآن إيداع ملف PDF بعد تجهيزه وفق تعليمات الجمعية.",
    submitted: "استلمت الجمعية ملفك، وهو بانتظار المراجعة. لا ترسل نسخة أخرى ما لم تطلب الإدارة التصحيح.",
    in_review: "ملفك قيد المراجعة لدى الإدارة.",
    needs_correction: "طلبت الإدارة تصحيح الملف. راجع الملاحظة التي وصلتك من الجمعية ثم أعد الإيداع.",
    ready_for_final_approval: "اكتملت مراجعة الملف، وتبقى الاعتماد النهائي من الإدارة وتأكيد التسديد.",
    finalized: "تم اعتماد ملف الانخراط نهائيًا. تواصل مع الجمعية بشأن الخطوة التالية الخاصة بالحساب."
  };
  return reply({ ok: true, status, status_label: result.label, message: result.message, requirements, file_status: fileStatus, correction_note: correctionNote, file_message: fileStatus ? (fileMessages[fileStatus] || "ملفك قيد المعالجة.") : null });
});