(()=>{
"use strict";
const CONFIG=window.ElAfakSupabaseConfig;
if(!CONFIG) throw new Error("Supabase configuration is missing");
const URL=CONFIG.url;
const KEY=CONFIG.key;
const STORAGE_KEY=CONFIG.storageKey;
const $=id=>document.getElementById(id);
const EXEC=["president","deputy_president","secretary_general","deputy_secretary_general","treasurer","deputy_treasurer"];
const ROUTES={
 site_admin:{title:"مدير الموقع",description:"الإدارة التقنية للحسابات والإعدادات المصرح بها.",href:"/staff.html?entry=site_admin"},
 president:{title:"فضاء الرئيس",description:"الإشراف العام، المهام والتكليفات، ومراجعة واعتماد السجلات وفق الإجراءات والصلاحيات المعتمدة.",href:"/management.html?entry=president"},
 deputy_president:{title:"فضاء نائب الرئيس",description:"متابعة الأعمال والمهام المفوضة إليك، دون صلاحيات تلقائية على السجلات المالية أو سجل العتاد.",href:"/management.html?entry=deputy_president"},
 secretary_general:{title:"فضاء الأمين العام",description:"المراسلات والأرشيف والاجتماعات والمحاضر ومتابعة طلبات الانخراط ضمن الصلاحيات المعتمدة.",href:"/management.html?entry=secretary_general"},
 deputy_secretary_general:{title:"فضاء نائب الأمين العام",description:"متابعة الأعمال المسندة إليك في الشؤون الإدارية دون اعتماد السجلات أو تعديلها خارج التفويض.",href:"/management.html?entry=deputy_secretary_general"},
 treasurer:{title:"فضاء أمين المال",description:"السجل المالي ومسودات العمليات المالية وسجل العتاد والجرد والتحقق من التسديد ضمن الاختصاص.",href:"/management.html?entry=treasurer"},
 deputy_treasurer:{title:"فضاء نائب أمين المال",description:"متابعة الأعمال المالية المسندة إليك ضمن الصلاحيات المحددة، دون امتلاك صلاحيات أمين المال كاملة تلقائيًا.",href:"/management.html?entry=deputy_treasurer"},
 technical_director:{title:"المدير التقني الولائي",description:"فضاء المهام التقنية والرياضية المخصص لحسابك.",href:"/management.html?entry=technical_director"},
 inspection_inspector:{title:"التفتيش والمراقبة",description:"إنشاء تقارير التفتيش والمراقبة والاطلاع عليها، والاطلاع على السجلات التي خُصصت للمفتش وفق الصلاحيات المعتمدة، دون صلاحية إنشاء مسودات السجلات الأخرى أو اعتمادها.",href:"/management.html?entry=inspection_inspector"}
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
 try{await resolveCurrentSession()}catch(err){await sb.auth.signOut();message(err?.message||"تعذر التحقق من الجلسة.","error")}
});
})();