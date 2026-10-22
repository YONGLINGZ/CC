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
    D06:{name:'万煞归心',cost:3,text:'造成 26 点伤害，恢复 6 生命。击杀或被护盾阻挡仍治疗。',target:true,attack:true}
  });
  for(const [id,c]of Object.entries(CARDS))if(id.startsWith('D')){
    c.character='sword';c.category='demonic';c.locked=true;c.storyOnly=true;
    c.corruption=1;c.rarity=id==='D06'?'rare':['D03','D04','D05'].includes(id)?'uncommon':'common';
    c.attack=!!c.attack;c.exhaust=!!c.exhaust;
  }
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
    feiye:{rank:'boss',name:'绯夜',hp:120,intents:[{name:'绛月',text:'攻击 11',hits:[11]},{name:'薄夜',text:'获得护盾 9，然后攻击 6',block:9,hits:[6]},{name:'魂雨',text:'连续攻击 3 次，每次 4，并施加 2 层毒',hits:[4,4,4],poison:2},{name:'归寂',text:'清除全部标记与霜寒，然后攻击 16',clearMark:true,clearChill:true,hits:[16]}]},
    feiye_echo:{rank:'boss',name:'镜中人',hp:48,intents:[{name:'照影',text:'攻击 8',hits:[8]},{name:'碎镜',text:'获得护盾 6，然后攻击 5',block:6,hits:[5]},{name:'余响',text:'连续攻击 2 次，每次 5，下个玩家回合少抽 1 张牌',hits:[5,5],drawPenalty:1}]},
    retainer:{rank:'boss',name:'卫烬',hp:56,intents:[{name:'问候',text:'获得护盾 5，然后攻击 8',block:5,hits:[8]},{name:'旧誓',text:'攻击 12，架势反击 3',hits:[12],counter:3},{name:'断盟',text:'连续攻击 3 次，每次 4',hits:[4,4,4]}]},
    heart:{rank:'elite',name:'无名心影',hp:60,intents:[{name:'旧梦',text:'攻击 10，并施加 1 层毒',hits:[10],poison:1},{name:'执念',text:'清除全部标记与流血，再获得护盾 10，下个玩家回合少抽 1 张牌',clearMark:true,clearBleed:true,block:10,drawPenalty:1},{name:'自问',text:'连续攻击 2 次，每次 7',hits:[7,7]}]},
    snake_ascended:{rank:'boss',name:'绛鳞',hp:120,intents:[{name:'黑鳞刃',text:'攻击 12',hits:[12]},{name:'蚀灵息',text:'先攻击 7，再施加 3 层毒',hits:[7],poison:3},{name:'逆仪蜕鳞',text:'清除全部标记、霜寒与流血，获得护盾 12，然后攻击 5',clearMark:true,clearChill:true,clearBleed:true,block:12,hits:[5]},{name:'囚月',text:'连续攻击 3 次，每次 6',hits:[6,6,6]}]}
  };
  const EVENT_IDS=['moon_trace','sealed_name','moon_vow','armory','sovereign_wake','sovereign_recall','sovereign_memory','tainted_mercy','demonic_offer','demonic_warning','mirror_trial','demon_manual','fallen_hunt'];
  const api={CARDS,STARTERS,CHARACTERS,RELICS,WEAPONS,ENVIRONMENTS,ENEMIES,EVENT_IDS,ITEMS,CORRUPTION};
  root.NightExpansion=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis==='object'?globalThis:window);
