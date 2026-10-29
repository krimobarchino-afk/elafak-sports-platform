(()=>{"use strict";
const C=window.ElAfakSupabaseConfig||{url:"https://lfubzohsbwdoiagfkpkt.supabase.co",key:"sb_publishable_tCZjOnFHLIeQHF0mR9tVFA_9bu4lLrJ",storageKey:"sb-lfubzohsbwdoiagfkpkt-auth-token"};
const $=id=>document.getElementById(id);
const ledgerStyle=document.createElement("style");
ledgerStyle.textContent=".official-ledger-page{position:relative;max-width:920px;margin:1.4rem auto;padding:2rem clamp(1rem,4vw,3.2rem);background:#fffdf6;border:1px solid #c9c0a8;border-right:8px solid #6c806d;box-shadow:0 5px 18px #182e2510;color:#202a24;line-height:2;font-family:'Traditional Arabic','Amiri','Noto Naskh Arabic',serif;font-size:1.08rem;break-inside:avoid}.ledger-bookhead{text-align:center;border-bottom:3px double #8a927d;padding-bottom:1rem;margin-bottom:1rem;font-weight:700}.ledger-bookhead h3{font-size:1.45rem;margin:.6rem 0;color:#183c31}.ledger-meta{display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;padding:.55rem 0;border-bottom:1px solid #c9c0a8;font-size:.98rem}.ledger-minutes{padding:.7rem 0;overflow-wrap:anywhere}.ledger-minutes p{margin:.15rem 0;min-height:.8em;white-space:pre-wrap}.ledger-field{padding:.55rem 0;border-bottom:1px dotted #c9c0a8}.ledger-field strong{display:block;color:#234c3d}.ledger-field p{white-space:pre-wrap;margin:.2rem 0}.ledger-signatures{display:flex;justify-content:space-between;gap:2rem;margin-top:2rem;padding-top:1rem;border-top:1px solid #b9b29f;font-weight:700}@media(max-width:620px){.official-ledger-page{padding:1rem .8rem;border-right-width:5px;font-size:1rem}.ledger-meta{display:grid}.ledger-signatures{gap:.8rem;font-size:.9rem}}@media print{body *{visibility:hidden!important}.register-print-active,.register-print-active *{visibility:visible!important}.register-print-active{display:block!important;position:absolute!important;left:0!important;top:0!important;width:100%!important;max-width:none!important;margin:0!important;padding:0!important;box-shadow:none!important;border:0!important;background:#fff!important}.register-print-active .m-no-print,.register-print-active .register-page-nav{display:none!important}.official-ledger-page{box-shadow:none;border:0;border-right:3px solid #777;margin:0;max-width:none;break-after:page;page-break-after:always}.ledger-signatures{break-inside:avoid}.register-pdf-page{break-after:page;page-break-after:always;padding:12mm;color:#111;background:#fff}.register-pdf-page h4{border-bottom:1px solid #777;padding-bottom:5px}.register-pdf-page p{white-space:pre-wrap;overflow-wrap:anywhere}}";
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
 const back=el("button","العودة إلى قائمة السجلات","m-small");back.type="button";back.onclick=()=>{activeRegisterKey=null;registerView="home";document.getElementById("pane-official-registers")?.classList.remove("register-detail-open");host.hidden=true;$("register-choice-grid").hidden=false;$("register-selection-hint").hidden=false;$("register-selection-hint").textContent="اختر السجل المناسب لحسابك.";renderRegisterChoices()};nav.append(back,el("span",TITLES[key],"m-dashboard-title"));host.append(nav);
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
 if(registerView!=="review")section.append(el("h4","السجل الرسمي"));
 let officialEntries=registerView==="review"?[]:[...entries];
 if(key!=="deliberation"){
  const printBar=el("div",undefined,"m-toolbar ledger-print-toolbar m-no-print");
  printBar.append(el("p","يعرض هذا السجل منفصلًا عند الطباعة؛ اختر «حفظ كملف PDF» من نافذة الطباعة.","m-note"));
  const printButton=el("button","عرض السجل / حفظ PDF","m-small");printButton.type="button";printButton.onclick=()=>{document.querySelectorAll(".register-print-active").forEach(n=>n.classList.remove("register-print-active"));host.classList.add("register-print-active");const clean=()=>{host.classList.remove("register-print-active");window.removeEventListener("afterprint",clean)};window.addEventListener("afterprint",clean);window.print();setTimeout(clean,1500)};printBar.append(printButton);section.append(printBar);
 }
 if(key==="deliberation"){
  if(registerView==="review") {host.append(section);return}
  await renderDeliberationArchive(section,officialEntries);
  host.append(section);
  return;
 }
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
function showRegister(key){
 if(!key||!ROLES[key]?.includes(profile?.role))return;
 activeRegisterKey=key;
 registerView=canReview(key)?"home":canCreate(key)?"home":"browse";
 $("register-choice-grid").hidden=true;
 $("register-selection-hint").hidden=true;
 document.getElementById("pane-official-registers")?.classList.add("register-detail-open");
 $("register-selection-hint").textContent="أنت الآن داخل "+TITLES[key]+".";
 for(const k of Object.keys(TITLES)){const host=$("register-"+k);if(host)host.hidden=k!==key}
 const form=$("register-draft-form");
 if(form.dataset.key&&form.dataset.key!==key){form.hidden=true;form.reset();editDraft=null}
 const host=$("register-"+key);if(host){host.hidden=false;
  if(registerView==="browse")renderTable(key,[],[]);
  else renderTable(key,[],[]);
 }
}
function renderRegisterChoices(){
 const grid=$("register-choice-grid");grid.replaceChildren();
 for(const key of Object.keys(TITLES)){
  if(!ROLES[key].includes(profile.role))continue;
  const b=el("button",undefined,"m-dashboard-card");b.type="button";b.dataset.registerKey=key;
  b.append(el("span","▤","m-dashboard-icon"),el("span",TITLES[key],"m-dashboard-title"));
  const descriptions={deliberation:"المداولات والقرارات المعتمدة",accounting:"الإيرادات والمصروفات والقيود المالية",equipment:"جرد العتاد وحالته",outgoing_mail:"المراسلات الصادرة مرتبة بالتاريخ",incoming_mail:"المراسلات الواردة مرتبة بالتاريخ",activities:"الأنشطة والبرامج المنجزة والمبرمجة",tasks:"المهام والتكليفات الرئاسية",inspection:"تقارير التفتيش والمراقبة"};
  b.append(el("span",descriptions[key],"m-dashboard-description"));
  b.setAttribute("aria-pressed","false");b.onclick=()=>{showRegister(key);renderTable(key,cachedEntries[key]||[],cachedDrafts[key]||[])};grid.append(b);
 }
}
function profileUserId(){return profile?.user_id}
function notifyUI(items){const host=$("register-notifications");host.replaceChildren();if(!items.length){host.append(el("p","لا توجد إشعارات جديدة.","m-note"));return}for(const n of items){const card=el("div",undefined,"delib-notification");card.append(el("strong",n.title),el("p",n.body),el("small",formatDate(n.created_at)));const b=el("button","تمييز كمقروء","m-small");b.onclick=async()=>{await sb.from("association_register_notifications").update({read_at:new Date().toISOString()}).eq("id",n.id);await loadNotifications()};card.append(b);host.append(card)}}
async function loadNotifications(){const {data,error}=await sb.from("association_register_notifications").select("*").is("read_at",null).order("created_at",{ascending:false}).limit(30);if(error){$("register-notifications").textContent="تعذر تحميل الإشعارات: "+error.message;return}notifyUI(data||[])}
async function loadHtml2Pdf(){
 if(window.html2pdf)return window.html2pdf;
 await new Promise((resolve,reject)=>{const script=document.createElement("script");script.src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";script.onload=resolve;script.onerror=()=>reject(new Error("تعذر تحميل أداة إنشاء PDF."));document.head.append(script)});
 if(!window.html2pdf)throw new Error("أداة PDF غير متاحة.");return window.html2pdf;
}
function deliberationPdfPath(entry){return "deliberation/"+entry.register_year+"/"+String(entry.register_number).padStart(4,"0")+".pdf"}
async function createDeliberationPdf(entry){
 const html2pdf=await loadHtml2Pdf();
 const page=renderDeliberationPage(entry);
 const stage=el("div");stage.dir="rtl";
 stage.style.cssText="display:block;position:fixed;left:0;top:0;width:794px;min-height:10px;box-sizing:border-box;z-index:2147483000;background:#fff;color:#111;direction:rtl;pointer-events:none";
 page.style.cssText+=";display:block;visibility:visible;opacity:1;position:relative;box-sizing:border-box;width:100%;max-width:none;height:auto;min-height:1px;overflow:visible;margin:0;padding:42px 52px;background:#fff;color:#111;box-shadow:none;border:0;border-right:8px solid #6c806d;font-family:Arial,sans-serif;font-size:16px;line-height:1.8;break-inside:auto!important;page-break-inside:auto!important;break-after:auto!important;page-break-after:auto!important";
 stage.append(page);document.body.append(stage);
 try{
  if(document.fonts&&document.fonts.ready)await document.fonts.ready;
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  if(!page.textContent.trim())throw new Error("محتوى المداولة فارغ؛ أُلغي إنشاء PDF");
  const options={margin:[12,12,12,12],image:{type:"jpeg",quality:0.98},html2canvas:{scale:2,useCORS:true,backgroundColor:"#ffffff",logging:false,scrollX:0,scrollY:0,width:794,windowWidth:794},jsPDF:{unit:"mm",format:"a4",orientation:"portrait",compress:true},pagebreak:{mode:["css","legacy"],avoid:[".ledger-bookhead",".ledger-meta",".ledger-signatures",".ledger-field",".ledger-minutes p"]}};
  const pdf=await html2pdf().set(options).from(page).toPdf().get("pdf");
  if(!pdf||pdf.getNumberOfPages()<1)throw new Error("لم تُنشأ صفحات PDF");
  const blob=pdf.output("blob");
  if(!blob||blob.size<1000)throw new Error("ملف PDF الناتج فارغ أو غير مكتمل");
  const {error}=await sb.storage.from("official-register-pdfs").upload(deliberationPdfPath(entry),blob,{contentType:"application/pdf",upsert:true});
  if(error)throw error;
  return deliberationPdfPath(entry);
 }finally{stage.remove()}
}
async function renderDeliberationArchive(section,entries){
 const folder=el("section",undefined,"m-card");folder.append(el("h4","أرشيف سجل المداولة — ملفات PDF المعتمدة"),el("p","كل ملف يمثل مداولة رسمية مستقلة، مرتبة حسب السنة ورقم القيد. تُفتح الملفات للقراءة أو الطباعة، ولا تُعرض المسودات في هذا الأرشيف.","m-note"));
 if(!entries.length){folder.append(el("p","لا توجد مداولات معتمدة في الأرشيف حتى الآن.","m-note"));section.append(folder);return}
 const table=el("table");table.className="m-table";const head=el("thead"),hr=el("tr");["رقم القيد","تاريخ الاعتماد","عنوان المداولة","ملف PDF الرسمي"].forEach(x=>hr.append(el("th",x)));head.append(hr);const body=el("tbody");table.append(head,body);folder.append(table);section.append(folder);
 const ordered=[...entries].sort((a,b)=>a.register_year-b.register_year||a.register_number-b.register_number);
 for(const entry of ordered){
  const row=el("tr");row.append(el("td",entry.register_year+"/"+String(entry.register_number).padStart(3,"0")),el("td",formatDate(entry.approved_at)),el("td",entry.payload?.title||"مداولة"));
  const cell=el("td");const {data,error}=await sb.storage.from("official-register-pdfs").createSignedUrl(deliberationPdfPath(entry),300);
  if(!error&&data?.signedUrl){const link=el("a","فتح ملف PDF");link.href=data.signedUrl;link.target="_blank";link.rel="noopener noreferrer";link.className="m-small";cell.append(link)}
  else{
   cell.append(el("span","ملف PDF غير موجود بعد","m-note"));
   if(profile?.role==="president"){const make=el("button","إنشاء ملف PDF","m-small");make.type="button";make.onclick=async()=>{make.disabled=true;try{await createDeliberationPdf(entry);msg("تم إنشاء PDF للمداولة "+entry.register_year+"/"+entry.register_number+".","success");renderTable("deliberation",cachedEntries.deliberation||[],cachedDrafts.deliberation||[])}catch(e){msg("تعذر إنشاء PDF: "+(e.message||"خطأ غير معروف"),"error");make.disabled=false}};cell.append(make)}
  }
  row.append(cell);body.append(row);
 }
}
async function review(d,status,note){
 msg("جارٍ حفظ قرار المراجعة وإتمام الإجراء…");
 const {data,error}=await sb.rpc("review_association_register_draft",{p_draft_id:d.id,p_status:status,p_note:note||null});
 if(error){msg("لم تكتمل العملية ولم يُؤكَّد الاعتماد: "+error.message,"error");return}
 if(!data||data.success!==true){msg("لم يؤكد النظام اكتمال العملية؛ حدّث السجلات وتحقق من الحالة قبل إعادة المحاولة.","error");return}
 if(status==="approved"&&d.register_key==="deliberation"){
  const {data:entry,error:entryError}=await sb.from("association_register_entries").select("*").eq("id",data.official_entry_id).eq("is_test",false).single();
  if(entryError||!entry){msg("تم اعتماد المداولة، لكن تعذر تحميل القيد لإنشاء PDF. يمكن إعادة إنشاء الملف من أرشيف السجل.","error");await loadAll();return}
  try{await createDeliberationPdf(entry);msg("تم اعتماد المداولة وحفظ ملف PDF الرسمي رقم "+data.register_year+"/"+String(data.register_number).padStart(3,"0")+" في أرشيف الجمعية.","success")}
  catch(e){msg("تم اعتماد المداولة رسميًا، لكن تعذر حفظ PDF تلقائيًا: "+(e.message||"خطأ غير معروف")+". يمكن للرئيس إعادة إنشاء الملف من الأرشيف.","error")}
 }else msg(status==="approved"?"تم اعتماد القيد وإدراجه في السجل الرسمي برقم "+data.register_year+"/"+String(data.register_number).padStart(3,"0")+".":"أُعيدت المسودة إلى صاحبها مع ملاحظة التعديل.","success");
 await loadAll()
}
async function loadAll(){
 msg("جارٍ تحميل السجلات الرسمية…");
 const keys=Object.keys(TITLES);
 for(const key of keys){if(!ROLES[key].includes(profile.role)){$("register-"+key).hidden=true;continue}const host=$("register-"+key);host.hidden=false;
  const {data:entries,error}=await sb.from("association_register_entries").select("*").eq("register_key",key).eq("is_test",false).order("register_year",{ascending:false}).order("register_number",{ascending:false}).limit(200);
  if(error){host.textContent="تعذر تحميل السجل: "+error.message;continue}
  let drafts=[];if(key in DRAFT_ROLE){const q=sb.from("association_register_drafts").select("*").eq("register_key",key).neq("status","approved").order("created_at",{ascending:false}).limit(100);const {data:d,error:de}=await q;if(!de)drafts=d||[]}
  cachedEntries[key]=entries||[];cachedDrafts[key]=drafts;renderTable(key,cachedEntries[key],cachedDrafts[key]);
 }
 await loadNotifications();
 if(activeRegisterKey&&!ROLES[activeRegisterKey]?.includes(profile.role))activeRegisterKey=null;
 renderRegisterChoices();
 if(activeRegisterKey){const savedKey=activeRegisterKey;showRegister(savedKey);renderTable(savedKey,cachedEntries[savedKey]||[],cachedDrafts[savedKey]||[])}
 else {
  $("pane-official-registers")?.classList.remove("register-detail-open");
  $("register-choice-grid").hidden=false;$("register-selection-hint").hidden=false;
  $("register-selection-hint").textContent="اختر سجلًا واحدًا للانتقال إلى صفحته الخاصة.";
  for(const key of keys){const host=$("register-"+key);if(host)host.hidden=true}
 }
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