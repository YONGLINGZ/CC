'use strict';
// Deterministic lifecycle regressions. DOM/Canvas/Image/RAF are test doubles;
// these tests make no claim about browser rendering, frame rate, or Android.
const test=require('node:test'),A=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function runtime(){
 let id=0,now=0;const frames=new Map(),timers=new Map(),images=[],elements=[];
 const rgba=new Uint8ClampedArray(72*72*4);for(let i=0;i<rgba.length;i+=4){rgba[i]=80;rgba[i+1]=120;rgba[i+3]=255;}
 const ctx={drawImage(){},clearRect(){},save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},clip(){},transform(){},getImageData(){return {data:rgba,width:72,height:72};}};
 const document={hidden:false,readyState:'complete',body:{dataset:{motion:'full'}},addEventListener(){},createElement(){return {width:0,height:0,setAttribute(){},addEventListener(){},getContext(t){return t==='2d'?ctx:null;},remove(){this.removed=true;}};},querySelector(selector){const key=selector.match(/data-encounter-id="([^"]+)"/)?.[1];return elements.find(e=>e.isConnected&&e.dataset.encounterType==='enemy'&&e.dataset.encounterId===key)||null;}};
 class Image{constructor(){this.complete=false;images.push(this);}set src(v){this.value=v;}resolve(ok=true){this.complete=true;this.naturalWidth=ok?2048:0;this.naturalHeight=ok?1536:0;if(ok)this.onload?.();else this.onerror?.();}}
 const root={document,Image,performance:{now:()=>now},setTimeout:f=>{timers.set(++id,f);return id;},clearTimeout:i=>timers.delete(i),requestAnimationFrame:f=>{frames.set(++id,f);return id;},cancelAnimationFrame:i=>frames.delete(i),matchMedia:()=>({matches:false}),NightAssets:{actors:{sword:'sword.webp'},actorAppearances:{'sword-moon':{src:'moon.png',columns:8,rows:6},'sword_fallen-moon':{src:'fallen-moon.png',columns:8,rows:6}},enemyActors:{gate_boss:'gate.webp'},bossActors:{gate_boss:'gate-special.webp'},machineActors:{chengshan:'chengshan.webp',mingdi:'mingdi.webp'}},NightBossMoves:{get:(id,name)=>id==='gate_boss'&&name==='横灯'?{name,row:0}:null}};root.globalThis=root;
 for(const f of ['sprite-motion.js','actors.js','encounter-actors.js'])vm.runInNewContext(fs.readFileSync(__dirname+'/'+f,'utf8'),root);
 const element=(key,group='actorAppearances')=>{const e={dataset:{spriteKey:key,spriteGroup:group,...(group==='actorAppearances'?{actorKind:'sword',actorAppearance:key}:{encounterId:key,encounterType:group==='machineActors'?'machine':'enemy'})},style:{},isConnected:true,children:[],appendChild(c){this.children.push(c);},closest(){return null;}};elements.push(e);return e;};
 const actor=e=>({dataset:{},querySelector:()=>e});
 return {root,element,actor,images,elements,timers,M:root.NightSpriteMotion,async decode(src,ok=true){const i=images.find(i=>i.value===src&&!i.complete);A.ok(i,'image requested: '+src);i.resolve(ok);for(let n=0;n<5;n++)await Promise.resolve();},async flush(){for(let i=0;i<5;i++)await Promise.resolve();},advance(ms){now+=ms;const callbacks=[...frames.values()];frames.clear();for(const f of callbacks)f(now);}};
}
test('late boss preload does not enqueue work after that enemy has left',async()=>{
 const r=runtime(),e=r.element('gate_boss','enemyActors');r.M.mount(e);await r.decode('gate.webp');
 const ready=r.root.NightEncounterActors.readyBoss('gate_boss');
 e.isConnected=false;e._spriteMotion.dispose();A.equal(r.M.stats().pending,0);
 await r.decode('gate-special.webp');await ready;
 A.equal(r.M.stats().instances,0);A.equal(r.M.stats().pending,0,'obsolete preload restarted analysis after disposal');
});
test('failed boss action releases acting metadata while keeping its base appearance',async()=>{
 const r=runtime(),e=r.element('gate_boss','enemyActors'),a=r.actor(e);r.M.mount(e);await r.decode('gate.webp');a.dataset.bossIntent='横灯';
 r.root.NightEncounterActors.play(a,'attack','full','impact');await r.decode('gate-special.webp',false);
 A.equal(e.dataset.spriteStatus,'ready');A.equal(e._spriteMotion.base.d.src,'gate.webp');
 A.equal(e.dataset.acting,undefined,'failed secondary atlas left acting=true');A.equal(e.dataset.bossMove,undefined);A.equal(e.dataset.frameAction,'idle');
});
test('a current boss still prewarms its named atlas',async()=>{
 const r=runtime(),e=r.element('gate_boss','enemyActors');r.M.mount(e);await r.decode('gate.webp');const ready=r.root.NightEncounterActors.readyBoss('gate_boss');await r.decode('gate-special.webp');A.equal(await ready,true);A.ok(r.M.stats().pending>=4);
});
test('late previous action load cannot replace a newer action',async()=>{
 const r=runtime(),e=r.element('sword-moon'),m=r.M.mount(e);await r.decode('moon.png');
 r.M.play(e,{src:'late-special.webp',columns:4,rows:4},{row:2,action:'attack'});
 r.M.play(e,{src:'moon.png',columns:8,rows:6},{row:5,action:'hurt'});await r.decode('late-special.webp');
 A.equal(m.state.row,5);A.equal(m.state.asset.d.src,'moon.png');
});
test('costume to fallen replacement ignores a late decode of the removed costume',async()=>{
 const r=runtime(),normal=r.element('sword-moon');r.M.mount(normal);normal.isConnected=false;normal._spriteMotion.dispose();
 const fallen=r.element('sword_fallen-moon'),m=r.M.mount(fallen);await r.decode('fallen-moon.png');await r.decode('moon.png');
 A.equal(r.M.stats().instances,1);A.equal(m.base.d.src,'fallen-moon.png');A.equal(normal.dataset.spriteReady,undefined);A.equal(fallen.dataset.spriteReady,'true');
});
test('32 rapid enemy replacements stay bounded and final disposal cancels pending work',async()=>{
 const r=runtime();let last;
 for(let i=0;i<32;i++){if(last){last.isConnected=false;last._spriteMotion.dispose();}const key='test'+i;r.root.NightAssets.enemyActors[key]=key+'.webp';last=r.element(key,'enemyActors');r.M.mount(last);await r.decode(key+'.webp');r.root.NightEncounterActors.play(r.actor(last),'attack','full');A.ok(r.M.stats().assets<=10);A.ok(r.M.stats().pairs<=180);A.ok(r.M.stats().pending<=180);}
 last.isConnected=false;last._spriteMotion.dispose();A.equal(r.M.stats().instances,0);A.equal(r.M.stats().pending,0);
});
test('recalling one of two machines preserves the other and releases obsolete jobs',async()=>{
 const r=runtime(),a=r.element('chengshan','machineActors'),b=r.element('mingdi','machineActors');r.M.mount(a);r.M.mount(b);await r.decode('chengshan.webp');await r.decode('mingdi.webp');
 r.root.NightEncounterActors.play(r.actor(a),'attack','full');r.root.NightEncounterActors.play(r.actor(b),'skill','full');
 a.isConnected=false;a._spriteMotion.dispose();A.equal(r.M.stats().instances,1);A.equal(b._spriteMotion.state.row,2);A.equal(b._spriteMotion.asset.d.src,'mingdi.webp');A.ok(r.M.stats().pending>0);
 b.isConnected=false;b._spriteMotion.dispose();A.equal(r.M.stats().pending,0);
});
test('prepare/impact/recovery cycles remain finite across repeated actions',async()=>{
 const r=runtime(),e=r.element('sword-moon'),m=r.M.mount(e);await r.decode('moon.png');
 for(let i=0;i<6;i++){r.root.NightActors.play(r.actor(e),'attack','full','prepare');for(let j=0;j<14;j++)r.advance(16);A.equal(m.state.kind,'hold');A.equal(m.state.position,2);r.root.NightActors.play(r.actor(e),'attack','full','impact');A.equal(m.state.start,2);for(let j=0;j<40;j++)r.advance(16);A.equal(m.state,null);A.equal(e.dataset.acting,undefined);A.equal(e.dataset.actorAction,'idle');}
});
