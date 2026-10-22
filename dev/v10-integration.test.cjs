/* Arranged integration boundary fixtures. These tests deliberately arrange map
 * types, wounds, inventory and hands; they are not natural-playthrough claims. */
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const N=require('./engine.js');
let uid=0;
function setup(starter='mark'){
 let seed=101,queue=[];const rng=()=>queue.length?queue.shift():((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 const game=N.createGame({rng,environment:false});assert.equal(game.newRun(starter),true);assert.equal(game.enterRegion(),true);
 return {game,roll:(...values)=>queue=values};
}
function node(game,type,enemyId='paper'){
 assert.equal(game.state.screen,'map');const n=game.getAvailableNodes()[0];assert.ok(n);n.type=type;delete n.storyId;delete n.encounter;
 if(type==='fight'||type==='elite')n.encounter={enemyId,kind:type};assert.equal(game.enterNode(n.id),true);return n;
}
function play(game,id){const card={id,uid:'v10-integration-'+(++uid)};game.state.battle.hand.push(card);assert.equal(game.playCard(card.uid,true),true);}
function win(game){const b=game.state.battle;b.enemy.hp=1;b.enemy.block=0;b.energy=3;play(game,'C01');assert.equal(game.state.screen,'reward');}
function advanceReward(game){if(game.state.reward.relicPending)assert.equal(game.chooseRelic(game.state.reward.relicChoices[0]),true);assert.equal(game.chooseReward(null),true);}

test('integration: every profession and all 20 templates keep ten-stage chapters with reachable cave choices',()=>{
 for(const starter of ['mark','combo','blood','sword','sovereign'])for(let template=0;template<20;template++){
  const game=N.createGame({routeTemplate:template,profile:{version:1,unlocks:['feiye']},rng:()=>.4});assert.equal(game.newRun(starter),true);
  assert.deepEqual(game.state.player.inventory,{herb:2});assert.equal(game.state.player.pendingPillPower,0);
  for(let chapter=0;chapter<3;chapter++){
   const rows=game.state.map.slice(chapter*10,chapter*10+10),all=rows.flat();assert.equal(rows.length,10);assert.ok(all.length>=40);assert.ok(all.some(n=>n.type==='cave'));
   const reachable=new Set([rows[0][0].id]);for(const row of rows)for(const n of row)if(reachable.has(n.id))for(const next of n.next)reachable.add(next);
   for(const n of all.filter(n=>n.type==='cave'))assert.ok(reachable.has(n.id));assert.equal(rows[9][0].type,'boss');
  }
 }
});

test('integration: cave treasure is fixed, immediately functional, and advances one linked node only',()=>{
 const f=setup(),g=f.game;f.roll(.95,.99);const entered=node(g,'cave'),original=structuredClone(g.state.cave.outcome);assert.equal(g.state.cave.result,null);assert.equal(g.state.player.relics.length,1);
 for(let i=0;i<4;i++)g.getInventory();assert.deepEqual(g.state.cave.outcome,original);assert.equal(g.enterNode(entered.id),false);
 assert.equal(g.exploreCave(),true);assert.equal(g.state.cave.result.rewards[0].kind,'relic');const relic=g.state.cave.result.rewards[0].id;assert.ok(g.state.player.relics.includes(relic));assert.equal(g.state.player.relics.length,2);assert.equal(g.exploreCave(),false);
 assert.equal(g.leaveCave(),true);assert.equal(g.state.floor,2);assert.equal(g.state.history.length,1);assert.equal(g.state.history[0].type,'cave');assert.deepEqual(g.state.availableNodes,entered.next);assert.equal(g.leaveCave(),false);assert.equal(g.state.cave,null);
});

test('integration: guarded cave awards extra medicine only after combat victory and shows reward receipt',()=>{
 const f=setup(),g=f.game;f.roll(.1,0,0);node(g,'cave');const pending=g.state.cave.outcome.rewards[0];assert.equal(g.state.player.inventory[pending.id],undefined);
 assert.equal(g.exploreCave(),true);assert.equal(g.state.screen,'battle');assert.equal(g.state.battle.caveNodeId,g.state.cave.nodeId);assert.equal(g.leaveCave(),false);assert.equal(g.state.player.inventory[pending.id],undefined);
 win(g);assert.equal(g.state.player.inventory[pending.id],1);assert.equal(g.state.player.gold,80);assert.equal(g.state.reward.caveLoot.rewards[0].id,pending.id);const snapshot=JSON.stringify(g.state);assert.equal(g.resolveEnemyTurn(),false);assert.equal(g.exploreCave(),false);assert.equal(JSON.stringify(g.state),snapshot);
 advanceReward(g);assert.equal(g.state.history.length,1);assert.equal(g.state.floor,2);assert.equal(g.state.cave,null);assert.equal(g.state.player.inventory[pending.id],1);assert.equal(g.chooseReward(null),false);
});

test('integration: cave battle defeat has no guard cache, no reward, and no posthumous item use',()=>{
 const f=setup(),g=f.game;f.roll(.1,0,0);node(g,'cave');const pending=g.state.cave.outcome.rewards[0];g.exploreCave();g.state.player.hp=1;g.state.battle.block=0;assert.equal(g.endTurn(),true);assert.equal(g.resolveEnemyTurn(),true);assert.equal(g.state.screen,'defeat');assert.equal(g.state.player.inventory[pending.id],undefined);assert.equal(g.state.reward,null);assert.equal(g.state.player.gold,60);assert.equal(g.useItem('herb'),false);assert.equal(g.leaveCave(),false);
});

test('integration: next-battle damage pill buffs only first hit, then expires at victory and cannot be replayed',()=>{
 const f=setup(),g=f.game,p=g.state.player;p.inventory.battle_pill=1;assert.equal(g.useItem('battle_pill'),true);assert.equal(p.pendingPillPower,2);node(g,'fight');let b=g.state.battle;assert.equal(p.pendingPillPower,0);assert.equal(b.pillPower,2);b.enemy.hp=b.enemy.maxHp=1000;b.energy=3;play(g,'C05');assert.deepEqual(b.events.filter(e=>e.type==='attack'&&e.target==='enemy').map(e=>e.amount),[5,3,3]);
 win(g);assert.equal(b.pillPower,0);advanceReward(g);node(g,'fight');b=g.state.battle;assert.equal(b.pillPower,0);assert.equal(p.pendingPillPower,0);b.enemy.hp=b.enemy.maxHp=1000;play(g,'C05');assert.deepEqual(b.events.filter(e=>e.type==='attack'&&e.target==='enemy').map(e=>e.amount),[3,3,3]);
});

test('integration: actual battle item lock shares the turn and releases only on new player turn',()=>{
 const {game:g}=setup();node(g,'fight');const b=g.state.battle,p=g.state.player;p.hp=20;p.inventory.spirit_pill=1;const energy=b.energy;assert.equal(g.useItem('herb'),true);assert.equal(p.hp,26);assert.equal(b.energy,energy);assert.equal(g.useItem('spirit_pill'),false);assert.equal(p.inventory.spirit_pill,1);
 assert.equal(g.endTurn(),true);assert.equal(g.useItem('spirit_pill'),false);assert.equal(g.resolveEnemyTurn(),true);const before=b.energy;assert.equal(g.useItem('spirit_pill'),true);assert.equal(b.energy,before+2);assert.equal(g.useItem('herb'),false);
});

test('integration: antidote permanently removes chronic poison and battle poison through later turns and nodes',()=>{
 const {game:g}=setup('sword');node(g,'fight');const p=g.state.player,b=g.state.battle;p.affliction={active:true,revealed:true,ticks:7,suppressed:0};p.inventory.antidote=1;p.hp=50;b.poison=6;assert.equal(g.useItem('antidote'),true);assert.equal(p.hp,50);assert.equal(p.affliction.active,false);assert.equal(b.poison,0);b.block=99;g.endTurn();g.resolveEnemyTurn();assert.equal(p.affliction.ticks,7);assert.equal(p.hp,50);win(g);advanceReward(g);node(g,'rest');assert.equal(p.hp,50);assert.equal(p.affliction.ticks,7);
});

test('integration: real shops fixed supply stock uses one purchase, and carried medicines survive the next node',()=>{
 const {game:g}=setup();node(g,'shop');const items=structuredClone(g.state.shop.items);assert.equal(items.length,2);assert.notEqual(items[0].id,items[1].id);const item=items[0],before=g.state.player.inventory[item.id]||0;assert.equal(g.buyItem(0),true);const gold=60-item.price;assert.equal(g.state.player.gold,gold);assert.equal(g.state.player.inventory[item.id],before+1);assert.equal(g.buyItem(0),false);for(let i=0;i<5;i++)g.getInventory();assert.equal(g.state.shop.items[1].id,items[1].id);assert.equal(g.leaveShop(),true);node(g,'fight');assert.equal(g.state.player.inventory[item.id],before+1);assert.equal(g.state.player.gold,gold);assert.equal(g.buyItem(1),false);
});

test('integration: opening a guarded cave while already dying keeps death result and gives no rewards',()=>{
 const f=setup('sword'),g=f.game;f.roll(.1,0,0);node(g,'cave');g.state.player.hp=1;g.state.player.affliction={active:true,revealed:true,ticks:0,suppressed:0};assert.equal(g.exploreCave(),true);assert.equal(g.state.screen,'defeat');assert.equal(g.state.player.hp,0);assert.equal(g.state.player.gold,60);assert.deepEqual(g.state.player.inventory,{herb:2});assert.match(g.state.notice,/倒在/);assert.equal(g.exploreCave(),false);
});

test('integration: restart clears inventory changes, poison, medicine, cave and run progression',()=>{
 const f=setup('sword'),g=f.game;g.state.player.inventory={fullheal_pill:4,battle_pill:2};g.useItem('battle_pill');f.roll(.6,.7,.4);node(g,'cave');g.exploreCave();g.state.player.affliction.active=true;g.state.player.hp=3;assert.equal(g.newRun('sword'),true);assert.equal(g.state.screen,'arrival');assert.equal(g.state.player.hp,60);assert.equal(g.state.player.gold,60);assert.deepEqual(g.state.player.inventory,{herb:2});assert.equal(g.state.player.pendingPillPower,0);assert.equal(g.state.player.affliction.active,false);assert.equal(g.state.cave,null);assert.equal(g.state.battle,null);assert.deepEqual(g.state.history,[]);
});
