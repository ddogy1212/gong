/* V361 · 천생연분: 참새 조수빈(subinnew) × 김민재(min) */
(()=>{
  'use strict';
  const BUILD='V361_SOULMATE_PAIR_SYNERGY';
  const MIN='min';
  const SPARROW_SUBIN='subinnew';
  const label='천생연분';
  const idOf=p=>p?.data?.v160RealId||p?.id||'';

  // Pair membership is captured for each individual match. Defeat does not
  // change the fact that both characters entered the same match.
  function pairInCurrentMatch(){
    if(typeof game==='undefined'||!game||!Array.isArray(game.players))return null;
    if(Object.prototype.hasOwnProperty.call(game,'v361SoulmatePair'))return game.v361SoulmatePair;
    const min=game.players.find(p=>idOf(p)===MIN&&!p.isBoss);
    const subin=game.players.find(p=>idOf(p)===SPARROW_SUBIN&&!p.isBoss);
    game.v361SoulmatePair=min&&subin?{
      min,
      subin,
      sameTeam: min.team===subin.team && !isEnemy(min,subin)
    }:null;
    return game.v361SoulmatePair;
  }

  function damageFactor(source,target,opts={}){
    if(!source||!target||source===target||opts?.selfDamage)return 1;
    const sid=idOf(source),tid=idOf(target);
    if(sid!==MIN&&sid!==SPARROW_SUBIN)return 1;
    const pair=pairInCurrentMatch();
    if(!pair)return 1;
    if(pair.sameTeam){
      // When they are allies, each deals 40% more damage to enemies.
      return isEnemy(source,target)?1.4:1;
    }
    // When they are rivals, reduce only damage between the two of them.
    if((sid===MIN&&tid===SPARROW_SUBIN)||(sid===SPARROW_SUBIN&&tid===MIN)){
      return isEnemy(source,target)?0.2:1;
    }
    return 1;
  }

  function addSkill(id){
    if(DEFS?.[id]){
      const old=String(DEFS[id].skills||'');
      if(!old.split(/\s*[·,/]\s*/).includes(label))DEFS[id].skills=old?`${old} · ${label}`:label;
    }
    const info=SKILL_INFO?.[id];
    if(info&&Array.isArray(info.skills)&&!info.skills.some(s=>s?.name===label)){
      info.skills.push({
        kind:'조합 패시브',type:'passive',name:label,
        desc:'참새 스킬을 가진 조수빈과 김민재가 같은 경기에 출전하면 팀 관계에 따라 피해량이 달라진다.',
        points:[
          '발동 조건: 김민재와 참새 조수빈이 같은 경기에 출전',
          '서로 상대 팀: 두 캐릭터가 서로에게 주는 피해 ×0.2 (80% 감소)',
          '같은 팀: 두 캐릭터가 적에게 주는 피해가 각각 ×1.4 (40% 증가)',
          '효과는 해당 경기 동안 유지 · 다른 조수빈(비둘기 소환술)은 제외',
          '방어막·무적 등 기존 방어 판정은 그대로 적용'
        ]
      });
    }
  }

  addSkill(MIN);
  addSkill(SPARROW_SUBIN);
  window.__GONG_V361__={
    build:BUILD,damageFactor,
    verify(){
      const pair=pairInCurrentMatch();
      return {
        build:BUILD,
        minSkill:!!SKILL_INFO?.[MIN]?.skills?.some(s=>s?.name===label),
        subinSkill:!!SKILL_INFO?.[SPARROW_SUBIN]?.skills?.some(s=>s?.name===label),
        alternateSubinUnaffected:!SKILL_INFO?.subin?.skills?.some(s=>s?.name===label),
        active:!!pair,
        relationship:pair?(pair.sameTeam?'same-team':'opposing-teams'):'inactive',
        multiplier:pair?(pair.sameTeam?1.4:0.2):1
      };
    }
  };
  window.__GONG_V361_BUILD__=BUILD;
  window.__GONG_LATEST_BUILD__=BUILD;
  window.__GONG_PATCH_NOTES__?.register?.('V361','김민재·참새 조수빈 천생연분 · 적 팀일 때 서로 피해 ×0.2 · 같은 팀일 때 각각 적에게 피해 ×1.4');
  console.info('[V361] 천생연분: 김민재 × 참새 조수빈');
})();
