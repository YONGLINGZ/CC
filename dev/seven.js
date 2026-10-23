/* Seven painted realms. Content data only; choices and combat resolve in engine.js. */
(function (root) {
  'use strict';
  const REGIONS = [
    {id:'fog_gate',name:'雾锁山门',subtitle:'第一境 · 雾外来客',stages:[1,10],description:'封域边缘尚留着旧山门。各宗弟子从这里入雾，报出的名字未必都是真的。山口的灯还亮着，照不出更深处的归路。',palette:{sky:'#15232b',ground:'#49626a',accent:'#abd9d1'}},
    {id:'broken_camp',name:'断桥诸营',subtitle:'第二境 · 灯下故人',stages:[11,20],description:'断桥两侧，药香、商灯与暗哨混在一起。失散的同伴留下字条，没署名的货匣摆在火边；先前的一句承诺，也许比钱袋更重。',palette:{sky:'#252019',ground:'#6c5342',accent:'#e4b56e'}},
    {id:'ritual_core',name:'逆仪旧址',subtitle:'第三境 · 空井未终',stages:[21,30],description:'玄烬教引灵仪的旧址已经坍塌，观测井下却仍传来潮声。留守的妖物把这里当作最后一道门，门后的空间似乎不属于任何山川。',palette:{sky:'#221728',ground:'#4c3c61',accent:'#c5a1e4'}},
    {id:'drowned_marsh',name:'沉月泽国',subtitle:'第四境 · 水中无月',stages:[31,40],description:'走出井门，脚下已是无边泽国。泥水里映着一轮天上没有的月，沉没的村楼偶尔浮出水面。药庐、送行的队伍与旧书楼，都在等待潮汐松手。',palette:{sky:'#102a32',ground:'#355e61',accent:'#9ad4ce'}},
    {id:'furnace_palace',name:'焚愿天阙',subtitle:'第五境 · 愿作灯薪',stages:[41,50],description:'泽国尽头立着朱金宫阙，城中炉火烧的不是木炭。每一份写下的愿望都被登记、称量，再送进长明炉。有人想取回旧愿，有人还在添薪。',palette:{sky:'#321c23',ground:'#71402f',accent:'#efb66d'}},
    {id:'mirror_heaven',name:'琉璃无相庭',subtitle:'第六境 · 镜外来人',stages:[51,60],description:'火光在琉璃长阶尽头凝成镜面。这里有许多与你同时抬手的影子，也有迟了一拍的。议席尚空，画卷未干，廊中的来客只肯隔镜说话。',palette:{sky:'#22213d',ground:'#4c5379',accent:'#c3bee9'}},
    {id:'abyss_throne',name:'归墟命枢',subtitle:'第七境 · 万线归零',stages:[61,70],description:'镜庭碎裂后，黑色星海展开。无数赤线从已经走过的道路汇来，穿过停转的星盘与无人收信的驿台。最深处的织机仍在转动，等待活人递上最后一个名字。',palette:{sky:'#100f24',ground:'#3b3154',accent:'#e6c9a0'}}
  ];

  const BOSSES = {
    gate_boss:{
      name:'渡灯人',title:'照微',rank:'boss',tier:'early',hp:65,portrait:'gate_boss',adult:true,
      lore:'照微曾替进入矿山的采灵人引路。实验反噬之夜，她用最后一盏渡灯照出山门，自己却留在了雾里。此后灯中不断响起已经归家的声音，她仍按旧名单一一应答，不肯让任何没有被灯认出的脚步越过山口。',
      quotes:['灯照得见你，人未必还认得路。','把名字留下。若回不来，我替你点灯。'],
      passive:'御寒灵躯：每两张实际施霜技能才凝成一层霜寒。',
      signature:'护灯会清除流血后撑起护盾；引魂灯会留下追索印记，让下一段攻击更危险。',
      appearance:{face:'成熟椭圆脸、古铜肤色、柔和厚唇、琥珀眼',hair:'深蓝长发编成侧辫',palette:'青玉、孔雀蓝、暖金',weapon:'悬着旧铜灯的长杖'},
      intents:[
        {name:'横灯',text:'攻击 9',hits:[9]},
        {name:'护灯',text:'清除全部流血，获得护盾 8，然后攻击 6',clearBleed:true,block:8,hits:[6]},
        {name:'双焰',text:'连续攻击 2 次，每次 5',hits:[5,5]},
        {name:'引魂灯',text:'获得护盾 6，施加 1 层追索印',block:6,playerMark:1}
      ]
    },
    camp_boss:{
      name:'缚誓者',title:'闻铮',rank:'boss',tier:'early',hp:85,portrait:'camp_boss',adult:true,
      lore:'闻铮是被派来封锁断桥的营将。诸宗曾在她面前盟誓共守封域，撤退时却各自带走了能带走的东西。她把被丢下的誓书铸进铠甲，替没有离开的守军继续值夜。如今桥头的锁链只认誓言，不认军令，也不肯分辨来人为何沉默。',
      quotes:['桥后还有人。谁准你们把名字划掉？','说出口的话，总该有一样东西肯留下。'],
      passive:'御寒灵躯：每两张实际施霜技能才凝成一层霜寒。',
      signature:'旧甲清霜并进入反击架势；断誓锁会减少下一回合的灵力，爆发前要留意其固定轮转。',
      appearance:{face:'棱角分明的晒褐面孔、断眉细疤、深棕眼',hair:'红棕高马尾、几缕散发',palette:'朱红、旧铜、墨黑',weapon:'刻满誓文的长枪与锁链'},
      intents:[
        {name:'缚誓',text:'攻击 12',hits:[12]},
        {name:'旧甲',text:'清除全部霜寒，获得护盾 9，架势反击 2',clearChill:true,block:9,counter:2},
        {name:'断桥三式',text:'连续攻击 3 次，每次 4',hits:[4,4,4]},
        {name:'断誓锁',text:'攻击 7，下个玩家回合灵力减少 1',hits:[7],energyPenalty:1}
      ]
    },
    snake:{
      name:'蛇妖·绛鳞',title:'观测井守',rank:'boss',tier:'early',hp:100,portrait:'snake',adult:true,
      lore:'绛鳞原本栖在旧山腹的暖泉中，与玄烬教换取能够温养鳞甲的丹砂。她察觉井底的东西不该被唤醒时，已经来不及游回泉眼。如今她以自身盘住观测井，把每次蜕下的旧鳞压进裂缝。她守门并非忠于魔教，只是不愿让井下的潮声追上自己。',
      quotes:['这里已经不是终点。退回去。','每脱一层鳞，我便少记得一点岸上的事。'],
      passive:'御寒灵躯：每两张实际施霜技能才凝成一层霜寒。',
      signature:'蛇息施毒，蜕鳞清除标记、霜寒与流血，绞缠逐段攻击。她只是通往更深空间的一道关口。',
      appearance:{face:'冷白细长脸、高颧骨、狭长翡翠眼、薄而深红的唇',hair:'红棕长发半挽，细辫垂肩',palette:'翡翠、绛红、旧金',weapon:'鳞刃与盘绕的蛇尾'},
      intents:[
        {name:'鳞刃',text:'攻击 10',hits:[10]},
        {name:'蛇息',text:'先攻击 6，再施加 3 层毒',hits:[6],poison:3},
        {name:'蜕鳞',text:'清除全部标记、霜寒与流血，再获得护盾 10',clearMark:true,clearChill:true,clearBleed:true,block:10},
        {name:'绞缠',text:'连续攻击 3 次，每次 5',hits:[5,5,5]}
      ]
    },
    bell_boss:{
      name:'葬钟姬',title:'晚蘅',rank:'boss',tier:'early',hp:78,portrait:'bell_boss',adult:true,
      lore:'晚蘅曾替无人认领的亡者主持送行。灾变后，送葬的钟声总在最后一响之前折回，棺中的名字也一次次从碑上脱落。她把丢失的名字系进三口铜钟，带着未能走完的送行队伍徘徊于山路。活人若听见自己的名字被钟声叫出，便会被她误认为又一位迟来的客人。',
      quotes:['再等一声，路就该开了。','你听见的，是谁的名字？'],
      passive:'御寒灵躯：每两张实际施霜技能才凝成一层霜寒。',
      signature:'第一声葬钟施加追索印，第二声扰乱抽牌，第三声连续敲击；停钟回合清除流血并防御。',
      appearance:{face:'成年圆润面孔、低垂紫瞳、浅肤色、饱满下唇',hair:'靛青齐刘海、长发盘成低髻',palette:'象牙白、深紫、青铜',weapon:'三口悬空古钟和一枚手铃'},
      intents:[
        {name:'一声问名',text:'攻击 8，施加 1 层追索印',hits:[8],playerMark:1},
        {name:'二声离念',text:'攻击 7，下个玩家回合少抽 1 张牌',hits:[7],drawPenalty:1},
        {name:'三声送行',text:'连续攻击 3 次，每次 4',hits:[4,4,4]},
        {name:'停钟',text:'清除全部流血，获得护盾 12',clearBleed:true,block:12}
      ]
    },
    lotus_boss:{
      name:'故宅机仆',title:'缄红',rank:'boss',tier:'early',hp:92,portrait:'lotus_boss',adult:true,
      lore:'缄红是偃师为故宅造的家政机仆，善奉茶、洒扫、缝衣，从未装过兵刃。封域后，一伙寻宝客夺走器谱，焚宅灭口。主人临终只来得及说“看好家”，她却从断裂的留声簧里反复听见那声求救。她把铜壶烧沸，把扫帚换上铜针，将主人的钥匙与残袖收在心匣中。从此空席前总有一盏热茶；每个携灵器上门的人，都可能被她认作尚未偿债的凶手。',
      quotes:['茶还热。请坐，主人一会儿就回来。','这道血迹……还没擦干净。请您留下。','缝好这一处，您就不会再丢下我了。'],
      passive:'瓷木机关：每两张实际施霜技能才凝成一层霜寒。血债覆令：生命不高于一半时，每段攻击额外 +1；准确数值直接计入意图，结束玩家回合时锁定本次出招；回合起始扣血不会临时加伤。',
      revenge:{name:'血债覆令',threshold:0.5,perHit:1},
      signature:'沸盏奉茶留下追索印，铜针扫帚扰乱抽牌，裁衣剪与缚命红线封住灵力；覆釜时铁锅护体并反击。半血后家令被复仇覆写，但四式顺序不变。',
      appearance:{face:'成熟微方长脸、白瓷裂纹金缮、左侧琥珀机关眼与右侧墨色眼、克制哀怒',hair:'墨漆低髻、旧银匙代簪',palette:'深翡翠、朱漆红、旧铜金',weapon:'展开的朱漆家政柜与四条工具臂，沸茶铜壶、铁锅、裁衣剪、针线轮、铜针扫帚；心匣藏主人旧钥匙与残袖'},
      intents:[
        {name:'奉茶·沸盏',text:'铜壶泼沸茶：连续攻击 2 次，每次 4，再施加 2 层追索印',hits:[4,4],playerMark:2,household:'kettle'},
        {name:'洒扫·净门',text:'铜针扫帚攻击 8，下个玩家回合少抽 1 张牌',hits:[8],drawPenalty:1,household:'broom'},
        {name:'缝衣·缄喉',text:'裁衣剪连续攻击 3 次，每次 3，下个玩家回合灵力减少 1',hits:[3,3,3],energyPenalty:1,household:'shears'},
        {name:'护主·覆釜',text:'清除全部流血，获得护盾 12，铁锅架势反击 2',clearBleed:true,block:12,counter:2,household:'pan'}
      ]
    },
    marsh_boss:{
      name:'溺月龙女',title:'泠汐',rank:'boss',tier:'middle',hp:155,portrait:'marsh_boss',adult:true,
      lore:'泠汐守过一条已经干涸的支江，依照古约替沿岸村落分水。引灵仪把她与整条河的倒影一同拽进井下，河床从此向天空生长。她用借来的月光照着沉村，试图分清哪些房屋还有人居住。水里的人向她求晴，岸上的人向她求雨，她逐渐听不出两者的区别。',
      quotes:['月沉下去之前，谁也不能从水里走。','我答应过他们，要把河送回家。'],
      passive:'御寒灵躯：每两张实际施霜技能才凝成一层霜寒。',
      signature:'潮印追索后接重击；逆潮清除霜寒并防御，龙渊三叠以连续攻击穿过薄盾。',
      appearance:{face:'宽颧骨与坚毅下颌、灰蓝肤色、金色圆瞳',hair:'银白长发编成两束粗辫',palette:'冷青、珠白、深海蓝',weapon:'水镜长枪、珍珠龙冠与鹿角形龙角'},
      intents:[
        {name:'潮印',text:'攻击 12，施加 2 层追索印',hits:[12],playerMark:2},
        {name:'月落',text:'攻击 17',hits:[17]},
        {name:'逆潮',text:'清除全部霜寒，获得护盾 16',clearChill:true,block:16},
        {name:'龙渊三叠',text:'连续攻击 3 次，每次 5',hits:[5,5,5]}
      ]
    },
    furnace_boss:{
      name:'焚愿宫主',title:'赤绫',rank:'boss',tier:'middle',hp:175,portrait:'furnace_boss',adult:true,
      lore:'赤绫曾替求仙者保管愿帖，从未问过那些愿望值不值得。玄烬教买走长明炉后，她才看见愿望也会燃烧，人的执念比地火更久。如今她坐在炉城最高处，把未兑现的愿一卷卷送回火里。她相信只要炉火没有熄灭，世上便没有真正落空的承诺。',
      quotes:['你的愿望，比你本人更耐烧。','火还没灭，谁说这是空许？'],
      passive:'御寒灵躯：每两张实际施霜技能才凝成一层霜寒。',
      signature:'焚愿抽走下回合灵力；金乌羽扇连续攻击，烬衣清除流血并反击，须选择进攻窗口。',
      appearance:{face:'心形面孔、铜色皮肤、高挑眉尾、金橙色瞳孔',hair:'火红棕色大卷长发',palette:'朱砂红、熔金、黑漆',weapon:'金乌羽扇、悬空愿帖与炉火'},
      intents:[
        {name:'焚愿',text:'攻击 12，下个玩家回合灵力减少 1',hits:[12],energyPenalty:1},
        {name:'金乌羽扇',text:'连续攻击 3 次，每次 6',hits:[6,6,6]},
        {name:'烬衣',text:'清除全部流血，获得护盾 14，架势反击 3',clearBleed:true,block:14,counter:3},
        {name:'炉心倾泻',text:'攻击 19',hits:[19]}
      ]
    },
    mirror_boss:{
      name:'千面琉璃',title:'素照',rank:'boss',tier:'middle',hp:190,portrait:'mirror_boss',adult:true,
      lore:'素照并不记得自己曾是哪一面镜子的主人。她替入域者映照容颜，镜中的恐惧、骄傲与后悔却一次次留在了她脸上。她把不能相容的面孔封进琉璃议席，只保留一张自己选定的脸。来客若坚持镜中另有其人，她便会亲手碎镜，请对方从碎片里指出唯一的真相。',
      quotes:['你认得这张脸，还是只认得自己？','请选一面。碎掉的那面，也会记住你。'],
      passive:'御寒灵躯：每两张实际施霜技能才凝成一层霜寒。',
      signature:'换相清除三类状态，回照架势反击；碎镜三问干扰抽牌，镜中判词施加追索印。',
      appearance:{face:'菱形脸、瓷白肤色、金与淡紫异色瞳、短而清晰的唇线',hair:'光滑黑色短波波头、单侧银饰',palette:'靛蓝、银白、虹彩紫',weapon:'悬空破镜光环与银片折扇'},
      intents:[
        {name:'镜中判词',text:'攻击 13，施加 1 层追索印',hits:[13],playerMark:1},
        {name:'回照',text:'获得护盾 14，架势反击 3',block:14,counter:3},
        {name:'碎镜三问',text:'连续攻击 3 次，每次 5，下个玩家回合少抽 1 张牌',hits:[5,5,5],drawPenalty:1},
        {name:'换相',text:'清除全部标记、霜寒与流血，恢复 8 点生命',clearMark:true,clearChill:true,clearBleed:true,heal:8}
      ]
    },
    abyss_boss:{
      name:'归墟司命',title:'无央',rank:'boss',tier:'final',hp:250,portrait:'abyss_boss',adult:true,
      lore:'无央是引灵仪最初试图接触的存在，也可能只是仪式替那个存在织出的名字。玄烬教以为自己从地底借来了力量，实际上却给山川、亡者与活人的选择各牵上了一根线。她坐在命枢前，从不伸手追逐逃走的人；每一条试图离开的道路，都会在她掌中重新交汇。',
      quotes:['走到这里，便不是谁引你来的了。','线尽之后，你仍肯用自己的名字作答么？'],
      passive:'御寒灵躯：每两张实际施霜技能才凝成一层霜寒。',
      signature:'赤线追索后接三段裁命，收束回合清除状态并修复命枢，天倾终线兼有重击与封脉。四式固定，可提前规划守势。',
      appearance:{face:'四十余岁的威严修长面孔、深金褐眼、饱满鼻梁、额心细金命纹',hair:'紫黑长发高髻、金色星钗',palette:'象牙白、暗金、宇宙墨黑、极少赤线',weapon:'黑金天机织轮、红色命线与星盘光环'},
      intents:[
        {name:'赤线·问名',text:'攻击 13，施加 2 层追索印',hits:[13],playerMark:2},
        {name:'万劫·裁命',text:'连续攻击 3 次，每次 6',hits:[6,6,6]},
        {name:'命枢·收束',text:'清除全部标记、霜寒与流血，恢复 8 点生命，获得护盾 12',clearMark:true,clearChill:true,clearBleed:true,heal:8,block:12},
        {name:'天倾·终线',text:'连续攻击 2 次，每次 10，下个玩家回合灵力减少 1',hits:[10,10],energyPenalty:1}
      ]
    }
  };

  // Exact elite base values. Engine owns their scaling, targeting marks and weighted choice.
  const ELITES = {
    e_mist:{name:'雾中伥',rank:'elite',hp:56,weights:[3,2,3],intents:[{name:'牵魂',text:'攻击 10，施加 1 层追索印',hits:[10],playerMark:1},{name:'蔽目',text:'攻击 8，施加 2 层追索印',hits:[8],playerMark:2},{name:'雾遁',text:'获得护盾 12',block:12}]},
    e_lantern:{name:'断桥灯魁',rank:'elite',hp:76,weights:[3],intents:[{name:'引焰',text:'攻击 14',hits:[14]}]},
    e_priest:{name:'逆仪祭司',rank:'elite',hp:92,weights:[3,2,3],intents:[{name:'祭仪',text:'获得护盾 10，施加 1 层追索印',block:10,playerMark:1},{name:'咒刃',text:'攻击 16',hits:[16]},{name:'逆祝',text:'恢复 8 点生命，获得护盾 8',heal:8,block:8}]}
  };
  const EARLY_BOSSES=['gate_boss','camp_boss','snake','bell_boss','lotus_boss'];
  const MID_BOSSES=['marsh_boss','furnace_boss','mirror_boss'];
  const FINAL_BOSS='abyss_boss';

  const EVENTS = {
    marsh_pharmacy:{name:'水上药庐',glyph:'药',regionIndex:3,minRegion:3,maxRegion:3,minFloor:32,maxFloor:39,story:['一间药庐用粗绳系在老柳上，案边的年轻人正把浸水的药纸重新晾干。','她没有问你来自哪里，只把两只药包推到干燥的一侧：“这一包养伤，那一包拔毒。看清了再拿。”'],choices:[
      {label:'付 18 金币，收一包凝露叶',text:'获得凝露叶 ×2，收入包裹；每份恢复 12 生命。',goldCost:18,itemGrants:[{id:'dewherb',count:2}],outcome:'你把钱压在药纸下。她在两包凝露叶上各系了一根防潮细绳。'},
      {label:'付 35 金币，取拔毒丹',text:'获得百草解厄丹 ×1，收入包裹；服用时彻底解除毒素。',goldCost:35,itemGrants:[{id:'antidote',count:1}],outcome:'瓶口封蜡仍有余温。她确认你看清药名，才松开搭在瓶上的手。'},
      {label:'帮她把药架搬上高处',text:'获得回春草 ×1，不花费金币。',itemGrants:[{id:'herb',count:1}],flags:{sevenPharmacyHelp:true},outcome:'药架稳稳落在梁上。临走时，一小束回春草被塞进了你的包裹。'}
    ]},
    reed_procession:{name:'苇间送行',glyph:'苇',regionIndex:3,minRegion:3,maxRegion:3,minFloor:32,maxFloor:39,story:['一列白衣人从苇间走过，没有鼓乐，只有鞋底踏水的轻响。队尾一名女子抱着空盒，问你可曾看见盒盖上的那只纸鹤。','苇根下恰好压着半只纸翅，另一半已被水浸软。她看着纸片，迟迟没有伸手。'],choices:[
      {label:'用护身符纸替她折一只',text:'失去 4 生命，获得 25 金币与回春草 ×1。',hpCost:4,goldGain:25,itemGrants:[{id:'herb',count:1}],outcome:'符纸折起时掠过掌心，留下一道细伤。女子把纸鹤放进盒中，向你行礼，铜钱与草束留在了岸边。'},
      {label:'陪她把残翅烘干',text:'恢复 10 生命，不取得盒中的东西。',heal:10,outcome:'你们守着一小簇火。等纸翅重新挺起，她才轻轻说了一声谢谢；火边的暖意也让你的呼吸平稳下来。'},
      {label:'告诉她纸鹤所在，然后离开',text:'不改变数值。',outcome:'她沿着你的指向慢慢走近苇根。送行队伍放慢了脚步，给她留下了一段距离。'}
    ]},
    drowned_archive:{name:'沉底书楼',glyph:'书',regionIndex:3,minRegion:3,maxRegion:3,minFloor:32,maxFloor:39,story:['潮水退去半丈，一座书楼的二层露了出来。窗内的书页没有湿，墨迹却像鱼一样游动。','楼中有人隔窗递出一块木牌：“以一页换一页。不要把整本拿走。”'],choices:[
      {label:'付 30 金币，换一页完整功诀',text:'随机获得一张本职业稀有技能，进入事件时固定。',goldCost:30,cardRarity:'rare',outcome:'你接过的一页不再游动。楼中人合上木窗，像完成了一笔极寻常的借阅。'},
      {label:'把窗边散页按次序归好',text:'下场战斗首回合获得 10 护盾。',guard:10,flags:{sevenArchiveRepaired:true},outcome:'散页归位后，墨色沿着你的护符描出一圈细纹。水涨回窗下时，木牌已经不见了。'},
      {label:'只读门上的题字',text:'获得 12 金币，不拿走书页。',goldGain:12,outcome:'题字读完，一枚旧书签落到掌中。夹在其中的铜钱不多，足够付下一段路的灯油。'}
    ]},
    furnace_ledger:{name:'焚愿账房',glyph:'账',regionIndex:4,minRegion:4,maxRegion:4,minFloor:42,maxFloor:49,story:['长案后一位女子正在烧账。每烧掉一页，案上便多出一枚温热的铜钱。','她看见你停下，把一册尚未点燃的薄账移到灯下：“查自己的，还是替旁人付清？”'],choices:[
      {label:'付 20 金币，结清一册旧账',text:'获得虎魄丹 ×1，收入包裹。',goldCost:20,itemGrants:[{id:'battle_pill',count:1}],outcome:'账页没有落入火中，而是化成一缕赤光，凝进你取走的药瓶。'},
      {label:'把案上冷掉的炉钱收走',text:'获得 28 金币。',goldGain:28,outcome:'她没有拦你，只在空白处重新写下一行字。炉钱在掌心渐渐冷却，分量与寻常钱币无异。'},
      {label:'不翻账，只添一盏灯油',text:'恢复 12 生命。',heal:12,outcome:'新灯照亮了帐房的门。你在门边坐了一会儿，手脚的僵硬逐渐散去。'}
    ]},
    captive_smith:{name:'炉侧敲声',glyph:'锻',regionIndex:4,minRegion:4,maxRegion:4,minFloor:42,maxFloor:49,story:['偏殿传来极有节奏的敲击声。门没有锁，里面的铸匠却始终不肯跨过炉前的一道白线。','她把一段烧红的锁链送回砧上：“帮我压住炉门。最后这一下，我一个人落不准。”'],choices:[
      {label:'替她压住炉门',text:'失去 5 生命，随机获得一张本职业稀有技能。',hpCost:5,cardRarity:'rare',flags:{sevenSmithHelped:true},outcome:'热浪擦过手臂，最后一锤落下。她将薄薄的淬刃札记递给你，自己仍站在白线另一侧。'},
      {label:'付 25 金币，请她修整护符',text:'下场战斗首回合获得 14 护盾。',goldCost:25,guard:14,outcome:'她没有碰你的兵刃，只把护符背面的裂口锤合。细小的金属声久久不散。'},
      {label:'把门边的冷水留给她',text:'获得回春草 ×2。',itemGrants:[{id:'herb',count:2}],outcome:'铸匠终于停了一锤。她用两束耐热灵草回礼，示意你从另一侧的阴影离开。'}
    ]},
    ash_orchard:{name:'灰烬果园',glyph:'果',regionIndex:4,minRegion:4,maxRegion:4,minFloor:42,maxFloor:49,story:['烧成灰白的果树仍挂着三枚红果。树下没有脚印，只有一只盛着清水的瓷碗。','风过时，红果里传出很轻的笑声。你认得枝叶上留下的药性，却认不出这片果园原来的名字。'],choices:[
      {label:'摘下一枚，炼成回气丹',text:'获得回气丹 ×1，收入包裹；恢复 24 生命。',itemGrants:[{id:'healing_pill',count:1}],outcome:'果肉遇火即化，留下了一枚温热的丹丸。枝头的笑声随着红色一同淡去。'},
      {label:'付 22 金币，换枝上凝成的灵露',text:'恢复 20 生命。',goldCost:22,heal:20,outcome:'铜钱沉入碗底，树叶上凝出几滴澄澈灵露。你饮下它们，喉间没有半分灰味。'},
      {label:'把碗里的清水浇在树根',text:'获得聚灵丹 ×1。',itemGrants:[{id:'spirit_pill',count:1}],outcome:'树根下露出一只细小玉瓶。你收走它时，枯枝轻轻垂低，像替你让开了道路。'}
    ]},
    mirror_guest:{name:'隔镜来客',glyph:'镜',regionIndex:5,minRegion:5,maxRegion:5,minFloor:52,maxFloor:59,story:['廊中立着一面没有背板的镜子，一位衣着整齐的女子从镜里朝你颔首。她脚边也有一个包裹，系法与你眼前的商货很像。','“隔着镜子，谁也不能多拿。”她把三只药瓶放在镜前，瓶中各有不同颜色的光。'],choices:[
      {label:'付 35 金币，交换九转还元丹',text:'获得九转还元丹 ×1，服用时完全恢复生命。',goldCost:35,itemGrants:[{id:'fullheal_pill',count:1}],outcome:'两边的手在镜面相抵，药瓶却真的落进你的掌中。她收好钱，重新把袖口抚平。'},
      {label:'付 18 金币，交换虎魄丹',text:'获得虎魄丹 ×1。',goldCost:18,itemGrants:[{id:'battle_pill',count:1}],outcome:'赤色丹丸带着灼热的香气。镜里的女子把空位置轻轻擦净，没有再推销别的。'},
      {label:'谢过她，沿着镜外走',text:'不改变数值。',outcome:'她也向镜子的另一侧走去。谁先离开了视线，你没有回头确认。'}
    ]},
    unfinished_portrait:{name:'未竟之像',glyph:'画',regionIndex:5,minRegion:5,maxRegion:5,minFloor:52,maxFloor:59,story:['一幅大画铺在地上，衣冠、手势和背景都已画好，脸上却只有淡淡的底色。颜料旁压着一张小纸，写着：“请留一处你愿意记得的。”','画笔没有指向你。它只是搁在那里，像主人随时会回来。'],choices:[
      {label:'以 4 点生命留下一抹颜色',text:'随机获得一张本职业稀有技能。',hpCost:4,cardRarity:'rare',outcome:'颜色落在画边的一朵花上。画没有长出你的脸，倒是笔下的一段运气之法清晰起来。'},
      {label:'付 24 金币，买下旁边的旧画谱',text:'从本局牌组永久移除一张基础牌；牌组至少保留五张。',goldCost:24,removeBasic:true,outcome:'旧画谱只讲留白。你合上它，终于明白有一式熟练的旧招，不必再随身带着。'},
      {label:'替画纸压住卷起的一角',text:'恢复 8 生命，获得回春草 ×1。',heal:8,itemGrants:[{id:'herb',count:1}],outcome:'窗缝里的风不再掀动画纸。你在廊下歇脚，起身时看见压纸石旁多了一束灵草。'}
    ]},
    glass_assembly:{name:'琉璃议席',glyph:'席',regionIndex:5,minRegion:5,maxRegion:5,minFloor:52,maxFloor:59,story:['十二张琉璃椅围着一张无字石桌，其中十一张映着人影。空着的那一张朝向来路，扶手上放着一枚敲席的玉槌。','你站着不动，人影也没有催促。石桌中央有三个小匣，盖上分别刻着灯、刃与叶。'],choices:[
      {label:'开启刻着灯的小匣',text:'获得聚灵丹 ×2。',itemGrants:[{id:'spirit_pill',count:2}],outcome:'匣中两枚丹药轻轻相碰。十一道人影依次低头，像为一件寻常事务作了见证。'},
      {label:'开启刻着刃的小匣',text:'付 25 金币，随机获得一张本职业精巧技能。',goldCost:25,cardRarity:'uncommon',outcome:'小匣里不是兵刃，而是一页折成刃形的功诀。你收好它，空椅仍朝着来路。'},
      {label:'开启刻着叶的小匣',text:'获得凝露叶 ×2。',itemGrants:[{id:'dewherb',count:2}],outcome:'绿叶上还凝着水。你没有坐下，匣盖合拢时，身后的廊门已重新映出前路。'}
    ]},
    fate_tailor:{name:'补命针线',glyph:'线',regionIndex:6,minRegion:6,maxRegion:6,minFloor:62,maxFloor:69,story:['一位白发女子坐在星海旁补衣，脚边的线团全是黑色，针尖却每次都带出一缕金光。','她抬眼看了看你的袖口：“衣服能补，伤也能补。别急着把名字一并缝进去。”'],choices:[
      {label:'付 30 金币，请她补一处旧伤',text:'恢复 24 生命，并获得回春草 ×1。',goldCost:30,heal:24,itemGrants:[{id:'herb',count:1}],outcome:'针尖并未碰到皮肤，衣上的裂口却一寸寸合拢。你再呼吸时，肋下旧痛已轻了许多。'},
      {label:'付 36 金币，请她缝上拔毒纹',text:'彻底解除缠脉毒，不恢复生命；仅中毒时可选。',goldCost:36,cureAffliction:true,requiresAffliction:true,outcome:'一圈细密的针脚收住掌心黑线。她把末端剪断，连同针尖的一点暗色一并丢进星海。'},
      {label:'替她收起散落的针',text:'下场战斗首回合获得 12 护盾。',guard:12,outcome:'针没有扎手，只在护符上落了三个细孔。女子把线团拨向一旁，为你让出了路。'}
    ]},
    silent_astrolabe:{name:'停转星盘',glyph:'星',regionIndex:6,minRegion:6,maxRegion:6,minFloor:62,maxFloor:69,story:['一座巨大的星盘横卧在断阶上，指针指向一个被刮掉的字。盘沿仍有供人转动的握柄，上面留着不同深浅的指印。','你摸到了一处温热的刻槽。星盘没有转，远处命枢的细线却短暂地绷紧了。'],choices:[
      {label:'付 28 金币，补回缺失的铜齿',text:'随机获得一张本职业稀有技能。',goldCost:28,cardRarity:'rare',outcome:'铜齿咬合时，盘面只前进了一格。刮掉的字没有回来，藏在刻槽中的一页功诀却完整展开。'},
      {label:'顺着指针的方向运气',text:'恢复 15 生命，获得聚灵丹 ×1。',heal:15,itemGrants:[{id:'spirit_pill',count:1}],outcome:'一口浊气沿着指针散去。星光在掌心凝成一枚丹丸，盘面仍安静地停在原处。'},
      {label:'不动星盘，绕过断阶',text:'获得 18 金币。',goldGain:18,outcome:'断阶另一侧有一袋旧钱，袋口扎着褪色绳结。你收好它，没有替星盘选择下一个方向。'}
    ]},
    last_campfire:{name:'最后一盏营火',glyph:'火',regionIndex:6,minRegion:6,maxRegion:6,minFloor:62,maxFloor:69,story:['星海中有一块能够落脚的旧石地，篝火烧着从山门带来的松枝。火边没有人，只有三只杯子，杯中的水仍温着。','一张折起的纸压在杯下：“若还有后来的人，请留一杯。”字迹被热气晕开，看不出出自谁手。'],choices:[
      {label:'坐下喝一杯水，把余下的留下',text:'恢复 18 生命。',heal:18,outcome:'杯里的水有淡淡松香。你把杯子放回原处，火光落在一路带来的行囊上，像远处仍有一扇门。'},
      {label:'把松枝换成随身火符，取走炉边丹药',text:'失去 3 生命，获得九转还元丹 ×1。',hpCost:3,itemGrants:[{id:'fullheal_pill',count:1}],outcome:'火符引燃时烫过指节。炉边的小药瓶被你取走，松枝却还能为下一位来人继续燃上一阵。'},
      {label:'把火拨旺，整理最后的护符',text:'下场战斗首回合获得 16 护盾。',guard:16,outcome:'火星没有升向天空，而是融进护符边沿。你看了看留下的两杯水，转身走向命枢。'}
    ]}
  };
  for(const [id,boss] of Object.entries(BOSSES))boss.id=id;
  for(const [id,event] of Object.entries(EVENTS))event.id=id;
  const api={REGIONS,REGIONS7:REGIONS,BOSSES,ENEMIES:BOSSES,ELITES,EARLY_BOSSES,MID_BOSSES,FINAL_BOSS,EVENTS,
    EVENT_IDS:Object.keys(EVENTS),PORTRAIT_IDS:[...Object.keys(BOSSES),...Object.keys(ELITES)],REGION_IDS:REGIONS.map(region=>region.id)};
  root.NightSeven=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis==='object'?globalThis:window);
