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
    vial: { name: '回春露', text: '每场战斗胜利时恢复 8 点生命。' },
    bloodstone: { name: '朱砂心', text: '每个玩家回合首次因卡牌自损生命并存活后，获得 1 点灵力并抽 1 张牌。' },
    moonheart: { name: '月髓', text: '秘宝：每个玩家回合开始时额外获得 1 点灵力。' },
    mirror: { name: '照魂镜', text: '秘宝：每场战斗第一张攻击牌的第一段伤害增加 7。' },
    dream: { name: '梦匣', text: '秘宝：每场战斗第一回合额外获得 1 点灵力，并额外抽 2 张牌。' },
    godblood: { name: '无面神血', text: '秘宝：获得时最大生命永久增加 12，并恢复 12 点生命。' },
    ninelives: { name: '九命铃', text: '秘宝：每场战斗第一次受到致命伤害时，免死并恢复至 18 点生命；每场战斗触发一次。' }
  };
  const TREASURE_RELICS = ['moonheart', 'mirror', 'dream', 'godblood', 'ninelives'];

  const NODE_INFO = {
    fight: ['百鬼回廊','普通战斗 · 20 金币与三选一卡'],
    elite: ['夜叉守门','高风险 · 35 金币、稀有卡保底与遗物／秘宝二选一'],
    rest: ['栖月温泉','休息 · 恢复 18 点生命'],
    shop: ['夜市珍阁','商店 · 随机三张牌，每张 35 金币；删牌 40'],
    fox: ['狐影朱亭','最大生命减少 8 · 换一次免死'],
    event: ['异闻幽径','剧情奇遇 · 前情、抉择与强奖励'],
    boss: ['绛鳞之座','最终战 · 蛇妖·绛鳞，生命 100']
  };
  const MAP_BLUEPRINTS = [
    ['fight'], ['fight','event','fight'], ['fight','event','shop','elite'],
    ['fight','fox','event','elite'], ['fight','shop','rest','event'],
    ['fight','elite','shop','event'], ['fight','rest','elite'], ['boss']
  ];
  const FLOORS = MAP_BLUEPRINTS.map((types, floor) => types.map((type, lane) => ({
    id: `f${floor + 1}-${lane}`, type, name: NODE_INFO[type][0], description: NODE_INFO[type][1],
    floor: floor + 1, lane
  })));
  const OMENS = {
    fight: ['风里有纸甲摩擦的窸窣声', '暗处传来短促的呼吸', '墙后有什么在磨爪'],
    elite: ['沉得反常的妖气压住灯焰', '一道很重的脚步停在楼梯上', '门缝里渗出铁锈与香灰味'],
    rest: ['雾里浮着一点暖意', '远处有水声，像有人替你留着灯', '这一层安静得能听见心跳'],
    shop: ['有人拨弄算盘，也有人在数铜钱', '一缕货香混着旧纸味', '檐下挂着会自己响的铃串'],
    fox: ['一尾赤色影子从墙后掠过', '风里有一点甜腻的狐香', '有人隔着帘子问：今夜还赊账吗'],
    event: ['纸灯无风自转', '雾中传来半句没说完的话', '门牌上的字被谁故意擦掉了'],
    boss: ['楼顶的鳞片擦过屋瓦', '整座楼忽然安静下来', '金铃自己响了一声']
  };

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
      const map = FLOORS.map((row, floor) => {
        let types = row.map(node => node.type);
        if (floor > 0 && floor < FLOORS.length - 1) {
          types = shuffle(types);
          if (rand(3) === 0) {
            const fightIndex = types.indexOf('fight');
            if (fightIndex >= 0) types[fightIndex] = ['event', 'rest', 'shop', 'fox'][rand(4)];
          }
        }
        return types.map((type, lane) => ({
          id: `f${floor + 1}-${lane}`, type, floor: floor + 1, lane,
          name: NODE_INFO[type][0], description: NODE_INFO[type][1],
          omen: OMENS[type][rand(OMENS[type].length)], next: []
        }));
      });
      // Build a connected branching graph: every node offers two or three ways
      // forward, and cross-lane links keep later decisions from being locked to
      // the lane picked on the previous floor.
      for (let floor = 0; floor < map.length - 1; floor++) {
        const current = map[floor], next = map[floor + 1];
        for (const node of current) {
          const ranked = next.map(target => ({
            target, score: Math.abs(target.lane - node.lane) + rng() * 2.15
          })).sort((a, b) => a.score - b.score);
          const degree = floor === 0 ? next.length : Math.min(next.length, 2 + rand(2));
          node.next = ranked.slice(0, degree).map(item => item.target.id);
        }
        for (const target of next) {
          if (!current.some(node => node.next.includes(target.id))) {
            const source = current.slice().sort((a, b) =>
              Math.abs(a.lane - target.lane) - Math.abs(b.lane - target.lane))[0];
            source.next.push(target.id);
          }
        }
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
        floor: 1, history: [], seenEvents: [], battle: null, reward: null, shop: null, event: null,
        notice: '', result: null, rewardRerolls: 1,
        stats: { battles: 0, cardsPlayed: 0, eliteBattles: 0, maxCombo: 0, maxHit: 0 }
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
    function addRelic(id) {
      const p = state.player;
      if (!RELICS[id] || hasRelic(id)) return false;
      p.relics.push(id);
      if (id === 'godblood') {
        p.maxHp += 12;
        p.hp = Math.min(p.maxHp, p.hp + 12);
      }
      return true;
    }
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
      const b = state.battle;
      if (liveBattle() && hasRelic('ninelives') && !b.nineUsed) {
        b.nineUsed = true;
        p.hp = Math.min(18, p.maxHp);
        log(`九命铃触发：免于死亡，生命设为 ${p.hp}。本场战斗不再触发。`);
        note('九命铃替你挡下了这一夜。');
        event('relic', { relic: 'ninelives', amount: p.hp, name: RELICS.ninelives.name });
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
        drawCards(1);
        log('朱砂心触发：首次自损，获得 1 灵力并抽 1 张牌。');
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
      if (hasRelic('vial')) { heal(8, '回春露触发'); event('relic', { relic: 'vial', name: RELICS.vial.name, amount: 8 }); }
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
      let relicChoices = [];
      if (b.kind === 'elite') {
        const available = Object.keys(RELICS).filter(id => !['bell','fox'].includes(id) && !hasRelic(id));
        if (available.length) {
          const treasures = available.filter(id => TREASURE_RELICS.includes(id));
          if (state.stats.eliteBattles === 0 && treasures.length) {
            const guaranteed = sample(treasures, 1)[0];
            relicChoices = [guaranteed, ...sample(available.filter(id => id !== guaranteed), 1)];
          } else relicChoices = sample(available, 2);
          log(`精英珍藏已揭晓：请从${relicChoices.map(id => `「${RELICS[id].name}」`).join('／')}中选择一件。`);
        } else {
          gold += 20;
          log('奖励遗物已集齐，额外获得 20 金币。');
        }
        state.stats.eliteBattles++;
      }
      state.player.gold += gold;
      state.reward = { cards: rewardCards(b.kind), gold, relic: null, relicChoices,
        relicPending: relicChoices.length > 0, rerolled: false };
      state.screen = 'reward';
      note(`胜利：${gold} 金币已入账。${relicChoices.length ? '先选一件精英珍藏，再选择卡牌。' : '请选一张牌或跳过。'}${gold === 55 ? '遗物已集齐，包含额外 20 金币。' : ''}`);
    }
    function rewardCards(kind, previous = []) {
      const required = kind === 'elite'
        ? REWARD_POOL.filter(id => CARDS[id].rarity === 'rare')
        : REWARD_POOL.filter(id => CARDS[id].category === state.starter);
      let cards;
      if (required.length) {
        const first = sample(required, 1)[0];
        cards = [first, ...sample(REWARD_POOL.filter(id => id !== first), 2)];
      } else cards = sample(REWARD_POOL, 3);
      // Even a fixed RNG must visibly change an offer when the one-use redraw
      // is spent. Replacing only the final slot preserves the first-slot floor.
      if (previous.length && cards.every(id => previous.includes(id))) {
        const alternate = REWARD_POOL.filter(id => !previous.includes(id));
        cards[cards.length - 1] = alternate[rand(alternate.length)];
      }
      return cards;
    }
    // The killing heal is resolved before victory changes the screen.
    function enemyHit(amount, killingHeal = 0, alwaysHeal = 0, kind = 'card') {
      const b = state.battle;
      const absorbed = Math.min(b.enemy.block, amount);
      b.enemy.block -= absorbed;
      const damage = Math.max(0, amount - absorbed);
      if (kind === 'card') state.stats.maxHit = Math.max(state.stats.maxHit, amount);
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
      let turnEnergy = 3 + b.nextEnergy;
      let draw = 5 + b.nextDraw;
      if (hasRelic('moonheart')) {
        turnEnergy += 1;
        log('月髓触发：本回合额外获得 1 点灵力。');
      }
      if (b.turn === 1 && hasRelic('moon')) {
        draw += 2;
        log('残月坠触发：首回合额外抽 2 张牌。');
        event('relic', { relic: 'moon', name: RELICS.moon.name, amount: 2 });
      }
      if (b.turn === 1 && hasRelic('dream')) {
        turnEnergy += 1;
        draw += 2;
        log('梦匣触发：首回合额外获得 1 灵力、抽 2 张牌。');
        event('relic', { relic: 'dream', name: RELICS.dream.name, amount: 2 });
      }
      if (b.nextEnergy || b.nextDraw) log(`蓄爪触发：额外 ${b.nextEnergy} 灵力、${b.nextDraw} 张牌。`);
      b.nextEnergy = b.nextDraw = 0;
      b.energy = turnEnergy;
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
        mirrorUsed: false, nineUsed: false,
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
      state.stats.maxCombo = Math.max(state.stats.maxCombo, b.played);
      state.stats.cardsPlayed++;
      log(`打出「${def.name}」，消耗 ${def.cost} 灵力。`);
      event('card', { cardId: card.id, name: def.name, cost: def.cost });
      let bonus = 0;
      if (def.attack) {
        bonus = b.nextAttack + b.bloodPower;
        b.nextAttack = 0;
        if (hasRelic('mirror') && !b.mirrorUsed) {
          b.mirrorUsed = true;
          bonus += 7;
          log('照魂镜触发：本场首张攻击牌第一段伤害增加 7。');
          event('relic', { relic: 'mirror', name: RELICS.mirror.name, amount: 7 });
        }
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
      if (state.reward.relicPending) { note('请先选择一件精英珍藏。'); return false; }
      if (idOrNull !== null && !state.reward.cards.includes(idOrNull)) return false;
      if (idOrNull !== null) state.player.deck.push(makeCard(idOrNull));
      advance();
      emit();
      return true;
    }
    function chooseRelic(id) {
      const reward = state.reward;
      if (state.screen !== 'reward' || !reward || !reward.relicPending || !reward.relicChoices.includes(id)) return false;
      if (!addRelic(id)) return false;
      reward.relic = id;
      reward.relicPending = false;
      log(`获得精英珍藏「${RELICS[id].name}」。`);
      note(`已获得「${RELICS[id].name}」：${RELICS[id].text} 现在选一张卡牌或跳过。`);
      emit();
      return true;
    }
    function rerollReward() {
      const reward = state.reward;
      if (state.screen !== 'reward' || !reward || state.rewardRerolls <= 0 || reward.rerolled) return false;
      reward.cards = rewardCards(state.battle.kind, reward.cards);
      reward.rerolled = true;
      state.rewardRerolls--;
      note('本局唯一的免费换牌已使用。新候选已固定，精英珍藏不会重抽。');
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

    function chooseTreasure(preferred) {
      if (preferred && !hasRelic(preferred)) return preferred;
      const pool = TREASURE_RELICS.filter(id => !hasRelic(id));
      return pool.length ? pool[rand(pool.length)] : null;
    }
    function choiceAvailable(choice, p) {
      if ((choice.goldCost || 0) > p.gold) return false;
      if ((choice.hpCost || 0) > 0 && p.hp <= choice.hpCost) return false;
      if ((choice.maxHpCost || 0) > 0 && p.maxHp - choice.maxHpCost < 5) return false;
      if (choice.removeBasic && (p.deck.length <= 5 || !p.deck.some(card => ['C01','C02'].includes(card.id)))) return false;
      return true;
    }
    function finishChoices(choices, p) {
      const available = choices.map(choice => ({ ...choice,
        text: choice.maxHpCost ? `${choice.text} 最大生命须至少保留 5。` : choice.text,
        disabled: !choiceAvailable(choice, p) }));
      if (available.every(choice => choice.disabled)) available.push({
        label: '无力交易 · 安然离开', text: '不支付任何代价，也不获得奖励。', disabled: false,
        outcome: '你轻轻摇头，收好空空的袖袋。楼里的怪事没有追上来，只留下一盏微光，照着你继续上楼。'
      });
      return available;
    }
    function applyEventChoice(choice, p) {
      const received = [];
      if (choice.goldCost) {
        p.gold -= choice.goldCost;
        received.push(`金币 −${choice.goldCost}`);
      }
      if (choice.hpCost) {
        p.hp = Math.max(1, p.hp - choice.hpCost);
        received.push(`生命 −${choice.hpCost}`);
      }
      if (choice.maxHpCost) {
        p.maxHp = Math.max(5, p.maxHp - choice.maxHpCost);
        p.hp = Math.min(p.hp, p.maxHp);
        received.push(`最大生命 −${choice.maxHpCost}`);
      }
      if (choice.removeBasic) {
        const index = p.deck.findIndex(card => ['C01','C02'].includes(card.id));
        if (index >= 0) {
          const [card] = p.deck.splice(index, 1);
          received.push(`移除「${CARDS[card.id].name}」`);
        }
      }
      if (Object.prototype.hasOwnProperty.call(choice, 'relic')) {
        if (addRelic(choice.relic)) received.push(`秘宝「${RELICS[choice.relic].name}」`);
        else {
          const fallback = choice.fallbackGold || 60;
          p.gold += fallback;
          received.push(`秘宝已齐，改得 ${fallback} 金币`);
        }
      }
      for (const id of choice.cardIds || []) {
        p.deck.push(makeCard(id));
        received.push(`卡牌「${CARDS[id].name}」`);
      }
      if (choice.heal) {
        const before = p.hp;
        p.hp = Math.min(p.maxHp, p.hp + choice.heal);
        received.push(`生命 +${p.hp - before}`);
      }
      if (choice.goldGain) {
        p.gold += choice.goldGain;
        received.push(`金币 +${choice.goldGain}`);
      }
      return received;
    }
    function makeEvent() {
      const p = state.player;
      const rare = REWARD_POOL.filter(id => CARDS[id].rarity === 'rare');
      const rareCards = () => sample(rare, 2);
      const builders = {
        well() {
          const card = sample(rare, 1)[0];
          const relic = chooseTreasure('moonheart');
          return {
            id: 'well', name: '倒映祈愿井', glyph: '井', kicker: 'THE WELL THAT REMEMBERS / 井中旧月',
            whisper: '井水记得每一枚投入的愿望。',
            description: '水面映出的不是你的脸。它像一扇门，门后有人用你的声音说：再走近一点。',
            story: [
              '井沿结着薄霜。你俯身时，水里浮起的却是一扇从未见过的门；门后有人轻轻敲了三下，像在催你交出什么。',
              '井底那一轮月亮很圆，也很饿。它把你的倒影含在口中，等你先开口。'
            ],
            choices: finishChoices([
              { label: `投入 20 金币 · ${relic ? `捞起秘宝「${RELICS[relic].name}」` : '换得 40 金币'}`, text: relic ? RELICS[relic].text : '秘宝已集齐：支付 20，得到 40，净赚 20 金币。', goldCost: 20, relic, fallbackGold: 40,
                outcome: '金币沉下去时没有声音。一只湿冷的手把月白色的髓珠放进你掌心；再低头时，井底那张脸已经闭上了眼。' },
              { label: `以 6 点生命喂井 · 获得「${CARDS[card].name}」与 30 金币`, text: `${CARDS[card].text} 需要当前生命大于 6。`, hpCost: 6, cardIds: [card], goldGain: 30,
                outcome: '你把六滴血按进井沿。水面吐出一张湿淋淋的符纸，还有一小袋从未属于你的钱。井底传来很轻的咀嚼声。' },
              { label: '只饮一口井水 · 恢复 12 生命', text: '不取任何宝贝，也不惊动井底那个“你”。', heal: 12,
                outcome: '井水冷得像一场旧雪，伤口却在雪里慢慢合拢。你没有拿走任何东西，井底的人反而松了一口气。' }
            ], p)
          };
        },
        shrine() {
          const card = sample(rare, 1)[0], relic = chooseTreasure('godblood');
          return {
            id: 'shrine', name: '无面旧神龛', glyph: '龛', kicker: 'A GOD WITHOUT A FACE / 无面旧神',
            whisper: '祂没有脸，却记得你的名字。',
            description: '香灰里埋着几枚刻了你名字的旧钱。神像的掌心有一道新伤，正等着别的东西填满。',
            story: [
              '雨从神像空白的眼窝里流下来。它没有脸，却知道你从哪一层来；供桌上摆着六枚旧钱，每一枚都刻着你的名字。',
              '“拿走你想要的东西。”一个声音说，“只要留下一点，让我记得你曾经来过。”'
            ],
            choices: finishChoices([
              { label: `献上 8 生命与 15 金币 · 得「${CARDS[card].name}」与${relic ? `秘宝「${RELICS[relic].name}」` : '60 金币'}`, text: `${CARDS[card].text} ${relic ? RELICS[relic].text : '秘宝已集齐：支付 15，得到 60，净赚 45 金币。'}`, hpCost: 8, goldCost: 15, cardIds: [card], relic, fallbackGold: 60,
                outcome: '神像把血抹在空白的脸上，长出一双极淡的眼睛。你的胸口发热，像多了一颗不属于自己的心。' },
              { label: '撬开功德箱 · 获得 55 金币，最大生命 −6', text: '铜钱很多，神像也记得是谁拿的。需要最大生命大于 6。', maxHpCost: 6, goldGain: 55,
                outcome: '功德箱裂开，铜钱像雨水一样涌出来。你听见神像在背后轻轻记下一笔：下次，收的不只是命。' },
              { label: '把旧钱放回供桌 · 恢复 10 生命', text: '让这场雨停一会儿。', heal: 10,
                outcome: '旧钱落回铜盘，神像的呼吸慢了下来。你忽然想起，自己也曾被谁轻轻放过一次。' }
            ], p)
          };
        },
        dreamshop() {
          const relic = chooseTreasure('dream'), cards = rareCards();
          return {
            id: 'dreamshop', name: '卖梦人的摊位', glyph: '梦', kicker: 'DREAMS FOR SALE / 琉璃罐里的来生',
            whisper: '梦比命便宜，也比命记得久。',
            description: '摊主把一只琉璃罐推到你面前。罐中有一场没下完的雪，还有另一个你，正在牌桌边等你落子。',
            story: [
              '琉璃罐里沉着别人的一生：一场没下完的雪、一句没说完的话、一次没有回头的离开。摊主说，梦比命便宜，也比命记得久。',
              '“你可以买一个梦，也可以卖掉一点过去。”她把空罐摆正，“楼上的蛇不挑食，但挑梦。”'
            ],
            choices: finishChoices([
              { label: `付 25 金币 · ${relic ? `买下秘宝「${RELICS[relic].name}」` : '换得 60 金币'}`, text: relic ? RELICS[relic].text : '秘宝已集齐：支付 25，得到 60，净赚 35 金币。', goldCost: 25, relic, fallbackGold: 60,
                outcome: '你打开一只写着“如果那晚我没有上楼”的罐子。梦里多出一只手替你翻牌，醒来时指尖还带着琉璃的凉。' },
              { label: '卖掉一段旧习惯 · 移除一张基础牌，得 35 金币并恢复 8 生命', text: '牌组须至少保留 5 张。', removeBasic: true, goldGain: 35, heal: 8,
                outcome: '摊主从你手里抽走一张旧牌，像抽走一根早已长进肉里的刺。你忽然轻得有些不习惯。' },
              { label: `吞下无名梦 · 失去 10 生命，获得「${CARDS[cards[0]].name}」与「${CARDS[cards[1]].name}」`, text: '梦里没有回头路，醒来的掌心却会留下东西。', hpCost: 10, cardIds: cards,
                outcome: '你在梦里活了两种截然不同的人生。醒来时嘴角有血，掌心却多了两张陌生的契。摊主已经不在了，只剩空罐轻轻碰撞。' }
            ], p)
          };
        },
        theatre() {
          const mirror = chooseTreasure('mirror'), nine = chooseTreasure('ninelives');
          return {
            id: 'theatre', name: '纸灯戏台', glyph: '戏', kicker: 'A PLAY ABOUT YOUR DEATH / 今夜的死法',
            whisper: '台下没有观众，只有空椅在鼓掌。',
            description: '纸扎的戏台上，一只与你穿同样衣裳的猫妖正被蛇从背后咬住喉咙。戏还没有演完，你还可以改词。',
            story: [
              '纸扎的戏台在走廊尽头亮着。台上的猫妖与你穿同样的衣裳，正被一条蛇从背后咬住喉咙；台下没有观众，只有一排空椅在鼓掌。',
              '班主把一支蘸了朱砂的笔递给你：“放心，戏是假的。只是每次散场，总会少一个真的。”'
            ],
            choices: finishChoices([
              { label: `上台改戏 · 失去 8 生命，获得${mirror ? `秘宝「${RELICS[mirror].name}」` : '60 金币'}`, text: mirror ? RELICS[mirror].text : '秘宝已集齐，获得 60 金币。', hpCost: 8, relic: mirror, fallbackGold: 60,
                outcome: '你走上纸台，把戏本里的死亡改成一次反爪。纸猫妖看了你一眼，把一面小镜塞进你的袖口；镜里，蛇的倒影先流了血。' },
              { label: `买下戏班的九命灯 · 付 45 金币，获得${nine ? `秘宝「${RELICS[nine].name}」` : '60 金币'}`, text: nine ? RELICS[nine].text : '秘宝已集齐：支付 45，得到 60，净赚 15 金币。', goldCost: 45, relic: nine, fallbackGold: 60,
                outcome: '你买下戏班最后一盏灯。灯芯里缠着九根猫须，熄灭时，台上那只纸猫妖朝你弓了弓背。' },
              { label: '撕掉戏本 · 恢复 6 生命，获得 20 金币', text: '让今夜的死法留在纸里。', heal: 6, goldGain: 20,
                outcome: '你撕掉戏本，纸人像雪一样落下。散场后，你在空椅下捡到几枚还没被掌声吞掉的铜钱。' }
            ], p)
          };
        },
        umbrella() {
          const cards = rareCards(), relic = chooseTreasure('ninelives');
          return {
            id: 'umbrella', name: '雨夜借伞', glyph: '伞', kicker: 'A SHADOW FOR ONE NIGHT / 借影人',
            whisper: '她借的不是伞，是你还愿意相信的那一点黑。',
            description: '妇人举着半把伞，伞骨里空无一物。她说楼上的蛇最怕黑，而她已经很久没有影子了。',
            story: [
              '檐下雨声忽然停了。一名没有脸的妇人举着半把伞，问你能不能把影子借她一晚。',
              '“只要今晚。”她说，“明早我会把它还你。若不还，你也可以拿走我伞下的东西。”伞骨里蜷着两段不属于你的路。'
            ],
            choices: finishChoices([
              { label: `借出影子 · 最大生命 −6，获得「${CARDS[cards[0]].name}」「${CARDS[cards[1]].name}」与 35 金币`, text: '她拿走你的一小段黑，留下两段别人未走完的路。', maxHpCost: 6, cardIds: cards, goldGain: 35,
                outcome: '她把你的影子折好，藏进伞骨。作为交换，你得到两段别人没走完的路，以及一袋在雨里也不会湿的钱。' },
              { label: `陪她走到楼顶 · 失去 10 生命，获得${relic ? `秘宝「${RELICS[relic].name}」` : '40 金币'}`, text: relic ? RELICS[relic].text : '秘宝已集齐，获得 40 金币。', hpCost: 10, relic, fallbackGold: 40,
                outcome: '你替她撑伞走到楼梯尽头。她没有回头，只把伞柄塞进你手里；伞下多了一盏铃，铃舌是一小截蛇骨。' },
              { label: '把自己的伞留给她 · 恢复 10 生命', text: '不借影子，也不问她的名字。', heal: 10,
                outcome: '你把伞留在檐下。雨声重新落下时，那半把伞已经不见了，手心却暖了很久。' }
            ], p)
          };
        },
        pawnshop() {
          const card = sample(rare, 1)[0], relic = chooseTreasure('moonheart');
          return {
            id: 'pawnshop', name: '蛇鳞当铺', glyph: '鳞', kicker: 'REGRETS, PAWNED / 一片鳞，一段悔',
            whisper: '记忆是最不值钱的东西，除非有人愿意替你疼。',
            description: '柜台上摆满蛇鳞，每一片都映着一段悔意。掌柜用指甲敲了敲玻璃，问你想当掉哪一段。',
            story: [
              '柜台后的蛇影没有抬头。玻璃匣里码着数百片蛇鳞，每一片都映着一段悔意：没递出的信、没回头的夜、没救下的人。',
              '“记忆是最不值钱的东西。”掌柜说，“除非有人愿意替你疼。你可以当，也可以赎。”'
            ],
            choices: finishChoices([
              { label: '当掉一段记忆 · 获得 65 金币，最大生命 −5', text: '你会忘记自己为何上楼，但不会忘记怎么活下去。', maxHpCost: 5, goldGain: 65,
                outcome: '掌柜从你眉心揭下一层薄薄的旧影，像揭下一张用久了的符。金币沉进袖袋，你忽然想不起母亲的嗓音。' },
              { label: `付 40 金币 · ${relic ? `赎回秘宝「${RELICS[relic].name}」` : '换得 40 金币'}与「${CARDS[card].name}」`, text: relic ? RELICS[relic].text : '秘宝已集齐：支付 40，得到 40 金币与一张卡牌。', goldCost: 40, relic, cardIds: [card], fallbackGold: 40,
                outcome: '你赎回一片温热的旧鳞。鳞片贴在掌心时，一段不属于你的记忆从指缝里流过去，留下了一件宝贝。' },
              { label: `放走匣中一片蛇鳞 · 失去 6 生命，获得「${CARDS[card].name}」与 25 金币`, text: `${CARDS[card].text} 蛇鳞割手，但不会白割。`, hpCost: 6, cardIds: [card], goldGain: 25,
                outcome: '你撬开玻璃匣，那片鳞像活物一样卷住你的手指。掌柜没有拦你，只在账本上添了一行：欠蛇后一次。' }
            ], p)
          };
        }
      };
      const ids = Object.keys(builders);
      const unseen = ids.filter(id => !state.seenEvents.includes(id));
      const id = (unseen.length ? unseen : ids)[rand((unseen.length ? unseen : ids).length)];
      state.seenEvents.push(id);
      return builders[id]();
    }
    function chooseEvent(index) {
      if (state.screen !== 'event' || !state.event || state.event.resolved || !Number.isInteger(index)) return false;
      const choice = state.event.choices[index], p = state.player;
      if (!choice || choice.disabled || !choiceAvailable(choice, p)) return false;
      const received = applyEventChoice(choice, p);
      state.event.resolved = true;
      state.event.outcome = choice.outcome;
      state.event.received = received.length ? received.join(' · ') : '没有取走任何东西';
      state.event.choiceLabel = choice.label;
      note('异闻已了。看过这段结局，再决定是否继续上楼。');
      emit();
      return true;
    }
    function leaveEvent() {
      if (state.screen !== 'event' || !state.event || !state.event.resolved) return false;
      const name = state.event.name;
      advance();
      note(`离开「${name}」，第 ${state.floor} 层已开放。`);
      emit();
      return true;
    }
    function getIntent() {
      const b = state.battle;
      return b ? ENEMIES[b.enemy.id].intents[b.enemy.intentIndex] : null;
    }

    state = freshState('title');
    return {
      get state() { return state; }, newRun, enterNode, playCard, endTurn, resolveEnemyTurn,
      chooseReward, chooseRelic, rerollReward, buyCard, removeCard, leaveShop, rest, fox, chooseEvent, leaveEvent, getAvailableNodes, getIntent
    };
  }

  const api = { CARDS, ENEMIES, RELICS, TREASURE_RELICS, FLOORS, STARTERS, CARD_GROUPS, createGame };
  root.NightPact = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis === 'undefined' ? window : globalThis);
