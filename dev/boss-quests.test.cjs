/* Explicit quest fixtures; actual choices and combat settlement. */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),N=require('./engine.js'),Q=require('./boss-quests.js');
const random=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
function run(boss='lotus_boss',options={}){const g=N.createGame({rng:random(42),environment:false,scaling:false,tales:false,...options});g.newRun('sword');g.enterRegion();const s=g.state;if(!s.journey.bossQuests)s.journey.bossQuests={records:{},scheduled:[],resolutions:[]};s.journey.bossQuests.records[boss]={region:0,stage:0,choices:{},guard:0,lastOutcome:'',awakened:false};s.map[9][0].encounter={enemyId:boss,kind:'boss'};return g;}
function at(g,floor,type='event',id=null){const s=g.state;s.screen='map';s.floor=floor;s.journey.regionIndex=0;s.availableNodes=[s.map[floor-1][0].id];const n=s.map[floor-1][0];n.type=type;n.revealed=true;delete n.storyId;delete n.encounter;if(id)n.storyId=id;if(type==='boss')n.encounter={enemyId:id,kind:'boss'};assert.equal(g.enterNode(n.id),true);return s.event;}
function choose(g,i){assert.equal(g.chooseEvent(i),true);const before=JSON.stringify(g.state);assert.equal(g.chooseEvent(i),false);assert.equal(JSON.stringify(g.state),before);}
function stage(g,boss,step,index){const e=at(g,[2,6,9][step-1],'event',`boss_${boss}_${step}`);assert.equal(e.id,`boss_${boss}_${step}`);assert.equal(e.choices.length,4);choose(g,index);assert.equal(g.leaveEvent(),true);return e;}
function equipped(g,boss,a=0,b=0){stage(g,boss,1,a);stage(g,boss,2,b);}
test('fourteen three-stage boss chains and one awakening; no quest enters ordinary random event/art pools',()=>{
 assert.equal(Object.keys(Q.QUESTS).length,14);assert.equal(Object.keys(Q.META).length,42);assert.equal(Q.EVENT_IDS.length,43);assert.equal(N.EVENT_IDS.length,130);for(const id of Q.EVENT_IDS){assert.ok(N.EVENT_IDS.includes(id));assert.ok(!N.EVENT_ART_IDS.includes(id));assert.ok(N.ENEMIES[N.bossQuestArt(id)]);}assert.equal(Object.keys(N.QUEST_ITEMS).length,29);
});
for(const boss of Object.keys(Q.QUESTS))test('all 64 four-choice paths retain witnessed outcomes and settle once: '+boss,()=>{
 for(let a=0;a<4;a++)for(let b=0;b<4;b++)for(let c=0;c<4;c++){
  const g=run(boss),s=g.state;s.player.gold=200;let prior='';
  for(const [i,index]of[a,b,c].entries()){const e=stage(g,boss,i+1,index);assert.equal(e.connection,prior);prior=e.outcome;assert.equal(s.journey.bossQuests.records[boss].stage,i+1);assert.equal(s.journey.bossQuests.records[boss].choices[i+1].key,e.choices[index].key);assert.equal(g.leaveEvent(),false);}
  assert.equal(s.player.questItems.includes(Q.QUESTS[boss].items[0]),a<2);assert.equal(s.player.questItems.includes(Q.QUESTS[boss].items[1]),b<2);assert.ok(s.player.gold>=0&&s.player.hp===60);
 }
});
test('cannot buy an item without the visible spirit-stone cost, no alternate fifth choice, free refusal always valid',()=>{
 const g=run(),s=g.state;s.player.gold=0;at(g,2,'event','boss_lotus_boss_1');assert.equal(s.event.choices.length,4);assert.equal(s.event.choices[1].disabled,true);assert.equal(g.chooseEvent(1),false);assert.equal(s.player.questItems.length,0);choose(g,3);assert.equal(s.player.gold,0);
});
test('missing first meeting, wrong chapter and premature event IDs do not invent a prior encounter',()=>{
 for(const [floor,id]of[[6,'boss_lotus_boss_2'],[9,'boss_lotus_boss_3']]){const g=run();at(g,floor,'event',id);assert.notEqual(g.state.event.id,id);assert.equal(g.state.journey.bossQuests.records.lotus_boss.stage,0);}
 const g=run();g.state.journey.bossQuests.records.lotus_boss.region=1;at(g,2,'event','boss_lotus_boss_1');assert.notEqual(g.state.event.id,'boss_lotus_boss_1');
});
test('scheduled lore belongs to actual selected boss, attaches only on live edges and neither panels nor skipped stages reroll it',()=>{
 const g=run(),s=g.state;let n=g.getAvailableNodes()[0];n.type='rest';g.enterNode(n.id);g.rest(false);const before=s.map[1].map(n=>[n.id,n.next.slice()]),lore=g.getAvailableNodes().find(n=>n.storyId==='boss_lotus_boss_1');assert.ok(lore);assert.deepEqual(s.map[1].map(n=>[n.id,n.next.slice()]),before);const scheduled=JSON.stringify(s.journey.bossQuests.scheduled);g.getInventory();g.getAvailableNodes();assert.equal(JSON.stringify(s.journey.bossQuests.scheduled),scheduled);assert.ok(s.map[5].every(n=>n.storyId!=='boss_lotus_boss_2'));
});
test('weighted realm pools differ and never repeat a first-three boss; all five can appear',()=>{
 assert.notDeepEqual(Q.WEIGHTS[0],Q.WEIGHTS[1]);assert.notDeepEqual(Q.WEIGHTS[1],Q.WEIGHTS[2]);const seen=new Set();
 for(let seed=0;seed<100;seed++){const g=N.createGame({rng:random(seed)});g.newRun();const ids=[9,19,29].map(f=>g.state.map[f][0].encounter.enemyId);assert.equal(new Set(ids).size,3);ids.forEach(id=>{assert.ok(Q.WEIGHTS[0][id]);seen.add(id);});assert.equal(g.state.map[69][0].encounter.enemyId,'abyss_boss');const fixed=JSON.stringify(g.state.map);g.getAvailableNodes();assert.equal(JSON.stringify(g.state.map),fixed);}
 assert.equal(seen.size,5);
});
test('both witnessed task items automatically awaken the puppet, without battle, XP or battle rewards; all four aftermaths advance once',()=>{
 for(let index=0;index<4;index++){const g=run(),s=g.state;equipped(g,'lotus_boss');s.player.hp=30;const gold=s.player.gold,xp=s.player.xp;at(g,10,'boss','lotus_boss');assert.equal(s.screen,'event');assert.equal(s.event.id,'boss_lotus_awake');assert.equal(s.event.choices.length,4);assert.equal(s.battle,null);assert.equal(s.player.xp,xp);assert.equal(s.stats.chapterBosses,0);assert.equal(s.stats.battles,0);assert.equal(g.playCard('anything',true),false);assert.equal(g.endTurn(),false);assert.equal(g.leaveEvent(),false);choose(g,index);assert.equal(s.player.hp,index===2?38:30);assert.equal(s.player.gold,gold);assert.equal(g.leaveEvent(),true);assert.equal(s.screen,'arrival');assert.equal(s.floor,11);assert.equal(s.stats.peacefulBosses,1);assert.equal(s.player.xp,xp);assert.equal(s.stats.chapterBosses,0);assert.equal(s.history.filter(h=>h.floor===10).length,1);assert.equal(s.history.find(h=>h.floor===10).resolution,'awakened');const snap=JSON.stringify(s);assert.equal(g.leaveEvent(),false);assert.equal(g.chooseEvent(index),false);assert.equal(JSON.stringify(s),snap);}
});
test('one item, two items without witnessed tasks, or the wrong boss never bypasses a boss battle',()=>{
 for(const [a,b]of[[0,3],[3,0],[3,3]]){const g=run();equipped(g,'lotus_boss',a,b);at(g,10,'boss','lotus_boss');assert.equal(g.state.screen,'battle');assert.equal(g.state.battle.enemy.id,'lotus_boss');}
 const g=run();g.state.player.questItems.push(...Q.QUESTS.lotus_boss.items);at(g,10,'boss','lotus_boss');assert.equal(g.state.screen,'battle');
 const other=run();equipped(other,'lotus_boss');at(other,10,'boss','snake');assert.equal(other.state.screen,'battle');assert.equal(other.state.battle.enemy.id,'snake');
});
for(const boss of ['gate_boss','camp_boss','snake','bell_boss'])test('specific countermeasure matches intent, blocks first actual effect only and keeps next action honest: '+boss,()=>{
 const g=run(boss),s=g.state;equipped(g,boss);stage(g,boss,3,0);s.player.hp=s.player.maxHp=1000;at(g,10,'boss',boss);const b=s.battle,effect=Q.QUESTS[boss].ward;assert.equal(b.block,18);assert.equal(b.bossWard.used,false);const ix=N.ENEMIES[boss].intents.findIndex(i=>i[effect]);assert.ok(ix>=0);b.enemy.intentIndex=ix;const intent=g.getIntent();assert.equal(intent[effect],0);assert.equal(intent.wardedEffect,effect);assert.match(intent.text,/将抵消/);assert.equal(b.bossWard.used,false);g.getIntent();g.endTurn();g.resolveEnemyTurn();assert.equal(b.bossWard.used,true);assert.equal(b.poison,0);assert.equal(b.playerMark,0);assert.equal(b.nextEnergyPenalty,0);assert.equal(b.nextDrawPenalty,0);assert.ok(b.logs.some(x=>/本战不再触发/.test(x)));b.enemy.intentIndex=ix;assert.ok(g.getIntent()[effect]>0);assert.ok(!/将抵消/.test(g.getIntent().text));
});
test('stage-three guard cannot be farmed, new run clears all quest items and peaceful history, legacy and off flags disable scheduling',()=>{
 const g=run(),s=g.state;equipped(g,'lotus_boss');stage(g,'lotus_boss',3,0);assert.equal(s.journey.bossQuests.records.lotus_boss.guard,10);assert.equal(g.chooseEvent(0),false);g.newRun('sword');assert.deepEqual(g.state.player.questItems,[]);assert.equal(g.state.stats.peacefulBosses,0);assert.equal(g.state.history.length,0);assert.ok(Object.values(g.state.journey.bossQuests.records).every(r=>r.stage===0&&!r.awakened));
 for(const opts of[{bossQuests:false},{campaign:'legacy'}]){const no=N.createGame(opts);no.newRun('sword');assert.equal(no.state.journey.bossQuests,undefined);}
});
test('active runtime vocabulary uses spirit stones and no other-class status placeholders; existing internal currency fields remain compatible',()=>{
 for(const name of ['engine.js','ui.js','seven.js','expansion.js','expedition.js','tales.js','boss-quests.js','shell.html','art.js'])assert.ok(!/金币|铜钱|钱币/.test(fs.readFileSync(__dirname+'/'+name,'utf8')),name);const g=run();assert.equal(g.state.player.gold,60);assert.equal(N.RELICS.bell.name,'金铃');
});
test('vengeance is visible in the actual attack snapshot as soon as half-life activates, and never latches above threshold',()=>{
 const g=run(),s=g.state;at(g,10,'boss','lotus_boss');const b=s.battle;b.enemy.hp=50;b.enemy.maxHp=92;b.enemy.block=0;b.hand=[{id:'C01',uid:'cross-half'}];b.energy=3;assert.equal(g.getIntent().revengeBonus,0);assert.equal(g.playCard('cross-half',true),true);assert.equal(b.enemy.hp,44);assert.equal(g.getIntent().revengeBonus,1);assert.equal(b.events.find(e=>e.type==='attack'&&e.source==='player').resources.enemyRevenge,true);b.enemy.hp=80;b.hand=[{id:'C02',uid:'above-half'}];assert.equal(g.playCard('above-half'),true);assert.equal(b.events.find(e=>e.type==='block').resources.enemyRevenge,false);
});
