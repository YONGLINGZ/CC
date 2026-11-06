'use strict';
const test=require('node:test'),A=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/gear-visuals.js','utf8');
function fixture(defs,preferredReduced=false){
 const nodes=[],timers=new Map();let serial=0;
 const stage={dataset:{},getBoundingClientRect:()=>({left:10,top:20,width:300,height:180}),querySelector(selector){return selector.includes('data-combatant="player"')?{getBoundingClientRect:()=>({left:-100,top:30,bottom:260,width:110,height:170})}:selector.includes('data-combatant="enemy"')?{getBoundingClientRect:()=>({left:290,top:40,bottom:190,width:140,height:150})}:null;},append(el){nodes.push(el);el.isConnected=true;}};
 const doc={querySelector:()=>stage,createElement(){return {dataset:{},style:{},animations:[],setAttribute(){},getAnimations(){return this.animations},animate(frames,options){const a={frames,options,cancel(){this.cancelled=true;}};this.animations.push(a);return a;},remove(){this.isConnected=false;const i=nodes.indexOf(this);if(i>=0)nodes.splice(i,1);}};}};
 const rules={getSignature(id,kind){return defs[id]?.kind===kind?defs[id]:null;}};
 const context={module:{exports:{}},NightReplayRules:rules,document:doc,matchMedia:()=>({matches:preferredReduced}),setTimeout(fn){const id=++serial;timers.set(id,fn);return id;},clearTimeout(id){timers.delete(id);}};
 vm.runInNewContext(source,context);return {V:context.module.exports,nodes,timers,stage,context};
}
const specs={
 ice:Object.freeze({id:'ice',kind:'weapon',name:'听雪',role:'sword',family:'sword',motif:'frost',tier:'rare',label:'冰白霜纹'}),
 claw:Object.freeze({id:'claw',kind:'weapon',name:'潜影双牙',role:'assassin',family:'claw',motif:'shadowclaw',tier:'rare'}),
 fan:Object.freeze({id:'fan',kind:'weapon',name:'断账绯扇',role:'hehuan',family:'fan',motif:'oathfan',tier:'legendary'}),
 gear:Object.freeze({id:'gear',kind:'weapon',name:'归队枢轮',role:'mechanist',family:'spool',motif:'gear',tier:'legendary'}),
 moon:Object.freeze({id:'moon',kind:'weapon',name:'无相月玺',role:'sovereign',family:'seal',motif:'crown',tier:'legendary'}),
 blood:Object.freeze({id:'blood',kind:'relic',name:'无面神血',family:'treasure',motif:'blood',tier:'legendary'})
};
test('all 16 actual weapon signatures and 17 relic motifs have authored insignia',()=>{
 const rules=require('./replay-rules.js'),{V,context}=fixture({});context.NightReplayRules=rules;
 A.equal(Object.keys(rules.WEAPON_SIGNATURES).length,16);const shapes=new Set();
 for(const [id,p]of Object.entries(rules.WEAPON_SIGNATURES)){
  const html=V.badge(id);A.equal(V.signature(id).motif,p.motif,id);A.equal(V.signature(id).tier,p.tier,id);A.doesNotMatch(html,/undefined|NaN/,id);shapes.add(html.match(/<svg[\s\S]*<\/svg>/)[0]);
 }A.equal(shapes.size,16);
 A.equal(Object.keys(rules.RELIC_PRESENTATION).length,17);
 for(const [id,p]of Object.entries(rules.RELIC_PRESENTATION))A.equal(V.signature(id,'relic').motif,p.motif,id);
 for(const id of ['moonheart','mirror','dream','godblood'])A.match(V.badge(id,'relic'),/data-gear-tier="treasure"/,id);
 A.equal(V.signature('frostseal','relic').theme,'frost');A.equal(V.signature('heartmirror','relic').theme,'charm');A.equal(V.signature('concentric_spool','relic').theme,'machine');
});
test('equipment feedback keeps distinct profession shapes and uses no shared gold theme',()=>{
 const {V}=fixture(specs),shapes=new Set();
 for(const [id,theme]of [['ice','frost'],['claw','moon'],['fan','charm'],['gear','machine'],['moon','moon'],['blood','crimson']]){
  const kind=specs[id].kind,b=V.badge(id,kind);A.match(b,new RegExp(`data-gear-theme="${theme}"`));A.match(b,/<svg viewBox="0 0 64 64"/);shapes.add(b.match(/<svg[\s\S]*<\/svg>/)[0]);
 }
 A.equal(shapes.size,6);A.equal(V.badge('missing'),'');A.equal(V.badge('blood'),'');
});
test('badge metadata is escaped and unknown motifs cannot inject SVG or prototype values',()=>{
 const id='"><img src=x onerror=alert(1)>',name='A<&"\'B',defs={[id]:{kind:'weapon',name,label:'</span><script>bad()</script>',family:'__proto__',motif:'__proto__',tier:'" onmouseover="bad'}};
 const {V}=fixture(defs),html=V.badge(id);A.doesNotMatch(html,/<img|<script|onmouseover|\[object Object\]|undefined/);A.match(html,/A&lt;&amp;&quot;&#39;B/);A.match(html,/data-gear-motif="relic"/);A.match(html,/data-gear-tier="common"/);A.match(html,/&lt;script&gt;/);
});
test('full motion follows its real target; fallen sword is crimson without changing metadata',()=>{
 const {V,nodes,stage}=fixture(specs);stage.dataset.gearFallen='true';
 const el=V.play({type:'gearProc',gearId:'ice',gearKind:'weapon',target:'enemy'},'full');
 A.equal(el.dataset.gearTheme,'crimson');A.equal(el.dataset.receiver,'enemy');A.equal(el.style.left,'282px');A.equal(el.style.top,'156px');A.equal(el.animations.length,1);A.equal(specs.ice.motif,'frost');A.equal(V.signature('ice').theme,'frost');
 A.equal(V.play({type:'attack',gearId:'ice'}),null);A.equal(V.play({type:'gearProc',gearId:'ice',target:'missing'}),null);A.equal(V.play({type:'gearProc',gearId:'ice',target:'player"] script'}),null);A.equal(nodes.length,1);V.clear();A.equal(el.animations[0].cancelled,true);
});
test('reduced, fast, off and system preference show a static icon with no animation',()=>{
 for(const mode of ['reduced','fast','off']){
  const {V,timers}=fixture(specs),el=V.play({type:'echoStart',gearId:'blood',gearKind:'relic',target:'player'},mode);A.equal(el.dataset.motion,'still');A.equal(el.animations.length,0);A.equal(el.dataset.gearEvent,'echoStart');A.equal(el.style.left,'18px');A.equal(el.style.top,'162px');A.equal(timers.size,1);V.clear();A.equal(timers.size,0);
 }
 const {V}=fixture(specs,true);A.equal(V.play({type:'gearProc',gearId:'ice'},'full').animations.length,0);V.clear();
});
test('repeated triggers replace their own signal, cap other signals and cancel every timer',()=>{
 const {V,nodes,timers}=fixture(specs);
 for(let i=0;i<20;i++)V.play({type:'gearProc',gearId:'ice'},'full');A.equal(nodes.length,1);A.equal(timers.size,1);
 for(const id of ['claw','fan','gear','moon'])V.play({type:'gearProc',gearId:id},'full');A.equal(nodes.length,4);A.equal(timers.size,4);A.equal(nodes.some(n=>n.dataset.gearProc==='ice'),false);
 const visible=nodes.slice();V.clear();A.equal(nodes.length,0);A.equal(timers.size,0);A.ok(visible.every(n=>n.animations[0].cancelled));
});
test('expired and detached-stage nodes release callbacks and repeated cleanup is safe',()=>{
 const {V,nodes,timers}=fixture(specs);V.play({type:'gearProc',gearId:'ice'},'off');[...timers.values()][0]();A.equal(nodes.length,0);A.equal(timers.size,0);
 V.play({type:'gearProc',gearId:'ice'},'off');nodes[0].isConnected=false;V.decorate({querySelectorAll:()=>[]},{player:{equippedWeapon:'ice'}});A.equal(timers.size,0);A.equal(nodes.length,0);V.clear();V.clear();
});
