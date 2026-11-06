/* Replay options and gear identities. Pure data/functions: no DOM, storage or game state. */
(function(root){
'use strict';
function freeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
const VERSION=1;
const ROLES=freeze(['assassin','sword','hehuan','mechanist','sovereign']);
const MODES=freeze({
 short:{id:'short',key:'short',name:'三境短征',text:'走过三境、三十段，完成一次完整构筑与末境抉择。',realms:3,floors:30},
 long:{id:'long',key:'long',name:'七境长旅',text:'走过七境、七十段，追索完整旅途与原有隐藏线索。',realms:7,floors:70}
});
const EFFECTS=freeze({
 firstAttackBonus:{trigger:'firstAttack',limit:'turn',text:'每个玩家回合首张攻击牌的第一段额外伤害；计入既有首段增伤上限。'},
 firstAttackMark:{trigger:'firstAttackAfter',limit:'turn',text:'每回合首张攻击牌结算后，敌人仍存活时施加猎印；仍受5层上限约束。'},
 firstAttackChill:{trigger:'firstAttackAfter',limit:'turn',text:'每回合首张攻击牌结算后，敌人仍存活时施加霜寒；沿用既有精英凝霜规则与10层上限。'},
 firstAttackSoul:{trigger:'firstAttackAfter',limit:'turn',text:'每回合首张攻击牌结算后获得魂息；仍受6层上限约束。'},
 firstAttackSelfLoss:{trigger:'firstAttackBefore',limit:'turn',text:'每回合首张攻击牌落下前失去生命，无视护盾；可以致命，死亡后停止攻击。'},
 firstGuardBonus:{trigger:'firstGuard',limit:'turn',text:'每回合首次实际获得本体护盾时，增加本次护盾；不会递归触发自身。'},
 thirdCardDraw:{trigger:'thirdCardAfter',limit:'turn',text:'每回合第3张实际打出的牌结算后抽牌；机匣按钮不算牌。'},
 thirdCardBlock:{trigger:'thirdCardAfter',limit:'turn',text:'每回合第3张实际打出的牌结算后获得本体护盾；机匣按钮不算牌。'},
 firstTrapBlock:{trigger:'firstTrapSet',limit:'turn',text:'每回合首次成功放入藏招后获得本体护盾；未放入不消耗额度。'},
 firstCommandBonus:{trigger:'firstDamagingCommand',limit:'turn',text:'每回合首次造成伤害的机体指令首段额外伤害；非攻击指令不消耗额度。'},
 firstOverloadDraw:{trigger:'firstOverloadAfter',limit:'turn',text:'每回合首次成功过载结算后抽牌；本体死亡则不继续结算。'},
 firstOverloadRepair:{trigger:'firstOverloadAfter',limit:'turn',text:'每回合首次成功过载结算后修复该机体，不超过耐久上限；不取消退场与冷却。'},
 firstSoulSpendDraw:{trigger:'firstSoulSpendAfter',limit:'turn',text:'每回合首次实际消耗魂息后抽牌；魂息不足、未消耗不触发。'},
 startEnergyPenalty:{trigger:'battleStart',limit:'battle',text:'每场首个玩家回合减少灵力；不影响之后回合，最终灵力不低于0。'},
 initialMaxHpPenalty:{trigger:'runStart',limit:'run',text:'出发时同时减少最大生命与当前生命；仅本局生效，最大生命至少1。'}
});
function vow(id,role,name,benefit,cost,from,to,effects){return {id,key:id,role,name,label:name,benefit,cost,text:benefit+' 代价：'+cost,starterSwap:[{from,to,count:1}],effects,limits:{perTurn:1},icon:({assassin:'爪',sword:'剑',hehuan:'扇',mechanist:'机',sovereign:'月'})[role]};}
const OATHS=freeze({
 assassin_hunter:vow('assassin_hunter','assassin','逐印之誓','每回合首张攻击结算后额外施加1猎印；起手一张爪击换为戏鼠。','本局最大生命与当前生命各减少8。','C01','C08',{firstAttackMark:1,initialMaxHpPenalty:8}),
 assassin_chain:vow('assassin_chain','assassin','三爪回锋','每回合第3张牌结算后额外抽1张；起手一张爪击换为猫步。','每回合首张攻击前失去1生命，可以致命。','C01','C06',{thirdCardDraw:1,firstAttackSelfLoss:1}),
 sword_frost:vow('sword_frost','sword','借寒成阵','每回合首次获得本体护盾时额外加2；首张攻击结算后额外施加1霜寒；起手一张霜锋换为寒芒。','每场首回合少1灵力。','S01','S05',{firstGuardBonus:2,firstAttackChill:1,startEnergyPenalty:1}),
 sword_edge:vow('sword_edge','sword','孤锋断势','每回合首张攻击第一段伤害额外加3；起手一张凝霜换为三叠泉。','每回合首张攻击前失去2生命，可以致命。','S02','S08',{firstAttackBonus:3,firstAttackSelfLoss:2}),
 hehuan_veil:vow('hehuan_veil','hehuan','落纱待客','每回合首次成功放入藏招后获得4护盾；起手一张撩弦换为乱息。','本局最大生命与当前生命各减少8。','H01','H08',{firstTrapBlock:4,initialMaxHpPenalty:8}),
 hehuan_dancer:vow('hehuan_dancer','hehuan','移席换影','每回合第3张牌结算后抽1张并获得2护盾；起手一张流纱换为幻席。','每场首回合少1灵力。','H02','H06',{thirdCardDraw:1,thirdCardBlock:2,startEnergyPenalty:1}),
 mechanist_guard:vow('mechanist_guard','mechanist','护人先行','每回合首次获得本体护盾时额外加3；起手一张牵丝换为展匣。','每场首回合少1灵力。','J01','J09',{firstGuardBonus:3,startEnergyPenalty:1}),
 mechanist_overload:vow('mechanist_overload','mechanist','余火归匣','每回合首次成功过载后抽1张，并修复该机体2耐久；起手一张护阵换为探机。','本局最大生命与当前生命各减少8；过载仍正常退场和冷却。','J02','J05',{firstOverloadDraw:1,firstOverloadRepair:2,initialMaxHpPenalty:8}),
 sovereign_tide:vow('sovereign_tide','sovereign','归潮有声','每回合首次实际消耗魂息后抽1张；起手一张夜幕换为回响。','本局最大生命与当前生命各减少8。','F02','F03',{firstSoulSpendDraw:1,initialMaxHpPenalty:8}),
 sovereign_shelter:vow('sovereign_shelter','sovereign','月下留门','每回合首张攻击结算后额外获得1魂息；第3张牌结算后获得4护盾；起手一张摄魂换为魂衣。','每场首回合少1灵力。','F01','F07',{firstAttackSoul:1,thirdCardBlock:4,startEnergyPenalty:1})
});
// Rules accumulate; their conditions change turn sequencing, not enemy HP multipliers.
const CHALLENGES=freeze([
 {id:0,level:0,key:'base',name:'初行',text:'没有额外契约规则。',rules:{}},
 {id:1,level:1,key:'nightwatch',name:'夜巡',text:'继承初行。结束玩家回合时，每点未用灵力使敌人获得2护盾，每回合最多6。',rules:{unusedEnergyEnemyBlock:2,unusedEnergyEnemyBlockCap:6}},
 {id:2,level:2,key:'deep',name:'深契',text:'继承夜巡。每个玩家回合第3张牌结算后，仍存活的敌人获得4护盾，每回合一次。',rules:{unusedEnergyEnemyBlock:2,unusedEnergyEnemyBlockCap:6,thirdCardEnemyBlock:4}},
 {id:3,level:3,key:'calamity',name:'劫夜',text:'继承深契。每个玩家回合开始时，仍存活的敌人额外获得3护盾。',rules:{unusedEnergyEnemyBlock:2,unusedEnergyEnemyBlockCap:6,thirdCardEnemyBlock:4,turnStartEnemyBlock:3}}
]);
const TIERS=freeze({common:{id:'common',name:'寻常',color:'#bcc8ce'},rare:{id:'rare',name:'奇珍',color:'#72c9f0'},legendary:{id:'legendary',name:'传说',color:'#e8b65b'},treasure:{id:'treasure',name:'秘宝',color:'#d2a1ff'}});
function weapon(id,name,role,family,tier,icon,motif,label,procText,base={},effects={}){
 const stats={bonus:0,block:0,openingDraw:0,openingDrive:0,openingSoul:0,...base};
 return {id,kind:'weapon',name,role,family,tier,color:TIERS[tier].color,icon,motif,label,text:procText,procText,...stats,openingBlock:stats.block,effects,limits:{perTurn:1},echoEligible:tier!=='common',echoText:tier==='common'?'随身初始武器可收藏，不作为回响。':'回响只在前三场战斗生效，真品不受回响次数限制。'};
}
const WEAPON_SIGNATURES=freeze({
 training:weapon('training','行旅练习剑','sword','sword','common','剑','blade','行旅剑锋','基础剑器，无额外数值。'),
 rime:weapon('rime','听雪','sword','sword','rare','霜','frost','雪线凝锋','每回合首张攻击第一段伤害+2，结算后额外施加1霜寒。',{bonus:2},{firstAttackChill:1}),
 spirit:weapon('spirit','回灯','sword','sword','rare','灯','lantern','回灯护身','每场开战获得3护盾；每回合首次实际获得本体护盾时额外加2。',{block:3},{firstGuardBonus:2}),
 divine:weapon('divine','照夜','sword','sword','legendary','月','moonblade','照夜断契','每回合首张攻击第一段伤害+2，但攻击前失去1生命，可致命；每回合第3张牌结算后抽1张。低阶强持仍有反噬。',{bonus:2},{thirdCardDraw:1,firstAttackSelfLoss:1}),
 cat_claws:weapon('cat_claws','铃纹爪刃','assassin','claw','common','爪','claw','铃纹短爪','基础爪刃，无额外数值。'),
 shadow_fang:weapon('shadow_fang','潜影双牙','assassin','claw','rare','影','shadowclaw','双牙留印','每回合首张攻击第一段伤害+2，结算后额外施加1猎印。',{bonus:2},{firstAttackMark:1}),
 bell_reaper:weapon('bell_reaper','解契金铃爪','assassin','claw','legendary','铃','bellclaw','三响回锋','每回合首张攻击第一段伤害+1；第3张牌结算后额外抽1张，每回合一次。',{bonus:1},{thirdCardDraw:1}),
 silk_fan:weapon('silk_fan','绡骨行扇','hehuan','fan','common','扇','silkfan','行纱扇骨','基础折扇，无额外数值。'),
 listening_fan:weapon('listening_fan','听雨折扇','hehuan','fan','rare','雨','rainfan','听雨落纱','每场开战获得3护盾；每回合首次成功放入藏招后获得2护盾。',{block:3},{firstTrapBlock:2}),
 oath_fan:weapon('oath_fan','断账绯扇','hehuan','fan','legendary','绯','oathfan','绯扇换席','每回合首张攻击第一段伤害+2；第3张牌结算后获得3护盾，每回合一次。',{bonus:2},{thirdCardBlock:3}),
 work_spool:weapon('work_spool','百工线轴','mechanist','spool','common','线','thread','百工牵丝','基础操具，无额外数值。'),
 copper_caliper:weapon('copper_caliper','同心铜尺','mechanist','spool','rare','尺','compass','同心定距','每场开战额外获得1驱动；每回合首次造成伤害的机体指令首段伤害+2。',{openingDrive:1},{firstCommandBonus:2}),
 rescue_hub:weapon('rescue_hub','归队枢轮','mechanist','spool','legendary','枢','gear','余火回轮','每回合首次成功过载结算后抽1张，并修复该机体3耐久；不取消退场和冷却。',{}, {firstOverloadDraw:1,firstOverloadRepair:3}),
 moon_seal:weapon('moon_seal','缺月魂印','sovereign','seal','common','印','crescent','缺月魂纹','基础魂印，无额外数值。'),
 echo_jade:weapon('echo_jade','归声玉契','sovereign','seal','rare','契','echo','归声回环','每场开战获得1魂息和3护盾；每回合首次实际消耗魂息后抽1张。',{openingSoul:1,block:3},{firstSoulSpendDraw:1}),
 sovereign_sigil:weapon('sovereign_sigil','无相月玺','sovereign','seal','legendary','冕','crown','月玺收魂','每回合首张攻击第一段伤害+2，结算后额外获得1魂息；魂息仍最多6。',{bonus:2},{firstAttackSoul:1})
});
function relic(id,name,icon,motif,label,tier='rare',extra={}){return {id,kind:'relic',name,role:null,family:tier==='treasure'?'treasure':'relic',tier,color:TIERS[tier].color,icon,motif,label,echoEligible:true,...extra};}
const initialRelic=(role)=>({role,echoEligible:false,echoText:'随身初始遗物可收藏，不作为回响。'});
const RELIC_PRESENTATION=freeze({
 frostseal:relic('frostseal','霜魄剑穗','霜','frost','凝霜生意','rare',initialRelic('sword')),
 bell:relic('bell','金铃','铃','bell','猎印护身','rare',initialRelic('assassin')),
 jade:relic('jade','磨爪玉','玉','jade','三式回灵'),
 moon:relic('moon','残月坠','月','moon','开幕见机'),
 fox:relic('fox','狐契','狐','fox','续灯护命','legendary',{echoEligible:false,echoText:'只能当局完成续灯长约领取；永久收藏仅保存图鉴。'}),
 fang:relic('fang','夜牙簪','牙','claw','夜牙首击'),
 silk:relic('silk','鲛绡带','绡','silk','护盾织绡'),
 vial:relic('vial','回春露','露','vial','战后回春'),
 bloodstone:relic('bloodstone','朱砂心','心','blood','血契回响'),
 moonheart:relic('moonheart','月髓','髓','moon','月髓流灵','treasure'),
 mirror:relic('mirror','照魂镜','镜','mirror','镜中首锋','treasure'),
 dream:relic('dream','梦匣','匣','dream','梦启先机','treasure'),
 godblood:relic('godblood','无面神血','血','blood','无面余温','treasure',{echoText:'携带回响时仅在前三场开战获得4护盾；当局获得真品仍增加12最大生命并恢复12生命。',echoEffects:{openingBlock:4}}),
 ninelives:relic('ninelives','九命铃','命','bell','九命续灯','legendary',{echoEligible:false,echoText:'只能当局完成续灯长约领取；永久收藏仅保存图鉴。'}),
 veil:relic('veil','无相夜纱','纱','veil','首锋归魂','rare',initialRelic('sovereign')),
 heartmirror:relic('heartmirror','照心镜','心','heart','薄纱照心','rare',initialRelic('hehuan')),
 concentric_spool:relic('concentric_spool','同心线轴','线','gear','同心首发','rare',initialRelic('mechanist'))
});
const ECHO_RULES=freeze({slots:1,battles:3,warmupRealms:1,text:'每次带入一件武器或遗物回响，最多持续前三场战斗。用尽后，须在另一次未放弃的旅途中走完首境温养；新获得的真品在当局持续生效。'});
function oathsFor(role){return Object.values(OATHS).filter(entry=>entry.role===role);}
function entry(table,id){return typeof id==='string'&&Object.prototype.hasOwnProperty.call(table,id)?table[id]:null;}
function oath(id,role){const item=entry(OATHS,typeof id==='object'&&id?id.id:id);return item&&(!role||item.role===role)?item:null;}
function mode(id){return entry(MODES,id)||MODES.short;}
function challenge(level){const n=Number(level);return CHALLENGES[Number.isInteger(n)&&n>=0&&n<=3?n:0];}
function challengeRules(level){return challenge(level).rules;}
function weaponSignature(id){return entry(WEAPON_SIGNATURES,id);}
function relicPresentation(id,base={}){const found=entry(RELIC_PRESENTATION,id);if(!found&&!base?.name)return null;const view=found||relic(id,base.name,'宝','relic','珍藏回响'),text=base.text||view.text||view.label;return {...view,name:base.name||view.name,text,procText:text,echoText:view.echoText||'回响只在前三场战斗生效，真品不受回响次数限制。'};}
function getSignature(id,kind='weapon',base){return kind==='relic'?relicPresentation(id,base):weaponSignature(id);}
function applyStarterSwap(cards,id,role){const selected=oath(id,role),copy=(cards||[]).map(card=>typeof card==='string'?card:{...card});if(!selected)return copy;for(const swap of selected.starterSwap){for(let n=0;n<swap.count;n++){const index=copy.findIndex(card=>(typeof card==='string'?card:card.id)===swap.from);if(index<0)break;copy[index]=typeof copy[index]==='string'?swap.to:{...copy[index],id:swap.to};}}return copy;}
function dailySeed(date){const day=date instanceof Date?date.toISOString().slice(0,10):String(date||'').slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||Number.isNaN(Date.parse(day+'T00:00:00Z'))||new Date(day+'T00:00:00Z').toISOString().slice(0,10)!==day)throw new Error('dailySeed requires a valid UTC calendar date');return day;}
function safeId(value){return typeof value==='string'&&/^[a-z][a-z0-9_-]{0,63}$/.test(value)?value:null;}
function normalizeConfig(input={},role){const value=input&&typeof input==='object'?input:{};const chosen=oath(value.oath,role);let echo=null;const raw=value.echo;if(raw&&typeof raw==='object'){const kind=raw.kind||raw.type,id=safeId(raw.id),item=kind==='weapon'?weaponSignature(id):kind==='relic'?entry(RELIC_PRESENTATION,id):null;if(item&&item.echoEligible&&(!role||!item.role||item.role===role))echo={kind,id};}
 return {mode:mode(value.mode).id,seed:typeof value.seed==='string'?value.seed.trim().slice(0,80):Number.isFinite(value.seed)?String(value.seed):'',challenge:challenge(value.challenge).level,oath:chosen?.id||null,echo,cosmetic:value.cosmetic==='original'?null:safeId(value.cosmetic),finale:value.finale==='abyss'?'abyss':'fate'};
}
const api={VERSION,ROLES,MODES,EFFECTS,OATHS,CONTRACTS:OATHS,CHALLENGES,TIERS,WEAPON_SIGNATURES,RELIC_PRESENTATION,ECHO_RULES,oathsFor,contractsFor:oathsFor,oath,mode,challenge,challengeRules,weaponSignature,relicPresentation,getSignature,applyStarterSwap,dailySeed,normalizeConfig};
root.NightReplayRules=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis==='object'?globalThis:this);
