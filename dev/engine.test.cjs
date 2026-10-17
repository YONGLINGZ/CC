'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { CARDS, ENEMIES, RELICS, FLOORS, createGame } = require('./engine.js');

let fixtureSerial = 0;
function seeded(seed) {
  let n = seed >>> 0;
  return () => { n = (1664525 * n + 1013904223) >>> 0; return n / 4294967296; };
}
function card(id) { return { uid: `fixture-${++fixtureSerial}`, id }; }
function setup(options) {
  const game = createGame({ rng: seeded(123), ...options });
  game.newRun(); game.enterNode('fight');
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
  const game = createGame({ rng: seeded(10) }); game.newRun();
  game.state.floor = floor;
  assert.equal(game.enterNode(type), true);
  return game;
}
function battleCards(b) { return [...b.hand, ...b.draw, ...b.discard, ...b.exhaust, ...b.resolving]; }

test('数据完整：16 卡、6 敌人、4 遗物及六层固定分支', () => {
  assert.equal(Object.keys(CARDS).length, 16);
  assert.equal(Object.keys(ENEMIES).length, 6);
  assert.equal(Object.keys(RELICS).length, 4);
  assert.deepEqual(FLOORS.map(nodes => nodes.map(n => n.type)), [
    ['fight'], ['fight', 'rest'], ['shop', 'fox'], ['fight', 'elite'], ['rest', 'shop'], ['boss']
  ]);
  for (const definition of Object.values(CARDS)) {
    assert.ok(definition.text.length > 0); assert.ok(definition.cost >= 0);
  }
});

test('初始状态与独立牌实例正确；title 不允许跳入节点', () => {
  const game = createGame();
  assert.equal(game.state.screen, 'title'); assert.equal(game.enterNode('fight'), false);
  game.newRun(); const p = game.state.player;
  assert.equal(p.hp, 60); assert.equal(p.maxHp, 60); assert.equal(p.gold, 60);
  assert.deepEqual(p.relics, ['bell']);
  assert.equal(p.deck.length, 10); assert.equal(new Set(p.deck.map(c => c.uid)).size, 10);
  assert.deepEqual(p.deck.map(c => c.id).sort(), ['C01','C01','C01','C01','C02','C02','C02','C02','C03','C04']);
});

test('地图不能跳层或同时进入节点；未完成节点不计入历史', () => {
  const game = createGame(); game.newRun();
  assert.equal(game.enterNode('boss'), false); assert.equal(game.enterNode('shop'), false);
  assert.equal(game.enterNode('fight'), true); assert.equal(game.enterNode('fight'), false);
  assert.equal(game.state.history.length, 0);
  forceWin(game); assert.equal(game.state.history.length, 0);
  game.chooseReward(null);
  assert.deepEqual(game.state.history.map(n => [n.floor,n.type]), [[1,'fight']]);
  assert.equal(game.state.floor, 2); assert.equal(game.enterNode('shop'), false);
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
  assert.equal(game.state.player.deck.length,12); assert.equal(game.enterNode('fight'),true);
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
  assert.equal(s.player.gold,95); assert.ok(['jade','moon'].includes(s.reward.relic));
  assert.ok(s.player.relics.includes(s.reward.relic)); assert.equal(s.player.relics.length,2);
  assert.equal(game.playCard('invalid',true),false); assert.equal(s.player.gold,95);
});

test('精英遗物全部持有时额外 20 金币，不重复给遗物', () => {
  const game=atNode('elite',4); game.state.player.relics.push('jade','moon');
  forceWin(game); assert.equal(game.state.reward.gold,55); assert.equal(game.state.player.gold,115);
  assert.equal(game.state.reward.relic,null); assert.equal(game.state.player.relics.length,3);
});

test('磨爪玉在第 3 张牌结算后触发，每回合一次并重置', () => {
  const game=setup(); const b=game.state.battle; game.state.player.relics.push('jade');
  b.energy=3; play(game,'C02'); play(game,'C02'); play(game,'C02'); assert.equal(b.energy,1);
  play(game,'C02'); assert.equal(b.energy,0); play(game,'C10'); assert.equal(b.energy,0);
  nextTurn(game); play(game,'C02'); play(game,'C02'); play(game,'C02'); assert.equal(b.energy,1);
});

test('残月坠每场首回合多抽 2 张，第二回合不额外抽', () => {
  const game=createGame({rng:seeded(2)}); game.newRun(); game.state.player.relics.push('moon');
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
  assert.equal(game.enterNode('fight'),true);
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
  const game=atNode('rest',2); game.state.player.hp=50;
  assert.equal(game.rest(true),true); assert.equal(game.state.player.hp,60);
  assert.equal(game.state.floor,3); assert.equal(game.rest(true),false);
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
  assert.match(ENEMIES.snake.intents[2].text,/清除全部标记.*10/);
  nextTurn(game); assert.equal(b.enemy.mark,0); assert.equal(b.enemy.block,10); assert.equal(b.enemy.intentIndex,3);
  nextTurn(game); assert.equal(b.enemy.block,0); assert.equal(b.enemy.intentIndex,0);
});

test('普通敌人和 Boss 意图严格固定循环，动作与数据一致', () => {
  for (const [id,def] of Object.entries(ENEMIES)) {
    const game=setup(); const s=game.state,b=s.battle;
    s.player.hp=s.player.maxHp=1000; b.enemy.id=id; b.enemy.name=def.name;
    for (let i=0;i<def.intents.length*2;i++) {
      const intent=def.intents[b.enemy.intentIndex]; b.block=100;
      const expected=(b.enemy.intentIndex+1)%def.intents.length;
      nextTurn(game); assert.equal(b.enemy.intentIndex,expected);
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
  assert.equal(game.state.player.gold,60); assert.deepEqual(game.state.result,{won:true,floor:6,enemy:ENEMIES.snake.name});
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
    if(outcome==='win') assert.ok(b.logs.some(l=>l.includes('扑杀清除全部 4 层标记')));
  }
});

test('失败后重新开始彻底还原生命、牌组、遗物、地图与临时状态', () => {
  const game=setup(); const old=game.state;
  old.player.maxHp=52; old.player.hp=1; old.player.gold=0; old.player.relics.push('jade','fox');
  old.player.deck.splice(0,4); old.battle.poison=9;
  old.player.relics=old.player.relics.filter(id=>id!=='fox');
  play(game,'C13'); assert.equal(old.screen,'defeat');
  game.newRun(); const s=game.state;
  assert.notEqual(s,old); assert.equal(s.screen,'map'); assert.equal(s.player.hp,60); assert.equal(s.player.maxHp,60);
  assert.equal(s.player.gold,60); assert.equal(s.player.deck.length,10); assert.deepEqual(s.player.relics,['bell']);
  assert.equal(s.battle,null); assert.equal(s.shop,null); assert.equal(s.reward,null); assert.equal(s.result,null);
  assert.equal(s.floor,1); assert.equal(s.history.length,0); assert.deepEqual(s.stats,{battles:0,cardsPlayed:0});
});

// A simple deterministic pilot: the public API is used for every action, with no
// mutation of health, deck, energy, enemy state, rewards, or map progression.
function autoplay(seed, branch = 'fox') {
  const game=createGame({rng:seeded(seed)}); game.newRun();
  let turns=0;
  for(let guard=0;guard<1500;guard++) {
    const s=game.state;
    if(s.screen==='victory'||s.screen==='defeat') return {game,turns};
    if(s.screen==='map') {
      const route=['fight','fight',branch,'elite','rest','boss'];
      game.enterNode(route[s.floor-1]);
    } else if(s.screen==='reward') {
      const preference=['C16','C08','C05','C04','C03','C10','C12','C06','C11','C09','C07','C14','C15','C13'];
      const pick=preference.find(id=>s.reward.cards.includes(id)); game.chooseReward(pick);
    } else if(s.screen==='fox') game.fox(true);
    else if(s.screen==='shop') {
      const priority=['C16','C08','C05','C04','C03','C10','C12','C06'];
      const purchase=priority.map(id=>s.shop.cards.findIndex(c=>c.id===id&&!c.bought)).find(i=>i>=0);
      if(purchase!==undefined && s.player.gold>=35) game.buyCard(purchase);
      else if(!s.shop.removed && s.player.gold>=40) {
        const c=s.player.deck.find(c=>c.id==='C02'); if(c)game.removeCard(c.uid); else game.leaveShop();
      } else game.leaveShop();
    } else if(s.screen==='rest') game.rest(true);
    else if(s.screen==='battle') {
      const b=s.battle;
      if(b.phase==='enemy') {game.resolveEnemyTurn(); continue;}
      const intent=ENEMIES[b.enemy.id].intents[b.enemy.intentIndex];
      const incoming=(intent.hits||[]).reduce((a,b)=>a+b,0);
      const available=b.hand.filter(c=>CARDS[c.id].cost<=b.energy);
      const score=c=>{
        const id=c.id,mark=b.enemy.mark,bonus=b.nextAttack;
        const damages={C01:6,C04:10+4*mark,C05:9,C08:4,C14:5,C15:9,C16:16};
        if(damages[id] && damages[id]+bonus>=b.enemy.hp+b.enemy.block) return 1000;
        if(id==='C10')return 98;
        if(id==='C03')return mark<5?95:0;
        if(id==='C06')return 90;
        if(id==='C04')return mark>0?85:30;
        if(id==='C08')return 80;
        if(['C02','C07','C12'].includes(id))return b.block<incoming?75:1;
        if(id==='C13')return s.player.hp>12?55:0;
        if(id==='C09')return b.energy>1?60:10;
        if(id==='C11')return 40;
        if(id==='C15'&&s.player.hp<=1)return 0;
        return damages[id]?50:1;
      };
      available.sort((a,b)=>score(b)-score(a));
      if(available.length&&score(available[0])>0)game.playCard(available[0].uid,true);
      else {game.endTurn();turns++;}
    } else throw new Error(`Unexpected screen ${s.screen}`);
  }
  throw new Error('Pilot exceeded bounded loop');
}

test('公开 API 实际跑通六层狐契路线、胜利与再次开始，无作弊改状态', () => {
  let successful;
  for(let seed=1;seed<=30;seed++) {
    const run=autoplay(seed); if(run.game.state.screen==='victory'){successful=run;break;}
  }
  assert.ok(successful,'At least one seeded public-API run reaches victory');
  const s=successful.game.state;
  assert.deepEqual(s.history.map(h=>h.type),['fight','fight','fox','elite','rest','boss']);
  assert.equal(s.history.length,6); assert.ok(s.player.hp>0); assert.ok(successful.turns>0);
  successful.game.newRun(); assert.equal(successful.game.state.player.hp,60);
  assert.equal(successful.game.state.player.deck.length,10);
});

test('公开 API 商店路线可完成，50 个固定随机种子均终止且保持合法状态', () => {
  let wins=0,losses=0;
  for(let seed=1;seed<=50;seed++) {
    const {game}=autoplay(seed,'shop'); const s=game.state;
    assert.ok(['victory','defeat'].includes(s.screen));
    assert.ok(s.player.hp>=0&&s.player.hp<=s.player.maxHp); assert.ok(s.player.gold>=0);
    assert.ok(s.player.deck.length>=5); assert.equal(new Set(s.player.deck.map(c=>c.uid)).size,s.player.deck.length);
    assert.ok(s.floor>=1&&s.floor<=6); assert.equal(new Set(s.history.map(n=>n.floor)).size,s.history.length);
    if(s.screen==='victory')wins++;else losses++;
  }
  assert.ok(wins>0); console.log(`API 50-seed shop-route simulation: ${wins} victory, ${losses} defeat.`);
});
