/* V11 explicit rule fixtures: not natural victories or balance claims. */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const N=require('./engine.js');let uid=0;
function fixture(id='paper',floor=1,kind='fight',extra={}){
 let fixed=.81,calls=0;const game=N.createGame({environment:false,...extra,rng:()=>{calls++;return fixed;}});game.newRun('mark');
 const s=game.state,node=s.map[Math.min(floor,s.map.length)-1][0];s.floor=node.floor;s.journey.regionIndex=node.regionIndex;s.screen='map';s.availableNodes=[node.id];s.history=[];node.revealed=true;node.type=kind;node.encounter={enemyId:id};game.enterNode(node.id);
 return {game,b:game.state.battle,setRandom:v=>{fixed=v;},calls:()=>calls};
}
function play(f,id){const card={id,uid:'v11-balance-'+(++uid)};f.b.hand.push(card);f.b.energy=99;assert.equal(f.game.playCard(card.uid,true),true);}
function turn(f){f.game.endTurn();assert.equal(f.game.resolveEnemyTurn(),true);}
function keepAlive(f){f.game.state.player.hp=f.game.state.player.maxHp=100000;f.b.enemy.hp=f.b.enemy.maxHp=100000;f.b.hand=[];f.b.draw=Array.from({length:600},(_,i)=>({id:'C01',uid:'long-draw-'+i}));f.b.discard=[];}

test('BALANCE exports exact audited coefficients, cap and whitelist without magic defaults',()=>{
 assert.equal(N.BALANCE.hpSlope,.05);assert.equal(N.BALANCE.hpMaxFloor,30);assert.equal(N.BALANCE.atkStep,.25);assert.equal(N.BALANCE.atkCapNormal,4);assert.equal(N.BALANCE.atkCapElite,6);assert.equal(N.BALANCE.atkCapBoss,0);assert.equal(N.BALANCE.firstHitBonusCap,8);
 for(const id of ['paper','lantern','ape','bone','yaksha','e_mist','e_lantern','e_priest','gate_boss','camp_boss','snake'])assert.ok(N.BALANCE.scalingWhitelist.includes(id));
});
for(const [id,expected]of Object.entries({paper:[26,38,51,64],lantern:[28,41,55,69],ape:[32,46,62,78],bone:[30,44,59,74],yaksha:[62,90,121,152]}))test('HP scaling rounded table '+id,()=>{
 for(const [i,floor]of [1,10,20,30].entries()){const f=fixture(id,floor,id==='yaksha'?'elite':'fight');assert.equal(f.b.enemy.hp,expected[i]);assert.equal(f.b.enemy.maxHp,expected[i]);}
});
test('old bosses scale HP but preserve learned base attacks and shields',()=>{
 for(const [id,floor,hp]of [['gate_boss',10,94],['camp_boss',20,166],['snake',30,245]]){const f=fixture(id,floor,'boss');assert.equal(f.b.enemy.hp,hp);for(let index=0;index<N.ENEMIES[id].intents.length;index++){f.b.enemy.intentIndex=index;const intent=f.game.getIntent(),base=N.ENEMIES[id].intents[index];assert.deepEqual(intent.hits,base.hits||[]);assert.equal(intent.block,base.block);}}
});
test('scaling A/B switch preserves original HP and hits and late floors clamp to f30',()=>{
 const old=fixture('lantern',30,'fight',{scaling:false});assert.equal(old.b.enemy.hp,28);old.b.enemy.intentIndex=1;assert.deepEqual(old.game.getIntent().hits,[9]);
 const late=fixture('paper',70);assert.equal(late.b.enemy.hp,64);assert.equal(late.b.scaling.attackBonus,4);
});
test('story encounters are excluded from both HP and attack scaling',()=>{
 for(const id of ['feiye_echo','retainer','heart','snake_ascended','feiye','apothecary']){const f=fixture(id,30,'fight');assert.equal(f.b.enemy.hp,N.ENEMIES[id].hp);f.b.enemy.intentIndex=0;assert.deepEqual(f.game.getIntent().hits,N.ENEMIES[id].intents[0].hits||[]);}
});
test('attack additive steps cap by rank and apply before five-stack frost',()=>{
 for(const [floor,expected]of [[1,9],[4,9],[5,10],[9,11],[13,12],[17,13],[30,13]]){const f=fixture('lantern',floor);f.b.enemy.intentIndex=1;assert.deepEqual(f.game.getIntent().hits,[expected]);f.b.enemy.chill=5;assert.deepEqual(f.game.getIntent().hits,[expected-1]);}
 const e=fixture('yaksha',30,'elite');e.b.enemy.intentIndex=2;assert.deepEqual(e.game.getIntent().hits,[22]);e.b.enemy.chill=5;assert.deepEqual(e.game.getIntent().hits,[21]);
});
test('displayed scaled multihits match every real segment and never multiply shield values',()=>{
 const f=fixture('ape',20);keepAlive(f);f.b.enemy.intentIndex=0;f.b.enemy.chill=5;const intent=f.game.getIntent();assert.deepEqual(intent.hits,[6,6,6]);assert.match(intent.text,/每次 6/);turn(f);assert.deepEqual(f.b.events.filter(e=>e.type==='attack'&&e.source==='enemy').map(e=>e.amount),intent.hits);
 const y=fixture('yaksha',30,'elite');keepAlive(y);y.b.enemy.intentIndex=1;assert.equal(y.game.getIntent().block,10);turn(y);assert.equal(y.b.enemy.block,10);
});
test('C35 caps shield contribution at10, remains one cost and has rare reward metadata',()=>{
 const f=fixture();keepAlive(f);f.b.block=100;play(f,'C35');assert.equal(f.b.events.find(e=>e.type==='attack').amount,14);assert.equal(f.b.block,100);assert.equal(N.CARDS.C35.cost,1);assert.equal(N.CARDS.C35.rarity,'rare');assert.match(N.CARDS.C35.text,/上限 10/);
});
test('D04 grants10 shield without drawing or changing piles, including fallen form',()=>{
 const f=fixture();keepAlive(f);f.game.state.character=f.game.state.player.character='sword';f.game.state.player.path.learned=true;f.game.state.player.path.fallen=true;const before=f.b.draw.length;play(f,'D04');assert.equal(f.b.block,10);assert.equal(f.b.draw.length,before);assert.equal(f.b.events.filter(e=>e.type==='draw').length,0);assert.equal(f.game.getEffectiveCard('D04').block,10);assert.equal(N.CARDS.D04.text,'获得 10 护盾。');
});
test('first-hit cap includes stacked candidate, blood, relic, equipment and medicine bonuses once',()=>{
 const f=fixture();keepAlive(f);f.b.nextAttack=99;f.b.bloodPower=20;f.b.pillPower=4;f.game.state.player.power=3;f.game.state.player.relics.push('mirror','fang');f.game.state.player.equippedWeapon='divine';play(f,'C05');assert.deepEqual(f.b.events.filter(e=>e.type==='attack'&&e.target==='enemy').map(e=>e.amount),[11,3,3]);assert.equal(f.b.cardBonus,8);assert.equal(f.b.nextAttack,0);assert.ok(f.b.logs.some(s=>s.includes('第一段伤害增加 8')));
});
test('D06 firsthit reaches34 while existing full-resource finishers keep their distinct base formulas',()=>{
 const f=fixture();keepAlive(f);f.game.state.character=f.game.state.player.character='sword';f.game.state.player.path.learned=true;f.b.nextAttack=100;play(f,'D06');assert.equal(f.b.events.find(e=>e.type==='attack').amount,34);
 f.b.swordIntent=8;f.b.nextAttack=100;play(f,'S16');assert.equal(f.b.events.find(e=>e.type==='attack').amount,56);
});
test('new elites have complete data, properly sized weights and chapter-specific selection pools',()=>{
 for(const [id,hp,count]of [['e_mist',56,3],['e_lantern',76,1],['e_priest',92,3]]){assert.equal(N.ENEMIES[id].hp,hp);assert.equal(N.ENEMIES[id].intents.length,count);assert.equal(N.ENEMIES[id].weights.length,count);assert.equal(N.ENEMIES[id].rank,'elite');}
 assert.deepEqual(N.ELITE_POOL.slice(0,3),[['yaksha','e_mist'],['e_lantern'],['e_priest']]);
});
test('weighted first intents are randomized, successive actions exclude previous and reading never rerolls',()=>{
 const indexes=new Set();for(const value of [.01,.4,.99]){const f=fixture('yaksha',1,'elite');f.setRandom(value); // re-enter a real legal battle after public reset
 const g=N.createGame({environment:false,scaling:false,rng:()=>value});g.newRun();g.enterRegion();const n=g.getAvailableNodes()[0];n.type='elite';n.encounter={enemyId:'yaksha'};g.enterNode(n.id);indexes.add(g.state.battle.enemy.intentIndex);}
 assert.ok(indexes.size>1);
 const f=fixture('yaksha',1,'elite');keepAlive(f);for(let i=0;i<30;i++){const previous=f.b.enemy.intentIndex,calls=f.calls();for(let j=0;j<10;j++)f.game.getIntent();assert.equal(f.calls(),calls);turn(f);assert.notEqual(f.b.enemy.intentIndex,previous);}
});
test('one-action elite repeats its only action safely; bosses retain exact fixed sequences',()=>{
 const f=fixture('e_lantern',1,'elite');keepAlive(f);for(let i=0;i<5;i++){turn(f);assert.equal(f.b.enemy.intentIndex,0);}
 const b=fixture('snake',1,'boss');keepAlive(b);for(let i=0;i<8;i++){const previous=b.b.enemy.intentIndex;turn(b);assert.equal(b.b.enemy.intentIndex,(previous+1)%4);}
});
test('mist mark applies after attack, boosts one later first hit and is consumed only by enemy action',()=>{
 const f=fixture('e_mist',1,'elite',{scaling:false});keepAlive(f);f.b.enemy.intentIndex=0;turn(f);assert.equal(f.b.playerMark,1);f.b.enemy.intentIndex=1;assert.deepEqual(f.game.getIntent().hits,[9]);turn(f);assert.equal(f.b.playerMark,2);f.b.enemy.intentIndex=0;assert.deepEqual(f.game.getIntent().hits,[12]);turn(f);assert.equal(f.b.playerMark,1);
});
test('priest restoration is telegraphed, heals actual HP at most max, then grants unscaled shield',()=>{
 const f=fixture('e_priest',1,'elite',{scaling:false});f.b.enemy.hp=90;f.b.enemy.intentIndex=2;assert.match(f.game.getIntent().text,/恢复 8/);turn(f);assert.equal(f.b.enemy.hp,92);assert.equal(f.b.enemy.block,8);assert.equal(f.b.events.find(e=>e.type==='heal'&&e.target==='enemy').amount,2);
});
test('all exported weighted foes have positive weights matching actions while every authored boss has no weights',()=>{
 for(const [id,def]of Object.entries(N.ENEMIES)){
  if(def.rank==='boss'||def.fixedCycle){assert.equal(def.weights,undefined,id+' authored fixed cycle');continue;}
  assert.equal(def.weights.length,def.intents.length,id+' weight/action alignment');assert.ok(def.weights.every(w=>Number.isInteger(w)&&w>0),id+' positive weights');
 }
});
