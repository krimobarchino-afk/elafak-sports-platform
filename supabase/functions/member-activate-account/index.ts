import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const ORIGIN = "https://horizon-barchino.vercel.app";
const isAllowedOrigin = (origin: string | null) => origin === ORIGIN || origin === "https://horizon-git-feature-deliberation-workflow-barchino.vercel.app";
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const out = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return out({ error: "الطريقة غير مسموحة." }, 405);
  if (!isAllowedOrigin(req.headers.get("origin"))) return out({ error: "مصدر الطلب غير مسموح." }, 403);
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return out({ error: "خدمة تفعيل الحساب غير مهيأة." }, 503);
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return out({ error: "يلزم تسجيل الدخول." }, 401);
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: auth, error: authError } = await admin.auth.getUser(token);
  if (authError || !auth.user) return out({ error: "جلسة غير صالحة." }, 401);
  const { data: member, error: memberError } = await admin.from("members")
    .select("id,account_status,membership_status").eq("user_id", auth.user.id).maybeSingle();
  if (memberError || !member) return out({ error: "لا يوجد سجل انخراط مرتبط بهذا الحساب." }, 404);
  if (member.membership_status !== "active") {
    return out({ error: "حالة الانخراط لا تسمح بتفعيل الحساب حاليًا." }, 403);
  }
  if (member.account_status === "active") return out({ ok: true, message: "الحساب مفعّل بالفعل." });
  if (member.account_status !== "invitation_pending") {
    return out({ error: "حالة الحساب لا تسمح بالتفعيل." }, 409);
  }
  const { error } = await admin.from("members").update({
    account_status: "active",
    updated_at: new Date().toISOString(),
  }).eq("id", member.id).eq("user_id", auth.user.id).eq("account_status", "invitation_pending");
  if (error) {
    console.error("Member activation failed:", error.code || "unknown");
    return out({ error: "تعذر تفعيل الحساب. يرجى المحاولة لاحقًا." }, 500);
  }
  return out({ ok: true, message: "تم تفعيل حساب المنخرط." });
});