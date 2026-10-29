(()=>{"use strict";
const C=window.ElAfakSupabaseConfig||{url:"https://lfubzohsbwdoiagfkpkt.supabase.co",key:"sb_publishable_tCZjOnFHLIeQHF0mR9tVFA_9bu4lLrJ",storageKey:"sb-lfubzohsbwdoiagfkpkt-auth-token"};
const $=id=>document.getElementById(id);
const ENTRY=new URLSearchParams(window.location.search).get("entry");
const ledgerStyle=document.createElement("style");
ledgerStyle.textContent=".official-ledger-page{position:relative;max-width:920px;margin:1.4rem auto;padding:2rem clamp(1rem,4vw,3.2rem);background:#fffdf6;border:1px solid #c9c0a8;border-right:8px solid #6c806d;box-shadow:0 5px 18px #182e2510;color:#202a24;line-height:2;font-family:'Traditional Arabic','Amiri','Noto Naskh Arabic',serif;font-size:1.08rem;break-inside:avoid}.ledger-bookhead{text-align:center;border-bottom:3px double #8a927d;padding-bottom:1rem;margin-bottom:1rem;font-weight:700}.ledger-bookhead h3{font-size:1.45rem;margin:.6rem 0;color:#183c31}.ledger-meta{display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;padding:.55rem 0;border-bottom:1px solid #c9c0a8;font-size:.98rem}.ledger-minutes{padding:.7rem 0;overflow-wrap:anywhere}.ledger-minutes p{margin:.15rem 0;min-height:.8em;white-space:pre-wrap}.ledger-field{padding:.55rem 0;border-bottom:1px dotted #c9c0a8}.ledger-field strong{display:block;color:#234c3d}.ledger-field p{white-space:pre-wrap;margin:.2rem 0}.ledger-signatures{display:flex;justify-content:space-between;gap:2rem;margin-top:2rem;padding-top:1rem;border-top:1px solid #b9b29f;font-weight:700}@media(max-width:620px){.official-ledger-page{padding:1rem .8rem;border-right-width:5px;font-size:1rem}.ledger-meta{display:grid}.ledger-signatures{gap:.8rem;font-size:.9rem}}.official-ledger-page{border:1px solid #87917e;border-right:8px solid #6c806d;background:repeating-linear-gradient(to bottom,#fffdf6 0,#fffdf6 31px,#dce3d9 32px);padding:18mm 18mm 22mm 18mm}.ledger-bookhead{background:#fffdf6f2}.ledger-meta{background:#fffdf6f2}.ledger-minutes{background:transparent}.ledger-signatures{background:#fffdf6f2}.ledger-book-reader{max-width:980px;margin:1rem auto}.ledger-book-controls{display:flex;align-items:center;justify-content:center;gap:1rem;margin:.7rem auto;flex-wrap:wrap}.ledger-page-counter{font-weight:700;color:#345b4b;min-width:100px;text-align:center}.ledger-book-controls button:disabled{opacity:.4;cursor:not-allowed}.ledger-book-stage{padding:.2rem 0 1rem}.ledger-page-footer{margin-top:2rem;padding-top:.65rem;border-top:1px solid #c9c0a8;text-align:center;color:#53685a;font-size:.86rem;font-weight:700}.official-ledger-page{min-height:680px;display:flex;flex-direction:column}.ledger-minutes{flex:1}.ledger-page-footer{margin-top:auto;padding-top:1rem}@media(max-width:620px){.official-ledger-page{min-height:600px}.ledger-book-controls{gap:.5rem}}";
document.head.append(ledgerStyle);
const TITLES={deliberation:"سجل المداولة",accounting:"سجل المحاسبة",equipment:"سجل العتاد",outgoing_mail:"سجل المراسلات الصادرة",incoming_mail:"سجل المراسلات الواردة",activities:"سجل الأنشطة",tasks:"سجل المهام",inspection:"سجل التفتيش والمراقبة"};
const ROLES={
 deliberation:["president","deputy_president","secretary_general","deputy_secretary_general","inspection_inspector"],
 accounting:["president","treasurer","deputy_treasurer","technical_director","inspection_inspector"],
 equipment:["president","treasurer","deputy_treasurer","technical_director","inspection_inspector"],
 outgoing_mail:["president","deputy_president","secretary_general","deputy_secretary_general","inspection_inspector"],
 incoming_mail:["president","deputy_president","secretary_general","deputy_secretary_general","inspection_inspector"],
 activities:["president","deputy_president","secretary_general","deputy_secretary_general","treasurer","deputy_treasurer","technical_director","inspection_inspector"],
 tasks:["president","inspection_inspector"],
 inspection:["president","deputy_president","secretary_general","deputy_secretary_general","treasurer","deputy_treasurer","technical_director","inspection_inspector"]
};
const DRAFT_ROLE={deliberation:"secretary_general",accounting:"treasurer",equipment:"treasurer",outgoing_mail:"secretary_general",incoming_mail:"secretary_general",activities:"technical_director"};
const FIELDS={
 deliberation:[["title","عنوان المداولة","text",true],["record_date","تاريخ المداولة","date",true],["meeting_type","نوع الاجتماع","select",true,["المكتب التنفيذي","الجمعية العامة","اجتماع استثنائي","اجتماع تقني","اجتماع لجنة","اجتماع تنسيقي","أخرى"]],["meeting_start_time","ساعة البداية","time",true],["meeting_end_time","ساعة الرفع/الاختتام","time",true],["meeting_chair","رئيس الاجتماع وصفته","text",true],["attendees","الحاضرون وصفاتهم","textarea",true],["agenda","جدول الأعمال","textarea",true],["discussion","المناقشات","textarea",false],["decisions","القرارات","textarea",true],["attachments","المرفقات والمراجع","textarea",false]],
 accounting:[["transaction_date","تاريخ العملية","date",true],["transaction_type","نوع العملية (إيراد/مصروف)","select",true,["إيراد","مصروف"]],["category","التصنيف","text",true],["amount","المبلغ بالدينار الجزائري","number",true],["payment_method","طريقة الدفع","text",false],["reference","مرجع الوثيقة","text",false],["description","بيان العملية","textarea",true]],
 equipment:[["item_name","اسم العتاد","text",true],["category","الصنف","text",false],["quantity","الكمية","number",true],["condition","الحالة","text",true],["serial_number","الرقم التسلسلي","text",false],["acquisition_date","تاريخ الاقتناء","date",false],["storage_location","مكان التخزين","text",false],["notes","ملاحظات","textarea",false]],
 outgoing_mail:[["mail_date","تاريخ الإرسال","date",true],["recipient","الجهة المرسل إليها","text",true],["subject","موضوع المراسلة","text",true],["reference","رقم/مرجع المراسلة","text",false],["summary","ملخص المحتوى","textarea",true],["attachments","المرفقات","textarea",false]],
 incoming_mail:[["mail_date","تاريخ الاستلام","date",true],["sender","الجهة المرسلة","text",true],["subject","موضوع المراسلة","text",true],["reference","رقم/مرجع المراسلة","text",false],["summary","ملخص المحتوى","textarea",true],["follow_up","إجراء المتابعة","textarea",false]],
 activities:[["title","اسم النشاط","text",true],["activity_date","تاريخ النشاط","date",true],["location","المكان","text",false],["activity_type","نوع النشاط","text",true],["leader","مسؤول النشاط","text",false],["planned_budget","الميزانية المخططة (دج)","number",false],["actual_budget","التكلفة الفعلية (دج)","number",false],["notes","التفاصيل والملاحظات","textarea",true]],
 tasks:[["title","عنوان المهمة","text",true],["assigned_to","المكلّف بالمهمة","text",true],["priority","الأولوية","select",true,["منخفضة","عادية","عالية","عاجلة"]],["due_date","الأجل","date",false],["description","تفاصيل التكليف","textarea",true],["status","حالة التنفيذ","select",true,["جديدة","قيد التنفيذ","منجزة","مؤجلة"]]],
 inspection:[["report_date","تاريخ التفتيش/المراقبة","date",true],["inspector_name","اسم المفتش","text",true],["scope","موضوع التفتيش","text",true],["observations","الملاحظات والمعاينات","textarea",true],["recommendations","التوصيات","textarea",false],["follow_up","المتابعة المطلوبة","textarea",false]]
};
let sb,profile,editDraft=null,activeRegisterKey=null,registerView="home";
const cachedEntries={},cachedDrafts={};
function canCreate(key){return DRAFT_ROLE[key]===profile?.role||(key==="tasks"&&roleIs("president"))||(key==="inspection"&&roleIs("inspection_inspector"))}
function canReview(key){return roleIs("president")&&key in DRAFT_ROLE}
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
 if(key==="deliberation"){
  const titleInput=f.elements.title;
  const titleList=el("datalist");titleList.id="deliberation-title-suggestions";
  ["محضر اجتماع المكتب التنفيذي","محضر اجتماع الجمعية العامة العادية","محضر اجتماع الجمعية العامة الاستثنائية","محضر اجتماع تقني","محضر اجتماع لجنة","محضر اجتماع تنسيقي","محضر اجتماع طارئ"].forEach(v=>{const o=el("option");o.value=v;titleList.append(o)});
  titleInput.setAttribute("list",titleList.id);f.append(titleList);
  const scanBox=el("section",undefined,"m-card m-no-print");scanBox.append(el("h4","إضافة الحاضرين بمسح QR بطاقة العضو"),el("p","وجّه الكاميرا إلى رمز QR على بطاقة العضو. سيُضاف الاسم إلى قائمة الحضور بعد التحقق من سجل العضوية."));
  const camera=el("button","تشغيل ماسح QR","m-small");camera.type="button";
  const stop=el("button","إيقاف الكاميرا","m-small");stop.type="button";stop.disabled=true;
  const video=document.createElement("video");video.setAttribute("playsinline","");video.autoplay=true;video.hidden=true;video.style.maxWidth="100%";video.style.width="420px";video.style.display="block";
  const scanStatus=el("p","لم يبدأ المسح بعد.","m-note");scanStatus.setAttribute("role","status");
  scanBox.append(camera,stop,video,scanStatus);f.append(scanBox);
  let stream=null,scanTimer=null,detector=null,scanBusy=false;
  const stopScanner=()=>{if(scanTimer){clearInterval(scanTimer);scanTimer=null}if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}video.srcObject=null;video.hidden=true;stop.disabled=true;camera.disabled=false};
  stop.onclick=stopScanner;
  camera.onclick=async()=>{
   if(!("BarcodeDetector" in window)){scanStatus.textContent="هذا المتصفح لا يدعم قراءة QR مباشرة. جرّب Chrome أو أدخل الحضور يدويًا.";return}
   try{
    detector=new BarcodeDetector({formats:["qr_code"]});
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}},audio:false});
    video.srcObject=stream;video.hidden=false;await video.play();camera.disabled=true;stop.disabled=false;scanStatus.textContent="وجّه رمز QR إلى الكاميرا.";
    scanTimer=setInterval(async()=>{
     if(scanBusy||video.readyState<2)return;scanBusy=true;
     try{const codes=await detector.detect(video);if(!codes.length)return;
      const raw=(codes[0].rawValue||"").trim();let qr={};try{qr=JSON.parse(raw)}catch{}
      const memberId=String(qr.association_member_id||qr.member_id||qr.id||(/^([0-9a-f]{8}-[0-9a-f-]{27,})$/i.test(raw)?raw:"")).trim();
      const memberNo=String(qr.member_no||qr.member_number||(/^AF-[A-Z0-9-]+$/i.test(raw)?raw:"")).trim();
      const founderNo=Number(qr.founder_number||qr.founder_no||0);
      let member=null;
      if(memberId){const q=await sb.from("association_members").select("id,founder_number,full_name,membership_status").eq("id",memberId).maybeSingle();if(!q.error)member=q.data}
      if(!member&&memberNo){const q=await sb.from("members").select("id,member_no,join_request_id,membership_status").eq("member_no",memberNo).eq("is_test",false).maybeSingle();if(!q.error&&q.data){const d=await sb.from("join_requests").select("full_name").eq("id",q.data.join_request_id).maybeSingle();if(!d.error&&d.data)member={id:q.data.id,full_name:d.data.full_name,membership_status:q.data.membership_status}}}
      if(!member&&founderNo){const q=await sb.from("association_members").select("id,founder_number,full_name,membership_status").eq("founder_number",founderNo).maybeSingle();if(!q.error)member=q.data}
      const qrName=String(qr.full_name||(!Object.keys(qr).length?raw:"")).trim();
      if(!member&&qrName){const q=await sb.from("association_members").select("id,founder_number,full_name,membership_status").eq("full_name",qrName).maybeSingle();if(!q.error)member=q.data}
      if(!member){scanStatus.textContent="لم يُعثر على العضو في السجل. تأكد أن QR يحتوي رقم العضوية أو معرّف العضو المسجل.";return}
      if(member.membership_status&&member.membership_status!=="active"){scanStatus.textContent="العضوية ليست نشطة؛ لم يُضف الاسم. راجع حالة العضو.";return}
      const area=f.elements.attendees;const name=String(member.full_name||"").trim();if(!name){scanStatus.textContent="لم يتوفر اسم العضو في السجل.";return}
      const current=area.value.split("\n").map(x=>x.trim()).filter(Boolean);if(current.some(x=>x.includes(name))){scanStatus.textContent="العضو موجود مسبقًا في قائمة الحضور: "+name;return}
      current.push(String(current.length+1).padStart(2,"0")+" — "+name+" — عضو");area.value=current.join("\n");area.dispatchEvent(new Event("input",{bubbles:true}));scanStatus.textContent="تمت إضافة الحاضر: "+name;stopScanner();
     }catch(err){scanStatus.textContent="تعذر قراءة/التحقق من الرمز: "+(err.message||"خطأ غير معروف")}finally{scanBusy=false}
    },700);
   }catch(err){scanStatus.textContent="تعذر تشغيل الكاميرا. تحقق من إذن الكاميرا واستخدم الموقع عبر HTTPS."}
  };
  f.addEventListener("reset",stopScanner);
  const edit=el("button","تكوين نص المحضر تلقائيًا","m-small");edit.type="button";edit.onclick=()=>buildDeliberationMinutes(f);f.append(edit);
 }
 const row=el("div",undefined,"m-actions");const save=el("button","حفظ المسودة");save.type="submit";save.className="btn btn-dark";row.append(save);
 const cancel=el("button","إلغاء");cancel.type="button";cancel.onclick=()=>{editDraft=null;f.hidden=true;f.reset()};row.append(cancel);f.append(row);f.hidden=false;
}
function payloadFromForm(f){const p={};for(const [k,v] of new FormData(f)){p[k]=String(v).trim()}return p}
function buildDeliberationMinutes(f){
 const v=Object.fromEntries(new FormData(f).entries());
 const lines=[
 "الجمهورية الجزائرية الديمقراطية الشعبية",
 "جمعية الأفق الولائية للرياضات الجوية والجبلية — ولاية الشلف",
 "سجل المداولة",
 "",
 "عنوان المداولة: "+(v.title||"................................"),
 "تاريخ الاجتماع/المداولة: "+(v.record_date||"...................."),
 "نوع الاجتماع: "+(v.meeting_type||"...................."),
 "ساعة البداية: "+(v.meeting_start_time||"...................."),
 "ساعة الرفع/الاختتام: "+(v.meeting_end_time||"...................."),
 "رئيس الاجتماع وصفته: "+(v.meeting_chair||"...................."),
 "",
 "الحاضرون وصفاتهم:",
 v.attendees||"................................................................",
 "",
 "جدول الأعمال:",
 v.agenda||"................................................................",
 "",
 "مجريات الاجتماع والمناقشات:",
 v.discussion||"................................................................",
 "",
 "القرارات المتخذة:",
 v.decisions||"................................................................",
 "",
 "المرفقات والمراجع:",
 v.attachments||"لا يوجد",
 "",
 "حرر هذا المحضر لإثبات ما جرى وما اتُّخذ من قرارات، ويعرض على رئيس الجمعية للمراجعة والاعتماد.",
 "",
 "الأمين العام: ................................      رئيس الاجتماع: "+(v.meeting_chair||"................................")+"      رئيس الجمعية: ................................"
 ];
 let area=f.elements.minutes_text;
 if(!area){const wrap=el("label","نص المحضر المحرر (راجع النص قبل حفظ المسودة)");area=document.createElement("textarea");area.name="minutes_text";area.rows=16;area.maxLength=16000;area.required=true;wrap.append(area);const anchor=f.querySelector(".m-actions");f.insertBefore(wrap,anchor)}
 area.value=lines.join("\n");
 area.scrollIntoView({behavior:"smooth",block:"center"});
 msg("تم تكوين نص المحضر من الخانات. راجعه وعدّله ثم احفظ المسودة.","success");
}
function renderPayload(payload){return Object.entries(payload||{}).filter(([k])=>k!=="minutes_text").map(([k,v])=>k+": "+valText(v)).join(" • ")}
function renderDeliberationPage(entry){
 const page=el("article",undefined,"official-ledger-page");
 const top=el("div",undefined,"ledger-bookhead");
 top.append(el("div","الجمهورية الجزائرية الديمقراطية الشعبية"),el("div","جمعية الأفق الولائية للرياضات الجوية والجبلية — ولاية الشلف"),el("h3","سجل المداولة"));
 page.append(top);
 const meta=el("div",undefined,"ledger-meta");
 meta.append(el("span","رقم القيد: "+entry.register_year+"/"+String(entry.register_number).padStart(3,"0")),el("span","تاريخ الاعتماد: "+formatDate(entry.approved_at)),el("span","رئيس الاجتماع: "+valText(entry.payload?.meeting_chair)));
 page.append(meta);
 const body=el("div",undefined,"ledger-minutes");
 const text=entry.payload?.minutes_text;
 if(text){text.split("\n").forEach(line=>body.append(el("p",line||" ")))}
 else{
  const fields=[["عنوان المداولة",entry.payload?.title],["التاريخ",entry.payload?.record_date],["نوع الاجتماع",entry.payload?.meeting_type],["ساعة البداية",entry.payload?.meeting_start_time],["ساعة الرفع/الاختتام",entry.payload?.meeting_end_time],["رئيس الاجتماع وصفته",entry.payload?.meeting_chair],["الحاضرون وصفاتهم",entry.payload?.attendees],["جدول الأعمال",entry.payload?.agenda],["المناقشات",entry.payload?.discussion],["القرارات",entry.payload?.decisions],["المرفقات والمراجع",entry.payload?.attachments]];
  for(const [label,value] of fields){const block=el("div",undefined,"ledger-field");block.append(el("strong",label));block.append(el("p",valText(value)));body.append(block)}
 }
 page.append(body);
 const sign=el("div",undefined,"ledger-signatures");sign.append(el("span","الأمين العام"),el("span","رئيس الجمعية"));page.append(sign);
 return page;
}
async function renderTable(key,entries,drafts){
 const host=$("register-"+key);if(!host)return;host.replaceChildren();
 const nav=el("div",undefined,"m-toolbar register-page-nav m-no-print");
 const back=el("button","العودة إلى قائمة السجلات","m-small");back.type="button";back.onclick=()=>{activeRegisterKey=null;registerView="home";host.hidden=true;$("register-choice-grid").hidden=false;$("register-selection-hint").textContent="اختر السجل المناسب لحسابك.";renderRegisterChoices()};nav.append(back,el("span",TITLES[key],"m-dashboard-title"));host.append(nav);
 if(registerView==="home"){
  const intro=el("section",undefined,"m-card register-action-page");intro.append(el("h3",TITLES[key]),el("p",canReview(key)?"توجد هنا مسودات تحتاج إلى مراجعة الرئيس واعتمادها أو إعادتها للتعديل.":canCreate(key)?"اختر العملية التي تريد تنفيذها في هذا السجل.":"يمكنك تصفح القيود الرسمية المعتمدة في هذا السجل."));
  const actions=el("div",undefined,"m-dashboard-grid");
  if(canCreate(key)){const browse=el("button",undefined,"m-dashboard-card");browse.type="button";browse.append(el("span","▤","m-dashboard-icon"),el("span","تصفح السجل","m-dashboard-title"),el("span","عرض القيود الرسمية المعتمدة","m-dashboard-description"));browse.onclick=()=>{registerView="browse";renderTable(key,entries,[])};actions.append(browse);
   const create=el("button",undefined,"m-dashboard-card");create.type="button";create.append(el("span","＋","m-dashboard-icon"),el("span",key==="inspection"?"إنشاء تقرير تفتيش":key==="tasks"?"إضافة مهمة":"إنشاء مسودة","m-dashboard-title"),el("span",key==="inspection"?"إعداد تقرير جديد للتفتيش والمراقبة":key==="tasks"?"تسجيل مهمة أو تكليف رئاسي جديد":"تحرير البيانات ثم حفظها كمسودة للمراجعة","m-dashboard-description"));create.onclick=()=>{registerView="create";host.replaceChildren(nav);const title=el("h3","إنشاء — "+TITLES[key]);host.append(title);makeForm(key);host.append($("register-draft-form"));};actions.append(create);
  }else if(canReview(key)){const reviewBtn=el("button",undefined,"m-dashboard-card");reviewBtn.type="button";reviewBtn.append(el("span","✓","m-dashboard-icon"),el("span","مراجعة المسودات","m-dashboard-title"),el("span","مراجعة المسودات الواردة واتخاذ قرار الاعتماد أو طلب التعديل","m-dashboard-description"));reviewBtn.onclick=()=>{registerView="review";renderTable(key,entries,drafts)};actions.append(reviewBtn);
   const browse=el("button",undefined,"m-dashboard-card");browse.type="button";browse.append(el("span","▤","m-dashboard-icon"),el("span","تصفح السجل","m-dashboard-title"),el("span","الاطلاع على القيود المعتمدة","m-dashboard-description"));browse.onclick=()=>{registerView="browse";renderTable(key,entries,[])};actions.append(browse);
  }
  intro.append(actions);host.append(intro);return;
 }
 if(registerView==="create"){
  const title=el("h3","إنشاء — "+TITLES[key]);host.append(title);makeForm(key);host.append($("register-draft-form"));return;
 }
 const section=el("section",undefined,"m-card");section.append(el("h3",registerView==="review"?"مراجعة المسودات — "+TITLES[key]:TITLES[key]));
 if(registerView!=="browse"&&registerView!=="review"&&DRAFT_ROLE[key]===profile.role){const b=el("button","إنشاء مسودة جديدة","m-small");b.type="button";b.onclick=()=>{editDraft=null;makeForm(key);$("register-draft-form").scrollIntoView({behavior:"smooth",block:"start"})};section.append(b)}
 if(registerView!=="browse"&&key==="tasks"&&roleIs("president")){const b=el("button","إضافة مهمة","m-small");b.type="button";b.onclick=()=>{editDraft=null;makeForm(key);$("register-draft-form").scrollIntoView({behavior:"smooth",block:"start"})};section.append(b)}
 if(registerView!=="browse"&&key==="inspection"&&roleIs("inspection_inspector")){const b=el("button","إنشاء تقرير تفتيش","m-small");b.type="button";b.onclick=()=>{editDraft=null;makeForm(key);$("register-draft-form").scrollIntoView({behavior:"smooth",block:"start"})};section.append(b)}
 if(registerView!=="browse"&&drafts.length){section.append(el("h4","المسودات قيد الإجراء"));const table=el("table");table.className="m-table";const thead=el("thead");const tr=el("tr");["تاريخ الإنشاء","المحتوى","الحالة","ملاحظة الرئيس","الإجراءات"].forEach(x=>tr.append(el("th",x)));thead.append(tr);table.append(thead);const tb=el("tbody");
  for(const d of drafts){const row=el("tr");row.append(el("td",formatDate(d.created_at)),el("td",renderPayload(d.payload)),el("td",d.status==="changes_requested"?"مطلوب تعديل":"مسودة"),el("td",d.review_note||"—"));const td=el("td");if(roleIs("president")){const note=document.createElement("textarea");note.placeholder="ملاحظة التعديل (إن لزم)";note.rows=2;td.append(note);const ask=el("button","طلب تعديل","m-small");ask.onclick=async()=>{if(note.value.trim().length<3){msg("اكتب ملاحظة واضحة بطلب التعديل.","error");return}await review(d,"changes_requested",note.value.trim())};const approve=el("button","اعتماد وإدراج","m-small");approve.onclick=async()=>{if(!confirm("اعتماد هذه المسودة وإدراجها نهائيًا في "+TITLES[key]+"؟"))return;await review(d,"approved","")};td.append(ask,approve)}else if(d.created_by===profileUserId()){const edit=el("button","تعديل المسودة","m-small");edit.onclick=()=>{editDraft=d;makeForm(key);const f=$("register-draft-form");if(key==="deliberation"&&d.payload?.minutes_text&&!f.elements.minutes_text){const wrap=el("label","نص المحضر المحرر (قابل للمراجعة)");const area=document.createElement("textarea");area.name="minutes_text";area.rows=16;area.maxLength=16000;area.required=true;wrap.append(area);f.insertBefore(wrap,f.querySelector(".m-actions"))}for(const [k,v] of Object.entries(d.payload||{})){if(f.elements[k])f.elements[k].value=v??""}f.scrollIntoView({behavior:"smooth",block:"start"})};td.append(edit)}row.append(td);tb.append(row)}
  table.append(tb);section.append(table)
 }
 if(registerView!=="review")section.append(el("h4","صفحات السجل الرسمي"));
 let officialEntries=registerView==="review"?[]:[...entries];
 const renderBookInto=(target,items,bookKey=key)=>{
  const book=el("div",undefined,"ledger-book-reader");
  if(!items.length){book.append(el("p","لا توجد قيود رسمية مسجلة في هذا السجل حتى الآن.","m-note"));target.append(book);return}
  let pageIndex=0;
  const stage=el("div",undefined,"ledger-book-stage");
  const controls=el("div",undefined,"ledger-book-controls m-no-print");
  const prev=el("button","← الصفحة السابقة","m-small"),next=el("button","الصفحة التالية →","m-small"),counter=el("span",undefined,"ledger-page-counter");
  prev.type=next.type="button";
  const draw=()=>{
   stage.replaceChildren();
   const entry=items[pageIndex];
   let page;
   if(bookKey==="deliberation")page=renderDeliberationPage(entry);
   else{
    page=el("article",undefined,"official-ledger-page");
    const head=el("div",undefined,"ledger-bookhead");
    head.append(el("div","الجمهورية الجزائرية الديمقراطية الشعبية"),el("div","جمعية الأفق الولائية للرياضات الجوية والجبلية — ولاية الشلف"),el("h3",TITLES[bookKey]));
    page.append(head);
    const meta=el("div",undefined,"ledger-meta");
    meta.append(el("span","رقم القيد: "+entry.register_year+"/"+String(entry.register_number).padStart(3,"0")),el("span","تاريخ القيد: "+formatDate(entry.approved_at)),el("span",entry.approved_by?"معتمد من الرئيس":"قيد مسجل وفق الصلاحية"));
    page.append(meta);
    const body=el("div",undefined,"ledger-minutes");
    for(const field of (FIELDS[bookKey]||[])){const value=entry.payload?.[field[0]];if(value===undefined||value===null||value==="")continue;const block=el("div",undefined,"ledger-field");block.append(el("strong",field[1]));block.append(el("p",valText(value)));body.append(block)}
    if(!body.childElementCount)body.append(el("p","لا توجد تفاصيل إضافية لهذا القيد."));
    page.append(body);
    const sign=el("div",undefined,"ledger-signatures");sign.append(el("span","المسؤول عن السجل"),el("span","رئيس الجمعية"));page.append(sign);
   }
   page.append(el("div","صفحة "+(pageIndex+1)+" من "+items.length+" — رقم القيد "+entry.register_year+"/"+String(entry.register_number).padStart(3,"0"),"ledger-page-footer"));
   stage.append(page);
   prev.disabled=pageIndex===0;next.disabled=pageIndex===items.length-1;counter.textContent="صفحة "+(pageIndex+1)+" من "+items.length;
  };
  prev.onclick=()=>{if(pageIndex>0){pageIndex--;draw()}};
  next.onclick=()=>{if(pageIndex<items.length-1){pageIndex++;draw()}};
  controls.append(prev,counter,next);book.append(controls,stage);target.append(book);draw();
 };
 if(key==="outgoing_mail"||key==="incoming_mail"){
  officialEntries.sort((a,b)=>String(b.payload?.mail_date||"").localeCompare(String(a.payload?.mail_date||"")));
  const filters=el("div",undefined,"m-actions m-no-print");const from=el("input"),to=el("input"),apply=el("button","تصفية بالتاريخ"),clear=el("button","مسح التصفية");
  from.type="date";to.type="date";from.setAttribute("aria-label","من تاريخ");to.setAttribute("aria-label","إلى تاريخ");from.title="من تاريخ";to.title="إلى تاريخ";apply.type="button";clear.type="button";apply.className="m-small";clear.className="m-small";
  filters.append(el("label","من تاريخ"),from,el("label","إلى تاريخ"),to,apply,clear);section.append(filters);
  const bookHost=el("div");section.append(bookHost);
  const draw=()=>{bookHost.replaceChildren();const filtered=officialEntries.filter(e=>{const d=String(e.payload?.mail_date||"");return (!from.value||d>=from.value)&&(!to.value||d<=to.value)});renderBookInto(bookHost,filtered,key)};
  apply.onclick=draw;clear.onclick=()=>{from.value="";to.value="";draw()};draw();
 }else renderBookInto(section,officialEntries,key);
 host.append(section)
}

function showRegister(key){
 if(!key||!ROLES[key]?.includes(profile?.role))return;
 activeRegisterKey=key;
 registerView="browse";
 $("register-choice-grid").hidden=true;
 $("register-selection-hint").textContent="أنت الآن داخل "+TITLES[key]+" — وضع القراءة فقط.";
 for(const k of Object.keys(TITLES)){const host=$("register-"+k);if(host)host.hidden=k!==key}
 const form=$("register-draft-form");
 if(form.dataset.key&&form.dataset.key!==key){form.hidden=true;form.reset();editDraft=null}
 const host=$("register-"+key);if(host)host.hidden=false;
}
function renderRegisterChoices(){
 const grid=$("register-choice-grid");grid.replaceChildren();
 for(const key of Object.keys(TITLES)){
  if(!ROLES[key].includes(profile.role))continue;
  const b=el("button",undefined,"m-dashboard-card");b.type="button";b.dataset.registerKey=key;
  b.append(el("span","▤","m-dashboard-icon"),el("span",TITLES[key],"m-dashboard-title"));
  const descriptions={deliberation:"المداولات والقرارات المعتمدة",accounting:"الإيرادات والمصروفات والقيود المالية",equipment:"جرد العتاد وحالته",outgoing_mail:"المراسلات الصادرة مرتبة بالتاريخ",incoming_mail:"المراسلات الواردة مرتبة بالتاريخ",activities:"الأنشطة والبرامج المنجزة والمبرمجة",tasks:"المهام والتكليفات الرئاسية",inspection:"تقارير التفتيش والمراقبة"};
  b.append(el("span",descriptions[key],"m-dashboard-description"));
  b.setAttribute("aria-pressed","false");b.onclick=()=>openStandaloneRegister(key);grid.append(b);
 }
}
function openStandaloneRegister(key,draftId){if(!key||!ROLES[key]?.includes(profile?.role)){msg("لا يملك هذا الحساب صلاحية الوصول إلى السجل المطلوب.","error");return}const params=new URLSearchParams({entry:ENTRY||"executive",register:key});if(draftId)params.set("draft",draftId);const url="/official-register.html?"+params.toString();try{window.parent.location.href=url}catch(_){window.location.href=url}}
function profileUserId(){return profile?.user_id}
function renderTopActions(){
 const host=$("register-top-actions");if(!host)return;host.replaceChildren();
 const labels={deliberation:"إنشاء مسودة المداولة",accounting:"إنشاء مسودة المحاسبة",equipment:"إنشاء مسودة العتاد",outgoing_mail:"مسودة مراسلة صادرة",incoming_mail:"مسودة مراسلة واردة",activities:"إنشاء مسودة نشاط",tasks:"إنشاء مهمة/تكليف",inspection:"إنشاء تقرير تفتيش"};
 for(const key of Object.keys(TITLES)){
  if(!canCreate(key))continue;
  const b=el("button",labels[key]||("إنشاء مسودة — "+TITLES[key]),"m-small");b.type="button";
  b.onclick=()=>{
   openStandaloneRegister(key);return;
   activeRegisterKey=key;registerView="create";
   $("register-choice-grid").hidden=true;
   $("register-selection-hint").textContent="إنشاء — "+TITLES[key];
   for(const k of Object.keys(TITLES)){const h=$("register-"+k);if(h)h.hidden=k!==key}
   const form=$("register-draft-form");if(form.dataset.key&&form.dataset.key!==key){form.reset();editDraft=null}
   const host=$("register-"+key);host.hidden=false;renderTable(key,cachedEntries[key]||[],cachedDrafts[key]||[]);
  };
  host.append(b);
 }
 if(!host.children.length)host.append(el("p","لا توجد خيارات إنشاء مسودة مفعّلة لهذا الحساب.","m-note"));
}
function openDraftForEdit(d){
 const key=d.register_key;
 if(!ROLES[key]?.includes(profile.role)||d.created_by!==profileUserId()||d.status!=="changes_requested"){
  msg("يمكن تعديل المسودة فقط من حساب منشئها وبعد طلب التعديل من الرئيس.","error");return;
 }
 const tab=$("tab-official-registers");if(tab?.classList.contains("m-hide")){msg("لا يملك هذا الحساب صلاحية الوصول إلى السجل المطلوب.","error");return}
 document.querySelectorAll(".m-tabs button").forEach(b=>b.classList.toggle("active",b.id==="tab-official-registers"));
 document.querySelectorAll(".m-pane").forEach(p=>p.hidden=p.id!=="pane-official-registers");
 activeRegisterKey=key;registerView="create";
 $("register-choice-grid").hidden=true;
 $("register-selection-hint").textContent="تعديل المسودة بناءً على ملاحظة الرئيس — "+TITLES[key];
 for(const k of Object.keys(TITLES)){const h=$("register-"+k);if(h)h.hidden=k!==key}
 editDraft=d;
 const host=$("register-"+key);host.hidden=false;host.replaceChildren();
 const nav=el("div",undefined,"m-toolbar register-page-nav m-no-print");
 const back=el("button","العودة إلى قائمة السجلات","m-small");back.type="button";back.onclick=()=>{activeRegisterKey=null;registerView="home";host.hidden=true;$("register-choice-grid").hidden=false;renderRegisterChoices()};
 nav.append(back,el("span",TITLES[key],"m-dashboard-title"));host.append(nav);
 host.append(el("h3","تعديل المسودة — "+TITLES[key]));
 const note=el("p","ملاحظة الرئيس: "+(d.review_note||"يرجى مراجعة المسودة وتعديلها."),"m-note");note.style.whiteSpace="pre-wrap";host.append(note);
 makeForm(key);const form=$("register-draft-form");
 if(key==="deliberation"&&d.payload?.minutes_text&&!form.elements.minutes_text){
  const wrap=el("label","نص المحضر المحرر (قابل للمراجعة)");const area=document.createElement("textarea");area.name="minutes_text";area.rows=16;area.maxLength=16000;area.required=true;wrap.append(area);form.insertBefore(wrap,form.querySelector(".m-actions"));
 }
 for(const [k,v] of Object.entries(d.payload||{})){if(form.elements[k])form.elements[k].value=v??""}
 host.append(form);form.hidden=false;form.scrollIntoView({behavior:"smooth",block:"start"});
}
function notifyUI(items){
 const host=$("register-notifications");host.replaceChildren();
 if(!items.length)host.append(el("p","لا توجد إشعارات غير محسومة.","m-note"));
 for(const n of items){
  const card=el("div",undefined,"delib-notification");
  card.append(el("strong",n.title),el("p",n.body),el("small",formatDate(n.created_at)));
  if(roleIs("president")&&n.draft_id){
   const b=el("button","فتح للمراجعة","m-small");b.type="button";
   b.onclick=async()=>{
    const {data:d,error}=await sb.from("association_register_drafts").select("*").eq("id",n.draft_id).maybeSingle();
    if(error||!d){msg("تعذر فتح المسودة المرتبطة بهذا الإشعار.","error");return}
    const key=d.register_key;if(!ROLES[key]?.includes(profile.role)){msg("لا يملك هذا الحساب صلاحية مراجعة هذا السجل.","error");return}
    if(d.status==="approved"){await loadNotifications();msg("هذه المسودة معتمدة نهائيًا بالفعل.","success");return}
    openStandaloneRegister(key,d.id);
   };
   card.append(b);
  }
  host.append(card);
 }
}
async function loadNotifications(){
 const host=$("register-notifications");
 const {data,error}=await sb.from("association_register_notifications").select("*").is("read_at",null).order("created_at",{ascending:false}).limit(100);
 if(error){host.textContent="تعذر تحميل الإشعارات: "+error.message;return}
 const items=data||[],ids=[...new Set(items.map(n=>n.draft_id).filter(Boolean))];
 let draftsById={};
 if(ids.length){
  const q=await sb.from("association_register_drafts").select("id,status,created_by").in("id",ids);
  if(!q.error)for(const d of q.data||[])draftsById[d.id]=d;
 }
 const {data:returned,error:returnedError}=await sb.from("association_register_drafts").select("*").eq("created_by",profileUserId()).eq("status","changes_requested").order("created_at",{ascending:false}).limit(30);
 if(returnedError){notifyUI(items.filter(n=>!n.draft_id||draftsById[n.draft_id]?.status!=="approved"));host.append(el("p","تعذر تحميل المسودات المطلوب تعديلها: "+returnedError.message,"m-note"));return}
 const returnedIds=new Set((returned||[]).map(d=>d.id));
 const ownUnresolvedIds=new Set(Object.values(draftsById).filter(d=>d.created_by===profileUserId()&&["changes_requested","draft"].includes(d.status)).map(d=>d.id));
 // One short actionable alert per returned draft; hide its duplicate generic notification.
 notifyUI(items.filter(n=>!n.draft_id||(!returnedIds.has(n.draft_id)&&!ownUnresolvedIds.has(n.draft_id)&&draftsById[n.draft_id]?.status!=="approved")));
 for(const d of returned||[]){
  const card=el("div",undefined,"delib-notification");
  card.append(el("strong","تعديل مطلوب — "+(TITLES[d.register_key]||"مسودة")),el("p","طلب الرئيس تعديل هذه المسودة."));
  const edit=el("button","فتح المسودة","m-small");edit.type="button";edit.onclick=()=>openDraftForEdit(d);card.append(edit);host.append(card);
 }
}
async function review(d,status,note){
 msg("جارٍ حفظ قرار المراجعة وإتمام الإجراء…");
 const {data,error}=await sb.rpc("review_association_register_draft",{p_draft_id:d.id,p_status:status,p_note:note||null});
 if(error){msg("لم تكتمل العملية ولم يُؤكَّد الاعتماد: "+error.message,"error");return}
 if(!data||data.success!==true){msg("لم يؤكد النظام اكتمال العملية؛ حدّث السجلات وتحقق من الحالة قبل إعادة المحاولة.","error");return}
 msg(status==="approved"?"تم اعتماد القيد وإدراجه في صفحات السجل الرسمي برقم "+data.register_year+"/"+String(data.register_number).padStart(3,"0")+".":"أُعيدت المسودة إلى صاحبها مع ملاحظة التعديل.","success");
 await loadAll()
}
async function loadAll(){
 msg("جارٍ تحميل السجلات الرسمية…");
 const keys=Object.keys(TITLES);
 for(const key of keys){if(!ROLES[key].includes(profile.role)){$("register-"+key).hidden=true;continue}const host=$("register-"+key);host.hidden=false;
  const {data:entries,error}=await sb.from("association_register_entries").select("*").eq("register_key",key).eq("is_test",false).order("register_year",{ascending:false}).order("register_number",{ascending:false}).limit(200);
  if(error){host.textContent="تعذر تحميل السجل: "+error.message;continue}
  let drafts=[];if(key in DRAFT_ROLE){const q=sb.from("association_register_drafts").select("*").eq("register_key",key).neq("status","approved").order("created_at",{ascending:false}).limit(100);const {data:d,error:de}=await q;if(!de)drafts=d||[]}
  cachedEntries[key]=entries||[];cachedDrafts[key]=drafts;
 }
 await loadNotifications();
 if(!activeRegisterKey||!ROLES[activeRegisterKey]?.includes(profile.role))activeRegisterKey=keys.find(k=>ROLES[k].includes(profile.role))||null;
 renderRegisterChoices();
 renderTopActions();
 if(activeRegisterKey&&ROLES[activeRegisterKey]?.includes(profile.role)){const savedKey=activeRegisterKey;activeRegisterKey=null;$("register-choice-grid").hidden=false;$("register-selection-hint").textContent="اختر سجلًا لفتحه في وضع القراءة فقط.";for(const key of keys){const host=$("register-"+key);if(host)host.hidden=true}}
 else {activeRegisterKey=null;$("register-choice-grid").hidden=false;for(const key of keys){const host=$("register-"+key);if(host)host.hidden=true}}
 msg("تم تحديث السجلات التي يسمح بها حسابك.","success")
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
  renderRegisterChoices();
  renderTopActions();
  tab.addEventListener("click",()=>loadAll().catch(e=>msg(e.message,"error")));
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
  const params=new URLSearchParams(window.location.search);
  if(params.get("standalone_register")==="1"){
   const key=params.get("register"),draftId=params.get("draft");
   if(!key||!ROLES[key]?.includes(profile.role))throw new Error("هذا الحساب غير مخوّل لهذا السجل.");
   if(draftId){
    const {data:d,error:de}=await sb.from("association_register_drafts").select("*").eq("id",draftId).maybeSingle();
    if(de)throw de;if(!d)throw new Error("لم يتم العثور على المسودة المطلوبة.");
    if(d.register_key!==key)throw new Error("المسودة لا تتطابق مع السجل المطلوب.");
    if(d.created_by!==profile.user_id&&profile.role!=="president")throw new Error("لا تملك صلاحية فتح هذه المسودة.");
    if(profile.role==="president"){
     activeRegisterKey=key;registerView="review";$("register-choice-grid").hidden=true;
     for(const k of Object.keys(TITLES)){const h=$("register-"+k);if(h)h.hidden=k!==key}
     cachedDrafts[key]=[d];const host=$("register-"+key);host.hidden=false;await renderTable(key,cachedEntries[key]||[],cachedDrafts[key]);
    }else openDraftForEdit(d);
   }else{showRegister(key);await renderTable(key,cachedEntries[key]||[],cachedDrafts[key]||[])}
  }
 }catch(e){msg(e.message||"تعذر تهيئة السجلات.","error")}
});
})();