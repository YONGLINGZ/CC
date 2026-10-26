/* 天工院 · 陆听澜。Data only; squad settlement belongs to engine.js. */
(function(root){
  'use strict';
  const rows=[
    ['J01','牵丝',1,0,'body','basic','造成4伤害；可选择一具在场傀儡获得4护盾。本体收招。','optionalField',true],
    ['J02','护阵',1,0,'selected','basic','选择本体或一具在场傀儡，获得6护盾，由所选单位收招。','unit'],
    ['J03','并肩',1,0,'bodyThenSelected','common','本体造成6伤害；若有傀儡在场，可选一具追加3伤害并由它收招。','optionalField',true],
    ['J04','收线',1,0,'body','common','获得8护盾；可收回一具在场傀儡，不恢复耐久。本体收招。','optionalField'],
    ['J05','探机',0,0,'body','common','获得1驱动，抽1张牌。消耗。','',false,true],
    ['J06','灵弦',1,0,'selected','common','需一具傀儡在场。由它造成6伤害，然后令它即时运转一次；由它收招。','field',true],
    ['J07','袖弩',1,0,'body','common','造成6伤害，抽1张牌。本体收招。','',true],
    ['J08','轻身避锋',0,0,'body','common','本体获得3护盾，抽1张牌。本体收招。消耗。','',false,true],
    ['J09','展匣',1,0,'body','common','本体获得4护盾；可部署一具可用傀儡，或以它换下一具在场傀儡。费用已包含部署；本体收招。','deploy'],
    ['J10','借位',0,0,'body','common','用一具可用的备用傀儡替换一具在场傀儡，不另收部署费用；无合法替换则不可用。本体收招。消耗。','swap',false,true],
    ['J11','急修',1,0,'body','common','选择一具傀儡，恢复6耐久，可处理已损坏机体；从0恢复者下个玩家回合才能部署。本体收招。','roster'],
    ['J12','续榫',1,0,'body','common','选择一具傀儡，获得2驱动并为它恢复3耐久；若实际恢复至少1耐久，再抽1张牌。本体收招。','roster'],
    ['J13','隔空换件',1,0,'body','common','选择一具在场傀儡，恢复4耐久并获得4护盾。本体收招。','field'],
    ['J14','拆甲救急',0,0,'body','uncommon','拆解一具在场傀儡，使其耐久归0，本体获得等于其原剩余耐久的护盾，最多12；本次主动拆解免损坏反馈。本体收招。消耗。','field',false,true],
    ['J15','以战代修',1,0,'selected','uncommon','需一具傀儡在场。由它造成8伤害；若实际伤到敌人生命且该机仍可行动，为它恢复3耐久；由它收招。','field',true],
    ['J16','整队',2,0,'body','rare','三具傀儡各恢复5耐久，包括备用与损坏机体；两具在场者各获得5护盾；重启遵守延迟规则。本体收招。消耗。','',false,true],
    ['J17','注灵',1,0,'body','common','获得3驱动。驱动已满时不可使用。本体收招。'],
    ['J18','改线',0,1,'body','common','支付1驱动，抽2张牌。本体收招。消耗。','',false,true],
    ['J19','蓄电',1,0,'body','common','本体获得4护盾，获得2驱动。本体收招。'],
    ['J20','释能',1,2,'selected','uncommon','支付2驱动。需一具傀儡在场。由它造成12伤害并获得6护盾；由它收招。这是卡牌攻击，不算基础指令。','field',true],
    ['J21','分流',0,2,'body','uncommon','支付2驱动，获得1灵力。本体收招。消耗。','',false,true],
    ['J22','超额预充',1,0,'body','common','本体获得4护盾；下个玩家回合额外获得3驱动、抽1张牌。本体收招。'],
    ['J23','备用电池',1,0,'body','rare','本场从下个玩家回合起，回合开始额外获得1驱动。本体收招。消耗。','',false,true],
    ['J24','同步供能',2,0,'body','uncommon','获得4驱动，抽2张牌。本体收招。消耗。','',false,true],
    ['J25','盾行',1,0,'selected','common','选择一具在场傀儡获得8护盾；若为承山，改为10；由它收招。','field'],
    ['J26','护主',1,0,'selected','common','选择一具在场傀儡执行：本体获得6护盾；若为承山，它自身再获得6护盾；由所选傀儡收招。','field'],
    ['J27','撼地',2,0,'chengshan','uncommon','需承山在场。造成12伤害，承山获得8护盾；由承山收招。','',true],
    ['J28','不动榫',1,0,'body','uncommon','本场承山的运转护盾增加2，可叠加；不改变指令与过载的基础数值。本体收招。消耗。','',false,true],
    ['J29','卸力',1,0,'body','uncommon','选择一具在场傀儡，将其最多8护盾转给本体，再使本体获得4护盾。本体收招。','field'],
    ['J30','山门不倒',2,1,'body','rare','支付1驱动。需承山在场。先支付其4耐久过载代价，再使本体获得24护盾，下回合额外抽1张；承山退场冷却，不另收基础过载驱动。本体收招。'],
    ['J31','顶梁换柱',1,0,'chengshan','uncommon','将可用承山部署或换入，费用已包含部署；若本已在场则不移动；随后承山获得6护盾并收招。承山不可用时禁用。','deploy'],
    ['J32','城墙回响',2,0,'body','rare','本场傀儡每次因敌人直接攻击实际失去耐久，反击3伤害；每个敌方阶段首次出现该情况时，另获得1驱动。自损不触发。本体收招。消耗。','',false,true],
    ['J33','引雷',1,0,'selected','common','选择一具在场傀儡造成7伤害；若为鸣镝，改为10；由它收招。','field',true],
    ['J34','贯羽',1,0,'selected','common','选择一具在场傀儡造成6伤害；若为鸣镝，攻击前先移除敌人6护盾；由它收招。','field',true],
    ['J35','追电',0,1,'mingdi','uncommon','支付1驱动。需鸣镝在场且耐久大于2。先使其失去2耐久，再造成6伤害；由鸣镝收招。消耗。','',true,true],
    ['J36','翼骨校准',1,0,'body','uncommon','本场鸣镝运转伤害增加2，可叠加；不改变指令与过载的基础数值。本体收招。消耗。','',false,true],
    ['J37','雷羽齐发',2,1,'body','rare','支付1驱动。需鸣镝在场。先支付其4耐久过载代价，再连续造成4次、每次6伤害；鸣镝退场冷却，不另收基础过载驱动。本体收招。','',true],
    ['J38','放线追击',1,0,'bodyThenMingdi','uncommon','本体造成6伤害；鸣镝在场且双方仍存活时，再由鸣镝追加4伤害并收招；否则本体收招。','',true],
    ['J39','抢先起飞',1,0,'mingdi','uncommon','将可用鸣镝部署或换入，费用已包含部署；若本已在场则不移动；立即令鸣镝运转一次，并由它收招。不可用时禁用。','deploy',true],
    ['J40','双翼协作',2,0,'body','rare','本场每个玩家回合首次有其他傀儡完成基础指令时，若鸣镝在场，令其追加4伤害；追加不改变护卫、不算指令、不递归。本体收招。消耗。','',false,true],
    ['J41','提灯',1,0,'selected','common','选择一具在场傀儡获得4护盾；若为拾萤，再获得2驱动；由它收招。','field'],
    ['J42','灵芯校准',1,0,'body','uncommon','本场拾萤每次运转额外获得1驱动，可叠加；不改变基础指令和过载。本体收招。消耗。','',false,true],
    ['J43','借火',0,0,'body','uncommon','本体先失去3生命；存活才获得2驱动。本体收招。消耗。','',false,true],
    ['J44','回收工序',1,0,'body','uncommon','收回一具在场傀儡，耐久不恢复；获得2驱动，抽1张牌。本体收招。消耗。','field',false,true],
    ['J45','万机归流',2,1,'body','rare','支付1驱动。需拾萤在场。先支付其4耐久过载代价，再抽4张牌，下个玩家回合额外获得2灵力；拾萤退场冷却，不另收基础过载驱动。本体收招。'],
    ['J46','同心机匣',2,0,'body','uncommon','本场从下个玩家回合起，若回合开始时有两具傀儡在场，额外抽1张牌。本体收招。消耗。','',false,true],
    ['J47','顺序调度',1,0,'body','uncommon','选择在场傀儡的执行顺序，各即时运转一次；若两具均实际运转，再抽1张牌。运转不改变护卫，最后由本体收招。消耗。','order',false,true],
    ['J48','天工合击',3,2,'remaining','rare','支付2驱动。需两具在场。选择一具，先支付其4耐久代价并执行基础过载、退场；另一具免费额外执行一次基础指令，允许本回合已执行过者再执行；最后本体获得6护盾，由仍在场者收招。不另扣两动作的基础驱动费用。','sacrifice',true]
  ];
  const CARDS=Object.fromEntries(rows.map(([id,name,cost,driveCost,executor,rarity,text,friendTarget='',attack=false,exhaust=false])=>[id,{id,name,cost,driveCost,executor,rarity,text,friendTarget,target:attack,attack,exhaust,character:'mechanist',category: id<'J17'?'thread':id<'J25'?'drive':id<'J33'?'wall':id<'J41'?'thunder':'workshop'}]));
  for(const [id,machine]of Object.entries({J27:'chengshan',J30:'chengshan',J31:'chengshan',J35:'mingdi',J37:'mingdi',J39:'mingdi',J45:'shiying'}))CARDS[id].requiredMachine=machine;
  // These cards request unit operations, rather than making a card attack.
  // They must not spend the player's pending first-hit or first-attack bonus.
  for(const id of ['J39','J48']){CARDS[id].attack=false;CARDS[id].target=false;}
  const CHARACTERS={mechanist:{id:'mechanist',name:'陆听澜',profession:'天工院机关师',portrait:'tinglan',adult:true,age:27,locked:false,faction:'tiangong',initialHp:52,initialRelic:'concentric_spool',starters:['mechanist'],accent:'#80b9bf',description:'天工院外勤机关师，操线调度承山、鸣镝与拾萤。她入域寻找失联救援队，要查清护民机关为何成了杀器。',quote:'别盯着我，你该防的是后面那个。'}};
  const STARTERS={mechanist:{character:'mechanist',name:'同心机阵',description:'三具唯一机体，同时展开两具。靠驱动指令、维修与过载协同；最后行动者负责接招。',cards:['J01','J01','J01','J02','J02','J02','J03','J03','J09','J17']}};
  const RELICS={concentric_spool:{name:'同心线轴',text:'每场战斗开始，免费展开战外预设的首发机体并由它护卫。默认承山，可在机匣更换。驱动初始2、上限6，自第二回合起自然恢复1；直接攻击由最后执行者承受。'}};
  const MACHINES={
    chengshan:{id:'chengshan',name:'承山',title:'护城机兵',hp:18,maxHp:18,color:'#ba8650',passive:'自身获得4护盾',command:'2驱动：自身获得8护盾，本体获得4护盾。',overload:'3驱动＋4耐久：本体获得18护盾，退场冷却。',passiveBlock:4,commandBlock:8,commandPlayerBlock:4,overloadBlock:18,description:'木铜双掌合成护桥盾，胸前留着孩子画的半朵红花。'},
    mingdi:{id:'mingdi',name:'鸣镝',title:'雷羽弩鸢',hp:10,maxHp:10,color:'#86c8e2',passive:'造成3伤害',command:'2驱动：造成7伤害。',overload:'3驱动＋4耐久：连续攻击3次，每次6伤害，退场冷却。',passiveDamage:3,commandDamage:7,overloadDamage:6,overloadHits:3,description:'她逐片校准的传讯弩鸢，长翼中藏着铜羽与弩弦。'},
    shiying:{id:'shiying',name:'拾萤',title:'提灯工蜂',hp:8,maxHp:8,color:'#ebce72',passive:'获得1驱动',command:'2驱动：抽1张牌，下回合额外获得1灵力。',overload:'3驱动＋4耐久：抽3张牌，下回合额外获得2灵力，退场冷却。',passiveDrive:1,commandDraw:1,commandNextEnergy:1,overloadDraw:3,overloadNextEnergy:2,description:'修理灯加上夹手与收线臂，能替她递上最缺的那颗销钉。'}
  };
  const FACTION={tiangong:{id:'tiangong',name:'天工院',description:'造桥、护阵、抢修救援的机关门派。外勤队进雾后失联，院里对旧图纸的去向三缄其口。'}};
  const ITEMS={
    mech_case:{id:'mech_case',name:'随身机匣',text:'承山、鸣镝与拾萤各有固定机位。战外可预设首发机体，战斗中展开、收回、检修与指令不消耗跨场材料。',icon:'learned'},
    tl_testimony:{id:'tl_testimony',name:'桥口证词',text:'灾民阿川画下的旧机行走路线，背面是陆听澜修桥后留下的保险销尺寸。',icon:'learned'},
    tl_broken_pin:{id:'tl_broken_pin',name:'磨去半齿的保险销',text:'从拆除旧机取下，磨痕朝内，挡不住逆向回转。没有完整控制记录。',icon:'learned'},
    tl_control_record:{id:'tl_control_record',name:'护桥机控制记录',text:'原芯记下改销与复位的时辰，署名被刮去一半，仍能对照天工院出货清单。',icon:'learned'},
    tl_record_copy:{id:'tl_record_copy',name:'刻痕拓纸',text:'陆听澜依芯槽留下的拓本，记录时间完整，缺原芯的验真印。',icon:'learned'},
    tl_delivery_list:{id:'tl_delivery_list',name:'暗匣里的出货账',text:'救援队员邱生藏在袖尺中的账页：改销指令、接货人、院内批准的日期。',icon:'learned'},
    tl_public_record:{id:'tl_public_record',name:'署名的公开记录',text:'桥口证词或原芯记录与出货账在雾外当众核对，陆听澜留下亲笔签名。',icon:'learned'}
  };
  const STORY_IDS=['tinglan_bridge','tinglan_seal','tinglan_record'];
  const PERSONAL_SLOTS=[4,18,46];
  const INITIAL_STORY=['院里最后一封急信说，救援三队已接好断桥，第二天就能送伤员出域。那封信已经过了二十七天。','陆听澜把旧线轴重新缠紧，检查承山胸前的红花：“先把人找着。谁动过我们的图纸，回来再问。”'];
  const TUTORIAL='灵力安排出牌、展开与检修；驱动支付指令与过载。最后主动执行者接直接攻击，自动运转不改护卫。机体损坏反馈3生命；修好后的下一玩家回合才可部署。';
  const COSTS={bridgeRepair:20,scrapIncome:20,returnOriginal:35,finalSilence:70,publicGuard:12,internalGuard:8};
  const C=(key,label,text,outcome,effects={})=>({key,label,text,outcome,...effects});
  const flags=state=>state?.journey?.flags||{};
  const has=(state,id)=>(state?.player?.questItems||[]).includes(id);
  const scene=(id,step,name,story,choices,state)=>({id,name,glyph:'机',kicker:'同心线轴',description:story[0],story,choices,mechanistStory:{id,step},connection:state?.journey?.mechanist?.lastOutcome||''});
  function buildEvent(id,state){
    if(!STORY_IDS.includes(id))return null;
    const f=flags(state);
    if(id===STORY_IDS[0])return scene(id,1,'桥口的旧机',[
      '旧机半身陷在桥墩里，脚边压着一只红鞋。阿川抱着光脚的儿子挡住去路：“你们造的东西，刚才差点把他压死！”',
      '陆听澜蹲下，剪断供芯线。保险销缺了半齿，磨口朝里。“这是后来改的。”她把销钉举到灯下，阿川却只看那只鞋：“修好以后，还会踩下来吗？”',
      '桥洞里传来山魈刨石的响声。陆听澜把红鞋勾出来，鞋底还沾着温热的泥。'
    ],[
      ...[['deploy','J09'],['repair','J11']].map(([key,card])=>C('repair_'+key,'买替换件修桥，记下「'+CARDS[card].name+'」',`支付20灵石；取得桥口证词，获得「${CARDS[card].name}」一张。不恢复战斗机体耐久。`,'她把新销敲入桥架，叫阿川带孩子先过。男人走到对岸才折回来，用烧黑的木片画出旧机行走的路线。“它绕开了三家棚子，偏偏踩我们这一家。”',{goldCost:20,questItem:'tl_testimony',cardIds:[card],flags:{tlBridgeMode:'repaired',tlHasTestimony:true,tlBridgeResolved:true}})),
      C('scrap','拆掉旧机，带走保险销','获得20灵石与损坏保险销；不取得完整控制记录，也没有修好桥。','斧子落下前，陆听澜先取出那颗销。木骨断开，桥下的响动停了一瞬。阿川领孩子踩着浅水过去，没接她递来的鞋，鞋被放在了桥桩上。',{goldGain:20,questItem:'tl_broken_pin',flags:{tlBridgeMode:'scrapped',tlBridgeResolved:true}}),
      C('investigate','留下拆读原芯','取得护桥机控制记录；离开时与山魈进行一场普通战。胜利后才继续，落败结束本局。','原芯吐出两行刻痕：半夜三更，有人拆过保险销；天亮前，旧机收到一条“清桥”指令。陆听澜收起原芯，桥洞里的山魈已经爬上来了。',{questItem:'tl_control_record',battle:{enemyId:'ape',name:'山魈',kind:'fight'},flags:{tlBridgeMode:'investigated',tlHasControl:true,tlBridgeResolved:true}}),
      C('leave','绕过旧机，继续找救援队','不花钱，不取得证词或原芯；不会阻断七境主线。','陆听澜将供芯线压在石下，又在桥桩上划了一道禁启线。阿川牵着孩子走进浅水，鞋还留在原处。',{flags:{tlBridgeMode:'left',tlBridgeResolved:true}})
    ],state);
    if(id===STORY_IDS[1]){
      const original=has(state,'tl_control_record'),testimony=has(state,'tl_testimony'),pin=has(state,'tl_broken_pin');
      const evidence=original?'陆听澜将原芯立在桌角。管事认出芯槽的编号，先伸手盖住验真印。':testimony?'阿川画的纸被压在茶碗下。管事看了一遍路线，又把纸翻过来，看见陆听澜写的尺寸。':pin?'保险销滚到茶碗边。管事用袖口包着捡起，没有碰那道磨痕。':'管事掀开机匣，只看见陆听澜自己的工具。他把封存纸压平：“找到东西再来。”';
      return scene(id,2,'院里的封存令',[
        '接应棚里，管事吴桐把炉火拨旺：“先把东西交我。院里查清了，自然给你答复。茶别喝，放了一夜。”',evidence,
        '“保险销照我们的图纸改的。”陆听澜说。吴桐把门闩推上：“你现在拿出去，所有人只会记得天工院机关杀人。先替那些还等着修桥的人想想。”'
      ],[
        {...C('return','交回原芯，索取封存回执','须持有护桥机控制记录；交出原芯，获得35灵石，下场开战额外2驱动一次。','吴桐给原芯贴了两层封纸。陆听澜按住他的笔：“写清收的是几号芯。别只写旧器。”他停了一会儿，补上编号，把灵芯与回执一起推过来。',{goldGain:35,nextDriveAid:2,mechanistItemsRemove:['tl_control_record'],flags:{tlEvidenceReturned:true,tlHasControl:false,tlSealMode:'original'}}),locked:!original},
        {...C('copy','交刻痕拓纸，保留原芯','须持有护桥机控制记录；取得刻痕拓纸，下场开战额外2驱动一次。原芯仍保留；没有35灵石。','她用炭纸拓完芯槽，把拓纸推过去。吴桐伸手要原芯，她先合上了机匣。“够你查出货的人了。”他没接这句话，只将一枚备用灵芯放到桌边。',{questItem:'tl_record_copy',nextDriveAid:2,flags:{tlKeptCopy:true,tlSealMode:'copy'}}),locked:!original},
        {...C('statement','交出桥口证词的抄件，请他当场查账','须持有桥口证词或保险销；保留现有实物，获得「翼骨校准」；不取得灵芯援助。','吴桐翻到出货栏，停在一个空行。陆听澜用机尺压住那一页。“你再往前翻。”管事抽回手，拿出一份旧校准图：“路上用得着。出货的事，我查。”',{cardIds:['J36'],flags:{tlSealMode:'statement',tlNamedEmptyLine:true}}),locked:!testimony&&!pin},
        C('refuse','不交，自己去找出货的人','不取得灵石或灵芯援助。持有的实物全部保留。','她把机匣背好。吴桐追到门边，递来一张空白封存纸；她没接。纸在炉边烤得翘起一角，管事伸手压住，烫得缩了一下。',{flags:{tlSealMode:'refused'}})
      ],state);
    }
    const complete=(has(state,'tl_control_record')||has(state,'tl_testimony'))&&!f.tlEvidenceReturned;
    const bridge=f.tlBridgeMode==='repaired'?'邱生把阿川的画认了出来：“对，就是桥口那家。上头让我们先清那里。”':f.tlBridgeMode==='scrapped'?'邱生摸到缺齿的保险销，立即把手缩开：“磨这个的时候，我在场。”':f.tlBridgeMode==='investigated'?'邱生对上原芯上的刻痕：“清桥那行是我刻的。下面还有一句，没刻进去。”':'邱生拿机尺顶开袖口：“我一直等院里再派人来。你怎么来得这么晚？”';
    return scene(id,3,'该留下什么记录',[
      '失联救援队的邱生还活着，左腿被木骨支架撑着。他从袖尺暗匣里抽出一页出货账：改销、清桥、转交玄烬教，末尾有院内批准的日期。',bridge,
      '吴桐从后门进来，没看邱生，先把七十枚灵石排在桌上：“这张纸给我。伤员我接出去，院里的名字我来背。”邱生按住暗匣：“你来背，还是等我也不在了？”'
    ],[
      {...C('publish','带出原账，署名公开','须保留桥口证词或控制原芯；获得署名的公开记录、下战12护盾与回春草2份；此后不收院内封口钱。','陆听澜把出货账夹进桥口的记录里，在第一页写下自己的名字。邱生问能不能也写，她把笔递过去。吴桐起身要走，跨过门槛时说：“以后的修件，别再来找我。”',{questItem:'tl_public_record',guard:12,itemGrants:[{id:'herb',count:2}],flags:{tlFinalDisposition:'public',tlRescuerOut:true,tlWitnessPublic:true}}),locked:!complete},
      C('internal','交原账追责，要求留下签押','交出这页出货账，获得下战8护盾、聚灵丹2枚；已有旧证据保留。院内援助继续，雾外会有后续回信。','陆听澜把七十枚灵石推开，只让吴桐在收件处签字。“先封改销工坊，把邱生送出去。少一项，我就带这张收条去院门口。”吴桐签完，看了看邱生的腿，叫人搬来担架。',{guard:8,itemGrants:[{id:'spirit_pill',count:2}],flags:{tlFinalDisposition:'internal',tlRescuerOut:true,tlInternalReceipt:true}}),
      C('silence','收下灵石，把这页账留给吴桐','获得70灵石与「雷羽齐发」；不取得公开记录或院内护符。邱生会知道你接受了这笔交易。','灵石进袋时，邱生把袖尺的暗匣合上了。陆听澜伸手扶他，他撑着桌子自己站起来：“不用了。你修你的东西。”吴桐将出货账贴身收好，又留下了一张雷羽图。',{goldGain:70,cardIds:['J37'],flags:{tlFinalDisposition:'silence',tlRescuerOut:true,tlWitnessTrustLost:true}}),
      C('keep','带邱生离开，暂时留下原账','取得出货账与「急修」一张；不自动公布或宣告追责完成。','她先背起邱生，叫承山顶开门，才把账页塞进机匣。鸣镝停到屋檐下，她低声骂了一句：“说了别往屋顶上扎。”邱生在背后笑了一声，笑到一半变成了咳嗽。',{questItem:'tl_delivery_list',cardIds:['J11'],flags:{tlFinalDisposition:'kept',tlRescuerOut:true}})
    ],state);
  }
  function ending(state,won=true){
    const f=flags(state),d=f.tlFinalDisposition;
    if(!won)return {title:'线未断，人未归',goal:f.tlRescuerOut?'邱生曾离开旧址，能否出域尚无消息。':'失联救援队尚未被带出。',text:['陆听澜倒下时还握着折尺。承山胸前的半朵红花沾了灰，灯芯一闪，灭了。',f.tlBridgeMode==='repaired'?'桥口那段梁还撑着，阿川每天替她看一眼保险销。':'桥口的旧机停在断墩旁，供芯线压在石头下。'],relation:'救援与旧案未竟',quote:'线……先别剪。'};
    if(d==='public')return {title:'把名字写在图纸上',goal:'邱生出域，改造记录已经公开。',text:['雾外，邱生撑着新配的木拐，一笔一划重写出货的日期。阿川将孩子的红鞋放到桌边，鞋带已经补好。','院里寄来的公函没有称她同门。陆听澜用那张纸垫在机脚下，继续拧紧松动的螺钉。'],relation:'邱生与灾民愿作证；部分院内补给断绝',quote:'字写大一点。我签的，我认。'};
    if(d==='internal')return {title:'收件处有一个名字',goal:'邱生出域；封存回执交回天工院。',text:['三天后，吴桐送来封坊清单与两名管事的停职令。邱生逐个看了名字，指向末尾：“批准转交的那个人呢？”','陆听澜把回执摊在他面前，又取出折尺里的炭笔。院门还开着，两人没有急着进去。'],relation:'院内支持仍在；邱生继续追问批准者',quote:'他签过字。下一回，让他当面说。'};
    if(d==='silence')return {title:'机匣重了，人走远了',goal:'邱生出域；原账已交给吴桐。',text:['院里送来崭新的铜羽与一封嘉奖信。陆听澜拆开，第一眼却去找邱生的名字，没有找到。','邱生在渡口看见她，撑拐换了一个棚子候船。她追了两步，机匣里的灵石撞在一起，很响。'],relation:'院内愿意交易；邱生不再愿意同行',quote:'这笔钱……先放着。'};
    if(d==='kept')return {title:'尺中仍藏着一页纸',goal:'邱生出域，出货账尚未处置。',text:['邱生在雾外把袖尺留给她：“暗匣松了，你有空修一修。”他先去找失散的队员家属。','陆听澜把账页放回尺中，将暗匣的卡簧修好。找到了人，旧账还放在桌上。'],relation:'邱生归来；原账保留，追责未竟',quote:'能修。账也一样，一笔一笔来。'};
    return {title:'带着空机匣回来',goal:'救援队下落未能查清。',text:['雾外的接应者问救援三队还有谁活着。陆听澜打开机匣，取出一路找到的东西，最后只剩三格空位。','她把原来的急信翻到背面，写下仍未找到的名字。承山低下头，让她扶着肩甲坐了一会儿。'],relation:'寻人未成，旧案未竟',quote:'再等一下。我还没找完。'};
  }
  const api={CARDS,CHARACTERS,STARTERS,RELICS,MACHINES,FACTION,ITEMS,STORY_IDS,PERSONAL_SLOTS,INITIAL_STORY,TUTORIAL,COSTS,flags,buildEvent,ending};
  root.NightMechanist=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis==='object'?globalThis:window);
