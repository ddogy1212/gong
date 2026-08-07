const CACHE_NAME='gonggame-v283-smart-push-fast-matchup-boss';
const CORE=['./','./index.html','./manifest.webmanifest','./push-config.js','./icons/gonggame-192.png','./icons/gonggame-512.png','./icons/gonggame-maskable-512.png','./characters/lee_eunho.jpeg','./characters/yoon_juhyeong.jpg','./characters/lee_seohyun_v277.png'];

self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME&&/^gonggame-/i.test(key)).map(key=>caches.delete(key)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;
  if(event.request.mode==='navigate'){
    event.respondWith(fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put('./index.html',copy));return response}).catch(()=>caches.match('./index.html')));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{if(response.ok&&['style','script','image','manifest'].includes(event.request.destination)){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy))}return response})));
});

function notificationPayload(payload={}){
  const data=payload.data||payload||{},notification=payload.notification||{};
  const title=String(data.title||notification.title||'공게임 알림');
  const body=String(data.body||notification.body||'공게임에 새 소식이 있어!');
  const kind=String(data.kind||'update');
  const url=String(data.url||`./?notification=${encodeURIComponent(kind)}&source=push&v=283`);
  return {title,body,kind,url};
}
async function displayPush(payload){
  const n=notificationPayload(payload);
  return self.registration.showNotification(n.title,{body:n.body,icon:'./icons/gonggame-192.png',badge:'./icons/gonggame-192.png',tag:`gonggame-${n.kind}`,renotify:false,data:{url:n.url,kind:n.kind,build:'V283_SMART_PUSH_FAST_MATCHUP_BOSS_RESTORED'},actions:[{action:'play',title:n.kind==='competitive'?'경쟁전 하러가기':'게임 열기'}]});
}

let fcmReady=false;
try{
  importScripts('https://www.gstatic.com/firebasejs/12.17.0/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/12.17.0/firebase-messaging-compat.js');
  firebase.initializeApp({apiKey:'AIzaSyCcCFaMN7WMfwgkLu2d1ksxQ9LYfcL1VKw',authDomain:'salw-gong-game.firebaseapp.com',databaseURL:'https://salw-gong-game-default-rtdb.asia-southeast1.firebasedatabase.app',projectId:'salw-gong-game',storageBucket:'salw-gong-game.firebasestorage.app',messagingSenderId:'301115328104',appId:'1:301115328104:web:f748d4e7fe2dfd24fd9ddd'});
  const messaging=firebase.messaging();
  messaging.onBackgroundMessage(payload=>displayPush(payload));
  fcmReady=true;
}catch(error){console.warn('[V282 SW] Firebase Messaging unavailable',error?.message||error)}

if(!fcmReady){
  self.addEventListener('push',event=>{let payload={};try{payload=event.data?.json?.()||{body:event.data?.text?.()||''}}catch(_){payload={body:event.data?.text?.()||''}}event.waitUntil(displayPush(payload))});
}

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const target=new URL(event.notification?.data?.url||'./',self.location.origin).href;
  event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async clients=>{
    for(const client of clients){
      try{const current=new URL(client.url);if(current.origin===self.location.origin){await client.focus();client.postMessage({type:'gong-v282-notification-click',url:target,kind:event.notification?.data?.kind||''});return}}
      catch(_){}
    }
    if(self.clients.openWindow)return self.clients.openWindow(target);
  }));
});
