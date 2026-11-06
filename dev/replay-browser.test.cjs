'use strict';
/* review.12 independent browser acceptance.
 * Run after the final strict build: node dev/replay-browser.test.cjs
 * --list reports the planned cases without claiming execution.
 * REPLAY_QA_FILTER limits cases; a filtered report is explicitly incomplete.
 * DOM runs and injected rare-state fixtures are labelled separately. */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { nextCard, nextItem } = require('./playtest.cjs');

const root = path.resolve(__dirname, '..');
const entry = path.resolve(process.env.REPLAY_QA_ENTRY || path.join(root, 'index.html'));
const out = path.resolve(process.env.REPLAY_QA_OUT || path.join(root, 'docs/review-v12/qa'));
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const cases = [];
const report = {
  format: 'baiyao-review12-independent-browser-v1',
  method: 'Chromium over loopback HTTP. DOM actions are real UI interactions; explicitly marked fixtures are not natural full-run playthroughs. Automated card policy reads engine state. Viewports are emulated, not physical phones.',
  startedAt: new Date().toISOString(), entry, filter: process.env.REPLAY_QA_FILTER || null,
  results: [], pageErrors: [], failedRequests: [], externalRequests: [], dialogs: [], screenshots: [],
  untested: ['Physical phones', 'Human usability sessions', 'Complete natural seven-region campaigns', 'Operating-system termination while writing localStorage', 'Native OS clipboard permission: clipboard success/denial are API fixtures', 'Every equipment proc in live combat: the three visual modes are sampled with rime']
};
let browser, server, origin, context, page;

class PendingCase extends Error {}
function scenario(id, name, method, run) { cases.push({ id, name, method, run }); }
function pending(reason) { throw new PendingCase(reason); }
function writeReport() {
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'qa-browser.json'), JSON.stringify(report, null, 2) + '\n');
}
async function idle() {
  await page.waitForFunction(() => window.game && !window.uiBusy, null, { timeout: 45000 });
}
async function click(action, attrs = '') {
  await idle();
  const control = page.locator(`[data-action="${action}"]${attrs}:not(:disabled)`).first();
  await control.scrollIntoViewIfNeeded({ timeout: 10000 });
  await control.click({ timeout: 10000 });
  await idle();
}
async function closeModal() {
  if (await page.locator('#modal-root [role="dialog"]').count()) {
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('#modal-root [role="dialog"]'));
  }
}
async function openCollection() {
  if (!await page.locator('[data-action="collection"]').count()) { await click('restart'); await click('title'); }
  await click('collection');
}
const state = () => page.evaluate(() => JSON.parse(JSON.stringify(game.state)));
const profile = () => page.evaluate(() => JSON.parse(JSON.stringify(game.getProfile())));
const storage = () => page.evaluate(() => Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])));
async function screenshot(name) {
  const file = path.join(out, `qa-${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  report.screenshots.push(path.relative(root, file));
  return file;
}
async function load({ width = 390, height = width < 500 ? 844 : 1000, saved = {}, denyWrites = false } = {}) {
  await context?.close();
  context = await browser.newContext({ viewport: { width, height } });
  if (Object.keys(saved).length || denyWrites) await context.addInitScript(({ values, denyWrites }) => {
    // Seed only the first navigation; refresh must read the game's own writes.
    if (!sessionStorage.getItem('review12-qa-storage-seeded')) {
      for (const [key, value] of Object.entries(values)) localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
      sessionStorage.setItem('review12-qa-storage-seeded', 'yes');
    }
    if (denyWrites) { const set = Storage.prototype.setItem; Storage.prototype.setItem = function (key, value) { if (this === localStorage) throw new DOMException('QA storage quota rejection', 'QuotaExceededError'); return set.call(this, key, value); }; }
  }, { values: saved, denyWrites });
  page = await context.newPage();
  page.on('pageerror', error => report.pageErrors.push({ message: error.message, url: page.url() }));
  page.on('dialog', async dialog => { report.dialogs.push({ type: dialog.type(), message: dialog.message() }); await dialog.accept(); });
  page.on('request', request => {
    if (/^https?:/.test(request.url()) && !request.url().startsWith(origin + '/')) report.externalRequests.push(request.url());
  });
  page.on('requestfailed', request => {
    if (request.failure()?.errorText !== 'net::ERR_ABORTED') report.failedRequests.push({ url: request.url(), error: request.failure()?.errorText });
  });
  page.on('response', response => { if (response.status() >= 400) report.failedRequests.push({ url: response.url(), status: response.status() }); });
  await page.goto(origin + '/', { waitUntil: 'load' });
  await page.waitForFunction(() => window.game && window.NightPact);
}
async function prepareDOM(character = 'sword', config = {}) {
  await click('new-journey');
  await click('character', `[data-character="${character}"]`);
  if (config.mode) await click('replay-mode', `[data-mode="${config.mode}"]`);
  if (config.challenge !== undefined) await click('replay-challenge', `[data-level="${config.challenge}"]`);
  if (config.oath !== undefined) await click('replay-oath', `[data-oath="${config.oath || ''}"]`);
  if (config.finale) await click('replay-finale', `[data-finale="${config.finale}"]`);
  if (config.echo) await click('replay-echo', `[data-kind="${config.echo.kind}"][data-id="${config.echo.id}"]`);
  if (config.seed !== undefined) { await page.locator('#replay-seed').fill(config.seed); await page.locator('#replay-seed').dispatchEvent('change'); }
}
async function startPrepared() {
  await click('start');
  await completeOpening();
}
async function completeOpening() {
  if (await page.locator('[data-prologue="skip"]').count()) await page.locator('[data-prologue="skip"]').click();
  await page.waitForFunction(() => game.state.screen === 'arrival');
  await click('arrival-enter');
  assert.equal((await state()).screen, 'map');
}
async function startDOM(character = 'sword', config = {}) { await prepareDOM(character, config); await startPrepared(); }
async function motion(mode) { await click('settings'); await click('motion', `[data-mode="${mode}"]`); await closeModal(); }
const snapshot = () => page.evaluate(() => game.exportRun());
async function refreshAndResume() {
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.game);
  assert.equal((await state()).screen, 'title');
  await click('resume');
  await idle();
}
async function importEarnedFixture(extra = {}) {
  return page.evaluate(extra => {
    const p = NightReplayProfile.normalize({}, NightPact);
    p.collections = { weapons: ['rime', 'spirit'], relics: ['jade', 'moon'], cosmetics: ['moon'] };
    Object.assign(p, extra);
    if (!game.importProfile(p)) throw new Error('Earned collection fixture rejected');
    renderGame();
    return game.getProfile();
  }, extra);
}
async function firstBattleDOM() {
  const node = await page.evaluate(() => game.getAvailableNodes().find(node => node.type === 'fight')?.id);
  assert.ok(node, 'Opening has a reachable normal battle');
  await click('node', `[data-node="${node}"]`);
  assert.equal((await state()).screen, 'battle');
}
async function claimRewardDOM() {
  if ((await state()).reward?.weaponPending) await click('skip-weapon-reward');
  if ((await state()).reward?.relicPending) await click('choose-relic');
  if ((await state()).screen === 'reward') await click('reward');
  await idle();
}
async function enterBattleFixture({ boss = false, final = false } = {}) {
  await page.evaluate(({ boss, final }) => {
    const s = game.state;
    if (final || boss) { s.floor = final ? s.totalFloors : 10; s.journey.regionIndex = final ? s.regions.length - 1 : 0; }
    const node = boss || final ? s.map[s.floor - 1][0] : game.getAvailableNodes()[0];
    if (!node) throw new Error('Fixture needs a real map node');
    s.screen = 'map'; s.availableNodes = [node.id];
    node.type = boss || final ? 'boss' : 'fight'; node.revealed = true; delete node.storyId;
    node.encounter = { kind: node.type, enemyId: final ? NightPact.BOSS_POOLS.final : boss ? 'gate_boss' : 'paper' };
    if (!game.enterNode(node.id) || s.screen !== 'battle') throw new Error('Fixture did not enter battle: ' + s.screen);
    renderGame();
  }, { boss, final });
  await idle();
}
async function quickWinDOM() {
  const card = await page.evaluate(() => {
    const s = game.state, b = s.battle, c = s.player.deck.find(c => c.id === 'S01') || s.player.deck.find(c => NightPact.CARDS[c.id]?.attack);
    if (!c) throw new Error('Fixture requires a real attack card from this deck');
    b.discard.push(...b.hand.filter(h => h.uid !== c.uid));
    for (const key of ['draw', 'discard', 'exhaust']) b[key] = b[key].filter(h => h.uid !== c.uid);
    b.hand = [{ ...c }]; b.energy = Math.max(3, NightPact.CARDS[c.id].cost); b.phase = 'player';
    b.enemy.hp = 1; b.enemy.block = 0; b.enemy.counter = 0; b.enemy.shellUsed = true;
    renderGame(); return c;
  });
  await playCardDOM(card);
  assert.notEqual((await state()).screen, 'battle', 'A real UI attack must finish the one-hit fixture');
}
async function playCardDOM(card) {
  await click('card', `[data-card="${card.uid}"]`);
  if (await page.evaluate(id => !!NightPact.CARDS[id].target, card.id)) await click('target');
  await idle();
}
async function finishBattleDOM() {
  let actions = 0;
  while (actions++ < 500) {
    const s = await state();
    if (s.screen !== 'battle') return { screen: s.screen, actions: actions - 1, hp: s.player.hp, battles: s.stats.battles };
    const item = nextItem(s);
    if (item) { await click('bag'); await click('use-item', `[data-item="${item}"]`); await closeModal(); continue; }
    const card = nextCard(s);
    if (card) await playCardDOM(card); else await click('end-turn');
  }
  throw new Error('Battle did not finish in 500 UI actions');
}
async function assertLayout(label, selectors = ['#app', '#hud', '[role="dialog"]']) {
  const geometry = await page.evaluate(selectors => {
    const boxes = [], matches = {};
    for (const selector of selectors) {
      matches[selector] = { count: 0, visible: 0 };
      for (const element of document.querySelectorAll(selector)) {
        matches[selector].count++;
        const rect = element.getBoundingClientRect(), style = getComputedStyle(element);
        if (rect.width && rect.height && style.visibility !== 'hidden' && style.display !== 'none') { matches[selector].visible++; boxes.push({ selector, left: rect.left, right: rect.right, width: rect.width, height: rect.height }); }
      }
    }
    return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth, matches, boxes };
  }, selectors);
  assert.ok(geometry.scrollWidth <= geometry.width + 1, `${label}: horizontal overflow ${JSON.stringify(geometry)}`);
  for (const selector of selectors.filter(selector => !['#hud', '[role="dialog"]'].includes(selector))) assert.ok(geometry.matches[selector].visible > 0, `${label}: missing or zero-sized ${selector}`);
  for (const box of geometry.boxes) assert.ok(box.left >= -1 && box.right <= geometry.width + 1, `${label}: clipped ${JSON.stringify(box)}`);
  return geometry;
}

scenario('fresh-profile', 'Fresh browser creates a usable v2 profile without phantom rewards', 'DOM, fresh storage', async () => {
  await load();
  const p = await profile();
  assert.equal(p.version, 2); assert.deepEqual(p.unlocks, []); assert.deepEqual(p.collections, { weapons: [], relics: [], cosmetics: [] });
  assert.equal(p.runSerial, 0); assert.deepEqual(p.records, []); assert.deepEqual(p.cooldowns, {});
  assert.equal(await page.locator('[data-action="resume"]').count(), 0);
  await click('collection'); assert.match(await page.locator('[role="dialog"]').innerText(), /空着|尚无|没有/);
  await screenshot('fresh-vault-390'); await closeModal(); await prepareDOM('sword');
  assert.equal(await page.locator('[data-action="replay-mode"]').count(), 2);
  assert.equal(await page.locator('[data-action="replay-challenge"]').count(), 4);
  return { profile: p, layout: await assertLayout('fresh preparation') };
});
scenario('legacy-migration', 'Legacy v1 unlock migrates once and survives refresh', 'Legacy localStorage fixture, DOM refresh', async () => {
  await load({ saved: { 'baiyao-night-profile-v1': { version: 1, unlocks: ['feiye'] } } });
  const migrated = await profile(); assert.equal(migrated.version, 2); assert.deepEqual(migrated.unlocks, ['feiye']); assert.equal(migrated.records.length, 0);
  await click('new-journey'); assert.equal(await page.locator('[data-action="character"][data-character="sovereign"]').isVisible(), true);
  await page.reload({ waitUntil: 'load' }); await page.waitForFunction(() => window.game);
  assert.deepEqual(await profile(), migrated);
  const stored = JSON.parse((await storage())['baiyao-night-profile-v2']); assert.deepEqual(stored, migrated);
  await screenshot('legacy-migration');
  return { oldVersion: 1, migratedVersion: migrated.version, unlocks: migrated.unlocks, recordCount: migrated.records.length };
});
scenario('run-setup', 'Mode, seed, contract and challenge selections enter the actual run', 'DOM selections and engine-state assertions', async () => {
  const runs = [];
  for (const mode of ['short', 'long', 'short']) {
    await load(); await prepareDOM('sword');
    for (let level = 0; level <= 3; level++) { await click('replay-challenge', `[data-level="${level}"]`); assert.equal(await page.locator(`[data-action="replay-challenge"][data-level="${level}"]`).getAttribute('aria-pressed'), 'true'); }
    const oaths = await page.locator('[data-action="replay-oath"]').evaluateAll(elements => elements.map(element => element.dataset.oath));
    assert.ok(oaths.length >= 3, 'At least two real build contracts plus free choice');
    for (const oath of oaths) { await click('replay-oath', `[data-oath="${oath}"]`); assert.equal(await page.locator('[data-action="replay-oath"][aria-pressed="true"]').count(), 1); }
    await click('replay-mode', `[data-mode="${mode}"]`); await click('replay-challenge', '[data-level="1"]'); await click('replay-oath', `[data-oath="${oaths[1]}"]`); await click('replay-finale', '[data-finale="abyss"]');
    await page.locator('#replay-seed').fill('review12-repeatable-地图'); await page.locator('#replay-seed').dispatchEvent('change');
    if (runs.length === 0) await screenshot('configured-departure');
    await startPrepared();
    const s = await state(), snap = await snapshot();
    assert.equal(s.replay.mode, mode); assert.equal(s.replay.seed, 'review12-repeatable-地图'); assert.equal(s.replay.challenge, 1); assert.equal(s.replay.oath, oaths[1]); assert.equal(s.replay.finale, 'abyss'); assert.equal(s.totalFloors, mode === 'short' ? 30 : 70); assert.equal(s.map.length, s.totalFloors);
    runs.push({ mode, oath: s.replay.oath, seed: s.replay.seed, challenge: s.replay.challenge, totalFloors: s.totalFloors, mapSHA256: sha(JSON.stringify(s.map)), deckSHA256: sha(JSON.stringify(s.player.deck)), rngState: snap.rngState });
  }
  assert.equal(runs[0].mapSHA256, runs[2].mapSHA256); assert.equal(runs[0].deckSHA256, runs[2].deckSHA256); assert.equal(runs[0].rngState, runs[2].rngState);
  return { runs, repeatedSeedIdentical: true };
});
scenario('resume-battle', 'First battle is playable and a stable checkpoint resumes after refresh', 'Natural opening and DOM battle, no resource injection', async () => {
  await load(); await startDOM('sword', { mode: 'short', seed: 'review12-natural-first', challenge: 0, oath: null }); await motion('fast'); await firstBattleDOM();
  const before = await snapshot(); assert.equal(before.version, 2); assert.equal(before.engine, 'review12');
  await refreshAndResume(); assert.deepEqual(await snapshot(), before, 'Restored battle, cards, RNG cursor and run id must match the saved checkpoint');
  await motion('fast'); const result = await finishBattleDOM(); assert.equal(result.screen, 'reward'); assert.equal((await state()).stats.battles, 1);
  await claimRewardDOM(); const after = await snapshot(); assert.equal(after.state.screen, 'map'); assert.equal(after.state.floor, 2);
  await refreshAndResume(); assert.deepEqual(await snapshot(), after, 'Post-reward map checkpoint resumes without duplicate reward');
  await screenshot('resumed-map-390');
  return { battle: result, runId: before.state.replay.id, initialRNG: before.rngState, rewardRNG: after.rngState, battleCheckpointHash: sha(JSON.stringify(before)), mapCheckpointHash: sha(JSON.stringify(after)) };
});
scenario('backup-validation', 'Full backups restore normal fields and reject damaged data transactionally', 'Real backup controls; deliberately corrupted backup fixture', async () => {
  await load(); await importEarnedFixture(); await startDOM('sword', { mode: 'short', seed: 'review12-backup' }); await firstBattleDOM();
  await click('settings'); const backup = JSON.parse(await page.locator('#profile-code').inputValue());
  assert.equal(backup.version, 2); assert.equal(backup.profile.version, 2); assert.equal(backup.run.engine, 'review12');
  const stateBefore = await snapshot(), profileBefore = await profile(), storageBefore = await storage();
  const broken = JSON.parse(JSON.stringify(backup)); broken.profile.unlocks = ['feiye']; broken.run.state.player.hp = -1;
  await page.locator('#profile-code').fill(JSON.stringify(broken)); await click('profile-import');
  assert.deepEqual(await snapshot(), stateBefore); assert.deepEqual(await profile(), profileBefore); assert.deepEqual(await storage(), storageBefore);
  assert.match(await page.locator('.replay-import-feedback').innerText(), /不|失败|无效|错误/);
  // A clean browser has neither the earned collection nor the active run.
  // Importing here proves restoration; importing into the original unchanged
  // state would also pass if the successful import path were a no-op.
  await load(); assert.equal((await state()).screen, 'title'); assert.deepEqual((await profile()).collections.weapons, []);
  await click('settings'); await page.locator('#profile-code').fill(JSON.stringify(backup)); await click('profile-import');
  assert.deepEqual(await snapshot(), stateBefore); assert.deepEqual(await profile(), profileBefore);
  await closeModal(); await screenshot('backup-roundtrip');
  return { backupFields: Object.keys(backup), rejectedCorruption: 'negative hp with otherwise-valid changed profile', restoredInFreshBrowserContext: true, validRoundTrip: true };
});
scenario('resume-enemy-phase', 'Refreshing after end-turn resolves the saved enemy phase exactly once', 'Real end-turn click interrupted by navigation; deterministic engine oracle', async () => {
  await load(); await startDOM('sword', { mode: 'short', seed: 'review12-enemy-resume', oath: null }); await motion('full'); await firstBattleDOM();
  await page.locator('[data-action="end-turn"]').click();
  await page.waitForFunction(() => game.state.battle?.phase === 'enemy', null, { timeout: 5000 });
  const saved = await snapshot(), p = await profile(); assert.equal(saved.state.battle.phase, 'enemy');
  // Navigate before doing Node-side oracle work, then prove the persisted
  // checkpoint is still the enemy phase. Otherwise a completed enemy turn
  // could be resumed and falsely appear to test interrupted-phase recovery.
  await page.reload({ waitUntil: 'load' }); await page.waitForFunction(() => window.game);
  assert.equal((await state()).screen, 'title');
  const persisted = JSON.parse((await storage())['baiyao-night-run-v2']); assert.equal(persisted.state.battle.phase, 'enemy'); assert.deepEqual(persisted, saved);
  const E = require('./engine.js'), oracle = E.createGame({ profile: p }); assert.equal(oracle.importRun(saved), true); oracle.resolveEnemyTurn(); const expected = oracle.exportRun();
  await click('resume'); await idle(); const actual = await snapshot();
  assert.deepEqual(actual, expected, 'Resume executes the saved enemy phase once, retaining RNG and draw order');
  assert.equal(actual.state.battle.turn, saved.state.battle.turn + 1); await screenshot('enemy-phase-resumed-once');
  return { phaseBefore: saved.state.battle.phase, persistedPhaseBeforeResume: persisted.state.battle.phase, phaseAfter: actual.state.battle.phase, turnBefore: saved.state.battle.turn, turnAfter: actual.state.battle.turn, expectedHash: sha(JSON.stringify(expected)), actualHash: sha(JSON.stringify(actual)) };
});
scenario('storage-denied', 'Rejected localStorage writes show an actionable warning while manual backup remains usable', 'Storage.setItem quota-error fixture; real start/battle/settings clicks', async () => {
  await load({ denyWrites: true }); await startDOM('sword', { mode: 'short', seed: 'review12-no-storage', oath: null }); await firstBattleDOM();
  const warnings = page.locator('.replay-storage-warning'); assert.ok(await warnings.count()); assert.match(await warnings.first().innerText(), /保存失败|禁止|空间不足/);
  assert.equal((await storage())['baiyao-night-run-v2'], undefined);
  await click('settings'); const backup = JSON.parse(await page.locator('#profile-code').inputValue()); assert.equal(backup.run.state.screen, 'battle'); assert.equal(backup.run.state.replay.seed, 'review12-no-storage');
  await screenshot('storage-denied-manual-backup'); return { warning: await warnings.first().innerText(), exportVersion: backup.version, snapshotAvailable: true, simulatedQuotaFailure: true };
});
scenario('corrupt-storage', 'Malformed local run JSON is reported without silently overwriting the original', 'Corrupted localStorage fixture', async () => {
  const raw = '{broken-review12'; await load({ saved: { 'baiyao-night-run-v2': raw } });
  assert.equal((await state()).screen, 'title'); assert.equal(await page.locator('[data-action="resume"]').count(), 0);
  assert.match(await page.locator('.replay-storage-warning').first().innerText(), /存档|无法读取/);
  assert.equal((await storage())['baiyao-night-run-v2'], raw);
  await click('profile'); assert.equal(await page.locator('#profile-code').isVisible(), true); await screenshot('corrupt-save-warning');
  return { originalPreserved: true, resumeOffered: false, backupReachable: true };
});
scenario('vault-echo', 'Only one vault echo is selected; the first three battles consume it once', 'Declared earned-item and one-hit encounter fixtures; real DOM selection/attacks', async () => {
  await load(); await importEarnedFixture(); await prepareDOM('sword', { mode: 'short', seed: 'review12-echo', oath: null });
  await click('replay-echo', '[data-kind="weapon"][data-id="rime"]');
  await click('replay-echo', '[data-kind="relic"][data-id="jade"]');
  assert.equal(await page.locator('[data-action="replay-echo"][aria-pressed="true"]').count(), 1);
  assert.equal(await page.locator('[data-action="replay-echo"][data-id="rime"]').getAttribute('aria-pressed'), 'false');
  await startPrepared(); await motion('off');
  const pre = await state(); assert.deepEqual({ kind: pre.replay.echo.kind, id: pre.replay.echo.id, remaining: pre.replay.echo.remaining, claimed: pre.replay.echo.claimed }, { kind: 'relic', id: 'jade', remaining: 3, claimed: false });
  assert.equal((await profile()).cooldowns['relic:jade'], undefined);
  const battles = [];
  for (let number = 1; number <= 4; number++) {
    await enterBattleFixture(); const before = await state();
    assert.equal(before.player.relics.includes('jade'), number <= 3); assert.equal(before.player.weaponInventory.includes('rime'), false);
    assert.equal(before.replay.echo.remaining, Math.max(0, 4 - number));
    if (number === 1) { const saved = await snapshot(); await refreshAndResume(); assert.deepEqual(await snapshot(), saved); await motion('off'); }
    await quickWinDOM(); const after = await state(); assert.equal(after.replay.echo.remaining, Math.max(0, 3 - number));
    if (number >= 3) assert.equal(after.player.relics.includes('jade'), false);
    battles.push({ number, before: before.replay.echo.remaining, after: after.replay.echo.remaining, carried: before.player.relics.includes('jade') });
    await claimRewardDOM();
  }
  const p = await profile(); assert.ok(p.collections.relics.includes('jade')); assert.equal(p.cooldowns['relic:jade'], pre.replay.id);
  await openCollection(); await click('collection-tab', '[data-tab="relics"]');
  assert.match(await page.locator('.replay-collection-card[data-relic="jade"]').innerText(), /温养中/); await screenshot('echo-after-four-battles');
  return { battles, cooldown: p.cooldowns['relic:jade'], permanentCollectionRetained: true };
});
scenario('echo-nurture', 'Passing another run’s first region restores older echoes, but never the echo carried in this run', 'Prior-cooldown and first-boss fixtures; real finishing attack', async () => {
  await load(); await importEarnedFixture({ runSerial: 1, cooldowns: { 'weapon:rime': 1 } });
  await prepareDOM('sword', { mode: 'short', seed: 'review12-warm', oath: null, echo: { kind: 'relic', id: 'jade' } });
  assert.equal(await page.locator('[data-action="replay-echo"][data-id="rime"]').isDisabled(), true);
  await startPrepared(); await motion('off'); await enterBattleFixture({ boss: true });
  const before = await profile(); assert.equal(before.cooldowns['weapon:rime'], 1); assert.equal(before.cooldowns['relic:jade'], 2);
  await quickWinDOM(); const after = await profile(); assert.equal(after.cooldowns['weapon:rime'], undefined); assert.equal(after.cooldowns['relic:jade'], 2); assert.equal((await state()).replay.recharged, true);
  const saved = await snapshot(); await refreshAndResume(); assert.deepEqual(await snapshot(), saved); assert.deepEqual(await profile(), after);
  await openCollection(); await click('collection-tab', '[data-tab="weapons"]'); assert.match(await page.locator('.replay-collection-card[data-weapon="rime"]').innerText(), /回响可带出/); await screenshot('echo-warmed-after-first-boss');
  return { before: before.cooldowns, after: after.cooldowns, currentRunEchoStillCooling: true, checkpointRestored: true };
});
scenario('prebattle-acquisition', 'A real matching weapon or relic acquired before the first battle survives all three echo victories', 'Published shop-stock / event-choice fixtures; real buy/choice clicks and winning attacks', async () => {
  const results = [];
  for (const kind of ['weapon', 'relic']) {
    const id = kind === 'weapon' ? 'rime' : 'jade';
    await load(); await importEarnedFixture(); await startDOM('sword', { mode: 'short', seed: 'review12-prebattle-' + kind, oath: null, echo: { kind, id } }); await motion('off');
    assert.equal((await state()).replay.echo.claimed, false);
    await page.evaluate(({ kind, id }) => {
      const node = game.getAvailableNodes()[0]; node.type = kind === 'weapon' ? 'shop' : 'event'; delete node.storyId; delete node.encounter;
      if (!game.enterNode(node.id)) throw new Error('Prebattle acquisition fixture node rejected');
      if (kind === 'weapon') game.state.shop.weapons = [{ id, price: NightPact.WEAPONS[id].price, bought: false }];
      else game.state.event = { id: 'shrine', name: '祠前所得（验收夹具）', glyph: '祠', kicker: 'QA acquisition fixture', story: ['此夹具验证首战前真实收下遗物的规则路径。'], npc: null, resolved: false, choices: [{ label: '收下磨爪玉', text: '收下旅途中取得的真品。', relic: id, outcome: '真品收入本局行囊。' }] };
      renderGame();
    }, { kind, id });
    if (kind === 'weapon') { const gold = (await state()).player.gold; await click('buy-weapon', '[data-index="0"]'); assert.equal((await state()).player.gold, gold - 45); await click('leave-shop'); }
    else { await click('event-choice', '[data-index="0"]'); await click('event-leave'); }
    const acquired = await state(); assert.equal(acquired.replay.echo.acquired, true); assert.equal(acquired.replay.echo.claimed, false);
    assert.ok(acquired.player[kind === 'weapon' ? 'weaponInventory' : 'relics'].includes(id));
    const saved = await snapshot(); await refreshAndResume(); assert.deepEqual(await snapshot(), saved); await motion('off');
    for (let battle = 0; battle < 3; battle++) { await enterBattleFixture(); await quickWinDOM(); await claimRewardDOM(); }
    const after = await state(); assert.equal(after.replay.echo.acquired, true); assert.equal(after.replay.echo.remaining, 0); assert.ok(after.player[kind === 'weapon' ? 'weaponInventory' : 'relics'].includes(id), 'Owned ' + kind + ' must not disappear with the temporary echo');
    if (kind === 'weapon') assert.equal(after.player.equippedWeapon, id);
    await screenshot('prebattle-real-' + kind + '-retained'); results.push({ kind, id, beforeClaimed: acquired.replay.echo.claimed, acquiredBeforeBattle: acquired.replay.echo.acquired, victories: after.stats.battles, remaining: after.replay.echo.remaining, stillOwned: true });
  }
  return { results };
});
scenario('abandon-guard', 'Abandoning cannot refresh echo readiness or award settlement repeatedly', 'DOM abandon confirmation and fresh-run sequence', async () => {
  await load(); await importEarnedFixture(); await startDOM('sword', { mode: 'short', seed: 'review12-abandon', oath: null, echo: { kind: 'relic', id: 'jade' } }); await motion('off'); await firstBattleDOM();
  const usedRun = (await state()).replay.id, sequence = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    const savedId = (await state()).replay.id;
    await click('restart'); await click('replay-prepare');
    assert.equal(await page.locator('[data-action="replay-echo"][data-id="jade"]').isDisabled(), true);
    await click('replay-oath', '[data-oath=""]'); await click('start');
    assert.equal(await page.locator('[data-action="replay-abandon-confirm"]').isVisible(), true);
    assert.equal(JSON.parse((await storage())['baiyao-night-run-v2']).state.replay.id, savedId, 'Preparation must not replace the old checkpoint');
    await closeModal(); assert.equal((await profile()).cooldowns['relic:jade'], usedRun);
    await click('start'); await click('replay-abandon-confirm'); await completeOpening();
    const s = await state(), p = await profile(); assert.ok(s.replay.id > savedId); assert.equal(s.replay.echo, null); assert.equal(p.cooldowns['relic:jade'], usedRun); assert.equal(p.records.length, 0);
    sequence.push({ old: savedId, next: s.replay.id, cooldown: p.cooldowns['relic:jade'], records: p.records.length });
  }
  await refreshAndResume(); assert.equal((await profile()).cooldowns['relic:jade'], usedRun); await screenshot('abandon-does-not-warm');
  return { sequence, stillCoolingAfterRefresh: true };
});
scenario('share-result', 'Settlement summary reflects the run and its configuration can be copied for sharing', 'Final-boss one-hit fixture; real final attack and sharing controls', async () => {
  await load(); await startDOM('sword', { mode: 'short', seed: 'review12-result-seed', challenge: 1, oath: null, finale: 'fate' }); await motion('off');
  await enterBattleFixture({ final: true }); await quickWinDOM(); assert.equal((await state()).screen, 'victory');
  const s = await state(), p = await profile(), record = p.records.find(record => record.id === s.replay.id);
  assert.ok(record); assert.equal(record.won, true); assert.equal(record.seed, s.replay.seed); assert.equal(record.battles, s.stats.battles); assert.equal(record.maxHit, s.stats.maxHit);
  assert.match(await page.locator('.replay-summary').first().innerText(), /review12-result-seed/);
  await page.evaluate(() => { window.__qaClipboard = []; Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.__qaClipboard.push(text); } } }); });
  const stable = await snapshot(); await click('replay-share'); await click('replay-share-copy'); const copied = JSON.parse(await page.evaluate(() => window.__qaClipboard.at(-1)));
  assert.equal(copied.config.seed, s.replay.seed); assert.equal(copied.config.mode, 'short'); assert.equal(copied.character, 'sword'); assert.deepEqual(await snapshot(), stable);
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('QA denied clipboard'); } } }));
  await click('replay-share-copy'); assert.deepEqual(JSON.parse(await page.locator('#replay-share-code').inputValue()), copied); await screenshot('share-fallback'); await closeModal();
  await click('collection'); await click('collection-tab', '[data-tab="records"]'); assert.equal(await page.locator('.replay-records > li').count(), 1); await closeModal();
  await page.reload({ waitUntil: 'load' }); await page.waitForFunction(() => window.game); assert.equal((await profile()).records.filter(r => r.id === record.id).length, 1); assert.equal(await page.locator('[data-action="resume"]').count(), 0);
  return { record, sharedFields: Object.keys(copied), clipboardAPI: 'stubbed success and denial; actual UI action', fallbackTextIdentical: true, settlementNotDuplicated: true };
});
scenario('shared-config-import', 'Pasted configuration changes preparation while preserving the active checkpoint and explains unavailable echoes', 'Real share-import controls with a valid unowned-echo configuration', async () => {
  await load(); await importEarnedFixture(); await startDOM('sword', { mode: 'short', seed: 'review12-original-active', oath: null }); await firstBattleDOM();
  const original = (await storage())['baiyao-night-run-v2'];
  await click('restart'); await click('replay-prepare'); await click('replay-share');
  const supplied = { version: 2, game: '百妖夜契', character: 'sword', starter: 'sword', config: { mode: 'long', seed: 'review12-imported-plan', challenge: 3, oath: 'sword_edge', echo: { kind: 'weapon', id: 'divine' }, cosmetic: null, finale: 'abyss' } };
  await page.locator('#replay-share-import').fill(JSON.stringify(supplied)); await click('replay-share-import');
  assert.equal(await page.locator('#replay-seed').inputValue(), supplied.config.seed); assert.equal(await page.locator('[data-action="replay-mode"][data-mode="long"]').getAttribute('aria-pressed'), 'true'); assert.equal(await page.locator('[data-action="replay-challenge"][data-level="3"]').getAttribute('aria-pressed'), 'true'); assert.equal(await page.locator('[data-action="replay-oath"][data-oath="sword_edge"]').getAttribute('aria-pressed'), 'true');
  assert.equal(await page.locator('[data-action="replay-echo"][data-id=""]').getAttribute('aria-pressed'), 'true');
  const message = await page.locator('.replay-preparation .replay-import-feedback').innerText(); assert.match(message, /未携带.*照夜/);
  assert.equal((await storage())['baiyao-night-run-v2'], original, 'Importing a future plan must preserve active-run bytes');
  await click('replay-share'); await page.locator('#replay-share-import').fill('{bad-json'); await click('replay-share-import'); assert.match(await page.locator('#modal-root .replay-import-feedback').innerText(), /不是有效/); await closeModal();
  assert.equal(await page.locator('#replay-seed').inputValue(), supplied.config.seed); assert.equal((await storage())['baiyao-night-run-v2'], original);
  await screenshot('shared-config-preserves-resume'); await click('start'); assert.equal(await page.locator('[data-action="replay-abandon-confirm"]').isVisible(), true); await closeModal(); assert.equal((await storage())['baiyao-night-run-v2'], original);
  return { imported: supplied.config, unavailableEchoCleared: true, message, activeCheckpointByteIdentical: true, malformedPasteRejected: true };
});
scenario('equipment-visuals', 'Full, reduced and off equipment visuals preserve identical combat rules', 'Legal level/owned-weapon fixture; actual equip, mode and attack clicks', async () => {
  const results = [];
  for (const mode of ['full', 'reduced', 'off']) {
    await load(); await startDOM('sword', { mode: 'short', seed: 'review12-gear-identical', oath: null });
    await page.evaluate(() => { game.state.player.level = 2; game.state.player.weaponInventory.push('rime'); renderGame(); });
    await click('equipment'); const card = page.locator('.weapon-card[data-weapon="rime"]');
    assert.equal(await card.getAttribute('data-gear-theme'), 'frost'); assert.ok(await card.locator('.gear-card-insignia').count());
    await click('equip-weapon', '[data-id="rime"]'); await closeModal(); await motion(mode); await firstBattleDOM();
    assert.ok(await page.locator('.hero-portrait .gear-portrait-insignia').count());
    const before = await snapshot();
    await page.evaluate(() => { window.__qaGear = []; window.__qaGearObserver?.disconnect(); window.__qaGearObserver = new MutationObserver(records => { for (const record of records) for (const node of record.addedNodes) if (node.nodeType === 1 && node.matches?.('.gear-proc')) { const style = getComputedStyle(node); window.__qaGear.push({ ...node.dataset, animations: node.getAnimations().length, width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height, opacity: Number(style.opacity), visibility: style.visibility }); } }); window.__qaGearObserver.observe(document.querySelector('.battle-stage'), { childList: true, subtree: true }); });
    const chosen = await page.evaluate(() => game.state.battle.hand.find(card => NightPact.CARDS[card.id].attack && NightPact.CARDS[card.id].cost <= game.state.battle.energy)); assert.ok(chosen);
    await playCardDOM(chosen);
    const events = await page.evaluate(() => { window.__qaGearObserver.disconnect(); return window.__qaGear; });
    const rime = events.filter(event => event.gearProc === 'rime'); assert.ok(rime.length, mode + ': actual engine proc must reach equipment visual');
    assert.ok(rime.every(event => event.width > 0 && event.height > 0 && event.opacity > 0 && event.visibility === 'visible'), mode + ': proc must have visible geometry');
    assert.ok(rime.every(event => event.motion === (mode === 'full' ? 'full' : 'still'))); assert.ok(rime.every(event => mode === 'full' ? event.animations > 0 : event.animations === 0));
    const after = await snapshot(); assert.ok(after.state.battle.enemy.hp < before.state.battle.enemy.hp); await screenshot('equipment-' + mode);
    results.push({ mode, events, after, beforeHash: sha(JSON.stringify(before)), afterHash: sha(JSON.stringify(after)) });
  }
  assert.deepEqual(results[1].after, results[0].after); assert.deepEqual(results[2].after, results[0].after);
  return { identicalRuleState: true, modes: results.map(({ after, ...rest }) => rest) };
});
scenario('responsive', 'Replay setup, vault, battle and results fit 320, 390 and 1440 widths', 'Viewport emulation; fixture only for final-boss shortcut', async () => {
  const layouts = [];
  for (const width of [320, 390, 1440]) {
    await load({ width }); await importEarnedFixture(); await prepareDOM('sword', { mode: 'short', seed: 'review12-layout-' + width, oath: null });
    layouts.push({ width, screen: 'preparation', ...(await assertLayout('preparation ' + width, ['#app', '.replay-preparation', '#replay-seed', '.replay-choice', '.replay-preparation [data-action="start"]'])) }); await screenshot('layout-' + width + '-preparation');
    await click('collection'); for (const tab of ['weapons', 'relics', 'cosmetics', 'records']) { await click('collection-tab', `[data-tab="${tab}"]`); layouts.push({ width, screen: 'collection-' + tab, ...(await assertLayout('collection ' + width, ['[role="dialog"]', tab === 'records' ? '.replay-empty' : '.replay-collection-card', '.replay-tabs button'])) }); }
    await screenshot('layout-' + width + '-collection'); await closeModal(); await startPrepared(); await motion('off'); await firstBattleDOM();
    await page.waitForFunction(() => { const sprites = [...document.querySelectorAll('.battle-stage [data-sprite-group]')]; return sprites.length >= 2 && sprites.every(element => element.dataset.spriteReady === 'true'); });
    assert.equal(await page.locator('.battle-stage [data-combatant="enemy"] [data-sprite-group]').count(), 1);
    layouts.push({ width, screen: 'battle', ...(await assertLayout('battle ' + width, ['.battle-stage', '.battle-stage [data-sprite-group]', '.enemy-target', '[data-action="end-turn"]'])) }); await screenshot('layout-' + width + '-battle');
    await page.evaluate(() => { game.state.screen = 'map'; renderGame(); }); await enterBattleFixture({ final: true }); await quickWinDOM();
    layouts.push({ width, screen: 'result', ...(await assertLayout('result ' + width, ['#app', '.ending', '.replay-summary', '.ending [data-action="replay-share"]'])) }); await screenshot('layout-' + width + '-result');
    await click('replay-prepare'); assert.equal(await page.locator('#replay-seed').isVisible(), true);
  }
  return { layouts, viewports: [320, 390, 1440], physicalDevices: false };
});

async function main() {
  if (process.argv.includes('--list')) {
    console.log(JSON.stringify(cases.map(({ id, name, method }) => ({ id, name, method, status: 'planned' })), null, 2));
    return;
  }
  fs.mkdirSync(out, { recursive: true });
  report.baseCommit = cp.execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  report.runnerSHA256 = sha(fs.readFileSync(__filename));
  report.buildSHA256 = sha(fs.readFileSync(entry));
  const sources = fs.readdirSync(path.join(root, 'dev')).filter(name => /^(engine|ui|profile|replay[^/]*|sprite-frames|sprite-motion)\.js$/.test(name));
  report.sourceHashes = Object.fromEntries(sources.map(name => [`dev/${name}`, sha(fs.readFileSync(path.join(root, 'dev', name)))]));
  server = http.createServer((request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      const file = pathname === '/' ? entry : path.resolve(root, '.' + pathname);
      if (file !== entry && !file.startsWith(root + path.sep)) { response.writeHead(403); response.end(); return; }
      response.end(fs.readFileSync(file));
    } catch { response.writeHead(404); response.end(); }
  }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.listening ? resolve() : server.once('listening', resolve));
  origin = 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  try {
    for (const test of cases) {
      if (report.filter && !report.filter.split('|').some(text => test.id.includes(text))) { report.results.push({ id: test.id, name: test.name, status: 'not-run', reason: 'Filtered out' }); continue; }
      const started = Date.now();
      try {
        const evidence = await test.run();
        report.results.push({ id: test.id, name: test.name, method: test.method, status: 'pass', durationMs: Date.now() - started, evidence });
        console.log('PASS ' + test.id);
      } catch (error) {
        const status = error instanceof PendingCase ? 'pending' : 'fail';
        report.results.push({ id: test.id, name: test.name, method: test.method, status, durationMs: Date.now() - started, error: error.stack });
        console.error(status.toUpperCase() + ' ' + test.id + ': ' + error.message);
        if (page && status === 'fail') await screenshot('failure-' + test.id).catch(() => {});
      } finally { writeReport(); }
    }
    report.sourceHashesUnchanged = Object.entries(report.sourceHashes).every(([file, hash]) => sha(fs.readFileSync(path.join(root, file))) === hash);
    report.buildUnchanged = sha(fs.readFileSync(entry)) === report.buildSHA256;
    report.complete = report.results.length === cases.length && report.results.every(result => result.status === 'pass');
    report.success = report.complete && report.sourceHashesUnchanged && report.buildUnchanged && !report.pageErrors.length && !report.externalRequests.length && !report.failedRequests.length;
    if (!report.success) process.exitCode = report.results.some(result => result.status === 'fail') || report.pageErrors.length ? 1 : 2;
  } finally {
    report.finishedAt = new Date().toISOString();
    writeReport();
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
  console.log(JSON.stringify({ report: path.join(out, 'qa-browser.json'), success: report.success, results: report.results.map(({ id, status }) => ({ id, status })) }));
}
if (require.main === module) main().catch(error => { report.fatal = error.stack; writeReport(); console.error(error); process.exitCode = 1; server?.close(); });
