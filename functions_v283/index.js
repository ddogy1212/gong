'use strict';
const {onSchedule}=require('firebase-functions/v2/scheduler');
const {onValueCreated}=require('firebase-functions/v2/database');
const {initializeApp}=require('firebase-admin/app');
const {getDatabase}=require('firebase-admin/database');
const {getMessaging}=require('firebase-admin/messaging');
initializeApp();

const BUILD='V283_SMART_PUSH_FAST_MATCHUP_BOSS_RESTORED';
const ROOT='pushSubscriptions/v1';
const TEMPLATES=[
  {id:'competitive-rank',kind:'competitive',title:'🔥 경쟁전 한 판?',body:'지금 한 경기로 시즌 점수와 랭킹을 올려봐. 공게임 경쟁전이 기다리고 있어!'},
  {id:'competitive-climb',kind:'competitive',title:'🏆 랭킹이 움직이는 중',body:'오늘 경쟁전 기록 아직 더 올릴 수 있어. 한 판만 더 가볼래?'},
  {id:'competitive-season',kind:'competitive',title:'⚔️ 시즌 점수 챙길 시간',body:'승리하면 점수가 크게 오른다. 경쟁전에서 오늘의 최고 티어를 노려봐!'},
  {id:'tournament',kind:'tournament',title:'🎯 토너먼트 예측 도전',body:'대진을 돌리고 1·2·3위를 맞혀봐. 빠른경기로 결과도 금방 확인할 수 있어!'},
  {id:'mastery',kind:'mastery',title:'🌱 숙련도 올릴 캐릭터 있지?',body:'육성모드에서 한 판 더 돌리고 좋아하는 캐릭터 숙련도를 올려봐.'},
  {id:'showdown',kind:'showdown',title:'💥 오늘의 공게임 매치',body:'랜덤 조합으로 한 판 돌려봐. 예상 못 한 상성이 터질지도 몰라!'},
  {id:'comeback',kind:'comeback',title:'👀 공게임 경기장 비었는데?',body:'짧게 한 판만 보고 가도 돼. 오늘은 누가 이길지 확인해봐!'}
];
const WEIGHTED=[0,1,2,0,3,4,5,6];
function kstParts(ts=Date.now()){
  const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',weekday:'short',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(new Date(ts)).reduce((a,x)=>(a[x.type]=x.value,a),{});
  return {day:`${p.year}-${p.month}-${p.day}`,weekday:p.weekday,hour:Number(p.hour)%24,minute:Number(p.minute)};
}
function nextSlot(after=Date.now()){
  for(let offset=0;offset<8;offset++){
    const probe=after+60000+offset*86400000,p=kstParts(probe),weekend=p.weekday==='Sat'||p.weekday==='Sun',slots=weekend?[[13,20],[20,40]]:[[17,40],[21,10]];
    for(const [h,m] of slots){const ts=Date.parse(`${p.day}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00+09:00`);if(ts>after+60000)return ts}
  }
  return after+6*3600000;
}
function pick(last=''){let t=TEMPLATES[WEIGHTED[Math.floor(Math.random()*WEIGHTED.length)]];for(let i=0;i<5&&t.id===last;i++)t=TEMPLATES[WEIGHTED[Math.floor(Math.random()*WEIGHTED.length)]];return t}
function payload(t){return {data:{title:t.title,body:t.body,kind:t.kind,url:`./?notification=${encodeURIComponent(t.kind)}&source=push&v=283`,build:BUILD}}}
function flatten(raw){const out=[];for(const [uid,devices] of Object.entries(raw||{}))for(const [deviceId,row] of Object.entries(devices||{}))if(row&&typeof row==='object')out.push({uid,deviceId,...row});return out}
function invalidToken(error){const c=String(error?.code||'');return c.includes('registration-token-not-registered')||c.includes('invalid-registration-token')}

exports.sendScheduledGameNotifications=onSchedule({schedule:'every 15 minutes',timeZone:'Asia/Seoul',region:'asia-northeast3',memory:'256MiB',timeoutSeconds:120},async()=>{
  const db=getDatabase(),snap=await db.ref(ROOT).get(),rows=flatten(snap.val()),now=Date.now(),day=kstParts(now).day,updates={};let sent=0,skipped=0,removed=0;
  for(const row of rows){
    const path=`${ROOT}/${row.uid}/${row.deviceId}`;if(!row.enabled||!row.token){skipped++;continue}
    let sentToday=row.lastDay===day?Math.max(0,Number(row.sentToday)||0):0;
    if(sentToday>=2){updates[`${path}/lastDay`]=day;updates[`${path}/sentToday`]=sentToday;updates[`${path}/nextAt`]=nextSlot(now+8*3600000);skipped++;continue}
    const due=Number(row.nextAt)||0;if(due>now+60000){skipped++;continue}
    if(now-(Number(row.lastActiveAt)||0)<25*60000){updates[`${path}/nextAt`]=nextSlot(now+45*60000);skipped++;continue}
    const time=kstParts(now),decimal=time.hour+time.minute/60;if(decimal<7.5||decimal>=22.5){updates[`${path}/nextAt`]=nextSlot(now);skipped++;continue}
    const updatePending=!!row.build&&String(row.build)!==BUILD&&String(row.lastUpdatePushBuild||'')!==BUILD;
    const t=updatePending?{id:`update-${BUILD}`,kind:'update',title:'🆕 공게임 업데이트!',body:'새 버전이 적용됐어. 바뀐 캐릭터·밸런스·기능을 지금 확인해봐!'}:pick(String(row.lastTemplate||''));
    try{
      await getMessaging().send({token:row.token,...payload(t)});sentToday++;sent++;
      updates[`${path}/lastDay`]=day;updates[`${path}/sentToday`]=sentToday;updates[`${path}/lastSentAt`]=now;updates[`${path}/lastTemplate`]=t.id;updates[`${path}/nextAt`]=nextSlot(now);updates[`${path}/lastPushStatus`]='sent';updates[`${path}/updatedAt`]=now;if(updatePending)updates[`${path}/lastUpdatePushBuild`]=BUILD;
    }catch(error){
      if(invalidToken(error)){updates[path]=null;removed++}else{updates[`${path}/lastPushStatus`]=String(error?.code||error?.message||'send-failed').slice(0,120);updates[`${path}/nextAt`]=nextSlot(now+60*60000)}
    }
  }
  if(Object.keys(updates).length)await db.ref().update(updates);
  console.log(JSON.stringify({build:BUILD,rows:rows.length,sent,skipped,removed,at:new Date(now).toISOString()}));
});

exports.broadcastGameUpdate=onValueCreated({ref:'/pushCampaigns/v1/{campaignId}',region:'asia-northeast3',memory:'256MiB',timeoutSeconds:180},async event=>{
  const campaign=event.data.val()||{},title=String(campaign.title||'🆕 공게임 업데이트!').slice(0,80),body=String(campaign.body||'새 업데이트가 적용됐어. 게임에서 확인해봐!').slice(0,180),kind=['update','new-character','competitive','tournament'].includes(campaign.kind)?campaign.kind:'update',db=getDatabase(),snap=await db.ref(ROOT).get(),rows=flatten(snap.val()).filter(r=>r.enabled&&r.token);let success=0,failure=0;const updates={};
  for(const row of rows){try{await getMessaging().send({token:row.token,data:{title,body,kind,url:`./?notification=${encodeURIComponent(kind)}&source=campaign&v=283`,build:BUILD}});success++}catch(error){failure++;if(invalidToken(error))updates[`${ROOT}/${row.uid}/${row.deviceId}`]=null}}
  updates[`pushCampaigns/v1/${event.params.campaignId}/delivered`]=success;updates[`pushCampaigns/v1/${event.params.campaignId}/failed`]=failure;updates[`pushCampaigns/v1/${event.params.campaignId}/processedAt`]=Date.now();await db.ref().update(updates);console.log(JSON.stringify({campaign:event.params.campaignId,kind,success,failure}));
});
