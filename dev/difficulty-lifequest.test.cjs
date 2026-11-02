'use strict';
const test=require('node:test'),A=require('node:assert/strict'),N=require('./engine.js');
function game(role='mark'){const g=N.createGame({rng:()=>.43,profile:{unlocks:['feiye']},environment:false,tales:false,factions:false,bossQuests:false});g.newRun(role);g.enterRegion();/* Isolate combat fixtures from overdue personal-story interruptions. */for(const id of ['hehuan','mechanist'])if(g.state.journey[id])g.state.journey[id].stage=3;return g;}
function at(g,f,type,id){const s=g.state,n=s.map[f-1][0];s.screen='map';s.floor=f;s.journey.regionIndex=Math.floor((f-1)/10);s.history=s.history.filter(x=>x.floor!==f);n.type=type;n.revealed=true;delete n.encounter;delete n.storyId;if(id)n.encounter={enemyId:id};s.availableNodes=[n.id];A.equal(g.enterNode(n.id),true);return s.battle;}
function win(g,f,kind='fight',id='paper'){const b=at(g,f,kind,id);b.enemy.hp=1;b.enemy.block=0;b.hand=[{id:'C01',uid:'proof'}];b.energy=10;g.playCard('proof',true);A.equal(g.state.screen,'reward');const offers=[...(g.state.reward.relicChoices||[])];if(g.state.reward.relicPending)A.equal(g.chooseRelic(offers[0]),true);A.equal(g.chooseReward(null),true);return offers;}
function earn(g,reward='fox'){g.state.player.gold=100;at(g,2,'rest');A.equal(g.lifeQuestAction('start'),true);win(g,3);win(g,10,'boss','gate_boss');at(g,12,'rest');A.equal(g.lifeQuestAction('temper'),true);win(g,20,'boss','camp_boss');at(g,22,'rest');A.equal(g.lifeQuestAction(reward),true);}
for(const role of ['mark','sword','hehuan','mechanist','sovereign'])for(const reward of ['fox','ninelives'])test(role+' completes ordered quest and consumes '+reward+' once',()=>{
 const g=game(role);earn(g,reward);const q=g.state.journey.lifeQuest,p=g.state.player;A.equal(q.stage,'claimed');A.equal(q.reward,reward);A.ok(p.relics.includes(reward));at(g,24,'fox');A.equal(g.lifeQuestAction(reward),false);g.fox(false);
 const b=at(g,25,'fight','paper');p.hp=1;b.hand=[{id:'C13',uid:'lethal'}];b.energy=5;A.equal(g.playCard('lethal'),true);A.equal(p.hp,reward==='fox'?12:18);A.equal(q.stage,'spent');A.ok(!p.relics.includes(reward));
 const next=at(g,26,'fight','paper');p.relics.push(reward);p.hp=1;next.hand=[{id:'C13',uid:'again'}];g.playCard('again');A.equal(g.state.screen,'defeat');A.ok(g.state.journey.journal.some(x=>x.title.includes('灯火用尽')));
 g.newRun(role);A.equal(g.lifeQuestStatus().stage,'unstarted');A.ok(!g.state.player.relics.includes(reward));
});
test('wrong order, unaffordable, too early and final-region initiation reject without mutation',()=>{
 const g=game();at(g,2,'rest');for(const a of ['temper','fox','ninelives']){const s=JSON.stringify(g.state);A.equal(g.lifeQuestAction(a),false);A.equal(JSON.stringify(g.state),s);}g.state.player.gold=19;A.equal(g.lifeQuestAction('start'),false);g.state.player.gold=100;g.lifeQuestAction('start');win(g,3);win(g,4);at(g,5,'rest');A.equal(g.lifeQuestAction('temper'),false);win(g,10,'boss','gate_boss');at(g,12,'rest');g.state.player.maxHp=6;A.equal(g.lifeQuestAction('temper'),false);g.state.player.maxHp=60;g.lifeQuestAction('temper');at(g,13,'rest');A.equal(g.lifeQuestAction('fox'),false);win(g,15,'elite','yaksha');at(g,16,'rest');A.equal(g.lifeQuestAction('fox'),false);
 const h=game();at(h,52,'rest');A.equal(h.lifeQuestAction('start'),false);
});
test('leave and ordinary healing preserve progress; abandonment and death are terminal without refunds',()=>{
 const g=game();at(g,2,'rest');g.lifeQuestAction('start');at(g,3,'fox');g.fox(false);A.equal(g.lifeQuestStatus().stage,'trial');at(g,4,'rest');g.rest(true);A.equal(g.lifeQuestStatus().stage,'trial');at(g,5,'rest');const gold=g.state.player.gold;A.equal(g.lifeQuestAction('abandon'),true);A.equal(g.state.player.gold,gold);at(g,6,'rest');A.equal(g.lifeQuestAction('start'),false);
 const h=game();at(h,2,'rest');h.lifeQuestAction('start');const b=at(h,3,'fight','paper');h.state.player.hp=1;b.hand=[{id:'C13',uid:'death'}];h.playCard('death');A.equal(h.lifeQuestStatus().stage,'failed');A.equal(h.lifeQuestAction('start'),false);
});
test('stale isolated relics and imported profile fields cannot grant immunity',()=>{for(const id of ['fox','ninelives']){const g=game();g.importProfile({version:1,unlocks:[],relics:[id],lifeQuest:{stage:'claimed'}});A.equal(g.lifeQuestStatus().stage,'unstarted');const b=at(g,1,'fight','paper');g.state.player.relics.push(id);g.state.player.hp=1;b.hand=[{id:'C13',uid:'old'}];g.playCard('old');A.equal(g.state.screen,'defeat');}});
test('elite, treasure, event and cave rewards never offer life protection; stale reward rejected',()=>{
 A.ok(!N.TREASURE_RELICS.includes('ninelives'));for(let seed=1;seed<=60;seed++){
 const g=N.createGame({rng:require('./playtest.cjs').random(seed),tales:false,bossQuests:false,factions:false,environment:false});g.newRun();g.enterRegion();const offers=win(g,4,'elite','yaksha');A.ok(!offers.some(x=>['fox','ninelives'].includes(x)));A.ok(!g.state.player.relics.some(x=>['fox','ninelives'].includes(x)));
 at(g,6,'cave');A.ok(!g.state.cave.outcome.rewards?.some(x=>['fox','ninelives'].includes(x.id)));
 for(const id of ['theatre','umbrella','shrine','dreamshop']){const s=g.state,n=s.map[6][0];s.floor=7;s.screen='map';s.availableNodes=[n.id];n.type='event';n.storyId=id;n.revealed=true;delete n.encounter;g.enterNode(n.id);A.ok(!s.event.choices.some(c=>['fox','ninelives'].includes(c.relic)));}
 }
 const g=game();at(g,1,'fight','paper');g.state.screen='reward';g.state.reward={relicPending:true,relicChoices:['ninelives']};A.equal(g.chooseRelic('ninelives'),false);
});
test('all ordinary templates scale monotonically by depth without double-scaling faction HP',()=>{
 for(const id of ['paper','ape','e_priest','raider','apothecary','m01','m19','m26']){let hp=0,dmg=0;for(let f=1;f<=70;f++){const g=game(),b=at(g,f,'fight',id);b.enemy.intentIndex=0;const hit=g.getIntent().hits.reduce((a,x)=>a+x,0);A.ok(b.enemy.maxHp>=hp,id+' hp '+f);A.ok(hit>=dmg,id+' hit '+f);hp=b.enemy.maxHp;dmg=hit;if(N.ENEMY_FACTIONS.DEFS[id])A.equal(hp,N.ENEMY_FACTIONS.definition(id,Math.floor((f-1)/10)).hp);}}
});
test('chapter bosses grow smoothly and late extra pressure is once per attack not per segment',()=>{
 const ids=['gate_boss','camp_boss','snake','marsh_boss','furnace_boss','mirror_boss','abyss_boss'];let last=0;for(let i=0;i<7;i++){const g=game(),b=at(g,(i+1)*10,'boss',ids[i]);A.equal(b.enemy.maxHp,N.BALANCE.bossHp[i]);A.ok(b.enemy.maxHp>last);last=b.enemy.maxHp;}
 const g=game(),b=at(g,70,'fight','ape');b.enemy.intentIndex=0;A.deepEqual(g.getIntent().hits,[9,7,7]);b.enemy.chill=5;A.deepEqual(g.getIntent().hits,[8,6,6]);
});
test('vial cannot farm previous battle losses in an untouched easy fight',()=>{const g=game();g.state.player.relics.push('vial');g.state.player.hp=20;win(g,1);A.equal(g.state.player.hp,20);});
test('100 seeded maps per role contain a connected quest route without random event rewards',()=>{
 // Graph reachability only: ignores survival/economy; combat/expense rules covered separately.
 const random=require('./playtest.cjs').random;
 for(const role of ['mark','sword','hehuan','mechanist','sovereign'])for(let seed=0;seed<100;seed++){
  const g=N.createGame({rng:random(seed),profile:{unlocks:['feiye']}});g.newRun(role);const map=g.state.map.flat(),byId=Object.fromEntries(map.map(n=>[n.id,n]));
  let states=g.state.availableNodes.map(id=>({id,stage:0,w:0,h:0,r:-1})),done=false;
  for(let floor=1;floor<=69&&!done;floor++){
   const next=new Map();for(const q of states){const n=byId[q.id];if(!n)continue;let variants=[q];const safe=['rest','fox'].includes(n.type);
    if(safe&&q.stage===0&&floor<=49)variants.push({...q,stage:1,r:n.regionIndex});
    if(safe&&q.stage===1&&q.w>=2&&q.h&&n.regionIndex>q.r)variants.push({...q,stage:2,r:n.regionIndex});
    if(safe&&q.stage===3&&n.regionIndex>q.r){done=true;break;}
    for(let v of variants){v={...v};if(['fight','elite','boss'].includes(n.type)&&v.stage===1){v.w=Math.min(2,v.w+1);v.h=v.h||n.type!=='fight';}else if(n.type==='boss'&&v.stage===2)v.stage=3;
     for(const id of n.next||[]){const t={...v,id};next.set(JSON.stringify(t),t);}
    }
   }states=[...next.values()];
  }A.ok(done,role+' seed '+seed);
 }
});
test('last start at49 can finish; late tempering is rejected before any irreversible cost',()=>{
 const g=game();g.state.player.gold=100;at(g,49,'rest');A.equal(g.lifeQuestAction('start'),true);win(g,50,'boss','furnace_boss');win(g,51);at(g,52,'rest');A.equal(g.lifeQuestAction('temper'),true);win(g,60,'boss','mirror_boss');at(g,62,'rest');A.equal(g.lifeQuestAction('ninelives'),true);
 const h=game();h.state.player.gold=100;at(h,49,'rest');h.lifeQuestAction('start');win(h,50,'boss','furnace_boss');win(h,51);at(h,61,'rest');const before=JSON.stringify(h.state);A.equal(h.lifeQuestStatus().deadlineMissed,true);A.equal(h.lifeQuestAction('temper'),false);A.equal(JSON.stringify(h.state),before);A.match(h.lifeQuestStatus().text,/不能再付费/);const late=game();earn(late);late.state.journey.lifeQuest.stage='tempered';late.state.journey.lifeQuest.claimed=false;at(late,70,'rest');A.equal(late.lifeQuestStatus().deadlineMissed,true);A.equal(late.lifeQuestAction('fox'),false);
});
test('expanded oracle recognizes newly added sword cards without changing the default policy',()=>{
 const g=game('sword'),b=at(g,1,'fight','paper');b.hand=[{id:'S19',uid:'orbit-policy'}];b.energy=1;const {nextCard}=require('./playtest.cjs');A.equal(nextCard(g.state,g),null);A.equal(nextCard(g.state,g,true).id,'S19');
});
