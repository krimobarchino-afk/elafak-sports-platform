(() => {
const URL="https://lfubzohsbwdoiagfkpkt.supabase.co";
const KEY="sb_publishable_tCZjOnFHLIeQHF0mR9tVFA_9bu4lLrJ";
const db=window.supabase.createClient(URL,KEY);
const el=id=>document.getElementById(id);
let me=null;
const roles={platform_admin:"مسؤول المنصة",president:"الرئيس",secretary_general:"الأمين العام",treasurer:"أمين المال",deputy_president:"نائب الرئيس",deputy_secretary_general:"نائب الأمين العام",deputy_treasurer:"نائب أمين المال"};
const statuses={pending:"قيد المراجعة",needs_information:"استكمال معلومات",approved:"مقبول مبدئيًا",declined:"مرفوض"};
const interests={paragliding:"الطيران الشراعي",hiking:"المشي الجبلي",volunteering:"التطوع"};
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function msg(id,text,bad){el(id).className="msg"+(bad?" error":"");el(id).textContent=text;}
function show(p){me=p;el("login").classList.add("hidden");el("app").classList.remove("hidden");el("welcome").textContent="مرحبًا، "+p.full_name;el("role").textContent="الصلاحية: "+(roles[p.role]||p.role);el("staff-tab").classList.toggle("hidden",p.role!=="platform_admin");loadRequests();if(p.role==="platform_admin")loadStaff();}
function loggedOut(){me=null;el("app").classList.add("hidden");el("login").classList.remove("hidden");}
el("login-form").addEventListener("submit",async e=>{e.preventDefault();el("login-btn").disabled=true;try{
const res=await db.functions.invoke("staff-login",{body:{username:el("username").value.trim(),password:el("password").value}});
if(res.error||!res.data||!res.data.session)throw Error((res.data&&res.data.error)||"تعذر الدخول؛ تحقق من إعداد وظيفة تسجيل الدخول.");
const s=res.data.session;const set=await db.auth.setSession({access_token:s.access_token,refresh_token:s.refresh_token});if(set.error)throw set.error;
const got=await db.from("staff_profiles").select("user_id,username,full_name,role,active,must_change_password").eq("user_id",res.data.user.id).single();
if(got.error||!got.data||!got.data.active)throw Error("تعذر تحميل صلاحيات الحساب.");
e.target.reset();show(got.data);
}catch(err){msg("login-msg",err.message||"حدث خطأ في تسجيل الدخول.",true);}finally{el("login-btn").disabled=false;}});
async function loadRequests(){
const body=el("requests-body");body.innerHTML="<tr><td colspan='6'>جارٍ التحميل…</td></tr>";
const r=await db.from("join_requests").select("id,request_ref,full_name,birth_date,municipality,phone,email,interests,experience,status,reviewer_note,created_at").order("created_at",{ascending:false}).limit(300);
if(r.error){body.innerHTML="<tr><td colspan='6'>تعذر تحميل الطلبات. تحقق من تطبيق سياسات الصلاحيات.</td></tr>";msg("requests-msg","فشل التحميل: "+r.error.message,true);return;}
if(!r.data.length){body.innerHTML="<tr><td colspan='6'>لا توجد طلبات.</td></tr>";return;}
body.innerHTML=r.data.map(x=>{const isReviewer=me.role==="platform_admin"||me.role==="president";const opts=(x.interests||[]).map(v=>interests[v]||v).join("، ");let action="للاطلاع فقط";
if(isReviewer)action="<div><button data-status='approved' data-id='"+esc(x.id)+"'>قبول مبدئي</button><button class='secondary' data-status='needs_information' data-id='"+esc(x.id)+"'>استكمال</button><button class='danger' data-status='declined' data-id='"+esc(x.id)+"'>رفض</button></div><textarea data-note='"+esc(x.id)+"' rows='2' placeholder='ملاحظة المراجعة'>"+esc(x.reviewer_note||"")+"</textarea>";
return "<tr><td><b>"+esc(x.request_ref)+"</b><div class='muted'>"+esc(new Date(x.created_at).toLocaleString("ar-DZ"))+"</div></td><td>"+esc(x.full_name)+"<div class='muted'>"+esc(x.birth_date||"")+"</div><div>"+esc(x.municipality)+"</div><small>"+esc(x.experience||"")+"</small></td><td>"+esc(x.phone)+"<div>"+esc(x.email||"دون بريد")+"</div></td><td>"+esc(opts||"—")+"</td><td>"+esc(statuses[x.status]||x.status)+"</td><td>"+action+"</td></tr>";}).join("");
}
el("requests-body").addEventListener("click",async e=>{const b=e.target.closest("button[data-status]");if(!b)return;const status=b.dataset.status;const id=b.dataset.id;if(!confirm("تأكيد تحديث حالة الطلب؟"))return;b.disabled=true;
const note=el("requests-body").querySelector("textarea[data-note='"+CSS.escape(id)+"']").value.trim()||null;
const r=await db.from("join_requests").update({status:status,reviewer_note:note,reviewed_at:new Date().toISOString()}).eq("id",id);
if(r.error)msg("requests-msg","تعذر حفظ المراجعة: "+r.error.message,true);else msg("requests-msg","تم حفظ المراجعة.");await loadRequests();});
el("refresh").addEventListener("click",loadRequests);
async function loadStaff(){if(!me||me.role!=="platform_admin")return;const b=el("staff-body");const r=await db.from("staff_profiles").select("user_id,username,full_name,role,active,created_at").order("created_at");
if(r.error){b.innerHTML="<tr><td colspan='5'>تعذر تحميل الحسابات.</td></tr>";return;}
b.innerHTML=(r.data||[]).map(x=>"<tr><td>"+esc(x.username)+"</td><td>"+esc(x.full_name)+"</td><td>"+esc(roles[x.role]||x.role)+"</td><td>"+(x.active?"نشط":"معطل")+"</td><td>"+(x.active&&x.role!=="platform_admin"?"<button class='danger' data-disable='"+esc(x.user_id)+"'>تعطيل</button>":"—")+"</td></tr>").join("")||"<tr><td colspan='5'>لا توجد حسابات.</td></tr>";}
el("staff-form").addEventListener("submit",async e=>{e.preventDefault();if(!me||me.role!=="platform_admin")return;el("create-staff").disabled=true;try{
const r=await db.functions.invoke("staff-admin",{body:{action:"create_staff",full_name:el("sname").value.trim(),username:el("suser").value.trim().toLowerCase(),role:el("srole").value,temporary_password:el("spass").value}});
if(r.error||(r.data&&r.data.error))throw Error((r.data&&r.data.error)||(r.error&&r.error.message)||"تعذر إنشاء الحساب.");e.target.reset();msg("staff-msg",r.data.message||"تم إنشاء الحساب.");await loadStaff();
}catch(err){msg("staff-msg",err.message||"تعذر إنشاء الحساب.",true);}finally{el("create-staff").disabled=false;}});
el("staff-body").addEventListener("click",async e=>{const b=e.target.closest("button[data-disable]");if(!b)return;if(!confirm("تعطيل هذا الحساب؟"))return;b.disabled=true;const r=await db.functions.invoke("staff-admin",{body:{action:"deactivate_staff",user_id:b.dataset.disable}});
if(r.error||(r.data&&r.data.error))msg("staff-msg",(r.data&&r.data.error)||(r.error&&r.error.message)||"تعذر التعطيل.",true);else msg("staff-msg",r.data.message||"تم التعطيل.");await loadStaff();});
el("requests-tab").addEventListener("click",()=>{el("requests-panel").classList.remove("hidden");el("staff-panel").classList.add("hidden");});
el("staff-tab").addEventListener("click",()=>{if(me&&me.role==="platform_admin"){el("requests-panel").classList.add("hidden");el("staff-panel").classList.remove("hidden");}});
el("logout").addEventListener("click",async()=>{await db.auth.signOut();loggedOut();});
db.auth.getSession().then(async x=>{if(!x.data.session)return;const p=await db.from("staff_profiles").select("user_id,username,full_name,role,active,must_change_password").eq("user_id",x.data.session.user.id).maybeSingle();if(p.data&&p.data.active)show(p.data);else await db.auth.signOut();});
})();