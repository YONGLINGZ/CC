/* Motion-compensated sprite interpolation. Art poses stay in the atlases; this
 * presentation-only renderer synthesizes the in-between samples at display rate.
 * It never advances combat, reads save data, or substitutes another appearance. */
(function(root){'use strict';
const GRID=12,ANALYSIS_SIZE=72,MAX_ASSETS=10,MAX_PAIRS=180;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const smooth=t=>t*t*(3-2*t);
function descriptor(raw,columns=4,rows=6){
 if(!raw)return null;
 const d=typeof raw==='string'?{src:raw}:raw;
 if(!d.src)return null;
 return {src:d.src,columns:Math.max(1,Math.floor(d.columns||columns)),rows:Math.max(1,Math.floor(d.rows||rows)),idleDuration:d.idleDuration||1800};
}
function resolve(group,key){return descriptor(root.NightAssets?.[group]?.[key],group==='actorAppearances'?8:4,group==='actors'||group==='actorAppearances'?6:4);}
function phaseRange(columns,phase='full'){
 const end=columns-1,split=Math.max(1,Math.floor(end/3));
 return phase==='prepare'?[0,split]:phase==='impact'?[split,end]:[0,end];
}
function phaseSample(start,end,elapsed,duration){return lerp(start,end,smooth(clamp(elapsed/Math.max(1,duration),0,1)));}

// Premultiplied color and alpha keep transparent hair and cloth from introducing
// the RGB garbage that many otherwise valid WebP atlas borders contain.
function features(rgba,width,height,size){
 const data=new Float32Array(size*size*4);let mass=0,cx=0,cy=0;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const sx=Math.min(width-1,Math.floor((x+.5)*width/size)),sy=Math.min(height-1,Math.floor((y+.5)*height/size));
  const i=(sy*width+sx)*4,j=(y*size+x)*4,a=rgba[i+3]/255;
  data[j]=rgba[i]*a;data[j+1]=rgba[i+1]*a;data[j+2]=rgba[i+2]*a;data[j+3]=a*255;
  mass+=a;cx+=x*a;cy+=y*a;
 }
 return {data,size,cx:mass?cx/mass:size/2,cy:mass?cy/mass:size/2};
}
function at(f,x,y,c){if(x<0||y<0||x>=f.size||y>=f.size)return 0;return f.data[(y*f.size+x)*4+c];}
function patchCost(a,b,x,y,dx,dy,r=2){
 let cost=0,weight=0;
 for(let yy=-r;yy<=r;yy++)for(let xx=-r;xx<=r;xx++){
  const ax=x+xx,ay=y+yy,bx=ax+dx,by=ay+dy,aa=at(a,ax,ay,3),ba=at(b,bx,by,3);
  const w=xx===0&&yy===0?1.5:1;
  cost+=w*(Math.abs(aa-ba)*1.6+(Math.abs(at(a,ax,ay,0)-at(b,bx,by,0))+Math.abs(at(a,ax,ay,1)-at(b,bx,by,1))+Math.abs(at(a,ax,ay,2)-at(b,bx,by,2)))*.35);
  weight+=w;
 }
 return cost/weight;
}
function fieldSample(field,x,y){
 const n=field.grid,fx=clamp(x,0,1)*n,fy=clamp(y,0,1)*n,ix=Math.min(n-1,Math.floor(fx)),iy=Math.min(n-1,Math.floor(fy)),tx=fx-ix,ty=fy-iy;
 const read=(xx,yy,c)=>field.data[((yy*(n+1)+xx)*2)+c];
 return [0,1].map(c=>lerp(lerp(read(ix,iy,c),read(ix+1,iy,c),tx),lerp(read(ix,iy+1,c),read(ix+1,iy+1,c),tx),ty));
}
function constantField(dx=0,dy=0,grid=GRID){const data=new Float32Array((grid+1)**2*2);for(let i=0;i<data.length;i+=2){data[i]=dx;data[i+1]=dy;}return {grid,data};}
function warpPoint(field,x,y,t){const d=fieldSample(field,x,y);return [x+d[0]*t,y+d[1]*t];}
function regularize(field){
 // Bound the deformation gradient so adjoining mesh triangles cannot fold over
 // one another when a generated hand/weapon pose is far from its neighbour.
 const n=field.grid,d=field.data,limit=.45/n;
 for(let pass=0;pass<48;pass++){
  let excess=0;
  for(let y=0;y<=n;y++)for(let x=0;x<=n;x++){
   const i=(y*(n+1)+x)*2;
   for(const j of [x<n?i+2:-1,y<n?i+(n+1)*2:-1])if(j>=0){
    const dx=d[j]-d[i],dy=d[j+1]-d[i+1],length=Math.hypot(dx,dy);
    if(length>limit){const k=(length-limit)/length*.5;d[i]+=dx*k;d[i+1]+=dy*k;d[j]-=dx*k;d[j+1]-=dy*k;excess=Math.max(excess,length-limit);}
   }
  }
  if(excess<1e-5)break;
 }
 return field;
}
function pyramid(frame){return [18,36,ANALYSIS_SIZE].map(size=>features(frame.data,frame.width,frame.height,size));}
function* solveDirection(aPyramid,bPyramid,grid=GRID){
 const data=new Float32Array((grid+1)**2*2),a0=aPyramid[0],b0=bPyramid[0];
 const globalX=b0.cx-a0.cx,globalY=b0.cy-a0.cy;
 for(let gy=0;gy<=grid;gy++)for(let gx=0;gx<=grid;gx++){
  let dx=globalX,dy=globalY;
  for(let level=0;level<aPyramid.length;level++){
   const a=aPyramid[level],b=bPyramid[level],x=Math.round(gx/grid*(a.size-1)),y=Math.round(gy/grid*(a.size-1));
   if(level){dx*=2;dy*=2;}
   const centerX=Math.round(dx),centerY=Math.round(dy),radius=level===0?5:2;
   let best=Infinity,bx=centerX,by=centerY;
   for(let sy=-radius;sy<=radius;sy++)for(let sx=-radius;sx<=radius;sx++){
    const candidateX=centerX+sx,candidateY=centerY+sy;
    const error=patchCost(a,b,x,y,candidateX,candidateY)+(sx*sx+sy*sy)*(level===0?.11:.045);
    if(error<best){best=error;bx=candidateX;by=candidateY;}
   }
   dx=bx;dy=by;
  }
  const i=(gy*(grid+1)+gx)*2;
  data[i]=clamp(dx/(ANALYSIS_SIZE-1),-.32,.32);data[i+1]=clamp(dy/(ANALYSIS_SIZE-1),-.32,.32);
  if((gx+gy*(grid+1))%3===0)yield;
 }
 // A modest spatial regularizer avoids discontinuous patches without dragging
 // the whole figure through the displacement of an independently moving hand.
 const output=data.slice();
 for(let y=1;y<grid;y++)for(let x=1;x<grid;x++)for(let c=0;c<2;c++){
  const i=(y*(grid+1)+x)*2+c,neighbors=[i-2,i+2,i-(grid+1)*2,i+(grid+1)*2];
  const close=neighbors.filter(j=>Math.abs(data[j]-data[i])<.08);
  if(close.length)output[i]=data[i]*.88+close.reduce((s,j)=>s+data[j],0)/close.length*.12;
 }
 return regularize({grid,data:output});
}
function* solvePair(a,b,grid=GRID){
 const pa=pyramid(a),pb=pyramid(b);
 const forward=yield* solveDirection(pa,pb,grid),backward=yield* solveDirection(pb,pa,grid);
 return {forward,backward};
}
function estimatePair(a,b,grid=GRID){const work=solvePair(a,b,grid);let r;do{r=work.next();}while(!r.done);return r.value;}
function cheapPair(a,b,grid=GRID){
 const fa=features(a.data,a.width,a.height,18),fb=features(b.data,b.width,b.height,18);
 const x=clamp((fb.cx-fa.cx)/17,-.25,.25),y=clamp((fb.cy-fa.cy)/17,-.25,.25);
 return {forward:constantField(x,y,grid),backward:constantField(-x,-y,grid)};
}

const assets=new Map(),pairs=new Map(),instances=new Set(),jobs=[];
let assetId=0,jobTimer=null,raf=0,lastTick=0,observer=null,visibilityObserver=null;
const now=()=>typeof performance!=='undefined'?performance.now():Date.now();
function runJobs(){
 jobTimer=null;if(typeof document!=='undefined'&&document.hidden)return;
 const until=now()+5;
 while(jobs.length&&now()<until){
  const job=jobs[0];let step;
  try{step=job.iterator.next();}catch(error){jobs.shift();job.reject(error);continue;}
  if(step.done){jobs.shift();job.resolve(step.value);}else if(job.priority<2&&jobs.some(j=>j.priority>job.priority)){jobs.shift();jobs.push(job);}
 }
 if(jobs.length)jobTimer=setTimeout(runJobs,0);
}
function enqueue(iterator,priority=0){
 let job;const promise=new Promise((resolve,reject)=>{job={iterator,priority,resolve,reject};});
 function insert(){let i=jobs.findIndex(j=>j.priority<job.priority);if(i<0)i=jobs.length;jobs.splice(i,0,job);}
 insert();if(!jobTimer)jobTimer=setTimeout(runJobs,0);
 promise.cancel=()=>{const i=jobs.indexOf(job);if(i<0)return;jobs.splice(i,1);iterator.return?.();job.resolve(null);if(!jobs.length&&jobTimer){clearTimeout(jobTimer);jobTimer=null;}};
 promise.promote=value=>{const i=jobs.indexOf(job);if(i<0||value<=job.priority)return;jobs.splice(i,1);job.priority=value;insert();};
 return promise;
}
function discardPair(key,p){pairs.delete(key);p.work?.cancel();}
function cancelUnusedJobs(){for(const [key,p]of pairs)if(!p.ready&&p.assets.every(a=>a.refs===0))discardPair(key,p);}
function touch(map,key,value){map.delete(key);map.set(key,value);}
function prune(){
 if(assets.size>MAX_ASSETS)for(const [key,a]of assets){if(a.refs===0&&a.status!=='pending'){assets.delete(key);a.frames.clear();for(const [pairKey,p]of pairs)if(p.assets.includes(a))discardPair(pairKey,p);if(assets.size<=MAX_ASSETS)break;}}
 // Pending work must obey the same bound as completed fields. Otherwise rapidly
 // changing encounters queues unbounded analyses of figures already removed.
 while(pairs.size>MAX_PAIRS){const [key,p]=pairs.entries().next().value;discardPair(key,p);}
}
function load(d){
 if(!d||typeof Image==='undefined')return null;
 const key=d.src+'|'+d.columns+'|'+d.rows;
 if(assets.has(key)){const a=assets.get(key);touch(assets,key,a);return a;}
 const a={id:++assetId,key,d,refs:0,status:'pending',frames:new Map(),image:new Image()};
 assets.set(key,a);
 a.promise=new Promise(resolve=>{
  let done=false;const finish=ok=>{if(done)return;done=true;a.status=ok?'ready':'failed';resolve(ok?a:null);};
  a.image.onload=()=>finish(a.image.naturalWidth>=d.columns&&a.image.naturalHeight>=d.rows);
  a.image.onerror=()=>finish(false);a.image.src=d.src;
  if(a.image.complete)finish(a.image.naturalWidth>0);
 });
 a.promise.then(()=>Promise.resolve().then(prune));
 prune();return a;
}
function ref(asset,row,col){return {asset,row:clamp(row,0,asset.d.rows-1),col:clamp(col,0,asset.d.columns-1)};}
function frame(ref){
 const a=ref.asset,key=ref.row+':'+ref.col;if(a.frames.has(key))return a.frames.get(key);
 const canvas=document.createElement('canvas');canvas.width=canvas.height=ANALYSIS_SIZE;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});const w=a.image.naturalWidth/a.d.columns,h=a.image.naturalHeight/a.d.rows;
 ctx.drawImage(a.image,ref.col*w,ref.row*h,w,h,0,0,ANALYSIS_SIZE,ANALYSIS_SIZE);
 const out=ctx.getImageData(0,0,ANALYSIS_SIZE,ANALYSIS_SIZE);a.frames.set(key,out);return out;
}
function pair(a,b,priority=0){
 const key=a.asset.id+':'+a.row+':'+a.col+'>'+b.asset.id+':'+b.row+':'+b.col;
 if(pairs.has(key)){const p=pairs.get(key);touch(pairs,key,p);p.work?.promote(priority);return p;}
 const fa=frame(a),fb=frame(b),p={...cheapPair(fa,fb),ready:false,assets:[a.asset,b.asset]};pairs.set(key,p);
 p.work=enqueue(solvePair(fa,fb),priority);
 p.promise=p.work.then(result=>{if(result)Object.assign(p,result,{ready:true});return p;},()=>{p.failed=true;return p;});
 prune();return p;
}
function warmRow(asset,row,priority=0){
 if(!asset||asset.status!=='ready')return;
 for(let i=0;i<asset.d.columns;i++)pair(ref(asset,row,i),ref(asset,row,(i+1)%asset.d.columns),priority);
}

// The two warped images are combined in premultiplied-alpha space. Ordinary
// source-over blending would darken transparent fabric and produce double edges.
// Preserve one opaque drawing through most of a transition. A broad dissolve
// produces two faces/weapons whenever local correspondence is imperfect. Only
// solved, same-row neighbours get a short handoff; cold and cross-row poses
// stay crisp while their displacement continues to be sampled every frame.
function blendWeight(t,ready,sameTrack=true){
 t=clamp(t,0,1);
 return ready&&sameTrack?smooth(clamp((t-.44)/.12,0,1)):(t<.5?0:1);
}
function makeGL(canvas){
 const gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:true,antialias:false,depth:false,stencil:false,preserveDrawingBuffer:false});
 if(!gl)return null;
 function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;}
 function program(v,f){const p=gl.createProgram(),vs=shader(gl.VERTEX_SHADER,v),fs=shader(gl.FRAGMENT_SHADER,f);gl.attachShader(p,vs);gl.attachShader(p,fs);gl.linkProgram(p);gl.deleteShader(vs);gl.deleteShader(fs);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));return p;}
 const warp=program('attribute vec2 point;attribute vec2 motion;uniform float amount;uniform vec4 cell;varying vec2 uv;void main(){vec2 p=point+motion*amount;gl_Position=vec4(p.x*2.0-1.0,1.0-p.y*2.0,0,1);uv=cell.xy+point*cell.zw;}',
 'precision mediump float;uniform sampler2D image;varying vec2 uv;void main(){gl_FragColor=texture2D(image,uv);}');
 const merge=program('attribute vec2 point;varying vec2 uv;void main(){gl_Position=vec4(point*2.0-1.0,0,1);uv=point;}',
 'precision mediump float;uniform sampler2D first;uniform sampler2D second;uniform float mixAmount;varying vec2 uv;void main(){vec4 a=texture2D(first,uv);vec4 b=texture2D(second,uv);gl_FragColor=mix(a,b,mixAmount);}');
 const vertices=new Float32Array((GRID+1)**2*2),indices=[];
 for(let y=0;y<=GRID;y++)for(let x=0;x<=GRID;x++){let i=(y*(GRID+1)+x)*2;vertices[i]=x/GRID;vertices[i+1]=y/GRID;if(x<GRID&&y<GRID){const p=y*(GRID+1)+x;indices.push(p,p+1,p+GRID+1,p+1,p+GRID+2,p+GRID+1);}}
 const points=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,points);gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.STATIC_DRAW);
 const moves=gl.createBuffer();const elements=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,elements);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);
 const quad=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,quad);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([0,0,1,0,0,1,0,1,1,0,1,1]),gl.STATIC_DRAW);
 const textures=new Map();
 function tex(){const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t;}
 function imageTexture(asset){if(textures.has(asset.id))return textures.get(asset.id);const t=tex();gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,asset.image);textures.set(asset.id,t);if(textures.size>3){const [id,old]=textures.entries().next().value;gl.deleteTexture(old);textures.delete(id);}return t;}
 const targets=[0,1].map(()=>{const texture=tex();gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,canvas.width,canvas.height,0,gl.RGBA,gl.UNSIGNED_BYTE,null);const fbo=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw new Error('Sprite framebuffer unavailable');return {texture,fbo};});
 function attribute(p,name,buffer){const loc=gl.getAttribLocation(p,name);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);}
 function drawWarp(target,r,field,t){
  gl.bindFramebuffer(gl.FRAMEBUFFER,target.fbo);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(warp);
  attribute(warp,'point',points);gl.bindBuffer(gl.ARRAY_BUFFER,moves);gl.bufferData(gl.ARRAY_BUFFER,field.data,gl.DYNAMIC_DRAW);attribute(warp,'motion',moves);
  gl.uniform1f(gl.getUniformLocation(warp,'amount'),t);const a=r.asset,px=.5/a.image.naturalWidth,py=.5/a.image.naturalHeight;
  gl.uniform4f(gl.getUniformLocation(warp,'cell'),r.col/a.d.columns+px,r.row/a.d.rows+py,1/a.d.columns-2*px,1/a.d.rows-2*py);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,imageTexture(a));gl.uniform1i(gl.getUniformLocation(warp,'image'),0);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,elements);gl.drawElements(gl.TRIANGLES,indices.length,gl.UNSIGNED_SHORT,0);
 }
 const zero=constantField();
 return {kind:'webgl',draw(a,b,t,flow){
  gl.viewport(0,0,canvas.width,canvas.height);gl.disable(gl.BLEND);
  const mix=blendWeight(t,flow?.ready,a.asset===b.asset&&a.row===b.row);
  if(mix<1)drawWarp(targets[0],a,flow?.forward||zero,t);if(mix>0)drawWarp(targets[1],b,flow?.backward||zero,1-t);
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(merge);attribute(merge,'point',quad);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,targets[0].texture);gl.uniform1i(gl.getUniformLocation(merge,'first'),0);
  gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,targets[1].texture);gl.uniform1i(gl.getUniformLocation(merge,'second'),1);
  gl.uniform1f(gl.getUniformLocation(merge,'mixAmount'),mix);gl.drawArrays(gl.TRIANGLES,0,6);
 },dispose(){for(const t of textures.values())gl.deleteTexture(t);targets.forEach(t=>{gl.deleteTexture(t.texture);gl.deleteFramebuffer(t.fbo);});[points,moves,elements,quad].forEach(b=>gl.deleteBuffer(b));gl.deleteProgram(warp);gl.deleteProgram(merge);gl.getExtension('WEBGL_lose_context')?.loseContext();}};
}
function affine(ctx,p,q){
 const [a,b,c]=p,[u,v,w]=q,det=a[0]*(b[1]-c[1])+b[0]*(c[1]-a[1])+c[0]*(a[1]-b[1]);if(Math.abs(det)<1e-8)return false;
 const solve=axis=>[(u[axis]*(b[1]-c[1])+v[axis]*(c[1]-a[1])+w[axis]*(a[1]-b[1]))/det,(u[axis]*(c[0]-b[0])+v[axis]*(a[0]-c[0])+w[axis]*(b[0]-a[0]))/det,(u[axis]*(b[0]*c[1]-c[0]*b[1])+v[axis]*(c[0]*a[1]-a[0]*c[1])+w[axis]*(a[0]*b[1]-b[0]*a[1]))/det];
 const x=solve(0),y=solve(1);ctx.transform(x[0],y[0],x[1],y[1],x[2],y[2]);return true;
}
function make2D(canvas){
 const ctx=canvas.getContext('2d');if(!ctx)return null;const size=canvas.width,n=8;
 function draw(r,field,t,opacity){
  const a=r.asset,w=a.image.naturalWidth/a.d.columns,h=a.image.naturalHeight/a.d.rows;
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
   const p=[[x/n,y/n],[(x+1)/n,y/n],[x/n,(y+1)/n],[(x+1)/n,(y+1)/n]];
   const q=p.map(([u,v])=>warpPoint(field,u,v,t).map(z=>z*size)),s=p.map(v=>v.map(z=>z*size));
   for(const ids of [[0,1,2],[1,3,2]]){ctx.save();ctx.globalAlpha=opacity;ctx.globalCompositeOperation='lighter';ctx.beginPath();ids.forEach((i,k)=>k?ctx.lineTo(...q[i]):ctx.moveTo(...q[i]));ctx.closePath();ctx.clip();if(affine(ctx,ids.map(i=>s[i]),ids.map(i=>q[i])))ctx.drawImage(a.image,r.col*w,r.row*h,w,h,0,0,size,size);ctx.restore();}
  }
 }
 return {kind:'canvas2d',draw(a,b,t,flow){ctx.clearRect(0,0,size,size);const z=constantField(),mix=blendWeight(t,flow?.ready,a.asset===b.asset&&a.row===b.row);if(mix<1)draw(a,flow?.forward||z,t,1-mix);if(mix>0)draw(b,flow?.backward||z,1-t,mix);},dispose(){ctx.clearRect(0,0,size,size);}};
}
function effectiveMode(){if(typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches)return 'reduced';return document.body?.dataset.motion||'full';}
function beginRAF(){if(!raf&&typeof requestAnimationFrame==='function'&&!document.hidden){lastTick=0;raf=requestAnimationFrame(tick);}}
function tick(time){
 raf=0;const dt=lastTick?Math.min(48,time-lastTick):0;lastTick=time;let active=false;
 for(const instance of [...instances]){
  if(!instance.el.isConnected){instance.dispose();continue;}
  if(!instance.visible||document.hidden)continue;
  try{if(instance.tick(dt))active=true;}catch(error){instance.fail(error);}
 }
 if(active&&!document.hidden)raf=requestAnimationFrame(tick);
}
class Animator{
 constructor(el,d){
  this.el=el;this.base=load(d);this.base.refs++;this.asset=this.base;this.visible=true;this.clock=0;this.state=null;this.lastDraw=null;this.samples=0;this.disposed=false;
  this.el.dataset.spriteStatus='loading';this.canvas=document.createElement('canvas');this.canvas.width=this.canvas.height=256;this.canvas.className='sprite-motion-canvas';this.canvas.setAttribute('aria-hidden','true');
  try{this.renderer=makeGL(this.canvas);}catch(error){this.canvas=document.createElement('canvas');this.canvas.width=this.canvas.height=256;this.canvas.className='sprite-motion-canvas';}
  if(!this.renderer)this.renderer=make2D(this.canvas);
  if(!this.renderer){this.fail(new Error('Canvas unavailable'));return;}
  this.el.appendChild(this.canvas);this.el.dataset.spriteRenderer=this.renderer.kind;
  this.canvas.addEventListener?.('webglcontextlost',event=>{if(!this.disposed){event.preventDefault();this.fail(new Error('Sprite graphics context lost'));}});
  this.base.promise.then(asset=>{if(this.disposed)return;if(!asset){this.fail(new Error('Atlas failed'));return;}this.el.dataset.spriteStatus='ready';this.el.dataset.spriteColumns=String(d.columns);this.el.dataset.spriteRows=String(d.rows);try{warmRow(asset,0,1);warmRow(asset,1,0);this.draw(ref(asset,0,0),ref(asset,0,0),0);beginRAF();}catch(error){this.fail(error);}});
  instances.add(this);visibilityObserver?.observe(el);
 }
 play(d,options){
  const next=load(d);if(!next)return;
  const token=(this.token||0)+1;this.token=token;
  const apply=()=>{
   if(this.disposed||token!==this.token||next.status!=='ready')return;
   if(this.asset!==next){if(this.asset!==this.base)this.asset.refs--;this.asset=next;if(next!==this.base)next.refs++;}
   const old=this.state,r=phaseRange(next.d.columns,options.phase);
   let start=r[0];if(options.phase==='impact'&&old&&old.row===options.row&&old.asset===next&&(old.phase==='prepare'||old.kind==='hold'))start=old.position??r[0];
   this.state={kind:'action',asset:next,row:options.row,start,end:r[1],position:start,elapsed:0,duration:options.duration||480,phase:options.phase||'full',action:options.action,onfinish:options.onfinish};
   try{this.clock=0;warmRow(next,options.row,2);this.el.dataset.spritePhase=this.state.phase;this.el.dataset.spriteAction=options.action||'attack';beginRAF();}catch(error){this.fail(error);}
  };
  if(next.status==='ready')apply();else next.promise.then(apply);
 }
 idle(){
  this.token=(this.token||0)+1;if(this.asset!==this.base)this.asset.refs--;this.asset=this.base;this.state=null;this.clock=0;this.lastDraw=null;
  delete this.el.dataset.spritePhase;this.el.dataset.spriteAction='idle';if(this.base.status==='ready'){this.draw(ref(this.base,0,0),ref(this.base,0,0),0);beginRAF();}
 }
 draw(a,b,t){
  if(!this.renderer||a.asset.status!=='ready'||b.asset.status!=='ready')return;
  const same=a.asset===b.asset&&a.row===b.row&&a.col===b.col,flow=same?null:pair(a,b,this.state?2:0);
  this.renderer.draw(a,b,t,flow);this.samples++;this.lastDraw={a,b,t};
  this.el.dataset.spriteSamples=String(this.samples);this.el.dataset.spriteInterpolation=same?'keyframe':flow.ready?'motion-field':'warming';this.el.dataset.spriteFrame=String(a.col);this.el.dataset.spriteFraction=t.toFixed(3);
  this.el.dataset.spriteReady='true';
 }
 tick(dt){
  if(this.base.status!=='ready')return false;
  const mode=effectiveMode(),broken=this.el.closest?.('.machine-broken')||this.el.parentElement?.dataset.machineStage==='broken';
  if(mode==='off'||mode==='reduced'||broken){if(this.lastMode!==mode||this.state){this.idle();this.draw(ref(this.base,0,0),ref(this.base,0,0),0);}this.lastMode=mode;return false;}
  this.lastMode=mode;
  if(mode==='fast'&&!this.state)return false;
  this.clock+=dt;const s=this.state;
  if(!s){const position=this.clock/this.base.d.idleDuration*this.base.d.columns,whole=Math.floor(position),col=whole%this.base.d.columns;this.draw(ref(this.base,0,col),ref(this.base,0,(col+1)%this.base.d.columns),position-whole);return true;}
  s.elapsed+=dt;
  if(s.kind==='hold'){if(s.elapsed<650)return true;this.recover(s);return true;}
  if(s.kind==='recovery'){
   const t=clamp(s.elapsed/s.duration,0,1);this.draw(s.from,ref(this.base,0,0),t);
   if(t===1){const done=s.onfinish;this.idle();done?.();}return true;
  }
  const duration=mode==='fast'?Math.min(s.duration,90):s.duration;
  s.position=phaseSample(s.start,s.end,s.elapsed,duration);
  const col=Math.floor(s.position),next=Math.min(s.asset.d.columns-1,col+1);
  this.draw(ref(s.asset,s.row,col),ref(s.asset,s.row,next),s.position-col);
  if(s.elapsed>=duration){if(s.phase==='prepare'&&mode!=='fast'){s.kind='hold';s.elapsed=0;}else this.recover(s);}
  return true;
 }
 recover(s){this.state={kind:'recovery',from:ref(s.asset,s.row,Math.round(s.position??s.end)),elapsed:0,duration:effectiveMode()==='fast'?45:140,onfinish:s.onfinish};this.el.dataset.spritePhase='recovery';}
 fail(error){this.el.dataset.spriteStatus='failed';this.el.dataset.spriteFailure=String(error?.message||error).slice(0,80);delete this.el.dataset.spriteReady;this.canvas?.remove();this.dispose();}
 dispose(){if(this.disposed)return;this.disposed=true;instances.delete(this);visibilityObserver?.unobserve(this.el);this.base.refs--;if(this.asset!==this.base)this.asset.refs--;this.renderer?.dispose();delete this.el._spriteMotion;cancelUnusedJobs();prune();}
}
function mount(el){
 if(!el||typeof document==='undefined'||!el.appendChild)return null;
 if(el._spriteMotion&&!el._spriteMotion.disposed)return el._spriteMotion;
 const d=resolve(el.dataset.spriteGroup,el.dataset.spriteKey);if(!d)return null;
 const instance=new Animator(el,d);if(!instance.disposed)el._spriteMotion=instance;return instance.disposed?null:instance;
}
function play(el,d,options){const instance=mount(el);if(!instance)return false;instance.play(descriptor(d),options);return true;}
function idle(el){el?._spriteMotion?.idle();}
function scan(node){if(node?.matches?.('[data-sprite-group]'))mount(node);node?.querySelectorAll?.('[data-sprite-group]').forEach(mount);}
function observe(){
 if(observer||typeof document==='undefined'||typeof MutationObserver==='undefined')return;
 if(typeof IntersectionObserver!=='undefined')visibilityObserver=new IntersectionObserver(entries=>{for(const entry of entries){const instance=entry.target._spriteMotion;if(instance){instance.visible=entry.isIntersecting;if(instance.visible)beginRAF();}}});
 observer=new MutationObserver(records=>{for(const record of records){if(record.type==='attributes'){beginRAF();continue;}record.addedNodes.forEach(scan);}for(const instance of [...instances])if(!instance.el.isConnected)instance.dispose();});
 observer.observe(document.documentElement,{childList:true,subtree:true});if(document.body)observer.observe(document.body,{attributes:true,attributeFilter:['data-motion']});scan(document);
 document.addEventListener('visibilitychange',()=>{if(document.hidden){if(raf)cancelAnimationFrame(raf);raf=0;lastTick=0;if(jobTimer)clearTimeout(jobTimer);jobTimer=null;}else{if(jobs.length&&!jobTimer)jobTimer=setTimeout(runJobs,0);beginRAF();}});
 const preference=typeof matchMedia==='function'?matchMedia('(prefers-reduced-motion: reduce)'):null;preference?.addEventListener?.('change',beginRAF);
}
function warm(d,row=0){const a=load(descriptor(d));if(!a)return Promise.resolve(false);return a.promise.then(ready=>{if(!ready)return false;try{warmRow(a,row,1);return true;}catch{return false;}});}
function stats(){return {instances:instances.size,assets:assets.size,pairs:pairs.size,pending:jobs.length,renderedSamples:[...instances].reduce((n,i)=>n+i.samples,0),renderer:[...new Set([...instances].map(i=>i.renderer?.kind))],targetSamplesPerSecond:60,interpolation:'bidirectional motion field, premultiplied-alpha mesh warp'};}
const api={blendWeight,descriptor,resolve,phaseRange,phaseSample,features,fieldSample,constantField,warpPoint,estimatePair,mount,play,idle,warm,observe,stats};
if(typeof module!=='undefined')module.exports=api;root.NightSpriteMotion=api;
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',observe,{once:true});else observe();}
})(typeof globalThis!=='undefined'?globalThis:this);
