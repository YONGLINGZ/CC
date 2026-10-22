/* Explicit bounded combat fixtures: not natural play or balance measurements. */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),N=require('./engine.js');
let serial=0;
function fixture(starter='sword',kind='fight',enemy='paper'){
 let values=[],calls=0;const g=N.createGame({environment:false,rng:()=>{calls++;return values.length?values.shift():.8;}});g.newRun(starter);g.enterRegion();
 const node=g.getAvailableNodes()[0];node.type=kind==='hidden'?'boss':kind;node.encounter={enemyId:enemy};g.enterNode(node.id);
 const b=g.state.battle;b.kind=kind;b.enemy.hp=b.enemy.maxHp=1000;b.hand=[];b.draw=[];b.discard=[];b.energy=99;g.state.player.hp=g.state.player.maxHp=1000;
 return {g,b,roll:(...v)=>{values=v;},calls:()=>calls};
}
function play(f,id){const card={id,uid:'v10-test-'+(++serial)};f.b.hand.push(card);assert.equal(f.g.playCard(card.uid,true),true);}
function turn(f){assert.equal(f.g.endTurn(),true);assert.equal(f.g.resolveEnemyTurn(),true);}
function attacks(f,target='enemy'){return f.b.events.filter(e=>e.type==='attack'&&e.target===target).map(e=>e.amount);}

test('frost normal skills retain requested stacks, cap at10, decay only1 each enemy turn',()=>{
 const f=fixture();play(f,'S05');play(f,'S05');assert.equal(f.b.enemy.chill,4);play(f,'S12');assert.equal(f.b.enemy.chill,6);f.b.enemy.chill=9;play(f,'S05');assert.equal(f.b.enemy.chill,10);turn(f);assert.equal(f.b.enemy.chill,9);turn(f);assert.equal(f.b.enemy.chill,8);
});
test('frost five-stack threshold reduces each segment by1 and four stacks do not reduce',()=>{
 const f=fixture('sword','fight','ape');f.b.enemy.chill=4;assert.deepEqual(f.g.getIntent().hits,[3,3,3]);f.b.enemy.chill=5;assert.deepEqual(f.g.getIntent().hits,[2,2,2]);turn(f);assert.deepEqual(attacks(f,'player'),[2,2,2]);assert.equal(f.g.state.player.hp,994);assert.equal(f.b.enemy.chill,4);
});
for(const [roll,skip] of [[.099,true],[.1,false],[.999,false]])test('ten-stack frost rolls once and locks skip='+skip+' for roll '+roll,()=>{
 const f=fixture();f.b.enemy.chill=10;const before=f.calls();for(let i=0;i<20;i++)assert.equal(f.g.getIntent().freezeChance,.1);assert.equal(f.calls(),before);f.roll(roll);f.g.endTurn();const after=f.calls();assert.equal(f.g.getIntent().frozen,skip);for(let i=0;i<20;i++)f.g.getIntent();assert.equal(f.calls(),after);f.g.resolveEnemyTurn();assert.equal(f.g.state.player.hp,skip?1000:995);assert.equal(f.b.enemy.chill,9);assert.equal(f.b.enemy.intentIndex,1);assert.equal(f.g.resolveEnemyTurn(),false);
});
test('freeze skips entire defensive cleansing and poison action, while bleed still ticks',()=>{
 const f=fixture('sword','boss','snake');f.b.enemy.intentIndex=2;f.b.enemy.chill=10;f.b.enemy.bleed=7;f.b.enemy.mark=4;f.roll(.01,.01,.99);turn(f);assert.equal(f.b.enemy.hp,993);assert.equal(f.b.enemy.block,0);assert.equal(f.b.enemy.mark,4);assert.equal(f.b.enemy.bleed,7);assert.equal(f.b.enemy.chill,9);
});
for(const [kind,id]of [['elite','yaksha'],['boss','snake'],['hidden','feiye'],['fight','gate_boss']])test('resistant '+kind+'/'+id+' needs two skillcards for one frost stack regardless of layers',()=>{
 const f=fixture('sword',kind,id);assert.equal(f.b.enemy.frostResistant,true);play(f,'S05');assert.equal(f.b.enemy.chill,0);assert.equal(f.b.enemy.chillProgress,1);assert.equal(f.b.swordIntent,0);play(f,'S12');assert.equal(f.b.enemy.chill,1);assert.equal(f.b.enemy.chillProgress,0);assert.equal(f.b.swordIntent,1);play(f,'S08');assert.equal(f.b.enemy.chill,1);assert.equal(f.b.enemy.chillProgress,1);assert.equal(f.b.events.filter(e=>e.type==='chill').length,1);
});
test('odd resisted frost application survives turns and decay never counts as a skillcard',()=>{
 const f=fixture('sword','boss','snake');play(f,'S02');turn(f);assert.equal(f.b.enemy.chillProgress,1);f.b.energy=99;play(f,'S02');assert.equal(f.b.enemy.chill,1);turn(f);assert.equal(f.b.enemy.chill,0);assert.equal(f.b.enemy.chillProgress,0);
});
test('sword frost/intent interactions extend frost, strengthen sword-ming and reward breakstream draw',()=>{
 const f=fixture();play(f,'S01');assert.equal(f.b.enemy.chill,0);play(f,'S02');play(f,'S01');assert.equal(f.b.enemy.chill,2);f.b.enemy.chill=5;f.b.swordIntent=0;f.b.frostsealUsed=true;play(f,'S14');assert.equal(f.b.swordIntent,3);f.b.draw=[{id:'S09',uid:'draw-synergy'}];play(f,'S04');assert.ok(f.b.hand.some(c=>c.uid==='draw-synergy'));assert.equal(f.b.enemy.chill,5);
});
test('cat marked multihits, combo and bloody finishers interact without merging segments',()=>{
 const f=fixture('mark');play(f,'C05');assert.equal(f.b.enemy.bleed,0);play(f,'C03');play(f,'C05');assert.deepEqual(attacks(f),[3,3,3]);assert.equal(f.b.enemy.bleed,1);play(f,'C08');assert.equal(f.b.enemy.bleed,3);play(f,'C22');assert.deepEqual(attacks(f),[6,6]);assert.equal(f.b.enemy.bleed,5);for(let i=0;i<3;i++)play(f,'C18');assert.equal(f.b.enemy.bleed,7);const hp=f.b.enemy.hp,mark=f.b.enemy.mark;play(f,'C21');assert.equal(hp-f.b.enemy.hp,12+6*mark+14);assert.equal(f.b.enemy.bleed,0);assert.equal(f.b.enemy.mark,0);
});
for(let stack=1;stack<=7;stack++)test('bleed '+stack+' uses exact '+stack*3+' percent boundary and integer1..'+stack+' bypass damage',()=>{
 const f=fixture('mark');f.b.enemy.bleed=stack;f.b.enemy.block=999;f.roll(stack*.03-.00001,.9999);turn(f);const tick=f.b.events.filter(e=>e.type==='bleed'&&e.tick);assert.equal(tick.length,1);assert.equal(tick[0].damage,stack);assert.equal(f.b.enemy.hp,1000-stack);assert.equal(f.b.enemy.bleed,stack);
 const m=fixture('mark');m.b.enemy.bleed=stack;m.roll(stack*.03);turn(m);assert.equal(m.b.events.filter(e=>e.type==='bleed'&&e.tick).length,0);assert.equal(m.b.enemy.hp,1000);
});
test('bleed lethal ends before enemy attacks and never rewards again',()=>{
 const f=fixture('mark');f.b.enemy.hp=1;f.b.enemy.bleed=7;f.roll(0,0);turn(f);assert.equal(f.g.state.screen,'reward');assert.equal(f.g.state.player.hp,1000);assert.equal(f.b.events.filter(e=>e.type==='attack'&&e.source==='enemy').length,0);const gold=f.g.state.player.gold;assert.equal(f.g.resolveEnemyTurn(),false);assert.equal(f.g.state.player.gold,gold);
});
test('cleansing boss telegraphs all states and clears frost before attack calculation',()=>{
 const f=fixture('sword','boss','snake_ascended');f.b.enemy.intentIndex=2;f.b.enemy.chill=8;f.b.enemy.chillProgress=1;f.b.enemy.bleed=4;f.b.enemy.mark=5;const intent=f.g.getIntent();assert.match(intent.text,/清除全部霜寒/);assert.match(intent.text,/清除全部流血/);assert.deepEqual(intent.hits,[5]);turn(f);assert.equal(f.b.enemy.chill,0);assert.equal(f.b.enemy.chillProgress,0);assert.equal(f.b.enemy.bleed,0);assert.equal(f.b.enemy.mark,0);assert.equal(f.b.enemy.block,12);assert.deepEqual(attacks(f,'player'),[5]);
});
test('enemy counter only triggers once per damaging card and fully blocked cards do not trigger',()=>{
 const f=fixture('mark','fight','bone');f.b.enemy.intentIndex=1;turn(f);assert.equal(f.b.enemy.counter,2);f.b.energy=99;f.b.enemy.block=100;play(f,'C05');assert.deepEqual(attacks(f,'player'),[]);f.b.enemy.block=0;const hp=f.g.state.player.hp;play(f,'C05');assert.equal(f.g.state.player.hp,hp-2);assert.equal(f.b.events.filter(e=>e.type==='enemySkill'&&e.kind==='counter').length,1);turn(f);assert.equal(f.b.enemy.counter,0);
});
test('counter lethal interrupts remaining segments and permits one-time fox survival',()=>{
 const f=fixture('mark');f.b.enemy.counter=10;f.g.state.player.hp=1;play(f,'C05');assert.equal(f.g.state.screen,'defeat');assert.equal(attacks(f).length,1);
 const r=fixture('mark');r.b.enemy.counter=10;r.g.state.player.hp=1;r.g.state.player.relics.push('fox');play(r,'C05');assert.equal(r.g.state.screen,'battle');assert.equal(r.g.state.player.hp,12);assert.equal(attacks(r).length,3);assert.ok(!r.g.state.player.relics.includes('fox'));
});
test('sealed energy and disrupted draw apply only to the next actual player turn',()=>{
 const f=fixture('sword','elite','yaksha');f.b.enemy.intentIndex=2;f.b.draw=Array.from({length:20},(_,i)=>({id:'S01',uid:'energy-'+i}));assert.match(f.g.getIntent().text,/灵力/);turn(f);assert.equal(f.b.energy,2);assert.equal(f.b.nextEnergyPenalty,0);turn(f);assert.equal(f.b.energy,3);
 const r=fixture('mark','fight','ape');r.b.enemy.intentIndex=1;r.b.draw=Array.from({length:20},(_,i)=>({id:'C01',uid:'draw-'+i}));assert.match(r.g.getIntent().text,/少抽 1/);turn(r);assert.equal(r.b.hand.length,4);assert.equal(r.b.nextDrawPenalty,0);turn(r);assert.equal(r.b.hand.length,5);
});
