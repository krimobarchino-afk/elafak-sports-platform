import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json"};
const out=(v:unknown,s=200)=>new Response(JSON.stringify(v),{status:s,headers:cors});
const roles=["site_admin","president","secretary_general","treasurer","deputy_secretary_general","deputy_treasurer","technical_director"];
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
 const {data:actor}=await admin.from("staff_profiles").select("role,is_active").eq("user_id",u.user.id).maybeSingle();
 if(actor?.role!=="site_admin"||actor.is_active!==true)return out({error:"غير مخوّل لإدارة الحسابات"},403);
 let b:Record<string,unknown>;try{b=await req.json()}catch{return out({error:"طلب غير صالح"},400)}
 if(b.action==="list"){const {data,error}=await admin.from("staff_profiles").select("user_id,username,role,is_active,created_at").order("created_at");if(error)return out({error:"تعذر جلب الحسابات"},500);return out({accounts:data||[]})}
 if(b.action==="create"){
  const username=typeof b.username==="string"?b.username.trim().toLowerCase():"";
  if(!valid(username)||typeof b.role!=="string"||!roles.includes(b.role)||typeof b.password!=="string"||b.password.length<12||b.password.length>128)return out({error:"تحقق من اسم المستخدم والدور وكلمة المرور (12 خانة على الأقل)."},400);
  const {data:dup}=await admin.from("staff_profiles").select("user_id").eq("username",username).maybeSingle();if(dup)return out({error:"تعذر إنشاء الحساب بالبيانات المقدمة."},409);
  const {data:c,error:ce}=await admin.auth.admin.createUser({email:email(username),password:b.password,email_confirm:true});
  if(ce||!c.user)return out({error:"تعذر إنشاء الحساب بالبيانات المقدمة."},400);
  const {error:pe}=await admin.from("staff_profiles").insert({user_id:c.user.id,username,role:b.role,is_active:true,created_by:u.user.id});
  if(pe){await admin.auth.admin.deleteUser(c.user.id);return out({error:"تعذر إكمال إنشاء الحساب."},500)}
  return out({ok:true},201);
 }
 const id=typeof b.user_id==="string"?b.user_id:"";if(!id)return out({error:"معرّف الحساب مطلوب"},400);
 const {data:t}=await admin.from("staff_profiles").select("user_id,role").eq("user_id",id).maybeSingle();if(!t)return out({error:"الحساب غير موجود"},404);
 if(b.action==="activate"||b.action==="deactivate"){if(b.action==="deactivate"&&id===u.user.id)return out({error:"لا يمكن تعطيل حساب المدير الحالي."},400);const {error}=await admin.from("staff_profiles").update({is_active:b.action==="activate",updated_at:new Date().toISOString()}).eq("user_id",id);return error?out({error:"تعذر تحديث حالة الحساب"},500):out({ok:true})}
 if(b.action==="update"){
  const patch:Record<string,unknown>={updated_at:new Date().toISOString()};
  if(b.username!==undefined){const n=typeof b.username==="string"?b.username.trim().toLowerCase():"";if(!valid(n))return out({error:"اسم المستخدم غير صالح"},400);const {data:d}=await admin.from("staff_profiles").select("user_id").eq("username",n).neq("user_id",id).maybeSingle();if(d)return out({error:"اسم المستخدم مستخدم مسبقًا"},409);const {error}=await admin.auth.admin.updateUserById(id,{email:email(n),email_confirm:true});if(error)return out({error:"تعذر تغيير اسم المستخدم"},400);patch.username=n}
  if(b.role!==undefined){if(typeof b.role!=="string"||!roles.includes(b.role))return out({error:"الدور غير صالح"},400);patch.role=b.role}
  if(b.password!==undefined){if(typeof b.password!=="string"||b.password.length<12||b.password.length>128)return out({error:"كلمة المرور يجب أن تكون بين 12 و128 خانة"},400);const {error}=await admin.auth.admin.updateUserById(id,{password:b.password});if(error)return out({error:"تعذر تغيير كلمة المرور"},400)}
  const {error}=await admin.from("staff_profiles").update(patch).eq("user_id",id);return error?out({error:"تعذر حفظ التعديلات"},500):out({ok:true})
 }
 return out({error:"إجراء غير معروف"},400)
});