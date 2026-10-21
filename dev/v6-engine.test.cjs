/* Legacy fixtures isolate card rules from regional debuffs; v7 tests cover enabled environments. */
/* V6 region progression and causal encounters. Mutating helpers below are fixtures;
 * the final test advances through all regions using public actions only. */
'use strict';
const test=require('node:test'), assert=require('node:assert/strict');
const {createGame,REGIONS,NPCS,EVENT_IDS:ALL_EVENT_IDS,CHAIN_EVENT_IDS,ENEMIES,TREASURE_RELICS}=require('./engine.js');
const EVENT_IDS=ALL_EVENT_IDS.filter(id=>!['moon_trace','sealed_name','moon_vow','armory','sovereign_wake','sovereign_recall','sovereign_memory','tainted_mercy','demonic_offer','demonic_warning','mirror_trial','demon_manual','fallen_hunt'].includes(id));
const {nextCard}=require('./playtest.cjs');
function random(seed=7){let n=seed>>>0;return()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296);}
function run(seed=7,starter='sword'){const g=createGame({environment:false,rng:random(seed)});g.newRun(starter);return g;}
function regionFor(floor){return REGIONS.findIndex(r=>floor>=r.stages[0]&&floor<=r.stages[1]);}
function eventAt(g,id,{poor=false}={}){
  const floor=id.endsWith('_first')?3:id.endsWith('_return')?13:id.endsWith('_final')?23:6;
  const s=g.state,node=s.map[floor-1].find(n=>n.type==='event')||s.map[floor-1][0];node.type='event';delete node.encounter;
  assert.ok(node,id);s.floor=floor;s.screen='map';s.journey.regionIndex=regionFor(floor);
  node.revealed=true;node.storyId=id;s.availableNodes=[node.id];s.history=s.history.filter(h=>h.floor!==floor);
  if(poor){s.player.hp=1;s.player.gold=0;s.player.deck=s.player.deck.slice(0,5);}
  assert.equal(g.enterNode(node.id),true);assert.equal(s.event.id,id);return s.event;
}
function battleFixture(g,floor=7){
  const s=g.state,node=s.map[floor-1].find(n=>n.type==='fight')||s.map[floor-1][0];if(node.type!=='boss'){node.type='fight';delete node.storyId;delete node.encounter;}assert.ok(node);
  s.floor=floor;s.screen='map';s.journey.regionIndex=regionFor(floor);node.revealed=true;
  s.availableNodes=[node.id];s.history=s.history.filter(h=>h.floor!==floor);assert.equal(g.enterNode(node.id),true);return s.battle;
}
function killFixture(g){const s=g.state,b=s.battle;b.enemy.hp=1;b.enemy.block=0;b.energy=3;b.hand=[{id:s.character==='sword'?'S01':'C01',uid:'fixture-finisher'}];assert.equal(g.playCard('fixture-finisher',true),true);}
function finishReward(g){if(g.state.reward.relicPending)assert.equal(g.chooseRelic(g.state.reward.relicChoices[0]),true);assert.equal(g.chooseReward(null),true);}
function resolve(g,index){assert.equal(g.chooseEvent(index),true);assert.equal(g.chooseEvent(index),false);}

test('three distinct regions, 27 event definitions and adult named disciples are exported',()=>{
  assert.equal(REGIONS.length,3);assert.deepEqual(REGIONS.map(r=>r.stages),[[1,10],[11,20],[21,30]]);
  assert.equal(new Set(REGIONS.map(r=>r.id)).size,3);assert.equal(EVENT_IDS.length,27);assert.equal(new Set(EVENT_IDS).size,27);assert.equal(CHAIN_EVENT_IDS.length,9);
  for(const id of ['liu','ji','wen'])assert.equal(NPCS[id].adult,true);
  assert.equal(ENEMIES.raider.hp,42);assert.deepEqual(ENEMIES.raider.intents.map(x=>x.hits),[[7],[6],[6,6]]);
});

test('arrival gates actions and reveals exactly the first region; cannot enter a future or previous node',()=>{
  const g=run(),s=g.state;assert.equal(s.screen,'arrival');assert.equal(s.map.flat().filter(n=>n.revealed).length,0);
  assert.deepEqual(g.getAvailableNodes(),[]);assert.equal(g.enterNode('f1-0'),false);assert.equal(g.enterNode('f11-0'),false);
  assert.equal(g.enterRegion(),true);assert.equal(g.enterRegion(),false);assert.ok(s.map.slice(0,10).flat().every(n=>n.revealed));assert.ok(s.map.slice(10).flat().every(n=>!n.revealed));
  assert.equal(g.enterNode('f11-0'),false);assert.equal(g.enterNode('f1-0'),true);assert.equal(g.enterNode('f1-0'),false);
});

test('1000 maps have connected forward paths, every opening NPC reachable, and at least four battles',()=>{
  for(let seed=1;seed<=1000;seed++){
    const g=run(seed),s=g.state,all=s.map.flat(),byId=Object.fromEntries(all.map(n=>[n.id,n]));
    const seen=new Set(['f1-0']),minimum=new Map([['f1-0',1]]);assert.equal(s.map.length,30);
    assert.deepEqual(new Set(s.map[2].map(n=>n.storyId)),new Set(['liu_first','ji_first','wen_first']));
    assert.equal(s.map[0][0].next.length,s.map[1].length);assert.ok(s.map.flat().length>=120);
    for(const row of s.map)for(const n of row){assert.ok(seen.has(n.id));assert.equal(n.regionIndex,regionFor(n.floor));
      if(n.floor<30)assert.ok(n.next.length>0);for(const id of n.next){const next=byId[id];assert.equal(next.floor,n.floor+1);seen.add(id);minimum.set(id,Math.min(minimum.get(id)??Infinity,minimum.get(n.id)+(['fight','elite','boss'].includes(next.type)?1:0)));}}
    assert.equal(seen.size,all.length);assert.ok(minimum.get('f30-0')>=6);assert.ok(all.filter(n=>n.type==='fox').every(n=>seen.has(n.id)));
  }
});

test('crossing a region opens an arrival screen, prepares only chosen NPC sequel, and rejects boundary skipping',()=>{
  const g=run(),s=g.state;g.enterRegion();eventAt(g,'liu_first');resolve(g,0);assert.equal(g.leaveEvent(),true);
  battleFixture(g,10);killFixture(g);finishReward(g);assert.equal(s.floor,11);assert.equal(s.screen,'arrival');assert.equal(s.journey.regionIndex,1);
  assert.ok(s.map[12].every(n=>n.storyId==='liu_return'&&!n.revealed));assert.ok(s.map[22].every(n=>!n.storyId&&!n.revealed));
  assert.equal(g.enterNode(s.availableNodes[0]),false);assert.equal(g.enterRegion(),true);assert.ok(s.map.slice(10,20).flat().every(n=>n.revealed));
  assert.ok(s.map.slice(20).flat().every(n=>!n.revealed));assert.equal(g.enterNode('f3-0'),false);assert.equal(g.enterNode(s.availableNodes[0]),true);killFixture(g);finishReward(g);eventAt(g,'liu_return');assert.equal(s.event.id,'liu_return');
  assert.equal(s.journey.journal.filter(e=>e.npc==='liu').length,1);assert.ok(s.journey.journal.every(e=>e.floor<=s.floor));
});

test('Liu help by life or gold is remembered and produces free healing and one-shot battle aid',()=>{
  for(const index of [0,1]){
    const g=run(),s=g.state,p=s.player;eventAt(g,'liu_first');const before={hp:p.hp,gold:p.gold};resolve(g,index);
    assert.equal(s.journey.flags.liuAid,true);assert.equal(p.hp,before.hp-(index===0?6:0));assert.equal(p.gold,before.gold-(index===1?15:0));g.leaveEvent();
    p.hp=20;eventAt(g,'liu_return');assert.equal(s.event.choices[0].goldCost,undefined);resolve(g,0);assert.equal(p.hp,38);assert.equal(s.journey.nextCombatBlock,8);g.leaveEvent();
    const b=battleFixture(g);assert.equal(b.block,8);assert.equal(s.journey.nextCombatBlock,0);assert.ok(b.logs.some(x=>x.includes('故人留下的护符')));
    g.endTurn();g.resolveEnemyTurn();assert.equal(b.block,0);killFixture(g);finishReward(g);
    const next=battleFixture(g,16);assert.equal(next.block,0);
    eventAt(g,'liu_final');assert.match(s.event.story.join(''),/等|药灯/);p.hp=20;resolve(g,0);assert.equal(p.hp,32);assert.equal(s.journey.nextCombatBlock,12);assert.equal(s.journey.relationships.liu.status,'生死之交');
  }
});

test('Liu refusal does not grant aid; later night watch can earn trust; poor visits have safe exits',()=>{
  const g=run(),s=g.state;eventAt(g,'liu_first');resolve(g,2);g.leaveEvent();eventAt(g,'liu_return');assert.equal(s.event.choices[0].goldCost,15);
  resolve(g,1);assert.equal(s.journey.flags.liuAid,true);g.leaveEvent();eventAt(g,'liu_final');assert.equal(s.event.choices[0].guard,12);
  const poor=run();for(const id of ['liu_first','liu_return','liu_final']){eventAt(poor,id,{poor:true});const safe=poor.state.event.choices.findIndex(c=>!c.disabled&&!c.battle&&!c.hpCost&&!c.goldCost);assert.ok(safe>=0);resolve(poor,safe);assert.ok(poor.state.player.hp>0);poor.leaveEvent();}
});

test('Ji hidden disposition is fixed for the run and first-meeting journal reveals only known facts',()=>{
  const intents=new Set();for(let seed=1;seed<30;seed++){const g=run(seed),s=g.state;const fixed=s.journey.hidden.jiIntent;intents.add(fixed);
    eventAt(g,'ji_first');resolve(g,0);assert.equal(s.journey.hidden.jiIntent,fixed);assert.equal(s.journey.chain,'ji');assert.equal(s.journey.step,1);
    assert.doesNotMatch(s.journey.journal.map(x=>x.text).join(''),/夺宝剑客|将来.*伏击|真实.*贪婪/);g.leaveEvent();eventAt(g,'ji_return');assert.equal(s.journey.hidden.jiIntent,fixed);
    const copy=JSON.stringify(s.event);g.chooseEvent(-1);assert.equal(JSON.stringify(s.event),copy);
    assert.match(s.event.risk,fixed==='greedy'?/脚印不止一串/:/退开半步/);
  }assert.deepEqual(intents,new Set(['grateful','greedy']));
});

test('helped grateful Ji repays with own-class rare card and guard; hidden greedy Ji needs exposure to rob',()=>{
  for(const starter of ['mark','sword'])for(const disposition of ['grateful','greedy'])for(const exposed of [false,true]){
    const g=run(3,starter),s=g.state;eventAt(g,'ji_first');resolve(g,0);g.leaveEvent();s.journey.hidden.jiIntent=disposition;
    eventAt(g,'ji_return');resolve(g,exposed?0:2);g.leaveEvent();eventAt(g,'ji_final');const e=s.event;
    assert.equal(!!e.choices[0].battle,disposition==='greedy'&&exposed);
    if(disposition==='grateful'){assert.ok(e.choices[0].cardIds.length===1);assert.equal(e.choices[0].cardIds[0][0],starter==='sword'?'S':'C');assert.equal(e.choices[0].guard,10);}
    if(disposition==='greedy'&&!exposed){assert.ok(e.choices.every(c=>!c.battle));assert.doesNotMatch(e.story.join(''),/没有摸清|没找到值得下手|知道.*宝物.*没有/);}
  }
});

test('robbery starts actual combat, retains treasure, grants rewards once, and advances same event node once',()=>{
  const g=run(),s=g.state;eventAt(g,'ji_first');resolve(g,0);g.leaveEvent();s.journey.hidden.jiIntent='greedy';
  eventAt(g,'ji_return');resolve(g,0);g.leaveEvent();eventAt(g,'ji_final');const held=s.player.relics.slice(),floor=s.floor;
  resolve(g,0);assert.equal(s.screen,'event');assert.equal(s.event.battle.enemyId,'raider');assert.equal(g.leaveEvent(),true);
  assert.equal(s.screen,'battle');assert.equal(s.battle.enemy.name,'季临川');assert.equal(s.battle.enemy.hp,42);assert.equal(g.leaveEvent(),false);
  assert.deepEqual(g.getIntent().hits,[7]);const before=s.player.gold;killFixture(g);assert.equal(s.screen,'reward');assert.equal(s.player.gold,before+20);assert.deepEqual(s.player.relics,held);
  assert.equal(g.playCard('fixture-finisher',true),false);assert.equal(s.player.gold,before+20);assert.equal(s.history.filter(x=>x.floor===floor).length,0);
  finishReward(g);assert.equal(s.floor,floor+1);assert.equal(s.history.filter(x=>x.floor===floor).length,1);assert.equal(g.chooseReward(null),false);assert.equal(g.leaveEvent(),false);
  assert.equal(s.journey.relationships.ji.status,'交锋已了');assert.ok(s.journey.journal.some(x=>x.title==='伏击已破'));
});

test('robbery battle can actually kill the player without rewards or advancing',()=>{
  const g=run(),s=g.state;s.journey.flags.jiExposed=true;s.journey.hidden.jiIntent='greedy';eventAt(g,'ji_final');resolve(g,0);g.leaveEvent();s.player.hp=1;s.battle.block=0;
  const gold=s.player.gold;assert.equal(g.endTurn(),true);assert.equal(g.resolveEnemyTurn(),true);assert.equal(s.screen,'defeat');assert.equal(s.player.hp,0);assert.equal(s.player.gold,gold);assert.equal(s.result.floor,23);assert.equal(s.result.enemy,'季临川');assert.equal(s.history.filter(h=>h.floor===23).length,0);
});

test('robbery pay and blood escapes preserve every relic, charge once, and avoid combat',()=>{
  for(const index of [1,2]){
    const g=run(),s=g.state;s.journey.flags.jiExposed=true;s.journey.hidden.jiIntent='greedy';s.player.relics.push('mirror');eventAt(g,'ji_final');
    const before=structuredClone(s.player);resolve(g,index);assert.deepEqual(s.player.relics,before.relics);assert.equal(s.player.gold,before.gold-(index===1?35:0));assert.equal(s.player.hp,before.hp-(index===2?8:0));
    assert.equal(g.leaveEvent(),true);assert.equal(s.screen,'map');assert.equal(s.floor,24);assert.equal(s.journey.flags.jiEscaped,true);
  }
});

test('freeing Wen creates tracking; washing it removes later combat while keeping evidence',()=>{
  const g=run(),s=g.state;eventAt(g,'wen_first');assert.equal(s.event.risk,undefined);assert.doesNotMatch(s.event.choices.map(c=>c.text).join(''),/之后.*追猎|留下.*追踪/);resolve(g,0);g.leaveEvent();assert.equal(s.journey.flags.wenFreed,true);
  eventAt(g,'wen_return');resolve(g,0);assert.equal(s.journey.flags.wenCleansed,true);g.leaveEvent();eventAt(g,'wen_final');assert.ok(s.event.choices.every(c=>!c.battle));
  resolve(g,0);assert.equal(s.journey.flags.wenEvidence,true);assert.equal(s.journey.nextCombatBlock,8);assert.equal(s.journey.relationships.wen.status,'证词同行者');
});

test('unwashed tracking reaches a real hunter later, with alternate exits while displaying only observed clues',()=>{
  for(const firstChoice of [0,2]){
    const g=run(),s=g.state;eventAt(g,'wen_first');resolve(g,0);g.leaveEvent();eventAt(g,'wen_return');resolve(g,firstChoice===0?1:2);g.leaveEvent();eventAt(g,'wen_final');
    assert.doesNotMatch(s.event.connection||'',/断锁救人.*没有.*洗/);assert.equal(s.event.choices[0].battle.name,'黑衣人');
    resolve(g,0);g.leaveEvent();assert.equal(s.battle.enemy.id,'raider');assert.equal(s.battle.enemy.name,'黑衣人');killFixture(g);assert.equal(s.screen,'reward');
  }
  for(const index of [1,2]){const g=run(),s=g.state;s.journey.flags.wenFreed=true;eventAt(g,'wen_final');const before=structuredClone(s.player);resolve(g,index);assert.equal(s.journey.flags.wenCleansed,true);assert.deepEqual(s.player.relics,before.relics);g.leaveEvent();assert.equal(s.floor,24);assert.equal(s.screen,'map');}
});

test('buying records without rescue leaves no tracking and maintains future payoff',()=>{
  const g=run(),s=g.state;eventAt(g,'wen_first');resolve(g,1);assert.equal(s.journey.flags.wenFreed,false);assert.equal(s.journey.nextCombatBlock,6);g.leaveEvent();eventAt(g,'wen_return');assert.ok(s.event.choices.every(c=>!c.flags?.wenFreed));resolve(g,1);g.leaveEvent();eventAt(g,'wen_final');assert.ok(s.event.choices.every(c=>!c.battle));assert.match(s.event.story.join(''),/记住/);
});

test('all 27 event builders and enabled choices apply once for both professions, including poor fixtures',()=>{
  for(const starter of ['mark','sword'])for(const id of EVENT_IDS){
    const g=run(55,starter),s=g.state;s.player.hp=s.player.maxHp=200;s.player.gold=1000;
    const e=eventAt(g,id);assert.ok(e.choices.length>=2);assert.ok(e.story.length>=2);assert.ok(e.name);assert.equal(g.leaveEvent(),false);
    for(let index=0;index<e.choices.length;index++){
      const x=run(55,starter),t=x.state;t.player.hp=t.player.maxHp=200;t.player.gold=1000;eventAt(x,id);const c=t.event.choices[index];if(c.disabled)continue;
      const original=structuredClone(t.player);resolve(x,index);const after=JSON.stringify(t.player);assert.equal(x.chooseEvent(index),false);assert.equal(JSON.stringify(t.player),after);
      assert.ok(t.player.hp>0&&t.player.hp<=t.player.maxHp&&t.player.gold>=0&&t.player.deck.length>=5);
      for(const card of c.cardIds||[])assert.equal(card[0],starter==='sword'?'S':'C');
      assert.equal(t.player.gold,original.gold-(c.goldCost||0)+(c.goldGain||0)+(Object.hasOwn(c,'relic')&&!c.relic?(c.fallbackGold||60):0));
      assert.equal(x.leaveEvent(),true);assert.equal(t.screen,c.battle?'battle':([10,20].includes(t.floor-1)?'arrival':'map'));
    }
    const poor=run(55,starter);eventAt(poor,id,{poor:true});const available=poor.state.event.choices.findIndex(c=>!c.disabled);assert.ok(available>=0);assert.equal(poor.chooseEvent(available),true);assert.ok(poor.state.player.hp>0);
  }
});

test('optional random events exclude unintroduced story sequels and favor unseen encounters',()=>{
  const g=run(),s=g.state,seen=[];s.seenEvents=ALL_EVENT_IDS.filter(id=>!EVENT_IDS.includes(id));
  for(let i=0;i<EVENT_IDS.length-CHAIN_EVENT_IDS.length;i++){
    const node=s.map[5][0];node.type='event';delete node.encounter;delete node.storyId;s.floor=6;s.screen='map';s.journey.regionIndex=0;node.revealed=true;s.availableNodes=[node.id];s.history=[];
    assert.equal(g.enterNode(node.id),true);assert.ok(!CHAIN_EVENT_IDS.includes(s.event.id));seen.push(s.event.id);const ix=s.event.choices.findIndex(c=>!c.disabled&&!c.battle);resolve(g,ix);g.leaveEvent();
  }
  assert.equal(new Set(seen).size,18);assert.equal(s.journey.chain,null);
});

test('restart clears previous chain, revealed map, pending aid, relations and consumed state',()=>{
  const g=run(),old=g.state;eventAt(g,'ji_first');resolve(g,1);g.leaveEvent();eventAt(g,'ji_return');resolve(g,0);g.leaveEvent();
  assert.ok(old.journey.journal.length>0);assert.ok(old.journey.nextCombatBlock>0);g.newRun('mark');const s=g.state;
  assert.notEqual(s,old);assert.equal(s.screen,'arrival');assert.equal(s.floor,1);assert.equal(s.player.hp,60);assert.equal(s.player.maxHp,60);assert.equal(s.player.gold,60);assert.equal(s.player.deck.length,10);assert.deepEqual(s.player.relics,['bell']);
  assert.deepEqual(s.journey.flags,{});assert.deepEqual(s.journey.relationships,{});assert.deepEqual(s.journey.journal,[]);assert.equal(s.journey.nextCombatBlock,0);assert.equal(s.journey.chain,null);assert.equal(s.journey.step,0);assert.equal(s.journey.regionIndex,0);assert.ok(s.map.flat().every(n=>!n.revealed));assert.deepEqual(s.history,[]);assert.deepEqual(s.seenEvents,[]);assert.equal(s.battle,null);assert.equal(s.event,null);
});

test('public actions naturally cross all three regions and finish chosen story with both professions',()=>{
  // No fixtures/resources/route mutation: heuristic reads visible battle state,
  // chooses legal cards and handles each node through public game actions.
  for(const starter of ['mark','sword']){
    let successful=false;
    for(let seed=1;seed<=12&&!successful;seed++){
      const g=run(seed,starter),s=g.state,regions=[];
      for(let step=0;step<4000&&!['victory','defeat'].includes(s.screen);step++){
        if(s.screen==='arrival'){regions.push(s.journey.regionIndex);assert.equal(g.enterRegion(),true);continue;}
        if(s.screen==='battle'){const c=nextCard(s);if(c)assert.equal(g.playCard(c.uid,true),true);else {assert.equal(g.endTurn(),true);assert.equal(g.resolveEnemyTurn(),true);}continue;}
        if(s.screen==='reward'){if(s.reward.relicPending)g.chooseRelic(s.reward.relicChoices[0]);g.chooseReward(s.reward.cards[0]);continue;}
        if(s.screen==='event'){if(!s.event.resolved){const choices=s.event.choices;const index=choices.findIndex(c=>!c.disabled&&!c.battle&&!c.hpCost);g.chooseEvent(index>=0?index:choices.findIndex(c=>!c.disabled));}else g.leaveEvent();continue;}
        if(s.screen==='rest'){g.rest(true);continue;}if(s.screen==='shop'){g.leaveShop();continue;}if(s.screen==='fox'){g.fox(false);continue;}
        assert.equal(s.screen,'map');const priority={rest:90,event:70,shop:50,fox:40,fight:30,elite:10,boss:0};const candidates=g.getAvailableNodes();
        candidates.sort((a,b)=>priority[b.type]-priority[a.type]);let n=candidates.find(n=>n.storyId==='liu_first')||candidates[0];assert.ok(n);assert.equal(g.enterNode(n.id),true);
      }
      if(s.journey.step===3){assert.deepEqual(regions,[0,1,2]);assert.ok(s.journey.chain);assert.equal(s.journey.journal.filter(e=>e.npc===s.journey.chain).length,3);assert.equal(new Set(s.history.map(h=>h.floor)).size,s.history.length);successful=true;}
    }
    assert.equal(successful,true,starter+' did not naturally complete story');
  }
});
