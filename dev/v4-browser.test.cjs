/* v4 browser integration checks. Named fixtures are distinct from the natural run. */
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const crypto=require('node:crypto');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const target=path.resolve(process.argv[2]||path.join(__dirname,'..','index.html'));
const inlineTarget=path.resolve(process.argv[3]||path.join(path.dirname(target),'baiyao-standalone.html'));
const report={target,inlineTarget,results:[],errors:[],externalRequests:[],localRequests:[],expectedMissingRequests:[]};
let browser,page,server,origin;
const catSelector='[data-combatant="player"] .portrait[data-portrait="cat"]';
const portrait=()=>page.locator(catSelector).count().then(n=>page.locator(n?catSelector:'.portrait[data-portrait="cat"]').first());
const state=()=>page.evaluate(()=>JSON.parse(JSON.stringify(game.state)));
const idle=()=>page.waitForFunction(()=>!window.uiBusy,null,{timeout:18000});
async function click(action,filter=''){await idle();await page.locator(`[data-action="${action}"]${filter}:not(:disabled)`).first().click({timeout:6000});}
async function newRun(starter='classic'){await idle();await page.evaluate(starter=>{game.newRun(starter);renderGame();},starter);}
async function fixture(cards=[],options={}){
  await newRun();await page.evaluate(({cards,options})=>{
    game.enterNode(game.state.availableNodes[0]);const s=game.state,b=s.battle;
    Object.assign(s.player,{hp:options.hp??60,maxHp:options.maxHp??60,relics:options.relics??['bell']});
    Object.assign(b,{phase:'player',hand:cards.map((id,i)=>({id,uid:'v4-'+i})),draw:[],discard:[],exhaust:[],energy:20,block:options.block??0,poison:options.poison??0});
    const id=options.enemy??'ape';Object.assign(b.enemy,{id,name:NightPact.ENEMIES[id].name,hp:500,maxHp:500,block:0,mark:0,intentIndex:options.intentIndex??0});
    renderGame();setMotionMode(options.motion??'full');
  },{cards,options});
}
async function play(id){await click('card',`[data-id="${id}"]`);if(await page.evaluate(id=>NightPact.CARDS[id].target,id))await click('target');await idle();}
async function endTurn(){await click('end-turn');await idle();}
async function currentPortrait(){return(await portrait()).evaluate(el=>({hp:Number(el.dataset.hp),maxHp:Number(el.dataset.maxHp),stage:el.dataset.damageStage,puppetStage:el.dataset.puppetStage,reaction:el.dataset.reaction||'',runtime:NightPuppet.inspect(el)}));}
async function ready(){await page.waitForFunction(selector=>{const p=document.querySelector(selector)||document.querySelector('.portrait[data-portrait="cat"]'),info=p&&NightPuppet.inspect(p);return info?.ready&&info.loadedStage===info.stage;},catSelector,{timeout:15000});}
async function observe(){await page.evaluate(selector=>{
  window.v4Observer?.disconnect();window.v4Timeline=[];window.v4FX=[];
  const sample=()=>{const p=document.querySelector(selector)||document.querySelector('.portrait[data-portrait="cat"]');if(!p)return;const entry={hp:Number(p.dataset.hp),stage:p.dataset.damageStage,puppetStage:p.dataset.puppetStage,reaction:p.dataset.reaction||'',modelHp:game.state.player.hp,busy:window.uiBusy};const previous=v4Timeline.at(-1);if(!previous||JSON.stringify(entry)!==JSON.stringify(previous))v4Timeline.push(entry);};
  window.v4Observer=new MutationObserver(records=>{for(const r of records)for(const node of r.addedNodes)if(node.nodeType===1){if(node.dataset?.fx)v4FX.push({type:node.dataset.fx,text:node.textContent});for(const child of node.querySelectorAll?.('[data-fx]')||[])v4FX.push({type:child.dataset.fx,text:child.textContent});}sample();});
  v4Observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['data-hp','data-max-hp','data-damage-stage','data-puppet-stage','data-reaction']});sample();
},catSelector);}
const observations=()=>page.evaluate(()=>({timeline:v4Timeline,fx:v4FX}));
function containsSequence(timeline,sequence){let next=0;for(const item of timeline)if(item.hp===sequence[next]?.[0]&&item.stage===sequence[next]?.[1])next++;assert.equal(next,sequence.length,'Missing ordered visual states: '+JSON.stringify({sequence,timeline}));}
async function screenshot(name){fs.mkdirSync('/workspace/scratch',{recursive:true});await page.screenshot({path:`/workspace/scratch/v4-${name}.png`,fullPage:true});}
async function test(name,fn){
  if(process.env.QA_FILTER&&!process.env.QA_FILTER.split('|').some(term=>name.includes(term)))return;
  try{await fn();report.results.push({name,ok:true});console.log('PASS '+name);}catch(error){report.results.push({name,ok:false,error:error.stack});console.error('FAIL '+name+': '+error.message);}
  finally{await idle();await page.evaluate(()=>{v4Observer?.disconnect();if(window.v4HiddenOverride){if(v4HiddenDescriptor)Object.defineProperty(document,'hidden',v4HiddenDescriptor);else delete document.hidden;v4HiddenOverride=false;document.dispatchEvent(new Event('visibilitychange'));}document.querySelector('#modal-root [data-action="close"]')?.click();window.setPuppetEnabled?.(true);setMotionMode('fast');});}
}
async function autoBattle(){const {nextCard}=require('./playtest.cjs');for(let i=0;i<500;i++){const s=await state();if(s.screen!=='battle')return s.screen;const card=nextCard(s);if(card)await play(card.id);else await endTurn();}throw new Error('Battle did not terminate');}
async function reward(){let s=await state();if(s.reward.relicPending){await click('choose-relic',`[data-relic="${s.reward.relicChoices[0]}"]`);s=await state();}const cards=s.reward.cards;await click('reward',`[data-id="${cards.find(id=>['C16','C17','C18','C28','C33','C36'].includes(id))||cards[0]}"]`);}
function watch(p){p.on('pageerror',error=>report.errors.push(error.message));p.on('request',request=>{const url=request.url();if(/^https?:/i.test(url)){if(url.startsWith(origin+'/'))report.localRequests.push(url.slice(origin.length));else report.externalRequests.push(url);}});}

(async()=>{
  const source=fs.readFileSync(target,'utf8');report.sha256=crypto.createHash('sha256').update(source).digest('hex');
  const root=path.dirname(target),mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.webp':'image/webp','.json':'application/json','.png':'image/png'};
  server=http.createServer((req,res)=>{let requestPath;try{requestPath=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400).end();return;}const file=path.resolve(root,'.'+requestPath);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(error,bytes)=>{if(error){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(bytes);});});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin=`http://127.0.0.1:${server.address().port}`;
  try{
    browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
    const filePage=await browser.newPage();try{await filePage.goto('file://'+target,{waitUntil:'load',timeout:10000});report.fileNavigation={allowed:true};}catch(error){report.fileNavigation={allowed:false,error:error.message};}finally{await filePage.close();}
    page=await browser.newPage({viewport:{width:1440,height:1060}});watch(page);await page.goto(origin+'/'+path.basename(target),{waitUntil:'load'});await page.waitForFunction(()=>window.game&&window.NightPuppet);await page.evaluate(()=>{window.v4Observer=null;setMotionMode('full');});

    await test('三档alpha立绘真实解码、文件与像素独立、原型标注诚实',async()=>{
      report.damageArt=await page.evaluate(async()=>{
        const result=[];for(const stage of ['normal','wounded','critical']){const img=new Image();img.src=`assets/puppet/cat-${stage}.webp`;await img.decode();const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);const data=ctx.getImageData(0,0,c.width,c.height).data;let transparent=0,solid=0;for(let i=3;i<data.length;i+=4){if(data[i]===0)transparent++;if(data[i]>240)solid++;}const thumb=document.createElement('canvas');thumb.width=64;thumb.height=64;thumb.getContext('2d').drawImage(img,0,0,64,64);result.push({stage,width:c.width,height:c.height,transparent,solid,pixels:thumb.toDataURL()});}return result;
      });
      assert.equal(new Set(report.damageArt.map(x=>x.pixels)).size,3);for(const a of report.damageArt){assert.ok(a.transparent>100);assert.ok(a.solid>100);}
      await ready();await screenshot('title');await click('settings');const description=await page.locator('#modal-root').innerText();assert.match(description,/动态立绘/);assert.doesNotMatch(description,/Cubism|正式Live2D/);assert.match(fs.readFileSync(path.join(__dirname,'puppet.js'),'utf8'),/not Cubism/);report.prototypeDescription=description;await click('close');
    });

    await test('生命阈值按最大生命比例：60与52上限，50%及25%含边界',async()=>{
      const cases=[[60,31,'normal'],[60,30,'wounded'],[60,16,'wounded'],[60,15,'critical'],[52,27,'normal'],[52,26,'wounded'],[52,14,'wounded'],[52,13,'critical']];
      for(const [maxHp,hp,expected]of cases){await fixture([],{hp,maxHp,motion:'reduced'});await ready();const p=await currentPortrait();assert.equal(p.stage,expected);assert.equal(p.puppetStage,expected);assert.equal(p.runtime.stage,expected);assert.equal(p.runtime.loadedStage,expected);assert.equal(p.hp,hp);assert.equal(p.maxHp,maxHp);}
      report.thresholds=cases;
      for(const [hp,name]of [[60,'normal'],[30,'wounded'],[15,'critical']]){await fixture([],{hp,motion:'full'});await ready();await screenshot(name);}
    });

    await test('逐段三连击视觉HP同步，不提前读取引擎最终生命',async()=>{
      const all=[];for(const [hp,sequence]of [[34,[[34,'normal'],[31,'normal'],[28,'wounded'],[25,'wounded']]],[21,[[21,'wounded'],[18,'wounded'],[15,'critical'],[12,'critical']]]]){
        await fixture([],{hp,motion:'full'});await ready();await observe();await click('end-turn');await page.waitForFunction(initial=>uiBusy&&game.state.player.hp===initial-9,hp);const during=await currentPortrait();assert.ok(during.hp>hp-9,'Visual character must not start with final HP');await idle();const observed=await observations();containsSequence(observed.timeline,sequence);all.push(observed);assert.equal((await state()).player.hp,hp-9);
      }report.multiHit=all;await screenshot('critical-hit');
    });

    await test('治疗、自损和蛇毒逐步改变战损档位',async()=>{
      await fixture(['C36'],{hp:30});await observe();await play('C36');let observed=await observations();containsSequence(observed.timeline,[[30,'wounded'],[34,'normal']]);
      await fixture(['C13'],{hp:31});await observe();await play('C13');observed=await observations();containsSequence(observed.timeline,[[31,'normal'],[28,'wounded']]);
      await fixture([],{hp:20,enemy:'snake',intentIndex:1});await observe();await endTurn();observed=await observations();containsSequence(observed.timeline,[[20,'wounded'],[14,'critical'],[11,'critical']]);assert.equal((await state()).battle.poison,2);report.poison=observed;
    });

    await test('狐契12与九命18免死按比例恢复战损，并逐段展示0生命',async()=>{
      report.revives=[];for(const [relic,expected,stage]of [['fox',12,'critical'],['ninelives',18,'wounded']]){
        await fixture(['C13'],{hp:2,maxHp:52,relics:['bell',relic]});await observe();await play('C13');const s=await state(),observed=await observations();assert.equal(s.screen,'battle');assert.equal(s.player.hp,expected);containsSequence(observed.timeline,[[2,'critical'],[0,'critical'],[expected,stage]]);assert.ok(observed.fx.some(x=>x.type==='rebirth'));report.revives.push({relic,observed});
      }
    });

    await test('自损及毒致死停止战斗，失败后重新开始清空战损',async()=>{
      await fixture(['C15'],{hp:1});await observe();await play('C15');let s=await state();assert.equal(s.screen,'defeat');assert.equal(s.player.hp,0);assert.equal(s.battle.enemy.hp,500);containsSequence((await observations()).timeline,[[1,'critical'],[0,'critical']]);
      await click('start');s=await state();assert.equal(s.player.hp,60);assert.equal((await currentPortrait()).stage,'normal');
      await fixture([],{hp:2,poison:3,block:100,enemy:'lantern',intentIndex:0});await observe();await endTurn();s=await state();assert.equal(s.screen,'defeat');assert.equal(s.player.hp,0);containsSequence((await observations()).timeline,[[2,'critical'],[0,'critical']]);await screenshot('defeat');
    });

    await test('猫爪逐段前扑残影与命中音效，动画期间重复点击无效',async()=>{
      await fixture(['C05','C01']);await ready();await observe();const before=await page.evaluate(()=>NightAudio.getState());await click('card','[data-id="C05"]');await click('target');assert.equal(await page.evaluate(()=>uiBusy),true);
      const model=await state();await page.evaluate(()=>{for(const el of document.querySelectorAll('[data-action="card"],[data-action="target"],[data-action="end-turn"]'))el.click();});assert.equal((await state()).battle.played,model.battle.played);assert.equal((await state()).battle.energy,model.battle.energy);
      await page.waitForFunction(()=>document.querySelector('[data-fx="afterimage"]'));await screenshot('claw');await idle();const observed=await observations(),after=await page.evaluate(()=>NightAudio.getState());assert.equal((await state()).battle.enemy.hp,491);assert.ok(observed.fx.filter(x=>x.type==='afterimage').length>=3);assert.ok(observed.fx.filter(x=>x.type==='impact').length>=3);assert.ok(after.eventsPlayed>=before.eventsPlayed+4);report.attack=observed;
    });

    await test('受击、全额格挡与部分格挡具有不同反馈',async()=>{
      report.defence=[];for(const [block,guard,hurt,finalHp]of [[9,3,0,60],[4,1,2,55],[0,0,3,51]]){
        await fixture([],{block});await ready();await observe();await endTurn();const observed=await observations();assert.equal((await state()).player.hp,finalHp);assert.equal(observed.fx.filter(x=>x.type==='guard-impact').length,guard);assert.equal(observed.fx.filter(x=>x.type==='hurt-impact').length,hurt);report.defence.push({block,observed});
      }
    });

    await test('Canvas实际帧变化、局部网格不同形变、指针追踪与眨眼',async()=>{
      await fixture([]);await ready();const el=await portrait(),before=await el.evaluate(el=>({info:NightPuppet.inspect(el),pixels:el.querySelector('canvas').toDataURL()}));await page.waitForFunction(({selector,frames})=>NightPuppet.inspect(document.querySelector(selector)).frames>frames+2,{selector:catSelector,frames:before.info.frames},{timeout:5000});const after=await el.evaluate(el=>({info:NightPuppet.inspect(el),pixels:el.querySelector('canvas').toDataURL()}));
      assert.ok(after.info.frames>before.info.frames+2);assert.ok(after.info.meshVertices>10);assert.ok(after.info.triangleCount>10);assert.equal(after.info.blinkTextureReady,true);assert.notEqual(after.pixels,before.pixels);assert.ok(new Set(Object.values(after.info.localOffsets).map(JSON.stringify)).size>1,'Local body regions must not use one flat transform');
      const box=await el.boundingBox();await page.mouse.move(box.x+box.width*.08,box.y+box.height*.2);await page.waitForTimeout(140);const left=await el.evaluate(el=>NightPuppet.inspect(el));await page.mouse.move(box.x+box.width*.92,box.y+box.height*.2);await page.waitForTimeout(140);const right=await el.evaluate(el=>NightPuppet.inspect(el));assert.notDeepEqual(left.look,right.look);assert.ok(left.look.targetX<right.look.targetX);
      await el.evaluate(el=>NightPuppet.act(el,'blink',{duration:500}));await page.waitForFunction(selector=>NightPuppet.inspect(document.querySelector(selector)).blinkAmount>.1,catSelector);report.canvas={before:before.info,after:after.info,left,right};
    });

    await test('画卷预览与动态开关不改HP，多次重绘清理旧实例及RAF',async()=>{
      await fixture([],{hp:22});await ready();const resources=JSON.stringify((await state()).player),old=await portrait();await old.evaluate(el=>window.v4OldRoot=el);await page.evaluate(()=>{for(let i=0;i<25;i++)renderGame();});await ready();await page.waitForTimeout(100);let debug=await page.evaluate(()=>({old:NightPuppet.inspect(v4OldRoot),all:NightPuppet.inspect()}));assert.ok(!debug.old||debug.old.alive===false);assert.equal(debug.all.instances,1);assert.ok(debug.all.rafCount<=1);
      await click('settings');await click('portrait-gallery');assert.equal(await page.locator('[data-preview-stage]').count(),3);await page.waitForFunction(()=>[...document.querySelectorAll('[data-preview-stage]')].every(root=>{const i=NightPuppet.inspect(root);return i.ready&&i.loadedStage===root.dataset.previewStage;}));for(const expected of ['normal','wounded','critical'])assert.equal(await page.locator(`[data-preview-stage="${expected}"]`).getAttribute('data-damage-stage'),expected);assert.equal(JSON.stringify((await state()).player),resources);await screenshot('gallery');await click('close');await page.waitForTimeout(100);assert.equal((await page.evaluate(()=>NightPuppet.inspect())).instances,1);
      await click('settings');await click('puppet-toggle');await click('motion','[data-mode="reduced"]');await click('close');assert.equal(JSON.stringify((await state()).player),resources);await page.waitForTimeout(120);debug=await currentPortrait();assert.ok(debug.runtime?.dynamic===false||!debug.runtime?.alive);
      await endTurn();assert.equal((await state()).player.hp,13);assert.equal((await currentPortrait()).stage,'critical');assert.equal(await page.locator('.portrait[data-portrait="cat"] canvas').count(),0);assert.equal((await page.evaluate(()=>NightPuppet.inspect())).instances,0);assert.equal(await(await portrait()).locator(':scope > img').isVisible(),true);
      await click('settings');await click('puppet-toggle');await click('close');await ready();assert.equal((await state()).player.hp,13);report.lifecycle={disabled:debug,reEnabled:await currentPortrait()};
    });

    await test('减少动态保持局部位移稳定，生命变化仍切换图像',async()=>{
      await fixture([],{hp:31,motion:'reduced'});await ready();const before=await currentPortrait();await page.waitForTimeout(250);const after=await currentPortrait();assert.deepEqual(after.runtime.localOffsets,before.runtime.localOffsets);await page.evaluate(()=>{game.state.player.hp=30;renderGame();});await ready();assert.equal((await currentPortrait()).stage,'wounded');await page.evaluate(()=>{game.state.player.hp=15;renderGame();});await ready();assert.equal((await currentPortrait()).stage,'critical');assert.equal(await(await portrait()).evaluate(el=>el.getAnimations().length),0);
    });

    await test('标签页隐藏暂停单一RAF，恢复后继续',async()=>{
      await fixture([]);await ready();const other=await browser.newPage();let method='real-tab',before,after;
      try{await other.goto('about:blank');await other.bringToFront();const hidden=await page.evaluate(()=>document.hidden);
        if(!hidden){method='visibilitychange fixture (headless pages remain visible)';await page.evaluate(()=>{window.v4HiddenDescriptor=Object.getOwnPropertyDescriptor(document,'hidden');window.v4HiddenOverride=true;Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});}
        await page.waitForTimeout(100);before=await page.evaluate(()=>NightPuppet.inspect());await page.waitForTimeout(200);after=await page.evaluate(()=>NightPuppet.inspect());assert.equal(after.frames,before.frames);assert.equal(after.rafCount,0);assert.equal(after.paused,true);
      }finally{await page.evaluate(()=>{if(window.v4HiddenOverride){if(v4HiddenDescriptor)Object.defineProperty(document,'hidden',v4HiddenDescriptor);else delete document.hidden;v4HiddenOverride=false;document.dispatchEvent(new Event('visibilitychange'));}});await other.close();await page.bringToFront();}
      await page.waitForTimeout(150);const resumed=await page.evaluate(()=>NightPuppet.inspect());assert.ok(resumed.frames>after.frames);report.visibility={method,before,after,resumed};
    });

    await test('三档资源缺失时静态SVG降级，开始和战斗仍可操作',async()=>{
      const fallback=await browser.newPage();watch(fallback);await fallback.route('**/assets/puppet/**',route=>{report.expectedMissingRequests.push(route.request().url().slice(origin.length));return route.abort();});
      try{await fallback.goto(origin+'/'+path.basename(target),{waitUntil:'load'});await fallback.waitForFunction(()=>window.game&&window.NightPuppet);await fallback.waitForFunction(()=>document.querySelector('.portrait[data-portrait="cat"]').classList.contains('puppet-failed'));assert.equal(await fallback.locator('.intro-art .portrait svg').isVisible(),true);await fallback.locator('[data-action="start"]').click();assert.equal(await fallback.evaluate(()=>game.state.screen),'map');await fallback.locator('[data-action="node"]:not(:disabled)').first().click();assert.equal(await fallback.evaluate(()=>game.state.screen),'battle');}finally{await fallback.close();}
    });

    await test('V3核心自然流程回归：首战领奖、八层通关与重新开始',async()=>{
      const attempts=[];let won=false;for(let attempt=0;attempt<6&&!won;attempt++){await newRun(attempt%2?'combo':'mark');await page.evaluate(()=>setMotionMode('fast'));const route=[];for(let i=0;i<9;i++){let s=await state();if(['victory','defeat'].includes(s.screen))break;assert.equal(s.screen,'map');const available=s.map.flat().filter(n=>s.availableNodes.includes(n.id)),priority={rest:s.player.hp<45?100:50,fox:90,event:80,shop:60,fight:35,elite:15,boss:10};const n=available.sort((a,b)=>priority[b.type]-priority[a.type])[0];route.push(n.type);await click('node',`[data-node="${n.id}"]`);if(['fight','elite','boss'].includes(n.type)){const out=await autoBattle();if(out==='reward')await reward();if(out==='defeat')break;}else if(n.type==='rest')await click('rest','[data-heal="true"]');else if(n.type==='fox')await click('fox',`[data-sign="${!(await state()).player.relics.includes('fox')}"]`);else if(n.type==='shop'){s=await state();if(s.player.gold>=35)await click('buy','[data-index="0"]');await click('leave-shop');}else if(n.type==='event'){await click('event-choice');await click('event-leave');}}
        const s=await state();attempts.push({result:s.screen,hp:s.player.hp,route});won=s.screen==='victory';}
      assert.ok(won,JSON.stringify(attempts));report.naturalRuns=attempts;await screenshot('victory');await click('start');const s=await state();assert.equal(s.player.hp,60);assert.equal(s.player.maxHp,60);assert.equal(s.player.gold,60);assert.equal(s.player.deck.length,10);assert.deepEqual(s.player.relics,['bell']);assert.equal((await currentPortrait()).stage,'normal');
    });

    await test('内联单文件包含三档和网格，about:blank重开不请求外部资源',async()=>{
      const inline=fs.readFileSync(inlineTarget,'utf8'),requests=report.localRequests.length,reopened=await browser.newPage();watch(reopened);try{await reopened.setContent(inline,{waitUntil:'load'});await reopened.waitForFunction(()=>window.game&&window.NightPuppet);await reopened.locator('[data-action="start"]').click();for(const hp of [60,30,15]){await reopened.evaluate(hp=>{game.state.player.hp=hp;renderGame();},hp);await reopened.waitForFunction(()=>{const p=document.querySelector('.portrait[data-portrait="cat"]'),i=NightPuppet.inspect(p);return i.ready&&i.loadedStage===i.stage;});assert.equal(await reopened.locator('.portrait[data-portrait="cat"]').getAttribute('data-damage-stage'),hp===60?'normal':hp===30?'wounded':'critical');}assert.equal(report.localRequests.length,requests);report.inline={bytes:Buffer.byteLength(inline),sha256:crypto.createHash('sha256').update(inline).digest('hex')};}finally{await reopened.close();}
    });

    await test('未捕获JS异常与运行时外网请求均为零',async()=>{assert.deepEqual(report.errors,[]);assert.deepEqual(report.externalRequests,[]);});
    report.browser=await browser.version();
  }finally{if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));fs.writeFileSync(path.join(__dirname,'v4-results.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,damageArt:report.damageArt?.map(({pixels,...a})=>a),localRequests:report.localRequests.length},null,2));}
  if(report.results.some(r=>!r.ok))process.exitCode=1;
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
