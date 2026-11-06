'use strict';
// Real browser fixtures exercise the built entry point, not isolated source mocks.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),A=require('node:assert/strict');
const {chromium}=require('playwright'),N=require('./engine.js');
const root=path.resolve(__dirname,'..'),out=process.env.VISUAL_EVIDENCE||path.join(root,'docs/review-v11/coverage');fs.mkdirSync(out,{recursive:true});
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


 report.actions=[];
 async function rows(selector,actions,identity){await page.waitForFunction(sel=>document.querySelector(sel)?.querySelector('[data-sprite-ready=true]'),selector);for(const [row,action] of actions.entries()){
 const result=await page.locator(selector).evaluate(async(el,{action,row})=>{const s=el.querySelector('[data-sprite-group]');delete el.dataset.bossIntent;const player=s.classList.contains('actor-sprite');(player?NightActors:NightEncounterActors).play(el,action,'full','full');const a=s._spriteMotion,active=a?.state;const start=Number(s.dataset.spriteSamples);await new Promise(r=>setTimeout(r,100));return {key:s.dataset.spriteKey,action,expectedRow:row,row:active?.row,status:s.dataset.spriteStatus,samples:Number(s.dataset.spriteSamples)-start,src:active?.asset?.d?.src};},{action,row});
 report.actions.push({...identity,...result});A.equal(result.key,identity.expectedKey||identity.enemy||identity.machine);A.equal(result.row,row);A.equal(result.status,'ready');A.ok(result.samples>0);fs.writeFileSync(out+'/all-actions.json',JSON.stringify(report,null,2));}}
 for(const [role,kind]of Object.entries({assassin:'cat',sword:'sword',hehuan:'hehuan',mechanist:'tinglan',sovereign:'feiye'}))for(const outfit of ['',...Object.values(N.OUTFITS).filter(o=>o.characters.includes(role)).map(o=>o.id)])for(const fallen of role==='sword'?[false,true]:[false]){console.log('role',role,outfit,fallen);await fixture(role,outfit,fallen);await rows('.player-combatant .portrait',['idle','attack','heavy','cast','guard','hurt'],{role,outfit,fallen,expectedKey:outfit?(fallen?'sword_fallen':kind)+'-'+outfit:fallen?'sword_fallen':kind});}
 for(const enemy of [...Object.keys(N.ENEMIES),'ji']){console.log('enemy',enemy);await fixture('sword','',false,enemy);await rows('.enemy-combatant .portrait',['idle','attack','skill','hurt'],{enemy});}
 await fixture('mechanist');await page.evaluate(()=>{game.state.battle.energy=50;game.squadAction('deploy','mingdi');renderGame()});for(const id of ['chengshan','mingdi','shiying']){if(id==='shiying')await page.evaluate(()=>{game.squadAction('recall','mingdi');game.squadAction('deploy','shiying');renderGame()});await rows('[data-field-machine='+id+'] .machine-portrait',['idle','attack','skill','hurt'],{machine:id});}
 A.deepEqual(report.errors,[]);A.equal(report.actions.length,426);A.equal(new Set(report.actions.filter(r=>r.role).map(r=>r.expectedKey)).size,27);A.equal(new Set(report.actions.filter(r=>r.enemy).map(r=>r.enemy)).size,63);A.equal(new Set(report.actions.filter(r=>r.machine).map(r=>r.machine)).size,3);report.success=true;
 }catch(e){report.failure=e.stack;throw e}finally{fs.writeFileSync(out+'/all-actions.json',JSON.stringify(report,null,2));await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
