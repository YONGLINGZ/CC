/* Isolated expedition contract tests. All state mutations are explicit fixtures. */
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const E=require('./expedition.js');
function fixture(values=[.5]) {
 const state={screen:'map',floor:2,player:{hp:60,maxHp:60,gold:60,relics:['bell'],affliction:{active:false,revealed:false,ticks:0,suppressed:0}},battle:null,shop:null,cave:null};
 const events=[],notes=[],logs=[];let draws=0,emits=0,advances=0;
 const hooks={getState:()=>state,rng:()=>values[Math.min(draws++,values.length-1)],emit:()=>emits++,note:v=>notes.push(v),event:(type,v)=>events.push({type,...v}),log:v=>logs.push(v),beginEvents:()=>events.splice(0),heal:amount=>{const before=state.player.hp;state.player.hp=Math.min(state.player.maxHp,before+amount);return state.player.hp-before;},cureAffliction:()=>{state.player.affliction.active=false;state.player.affliction.revealed=true;state.player.affliction.suppressed=0;},relics:{bell:{name:'金铃'},moon:{name:'残月坠'},jade:{name:'磨爪玉'}},addRelic:id=>{if(state.player.relics.includes(id))return false;state.player.relics.push(id);return true;},advance:()=>{advances++;state.floor++;state.screen='map';state.cave=null;},startBattle:(kind,encounter)=>{state.screen='battle';state.battle={kind,phase:'player',turn:1,itemUsedTurn:0,energy:3,poison:0,pillPower:0,enemy:{id:encounter.enemyId,hp:26}};}};
 const api=E.create(hooks);api.resetRun();
 return {state,api,events,notes,logs,get draws(){return draws;},get emits(){return emits;},get advances(){return advances;},battle(){hooks.startBattle('fight',{enemyId:'paper'});return state.battle;}};
}
const enter=f=>assert.equal(f.api.enterCave({id:'f2-0',type:'cave'}),true);

test('expedition: seven consumables have usable text and fresh runs reset bag and pending medicine',()=>{
 const f=fixture();assert.equal(Object.keys(E.ITEMS).length,7);for(const item of Object.values(E.ITEMS)){assert.ok(item.name&&item.text&&item.icon);assert.ok(item.price>0);}
 assert.deepEqual(f.state.player.inventory,{herb:2});f.api.grantItem('battle_pill',3);assert.equal(f.api.useItem('battle_pill'),true);f.state.cave={old:true};f.api.resetRun();assert.deepEqual(f.state.player.inventory,{herb:2});assert.equal(f.state.player.pendingPillPower,0);assert.equal(f.state.cave,null);
 assert.equal(f.api.grantItem('unknown'),false);assert.equal(f.api.grantItem('herb',-1),false);assert.equal(f.api.grantItem('herb',1.5),false);
});

test('expedition: herbs heal actual missing life, full healing respects changed maximum, no effect consumes nothing',()=>{
 const f=fixture(),p=f.state.player;const original=JSON.stringify(p);assert.equal(f.api.useItem('herb'),false);assert.equal(JSON.stringify(p),original);
 p.hp=57;assert.equal(f.api.useItem('herb'),true);assert.equal(p.hp,60);assert.equal(p.inventory.herb,1);
 p.maxHp=52;p.hp=1;f.api.grantItem('fullheal_pill');assert.equal(f.api.useItem('fullheal_pill'),true);assert.equal(p.hp,52);assert.equal(p.inventory.fullheal_pill,undefined);
 f.api.grantItem('healing_pill');p.hp=20;assert.equal(f.api.useItem('healing_pill'),true);assert.equal(p.hp,44);
});

test('expedition: healing cannot cure chronic poison; antidote clears both poisons without healing',()=>{
 const f=fixture(),p=f.state.player;p.hp=24;p.affliction={active:true,revealed:true,suppressed:3,ticks:12};assert.equal(f.api.useItem('herb'),true);assert.equal(p.affliction.active,true);
 const b=f.battle();b.poison=5;f.api.grantItem('antidote',2);const hp=p.hp;assert.equal(f.api.useItem('antidote'),true);assert.equal(p.hp,hp);assert.equal(b.poison,0);assert.equal(p.affliction.active,false);assert.equal(p.affliction.suppressed,0);assert.equal(p.affliction.ticks,12);assert.ok(f.events.some(e=>e.type==='poison'&&e.amount===-5));
 b.turn++;assert.equal(f.api.useItem('antidote'),false);assert.equal(p.inventory.antidote,1);
});

test('expedition: player-turn item limit is shared across item types and blocks enemy/resolving/end states',()=>{
 const f=fixture(),p=f.state.player,b=f.battle();p.hp=20;f.api.grantItem('spirit_pill',2);assert.equal(f.api.useItem('herb'),true);assert.equal(b.energy,3);assert.equal(f.api.useItem('spirit_pill'),false);assert.equal(p.inventory.spirit_pill,2);
 for(const phase of ['enemy','resolving','ended']){b.phase=phase;b.turn++;assert.equal(f.api.useItem('herb'),false);}
 b.phase='player';assert.equal(f.api.useItem('spirit_pill'),true);assert.equal(b.energy,5);assert.equal(f.api.useItem('spirit_pill'),false);
 for(const screen of ['title','defeat','victory','reward']){f.state.screen=screen;assert.equal(f.api.useItem('herb'),false);}
 f.state.screen='map';assert.equal(f.api.useItem('spirit_pill'),false);p.hp=0;assert.equal(f.api.useItem('herb'),false);
});

test('expedition: damage medicine has capped distinct pending/current battle scopes',()=>{
 const f=fixture(),p=f.state.player;f.api.grantItem('battle_pill',5);assert.equal(f.api.useItem('battle_pill'),true);assert.equal(f.api.useItem('battle_pill'),true);assert.equal(p.pendingPillPower,4);assert.equal(f.api.useItem('battle_pill'),false);assert.equal(p.inventory.battle_pill,3);
 const b=f.battle();assert.equal(f.api.useItem('battle_pill'),true);assert.equal(b.pillPower,2);assert.equal(p.pendingPillPower,4);assert.equal(f.api.useItem('battle_pill'),false);b.turn++;assert.equal(f.api.useItem('battle_pill'),true);b.turn++;assert.equal(f.api.useItem('battle_pill'),false);assert.equal(b.pillPower,4);assert.equal(p.inventory.battle_pill,1);
});

test('expedition: reading inventory is mutation-free and cannot reroll prepared shop stock',()=>{
 const f=fixture([.3,.9]),s=f.state;s.screen='shop';s.shop={items:f.api.makeShopStock()};const snapshot=JSON.stringify(s),draws=f.draws;for(let i=0;i<6;i++)f.api.getInventory();assert.equal(JSON.stringify(s),snapshot);assert.equal(f.draws,draws);assert.notEqual(s.shop.items[0].id,s.shop.items[1].id);
 const entry=s.shop.items[0],gold=s.player.gold,count=s.player.inventory[entry.id]||0;assert.equal(f.api.buyItem(0),true);assert.equal(s.player.gold,gold-entry.price);assert.equal(s.player.inventory[entry.id],count+1);const spent=JSON.stringify(s);assert.equal(f.api.buyItem(0),false);assert.equal(JSON.stringify(s),spent);
 s.player.gold=0;assert.equal(f.api.buyItem(1),false);assert.equal(f.api.buyItem(-1),false);assert.equal(f.api.buyItem(.5),false);s.screen='battle';s.player.gold=100;assert.equal(f.api.buyItem(1),false);
});

for(const [roll,kind]of [[.1,'enemy'],[.3,'coins'],[.5,'herbs'],[.7,'pills'],[.9,'treasure']])test('expedition: '+kind+' cave discovery is fixed at entrance and can only be explored once',()=>{
 const f=fixture([roll,.2,.4]);enter(f);const s=f.state,cave=s.cave;assert.equal(cave.outcome.kind,kind);assert.equal(cave.result,null);const outcome=JSON.stringify(cave.outcome),draws=f.draws,inventory=JSON.stringify(s.player.inventory),gold=s.player.gold;
 for(let i=0;i<5;i++){f.api.getInventory();assert.equal(f.api.enterCave({id:'f2-0',type:'cave'}),false);}assert.equal(f.draws,draws);assert.equal(JSON.stringify(cave.outcome),outcome);assert.equal(JSON.stringify(s.player.inventory),inventory);assert.equal(s.player.gold,gold);
 assert.equal(f.api.exploreCave(),true);assert.equal(f.draws,draws);const after=JSON.stringify(s);assert.equal(f.api.exploreCave(),false);assert.equal(JSON.stringify(s),after);
 if(kind==='enemy'){assert.equal(s.screen,'battle');assert.equal(cave.resolved,false);assert.equal(JSON.stringify(s.player.inventory),inventory);assert.equal(f.api.leaveCave(),false);}
 else {assert.equal(cave.resolved,true);assert.ok(cave.result.rewards.length);assert.equal(f.api.leaveCave(),true);assert.equal(f.api.leaveCave(),false);assert.equal(f.advances,1);}
});

test('expedition: retreat before exploring yields no loot and advances exactly once',()=>{
 const f=fixture([.9,.2]);enter(f);const p=JSON.stringify(f.state.player);assert.equal(f.api.leaveCave(),true);assert.equal(JSON.stringify(f.state.player),p);assert.equal(f.api.exploreCave(),false);assert.equal(f.api.leaveCave(),false);assert.equal(f.advances,1);
});

test('expedition: cave battle loot requires actual finished victory and is delivered once',()=>{
 const f=fixture([.1,.0,.0]);enter(f);f.api.exploreCave();const b=f.state.battle,p=f.state.player;assert.equal(f.api.onBattleWin(b),null);b.enemy.hp=0;assert.equal(f.api.onBattleWin(b),null);b.phase='ended';p.hp=0;assert.equal(f.api.onBattleWin(b),null);p.hp=1;assert.equal(f.api.onBattleWin({...b}),null);const result=f.api.onBattleWin(b);assert.ok(result);assert.equal(p.inventory.healing_pill,1);const after=JSON.stringify(p);assert.equal(f.api.onBattleWin(b),null);assert.equal(JSON.stringify(p),after);
});

test('expedition: exhausted relic pool produces a full-heal treasure and coins instead of duplicates',()=>{
 const f=fixture([.99]);f.state.player.relics.push('jade','moon');enter(f);f.api.exploreCave();assert.equal(f.state.player.gold,120);assert.equal(f.state.player.inventory.fullheal_pill,1);assert.equal(f.state.cave.result.rarity,'rare');assert.equal(new Set(f.state.player.relics).size,f.state.player.relics.length);
});
