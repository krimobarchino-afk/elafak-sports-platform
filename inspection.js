(()=>{"use strict";
const SUPABASE_URL="https://lfubzohsbwdoiagfkpkt.supabase.co";
const KEY="sb_publishable_tCZjOnFHLIeQHF0mR9tVFA_9bu4lLrJ";
const STORAGE_KEY="sb-lfubzohsbwdoiagfkpkt-auth-token";
const $=id=>document.getElementById(id);
let sb,user=null,profile=null,reports=[],followups=[];
const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-")};
const dateFmt=v=>v?new Date(v+"T12:00:00").toLocaleDateString("ar-DZ"):"—";
function msg(id,text,kind=""){const el=$(id);el.textContent=text;el.className="i-msg"+(kind?" "+kind:"")}
function showWork(){ $("i-login").hidden=true;$("i-work").hidden=false;$("i-logout").hidden=false;$("i-user-label").hidden=false;$("i-user-label").textContent="المفتش: "+profile.username}
function showLogin(){ $("i-login").hidden=false;$("i-work").hidden=true;$("i-logout").hidden=true;$("i-user-label").hidden=true}
async function verifyInspector(){
 const {data:{user:u},error}=await sb.auth.getUser();if(error)throw error;if(!u)throw new Error("يرجى تسجيل الدخول باسم المستخدم وكلمة المرور.");
 const {data,error:e}=await sb.from("staff_profiles").select("user_id,username,role,is_active,is_frozen").eq("user_id",u.id).maybeSingle();
 if(e)throw e;if(!data||!data.is_active)throw new Error("الحساب غير موجود أو غير مفعّل. راجع مدير الموقع.");
 if(data.is_frozen)throw new Error("هذا الحساب مجمّد مؤقتًا. راجع مدير الموقع.");
 if(data.role!=="inspection_inspector")throw new Error("هذا المدخل مخصص لمفتش الشباب والرياضة فقط. استخدم مدخل حسابك الصحيح.");
 user=u;profile=data;showWork();await refresh();
}
function safeCell(tr,value){const td=document.createElement("td");td.textContent=String(value??"—");tr.append(td);return td}
function statusLabel(s){return s==="submitted"?"مرسل رسميًا":s==="draft"?"مسودة":String(s||"غير محدد")}
function printReport(r){
 const esc=v=>String(v??"—").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const sec=(title,value)=>"<h3>"+esc(title)+"</h3><p>"+esc(value||"—")+"</p>";
 const w=window.open("","_blank");if(!w){msg("i-work-msg","اسمح بالنوافذ المنبثقة حتى تتمكن من طباعة التقرير.","error");return}
 w.document.write('<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><title>تقرير تفتيش</title><style>body{font-family:Tahoma,Arial;max-width:850px;margin:30px auto;padding:20px;line-height:2;color:#17352e}h1{text-align:center}p{white-space:pre-wrap}.meta{border:1px solid #bbb;padding:12px}</style><h1>جمعية الأفق الولائية للرياضات الجوية والجبلية</h1><h2>تقرير تفتيش ومراقبة</h2><div class="meta">رقم التقرير: '+esc(r.report_number)+'<br>التاريخ: '+esc(dateFmt(r.inspection_date))+'<br>الجهة: '+esc(r.inspected_entity)+'<br>الموضوع: '+esc(r.subject)+'</div>'+sec("نطاق التفتيش",r.scope)+sec("الملاحظات والنتائج",r.findings)+sec("التوصيات",r.recommendations)+'<p>الحالة: '+esc(statusLabel(r.status))+'</p><script>window.print()<\/script></html>');
 w.document.close();
}
async function loadReports(){
 const {data,error}=await sb.from("inspection_reports").select("id,report_number,inspection_date,inspected_entity,subject,scope,findings,recommendations,status,created_by,submitted_at,created_at").order("inspection_date",{ascending:false}).order("created_at",{ascending:false});
 if(error)throw error;reports=data||[];const rows=$("i-report-rows");rows.replaceChildren();
 for(const r of reports){const tr=document.createElement("tr");safeCell(tr,r.report_number);safeCell(tr,dateFmt(r.inspection_date));safeCell(tr,r.inspected_entity);safeCell(tr,r.subject);safeCell(tr,r.findings);safeCell(tr,r.recommendations||"—");safeCell(tr,statusLabel(r.status));const td=tr.insertCell();const b=document.createElement("button");b.type="button";b.textContent="طباعة";b.onclick=()=>printReport(r);td.append(b);rows.append(tr)}
 if(!reports.length){const tr=document.createElement("tr");const td=safeCell(tr,"لا توجد تقارير تفتيش مسجلة حتى الآن.");td.colSpan=8;rows.append(tr)}
 $("i-report-count").textContent=reports.length+" تقرير";
}
async function loadFollowups(){
 const {data,error}=await sb.from("inspection_followups").select("id,report_id,response_text,corrective_action,responsible_person,due_date,status,updated_at,created_at").order("updated_at",{ascending:false});
 if(error)throw error;followups=data||[];const rows=$("i-followup-rows");rows.replaceChildren();
 for(const f of followups){const tr=document.createElement("tr");const report=reports.find(r=>r.id===f.report_id);safeCell(tr,report?.report_number||"تقرير غير متاح");safeCell(tr,f.response_text);safeCell(tr,f.corrective_action);safeCell(tr,f.responsible_person);safeCell(tr,dateFmt(f.due_date));safeCell(tr,f.status);safeCell(tr,f.updated_at?new Date(f.updated_at).toLocaleString("ar-DZ"):"—");rows.append(tr)}
 if(!followups.length){const tr=document.createElement("tr");const td=safeCell(tr,"لا توجد ردود أو متابعات مسجلة حتى الآن.");td.colSpan=7;rows.append(tr)}
}
async function refresh(){
 msg("i-work-msg","جارٍ تحديث تقارير التفتيش والمتابعات…");
 try{await loadReports();await loadFollowups();msg("i-work-msg","تم تحديث تقارير التفتيش والمتابعات.","success")}
 catch(e){console.error("Inspector dashboard refresh failed",e);msg("i-work-msg","تعذر تحميل التقارير أو المتابعات: "+(e.message||"خطأ غير معروف"),"error")}
}
$("i-login-form").addEventListener("submit",async e=>{
 e.preventDefault();const form=new FormData(e.currentTarget),username=String(form.get("username")||"").trim().toLowerCase(),password=String(form.get("password")||""),btn=$("i-login-btn");
 btn.disabled=true;msg("i-login-msg","جارٍ التحقق من حساب المفتش…");
 try{const {error}=await sb.auth.signInWithPassword({email:username+"@staff.elafak.invalid",password});if(error)throw error;await verifyInspector()}
 catch(err){console.error("Inspector sign-in failed",err);await sb.auth.signOut();showLogin();msg("i-login-msg",err.message||"تعذر الدخول. تحقق من بيانات الحساب.","error")}
 finally{btn.disabled=false}
});
$("i-report-form").addEventListener("submit",async e=>{
 e.preventDefault();if(profile?.role!=="inspection_inspector"||!user){msg("i-work-msg","لا تملك صلاحية إرسال تقارير التفتيش.","error");return}
 const form=e.currentTarget,v=Object.fromEntries(new FormData(form).entries()),btn=$("i-submit-report");
 const payload={report_number:String(v.report_number||"").trim(),inspection_date:v.inspection_date,inspected_entity:String(v.inspected_entity||"").trim(),subject:String(v.subject||"").trim(),scope:String(v.scope||"").trim(),findings:String(v.findings||"").trim(),recommendations:String(v.recommendations||"").trim(),status:"draft",created_by:user.id,submitted_at:null};
 btn.disabled=true;
 try{
  const {data,error}=await sb.from("inspection_reports").insert(payload).select("id").single();if(error)throw error;
  const {error:submitError}=await sb.from("inspection_reports").update({status:"submitted",submitted_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",data.id);
  if(submitError)throw submitError;
  form.reset();form.elements.inspection_date.value=today();form.elements.inspected_entity.value="جمعية الأفق الولائية للرياضات الجوية والجبلية";
  await refresh();msg("i-work-msg","تم حفظ التقرير وإرساله بنجاح. أصبح التقرير غير قابل للتعديل.","success")
 }catch(err){console.error("Inspector report submission failed",err);msg("i-work-msg","تعذر إرسال التقرير: "+(err.message||"خطأ غير معروف"),"error")}
 finally{btn.disabled=false}
});
$("i-refresh").addEventListener("click",refresh);
$("i-logout").addEventListener("click",async()=>{await sb.auth.signOut();user=null;profile=null;showLogin();msg("i-login-msg","تم تسجيل الخروج.","success")});
addEventListener("DOMContentLoaded",async()=>{
 if(!window.supabase){msg("i-login-msg","تعذر تحميل خدمة الدخول. تحقق من اتصال الإنترنت.","error");return}
 sb=window.supabase.createClient(SUPABASE_URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storage:window.localStorage,storageKey:STORAGE_KEY}});
 $("i-report-form").elements.inspection_date.value=today();
 try{const {data:{session},error}=await sb.auth.getSession();if(error)throw error;if(session){try{await verifyInspector()}catch(err){showLogin();msg("i-login-msg",err.message||"تعذر التحقق من صلاحيات الحساب.","error")}}}
 catch(err){msg("i-login-msg","تعذر استعادة جلسة الدخول: "+(err.message||"خطأ غير معروف"),"error")}
});
})();