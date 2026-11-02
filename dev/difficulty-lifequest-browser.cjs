'use strict';
const fs=require('fs'),path=require('path'),http=require('http'),A=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=process.env.REVIEW_OUTPUT||'/workspace/difficulty-evidence';fs.mkdirSync(out,{recursive:true});
const report={method:'Actual Chromium button checks with explicit map/combat fixtures; battle proofs settled through real rule API using 1HP enemies. Not natural runs or player win rates.',checks:[],errors:[]};
(async()=>{const server=http.createServer((q,r)=>{try{r.end(fs.readFileSync(path.join(root,q.url==='/'?'index.html':decodeURIComponent(q.url))));}catch{r.statusCode=404;r.end();}}).listen(0,'127.0.0.1');await new Promise(r=>server.on('listening',r));const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']}),page=await browser.newPage({viewport:{width:390,height:844}});page.on('pageerror',e=>report.errors.push(e.message));
const click=async(a,extra='')=>{await page.waitForFunction(()=>!window.uiBusy);await page.locator('[data-action="'+a+'"]'+extra).first().click();await page.waitForFunction(()=>!window.uiBusy);};
for(const role of ['mark','sword','hehuan','mechanist','sovereign'])for(const reward of ['fox','ninelives']){
 await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.game);
 await page.evaluate(role=>{game.importProfile({version:1,unlocks:['feiye']});game.newRun(role);game.enterRegion();for(const id of ['hehuan','mechanist'])if(game.state.journey[id])game.state.journey[id].stage=3;game.state.player.gold=100;
 window.reviewAt=(floor,type,id)=>{const s=game.state,n=s.map[floor-1][0];s.screen='map';s.floor=floor;s.journey.regionIndex=Math.floor((floor-1)/10);s.history=s.history.filter(x=>x.floor!==floor);n.type=type;n.revealed=true;delete n.encounter;delete n.storyId;if(id)n.encounter={enemyId:id};s.availableNodes=[n.id];game.enterNode(n.id);renderGame();};
 window.reviewWin=(floor,kind,id)=>{reviewAt(floor,kind,id);const b=game.state.battle;b.enemy.hp=1;b.enemy.block=0;b.hand=[{id:'C01',uid:'proof'}];b.energy=10;game.playCard('proof',true);if(game.state.screen!=='reward')throw Error('fixture failed');if(game.state.reward.relicPending)game.chooseRelic(game.state.reward.relicChoices[0]);game.chooseReward(null);renderGame();};reviewAt(2,'rest');},role);
 await click('life-quest','[data-choice="start"]');A.equal(await page.evaluate(()=>game.lifeQuestStatus().stage),'trial');await page.evaluate(()=>reviewAt(3,'fox'));A.ok(await page.locator('[data-choice="temper"]').isDisabled());await click('fox','[data-sign="false"]');
 await page.evaluate(()=>{reviewWin(4,'fight','paper');reviewWin(10,'boss','gate_boss');reviewAt(12,'rest');});await click('life-quest','[data-choice="temper"]');
 await page.evaluate(()=>{reviewWin(20,'boss','camp_boss');reviewAt(22,'fox');});await click('life-quest','[data-choice="'+reward+'"]');A.equal(await page.evaluate(()=>game.lifeQuestStatus().stage),'claimed');A.ok(await page.evaluate(id=>game.state.player.relics.includes(id),reward));
 await page.evaluate(()=>reviewAt(24,'rest'));A.equal(await page.locator('[data-action="life-quest"]').count(),0);A.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await click('journal');A.match(await page.locator('#modal-root').innerText(),/续灯长约/);A.match(await page.locator('#modal-root').innerText(),/已领灯火/);
 await page.screenshot({path:out+'/quest-'+role+'-'+reward+'.png',fullPage:true});
 report.checks.push({role,reward,ok:true});console.log('PASS',role,reward);
}
A.deepEqual(report.errors,[]);report.version=await page.evaluate(()=>NightRelease.id);await browser.close();server.close();fs.writeFileSync(out+'/quest-browser-results.json',JSON.stringify(report,null,2));
})().catch(e=>{report.error=e.stack;fs.writeFileSync(out+'/quest-browser-results.json',JSON.stringify(report,null,2));console.error(e);process.exit(1)});
