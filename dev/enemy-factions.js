/* P1+P2: eighteen implemented templates in six complete faction groups. Nineteen later candidates remain design-only. */
(function(root){'use strict';
const BUDGETS=[{a:7,d:6,h:32},{a:8,d:7,h:40},{a:9,d:8,h:48},{a:10,d:9,h:60},{a:11,d:10,h:70},{a:12,d:11,h:80},{a:13,d:12,h:88}];
const DEFS={m01:{name:'失味膳役',boss:'lotus_boss',rank:'normal',trait:'饥乱：首次半血后每段攻击+1；每次行动后自损2，最多三次。'},m02:{name:'缝门纸偶',boss:'lotus_boss',rank:'normal',trait:'缀门形成反击1；每张攻击牌首次伤及生命时才反击一次。'},m03:{name:'夺谱探客',boss:'lotus_boss',rank:'elite',trait:'拆护额外削盾3，绝不溢出到生命。'},m19:{name:'添愿炉役',boss:'furnace_boss',rank:'normal',trait:'拨炉蓄热1；下次攻击首段+3后消耗。'},m20:{name:'寿契灰客',boss:'furnace_boss',rank:'normal',trait:'借年按实际生命伤害治疗，每次最多3、全战最多6。'},m21:{name:'断契拾灰人',boss:'furnace_boss',rank:'elite',trait:'只识别有效续炉寿契，不以火属性技能判断立场。'}};

const FRONTIER={
gate_boss:{source:'灯链断处',cave:'不点灯的渡棚',npc:'m06',support:'lamp_knot',oppose:'lamp_cut',aid:'lamp_cloth',proof:'无灯航线拓记',normal:['m04','m05'],warning:'棚外灯链全被剪断。衣外的续灯灯结，会让棚中人把你认作追兵。',supportName:'续灯灯结',opposeName:'断灯剪印',aidName:'遮灯帛',effect:'playerMark',
sourceText:['巡灯纸役把一名迷路老人牵到亮处，却拦住没有名字的背夫。老人说，若剪断灯链，她也找不到回家的路。','渡棚里的人说名单留住的不只是恶人。续灯能护住登记者，也会让无名者继续等；断灯能打开一段逃路，却会让那段路失去照明。'],supportChoice:'交出灯芯，答应续灯护送',opposeChoice:'剪开拦路灯链，接应渡客',intro:'她把熄灯的小船推回阴影：“我剪的是拦路的链，可灯一灭，没跟上来的人也会迷路。”',testimony:'背夫的木牌被水磨平，巡灯役不敢认他；灯簿又只准有名者过渡。她留下一条不经灯簿的小路，却承认昨夜有人没能跟上。',help:'你交药给等船的老人。她选择留在亮处，不愿随船逃走；渡客没有再劝。',reply:'渡棚留下一截剪断的灯链；是否所有人都过了河，仍没有回信。'},
camp_boss:{source:'军令与药箱',cave:'堤下伤卒营',npc:'m09',support:'pursuit_order',oppose:'pass_fold',aid:'loose_band',proof:'空担架名册',normal:['m07','m08'],warning:'营门军徽都已剪去。公开佩着拘逃军令的人，会被守营者视作追捕者。',supportName:'拘逃军令',opposeName:'放行折符',aidName:'松誓绷带',effect:'energyPenalty',
sourceText:['残卒要求你帮忙追回离营者：“他们带走药，留下的人就得死。”药役背着锁箱，却说自己送出的每一份药都记得人名。','堤下有人用空担架接应。离营并不意味着不再救人，追上逃卒也不能保证药会公平分给伤者。'],supportChoice:'接下军令，承诺追回药物',opposeChoice:'打开侧栅，协助伤卒离营',intro:'独臂枪手把短枪压在担架上：“你是来拿药，还是来问我们为什么走？”他身后仍有一副空担架。',testimony:'他承认曾让一队人走亮处引开巡卒；伤者因此过桥，诱饵却没有全部回来。他不肯把这件事称作两全。',help:'药箱打开，一名伤卒自己拆下军牌；另一人仍把军牌贴身放好。他们没有替全营作决定。',reply:'桥边留下脱下的军牌与一卷用空的绷带；逃走的人仍有各自的去处。'},
snake:{source:'井沿的两张方子',cave:'秤鳞石窟',npc:'m12',support:'well_oath',oppose:'well_chisel',aid:'clean_gauze',proof:'加量药账',normal:['m10','m11'],warning:'石窟秤着旧鳞。封井鳞誓露出的绿光，会被当作阻断买卖的标志。',supportName:'封井鳞誓',opposeName:'开井凿契',aidName:'净砂药纱',effect:'poison',
sourceText:['井役把裂鳞按进泥里，井外病人却等着最后一瓶药。药工的抄方上多了一道加量记号，没有人肯认是自己写的。','封井可能挡住污潮，也会让药铺断供。开井的采鳞者说药会更便宜，却不肯先写下卖价。'],supportChoice:'帮井役封裂，接受守井约定',opposeChoice:'接下开井交易，留下凿契',intro:'她将秤砣推回自己这边：“我是来做生意的，不是来救蛇。你若要听好听话，井外多的是人说。”',testimony:'药账显示买主自己要求加量，商人也因此多收灵石。旧方可以作为诊断依据，但不能证明每个服药者都能停药，也不能代替真正治疗。',help:'你把药草交给一名手掌发黑的药工。他只减了一次用量，没有答应立刻戒药；采鳞者把这笔药钱从账上划去。',reply:'药账留着划去的一笔。井禁、药债与污染，并未因一场交锋一起消失。'},
bell_boss:{source:'尚未系上的名字',cave:'无钟墓室',npc:'m15',support:'bell_knot',oppose:'bell_wedge',aid:'echo_wedge',proof:'归骨拓名纸',normal:['m13','m14'],warning:'墓室不挂钟。衣外的续钟铃结一响，掘名者会认为你来把姓名重新留在钟阵里。',supportName:'续钟铃结',opposeName:'停钟木楔',aidName:'止响短楔',effect:'drawPenalty',
sourceText:['执幡役捧着一个还没系上的名字。家属盼再听一次声音，抬棺人却说自己已经在同一段路上走了十年。','补全墓名是纪念，系入钟阵才是留魂。两者不是一件事；选择前，你看见铃绳确实连着钟阵。'],supportChoice:'把新名系入钟阵，接过铃结',opposeChoice:'取下留魂绳，承诺停钟归骨',intro:'她把石拓卷递到灯下：“名字带走，骨也带走。可有的人只想再听一次，未必愿意谢我。”',testimony:'她曾凿错一块无字碑，认错的家属仍坚持供奉多年。如今她逐字问证，不再凭自己的一次善意替别人决定送别。',help:'你交药稳住拓名人的手，帮她对照旧碑。只记下本次确认的一人，不把其余空白填上。',reply:'墓外多了一张确认过的拓名纸。钟声停下之后，有人离开，也有人仍坐着等。'}
};
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
for(const[id,name,boss,rank,trait,intro]of EXTRA)DEFS[id]={id,name,boss,rank,trait,intro,frostResistant:false,stance:rank==='elite'?'oppose':['m04','m07','m10','m13'].includes(id)?'support':'affected'};

const SCENES={m01:'厨役护着空碗，铁勺已砸坏同纹纸偶的一角。铜牌仍属故宅，他却认不清靠近的人。',m02:'门帘缝成的身影把针横在门口，红线后仍有伤者。它守的是家，未必认得来人。',m03:'钩尖挂着故宅器物，器谱筒被藏在身后。他没有说明自己在旧案中做过什么。',m19:'炉役把愿帖送向火口，面挡上映着别人的名字。他说火不能停，炉外却有人想拿回契约。',m20:'灰客护住空寿灯，面容仍年轻，手却已苍老。灯与炉火之间有一根未断的线。',m21:'她将寿契炭拓压进扁盒，铲刃护着身后的灰匣。她认契，不肯替任何人签名。'};
for(const[id,t]of Object.entries(DEFS))Object.assign(t,{id,intro:SCENES[id]||t.intro,stance:t.stance||(['m01','m20'].includes(id)?'affected':['m02','m19'].includes(id)?'support':'oppose'),frostResistant:false});
function definition(id,region){const t=DEFS[id],{a,d,h}=BUDGETS[Math.max(0,Math.min(6,region))],half=n=>[Math.floor(n/2),n-Math.floor(n/2)].filter(x=>x>0);let intents;
switch(id){
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
for(const i of intents)i.text=[i.block?`获得护盾 ${i.block}`:'',i.hits?`攻击 ${i.hits.join('／')}`:'',i.counter?`反击 ${i.counter}`:'',i.playerMark?`追索印${i.playerMark}`:'',i.poison?`施毒${i.poison}`:'',i.heal?`恢复${i.heal}生命`:'',i.limit?`本战限${i.limit}次${i.limited?'附加状态，之后仅保留伤害':'，耗尽后改为攻击'+i.fallback}`:'',i.drawPenalty?'下回合少抽1':'',i.energyPenalty?'下回合灵力−1':'',i.shieldBreak?'先额外削盾3（不溢出生命）':'',i.heatGain?'获得蓄热1':'',i.selfCost?`自身失去${i.selfCost}生命`:'',i.selfPoison?'自身获得毒1':'',i.removeMark?'移除自身猎印1':'',i.drain?'按实际生命伤害恢复，单次最多3、全战最多6':''].filter(Boolean).join('，');
return {id,...t,hp:t.rank==='elite'?Math.floor(h*1.5):id==='m02'?h-2:h,weights:[1,1],intents};}
const ITEMS={house_order:{name:'护宅家令',text:'主动承诺护宅的凭证；衣外红光会被夺谱探客识别并引战。仅缄红战首回合护盾+8一次。不是调查信物。',boss:'lotus_boss',stance:'support',recognition:'automatic'},split_nail:{name:'裂芯钉',text:'接受取谱委托的器物；鸣响可被探客识别，纸偶也会询问。仅持有不会破坏心匣或改写唤醒记录。',boss:'lotus_boss',stance:'oppose',recognition:'automatic'},furnace_pact:{name:'续炉寿契',text:'自愿接受炉火护持，炉纹自动可辨；拾灰人会立即敌对。赤绫战首回合护盾+8一次。原寿契证物不等于此契。',boss:'furnace_boss',stance:'support',recognition:'automatic'},charcoal_seal:{name:'退契炭印',text:'与退契者共按的停炉凭证，可向拾灰人交涉；不能抵消续炉寿契引发的敌意。',boss:'furnace_boss',stance:'oppose',recognition:'automatic'},heat_tongs:{name:'隔热夹',text:'接受探客取谱委托所得；缄红首次沸盏每段基础伤害−1，一次。未发生战斗则保留旧物，无兑换奖励。',boss:'lotus_boss',aid:true},cold_ash:{name:'冷灰封',text:'赤绫首次烬衣反击强度−1，只该姿态。已有信物完全抵消时不消耗此援助。',boss:'furnace_boss',aid:true}};
for(const[id,t]of Object.entries(ITEMS))Object.assign(t,{id,icon:'learned'});
const GROUPS={lotus_boss:{source:'朱漆门牌下',cave:'灰宅外的拆匣洞',npc:'m03',support:'house_order',oppose:'split_nail',aid:'heat_tongs',proof:'器谱残页',normal:['m01','m02'],warning:'洞内有人专拆护宅机关；家令的红光藏不过他们的眼。'},furnace_boss:{source:'愿帖上的空位',cave:'熄炉洞中的拾灰人',npc:'m21',support:'furnace_pact',oppose:'charcoal_seal',aid:'cold_ash',proof:'寿契炭拓',normal:['m19','m20'],warning:'炉门上划去了朱印：带着有效续炉寿契的人不受欢迎。'}};
for(const[b,g]of Object.entries(FRONTIER)){g.frontier=true;GROUPS[b]=g;for(const[key,name,stance]of [[g.support,g.supportName,'support'],[g.oppose,g.opposeName,'oppose'],[g.aid,g.aidName,null]])ITEMS[key]={id:key,name,boss:b,icon:'learned',stance,recognition:stance?'automatic':undefined,aid:!stance,text:stance==='support'?`主动接受且公开显露的约定；${DEFS[g.npc].name}会认出并引战。对应Boss首回合护盾+8一次；护持用尽仍可识别。`:stance==='oppose'?'主动实施另一方行动的凭证，可交涉；不能抵消有效支持凭证的敌意。':`对应Boss首次${({playerMark:'追索印',energyPenalty:'封灵',poison:'施毒',drawPenalty:'减抽牌'})[g.effect]}减少1，一次；旧物证先完整抵消时不消耗。`};}
function frontierEvent(base,g,rec,state,owns,witnessed){
 const c=(label,text,x={})=>({label,text,outcome:text,...x});
 if(base.factionEvent.kind==='source')return {...base,story:g.sourceText,choices:[c(g.supportChoice,ITEMS[g.support].text,{questItem:g.support,factionKey:'support'}),c(g.opposeChoice,ITEMS[g.oppose].text,{questItem:g.oppose,factionKey:'oppose'}),c('只记录眼前证词','不接受立场，不替未见的人作证。',{factionKey:'investigate'}),c('离去','不扣生命或关系。',{factionKey:'leave'})]};
 if(rec.mode==='approach')return {...base,story:[g.warning,'进入前可以绕行。公开凭证会被辨认，包内调查证物不会被隔空读到。'],choices:[c('探入洞府','按现有有效凭证判断态度。',{factionAction:'enter'}),c('绕行','关闭本次机会，不获奖励。',{factionKey:'leave'})]};
 const oppose=owns(g.oppose);return {...base,story:[g.intro,witnessed?'你能问起本局听过的旧事；这不等于已替双方判决。':'你还没听全此地旧事，不会凭空认识她提到的人。'],choices:[c(oppose?'交谈，交换一次援助':'付12灵石，听取证词',oppose?ITEMS[g.aid].text:g.testimony,oppose?{questItem:g.aid,factionKey:'aid'}:{goldCost:12,factionKey:'talk'}),c('交回春草，帮助眼前的人',g.help+'消耗回春草1，得到凝露叶1；不兼领援助。',{herbCost:1,itemGrants:[{id:'dewherb',count:1}],factionKey:'help'}),c('动手，夺取现场证据','正常玩家先手精英战；胜利只发标准战利及本次证据。',{factionAction:'attack'}),c(witnessed?'问起已见旧事后离开':'离去',witnessed?'对方不肯替未见的人保证。你记下拒答，不额外定罪。':'不发生资源与关系惩罚。',{factionKey:witnessed?'question':'leave'})]};
}
const EVENTS=Object.keys(GROUPS).flatMap(b=>['source','cave'].map(t=>'faction_'+b+'_'+t));
function build(boss,kind,state,nodeId){const g=GROUPS[boss],f=state.journey.factions,rec=f.records[nodeId]||(f.records[nodeId]={boss,kind,mode:'approach',resolved:false,known:[],outcome:null});const owns=id=>state.player.questItems.includes(id)&&!f.invalid[id];const finished=state.journey.bossQuests?.records[boss];const after=finished?.awakened||finished?.concluded;const base={id:'faction_'+boss+'_'+kind,name:kind==='source'?g.source:g.cave,glyph:'灯',kicker:'器物与来意',factionEvent:{boss,kind,nodeId},npcArt:kind==='cave'?g.npc:null};
const choice=(label,text,extra={})=>({label,text,...extra,outcome:extra.outcome||text});
if(after)return {...base,story:['门里只剩收好的工具。先前的关口已经改变，此刻再来的人不必接受一份过期的委托。'],choices:[choice('记下善后，离去','不获得战斗奖励，不重复领取旧物。',{factionKey:'aftermath'})]};
if(g.frontier)return frontierEvent(base,g,rec,state,owns,(state.journey.bossQuests?.records[boss]?.stage||0)>0);
if(kind==='source')return {...base,story:boss==='lotus_boss'?['门边的纸偶正替一个受伤的仆役缝衣。铜牌亮起时，它会保护来客；另一边却有人被同样的红线拦住。','药碗残留封灵药的气味，旁有破损护命阵。这是新发现的痕迹：尚不能据此指认投毒者，也不能替换夺谱纵火案的已有证词。']:['炉役把愿帖夹进炉口：“停了火，等着药的人怎么办？”墙边一位老人却只想拿回自己的寿契。','原寿契是调查证物，只有你主动接受供养才会留下续炉炉纹。支持与反对都有人付代价。'],choices:[choice('接受护持与约定',ITEMS[g.support].text,{questItem:g.support,factionKey:'support'}),choice('接受另一方的委托',ITEMS[g.oppose].text,{questItem:g.oppose,factionKey:'oppose'}),choice('只核实现场，不表立场','留下证词，不接受任何可被识别的立场凭证。',{factionKey:'investigate'}),choice('离去','不改变数值，不认作背弃。',{factionKey:'leave'})]};
if(rec.mode==='approach')return {...base,description:g.warning,story:[g.warning,'这处洞府尚未探入。你可以看清携物的风险，再决定是否进去。'],choices:[choice('探入洞府','进入后按已持有效凭证与本次目击判断态度。',{factionAction:'enter'}),choice('绕过洞口','不进入洞府、不获奖励。',{factionKey:'leave'})]};
if(rec.mode==='hostile')return {...base,story:['对方认出了你身上公开显露的凭证，拿起武器。没有凭空得知包裹里的普通证物。'],choices:[]};
const witnessed=(state.journey.bossQuests?.records[boss]?.stage||0)>0;
const opp=owns(g.oppose);return {...base,story:[boss==='lotus_boss'?'探客先看你的脸，又看腰间：“那宅子里还在烧茶？她倒一直记得给死人留座。”他把器谱筒往身后收了收。':'拾灰人收拢炭印盒：“我只替愿意退契的人找回名字。你救过谁，不能替另一个人签字。”',rec.known.includes('talk')?'你已经听过对方的说法；证词还不等于判决。':witnessed?'你记得本局听过的旧事，可以据此询问。':'你没有亲历对方提到的人，不会替陌生名字作证。'],choices:[
choice(opp?'交谈，收下专属援助':'付12灵石交换消息',opp?ITEMS[g.aid].text:'取得本次证词，不领取援助或战斗历练。',opp?{questItem:g.aid,factionKey:'aid'}:{goldCost:12,factionKey:'talk',outcome:boss==='lotus_boss'?'他承认从宅后取走过器谱筒，否认见过纵火者。裂芯钉来自同一批追索工具；这份说法不能替他洗清责任，也不足以指认投毒者。':'她说去年的退契者仍有靠炉火熬过冬的人。毁掉愿帖未必立即能活，继续烧炉也并非没有代价。她让你把这句话一起记下。'}),
choice('交出回春草，协助救人','消耗回春草1，取得凝露叶1；不会同时获得专属援助。',{herbCost:1,itemGrants:[{id:'dewherb',count:1}],factionKey:'help'}),
choice('动手，夺取残页','正常先手与该事件精英交战；胜利仅领取标准精英战利及证据，不领取和平赠物。',{factionAction:'attack'}),choice(witnessed?'出示已见证词后离去':'离去',witnessed?'只出示本局已亲历的证词，记录对方拒答；不预先定罪。':'没有资源与关系惩罚。',{factionKey:witnessed?'question':'leave'})]};}
const api={BUDGETS,DEFS,ITEMS,GROUPS,EVENTS,definition,build};root.NightEnemyFactions=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis==='undefined'?window:globalThis);
