'use strict';
// Real browser fixtures exercise the built entry point, not isolated source mocks.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),A=require('node:assert/strict');
const {chromium}=require('playwright'),N=require('./engine.js');
const root=path.resolve(__dirname,'..'),out=process.env.VISUAL_EVIDENCE||path.join(root,'docs/review-v11');fs.mkdirSync(out,{recursive:true});
const report={buildSHA256:require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(root,'index.html'))).digest('hex'),method:'Local Chromium; explicit frozen combat fixtures and decoded atlas checks, not a natural playthrough or physical device test.',errors:[]};
(async()=>{
 const server=http.createServer((q,r)=>{try{r.end(fs.readFileSync(path.join(root,decodeURIComponent(q.url==='/'?'index.html':q.url.split('?')[0]))))}catch{r.statusCode=404;r.end()}}).listen(0,'127.0.0.1');
 await new Promise(resolve=>server.listening?resolve():server.once('listening',resolve));
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
 try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 if(process.env.VISUAL_RENDERER==='canvas2d')await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl'?null:get.call(this,type,...args);};});
 page.on('pageerror',e=>report.errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.game);
 A.ok(await page.evaluate(()=>!!NightSpriteMotion&&!!NightCombatEffects));
 async function fixture(role='sword',outfit='',fallen=false,enemy='gate_boss'){
  await page.evaluate(({role,outfit,fallen,enemy})=>{game.importProfile({version:1,unlocks:['feiye']});game.newRun(role==='assassin'?'mark':role);game.enterRegion();game.state.player.equippedOutfit=outfit;if(fallen)game.state.player.path.fallen=true;const n=game.getAvailableNodes()[0];n.type='boss';n.encounter={enemyId:enemy==='ji'?'raider':enemy};delete n.storyId;game.enterNode(n.id);if(enemy==='ji')game.state.battle.storyEncounter={npc:'ji'};game.state.player.hp=game.state.player.maxHp=1000;game.state.battle.enemy.hp=game.state.battle.enemy.maxHp=10000;renderGame();setMotionMode('full');},{role,outfit,fallen,enemy});
 }
 async function sample(selector,action='attack',bossIntent=''){
  await page.waitForFunction(sel=>document.querySelector(sel)?.querySelector('[data-sprite-ready=true]'),selector);
  return page.locator(selector).evaluate(async(el,{action,bossIntent})=>{
   const s=el.querySelector('[data-sprite-group]');if(bossIntent){el.dataset.bossIntent=bossIntent;await NightEncounterActors.readyBoss(s.dataset.encounterId);}
   const initial=Number(s.dataset.spriteSamples||0);
   if(s.classList.contains('actor-sprite'))NightActors.play(el,action,'full');else NightEncounterActors.play(el,action,'full');
   const activated=s._spriteMotion?.state;const active={row:activated?.row,src:activated?.asset?.d?.src,bossMove:s.dataset.bossMove||''};
   const values=[];for(let i=0;i<20;i++){await new Promise(r=>setTimeout(r,20));values.push(s.dataset.spriteFrame+':'+s.dataset.spriteFraction);}
   return {key:s.dataset.spriteKey,status:s.dataset.spriteStatus,renderer:s.dataset.spriteRenderer,samples:Number(s.dataset.spriteSamples)-initial,distinct:new Set(values).size,values,active};
  },{action,bossIntent});
 }
 function smooth(result){A.equal(result.status,'ready',result.key);A.ok(result.samples>=6,JSON.stringify(result));A.ok(result.distinct>4,JSON.stringify(result));}


 report.repairs=[];
 const descriptors=await page.evaluate(()=>Object.entries(NightAssets).flatMap(([group,items])=>items&&typeof items==='object'?Object.entries(items).filter(([,d])=>d?.repair).map(([key,d])=>({group,key,...d})):[]));
 const expectedRepairs=['actorAppearances:cat-mist','actorAppearances:cat-lotus','actorAppearances:cat-ember','actorAppearances:cat-moon','actorAppearances:cat-blood','actorAppearances:hehuan-dusk_silk','actorAppearances:hehuan-crimson_oath','actorAppearances:tinglan-workshop','actorAppearances:feiye-moonveil','enemyActors:feiye','enemyActors:m03','enemyActors:m21','enemyActors:m15','machineActors:shiying'];
 A.deepEqual(descriptors.map(d=>d.group+':'+d.key).sort(),expectedRepairs.sort(),'all audited repair plans must reach the built entry');
 for(const d of descriptors){
  const r=await page.evaluate(async d=>{const im=new Image();im.src=d.src;await im.decode();const began=performance.now();const cv=NightSpriteFrames.prepare(im,NightSpriteMotion.descriptor(d,d.columns||4,d.rows||4)),c=cv.getContext('2d'),data=c.getImageData(0,0,cv.width,cv.height).data,cols=d.columns||4,rows=d.rows||4,w=cv.width/cols,h=cv.height/rows;let nonempty=0,edge=0;
   for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){let any=false;for(let y=0;y<h;y++)for(let x=0;x<w;x++){const a=data[((row*h+y)*cv.width+col*w+x)*4+3];if(a>64)any=true;if((x===0||y===0||x===w-1||y===h-1)&&a>4)edge++;}if(any)nonempty++;}return {key:d.key,group:d.group,nonempty,edge,expected:cols*rows,width:cv.width,height:cv.height,prepareMs:Math.round(performance.now()-began),diagnostics:cv.spriteRepair};},d);
  A.equal(r.nonempty,r.expected,d.key+' empty frame');A.equal(r.edge,0,d.key+' uncontained frame');A.deepEqual(r.diagnostics.ambiguousComponents,[],d.key+' entangled figures');A.ok(r.diagnostics.scale>=.7,d.key+' excessive shrink');report.repairs.push(r);
 }
 for(const [enemy,row,col]of [['m15',0,0],['m03',1,1],['m03',1,2],['feiye',1,1],['feiye',1,2],['m21',1,1]]){
  await fixture('sword','',false,enemy);await page.waitForFunction(()=>document.querySelector('.enemy-combatant [data-sprite-ready=true]'));await page.evaluate(()=>setMotionMode('off'));await page.waitForTimeout(100);
  await page.evaluate(({row,col})=>{const a=document.querySelector('.enemy-combatant [data-sprite-group]')._spriteMotion;const r={asset:a.base,row,col};a.draw(r,r,0);},{row,col});await page.locator('.battle-stage').screenshot({path:path.join(out,`enemy-${enemy}-${row}-${col}.png`)});
 }
 for(const [role,outfit,fallen]of [['sword','mist',false],['sword','mist',true],['hehuan','dusk_silk',false],['assassin','mist',false]]){
  await fixture(role,outfit,fallen);await page.waitForFunction(()=>document.querySelector('.player-combatant [data-sprite-ready=true]'));await page.evaluate(()=>setMotionMode('off'));await page.waitForTimeout(100);
  await page.evaluate(()=>{const a=document.querySelector('.player-combatant [data-sprite-group]')._spriteMotion;window.va=a;window.vf={asset:a.base,row:2,col:3};window.vt={asset:a.base,row:2,col:4};a.draw(vf,vt,.5);});
  await page.waitForFunction(()=>{va.draw(vf,vt,.5);return va.el.dataset.spriteInterpolation==='motion-field'});await page.locator('.player-combatant .portrait').screenshot({path:path.join(out,`handoff-${role}-${fallen}.png`)});
 }

 for(const outfit of ['blood','moon','ember']){
  await fixture('assassin',outfit);await page.waitForFunction(()=>document.querySelector('.player-combatant [data-sprite-ready=true]'));await page.evaluate(()=>setMotionMode('off'));await page.waitForTimeout(100);
  for(const col of [3,4,5,6]){await page.evaluate(col=>{const a=document.querySelector('.player-combatant [data-sprite-group]')._spriteMotion;const f={asset:a.base,row:2,col};a.draw(f,f,0);},col);await page.locator('.player-combatant .portrait').screenshot({path:path.join(out,`cat-${outfit}-heavy-${col}.png`)});}
 }
 await fixture('mechanist');await page.evaluate(()=>{game.state.battle.energy=50;game.squadAction('deploy','shiying');renderGame()});await page.waitForFunction(()=>document.querySelector('[data-field-machine=shiying] [data-sprite-ready=true]'));await page.evaluate(()=>setMotionMode('off'));await page.waitForTimeout(100);await page.evaluate(()=>{const a=document.querySelector('[data-field-machine=shiying] [data-sprite-group]')._spriteMotion;const r={asset:a.base,row:2,col:2};a.draw(r,r,0)});await page.locator('.battle-stage').screenshot({path:path.join(out,'machine-shiying.png')});
 report.renderer=await page.evaluate(()=>document.querySelector('.enemy-combatant [data-sprite-group]').dataset.spriteRenderer);if(process.env.VISUAL_RENDERER)A.equal(report.renderer,process.env.VISUAL_RENDERER);A.deepEqual(report.errors,[]);report.success=true;
 }catch(e){report.failure=e.stack;throw e}finally{fs.writeFileSync(path.join(out,'visual-browser.json'),JSON.stringify(report,null,2));await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
