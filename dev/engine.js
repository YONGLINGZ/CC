/* 百妖夜契 — deterministic, DOM-independent game rules. */
(function (root) {
  'use strict';
  const EXPANSION = root.NightExpansion || (typeof module !== 'undefined' && module.exports ? require('./expansion.js') : {});
  const EXPEDITION = root.NightExpedition || (typeof module !== 'undefined' && module.exports ? require('./expedition.js') : {});

  const CARDS = {
    C01: { name: '爪击', cost: 1, text: '对敌人造成 6 点伤害。', target: true, attack: true },
    C02: { name: '敛息', cost: 1, text: '获得 5 点护盾。', target: false },
    C03: { name: '窥隙', cost: 0, text: '使敌人获得 2 层标记。', target: true },
    C04: { name: '扑杀', cost: 2, text: '造成 10＋4×敌人当前标记层数的伤害，然后清除敌人全部标记。', target: true, attack: true },
    C05: { name: '连爪', cost: 1, text: '连续造成 3 次、每次 3 点伤害；若敌人仍存活且带有标记，再施加 1 层流血。', target: true, attack: true },
    C06: { name: '猫步', cost: 0, text: '获得 3 点护盾，抽 1 张牌。消耗。', target: false, exhaust: true },
    C07: { name: '流影', cost: 1, text: '获得 7 点护盾；若此前本回合已打出至少 2 张牌，再抽 1 张牌。', target: false },
    C08: { name: '戏鼠', cost: 1, text: '造成 4 点伤害；若敌人仍存活，施加 2 层标记与 2 层流血。', target: true, attack: true },
    C09: { name: '夜猎', cost: 1, text: '抽 2 张牌。', target: false },
    C10: { name: '候机', cost: 0, text: '本回合下一张攻击牌的第一段伤害增加 4。可叠加，触发后全部清除；回合结束也清除。', target: false },
    C11: { name: '蓄爪', cost: 1, text: '下个玩家回合额外获得 1 点灵力，并额外抽 1 张牌。可叠加，触发后清除。', target: false },
    C12: { name: '月下守', cost: 2, text: '获得 14 点护盾，抽 1 张牌。', target: false },
    C13: { name: '血契', cost: 0, text: '先失去 3 点生命，再抽 2 张牌。消耗。', target: false, exhaust: true },
    C14: { name: '噬魂', cost: 1, text: '造成 5 点伤害；若该次伤害击杀敌人，恢复 3 点生命。', target: true, attack: true },
    C15: { name: '妖火符', cost: 1, text: '先失去 1 点生命，再对敌人造成 9 点伤害。', target: true, attack: true },
    C16: { name: '残月', cost: 2, text: '造成 16 点伤害；若结算前敌人带有标记，再抽 1 张牌，不消耗标记。', target: true, attack: true },
    C17: { name: '金瞳', cost: 1, text: '施加 4 层标记，抽 1 张牌。', target: true },
    C18: { name: '追猎', cost: 1, text: '造成 5＋2×敌人标记层数的伤害，不消耗标记；若敌人仍存活且带有标记，施加 1 层流血。', target: true, attack: true },
    C19: { name: '缚影', cost: 1, text: '获得 8 点护盾，施加 1 层标记。', target: true },
    C20: { name: '铃音', cost: 0, text: '若敌人有标记，移除 1 层，获得 1 灵力并抽 1 张牌。消耗。', target: true, exhaust: true },
    C21: { name: '终夜', cost: 3, text: '造成 12＋6×标记层数＋2×流血层数的伤害，然后清除敌人全部标记与流血。', target: true, attack: true },
    C22: { name: '裂帛', cost: 1, text: '连续攻击 2 次，每次 4 伤害，再施加 1 层流血；此前本回合已打出至少 2 张牌时，每次伤害改为 6、流血改为 2 层。', target: true, attack: true },
    C23: { name: '逐影', cost: 0, text: '造成 3 点伤害，抽 1 张牌。消耗。', target: true, attack: true, exhaust: true },
    C24: { name: '狂爪', cost: 2, text: '连续攻击 4 次，每次 4 伤害；若此前本回合已打出至少 2 张牌，再攻击 1 次。', target: true, attack: true },
    C25: { name: '灵巧', cost: 0, text: '先失去 1 点生命，再获得 1 点灵力。消耗。', target: false, exhaust: true },
    C26: { name: '翻檐', cost: 1, text: '造成 4 点伤害，获得 4 点护盾，抽 1 张牌。', target: true, attack: true },
    C27: { name: '歃血', cost: 1, text: '先失去 4 点生命；本场战斗每张攻击牌的第一段伤害增加 2，可叠加。消耗。', target: false, exhaust: true },
    C28: { name: '血饮', cost: 2, text: '造成 10 点伤害，恢复 4＋敌人流血层数的生命（额外治疗最多 3）；击杀或被护盾阻挡仍治疗。敌人存活时再施加 1 层流血。', target: true, attack: true },
    C29: { name: '献寿', cost: 0, text: '先失去 5 点生命，再获得 2 点灵力。消耗。', target: false, exhaust: true },
    C30: { name: '残心', cost: 1, text: '造成 8 点伤害；若当前生命不高于最大生命的一半，改为 16 点，并在敌人存活时施加 2 层流血。', target: true, attack: true },
    C31: { name: '借命', cost: 1, text: '先失去 2 点生命，再获得 12 点护盾。', target: false },
    C32: { name: '绕指柔', cost: 0, text: '获得 3 点护盾；若此前本回合已打出至少 2 张牌，改为 6 点。消耗。', target: false, exhaust: true },
    C33: { name: '逆鳞', cost: 1, text: '获得 6 点护盾；本轮敌人每段攻击被护盾抵挡时，反击 3 点伤害。反击可叠加，到下个玩家回合清除。', target: false },
    C34: { name: '护心', cost: 2, text: '获得 18 点护盾，移除自己 2 层毒。', target: false },
    C35: { name: '盾返', cost: 1, text: '造成 4＋当前护盾的伤害（护盾贡献上限 16），不消耗护盾。', target: true, attack: true },
    C36: { name: '归息', cost: 1, text: '恢复 4 点生命。消耗。', target: false, exhaust: true }
  };
  Object.assign(CARDS, {
    S01: { name: '霜锋', cost: 1, text: '造成 6 点伤害；若敌人仍存活，获得 1 层剑意，且敌人已有霜寒时再施加 1 层霜寒。', target: true, attack: true },
    S02: { name: '凝霜', cost: 1, text: '获得 6 点护盾，使敌人获得 1 层霜寒。', target: true },
    S03: { name: '听雪', cost: 0, text: '获得 2 层剑意。剑意上限 8，跨回合保留。', target: false },
    S04: { name: '断流', cost: 2, text: '消耗全部剑意，造成 10＋3×消耗层数的伤害；敌人仍存活且霜寒至少 5 层时，抽 1 张牌。', target: true, attack: true },
    S05: { name: '寒芒', cost: 1, text: '造成 4 点伤害；若敌人仍存活，使其获得 2 层霜寒。', target: true, attack: true },
    S06: { name: '踏雪', cost: 0, text: '获得 3 点护盾，抽 1 张牌。消耗。', target: false, exhaust: true },
    S07: { name: '冰镜', cost: 1, text: '获得 7 点护盾；若敌人已有霜寒，再抽 1 张牌。', target: false },
    S08: { name: '三叠泉', cost: 1, text: '连续攻击 3 次，每次 3 点伤害；若结算前剑意至少 3 层，每次改为 4 点。不消耗剑意。敌人存活且已有霜寒时，再施加 1 层霜寒。', target: true, attack: true },
    S09: { name: '澄心', cost: 1, text: '抽 2 张牌。', target: false },
    S10: { name: '回锋', cost: 0, text: '若剑意至少 2 层，消耗 2 层剑意，获得 1 灵力并抽 1 张牌；不足时无收益。消耗。', target: false, exhaust: true },
    S11: { name: '藏剑', cost: 1, text: '下个玩家回合额外获得 1 灵力，并额外抽 1 张牌。可叠加。', target: false },
    S12: { name: '霜天壁', cost: 2, text: '获得 14 点护盾，使敌人获得 2 层霜寒。', target: true },
    S13: { name: '以血淬刃', cost: 0, text: '先失去 3 点生命，再抽 2 张牌并获得 1 层剑意。消耗。', target: false, exhaust: true },
    S14: { name: '剑鸣', cost: 1, text: '造成 5 点伤害；若敌人仍存活，获得 2 层剑意，敌人霜寒至少 5 层时改为 3 层。', target: true, attack: true },
    S15: { name: '碎霜', cost: 2, text: '移除敌人全部霜寒，造成 12＋2×移除层数的伤害；若敌人仍存活，获得等量剑意。', target: true, attack: true },
    S16: { name: '万川归寂', cost: 3, text: '消耗全部剑意，造成 16＋4×消耗层数的伤害；若敌人仍存活，使其获得 3 层霜寒。', target: true, attack: true }
  });
  Object.assign(CARDS, EXPANSION.CARDS || {});
  Object.values(CARDS).forEach(card => {
    card.attack = !!card.attack;
    card.exhaust = !!card.exhaust;
  });
  const CARD_GROUPS = {
    mark: ['C03','C04','C08','C16','C17','C18','C19','C20','C21'],
    combo: ['C05','C06','C07','C09','C10','C11','C22','C23','C24','C25','C26'],
    blood: ['C13','C14','C15','C27','C28','C29','C30','C31'],
    guard: ['C02','C12','C32','C33','C34','C35','C36'],
    blade: ['S01','S03','S04','S08','S10','S11','S13','S14','S16'],
    ice: ['S02','S05','S06','S07','S09','S12','S15']
  };
  for (const [category, ids] of Object.entries(CARD_GROUPS)) for (const id of ids) CARDS[id].category = category;
  CARDS.C01.category = 'basic';
  for (const [id, card] of Object.entries(CARDS)) {
    card.character = id.startsWith('F') ? 'sovereign' : /^[SD]/.test(id) ? 'sword' : 'assassin';
    card.rarity = card.rarity || (['C21','C24','C27','C28','C33','C34','S15','S16'].includes(id) ? 'rare' : (id.startsWith('S') ? ['S04','S08','S10','S11','S12','S13','S14'].includes(id) : Number(id.slice(1)) > 16) ? 'uncommon' : 'common');
  }
  const CLASSIC = ['C01','C01','C01','C01','C02','C02','C02','C02','C03','C04'];
  const STARTERS = {
    mark: { name: '金瞳猎印', description: '窥隙叠印 → 追猎压血 → 扑杀收割。以标记换取爆发。', cards: ['C01','C01','C01','C02','C02','C02','C03','C04','C17','C18'] },
    combo: { name: '月影连爪', description: '猫步与窥隙穿插，第三张触发裂帛连段；快速连续出牌。', cards: ['C01','C01','C01','C02','C02','C02','C03','C04','C06','C22'] },
    sword: { character: 'sword', name: '霜华剑道', description: '霜寒跨回合保留，霜锋追寒、剑意收束；五层霜寒压低敌人杀势，十层有机会封住整次行动。', cards: ['S01','S01','S01','S01','S02','S02','S02','S02','S03','S04'] },
    blood: { name: '赤契噬魂', description: '歃血付出生命，换整场攻击增伤；血饮边进攻边疗伤。', cards: ['C01','C01','C01','C02','C02','C02','C03','C04','C27','C28'] }
  };

  Object.assign(STARTERS, EXPANSION.STARTERS || (EXPANSION.STARTER ? {sovereign: EXPANSION.STARTER} : {}));
  for (const starter of Object.values(STARTERS)) starter.character = starter.character || 'assassin';
  const CHARACTERS = {
    assassin: { id: 'assassin', name: '夜铃', profession: '影契刺客', portrait: 'cat', adult: true,
      description: '夜契盟的成年猫妖，善于窥见破绽、穿插连击，以血契换取致命的一击。她受雇寻找玄烬教遗失的契器。',
      quote: '“别急。要害总会露出来。”', accent: '#d4ac72', starters: ['mark','combo','blood'] },
    sword: { id: 'sword', name: '沈霜白', profession: '霜华剑修', portrait: 'sword', adult: true,
      description: '太微剑宗的成年女修。寡言清冷，剑术卓绝；以冰霜封住杀势，再以无声一剑决胜。奉命入域，查明失踪同门的下落。',
      quote: '“跟紧。不要回头。”', accent: '#a6dce9', starters: ['sword'] }
  };
  Object.assign(CHARACTERS, EXPANSION.CHARACTERS || (EXPANSION.CHARACTER ? {sovereign: EXPANSION.CHARACTER} : {}));
  const FACTIONS = {
    taiwei: { name: '太微剑宗', motive: '探明失踪同门与反噬边界，阻止灾变外溢。' },
    cult: { name: '玄烬残众', motive: '收回实验残页，掩盖归墟引灵仪失控的证据。' },
    guild: { name: '千灯商盟', motive: '收购奇物与情报，抢占无人知晓的代价。' },
    wanderers: { name: '散修探客', motive: '有人救人，有人寻宝，也有人只等别人先死。' }
  };
  const REGIONS = [
    { id: 'fog_gate', name: '雾锁山门', subtitle: '第一幕 · 雾外来客', stages: [1,10], description: '封域边缘尚留着旧山门。各宗弟子从这里入雾，报出的名字未必都是真的。穿过山门，才能抵达断桥诸营。', palette: { sky: '#15232b', ground: '#49626a', accent: '#abd9d1' } },
    { id: 'broken_camp', name: '断桥诸营', subtitle: '第二幕 · 灯下故人', stages: [11,20], description: '断桥两侧，药香、商灯和暗哨混在一起。先前遇过的人已经走到这里；一句承诺，也许比一袋金币更重。', palette: { sky: '#252019', ground: '#6c5342', accent: '#e4b56e' } },
    { id: 'ritual_core', name: '逆仪腹地', subtitle: '第三幕 · 因果入井', stages: [21,30], description: '归墟引灵仪的废墟近在眼前。雾中没有宗门律令，只有一路带来的旧恩、旧怨，以及仍未出鞘的刀。', palette: { sky: '#221728', ground: '#4c3c61', accent: '#c5a1e4' } }
  ];
  const NPCS = {
    liu: { id: 'liu', name: '柳照青', faction: '丹霞谷', portrait: 'liu', adult: true, description: '' },
    ji: { id: 'ji', name: '季临川', faction: '太微剑宗外门', portrait: 'ji', adult: true, description: '' },
    wen: { id: 'wen', name: '闻人烛', faction: '玄烬旧徒', portrait: 'wen', adult: true, description: '' }
  };
  const CHAIN_EVENT_IDS = ['liu_first','liu_return','liu_final','ji_first','ji_return','ji_final','wen_first','wen_return','wen_final'];
  const EVENT_IDS = ['well','shrine','dreamshop','theatre','umbrella','pawnshop','riftwatch','supply','cultlab','swordgrave','pilgrims','prisoner','echo','broker', ...CHAIN_EVENT_IDS, 'sect_duel','herb_caravan','relic_dispute','night_watch'];

  const ENEMIES = {
    paper: { name: '纸人', hp: 26, intents: [
      { name: '纸刃', text: '攻击 6', hits: [6] },
      { name: '剪影', text: '攻击 8', hits: [8] }
    ] },
    lantern: { name: '灯鬼', hp: 28, intents: [
      { name: '灯罩', text: '获得护盾 6', block: 6 },
      { name: '烛焰', text: '攻击 9，再施加 1 层毒', hits: [9], poison:1 }
    ] },
    ape: { name: '山魈', hp: 32, intents: [
      { name: '乱爪', text: '连击 3×3', hits: [3, 3, 3] },
      { name: '山崩', text: '攻击 10，下个玩家回合少抽 1 张牌', hits: [10], drawPenalty:1 }
    ] },
    bone: { name: '白骨侍', hp: 30, intents: [
      { name: '骨刃', text: '攻击 7', hits: [7] },
      { name: '骨甲突刺', text: '获得护盾 4，然后攻击 6，架势反击 2', block: 4, hits: [6], counter:2 }
    ] },
    yaksha: { name: '精英·夜叉', rank:'elite', hp: 62, intents: [
      { name: '破阵', text: '攻击 12', hits: [12] },
      { name: '夜甲', text: '清除全部霜寒与流血，获得护盾 10，架势反击 2', clearChill:true,clearBleed:true,block:10,counter:2 },
      { name: '镇魂', text: '攻击 16，下个玩家回合灵力减少 1', hits:[16],energyPenalty:1 }
    ] },
    raider: { name: '来客', hp: 42, intents: [
      { name: '试探剑', text: '攻击 7', hits: [7] },
      { name: '封路', text: '获得护盾 5，然后攻击 6，架势反击 2', block:5,hits:[6],counter:2 },
      { name: '夺命连斩', text: '连续攻击 2 次，每次 6', hits: [6,6] }
    ] },
    snake: { name: '蛇妖·绛鳞', rank:'boss', hp: 100, intents: [
      { name: '鳞刃', text: '攻击 10', hits: [10] },
      { name: '蛇息', text: '先攻击 6，再施加 3 层毒', hits: [6], poison: 3 },
      { name: '蜕鳞', text: '清除全部标记、霜寒与流血，再获得护盾 10', clearMark:true,clearChill:true,clearBleed:true,block:10 },
      { name: '绞缠', text: '连续攻击 3 次，每次 5', hits: [5, 5, 5] }
    ] }
  };

  const RELICS = {
    frostseal: { name: '霜魄剑穗', text: '剑修初始遗物：每个玩家回合第一次实际增加敌人霜寒时，获得 1 层剑意。霜寒上限 10，剑意上限 8。' },
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
  Object.assign(ENEMIES, EXPANSION.ENEMIES || {});
  Object.assign(RELICS, EXPANSION.RELICS || {});
  const WEAPONS = EXPANSION.WEAPONS || {};
  const ENVIRONMENTS = EXPANSION.ENVIRONMENTS || {};
  for (const id of EXPANSION.EVENT_IDS || []) if (!EVENT_IDS.includes(id)) EVENT_IDS.push(id);
  const TREASURE_RELICS = ['moonheart', 'mirror', 'dream', 'godblood', 'ninelives'];

  const NODE_INFO = {
    fight: ['侵蚀遗径','普通战斗 · 20 金币与本职业三选一卡'],
    elite: ['禁域镇守','高风险 · 35 金币、稀有卡保底与珍藏二选一'],
    rest: ['避瘴火塘','休息 · 恢复 18 点生命'],
    shop: ['千灯补给站','商店 · 本职业卡牌 35 金币；删牌 40'],
    fox: ['狐影密约','最大生命减少 8 · 换一次免死'],
    event: ['封域异闻','剧情奇遇 · 各方势力、明确代价与未知机缘'],
    cave: ['未知洞府','探宝 · 可能发现草药、丹药、遗宝，也可能惊动守藏者'],
    boss: ['逆仪观测井','受侵蚀看守 · 蛇妖绛鳞，生命 100']
  };
  const ROUTE_NAMES = ['松门曲径','沉钟岔道','断碑回廊','乌灯古道','落霞别径','枯河石阶','照影荒庭','折柳旧路','长风栈桥','夜雨碑林','苍苔迷渡','流火废苑','月隙盘山','飞霜残驿','空响祭道','无字长廊','回灯密径','横雾孤城','青绦山隘','藏星回川'];
  const ROUTE_TEMPLATES = ROUTE_NAMES.map((name,index)=>({
    id:`route-${String(index+1).padStart(2,'0')}`, name,
    widths:[1,4,6,3,7,4,6,4,6,1].map((width,floor)=>floor>0&&floor<6?width+((index>>(floor-1))&1):width),
    weave:index%4, bias:(index%5-2)*.026
  }));
  // Every chapter has ten decisions and an independent forty-plus-node map.
  const FLOORS = REGIONS.flatMap((region,chapter)=>ROUTE_TEMPLATES[0].widths.map((width,local)=>Array.from({length:width},(_,lane)=>{
    const floor=chapter*10+local+1,type=local===9?'boss':local===0?'fight':local===2?'event':['rest','shop','event','fight'][lane%4];
    return {id:`f${floor}-${lane}`,type,name:NODE_INFO[type][0],description:NODE_INFO[type][1],floor,lane,regionIndex:chapter};
  })));
  const OMENS = {
    fight: ['风里有纸甲摩擦的窸窣声', '暗处传来短促的呼吸', '墙后有什么在磨爪'],
    elite: ['沉得反常的妖气压住灯焰', '一道很重的脚步停在遗径上', '门缝里渗出铁锈与香灰味'],
    rest: ['雾里浮着一点暖意', '远处有水声，像有人替你留着灯', '这一层安静得能听见心跳'],
    shop: ['有人拨弄算盘，也有人在数铜钱', '一缕货香混着旧纸味', '檐下挂着会自己响的铃串'],
    fox: ['一尾赤色影子从墙后掠过', '风里有一点甜腻的狐香', '有人隔着帘子问：今夜还赊账吗'],
    event: ['纸灯无风自转', '雾中传来半句没说完的话', '门牌上的字被谁故意擦掉了'],
    cave: ['石门半掩，缝隙里透出微光', '青苔下有丹香，也有脚步声', '断裂的禁制后传来空旷回声'],
    boss: ['观测井的鳞片擦过屋瓦', '整片封域忽然安静下来', '金铃自己响了一声']
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
    const environmentEnabled = options.environment !== false;
    let profile = normalProfile(options.profile);
    function normalProfile(value) { return { version: 1, unlocks: value && Array.isArray(value.unlocks) && value.unlocks.includes('feiye') ? ['feiye'] : [] }; }
    function getProfile() { return {version:1,unlocks:profile.unlocks.slice()}; }
    function importProfile(value) {
      try { if (typeof value === 'string') value=JSON.parse(value); } catch (_) { return false; }
      if (!value || value.version !== 1 || !Array.isArray(value.unlocks) || value.unlocks.some(id=>id!=='feiye')) return false;
      profile=normalProfile(value); if(typeof options.onProfileChange==='function')options.onProfileChange(getProfile()); emit(); return true;
    }

    function configureSovereignMap(map) {
      for (const [floor,id] of [[3,'sovereign_wake'],[13,'sovereign_recall'],[23,'sovereign_memory']]) for(const n of map[floor-1]) {
        n.type='event';n.storyId=id;n.npc=null;n.name='旧声回返';n.description='一缕似曾相识的气息，从雾里传来。';
      }
      for(const [floor,enemyId,name]of [[10,'feiye_echo','井水照影'],[20,'retainer','故人守路'],[26,'heart','心海无灯'],[30,'snake_ascended','逆仪深处']])for(const n of map[floor-1]) {
        n.type=floor%10===0?'boss':'fight';delete n.storyId;n.encounter={enemyId,name:ENEMIES[enemyId]?.name,kind:n.type};n.name=name;n.description='这段路上，有什么在等你。';
      }
    }
    function getEnvironment() {
      const index=state?.journey?.regionIndex||0,id=REGIONS[index].id;
      return {...(ENVIRONMENTS[id]||{}),id,regionIndex:index,enabled:environmentEnabled};
    }
    function getAffliction() {
      const a=state.player.affliction;
      return {...a,suppressed:a.suppressed||0,name:a.revealed?'缠脉毒':'未察觉的异样',text:!a.active?'未受缠脉毒影响。':a.revealed?`持续缠脉毒：进入节点与玩家回合开始时失去 1 生命。${a.suppressed>0?'药力正暂时压住毒性。':''}普通治疗不会解毒；火塘静息或商店抑毒散可暂时压制，也可寻医根治。`:'伤口深处尚有一丝陌生的寒意。'};
    }
    function tickAffliction(trigger) {
      const a=state.player.affliction;
      if(!a.active)return true;
      if(!a.revealed){
        a.revealed=true;
        recordJourney(null,'缠脉毒发作','掌心伤口渗出黑线，寒意沿着经脉游走。火塘静息与抑毒散可暂压毒性，毒根仍须另寻药方。','warning');
        note('掌心黑线沿经脉游走，寒意侵骨。');
      }
      a.ticks++;
      if(a.suppressed>0){
        a.suppressed--;
        if(liveBattle()){log('药力暂时压住了缠脉毒。');event('afflictionSuppressed',{name:'缠脉毒',amount:0,remaining:a.suppressed,trigger});}
        return true;
      }
      if(liveBattle())event('affliction',{name:'缠脉毒',amount:1,damage:1,trigger});
      return loseLife(1,`缠脉毒（${trigger==='node'?'踏入节点':'回合开始'}，无视护盾）`);
    }
    function cureAffliction() {
      const a=state.player.affliction;
      if(!a.active)return false;
      a.active=false;a.revealed=true;a.suppressed=0;
      recordJourney(null,'毒脉已清','缠脉毒已经根除，今后的节点与回合不再因此失去生命。','good');
      return true;
    }
    function buyAntidote() {
      if(state.screen!=='shop'||!state.shop||state.shop.antidoteBought||!state.player.affliction.active||state.player.gold<30)return false;
      state.player.gold-=30;state.shop.antidoteBought=true;
      const amount=heal(6);state.player.affliction.suppressed=Math.max(6,state.player.affliction.suppressed||0);
      note(`花费 30 金币服下抑毒散，恢复 ${amount} 生命，毒性暂缓。`);emit();return true;
    }
    function getCorruptionStatus() {
      const p=state.player,path=p.path,protectedByJade=p.questItems.includes('clearheart_jade');
      return {...path,protected:protectedByJade,threshold:6,item:'clearheart_jade',stage:path.fallen?'fallen':path.learned||path.corruption?'tempted':'normal',label:path.fallen?'霜心异变':protectedByJade?'清心玉护持':path.learned?'气息有异':'剑心澄静',text:path.fallen?'因气息逆转，部分旧有功法难以运转，魔道招式仍顺手。':protectedByJade?'清心玉的凉意护住灵台，杂念渐静。':path.learned||path.corruption?'一缕陌生的气息随运功而起。':'心念沉静，剑息如常。'};
    }
    function useDemonicCard(id) {
      const p=state.player,path=p.path;path.learned=true;path.uses++;state.stats.demonicUses++;
      path.protected=p.questItems.includes('clearheart_jade');
      if(!path.protected)path.corruption++;
      if(!path.fallen&&path.corruption>=6&&!path.protected){
        path.fallen=true;
        recordJourney(null,'霜心异变','寒息骤然逆转，剑上霜色沉入暗红。','warning');
        note('寒息骤然逆转，剑上霜色沉入暗红。');
        event('fallen',{name:'霜心入魔',total:path.corruption});
      }else event('corruption',{cardId:id,amount:path.protected?0:1,total:path.corruption,protected:path.protected});
    }
    function getEffectiveCard(id) {
      const card=CARDS[id];if(!card)return null;
      const fallenPenalty=id.startsWith('S')&&state.player.path.fallen;
      const values={S01:{damage:6},S02:{block:6},S04:{damage:10},S05:{damage:4},S06:{block:3},S07:{block:7},S08:{damage:3},S12:{block:14},S14:{damage:5},S15:{damage:12},S16:{damage:16},D01:{damage:4,heal:6},D02:{damage:8,heal:3},D03:{damage:16,heal:5},D04:{block:12},D06:{damage:26,heal:6}};
      const value={...(values[id]||{})};if(fallenPenalty)for(const key of ['damage','block'])if(value[key]!=null)value[key]=Math.floor(value[key]/2);
      const altered={
        S01:'造成 3 点伤害；若敌人仍存活，获得 1 层剑意，且敌人已有霜寒时再施加 1 层霜寒。',S02:'获得 3 点护盾，使敌人获得 1 层霜寒。',
        S04:'消耗全部剑意，造成 5＋⌊3×消耗层数÷2⌋ 点伤害；敌人仍存活且霜寒至少 5 层时，抽 1 张牌。',S05:'造成 2 点伤害；若敌人仍存活，使其获得 2 层霜寒。',
        S06:'获得 1 点护盾，抽 1 张牌。消耗。',S07:'获得 3 点护盾；若敌人已有霜寒，再抽 1 张牌。',
        S08:'连续攻击 3 次，每次 1 点伤害；若结算前剑意至少 3 层，每次改为 2 点。不消耗剑意。敌人存活且已有霜寒时，再施加 1 层霜寒。',
        S12:'获得 7 点护盾，使敌人获得 2 层霜寒。',S14:'造成 2 点伤害；若敌人仍存活，获得 2 层剑意，敌人霜寒至少 5 层时改为 3 层。',
        S15:'移除敌人全部霜寒，造成 6＋移除层数的伤害；若敌人仍存活，获得等量剑意。',
        S16:'消耗全部剑意，造成 8＋2×消耗层数的伤害；若敌人仍存活，使其获得 3 层霜寒。'
      };
      return {...card,...value,id,fallenPenalty,attackMultiplier:fallenPenalty?.5:1,blockMultiplier:fallenPenalty?.5:1,text:fallenPenalty&&altered[id]?altered[id]:card.text};
    }
    function getWeaponStatus() {
      const p=state.player,id=p.equippedWeapon,w=WEAPONS[id]||{},requiredLevel=w.requiredLevel||w.level||1;
      const controlled=p.level>=requiredLevel;
      const cycle=state.battle?.turn ? (state.battle.turn-1)%3 : 0;
      const omen=controlled||id!=='divine'?'': ['本回合灵力 −1','本回合失去 3 生命','本回合敌人护盾 +6'][cycle];
      return {...w,id,level:p.level,requiredLevel,controlled,omen,text:w.text||''};
    }
    function equipWeapon(id) {
      if(state.screen==='event'&&!state.event?.resolved)return false;
      if(!['map','arrival','rest','shop','event','threshold'].includes(state.screen)||!state.player.weaponInventory.includes(id)||!WEAPONS[id])return false;
      if(id!=='divine'&&state.player.level<(WEAPONS[id].requiredLevel||1)){note('灵识尚不足以驾驭这柄剑。');emit();return false;}
      state.player.equippedWeapon=id;note(`已装备「${WEAPONS[id].name}」。`);emit();return true;
    }
    function buyWeapon(index) {
      if(state.screen!=='shop'||!Number.isInteger(index))return false;
      const item=state.shop?.weapons?.[index],p=state.player;
      if(!item||item.bought||p.gold<item.price||p.weaponInventory.includes(item.id))return false;
      item.bought=true;p.gold-=item.price;p.weaponInventory.push(item.id);note(`购得「${WEAPONS[item.id].name}」，可在行囊中装备。`);emit();return true;
    }
    function addSoul(amount,reason='魂息') {
      if(!liveBattle())return 0;const b=state.battle,before=b.soul||0;b.soul=Math.max(0,Math.min(6,before+amount));
      if(b.soul!==before){log(`${reason}：魂息 ${b.soul-before>0?'+':''}${b.soul-before}，当前${b.soul}/6。`);event('soul',{amount:b.soul-before,total:b.soul,reason});}
      return b.soul-before;
    }
    function consumeSoul() {const amount=state.battle.soul||0;addSoul(-amount,'魂息归潮');return amount;}
    function awardExperience(kind) {
      const p=state.player,gained=kind==='elite'?2:['boss','hidden'].includes(kind)?3:1,before=p.level;
      p.xp+=gained;p.level=Math.min(6,1+Math.floor(p.xp/2));
      log(`历练 +${gained}；修为 ${p.level}。`);
      if(p.level>before)event('level',{amount:p.level-before,total:p.level,name:'修为提升'});
    }
    function canMeetHidden() {const f=state.journey.flags;return state.character!=='sovereign'&&f.bellEcho&&f.ritualName&&f.emptyVow;}
    function startHiddenBoss() {
      if(state.screen!=='threshold'||!canMeetHidden())return false;
      state.result=null;startBattle('hidden',{enemyId:'feiye',name:ENEMIES.feiye.name});note('井后有人抬起眼。');emit();return true;
    }
    function leaveThreshold() {if(state.screen!=='threshold')return false;state.screen='victory';emit();return true;}
    function makeExpansionBuilders(p) {
      const make=(id,name,story,choices)=>({id,name,glyph:'月',kicker:'雾中余声',description:story[0],story,choices:finishChoices(choices,p)});
      return {
        armory:()=>make('armory','封存剑匣',['废弃行营里有一口封好的剑匣。有人将价钱写在木牌背面，旁边留下了可供试握的两柄旧剑。','剑与人一样，未必因为被带在身边就会听命。'],[
          {label:'付 35 金币取「听雪」',text:'每回合首张攻击第一段伤害 +2。剑锋寒意凛冽。',goldCost:35,weapon:'rime',outcome:'剑匣开了，寒光贴着手腕安静下来。'},
          {label:'付 35 金币取「回灯」',text:'每回合首张攻击第一段伤害 +1；每场战斗首回合护盾 +3。',goldCost:35,weapon:'spirit',outcome:'旧剑的剑穗像一盏小灯，在你握紧时亮了一瞬。'},
          {label:'合上剑匣',text:'不支付代价，也不取剑。',outcome:'你将旧剑留给下一位经过的人。'}
        ]),
        moon_trace:()=>make('moon_trace','沉钟与旧剑',[
          '石门之后，一柄剑悬在没有风的半空。钟上没有铭文，剑却在你靠近时发出一声极轻的回应。',
          '你按住自己的呼吸。剑锋照见的影子，比你的动作慢了半拍。'
        ],[
          {label:'握住旧剑 · 失去 6 生命，获得「照夜」',text:'每回合首张攻击第一段伤害 +4。剑中灵性强盛，握持时隐有抗拒；可先收入剑匣。',hpCost:6,weapon:'divine',flags:{bellEcho:true},outcome:'剑入鞘，钟却响了。掌心留下的冷意久久没有散去。'},
          {label:'只听完钟声 · 下一战护盾 +3',text:'留在石门边听钟，不取剑。',guard:3,flags:{bellEcho:true},outcome:'你没有伸手。最后一声钟响贴着石壁，缓缓消散。'},
          {label:'退出石门',text:'没有数值变化。',outcome:'你将未响的钟与悬剑留在石门之后。'}
        ]),
        sealed_name:()=>make('sealed_name','缺字的残页',[
          '营地外有一张被火燎过的纸，文字在烛火熄灭时才会显现。你听见有人用指节，在桌下敲出先前那段钟声。',
          '最后一行只缺一个名字。你可以念，也可以收好纸页。'
        ],[
          {label:'默读残页 · 失去 4 生命，获得 25 金币',text:'当前生命须大于4。',hpCost:4,goldGain:25,flags:{ritualName:true},outcome:'墨迹浮出一瞬，却没有对应的面容。纸背藏着的旧钱落进你的掌心。'},
          {label:'付 15 金币买下纸页 · 恢复 6 生命',text:'得到纸页，治疗不超过生命上限。',goldCost:15,heal:6,flags:{ritualName:true},outcome:'烛火灭了，纸页上的字又归于空白。你将它折好，放进衣袖。'},
          {label:'不再看那行字',text:'没有数值变化。',outcome:'你移开目光，桌下的敲击声也停了。'}
        ]),
        moon_vow:()=>make('moon_vow','无字之誓',[
          '井外围着一圈无字碑。风吹过时，碑影同时转向你，像在等一句不该说给旁人听的话。',
          '没有人保证你能从这里得到什么。只有空白碑面，映出你尚未开口的唇。'
        ],[
          {label:'在碑前留一线命火 · 最大生命 −4，恢复 10 生命',text:'本局最大生命减少4，治疗不超过新上限。',maxHpCost:4,heal:10,flags:{emptyVow:true},outcome:'你没有许愿，只留下一个空位。井后传来衣摆擦过水面的声音。'},
          {label:'以掌心血封住碑影 · 失去 5 生命',text:'当前生命须大于5。',hpCost:5,flags:{emptyVow:true},outcome:'血没有落地，碑影里多出了一轮细月。你抬手时，远处似乎也有人收回了手。'},
          {label:'绕过无字碑',text:'没有数值变化。',outcome:'你将未说出口的话一起带走。'}
        ]),
        sovereign_wake:()=>make('sovereign_wake','旧宫无名',[
          '山门后的断壁曾悬着你的宫灯，如今灯座里只剩陌生的香灰。你记得亲手点灯的那个人，却想不起她后来为何没有回来。',
          '水洼里有一道与你相同的影子。它先抬头，你才听见自己的名字。'
        ],[
          {label:'收回灯芯 · 失去 4 生命，获得「影袭」',text:'取得F05；前方的倒影仍在等你。',hpCost:4,cardIds:['F05'],flags:{sovereignLamp:true},outcome:'灯芯在掌心亮起。你看见那道倒影向井边退去，像带走了本该属于你的半句回答。'},
          {label:'将灯芯放入袖中 · 下一战护盾 +6',text:'获得一次性援护，不立即取回力量。',guard:6,flags:{sovereignLamp:true},outcome:'你让尚未稳住的火留在袖中。它没有熄灭，也没有替你照出前方的路。'},
          {label:'循着水声前行',text:'没有数值变化。',outcome:'你认得自己的脚步，却还认不得水中的那个人。'}
        ]),
        sovereign_recall:()=>make('sovereign_recall','旧席换主人',[
          '断桥旁的营灯仍按旧宫的次序排列。曾经跪在灯下听令的卫烬，如今让寻路人跪在他脚边。',
          '“旧主不在了。”有人这样回答。你没有纠正，只看见自己的印记被挂在处刑的锁上。'
        ],[
          {label:'解开灯锁 · 失去 4 生命，获得 30 金币',text:'当前生命须大于4；前方仍须亲自面对卫烬。',hpCost:4,goldGain:30,flags:{sovereignFreed:true},outcome:'被锁住的人散进雾里。卫烬的灯一盏盏转向你，旧席上的主人终于知道你已回来。'},
          {label:'收好旧宫符印 · 下一战护盾 +8',text:'获得一次性护盾。',guard:8,outcome:'你把符印反扣在掌心。要收回的，不止是一点力量。'},
          {label:'听完营中的传言',text:'没有数值变化。',outcome:'你听见许多关于自己的死法，没有一种与你记得的一样。'}
        ]),
        sovereign_memory:()=>make('sovereign_memory','心海未归',[
          '井边有人替你留了一张座，座上却是你自己。她问你，为何那些最先相信你的人，总是最先被你遗忘。',
          '你已经找回的力量在袖中争鸣。井底的绛鳞也被另一种恶意唤醒，鳞片之间长出了本不属于她的眼睛。'
        ],[
          {label:'记下遗忘者的名字 · 获得「裂界」',text:'获得F10，随后仍需面对自己的心念。',cardIds:['F10'],flags:{sovereignRemembered:true},outcome:'你没有回答那张座，只把每个记起的名字念了一遍。心海的门缓缓打开。'},
          {label:'让旧火先稳住 · 恢复 12 生命',text:'治疗不超过生命上限。',heal:12,outcome:'你没有急着宣称自己已经完整。尚未收回的那一部分，仍在前方等你。'},
          {label:'封紧衣袖，继续前行',text:'没有数值变化。',outcome:'座上的你笑了一下。你没有移开眼睛。'}
        ])
      };
    }

    function makeSwordBuilders(p) {
      const make=(id,name,story,choices)=>({id,name,glyph:'剑',kicker:'剑心行迹',description:story[0],story,choices:finishChoices(choices,p)});
      const refusal={label:'收剑离开',text:'不接受招式，也不支付代价。',outcome:'你将那页字留在雾里，仍沿自己的路前行。'};
      const jadeChoice={label:'接过清心玉',text:'取得清心玉，系在剑穗上。',questItem:'clearheart_jade',outcome:'清心玉贴在剑穗下，澄澈的凉意直抵灵台。'};
      const cureChoice={label:'付 40 金币根治缠脉毒',text:'解除缠脉毒，不恢复生命；本次只取拔毒药。',goldCost:40,cureAffliction:true,requiresAffliction:true,outcome:'你放下清心玉，以四十枚旧钱换得一服拔毒药。黑线从掌心褪尽，旧伤终于不再向心口延伸。'};
      return {
        tainted_mercy:()=>make('tainted_mercy','雾中求援',[
          '一名背着药囊的陌生人倒在石阶旁，指间紧攥半幅湿透的药方。他说自己叫裴隐，身后还有追兵。',
          '你看见他胸口一道未合的伤。他没有请求宝物，只恳请你扶他走过这一段雾。'
        ],[
          {label:'扶他越过石阶',text:'替伤者稳住伤势，送他到路边的灯下。',afflict:true,flags:{mercyHelped:true},outcome:'裴隐扶住你的手。药囊的搭扣划破掌心，只有针尖大的一点红。他再三道谢，收好药方，走进前路的雾里。'},
          {label:'留下方向，独自前行',text:'不接触伤口，不支付代价。',flags:{mercyHelped:false},outcome:'你指给他最近的营火。裴隐看了你一眼，将药囊重新背好，没有再开口。'}
        ]),
        demonic_offer:()=>make('demonic_offer','伤口里的低语',p.affliction.active?[
          '掌心的黑线沿经脉缓缓向上，止血与回春都只能让你暂时好受。雾里有人准确说出了伤口的位置。',
          '“借煞回生。”那人把一页口诀放在石上，“能伤敌，也能续命。你若不信，拿去自己看。”'
        ]:[
          '雾中的药香与先前那名伤者相同。一页口诀被压在路边的石头上，字迹像刚刚写就。',
          '纸角写着“借煞回生”。一行行运气法门绕开剑宗旧诀，指向另一处你从未触及的经脉。'
        ],[
          {label:'记下「借煞回生」',text:'获得「借煞回生」：消耗 1 灵力，造成 4 伤害并恢复 6 生命；击杀或伤害被护盾阻挡仍治疗。',cardIds:['D01'],learnDemonic:true,flags:{demonicContact:true},outcome:'你只读一遍便记住了口诀。伤口尚未愈合，新的出手却已经在呼吸间成形。'},
          {label:'冷冷拒绝，继续前行',text:'不学习招式。若需疗伤，可去火塘静息或到药铺买药。',flags:{demonicRefused:true},outcome:'你没有碰那页纸。低语退进雾里，药香也渐渐淡了。'}
        ]),
        demonic_warning:()=>make('demonic_warning','剑穗与清心玉',[
          '断桥药棚外，一位剑宗旧识看见你剑穗边的黑气，取出一枚清心玉。她没有问你为什么会学那些招式。',
          '“贴身系着吧，能护住灵台。”她将玉放在药案边，又去照看炉上的药。'
        ],[jadeChoice,cureChoice,{label:'向旧识道别',text:'不取玉，也不买药。',outcome:'你谢过她，将清心玉留在药案上。'}]),
        mirror_trial:()=>make('mirror_trial','照心残镜',[
          '残镜里映出你的剑与另一道更深的影子。镜座嵌着一块清心玉，旁边还留着一包封好的拔毒药。',
          '镜上的裂痕停在剑锋之前。你伸出手，玉与药都静静落在触得到的地方。'
        ],[jadeChoice,cureChoice,{label:'合上残镜',text:'不取物品。',outcome:'镜面沉入暗处，你看见的影子仍与自己同行。'}]),
        fallen_hunt:()=>make('fallen_hunt','故药再逢',[
          '裴隐在井边收拢药囊。你认出曾经划伤掌心的搭扣，也看见他身后按顺序排好的六页经卷。',
          p.path.fallen?'他看见你眼底的暗红，终于笑了：“原来你已经能读懂后半卷。”经卷压在他的刀下，想取走就须亲自赢过他。':'他将药刀横在经卷上：“你已经知道，治命也可以伤人。”你可以挑战他，取走两页真正用来交锋的魔修经文。'
        ],[
          {label:'拔剑，夺下经卷',text:'与裴隐交战（60 生命）。胜利后额外获得「饮魄」「夺脉」，并正常领取战斗奖励；失败会结束本局。',battle:{enemyId:'apothecary',kind:'fight',name:'裴隐',lootCards:['D02','D03']},flags:{demonicContact:true},outcome:'裴隐把药囊放稳。两页经卷仍压在刀下；这一次，没有人替你出手。'},
          {label:'收剑，绕过井台',text:'不进行战斗，不获得经卷。',outcome:'你没有追问他从何处来。药刀映出的冷光留在井边，你沿另一条石阶离开。'}
        ]),
        demon_manual:()=>make('demon_manual','井下残卷',[
          p.path.fallen?'井沿一名守卷弟子正在收拾前人遗下的经页。他没有拔剑，反而让出火光：“这三页你可抄走，剑匣里的师门经本请留给我。”':'三页尚未焚尽的魔修经文悬在井沿。它们没有索取鲜血，也没有许诺解毒，只把余下的招式清楚摆在你面前。',
          p.path.fallen?'你听见自己的笑声。他袖口还系着替伤者包扎剩下的白绦，你的目光却只停在剑匣中的另外两页。':'魔躯可以守身，狂念可以寻招，万煞归心可以决胜。纸页被井风掀开，墨迹深处仍带着未散的热意。'
        ],[
          {label:'收下三页经文',text:'获得「魔躯」「狂念」「万煞归心」。',cardIds:['D04','D05','D06'],learnDemonic:true,flags:{demonicContact:true},outcome:'你将三页经文收进剑匣，压平被风卷起的纸角。'},refusal,
          ...(p.path.fallen?[{label:'截住守卷弟子，夺走整部经卷',text:'主动开战：守卷弟子生命 42，攻击7 → 护盾5并攻击6 → 连击6×2。胜利取得「饮魄」「夺脉」「魔躯」「狂念」「万煞归心」及正常战利品；失败结束本局。',battle:{enemyId:'raider',kind:'fight',name:'守卷弟子',lootCards:['D02','D03','D04','D05','D06']},flags:{fallenPlunder:true},outcome:'他一直没有封住去路。你却将剑横了过去：“抄来太慢，整部留下。”他护住剑匣，终于拔剑；你已不再问那部经卷该属于谁。'}]:[])
        ])
      };
    }

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
    function setStoryNode(map,floor,id,{all=false,name='雾中异迹'}={}) {
      const row=map[floor-1],targets=all?row:[row.find(n=>n.type==='event'&&!n.storyId)||row.find(n=>!n.storyId)||row[row.length-1]];
      for(const node of targets){node.type='event';node.storyId=id;delete node.encounter;node.name=name;node.description='这条路上，留下了一段尚未完成的相逢。';}
      if(!all&&floor>1){
        const previous=map[floor-2],required=targets[0].id;
        for(const source of previous)if(!source.next.includes(required))source.next.push(required);
        const storyTargets=new Set(row.filter(node=>node.storyId).map(node=>node.id));
        const incoming=id=>previous.reduce((count,source)=>count+Number(source.next.includes(id)),0);
        for(const source of previous)while(source.next.length>3){
          let index=source.next.findIndex(id=>!storyTargets.has(id)&&incoming(id)>1);
          if(index<0){
            index=source.next.findIndex(id=>!storyTargets.has(id)&&previous.some(other=>other!==source&&other.next.length<3&&!other.next.includes(id)));
            if(index<0)break;
            const destination=source.next[index],other=previous.find(other=>other!==source&&other.next.length<3&&!other.next.includes(destination));other.next.push(destination);
          }
          source.next.splice(index,1);
        }
      }
    }
    function makeMap() {
      const weighted=['fight','fight','event','event','rest','rest','shop','elite','cave'],map=[],templates=[];
      for(let chapter=0;chapter<3;chapter++){
        const configured=Array.isArray(options.routeTemplate)?options.routeTemplate[chapter]:options.routeTemplate;
        const template=ROUTE_TEMPLATES[Number.isInteger(configured)&&configured>=0&&configured<20?configured:rand(20)];templates.push({id:template.id,name:template.name,chapter:chapter+1,nodeCount:template.widths.reduce((a,b)=>a+b,0)});
        const rows=template.widths.map((width,local)=>{
          const floor=chapter*10+local+1;let types;
          if(local===0)types=['fight'];else if(local===9)types=['boss'];else if(local===2)types=Array(width).fill('event');
          else{types=Array.from({length:width},()=>weighted[rand(weighted.length)]);if([1,3,5,7,8].includes(local)){types[0]='rest';types[1]='shop';}if([1,7].includes(local))types[2]='cave';if(local===5)types[2]='fox';types=shuffle(types);}
          return types.map((type,lane)=>({id:`f${floor}-${lane}`,type,floor,lane,regionIndex:chapter,xJitter:(rng()-.5)*.28,yJitter:(rng()-.5)*.35,revealed:false,name:NODE_INFO[type][0],description:NODE_INFO[type][1],omen:OMENS[type][rand(OMENS[type].length)],next:[]}));
        });
        for(let local=0;local<9;local++){
          const current=rows[local],next=rows[local+1];
          if(current.length===1){current[0].next=next.map(n=>n.id);continue;}if(next.length===1){for(const n of current)n.next=[next[0].id];continue;}
          const score=(n,t)=>Math.abs(n.lane/(current.length-1)-t.lane/(next.length-1)+template.bias*(local%2?1:-1))+rng()*.13;
          for(const target of next){const ranked=current.filter(n=>n.next.length<3).map(n=>({n,v:score(n,target)})).sort((a,b)=>a.v-b.v);ranked[0].n.next.push(target.id);}
          for(const n of current){const ranked=next.map(t=>({t,v:score(n,t)})).sort((a,b)=>a.v-b.v);if(!n.next.length)n.next.push(ranked[0].t.id);const desired=1+rand(3);for(const item of ranked)if(n.next.length<desired&&!n.next.includes(item.t.id))n.next.push(item.t.id);
            if(template.weave===3&&local%3===1){const far=next[(n.lane+2+chapter)%next.length];if(!n.next.includes(far.id)&&n.next.length<3)n.next.push(far.id);}
          }
          // Reverse one pair of destinations without changing coverage or degrees.
          // The long diagonal links make each chapter visibly cross and reconverge.
          if([1,4,6].includes(local)){
            const left=current[0],right=current[current.length-1],low=next[0].id,high=next[next.length-1].id;
            if(left.next.includes(low)&&right.next.includes(high)&&!left.next.includes(high)&&!right.next.includes(low)){
              left.next[left.next.indexOf(low)]=high;right.next[right.next.indexOf(high)]=low;
            }
          }
        }
        if(map.length)map[map.length-1][0].next=[rows[0][0].id];map.push(...rows);
      }
      const introductions=shuffle(['liu','ji','wen']);for(const node of map[2]){const npc=NPCS[introductions[node.lane%3]];node.storyId=npc.id+'_first';node.npc=npc.id;node.name=({liu:'药箱旁的身影',ji:'剑阵旁的人',wen:'符锁旁的低语'})[npc.id];node.description='雾中有人停在路边。';}
      for(const [floor,id]of [[4,'moon_trace'],[14,'sealed_name'],[24,'moon_vow']])setStoryNode(map,floor,id);
      for(const [floor,enemyId]of [[10,'gate_boss'],[20,'camp_boss'],[30,'snake']]){const node=map[floor-1][0];node.encounter={enemyId:ENEMIES[enemyId]?enemyId:(floor===10?'yaksha':floor===20?'retainer':'snake'),kind:'boss'};node.name=ENEMIES[node.encounter.enemyId].name;node.description='本章最后一道关口。';}
      map.chapterTemplates=templates;map.templateId=templates[0].id;map.templateName=templates[0].name;return map;
    }
    function configureSwordMap(map) {
      for(const [floor,id]of [[5,'tainted_mercy'],[7,'demonic_offer'],[17,'demonic_warning'],[22,'mirror_trial']])setStoryNode(map,floor,id,{all:true,name:'路边余声'});
      setStoryNode(map,24,'fallen_hunt',{name:'一卷未合的书'});setStoryNode(map,27,'demon_manual',{all:true,name:'未竟的旧约'});
    }
    function cardPool() { return REWARD_POOL.filter(id => CARDS[id].character === state.character && !CARDS[id].locked); }
    function freshState(screen, starter = 'mark') {
      serial = 0;
      eventSerial = 0;
      const map = makeMap();
      const cards = starter === 'classic' ? CLASSIC : STARTERS[starter].cards;
      const character = STARTERS[starter]?.character || (starter === 'sword' ? 'sword' : 'assassin');
      if (character === 'sovereign') configureSovereignMap(map);
      if (character === 'sword') configureSwordMap(map);
      return {
        screen, starter, character, map, chapterTemplates:map.chapterTemplates, mapTemplateId:map.templateId, mapTemplateName:map.templateName, availableNodes: [map[0][0].id], currentNode: null,
        player: {
          hp: 60, maxHp: 60, gold: 60, character, level:1, xp:0, power:0, weaponInventory:['training'], equippedWeapon:'training', questItems:[], affliction:{active:false,revealed:false,ticks:0,suppressed:0,source:null}, path:{corruption:0,fallen:false,protected:false,learned:false,uses:0},
          deck: cards.map(makeCard),
          relics: [character === 'sword' ? 'frostseal' : character === 'sovereign' ? 'veil' : 'bell']
        },
        floor: 1, history: [], seenEvents: [], battle: null, reward: null, shop: null, event: null, cave: null,
        journey: { regionIndex: 0, chain: null, step: 0, flags: {}, relationships: {}, journal: [],
          hidden: { jiIntent: rand(2) ? 'greedy' : 'grateful' }, nextCombatBlock: 0 },
        notice: '', result: null, rewardRerolls: 1,
        stats: { battles: 0, cardsPlayed: 0, eliteBattles: 0, maxCombo: 0, maxHit: 0, chapterBosses:0, demonicUses:0 }
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
      b.enemy.block = b.enemy.mark = b.enemy.poison = b.enemy.chill = b.enemy.chillProgress = b.enemy.bleed = b.enemy.counter = 0;
      b.enemy.frozen = null;
      b.swordIntent = 0; b.soul = 0;
      b.nextAttack = b.nextEnergy = b.nextDraw = 0;
      b.bloodPower = b.riposte = b.pillPower = b.nextEnergyPenalty = b.nextDrawPenalty = 0;
      b.bellUsed = b.jadeUsed = b.frostsealUsed = false;
      b.fangUsed = b.silkUsed = b.bloodstoneUsed = false;
    }
    function defeat() {
      if (['defeat','victory'].includes(state.screen)) return;
      const b = liveBattle()?state.battle:null;
      if(b){b.phase = 'ended';clearCombatStatuses();}
      state.player.hp = 0;
      state.result = { won: false, floor: state.floor, enemy: b?.enemy.name || '缠脉毒' };
      state.screen = 'defeat';
      note(`第 ${state.floor} 段，未能带出残页，倒在${b?.enemy.name||'缠脉毒'}面前。`);
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
      if(b.resolving?.[0]?.id.startsWith('S')&&state.player.path.fallen)amount=Math.floor(amount/2);
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
    function addSwordIntent(amount, reason = '剑意') {
      if (!liveBattle()) return 0;
      const b = state.battle, before = b.swordIntent || 0;
      b.swordIntent = Math.max(0, Math.min(8, before + amount));
      const gained = b.swordIntent - before;
      event('swordIntent', { amount: gained, total: b.swordIntent, reason });
      log(`${reason}：剑意 ${gained >= 0 ? '+' : ''}${gained}（${b.swordIntent}/8）。`);
      return gained;
    }
    function consumeSwordIntent(count) {
      const b = state.battle, used = Math.min(b.swordIntent || 0, count);
      if (used) addSwordIntent(-used, '收束剑意');
      return used;
    }
    function frostResistant() {
      const b = state.battle;
      return !!b && (['elite','boss','hidden'].includes(b.kind) || ['elite','boss','hidden'].includes(ENEMIES[b.enemy.id]?.rank));
    }
    function addChill(amount, reason = '霜寒') {
      if (!liveBattle()) return 0;
      const b = state.battle, before = b.enemy.chill || 0;
      // Tough enemies count distinct frost-applying cards, never hit segments or requested layers.
      if (amount > 0 && before < 10 && frostResistant()) {
        const card = b.resolving?.[0];
        if (!card || b.chillCardUid === card.uid) return 0;
        b.chillCardUid = card.uid;
        b.enemy.chillProgress = (b.enemy.chillProgress || 0) + 1;
        if (b.enemy.chillProgress < 2) {
          log(`${reason}：寒息渗入${b.enemy.name}的护体气息，下一张施霜技能可凝成 1 层霜寒。`);
          event('chill', { target: 'enemy', amount: 0, total: before, progress: 1, resisted: true, reason });
          return 0;
        }
        b.enemy.chillProgress = 0;
        amount = 1;
      }
      b.enemy.chill = Math.max(0, Math.min(10, before + amount));
      const gained = b.enemy.chill - before;
      event('chill', { target: 'enemy', amount: gained, total: b.enemy.chill, progress:b.enemy.chillProgress||0, reason });
      log(`${reason}：${b.enemy.name}霜寒 ${gained >= 0 ? '+' : ''}${gained}（${b.enemy.chill}/10）。`);
      if (gained > 0 && hasRelic('frostseal') && !b.frostsealUsed) {
        b.frostsealUsed = true;
        event('relic', { relic: 'frostseal', name: RELICS.frostseal.name, amount: 1 });
        addSwordIntent(1, '霜魄剑穗触发');
      }
      return gained;
    }
    function addBleed(amount, reason = '流血') {
      if (!liveBattle()) return 0;
      const enemy = state.battle.enemy, before = enemy.bleed || 0;
      enemy.bleed = Math.max(0, Math.min(7, before + amount));
      const gained = enemy.bleed - before;
      log(`${reason}：${enemy.name}流血 ${gained >= 0 ? '+' : ''}${gained}（${enemy.bleed}/7）。`);
      event('bleed', { target:'enemy', amount:gained, total:enemy.bleed, reason });
      return gained;
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
      awardExperience(b.kind);
      if (state.character==='sovereign' && ['feiye_echo','retainer','heart'].includes(b.enemy.id)) {
        const before=state.player.power;state.player.power=Math.min(3,before+1);
        recordJourney(null,'本源归身',`从${b.enemy.name}处取回熟悉的气息，出剑时旧日的回响愈发清晰。`,'good');
        event('powerReturn',{amount:state.player.power-before,total:state.player.power});
      }
      if(b.storyEncounter?.lootCards){for(const id of b.storyEncounter.lootCards)if(CARDS[id]){state.player.deck.push(makeCard(id));if(id.startsWith('D'))state.player.path.learned=true;}recordJourney(null,'新得经页',b.storyEncounter.lootCards.map(id=>CARDS[id].name).join('、'),'warning');}
      log(`击败${b.enemy.name}！`);
      if (b.storyEncounter) {
        const npc = b.storyEncounter.npc;
        if (npc) state.journey.relationships[npc] = { status: '交锋已了', text: `你击退了${b.enemy.name}，守住了携带的物品。` };
        recordJourney(npc, '伏击已破', `击退${b.enemy.name}。你没有失去随身宝物；这段交锋已经结束。`, 'warning');
      }
      if (b.kind === 'hidden') {
        if(!profile.unlocks.includes('feiye')){profile.unlocks.push('feiye');if(typeof options.onProfileChange==='function')options.onProfileChange(getProfile());}
        state.screen='victory';state.availableNodes=[];state.result={won:true,floor:state.floor,enemy:b.enemy.name,hiddenWin:true,unlocked:'feiye'};note('井下的约定已解。绯夜可以作为新的行旅者出发。');return;
      }
      if (b.kind === 'boss' && state.floor < 30) {
        state.stats.chapterBosses++;heal(18,'关口之后的补给');
        state.player.gold+=35;state.reward={cards:rewardCards('elite'),gold:35,relic:null,relicChoices:[],relicPending:false,rerolled:false,chapterBoss:true};state.screen='reward';note('关口已过。选牌后可进入下一章。');return;
      }
      if (b.kind === 'boss') {
        completeNode();
        state.screen = canMeetHidden() ? 'threshold' : 'victory';
        state.availableNodes = [];
        state.result = { won: true, floor: state.map.length, enemy: b.enemy.name, character:state.character, power:state.player.power };
        note('绛鳞退入井底。你带着归墟引灵仪的残页走出寒渊封域，雾后的真相仍未揭开。');
        return;
      }
      let gold = b.kind === 'elite' ? 35 : 20;
      let relicChoices = [];
      if (b.kind === 'elite') {
        const available = Object.keys(RELICS).filter(id => !['bell','fox','frostseal','veil'].includes(id) && !hasRelic(id));
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
      const caveLoot = expedition.onBattleWin(b);
      if (caveLoot) state.reward.caveLoot = caveLoot;
      state.screen = 'reward';
      note(`胜利：${gold} 金币已入账。${relicChoices.length ? '先选一件精英珍藏，再选择卡牌。' : '请选一张牌或跳过。'}${gold === 55 ? '遗物已集齐，包含额外 20 金币。' : ''}`);
    }
    function rewardCards(kind, previous = []) {
      const pool = cardPool();
      const required = kind === 'elite'
        ? pool.filter(id => CARDS[id].rarity === 'rare')
        : state.character === 'sword' ? pool.filter(id => CARDS[id].category === (state.stats.battles % 2 ? 'blade' : 'ice'))
        : pool.filter(id => CARDS[id].category === state.starter);
      let cards;
      if (required.length) { const first = sample(required, 1)[0]; cards = [first, ...sample(pool.filter(id => id !== first), 2)]; }
      else cards = sample(pool, 3);
      if (previous.length && cards.every(id => previous.includes(id))) {
        const alternate = pool.filter(id => !previous.includes(id));
        if (alternate.length) cards[cards.length - 1] = alternate[rand(alternate.length)];
      }
      return cards;
    }
    // The killing heal is resolved before victory changes the screen.
    function enemyHit(amount, killingHeal = 0, alwaysHeal = 0, kind = 'card') {
      const b = state.battle;
      if(kind==='card'){
        const added=b.hitIndex===0?(b.cardBonus||0):0;
        let base=Math.max(0,amount-added);
        if(b.resolving?.[0]?.id.startsWith('S')&&state.player.path.fallen)base=Math.floor(base/2);
        if(b.hitIndex===0&&b.corePenalty)base=Math.max(0,base-1);
        amount=base+added;
      }
      amount=Math.max(0,amount);
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
      } else if (kind === 'card' && damage > 0 && b.enemy.counter > 0 && !b.enemyCounterUsedForCard) {
        b.enemyCounterUsedForCard = true;
        log(`${b.enemy.name}的架势反击：本张攻击牌首次伤及生命，反击 ${b.enemy.counter} 点。`);
        event('enemySkill', {target:'player',kind:'counter',amount:b.enemy.counter,name:'架势反击'});
        playerHit(b.enemy.counter, -1);
      }
    }
    function startPlayerTurn() {
      if (!liveBattle()) return;
      const b = state.battle;
      b.phase = 'resolving';
      b.turn++;
      event('blockClear', { target: 'player', amount: -b.block, total: 0 });
      b.block = 0;
      b.weaponUsed = false; b.veilUsed = false;b.coreStrikeUsed=false;
      b.played = 0;
      b.bellUsed = false;
      b.frostsealUsed = false;
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
      if(!tickAffliction('turn'))return;
      let turnEnergy = 3 + b.nextEnergy;
      if (b.nextEnergyPenalty) {
        turnEnergy = Math.max(0, turnEnergy - b.nextEnergyPenalty);
        log(`封脉余势：本回合灵力减少 ${b.nextEnergyPenalty}。`);
        b.nextEnergyPenalty = 0;
      }
      if(environmentEnabled && b.environment.regionIndex===1 && b.turn===1){turnEnergy=Math.max(0,turnEnergy-1);log('逆灵风：首回合灵力减少1。');event('environment',{name:b.environment.name,amount:-1,kind:'energy'});}
      let draw = 5 + b.nextDraw;
      if (b.nextDrawPenalty) {
        draw = Math.max(0, draw - b.nextDrawPenalty);
        log(`扰心余势：本回合少抽 ${b.nextDrawPenalty} 张牌。`);
        b.nextDrawPenalty = 0;
      }
      if(environmentEnabled&&b.environment.regionIndex===0&&b.turn===1){draw=Math.max(0,draw-1);log('入骨瘴：首回合少抽1张牌。');event('environment',{name:b.environment.name,amount:-1,kind:'draw'});}
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
      if (b.nextEnergy || b.nextDraw) log(`蓄势触发：额外 ${b.nextEnergy} 灵力、${b.nextDraw} 张牌。`);
      b.nextEnergy = b.nextDraw = 0;
      b.energy = turnEnergy;
      const weapon=getWeaponStatus();b.weaponOmen=weapon.omen;
      if(weapon.id==='divine'&&!weapon.controlled) {
        const cycle=(b.turn-1)%3;event('weapon',{name:weapon.name,text:weapon.omen,kind:cycle});log(`照夜不肯听令：${weapon.omen}。`);
        if(cycle===0)b.energy=Math.max(0,b.energy-1);
        if(cycle===1){event('selfDamage',{amount:3,damage:3,reason:'神剑反噬'});if(!loseLife(3,'神剑反噬（无视护盾）'))return;}
        if(cycle===2){b.enemy.block+=6;event('block',{source:'weapon',target:'enemy',amount:6,total:b.enemy.block});}
      }
      drawCards(draw);
      b.phase = 'player';
    }
    function startBattle(kind, encounter = null) {
      const id = encounter?.enemyId || (kind === 'boss' ? 'snake' : kind === 'elite' ? 'yaksha' : ORDINARY[rand(ORDINARY.length)]);
      const def = ENEMIES[id];
      state.battle = {
        kind, phase: 'resolving', hand: [], draw: shuffle(state.player.deck.map(card => ({ ...card }))),
        discard: [], exhaust: [], resolving: [],
        enemy: { id, name: encounter?.name || def.name, hp: def.hp, maxHp: def.hp, block: 0, mark: 0, poison: 0, chill: 0, chillProgress:0, bleed:0, counter:0, frozen:null, frostResistant:['elite','boss','hidden'].includes(kind)||['elite','boss','hidden'].includes(def.rank), intentIndex: 0 },
        block: 0, energy: 0, poison: 0, swordIntent: 0, soul:0, environment:getEnvironment(), weaponOmen:'', weaponUsed:false, veilUsed:false, frostsealUsed: false, turn: 0, played: 0,
        nextAttack: 0, nextEnergy: 0, nextDraw: 0, bellUsed: false, jadeUsed: false,
        bloodPower: 0, riposte: 0, pillPower:Math.max(0,Math.min(4,state.player.pendingPillPower||0)), itemUsedTurn:0, nextEnergyPenalty:0, nextDrawPenalty:0, fangUsed: false, silkUsed: false, bloodstoneUsed: false, events: [], hitIndex: 0,
        mirrorUsed: false, nineUsed: false,
        logs: [`进入第 ${state.floor} 段，与${encounter?.name || def.name}交战。`]
      };
      state.player.pendingPillPower = 0;
      state.screen = 'battle';
      state.reward = null;
      startPlayerTurn();
      if(!liveBattle())return;
      const equipped=WEAPONS[state.player.equippedWeapon];if(equipped?.block)gainBlock(equipped.block,equipped.name);
      if (state.journey.nextCombatBlock > 0) {
        const amount = state.journey.nextCombatBlock;
        state.journey.nextCombatBlock = 0;
        gainBlock(amount, '故人护符');
        log(`故人留下的护符生效：首回合获得 ${amount} 点护盾，本次援护已用尽。`);
      }
      if (encounter && !encounter.caveId) {
        state.battle.storyEncounter = { npc: state.event?.npc || null, title: state.event?.name || '', enemy: state.battle.enemy.name, lootCards:(encounter.lootCards||[]).slice() };
        log('这是先前奇遇引出的交战；获胜后正常选牌，只完成当前道路一次。');
      }
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
      const regionIndex = Math.min(REGIONS.length - 1, Math.floor((state.floor - 1) / 10));
      const crossed = regionIndex !== state.journey.regionIndex;
      state.journey.regionIndex = regionIndex;
      state.screen = crossed ? 'arrival' : 'map';
      if (crossed) prepareChapter();
      state.mapTemplateId=state.chapterTemplates[regionIndex].id;state.mapTemplateName=state.chapterTemplates[regionIndex].name;
      state.reward = null;
      state.shop = null;
      state.event = null;
      state.cave = null;
      note(`第 ${state.floor} 段已开放。沿已连接的道路继续前行。`);
    }

    function newRun(starter = 'mark') {
      if ((!STARTERS[starter] && starter !== 'classic') || (starter === 'sovereign' && !profile.unlocks.includes('feiye'))) return false;
      state = freshState('arrival', starter);
      expedition.resetRun();
      activeNode = null;
      note(`${CHARACTERS[state.character].name}进入寒渊封域。选择第一段遗径，前往逆仪观测井。`);
      emit();
      return true;
    }
    function enterRegion() {
      if (state.screen !== 'arrival') return false;
      for (const row of state.map) for (const node of row) if (node.regionIndex === state.journey.regionIndex) node.revealed = true;
      state.screen = 'map';
      note(`抵达${REGIONS[state.journey.regionIndex].name}。这里只显现当前地域的道路。`);
      emit(); return true;
    }
    function getAvailableNodes() {
      if (state.screen === 'arrival') return [];
      return (state.map[state.floor - 1] || []).filter(node => node.revealed && node.regionIndex === state.journey.regionIndex && state.availableNodes.includes(node.id));
    }
    function prepareChapter() {
      const j = state.journey;
      if (state.character==='sovereign') return;
      if (!j.chain) return;
      const suffix = j.regionIndex === 1 ? 'return' : 'final';
      for (const node of state.map[j.regionIndex*10+2]) {
        node.storyId = j.chain + '_' + suffix; node.npc = j.chain;
        node.name = suffix === 'return' ? `再逢 · ${NPCS[j.chain].name}` : `旧缘 · ${NPCS[j.chain].name}`;
        node.description = `来自${NPCS[j.chain].faction}的旧识，正在前路的灯下停留。`;
      }
    }
    function recordJourney(npc, title, text, tone = 'neutral') {
      state.journey.journal.push({ floor: state.floor, region: state.journey.regionIndex, npc: npc || null, title, text, tone });
    }
    function enterNode(idOrType) {
      if (state.screen !== 'map') return false;
      const available = getAvailableNodes();
      const node = available.find(item => item.id === idOrType) || available.find(item => item.type === idOrType);
      if (!node || state.history.some(item => item.floor === state.floor)) return false;
      const type = node.type;
      activeNode = node;
      state.notice = '';
      if(!tickAffliction('node')){emit();return true;}
      if (type === 'fight' || type === 'elite' || type === 'boss') startBattle(type, node.encounter || null);
      else {
        state.screen = type;
        if (type === 'shop') {
          state.shop = { cards: sample(cardPool(), 3).map(id => ({ id, bought: false })), removed: false, antidoteBought:false, weapons: ['rime','divine','spirit'].filter(id=>WEAPONS[id]&&!state.player.weaponInventory.includes(id)).map(id=>({id,price:WEAPONS[id].price||50,bought:false})) };
          state.shop.items = expedition.makeShopStock();
        }
        if (type === 'event') state.event = makeEvent();
        if (type === 'cave') expedition.enterCave(node);
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
      if(card.id.startsWith('D')&&(!state.player.path.learned||state.character!=='sword')){
        note('尚未习得魔修技能，无法使用这张牌。');emit();return false;
      }
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
      b.chillCardUid = null;
      b.enemyCounterUsedForCard = false;
      const previousPlayed = b.played;
      b.played++;
      state.stats.maxCombo = Math.max(state.stats.maxCombo, b.played);
      state.stats.cardsPlayed++;
      log(`打出「${def.name}」，消耗 ${def.cost} 灵力。`);
      event('card', { cardId: card.id, name: def.name, cost: def.cost });
      let bonus = 0;
      if (def.attack) {
        bonus = b.nextAttack + b.bloodPower + state.player.power + (b.pillPower || 0);
        if(!b.weaponUsed){const w=WEAPONS[state.player.equippedWeapon];b.weaponUsed=true;if(w?.bonus){bonus+=w.bonus;log(`「${w.name}」：首张攻击第一段伤害 +${w.bonus}。`);event('weapon',{name:w.name,amount:w.bonus,kind:'attack'});}}
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
        b.corePenalty=environmentEnabled&&b.environment.regionIndex===2&&!b.coreStrikeUsed;
        if(b.corePenalty){b.coreStrikeUsed=true;log('离魂隙：本回合首次攻击首段基础伤害减少1，额外增伤照常。');}
        if (bonus) log(`首段增伤：第一段伤害增加 ${bonus}。`);
      }
      b.cardBonus=bonus;
      switch (card.id) {
        case 'D01': enemyHit(4+bonus,0,6);break;
        case 'D02': enemyHit(8+bonus,0,3);break;
        case 'D03': enemyHit(16+bonus,0,5);break;
        case 'D04': gainBlock(12,def.name);drawCards(1);break;
        case 'D05': drawCards(2);break;
        case 'D06': enemyHit(26+bonus,0,6);break;
        case 'F01': enemyHit(6+bonus);if(liveBattle())addSoul(1,def.name);break;
        case 'F02': gainBlock(6,def.name);break;
        case 'F03': addSoul(2,def.name);break;
        case 'F04': {const soul=consumeSoul();enemyHit(10+3*soul+bonus);break;}
        case 'F05': for(let i=0;i<3&&liveBattle();i++)enemyHit(3+(i===0?bonus:0));break;
        case 'F06': gainBlock(3,def.name);drawCards(1);break;
        case 'F07': gainBlock(8,def.name);if(b.soul>=3)drawCards(1);break;
        case 'F08': drawCards(2);break;
        case 'F09': enemyHit(5+bonus,0,2);break;
        case 'F10': enemyHit(16+bonus);if(liveBattle()&&state.player.power>=2)drawCards(1);break;
        case 'F11': if(b.soul>=2){addSoul(-2,def.name);b.energy++;drawCards(1);}else log('魂息不足2，没有收益。');break;
        case 'F12': {const soul=consumeSoul();enemyHit(18+4*soul+bonus);break;}
        case 'S01': enemyHit(6 + bonus); if (liveBattle()) {addSwordIntent(1, def.name);if(b.enemy.chill>0)addChill(1,def.name);} break;
        case 'S02': gainBlock(6, def.name); addChill(1, def.name); break;
        case 'S03': addSwordIntent(2, def.name); break;
        case 'S04': { const used = consumeSwordIntent(8); enemyHit(10 + 3 * used + bonus); if(liveBattle()&&b.enemy.chill>=5)drawCards(1);break; }
        case 'S05': enemyHit(4 + bonus); if (liveBattle()) addChill(2, def.name); break;
        case 'S06': gainBlock(3, def.name); drawCards(1); break;
        case 'S07': gainBlock(7, def.name); if (b.enemy.chill > 0) drawCards(1); break;
        case 'S08': {
          const amount = b.swordIntent >= 3 ? 4 : 3;
          for (let i = 0; i < 3 && liveBattle(); i++) enemyHit(amount + (i === 0 ? bonus : 0));
          if(liveBattle()&&b.enemy.chill>0)addChill(1,def.name);
          break;
        }
        case 'S09': drawCards(2); break;
        case 'S10':
          if (b.swordIntent >= 2) { consumeSwordIntent(2); b.energy++; drawCards(1); log('回锋：消耗 2 剑意，获得 1 灵力并抽 1 张牌。'); }
          else log('回锋：剑意不足 2，没有收益。');
          break;
        case 'S11': b.nextEnergy++; b.nextDraw++; log('藏剑：下回合额外 1 灵力、抽 1 张牌。'); break;
        case 'S12': gainBlock(14, def.name); addChill(2, def.name); break;
        case 'S13': if (loseLife(3, '以血淬刃自损（无视护盾）', true)) { drawCards(2); addSwordIntent(1, def.name); } break;
        case 'S14': enemyHit(5 + bonus); if (liveBattle()) addSwordIntent(b.enemy.chill>=5?3:2, def.name); break;
        case 'S15': {
          const removed = b.enemy.chill || 0;
          if (removed) addChill(-removed, '碎霜清除');
          enemyHit(12 + 2 * removed + bonus);
          if (liveBattle()) addSwordIntent(removed, def.name);
          break;
        }
        case 'S16': {
          const used = consumeSwordIntent(8); enemyHit(16 + 4 * used + bonus);
          if (liveBattle()) addChill(3, def.name);
          break;
        }
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
          if(liveBattle()&&b.enemy.mark>0)addBleed(1,def.name);
          break;
        case 'C06': gainBlock(3, def.name); drawCards(1); break;
        case 'C07':
          gainBlock(7, def.name);
          if (previousPlayed >= 2) { log('流影连段：额外抽 1 张牌。'); drawCards(1); }
          break;
        case 'C08': enemyHit(4 + bonus); if (liveBattle()) {addMark(2);addBleed(2,def.name);} break;
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
        case 'C18': enemyHit(5 + 2 * b.enemy.mark + bonus); if(liveBattle()&&b.enemy.mark>0)addBleed(1,def.name);break;
        case 'C19': gainBlock(8, def.name); addMark(1); break;
        case 'C20':
          if (b.enemy.mark > 0) {
            b.enemy.mark--; b.energy++;
            event('mark', { target: 'enemy', amount: -1, total: b.enemy.mark });
            log('铃音消耗 1 层标记：获得 1 灵力并抽 1 张牌。'); drawCards(1);
          } else log('铃音：敌人没有标记，没有获得灵力或抽牌。');
          break;
        case 'C21': {
          const mark = b.enemy.mark, bleed = b.enemy.bleed || 0;
          enemyHit(12 + 6 * mark + 2 * bleed + bonus); b.enemy.mark = 0;
          event('mark', { target: 'enemy', amount: -mark, total: 0 });
          if(liveBattle()&&bleed)addBleed(-bleed,def.name);
          log(`终夜清除全部 ${mark} 层标记与 ${bleed} 层流血。`); break;
        }
        case 'C22':
          for (let i = 0; i < 2 && liveBattle(); i++) enemyHit((previousPlayed >= 2 ? 6 : 4) + (i === 0 ? bonus : 0));
          if(liveBattle())addBleed(previousPlayed>=2?2:1,def.name);
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
        case 'C28': enemyHit(10 + bonus, 0, 4+Math.min(3,b.enemy.bleed||0));if(liveBattle())addBleed(1,def.name);break;
        case 'C29': if (loseLife(5, '献寿自损（无视护盾）', true)) { b.energy += 2; log('献寿：获得 2 灵力。'); } break;
        case 'C30': {const desperate=state.player.hp<=state.player.maxHp/2;enemyHit((desperate?16:8)+bonus);if(liveBattle()&&desperate)addBleed(2,def.name);break;}
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
      if(card.id.startsWith('D')&&state.player.hp>0)useDemonicCard(card.id);
      // Keep the active card out of both draw/discard during all draw effects.
      b.resolving.splice(b.resolving.indexOf(card), 1);
      (def.exhaust ? b.exhaust : b.discard).push(card);
      if (liveBattle()) {
        if(def.attack&&hasRelic('veil')&&!b.veilUsed){b.veilUsed=true;addSoul(1,'无相夜纱');event('relic',{relic:'veil',name:RELICS.veil.name,amount:1});}
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
      // Finalise the only freeze roll here. Reading intent or reopening a panel never rolls again.
      b.enemy.frozen = (b.enemy.chill || 0) >= 10 ? rng() < .10 : false;
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
      enemy.counter = 0;
      if (enemy.poison > 0) {
        const damage = enemy.poison;
        enemy.hp = Math.max(0, enemy.hp - damage);
        enemy.poison--;
        log(`${enemy.name}受到 ${damage} 点毒伤害（无视护盾），毒减至 ${enemy.poison}。`);
        event('poison', { target: 'enemy', amount: damage, damage, tick: true });
        if (enemy.hp <= 0) { winBattle(); emit(); return true; }
      }
      const bleed = Math.min(7, Math.max(0, enemy.bleed || 0));
      if (bleed && rng() < bleed * .03) {
        const damage = 1 + rand(bleed);
        enemy.hp = Math.max(0, enemy.hp - damage);
        log(`创口迸血：${enemy.name}失去 ${damage} 生命（无视护盾），流血仍为 ${bleed} 层。`);
        event('bleed', { source:'status', target:'enemy', amount:0, total:bleed, damage, tick:true });
        if (enemy.hp <= 0) { winBattle(); emit(); return true; }
      }
      const intent = getIntent();
      if (enemy.frozen) {
        log(`${enemy.name}被寒意封住，跳过「${intent.name}」的整次行动。`);
        event('freeze', { source:'status',target:'enemy',skipped:true,name:intent.name });
      } else {
        log(`${enemy.name}使用「${intent.name}」：${intent.text}。`);
        if (intent.clearMark) {
          event('mark', { source:'enemy',target:'enemy',amount:-enemy.mark,total:0 });
          log(`${intent.name}：清除 ${enemy.mark} 层标记。`);enemy.mark=0;
        }
        if (intent.clearChill) {
          enemy.chillProgress=0;
          if(enemy.chill)addChill(-enemy.chill,intent.name+'清霜');
        }
        if (intent.clearBleed && enemy.bleed) addBleed(-enemy.bleed,intent.name+'止血');
        if (intent.block) {
          enemy.block += intent.block;
          log(`${enemy.name}获得 ${intent.block} 点护盾。`);
          event('block', { source:'enemy',target:'enemy',amount:intent.block,total:enemy.block });
        }
        for (let i=0;i<(intent.hits||[]).length;i++) {
          if(!playerHit(intent.hits[i],i)){emit();return true;}
        }
        if (intent.poison) {
          b.poison += intent.poison;
          log(`你获得 ${intent.poison} 层毒（共 ${b.poison} 层）。`);
          event('poison',{source:'enemy',target:'player',amount:intent.poison,total:b.poison});
        }
        if(intent.counter){
          enemy.counter=intent.counter;
          log(`${enemy.name}摆出反击架势：每张攻击牌首次伤及生命时，反击 ${intent.counter} 点；持续到下个敌方回合。`);
          event('enemySkill',{source:'enemy',target:'enemy',kind:'counter',name:intent.name,amount:intent.counter,text:'反击架势'});
        }
        if(intent.energyPenalty){
          b.nextEnergyPenalty+=intent.energyPenalty;
          event('enemySkill',{source:'enemy',target:'player',kind:'energyPenalty',name:intent.name,amount:intent.energyPenalty,text:`下个回合灵力 −${intent.energyPenalty}`});
        }
        if(intent.drawPenalty){
          b.nextDrawPenalty+=intent.drawPenalty;
          event('enemySkill',{source:'enemy',target:'player',kind:'drawPenalty',name:intent.name,amount:intent.drawPenalty,text:`下个回合少抽 ${intent.drawPenalty} 张牌`});
        }
      }
      if (enemy.chill > 0) addChill(-1,'敌人回合结束，霜寒消退');
      enemy.frozen=null;
      enemy.intentIndex=(enemy.intentIndex+1)%ENEMIES[enemy.id].intents.length;
      note('你的回合。先看敌人意图，再决定攻守。');
      startPlayerTurn();emit();return true;
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
      if(shouldHeal==='cleanse'&&!state.player.affliction.active)return false;
      const cleansing=shouldHeal==='cleanse',amount = cleansing?heal(6):shouldHeal ? heal(18) : 0;
      if(cleansing)state.player.affliction.suppressed=Math.max(4,state.player.affliction.suppressed||0);
      advance();
      note(cleansing?`静息恢复 ${amount} 生命，经脉中的寒意暂时平复。第 ${state.floor} 段已开放。`:shouldHeal ? `休息结束，恢复 ${amount} 点生命。第 ${state.floor} 段已开放。` : `离开月庭。第 ${state.floor} 段已开放。`);
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
      if(choice.requiresAffliction&&!p.affliction.active)return false;
      if ((choice.goldCost || 0) > p.gold) return false;
      if ((choice.hpCost || 0) > 0 && p.hp <= choice.hpCost) return false;
      if ((choice.maxHpCost || 0) > 0 && p.maxHp - choice.maxHpCost < 5) return false;
      if (choice.removeBasic && (p.deck.length <= 5 || !p.deck.some(card => ['C01','C02','S01','S02','F01','F02'].includes(card.id)))) return false;
      return true;
    }
    function finishChoices(choices, p) {
      const available = choices.map(choice => ({ ...choice,
        text: choice.maxHpCost ? `${choice.text} 最大生命须至少保留 5。` : choice.text,
        disabled: !choiceAvailable(choice, p) }));
      if (available.every(choice => choice.disabled)) available.push({
        label: '无力交易 · 安然离开', text: '不支付任何代价，也不获得奖励。', disabled: false,
        outcome: '你轻轻摇头，收好空空的袖袋。封域的怪事没有追上来，只留下一盏微光，照着你继续深入封域。'
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
        const index = p.deck.findIndex(card => ['C01','C02','S01','S02','F01','F02'].includes(card.id));
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
      if(choice.weapon && WEAPONS[choice.weapon]) { if(!p.weaponInventory.includes(choice.weapon))p.weaponInventory.push(choice.weapon);received.push(`剑器「${WEAPONS[choice.weapon].name}」`); }
      if(choice.powerGain) {const before=p.power;p.power=Math.min(3,p.power+choice.powerGain);received.push(`本源 +${p.power-before}`);}
      if(choice.afflict){p.affliction={active:true,revealed:false,ticks:0,suppressed:0,source:'tainted_mercy'};}
      if(choice.cureAffliction){cureAffliction();received.push('缠脉毒根除');}
      if(choice.learnDemonic||(choice.cardIds||[]).some(id=>id.startsWith('D'))){p.path.learned=true;}
      if(choice.questItem&&EXPANSION.ITEMS?.[choice.questItem]){
        if(!p.questItems.includes(choice.questItem))p.questItems.push(choice.questItem);
        p.path.protected=p.questItems.includes('clearheart_jade');received.push(EXPANSION.ITEMS[choice.questItem].name);
      }
      return received;
    }
    function makeJourneyBuilders(p, rare) {
      const j = state.journey, f = j.flags;
      const card = () => sample(rare, 1)[0];
      const eventFor = (id, npc, chapter, name, story, choices, extra = {}) => ({
        id, npc, chapter, name, faction: npc ? NPCS[npc].faction : extra.faction,
        glyph: npc === 'liu' ? '药' : npc === 'ji' ? '剑' : npc === 'wen' ? '烛' : '缘',
        kicker: chapter ? '故人行迹' : '封域行旅 · 门派众生',
        whisper: extra.whisper || (npc ? NPCS[npc].description : ''),
        description: story[0], story, ...extra, choices: finishChoices(choices, p)
      });
      const relation = (status, text) => ({ status, text });
      const fight = name => ({ enemyId: 'raider', name, kind: 'fight' });
      return {
        liu_first() {
          return eventFor('liu_first','liu',1,'药箱旁的求援',[
            '一名丹霞谷弟子跪在坏掉的药箱旁，怀里抱着被瘴气侵蚀的师姐。她报了名字：柳照青。她的手一直在抖，针却没有落错一根。',
            '“借我一点真气，或者替我买一包引灵砂。”她抬头望向你，“师姐醒了，我们会去断桥营地。若你也过去，我一定认得你。”'
          ],[
            {label:'渡气救人 · 失去 6 生命',text:'当前生命须大于 6。',hpCost:6,flags:{liuAid:true},relationship:relation('有恩','你替她救回了师姐。'),tone:'good',outcome:'师姐的呼吸终于稳住。柳照青在你袖口系上一条丹霞谷的青绦：“到断桥，认这条绦。”'},
            {label:'留 15 金币买药 · 帮她安置伤者',text:'支付 15 金币购买引灵砂。',goldCost:15,flags:{liuAid:true},relationship:relation('有恩','你留下药钱，帮她安置了伤者。'),tone:'good',outcome:'柳照青把钱握得很紧，只郑重向你行了一礼。临走，她把断桥营地的方向指给你。'},
            {label:'留下方向，独自前行',text:'没有即时数值变化；她只能另寻援手。',flags:{liuAid:false},relationship:relation('一面之缘','你没有留下救人，指给她营地的方向。'),outcome:'你告诉她最近的营火在哪里。她点点头，背起师姐，药箱沿着石阶磕出很慢的响声。'}
          ]);
        },
        liu_return() {
          const helped = !!f.liuAid;
          return eventFor('liu_return','liu',2,'青绦再逢',helped ? [
            '断桥下的药棚里，柳照青一眼看见你袖口的青绦。她师姐坐在火边，已经能自己端碗。',
            '“这回不收钱。”她把你按在凳上，取出早留好的一包伤药，“我认得这份恩。”'
          ] : [
            '你在断桥药棚再次遇见柳照青。她的师姐裹着厚被，靠着商盟借来的药活了下来。',
            '她认出你，神色并不怨怼：“药材是借来的，我还要还账。你若要药，和旁人同价。”'
          ],[
            helped ? {label:'接受她的谢礼 · 恢复 18 生命，下一战护盾 +8',text:'下一场战斗首回合获得 8 护盾，用后消失。治疗不超过上限。',heal:18,guard:8,flags:{liuReturned:true},relationship:relation('可信同路人','柳照青为你疗伤，并留下只用一次的护身药符。'),tone:'good',outcome:'她把青绦重新系紧，药符藏在结里。你曾救下的人，如今替你挡住下一阵寒意。'} : {label:'买一包伤药 · 支付 15 金币，恢复 18 生命',text:'治疗不超过最大生命。',goldCost:15,heal:18,flags:{liuReturned:true},relationship:relation('相识','你向她买了药，彼此都记住了名字。'),outcome:'她没有多收一文，也没有少给一味药。药棚外的雾还在，至少这碗药是热的。'},
            {label:'替药棚守夜 · 失去 4 生命，获得 25 金币',text:'当前生命须大于 4。',hpCost:4,goldGain:25,flags:{liuReturned:true,liuAid:true},relationship:relation('互相照应','你替药棚守了一夜，收下凑来的盘缠。'),tone:'good',outcome:'你挡住了夜里摸来的影子，袖口被瘴刃划开。天亮前，柳照青把药棚凑出的盘缠塞给你。'},
            {label:'只报平安，继续深入',text:'不支付代价，也不领取药物。',flags:{liuReturned:false},relationship:relation(helped?'仍记旧恩':'一面之缘',helped?'你谢过她，未收药物。旧恩并未因此散去。':'你报了平安，没有在药棚停留。'),outcome:'柳照青替你拨正衣领，只说：“到了井边，先听风，不要先看水。”'}
          ],{connection:helped?'雾锁山门：你曾出手帮她救人。':'雾锁山门：你曾指路，却没有留下救人。'});
        },
        liu_final() {
          const helped = !!f.liuAid, id = card();
          return eventFor('liu_final','liu',3,'留给你的那盏灯',[
            '观测井外围，柳照青把最后一盏药灯挂在岔路口。她与师姐已经找到了归路，却仍等在这里。',
            helped ? '“知道你还没出来。”她说。青色药灯照亮了一截安全石阶，灯罩上的名字只有你的。' : '“没人该死在看得见出口的地方。”她留了一瓶药，旁边放着补齐药材欠账的木牌。'
          ],[
            helped ? {label:'循药灯前行 · 恢复 12 生命，下一战护盾 +12',text:'护盾仅在下一场战斗首回合获得，与尚未使用的援护叠加。',heal:12,guard:12,flags:{liuFinished:true},relationship:relation('生死之交','她留到最后，为你点亮归路。'),tone:'good',outcome:'你沿着药灯走过去。柳照青没有跟进井底，她把所有还够用的药符都留在了你掌心。'} : {label:'付 20 金币取药 · 恢复 16 生命',text:'她留药救急，也仍须偿还药材钱。',goldCost:20,heal:16,flags:{liuFinished:true},relationship:relation('守望相助','你补齐药钱，带走了她留在井边的药。'),tone:'good',outcome:'你把药钱压在木牌下。药瓶里没有机关，只有她认认真真调好的一味救急药。'},
            {label:`请教破瘴手法 · 失去 5 生命，获得「${CARDS[id].name}」`,text:CARDS[id].text,hpCost:5,cardIds:[id],flags:{liuFinished:true},relationship:relation('互授所长','柳照青替你引出瘴气，你也记下了她的破势手法。'),outcome:'以伤口为引，她从你经络里挑出一道黑线。疼痛之后，一个从未有过的出手顺序清楚起来。'},
            {label:'托她带一句平安回去',text:'没有即时数值变化。',flags:{liuFinished:true},relationship:relation(helped?'旧恩未忘':'萍水善缘','她答应将你仍活着的消息带到雾外。'),tone:'good',outcome:'她把你的话记在药方背面，字很端正。你们没有许下不可能的承诺，只互道一句保重。'}
          ],{connection:'药灯挂在岔路口，灯下留着尚未冷透的药。'});
        },
        ji_first() {
          const id = card();
          return eventFor('ji_first','ji',1,'断剑客的请求',[
            '一位衣领整齐的太微外门弟子被困在塌落剑阵边。他自称季临川，佩剑断了一截，手腕上系着宗门名牌。',
            '“同在雾中，能否搭一把手？”他指向阵外的石阶，许诺以剑诀相谢。'
          ],[
            {label:`替他破阵 · 失去 5 生命，获得「${CARDS[id].name}」`,text:CARDS[id].text,hpCost:5,cardIds:[id],flags:{jiHelp:true},relationship:relation('受你援手','你把他从剑阵里救出，收下了约好的剑诀。'),outcome:'季临川递出剑诀，行礼十分周到。你们互道保重，各自越过残阵。'},
            {label:'给他 12 金币请向导 · 得一枚护符',text:'下一场战斗首回合护盾 +5；护符只能用一次。',goldCost:12,guard:5,flags:{jiHelp:true},relationship:relation('欠你人情','你留钱替他脱困，收下一枚一次性的护符。'),outcome:'他把护符送给你，说这是外门弟子出门时的规矩。你将符折好，放进贴身的衣袋。'},
            {label:'不近剑阵，提醒他另寻出口',text:'没有数值变化。',flags:{jiHelp:false},relationship:relation('一面之缘','你提醒他另寻出口，未曾靠近残阵。'),outcome:'季临川收回伸出的手，向你道谢。你指过石阶的方向，继续赶路。'}
          ]);
        },
        ji_return() {
          const relic = chooseTreasure('mirror');
          const greedy = j.hidden.jiIntent === 'greedy';
          const hasTreasure = p.relics.some(id => TREASURE_RELICS.includes(id));
          const clue = greedy ? '他身后的脚印不止一串。有个陌生人看见你便转过身，季临川的手却还按着你的包裹。' : '他把一路借来的药钱逐一记在纸上，又主动退开半步，让你自己收好行囊。';
          return eventFor('ji_return','ji',2,'灯下验宝',[
            '断桥边，季临川又认出了你。他说自己刚从一处密室取出奇物，也听说你身上有了值钱的东西。', clue
          ],[
            {label:`收下他带出的奇物 · 支付 ${f.jiHelp?10:25} 金币，获得${relic?`「${RELICS[relic].name}」`:'60 金币'}`,text:relic?RELICS[relic].text:'秘宝已齐，改得60金币。',goldCost:f.jiHelp?10:25,relic,fallbackGold:60,flags:{jiExposed:true},relationship:relation('宝物已被看见','你从季临川手中取得奇物。'),tone:'warning',outcome:'奇物入手，确实有灵。季临川替你合上匣盖，指腹沿匣边的纹路抹去灰尘。'},
            hasTreasure ? {label:'请他验看随身秘宝 · 获得 25 金币',text:'展示秘宝，收取鉴宝情报费。',goldGain:25,flags:{jiExposed:true},relationship:relation('露宝','你给他看过随身秘宝，也收下了情报费。'),tone:'warning',outcome:'他准确报出秘宝的名字，钱也当场付清。灯罩后面响了一声，你回头时只看见晃动的影子。'} : {label:'只交换路讯 · 获得 10 金币',text:'不展示行囊，不取奇物。',goldGain:10,flags:{jiExposed:false},relationship:relation('保持距离','你交换了路讯，却没有给他看行囊。'),outcome:'你们各说了一段走过的路。季临川收起地图，付了约好的路讯钱。'},
            {label:'封好行囊，先走一步 · 下一战护盾 +6',text:'收紧护身符。下一战首回合 +6 护盾；不让他验看宝物。',guard:6,flags:{jiExposed:false},relationship:relation('心存戒备','你察觉他的打量，拒绝露出随身物品。'),outcome:'你借整理护符的动作封住包裹。季临川没有拦路，但这一次你没有把背影留给他。'}
          ],{connection:'断桥边的灯火晃动，照着案上的木匣。',risk:clue});
        },
        ji_final() {
          const robbery = f.jiExposed && j.hidden.jiIntent === 'greedy';
          const grateful = !!f.jiHelp && j.hidden.jiIntent === 'grateful';
          const id = card();
          if (robbery) return eventFor('ji_final','ji',3,'旧路重逢',[
            '你在逆仪石阶再次看见季临川。这次他没有行礼，两名同伙堵在身后，他的剑尖指着的正是你在灯下打开过的匣子。',
            f.jiHelp ? '“你救过我，我记得。”他避开你的目光，“但那件东西，够我换一生的前程。”旧恩没有让剑尖退后半寸。' : '“你既然敢把宝物拿出来，就该知道有人会跟。”他的声音很轻，路却已被封住。'
          ],[
            {label:'拔刃迎战 · 击败季临川，守住宝物',text:'进入真实战斗：生命 42，攻击 7 → 护盾5并攻击6 → 连击6×2。胜利得20金币与选牌；失败结束本局。',battle:fight('季临川'),flags:{jiRobbery:true},relationship:relation('反目成仇','季临川因看见你的秘宝而设伏，曾经的援手未能阻止他。'),tone:'warning',outcome:'你把匣子收进怀里，刃尖出鞘。这一次，不再给他把伸来的手说成求援的机会。'},
            {label:'付 35 金币买断此路',text:'保留全部遗物，支付35金币后脱离伏击。',goldCost:35,flags:{jiRobbery:true,jiEscaped:true},relationship:relation('人情已断','你付钱换路，保住了宝物，也看清了这个人。'),tone:'warning',outcome:'钱袋落地，你没有弯腰。季临川让开半步；在他数清钱以前，你已越过最后一道雾墙。'},
            {label:'用瘴雾断后 · 失去 8 生命，保住宝物',text:'当前生命须大于8。付出明确生命代价绕开战斗；不丢失遗物。',hpCost:8,flags:{jiRobbery:true,jiEscaped:true},relationship:relation('避开仇敌','你带伤脱身，保住了行囊。'),tone:'warning',outcome:'你划破掌心，将血撒入嗜灵雾中。雾追着血气合拢，你忍痛从另一侧翻下石阶。'}
          ],{connection:'断桥诸营：你曾让季临川知道宝物在你身上。如今追来的，是同一个人的剑。',risk:'夺宝者已经现身。此处可战斗、花钱脱身或带伤绕行。'});
          return eventFor('ji_final','ji',3,grateful?'还你一剑':'未出的那一剑',grateful?[
            '季临川守在井外的断墙边。他把前来打听你行踪的人打发走了，自己却留着一柄未曾收鞘的剑。',
            '“山门那次，我还记得。”他把一页剑诀推给你，“我进不了井底，至少替你守住这条退路。”'
          ]:[
            '井外有一串熟悉的脚印，季临川站在石柱后面。你看见他看了看行囊，随后又将剑收回鞘中。',
            j.hidden.jiIntent === 'greedy' ? '他的手在剑柄上停了片刻，最终只是掸去衣领上的石灰。' : '他向你侧身行礼，给石阶让出一人宽的空当。'
          ],[
            grateful ? {label:`接受回礼 · 获得「${CARDS[id].name}」，下一战护盾 +10`,text:CARDS[id].text,cardIds:[id],guard:10,flags:{jiFinished:true},relationship:relation('知恩守信','季临川兑现了承诺，替你守住退路。'),tone:'good',outcome:'他把剑诀交给你，转身守在墙外。你走出很远，还能听见他拒绝旁人靠近的声音。'} : {label:'相互让路 · 获得 12 金币',text:'交换最后一段安全路讯，不展示宝物。',goldGain:12,flags:{jiFinished:true},relationship:relation('相安无事','你们保持距离，各走各的路。'),outcome:'你卖给他一段刚刚走过的路讯。他付钱，让路；这一回，相逢没有变成刀剑。'},
            {label:'收紧护符，独自离去 · 下一战护盾 +5',text:'下一场战斗首回合获得5护盾，不收人情。',guard:5,flags:{jiFinished:true},relationship:relation(grateful?'人情未散':'谨慎作别',grateful?'你谢过他的守望，独自走向井口。':'你没有放下戒备，也没有主动拔剑。'),outcome:'你留下一句保重，顺着另一侧石阶离开。包裹仍封得严实，剑也仍在自己手中。'}
          ],{connection:'石阶上的脚印交错而过，剑仍收在鞘中。'});
        },
        wen_first() {
          return eventFor('wen_first','wen',1,'符锁下的人',[
            '玄烬符锁把一个削瘦的人钉在山门残柱上。她说自己叫闻人烛，曾为实验记数，直到记录里出现了同门的名字。',
            '“我知道她们如何封路。”她抬起染黑的手，“锁上的阵纹，我画过。只求你替我松开这一道。”'
          ],[
            {label:'断开符锁 · 失去 5 生命，获得 20 金币',text:'当前生命须大于5。',hpCost:5,goldGain:20,flags:{wenFreed:true},relationship:relation('解锁相助','你释放了闻人烛，锁中的黑印留在腕上。'),tone:'warning',outcome:'铁锁落地，一缕黑印从锁口缠到你腕上。闻人烛拿布替你擦过：“擦不净，得另找洗符砂。”'},
            {label:'付 15 金币买一页记录，不解锁',text:'获得阵眼记录，下一战首回合护盾 +6。',goldCost:15,guard:6,flags:{wenFreed:false,wenEvidence:true},relationship:relation('只谈交易','你买走了一页记录，没有替她断锁。'),outcome:'她把记录卷成细条递给你，指明一处可避开的阵眼。你记下了手法，却没有伸手碰锁。'},
            {label:'留下水，继续寻找出路',text:'没有数值变化。',flags:{wenFreed:false},relationship:relation('未施援手','你留下水，没有替她断锁。'),outcome:'她喝得很慢，没有再许诺什么。你走开时，听见她重新开始数锁上那些符文。'}
          ]);
        },
        wen_return() {
          const freed = !!f.wenFreed;
          return eventFor('wen_return','wen',2,'符息追来时',freed?[
            '断桥下，闻人烛果然带着洗符砂等你。她瘦了许多，手里的实验残页却用油纸包得很严。',
            '你腕上的黑印忽然发烫。追兵已循锁息靠近，她能现在洗去印记，也能带着证据抢先闯过封锁。'
          ]:[
            '闻人烛坐在断桥阴影里，手腕血肉模糊。她自己撬断了符锁，留下了一只无法再握笔的手。',
            '“账归账，路归路。”她认出你，却没有责问。她愿意卖出最后一段阵眼记录，换一包止痛药。'
          ],[
            freed ? {label:'付 15 金币买洗符砂 · 洗去黑印，恢复 6 生命',text:'以洗符砂擦去腕上黑印，恢复 6 生命。',goldCost:15,heal:6,flags:{wenCleansed:true,wenEvidence:true},relationship:relation('并肩脱险','你们洗去符息，约好在观测井外碰面。'),tone:'good',outcome:'黑印在砂中化开。闻人烛将湿布丢进火里，重新包好残页。'} : {label:'付 15 金币买记录 · 下一战护盾 +8',text:'支付15金币，获得下一战首回合8护盾。',goldCost:15,guard:8,flags:{wenEvidence:true},relationship:relation('证据买主','你买走阵眼记录，替她付了药钱。'),outcome:'她把阵眼一一指给你，直到你能独自复述。纸页边缘的血早已干了，字却仍辨认得清。'},
            freed ? {label:'保住残页，暂不洗印 · 获得 35 金币',text:'收下赶路的盘缠，不使用洗符砂。',goldGain:35,flags:{wenCleansed:false,wenEvidence:true},relationship:relation('带印同行','你保住残页，没有洗去腕上黑印。'),tone:'warning',outcome:'你们把钱和残页分装，赶在追兵前穿过断桥。手腕上的黑印仍贴着皮肤，触之微烫。'} : {label:'替她送一段口供 · 获得 20 金币',text:'带走证言，收下盘缠。',goldGain:20,flags:{wenEvidence:true},relationship:relation('替她作证','你答应把一段实验记录带出雾外。'),outcome:'她把那几个名字念了两遍，你也复述了两遍。如今至少有另一个活人知道她们曾经存在。'},
            {label:'各走各路，不再交易',text:'不支付代价，也不领取奖励。',flags:{wenCleansed:!!f.wenCleansed},relationship:relation(freed?'黑印仍在':'分道而行',freed?'你先行离开，手腕仍留着黑印。':'你与闻人烛分开，未再做交易。'),tone:freed?'warning':'neutral',outcome:freed?'你没有停下来洗印。闻人烛收回湿布，看着你越过桥下的石阶。':'你将水囊放回腰侧，朝井口走去。闻人烛留在桥下，继续寻找愿意听的人。'}
          ],{connection:freed?'腕上的黑印在火边泛着微光。':'闻人烛将残页摊平，用石子压住纸角。'});
        },
        wen_final() {
          const hunted = f.wenFreed && !f.wenCleansed, id = card();
          if (hunted) return eventFor('wen_final','wen',3,'证词与追猎',[
            '逆仪石阶上的黑印同时亮起。你腕上的锁息把玄烬追猎者引到了这里；她没有看闻人烛，只要求交出带走的记录。',
            '闻人烛挡在半步之外：“是我把你卷进来的。”她撕下一页阵图递来，至少还给你留下选择。'
          ],[
            {label:'与追猎者交锋 · 守住证词',text:'真实战斗：42生命，攻击7 → 护盾5并攻击6 → 连击6×2。胜利20金币与选牌，失败结束本局。',battle:fight('黑衣人'),flags:{wenFinished:true},relationship:relation('同担后患','救人的举动引来了追猎，你选择守住证词。'),tone:'warning',outcome:'你将阵图收入袖中。追猎者抬起刀，闻人烛退入石柱后；这一次，必须由你挡住来人。'},
            {label:'焚毁口供诱开追兵 · 失去 6 生命',text:'当前生命须大于6。保留自己的卡牌遗物，放弃故事中的证词；不触发战斗。',hpCost:6,flags:{wenFinished:true,wenEvidence:false,wenCleansed:true},relationship:relation('带伤脱身','你烧掉口供引开追兵，结束了这段追踪。'),tone:'warning',outcome:'符火吞下纸页，也灼伤了你手腕。追兵追着假阵眼远去，那些名字只剩你和闻人烛还记得。'},
            {label:'付 30 金币借暗道撤离',text:'保留卡牌、遗物及证词，支付30金币结束追踪。',goldCost:30,flags:{wenFinished:true,wenCleansed:true},relationship:relation('共逃一劫','你付了暗道的路钱，两人带着证词脱身。'),outcome:'闻人烛敲开一道石门。守门人只收钱，不问名字；门在追猎者的脚步到来前重新合拢。'}
          ],{connection:'黑印与石阶上的阵纹一同发亮，追猎者的脚步近了。'});
          return eventFor('wen_final','wen',3,'留存之证',[
            '闻人烛在观测井外等你。她将最后几页实验记录放在石头上，纸上列着被抹去的姓名，而非可供修炼的口诀。',
            f.wenEvidence ? '“你替我记住了那些名字。”她把一份破阵手法夹进记录，“这份不用再付钱。”' : '她已经不再求你救她，只问你愿不愿意让雾外的人知道，这里发生过什么。'
          ],[
            {label:`带出记录 · 获得「${CARDS[id].name}」，下一战护盾 +8`,text:CARDS[id].text,cardIds:[id],guard:8,flags:{wenFinished:true,wenEvidence:true},relationship:relation('证词同行者','你带走了实验记录，闻人烛将破阵手法留给你。'),tone:'good',outcome:'你把记录收好。她没有再提报偿，只仔细念完最后一个名字。符印不再发烫，路也终于安静下来。'},
            {label:'让她保管记录 · 恢复 10 生命',text:'接受一份洗符余药，不带走故事证词。',heal:10,flags:{wenFinished:true},relationship:relation('各自求生','你收下余药，托她自己带出记录。'),outcome:'闻人烛把余药递来，重新将记录包好。你们选择不同的出口，至少都不再被黑印牵着走。'},
            {label:'记住她的名字，独自离开',text:'没有数值变化。',flags:{wenFinished:true},relationship:relation('一段旧事','你记住了闻人烛这个名字。'),outcome:'她报过许多试验编号，直到这时，你才郑重地叫了她一声闻人烛。'}
          ],{connection:'纸上的名字一行行延伸，尽头压着一截干净的白绦。'});
        },
        sect_duel() {
          const id = card();
          return eventFor('sect_duel',null,0,'玄照门的试剑帖',[
            '玄照门弟子陆闻刀横剑拦住窄路，口称切磋，身后三人却正用脚踢开旁人的包袱。',
            '她不信有人能平安从雾里走来：“出一招，让我看看你有没有藏着别家的传承。”'
          ],[
            {label:'接下实战试剑 · 胜后领取正常战利品',text:'对战玄照门拦路客：42生命，攻击7 → 护盾5并攻击6 → 连击6×2。失败结束本局。',battle:fight('玄照门·拦路客'),tone:'warning',outcome:'你将包袱移到身后，示意她让同伴退开。所谓切磋，终于有了必须付出的分量。'},
            {label:`以伤换招 · 失去 6 生命，获得「${CARDS[id].name}」`,text:CARDS[id].text,hpCost:6,cardIds:[id],outcome:'三招之后，你退了半步，衣袖被划开。陆闻刀收剑，一招破绽也同时被你牢牢记住。'},
            {label:'绕开窄路，暂避锋芒',text:'没有代价，也没有奖励。',outcome:'你不必回答每一个伸来的剑尖。雾中还有别的路，这一次你自己选。'}
          ],{faction:'玄照门',whisper:'有些人以宗门为名，有些人只借宗门的名字。'});
        },
        herb_caravan() {
          return eventFor('herb_caravan',null,0,'百草庵的归程',[
            '百草庵弟子苏芩正把一车药草往雾外推。车上坐着两名并非她同门的伤者，她一边推车，一边埋怨他们太重。',
            '看见你来，她把车停稳：“救人归救人，可别踩我的药。你若愿意帮忙，我分你一包。”'
          ],[
            {label:'扶车过坎 · 恢复 12 生命，得 10 金币',text:'接受她的伤药和同行者凑出的谢礼。',heal:12,goldGain:10,tone:'good',outcome:'你把车轮抬过断阶。苏芩分药时多抓了一把，嘴上仍说是药草自己掉进去的。'},
            {label:'付 20 金币买足一程的伤药 · 恢复 24 生命',text:'治疗不超过最大生命。',goldCost:20,heal:24,outcome:'她收下钱，认真检查封口。你买的是药，也是他们下一段归路的盘缠。'},
            {label:'留出道路，互道平安',text:'没有数值变化。',outcome:'苏芩推车经过时，提醒你井边有一段石阶会回响。善意很短，却足够记住。'}
          ],{faction:'百草庵',whisper:'她救的人不全是同门，药却一份也没少给。'});
        },
        relic_dispute() {
          const relic = chooseTreasure('dream');
          return eventFor('relic_dispute',null,0,'两宗一匣',[
            '栖霞观与断岳宗各有一名弟子按住同一只匣子。匣子原本属于一个已经死去的散修，两人却都拿出了足够古老的宗门印信。',
            '“替我断个公道。”他们同时说。无论你向谁点头，另一只手都会离剑柄更近。'
          ],[
            {label:`以 35 金币买断争执 · 获得${relic?`「${RELICS[relic].name}」`:'60金币'}`,text:relic?RELICS[relic].text:'秘宝已齐，改得60金币。',goldCost:35,relic,fallbackGold:60,outcome:'两宗弟子先分了钱，才肯松开手。匣里的奇物归你，关于公道的话也忽然没人再提。'},
            {label:'替散修收殓 · 失去 4 生命，得 20 金币',text:'当前生命须大于4。取墓边未被污染的盘缠，不碰争议宝物。',hpCost:4,goldGain:20,outcome:'你替死者合眼，瘴气刺入指尖。那两人终于停下争吵，你只取走明白留给送葬人的铜钱。'},
            {label:'不替任何一宗背书',text:'没有数值变化。',outcome:'你将两份印信推回去。古老不等于有理，更不等于值得把命赔上。'}
          ],{faction:'栖霞观 / 断岳宗',whisper:'宝物只有一件，替它作证的印信却有两枚。'});
        },
        night_watch() {
          return eventFor('night_watch',null,0,'同一盏守夜灯',[
            '一位太微剑宗内门弟子与一位玄烬弃徒背靠背坐着，中间只有一盏防瘴灯。天亮以前，他们约好不问旧怨。',
            '守灯的青年许星沉挪出半个位置：“帮着守一刻，灯灭了，我们都得死。”'
          ],[
            {label:'接过守灯符 · 下一战护盾 +10',text:'下一场战斗首回合获得10护盾，用后消失。',guard:10,tone:'good',outcome:'这一刻没有人问你属于哪边。换班时，许星沉把余下的守灯符留给你，玄烬弃徒替你指出了背风的小路。'},
            {label:'分享 12 金币补给 · 恢复 14 生命，得 5 护盾援护',text:'支付12金币；护盾在下一场战斗首回合生效。',goldCost:12,heal:14,guard:5,outcome:'干粮按三份分开，灯油也添到正好的高度。你们没有成为朋友，却一起等过一阵风。'},
            {label:'独自绕过灯火',text:'没有代价，也没有奖励。',outcome:'你没有坐下。守灯的人仍将灯挪开半寸，让你看清面前的路。'}
          ],{faction:'太微剑宗 / 玄烬弃徒',whisper:'旧仇还在，今夜却得先活下去。'});
        }
      };
    }
    function makeEvent() {
      const p = state.player;
      const rare = cardPool().filter(id => CARDS[id].rarity === 'rare');
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
              '“你可以买一个梦，也可以卖掉一点过去。”她把空罐摆正，“井底的看守不挑食，但挑梦。”'
            ],
            choices: finishChoices([
              { label: `付 25 金币 · ${relic ? `买下秘宝「${RELICS[relic].name}」` : '换得 60 金币'}`, text: relic ? RELICS[relic].text : '秘宝已集齐：支付 25，得到 60，净赚 35 金币。', goldCost: 25, relic, fallbackGold: 60,
                outcome: '你打开一只写着“如果那晚我没有深入封域”的罐子。梦里多出一只手替你翻牌，醒来时指尖还带着琉璃的凉。' },
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
            description: '纸扎的戏台上，一名与你穿同样衣裳的行者正被蛇从背后咬住喉咙。戏还没有演完，你还可以改词。',
            story: [
              '纸扎的戏台在走廊尽头亮着。台上的纸偶与你穿同样的衣裳，正被一条蛇从背后咬住喉咙；台下没有观众，只有一排空椅在鼓掌。',
              '班主把一支蘸了朱砂的笔递给你：“放心，戏是假的。只是每次散场，总会少一个真的。”'
            ],
            choices: finishChoices([
              { label: `上台改戏 · 失去 8 生命，获得${mirror ? `秘宝「${RELICS[mirror].name}」` : '60 金币'}`, text: mirror ? RELICS[mirror].text : '秘宝已集齐，获得 60 金币。', hpCost: 8, relic: mirror, fallbackGold: 60,
                outcome: '你走上纸台，把戏本里的死亡改成一次反击。纸偶看了你一眼，把一面小镜塞进你的袖口；镜里，蛇的倒影先流了血。' },
              { label: `买下戏班的九命灯 · 付 45 金币，获得${nine ? `秘宝「${RELICS[nine].name}」` : '60 金币'}`, text: nine ? RELICS[nine].text : '秘宝已集齐：支付 45，得到 60，净赚 15 金币。', goldCost: 45, relic: nine, fallbackGold: 60,
                outcome: '你买下戏班最后一盏灯。灯芯里缠着九根猫须，熄灭时，台上那只纸偶朝你弓了弓背。' },
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
            description: '妇人举着半把伞，伞骨里空无一物。她说井底的看守最怕黑，而她已经很久没有影子了。',
            story: [
              '檐下雨声忽然停了。一名没有脸的妇人举着半把伞，问你能不能把影子借她一晚。',
              '“只要今晚。”她说，“明早我会把它还你。若不还，你也可以拿走我伞下的东西。”伞骨里蜷着两段不属于你的路。'
            ],
            choices: finishChoices([
              { label: `借出影子 · 最大生命 −6，获得「${CARDS[cards[0]].name}」「${CARDS[cards[1]].name}」与 35 金币`, text: '她拿走你的一小段黑，留下两段别人未走完的路。', maxHpCost: 6, cardIds: cards, goldGain: 35,
                outcome: '她把你的影子折好，藏进伞骨。作为交换，你得到两段别人没走完的路，以及一袋在雨里也不会湿的钱。' },
              { label: `陪她走到观测井 · 失去 10 生命，获得${relic ? `秘宝「${RELICS[relic].name}」` : '40 金币'}`, text: relic ? RELICS[relic].text : '秘宝已集齐，获得 40 金币。', hpCost: 10, relic, fallbackGold: 40,
                outcome: '你替她撑伞走到遗径尽头。她没有回头，只把伞柄塞进你手里；伞下多了一盏铃，铃舌是一小截蛇骨。' },
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
              { label: '当掉一段记忆 · 获得 65 金币，最大生命 −5', text: '你会忘记自己为何深入封域，但不会忘记怎么活下去。', maxHpCost: 5, goldGain: 65,
                outcome: '掌柜从你眉心揭下一层薄薄的旧影，像揭下一张用久了的符。金币沉进袖袋，你忽然想不起母亲的嗓音。' },
              { label: `付 40 金币 · ${relic ? `赎回秘宝「${RELICS[relic].name}」` : '换得 40 金币'}与「${CARDS[card].name}」`, text: relic ? RELICS[relic].text : '秘宝已集齐：支付 40，得到 40 金币与一张卡牌。', goldCost: 40, relic, cardIds: [card], fallbackGold: 40,
                outcome: '你赎回一片温热的旧鳞。鳞片贴在掌心时，一段不属于你的记忆从指缝里流过去，留下了一件宝贝。' },
              { label: `放走匣中一片蛇鳞 · 失去 6 生命，获得「${CARDS[card].name}」与 25 金币`, text: `${CARDS[card].text} 蛇鳞割手，但不会白割。`, hpCost: 6, cardIds: [card], goldGain: 25,
                outcome: '你撬开玻璃匣，那片鳞像活物一样卷住你的手指。掌柜没有拦你，只在账本上添了一行：欠蛇后一次。' }
            ], p)
          };
        },
        riftwatch() {
          const card = sample(rare, 1)[0], relic = chooseTreasure('jade');
          return {
            id: 'riftwatch', name: '封域望哨', glyph: '哨', faction: 'taiwei', kicker: 'TAIWEI WATCH / 断讯哨站',
            whisper: '“雾里若有人呼你旧名，别答。”',
            description: '太微剑宗留下的望哨已断讯三日。守哨人把名册反扣在掌心，不肯让你看最后一页。',
            story: ['灰白界碑之后，天色停在某个没有太阳的傍晚。两名剑宗弟子守着一位昏迷同伴，身后的符灯一盏盏朝着雾内倾斜。', '他们奉命查明玄烬教实验的反噬范围；可名册上写着四个人，这里却只有三个人。无人敢去问第四个的名字。'],
            choices: finishChoices([
              { label: `分出真气救人 · 失去 6 生命，得「${CARDS[card].name}」与 20 金币`, text: `${CARDS[card].text} 当前生命须大于 6。`, hpCost: 6, cardIds: [card], goldGain: 20, outcome: '伤者睁眼，只说井里还有东西。守哨人把一页剑诀和盘缠递来，随即抹掉了名册最后一行。' },
              { label: `付 20 金币补给 · 获得${relic ? `「${RELICS[relic].name}」` : '60 金币'}`, text: relic ? RELICS[relic].text : '遗物已齐，支付 20 后返还 60 金币。', goldCost: 20, relic, fallbackGold: 60, outcome: '他们收下补给，将一件从雾中带回的旧物交给你。剑宗不问你来历，只希望下一次有人活着走出界碑。' },
              { label: '记下警示后离开 · 恢复 6 生命', text: '不接名册，不问失踪者姓名。', heal: 6, outcome: '你在火边坐了片刻。临行时守哨人忽然问你们共有几个人；你没有回头替他数。' }
            ], p)
          };
        },
        supply() {
          const relic = chooseTreasure('vial');
          return {
            id: 'supply', name: '断桥军需', glyph: '桥', faction: 'guild', kicker: 'BROKEN BRIDGE / 灯下计价',
            whisper: '“钱能买路，买不了雾。”',
            description: '千灯商盟的货车悬在断桥中央。老板已经为每一件失物标好了价，也为每一个救货的人标好了价。',
            story: ['桥下没有河，只有缓慢翻动的黑雾。商盟把桥头灯架得很高，一车丹药却仍卡在不可能抵达的桥中央。', '老板不曾提救人；车夫的名字早被划掉。他只指着药箱，问你愿不愿意做一笔赚得不太干净的生意。'],
            choices: finishChoices([
              { label: `付 30 金币 · 买下${relic ? `「${RELICS[relic].name}」` : '60 金币'}`, text: relic ? RELICS[relic].text : '遗物已齐，支付 30 后得到 60 金币。', goldCost: 30, relic, fallbackGold: 60, outcome: '药箱隔着雾滑到你脚边，桥中央的货车却没有动。老板不再说车上还有别的什么。' },
              { label: '冒险搬货 · 失去 5 生命，得 45 金币', text: '当前生命须大于 5；黑雾侵蚀无视护盾。', hpCost: 5, goldGain: 45, outcome: '桥面咬住了你的一点血气。你抱回半只货箱，老板如数付钱，只多问了一句：另一半有没有哭？' },
              { label: '烤火后绕行 · 恢复 8 生命', text: '不碰货车，也不接受赊账。', heal: 8, outcome: '灯油里混着止痛的药香。你在桥头暖了暖手，选择走一条真正踩得到地面的路。' }
            ], p)
          };
        },
        cultlab() {
          const cards = rareCards(), relic = chooseTreasure('godblood');
          return {
            id: 'cultlab', name: '逆仪残室', glyph: '仪', faction: 'cult', kicker: 'BROKEN RITUAL / 归墟引灵',
            whisper: '残页上最后一行写着：不要让它知道自己被观察。',
            description: '玄烬教的归墟引灵实验在这里失控。阵盘从内向外翻开，血迹却全都指向同一个空位置。',
            story: ['魔教本想从归墟引来可供驱使的灵性，祭阵却把整片寒渊变成了实验容器。外界看不透，活物在这里也很难长久活着。', '石台上留有被匆忙撕碎的记录。有人回来收过证据，却独独没有碰那本还在自己翻页的手札。'],
            choices: finishChoices([
              { label: `读取禁页 · 失去 8 生命，获得「${CARDS[cards[0]].name}」「${CARDS[cards[1]].name}」`, text: '当前生命须大于 8；两张均为本职业稀有卡。', hpCost: 8, cardIds: cards, outcome: '两行无法念出的字化成了出招的直觉。你看懂了力量，却没有看懂记录者为何在最后画满自己的眼睛。' },
              { label: `触碰试剂 · 最大生命 −6，获得${relic ? `「${RELICS[relic].name}」` : '60 金币'}`, text: relic ? RELICS[relic].text : '秘宝已齐，改得 60 金币。', maxHpCost: 6, relic, fallbackGold: 60, outcome: '试剂像一颗反向跳动的心。你收走一滴，室内的阵盘忽然一起停住，仿佛终于确认了新的观察者。' },
              { label: '焚去残室 · 恢复 12 生命，得 15 金币', text: '带走安全补给，不再读取禁页。', heal: 12, goldGain: 15, outcome: '符火烧掉了纸页，却烧不掉纸页投下的影子。你只带走封存的丹药和几枚没有被污染的铜钱。' }
            ], p)
          };
        },
        swordgrave() {
          const card = sample(rare, 1)[0], technique = sample(cardPool().filter(id => CARDS[id].rarity === 'uncommon'), 1)[0];
          return {
            id: 'swordgrave', name: '寒碑剑冢', glyph: '剑', faction: 'taiwei', kicker: 'FROZEN SWORDS / 无名剑碑',
            whisper: '剑锋指向井底，碑文却只写了一个“退”字。',
            description: '失踪剑修的佩剑都插在这里。握柄上尚有余温，冰下却找不到任何人的脚印。',
            story: ['成排剑影沉在坚冰里，像一支等待号令的队伍。太微弟子的剑穗依然洁净，归路上的脚印却被什么从记忆里抹去了。', '碑后留着半段未完成的招式。你可以沿着那道伤痕推演，也可以先让这些无主之剑安静片刻。'],
            choices: finishChoices([
              { label: `以身试剑 · 失去 5 生命，获得「${CARDS[card].name}」`, text: `${CARDS[card].text} 当前生命须大于 5。`, hpCost: 5, cardIds: [card], outcome: '旧剑没有主人，却仍记得最后一场交手。你以一线血气接住残招，随后将它化成自己的出手。' },
              { label: `付 15 金币磨砺 · 移除一张基础牌，获得「${CARDS[technique].name}」`, text: '移除最早的一张本职业基础牌；牌组须至少保留 5 张。', goldCost: 15, removeBasic: true, cardIds: [technique], outcome: '你舍去一个不合时宜的起手式。旧剑的嗡鸣短了一拍，新的招式却比先前更清楚。' },
              { label: '替无主剑立碑 · 恢复 10 生命', text: '不索取剑诀。', heal: 10, outcome: '你替每一柄剑拨正剑穗。最后一缕霜气散去时，有人隔着很远的地方向你行了一礼。' }
            ], p)
          };
        },
        pilgrims() {
          return {
            id: 'pilgrims', name: '失序行营', glyph: '营', faction: 'wanderers', kicker: 'THE WANDERERS / 各怀心事',
            whisper: '“我只是来找人。”每一顶帐篷里都有人这么说。',
            description: '散修、逃兵和寻宝客挤在同一处营火旁。每个人都声称自己没有拿走不该拿的东西。',
            story: ['篝火照不出帐篷背面。有个探客兜售祖传护符，另一个正在用自己的牙齿换药；两人的口音完全相同，却互不相认。', '这里没有统一的命令，只有临时的价目。下一支入域的队伍正在挑向导，没有人肯第一个报出真名。'],
            choices: finishChoices([
              { label: '付 20 金币换伤药 · 恢复 22 生命', text: '治疗不超过最大生命。', goldCost: 20, heal: 22, outcome: '药师收钱后立刻烧掉收据。药是真的，伤口不再发冷；至于他为何知道你的伤在哪里，他不肯多说。' },
              { label: '出售前路情报 · 失去 6 生命，得 50 金币', text: '你须亲自探过一段受侵蚀的路；当前生命大于 6。', hpCost: 6, goldGain: 50, outcome: '你用伤痕证明情报不是编的。买主满意地付钱，随后在地图上把安全路段全都标成了自己的领地。' },
              { label: '替他们修好灯架 · 得 10 金币', text: '不加入任何队伍，也不付出生命。', goldGain: 10, outcome: '灯架稳住了，影子却没有。你收下一点谢礼，在他们开始争论谁的影子多了一条之前离开。' }
            ], p)
          };
        },
        prisoner() {
          const relic = chooseTreasure('mirror'), card = sample(rare, 1)[0];
          return {
            id: 'prisoner', name: '锁魂囚笼', glyph: '囚', faction: 'cult', kicker: 'A VOICE IN IRON / 旧实验体',
            whisper: '“我不是第一个，也不会是最后一个。”',
            description: '黑符封着一只空笼。笼内的声音自称玄烬旧徒，愿用一件实验产物换你断开一道锁。',
            story: ['囚笼从地底悬起，里面却空无一物。声音准确报出归墟引灵仪启动的时辰，随后又改口说，那也许是明天。', '玄烬残众回来搬走了同类试验体，唯独把这一只留在原地。锁上没有“危险”，只有一个被反复划掉的“失败”。'],
            choices: finishChoices([
              { label: `用血断锁 · 失去 7 生命，获得${relic ? `「${RELICS[relic].name}」` : '60 金币'}`, text: relic ? RELICS[relic].text : '秘宝已齐，改得 60 金币。', hpCost: 7, relic, fallbackGold: 60, outcome: '锁断时你没有看笼内。声音说它会记得这个人情；随后一件冰冷的旧物落下，比承诺更实在。' },
              { label: `付 25 金币买口供 · 获得「${CARDS[card].name}」`, text: `${CARDS[card].text} 只买招式，不替囚中人解锁。`, goldCost: 25, cardIds: [card], outcome: '它没有透露主使的名字，只教给你一段能活着接近观测井的招式。你记住了招式，没记住它最后喊出的称呼。' },
              { label: '封好黑符后离开 · 恢复 6 生命', text: '不释放笼中的东西。', heal: 6, outcome: '符纸重新贴紧铁栏。你听见笼里有人轻轻叹息，像失望，也像终于能睡。' }
            ], p)
          };
        },
        echo() {
          const cards = rareCards(), relic = chooseTreasure('moonheart');
          return {
            id: 'echo', name: '异声裂隙', glyph: '隙', faction: 'wanderers', kicker: 'AN UNNAMED ECHO / 不可名之隙',
            whisper: '裂隙里传来的是你尚未做出的回答。',
            description: '石壁裂成不合几何的角度。外界探查至此全数失效，只有一道影子始终面对着你。',
            story: ['远处的岩壁在同一个位置折了两次，雾从不可能的夹角里倒流。你想为它取一个名字，舌尖却忽然失去知觉。', '有人在这里留下许多测量绳，绳结全都回到了自己掌心。你不需要知道里面是什么，只需要决定取到什么程度。'],
            choices: finishChoices([
              { label: `用一段寿元换视野 · 最大生命 −5，得两张稀有卡与 20 金币`, text: `获得「${CARDS[cards[0]].name}」「${CARDS[cards[1]].name}」，最大生命至少保留 5。`, maxHpCost: 5, cardIds: cards, goldGain: 20, outcome: '你看见了两个尚未发生的出手，并把它们从未来带回。代价是某些很久以后的日子再也不会属于你。' },
              { label: `伸手取出裂隙之核 · 失去 8 生命，获得${relic ? `「${RELICS[relic].name}」` : '60 金币'}`, text: relic ? RELICS[relic].text : '秘宝已齐，改得 60 金币。', hpCost: 8, relic, fallbackGold: 60, outcome: '你抽回手，掌心多了一枚会随呼吸明灭的核心。裂隙变窄了些，仿佛只是把注意力移到了别处。' },
              { label: '收回目光，调息离开 · 恢复 10 生命', text: '不继续观察。', heal: 10, outcome: '你闭眼数过十次呼吸。再睁眼时，石壁仍是石壁；你把刚才看见的角度留在了身后。' }
            ], p)
          };
        },
        broker() {
          const relic = chooseTreasure('dream');
          return {
            id: 'broker', name: '千灯密约', glyph: '契', faction: 'guild', kicker: 'A PRIVATE CONTRACT / 千灯不灭',
            whisper: '“我们从不打听来源。只问，谁还知道它在你手里？”',
            description: '商盟代理人愿为玄烬残页付一笔好价钱，也愿意现在就把报酬预支给你。',
            story: ['代理人关掉身后九盏灯，只留一盏照着契纸。他说宗门要真相，残众要证据，散修要活路；商盟可以同时买下它们。', '这份密约不要求你交出最终残页，只出售一份从实验里流出的奇物。至少契纸上是这么写的。'],
            choices: finishChoices([
              { label: `付 40 金币签下暗单 · 获得${relic ? `「${RELICS[relic].name}」` : '60 金币'}`, text: relic ? RELICS[relic].text : '秘宝已齐，支付 40 后得到 60 金币。', goldCost: 40, relic, fallbackGold: 60, outcome: '代理人把奇物放在你面前，契纸立刻自行焚尽。账已结清；他提醒你，这句只对今晚有效。' },
              { label: '替商盟探一条险路 · 失去 6 生命，得 55 金币', text: '当前生命须大于 6；回来即结清这次报酬。', hpCost: 6, goldGain: 55, outcome: '你带回一段实测路线，代理人带走了你的标记。金币是真的，隐去名字的那一栏也是真的。' },
              { label: '婉拒暗单，借灯调息 · 恢复 6 生命', text: '不签契约，借灯休息片刻。', heal: 6, outcome: '他没有挽留，只替你拨亮最后一盏灯。灯光越过你肩头，照向了另一个将要入域的人。' }
            ], p)
          };
        }
      };
      Object.assign(builders, makeJourneyBuilders(p, rare), makeExpansionBuilders(p), makeSwordBuilders(p));
      const fixedEvents=['moon_trace','sealed_name','moon_vow','sovereign_wake','sovereign_recall','sovereign_memory','tainted_mercy','demonic_offer','demonic_warning','mirror_trial','demon_manual','fallen_hunt'];
      const ids = Object.keys(builders).filter(id => !CHAIN_EVENT_IDS.includes(id)&&!fixedEvents.includes(id));
      const unseen = ids.filter(id => !state.seenEvents.includes(id));
      const pool = unseen.length ? unseen : ids;
      const id = activeNode?.storyId || pool[rand(pool.length)];
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
      if (choice.flags) Object.assign(state.journey.flags, choice.flags);
      if (choice.guard) { state.journey.nextCombatBlock += choice.guard; received.push(`下一战首回合护盾 +${choice.guard}`); }
      if (state.event.npc) {
        const npc = state.event.npc;
        if (state.event.chapter === 1) state.journey.chain = npc;
        state.journey.step = Math.max(state.journey.step, state.event.chapter || 0);
        if (choice.relationship) state.journey.relationships[npc] = { ...choice.relationship };
      }
      if (choice.battle) state.event.battle = { ...choice.battle };
      recordJourney(state.event.npc, state.event.name, choice.journal || choice.outcome, choice.tone || 'neutral');
      state.event.received = received.length ? received.join(' · ') : '没有取走任何东西';
      note('异闻已了。看过这段结局，再决定是否继续深入封域。');
      emit();
      return true;
    }
    function leaveEvent() {
      if (state.screen !== 'event' || !state.event || !state.event.resolved) return false;
      const name = state.event.name;
      if (state.event.battle) {
        const encounter = state.event.battle;
        startBattle(encounter.kind || 'fight', encounter);
        note(`${encounter.name || ENEMIES[encounter.enemyId].name}已经封住去路。击退对方，才能继续。`);
        emit(); return true;
      }
      advance();
      note(`离开「${name}」，第 ${state.floor} 段已开放。`);
      emit();
      return true;
    }
    function getIntent() {
      const b=state.battle;if(!b)return null;
      const intent=ENEMIES[b.enemy.id].intents[b.enemy.intentIndex];
      const baseHits=(intent.hits||[]).slice(),chill=Math.max(0,b.enemy.chill||0);
      // A cleansing action removes frost before attacking; preview the resulting actual hits.
      const reduction=chill>=5&&!intent.clearChill?1:0;
      const hits=baseHits.map(amount=>Math.max(0,amount-reduction)),parts=[];
      if(intent.clearMark)parts.push('清除全部标记');
      if(intent.clearChill)parts.push('清除全部霜寒与未凝寒意');
      if(intent.clearBleed)parts.push('清除全部流血');
      if(intent.block)parts.push(`获得护盾 ${intent.block}`);
      if(hits.length===1)parts.push(`攻击 ${hits[0]}`);
      else if(hits.length>1)parts.push(hits.every(x=>x===hits[0])?`连续攻击 ${hits.length} 次，每次 ${hits[0]}`:`连续攻击 ${hits.join('／')}`);
      if(intent.poison)parts.push(`再施加 ${intent.poison} 层毒`);
      if(intent.counter)parts.push(`架势反击 ${intent.counter}（每张伤及生命的攻击牌一次，到下个敌方回合开始）`);
      if(intent.energyPenalty)parts.push(`下个玩家回合灵力 −${intent.energyPenalty}`);
      if(intent.drawPenalty)parts.push(`下个玩家回合少抽 ${intent.drawPenalty} 张牌`);
      const frozen=b.enemy.frozen===true, freezeChance=chill>=10?.10:0;
      let text=parts.join('，');
      if(reduction)text+='（霜寒压制：每段攻击 −1）';
      if(frozen)text='冰封：本次无法行动';
      else if(freezeChance&&b.enemy.frozen===null)text+='；10% 几率冰封，本次无法行动';
      return {...intent,hits:frozen?[]:hits,baseHits,chill,frozen,freezeChance,text};
    }

    state = freshState('title');
    const expedition = EXPEDITION.create({getState:()=>state,rng,heal,note,emit,event,log,beginEvents,cureAffliction,startBattle,advance,addRelic,relics:RELICS});
    expedition.resetRun();
    return {
      get state() { return state; }, newRun, enterRegion, enterNode, playCard, endTurn, resolveEnemyTurn,
      getInventory:expedition.getInventory, getItemUse:expedition.getItemUse, useItem:expedition.useItem, buyItem:expedition.buyItem, exploreCave:expedition.exploreCave, leaveCave:expedition.leaveCave,
      getProfile, importProfile, getAffliction, getCorruptionStatus, getEffectiveCard, buyAntidote, getEnvironment, getWeaponStatus, equipWeapon, buyWeapon, startHiddenBoss, leaveThreshold, chooseReward, chooseRelic, rerollReward, buyCard, removeCard, leaveShop, rest, fox, chooseEvent, leaveEvent, getAvailableNodes, getIntent
    };
  }

  const api = { ITEMS: EXPEDITION.ITEMS, ROUTE_TEMPLATES, WEAPONS, ENVIRONMENTS, CARDS, ENEMIES, RELICS, TREASURE_RELICS, FLOORS, STARTERS, CHARACTERS, FACTIONS, REGIONS, NPCS, CHAIN_EVENT_IDS, EVENT_IDS, CARD_GROUPS, createGame };
  root.NightPact = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis === 'undefined' ? window : globalThis);
