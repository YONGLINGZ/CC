'use strict';
const test=require('node:test'),A=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const N=require('./engine.js');global.NightStage=require('./stage.js');global.NightPact=N;require('./boss-moves.js');const V=require('./combat-effects.js');

test('every real card has valid skill art and non-attack cast preserves its own motif',()=>{
 for(const [id,c] of Object.entries(N.CARDS)){
  const p=V.resolve({cardId:id,character:c.character}),svg=V.impactSVG(p,{phase:c.attack?'impact':'cast'}),flight=V.flightSVG(p);
  A.ok(V.PALETTES[p.theme],id);A.match(svg,/<svg /,id);A.doesNotMatch(svg,/undefined|NaN/,id);A.equal(p.motif,global.NightStage.profiles[id].motif,id);A.match(flight,/viewBox="0 0 160 56"/,id);A.doesNotMatch(flight,/undefined|NaN/,id);
 }
 A.notEqual(V.impactSVG(V.resolve({cardId:'S02'}),{phase:'cast'}),V.impactSVG(V.resolve({cardId:'S03'}),{phase:'impact'}));
});
test('travel silhouettes carry the skill and frost atmosphere never leaks into fallen attacks',()=>{
 const flights=['C01','S01','H01','J07','J33','F01'].map(id=>V.flightSVG(V.resolve({cardId:id})));
 A.equal(new Set(flights).size,flights.length);
 A.match(flights[0],/skill-flight-claws/);A.match(flights[2],/skill-heart/);A.match(flights[4],/data-flight-shape="lightning"/);
 A.match(V.impactSVG(V.resolve({cardId:'S01'})),/skill-frost-wisps/);
 A.doesNotMatch(V.impactSVG(V.resolve({cardId:'S01',fallen:true})),/skill-frost-wisps/);
 A.notEqual(V.impactSVG(V.resolve({cardId:'C24',hitIndex:0})),V.impactSVG(V.resolve({cardId:'C24',hitIndex:1})));
});
test('all original sword cards use ice white, then crimson when fallen; demonic arts always crimson',()=>{
 for(const id of Object.keys(N.CARDS).filter(id=>id[0]==='S')){
  const ice=V.resolve({cardId:id}),fallen=V.resolve({cardId:id,fallen:true});
  A.equal(ice.theme,'frost',id);A.equal(ice.core,'#f5fdff');A.equal(fallen.theme,'crimson',id);A.notEqual(fallen.color,ice.color);A.doesNotMatch(V.impactSVG(fallen),/skill-snow/);
 }
 for(const id of Object.keys(N.CARDS).filter(id=>id[0]==='D'))A.equal(V.resolve({cardId:id}).theme,'crimson');
 A.equal(V.resolve({character:'sword',fallen:true}).theme,'crimson');
});
test('charm marks land on the target while claw, fire and moon remain distinct abilities',()=>{
 for(const id of Object.keys(N.CARDS).filter(id=>id[0]==='H'))A.match(V.impactSVG(V.resolve({cardId:id})),/skill-heart-seal/);
 A.equal(V.resolve({cardId:'C01'}).shape,'claw');A.equal(V.resolve({cardId:'C24'}).shape,'claw');A.equal(V.resolve({cardId:'C15'}).shape,'fire');A.equal(V.resolve({cardId:'C16'}).shape,'moon');A.equal(V.resolve({cardId:'C28'}).theme,'blood');
 A.match(V.impactSVG(V.resolve({cardId:'C24'})),/skill-slashes/);A.doesNotMatch(V.impactSVG(V.resolve({cardId:'C15'})),/skill-slashes/);
});
test('machine executors and sovereign spells retain distinct visual identities',()=>{
 for(const [executor,shape]of [['chengshan','gear'],['mingdi','bolt'],['shiying','lightning']])A.equal(V.resolve({character:'mechanist',executor}).shape,shape);
 A.equal(V.resolve({cardId:'J01',executor:'player'}).shape,'wire');A.equal(V.resolve({cardId:'F01'}).shape,'soul');A.equal(V.resolve({cardId:'F12'}).shape,'moon');
});
test('named lightning attacks keep their spell shape for each real machine executor',()=>{
 for(const executor of ['chengshan','mingdi','shiying']){
  const g=N.createGame({rng:()=>.43,environment:false,scaling:false,tales:false,factions:false,bossQuests:false});
  A.equal(g.newRun('mechanist'),true);A.equal(g.setFirstMachine(executor),true);g.enterRegion();
  const n=g.state.map[0][0];n.type='fight';n.encounter={enemyId:'paper'};g.state.availableNodes=[n.id];A.equal(g.enterNode(n.id),true);
  const b=g.state.battle;b.enemy.hp=b.enemy.maxHp=500;b.hand=[{id:'J33',uid:'lightning-fixture'}];b.energy=20;
  A.equal(g.playCard('lightning-fixture',true,{unitId:executor}),true);
  const hit=b.events.find(e=>e.type==='attack'&&e.executor===executor);A.ok(hit);
  A.equal(V.resolve({cardId:'J33',character:'mechanist',executor:hit.executor}).shape,'lightning');
 }
 A.equal(V.resolve({cardId:'J35',executor:'mingdi'}).shape,'lightning');
 A.equal(V.resolve({cardId:'J34',executor:'mingdi'}).shape,'bolt');
 A.equal(V.resolve({cardId:'J39',executor:'player'}).shape,'wire');
});
test('all 53 authored boss intentions retain their own geometry and ignore player clothing/path',()=>{
 let count=0;for(const [id,entries]of Object.entries(global.NightBossMoves.profiles))for(const b of entries){
  const p=V.resolve({enemy:true,enemyId:id,intentName:b.name,cardId:'H01',fallen:true});A.equal(p.family,'enemy');A.equal(p.bossPath,b.path);A.equal(p.color,b.color);A.ok(V.impactSVG(p).includes(b.path));A.ok(V.flightSVG(p).includes(b.path));A.doesNotMatch(V.impactSVG(p),/skill-heart-seal/);count++;
 }A.equal(count,53);
});
test('real concealed-card events resolve as player charm without altering the combat result',()=>{
 const g=N.createGame({rng:()=>.43,environment:false,scaling:false,tales:false,factions:false,bossQuests:false});g.newRun('hehuan');g.enterRegion();const n=g.state.map[0][0];n.type='fight';n.encounter={enemyId:'paper'};g.state.availableNodes=[n.id];A.equal(g.enterNode(n.id),true);
 const b=g.state.battle;b.enemy.hp=b.enemy.maxHp=500;b.hand=[{id:'H01',uid:'charm-fixture'}];b.energy=20;A.equal(g.setTrap('charm-fixture'),true);const saved=N.ENEMIES.paper.intents;N.ENEMIES.paper.intents=[{name:'扑击',hits:[1]}];b.enemy.intentIndex=0;
 try{g.endTurn();g.resolveEnemyTurn();}finally{N.ENEMIES.paper.intents=saved;}
 const event=b.events.find(e=>e.type==='attack'&&e.source==='trap'),snapshot=JSON.stringify(g.state);A.ok(event);A.equal(event.cardId,'H01');A.equal(event.target,'enemy');const p=V.resolve({cardId:event.cardId,character:'hehuan',enemy:event.source==='enemy'});A.equal(p.theme,'charm');V.impactSVG(p);A.equal(JSON.stringify(g.state),snapshot);
});
function documentFixture(){
 const nodes=[],rects={player:{left:40,top:60,width:180,height:220},enemy:{left:660,top:90,width:210,height:250},mingdi:{left:300,top:180,width:90,height:120}};
 const stage={getBoundingClientRect:()=>({left:20,top:30,width:900,height:400}),querySelector(selector){if(selector==='.skill-vfx')return nodes[0];const id=selector.match(/data-combatant="([^"]+)"/)?.[1];return rects[id]?{getBoundingClientRect:()=>rects[id]}:null;},querySelectorAll:()=>nodes,append(el){nodes.push(el);}};
 const doc={querySelector:()=>stage,querySelectorAll:()=>nodes.slice(),createElement(){const el={dataset:{},style:{setProperty(k,v){this[k]=v}},classList:{add(){},toggle(){}},setAttribute(){},animations:[],animate(frames,timing){const a={frames,timing,cancel(){this.cancelled=true}};this.animations.push(a);return a;},getAnimations(){return this.animations},remove(){const i=nodes.indexOf(this);if(i>=0)nodes.splice(i,1);}};return el;}};
 return {doc,nodes};
}
test('receiver anchoring, machine origin, motion modes, cleanup and bounded particles work without state access',()=>{
 const {doc,nodes}=documentFixture(),old=global.document;global.document=doc;
 try{
  const charm=V.card('H01','enemy','full','impact','player',{character:'hehuan'});A.equal(charm.dataset.receiver,'enemy');A.equal(charm.style.left,'745px');A.equal(charm.style.top,'175px');A.match(charm.innerHTML,/skill-heart-seal/);
  const flight=V.launch({cardId:'J03',executor:'mingdi'},'enemy','full','mingdi');A.equal(flight.dataset.source,'mingdi');A.equal(flight.style.left,'325px');A.equal(flight.animations[0].timing.duration,125);A.equal(flight.animations[0].timing.duration,V.flightDuration);A.match(flight.innerHTML,/data-flight-shape="bolt"/);A.match(flight.animations[0].frames.at(-1).transform,/420px/);
  A.equal(V.card('C01','enemy','off'),null);A.equal(V.launch({cardId:'C01'},'enemy','reduced'),null);const reduced=V.card('S01','enemy','reduced','impact');A.equal(reduced.animations.length,0);
  A.equal(V.card('H01','missing','full'),null);for(let i=0;i<15;i++)V.card('H01','enemy','fast','impact');A.ok(nodes.length<=9);V.clear();A.equal(nodes.length,0);
 }finally{V.clear();global.document=old;}
 A.doesNotMatch(fs.readFileSync(__dirname+'/combat-effects.js','utf8'),/game\.state|localStorage|fetch\(|Math\.random/);
});
