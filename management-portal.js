(()=>{
"use strict";
const URL="https://lfubzohsbwdoiagfkpkt.supabase.co";
const KEY="sb_publishable_tCZjOnFHLIeQHF0mR9tVFA_9bu4lLrJ";
const STORAGE_KEY="sb-lfubzohsbwdoiagfkpkt-auth-token";
const $=id=>document.getElementById(id);
const EXEC=["president","deputy_president","secretary_general","deputy_secretary_general","treasurer","deputy_treasurer"];
const ROUTES={
 site_admin:{title:"مدير الموقع",description:"الإدارة التقنية للحسابات والإعدادات المصرح بها.",href:"/staff.html?entry=site_admin"},
 president:{title:"المكتب التنفيذي",description:"فضاء المكتب التنفيذي وفق الصلاحيات المرتبطة بمنصبك.",href:"/management.html?entry=executive"},
 deputy_president:{title:"المكتب التنفيذي",description:"فضاء المكتب التنفيذي وفق الصلاحيات المرتبطة بمنصبك.",href:"/management.html?entry=executive"},
 secretary_general:{title:"المكتب التنفيذي",description:"فضاء المكتب التنفيذي وفق الصلاحيات المرتبطة بمنصبك.",href:"/management.html?entry=executive"},
 deputy_secretary_general:{title:"المكتب التنفيذي",description:"فضاء المكتب التنفيذي وفق الصلاحيات المرتبطة بمنصبك.",href:"/management.html?entry=executive"},
 treasurer:{title:"المكتب التنفيذي",description:"فضاء المكتب التنفيذي وفق الصلاحيات المرتبطة بمنصبك.",href:"/management.html?entry=executive"},
 deputy_treasurer:{title:"المكتب التنفيذي",description:"فضاء المكتب التنفيذي وفق الصلاحيات المرتبطة بمنصبك.",href:"/management.html?entry=executive"},
 technical_director:{title:"المدير التقني الولائي",description:"فضاء المهام التقنية والرياضية المخصص لحسابك.",href:"/management.html?entry=technical_director"},
 inspection_inspector:{title:"التفتيش والمراقبة",description:"المسار المستقل لمفتش الشباب والرياضة، مع التحقق من الدور عند فتح الصفحة.",href:"/inspection.html?entry=inspection_inspector"}
};
let sb=null;
function message(text,kind=""){const el=$("portal-login-msg");el.textContent=text;el.className="portal-msg"+(kind?" "+kind:"")}
function showDestination(profile){
 const route=ROUTES[profile.role];
 if(!route){throw new Error("لا يوجد مسار دخول معتمد لهذا الدور. لم نُنشئ مسارًا افتراضيًا؛ راجع مدير الموقع.");}
 $("portal-login").hidden=true;
 $("portal-destination").hidden=false;
 $("portal-role-title").textContent="مرحبًا، "+profile.username;
 $("portal-route-title").textContent=route.title;
 $("portal-route-description").textContent=route.description;
 $("portal-route-link").href=route.href;
 $("portal-route-msg").textContent="تم التحقق من الحساب النشط. لا تعرض هذه البوابة أي مسارات أخرى لهذا الحساب.";
}
async function resolveCurrentSession(){
 const {data:{user},error}=await sb.auth.getUser();
 if(error)throw error;
 if(!user)return;
 const {data,error:profileError}=await sb.from("staff_profiles").select("username,role,is_active,is_frozen").eq("user_id",user.id).maybeSingle();
 if(profileError)throw profileError;
 if(!data||!data.is_active||data.is_frozen){await sb.auth.signOut();throw new Error("الحساب غير موجود أو غير مفعّل أو مجمّد.");}
 showDestination(data);
}
async function login(e){
 e.preventDefault();
 const f=new FormData(e.currentTarget),username=String(f.get("username")||"").trim().toLowerCase(),password=String(f.get("password")||""),btn=$("portal-login-btn");
 btn.disabled=true;message("جارٍ التحقق من الحساب…");
 try{
  const {error}=await sb.auth.signInWithPassword({email:username+"@staff.elafak.invalid",password});
  if(error)throw error;
  await resolveCurrentSession();
 }catch(err){
  await sb.auth.signOut();
  $("portal-login").hidden=false;$("portal-destination").hidden=true;
  message(err?.message||"تعذر تسجيل الدخول. تحقق من اسم المستخدم وكلمة المرور.","error");
 }finally{btn.disabled=false}
}
addEventListener("DOMContentLoaded",async()=>{
 if(!window.supabase){message("تعذر تحميل خدمة الدخول. تحقق من اتصال الإنترنت.","error");return}
 sb=window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storage:window.localStorage,storageKey:STORAGE_KEY}});
 $("portal-login-form").addEventListener("submit",login);
 $("portal-logout").addEventListener("click",async()=>{await sb.auth.signOut();window.location.replace("/")});
 try{await resolveCurrentSession()}catch(err){message(err?.message||"تعذر التحقق من الجلسة.","error")}
});
})();