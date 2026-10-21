/* Restore a genuinely image-free build, then play its first battle in Chromium. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),{nextCard}=require('./playtest.cjs');
const root=path.resolve(__dirname,'..'),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{
 const area=fs.mkdtempSync(path.join(os.tmpdir(),'baiyao-v6-source-browser-')),restore=path.join(root,'recovery/restore-source.sh');
 const report={uiSha256:hash(fs.readFileSync(path.join(__dirname,'ui.js'))),restoreScriptSha256:hash(fs.readFileSync(restore)),results:[],errors:[],externalRequests:[],passed:0,failed:0};
 cp.execFileSync('sh',[restore],{env:{...process.env,BAIYAO_RESTORE_ROOT:area},stdio:'pipe'});assert.equal(fs.existsSync(path.join(area,'assets')),false);
 const html=fs.readFileSync(path.join(area,'index.html'),'utf8');report.slimSha256=hash(html);
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{for(const starter of ['sword','mark']){
   const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>report.errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))report.externalRequests.push(r.url());});
   await page.setContent(html,{waitUntil:'load'});await page.locator(`[data-action="character"][data-character="${starter==='sword'?'sword':'assassin'}"]`).click();await page.locator('[data-action="start"]').click();assert.equal(await page.evaluate(()=>game.state.screen),'arrival');await page.evaluate(()=>setMotionMode('fast'));await page.locator('[data-action="arrival-enter"]').click();await page.locator('.current-routes [data-action="node"]').first().click();
   for(let i=0;i<250;i++){
    await page.waitForFunction(()=>!window.uiBusy,null,{timeout:18000});const s=await page.evaluate(()=>JSON.parse(JSON.stringify(game.state)));if(s.screen!=='battle')break;const card=nextCard(s);if(card){await page.locator(`[data-action="card"][data-card="${card.uid}"]`).click({timeout:7000});if(require('./engine.js').CARDS[card.id].target)await page.locator('[data-action="target"]').click({timeout:7000});}else await page.locator('[data-action="end-turn"]').click({timeout:7000});
   }
   await page.waitForFunction(()=>!window.uiBusy);let s=await page.evaluate(()=>JSON.parse(JSON.stringify(game.state)));assert.equal(s.screen,'reward');await page.locator('[data-action="reward"]').first().click();s=await page.evaluate(()=>JSON.parse(JSON.stringify(game.state)));assert.equal(s.floor,2);assert.equal(s.screen,'map');assert.equal(s.player.gold,80);assert.equal(s.player.deck.length,11);assert.equal(s.history.length,1);report.results.push({starter,hp:s.player.hp,gold:s.player.gold,deck:s.player.deck.length,floor:s.floor,ok:true});report.passed++;await page.close();
  }assert.deepEqual(report.errors,[]);assert.deepEqual(report.externalRequests,[]);
 }catch(error){report.failed++;report.error=error.stack;process.exitCode=1;}finally{await browser.close();fs.rmSync(area,{recursive:true,force:true});fs.writeFileSync(path.join(__dirname,'v6-source-browser-results.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
