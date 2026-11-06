'use strict';
// Layout and reachable-control checks against the built game, with explicit combat fixtures.
// Run after node dev/build.cjs --strict; these are viewport emulations, not phone tests.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const out = process.env.VISUAL_EVIDENCE || path.join(root, 'docs/review-v11/layout');
const entry = process.env.VISUAL_ENTRY || path.join(root, 'index.html');
fs.mkdirSync(out, { recursive: true });
const report = {
  buildSHA256: createHash('sha256').update(fs.readFileSync(entry)).digest('hex'),
  method: 'Chromium viewport emulation; explicit legal battle/wardrobe fixtures; no physical-device claim.',
  cases: [], machineCommands: [], errors: []
};
const roles = [
  { role: 'assassin', outfit: 'mist' },
  { role: 'sword', outfit: 'mist' },
  { role: 'sword', outfit: 'mist', fallen: true },
  { role: 'hehuan', outfit: 'dusk_silk' },
  { role: 'mechanist', outfit: 'workshop' },
  { role: 'sovereign', outfit: 'moonveil' }
];
const save = () => fs.writeFileSync(path.join(out, 'layout-browser.json'), JSON.stringify(report, null, 2));
function withinViewport(rect, width, label) {
  assert.ok(rect.width > 0 && rect.height > 0, label + ' has a nonempty box');
  assert.ok(rect.left >= -1 && rect.right <= width + 1, label + ' fits viewport: ' + JSON.stringify(rect));
}
(async () => {
  const server = http.createServer((req, res) => {
    try {
      const url = decodeURIComponent(req.url.split('?')[0]);
      res.end(fs.readFileSync(url === '/' ? entry : path.join(root, url)));
    } catch { res.statusCode = 404; res.end(); }
  }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.listening ? resolve() : server.once('listening', resolve));
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage();
    page.on('pageerror', error => report.errors.push(error.message));
    page.on('dialog', dialog => dialog.accept());
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: width < 500 ? 667 : 900 });
      for (const config of roles) {
        await page.goto('http://127.0.0.1:' + server.address().port);
        await page.waitForFunction(() => window.game);
        await page.evaluate(({ role, outfit, fallen }) => {
          game.importProfile({ version: 1, unlocks: ['feiye'] });
          game.newRun(role === 'assassin' ? 'mark' : role);
          game.enterRegion();
          game.state.player.equippedOutfit = outfit;
          if (fallen) game.state.player.path.fallen = true;
          const node = game.getAvailableNodes()[0];
          node.type = 'boss'; node.encounter = { enemyId: 'gate_boss' }; delete node.storyId;
          game.enterNode(node.id);
          game.state.player.hp = game.state.player.maxHp = 1000;
          game.state.battle.enemy.hp = game.state.battle.enemy.maxHp = 10000;
          if (role === 'mechanist') {
            game.state.battle.energy = 50;
            game.squadAction('deploy', 'mingdi');
            game.state.battle.squad.drive = 3;
          }
          renderGame(); setMotionMode('off');
        }, config);
        await page.waitForFunction(() => [...document.querySelectorAll('.battle-stage [data-sprite-group]')].every(e => e.dataset.spriteReady === 'true'));
        const layout = await page.evaluate(() => {
          const box = el => ({ key: el.dataset.spriteKey || el.dataset.fieldMachine || el.dataset.action || el.className, ...el.getBoundingClientRect().toJSON() });
          return {
            viewport: innerWidth,
            scrollWidth: document.documentElement.scrollWidth,
            stage: box(document.querySelector('.battle-stage')),
            actors: [...document.querySelectorAll('.battle-stage [data-sprite-group]')].map(box),
            machines: [...document.querySelectorAll('[data-field-machine]')].map(box),
            controls: [...document.querySelectorAll('[data-action=end-turn], .enemy-target')].map(box)
          };
        });
        assert.ok(layout.scrollWidth <= width, 'no horizontal page scroll: ' + JSON.stringify({ ...config, width, scrollWidth: layout.scrollWidth }));
        for (const rect of [layout.stage, ...layout.actors, ...layout.machines, ...layout.controls]) withinViewport(rect, width, rect.key);
        assert.ok(layout.actors.some(a => a.key === 'gate_boss'), 'enemy sprite was actually checked');
        report.cases.push({ ...config, width, ...layout }); save();
        if (width === 320 || (width === 390 && config.role === 'mechanist')) {
          await page.screenshot({ path: path.join(out, `${width}-${config.role}${config.fallen ? '-fallen' : ''}.png`) });
        }
        // Prove that the reflowed inline machine controls remain usable at the two small widths.
        if (config.role === 'mechanist' && width <= 390) {
          await page.evaluate(() => setMotionMode('full'));
          const before = await page.evaluate(() => game.state.battle.enemy.hp);
          await page.locator('#app [data-machine=mingdi] summary').click();
          const command = page.locator('#app [data-action=squad-action][data-unit=mingdi][data-squad-action=command]');
          await command.scrollIntoViewIfNeeded();
          const rect = await command.boundingBox();
          withinViewport({ ...rect, left: rect.x, right: rect.x + rect.width }, width, 'machine command');
          await command.click();
          await page.waitForFunction(() => !uiBusy);
          const after = await page.evaluate(() => game.state.battle.enemy.hp);
          assert.ok(after < before, 'machine command actually damages enemy');
          report.machineCommands.push({ width, before, after }); save();
        }
        console.log('PASS layout', width, config.role, config.fallen ? 'fallen' : 'normal');
      }
    }
    assert.equal(report.cases.length, 24);
    assert.equal(report.machineCommands.length, 2);
    assert.deepEqual(report.errors, []);
    report.success = true;
  } catch (error) { report.failure = error.stack; throw error; }
  finally { save(); await browser.close(); server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
