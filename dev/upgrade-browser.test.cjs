/* Real Chromium v2 regression tests. Fixtures are explicitly named. No server or file-policy bypass. */
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const crypto = require('crypto');
const { chromium } = require('playwright');
const target = path.resolve(process.argv[2] || path.join(__dirname, '..', 'index.html'));
const results = [];
const report = { target, fileNavigation: null, externalRequests: [], errors: [], results };
let page, browser;
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
  if (process.env.QA_FILTER && !name.includes(process.env.QA_FILTER)) return;
  try { await fn(); results.push({ name, ok: true }); console.log('PASS ' + name); }
  catch (error) { results.push({ name, ok: false, error: error.stack }); console.error('FAIL ' + name + ': ' + error.message); }
  finally { await idle(); await page.evaluate(() => { window.fxObserver?.disconnect(); window.setMotionMode?.('fast'); }); }
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
  const s=await snapshot(); assert.equal(s.screen,'reward');
  const weights={C03:3,C04:10,C05:9,C06:8,C07:7,C08:8,C09:8,C10:9,C11:6,C12:7,C13:5,C14:7,C15:6,C16:10};
  const id=[...s.reward.cards].sort((a,b)=>(weights[b]||8)-(weights[a]||8))[0];
  await click('reward',`[data-id="${id}"]`); return id;
}
async function screenshot(name) { fs.mkdirSync('/workspace/scratch',{recursive:true}); await page.screenshot({path:`/workspace/scratch/v2-${name}.png`,fullPage:true}); }

(async()=>{
  const html=fs.readFileSync(target,'utf8'); report.sha256=crypto.createHash('sha256').update(html).digest('hex');
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  try {
    const direct=await browser.newPage();
    try { await direct.goto('file://'+target,{waitUntil:'load',timeout:15000}); report.fileNavigation={allowed:true,title:await direct.title()}; }
    catch(error){report.fileNavigation={allowed:false,error:error.message};}
    await direct.close();
    page=await browser.newPage({viewport:{width:1440,height:1050}});
    const watch=p=>{p.on('pageerror',e=>report.errors.push(e.message));p.on('request',r=>{if(/^https?:/i.test(r.url()))report.externalRequests.push(r.url());});};
    watch(page);
    await page.setContent(html,{waitUntil:'load',timeout:30000});
    await page.waitForFunction(()=>window.game&&window.NightPact&&window.renderGame);
    await page.evaluate(()=>window.setMotionMode?.('fast'));

    await test('开始页三个初始流派、36种卡牌图鉴及成年猫妖立绘',async()=>{
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
      await click('close');
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

    await test('地图8层真实连线：支路锁定、仅连边可达、重绘不洗地图',async()=>{
      await newRun();let s=await snapshot();assert.equal(s.map.length,8);assert.equal(s.map[1].length,3);
      const map=JSON.stringify(s.map);await click('deck');await click('close');assert.equal(JSON.stringify((await snapshot()).map),map);
      await screenshot('map');
      const far=s.map[3][2];await page.evaluate(id=>game.enterNode(id),far.id);assert.equal((await snapshot()).screen,'map');
      await click('node',`[data-node="${s.availableNodes[0]}"]`);assert.equal(await autoBattle(),'reward');await reward();
      s=await snapshot();const chosen=s.map[1].find(n=>n.type==='rest')||s.map[1][0];await click('node',`[data-node="${chosen.id}"]`);
      if(chosen.type==='rest')await click('rest','[data-heal="true"]');else if(chosen.type==='fight'){assert.equal(await autoBattle(),'reward');await reward();}else throw new Error('Unexpected floor-2 branch '+chosen.type);
      s=await snapshot();assert.deepEqual(s.availableNodes,chosen.next);assert.equal(s.availableNodes.length,1);
      const disconnected=s.map[2].find(n=>!chosen.next.includes(n.id));assert.ok(disconnected);
      const before=JSON.stringify(s.player);await page.evaluate(id=>game.enterNode(id),disconnected.id);
      assert.equal((await snapshot()).screen,'map');assert.equal(JSON.stringify((await snapshot()).player),before);
      assert.equal(await page.locator(`[data-node="${disconnected.id}"]`).isDisabled(),true);
      assert.equal(await page.locator('.map-node.completed').count(),2);
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

    await test('fixture：随机事件选择真实生效并只能领取一次',async()=>{
      await fixtureVisit('event');let s=await snapshot();assert.ok(s.event.choices.length>=2);const event=JSON.stringify(s.event);await click('deck');await click('close');assert.equal(JSON.stringify((await snapshot()).event),event);
      const before=s.floor,prior=s.player,choice=s.event.choices[0];await click('event-choice','[data-index="0"]');s=await snapshot();assert.equal(s.floor,before+1);
      if(choice.effect==='buy'){assert.equal(s.player.gold,prior.gold-choice.price);assert.equal(s.player.deck.length,prior.deck.length+1);assert.equal(s.player.deck.at(-1).id,choice.cardId);}
      else if(choice.effect==='offering'){assert.equal(s.player.hp,prior.hp-choice.amount);assert.ok(s.player.relics.includes(choice.relic));}
      else if(choice.effect==='sell'){assert.equal(s.player.gold,prior.gold+choice.amount);assert.equal(s.player.deck.length,prior.deck.length-1);assert.ok(!s.player.deck.some(c=>c.uid===choice.uid));}
      else throw new Error('Unverified event choice '+choice.effect);
      const player=JSON.stringify(s.player);await page.evaluate(()=>game.chooseEvent(0));assert.equal(JSON.stringify((await snapshot()).player),player);assert.equal((await snapshot()).floor,before+1);
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

    await test('真实DOM完整八层路线、通关与重开（不改生命金币牌组路线状态）',async()=>{
      const attempts=[];let won=false;
      for(let attempt=0;attempt<8&&!won;attempt++){
        await newRun(attempt%2?'combo':'mark');const route=[];
        for(let i=0;i<9;i++){
          let s=await snapshot();if(['victory','defeat'].includes(s.screen))break;assert.equal(s.screen,'map');
          const available=s.map.flat().filter(n=>s.availableNodes.includes(n.id));
          const priority={rest:s.player.hp<45?100:45,fox:80,shop:60,event:55,fight:35,elite:15,boss:10};
          const n=available.sort((a,b)=>(priority[b.type]||0)-(priority[a.type]||0))[0];route.push(n.type+':'+n.id);await click('node',`[data-node="${n.id}"]`);
          if(['fight','elite','boss'].includes(n.type)){const result=await autoBattle();if(result==='defeat')break;if(result==='reward')await reward();}
          else if(n.type==='rest')await click('rest','[data-heal="true"]');
          else if(n.type==='fox')await click('fox',`[data-sign="${!(await snapshot()).player.relics.includes('fox')}"]`);
          else if(n.type==='shop'){
            s=await snapshot();for(let j=0;j<s.shop.cards.length;j++)if((await snapshot()).player.gold>=35)await click('buy',`[data-index="${j}"]`);await click('leave-shop');
          }else if(n.type==='event')await click('event-choice');
          else throw new Error('Unhandled node '+n.type);
        }
        const s=await snapshot();attempts.push({screen:s.screen,hp:s.player.hp,floor:s.floor,battles:s.stats.battles,route});won=s.screen==='victory';
      }
      report.realRouteAttempts=attempts;assert.ok(won,'No DOM victory in eight runs: '+JSON.stringify(attempts));await screenshot('victory');
      await click('start');let s=await snapshot();if(s.screen==='title')await click('start');s=await snapshot();assert.equal(s.floor,1);assert.equal(s.player.hp,60);assert.equal(s.player.maxHp,60);assert.equal(s.player.gold,60);assert.equal(s.player.deck.length,10);assert.deepEqual(s.player.relics,['bell']);assert.equal(s.history.length,0);
    });

    await test('游戏内导出完整HTML并独立重新加载、零遗留战斗进度',async()=>{
      const pending=page.waitForEvent('download',{timeout:8000});await click('export');const download=await pending;
      assert.match(download.suggestedFilename(),/\.html$/);const stream=await download.createReadStream(),chunks=[];for await(const chunk of stream)chunks.push(chunk);const exported=Buffer.concat(chunks).toString('utf8');
      assert.ok(exported.startsWith('<!doctype html>'));assert.ok(exported.includes('NightPact')&&exported.includes('data:image/'));
      const reopened=await browser.newPage();watch(reopened);try{await reopened.setContent(exported,{waitUntil:'load'});await reopened.waitForFunction(()=>window.game);assert.equal(await reopened.evaluate(()=>game.state.screen),'title');await reopened.locator('[data-action="start"]').click();assert.equal(await reopened.evaluate(()=>game.state.player.hp),60);}finally{await reopened.close();}
      report.exportedBytes=Buffer.byteLength(exported);
    });

    await test('运行时HTTP(S)请求为0，未捕获JavaScript错误为0',async()=>{assert.deepEqual(report.externalRequests,[]);assert.deepEqual(report.errors,[]);});
    report.browser=await browser.version();
  }finally{
    await browser.close();fs.mkdirSync('/workspace/scratch',{recursive:true});fs.writeFileSync('/workspace/scratch/v2-browser-results.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
  }
  if(results.some(r=>!r.ok))process.exitCode=1;
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
