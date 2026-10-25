/* Hehuan core contracts. Combat fixtures explicitly arrange hands, HP and intents. */
'use strict';
const test=require('node:test'),A=require('node:assert/strict'),N=require('./engine.js');
let serial=0;
function game(starter='hehuan',extra={}){const g=N.createGame({rng:()=>.43,environment:false,scaling:false,tales:false,factions:false,bossQuests:false,profile:{version:1,unlocks:['feiye']},...extra});A.equal(g.newRun(starter),true);A.equal(g.enterRegion(),true);return g;}
function at(g,id='paper',kind='fight',floor=1){const s=g.state,n=s.map[floor-1][0];s.screen='map';s.floor=floor;s.journey.regionIndex=Math.floor((floor-1)/10);s.history=s.history.filter(x=>x.floor!==floor);n.type=kind;n.revealed=true;delete n.storyId;n.encounter={enemyId:id,kind};s.availableNodes=[n.id];A.equal(g.enterNode(n.id),true);return s.battle;}
function battle(id='paper',kind='fight'){const g=game(),b=at(g,id,kind);b.enemy.hp=b.enemy.maxHp=500;g.state.player.hp=g.state.player.maxHp=500;b.draw=Array.from({length:40},()=>({id:'H01',uid:'draw-'+(++serial)}));b.hand=[];b.energy=20;return g;}
function put(g,ids,energy=20){const b=g.state.battle;b.hand=ids.map(id=>({id,uid:'hand-'+(++serial)}));b.energy=energy;return b.hand.map(c=>c.uid);}
function hide(g,id){const [uid]=put(g,[id],Math.max(0,g.state.battle.energy));A.equal(g.setTrap(uid),true);return uid;}
function withIntent(g,def,fn){const b=g.state.battle,model=b.factionDef?.id===b.enemy.id?b.factionDef:N.ENEMIES[b.enemy.id],saved=model.intents;model.intents=[{name:'明确动作fixture',...def},{name:'明确动作fixture',...def}];b.enemy.intentIndex=0;try{return fn();}finally{model.intents=saved;}}
function turn(g,index=0){g.state.battle.enemy.intentIndex=index;A.equal(g.endTurn(),true);A.equal(g.resolveEnemyTurn(),true);}
function play(g,id,target=true){const [uid]=put(g,[id]);A.equal(g.playCard(uid,target),true);return uid;}
function zoneCount(b,uid){return ['hand','draw','discard','exhaust','resolving','traps'].reduce((n,k)=>n+(b[k]||[]).filter(c=>c.uid===uid).length,0);}
function mechanics(g){const s=structuredClone(g.state);delete s.notice;if(s.battle){delete s.battle.logs;delete s.battle.events;}return JSON.stringify(s);}
function trapHits(b){return (b.events||[]).filter(e=>e.type==='attack'&&e.source==='trap'&&e.target==='enemy');}

test('Hehuan starts unlocked at56 HP with the exact ten cards, unique relic and independent identity',()=>{
 const g=game(),s=g.state;A.equal(s.character,'hehuan');A.equal(s.player.character,'hehuan');A.equal(s.player.hp,56);A.equal(s.player.maxHp,56);A.equal(s.player.gold,60);A.deepEqual(s.player.relics,['heartmirror']);A.equal(s.player.path.fallen,false);A.equal(s.player.path.corruption,0);A.equal(N.CHARACTERS.hehuan.faction,'hehuan');A.equal(!!N.CHARACTERS.hehuan.locked,false);
 A.deepEqual(s.player.deck.map(c=>c.id).sort(),['H01','H01','H02','H02','H02','H03','H03','H04','H04','H05'].sort());A.equal(new Set(s.player.deck.map(c=>c.uid)).size,10);
 for(let n=1;n<=12;n++){const id='H'+String(n).padStart(2,'0');A.equal(N.CARDS[id].character,'hehuan');A.ok(N.CARDS[id].trap?.text);}
 const b=at(g);A.equal(b.hand.length,5);A.equal(b.energy,3);A.equal(b.traps.length,0);A.equal(g.getBreath().remaining,3);
});

test('placing a trap pays once, counts one card, preserves its unique instance and never spends attack-only bonuses',()=>{
 const g=battle(),b=g.state.battle,[uid]=put(g,['H01'],3);b.nextAttack=4;b.weaponUsed=false;b.fangUsed=false;b.mirrorUsed=false;g.state.player.relics.push('fang','mirror');const played=g.state.stats.cardsPlayed;
 A.equal(g.setTrap(uid),true);A.equal(b.energy,2);A.equal(b.played,1);A.equal(g.state.stats.cardsPlayed,played+1);A.equal(b.traps[0].uid,uid);A.equal(zoneCount(b,uid),1);A.equal(b.nextAttack,4);A.equal(b.weaponUsed,false);A.equal(b.fangUsed,false);A.equal(b.mirrorUsed,false);A.equal(b.enemy.hp,500);
 const snapshot=mechanics(g);A.equal(g.setTrap(uid),false);A.equal(mechanics(g),snapshot);
});

test('full slots, insufficient spirit and enemy phase reject placement without deducting or moving cards',()=>{
 const g=battle(),b=g.state.battle;hide(g,'H01');hide(g,'H02');let [uid]=put(g,['H03'],3);const snapshot=mechanics(g);A.equal(g.setTrap(uid),false);A.equal(b.energy,3);A.equal(b.hand[0].uid,uid);A.equal(b.traps.length,2);A.equal(mechanics(g),snapshot);
 const h=battle(),c=h.state.battle;[uid]=put(h,['H03'],0);A.equal(h.setTrap(uid),false);A.equal(c.energy,0);A.equal(c.hand[0].uid,uid);c.energy=3;h.endTurn();A.equal(h.setTrap(uid),false);A.equal(c.traps.length,0);
});

test('third-card jade may trigger on placing, but resolving traps never counts cards or spends another fee',()=>{
 const g=battle(),b=g.state.battle;g.state.player.relics.push('jade');const [a,c,d]=put(g,['H02','H01','H02'],3);A.equal(g.playCard(a,false),true);A.equal(g.setTrap(c),true);A.equal(g.setTrap(d),true);A.equal(b.played,3);A.equal(b.energy,1);const count=g.state.stats.cardsPlayed;withIntent(g,{hits:[6]},()=>turn(g));A.equal(g.state.stats.cardsPlayed,count);A.equal(b.energy,3);A.equal(trapHits(b).length,1);
});

test('observe is a pure reading of fixed intent, limited to3 per battle and1 each player turn',()=>{
 let calls=0;const g=game('hehuan',{rng:()=>{calls++;return .43;}}),b=at(g);g.state.player.hp=g.state.player.maxHp=500;b.enemy.hp=b.enemy.maxHp=500;
 withIntent(g,{hits:[6]},()=>{for(let n=0;n<3;n++){const before=calls,energy=b.energy;A.equal(g.revealBreath(),true);A.equal(calls,before);A.equal(b.energy,energy);A.equal(g.getBreath().remaining,2-n);A.equal(g.getBreath().category,'attack');for(let i=0;i<5;i++)g.getBreath();A.equal(calls,before);A.equal(g.revealBreath(),false);A.equal(g.getBreath().remaining,2-n);turn(g);}A.equal(g.revealBreath(),false);A.equal(g.getBreath().remaining,0);});
 at(g,'paper','fight',2);A.equal(g.getBreath().remaining,3);
});

test('an already revealed category updates without another reveal and does not expose exact attack values',()=>{
 const g=battle(),b=g.state.battle;withIntent(g,{hits:[8]},()=>{A.equal(g.revealBreath(),true);A.equal(g.getBreath().category,'attack');N.ENEMIES.paper.intents[0]={name:'secret heal fixture',heal:8};A.equal(g.getBreath().category,'nonattack');A.equal(g.getBreath().remaining,2);const view=g.getBreath();for(const key of ['hits','name','damage','poison','intentIndex'])A.equal(view[key],undefined);});
});

test('the planned three-card example deals13 and blocks12 when immediate and concealed modes are combined',()=>{
 const g=battle(),b=g.state.battle,[near,silk,hit]=put(g,['H03','H02','H01'],3);A.equal(g.setTrap(near),true);A.equal(g.setTrap(silk),true);A.equal(g.playCard(hit,true),true);const hp=g.state.player.hp;
 withIntent(g,{hits:[12]},()=>turn(g));A.equal(g.state.player.hp,hp);A.equal(b.enemy.hp,487);A.deepEqual(trapHits(b).map(x=>x.damage),[7]);A.ok(b.events.some(e=>e.type==='attack'&&e.source==='enemy'&&e.absorbed===12));A.equal(b.traps.length,0);A.equal(zoneCount(b,near),1);A.equal(zoneCount(b,silk),1);
});

test('mixed actions and zero-damage segments still count as attacks; a multi-hit action triggers only once',()=>{
 for(const hits of [[0],[3,3,3]]){const g=battle(),b=g.state.battle;hide(g,'H01');withIntent(g,{block:4,hits},()=>turn(g));A.equal(trapHits(b).length,1);A.equal(trapHits(b)[0].amount,8);A.equal(b.enemy.hp,496);A.equal(b.traps.length,0);}
});

test('nonattacking action triggers theft once after new shield, while attack-conditioned cards expire without refund',()=>{
 const g=battle(),b=g.state.battle;hide(g,'H04');hide(g,'H01');const paid=b.energy;withIntent(g,{block:6},()=>turn(g));A.equal(trapHits(b).length,1);A.equal(trapHits(b)[0].amount,10);A.equal(trapHits(b)[0].absorbed,6);A.equal(b.enemy.hp,496);A.equal(b.traps.length,0);A.equal(b.energy,3);A.ok(paid<20);A.ok(b.events.some(e=>e.type==='trapExpired'));
});

test('fully frozen actions trigger neither conditional nor universal traps and still clear both slots',()=>{
 const g=battle(),b=g.state.battle;const a=hide(g,'H01'),c=hide(g,'H05');g.endTurn();b.enemy.frozen=true;A.equal(g.resolveEnemyTurn(),true);A.equal(b.enemy.hp,500);A.equal(trapHits(b).length,0);A.equal(b.traps.length,0);A.equal(b.hand.length,5);A.equal(zoneCount(b,a),1);A.equal(zoneCount(b,c),1);A.ok(b.events.some(e=>e.type==='trapExpired'));
});

test('enemy-start poison victory clears traps and pending next-turn resources without retaliation',()=>{
 const g=battle(),b=g.state.battle;hide(g,'H05');const uid=hide(g,'H10');b.enemy.hp=1;b.enemy.poison=1;b.nextEnergy=2;b.nextDraw=2;const hp=g.state.player.hp;turn(g);A.equal(g.state.screen,'reward');A.equal(g.state.player.hp,hp);A.equal(trapHits(b).length,0);A.equal(b.traps.length,0);A.equal(b.nextEnergy,0);A.equal(b.nextDraw,0);A.equal(b.exhaust.some(c=>c.uid===uid),true);
});

test('recollection and position schedule7 cards,3 shield and4 spirit only for the next player turn',()=>{
 const g=battle(),b=g.state.battle;hide(g,'H05');const uid=hide(g,'H06');withIntent(g,{block:6},()=>{turn(g);A.equal(b.hand.length,7);A.equal(b.block,3);A.equal(b.energy,4);A.equal(b.exhaust.some(c=>c.uid===uid),true);turn(g);A.equal(b.hand.length,5);A.equal(b.block,0);A.equal(b.energy,3);});
});

test('H06 requires a real chosen trap and rejects a full ten-card hand before paying',()=>{
 const g=battle(),b=g.state.battle;let [uid]=put(g,['H06'],3);A.equal(g.playCard(uid,false),false);A.equal(b.energy,3);A.equal(b.hand[0].uid,uid);const a=hide(g,'H01'),c=hide(g,'H02');[uid]=put(g,['H06'],3);A.equal(g.playCard(uid,false),false);A.equal(b.traps.length,2);A.equal(g.playCard(uid,false,'not-owned'),false);A.equal(b.energy,3);
 const ids=['H06',...Array(9).fill('H01')];[uid]=put(g,ids,3);const before=mechanics(g);A.equal(g.playCard(uid,false,a),false);A.equal(mechanics(g),before);A.equal(b.traps.length,2);
 [uid]=put(g,['H06',...Array(8).fill('H01')],3);A.equal(g.playCard(uid,false,c),true);A.equal(b.hand.length,10);A.equal(b.hand.some(x=>x.uid===c),true);A.equal(b.traps[0].uid,a);A.equal(b.energy,3);A.equal(b.exhaust.some(x=>x.uid===uid),true);A.equal(zoneCount(b,c),1);
});

test('H08 direct mode removes only1 existing ordinary poison and leaves journey poison untouched',()=>{
 const g=battle(),b=g.state.battle;b.poison=3;g.state.player.affliction.active=true;play(g,'H08',false);A.equal(b.poison,2);A.equal(b.block,6);A.equal(g.state.player.affliction.active,true);
});

test('H08 applies after P2 aid and older full wards, never clears pre-existing poison or double-claims a reduction',()=>{
 const g=game();g.state.player.questItems.push('clean_gauze');const b=at(g,'snake','boss');g.state.player.hp=g.state.player.maxHp=500;b.enemy.hp=b.enemy.maxHp=500;b.draw=Array.from({length:20},()=>({id:'H01',uid:'draw-'+(++serial)}));b.poison=2;hide(g,'H08');turn(g,1);
 A.equal(g.state.journey.factions.spent.clean_gauze,true);A.equal(b.factionEffects.find(x=>x.item==='clean_gauze').before,3);A.equal(b.factionEffects.find(x=>x.item==='clean_gauze').after,2);const received=b.events.find(e=>e.type==='poison'&&e.source==='enemy'&&e.target==='player'&&e.amount>0);A.equal(received.amount,1);A.equal(received.total,3);A.equal(b.poison,2);
 const h=game();h.state.player.questItems.push('clean_gauze');const c=at(h,'snake','boss');h.state.player.hp=h.state.player.maxHp=500;c.enemy.hp=c.enemy.maxHp=500;c.bossWard={effect:'poison',item:'snake_formula',used:false};hide(h,'H08');turn(h,1);A.equal(h.state.journey.factions.spent.clean_gauze,undefined);A.equal(c.bossWard.used,true);A.equal(c.poison,0);
});

test('H08 chooses newly inflicted poison over pursuit mark, and reduces mark when no poison is present',()=>{
 for(const poison of [0,2]){const g=battle(),b=g.state.battle;hide(g,'H08');withIntent(g,{poison,playerMark:2},()=>turn(g));A.equal(b.playerMark,poison?2:1);const poisonAdd=b.events.find(e=>e.type==='poison'&&e.target==='player'&&e.amount>0);if(poison)A.equal(poisonAdd.amount,1);else A.equal(poisonAdd,undefined);}
});

test('H11 snapshots uniqueness before any trap resolves rather than becoming unique after an earlier card leaves',()=>{
 const g=battle(),b=g.state.battle;hide(g,'H02');hide(g,'H11');withIntent(g,{hits:[6]},()=>turn(g));A.equal(trapHits(b).length,0);A.equal(b.enemy.hp,500);
 const h=battle(),c=h.state.battle;hide(h,'H11');withIntent(h,{hits:[6]},()=>turn(h));A.equal(trapHits(c).length,1);A.equal(trapHits(c)[0].amount,8);A.ok(c.events.some(e=>e.type==='attack'&&e.source==='enemy'&&e.absorbed===6));
});

test('H09 separately removes enemy shield before its concealed damage and direct mode removes6 before4',()=>{
 const g=battle(),b=g.state.battle;b.enemy.block=9;play(g,'H09');A.equal(b.enemy.block,0);A.equal(b.enemy.hp,499);hide(g,'H09');withIntent(g,{block:12},()=>turn(g));A.equal(b.enemy.block,0);A.equal(b.enemy.hp,495);
});

test('H10 heals only when trap damage removes life, consumes in both modes, and heals before leaving a kill',()=>{
 for(const [block,hp,heal]of [[20,100,0],[5,100,2],[0,1,2]]){const g=battle(),b=g.state.battle;g.state.player.hp=20;g.state.player.maxHp=56;b.enemy.hp=hp;const uid=hide(g,'H10');withIntent(g,{block},()=>turn(g));A.equal(g.state.player.hp,20+heal);A.equal(b.exhaust.some(c=>c.uid===uid),true);if(hp===1)A.equal(g.state.screen,'reward');}
 const g=battle(),b=g.state.battle;g.state.player.hp=20;const uid=play(g,'H10');A.equal(g.state.player.hp,20);A.equal(b.enemy.hp,488);A.equal(b.exhaust.some(c=>c.uid===uid),true);
});

test('player death before after-effects prevents lethal trap damage, while fox rescue allows later resolution',()=>{
 const g=battle(),b=g.state.battle;g.state.player.hp=1;hide(g,'H12');withIntent(g,{hits:[6]},()=>turn(g));A.equal(g.state.screen,'defeat');A.equal(b.enemy.hp,500);A.equal(trapHits(b).length,0);A.equal(b.traps.length,0);
 const h=battle(),c=h.state.battle;h.state.player.hp=1;h.state.player.relics.push('fox');hide(h,'H12');withIntent(h,{hits:[6]},()=>turn(h));A.equal(h.state.screen,'battle');A.equal(h.state.player.hp,12);A.equal(c.enemy.hp,474);A.equal(h.state.player.relics.includes('fox'),false);
 const z=battle(),d=z.state.battle;z.state.player.hp=1;z.state.player.relics.push('fox');hide(z,'H12');withIntent(z,{hits:[20,20]},()=>turn(z));A.equal(z.state.screen,'defeat');A.equal(trapHits(d).length,0);A.equal(d.enemy.hp,500);
});

test('new enemy counter stances retaliate once per trap and stop remaining traps on player death',()=>{
 const g=battle(),b=g.state.battle;g.state.player.hp=1;hide(g,'H01');hide(g,'H12');withIntent(g,{counter:2},()=>turn(g));A.equal(trapHits(b).length,1);A.equal(trapHits(b)[0].amount,26);A.equal(g.state.screen,'defeat');A.equal(b.enemy.hp,474);A.equal(b.traps.length,0);
 const h=battle(),c=h.state.battle;h.state.player.hp=3;hide(h,'H12');hide(h,'H12');withIntent(h,{counter:2},()=>turn(h));A.equal(trapHits(c).length,2);A.equal(h.state.screen,'defeat');A.equal(c.enemy.hp,448);
});

test('trap damage respects the enemy one-life protection and killing-heal never invents life removed',()=>{
 const g=battle('m26'),b=g.state.battle;g.state.player.hp=20;b.enemy.hp=1;hide(g,'H10');withIntent(g,{block:0},()=>turn(g));A.equal(b.enemy.hp,1);A.equal(b.enemy.shellUsed,true);A.equal(g.state.player.hp,20);A.equal(g.state.screen,'battle');
});

test('trap damage does not copy first-attack, next-attack or combo bonuses from placement or trigger',()=>{
 const g=battle(),b=g.state.battle;b.nextAttack=8;g.state.player.relics.push('fang','mirror');const uid=hide(g,'H01');A.equal(b.nextAttack,8);withIntent(g,{hits:[0]},()=>turn(g));A.equal(trapHits(b)[0].amount,8);A.equal(b.enemy.hp,492);A.equal(zoneCount(b,uid),1);A.equal(b.weaponUsed,false);A.equal(b.fangUsed,false);A.equal(b.mirrorUsed,false);
});

test('direct card preview remains pure and agrees with actual shield/removal/draw/death effects',()=>{
 for(const id of ['H01','H02','H03','H04','H05','H07','H08','H09','H10','H11','H12']){const g=battle(),b=g.state.battle,[uid]=put(g,[id]);b.enemy.block=3;b.poison=2;const before=JSON.stringify(g.state),v=g.previewCard(uid);A.equal(v.available,true,id);A.equal(JSON.stringify(g.state),before,id);A.equal(g.playCard(uid,N.CARDS[id].target),true,id);A.equal(b.enemy.hp,v.enemyHpAfter,id);A.equal(g.state.player.hp,v.playerHpAfter,id);}
 const g=battle(),b=g.state.battle;const trap=hide(g,'H01'),[uid]=put(g,['H06']);const before=JSON.stringify(g.state),v=g.previewCard(uid,trap);A.equal(v.available,true);A.equal(JSON.stringify(g.state),before);A.equal(g.playCard(uid,false,trap),true);A.equal(b.traps.length,0);
});

test('new battle restores exhausted cards, clears traps and queues; restarting clears observation and character state',()=>{
 const g=game();const runCard={id:'H10',uid:'run-H10'};g.state.player.deck.push(runCard);const b=at(g),uid=runCard.uid;b.draw=b.draw.filter(c=>c.uid!==uid);b.hand=[{...runCard}];b.energy=3;A.equal(g.setTrap(uid),true);b.nextEnergy=2;b.nextDraw=2;b.enemy.hp=1;play(g,'H01');A.equal(g.state.screen,'reward');A.equal(b.traps.length,0);A.equal(b.nextEnergy,0);A.equal(b.nextDraw,0);at(g,'paper','fight',2);A.equal(g.state.battle.traps.length,0);A.equal(g.getBreath().remaining,3);A.equal([...g.state.battle.draw,...g.state.battle.hand].length,g.state.player.deck.length);A.equal(g.state.battle.exhaust.length,0);A.equal([...g.state.battle.draw,...g.state.battle.hand].filter(c=>c.uid===uid).length,1);A.equal(g.newRun('sword'),true);A.equal(g.state.character,'sword');A.equal(g.getBreath().enabled,false);A.equal(g.state.player.maxHp,60);A.equal(g.state.player.path.fallen,false);
});

test('all existing character pools exclude H cards and the new role receives only its own rewards',()=>{
 for(const role of ['mark','sword','sovereign','hehuan']){const g=game(role),b=at(g);b.enemy.hp=1;const id=role==='sword'?'S01':role==='sovereign'?'F01':role==='hehuan'?'H01':'C01';play(g,id);A.equal(g.state.screen,'reward');A.ok(g.state.reward.cards.every(x=>N.CARDS[x].character===g.state.character));A.equal(g.state.reward.cards.some(x=>x.startsWith('H')),role==='hehuan');if(role!=='hehuan'){const uid=put(g,['H01'])[0];A.equal(g.setTrap(uid),false);A.equal(g.revealBreath(),false);}}
});

test('target-required direct attacks do not spend spirit until a real target is confirmed',()=>{const g=battle(),b=g.state.battle,[uid]=put(g,['H01'],3);const before=mechanics(g);A.equal(g.playCard(uid,false),false);A.equal(mechanics(g),before);A.equal(g.playCard(uid,true),true);A.equal(b.energy,2);A.equal(b.enemy.hp,494);});

test('a killing trap cannot overwrite the explicit identity of another trap expiring during victory cleanup',()=>{
 const g=battle(),b=g.state.battle;b.enemy.hp=1;const killing=hide(g,'H12'),waiting=hide(g,'H06');
 withIntent(g,{block:0},()=>turn(g));A.equal(g.state.screen,'reward');
 const hit=b.events.find(e=>e.type==='attack'&&e.source==='trap');A.equal(hit.cardId,'H12');A.equal(hit.trapUid,killing);
 const expired=b.events.find(e=>e.type==='trapExpired'&&e.uid===waiting);A.ok(expired);A.equal(expired.cardId,'H06');
 A.equal(b.exhaust.some(c=>c.uid===waiting),true);A.equal(b.discard.some(c=>c.uid===killing),true);
});
