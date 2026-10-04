const CACHE='afak-v8-9';
const ASSETS=['/','/index.html','/v8.js','/manifest.json','/icon-192.png','/icon-512.png','/apple-touch-icon.png','/sw.js'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)))});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;
 const u=new URL(e.request.url);
 if(u.pathname==='/'||u.pathname==='/index.html'||u.pathname==='/v8.js'||u.pathname==='/sw.js'){
   e.respondWith(fetch(e.request,{cache:'no-store'}).then(x=>{
     const c=x.clone(); caches.open(CACHE).then(k=>k.put(e.request,c)); return x;
   }).catch(()=>caches.match(e.request).then(r=>r||caches.match('/index.html'))));
   return;
 }
 e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(x=>{
   const c=x.clone(); caches.open(CACHE).then(k=>k.put(e.request,c)); return x;
 }).catch(()=>caches.match('/index.html'))));
});
