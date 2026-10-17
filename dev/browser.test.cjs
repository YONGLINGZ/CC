/* Real Chromium checks. No web server, modules, CDN or file-policy bypasses. */
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const crypto = require('crypto');
const { chromium } = require('playwright');
const target = path.resolve(process.argv[2] || path.join(__dirname, '..', 'index.html'));
const results = [];
const reports = { target, fileNavigation: null, externalRequests: [], results };
let page;

async function state() { return page.evaluate(() => JSON.parse(JSON.stringify(game.state))); }
async function render() { await page.evaluate(() => renderGame()); }
async function click(action, filter = '') {
  await page.locator(`[data-action="${action}"]${filter}:not(:disabled)`).first().click({ timeout: 4000 });
}
async function fixture(cards, overrides = {}) {
  await page.evaluate(({ cards, overrides }) => {
    game.newRun(); game.enterNode('fight');
    const b = game.state.battle;
    b.enemy.hp = b.enemy.maxHp = 500; b.enemy.block = 0; b.enemy.mark = 0;
    b.hand = cards.map((id, i) => ({ uid: 'qa-' + i, id }));
    b.draw = []; b.discard = []; b.exhaust = [];
    b.energy = 3; b.block = 0; b.poison = 0; b.phase = 'player';
    Object.assign(b, overrides); renderGame();
  }, { cards, overrides });
}
async function play(id) {
  const card = page.locator(`[data-action="card"][data-id="${id}"]`).first();
  const targeted = await page.evaluate(id => NightPact.CARDS[id].target, id);
  await card.click({ timeout: 4000 });
  if (targeted) await click('target');
}
async function endTurn() {
  await click('end-turn');
  await page.waitForFunction(() => game.state.screen !== 'battle' || game.state.battle.phase === 'player', null, { timeout: 6000 });
}
async function test(name, fn) {
  try { await fn(); results.push({ name, ok: true }); console.log('PASS ' + name); }
  catch (error) { results.push({ name, ok: false, error: error.stack }); console.error('FAIL ' + name + ': ' + error.message); }
}
async function newRun() {
  await page.evaluate(() => { game.newRun(); renderGame(); });
}
async function restartRun() {
  if (await page.locator('[data-action="start"]').count()) await click('start');
  else { await click('restart'); await click('start'); }
}
async function visit(floor, type) {
  await page.evaluate(floor => { game.newRun(); game.state.floor = floor; game.state.screen = 'map'; renderGame(); }, floor);
  await click('node', `[data-node="${type}"]`);
}
async function chooseAction() {
  return page.evaluate(() => {
    const s = game.state, b = s.battle, c = NightPact.CARDS;
    const e = b.enemy;
    const intent = NightPact.ENEMIES[e.id].intents[e.intentIndex];
    const incoming = (intent.hits || []).reduce((a, n) => a + n, 0);
    const need = Math.max(0, incoming - b.block);
    const guardWeight = s.player.hp < 35 ? 1.8 : 1.25;
    const damage = id => ({ C01: 6, C04: 10 + 4 * e.mark, C05: 9, C08: 4, C14: 5, C15: 9, C16: 16 }[id] || 0);
    let best = null;
    for (const card of b.hand) {
      const d = c[card.id];
      if (d.cost > b.energy) continue;
      let score = 0;
      const raw = damage(card.id) + (d.attack ? b.nextAttack : 0);
      if (raw >= e.hp + e.block && raw > 0) score += 100;
      score += raw / Math.max(1, d.cost);
      if (card.id === 'C03') score += e.mark < 5 ? 13 + (b.hand.some(x => x.id === 'C04') ? 12 : 0) : -10;
      if (card.id === 'C10') score += b.hand.some(x => c[x.id].attack && c[x.id].cost <= b.energy) ? 20 : -20;
      if (card.id === 'C06') score += 25;
      if (card.id === 'C09') score += b.energy > 1 && b.draw.length + b.discard.length > 0 ? 15 : 1;
      if (card.id === 'C13') score += s.player.hp > 8 && b.draw.length + b.discard.length > 0 ? 18 : -100;
      if (card.id === 'C11') score += e.hp > 15 ? 9 : 1;
      const shield = { C02: 5, C06: 3, C07: 7, C12: 14 }[card.id] || 0;
      score += Math.min(shield, need) * guardWeight / Math.max(1, d.cost);
      if (card.id === 'C04' && !e.mark && e.hp > 10) score -= 5;
      if (card.id === 'C15' && s.player.hp <= 1 && !s.player.relics.includes('fox')) score = -100;
      if (!best || score > best.score) best = { id: card.id, score };
    }
    return best && best.score > 0 ? best.id : null;
  });
}
async function autoBattle() {
  for (let turn = 0; turn < 100; turn++) {
    for (let action = 0; action < 60; action++) {
      const s = await state();
      if (s.screen !== 'battle') return s.screen;
      const id = await chooseAction();
      if (!id) break;
      await play(id);
    }
    if ((await state()).screen !== 'battle') return (await state()).screen;
    await endTurn();
  }
  throw new Error('Autoplayer exceeded 100 turns');
}
async function reward() {
  const s = await state();
  assert.equal(s.screen, 'reward');
  const weights = { C03: 3, C04: 10, C05: 9, C06: 8, C07: 7, C08: 8, C09: 8, C10: 9, C11: 6, C12: 7, C13: 5, C14: 7, C15: 6, C16: 10 };
  const id = [...s.reward.cards].sort((a, b) => weights[b] - weights[a])[0];
  await click('reward', `[data-id="${id}"]`);
}

(async () => {
  const html = fs.readFileSync(target, 'utf8');
  reports.sha256 = crypto.createHash('sha256').update(html).digest('hex');
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
  try {
    const direct = await browser.newPage();
    try { await direct.goto('file://' + target, { waitUntil: 'load', timeout: 15000 }); reports.fileNavigation = { allowed: true, title: await direct.title() }; }
    catch (error) { reports.fileNavigation = { allowed: false, error: error.message }; }
    await direct.close();
    page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('request', req => { if (/^https?:/i.test(req.url())) reports.externalRequests.push(req.url()); });
    await page.setContent(html, { waitUntil: 'load', timeout: 30000 });
    await page.waitForFunction(() => window.game && window.renderGame && window.NightPact);

    await test('开始页、立绘、真实首战及选牌奖励', async () => {
      assert.equal((await state()).screen, 'title');
      assert.equal(await page.locator('[data-action="start"]').count(), 1);
      assert.ok(await page.locator('.intro-art img, .intro-art svg').count());
      await click('start');
      assert.equal((await state()).screen, 'map');
      await click('node', '[data-node="fight"]');
      let s = await state();
      assert.equal(s.battle.hand.length, 5); assert.equal(s.battle.energy, 3);
      assert.equal(await autoBattle(), 'reward');
      s = await state();
      assert.equal(s.player.gold, 80); assert.equal(new Set(s.reward.cards).size, 3);
      const offered = [...s.reward.cards];
      await click('deck'); await click('close');
      assert.deepEqual((await state()).reward.cards, offered);
      await reward();
      s = await state(); assert.equal(s.player.deck.length, 11); assert.equal(s.floor, 2);
      await page.evaluate(id => game.chooseReward(id), offered[0]);
      assert.equal((await state()).player.deck.length, 11); assert.equal((await state()).player.gold, 80);
      await click('node', '[data-node="fight"]');
      s = await state();
      assert.equal(s.battle.hand.length + s.battle.draw.length + s.battle.discard.length, 11);
    });

    await test('费用不足、选敌取消及敌方回合锁定', async () => {
      await fixture(['C04'], { energy: 1 });
      assert.equal(await page.locator('[data-action="card"][data-id="C04"]').isDisabled(), true);
      await page.evaluate(() => document.querySelector('[data-action="card"]').click());
      assert.equal((await state()).battle.energy, 1); assert.equal((await state()).battle.hand.length, 1);
      await fixture(['C01']);
      await click('card'); await click('card');
      assert.equal((await state()).battle.energy, 3);
      await click('card'); await page.keyboard.press('Escape');
      assert.equal((await state()).battle.energy, 3); assert.equal((await state()).battle.enemy.hp, 500);
      await page.evaluate(() => { game.state.battle.phase = 'enemy'; renderGame(); });
      assert.equal(await page.locator('[data-action="card"]').isDisabled(), true);
      await page.evaluate(() => document.querySelector('[data-action="card"]').click());
      assert.equal((await state()).battle.hand.length, 1); assert.equal((await state()).battle.energy, 3);
    });

    await test('地图禁止跳层、同层互斥并标示已完成节点', async () => {
      await newRun();
      assert.equal(await page.locator('.map-node:not(:disabled)').count(), 1);
      const before = await state();
      await page.evaluate(() => game.enterNode('boss'));
      assert.equal((await state()).screen, 'map'); assert.equal((await state()).floor, before.floor);
      await click('node', '[data-node="fight"]');
      await page.evaluate(() => { game.state.battle.enemy.hp = 1; game.state.battle.enemy.block = 0; game.state.battle.hand = [{ uid: 'qa-map', id: 'C01' }]; game.state.battle.energy = 3; renderGame(); });
      await play('C01'); await click('skip-reward');
      assert.equal(await page.locator('.map-node.completed').count(), 1);
      assert.equal(await page.locator('.map-node:not(:disabled)').count(), 2);
      await click('node', '[data-node="rest"]');
      await page.evaluate(() => game.enterNode('fight'));
      assert.equal((await state()).screen, 'rest'); assert.equal((await state()).floor, 2);
      await click('rest', '[data-heal="false"]');
      assert.equal((await state()).floor, 3); assert.equal(await page.locator('.map-node.completed').count(), 2);
    });

    await test('护盾逐段扣除与候机只增强连爪首段', async () => {
      await fixture(['C05']); await page.evaluate(() => { game.state.battle.enemy.block = 5; renderGame(); });
      await play('C05'); let s = await state(); assert.equal(s.battle.enemy.hp, 496); assert.equal(s.battle.enemy.block, 0);
      await fixture(['C10', 'C05']); await play('C10'); await play('C05');
      s = await state(); assert.equal(s.battle.enemy.hp, 487); assert.equal(s.battle.nextAttack, 0);
    });

    await test('标记、金铃、扑杀清标及满标记不触发', async () => {
      await fixture(['C03', 'C04']); await play('C03');
      let s = await state(); assert.equal(s.battle.enemy.mark, 2); assert.equal(s.battle.block, 3);
      await play('C04'); s = await state(); assert.equal(s.battle.enemy.hp, 482); assert.equal(s.battle.enemy.mark, 0);
      await fixture(['C03']); await page.evaluate(() => { game.state.battle.enemy.mark = 5; renderGame(); });
      await play('C03'); assert.equal((await state()).battle.block, 0);
      await fixture(['C04']); await page.evaluate(() => { const e = game.state.battle.enemy; e.mark = 2; e.block = 100; renderGame(); });
      await play('C04'); s = await state(); assert.equal(s.battle.enemy.hp, 500); assert.equal(s.battle.enemy.block, 82); assert.equal(s.battle.enemy.mark, 0);
    });

    await test('弃牌重洗、结算牌不自抽及十张手牌上限', async () => {
      await fixture(['C09'], { discard: [{ uid: 'qa-d1', id: 'C01' }, { uid: 'qa-d2', id: 'C02' }] });
      await play('C09'); let s = await state();
      assert.equal(s.battle.hand.length, 2); assert.ok(!s.battle.hand.some(x => x.id === 'C09'));
      assert.deepEqual(s.battle.discard.map(x => x.id), ['C09']);
      await fixture(['C09', ...Array(9).fill('C01')], { draw: [{ uid: 'qa-o1', id: 'C02' }, { uid: 'qa-o2', id: 'C02' }] });
      await play('C09'); s = await state(); assert.equal(s.battle.hand.length, 10); assert.equal(s.battle.discard.length, 2);
      assert.ok(s.battle.logs.some(x => /上限|溢出|十张|10/.test(x)));
    });

    await test('消耗区隔离、下场恢复且牌堆面板可查看', async () => {
      await fixture(['C06']);
      await page.evaluate(() => { game.state.player.deck.push({ uid: 'qa-exhaust-persistent', id: 'C06' }); game.state.battle.hand[0].uid = 'qa-exhaust-persistent'; renderGame(); });
      await play('C06'); let s = await state(); assert.equal(s.battle.exhaust.length, 1); assert.equal(s.battle.discard.length, 0);
      await click('pile', '[data-pile="exhaust"]'); assert.ok(await page.locator('#modal-root').innerText().then(x => x.includes('猫步'))); await click('close');
      await page.evaluate(() => { game.state.battle.enemy.hp = 1; game.state.battle.hand = [{ uid: 'qa-kill', id: 'C01' }]; game.state.battle.energy = 3; renderGame(); });
      await play('C01'); await click('skip-reward'); await click('node', '[data-node="fight"]');
      s = await state(); assert.ok([...s.battle.draw, ...s.battle.hand].some(x => x.uid === 'qa-exhaust-persistent'));
      await click('deck'); assert.equal(await page.locator('#modal-root .card').count(), s.player.deck.length); await click('close');
      await click('pile', '[data-pile="draw"]'); await click('close'); await click('pile', '[data-pile="discard"]'); await click('close');
    });

    await test('商店商品固定、购买扣钱、实例永久删牌与重复保护', async () => {
      await visit(3, 'shop'); await page.evaluate(() => { game.state.player.gold = 100; renderGame(); });
      let s = await state(); const goods = s.shop.cards.map(x => x.id); const removed = s.player.deck[0].uid;
      assert.equal(new Set(goods).size, 3);
      await click('deck'); await click('close'); assert.deepEqual((await state()).shop.cards.map(x => x.id), goods);
      await click('buy', '[data-index="0"]'); s = await state(); assert.equal(s.player.gold, 65); assert.equal(s.player.deck.length, 11);
      await page.evaluate(() => game.buyCard(0)); assert.equal((await state()).player.gold, 65);
      await click('remove-panel'); await click('remove', `[data-card="${removed}"]`);
      s = await state(); assert.equal(s.player.gold, 25); assert.equal(s.player.deck.length, 10); assert.ok(!s.player.deck.some(x => x.uid === removed));
      await page.evaluate(uid => game.removeCard(uid), removed); assert.equal((await state()).player.gold, 25);
      await click('leave-shop'); await click('node', '[data-node="fight"]'); s = await state();
      assert.ok(![...s.battle.draw, ...s.battle.hand].some(x => x.uid === removed));
      assert.ok([...s.battle.draw, ...s.battle.hand].some(x => x.id === goods[0]));
    });

    await test('休息治疗上限及重复点击保护', async () => {
      await visit(2, 'rest'); await page.evaluate(() => { game.state.player.hp = 50; renderGame(); });
      await click('rest', '[data-heal="true"]'); let s = await state(); assert.equal(s.player.hp, 60); assert.equal(s.floor, 3);
      await page.evaluate(() => game.rest(true)); s = await state(); assert.equal(s.floor, 3); assert.equal(s.player.hp, 60);
      await visit(2, 'rest'); await page.evaluate(() => { game.state.player.hp = 20; renderGame(); });
      await click('rest', '[data-heal="false"]'); assert.equal((await state()).player.hp, 20);
    });

    await test('狐契代价、自损免死、消失及后续致死', async () => {
      await visit(3, 'fox'); await click('fox', '[data-sign="true"]');
      let s = await state(); assert.equal(s.player.maxHp, 52); assert.equal(s.player.hp, 52); assert.ok(s.player.relics.includes('fox')); assert.equal(s.floor, 4);
      await page.evaluate(() => game.fox(true)); assert.equal((await state()).player.maxHp, 52);
      await click('node', '[data-node="fight"]');
      await page.evaluate(() => { const s = game.state; s.player.hp = 2; s.battle.hand = [{ uid: 'qa-blood', id: 'C13' }]; s.battle.draw = []; s.battle.discard = []; s.battle.energy = 3; renderGame(); });
      await play('C13'); s = await state(); assert.equal(s.player.hp, 12); assert.ok(!s.player.relics.includes('fox')); assert.equal(s.screen, 'battle');
      await page.evaluate(() => { game.state.player.hp = 1; game.state.battle.hand = [{ uid: 'qa-fire', id: 'C15' }]; renderGame(); });
      const enemyHp = (await state()).battle.enemy.hp;
      await play('C15'); s = await state(); assert.equal(s.screen, 'defeat'); assert.equal(s.player.hp, 0); assert.equal(s.battle.enemy.hp, enemyHp);
      await restartRun(); s = await state(); assert.equal(s.player.hp, 60); assert.equal(s.player.maxHp, 60); assert.equal(s.player.gold, 60); assert.equal(s.player.deck.length, 10); assert.deepEqual(s.player.relics, ['bell']); assert.equal(s.floor, 1);
    });

    await test('蛇妖毒与蜕鳞意图、准确执行和跨回合护盾', async () => {
      await visit(6, 'boss');
      await page.evaluate(() => { const b = game.state.battle; b.enemy.intentIndex = 1; b.block = 0; b.poison = 0; renderGame(); });
      const poisonText = await page.locator('#intent-text').innerText(); assert.match(poisonText, /6/); assert.match(poisonText, /3/); assert.match(poisonText, /毒/);
      await endTurn(); let s = await state(); assert.equal(s.player.hp, 51); assert.equal(s.battle.poison, 2);
      assert.match(await page.locator('#intent-text').innerText(), /清除.*标记/);
      await page.evaluate(() => { game.state.battle.enemy.mark = 4; renderGame(); });
      await endTurn(); s = await state(); assert.equal(s.battle.enemy.mark, 0); assert.equal(s.battle.enemy.block, 10); assert.equal(s.player.hp, 49); assert.equal(s.battle.poison, 1);
      const next = await page.locator('#intent-text').innerText(); assert.match(next, /3/); assert.match(next, /5/);
    });

    await test('噬魂击杀治疗、胜利终止与重开完全初始化', async () => {
      await visit(6, 'boss');
      await page.evaluate(() => { const s = game.state; s.player.hp = 20; s.battle.enemy.hp = 1; s.battle.enemy.block = 0; s.battle.hand = [{ uid: 'qa-soul', id: 'C14' }]; s.battle.energy = 3; renderGame(); });
      await play('C14'); let s = await state(); assert.equal(s.screen, 'victory'); assert.equal(s.player.hp, 23);
      const snapshot = JSON.stringify(s.player);
      await page.evaluate(() => { game.playCard('qa-soul', true); game.endTurn(); game.resolveEnemyTurn(); });
      assert.equal(JSON.stringify((await state()).player), snapshot);
      await click('deck'); assert.equal(await page.locator('#modal-root .card').count(), s.player.deck.length); await click('close');
      await restartRun(); s = await state(); assert.equal(s.floor, 1); assert.equal(s.player.hp, 60); assert.equal(s.player.maxHp, 60); assert.equal(s.player.gold, 60); assert.equal(s.player.deck.length, 10); assert.deepEqual(s.player.relics, ['bell']); assert.equal(s.history.length, 0);
    });

    await test('真实 DOM 连续六层路线、通关和重开（无状态修改）', async () => {
      let won = false; const attempts = [];
      for (let attempt = 0; attempt < 8 && !won; attempt++) {
        await newRun(); let terminal = null;
        for (const node of ['fight', 'rest', 'fox', 'elite', 'shop', 'boss']) {
          await click('node', `[data-node="${node}"]`);
          if (node === 'rest') await click('rest', '[data-heal="true"]');
          else if (node === 'fox') await click('fox', '[data-sign="true"]');
          else if (node === 'shop') {
            const s = await state();
            const pref = { C04: 10, C16: 10, C05: 9, C10: 9, C08: 8, C09: 8, C06: 8, C07: 7, C12: 7, C14: 7, C11: 6, C15: 6, C13: 5, C03: 3 };
            const best = s.shop.cards.map((x, i) => ({ id: x.id, i })).sort((a, b) => pref[b.id] - pref[a.id]);
            for (const card of best) if ((await state()).player.gold >= 35) await click('buy', `[data-index="${card.i}"]`);
            await click('leave-shop');
          } else {
            terminal = await autoBattle();
            if (terminal === 'defeat') break;
            if (terminal === 'reward') await reward();
          }
        }
        const s = await state(); attempts.push({ screen: s.screen, hp: s.player.hp, floor: s.floor, battles: s.stats.battles });
        won = s.screen === 'victory';
      }
      reports.realRouteAttempts = attempts;
      assert.ok(won, 'No real DOM victory in eight attempts: ' + JSON.stringify(attempts));
      await restartRun(); const s = await state(); assert.equal(s.floor, 1); assert.equal(s.player.deck.length, 10);
    });

    await test('游戏内导出完整 HTML，可重新独立打开并从初始状态开始', async () => {
      const pending = page.waitForEvent('download', { timeout: 8000 });
      await click('export');
      const download = await pending;
      assert.match(download.suggestedFilename(), /\.html$/);
      const stream = await download.createReadStream(), chunks = [];
      for await (const chunk of stream) chunks.push(chunk);
      const exported = Buffer.concat(chunks).toString('utf8');
      assert.ok(exported.startsWith('<!doctype html>'));
      assert.ok(exported.includes('NightPact') && (exported.includes('data:image/') || exported.includes('<svg')));
      const reopened = await browser.newPage();
      try {
        await reopened.setContent(exported, { waitUntil: 'load' });
        await reopened.waitForFunction(() => window.game);
        assert.equal(await reopened.evaluate(() => game.state.screen), 'title');
        await reopened.locator('[data-action="start"]').click();
        assert.equal(await reopened.evaluate(() => game.state.player.hp), 60);
      } finally { await reopened.close(); }
      reports.exportedBytes = Buffer.byteLength(exported);
    });

    await test('运行时无网络请求及无 JavaScript 未捕获错误', async () => {
      assert.deepEqual(reports.externalRequests, []); assert.deepEqual(errors, []);
    });
    reports.browser = await browser.version();
  } finally {
    await browser.close();
    console.log(JSON.stringify(reports, null, 2));
  }
  if (results.some(r => !r.ok)) process.exitCode = 1;
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
