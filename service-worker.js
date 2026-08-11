const CACHE_NAME='gonggame-v353-mastery-hp-elite-fx-kill-banner';
const CORE=['./index.html','./manifest.webmanifest','./icons/gonggame-192.png','./icons/gonggame-512.png','./icons/gonggame-maskable-512.png','./characters/lee_eunho.jpeg','./characters/yoon_juhyeong.jpg','./characters/lee_seohyun_v277.png','./characters/kang_yeonwoo_v311.png','./characters/choi_daeun_v311.png','./characters/seoyeonseo_v316.png','./characters/kim_taerin_v323.jpg','./characters/eom_haein_v343.png'];

async function fresh(request){
  return fetch(request,{cache:'no-store'});
}

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE_NAME);
    for(const url of CORE){
      try{
        const res=await fresh(new Request(url,{cache:'reload'}));
        if(res&&res.ok)await cache.put(url,res.clone());
      }catch(_){/* install must not fail because of one optional asset */}
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k!==CACHE_NAME&&/^gonggame-/i.test(k)).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;
  if(event.request.mode==='navigate'||url.pathname.endsWith('/index.html')||url.pathname==='/'){
    event.respondWith((async()=>{
      try{
        const response=await fresh(event.request);
        if(response&&response.ok){
          const cache=await caches.open(CACHE_NAME);
          await cache.put('./index.html',response.clone());
        }
        return response;
      }catch(_){
        return (await caches.match('./index.html')) || Response.error();
      }
    })());
    return;
  }
  event.respondWith((async()=>{
    try{
      const response=await fresh(event.request);
      if(response&&response.ok&&['style','script','image','manifest'].includes(event.request.destination)){
        const cache=await caches.open(CACHE_NAME);
        await cache.put(event.request,response.clone());
      }
      return response;
    }catch(_){
      return (await caches.match(event.request)) || Response.error();
    }
  })());
});
