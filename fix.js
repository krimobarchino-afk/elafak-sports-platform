(()=>{'use strict';
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-action="edit-member"]');
 if(b&&!b.dataset.id){const tr=b.closest('tr');const no=tr?.children?.[0]?.textContent?.trim();const m=(window.__afakDbMembers||[]).find(x=>String(x.no)===String(no));if(m)b.dataset.id=m.id}
},true);
})();