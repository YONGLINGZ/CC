/* V5 integration: labelled fixtures are separate from natural DOM runs. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const target=path.resolve(process.argv[2]||path.join(__dirname,'..','index.html'));
const inlineTarget=path.resolve(process.argv[3]||path.join(path.dirname(target),'baiyao-standalone.html'));
const report={target,inlineTarget,results:[],errors:[],externalRequests:[],localRequests:[],expectedMissingRequests:[]};
let browser,page,server,origin;
const state=()=>page.evaluate(()=>JSON.parse(JSON.stringify(game.state)));
const idle=()=>page.waitForFunction(()=>!window.uiBusy,null,{timeout:18000});
async function click(action,filter=''){await idle();const loc=page.locator(`[data-action="${action}"]${filter}:not(:disabled)`);await loc.first().click({timeout:7000});}
async function newRun(starter='classic'){await idle();await page.evaluate(starter=>{game.newRun(starter);renderGame();setMotionMode('fast');},starter);}
async function fixture(cards=[],options={}){
  await newRun(options.starter||'classic');await page.evaluate(({cards,options})=>{
    game.enterNode(game.state.availableNodes[0]);const s=game.state,b=s.battle;
    Object.assign(s.player,{hp:options.hp??60,maxHp:options.maxHp??60,relics:options.relics??(s.character==='sword'?['frostseal']:['bell'])});
    Object.assign(b,{phase:'player',hand:cards.map((id,i)=>({id,uid:'v5-'+i})),draw:[],discard:[],exhaust:[],energy:options.energy??20,block:options.block??0,poison:options.poison??0,swordIntent:options.swordIntent??0});
    const id=options.enemy??'ape';Object.assign(b.enemy,{id,name:NightPact.ENEMIES[id].name,hp:options.enemyHp??500,maxHp:500,block:options.enemyBlock??0,mark:options.mark??0,chill:options.chill??0,intentIndex:options.intentIndex??0});
    renderGame();setMotionMode(options.motion??'fast');
  },{cards,options});
}
async function play(id){await click('card',`[data-id="${id}"]`);if(await page.evaluate(id=>NightPact.CARDS[id].target,id))await click('target');await idle();}
async function endTurn(){await click('end-turn');await idle();}
async function portrait(){const loc=page.locator('[data-combatant="player"] .portrait').first();return await loc.count()?loc:page.locator('.portrait[data-portrait="sword"],.portrait[data-portrait="cat"]').first();}
async function currentPortrait(){return(await portrait()).evaluate(el=>({kind:el.dataset.portrait,hp:Number(el.dataset.hp),maxHp:Number(el.dataset.maxHp),stage:el.dataset.damageStage,src:el.querySelector(':scope > img')?.src,puppet:globalThis.NightPuppet?.inspect?.(el)}));}
async function observe(){await page.evaluate(()=>{
  window.v5Observer?.disconnect();window.v5Timeline=[];window.v5FX=[];
  const sample=()=>{const el=document.querySelector('[data-combatant="player"] .portrait');if(!el)return;const item={hp:Number(el.dataset.hp),stage:el.dataset.damageStage,kind:el.dataset.portrait,modelHp:game.state.player.hp};const last=v5Timeline.at(-1);if(!last||JSON.stringify(last)!==JSON.stringify(item))v5Timeline.push(item);};
  window.v5Observer=new MutationObserver(records=>{for(const r of records)for(const node of r.addedNodes)if(node.nodeType===1){if(node.dataset?.fx)v5FX.push({type:node.dataset.fx,text:node.textContent});for(const x of node.querySelectorAll?.('[data-fx]')||[])v5FX.push({type:x.dataset.fx,text:x.textContent});}sample();});
  v5Observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['data-hp','data-max-hp','data-damage-stage']});sample();
});}
const observations=()=>page.evaluate(()=>({timeline:v5Timeline,fx:v5FX}));
function containsSequence(timeline,sequence){let next=0;for(const item of timeline)if(item.hp===sequence[next]?.[0]&&item.stage===sequence[next]?.[1])next++;assert.equal(next,sequence.length,'Missing visual stages: '+JSON.stringify({sequence,timeline}));}
async function screenshot(name){fs.mkdirSync('/workspace/scratch',{recursive:true});await page.screenshot({path:`/workspace/scratch/v5-${name}.png`,fullPage:true});}
function watch(p){p.on('pageerror',error=>report.errors.push(error.message));p.on('request',request=>{const url=request.url();if(/^https?:/i.test(url)){if(url.startsWith(origin+'/'))report.localRequests.push(url.slice(origin.length));else report.externalRequests.push(url);}});}
async function test(name,fn){
  if(process.env.QA_FILTER&&!process.env.QA_FILTER.split('|').some(x=>name.includes(x)))return;
  try{await fn();report.results.push({name,ok:true});console.log('PASS '+name);}catch(e){report.results.push({name,ok:false,error:e.stack});console.error('FAIL '+name+': '+e.message);}
  finally{await idle();await page.evaluate(()=>{window.v5Observer?.disconnect();document.querySelector('#modal-root [data-action="close"]')?.click();setMotionMode('fast');});}
}
async function reward(){let s=await state();if(s.reward.relicPending){const preference=['moonheart','dream','ninelives','godblood','vial','jade','moon','mirror','silk','fang','bloodstone'];const id=[...s.reward.relicChoices].sort((a,b)=>preference.indexOf(a)-preference.indexOf(b))[0];await click('choose-relic',`[data-relic="${id}"]`);s=await state();}const values={S03:10,S04:9,S05:8,S06:9,S07:10,S08:8,S09:9,S10:9,S11:10,S12:10,S13:10,S14:10,S15:10,S16:11,C16:9,C17:10,C18:10,C24:10,C28:11,C33:10,C34:9,C36:9};await click('reward',`[data-id="${[...s.reward.cards].sort((a,b)=>(values[b]||5)-(values[a]||5))[0]}"]`);}
async function autoBattle(){const {nextCard}=require('./playtest.cjs');for(let i=0;i<600;i++){const s=await state();if(s.screen!=='battle')return s.screen;const card=nextCard(s);if(card)await play(card.id);else await endTurn();}throw new Error('Battle did not terminate');}
async function naturalRun(starter){
  const attempts=[];for(let attempt=0;attempt<6;attempt++){
    await page.goto(origin+'/'+path.basename(target),{waitUntil:'load'});await page.waitForFunction(()=>window.game);await click('character',`[data-character="${starter==='sword'?'sword':'assassin'}"]`);if(starter!=='sword')await click('starter',`[data-starter="${starter}"]`);await click('start');await page.evaluate(()=>setMotionMode('fast'));const route=[];for(let step=0;step<13;step++){
      let s=await state();if(['victory','defeat'].includes(s.screen))break;assert.equal(s.screen,'map');
      const nodes=s.map.flat().filter(n=>s.availableNodes.includes(n.id)),priority={rest:s.player.hp<43?100:35,fox:85,event:80,shop:65,fight:35,elite:15,boss:5};
      const node=nodes.sort((a,b)=>priority[b.type]-priority[a.type])[0];assert.ok(node);route.push(node.type);await click('node',`[data-node="${node.id}"]`);
      if(['fight','elite','boss'].includes(node.type)){const out=await autoBattle();if(out==='reward')await reward();if(out==='defeat')break;}
      else if(node.type==='rest')await click('rest','[data-heal="true"]');
      else if(node.type==='fox')await click('fox',`[data-sign="${!(await state()).player.relics.includes('fox')}"]`);
      else if(node.type==='shop'){s=await state();if(s.player.gold>=35)await click('buy','[data-index="0"]');await click('leave-shop');}
      else if(node.type==='event'){await click('event-choice');await click('event-leave');}
    }
    const s=await state();attempts.push({result:s.screen,hp:s.player.hp,maxHp:s.player.maxHp,route,history:s.history.length});if(s.screen==='victory')return attempts;
  }throw new Error('No natural victory: '+JSON.stringify(attempts));
}
(async()=>{
  const source=fs.readFileSync(target,'utf8');report.sha256=crypto.createHash('sha256').update(source).digest('hex');
  const root=path.dirname(target),mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.webp':'image/webp','.json':'application/json','.png':'image/png'};
  server=http.createServer((req,res)=>{let requestPath;try{requestPath=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400).end();return;}const file=path.resolve(root,'.'+requestPath);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(data);});});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin=`http://127.0.0.1:${server.address().port}`;
  try{
    browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
    const filePage=await browser.newPage();try{await filePage.goto('file://'+target,{waitUntil:'load',timeout:10000});report.fileNavigation={allowed:true};}catch(e){report.fileNavigation={allowed:false,error:e.message};}finally{await filePage.close();}
    page=await browser.newPage({viewport:{width:1440,height:1060}});watch(page);await page.goto(origin+'/'+path.basename(target),{waitUntil:'load'});await page.waitForFunction(()=>window.game&&window.NightPact);await page.evaluate(()=>setMotionMode('fast'));

    await test('职业选择与魔教反噬背景：独立牌组、初始遗物和角色',async()=>{
      assert.equal(await page.locator('[data-action="character"]').count(),2);assert.match(await page.locator('#app').innerText(),/玄烬教.*实验|引灵实验/);await click('character','[data-character="sword"]');assert.equal(await page.locator('[data-action="starter"]').count(),1);assert.match(await page.locator('#app').innerText(),/沈霜白/);await screenshot('sword-title');await click('start');let s=await state();assert.equal(s.character,'sword');assert.ok(s.player.deck.every(c=>c.id.startsWith('S')));assert.deepEqual(s.player.relics,['frostseal']);assert.equal(s.map.length,10);
      await newRun('mark');s=await state();assert.equal(s.character,'assassin');assert.ok(s.player.deck.every(c=>c.id.startsWith('C')));assert.deepEqual(s.player.relics,['bell']);report.professions=await page.evaluate(()=>NightPact.CHARACTERS);
    });

    await test('剑修三档透明立绘与16技能、14异闻资源真实解码',async()=>{
      report.art=await page.evaluate(async()=>{const result=[];for(const [id,src]of [...Object.entries(NightAssets.cards).filter(([id])=>id.startsWith('S')),...Object.entries(NightAssets.puppet.sword).map(([id,src])=>['sword-'+id,src]),...NightPact.EVENT_IDS.map(id=>[id,NightAssets.events[id]])]){const img=new Image();img.src=src;await img.decode();const c=document.createElement('canvas');c.width=48;c.height=64;c.getContext('2d').drawImage(img,0,0,48,64);const pixels=c.getContext('2d').getImageData(0,0,48,64).data;let fingerprint=0;for(const n of pixels)fingerprint=(Math.imul(fingerprint,31)+n)|0;result.push({id,width:img.naturalWidth,height:img.naturalHeight,fingerprint});}return result;});
      assert.equal(report.art.filter(a=>/^S\d/.test(a.id)).length,16);assert.equal(new Set(report.art.filter(a=>/^S\d/.test(a.id)).map(a=>a.fingerprint)).size,16);assert.equal(new Set(report.art.filter(a=>a.id.startsWith('sword-')).map(a=>a.fingerprint)).size,3);assert.equal(await page.evaluate(()=>NightPact.EVENT_IDS.length),14);
      for(const [hp,stage]of [[31,'normal'],[30,'wounded'],[15,'critical']]){await fixture([],{starter:'sword',hp});const p=await currentPortrait();assert.equal(p.kind,'sword');assert.equal(p.stage,stage);assert.ok(p.src.includes('sword-'+stage));await screenshot('sword-'+stage);}
    });

    await test('十区路线类型可见、沙盘真网格点选，拒绝跳区与刷奖励',async()=>{
      await newRun('sword');const s=await state(),root=page.locator('[data-scene="map"]');await root.scrollIntoViewIfNeeded();await page.waitForFunction(()=>NightScene.inspect(document.querySelector('[data-scene="map"]'))?.ready);const info=await root.evaluate(el=>NightScene.inspect(el));assert.equal(info.supported,true);assert.ok(info.vertices>1000&&info.triangles>100);assert.equal(info.projections.length,s.map.flat().length);const later=s.map.flat().find(n=>n.floor===3);assert.equal(await page.evaluate(id=>game.enterNode(id),later.id),false);assert.equal((await state()).floor,1);await screenshot('map');await root.locator(`[data-scene-node="${s.availableNodes[0]}"]`).click();assert.equal((await state()).screen,'battle');assert.equal(await page.evaluate(id=>game.enterNode(id),s.availableNodes[0]),false);report.map={floors:s.map.length,nodes:s.map.flat().length,info};
    });

    await test('霜寒意图与三连击实际减伤一致，行动后清空；剑意积累和兑现',async()=>{
      await fixture(['S05','S03','S04'],{starter:'sword'});await play('S05');let s=await state();assert.equal(s.battle.enemy.chill,2);assert.equal(s.battle.swordIntent,1);let intent=await page.evaluate(()=>game.getIntent());assert.deepEqual(intent.hits,[1,1,1]);assert.equal(await page.locator('#intent-text').innerText(),intent.text);assert.equal(await page.locator('#enemy-chill').innerText(),'2');await play('S03');s=await state();assert.equal(s.battle.swordIntent,3);await play('S04');s=await state();assert.equal(s.battle.swordIntent,0);assert.equal(s.battle.enemy.hp,477);await endTurn();s=await state();assert.equal(s.player.hp,57);assert.equal(s.battle.enemy.chill,0);intent=await page.evaluate(()=>game.getIntent());assert.deepEqual(intent.hits,[10]);report.chill={first:[1,1,1],next:intent.hits,hp:s.player.hp};
      await fixture(['S03'],{starter:'sword',swordIntent:7});await play('S03');assert.equal((await state()).battle.swordIntent,8);
    });

    await test('剑光冰晶与猫爪演出不同，逐段动画和选敌操作锁正常',async()=>{
      report.fx={};for(const [starter,id]of [['sword','S05'],['classic','C05']]){await fixture([id],{starter,motion:'full'});await observe();await click('card',`[data-id="${id}"]`);const before=await state();await page.keyboard.press('Escape');assert.equal((await state()).battle.energy,before.battle.energy);await click('card',`[data-id="${id}"]`);await click('target');assert.equal(await page.evaluate(()=>uiBusy),true);const mid=await state();await page.evaluate(()=>{document.querySelector('[data-action="end-turn"]')?.click();document.querySelector('[data-action="target"]')?.click();});assert.equal((await state()).battle.energy,mid.battle.energy);await idle();const o=await observations();report.fx[starter]=o.fx;assert.ok(o.fx.some(x=>x.type==='afterimage'));if(starter==='sword'){assert.ok(o.fx.some(x=>/sword|frost|ice/.test(x.type)));assert.ok(!o.fx.some(x=>x.type==='claw'));}else assert.ok(o.fx.some(x=>x.type==='claw'));await screenshot(starter+'-attack');}
      await fixture(['S04'],{starter:'sword',energy:1});assert.equal(await page.locator('[data-action="card"]').isDisabled(),true);const before=await state();assert.equal(await page.evaluate(()=>game.playCard(game.state.battle.hand[0].uid,true)),false);assert.equal((await state()).battle.energy,before.battle.energy);
    });

    await test('剑修与刺客奖励及商店独立池，购买实例下场真实进入',async()=>{
      report.pool=[];for(const starter of ['sword','classic']){const prefix=starter==='sword'?'S':'C',kill=prefix+'01';await fixture([kill],{starter,enemyHp:1});await play(kill);let s=await state();assert.equal(s.screen,'reward');assert.ok(s.reward.cards.every(id=>id.startsWith(prefix)));assert.equal(new Set(s.reward.cards).size,3);const gold=s.player.gold;await reward();assert.equal((await state()).player.gold,gold);assert.equal(await page.evaluate(()=>game.chooseReward('S03')),false);
        await newRun(starter);await page.evaluate(()=>{const s=game.state,n=s.map.flat().find(n=>n.id===s.availableNodes[0]);n.type='shop';s.player.gold=100;game.enterNode(n.id);renderGame();});s=await state();assert.ok(s.shop.cards.every(c=>c.id.startsWith(prefix)));const bought=s.shop.cards[0].id;await click('buy','[data-index="0"]');s=await state();assert.equal(s.player.gold,65);assert.equal(await page.evaluate(()=>game.buyCard(0)),false);assert.equal(s.player.deck.length,11);await click('leave-shop');await page.evaluate(()=>{const s=game.state,n=s.map.flat().find(n=>n.id===s.availableNodes[0]);n.type='fight';game.enterNode(n.id);renderGame();});s=await state();assert.ok([...s.battle.hand,...s.battle.draw].some(c=>c.id===bought));assert.equal([...s.battle.hand,...s.battle.draw].length,11);report.pool.push({starter,bought});}
    });

    await test('14类异闻均有前情选择结局与一次性处理',async()=>{
      const ids=await page.evaluate(()=>NightPact.EVENT_IDS);report.events=[];for(const id of ids){await newRun('sword');await page.evaluate(id=>{const s=game.state;s.seenEvents=NightPact.EVENT_IDS.filter(x=>x!==id);s.player.gold=300;const n=s.map.flat().find(n=>n.id===s.availableNodes[0]);n.type='event';game.enterNode(n.id);renderGame();},id);let s=await state();assert.equal(s.event.id,id);assert.ok((await page.locator('.event-story').innerText()).length>20);await click('event-choice');s=await state();assert.equal(s.event.resolved,true);assert.ok(await page.locator('.event-outcome').isVisible());const snapshot=JSON.stringify(s.player);assert.equal(await page.evaluate(()=>game.chooseEvent(0)),false);assert.equal(JSON.stringify((await state()).player),snapshot);report.events.push({id,name:s.event.name,received:s.event.received});await screenshot(id==='cultlab'?'cultlab':'event-'+id);await click('event-leave');assert.equal((await state()).floor,2);assert.equal(await page.evaluate(()=>game.leaveEvent()),false);}
    });

    await test('模型实例随重绘释放，职业几何独立；动态和减少动态开关生效',async()=>{
      report.models=[];for(const starter of ['sword','classic']){await fixture([],{starter});const root=page.locator('[data-scene="battle"]');await root.scrollIntoViewIfNeeded();await page.waitForFunction(()=>NightScene.inspect(document.querySelector('[data-scene="battle"]'))?.ready);report.models.push(await root.evaluate(el=>NightScene.inspect(el)));}assert.notEqual(report.models[0].modelSignature,report.models[1].modelSignature);await page.evaluate(()=>{window.v5OldScene=document.querySelector('[data-scene="battle"]');for(let i=0;i<12;i++)renderGame();});await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>NightScene.inspect(v5OldScene)?.alive),false);assert.equal(await page.evaluate(()=>NightScene.inspect().instances),1);assert.ok(await page.evaluate(()=>NightScene.inspect().rafCount<=1));await page.evaluate(()=>setMotionMode('reduced'));const a=await page.locator('[data-scene="battle"]').evaluate(el=>NightScene.inspect(el));await page.waitForTimeout(150);const b=await page.locator('[data-scene="battle"]').evaluate(el=>NightScene.inspect(el));assert.deepEqual(a.pose,b.pose);
    });

    await test('WebGL和新图片不可用时仍可选职业、走路线及战斗',async()=>{
      const fallback=await browser.newPage();watch(fallback);await fallback.addInitScript(()=>{const old=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){if(type==='webgl'||type==='webgl2'||type==='experimental-webgl')return null;return old.call(this,type,...args);};});await fallback.route('**/assets/puppet/sword-*',route=>{report.expectedMissingRequests.push(route.request().url());return route.abort();});try{await fallback.goto(origin+'/'+path.basename(target),{waitUntil:'load'});await fallback.locator('[data-action="character"][data-character="sword"]').click();await fallback.locator('[data-action="start"]').click();assert.equal(await fallback.evaluate(()=>game.state.screen),'map');assert.equal(await fallback.evaluate(()=>NightScene.inspect(document.querySelector('[data-scene="map"]')).supported),false);await fallback.locator('.current-routes [data-action="node"]').first().click();assert.equal(await fallback.evaluate(()=>game.state.screen),'battle');assert.equal(await fallback.locator('.portrait[data-portrait="sword"] svg').count(),1);report.fallback=true;}finally{await fallback.close();}
    });

    await test('双职业正常DOM十区完整通关与重开，不修改生命费用牌组路线',async()=>{
      report.naturalRuns={};for(const starter of ['sword','mark']){report.naturalRuns[starter]=await naturalRun(starter);let s=await state();assert.equal(s.screen,'victory');assert.equal(s.history.length,10);await screenshot(starter+'-victory');await click('start');s=await state();assert.equal(s.player.hp,60);assert.equal(s.player.maxHp,60);assert.equal(s.player.gold,60);assert.equal(s.player.deck.length,10);assert.deepEqual(s.player.relics,starter==='sword'?['frostseal']:['bell']);assert.equal(s.character,starter==='sword'?'sword':'assassin');}
      await fixture(['S01'],{starter:'sword',hp:1});await endTurn();assert.equal((await state()).screen,'defeat');await click('start');assert.equal((await state()).character,'sword');assert.equal((await state()).player.hp,60);
    });

    await test('完整单文件独立空白页启动，两职业资源与场景不联网',async()=>{
      const html=fs.readFileSync(inlineTarget,'utf8'),p=await browser.newPage();const requests=[];p.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});watch(p);try{await p.setContent(html,{waitUntil:'load'});await p.waitForFunction(()=>window.game&&window.NightScene);await p.locator('[data-action="character"][data-character="sword"]').click();await p.locator('[data-action="start"]').click();assert.equal(await p.evaluate(()=>game.state.character),'sword');await p.locator('.current-routes [data-action="node"]').first().click();assert.equal(await p.evaluate(()=>game.state.screen),'battle');const art=await p.locator('.portrait[data-portrait="sword"] img').evaluate(async img=>{await img.decode();return{src:img.src.slice(0,30),width:img.naturalWidth};});assert.ok(art.src.startsWith('data:image/webp'));assert.ok(art.width>100);assert.deepEqual(requests,[]);report.inline={bytes:Buffer.byteLength(html),sha256:crypto.createHash('sha256').update(html).digest('hex'),requests};}finally{await p.close();}
    });

    await test('运行时外网请求及未捕获JavaScript异常为零',async()=>{assert.deepEqual(report.errors,[]);assert.deepEqual(report.externalRequests,[]);});

    report.browser=await browser.version();
  }finally{if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));fs.writeFileSync(path.join(__dirname,'v5-results.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,localRequests:report.localRequests.length},null,2));}
  if(report.results.some(r=>!r.ok))process.exitCode=1;
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
