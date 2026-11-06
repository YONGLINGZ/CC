'use strict';
// Frozen samples of the real renderer for visual inspection; timing is tested separately.
const fs=require('fs'),path=require('path'),http=require('http'),A=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'docs/review-v10');
(async()=>{const server=http.createServer((q,r)=>{try{r.end(fs.readFileSync(path.join(root,q.url==='/'?'index.html':q.url.split('?')[0])))}catch{r.statusCode=404;r.end()}}).listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{const page=await browser.newPage({viewport:{width:1100,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.game);
for(const [role,id,fallen,theme]of [['sword','S01',false,'frost'],['sword','S01',true,'crimson'],['hehuan','H01',false,'charm'],['assassin','C01',false,'claw']]){
 await page.evaluate(({role,fallen})=>{game.newRun(role==='assassin'?'mark':role);game.enterRegion();if(fallen)game.state.player.path.fallen=true;const n=game.getAvailableNodes()[0];n.type='boss';n.encounter={enemyId:'gate_boss'};delete n.storyId;game.enterNode(n.id);renderGame();setMotionMode('full');document.body.dataset.motion='reduced';},{role,fallen});
 await page.waitForFunction(()=>document.querySelectorAll('[data-sprite-ready=true]').length>=2);
 await page.evaluate(({role,id,fallen})=>{const el=NightCombatEffects.card(id,'enemy','full','impact','player',{character:role,fallen});clearTimeout(el._skillTimer);for(const a of el.getAnimations({subtree:true})){a.pause();a.currentTime=125;}},{role,id,fallen});
 await page.locator('.battle-stage').screenshot({path:path.join(out,'preview-'+theme+'.png')});console.log('captured',theme);
}
A.deepEqual(errors,[]);
}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1});
