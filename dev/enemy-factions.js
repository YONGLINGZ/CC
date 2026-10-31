/* P1–P4: all thirty-seven templates and fourteen faction encounter groups are implemented; device and human evaluation remain separate. */
(function(root){'use strict';
const BUDGETS=[{a:7,d:6,h:32},{a:8,d:7,h:40},{a:9,d:8,h:48},{a:10,d:9,h:60},{a:11,d:10,h:70},{a:12,d:11,h:80},{a:13,d:12,h:88}];
const DEFS={m01:{name:'失味膳役',boss:'lotus_boss',rank:'normal',trait:'饥乱：首次半血后每段攻击+1；每次行动后自损2，最多三次。'},m02:{name:'缝门纸偶',boss:'lotus_boss',rank:'normal',trait:'缀门形成反击1；每张攻击牌首次伤及生命时才反击一次。'},m03:{name:'夺谱探客',boss:'lotus_boss',rank:'elite',trait:'拆护额外削盾3，绝不溢出到生命。'},m19:{name:'添愿炉役',boss:'furnace_boss',rank:'normal',trait:'拨炉蓄热1；下次攻击首段+3后消耗。'},m20:{name:'寿契灰客',boss:'furnace_boss',rank:'normal',trait:'借年按实际生命伤害治疗，每次最多3、全战最多6。'},m21:{name:'断契拾灰人',boss:'furnace_boss',rank:'elite',trait:'只识别有效续炉寿契，不以火属性技能判断立场。'}};

const FRONTIER={
gate_boss:{source:'灯链断处',cave:'不点灯的渡棚',npc:'m06',support:'lamp_knot',oppose:'lamp_cut',aid:'lamp_cloth',proof:'无灯航线拓记',normal:['m04','m05'],warning:'棚外灯链全被剪断。衣外的续灯灯结，会让棚中人把你认作追兵。',supportName:'续灯灯结',opposeName:'断灯剪印',aidName:'遮灯帛',effect:'playerMark',
sourceText:['巡灯纸役把一名迷路老人牵到灯下，却拦着一名没有姓名的背夫。老人攥着灯杆：“灯一灭，我连回家的桥在哪都找不到。”','背夫指着挂名簿：“我的木牌被水泡没了。要我在这里等到有人认领吗？”纸役没有回答，只把灯结递给你。'],supportChoice:'答应替巡灯役护灯，收下续灯结',opposeChoice:'答应剪开拦路灯链，接应渡客',opposeActionName:'履行剪链约定，带一名渡客过河',opposeAction:'你当场剪开封路灯链，护送一名无名背夫走暗水路。老人选择留在灯下；取得「遮灯帛」，可在渡灯人战中减少首次追索印。此举放弃洞府精英战奖励。',opposeOutcome:'你剪开灯链并带一名背夫过河。老人留在灯下；纸役没有保证所有人都能平安渡过。',investigationIntro:'剪灯客认出你抄下的灯簿：“名字没在册上，不等于这人不该过河。可老人也不能被留在黑里。”',intro:'剪灯客把熄灯的小船推回阴影：“我剪的是拦路的链，可灯一灭，没跟上来的人也会迷路。”',testimony:'背夫的木牌被水磨平，巡灯役不敢认他；灯簿又只准有名者过渡。她知道一条不经灯簿的小路，也承认昨夜有人没能跟上。',investigation:'你记下木牌被水磨去的痕迹，也抄了灯簿拒绝无名者的条款；这能证明谁没被登记，不能证明谁故意拦人。',investigationReply:'你拿旧渡簿和水痕带一名无名背夫走过暗水路。老人仍选择留在亮处；剪灯客没有替她作决定。',investigationAftermath:'旧渡簿只让一名背夫过河；老人仍留在灯下。剪灯客没有替任何人决定去留。',battleLines:{support:'照微认出你衣上的续灯灯结：“你答应护灯，却要进我的渡棚。灯灭之后，谁替那位老人认路？”',oppose:'照微看见断灯剪印：“你剪开链，只带走一名背夫。老人还留在岸上，别替他们说都得救了。”',investigation:'照微翻过你带来的旧渡簿：“它能证明谁没登记，却不能替我回答灯灭之后谁能回家。”'},help:'你交药给等船的老人。她选择留在亮处，不愿随船逃走；渡客没有再劝。',reply:'渡棚留下被剪断的灯链。老人留在岸边等天亮；渡客带走了愿意跟上的人。'},
camp_boss:{source:'军令与药箱',cave:'堤下伤卒营',npc:'m09',support:'pursuit_order',oppose:'pass_fold',aid:'loose_band',proof:'空担架名册',normal:['m07','m08'],warning:'营门军徽都已剪去。公开佩着拘逃军令的人，会被守营者视作追捕者。',supportName:'拘逃军令',opposeName:'放行折符',aidName:'松誓绷带',effect:'energyPenalty',
sourceText:['残卒一把按住药箱：“带走一瓶，营里就少救一个人！”独臂逃卒拖着担架：“药锁了两天，他们等得到开箱吗？”','药役打断他们：“箱里还剩几份，我记得。先说清楚你们要我把药给谁。”残卒把军令递给你，逃卒伸手去推侧栅。'],supportChoice:'接受追药军令，之后拦下逃卒',opposeChoice:'答应送出一副担架，收下放行折符',opposeActionName:'按放行折符送出一副担架',opposeAction:'你只放行名册中那一副担架，不替所有逃卒作决定。药役给你一卷「松誓绷带」，可在缚誓者战中抵消一次封灵。此举放弃洞府精英战奖励。',opposeOutcome:'你把放行折符交给担架上的伤卒。他随你离营；其他人有人留下，有人另寻出路。',investigationIntro:'药役把你记下的数量与名册逐项对过：“至少这副担架在册。药箱谁锁的、药去了哪儿，还要继续查。”',intro:'独臂枪手把短枪压在担架上：“你是来拿药，还是来问我们为什么走？”他身后仍有一副空担架。',testimony:'他承认曾让一队人走亮处引开巡卒；伤者因此过桥，诱饵却没有全部回来。他不肯把这件事称作两全。',investigation:'药役核对了剩余药量与担架名册：有人确实缺药，也有一副空担架尚未登记去向。账目不能说明是谁私拿了药。',investigationReply:'你按名册陪一副担架先过侧栅，药役留下记录并交给你一卷绷带。其他伤卒与逃卒仍自行决定去留。',investigationAftermath:'名册让一副担架先过侧栅，但没有证明是谁动了药箱；营中仍有人等待查账。',battleLines:{support:'闻铮认出你身上的拘逃军令：“你来追人，还是来问药去了哪儿？誓墙上两件事写成了同一行。”',oppose:'闻铮看见放行折符：“你送走了一副担架；营里留下的人还在问药。别把放行说成救下全营。”',investigation:'闻铮核过你带来的名册：“数字对上了，缺药是真的；是谁扣下钥匙，还没有答案。”'},help:'药箱打开，一名伤卒自己拆下军牌；另一人仍把军牌贴身放好。他们没有替全营作决定。',reply:'桥边留下脱下的军牌与一卷用空的绷带；逃走的人仍有各自的去处。'},
snake:{source:'井沿的两张方子',cave:'秤鳞石窟',npc:'m12',support:'well_oath',oppose:'well_chisel',aid:'clean_gauze',proof:'加量药账',normal:['m10','m11'],warning:'石窟秤着旧鳞。封井鳞誓露出的绿光，会被当作阻断买卖的标志。',supportName:'封井鳞誓',opposeName:'开井凿契',aidName:'净砂药纱',effect:'poison',
sourceText:['井役把裂鳞压进泥里：“井封上，药铺明天就没水。”药工指着药方上的加量记号：“有人把剂量改大了，我没有写这笔。”','采鳞者推来秤盘：“开一道取鳞的路，药材就能下山。价钱到了窟里再谈。”她没有写报价。井外那瓶药还没分给病人。'],supportChoice:'答应替井役守住封井约定',opposeChoice:'答应替采鳞者开路，收下凿契',opposeActionName:'付12灵石，交凿契验货并取得净砂药纱',opposeAction:'支付12灵石购买1份回春草；采鳞者同时交付「净砂药纱」作为开井委托的验货凭据，之后才会开路。买卖不代表治好病人或证明谁改了药方。此举放弃洞府精英战奖励。',opposeOutcome:'你付清十二枚灵石，买下回春草；采鳞者验过凿契，交出净砂药纱，并开始履行开井委托。药工和井外病人的处境仍未解决。',investigationIntro:'采鳞者看到旧价账，沉默片刻：“上回是八枚。这回井路封了，我报十二。加量那笔字，我没签。”',intro:'她将秤砣推回自己这边：“我是来做生意的。我卖你一份药材，十二枚灵石；别把买卖说成救人。”',testimony:'已核过的药账显示，买主要求加量，商人也多收了灵石。旧方能说明原先的配法，不能替病人停药或治疗。',investigation:'你核对旧方和账本：同一味药上次卖八枚灵石，这次记作十二枚；加量字迹与收款签名不是同一只手。能议价，不能据此认定谁下毒。',investigationReply:'旧价账让你把回春草的价钱谈回八枚灵石。采鳞者收了钱，仍不承认谁改了剂量；药工仍等着另找药师核方。',investigationAftermath:'旧价账让你少付四枚灵石；买主是谁、加量是谁写的，仍无人认下。井外病人的药方没有因此改动。',battleLines:{support:'绛鳞看见你带来的封井鳞誓：“你答应封井，药铺还在等明天的水。你知道他们等的是什么吗？”',oppose:'绛鳞认出开井凿契：“货已经买到，病人的方子却没变。你要取鳞，还是查谁改了剂量？”',investigation:'绛鳞看着旧价账：“价差能证明有人多收钱，不能证明是谁把剂量改大。”'},help:'你把药草交给一名手掌发黑的药工。他把今天的剂量减了一次；明天是否继续，仍由他和药师商量。',reply:'药账留着被划掉的一笔。病人今天少服了一次，井仍封着；药债没有因此结清。'},
bell_boss:{source:'尚未系上的名字',cave:'无钟墓室',npc:'m15',support:'bell_knot',oppose:'bell_wedge',aid:'echo_wedge',proof:'归骨拓名纸',normal:['m13','m14'],warning:'墓室不挂钟。衣外的续钟铃结一响，掘名者会认为你来把姓名重新留在钟阵里。',supportName:'续钟铃结',opposeName:'停钟木楔',aidName:'止响短楔',effect:'drawPenalty',
sourceText:['家属抱着一块无字碑：“再留一晚，我还能听见他。”抬棺人把棺绳放下：“我已经背这副棺走了十年，不能再替他走一遍。”','执幡役说，补上名字只是记住死者；把名字系进钟阵，亡者才会留下。她把铃结和木楔放在你面前：“你要做的是哪一个？”'],supportChoice:'答应替家属留魂，收下续钟铃结',opposeChoice:'答应抬棺人停钟归骨，收下木楔',opposeActionName:'替这一户停钟归骨',opposeAction:'你按停钟木楔，替这一户解开续钟绳，把碑名交还家属。获得「止响短楔」，可在晚蘅战中抵消一次减抽牌。此举放弃洞府精英战奖励。',opposeOutcome:'你替这一户停下续钟。家属最终随棺车离开；抬棺人没有替其他亡者作决定。',investigationIntro:'掘名人看过你核出的碑名：“名字对得上，只说明这是谁；要不要留下，还是他们自己的话。”',intro:'她把石拓卷递到灯下：“名字带走，骨也带走。可有的人只想再听一次，未必愿意谢我。”',testimony:'她曾凿错一块无字碑，认错的家属仍坚持供奉多年。如今她逐字问证，不再凭自己的一次善意替别人决定送别。',investigation:'你把碑上的旧刻痕与抬棺名册对在一起，只能确认这一户的名字；家属是否愿意让亡者留下，仍须由他们自己决定。',investigationReply:'核名后，这户家属决定把碑留在原处，跟着棺车离开。抬棺人没有替别户剪断钟绳，并把一枚止响短楔交给你。',investigationAftermath:'这一户家属决定随棺车离开；其他无字碑仍没有被你代为补名。',battleLines:{support:'晚蘅认出你衣上的续钟铃结：“你答应替他们留一晚。你看见那户人家已经随棺车走了吗？”',oppose:'晚蘅看见停钟木楔：“你替这一户解绳，不等于其他亡者也想离开。”',investigation:'晚蘅核过你带来的碑名：“名字对了，心愿还要问活着的家属；我不能替他们说。”'},help:'你交药稳住拓名人的手，帮她对照旧碑。只记下本次确认的一人，不把其余空白填上。',reply:'墓外多了一张确认过的拓名纸。钟声停下之后，有人离开，也有人仍坐着等。'}
};
const LATER={
  "marsh_boss": {
    "source": "潮尺停下的地方",
    "cave": "干堤底舱",
    "npc": "m18",
    "support": "tide_pact",
    "oppose": "breach_order",
    "aid": "raft_wedge",
    "proof": "未撤离屋舍图",
    "normal": [
      "m16",
      "m17"
    ],
    "warning": "舱壁画着尚未撤离的房屋。定潮珠契的水光会被舟匠认作封水一方的凭证。",
    "supportName": "定潮珠契",
    "opposeName": "泄潮凿令",
    "aidName": "护舟木楔",
    "effect": "playerMark",
    "sourceText": [
      "巡卒按潮尺把水停在村口。高地的人因此活着，低地的屋顶却还没露出来。抱瓮的老妇记得自己家门朝哪边，仍不肯松手。",
      "舟匠要准备开堤，但图上有些屋舍还没撤空。加固封水与准备泄潮都有受益者，也都有不得不等的人。"
    ],
    "supportChoice": "加固封水板，接受定潮护持",
    "opposeChoice": "协助整备凿堤舟，接下泄潮约定",
    "intro": "舟匠把未撤离的屋舍图铺开：“别替我说开了堤就都能活。这几间房，还没人接。”",
    "testimony": "高地药棚仍靠水府的井活命，低地的船却被同一道水线困住。他并非不知开堤代价，只是不愿自己的亲人一直排在后面。",
    "help": "你交草药给一名搬舟伤手的人，帮他把尚未撤离的房屋圈清；只完成眼前准备，没有宣布开堤或全村获救。",
    "reply": "底舱留下圈出的屋舍图。先前的救助让准备多了一双手，图上的空白仍需要后来的人去看。"
  },
  "mirror_boss": {
    "source": "镜面上被擦掉的伤",
    "cave": "剥银作坊",
    "npc": "m24",
    "support": "mask_contract",
    "oppose": "glass_scraper",
    "aid": "silver_dust",
    "proof": "露木背镜片",
    "normal": [
      "m22",
      "m23"
    ],
    "warning": "作坊中的镜面都已露出木背。无瑕面契的白光，会被剥银匠视作继续代画的记号。",
    "supportName": "无瑕面契",
    "opposeName": "剥银刮片",
    "aidName": "磨银粉",
    "effect": "counter",
    "sourceCost": 12,
    "sourceText": [
      "描相侍能替一面镜子遮去裂痕，裂面证人却说那道裂痕是自己最后记得的东西。两人都不愿对方替自己选择。",
      "修镜护持收12灵石，遮住的是镜上痕迹，不会替失忆者找回过去。剥银会终止一面镜的复制，也会让依赖那副面貌的人再也看不到它。"
    ],
    "supportChoice": "付12灵石修镜，接受抹痕护持",
    "opposeChoice": "协助剥去一面镜的银层",
    "intro": "老匠把露木背的镜板转过来：“这里照不见脸。有人谢我，也有人说我把最后能见的那张脸毁了。”",
    "testimony": "一位母亲曾借镜里孩子的脸熬过冬天，另一位证人却被同一张脸盖住名字。老匠刮走银层时，没有资格替她们决定哪一种痛更真。",
    "help": "你给被刮刀割伤的证人敷草药，收好她亲自留下的一片旧镜；只记录她愿意留下的部分，不替她画新脸。",
    "reply": "作坊留下一片露木背的镜。你帮助过的人选择保留自己的裂痕，不能据此宣布别人的倒影也应消失。"
  },
  "abyss_boss": {
    "source": "命册旁的一栏空白",
    "cave": "命册外的驿台",
    "npc": "m27",
    "support": "life_slip",
    "oppose": "blank_cut",
    "aid": "empty_entry",
    "proof": "未代签的空栏",
    "normal": [
      "m25",
      "m26"
    ],
    "warning": "驿台不收续命赤签。有效赤签的红线一露出来，无籍客就会将你视作命枢的追索者。",
    "supportName": "续命赤签",
    "opposeName": "断签空符",
    "aidName": "空栏签",
    "effect": "energyPenalty",
    "requiresForfeit": true,
    "sourceText": [
      "录吏说命枢可以替人接住一次灾厄。缠身客问，那次灾厄最后落在谁身上；录吏只指向册背的一栏。",
      "接受赤签，司命允你一度护身，也会留下公开红线。断签者要你先舍下属于自己的那次庇护，再谈不替别人代签的路。"
    ],
    "supportChoice": "接受续命赤签与一次护持",
    "opposeChoice": "放弃赤签首回合8护盾，签下空符",
    "intro": "她把空栏留在你面前：“我不替你签。你愿意放弃的，也不能写成别人该付的。”",
    "testimony": "代死者并非全被强迫：有人最初想换回亲人，后来才发现账永远接得下去。拒绝一张签，不会抹平此前已经转给别人的灾厄。",
    "help": "你交药照看一名从册背走出来的人，替他留下一块无字路牌；你没有替他决定该用谁的名字。",
    "reply": "驿台的空栏仍在。你确实放弃过自己的那次护持；这不能替命册里其他人一并结账。"
  },
  "feiye": {
    "source": "祠前待还的名帖",
    "cave": "无名祠堂",
    "npc": "m29",
    "support": "palace_contract",
    "oppose": "name_return",
    "aid": "nameless_pass",
    "proof": "归客自刻的旧名",
    "normal": [
      "m28"
    ],
    "warning": "宫绳已被剪断。归宫名契挂在衣外，讨名者会把它认作来收人的凭证。",
    "supportName": "归宫名契",
    "opposeName": "还名散帖",
    "aidName": "无字路签",
    "effect": "poison",
    "special": "hidden",
    "sourceText": [
      "宫侍说，旧宫至少收留了没有去处的人。归客却记得，门开了以后，自己的名字仍留在别人手里。",
      "你可以同意在旧宫名下受保护，也可以帮一位归客解下一张名帖。这里处理的是一个人的姓名，不会因此替所有旧部解除契约。"
    ],
    "supportChoice": "接受旧宫名下的护持",
    "opposeChoice": "解下一张名帖，交回本人",
    "intro": "归客把短刀搁在墓牌边：“名字是我的。我自己刻，你只替我挡一会儿风。”",
    "testimony": "他曾自愿把名字交给旧宫换一夜庇护。后来庇护成了不能离开的理由。他不否认那夜被救过，也不肯因此把往后每一夜都许出去。",
    "help": "你为归客裂开的手指敷药，由他亲刻自己的旧名；只收回他这一条短线，不替没有开口的人除契。",
    "reply": "祠里留下归客自己刻过的笔痕。旧宫的门如何重开，不该替这一个名字作主。"
  },
  "feiye_echo": {
    "source": "两封同笔迹的信",
    "cave": "双信洞",
    "npc": "m31",
    "support": "reply_seal",
    "oppose": "true_split",
    "aid": "open_reply",
    "proof": "两份回函的折痕",
    "normal": [
      "m30"
    ],
    "warning": "两封回信放在不同灯下。代答承印会被求真人认作继续替人作答的许可。",
    "supportName": "代答承印",
    "opposeName": "验真裂签",
    "aidName": "未封回函",
    "effect": "drawPenalty",
    "sourceText": [
      "墨偶说，收信的人需要的也许只是有人回答。求真人拿着两封同样的信，却不肯让另一张脸替自己决定该相信谁。",
      "继续代答，可以维持一项具体的等待；核验信件，则可能让等信的人失去支撑。两封信的折痕不能直接证明谁从未履行过承诺。"
    ],
    "supportChoice": "许可墨偶继续代答这位收信人",
    "opposeChoice": "核对两封回函，承接送信约定",
    "intro": "她把两封信摊开：“我不认得写信的人。可收信的人等过那么多年，不能一句‘是替身’就算没发生。”",
    "testimony": "一封信让老人撑过了病夜，另一封却替迟迟不归的人拖延了告别。求真不是替双方抹去已经做过的事；她仍想等一个肯署自己名字的答复。",
    "help": "你为持信人包扎旧伤，帮她整理两封不同折痕的回信；不宣布哪封所有内容都是假的。",
    "reply": "未封回函仍随身带着。承接送信不等于已经送达，镜中的停顿也不能替收信的人作出回答。"
  },
  "retainer": {
    "source": "灯锁与门后的声音",
    "cave": "只向内开的门",
    "npc": "m33",
    "support": "lock_order",
    "oppose": "exit_ring",
    "aid": "loose_ring",
    "proof": "可拆开的门环",
    "normal": [
      "m32"
    ],
    "warning": "门边铜环正被拆开。留灯锁令公开悬在身上，会被逃客看作继续封门的命令。",
    "supportName": "留灯锁令",
    "opposeName": "出门解环",
    "aidName": "松环片",
    "effect": "counter",
    "sourceText": [
      "门卒说，门外有黑雾，闭门才是护人。灯匠说自己做过这道锁，所以更知道里面的人不能从另一边打开。",
      "有人想出去找家人，有人仍想留下避难。加固门与拆开出口都是具体选择，不能把所有人的意愿写成同一种。"
    ],
    "supportChoice": "接下守门约定，加固避难所",
    "opposeChoice": "帮助拆开一段门环，留下出口",
    "intro": "灯匠抱住空灯罩：“锁是我做的。第一次有人求我别开门，第二次有人求我放他走，我都听见了。”",
    "testimony": "他曾以保护为名装上只向内开的门。后来想补救，却发现开门也会把危险带进来。他留出能自行选择的窄口，没有资格要求所有人感谢。",
    "help": "你给推门裂掌的人敷药。有人从窄口走了出去，另一个人自己拉回门板；你没有把留下者赶走。",
    "reply": "铜环留出一道能从里侧拆开的缝。先前的帮助让人有了选择，不表示所有人都已经离开。"
  },
  "heart": {
    "source": "仍未落下的印",
    "cave": "未落印的石室",
    "npc": "m35",
    "support": "sealed_answer",
    "oppose": "final_mark",
    "aid": "calm_ash",
    "proof": "本局亲手留下的一页",
    "normal": [
      "m34"
    ],
    "warning": "草稿旁只有一枚未落的印。缓决封帖会被醒梦人视作要把答案重新封存。",
    "supportName": "缓决封帖",
    "opposeName": "落笔定签",
    "aidName": "定心灰",
    "effect": "drawPenalty",
    "special": "heart",
    "requiresDecision": true,
    "sourceText": [
      "执笔影把每一种可能都留着，不愿让任何一页成为错的那页。醒梦人说自己也曾这样等过，直到等的人不再回来。",
      "你可以继续封存这份答案，也可以此刻决定保留证词。那一笔须是自己亲手落的，不是谁替你讲过的往事。"
    ],
    "supportChoice": "同意继续封存答案",
    "opposeChoice": "亲手决定保留证词，落印记录",
    "intro": "醒梦人踩住自己的长影：“我不替你挑那张纸。若要落那方印，就得你自己来。”",
    "testimony": "他反复想过若当时换一个答案会怎样，后来连自己真正做过什么也不敢承认。定下一个决定并不证明它无错，只让之后的责任有了主人。",
    "help": "你交药给守稿人，让他自己将一张原稿从灰里取回；你没有替他烧掉所有灰稿；这份药只照看眼前的伤，不抹去任何人自己的经历。",
    "reply": "石室留着你亲手落过的一页。那点灰只让纷乱的念头短暂停住，往事仍需由你自己面对。"
  },
  "snake_ascended": {
    "source": "黑潮边的一片白鳞",
    "cave": "井壁白鳞窟",
    "npc": "m37",
    "support": "corrupt_scale",
    "oppose": "tide_wedge",
    "aid": "white_wedge",
    "proof": "未染内鳞样本拓记",
    "normal": [
      "m36"
    ],
    "warning": "井壁白鳞压着黑潮。逆仪引鳞的紫黑光会被采鳞人视作继续引潮取力的标志。",
    "supportName": "逆仪引鳞",
    "opposeName": "封潮石楔",
    "aidName": "缝井楔",
    "effect": "poison",
    "sourceText": [
      "黑鳞寄生在旧蜕里，仍借着封井者的形状行走。采鳞人把一片内鳞压在裂口上，说那是还没被井吞没的部分。",
      "引潮可以换取本次交锋的护持，却会让封裂者认出你在借污染取力。封住一道裂隙，也不能宣称绛鳞已经恢复。"
    ],
    "supportChoice": "引导一缕黑潮，接受逆仪护持",
    "opposeChoice": "协助以白鳞压裂，留下封潮约定",
    "intro": "采鳞人把石锤放下：“我反对的是占着她旧蜕的东西。你若想把她剥干净，别拿我的楔当借口。”",
    "testimony": "曾在旧井封住裂口的绛鳞，与如今被逆仪吞没的她是同一个人。封住寄生黑潮不能抹去先前的药债，也不是支持采鳞者把她剥死。",
    "help": "你为压鳞伤手的人敷药，只协助封住掌宽的一道裂口；黑潮仍往别处涌，收好这片内鳞的一角，没有把它冒称完整旧方。",
    "reply": "井壁留着一道新补的白缝。它缓过一次毒息，不代表整口井已净，也不能替代逆方残注的真实调查。"
  }
};
Object.assign(FRONTIER,LATER);
const EXTRA=[
['m04','巡灯纸役','gate_boss','normal','点名最多附印两次。','灯役认真护送登记者，却拦住胸牌空白的人。'],
['m05','空名背夫','gate_boss','normal','卸担全战一次，此后改为轻撞。','他背着空架与木牌，脚边却像跟着两个人。'],
['m06','剪灯渡客','gate_boss','elite','不连续封灵；只给一次本境援助。','湿斗篷护着一盏熄灯，长剪剪断了认路的链。'],
['m07','誓甲残卒','camp_boss','normal','首次破盾后，下次守桥护盾−2，仅一次。','誓纸嵌在旧甲里，盾后还有未被领走的药。'],
['m08','担药役','camp_boss','normal','续命治疗全战一次，之后改为攻击。','药箱的锁链拖到脚踝，她仍攥着给别人用的绑带。'],
['m09','断誓逃卒','camp_boss','elite','掩退不连续施放；不做永久交易。','空担架不是战利，是还没接回来的人。'],
['m10','蜕鳞井役','snake','normal','补裂最多两次，各移除一层猎印。','背上的裂鳞像瓦片，它仍试着把井补好。'],
['m11','丹砂药痴','snake','normal','吞砂治疗一次，同时自身中毒。','他盯着研钵，手掌已青黑，却说再加一点就好。'],
['m12','采鳞债客','snake','elite','逐利交易不等于医治或拯救绛鳞。','脸上药烧白斑与手边金秤，都没有被她藏起来。'],
['m13','执幡引魂役','bell_boss','normal','报丧附印全战一次。','窄幡挡住它的脸，幡下的小铃仍替人报名字。'],
['m14','不归抬棺人','bell_boss','normal','首次低于三成生命后，下次歇肩护盾减半。','半截棺梁仍压着肩，另一头早已无人接手。'],
['m15','断钟掘名人','bell_boss','elite','记下姓名不等于所有亡者都已超度。','短凿与石拓卷上都是旧名，没有替别人写好的答案。']
];
EXTRA.push(...[["m16", "潮尺巡卒", "marsh_boss", "normal", "首次有追索印的攻击命中后，额外获得3护盾，全战一次。", "潮尺停在腰高，尺下仍有被水盖住的门。"], ["m17", "抱瓮沉民", "marsh_boss", "normal", "一张攻击牌累计削盾达到本境D后，抱紧护盾永久−3，仅触发一次。", "她护着家里的粮瓮，瓮口的稻穗已经泡白。"], ["m18", "凿堤舟匠", "marsh_boss", "elite", "泄水有代价，不把整备舟具写成全员获救。", "暖褐舟骨上还画着未撤离的房屋。"], ["m22", "描相侍", "mirror_boss", "normal", "覆粉后下次攻击牌首次伤及生命时额外受到2伤害，不叠加。", "瓷面一侧仍是底稿，它却在替别人修饰镜中的伤。"], ["m23", "裂面证人", "mirror_boss", "normal", "护忆只清除1层流血，全战一次，不恢复生命。", "不同年代的面片挤在一张脸上，他只想把自己的那片扶住。"], ["m24", "剥银匠", "mirror_boss", "elite", "原貌证物只供问询，明确反对凭证才可换援助。", "镜板露出木背，刮刀没有替镜中的人决定新脸。"], ["m25", "缀命录吏", "abyss_boss", "normal", "录名附印最多两次。", "胸口空着一方印，它仍把每条线接到具体的人身上。"], ["m26", "代死缠身客", "abyss_boss", "normal", "借壳治疗与首次致命伤保留1生命共用一次额度。", "宽袍缝着几种职业的衣片，他记得的死不全属于自己。"], ["m27", "断线无籍客", "abyss_boss", "elite", "需要真实放弃本次命枢护持，不替旁人签名。", "她把断线打成短结，只把自己的那栏留空。"], ["m28", "收名宫侍", "feiye", "normal", "收帖最多附印一次；有效归宫名契可获通行，不代替隐藏条件。", "名帖夹仍发着银光，胸牌却没有写自己的名字。"], ["m29", "讨名归客", "feiye", "elite", "只归还自己的姓名，无权替所有旧部除契。", "颈间宫绳已经断开，他仍要亲手刻完那块墓牌。"], ["m30", "代答墨偶", "feiye_echo", "normal", "封缄减抽牌最多两次，此后仅获得护盾；不复制手牌。", "胸口叠着回函，两支笔同时停在没有署名的地方。"], ["m31", "拆函求真人", "feiye_echo", "elite", "核验证据不自动抹去替身履行过的承诺。", "她把两封同笔迹的信放开，先摸了摸不同的折痕。"], ["m32", "锁灯门卒", "retainer", "normal", "留客封灵最多两次。", "门盾扣在左臂，钥钩垂向门内，门外的人仍在敲。"], ["m33", "退灯逃客", "retainer", "elite", "获准离去不自动成为永久伙伴。", "空灯罩里没有火，他还是用一只手护着。"], ["m34", "未决执笔影", "heart", "normal", "完整玩家回合未受生命伤害，蓄存一次首段攻击+2，不叠加。", "笔一直悬着，地上的影子却朝另一边伸去。"], ["m35", "焚稿醒梦人", "heart", "elite", "只认本局真实的落笔选择；收灰治疗全战一次。", "他踩住自己的长影，没有替你按下那方印。"], ["m36", "黑鳞寄生蜕", "snake_ascended", "normal", "蜕壳只用一次，之后改为二击总量A；不全清状态。", "旧蜕内侧露着一点白，黑潮把空壳撑成了站立的形状。"], ["m37", "封井采鳞人", "snake_ascended", "elite", "封潮不等于剥死绛鳞，样本只为眼前这一道裂隙作证。", "石锤与白鳞压住一道裂缝，井下的声音还没停。"]]);
for(const[id,name,boss,rank,trait,intro]of EXTRA)DEFS[id]={id,name,boss,rank,trait,intro,frostResistant:false,stance:rank==='elite'?'oppose':['m04','m07','m10','m13','m16','m22','m25','m28','m30','m32','m34','m36'].includes(id)?'support':'affected'};

const SCENES={m01:'厨役护着空碗，铁勺已砸坏同纹纸偶的一角。铜牌仍属故宅，他却认不清靠近的人。',m02:'门帘缝成的身影把针横在门口，红线后仍有伤者。它守的是家，未必认得来人。',m03:'钩尖挂着故宅器物，器谱筒被藏在身后。他没有说明自己在旧案中做过什么。',m19:'炉役把愿帖送向火口，面挡上映着别人的名字。他说火不能停，炉外却有人想拿回契约。',m20:'灰客护住空寿灯，面容仍年轻，手却已苍老。灯与炉火之间有一根未断的线。',m21:'她将寿契炭拓压进扁盒，铲刃护着身后的灰匣。她认契，不肯替任何人签名。'};
for(const[id,t]of Object.entries(DEFS))Object.assign(t,{id,intro:SCENES[id]||t.intro,stance:t.stance||(['m01','m20'].includes(id)?'affected':['m02','m19'].includes(id)?'support':'oppose'),frostResistant:false});
function definition(id,region){const t=DEFS[id],{a,d,h}=BUDGETS[Math.max(0,Math.min(6,region))],half=n=>[Math.floor(n/2),n-Math.floor(n/2)].filter(x=>x>0);let intents;
switch(id){

case'm16':intents=[{name:'量潮',hits:[a-2],playerMark:1},{name:'拦岸',block:d}];break;
case'm17':intents=[{name:'溢瓮',hits:half(a)},{name:'抱紧',block:d+2}];break;
case'm18':intents=[{name:'破堤凿',hits:[a+3]},{name:'翻舟挡',block:d,counter:1}];break;
case'm22':intents=[{name:'勾线',hits:[a]},{name:'覆粉',block:d,removeMark:1,powder:true}];break;
case'm23':intents=[{name:'碎声',hits:[Math.floor(a/3),Math.floor(a/3),a-2*Math.floor(a/3)]},{name:'护忆',block:d,removeBleed:1,limit:1,limited:'removeBleed'}];break;
case'm24':intents=[{name:'刮相',hits:[a+2]},{name:'照隙',block:d,counter:2}];break;
case'm25':intents=[{name:'录名',hits:[a-2],playerMark:1,limit:2,limited:'playerMark'},{name:'归档',block:d}];break;
case'm26':intents=[{name:'余命扑',hits:half(a)},{name:'借壳',heal:4,block:Math.floor(d/2),limit:1,fallback:a-2,lifeShell:true}];break;
case'm27':intents=[{name:'断缘',hits:[a+2]},{name:'空籍',block:d,drawPenalty:1}];break;
case'm28':intents=[{name:'收帖',hits:[a-2],playerMark:1,limit:1,limited:'playerMark'},{name:'护灯',block:d}];break;
case'm29':intents=[{name:'索名',hits:[a+1]},{name:'遮牌',block:d,counter:1}];break;
case'm30':intents=[{name:'复函',hits:half(a)},{name:'封缄',block:d,drawPenalty:1,limit:2,limited:'drawPenalty'}];break;
case'm31':intents=[{name:'断句',hits:[a+2]},{name:'验伪',block:d}];break;
case'm32':intents=[{name:'闭门',block:d,counter:1},{name:'留客',hits:[a-2],energyPenalty:1,limit:2,limited:'energyPenalty'}];break;
case'm33':intents=[{name:'撬环',hits:[a+1]},{name:'灭锁',block:d,hits:half(a-3)}];break;
case'm34':intents=[{name:'迟答',hits:[a-2],drawPenalty:1},{name:'悬笔',block:d}];break;
case'm35':intents=[{name:'醒梦拍',hits:[a+2]},{name:'收灰',heal:3,block:Math.floor(d/2),limit:1,fallback:a-2}];break;
case'm36':intents=[{name:'渗潮',hits:[a-2],poison:1},{name:'蜕壳',block:d,removeMark:1,limit:1,fallback:a,fallbackHits:half(a)}];break;
case'm37':intents=[{name:'压井',hits:[a+2]},{name:'护鳞',block:d,counter:1}];break;
case'm04':intents=[{name:'点名',hits:[a-2],playerMark:1,limit:2,limited:'playerMark'},{name:'护芯',block:d}];break;
case'm05':intents=[{name:'负重撞',hits:[a+2]},{name:'卸担',selfCost:3,block:d,limit:1,fallback:a-2}];break;
case'm06':intents=[{name:'截火',hits:[a],energyPenalty:1},{name:'暗渡',block:d,hits:[a-3]}];break;
case'm07':intents=[{name:'守桥',block:d,counter:1},{name:'催归',hits:[a]}];break;
case'm08':intents=[{name:'药杵',hits:[a-1]},{name:'续命',heal:4,block:Math.floor(d/2),limit:1,fallback:a}];break;
case'm09':intents=[{name:'断链刺',hits:[a+2]},{name:'掩退',block:d,drawPenalty:1}];break;
case'm10':intents=[{name:'鳞拍',hits:[a]},{name:'补裂',block:d,removeMark:1,limit:2,fallback:a-1}];break;
case'm11':intents=[{name:'泼药',hits:[a-2],poison:1},{name:'吞砂',heal:3,selfPoison:1,limit:1,fallback:a-2}];break;
case'm12':intents=[{name:'剥鳞钩',hits:half(a+2)},{name:'封泉粉',hits:[a-2],energyPenalty:1}];break;
case'm13':intents=[{name:'报丧',hits:[a-2],playerMark:1,limit:1,limited:'playerMark'},{name:'摇幡',hits:half(a)}];break;
case'm14':intents=[{name:'撞梁',hits:[a+1]},{name:'歇肩',block:d}];break;
case'm15':intents=[{name:'凿响',hits:[a]},{name:'压钟',block:d,drawPenalty:1}];break;
case'm01':intents=[{name:'抢食',hits:half(a)},{name:'掀笼',hits:[a-2],block:Math.floor(d/2)}];break;case'm02':intents=[{name:'缀门',block:d,counter:1},{name:'逐客',hits:[a]}];break;case'm03':intents=[{name:'钩匣',hits:[a],drawPenalty:1},{name:'拆护',hits:[a+2],shieldBreak:3}];break;case'm19':intents=[{name:'投愿',hits:[a]},{name:'拨炉',block:d,heatGain:1}];break;case'm20':intents=[{name:'借年',hits:[a-2],drain:3},{name:'烬掌',hits:half(a)}];break;case'm21':intents=[{name:'灰刃',hits:[a+1]},{name:'封炉灰',hits:[a-2],energyPenalty:1}];}
for(const i of intents)i.text=[i.block?`获得护盾 ${i.block}`:'',i.hits?`攻击 ${i.hits.join('／')}`:'',i.counter?`反击 ${i.counter}`:'',i.playerMark?`追索印${i.playerMark}`:'',i.poison?`施毒${i.poison}`:'',i.heal?`恢复${i.heal}生命`:'',i.limit?`本战限${i.limit}次${i.limited?'附加状态，之后仅保留伤害':'，耗尽后改为攻击'+i.fallback}`:'',i.drawPenalty?'下回合少抽1':'',i.energyPenalty?'下回合灵力−1':'',i.shieldBreak?'先额外削盾3（不溢出生命）':'',i.heatGain?'获得蓄热1':'',i.selfCost?`自身失去${i.selfCost}生命`:'',i.selfPoison?'自身获得毒1':'',i.removeMark?'移除自身猎印1':'',i.removeBleed?'移除自身流血1':'',i.powder?'薄粉：下一张攻击牌首次生命伤害额外+2，不叠加':'',i.lifeShell?'与保留1生命的代死账共用一次额度':'',i.drain?'按实际生命伤害恢复，单次最多3、全战最多6':''].filter(Boolean).join('，');
return {id,...t,budgetD:d,hp:t.rank==='elite'?Math.floor(h*1.5):id==='m02'?h-2:h,weights:[1,1],intents};}
const ITEMS={house_order:{name:'护宅家令',text:'主动承诺护宅的凭证；衣外红光会被夺谱探客识别并引战。仅缄红战首回合护盾+8一次。不是调查信物。',boss:'lotus_boss',stance:'support',recognition:'automatic'},split_nail:{name:'裂芯钉',text:'接受取谱委托的器物；鸣响可被探客识别，纸偶也会询问。仅持有不会破坏心匣或改写唤醒记录。',boss:'lotus_boss',stance:'oppose',recognition:'automatic'},furnace_pact:{name:'续炉寿契',text:'自愿接受炉火护持，炉纹自动可辨；拾灰人会立即敌对。赤绫战首回合护盾+8一次。原寿契证物不等于此契。',boss:'furnace_boss',stance:'support',recognition:'automatic'},charcoal_seal:{name:'退契炭印',text:'与退契者共按的停炉凭证，可向拾灰人交涉；不能抵消续炉寿契引发的敌意。',boss:'furnace_boss',stance:'oppose',recognition:'automatic'},heat_tongs:{name:'隔热夹',text:'接受探客取谱委托所得；缄红首次沸盏每段基础伤害−1，一次。未发生战斗则保留旧物，无兑换奖励。',boss:'lotus_boss',aid:true},cold_ash:{name:'冷灰封',text:'赤绫首次烬衣反击强度−1，只该姿态。已有信物完全抵消时不消耗此援助。',boss:'furnace_boss',aid:true}};
for(const[id,t]of Object.entries(ITEMS))Object.assign(t,{id,icon:'learned'});
const GROUPS={lotus_boss:{source:'朱漆门牌下',cave:'灰宅外的拆匣洞',npc:'m03',support:'house_order',oppose:'split_nail',aid:'heat_tongs',proof:'器谱残页',normal:['m01','m02'],warning:'洞内有人专拆护宅机关；家令的红光藏不过他们的眼。'},furnace_boss:{source:'愿帖上的空位',cave:'熄炉洞中的拾灰人',npc:'m21',support:'furnace_pact',oppose:'charcoal_seal',aid:'cold_ash',proof:'寿契炭拓',normal:['m19','m20'],warning:'炉门上划去了朱印：带着有效续炉寿契的人不受欢迎。'}};
for(const[b,g]of Object.entries(FRONTIER)){g.frontier=true;GROUPS[b]=g;for(const[key,name,stance]of [[g.support,g.supportName,'support'],[g.oppose,g.opposeName,'oppose'],[g.aid,g.aidName,null]])ITEMS[key]={id:key,name,boss:b,icon:'learned',stance,recognition:stance?'automatic':undefined,aid:!stance,text:stance==='support'?`主动接受且公开显露的约定；${DEFS[g.npc].name}会认出并引战。对应Boss首回合护盾+8一次；护持用尽仍可识别。`:stance==='oppose'?'主动实施另一方行动的凭证，可交涉；不能抵消有效支持凭证的敌意。':`对应Boss首次${({playerMark:'追索印',energyPenalty:'封灵',poison:'施毒',drawPenalty:'减抽牌'})[g.effect]}减少1，一次；旧物证先完整抵消时不消耗。`};}

const ENCOUNTER_CAUSES={
m04:'巡灯纸役举灯对着你的脸：“名簿没有你，不能过。”它仍牵着一个迷路老人，灯杆却已经横在桥口。',
m05:'空名背夫背着两副空架，身后不断响起催他赶路的脚步。他以为你来抢木牌，担绳先抽向了你的手。',
m06:'剪灯渡客藏着一船不在名簿中的人。她将长剪横在船头：“先说你替谁看灯，再往前走。”',
m07:'誓甲残卒守着药箱，盾内的誓纸勒进了伤口：“药没分完，谁也不许拿走。”你靠近时，他将盾重重撞来。',
m08:'药役把锁链缠在脚踝，仍在喊着担架上的名字。她不肯放下药箱：“等分完这一轮！”靠近的人都被她当成了催收者。',
m09:'断誓逃卒把短枪压在空担架上：“没接回来的人还在等。你来拿我，还是拿药？”他的退路只剩侧栅。',
m10:'井役用背上的裂鳞补井，不许任何人靠近凿口：“再开一道，污水就上来！”它把试图探路的你也推向了井外。',
m11:'药工的手已经青黑，仍往研钵里加丹砂。他看见你伸手，先护住最后一份药：“停了这碗，谁替我挨到天亮？”',
m12:'采鳞债客把金秤放到刀旁：“井封住，我的货就赔了。要借路，先把立场和价钱说清。”药烧白斑从领口一直延到指尖。',
m13:'引魂役逐字报着幡上的名字，铃声却不许送行人离开：“再应一声！”你没有答，它便将窄幡拦了过来。',
m14:'抬棺人以为你要他重新走那段路，猛地将棺梁横过来：“十年了，这回谁来接另一头？”梁后只剩空绳。',
m15:'掘名人将石拓挡在身前，短凿护住未核清的姓名：“不许再替他们乱系。真想带走，先把人名说对。”'
};
for(const[id,intro]of Object.entries(ENCOUNTER_CAUSES))DEFS[id].intro=intro;
const EXPLICIT={
marsh_boss:{scene:['持尺人按住封水板：“板一拆，高处工坊就要泡水。”滩民指着低处的屋顶：“水已经在我们头上了！”','凿堤人把舟绳递来：“先看水位再动凿。你收封水的护符，我就不敢让你碰船。”'],action:'扶住凿堤舟，凿开已核低水的一道泄口',result:'你只凿开记过水位的这一段。两户人搬上舟，工坊开始进水；凿堤人给你一截可卸追索的浮绳。',clue:'你记下高低两处的水位与一块空堤的位置。',reply:'你照水痕留出一段低口，凿堤人带两户上舟，再将浮绳交给你。'},
mirror_boss:{scene:['描相侍伸手遮住镜上的伤：“修好，她还能认出孩子。”裂面证人推开她：“那道疤才是我的脸。”','剥银匠放下刮刀：“先问这面镜子是谁的。不能因你怕丑，就替别人擦掉。”'],action:'征得这一位证人同意，剥开她的镜面银层',result:'证人指明愿意保留的裂痕，你只刮掉那一面的银。匠人交出磨银粉；依赖另一面镜子的母亲没有让你动手。',clue:'你核对了原画与裂痕的位置，记下镜主亲口表示愿留的部分。',reply:'你以原画指出被抹去的一道疤。证人自己圈出刮银范围，匠人将磨银粉留给你。'},
abyss_boss:{scene:['录吏递来续命赤签：“灾厄来了，可以接一次。”缠身客指着册背：“接到谁身上？”','断签人把空符按住：“想走册外，先舍掉你自己的庇护。别只替别人算公平。”'],action:'按自己签过的空符，为一名册外来客立无债路牌',result:'你没有再领取赤签护盾；册外来客亲自刻好路牌，将一枚空栏签交给你。',clue:'你核了册背转移灾厄的对象，记下本人是否同意。',reply:'你指出一笔未经本人同意的转签，让来客自己写下离去一栏，得到空栏签。'},
feiye:{scene:['宫侍将名帖夹紧：“入宫得庇护，也得留名。”归客抱着墓牌：“我当年自愿，如今也想自己走。”','讨名者问你：“是继续替宫里收名，还是陪他把这一张取回来？”'],action:'让归客取回自己的这一张名帖',result:'归客亲手划掉一张旧契，带着真名离开祠门；你收下一张无字路签。',clue:'你核对了入宫时的自愿记录和本人今日要求离去的笔迹。',reply:'两份笔迹都来自本人。宫侍归还这一张名帖，归客把无字路签交给你。'},
feiye_echo:{scene:['墨偶将回信读得与原主一模一样。求真人拿出另一封：“他那夜已不能握笔，这句是谁答的？”','墨偶捏住信封：“可收信的人确实撑过来了。你要把这也说成假的吗？”'],action:'并列核验两封回函，保留未送出的原信',result:'你在两封信上分别标明代笔与本人笔迹，未封回函留在包裹；制偶人给你定音片。送信尚未完成。',clue:'你抄下两道折痕与不同笔压，能区分代答与原信。',reply:'你把两种笔迹分开标记，求真人承认墨偶帮过人，也交给你一枚定音片。'},
retainer:{scene:['守门人正在加固避难所：“门开了，外面的东西就进来。”门里的人敲锁：“我想出去，不是想被放出去等死。”','断环客举起一段可开的门环：“留一道自选的出口，守门就不必靠锁住活人。”'],action:'拆开门后这一段锁环，让本人选择去留',result:'门环打开，一人离去，一人留下修灯。断环客将退灯扣交给你；灯门没有全部拆毁。',clue:'你记下门外安全时辰和屋内两人的不同去向请求。',reply:'你按安全时辰开门，两人各自选择去留，断环客交出一枚退灯扣。'},
heart:{scene:['掌印者把未落印的纸藏进袖里：“再等等，总会有一个没错的答复。”守稿人按住他的手：“等的人已经替你做了。”','纸上留着后来者的字迹；封存也在改变眼前的结果。'],action:'保留原稿，记下由自己作出的这一项决定',result:'你把原稿与补写分开放好，签的是自己今日的决定。守稿人将定心灰交给你。',clue:'你辨认原纸留白与后来补写的先后次序。',reply:'你指出补写者的名字，不把无印当成默许。守稿人给你一撮定心灰。'},
snake_ascended:{scene:['黑潮中有人兜售逆仪护符：“借它的力，至少今日能活。”白鳞看守压住裂口：“借走之后，谁来替你守？”','采鳞人把刀收进鞘：“要补裂，用掉落的内鳞，别再从她身上割。”'],action:'用已经脱落的白鳞补住这一道井缝',result:'你没有再取活鳞，只封住眼前的一道裂口。看守给你白鳞粉；井底黑潮仍没有退尽。',clue:'你核清这片内鳞已脱落，裂口只须嵌住一角。',reply:'看守照你核过的尺寸嵌好旧鳞，取边角磨成白鳞粉交给你。'}
};
for(const [boss,x]of Object.entries(EXPLICIT)){const g=GROUPS[boss];g.sourceText=x.scene;g.opposeActionName=x.action;g.opposeAction=x.result+'取得对应一次援助；放弃本洞府精英战奖励。';g.opposeOutcome=x.result;g.investigation=x.clue;g.investigationIntro=g.intro;g.investigationReply=x.reply;g.investigationAftermath=x.reply;g.battleLines={support:'对方认出公开的'+ITEMS[g.support].name+'：“这份约定还挂在你身上。你来，是要继续它，还是问我们当年的事？”',oppose:'对方看见'+ITEMS[g.oppose].name+'：“我听说你做了那一件事。余下的人，还得各自开口。”',investigation:'对方看过你的记录：“你记下了这一处。愿意问，就别把没看见的地方先填满。”'};}
const COMMITMENTS={marsh_boss:['接下封水护板的委托','接下凿堤舟的泄潮委托'],mirror_boss:['付12灵石修镜，收下护持','答应向镜主询问，再协助剥银'],feiye:['接受旧宫护持与收名约定','接下还名委托，带本人去祠堂'],feiye_echo:['许可代答，收下墨偶凭证','接下核信委托，保留两封回函'],retainer:['接下守门委托，收好锁符','接下开环委托，留下出口记号'],snake_ascended:['答应引潮，收下逆仪护持','接下以旧白鳞封裂的委托']};
for(const [boss,[support,oppose]]of Object.entries(COMMITMENTS)){GROUPS[boss].supportChoice=support;GROUPS[boss].opposeChoice=oppose;}
for(const [boss,g]of Object.entries(GROUPS)){
 const support=ITEMS[g.support],oppose=ITEMS[g.oppose],aid=ITEMS[g.aid];
 if(g.frontier){support.text=`你主动接受${support.name}所代表的委托，凭证会公开发光。${DEFS[g.npc].name}看到便立即交战；另一方凭证不能抵消。只在对应镇境者交锋首回合获得8护盾一次，用尽仍会被认出。`;
 oppose.text=`接下${oppose.name}代表的委托；取得它不等于已经完成行动。到${g.cave}可交涉履行；仍带有效${support.name}会先引战。`;
 const effect={playerMark:'本次追索印减少1，少一层下一次首段增伤',energyPenalty:'本次封灵减少1，下回合少扣1灵力',drawPenalty:'本次少抽牌减少1，下回合少损失1张抽牌',poison:'首次施毒减少1；蛇息通常3→2，仍会中毒且不清已有毒',counter:'本次反击强度减少1'}[g.effect];
 aid.text=`仅对应镇境者实际施展相关招式时：${effect}。本局一次；旧物证完整抵消或整次行动被冻结时不消耗。包裹显示携带／用尽，战后列明是否触发。`;}
}

function frontierEvent(base,g,rec,state,owns,witnessed){
 const c=(label,text,x={})=>({label,text,outcome:text,...x});
 if(base.factionEvent.kind==='source'){
  const snake=g.groupBoss==='snake';
  const actionName=({gate_boss:'护灯',camp_boss:'追药或送担架',snake:'守井或开井',bell_boss:'留魂或停钟'}[g.groupBoss]||'委托所述行动');
  const opposeText=`${ITEMS[g.oppose].text} 这里只接下委托并取得凭证；${snake?'价款和药材会在洞府当面议定。':'实际行动留待洞府处理。'}`;
  return {...base,story:g.sourceText,choices:[c(g.supportChoice,`${ITEMS[g.support].text} 这里只接下守约委托并取得凭证；${actionName}行动尚未完成。`,{questItem:g.support,factionKey:'support',...(g.sourceCost?{goldCost:g.sourceCost}:{})}),c(g.opposeChoice,opposeText,{questItem:g.oppose,factionKey:'oppose'}),c(snake?'查药方与抄方账':'只记录眼前证词',`不接委托、不领立场物。${g.investigation||'把现场说法记入手记；到相关洞府可核对，不凭此认定谁有罪。'}`,{factionKey:'investigate'}),c('离去','不支付资源、不取凭证；这次机会会错过。',{factionKey:'leave'})]};
 }
 if(rec.mode==='approach'){
  const supportThreat=owns(g.support),knownEnemy=state.journey.factions.behaviors.some(x=>x.npc===g.npc&&x.kind==='attacked');
  if(supportThreat||knownEnemy){const token=supportThreat?ITEMS[g.support].name:'你曾在此处主动交锋';const opposition=owns(g.oppose)?`你也带着「${ITEMS[g.oppose].name}」，但它不能抵消这份敌意。`:'';return {...base,story:[g.warning,`${DEFS[g.npc].name}会认出${token}。${opposition}继续进入将直接交战，玩家先手；不会被偷袭。你可以现在绕行。`],choices:[c('明知会开战，进入洞府',`${DEFS[g.npc].name}立即发动精英战；你先行动。${supportThreat?`「${ITEMS[g.support].name}」的8点护盾只在镇境Boss战生效，不在本次遭遇消耗。`:''}`,{factionAction:'enter'}),c('绕行，放弃本次交涉机会','不触发战斗，不取得奖励；之后仍可按既有地图前进。',{factionKey:'leave'})]};}
  return {...base,story:[g.warning,'洞口没有认出你身上的立场物。你可以探入、听取证词，或在出现冲突前离开。'],choices:[c('探入洞府','尚未决定现场各方会如何回应；进去后仍可选择交涉、调查、帮助或离开。',{factionAction:'enter'}),c('绕行','关闭本次机会，不获奖励。',{factionKey:'leave'})]};
 }
 const actualChoice=state.journey.factions.behaviors.some(x=>x.npc===g.npc&&x.kind==='oppose');const oppose=owns(g.oppose)&&(!g.requiresForfeit||state.journey.factions.forfeited?.[g.support])&&(!g.requiresDecision||actualChoice);const investigated=state.journey.factions.behaviors.some(x=>x.npc===g.npc&&x.kind==='investigate');
 const ordinaryIntro=g.groupBoss==='feiye'?g.intro:g.groupBoss==='snake'?'采鳞者推回秤砣：“我卖药材，不卖治愈。药账上这笔加量和加价都有买主签名，但没人认下是谁改的抄方。”':g.groupBoss==='gate_boss'?'剪灯客把半截灯链放在桌上：“护的是登记过的人，还是眼前这位老人？剪链也不能保证每个背夫都过河。”':g.groupBoss==='camp_boss'?'独臂逃卒扶正担架：“药箱里剩多少，药役知道。残卒说我偷药；我想知道他准备把药分给谁。”':g.groupBoss==='bell_boss'?'掘名人指着无字碑：“先核清这一个人的碑，再说要不要在钟阵留魂。”':g.intro;
 const intro=investigated&&g.investigationIntro?g.investigationIntro:ordinaryIntro;
 const examinedChoice=g.groupBoss==='snake'
  ?c('出示旧价账，按账面价格买回春草','支付8灵石，购买1份回春草。账目只能议价，不能证明是谁改方或救回病人。',{goldCost:8,itemGrants:[{id:'herb',count:1}],factionKey:'investigation',outcome:g.investigationReply})
  :c(({gate_boss:'出示渡簿与水痕，护送一名背夫过暗水路',camp_boss:'核对药量与名册，放行一副担架',bell_boss:'核对这一户碑名，替他们停下续钟'}[g.groupBoss]||g.opposeActionName||'出示调查记录，核实一项现场说法'),`不支付灵石；按已核的记录处理这一件事，取得「${ITEMS[g.aid].name}」一次。放弃本洞府的精英战奖励。`,{questItem:g.aid,factionKey:'investigation',outcome:g.investigationReply});
 const p2=!!g.investigationReply;
 const unverifiedCamp=g.groupBoss==='camp_boss'&&!investigated&&!oppose?c('没有核账，仍劝双方停手','你没有对过药箱余量和担架名册；残卒把劝说当成替逃卒拖延，当场起冲突。玩家先手；胜利获得标准精英奖励。',{factionAction:'failedMediation'}):null;
 let first;
 if(unverifiedCamp)first=unverifiedCamp;
 else if(p2&&investigated&&!oppose){first=examinedChoice;if(g.requiresForfeit||g.requiresDecision){delete first.questItem;first.label='出示调查记录，核对尚未签署的约定';first.text='核对眼前记录，不签立场凭证，也不取得需要本人抉择才给的援助。';first.outcome=g.groupBoss==='abyss_boss'?'你查明一笔转签，来客要求本人撤签；你尚未放弃自己的护持，因此没有领取空栏签。':'你核清原稿与补写的次序；没有替纸上的人落印，也没有取得定心灰。';}}
 else if(oppose)first=c(g.opposeActionName||'交出委托凭证，交换一次援助',g.opposeAction||ITEMS[g.aid].text,{questItem:g.aid,factionKey:'aid',...(g.groupBoss==='snake'?{goldCost:12,itemGrants:[{id:'herb',count:1}]}:{}),...(g.opposeOutcome?{outcome:g.opposeOutcome}:{})});
 else first=c(g.groupBoss==='snake'?'付12灵石，听取药账证词':'付12灵石，听取证词',g.groupBoss==='snake'?'付款后才展示药账证词；不提供药物，也不代表病人已获救。':'付款后才展示证词；不代表你已完成现场行动。',{goldCost:12,factionKey:'talk',outcome:g.testimony});
 const investigationLine=investigated?`你出示来源处的调查记录：${g.investigation||'你只记录了当事人的说法与现场痕迹；这些内容不能证明尚未亲见的事。'}当事人只承认记录能够证明的部分。`:witnessed?'你记得沿途听过的旧事，可以就亲眼见过的部分追问。':'你还没见过这些人；眼前的话是当事人的说法。';
 return {...base,story:[intro,investigationLine],choices:[first,c('交回春草，帮助眼前的人',g.help+'消耗1份回春草，得到1份凝露叶；只完成这次救助。',{herbCost:1,itemGrants:[{id:'dewherb',count:1}],factionKey:'help'}),c('动手，夺取现场证据',`与${DEFS[g.npc].name}交战，玩家先手。胜利领取标准精英战奖励并记录「${g.proof}」；没有和平赠物。`,{factionAction:'attack'}),c('离开洞府','不支付、不取药、不领援助；这次调查到此为止。',{factionKey:'leave'}),...(g.groupBoss==='camp_boss'?[c('夺下药箱，两边都别拦','连续两战：守营残卒→断誓逃卒；中间不能休息，生命保留，战斗状态重置。只在第二战胜利后获得一份精英总奖励（35灵石与选牌／遗物）；不领和平赠物，两方记住你先动手。',{factionAction:'both'})]:[])]};
}
function groupFor(boss,state){
 const g=GROUPS[boss];if(!g)return null;
 if(boss==='feiye'&&state.character==='sovereign')return {...g,groupBoss:boss,targetBoss:'abyss_boss',effect:'energyPenalty',variant:'palace_owner',
 sourceText:['宫侍递上空白名帖：“宫里还按旧规收留来客。没有新令，我不敢放开他们的名字。”','你记得这些名字曾换过庇护，也看见有人仍因此无法离去。维持旧印，旧部会继续护你；交回一张名帖，只能先还这一人的自由。'],
 supportChoice:'以宫主之名，维持这份庇护',opposeChoice:'废止一份旧名契，交还本人',
 intro:'归客看着你，仍把墓牌抱紧：“我的名字换过你的庇护。我不否认；但今后的名字，还请让我自己握着。”',
 testimony:'他承认曾自愿入宫，也承认替旧制收过别人的名字。你愿意还名，不能替他抹去那些亲手收过的名帖。谁得庇护，谁留下欠账，都得各自说清。',
 help:'你给归客裂开的手指敷药，让他亲刻自己的旧名。你没有以一声赦令替所有旧部作决定。'};
 return {...g,groupBoss:boss,targetBoss:boss};
}
ITEMS.palace_contract.text='公开的归宫名契；讨名者会认作继续收人的凭证。首回合护盾+8一次：来客对应井下交锋，宫主本人对应命枢交锋。护持用尽契印仍可辨。';
ITEMS.nameless_pass.text='无字路签：来客在井下交锋首次受毒减少1；宫主本人面对命枢时改为首次封灵减少1。只一次，旧信物完整抵消优先。';
const EVENTS=Object.keys(GROUPS).flatMap(b=>['source','cave'].map(t=>'faction_'+b+'_'+t));
function build(boss,kind,state,nodeId){const g=groupFor(boss,state),f=state.journey.factions,rec=f.records[nodeId]||(f.records[nodeId]={boss,kind,mode:'approach',resolved:false,known:[],outcome:null});const owns=id=>state.player.questItems.includes(id)&&!f.invalid[id];const finished=state.journey.bossQuests?.records[boss];const after=finished?.awakened||finished?.concluded;const base={id:'faction_'+boss+'_'+kind,name:kind==='source'?g.source:g.cave,glyph:'灯',kicker:'器物与来意',factionEvent:{boss,kind,nodeId},npcArt:kind==='cave'?g.npc:null};
const choice=(label,text,extra={})=>({label,text,...extra,outcome:extra.outcome||text});
if(after)return {...base,story:['门里只剩收好的工具。先前的关口已经改变，此刻再来的人不必接受一份过期的委托。'],choices:[choice('记下善后，离去','不获得战斗奖励，不重复领取旧物。',{factionKey:'aftermath'})]};
if(g.frontier)return frontierEvent(base,g,rec,state,owns,(state.journey.bossQuests?.records[boss]?.stage||0)>0);
if(kind==='source')return {...base,story:boss==='lotus_boss'?['门边的纸偶正替一个受伤的仆役缝衣。铜牌亮起时，它会保护来客；另一边却有人被同样的红线拦住。','药碗残留封灵药的气味，旁有破损护命阵。这是新发现的痕迹：尚不能据此指认投毒者，也不能替换夺谱纵火案的已有证词。']:['炉役把愿帖夹进炉口：“停了火，等着药的人怎么办？”墙边一位老人却只想拿回自己的寿契。','原寿契是调查证物，只有你主动接受供养才会留下续炉炉纹。支持与反对都有人付代价。'],choices:[choice('接受护持与约定',ITEMS[g.support].text,{questItem:g.support,factionKey:'support'}),choice('接受另一方的委托',ITEMS[g.oppose].text,{questItem:g.oppose,factionKey:'oppose'}),choice('只核实现场，不表立场','留下证词，不接受任何可被识别的立场凭证。',{factionKey:'investigate'}),choice('离去','不改变数值，不认作背弃。',{factionKey:'leave'})]};
if(rec.mode==='approach'){const oldEnemy=f.behaviors.some(x=>x.npc===g.npc&&x.kind==='attacked'),threat=owns(g.support)||oldEnemy;return {...base,description:g.warning,story:[g.warning,threat?`${oldEnemy?'对方记得你曾主动向他动手。':'你公开带着「'+ITEMS[g.support].name+'」，'+DEFS[g.npc].name+'会认出这份约定。'}${owns(g.oppose)?'另一方凭证不能抵消这份敌意。':''}继续进入立即交战，玩家先手；可以现在绕行。`:'洞内尚未认出敌意，你可以进入交谈，再决定是否出手。'],choices:[choice(threat?'明知会开战，进入洞府':'探入洞府',threat?'正常玩家先手精英战；对应镇境者的护持不在此消耗。':'进入后可交涉、付费听证、救助、交锋或离开。',{factionAction:'enter'}),choice('绕过洞口','放弃本次机会，不战斗也不获奖励。',{factionKey:'leave'})]};}
if(rec.mode==='hostile')return {...base,story:['对方认出了你身上公开显露的凭证，拿起武器。没有凭空得知包裹里的普通证物。'],choices:[]};
const witnessed=(state.journey.bossQuests?.records[boss]?.stage||0)>0;
const opp=owns(g.oppose);return {...base,story:[boss==='lotus_boss'?'探客先看你的脸，又看腰间：“那宅子里还在烧茶？她倒一直记得给死人留座。”他把器谱筒往身后收了收。':'拾灰人收拢炭印盒：“我只替愿意退契的人找回名字。你救过谁，不能替另一个人签字。”',rec.known.includes('talk')?'你已经听过对方的说法；证词还不等于判决。':witnessed?'你记得沿途听过的旧事，可以据此询问。':'你没有亲历对方提到的人，不会替陌生名字作证。'],choices:[
choice(opp?'交谈，收下专属援助':'付12灵石交换消息',opp?ITEMS[g.aid].text:'取得本次证词，不领取援助或战斗历练。',opp?{questItem:g.aid,factionKey:'aid'}:{goldCost:12,factionKey:'talk',outcome:boss==='lotus_boss'?'他承认从宅后取走过器谱筒，否认见过纵火者。裂芯钉来自同一批追索工具；这份说法不能替他洗清责任，也不足以指认投毒者。':'她说去年的退契者仍有靠炉火熬过冬的人。毁掉愿帖未必立即能活，继续烧炉也并非没有代价。她让你把这句话一起记下。'}),
choice('交出回春草，协助救人','消耗回春草1，取得凝露叶1；不会同时获得专属援助。',{herbCost:1,itemGrants:[{id:'dewherb',count:1}],factionKey:'help'}),
choice('动手，夺取残页','正常先手与该事件精英交战；胜利仅领取标准精英战利及证据，不领取和平赠物。',{factionAction:'attack'}),choice(witnessed?'出示已见证词后离去':'离去',witnessed?'只出示本局已亲历的证词，记录对方拒答；不预先定罪。':'没有资源与关系惩罚。',{factionKey:witnessed?'question':'leave'})]};}
const api={BUDGETS,DEFS,ITEMS,GROUPS,EVENTS,groupFor,definition,build};root.NightEnemyFactions=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis==='undefined'?window:globalThis);
