#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const N=require('./engine.js'),T=require('./tales.js'),B=require('./boss-quests.js'),F=require('./enemy-factions.js'),E=require('./expansion.js'),S=require('./seven.js');
const BEFORE=require('./events-before-p2.json');
const root=path.resolve(__dirname,'..'),out=path.join(root,'recovery','events-md-export');
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});
const clean=s=>String(s??'').replace(/[\\/:*?"<>|]/g,'_').replace(/\s+/g,' ').trim();
function mdValue(v,depth=0){if(v===undefined||v===null)return '';if(typeof v!=='object')return String(v);if(Array.isArray(v))return v.map((x,i)=>`${'  '.repeat(depth)}- ${typeof x==='object'?'\n'+mdValue(x,depth+1):mdValue(x)}`).join('\n');return Object.entries(v).map(([k,x])=>`${'  '.repeat(depth)}- **${k}**：${typeof x==='object'?'\n'+mdValue(x,depth+1):mdValue(x)}`).join('\n');}
function state(){return {character:'sword',floor:1,journey:{regionIndex:0,tales:{chains:{},flags:{}},bossQuests:{records:{}},factions:{records:{},invalid:{},spent:{},behaviors:[],forfeited:{},seen:{}}},player:{questItems:[],gold:100,hp:60,maxHp:60,inventory:{herb:2},path:{}}};}
function exactTale(id){const m=T.META[id];if(!m)return null;const s=state();s.journey.tales.chains[m.chain]={stage:m.step-1,choices:[],floors:[1,2,3],lastOutcome:''};s.floor=99;return T.build(id,s);}
function exactBoss(id){const m=B.META[id];if(!m)return id==='boss_lotus_awake'?B.awakening(state()):null;const s=state();s.journey.bossQuests.records[m.boss]={stage:m.step-1,region:0,choices:{},lastOutcome:'',awakened:false};s.floor=99;return B.build(id,s);}
function exactFaction(id){const m=/^faction_(.+)_(source|cave)$/.exec(id);if(!m)return null;const s=state();return F.build(m[1],m[2],s,'export-'+id);}

function generated(id,role='sword',setup=()=>{}){
 const g=N.createGame({rng:()=>.43,environment:false,profile:{version:1,unlocks:['feiye']}});
 g.newRun(role==='assassin'?'mark':role);g.enterRegion();const st=g.state,n=st.map[0][0];n.type='event';n.storyId=id;st.availableNodes=[n.id];
 if(E.BLOOD_EVENTS?.[id])st.journey.flags.bloodChapter=['blood_lesson','blood_debt','blood_choice'].indexOf(id);
 if(id==='campfire_hunt'){delete n.storyId;n.type='rest';st.player.path.fallen=true;st.journey.tales.hunts=0;st.journey.tales.lastHuntFloor=-99;}
 if(id==='road_aftermath'){delete n.storyId;n.type='fight';st.journey.tales.nextRoadAt=0;st.journey.tales.roadVisits=0;}
 setup(st);g.enterNode(n.id);if(!st.event||st.event.id!==id)throw Error('Identity mismatch '+id+' -> '+st.event?.id);return st.event;
}
function snapshots(id){
 const rows=[],roles=['campfire_hunt','blood_lesson','blood_debt','blood_choice'].includes(id)?['sword']:['assassin','sword','sovereign'];
 for(const role of roles){const tm=T.META[id],bm=B.META[id],fm=/^faction_(.+)_(source|cave)$/.exec(id);
 const add=(label,e,input={})=>{if(!e||e.id!==id)throw Error('Snapshot mismatch '+id);N.rewriteEvent(e,{...state(),...input,character:role});rows.push({role,label,input,event:e});};
 if(tm){let histories=[{}];const chain=T.CHAINS[tm.chain];for(let step=1;step<tm.step;step++)histories=histories.flatMap(choices=>chain.stages[step-1]({role,p:n=>choices[n]?.key}).choices.map(c=>({...choices,[step]:{key:c.key}})));
 for(const[i,choices]of histories.entries()){const st=state();st.character=role;st.floor=99;st.journey.tales.chains[tm.chain]={stage:tm.step-1,choices,floors:[1,2,3]};add('history-'+i,T.build(id,st),{choices});}}
 else if(bm||id==='boss_lotus_awake'){const st=state();st.character=role;if(bm)st.journey.bossQuests.records[bm.boss]={stage:bm.step-1,region:0,choices:{},lastOutcome:''};add('default',bm?B.build(id,st):B.awakening(st));}
 else if(fm){const boss=fm[1],kind=fm[2],group=F.GROUPS[boss];
 for(const label of ['entry','neutral','support','oppose','both','invalid','spent','hostility','investigate','ended','poor','entry-support','entry-both','entry-hostility']){
 const st=state();st.character=role;const f=st.journey.factions,node='review-'+id;f.records[node]={boss,kind,mode:label.startsWith('entry')?'approach':'inside',resolved:false,known:[]};
 if(['support','both','invalid','spent','entry-support','entry-both'].includes(label))st.player.questItems.push(group.support);
 if(['oppose','both','entry-both'].includes(label))st.player.questItems.push(group.oppose);
 if(label==='invalid')f.invalid[group.support]=true;if(label==='spent')f.spent[group.support]=true;
 if(['hostility','entry-hostility'].includes(label))f.behaviors.push({npc:group.npc,kind:'attacked'});if(label==='investigate')f.behaviors.push({npc:group.npc,kind:'investigate'});
 if(label==='ended')st.journey.bossQuests.records[boss]={concluded:true,stage:3};if(label==='poor'){st.player.gold=0;st.player.inventory.herb=0;}
 const hostile=kind==='cave'&&!label.startsWith('entry')&&label!=='ended'&&(label==='hostility'||(st.player.questItems.includes(group.support)&&!f.invalid[group.support]));
 add(label,hostile?{id,name:group.cave,story:['实际进入洞府会直接交战，玩家先手；无和平选项。'],choices:[],transition:{enemyId:group.npc,kind:'elite',phase:'player'}}:F.build(boss,kind,st,node),st);
 }}
 else {add('default',generated(id,role));
 if(E.BLOOD_EVENTS?.[id])for(const method of ['sacrifice','drain','refuse','leave'])for(const fallen of [false,true])add('method-'+method+'-fallen-'+fallen,generated(id,role,st=>{st.journey.flags.bloodMethod=method;st.player.path.fallen=fallen;}),{method,fallen});
 if(id==='campfire_hunt')add('witnessed-aid',generated(id,role,st=>{st.journey.tales.chains.medicine={stage:2,choices:{2:{key:'testify'}},floors:[1,2,3]};}),{witness:'medicine:testify'});
if(id==='road_aftermath')for(const aid of [true,false])add('return-aided-'+aid,generated(id,role,st=>{st.journey.tales.roadVisits=1;st.journey.tales.roadAid=aid;}),{aid});}
 }return rows;
}
function renderSnapshot(x){const e=x.event;return '### '+x.role+' / '+x.label+'\n\n'+[...new Set([...(e.story||[]),e.description].filter(Boolean))].join('\n\n')+'\n\n'+(e.connection||'')+'\n\n'+(e.transition?'战斗跳转：'+JSON.stringify(e.transition)+'\n\n':'')+(e.choices||[]).map((c,i)=>'#### '+(i+1)+'. '+c.label+'\n\n'+(c.text||'')+'\n\n结果：'+(c.outcome||'按规则字段结算')+'\n\n规则：'+JSON.stringify(Object.fromEntries(Object.entries(c).filter(([k])=>!['label','text','outcome','riskSummary'].includes(k))))).join('\n\n');}

function sourceFile(id){return T.META[id]||T.INTERRUPT_IDS?.includes(id)?'dev/tales.js':B.META[id]||id==='boss_lotus_awake'?'dev/boss-quests.js':id.startsWith('faction_')?'dev/enemy-factions.js':S.EVENTS[id]?'dev/seven.js':E.BLOOD_EVENTS?.[id]?'dev/expansion.js':'dev/engine.js';}
function event(id){return exactTale(id)||exactBoss(id)||exactFaction(id)||generated(id);}
function folder(id){if(/^tale_/.test(id))return path.join('02_十套人间故事',id.split('_')[1]);if(/^boss_/.test(id))return path.join('03_Boss旧事',(B.META[id]?.boss||'lotus_boss'));if(/^faction_/.test(id))return path.join('04_阵营洞府',id.replace(/^faction_/,'').replace(/_(source|cave)$/,'')||'other');if(/^blood_|^demonic_|^fallen_/.test(id))return '05_剑修禁术与异变';if(/^campfire_|^road_/.test(id))return '06_途中突发';if(E.EVENT_IDS?.includes(id))return '01_扩展事件';if(S.EVENTS?.[id])return '01_七境事件';return '00_基础与固定事件';}
const ids=[...new Set(N.EVENT_IDS)];
const manifest=[];
for(const id of ids){const e=N.rewriteEvent(event(id),state())||{id,name:id,story:['未找到可直接渲染的事件定义。'],choices:[]};if(e.id!==id)throw Error('Wrong ID '+id);const dir=path.join(out,folder(id));fs.mkdirSync(dir,{recursive:true});const name=clean(e.name||id);const file=`${id}__${name}.md`;const rel=path.join(folder(id),file);const body=`# ${e.name||id}\n\n- 事件 ID：\`${id}\`\n- 规则来源：${sourceFile(id)}；呈现改写：dev/event-editorial.js\n- 角色／历史前提：自然调度保持源模块条件；每个显式输入见本文件快照和同名 snapshots.json。\n- 导出来源：${e.id&&e.id!==id?`运行时生成（节点请求 ${e.id}）`:'当前规则数据'}\n\n## 背景与叙事\n\n${(e.story?.length?e.story:e.description?[e.description]:['（该事件没有单独的背景段落。）']).map(x=>String(x)).join('\n\n')}\n\n${e.connection?`## 前置／后续回应\n\n${e.connection}\n\n`:''}## 选项\n\n${(e.choices||[]).map((c,i)=>`### ${i+1}. ${c.label||c.key||'未命名选项'}\n\n${c.text||''}${c.riskSummary?'\n\n**点击前已知代价：** '+c.riskSummary:''}\n\n**结果：** ${c.outcome||'未单独记录。'}${Object.entries(c).filter(([k])=>!['label','key','text','outcome','riskSummary'].includes(k)).length?`\n\n**规则字段：**\n\n${mdValue(Object.fromEntries(Object.entries(c).filter(([k])=>!['label','key','text','outcome','riskSummary'].includes(k))))}`:''}`).join('\n\n')}\n\n## 机器可读字段摘录\n\n${mdValue({id:e.id||id,name:e.name,type:e.type,glyph:e.glyph,kicker:e.kicker,tale:e.tale,bossQuest:e.bossQuest,factionEvent:e.factionEvent})}\n`;
const variants=snapshots(id);const before=BEFORE[id];const comparison='\n\n## 本轮改造核对\n\n状态：'+N.EDITORIAL.review(id).status+'。'+N.EDITORIAL.review(id).reason+'\n\n### 改造前正文\n\n'+(before?.story||[before?.description||'']).join('\n\n')+'\n\n### 改造前选项与结果\n\n'+(before?.choices||[]).map(c=>'**'+c.label+'**\n\n'+(c.text||'')+'\n\n结果：'+(c.outcome||'')).join('\n\n');fs.writeFileSync(path.join(out,rel),body+comparison+'\n\n## 显式状态审阅快照\n\n'+variants.map(renderSnapshot).join('\n\n'));fs.writeFileSync(path.join(out,rel.replace(/\.md$/,'.snapshots.json')),JSON.stringify(variants,null,2));manifest.push({id,file:rel,name:e.name||id,identityMatched:true,snapshots:variants.length,editorialStatus:N.EDITORIAL.review(id).status,reviewReason:N.EDITORIAL.review(id).reason});}
const readme=`# 百妖夜契事件审阅包\n\n审阅包版本：v3（逐事件白话改造、新旧对照与显式状态）\n\n导出时间：2026-10-24（Asia/Shanghai）\n\n本包从当前 Git 工作区规则数据导出，共 **${manifest.length} 个事件文件**。每个具体事件一个 Markdown 文件；同一事件链放在同一目录。\n\n目录：\n\n- 00_基础与固定事件：基础事件与固定遭遇\n- 01_扩展事件、01_七境事件：扩展和七境事件\n- 02_十套人间故事：每套人间故事各自一个子目录\n- 03_Boss旧事：Boss 三段旧事与机仆唤醒\n- 04_阵营洞府：每组阵营的来源／洞府事件\n- 05_剑修禁术与异变：剑修禁术线\n- 06_途中突发：途中突发事件\n\n事件文件保留背景、选项、结果、代价、奖励及前置／后续字段。事件内容来自当前源码；没有擅自补写未存在的剧情。\n`;
fs.writeFileSync(path.join(out,'README.md'),readme);fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({count:manifest.length,events:manifest},null,2)+'\n');
fs.writeFileSync(path.join(out,'审阅范围.md'),'# 批次0：身份与状态核对\n\n修复四项正文误导出；158项默认ID匹配。包含三角色、十故事历史组合、洞内外、双凭证、无效、用尽、旧仇、善后、缺资源显式fixture。快照不是自然游玩证据。\n\n本版含逐事件编辑结论、新旧对照、调查与连续战分支。自动测试与路径探针见代码和报告；真机与真人理解度结果尚未取得，不视为通过。\n');fs.writeFileSync(path.join(root,'dev/event-review-results.json'),JSON.stringify({count:manifest.length,snapshots:manifest.reduce((a,e)=>a+e.snapshots,0),allIdentitiesMatched:true,inputs:Object.fromEntries(['dev/engine.js','dev/enemy-factions.js','dev/tales.js','dev/boss-quests.js','dev/expansion.js','dev/seven.js','dev/export-events-md.cjs','dev/event-editorial.js','dev/events-before-p2.json'].map(p=>[p,require('crypto').createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex')])),events:manifest},null,2));
for(const name of ['EVENT_REWORK_STATUS.md','P2_EVENT_REWORK_PLAN.md','P2_HUMAN_REVIEW.md','P2_EXPEDITION_REVIEW.md']){const source=path.join(root,'docs',name);if(fs.existsSync(source))fs.copyFileSync(source,path.join(out,name));}
const zip=path.join(root,'recovery','events-md-export.zip');fs.rmSync(zip,{force:true});
cp.execFileSync('zip',['-qr','-X',zip,'.'],{cwd:out});
console.log(JSON.stringify({directory:out,zip,events:manifest.length,bytes:fs.statSync(zip).size},null,2));
