(()=>{
  'use strict';
  const BUILD='V360_ACHIEVEMENT_LIFETIME_COUNTERS';
  function verify(){
    const api=window.__GONG_V260__,data=api?.read?.()||{},stats=api?.aggregate?.()||{};
    return {
      build:BUILD,
      dataVersion:Number(data.version)||0,
      detailLedger:Object.keys(data.ledger||{}).length,
      detailLedgerLimit:1000,
      lifetimeMatches:Number(stats.totals?.matches)||0,
      lifetimeWins:Number(stats.totals?.wins)||0,
      counterDevices:Object.keys(data.lifetime?.devices||{}).length,
      cloudMerge:typeof api?.mergeData==='function',
      latest:window.__GONG_LATEST_BUILD__
    };
  }
  window.__GONG_V360__={build:BUILD,stats:()=>window.__GONG_V260__?.aggregate?.()||null,verify};
  window.__GONG_V360_BUILD__=BUILD;
  window.__GONG_LATEST_BUILD__=BUILD;
  window.__GONG_PATCH_NOTES__?.register?.('V360','최근 상세 전적 1,000개 제한과 업적 평생 누적치를 분리 · 2,000경기/1,000승/육성 1,000전 등 장기 업적 정상 진행');
  console.info('[V360] 업적 평생 누적 카운터 활성화 · 상세 전적 1,000개 제한과 분리');
})();
