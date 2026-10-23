/* V11: legacy campaign/scaling-off fixtures isolate retained rule contracts; default seven-region behaviour has separate tests. */
/* Legacy fixtures isolate card rules from regional debuffs; v7 tests cover enabled environments. */
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createGame,CARDS,RELICS,TREASURE_RELICS,LEGACY_EVENT_IDS:EVENT_IDS,CHAIN_EVENT_IDS}=require('./engine.js');
const EVENTS=EVENT_IDS.filter(id=>!CHAIN_EVENT_IDS.includes(id) && !['moon_trace','sealed_name','moon_vow','armory','sovereign_wake','sovereign_recall','sovereign_memory','tainted_mercy','demonic_offer','demonic_warning','mirror_trial','demon_manual','fallen_hunt'].includes(id));
function random(seed){let n=seed>>>0;return()=>((n=(1664525*n+1013904223)>>>0)/4294967296);}
function run(seed=1,starter='mark',rng){const g=createGame({campaign:'legacy',scaling:false,environment:false,rng:rng||random(seed)});g.newRun(starter); g.enterRegion();return g;}
function enter(g,type){const s=g.state,n=s.map.flat().find(n=>n.type===type)||s.map[3][0];n.type=type;delete n.encounter;assert.ok(n,type);s.floor=n.floor;s.availableNodes=[n.id];s.screen='map';s.journey.regionIndex=n.regionIndex;n.revealed=true;delete n.storyId;s.history=[];assert.equal(g.enterNode(n.id),true);return s.battle;}
let serial=0;
function win(g){const b=g.state.battle;b.energy=50;b.enemy.hp=1;b.enemy.block=0;const c={uid:`kill-${++serial}`,id:'C01'};b.hand.push(c);assert.equal(g.playCard(c.uid,true),true);assert.equal(g.state.screen,'reward');}
function eventGame(target,index=0,{poor=false,allTreasures=false}={}){const g=run(80+index),s=g.state;s.seenEvents=EVENT_IDS.filter(id=>id!==target);s.player.hp=poor?1:180;s.player.maxHp=poor?60:200;s.player.gold=poor?0:1000;if(poor)s.player.deck=s.player.deck.slice(0,5);if(allTreasures)s.player.relics.push(...TREASURE_RELICS);enter(g,'event');assert.equal(s.event.id,target);return g;}

test('1000局随机地图狐妖出现有覆盖且可达，各节点连通到蛇妖且没有死路',()=>{
  let foxMaps=0;
  for(let seed=1;seed<=1000;seed++){
    const g=run(seed),s=g.state,all=s.map.flat(),byId=Object.fromEntries(all.map(n=>[n.id,n]));
    const seen=new Set(['f1-0']);
    for(const row of s.map)for(const n of row){assert.ok(seen.has(n.id));for(const next of n.next){assert.equal(byId[next].floor,n.floor+1);seen.add(next);}if(n.floor<30)assert.ok(n.next.length>0);}
    assert.equal(seen.size,all.length);const foxes=all.filter(n=>n.type==='fox');if(foxes.length)foxMaps++;assert.ok(foxes.every(n=>seen.has(n.id)));assert.ok(seen.has('f30-0'));
  }
  assert.ok(foxMaps>500,'fox encounters remain common across the distribution');
});

test('各流派普通奖励保底至少一张同流派，且三种卡各不重复',()=>{
  for(const starter of ['mark','combo','blood'])for(let seed=1;seed<=120;seed++){
    const g=run(seed,starter);enter(g,'fight');win(g);const r=g.state.reward;
    assert.equal(r.cards.length,3);assert.equal(new Set(r.cards).size,3);
    assert.ok(r.cards.some(id=>CARDS[id].category===starter));
    assert.equal(r.relicPending,false);assert.deepEqual(r.relicChoices,[]);
  }
});

test('经典开局奖励仍为三种非基础卡，无伪流派保底',()=>{
  const g=run(3,'classic');enter(g,'fight');win(g);
  assert.equal(new Set(g.state.reward.cards).size,3);assert.ok(g.state.reward.cards.every(id=>!['C01','C02'].includes(id)));
});

test('首精英稀有卡保底与未持有珍藏双选，至少一件秘宝且先选后继续',()=>{
  for(let seed=1;seed<=120;seed++){
    const g=run(seed),s=g.state;enter(g,'elite');win(g);const r=s.reward;
    assert.ok(r.cards.some(id=>CARDS[id].rarity==='rare'));assert.equal(r.relicChoices.length,2);
    assert.equal(new Set(r.relicChoices).size,2);assert.ok(r.relicChoices.some(id=>TREASURE_RELICS.includes(id)));
    assert.equal(s.player.gold,95);assert.deepEqual(s.player.relics,['bell']);assert.equal(r.relic,null);
    assert.equal(g.chooseReward(null),false);assert.equal(g.chooseReward(r.cards[0]),false);
    assert.equal(g.chooseRelic('bell'),false);assert.equal(g.chooseRelic(r.relicChoices[0]),true);
    assert.equal(s.player.relics.length,2);assert.equal(g.chooseRelic(r.relicChoices[1]),false);
    assert.equal(g.chooseReward(r.cards[0]),true);assert.equal(g.chooseReward(null),false);assert.equal(s.player.deck.length,11);
  }
});

test('一次免费换牌保留流派保底、固定候选和灵石，重复重抽及跨奖励复用均无效',()=>{
  const g=run(12),s=g.state;assert.equal(g.rerollReward(),false);enter(g,'fight');win(g);
  const old=s.reward.cards.slice(),gold=s.player.gold;assert.equal(s.rewardRerolls,1);
  assert.equal(g.rerollReward(),true);assert.equal(s.rewardRerolls,0);assert.equal(s.reward.rerolled,true);
  assert.ok(s.reward.cards.some(id=>!old.includes(id)));assert.ok(s.reward.cards.some(id=>CARDS[id].category==='mark'));
  const next=s.reward.cards.slice();assert.equal(g.rerollReward(),false);assert.deepEqual(s.reward.cards,next);assert.equal(s.player.gold,gold);
  for(let i=0;i<3;i++)g.getAvailableNodes();assert.deepEqual(s.reward.cards,next);
  g.chooseReward(null);enter(g,'elite');win(g);assert.equal(g.rerollReward(),false);
  g.newRun(); g.enterRegion();assert.equal(g.state.rewardRerolls,1);
});

test('固定RNG重抽仍确实更换选项且精英稀有保底与珍藏不变',()=>{
  const g=run(1,'mark',()=>0),s=g.state;enter(g,'elite');win(g);
  const old=s.reward.cards.slice(),relics=s.reward.relicChoices.slice();assert.equal(g.rerollReward(),true);
  assert.ok(s.reward.cards.some(id=>!old.includes(id)));assert.ok(s.reward.cards.some(id=>CARDS[id].rarity==='rare'));
  assert.deepEqual(s.reward.relicChoices,relics);assert.equal(new Set(s.reward.cards).size,3);
});

test('无面神血只在确定选择后精确增加12生命上限并治疗12，不能重复领取',()=>{
  const g=run(1),s=g.state;s.player.hp=20;
  s.player.relics.push(...Object.keys(RELICS).filter(id=>!['bell','fox','godblood','vial'].includes(id)));
  enter(g,'elite');win(g);assert.ok(s.reward.relicChoices.includes('godblood'));
  assert.equal(s.player.maxHp,60);assert.equal(s.player.hp,20);
  assert.equal(g.chooseRelic('godblood'),true);assert.equal(s.player.maxHp,72);assert.equal(s.player.hp,32);
  assert.equal(g.chooseRelic('godblood'),false);assert.equal(s.player.maxHp,72);assert.equal(s.player.hp,32);
});

test('无可发珍藏时精英只额外20灵石，总55，且不再要求选择',()=>{
  const g=run(2),s=g.state;s.player.relics.push(...Object.keys(RELICS).filter(id=>!['bell','fox','frostseal'].includes(id)));
  enter(g,'elite');win(g);assert.equal(s.reward.gold,55);assert.equal(s.player.gold,115);
  assert.deepEqual(s.reward.relicChoices,[]);assert.equal(s.reward.relicPending,false);assert.match(s.notice,/额外 20/);
  assert.equal(g.chooseReward(null),true);assert.equal(s.player.gold,115);
});

test('十八独立事件54个正常选项完整兑现代价与收益，结局停留且一次领取',()=>{
  for(const id of EVENTS)for(let i=0;i<3;i++){
    const g=eventGame(id,i),s=g.state,e=s.event,c=e.choices[i],p=structuredClone(s.player),beforeFloor=s.floor;
    assert.equal(e.choices.length,3);assert.equal(c.disabled,false);assert.equal(g.leaveEvent(),false);
    assert.equal(g.chooseEvent(i),true);
    let max=p.maxHp-(c.maxHpCost||0),hp=Math.min(max,p.hp-(c.hpCost||0));
    if(c.relic==='godblood'){max+=12;hp=Math.min(max,hp+12);}hp=Math.min(max,hp+(c.heal||0));
    assert.equal(s.player.hp,hp,`${id}/${i} hp`);assert.equal(s.player.maxHp,max,`${id}/${i} max`);
    assert.equal(s.player.gold,p.gold-(c.goldCost||0)+(c.goldGain||0));
    assert.equal(s.player.deck.length,p.deck.length+(c.cardIds||[]).length-(c.removeBasic?1:0));
    if(c.relic)assert.ok(s.player.relics.includes(c.relic));
    assert.equal(s.floor,beforeFloor);assert.equal(s.screen,'event');assert.equal(e.resolved,true);
    const final=JSON.stringify(s.player);assert.equal(g.chooseEvent(i),false);assert.equal(JSON.stringify(s.player),final);
    assert.equal(g.leaveEvent(),true);if(e.battle){assert.equal(s.floor,beforeFloor);assert.equal(s.screen,'battle');}else assert.equal(s.floor,beforeFloor+1);assert.equal(g.leaveEvent(),false);
  }
});

test('十八独立事件在1生命、0灵石、5张牌下均可继续，卖梦人条件性免费离开不发奖',()=>{
  for(const id of EVENTS){
    const g=eventGame(id,0,{poor:true}),s=g.state,e=s.event;
    const index=e.choices.findIndex(c=>!c.disabled);assert.ok(index>=0,id);
    if(id==='dreamshop'){assert.equal(e.choices.length,4);assert.match(e.choices[index].label,/安然离开/);}
    const before=JSON.stringify(s.player);assert.equal(g.chooseEvent(index),true);assert.ok(s.player.hp>0);
    if(id==='dreamshop')assert.equal(JSON.stringify(s.player),before);
    assert.equal(g.leaveEvent(),true);
  }
});

test('全部秘宝已持有时七个交易回退文案金额与实际收益一致',()=>{
  for(const [id,i,fallback] of [['well',0,40],['shrine',0,60],['dreamshop',0,60],['theatre',0,60],['theatre',1,60],['umbrella',1,40],['pawnshop',1,40]]){
    const g=eventGame(id,i,{allTreasures:true}),s=g.state,c=s.event.choices[i],gold=s.player.gold;
    assert.equal(c.relic,null);assert.equal(c.fallbackGold,fallback);assert.match(c.label,new RegExp(`${fallback} 灵石`));
    assert.equal(g.chooseEvent(i),true);assert.equal(s.player.gold,gold-(c.goldCost||0)+fallback+(c.goldGain||0));
    assert.match(s.event.received,new RegExp(`${fallback} 灵石`));
  }
});

test('生命上限交易明确保留至少5，低于门槛不扣价、不越过最低值',()=>{
  for(const [id,index,cost] of [['shrine',1,6],['umbrella',0,6],['pawnshop',0,5]]){
    const g=run(12),s=g.state;s.player.maxHp=cost+1;s.player.hp=cost+1;s.seenEvents=EVENT_IDS.filter(e=>e!==id);
    enter(g,'event');const before=JSON.stringify(s.player);assert.equal(s.event.choices[index].disabled,true);assert.match(s.event.choices[index].text,/至少保留 5/);
    assert.equal(g.chooseEvent(index),false);assert.equal(JSON.stringify(s.player),before);
  }
});

test('最高单段攻击和单回合最大出牌数统计真实更新且重开归零',()=>{
  const g=run(3),s=g.state;enter(g,'fight');const b=s.battle;b.energy=50;b.enemy.hp=b.enemy.maxHp=200;
  for(const id of ['C03','C04','C05']){const c={uid:`stat-${++serial}`,id};b.hand.push(c);assert.equal(g.playCard(c.uid,true),true);}
  assert.equal(s.stats.maxHit,18);assert.equal(s.stats.maxCombo,3);assert.equal(s.stats.cardsPlayed,3);
  g.endTurn();g.resolveEnemyTurn();b.energy=50;const c={uid:`stat-${++serial}`,id:'C01'};b.hand.push(c);g.playCard(c.uid,true);
  assert.equal(s.stats.maxCombo,3);assert.equal(s.stats.maxHit,18);
  g.newRun(); g.enterRegion();assert.equal(g.state.stats.maxHit,0);assert.equal(g.state.stats.maxCombo,0);
});
