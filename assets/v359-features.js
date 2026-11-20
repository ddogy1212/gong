/* V359 · tutorial, training room, battle analysis, online/save recovery */
(()=>{
'use strict';
const BUILD='V359_TUTORIAL_TRAINING_ANALYSIS_STABILITY_FAST_ENTRY';
const DUMMY_ID='v359_training_target';
const ANALYSIS_KEY='gonggame_v359_battle_analysis_v1';
const TUTORIAL_KEY='gonggame_v359_tutorial_steps_v1';
const ROOM_KEY='gonggame_v234_friendly_room_session';
const BACKUP_CURRENT='gonggame_v359_progress_backup_current';
const BACKUP_PREVIOUS='gonggame_v359_progress_backup_previous';
const $v359=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const num=value=>Number.isFinite(Number(value))?Number(value):0;
const one=value=>num(value).toLocaleString('ko-KR',{maximumFractionDigits:1});
const readJson=(key,fallback=null)=>{try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback}catch(_){return fallback}};
const writeJson=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));return true}catch(_){return false}};
const hashText=text=>{let hash=2166136261;for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619)}return (hash>>>0).toString(36)};

/* Hidden target definition: BOSS_IDS keeps it out of normal character lists. */
DEFS[DUMMY_ID]={id:DUMMY_ID,name:'훈련 표적',generation:0,color:'#ff5d73',hp:1000000000,speed:0,img:'assets/v359-training-target.svg',role:'훈련장 전용 무한 체력 표적',skills:'공격하지 않는 훈련 표적'};
SKILL_INFO[DUMMY_ID]={summary:'훈련장 전용 표적',hp:'무한',speed:'고정/이동 선택',skills:[{kind:'훈련장 전용',type:'passive',name:'안전 표적',desc:'플레이어를 공격하지 않고 받은 피해만 기록한다.',points:['일반 모드 선택 목록에는 표시되지 않음','훈련 통계 초기화 가능']}]};
BOSS_IDS.add(DUMMY_ID);

function blankAnalysis(){return {version:1,startedAt:Date.now(),players:{},totalDamage:0,totalHits:0,totalWalls:0,saved:false}}
function analysisRow(player){
  if(!game?.v359Analysis||!player)return null;
  const key=String(player.data?.v174Uid||player.data?.v191Uid||player.data?.v151Uid||player.id||player.name||'unknown');
  return game.v359Analysis.players[key]||=( {id:String(player.id||key),name:String(player.name||DEFS[player.id]?.name||key),color:String(player.color||DEFS[player.id]?.color||'#64748b'),dealt:0,taken:0,hits:0,walls:0,biggest:0,skills:{}} );
}
function analysisOwner(source){
  if(!source||!game?.players)return null;
  const queue=[source],seen=new Set();
  while(queue.length){
    const item=queue.shift();if(!item||typeof item!=='object'||seen.has(item))continue;seen.add(item);
    const exact=game.players.find(p=>p===item);if(exact)return exact;
    for(const next of [item.rootOwner,item.owner,item.source,item.caster,item.data?.v185SeoProxyOwner,item.data?.owner,item.owner?.rootOwner])if(next)queue.push(next);
  }
  const id=String(source.baseId||source.id||'');
  return game.players.find(p=>String(p.id)===id)||null;
}
function topSkill(row){
  return Object.entries(row?.skills||{}).sort((a,b)=>num(b[1].damage)-num(a[1].damage)||num(b[1].hits)-num(a[1].hits))[0]||['공격',{damage:0,hits:0}];
}

const previousDamageV359=damage;
damage=function v359MeasuredDamage(target,amount,source,skill='공격',opts={}){
  const sourcePlayer=analysisOwner(source);
  if(currentConfig?.v359TrainingRoom&&(source?.id===DUMMY_ID||sourcePlayer?.id===DUMMY_ID))return 0;
  const actual=previousDamageV359.apply(this,arguments);
  if(actual>0&&game?.v359Analysis){
    const attacker=sourcePlayer||analysisOwner(source),attackRow=analysisRow(attacker),targetRow=analysisRow(target),label=String(skill||opts?.reason||'공격').replace(/\s+/g,' ').trim().slice(0,52)||'공격';
    if(attackRow){const row=attackRow.skills[label]||=( {damage:0,hits:0} );row.damage+=actual;row.hits++;attackRow.dealt+=actual;attackRow.hits++;attackRow.biggest=Math.max(attackRow.biggest,actual)}
    if(targetRow)targetRow.taken+=actual;
    game.v359Analysis.totalDamage+=actual;game.v359Analysis.totalHits++;
  }
  return actual;
};

const previousWallHitV359=onWallHit;
onWallHit=function v359MeasuredWallHit(player){const row=analysisRow(player);if(row){row.walls++;game.v359Analysis.totalWalls++}return previousWallHitV359.apply(this,arguments)};

function configureTrainingBattle(){
  if(!game||!currentConfig?.v359TrainingRoom)return false;
  document.body.classList.add('v359-training-battle');
  game.timeLeft=3599;
  const target=game.players.find(p=>p.id===DUMMY_ID),trainee=game.players.find(p=>p.id!==DUMMY_ID);
  if(target){target.maxHp=1000000000;target.hp=target.maxHp;target.alive=true;target.r=48;target.x=W*.68;target.y=H*.5;target.data.v359TrainingTarget=true;if(currentConfig.v359TargetMovement==='moving'){target.speed=130;normalizeSpeed(target,130)}else{target.speed=0;target.vx=0;target.vy=0}}
  if(trainee){trainee.x=W*.25;trainee.y=H*.5;normalizeSpeed(trainee,normalSpeed(trainee))}
  game.v359TrainingBaseline={time:game.t,damage:analysisRow(trainee)?.dealt||0,walls:analysisRow(trainee)?.walls||0};
  $v359('battleTitle').textContent=`🧪 훈련장 · ${trainee?.name||'캐릭터'}`;
  $v359('modeBadge').textContent=currentConfig.v359TargetMovement==='moving'?'이동 표적':'고정 표적';
  ensureTrainingHud();updateTrainingHud(true);return true;
}

const previousResetV359=resetBattle;
resetBattle=function v359ResetBattle(){
  const result=previousResetV359.apply(this,arguments);
  if(game)game.v359Analysis=blankAnalysis();
  if(currentConfig?.v359TrainingRoom)configureTrainingBattle();else document.body.classList.remove('v359-training-battle');
  if(currentConfig?.tutorial)setTimeout(startTutorialCoach,350);else hideTutorialCoach();
  return result;
};

const previousCheckEndV359=checkEnd;
checkEnd=function v359CheckEnd(){if(currentConfig?.v359TrainingRoom)return false;return previousCheckEndV359.apply(this,arguments)};

let trainingHudAt=0;
const previousTickV359=tick;
tick=function v359Tick(dt){
  if(currentConfig?.v359TrainingRoom&&game){game.timeLeft=Math.max(game.timeLeft,3598);game.over=false}
  const result=previousTickV359.apply(this,arguments);
  if(currentConfig?.v359TrainingRoom&&game){
    game.over=false;game.timeLeft=3599;
    const target=game.players.find(p=>p.id===DUMMY_ID),trainee=game.players.find(p=>p.id!==DUMMY_ID);
    if(target){target.alive=true;target.hidden=false;target.hp=target.maxHp;if(currentConfig.v359TargetMovement==='moving'){if(Math.hypot(target.vx,target.vy)<50)normalizeSpeed(target,130)}else{target.x=W*.68;target.y=H*.5;target.vx=0;target.vy=0;target.frozen=Math.max(target.frozen||0,.08)}}
    if(trainee&&!trainee.alive){trainee.alive=true;trainee.hidden=false;trainee.hp=trainee.maxHp;trainee.eliminationOrder=null;trainee.eliminationTime=null;normalizeSpeed(trainee,normalSpeed(trainee))}
    if(performance.now()-trainingHudAt>220){trainingHudAt=performance.now();updateTrainingHud()}
  }
  return result;
};

function ensureTrainingHud(){
  let hud=$v359('v359TrainingHud');if(hud)return hud;
  hud=document.createElement('section');hud.id='v359TrainingHud';hud.className='v359-training-hud';
  hud.innerHTML='<div class="v359-training-stats"><div class="v359-training-stat">시간<b data-v359-train="time">0.0초</b></div><div class="v359-training-stat">총 피해<b data-v359-train="damage">0</b></div><div class="v359-training-stat">DPS<b data-v359-train="dps">0</b></div><div class="v359-training-stat">벽 충돌<b data-v359-train="walls">0</b></div><div class="v359-training-stat">주력 스킬<b data-v359-train="skill">-</b></div></div><div class="v359-training-controls"><button type="button" data-v359-training-action="clear">측정 초기화</button><button type="button" data-v359-training-action="heal">체력 회복</button><button type="button" data-v359-training-action="restart">처음부터</button><button type="button" data-v359-training-action="change">캐릭터 변경</button></div>';
  $v359('battle')?.querySelector('.battle-head')?.insertAdjacentElement('afterend',hud);
  hud.addEventListener('click',event=>{const action=event.target.closest('[data-v359-training-action]')?.dataset.v359TrainingAction;if(!action)return;if(action==='clear')resetTrainingMeasurement();if(action==='heal')healTrainingCharacter();if(action==='restart')resetBattle();if(action==='change'){leaveTraining();openTrainingRoom()}});
  return hud;
}
function trainingMeasurement(){
  const trainee=game?.players?.find(p=>p.id!==DUMMY_ID),row=analysisRow(trainee),base=game?.v359TrainingBaseline||{time:0,damage:0,walls:0},time=Math.max(0,num(game?.t)-num(base.time)),damage=Math.max(0,num(row?.dealt)-num(base.damage)),walls=Math.max(0,num(row?.walls)-num(base.walls)),skill=topSkill(row);
  return {trainee,row,time,damage,dps:time>.05?damage/time:0,walls,skill:skill[0],skillDamage:num(skill[1]?.damage)};
}
function updateTrainingHud(force=false){const hud=ensureTrainingHud();if(!hud||(!force&&!currentConfig?.v359TrainingRoom))return;const m=trainingMeasurement(),set=(key,value)=>{const node=hud.querySelector(`[data-v359-train="${key}"]`);if(node)node.textContent=value};set('time',`${m.time.toFixed(1)}초`);set('damage',one(m.damage));set('dps',one(m.dps));set('walls',String(m.walls));set('skill',m.skill||'-')}
function resetTrainingMeasurement(){if(!game)return false;const trainee=game.players.find(p=>p.id!==DUMMY_ID),row=analysisRow(trainee);game.v359TrainingBaseline={time:game.t,damage:row?.dealt||0,walls:row?.walls||0};updateTrainingHud(true);return true}
function healTrainingCharacter(){const trainee=game?.players?.find(p=>p.id!==DUMMY_ID);if(!trainee)return false;trainee.alive=true;trainee.hidden=false;trainee.hp=trainee.maxHp;return true}

function trainingCharacterIds(){return orderedCharacterIds().filter(id=>id!==DUMMY_ID&&DEFS[id]&&!BOSS_IDS.has(id))}
function ensureTrainingModal(){
  let modal=$v359('v359TrainingModal');if(modal)return modal;
  modal=document.createElement('div');modal.id='v359TrainingModal';modal.className='v359-modal hidden';modal.setAttribute('aria-hidden','true');
  const ids=trainingCharacterIds();
  modal.innerHTML=`<section class="v359-modal-card" role="dialog" aria-modal="true" aria-labelledby="v359TrainingTitle"><header class="v359-modal-head"><div><h2 id="v359TrainingTitle">🧪 훈련장</h2><p>승패·티어·숙련도 보상 없이 캐릭터의 피해량, DPS, 벽 충돌과 스킬별 피해를 확인해.</p></div><button type="button" class="v359-modal-close" aria-label="닫기">×</button></header><div class="v359-training-form"><label for="v359TrainingSearch">연습할 캐릭터</label><input id="v359TrainingSearch" class="v359-training-search" type="search" autocomplete="off" placeholder="이름 검색"><select id="v359TrainingSelect" class="v359-training-select" size="9">${ids.map(id=>`<option value="${esc(id)}">${esc(DEFS[id].name||id)} · HP ${one(DEFS[id].hp)}</option>`).join('')}</select><div class="v359-training-target-options"><label><input type="radio" name="v359TargetMode" value="fixed" checked> 고정 표적</label><label><input type="radio" name="v359TargetMode" value="moving"> 느린 이동 표적</label></div><button type="button" class="v359-training-start">선택 캐릭터로 측정 시작</button><div class="v359-training-help">훈련장에서는 표적이 공격하지 않고 전투도 끝나지 않아. 측정 초기화는 캐릭터 상태를 유지한 채 통계 기준점만 새로 잡아.</div></div></section>`;
  document.body.appendChild(modal);
  const select=$v359('v359TrainingSelect');if(select?.options.length)select.selectedIndex=0;
  $v359('v359TrainingSearch')?.addEventListener('input',event=>{const query=event.target.value.trim().toLocaleLowerCase('ko-KR');for(const option of select.options)option.hidden=!!query&&!option.textContent.toLocaleLowerCase('ko-KR').includes(query);const first=[...select.options].find(option=>!option.hidden);if(first)select.value=first.value});
  modal.querySelector('.v359-modal-close').addEventListener('click',closeTrainingRoom);modal.addEventListener('click',event=>{if(event.target===modal)closeTrainingRoom()});modal.querySelector('.v359-training-start').addEventListener('click',()=>startTrainingBattle(select.value,modal.querySelector('input[name="v359TargetMode"]:checked')?.value||'fixed'));
  return modal;
}
function openTrainingRoom(){const modal=ensureTrainingModal();modal.classList.remove('hidden');modal.setAttribute('aria-hidden','false');setTimeout(()=>$v359('v359TrainingSearch')?.focus(),60);return true}
function closeTrainingRoom(){const modal=$v359('v359TrainingModal');modal?.classList.add('hidden');modal?.setAttribute('aria-hidden','true')}
function startTrainingBattle(id,movement='fixed'){
  if(!DEFS[id]||BOSS_IDS.has(id))return false;closeTrainingRoom();currentConfig={mode:'showdown',participants:[id,DUMMY_ID],teams:{[id]:'trainee',[DUMMY_ID]:'target'},zoneNames:{trainee:'연습 캐릭터',target:'훈련 표적'},v359TrainingRoom:true,v359TargetMovement:movement};mode='showdown';paused=false;last=0;$v359('pause').textContent='일시정지';$v359('setup').classList.add('hidden');$v359('draftScreen')?.classList.add('hidden');$v359('tournamentScreen')?.classList.add('hidden');$v359('battle').classList.remove('hidden');resize();resetBattle();return true
}
function leaveTraining(){if(!currentConfig?.v359TrainingRoom)return false;document.body.classList.remove('v359-training-battle');$v359('back')?.click();return true}

/* Interactive layer on top of the existing rewarded V247 tutorial battle. */
let tutorialStep=-1;
const tutorialSteps=[
  {title:'자동전투 화면 익히기',copy:'캐릭터는 자동으로 움직여. 아래 버튼으로 전투를 멈추거나 배속을 바꾸면서 흐름을 확인할 수 있어.',action:'next',button:'직접 조작해 보기'},
  {title:'전투를 잠깐 멈춰 봐',copy:'아래의 “일시정지” 버튼을 눌러. 스킬 설명이나 체력 상황을 차분히 확인할 때 유용해.',target:'#pause',expect:'pause'},
  {title:'다시 이어서 보기',copy:'같은 버튼을 한 번 더 눌러 전투를 계속 진행해.',target:'#pause',expect:'resume'},
  {title:'2배속으로 빠르게 보기',copy:'전투 배속에서 2배속을 눌러 전개를 빠르게 확인해.',target:'.speed-btn[data-speed="2"]',expect:'speed2'},
  {title:'기본 속도로 돌아오기',copy:'1배속을 눌러 원래 속도로 돌아오면 기본 조작 연습이 완료돼.',target:'.speed-btn[data-speed="1"]',expect:'speed1'}
];
function ensureTutorialCoach(){let node=$v359('v359TutorialCoach');if(node)return node;node=document.createElement('aside');node.id='v359TutorialCoach';node.className='v359-coach hidden';document.body.appendChild(node);node.addEventListener('click',event=>{if(event.target.closest('.v359-coach-skip'))finishTutorialCoach(false);if(event.target.closest('[data-v359-coach-next]'))showTutorialStep(tutorialStep+1)});return node}
function clearTutorialFocus(){document.querySelectorAll('.v359-tutorial-focus').forEach(node=>node.classList.remove('v359-tutorial-focus'))}
function showTutorialStep(index){
  clearTutorialFocus();if(index>=tutorialSteps.length){finishTutorialCoach(true);return}tutorialStep=index;const row=tutorialSteps[index],coach=ensureTutorialCoach();coach.classList.remove('hidden');coach.innerHTML=`<div class="v359-coach-step">초보자 튜토리얼 · ${index+1}/${tutorialSteps.length}</div><strong>${esc(row.title)}</strong><p>${esc(row.copy)}</p><div class="v359-coach-actions"><button type="button" class="v359-coach-skip">안내 숨기기</button>${row.action==='next'?`<button type="button" data-v359-coach-next>${esc(row.button)}</button>`:''}</div>`;if(row.target)document.querySelector(row.target)?.classList.add('v359-tutorial-focus')
}
function startTutorialCoach(){if(!currentConfig?.tutorial)return false;tutorialStep=-1;showTutorialStep(0);return true}
function hideTutorialCoach(){clearTutorialFocus();$v359('v359TutorialCoach')?.classList.add('hidden');tutorialStep=-1}
function finishTutorialCoach(completed){if(completed)writeJson(TUTORIAL_KEY,{version:1,completed:true,completedAt:new Date().toISOString()});hideTutorialCoach();return completed}
document.addEventListener('click',event=>{
  if(!currentConfig?.tutorial||tutorialStep<0)return;const row=tutorialSteps[tutorialStep],target=event.target.closest('button');if(!target||!row?.expect)return;
  setTimeout(()=>{if(row.expect==='pause'&&target.id==='pause'&&paused)showTutorialStep(tutorialStep+1);else if(row.expect==='resume'&&target.id==='pause'&&!paused)showTutorialStep(tutorialStep+1);else if(row.expect==='speed2'&&target.matches('.speed-btn[data-speed="2"]'))showTutorialStep(tutorialStep+1);else if(row.expect==='speed1'&&target.matches('.speed-btn[data-speed="1"]'))showTutorialStep(tutorialStep+1)},0)
});

function analysisInsight(player,row){const skill=topSkill(row),share=num(row.dealt)/Math.max(1,num(game?.v359Analysis?.totalDamage));if(!row.hits)return '유효 피해 기록이 적어. 생존 시간을 늘리며 첫 스킬 발동을 확인해 봐.';if(row.taken>row.dealt*1.6)return '받은 피해가 준 피해보다 높아. 벽 충돌 뒤 진입 각도와 생존형 스킬 타이밍을 살펴봐.';if(share>.4)return `전체 피해의 ${Math.round(share*100)}%를 담당했어. ${skill[0]}이 가장 큰 기여를 했어.`;return `${skill[0]} 비중이 가장 높아. 훈련장에서 같은 캐릭터로 DPS 변화를 비교해 봐.`}
function analysisHtml(){
  if(!game?.v359Analysis)return '';
  const duration=Math.max(.1,num(game.t)),players=(game.players||[]).filter(p=>p.id!==DUMMY_ID&&!p.data?.v151Hormone&&!p.data?.v151MentorYoon&&!p.data?.v207Banjunseo),rows=players.map(p=>({p,row:analysisRow(p)})),best=rows.sort((a,b)=>num(b.row?.dealt)-num(a.row?.dealt))[0],total=num(game.v359Analysis.totalDamage);
  return `<section class="v359-analysis"><div class="v359-analysis-head"><strong>🔎 전투 결과 분석</strong><span>실제 체력 감소 기준<br>스킬별 유효 타격 집계</span></div><div class="v359-analysis-overview"><div>전투 시간<b>${duration.toFixed(1)}초</b></div><div>총 피해<b>${one(total)}</b></div><div>유효 타격<b>${game.v359Analysis.totalHits}</b></div><div>최다 피해<b>${esc(best?.p?.name||'-')}</b></div></div><div class="v359-analysis-list">${rows.map(({p,row})=>{const skill=topSkill(row),survival=p.eliminationTime==null?duration:Math.min(duration,num(p.eliminationTime)),share=total>0?num(row?.dealt)/total*100:0;return `<article class="v359-analysis-row" style="--c:${esc(p.color||'#64748b')}"><div class="v359-analysis-title"><b>${esc(p.name)}</b><span>피해 기여 ${share.toFixed(1)}%</span></div><div class="v359-analysis-metrics"><div>준 피해<b>${one(row?.dealt)}</b></div><div>받은 피해<b>${one(row?.taken)}</b></div><div>최대 한 방<b>${one(row?.biggest)}</b></div><div>생존 시간<b>${survival.toFixed(1)}초</b></div></div><div class="v359-analysis-skill">주력 스킬 · ${esc(skill[0])} · ${one(skill[1].damage)} 피해 / ${num(skill[1].hits)}회 유효 타격 · 벽 충돌 ${num(row?.walls)}회</div><div class="v359-analysis-tip">${esc(analysisInsight(p,row))}</div></article>`}).join('')}</div></section>`
}
function compactAnalysis(){if(!game?.v359Analysis)return null;return {version:1,createdAt:new Date().toISOString(),mode:String(currentConfig?.mode||'battle'),title:String(game.resultTitle||'전투 결과'),duration:num(game.t),totalDamage:num(game.v359Analysis.totalDamage),players:(game.players||[]).filter(p=>p.id!==DUMMY_ID).map(p=>{const row=analysisRow(p),skill=topSkill(row);return {id:p.id,name:p.name,dealt:num(row?.dealt),taken:num(row?.taken),hits:num(row?.hits),walls:num(row?.walls),biggest:num(row?.biggest),topSkill:skill[0],topSkillDamage:num(skill[1]?.damage),kills:num(p.kills),survival:p.eliminationTime==null?num(game.t):num(p.eliminationTime)}})} }
function saveCurrentAnalysis(){if(!game?.v359Analysis||game.v359Analysis.saved||currentConfig?.v359TrainingRoom)return false;const item=compactAnalysis();if(!item)return false;const history=readJson(ANALYSIS_KEY,[]);history.unshift(item);writeJson(ANALYSIS_KEY,history.slice(0,20));game.v359Analysis.saved=true;return true}
const previousResultRenderV359=renderResultModal;
renderResultModal=function v359RenderResult(){const result=previousResultRenderV359.apply(this,arguments);hideTutorialCoach();if(resultBody&&!resultBody.querySelector('.v359-analysis'))resultBody.insertAdjacentHTML('beforeend',analysisHtml());saveCurrentAnalysis();return result};

/* Two-generation local backup around cloud saves and profile changes. */
function verifyBackup(row){if(!row||row.version!==1||!row.progress||typeof row.progress!=='object')return false;return hashText(JSON.stringify(row.progress))===row.hash}
function backupProgress(reason='interval'){
  const api=window.__GONG_V232__,progress=api?.captureProgress?.();if(!progress)return false;const raw=JSON.stringify(progress),hash=hashText(raw),current=readJson(BACKUP_CURRENT,null);if(current?.hash===hash)return true;if(current&&verifyBackup(current))writeJson(BACKUP_PREVIOUS,current);return writeJson(BACKUP_CURRENT,{version:1,updatedAt:Date.now(),reason,hash,progress})
}
function restoreProgressBackup(which='current'){
  const primary=readJson(which==='previous'?BACKUP_PREVIOUS:BACKUP_CURRENT,null),fallback=readJson(BACKUP_PREVIOUS,null),row=verifyBackup(primary)?primary:verifyBackup(fallback)?fallback:null;if(!row)return false;const ok=window.__GONG_V232__?.applyProgress?.(row.progress);backupProgress('restored');return ok!==false
}
function installRecoveryButton(){
  const modal=$v359('v232ProfileModal'),cloud=modal?.querySelector('.v232-cloud-status');if(!modal||!cloud||$v359('v359ProgressRecovery'))return false;const button=document.createElement('button');button.id='v359ProgressRecovery';button.type='button';button.className='v359-progress-recovery';button.innerHTML='🛟 저장 기록 복구<small>최근 2개 로컬 스냅샷 중 검증된 기록으로 되돌리기</small>';button.addEventListener('click',()=>{if(!confirm('최근 검증된 저장 스냅샷을 복구하고 새로고침할까?'))return;if(restoreProgressBackup()){location.reload()}else alert('복구할 수 있는 정상 스냅샷이 없어.')});cloud.insertAdjacentElement('beforebegin',button);return true
}

function roomSession(){const row=readJson(ROOM_KEY,null);if(!row||!/^[A-Z2-9]{6}$/.test(String(row.code||''))||!['host','guest'].includes(row.side))return null;if(row.savedAt&&Date.now()-num(row.savedAt)>2*60*60*1000)return null;return row}
function installRoomRecovery(){
  const panel=$v359('v231Friendly'),tools=panel?.querySelector('.v231-room-tools'),session=roomSession();if(!panel||!tools)return false;let box=$v359('v359RoomResume');if(!session){box?.remove();return false}if(window.__GONG_V231__?.status?.().roomCode){box?.remove();return false}if(!box){box=document.createElement('div');box.id='v359RoomResume';box.className='v359-room-resume';tools.insertAdjacentElement('beforebegin',box)}box.innerHTML=`<span>이전 친선방 ${esc(session.code)} 기록이 남아 있어.</span><button type="button">이어서 입장</button>`;box.querySelector('button').addEventListener('click',async()=>{const button=box.querySelector('button');button.disabled=true;button.textContent='연결 중';const ok=await window.__GONG_V231__?.restoreRoom?.(true);if(ok)box.remove();else{button.disabled=false;button.textContent='다시 시도';box.querySelector('span').textContent='방이 만료됐거나 계정이 달라. 새 방으로 입장해.'}});return true
}

function installModeButtons(){
  const hub=$v359('modeHub');if(!hub)return false;
  if(!$v359('v359TutorialModeBtn')){const button=document.createElement('button');button.id='v359TutorialModeBtn';button.type='button';button.className='mode-hub-btn v359-tutorial-mode';button.textContent='🎓 초보자 튜토리얼';button.addEventListener('click',()=>window.__GONG_V247__?.openTutorial?.(true));hub.insertAdjacentElement('afterbegin',button)}
  if(!$v359('v359TrainingModeBtn')){const button=document.createElement('button');button.id='v359TrainingModeBtn';button.type='button';button.className='mode-hub-btn v359-training-mode';button.textContent='🧪 훈련장';button.addEventListener('click',openTrainingRoom);const growth=$v359('trainingModeBtn');growth?.insertAdjacentElement('afterend',button)||hub.appendChild(button)}
  return true
}

let reconnectAt=0;
function reconnectOnline(reason='manual'){const now=Date.now();if(now-reconnectAt<5000)return false;reconnectAt=now;window.__GONG_V230__?.reconnect?.();setTimeout(()=>{window.__GONG_V231__?.syncLeaderboard?.({force:true});window.__GONG_V232__?.syncProgress?.({force:true});window.__GONG_V334__?.publishLive?.()},500);return reason}
function performanceSnapshot(){const nav=performance.getEntriesByType?.('navigation')?.[0];return {build:BUILD,domInteractive:Math.round(nav?.domInteractive||0),domContentLoaded:Math.round(nav?.domContentLoadedEventEnd||0),load:Math.round(nav?.loadEventEnd||0),transferSize:num(nav?.transferSize),encodedBodySize:num(nav?.encodedBodySize),resourceCount:performance.getEntriesByType?.('resource')?.length||0,inlineImages:document.querySelectorAll('img[src^="data:"]').length,externalizedAssets:document.querySelectorAll('img[src*="assets/v359-inline/"]').length,onlineReady:!!window.__GONG_V230__?.status?.().ready}}

function init(){
  installModeButtons();ensureTrainingModal();ensureTutorialCoach();installRecoveryButton();installRoomRecovery();backupProgress('startup');
  $v359('back')?.addEventListener('click',()=>{document.body.classList.remove('v359-training-battle');hideTutorialCoach()});
  addEventListener('online',()=>reconnectOnline('online'));document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(()=>reconnectOnline('visible'),250)});addEventListener('pagehide',()=>backupProgress('pagehide'));
  for(const name of ['gong-competitive-profile-change','gong-v238-mastery-reward-claimed','gong-v239-item-progress-change','gong-v232-auth-changed'])addEventListener(name,()=>backupProgress(name));
  setInterval(()=>{backupProgress('interval');installRecoveryButton();installRoomRecovery()},12000);
  addEventListener('load',()=>setTimeout(()=>writeJson('gonggame_v359_last_performance',performanceSnapshot()),0),{once:true});
  window.__GONG_PATCH_NOTES__?.register?.('V359','초보자 상호작용 튜토리얼 · 무제한 훈련장/DPS · 스킬별 전투 결과 분석 · 친선방 명시적 복구 · 2세대 저장 백업 · 관전 재시도/백오프 · 인라인 이미지 외부화/캐시 최적화');
}

window.__GONG_V359__={build:BUILD,openTutorial:()=>window.__GONG_V247__?.openTutorial?.(true),openTrainingRoom,startTrainingBattle,leaveTraining,resetTrainingMeasurement,trainingMeasurement,analysis:()=>compactAnalysis(),history:()=>readJson(ANALYSIS_KEY,[]),backupProgress,restoreProgressBackup,reconnectOnline,performance:performanceSnapshot,verify(){return {build:BUILD,tutorialButton:!!$v359('v359TutorialModeBtn'),trainingButton:!!$v359('v359TrainingModeBtn'),trainingModal:!!$v359('v359TrainingModal'),analysisWrapped:renderResultModal.name==='v359RenderResult',roomRecoveryStored:!!roomSession(),progressBackupValid:verifyBackup(readJson(BACKUP_CURRENT,null)),dummyExcluded:!orderedCharacterIds().includes(DUMMY_ID),serviceWorkerVersion:359,latest:window.__GONG_LATEST_BUILD__}}};
window.__GONG_V359_BUILD__=BUILD;window.__GONG_LATEST_BUILD__=BUILD;
if(window.__GONG_V134_DEBUG__)Object.assign(window.__GONG_V134_DEBUG__,{damage,tick,resetBattle,onWallHit,checkEnd,renderResultModal});
if(window.__GONG_V138_TEST__)Object.assign(window.__GONG_V138_TEST__,{damage,tick,resetBattle,onWallHit,checkEnd,renderResultModal});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
console.info('[V359] 튜토리얼 · 훈련장 · 전투 분석 · 친선/관전/저장 안정화 · 빠른 첫 진입');
})();
