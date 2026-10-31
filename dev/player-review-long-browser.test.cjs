'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),A=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out='/workspace/improvement-evidence';
const report={method:'Chromium button interactions with explicitly arranged role/card/combat fixtures; layout A/B uses identical fixtures, not ten new player runs. 360/390/430 are emulated widths, not physical phones.',checks:[],layout:[],errors:[]};
(async()=>{const server=http.createServer((q,r)=>{let f=q.url==='/baseline.html'?out+'/baseline.html':path.join(root,q.url==='/'?'index.html':decodeURIComponent(q.url));try{r.end(fs.readFileSync(f));}catch{r.statusCode=404;r.end();}}).listen(0,'127.0.0.1');await new Promise(r=>server.on('listening',r));const origin='http://127.0.0.1:'+server.address().port;const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1440,height:1050}});page.on('pageerror',e=>report.errors.push(e.message));page.on('dialog',d=>d.accept());await page.addInitScript(()=>{let seed=41;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);});
const idle=()=>page.waitForFunction(()=>!window.uiBusy);const click=async(a,x='')=>{await idle();await page.locator('[data-action="'+a+'"]'+x).first().click();await idle();};
async function fixture(role,file='index.html'){await page.goto(origin+'/'+file);await page.waitForFunction(()=>window.game);await page.evaluate(role=>{game.importProfile({version:1,unlocks:['feiye']});game.newRun(role==='assassin'?'mark':role);game.enterRegion();const n=game.getAvailableNodes()[0];n.type='fight';n.encounter={enemyId:'paper'};delete n.storyId;game.enterNode(n.id);game.state.battle.hand=({assassin:['C03','C18','C02'],sword:['S03','S04','S02'],hehuan:['H02','H03','H01'],mechanist:['J02','J07','J03'],sovereign:['F03','F07','F01']})[role].map((id,i)=>({id,uid:'review-'+i}));game.state.battle.energy=5;renderGame();},role);}
async function check(name,fn){try{await fn();report.checks.push({name,ok:true});console.log('PASS',name);}catch(e){report.checks.push({name,ok:false,error:e.stack});console.log('FAIL',name,e.message);}}

for(const file of ['baseline.html','index.html'])await check('late priest UI sample '+file,async()=>{
 await page.goto(origin+'/'+file);await page.waitForFunction(()=>window.game);
 await page.evaluate(()=>{game.newRun('sword');game.enterRegion();const s=game.state;s.player.hp=s.player.maxHp=80;s.player.level=4;s.player.relics=[];s.player.equippedWeapon='training';s.player.deck=['S01','S01','S01','S02','S02','S02','S03','S03','S04','S04','S06','S06','S08','S08','S09','S09','S14','S24'].map((id,i)=>({id,uid:'long-'+i}));s.floor=37;s.journey.regionIndex=3;s.screen='map';const n=s.map[36][0];n.type='elite';n.revealed=true;n.encounter={enemyId:'e_priest'};delete n.storyId;s.availableNodes=[n.id];if(!game.enterNode(n.id)||s.screen!=='battle')throw Error('fixture failed '+s.screen);renderGame();});
 await click('settings');await click('motion','[data-mode="fast"]');await page.keyboard.press('Escape');
 let steps=0;const trace=[];
 while(await page.locator('[data-action="end-turn"]').count()){
  if(++steps>250)throw Error('combat exceeded250 clicks');
  const view=await page.evaluate(()=>({text:document.querySelector('#app').innerText,cards:[...document.querySelectorAll('.hand [data-action="card"]')].map(e=>({id:e.dataset.id,uid:e.dataset.card,disabled:e.disabled})),turn:game.state.battle.turn,hp:game.state.player.hp,enemy:game.state.battle.enemy.hp}));
  trace.push(view);const spentDefense=trace.slice(0,-1).some(x=>x.turn===view.turn&&x.chosen==='S02');
  let c;for(const id of ['S03','S06',...(spentDefense?[]:['S02']),'S24','S08','S04','S01','S09','S14']){c=view.cards.find(c=>c.id===id&&!c.disabled);if(c)break;}
  if(c){view.chosen=c.id;await click('card','[data-card="'+c.uid+'"]');const t=page.locator('[data-action="target"]:not(:disabled)');if(await t.count())await click('target');}else{view.chosen='end';await click('end-turn');}
 }
 const result=await page.evaluate(()=>({screen:game.state.screen,hp:game.state.player.hp,turns:game.state.battle.turn,enemyMaxHp:game.state.battle.enemy.maxHp}));report.longBattles=report.longBattles||[];report.longBattles.push({file,...result,steps});fs.writeFileSync(out+'/long-'+file+'.json',JSON.stringify(trace,null,2));await page.screenshot({path:out+'/long-'+file+'.png',fullPage:true});A.ok(['reward','defeat'].includes(result.screen));
});
await browser.close();server.close();fs.writeFileSync(out+'/long-browser-results.json',JSON.stringify(report,null,2));if(report.checks.some(x=>!x.ok))process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1)});
