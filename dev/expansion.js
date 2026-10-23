/* Static rules for professions, equipment, regional hazards and the sword path. */
(function(root){
  'use strict';
  const CARDS={
    F01:{name:'摄魂',cost:1,text:'造成 6 点伤害；若敌人仍存活，获得 1 魂息。',target:true,attack:true},
    F02:{name:'夜幕',cost:1,text:'获得 6 点护盾。',target:false},
    F03:{name:'回响',cost:0,text:'获得 2 魂息。魂息上限 6，跨回合保留。',target:false},
    F04:{name:'归潮',cost:2,text:'消耗全部魂息，造成 10＋3×消耗层数的伤害。',target:true,attack:true},
    F05:{name:'影袭',cost:1,text:'连续攻击 3 次，每次 3 点伤害。',target:true,attack:true},
    F06:{name:'移影',cost:0,text:'获得 3 点护盾，抽 1 张牌。消耗。',target:false,exhaust:true},
    F07:{name:'魂衣',cost:1,text:'获得 8 点护盾；若当前魂息至少 3，再抽 1 张牌。',target:false},
    F08:{name:'引魂',cost:1,text:'抽 2 张牌。',target:false},
    F09:{name:'噬念',cost:1,text:'造成 5 点伤害，恢复 2 点生命。击杀或伤害被护盾阻挡仍治疗。',target:true,attack:true},
    F10:{name:'裂界',cost:2,text:'造成 16 点伤害；若已收回至少 2 份本源，再抽 1 张牌。',target:true,attack:true},
    F11:{name:'摄念',cost:0,text:'若魂息至少 2，消耗 2 魂息，获得 1 灵力并抽 1 张牌；不足时无收益。消耗。',target:false,exhaust:true},
    F12:{name:'万相归一',cost:3,text:'消耗全部魂息，造成 18＋4×消耗层数的伤害。',target:true,attack:true}
  };
  for(const [id,c]of Object.entries(CARDS)){c.character='sovereign';c.category=['F02','F06','F07'].includes(id)?'veil':'soul';c.rarity=['F10','F12'].includes(id)?'rare':['F04','F05','F07','F09','F11'].includes(id)?'uncommon':'common';c.attack=!!c.attack;c.exhaust=!!c.exhaust;}
  Object.assign(CARDS,{
    D01:{name:'借煞回生',cost:1,text:'造成 4 点伤害，恢复 6 生命。击杀或伤害被护盾阻挡仍治疗。',target:true,attack:true},
    D02:{name:'饮魄',cost:1,text:'造成 8 点伤害，恢复 3 生命。击杀或被护盾阻挡仍治疗。',target:true,attack:true},
    D03:{name:'夺脉',cost:2,text:'造成 16 点伤害，恢复 5 生命。击杀或被护盾阻挡仍治疗。',target:true,attack:true},
    D04:{name:'魔躯',cost:1,text:'获得 10 护盾。',target:false},
    D05:{name:'狂念',cost:0,text:'抽 2 张牌。消耗。',target:false,exhaust:true},
    D07:{name:'焚血斩',cost:1,text:'先失去 5 生命，再造成 18 点伤害。自损无视护盾，可以致命。',target:true,attack:true},
    D08:{name:'夺生指',cost:1,text:'造成 7 点伤害；恢复本次实际扣除敌人生命的数量，最多 7。护盾与过量伤害不计。',target:true,attack:true},
    D09:{name:'血衣',cost:0,text:'先失去 4 生命，再获得 13 护盾。自损可以致命。消耗。',target:false,exhaust:true},
    D10:{name:'逆脉',cost:0,text:'先失去 4 生命，再获得 1 灵力并抽 2 张牌。自损可以致命。消耗。',target:false,exhaust:true},
    D11:{name:'三劫噬心',cost:2,text:'连续攻击 3 次，每次 4 伤害；每段恢复实际扣除敌人生命的数量，最多 4。护盾与过量伤害不计。',target:true,attack:true},
    D12:{name:'血海归墟',cost:2,text:'先失去 8 生命，再造成 26 点伤害；恢复实际扣除敌人生命的数量，最多 10。自损可以致命。消耗。',target:true,attack:true,exhaust:true},
    D06:{name:'万煞归心',cost:3,text:'造成 26 点伤害，恢复 6 生命。击杀或被护盾阻挡仍治疗。',target:true,attack:true}
  });
  for(const [id,c]of Object.entries(CARDS))if(id.startsWith('D')){
    c.character='sword';c.category='demonic';c.locked=true;c.storyOnly=true;
    c.corruption=1;c.rarity=['D06','D12'].includes(id)?'rare':['D03','D04','D05','D07','D09','D10','D11'].includes(id)?'uncommon':'common';
    c.attack=!!c.attack;c.exhaust=!!c.exhaust;
  }
  const OUTFITS={
    mist:{id:'mist',name:'墨羽行衣',price:30,text:'每场战斗首回合额外抽 1 张牌。轻羽暗纹不碍出手。',draw:1},
    lotus:{id:'lotus',name:'青莲护心袍',price:45,text:'每个玩家回合开始时获得 2 护盾。莲纹随呼吸明灭。',block:2},
    ember:{id:'ember',name:'烬霞战衣',price:50,text:'每回合首张攻击第一段额外伤害 +2，计入首段增伤上限。',bonus:2},
    moon:{id:'moon',name:'月隐流纱',price:45,text:'每场战斗首回合额外获得 1 灵力。月纱只能在开战时聚灵。',energy:1},
    blood:{id:'blood',name:'血誓绛绡',price:55,text:'每回合首次因卡牌自损且存活后，获得 4 护盾。不会阻止致命自损。',selfBlock:4}
  };
  const BLOOD_EVENTS={
    blood_lesson:{name:'血盏中不肯散的光',story:['药阁的旧修将一缕血气压进剑锋：“命不能白取，自己的也一样。”她曾用禁术救回师妹，后来却开始把所有求医者当成试招的材料。','她愿意留下两种相反的手法：付出自己的生命换取爆发，或强行取走对手的生机。你也可以把经页封回匣中。'],choices:[
      {label:'以身为价，学焚血之术',text:'获得「焚血斩」「血衣」。使用禁术会扰动心神；清心玉可护灵台。',cardIds:['D07','D09'],learnDemonic:true,flags:{bloodMethod:'sacrifice'},outcome:'你记下先付代价再落剑的次序，没有把损失写到别人的账上。但这并不能使禁术没有危险。'},
      {label:'研读夺生经页',text:'获得「夺生指」。按实际生命伤害治疗；使用禁术会扰动心神。',cardIds:['D08'],learnDemonic:true,flags:{bloodMethod:'drain'},outcome:'指尖的热意来得太容易。药阁旧修看着你的神情，想起自己第一次不再嫌这术太快的时候。'},
      {label:'坚持剑道，抄下护心正诀',text:'获得「霜天壁」，并恢复 6 生命；不学习禁术。',cardIds:['S12'],heal:6,flags:{bloodMethod:'refuse'},outcome:'你抄下如何护住经脉，而非如何向经脉索取。她没有再劝，只将血盏盖好。'},
      {label:'不留下经页',text:'获得回春草 1 份，不学习禁术。',itemGrants:[{id:'herb',count:1}],flags:{bloodMethod:'leave'},outcome:'草药有用，劝诱仍留在药阁。你没有替那位从未见过的师妹判断这份救命之恩。'}]},
    blood_debt:{name:'谁的命拿来续命',story:['药阁旧修托人送来一只空药瓶，附信承认她把最后的药给了付得起钱的人。棚下的伤者因此只能等。','守棚人建议用俘虏练夺生之术。伤者却说：“若救我需要替我杀人，至少让我先说愿不愿意。”你先前选择的手法，此刻有了具体的人。'],choices:[
      {label:'以自身血气稳住伤者',text:'失去 5 生命，获得「逆脉」；当前生命须大于 5。',hpCost:5,cardIds:['D10'],learnDemonic:true,flags:{bloodDebt:'self'},outcome:'伤者得以等到下一次换药。你试着记住，这一次选择由你承担，不代表下次可以替别人承担。'},
      {label:'研究封存的夺生残谱',text:'付 25 灵石，取得「三劫噬心」。不向俘虏施术，代价由实战承担。',goldCost:25,cardIds:['D11'],learnDemonic:true,flags:{bloodDebt:'study'},outcome:'你买下封存残谱，没有在棚下试招。经文并不保证持有者永远记得今天划下的线。'},
      {label:'付药钱，护送双方出棚',text:'付 20 灵石，恢复 12 生命，获得解毒丹 1 份。',goldCost:20,heal:12,itemGrants:[{id:'antidote',count:1}],flags:{bloodDebt:'aid'},outcome:'俘虏帮着抬担架。敌对身份没有消失，但今天没有人被削成一瓶药。'},
      {label:'拒绝此术，留下普通药草',text:'不改变数值，不获得禁术。',flags:{bloodDebt:'refuse'},outcome:'你指出丹霞谷药棚的方向，拒绝替守棚人赞同他的提议。离开不使困境消失，至少没有再替它增加一具尸体。'}]},
    blood_choice:{name:'经末没有写下的人',story:['经卷最后一页写着“万命皆可为我”。下方有人补了一行小字，又被重重涂掉。','送信的人带来药棚的回执：仍有人活着，也仍有人死去，没有一种选择能抹掉所有损失。你终于读清被涂掉的字：“那我还算谁？”'],choices:[
      {label:'收下血海终篇',text:'获得「血海归墟」。先付生命再伤敌吸血；死亡不会靠后续吸血挽回。',cardIds:['D12'],learnDemonic:true,flags:{bloodEnding:'power'},outcome:'你合上经卷。它没有替你决定下一个人的命，只让那个决定更容易被做出。'},
      {label:'留一式夺生，不取血海',text:'获得「夺生指」「血衣」，不获得血海终篇。',cardIds:['D08','D09'],learnDemonic:true,flags:{bloodEnding:'limit'},outcome:'你给自己留下一条边界。边界不会自动守住，要靠以后的每一次出手。'},
      {label:'封存终篇，磨成自己的剑诀',text:'获得 「万川归寂」；恢复 10 生命，不逆转已经发生的异变。',cardIds:['S16'],heal:10,flags:{bloodEnding:'seal'},outcome:'你没有宣称从此无错，只把尚未做出的选择留在自己手里。已经走过的路，也不会被封书抹去。'},
      {label:'不再留卷，带走救命的药',text:'获得九转还元丹 1 份；不获得禁术，不逆转异变。',itemGrants:[{id:'fullheal_pill',count:1}],flags:{bloodEnding:'medicine'},outcome:'药放进包裹，书留在匣中。你没有为这一刻写一个永远有效的结论。'}]}
  };
  const ITEMS={
    clearheart_jade:{name:'清心玉',text:'澄澈的凉意贴着剑穗，能护住灵台。',quest:true,preventsCorruption:true}
  };
  const CORRUPTION={threshold:6,perDemonicCard:1,fallenAttackScale:.5,fallenBlockScale:.5,preventingItem:'clearheart_jade',irreversible:true};
  const STARTERS={sovereign:{character:'sovereign',name:'万相归潮',description:'聚拢魂息，以夜幕守身。寻回散落的本源，让封印前的力量逐一归来。',cards:['F01','F01','F01','F01','F02','F02','F02','F02','F03','F04']}};
  const CHARACTERS={sovereign:{id:'sovereign',name:'绯夜',profession:'无相宫主',portrait:'feiye',adult:true,locked:true,description:'从井下归来的成年女修。她不愿解释自己为何认识这里的每一盏灯，只说，有些东西该取回来了。',quote:'“我的名字，你还记得么？”',accent:'#d4b0e3',starters:['sovereign']}};
  const RELICS={veil:{name:'无相夜纱',text:'每个玩家回合首张攻击牌结算后，获得 1 魂息。魂息上限 6，跨回合保留。'}};
  const WEAPONS={
    training:{name:'行旅佩刃',requiredLevel:1,bonus:0,price:0,text:'普通随身佩刃，没有额外效果，也不会干扰出招。'},
    rime:{name:'听雪',requiredLevel:2,bonus:2,price:45,text:'每个玩家回合首张攻击牌的第一段伤害 +2。剑锋寒意凛冽。'},
    spirit:{name:'回灯',requiredLevel:2,bonus:1,price:45,text:'每个玩家回合首张攻击牌的第一段伤害 +1；每场战斗首回合获得 3 护盾。剑穗间有暖光流动。',block:3},
    divine:{name:'照夜',requiredLevel:4,bonus:4,price:70,text:'神剑：每回合首张攻击牌的第一段伤害 +4。剑中灵性强盛，握持时隐有抗拒；可先收入剑匣。',sentient:true}
  };
  const ENVIRONMENTS={
    fog_gate:{id:'miasma',name:'迷路雾',text:'本章每场战斗首个玩家回合少抽 1 张牌；之后恢复正常。',firstTurnDrawPenalty:1},
    broken_camp:{id:'headwind',name:'逆灵风',text:'本境每场战斗首个玩家回合灵力 −1；之后恢复正常。',energy:1},
    ritual_core:{id:'soulrift',name:'离魂隙',text:'本章每个玩家回合首张攻击牌的第一段基础伤害 −1，最低为 0；额外剑器增伤照常结算。',firstAttackPenalty:1}
  };
  const ENEMIES={
    gate_boss:{rank:'boss',name:'渡灯人',hp:65,intents:[{name:'横灯',text:'攻击 9',hits:[9]},{name:'护灯',text:'清除全部流血，获得护盾 8，然后攻击 6',clearBleed:true,block:8,hits:[6]},{name:'双焰',text:'连续攻击 2 次，每次 5',hits:[5,5]}]},
    camp_boss:{rank:'boss',name:'缚誓者',hp:85,intents:[{name:'缚誓',text:'攻击 12',hits:[12]},{name:'旧甲',text:'清除全部霜寒，获得护盾 9，架势反击 2',clearChill:true,block:9,counter:2},{name:'断桥三式',text:'连续攻击 3 次，每次 4',hits:[4,4,4]}]},
    apothecary:{rank:'elite',name:'裴隐',hp:60,intents:[{name:'药刃',text:'攻击 8',hits:[8]},{name:'藏卷',text:'清除全部流血，获得护盾 7，然后攻击 5',clearBleed:true,block:7,hits:[5]},{name:'封脉',text:'连续攻击 2 次，每次 6，下个玩家回合灵力减少 1',hits:[6,6],energyPenalty:1}]},
    feiye:{rank:'boss',name:'绯夜',hp:120,intents:[{name:'绛月',text:'攻击 11',hits:[11]},{name:'薄夜',text:'获得护盾 9，然后攻击 6',block:9,hits:[6]},{name:'魂雨',text:'连续攻击 3 次，每次 4，并施加 2 层毒',hits:[4,4,4],poison:2},{name:'归寂',text:'清除全部猎印与霜寒，然后攻击 16',clearMark:true,clearChill:true,hits:[16]}]},
    feiye_echo:{rank:'boss',name:'镜中人',hp:48,intents:[{name:'照影',text:'攻击 8',hits:[8]},{name:'碎镜',text:'获得护盾 6，然后攻击 5',block:6,hits:[5]},{name:'余响',text:'连续攻击 2 次，每次 5，下个玩家回合少抽 1 张牌',hits:[5,5],drawPenalty:1}]},
    retainer:{rank:'boss',name:'卫烬',hp:56,intents:[{name:'问候',text:'获得护盾 5，然后攻击 8',block:5,hits:[8]},{name:'旧誓',text:'攻击 12，架势反击 3',hits:[12],counter:3},{name:'断盟',text:'连续攻击 3 次，每次 4',hits:[4,4,4]}]},
    heart:{rank:'elite',name:'无名心影',hp:60,intents:[{name:'旧梦',text:'攻击 10，并施加 1 层毒',hits:[10],poison:1},{name:'执念',text:'清除全部猎印与流血，再获得护盾 10，下个玩家回合少抽 1 张牌',clearMark:true,clearBleed:true,block:10,drawPenalty:1},{name:'自问',text:'连续攻击 2 次，每次 7',hits:[7,7]}]},
    snake_ascended:{rank:'boss',name:'绛鳞',hp:120,intents:[{name:'黑鳞刃',text:'攻击 12',hits:[12]},{name:'蚀灵息',text:'先攻击 7，再施加 3 层毒',hits:[7],poison:3},{name:'逆仪蜕鳞',text:'清除全部猎印、霜寒与流血，获得护盾 12，然后攻击 5',clearMark:true,clearChill:true,clearBleed:true,block:12,hits:[5]},{name:'囚月',text:'连续攻击 3 次，每次 6',hits:[6,6,6]}]}
  };
  const EVENT_IDS=['moon_trace','sealed_name','moon_vow','armory','sovereign_wake','sovereign_recall','sovereign_memory','tainted_mercy','demonic_offer','demonic_warning','mirror_trial','demon_manual','fallen_hunt'];
  const api={OUTFITS,BLOOD_EVENTS,CARDS,STARTERS,CHARACTERS,RELICS,WEAPONS,ENVIRONMENTS,ENEMIES,EVENT_IDS,ITEMS,CORRUPTION};
  root.NightExpansion=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis==='object'?globalThis:window);
