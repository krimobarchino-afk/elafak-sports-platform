import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const jsonHeaders = {
  "Access-Control-Allow-Origin": "https://horizon-barchino.vercel.app",
  "Access-Control-Allow-Headers": "apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: jsonHeaders });
const clean = (v: unknown, max: number): string =>
  typeof v === "string" ? v.trim().slice(0, max) : "";
const allowedInterests = new Set(["paragliding", "hiking", "volunteering"]);

async function digest(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map((v) => v.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: jsonHeaders });
  if (req.method !== "POST") return reply({ error: "الطريقة غير مسموحة." }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return reply({ error: "خدمة الإرسال غير مهيأة." }, 503);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("invalid");
  } catch {
    return reply({ error: "تعذر معالجة الطلب. يرجى مراجعة البيانات والمحاولة مجددًا." }, 400);
  }

  // Basic bot checks: an off-screen honeypot and a minimum time to complete the form.
  if (clean(body.website, 200) !== "") return reply({ error: "تعذر معالجة الطلب. يرجى مراجعة البيانات والمحاولة مجددًا." }, 400);
  const startedAt = Number(body.form_started_at);
  const elapsed = Date.now() - startedAt;
  if (!Number.isFinite(startedAt) || elapsed < 2500 || elapsed > 2 * 60 * 60 * 1000) {
    return reply({ error: "يرجى إعادة فتح النموذج وإكماله ثم المحاولة مجددًا." }, 400);
  }

  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const clientIp = forwarded || req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || "unknown";
  const ipHash = await digest(serviceKey + ":" + clientIp);
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  // Keep only a short rolling window and cap submissions per source IP.
  await admin.from("join_request_rate_limits").delete().lt("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  const windowStart = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { count, error: countError } = await admin
    .from("join_request_rate_limits")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", windowStart);
  if (countError) return reply({ error: "تعذر إرسال الطلب الآن. يرجى المحاولة لاحقًا." }, 503);
  if ((count || 0) >= 5) return reply({ error: "تم تجاوز عدد المحاولات المسموح به مؤقتًا. يرجى المحاولة بعد قليل." }, 429);
  const { error: rateError } = await admin.from("join_request_rate_limits").insert({ ip_hash: ipHash });
  if (rateError) return reply({ error: "تعذر إرسال الطلب الآن. يرجى المحاولة لاحقًا." }, 503);

  const full_name = clean(body.full_name, 160);
  const municipality = clean(body.municipality, 100);
  const phone = clean(body.phone, 40);
  const email = clean(body.email, 254) || null;
  const experience = clean(body.experience, 1500) || null;
  const birth_date = clean(body.birth_date, 10) || null;
  const interests = Array.isArray(body.interests)
    ? [...new Set(body.interests.filter((v): v is string => typeof v === "string" && allowedInterests.has(v))]
    : [];

  if (full_name.length < 3 || municipality.length < 2 || phone.length < 6 ||
      (email !== null && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)) ||
      interests.length < 1 || interests.length > 3 || body.consent !== true) {
    return reply({ error: "يرجى التحقق من الحقول المطلوبة والموافقة على معالجة البيانات." }, 400);
  }
  if (birth_date !== null) {
    const parsed = new Date(birth_date + "T00:00:00Z");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birth_date) || Number.isNaN(parsed.getTime()) ||
        parsed.toISOString().slice(0, 10) !== birth_date || parsed.getTime() > Date.now()) {
      return reply({ error: "تاريخ الميلاد غير صالح." }, 400);
    }
  }

  const { data, error } = await admin.from("join_requests").insert({
    full_name, birth_date, municipality, phone, email, interests, experience, consent: true,
    status: "pending", reviewer_note: null, reviewed_at: null,
  }).select("request_ref").single();

  if (error || !data) {
    console.error("Join request insert failed:", error?.code || "unknown");
    return reply({ error: "لم نتمكن من إرسال الطلب الآن. يرجى المحاولة لاحقًا." }, 503);
  }
  return reply({ ok: true, request_ref: data.request_ref }, 201);
});
