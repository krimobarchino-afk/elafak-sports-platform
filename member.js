(()=> {
const URL="https://lfubzohsbwdoiagfkpkt.supabase.co";
const KEY="sb_publishable_tCZjOnFHLIeQHF0mR9tVFA_9bu4lLrJ";
const $=id=>document.getElementById(id);
let sb;
const initialAuthType=new URLSearchParams(location.hash.replace(/^#/,"")).get("type");
function message(id,text,kind=""){const el=$(id);if(!el)return;el.textContent=text;el.className=kind==="error"?"member-status member-error":kind==="success"?"member-status member-success":"member-status";}
function show(which){["member-login","member-activate","member-dashboard"].forEach(id=>$(id).classList.toggle("member-hidden",id!==which));}
async function activateEndpoint(){
 const {data:{session}}=await sb.auth.getSession();
 if(!session?.access_token)throw Error("انتهت جلسة الدعوة. افتح رابط الدعوة من البريد الإلكتروني مرة أخرى.");
 const response=await fetch(URL+"/functions/v1/member-activate-account",{method:"POST",headers:{"Content-Type":"application/json","apikey":KEY,"Authorization":"Bearer "+session.access_token},body:JSON.stringify({})});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(data.error||"تعذر تفعيل الحساب.");
 return data;
}
const dueStatus={pending:"مستحق",paid:"مسدد",overdue:"متأخر",reminder_sent:"أُرسل تذكير",warned:"تم الإعذار",loss_review:"قيد المراجعة",closed:"مغلق"};
const verifyStatus={pending:"بانتظار التحقق",verified:"تم التحقق",rejected:"مرفوض"};
const fmtMoney=v=>new Intl.NumberFormat("ar-DZ",{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(v||0))+" دج";
function addCell(tr,value){const td=document.createElement("td");td.textContent=String(value??"—");tr.append(td);return td}
function addEmpty(tbody,cols,text){tbody.replaceChildren();const tr=document.createElement("tr"),td=document.createElement("td");td.colSpan=cols;td.textContent=text;tr.append(td);tbody.append(tr)}
async function loadMemberFinance(){
 const msg=$("member-finance-msg"),duesBody=$("member-dues-rows"),paymentsBody=$("member-payment-rows"),notices=$("member-finance-notices");
 msg.textContent="جارٍ تحميل ملفك المالي…";
 try{
  const {data:{user},error:userError}=await sb.auth.getUser();if(userError||!user)throw Error("انتهت الجلسة. سجل الدخول مجددًا.");
  const {data:registry,error:registryError}=await sb.from("association_members").select("id").eq("user_id",user.id).maybeSingle();
  if(registryError)throw registryError;
  if(!registry){addEmpty(duesBody,4,"لم يُربط سجل مالي بحسابك بعد.");addEmpty(paymentsBody,4,"لا توجد مدفوعات معروضة.");notices.replaceChildren();msg.textContent="لم يُربط سجل العضو في سجل العضوية المالي بعد. يرجى التواصل مع المكتب.";return}
  const {data:dues,error:duesError}=await sb.from("membership_dues_obligations").select("id,period_year,amount_due,due_date,status,status_note").eq("association_member_id",registry.id).order("period_year",{ascending:false});
  if(duesError)throw duesError;
  duesBody.replaceChildren();
  if(!dues?.length)addEmpty(duesBody,4,"لا توجد استحقاقات مسجلة حاليًا.");
  else for(const d of dues){const tr=document.createElement("tr");addCell(tr,d.period_year);addCell(tr,fmtMoney(d.amount_due));addCell(tr,d.due_date?new Date(d.due_date+"T12:00:00").toLocaleDateString("ar-DZ"):"—");addCell(tr,dueStatus[d.status]||d.status);duesBody.append(tr)}
  paymentsBody.replaceChildren();
  const ids=(dues||[]).map(d=>d.id);
  if(ids.length){
   const {data:payments,error:payError}=await sb.from("membership_dues_payments").select("obligation_id,amount,payment_date,receipt_reference,verification_status").in("obligation_id",ids).order("payment_date",{ascending:false});
   if(payError)throw payError;
   if(!payments?.length)addEmpty(paymentsBody,4,"لا توجد مدفوعات مسجلة.");
   else for(const p of payments){const tr=document.createElement("tr");addCell(tr,p.payment_date?new Date(p.payment_date+"T12:00:00").toLocaleDateString("ar-DZ"):"—");addCell(tr,fmtMoney(p.amount));addCell(tr,verifyStatus[p.verification_status]||p.verification_status);addCell(tr,p.receipt_reference||"—");paymentsBody.append(tr)}
  }else addEmpty(paymentsBody,4,"لا توجد مدفوعات مسجلة.");
  const {data:ns,error:nsError}=await sb.from("member_notifications").select("title,body,notification_type,delivery_status,created_at,read_at").eq("association_member_id",registry.id).order("created_at",{ascending:false}).limit(30);
  if(nsError)throw nsError;
  notices.replaceChildren();
  if(!ns?.length){const li=document.createElement("li");li.textContent="لا توجد إشعارات جديدة.";notices.append(li)}
  else for(const n of ns){const li=document.createElement("li"),strong=document.createElement("strong"),p=document.createElement("p"),small=document.createElement("small");strong.textContent=n.title;p.textContent=n.body;small.textContent=(n.created_at?new Date(n.created_at).toLocaleString("ar-DZ"):"")+" — "+(n.read_at?"مقروء":"غير مقروء");li.append(strong,p,small);li.style.marginBottom="1rem";notices.append(li)}
  msg.textContent="تم تحميل البيانات المالية المرتبطة بحسابك فقط.";
 }catch(e){msg.textContent="تعذر تحميل الملف المالي: "+(e.message||"خطأ غير معروف");}
}
async function loadDashboard(){
 const {data:{user},error:userError}=await sb.auth.getUser();
 if(userError||!user){show("member-login");message("member-login-msg","يرجى تسجيل الدخول.","error");return}
 const {data:member,error}=await sb.from("members").select("member_no,membership_status,account_status,membership_started_at").eq("user_id",user.id).maybeSingle();
 if(error){show("member-login");message("member-login-msg","تعذر تحميل بيانات الانخراط وفق صلاحيات الحساب.","error");return}
 if(!member){await sb.auth.signOut();show("member-login");message("member-login-msg","لا يوجد سجل انخراط مرتبط بهذا الحساب. يرجى التواصل مع إدارة الجمعية.","error");return}
 if(member.account_status==="invitation_pending"){show("member-activate");message("member-activate-msg","أنشئ كلمة مرورك لتفعيل الحساب.");return}
 show("member-dashboard");
 $("member-welcome").textContent=user.email||"تم تسجيل الدخول";
 $("member-number").textContent=member.member_no||"—";
 $("member-membership-status").textContent=({active:"نشط",suspended:"معلّق",ended:"منتهٍ"})[member.membership_status]||member.membership_status||"—";
 $("member-account-status").textContent=({active:"مفعّل",disabled:"معطّل",invitation_pending:"بانتظار التفعيل",awaiting_account:"بانتظار إنشاء الحساب"})[member.account_status]||member.account_status||"—";
 $("member-start-date").textContent=member.membership_started_at?new Date(member.membership_started_at).toLocaleDateString("ar-DZ"):"—";
 await loadMemberFinance();
}
addEventListener("DOMContentLoaded",async()=>{
 if(!window.supabase){message("member-login-msg","تعذر تحميل خدمة الدخول.","error");return}
 sb=window.supabase.createClient(URL,KEY);
 $("member-login-form").onsubmit=async e=>{
  e.preventDefault();const form=e.currentTarget,f=new FormData(form),button=$("member-login-btn");button.disabled=true;
  message("member-login-msg","جارٍ التحقق من بيانات الدخول…");
  const {error}=await sb.auth.signInWithPassword({email:String(f.get("email")).trim().toLowerCase(),password:String(f.get("password"))});
  button.disabled=false;
  if(error){message("member-login-msg","تعذر تسجيل الدخول. تحقق من البريد وكلمة المرور، أو افتح دعوة التفعيل إذا كان الحساب جديدًا.","error");return}
  await loadDashboard();
 };
 $("member-activate-form").onsubmit=async e=>{
  e.preventDefault();const f=new FormData(e.currentTarget),password=String(f.get("password")),confirmation=String(f.get("confirm_password")),button=$("member-activate-btn");
  if(password.length<12){message("member-activate-msg","اختر كلمة مرور من 12 خانة على الأقل.","error");return}
  if(password!==confirmation){message("member-activate-msg","كلمتا المرور غير متطابقتين.","error");return}
  button.disabled=true;message("member-activate-msg","جارٍ حفظ كلمة المرور وتفعيل الحساب…");
  try{
   const {error}=await sb.auth.updateUser({password});
   if(error)throw error;
   const result=await activateEndpoint();
   message("member-activate-msg",result.message||"تم تفعيل الحساب.","success");
   await loadDashboard();
  }catch(err){message("member-activate-msg",err.message||"تعذر تفعيل الحساب. حاول مجددًا.","error")}
  finally{button.disabled=false}
 };
 $("member-finance-refresh").onclick=()=>loadMemberFinance();
 $("member-logout").onclick=async()=>{await sb.auth.signOut();show("member-login");$("member-login-form").reset();message("member-login-msg","تم تسجيل الخروج.","success")};
 const {data:{session}}=await sb.auth.getSession();
 if(session){
  if(initialAuthType==="invite"||initialAuthType==="recovery"){show("member-activate");message("member-activate-msg","تم التحقق من رابط الدعوة. اختر كلمة مرور جديدة.");}
  else await loadDashboard();
 }
});
})();