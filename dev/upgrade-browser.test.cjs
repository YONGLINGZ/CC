/* Real Chromium v3 regression tests. Fixtures are named; managed file policy is respected. */
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const crypto = require('crypto');
const http = require('http');
const { chromium } = require('playwright');
const target = path.resolve(process.argv[2] || path.join(__dirname, '..', 'index.html'));
const results = [];
const report = { target, fileNavigation: null, externalRequests: [], localRequests: [], errors: [], results };
let page, browser, server, localOrigin;
const snapshot = () => page.evaluate(() => JSON.parse(JSON.stringify(game.state)));
const idle = () => page.waitForFunction(() => !window.uiBusy, null, { timeout: 15000 });
async function click(action, filter = '') {
  await idle();
  await page.locator(`[data-action="${action}"]${filter}:not(:disabled)`).first().click({ timeout: 5000 });
}
async function play(id) {
  await click('card', `[data-id="${id}"]`);
  if (await page.evaluate(id => NightPact.CARDS[id].target, id)) await click('target');
  await idle();
}
async function endTurn() {
  await click('end-turn');
  await idle();
  await page.waitForFunction(() => game.state.screen !== 'battle' || game.state.battle.phase === 'player', null, { timeout: 15000 });
}
async function newRun(starter = 'mark') {
  await idle();
  await page.evaluate(starter => { game.newRun(starter); renderGame(); }, starter);
}
async function fixture(cards, overrides = {}) {
  await newRun('classic');
  await page.evaluate(({ cards, overrides }) => {
    game.enterNode(game.state.availableNodes[0]);
    const b = game.state.battle;
    b.enemy.hp = b.enemy.maxHp = 500; b.enemy.block = 0; b.enemy.mark = 0;
    b.hand = cards.map((id, i) => ({ uid: 'fixture-' + i, id }));
    b.draw = []; b.discard = []; b.exhaust = [];
    b.energy = 3; b.block = 0; b.poison = 0; b.phase = 'player';
    Object.assign(b, overrides); renderGame();
  }, { cards, overrides });
}
async function fixtureVisit(type) {
  await newRun('classic');
  return page.evaluate(type => {
    let n = game.state.map.flat().find(n => n.type === type);
    if (!n) throw new Error('Generated route has no ' + type);
    game.state.floor = n.floor; game.state.availableNodes = [n.id];
    game.enterNode(n.id); renderGame(); return n;
  }, type);
}
async function test(name, fn) {
  if (process.env.QA_FILTER && !process.env.QA_FILTER.split('|').some(part=>name.includes(part))) return;
  try { await fn(); results.push({ name, ok: true }); console.log('PASS ' + name); }
  catch (error) { results.push({ name, ok: false, error: error.stack }); console.error('FAIL ' + name + ': ' + error.message); }
  finally { await idle(); await page.evaluate(() => { window.fxObserver?.disconnect(); window.setMotionMode?.('fast');document.querySelector('#modal-root [data-action="close"]')?.click();window.NightAudio?.setMuted(false); }); }
}
async function chooseAction() {
  const { nextCard } = require('./playtest.cjs');
  return nextCard(await snapshot())?.id || null;
}
async function autoBattle() {
  for (let turn=0; turn<80; turn++) {
    for (let action=0; action<45; action++) {
      const s=await snapshot(); if (s.screen!=='battle') return s.screen;
      const id=await chooseAction(); if (!id) break;
      await play(id);
    }
    if ((await snapshot()).screen!=='battle') return (await snapshot()).screen;
    await endTurn();
  }
  throw new Error('Autoplayer exceeded 80 turns');
}
async function reward() {
  let s=await snapshot(); assert.equal(s.screen,'reward');
  if(s.reward.relicPending){await click('choose-relic',`[data-relic="${s.reward.relicChoices[0]}"]`);s=await snapshot();}
  const weights={C03:3,C04:10,C05:9,C06:8,C07:7,C08:8,C09:8,C10:9,C11:6,C12:7,C13:5,C14:7,C15:6,C16:10};
  const id=[...s.reward.cards].sort((a,b)=>(weights[b]||8)-(weights[a]||8))[0];
  await click('reward',`[data-id="${id}"]`); return id;
}
async function screenshot(name) { fs.mkdirSync('/workspace/scratch',{recursive:true}); await page.screenshot({path:`/workspace/scratch/v3-${name}.png`,fullPage:true}); }
async function finishNode() {
  const s=await snapshot();
  if(s.screen==='battle'){const out=await autoBattle();if(out==='reward')await reward();return;}
  if(s.screen==='rest')return click('rest','[data-heal="true"]');
  if(s.screen==='fox')return click('fox',`[data-sign="${s.player.maxHp>8&&!s.player.relics.includes('fox')}"]`);
  if(s.screen==='shop')return click('leave-shop');
  if(s.screen==='event'){if(!s.event.resolved)await click('event-choice');return click('event-leave');}
  throw new Error('Unhandled screen '+s.screen);
}
async function decodeImageSignatures(selector) {
  return page.locator(selector).evaluateAll(async images=>Promise.all(images.map(async img=>{
    img.loading='eager';await img.decode();if(!img.naturalWidth||!img.naturalHeight)throw new Error('Invalid image '+img.src);
    const canvas=document.createElement('canvas');canvas.width=48;canvas.height=48;
    canvas.getContext('2d').drawImage(img,0,0,48,48);
    return {src:img.getAttribute('src'),width:img.naturalWidth,height:img.naturalHeight,pixels:canvas.toDataURL()};
  })));
}

(async()=>{
  const html=fs.readFileSync(target,'utf8'); report.sha256=crypto.createHash('sha256').update(html).digest('hex');
  const root=path.dirname(target),mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.css':'text/css'};
  server=http.createServer((req,res)=>{
    let requested;try{requested=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);res.end();return;}
    const file=path.resolve(root,'.'+requested);
    if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
    fs.readFile(file,(error,data)=>{if(error){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);});
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));localOrigin=`http://127.0.0.1:${server.address().port}`;
  try {
    browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
    const direct=await browser.newPage();
    try { await direct.goto('file://'+target,{waitUntil:'load',timeout:15000}); report.fileNavigation={allowed:true,title:await direct.title()}; }
    catch(error){report.fileNavigation={allowed:false,error:error.message};}
    await direct.close();
    page=await browser.newPage({viewport:{width:1440,height:1050}});
    await page.addInitScript(()=>{
      window.__audioGraph={oscillators:0,buffers:0,gains:0,started:0,connections:0};
      const seen=new Set();
      for(const Context of [window.AudioContext,window.webkitAudioContext]){
        if(!Context||seen.has(Context))continue;seen.add(Context);
        for(const [method,key] of [['createOscillator','oscillators'],['createBufferSource','buffers'],['createGain','gains']]){
          const original=Context.prototype[method];if(!original)continue;
          Context.prototype[method]=function(...args){
            window.__audioContext=this;window.__audioGraph[key]++;const node=original.apply(this,args);
            const connect=node.connect;node.connect=function(...destinations){window.__audioGraph.connections++;return connect.apply(this,destinations);};
            if(node.start){const start=node.start;node.start=function(...times){window.__audioGraph.started++;return start.apply(this,times);};}
            return node;
          };
        }
      }
    });
    const watch=p=>{p.on('pageerror',e=>report.errors.push(e.message));p.on('request',r=>{if(/^https?:/i.test(r.url())){if(r.url().startsWith(localOrigin+'/'))report.localRequests.push(r.url().slice(localOrigin.length));else report.externalRequests.push(r.url());}});};
    watch(page);
    await page.goto(localOrigin+'/'+encodeURIComponent(path.basename(target)),{waitUntil:'load',timeout:30000});
    await page.waitForFunction(()=>window.game&&window.NightPact&&window.renderGame);
    await page.evaluate(()=>window.setMotionMode?.('fast'));

    await test('完整文件夹66张WebP资源：8立绘、36技能、9事件、13遗物全部解码',async()=>{
      const assets=await page.evaluate(async()=>{
        const result=[];
        for(const kind of ['portraits','cards','events','relics'])for(const [id,src]of Object.entries(NightAssets[kind]||{})){
          const img=new Image();img.src=src;await img.decode();
          if(!img.naturalWidth||!img.naturalHeight)throw new Error('Failed asset '+kind+':'+id);
          result.push({kind,id,width:img.naturalWidth,height:img.naturalHeight});
        }
        return result;
      });
      for(const [kind,count]of Object.entries({portraits:8,cards:36,events:9,relics:13}))assert.equal(assets.filter(a=>a.kind===kind).length,count);
      report.decodedAssets=assets;
    });

    await test('开始页三个初始流派、36种卡牌完整图鉴及成年猫妖立绘',async()=>{
      assert.equal((await snapshot()).screen,'title');
      assert.equal(await page.locator('[data-action="starter"]').count(),3);
      assert.equal(await page.evaluate(()=>Object.keys(NightPact.CARDS).length),36);
      assert.equal(await page.locator('.intro-art img').count(),1);
      assert.ok(await page.locator('.intro-art img').evaluate(el=>el.complete&&el.naturalWidth>0));
      await screenshot('title');
      for(const starter of ['mark','combo','blood']){
        await click('starter',`[data-starter="${starter}"]`);
        await click('start');
        const s=await snapshot();assert.equal(s.screen,'map');assert.equal(s.player.deck.length,10);assert.equal(s.player.hp,60);
        report.starters??={};report.starters[starter]=s.player.deck.map(c=>c.id);
        await click('restart');await click('title');
      }
      assert.equal(new Set(Object.values(report.starters).map(JSON.stringify)).size,3);
      await click('catalogue');
      assert.equal(await page.locator('#modal-root .card').count(),36);
      const text=await page.locator('#modal-root').innerText();
      assert.match(text,/爪击/);assert.ok(text.length>1200);
      const pictures=await decodeImageSignatures('#modal-root .card-art img');
      assert.equal(pictures.length,36,'Every skill card has its own illustration');
      assert.equal(new Set(pictures.map(p=>p.src)).size,36);
      assert.equal(new Set(pictures.map(p=>p.pixels)).size,36,'Images must contain 36 distinct compositions');
      report.cardArt=pictures.map(({pixels,...picture})=>picture);
      await click('close');
    });

    await test('音效：用户手势解锁、36独立音色与真实WebAudio节点、静音和音量',async()=>{
      assert.equal(await page.evaluate(()=>typeof NightAudio),'object');
      await click('settings');
      const volume=page.locator('input[data-action="volume"]');
      await volume.evaluate(el=>{el.value='38';el.dispatchEvent(new Event('input',{bubbles:true}));});
      assert.ok(Math.abs((await page.evaluate(()=>NightAudio.getState())).volume-.38)<.001);
      let audio=await page.evaluate(()=>NightAudio.getState());
      if(!audio.muted)await page.locator('#modal-root [data-action="audio-toggle"]').click();
      const beforeMuted=await page.evaluate(()=>({...NightAudio.getState(),graph:{...__audioGraph}}));
      await page.evaluate(()=>{NightAudio.playCard('C01');NightAudio.playEvent({type:'attack',cardId:'C01',target:'enemy',amount:6,damage:6,absorbed:0});});
      const afterMuted=await page.evaluate(()=>({...NightAudio.getState(),graph:{...__audioGraph}}));
      assert.equal(afterMuted.sourcesCreated,beforeMuted.sourcesCreated);assert.equal(afterMuted.graph.started,beforeMuted.graph.started);
      await page.locator('#modal-root [data-action="audio-toggle"]').click();await click('audio-preview','[data-id="C01"]');
      await page.waitForFunction(()=>NightAudio.getState().contextState==='running');
      audio=await page.evaluate(()=>NightAudio.getState());assert.equal(audio.unlocked,true);assert.equal(audio.muted,false);
      const signatures=await page.evaluate(()=>NightAudio.profiles.map(id=>NightAudio.profile(id).signature));assert.equal(signatures.length,36);assert.equal(new Set(signatures).size,36);
      await click('close');
      for(let i=1;i<=36;i++){await page.evaluate(id=>NightAudio.playCard(id),'C'+String(i).padStart(2,'0'));await page.waitForTimeout(80);}
      audio=await page.evaluate(()=>({...NightAudio.getState(),graph:{...__audioGraph}}));
      assert.equal(audio.profilesUsed.length,36);assert.ok(audio.graph.oscillators>0&&audio.graph.buffers>0&&audio.graph.started>0&&audio.graph.connections>0);assert.equal(audio.lastError,'');
      report.audio=audio;
    });

    await test('真实DOM第一战、一次奖励与获得的新牌进入下一场',async()=>{
      await click('starter','[data-starter="mark"]');await click('start');
      const initial=await snapshot();await click('node',`[data-node="${initial.availableNodes[0]}"]`);
      assert.equal((await snapshot()).battle.energy,3);
      assert.equal(await autoBattle(),'reward');
      let s=await snapshot();assert.equal(s.player.gold,80);assert.equal(new Set(s.reward.cards).size,3);
      const offers=[...s.reward.cards];await click('deck');await click('close');assert.deepEqual((await snapshot()).reward.cards,offers);
      const gained=await reward();s=await snapshot();assert.equal(s.player.deck.length,11);assert.equal(s.floor,2);
      const uid=s.player.deck.at(-1).uid;
      await page.evaluate(id=>game.chooseReward(id),gained);assert.equal((await snapshot()).player.deck.length,11);assert.equal((await snapshot()).player.gold,80);
      const next=s.map.flat().find(n=>s.availableNodes.includes(n.id)&&n.type==='fight');assert.ok(next,'Second floor provides a fighting route');
      await click('node',`[data-node="${next.id}"]`);s=await snapshot();
      assert.ok([...s.battle.hand,...s.battle.draw].some(c=>c.uid===uid&&c.id===gained));
      assert.equal(s.battle.hand.length+s.battle.draw.length,11);
      await screenshot('battle');
    });

    await test('地图八层四列迷雾：仅连边可达、类型不泄露、重绘不洗图',async()=>{
      await newRun();let s=await snapshot();assert.deepEqual(s.map.map(row=>row.length),[1,3,4,4,4,4,3,1]);
      assert.ok(s.map.flat().some(n=>n.type==='fox'),'Fox transaction must exist in a naturally generated map');
      const map=JSON.stringify(s.map);await click('deck');await click('close');assert.equal(JSON.stringify((await snapshot()).map),map);
      for(const node of s.map.flat()){
        const el=page.locator(`[data-action="node"][data-node="${node.id}"]`);
        assert.equal(await el.getAttribute('data-type'),'unknown');
        const title=(await el.getAttribute('title'))||'';
        assert.ok(!title.includes(node.name),'Unvisited node must not expose its true name');
        assert.equal(await el.getAttribute('aria-label'),title);
      }
      await screenshot('map');
      const far=s.map[3][2];await page.evaluate(id=>game.enterNode(id),far.id);assert.equal((await snapshot()).screen,'map');
      await click('node',`[data-node="${s.availableNodes[0]}"]`);assert.equal(await autoBattle(),'reward');await reward();
      s=await snapshot();const chosen=s.map[1].find(n=>n.next.length<s.map[2].length)||s.map[1][0];await click('node',`[data-node="${chosen.id}"]`);await finishNode();
      s=await snapshot();assert.deepEqual(s.availableNodes,chosen.next);assert.ok(s.availableNodes.length>=2);
      const disconnected=s.map[2].find(n=>!chosen.next.includes(n.id));
      if(disconnected){const before=JSON.stringify(s.player);await page.evaluate(id=>game.enterNode(id),disconnected.id);assert.equal((await snapshot()).screen,'map');assert.equal(JSON.stringify((await snapshot()).player),before);assert.equal(await page.locator(`[data-node="${disconnected.id}"]`).isDisabled(),true);}
      assert.equal(await page.locator('.map-node.completed').count(),2);
      assert.equal(await page.locator(`[data-node="${chosen.id}"]`).getAttribute('data-type'),chosen.type);
      const maps=new Set();for(let i=0;i<6;i++){await newRun();maps.add(JSON.stringify((await snapshot()).map));}
      assert.ok(maps.size>1,'Different runs generate different maps');
    });

    await test('fixture：费用不足、选敌取消与敌方回合锁定',async()=>{
      await fixture(['C04'],{energy:1});assert.equal(await page.locator('[data-action="card"]').isDisabled(),true);
      await page.evaluate(()=>document.querySelector('[data-action="card"]').click());assert.equal((await snapshot()).battle.energy,1);
      await fixture(['C01']);await click('card');await click('card');assert.equal((await snapshot()).battle.energy,3);
      await click('card');await page.keyboard.press('Escape');assert.equal((await snapshot()).battle.energy,3);assert.equal((await snapshot()).battle.enemy.hp,500);
      await page.evaluate(()=>{game.state.battle.phase='enemy';renderGame();});assert.equal(await page.locator('[data-action="card"]').isDisabled(),true);
      await page.evaluate(()=>document.querySelector('[data-action="card"]').click());assert.equal((await snapshot()).battle.energy,3);assert.equal((await snapshot()).battle.hand.length,1);
    });

    await test('fixture：完整动态逐段猫爪特效、猫妖突进及播放期间重复点击锁定',async()=>{
      await fixture(['C05','C01']);await page.evaluate(()=>{
        setMotionMode('full');window.observedFX=[];
        window.fxObserver?.disconnect();window.fxObserver=new MutationObserver(records=>{
          for(const r of records)for(const n of r.addedNodes)if(n.nodeType===1){if(n.dataset?.fx)observedFX.push({type:n.dataset.fx,text:n.textContent});for(const el of n.querySelectorAll?.('[data-fx]')||[])observedFX.push({type:el.dataset.fx,text:el.textContent});}
        });fxObserver.observe(document.getElementById('fx-root'),{childList:true,subtree:true});
      });
      const audioBefore=await page.evaluate(()=>({...NightAudio.getState(),graph:{...__audioGraph}}));
      await click('card','[data-id="C05"]');await click('target');
      assert.equal(await page.evaluate(()=>window.uiBusy),true);
      assert.ok(await page.locator('[data-combatant="player"] .portrait').evaluate(el=>el.dataset.attacking==='true'&&el.getAnimations().length>0),'Cat performs an actual dash animation');
      const before=await snapshot();
      await page.evaluate(()=>{document.querySelector('[data-action="card"]')?.click();document.querySelector('[data-action="end-turn"]')?.click();document.querySelector('[data-action="target"]')?.click();});
      assert.equal((await snapshot()).battle.played,before.battle.played);assert.equal((await snapshot()).battle.energy,before.battle.energy);
      await page.waitForFunction(()=>document.querySelector('#fx-root [data-fx="claw"]'),null,{timeout:4000});
      await screenshot('claw-fx');
      await idle();const s=await snapshot();assert.equal(s.battle.enemy.hp,491);assert.equal(s.battle.played,1);
      const fx=await page.evaluate(()=>observedFX);report.fullMotionFX=fx;
      assert.ok(fx.filter(x=>x.type==='claw').length>=3,'Three individual hit effects must appear');
      const audioAfter=await page.evaluate(()=>({...NightAudio.getState(),graph:{...__audioGraph}}));
      assert.ok(audioAfter.eventsPlayed>audioBefore.eventsPlayed,'Combat UI plays actual card and impact cues');assert.ok(audioAfter.graph.started>audioBefore.graph.started,'Combat audio creates and starts real source nodes');report.combatAudio={before:audioBefore,after:audioAfter};
      await page.evaluate(()=>{fxObserver.disconnect();setMotionMode('fast');});
    });

    await test('fixture：逐段护盾、候机首段、标记金铃与扑杀清标',async()=>{
      await fixture(['C05']);await page.evaluate(()=>{game.state.battle.enemy.block=5;renderGame();});await play('C05');
      assert.equal((await snapshot()).battle.enemy.hp,496);assert.equal((await snapshot()).battle.enemy.block,0);
      await fixture(['C10','C05']);await play('C10');await play('C05');assert.equal((await snapshot()).battle.enemy.hp,487);assert.equal((await snapshot()).battle.nextAttack,0);
      await fixture(['C03','C04']);await play('C03');assert.equal((await snapshot()).battle.enemy.mark,2);assert.equal((await snapshot()).battle.block,3);await play('C04');
      assert.equal((await snapshot()).battle.enemy.hp,482);assert.equal((await snapshot()).battle.enemy.mark,0);
      await fixture(['C03']);await page.evaluate(()=>{game.state.battle.enemy.mark=5;renderGame();});await play('C03');assert.equal((await snapshot()).battle.block,0);
      await fixture(['C04']);await page.evaluate(()=>{Object.assign(game.state.battle.enemy,{mark:2,block:100});renderGame();});await play('C04');
      assert.equal((await snapshot()).battle.enemy.hp,500);assert.equal((await snapshot()).battle.enemy.block,82);assert.equal((await snapshot()).battle.enemy.mark,0);
    });

    await test('减少动态：取消人物前扑，保留卡牌结算和声音',async()=>{
      await fixture(['C01']);await click('settings');await click('motion','[data-mode="reduced"]');await click('close');
      assert.equal(await page.locator('body').getAttribute('data-motion'),'reduced');
      const before=await page.evaluate(()=>NightAudio.getState().sourcesCreated);
      await click('card','[data-id="C01"]');await click('target');
      assert.equal(await page.locator('[data-combatant="player"] .portrait').evaluate(el=>el.getAnimations().length),0);
      await idle();assert.equal((await snapshot()).battle.enemy.hp,494);assert.ok(await page.evaluate(n=>NightAudio.getState().sourcesCreated>n,before));
    });

    await test('fixture：弃牌重洗、结算牌不自抽、手牌上限与消耗区',async()=>{
      await fixture(['C09'],{discard:[{uid:'draw-1',id:'C01'},{uid:'draw-2',id:'C02'}]});await play('C09');let s=await snapshot();
      assert.equal(s.battle.hand.length,2);assert.ok(!s.battle.hand.some(c=>c.id==='C09'));assert.deepEqual(s.battle.discard.map(c=>c.id),['C09']);
      await fixture(['C09',...Array(9).fill('C01')],{draw:[{uid:'overflow-1',id:'C02'},{uid:'overflow-2',id:'C02'}]});await play('C09');s=await snapshot();assert.equal(s.battle.hand.length,10);assert.equal(s.battle.discard.length,2);
      assert.ok(s.battle.logs.some(x=>/上限|溢出|十张|10/.test(x)));
      await fixture(['C06']);await page.evaluate(()=>{game.state.player.deck.push({uid:'persistent-catstep',id:'C06'});game.state.battle.hand[0].uid='persistent-catstep';renderGame();});await play('C06');s=await snapshot();assert.equal(s.battle.exhaust.length,1);assert.equal(s.battle.discard.length,0);
      await click('pile','[data-pile="exhaust"]');assert.match(await page.locator('#modal-root').innerText(),/猫步/);await click('close');
      for(const pile of ['draw','discard']){await click('pile',`[data-pile="${pile}"]`);await click('close');}
      await page.evaluate(()=>{game.state.battle.enemy.hp=1;game.state.battle.hand=[{uid:'fixture-finish',id:'C01'}];game.state.battle.energy=3;renderGame();});await play('C01');await click('skip-reward');s=await snapshot();const next=s.map.flat().find(n=>s.availableNodes.includes(n.id)&&n.type==='fight');await click('node',`[data-node="${next.id}"]`);s=await snapshot();assert.ok([...s.battle.hand,...s.battle.draw].some(c=>c.uid==='persistent-catstep'));await click('deck');assert.equal(await page.locator('#modal-root .card').count(),s.player.deck.length);await click('close');
    });

    await test('fixture：商店商品固定、购买删实例扣款、余额不足与下场持久化',async()=>{
      await fixtureVisit('shop');await page.evaluate(()=>{game.state.player.gold=100;renderGame();});
      let s=await snapshot();const goods=s.shop.cards.map(c=>c.id),removed=s.player.deck[0].uid;assert.equal(new Set(goods).size,3);
      await click('deck');await click('close');assert.deepEqual((await snapshot()).shop.cards.map(c=>c.id),goods);
      await click('buy','[data-index="0"]');s=await snapshot();assert.equal(s.player.gold,65);assert.equal(s.player.deck.length,11);
      await page.evaluate(()=>game.buyCard(0));assert.equal((await snapshot()).player.gold,65);
      await click('remove-panel');await click('remove',`[data-card="${removed}"]`);s=await snapshot();assert.equal(s.player.gold,25);assert.equal(s.player.deck.length,10);
      assert.ok(!s.player.deck.some(c=>c.uid===removed));await page.evaluate(uid=>game.removeCard(uid),removed);assert.equal((await snapshot()).player.gold,25);
      assert.equal(await page.locator('[data-action="buy"][data-index="1"]').isDisabled(),true);
      await click('leave-shop');await page.evaluate(()=>{const n=game.state.map.flat().find(n=>n.type==='fight');game.state.floor=n.floor;game.state.availableNodes=[n.id];game.enterNode(n.id);renderGame();});
      s=await snapshot();assert.ok(![...s.battle.draw,...s.battle.hand].some(c=>c.uid===removed));assert.ok([...s.battle.draw,...s.battle.hand].some(c=>c.id===goods[0]));
    });

    await test('fixture：休息上限、一次性处理、狐契代价免死及后续致死',async()=>{
      await fixtureVisit('rest');await page.evaluate(()=>{game.state.player.hp=50;renderGame();});await click('rest','[data-heal="true"]');let s=await snapshot();assert.equal(s.player.hp,60);const floor=s.floor;
      await page.evaluate(()=>game.rest(true));assert.equal((await snapshot()).floor,floor);
      await fixtureVisit('fox');await click('fox','[data-sign="true"]');s=await snapshot();assert.equal(s.player.maxHp,52);assert.equal(s.player.hp,52);assert.ok(s.player.relics.includes('fox'));
      await page.evaluate(()=>game.fox(true));assert.equal((await snapshot()).player.maxHp,52);
      await page.evaluate(()=>{const n=game.state.map.flat().find(n=>n.type==='fight');game.state.floor=n.floor;game.state.availableNodes=[n.id];game.enterNode(n.id);const b=game.state.battle;game.state.player.hp=2;b.hand=[{uid:'fox-blood',id:'C13'}];b.draw=[];b.discard=[];b.energy=3;renderGame();});
      await play('C13');s=await snapshot();assert.equal(s.player.hp,12);assert.ok(!s.player.relics.includes('fox'));assert.equal(s.screen,'battle');
      await page.evaluate(()=>{game.state.player.hp=1;game.state.battle.hand=[{uid:'fox-fire',id:'C15'}];renderGame();});const hp=(await snapshot()).battle.enemy.hp;
      await play('C15');s=await snapshot();assert.equal(s.screen,'defeat');assert.equal(s.player.hp,0);assert.equal(s.battle.enemy.hp,hp);await screenshot('defeat');
    });

    await test('fixture：蛇妖蛇息毒、蜕鳞清标意图与逐回合执行',async()=>{
      await fixtureVisit('boss');await page.evaluate(()=>{const b=game.state.battle;b.enemy.intentIndex=1;b.block=0;b.poison=0;renderGame();});
      const text=await page.locator('#intent-text').innerText();assert.match(text,/6/);assert.match(text,/3/);assert.match(text,/毒/);
      await endTurn();let s=await snapshot();assert.equal(s.player.hp,51);assert.equal(s.battle.poison,2);assert.match(await page.locator('#intent-text').innerText(),/清除.*标记/);
      await page.evaluate(()=>{game.state.battle.enemy.mark=4;renderGame();});await endTurn();s=await snapshot();assert.equal(s.battle.enemy.mark,0);assert.equal(s.battle.enemy.block,10);assert.equal(s.player.hp,49);assert.equal(s.battle.poison,1);
      await screenshot('snake');
    });

    await test('fixture：六剧情各自画卡、先读结局再前进、选择不能重复领取',async()=>{
      const ids=['well','shrine','dreamshop','theatre','umbrella','pawnshop'],pictures=[];
      for(const id of ids){
        await newRun();await page.evaluate(({id,ids})=>{
          const s=game.state,n=s.map.flat().find(n=>n.type==='event');
          s.seenEvents=ids.filter(other=>other!==id);s.floor=n.floor;s.availableNodes=[n.id];s.player.hp=180;s.player.maxHp=200;s.player.gold=1000;game.enterNode(n.id);renderGame();
        },{id,ids});
        let s=await snapshot();assert.equal(s.event.id,id);assert.equal(s.event.choices.length,3);
        pictures.push(...await decodeImageSignatures(`.encounter-art[data-event-art="${id}"] img`));
        const event=JSON.stringify(s.event);await click('deck');await click('close');assert.equal(JSON.stringify((await snapshot()).event),event);
        if(id==='well')await screenshot('event');
        const before=s.floor,prior=JSON.stringify(s.player);await click('event-choice','[data-index="0"]');s=await snapshot();
        assert.equal(s.floor,before);assert.equal(s.screen,'event');assert.equal(s.event.resolved,true);assert.ok(s.event.outcome.length>12);assert.ok(s.event.received.length>0);assert.notEqual(JSON.stringify(s.player),prior);
        assert.ok(await page.locator('.event-outcome').isVisible());const player=JSON.stringify(s.player);assert.equal(await page.evaluate(()=>game.chooseEvent(0)),false);assert.equal(JSON.stringify((await snapshot()).player),player);
        await click('event-leave');assert.equal((await snapshot()).floor,before+1);assert.equal(await page.evaluate(()=>game.leaveEvent()),false);
      }
      for(const id of ['rest','shop','fox']){await fixtureVisit(id);pictures.push(...await decodeImageSignatures(`.encounter-art[data-event-art="${id}"] img`));}
      assert.equal(pictures.length,9);assert.equal(new Set(pictures.map(p=>p.src)).size,9);assert.equal(new Set(pictures.map(p=>p.pixels)).size,9);report.eventArt=pictures.map(({pixels,...p})=>p);
      const audio=await page.evaluate(()=>NightAudio.getState());assert.equal(audio.encountersUsed.length,9,'Each encounter screen triggers its own actual sound');report.encounterAudio=audio.encountersUsed;
    });

    await test('fixture：精英稀有保底、宝物双选真实生效、重抽本局限一次',async()=>{
      await fixtureVisit('elite');await page.evaluate(()=>{const b=game.state.battle;b.enemy.hp=1;b.hand=[{uid:'elite-finish',id:'C01'}];renderGame();});await play('C01');
      let s=await snapshot();assert.equal(s.screen,'reward');assert.equal(s.player.gold,95);
      assert.equal(await page.evaluate(()=>game.state.reward.cards.some(id=>NightPact.CARDS[id].rarity==='rare')),true);
      assert.equal(s.reward.relicPending,true);assert.equal(s.reward.relicChoices.length,2);assert.equal(new Set(s.reward.relicChoices).size,2);
      assert.ok(s.reward.relicChoices.some(id=>['moonheart','mirror','dream','godblood','ninelives'].includes(id)));
      assert.equal(await page.evaluate(()=>game.chooseReward(null)),false);assert.equal(await page.locator('[data-action="reward"]').first().isDisabled(),true);
      const before=s.player.relics.length,offers=[...s.reward.relicChoices],choice=offers[0];await screenshot('reward');
      await click('choose-relic',`[data-relic="${choice}"]`);s=await snapshot();assert.equal(s.player.relics.length,before+1);assert.ok(s.player.relics.includes(choice));assert.equal(s.reward.relicPending,false);
      assert.equal(await page.evaluate(id=>game.chooseRelic(id),offers[1]),false);assert.equal((await snapshot()).player.relics.length,before+1);
      const cards=[...s.reward.cards];await click('reroll-reward');s=await snapshot();assert.equal(s.rewardRerolls,0);assert.equal(s.reward.rerolled,true);assert.equal(s.player.gold,95);assert.deepEqual(s.reward.relicChoices,offers);assert.equal(s.reward.relic,choice);assert.notDeepEqual(s.reward.cards,cards);
      const fixed=JSON.stringify(s.reward);assert.equal(await page.evaluate(()=>game.rerollReward()),false);await click('deck');await click('close');assert.equal(JSON.stringify((await snapshot()).reward),fixed);
      await screenshot('rare');await reward();assert.equal((await snapshot()).player.deck.length,11);
    });

    await test('八位角色独立立绘、蛇妖脸素材不复用猫妖、图片损坏内联SVG降级',async()=>{
      const signatures=[];
      for(const enemy of ['paper','lantern','ape','bone','yaksha','snake']){
        await fixture(['C01']);await page.evaluate(id=>{game.state.battle.enemy.id=id;game.state.battle.enemy.name=NightPact.ENEMIES[id].name;renderGame();},enemy);
        const img=page.locator('[data-action="target"] img');assert.equal(await img.count(),1,enemy+' has independent bitmap portrait');await img.evaluate(el=>el.decode());
        assert.ok(await img.evaluate(el=>el.naturalWidth>0));signatures.push(await img.getAttribute('src'));
      }
      assert.equal(new Set(signatures).size,6);
      const cat=await page.locator('[data-combatant="player"] img').getAttribute('src');assert.notEqual(cat,signatures.at(-1));
      const img=page.locator('[data-action="target"] img');await img.evaluate(el=>{el.src='data:image/png;base64,broken';});
      await page.waitForFunction(()=>document.querySelector('[data-action="target"] .image-failed'));
      assert.equal(await page.locator('[data-action="target"] svg').isVisible(),true);
    });

    await test('真实DOM完整八层路线、通关与重开（不改生命灵石牌组路线状态）',async()=>{
      const attempts=[];let won=false;
      for(let attempt=0;attempt<8&&!won;attempt++){
        await newRun(attempt%2?'combo':'mark');const route=[];
        for(let i=0;i<9;i++){
          let s=await snapshot();if(['victory','defeat'].includes(s.screen))break;assert.equal(s.screen,'map');
          const available=s.map.flat().filter(n=>s.availableNodes.includes(n.id));
          const priority={rest:s.player.hp<45?100:45,fox:80,shop:60,event:55,fight:35,elite:15,boss:10};
          const fox=s.map.flat().find(n=>n.type==='fox'&&n.floor===4),byId=Object.fromEntries(s.map.flat().map(n=>[n.id,n]));
          const reachesFox=n=>Boolean(fox&&(n.id===fox.id||(n.floor<fox.floor&&n.next.some(id=>reachesFox(byId[id])))));
          const score=n=>(priority[n.type]||0)+(reachesFox(n)?300:0);
          const n=available.sort((a,b)=>score(b)-score(a))[0];route.push(n.type+':'+n.id);await click('node',`[data-node="${n.id}"]`);
          if(['fight','elite','boss'].includes(n.type)){const result=await autoBattle();if(result==='defeat')break;if(result==='reward')await reward();}
          else if(n.type==='rest')await click('rest','[data-heal="true"]');
          else if(n.type==='fox')await click('fox',`[data-sign="${!(await snapshot()).player.relics.includes('fox')}"]`);
          else if(n.type==='shop'){
            s=await snapshot();for(let j=0;j<s.shop.cards.length;j++)if((await snapshot()).player.gold>=35)await click('buy',`[data-index="${j}"]`);await click('leave-shop');
          }else if(n.type==='event'){await click('event-choice');await click('event-leave');}
          else throw new Error('Unhandled node '+n.type);
        }
        const s=await snapshot();attempts.push({screen:s.screen,hp:s.player.hp,floor:s.floor,battles:s.stats.battles,route});won=s.screen==='victory';
      }
      report.realRouteAttempts=attempts;assert.ok(won,'No DOM victory in eight runs: '+JSON.stringify(attempts));assert.ok(attempts.some(a=>a.route.some(n=>n.startsWith('fox:'))),'A complete DOM run naturally reaches the fox');await screenshot('victory');
      await click('start');let s=await snapshot();if(s.screen==='title')await click('start');s=await snapshot();assert.equal(s.floor,1);assert.equal(s.player.hp,60);assert.equal(s.player.maxHp,60);assert.equal(s.player.gold,60);assert.equal(s.player.deck.length,10);assert.deepEqual(s.player.relics,['bell']);assert.equal(s.history.length,0);
    });

    await test('游戏内导出完整HTML并独立重新加载、零遗留战斗进度',async()=>{
      const pending=page.waitForEvent('download',{timeout:8000});await click('export');const download=await pending;
      assert.match(download.suggestedFilename(),/\.html$/);const stream=await download.createReadStream(),chunks=[];for await(const chunk of stream)chunks.push(chunk);const exported=Buffer.concat(chunks).toString('utf8');
      assert.ok(exported.startsWith('<!doctype html>'));assert.ok(exported.includes('NightPact')&&exported.includes('data:image/'));
      const requestsBefore=report.localRequests.length;
      const reopened=await browser.newPage();watch(reopened);try{
        await reopened.setContent(exported,{waitUntil:'load'});await reopened.waitForFunction(()=>window.game);assert.equal(await reopened.evaluate(()=>game.state.screen),'title');
        await reopened.locator('[data-action="catalogue"]').first().click();
        const pictures=await reopened.locator('#modal-root .card-art img').evaluateAll(async imgs=>Promise.all(imgs.map(async img=>{img.loading='eager';await img.decode();return {src:img.getAttribute('src'),width:img.naturalWidth};})));
        assert.equal(pictures.length,36);assert.ok(pictures.every(p=>p.src.startsWith('data:image/')&&p.width>0));
        await reopened.locator('[data-action="close"]').click();await reopened.locator('[data-action="start"]').click();assert.equal(await reopened.evaluate(()=>game.state.player.hp),60);
        assert.equal(report.localRequests.length,requestsBefore,'Exported HTML must make no asset requests');
      }finally{await reopened.close();}
      report.exportedBytes=Buffer.byteLength(exported);
    });

    if(process.argv[3])await test('构建的内联单文件在about:blank直接启动且36插画解码',async()=>{
      const inlinePath=path.resolve(process.argv[3]),inline=fs.readFileSync(inlinePath,'utf8'),requestsBefore=report.localRequests.length;
      const reopened=await browser.newPage();watch(reopened);try{
        await reopened.setContent(inline,{waitUntil:'load'});await reopened.waitForFunction(()=>window.game);assert.equal(await reopened.evaluate(()=>game.state.screen),'title');
        await reopened.locator('[data-action="catalogue"]').first().click();
        const sizes=await reopened.locator('#modal-root .card-art img').evaluateAll(async imgs=>Promise.all(imgs.map(async img=>{img.loading='eager';await img.decode();return img.naturalWidth;})));
        assert.equal(sizes.length,36);assert.ok(sizes.every(n=>n>0));assert.equal(report.localRequests.length,requestsBefore);
        report.inline={path:inlinePath,bytes:Buffer.byteLength(inline),sha256:crypto.createHash('sha256').update(inline).digest('hex')};
      }finally{await reopened.close();}
    });

    await test('运行时外网请求为0，未捕获JavaScript错误为0',async()=>{assert.deepEqual(report.externalRequests,[]);assert.deepEqual(report.errors,[]);});
    report.browser=await browser.version();
  }finally{
    if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));fs.mkdirSync('/workspace/scratch',{recursive:true});fs.writeFileSync(path.join(__dirname,'v3-browser-results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({...report,localRequests:report.localRequests.length},null,2));
  }
  if(results.some(r=>!r.ok))process.exitCode=1;
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
