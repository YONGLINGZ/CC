/* Explicit narrative fixtures: public choices and combat settlement, not human play. */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),N=require('./engine.js'),T=require('./tales.js');
const rng=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
function run(starter='sword',options={}){const g=N.createGame({rng:rng(42),environment:false,scaling:false,bossQuests:false,profile:{unlocks:['feiye']},...options});g.newRun(starter);g.enterRegion();return g;}
function at(g,floor,type='event',id=null){const s=g.state;s.screen='map';s.floor=floor;s.journey.regionIndex=Math.floor((floor-1)/10);const n=s.map[floor-1][0];n.type=type;n.revealed=true;delete n.encounter;delete n.storyId;if(id)n.storyId=id;s.availableNodes=[n.id];s.history=s.history.filter(h=>h.floor!==floor);assert.equal(g.enterNode(n.id),true);return s;}
function record(g,id){g.state.journey.tales.chains[id]={stage:0,choices:{},lastOutcome:'',floors:[6,26,46]};}
function resolve(g,index=0){const e=g.state.event;assert.equal(g.chooseEvent(index),true);const snap=JSON.stringify(g.state);assert.equal(g.chooseEvent(index),false);assert.equal(JSON.stringify(g.state),snap);assert.ok(e.resolved);return e;}
function restTo(g,floor){while(g.state.floor<floor){if(g.state.screen==='arrival')g.enterRegion();assert.equal(g.state.screen,'map');const available=g.getAvailableNodes(),rests=available.filter(n=>n.type==='rest');const n=(rests.length?rests:available).slice().sort((a,b)=>b.next.length-a.next.length)[0];n.type='rest';delete n.storyId;delete n.encounter;g.enterNode(n.id);g.rest(false);}if(g.state.screen==='arrival')g.enterRegion();}
function finish(g){const b=g.state.battle;b.enemy.hp=1;b.enemy.block=0;b.energy=20;b.hand=[{id:'C01',uid:'tale-finisher'}];assert.equal(g.playCard('tale-finisher',true),true);}

test('ten coherent three-part chains, thirty unique event IDs, two interruptions and distinct chain art references',()=>{
 assert.equal(Object.keys(T.CHAINS).length,10);assert.equal(Object.keys(T.META).length,30);assert.equal(T.EVENT_IDS.length,32);assert.equal(new Set(T.EVENT_IDS).size,32);assert.equal(new Set(Object.values(T.CHAINS).map(c=>c.artId)).size,10);assert.ok(N.EVENT_ART_IDS.includes('cave'));for(const id of T.EVENT_IDS)assert.ok(N.EVENT_IDS.includes(id));assert.equal(N.EVENT_IDS.length,161);
});
for(const chain of Object.keys(T.CHAINS))test('all 27 choice paths settle and preserve witnessed consequences: '+chain,()=>{
 for(let a=0;a<3;a++)for(let b=0;b<3;b++)for(let c=0;c<3;c++){
  const g=run(),s=g.state;record(g,chain);s.player.gold=1000;s.player.hp=s.player.maxHp=200;let prior='';
  for(const [i,index]of [a,b,c].entries()){
   at(g,[6,26,46][i],'event',`tale_${chain}_${i+1}`);const e=s.event;assert.equal(e.id,`tale_${chain}_${i+1}`);assert.equal(e.connection,prior);assert.ok(e.story.length>=2);assert.equal(e.choices.length,3);const wanted=e.choices[index].key;resolve(g,index);prior=e.outcome;assert.equal(s.journey.tales.chains[chain].stage,i+1);assert.equal(s.journey.tales.chains[chain].choices[i+1].key,wanted);assert.equal(g.leaveEvent(),true);assert.ok(s.player.hp>0&&s.player.hp<=s.player.maxHp&&s.player.gold>=0);assert.equal(g.leaveEvent(),false);
  }
 }
});
test('selected chains are fixed per run; all ten appear across seeds; legacy/off mode leaves them disabled',()=>{
 const seen=new Set();for(let seed=0;seed<30;seed++){const g=run('mark',{rng:rng(seed)}),t=g.state.journey.tales;assert.equal(t.selected.length,3);assert.equal(new Set(t.selected).size,3);t.selected.forEach(x=>seen.add(x));const before=JSON.stringify(t.selected);g.getAvailableNodes();assert.equal(JSON.stringify(t.selected),before);}assert.equal(seen.size,10);for(const options of[{tales:false},{campaign:'legacy'}])assert.equal(run('sword',options).state.journey.tales,undefined);
});
test('opportunity stages are reachable, optional, ordered and never preempt sovereign heart encounter',()=>{
 const g=run('sovereign'),s=g.state;const selected=s.journey.tales.selected,first=selected[0];assert.deepEqual(s.journey.tales.chains[first].floors,[6,36,46]);restTo(g,6);const options=g.getAvailableNodes();assert.ok(options.some(n=>n.storyId===`tale_${first}_1`));assert.ok(options.some(n=>n.storyId!==`tale_${first}_1`));const node=options.find(n=>n.storyId===`tale_${first}_1`);g.enterNode(node.id);resolve(g,2);g.leaveEvent();restTo(g,26);assert.ok(s.map[25].every(n=>n.encounter?.enemyId==='heart'));restTo(g,36);assert.ok(g.getAvailableNodes().some(n=>n.storyId===`tale_${first}_2`));
});
test('missed first stage never spawns later meetings; direct premature event ID safely falls back',()=>{
 const g=run(),s=g.state,id=s.journey.tales.selected[0];restTo(g,26);assert.ok(g.getAvailableNodes().every(n=>n.storyId!==`tale_${id}_2`));at(g,46,'event',`tale_${id}_3`);assert.notEqual(s.event.id,`tale_${id}_3`);assert.equal(s.journey.tales.chains[id].stage,0);assert.equal(s.event.connection,undefined);
});
test('missed middle stage never invents a completed final encounter',()=>{
 const g=run(),s=g.state,id=s.journey.tales.selected[0];record(g,id);at(g,6,'event',`tale_${id}_1`);resolve(g,0);g.leaveEvent();restTo(g,46);assert.ok(g.getAvailableNodes().every(n=>n.storyId===`tale_${id}_3`?true:false)===false);assert.equal(s.journey.tales.chains[id].stage,1);
});
test('six actual unprotected demonic card uses fall; protected path does not, and new run clears all plot choices',()=>{
 for(const jade of[false,true]){const g=run(),s=g.state;at(g,9,'fight');s.player.path.learned=true;if(jade)s.player.questItems.push('clearheart_jade');const b=s.battle;b.enemy.hp=b.enemy.maxHp=10000;for(let i=0;i<6;i++){b.hand=[{id:'D01',uid:'d'+i}];b.energy=20;g.playCard('d'+i,true);assert.equal(s.player.path.fallen,!jade&&i===5);}assert.equal(s.player.path.fallen,!jade);g.newRun('sword');assert.equal(g.state.player.path.fallen,false);assert.equal(g.state.player.path.uses,0);assert.ok(Object.values(g.state.journey.tales.chains).every(c=>c.stage===0));}
});
test('fallen rest triggers once, escape sacrifices only this rest and does not charge health or money',()=>{
 const g=run(),s=g.state;s.player.path.fallen=true;s.player.hp=31;at(g,8,'rest');assert.equal(s.event.id,'campfire_hunt');assert.equal(s.screen,'event');const hp=s.player.hp,gold=s.player.gold;resolve(g,s.event.choices.findIndex(c=>c.key==='leave'));assert.equal(g.leaveEvent(),true);assert.equal(s.floor,9);assert.equal(s.player.hp,hp);assert.equal(s.player.gold,gold);assert.equal(s.history.filter(h=>h.floor===8).length,1);at(g,9,'rest');assert.equal(s.screen,'rest');
});
test('paying for parley charges once and resumes original rest; neither branch nor healing can be collected twice',()=>{
 const g=run(),s=g.state;s.player.path.fallen=true;s.player.hp=30;at(g,8,'rest');resolve(g,s.event.choices.findIndex(c=>c.key==='parley'));assert.equal(s.player.gold,40);g.leaveEvent();assert.equal(s.screen,'rest');assert.equal(s.floor,8);assert.equal(s.history.length,0);assert.equal(g.leaveEvent(),false);assert.equal(g.rest(true),true);assert.equal(s.player.hp,48);assert.equal(s.floor,9);assert.equal(g.rest(true),false);assert.equal(s.history.length,1);
});
test('actual earlier testimony unlocks a witness response; unseen people never appear as witnesses',()=>{
 const g=run(),s=g.state;record(g,'medicine');at(g,6,'event','tale_medicine_1');resolve(g,0);g.leaveEvent();at(g,26,'event','tale_medicine_2');resolve(g,0);g.leaveEvent();s.player.path.fallen=true;at(g,28,'rest');assert.ok(s.event.story.join('').includes('杜蘅'));const ix=s.event.choices.findIndex(c=>c.key==='witness');assert.ok(ix>=0);const gold=s.player.gold;resolve(g,ix);g.leaveEvent();assert.equal(s.screen,'rest');assert.equal(s.player.gold,gold);
 const other=run();other.state.player.path.fallen=true;at(other,8,'rest');assert.ok(!other.state.event.choices.some(c=>c.key==='witness'));assert.ok(!other.state.event.story.join('').includes('杜蘅'));
});
test('patrol fixed intentions match pursuit, sealed draw and individual hits; victory returns to rest after one reward',()=>{
 const g=run(),s=g.state;s.player.path.fallen=true;at(g,8,'rest');resolve(g,0);g.leaveEvent();const b=s.battle;assert.equal(b.enemy.id,'orthodox_patrol');assert.equal(g.getIntent().name,'问罪剑阵');g.endTurn();g.resolveEnemyTurn();assert.equal(b.playerMark,2);assert.equal(g.getIntent().name,'封息符');g.endTurn();g.resolveEnemyTurn();assert.equal(b.enemy.block,7);assert.equal(b.hand.length,4);assert.equal(g.getIntent().name,'三才合锋');assert.deepEqual(g.getIntent().hits,[6,4,4]);finish(g);assert.equal(s.screen,'reward');const gold=s.player.gold;assert.equal(g.chooseReward(null),true);assert.equal(s.screen,'rest');assert.equal(s.floor,8);assert.equal(s.battle,null);assert.equal(g.chooseReward(null),false);assert.equal(s.player.gold,gold);g.rest(false);assert.equal(s.history.length,1);assert.equal(s.floor,9);
});
test('dying to a patrol ends the run immediately, without granting the saved rest or rewards',()=>{
 const g=run(),s=g.state;s.player.path.fallen=true;s.player.hp=1;s.player.relics=[];at(g,8,'rest');resolve(g,0);g.leaveEvent();g.endTurn();g.resolveEnemyTurn();assert.equal(s.screen,'defeat');assert.equal(g.rest(true),false);assert.equal(g.chooseReward(null),false);assert.equal(s.player.hp,0);
});
test('progress interruption occurs after twelve completed nodes, is choice-stable, has a cooldown and recalls actual aid',()=>{
 const g=run('mark'),s=g.state;restTo(g,13);const before=s.player.gold;at(g,13,'fight');assert.equal(s.event.id,'road_aftermath');assert.ok(!s.event.story.join('').includes('受过你援手'));resolve(g,0);assert.equal(s.player.gold,before-12);assert.equal(s.player.inventory.healing_pill,1);g.leaveEvent();assert.equal(s.floor,14);assert.equal(s.history.length,13);at(g,14,'fight');assert.equal(s.screen,'battle');finish(g);g.chooseReward(null);restTo(g,28);at(g,28,'fight');assert.equal(s.event.id,'road_aftermath');assert.ok(s.event.story[0].includes('受过你援手'));resolve(g,0);assert.equal(s.player.inventory.dewherb,2);
});
test('new linked choices remain legal when poor; duplicate sword converts to the promised coins',()=>{
 const g=run(),s=g.state;record(g,'forge');s.player.weaponInventory.push('rime');s.player.gold=0;s.player.hp=1;for(const step of[1,2]){at(g,[6,26][step-1],'event',`tale_forge_${step}`);resolve(g,s.event.choices.findIndex(c=>!c.disabled));g.leaveEvent();}s.player.gold=0;at(g,46,'event','tale_forge_3');resolve(g,0);assert.equal(s.player.gold,22);assert.equal(s.player.weaponInventory.filter(x=>x==='rime').length,1);
});
