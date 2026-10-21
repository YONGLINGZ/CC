'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createGame, CARDS, CHARACTERS, STARTERS, EVENT_IDS: ALL_EVENT_IDS, CHAIN_EVENT_IDS, RELICS } = require('./engine.js');
const EVENT_IDS=ALL_EVENT_IDS.filter(id=>!CHAIN_EVENT_IDS.includes(id));
let uid = 0;
function random(seed=5) { let n=seed>>>0; return()=>((n=(n*1664525+1013904223)>>>0)/4294967296); }
function battle(starter='sword') {
  const g=createGame({rng:random()});g.newRun(starter); g.enterRegion();g.enterNode('f1-0');
  const b=g.state.battle;b.enemy.id='ape';b.enemy.name='山魈';b.enemy.hp=b.enemy.maxHp=500;b.enemy.block=0;b.enemy.intentIndex=0;
  b.hand=[];b.draw=[];b.discard=[];b.energy=50;return g;
}
function play(g,id,target=true) {const c={id,uid:'v5-'+(++uid)};g.state.battle.hand.push(c);assert.equal(g.playCard(c.uid,target),true);return c;}
function turn(g) {assert.equal(g.endTurn(),true);assert.equal(g.resolveEnemyTurn(),true);}
function injectNode(g,type) {const s=g.state,n=s.map.flat().find(n=>n.type===type);s.floor=n.floor;s.availableNodes=[n.id];s.screen='map';s.history=[];s.journey.regionIndex=n.regionIndex;n.revealed=true;delete n.storyId;assert.equal(g.enterNode(n.id),true);return s;}
function kill(g) {const b=g.state.battle;b.enemy.hp=1;b.enemy.block=0;b.energy=10;play(g,g.state.character==='sword'?'S01':'C01');}

test('两职业与四开局真实独立：牌组、初始遗物、成年角色元数据和重开',()=>{
  assert.deepEqual(Object.keys(CHARACTERS),['assassin','sword']);assert.equal(CHARACTERS.sword.adult,true);assert.match(CHARACTERS.sword.description,/清冷|寡言/);
  const g=createGame({rng:random()});g.newRun('sword'); g.enterRegion();let s=g.state;
  assert.equal(s.character,'sword');assert.equal(s.player.character,'sword');assert.deepEqual(s.player.relics,['frostseal']);
  assert.deepEqual(s.player.deck.map(c=>c.id),STARTERS.sword.cards);assert.equal(new Set(s.player.deck.map(c=>c.uid)).size,10);
  s.player.hp=2;s.player.maxHp=40;s.player.gold=999;s.player.deck.pop();s.player.relics.push('fox');
  g.newRun('combo'); g.enterRegion();s=g.state;assert.equal(s.character,'assassin');assert.equal(s.player.hp,60);assert.equal(s.player.maxHp,60);assert.equal(s.player.gold,60);assert.deepEqual(s.player.relics,['bell']);assert.ok(s.player.deck.every(c=>c.id.startsWith('C')));
});

test('剑修16种卡是独立数据，费用、目标、完整效果和稀有池均存在',()=>{
  for(let i=1;i<=16;i++){const id='S'+String(i).padStart(2,'0'),c=CARDS[id];assert.ok(c);assert.equal(c.character,'sword');assert.ok(c.text.length>6);assert.ok(Number.isInteger(c.cost)&&c.cost>=0);assert.equal(typeof c.target,'boolean');}
  assert.equal(Object.values(CARDS).filter(c=>c.character==='sword').length,16);
  assert.equal(Object.values(CARDS).filter(c=>c.character==='assassin').length,36);
  assert.deepEqual(['S15','S16'].filter(id=>CARDS[id].rarity==='rare'),['S15','S16']);
});

test('霜锋与听雪剑意跨回合、上限8，断流消耗并逐步发状态事件',()=>{
  const g=battle(),b=g.state.battle;play(g,'S01');assert.equal(b.enemy.hp,494);assert.equal(b.swordIntent,1);
  play(g,'S03');assert.equal(b.swordIntent,3);turn(g);assert.equal(b.swordIntent,3);
  b.energy=50;play(g,'S03');play(g,'S03');play(g,'S03');assert.equal(b.swordIntent,8);
  b.enemy.block=100;play(g,'S04');assert.equal(b.enemy.block,66);assert.equal(b.enemy.hp,494);assert.equal(b.swordIntent,0);
  const status=b.events.find(e=>e.type==='swordIntent');assert.deepEqual([status.amount,status.total],[-8,0]);assert.ok(b.events.indexOf(status)<b.events.findIndex(e=>e.type==='attack'));
});

test('霜寒上限4，剑穗每回合仅首次实际增层触发，封顶不触发',()=>{
  const g=battle(),b=g.state.battle;play(g,'S02');assert.equal(b.block,6);assert.equal(b.enemy.chill,1);assert.equal(b.swordIntent,1);
  play(g,'S05');assert.equal(b.enemy.chill,3);assert.equal(b.swordIntent,1);play(g,'S05');assert.equal(b.enemy.chill,4);assert.equal(b.swordIntent,1);
  b.frostsealUsed=false;play(g,'S02');assert.equal(b.enemy.chill,4);assert.equal(b.swordIntent,1);assert.equal(b.frostsealUsed,false);
  turn(g);assert.equal(b.enemy.chill,0);b.energy=50;play(g,'S02');assert.equal(b.swordIntent,2);assert.equal(b.frostsealUsed,true);
});

test('霜寒显示与实际每段减伤一致，行动后清空，下轮恢复原意图',()=>{
  const g=battle(),b=g.state.battle;play(g,'S05');assert.equal(b.enemy.chill,2);assert.deepEqual(g.getIntent().baseHits,[3,3,3]);assert.deepEqual(g.getIntent().hits,[1,1,1]);assert.match(g.getIntent().text,/每次 1/);
  b.block=0;turn(g);assert.equal(g.state.player.hp,57);assert.equal(b.enemy.chill,0);
  assert.deepEqual(b.events.filter(e=>e.type==='attack'&&e.source==='enemy').map(e=>e.amount),[1,1,1]);
  assert.ok(b.events.some(e=>e.type==='chill'&&e.amount===-2&&e.total===0));assert.deepEqual(g.getIntent().hits,[10]);
});

test('霜寒不会冻结附毒或防御动作，零伤害连段仍逐段结算',()=>{
  const g=battle(),b=g.state.battle;b.enemy.id='snake';b.enemy.intentIndex=1;b.enemy.chill=4;b.block=0;
  assert.deepEqual(g.getIntent().hits,[2]);assert.equal(g.getIntent().poison,3);turn(g);
  assert.equal(g.state.player.hp,55);assert.equal(b.poison,2);assert.equal(b.enemy.chill,0);
  b.enemy.chill=4;assert.match(g.getIntent().text,/清除全部标记/);turn(g);assert.equal(b.enemy.block,10);assert.equal(b.enemy.chill,0);
  const z=battle(),zb=z.state.battle;zb.enemy.chill=4;turn(z);assert.deepEqual(zb.events.filter(e=>e.type==='attack'&&e.source==='enemy').map(e=>e.amount),[0,0,0]);assert.equal(z.state.player.hp,60);
});

test('碎霜以防御换爆发：先清全部霜寒、护盾全挡也获得等量剑意',()=>{
  const g=battle(),b=g.state.battle;b.enemy.chill=4;b.enemy.block=100;b.swordIntent=1;
  play(g,'S15');assert.equal(b.enemy.chill,0);assert.equal(b.enemy.block,80);assert.equal(b.swordIntent,5);assert.equal(b.enemy.hp,500);
  assert.ok(b.events.findIndex(e=>e.type==='chill')<b.events.findIndex(e=>e.type==='attack'));assert.deepEqual(g.getIntent().hits,[3,3,3]);
});

test('三叠泉逐段判定，候机与共同遗物只增第一段，剑意不消耗',()=>{
  const g=battle(),b=g.state.battle;b.swordIntent=3;b.nextAttack=4;
  play(g,'S08');assert.deepEqual(b.events.filter(e=>e.type==='attack').map(e=>e.amount),[8,4,4]);assert.equal(b.swordIntent,3);assert.equal(b.nextAttack,0);
  b.swordIntent=2;play(g,'S08');assert.deepEqual(b.events.filter(e=>e.type==='attack').map(e=>e.amount),[3,3,3]);
});

test('万川归寂消耗剑意、存活才附寒，击杀只结算一次并清理战斗状态',()=>{
  const g=battle(),b=g.state.battle;b.swordIntent=5;play(g,'S16');assert.equal(b.enemy.hp,464);assert.equal(b.swordIntent,1);assert.equal(b.enemy.chill,3); // 剑穗重新获得1意
  b.enemy.hp=1;b.energy=5;b.swordIntent=8;play(g,'S16');assert.equal(g.state.screen,'reward');assert.equal(b.swordIntent,0);assert.equal(b.enemy.chill,0);assert.equal(g.state.player.gold,80);assert.equal(g.endTurn(),false);assert.equal(g.state.player.gold,80);
  assert.equal(b.events.filter(e=>e.type==='victory').length,1);assert.equal(b.events.some(e=>e.type==='chill'&&e.amount>0),false);
});

test('踏雪与澄心抽牌时结算牌不可自抽，消耗牌下一战恢复',()=>{
  const g=battle(),b=g.state.battle;const c=play(g,'S06');assert.equal(b.hand.length,0);assert.ok(b.exhaust.some(x=>x.uid===c.uid));
  b.discard=[{id:'S03',uid:'draw-one'}];play(g,'S09');assert.equal(b.hand.length,1);assert.equal(b.hand[0].id,'S03');assert.equal(b.discard.filter(x=>x.id==='S09').length,1);
  g.state.player.deck.push(c);kill(g);g.chooseReward(null);const n=g.getAvailableNodes()[0];n.type='fight';g.enterNode(n.id);const all=[...g.state.battle.hand,...g.state.battle.draw];assert.ok(all.some(x=>x.uid===c.uid));
});

test('回锋有明确门槛，藏剑可叠加，冰镜按霜寒条件抽牌',()=>{
  const g=battle(),b=g.state.battle;b.draw=[{id:'S03',uid:'a'}];const energy=b.energy;play(g,'S10');assert.equal(b.energy,energy);assert.equal(b.hand.length,0);
  b.swordIntent=2;play(g,'S10');assert.equal(b.swordIntent,0);assert.equal(b.energy,energy+1);assert.equal(b.hand.length,1);
  play(g,'S11');play(g,'S11');turn(g);assert.equal(b.energy,5);
  b.draw=[{id:'S01',uid:'ice-draw'}];b.hand=[];b.enemy.chill=0;play(g,'S07');assert.equal(b.hand.length,0);b.enemy.chill=1;play(g,'S07');assert.equal(b.hand.at(-1).uid,'ice-draw');
});

test('淬刃自损死亡停止抽牌剑意，狐契免死后才继续，剑鸣和霜天壁真实生效',()=>{
  const g=battle(),b=g.state.battle;g.state.player.hp=3;b.draw=[{id:'S01',uid:'unused'}];play(g,'S13');assert.equal(g.state.screen,'defeat');assert.equal(b.hand.length,0);assert.equal(b.swordIntent,0);
  const f=battle(),fb=f.state.battle;f.state.player.hp=2;f.state.player.relics.push('fox');fb.draw=[{id:'S01',uid:'x'},{id:'S02',uid:'y'}];play(f,'S13');assert.equal(f.state.player.hp,12);assert.equal(fb.hand.length,2);assert.equal(fb.swordIntent,1);
  play(f,'S14');assert.equal(fb.enemy.hp,495);assert.equal(fb.swordIntent,3);play(f,'S12');assert.equal(fb.block,14);assert.equal(fb.enemy.chill,2);assert.equal(fb.swordIntent,4);
});

test('职业卡池覆盖普通精英奖励、一次换牌、商店和18独立事件授牌，专属遗物不混入精英',()=>{
  for(const starter of ['mark','sword'])for(let seed=1;seed<=30;seed++){
    const g=createGame({rng:random(seed)});g.newRun(starter); g.enterRegion();injectNode(g,'elite');kill(g);let s=g.state;
    const prefix=starter==='sword'?'S':'C';assert.ok(s.reward.cards.every(id=>id.startsWith(prefix)));assert.ok(s.reward.cards.some(id=>CARDS[id].rarity==='rare'));assert.ok(s.reward.relicChoices.every(id=>!['bell','frostseal'].includes(id)));
    g.rerollReward();assert.ok(s.reward.cards.every(id=>id.startsWith(prefix)));g.chooseRelic(s.reward.relicChoices[0]);g.chooseReward(null);injectNode(g,'shop');assert.ok(s.shop.cards.every(c=>c.id.startsWith(prefix)));
  }
  for(const id of EVENT_IDS){const g=createGame({rng:random(55)});g.newRun('sword'); g.enterRegion();g.state.seenEvents=EVENT_IDS.filter(x=>x!==id);const s=injectNode(g,'event');assert.equal(s.event.id,id);for(const c of s.event.choices)assert.ok((c.cardIds||[]).every(id=>id.startsWith('S')));}
});

test('1000张三境十二段路线所有节点可达、实际1-2出口，任意完整路线至少四场含Boss',()=>{
  for(let seed=1;seed<=1000;seed++){
    const g=createGame({rng:random(seed)});g.newRun(); g.enterRegion();const map=g.state.map,seen=new Set(['f1-0']);let min=new Map([['f1-0',1]]);
    assert.equal(map.length,12);
    for(const row of map)for(const n of row){assert.ok(seen.has(n.id));assert.equal(n.revealed,n.regionIndex===0);if(n.floor>1&&n.floor<12)assert.ok(n.next.length>=1&&n.next.length<=2);for(const id of n.next){const target=map[n.floor].find(x=>x.id===id);assert.ok(target);seen.add(id);const v=min.get(n.id)+(['fight','elite','boss'].includes(target.type)?1:0);min.set(id,Math.min(min.get(id)??Infinity,v));}}
    assert.equal(seen.size,map.flat().length);assert.ok(min.get('f12-0')>=4);assert.ok(map.flat().some(n=>n.type==='fox'));
  }
});

test('十八独立事件不重抽不重复、所有54选择明确兑现代价收益，低资源均有可行出口',()=>{
  for(const character of ['mark','sword']){
    const g=createGame({rng:random(75)});g.newRun(character); g.enterRegion();const ids=[];
    for(let i=0;i<EVENT_IDS.length;i++){const s=injectNode(g,'event');ids.push(s.event.id);g.chooseEvent(s.event.choices.findIndex(c=>!c.disabled));g.leaveEvent();}
    assert.equal(new Set(ids).size,18);
    for(const id of EVENT_IDS)for(let index=0;index<3;index++){
      const x=createGame({rng:random(index+40)});x.newRun(character); x.enterRegion();const s=x.state;s.player.hp=180;s.player.maxHp=200;s.player.gold=1000;s.seenEvents=EVENT_IDS.filter(v=>v!==id);injectNode(x,'event');const choice=s.event.choices[index],old=structuredClone(s.player);assert.equal(s.event.id,id);assert.equal(choice.disabled,false);assert.equal(x.chooseEvent(index),true);
      let max=old.maxHp-(choice.maxHpCost||0),hp=Math.min(max,old.hp-(choice.hpCost||0));if(choice.relic==='godblood'){max+=12;hp=Math.min(max,hp+12);}hp=Math.min(max,hp+(choice.heal||0));
      assert.equal(s.player.hp,hp);assert.equal(s.player.maxHp,max);assert.equal(s.player.gold,old.gold-(choice.goldCost||0)+(choice.goldGain||0));assert.equal(s.player.deck.length,old.deck.length-(choice.removeBasic?1:0)+(choice.cardIds?.length||0));const fixed=JSON.stringify(s.player);assert.equal(x.chooseEvent(index),false);assert.equal(JSON.stringify(s.player),fixed);
    }
    for(const id of EVENT_IDS){const x=createGame({rng:random()});x.newRun(character); x.enterRegion();x.state.player.hp=1;x.state.player.gold=0;x.state.player.deck=x.state.player.deck.slice(0,5);x.state.seenEvents=EVENT_IDS.filter(e=>e!==id);injectNode(x,'event');const choice=x.state.event.choices.findIndex(c=>!c.disabled);assert.ok(choice>=0);assert.equal(x.chooseEvent(choice),true);assert.ok(x.state.player.hp>0);assert.equal(x.leaveEvent(),true);}
  }
});
