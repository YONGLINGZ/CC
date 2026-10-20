/* Offline, custom weighted-mesh portrait animation. This is not Cubism/.moc3. */
(function (global) {
  'use strict';
  const DEFAULT_RIG = {
    grid:{columns:8,rows:14},
    face:{x:.4668,y:.1738,radiusX:.145,radiusY:.1},
    eyes:[{x:.421875,y:.1770833333,width:.0479,height:.0085,angle:-.25,skin:'#efc3ad'},
          {x:.4853515625,y:.1588541667,width:.043,height:.0104,angle:-.34,skin:'#efc3ad'}],
    blink:{x:.380859375,y:.13997395833333333,width:.1416015625,height:.05338541666666667,
      critical:{x:.384765625,y:.14127604166666667,width:.1416015625,height:.05338541666666667}},
    ears:[{x:.3184,y:.0605},{x:.5313,y:.0117}],
    body:{x:.51,y:.50,radiusX:.35,radiusY:.32},
    tail:{points:[[.76,.51],[.875,.43],[.915,.32],[.825,.25],[.88,.205],[.96,.245]],radius:.06}
  };
  const STAGES = ['normal','wounded','critical'];
  const instances = new Map();
  const imageCache = new Map();
  let serial=0,raf=0,lastTick=0,globalFrames=0,totalRafs=0;
  const hasDOM=typeof document!=='undefined';
  const now=()=>typeof performance!=='undefined'?performance.now():Date.now();
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const gaussian=(x,y,cx,cy,rx,ry)=>Math.exp(-((x-cx)**2/(rx*rx)+(y-cy)**2/(ry*ry))*1.8);

  function stageFor(hp,maxHp) {
    hp=Number(hp);maxHp=Number(maxHp);
    if(!Number.isFinite(hp)||!Number.isFinite(maxHp)||maxHp<=0)return 'normal';
    return hp/maxHp<=.25?'critical':hp/maxHp<=.5?'wounded':'normal';
  }
  function rigFor(options) {
    const raw=options.rig||global.NightAssets?.puppetRig||{};
    return { ...DEFAULT_RIG,...raw,
      grid:{...DEFAULT_RIG.grid,...raw.grid},face:{...DEFAULT_RIG.face,...raw.face},
      body:{...DEFAULT_RIG.body,...raw.body},tail:{...DEFAULT_RIG.tail,...raw.tail},
      eyes:Array.isArray(raw.eyes)&&raw.eyes.length?raw.eyes:DEFAULT_RIG.eyes,
      ears:Array.isArray(raw.ears)&&raw.ears.length?raw.ears:DEFAULT_RIG.ears };
  }
  function imageFor(src) {
    if(!src||typeof global.Image!=='function')return Promise.reject(new Error('Portrait texture unavailable'));
    if(imageCache.has(src))return imageCache.get(src);
    const promise=new Promise((resolve,reject)=>{
      const image=new global.Image();
      image.onload=()=>image.naturalWidth?resolve(image):reject(new Error('Empty portrait texture'));
      image.onerror=()=>reject(new Error('Portrait texture could not load'));
      // No fetch, CORS readback or texture upload: file:// images can be drawn.
      image.decoding='async';image.src=src;
    });
    imageCache.set(src,promise);return promise;
  }
  function makeGrid(rig) {
    const columns=clamp(Math.floor(rig.grid.columns||8),4,12),rows=clamp(Math.floor(rig.grid.rows||14),6,20);
    const vertices=[],triangles=[];
    for(let y=0;y<=rows;y++)for(let x=0;x<=columns;x++)vertices.push({x:x/columns,y:y/rows});
    for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){
      const a=y*(columns+1)+x,b=a+1,c=a+columns+1,d=c+1;
      triangles.push([a,b,c],[b,d,c]);
    }
    return {vertices,triangles};
  }
  function tailWeight(x,y,tail) {
    let distance=Infinity,progress=0;
    const points=tail.points;
    for(let i=0;i<points.length-1;i++){
      const [ax,ay]=points[i],[bx,by]=points[i+1],vx=bx-ax,vy=by-ay;
      const t=clamp(((x-ax)*vx+(y-ay)*vy)/(vx*vx+vy*vy||1),0,1);
      const d=Math.hypot(x-ax-t*vx,y-ay-t*vy);
      if(d<distance){distance=d;progress=(i+t)/(points.length-1);}
    }
    return {weight:Math.exp(-((distance/(tail.radius||.075))**2)*2),progress};
  }
  function animationValue(instance,time) {
    const a=instance.action;
    if(!a)return {kind:null,p:0,pulse:0};
    const p=clamp((time-a.start)/a.duration,0,1);
    if(p>=1){instance.action=null;return {kind:null,p:1,pulse:0};}
    return {kind:a.type,p,pulse:Math.sin(Math.PI*p),amount:a.amount};
  }
  function parameters(instance,time) {
    const idle=instance.dynamic&&instance.motion!=='reduced',t=(time-instance.birth)/1000;
    const action=animationValue(instance,time),move=instance.motion!=='reduced';
    const wounded=instance.stage==='critical'?1:instance.stage==='wounded'?.4:0;
    const look=idle?instance.look:{x:0,y:0};
    const values={
      headX:idle?look.x*.012+Math.sin(t*.78)*.002:0,
      headY:idle?look.y*.006+Math.sin(t*1.23)*.0015:0,
      headAngle:idle?look.x*.027+Math.sin(t*.61)*.009:0,
      breath:idle?Math.sin(t*(wounded>0?2.6:1.8))*.0045:0,
      hair:idle?Math.sin(t*1.65+.7)*.009:0,
      tail:idle?Math.sin(t*1.15+.9)*.036:0,
      earL:idle?Math.sin(t*2.1)*.005:0,
      earR:idle?Math.sin(t*2.1+1.4)*.004:0,
      lean:idle?wounded*.004:0,
      action,move
    };
    if(move&&action.kind==='attack'){
      values.headX+=action.pulse*.018;values.headAngle-=action.pulse*.035;
    }else if(move&&action.kind==='hurt'){
      values.headX-=action.pulse*.015;values.headAngle+=Math.sin(action.p*Math.PI*3)*.022;
    }
    instance.lastParameters=values;
    return values;
  }
  function deform(instance,point,param) {
    const {x,y}=point,r=instance.rig,face=r.face,body=r.body;
    const head=gaussian(x,y,face.x,face.y,face.radiusX,face.radiusY);
    const torso=gaussian(x,y,body.x,body.y,body.radiusX,body.radiusY);
    let dx=param.headX*head-(y-face.y)*param.headAngle*head;
    let dy=param.headY*head+(x-face.x)*param.headAngle*head;
    dx+=(x-body.x)*param.breath*torso;
    dy-=param.breath*torso+param.lean*(1-y);
    const hair=clamp((Math.abs(x-face.x)-.10)/.18,0,1)*gaussian(x,y,face.x,.40,.45,.40);
    dx+=param.hair*hair*Math.sin(y*8+1.3);dy+=param.hair*.22*hair;
    const tail=tailWeight(x,y,r.tail);
    dx+=param.tail*tail.weight*tail.progress**1.5;
    dy+=param.tail*.25*tail.weight*Math.sin(tail.progress*Math.PI);
    for(let i=0;i<r.ears.length;i++){
      const ear=r.ears[i],weight=gaussian(x,y,ear.x,ear.y,.07,.065),value=i?param.earR:param.earL;
      dx+=value*weight*(i?-1:1);dy-=Math.abs(value)*weight*.8;
    }
    if(param.move&&param.action.kind){
      const pulse=param.action.pulse;
      if(param.action.kind==='attack'){dx+=pulse*.045;dy-=pulse*.007*torso;}
      if(param.action.kind==='hurt'){dx-=pulse*.031;dy+=pulse*.004*torso;}
      if(param.action.kind==='revive'){dy-=pulse*.008*torso;}
    }
    return {x:x+dx,y:y+dy};
  }
  function resize(instance) {
    const rect=instance.root.getBoundingClientRect();
    const width=Math.max(1,rect.width),height=Math.max(1,rect.height),ratio=Math.min(1.5,global.devicePixelRatio||1);
    const w=Math.round(width*ratio),h=Math.round(height*ratio);
    if(instance.canvas.width!==w||instance.canvas.height!==h){
      instance.canvas.width=w;instance.canvas.height=h;
    }
    instance.width=width;instance.height=height;instance.ratio=ratio;
  }
  function triangle(ctx,image,source,destination,alpha) {
    const [s0,s1,s2]=source,[d0,d1,d2]=destination;
    const det=(s1.x-s0.x)*(s2.y-s0.y)-(s2.x-s0.x)*(s1.y-s0.y);
    if(Math.abs(det)<.00001)return;
    const a=((d1.x-d0.x)*(s2.y-s0.y)-(d2.x-d0.x)*(s1.y-s0.y))/det;
    const c=((s1.x-s0.x)*(d2.x-d0.x)-(s2.x-s0.x)*(d1.x-d0.x))/det;
    const b=((d1.y-d0.y)*(s2.y-s0.y)-(d2.y-d0.y)*(s1.y-s0.y))/det;
    const d=((s1.x-s0.x)*(d2.y-d0.y)-(s2.x-s0.x)*(d1.y-d0.y))/det;
    const e=d0.x-a*s0.x-c*s0.y,f=d0.y-b*s0.x-d*s0.y;
    ctx.save();ctx.beginPath();
    // Offset every clip edge outward, rather than radially expanding the
    // vertices: long thin triangles otherwise retain faint antialias seams.
    const winding=((d1.x-d0.x)*(d2.y-d0.y)-(d1.y-d0.y)*(d2.x-d0.x))>=0?1:-1;
    const normals=destination.map((p,i)=>{const q=destination[(i+1)%3],x=q.x-p.x,y=q.y-p.y,length=Math.hypot(x,y)||1;return{x:y/length*winding,y:-x/length*winding};});
    for(let i=0;i<3;i++){
      const p=destination[i],before=normals[(i+2)%3],after=normals[i];
      const factor=.6/Math.max(.08,1+before.x*after.x+before.y*after.y);
      const px=p.x+(before.x+after.x)*factor,py=p.y+(before.y+after.y)*factor;
      if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
    }
    ctx.closePath();ctx.clip();ctx.globalAlpha=alpha;
    ctx.transform(a,b,c,d,e,f);ctx.drawImage(image,0,0);ctx.restore();
  }
  function layoutFor(instance,image) {
    const scale=instance.fit==='contain'?Math.min(instance.width/image.width,instance.height/image.height):Math.max(instance.width/image.width,instance.height/image.height);
    return {scale,x:(instance.width-image.width*scale)/2,y:instance.fit==='contain'?(instance.height-image.height*scale)/2:0};
  }
  function drawTexture(instance,image,param,alpha) {
    const ctx=instance.ctx,layout=layoutFor(instance,image);
    const source=instance.grid.vertices.map(p=>({x:p.x*image.width,y:p.y*image.height}));
    const destination=instance.grid.vertices.map(p=>{
      const moved=deform(instance,p,param);
      return {x:layout.x+moved.x*image.width*layout.scale,y:layout.y+moved.y*image.height*layout.scale};
    });
    for(const ids of instance.grid.triangles)triangle(ctx,image,ids.map(id=>source[id]),ids.map(id=>destination[id]),alpha);
    return layout;
  }
  function blinkFor(instance,time) {
    if(!instance.dynamic||instance.motion==='reduced')return 0;
    if(instance.forcedBlink){
      const p=(time-instance.forcedBlink)/(instance.blinkDuration||190);
      if(p<1)return Math.sin(clamp(p,0,1)*Math.PI);
      instance.forcedBlink=0;
    }
    if(time>instance.nextBlink){instance.blinkStart=time;instance.nextBlink=time+3100+(instance.id*397%1700);}
    if(!instance.blinkStart)return 0;
    const p=(time-instance.blinkStart)/175;
    return p<1?Math.sin(clamp(p,0,1)*Math.PI):0;
  }
  function drawEyes(instance,image,param,layout,blink) {
    if(blink<.03)return;
    if(instance.blinkImage&&instance.rig.blink){
      const raw=instance.rig.blink,rect=raw[instance.stage]||raw;
      const sourceImage=instance.blinkImage;
      const cols=4,rows=2,source=[],destination=[];
      for(let y=0;y<=rows;y++)for(let x=0;x<=cols;x++){
        source.push({x:x/cols*sourceImage.width,y:y/rows*sourceImage.height});
        const p=deform(instance,{x:rect.x+x/cols*rect.width,y:rect.y+y/rows*rect.height},param);
        destination.push({x:layout.x+p.x*image.width*layout.scale,y:layout.y+p.y*image.height*layout.scale});
      }
      for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
        const a=y*(cols+1)+x,b=a+1,c=a+cols+1,d=c+1;
        for(const ids of [[a,b,c],[b,d,c]])triangle(instance.ctx,sourceImage,ids.map(i=>source[i]),ids.map(i=>destination[i]),blink);
      }
      return;
    }
    const ctx=instance.ctx;
    for(const eye of instance.rig.eyes){
      const p=deform(instance,eye,param),x=layout.x+p.x*image.width*layout.scale,y=layout.y+p.y*image.height*layout.scale;
      const w=eye.width*image.width*layout.scale,h=eye.height*image.height*layout.scale;
      ctx.save();ctx.translate(x,y);ctx.rotate((eye.angle||0)+param.headAngle);
      // Texture-less fallback only hints a soft squint; never paints a bright
      // skin-colour block over the face. The shipped model uses eyelid artwork.
      ctx.globalAlpha=blink*.42;
      ctx.strokeStyle='#302025';ctx.lineWidth=Math.max(.7,w*.025);ctx.lineCap='round';ctx.beginPath();
      ctx.moveTo(-w*.51,-h*.17);ctx.quadraticCurveTo(0,-h*.65+h*blink*.92,w*.51,-h*.17);ctx.stroke();
      ctx.restore();
    }
  }
  function render(instance,time=now()) {
    if(!instance.alive||!instance.image||!instance.ctx)return;
    resize(instance);
    const ctx=instance.ctx,param=parameters(instance,time),blink=blinkFor(instance,time);
    ctx.setTransform(instance.ratio,0,0,instance.ratio,0,0);ctx.clearRect(0,0,instance.width,instance.height);
    const blend=instance.previousImage?clamp((time-instance.transitionStart)/190,0,1):1;
    if(instance.previousImage&&blend<1)drawTexture(instance,instance.previousImage,param,1);
    else instance.previousImage=null;
    const layout=drawTexture(instance,instance.image,param,blend);
    drawEyes(instance,instance.image,param,layout,blink);
    instance.blinkAmount=blink;instance.frames++;instance.lastFrame=time;
    const probes={head:{x:instance.rig.face.x,y:instance.rig.face.y},body:{x:.5,y:.6},hair:{x:.23,y:.4},tail:{x:instance.rig.tail.points.at(-1)[0],y:instance.rig.tail.points.at(-1)[1]},ear:instance.rig.ears[0]};
    instance.localOffsets=Object.fromEntries(Object.entries(probes).map(([key,p])=>{const q=deform(instance,p,param);return [key,{x:q.x-p.x,y:q.y-p.y}];}));
  }
  function wantsFrame(instance) {
    return instance.alive&&instance.ready&&instance.active&&instance.visible&&
      ((instance.dynamic&&instance.motion!=='reduced')||instance.action||instance.previousImage||instance.forcedBlink);
  }
  function schedule() {
    if(!hasDOM||raf||document.hidden||!Array.from(instances.values()).some(wantsFrame))return;
    raf=global.requestAnimationFrame(tick);totalRafs++;
  }
  function tick(time) {
    raf=0;
    if(document.hidden)return;
    if(time-lastTick>=1000/30-1){
      lastTick=time;globalFrames++;
      for(const instance of Array.from(instances.values())){
        if(!instance.root.isConnected){dispose(instance.root);continue;}
        if(wantsFrame(instance)){
          instance.look.x=lerp(instance.look.x,instance.targetLook.x,.13);
          instance.look.y=lerp(instance.look.y,instance.targetLook.y,.13);
          render(instance,time);
        }
      }
    }
    schedule();
  }
  function loadStage(instance,stage) {
    const token=++instance.loadToken;
    const src=instance.sources[stage]||instance.sources.normal;
    instance.root.dataset.puppetStage=stage;
    if(!src){
      instance.ready=false;instance.root.dataset.puppetReady='false';instance.root.classList.add('puppet-failed');
      instance.root.classList.remove('puppet-ready');return;
    }
    imageFor(src).then(image=>{
      if(!instance.alive||token!==instance.loadToken)return;
      instance.previousImage=instance.active&&instance.dynamic&&instance.motion!=='reduced'&&instance.image&&instance.image!==image?instance.image:null;
      instance.transitionStart=now();instance.image=image;instance.loadedStage=stage;instance.ready=true;
      instance.root.classList.remove('puppet-failed');instance.root.classList.add('puppet-ready');instance.root.dataset.puppetReady='true';
      render(instance);schedule();
    }).catch(()=>{
      if(!instance.alive||token!==instance.loadToken)return;
      instance.ready=false;instance.image=null;instance.previousImage=null;
      instance.root.classList.remove('puppet-ready');instance.root.classList.add('puppet-failed');instance.root.dataset.puppetReady='false';
    });
  }
  function mount(root,options={}) {
    if(!root||!hasDOM||typeof root.appendChild!=='function')return null;
    if(instances.has(root)){sync(root,options);return instances.get(root);}
    const canvas=document.createElement('canvas');canvas.className='puppet-canvas';canvas.setAttribute('aria-hidden','true');
    Object.assign(canvas.style,{position:'absolute',inset:'0',width:'100%',height:'100%',pointerEvents:'none'});
    const ctx=canvas.getContext('2d',{alpha:true});if(!ctx)return null;
    const rig=rigFor(options),id=++serial,time=now();
    const instance={id,root,canvas,ctx,rig,grid:makeGrid(rig),sources:options.sources||global.NightAssets?.puppet||{},
      hp:60,maxHp:60,motion:'full',dynamic:true,active:true,fit:options.fit||'cover',previewStage:null,
      alive:true,ready:false,visible:true,frames:0,loadToken:0,image:null,previousImage:null,action:null,
      birth:time,nextBlink:time+1700+(id*197%800),blinkStart:0,forcedBlink:0,blinkAmount:0,
      look:{x:0,y:0},targetLook:{x:0,y:0},localOffsets:{},stage:null};
    root.appendChild(canvas);root.dataset.puppetRenderer='weighted-mesh-2d';
    instances.set(root,instance);
    if(instance.sources.blink)imageFor(instance.sources.blink).then(image=>{
      if(instance.alive){instance.blinkImage=image;if(instance.ready)render(instance);}
    }).catch(()=>{});
    if(intersections)intersections.observe(root);
    if(typeof global.ResizeObserver==='function'){
      instance.resizeObserver=new global.ResizeObserver(()=>{if(instance.ready){render(instance);schedule();}});
      instance.resizeObserver.observe(root);
    }
    sync(root,options);return instance;
  }
  function sync(root,options={}) {
    const instance=instances.get(root);if(!instance)return mount(root,options);
    for(const key of ['hp','maxHp','active','dynamic','motion','previewStage'])if(Object.hasOwn(options,key))instance[key]=options[key];
    if(!['full','fast','reduced'].includes(instance.motion))instance.motion='full';
    const stage=STAGES.includes(instance.previewStage)?instance.previewStage:stageFor(instance.hp,instance.maxHp);
    if(stage!==instance.stage){instance.stage=stage;loadStage(instance,stage);}
    else if(instance.ready)render(instance);
    if(instance.motion==='reduced'||!instance.dynamic){instance.look={x:0,y:0};instance.targetLook={x:0,y:0};instance.forcedBlink=0;}
    schedule();return instance;
  }
  function act(root,type,options={}) {
    const instance=instances.get(root);if(!instance||!instance.alive||!instance.active)return false;
    if(type==='blink'){
      if(instance.motion==='reduced'||!instance.dynamic)return false;
      instance.forcedBlink=now();instance.blinkDuration=clamp(Number(options.duration)||190,100,1200);schedule();return true;
    }
    if(!['attack','hurt','guard','heal','revive'].includes(type))return false;
    const duration=(instance.motion==='fast'?180:instance.motion==='reduced'?120:type==='revive'?650:type==='hurt'?360:430);
    instance.action={type,start:now(),duration,amount:options.amount||options.damage||0};
    render(instance);schedule();return true;
  }
  function dispose(root) {
    const instance=instances.get(root);if(!instance)return false;
    instance.alive=false;instance.loadToken++;instance.action=null;instance.previousImage=null;
    instance.resizeObserver?.disconnect();intersections?.unobserve(root);instance.canvas.remove();
    root.classList.remove('puppet-ready','puppet-failed');delete root.dataset.puppetReady;delete root.dataset.puppetRenderer;delete root.dataset.puppetStage;
    instances.delete(root);
    if(!instances.size&&raf){global.cancelAnimationFrame(raf);raf=0;}
    return true;
  }
  function inspect(root) {
    if(!root)return {instances:instances.size,rafCount:raf?1:0,scheduledRafs:totalRafs,frames:globalFrames,paused:hasDOM?document.hidden:false};
    const i=instances.get(root);if(!i)return {alive:false,ready:false,frames:0,rafCount:raf?1:0};
    return {id:i.id,alive:i.alive,ready:i.ready,visible:i.visible,active:i.active,dynamic:i.dynamic,motion:i.motion,
      stage:i.stage,loadedStage:i.loadedStage||null,hp:i.hp,maxHp:i.maxHp,frames:i.frames,meshVertices:i.grid.vertices.length,
      triangleCount:i.grid.triangles.length,layers:i.blinkImage?2:1,deformationRegions:7,localOffsets:i.localOffsets,blinkAmount:i.blinkAmount,blinkTextureReady:!!i.blinkImage,
      animation:i.action?.type||null,rafCount:raf?1:0,look:{x:i.look.x,y:i.look.y,targetX:i.targetLook.x,targetY:i.targetLook.y},
      imageSize:i.image?{width:i.image.width,height:i.image.height}:null};
  }
  const intersections=hasDOM&&typeof global.IntersectionObserver==='function'?new global.IntersectionObserver(entries=>{
    for(const entry of entries){const i=instances.get(entry.target);if(i){i.visible=entry.isIntersecting;if(i.visible&&i.ready)render(i);}}
    schedule();
  },{rootMargin:'40px'}):null;
  if(hasDOM){
    document.addEventListener('pointermove',event=>{
      for(const instance of instances.values())if(instance.dynamic&&instance.motion!=='reduced'&&instance.active){
        const r=instance.root.getBoundingClientRect();
        instance.targetLook.x=clamp((event.clientX-(r.left+r.width*.5))/(r.width*.65||1),-1,1);
        instance.targetLook.y=clamp((event.clientY-(r.top+r.height*.35))/(r.height*.6||1),-1,1);
      }
      schedule();
    },{passive:true});
    document.addEventListener('visibilitychange',()=>{
      if(document.hidden&&raf){global.cancelAnimationFrame(raf);raf=0;}
      else{for(const instance of instances.values())if(instance.ready)render(instance);schedule();}
    });
  }
  const api={mount,sync,act,dispose,inspect,stageFor};global.NightPuppet=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis==='undefined'?window:globalThis);
