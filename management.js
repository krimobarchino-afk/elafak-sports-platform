(()=>{
'use strict';
const SUPABASE_URL="https://lfubzohsbwdoiagfkpkt.supabase.co";
const KEY="sb_publishable_tCZjOnFHLIeQHF0mR9tVFA_9bu4lLrJ";
const $=id=>document.getElementById(id);
const ROLE={site_admin:"مدير الموقع",president:"الرئيس",deputy_president:"نائب الرئيس",secretary_general:"الأمين العام",treasurer:"أمين المال",deputy_secretary_general:"نائب الأمين العام",deputy_treasurer:"نائب أمين المال",technical_director:"المدير التقني"};
const TYPE={income:"إيراد",expense:"مصروف"};
const PAY={bank:"البنك",cash:"نقدًا",transfer:"تحويل",other:"أخرى"};
const ACTTYPE={paragliding:"الطيران الشراعي",hiking:"المشي الجبلي",training:"التكوين",volunteering:"التطوع",other:"أخرى"};
const ACTSTATUS={planned:"مبرمج",completed:"منجز",cancelled:"ملغى"};
const CONDITION={new:"جديدة",good:"صالحة",needs_repair:"تحتاج إصلاحًا",out_of_service:"خارج الخدمة",retired:"مستبعدة"};
const MEETTYPE={executive:"المكتب التنفيذي",general_assembly:"الجمعية العامة",committee:"لجنة",technical:"تقني",other:"أخرى"};
let sb,profile,user,years=[],transactions=[],activities=[],equipment=[],meetings=[];
const fmt=n=>new Intl.NumberFormat('ar-DZ',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(n||0))+" دج";
const dateFmt=v=>v?new Date(v+"T12:00:00").toLocaleDateString("ar-DZ"):"غير محدد";
function message(id,text,kind=""){const el=$(id);if(!el)return;el.textContent=text;el.className=kind?"m-msg "+kind:"m-msg";}
function safeCell(row,value){const td=document.createElement("td");td.textContent=String(value??"—");row.append(td);return td;}
function button(parent,label,fn,kind=""){const b=document.createElement("button");b.type="button";b.textContent=label;b.className=kind==="danger"?"danger":"";b.onclick=fn;parent.append(b);return b;}
function rowActions(tr){const td=document.createElement("td"),box=document.createElement("div");box.className="m-actions";td.append(box);tr.append(td);return box;}
function roleIs(...roles){return !!profile&&roles.includes(profile.role);}
function canFinance(){return roleIs("site_admin","president","deputy_president","treasurer","deputy_treasurer");}
function canWriteFinance(){return roleIs("site_admin","president","treasurer");}
function canViewActivities(){return roleIs("site_admin","president","deputy_president","secretary_general","deputy_secretary_general","technical_director");}
function canViewEquipment(){return canViewActivities();}
function canViewMeetings(){return canViewActivities();}
function canEditActivities(){return roleIs("site_admin","president","technical_director");}
function canEditEquipment(){return roleIs("site_admin","president","technical_director");}
function canEditMeetings(){return roleIs("site_admin","president","secretary_general");}
function canApprove(){return roleIs("site_admin","president");}
function localToday(){const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");}
function setForm(form,obj={}){form.reset();for(const [k,v] of Object.entries(obj)){const el=form.elements.namedItem(k);if(el)el.value=v??"";}if(form.elements.namedItem("id"))form.elements.namedItem("id").value=obj.id||"";}
function values(form){const f=new FormData(form),o={};for(const [k,v] of f.entries())o[k]=typeof v==="string"?v.trim():v;return o;}
function hide(id,yes){$(id)?.classList.toggle("m-hide",yes);}
async function profileLoad(){
 const {data:{user:u},error}=await sb.auth.getUser();if(error||!u)return null;
 const {data,error:e}=await sb.from("staff_profiles").select("user_id,username,role,is_active").eq("user_id",u.id).maybeSingle();
 if(e||!data||!data.is_active){await sb.auth.signOut();return null;}user=u;return data;
}
function setupTabs(){
 document.querySelectorAll(".m-tabs button").forEach(b=>b.addEventListener("click",()=>{
  document.querySelectorAll(".m-tabs button").forEach(x=>x.classList.toggle("active",x===b));
  document.querySelectorAll(".m-pane").forEach(x=>x.hidden=x.id!=="pane-"+b.dataset.pane);
  if(b.dataset.pane==="archive")loadAudit();
 }));
}
function applyPermissions(){
 $("m-role").textContent=ROLE[profile.role]||profile.role;
 $("m-welcome").textContent="مرحبًا، "+profile.username;
 $("m-permissions").textContent="تُفرض الصلاحيات من قاعدة البيانات أيضًا؛ إخفاء الأزرار في الواجهة ليس بديلًا عن سياسات الأمان.";
 $("tab-finance").classList.toggle("m-hide",!canFinance());
 $("finance-form").classList.toggle("m-hide",!canFinance());
 $("close-year").classList.toggle("m-hide",!canApprove());
 $("backup-json").classList.toggle("m-hide",!roleIs("site_admin","president"));
 $("audit-refresh").classList.toggle("m-hide",!roleIs("site_admin","president"));
 $("finance-export").classList.toggle("m-hide",!canFinance());
 $("finance-year").closest("label").classList.toggle("m-hide",!canFinance());
 $("finance-opening").closest("label").classList.toggle("m-hide",!canFinance());
 $("finance-income").closest("label").classList.toggle("m-hide",!canFinance());
 $("finance-expense").closest("label").classList.toggle("m-hide",!canFinance());
 $("finance-closing").closest("label").classList.toggle("m-hide",!canFinance());
 $("finance-year-status").closest("label").classList.toggle("m-hide",!canFinance());
}
async function loadYears(){
 if(!canFinance())return;
 const {data,error}=await sb.from("financial_years").select("*").order("fiscal_year",{ascending:false});
 if(error)throw error;years=data||[];
 const sel=$("finance-year"),prior=sel.value;sel.replaceChildren();
 years.forEach(y=>{const o=document.createElement("option");o.value=y.fiscal_year;o.textContent=String(y.fiscal_year)+(y.is_closed?" — مغلقة":" — مفتوحة");sel.append(o)});
 if(prior&&years.some(y=>String(y.fiscal_year)===prior))sel.value=prior;else if(years.length)sel.value=String(years[0].fiscal_year);
}
async function loadFinance(){
 if(!canFinance())return;
 const year=Number($("finance-year").value||new Date().getFullYear()),fy=years.find(y=>Number(y.fiscal_year)===year);
 const {data,error}=await sb.from("finance_transactions").select("*").eq("fiscal_year",year).order("transaction_date",{ascending:false,nullsFirst:false}).order("created_at",{ascending:false});
 if(error)throw error;transactions=data||[];
 const inc=transactions.filter(x=>x.transaction_type==="income").reduce((a,x)=>a+Number(x.amount),0);
 const exp=transactions.filter(x=>x.transaction_type==="expense").reduce((a,x)=>a+Number(x.amount),0);
 const opening=Number(fy?.opening_balance||0),closing=opening+inc-exp;
 $("finance-opening").value=fmt(opening);$("finance-income").value=fmt(inc);$("finance-expense").value=fmt(exp);$("finance-closing").value=fmt(closing);$("finance-year-status").value=fy?(fy.is_closed?"مغلقة — للقراءة فقط":"مفتوحة"):"غير مهيأة";
 $("stat-balance").textContent=fmt(closing);
 $("close-year").disabled=!fy||fy.is_closed;
 const body=$("finance-rows");body.replaceChildren();
 transactions.forEach(x=>{
  const tr=document.createElement("tr");safeCell(tr,dateFmt(x.transaction_date));safeCell(tr,TYPE[x.transaction_type]);safeCell(tr,x.category);safeCell(tr,x.description);safeCell(tr,fmt(x.amount));safeCell(tr,PAY[x.payment_method]||x.payment_method);
  const box=rowActions(tr);
  if(!fy?.is_closed&&canWriteFinance()){
   button(box,"تعديل",()=>{setForm($("finance-form"),x);$("finance-form").elements.transaction_date.value=x.transaction_date||localToday();message("finance-msg","تعديل العملية المحددة. احفظ لإتمام التعديل.");$("finance-form").scrollIntoView({behavior:"smooth",block:"center"});});
   if(roleIs("site_admin","president"))button(box,"حذف",async()=>{if(!confirm("حذف هذه العملية المالية؟ سيُسجّل الحذف في سجل العمليات."))return;try{const {error}=await sb.from("finance_transactions").delete().eq("id",x.id);if(error)throw error;message("finance-msg","تم حذف العملية.","success");await loadFinance();await loadAudit(false)}catch(e){message("finance-msg","تعذر الحذف: "+e.message,"error")}},"danger");
  }else safeCellDummy(box,"سنة مغلقة");
  body.append(tr);
 });
 if(!transactions.length){const tr=document.createElement("tr");const td=safeCell(tr,"لا توجد عمليات مسجلة لهذه السنة.");td.colSpan=7;body.append(tr);}
 $("stat-balance").textContent=fmt(closing);
}
function safeCellDummy(parent,t){const s=document.createElement("span");s.className="m-badge";s.textContent=t;parent.append(s)}
async function loadActivities(){
 const {data,error}=await sb.from("activities").select("*").order("activity_date",{ascending:false,nullsFirst:false}).order("created_at",{ascending:false});
 if(error)throw error;activities=data||[];$("stat-activities").textContent=activities.length;
 const body=$("activity-rows");body.replaceChildren();
 activities.forEach(x=>{const tr=document.createElement("tr");safeCell(tr,x.title);safeCell(tr,dateFmt(x.activity_date));safeCell(tr,x.location);safeCell(tr,ACTSTATUS[x.status]||x.status);safeCell(tr,x.leader);safeCell(tr,fmt(x.planned_budget));safeCell(tr,fmt(x.actual_budget));const box=rowActions(tr);
 if(canEditActivities()){button(box,"تعديل",()=>{setForm($("activity-form"),x);$("activity-form").scrollIntoView({behavior:"smooth",block:"center"})});if(roleIs("site_admin","president"))button(box,"حذف",async()=>{if(!confirm("حذف سجل النشاط؟"))return;try{const {error}=await sb.from("activities").delete().eq("id",x.id);if(error)throw error;await loadActivities();message("activities-msg","تم حذف النشاط.","success")}catch(e){message("activities-msg","تعذر الحذف: "+e.message,"error")}},"danger")}else safeCellDummy(box,"عرض فقط");body.append(tr)});
 if(!activities.length){const tr=document.createElement("tr");const td=safeCell(tr,"لا توجد أنشطة مسجلة.");td.colSpan=8;body.append(tr)}
}
async function loadEquipment(){
 const {data,error}=await sb.from("equipment").select("*").order("item_name");
 if(error)throw error;equipment=data||[];$("stat-equipment").textContent=equipment.reduce((n,x)=>n+Number(x.quantity||0),0);
 const body=$("equipment-rows");body.replaceChildren();
 equipment.forEach(x=>{const tr=document.createElement("tr");safeCell(tr,x.item_name);safeCell(tr,x.category);safeCell(tr,x.quantity);safeCell(tr,CONDITION[x.condition]||x.condition);safeCell(tr,x.serial_number);safeCell(tr,x.storage_location);const box=rowActions(tr);
 if(canEditEquipment()){button(box,"تعديل",()=>{setForm($("equipment-form"),x);$("equipment-form").scrollIntoView({behavior:"smooth",block:"center"})});if(roleIs("site_admin","president"))button(box,"حذف",async()=>{if(!confirm("حذف هذه المعدة من سجل الجرد؟"))return;try{const {error}=await sb.from("equipment").delete().eq("id",x.id);if(error)throw error;await loadEquipment();message("equipment-msg","تم حذف المعدة.","success")}catch(e){message("equipment-msg","تعذر الحذف: "+e.message,"error")}},"danger")}else safeCellDummy(box,"عرض فقط");body.append(tr)});
 if(!equipment.length){const tr=document.createElement("tr");const td=safeCell(tr,"لا توجد معدات مسجلة. أدخل الجرد بعد التحقق الفعلي.");td.colSpan=7;body.append(tr)}
}
async function loadMeetings(){
 const {data,error}=await sb.from("meetings").select("*").order("meeting_date",{ascending:false,nullsFirst:false}).order("created_at",{ascending:false});
 if(error)throw error;meetings=data||[];$("stat-meetings").textContent=meetings.length;
 const body=$("meeting-rows");body.replaceChildren();
 meetings.forEach(x=>{const tr=document.createElement("tr");safeCell(tr,x.title);safeCell(tr,MEETTYPE[x.meeting_type]||x.meeting_type);safeCell(tr,dateFmt(x.meeting_date));safeCell(tr,x.location);safeCell(tr,x.attendees_count??"غير محدد");safeCell(tr,x.status==="approved"?"معتمد":"مسودة");safeCell(tr,[x.decisions,x.minutes_text].filter(Boolean).join(" — ")||"—");const box=rowActions(tr);
 if(canEditMeetings()&&(x.status!=="approved"||canApprove()))button(box,"تعديل",()=>{setForm($("meeting-form"),x);$("meeting-form").scrollIntoView({behavior:"smooth",block:"center"})});
 if(canApprove()&&x.status!=="approved")button(box,"اعتماد المحضر",async()=>{if(!confirm("هل تؤكد أن هذا المحضر/القرار اعتمد رسميًا؟"))return;try{const {error}=await sb.from("meetings").update({status:"approved",approved_by:user.id,approved_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",x.id);if(error)throw error;await loadMeetings();message("meetings-msg","تم اعتماد المحضر.","success")}catch(e){message("meetings-msg","تعذر الاعتماد: "+e.message,"error")}});
 if(canApprove())button(box,"طباعة",()=>printMeeting(x));
 if(canApprove())button(box,"حذف",async()=>{if(!confirm("حذف سجل الاجتماع؟"))return;try{const {error}=await sb.from("meetings").delete().eq("id",x.id);if(error)throw error;await loadMeetings();message("meetings-msg","تم حذف الاجتماع.","success")}catch(e){message("meetings-msg","تعذر الحذف: "+e.message,"error")} },"danger");
 if(!canEditMeetings()&&!canApprove())safeCellDummy(box,"عرض فقط");body.append(tr)});
 if(!meetings.length){const tr=document.createElement("tr");const td=safeCell(tr,"لا توجد محاضر مسجلة بعد.");td.colSpan=8;body.append(tr)}
}
function printMeeting(x){
 const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const w=window.open("","_blank");if(!w){message("meetings-msg","اسمح بالنوافذ المنبثقة لطباعة المحضر.","error");return}
 w.document.write('<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><title>محضر اجتماع — جمعية الأفق</title><style>body{font-family:Tahoma,Arial;max-width:850px;margin:30px auto;padding:20px;color:#17352e;line-height:2}h1,h2{text-align:center}h1{font-size:22px}h2{font-size:18px;border-bottom:1px solid #aaa;padding-bottom:10px}.meta{border:1px solid #aaa;padding:12px;margin:20px 0;white-space:pre-wrap}.content{white-space:pre-wrap;min-height:100px}.sign{display:flex;justify-content:space-between;margin-top:70px}@media print{body{margin:0 auto;padding:10mm}}</style><h1>جمعية الأفق الولائية للرياضات الجوية والجبلية</h1><h2>محضر اجتماع / قرار</h2><div class="meta"><b>العنوان:</b> '+esc(x.title)+'<br><b>النوع:</b> '+esc(MEETTYPE[x.meeting_type]||x.meeting_type)+'<br><b>التاريخ:</b> '+esc(dateFmt(x.meeting_date))+'<br><b>المكان:</b> '+esc(x.location||"غير محدد")+'<br><b>الحاضرون:</b> '+esc(x.attendees_count??"غير محدد")+'<br><b>النصاب:</b> '+esc(x.quorum_note||"غير محدد")+'<br><b>الحالة:</b> '+esc(x.status==="approved"?"معتمد":"مسودة")+'</div><h3>القرارات</h3><div class="content">'+esc(x.decisions||"—")+'</div><h3>نص المحضر</h3><div class="content">'+esc(x.minutes_text||"—")+'</div><div class="sign"><span>الرئيس</span><span>الأمين العام</span></div><script>window.onload=()=>window.print()<\/script></html>');
 w.document.close();
}
async function loadAudit(showMessage=true){
 if(!roleIs("site_admin","president"))return;
 const body=$("audit-rows");body.replaceChildren();
 const {data,error}=await sb.from("audit_log").select("id,table_name,record_id,action,changed_at,details").order("changed_at",{ascending:false}).limit(150);
 if(error){if(showMessage)message("archive-msg","تعذر قراءة سجل العمليات: "+error.message,"error");return}
 (data||[]).forEach(x=>{const tr=document.createElement("tr");safeCell(tr,new Date(x.changed_at).toLocaleString("ar-DZ"));safeCell(tr,x.table_name);safeCell(tr,x.action);safeCell(tr,x.record_id);safeCell(tr,JSON.stringify(x.details||{}).slice(0,280));body.append(tr)});
 if(!(data||[]).length){const tr=document.createElement("tr");const td=safeCell(tr,"لا توجد عمليات مسجلة.");td.colSpan=5;body.append(tr)}
 if(showMessage)message("archive-msg","تم تحميل سجل العمليات (آخر "+(data||[]).length+" عملية).","success");
}
async function refreshAll(){
 message("m-message","جارٍ تحديث بيانات التسيير…");
 try{
  if(canFinance()){await loadYears();await loadFinance();}
  if(canViewActivities())await loadActivities();if(canViewEquipment())await loadEquipment();if(canViewMeetings())await loadMeetings();
  message("m-message","تم تحديث الوحدات المتاحة لهذا الحساب.","success");
 }catch(e){message("m-message","تعذر تحميل بعض البيانات: "+(e.message||"خطأ غير معروف"),"error")}
}
async function saveForm(form,table,fields,roleCheck,msgId){
 form.addEventListener("submit",async e=>{
  e.preventDefault();if(!roleCheck()){message(msgId,"هذا الحساب لا يملك صلاحية التعديل.","error");return}
  const raw=values(form),id=raw.id;delete raw.id;
  const payload={};fields.forEach(k=>{if(raw[k]!==undefined)payload[k]=raw[k]===""?null:raw[k]});
  if("entered_by" in payload)delete payload.entered_by;
  if(table==="finance_transactions"){
   payload.fiscal_year=Number($("finance-year").value);payload.amount=Number(payload.amount);payload.entered_by=user.id;
  }
  if(table==="activities"){payload.planned_budget=Number(payload.planned_budget||0);payload.actual_budget=Number(payload.actual_budget||0);payload.entered_by=user.id;}
  if(table==="equipment"){payload.quantity=Number(payload.quantity||0);payload.acquisition_cost=payload.acquisition_cost===null?null:Number(payload.acquisition_cost);payload.entered_by=user.id;}
  if(table==="meetings"){payload.attendees_count=payload.attendees_count===null?null:Number(payload.attendees_count);payload.entered_by=user.id;payload.status="draft";payload.approved_by=null;payload.approved_at=null;}
  if(payload.transaction_date==="")payload.transaction_date=null;
  const submit=form.querySelector('button[type="submit"],button:not([type])');if(submit)submit.disabled=true;
  try{
   if(id){payload.updated_at=new Date().toISOString();if(table==="finance_transactions")delete payload.entered_by;
    const {error}=await sb.from(table).update(payload).eq("id",id);if(error)throw error;
   }else{const {error}=await sb.from(table).insert(payload);if(error)throw error;}
   form.reset();if(form.elements.namedItem("id"))form.elements.namedItem("id").value="";
   if(table==="finance_transactions"){$("finance-form").elements.transaction_date.value=localToday();await loadFinance();}
   if(table==="activities")await loadActivities();
   if(table==="equipment")await loadEquipment();
   if(table==="meetings")await loadMeetings();
   message(msgId,id?"تم تحديث السجل.":"تمت إضافة السجل.","success");
  }catch(err){message(msgId,"تعذر حفظ السجل: "+(err.message||"خطأ غير معروف"),"error")}
  finally{if(submit)submit.disabled=false}
 });
}
function exportCSV(filename,rows){
 if(!rows||!rows.length){message("m-message","لا توجد بيانات لتصديرها.");return}
 const cols=[...new Set(rows.flatMap(r=>Object.keys(r)))];
 const csv="\ufeff"+[cols.join(","),...rows.map(r=>cols.map(c=>'"'+String(r[c]??"").replace(/"/g,'""')+'"').join(","))].join("\r\n");
 const a=document.createElement("a"),url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function downloadJSON(filename,data){
 const a=document.createElement("a"),url=URL.createObjectURL(new Blob(["\ufeff",JSON.stringify(data,null,2)],{type:"application/json;charset=utf-8"}));a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function backup(){
 message("archive-msg","جارٍ تجهيز نسخة بيانات قابلة للتنزيل…");
 const backup={association:"جمعية الأفق الولائية للرياضات الجوية والجبلية",exported_at:new Date().toISOString(),note:"تتضمن الجداول التي يستطيع الحساب الحالي قراءتها فقط؛ لا تشمل بيانات Auth السرية أو ملفات التخزين الخاصة.",tables:{}};
 const tables=["financial_years","finance_transactions","activities","equipment","meetings","join_requests","members","staff_profiles","audit_log"];
 for(const t of tables){
  try{const {data,error}=await sb.from(t).select("*").limit(10000);if(error)throw error;backup.tables[t]=data||[];}
  catch(e){backup.tables[t]={not_exported:true,reason:e.message||"غير متاح وفق صلاحيات الحساب"};}
 }
 downloadJSON("elafak-backup-"+localToday()+".json",backup);
 message("archive-msg","تم تجهيز نسخة JSON من السجلات التي سمحت الصلاحيات بقراءتها. راجع العناصر التي تحمل not_exported قبل اعتبار النسخة كاملة.","success");
}
function bind(){
 setupTabs();
 $("m-login-form").addEventListener("submit",async e=>{e.preventDefault();const f=new FormData(e.currentTarget),username=String(f.get("username")||"").trim().toLowerCase(),password=String(f.get("password")||""),b=$("m-login-btn");b.disabled=true;message("m-login-msg","جارٍ التحقق من الحساب…");try{const {error}=await sb.auth.signInWithPassword({email:username+"@staff.elafak.invalid",password});if(error)throw error;await enter()}catch(err){message("m-login-msg","تعذر الدخول: تحقق من اسم المستخدم وكلمة المرور وتفعيل الحساب.","error")}finally{b.disabled=false}});
 $("logout").onclick=async()=>{await sb.auth.signOut();profile=null;user=null;hide("m-app",true);hide("m-login",false);};
 $("m-refresh").onclick=refreshAll;
 $("finance-year").addEventListener("change",()=>loadFinance().catch(e=>message("finance-msg",e.message,"error")));
 $("close-year").onclick=async()=>{const y=years.find(x=>String(x.fiscal_year)===$("finance-year").value);if(!y||y.is_closed)return;if(!confirm("إقفال السنة "+y.fiscal_year+"؟ سيصبح سجل عملياتها للقراءة فقط."))return;try{const closing=Number($("finance-closing").value.replace(/[^0-9,.-]/g,"").replace(",", "."));const income=transactions.filter(x=>x.transaction_type==="income").reduce((a,x)=>a+Number(x.amount),0),expense=transactions.filter(x=>x.transaction_type==="expense").reduce((a,x)=>a+Number(x.amount),0);const balance=Number(y.opening_balance)+income-expense;const {error}=await sb.from("financial_years").update({is_closed:true,closing_balance:balance,closed_at:new Date().toISOString(),closed_by:user.id}).eq("fiscal_year",y.fiscal_year);if(error)throw error;await loadYears();await loadFinance();message("finance-msg","أُقفلت السنة المالية وحُفظ رصيدها الختامي.","success")}catch(e){message("finance-msg","تعذر إقفال السنة: "+e.message,"error")}};
 $("finance-cancel").onclick=()=>{setForm($("finance-form"));$("finance-form").elements.transaction_date.value=localToday();message("finance-msg","تم إلغاء التعديل.")};
 $("activity-cancel").onclick=()=>setForm($("activity-form"));
 $("equipment-cancel").onclick=()=>setForm($("equipment-form"));
 $("meeting-cancel").onclick=()=>setForm($("meeting-form"));
 $("finance-export").onclick=()=>exportCSV("elafak-finance-"+$("finance-year").value+".csv",transactions);
 $("activities-export").onclick=()=>exportCSV("elafak-activities.csv",activities);
 $("equipment-export").onclick=()=>exportCSV("elafak-equipment.csv",equipment);
 $("meetings-export").onclick=()=>exportCSV("elafak-meetings.csv",meetings);
 $("backup-json").onclick=backup;$("print-page").onclick=()=>window.print();$("audit-refresh").onclick=()=>loadAudit();
 saveForm($("finance-form"),"finance_transactions",["transaction_date","transaction_type","category","amount","payment_method","reference","description"],canFinance,"finance-msg");
 saveForm($("activity-form"),"activities",["title","activity_date","location","activity_type","status","leader","planned_budget","actual_budget","notes"],canEditActivities,"activities-msg");
 saveForm($("equipment-form"),"equipment",["item_name","category","quantity","condition","serial_number","acquisition_date","acquisition_cost","storage_location","notes"],canEditEquipment,"equipment-msg");
 saveForm($("meeting-form"),"meetings",["title","meeting_type","meeting_date","location","attendees_count","quorum_note","decisions","minutes_text"],canEditMeetings,"meetings-msg");
 $("finance-form").elements.transaction_date.value=localToday();
}
async function enter(){
 profile=await profileLoad();
 if(!profile){hide("m-app",true);hide("m-login",false);message("m-login-msg","تعذر التحقق من صلاحية الحساب. راجع مدير الموقع.","error");return}
 hide("m-login",true);hide("m-app",false);applyPermissions();await refreshAll();
}
addEventListener("DOMContentLoaded",()=>{
 if(!window.supabase){message("m-login-msg","تعذر تحميل خدمة الدخول. تحقق من الاتصال بالإنترنت.");return}
 sb=window.supabase.createClient(SUPABASE_URL,KEY);bind();
 sb.auth.getSession().then(({data})=>{if(data.session)enter()});
});
})();