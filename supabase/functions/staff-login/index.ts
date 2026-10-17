import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const respond = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return respond({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) return respond({ error: "Server configuration incomplete" }, 500);

  try {
    const { username, password } = await req.json();
    if (typeof username !== "string" || typeof password !== "string" ||
        !/^[a-zA-Z0-9_]{4,32}$/.test(username) || password.length < 1) {
      return respond({ error: "اسم المستخدم أو كلمة المرور غير صحيحة." }, 400);
    }

    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const normalized = username.toLowerCase();
    const { data: profile, error: profileError } = await admin
      .from("staff_profiles")
      .select("user_id, username, active")
      .ilike("username", normalized)
      .maybeSingle();

    if (profileError) return respond({ error: "تعذر التحقق من الحساب." }, 500);
    if (!profile || !profile.active) return respond({ error: "اسم المستخدم أو كلمة المرور غير صحيحة." }, 401);

    const { data: authUser, error: userError } = await admin.auth.admin.getUserById(profile.user_id);
    if (userError || !authUser.user?.email) return respond({ error: "تعذر التحقق من الحساب." }, 401);

    const publicClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await publicClient.auth.signInWithPassword({
      email: authUser.user.email,
      password,
    });
    if (error || !data.session) return respond({ error: "اسم المستخدم أو كلمة المرور غير صحيحة." }, 401);

    return respond({ session: data.session, user: { id: profile.user_id, username: profile.username } });
  } catch {
    return respond({ error: "تعذر إتمام تسجيل الدخول." }, 400);
  }
});
