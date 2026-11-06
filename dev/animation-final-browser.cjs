'use strict';
// Real browser fixtures exercise the built entry point, not isolated source mocks.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),A=require('node:assert/strict');
const {chromium}=require('playwright'),N=require('./engine.js');
const root=path.resolve(__dirname,'..'),out=process.env.ANIMATION_EVIDENCE||path.join(root,'docs/review-v10');fs.mkdirSync(out,{recursive:true});
const report={buildSHA256:require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(root,'index.html'))).digest('hex'),method:'Local Chromium, explicit combat fixtures, desktop and mobile viewport emulation; not a natural playthrough or physical device test.',appearances:[],enemies:[],bossMoves:[],machines:[],effects:[],errors:[]};
(async()=>{
 const server=http.createServer((q,r)=>{try{r.end(fs.readFileSync(path.join(root,decodeURIComponent(q.url==='/'?'index.html':q.url.split('?')[0]))))}catch{r.statusCode=404;r.end()}}).listen(0,'127.0.0.1');
 await new Promise(resolve=>server.listening?resolve():server.once('listening',resolve));
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
 try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>report.errors.push(e.message));page.on('dialog',d=>d.accept());
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
 const kinds={assassin:'cat',sword:'sword',hehuan:'hehuan',mechanist:'tinglan',sovereign:'feiye'};
 for(const width of [390]){
  await page.setViewportSize({width,height:1000});
  for(const [role,kind]of Object.entries(kinds))for(const outfit of [Object.values(N.OUTFITS).find(o=>o.characters.includes(role)).id])for(const fallen of role==='sword'?[false,true]:[false]){
   console.log('appearance',width,role,outfit,fallen);
   await fixture(role,outfit,fallen);const r=await sample('.player-combatant .portrait');smooth(r);
   const expected=outfit?(fallen?'sword_fallen':kind)+'-'+outfit:fallen?'sword_fallen':kind;A.equal(r.key,expected);
   const bounds=await page.locator('.actor-sprite').boundingBox();A.ok(bounds.x>=-1&&bounds.x+bounds.width<=width+1,expected+' bounds');
   report.appearances.push({role,outfit,fallen,width,...r});fs.writeFileSync(path.join(out,'final-browser.json'),JSON.stringify(report,null,2));
   if(outfit&&['hehuan','sword','assassin'].includes(role)&&width===390)await page.screenshot({path:path.join(out,'final-appearance-'+expected+'.png')});
  }
 }
 await page.setViewportSize({width:1440,height:1000});
 for(const enemy of ['paper','m30','gate_boss','ji']){console.log('enemy',enemy);
  await fixture('sword','',false,enemy);const r=await sample('.enemy-combatant .portrait');smooth(r);A.equal(r.key,enemy);report.enemies.push(r);
 }
 const moves=await page.evaluate(()=>['gate_boss','lotus_boss','abyss_boss'].flatMap(id=>NightBossMoves.profiles[id].slice(0,1).map(m=>({id,...m}))));
 for(const move of moves){console.log('boss',move.id,move.name);await fixture('sword','',false,move.id||move.enemyId);const r=await sample('.enemy-combatant .portrait','attack',move.name||move.intentName);smooth(r);A.equal(r.active.row,move.row);A.equal(r.active.bossMove,move.name);A.ok(r.active.src.includes('/boss-actors/'),r.active.src);report.bossMoves.push({...move,...r});}
 await fixture('mechanist');await page.evaluate(()=>{game.state.battle.energy=50;game.squadAction('deploy','mingdi');renderGame()});
 for(const id of ['chengshan','mingdi','shiying']){if(id==='shiying')await page.evaluate(()=>{game.squadAction('recall','mingdi');game.squadAction('deploy','shiying');renderGame()});const r=await sample('[data-field-machine='+id+'] .machine-portrait');smooth(r);report.machines.push(r);}
 for(const [role,fallen,id,theme]of [['sword',false,'S01','frost'],['sword',true,'S01','crimson'],['hehuan',false,'H01','charm'],['assassin',false,'C01','claw']]){
  await fixture(role,'',fallen);await page.evaluate(id=>{game.state.battle.energy=30;game.state.battle.hand=[{id,uid:'audit-card'}];renderGame();window.auditEffects=[];new MutationObserver(ms=>ms.forEach(m=>m.addedNodes.forEach(n=>{if(n.nodeType===1&&n.matches('.skill-vfx'))auditEffects.push({...n.dataset,html:n.innerHTML})}))).observe(document.querySelector('.battle-stage'),{childList:true});},id);
  await page.locator('[data-action='+ (role==='hehuan'?'hehuan-now':'card') +'][data-card=audit-card]').click();await page.locator('[data-action=target]').click();await page.waitForFunction(()=>document.querySelector('.skill-vfx-impact'));await page.waitForFunction(()=>!uiBusy);
  const events=await page.evaluate(()=>auditEffects);const hit=events.find(e=>e.phase==='impact'&&e.receiver==='enemy');A.ok(hit,JSON.stringify(events));A.equal(hit.theme,theme);if(theme==='charm')A.ok(hit.html.includes('skill-heart-seal'));report.effects.push({role,fallen,id,theme,events});
 }
 await page.evaluate(()=>setMotionMode('off'));await page.waitForTimeout(100);const before=await page.evaluate(()=>NightSpriteMotion.stats().renderedSamples);await page.waitForTimeout(150);const after=await page.evaluate(()=>NightSpriteMotion.stats().renderedSamples);A.equal(after,before);
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>setMotionMode('full'));await page.waitForTimeout(100);const reduced=await page.evaluate(()=>NightSpriteMotion.stats().renderedSamples);await page.waitForTimeout(100);A.equal(await page.evaluate(()=>NightSpriteMotion.stats().renderedSamples),reduced);
 A.equal(report.appearances.length,6);A.equal(report.enemies.length,4);A.equal(report.bossMoves.length,3);A.equal(report.machines.length,3);A.equal(report.effects.length,4);
 A.deepEqual(report.errors,[]);report.success=true;console.log('PASS',report.appearances.length,'appearance/viewport cases,',report.enemies.length,'enemies,',report.bossMoves.length,'boss moves,',report.machines.length,'machines,',report.effects.length,'real card effects');
 }catch(e){report.failure=e.stack;throw e}finally{fs.writeFileSync(path.join(out,'final-browser.json'),JSON.stringify(report,null,2));await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
