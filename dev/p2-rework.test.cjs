'use strict';
const test=require('node:test'),A=require('node:assert/strict'),N=require('./engine.js'),F=N.ENEMY_FACTIONS,BEFORE=require('./events-before-p2.json');
function game(){const g=N.createGame({rng:()=>.43,environment:false,tales:false});g.newRun('sword');g.enterRegion();return g;}
function at(g,id,f=8,type='event'){const s=g.state,n=s.map[f-1][0];s.screen='map';s.floor=f;s.journey.regionIndex=Math.floor((f-1)/10);n.type=type;n.revealed=true;delete n.storyId;delete n.encounter;if(type==='event')n.storyId=id;else n.encounter={enemyId:id,kind:type};s.availableNodes=[n.id];A.equal(g.enterNode(n.id),true);}
function source(g,b,i){at(g,'faction_'+b+'_source',4);A.equal(g.chooseEvent(i),true);g.leaveEvent();}
function kill(g){const b=g.state.battle;b.enemy.hp=1;b.enemy.block=0;b.hand=[{id:'C01',uid:'p2-kill'}];b.energy=3;A.equal(g.playCard('p2-kill',true),true);}
function act(g,i){g.state.battle.enemy.intentIndex=i;g.endTurn();g.resolveEnemyTurn();}
function mechanical(e){const c=structuredClone(e);for(const k of ['name','story','description','connection','kicker','editorialRevision'])delete c[k];for(const x of c.choices||[])for(const k of ['label','text','outcome','riskSummary'])delete x[k];return c;}
test('158 individual reviews are backed by data; editorial preserves every effect and is idempotent, without changing state',()=>{
 A.equal(Object.keys(BEFORE).length,158);for(const id of N.EVENT_IDS){A.ok(BEFORE[id],id);const e=structuredClone(BEFORE[id]),s=game().state,before=JSON.stringify(s),effects=mechanical(e);N.rewriteEvent(e,s);A.deepEqual(mechanical(e),effects,id);A.equal(JSON.stringify(s),before,id);A.ok(N.EDITORIAL.review(id).reason);const once=JSON.stringify(e);N.rewriteEvent(e,s);A.equal(JSON.stringify(e),once,id);}
});
test('dialogue keeps the actual history-dependent tale opening and previous outcome for every three-step chain',()=>{
 for(const [chain,q]of Object.entries(N.TALES))for(let step=1;step<=3;step++){const id=`tale_${chain}_${step}`;for(const key of ['aid','leave','guard','priority','buy']){const g=game(),s=g.state;const e=q.stages[step-1]({role:'sword',p:()=>key});e.id=id;e.connection='actual prior outcome';const original=e.story[0];N.rewriteEvent(e,s);A.equal(e.story[0],original,id);A.equal(e.connection,'actual prior outcome');}}
});
test('two-sided camp fight carries life into a distinct second fight, grants no intermediate reward, then settles once',()=>{
 const g=game();source(g,'camp_boss',3);at(g,'faction_camp_boss_cave');g.chooseEvent(0);A.equal(g.state.event.choices[4].factionAction,'both');const gold=g.state.player.gold,xp=g.state.player.xp;g.chooseEvent(4);A.equal(g.state.battle.enemy.id,'m07');g.state.player.hp=31;kill(g);A.equal(g.state.screen,'battle');A.equal(g.state.battle.enemy.id,'m09');A.equal(g.state.player.hp,31);A.equal(g.state.player.gold,gold);A.equal(g.state.player.xp,xp);A.equal(g.state.reward,null);A.equal(g.chooseEvent(4),false);kill(g);A.equal(g.state.screen,'reward');A.equal(g.state.player.gold,gold+35);A.equal(g.state.stats.eliteBattles,1);A.equal(g.chooseEvent(4),false);A.equal(g.state.player.gold,gold+35);
});
test('death during second camp encounter stops sequence and cannot award peace or combat rewards',()=>{
 const g=game();source(g,'camp_boss',3);at(g,'faction_camp_boss_cave');g.chooseEvent(0);g.chooseEvent(4);kill(g);const gold=g.state.player.gold;g.state.player.hp=1;g.state.battle.block=0;act(g,0);A.equal(g.state.screen,'defeat');A.equal(g.state.player.gold,gold);A.equal(g.state.reward,null);A.equal(g.chooseEvent(4),false);
});
test('a support task only completes after actual cave victory, and each group gets its own scene',()=>{
 for(const boss of ['gate_boss','camp_boss','snake','bell_boss']){const g=game();source(g,boss,0);const f=g.state.journey.factions;at(g,'faction_'+boss+'_cave');g.chooseEvent(0);const rec=Object.values(f.records).find(r=>r.kind==='cave');A.equal(rec.taskCompleted,undefined);kill(g);A.equal(rec.taskCompleted,true);A.ok(g.state.battle.factionAftermath);A.match(g.state.battle.factionAftermath,/你/);A.equal(g.state.player.questItems.includes(F.GROUPS[boss].aid),false);}
});
test('aid reports exact reduction once and never credits a complete old ward or frozen action to the aid',()=>{
 for(const boss of ['gate_boss','camp_boss','snake','bell_boss']){const g=game(),group=F.GROUPS[boss];g.state.player.questItems.push(group.aid);at(g,boss,10,'boss');const b=g.state.battle;g.state.player.hp=500;const index=N.ENEMIES[boss].intents.findIndex(i=>i[group.effect]);b.enemy.intentIndex=index;g.endTurn();b.enemy.frozen=true;g.resolveEnemyTurn();A.equal(g.state.journey.factions.spent[group.aid],undefined);b.enemy.frozen=null;b.bossWard={effect:group.effect,item:'snake_formula',used:false};act(g,index);A.equal(g.state.journey.factions.spent[group.aid],undefined);act(g,index);const effect=b.factionEffects.find(x=>x.item===group.aid);A.equal(effect.status,'used');A.equal(effect.before-effect.after,1);kill(g);A.match(b.factionReport[0].summary,/→/);}
});
test('unused aid and prior wards have truthful post-combat reasons; an unrelated enemy cannot consume it',()=>{
 const g=game();g.state.player.questItems.push('clean_gauze');at(g,'paper',1,'fight');kill(g);A.equal(g.state.journey.factions.spent.clean_gauze,undefined);at(g,'snake',10,'boss');kill(g);A.match(g.state.battle.factionReport[0].summary,/未实际施展/);A.equal(g.state.battle.factionReport[0].status,'carried');
});
test('support shield attribution cannot leak into later turns or count self damage as absorption',()=>{
 const g=game();g.state.player.questItems.push('well_oath');at(g,'snake',10,'boss');const b=g.state.battle;b.block=8;act(g,2);A.equal(b.factionGuardRemaining,0);A.equal(b.factionEffects[0].absorbed,0);b.block=100;act(g,0);A.equal(b.factionEffects[0].absorbed,0);kill(g);A.match(b.factionReport[0].summary,/实际抵挡0点/);
});
test('investigation does not forge a forfeited protection or a personal decision',()=>{
 for(const boss of ['abyss_boss','heart']){const g=game();source(g,boss,2);at(g,'faction_'+boss+'_cave');g.chooseEvent(0);A.equal(g.state.event.choices[0].questItem,undefined);g.chooseEvent(0);A.equal(g.state.player.questItems.includes(F.GROUPS[boss].aid),false);}
});
test('finished faction events remain aftermath even when they share an edited source ID',()=>{
 const g=game();g.state.journey.bossQuests.records.lotus_boss={concluded:true};at(g,'faction_lotus_boss_source');A.equal(g.state.event.choices[0].factionKey,'aftermath');A.match(g.state.event.story.join(''),/过期/);A.ok(!g.state.event.story.join('').includes('夺谱探客'));
});

test('a multi-hit killing card finishes only the first sequence foe; no remaining segments strike the new foe',()=>{const g=game();source(g,'camp_boss',3);at(g,'faction_camp_boss_cave');g.chooseEvent(0);g.chooseEvent(4);const b=g.state.battle;b.enemy.hp=1;b.enemy.block=0;b.hand=[{id:'C05',uid:'multi-sequence'}];b.energy=3;const preview=g.previewCard('multi-sequence');A.equal(preview.enemyDefeated,true);A.equal(preview.hits.length,1);g.playCard('multi-sequence',true);A.equal(g.state.battle.enemy.id,'m09');A.equal(g.state.battle.enemy.hp,g.state.battle.enemy.maxHp);});

test('taking a house commission cannot repeat a generic promise response at unrelated Bosses',()=>{const g=game();g.state.journey.factions={records:{},invalid:{},spent:{},behaviors:[{npc:'m03',kind:'promise'}],seen:{}};at(g,'snake',10,'boss');kill(g);A.equal(g.state.journey.journal.filter(x=>x.title==='尚未带走的器谱').length,0);at(g,'lotus_boss',20,'boss');kill(g);A.equal(g.state.journey.journal.filter(x=>x.title==='尚未带走的器谱').length,1);at(g,'lotus_boss',30,'boss');kill(g);A.equal(g.state.journey.journal.filter(x=>x.title==='尚未带走的器谱').length,1);});

test('paid testimony and leaving receive distinct on-screen aftermath once, without claiming a rescue',()=>{for(const index of [0,3]){const g=game();source(g,'snake',3);at(g,'faction_snake_cave');g.chooseEvent(0);g.chooseEvent(index);g.leaveEvent();at(g,'snake',10,'boss');kill(g);A.match(g.state.battle.factionAftermath,index===0?/证词你买走了，药还没卖给你/:/没有买药或接样/);const before=g.state.journey.journal.filter(x=>x.title==='秤鳞石窟 · 回声').length;at(g,'snake',20,'boss');kill(g);A.equal(g.state.journey.journal.filter(x=>x.title==='秤鳞石窟 · 回声').length,before);}});
