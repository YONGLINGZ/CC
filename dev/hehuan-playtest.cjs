/* Seeded Hehuan policies. No oracle intent reads, no HP/card/resource injections.
 * Only the isolated enemy benchmarks arrange a first node's enemy identity. */
'use strict';
const fs=require('node:fs'),crypto=require('node:crypto'),A=require('node:assert/strict'),N=require('./engine.js'),{random,nextItem}=require('./playtest.cjs');
const MODES=['immediate-only','mixed'];
const cardValues={H01:5,H02:4,H03:11,H04:7,H05:7,H06:10,H07:12,H08:8,H09:7,H10:9,H11:13,H12:12};
function value(id){return cardValues[id]||4;}
function fresh(seed,mode){const g=N.createGame({rng:random(seed)});A.equal(g.newRun('hehuan'),true);return {g,mode,seed,metrics:[],current:null,seen:new Set(),steps:0,observations:[],events:[],itemUses:[],nodes:[],modeCounts:{immediate:0,trap:0},lastObservedDamage:new WeakMap(),turns:0};}
function track(run){const s=run.g.state,b=s.battle;if(!b)return;if(run.current!==b){run.current=b;run.seen=new Set();run.metrics.push({floor:s.floor,enemy:b.enemy.id,name:b.enemy.name,kind:b.kind,startHp:s.player.hp,maxHp:s.player.maxHp,enemyMaxHp:b.enemy.maxHp,turns:b.turn,immediate:0,concealed:0,trapTriggered:0,trapExpired:0,observations:[],damageTaken:0,healing:0,postVictoryHealing:0,expirationReasons:[],byCard:{},finalized:false});}
 const m=run.metrics.at(-1);if(m.finalized)return;
 for(const e of b.events||[]){if(run.seen.has(e.id))continue;run.seen.add(e.id);if(e.cardId){const c=m.byCard[e.cardId]||(m.byCard[e.cardId]={immediate:0,trap:0,triggered:0,expired:0,trapDamage:0});if(e.type==='card')c[e.mode==='trap'?'trap':'immediate']++;if(e.type==='trapTrigger')c.triggered++;if(e.type==='trapExpired')c.expired++;if(e.type==='attack'&&e.source==='trap'&&e.target==='enemy')c.trapDamage+=e.damage||0;}if(e.type==='victory')m.victorySeen=true;
  if(e.type==='card'){const mode=e.mode==='trap'?'trap':'immediate';run.modeCounts[mode]++;if(mode==='trap')m.concealed++;else m.immediate++;}
  if(e.type==='trapTrigger')m.trapTriggered++;
  if(e.type==='trapExpired'){m.trapExpired++;m.expirationReasons.push(e.reason);}
  if(e.type==='breath'){const record={floor:s.floor,enemy:b.enemy.id,turn:b.turn,remaining:e.remaining,category:e.category};m.observations.push(record);run.observations.push(record);}
  if((e.target||'player')==='player'){if(e.type==='heal'){m.healing+=e.amount||0;if(m.victorySeen)m.postVictoryHealing+=e.amount||0;}if(['attack','poison','affliction','selfDamage'].includes(e.type))m.damageTaken+=e.damage||0;}
 }
 m.turns=b.turn;m.endHp=s.player.hp;m.won=b.enemy.hp<=0;m.netLifeLoss=m.startHp-m.endHp;m.combatOnlyNetLoss=m.netLifeLoss+m.postVictoryHealing;
 if(b.phase==='ended'){m.finalized=true;m.defeated=s.screen==='defeat';}
}
function shieldNeed(s,category,previous){const b=s.battle,p=s.player;const estimate=previous||(['boss','hidden'].includes(b.kind)?10:b.kind==='elite'?10:7);return Math.max(0,(category==='nonattack'?0:estimate)-b.block)*(p.hp<18?1.3:1);}
function observeIfUseful(run){const g=run.g,s=g.state,b=s.battle;if(run.mode!=='mixed')return false;const info=g.getBreath();if(!info.enabled||info.usedThisTurn||info.remaining<=0)return false;
 const conditional=b.hand.some(c=>N.CARDS[c.id].trap?.condition!=='action'&&N.CARDS[c.id].trap&&N.CARDS[c.id].cost<=b.energy);
 // Spend finite information on the opening, a vulnerable turn, or a hand with several condition-dependent choices.
 const reasons=b.turn===1||s.player.hp<=s.player.maxHp*.55||b.hand.filter(c=>N.CARDS[c.id].trap?.condition&&N.CARDS[c.id].trap.condition!=='action').length>=2;
 if(conditional&&reasons){A.equal(g.revealBreath(),true);track(run);return true;}return false;
}
function actionFor(run){const g=run.g,s=g.state,b=s.battle,p=s.player,info=g.getBreath(),category=info.revealed?info.category:null,need=shieldNeed(s,category,run.lastObservedDamage.get(b)),delaySafe=category==='nonattack'||p.hp>Math.max(9,need+4),missing=p.maxHp-p.hp;
 let best=null;const offer=(card,mode,score,recallUid=null)=>{if(Number.isFinite(score)&&score>0&&(!best||score>best.score))best={card,mode,score,recallUid};};
 for(const c of b.hand){const d=N.CARDS[c.id];if(!d||d.cost>b.energy)continue;let recalled=null;
  if(c.id==='H06'){if(b.hand.length>=10||!b.traps.length)continue;recalled=b.traps.find(t=>{const rule=N.CARDS[t.id].trap;return category&&rule.condition!=='action'&&rule.condition!==category;})||null;}
  if(c.id!=='H06'||recalled){
   let raw={H01:6,H03:4,H04:4,H07:10,H09:4,H10:12,H12:18}[c.id]||0,block={H02:6,H04:4,H07:6,H08:6,H11:7}[c.id]||0,draw={H03:1,H05:2,H06:1}[c.id]||0,removed=c.id==='H09'?Math.min(6,b.enemy.block):0;
   if(d.attack){const w=N.WEAPONS[p.equippedWeapon],bonus=(b.nextAttack||0)+(b.bloodPower||0)+(b.pillPower||0)+(p.power||0)+(!b.weaponUsed?(w?.bonus||0):0)+(!b.mirrorUsed&&p.relics.includes('mirror')?7:0)+(!b.fangUsed&&p.relics.includes('fang')?2:0);raw+=Math.min(N.BALANCE.firstHitBonusCap,bonus);}
   const dmg=Math.min(b.enemy.hp,Math.max(0,raw-Math.max(0,b.enemy.block-removed))),cost=Math.max(.75,d.cost);let score=(dmg+removed*.7+Math.min(block,need)*(p.hp<22?1.7:1.15)+draw*(b.energy>d.cost?4.5:1.3)+(c.id==='H08'&&b.poison?3:0))/cost;
   if(raw>0&&raw>=b.enemy.hp+Math.max(0,b.enemy.block-removed))score+=1000;
   if(c.id==='H06')score+=2;offer(c,'immediate',score,recalled?.uid);
  }
  if(run.mode!=='mixed'||!d.trap||b.traps.length>=2)continue;
  if(b.traps.some(t=>N.CARDS[t.id].trap?.onlyTrap))continue;
  const t=d.trap;if(t.onlyTrap&&b.traps.length)continue;
  let chance=t.condition==='action'?1:category?(t.condition===category?1:0):(t.condition==='attack'?.62:.38);if(chance===0)continue;
  const before=t.before||{},after=t.after||{},expectedShield=Math.min(before.block||0,need),afterDamage=Math.max(0,(after.damage||0)-Math.max(0,b.enemy.block-(after.removeBlock||0)));
  // Damage after the enemy acts cannot rescue a player already dead; heavily discount it when low.
  let score=(expectedShield*(p.hp<22?1.8:1.25)+afterDamage*(delaySafe?.88:.3)+(after.healOnLife&&afterDamage?Math.min(after.healOnLife,missing)*1.4:0)+(after.drawNext||0)*3+(after.blockNext||0)*.7+(after.energyNext||0)*5+(before.cleanseIncoming?1:0))*chance/Math.max(.75,d.cost);
  if(!delaySafe&&(after.drawNext||after.energyNext))score*=.35;
  if((after.damage||0)>=b.enemy.hp+b.enemy.block&&category==='nonattack')score+=40;
  offer(c,'trap',score);
 }
 return best;
}
function combatAction(run,allowItems){const g=run.g,s=g.state,b=s.battle;if(b.phase==='enemy'){A.equal(g.resolveEnemyTurn(),true);track(run);return;}
 if(allowItems){const id=nextItem(s);if(id&&g.getItemUse(id).usable){A.equal(g.useItem(id),true);run.itemUses.push({floor:s.floor,id,screen:s.screen});track(run);return;}}
 observeIfUseful(run);const action=actionFor(run);
 if(action){A.equal(action.mode==='trap'?g.setTrap(action.card.uid):g.playCard(action.card.uid,!!N.CARDS[action.card.id].target,action.recallUid),true,'policy action failed '+action.card.id+'/'+action.mode);track(run);return;}
 run.turns++;A.equal(g.endTurn(),true);track(run);A.equal(g.resolveEnemyTurn(),true);track(run);
 // Record only already observed net damage; no future action type or numerical intent is read.
 if(g.state.battle===b){const observed=(b.events||[]).filter(e=>e.type==='attack'&&e.source==='enemy'&&e.target==='player').reduce((n,e)=>n+(e.amount||0),0);if(observed>0)run.lastObservedDamage.set(b,observed);}
}
function equip(run){const g=run.g,p=g.state.player,preferred=['divine','rime','spirit','training'].find(id=>p.weaponInventory.includes(id)&&p.level>=N.WEAPONS[id].requiredLevel);if(preferred&&p.equippedWeapon!==preferred)A.equal(g.equipWeapon(preferred),true);}
function eventChoice(run){const g=run.g,s=g.state,e=s.event;if(e.resolved){A.equal(g.leaveEvent(),true);return;}
 const legal=e.choices.map((choice,index)=>({choice,index})).filter(x=>g.canChooseEvent(x.index));A.ok(legal.length,'event without legal exit '+e.id);let selected;
 if(e.id==='hehuan_checkpoint')selected=legal.find(x=>x.choice.key==='investigate');
 if(e.id==='hehuan_qinheng')selected=legal.find(x=>x.choice.key==='negotiate')||legal.find(x=>x.choice.key==='purchase')||legal.find(x=>x.choice.key==='attack');
 if(e.id==='hehuan_ledger')selected=legal.find(x=>x.choice.key==='publish')||legal.find(x=>x.choice.key==='leave');
 if(e.bossQuest)selected=legal.find(x=>x.choice.key==='witness')||legal.find(x=>x.choice.key==='prepare');
 if(e.factionEvent){if(e.factionEvent.kind==='source')selected=legal.find(x=>x.choice.factionKey==='investigate');else selected=legal.find(x=>x.choice.factionAction==='enter')||legal.find(x=>x.choice.factionKey==='investigation')||legal.find(x=>x.choice.factionKey==='aid')||legal.find(x=>x.choice.factionKey==='help')||legal.find(x=>x.choice.factionKey==='leave');}
 if(e.id==='tainted_mercy')selected=legal.find(x=>!x.choice.afflict&&!x.choice.hpCost);
 if(!selected){const p=s.player;const score=c=>Math.min(c.heal||0,p.maxHp-p.hp)*2+(c.guard||0)*.65+(c.cardIds||[]).reduce((n,id)=>n+value(id)*.6,0)+(c.relic?20:0)+(c.goldGain||0)*.28-(c.goldCost||0)*.24-(c.hpCost||0)*(p.hp<25?5:1.4)-(c.maxHpCost||0)*2-(c.battle?20:0)+(c.itemGrants||[]).reduce((n,x)=>n+(x.id==='herb'?3:x.id==='antidote'?5:8)*(x.count||1),0);selected=legal.slice().sort((a,b)=>score(b.choice)-score(a.choice))[0];}
 run.events.push({floor:s.floor,id:e.id,key:selected.choice.key||selected.choice.factionKey||selected.choice.factionAction||null,label:selected.choice.label});A.equal(g.chooseEvent(selected.index),true);
}
function shop(run){const g=run.g,s=g.state,p=s.player,shop=s.shop;const supplies=(shop.items||[]).map((x,i)=>({...x,index:i})).filter(x=>!x.bought&&p.gold>=x.price&&(['healing_pill','fullheal_pill'].includes(x.id)&&p.hp<p.maxHp-10||x.id==='antidote'&&p.affliction?.active));if(supplies.length)A.equal(g.buyItem(supplies[0].index),true);
 const weapons=(shop.weapons||[]).map((x,i)=>({...x,index:i})).filter(x=>!x.bought&&p.gold>=x.price&&p.level>=N.WEAPONS[x.id].requiredLevel).sort((a,b)=>N.WEAPONS[b.id].bonus-N.WEAPONS[a.id].bonus);if(p.equippedWeapon==='training'&&weapons.length)A.equal(g.buyWeapon(weapons[0].index),true);equip(run);
 const goods=shop.cards.map((x,i)=>({...x,index:i})).filter(x=>!x.bought&&p.deck.filter(c=>c.id===x.id).length<3&&value(x.id)>=9).sort((a,b)=>value(b.id)-value(a.id));if(p.gold>=35&&goods.length)A.equal(g.buyCard(goods[0].index),true);
 if(p.gold>=40&&!shop.removed&&p.deck.length>10){const weak=p.deck.find(c=>c.id==='H02'&&p.deck.filter(x=>x.id==='H02').length>2);if(weak)A.equal(g.removeCard(weak.uid),true);}A.equal(g.leaveShop(),true);
}
function reward(run){const g=run.g,s=g.state,r=s.reward,p=s.player;if(r.relicPending){const rank=['moonheart','dream','ninelives','godblood','jade','vial','mirror','moon','bloodstone','fang','silk'],id=r.relicChoices.slice().sort((a,b)=>(rank.indexOf(a)<0?99:rank.indexOf(a))-(rank.indexOf(b)<0?99:rank.indexOf(b)))[0];A.equal(g.chooseRelic(id),true);return;}
 const picks=r.cards.filter(id=>p.deck.filter(c=>c.id===id).length<(id==='H03'?4:3)).sort((a,b)=>value(b)-value(a));const best=picks[0];A.equal(g.chooseReward(best&&(p.deck.length<18||value(best)>=10)?best:null),true);
}
function finish(run,kind){track(run);for(const m of run.metrics){A.ok(m.observations.length<=3,'mirror exceeded3');A.equal(new Set(m.observations.map(x=>x.turn)).size,m.observations.length,'multiple observations in one turn');A.ok(m.observations.every((x,i)=>x.remaining===2-i),'observation budget restored');}const s=run.g.state,sets=run.metrics.reduce((n,x)=>n+x.concealed,0),triggered=run.metrics.reduce((n,x)=>n+x.trapTriggered,0),expired=run.metrics.reduce((n,x)=>n+x.trapExpired,0);return {seed:run.seed,mode:run.mode,kind,result:s.screen,floor:s.floor,hp:s.player.hp,maxHp:s.player.maxHp,completedNodes:s.history.length,steps:run.steps,turns:run.turns,battles:run.metrics.length,modes:run.modeCounts,trapSet:sets,trapTriggered:triggered,trapExpired:expired,trapExpiryRate:sets?expired/sets:0,observations:run.observations,itemUses:run.itemUses,eventChoices:run.events,personalStory:s.journey.hehuan||null,foreignCards:s.player.deck.filter(c=>N.CARDS[c.id]?.character!=='hehuan').map(c=>c.id),battleMetrics:run.metrics};}
function fullRun(seed,mode){const run=fresh(seed,mode),g=run.g;while(!['victory','defeat'].includes(g.state.screen)){A.ok(++run.steps<16000,'run stalled');track(run);const s=g.state,p=s.player;if(s.screen==='battle'){combatAction(run,true);continue;}
 const item=nextItem(s);if(item&&g.getItemUse(item).usable){A.equal(g.useItem(item),true);run.itemUses.push({floor:s.floor,id:item,screen:s.screen});track(run);continue;}
 switch(s.screen){case'arrival':equip(run);A.equal(g.enterRegion(),true);break;
 case'map':{equip(run);const nodes=g.getAvailableNodes();A.ok(nodes.length);const score=n=>(n.storyId?.startsWith('hehuan_')?100:n.type==='rest'?Math.min(18,p.maxHp-p.hp)*4:n.type==='event'?18:n.type==='cave'?15:n.type==='shop'?10:n.type==='elite'?-12:0)-Math.abs(n.lane-seed%4);const n=nodes.slice().sort((a,b)=>score(b)-score(a))[0];run.nodes.push({floor:s.floor,type:n.type,id:n.id});A.equal(g.enterNode(n.id),true);break;}
 case'event':eventChoice(run);break;
 case'cave':A.equal(s.cave.explored?g.leaveCave():g.exploreCave(),true);break;
 case'rest':A.equal(g.rest(true),true);break;
 case'shop':shop(run);break;
 case'fox':A.equal(g.fox(p.maxHp>32&&!p.relics.includes('fox')),true);break;
 case'reward':reward(run);break;
 case'threshold':A.equal(g.leaveThreshold(),true);break;
 default:throw Error('Unexpected screen '+s.screen);
 }}return finish(run,'natural70');}
function benchmark(seed,mode,enemy,kind){const run=fresh(seed,mode),g=run.g;g.enterRegion();const s=g.state,node=s.map[0][0];node.type=kind;delete node.storyId;node.encounter={enemyId:enemy,kind};s.availableNodes=[node.id];A.equal(g.enterNode(node.id),true);A.equal(s.player.hp,56);A.equal(s.player.deck.length,10);while(g.state.screen==='battle'){A.ok(++run.steps<2000,'benchmark stalled');track(run);combatAction(run,false);}return finish(run,'isolated:'+kind+':'+enemy);}
function summary(rows){const byCard={};for(const r of rows)for(const m of r.battleMetrics)for(const[id,counts]of Object.entries(m.byCard)){const c=byCard[id]||(byCard[id]={immediate:0,trap:0,triggered:0,expired:0,trapDamage:0});for(const k of Object.keys(c))c[k]+=counts[k]||0;}const median=a=>{const s=a.slice().sort((a,b)=>a-b);return s[Math.floor(s.length/2)]??null;};const sets=rows.reduce((n,x)=>n+x.trapSet,0),triggered=rows.reduce((n,x)=>n+x.trapTriggered,0),expired=rows.reduce((n,x)=>n+x.trapExpired,0),immediate=rows.reduce((n,x)=>n+x.modes.immediate,0);return {runs:rows.length,wins:rows.filter(x=>['victory','reward'].includes(x.result)).length,defeats:rows.filter(x=>x.result==='defeat').length,turnsMedian:median(rows.map(x=>x.turns)),hpMedian:median(rows.map(x=>x.hp)),battleNetLossMedian:median(rows.flatMap(x=>x.battleMetrics.map(m=>m.combatOnlyNetLoss))),trapSet:sets,trapTriggered:triggered,trapExpired:expired,trapExpiryRate:sets?expired/sets:0,immediate,concealed:sets,concealedFraction:immediate+sets?sets/(immediate+sets):0,observations:rows.reduce((n,x)=>n+x.observations.length,0),byCard};}
function main(){const benchmarks=[],runs=[];for(const mode of MODES)for(let i=0;i<10;i++){const seed=4300+i;for(const [enemy,kind]of [['paper','fight'],['yaksha','elite'],['snake','boss']])benchmarks.push(benchmark(seed,mode,enemy,kind));runs.push(fullRun(seed,mode));}
 const groups={};for(const mode of MODES){groups[mode]={full:summary(runs.filter(r=>r.mode===mode)),isolated:{}};for(const kind of ['fight','elite','boss'])groups[mode].isolated[kind]=summary(benchmarks.filter(r=>r.mode===mode&&r.kind.includes(':'+kind+':')));}
 const files=['dev/hehuan-playtest.cjs','dev/hehuan.js','dev/engine.js','dev/expansion.js','dev/expedition.js','dev/event-editorial.js','dev/tales.js','dev/boss-quests.js','dev/seven.js','dev/enemy-factions.js','dev/playtest.cjs'];const report={method:'Two deterministic policies: immediate-only versus mixed. Mixed uses at most3 actual revealBreath calls per battle, once per player turn, then sees only getBreath category. No getIntent or enemy.intentIndex reads for decisions. Immediate mode uses documented printed-value estimates plus visible first-hit buffs; no preview or future-action oracle is read. Estimates only rank choices; authoritative combat runs in the engine. Full runs use public game actions from56HP/60spirit stones/exact starter, normal items/rewards/equipment/rest; no HP/card/resource injections or forced kills. Isolated benchmarks only arrange first node enemy identity/kind, use natural56HP/exact starter and no consumables. Full-route same seeds diverge naturally as different combat lengths consume RNG; not matched later encounter sequences. This is a heuristic mechanics comparison, not human playtest or difficulty acceptance.',fullRuns:runs.length,benchmarkRuns:benchmarks.length,groups,runs,benchmarks,humanParticipants:0,inputs:Object.fromEntries(files.map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')]))};fs.writeFileSync('dev/hehuan-playtest-results.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({fullRuns:report.fullRuns,benchmarkRuns:report.benchmarkRuns,groups},null,2));}
if(require.main===module)main();module.exports={fullRun,benchmark,summary};
