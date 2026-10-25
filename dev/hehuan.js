/* 合欢宗 · 晏绮罗。Pure data/presentation helpers; authoritative effects live in engine.js. */
(function(root){
  'use strict';
  const CONDITION_TEXT={attack:'敌人攻击时',nonattack:'敌人不攻击时',action:'敌人行动时'};
  const trap=(condition,text,before={},after={},extra={})=>({condition,text,before,after,...extra});
  const CARDS={
    H01:{name:'撩弦',cost:1,text:'造成 6 点伤害。',target:true,attack:true,archetype:'lure',trap:trap('attack','敌人攻击的整招结束后，造成 8 点伤害。',{}, {damage:8})},
    H02:{name:'流纱',cost:1,text:'获得 6 点护盾。',target:false,archetype:'lure',trap:trap('attack','敌人攻击前，获得 8 点护盾。',{block:8})},
    H03:{name:'请君近前',cost:1,text:'造成 4 点伤害，抽 1 张牌。',target:true,attack:true,archetype:'lure',trap:trap('attack','敌人攻击前获得 4 点护盾；整招结束后造成 7 点伤害。',{block:4},{damage:7})},
    H04:{name:'偷香',cost:1,text:'造成 4 点伤害，获得 4 点护盾。',target:true,attack:true,archetype:'opening',trap:trap('nonattack','敌人不攻击的动作结束后，造成 10 点伤害。',{}, {damage:10})},
    H05:{name:'回眸',cost:1,text:'抽 2 张牌。',target:false,archetype:'weave',trap:trap('action','敌人整次行动后，下个玩家回合额外抽 2 张牌，并在回合开始时获得 3 点护盾。',{}, {drawNext:2,blockNext:3})},
    H06:{name:'幻席',cost:0,text:'选择 1 张已藏牌，保留原藏招并复制到手中，再抽 1 张牌。不能复制幻席。复制牌仍付原费用，使用后消耗，仅本场有效。消耗。',target:false,exhaust:true,archetype:'weave',trap:trap('action','敌人整次行动后，下个玩家回合额外获得 1 点灵力。消耗。',{}, {energyNext:1})},
    H07:{name:'借势',cost:2,text:'造成 10 点伤害，获得 6 点护盾。',target:true,attack:true,archetype:'lure',trap:trap('attack','敌人攻击前获得 6 点护盾；整招结束后造成 12 点伤害。',{block:6},{damage:12})},
    H08:{name:'乱息',cost:1,text:'获得 6 点护盾，移除自身 1 层普通战斗毒；不解除旅途异状。',target:false,archetype:'opening',trap:trap('action','敌人行动前获得 4 点护盾，并抵消本次动作将新增的 1 层毒或追索印：优先毒，无毒才抵消追索印。只一次，不清已有状态，已有信物的援助先抵消。',{block:4,cleanseIncoming:1})},
    H09:{name:'解带',cost:1,text:'先移除敌人 6 点护盾，再造成 4 点伤害。',target:true,attack:true,archetype:'opening',trap:trap('nonattack','敌人不攻击的动作结束后，先移除其 10 点护盾，再造成 6 点伤害。',{}, {removeBlock:10,damage:6})},
    H10:{name:'两清',cost:2,text:'造成 12 点伤害。消耗。',target:true,attack:true,exhaust:true,archetype:'weave',trap:trap('action','敌人整次行动后造成 10 点伤害；若实际伤到生命且自身仍存活，恢复自身 2 点生命。消耗。',{}, {damage:10,healOnLife:2})},
    H11:{name:'空席',cost:1,text:'获得 7 点护盾。',target:false,archetype:'weave',trap:trap('action','敌人行动开始时，若它是唯一藏招，先获得 10 点护盾，整招结束后造成 8 点伤害；否则失效。',{block:10},{damage:8},{onlyTrap:true})},
    H12:{name:'满堂红',cost:3,text:'造成 18 点伤害。',target:true,attack:true,archetype:'lure',trap:trap('action','敌人整次行动后，造成 26 点伤害。',{}, {damage:26})}
  };
  Object.assign(CARDS,{
    H13:{name:'欲擒故纵',cost:1,text:'撤下最后放入的一张藏招，退回该牌已支付的灵力；原牌按规则弃置或消耗。再获得3护盾。没有藏招仍获盾。',trap:trap('attack','敌人攻击前获得5护盾，整招结束后下回合额外获得1灵力。',{block:5},{energyNext:1})},
    H14:{name:'红绡借刃',cost:1,text:'造成6伤害；若已有两张藏招，额外增加4伤害，不消耗藏招。',attack:true,target:true,trap:trap('attack','敌人攻击结束后，连续攻击2次，每次5伤害。',{}, {damage:5,hits:2})},
    H15:{name:'隔帘听雨',cost:0,text:'获得2护盾，每有一张藏招再加2护盾。消耗。',exhaust:true,trap:trap('nonattack','敌人不攻击的动作结束后，下回合额外获得1灵力、抽1张。消耗。',{}, {energyNext:1,drawNext:1})},
    H16:{name:'花信误',cost:1,text:'获得5护盾；若自身有追索印，再使本回合下一张攻击首段伤害+5。不清印。',trap:trap('action','敌人行动前获得2护盾，结束后移除敌人4护盾，下回合额外抽1张。',{block:2},{removeBlock:4,drawNext:1})},
    H17:{name:'以柔缚刚',cost:2,text:'获得10护盾，本轮每次护盾挡住攻击时反击2伤害，到下回合清除。',trap:trap('attack','敌人攻击前获得10护盾，整招结束后移除其6护盾。',{block:10},{removeBlock:6})},
    H18:{name:'香销玉暖',cost:1,text:'恢复3生命；若没有藏招，改为恢复5生命。消耗。',exhaust:true,trap:trap('action','敌人行动结束后，自身仍存活则恢复3生命。消耗。',{}, {heal:3})},
    H19:{name:'留客盏',cost:1,text:'抽1张牌；若抽牌前手牌不多于3张，改为抽2张。',trap:trap('attack','敌人攻击前抵消本次新增的1层毒或追索印，优先毒；结束后下回合额外1灵力。', {cleanseIncoming:1},{energyNext:1})},
    H20:{name:'偷梁换柱',cost:0,text:'交换两张藏招的结算顺序（不足两张不交换），然后抽1张牌。消耗。',exhaust:true,trap:trap('action','敌人行动前获得3护盾，结束后下回合额外抽1张。消耗。',{block:3},{drawNext:1})},
    H21:{name:'同心结',cost:1,text:'获得4护盾，每有一张藏招再加2护盾。',trap:trap('action','敌人行动前，每张藏招提供3护盾；结束后，每张藏招造成3伤害。按行动开始时的藏招数计算。',{blockPerTrap:3},{damagePerTrap:3})},
    H22:{name:'落花逐水',cost:1,text:'依次造成1、3、5点伤害。首段增幅只作用于第一段。',attack:true,target:true,trap:trap('nonattack','敌人不攻击的动作结束后，造成4伤害，下回合额外抽2张。',{}, {damage:4,drawNext:2})},
    H23:{name:'藏月入袖',cost:1,text:'弃置手中最左侧一张牌（没有则不弃），然后抽2张。',trap:trap('action','敌人行动结束后，下回合额外抽3张，但少获得1灵力。',{}, {drawNext:3,energyTax:1})},
    H24:{name:'无声挑灯',cost:1,text:'清除敌人当前架势反击，再获得5护盾，不阻止其以后重新架势。',target:true,trap:trap('action','敌人行动前抵消本次新增的1层毒或追索印，结束后移除其8护盾。',{cleanseIncoming:1},{removeBlock:8})},
    H25:{name:'笑里藏针',cost:2,text:'先造成4伤害，每有一张藏招再攻击一次、每次4伤害，不消耗藏招。',attack:true,target:true,trap:trap('attack','敌人攻击结束后，连续攻击3次，每次3伤害。',{}, {damage:3,hits:3})},
    H26:{name:'春风照影',cost:0,text:'敌人获得3护盾；下个玩家回合开始时获得5护盾。消耗。',trap:trap('nonattack','敌人不攻击的动作结束后，移除其全部护盾并恢复自身2生命。消耗。',{}, {removeAllBlock:true,heal:2}),exhaust:true},
    H27:{name:'双生绡',cost:1,text:'若已有两张藏招，本回合下一张攻击首段伤害+6；否则抽2张牌。',trap:trap('action','敌人行动结束后，若行动开始时有两张藏招，下回合额外2灵力；否则额外抽2张。',{}, {pairedResources:true})},
    H28:{name:'燃香待客',cost:1,text:'本场每个玩家回合首次放入藏招时，获得2护盾；多次施放最多升至4护盾。消耗。',exhaust:true,trap:trap('action','敌人行动前获得2护盾，结束后恢复1生命、下回合额外抽1张。消耗。',{block:2},{heal:1,drawNext:1})},
    H29:{name:'断线风筝',cost:1,text:'移除自身2层普通战斗毒和2层追索印，再抽1张；不解除旅途异状。',trap:trap('attack','敌人攻击前获得4护盾；结束后清除其当前架势反击，下回合额外抽1张。',{block:4},{clearCounter:true,drawNext:1})},
    H30:{name:'帘外惊鸿',cost:2,text:'造成9伤害；弃牌堆每有一种合欢牌，伤害+1，最多+6。',attack:true,target:true,trap:trap('nonattack','敌人不攻击的动作结束后造成6伤害；弃牌堆每种合欢牌额外+1，最多+6。',{}, {damage:6,discardDiversity:6})},
    H31:{name:'余音绕梁',cost:1,text:'本战每已触发3张藏招，额外抽1张，最多额外2张；基础抽1张。',trap:trap('action','敌人行动结束后，下回合额外抽1张并在开始时获得4护盾。',{}, {drawNext:1,blockNext:4})},
    H32:{name:'捧心问月',cost:2,text:'消耗剩余全部灵力，恢复2＋2×额外消耗灵力的生命，最多恢复8。消耗。',exhaust:true,trap:trap('action','敌人行动结束后，若它是唯一藏招恢复4生命，否则恢复2生命；下回合额外抽1张。消耗。',{}, {healBySolitude:true,drawNext:1})},
    H33:{name:'红尘织梦',cost:2,text:'本场每张藏招第一段伤害额外+2，最多叠至+4，计入额外增幅上限8；抽1张。消耗。',exhaust:true,rarity:'rare',trap:trap('action','敌人行动前使其获得4护盾，结束后造成14伤害。消耗。',{enemyBlock:4},{damage:14})},
    H34:{name:'千面一笑',cost:1,text:'若两张藏招的触发条件不同，获得10护盾并抽1张；否则获得4护盾。',trap:trap('action','敌人行动前，若两张藏招的触发条件不同获得9护盾，否则获得4护盾。',{diverseBlock:true})},
    H35:{name:'倾城一舞',cost:3,text:'造成6＋8×当前藏招数的伤害，再获得5×藏招数的护盾；不消耗藏招。',attack:true,target:true,rarity:'rare',trap:trap('action','敌人行动结束后造成12伤害，若自身仍存活恢复2生命，下回合额外抽1张。',{}, {damage:12,heal:2,drawNext:1})},
    H36:{name:'百转归心',cost:3,text:'消耗弃牌堆最新的最多3张合欢牌；每实际消耗1张，获得1灵力并造成5伤害。没有则无收益。消耗。',attack:true,target:true,exhaust:true,rarity:'rare',trap:trap('action','敌人行动结束后，消耗区每有一种合欢牌造成2伤害，最多18；下回合开始时获得2护盾。消耗。',{}, {exhaustDiversity:2,blockNext:2})}
  });
  for(const id of ['H13','H14','H15','H16','H18','H19','H20','H21','H22','H23','H24','H29','H31'])CARDS[id].rarity='common';
  for(const [id,c]of Object.entries(CARDS))Object.assign(c,{id,character:'hehuan',category:'hehuan',target:!!c.target,rarity:c.rarity||(['H10','H12'].includes(id)?'rare':['H06','H07','H08','H09','H11'].includes(id)||Number(id.slice(1))>12?'uncommon':'common'),attack:!!c.attack,exhaust:!!c.exhaust});
  const STARTERS={hehuan:{character:'hehuan',name:'纱里藏招',description:'同一张牌可以立即出手，也可以藏进两个纱位，等敌人行动时兑现。每战三次观息只辨攻击与否，不预告招式。',cards:['H01','H01','H02','H02','H02','H03','H03','H04','H04','H05']}};
  const CHARACTERS={hehuan:{id:'hehuan',name:'晏绮罗',profession:'合欢宗外堂执事',portrait:'hehuan',adult:true,age:28,locked:false,faction:'hehuan',initialHp:56,initialRelic:'heartmirror',description:'她擅长把杀招藏进薄纱，等敌人自己撞上来。此次入域，要找回被宗门卖掉的成年师妹秦蘅，取得长老交人给祭仪的账册。',quote:'看够了吗？看够了，就该看我的手了。',accent:'#b5965b',starters:['hehuan']}};
  const RELICS={heartmirror:{name:'照心镜',text:'每场战斗可观息 3 次，每个玩家回合最多一次，0 灵力。只看下一次动作是攻击还是不攻击，不显示招名、伤害、段数或附加状态；读的是已确定动作，不重抽。'}};
  const FACTION={hehuan:{id:'hehuan',name:'合欢宗',description:'魔门之一，以互惠修行为名，外堂也替宗内交涉与收账。有长老暗中将弟子交给玄烬教祭仪；晏绮罗的身份不等于她替此事担保。'}};
  const ITEMS={
    hehuan_route_copy:{id:'hehuan_route_copy',name:'路引签押抄件',text:'晏绮罗当面对照过的路引。宋箴的签押与接收地点仍在，可用于找到秦蘅时的交涉；不是站队凭证，不使P2洞府自动敌对。',icon:'learned'},
    hehuan_ledger_original:{id:'hehuan_ledger_original',name:'交人账册原件',text:'记录合欢宗长老将弟子交给祭仪的原件。可公开、交回、据此索价或焚毁；每种处置只结算一次。',icon:'learned'},
    hehuan_ledger_copy:{id:'hehuan_ledger_copy',name:'已公开账册副本',text:'公开原件后留下的可核验副本。秦蘅有自己的去向，不因证词公开就欠下一份终身听命的契约。',icon:'learned'}
  };
  const STORY_IDS=['hehuan_checkpoint','hehuan_qinheng','hehuan_ledger'];
  const PERSONAL_SLOTS=[7,35,57];
  const COSTS=Object.freeze({guarantee:18,checkpointPay:14,buyLedger:48,hushMoney:55,publishGuard:14,returnLedger:65,leverage:32,burnHeal:10});
  const ENCOUNTERS={patrol:{enemyId:'orthodox_patrol',kind:'fight',name:'巡使·岳衡'},agent:{enemyId:'raider',kind:'elite',name:'宗门代理·宋箴'}};
  const INITIAL_STORY=[
    '接应者把一页接收地点塞到扇下：“长老只要账册。秦蘅要是还活着，也别带她出封域。”',
    '“她是我带进门的。”晏绮罗按住纸角。接应者笑了：“替她出头，外堂的药钱就别想再领。”',
    '她把扇子合上：“行。那这趟我连账也一起算。”'
  ];
  const TUTORIAL='手牌可以立即使用，也可以付相同灵力藏进薄纱。最多两张，等下一次敌方实际行动，条件不符便落空且不退费。观息每战三次、每回合一次；用完后仍可明用、布通用条件，或两槽分别应对两类动作。';
  function flags(state){return state?.journey?.hehuan?.flags||{};}
  function hasItem(state,id){return (state?.player?.questItems||[]).includes(id);}
  function ownsLedger(state){return !!flags(state).ledgerOriginal&&hasItem(state,'hehuan_ledger_original');}
  const C=(key,label,text,outcome,effects={})=>({key,label,text,outcome,...effects});
  const battleChoice=(key,label,text,outcome,encounter,victoryFlags,victoryOutcome,victoryItems=[])=>C(key,label,text,outcome,{battle:{...encounter,hehuanBattle:{victoryFlags,victoryOutcome,victoryItems}},hehuanBattle:{...encounter,victoryFlags,victoryOutcome,victoryItems}});
  function scene(id,step,name,story,choices,state){return {id,name,glyph:'纱',kicker:'合欢旧案',hehuanStory:{id,step},story,connection:state?.journey?.hehuan?.lastOutcome||'',choices};}
  function buildEvent(id,state){
    if(!STORY_IDS.includes(id))return null;
    const f=flags(state);
    if(id==='hehuan_checkpoint')return scene(id,1,'门前的路引',[
      '巡使岳衡拦住一名合欢宗信使，地上散着三张路引：“昨夜失踪三个人，有人看见你把他们带进山门。”',
      '信使季远指着签押：“路引是我送的，人是宋箴领走的。你不问他，拿我顶罪？”晏绮罗蹲下拾纸：“签了字的人，得把话说清楚。”'
    ],[
      C('guarantee','替信使交钱担保',`支付 ${COSTS.guarantee} 灵石；信使暂时获释，你成为担保人。他会在后段留下证词，担保不是永久免罪。`,'你点清担保金，岳衡在路引旁记下晏绮罗的名字。季远走到灯下：“我会留在接收处等你，不替长老改口供。”',{goldCost:COSTS.guarantee,hehuanFlags:{metMessenger:true,messengerAvailable:true,guaranteedMessenger:true,guaranteePaid:COSTS.guarantee,checkpointResolved:true}}),
      C('investigate','先查路引，让双方说清楚','当面对照签押，取得路引抄件；不交担保金。信使暂留巡使处，尚未获释；本次不战斗。','你把接收地点与宋箴的签押抄在同一页。岳衡答应暂缓送人离山，仍扣着季远；你带走的是证据，不是一份已经完成的营救。',{questItem:'hehuan_route_copy',hehuanFlags:{metMessenger:true,checkpointEvidence:true,messengerDetained:true,checkpointResolved:true}}),
      C('handover','把信使交给巡使',`获得 ${COSTS.checkpointPay} 灵石协查补贴；失去本次向信使取证的机会。交人的事实不会被之后改变立场抹去。`,'岳衡接过缚绳，付清协查补贴。季远没有再求你：“到接收处自己看吧。”他被带走，你没有取得他的口供。',{goldGain:COSTS.checkpointPay,hehuanFlags:{metMessenger:true,handedMessenger:true,messengerAvailable:false,checkpointResolved:true}}),
      battleChoice('attack','我不信你这套，动手放人','立即与巡使岳衡交战，玩家先手；获胜才放走信使并留下杀巡使的记录，失败结束本局。没有先发放的证词或和平奖励。','晏绮罗将纱横在缚绳前。岳衡拔剑：“这一剑，你是要替谁作保？”',ENCOUNTERS.patrol,{metMessenger:true,messengerAvailable:true,killedPatrol:true,checkpointResolved:true},'岳衡倒下，季远解开缚绳。他愿为接收地点作证，却不肯将你的杀人说成只是交涉。'),
      C('leave','这事与我无关，离开','不支付、不战斗、不取得路引或证词；仍可沿原路线寻找接收处。','晏绮罗收起扇子，没有替任何一方签字。巡使带走信使；你只记得接收地点的大致方向，调查少了这一份口供。',{hehuanFlags:{missedMessenger:true,checkpointResolved:true}})
    ],state);
    if(id==='hehuan_qinheng'){
      const reliable=!!f.checkpointEvidence||(!!f.messengerAvailable&&!f.handedMessenger);
      const ally=f.messengerAvailable&&!f.handedMessenger?'季远果然等在门外。他把接收日期念给秦蘅听，秦蘅认出了那一夜。':f.checkpointEvidence?'你带来的路引抄件上，宋箴的签押与门内账册相同。':f.handedMessenger?'宋箴知道信使已被送走，合上账册：“你把能对账的人交出去了，现在打算拿什么指控我？”':'你没有可靠口供，门牌只证明这里曾接收过宗门的人。';
      const winFlags={rescueReached:true,rescuedQinHeng:true,ledgerOriginal:true,killedAgent:true,agentDefeated:true};
      const winOutcome='宋箴倒下，秦蘅自己从案后取出账册。她走出仪式白线：“我肯作证，也要自己决定以后去哪。”原件收入你的包裹。';
      return scene(id,2,'账册旁的活人',[
        '秦蘅还活着，手腕上的引灵线一端扣在案脚。宋箴把账册横在她面前：“长老付过价。她留下，外堂才有药领。”',
        '“我的名字在册上，不等于我答应过。”秦蘅扯住线头。晏绮罗看着宋箴：“原件和人，你开价，还是让我查？”',ally
      ],[
        C('purchase','买下原件，把秦蘅带离仪式',`支付 ${COSTS.buyLedger} 灵石；取得账册原件并救出秦蘅，不战斗。宋箴收款后离开，未被杀死。`,'宋箴点清灵石，亲手撤去案脚引灵符。秦蘅拿走写着自己名字的账页，跟你走出白线。你买下了原件，也把收钱的人留在了世上。',{goldCost:COSTS.buyLedger,questItem:'hehuan_ledger_original',hehuanFlags:{rescueReached:true,rescuedQinHeng:true,ledgerOriginal:true,boughtLedger:true,agentSpared:true}}),
        reliable?C('negotiate','用已核证据逼宋箴放人','出示路引抄件或信使证词，核对签押；宋箴无法否认，交出原件并放人。本次不支付、不战斗。','宋箴的签押与接收时间一项项对上。秦蘅自己划去受领栏，拿走原件。宋箴放开引灵线，要求你别把账交回同一位长老。',{questItem:'hehuan_ledger_original',hehuanFlags:{rescueReached:true,rescuedQinHeng:true,ledgerOriginal:true,negotiatedRescue:true,agentSpared:true}}):battleChoice('negotiate_failed','没有可靠证词，仍逼他放人','证据不足，交涉将失败并立即与宋箴交战，玩家先手；获胜才救出秦蘅、取得原件，失败结束本局。','宋箴把空白处转向你：“人已送走，证词也没有。你说我签过字，拿给谁看？”他按住案下兵刃。',ENCOUNTERS.agent,winFlags,winOutcome,['hehuan_ledger_original']),
        battleChoice('attack','拔扇，连人带原件一起带走','立即与宋箴交战，玩家先手；胜利后取得原件、救出秦蘅并领取一份正常精英战利，失败结束本局。','晏绮罗将扇骨挑开案上引灵线。宋箴起身拔刃，原件仍压在他的左手下。',ENCOUNTERS.agent,winFlags,winOutcome,['hehuan_ledger_original']),
        C('hush','收下封口钱，不带人回去',`获得 ${COSTS.hushMoney} 灵石；不取得原件，不救秦蘅；她仍留在宋箴看守的仪式中。之后不能把此事写成营救。`,'宋箴把灵石推来，账册重新合拢。秦蘅没有喊她师姐，只把自己的名字念了一遍。你收了钱，从白线外离开。',{goldGain:COSTS.hushMoney,hehuanFlags:{rescueReached:true,tookHushMoney:true,rescueAbandoned:true,agentSpared:true}})
      ],state);
    }
    const original=ownsLedger(state),rescued=!!f.rescuedQinHeng;
    const unavailable=!original?'未持有账册原件，不能按此方式处置。':'';
    const lock=(c,extraReason='')=>({...c,requiresHehuanItem:'hehuan_ledger_original',locked:!original||!!extraReason,text:[c.text,!original?unavailable:extraReason].filter(Boolean).join(' ')});
    const witness=rescued?'秦蘅站在门外：“救命的事我记着。可账上别再替我签一个新主人。”':f.tookHushMoney?'接应者看见你收过的封口款袋：“这趟安静得很。账册呢？”案后的秦蘅没有跟来。':'接应者只见到你一个人，先看行囊，再问账册；秦蘅仍未被你带出仪式。';
    const messenger=f.messengerAvailable&&!f.handedMessenger?'季远把签押写在一旁，愿在公开时署名。':f.handedMessenger?'季远已被交给巡使；接应者说他不能来。你没有假称他已同意替你作证。':f.checkpointEvidence?'你仍能拿路引抄件逐字对照，但原件的去向只能按手中实物说明。':'眼前没有当初信使的口供，空缺不能由一句传闻补上。';
    const choices=[
      lock(C('publish','公布原件，请证人各自署名',`交出原件供核验，留下副本；下场战斗首回合获得 ${COSTS.publishGuard} 护盾，获得回春草×2。不能同时收宗门的回购钱。`,'晏绮罗把原件摊在各宗见证人面前，签名的人只写亲见的部分。护送者将护符系在她腕上；秦蘅若愿出面，名字由她自己写。',{questItem:'hehuan_ledger_copy',hehuanItemsRemove:['hehuan_ledger_original'],guard:COSTS.publishGuard,itemGrants:[{id:'herb',count:2}],hehuanFlags:{ledgerOriginal:false,ledgerPublished:true,ledgerCopy:true,publicWitnessSupport:true}})),
      lock(C('return','把原件交回宗门，换取补给',`交出原件，获得 ${COSTS.returnLedger} 灵石与聚灵丹×2；失去原件，不能再用它公布或索价。`,'接应者封好原件，把灵石和药逐件放下。晏绮罗没有再留下可公开核对的那一册。秦蘅若已获救，便独自收起行囊，不再替她作证。',{goldGain:COSTS.returnLedger,itemGrants:[{id:'spirit_pill',count:2}],hehuanItemsRemove:['hehuan_ledger_original'],hehuanFlags:{ledgerOriginal:false,returnedLedger:true,sectSupport:true,qinTrustLost:rescued}})),
      lock(C('leverage','保留原件，向长老索价',`保留原件，获得 ${COSTS.leverage} 灵石与「满堂红」；不获公开证人的护符或宗门回购补给。`,'晏绮罗将原件贴身收好，只让接应者看了一行签名。“外堂的药钱，从这里重新算。”对方付钱留下功诀；把柄仍在你手里，秦蘅的名字也仍在册中。',{goldGain:COSTS.leverage,cardIds:['H12'],hehuanFlags:{ledgerLeverage:true,sectHostile:true}})),
      lock(C('destroy','只带秦蘅离开，当面毁掉原件',`须已救出秦蘅；焚毁原件，恢复 ${COSTS.burnHeal} 生命并获得回春草×2，不取得封口或回购钱。`,'秦蘅把自己的账页先投入火中，其余原件随后烧尽。“我不替长老守口。”她说，“但以后也别拿这本账替我决定。”晏绮罗留下药，让她自己择路。',{heal:COSTS.burnHeal,itemGrants:[{id:'herb',count:2}],hehuanItemsRemove:['hehuan_ledger_original'],hehuanFlags:{ledgerOriginal:false,ledgerDestroyed:true,qinOwnPath:true}}),rescued?'':'尚未救出秦蘅，不能选择带她离开。')
    ];
    if(!original)choices.push(C('unfinished',f.tookHushMoney?'保留封口钱，不伪称已带回证据':'没有原件，不接新的处置约定','不改变资源，不补发原件、不自动救人。此前交人、收款或错过证词的事实仍保留。',f.tookHushMoney?'接应者不再问账，转而清点你收过的钱。秦蘅不在门外，晏绮罗没有替这个空位编一个圆满的说法。':'你摊开手里实际有的纸页，没有账册原件。接应者收回空匣，你继续赶路；失踪者和旧账都还未结清。',{hehuanFlags:{ledgerDispositionMissed:true}}));
    return scene(id,3,'原件只够交给一方',['接应者追到断亭，打开一只空匣：“长老说，原件交回来，外堂还有药钱。你若拿去给别人看，便别再用宗门的名号。”',witness,messenger],choices,state);
  }
  function ending(state,won=true){
    const f=flags(state),rescue=f.rescuedQinHeng===true;
    if(!won)return {title:'纱断，账未结',goal:rescue?'秦蘅曾被救出；她能否独自出域，尚无消息。':'秦蘅未被你带离祭仪。',text:['晏绮罗没能走完寒渊。'+(rescue?'她安排过的避难处仍有一人等归路；这不是已经抵达雾外的证明。':'那本交人账册和没能带走的人，仍留在这一程的记录里。'),f.tookHushMoney?'她收过封口钱，这一笔没有因落败消失。':'她最后握紧的仍是扇骨，没能替旧案写下终页。'],relation:rescue?'秦蘅的去向待查':'营救未成',quote:'账别替我销。'};
    let title,text,relation;
    if(rescue&&f.ledgerPublished){title='人归，账见天光';text=['秦蘅自己走过雾外的界碑，转身指了指晏绮罗腕上的见证护符：“救我这笔记着。往后的名字，我自己写。”','公开副本让几处签押有了核验的人。长老不再能把秦蘅说成从未入册，宗门也没有因此全变得干净。'];relation='秦蘅愿独立作证，外堂与长老的关系决裂';}
    else if(rescue&&f.returnedLedger){title='归人不替归账';text=['秦蘅获救后独自收好行囊：“人情我认。可这回卖回去的，不只有纸。”她没有替晏绮罗再作证。','宗门回购原件的灵石和丹药已经入袋，原件不在你手里。晏绮罗拿到了补给，也失去了用那一本账公开核验的机会。'];relation='秦蘅已离去，信任受损；宗门仍愿交易';}
    else if(rescue&&f.ledgerLeverage){title='活人归路，把柄随身';text=['秦蘅走出封域，却没有接外堂的新名帖：“我不想再让自己的名字，替你的药钱担保。”','晏绮罗保留着原件，索来的灵石和「满堂红」已实际入手。她救回了人，也选择继续用这份把柄与长老做生意。'];relation='秦蘅保留距离；长老的把柄仍在你手里';}
    else if(rescue&&f.ledgerDestroyed){title='灰尽，人各有路';text=['秦蘅在界碑外停步：“我会说自己见过的事，不替那本烧掉的账作保证。”她拿着留下的药，选了另一条路。','原件已经焚毁，未换取长老的灵石。晏绮罗失去了那份把柄，也没有再替秦蘅订下下一份约定。'];relation='师姐妹各走自己的路；原件无法再核验';}
    else if(f.tookHushMoney){title='带钱出域，无人同行';text=['雾外接应者先点封口钱，再问账册。晏绮罗没有带出秦蘅，也没有拿到原件。','秦蘅在案后念自己名字的声音没有跟来。她收过的钱仍在本局账上，胜利没有将那次离去改写成救人。'];relation='营救被放弃，宗门接应者知晓封口交易';}
    else if(rescue){title='人已带回，旧案未竟';text=['秦蘅确实离开了祭仪，亲自走到雾外。她说自己会另选去处，没有应允替任何一方守口。','账册未按完整处置方案落定；'+(ownsLedger(state)?'原件仍由晏绮罗保管。':'她手中没有可供处置的原件。')+'这部分仍是未竟之事。'];relation='营救完成，证据处置未竟';}
    else {title='穿过寒渊，未带回她';text=['晏绮罗走完七境，扇边的符结已经换过数次。秦蘅却没有被她救出，不能用镇境之战的胜利来替代那一次营救。','她带出的见闻有多少，只按本局确实取得的纸页作数。长老、巡使与师妹的旧账，还没有结清。'];relation='营救未成，旧案未竟';}
    if(f.killedPatrol)text.push('巡使岳衡被她所杀。季远即使愿作证，也没有为这次杀人改写经过。');
    else if(f.handedMessenger)text.push('季远曾被她交给巡使，后来没有被悄悄写成一直同行的证人。');
    return {title,goal:rescue?'秦蘅已被救出。':'秦蘅未被救出。',text,relation,quote:rescue?'人不是账上的东西。可账，还得有人算。':'这一页，还不能合。'};
  }
  function identityReply(event,state){
    if(state?.character!=='hehuan')return '';
    const id=typeof event==='string'?event:event?.id||'',f=flags(state),m=/^faction_(gate_boss|camp_boss|snake|bell_boss)_(source|cave)$/.exec(id);if(!m)return '';
    const rescued=f.rescuedQinHeng;
    const replies={
      gate_boss:rescued?'晏绮罗：“我从仪式里带出来的是秦蘅，不是一张无名牌。你问她想走哪条路，别问我的宗门替她签过什么。”':'晏绮罗：“我要找的人叫秦蘅。合欢宗的名帖不替她答话，渡簿也不能只替有钱的人认名字。”',
      camp_boss:f.guaranteedMessenger?'晏绮罗：“我替一个信使交过担保钱。担保写谁、药交谁，都得当面点；别拿门派替账目说话。”':'晏绮罗：“想问我是不是来偷药，就把药箱的数量摆开。我的宗门不能替你证明我做过哪一件事。”',
      snake:'晏绮罗看过秤盘：“买药、换证词、替人开井，是三笔事。先把价钱写清，别见我拿扇，就把药账也算成一场情债。”',
      bell_boss:f.tookHushMoney?'晏绮罗没有碰续钟绳，只问：“名字留下了，写这个名字的人还愿意吗？”她把手收回袖内。':rescued?'晏绮罗：“秦蘅活着，她要不要替谁作证，由她自己说。这里亡者的名字，也别只听替人签押的那一方。”':'晏绮罗：“留名是记住一个人，留魂是叫她继续等。把这两件事说清，我再碰你这根绳。”'
    };
    return replies[m[1]];
  }
  const api={CARDS,STARTERS,CHARACTERS,RELICS,FACTION,ITEMS,STORY_IDS,PERSONAL_SLOTS,COSTS,ENCOUNTERS,INITIAL_STORY,TUTORIAL,CONDITION_TEXT,flags,ownsLedger,buildEvent,ending,identityReply};
  root.NightHehuan=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis==='object'?globalThis:window);
