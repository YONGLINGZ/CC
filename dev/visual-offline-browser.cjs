'use strict';
// Inline and folder builds served locally with external network blocked.
// This deliberately makes no file:// or physical-device claim.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),A=require('node:assert/strict');
const {createHash}=require('node:crypto'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=process.env.VISUAL_EVIDENCE||path.join(root,'docs/review-v11');
(async()=>{
 const server=http.createServer((q,r)=>{try{r.end(fs.readFileSync(path.join(root,q.url.split('?')[0])))}catch{r.statusCode=404;r.end()}}).listen(0,'127.0.0.1');
 await new Promise(resolve=>server.listening?resolve():server.once('listening',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
 const report={transport:'local HTTP, external requests blocked; file:// not tested',cases:[]};
 try{
  for(const file of ['index.html','baiyao-standalone.html']){
   const page=await browser.newPage(),errors=[],external=[],requests=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*',route=>{const url=route.request().url();if(url.startsWith(origin+'/')){requests.push(url.slice(origin.length));return route.continue();}if(url.startsWith('data:'))return route.continue();external.push(url);return route.abort();});
   await page.goto(origin+'/'+file,{timeout:120000});await page.waitForFunction(()=>window.game,null,{timeout:60000});
   await page.evaluate(()=>{game.newRun('mechanist');game.enterRegion();const n=game.getAvailableNodes()[0];n.type='boss';n.encounter={enemyId:'m15'};delete n.storyId;game.enterNode(n.id);game.state.battle.energy=50;game.squadAction('deploy','shiying');renderGame();setMotionMode('off');});
   await page.waitForFunction(()=>document.querySelector('.enemy-combatant [data-sprite-ready=true]')&&document.querySelector('[data-field-machine=shiying] [data-sprite-ready=true]'));
   const repaired=await page.evaluate(()=>[document.querySelector('.enemy-combatant [data-sprite-group]'),document.querySelector('[data-field-machine=shiying] [data-sprite-group]')].map(s=>({key:s.dataset.spriteKey,ready:s.dataset.spriteReady,diagnostics:s._spriteMotion.base.bitmap.spriteRepair,inline:s._spriteMotion.base.d.src.startsWith('data:')})));
   A.equal(repaired.length,2);for(const r of repaired){A.ok(r.diagnostics.removedMattePixels>0);A.equal(r.inline,file!=='index.html');}
   A.deepEqual(errors,[]);A.deepEqual(external,[]);if(file!=='index.html')A.deepEqual(requests,['/'+file]);
   report.cases.push({file,sha256:createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex'),repaired,errors,external,localRequests:requests.length});
   await page.close();console.log('PASS',file,'prepared m15 and shiying');
  }
  report.success=true;
 }catch(e){report.failure=e.stack;throw e}finally{fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'offline.json'),JSON.stringify(report,null,2));await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
