/* 百妖夜契 — deterministic, DOM-independent game rules. */
(function (root) {
  'use strict';

  const CARDS = {
    C01: { name: '爪击', cost: 1, text: '对敌人造成 6 点伤害。', target: true, attack: true },
    C02: { name: '敛息', cost: 1, text: '获得 5 点护盾。', target: false },
    C03: { name: '窥隙', cost: 0, text: '使敌人获得 2 层标记。', target: true },
    C04: { name: '扑杀', cost: 2, text: '造成 10＋4×敌人当前标记层数的伤害，然后清除敌人全部标记。', target: true, attack: true },
    C05: { name: '连爪', cost: 1, text: '连续造成 3 次、每次 3 点伤害。', target: true, attack: true },
    C06: { name: '猫步', cost: 0, text: '获得 3 点护盾，抽 1 张牌。消耗。', target: false, exhaust: true },
    C07: { name: '流影', cost: 1, text: '获得 7 点护盾；若此前本回合已打出至少 2 张牌，再抽 1 张牌。', target: false },
    C08: { name: '戏鼠', cost: 1, text: '造成 4 点伤害，然后使敌人获得 2 层标记。', target: true, attack: true },
    C09: { name: '夜猎', cost: 1, text: '抽 2 张牌。', target: false },
    C10: { name: '候机', cost: 0, text: '本回合下一张攻击牌的第一段伤害增加 4。可叠加，触发后全部清除；回合结束也清除。', target: false },
    C11: { name: '蓄爪', cost: 1, text: '下个玩家回合额外获得 1 点灵力，并额外抽 1 张牌。可叠加，触发后清除。', target: false },
    C12: { name: '月下守', cost: 2, text: '获得 14 点护盾，抽 1 张牌。', target: false },
    C13: { name: '血契', cost: 0, text: '先失去 3 点生命，再抽 2 张牌。消耗。', target: false, exhaust: true },
    C14: { name: '噬魂', cost: 1, text: '造成 5 点伤害；若该次伤害击杀敌人，恢复 3 点生命。', target: true, attack: true },
    C15: { name: '妖火符', cost: 1, text: '先失去 1 点生命，再对敌人造成 9 点伤害。', target: true, attack: true },
    C16: { name: '残月', cost: 2, text: '造成 16 点伤害；若结算前敌人带有标记，再抽 1 张牌，不消耗标记。', target: true, attack: true },
    C17: { name: '金瞳', cost: 1, text: '施加 4 层标记，抽 1 张牌。', target: true },
    C18: { name: '追猎', cost: 1, text: '造成 5＋2×敌人标记层数的伤害，不消耗标记。', target: true, attack: true },
    C19: { name: '缚影', cost: 1, text: '获得 8 点护盾，施加 1 层标记。', target: true },
    C20: { name: '铃音', cost: 0, text: '若敌人有标记，移除 1 层，获得 1 灵力并抽 1 张牌。消耗。', target: true, exhaust: true },
    C21: { name: '终夜', cost: 3, text: '造成 12＋6×敌人标记层数的伤害，然后清除全部标记。', target: true, attack: true },
    C22: { name: '裂帛', cost: 1, text: '连续攻击 2 次，每次 4 伤害；若此前本回合已打出至少 2 张牌，每次改为 6。', target: true, attack: true },
    C23: { name: '逐影', cost: 0, text: '造成 3 点伤害，抽 1 张牌。消耗。', target: true, attack: true, exhaust: true },
    C24: { name: '狂爪', cost: 2, text: '连续攻击 4 次，每次 4 伤害；若此前本回合已打出至少 2 张牌，再攻击 1 次。', target: true, attack: true },
    C25: { name: '灵巧', cost: 0, text: '先失去 1 点生命，再获得 1 点灵力。消耗。', target: false, exhaust: true },
    C26: { name: '翻檐', cost: 1, text: '造成 4 点伤害，获得 4 点护盾，抽 1 张牌。', target: true, attack: true },
    C27: { name: '歃血', cost: 1, text: '先失去 4 点生命；本场战斗每张攻击牌的第一段伤害增加 2，可叠加。消耗。', target: false, exhaust: true },
    C28: { name: '血饮', cost: 2, text: '造成 10 点伤害，恢复 4 点生命（即使击杀或被护盾阻挡也治疗）。', target: true, attack: true },
    C29: { name: '献寿', cost: 0, text: '先失去 5 点生命，再获得 2 点灵力。消耗。', target: false, exhaust: true },
    C30: { name: '残心', cost: 1, text: '造成 8 点伤害；若当前生命不高于最大生命的一半，改为 16 点。', target: true, attack: true },
    C31: { name: '借命', cost: 1, text: '先失去 2 点生命，再获得 12 点护盾。', target: false },
    C32: { name: '绕指柔', cost: 0, text: '获得 3 点护盾；若此前本回合已打出至少 2 张牌，改为 6 点。消耗。', target: false, exhaust: true },
    C33: { name: '逆鳞', cost: 1, text: '获得 6 点护盾；本轮敌人每段攻击被护盾抵挡时，反击 3 点伤害。反击可叠加，到下个玩家回合清除。', target: false },
    C34: { name: '护心', cost: 2, text: '获得 18 点护盾，移除自己 2 层毒。', target: false },
    C35: { name: '盾返', cost: 1, text: '造成 4＋当前护盾的伤害（护盾贡献上限 16），不消耗护盾。', target: true, attack: true },
    C36: { name: '归息', cost: 1, text: '恢复 4 点生命。消耗。', target: false, exhaust: true }
  };
  Object.values(CARDS).forEach(card => {
    card.attack = !!card.attack;
    card.exhaust = !!card.exhaust;
  });
  const CARD_GROUPS = {
    mark: ['C03','C04','C08','C16','C17','C18','C19','C20','C21'],
    combo: ['C05','C06','C07','C09','C10','C11','C22','C23','C24','C25','C26'],
    blood: ['C13','C14','C15','C27','C28','C29','C30','C31'],
    guard: ['C02','C12','C32','C33','C34','C35','C36']
  };
  for (const [category, ids] of Object.entries(CARD_GROUPS)) for (const id of ids) CARDS[id].category = category;
  CARDS.C01.category = 'basic';
  for (const [id, card] of Object.entries(CARDS)) {
    card.rarity = ['C21','C24','C27','C28','C33','C34'].includes(id) ? 'rare' : Number(id.slice(1)) > 16 ? 'uncommon' : 'common';
  }
  const CLASSIC = ['C01','C01','C01','C01','C02','C02','C02','C02','C03','C04'];
  const STARTERS = {
    mark: { name: '金瞳猎印', description: '窥隙叠印 → 追猎压血 → 扑杀收割。以标记换取爆发。', cards: ['C01','C01','C01','C02','C02','C02','C03','C04','C17','C18'] },
    combo: { name: '月影连爪', description: '猫步与窥隙穿插，第三张触发裂帛连段；快速连续出牌。', cards: ['C01','C01','C01','C02','C02','C02','C03','C04','C06','C22'] },
    blood: { name: '赤契噬魂', description: '歃血付出生命，换整场攻击增伤；血饮边进攻边疗伤。', cards: ['C01','C01','C01','C02','C02','C02','C03','C04','C27','C28'] }
  };

  const ENEMIES = {
    paper: { name: '纸人', hp: 26, intents: [
      { name: '纸刃', text: '攻击 6', hits: [6] },
      { name: '剪影', text: '攻击 8', hits: [8] }
    ] },
    lantern: { name: '灯鬼', hp: 28, intents: [
      { name: '灯罩', text: '获得护盾 6', block: 6 },
      { name: '烛焰', text: '攻击 9', hits: [9] }
    ] },
    ape: { name: '山魈', hp: 32, intents: [
      { name: '乱爪', text: '连击 3×3', hits: [3, 3, 3] },
      { name: '山崩', text: '攻击 10', hits: [10] }
    ] },
    bone: { name: '白骨侍', hp: 30, intents: [
      { name: '骨刃', text: '攻击 7', hits: [7] },
      { name: '骨甲突刺', text: '获得护盾 4，然后攻击 6', block: 4, hits: [6] }
    ] },
    yaksha: { name: '精英·夜叉', hp: 62, intents: [
      { name: '破阵', text: '攻击 12', hits: [12] },
      { name: '夜甲', text: '获得护盾 10', block: 10 },
      { name: '镇魂', text: '攻击 16', hits: [16] }
    ] },
    snake: { name: '蛇妖·绛鳞', hp: 100, intents: [
      { name: '鳞刃', text: '攻击 10', hits: [10] },
      { name: '蛇息', text: '先攻击 6，再施加 3 层毒', hits: [6], poison: 3 },
      { name: '蜕鳞', text: '清除全部标记，再获得护盾 10', clearMark: true, block: 10 },
      { name: '绞缠', text: '连续攻击 3 次，每次 5', hits: [5, 5, 5] }
    ] }
  };

  const RELICS = {
    bell: { name: '金铃', text: '每个玩家回合首次实际增加敌人标记时，获得 3 点护盾。标记上限 5。' },
    jade: { name: '磨爪玉', text: '每个玩家回合第 3 张牌结算后，获得 1 点灵力，每回合一次。' },
    moon: { name: '残月坠', text: '每场战斗第一个玩家回合额外抽 2 张牌。' },
    fox: { name: '狐契', text: '本局下一次受到致命伤害时，免死并恢复至 12 点生命（不超过最大生命），随后消失。' },
    fang: { name: '夜牙簪', text: '每个玩家回合第一张攻击牌的第一段伤害增加 2。' },
    silk: { name: '鲛绡带', text: '每个玩家回合首次获得护盾时，额外获得 2 点护盾。' },
    vial: { name: '回春露', text: '每场战斗胜利时恢复 4 点生命。' },
    bloodstone: { name: '朱砂心', text: '每个玩家回合首次因卡牌自损生命并存活后，获得 1 点灵力。' }
  };

  const NODE_INFO = {
    fight: ['百鬼回廊','普通战斗 · 20 金币与三选一卡'],
    elite: ['夜叉守门','高风险 · 35 金币、三选一卡与新遗物'],
    rest: ['栖月温泉','休息 · 恢复 18 点生命'],
    shop: ['夜市珍阁','商店 · 随机三张牌，每张 35 金币；删牌 40'],
    fox: ['狐影朱亭','最大生命减少 8 · 换一次免死'],
    event: ['异闻幽径','随机异闻 · 代价和报酬进入时明示'],
    boss: ['绛鳞之座','最终战 · 蛇妖·绛鳞，生命 100']
  };
  const FLOORS = [
    ['fight'], ['rest','event','fight'], ['shop','fox','elite'], ['fight','fight','fight'],
    ['fight','shop','event'], ['shop','event','shop'], ['rest','rest','rest'], ['boss']
  ].map((types, floor) => types.map((type, lane) => ({
    id: `f${floor + 1}-${types.length === 1 ? 1 : lane}`, type, name: NODE_INFO[type][0], description: NODE_INFO[type][1],
    floor: floor + 1, lane: types.length === 1 ? 1 : lane
  })));

  const REWARD_POOL = Object.keys(CARDS).filter(id => Number(id.slice(1)) >= 3);
  const ORDINARY = ['paper', 'lantern', 'ape', 'bone'];

  function createGame(options = {}) {
    const rng = typeof options.rng === 'function' ? options.rng : Math.random;
    const onChange = typeof options.onChange === 'function' ? options.onChange : () => {};
    let serial = 0;
    let eventSerial = 0;
    let state;
    let activeNode = null;

    function makeCard(id) { return { uid: `card-${++serial}`, id }; }
    function rand(n) { return Math.min(n - 1, Math.max(0, Math.floor(rng() * n))); }
    function shuffle(items) {
      const array = items.slice();
      for (let i = array.length - 1; i > 0; i--) {
        const j = rand(i + 1);
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    }
    function sample(pool, count) { return shuffle(pool).slice(0, count); }
    function makeMap() {
      const map = FLOORS.map(row => row.map(node => ({ ...node, next: [] })));
      // Connections are persistent; the middle corridor and safe corridor offer
      // a different mix of encounters every run without dissolving lane choice.
      for (const [floor, lane, choices] of [[4,0,['fight','event']], [4,2,['event','rest']], [5,1,['event','rest']]]) {
        const type = choices[rand(choices.length)], node = map[floor][lane];
        node.type = type; node.name = NODE_INFO[type][0]; node.description = NODE_INFO[type][1];
      }
      for (let floor = 0; floor < map.length - 1; floor++) for (const node of map[floor]) {
        node.next = map[floor + 1].filter(next => map[floor].length === 1 || map[floor + 1].length === 1 ||
          next.lane === node.lane || (floor === 3 && Math.abs(next.lane - node.lane) === 1)).map(next => next.id);
      }
      return map;
    }
    function freshState(screen, starter = 'mark') {
      serial = 0;
      eventSerial = 0;
      const map = makeMap();
      const cards = starter === 'classic' ? CLASSIC : STARTERS[starter].cards;
      return {
        screen, starter, map, availableNodes: [map[0][0].id], currentNode: null,
        player: {
          hp: 60, maxHp: 60, gold: 60,
          deck: cards.map(makeCard),
          relics: ['bell']
        },
        floor: 1, history: [], battle: null, reward: null, shop: null, event: null,
        notice: '', result: null, stats: { battles: 0, cardsPlayed: 0 }
      };
    }
    function emit() { onChange(state); }
    function event(type, data = {}) {
      const b = state.battle;
      if (!b) return;
      const entry = { id: ++eventSerial, type, source: 'player', target: 'player', ...data };
      if (b.resolving && b.resolving[0] && !entry.cardId) entry.cardId = b.resolving[0].id;
      b.events.push(entry);
      return entry;
    }
    function beginEvents() { if (state.battle) { state.battle.events = []; state.battle.hitIndex = 0; } }
    function log(message) {
      if (!state.battle) return;
      state.battle.logs.push(message);
      if (state.battle.logs.length > 90) state.battle.logs.shift();
    }
    function note(message) { state.notice = message; }
    function hasRelic(id) { return state.player.relics.includes(id); }
    function liveBattle() { return state.screen === 'battle' && state.battle && state.battle.phase !== 'ended'; }
    function heal(amount, reason) {
      const before = state.player.hp;
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + amount);
      if (reason) log(`${reason}：恢复 ${state.player.hp - before} 点生命。`);
      if (state.battle) event('heal', { amount: state.player.hp - before, reason });
      return state.player.hp - before;
    }
    function clearCombatStatuses() {
      const b = state.battle;
      b.block = b.energy = b.poison = 0;
      b.enemy.block = b.enemy.mark = b.enemy.poison = 0;
      b.nextAttack = b.nextEnergy = b.nextDraw = 0;
      b.bloodPower = b.riposte = 0;
      b.bellUsed = b.jadeUsed = false;
      b.fangUsed = b.silkUsed = b.bloodstoneUsed = false;
    }
    function defeat() {
      if (!liveBattle()) return;
      const b = state.battle;
      b.phase = 'ended';
      clearCombatStatuses();
      state.player.hp = 0;
      state.result = { won: false, floor: state.floor, enemy: b.enemy.name };
      state.screen = 'defeat';
      note(`第 ${state.floor} 层，妖契未解，倒在${b.enemy.name}面前。`);
      log('生命归零，本局结束。');
      event('death', { source: 'enemy', target: 'player' });
    }
    function loseLife(amount, reason, selfDamage = false) {
      const p = state.player;
      p.hp = Math.max(0, p.hp - Math.max(0, amount));
      log(`${reason}：失去 ${amount} 点生命（剩余 ${p.hp}）。`);
      if (selfDamage) event('selfDamage', { amount, damage: amount, reason });
      if (p.hp > 0) {
        if (selfDamage) bloodstone();
        return true;
      }
      if (hasRelic('fox')) {
        p.relics.splice(p.relics.indexOf('fox'), 1);
        p.hp = Math.min(12, p.maxHp);
        log(`狐契触发：免于死亡，生命设为 ${p.hp}，狐契消失。`);
        note('狐契已替你付出一次死亡。');
        event('relic', { relic: 'fox', amount: p.hp, name: RELICS.fox.name });
        if (selfDamage) bloodstone();
        return true;
      }
      defeat();
      return false;
    }
    function bloodstone() {
      const b = state.battle;
      if (hasRelic('bloodstone') && !b.bloodstoneUsed) {
        b.bloodstoneUsed = true; b.energy++;
        log('朱砂心触发：首次自损，获得 1 灵力。');
        event('relic', { relic: 'bloodstone', name: RELICS.bloodstone.name, amount: 1 });
      }
    }
    function playerHit(amount, hitIndex) {
      const b = state.battle;
      const absorbed = Math.min(b.block, amount);
      b.block -= absorbed;
      const damage = Math.max(0, amount - absorbed);
      log(`敌人攻击 ${amount}：护盾抵挡 ${absorbed}，生命伤害 ${damage}。`);
      event('attack', { source: 'enemy', target: 'player', amount, absorbed, damage, hitIndex });
      if (damage > 0 && !loseLife(damage, b.enemy.name)) return false;
      if (absorbed > 0 && b.riposte > 0 && liveBattle()) {
        log(`逆鳞反击 ${b.riposte} 点伤害。`);
        enemyHit(b.riposte, 0, 0, 'riposte');
      }
      return liveBattle();
    }
    function gainBlock(amount, reason) {
      const b = state.battle;
      if (amount > 0 && hasRelic('silk') && !b.silkUsed) {
        b.silkUsed = true; amount += 2;
        log('鲛绡带触发：首次护盾额外增加 2。');
        event('relic', { relic: 'silk', name: RELICS.silk.name, amount: 2 });
      }
      b.block += amount;
      log(`${reason}：获得 ${amount} 点护盾（共 ${b.block}）。`);
      event('block', { amount, total: b.block, reason });
    }
    function addMark(amount) {
      const b = state.battle;
      const gained = Math.min(5 - b.enemy.mark, amount);
      b.enemy.mark += gained;
      log(`${b.enemy.name}获得 ${gained} 层标记（${b.enemy.mark}/5）。`);
      event('mark', { target: 'enemy', amount: gained, total: b.enemy.mark });
      if (gained > 0 && hasRelic('bell') && !b.bellUsed) {
        b.bellUsed = true;
        event('relic', { relic: 'bell', name: RELICS.bell.name, amount: 3 });
        gainBlock(3, '金铃触发');
      }
    }
    function drawCards(count) {
      const b = state.battle;
      for (let i = 0; i < count; i++) {
        if (!b.draw.length && b.discard.length) {
          b.draw = shuffle(b.discard);
          b.discard = [];
          log('抽牌堆已空：将弃牌堆洗回抽牌堆。');
          event('shuffle', { amount: b.draw.length });
        }
        if (!b.draw.length) break;
        const card = b.draw.pop();
        if (b.hand.length >= 10) {
          b.discard.push(card);
          log(`手牌已达 10 张：溢出的「${CARDS[card.id].name}」进入弃牌堆。`);
          note('手牌上限 10 张，溢出的牌已弃置。');
          event('discard', { cardId: card.id, overflow: true });
        } else { b.hand.push(card); event('draw', { drawnCardId: card.id, amount: 1 }); }
      }
    }
    function winBattle() {
      if (!liveBattle()) return;
      const b = state.battle;
      b.phase = 'ended';
      event('victory', { target: 'enemy' });
      if (hasRelic('vial')) { heal(4, '回春露触发'); event('relic', { relic: 'vial', name: RELICS.vial.name, amount: 4 }); }
      clearCombatStatuses();
      state.stats.battles++;
      log(`击败${b.enemy.name}！`);
      if (b.kind === 'boss') {
        completeNode();
        state.screen = 'victory';
        state.availableNodes = [];
        state.result = { won: true, floor: state.map.length, enemy: b.enemy.name };
        note('绛鳞伏首，妖契裂开。你终于走出了百妖楼。');
        return;
      }
      let gold = b.kind === 'elite' ? 35 : 20;
      let relic = null;
      if (b.kind === 'elite') {
        const available = Object.keys(RELICS).filter(id => !['bell','fox'].includes(id) && !hasRelic(id));
        if (available.length) {
          relic = available[rand(available.length)];
          state.player.relics.push(relic);
          log(`获得遗物「${RELICS[relic].name}」。`);
        } else {
          gold += 20;
          log('奖励遗物已集齐，额外获得 20 金币。');
        }
      }
      state.player.gold += gold;
      state.reward = { cards: sample(REWARD_POOL, 3), gold, relic };
      state.screen = 'reward';
      note(`胜利：${gold} 金币已入账，请选一张牌或跳过。`);
    }
    // The killing heal is resolved before victory changes the screen.
    function enemyHit(amount, killingHeal = 0, alwaysHeal = 0, kind = 'card') {
      const b = state.battle;
      const absorbed = Math.min(b.enemy.block, amount);
      b.enemy.block -= absorbed;
      const damage = Math.max(0, amount - absorbed);
      b.enemy.hp = Math.max(0, b.enemy.hp - damage);
      log(`对${b.enemy.name}造成 ${amount} 点伤害：护盾抵挡 ${absorbed}，生命伤害 ${damage}。`);
      event('attack', { target: 'enemy', amount, absorbed, damage, hitIndex: b.hitIndex++, kind });
      if (alwaysHeal) heal(alwaysHeal, '血饮');
      if (b.enemy.hp <= 0) {
        if (killingHeal) heal(killingHeal, '噬魂击杀');
        winBattle();
      }
    }
    function startPlayerTurn() {
      if (!liveBattle()) return;
      const b = state.battle;
      b.phase = 'resolving';
      b.turn++;
      event('blockClear', { target: 'player', amount: -b.block, total: 0 });
      b.block = 0;
      b.played = 0;
      b.bellUsed = false;
      b.jadeUsed = false;
      b.fangUsed = b.silkUsed = b.bloodstoneUsed = false;
      b.riposte = 0;
      b.nextAttack = 0;
      log(`—— 玩家第 ${b.turn} 回合：旧护盾清空 ——`);
      if (b.poison > 0) {
        const poison = b.poison;
        event('poison', { source: 'enemy', amount: poison, damage: poison, tick: true });
        if (!loseLife(poison, `毒 ${poison}（无视护盾）`)) return;
        b.poison = Math.max(0, b.poison - 1);
        log(`毒减至 ${b.poison} 层。`);
      }
      b.energy = 3 + b.nextEnergy;
      let draw = 5 + b.nextDraw;
      if (b.turn === 1 && hasRelic('moon')) {
        draw += 2;
        log('残月坠触发：首回合额外抽 2 张牌。');
        event('relic', { relic: 'moon', name: RELICS.moon.name, amount: 2 });
      }
      if (b.nextEnergy || b.nextDraw) log(`蓄爪触发：额外 ${b.nextEnergy} 灵力、${b.nextDraw} 张牌。`);
      b.nextEnergy = b.nextDraw = 0;
      drawCards(draw);
      b.phase = 'player';
    }
    function startBattle(kind) {
      const id = kind === 'boss' ? 'snake' : kind === 'elite' ? 'yaksha' : ORDINARY[rand(ORDINARY.length)];
      const def = ENEMIES[id];
      state.battle = {
        kind, phase: 'resolving', hand: [], draw: shuffle(state.player.deck.map(card => ({ ...card }))),
        discard: [], exhaust: [], resolving: [],
        enemy: { id, name: def.name, hp: def.hp, maxHp: def.hp, block: 0, mark: 0, poison: 0, intentIndex: 0 },
        block: 0, energy: 0, poison: 0, turn: 0, played: 0,
        nextAttack: 0, nextEnergy: 0, nextDraw: 0, bellUsed: false, jadeUsed: false,
        bloodPower: 0, riposte: 0, fangUsed: false, silkUsed: false, bloodstoneUsed: false, events: [], hitIndex: 0,
        logs: [`进入第 ${state.floor} 层，与${def.name}交战。`]
      };
      state.screen = 'battle';
      state.reward = null;
      startPlayerTurn();
    }
    function completeNode() {
      if (!activeNode) return;
      state.history.push({ id: activeNode.id, floor: state.floor, type: activeNode.type, name: activeNode.name, lane: activeNode.lane });
      state.currentNode = activeNode.id;
      state.availableNodes = activeNode.next.slice();
      activeNode = null;
    }
    function advance() {
      completeNode();
      state.floor++;
      state.screen = 'map';
      state.reward = null;
      state.shop = null;
      state.event = null;
      note(`第 ${state.floor} 层已开放。沿已连接的道路继续前行。`);
    }

    function newRun(starter = 'mark') {
      if (!STARTERS[starter] && starter !== 'classic') return false;
      state = freshState('map', starter);
      activeNode = null;
      note('金铃轻响。选择第一层的节点，开始闯楼。');
      emit();
      return true;
    }
    function getAvailableNodes() {
      return (state.map[state.floor - 1] || []).filter(node => state.availableNodes.includes(node.id));
    }
    function enterNode(idOrType) {
      if (state.screen !== 'map') return false;
      const available = getAvailableNodes();
      const node = available.find(item => item.id === idOrType) || available.find(item => item.type === idOrType);
      if (!node || state.history.some(item => item.floor === state.floor)) return false;
      const type = node.type;
      activeNode = node;
      state.notice = '';
      if (type === 'fight' || type === 'elite' || type === 'boss') startBattle(type);
      else {
        state.screen = type;
        if (type === 'shop') {
          state.shop = { cards: sample(REWARD_POOL, 3).map(id => ({ id, bought: false })), removed: false };
        }
        if (type === 'event') state.event = makeEvent();
      }
      emit();
      return true;
    }
    function playCard(uid, target = false) {
      const b = state.battle;
      if (state.screen !== 'battle' || !b || b.phase !== 'player') return false;
      const index = b.hand.findIndex(card => card.uid === uid);
      if (index < 0) return false;
      const card = b.hand[index];
      const def = CARDS[card.id];
      if (def.target && target !== true && target !== b.enemy.id) {
        note('请先选择卡牌，再点击敌人。取消选择不消耗灵力。');
        emit();
        return false;
      }
      if (b.energy < def.cost) {
        note(`灵力不足：「${def.name}」需要 ${def.cost} 点灵力。`);
        emit();
        return false;
      }
      if (b.enemy.hp <= 0 || state.player.hp <= 0) return false;
      beginEvents();
      state.notice = '';
      b.phase = 'resolving';
      b.energy -= def.cost;
      b.hand.splice(index, 1);
      b.resolving.push(card);
      const previousPlayed = b.played;
      b.played++;
      state.stats.cardsPlayed++;
      log(`打出「${def.name}」，消耗 ${def.cost} 灵力。`);
      event('card', { cardId: card.id, name: def.name, cost: def.cost });
      let bonus = 0;
      if (def.attack) {
        bonus = b.nextAttack + b.bloodPower;
        b.nextAttack = 0;
        if (hasRelic('fang') && !b.fangUsed) {
          b.fangUsed = true; bonus += 2;
          log('夜牙簪触发：首张攻击第一段伤害增加 2。');
          event('relic', { relic: 'fang', name: RELICS.fang.name, amount: 2 });
        }
        if (bonus) log(`首段增伤：第一段伤害增加 ${bonus}。`);
      }
      switch (card.id) {
        case 'C01': enemyHit(6 + bonus); break;
        case 'C02': gainBlock(5, def.name); break;
        case 'C03': addMark(2); break;
        case 'C04': {
          const mark = b.enemy.mark;
          enemyHit(10 + 4 * mark + bonus);
          b.enemy.mark = 0;
          event('mark', { target: 'enemy', amount: -mark, total: 0 });
          log(`扑杀清除全部 ${mark} 层标记。`);
          break;
        }
        case 'C05':
          for (let i = 0; i < 3 && liveBattle(); i++) enemyHit(3 + (i === 0 ? bonus : 0));
          break;
        case 'C06': gainBlock(3, def.name); drawCards(1); break;
        case 'C07':
          gainBlock(7, def.name);
          if (previousPlayed >= 2) { log('流影连段：额外抽 1 张牌。'); drawCards(1); }
          break;
        case 'C08': enemyHit(4 + bonus); if (liveBattle()) addMark(2); break;
        case 'C09': drawCards(2); break;
        case 'C10': b.nextAttack += 4; log(`候机：下一张攻击牌第一段额外 ${b.nextAttack} 点伤害。`); break;
        case 'C11': b.nextEnergy++; b.nextDraw++; log('蓄爪：下回合额外 1 灵力、抽 1 张牌。'); break;
        case 'C12': gainBlock(14, def.name); drawCards(1); break;
        case 'C13': if (loseLife(3, '血契自损（无视护盾）', true)) drawCards(2); break;
        case 'C14': enemyHit(5 + bonus, 3); break;
        case 'C15': if (loseLife(1, '妖火符自损（无视护盾）', true)) enemyHit(9 + bonus); break;
        case 'C16': {
          const hadMark = b.enemy.mark > 0;
          enemyHit(16 + bonus);
          if (hadMark && liveBattle()) drawCards(1);
          break;
        }
        case 'C17': addMark(4); drawCards(1); break;
        case 'C18': enemyHit(5 + 2 * b.enemy.mark + bonus); break;
        case 'C19': gainBlock(8, def.name); addMark(1); break;
        case 'C20':
          if (b.enemy.mark > 0) {
            b.enemy.mark--; b.energy++;
            event('mark', { target: 'enemy', amount: -1, total: b.enemy.mark });
            log('铃音消耗 1 层标记：获得 1 灵力并抽 1 张牌。'); drawCards(1);
          } else log('铃音：敌人没有标记，没有获得灵力或抽牌。');
          break;
        case 'C21': {
          const mark = b.enemy.mark;
          enemyHit(12 + 6 * mark + bonus); b.enemy.mark = 0;
          event('mark', { target: 'enemy', amount: -mark, total: 0 });
          log(`终夜清除全部 ${mark} 层标记。`); break;
        }
        case 'C22':
          for (let i = 0; i < 2 && liveBattle(); i++) enemyHit((previousPlayed >= 2 ? 6 : 4) + (i === 0 ? bonus : 0));
          break;
        case 'C23': enemyHit(3 + bonus); if (liveBattle()) drawCards(1); break;
        case 'C24':
          for (let i = 0; i < (previousPlayed >= 2 ? 5 : 4) && liveBattle(); i++) enemyHit(4 + (i === 0 ? bonus : 0));
          break;
        case 'C25': if (loseLife(1, '灵巧自损（无视护盾）', true)) { b.energy++; log('灵巧：获得 1 灵力。'); } break;
        case 'C26': enemyHit(4 + bonus); if (liveBattle()) { gainBlock(4, def.name); drawCards(1); } break;
        case 'C27':
          if (loseLife(4, '歃血自损（无视护盾）', true)) {
            b.bloodPower += 2; log(`歃血：本场战斗攻击首段增伤提高至 ${b.bloodPower}。`);
            event('power', { amount: 2, total: b.bloodPower });
          }
          break;
        case 'C28': enemyHit(10 + bonus, 0, 4); break;
        case 'C29': if (loseLife(5, '献寿自损（无视护盾）', true)) { b.energy += 2; log('献寿：获得 2 灵力。'); } break;
        case 'C30': enemyHit((state.player.hp <= state.player.maxHp / 2 ? 16 : 8) + bonus); break;
        case 'C31': if (loseLife(2, '借命自损（无视护盾）', true)) gainBlock(12, def.name); break;
        case 'C32': gainBlock(previousPlayed >= 2 ? 6 : 3, def.name); break;
        case 'C33': gainBlock(6, def.name); b.riposte += 3; log(`逆鳞：本轮每次护盾抵挡攻击，反击 ${b.riposte}。`); break;
        case 'C34': {
          gainBlock(18, def.name); const removed = Math.min(2, b.poison); b.poison -= removed;
          event('poison', { amount: -removed, total: b.poison }); log(`护心移除 ${removed} 层毒。`); break;
        }
        case 'C35': enemyHit(4 + Math.min(16, b.block) + bonus); break;
        case 'C36': heal(4, def.name); break;
      }
      // Keep the active card out of both draw/discard during all draw effects.
      b.resolving.splice(b.resolving.indexOf(card), 1);
      (def.exhaust ? b.exhaust : b.discard).push(card);
      if (liveBattle()) {
        if (hasRelic('jade') && b.played === 3 && !b.jadeUsed) {
          b.jadeUsed = true;
          b.energy++;
          log('磨爪玉触发：第 3 张牌结算后，获得 1 点灵力。');
          event('relic', { relic: 'jade', name: RELICS.jade.name, amount: 1 });
        }
        b.phase = 'player';
      }
      emit();
      return true;
    }
    function endTurn() {
      const b = state.battle;
      if (state.screen !== 'battle' || !b || b.phase !== 'player') return false;
      beginEvents();
      b.phase = 'enemy';
      b.nextAttack = 0;
      b.discard.push(...b.hand);
      b.hand = [];
      note('敌人正在行动……');
      log('结束回合：剩余手牌全部弃置，候机增伤清除。');
      emit();
      return true;
    }
    function resolveEnemyTurn() {
      const b = state.battle;
      if (state.screen !== 'battle' || !b || b.phase !== 'enemy') return false;
      beginEvents();
      b.phase = 'resolving';
      const enemy = b.enemy;
      event('blockClear', { source: 'enemy', target: 'enemy', amount: -enemy.block, total: 0 });
      enemy.block = 0;
      if (enemy.poison > 0) {
        const damage = enemy.poison;
        enemy.hp = Math.max(0, enemy.hp - damage);
        enemy.poison--;
        log(`${enemy.name}受到 ${damage} 点毒伤害（无视护盾），毒减至 ${enemy.poison}。`);
        event('poison', { target: 'enemy', amount: damage, damage, tick: true });
        if (enemy.hp <= 0) {
          winBattle();
          emit();
          return true;
        }
      }
      const intent = ENEMIES[enemy.id].intents[enemy.intentIndex];
      log(`${enemy.name}使用「${intent.name}」：${intent.text}。`);
      if (intent.clearMark) {
        log(`蜕鳞：清除 ${enemy.mark} 层标记。`);
        event('mark', { source: 'enemy', target: 'enemy', amount: -enemy.mark, total: 0 });
        enemy.mark = 0;
      }
      if (intent.block) {
        enemy.block += intent.block;
        log(`${enemy.name}获得 ${intent.block} 点护盾。`);
        event('block', { source: 'enemy', target: 'enemy', amount: intent.block, total: enemy.block });
      }
      for (let i = 0; i < (intent.hits || []).length; i++) {
        if (!playerHit(intent.hits[i], i)) { emit(); return true; }
      }
      if (intent.poison) {
        b.poison += intent.poison;
        log(`你获得 ${intent.poison} 层毒（共 ${b.poison} 层）。`);
        event('poison', { source: 'enemy', target: 'player', amount: intent.poison, total: b.poison });
      }
      enemy.intentIndex = (enemy.intentIndex + 1) % ENEMIES[enemy.id].intents.length;
      note('你的回合。先看敌人意图，再决定攻守。');
      startPlayerTurn();
      emit();
      return true;
    }
    function chooseReward(idOrNull) {
      if (state.screen !== 'reward' || !state.reward) return false;
      if (idOrNull !== null && !state.reward.cards.includes(idOrNull)) return false;
      if (idOrNull !== null) state.player.deck.push(makeCard(idOrNull));
      advance();
      emit();
      return true;
    }
    function buyCard(index) {
      if (state.screen !== 'shop' || !state.shop || !Number.isInteger(index)) return false;
      const item = state.shop.cards[index];
      if (!item || item.bought || state.player.gold < 35) return false;
      item.bought = true;
      state.player.gold -= 35;
      state.player.deck.push(makeCard(item.id));
      note(`花费 35 金币，购得「${CARDS[item.id].name}」。`);
      emit();
      return true;
    }
    function removeCard(uid) {
      if (state.screen !== 'shop' || !state.shop || state.shop.removed || state.player.gold < 40 || state.player.deck.length <= 5) return false;
      const index = state.player.deck.findIndex(card => card.uid === uid);
      if (index < 0) return false;
      const [card] = state.player.deck.splice(index, 1);
      state.player.gold -= 40;
      state.shop.removed = true;
      note(`花费 40 金币，永久移除本局「${CARDS[card.id].name}」的这个实例。`);
      emit();
      return true;
    }
    function leaveShop() {
      if (state.screen !== 'shop') return false;
      advance(); emit(); return true;
    }
    function rest(shouldHeal) {
      if (state.screen !== 'rest') return false;
      const amount = shouldHeal ? heal(18) : 0;
      advance();
      note(shouldHeal ? `休息结束，恢复 ${amount} 点生命。第 ${state.floor} 层已开放。` : `离开月庭。第 ${state.floor} 层已开放。`);
      emit();
      return true;
    }
    function fox(sign) {
      if (state.screen !== 'fox') return false;
      if (sign && (state.player.maxHp <= 8 || hasRelic('fox'))) return false;
      if (sign) {
        state.player.maxHp -= 8;
        state.player.hp = Math.min(state.player.hp, state.player.maxHp);
        state.player.relics.push('fox');
      }
      advance();
      note(sign ? '狐契已签：本局最大生命减少 8，获得一次免死。' : '你婉拒了交易，没有付出任何代价。');
      emit();
      return true;
    }

    function makeEvent() {
      const kind = rand(3), p = state.player;
      if (kind === 0) {
        const id = sample(REWARD_POOL.filter(id => CARDS[id].rarity === 'rare'), 1)[0];
        return { id: 'well', name: '倒映祈愿井', description: '井底的月亮映出一张陌生符纸。「丢下钱，你就能带走这份愿望。」', choices: [
          { label: `投入 18 金币 · 获得「${CARDS[id].name}」`, text: CARDS[id].text, disabled: p.gold < 18, effect: 'buy', price: 18, cardId: id },
          { label: '饮一口月水 · 恢复 6 生命', text: '免费，治疗不超过最大生命。', disabled: false, effect: 'heal', amount: 6 }
        ] };
      }
      if (kind === 1) {
        const pool = Object.keys(RELICS).filter(id => !['bell','fox'].includes(id) && !hasRelic(id));
        const relic = pool.length ? pool[rand(pool.length)] : null;
        return { id: 'shrine', name: '无面旧神龛', description: '无面的神像摊开掌心，指尖停着一点血色。「六滴心血，换一件旧物。」', choices: [
          { label: `失去 6 生命 · ${relic ? `获得「${RELICS[relic].name}」` : '获得 30 金币'}`, text: `${relic ? RELICS[relic].text : '普通奖励遗物已集齐。'}需要当前生命大于 6。`, disabled: p.hp <= 6, effect: 'offering', relic, amount: 6 },
          { label: '替神像拂尘 · 获得 10 金币', text: '不损失生命，也不获得遗物。', disabled: false, effect: 'gold', amount: 10 }
        ] };
      }
      const basic = p.deck.find(card => ['C01','C02'].includes(card.id));
      const id = sample(REWARD_POOL, 1)[0];
      return { id: 'memory', name: '卖梦人的摊位', description: '摊主从琉璃罐中拈起一片旧梦。「忘掉一招，轻装上楼；或买下别人的本领。」', choices: [
        { label: `卖掉${basic ? `一张「${CARDS[basic.id].name}」` : '基础牌'} · 获得 25 金币`, text: '永久删除指定的单张实例；牌组须至少保留 5 张。', disabled: !basic || p.deck.length <= 5, effect: 'sell', uid: basic?.uid, amount: 25 },
        p.gold >= 20 ? { label: `付 20 金币 · 获得「${CARDS[id].name}」`, text: CARDS[id].text, disabled: false, effect: 'buy', price: 20, cardId: id } :
          { label: '没有余钱 · 婉拒离开', text: '不支付金币，不改变牌组。', disabled: false, effect: 'leave' }
      ] };
    }
    function chooseEvent(index) {
      if (state.screen !== 'event' || !state.event || !Number.isInteger(index)) return false;
      const choice = state.event.choices[index], p = state.player;
      if (!choice || choice.disabled) return false;
      if (choice.effect === 'buy') {
        if (p.gold < choice.price) return false;
        p.gold -= choice.price; p.deck.push(makeCard(choice.cardId));
      } else if (choice.effect === 'heal') heal(choice.amount);
      else if (choice.effect === 'gold') p.gold += choice.amount;
      else if (choice.effect === 'offering') {
        if (p.hp <= choice.amount) return false;
        p.hp -= choice.amount;
        if (choice.relic && !hasRelic(choice.relic)) p.relics.push(choice.relic);
        else p.gold += 30;
      } else if (choice.effect === 'sell') {
        const i = p.deck.findIndex(card => card.uid === choice.uid);
        if (i < 0 || p.deck.length <= 5) return false;
        p.deck.splice(i, 1); p.gold += choice.amount;
      }
      const message = choice.label;
      advance(); note(`异闻结束：${message}。`); emit(); return true;
    }
    function getIntent() {
      const b = state.battle;
      return b ? ENEMIES[b.enemy.id].intents[b.enemy.intentIndex] : null;
    }

    state = freshState('title');
    return {
      get state() { return state; }, newRun, enterNode, playCard, endTurn, resolveEnemyTurn,
      chooseReward, buyCard, removeCard, leaveShop, rest, fox, chooseEvent, getAvailableNodes, getIntent
    };
  }

  const api = { CARDS, ENEMIES, RELICS, FLOORS, STARTERS, CARD_GROUPS, createGame };
  root.NightPact = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis === 'undefined' ? window : globalThis);
