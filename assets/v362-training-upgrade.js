/* V362 · useful training targets, timed benchmarks and personal bests. */
(()=>{
'use strict';
const BUILD='V362_TRAINING_TARGET_LAB';
const DUMMY='v359_training_target';
const RECORD_KEY='gonggame_v362_training_records_v1';
const byId=id=>document.getElementById(id);
const format=n=>Math.max(0,Number(n)||0).toLocaleString('ko-KR',{maximumFractionDigits:1});
const clamp=(n,min,max)=>Math.max(min,Math.min(max,Number(n)||min));
const state={style:'fixed',duration:30,armor:1000,session:null,statsAt:0};
let retryAt=0;
function current(){return !!currentConfig?.v359TrainingRoom&&!!game?.players?.some(p=>p.id===DUMMY)}
function roster(){return game?.players?.find(p=>p.id!==DUMMY&&!p.isBoss)}
function target(){return game?.players?.find(p=>p.id===DUMMY)}
function row(){return window.__GONG_V359__?.trainingMeasurement?.().row||null}
function reads(){try{const data=JSON.parse(localStorage.getItem(RECORD_KEY)||'{}');return data&&typeof data==='object'&&!Array.isArray(data)?data:{}}catch(_){return {}}}
function key(){return `${roster()?.id||'unknown'}|${state.style}|${state.duration}`}
function saveBest(result){
  if(!Number.isFinite(state.duration)||state.duration<=0)return null;
  const records=reads(),k=key(),old=records[k]||null;
  if(!old||result.damage>Number(old.damage)||result.damage===Number(old.damage)&&result.dps>Number(old.dps)){
    records[k]={damage:Math.round(result.damage*10)/10,dps:Math.round(result.dps*10)/10,streak:result.breaks,createdAt:new Date().toISOString()};
    const sorted=Object.entries(records).sort((a,b)=>String(b[1]?.createdAt||'').localeCompare(String(a[1]?.createdAt||''))).slice(0,150);
    try{localStorage.setItem(RECORD_KEY,JSON.stringify(Object.fromEntries(sorted)))}catch(_){}
    return {best:records[k],newBest:true};
  }
  return {best:old,newBest:false};
}
function addOptions(){
  const modal=byId('v359TrainingModal');
  if(!modal||modal.dataset.v362Setup)return !!modal;
  modal.dataset.v362Setup='1';
  const targets=modal.querySelector('.v359-training-target-options');
  if(targets)targets.innerHTML=`
    <label><input type="radio" name="v359TargetMode" value="fixed" checked> 🎯 고정 표적</label>
    <label><input type="radio" name="v359TargetMode" value="moving"> 🏃 이동 표적</label>
    <label><input type="radio" name="v359TargetMode" value="evade"> 🌀 회피 표적</label>
    <label><input type="radio" name="v359TargetMode" value="counter"> ⚔️ 반격 표적</label>`;
  const start=modal.querySelector('.v359-training-start');
  if(start){
    const controls=document.createElement('div');
    controls.className='v362-config';
    controls.innerHTML=`<div class="v362-config-title">⏱ 기록 도전 시간</div>
      <div class="v362-options"><label><input type="radio" name="v362Duration" value="30" checked>30초</label><label><input type="radio" name="v362Duration" value="60">60초</label><label><input type="radio" name="v362Duration" value="0">자유 연습</label></div>
      <label for="v362Armor">🛡 표적 내구도</label><select id="v362Armor" aria-label="표적 내구도"><option value="500">500 HP</option><option value="1000" selected>1,000 HP</option><option value="3000">3,000 HP</option></select>
      <p class="v362-config-help">표적의 내구도를 깎아 격파 횟수를 기록해. 회피형은 빠르게 방향을 바꾸고, 반격형은 3초마다 실제 공격 판정으로 반격해. 보상·전적은 기록되지 않아.</p>`;
    start.before(controls);
    start.addEventListener('click',()=>{
      state.style=modal.querySelector('input[name="v359TargetMode"]:checked')?.value||'fixed';
      state.duration=clamp(modal.querySelector('input[name="v362Duration"]:checked')?.value??30,0,60);
      state.armor=clamp(byId('v362Armor')?.value??1000,100,10000);
    },true);
  }
  // Training is an optional utility, so the mode card belongs at the very end.
  moveToBottom();
  return true;
}
function moveToBottom(){const hub=byId('modeHub'),btn=byId('v359TrainingModeBtn');if(hub&&btn&&hub.lastElementChild!==btn)hub.appendChild(btn)}
function ensureHud(){
  let hud=byId('v362TrainingHud');if(hud)return hud;
  const base=byId('v359TrainingHud');if(!base)return null;
  hud=document.createElement('section');hud.id='v362TrainingHud';hud.className='v362-training-lab';
  hud.innerHTML=`<div class="v362-lab-top"><strong>🎯 표적 훈련 실험실</strong><span id="v362ChallengeStatus">준비 중</span></div>
    <div class="v362-target-bar"><div id="v362TargetFill"></div></div>
    <div class="v362-data-grid"><div>남은 내구도<b id="v362Remaining">-</b></div><div>격파 횟수<b id="v362Breaks">0</b></div><div>유효 타격<b id="v362Hits">0</b></div><div>최대 한 방<b id="v362MaxHit">0</b></div><div>받은 피해<b id="v362Taken">0</b></div></div>
    <div class="v362-best" id="v362Best">30초 기록에 도전해 봐!</div>
    <div class="v362-skills" id="v362Skills">스킬별 피해를 수집하는 중…</div>
    <div class="v362-lab-actions"><button type="button" id="v362Retry">🔁 기록 다시 도전</button><button type="button" id="v362ChangeTarget">🎯 표적 변경</button></div>`;
  base.insertAdjacentElement('afterend',hud);
  hud.querySelector('#v362Retry').addEventListener('click',()=>resetBattle());
  hud.querySelector('#v362ChangeTarget').addEventListener('click',()=>{window.__GONG_V359__?.leaveTraining?.();window.__GONG_V359__?.openTrainingRoom?.()});
  return hud;
}
function snapshotSkills(r){return Object.fromEntries(Object.entries(r?.skills||{}).map(([name,v])=>[name,Number(v.damage)||0]))}
function startMeasure(){
  if(!current())return false;
  const r=row();
  state.session={game,started:Number(game.t)||0,damage:Number(r?.dealt)||0,taken:Number(r?.taken)||0,hits:Number(r?.hits)||0,skills:snapshotSkills(r),maxHit:0,breaks:0,finished:false,result:null,counterAt:Number(game.t)+3,evadeAt:0,evadeAngle:0};
  render();return true;
}
function applyTargetMode(){
  const t=target();if(!t)return;
  if(state.style==='evade'){
    currentConfig.v359TargetMovement='moving';
    t.speed=230;
    const angle=Math.random()*Math.PI*2;t.vx=Math.cos(angle)*230;t.vy=Math.sin(angle)*230;
  }
  byId('modeBadge')&&(byId('modeBadge').textContent=({fixed:'고정 표적',moving:'이동 표적',evade:'회피 표적',counter:'반격 표적'})[state.style]);
}
function calc(now=Number(game?.t)||0){
  const s=state.session,r=row();if(!s||!r)return null;
  const elapsed=Math.max(0,now-s.started),time=state.duration?Math.min(elapsed,state.duration):elapsed;
  const damage=Math.max(0,(Number(r.dealt)||0)-s.damage);
  const hits=Math.max(0,(Number(r.hits)||0)-s.hits);
  const taken=Math.max(0,(Number(r.taken)||0)-s.taken);
  const skills=Object.entries(r.skills||{}).map(([name,v])=>({name,damage:Math.max(0,(Number(v.damage)||0)-(s.skills[name]||0))})).filter(x=>x.damage>0).sort((a,b)=>b.damage-a.damage).slice(0,4);
  const breaks=Math.floor(damage/state.armor),remaining=state.armor-(damage%state.armor);
  return {elapsed:time,damage,hits,taken,skills,breaks,remaining,dps:time>0.05?damage/time:0,maxHit:s.maxHit};
}
function finish(){
  const s=state.session;if(!s||s.finished)return;
  const result=calc(s.started+state.duration);if(!result)return;
  s.finished=true;
  const saved=saveBest(result);
  s.result={...result,...saved};
  render();
}
function render(){
  const hud=ensureHud(),s=state.session;if(!hud||!s)return;
  const m=s.finished?s.result:calc();if(!m)return;
  const set=(id,value)=>{const el=byId(id);if(el)el.textContent=String(value)};
  const label=state.duration?`${Math.min(m.elapsed,state.duration).toFixed(1)} / ${state.duration}초`:`${m.elapsed.toFixed(1)}초 · 자유 연습`;
  set('v362ChallengeStatus',s.finished?`✅ ${state.duration}초 측정 완료`:label);
  const fill=byId('v362TargetFill');if(fill)fill.style.width=`${100*m.remaining/state.armor}%`;
  set('v362Remaining',`${format(m.remaining)} / ${format(state.armor)}`);
  set('v362Breaks',format(m.breaks));set('v362Hits',format(m.hits));set('v362MaxHit',format(m.maxHit));set('v362Taken',format(m.taken));
  const skillText=m.skills.length?m.skills.map(({name,damage})=>`${name} ${format(damage)}`).join(' · '):'아직 적중한 스킬이 없어';
  set('v362Skills',`⚡ 스킬별 피해: ${skillText}`);
  const previous=state.duration?reads()[key()]:null;
  set('v362Best',s.finished?`${m.newBest?'🏆 새로운 최고기록!':'🎉 측정 완료'} · 피해 ${format(m.damage)} · DPS ${format(m.dps)} · 격파 ${format(m.breaks)}회`:
    state.duration?`📌 목표 ${state.duration}초 · 피해 ${format(m.damage)} · DPS ${format(m.dps)} · 최고 ${format(previous?.damage||0)}`:
      `📌 누적 피해 ${format(m.damage)} · DPS ${format(m.dps)} · 표적 격파 ${format(m.breaks)}회`);
}
function configure(){
  if(!current())return;
  ensureHud();applyTargetMode();startMeasure();
}
function evade(dt){
  const s=state.session,t=target(),p=roster();if(!s||!t||!p)return;
  if(s.evadeAt<=Number(game.t)){
    const away=Math.atan2(t.y-p.y,t.x-p.x),offset=(Math.random()-.5)*Math.PI*1.2;
    s.evadeAngle=away+offset;s.evadeAt=Number(game.t)+1.8;
  }
  const angle=s.evadeAngle;
  const x=t.x<75?1:t.x>W-75?-1:Math.cos(angle),y=t.y<75?1:t.y>H-75?-1:Math.sin(angle);
  const norm=Math.hypot(x,y)||1;t.speed=230;t.vx=x/norm*230;t.vy=y/norm*230;
}
function counterStrike(){
  const s=state.session,p=roster(),t=target();if(!s||!p?.alive||!t?.alive)return;
  if(Number(game.t)<s.counterAt)return;
  s.counterAt=Number(game.t)+3;
  // A virtual source uses the regular damage engine, so real defensive
  // and damage-reduction passives are tested, without enabling normal dummy attacks.
  const probe={id:'v362_training_probe',name:'훈련 표적',team:t.team,alive:true,hidden:false,isBoss:false,
    x:t.x,y:t.y,r:t.r,color:'#e11d48',data:{},cool:{},frozen:0,attackPenaltyMult:1,damageDealt:0,kills:0};
  try{damage(p,12,probe,'훈련 표적 반격',{v362Training:true})}catch(err){console.warn('[V362 target probe]',err)}
}
const priorReset=resetBattle;
resetBattle=function v362ResetBattle(){
  const result=priorReset.apply(this,arguments);
  state.session=null;
  if(current())configure();
  return result;
};
const priorTick=tick;
tick=function v362Tick(dt){
  const result=priorTick.apply(this,arguments);
  if(!current())return result;
  if(!state.session||state.session.game!==game)configure();
  if(!state.session?.finished){
    if(state.style==='evade')evade(dt);
    if(state.style==='counter')counterStrike();
    if(state.duration&&Number(game.t)-state.session.started>=state.duration)finish();
  }
  if(performance.now()-state.statsAt>175){state.statsAt=performance.now();render()}
  return result;
};
const priorDamage=damage;
damage=function v362TrainingDamage(targetPlayer,amount,source,skill,opts){
  const dealt=priorDamage.apply(this,arguments);
  const s=state.session;
  if(current()&&s&&!s.finished&&targetPlayer?.id===DUMMY&&source?.id!==DUMMY&&source?.id!=='arena'&&dealt>0){
    s.maxHit=Math.max(s.maxHit,dealt);
  }
  return dealt;
};
document.addEventListener('click',event=>{
  const action=event.target?.closest?.('[data-v359-training-action]')?.dataset.v359TrainingAction;
  if(action==='clear'&&current()){if(state.duration)resetBattle();else startMeasure();}
  const button=event.target?.closest?.('#v359TrainingModeBtn');if(button)setTimeout(()=>{addOptions();moveToBottom()},0);
});
function init(){
  addOptions();moveToBottom();
  if(!byId('v359TrainingModal')&&Date.now()>retryAt){retryAt=Date.now()+100;setTimeout(init,100)}
  window.__GONG_PATCH_NOTES__?.register?.('V362','훈련장 맨 아래 배치 · 고정/이동/회피/반격 표적 · 30/60초 측정 · 내구도 격파 · 스킬 피해 분석 · 개인 최고기록');
}
window.__GONG_V362__={build:BUILD,state:()=>({style:state.style,duration:state.duration,armor:state.armor,active:current(),session:!!state.session,finished:!!state.session?.finished}),records:reads,measure:calc,startMeasure,verify:()=>({build:BUILD,trainingLast:byId('modeHub')?.lastElementChild?.id==='v359TrainingModeBtn',modalOptions:byId('v359TrainingModal')?.querySelectorAll('input[name="v359TargetMode"]').length||0,uiPresent:!!byId('v362TrainingHud'),v359Available:!!window.__GONG_V359__})};
window.__GONG_V362_BUILD__=BUILD;
window.__GONG_LATEST_BUILD__=BUILD;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
console.info('[V362] 표적 훈련 실험실');
})();
