/* Public-API simulation. No edits to game state, HP, piles, RNG after creation,
 * prices or damage. The heuristic is a regression probe, not a human playtest. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createGame, CARDS, ENEMIES} = require('./engine.js');
function random(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const value = {C01:2,C02:2,C03:6,C04:8,C05:7,C06:8,C07:7,C08:8,C09:7,C10:6,C11:5,C12:8,C13:6,C14:6,C15:6,C16:9,C17:10,C18:10,C19:9,C20:8,C21:9,C22:9,C23:8,C24:9,C25:6,C26:9,C27:9,C28:10,C29:6,C30:7,C31:7,C32:8,C33:10,C34:9,C35:9,C36:9};
function cardValue(id, starter) { return value[id] + (CARDS[id].category === starter ? 2 : 0); }
function nextCard(s) {
  const b=s.battle,e=b.enemy,p=s.player,intent=ENEMIES[e.id].intents[e.intentIndex];
  const incoming=(intent.hits||[]).reduce((a,n)=>a+n,0), need=Math.max(0,incoming-b.block);
  let best=null;
  for(const card of b.hand){
    const c=CARDS[card.id],id=card.id;if(c.cost>b.energy)continue;
    const raw={C01:6,C04:10+4*e.mark,C05:9,C08:4,C14:5,C15:9,C16:16,C18:5+2*e.mark,C21:12+6*e.mark,C22:b.played>=2?12:8,C23:3,C24:b.played>=2?20:16,C26:4,C28:10,C30:p.hp<=p.maxHp/2?16:8,C35:4+Math.min(16,b.block)}[id]||0;
    const damage=raw+(c.attack?b.nextAttack+(b.bloodPower||0):0);
    let score=damage/Math.max(1,c.cost);
    if(raw&&damage>=e.hp+e.block)score+=150;
    const shield={C02:5,C06:3,C07:7,C12:14,C19:8,C26:4,C31:12,C32:b.played>=2?6:3,C33:6,C34:18}[id]||0;
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
    if(id==='C28')score+=Math.min(4,p.maxHp-p.hp)*1.5;
    if(id==='C33')score+=(intent.hits||[]).length*2;
    if(id==='C34')score+=Math.min(2,b.poison)*4;
    if(id==='C36')score+=Math.min(4,p.maxHp-p.hp)*3;
    const loss={C13:3,C15:1,C25:1,C27:4,C29:5,C31:2}[id]||0;
    if(loss>=p.hp&&!p.relics.includes('fox'))score=-1000;
    if(!best||score>best.score)best={card,score};
  }
  return best&&best.score>0?best.card:null;
}
function playRun(seed,starter,lane){
  const g=createGame({rng:random(seed)});g.newRun(starter);
  let actions=0,turns=0;const encounters=[];
  while(!['victory','defeat'].includes(g.state.screen)){
    assert.ok(++actions<4000,'run did not terminate');
    const s=g.state,p=s.player;
    assert.ok(p.hp>=0&&p.hp<=p.maxHp&&p.gold>=0,'nonnegative bounded resources');
    assert.equal(new Set(p.deck.map(c=>c.uid)).size,p.deck.length,'unique card instances');
    switch(s.screen){
      case 'map':{
        const nodes=s.map.flat().filter(n=>s.availableNodes.includes(n.id));
        assert.ok(nodes.length,'reachable next node');
        nodes.sort((a,b)=>Math.abs(a.lane-lane)-Math.abs(b.lane-lane));
        const n=nodes[0];encounters.push(n.type);assert.equal(g.enterNode(n.id),true);break;
      }
      case 'battle':{
        const b=s.battle;assert.ok(b.energy>=0&&b.block>=0&&b.enemy.block>=0&&b.enemy.mark<=5);
        if(b.phase==='enemy'){assert.equal(g.resolveEnemyTurn(),true);break;}
        const c=nextCard(s);
        if(c)assert.equal(g.playCard(c.uid,CARDS[c.id].target),true);
        else{turns++;assert.equal(g.endTurn(),true);assert.equal(g.resolveEnemyTurn(),true);}
        break;
      }
      case 'reward':assert.equal(g.chooseReward([...s.reward.cards].sort((a,b)=>cardValue(b,starter)-cardValue(a,starter))[0]),true);break;
      case 'rest':assert.equal(g.rest(true),true);break;
      case 'fox':assert.equal(g.fox(p.maxHp>8&&!p.relics.includes('fox')),true);break;
      case 'shop':{
        const goods=s.shop.cards.map((c,i)=>({i,...c})).filter(c=>!c.bought).sort((a,b)=>cardValue(b.id,starter)-cardValue(a.id,starter));
        if(p.gold>=35&&goods.length)assert.equal(g.buyCard(goods[0].i),true);
        if(p.gold>=40&&!s.shop.removed&&p.deck.length>5){const weak=p.deck.find(c=>c.id==='C01');if(weak)assert.equal(g.removeCard(weak.uid),true);}
        assert.equal(g.leaveShop(),true);break;
      }
      case 'event':{
        // Read visible availability only. All options are processed by engine.
        let chosen=false;
        for(let i=0;i<(s.event.options||s.event.choices).length;i++){if(g.chooseEvent(i)){chosen=true;break;}}
        assert.ok(chosen,'event has a legal choice');break;
      }
      default:throw new Error('Unexpected screen '+s.screen);
    }
  }
  return {seed,starter,lane,result:g.state.screen,hp:g.state.player.hp,turns,actions,floor:g.state.floor,encounters};
}
function main(){
  const runs=[];
  for(const starter of ['mark','combo','blood'])for(let lane=0;lane<3;lane++)for(let i=0;i<10;i++)runs.push(playRun(1000+lane*100+i,starter,lane));
  const summary=[];
  for(const starter of ['mark','combo','blood'])for(let lane=0;lane<3;lane++){
    const selected=runs.filter(r=>r.starter===starter&&r.lane===lane);
    summary.push({starter,lane,wins:selected.filter(r=>r.result==='victory').length,runs:selected.length,averageEnemyTurns:+(selected.reduce((n,r)=>n+r.turns,0)/selected.length).toFixed(1)});
  }
  const report={method:'Public API only; 90 seeded heuristic simulations, no state fixtures. Not human balance or time-to-play validation.',runs:runs.length,wins:runs.filter(r=>r.result==='victory').length,summary,details:runs};
  fs.writeFileSync(path.join(__dirname,'playtest-report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({runs:report.runs,wins:report.wins,summary},null,2));
}
if(require.main===module)main();
module.exports={nextCard,playRun,random};
