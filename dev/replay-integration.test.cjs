'use strict';
// Integration fixtures intentionally set encounter/card/resource state to isolate rules.
// Natural playthrough coverage belongs to replay-playtest.cjs, which never mutates run state.
const test=require('node:test'),A=require('node:assert/strict'),N=require('./engine.js');
const roles={assassin:'mark',sword:'sword',hehuan:'hehuan',mechanist:'mechanist',sovereign:'sovereign'};
const copy=x=>JSON.parse(JSON.stringify(x));
function game(role='assassin',config={},profile={version:1,unlocks:['feiye']},options={}){
 const g=N.createGame({environment:false,scaling:false,tales:false,bossQuests:false,profile,...options});
 A.equal(g.newRun(roles[role],role,{mode:'short',seed:'qa-rules-12',challenge:0,oath:N.REPLAY.oathsFor(role)[0].id,echo:null,cosmetic:null,finale:'fate',...config}),true);
 return g;
}
function at(g,f=1,type='fight',enemy='paper'){
 const s=g.state,n=s.map[f-1][0];s.screen='map';s.floor=f;s.journey.regionIndex=Math.floor((f-1)/10);s.availableNodes=[n.id];n.type=type;n.revealed=true;delete n.storyId;delete n.encounter;
 if(['fight','elite','boss'].includes(type))n.encounter={enemyId:enemy};
 A.equal(g.enterNode(n.id),true,s.notice);
 let guard=0;while(s.screen==='event'&&guard++<12){if(!s.event.resolved){const i=s.event.choices.findIndex(c=>!c.disabled&&!c.battle);A.ok(i>=0);A.equal(g.chooseEvent(i),true);}A.equal(g.leaveEvent(),true);}
 A.equal(s.screen,['fight','elite','boss'].includes(type)?'battle':type,s.notice);return n;
}
function cards(g,ids){const b=g.state.battle;b.hand=ids.map((id,i)=>({id,uid:g.state.player.deck[i%g.state.player.deck.length].uid}));b.draw=g.state.player.deck.slice(ids.length).map(c=>({...c}));b.discard=[];b.exhaust=[];b.resolving=[];b.traps=[];b.energy=30;return b.hand.map(c=>c.uid);}
function play(g,id,opts){const uid=cards(g,[id])[0];A.equal(g.playCard(uid,true,opts),true,g.state.notice);return g.state.battle.events;}
function proc(events,kind,id,key,n){const e=events.find(e=>e.type===kind&&e[kind==='oathProc'?'oathId':'gearId']===id&&e.trigger===key);A.ok(e,`${id}/${key}: missing actual proc`);A.equal(e.amount,n);}
function battle(role='assassin',config={},weapon=null){const g=game(role,config);g.state.player.equippedOutfit=null;if(weapon){g.state.player.level=9;if(!g.state.player.weaponInventory.includes(weapon))g.state.player.weaponInventory.push(weapon);A.equal(g.equipWeapon(weapon),true);}at(g);g.state.battle.enemy.maxHp=10000;g.state.battle.enemy.hp=10000;return g;}
function win(g){const b=g.state.battle;b.enemy.hp=1;b.enemy.block=0;const id={assassin:'C01',sword:'S01',hehuan:'H01',mechanist:'J01',sovereign:'F01'}[g.state.character];play(g,id);A.notEqual(g.state.screen,'battle',g.state.notice);}
function clearReward(g){if(g.state.reward?.weaponPending)A.equal(g.chooseWeaponReward(null),true);if(g.state.reward?.relicPending)A.equal(g.chooseRelic(g.state.reward.relicChoices[0]),true);if(['reward','relic'].includes(g.state.screen))A.equal(g.chooseReward(null),true);}
function profileWith(kind,id){const p=N.REPLAY_PROFILE.normalize({version:1,unlocks:['feiye']},N);p.collections[kind==='weapon'?'weapons':'relics'].push(id);return p;}
function restored(g){const save=g.exportRun();A.ok(save,'save available');const clone=N.createGame({environment:false,scaling:false,tales:false,bossQuests:false,profile:g.getProfile()});A.equal(clone.importRun(copy(save)),true,`import ${save.state.screen}`);A.deepEqual(clone.exportRun(),save);return clone;}

test('short/long create playable 30/70-floor routes and distinct selected final bosses',()=>{
 for(const mode of ['short','long'])for(const finale of ['fate','abyss']){const g=game('assassin',{mode,finale}),s=g.state;A.equal(s.map.length,mode==='short'?30:70);A.equal(s.regions.length,mode==='short'?3:7);const last=s.map.at(-1)[0];A.equal(last.encounter.enemyId,finale==='abyss'?'snake_ascended':N.BOSS_POOLS.final);at(g,s.map.length,'boss',last.encounter.enemyId);win(g);A.equal(g.state.screen,'victory');A.equal(g.getProfile().records.length,1);A.equal(g.getProfile().records[0].mode,mode);A.equal(g.getProfile().records[0].finale,finale);}
});
test('invalid oath, role, difficulty and unavailable echo reject without replacing current run',()=>{
 const g=game(),before=g.exportRun();for(const config of [{oath:'sword_frost'},{challenge:4},{mode:'missing'},{echo:{kind:'weapon',id:'shadow_fang'}}]){A.equal(g.newRun('mark','assassin',{mode:'short',seed:'invalid',...config}),false);A.deepEqual(g.exportRun(),before);}A.equal(g.newRun('mark','sword',{}),false);
});
test('ten oaths swap a real starting card and apply their start cost',()=>{
 for(const oath of Object.values(N.REPLAY.OATHS)){const g=game(oath.role,{oath:oath.id}),s=g.state,legacy=N.createGame({profile:{version:1,unlocks:['feiye']}});legacy.newRun(roles[oath.role]);const swap=oath.starterSwap[0],count=(deck,id)=>deck.filter(c=>c.id===id).length;A.equal(count(s.player.deck,swap.from),count(legacy.state.player.deck,swap.from)-1,oath.id);A.equal(count(s.player.deck,swap.to),count(legacy.state.player.deck,swap.to)+1,oath.id);A.equal(s.player.maxHp,legacy.state.player.maxHp-(oath.effects.initialMaxHpPenalty||0),oath.id);}
});
for(const oath of Object.values(N.REPLAY.OATHS))test(`actual oath trigger and once-per-turn limit: ${oath.id}`,()=>{
 const g=battle(oath.role,{oath:oath.id}),b=g.state.battle,id=oath.id,e= oath.effects,openingSoul=b.soul;
 if(e.firstAttackMark||e.firstAttackChill||e.firstAttackSoul||e.firstAttackBonus||e.firstAttackSelfLoss){const attack={assassin:'C01',sword:'S01',sovereign:'F01'}[oath.role],hp=g.state.player.hp;let events=play(g,attack);for(const key of ['firstAttackMark','firstAttackChill','firstAttackSoul','firstAttackBonus','firstAttackSelfLoss'])if(e[key])proc(events,'oathProc',id,key,e[key]);if(e.firstAttackMark)A.equal(b.enemy.mark,e.firstAttackMark);if(e.firstAttackChill)A.ok(b.enemy.chill>=e.firstAttackChill);if(e.firstAttackSoul)A.equal(b.soul,openingSoul+2+e.firstAttackSoul);if(e.firstAttackSelfLoss)A.equal(g.state.player.hp,hp-e.firstAttackSelfLoss);events=play(g,attack);A.equal(events.filter(x=>x.type==='oathProc'&&x.oathId===id&&x.trigger.startsWith('firstAttack')).length,0);}
 if(e.firstGuardBonus){b.block=0;const guard=oath.role==='sword'?'S02':'J02';const events=play(g,guard,oath.role==='mechanist'?{unitId:'player'}:undefined);proc(events,'oathProc',id,'firstGuardBonus',e.firstGuardBonus);A.equal(b.block,6+e.firstGuardBonus);}
 if(e.firstTrapBlock){b.block=0;const uid=cards(g,['H01'])[0];A.equal(g.setTrap(uid),true);proc(b.events,'oathProc',id,'firstTrapBlock',e.firstTrapBlock);A.equal(b.block,e.firstTrapBlock);}
 if(e.firstOverloadDraw){b.squad.drive=6;const m=Object.values(b.squad.roster).find(m=>m.place==='field'),hp=m.hp;A.equal(g.squadAction('overload',m.id),true);proc(b.events,'oathProc',id,'firstOverloadDraw',1);proc(b.events,'oathProc',id,'firstOverloadRepair',2);A.equal(m.hp,hp-2);A.notEqual(m.place,'field');A.ok(m.readyAtTurn>b.turn);}
 if(e.firstSoulSpendDraw){b.soul=4;const events=play(g,'F04');proc(events,'oathProc',id,'firstSoulSpendDraw',1);A.ok(b.soul<4);A.ok(events.some(x=>x.type==='draw'));}
 if(e.thirdCardDraw||e.thirdCardBlock){b.played=2;const events=play(g,oath.role==='hehuan'?'H02':oath.role==='sovereign'?'F02':'C02');if(e.thirdCardDraw){proc(events,'oathProc',id,'thirdCardDraw',e.thirdCardDraw);A.ok(events.some(x=>x.type==='draw'));}if(e.thirdCardBlock)proc(events,'oathProc',id,'thirdCardBlock',e.thirdCardBlock);b.played=5;const second=play(g,oath.role==='hehuan'?'H02':oath.role==='sovereign'?'F02':'C02');A.equal(second.filter(x=>x.type==='oathProc'&&x.oathId===id&&x.trigger.startsWith('thirdCard')).length,0);}
});
test('first-battle-turn energy penalty does not recur on turn two',()=>{
 for(const role of ['sword','hehuan','mechanist','sovereign']){const oath=N.REPLAY.oathsFor(role).find(o=>o.effects.startEnergyPenalty),g=battle(role,{oath:oath.id});A.equal(g.state.battle.energy,2,role);A.equal(g.endTurn(),true);if(g.state.battle.phase==='enemy')A.equal(g.resolveEnemyTurn(),true);A.equal(g.state.battle.turn,2);A.equal(g.state.battle.energy,3,role);}
});
for(const w of Object.values(N.REPLAY.WEAPON_SIGNATURES))test(`real weapon opening/proc behavior: ${w.id}`,()=>{
 const g=battle(w.role,{},w.id),b=g.state.battle,keys=Object.keys(w.effects);
 if(w.openingDrive)A.ok(b.squad.drive>=w.openingDrive);if(w.openingSoul)A.equal(b.soul,w.openingSoul);if(w.block)A.ok(b.block>=w.block);
 if(w.bonus||w.effects.firstAttackMark||w.effects.firstAttackChill||w.effects.firstAttackSoul){const id={assassin:'C01',sword:'S01',hehuan:'H01',mechanist:'J01',sovereign:'F01'}[w.role],events=play(g,id);if(w.bonus)A.ok(events.some(x=>x.type==='weapon'&&x.amount===w.bonus));for(const key of ['firstAttackMark','firstAttackChill','firstAttackSoul','firstAttackSelfLoss'])if(w.effects[key])proc(events,'gearProc',w.id,key,w.effects[key]);}
 if(w.effects.firstGuardBonus){proc(b.events,'gearProc',w.id,'firstGuardBonus',w.effects.firstGuardBonus);const before=b.block;const events=play(g,'S02');A.equal(b.block-before,6);A.equal(events.some(e=>e.type==='gearProc'&&e.gearId===w.id&&e.trigger==='firstGuardBonus'),false);}
 if(w.effects.firstTrapBlock){const uid=cards(g,['H01'])[0],before=b.block;A.equal(g.setTrap(uid),true);proc(b.events,'gearProc',w.id,'firstTrapBlock',2);A.ok(b.block>=before+2);}
 if(w.effects.thirdCardDraw||w.effects.thirdCardBlock){b.played=2;const before=b.block,events=play(g,w.role==='sword'?'S02':w.role==='assassin'?'C02':'H02');for(const key of ['thirdCardDraw','thirdCardBlock'])if(w.effects[key])proc(events,'gearProc',w.id,key,w.effects[key]);if(w.effects.thirdCardBlock)A.ok(b.block>=before+w.effects.thirdCardBlock);}
 if(w.effects.firstCommandBonus){b.squad.drive=6;const m=b.squad.roster.mingdi;if(m.place!=='field')A.equal(g.squadAction('deploy','mingdi'),true);const before=b.enemy.hp;A.equal(g.squadAction('command','mingdi'),true);proc(b.events,'gearProc',w.id,'firstCommandBonus',2);A.equal(before-b.enemy.hp,9);}
 if(w.effects.firstOverloadDraw){b.squad.drive=6;const m=Object.values(b.squad.roster).find(m=>m.place==='field'),hp=m.hp;A.equal(g.squadAction('overload',m.id),true);proc(b.events,'gearProc',w.id,'firstOverloadDraw',1);proc(b.events,'gearProc',w.id,'firstOverloadRepair',3);A.equal(m.hp,hp-1);A.notEqual(m.place,'field');}
 if(w.effects.firstSoulSpendDraw){b.soul=4;const events=play(g,'F04');proc(events,'gearProc',w.id,'firstSoulSpendDraw',1);A.ok(b.soul<4);}
 if(!keys.length&&!w.bonus&&!w.block&&!w.openingDrive&&!w.openingSoul){const events=play(g,{assassin:'C01',sword:'S01',hehuan:'H01',mechanist:'J01',sovereign:'F01'}[w.role]);A.equal(events.filter(x=>x.type==='gearProc'&&x.gearId===w.id).length,0);}
});
test('challenge three applies a single third-card shield every turn and capped unused energy shield',()=>{
 const g=battle('assassin',{challenge:3}),b=g.state.battle;A.equal(b.enemy.block,3);b.enemy.block=0;b.turn=4;b.played=2;play(g,'C02');A.equal(b.enemy.block,4);b.played=5;play(g,'C02');A.equal(b.enemy.block,4);b.energy=8;A.equal(g.endTurn(),true);A.equal(b.replayCarryBlock,6);A.equal(g.resolveEnemyTurn(),true);A.ok(b.enemy.block>=9);
});
test('self-loss can kill and abort first attack without damaging enemy',()=>{
 const g=battle('sword',{oath:'sword_edge'});g.state.player.hp=1;const before=g.state.battle.enemy.hp;play(g,'S01');A.equal(g.state.screen,'defeat');A.equal(g.state.battle.enemy.hp,before);A.equal(g.getProfile().records.length,1);A.equal(g.getProfile().records[0].won,false);
});
test('echo activates only on first actual combat, expires after third victory and resets equipped weapon',()=>{
 const g=game('sword',{echo:{kind:'weapon',id:'rime'}},profileWith('weapon','rime'));A.deepEqual(g.getProfile().cooldowns,{});A.equal(g.state.player.equippedWeapon,'training');
 for(let i=1;i<=3;i++){at(g,i);A.equal(g.state.player.equippedWeapon,'rime');A.ok(g.getProfile().cooldowns['weapon:rime']);win(g);A.equal(g.state.replay.echo.remaining,3-i);clearReward(g);}A.equal(g.state.player.equippedWeapon,'training');A.equal(g.state.player.weaponInventory.includes('rime'),false);
});
test('same real echo weapon acquired from chapter reward survives the third victory',()=>{
 const g=game('sword',{echo:{kind:'weapon',id:'rime'}},profileWith('weapon','rime'));at(g,10,'boss','paper');win(g);g.state.reward.weaponChoices=['rime'];A.equal(g.chooseWeaponReward('rime'),true);A.equal(g.state.replay.echo.acquired,true);clearReward(g);for(const f of [11,13]){at(g,f);win(g);clearReward(g);}A.equal(g.state.replay.echo.remaining,0);A.ok(g.state.player.weaponInventory.includes('rime'));A.equal(g.state.player.equippedWeapon,'rime');
});
test('same real echo relic acquisition survives expiry with a single godblood health gain',()=>{
 const g=game('assassin',{echo:{kind:'relic',id:'godblood'}},profileWith('relic','godblood')),base=g.state.player.maxHp;at(g);A.equal(g.state.player.maxHp,base);A.equal(g.state.battle.block,4);win(g);g.state.reward.relicChoices=['godblood'];g.state.reward.relicPending=true;A.equal(g.chooseRelic('godblood'),true);A.equal(g.state.replay.echo.acquired,true);clearReward(g);for(const f of [2,4]){at(g,f);win(g);clearReward(g);}A.ok(g.state.player.relics.includes('godblood'));A.equal(g.state.player.maxHp,base+12);
});
test('godblood echo grants only temporary opening block and never permanent hp',()=>{
 const g=game('assassin',{echo:{kind:'relic',id:'godblood'}},profileWith('relic','godblood')),base=g.state.player.maxHp;for(const f of [1,2,4]){at(g,f);A.equal(g.state.player.maxHp,base);A.equal(g.state.battle.block,4);win(g);clearReward(g);}A.equal(g.state.player.maxHp,base);A.ok(g.state.player.hp<=base);A.equal(g.state.player.relics.includes('godblood'),false);
});
test('abandon/new-run spam cannot temper echo; a later first realm can and not its own echo',()=>{
 const p=profileWith('relic','jade');p.collections.relics.push('moon');const g=game('assassin',{echo:{kind:'relic',id:'jade'}},p);at(g);g.abandonRun();for(let i=0;i<3;i++){A.equal(g.newRun('mark','assassin',{mode:'short',seed:'new'+i}),true);g.abandonRun();}A.ok(g.getProfile().cooldowns['relic:jade']);A.equal(g.newRun('mark','assassin',{mode:'short',seed:'temper',echo:{kind:'relic',id:'moon'}}),true);at(g,10,'boss','paper');win(g);A.equal(g.getProfile().cooldowns['relic:jade'],undefined);A.ok(g.getProfile().cooldowns['relic:moon']);
});
test('fallen sword rewards include an actual usable demonic card',()=>{
 const g=game('sword');g.state.player.path.fallen=true;g.state.player.path.learned=true;at(g);win(g);const id=g.state.reward.cards.find(id=>id.startsWith('D'));A.ok(id);A.equal(g.chooseReward(id),true);A.ok(g.state.player.deck.some(c=>c.id===id));at(g,2);const uid=cards(g,[id])[0];A.equal(g.playCard(uid,true),true,g.state.notice);
});
test('preview is pure for live state, seeded RNG and profile and leaves resumed outcomes identical',()=>{
 for(const role of Object.keys(roles)){const g=game(role);at(g);const before=g.exportRun(),profile=g.getProfile();for(let i=0;i<3;i++)for(const c of g.state.battle.hand)g.previewCard(c.uid);A.deepEqual(g.exportRun(),before,role);A.deepEqual(g.getProfile(),profile);const h=restored(g);g.endTurn();h.endTurn();if(g.state.battle.phase==='enemy'){g.resolveEnemyTurn();h.resolveEnemyTurn();}A.deepEqual(g.exportRun(),h.exportRun(),role);}
});
test('real arrival/map/battle/enemy-phase/reward/shop/rest/fox/event/cave saves resume same transition',()=>{
 const check=(g,action)=>{const h=restored(g);if(action){A.equal(action(g),action(h));A.deepEqual(g.exportRun(),h.exportRun());}};
 const arrival=game();check(arrival,g=>g.enterRegion());check(arrival);const combat=game();at(combat);check(combat,g=>g.endTurn());check(combat,g=>g.resolveEnemyTurn());win(combat);check(combat,g=>g.chooseReward(null));
 for(const type of ['shop','rest','fox','cave']){const g=game();at(g,2,type);check(g,{shop:g=>g.leaveShop(),rest:g=>g.rest(true),fox:g=>g.fox(false),cave:g=>g.exploreCave()}[type]);}
 const e=game('assassin',{},undefined,{tales:true});const s=e.state,n=s.map[2][0];s.screen='map';s.floor=3;s.availableNodes=[n.id];n.type='shop';n.revealed=true;A.equal(e.enterNode(n.id),true);A.equal(e.state.screen,'event');check(e,g=>g.chooseEvent(g.state.event.choices.findIndex(c=>!c.disabled&&!c.battle)));check(e,g=>g.leaveEvent());
});
test('malformed snapshots reject atomically and restored terminal record is not duplicated',()=>{
 const g=game(),save=g.exportRun();for(const mutate of [v=>v.state.player.hp=-1,v=>v.rngState=-1,v=>v.activeNodeId='missing',v=>v.state.replay.oath='sword_edge',v=>v.state.map[0][0].next=['missing']]){const bad=copy(save);mutate(bad);A.equal(g.importRun(bad),false);A.deepEqual(g.exportRun(),save);}at(g,30,'boss','paper');win(g);const h=restored(g);A.equal(h.getProfile().records.length,1);A.equal(h.importRun(g.exportRun()),true);A.equal(h.getProfile().records.length,1);
});
test('same seed reproduces shop stock, refresh, cave search and continued cave save',()=>{
 const a=game('sword',{seed:'merchant-cave-a'}),b=game('sword',{seed:'merchant-cave-a'});for(const g of [a,b]){g.state.player.gold=500;at(g,2,'shop');}A.deepEqual(a.exportRun(),b.exportRun());const cursor=a.exportRun().rngState;A.equal(a.refreshShop(),true);A.equal(b.refreshShop(),true);A.notEqual(a.exportRun().rngState,cursor);A.deepEqual(a.exportRun(),b.exportRun());for(const g of [a,b]){g.leaveShop();at(g,4,'cave');}A.deepEqual(a.exportRun(),b.exportRun());const h=restored(a);A.equal(a.exploreCave(),true);A.equal(b.exploreCave(),true);A.equal(h.exploreCave(),true);A.deepEqual(a.exportRun(),b.exportRun());A.deepEqual(a.exportRun(),h.exportRun());restored(a);
});
test('pending relic/weapon choices, threshold and defeat save with executable continuations',()=>{
 const elite=game();at(elite,2,'elite','paper');win(elite);A.equal(elite.state.reward.relicPending,true);const eh=restored(elite),relic=elite.state.reward.relicChoices[0];A.equal(eh.chooseRelic(relic),true);A.equal(elite.chooseRelic(relic),true);A.deepEqual(eh.exportRun(),elite.exportRun());
 const boss=game();at(boss,10,'boss','paper');win(boss);A.equal(boss.state.reward.weaponPending,true);const bh=restored(boss);A.equal(bh.chooseWeaponReward(null),true);A.equal(boss.chooseWeaponReward(null),true);A.deepEqual(bh.exportRun(),boss.exportRun());
 const threshold=game();Object.assign(threshold.state.journey.flags,{bellEcho:true,ritualName:true,emptyVow:true});at(threshold,30,'boss','paper');win(threshold);A.equal(threshold.state.screen,'threshold');const th=restored(threshold);A.equal(th.startHiddenBoss(),true);A.equal(threshold.startHiddenBoss(),true);A.deepEqual(th.exportRun(),threshold.exportRun());restored(th);
 const loss=battle('sword',{oath:'sword_edge'});loss.state.player.hp=1;play(loss,'S01');A.equal(loss.state.screen,'defeat');const lh=restored(loss);A.equal(lh.getProfile().records.length,1);A.equal(lh.newRun('sword','sword',{mode:'short',seed:'after-loss',oath:'sword_frost'}),true);
});
test('no oath is a real unmodified starting deck and cosmetics do not grant outfit statistics',()=>{
 const plain=game('assassin',{oath:null}),old=N.createGame({profile:{version:1,unlocks:['feiye']}});old.newRun('mark');A.deepEqual(plain.state.player.deck.map(c=>c.id),old.state.player.deck.map(c=>c.id));A.equal(plain.state.player.maxHp,old.state.player.maxHp);const profile=N.REPLAY_PROFILE.normalize({version:1,unlocks:['feiye']},N),id=Object.keys(N.OUTFITS).find(id=>N.OUTFITS[id].characters.includes('assassin')&&id!==N.INITIAL_OUTFITS.assassin);profile.collections.cosmetics=[id];const dressed=game('assassin',{oath:null,cosmetic:id},profile);at(plain);at(dressed);for(const k of ['energy','block'])A.equal(dressed.state.battle[k],plain.state.battle[k]);A.equal(dressed.state.battle.hand.length,plain.state.battle.hand.length);A.equal(dressed.state.player.equippedOutfit,plain.state.player.equippedOutfit);
});
test('real weapon kept after echo conversion returns to inventory when level is insufficient at expiry',()=>{
 const g=game('sword',{oath:null,echo:{kind:'weapon',id:'rime'}},profileWith('weapon','rime'));at(g);win(g);g.state.reward.weaponChoices=['rime'];g.state.reward.weaponPending=true;A.equal(g.chooseWeaponReward('rime'),true);clearReward(g);for(const f of [2,4]){g.state.player.level=1;g.state.player.xp=0;at(g,f);A.equal(g.getWeaponStatus().canEquip,true);win(g);clearReward(g);}A.equal(g.state.replay.echo.remaining,0);A.equal(g.state.player.level,1);A.ok(g.state.player.weaponInventory.includes('rime'));A.equal(g.state.player.equippedWeapon,'training');A.equal(g.equipWeapon('rime'),false);
});
test('divine echo retains low-level sentient-weapon backlash',()=>{
 const g=game('sword',{oath:null,echo:{kind:'weapon',id:'divine'}},profileWith('weapon','divine'));g.state.player.equippedOutfit=null;at(g);A.equal(g.state.player.level,1);A.equal(g.getWeaponStatus().controlled,false);A.equal(g.state.battle.energy,2);const b=g.state.battle;b.enemy.hp=b.enemy.maxHp=10000;b.block=1000;const hp=g.state.player.hp;g.endTurn();g.resolveEnemyTurn();A.equal(b.turn,2);A.ok(b.events.some(e=>e.type==='selfDamage'&&e.reason==='神剑反噬'&&e.amount===3));A.ok(g.state.player.hp<=hp-3);
});
test('same real weapon bought before the first echo combat is never deleted at expiry',()=>{
 const g=game('sword',{oath:null,echo:{kind:'weapon',id:'rime'}},profileWith('weapon','rime'));g.state.player.gold=500;at(g,1,'shop');const i=g.state.shop.weapons.findIndex(w=>w.id==='rime');A.equal(g.buyWeapon(i),true);A.equal(g.state.replay.echo.claimed,false);A.equal(g.state.replay.echo.acquired,true);A.ok(g.state.player.weaponInventory.includes('rime'));g.leaveShop();for(const f of [2,4,5]){at(g,f);win(g);clearReward(g);}A.equal(g.state.replay.echo.remaining,0);A.ok(g.state.player.weaponInventory.includes('rime'));
});
test('same real godblood obtained before echo activation gains hp once and survives expiry',()=>{
 const g=game('assassin',{echo:{kind:'relic',id:'godblood'}},profileWith('relic','godblood')),base=g.state.player.maxHp;g.state.screen='reward';g.state.reward={cards:[],relicPending:true,relicChoices:['godblood']};A.equal(g.chooseRelic('godblood'),true);A.equal(g.state.replay.echo.claimed,false);A.equal(g.state.replay.echo.acquired,true);A.equal(g.state.player.maxHp,base+12);for(const f of [1,2,4]){at(g,f);A.equal(g.state.player.maxHp,base+12);win(g);clearReward(g);}A.equal(g.state.replay.echo.remaining,0);A.ok(g.state.player.relics.includes('godblood'));A.equal(g.state.player.maxHp,base+12);
});
