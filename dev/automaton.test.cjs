/* Focused fixtures for the reworked housekeeping boss; not natural-play claims. */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),N=require('./engine.js');
let uid=0;
function fixture(id='lotus_boss'){
 let calls=0,fixed=.81;const g=N.createGame({environment:false,scaling:false,rng:()=>{calls++;return fixed;}});g.newRun('mark');
 const s=g.state,n=s.map[9][0];s.screen='map';s.floor=10;s.journey.regionIndex=0;s.availableNodes=[n.id];n.revealed=true;s.history=[];n.type='boss';n.encounter={enemyId:id};assert.equal(g.enterNode(n.id),true);
 s.player.hp=s.player.maxHp=1000;s.player.equippedWeapon=null;s.player.relics=[];
 const b=s.battle;b.hand=[];b.draw=Array.from({length:100},(_,i)=>({id:'C01',uid:'automaton-draw-'+i}));b.discard=[];
 return{g,b,calls:()=>calls,setRandom:v=>{fixed=v;}};
}
function turn(f){const expected=f.g.getIntent();assert.equal(f.g.endTurn(),true);assert.equal(f.g.resolveEnemyTurn(),true);return{expected,hits:f.b.events.filter(e=>e.type==='attack'&&e.source==='enemy').map(e=>e.amount)};}
function play(f,id){const c={id,uid:'automaton-play-'+(++uid)};f.b.hand.push(c);f.b.energy=10;assert.equal(f.g.playCard(c.uid,true),true);}

test('housekeeping boss replaces healer in the same early pool and uses four actual domestic tools',()=>{
 const d=N.ENEMIES.lotus_boss;assert.equal(d.name,'故宅机仆');assert.equal(d.hp,92);assert.equal(d.weights,undefined);assert.deepEqual(d.intents.map(i=>i.household),['kettle','broom','shears','pan']);assert.ok(d.lore.includes('主人')&&d.lore.includes('焚宅'));assert.ok(!d.intents.some(i=>i.poison||i.heal));assert.equal(d.revenge.perHit,1);
});
test('all four domestic actions execute in the displayed fixed order and loop without rerolls',()=>{
 const f=fixture(),names=[];for(let i=0;i<8;i++){const {expected,hits}=turn(f);names.push(expected.name);assert.deepEqual(hits,expected.hits);}
 assert.deepEqual(names.slice(0,4),N.ENEMIES.lotus_boss.intents.map(i=>i.name));assert.deepEqual(names.slice(4),names.slice(0,4));
});
test('tea applies red pursuit after both hits, then broom consumes it on its first actual hit',()=>{
 const f=fixture();assert.deepEqual(turn(f).hits,[4,4]);assert.equal(f.b.playerMark,2);assert.deepEqual(f.g.getIntent().hits,[10]);assert.deepEqual(turn(f).hits,[10]);assert.equal(f.b.playerMark,0);
});
test('needle broom really reduces only the next hand; sewing shears really seal only next energy',()=>{
 const f=fixture();f.b.enemy.intentIndex=1;turn(f);assert.equal(f.b.hand.length,4);assert.equal(f.b.energy,3);turn(f);assert.equal(f.b.hand.length,5);assert.equal(f.b.energy,2);turn(f);assert.equal(f.b.energy,3);assert.equal(f.b.hand.length,5);
});
test('iron pan cleans bleed, grants12 shield and counters once per damaging card, never once per segment',()=>{
 const f=fixture();f.b.enemy.intentIndex=3;f.b.enemy.bleed=4;turn(f);assert.equal(f.b.enemy.bleed,0);assert.equal(f.b.enemy.block,12);assert.equal(f.b.enemy.counter,2);
 const hp=f.g.state.player.hp;play(f,'C05');assert.equal(f.g.state.player.hp,hp,'fully blocked claw does not counter');f.b.enemy.block=0;play(f,'C05');assert.equal(f.g.state.player.hp,hp-2);assert.equal(f.b.events.filter(e=>e.type==='attack'&&e.source==='enemy').length,1);
});
test('vengeance activates at exactly half, reads without RNG and counts in preview before execution',()=>{
 const f=fixture();f.b.enemy.hp=47;assert.deepEqual(f.g.getIntent().hits,[4,4]);f.b.enemy.hp=46;const count=f.calls();for(let i=0;i<10;i++){assert.equal(f.g.getIntent().revengeBonus,1);assert.deepEqual(f.g.getIntent().hits,[5,5]);assert.match(f.g.getIntent().text,/血债覆令/);}assert.equal(f.calls(),count);assert.deepEqual(turn(f).hits,[5,5]);assert.equal(f.b.events.filter(e=>e.type==='enemySkill'&&e.kind==='revenge').length,1);turn(f);assert.equal(f.b.events.filter(e=>e.type==='enemySkill'&&e.kind==='revenge').length,0);
});
test('a real attack crossing half immediately changes intent; frost still reduces every revenge segment',()=>{
 const f=fixture();f.b.enemy.hp=47;play(f,'C01');assert.equal(f.g.getIntent().revengeBonus,1);assert.deepEqual(f.g.getIntent().hits,[5,5]);f.b.enemy.chill=5;assert.deepEqual(f.g.getIntent().hits,[4,4]);assert.deepEqual(turn(f).hits,[4,4]);assert.equal(f.b.enemy.chill,4);
});
test('half-life vengeance never strengthens pan retaliation or grants hidden extra actions',()=>{
 const f=fixture();f.b.enemy.hp=40;f.b.enemy.intentIndex=3;assert.equal(f.g.getIntent().counter,2);assert.deepEqual(turn(f).hits,[]);assert.equal(f.b.enemy.counter,2);assert.equal(f.b.enemy.intentIndex,0);assert.deepEqual(f.g.getIntent().hits,[5,5]);
});
test('freeze skips the whole household action including seals, marks and vengeance announcement',()=>{
 const f=fixture();f.b.enemy.hp=40;f.b.enemy.chill=10;f.b.enemy.intentIndex=2;assert.equal(f.g.endTurn(),true);f.b.enemy.frozen=true;assert.equal(f.g.resolveEnemyTurn(),true);assert.equal(f.b.energy,3);assert.equal(f.b.events.filter(e=>e.type==='attack'&&e.source==='enemy').length,0);assert.equal(f.b.enemy.revengeAnnounced,undefined);
});
test('other guardians do not acquire the automaton half-life passive',()=>{
 const f=fixture('snake');f.b.enemy.hp=40;assert.equal(f.g.getIntent().revengeBonus,0);assert.deepEqual(turn(f).hits,[10]);
});

for(const status of ['poison','bleed'])test('enemy-start '+status+' crossing half never changes the action already telegraphed',()=>{
 const f=fixture();f.b.enemy.hp=47;if(status==='poison')f.b.enemy.poison=1;else{f.b.enemy.bleed=7;f.setRandom(.01);}
 const preview=f.g.getIntent();assert.deepEqual(preview.hits,[4,4]);const result=turn(f);assert.deepEqual(result.hits,preview.hits);assert.equal(f.b.enemy.hp,46);assert.equal(f.g.getIntent().revengeBonus,1);assert.equal(f.b.revengeIntentBonus,undefined);assert.equal(f.b.enemy.revengeAnnounced,undefined);
});
