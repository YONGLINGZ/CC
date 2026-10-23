/* Public UI contracts and isolated forecasting, using explicit battle fixtures. */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),N=require('./engine.js');let uid=0;
function fixture(starter='sword'){
 let calls=0,notifications=0;const g=N.createGame({environment:false,scaling:false,rng:()=>{calls++;return .81;},profile:{unlocks:['feiye']},onProfileChange:()=>notifications++});g.newRun(starter);g.enterRegion();const n=g.getAvailableNodes()[0];n.type='fight';n.encounter={enemyId:'paper'};g.enterNode(n.id);const b=g.state.battle;g.state.player.equippedWeapon=null;g.state.player.relics=[];b.enemy.hp=b.enemy.maxHp=1000;b.draw=[];b.discard=[];b.hand=[];return{g,b,calls:()=>calls,notifications:()=>notifications};
}
function card(f,id){const c={id,uid:'batch-a-'+(++uid)};f.b.hand.push(c);f.b.energy=30;return c;}
function hits(b){return b.events.filter(e=>e.type==='attack'&&e.source==='player'&&e.target==='enemy'&&e.kind==='card').map(e=>({amount:e.amount,absorbed:e.absorbed,damage:e.damage}));}

test('role/tactic combinations validate before mutation, preserving five starters, unlocks and classic alias',()=>{
 const g=N.createGame({rng:()=>.81,profile:{unlocks:['feiye']}});for(const [role,hero]of Object.entries(N.CHARACTERS))for(const id of hero.starters){assert.equal(g.newRun(id,role),true);assert.equal(g.state.character,role);assert.equal(g.state.starter,id);assert.equal(g.state.player.deck.length,10);}
 for(const [id,role]of [['mark','sword'],['sword','assassin'],['sovereign','sword'],['mark','missing']]){const before=JSON.stringify(g.state);assert.equal(g.newRun(id,role),false);assert.equal(JSON.stringify(g.state),before);}assert.equal(g.newRun('classic'),true);assert.equal(g.state.character,'assassin');const locked=N.createGame();assert.equal(locked.newRun('sovereign','sovereign'),false);
});
test('resource events preserve zeroes and do not include hidden narrative counters',()=>{
 const f=fixture();const c=card(f,'S02');assert.equal(f.g.playCard(c.uid,true),true);const r=f.b.events.at(-1).resources;assert.equal(r.swordIntent,0);assert.equal(r.soul,0);assert.equal(r.played,1);assert.ok(!/corruption|uses|fallen|hidden|flags/.test(JSON.stringify(r)));
});
test('sword 0→2→8→0 snapshots, cross-turn retention and next-battle reset are authoritative',()=>{
 const f=fixture();for(const [before,expected]of [[0,2],[7,8]]){f.b.swordIntent=before;const c=card(f,'S03');f.g.playCard(c.uid);const e=f.b.events.find(e=>e.type==='swordIntent');assert.equal(e.total,expected);assert.equal(e.resources.swordIntent,expected);}f.g.endTurn();f.g.resolveEnemyTurn();assert.equal(f.b.swordIntent,8);const c=card(f,'S04');f.g.playCard(c.uid,true);assert.equal(f.b.swordIntent,0);assert.equal(f.b.events.find(e=>e.type==='swordIntent').resources.swordIntent,0);assert.equal(f.g.newRun('sword'),true);f.g.enterRegion();f.g.enterNode(f.g.getAvailableNodes()[0].id);assert.equal(f.g.state.battle.swordIntent,0);
});
test('third-card jade energy is recorded after casting cost rather than leaked into the earlier card event',()=>{
 const f=fixture('mark');f.g.state.player.relics=['jade'];f.b.played=2;f.b.energy=3;const c={id:'C01',uid:'jade-order'};f.b.hand=[c];f.g.playCard(c.uid,true);assert.equal(f.b.events[0].type,'card');assert.equal(f.b.events[0].resources.energy,2);assert.equal(f.b.events.find(e=>e.relic==='jade').resources.energy,3);assert.equal(f.b.events.at(-1).resources.energy,3);
});
for(const [id,setup]of [
 ['S04',f=>{f.b.swordIntent=5;f.b.nextAttack=20;f.b.enemy.block=11;}],
 ['C05',f=>{f.b.nextAttack=30;f.b.enemy.block=9;}],
 ['C04',f=>{f.b.enemy.mark=5;f.b.enemy.block=60;}],
 ['S16',f=>{f.b.swordIntent=8;f.b.nextAttack=20;f.g.state.player.path.fallen=true;}],
 ['D06',f=>{f.g.state.player.path.learned=true;f.b.nextAttack=20;}],
 ['C14',f=>{f.g.state.player.hp=30;f.b.enemy.hp=2;}],
 ['C15',f=>{f.g.state.player.hp=1;}]
])test('preview reuses actual segment/shield/life/death rules without live mutation: '+id,()=>{
 const f=fixture(id.startsWith('C')?'mark':'sword');setup(f);const c=card(f,id),before=JSON.stringify(f.g.state),calls=f.calls(),p=f.g.previewCard(c.uid);assert.equal(p.available,true);assert.equal(JSON.stringify(f.g.state),before);assert.equal(f.calls(),calls);assert.equal(f.notifications(),0);assert.equal(f.g.playCard(c.uid,true),true);assert.deepEqual(p.hits,hits(f.b));assert.equal(p.enemyHpAfter,f.b.enemy.hp);assert.equal(p.playerHpAfter,f.g.state.player.hp);assert.equal(p.playerDefeated,f.g.state.screen==='defeat');
});
test('preview reports exact resource spend and first-hit cap and never leaks drawn identities',()=>{
 const f=fixture();f.b.swordIntent=5;f.b.nextAttack=20;const c=card(f,'S04'),p=f.g.previewCard(c.uid);assert.equal(p.resources.spent.swordIntent,5);assert.equal(p.resources.after.swordIntent,0);assert.equal(p.firstHitBonus,8);assert.equal(p.hits[0].amount,33);
 f.b.swordIntent=4;f.b.draw=[{id:'S16',uid:'hidden-next-card'}];const d=card(f,'S10'),q=f.g.previewCard(d.uid);assert.equal(q.resources.spent.swordIntent,2);assert.equal(q.drawCount,1);assert.ok(q.drawNotice);assert.ok(!JSON.stringify(q).includes('hidden-next-card'));assert.equal(q.firstHitBonus,0);
});
test('preview hidden-boss victory cannot unlock the real profile or notify storage',()=>{
 const f=fixture('mark');assert.equal(f.g.importProfile({version:1,unlocks:[]}),true);const before=f.notifications();f.b.kind='hidden';f.b.enemy.hp=1;const c=card(f,'C01'),state=JSON.stringify(f.g.state);for(let i=0;i<5;i++)assert.equal(f.g.previewCard(c.uid).enemyDefeated,true);assert.equal(f.notifications(),before);assert.deepEqual(f.g.getProfile().unlocks,[]);assert.equal(JSON.stringify(f.g.state),state);
});
test('unplayable preview preserves state and rejects invalid uid, phase and fees',()=>{
 const f=fixture(),c=card(f,'S16');f.b.energy=0;let before=JSON.stringify(f.g.state);assert.equal(f.g.previewCard(c.uid).available,false);assert.equal(JSON.stringify(f.g.state),before);assert.equal(f.g.previewCard('missing'),null);f.b.phase='enemy';before=JSON.stringify(f.g.state);assert.equal(f.g.previewCard(c.uid),null);assert.equal(JSON.stringify(f.g.state),before);
});
test('player and enemy marks have distinct canonical public names',()=>{
 const f=fixture('mark');f.b.enemy.id='e_mist';f.b.enemy.intentIndex=0;assert.match(f.g.getIntent().text,/追索印/);assert.ok(!/猎记|魂标/.test(f.g.getIntent().text));assert.match(N.CARDS.C03.text,/猎印/);const c=card(f,'C03');f.g.playCard(c.uid,true);assert.ok(f.b.logs.some(l=>l.includes('猎印')));
});
