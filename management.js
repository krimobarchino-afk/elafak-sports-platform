(()=>{
'use strict';
const CONFIG=window.ElAfakSupabaseConfig;
if(!CONFIG) throw new Error("Supabase configuration is missing");
const SUPABASE_URL=CONFIG.url;
const KEY=CONFIG.key;
const $=id=>document.getElementById(id);
const ENTRY=new URLSearchParams(window.location.search).get("entry");
const EXECUTIVE_ROLES=["president","deputy_president","secretary_general","deputy_secretary_general","treasurer","deputy_treasurer"];
function entryAllows(role){return ENTRY==="executive"?EXECUTIVE_ROLES.includes(role):ENTRY==="technical_director"?role==="technical_director":ENTRY==="inspection_inspector"?role==="inspection_inspector":false;}
const ROLE={site_admin:"مدير الموقع — مسؤول تقني",president:"الرئيس — عضو المكتب التنفيذي",deputy_president:"نائب الرئيس — عضو المكتب التنفيذي",secretary_general:"الأمين العام — عضو المكتب التنفيذي",treasurer:"أمين المال — عضو المكتب التنفيذي",deputy_secretary_general:"نائب الأمين العام — عضو المكتب التنفيذي",deputy_treasurer:"نائب أمين المال — عضو المكتب التنفيذي",technical_director:"المدير التقني الولائي",inspection_inspector:"مفتش الشباب والرياضة — حساب اطلاع وتفتيش"};
const TYPE={income:"إيراد",expense:"مصروف"};
const PAY={bank:"البنك",cash:"نقدًا",transfer:"تحويل",other:"أخرى"};
const ACTTYPE={paragliding:"الطيران الشراعي",hiking:"المشي الجبلي",training:"التكوين",volunteering:"التطوع",other:"أخرى"};
const ACTSTATUS={planned:"مبرمج",completed:"منجز",cancelled:"ملغى"};
const CONDITION={new:"جديدة",good:"صالحة",needs_repair:"تحتاج إصلاحًا",out_of_service:"خارج الخدمة",retired:"مستبعدة"};
const MEETTYPE={executive:"المكتب التنفيذي",general_assembly:"الجمعية العامة",committee:"لجنة",technical:"تقني",other:"أخرى"};
let sb,profile,user,years=[],transactions=[],activities=[],equipment=[],meetings=[],executiveRoster=[],deliberationOutputs=[],inspectionReports=[],inspectionFollowups=[];
const fmt=n=>new Intl.NumberFormat('ar-DZ',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(n||0))+" دج";
const dateFmt=v=>v?new Date(v+"T12:00:00").toLocaleDateString("ar-DZ"):"غير محدد";
function message(id,text,kind=""){const el=$(id);if(!el)return;el.textContent=text;el.className=kind?"m-msg "+kind:"m-msg";}
function safeCell(row,value){const td=document.createElement("td");td.textContent=String(value??"—");row.append(td);return td;}
function button(parent,label,fn,kind=""){const b=document.createElement("button");b.type="button";b.textContent=label;b.className=kind==="danger"?"danger":"";b.onclick=fn;parent.append(b);return b;}
function rowActions(tr){const td=document.createElement("td"),box=document.createElement("div");box.className="m-actions";td.append(box);tr.append(td);return box;}
function roleIs(...roles){return !!profile&&roles.includes(profile.role);}
function canFinance(){return roleIs("president","treasurer");}
function canViewFinance(){return roleIs("president","treasurer","inspection_inspector");}
function canWriteFinance(){return roleIs("treasurer");}
function canCreateOfficialDraft(table){return table==="finance_transactions"||table==="equipment"?roleIs("treasurer"):table==="activities"?roleIs("technical_director"):false;}
function canViewActivities(){return roleIs("president","deputy_president","secretary_general","deputy_secretary_general","technical_director");}
function canViewEquipment(){return roleIs("president","treasurer","inspection_inspector");}
function canViewTasks(){return roleIs("president");}
function canViewInspections(){return roleIs("inspection_inspector",...EXECUTIVE_ROLES);}
function canEditInspections(){return roleIs("inspection_inspector");}
function canEditInspectionFollowups(){return roleIs("president","secretary_general");}
function canViewMeetings(){return roleIs("president","secretary_general","deputy_president","deputy_secretary_general","technical_director","inspection_inspector");}
function canEditActivities(){return roleIs("technical_director");}
function canEditEquipment(){return roleIs("treasurer");}
function canEditMeetings(){return roleIs("president","secretary_general");}
function canApprove(){return roleIs("president");}
function localToday(){const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");}
function setForm(form,obj={}){form.reset();for(const [k,v] of Object.entries(obj)){const el=form.elements.namedItem(k);if(el)el.value=v??"";}if(form.elements.namedItem("id"))form.elements.namedItem("id").value=obj.id||"";}
function values(form){const f=new FormData(form),o={};for(const [k,v] of f.entries())o[k]=typeof v==="string"?v.trim():v;return o;}
function hide(id,yes){$(id)?.classList.toggle("m-hide",yes);}
async function profileLoad(){
 const {data:{user:u},error}=await sb.auth.getUser();
 if(error)throw new Error("تعذر قراءة جلسة الدخول: "+error.message);
 if(!u)throw new Error("لم يتم العثور على جلسة دخول. سجّل الدخول من واجهة التسيير.");
 const {data,error:e}=await sb.from("staff_profiles").select("user_id,username,role,is_active,is_frozen").eq("user_id",u.id).maybeSingle();
 if(e)throw new Error("الجلسة موجودة لكن تعذر قراءة صلاحيات الحساب من staff_profiles: "+e.message);
 if(!data)throw new Error("الجلسة موجودة، لكن لا يوجد سجل مطابق لهذا المستخدم في staff_profiles.");
 if(!data.is_active)throw new Error("الحساب موجود لكنه غير مفعّل. راجع مدير الموقع.");
 if(data.is_frozen)throw new Error("هذا الحساب مجمّد مؤقتًا. راجع مدير الموقع.");
 user=u;return data;
}
function setupTabs(){
 document.querySelectorAll(".m-tabs button").forEach(b=>b.addEventListener("click",()=>{
  document.querySelectorAll(".m-tabs button").forEach(x=>x.classList.toggle("active",x===b));
  document.querySelectorAll(".m-pane").forEach(x=>x.hidden=x.id!=="pane-"+b.dataset.pane);
  if(b.dataset.pane==="archive")loadAudit();
  if(b.dataset.pane==="tasks")loadTasks().catch(e=>message("tasks-msg",e.message,"error"));
  if(b.dataset.pane==="inspections")loadInspectionReports().catch(e=>message("inspections-msg",e.message,"error"));
 }));
 document.querySelectorAll(".m-pane").forEach(pane=>{
  if(pane.id==="pane-overview"||pane.querySelector(".m-homebar"))return;
  const bar=document.createElement("div");bar.className="m-homebar m-no-print";
  const label=document.createElement("span");label.className="m-note";label.textContent="اختر العودة إلى الرئيسية للانتقال إلى خيار آخر.";
  const back=document.createElement("button");back.type="button";back.textContent="← العودة إلى الرئيسية";back.addEventListener("click",()=>$("tab-overview").click());
  bar.append(label,back);pane.prepend(bar);
 });
}
function renderDashboardCards(){
 const descriptions={"join-requests":"مراجعة الطلبات ومتابعة ملفات استكمال الانخراط وفق الصلاحيات.","finance":"عرض السجل المالي والعمليات والتقارير المالية المتاحة لحسابك.","activities":"متابعة برامج الجمعية وأنشطتها وخططها.","equipment":"جرد المعدات ومتابعة حالتها وسجلها.","tasks":"متابعة المهام والتكليفات التي تدخل ضمن صلاحية الرئيس.","inspections":"إعداد تقارير التفتيش ومراجعة التقارير والمتابعات المسموح بها.","meetings":"سجل المداولة ومحرر التقارير والمحاضر والقرارات ومسار مراجعة الرئيس.","office-roster":"الاطلاع على التشكيلة الرسمية للمكتب التنفيذي عند السماح بذلك.","archive":"الأرشيف وسجل العمليات والنسخ المسموح بها."};
 const icons={"join-requests":"↗",finance:"دج",activities:"✦",equipment:"◇",tasks:"✓",inspections:"⌕",meetings:"▤","office-roster":"♙",archive:"▣"};
 const grid=$("m-dashboard-cards");if(!grid)return;grid.replaceChildren();
 const tabs=[...document.querySelectorAll(".m-tabs button[data-pane]")].filter(b=>b.dataset.pane!=="overview"&&!b.classList.contains("m-hide"));
 for(const b of tabs){const card=document.createElement("button");card.type="button";card.className="m-dashboard-card";
  const icon=document.createElement("span");icon.className="m-dashboard-icon";icon.setAttribute("aria-hidden","true");icon.textContent=icons[b.dataset.pane]||"•";
  const title=document.createElement("span");title.className="m-dashboard-title";title.textContent=b.textContent.trim();
  const desc=document.createElement("span");desc.className="m-dashboard-description";desc.textContent=descriptions[b.dataset.pane]||"فتح القسم المسموح به لحسابك.";
  card.append(icon,title,desc);card.addEventListener("click",()=>b.click());grid.append(card)}
 if(!tabs.length){const empty=document.createElement("p");empty.className="m-dashboard-empty";empty.textContent="لا توجد أقسام إضافية مفعّلة لهذا الحساب حاليًا.";grid.append(empty)}
}
function applyPermissions(){
 $("tab-equipment").classList.toggle("m-hide",!canViewEquipment());
 document.querySelector('.m-tabs button[data-pane="activities"]')?.classList.toggle("m-hide",!canViewActivities());
 document.querySelector('.m-tabs button[data-pane="meetings"]')?.classList.toggle("m-hide",!canViewMeetings());
 $("stat-balance").closest(".m-stat").classList.toggle("m-hide",!canViewFinance());
 $("stat-activities").closest(".m-stat").classList.toggle("m-hide",!canViewActivities());
 $("stat-equipment").closest(".m-stat").classList.toggle("m-hide",!canViewEquipment());
 $("stat-meetings").closest(".m-stat").classList.toggle("m-hide",!canViewMeetings());
 $("tab-tasks").classList.toggle("m-hide",!canViewTasks());
 $("tab-inspections").classList.toggle("m-hide",!canViewInspections());
 document.querySelectorAll('.m-tabs button[data-pane="archive"]').forEach(el=>el.classList.toggle("m-hide",!roleIs("president")));
 $("equipment-form").classList.toggle("m-hide",!canEditEquipment());
 $("activity-form").classList.toggle("m-hide",!canEditActivities());
 $("meeting-form").classList.toggle("m-hide",!canEditMeetings());
 $("task-form").classList.toggle("m-hide",!canViewTasks());
 $("inspection-form").classList.toggle("m-hide",!canEditInspections());
 $("inspection-followup-form").classList.toggle("m-hide",!canEditInspectionFollowups());
 $("ga-invitations-card").classList.toggle("m-hide",!canEditMeetings());
 $("delib-review-shortcut")?.classList.add("m-hide");
 document.querySelectorAll("[data-delib-secretary]").forEach(el=>el.classList.toggle("m-hide",!roleIs("secretary_general")));
 document.querySelectorAll("[data-delib-new]").forEach(el=>el.classList.toggle("m-hide",!roleIs("secretary_general")));
 document.querySelector('[data-delib-open="drafts"]')?.classList.toggle("m-hide",!canEditMeetings());
 document.querySelector('[data-delib-open="meetings"]')?.classList.toggle("m-hide",!canEditMeetings());
 $("tab-join-requests").classList.toggle("m-hide",!roleIs("president","secretary_general"));
 $("join-request-review-card").classList.toggle("m-hide",!roleIs("president","secretary_general"));
 $("requirements-admin")?.classList.add("m-hide");
 $("filepanel").classList.toggle("m-hide",!roleIs("president","secretary_general","treasurer"));
 $("founding-roster-card").classList.toggle("m-hide",roleIs("inspection_inspector")||!canViewMeetings());
 $("tab-office-roster").classList.toggle("m-hide",roleIs("inspection_inspector")||!(canViewMeetings()||roleIs("treasurer","deputy_treasurer")));
 $("m-role").textContent=ROLE[profile.role]||profile.role;
 $("m-welcome").textContent="مرحبًا، "+profile.username;
 $("m-permissions").textContent=roleIs("inspection_inspector")?"صلاحيات رقابية على السجلات التي يجيزها نطاق التفتيش، مع إنشاء تقارير التفتيش ومتابعتها. لا تتيح هذه الصلاحيات تحرير المسودات الإدارية أو اعتمادها أو إدارة حسابات المسيّرين.":"تُفرض الصلاحيات من قاعدة البيانات أيضًا؛ إخفاء الأزرار في الواجهة ليس بديلًا عن سياسات الأمان.";
 $("tab-finance").classList.toggle("m-hide",!canViewFinance());
 $("dues-generation-card").classList.toggle("m-hide",!canFinance());
 $("payment-workflow-card").classList.toggle("m-hide",!canFinance());
 $("decision-settings-form").classList.toggle("m-hide",!roleIs("president"));
 $("finance-form").classList.toggle("m-hide",!roleIs("treasurer"));
 $("finance-drafts-card").classList.toggle("m-hide",!roleIs("president","treasurer"));
 $("activity-drafts-card").classList.toggle("m-hide",!roleIs("president","technical_director"));
 $("equipment-drafts-card").classList.toggle("m-hide",!roleIs("president","treasurer"));
 $("dues-payment-form")?.classList.toggle("m-hide",!canFinance());
 $("close-year").classList.toggle("m-hide",!canApprove());
 $("backup-json").classList.toggle("m-hide",!roleIs("president"));
 $("audit-refresh").classList.toggle("m-hide",!roleIs("president"));
 $("finance-export").classList.toggle("m-hide",!canViewFinance());
 $("finance-year").closest("label").classList.toggle("m-hide",!canViewFinance());
 $("finance-opening").closest("label").classList.toggle("m-hide",!canViewFinance());
 $("finance-income").closest("label").classList.toggle("m-hide",!canViewFinance());
 $("finance-expense").closest("label").classList.toggle("m-hide",!canViewFinance());
 $("finance-closing").closest("label").classList.toggle("m-hide",!canViewFinance());
 $("finance-year-status").closest("label").classList.toggle("m-hide",!canViewFinance());
 $("delib-counts")?.classList.toggle("m-hide",roleIs("inspection_inspector"));
 $("delib-notifications-heading")?.closest(".delib-notifications")?.classList.toggle("m-hide",roleIs("inspection_inspector"));
 document.querySelectorAll("[data-delib-new]").forEach(el=>el.classList.toggle("m-hide",roleIs("inspection_inspector")||!roleIs("secretary_general")));
 document.querySelectorAll("[data-delib-open=\"drafts\"],[data-delib-open=\"meetings\"]").forEach(el=>el.classList.toggle("m-hide",roleIs("inspection_inspector")||!canEditMeetings()));
 renderDashboardCards();
}
async function loadYears(){
 if(!canViewFinance())return;
 const {data,error}=await sb.from("financial_years").select("*").order("fiscal_year",{ascending:false});
 if(error)throw error;years=data||[];
 const sel=$("finance-year"),prior=sel.value;sel.replaceChildren();
 years.forEach(y=>{const o=document.createElement("option");o.value=y.fiscal_year;o.textContent=String(y.fiscal_year)+(y.is_closed?" — مغلقة":" — مفتوحة");sel.append(o)});
 if(prior&&years.some(y=>String(y.fiscal_year)===prior))sel.value=prior;else if(years.length)sel.value=String(years[0].fiscal_year);
}
async function loadFinance(){
 if(!canViewFinance())return;
 const year=Number($("finance-year").value||new Date().getFullYear()),fy=years.find(y=>Number(y.fiscal_year)===year);
 let financeQuery=sb.from("finance_transactions").select("*").eq("fiscal_year",year);
 if(roleIs("inspection_inspector"))financeQuery=financeQuery.eq("is_test",false);
 const {data,error}=await financeQuery.order("transaction_date",{ascending:false,nullsFirst:false}).order("created_at",{ascending:false});
 if(error)throw error;transactions=data||[];
 const officialTransactions=transactions.filter(x=>!x.is_test);
 const inc=officialTransactions.filter(x=>x.transaction_type==="income").reduce((a,x)=>a+Number(x.amount),0);
 const exp=officialTransactions.filter(x=>x.transaction_type==="expense").reduce((a,x)=>a+Number(x.amount),0);
 const opening=Number(fy?.opening_balance||0),closing=opening+inc-exp;
 $("finance-opening").value=fmt(opening);$("finance-income").value=fmt(inc);$("finance-expense").value=fmt(exp);$("finance-closing").value=fmt(closing);$("finance-year-status").value=fy?(fy.is_closed?"مغلقة — للقراءة فقط":"مفتوحة"):"غير مهيأة";
 $("stat-balance").textContent=fmt(closing);
 $("close-year").disabled=!fy||fy.is_closed;
 const financeSave=$("finance-save");if(financeSave)financeSave.disabled=!fy||fy.is_closed;
 const body=$("finance-rows");body.replaceChildren();
 transactions.forEach(x=>{
  const tr=document.createElement("tr");safeCell(tr,dateFmt(x.transaction_date));safeCell(tr,TYPE[x.transaction_type]);safeCell(tr,x.category+(x.is_test?" — [تجريبي غير رسمي]":""));safeCell(tr,x.description);safeCell(tr,fmt(x.amount));safeCell(tr,PAY[x.payment_method]||x.payment_method);
  const box=rowActions(tr);
  if(!fy?.is_closed&&canWriteFinance()){
   button(box,"تعديل",()=>{setForm($("finance-form"),x);$("finance-form").elements.transaction_date.value=x.transaction_date||localToday();message("finance-msg","تعديل العملية المحددة. احفظ لإتمام التعديل.");$("finance-form").scrollIntoView({behavior:"smooth",block:"center"});});
   if(roleIs("president"))button(box,"حذف",async()=>{if(!confirm("حذف هذه العملية المالية؟ سيُسجّل الحذف في سجل العمليات."))return;try{const {error}=await sb.from("finance_transactions").delete().eq("id",x.id);if(error)throw error;message("finance-msg","تم حذف العملية.","success");await loadFinance();await loadAudit(false)}catch(e){message("finance-msg","تعذر الحذف: "+e.message,"error")}},"danger");
  }else safeCellDummy(box,fy?.is_closed?"سنة مغلقة":"عرض فقط");
  body.append(tr);
 });
 if(!transactions.length){const tr=document.createElement("tr");const td=safeCell(tr,"لا توجد عمليات مسجلة لهذه السنة.");td.colSpan=7;body.append(tr);}
 $("stat-balance").textContent=fmt(closing);
}
function safeCellDummy(parent,t){const s=document.createElement("span");s.className="m-badge";s.textContent=t;parent.append(s)}
async function loadActivities(){
 const {data,error}=await sb.from("activities").select("*").order("activity_date",{ascending:false,nullsFirst:false}).order("created_at",{ascending:false});
 if(error)throw error;activities=data||[];$("stat-activities").textContent=activities.filter(x=>!x.is_test).length;
 const body=$("activity-rows");body.replaceChildren();
 activities.forEach(x=>{const tr=document.createElement("tr");safeCell(tr,x.title+(x.is_test?" — [تجريبي غير رسمي]":""));safeCell(tr,dateFmt(x.activity_date));safeCell(tr,x.location);safeCell(tr,ACTSTATUS[x.status]||x.status);safeCell(tr,x.leader);safeCell(tr,fmt(x.planned_budget));safeCell(tr,fmt(x.actual_budget));const box=rowActions(tr);
 if(canEditActivities()){button(box,"تعديل",()=>{setForm($("activity-form"),x);$("activity-form").scrollIntoView({behavior:"smooth",block:"center"})});if(roleIs("president"))button(box,"حذف",async()=>{if(!confirm("حذف سجل النشاط؟"))return;try{const {error}=await sb.from("activities").delete().eq("id",x.id);if(error)throw error;await loadActivities();message("activities-msg","تم حذف النشاط.","success")}catch(e){message("activities-msg","تعذر الحذف: "+e.message,"error")}},"danger")}else safeCellDummy(box,"عرض فقط");body.append(tr)});
 if(!activities.length){const tr=document.createElement("tr");const td=safeCell(tr,"لا توجد أنشطة مسجلة.");td.colSpan=8;body.append(tr)}
}
async function loadEquipment(){
 if(!canViewEquipment())return;
 let equipmentQuery=sb.from("equipment").select("*");
 if(roleIs("inspection_inspector"))equipmentQuery=equipmentQuery.eq("is_test",false);
 const {data,error}=await equipmentQuery.order("item_name");
 if(error)throw error;equipment=data||[];$("stat-equipment").textContent=equipment.filter(x=>!x.is_test).reduce((n,x)=>n+Number(x.quantity||0),0);
 const body=$("equipment-rows");body.replaceChildren();
 equipment.forEach(x=>{const tr=document.createElement("tr");safeCell(tr,x.item_name+(x.is_test?" — [تجريبي غير رسمي]":""));safeCell(tr,x.category);safeCell(tr,x.quantity);safeCell(tr,CONDITION[x.condition]||x.condition);safeCell(tr,x.serial_number);safeCell(tr,x.storage_location);const box=rowActions(tr);
 if(canEditEquipment()){button(box,"تعديل",()=>{setForm($("equipment-form"),x);$("equipment-form").scrollIntoView({behavior:"smooth",block:"center"})});if(roleIs("president"))button(box,"حذف",async()=>{if(!confirm("حذف هذه المعدة من سجل الجرد؟"))return;try{const {error}=await sb.from("equipment").delete().eq("id",x.id);if(error)throw error;await loadEquipment();message("equipment-msg","تم حذف المعدة.","success")}catch(e){message("equipment-msg","تعذر الحذف: "+e.message,"error")}},"danger")}else safeCellDummy(box,"عرض فقط");body.append(tr)});
 if(!equipment.length){const tr=document.createElement("tr");const td=safeCell(tr,"لا توجد معدات مسجلة. أدخل الجرد بعد التحقق الفعلي.");td.colSpan=7;body.append(tr)}
}
async function loadTasks(){
 if(!canViewTasks())return;
 const {data,error}=await sb.from("executive_tasks").select("*").order("due_date",{ascending:true,nullsFirst:false}).order("created_at",{ascending:false});
 if(error)throw error;
 const rows=$("task-rows");rows.replaceChildren();
 (data||[]).forEach(t=>{
  const tr=document.createElement("tr");
  safeCell(tr,t.title);safeCell(tr,t.assigned_to||"—");
  safeCell(tr,({low:"منخفضة",normal:"عادية",high:"عالية",urgent:"عاجلة"})[t.priority]||t.priority);
  safeCell(tr,({pending:"معلّقة",in_progress:"قيد التنفيذ",completed:"منجزة",cancelled:"ملغاة"})[t.status]||t.status);
  safeCell(tr,dateFmt(t.due_date));safeCell(tr,t.completion_note||"—");
  const box=rowActions(tr);
  button(box,"تعديل",()=>{setForm($("task-form"),t);$("task-form").scrollIntoView({behavior:"smooth",block:"center"})});
  button(box,"حذف",async()=>{if(!confirm("حذف هذا التكليف؟"))return;try{const {error}=await sb.from("executive_tasks").delete().eq("id",t.id);if(error)throw error;await loadTasks();message("tasks-msg","تم حذف التكليف.","success")}catch(e){message("tasks-msg","تعذر الحذف: "+e.message,"error")}},"danger");
  rows.append(tr);
 });
 if(!(data||[]).length){const tr=document.createElement("tr");const td=safeCell(tr,"لا توجد مهام أو تكليفات مسجلة.");td.colSpan=7;rows.append(tr)}
}
function populateInspectionFollowupReportOptions(selected=""){
 const select=$("inspection-followup-report");if(!select)return;
 const keep=selected||select.value;select.replaceChildren();
 const placeholder=document.createElement("option");placeholder.value="";placeholder.textContent="اختر تقريرًا مرسلًا";select.append(placeholder);
 for(const report of inspectionReports.filter(x=>x.status==="submitted")){
  const option=document.createElement("option");option.value=report.id;
  option.textContent=report.report_number+" — "+dateFmt(report.inspection_date)+" — "+report.subject;
  select.append(option);
 }
 select.value=keep;
}
async function loadInspectionReports(){
 if(!canViewInspections())return;
 const {data,error}=await sb.from("inspection_reports").select("*").order("inspection_date",{ascending:false}).order("created_at",{ascending:false});
 if(error)throw error;
 inspectionReports=data||[];
 populateInspectionFollowupReportOptions($("inspection-followup-report")?.value||"");
 const rows=$("inspection-rows");rows.replaceChildren();
 inspectionReports.forEach(r=>{
  const tr=document.createElement("tr");
  safeCell(tr,r.report_number);safeCell(tr,dateFmt(r.inspection_date));safeCell(tr,r.inspected_entity);safeCell(tr,r.subject);
  safeCell(tr,r.findings);safeCell(tr,r.recommendations||"—");safeCell(tr,r.status==="submitted"?"مرسل رسميًا":"مسودة");
  const box=rowActions(tr);button(box,"طباعة",()=>printInspectionReport(r));rows.append(tr);
 });
 if(!inspectionReports.length){const tr=document.createElement("tr");const td=safeCell(tr,"لا توجد تقارير تفتيش مسجلة في النظام حتى الآن.");td.colSpan=8;rows.append(tr)}
 await loadInspectionFollowups();
}
async function loadInspectionFollowups(){
 if(!canViewInspections())return;
 const {data,error}=await sb.from("inspection_followups").select("*").order("created_at",{ascending:false});
 if(error)throw error;
 inspectionFollowups=data||[];
 const reportMap=new Map(inspectionReports.map(r=>[r.id,r]));
 const body=$("inspection-followup-rows");body.replaceChildren();
 for(const f of inspectionFollowups){
  const tr=document.createElement("tr"),report=reportMap.get(f.report_id);
  safeCell(tr,report?.report_number||"تقرير "+f.report_id.slice(0,8));
  safeCell(tr,f.response_text);safeCell(tr,f.corrective_action||"—");safeCell(tr,f.responsible_person||"—");safeCell(tr,dateFmt(f.due_date));
  safeCell(tr,({open:"مفتوحة",in_progress:"قيد التنفيذ",completed:"مكتملة"})[f.status]||f.status);
  const box=rowActions(tr);
  if(canEditInspectionFollowups())button(box,"تعديل",()=>{
   setForm($("inspection-followup-form"),f);
   populateInspectionFollowupReportOptions(f.report_id);
   $("inspection-followup-form").scrollIntoView({behavior:"smooth",block:"center"});
  });
  else safeCellDummy(box,"اطلاع");
  body.append(tr);
 }
 if(!inspectionFollowups.length){const tr=document.createElement("tr");const td=safeCell(tr,"لا توجد متابعات مسجلة لتقارير التفتيش.");td.colSpan=7;body.append(tr)}
}
async function saveInspectionFollowup(form){
 if(!canEditInspectionFollowups()){message("inspection-followups-msg","تحرير المتابعات من صلاحية الرئيس والأمين العام فقط.","error");return}
 const v=values(form),id=v.id;delete v.id;
 const payload={report_id:v.report_id,response_text:v.response_text,corrective_action:v.corrective_action||"",responsible_person:v.responsible_person||"",due_date:v.due_date||null,status:v.status||"open",updated_at:new Date().toISOString()};
 if(!payload.report_id||!payload.response_text||payload.response_text.length<3){message("inspection-followups-msg","اختر تقريرًا مرسلًا وأدخل ردًا واضحًا.","error");return}
 const submit=form.querySelector('button[type="submit"]');if(submit)submit.disabled=true;
 try{
  if(id){const {error}=await sb.from("inspection_followups").update(payload).eq("id",id);if(error)throw error}
  else{payload.created_by=user.id;const {error}=await sb.from("inspection_followups").insert(payload);if(error)throw error}
  setForm(form);populateInspectionFollowupReportOptions("");
  await loadInspectionFollowups();
  message("inspection-followups-msg",id?"تم تحديث المتابعة مع الاحتفاظ بتقرير التفتيش الأصلي.":"تم حفظ المتابعة وربطها بتقرير التفتيش.","success");
 }catch(e){message("inspection-followups-msg","تعذر حفظ المتابعة: "+(e.message||"خطأ غير معروف"),"error")}
 finally{if(submit)submit.disabled=false}
}
function printInspectionReport(r){
 const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const sec=(title,value)=>'<h3>'+esc(title)+'</h3><p>'+esc(value||"—")+'</p>';
 const w=window.open("","_blank");if(!w){message("inspections-msg","اسمح بالنوافذ المنبثقة لطباعة التقرير.","error");return}
 w.document.write('<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><title>تقرير تفتيش</title><style>body{font-family:Tahoma,Arial;max-width:850px;margin:30px auto;padding:20px;line-height:2;color:#17352e}h1{text-align:center}p{white-space:pre-wrap}.meta{border:1px solid #bbb;padding:12px}</style><h1>جمعية الأفق الولائية للرياضات الجوية والجبلية</h1><h2>تقرير تفتيش ومراقبة</h2><div class="meta">رقم التقرير: '+esc(r.report_number)+'<br>التاريخ: '+esc(dateFmt(r.inspection_date))+'<br>الجهة: '+esc(r.inspected_entity)+'<br>الموضوع: '+esc(r.subject)+'</div>'+sec("نطاق التفتيش",r.scope)+sec("الملاحظات والنتائج",r.findings)+sec("التوصيات",r.recommendations)+'<p>الحالة: '+esc(r.status==="submitted"?"مرسل رسميًا":"مسودة")+'</p><script>window.print()<\/script></html>');
 w.document.close();
}
async function submitInspectionReport(form){
 if(!canEditInspections()){message("inspections-msg","هذا الحساب لا يملك صلاحية إنشاء التقارير.","error");return}
 const v=values(form),payload={report_number:v.report_number,inspection_date:v.inspection_date,inspected_entity:v.inspected_entity,subject:v.subject,scope:v.scope||"",findings:v.findings,recommendations:v.recommendations||"",status:"draft",created_by:user.id,submitted_at:null};
 const b=form.querySelector('button[type="submit"]');if(b)b.disabled=true;
 try{
  const {data,error}=await sb.from("inspection_reports").insert(payload).select("id").single();if(error)throw error;
  const {error:submitError}=await sb.from("inspection_reports").update({status:"submitted",submitted_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",data.id);
  if(submitError)throw submitError;
  form.reset();form.elements.inspection_date.value=localToday();form.elements.inspected_entity.value="جمعية الأفق الولائية للرياضات الجوية والجبلية";
  await loadInspectionReports();message("inspections-msg","تم حفظ التقرير وإرساله. لا يمكن تعديل التقرير بعد إرساله.","success");
 }catch(e){message("inspections-msg","تعذر إرسال التقرير: "+e.message,"error")}
 finally{if(b)b.disabled=false}
}
function suggestDecisionFromMeeting(){
 const source=meetings.find(m=>m.id===$("decision-source-meeting").value);
 if(!source)return;
 const report=[source.decisions||"",source.minutes_text||""].filter(Boolean).join("\n");
 const lines=report.split(/[\n.!؟؛]+/).map(x=>x.trim()).filter(Boolean);
 const feeLine=lines.find(x=>/(اشتراك|انخراط|رسوم\s*(?:العضوية|الانخراط)|membership\s*(?:fee|dues)|annual\s*(?:subscription|dues))/i.test(x));
 if(!feeLine){message("decision-settings-msg","لم أعثر على عبارة واضحة عن الاشتراك في هذا المحضر. أدخل نص القرار والمبلغ يدويًا بعد مراجعته.","");return}
 $("decision-fee-excerpt").value=feeLine;
 const normalized=feeLine.replace(/[٠-٩]/g,d=>String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/[۰-۹]/g,d=>String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
 const match=normalized.match(/(\d[\d\s.,]*\d|\d)\s*(?:دج|د\.ج|دينار(?:\s*جزائري)?|DZD)?[^\d]{0,35}(?:اشتراك|انخراط|رسوم\s*(?:العضوية|الانخراط)|membership|subscription)/i)
  || normalized.match(/(?:اشتراك|انخراط|رسوم\s*(?:العضوية|الانخراط)|membership|subscription)[^\d]{0,35}(\d[\d\s.,]*\d|\d)\s*(?:دج|د\.ج|دينار(?:\s*جزائري)?|DZD)?/i);
 if(match){
  const raw=match[1]||match[0].match(/\d[\d\s.,]*\d|\d/)[0];
  const amount=Number(raw.replace(/[\s.,]/g,""));
  if(Number.isFinite(amount)&&amount>0)$("decision-fee-amount").value=String(amount);
  message("decision-settings-msg","اكتُشفت عبارة محتملة عن الاشتراك. راجع المبلغ والنص مقابل المحضر الأصلي قبل التفعيل.","");
 }else message("decision-settings-msg","عُثر على عبارة عن الاشتراك، لكن لم يمكن استخراج مبلغ واضح. أدخله يدويًا من نص القرار.","");
}


const FOUNDER_STATUS={pending_review:"قيد المراجعة",active:"نشط",inactive:"غير نشط",resigned:"منسحب",deceased:"متوفى",unknown:"غير محدد"};
const GA_ELIGIBILITY={pending_review:"قيد المراجعة",eligible:"مؤهل للمشاركة",ineligible:"غير مؤهل للمشاركة"};
async function loadFoundingRoster(){
 const {data,error}=await sb.from("founding_member_roster").select("*").order("founder_number",{ascending:true});
 if(error)throw error;
 const rows=$( "founding-roster-rows" );rows.replaceChildren();
 (data||[]).forEach(x=>{
  const tr=document.createElement("tr");safeCell(tr,x.founder_number);safeCell(tr,x.full_name);
  const statusCell=tr.insertCell();const status=document.createElement("select");status.dataset.status="";status.setAttribute("aria-label","الحالة الحالية لـ "+x.full_name);
  Object.entries(FOUNDER_STATUS).forEach(([v,label])=>{const o=document.createElement("option");o.value=v;o.textContent=label;status.append(o)});status.value=x.current_status;statusCell.append(status);
  const eligibilityCell=tr.insertCell();const eligibility=document.createElement("select");eligibility.dataset.eligibility="";eligibility.setAttribute("aria-label","أهلية الجمعية العامة لـ "+x.full_name);
  Object.entries(GA_ELIGIBILITY).forEach(([v,label])=>{const o=document.createElement("option");o.value=v;o.textContent=label;eligibility.append(o)});eligibility.value=x.assembly_eligibility;eligibilityCell.append(eligibility);
  const noteCell=tr.insertCell();const note=document.createElement("input");note.type="text";note.maxLength=1000;note.value=x.review_note||"";note.placeholder="ملاحظة أو مرجع تحقق";note.dataset.note="";note.setAttribute("aria-label","ملاحظة مراجعة "+x.full_name);noteCell.append(note);
  const actionCell=tr.insertCell();if(canEditMeetings()){button(actionCell,"حفظ المراجعة",async()=>{
   const nextStatus=status.value,nextEligibility=eligibility.value,nextNote=note.value.trim()||null;
   if(nextEligibility==="eligible"&&nextStatus!=="active"){message("founding-roster-msg","لا يمكن اعتماد الأهلية للمشاركة قبل تحديد الحالة الحالية للعضو على أنها نشط.","error");return;}
   if(nextEligibility==="eligible"&&!confirm("تأكيد أهلية "+x.full_name+" للمشاركة في الجمعية العامة؟ راجع النظام الأساسي وسجلات الجمعية قبل الاعتماد."))return;
   try{const {error:updateError}=await sb.from("founding_member_roster").update({current_status:nextStatus,assembly_eligibility:nextEligibility,review_note:nextNote}).eq("founder_number",x.founder_number);if(updateError)throw updateError;await loadFoundingRoster();message("founding-roster-msg","تم حفظ مراجعة "+x.full_name+".","success");}
   catch(e){message("founding-roster-msg","تعذر حفظ المراجعة: "+e.message,"error")}
  });}else safeCellDummy(actionCell,"عرض فقط");
  rows.append(tr);
 });
 if(!(data||[]).length){const tr=document.createElement("tr");const td=safeCell(tr,"لا توجد سجلات للمراجعة.");td.colSpan=6;rows.append(tr)}
}
function refreshGAInvitationSources(){
 const select=$("ga-invite-source");if(!select)return;
 const prior=select.value;select.replaceChildren();
 const placeholder=document.createElement("option");placeholder.value="";placeholder.textContent="اختر تقريرًا محفوظًا للمكتب التنفيذي";select.append(placeholder);
 meetings.filter(m=>!m.is_test&&m.meeting_type==="executive").forEach(m=>{
  const o=document.createElement("option");o.value=m.id;
  o.textContent=(m.title||"تقرير المكتب التنفيذي")+" — "+dateFmt(m.meeting_date)+(m.status==="approved"?" (معتمد)":" (مسودة)");
  select.append(o);
 });
 if(prior&&meetings.some(m=>m.id===prior))select.value=prior;
}
function suggestGAInvitationAgenda(){
 const source=meetings.find(m=>m.id===$("ga-invite-source").value);if(!source)return;
 const agenda=String(source.decisions||"").trim();
 $("ga-invite-agenda").value=agenda;
 if(source.meeting_date&&!$("ga-invite-issued-date").value)$("ga-invite-issued-date").value=localToday();
 if(source.title)$("ga-invite-title").value="دعوة إلى جمعية عامة";
 if(!agenda)message("ga-invitations-msg","التقرير المختار لا يحتوي قرارات مدونة في خانتها. أدخل جدول الأعمال يدويًا بعد مراجعته.","error");
 else message("ga-invitations-msg","اقتُرح جدول الأعمال من خانة قرارات تقرير المكتب التنفيذي. راجعه قبل الطباعة.","success");
}
function htmlEscape(value){
 return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
async function createGAInvitationsAndPrint(){
 if(!canEditMeetings()){message("ga-invitations-msg","إنشاء الاستدعاءات متاح للأمين العام أو الرئيس أو مدير الموقع فقط.","error");return;}
 const source=meetings.find(m=>m.id===$("ga-invite-source").value);
 if(!source||source.is_test||source.meeting_type!=="executive"){message("ga-invitations-msg","اختر تقريرًا رسميًا محفوظًا للمكتب التنفيذي، وليس سجلًا تجريبيًا.","error");return;}
 const meetingTitle=$("ga-invite-title").value.trim(),meetingDate=$("ga-invite-date").value,meetingTime=$("ga-invite-time").value;
 const location=$("ga-invite-location").value.trim(),issuedDate=$("ga-invite-issued-date").value,agenda=$("ga-invite-agenda").value.trim();
 if(!meetingTitle||!meetingDate||!meetingTime||!location||!issuedDate||!agenda){message("ga-invitations-msg","أكمل عنوان الجمعية وتاريخها وساعتها ومكانها وتاريخ تحرير الاستدعاء وجدول الأعمال.","error");return;}
 if(!confirm("سيتم إعداد استدعاء فردي لكل المؤسسين الـ16 المسجلين، دون استبعاد أي اسم بسبب حالة المراجعة أو الأهلية. الدعوة لا تعني حسم حق التصويت أو إسقاط العضوية؛ تُعالج هذه المسائل وفق النظام الأساسي وقرارات الجمعية العامة. هذا لا يثبت الإرسال أو الاستلام. هل تريد المتابعة؟"))return;
 const btn=$("ga-invite-print");btn.disabled=true;
 try{
  const {data:memberRows,error:memberError}=await sb.from("founding_member_roster").select("founder_number,full_name").order("founder_number",{ascending:true});
  if(memberError)throw memberError;
  const founders=memberRows||[];
  if(founders.length!==16){message("ga-invitations-msg","توقف إنشاء الاستدعاءات: سجل المؤسسين يحتوي على "+founders.length+" اسمًا بدلًا من 16. راجع السجل حتى لا يُستبعد أي مؤسس دون قصد.","error");return;}
  const esc=htmlEscape;
  const agendaHtml=agenda.split(/\n+/).map(line=>line.trim()).filter(Boolean).map((line,i)=>"<li>"+esc(line.replace(/^[-*•\d٠-٩]+[.)、-]?\s*/,""))+"</li>").join("");
  const pages=founders.map(m=>{
   const name=m.full_name;
   return '<section class="invite-page"><header><h1>جمعية الأفق الولائية للرياضات الجوية والجبلية</h1><p>ولاية الشلف</p></header><h2>استدعاء لحضور جمعية عامة</h2><p class="member">إلى السيد(ة): <strong>'+esc(name)+'</strong></p><p>يشرف المكتب التنفيذي لجمعية الأفق الولائية للرياضات الجوية والجبلية أن يدعوكم لحضور أشغال الجمعية العامة، وذلك وفق البيانات الآتية:</p><div class="details"><p><b>تاريخ الاجتماع:</b> '+esc(dateFmt(meetingDate))+'</p><p><b>الساعة:</b> '+esc(meetingTime)+'</p><p><b>المكان:</b> '+esc(location)+'</p><p><b>المرجع:</b> '+esc(source.title)+' ('+esc(dateFmt(source.meeting_date))+')</p></div><h3>جدول الأعمال</h3><ol>'+agendaHtml+'</ol><p>نرجو منكم الحضور في الموعد المحدد للمشاركة في مناقشة البنود المدرجة، ومنها تحديد الاشتراك السنوي والمصادقة عليه عند إدراجه في جدول الأعمال، واتخاذ ما يلزم وفق النظام الأساسي والقوانين التنظيمية للجمعية. وتبقى أهلية التصويت منفصلة عن الدعوة. ووفق المادة 12 من القانون الأساسي، يرتبط فقدان صفة العضو بعدم دفع الاشتراكات لمدة سنة، لا بمجرد التصويت على مبلغ الاشتراك.</p><p class="issued">حرر بالشلف في: '+esc(dateFmt(issuedDate))+'</p><div class="sign"><span>رئيس الجمعية</span><span>الأمين العام</span></div><footer>رقم العضوية: '+esc("مؤسس رقم "+m.founder_number)+' — هذه نسخة معدّة للطباعة، ولا تُثبت وحدها تبليغ الاستدعاء أو استلامه.</footer></section>';
  }).join("");
  const w=window.open("","_blank");if(!w){message("ga-invitations-msg","اسمح بالنوافذ المنبثقة حتى تتمكن من فتح الاستدعاءات للطباعة.","error");return;}
  w.document.write('<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><title>استدعاءات الجمعية العامة — جمعية الأفق</title><style>body{font-family:Tahoma,Arial,sans-serif;color:#17352e;line-height:1.9;margin:0}.invite-page{box-sizing:border-box;min-height:270mm;padding:18mm 20mm;page-break-after:always;break-after:page;position:relative}.invite-page:last-child{page-break-after:auto;break-after:auto}header{text-align:center;border-bottom:2px solid #123b32;padding-bottom:10px}header h1{font-size:20px;margin:0}header p{margin:0}h2{text-align:center;margin:28px 0;font-size:22px}h3{border-bottom:1px solid #b9c9c0;padding-bottom:5px}.member{font-size:17px}.details{border:1px solid #cbd7d0;border-radius:8px;padding:8px 16px;margin:20px 0}.details p{margin:3px 0}li{margin:8px 0}.issued{margin-top:35px}.sign{display:flex;justify-content:space-between;margin-top:60px;font-weight:bold}footer{position:absolute;bottom:10mm;left:20mm;right:20mm;border-top:1px solid #ddd;padding-top:5px;font-size:10px;color:#53665c}@media print{.invite-page{height:270mm}}@media screen{.invite-page{max-width:900px;margin:20px auto;border:1px solid #ddd;box-shadow:0 1px 8px #ddd}}</style>'+pages+'<script>window.onload=()=>window.print()<\\/script></html>');
  w.document.close();
  message("ga-invitations-msg","تم إعداد "+founders.length+" استدعاءً فرديًا لجميع المؤسسين وفتحها للطباعة. لم يُسجّل ذلك كتسليم أو إرسال.","success");
 }catch(err){message("ga-invitations-msg","تعذر إعداد الاستدعاءات: "+(err.message||"خطأ غير معروف"),"error");}
 finally{btn.disabled=false;}
}
async function loadDecisionSettings(){
 const form=$("decision-settings-form");if(!form)return;
 hide("decision-settings-card",!canFinance());
 if(!canFinance())return;
 const select=$("decision-source-meeting");select.replaceChildren();
 const placeholder=document.createElement("option");placeholder.value="";placeholder.textContent="اختر محضرًا معتمدًا";select.append(placeholder);
 meetings.filter(m=>!m.is_test&&m.meeting_type==="general_assembly"&&m.status==="approved").forEach(m=>{const o=document.createElement("option");o.value=m.id;o.textContent=(m.title||"جمعية عامة")+" — "+dateFmt(m.meeting_date);select.append(o)});
 $("decision-fee-date").value=$("decision-fee-date").value||localToday();
 const {data,error}=await sb.from("membership_fee_rules").select("*").eq("status","active").order("applies_from",{ascending:false}).limit(1).maybeSingle();
 const status=$("decision-settings-current");
 if(error){status.textContent="تعذر تحميل قاعدة الاشتراك المعتمدة: "+error.message;return}
 if(data){
  $("decision-fee-amount").value=String(data.annual_amount||"");
  $("decision-fee-excerpt").value=data.source_decision||"";
  $("decision-source-meeting").value=data.source_meeting_id||"";
  $("decision-fee-date").value=data.applies_from||localToday();
  status.textContent="قاعدة الاشتراك النشطة: "+fmt(data.annual_amount)+" دج سنويًا ابتداءً من "+dateFmt(data.applies_from)+" — المرجع: "+(meetings.find(m=>m.id===data.source_meeting_id)?.title||"محضر جمعية عامة")+". أي تغيير يتطلب قرارًا معتمدًا جديدًا.";
 }else status.textContent="لا توجد قاعدة اشتراك نشطة في سجل الاشتراكات. لن تُنشأ استحقاقات أو تُحصّل رسوم حتى توثيق قرار جمعية عامة معتمد.";
}
function renderOfficialMeetingRegister(){
 const body=$("official-meeting-register-rows");
 if(!body)return;
 body.replaceChildren();
 const officialMeetings=meetings.filter(x=>x.status==="approved"&&!x.is_test)
  .sort((a,b)=>String(b.meeting_date||"").localeCompare(String(a.meeting_date||"")));
 for(const x of officialMeetings){
  const tr=document.createElement("tr");
  safeCell(tr,x.title);
  safeCell(tr,MEETTYPE[x.meeting_type]||x.meeting_type);
  safeCell(tr,dateFmt(x.meeting_date));
  safeCell(tr,x.location||"—");
  safeCell(tr,x.attendees_count??"غير محدد");
  safeCell(tr,[x.decisions,x.minutes_text].filter(Boolean).join(" — ")||"—");
  const box=rowActions(tr);
  button(box,"عرض / طباعة",()=>printMeeting(x));
  body.append(tr);
 }
 if(!officialMeetings.length){
  const tr=document.createElement("tr"),td=safeCell(tr,"لا توجد اجتماعات معتمدة ومقيدة في السجل بعد.");
  td.colSpan=7;body.append(tr);
 }
}
async function loadMeetings(){
 let meetingQuery=sb.from("meetings").select("*");
 if(roleIs("inspection_inspector"))meetingQuery=meetingQuery.eq("status","approved").eq("is_test",false);
 const {data,error}=await meetingQuery.order("meeting_date",{ascending:false,nullsFirst:false}).order("created_at",{ascending:false});
 if(error)throw error;meetings=data||[];$("stat-meetings").textContent=meetings.filter(x=>!x.is_test).length;
 const body=$("meeting-rows");body.replaceChildren();
 meetings.forEach(x=>{const tr=document.createElement("tr");safeCell(tr,x.title+(x.is_test?" — [تجريبي غير رسمي]":""));safeCell(tr,MEETTYPE[x.meeting_type]||x.meeting_type);safeCell(tr,dateFmt(x.meeting_date));safeCell(tr,x.location);safeCell(tr,x.attendees_count??"غير محدد");safeCell(tr,x.status==="approved"?"معتمد":"مسودة");safeCell(tr,[x.decisions,x.minutes_text].filter(Boolean).join(" — ")||"—");const box=rowActions(tr);
 if(canEditMeetings()&&(x.status!=="approved"||canApprove()))button(box,"تعديل",()=>{setForm($("meeting-form"),x);$("meeting-form").scrollIntoView({behavior:"smooth",block:"center"})});
 if(canApprove()&&!x.is_test&&x.status!=="approved")button(box,"اعتماد المحضر",async()=>{if(!confirm("هل تؤكد أن هذا المحضر/القرار اعتمد رسميًا؟"))return;try{const {error}=await sb.from("meetings").update({status:"approved",approved_by:user.id,approved_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",x.id);if(error)throw error;await loadMeetings();message("meetings-msg","تم اعتماد المحضر.","success")}catch(e){message("meetings-msg","تعذر الاعتماد: "+e.message,"error")}});
 if(canApprove())button(box,"طباعة",()=>printMeeting(x));
 if(canApprove())button(box,"حذف",async()=>{if(!confirm("حذف سجل الاجتماع؟"))return;try{const {error}=await sb.from("meetings").delete().eq("id",x.id);if(error)throw error;await loadMeetings();message("meetings-msg","تم حذف الاجتماع.","success")}catch(e){message("meetings-msg","تعذر الحذف: "+e.message,"error")} },"danger");
 if(!canEditMeetings()&&!canApprove())safeCellDummy(box,"عرض فقط");body.append(tr)});
 if(!meetings.length){const tr=document.createElement("tr");const td=safeCell(tr,"لا توجد محاضر مسجلة بعد.");td.colSpan=8;body.append(tr)}
 renderOfficialMeetingRegister();
 if(!roleIs("inspection_inspector")){
  refreshGAInvitationSources();
  await loadDecisionSettings();
  await loadDeliberationNotifications();
 }
 await loadDeliberationOutputs();
}
const DELIB_TYPE_LABEL={report:"تقرير",minutes:"محضر",decision:"قرار"};
const DELIB_STATUS_LABEL={draft:"مسودة مشتركة",changes_requested:"ملاحظة من الرئيس / تعديل مطلوب",approved:"معتمد ومقيد"};
function delibRegisterNo(x){return x.register_year&&x.register_number?"م/"+x.register_year+"/"+String(x.register_number).padStart(4,"0"):"—";}
function showDeliberationView(view){
 const ids={home:"delib-home",register:"delib-register-view",drafts:"delib-drafts-view",review:"delib-review-view",form:"delib-form-view"};
 for(const [key,id] of Object.entries(ids))if($(id))$(id).hidden=key!==view;
 $("legacy-meeting-tools").classList.toggle("m-hide",view!=="meetings");
 if(view==="meetings")$("legacy-meeting-tools").scrollIntoView({behavior:"smooth",block:"start"});
 else $("pane-meetings").scrollIntoView({behavior:"smooth",block:"start"});
}
function populateDeliberationMeetingOptions(selected=""){
 const select=$("delib-meeting-id");if(!select)return;
 const keep=selected||select.value;select.replaceChildren();
 const first=document.createElement("option");first.value="";first.textContent="اختر الاجتماع المصدر";select.append(first);
 for(const m of meetings.filter(x=>!x.is_test)){
  const o=document.createElement("option");o.value=m.id;o.textContent=(m.title||"اجتماع دون عنوان")+" — "+dateFmt(m.meeting_date)+" — "+(MEETTYPE[m.meeting_type]||m.meeting_type);select.append(o);
 }
 select.value=keep;
}
function startDeliberationDraft(type){
 if(!roleIs("secretary_general")){message("delib-home-message","إنشاء المسودات وتحريرها من صلاحية الأمين العام فقط. يستطيع الرئيس تدوين الملاحظات أو الاعتماد.","error");return}
 const form=$("deliberation-form");setForm(form,{output_type:type,status:"draft"});
 $("delib-form-heading").textContent="تحرير "+(DELIB_TYPE_LABEL[type]||"مخرج المداولة");
 populateDeliberationMeetingOptions("");
 $("delib-form-message").textContent="";
 showDeliberationView("form");
}
function importMeetingIntoDelibDraft(){
 const form=$("deliberation-form"),v=values(form),meeting=meetings.find(m=>m.id===v.meeting_id&&!m.is_test);
 if(!meeting){message("delib-form-message","اختر اجتماعًا رسميًا أولًا.","error");return}
 if(v.content&&!confirm("سيتم استبدال النص الحالي بمسودة مستخرجة من بيانات الاجتماع. هل تريد المتابعة؟"))return;
 const section=(label,value)=>label+"\n"+(String(value||"").trim()||"لم يُدرج في سجل الاجتماع.");
 let content="";
 if(v.output_type==="minutes"){
  content=String(meeting.minutes_text||"").trim();
  if(!content)content=["جمعية الأفق الولائية للرياضات الجوية والجبلية","محضر اجتماع","عنوان الاجتماع: "+(meeting.title||"غير محدد"),"نوع الاجتماع: "+(MEETTYPE[meeting.meeting_type]||meeting.meeting_type||"غير محدد"),"التاريخ: "+(meeting.meeting_date||"غير محدد"),"ساعة البداية: "+(meeting.meeting_start_time||"غير محددة"),"المكان: "+(meeting.location||"غير محدد"),"رئيس الاجتماع: "+(meeting.meeting_chair||"غير محدد"),section("الحاضرون وصفاتهم:",meeting.meeting_attendees),section("جدول الأعمال:",meeting.meeting_agenda),section("مجريات الاجتماع والمناقشات:",meeting.meeting_discussion),section("القرارات:",meeting.decisions),section("النصاب وملاحظاته:",meeting.quorum_note),section("المرفقات:",meeting.meeting_attachments)].join("\n\n");
 }else if(v.output_type==="decision"){
  content=String(meeting.decisions||"").trim();
  if(!content)message("delib-form-message","لا توجد قرارات مدونة في سجل الاجتماع بعد؛ اكتب نص القرار المثبت فقط.","error");
 }else{
  content=["تقرير مخرجات الاجتماع: "+(meeting.title||"غير محدد"),"مرجع الاجتماع: "+dateFmt(meeting.meeting_date)+" — "+(meeting.location||"المكان غير محدد"),section("جدول الأعمال:",meeting.meeting_agenda),section("ملخص المناقشات المسجلة:",meeting.meeting_discussion),section("القرارات المسجلة:",meeting.decisions),section("المرفقات:",meeting.meeting_attachments),"ملاحظة تحريرية: يُستكمل التقرير بالوقائع والنتائج التي تم التحقق منها فقط."].join("\n\n");
 }
 form.elements.content.value=content;
 if(!form.elements.title.value.trim())form.elements.title.value=(DELIB_TYPE_LABEL[v.output_type]||"مخرج المداولة")+" — "+meeting.title;
 if(v.output_type!=="decision"||content)message("delib-form-message","أُدرجت مسودة أولية من بيانات الاجتماع. راجعها قبل الحفظ.","success");
}
function printDeliberationOutput(x){
 const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const meeting=meetings.find(m=>m.id===x.meeting_id);
 const meta=[["رقم القيد",delibRegisterNo(x)],["نوع المخرج",DELIB_TYPE_LABEL[x.output_type]||x.output_type],["الاجتماع المصدر",meeting?.title||"غير محدد"],["تاريخ الاجتماع",dateFmt(meeting?.meeting_date)],["حالة المخرج",DELIB_STATUS_LABEL[x.status]||x.status],["تاريخ الاعتماد",x.reviewed_at?new Date(x.reviewed_at).toLocaleDateString("ar-DZ"):"—"],["ملاحظة الرئيس",x.review_note||"لا توجد"]].map(([k,v])=>"<div><b>"+esc(k)+":</b> "+esc(v)+"</div>").join("");
 const w=window.open("","_blank");if(!w){message("delib-home-message","اسمح بالنوافذ المنبثقة لطباعة المخرج.","error");return}
 w.document.write('<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><title>'+esc(x.title)+'</title><style>body{font-family:Tahoma,Arial;max-width:850px;margin:30px auto;padding:20px;color:#17352e;line-height:2}h1,h2{text-align:center}h1{font-size:21px}h2{font-size:18px;border-bottom:1px solid #aaa;padding-bottom:10px}.meta{border:1px solid #aaa;padding:12px;margin:20px 0}.content{white-space:pre-wrap;min-height:30px}.sign{display:flex;justify-content:space-between;gap:30px;margin-top:70px}.sign span{min-width:40%}@media print{body{margin:0 auto;padding:10mm}}</style><h1>جمعية الأفق الولائية للرياضات الجوية والجبلية</h1><h2>'+esc(DELIB_TYPE_LABEL[x.output_type]||"مخرج المداولة")+'</h2><h2>'+esc(x.title)+'</h2><div class="meta">'+meta+'</div><div class="content">'+esc(x.content)+'</div><div class="sign"><span>إمضاء الرئيس: ____________________</span><span>إمضاء الأمين العام/المحرر: ____________________</span></div><script>window.onload=()=>window.print()<\\/script></html>');
 w.document.close();
}
function addDelibAction(box,label,fn,kind=""){const b=document.createElement("button");b.type="button";b.className="m-small"+(kind==="danger"?" danger":"");b.textContent=label;b.onclick=fn;box.append(b);return b;}
function renderDeliberationTable(bodyId,rows,mode){
 const body=$(bodyId);if(!body)return;body.replaceChildren();
 const emptyText=mode==="register"?"لا توجد مخرجات معتمدة في سجل المداولة بعد.":"لا توجد مسودات مشتركة حتى الآن.";
 for(const x of rows){
  const tr=document.createElement("tr"),meeting=meetings.find(m=>m.id===x.meeting_id),actions=document.createElement("td"),box=document.createElement("div");box.className="m-actions";actions.append(box);
  const cell=v=>safeCell(tr,v);
  if(mode==="register"){
   cell(delibRegisterNo(x));cell(DELIB_TYPE_LABEL[x.output_type]||x.output_type);cell(x.title);cell(meeting?.title||"—");cell(dateFmt(meeting?.meeting_date));cell(x.reviewed_at?new Date(x.reviewed_at).toLocaleDateString("ar-DZ"):"—");
   addDelibAction(box,"عرض / طباعة",()=>printDeliberationOutput(x));
  }else{
   cell(x.title);cell(DELIB_TYPE_LABEL[x.output_type]||x.output_type);cell(meeting?.title||"—");
   const status=cell("");const badge=document.createElement("span");badge.className="delib-status "+x.status;badge.textContent=DELIB_STATUS_LABEL[x.status]||x.status;status.append(badge);
   cell(x.review_note||"—");
   cell(x.updated_at?new Date(x.updated_at).toLocaleString("ar-DZ"):"—");
   if(roleIs("secretary_general")&&x.created_by===user?.id&&["draft","changes_requested"].includes(x.status)){
    addDelibAction(box,"تحرير المسودة",()=>{setForm($("deliberation-form"),x);populateDeliberationMeetingOptions(x.meeting_id);$("delib-form-heading").textContent="تحرير "+(DELIB_TYPE_LABEL[x.output_type]||"المخرج");$("delib-form-message").textContent=x.review_note?"ملاحظة الرئيس: "+x.review_note:"";showDeliberationView("form")});
   }
   if(canApprove()&&["draft","changes_requested"].includes(x.status)){
    addDelibAction(box,"تدوين ملاحظة",async()=>{
     const note=prompt("اكتب ملاحظة الرئيس التي ستظهر للأمين العام:",x.review_note||"");if(note===null)return;
     if(note.trim().length<3){message("delib-home-message","اكتب ملاحظة واضحة لا تقل عن ثلاثة أحرف.","error");return}
     try{const {data,error}=await sb.from("deliberation_outputs").update({review_note:note.trim(),updated_by:user.id,updated_at:new Date().toISOString()}).eq("id",x.id).in("status",["draft","changes_requested"]).select("id").maybeSingle();if(error)throw error;if(!data)throw Error("تعذر حفظ الملاحظة؛ تحقق من حالة المسودة.");await loadDeliberationOutputs();await loadDeliberationNotifications();message("delib-home-message","حُفظت ملاحظة الرئيس وأصبحت ظاهرة للأمين العام.","success")}catch(e){message("delib-home-message","تعذر حفظ الملاحظة: "+(e.message||"خطأ غير معروف"),"error")}
    });
    addDelibAction(box,"تأكيد وقيد",async()=>{
     if(!confirm("هل تؤكد اعتماد هذا المخرج نهائيًا وقيده في سجل المداولة؟ لن يعود قابلًا للتحرير بعد الاعتماد."))return;
     try{const {data,error}=await sb.from("deliberation_outputs").update({status:"approved",updated_by:user.id,updated_at:new Date().toISOString()}).eq("id",x.id).in("status",["draft","changes_requested"]).select("id").maybeSingle();if(error)throw error;if(!data)throw Error("تعذر الاعتماد؛ ربما سبق تحديث المخرج.");await loadDeliberationOutputs();await loadDeliberationNotifications();const approved=deliberationOutputs.find(y=>y.id===x.id);message("delib-home-message","تم اعتماد المخرج وقيده رسميًا بالرقم "+delibRegisterNo(approved||x)+".","success")}catch(e){message("delib-home-message","تعذر الاعتماد: "+(e.message||"خطأ غير معروف"),"error")}
    });
   }
   if(x.status==="approved")addDelibAction(box,"عرض / طباعة",()=>printDeliberationOutput(x));
  }
  tr.append(actions);body.append(tr);
 }
 if(!rows.length){const tr=document.createElement("tr"),td=document.createElement("td");td.colSpan=mode==="register"?7:7;td.textContent=emptyText;tr.append(td);body.append(tr)}
}
async function loadDeliberationOutputs(){
 let outputQuery=sb.from("deliberation_outputs").select("*");
 if(roleIs("inspection_inspector"))outputQuery=outputQuery.eq("status","approved").not("register_year","is",null).not("register_number","is",null);
 const {data,error}=await outputQuery.order("created_at",{ascending:false});
 if(error)throw error;deliberationOutputs=data||[];
 populateDeliberationMeetingOptions($("delib-meeting-id")?.value||"");
 const shared=deliberationOutputs.filter(x=>x.status!=="approved");
 const approved=deliberationOutputs.filter(x=>x.status==="approved").sort((a,b)=>(b.register_year||0)-(a.register_year||0)||(b.register_number||0)-(a.register_number||0));
 $("delib-count-drafts").textContent=String(shared.length);
 $("delib-count-review").textContent=String(shared.filter(x=>x.status==="changes_requested").length);
 $("delib-count-approved").textContent=String(approved.length);
 renderDeliberationTable("delib-register-rows",approved,"register");
 renderDeliberationTable("delib-drafts-rows",shared,"drafts");
 renderDeliberationTable("delib-review-rows",[],"review");
}
async function loadDeliberationNotifications(){
 const list=$("delib-notifications-list");if(!list||!user)return;
 const {data,error}=await sb.from("deliberation_notifications").select("id,output_id,event_type,title,body,created_at,read_at").order("created_at",{ascending:false}).limit(30);
 if(error){list.textContent="تعذر تحميل الإشعارات: "+error.message;return}
 list.replaceChildren();
 if(!data?.length){const p=document.createElement("p");p.className="m-note";p.textContent="لا توجد إشعارات جديدة. ستظهر هنا حركة الطرف الآخر.";list.append(p);return}
 for(const n of data){
  const item=document.createElement("article");item.className="delib-notification"+(n.read_at?" read":"");
  const title=document.createElement("strong");title.textContent=n.title;
  const body=document.createElement("p");body.textContent=n.body;
  const date=document.createElement("small");date.textContent=new Date(n.created_at).toLocaleString("ar-DZ");
  item.append(title,body,date);
  if(!n.read_at){const b=document.createElement("button");b.type="button";b.className="m-small";b.textContent="تحديد كمقروء";b.onclick=async()=>{const {error}=await sb.from("deliberation_notifications").update({read_at:new Date().toISOString()}).eq("id",n.id);if(error){message("delib-home-message","تعذر تحديث الإشعار: "+error.message,"error");return}await loadDeliberationNotifications()};item.append(b)}
  list.append(item);
 }
}
function subscribeDeliberationUpdates(){
 if(!sb||!user||window.__delibRealtime)return;
 window.__delibRealtime=sb.channel("deliberation-shared-workspace")
  .on("postgres_changes",{event:"*",schema:"public",table:"deliberation_outputs"},async()=>{await loadDeliberationOutputs();await loadDeliberationNotifications()})
  .on("postgres_changes",{event:"INSERT",schema:"public",table:"deliberation_notifications",filter:"recipient_user_id=eq."+user.id},()=>loadDeliberationNotifications())
  .on("postgres_changes",{event:"*",schema:"public",table:"official_record_drafts"},async event=>{
   const row=event.new&&Object.keys(event.new).length?event.new:event.old;
   const type=row?.record_type;if(!type)return;
   try{
    await loadOfficialRecordDrafts(type);
    if(type==="finance_transaction"&&canViewFinance())await loadFinance();
    if(type==="equipment"&&canViewEquipment())await loadEquipment();
    if(type==="activity"&&canViewActivities())await loadActivities();
    if((row.updated_by||row.created_by)!==user.id){
     const label=type==="finance_transaction"?"مسودة مالية":type==="equipment"?"مسودة عتاد":"مسودة نشاط";
     message("m-message","إشعار: حدث تحديث في "+label+" ضمن مساحة العمل المشتركة.","success");
    }
   }catch(e){console.error("[Elafak official drafts realtime]",e)}
  })
  .subscribe();
}
async function saveDeliberationDraft(){
 const form=$("deliberation-form");if(!form.reportValidity())return;
 if(!roleIs("secretary_general")){message("delib-form-message","إنشاء المسودات وتحريرها من صلاحية الأمين العام فقط.","error");return}
 const v=values(form),id=v.id||null;
 if(!meetings.some(m=>m.id===v.meeting_id&&!m.is_test)){message("delib-form-message","اختر اجتماعًا رسميًا محفوظًا كمصدر للمخرج.","error");return}
 const payload={meeting_id:v.meeting_id,output_type:v.output_type,title:v.title,content:v.content,updated_by:user.id,updated_at:new Date().toISOString()};
 $("delib-save-draft").disabled=true;
 try{
  if(id){
   const {data,error}=await sb.from("deliberation_outputs").update(payload).eq("id",id).eq("created_by",user.id).in("status",["draft","changes_requested"]).select("id").maybeSingle();
   if(error)throw error;if(!data)throw Error("لم يتم تحديث المسودة؛ تحقق من صلاحياتك أو من اعتمادها النهائي.");
  }else{
   payload.created_by=user.id;payload.status="draft";
   const {data,error}=await sb.from("deliberation_outputs").insert(payload).select("id").single();
   if(error)throw error;form.elements.id.value=data.id;
  }
  message("delib-form-message","حُفظت المسودة المشتركة، وأصبح بإمكان الرئيس الاطلاع عليها مباشرة.","success");
  await loadDeliberationOutputs();await loadDeliberationNotifications();
 }catch(e){message("delib-form-message","تعذر حفظ المسودة: "+(e.message||"خطأ غير معروف"),"error")}
 finally{$("delib-save-draft").disabled=false}
}
function printMeeting(x){
 const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const section=(title,value)=>value?'<h3>'+esc(title)+'</h3><div class="content">'+esc(value)+'</div>':"";
 const w=window.open("","_blank");if(!w){message("meetings-msg","اسمح بالنوافذ المنبثقة لطباعة المحضر.","error");return}
 const meta=[
  ["العنوان",x.title],["النوع",MEETTYPE[x.meeting_type]||x.meeting_type],["التاريخ",dateFmt(x.meeting_date)],
  ["ساعة البداية",x.meeting_start_time],["ساعة الرفع",x.meeting_end_time],["المكان",x.location],
  ["رئيس الاجتماع",x.meeting_chair],["عدد الحاضرين",x.attendees_count],["النصاب",x.quorum_note],
  ["الحالة",x.status==="approved"?"معتمد":"مسودة"]
 ].map(([k,v])=>'<div><b>'+esc(k)+':</b> '+esc(v||"غير محدد")+'</div>').join("");
 w.document.write('<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><title>محضر اجتماع — جمعية الأفق</title><style>body{font-family:Tahoma,Arial;max-width:850px;margin:30px auto;padding:20px;color:#17352e;line-height:2}h1,h2{text-align:center}h1{font-size:22px}h2{font-size:18px;border-bottom:1px solid #aaa;padding-bottom:10px}.meta{border:1px solid #aaa;padding:12px;margin:20px 0}.content{white-space:pre-wrap;min-height:30px}.sign{display:flex;justify-content:space-between;gap:30px;margin-top:70px}.sign span{min-width:40%}@media print{body{margin:0 auto;padding:10mm}h3{break-after:avoid}.meta,.content{break-inside:avoid}}</style><h1>جمعية الأفق الولائية للرياضات الجوية والجبلية</h1><h2>محضر اجتماع / قرار</h2><div class="meta">'+meta+'</div>'+
 section("الحاضرون وصفاتهم",x.meeting_attendees)+section("جدول الأعمال",x.meeting_agenda)+section("مجريات الاجتماع والمناقشات",x.meeting_discussion)+section("القرارات",x.decisions)+section("المرفقات والإشارات المرجعية",x.meeting_attachments)+section("نص المحضر",x.minutes_text)+
 '<div class="sign"><span>رئيس الاجتماع<br><br>الإمضاء: ____________________</span><span>الأمين العام / محرر المحضر<br><br>الإمضاء: ____________________</span></div><script>window.onload=()=>window.print()<\\/script></html>');
 w.document.close();
}
async function loadAudit(showMessage=true){
 if(!roleIs("president"))return;
 const body=$("audit-rows");body.replaceChildren();
 const {data,error}=await sb.from("audit_log").select("id,table_name,record_id,action,changed_at,details").order("changed_at",{ascending:false}).limit(150);
 if(error){if(showMessage)message("archive-msg","تعذر قراءة سجل العمليات: "+error.message,"error");return}
 (data||[]).forEach(x=>{const tr=document.createElement("tr");safeCell(tr,new Date(x.changed_at).toLocaleString("ar-DZ"));safeCell(tr,x.table_name);safeCell(tr,x.action);safeCell(tr,x.record_id);safeCell(tr,JSON.stringify(x.details||{}).slice(0,280));body.append(tr)});
 if(!(data||[]).length){const tr=document.createElement("tr");const td=safeCell(tr,"لا توجد عمليات مسجلة.");td.colSpan=5;body.append(tr)}
 if(showMessage)message("archive-msg","تم تحميل سجل العمليات (آخر "+(data||[]).length+" عملية).","success");
}

async function loadPaymentWorkflow(){
 if(!canViewFinance())return;
 const form=$("dues-payment-form");if(!form)return;
 hide("payment-workflow-card",false);
 const [or, mr, pr]=await Promise.all([
  sb.from("membership_dues_obligations").select("id,association_member_id,period_year,amount_due,due_date,status").order("period_year",{ascending:false}).order("due_date",{ascending:true}),
  sb.from("association_members").select("id,full_name,founder_number,source_kind,membership_status"),
  sb.from("membership_dues_payments").select("*").order("created_at",{ascending:false}).limit(300)
 ]);
 if(or.error)throw or.error;if(mr.error)throw mr.error;if(pr.error)throw pr.error;
 const obligations=or.data||[], members=mr.data||[], payments=pr.data||[];
 const memberMap=new Map(members.map(m=>[m.id,m]));
 const obligationMap=new Map(obligations.map(o=>[o.id,o]));
 const sel=$("dues-payment-obligation"), prior=sel.value;sel.replaceChildren();
 const eligible=obligations.filter(o=>!["paid","closed","loss_review"].includes(o.status)&&memberMap.get(o.association_member_id)?.membership_status==="active");
 const placeholder=document.createElement("option");placeholder.value="";
 placeholder.textContent=eligible.length?"اختر استحقاق العضو":"لا توجد استحقاقات متاحة؛ لا يُنشأ اشتراك قبل اعتماد قرار الجمعية العامة";
 sel.append(placeholder);
 eligible.forEach(o=>{
  const m=memberMap.get(o.association_member_id);if(!m)return;
  const op=document.createElement("option");op.value=o.id;
  op.textContent=(m.full_name||"عضو")+(m.founder_number?" — مؤسس #"+m.founder_number:"")+" — "+o.period_year+" — المتبقي "+fmt(Math.max(0,Number(o.amount_due)-payments.filter(p=>p.obligation_id===o.id&&p.verification_status==="verified").reduce((s,p)=>s+Number(p.amount),0)));
  sel.append(op);
 });
 if(prior&&eligible.some(o=>o.id===prior))sel.value=prior;
 sel.disabled=!eligible.length;
 $("dues-payment-save").disabled=!eligible.length;
 const body=$("dues-payment-rows");body.replaceChildren();
 if(!payments.length){const tr=document.createElement("tr"),td=safeCell(tr,"لا توجد دفعات مسجلة.");td.colSpan=8;body.append(tr)}
 payments.forEach(p=>{
  const o=obligationMap.get(p.obligation_id),m=o?memberMap.get(o.association_member_id):null;
  const tr=document.createElement("tr");
  safeCell(tr,m?.full_name||"عضو غير مرتبط");safeCell(tr,o?.period_year||"—");safeCell(tr,fmt(p.amount));safeCell(tr,dateFmt(p.payment_date));safeCell(tr,PAY[p.payment_method]||p.payment_method||"أخرى");safeCell(tr,p.receipt_reference||"—");
  safeCell(tr,p.verification_status==="verified"?"مثبتة":p.verification_status==="rejected"?"مرفوضة":"بانتظار التحقق");
  const actions=rowActions(tr);
  if(p.verification_status==="pending"&&canFinance()){
   button(actions,"تأكيد الدفع",()=>reviewDuesPayment(p.id,"verified"),"");
   button(actions,"رفض مع تعليل",()=>reviewDuesPayment(p.id,"rejected"),"danger");
  }
  body.append(tr);
 });
 if(!obligations.length){
  message("dues-payment-msg","لا توجد استحقاقات بعد. لم تُعتمد رسوم اشتراك في البيانات الحالية؛ لا تُسجّل دفعة رسمية حتى يصدر قرار صحيح من الجمعية العامة.","");
 }else message("dues-payment-msg","تم تحميل الاستحقاقات والدفعات. الدفعات المعلقة لا تُحتسب إيرادًا قبل التحقق.","");
}
async function reviewDuesPayment(paymentId,decision){
 if(!canFinance())return;
 let note="";
 if(decision==="rejected"){note=prompt("اكتب سبب رفض إثبات الدفع:")||"";if(!note.trim())return;}
 else {note=prompt("ملاحظة التحقق (اختيارية):")||"";if(!confirm("هل تحققت من الإيصال ومطابقة المبلغ والتاريخ قبل إثبات الدفعة؟"))return;}
 try{
  const {data,error}=await sb.rpc("verify_membership_dues_payment",{p_payment_id:paymentId,p_decision:decision,p_verification_note:note.trim()||null});
  if(error)throw error;
  message("dues-payment-msg",decision==="verified"?"تم التحقق من الدفعة وربطها بالسجل المالي الرسمي.":"تم رفض إثبات الدفع مع حفظ السبب وإشعار العضو.","success");
  await loadPaymentWorkflow();await loadFinance();
 }catch(err){message("dues-payment-msg","تعذرت مراجعة الدفعة: "+(err.message||"خطأ غير معروف"),"error")}
}

async function loadExecutiveRoster(){
 const {data,error}=await sb.from("executive_office_roster").select("id,position_key,position_label,full_name,notes,updated_at").order("position_key");
 if(error)throw error;
 const order=["president","deputy_president","secretary_general","deputy_secretary_general","treasurer","deputy_treasurer"];
 executiveRoster=(data||[]).sort((a,b)=>order.indexOf(a.position_key)-order.indexOf(b.position_key));
 const body=$("executive-roster-rows");body.replaceChildren();
 const canManage=roleIs("president","secretary_general");
 executiveRoster.forEach(item=>{
  const tr=document.createElement("tr");safeCell(tr,item.position_label);
  const nameTd=document.createElement("td");
  if(canManage){
   const input=document.createElement("input");input.type="text";input.maxLength=180;input.value=item.full_name||"";input.placeholder="اكتب الاسم كما ورد في المحضر";input.setAttribute("aria-label","اسم شاغل "+item.position_label);
   input.style.cssText="box-sizing:border-box;width:100%;min-width:180px;padding:.55rem;border:1px solid #b9c9c0;border-radius:7px;font:inherit";
   nameTd.append(input);item._nameInput=input;
  }else{nameTd.textContent=item.full_name||"لم يُحدد بعد";}
  tr.append(nameTd);safeCell(tr,item.notes||"—");
  const box=rowActions(tr);
  if(canManage){
   button(box,"حفظ الاسم",async()=>{
    const name=item._nameInput.value.trim();
    if(name.length>180){message("executive-roster-msg","الاسم أطول من الحد المسموح.","error");return}
    const saveButtons=box.querySelectorAll("button");saveButtons.forEach(b=>b.disabled=true);
    try{
     const {error}=await sb.from("executive_office_roster").update({full_name:name||null,updated_by:user.id,updated_at:new Date().toISOString()}).eq("id",item.id);
     if(error)throw error;
     message("executive-roster-msg","تم حفظ الاسم في سجل التشكيلة الرسمية. تأكد من وجود محضر أو قرار يثبت أي تغيير.","success");
     await loadExecutiveRoster();
    }catch(err){message("executive-roster-msg","تعذر حفظ الاسم: "+(err.message||"خطأ غير معروف"),"error")}
    finally{saveButtons.forEach(b=>b.disabled=false)}
   });
  }else safeCellDummy(box,"عرض فقط");
  body.append(tr);
 });
 if(!executiveRoster.length){const tr=document.createElement("tr");const td=safeCell(tr,"لا توجد سجلات للتشكيلة الرسمية. راجع مدير الموقع.");td.colSpan=4;body.append(tr)}
}

const JOIN_STATUS={pending:"قيد المراجعة",needs_information:"استكمال معلومات",approved:"مقبول مبدئيًا",declined:"مرفوض"};
const JOIN_INTERESTS={paragliding:"الطيران الشراعي",hiking:"المشي الجبلي",volunteering:"التطوع"};
const JOIN_FILE_STATUS={awaiting_upload:"بانتظار الإيداع",submitted:"مستلم — بانتظار المراجعة",in_review:"قيد المراجعة",needs_correction:"يحتاج إلى تصحيح",ready_for_final_approval:"جاهز للاعتماد النهائي",finalized:"معتمد نهائيًا"};
async function fileEdge(body){const {data:{session}}=await sb.auth.getSession();if(!session?.access_token)throw Error("انتهت الجلسة. يرجى تسجيل الدخول مجددًا.");const r=await fetch(SUPABASE_URL+"/functions/v1/staff-join-files",{method:"POST",headers:{"Content-Type":"application/json","apikey":KEY,"Authorization":"Bearer "+session.access_token},body:JSON.stringify(body)});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||"تعذر تنفيذ العملية");return d}
async function finalizeMember(fileId){const {data:{session}}=await sb.auth.getSession();if(!session?.access_token)throw Error("انتهت الجلسة. يرجى تسجيل الدخول مجددًا.");const r=await fetch(SUPABASE_URL+"/functions/v1/staff-finalize-member",{method:"POST",headers:{"Content-Type":"application/json","apikey":KEY,"Authorization":"Bearer "+session.access_token},body:JSON.stringify({file_id:fileId})});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||"تعذر الاعتماد النهائي.");return d}async function loadJoinFiles(){const body=$("filerows");if(!body)return;body.replaceChildren();message("filesmsg","جارٍ تحميل الملفات…");try{const result=await fileEdge({action:"list"}),files=Array.isArray(result.files)?result.files:[];for(const f of files){const tr=document.createElement("tr"),cell=v=>{const td=document.createElement("td");td.textContent=String(v??"—");tr.append(td);return td};cell(f.request_ref);cell(f.full_name);cell(f.submitted_at?new Date(f.submitted_at).toLocaleString("ar-DZ"):"—");cell(JOIN_FILE_STATUS[f.status]||f.status);cell(f.payment_confirmed?"مؤكد من أمين المال":"لم يؤكد بعد");cell(f.reviewer_note||"—");const actions=cell("");const btn=(label,fn)=>{const b=document.createElement("button");b.type="button";b.className="btn";b.style.margin=".2rem";b.textContent=label;b.onclick=fn;actions.append(b)};if(profile.role!=="treasurer")btn("عرض PDF (رابط مؤقت)",async()=>{const win=window.open("about:blank","_blank");try{const d=await fileEdge({action:"signed_url",id:f.id});if(win)win.location=d.url;else window.location.href=d.url}catch(e){if(win)win.close();message("filesmsg",e.message||"تعذر فتح الملف.","error")}});if(["president","secretary_general"].includes(profile.role)&&["submitted","in_review","needs_correction","ready_for_final_approval"].includes(f.status)){if(f.status==="submitted")btn("بدء المراجعة",async()=>{try{await fileEdge({action:"review",id:f.id,status:"in_review"});await loadJoinFiles()}catch(e){message("filesmsg",e.message,"error")}});if(["submitted","in_review","ready_for_final_approval"].includes(f.status))btn("طلب تصحيح",async()=>{const note=prompt("اكتب بوضوح ما يجب تصحيحه في الملف:");if(note===null)return;try{await fileEdge({action:"review",id:f.id,status:"needs_correction",note});await loadJoinFiles()}catch(e){message("filesmsg",e.message,"error")}});if(["submitted","in_review"].includes(f.status))btn("جاهز للاعتماد النهائي",async()=>{if(!confirm("هل راجعت الملف كاملًا وتأكدت من استيفاء الوثائق؟"))return;try{await fileEdge({action:"review",id:f.id,status:"ready_for_final_approval"});await loadJoinFiles()}catch(e){message("filesmsg",e.message,"error")}})}if(profile.role==="treasurer"&&!f.payment_confirmed&&["submitted","in_review","ready_for_final_approval"].includes(f.status))btn("تأكيد التسديد",async()=>{if(!confirm("لا تؤكد إلا بعد التحقق من التسديد في السجل المالي. هل تحققت من العملية فعلًا؟"))return;try{await fileEdge({action:"confirm_payment",id:f.id});await loadJoinFiles();message("filesmsg","تم تسجيل تأكيد التسديد بعد إقرارك بالتحقق المالي.","success")}catch(e){message("filesmsg",e.message,"error")}});if(profile.role==="president"&&((f.status==="ready_for_final_approval"&&f.payment_confirmed)||f.status==="finalized"))btn(f.status==="finalized"?"متابعة الاعتماد/الحساب":"اعتماد نهائي وإنشاء حساب",async()=>{const promptText=f.status==="finalized"?"الطلب معتمد نهائيًا. هل تريد متابعة إنشاء/ربط دعوة الحساب؟":"تأكد من مراجعة الملف كاملًا ومن تأكيد أمين المال للتسديد. سيُسجّل الاعتماد النهائي ثم يُنشأ سجل المنخرط وتُرسل دعوة الحساب إلى البريد المسجل. هل تريد المتابعة؟";if(!confirm(promptText))return;try{const result=await finalizeMember(f.id);await loadJoinFiles();message("filesmsg",result.message||"تمت معالجة الاعتماد النهائي.",result.account_created===false||result.account_linked===false?"error":"success")}catch(e){message("filesmsg",e.message||"تعذر الاعتماد النهائي.","error")}});body.append(tr)}if(!files.length){const tr=document.createElement("tr"),td=document.createElement("td");td.colSpan=7;td.textContent="لا توجد ملفات مودعة حتى الآن.";tr.append(td);body.append(tr)}message("filesmsg","عدد الملفات: "+files.length+". لا يعني جاهزية الملف اعتمادًا نهائيًا أو إنشاء حساب.");}catch(e){message("filesmsg",e.message||"تعذر تحميل الملفات.","error")}}
async function loadJoinRequests(){const body=$("requestrows");body.replaceChildren();const {data,error}=await sb.from("join_requests").select("id,request_ref,full_name,birth_date,municipality,phone,email,interests,experience,status,reviewer_note,created_at,is_test").order("created_at",{ascending:false});if(error){message("workmsg","تعذر تحميل الطلبات وفق صلاحيات هذا الحساب.","error");return}for(const x of data||[]){const tr=document.createElement("tr"),cell=v=>{const td=document.createElement("td");td.textContent=v||"—";tr.append(td);return td};cell(x.request_ref+(x.is_test?" — [تجريبي غير رسمي]":""));cell(x.created_at?new Date(x.created_at).toLocaleString("ar-DZ"):"—");cell(x.full_name);cell(x.birth_date||"—");cell(x.municipality);cell(x.phone);cell(x.email);cell((x.interests||[]).map(v=>JOIN_INTERESTS[v]||v).join("، "));cell(x.experience);const st=cell("");const sel=document.createElement("select"),allowed=profile.role==="secretary_general"?["pending","needs_information"]:["pending","needs_information","approved","declined"];const choices=[...allowed];if(x.status&&!choices.includes(x.status))choices.unshift(x.status);choices.forEach(v=>{const o=document.createElement("option");o.value=v;o.textContent=JOIN_STATUS[v]||v;sel.append(o)});sel.value=x.status||"pending";const canReview=allowed.includes(x.status);if(!canReview)sel.disabled=true;st.append(sel);const nt=cell("");const note=document.createElement("input");note.value=x.reviewer_note||"";note.maxLength=1500;note.disabled=!canReview;nt.append(note);const bt=document.createElement("button");bt.className="btn";bt.textContent="حفظ";bt.disabled=!canReview;bt.onclick=async()=>{if(sel.value==="pending"){message("workmsg","يرجى اختيار نتيجة المراجعة قبل الحفظ: استكمال معلومات أو مقبول مبدئيًا أو مرفوض. تبقى حالة «قيد المراجعة» للطلبات التي لم تُراجع بعد.","error");return}bt.disabled=true;try{const {data,error}=await sb.from("join_requests").update({status:sel.value,reviewer_note:note.value.trim()||null,reviewed_at:new Date().toISOString()}).eq("id",x.id).select("id");if(error)throw error;if(!data||data.length!==1)throw Error("لم يتم تحديث الطلب. قد تكون صلاحيات الحساب غير كافية أو أن الطلب تغيّرت حالته.");message("workmsg","تم حفظ مراجعة "+x.request_ref+" بنجاح.","success");await requests()}catch(error){console.error("Join request review update failed:",error);message("workmsg","تعذر حفظ المراجعة: "+(error.message||"خطأ غير معروف") ,"error")}finally{bt.disabled=false}};cell("").append(bt);if(x.status==="approved"){const printBtn=document.createElement("button");printBtn.type="button";printBtn.className="btn";printBtn.style.marginTop=".35rem";printBtn.textContent="طباعة ورقة الاستكمال";printBtn.onclick=()=>{const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));const interests=(x.interests||[]).map(v=>JOIN_INTERESTS[v]||v).join("، ");const w=window.open("","_blank");if(!w){message("workmsg","يرجى السماح بالنوافذ المنبثقة لطباعة الورقة.","error");return}const doc='<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ورقة استكمال ملف طلب الانخراط</title><style>body{font-family:Tahoma,Arial,sans-serif;color:#172f27;max-width:850px;margin:25px auto;padding:20px;line-height:1.8}h1,h2{text-align:center}h1{font-size:22px}h2{font-size:18px;border-bottom:1px solid #777;padding-bottom:8px}.sub{text-align:center;color:#555}.box{border:1px solid #777;padding:12px;margin:14px 0}.row{display:flex;gap:12px;flex-wrap:wrap;border-bottom:1px dotted #aaa;padding:7px 0}.label{font-weight:bold;min-width:145px}.check{margin:12px 0}.line{display:inline-block;min-width:180px;border-bottom:1px solid #777;height:1em}.note{font-size:13px;color:#444}.sign{display:flex;justify-content:space-between;margin-top:50px;gap:30px}.sign div{width:45%;border-top:1px solid #777;padding-top:8px}@media print{body{margin:0 auto;padding:10mm}button{display:none}}</style></head><body><h1>جمعية الأفق الولائية للرياضات الجوية والجبلية — الشلف</h1><h2>ورقة استكمال ملف طلب الانخراط</h2><p class="sub">قبول مبدئي — ليست إثباتًا للانخراط النهائي ولا تنشئ حسابًا في المنصة</p><div class="box"><div class="row"><span class="label">رقم مرجع الطلب:</span><span>'+esc(x.request_ref)+'</span></div><div class="row"><span class="label">الاسم الكامل:</span><span>'+esc(x.full_name)+'</span></div><div class="row"><span class="label">تاريخ الميلاد:</span><span>'+esc(x.birth_date||"غير مدخل")+'</span></div><div class="row"><span class="label">بلدية الإقامة:</span><span>'+esc(x.municipality)+'</span></div><div class="row"><span class="label">رقم الهاتف:</span><span>'+esc(x.phone)+'</span></div><div class="row"><span class="label">البريد الإلكتروني:</span><span>'+esc(x.email||"غير مدخل")+'</span></div><div class="row"><span class="label">مجالات الاهتمام:</span><span>'+esc(interests||"—")+'</span></div></div><h2>استكمال الملف</h2><p>يرجى التنسيق مع الجمعية لمعرفة الوثائق المطلوبة والمعتمدة قبل إيداع الملف. لا تعتبر البنود التالية قائمة إلزامية محددة مسبقًا؛ تُملأ وفق الإجراءات التي تعتمدها الجمعية.</p><div class="check">☐ الوثيقة المطلوبة: <span class="line"></span></div><div class="check">☐ الوثيقة المطلوبة: <span class="line"></span></div><div class="check">☐ الوثيقة المطلوبة: <span class="line"></span></div><div class="check">☐ وثائق أخرى: <span class="line"></span></div><div class="box"><b>ملاحظات استكمال الملف:</b><p style="min-height:55px"></p></div><p class="note">تنبيه: القبول المبدئي لا يمنح صفة المنخرط، ولا يثبت تسديد أي اشتراك، ولا يفعّل حسابًا. تُستكمل إجراءات الانخراط وتُثبت الموافقة النهائية وفق قرارات الجمعية ونظامها المعتمد، دون تطبيق رسوم أو باقات غير مصادق عليها.</p><div class="sign"><div>إمضاء صاحب الطلب</div><div>ملاحظة/تأشير الجمعية</div></div><p class="note">تاريخ تحرير الورقة: '+esc(new Date().toLocaleDateString("ar-DZ"))+'</p><script>window.onload=()=>window.print()<\/script></body></html>';w.document.open();w.document.write(doc);w.document.close()};tr.lastElementChild?.append(printBtn)}body.append(tr)}if(!data?.length)body.innerHTML='<tr><td colspan="12">لا توجد طلبات.</td></tr>'}
async function refreshAll(){
 message("m-message","جارٍ تحديث بيانات التسيير…");
 const failures=[];
 const run=async(label,task)=>{try{await task()}catch(e){failures.push(label+": "+(e?.message||"خطأ غير معروف"));console.error("[Elafak management] "+label,e)}};
 if(canViewFinance()){
  await run("السنة المالية",loadYears);
  await run("السجل المحاسبي",loadFinance);
 }
 if(roleIs("president","treasurer")){
  await run("دفعات الاشتراك",loadPaymentWorkflow);
  await run("مسودات العمليات المالية",()=>loadOfficialRecordDrafts("finance_transaction"));
 }
 if(roleIs("president","secretary_general"))await run("طلبات الانخراط",loadJoinRequests);
 if(roleIs("president","secretary_general","treasurer"))await run("ملفات استكمال الانخراط",loadJoinFiles);
 if(canViewActivities())await run("الأنشطة",loadActivities);
 if(roleIs("president","technical_director"))await run("مسودات الأنشطة",()=>loadOfficialRecordDrafts("activity"));
 if(canViewEquipment())await run("سجل الجرد",loadEquipment);
 if(roleIs("president","treasurer"))await run("مسودات سجل الجرد",()=>loadOfficialRecordDrafts("equipment"));
 if(canViewTasks())await run("المهام والتكليفات",loadTasks);
 if(canViewInspections())await run("تقارير التفتيش",loadInspectionReports);
 if(canViewMeetings())await run("الاجتماعات وسجل المداولة",loadMeetings);
 if(canViewMeetings()&&!roleIs("inspection_inspector"))await run("قائمة الجمعية العامة",loadFoundingRoster);
 if((canViewMeetings()&&!roleIs("inspection_inspector"))||roleIs("treasurer","deputy_treasurer"))await run("التشكيلة الرسمية للمكتب التنفيذي",loadExecutiveRoster);
 if(failures.length)message("m-message","تم تحميل الوحدات التي تعمل، لكن تعذر تحميل: "+failures.join("؛ "),"error");
 else message("m-message","تم تحديث الوحدات المتاحة لهذا الحساب.","success");
}
async function saveForm(form,table,fields,roleCheck,msgId){
 form.addEventListener("submit",async e=>{
  e.preventDefault();
  const draftTable=["finance_transactions","activities","equipment"].includes(table);
  if(draftTable?!canCreateOfficialDraft(table):!roleCheck()){message(msgId,"هذا الحساب لا يملك صلاحية إنشاء هذه المسودة أو تعديلها.","error");return}
  const raw=values(form),id=raw.id,draftId=raw.draft_id;delete raw.id;delete raw.draft_id;
  const payload={};fields.forEach(k=>{if(raw[k]!==undefined)payload[k]=raw[k]===""?null:raw[k]});
  if(table==="finance_transactions"){
   payload.fiscal_year=Number($("finance-year").value);
   const selectedYear=years.find(y=>Number(y.fiscal_year)===payload.fiscal_year);
   if(!selectedYear||selectedYear.is_closed){message(msgId,"لا يمكن إعداد مسودة لعملية مالية دون سنة مالية مفتوحة.","error");return}
   payload.amount=Number(payload.amount);
   const feeLikeIncome=payload.transaction_type==="income"&&/اشتراك|انخراط|رسوم\s*(?:العضوية|الانخراط)|membership\s*(?:fee|dues)|annual\s*(?:subscription|dues)/i.test(String(payload.category||"")+" "+String(payload.description||""));
   if(!id&&feeLikeIncome){
    const {data:feeSetting,error:feeError}=await sb.from("association_settings").select("setting_value,source_meeting_id").eq("setting_key","annual_membership_fee_dzd").maybeSingle();
    const approvedAmount=Number(feeSetting?.setting_value?.amount||0);
    if(feeError||!approvedAmount){message(msgId,"لا يوجد مبلغ اشتراك سنوي معتمد ومربوط بمحضر جمعية عامة. سجّل القرار أولًا من قسم الاجتماعات والقرارات.","error");return}
    if(Math.abs(Number(payload.amount)-approvedAmount)>0.001){message(msgId,"مبلغ العملية لا يطابق الاشتراك السنوي المعتمد ("+fmt(approvedAmount)+").","error");return}
   }
  }
  if(table==="activities"){payload.planned_budget=Number(payload.planned_budget||0);payload.actual_budget=Number(payload.actual_budget||0)}
  if(table==="equipment"){payload.quantity=Number(payload.quantity||0);payload.acquisition_cost=payload.acquisition_cost===null?null:Number(payload.acquisition_cost)}
  if(table==="meetings"){payload.attendees_count=payload.attendees_count===null?null:Number(payload.attendees_count);payload.entered_by=user.id;payload.status="draft";payload.approved_by=null;payload.approved_at=null}
  if(payload.transaction_date==="")payload.transaction_date=null;
  const submit=form.querySelector('button[type="submit"],button:not([type])');if(submit)submit.disabled=true;
  try{
   if(draftTable){
    const recordType=table==="finance_transactions"?"finance_transaction":table==="equipment"?"equipment":"activity";
    const draftPayload={...payload};
    const draftRow={payload:draftPayload,updated_by:user.id,updated_at:new Date().toISOString()};
    if(draftId){
     const {error}=await sb.from("official_record_drafts").update(draftRow).eq("id",draftId).in("status",["draft","changes_requested"]).select("id").single();
     if(error)throw error;
    }else{
     const {error}=await sb.from("official_record_drafts").insert({
      record_type:recordType,operation:id?"update":"create",target_record_id:id||null,
      payload:draftPayload,status:"draft",created_by:user.id,updated_by:user.id
     });
     if(error)throw error;
    }
    form.reset();if(form.elements.namedItem("id"))form.elements.namedItem("id").value="";
    if(form.elements.namedItem("draft_id"))form.elements.namedItem("draft_id").value="";
    if(table==="finance_transactions")form.elements.transaction_date.value=localToday();
    await loadOfficialRecordDrafts(recordType);
    message(msgId,draftId?"تم تحديث المسودة في مساحة العمل المشتركة.":"حُفظت المسودة بانتظار مراجعة الرئيس؛ لم تُدرج في السجل الرسمي بعد.","success");
    return;
   }
   if(!id&&table==="meetings")payload.is_test=true;
   if(id){payload.updated_at=new Date().toISOString();const {error}=await sb.from(table).update(payload).eq("id",id);if(error)throw error}
   else{const {error}=await sb.from(table).insert(payload);if(error)throw error}
   form.reset();if(form.elements.namedItem("id"))form.elements.namedItem("id").value="";
   if(table==="finance_transactions"){$("finance-form").elements.transaction_date.value=localToday();await loadFinance()}
   if(table==="activities")await loadActivities();
   if(table==="equipment")await loadEquipment();
   if(table==="meetings")await loadMeetings();
   message(msgId,id?"تم تحديث السجل.":"تمت إضافة السجل.","success");
  }catch(err){message(msgId,"تعذر حفظ السجل: "+(err.message||"خطأ غير معروف"),"error")}
  finally{if(submit)submit.disabled=false}
 });
}
async function loadOfficialRecordDrafts(recordType){
 const tableId=recordType==="finance_transaction"?"finance-draft-rows":recordType==="equipment"?"equipment-draft-rows":"activity-draft-rows";
 const body=$(tableId);if(!body)return;
 const canRead=roleIs("president")||
  (recordType==="finance_transaction"&&roleIs("treasurer"))||
  (recordType==="equipment"&&roleIs("treasurer"))||
  (recordType==="activity"&&roleIs("technical_director"));
 if(!canRead)return;
 const {data,error}=await sb.from("official_record_drafts").select("*").eq("record_type",recordType).in("status",["draft","changes_requested"]).order("created_at",{ascending:false});
 if(error)throw error;
 body.replaceChildren();
 const formId=recordType==="finance_transaction"?"finance-form":recordType==="equipment"?"equipment-form":"activity-form";
 const msgId=recordType==="finance_transaction"?"finance-msg":recordType==="equipment"?"equipment-msg":"activities-msg";
 const summary=d=>{
  const p=d.payload||{};
  if(recordType==="finance_transaction")return (TYPE[p.transaction_type]||p.transaction_type||"عملية")+" — "+(p.category||"دون تصنيف")+" — "+fmt(p.amount);
  if(recordType==="equipment")return (p.item_name||"معدة دون اسم")+" × "+(p.quantity??1);
  return (p.title||"نشاط دون عنوان")+" — "+dateFmt(p.activity_date);
 };
 const statusLabel=s=>s==="changes_requested"?"ملاحظة من الرئيس — تعديل مطلوب":"مسودة مشتركة";
 for(const d of data||[]){
  const tr=document.createElement("tr");
  safeCell(tr,d.operation==="update"?"تعديل سجل":"إضافة سجل");
  safeCell(tr,summary(d));
  safeCell(tr,statusLabel(d.status));
  safeCell(tr,d.review_note||"—");
  safeCell(tr,new Date(d.created_at).toLocaleString("ar-DZ"));
  const box=rowActions(tr);
  if(roleIs("president")){
   button(box,"ملاحظة",async()=>{
    const note=prompt("اكتب ملاحظة التعديل التي ستظهر للمسؤول المختص:",d.review_note||"");
    if(note===null)return;
    if(note.trim().length<3){message(msgId,"اكتب ملاحظة واضحة لا تقل عن ثلاثة أحرف.","error");return}
    try{
     const {error}=await sb.from("official_record_drafts").update({status:"changes_requested",review_note:note.trim()}).eq("id",d.id).select("id").single();
     if(error)throw error;
     await loadOfficialRecordDrafts(recordType);
     message(msgId,"حُفظت ملاحظة الرئيس في المساحة المشتركة.","success");
    }catch(e){message(msgId,"تعذر حفظ الملاحظة: "+e.message,"error")}
   });
   button(box,"اعتماد",async()=>{
    if(!confirm("اعتماد هذه المسودة وإدراجها في السجل الرسمي؟ لا يمكن تعديل سجل الاعتماد بعد ذلك."))return;
    try{
     const {data:approved,error}=await sb.from("official_record_drafts").update({status:"approved",review_note:null}).eq("id",d.id).select("id,register_year,register_number,target_record_id").single();
     if(error)throw error;
     await loadOfficialRecordDrafts(recordType);
     if(recordType==="finance_transaction"){await loadYears();await loadFinance()}
     if(recordType==="equipment")await loadEquipment();
     if(recordType==="activity")await loadActivities();
     const register=approved?.register_year&&approved?.register_number?" رقم الاعتماد "+approved.register_year+"/"+String(approved.register_number).padStart(4,"0")+".":"";
     message(msgId,"تم اعتماد المسودة وإدراجها في السجل الرسمي."+register+" احتُفظ بسجل الاعتماد.","success");
    }catch(e){message(msgId,"تعذر اعتماد المسودة: "+e.message,"error")}
   });
  }else if(d.created_by===user.id){
   button(box,"تحرير المسودة",async()=>{
    const form=$(formId),values={...(d.payload||{}),id:d.target_record_id||"",draft_id:d.id};
    setForm(form,values);
    if(recordType==="finance_transaction"){
     if(d.payload?.transaction_date)form.elements.transaction_date.value=d.payload.transaction_date;
     if(d.payload?.fiscal_year&&years.some(y=>Number(y.fiscal_year)===Number(d.payload.fiscal_year)))$("finance-year").value=String(d.payload.fiscal_year);
     await loadFinance();
    }
    form.scrollIntoView({behavior:"smooth",block:"center"});
    message(msgId,"تحرير المسودة المشتركة؛ سيظل السجل الرسمي دون تغيير حتى يعتمدها الرئيس.");
   });
  }
  body.append(tr);
 }
 if(!(data||[]).length){const tr=document.createElement("tr");const td=safeCell(tr,"لا توجد مسودات بانتظار المراجعة.");td.colSpan=6;body.append(tr)}
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
 const tables=["financial_years","finance_transactions","association_settings","activities","equipment","meetings","join_requests","members","founding_member_roster","executive_office_roster","staff_profiles","audit_log"];
 for(const t of tables){
  try{const {data,error}=await sb.from(t).select("*").limit(10000);if(error)throw error;backup.tables[t]=data||[];}
  catch(e){backup.tables[t]={not_exported:true,reason:e.message||"غير متاح وفق صلاحيات الحساب"};}
 }
 downloadJSON("elafak-backup-"+localToday()+".json",backup);
 message("archive-msg","تم تجهيز نسخة JSON من السجلات التي سمحت الصلاحيات بقراءتها. راجع العناصر التي تحمل not_exported قبل اعتبار النسخة كاملة.","success");
}
function bind(){
 setupTabs();
 $("m-login-form").addEventListener("submit",async e=>{e.preventDefault();const f=new FormData(e.currentTarget),username=String(f.get("username")||"").trim().toLowerCase(),password=String(f.get("password")||""),b=$("m-login-btn");b.disabled=true;message("m-login-msg","جارٍ التحقق من الحساب…");try{const {error}=await sb.auth.signInWithPassword({email:username+"@staff.elafak.invalid",password});if(error)throw error;await enter()}catch(err){console.error("Management sign-in/profile error:",err);message("m-login-msg",err?.message||"تعذر الدخول. تحقق من بيانات الحساب.","error")}finally{b.disabled=false}});
 $("logout").onclick=async()=>{await sb.auth.signOut();window.location.replace("/")};
 $("m-refresh").onclick=refreshAll;
 $("join-refresh").onclick=()=>loadJoinRequests().catch(e=>message("workmsg",e.message,"error"));
 $("refresh-files").onclick=()=>loadJoinFiles().catch(e=>message("filesmsg",e.message,"error"));
 $("finance-year").addEventListener("change",()=>loadFinance().catch(e=>message("finance-msg",e.message,"error")));
 $("close-year").onclick=async()=>{const y=years.find(x=>String(x.fiscal_year)===$("finance-year").value);if(!y||y.is_closed)return;if(!confirm("إقفال السنة "+y.fiscal_year+"؟ سيصبح سجل عملياتها للقراءة فقط."))return;try{const closing=Number($("finance-closing").value.replace(/[^0-9,.-]/g,"").replace(",", "."));const officialTransactions=transactions.filter(x=>!x.is_test),income=officialTransactions.filter(x=>x.transaction_type==="income").reduce((a,x)=>a+Number(x.amount),0),expense=officialTransactions.filter(x=>x.transaction_type==="expense").reduce((a,x)=>a+Number(x.amount),0);const balance=Number(y.opening_balance)+income-expense;const {error}=await sb.from("financial_years").update({is_closed:true,closing_balance:balance,closed_at:new Date().toISOString(),closed_by:user.id}).eq("fiscal_year",y.fiscal_year);if(error)throw error;await loadYears();await loadFinance();message("finance-msg","أُقفلت السنة المالية وحُفظ رصيدها الختامي.","success")}catch(e){message("finance-msg","تعذر إقفال السنة: "+e.message,"error")}};
 $("finance-cancel").onclick=()=>{setForm($("finance-form"));$("finance-form").elements.transaction_date.value=localToday();message("finance-msg","تم إلغاء التعديل.")};
 $("activity-cancel").onclick=()=>setForm($("activity-form"));
 $("equipment-cancel").onclick=()=>setForm($("equipment-form"));
 $("tasks-refresh").onclick=()=>loadTasks().catch(e=>message("tasks-msg",e.message,"error"));
 $("task-cancel").onclick=()=>setForm($("task-form"));
 $("task-form").addEventListener("submit",async e=>{
  e.preventDefault();if(!canViewTasks()){message("tasks-msg","هذه الوحدة خاصة بالرئيس.","error");return}
  const v=values(e.currentTarget),id=v.id;delete v.id;
  const status=v.status||"pending";
  const payload={title:v.title,description:v.description||"",assigned_to:v.assigned_to||"",priority:v.priority||"normal",status,due_date:v.due_date||null,completion_note:v.completion_note||"",created_by:user.id,updated_at:new Date().toISOString(),completed_at:status==="completed"?new Date().toISOString():null};
  try{const q=id?sb.from("executive_tasks").update(payload).eq("id",id):sb.from("executive_tasks").insert(payload);const {error}=await q;if(error)throw error;setForm($("task-form"));await loadTasks();message("tasks-msg","تم حفظ التكليف.","success")}catch(err){message("tasks-msg","تعذر حفظ التكليف: "+err.message,"error")}
 });
 $("inspections-refresh").onclick=()=>loadInspectionReports().catch(e=>message("inspections-msg",e.message,"error"));
 $("inspection-followups-refresh").onclick=()=>loadInspectionFollowups().catch(e=>message("inspection-followups-msg",e.message,"error"));
 $("inspection-followup-form").addEventListener("submit",e=>{e.preventDefault();saveInspectionFollowup(e.currentTarget)});
 $("inspection-followup-cancel").onclick=()=>{setForm($("inspection-followup-form"));populateInspectionFollowupReportOptions("");message("inspection-followups-msg","تم إلغاء التحرير.")};

 $("inspection-cancel").onclick=()=>{setForm($("inspection-form"));$("inspection-form").elements.inspection_date.value=localToday();$("inspection-form").elements.inspected_entity.value="جمعية الأفق الولائية للرياضات الجوية والجبلية"};
 $("inspection-form").addEventListener("submit",e=>{e.preventDefault();submitInspectionReport(e.currentTarget)});
 $("inspection-form").elements.inspection_date.value=localToday();

 document.querySelectorAll("[data-delib-open]").forEach(el=>el.addEventListener("click",()=>showDeliberationView(el.dataset.delibOpen)));
 document.querySelectorAll("[data-delib-home]").forEach(el=>el.addEventListener("click",()=>showDeliberationView("home")));
 document.querySelectorAll("[data-delib-new]").forEach(el=>el.addEventListener("click",()=>startDeliberationDraft(el.dataset.delibNew)));
 $("delib-prefill-from-meeting").addEventListener("click",importMeetingIntoDelibDraft);
 $("delib-save-draft").addEventListener("click",saveDeliberationDraft);
 $("delib-notifications-refresh").addEventListener("click",loadDeliberationNotifications);

 $("delib-cancel-form").addEventListener("click",()=>{setForm($("deliberation-form"),{output_type:"report",status:"draft"});showDeliberationView("home")});

 $("meeting-cancel").onclick=()=>{setForm($("meeting-form"));message("meetings-msg","تم إلغاء التعديل.")};
 $("meeting-build-template").onclick=()=>{
  const f=$("meeting-form"),v=values(f),type=MEETTYPE[v.meeting_type]||v.meeting_type;
  const section=(title,value)=>title+"\n"+(String(value||"").trim()||"لم يُدرج.");
  const parts=["جمعية الأفق الولائية للرياضات الجوية والجبلية","محضر اجتماع",
   "عنوان الاجتماع: "+(v.title||"غير محدد"),"نوع الاجتماع: "+type,"التاريخ: "+(v.meeting_date||"غير محدد"),"ساعة البداية: "+(v.meeting_start_time||"غير محددة"),"المكان: "+(v.location||"غير محدد"),"رئيس الاجتماع: "+(v.meeting_chair||"غير محدد"),
   section("الحاضرون وصفاتهم:",v.meeting_attendees),section("جدول الأعمال:",v.meeting_agenda),section("مجريات الاجتماع والمناقشات:",v.meeting_discussion),section("القرارات:",v.decisions),section("النصاب وملاحظاته:",v.quorum_note),section("المرفقات:",v.meeting_attachments),
   "اختتام الاجتماع: "+(v.meeting_end_time||"ساعة غير محددة"),"حرر هذا المحضر للمراجعة قبل اعتماده.", "إمضاء رئيس الاجتماع: ____________________","إمضاء الأمين العام/محرر المحضر: ____________________"];
  f.elements.minutes_text.value=parts.join("\n\n");
  if(!f.elements.attendees_count.value.trim()&&v.meeting_attendees.trim())f.elements.attendees_count.value=String(v.meeting_attendees.trim().split("\n").filter(Boolean).length);
  message("meetings-msg","تم تكوين مسودة قابلة للتحرير. راجع الوقائع والأسماء والنصاب والقرارات قبل الحفظ أو الاعتماد.","success");
 };

 $("dues-payment-form").addEventListener("submit",async e=>{
  e.preventDefault();if(!canFinance()){message("dues-payment-msg","هذه العملية متاحة للرئيس وأمين المال فقط.","error");return}
  const v=values(e.currentTarget),amount=Number(v.amount);
  if(!v.obligation_id||!Number.isFinite(amount)||amount<=0){message("dues-payment-msg","اختر استحقاقًا وأدخل مبلغًا صحيحًا.","error");return}
  if(!confirm("ستُسجل الدفعة بانتظار التحقق فقط، ولن تُحتسب إيرادًا رسميًا قبل مراجعة الإيصال. هل تريد المتابعة؟"))return;
  const btn=$("dues-payment-save");btn.disabled=true;
  try{
   const {data,error}=await sb.rpc("record_membership_dues_payment",{p_obligation_id:v.obligation_id,p_amount:amount,p_payment_date:v.payment_date,p_payment_method:v.payment_method,p_receipt_reference:v.receipt_reference||null});
   if(error)throw error;
   message("dues-payment-msg","سُجلت الدفعة بانتظار التحقق. لم يُنشأ إيراد رسمي بعد.","success");
   e.currentTarget.reset();e.currentTarget.elements.payment_date.value=localToday();
   await loadPaymentWorkflow();
  }catch(err){message("dues-payment-msg","تعذر تسجيل الدفعة: "+(err.message||"خطأ غير معروف"),"error")}
  finally{btn.disabled=false}
 });
 $("dues-payment-form").elements.payment_date.value=localToday();

 $("decision-source-meeting").addEventListener("change",suggestDecisionFromMeeting);
 $("dues-generation-year").value=String(new Date().getFullYear());
 $("dues-generation-year").min="2025";
 $("dues-generation-year").max=String(new Date().getFullYear()+3);
 $("dues-generate-button").addEventListener("click",async()=>{
  if(!canFinance()){message("dues-generation-msg","هذه العملية متاحة للرئيس وأمين المال فقط.","error");return}
  const year=Number($("dues-generation-year").value);
  if(!Number.isInteger(year)||year<2025||year>new Date().getFullYear()+3){message("dues-generation-msg","اختر سنة ضمن النطاق المسموح.","error");return}
  if(!confirm("سيتم إنشاء استحقاقات السنة "+year+" للأعضاء النشطين المسجلين فقط، إذا وجدت قاعدة اشتراك معتمدة ونشطة. لن تُغيّر حالة العضوية. هل تريد المتابعة؟"))return;
  const btn=$("dues-generate-button");btn.disabled=true;
  try{
   const {data,error}=await sb.rpc("generate_membership_dues_for_year",{p_year:year});
   if(error)throw error;
   const created=Number(data?.obligations_created||0), notices=Number(data?.notifications_created||0);
   message("dues-generation-msg","اكتملت العملية للسنة "+year+". استحقاقات جديدة: "+created+"؛ إشعارات شخصية: "+notices+". لم تتغير حالات العضوية أو أهلية التصويت.","success");
  }catch(err){message("dues-generation-msg","لم تُنشأ الاستحقاقات: "+(err.message||"لا توجد قاعدة اشتراك معتمدة ونشطة أو لا يملك الحساب الصلاحية."),"error")}
  finally{btn.disabled=false}
 });
 $("ga-invite-source").addEventListener("change",suggestGAInvitationAgenda);
 $("ga-invitations-form").addEventListener("submit",async e=>{e.preventDefault();await createGAInvitationsAndPrint()});
 $("ga-invite-date").value=localToday();
 $("ga-invite-issued-date").value=localToday();
 $("decision-settings-form").addEventListener("submit",async e=>{
  e.preventDefault();
  if(!roleIs("president")){message("decision-settings-msg","تفعيل قاعدة الاشتراك المعتمدة متاح للرئيس فقط.","error");return}
  const v=values(e.currentTarget),source=meetings.find(m=>m.id===v.source_meeting_id);
  if(!source||source.is_test||source.meeting_type!=="general_assembly"||source.status!=="approved"){message("decision-settings-msg","اختر محضر جمعية عامة معتمدًا وغير تجريبي.","error");return}
  const excerpt=v.source_decision.trim(),report=(source.decisions||"")+"\n"+(source.minutes_text||"");
  if(!excerpt||!report.includes(excerpt)){message("decision-settings-msg","يجب أن يكون نص القرار منقولًا حرفيًا من خانة القرارات أو نص المحضر المعتمد.","error");return}
  const amount=Number(v.amount);if(!Number.isFinite(amount)||amount<=0){message("decision-settings-msg","أدخل مبلغًا صحيحًا أكبر من صفر.","error");return}
  if(!confirm("سيُنشأ سجل اشتراك سنوي نشط بمبلغ "+fmt(amount)+" دج اعتمادًا على محضر جمعية عامة معتمد. هل تحققت من نص القرار والمبلغ وتاريخ السريان؟"))return;
  const btn=$("decision-fee-save");btn.disabled=true;
  try{
   const {data,error}=await sb.rpc("activate_membership_fee_rule",{p_source_meeting_id:source.id,p_annual_amount:amount,p_effective_date:v.effective_date,p_source_decision:excerpt});
   if(error)throw error;
   message("decision-settings-msg","تم تسجيل قاعدة الاشتراك المعتمدة في سجل الاشتراكات. لم تُنشأ استحقاقات للأعضاء تلقائيًا؛ يلزم تشغيل إنشاء الاستحقاقات للسنة المطلوبة بعد مراجعتها.","success");
   await loadDecisionSettings();
  }catch(err){message("decision-settings-msg","تعذر تفعيل قاعدة الاشتراك: "+(err.message||"خطأ غير معروف"),"error")}
  finally{btn.disabled=false}
 });
 $("finance-export").onclick=()=>exportCSV("elafak-finance-"+$("finance-year").value+".csv",transactions.filter(x=>!x.is_test));
 $("activities-export").onclick=()=>exportCSV("elafak-activities.csv",activities.filter(x=>!x.is_test));
 $("equipment-export").onclick=()=>exportCSV("elafak-equipment.csv",equipment.filter(x=>!x.is_test));
 $("tasks-refresh").setAttribute("aria-label","تحديث سجل المهام");
 $("inspections-refresh").setAttribute("aria-label","تحديث تقارير التفتيش");
 $("meetings-export").onclick=()=>exportCSV("elafak-meetings.csv",meetings.filter(x=>!x.is_test));
 $("backup-json").onclick=backup;$("print-page").onclick=()=>window.print();$("audit-refresh").onclick=()=>loadAudit();
 $("finance-drafts-refresh").onclick=()=>loadOfficialRecordDrafts("finance_transaction").catch(e=>message("finance-msg",e.message,"error"));
 $("activity-drafts-refresh").onclick=()=>loadOfficialRecordDrafts("activity").catch(e=>message("activities-msg",e.message,"error"));
 $("equipment-drafts-refresh").onclick=()=>loadOfficialRecordDrafts("equipment").catch(e=>message("equipment-msg",e.message,"error"));
 saveForm($("finance-form"),"finance_transactions",["transaction_date","transaction_type","category","amount","payment_method","reference","description"],()=>roleIs("treasurer"),"finance-msg");
 saveForm($("activity-form"),"activities",["title","activity_date","location","activity_type","status","leader","planned_budget","actual_budget","notes"],canEditActivities,"activities-msg");
 saveForm($("equipment-form"),"equipment",["item_name","category","quantity","condition","serial_number","acquisition_date","acquisition_cost","storage_location","notes"],canEditEquipment,"equipment-msg");
 saveForm($("meeting-form"),"meetings",["title","meeting_type","meeting_date","meeting_start_time","meeting_end_time","location","meeting_chair","attendees_count","quorum_note","meeting_attendees","meeting_agenda","meeting_discussion","decisions","meeting_attachments","minutes_text"],canEditMeetings,"meetings-msg");
 $("finance-form").elements.transaction_date.value=localToday();
}
async function enter(){
 if(!ENTRY||ENTRY==="general_assembly"||ENTRY==="site_admin"){window.location.replace(ENTRY==="site_admin"?"/staff.html?entry=site_admin":"/management-portal.html");return}
 profile=await profileLoad();
 if(!profile){hide("m-app",true);hide("m-login",false);message("m-login-msg","تعذر التحقق من صلاحية الحساب. راجع مدير الموقع.","error");return}
 if(!entryAllows(profile.role)){
  await sb.auth.signOut();profile=null;user=null;hide("m-app",true);hide("m-login",false);
  message("m-login-msg","هذا الحساب غير مخوّل بالدخول من هذا المسار. تم إنهاء الجلسة؛ افتح بوابة التسيير لاختيار المسار الموافق لحسابك.","error");return;
 }
 hide("m-login",true);hide("m-app",false);applyPermissions();await refreshAll();
 subscribeDeliberationUpdates();
}
addEventListener("DOMContentLoaded",()=>{
 if(!ENTRY||ENTRY==="general_assembly"||ENTRY==="site_admin"){window.location.replace(ENTRY==="site_admin"?"/staff.html?entry=site_admin":"/management-portal.html");return}
 if(!window.supabase){message("m-login-msg","تعذر تحميل خدمة الدخول. تحقق من الاتصال بالإنترنت.");return}
 sb=window.supabase.createClient(SUPABASE_URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storage:window.localStorage,storageKey:CONFIG.storageKey}});bind();
 sb.auth.getSession().then(({data,error})=>{if(error){message("m-login-msg","تعذر استعادة جلسة الدخول: "+error.message,"error");return}if(data.session){enter().catch(err=>{console.error("Management session restore failed:",err);hide("m-app",true);hide("m-login",false);message("m-login-msg",err?.message||"تم العثور على جلسة لكن تعذر تحميل لوحة الإدارة.","error")})}else{hide("m-app",true);hide("m-login",false)}});
});
})();