/* Measurement audit only. Does not play, mutate or tune a game. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8')),hash=f=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex');
const baseline=read('dev/v11-baseline-playtest-report.json'),current=read('dev/v11-playtest-report.json'),probe=read('dev/v11-elite-probe-report.json');
const withoutMeasurements=run=>Object.fromEntries(Object.entries(run).filter(([key])=>key!=='battleMetrics'));
assert.deepEqual(current.details.map(withoutMeasurements),baseline.details.map(withoutMeasurements),'tracker change must not change any run outcome, choice, resource or seed');
const median=values=>{const a=values.slice().sort((a,b)=>a-b);return a.length?(a[(a.length-1)>>1]+a[a.length>>1])/2:null;};
const groups={};
for(const role of ['assassin','sword','sovereign']){
 const runs=current.details.filter(r=>r.character===role),counts={};
 for(const run of runs){
  const seen={};for(const battle of run.battleMetrics)for(const[id,amount]of Object.entries(battle.cardHitMax||{}))seen[id]=Math.max(seen[id]||0,amount);
  assert.equal(Math.max(0,...Object.values(seen)),run.maxHit,'captured card-hit maxima must match actual engine stats');
  for(const[id,amount]of Object.entries(seen))if(amount===run.maxHit)counts[id]=(counts[id]||0)+1;
 }
 groups[role]={runs:runs.length,maxHitMedian:median(runs.map(r=>r.maxHit)),cardsTiedForEachRunsActualMaximum:counts};
}
const won=probe.details.flatMap(r=>r.battleMetrics).filter(b=>b.won&&['elite','boss'].includes(b.kind));
for(const b of won){assert.equal(b.finalized,true);assert.equal(b.hpBeforeVictoryRewards,b.hpEnd-b.postVictoryHealing);assert.equal(b.combatOnlyNetLifeLoss,b.hpStart-b.hpBeforeVictoryRewards);}
const report={method:'Read-only audit of actual fixed-policy simulation and elite-probe records. Measurement-only amendment compared with complete first baseline; all non-measurement fields must be identical for all150 runs. No gameplay is changed by this script.',all150OutcomesOutsideMeasurementsIdentical:true,rawMaxHitSources:groups,baseFinisherConflict:{C21:'12 + 6×5 marks + 2×7 bleed =56 base, up to64 with shared cap8 bonus',S16:'16 +4×8 sword intent =48 base, up to56 with cap8',F12:'18 +4×6 soul =42 base, up to50 with cap8',D06:'26 base +8 shared capped bonus =34'},healthMeasurement:{start:'Observed health after the initial player-turn setup; subsequent combat damage/healing is included.',end:'First battle-ended snapshot, frozen before card rewards, later camps and story healing; actual heals after victory marker are subtracted for combat-only health.',victoriousEliteOrBossEncounters:won.length,combatOnlyNetLifeLossMedian:median(won.map(b=>b.combatOnlyNetLifeLoss)),immediatePostVictoryNetLifeLossMedian:median(won.map(b=>b.netLifeLoss)),actualPostVictoryHealingMedian:median(won.map(b=>b.postVictoryHealing)),note:'No maximum HP or net-loss clamp is used. Negative loss means genuine net healing during that encounter.'},inputs:Object.fromEntries(['dev/playtest.cjs','dev/v11-policy-freeze.json','dev/v11-baseline-playtest-report.json','dev/v11-playtest-report.json','dev/v11-elite-probe-report.json','dev/v11-audit.cjs'].map(f=>[f,hash(f)]))};
fs.writeFileSync(path.join(__dirname,'v11-balance-audit.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
