/* Public-API simulation. No edits to game state, HP, piles, RNG after creation,
 * prices or damage. The heuristic is a regression probe, not a human playtest. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createGame, CARDS, ENEMIES, ITEMS} = require('./engine.js');
function random(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const value = {C01:2,C02:2,C03:6,C04:8,C05:7,C06:8,C07:7,C08:8,C09:7,C10:6,C11:5,C12:8,C13:6,C14:6,C15:6,C16:9,C17:10,C18:10,C19:9,C20:8,C21:9,C22:9,C23:8,C24:9,C25:6,C26:9,C27:9,C28:10,C29:6,C30:7,C31:7,C32:8,C33:10,C34:9,C35:8,C36:9};
Object.assign(value,{S01:5,S02:7,S03:8,S04:9,S05:8,S06:8,S07:8,S08:9,S09:7,S10:8,S11:6,S12:8,S13:7,S14:9,S15:10,S16:10});
Object.assign(value,{D01:11,D02:9,D03:11,D04:8,D05:10,D06:12});
Object.assign(value,{F01:6,F02:7,F03:10,F04:10,F05:9,F06:10,F07:10,F08:8,F09:11,F10:10,F11:9,F12:11});
function cardValue(id, starter) { return (value[id]||3) + (CARDS[id].category === starter ? 2 : 0); }
// Forecasts only visible intent and state. Pass the actual game for the authoritative preview.
function observedIntent(s){
  const b=s.battle,e=b.enemy,def=ENEMIES[e.id].intents[e.intentIndex];
  const bonus=b.scaling?.attackBonus??b.scaling?.atkBonus??e.attackBonus??0;
  const cold=(e.chill||0)>=5&&!def.clearChill?1:0;
  const hits=(def.hits||[]).map((n,i)=>Math.max(0,n+bonus-cold+(i===0?(b.playerMark||0):0)));
  return {...def,hits:e.frozen===true?[]:hits};
}
function nextCard(s,game=null) {
  const b=s.battle,e=b.enemy,p=s.player,intent=game?.getIntent?.()||observedIntent(s);
  const incoming=(intent.hits||[]).reduce((a,n)=>a+n,0), need=Math.max(0,incoming-b.block), swordIntent=b.swordIntent||0,soul=b.soul||0;
  let best=null;
  for(const card of b.hand){
    const c=CARDS[card.id],id=card.id;if(c.cost>b.energy)continue;
    let raw={C01:6,C04:10+4*e.mark,C05:9,C08:4,C14:5,C15:9,C16:16,C18:5+2*e.mark,C21:12+6*e.mark+2*(e.bleed||0),C22:b.played>=2?12:8,C23:3,C24:b.played>=2?20:16,C26:4,C28:10,C30:p.hp<=p.maxHp/2?16:8,C35:4+Math.min(10,b.block),S01:6,S04:10+3*swordIntent,S05:4,S08:swordIntent>=3?12:9,S14:5,S15:12+2*(e.chill||0),S16:16+4*swordIntent,F01:6,F04:10+3*soul,F05:9,F09:5,F10:16,F12:18+4*soul,D01:4,D02:8,D03:16,D06:26}[id]||0;
    if(id.startsWith('S')&&p.path?.fallen)raw=Math.floor(raw/2);
    const damage=raw+(c.attack?Math.min(8,b.nextAttack+(b.bloodPower||0)+(b.pillPower||0)+(p.power||0)):0);
    let score=damage/Math.max(1,c.cost);
    if(raw&&damage>=e.hp+e.block)score+=150;
    let shield={C02:5,C06:3,C07:7,C12:14,C19:8,C26:4,C31:12,C32:b.played>=2?6:3,C33:6,C34:18,S02:6,S06:3,S07:7,S12:14,F02:6,F06:3,F07:8,D04:10}[id]||0;
    if(id.startsWith('S')&&p.path?.fallen)shield=Math.floor(shield/2);
    score+=Math.min(shield,need)*(p.hp<25?2.15:1.45)/Math.max(1,c.cost);
    if(['C03','C17','C19','C08'].includes(id)&&e.mark<5)score+=id==='C03'?19:id==='C17'?17:5;
    if(['C04','C21'].includes(id)&&e.mark<2&&e.hp>damage)score-=7;
    if(id==='C06'||id==='C23')score+=b.draw.length+b.discard.length>0?18:4;
    if(id==='C09')score+=b.energy>1?13:1;
    if(id==='C10')score+=b.hand.some(x=>CARDS[x.id].attack&&CARDS[x.id].cost<=b.energy)?22:-30;
    if(id==='C11')score+=e.hp>18?7:1;
    if(id==='C13')score+=b.energy>0&&p.hp>8?17:-60;
    if(id==='C20')score+=e.mark>0?22:-30;
    if(id==='C25'||id==='C29')score+=b.hand.some(x=>CARDS[x.id].cost>b.energy)&&p.hp>10?20:-20;
    if(id==='C27')score+=e.hp>18&&p.hp>12?24:-30;
    if(id==='C28')score+=Math.min(4+Math.min(3,e.bleed||0),p.maxHp-p.hp)*1.5;
    if(['C05','C08','C18','C22','C28','C30'].includes(id)&&(e.bleed||0)<7)score+=(id==='C08'||id==='C22'?3:1.5);
    if((b.enemy.counter||0)>0&&c.attack&&b.block<(b.enemy.counter||0))score-=p.hp<20?10:3;
    if(id==='C33')score+=(intent.hits||[]).length*2;
    if(id==='C34')score+=Math.min(2,b.poison)*4;
    if(id==='C36')score+=Math.min(4,p.maxHp-p.hp)*3;
    // These are ordinary player choices: consider remaining enemy intent,
    // resource caps and visible hand before spending accumulated sword intent.
    const chill=({S01:e.chill>0?1:0,S02:1,S05:2,S08:e.chill>0?1:0,S12:2,S16:3}[id]||0);
    if(chill&&e.chill<10){
      const added=e.frostResistant?((e.chillProgress||0)>0?1:0):chill;
      const mitigated=e.chill<5&&e.chill+added>=5?(intent.hits||[]).filter(hit=>hit>0).length:0;
      score+=added*.8+(e.frostResistant&&!added?.4:0);
      score+=Math.min(need,mitigated)*(p.hp<25?2.4:1.7)/Math.max(1,c.cost);
      if(p.relics.includes('frostseal')&&!b.frostsealUsed&&swordIntent<8)score+=4;
    }
    if(id==='S01'||id==='S14')score+=swordIntent<8?4:0;
    if(id==='S03')score+=swordIntent<7?25:swordIntent===7?10:-40;
    if((id==='S04'||id==='S16')&&swordIntent<3&&e.hp>damage)score-=5;
    if(id==='S06')score+=b.draw.length+b.discard.length>0?18:3;
    if(id==='S07'&&e.chill>0)score+=b.energy>1?8:2;
    if(id==='S09')score+=b.energy>1?14:1;
    if(id==='S10')score+=swordIntent>=2&&b.hand.some(x=>x!==card&&CARDS[x.id].cost>0)?24:-60;
    if(id==='S11')score+=e.hp>18?8:1;
    if(id==='S13')score+=p.hp>8&&(b.energy>0||swordIntent<8)?18:-60;
    if(id==='S15'&&e.hp>damage&&need>0&&(e.chill||0)>=5)score-=Math.min(need,(intent.hits||[]).length)*.9;
    const demonicHeal={D01:6,D02:3,D03:5,D06:6}[id]||0;
    score+=Math.min(demonicHeal,p.maxHp-p.hp)*(p.hp<25?4:2)/Math.max(1,c.cost);
    if(id==='D05')score+=b.draw.length+b.discard.length>0?25:0;
    if(id.startsWith('D')&&!p.path?.fallen&&!p.questItems?.includes('clearheart_jade')&&(p.path?.corruption||0)===5&&p.hp>18)score-=4;
    if(id==='F01'&&soul<6)score+=4;
    if(id==='F03')score+=soul<5?25:soul===5?11:-40;
    if((id==='F04'||id==='F12')&&soul<3&&e.hp>damage)score-=6;
    if(id==='F06')score+=b.draw.length+b.discard.length>0?18:3;
    if(id==='F07'&&soul>=3)score+=b.energy>1?9:2;
    if(id==='F08')score+=b.energy>1?15:1;
    if(id==='F09')score+=Math.min(2,p.maxHp-p.hp)*2.8;
    if(id==='F10'&&p.power>=2)score+=b.energy>2?7:2;
    if(id==='F11')score+=soul>=2&&b.hand.some(x=>x!==card&&CARDS[x.id].cost>0)?24:-60;
    const loss={C13:3,C15:1,C25:1,C27:4,C29:5,C31:2,S13:3}[id]||0;
    if(loss>=p.hp&&!p.relics.includes('fox')&&!(p.relics.includes('ninelives')&&!b.nineUsed))score=-1000;
    if(!best||score>best.score)best={card,score};
  }
  return best&&best.score>0?best.card:null;
}
// Uses only observable inventory, health and combat rules; no hidden narrative thresholds.
function nextItem(s){
  const p=s.player,b=s.screen==='battle'?s.battle:null,bag=p.inventory||{},missing=p.maxHp-p.hp;
  if(b&&(b.phase!=='player'||b.itemUsedTurn===b.turn))return null;
  if(!b&&!['map','arrival','cave','event','rest','shop','fox','threshold'].includes(s.screen))return null;
  if(bag.antidote&&(p.affliction?.revealed&&p.affliction?.active||(b?.poison||0)>=2))return 'antidote';
  if(bag.fullheal_pill&&missing>=p.maxHp*.6)return 'fullheal_pill';
  for(const id of ['healing_pill','dewherb','herb'])if(bag[id]&&missing>=(ITEMS[id]?.heal||6))return id;
  if(b&&bag.spirit_pill&&b.energy<2&&b.hand.some(c=>CARDS[c.id].cost>b.energy))return 'spirit_pill';
  if(b&&bag.battle_pill&&b.enemy.hp>=35&&(b.pillPower||0)<4)return 'battle_pill';
  return null;
}
function playRun(seed,starter,lane,options={}){
  const g=createGame({rng:random(seed),...(options.campaign?{campaign:options.campaign}:{}),...(options.scaling===false?{scaling:false}:{}),...(starter==='sovereign'?{profile:{unlocks:['feiye']}}:{}),...(options.environment===false?{environment:false}:{})});assert.equal(g.newRun(starter),true);
  let actions=0,turns=0,hiddenBossStarted=false,observedBattle=null;const encounters=[],regions=[],storyEvents=[],eventChoices=[],poisonTreatments=[],itemUses=[],caves=[],battleMetrics=[],observedEvents=new Set();
  // Measurement only. Freeze the first battle-end snapshot so later camps/events
  // cannot overwrite encounter health, and separate actual victory-only healing.
  function trackBattle(){
    const b=g.state.battle;if(!b)return;
    if(b!==observedBattle){
      observedBattle=b;observedEvents.clear();
      battleMetrics.push({floor:g.state.floor,id:b.enemy.id,kind:b.kind,hpStart:g.state.player.hp,enemyMaxHp:b.enemy.maxHp,turnStart:b.turn,damageTaken:0,healReceived:0,postVictoryHealing:0,cardHitMax:{},finalized:false});
    }
    const m=battleMetrics.at(-1);if(m.finalized)return;
    for(const e of b.events||[]){
      if(observedEvents.has(e.id))continue;observedEvents.add(e.id);
      if(e.type==='victory')m.victorySeen=true;
      if(e.type==='attack'&&e.target==='enemy'&&e.kind==='card'&&e.cardId)m.cardHitMax[e.cardId]=Math.max(m.cardHitMax[e.cardId]||0,e.amount||0);
      if((e.target||'player')==='player'){
        if(e.type==='heal'){m.healReceived+=e.amount||0;if(m.victorySeen)m.postVictoryHealing+=e.amount||0;}
        if(['attack','poison','affliction','selfDamage'].includes(e.type))m.damageTaken+=e.damage||0;
      }
    }
    m.turns=b.turn;m.hpEnd=g.state.player.hp;m.won=b.enemy.hp<=0;m.playerDefeated=g.state.screen==='defeat';m.netLifeLoss=m.hpStart-m.hpEnd;
    if(b.phase==='ended'){
      m.hpBeforeVictoryRewards=Math.max(0,m.hpEnd-m.postVictoryHealing);
      m.combatOnlyNetLifeLoss=m.hpStart-m.hpBeforeVictoryRewards;
      m.finalized=true;
    }
  }

  const demonicPath=options.demonicPath||'refuse',rescueStranger=options.rescueStranger??demonicPath==='learn';
  function equipBest(){const p=g.state.player;const available=p.weaponInventory.filter(id=>id==='training'||(id==='divine'?p.level>=4:p.level>=2));const best=['divine','rime','spirit','training'].find(id=>available.includes(id));if(best&&p.equippedWeapon!==best)assert.equal(g.equipWeapon(best),true);}
  while(!['victory','defeat'].includes(g.state.screen)){
    assert.ok(++actions<12000,'run did not terminate');trackBattle();
    const s=g.state,p=s.player;
    assert.ok(p.hp>=0&&p.hp<=p.maxHp&&p.gold>=0,'nonnegative bounded resources');
    assert.equal(new Set(p.deck.map(c=>c.uid)).size,p.deck.length,'unique card instances');
    const item=nextItem(s);if(item&&g.getItemUse(item).usable){const before=p.hp;assert.equal(g.useItem(item),true);itemUses.push({floor:s.floor,id:item,screen:s.screen,healed:p.hp-before});continue;}
    switch(s.screen){
      case 'arrival':equipBest();regions.push(s.journey.regionIndex);assert.equal(g.enterRegion(),true);break;
      case 'map':{
        const nodes=g.getAvailableNodes();
        assert.ok(nodes.length,'reachable next node');
        equipBest();
        const routeValue=n=>(n.type==='rest'?(p.affliction.active&&!(p.affliction.suppressed>0)?80:Math.min(18,p.maxHp-p.hp)*4):n.type==='shop'?(p.affliction.active&&!(p.affliction.suppressed>0)&&p.gold>=65?60:8):n.type==='event'?15:n.type==='cave'?12:n.type==='elite'?(options.preferElite?1000:-12):0)-Math.abs(n.lane-lane)*3;
        nodes.sort((a,b)=>routeValue(b)-routeValue(a));
        const clue=options.hiddenChallenge?nodes.find(n=>['moon_trace','sealed_name','moon_vow'].includes(n.storyId)):null;
        const n=clue||nodes[0];encounters.push(n.type);assert.equal(g.enterNode(n.id),true);break;
      }
      case 'battle':{
        const b=s.battle;assert.ok(b.energy>=0&&b.block>=0&&b.enemy.block>=0&&b.enemy.mark<=5);
        if(b.phase==='enemy'){assert.equal(g.resolveEnemyTurn(),true);break;}
        const c=nextCard(s,g);
        if(c)assert.equal(g.playCard(c.uid,CARDS[c.id].target),true);
        else{turns++;assert.equal(g.endTurn(),true);assert.equal(g.resolveEnemyTurn(),true);}
        break;
      }
      case 'cave':{if(!s.cave.explored){assert.equal(g.exploreCave(),true);caves.push({floor:s.floor,kind:s.cave.outcome.kind,status:s.cave.status});}else assert.equal(g.leaveCave(),true);break;}
      case 'reward':{
        if(s.reward.relicPending){
          const preferences=['moonheart','dream','ninelives','godblood','jade','vial','mirror','moon','bloodstone','fang','silk'];
          const offered=[...s.reward.relicChoices].sort((a,b)=>preferences.indexOf(a)-preferences.indexOf(b));
          assert.ok(offered.length,'pending treasure must have offers');
          assert.equal(g.chooseRelic(offered[0]),true);
        }else assert.equal(g.chooseReward([...s.reward.cards].sort((a,b)=>cardValue(b,starter)-cardValue(a,starter))[0]),true);
        break;
      }
      case 'rest':{const affliction=g.getAffliction(),cleanse=affliction.active&&!(affliction.suppressed>0)&&p.maxHp-p.hp<14;assert.equal(g.rest(cleanse?'cleanse':true),true);if(cleanse)poisonTreatments.push({floor:s.floor-1,method:'rest_suppression'});break;}
      case 'fox':assert.equal(g.fox(p.maxHp>8&&!p.relics.includes('fox')),true);break;
      case 'shop':{
        const supplies=(s.shop.items||[]).map((item,index)=>({...item,index})).filter(item=>!item.bought&&p.gold>=item.price&&(item.id==='antidote'&&p.affliction?.revealed&&p.affliction?.active||['herb','dewherb','healing_pill'].includes(item.id)&&p.hp<p.maxHp-8));
        if(supplies.length)assert.equal(g.buyItem(supplies[0].index),true);
        const supply=nextItem(s);if(supply&&g.getItemUse(supply).usable){assert.equal(g.useItem(supply),true);itemUses.push({floor:s.floor,id:supply,screen:s.screen});}
        if(g.getAffliction().active&&!(g.getAffliction().suppressed>0)&&p.gold>=65&&p.hp<p.maxHp-4){assert.equal(g.buyAntidote(),true);poisonTreatments.push({floor:s.floor,method:'shop_suppression'});}
        const weapons=s.shop.weapons.filter(w=>!w.bought&&p.gold>=w.price&&p.level>=(w.id==='divine'?4:2)).sort((a,b)=>['divine','rime','spirit'].indexOf(a.id)-['divine','rime','spirit'].indexOf(b.id));
        if(p.equippedWeapon==='training'&&weapons.length)assert.equal(g.buyWeapon(s.shop.weapons.indexOf(weapons[0])),true);
        equipBest();
        const goods=s.shop.cards.map((c,i)=>({i,...c})).filter(c=>!c.bought).sort((a,b)=>cardValue(b.id,starter)-cardValue(a.id,starter));
        if(p.gold>=35&&goods.length&&cardValue(goods[0].id,starter)>=7)assert.equal(g.buyCard(goods[0].i),true);
        if(p.gold>=40&&!s.shop.removed&&p.deck.length>5){const weak=p.deck.find(c=>c.id==='C01');if(weak)assert.equal(g.removeCard(weak.uid),true);}
        assert.equal(g.leaveShop(),true);break;
      }
      case 'event':{
        if(s.event.resolved){assert.equal(g.leaveEvent(),true);break;}
        storyEvents.push(s.event.id);
        // Choose from visible options. Sword branch policies are actual event choices.
        const choices=s.event.options||s.event.choices;
        const legal=choices.map((choice,index)=>({choice,index})).filter(x=>!x.choice.disabled);
        let selected;
        if(options.hiddenChallenge&&['moon_trace','sealed_name','moon_vow'].includes(s.event.id))selected=legal.find(x=>x.index===0);
        if(s.event.id==='tainted_mercy')selected=legal.find(x=>rescueStranger?x.choice.afflict:!x.choice.afflict);
        if(['demonic_offer','demon_manual'].includes(s.event.id))selected=legal.find(x=>demonicPath==='learn'?x.choice.learnDemonic:!x.choice.learnDemonic);
        if(['demonic_warning','mirror_trial'].includes(s.event.id)){
          if(g.getAffliction().active)selected=legal.find(x=>x.choice.cureAffliction);
          if(!selected)selected=legal.find(x=>demonicPath==='learn'?x.choice.questItem==='clearheart_jade':!x.choice.questItem&&!x.choice.cureAffliction);
        }
        if(s.event.id==='fallen_hunt')selected=legal.find(x=>demonicPath==='learn'&&p.hp>=38?x.choice.battle:!x.choice.battle);
        if(!selected){
          const score=c=>Math.min(c.heal||0,p.maxHp-p.hp)*3+(c.guard||0)*.6+(c.cardIds?.length||0)*4+(c.relic?18:0)+(c.goldGain||0)*.3-(c.hpCost||0)*(p.hp<25?5:1.3)-(c.goldCost||0)*.35-(c.maxHpCost||0)*2-(c.battle?25:0);
          legal.sort((a,b)=>score(b.choice)-score(a.choice));selected=legal[0];
        }
        assert.ok(selected,'event has a legal choice');
        const decision={floor:s.floor,event:s.event.id,index:selected.index,label:selected.choice.label,goldCost:selected.choice.goldCost||0,cureAffliction:!!selected.choice.cureAffliction,questItem:selected.choice.questItem||null,learnDemonic:!!selected.choice.learnDemonic,afflictionBefore:g.getAffliction().active};
        eventChoices.push(decision);
        assert.equal(g.chooseEvent(selected.index),true);decision.afflictionAfter=g.getAffliction().active;break;
      }
      case 'threshold':assert.equal(options.hiddenChallenge?g.startHiddenBoss():g.leaveThreshold(),true);hiddenBossStarted=!!options.hiddenChallenge;break;
      default:throw new Error('Unexpected screen '+s.screen);
    }
  }
  trackBattle();
  return {seed,starter,lane,battleMetrics,maxHp:g.state.player.maxHp,normalizedHp:g.state.player.hp/g.state.player.maxHp*60,totalFloors:g.state.totalFloors||g.state.map.length,campaign:g.state.campaign||'legacy',scaling:options.scaling!==false,result:g.state.screen,hp:g.state.player.hp,turns,actions,floor:g.state.floor,maxCombo:g.state.stats.maxCombo,maxHit:g.state.stats.maxHit,encounters,regions,storyEvents,chain:g.state.journey.chain,journalEntries:g.state.journey.journal.length,profile:g.getProfile?.(),environment:options.environment!==false,unlockedProfileAtStart:starter==='sovereign',hiddenChallenge:!!options.hiddenChallenge,hiddenBossStarted,hiddenWin:!!g.state.result?.hiddenWin,power:g.state.player.power,demonicPath,rescueStranger,eventChoices,poisonTreatments,itemUses,caves,inventory:{...g.state.player.inventory},affliction:g.getAffliction(),corruption:g.getCorruptionStatus(),chapterBosses:g.state.stats.chapterBosses,completedNodes:g.state.history.length,demonicCards:g.state.player.deck.filter(c=>c.id.startsWith('D')).map(c=>c.id),demonicUses:g.state.stats.demonicUses,questItems:[...g.state.player.questItems],level:g.state.player.level,equippedWeapon:g.state.player.equippedWeapon};
}
function main(){
  const runs=[];
  for(const starter of ['mark','combo','blood','sword','sovereign'])for(let i=0;i<30;i++)runs.push(playRun(1000+i,starter,i%4,{demonicPath:i%2?'learn':'refuse',rescueStranger:i%3!==0}));
  const summary=[];
  for(const starter of ['mark','combo','blood','sword','sovereign'])for(let lane=0;lane<4;lane++){
    const selected=runs.filter(r=>r.starter===starter&&r.lane===lane);
    summary.push({starter,lane,wins:selected.filter(r=>r.result==='victory').length,runs:selected.length,averageEnemyTurns:+(selected.reduce((n,r)=>n+r.turns,0)/selected.length).toFixed(1)});
  }
  const report={method:'Public API only; 150 seeded heuristic simulations across three professions and five starters, active chapter hazards, complete configured campaign, logical poison suppression, late story cures, herbs/pills from the bag, randomized cave searches and visible equipment choices, no run-state/resource fixtures. Sword attempts alternate refusing and learning demonic skills; each policy includes ten stranger rescues and five refusals, through actual event choices. Sovereign runs begin with an explicitly supplied already-unlocked profile (not claimed as a natural unlock). Not human balance or time-to-play validation.',runs:runs.length,completed:runs.length,wins:runs.filter(r=>r.result==='victory').length,defeats:runs.filter(r=>r.result==='defeat').length,summary,details:runs};
  const reportPath=process.env.PLAYTEST_REPORT||path.join(__dirname,'playtest-report.json');
  fs.mkdirSync(path.dirname(reportPath),{recursive:true});
  fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({runs:report.runs,wins:report.wins,summary},null,2));
}
if(require.main===module)main();
module.exports={nextCard,nextItem,playRun,random,observedIntent};
