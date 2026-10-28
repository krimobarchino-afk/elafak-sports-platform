import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json"};
const out=(v:unknown,s=200)=>new Response(JSON.stringify(v),{status:s,headers:cors});
const roles=["president","deputy_president","secretary_general","treasurer","deputy_secretary_general","deputy_treasurer","technical_director","inspection_inspector"];
const valid=(v:unknown):v is string=>typeof v==="string"&&/^[a-z0-9][a-z0-9._-]{2,31}$/.test(v);
const email=(u:string)=>u+"@staff.elafak.invalid";
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return out({error:"الطريقة غير مسموحة"},405);
 const url=Deno.env.get("SUPABASE_URL"), key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!key)return out({error:"خدمة الإدارة غير مهيأة"},503);
 const auth=req.headers.get("Authorization")||"", token=auth.replace(/^Bearer\s+/i,"");
 if(!token||token===auth)return out({error:"يلزم تسجيل الدخول"},401);
 const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:u,error:ue}=await admin.auth.getUser(token);
 if(ue||!u.user)return out({error:"جلسة غير صالحة"},401);
 const {data:actor}=await admin.from("staff_profiles").select("role,is_active,is_frozen").eq("user_id",u.user.id).maybeSingle();
 if(actor?.role!=="site_admin"||actor.is_active!==true||actor.is_frozen===true)return out({error:"غير مخوّل لإدارة الحسابات"},403);
 let b:Record<string,unknown>;try{b=await req.json()}catch{return out({error:"طلب غير صالح"},400)}
 if(b.action==="list"){
  const {data,error}=await admin.from("staff_profiles").select("user_id,username,role,is_active,is_frozen,created_at").order("created_at");
  if(error)return out({error:"تعذر جلب الحسابات"},500);
  return out({accounts:data||[]});
 }
 const inspectorAccountCreation=b.action==="create"&&b.role==="inspection_inspector";
 const bureau_order_reference=typeof b.bureau_order_reference==="string"?b.bureau_order_reference.trim():"";
 const bureau_order_date=typeof b.bureau_order_date==="string"?b.bureau_order_date:"";
 const dateOk=/^\d{4}-\d{2}-\d{2}$/.test(bureau_order_date)&&Number.isFinite(Date.parse(bureau_order_date+"T00:00:00Z"))&&new Date(bureau_order_date+"T00:00:00Z").toISOString().slice(0,10)===bureau_order_date;
 if(!inspectorAccountCreation&&(bureau_order_reference.length<3||bureau_order_reference.length>180||!dateOk))return out({error:"كل إجراء إداري على الحسابات يتطلب مرجع أمر/قرار المكتب التنفيذي وتاريخه الصحيح."},400);
 const audit=async(action:string,recordId:string|null,details:Record<string,unknown>={})=>{
  const auditDetails:Record<string,unknown>={...details};
  if(inspectorAccountCreation){auditDetails.reference_requirement="not_required_for_inspector_account_creation";}
  else {auditDetails.bureau_order_reference=bureau_order_reference;auditDetails.bureau_order_date=bureau_order_date;}
  const {error}=await admin.from("audit_log").insert({table_name:"staff_profiles",record_id:recordId,action,actor_id:u.user.id,changed_at:new Date().toISOString(),details:auditDetails});
  if(error)console.error("staff-admin audit log insert failed",error.message);
  return !error;
 };
 const auditResult=(ok:boolean)=>out({ok:true,...(!ok?{audit_warning:true}:{})});
 if(b.action==="create"){
  const username=typeof b.username==="string"?b.username.trim().toLowerCase():"";
  if(!valid(username)||typeof b.role!=="string"||!roles.includes(b.role)||typeof b.password!=="string"||b.password.length<12||b.password.length>128)
   return out({error:"تحقق من اسم المستخدم والدور وكلمة المرور (12 خانة على الأقل). لا يمكن إنشاء حساب مدير موقع إضافي."},400);
  const {data:dup}=await admin.from("staff_profiles").select("user_id").eq("username",username).maybeSingle();
  if(dup)return out({error:"تعذر إنشاء الحساب بالبيانات المقدمة."},409);
  const {data:c,error:ce}=await admin.auth.admin.createUser({email:email(username),password:b.password,email_confirm:true});
  if(ce||!c.user)return out({error:"تعذر إنشاء الحساب بالبيانات المقدمة."},400);
  const {error:pe}=await admin.from("staff_profiles").insert({user_id:c.user.id,username,role:b.role,is_active:true,is_frozen:false,created_by:u.user.id});
  if(pe){await admin.auth.admin.deleteUser(c.user.id);return out({error:"تعذر إكمال إنشاء الحساب."},500)}
  return out({ok:true,...(!(await audit("staff_account_create",c.user.id,{username,role:b.role}))?{audit_warning:true}:{})},201);
 }
 const id=typeof b.user_id==="string"?b.user_id:"";
 if(!id)return out({error:"معرّف الحساب مطلوب"},400);
 const {data:t}=await admin.from("staff_profiles").select("user_id,role,is_active,is_frozen,username,created_by,created_at,updated_at").eq("user_id",id).maybeSingle();
 if(!t)return out({error:"الحساب غير موجود"},404);
 if(t.role==="site_admin"&&id!==u.user.id)return out({error:"لا يمكن إدارة حساب مدير موقع آخر من هذه الواجهة."},403);
 if(b.action==="delete"){
  if(id===u.user.id)return out({error:"لا يمكن حذف حساب مدير الموقع الذي تستخدمه حاليًا."},400);
  if(t.role==="site_admin")return out({error:"حذف حساب مدير الموقع غير مسموح من هذه الواجهة."},403);
  const {error:ae}=await admin.auth.admin.deleteUser(id);
  if(ae)return out({error:"تعذر حذف حساب الدخول؛ لم يُحذف سجل الحساب."},500);
  const {error:pe}=await admin.from("staff_profiles").delete().eq("user_id",id);
  if(pe)return out({error:"تم إلغاء حساب الدخول، لكن تعذر تنظيف سجل الصلاحيات؛ راجع مدير قاعدة البيانات."},500);
  return auditResult(await audit("staff_account_delete",id,{username:t.username,role:t.role}));
 }
 if(b.action==="freeze"){
  if(id===u.user.id)return out({error:"لا يمكن تجميد حساب مدير الموقع الذي تستخدمه حاليًا."},400);
  if(t.role==="site_admin")return out({error:"لا يمكن تجميد حساب مدير الموقع من هذه الواجهة."},403);
  const {error:pe}=await admin.from("staff_profiles").update({is_active:false,is_frozen:true,updated_at:new Date().toISOString()}).eq("user_id",id);
  if(pe)return out({error:"تعذر تحديث حالة الحساب."},500);
  const {error:be}=await admin.auth.admin.updateUserById(id,{ban_duration:"876000h"});
  if(be)return out({error:"تم إيقاف صلاحيات الحساب، لكن تعذر تطبيق حظر تسجيل الدخول. راجع الحساب فورًا."},500);
  return auditResult(await audit("staff_account_freeze",id,{username:t.username,role:t.role}));
 }
 if(b.action==="activate"||b.action==="deactivate"){
  if(b.action==="deactivate"&&id===u.user.id)return out({error:"لا يمكن تعطيل حساب مدير الموقع الحالي."},400);
  if(t.role==="site_admin"&&b.action==="deactivate")return out({error:"لا يمكن تعطيل حساب مدير الموقع من هذه الواجهة."},403);
  const active=b.action==="activate";
  const {error:pe}=await admin.from("staff_profiles").update({is_active:active,is_frozen:false,updated_at:new Date().toISOString()}).eq("user_id",id);
  if(pe)return out({error:"تعذر تحديث حالة الحساب."},500);
  if(active){
   const {error:be}=await admin.auth.admin.updateUserById(id,{ban_duration:"none"});
   if(be)return out({error:"تم تفعيل الصلاحيات، لكن تعذر إزالة حظر تسجيل الدخول."},500);
  }
  return auditResult(await audit(active?"staff_account_activate":"staff_account_deactivate",id,{username:t.username,role:t.role,is_active:active}));
 }
 if(b.action==="update"){
  if(id===u.user.id&&b.role!==undefined&&b.role!==t.role)return out({error:"لا يمكن تغيير دور حساب مدير الموقع الحالي."},400);
  const patch:Record<string,unknown>={updated_at:new Date().toISOString()};
  if(b.username!==undefined){
   const n=typeof b.username==="string"?b.username.trim().toLowerCase():"";
   if(!valid(n))return out({error:"اسم المستخدم غير صالح"},400);
   const {data:d}=await admin.from("staff_profiles").select("user_id").eq("username",n).neq("user_id",id).maybeSingle();
   if(d)return out({error:"اسم المستخدم مستخدم مسبقًا"},409);
   const {error}=await admin.auth.admin.updateUserById(id,{email:email(n),email_confirm:true});
   if(error)return out({error:"تعذر تغيير اسم المستخدم"},400);
   patch.username=n;
  }
  if(b.role!==undefined){
   if(typeof b.role!=="string"||!roles.includes(b.role))return out({error:"الدور غير صالح. لا يمكن تعيين دور مدير الموقع لحساب آخر."},400);
   patch.role=b.role;
  }
  if(b.password!==undefined){
   if(typeof b.password!=="string"||b.password.length<12||b.password.length>128)return out({error:"كلمة المرور يجب أن تكون بين 12 و128 خانة"},400);
   const {error}=await admin.auth.admin.updateUserById(id,{password:b.password});
   if(error)return out({error:"تعذر تغيير كلمة المرور"},400);
  }
  const {error}=await admin.from("staff_profiles").update(patch).eq("user_id",id);
  if(error)return out({error:"تعذر حفظ التعديلات"},500);
  return auditResult(await audit("staff_account_update",id,{username:typeof patch.username==="string"?patch.username:t.username,role:typeof patch.role==="string"?patch.role:t.role,changed_fields:Object.keys(patch).filter(k=>k!=="updated_at")}));
 }
 return out({error:"إجراء غير معروف"},400);
});