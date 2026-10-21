/* Actual Chromium / WebGL checks for the offline procedural scene. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {chromium}=require('playwright');
const source=fs.readFileSync(path.join(__dirname,'scene.js'),'utf8');
const report={renderer:'Procedural WebGL triangle meshes, not production model assets',runtimeSha256:crypto.createHash('sha256').update(source).digest('hex'),results:[],errors:[],externalRequests:[],launchArgs:['--no-sandbox']};
let browser,page;
async function check(name,fn){try{await fn();report.results.push({name,ok:true});console.log('PASS '+name);}catch(error){report.results.push({name,ok:false,error:error.stack});console.error('FAIL '+name+': '+error.message);}}
async function disposeAll(){await page.evaluate(()=>{for(const el of document.querySelectorAll('[data-test-scene]'))NightScene.dispose(el);});}
async function mount(id,options={}){await page.evaluate(({id,options})=>NightScene.mount(document.getElementById(id),options),{id,options});await page.waitForFunction(id=>NightScene.inspect(document.getElementById(id)).ready,id);}
const info=id=>page.evaluate(id=>NightScene.inspect(document.getElementById(id)),id);
const delay=ms=>page.waitForTimeout(ms);
(async()=>{
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:report.launchArgs});
  try{
    page=await browser.newPage({viewport:{width:1200,height:900},deviceScaleFactor:1});page.on('pageerror',e=>report.errors.push(e.message));page.on('request',r=>{if(/^https?:/i.test(r.url()))report.externalRequests.push(r.url());});
    await page.setContent('<!doctype html><html lang="zh-CN"><body style="margin:0;background:#0b1b23;color:#dbe8e4"><div id="map" data-test-scene style="width:1200px;height:440px"></div><div style="display:flex"><div id="cat" data-test-scene style="width:600px;height:440px"></div><div id="sword" data-test-scene style="width:600px;height:440px"></div></div><div id="battle" data-test-scene style="width:1200px;height:440px"></div><div id="fallback" data-test-scene style="width:600px;height:300px"></div></body></html>');
    await page.addScriptTag({content:source});await page.evaluate(()=>{
      window.testMap=Array.from({length:10},(_,f)=>Array.from({length:f===0||f===9?1:4},(_,lane)=>({id:`f${f+1}-${lane}`,floor:f+1,lane,type:f===9?'boss':f===0?'fight':['fight','event','rest','elite','shop','fox'][(f+lane)%6],name:'封域节点',description:'本节点只沿真实连桥前往。',next:[]})));
      for(let f=0;f<9;f++)for(const node of testMap[f])node.next=testMap[f+1].filter(n=>Math.abs(n.lane-node.lane)<=1).map(n=>n.id);
      window.selected=[];NightScene.mount(document.getElementById('map'),{mode:'map',character:'sword',map:testMap,availableNodes:['f3-0','f3-1'],history:[{id:'f1-0'},{id:'f2-0'}],currentNode:'f2-0',onNode:id=>selected.push(id)});
      NightScene.mount(document.getElementById('cat'),{mode:'character',character:'assassin'});NightScene.mount(document.getElementById('sword'),{mode:'character',character:'sword'});
    });

    await check('default Chromium creates actual WebGL meshes and colored depth-tested pixels',async()=>{
      await page.waitForFunction(()=>['map','cat','sword'].every(id=>NightScene.inspect(document.getElementById(id)).ready));
      const results=await page.evaluate(()=>['map','cat','sword'].map(id=>{
        const root=document.getElementById(id);NightScene.sync(root,{motion:'reduced'});const canvas=root.querySelector('canvas'),gl=canvas.getContext('webgl'),pixels=new Uint8Array(canvas.width*canvas.height*4);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);let solid=0;const colors=new Set();for(let p=0;p<pixels.length;p+=4)if(pixels[p+3]){solid++;colors.add(pixels[p]+','+pixels[p+1]+','+pixels[p+2]);}return{id,info:NightScene.inspect(root),solid,colors:colors.size,glError:gl.getError(),depthTest:gl.isEnabled(gl.DEPTH_TEST),contextVersion:gl.getParameter(gl.VERSION)};
      }));
      for(const r of results){assert.ok(r.info.vertices>500);assert.equal(r.info.triangles,r.info.vertices/3);assert.ok(r.solid>1000);assert.ok(r.colors>25);assert.equal(r.glError,0);assert.equal(r.depthTest,true);assert.match(r.contextVersion,/WebGL/);}report.actualMeshes=results;
    });
    await check('assassin and ice swordswoman use different geometry, silhouettes and palette',async()=>{
      const cat=await info('cat'),sword=await info('sword');assert.notEqual(cat.modelSignature,sword.modelSignature);assert.notEqual(cat.vertices,sword.vertices);assert.equal(cat.character,'assassin');assert.equal(sword.character,'sword');
      fs.mkdirSync('/workspace/scratch',{recursive:true});await page.locator('#cat').screenshot({path:'/workspace/scratch/v5-scene-cat.png'});await page.locator('#sword').screenshot({path:'/workspace/scratch/v5-scene-sword.png'});report.characterSignatures={assassin:cat.modelSignature,sword:sword.modelSignature};
    });
    await check('3D map follows engine graph, readable future labels and keyboard-ready current nodes',async()=>{
      const map=await info('map');assert.equal(map.projections.length,34);assert.deepEqual(map.availableNodes,['f3-0','f3-1']);assert.equal(await page.locator('#map button:not(:disabled)').count(),2);
      const buttons=await page.locator('#map button').evaluateAll(elements=>elements.map(el=>({id:el.dataset.node,action:el.dataset.action,label:el.getAttribute('aria-label'),disabled:el.disabled,opacity:Number(getComputedStyle(el).opacity),left:parseFloat(el.style.left),top:parseFloat(el.style.top)})));
      assert.equal(buttons.filter(b=>!b.disabled).length,2);for(const b of buttons){assert.equal(b.action,'node');assert.ok(b.label.includes('段'));assert.ok(b.left>0&&b.left<1200);assert.ok(b.top>0&&b.top<440);if(!['f1-0','f2-0'].includes(b.id))assert.ok(b.opacity>=.70);}
      await page.locator('#map').screenshot({path:'/workspace/scratch/v5-scene-map.png'});report.mapLabels=buttons;
    });
    await check('available projected node really calls once; unavailable and duplicate activation are refused',async()=>{
      await page.locator('#map [data-scene-node="f3-0"]').click();await page.locator('#map [data-scene-node="f3-0"]').evaluate(el=>el.dispatchEvent(new MouseEvent('click',{bubbles:true})));await page.locator('#map [data-scene-node="f6-0"]').evaluate(el=>el.dispatchEvent(new MouseEvent('click',{bubbles:true})));assert.deepEqual(await page.evaluate(()=>selected),['f3-0']);await delay(400);
      await page.locator('#map [data-scene-node="f3-1"]').focus();await page.keyboard.press('Enter');assert.deepEqual(await page.evaluate(()=>selected),['f3-0','f3-1']);
    });
    await check('sync notices in-place map state changes and updates reachable projection buttons',async()=>{
      await page.evaluate(()=>{const root=document.getElementById('map'),options={mode:'map',map:testMap,character:'sword',availableNodes:['f4-0'],history:[{id:'f1-0'},{id:'f2-0'},{id:'f3-0'}],currentNode:'f3-0'};NightScene.sync(root,options);options.availableNodes.splice(0,1,'f4-1');options.history.push({id:'f4-0'});NightScene.sync(root,options);});assert.equal(await page.locator('#map button:not(:disabled)').count(),1);assert.equal(await page.locator('#map button:not(:disabled)').getAttribute('data-node'),'f4-1');
    });
    await check('attack, hurt, guard, heal and revive deform real articulated character parts',async()=>{
      await page.locator('#sword').scrollIntoViewIfNeeded();await page.evaluate(()=>NightScene.sync(document.getElementById('sword'),{motion:'full'}));const poses=[];
      for(const type of ['attack','hurt','guard','heal','revive']){assert.equal(await page.evaluate(type=>NightScene.act(document.getElementById('sword'),type,{duration:300}),type),true);await page.waitForFunction(type=>NightScene.inspect(document.getElementById('sword')).pose?.kind===type,type);await delay(80);const status=await info('sword');assert.equal(status.animation,type);if(type==='attack'){assert.ok(status.pose.shift>0);assert.ok(status.pose.rightArm<0);}if(type==='hurt')assert.ok(status.pose.shift<0);if(type==='guard')assert.ok(status.pose.leftArm<0);poses.push(status.pose);await page.waitForFunction(()=>!NightScene.inspect(document.getElementById('sword')).animation);}
      report.actionPoses=poses;
    });
    await check('pointer look moves head independently of animated hair and tail',async()=>{
      await page.locator('#cat').scrollIntoViewIfNeeded();await page.evaluate(()=>NightScene.sync(document.getElementById('cat'),{motion:'full'}));const rect=await page.locator('#cat').boundingBox();await page.mouse.move(rect.x+rect.width*.1,rect.y+rect.height*.4);await delay(90);const left=await info('cat');await page.mouse.move(rect.x+rect.width*.9,rect.y+rect.height*.4);await delay(90);const right=await info('cat');assert.ok(left.look.x<right.look.x);assert.ok(left.pose.headYaw<right.pose.headYaw);assert.notEqual(right.pose.hair,right.pose.tail);report.pointer={left:left.pose,right:right.pose};
    });
    await check('reduced motion freezes frames and ignores actions, while scene data can still sync',async()=>{
      await page.evaluate(()=>{for(const el of document.querySelectorAll('[data-test-scene]'))if(NightScene.inspect(el).alive)NightScene.sync(el,{motion:'reduced'});});await delay(150);const before=await info('cat');await page.mouse.move(1000,100);await delay(180);const after=await info('cat');assert.equal(after.frames,before.frames);assert.equal(after.pose.headYaw,0);assert.equal(after.pose.tail,0);assert.equal(await page.evaluate(()=>NightScene.act(document.getElementById('cat'),'attack')),false);assert.equal(await page.evaluate(()=>NightScene.inspect().rafCount),0);
    });
    await check('same-root mounting reuses one canvas; repeated disposal and detached roots release scheduler',async()=>{
      const positioned=await page.evaluate(()=>{const root=document.createElement('div');root.style='position:absolute;left:-3000px;top:0;width:500px;height:250px';document.body.append(root);NightScene.mount(root,{mode:'battle',character:'sword',motion:'reduced'});const before=getComputedStyle(root).position;NightScene.dispose(root);const after=root.style.position;root.remove();return{before,after};});assert.deepEqual(positioned,{before:'absolute',after:'absolute'});
      await disposeAll();await page.locator('#sword').scrollIntoViewIfNeeded();await mount('sword',{mode:'character',character:'sword'});const before=await info('sword');await page.evaluate(()=>{const root=document.getElementById('sword');for(let i=0;i<25;i++)NightScene.mount(root,{mode:'character',character:'sword'});});const after=await info('sword');assert.equal(after.id,before.id);assert.equal(after.canvasCount,1);assert.equal(await page.evaluate(()=>NightScene.inspect().instances),1);
      await page.evaluate(()=>document.getElementById('sword').remove());await delay(180);assert.equal(await page.evaluate(()=>NightScene.inspect().instances),0);assert.equal(await page.evaluate(()=>NightScene.inspect().rafCount),0);await page.evaluate(()=>{const root=document.createElement('div');root.id='sword';root.dataset.testScene='';root.style='width:600px;height:440px';document.body.prepend(root);});
    });
    await check('document-hidden fixture pauses shared RAF, then resumes; truly offscreen model also pauses',async()=>{
      await mount('sword',{mode:'character',character:'sword'});await delay(100);await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});const before=await info('sword');await delay(150);assert.equal((await info('sword')).frames,before.frames);assert.equal(await page.evaluate(()=>NightScene.inspect().rafCount),0);await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});await delay(150);assert.ok((await info('sword')).frames>before.frames);await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));await delay(200);const off=await info('sword');assert.equal(off.visible,false);await delay(180);assert.equal((await info('sword')).frames,off.frames);await page.locator('#sword').scrollIntoViewIfNeeded();await delay(150);assert.ok((await info('sword')).frames>off.frames);report.visibilityMethod='document.hidden fixture plus genuine IntersectionObserver scroll-offscreen';
    });
    await check('battle scene contains hero and distinct modeled guardian; WebGL denial falls back without script failure',async()=>{
      await disposeAll();await page.locator('#battle').scrollIntoViewIfNeeded();await mount('battle',{mode:'battle',character:'sword',enemyId:'snake',motion:'reduced'});const battle=await info('battle');assert.ok(battle.vertices>3000);assert.ok(battle.parts>=8);await page.locator('#battle').screenshot({path:'/workspace/scratch/v5-scene-battle.png'});report.battle=battle;
      const denied=await page.evaluate(()=>{const root=document.getElementById('fallback'),method=HTMLCanvasElement.prototype.getContext;try{HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl'?null:method.call(this,type,...args);};NightScene.mount(root,{mode:'map',map:testMap,availableNodes:['f1-0']});return{info:NightScene.inspect(root),message:root.textContent};}finally{HTMLCanvasElement.prototype.getContext=method;}});assert.equal(denied.info.supported,false);assert.equal(denied.info.ready,false);assert.match(denied.message,/下方路线/);assert.equal(await page.locator('#fallback canvas').count(),0);
    });
    await check('zero runtime external requests, zero uncaught JS exceptions, full disposal leaves zero RAF',async()=>{
      await disposeAll();await delay(80);assert.deepEqual(report.errors,[]);assert.deepEqual(report.externalRequests,[]);assert.equal(await page.evaluate(()=>NightScene.inspect().instances),0);assert.equal(await page.evaluate(()=>NightScene.inspect().rafCount),0);
    });
    report.browser=await browser.version();
  }finally{
    await browser.close();report.passed=report.results.filter(r=>r.ok).length;report.failed=report.results.filter(r=>!r.ok).length;fs.writeFileSync(path.join(__dirname,'scene-results.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
  }
  if(report.failed)process.exitCode=1;
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
