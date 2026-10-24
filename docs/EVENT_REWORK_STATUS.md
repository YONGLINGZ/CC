# P2事件整改执行记录

基线：c19e1c1。原计划见 P2_EVENT_REWORK_PLAN.md。

批次1—3的代码和编辑工作已落地；批次4的自动部分已执行，真人理解度验收尚未取得结果，不能判整轮验收完成。

- 批次1：四条P2来源／洞府分流、具体敌对提示、调查用途、有限交易、有条件和平与失败开战；支持委托在实际战胜洞府对手后才写履约。军营提供两场连续战斗，第一战不发奖，最后只发一份精英总战利。相关Boss旧事与对话按持有物证显示。
- 批次2：158项逐项编辑结论；141项改写、17项保留并精修说明。事件用 event-editorial.js 提供统一呈现层，原数值和历史判断仍在来源模块。十套人物链保留历史开场；未接护送不再领旧约尾款、未付押金不再收到退款。审阅包逐项保存改造前正文／选项和当前状态快照。登记是编辑结果，不代表每种动态状态被真人读过。
- 批次3：按钮显示实际已知代价；付费证词付款后揭示；援助显示携带、用尽、触发数值、旧证优先／冻结／未见招式等未用原因；首回合8护盾单列实际吸收。战后展示履约场面与援助报告，手记保留同一份记录。
- 批次4：规则回归、导出身份与动态快照、Chromium离线点击、移动视口布局及路径探针；实际结果以对应JSON报告为准。真机与至少5名新玩家／8条完整线记录尚未收集，未伪造评价或问卷。

## 路线比较与校准

600次指定状态探针：四组、两角色、每路线12种种子；自然生命60、灵石60、起手十张牌。来源放在第4段、洞府第8段、Boss第10段；不补血、不注牌、不秒杀，跳转本身属于fixture。策略读取内部意图，只供机械比较，不能外推真人难度。没有把这600次说成自然整局。结算HP含正常关口补给。

| 镇境者 | 路线 | 次数 | 生还 | 洞府掉血中位 | 净灵石中位（含Boss） | 援助触发／携带 | 护持实际挡伤中位 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 渡灯 | 接受护持／洞内交锋 | 24 | 24 | 4 | 70 | 0/0 | 8 |
| 渡灯 | 另一方委托／和平行动 | 24 | 24 | 0 | 35 | 21/24 | — |
| 渡灯 | 调查核验 | 24 | 24 | 0 | 35 | 21/24 | — |
| 渡灯 | 付费听证 | 24 | 24 | 0 | 23 | 0/0 | — |
| 渡灯 | 交草救助 | 24 | 24 | 0 | 35 | 0/0 | — |
| 渡灯 | 离去 | 24 | 24 | 0 | 35 | 0/0 | — |
| 军营 | 接受护持／洞内交锋 | 24 | 24 | 3 | 70 | 0/0 | 8 |
| 军营 | 另一方委托／和平行动 | 24 | 24 | 0 | 35 | 24/24 | — |
| 军营 | 调查核验 | 24 | 24 | 0 | 35 | 24/24 | — |
| 军营 | 无账劝阻→失败开战 | 24 | 24 | 3 | 70 | 0/0 | — |
| 军营 | 交草救助 | 24 | 24 | 0 | 35 | 0/0 | — |
| 军营 | 离去 | 24 | 24 | 0 | 35 | 0/0 | — |
| 军营 | 连续两方交锋 | 24 | 24 | 5 | 70 | 0/0 | — |
| 蛇井 | 接受护持／洞内交锋 | 24 | 24 | 3 | 70 | 0/0 | 8 |
| 蛇井 | 另一方委托／和平行动 | 24 | 24 | 0 | 23 | 24/24 | — |
| 蛇井 | 调查核验 | 24 | 24 | 0 | 27 | 0/0 | — |
| 蛇井 | 付费听证 | 24 | 24 | 0 | 23 | 0/0 | — |
| 蛇井 | 交草救助 | 24 | 24 | 0 | 35 | 0/0 | — |
| 蛇井 | 离去 | 24 | 24 | 0 | 35 | 0/0 | — |
| 葬钟 | 接受护持／洞内交锋 | 24 | 24 | 2 | 70 | 0/0 | 8 |
| 葬钟 | 另一方委托／和平行动 | 24 | 24 | 0 | 35 | 24/24 | — |
| 葬钟 | 调查核验 | 24 | 24 | 0 | 35 | 24/24 | — |
| 葬钟 | 付费听证 | 24 | 24 | 0 | 23 | 0/0 | — |
| 葬钟 | 交草救助 | 24 | 24 | 0 | 35 | 0/0 | — |
| 葬钟 | 离去 | 24 | 24 | 0 | 35 | 0/0 | — |

校准结论：蛇井调查将购草价从12降至8；开井委托在洞府实际支付12，交药和援助一并结算。和平路线明确放弃精英奖励；军营连续战承担额外一战但仍只有一份总战利。不扩大援助数值来强迫每战触发，也不偷改Boss轮转。渡灯有3/24次持援助但未触发，原因由战后报告保留。支持方多35灵石却需打精英，这一差异保留；是否值得尚待真人比较。原有150局整体难度门禁仍未通过，见v11报告，未将其写成平衡达标。

## 逐事件结论

每项的原文、当前文案、选项效果和动态输入见 recovery/events-md-export.zip。脚本：node dev/export-events-md.cjs。源文件列为机制来源，呈现改写另见 dev/event-editorial.js。

| ID | 机制来源 | 编辑结论 | 依据 |
| --- | --- | --- | --- |
| well | dev/engine.js | 已改写 | 改写现场、直接请求与已知代价；保留原数值及历史前提。 |
| shrine | dev/engine.js | 已改写 | 改写现场、直接请求与已知代价；保留原数值及历史前提。 |
| dreamshop | dev/engine.js | 已改写 | 改写现场、直接请求与已知代价；保留原数值及历史前提。 |
| theatre | dev/engine.js | 已改写 | 改写现场、直接请求与已知代价；保留原数值及历史前提。 |
| umbrella | dev/engine.js | 已改写 | 改写现场、直接请求与已知代价；保留原数值及历史前提。 |
| pawnshop | dev/engine.js | 已改写 | 改写现场、直接请求与已知代价；保留原数值及历史前提。 |
| riftwatch | dev/engine.js | 已改写 | 改写现场、直接请求与已知代价；保留原数值及历史前提。 |
| supply | dev/engine.js | 已改写 | 改写现场、直接请求与已知代价；保留原数值及历史前提。 |
| cultlab | dev/engine.js | 已改写 | 改写现场、直接请求与已知代价；保留原数值及历史前提。 |
| swordgrave | dev/engine.js | 已改写 | 改写现场、直接请求与已知代价；保留原数值及历史前提。 |
| pilgrims | dev/engine.js | 已改写 | 改写现场、直接请求与已知代价；保留原数值及历史前提。 |
| prisoner | dev/engine.js | 已改写 | 改写现场、直接请求与已知代价；保留原数值及历史前提。 |
| echo | dev/engine.js | 已改写 | 改写现场、直接请求与已知代价；保留原数值及历史前提。 |
| broker | dev/engine.js | 已改写 | 改写现场、直接请求与已知代价；保留原数值及历史前提。 |
| liu_first | dev/engine.js | 已改写 | 改写现场、直接请求与已知代价；保留原数值及历史前提。 |
| liu_return | dev/engine.js | 保留并精修说明 | 保留此前救人／付钱／指路的不同招呼与报价，补充代价摘要。 |
| liu_final | dev/engine.js | 保留并精修说明 | 保留按真实帮助回报，避免新对白捏造相识。 |
| ji_first | dev/engine.js | 已改写 | 改写现场、直接请求与已知代价；保留原数值及历史前提。 |
| ji_return | dev/engine.js | 保留并精修说明 | 保留展示／隐瞒宝物的真实分支，不预揭对方动机。 |
| ji_final | dev/engine.js | 保留并精修说明 | 保留实际知情与隐藏动机决定的伏击／让路。 |
| wen_first | dev/engine.js | 已改写 | 改写现场、直接请求与已知代价；保留原数值及历史前提。 |
| wen_return | dev/engine.js | 保留并精修说明 | 保留解锁与未解锁的追索分支，保留每笔药资。 |
| wen_final | dev/engine.js | 保留并精修说明 | 保留带证／消印／取药互斥。 |
| sect_duel | dev/engine.js | 已改写 | 改写现场、直接请求与已知代价；保留原数值及历史前提。 |
| herb_caravan | dev/engine.js | 保留并精修说明 | 苏芩已有现场动作和直接请求，保留语气及救药条件。 |
| relic_dispute | dev/engine.js | 已改写 | 改写现场、直接请求与已知代价；保留原数值及历史前提。 |
| night_watch | dev/engine.js | 已改写 | 改写现场、直接请求与已知代价；保留原数值及历史前提。 |
| moon_trace | dev/engine.js | 已改写 | 改写现场、直接请求与已知代价；保留原数值及历史前提。 |
| sealed_name | dev/engine.js | 已改写 | 改写现场、直接请求与已知代价；保留原数值及历史前提。 |
| moon_vow | dev/engine.js | 已改写 | 改写现场、直接请求与已知代价；保留原数值及历史前提。 |
| armory | dev/engine.js | 已改写 | 改写现场、直接请求与已知代价；保留原数值及历史前提。 |
| sovereign_wake | dev/engine.js | 已改写 | 改写现场、直接请求与已知代价；保留原数值及历史前提。 |
| sovereign_recall | dev/engine.js | 已改写 | 改写现场、直接请求与已知代价；保留原数值及历史前提。 |
| sovereign_memory | dev/engine.js | 已改写 | 改写现场、直接请求与已知代价；保留原数值及历史前提。 |
| tainted_mercy | dev/engine.js | 已改写 | 改写现场、直接请求与已知代价；保留原数值及历史前提。 |
| demonic_offer | dev/engine.js | 已改写 | 改写现场、直接请求与已知代价；保留原数值及历史前提。 |
| demonic_warning | dev/engine.js | 已改写 | 改写现场、直接请求与已知代价；保留原数值及历史前提。 |
| mirror_trial | dev/engine.js | 已改写 | 改写现场、直接请求与已知代价；保留原数值及历史前提。 |
| demon_manual | dev/engine.js | 已改写 | 改写现场、直接请求与已知代价；保留原数值及历史前提。 |
| fallen_hunt | dev/engine.js | 已改写 | 改写现场、直接请求与已知代价；保留原数值及历史前提。 |
| blood_lesson | dev/expansion.js | 保留并精修说明 | 保留旧修直接诱惑及自损／吸血／正诀分流，补充已知施术风险。 |
| blood_debt | dev/expansion.js | 已改写 | 改写现场、直接请求与已知代价；保留原数值及历史前提。 |
| blood_choice | dev/expansion.js | 保留并精修说明 | 保留本局血术选择回执及封卷不逆转异变。 |
| marsh_pharmacy | dev/seven.js | 保留并精修说明 | 药铺报价清楚，保留具体份数并明示物品收入包裹。 |
| reed_procession | dev/seven.js | 已改写 | 改写现场、直接请求与已知代价；保留原数值及历史前提。 |
| drowned_archive | dev/seven.js | 保留并精修说明 | 换页、修页、只读题字动作与效果一致，保留。 |
| furnace_ledger | dev/seven.js | 已改写 | 改写现场、直接请求与已知代价；保留原数值及历史前提。 |
| captive_smith | dev/seven.js | 已改写 | 改写现场、直接请求与已知代价；保留原数值及历史前提。 |
| ash_orchard | dev/seven.js | 保留并精修说明 | 保留可见药性，修正丹药收入包裹与即时治疗混淆。 |
| mirror_guest | dev/seven.js | 保留并精修说明 | 保留镜中交易及退出，补充丹药用途。 |
| unfinished_portrait | dev/seven.js | 已改写 | 改写现场、直接请求与已知代价；保留原数值及历史前提。 |
| glass_assembly | dev/seven.js | 已改写 | 改写现场、直接请求与已知代价；保留原数值及历史前提。 |
| fate_tailor | dev/seven.js | 已改写 | 改写现场、直接请求与已知代价；保留原数值及历史前提。 |
| silent_astrolabe | dev/seven.js | 已改写 | 改写现场、直接请求与已知代价；保留原数值及历史前提。 |
| last_campfire | dev/seven.js | 保留并精修说明 | 无人营火不虚构NPC；保留纸条，明确火符烫伤和奖励。 |
| tale_debt_1 | dev/tales.js | 已改写 | 保留历史选择开场，加入本阶段当事人对白并核对劳动／交易前提。 |
| tale_debt_2 | dev/tales.js | 已改写 | 保留历史选择开场，加入本阶段当事人对白并核对劳动／交易前提。 |
| tale_debt_3 | dev/tales.js | 已改写 | 保留历史选择开场，加入本阶段当事人对白并核对劳动／交易前提。 |
| tale_medicine_1 | dev/tales.js | 已改写 | 保留历史选择开场，加入本阶段当事人对白并核对劳动／交易前提。 |
| tale_medicine_2 | dev/tales.js | 已改写 | 保留历史选择开场，加入本阶段当事人对白并核对劳动／交易前提。 |
| tale_medicine_3 | dev/tales.js | 已改写 | 保留历史选择开场，加入本阶段当事人对白并核对劳动／交易前提。 |
| tale_letter_1 | dev/tales.js | 已改写 | 保留历史选择开场，加入本阶段当事人对白并核对劳动／交易前提。 |
| tale_letter_2 | dev/tales.js | 已改写 | 保留历史选择开场，加入本阶段当事人对白并核对劳动／交易前提。 |
| tale_letter_3 | dev/tales.js | 已改写 | 保留历史选择开场，加入本阶段当事人对白并核对劳动／交易前提。 |
| tale_name_1 | dev/tales.js | 已改写 | 保留历史选择开场，加入本阶段当事人对白并核对劳动／交易前提。 |
| tale_name_2 | dev/tales.js | 已改写 | 保留历史选择开场，加入本阶段当事人对白并核对劳动／交易前提。 |
| tale_name_3 | dev/tales.js | 已改写 | 保留历史选择开场，加入本阶段当事人对白并核对劳动／交易前提。 |
| tale_lanterns_1 | dev/tales.js | 已改写 | 保留历史选择开场，加入本阶段当事人对白并核对劳动／交易前提。 |
| tale_lanterns_2 | dev/tales.js | 已改写 | 保留历史选择开场，加入本阶段当事人对白并核对劳动／交易前提。 |
| tale_lanterns_3 | dev/tales.js | 已改写 | 保留历史选择开场，加入本阶段当事人对白并核对劳动／交易前提。 |
| tale_grain_1 | dev/tales.js | 已改写 | 保留历史选择开场，加入本阶段当事人对白并核对劳动／交易前提。 |
| tale_grain_2 | dev/tales.js | 已改写 | 保留历史选择开场，加入本阶段当事人对白并核对劳动／交易前提。 |
| tale_grain_3 | dev/tales.js | 已改写 | 保留历史选择开场，加入本阶段当事人对白并核对劳动／交易前提。 |
| tale_bridge_1 | dev/tales.js | 已改写 | 保留历史选择开场，加入本阶段当事人对白并核对劳动／交易前提。 |
| tale_bridge_2 | dev/tales.js | 已改写 | 保留历史选择开场，加入本阶段当事人对白并核对劳动／交易前提。 |
| tale_bridge_3 | dev/tales.js | 已改写 | 保留历史选择开场，加入本阶段当事人对白并核对劳动／交易前提。 |
| tale_forge_1 | dev/tales.js | 已改写 | 保留历史选择开场，加入本阶段当事人对白并核对劳动／交易前提。 |
| tale_forge_2 | dev/tales.js | 已改写 | 保留历史选择开场，加入本阶段当事人对白并核对劳动／交易前提。 |
| tale_forge_3 | dev/tales.js | 已改写 | 保留历史选择开场，加入本阶段当事人对白并核对劳动／交易前提。 |
| tale_theatre_1 | dev/tales.js | 已改写 | 保留历史选择开场，加入本阶段当事人对白并核对劳动／交易前提。 |
| tale_theatre_2 | dev/tales.js | 已改写 | 保留历史选择开场，加入本阶段当事人对白并核对劳动／交易前提。 |
| tale_theatre_3 | dev/tales.js | 已改写 | 保留历史选择开场，加入本阶段当事人对白并核对劳动／交易前提。 |
| tale_well_1 | dev/tales.js | 已改写 | 保留历史选择开场，加入本阶段当事人对白并核对劳动／交易前提。 |
| tale_well_2 | dev/tales.js | 已改写 | 保留历史选择开场，加入本阶段当事人对白并核对劳动／交易前提。 |
| tale_well_3 | dev/tales.js | 已改写 | 保留历史选择开场，加入本阶段当事人对白并核对劳动／交易前提。 |
| campfire_hunt | dev/tales.js | 保留并精修说明 | 保留按堕落与证词触发的指控、交锋与返回休息，补齐提交风险。 |
| road_aftermath | dev/tales.js | 保留并精修说明 | 保留首次／受助重遇差异、绕路与护车不同结算。 |
| boss_lotus_boss_1 | dev/boss-quests.js | 已改写 | 改为当事人直接对白、对应物证与具体准备结果；保留原条件。 |
| boss_lotus_boss_2 | dev/boss-quests.js | 已改写 | 改为当事人直接对白、对应物证与具体准备结果；保留原条件。 |
| boss_lotus_boss_3 | dev/boss-quests.js | 已改写 | 改为当事人直接对白、对应物证与具体准备结果；保留原条件。 |
| boss_gate_boss_1 | dev/boss-quests.js | 已改写 | 改为当事人直接对白、对应物证与具体准备结果；保留原条件。 |
| boss_gate_boss_2 | dev/boss-quests.js | 已改写 | 改为当事人直接对白、对应物证与具体准备结果；保留原条件。 |
| boss_gate_boss_3 | dev/boss-quests.js | 已改写 | 改为当事人直接对白、对应物证与具体准备结果；保留原条件。 |
| boss_camp_boss_1 | dev/boss-quests.js | 已改写 | 改为当事人直接对白、对应物证与具体准备结果；保留原条件。 |
| boss_camp_boss_2 | dev/boss-quests.js | 已改写 | 改为当事人直接对白、对应物证与具体准备结果；保留原条件。 |
| boss_camp_boss_3 | dev/boss-quests.js | 已改写 | 改为当事人直接对白、对应物证与具体准备结果；保留原条件。 |
| boss_snake_1 | dev/boss-quests.js | 已改写 | 改为当事人直接对白、对应物证与具体准备结果；保留原条件。 |
| boss_snake_2 | dev/boss-quests.js | 已改写 | 改为当事人直接对白、对应物证与具体准备结果；保留原条件。 |
| boss_snake_3 | dev/boss-quests.js | 已改写 | 改为当事人直接对白、对应物证与具体准备结果；保留原条件。 |
| boss_bell_boss_1 | dev/boss-quests.js | 已改写 | 改为当事人直接对白、对应物证与具体准备结果；保留原条件。 |
| boss_bell_boss_2 | dev/boss-quests.js | 已改写 | 改为当事人直接对白、对应物证与具体准备结果；保留原条件。 |
| boss_bell_boss_3 | dev/boss-quests.js | 已改写 | 改为当事人直接对白、对应物证与具体准备结果；保留原条件。 |
| boss_marsh_boss_1 | dev/boss-quests.js | 已改写 | 改为当事人直接对白、对应物证与具体准备结果；保留原条件。 |
| boss_marsh_boss_2 | dev/boss-quests.js | 已改写 | 改为当事人直接对白、对应物证与具体准备结果；保留原条件。 |
| boss_marsh_boss_3 | dev/boss-quests.js | 已改写 | 改为当事人直接对白、对应物证与具体准备结果；保留原条件。 |
| boss_furnace_boss_1 | dev/boss-quests.js | 已改写 | 改为当事人直接对白、对应物证与具体准备结果；保留原条件。 |
| boss_furnace_boss_2 | dev/boss-quests.js | 已改写 | 改为当事人直接对白、对应物证与具体准备结果；保留原条件。 |
| boss_furnace_boss_3 | dev/boss-quests.js | 已改写 | 改为当事人直接对白、对应物证与具体准备结果；保留原条件。 |
| boss_mirror_boss_1 | dev/boss-quests.js | 已改写 | 改为当事人直接对白、对应物证与具体准备结果；保留原条件。 |
| boss_mirror_boss_2 | dev/boss-quests.js | 已改写 | 改为当事人直接对白、对应物证与具体准备结果；保留原条件。 |
| boss_mirror_boss_3 | dev/boss-quests.js | 已改写 | 改为当事人直接对白、对应物证与具体准备结果；保留原条件。 |
| boss_abyss_boss_1 | dev/boss-quests.js | 已改写 | 改为当事人直接对白、对应物证与具体准备结果；保留原条件。 |
| boss_abyss_boss_2 | dev/boss-quests.js | 已改写 | 改为当事人直接对白、对应物证与具体准备结果；保留原条件。 |
| boss_abyss_boss_3 | dev/boss-quests.js | 已改写 | 改为当事人直接对白、对应物证与具体准备结果；保留原条件。 |
| boss_feiye_1 | dev/boss-quests.js | 已改写 | 改为当事人直接对白、对应物证与具体准备结果；保留原条件。 |
| boss_feiye_2 | dev/boss-quests.js | 已改写 | 改为当事人直接对白、对应物证与具体准备结果；保留原条件。 |
| boss_feiye_3 | dev/boss-quests.js | 已改写 | 改为当事人直接对白、对应物证与具体准备结果；保留原条件。 |
| boss_feiye_echo_1 | dev/boss-quests.js | 已改写 | 改为当事人直接对白、对应物证与具体准备结果；保留原条件。 |
| boss_feiye_echo_2 | dev/boss-quests.js | 已改写 | 改为当事人直接对白、对应物证与具体准备结果；保留原条件。 |
| boss_feiye_echo_3 | dev/boss-quests.js | 已改写 | 改为当事人直接对白、对应物证与具体准备结果；保留原条件。 |
| boss_retainer_1 | dev/boss-quests.js | 已改写 | 改为当事人直接对白、对应物证与具体准备结果；保留原条件。 |
| boss_retainer_2 | dev/boss-quests.js | 已改写 | 改为当事人直接对白、对应物证与具体准备结果；保留原条件。 |
| boss_retainer_3 | dev/boss-quests.js | 已改写 | 改为当事人直接对白、对应物证与具体准备结果；保留原条件。 |
| boss_heart_1 | dev/boss-quests.js | 已改写 | 改为当事人直接对白、对应物证与具体准备结果；保留原条件。 |
| boss_heart_2 | dev/boss-quests.js | 已改写 | 改为当事人直接对白、对应物证与具体准备结果；保留原条件。 |
| boss_heart_3 | dev/boss-quests.js | 已改写 | 改为当事人直接对白、对应物证与具体准备结果；保留原条件。 |
| boss_snake_ascended_1 | dev/boss-quests.js | 已改写 | 改为当事人直接对白、对应物证与具体准备结果；保留原条件。 |
| boss_snake_ascended_2 | dev/boss-quests.js | 已改写 | 改为当事人直接对白、对应物证与具体准备结果；保留原条件。 |
| boss_snake_ascended_3 | dev/boss-quests.js | 已改写 | 改为当事人直接对白、对应物证与具体准备结果；保留原条件。 |
| boss_lotus_awake | dev/boss-quests.js | 保留并精修说明 | 保留双物证且亲历旧事才唤醒的四种善后；不新增无条件劝退。 |
| faction_lotus_boss_source | dev/enemy-factions.js | 已改写 | 按组区分当事人、公开凭证风险、实际委托与洞府处置。 |
| faction_lotus_boss_cave | dev/enemy-factions.js | 已改写 | 按组区分当事人、公开凭证风险、实际委托与洞府处置。 |
| faction_furnace_boss_source | dev/enemy-factions.js | 已改写 | 按组区分当事人、公开凭证风险、实际委托与洞府处置。 |
| faction_furnace_boss_cave | dev/enemy-factions.js | 已改写 | 按组区分当事人、公开凭证风险、实际委托与洞府处置。 |
| faction_gate_boss_source | dev/enemy-factions.js | 已改写 | 按组区分当事人、公开凭证风险、实际委托与洞府处置。 |
| faction_gate_boss_cave | dev/enemy-factions.js | 已改写 | 按组区分当事人、公开凭证风险、实际委托与洞府处置。 |
| faction_camp_boss_source | dev/enemy-factions.js | 已改写 | 按组区分当事人、公开凭证风险、实际委托与洞府处置。 |
| faction_camp_boss_cave | dev/enemy-factions.js | 已改写 | 按组区分当事人、公开凭证风险、实际委托与洞府处置。 |
| faction_snake_source | dev/enemy-factions.js | 已改写 | 按组区分当事人、公开凭证风险、实际委托与洞府处置。 |
| faction_snake_cave | dev/enemy-factions.js | 已改写 | 按组区分当事人、公开凭证风险、实际委托与洞府处置。 |
| faction_bell_boss_source | dev/enemy-factions.js | 已改写 | 按组区分当事人、公开凭证风险、实际委托与洞府处置。 |
| faction_bell_boss_cave | dev/enemy-factions.js | 已改写 | 按组区分当事人、公开凭证风险、实际委托与洞府处置。 |
| faction_marsh_boss_source | dev/enemy-factions.js | 已改写 | 按组区分当事人、公开凭证风险、实际委托与洞府处置。 |
| faction_marsh_boss_cave | dev/enemy-factions.js | 已改写 | 按组区分当事人、公开凭证风险、实际委托与洞府处置。 |
| faction_mirror_boss_source | dev/enemy-factions.js | 已改写 | 按组区分当事人、公开凭证风险、实际委托与洞府处置。 |
| faction_mirror_boss_cave | dev/enemy-factions.js | 已改写 | 按组区分当事人、公开凭证风险、实际委托与洞府处置。 |
| faction_abyss_boss_source | dev/enemy-factions.js | 已改写 | 按组区分当事人、公开凭证风险、实际委托与洞府处置。 |
| faction_abyss_boss_cave | dev/enemy-factions.js | 已改写 | 按组区分当事人、公开凭证风险、实际委托与洞府处置。 |
| faction_feiye_source | dev/enemy-factions.js | 已改写 | 按组区分当事人、公开凭证风险、实际委托与洞府处置。 |
| faction_feiye_cave | dev/enemy-factions.js | 已改写 | 按组区分当事人、公开凭证风险、实际委托与洞府处置。 |
| faction_feiye_echo_source | dev/enemy-factions.js | 已改写 | 按组区分当事人、公开凭证风险、实际委托与洞府处置。 |
| faction_feiye_echo_cave | dev/enemy-factions.js | 已改写 | 按组区分当事人、公开凭证风险、实际委托与洞府处置。 |
| faction_retainer_source | dev/enemy-factions.js | 已改写 | 按组区分当事人、公开凭证风险、实际委托与洞府处置。 |
| faction_retainer_cave | dev/enemy-factions.js | 已改写 | 按组区分当事人、公开凭证风险、实际委托与洞府处置。 |
| faction_heart_source | dev/enemy-factions.js | 已改写 | 按组区分当事人、公开凭证风险、实际委托与洞府处置。 |
| faction_heart_cave | dev/enemy-factions.js | 已改写 | 按组区分当事人、公开凭证风险、实际委托与洞府处置。 |
| faction_snake_ascended_source | dev/enemy-factions.js | 已改写 | 按组区分当事人、公开凭证风险、实际委托与洞府处置。 |
| faction_snake_ascended_cave | dev/enemy-factions.js | 已改写 | 按组区分当事人、公开凭证风险、实际委托与洞府处置。 |
