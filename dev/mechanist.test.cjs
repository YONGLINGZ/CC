'use strict';
const test=require('node:test'),A=require('node:assert/strict'),N=require('./engine.js');
let serial=0;
function game(){const g=N.createGame({rng:()=>.43,environment:false,scaling:false,tales:false,factions:false,bossQuests:false});A.equal(g.newRun('mechanist'),true);g.enterRegion();return g;}
function at(g,floor=1,id='paper'){const s=g.state,n=s.map[floor-1][0];s.floor=floor;s.screen='map';s.journey.regionIndex=Math.floor((floor-1)/10);s.history=s.history.filter(x=>x.floor!==floor);n.type='fight';n.revealed=true;n.encounter={enemyId:id};delete n.storyId;s.availableNodes=[n.id];if(s.journey.mechanist)s.journey.mechanist.stage=3;A.equal(g.enterNode(n.id),true);return s.battle;}
function battle(){const g=game(),b=at(g);b.enemy.hp=b.enemy.maxHp=1000;g.state.player.hp=g.state.player.maxHp=500;b.energy=30;b.squad.drive=6;b.draw=Array.from({length:40},()=>({uid:'draw'+(++serial),id:'J01'}));return g;}
function put(g,id){const card={uid:'test'+(++serial),id};g.state.battle.hand=[card];return card.uid;}
function play(g,id,opts){const uid=put(g,id),legal=g.getSquadCardOptions(uid);A.ok(legal?.available,`${id}: ${legal?.reason}`);const selected=opts||legal.choices[0];A.equal(g.playCard(uid,true,selected),true,id);return uid;}
function deploy(g,id,replaceId){g.state.battle.energy=30;A.equal(g.squadAction('deploy',id,replaceId),true);}
function hit(g,hits,extra={}){const b=g.state.battle,def=N.ENEMIES[b.enemy.id],saved=def.intents,weights=def.weights;def.intents=[{name:'机关测试',hits,...extra},{name:'机关测试',hits,...extra}];def.weights=[1,1];b.enemy.intentIndex=0;try{A.equal(g.endTurn(),true);A.equal(g.resolveEnemyTurn(),true);}finally{def.intents=saved;def.weights=weights;}}
function publicState(g){const s=g.state,b=s.battle;return {screen:s.screen,hp:s.player.hp,enemyHp:b.enemy.hp,block:b.block,energy:b.energy,squad:structuredClone(b.squad)};}

test('mechanist registers48 distinct designs, exact starting deck,52HP, unique relic and46 reward cards',()=>{
 const g=game(),s=g.state,defs=Object.values(N.CARDS).filter(c=>c.character==='mechanist');A.equal(defs.length,48);A.equal(new Set(defs.map(c=>c.name)).size,48);A.deepEqual(Object.fromEntries(['basic','common','uncommon','rare'].map(r=>[r,defs.filter(c=>c.rarity===r).length])),{basic:2,common:20,uncommon:18,rare:8});A.equal(s.player.hp,52);A.deepEqual(s.player.relics,['concentric_spool']);A.deepEqual(s.player.deck.map(c=>c.id),N.STARTERS.mechanist.cards);A.equal(new Set(s.player.deck.map(c=>c.uid)).size,10);A.deepEqual(s.player.weaponInventory,[]);A.ok(s.player.questItems.includes('mech_case'));
 const b=at(g);A.equal(b.squad.drive,2);A.equal(b.squad.guardId,'chengshan');A.deepEqual(b.squad.slots,['chengshan',null]);A.equal(b.squad.roster.chengshan.deployedTurn,1);A.equal(b.energy,3);A.equal(b.hand.length,5);
 for(let i=0;i<8;i++){const h=battle(),c=h.state.battle;c.enemy.hp=1;c.energy=10;c.squad.drive=6;play(h,'J07');A.equal(h.state.screen,'reward');for(const id of h.state.reward.cards){A.equal(N.CARDS[id].character,'mechanist');A.ok(!['J01','J02'].includes(id));}}
});
test('preselected first machine persists between battles; each new battle restores durability/calibration',()=>{
 const g=game();A.equal(g.setFirstMachine('shiying'),true);const b=at(g);A.deepEqual(b.squad.slots,['shiying',null]);A.equal(b.squad.guardId,'shiying');A.equal(g.setFirstMachine('mingdi'),false);b.squad.roster.shiying.hp=1;b.squad.roster.shiying.passiveBonus=3;const c=at(g,2);A.equal(c.squad.roster.shiying.hp,8);A.equal(c.squad.roster.shiying.passiveBonus,0);A.equal(c.squad.drive,2);
});
test('base operations spend real spirit/drive and do not count as cards',()=>{
 const g=battle(),b=g.state.battle,start=g.state.stats.cardsPlayed;b.energy=4;b.squad.drive=2;deploy(g,'mingdi');A.equal(b.squad.guardId,'player');const energy=b.energy;A.equal(g.squadAction('command','mingdi'),true);A.equal(b.enemy.hp,993);A.equal(b.squad.drive,0);A.equal(b.squad.guardId,'mingdi');A.equal(b.energy,energy);A.equal(g.squadAction('command','mingdi'),false);A.equal(g.squadAction('charge'),true);A.equal(b.squad.drive,2);A.equal(b.energy,energy-1);A.equal(g.state.stats.cardsPlayed,start);
});
test('full slots require an explicit replacement and rejected actions never pay',()=>{
 const g=battle(),b=g.state.battle;deploy(g,'mingdi');const before=publicState(g);A.equal(g.squadAction('deploy','shiying'),false);A.deepEqual(publicState(g),before);A.equal(g.squadAction('deploy','shiying','mingdi'),true);A.deepEqual(b.squad.slots,['chengshan','shiying']);A.equal(b.squad.roster.mingdi.place,'reserve');A.equal(b.squad.guardId,'player');
});
test('recall does not repair; same-turn re-deployment and command refresh exploits fail',()=>{
 const g=battle(),b=g.state.battle;deploy(g,'mingdi');b.squad.roster.mingdi.hp=4;b.squad.roster.mingdi.passiveBonus=2;g.squadAction('command','mingdi');A.equal(g.squadAction('recall','mingdi'),true);A.equal(b.squad.roster.mingdi.hp,4);A.equal(b.squad.roster.mingdi.passiveBonus,2);A.equal(b.squad.roster.mingdi.commandTurn,1);A.equal(g.squadAction('deploy','mingdi'),false);A.match(g.state.notice,/本回合/);
});
test('drive first turn2, natural recovery starts second, overflow reports actual gain',()=>{
 const g=game(),b=at(g);A.equal(b.squad.drive,2);b.enemy.hp=1000;hit(g,[]);A.equal(b.squad.drive,3);b.energy=10;b.squad.drive=5;A.equal(g.squadAction('charge'),true);A.equal(b.squad.drive,6);A.ok(b.events.some(e=>e.type==='squadDrive'&&e.amount===1&&e.requested===2));A.equal(g.squadAction('charge'),false);const uid=put(g,'J17');const energy=b.energy;A.equal(g.playCard(uid,false),false);A.equal(b.energy,energy);
});
test('final active executor controls guard, automatic passives preserve it',()=>{
 const g=battle(),b=g.state.battle;deploy(g,'mingdi');play(g,'J03',{unitId:'mingdi'});A.equal(b.squad.guardId,'mingdi');play(g,'J02',{unitId:'chengshan'});A.equal(b.squad.guardId,'chengshan');const hp=b.squad.roster.chengshan.hp;hit(g,[9]);A.equal(b.squad.roster.chengshan.hp,hp);A.equal(g.state.player.hp,500);A.equal(b.enemy.hp,988);A.equal(b.squad.guardId,'chengshan');
});
test('documented multi-hit example: own shield, machine durability, overflow and feedback each settle once',()=>{
 const g=battle(),b=g.state.battle,m=b.squad.roster.chengshan;m.hp=5;m.block=4;m.passiveBonus=-4;b.block=2;const hp=g.state.player.hp;hit(g,[6,6]);A.equal(m.hp,0);A.equal(g.state.player.hp,hp-4);A.equal(b.squad.guardId,'player');A.equal(m.place,'reserve');A.equal(b.events.filter(e=>e.type==='squadBroken').length,1);
});
test('after a machine breaks, later segments attack the body and life drain counts only body loss',()=>{
 const g=battle(),b=g.state.battle,m=b.squad.roster.chengshan;m.hp=2;m.passiveBonus=-4;b.enemy.hp=900;hit(g,[4,5],{drain:true});A.equal(m.hp,0);A.equal(g.state.player.hp,490);A.equal(b.drainDamage,7);A.equal(b.enemy.hp,903);
 const h=battle(),c=h.state.battle;c.enemy.hp=900;hit(h,[4],{drain:true});A.equal(c.enemy.hp,900);A.equal(c.drainDamage,0);
});
test('poison, mark and resource restrictions still affect the body behind a healthy guard',()=>{
 const g=battle(),b=g.state.battle;hit(g,[],{poison:2,playerMark:2,energyPenalty:1,drawPenalty:1});A.equal(g.state.player.hp,498);A.equal(b.poison,1);A.equal(b.playerMark,2);A.equal(b.energy,2);A.equal(b.hand.length,4);A.equal(b.squad.roster.chengshan.hp,18);
});
test('broken machines can be repaired but wait until the next player turn; repeated repair cannot bypass it',()=>{
 const g=battle(),b=g.state.battle,m=b.squad.roster.chengshan;m.hp=1;m.passiveBonus=-4;hit(g,[2]);A.equal(m.hp,0);A.equal(g.squadAction('repair','chengshan'),true);A.equal(m.hp,6);A.equal(m.readyAtTurn,3);A.equal(g.squadAction('repair','chengshan'),true);A.equal(m.readyAtTurn,3);A.equal(g.squadAction('deploy','chengshan'),false);hit(g,[]);A.equal(g.squadAction('deploy','chengshan'),true);
});
test('base overload pays3drive+4durability, retreats, forbids same-turn return and does not take attack bonuses',()=>{
 const g=battle(),b=g.state.battle;deploy(g,'mingdi');b.nextAttack=8;b.pillPower=9;g.state.player.power=3;const hp=b.squad.roster.mingdi.hp;A.equal(g.squadAction('overload','mingdi'),true);A.equal(b.squad.drive,3);A.equal(b.squad.roster.mingdi.hp,hp-4);A.equal(b.enemy.hp,982);A.equal(b.nextAttack,8);A.equal(b.squad.guardId,'player');A.equal(g.squadAction('deploy','mingdi'),false);hit(g,[]);A.equal(g.squadAction('deploy','mingdi'),true);
});
test('low-durability overload still bursts after feedback if body survives; feedback lethal stops all effects',()=>{
 for(const hp of [20,3]){const g=battle(),b=g.state.battle;deploy(g,'mingdi');b.squad.roster.mingdi.hp=2;g.state.player.hp=hp;A.equal(g.squadAction('overload','mingdi'),true);A.equal(b.squad.roster.mingdi.hp,0);A.equal(b.enemy.hp,hp===3?1000:982);A.equal(g.state.screen,hp===3?'defeat':'battle');A.equal(g.state.player.hp,hp===3?0:17);}
});
test('fox rescues lethal broken-line feedback once and allows the queued overload to execute',()=>{
 const g=battle(),b=g.state.battle;deploy(g,'mingdi');b.squad.roster.mingdi.hp=2;g.state.player.hp=2;g.state.player.relics.push('fox');A.equal(g.squadAction('overload','mingdi'),true);A.equal(g.state.player.hp,12);A.equal(b.enemy.hp,982);A.equal(g.state.player.relics.includes('fox'),false);
});
test('counter targets actual machine attacker rather than current guard; broken source cannot swallow backlash',()=>{
 const g=battle(),b=g.state.battle;deploy(g,'mingdi');b.squad.guardId='chengshan';b.enemy.counter=4;play(g,'J33',{unitId:'mingdi'});A.equal(b.squad.roster.mingdi.hp,6);A.equal(b.squad.roster.chengshan.hp,18);A.equal(g.state.player.hp,500);
 const h=battle(),c=h.state.battle;deploy(h,'mingdi');c.squad.roster.mingdi.hp=2;c.enemy.counter=4;A.equal(h.squadAction('overload','mingdi'),true);A.equal(h.state.player.hp,493);A.equal(c.enemy.hp,982);
});
test('auto-fire counter can break its source, feedback lethal cannot turn into a posthumous victory',()=>{
 const g=battle(),b=g.state.battle;deploy(g,'mingdi');b.squad.roster.mingdi.hp=1;b.enemy.counter=3;g.state.player.hp=3;A.equal(g.endTurn(),true);A.equal(g.state.screen,'defeat');A.equal(b.enemy.hp,997);A.equal(g.resolveEnemyTurn(),false);
});
test('wall echo responds to direct durability loss only and its retaliation never recursively counters',()=>{
 const g=battle(),b=g.state.battle;play(g,'J32');play(g,'J02',{unitId:'chengshan'});b.squad.roster.chengshan.block=0;b.squad.roster.chengshan.passiveBonus=-4;b.squad.drive=1;b.enemy.counter=5;hit(g,[2,2]);A.equal(b.enemy.hp,994);A.equal(b.squad.drive,3);A.equal(b.squad.roster.chengshan.hp,14);
 const h=battle(),c=h.state.battle;play(h,'J32');c.enemy.counter=2;play(h,'J27',{unitId:'chengshan'});A.equal(c.enemy.hp,988);A.equal(c.squad.drive,6);
});
test('insufficient drive, invalid targets and cancellation preserve spirit/cards/resources',()=>{
 const g=battle(),b=g.state.battle,uid=put(g,'J20');b.squad.drive=1;let before=publicState(g);A.equal(g.playCard(uid,true,{unitId:'chengshan'}),false);A.deepEqual(publicState(g),before);b.squad.drive=3;before=publicState(g);A.equal(g.playCard(uid,true,{unitId:'missing'}),false);A.deepEqual(publicState(g),before);A.equal(g.playCard(uid,false,{unitId:'chengshan'}),false);A.deepEqual(publicState(g),before);A.equal(b.hand[0].uid,uid);
});
test('card overload replacement cost is not double-charged; only its first hit gets capped card bonus',()=>{
 const g=battle(),b=g.state.battle;deploy(g,'mingdi');b.squad.drive=1;b.energy=2;b.nextAttack=20;play(g,'J37',{unitId:'mingdi'});A.equal(b.squad.drive,0);A.equal(b.energy,0);A.equal(b.enemy.hp,968);A.deepEqual(b.events.filter(e=>e.type==='attack'&&e.target==='enemy').map(e=>e.amount),[14,6,6,6]);A.equal(b.squad.roster.mingdi.hp,6);
});
test('J03 shares one first-hit bonus across body and machine sources',()=>{
 const g=battle(),b=g.state.battle;deploy(g,'mingdi');b.nextAttack=8;play(g,'J03',{unitId:'mingdi'});A.equal(b.enemy.hp,983);A.deepEqual(b.events.filter(e=>e.type==='attack'&&e.target==='enemy').map(e=>[e.amount,e.executor]),[[14,'player'],[3,'mingdi']]);
});
test('calibration changes only matching passive, not command or overload; reserve retains it',()=>{
 const g=battle(),b=g.state.battle;play(g,'J36');deploy(g,'mingdi');const before=b.enemy.hp;g.squadAction('command','mingdi');A.equal(b.enemy.hp,before-7);play(g,'J47',{order:['mingdi','chengshan']});A.equal(b.enemy.hp,before-12);g.squadAction('recall','mingdi');A.equal(b.squad.roster.mingdi.passiveBonus,2);b.squad.drive=6;hit(g,[]);deploy(g,'mingdi');g.squadAction('overload','mingdi');A.equal(b.enemy.hp,before-30);
});
test('body shield relic never enhances machine shield; medicine never changes guard',()=>{
 const g=battle(),b=g.state.battle;g.state.player.relics.push('silk');play(g,'J02',{unitId:'chengshan'});A.equal(b.squad.roster.chengshan.block,6);A.equal(b.silkUsed,false);play(g,'J02',{unitId:'player'});A.equal(b.block,8);A.equal(b.silkUsed,true);play(g,'J02',{unitId:'chengshan'});const guard=b.squad.guardId;g.state.player.hp=470;A.equal(g.useItem('herb'),true);A.equal(b.squad.guardId,guard);
});
test('J48 grants one free extra command after overload even when that model already commanded',()=>{
 const g=battle(),b=g.state.battle;deploy(g,'mingdi');g.squadAction('command','mingdi');b.squad.drive=2;play(g,'J48',{unitId:'chengshan'});A.equal(b.squad.drive,0);A.equal(b.squad.roster.chengshan.place,'reserve');A.equal(b.squad.roster.chengshan.hp,14);A.equal(b.enemy.hp,986);A.equal(b.block,24);A.equal(b.squad.guardId,'mingdi');A.equal(b.squad.roster.mingdi.commandTurn,1);
});
test('J14 controlled disassembly is the only zero-feedback destruction and grants actual remaining shield',()=>{
 const g=battle(),b=g.state.battle;b.squad.roster.chengshan.hp=15;const hp=g.state.player.hp;play(g,'J14',{unitId:'chengshan'});A.equal(b.block,12);A.equal(b.squad.roster.chengshan.hp,0);A.equal(g.state.player.hp,hp);A.equal(b.squad.guardId,'player');
});
test('ability engines queue next-turn resources, shield reset and two-machine draw at real turn boundary',()=>{
 const g=battle(),b=g.state.battle;deploy(g,'shiying');play(g,'J23');play(g,'J46');play(g,'J22');b.squad.drive=0;hit(g,[]);A.equal(b.squad.drive,6);A.equal(b.hand.length,7);A.equal(b.block,0);A.equal(b.squad.nextDrive,0);A.equal(b.squad.roster.chengshan.block,0);
});
test('wing assistance triggers once per player turn, only from another real command, without moving guard',()=>{
 const g=battle(),b=g.state.battle;deploy(g,'mingdi');play(g,'J40');const hp=b.enemy.hp;g.squadAction('command','chengshan');A.equal(b.enemy.hp,hp-4);A.equal(b.squad.guardId,'chengshan');b.squad.drive=6;g.squadAction('command','mingdi');A.equal(b.enemy.hp,hp-11);A.equal(b.squad.guardId,'mingdi');
});
test('every one of48 card branches is playable and preview matches actual public rule results without RNG use',()=>{
 for(let i=1;i<=48;i++){const id='J'+String(i).padStart(2,'0'),g=battle(),b=g.state.battle;deploy(g,'mingdi');if(id==='J17')b.squad.drive=2;if(id==='J45'){g.squadAction('recall','mingdi');deploy(g,'shiying');}if(['J11','J12','J13','J15','J16'].includes(id))b.squad.roster.chengshan.hp=8;const uid=put(g,id),legal=g.getSquadCardOptions(uid);A.ok(legal.available,`${id}: ${legal.reason}`);const opts=legal.choices[0],before=publicState(g),p=g.previewCard(uid,opts);A.ok(p.available,id);A.deepEqual(publicState(g),before,id+' preview mutates');A.equal(g.playCard(uid,true,opts),true,id);A.equal(g.state.player.hp,p.playerHpAfter,id+' hp');A.equal(b.enemy.hp,p.enemyHpAfter,id+' enemy');A.deepEqual(b.squad,p.squad.after,id+' squad');A.equal(b.energy,p.resources.after.energy,id+' energy');A.ok(b.exhaust.some(c=>c.uid===uid)===N.CARDS[id].exhaust,id+' zone');}
});
test('all three two-machine combinations can win a real ordinary encounter using guard decisions',()=>{
 for(const first of ['chengshan','mingdi','shiying']){const g=game();g.setFirstMachine(first);const b=at(g);const next={chengshan:'mingdi',mingdi:'shiying',shiying:'chengshan'}[first];A.equal(g.squadAction('deploy',next),true);for(let turn=0;turn<15&&g.state.screen==='battle';turn++){for(const card of [...b.hand]){if(b.phase!=='player'||g.state.screen!=='battle')break;const legal=g.getSquadCardOptions(card.uid);if(legal?.available){const opts=legal.choices.find(c=>c.guardId==='chengshan')||legal.choices[0];g.playCard(card.uid,true,opts);}}if(g.state.screen==='battle'){if(b.squad.drive>=2&&fieldExists(b,'chengshan'))g.squadAction('command','chengshan');g.endTurn();g.resolveEnemyTurn();}}A.equal(g.state.screen,'reward',first);A.ok(g.state.player.hp>0);}
 function fieldExists(b,id){return b.squad.roster[id].place==='field'&&b.squad.roster[id].hp>0;}
});
test('personal scenes intercept without consuming a route, preserve evidence and return to selected node',()=>{
 const g=game(),s=g.state,n=s.map[3][0];s.floor=4;s.screen='map';n.type='rest';n.revealed=true;s.availableNodes=[n.id];A.equal(g.enterNode(n.id),true);A.equal(s.event.id,'tinglan_bridge');const i=s.event.choices.findIndex(c=>c.key==='repair_deploy');A.equal(g.chooseEvent(i),true);A.equal(s.player.gold,40);A.ok(s.player.questItems.includes('tl_testimony'));A.equal(s.journey.mechanist.stage,1);A.equal(g.chooseEvent(i),false);A.equal(g.leaveEvent(),true);A.equal(s.screen,'rest');A.equal(s.floor,4);A.equal(s.history.some(h=>h.floor===4),false);g.rest(false);A.equal(s.floor,5);
});
test('mechanist class does not skip household boss awakening requirements or acquire sword shop stock',()=>{
 const g=game(),s=g.state,n=s.map[1][0];s.floor=2;s.screen='map';n.type='shop';n.revealed=true;s.availableNodes=[n.id];g.enterNode(n.id);A.equal(s.shop.weapons.length,0);A.equal(g.buyWeapon(0),false);A.equal(g.equipWeapon('training'),false);A.equal(s.player.equippedWeapon,null);
});
test('old four characters do not get squad fields or an extra random call from machinery reads',()=>{
 for(const starter of ['mark','sword','sovereign','hehuan']){const g=N.createGame({rng:()=>.43,profile:{version:1,unlocks:['feiye']},tales:false,bossQuests:false,factions:false});A.equal(g.newRun(starter),true);g.enterRegion();g.enterNode('fight');A.equal(g.state.battle.squad,undefined);A.equal(g.getSquadOptions(),null);A.equal(g.squadAction('charge'),false);A.equal(g.setFirstMachine('mingdi'),false);}
});
test('reading targets, previews and status panels never advances the live random stream',()=>{
 let calls=0;const g=N.createGame({rng:()=>{calls++;return .43;},environment:false,tales:false,factions:false,bossQuests:false});g.newRun('mechanist');g.enterRegion();g.enterNode('fight');const b=g.state.battle;b.energy=10;const uid=put(g,'J03'),before=calls;for(let i=0;i<10;i++){g.getSquadOptions();const legal=g.getSquadCardOptions(uid);for(const choice of legal.choices)A.ok(g.previewCard(uid,choice).available);}A.equal(calls,before);A.equal(b.hand[0].uid,uid);A.equal(b.squad.drive,2);
});
test('overload killing blow still pays durability and retreat first; duplicate clicks cannot repeat rewards',()=>{
 const g=battle(),b=g.state.battle;deploy(g,'mingdi');b.enemy.hp=1;const hp=b.squad.roster.mingdi.hp;A.equal(g.squadAction('overload','mingdi'),true);A.equal(g.state.screen,'reward');A.equal(b.squad.roster.mingdi.hp,hp-4);A.equal(b.squad.roster.mingdi.place,'reserve');const money=g.state.player.gold;A.equal(g.squadAction('overload','mingdi'),false);A.equal(g.resolveEnemyTurn(),false);A.equal(g.state.player.gold,money);A.equal(g.state.stats.battles,1);
});
test('counter damage killing the controller stops the remaining overloaded hit queue',()=>{
 const g=battle(),b=g.state.battle;deploy(g,'mingdi');b.enemy.counter=20;g.state.player.hp=2;A.equal(g.squadAction('overload','mingdi'),true);A.equal(g.state.screen,'defeat');A.equal(b.enemy.hp,994);A.equal(b.events.filter(e=>e.type==='attack'&&e.target==='enemy').length,1);
});
test('later personal evidence options stay locked until their real item exists and one-use drive aid is consumed once',()=>{
 const g=game(),s=g.state;const blank=N.MECHANIST.buildEvent('tinglan_seal',s);A.ok(blank.choices.find(c=>c.key==='return').locked);A.ok(blank.choices.find(c=>c.key==='copy').locked);s.player.questItems.push('tl_control_record');s.journey.flags.tlHasControl=true;s.journey.mechanist={stage:1,lastOutcome:'原芯已取',resume:null};const n=s.map[17][0];s.floor=18;s.journey.regionIndex=1;s.screen='map';n.type='rest';n.revealed=true;s.availableNodes=[n.id];g.enterNode(n.id);A.equal(s.event.id,'tinglan_seal');const ix=s.event.choices.findIndex(c=>c.key==='return');A.equal(g.chooseEvent(ix),true);A.equal(s.player.questItems.includes('tl_control_record'),false);A.equal(s.player.gold,95);A.equal(s.journey.nextDriveAid,2);A.equal(g.chooseEvent(ix),false);g.leaveEvent();g.rest(false);const b=at(g,19);A.equal(b.squad.drive,4);A.equal(s.journey.nextDriveAid,0);const c=at(g,20);A.equal(c.squad.drive,2);const final=N.MECHANIST.buildEvent('tinglan_record',s);A.ok(final.choices.find(c=>c.key==='publish').locked);
});
