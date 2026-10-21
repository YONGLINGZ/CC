/* v6 integration. Tests labelled fixture deliberately arrange states; natural
 * runs use only visible choices and DOM clicks, without modifying resources. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const target=path.resolve(process.argv[2]||path.join(__dirname,'..','index.html'));
const inlineTarget=path.resolve(process.argv[3]||path.join(path.dirname(target),'baiyao-standalone.html'));
const report={format:'baiyao-v6-browser',target,inlineTarget,results:[],errors:[],externalRequests:[],localRequests:[],expectedMissingRequests:[]};
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
let browser,page,server,origin;
const state=()=>page.evaluate(()=>JSON.parse(JSON.stringify(game.state)));
const idle=()=>page.waitForFunction(()=>!window.uiBusy,null,{timeout:18000});
async function click(action,filter=''){await idle();await page.locator(`[data-action="${action}"]${filter}:not(:disabled)`).first().click({timeout:7000});}
async function newRun(starter='sword'){await idle();await page.evaluate(starter=>{game.newRun(starter);renderGame();setMotionMode('fast');},starter);}
async function enterRegion(){if((await state()).screen==='arrival'){await click('arrival-enter');assert.equal((await state()).screen,'map');}}
async function screenshot(name){fs.mkdirSync('/workspace/scratch',{recursive:true});await page.screenshot({path:`/workspace/scratch/v6-${name}.png`,fullPage:true});}
function watch(p){p.on('pageerror',error=>report.errors.push(error.message));p.on('request',request=>{const url=request.url();if(/^https?:/i.test(url)){if(url.startsWith(origin+'/'))report.localRequests.push(url.slice(origin.length));else report.externalRequests.push(url);}});}
async function test(name,fn){
  if(process.env.QA_FILTER&&!process.env.QA_FILTER.split('|').some(x=>name.includes(x)))return;
  try{await fn();report.results.push({name,ok:true});console.log('PASS '+name);}catch(e){report.results.push({name,ok:false,error:e.stack});console.error('FAIL '+name+': '+e.message);}
  finally{await idle().catch(()=>{});await page.evaluate(()=>{document.querySelector('#modal-root [data-action="close"]')?.click();setMotionMode('fast');}).catch(()=>{});}
}
async function play(id){await click('card',`[data-id="${id}"]`);if(await page.evaluate(id=>NightPact.CARDS[id].target,id))await click('target');await idle();}
async function reward(){let s=await state();if(s.reward.relicPending){const preference=['moonheart','dream','ninelives','godblood','vial','jade','moon','mirror','silk','fang','bloodstone'];const id=[...s.reward.relicChoices].sort((a,b)=>preference.indexOf(a)-preference.indexOf(b))[0];await click('choose-relic',`[data-relic="${id}"]`);s=await state();}const values={S03:10,S04:9,S05:8,S06:9,S07:10,S08:8,S09:9,S10:9,S11:10,S12:10,S13:10,S14:10,S15:10,S16:11,C16:9,C17:10,C18:10,C24:10,C28:11,C33:10,C34:9,C36:9};await click('reward',`[data-id="${[...s.reward.cards].sort((a,b)=>(values[b]||5)-(values[a]||5))[0]}"]`);}
async function autoBattle(){const {nextCard}=require('./playtest.cjs');for(let i=0;i<600;i++){const s=await state();if(s.screen!=='battle')return s.screen;const card=nextCard(s);if(card)await play(card.id);else{await click('end-turn');await idle();}}throw new Error('Battle did not terminate');}
// Fixture helper: skipped rooms become rests. This is never used in naturalRun.
async function skipToFloor(floor){await page.evaluate(floor=>{
  let guard=0;while(game.state.floor<floor){if(++guard>50)throw new Error('Fixture did not advance');const s=game.state;
    if(s.screen==='arrival'){game.enterRegion();continue;}
    if(s.screen!=='map')throw new Error('Unexpected fixture '+s.screen);
    const n=s.map.flat().find(n=>s.availableNodes.includes(n.id));n.type='rest';game.enterNode(n.id);game.rest(false);
  }renderGame();setMotionMode('fast');
},floor);}
async function openChainFirst(chain,starter='sword',jiIntent=null){await newRun(starter);await page.evaluate(jiIntent=>{game.state.player.gold=300;if(jiIntent!==null)game.state.journey.hidden.jiIntent=jiIntent;},jiIntent);await enterRegion();await skipToFloor(2);const s=await state(),node=s.map.flat().find(n=>s.availableNodes.includes(n.id)&&n.storyId===chain+'_first');assert.ok(node,'Opening for '+chain);await click('node',`[data-node="${node.id}"]`);assert.equal((await state()).event.id,chain+'_first');}
async function openChainStep(floor,expected){await skipToFloor(floor);await enterRegion();const s=await state(),node=s.map.flat().find(n=>s.availableNodes.includes(n.id));await click('node',`[data-node="${node.id}"]`);assert.equal((await state()).event.id,expected);}
async function chooseOnce(index=0){const before=await state();await click('event-choice',`[data-index="${index}"]`);const after=await state();assert.equal(after.event.resolved,true);assert.ok(await page.locator('.event-outcome').isVisible());const snapshot=JSON.stringify({player:after.player,journey:after.journey});assert.equal(await page.evaluate(index=>game.chooseEvent(index),index),false);assert.equal(JSON.stringify({player:(await state()).player,journey:(await state()).journey}),snapshot);return{before,after};}
async function leaveEvent(){await click('event-leave');}
async function openJournal(){await click('journal');const text=await page.locator('#modal-root').innerText();assert.ok(text.length>15);await click('close');return text;}
async function fixtureKill(){await page.evaluate(()=>{const s=game.state,b=s.battle;b.enemy.hp=1;b.enemy.block=0;b.energy=3;b.hand=[{id:s.character==='sword'?'S01':'C01',uid:'v6-fixture-kill'}];b.phase='player';renderGame();});await play((await state()).character==='sword'?'S01':'C01');assert.equal((await state()).screen,'reward');}
async function naturalRun(starter){
  const attempts=[];for(let attempt=0;attempt<6;attempt++){
    await page.goto(origin+'/'+path.basename(target),{waitUntil:'load'});await page.waitForFunction(()=>window.game);await click('character',`[data-character="${starter==='sword'?'sword':'assassin'}"]`);if(starter!=='sword')await click('starter',`[data-starter="${starter}"]`);await click('start');await page.evaluate(()=>setMotionMode('fast'));const route=[],arrivals=[],events=[];
    for(let step=0;step<100;step++){
      let s=await state();if(['victory','defeat'].includes(s.screen))break;
      if(s.screen==='arrival'){arrivals.push(s.journey.regionIndex);await click('arrival-enter');continue;}
      if(s.screen==='map'){
        const nodes=s.map.flat().filter(n=>s.availableNodes.includes(n.id)),priority={rest:s.player.hp<45?100:35,fox:70,event:80,shop:65,fight:35,elite:15,boss:5};
        const node=nodes.sort((a,b)=>(b.storyId==='liu_first'?200:priority[b.type])-(a.storyId==='liu_first'?200:priority[a.type]))[0];assert.ok(node);route.push({floor:s.floor,id:node.id,type:node.type});await click('node',`[data-node="${node.id}"]`);continue;
      }
      if(s.screen==='battle'){await autoBattle();continue;}
      if(s.screen==='reward'){await reward();continue;}
      if(s.screen==='rest'){await click('rest','[data-heal="true"]');continue;}
      if(s.screen==='fox'){await click('fox',`[data-sign="${!s.player.relics.includes('fox')}"]`);continue;}
      if(s.screen==='shop'){if(s.player.gold>=35)await click('buy','[data-index="0"]');await click('leave-shop');continue;}
      if(s.screen==='event'){
        if(s.event.resolved){await leaveEvent();continue;}
        const options=s.event.choices.map((choice,index)=>({choice,index})).filter(x=>!x.choice.disabled);
        const chosen=options.sort((a,b)=>{const score=x=>(x.choice.heal||0)*(s.player.hp<35?3:0.5)+(x.choice.relic?20:0)+(x.choice.cardIds?.length||0)*8+(x.choice.goldGain||0)/5-(x.choice.hpCost||0)*1.8-(x.choice.maxHpCost||0)*2-(x.choice.goldCost||0)/6;return score(b)-score(a);})[0];
        assert.ok(chosen,'legal event option');events.push({floor:s.floor,id:s.event.id,choice:chosen.index,label:chosen.choice.label});await click('event-choice',`[data-index="${chosen.index}"]`);continue;
      }
      throw new Error('Unexpected natural screen '+s.screen);
    }
    const s=await state();attempts.push({result:s.screen,hp:s.player.hp,maxHp:s.player.maxHp,route,arrivals,events,history:s.history.length,journal:s.journey.journal});if(s.screen==='victory')return attempts;
  }throw new Error('No natural victory: '+JSON.stringify(attempts));
}
(async()=>{
  const source=fs.readFileSync(target,'utf8');report.sha256=hash(source);const sourceRoot=path.resolve(__dirname,'..');report.inputs=Object.fromEntries(['dev/engine.js','dev/ui.js','dev/shell.html','dev/scene.js','dev/art.js'].map(f=>[f,hash(fs.readFileSync(path.join(sourceRoot,f)))]));
  const root=path.dirname(target),mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.webp':'image/webp','.json':'application/json','.png':'image/png'};
  server=http.createServer((req,res)=>{let requestPath;try{requestPath=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400).end();return;}const file=path.resolve(root,'.'+requestPath);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(data);});});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin=`http://127.0.0.1:${server.address().port}`;
  try{
    browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
    const filePage=await browser.newPage();try{await filePage.goto('file://'+target,{waitUntil:'load',timeout:10000});report.fileNavigation={allowed:true};}catch(e){report.fileNavigation={allowed:false,error:e.message};}finally{await filePage.close();}
    page=await browser.newPage({viewport:{width:1440,height:1060}});watch(page);await page.goto(origin+'/'+path.basename(target),{waitUntil:'load'});await page.waitForFunction(()=>window.game&&window.NightPact);await page.evaluate(()=>setMotionMode('fast'));

    await test('渐进探索：到达页、当前场景四段路线、未来场景未泄露且不能跳段',async()=>{
      await click('character','[data-character="sword"]');await click('start');let s=await state();assert.equal(s.screen,'arrival');assert.equal(s.floor,1);assert.equal(s.map.length,12);assert.equal(await page.evaluate(()=>game.enterNode(game.state.availableNodes[0])),false);await screenshot('arrival-gate');await enterRegion();s=await state();assert.equal(s.journey.regionIndex,0);
      const ids=await page.locator('#app [data-action="node"]').evaluateAll(els=>els.map(el=>el.dataset.node));assert.ok(ids.length>0);assert.ok(ids.every(id=>s.map.flat().find(n=>n.id===id).floor<=4));assert.equal(await page.locator('[data-node^="f5-"]').count(),0);assert.equal(await page.evaluate(()=>game.enterNode(game.state.map[5][0].id)),false);assert.equal((await state()).floor,1);
      const map=page.locator('[data-scene="map"]');await map.scrollIntoViewIfNeeded();await page.waitForFunction(()=>NightScene.inspect(document.querySelector('[data-scene="map"]'))?.ready);const model=await map.evaluate(el=>NightScene.inspect(el));assert.ok(model.supported&&model.vertices>1000);assert.equal(model.projections.length,s.map.slice(0,4).flat().length);report.map={initial:model};await screenshot('map-gate');
    });

    await test('fixture 三场景依次解锁并保留已走历史：A→B→C真实换景',async()=>{
      await newRun();report.regions=[];for(let i=0;i<3;i++){
        if(i)await skipToFloor(i*4+1);let s=await state();assert.equal(s.screen,'arrival');assert.equal(s.journey.regionIndex,i);assert.equal(s.history.length,i*4);await enterRegion();s=await state();
        const map=page.locator('[data-scene="map"]');await map.scrollIntoViewIfNeeded();await page.waitForFunction(()=>NightScene.inspect(document.querySelector('[data-scene="map"]'))?.ready);const model=await map.evaluate(el=>NightScene.inspect(el));assert.ok(model.supported);assert.equal(model.projections.length,s.map.slice(i*4,i*4+4).flat().length);
        const ids=await page.locator('#app [data-action="node"]').evaluateAll(els=>els.map(el=>el.dataset.node));assert.ok(ids.every(id=>{const n=s.map.flat().find(n=>n.id===id);return n.floor>i*4&&n.floor<=i*4+4;}));assert.equal(await page.evaluate(()=>game.enterRegion()),false);report.regions.push({region:i,model,visibleIds:ids});await screenshot('map-region-'+i);
      }assert.equal(new Set(report.regions.map(r=>r.model.regionId||r.model.modelSignature||r.model.vertices)).size,3);
    });

    await test('fixture 柳照青三段因果：救助、再会、援手兑现与因缘簿',async()=>{
      await openChainFirst('liu');let result=await chooseOnce(0);assert.ok(result.after.player.hp<result.before.player.hp||result.after.player.gold<result.before.player.gold);await screenshot('liu-first');await leaveEvent();await openChainStep(5,'liu_return');assert.match(await page.locator('.event-story').innerText(),/柳照青|丹霞|救|药/);result=await chooseOnce(0);report.liuReturn={received:result.after.event.received,journey:result.after.journey};await leaveEvent();await openChainStep(9,'liu_final');await chooseOnce(0);const s=await state();assert.ok(s.journey.journal.length>=3);const journal=await openJournal();assert.match(journal,/柳照青/);assert.ok(!journal.includes('jiIntent'));report.liu={journal:s.journey.journal,relationships:s.journey.relationships,final:s.event};await screenshot('liu-final');await leaveEvent();assert.equal((await state()).floor,10);
    });

    await test('fixture 季临川识宝后伏击：先读结局、实际敌人战斗、胜利只推进一次',async()=>{
      await openChainFirst('ji','sword','greedy');await chooseOnce(0);await leaveEvent();await openChainStep(5,'ji_return');const warning=(await page.locator('.event-risk').innerText());assert.match(warning,/脚印|陌生人|包裹/);const earlyJournal=await openJournal();assert.ok(!/旧恩，夺宝|反目成仇|jiIntent|greedy/.test(earlyJournal),'Journal must not reveal an unexperienced future');await chooseOnce(0);await leaveEvent();await openChainStep(9,'ji_final');
      const s=await state(),battleIndex=s.event.choices.findIndex(c=>c.battle&&!c.disabled);assert.ok(battleIndex>=0,'Expected legal actual ambush choice');await chooseOnce(battleIndex);assert.equal((await state()).screen,'event');assert.ok((await state()).event.battle);await screenshot('ji-ambush-warning');const before=await state();await leaveEvent();let b=await state();assert.equal(b.screen,'battle');assert.equal(b.battle.enemy.id,'raider');assert.equal(await page.locator('.enemy-combatant [data-portrait="ji"]').count(),1);assert.equal(b.floor,9);assert.equal(b.history.length,before.history.length);assert.equal(await page.evaluate(()=>game.leaveEvent()),false);assert.match(await page.locator('.enemy-combatant').innerText(),/季临川|夺宝|截|追/);await screenshot('ji-ambush-battle');
      await fixtureKill();const won=await state();assert.equal(won.player.gold,b.player.gold+20);await reward();b=await state();assert.equal(b.floor,10);assert.equal(b.history.length,before.history.length+1);assert.equal(await page.evaluate(()=>game.chooseReward(null)),false);assert.equal((await state()).floor,10);report.ambush={before:before.event,battle:b.battle,reward:won.reward,journal:b.journey.journal};
    });

    await test('fixture 同门人心有别：守信者还恩，戒备露宝可避开贪者伏击',async()=>{
      report.jiAlternatives=[];
      for(const branch of [{intent:'grateful',choice:0},{intent:'greedy',choice:2}]){
        await openChainFirst('ji','sword',branch.intent);await chooseOnce(0);await leaveEvent();await openChainStep(5,'ji_return');await chooseOnce(branch.choice);await leaveEvent();await openChainStep(9,'ji_final');const before=await state();assert.ok(before.event.choices.every(c=>!c.battle));
        if(branch.intent==='grateful')assert.match(before.event.name,/还你一剑/);else assert.match(before.event.story.join(''),/封着行囊|没有摸清/);
        await chooseOnce(0);const after=await state();if(branch.intent==='grateful'){assert.equal(after.player.deck.length,before.player.deck.length+1);assert.equal(after.journey.nextCombatBlock,before.journey.nextCombatBlock+10);}else assert.equal(after.player.gold,before.player.gold+12);
        report.jiAlternatives.push({branch,event:after.event,relationship:after.journey.relationships.ji});await leaveEvent();assert.equal((await state()).floor,10);
      }
    });

    await test('fixture 闻人烛被救后的麻烦与追兵：前事被后续事件记住',async()=>{
      await openChainFirst('wen');await chooseOnce(0);await leaveEvent();await openChainStep(5,'wen_return');assert.match(await page.locator('.event-story').innerText(),/闻人烛|玄烬/);const mid=await state();report.wenMiddle=mid.event;const safe=mid.event.choices.findIndex(c=>!c.disabled&&!c.battle);await chooseOnce(safe>=0?safe:0);await leaveEvent();if((await state()).screen==='battle'){await fixtureKill();await reward();}await openChainStep(9,'wen_final');const final=await state();await chooseOnce(final.event.choices.findIndex(c=>!c.disabled));const journal=await openJournal();assert.match(journal,/闻人烛/);report.wen={journal:(await state()).journey.journal,final:(await state()).event};await screenshot('wen-final');
    });

    await test('fixture 新增独立门派奇遇可选择，贫穷低血仍有安全选项',async()=>{
      report.standaloneEvents=[];for(const id of ['sect_duel','herb_caravan','relic_dispute','night_watch']){
        await newRun();await enterRegion();await page.evaluate(id=>{const s=game.state,n=s.map.flat().find(n=>s.availableNodes.includes(n.id));n.type='event';n.storyId=id;s.player.hp=1;s.player.gold=0;game.enterNode(n.id);renderGame();},id);let s=await state();assert.equal(s.event.id,id);assert.ok((await page.locator('.event-story').innerText()).length>20);const index=s.event.choices.findIndex(c=>!c.disabled&&!c.hpCost&&!c.maxHpCost&&!c.goldCost&&!c.battle);assert.ok(index>=0,'safe option '+id);await chooseOnce(index);s=await state();assert.ok(s.player.hp>0&&s.player.gold>=0);report.standaloneEvents.push({id,choice:index,received:s.event.received});await leaveEvent();assert.equal((await state()).floor,2);
      }
    });

    await test('fixture 追兵战败进入死亡结算，重开清空因缘与追踪',async()=>{
      await openChainFirst('wen');await chooseOnce(0);await leaveEvent();await openChainStep(5,'wen_return');await chooseOnce(1);await leaveEvent();await openChainStep(9,'wen_final');const before=await state(),choice=before.event.choices.findIndex(c=>c.battle&&!c.disabled);assert.ok(choice>=0);await chooseOnce(choice);await leaveEvent();assert.equal((await state()).battle.enemy.id,'raider');
      await page.evaluate(()=>{game.state.player.hp=1;game.state.player.relics=[];game.state.battle.block=0;renderGame();});await click('end-turn');await idle();const dead=await state();assert.equal(dead.screen,'defeat');assert.equal(dead.result.floor,9);assert.match(dead.result.enemy,/追猎/);assert.match(await page.locator('.ending').innerText(),/闻人烛|追猎/);await screenshot('ambush-defeat');await click('start');const fresh=await state();assert.equal(fresh.screen,'arrival');assert.equal(fresh.player.hp,60);assert.equal(fresh.player.gold,60);assert.equal(fresh.journey.chain,null);assert.equal(fresh.journey.journal.length,0);assert.deepEqual(fresh.journey.flags,{});assert.deepEqual(fresh.journey.relationships,{});assert.equal(fresh.journey.nextCombatBlock,0);report.defeat={result:dead.result,restarted:true};
    });

    await test('新事件画像、三场景和夺宝者资源实际解码且相互独立',async()=>{
      report.art=await page.evaluate(async()=>{const rows=[...NightPact.EVENT_IDS.map(id=>['event:'+id,NightAssets.events[id]]),...Object.entries(NightAssets.regions||{}).map(([id,src])=>['region:'+id,src]),...['raider','liu','ji','wen'].map(id=>['portrait:'+id,NightAssets.portraits[id]])];const out=[];for(const[id,src]of rows){if(!src)throw new Error('Missing '+id);const img=new Image();img.src=src;await img.decode();const c=document.createElement('canvas');c.width=48;c.height=64;c.getContext('2d').drawImage(img,0,0,48,64);const pixels=c.getContext('2d').getImageData(0,0,48,64).data;let fingerprint=0;for(const n of pixels)fingerprint=(Math.imul(fingerprint,31)+n)|0;out.push({id,width:img.naturalWidth,height:img.naturalHeight,fingerprint});}return out;});
      assert.equal(report.art.filter(a=>a.id.startsWith('event:')).length,27);assert.equal(report.art.filter(a=>a.id.startsWith('region:')).length,3);assert.equal(new Set(report.art.map(a=>a.fingerprint)).size,34);
    });

    await test('双职业正常DOM十二段完整通关、三次抵达与重开，不修改资源路线',async()=>{
      report.naturalRuns={};for(const starter of ['sword','mark']){report.naturalRuns[starter]=await naturalRun(starter);let s=await state();assert.equal(s.screen,'victory');assert.equal(s.history.length,12);assert.deepEqual(report.naturalRuns[starter].at(-1).arrivals,[0,1,2]);await screenshot(starter+'-victory');await click('start');s=await state();assert.equal(s.screen,'arrival');assert.equal(s.player.hp,60);assert.equal(s.player.maxHp,60);assert.equal(s.player.gold,60);assert.equal(s.player.deck.length,10);assert.deepEqual(s.player.relics,starter==='sword'?['frostseal']:['bell']);assert.equal(s.history.length,0);assert.equal(s.journey.chain,null);assert.equal(s.journey.journal.length,0);assert.equal(s.journey.nextCombatBlock,0);}
    });

    await test('图片和WebGL不可用时仍可抵达场景、选择路线并开始战斗',async()=>{
      const fallback=await browser.newPage();watch(fallback);await fallback.addInitScript(()=>{const old=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){if(type==='webgl'||type==='webgl2'||type==='experimental-webgl')return null;return old.call(this,type,...args);};});await fallback.route('**/assets/**',route=>{report.expectedMissingRequests.push(route.request().url());return route.abort();});try{await fallback.goto(origin+'/'+path.basename(target),{waitUntil:'load'});await fallback.locator('[data-action="character"][data-character="sword"]').click();await fallback.locator('[data-action="start"]').click();assert.equal(await fallback.evaluate(()=>game.state.screen),'arrival');await fallback.locator('[data-action="arrival-enter"]').click();assert.equal(await fallback.evaluate(()=>game.state.screen),'map');await fallback.locator('.current-routes [data-action="node"]').first().click();assert.equal(await fallback.evaluate(()=>game.state.screen),'battle');assert.equal(await fallback.locator('.portrait[data-portrait="sword"] svg').count(),1);report.fallback=true;}finally{await fallback.close();}
    });

    await test('完整单文件独立空白页启动并抵达首战，运行不联网',async()=>{
      const html=fs.readFileSync(inlineTarget,'utf8'),p=await browser.newPage(),requests=[];watch(p);p.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});try{await p.setContent(html,{waitUntil:'load'});await p.waitForFunction(()=>window.game&&window.NightScene);await p.locator('[data-action="character"][data-character="sword"]').click();await p.locator('[data-action="start"]').click();assert.equal(await p.evaluate(()=>game.state.screen),'arrival');await p.locator('[data-action="arrival-enter"]').click();await p.locator('.current-routes [data-action="node"]').first().click();assert.equal(await p.evaluate(()=>game.state.screen),'battle');const art=await p.locator('.portrait[data-portrait="sword"] img').evaluate(async img=>{await img.decode();return{src:img.src.slice(0,30),width:img.naturalWidth};});assert.ok(art.src.startsWith('data:image/webp')&&art.width>100);assert.deepEqual(requests,[]);report.inline={bytes:Buffer.byteLength(html),sha256:hash(html),requests};}finally{await p.close();}
    });

    await test('运行时外网请求及未捕获JavaScript异常为零',async()=>{assert.deepEqual(report.errors,[]);assert.deepEqual(report.externalRequests,[]);});
    report.browser=await browser.version();
  }finally{if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));report.passed=report.results.filter(r=>r.ok).length;report.failed=report.results.length-report.passed;fs.writeFileSync(path.join(__dirname,process.env.QA_REPORT||'v6-results.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failed:report.failed,errors:report.errors,externalRequests:report.externalRequests,sha256:report.sha256},null,2));}
  if(report.results.some(r=>!r.ok))process.exitCode=1;
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
