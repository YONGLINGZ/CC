/* Seven-realm lifecycle and content gates. Explicit fixtures never claim natural balance play. */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),N=require('./engine.js'),S=require('./seven.js');
const random=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
function run(seed=3,starter='mark',extra={}){const g=N.createGame({rng:random(seed),scaling:false,environment:false,...(starter==='sovereign'?{profile:{version:1,unlocks:['feiye']}}:{}),...extra});assert.equal(g.newRun(starter),true);return g;}
function reward(g){if(g.state.reward.relicPending)assert.equal(g.chooseRelic(g.state.reward.relicChoices[0]),true);assert.equal(g.chooseReward(null),true);}
function finisher(g){const s=g.state,b=s.battle,id=s.character==='sword'?'S01':s.character==='sovereign'?'F01':'C01';b.enemy.hp=1;b.enemy.block=0;b.hand=[{id,uid:'campaign-fixture-finisher'}];b.energy=3;assert.equal(g.playCard(b.hand[0].uid,true),true);}
function arrive(g){if(g.state.screen==='arrival')assert.equal(g.enterRegion(),true);}
function restTo(g,floor){for(let guard=0;g.state.floor<floor;guard++){assert.ok(guard<80);arrive(g);assert.equal(g.state.screen,'map');const n=g.getAvailableNodes()[0];if(n.type==='boss'){assert.equal(g.enterNode(n.id),true);finisher(g);assert.equal(g.state.screen,'reward');reward(g);}else{n.type='rest';delete n.storyId;delete n.encounter;assert.equal(g.enterNode(n.id),true);assert.equal(g.rest(false),true);}}arrive(g);}
function eventFixture(g,id){const def=S.EVENTS[id],floor=def.minFloor||((Number.isInteger(def.regionIndex)?def.regionIndex:3)*10+3),s=g.state,n=s.map[floor-1][0];s.screen='map';s.floor=floor;s.journey.regionIndex=Math.floor((floor-1)/10);s.availableNodes=[n.id];s.history=s.history.filter(h=>h.floor!==floor);n.revealed=true;n.type='event';n.storyId=id;delete n.encounter;assert.equal(g.enterNode(n.id),true);assert.equal(s.event.id,id);return s.event;}

test('seven realms export70 decisions,20 independent layouts and legacy30 mode explicitly',()=>{
 assert.equal(N.REGIONS.length,7);assert.deepEqual(N.REGIONS.map(r=>r.stages),Array.from({length:7},(_,i)=>[i*10+1,i*10+10]));assert.equal(N.FLOORS.length,70);assert.equal(N.LEGACY_REGIONS.length,3);assert.equal(N.LEGACY_FLOORS.length,30);assert.equal(N.LEGACY_EVENT_IDS.length,40);
 const legacy=run(3,'mark',{campaign:'legacy'});assert.equal(legacy.state.totalFloors,30);assert.equal(legacy.state.campaign,'legacy');assert.equal(legacy.state.map.length,30);assert.deepEqual(legacy.state.map.filter((_,i)=>i%10===9).map(row=>row[0].encounter.enemyId),['gate_boss','camp_boss','snake']);
});

test('all20 templates and all professions have connected seven-realm maps with forty-plus nodes each',()=>{
 for(const starter of['mark','sword','sovereign'])for(let index=0;index<20;index++){
  const g=run(index+1,starter,{routeTemplate:index}),s=g.state;assert.equal(s.totalFloors,70);assert.equal(s.regions.length,7);assert.equal(s.chapterTemplates.length,7);assert.equal(s.map.length,70);const all=s.map.flat(),byId=Object.fromEntries(all.map(n=>[n.id,n])),seen=new Set([s.map[0][0].id]);
  for(const row of s.map)for(const n of row){assert.ok(seen.has(n.id),'reachable '+n.id);assert.equal(n.regionIndex,Math.floor((n.floor-1)/10));if(n.floor<70)assert.ok(n.next.length>0);for(const id of n.next){assert.equal(byId[id].floor,n.floor+1);seen.add(id);}}
  assert.equal(seen.size,all.length);for(let chapter=0;chapter<7;chapter++){const nodes=all.filter(n=>n.regionIndex===chapter);assert.ok(nodes.length>=40);assert.equal(new Set(nodes.map(n=>n.floor)).size,10);assert.equal(s.map[chapter*10+9][0].type,'boss');assert.ok(N.ENEMIES[s.map[chapter*10+9][0].encounter.enemyId]);}
 }
});

test('five early bosses form nonrepeating draw pools while three middle guardians and final ruler remain reachable',()=>{
 assert.equal(S.EARLY_BOSSES.length,5);assert.equal(S.MID_BOSSES.length,3);const pool=new Set();
 for(let seed=1;seed<=100;seed++){const g=run(seed),bosses=g.state.map.filter((_,i)=>i%10===9).map(row=>row[0].encounter.enemyId);assert.equal(new Set(bosses.slice(0,3)).size,3);for(const id of bosses.slice(0,3)){assert.ok(S.EARLY_BOSSES.includes(id));pool.add(id);}assert.deepEqual(bosses.slice(3,6),S.MID_BOSSES);assert.equal(bosses[6],S.FINAL_BOSS);assert.notEqual(bosses[6],'snake');}
 assert.deepEqual(pool,new Set(S.EARLY_BOSSES));
});

test('nine named bosses each carry independent background, dialogue and supported fixed special attacks',()=>{
 assert.equal(Object.keys(S.BOSSES).length,9);for(const [id,b]of Object.entries(S.BOSSES)){assert.equal(b.rank,'boss',id);assert.ok(b.lore&&b.lore.length>=20,id+'lore');assert.ok(Array.isArray(b.quotes)&&b.quotes.length>=1&&b.quotes.every(quote=>quote.length>=5),id+'quote');assert.equal(b.weights,undefined,id+'fixed sequence');assert.ok(b.intents.length>=3);assert.ok(b.intents.some(intent=>intent.poison||intent.counter||intent.clearMark||intent.clearChill||intent.clearBleed||intent.drawPenalty||intent.energyPenalty||intent.heal||intent.playerMark||intent.hits?.length>1),id+'special');}
});

for(const starter of['mark','sword','sovereign'])test('fixture: '+starter+' reaches all seven arrivals, final70 and exactly seven boss victories',()=>{
 const g=run(7,starter),s=g.state,arrivals=[];s.player.hp=s.player.maxHp=1000;
 for(let guard=0;!['victory','defeat'].includes(s.screen);guard++){
  assert.ok(guard<250);if(s.screen==='arrival'){arrivals.push(s.journey.regionIndex);assert.equal(g.enterNode(s.availableNodes[0]),false);assert.equal(g.enterRegion(),true);continue;}
  if(s.screen==='reward'){reward(g);continue;}
  assert.equal(s.screen,'map');const n=g.getAvailableNodes()[0];assert.ok(n);const next=n.next.slice();if(n.type==='boss'){assert.equal(g.enterNode(n.id),true);finisher(g);if(s.floor<70){assert.equal(s.screen,'reward');assert.ok(!s.result);}}else{n.type='rest';delete n.storyId;delete n.encounter;assert.equal(g.enterNode(n.id),true);assert.equal(g.rest(false),true);assert.deepEqual(s.availableNodes,next);}
 }
 assert.equal(s.screen,'victory');assert.equal(s.result.floor,70);assert.equal(s.result.enemy,N.ENEMIES[S.FINAL_BOSS].name);assert.equal(s.stats.chapterBosses,7);assert.equal(s.history.length,70);assert.deepEqual(arrivals,[0,1,2,3,4,5,6]);const snapshot=JSON.stringify(s);assert.equal(g.enterRegion(),false);assert.equal(g.enterNode('f70-0'),false);assert.equal(g.chooseReward(null),false);assert.equal(JSON.stringify(s),snapshot);
});

test('hidden route opens after final70 and never after early snake or third chapter30',()=>{
 const g=run(),s=g.state;Object.assign(s.journey.flags,{bellEcho:true,ritualName:true,emptyVow:true});restTo(g,30);g.enterNode(g.getAvailableNodes()[0].id);finisher(g);assert.equal(s.screen,'reward');assert.equal(s.stats.chapterBosses,3);reward(g);restTo(g,70);g.enterNode(g.getAvailableNodes()[0].id);finisher(g);assert.equal(s.screen,'threshold');assert.equal(s.history.length,70);assert.equal(g.startHiddenBoss(),true);finisher(g);assert.equal(s.screen,'victory');assert.equal(s.result.hiddenWin,true);assert.ok(g.getProfile().unlocks.includes('feiye'));assert.equal(s.history.length,70);
});

test('original NPC final encounter is scheduled once, then stops rewriting later realm events',()=>{
 const g=run(),s=g.state;s.journey.chain='liu';restTo(g,11);assert.ok(s.map[12].every(n=>n.storyId==='liu_return'));restTo(g,21);assert.ok(s.map[22].every(n=>n.storyId==='liu_final'));restTo(g,31);assert.ok(s.map[32].every(n=>n.storyId!=='liu_final'));restTo(g,41);assert.ok(s.map[42].every(n=>n.storyId!=='liu_final'));
});

test('twelve independent event definitions respect floor/region gates in scheduled maps and random event pools',()=>{
 const ids=Object.keys(S.EVENTS);assert.ok(ids.length>=12);assert.equal(new Set(ids).size,ids.length);for(const id of ids){assert.ok(N.EVENT_IDS.includes(id));assert.ok(!N.LEGACY_EVENT_IDS.includes(id));assert.ok(S.EVENTS[id].choices.length>=2);assert.ok(S.EVENTS[id].story.length>=2);}
 for(let seed=1;seed<=40;seed++){const g=run(seed),s=g.state;for(const n of s.map.flat()){const d=S.EVENTS[n.storyId];if(!d)continue;if(d.minFloor)assert.ok(n.floor>=d.minFloor);if(d.maxFloor)assert.ok(n.floor<=d.maxFloor);if(Number.isInteger(d.regionIndex))assert.equal(n.regionIndex,d.regionIndex);}
  for(const floor of[2,12,22,32,42,52,62]){const n=s.map[floor-1][0];s.screen='map';s.floor=floor;s.journey.regionIndex=Math.floor((floor-1)/10);s.availableNodes=[n.id];s.history=[];n.revealed=true;n.type='event';delete n.storyId;delete n.encounter;g.enterNode(n.id);const d=S.EVENTS[s.event.id];if(d){if(d.minFloor)assert.ok(floor>=d.minFloor);if(d.maxFloor)assert.ok(floor<=d.maxFloor);if(Number.isInteger(d.regionIndex))assert.equal(s.journey.regionIndex,d.regionIndex);}}
 }
});

test('each new event resolves actual choices once, keeping coins, items and own-class skill rewards real',()=>{
 for(const id of Object.keys(S.EVENTS))for(const starter of['mark','sword','sovereign']){
  const g=run(5,starter),p=g.state.player;p.gold=1000;p.hp=40;const event=eventFixture(g,id),fixed=JSON.stringify(event);assert.equal(g.chooseEvent(-1),false);assert.equal(JSON.stringify(event),fixed);const index=event.choices.findIndex(c=>!c.disabled),choice=event.choices[index],before={gold:p.gold,hp:p.hp,deck:p.deck.length,inventory:{...p.inventory}};assert.ok(index>=0);assert.equal(g.chooseEvent(index),true);assert.equal(p.gold,before.gold-(choice.goldCost||0)+(choice.goldGain||0));for(const grant of choice.itemGrants||[])assert.equal(p.inventory[grant.id],(before.inventory[grant.id]||0)+(grant.count||grant.amount||1));for(const cardId of choice.cardIds||[])assert.equal(N.CARDS[cardId].character,g.state.character);assert.equal(p.deck.length,before.deck+(choice.cardIds||[]).length-(choice.removeBasic?1:0));const snapshot=JSON.stringify(g.state);assert.equal(g.chooseEvent(index),false);assert.equal(JSON.stringify(g.state),snapshot);assert.equal(g.leaveEvent(),true);assert.ok(p.hp>0&&p.hp<=p.maxHp&&p.gold>=0);
 }
});

test('seven-region restart restores original resources and selected campaign without residual progress',()=>{
 const g=run(),s=g.state;s.player.hp=2;s.player.gold=999;s.player.inventory={antidote:9};s.player.path.fallen=true;s.journey.flags.bellEcho=true;restTo(g,41);assert.equal(g.newRun('sword'),true);assert.equal(g.state.totalFloors,70);assert.equal(g.state.screen,'arrival');assert.equal(g.state.player.hp,60);assert.equal(g.state.player.gold,60);assert.deepEqual(g.state.player.inventory,{herb:2});assert.equal(g.state.player.path.fallen,false);assert.deepEqual(g.state.journey.flags,{});assert.equal(g.state.history.length,0);
});
