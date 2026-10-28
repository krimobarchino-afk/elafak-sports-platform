(()=>{"use strict";
const C=window.ElAfakSupabaseConfig||{url:"https://lfubzohsbwdoiagfkpkt.supabase.co",key:"sb_publishable_tCZjOnFHLIeQHF0mR9tVFA_9bu4lLrJ",storageKey:"sb-lfubzohsbwdoiagfkpkt-auth-token"};
const $=id=>document.getElementById(id);
const TITLES={deliberation:"سجل المداولة",accounting:"سجل المحاسبة",equipment:"سجل العتاد",outgoing_mail:"سجل المراسلات الصادرة",incoming_mail:"سجل المراسلات الواردة",activities:"سجل الأنشطة",tasks:"سجل المهام",inspection:"سجل التفتيش والمراقبة"};
const ROLES={
 deliberation:["president","deputy_president","secretary_general","deputy_secretary_general"],
 accounting:["president","treasurer","deputy_treasurer","technical_director"],
 equipment:["president","treasurer","deputy_treasurer","technical_director"],
 outgoing_mail:["president","deputy_president","secretary_general","deputy_secretary_general"],
 incoming_mail:["president","deputy_president","secretary_general","deputy_secretary_general"],
 activities:["president","deputy_president","secretary_general","deputy_secretary_general","treasurer","deputy_treasurer","technical_director"],
 tasks:["president"],
 inspection:["president","deputy_president","secretary_general","deputy_secretary_general","treasurer","deputy_treasurer","technical_director","inspection_inspector"]
};
const DRAFT_ROLE={deliberation:"secretary_general",accounting:"treasurer",equipment:"treasurer",outgoing_mail:"secretary_general",incoming_mail:"secretary_general",activities:"technical_director"};
const FIELDS={
 deliberation:[["title","عنوان المداولة","text",true],["record_date","تاريخ المداولة","date",true],["meeting_type","نوع الاجتماع","text",false],["attendees","الحاضرون وصفاتهم","textarea",true],["agenda","جدول الأعمال","textarea",true],["discussion","المناقشات","textarea",false],["decisions","القرارات","textarea",true],["attachments","المرفقات والمراجع","textarea",false]],
 accounting:[["transaction_date","تاريخ العملية","date",true],["transaction_type","نوع العملية (إيراد/مصروف)","select",true,["إيراد","مصروف"]],["category","التصنيف","text",true],["amount","المبلغ بالدينار الجزائري","number",true],["payment_method","طريقة الدفع","text",false],["reference","مرجع الوثيقة","text",false],["description","بيان العملية","textarea",true]],
 equipment:[["item_name","اسم العتاد","text",true],["category","الصنف","text",false],["quantity","الكمية","number",true],["condition","الحالة","text",true],["serial_number","الرقم التسلسلي","text",false],["acquisition_date","تاريخ الاقتناء","date",false],["storage_location","مكان التخزين","text",false],["notes","ملاحظات","textarea",false]],
 outgoing_mail:[["mail_date","تاريخ الإرسال","date",true],["recipient","الجهة المرسل إليها","text",true],["subject","موضوع المراسلة","text",true],["reference","رقم/مرجع المراسلة","text",false],["summary","ملخص المحتوى","textarea",true],["attachments","المرفقات","textarea",false]],
 incoming_mail:[["mail_date","تاريخ الاستلام","date",true],["sender","الجهة المرسلة","text",true],["subject","موضوع المراسلة","text",true],["reference","رقم/مرجع المراسلة","text",false],["summary","ملخص المحتوى","textarea",true],["follow_up","إجراء المتابعة","textarea",false]],
 activities:[["title","اسم النشاط","text",true],["activity_date","تاريخ النشاط","date",true],["location","المكان","text",false],["activity_type","نوع النشاط","text",true],["leader","مسؤول النشاط","text",false],["planned_budget","الميزانية المخططة (دج)","number",false],["actual_budget","التكلفة الفعلية (دج)","number",false],["notes","التفاصيل والملاحظات","textarea",true]],
 tasks:[["title","عنوان المهمة","text",true],["assigned_to","المكلّف بالمهمة","text",true],["priority","الأولوية","select",true,["منخفضة","عادية","عالية","عاجلة"]],["due_date","الأجل","date",false],["description","تفاصيل التكليف","textarea",true],["status","حالة التنفيذ","select",true,["جديدة","قيد التنفيذ","منجزة","مؤجلة"]]],
 inspection:[["report_date","تاريخ التفتيش/المراقبة","date",true],["inspector_name","اسم المفتش","text",true],["scope","موضوع التفتيش","text",true],["observations","الملاحظات والمعاينات","textarea",true],["recommendations","التوصيات","textarea",false],["follow_up","المتابعة المطلوبة","textarea",false]]
};
let sb,profile,editDraft=null;
const msg=(s,kind="")=>{const e=$("registers-msg");if(e){e.textContent=s;e.className="m-msg "+kind}};
function el(tag,txt,cls){const n=document.createElement(tag);if(txt!==undefined)n.textContent=txt;if(cls)n.className=cls;return n}
function roleIs(...r){return !!profile&&r.includes(profile.role)}
function valText(v){if(v===null||v===undefined||v==="")return "—";if(typeof v==="object")return JSON.stringify(v);return String(v)}
function formatDate(v){try{return v?new Date(v).toLocaleDateString("ar-DZ"):"—"}catch{return valText(v)}}
function makeForm(key){
 const f=$("register-draft-form");f.replaceChildren();f.dataset.key=key;
 f.append(el("h3", "إنشاء مسودة — "+TITLES[key]));
 for(const [name,label,type,required,options] of FIELDS[key]){
  const wrap=el("label",label);let input;
  if(type==="textarea"){input=document.createElement("textarea");input.rows=3}
  else if(type==="select"){input=document.createElement("select");for(const o of options){const op=el("option",o);op.value=o;input.append(op)}}
  else {input=document.createElement("input");input.type=type==="number"?"number":type; if(type==="number")input.step="any"}
  input.name=name;input.required=!!required;input.maxLength=type==="textarea"?6000:500;wrap.append(input);f.append(wrap);
 }
 const row=el("div",undefined,"m-actions");const save=el("button","حفظ المسودة");save.type="submit";save.className="btn btn-dark";row.append(save);
 const cancel=el("button","إلغاء");cancel.type="button";cancel.onclick=()=>{editDraft=null;f.hidden=true;f.reset()};row.append(cancel);f.append(row);f.hidden=false;
}
function payloadFromForm(f){const p={};for(const [k,v] of new FormData(f)){p[k]=String(v).trim()}return p}
function renderPayload(payload){return Object.entries(payload||{}).map(([k,v])=>k+": "+valText(v)).join(" • ")}
function renderTable(key,entries,drafts){
 const host=$("register-"+key);if(!host)return;host.replaceChildren();
 const section=el("section",undefined,"m-card");section.append(el("h3",TITLES[key]));
 if(DRAFT_ROLE[key]===profile.role){const b=el("button","إنشاء مسودة جديدة","m-small");b.type="button";b.onclick=()=>{editDraft=null;makeForm(key);$("register-draft-form").scrollIntoView({behavior:"smooth",block:"start"})};section.append(b)}
 if(key==="tasks"&&roleIs("president")){const b=el("button","إضافة مهمة","m-small");b.type="button";b.onclick=()=>{editDraft=null;makeForm(key);$("register-draft-form").scrollIntoView({behavior:"smooth",block:"start"})};section.append(b)}
 if(key==="inspection"&&roleIs("inspection_inspector")){const b=el("button","إنشاء تقرير تفتيش","m-small");b.type="button";b.onclick=()=>{editDraft=null;makeForm(key);$("register-draft-form").scrollIntoView({behavior:"smooth",block:"start"})};section.append(b)}
 if(drafts.length){section.append(el("h4","المسودات قيد الإجراء"));const table=el("table");table.className="m-table";const thead=el("thead");const tr=el("tr");["تاريخ الإنشاء","المحتوى","الحالة","ملاحظة الرئيس","الإجراءات"].forEach(x=>tr.append(el("th",x)));thead.append(tr);table.append(thead);const tb=el("tbody");
  for(const d of drafts){const row=el("tr");row.append(el("td",formatDate(d.created_at)),el("td",renderPayload(d.payload)),el("td",d.status==="changes_requested"?"مطلوب تعديل":"مسودة"),el("td",d.review_note||"—"));const td=el("td");if(roleIs("president")){const note=document.createElement("textarea");note.placeholder="ملاحظة التعديل (إن لزم)";note.rows=2;td.append(note);const ask=el("button","طلب تعديل","m-small");ask.onclick=async()=>{if(note.value.trim().length<3){msg("اكتب ملاحظة واضحة بطلب التعديل.","error");return}await review(d,"changes_requested",note.value.trim())};const approve=el("button","اعتماد وإدراج","m-small");approve.onclick=async()=>{if(!confirm("اعتماد هذه المسودة وإدراجها نهائيًا في "+TITLES[key]+"؟"))return;await review(d,"approved","")};td.append(ask,approve)}else if(d.created_by===profileUserId()){const edit=el("button","تعديل المسودة","m-small");edit.onclick=()=>{editDraft=d;makeForm(key);const f=$("register-draft-form");for(const [k,v] of Object.entries(d.payload||{})){if(f.elements[k])f.elements[k].value=v??""}f.scrollIntoView({behavior:"smooth",block:"start"})};td.append(edit)}row.append(td);tb.append(row)}
  table.append(tb);section.append(table)
 }
 section.append(el("h4","السجل الرسمي"));
 let officialEntries=[...entries];
 if(key==="outgoing_mail"||key==="incoming_mail"){
  officialEntries.sort((a,b)=>String(b.payload?.mail_date||"").localeCompare(String(a.payload?.mail_date||"")));
  const filters=el("div",undefined,"m-actions");const from=el("input"),to=el("input"),apply=el("button","تصفية بالتاريخ"),clear=el("button","مسح التصفية");
  from.type="date";to.type="date";from.setAttribute("aria-label","من تاريخ");to.setAttribute("aria-label","إلى تاريخ");from.title="من تاريخ";to.title="إلى تاريخ";apply.type="button";clear.type="button";apply.className="m-small";clear.className="m-small";
  filters.append(el("label","من تاريخ"),from,el("label","إلى تاريخ"),to,apply,clear);section.append(filters);
  const table=el("table");table.className="m-table";const head=el("thead"),hr=el("tr");["الرقم الرسمي","تاريخ المراسلة","المحتوى","القيد"].forEach(x=>hr.append(el("th",x)));head.append(hr);table.append(head);const body=el("tbody");table.append(body);section.append(table);
  const draw=()=>{body.replaceChildren();const filtered=officialEntries.filter(e=>{const d=String(e.payload?.mail_date||"");return (!from.value||d>=from.value)&&(!to.value||d<=to.value)});if(!filtered.length){const row=el("tr");row.append(el("td","لا توجد مراسلات ضمن الفترة المحددة."));row.firstChild.colSpan=4;body.append(row);return}for(const e of filtered){const row=el("tr");row.append(el("td",e.register_year+"/"+e.register_number),el("td",formatDate(e.payload?.mail_date)),el("td",renderPayload(e.payload)),el("td",e.approved_by?"معتمد من الرئيس":"قيد مباشر وفق الصلاحية"));body.append(row)}};
  apply.onclick=draw;clear.onclick=()=>{from.value="";to.value="";draw()};draw();
 }else if(!officialEntries.length)section.append(el("p","لا توجد قيود رسمية مسجلة في هذا السجل حتى الآن.","m-note"));
 else {const table=el("table");table.className="m-table";const head=el("thead"),hr=el("tr");["الرقم الرسمي","التاريخ","المحتوى","القيد"].forEach(x=>hr.append(el("th",x)));head.append(hr);table.append(head);const body=el("tbody");for(const e of officialEntries){const row=el("tr");row.append(el("td",e.register_year+"/"+e.register_number),el("td",formatDate(e.approved_at)),el("td",renderPayload(e.payload)),el("td",e.approved_by?"معتمد من الرئيس":"قيد مباشر وفق الصلاحية"));body.append(row)}table.append(body);section.append(table)}
 host.append(section)
}
function profileUserId(){return profile?.user_id}
function notifyUI(items){const host=$("register-notifications");host.replaceChildren();if(!items.length){host.append(el("p","لا توجد إشعارات جديدة.","m-note"));return}for(const n of items){const card=el("div",undefined,"delib-notification");card.append(el("strong",n.title),el("p",n.body),el("small",formatDate(n.created_at)));const b=el("button","تمييز كمقروء","m-small");b.onclick=async()=>{await sb.from("association_register_notifications").update({read_at:new Date().toISOString()}).eq("id",n.id);await loadNotifications()};card.append(b);host.append(card)}}
async function loadNotifications(){const {data,error}=await sb.from("association_register_notifications").select("*").is("read_at",null).order("created_at",{ascending:false}).limit(30);if(error){$("register-notifications").textContent="تعذر تحميل الإشعارات: "+error.message;return}notifyUI(data||[])}
async function review(d,status,note){msg("جارٍ حفظ قرار المراجعة…");const update={status,review_note:note||null};const {error}=await sb.from("association_register_drafts").update(update).eq("id",d.id);if(error){msg("تعذر حفظ المراجعة: "+error.message,"error");return}msg(status==="approved"?"تم الاعتماد وإدراج القيد في السجل الرسمي.":"أُرسل طلب التعديل إلى صاحب المسودة.","success");await loadAll()}
async function loadAll(){
 msg("جارٍ تحميل السجلات الرسمية…");
 const keys=Object.keys(TITLES);
 for(const key of keys){if(!ROLES[key].includes(profile.role)){$("register-"+key).hidden=true;continue}const host=$("register-"+key);host.hidden=false;
  const {data:entries,error}=await sb.from("association_register_entries").select("*").eq("register_key",key).eq("is_test",false).order("register_year",{ascending:false}).order("register_number",{ascending:false}).limit(200);
  if(error){host.textContent="تعذر تحميل السجل: "+error.message;continue}
  let drafts=[];if(key in DRAFT_ROLE){const q=sb.from("association_register_drafts").select("*").eq("register_key",key).neq("status","approved").order("created_at",{ascending:false}).limit(100);const {data:d,error:de}=await q;if(!de)drafts=d||[]}
  renderTable(key,entries||[],drafts);
 }
 await loadNotifications();msg("تم تحديث السجلات التي يسمح بها حسابك.","success")
}
document.addEventListener("DOMContentLoaded",async()=>{
 const pane=$("pane-official-registers");if(!pane)return;
 try{
  if(!window.supabase)throw new Error("تعذر تحميل مكتبة الدخول.");
  sb=window.supabase.createClient(C.url,C.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storage:window.localStorage,storageKey:C.storageKey}});
  const {data:{user},error}=await sb.auth.getUser();if(error)throw error;if(!user)throw new Error("سجّل الدخول أولًا.");
  const {data:p,error:pe}=await sb.from("staff_profiles").select("user_id,username,role,is_active,is_frozen").eq("user_id",user.id).maybeSingle();if(pe)throw pe;if(!p||!p.is_active||p.is_frozen)throw new Error("الحساب غير نشط.");
  profile=p;
  const tab=$("tab-official-registers");tab.classList.toggle("m-hide",!Object.values(ROLES).some(r=>r.includes(profile.role)));
  document.querySelectorAll(".m-tabs button[data-pane]").forEach(b=>{if(["finance","activities","equipment","meetings"].includes(b.dataset.pane))b.classList.add("m-hide")});
  document.querySelectorAll(".m-dashboard-card").forEach(card=>{if(["finance","activities","equipment","meetings"].includes(card.dataset.pane))card.classList.add("m-hide")});
  if(tab.classList.contains("m-hide")){pane.hidden=true;return}
  tab.addEventListener("click",()=>loadAll().catch(e=>msg(e.message,"error")));
  $("register-refresh").addEventListener("click",()=>loadAll().catch(e=>msg(e.message,"error")));
  $("register-draft-form").addEventListener("submit",async e=>{
   e.preventDefault();const f=e.currentTarget,key=f.dataset.key,payload=payloadFromForm(f);msg("جارٍ حفظ المسودة…");
   if(key==="tasks"||key==="inspection"){
    const {error}=await sb.from("association_register_entries").insert({register_key:key,register_year:new Date().getFullYear(),register_number:1,payload,created_by:profile.user_id,is_test:false});
    if(error){msg("تعذر تدوين القيد: "+error.message,"error");return}
    msg("تم تدوين القيد في السجل الرسمي.","success");
   }else if(editDraft){
    const {error}=await sb.from("association_register_drafts").update({payload,status:"draft"}).eq("id",editDraft.id);
    if(error){msg("تعذر تحديث المسودة: "+error.message,"error");return}
    editDraft=null;msg("تم تحديث المسودة وإعادة إرسالها للمراجعة.","success");
   }else{
    const {error}=await sb.from("association_register_drafts").insert({register_key:key,payload,created_by:profile.user_id,status:"draft"});
    if(error){msg("تعذر إنشاء المسودة: "+error.message,"error");return}
    msg("تم حفظ المسودة وإرسال إشعار للمراجع.","success");
   }
   f.reset();f.hidden=true;await loadAll();
  });
  await loadAll();
 }catch(e){msg(e.message||"تعذر تهيئة السجلات.","error")}
});
})();