'use strict';
// Focused real Canvas2D checks. No Cubism SDK or screenshot-only substitutes.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {chromium}=require('playwright');
const puppet=require('./puppet.js');
const root=path.resolve(__dirname,'..');
const report={renderer:'custom Canvas2D weighted mesh; not Cubism',results:[],errors:[],requests:[]};
let page,browser;
async function test(name,fn){try{await fn();report.results.push({name,ok:true});console.log('PASS '+name);}catch(e){report.results.push({name,ok:false,error:e.stack});console.error('FAIL '+name+': '+e.message);}}
const status=()=>page.evaluate(()=>NightPuppet.inspect(document.getElementById('actor')));
const fresh=async(options={})=>{
  await page.evaluate(options=>{
    const actor=document.getElementById('actor');NightPuppet.dispose(actor);
    NightPuppet.mount(actor,{hp:60,maxHp:60,...options});
  },options);
  await page.waitForFunction(()=>NightPuppet.inspect(document.getElementById('actor')).ready);
};
function artwork(name){
  const p=path.join(root,'assets/puppet/cat-'+name+'.webp');
  return fs.existsSync(p)?'data:image/webp;base64,'+fs.readFileSync(p).toString('base64'):null;
}
(async()=>{
  const normal=artwork('normal');assert.ok(normal,'Transparent normal portrait must exist before runtime checks');
  const sources={normal,wounded:artwork('wounded')||normal,critical:artwork('critical')||normal,blink:artwork('blink')};
  report.actualDamageTextures=!!artwork('wounded')&&!!artwork('critical');
  report.actualBlinkTexture=!!sources.blink;
  report.runtimeSha256=crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'puppet.js'))).digest('hex');
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  try{
    page=await browser.newPage({viewport:{width:900,height:1100},deviceScaleFactor:1});
    page.on('pageerror',e=>report.errors.push(e.message));page.on('request',r=>{if(/^https?:/i.test(r.url()))report.requests.push(r.url());});
    await page.setContent('<!doctype html><html><style>body{margin:0;background:#102325}.portrait{position:relative;width:683px;height:1024px}.portrait img{position:absolute;inset:0;width:100%;height:100%}.puppet-ready img{visibility:hidden}</style><div class="portrait" id="actor"><img id="fallback" alt="static fallback"></div></html>');
    await page.evaluate(({sources,rig})=>{globalThis.NightAssets={puppet:sources,puppetRig:rig};document.getElementById('fallback').src=sources.normal;},{sources,rig:JSON.parse(fs.readFileSync(path.join(__dirname,'puppet-rig.json'),'utf8'))});
    await page.addScriptTag({content:fs.readFileSync(path.join(__dirname,'puppet.js'),'utf8')});

    await test('inclusive 50%/25% boundaries and bounded invalid inputs',async()=>{
      for(const [hp,max,expected] of [[60,60,'normal'],[31,60,'normal'],[30,60,'wounded'],[16,60,'wounded'],[15,60,'critical'],[0,60,'critical'],[26,52,'wounded'],[13,52,'critical'],[5,0,'normal'],[NaN,60,'normal']])assert.equal(puppet.stageFor(hp,max),expected);
    });
    await test('real transparent texture rendered with 135 vertices / 224 triangles',async()=>{
      await fresh();await page.waitForFunction(()=>NightPuppet.inspect(document.getElementById('actor')).frames>=3);
      const s=await status();assert.equal(s.meshVertices,135);assert.equal(s.triangleCount,224);assert.equal(s.deformationRegions,7);assert.ok(s.frames>=3);
      const pixels=await page.locator('canvas').evaluate(c=>{const a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let opaque=0,transparent=0;for(let i=3;i<a.length;i+=4){if(a[i]>245)opaque++;if(a[i]===0)transparent++;}return{opaque,transparent};});
      assert.ok(pixels.opaque>10000);assert.ok(pixels.transparent>10000);report.renderPixels=pixels;
    });
    await test('pointer tracking changes head separately from tail / body pixels',async()=>{
      await page.mouse.move(5,150);await page.waitForTimeout(180);
      const before=await status();
      const pixels=await page.locator('canvas').evaluate(c=>({head:c.getContext('2d').getImageData(240,120,160,160).data.slice().join(','),tail:c.getContext('2d').getImageData(520,200,150,230).data.slice().join(',')}));
      await page.mouse.move(850,200);await page.waitForTimeout(240);const after=await status();
      assert.ok(after.look.targetX>before.look.targetX);assert.ok(after.look.x>before.look.x);
      assert.notEqual(after.localOffsets.head.x,after.localOffsets.tail.x);assert.notEqual(after.localOffsets.ear.y,after.localOffsets.body.y);
      const next=await page.locator('canvas').evaluate(c=>({head:c.getContext('2d').getImageData(240,120,160,160).data.slice().join(','),tail:c.getContext('2d').getImageData(520,200,150,230).data.slice().join(',')}));
      assert.notEqual(pixels.head,next.head);assert.notEqual(pixels.tail,next.tail);
      report.localOffsets={before:before.localOffsets,after:after.localOffsets};
    });
    await test('separate eyelid layer visibly blinks at calibrated eye coordinates',async()=>{
      await page.waitForFunction(()=>NightPuppet.inspect(document.getElementById('actor')).blinkTextureReady);
      assert.equal((await status()).layers,2);
      await page.mouse.move(341,340);await page.waitForTimeout(300);
      const open=await page.locator('canvas').evaluate(c=>c.getContext('2d').getImageData(260,140,100,70).data.slice().join(','));
      await page.evaluate(()=>NightPuppet.act(document.getElementById('actor'),'blink',{duration:1000}));
      await page.waitForFunction(()=>NightPuppet.inspect(document.getElementById('actor')).blinkAmount>.97);
      fs.mkdirSync('/workspace/scratch',{recursive:true});
      await page.screenshot({path:'/workspace/scratch/v4-puppet-blink.png',clip:{x:215,y:100,width:200,height:150}});
      const closed=await page.locator('canvas').evaluate(c=>c.getContext('2d').getImageData(260,140,100,70).data.slice().join(','));
      assert.notEqual(open,closed);
      assert.ok((await status()).blinkAmount>.6);await page.waitForTimeout(700);assert.ok((await status()).blinkAmount<.05);
    });
    await test('HP state switches and healing restores normal without mutating caller HP',async()=>{
      const pictures={};
      for(const [hp,expected] of [[30,'wounded'],[15,'critical'],[16,'wounded'],[31,'normal']]){
        await page.evaluate(hp=>NightPuppet.sync(document.getElementById('actor'),{hp,maxHp:60}),hp);
        await page.waitForFunction(stage=>NightPuppet.inspect(document.getElementById('actor')).loadedStage===stage&&NightPuppet.inspect(document.getElementById('actor')).ready,expected);
        await page.waitForTimeout(220);
        pictures[expected]=await page.locator('canvas').evaluate(c=>c.toDataURL());
        assert.equal((await status()).stage,expected);
      }
      assert.notEqual(pictures.normal,pictures.wounded);assert.notEqual(pictures.wounded,pictures.critical);
      report.damageTextureHashes=Object.fromEntries(Object.entries(pictures).map(([key,data])=>[key,crypto.createHash('sha256').update(data).digest('hex')]));
    });
    await test('attack, hurt and revive deform the mesh; guard and heal finish safely',async()=>{
      for(const type of ['attack','hurt','guard','heal','revive']){
        assert.equal(await page.evaluate(type=>NightPuppet.act(document.getElementById('actor'),type,{amount:12}),type),true);
        assert.equal((await status()).animation,type);await page.waitForTimeout(80);
        assert.ok((await status()).frames>0);
        await page.waitForFunction(()=>NightPuppet.inspect(document.getElementById('actor')).animation===null,null,{timeout:3000});
      }
    });
    await test('reduced motion freezes idle, pointer and blink while damage stages still change',async()=>{
      await page.evaluate(()=>NightPuppet.sync(document.getElementById('actor'),{motion:'reduced'}));
      await page.waitForTimeout(260);const before=await status();await page.mouse.move(30,700);await page.waitForTimeout(180);const after=await status();
      assert.equal(after.frames,before.frames);assert.equal(after.blinkAmount,0);assert.equal(after.look.x,0);
      assert.equal(await page.evaluate(()=>NightPuppet.act(document.getElementById('actor'),'blink')),false);
      await page.evaluate(()=>NightPuppet.sync(document.getElementById('actor'),{hp:15}));await page.waitForFunction(()=>NightPuppet.inspect(document.getElementById('actor')).stage==='critical'&&NightPuppet.inspect(document.getElementById('actor')).ready);
      assert.equal((await status()).stage,'critical');assert.equal(await page.evaluate(()=>NightPuppet.inspect().rafCount),0);
    });
    await test('visibility pause stops animation frames (explicit document.hidden fixture)',async()=>{
      await fresh();await page.waitForTimeout(100);
      await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
      const before=await status();await page.waitForTimeout(180);assert.equal((await status()).frames,before.frames);assert.equal(await page.evaluate(()=>NightPuppet.inspect().rafCount),0);
      await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});await page.waitForTimeout(120);assert.ok((await status()).frames>before.frames);
    });
    await test('same-root mounting reuses one canvas; dispose and detached root stop RAF',async()=>{
      const first=await status();await page.evaluate(()=>NightPuppet.mount(document.getElementById('actor'),{hp:60,maxHp:60}));assert.equal((await status()).id,first.id);assert.equal(await page.locator('canvas').count(),1);
      await page.evaluate(()=>NightPuppet.dispose(document.getElementById('actor')));assert.equal(await page.locator('canvas').count(),0);assert.equal(await page.evaluate(()=>NightPuppet.inspect().instances),0);assert.equal(await page.evaluate(()=>NightPuppet.inspect().rafCount),0);
      await fresh();await page.evaluate(()=>document.getElementById('actor').remove());await page.waitForTimeout(80);assert.equal(await page.evaluate(()=>NightPuppet.inspect().instances),0);
      await page.evaluate(()=>{const actor=document.createElement('div');actor.id='actor';actor.className='portrait';actor.innerHTML='<img id="fallback">';document.body.append(actor);});
    });
    await test('missing portrait preserves static fallback and creates no unhandled exception',async()=>{
      await page.evaluate(()=>NightPuppet.mount(document.getElementById('actor'),{sources:{normal:'data:image/webp;base64,broken'},hp:60,maxHp:60}));
      await page.waitForFunction(()=>document.getElementById('actor').classList.contains('puppet-failed'));
      assert.equal((await status()).ready,false);assert.equal(await page.evaluate(()=>document.getElementById('actor').classList.contains('puppet-ready')),false);
      await page.evaluate(()=>NightPuppet.dispose(document.getElementById('actor')));
    });
    await test('zero runtime HTTP(S) requests and zero uncaught script errors',async()=>{assert.deepEqual(report.errors,[]);assert.deepEqual(report.requests,[]);});
  }finally{
    await browser.close();report.passed=report.results.filter(r=>r.ok).length;report.failed=report.results.filter(r=>!r.ok).length;
    fs.mkdirSync('/workspace/scratch',{recursive:true});fs.writeFileSync('/workspace/scratch/v4-puppet-results.json',JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify(report,null,2));
  }
  if(report.results.some(r=>!r.ok))process.exitCode=1;
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
