'use strict';
const test=require('node:test'),A=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const M=require('./sprite-motion.js');
function drawing(dx=0,dy=0,other=0){
 const width=72,height=72,data=new Uint8ClampedArray(width*height*4);
 for(let y=10;y<61;y++)for(let x=12;x<50;x++){
  // Asymmetric textured figure with a separately moving right-hand block.
  if((x<30&&y<48)||(x>=30&&y>=26&&y<40)){
   const xx=x+dx+(x>=30?other:0),yy=y+dy;if(xx<0||xx>=width||yy<0||yy>=height)continue;
   const i=(yy*width+xx)*4;data[i]=80+(x*17+y*3)%160;data[i+1]=100+(y*11+x*2)%140;data[i+2]=60+(x*3+y*7)%170;data[i+3]=255;
  }
 }
 return {data,width,height};
}
test('motion samples genuinely move a translated silhouette and recover inverse motion',()=>{
 const start=drawing(),end=drawing(7,-3),flow=M.estimatePair(start,end);
 const f=M.fieldSample(flow.forward,23/71,31/71),b=M.fieldSample(flow.backward,30/71,28/71);
 A.ok(Math.abs(f[0]*71-7)<2.8,JSON.stringify(f));A.ok(Math.abs(f[1]*71+3)<2.8,JSON.stringify(f));
 A.ok(Math.abs(b[0]*71+7)<2.8,JSON.stringify(b));A.ok(Math.abs(b[1]*71-3)<2.8,JSON.stringify(b));
 const p=M.warpPoint(flow.forward,23/71,31/71,.5);A.ok(p[0]>23/71+.025);A.ok(p[1]<31/71);
 for(const v of [...flow.forward.data,...flow.backward.data])A.ok(Number.isFinite(v)&&Math.abs(v)<=.32);
});
test('local movement field distinguishes a hand displacement from the torso',()=>{
 const flow=M.estimatePair(drawing(),drawing(0,0,8));
 const torso=M.fieldSample(flow.forward,20/71,20/71),hand=M.fieldSample(flow.forward,43/71,32/71);
 A.ok(Math.abs(torso[0]*71)<3,JSON.stringify(torso));A.ok(hand[0]*71>3,JSON.stringify(hand));A.ok(hand[0]-torso[0]>.03);
});
test('transparent RGB is removed before motion matching and never pollutes color estimates',()=>{
 const rgba=new Uint8ClampedArray([255,0,255,0,120,60,20,128]);
 const f=M.features(rgba,2,1,2);A.deepEqual(Array.from(f.data.slice(0,4)),[0,0,0,0]);
 A.ok(Math.abs(f.data[4]-120*128/255)<.001);A.ok(Math.abs(f.data[7]-128)<.001);
});
test('four/eight-column actions have a continuous prepare-impact boundary and 30 distinct display samples',()=>{
 for(const columns of [4,8]){
  const prep=M.phaseRange(columns,'prepare'),impact=M.phaseRange(columns,'impact');A.equal(prep[1],impact[0]);A.equal(impact[1],columns-1);
  const points=Array.from({length:31},(_,i)=>M.phaseSample(0,columns-1,i*1000/60,500));
  A.equal(new Set(points.map(n=>n.toFixed(5))).size,31);A.equal(points[0],0);A.equal(points.at(-1),columns-1);
 }
});
test('player appearance lookup honors atlas metadata and refuses a different outfit fallback',()=>{
 const previous=global.NightAssets;global.NightAssets={actors:{sword:'old.webp',cat:'cat.webp'},actorAppearances:{'sword-moon':{src:'moon.png',columns:8,rows:6},sword_fallen:{src:'fallen.png',columns:8,rows:6}}};
 const actors=require('./actors.js');
 A.equal(actors.source('sword','sword-moon').src,'moon.png');A.match(actors.markup('sword','sword-moon'),/800% 600%/);
 A.equal(actors.source('sword_fallen').src,'fallen.png');A.equal(actors.markup('sword','missing-outfit'),'');A.equal(actors.source('sword').columns,4);
 global.NightAssets=previous;
});
function runtime({tainted=false}={}){
 let id=0;const frames=[],timers=[];const rgba=drawing().data;
 function context(){return {drawImage(){},clearRect(){},save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},clip(){},transform(){},getImageData(){if(tainted)throw new Error('Canvas is not origin-clean');return {data:rgba,width:72,height:72};}};}
 const document={hidden:false,readyState:'complete',body:{dataset:{motion:'full'}},createElement(){return {width:0,height:0,className:'',setAttribute(){},addEventListener(){},getContext(type){return type==='2d'?context():null;},remove(){this.removed=true;}};},addEventListener(){}};
 class Image{constructor(){this.naturalWidth=2048;this.naturalHeight=1536;this.complete=false;}set src(value){this.value=value;this.complete=true;if(value==='missing'){this.naturalWidth=0;this.onerror?.();}else this.onload?.();}}
 const root={document,Image,performance:{now:()=>0},setTimeout:fn=>{timers.push(fn);return ++id;},clearTimeout(){},requestAnimationFrame:fn=>{frames.push(fn);return ++id;},cancelAnimationFrame(){},matchMedia:()=>({matches:false}),NightAssets:{actorAppearances:{new:{src:'new.png',columns:8,rows:6},bad:{src:'missing',columns:8,rows:6}},actors:{old:'old.webp'}}};root.globalThis=root;
 vm.runInNewContext(fs.readFileSync(__dirname+'/sprite-motion.js','utf8'),root);
 const element=(key='new')=>({dataset:{spriteGroup:'actorAppearances',spriteKey:key},isConnected:true,children:[],appendChild(c){this.children.push(c);},closest(){return null;}});
 return {root,document,frames,timers,element,advance(ms){const cb=frames.shift();cb?.(ms);}};
}
test('runtime pauses reduced/hidden figures, keeps phase continuity and releases removed actors',async()=>{
 const r=runtime(),el=r.element(),M=r.root.NightSpriteMotion,instance=M.mount(el);await Promise.resolve();await Promise.resolve();
 A.equal(el.dataset.spriteStatus,'ready');A.equal(M.stats().instances,1);A.equal(el.dataset.spriteRenderer,'canvas2d');
 for(let t=16;t<=160;t+=16)r.advance(t);const samples=instance.samples;A.ok(samples>3);
 M.play(el,{src:'new.png',columns:8,rows:6},{row:1,action:'attack',phase:'prepare',duration:160});
 for(let t=176;t<=336;t+=16)r.advance(t);A.equal(instance.state.kind,'hold');A.equal(instance.state.position,2);
 M.play(el,{src:'new.png',columns:8,rows:6},{row:1,action:'attack',phase:'impact',duration:320});A.equal(instance.state.start,2);
 r.document.body.dataset.motion='reduced';r.advance(352);A.equal(instance.state,null);const still=instance.samples;r.advance(368);A.equal(instance.samples,still);
 r.document.body.dataset.motion='full';M.play(el,{src:'new.png',columns:8,rows:6},{row:1,action:'attack',phase:'full'});r.document.hidden=true;r.advance(384);A.equal(instance.state.elapsed,0);
 el.isConnected=false;r.document.hidden=false;M.idle(el);r.advance(400);A.equal(M.stats().instances,0);A.equal(el._spriteMotion,undefined);
});
test('failed appearance resource falls back without switching its identity',async()=>{
 const r=runtime(),el=r.element('bad'),M=r.root.NightSpriteMotion;M.mount(el);await Promise.resolve();await Promise.resolve();
 A.equal(el.dataset.spriteStatus,'failed');A.equal(el.dataset.spriteReady,undefined);A.equal(el.dataset.spriteKey,'bad');A.equal(M.stats().instances,0);A.equal(el.children[0].removed,true);
});

test('rapid action changes bound unfinished fields and detached actors cancel queued analysis',async()=>{
 const r=runtime(),M=r.root.NightSpriteMotion;
 r.root.NightAssets.actorAppearances.new.columns=48;
 const el=r.element(),instance=M.mount(el);await Promise.resolve();await Promise.resolve();
 for(let row=1;row<6;row++)M.play(el,{src:'new.png',columns:48,rows:6},{row,action:'attack'});
 A.ok(M.stats().pending>0);A.ok(M.stats().pending<=180,JSON.stringify(M.stats()));A.ok(M.stats().pairs<=180);
 instance.dispose();A.equal(M.stats().pending,0);A.equal(M.stats().instances,0);A.equal(M.stats().pairs,0);
 const replacement=M.mount(el);await Promise.resolve();await Promise.resolve();
 A.equal(el.dataset.spriteReady,'true');A.ok(M.stats().pending>0);replacement.dispose();A.equal(M.stats().pending,0);
});
test('origin-restricted canvas analysis fails safely and preload resolves false',async()=>{
 const r=runtime({tainted:true}),el=r.element(),M=r.root.NightSpriteMotion;
 M.mount(el);await Promise.resolve();await Promise.resolve();
 A.equal(el.dataset.spriteStatus,'failed');A.equal(el.dataset.spriteReady,undefined);A.equal(M.stats().instances,0);A.equal(M.stats().pending,0);
 A.equal(await M.warm({src:'restricted.png',columns:8,rows:6}),false);
});

test('cold or cross-row motion keeps a single silhouette and solved neighbours only briefly blend',()=>{
 for(const t of [.1,.25,.49,.5,.51,.75,.9]){
  A.ok([0,1].includes(M.blendWeight(t,false)), 'cold flow must not dissolve two faces');
  A.ok([0,1].includes(M.blendWeight(t,true,false)), 'recovery must not dissolve unrelated rows');
 }
 A.equal(M.blendWeight(0,true),0);A.equal(M.blendWeight(1,true),1);
 A.equal(M.blendWeight(.4,true),0);A.equal(M.blendWeight(.6,true),1);
 A.ok(Math.abs(M.blendWeight(.5,true)-.5)<1e-12);
 const mixed=Array.from({length:101},(_,i)=>M.blendWeight(i/100,true)).filter(w=>w>0&&w<1);
 A.ok(mixed.length<=12,'only the short pose handoff may contain both silhouettes');
 // Displacement itself still advances between those crisp samples.
 const field=M.constantField(.1,0);
 A.ok(M.warpPoint(field,.2,.3,.4)[0]>M.warpPoint(field,.2,.3,.3)[0]);
});
