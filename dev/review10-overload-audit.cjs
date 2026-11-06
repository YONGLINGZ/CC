'use strict';
// Actual engine events + actual effect launch function; stage element lookup is
// a deterministic DOM double. This is NOT browser or visual validation.
const fs=require('node:fs'),vm=require('node:vm'),N=require('./engine.js');
function fixture(){const g=N.createGame({rng:()=>.43,environment:false,scaling:false,tales:false,factions:false,bossQuests:false});g.newRun('mechanist');g.enterRegion();const n=g.getAvailableNodes()[0];n.type='fight';n.encounter={enemyId:'paper'};delete n.storyId;g.enterNode(n.id);const b=g.state.battle;b.energy=30;b.squad.drive=6;b.enemy.hp=b.enemy.maxHp=1000;g.state.player.hp=g.state.player.maxHp=500;g.squadAction('deploy','mingdi');return g;}
const cases=[];
for(const action of ['command','overload','J37']){
 const g=fixture(),b=g.state.battle,initial=structuredClone(b.squad);let success;
 if(action==='J37'){b.hand=[{uid:'overload-card',id:'J37'}];success=g.playCard('overload-card',true,{unitId:'mingdi'});}else success=g.squadAction(action,'mingdi');
 let squad=initial,created=0;const box=id=>({getBoundingClientRect:()=>({left:id==='enemy'?800:id==='mingdi'?320:50,top:200,width:160,height:200})});
 const stage={getBoundingClientRect:()=>({left:0,top:0,width:1000,height:400}),querySelector(selector){const id=selector.match(/data-combatant="([^"]+)"/)?.[1];return id==='player'||id==='enemy'||squad.slots.includes(id)?box(id):null;},querySelectorAll(){return [];},append(){}};
 const root={document:{querySelector:s=>s==='.battle-stage'?stage:null,createElement:()=>({dataset:{},style:{setProperty(){}},setAttribute(){},animate(){},remove(){}})},matchMedia:()=>({matches:false}),setTimeout:()=>1};root.globalThis=root;
 vm.runInNewContext(fs.readFileSync(__dirname+'/combat-effects.js','utf8'),root);
 const trace=[],attacks=[],departedOrigins={};
 for(const e of b.events){
  if(e.type==='squadOverload')departedOrigins[e.unitId]=root.NightCombatEffects.captureSource?.(e.unitId);
  // showEvent applies each resource snapshot before non-damage animation;
  // squadDamage is deferred until its animation ends, before the next event.
  if(e.type!=='squadDamage'&&e.resources?.squad)squad=e.resources.squad;
  trace.push({type:e.type,executor:e.executor||null,unitId:e.unitId||null,slots:[...squad.slots]});
  if(e.type==='attack'&&e.target==='enemy'){
   const node=root.NightCombatEffects.launch({cardId:e.cardId||'J01',character:'mechanist',executor:e.executor,sourceOrigin:departedOrigins[e.executor]},'enemy','full',e.executor||'player');
   if(node)created++;
   attacks.push({executor:e.executor,damage:e.damage,sourceInStage:squad.slots.includes(e.executor),flightCreated:!!node,source:node?.dataset.source,receiver:node?.dataset.receiver,left:node?.style.left,top:node?.style.top});
  }
  if(e.type==='squadDamage'&&e.resources?.squad)squad=e.resources.squad;
 }
 const origin=departedOrigins.mingdi,boundaries=origin?{
  wrongStageRejected:root.NightCombatEffects.launch({sourceOrigin:{...origin,stage:{}}},'enemy','full','mingdi')===null,
  wrongIdentityRejected:root.NightCombatEffects.launch({sourceOrigin:{...origin,id:'shiying'}},'enemy','full','mingdi')===null,
  offRespected:root.NightCombatEffects.launch({sourceOrigin:origin},'enemy','off','mingdi')===null,
  fastRespected:root.NightCombatEffects.launch({sourceOrigin:origin},'enemy','fast','mingdi')===null
 }:{};
 cases.push({action,success,expectedFlights:attacks.length,actualFlights:created,enemyHp:b.enemy.hp,trace,attacks,boundaries,pass:created===attacks.length&&attacks.every(a=>a.source==='mingdi'&&a.receiver==='enemy'&&a.left==='400px'&&a.top==='292px')&&Object.values(boundaries).every(Boolean)});
}
const report={method:'Actual engine and combat-effects module; simulated DOM follows live UI resource-snapshot order. No browser pixel/layout assertions.',cases};
fs.mkdirSync(__dirname+'/../docs/local-review10-acceptance',{recursive:true});
fs.writeFileSync(__dirname+'/../docs/local-review10-acceptance/overload-audit.json',JSON.stringify(report,null,2));console.log(JSON.stringify(cases.map(({trace,attacks,...c})=>c),null,2));
process.exitCode=cases.every(c=>c.pass)?0:1;
