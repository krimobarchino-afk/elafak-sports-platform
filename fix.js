(()=>{'use strict';
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-action="edit-member"]');
 if(b&&!b.dataset.id){
  const no=b.closest('tr')?.children?.[0]?.textContent?.trim();
  try{const d=JSON.parse(localStorage.getItem('afak_horizon_v3')||'null');const m=d?.members?.find(x=>String(x.no)===String(no));if(m)b.dataset.id=m.id}catch{}
 }
},true);
})();