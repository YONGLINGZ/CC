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
    C16: { name: '残月', cost: 2, text: '造成 16 点伤害；若结算前敌人带有标记，再抽 1 张牌，不消耗标记。', target: true, attack: true }
  };
  Object.values(CARDS).forEach(card => {
    card.attack = !!card.attack;
    card.exhaust = !!card.exhaust;
  });

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
    fox: { name: '狐契', text: '本局下一次受到致命伤害时，免死并恢复至 12 点生命（不超过最大生命），随后消失。' }
  };

  const FLOORS = [
    [{ type: 'fight', name: '纸灯长廊', description: '普通战斗 · 胜利获得 20 金币与选牌' }],
    [
      { type: 'fight', name: '回声暗巷', description: '普通战斗 · 20 金币与选牌' },
      { type: 'rest', name: '温泉月庭', description: '休息 · 恢复 18 点生命' }
    ],
    [
      { type: 'shop', name: '夜市珍阁', description: '商店 · 购牌 35 金币 / 删牌 40 金币' },
      { type: 'fox', name: '狐影朱亭', description: '狐妖交易 · 以 8 点生命上限换取一次免死' }
    ],
    [
      { type: 'fight', name: '百鬼回廊', description: '普通战斗 · 20 金币与选牌' },
      { type: 'elite', name: '夜叉守门', description: '精英战斗 · 35 金币、选牌与遗物' }
    ],
    [
      { type: 'rest', name: '栖月小筑', description: '休息 · 恢复 18 点生命' },
      { type: 'shop', name: '最后一盏灯', description: '商店 · 购牌 35 金币 / 删牌 40 金币' }
    ],
    [{ type: 'boss', name: '绛鳞之座', description: '最终战 · 蛇妖·绛鳞，生命 100' }]
  ];

  const REWARD_POOL = Object.keys(CARDS).filter(id => Number(id.slice(1)) >= 3);
  const ORDINARY = ['paper', 'lantern', 'ape', 'bone'];

  function createGame(options = {}) {
    const rng = typeof options.rng === 'function' ? options.rng : Math.random;
    const onChange = typeof options.onChange === 'function' ? options.onChange : () => {};
    let serial = 0;
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
    function freshState(screen) {
      serial = 0;
      return {
        screen,
        player: {
          hp: 60, maxHp: 60, gold: 60,
          deck: ['C01', 'C01', 'C01', 'C01', 'C02', 'C02', 'C02', 'C02', 'C03', 'C04'].map(makeCard),
          relics: ['bell']
        },
        floor: 1, history: [], battle: null, reward: null, shop: null,
        notice: '', result: null, stats: { battles: 0, cardsPlayed: 0 }
      };
    }
    function emit() { onChange(state); }
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
      return state.player.hp - before;
    }
    function clearCombatStatuses() {
      const b = state.battle;
      b.block = b.energy = b.poison = 0;
      b.enemy.block = b.enemy.mark = b.enemy.poison = 0;
      b.nextAttack = b.nextEnergy = b.nextDraw = 0;
      b.bellUsed = b.jadeUsed = false;
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
    }
    function loseLife(amount, reason) {
      const p = state.player;
      p.hp = Math.max(0, p.hp - Math.max(0, amount));
      log(`${reason}：失去 ${amount} 点生命（剩余 ${p.hp}）。`);
      if (p.hp > 0) return true;
      if (hasRelic('fox')) {
        p.relics.splice(p.relics.indexOf('fox'), 1);
        p.hp = Math.min(12, p.maxHp);
        log(`狐契触发：免于死亡，生命设为 ${p.hp}，狐契消失。`);
        note('狐契已替你付出一次死亡。');
        return true;
      }
      defeat();
      return false;
    }
    function playerHit(amount) {
      const b = state.battle;
      const absorbed = Math.min(b.block, amount);
      b.block -= absorbed;
      const damage = Math.max(0, amount - absorbed);
      log(`敌人攻击 ${amount}：护盾抵挡 ${absorbed}，生命伤害 ${damage}。`);
      return damage > 0 ? loseLife(damage, b.enemy.name) : true;
    }
    function gainBlock(amount, reason) {
      state.battle.block += amount;
      log(`${reason}：获得 ${amount} 点护盾（共 ${state.battle.block}）。`);
    }
    function addMark(amount) {
      const b = state.battle;
      const gained = Math.min(5 - b.enemy.mark, amount);
      b.enemy.mark += gained;
      log(`${b.enemy.name}获得 ${gained} 层标记（${b.enemy.mark}/5）。`);
      if (gained > 0 && hasRelic('bell') && !b.bellUsed) {
        b.bellUsed = true;
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
        }
        if (!b.draw.length) break;
        const card = b.draw.pop();
        if (b.hand.length >= 10) {
          b.discard.push(card);
          log(`手牌已达 10 张：溢出的「${CARDS[card.id].name}」进入弃牌堆。`);
          note('手牌上限 10 张，溢出的牌已弃置。');
        } else b.hand.push(card);
      }
    }
    function winBattle() {
      if (!liveBattle()) return;
      const b = state.battle;
      b.phase = 'ended';
      clearCombatStatuses();
      state.stats.battles++;
      log(`击败${b.enemy.name}！`);
      if (b.kind === 'boss') {
        completeNode();
        state.screen = 'victory';
        state.result = { won: true, floor: 6, enemy: b.enemy.name };
        note('绛鳞伏首，妖契裂开。你终于走出了百妖楼。');
        return;
      }
      let gold = b.kind === 'elite' ? 35 : 20;
      let relic = null;
      if (b.kind === 'elite') {
        const available = ['jade', 'moon'].filter(id => !hasRelic(id));
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
    function enemyHit(amount, killingHeal = 0) {
      const b = state.battle;
      const absorbed = Math.min(b.enemy.block, amount);
      b.enemy.block -= absorbed;
      const damage = Math.max(0, amount - absorbed);
      b.enemy.hp = Math.max(0, b.enemy.hp - damage);
      log(`对${b.enemy.name}造成 ${amount} 点伤害：护盾抵挡 ${absorbed}，生命伤害 ${damage}。`);
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
      b.block = 0;
      b.played = 0;
      b.bellUsed = false;
      b.jadeUsed = false;
      b.nextAttack = 0;
      log(`—— 玩家第 ${b.turn} 回合：旧护盾清空 ——`);
      if (b.poison > 0) {
        const poison = b.poison;
        if (!loseLife(poison, `毒 ${poison}（无视护盾）`)) return;
        b.poison = Math.max(0, b.poison - 1);
        log(`毒减至 ${b.poison} 层。`);
      }
      b.energy = 3 + b.nextEnergy;
      let draw = 5 + b.nextDraw;
      if (b.turn === 1 && hasRelic('moon')) {
        draw += 2;
        log('残月坠触发：首回合额外抽 2 张牌。');
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
        logs: [`进入第 ${state.floor} 层，与${def.name}交战。`]
      };
      state.screen = 'battle';
      state.reward = null;
      startPlayerTurn();
    }
    function completeNode() {
      if (!activeNode) return;
      state.history.push({ floor: state.floor, type: activeNode.type, name: activeNode.name });
      activeNode = null;
    }
    function advance() {
      completeNode();
      state.floor++;
      state.screen = 'map';
      state.reward = null;
      state.shop = null;
      note(`第 ${state.floor} 层已开放。每层只能选择一个去处。`);
    }

    function newRun() {
      state = freshState('map');
      activeNode = null;
      note('金铃轻响。选择第一层的节点，开始闯楼。');
      emit();
      return true;
    }
    function enterNode(type) {
      if (state.screen !== 'map') return false;
      const floor = FLOORS[state.floor - 1];
      const node = floor && floor.find(item => item.type === type);
      if (!node || state.history.some(item => item.floor === state.floor)) return false;
      activeNode = node;
      state.notice = '';
      if (type === 'fight' || type === 'elite' || type === 'boss') startBattle(type);
      else {
        state.screen = type;
        if (type === 'shop') {
          state.shop = { cards: sample(REWARD_POOL, 3).map(id => ({ id, bought: false })), removed: false };
        }
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
      state.notice = '';
      b.phase = 'resolving';
      b.energy -= def.cost;
      b.hand.splice(index, 1);
      b.resolving.push(card);
      const previousPlayed = b.played;
      b.played++;
      state.stats.cardsPlayed++;
      log(`打出「${def.name}」，消耗 ${def.cost} 灵力。`);
      let bonus = 0;
      if (def.attack) {
        bonus = b.nextAttack;
        b.nextAttack = 0;
        if (bonus) log(`候机触发：第一段伤害增加 ${bonus}。`);
      }
      switch (card.id) {
        case 'C01': enemyHit(6 + bonus); break;
        case 'C02': gainBlock(5, def.name); break;
        case 'C03': addMark(2); break;
        case 'C04': {
          const mark = b.enemy.mark;
          enemyHit(10 + 4 * mark + bonus);
          b.enemy.mark = 0;
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
        case 'C13': if (loseLife(3, '血契自损（无视护盾）')) drawCards(2); break;
        case 'C14': enemyHit(5 + bonus, 3); break;
        case 'C15': if (loseLife(1, '妖火符自损（无视护盾）')) enemyHit(9 + bonus); break;
        case 'C16': {
          const hadMark = b.enemy.mark > 0;
          enemyHit(16 + bonus);
          if (hadMark && liveBattle()) drawCards(1);
          break;
        }
      }
      // Keep the active card out of both draw/discard during all draw effects.
      b.resolving.splice(b.resolving.indexOf(card), 1);
      (def.exhaust ? b.exhaust : b.discard).push(card);
      if (liveBattle()) {
        if (hasRelic('jade') && b.played === 3 && !b.jadeUsed) {
          b.jadeUsed = true;
          b.energy++;
          log('磨爪玉触发：第 3 张牌结算后，获得 1 点灵力。');
        }
        b.phase = 'player';
      }
      emit();
      return true;
    }
    function endTurn() {
      const b = state.battle;
      if (state.screen !== 'battle' || !b || b.phase !== 'player') return false;
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
      b.phase = 'resolving';
      const enemy = b.enemy;
      enemy.block = 0;
      if (enemy.poison > 0) {
        const damage = enemy.poison;
        enemy.hp = Math.max(0, enemy.hp - damage);
        enemy.poison--;
        log(`${enemy.name}受到 ${damage} 点毒伤害（无视护盾），毒减至 ${enemy.poison}。`);
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
        enemy.mark = 0;
      }
      if (intent.block) {
        enemy.block += intent.block;
        log(`${enemy.name}获得 ${intent.block} 点护盾。`);
      }
      for (const amount of intent.hits || []) {
        if (!playerHit(amount)) { emit(); return true; }
      }
      if (intent.poison) {
        b.poison += intent.poison;
        log(`你获得 ${intent.poison} 层毒（共 ${b.poison} 层）。`);
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

    state = freshState('title');
    return {
      get state() { return state; }, newRun, enterNode, playCard, endTurn, resolveEnemyTurn,
      chooseReward, buyCard, removeCard, leaveShop, rest, fox
    };
  }

  const api = { CARDS, ENEMIES, RELICS, FLOORS, createGame };
  root.NightPact = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis === 'undefined' ? window : globalThis);
