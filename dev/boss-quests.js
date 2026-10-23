/* 镇境旧事：任务只在本局已抽定的镇境者所在地域出现。 */
(function(root){
 'use strict';
 const QUESTS={
  lotus_boss:{title:'空席上的热茶',items:['puppet_key','puppet_voice'],ward:null,stages:[
   {name:'灰里的一把钥匙',story:['烧毁的宅门外，一名老木匠拿着账簿。寻宝客付过修门灵石，纵火时却把他的女儿也关在了屋里。','他从灰里捡出主人的备用铜匙。那人曾替穷邻免过租，也替掠夺器谱的客人开过门。善意没有认清来人，留下的却是机仆一遍遍烧热的茶。'],act:'帮木匠安葬遗骨，接过铜匙',paid:'付 15 灵石，赎回铜匙',take:'替木匠护送木料，收下谢礼',outcome:'你把遗骨一一收好。木匠交出铜匙，叮嘱你别再把“守家”说成“复仇”。',paidOutcome:'他收下灵石，为女儿买最后一盏魂灯；铜匙留在你手中。'},
   {name:'留声簧里缺掉的半句',story:['一名修器女修正在听一枚开裂的留声簧。她曾替寻宝客修好开门的灵械，如今说自己当时并不知道他们要做什么。','簧片仍能拼出主人的末句话：“看好家……别追出去，救活着的人。”缄红听到的恰好只有前半句。女修既怕担责，又不愿让误听继续杀人。'],act:'陪她署名作证，修复留声簧',paid:'付 15 灵石，请她修复留声簧',take:'不取簧片，换取她的修器酬劳',outcome:'你陪她把名字刻在证词上。她把修复的簧片交给你，不再声称自己毫无关系。',paidOutcome:'灵石付清，簧片恢复完整。她依然不肯署名，却终于肯把主人的话还给缄红。'},
   {name:'门前仍有一双鞋',story:['故宅近在眼前。门阶上的鞋被擦得干净，鞋主人却永远不会回来。一个孩子说，机仆夜里仍给失踪的人缝冬衣。','孩子记得两件事：备用铜匙能开家令心匣，完整留声簧能让她听见主人最后的叮嘱。少一件，都只能闯过仍将来客视为凶手的家政机关。'],advice:'收好铜匙与留声簧，进门时会自动唤醒缄红；只有传闻、只有一件物品都无法止战。'}]},
  gate_boss:{title:'灯照不到的名字',items:['gate_names','gate_wick'],ward:'playerMark',stages:[
   {name:'渡簿上的空白',story:['桥头抄写人请求你帮他辨认泡湿的名册。当年他把无力交灵石的难民写成“无名”，好让渡灯人不必逐一记下他们的死。','他保住了自己的差事，也把那些人从被寻找的可能中抹去。如今灯影按着空白名单索人，他想补名字，却不敢让家属看见旧笔迹。'],act:'陪他补录亡者姓名',paid:'付 15 灵石，雇人核对名册',take:'替渡口搬灯，领取酬劳',outcome:'家属认出了旧笔迹，也认出了迟来的名字。抄写人没有得到宽恕，却交出一份不再空白的渡簿。',paidOutcome:'核验人把每个名字读过一遍。灵石买来了人手，没有买来原谅。'},
   {name:'最后一寸归灯芯',story:['一位老妇藏着照微用过的灯芯。她曾央求渡灯人多留一夜，等儿子归来；多留的那一夜里，渡口最后一船人再没出发。','老妇不愿承认儿子已经不在，也知道灯芯应该回到渡口。她问你，若把等待也拿走，一个人还能靠什么活下去。'],act:'听完她的话，接下旧灯芯',paid:'付 15 灵石，为她另点家灯',take:'替她整理屋舍，收下报酬',outcome:'你没有保证儿子会回来，只答应在雾外替她寄出那封信。她把旧灯芯交给了你。',paidOutcome:'新的家灯亮起。她仍会等，却让你把渡灯人的灯芯带回桥头。'},
   {name:'一盏不必再等的灯',story:['灯影里的人不断报出别人的名字，唯独没叫过自己。渡灯人的职责变成了不许任何人离开的理由。','补全的渡簿能抵去她首次追索印；归灯芯可在开战时护住你。她不会因为几句劝告放下灯，但你至少知道自己正在面对什么。'],advice:'携带补名渡簿：抵消本次战斗首次施加追索印；携带归灯芯：首回合额外 8 护盾。'}]},
  camp_boss:{title:'活人的誓书',items:['camp_ledger','camp_seal'],ward:'energyPenalty',stages:[
   {name:'营外的欠命簿',story:['一名退役守卒拿出欠饷簿，想用它换盘缠。闻铮当年按誓书把逃兵送回营地，也曾替全营扣下最后一份救命药。','簿子上后来改过一行：用来救军官的药，写成了救全营。守卒签过字；他如今想揭穿谎话，也想让自己的签名先消失。'],act:'保留原签名，替他誊清真账',paid:'付 15 灵石，买下未删改的账簿',take:'只接搬运差事，收取酬劳',outcome:'账簿没有洗掉任何名字。守卒把它交给你，第一次承认自己既是受害者，也做过帮凶。',paidOutcome:'他收下盘缠，却没能收回自己的签名。原账留在你这里。'},
   {name:'不再发号施令的印',story:['断营里的军医保管着旧营印。她用它骗过几次关卡，带走伤卒，也用它留下过她认为“还有用”的人。','她说放下印意味着再也不能命令别人牺牲。说完之后，她仍问你，若明天没有命令，谁来决定救谁。'],act:'带走营印，也记下她的选择',paid:'付 15 灵石，为伤卒备药换印',take:'协助清点营物，领取酬劳',outcome:'你没有替她辩白。她把营印放进布袋，不再要求你替她证明每个决定都是对的。',paidOutcome:'药箱留给伤卒，旧营印归你。救援不再以一纸军令作抵押。'},
   {name:'誓言留给谁',story:['闻铮的誓墙还在，墙下的名字却一半是被“保护”到再也无法离开的人。','原账能让你识破她首次封灵军令；旧营印可护住开战一刻。证据不自动结束争斗，它只是让人没那么容易再把服从误当成救命。'],advice:'携带欠命原账：抵消本次战斗首次封灵；携带旧营印：首回合额外 8 护盾。'}]},
  snake:{title:'旧鳞下的药方',items:['snake_formula','snake_scale'],ward:'poison',stages:[
   {name:'药摊后的试方簿',story:['采药人把发黑的试方簿压在摊底。绛鳞曾借自己的蛇毒救过疫民，商盟随后逼她加量，好把稀药卖到雾外。','采药人抄过那张加量的方子，得的灵石已经换成家人的口粮。他不敢把药全扔掉，也不敢再把下一瓶交出去。'],act:'陪他封存毒药，核验原方',paid:'付 15 灵石，买下未加量的原方',take:'只替他运送无毒草药，收取酬劳',outcome:'毒药封进石匣。你留下原方，他留下自己签过的加量记录；没有谁因此变得清白。',paidOutcome:'原方回到你手里。采药人还得决定怎样面对那些买过药的人。'},
   {name:'不该拿去抵债的旧鳞',story:['桥下的孩子藏着一片蜕鳞，说绛鳞曾用它替病母挡寒。母亲后来仍没活下来，债主却拿鳞片算起了利息。','孩子想把它卖掉离开，又怕最后连那次无偿的善意也像一笔交易。他不知道该恨谁，只是不想再欠谁。'],act:'替他核销虚账，收存旧鳞',paid:'付 15 灵石，替他赎回旧鳞',take:'替他送一趟药，领取酬劳',outcome:'假账被逐条划去。孩子让你带走旧鳞，免得它再成为讨债的凭据。',paidOutcome:'债契当面烧尽。旧鳞归你，孩子终于能不背着利息离开。'},
   {name:'蛇息前的一缕药香',story:['药香越近，越能看见石壁上实验的编号。绛鳞的沉默不是没有记忆，而是不再信任来取药的人。','按原方配出的药引可以挡下首次蛇毒；旧鳞可护住首回合。蜕鳞仍会清除猎印，绞缠也仍是三段攻击，准备并不等于免去防守。'],advice:'携带未改原方：抵消本次战斗首次施毒；携带避寒旧鳞：首回合额外 8 护盾。'}]},
  bell_boss:{title:'钟声里的第二个人',items:['bell_names','bell_mallet'],ward:'drawPenalty',stages:[
   {name:'没有写进丧帖的人',story:['抄丧帖的女修在墙角重写一份名单。晚蘅曾替无人收尸的人敲钟，灾变后，雇她的人却把异乡死者从丧帖里划掉。','女修照做过。她当时需要灵石送弟弟出域，如今弟弟安全了，那些被划掉的人仍一遍遍从钟里喊她。'],act:'陪她访认遗物，补全丧帖',paid:'付 15 灵石，请她重新刻帖',take:'帮她送纸灯，收取酬劳',outcome:'每认出一件遗物，她就补上一个名字。她没有再说自己只是照吩咐办事。',paidOutcome:'新帖保留了旧帖上的划痕。补刻没有假装当年的删除从未发生。'},
   {name:'敲钟人的手还在发抖',story:['曾为晚蘅铸钟的匠人留下了木槌。他发现钟腔会吞下未尽的愿望，却为了让工坊活下去，把这个发现写成了“余韵绵长”。','他把木槌举起又放下，说那口钟最初真的只想送人一程。谎话越小，延长它的理由反而越多。'],act:'让他写下实情，收下木槌',paid:'付 15 灵石，赎回封存木槌',take:'协助整理铸件，领取酬劳',outcome:'匠人在槌柄刻下自己的名字和钟的缺陷。木槌终于不再是一件待价而沽的名作。',paidOutcome:'工坊收下赎价，木槌归你。槌柄上的裂缝比柜上的价签更值得记住。'},
   {name:'钟停之前的一次呼吸',story:['山风进了钟楼，却没带走任何回声。晚蘅记得每个名字，已经分不清自己是在送别，还是在逼死者留下作伴。','补全的丧帖能抵消她首次封住抽牌的余响；旧木槌可护住第一回合。先安排防守，再决定何时将积蓄的力量交出去。'],advice:'携带补刻丧帖：抵消本次战斗首次抽牌封印；携带旧送魂槌：首回合额外 8 护盾。'}]}
 };
 const names={puppet_key:['故宅备用铜匙','打开缄红的家令心匣。须与完整留声簧同持，并亲历前两段旧事，才能在进门时唤醒她。'],puppet_voice:['完整留声簧','保存主人未被听见的半句遗言。与故宅备用铜匙一同带至故宅，可在交战前自动唤醒缄红。'],gate_names:['补名渡簿','渡灯人一战中，抵消首次施加追索印。'],gate_wick:['归灯芯','渡灯人一战，首回合额外获得 8 护盾。'],camp_ledger:['欠命原账','缚誓者一战中，抵消首次封灵。'],camp_seal:['旧营印','缚誓者一战，首回合额外获得 8 护盾。'],snake_formula:['未改原方','绛鳞一战中，抵消首次施毒。'],snake_scale:['避寒旧鳞','绛鳞一战，首回合额外获得 8 护盾。'],bell_names:['补刻丧帖','葬钟姬一战中，抵消首次抽牌封印。'],bell_mallet:['旧送魂槌','葬钟姬一战，首回合额外获得 8 护盾。']};
 const ITEMS=Object.fromEntries(Object.entries(names).map(([id,[name,text]])=>[id,{id,name,text,icon:id==='puppet_key'?'weapon':'learned'}]));
 const META=Object.fromEntries(Object.entries(QUESTS).flatMap(([boss,q])=>q.stages.map((s,i)=>[`boss_${boss}_${i+1}`,{boss,step:i+1}])));
 const WEIGHTS=[{gate_boss:5,camp_boss:3,snake:4,bell_boss:2,lotus_boss:3},{gate_boss:2,camp_boss:5,snake:3,bell_boss:4,lotus_boss:5},{gate_boss:1,camp_boss:2,snake:2,bell_boss:5,lotus_boss:6}];
 function build(id,state){
  const meta=META[id],record=meta&&state.journey.bossQuests?.records[meta.boss];
  if(!meta||!record||record.stage!==meta.step-1||record.region!==state.journey.regionIndex)return null;
  const q=QUESTS[meta.boss],s=q.stages[meta.step-1],item=ITEMS[q.items[meta.step-1]],prior=record.lastOutcome;
  const choices=meta.step<3?[
   {key:'witness',label:s.act,text:`取得「${item.name}」。不支付灵石；放弃这次酬劳。`,questItem:item.id,outcome:s.outcome},
   {key:'redeem',label:s.paid,text:`支付 15 灵石，取得「${item.name}」，恢复 6 生命（不超过上限）。`,goldCost:15,heal:6,questItem:item.id,outcome:s.paidOutcome},
   {key:'work',label:s.take,text:'获得 18 灵石；不取得关键物品。',goldGain:18,outcome:'你完成了说定的差事，收下 18 灵石。对方把仍未处理的旧物收回袖中；这条线索并没有因此变成你的东西。'},
   {key:'leave',label:'记下见闻，继续赶路',text:'不改变数值，不取得关键物品。',outcome:'你记住了对方说过的话，没有替谁作保证，也没有带走旧物。'}
  ]:[
   {key:'prepare',label:'按见闻布置护身符',text:'仅本境镇境之战的首回合额外获得 10 护盾。',bossGuard:10,outcome:'你把零碎的见闻排成能实际用上的次序。纸符只能护住一刻，知道来由也没有免去选择。'},
   {key:'medicine',label:'寻一份路边灵草',text:'获得回春草 1 份，收入包裹；放弃护身符。',itemGrants:[{id:'herb',count:1}],outcome:'你没有继续追问，收好一份可在危急时服用的灵草。故事不会因此停止，但你的旅途还要继续。'},
   {key:'trade',label:'把公开见闻抄给行脚灵商',text:'获得 20 灵石；不出售、不补齐关键物品。',goldGain:20,outcome:'灵商把传闻记进价册，付了 20 灵石。他说危险越大，肯听真话的人越珍贵。你留下了该自己携带的旧物。'},
   {key:'leave',label:'不再惊动，沿灯前行',text:'不改变数值。',outcome:'你将旧事留在心里，继续走向那道不能绕开的关口。'}
  ];
  return {id,name:s.name,glyph:'灯',kicker:'镇境旧事',story:[...s.story,...(s.advice?[s.advice]:[])],connection:prior||'',bossQuest:meta,choices};
 }
 function awakening(state){return {id:'boss_lotus_awake',name:'茶凉之前，请先救活着的人',glyph:'匙',kicker:'故宅旧令 · 已被唤醒',bossAwakening:true,story:['铜匙转开家令心匣，完整留声簧接上断裂的半句。缄红的铜壶停住了，裁衣剪和铜针扫帚一件件收回朱漆柜。','“看好家……别追出去，救活着的人。”她终于听见了完整的遗言。你没有替主人下达新命令；你只是把被复仇盖住的话还给她。','她将门打开：“主人的客人，请从这里走。”本境无需战斗，做完以下善后便可进入下一境；不会获得战斗历练或重复战利。'],choices:[
 {key:'shelter',label:'请她照看还活着的邻人',text:'获得她备好的药草 1 份，随后进入下一境。',itemGrants:[{id:'herb',count:1}],outcome:'空席仍在，门外却添了给伤者的热水。缄红从照看一个再不会回来的人，开始照看还能回来的人。'},
 {key:'testimony',label:'将纵火者的证词留在宅内',text:'不改变数值，记录这次唤醒；随后进入下一境。',outcome:'她逐页收好证词，没有再把每个佩剑的来人认成同一张脸。复仇不再是她唯一能执行的家令。'},
 {key:'tea',label:'陪她喝完最后一盏旧茶',text:'恢复 8 生命，不获得战斗奖励；随后进入下一境。',heal:8,outcome:'她第一次没有将空盏重新烧沸。茶确实凉了，却终于有人坐在桌边喝完。'},
 {key:'farewell',label:'把决定留给她，辞别故宅',text:'不改变数值；随后进入下一境。',outcome:'“要不要离开，今后由你自己决定。”门后的机关轻轻应了一声，没有把这句话录成又一道主人的命令。'}
 ]};}
 const api={QUESTS,ITEMS,META,WEIGHTS,EVENT_IDS:[...Object.keys(META),'boss_lotus_awake'],build,awakening,artBoss:id=>id==='boss_lotus_awake'?'lotus_boss':META[id]?.boss};
 root.NightBossQuests=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis==='undefined'?window:globalThis);
