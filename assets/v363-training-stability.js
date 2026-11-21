/* V363 — training-room accuracy, real target knockouts, and consistent trials. */
(()=>{
'use strict';
const BUILD='V363_TRAINING_STABILITY';
const DUMMY='v359_training_target';
const RECORD_KEY='gonggame_v363_training_records_v2';
const PREVIOUS_KEY='gonggame_v362_training_records_v1';
const $=id=>document.getElementById(id);
const num=n=>Number.isFinite(Number(n))?Number(n):0;
const fmt=n=>Math.max(0,num(n)).toLocaleString('ko-KR',{maximumFractionDigits:1});
const clamp=(n,a,b)=>Math.min(b,Math.max(a,num(n)));
const config={style:'fixed',duration:30,armor:1000,session:null,lastRender:0};
const STYLES={fixed:'🎯 고정',moving:'🏃 이동',evade:'🌀 회피',counter:'⚔️ 반격'};
function active(){return !!currentConfig?.v359TrainingRoom&&!!game?.players?.some(p=>p.id===DUMMY)}
function target(){return game?.players?.find(p=>p.id===DUMMY)||null}
function trainee(){return game?.players?.find(p=>p.id!==DUMMY&&!p.isBoss)||null}
function analysis(){return window.__GONG_V359__?.trainingMeasurement?.().row||null}
function rootOf(owner){let p=owner;for(let i=0;i<5&&p;i++){if(p===trainee())return p;p=p.rootOwner||p.owner||p.data?.owner||p.data?.v185SeoProxyOwner}return null}
function validShot(shot){return !!shot&&typeof shot==='object'&&!!rootOf(shot.owner)}
function records(){try{const value=JSON.parse(localStorage.getItem(RECORD_KEY)||'{}');return value&&typeof value==='object'&&!Array.isArray(value)?value:{}}catch(_){return {}}}
function oldRecords(){try{const value=JSON.parse(localStorage.getItem(PREVIOUS_KEY)||'{}');return value&&typeof value==='object'&&!Array.isArray(value)?value:{}}catch(_){return {}}}
function recordKey(){return `${trainee()?.id||'unknown'}|${config.style}|${config.duration}|${config.armor}`}
function legacyKey(){return `${trainee()?.id||'unknown'}|${config.style}|${config.duration}`}
function saveBest(result){
  if(config.duration<=0)return {best:null,newBest:false};
  const saved=records(),key=recordKey(),old=saved[key];
  if(!old||result.damage>num(old.damage)||result.damage===num(old.damage)&&result.dps>num(old.dps)){
    const best={damage:Math.round(result.damage*10)/10,dps:Math.round(result.dps*10)/10,breaks:result.breaks,attempts:result.attempts,contacts:result.contacts,createdAt:new Date().toISOString()};
    saved[key]=best;
    const trimmed=Object.entries(saved).sort((a,b)=>String(b[1]?.createdAt||'').localeCompare(String(a[1]?.createdAt||''))).slice(0,200);
    try{localStorage.setItem(RECORD_KEY,JSON.stringify(Object.fromEntries(trimmed)))}catch(e){console.warn('[V363] 최고기록 저장 실패',e)}
    return {best,newBest:true};
  }
  return {best:old,newBest:false};
}
function addOptions(){
  const modal=$('v359TrainingModal');if(!modal)return false;
  if(modal.dataset.v363Ready)return true;
  modal.dataset.v363Ready='1';
  const options=modal.querySelector('.v359-training-target-options');
  if(options)options.innerHTML=`<label><input type="radio" name="v359TargetMode" value="fixed" checked> 🎯 고정 표적</label>
    <label><input type="radio" name="v359TargetMode" value="moving"> 🏃 이동 표적</label>
    <label><input type="radio" name="v359TargetMode" value="evade"> 🌀 회피 표적</label>
    <label><input type="radio" name="v359TargetMode" value="counter"> ⚔️ 반격 표적</label>`;
  const start=modal.querySelector('.v359-training-start');
  if(start){
    const controls=document.createElement('div');controls.className='v363-config';
    controls.innerHTML=`<strong>⏱ 연습 종류</strong><div class="v363-options">
      <label><input type="radio" name="v363Duration" value="30" checked>30초 도전</label>
      <label><input type="radio" name="v363Duration" value="60">60초 도전</label>
      <label><input type="radio" name="v363Duration" value="0">자유 연습</label></div>
      <label for="v363Armor">🛡 표적 최대 체력</label><select id="v363Armor" aria-label="표적 최대 체력">
      <option value="500">500 HP</option><option value="1000" selected>1,000 HP</option><option value="3000">3,000 HP</option></select>
      <p>표적 HP가 0이 되면 <b>실제 처치 판정</b>을 거친 뒤 다시 등장해. 기록 도전은 시간 종료 시 전투까지 정지해. 표적별 기록은 별도로 저장돼.</p>`;
    start.before(controls);
    start.addEventListener('click',()=>{
      config.style=modal.querySelector('input[name="v359TargetMode"]:checked')?.value||'fixed';
      config.duration=clamp(modal.querySelector('input[name="v363Duration"]:checked')?.value??30,0,60);
      config.armor=clamp($('v363Armor')?.value??1000,500,3000);
    },true);
  }
  moveTrainingLast();return true;
}
function moveTrainingLast(){const hub=$('modeHub'),btn=$('v359TrainingModeBtn');if(hub&&btn&&hub.lastElementChild!==btn)hub.appendChild(btn)}
function updateSkillGuide(){
  if(!DEFS?.[DUMMY])return;
  DEFS[DUMMY].generation=999;
  DEFS[DUMMY].role='훈련장 전용 · 처치/부활, 회피, 반격, 기록 측정';
  DEFS[DUMMY].skills='진짜 격파 · 내구도 도전 · 추적 · 반격 · 실전 기록';
  if(SKILL_INFO?.[DUMMY]){
    Object.assign(SKILL_INFO[DUMMY],{summary:'훈련 전용 표적 · 일반 전투 선택 불가',hp:'500 / 1,000 / 3,000',speed:'고정 / 이동 / 회피'});
    SKILL_INFO[DUMMY].skills=[
      {kind:'훈련',type:'passive',name:'실제 격파와 재등장',desc:'표적의 실제 HP를 깎아 0으로 만들면 처치 판정이 발생하고 표적이 다시 등장한다.',points:['처치 관련 스킬을 시험할 수 있음','승패·XP·경쟁 전적에는 포함되지 않음']},
      {kind:'훈련',type:'passive',name:'추적·회피 훈련',desc:'고정/이동/회피 표적을 선택해 공격할 수 있다.',points:['일반 투사체 접촉률 측정 지원','다른 형태의 공격은 유효 피해 판정으로 구분하여 표시']},
      {kind:'훈련',type:'passive',name:'반격 표적',desc:'3초마다 공격을 시도한다.',points:['12 피해를 정상 방어 엔진으로 판정','훈련 중 쓰러진 캐릭터는 자동 복구']},
      {kind:'훈련',type:'passive',name:'타이머·최고기록',desc:'30초/60초 도전 종료 시 전투 계산이 멈추고 기록이 확정된다.',points:['캐릭터·표적 유형·시간·내구도별로 기록 구분','자유 연습은 기록 제한 없이 계속 진행']}
    ];
  }
}
function ensureHud(){
  let hud=$('v363TrainingHud');if(hud)return hud;
  const base=$('v359TrainingHud');if(!base)return null;
  hud=document.createElement('section');hud.id='v363TrainingHud';hud.className='v363-training-panel';
  hud.innerHTML=`<div class="v363-header"><strong>🎯 실전 훈련 표적</strong><span id="v363Status">훈련 준비</span></div>
    <div class="v363-progress" aria-label="표적 남은 체력"><span id="v363TargetFill"></span></div>
    <div class="v363-grid"><div>남은 HP<b id="v363Remaining">-</b></div><div>실제 격파<b id="v363Breaks">0</b></div><div>유효 피해 판정<b id="v363Hits">0</b></div><div>최대 한 방<b id="v363Max">0</b></div><div>받은 피해<b id="v363Taken">0</b></div><div>기본 투사체 접촉률<b id="v363Accuracy">-</b></div></div>
    <div class="v363-detail" id="v363ShotDetail">기본 투사체 접촉: 0 / 발사: 0 · 그 외 기술은 유효 피해 판정만 집계</div>
    <div class="v363-skills" id="v363Skills">스킬별 피해 분석을 수집하는 중…</div>
    <div class="v363-summary" id="v363Summary">30초 최고기록에 도전해 봐!</div>
    <div class="v363-actions"><button id="v363Restart" type="button">🔁 다시 도전</button><button id="v363Change" type="button">🎯 설정 변경</button></div>`;
  base.insertAdjacentElement('afterend',hud);
  $('v363Restart').addEventListener('click',()=>resetBattle());
  $('v363Change').addEventListener('click',()=>{window.__GONG_V359__?.leaveTraining?.();window.__GONG_V359__?.openTrainingRoom?.()});
  return hud;
}
function skillSnapshot(row){return Object.fromEntries(Object.entries(row?.skills||{}).map(([name,r])=>[name,{damage:num(r?.damage),hits:num(r?.hits)}]))}
function newMeasure(){
  if(!active())return false;
  const r=analysis(),t=target();
  config.session={game,started:num(game.t),baseDamage:num(r?.dealt),baseTaken:num(r?.taken),baseHits:num(r?.hits),baseSkills:skillSnapshot(r),remaining:config.armor,breaks:0,maxHit:0,finished:false,final:null,pendingRespawn:false,counterAt:num(game.t)+3,evadeAt:0,evadeAngle:0,attempts:0,contacts:0,shotAttempts:new WeakSet(),shotContacts:new WeakSet()};
  if(t){t.maxHp=config.armor;t.hp=config.armor;t.alive=true;t.hidden=false;t.data||={};t.data.v359TrainingTarget=true;}
  wrapShotPush();render(true);return true;
}
function wrapShotPush(){
  const s=config.session,arr=game?.shots;if(!active()||!s||s.finished||!Array.isArray(arr)||arr.__v363Wrapped===s)return;
  Object.defineProperty(arr,'__v363Wrapped',{value:s,configurable:true});
  Object.defineProperty(arr,'push',{configurable:true,writable:true,value:function(...shots){
    if(active()&&config.session===s&&!s.finished)for(const shot of shots){if(validShot(shot)&&!s.shotAttempts.has(shot)){s.shotAttempts.add(shot);s.attempts++}}
    return Array.prototype.push.apply(this,shots);
  }});
}
function projectileContact(shot,victim){
  const s=config.session;
  if(!active()||!s||s.finished||victim?.id!==DUMMY||!shot||!validShot(shot))return false;
  if(!s.shotAttempts.has(shot)){s.shotAttempts.add(shot);s.attempts++}
  if(s.shotContacts.has(shot))return false;
  s.shotContacts.add(shot);s.contacts++;return true;
}
function applyMode(){
  const t=target();if(!t)return;
  if(config.style==='evade'){
    currentConfig.v359TargetMovement='moving';t.speed=230;
    const angle=Math.random()*Math.PI*2;t.vx=Math.cos(angle)*230;t.vy=Math.sin(angle)*230;
  }
  if($('modeBadge'))$('modeBadge').textContent=STYLES[config.style]||'훈련 표적';
}
function metrics(at=num(game?.t)){
  const s=config.session,r=analysis();if(!s||!r)return null;
  const elapsed=Math.max(0,at-s.started),time=config.duration?Math.min(elapsed,config.duration):elapsed;
  const damage=Math.max(0,num(r.dealt)-s.baseDamage),taken=Math.max(0,num(r.taken)-s.baseTaken),hits=Math.max(0,num(r.hits)-s.baseHits);
  const skills=Object.entries(r.skills||{}).map(([name,v])=>({name,damage:Math.max(0,num(v?.damage)-num(s.baseSkills[name]?.damage)),hits:Math.max(0,num(v?.hits)-num(s.baseSkills[name]?.hits))})).filter(k=>k.damage>0).sort((a,b)=>b.damage-a.damage).slice(0,5);
  return {elapsed:time,damage,taken,hits,skills,maxHit:s.maxHit,breaks:s.breaks,remaining:s.remaining,attempts:s.attempts,contacts:s.contacts,dps:time>.05?damage/time:0};
}
function finish(){
  const s=config.session;if(!s||s.finished||config.duration<=0)return false;
  const result=metrics(s.started+config.duration);if(!result)return false;
  s.final={...result,...saveBest(result)};s.finished=true;
  // Stop the actual simulation rather than merely freezing a score overlay.
  // No game.over transition -> no win/loss, achievement, or leaderboard write.
  render(true);return true;
}
function render(force=false){
  const s=config.session,hud=ensureHud();if(!s||!hud||(!force&&!active()))return;
  const m=s.finished?s.final:metrics();if(!m)return;
  const set=(id,value)=>{const el=$(id),txt=String(value);if(el&&el.textContent!==txt)el.textContent=txt};
  set('v363Status',s.finished?`🏁 ${config.duration}초 측정 종료`:config.duration?`⏱ ${m.elapsed.toFixed(1)} / ${config.duration}초`:`♾️ 자유 연습 · ${m.elapsed.toFixed(1)}초`);
  const bar=$('v363TargetFill'),percentage=clamp(m.remaining/config.armor*100,0,100);if(bar)bar.style.width=percentage+'%';
  set('v363Remaining',`${fmt(m.remaining)} / ${fmt(config.armor)}`);
  set('v363Breaks',fmt(m.breaks));set('v363Hits',fmt(m.hits));set('v363Max',fmt(m.maxHit));set('v363Taken',fmt(m.taken));
  set('v363Accuracy',m.attempts?`${(100*m.contacts/m.attempts).toFixed(1)}%`:'측정 전');
  set('v363ShotDetail',`기본 투사체 접촉 ${fmt(m.contacts)} / 발사 ${fmt(m.attempts)} · 다른 공격은 유효 피해 판정으로 확인`);
  set('v363Skills',m.skills.length?'⚡ 스킬별 실피해: '+m.skills.map(x=>`${x.name} ${fmt(x.damage)} (${fmt(x.hits)}회)`).join(' · '):'⚡ 아직 피해를 준 스킬이 없어');
  const best=config.duration?records()[recordKey()]:null;
  const legacy=!best&&config.duration?oldRecords()[legacyKey()]:null;
  const hint=legacy?' · 기존 V362 기록은 내구도 구분이 없어 별도 보관':'';
  if(s.finished){set('v363Summary',`${m.newBest?'🏆 새 최고기록!':'✅ 측정 완료'} · 총 피해 ${fmt(m.damage)} · DPS ${fmt(m.dps)} · 격파 ${fmt(m.breaks)}회 · 결과 확정 (다시 도전 버튼으로 재시작)`)}
  else if(config.duration){set('v363Summary',`📊 현재 피해 ${fmt(m.damage)} · DPS ${fmt(m.dps)} · 이번 조건 최고 ${fmt(best?.damage||0)}${hint}`)}
  else set('v363Summary',`♾ 자유 연습 · 누적 피해 ${fmt(m.damage)} · DPS ${fmt(m.dps)} · 실제 격파 ${fmt(m.breaks)}회`);
}
function reviveIfNeeded(){
  const s=config.session,t=target();if(!s||!t)return;
  // V359 resets target HP each frame; restore real remaining HP after its tick.
  t.maxHp=config.armor;
  if(s.pendingRespawn){
    s.pendingRespawn=false;s.remaining=config.armor;
    t.alive=true;t.hidden=false;t.hp=config.armor;t.eliminationOrder=null;t.eliminationTime=null;
    t.frozen=0;t.strongSlow=0;t.weakSlow=0;t.hitFlash=.12;
    try{floater(t.x,t.y-t.r-22,'🎯 표적 부활',t.color||'#0891b2',14,.65)}catch(_){ }
  }else{t.alive=true;t.hidden=false;t.hp=clamp(s.remaining,0,config.armor)}
}
function evade(){
  const s=config.session,t=target(),p=trainee();if(!s||!t||!p)return;
  if(num(game.t)>=s.evadeAt){const away=Math.atan2(t.y-p.y,t.x-p.x);s.evadeAngle=away+(Math.random()-.5)*Math.PI*1.2;s.evadeAt=num(game.t)+1.8}
  const dx=t.x<75?1:t.x>W-75?-1:Math.cos(s.evadeAngle),dy=t.y<75?1:t.y>H-75?-1:Math.sin(s.evadeAngle);
  const magnitude=Math.hypot(dx,dy)||1;t.speed=230;t.vx=dx/magnitude*230;t.vy=dy/magnitude*230;
}
function counter(){
  const s=config.session,p=trainee(),t=target();if(!s||!p?.alive||!t?.alive||num(game.t)<s.counterAt)return;
  s.counterAt=num(game.t)+3;
  const probe={id:'v363_training_probe',name:'훈련 표적',team:t.team,alive:true,hidden:false,isBoss:false,
    x:t.x,y:t.y,r:t.r,color:'#e11d48',data:{},cool:{},frozen:0,attackPenaltyMult:1,damageDealt:0,kills:0};
  try{damage(p,12,probe,'훈련 표적 반격',{v363Training:true})}catch(error){console.warn('[V363] 훈련 반격 판정 실패',error)}
}
function configure(){if(!active())return false;ensureHud();applyMode();return newMeasure()}
const previousReset=resetBattle;
resetBattle=function v363ResetBattle(){const out=previousReset.apply(this,arguments);config.session=null;if(active())configure();return out};
const previousTick=tick;
tick=function v363Tick(dt){
  if(!active())return previousTick.apply(this,arguments);
  if(!config.session||config.session.game!==game)configure();
  const s=config.session;if(!s||s.finished)return;
  wrapShotPush();
  let safeDt=Math.max(0,num(dt));
  if(config.duration) safeDt=Math.min(safeDt,Math.max(0,config.duration-(num(game.t)-s.started)));
  const out=previousTick.call(this,safeDt);
  if(!active()||config.session!==s)return out;
  reviveIfNeeded();wrapShotPush();
  if(config.style==='evade')evade();
  if(config.style==='counter')counter();
  if(config.duration&&num(game.t)-s.started>=config.duration-1e-7)finish();
  if(performance.now()-config.lastRender>300){config.lastRender=performance.now();render()}
  return out;
};
const previousDamage=damage;
damage=function v363Damage(targetPlayer,amount,source,skill,opts){
  const s=config.session;
  if(active()&&s?.finished&&s.game===game)return 0;
  const measuring=active()&&s&&!s.finished&&s.game===game&&targetPlayer?.id===DUMMY&&!!rootOf(source);
  if(measuring){targetPlayer.maxHp=config.armor;targetPlayer.hp=s.remaining;}
  const dealt=previousDamage.apply(this,arguments);
  if(measuring&&Number(dealt)>0){
    s.maxHit=Math.max(s.maxHit,num(dealt));s.remaining=Math.max(0,num(targetPlayer.hp));
    if(!targetPlayer.alive||s.remaining<=0){s.breaks++;s.pendingRespawn=true;s.remaining=0}
  }
  return dealt;
};
document.addEventListener('click',event=>{
  const action=event.target?.closest?.('[data-v359-training-action]')?.dataset.v359TrainingAction;
  if(action==='clear'&&active()){
    // Original V359 click handler already resets its baseline.
    if(config.duration)resetBattle();else newMeasure();
  }
  if(event.target?.closest?.('#v359TrainingModeBtn'))setTimeout(()=>{addOptions();moveTrainingLast()},0);
});
let tried=0;
function init(){
  updateSkillGuide();addOptions();moveTrainingLast();
  if(!$('v359TrainingModal')&&tried++<25)setTimeout(init,100);
  window.__GONG_PATCH_NOTES__?.register?.('V363','훈련 표적 실제 처치·부활 · 30/60초 전투 자동 정지 · 기본 투사체 명중률 · 내구도별 최고기록 · 훈련장 목록 맨 아래');
}
const api={build:BUILD,records,metrics,projectileContact,reset:()=>resetBattle(),state:()=>({active:active(),style:config.style,duration:config.duration,armor:config.armor,finished:!!config.session?.finished,breaks:config.session?.breaks||0,remaining:config.session?.remaining||0}),verify:()=>({build:BUILD,trainingLast:$('modeHub')?.lastElementChild?.id==='v359TrainingModeBtn',modalOptions:$('v359TrainingModal')?.querySelectorAll('input[name="v359TargetMode"]').length||0,uiPresent:!!$('v363TrainingHud'),v359Available:!!window.__GONG_V359__,recordKey:recordKey()})};
window.__GONG_V363__=api;
window.__GONG_V362__={...api,state:api.state,measure:metrics,startMeasure:newMeasure};
window.__GONG_V363_BUILD__=BUILD;window.__GONG_LATEST_BUILD__=BUILD;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
console.info('[V363] 훈련장 격파/명중률/기록 정합성 안정화');
})();
