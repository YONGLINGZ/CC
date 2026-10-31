/* V11: legacy campaign/scaling-off fixtures isolate retained rule contracts; default seven-region behaviour has separate tests. */
/* Legacy fixtures isolate card rules from regional debuffs; v7 tests cover enabled environments. */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const NightPact = require('./engine.js');

function seeded(seed) {
  let value = seed >>> 0;
  return () => ((value = (value * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function run(seed = 1, starter = 'mark') {
  const game = NightPact.createGame({campaign:'legacy',scaling:false,environment:false, rng: seeded(seed) });
  game.newRun(starter); game.enterRegion();
  return game;
}

test('可规划地图每段都有分支，所有节点可达且能抵达 Boss', () => {
  const layouts = new Set();
  for (let seed = 1; seed <= 160; seed++) {
    const game = run(seed, ['mark', 'combo', 'blood'][seed % 3]);
    const state = game.state, map = state.map, byId = Object.fromEntries(map.flat().map(node => [node.id, node]));
    assert.equal(map.length,30);assert.ok(map.flat().length>=120);
    layouts.add(map.map(floor => floor.map(node => node.type).join(',')).join('|'));
    for (let floor = 0; floor < map.length - 1; floor++) {
      assert.ok(map[floor].length > 1 || floor % 10 === 0 || floor % 10 === 9, `第 ${floor + 1} 层没有分支`);
      for (const node of map[floor]) {
        assert.ok(node.next.length > 0, `${node.id} 是死路`);
        for (const next of node.next) {
          assert.equal(byId[next].floor, node.floor + 1);
        }
        if (node.floor > 1 && node.floor < 30) {
          assert.ok(map.flat().some(previous => previous.next.includes(node.id)), `${node.id} 没有入口`);
        }
      }
    }
    for (const node of map[28]) assert.ok(node.next.includes('f30-0'));
    for (const end of [10,20,30]) assert.equal(map[end-1][0].type,'boss');

    const seen = new Set(['f1-0']), queue = ['f1-0'];
    while (queue.length) {
      const node = byId[queue.shift()];
      for (const next of node.next) if (!seen.has(next)) { seen.add(next); queue.push(next); }
    }
    assert.equal(seen.size, map.flat().length, `seed ${seed} 有节点不可达`);
    assert.ok(seen.has('f30-0'));
  }
  assert.ok(layouts.size > 20, '地图类型分布过于固定');
});

test('十八种独立剧情奇遇的每个选项都能结算，并停留在结局页', () => {
  const eventIds = NightPact.LEGACY_EVENT_IDS.filter(id=>!NightPact.CHAIN_EVENT_IDS.includes(id) && !['moon_trace','sealed_name','moon_vow','armory','sovereign_wake','sovereign_recall','sovereign_memory','tainted_mercy','demonic_offer','demonic_warning','mirror_trial','demon_manual','fallen_hunt'].includes(id));
  for (const target of eventIds) {
    for (let index = 0; index < 3; index++) {
      const game = run(77 + index, 'mark');
      const state = game.state;
      state.screen = 'map';
      state.floor = 2;
      state.availableNodes = ['f2-0'];
      state.history = [];
      state.seenEvents = NightPact.LEGACY_EVENT_IDS.filter(id => id !== target);
      state.map[1][0].type = 'event'; delete state.map[1][0].storyId;
      state.player.hp = 180;
      state.player.maxHp = 200;
      state.player.gold = 1000;

      assert.equal(game.enterNode('f2-0'), true);
      assert.equal(state.screen, 'event');
      assert.equal(state.event.id, target);
      assert.ok(state.event.choices.length>=3);
      const shownOutcome = state.event.choices[index].outcome;
      assert.equal(game.chooseEvent(index), true);
      assert.equal(state.event.resolved, true);
      assert.equal(state.floor, 2, '选择后不应直接离开奇遇');
      assert.ok(state.event.outcome.trim(), '精简叙事仍保留实际动作结果');
      assert.equal(state.event.outcome, shownOutcome, '点击后使用选项实际的当前叙事，不能回退旧模板');
      assert.ok(state.event.received.length > 0);
      assert.equal(game.chooseEvent(index), false, '结局页不能重复领取');
      assert.equal(game.leaveEvent(), true);
      if(state.event?.battle){ assert.equal(state.screen,'battle');assert.equal(state.floor,2); }
      else{assert.equal(state.floor,3);assert.equal(state.screen,'map');}
    }
  }
});

test('秘宝确实改变战斗节奏', () => {
  const game = run(9, 'mark');
  const state = game.state;
  state.player.relics.push('moonheart', 'dream', 'mirror');
  assert.equal(game.enterNode('f1-0'), true);
  const battle = state.battle;
  assert.equal(battle.energy, 5, '月髓 +1 与梦匣首回合 +1 应生效');
  assert.equal(battle.hand.length, 6, '梦匣首回合应额外抽 1 张');
  battle.hand[0].id = 'C01';
  const before = battle.enemy.hp;
  assert.equal(game.playCard(battle.hand[0].uid, true), true);
  assert.equal(before - battle.enemy.hp, 13, '爪击 6 + 照魂镜 7');
  assert.equal(battle.mirrorUsed, true);
});

test('无面神血增加最大生命，九命铃每场战斗挡一次致死', () => {
  const eventGame = run(5, 'mark');
  const eventState = eventGame.state;
  eventState.screen = 'map';
  eventState.floor = 2;
  eventState.availableNodes = ['f2-0'];
  eventState.history = [];
  eventState.seenEvents = NightPact.LEGACY_EVENT_IDS.filter(id=>id!=='shrine');
  eventState.map[1][0].type = 'event'; delete eventState.map[1][0].storyId;
  eventState.player.hp = 60;
  eventState.player.maxHp = 60;
  eventState.player.gold = 100;
  eventGame.enterNode('f2-0');
  assert.equal(eventState.event.id, 'shrine');
  eventGame.chooseEvent(0);
  assert.equal(eventState.player.maxHp, 72);
  assert.equal(eventState.player.hp, 64);

  const battleGame = run(11, 'mark');
  const battleState = battleGame.state;
  battleState.player.relics.push('ninelives');
  battleGame.enterNode('f1-0');
  const battle = battleState.battle;
  battle.enemy.id = 'paper'; // isolate lethal guard from new poison/secondary skills
  battle.enemy.intentIndex = 1;
  battleState.player.hp = 1;
  battle.block = 0;
  battleGame.endTurn();
  battleGame.resolveEnemyTurn();
  assert.equal(battleState.player.hp, 18);
  assert.equal(battle.nineUsed, true);
  assert.equal(battleState.screen, 'battle');
});
