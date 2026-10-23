/* V11: legacy campaign/scaling-off fixtures isolate retained rule contracts; default seven-region behaviour has separate tests. */
/* Legacy fixtures isolate card rules from regional debuffs; v7 tests cover enabled environments. */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { CARDS, ENEMIES, RELICS, LEGACY_FLOORS: FLOORS, LEGACY_REGIONS: REGIONS, STARTERS, LEGACY_EVENT_IDS: ALL_EVENT_IDS, CHAIN_EVENT_IDS, createGame } = require('./engine.js');

const EVENT_IDS = ALL_EVENT_IDS.filter(id => !CHAIN_EVENT_IDS.includes(id) && !['moon_trace','sealed_name','moon_vow','armory','sovereign_wake','sovereign_recall','sovereign_memory','tainted_mercy','demonic_offer','demonic_warning','mirror_trial','demon_manual','fallen_hunt'].includes(id));
let fixtureSerial = 0;
function seeded(seed) {
  let n = seed >>> 0;
  return () => { n = (1664525 * n + 1013904223) >>> 0; return n / 4294967296; };
}
function card(id) { return { uid: `fixture-${++fixtureSerial}`, id }; }
function setup(options) {
  const game = createGame({campaign:'legacy',scaling:false,environment:false, rng: seeded(123), ...options });
  game.newRun('classic'); game.enterRegion(); game.enterNode('fight');
  const b = game.state.battle;
  b.hand = []; b.draw = []; b.discard = []; b.exhaust = [];
  b.energy = 50; b.enemy.id = 'paper'; b.enemy.name = ENEMIES.paper.name;
  b.enemy.maxHp = b.enemy.hp = 500; b.enemy.intentIndex = 0;
  return game;
}
function give(game, id) {
  const instance = card(id); game.state.battle.hand.push(instance); return instance;
}
function play(game, id, target = true) { const c = give(game, id); assert.equal(game.playCard(c.uid, target), true); return c; }
function nextTurn(game) { assert.equal(game.endTurn(), true); assert.equal(game.resolveEnemyTurn(), true); }
function forceWin(game) {
  const b = game.state.battle;
  b.enemy.hp = 1; b.enemy.block = 0; b.energy = 50;
  play(game, 'C01');
}
function atNode(type, floor) {
  const game = createGame({campaign:'legacy',scaling:false,environment:false, rng: seeded(10) }); game.newRun('classic'); game.enterRegion();
  const targetFloor = type === 'boss' ? REGIONS.at(-1).stages[1] : floor;
  const node = game.state.map.flat().find(n => n.type === type && n.floor === targetFloor) || game.state.map.flat().find(n => n.type === type);
  assert.ok(node); game.state.floor = node.floor; game.state.availableNodes = [node.id];
  game.state.screen='map'; game.state.journey.regionIndex=node.regionIndex; node.revealed=true; delete node.storyId;
  assert.equal(game.enterNode(node.id), true);
  return game;
}
function battleCards(b) { return [...b.hand, ...b.draw, ...b.discard, ...b.exhaust, ...b.resolving]; }

test('数据完整：70 卡、24 敌人、15 遗物及隔离的三章三十步路线地图', () => {
  assert.equal(Object.keys(CARDS).length, 70);
  assert.equal(Object.keys(ENEMIES).length, 24);
  assert.equal(Object.keys(RELICS).length, 15);
  assert.equal(FLOORS.length, 30);
  assert.ok(FLOORS.flat().length>=120);assert.ok(FLOORS.every(row=>row.length>0));
  for (const definition of Object.values(CARDS)) {
    assert.ok(definition.text.length > 0); assert.ok(definition.cost >= 0);
  }
});

test('初始状态与独立牌实例正确；title 不允许跳入节点', () => {
  const game = createGame({campaign:'legacy',scaling:false,environment:false});
  assert.equal(game.state.screen, 'title'); assert.equal(game.enterNode('fight'), false);
  game.newRun('classic'); game.enterRegion(); const p = game.state.player;
  assert.equal(p.hp, 60); assert.equal(p.maxHp, 60); assert.equal(p.gold, 60);
  assert.deepEqual(p.relics, ['bell']);
  assert.equal(p.deck.length, 10); assert.equal(new Set(p.deck.map(c => c.uid)).size, 10);
  assert.deepEqual(p.deck.map(c => c.id).sort(), ['C01','C01','C01','C01','C02','C02','C02','C02','C03','C04']);
});

test('地图不能跳层或同时进入节点；未完成节点不计入历史', () => {
  const game = createGame({campaign:'legacy',scaling:false,environment:false}); game.newRun('classic'); game.enterRegion();
  assert.equal(game.enterNode('boss'), false); assert.equal(game.enterNode('shop'), false);
  assert.equal(game.enterNode('fight'), true); assert.equal(game.enterNode('fight'), false);
  assert.equal(game.state.history.length, 0);
  forceWin(game); assert.equal(game.state.history.length, 0);
  game.chooseReward(null);
  assert.deepEqual(game.state.history.map(n => [n.floor,n.type]), [[1,'fight']]);
  assert.equal(game.state.floor, 2); assert.equal(game.enterNode(game.state.map[2][0].id), false);
});

test('攻击与标记须有效目标；取消选敌不扣费、不移牌', () => {
  const game = setup(); const b = game.state.battle;
  for (const id of ['C01','C03']) {
    const c = give(game,id); const energy = b.energy;
    assert.equal(game.playCard(c.uid), false); assert.equal(game.playCard(c.uid, 'invalid'), false);
    assert.equal(b.energy, energy); assert.ok(b.hand.includes(c));
    assert.equal(game.playCard(c.uid, true), true);
    assert.equal(game.playCard(c.uid, true), false);
  }
});

test('费用不足不能出牌，护盾牌无须目标', () => {
  const game = setup(); const b = game.state.battle; b.energy = 0;
  const c = give(game,'C01'); assert.equal(game.playCard(c.uid,true), false);
  assert.equal(b.energy,0); assert.equal(b.enemy.hp,500); assert.ok(b.hand.includes(c));
  b.energy = 1; const shield = give(game,'C02'); assert.equal(game.playCard(shield.uid),true);
  assert.equal(b.energy,0); assert.equal(b.block,5);
});

test('敌人回合与结算中不能操作，结束回合只锁定且弃牌', () => {
  const game = setup(); const b = game.state.battle; const c = give(game,'C02');
  assert.equal(game.endTurn(),true); assert.equal(b.phase,'enemy'); assert.equal(b.hand.length,0);
  assert.ok(b.discard.includes(c)); assert.equal(game.playCard(c.uid),false);
  assert.equal(game.endTurn(),false);
  b.phase='resolving'; assert.equal(game.playCard(c.uid),false); assert.equal(game.resolveEnemyTurn(),false);
  b.phase='enemy'; assert.equal(game.resolveEnemyTurn(),true); assert.equal(b.phase,'player');
  assert.equal(game.resolveEnemyTurn(),false);
});

test('攻击先扣敌方护盾，伤害/生命/灵力不产生负值', () => {
  const game = setup(); const b=game.state.battle; b.enemy.block=4;
  play(game,'C01'); assert.equal(b.enemy.block,0); assert.equal(b.enemy.hp,498);
  b.enemy.block=100; play(game,'C01'); assert.equal(b.enemy.hp,498); assert.equal(b.enemy.block,94);
  b.enemy.hp=1; b.enemy.block=0; play(game,'C01'); assert.equal(b.enemy.hp,0);
  assert.equal(game.state.screen,'reward'); assert.ok(b.energy>=0);
});

test('玩家护盾按连段逐次扣除，自己回合开始清空旧护盾', () => {
  const game = setup(); const b=game.state.battle;
  b.enemy.id='ape'; b.enemy.name=ENEMIES.ape.name; b.block=5;
  nextTurn(game); assert.equal(game.state.player.hp,56); assert.equal(b.block,0);
  assert.equal(b.logs.filter(l=>l.startsWith('敌人攻击 3')).length,3);
});

test('标记最多 5 层且不自动增伤；金铃每回合只触发一次', () => {
  const game=setup(); const b=game.state.battle;
  play(game,'C03'); play(game,'C03'); play(game,'C03');
  assert.equal(b.enemy.mark,5); assert.equal(b.block,3);
  play(game,'C01'); assert.equal(b.enemy.hp,494);
  nextTurn(game); b.energy=50; play(game,'C03'); assert.equal(b.block,0);
  play(game,'C04'); play(game,'C03'); assert.equal(b.block,3); assert.equal(b.enemy.mark,2);
});

test('扑杀按当前标记增伤并清除；被护盾完全挡住也清除', () => {
  const game=setup(); const b=game.state.battle;
  b.enemy.mark=3; play(game,'C04'); assert.equal(b.enemy.hp,478); assert.equal(b.enemy.mark,0);
  b.enemy.block=100; b.enemy.mark=5; play(game,'C04');
  assert.equal(b.enemy.hp,478); assert.equal(b.enemy.block,70); assert.equal(b.enemy.mark,0);
});

test('候机叠加后只增连爪第一段，3 段独立记录', () => {
  const game=setup(); const b=game.state.battle;
  play(game,'C10'); play(game,'C10'); play(game,'C05');
  assert.equal(b.enemy.hp,483); assert.equal(b.nextAttack,0);
  const damageLogs=b.logs.filter(l=>l.startsWith('对纸人造成'));
  assert.equal(damageLogs.length,3); assert.ok(damageLogs[0].includes('11 点'));
  assert.ok(damageLogs[1].includes('3 点')); assert.ok(damageLogs[2].includes('3 点'));
  play(game,'C01'); assert.equal(b.enemy.hp,477);
});

test('候机跨非攻击牌保留，但回合结束清空', () => {
  const game=setup(); const b=game.state.battle;
  play(game,'C10'); play(game,'C03'); play(game,'C02'); assert.equal(b.nextAttack,4);
  game.endTurn(); assert.equal(b.nextAttack,0); game.resolveEnemyTurn();
  b.energy=50; play(game,'C01'); assert.equal(b.enemy.hp,494);
});

test('抽牌时正在结算的夜猎不进弃牌堆，不能抽回自己', () => {
  const game=setup(); const b=game.state.battle;
  const discarded=card('C01'); b.discard=[discarded]; const c=give(game,'C09');
  game.playCard(c.uid); assert.deepEqual(b.hand,[discarded]); assert.deepEqual(b.discard,[c]);
  assert.equal(b.resolving.length,0); assert.equal(b.draw.length,0);
});

test('抽牌堆与弃牌堆均为空时停止，不制造重复卡牌', () => {
  const game=setup(); const b=game.state.battle; const c=play(game,'C09');
  assert.equal(b.hand.length,0); assert.deepEqual(b.discard,[c]);
});

test('抽牌堆耗尽后重洗弃牌，卡牌实例守恒', () => {
  const game=setup(); const b=game.state.battle;
  const a=card('C01'),c=card('C02'); b.draw=[a]; b.discard=[c];
  const hunt=play(game,'C09'); assert.deepEqual(new Set(b.hand),new Set([a,c]));
  assert.deepEqual(b.discard,[hunt]); assert.ok(b.logs.some(l=>l.includes('洗回')));
  assert.equal(new Set(battleCards(b).map(c=>c.uid)).size,3);
});

test('10 张手牌上限与溢出弃牌、文字提示生效', () => {
  const game=setup(); const b=game.state.battle;
  b.hand=Array.from({length:9},()=>card('C01'));
  b.draw=[card('C02'),card('C02')]; const hunt=give(game,'C09');
  game.playCard(hunt.uid); assert.equal(b.hand.length,10); assert.equal(b.discard.length,2);
  assert.ok(game.state.notice.includes('上限')); assert.ok(b.logs.some(l=>l.includes('溢出')));
});

test('流影要求此前打出至少两张牌，自己不提前计入阈值', () => {
  const game=setup(); const b=game.state.battle;
  b.draw=[card('C01'),card('C01')]; play(game,'C07');
  assert.equal(b.hand.length,0); assert.equal(b.block,7);
  play(game,'C10'); play(game,'C07'); assert.equal(b.hand.length,1); assert.equal(b.block,14);
});

test('猫步抽牌后消耗，月下守获得 14 护盾并抽 1', () => {
  const game=setup(); const b=game.state.battle;
  b.draw=[card('C01'),card('C01')]; const step=play(game,'C06');
  assert.equal(b.block,3); assert.equal(b.hand.length,1); assert.deepEqual(b.exhaust,[step]);
  play(game,'C12'); assert.equal(b.block,17); assert.equal(b.hand.length,2);
});

test('蓄爪叠加到下回合，触发后清除且后续回合恢复基础值', () => {
  const game=setup(); const b=game.state.battle;
  b.draw=Array.from({length:20},()=>card('C02'));
  play(game,'C11'); play(game,'C11'); assert.equal(b.nextEnergy,2); assert.equal(b.nextDraw,2);
  nextTurn(game); assert.equal(b.energy,5); assert.equal(b.hand.length,7);
  assert.equal(b.nextEnergy,0); assert.equal(b.nextDraw,0);
  nextTurn(game); assert.equal(b.energy,3); assert.equal(b.hand.length,5);
});

test('血契自损无视护盾，随后抽牌并消耗', () => {
  const game=setup(); const b=game.state.battle; b.block=20;
  b.draw=[card('C01'),card('C02')]; const blood=play(game,'C13');
  assert.equal(game.state.player.hp,57); assert.equal(b.block,20); assert.equal(b.hand.length,2);
  assert.ok(b.exhaust.includes(blood));
});

test('血契自损致死立即失败，停止抽牌且不能继续操作', () => {
  const game=setup(); const b=game.state.battle; game.state.player.hp=3;
  b.draw=[card('C01'),card('C02')]; play(game,'C13');
  assert.equal(game.state.screen,'defeat'); assert.equal(game.state.player.hp,0);
  assert.equal(b.draw.length,2); assert.equal(b.hand.length,0);
  assert.equal(game.endTurn(),false); assert.equal(game.resolveEnemyTurn(),false);
});

test('噬魂击杀治疗在离开战斗前完成，且不超过最大生命', () => {
  let seenRewardHp;
  const game=setup({onChange:s=>{if(s.screen==='reward')seenRewardHp=s.player.hp;}});
  game.state.player.hp=59; game.state.battle.enemy.hp=5;
  play(game,'C14'); assert.equal(seenRewardHp,60); assert.equal(game.state.player.hp,60);
  assert.equal(game.state.screen,'reward'); assert.equal(game.state.player.gold,80);
});

test('噬魂未击杀不治疗，妖火符先自损再造成 9 伤害', () => {
  const game=setup(); const b=game.state.battle; game.state.player.hp=40;
  play(game,'C14'); assert.equal(game.state.player.hp,40);
  play(game,'C15'); assert.equal(game.state.player.hp,39); assert.equal(b.enemy.hp,486);
});

test('妖火符自损致死时停止后续攻击', () => {
  const game=setup(); const b=game.state.battle; game.state.player.hp=1;
  play(game,'C15'); assert.equal(game.state.screen,'defeat'); assert.equal(b.enemy.hp,500);
});

test('残月按结算前标记决定抽牌，不消耗标记', () => {
  const game=setup(); const b=game.state.battle; b.draw=[card('C01'),card('C02')];
  play(game,'C16'); assert.equal(b.hand.length,0); assert.equal(b.enemy.hp,484);
  b.enemy.mark=1; play(game,'C16'); assert.equal(b.hand.length,1);
  assert.equal(b.enemy.mark,1); assert.equal(b.enemy.hp,468);
});

test('消耗仅本场有效，下场恢复；新奖励牌真实加入下场战斗', () => {
  const game=setup(); const b=game.state.battle;
  const permanent=card('C06'); game.state.player.deck.push(permanent);
  b.hand.push({...permanent}); game.playCard(permanent.uid);
  assert.equal(b.exhaust.length,1); assert.equal(game.state.player.deck.length,11);
  forceWin(game); const added=game.state.reward.cards[0]; game.chooseReward(added);
  assert.equal(game.state.player.deck.length,12); const nextNode=game.getAvailableNodes()[0]; nextNode.type='fight'; delete nextNode.storyId; assert.equal(game.enterNode(nextNode.id),true);
  const next=game.state.battle;
  assert.equal(next.exhaust.length,0); assert.equal(battleCards(next).length,12);
  assert.ok(battleCards(next).some(c=>c.uid===permanent.uid));
  assert.equal(battleCards(next).filter(c=>c.id===added).length,game.state.player.deck.filter(c=>c.id===added).length);
});

test('奖励仅生成一次，3 张不同；金币领取及选牌不能重复', () => {
  const game=setup(); forceWin(game); const s=game.state;
  const choices=s.reward.cards.slice(); assert.equal(new Set(choices).size,3);
  assert.equal(s.player.gold,80); assert.equal(game.resolveEnemyTurn(),false);
  assert.deepEqual(s.reward.cards,choices); assert.equal(game.chooseReward('C01'),false);
  assert.equal(game.chooseReward(choices[0]),true); assert.equal(s.player.deck.length,11);
  assert.equal(game.chooseReward(choices[0]),false); assert.equal(s.player.gold,80);
});

test('精英给予 35 金币及未持有遗物，重复领取不生效', () => {
  const game=atNode('elite',4); forceWin(game); const s=game.state;
  assert.equal(s.player.gold,95); assert.equal(s.reward.relicChoices.length,2);
  assert.equal(s.reward.relicPending,true); assert.equal(s.player.relics.length,1);
  const id=s.reward.relicChoices[0]; assert.equal(game.chooseRelic(id),true);
  assert.equal(game.chooseRelic(id),false); assert.ok(s.player.relics.includes(id)); assert.equal(s.player.relics.length,2);
  assert.equal(game.playCard('invalid',true),false); assert.equal(s.player.gold,95);
});

test('精英遗物全部持有时额外 20 金币，不重复给遗物', () => {
  const game=atNode('elite',4); game.state.player.relics.push(...Object.keys(RELICS).filter(id=>!['bell','fox','frostseal','veil'].includes(id)));
  forceWin(game); assert.equal(game.state.reward.gold,55); assert.equal(game.state.player.gold,115);
  assert.equal(game.state.reward.relic,null); assert.equal(game.state.reward.relicPending,false); assert.equal(game.state.player.relics.length,12);
});

test('磨爪玉在第 3 张牌结算后触发，每回合一次并重置', () => {
  const game=setup(); const b=game.state.battle; game.state.player.relics.push('jade');
  b.energy=3; play(game,'C02'); play(game,'C02'); play(game,'C02'); assert.equal(b.energy,1);
  play(game,'C02'); assert.equal(b.energy,0); play(game,'C10'); assert.equal(b.energy,0);
  nextTurn(game); play(game,'C02'); play(game,'C02'); play(game,'C02'); assert.equal(b.energy,1);
});

test('残月坠每场首回合多抽 2 张，第二回合不额外抽', () => {
  const game=createGame({campaign:'legacy',scaling:false,environment:false,rng:seeded(2)}); game.newRun('classic'); game.enterRegion(); game.state.player.relics.push('moon');
  game.enterNode('fight'); const b=game.state.battle;
  assert.equal(b.hand.length,7); nextTurn(game); assert.equal(b.hand.length,5);
});

test('商店商品固定且不同，单商品只能买一次，余额不足无变化', () => {
  const game=atNode('shop',3); const s=game.state; const ids=s.shop.cards.map(c=>c.id);
  assert.equal(new Set(ids).size,3); assert.ok(ids.every(id=>!['C01','C02'].includes(id)));
  assert.equal(game.buyCard(0),true); assert.equal(s.player.gold,25); assert.equal(s.player.deck.length,11);
  assert.equal(game.buyCard(0),false); assert.equal(game.buyCard(1),false);
  assert.equal(s.player.gold,25); assert.deepEqual(s.shop.cards.map(c=>c.id),ids);
  assert.equal(game.buyCard(-1),false); assert.equal(game.buyCard(0.5),false);
  assert.equal(game.enterNode('shop'),false);
});

test('删牌按实例扣 40 金币且每店一次，下场仍永久删除', () => {
  const game=atNode('shop',3); const s=game.state; const removed=s.player.deck[0];
  assert.equal(game.removeCard(removed.uid),true); assert.equal(s.player.gold,20);
  assert.equal(s.player.deck.length,9); assert.equal(s.player.deck.filter(c=>c.id==='C01').length,3);
  s.player.gold=100; assert.equal(game.removeCard(s.player.deck[0].uid),false);
  assert.equal(game.leaveShop(),true); assert.equal(game.leaveShop(),false);
  const next=game.getAvailableNodes()[0];next.type='fight';delete next.storyId;delete next.encounter;assert.equal(game.enterNode(next.id),true);
  assert.ok(!battleCards(s.battle).some(c=>c.uid===removed.uid)); assert.equal(battleCards(s.battle).length,9);
});

test('删牌最低保留 5 张，余额不足或无效实例不能扣钱', () => {
  const game=atNode('shop',3); const s=game.state;
  s.player.deck=s.player.deck.slice(0,5); assert.equal(game.removeCard(s.player.deck[0].uid),false);
  assert.equal(s.player.gold,60); s.player.deck.push(card('C01')); s.player.gold=39;
  assert.equal(game.removeCard(s.player.deck[0].uid),false); s.player.gold=60;
  assert.equal(game.removeCard('invalid'),false); assert.equal(s.player.gold,60);
});

test('休息治疗 18、上限截断且一次到访不能重复治疗', () => {
  const game=atNode('rest',2); const floor=game.state.floor; game.state.player.hp=50;
  assert.equal(game.rest(true),true); assert.equal(game.state.player.hp,60);
  assert.equal(game.state.floor,floor+1); assert.equal(game.rest(true),false);
  assert.equal(game.state.history.length,1);
});

test('休息直接离开不改变生命', () => {
  const game=atNode('rest',2); game.state.player.hp=31;
  game.rest(false); assert.equal(game.state.player.hp,31); assert.equal(game.state.screen,'map');
});

test('狐妖签约上限减 8、截断当前生命并给狐契；拒绝无数值变化', () => {
  const game=atNode('fox',3); assert.equal(game.fox(true),true);
  assert.equal(game.state.player.hp,52); assert.equal(game.state.player.maxHp,52);
  assert.ok(game.state.player.relics.includes('fox')); assert.equal(game.fox(true),false);
  const refused=atNode('fox',3); const before=JSON.stringify(refused.state.player);
  refused.fox(false); assert.equal(JSON.stringify(refused.state.player),before);
});

test('狐契签约门槛：生命上限大于 8 且不能已有狐契', () => {
  const game=atNode('fox',3); game.state.player.maxHp=8;
  assert.equal(game.fox(true),false); assert.equal(game.state.screen,'fox');
  game.state.player.maxHp=60; game.state.player.relics.push('fox');
  assert.equal(game.fox(true),false); assert.equal(game.state.player.maxHp,60);
});

test('狐契自损免死后继续抽牌，触发后消失且不超过最大生命', () => {
  const game=setup(); const s=game.state,b=s.battle; s.player.hp=1; s.player.maxHp=7;
  s.player.relics.push('fox'); b.draw=[card('C01'),card('C02')]; play(game,'C13');
  assert.equal(s.screen,'battle'); assert.equal(s.player.hp,7); assert.equal(b.hand.length,2);
  assert.ok(!s.player.relics.includes('fox')); assert.ok(b.logs.some(l=>l.includes('狐契触发')));
});

test('狐契被多段攻击触发后，后续段仍正常结算', () => {
  const game=setup(); const s=game.state,b=s.battle; s.player.hp=2; s.player.relics.push('fox');
  b.enemy.id='snake'; b.enemy.name=ENEMIES.snake.name; b.enemy.intentIndex=3;
  nextTurn(game); assert.equal(s.player.hp,2); assert.equal(s.screen,'battle');
  assert.ok(!s.player.relics.includes('fox')); assert.equal(b.logs.filter(l=>l.includes('狐契触发')).length,1);
  nextTurn(game); assert.equal(s.screen,'defeat'); assert.equal(s.player.hp,0);
});

test('Boss 蛇息先攻 6，再加 3 毒；玩家回合清盾后毒直伤并减层', () => {
  const game=setup(); const s=game.state,b=s.battle;
  b.enemy.id='snake'; b.enemy.name=ENEMIES.snake.name; b.enemy.intentIndex=1; b.block=20;
  assert.match(ENEMIES.snake.intents[1].text,/攻击 6.*3 层毒/);
  nextTurn(game); assert.equal(s.player.hp,57); assert.equal(b.block,0); assert.equal(b.poison,2);
  assert.equal(b.enemy.intentIndex,2);
  const text=b.logs.join('\n'); assert.ok(text.indexOf('敌人攻击 6')<text.indexOf('你获得 3 层毒'));
});

test('毒致死立即失败，不继续恢复灵力和抽牌', () => {
  const game=setup(); const s=game.state,b=s.battle;
  s.player.hp=2; b.poison=2; b.enemy.id='lantern'; b.enemy.intentIndex=0;
  b.draw=[card('C01')]; game.endTurn(); game.resolveEnemyTurn();
  assert.equal(s.screen,'defeat'); assert.equal(b.hand.length,0); assert.equal(b.draw.length,1);
});

test('毒可触发狐契，免死后正常减毒、恢复灵力和抽牌', () => {
  const game=setup(); const s=game.state,b=s.battle;
  s.player.hp=2; s.player.relics.push('fox'); b.poison=3; b.enemy.id='lantern';
  b.draw=[card('C01')]; nextTurn(game);
  assert.equal(s.player.hp,12); assert.equal(b.poison,2); assert.equal(b.energy,3);
  assert.equal(b.hand.length,1); assert.ok(!s.player.relics.includes('fox'));
});

test('蜕鳞明确清标记且给盾 10，敌人旧盾在其下个回合清空', () => {
  const game=setup(); const b=game.state.battle;
  b.enemy.id='snake'; b.enemy.name=ENEMIES.snake.name; b.enemy.intentIndex=2;
  b.enemy.mark=5; b.enemy.block=22;
  assert.match(ENEMIES.snake.intents[2].text,/清除全部猎印.*10/);
  nextTurn(game); assert.equal(b.enemy.mark,0); assert.equal(b.enemy.block,10); assert.equal(b.enemy.intentIndex,3);
  nextTurn(game); assert.equal(b.enemy.block,0); assert.equal(b.enemy.intentIndex,0);
});

test('普通与精英按权重避开上一意图，Boss固定循环；动作与展示一致', () => {
  for (const [id,def] of Object.entries(ENEMIES)) {
    const game=setup(); const s=game.state,b=s.battle;
    s.player.hp=s.player.maxHp=1000; b.enemy.id=id; b.enemy.name=def.name; b.enemy.intentIndex=0;
    for (let i=0;i<def.intents.length*2;i++) {
      const intent=game.getIntent(); b.block=100;
      const previous=b.enemy.intentIndex,expected=(previous+1)%def.intents.length;
      nextTurn(game); if(def.weights&&def.intents.length>1)assert.notEqual(b.enemy.intentIndex,previous);else assert.equal(b.enemy.intentIndex,expected);
      assert.ok(b.logs.some(l=>l.includes(`使用「${intent.name}」：${intent.text}`)));
    }
  }
});

test('击杀立刻结束，多段不再继续；胜利奖励只结算一次', () => {
  const game=setup(); const s=game.state,b=s.battle; b.enemy.hp=2;
  const c=play(game,'C05'); assert.equal(s.screen,'reward'); assert.equal(b.phase,'ended');
  assert.equal(b.logs.filter(l=>l.startsWith('对纸人造成')).length,1);
  assert.equal(game.playCard(c.uid,true),false); assert.equal(game.endTurn(),false);
  assert.equal(s.player.gold,80); assert.equal(s.stats.battles,1);
});

test('Boss 胜利直接结算，无选牌奖励，节点历史记录完成', () => {
  const game=atNode('boss',6); forceWin(game);
  assert.equal(game.state.screen,'victory'); assert.equal(game.state.reward,null);
  assert.equal(game.state.player.gold,60); assert.deepEqual(game.state.result,{won:true,floor:30,enemy:ENEMIES.snake.name,character:'assassin',power:0});
  assert.deepEqual(game.state.history.map(n=>n.type),['boss']); assert.equal(game.chooseReward(null),false);
});

test('胜败结算均清除双方护盾、毒、标记、临时增伤和下回合预备状态', () => {
  for (const outcome of ['win','loss']) {
    const game=setup(); const s=game.state,b=s.battle;
    b.block=14; b.poison=3; b.enemy.block=8; b.enemy.mark=4; b.enemy.poison=7;
    b.nextAttack=4; b.nextEnergy=2; b.nextDraw=2; b.bellUsed=true; b.jadeUsed=true;
    if(outcome==='win') { b.enemy.hp=1; play(game,'C04'); }
    else { s.player.hp=1; play(game,'C13'); }
    assert.equal(s.screen,outcome==='win'?'reward':'defeat');
    assert.equal(b.phase,'ended'); assert.equal(b.block,0); assert.equal(b.energy,0); assert.equal(b.poison,0);
    assert.equal(b.enemy.block,0); assert.equal(b.enemy.mark,0); assert.equal(b.enemy.poison,0);
    assert.equal(b.nextAttack,0); assert.equal(b.nextEnergy,0); assert.equal(b.nextDraw,0);
    assert.equal(b.bellUsed,false); assert.equal(b.jadeUsed,false);
    if(outcome==='win') assert.ok(b.logs.some(l=>l.includes('扑杀清除全部 4 层猎印')));
  }
});

test('失败后重新开始彻底还原生命、牌组、遗物、地图与临时状态', () => {
  const game=setup(); const old=game.state;
  old.player.maxHp=52; old.player.hp=1; old.player.gold=0; old.player.relics.push('jade','fox');
  old.player.deck.splice(0,4); old.battle.poison=9;
  old.player.relics=old.player.relics.filter(id=>id!=='fox');
  play(game,'C13'); assert.equal(old.screen,'defeat');
  game.newRun('classic'); game.enterRegion(); const s=game.state;
  assert.notEqual(s,old); assert.equal(s.screen,'map'); assert.equal(s.player.hp,60); assert.equal(s.player.maxHp,60);
  assert.equal(s.player.gold,60); assert.equal(s.player.deck.length,10); assert.deepEqual(s.player.relics,['bell']);
  assert.equal(s.battle,null); assert.equal(s.shop,null); assert.equal(s.reward,null); assert.equal(s.result,null);
  assert.equal(s.floor,1); assert.equal(s.history.length,0); assert.deepEqual(s.stats,{battles:0,cardsPlayed:0,eliteBattles:0,maxCombo:0,maxHit:0,chapterBosses:0,demonicUses:0}); assert.equal(s.rewardRerolls,1);
});

test('四个职业流派开局各 10 个独立实例，首战真实使用所选职业牌组', () => {
  for (const [id, starter] of Object.entries(STARTERS).filter(([id])=>id!=='sovereign')) {
    const game = createGame({campaign:'legacy',scaling:false,environment:false,rng:seeded(9)}); assert.equal(game.newRun(id),true); game.enterRegion();
    const s = game.state;
    assert.equal(s.starter,id); assert.equal(s.player.deck.length,10);
    assert.deepEqual(s.player.deck.map(c=>c.id),starter.cards);
    const sword = starter.character === 'sword';
    assert.equal(s.player.deck.filter(c=>c.id===(sword?'S01':'C01')).length,sword?4:3);
    assert.equal(s.player.deck.filter(c=>c.id===(sword?'S02':'C02')).length,sword?4:3);
    game.enterNode(s.availableNodes[0]);
    assert.deepEqual(battleCards(s.battle).map(c=>c.id).sort(),starter.cards.slice().sort());
  }
  const game=createGame({campaign:'legacy',scaling:false,environment:false});const old=game.state;assert.equal(game.newRun('invalid'),false); game.enterRegion();assert.equal(game.state,old);
});

test('三十步地图只开放真实后继，锁定节点不能跨层或重复进入', () => {
  const game=setup();forceWin(game);game.chooseReward(null);const s=game.state;
  assert.equal(s.availableNodes.length,s.map[1].length);
  const selected=s.map[1].find(n=>n.next.length<s.map[2].length);assert.ok(selected,'at least one second-stage branch has a distinct destination');
  assert.equal(game.enterNode(s.map[2][0].id),false);
  assert.equal(game.enterNode(selected.id),true);
  assert.equal(game.enterNode(selected.id),false);
  if(s.screen==='battle'){forceWin(game);game.chooseReward(null);}
  else if(s.screen==='event'){game.chooseEvent(s.event.choices.findIndex(c=>!c.disabled));game.leaveEvent();}
  else if(s.screen==='rest')game.rest(true);
  else if(s.screen==='shop')game.leaveShop();
  else if(s.screen==='fox')game.fox(false);
  assert.deepEqual(s.availableNodes,selected.next);assert.equal(s.currentNode,selected.id);
  assert.equal(game.enterNode(selected.id),false);
  const unreachable=s.map[2].find(n=>!selected.next.includes(n.id));
  if(unreachable)assert.equal(game.enterNode(unreachable.id),false);
  for (const row of s.map) for (const n of row) for (const next of n.next) {
    const target=s.map.flat().find(t=>t.id===next);assert.equal(target.floor,n.floor+1);
  }
  assert.equal(new Set(s.history.map(n=>n.id)).size,s.history.length);
});

test('地图每局生成一次且有随机节点，宽度和首尾战斗固定', () => {
  const layouts=new Set();
  for(let seed=1;seed<=30;seed++) {
    const game=createGame({campaign:'legacy',scaling:false,environment:false,rng:seeded(seed)});game.newRun(); game.enterRegion();const map=JSON.stringify(game.state.map);
    layouts.add(map);for(let i=0;i<4;i++)game.getAvailableNodes();assert.equal(JSON.stringify(game.state.map),map);
    assert.equal(game.state.map[0][0].type,'fight');assert.equal(game.state.map.at(-1)[0].type,'boss');
    assert.equal(game.state.map.length,30);assert.ok(game.state.map.flat().length>=120);
  }
  assert.ok(layouts.size>1);
});

test('金瞳抽牌、追猎保留标记、缚影攻守及铃音消标记换资源', () => {
  const game=setup(),b=game.state.battle;b.draw=[card('C01'),card('C02')];
  play(game,'C17');assert.equal(b.enemy.mark,4);assert.equal(b.hand.length,1);assert.equal(b.block,3);
  play(game,'C18');assert.equal(b.enemy.hp,487);assert.equal(b.enemy.mark,4);
  play(game,'C19');assert.equal(b.block,11);assert.equal(b.enemy.mark,5);
  const energy=b.energy,c=play(game,'C20');assert.equal(b.energy,energy+1);assert.equal(b.enemy.mark,4);
  assert.equal(b.hand.length,2);assert.ok(b.exhaust.includes(c));
  b.enemy.mark=0;const before=b.energy;play(game,'C20');assert.equal(b.energy,before);assert.equal(b.enemy.mark,0);
});

test('终夜按 6×标记增伤，完全挡住仍消耗全部标记', () => {
  const game=setup(),b=game.state.battle;b.enemy.mark=5;play(game,'C21');assert.equal(b.enemy.hp,458);assert.equal(b.enemy.mark,0);
  b.enemy.mark=3;b.enemy.block=100;play(game,'C21');assert.equal(b.enemy.hp,458);assert.equal(b.enemy.block,70);assert.equal(b.enemy.mark,0);
});

test('裂帛按此前出牌数决定两段伤害，候机只增加首段', () => {
  const game=setup(),b=game.state.battle;play(game,'C22');assert.equal(b.enemy.hp,492);
  play(game,'C10');play(game,'C22');assert.equal(b.enemy.hp,476);
  assert.deepEqual(b.events.filter(e=>e.type==='attack').map(e=>e.amount),[10,6]);
});

test('逐影抽牌后消耗；狂爪第 3 张起增加独立第五段', () => {
  const game=setup(),b=game.state.battle;b.draw=[card('C01')];
  const c=play(game,'C23');assert.equal(b.enemy.hp,497);assert.equal(b.hand.length,1);assert.ok(b.exhaust.includes(c));
  play(game,'C24');assert.equal(b.events.filter(e=>e.type==='attack').length,4);assert.equal(b.enemy.hp,481);
  play(game,'C24');assert.equal(b.events.filter(e=>e.type==='attack').length,5);assert.equal(b.enemy.hp,461);
});

test('灵巧与献寿先自损再回灵力；翻檐逐项结算攻击、护盾、抽牌', () => {
  const game=setup(),b=game.state.battle;b.draw=[card('C02')];const e=b.energy;
  const a=play(game,'C25');assert.equal(game.state.player.hp,59);assert.equal(b.energy,e+1);assert.ok(b.exhaust.includes(a));
  const c=play(game,'C29');assert.equal(game.state.player.hp,54);assert.equal(b.energy,e+3);assert.ok(b.exhaust.includes(c));
  play(game,'C26');assert.equal(b.enemy.hp,496);assert.equal(b.block,4);assert.equal(b.hand.length,1);
  assert.deepEqual(b.events.map(e=>e.type),['card','attack','block','draw','resources']);
});

test('歃血可叠加并跨回合，只增每张攻击第一段，胜利清除', () => {
  const game=setup(),b=game.state.battle;const a=play(game,'C27');play(game,'C27');
  assert.equal(game.state.player.hp,52);assert.equal(b.bloodPower,4);assert.ok(b.exhaust.includes(a));
  play(game,'C05');assert.deepEqual(b.events.filter(e=>e.type==='attack').map(e=>e.amount),[7,3,3]);
  nextTurn(game);b.energy=50;play(game,'C01');assert.equal(b.events.find(e=>e.type==='attack').amount,10);
  forceWin(game);assert.equal(b.bloodPower,0);
});

test('血饮即使护盾完全阻挡也治疗，击杀治疗在奖励前完成', () => {
  const game=setup(),b=game.state.battle;game.state.player.hp=40;b.enemy.block=50;
  play(game,'C28');assert.equal(game.state.player.hp,44);assert.equal(b.enemy.hp,500);
  b.enemy.block=0;b.enemy.hp=10;play(game,'C28');assert.equal(game.state.screen,'reward');assert.equal(game.state.player.hp,49); // second blood-drink benefits from its first wound
  const types=b.events.map(e=>e.type);assert.ok(types.indexOf('heal')<types.indexOf('victory'));
});

test('残心在半血边界翻倍；借命先失血再加盾', () => {
  const game=setup(),s=game.state,b=s.battle;s.player.hp=31;play(game,'C30');assert.equal(b.enemy.hp,492);
  s.player.hp=30;play(game,'C30');assert.equal(b.enemy.hp,476);
  play(game,'C31');assert.equal(s.player.hp,28);assert.equal(b.block,12);
});

test('所有自损牌致死时停止剩余效果；狐契免死后才继续', () => {
  for(const [id,loss] of [['C13',3],['C15',1],['C25',1],['C27',4],['C29',5],['C31',2]]) {
    const game=setup(),s=game.state,b=s.battle;s.player.hp=loss;b.draw=[card('C01')];
    play(game,id);assert.equal(s.screen,'defeat',id);assert.equal(b.enemy.hp,500,id);
    assert.equal(b.draw.length,1,id);assert.equal(b.energy,0,id);assert.equal(b.bloodPower,0,id);assert.equal(b.block,0,id);
    const revived=setup(),r=revived.state,rb=r.battle;r.player.hp=loss;r.player.relics.push('fox');
    play(revived,id);assert.equal(r.screen,'battle',id);assert.equal(r.player.hp,12,id);assert.ok(!r.player.relics.includes('fox'),id);
    if(id==='C25')assert.equal(rb.energy,51);if(id==='C27')assert.equal(rb.bloodPower,2);if(id==='C29')assert.equal(rb.energy,52);if(id==='C31')assert.equal(rb.block,12);
  }
});

test('绕指柔按此前两张阈值加盾且消耗；护心清毒；盾返上限；归息封顶', () => {
  const game=setup(),s=game.state,b=s.battle;const c=play(game,'C32');assert.equal(b.block,3);assert.ok(b.exhaust.includes(c));
  play(game,'C10');play(game,'C32');assert.equal(b.block,9);b.poison=3;
  play(game,'C34');assert.equal(b.block,27);assert.equal(b.poison,1);
  play(game,'C35');assert.equal(b.enemy.hp,482);assert.equal(b.block,27);
  s.player.hp=59;const r=play(game,'C36');assert.equal(s.player.hp,60);assert.ok(b.exhaust.includes(r));
});

test('逆鳞逐段抵挡反击，可叠加，下个玩家回合清除', () => {
  const game=setup(),b=game.state.battle;b.enemy.id='ape';b.enemy.name=ENEMIES.ape.name;
  play(game,'C33');play(game,'C33');assert.equal(b.riposte,6);assert.equal(b.block,12);
  nextTurn(game);assert.equal(game.state.player.hp,60);assert.equal(b.enemy.hp,482);assert.equal(b.riposte,0);
  assert.deepEqual(b.events.filter(e=>e.type==='attack').map(e=>[e.source,e.amount]),[
    ['enemy',3],['player',6],['enemy',3],['player',6],['enemy',3],['player',6]
  ]);
});

test('逆鳞击杀停止后续连段并只奖励一次；玩家先死时不反击', () => {
  const game=setup(),b=game.state.battle;b.enemy.id='ape';b.enemy.hp=3;play(game,'C33');nextTurn(game);
  assert.equal(game.state.screen,'reward');assert.equal(game.state.player.gold,80);
  assert.equal(b.events.filter(e=>e.type==='attack'&&e.source==='enemy').length,1);
  assert.equal(game.resolveEnemyTurn(),false);
  const dead=setup(),d=dead.state,db=d.battle;play(dead,'C33');db.block=1;d.player.hp=1;db.enemy.hp=3;
  nextTurn(dead);assert.equal(d.screen,'defeat');assert.equal(db.enemy.hp,3);
  assert.equal(db.events.filter(e=>e.type==='attack'&&e.source==='player').length,0);
});

test('逆鳞遇狐契免死可以继续反击，且后续伤害仍会结算', () => {
  const game=setup(),s=game.state,b=s.battle;play(game,'C33');b.enemy.id='snake';b.enemy.intentIndex=3;
  b.block=1;s.player.hp=1;s.player.relics.push('fox');nextTurn(game);
  assert.equal(s.player.hp,2);assert.equal(b.enemy.hp,497);assert.ok(!s.player.relics.includes('fox'));
});

test('夜牙簪每回合首张攻击首段 +2，非攻击牌不提前消耗', () => {
  const game=setup(),s=game.state,b=s.battle;s.player.relics.push('fang');play(game,'C03');play(game,'C05');
  assert.deepEqual(b.events.filter(e=>e.type==='attack').map(e=>e.amount),[5,3,3]);
  play(game,'C01');assert.equal(b.events.find(e=>e.type==='attack').amount,6);
  nextTurn(game);b.energy=50;play(game,'C01');assert.equal(b.events.find(e=>e.type==='attack').amount,8);
});

test('鲛绡带可由金铃触发首次护盾，每回合只增加 2', () => {
  const game=setup(),s=game.state,b=s.battle;s.player.relics.push('silk');play(game,'C03');assert.equal(b.block,5);
  play(game,'C02');assert.equal(b.block,10);nextTurn(game);b.energy=50;play(game,'C02');assert.equal(b.block,7);
});

test('回春露普通及 Boss 胜利恢复 8，死亡不恢复', () => {
  for(const type of ['fight','boss']) {
    const game=type==='fight'?setup():atNode('boss',8);game.state.player.relics.push('vial');game.state.player.hp=20;
    forceWin(game);assert.equal(game.state.player.hp,28);
  }
  const game=setup();game.state.player.relics.push('vial');game.state.player.hp=1;play(game,'C13');assert.equal(game.state.player.hp,0);
});

test('朱砂心只对本回合首个存活自损给灵力，毒与敌方伤害不触发', () => {
  const game=setup(),s=game.state,b=s.battle;s.player.relics.push('bloodstone');const before=b.energy;
  play(game,'C13');assert.equal(b.energy,before+1);play(game,'C15');assert.equal(b.energy,before);
  nextTurn(game);assert.equal(b.energy,3);b.poison=1;nextTurn(game);assert.equal(b.energy,3);
  play(game,'C25');assert.equal(b.energy,5);
  const dead=setup();dead.state.player.relics.push('bloodstone');dead.state.player.hp=1;play(dead,'C25');
  assert.equal(dead.state.battle.events.filter(e=>e.relic==='bloodstone').length,0);
});

test('事件每次进入只生成一次，至少一个有效选项，接受后不能重复领取', () => {
  const kinds=new Set();
  for(let seed=1;seed<=200;seed++) {
    const game=createGame({campaign:'legacy',scaling:false,environment:false,rng:seeded(seed)});game.newRun(); game.enterRegion();const s=game.state;
    const node=s.map[1][0];node.type='event';delete node.encounter;s.floor=2;s.availableNodes=[node.id];delete node.storyId;s.seenEvents=ALL_EVENT_IDS.filter(id=>!EVENT_IDS.includes(id));game.enterNode(node.id);
    const before=JSON.stringify(s.event);kinds.add(s.event.id);assert.equal(game.enterNode(node.id),false);
    assert.equal(JSON.stringify(s.event),before);const index=s.event.choices.findIndex(c=>!c.disabled);assert.ok(index>=0);
    assert.equal(game.chooseEvent(index),true);const p=JSON.stringify(s.player);
    assert.equal(game.chooseEvent(index),false);assert.equal(JSON.stringify(s.player),p);assert.equal(s.history.length,0);
    assert.equal(s.event.resolved,true);assert.equal(game.leaveEvent(),true);if(s.screen==='battle'){forceWin(game);game.chooseReward(null);}assert.equal(s.history.length,1);
  }
  assert.deepEqual(kinds,new Set(EVENT_IDS));
});

test('异闻代价与收益精确兑现，贫穷或低血时仍有免费出路', () => {
  const eventIds=EVENT_IDS;
  for (const id of eventIds) for (const poor of [false,true]) {
    const game=createGame({campaign:'legacy',scaling:false,environment:false,rng:seeded(60)});game.newRun(); game.enterRegion();const s=game.state;
    const node=s.map[1][0];node.type='event';delete node.encounter;s.floor=2;s.availableNodes=[node.id];delete node.storyId;
    s.seenEvents=ALL_EVENT_IDS.filter(other=>other!==id);
    if(poor){s.player.hp=1;s.player.gold=0;s.player.deck=s.player.deck.slice(0,5);}
    else{s.player.hp=30;s.player.gold=100;}
    game.enterNode(node.id);assert.equal(s.event.id,id);
    const index=s.event.choices.findIndex(c=>!c.disabled);assert.ok(index>=0);
    const choice=s.event.choices[index],before=structuredClone(s.player);
    assert.equal(game.chooseEvent(index),true);
    let hp=before.hp-(choice.hpCost||0),max=before.maxHp-(choice.maxHpCost||0);
    hp=Math.min(hp,max);
    if(choice.relic==='godblood'){max+=12;hp=Math.min(max,hp+12);}
    hp=Math.min(max,hp+(choice.heal||0));
    assert.equal(s.player.hp,hp);assert.equal(s.player.maxHp,max);
    assert.equal(s.player.gold,before.gold-(choice.goldCost||0)+(choice.goldGain||0));
    assert.ok(s.player.hp>0);
  }
});

test('结构化事件逐段准确、ID唯一、每行动重置并在致死后保留', () => {
  const game=setup(),b=game.state.battle;b.enemy.block=4;play(game,'C05');
  const first=b.events.slice(),hits=first.filter(e=>e.type==='attack');
  assert.deepEqual(hits.map(e=>[e.amount,e.absorbed,e.damage,e.hitIndex]),[[3,3,0,0],[3,1,2,1],[3,0,3,2]]);
  assert.ok(hits.every(e=>e.cardId==='C05'&&e.source==='player'&&e.target==='enemy'));
  play(game,'C03');assert.ok(b.events.every(e=>!first.some(old=>old.id===e.id)));assert.ok(!b.events.some(e=>e.type==='attack'));
  b.enemy.hp=1;play(game,'C01');assert.equal(game.state.screen,'reward');assert.ok(b.events.some(e=>e.type==='attack'));assert.ok(b.events.some(e=>e.type==='victory'));
  assert.equal(new Set(b.events.map(e=>e.id)).size,b.events.length);assert.ok(b.logs.length>0);
});

test('公开 API 四种开局和三条路线共 36 固定种子自然走完三章三十步封域', () => {
  const {playRun}=require('./playtest.cjs');let wins=0;
  for(const starter of Object.keys(STARTERS).filter(id=>id!=='sovereign'))for(let lane=0;lane<3;lane++)for(let seed=1;seed<=3;seed++) {
    const result=playRun(1000+lane*100+seed,starter,lane,{campaign:'legacy',scaling:false,environment:false});
    assert.ok(['victory','defeat'].includes(result.result));
    if(result.result==='victory'){wins++;assert.equal(result.floor,30);assert.equal(result.encounters.length,30);assert.equal(result.encounters[0],'fight');}
  }
  assert.ok(wins>=18,`Natural run victories: ${wins}/36`);
});
