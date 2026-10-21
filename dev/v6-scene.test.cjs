/* Real Chromium checks for progressive regional WebGL scenes. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {createGame,REGIONS}=require('./engine.js');
const source=fs.readFileSync(path.join(__dirname,'scene.js'),'utf8');
const report={runtimeSha256:crypto.createHash('sha256').update(source).digest('hex'),renderer:'Actual offline WebGL triangle meshes; procedural low-poly regional prototype',results:[],errors:[],requests:[]};
let browser,page;
async function check(name,fn){try{await fn();report.results.push({name,ok:true});console.log('PASS '+name);}catch(e){report.results.push({name,ok:false,error:e.stack});console.error('FAIL '+name+': '+e.message);}}
const info=id=>page.evaluate(id=>NightScene.inspect(document.getElementById(id)),id);
async function scene(id,options){await page.evaluate(({id,options})=>NightScene.mount(document.getElementById(id),options),{id,options});await page.waitForFunction(id=>NightScene.inspect(document.getElementById(id)).ready,id);return info(id);}
async function pixels(id){return page.evaluate(id=>{const root=document.getElementById(id);NightScene.sync(root,{motion:'reduced'});const canvas=root.querySelector('canvas'),gl=canvas.getContext('webgl'),p=new Uint8Array(canvas.width*canvas.height*4);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,p);let hash=2166136261,solid=0;const colors=new Set();for(let i=0;i<p.length;i+=4){if(p[i+3]){solid++;colors.add(p[i]+','+p[i+1]+','+p[i+2]);}for(let j=0;j<4;j++)hash=Math.imul(hash^p[i+j],16777619);}return{hash:hash>>>0,solid,colors:colors.size,error:gl.getError(),background:getComputedStyle(root).backgroundImage};},id);}
(async()=>{
  const g=createGame({rng:()=>.37});g.newRun('sword');g.enterRegion();const realMap=structuredClone(g.state.map);
  const allRevealed=realMap.map(row=>row.map(n=>({...n,revealed:true})));
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  try{
    page=await browser.newPage({viewport:{width:1280,height:1000}});page.on('pageerror',e=>report.errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))report.requests.push(r.url());});
    await page.setContent('<!doctype html><html lang="zh-CN"><body style="margin:0;background:#101d25"><div id="map" style="width:1200px;height:440px"></div><div id="arrival" style="width:1200px;height:360px"></div><div id="battle" style="width:1200px;height:440px"></div><div id="denied" style="width:700px;height:320px"></div></body></html>');
    await page.addScriptTag({content:source});
    await check('initial real run reveals only the first region in WebGL geometry and labels',async()=>{
      const first=await scene('map',{mode:'map',character:'sword',regionIndex:0,region:REGIONS[0],map:realMap,availableNodes:[realMap[0][0].id],motion:'reduced'});
      const expected=realMap.flat().filter(n=>n.floor<=4).map(n=>n.id);assert.deepEqual(first.visibleNodeIds,expected);assert.equal(first.regionIndex,0);assert.equal(first.regionId,REGIONS[0].id);assert.equal(first.projections.length,expected.length);assert.ok(first.vertices>1000);
      assert.equal(await page.locator('#map button:not(:disabled)').count(),1);assert.equal(await page.locator('#map [data-scene-node^="f5-"]').count(),0);assert.equal(await page.locator('#map [data-scene-node^="f9-"]').count(),0);report.initial=first;
    });
    await check('same map instance progresses across three distinct actual modeled regions without future projections',async()=>{
      const values=[];let canvasId;
      for(let index=0;index<3;index++){
        const region=REGIONS[index],node=allRevealed[region.stages[0]-1][0];
        // Deliberately supply a fully revealed run graph. The regional scene
        // must still filter out both earlier and later region data.
        const result=await scene('map',{mode:'map',character:'sword',regionIndex:index,region,map:allRevealed,availableNodes:[node.id],currentNode:null,history:[],motion:'reduced'});
        canvasId??=result.id;assert.equal(result.id,canvasId);assert.equal(result.canvasCount,1);assert.equal(result.regionIndex,index);assert.equal(result.regionId,region.id);
        const expected=allRevealed.flat().filter(n=>n.floor>=region.stages[0]&&n.floor<=region.stages[1]).map(n=>n.id);assert.deepEqual(result.visibleNodeIds,expected);
        assert.ok(result.projections.every(p=>p.x>20&&p.x<1180&&p.y>15&&p.y<425));
        const rendered=await pixels('map');assert.equal(rendered.error,0);assert.ok(rendered.solid>1000);assert.ok(rendered.colors>25);
        assert.equal(await page.locator('#map button').count(),expected.length);const labels=await page.locator('#map button').evaluateAll(es=>es.map(e=>e.textContent));assert.ok(labels.every(s=>/^[1-4] · /.test(s.slice(1))));
        fs.mkdirSync('/workspace/scratch',{recursive:true});await page.locator('#map').screenshot({path:`/workspace/scratch/v6-scene-region-${index+1}.png`});values.push({region,result,rendered});
      }
      assert.equal(new Set(values.map(v=>v.result.worldSignature)).size,3);assert.equal(new Set(values.map(v=>v.rendered.hash)).size,3);assert.equal(new Set(values.map(v=>v.rendered.background)).size,3);assert.equal(new Set(values.map(v=>v.result.fogColor.join(','))).size,3);assert.ok(values[2].result.rebuilds>values[0].result.rebuilds);report.regions=values;
    });
    await check('arrival models rebuild their regional geometry even when only region options change',async()=>{
      const values=[];for(let index=0;index<3;index++)values.push(await scene('arrival',{mode:'arrival',character:'sword',regionIndex:index,region:REGIONS[index],motion:'reduced'}));
      assert.equal(new Set(values.map(v=>v.id)).size,1);assert.equal(new Set(values.map(v=>v.worldSignature)).size,3);assert.equal(new Set(values.map(v=>v.modelSignature)).size,1);assert.deepEqual(values.map(v=>v.regionIndex),[0,1,2]);report.arrivals=values;
    });
    await check('robbery combat renders a distinct human raider model with the hero intact',async()=>{
      const snake=await scene('battle',{mode:'battle',character:'assassin',enemyId:'snake',regionIndex:2,region:REGIONS[2],motion:'reduced'});
      const raider=await scene('battle',{mode:'battle',character:'assassin',enemyId:'raider',regionIndex:2,region:REGIONS[2],motion:'reduced'});
      assert.notEqual(raider.enemySignature,snake.enemySignature);assert.equal(raider.modelSignature,snake.modelSignature);assert.notEqual(raider.vertices,snake.vertices);assert.equal(raider.regionId,REGIONS[2].id);assert.ok(raider.enemySignature);const rendered=await pixels('battle');assert.equal(rendered.error,0);assert.ok(rendered.solid>1000);await page.locator('#battle').screenshot({path:'/workspace/scratch/v6-scene-raider.png'});report.raider={snake,raider,rendered};
    });
    await check('region scope survives blocked WebGL and keeps a readable nonblocking fallback',async()=>{
      const result=await page.evaluate(({map,region})=>{const original=HTMLCanvasElement.prototype.getContext;try{HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl'?null:original.call(this,type,...args);};const root=document.getElementById('denied');NightScene.mount(root,{mode:'map',map,regionIndex:1,region});return{info:NightScene.inspect(root),text:root.textContent,canvas:root.querySelectorAll('canvas').length};}finally{HTMLCanvasElement.prototype.getContext=original;}},{map:allRevealed,region:REGIONS[1]});
      assert.equal(result.info.supported,false);assert.equal(result.canvas,0);assert.match(result.text,/下方路线/);report.fallback=result;
    });
    await check('regional lifecycle disposes every context and sends zero runtime network requests',async()=>{
      await page.evaluate(()=>{for(const id of ['map','arrival','battle','denied'])NightScene.dispose(document.getElementById(id));});await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>NightScene.inspect().instances),0);assert.equal(await page.evaluate(()=>NightScene.inspect().rafCount),0);assert.deepEqual(report.requests,[]);assert.deepEqual(report.errors,[]);
    });
    report.browser=await browser.version();
  }finally{await browser.close();report.passed=report.results.filter(r=>r.ok).length;report.failed=report.results.filter(r=>!r.ok).length;fs.writeFileSync(path.join(__dirname,'v6-scene-results.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));}
  if(report.failed)process.exitCode=1;
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
