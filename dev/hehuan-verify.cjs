'use strict';
/* Release gate for the 晏绮罗 character addition. This checks the current
 * source/artifact receipts without replacing the broader v11 regression. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const readJson = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));

const manifest = readJson('dev/hehuan-art-manifest.json');
for (const entry of manifest.entries) {
  assert.ok(fs.existsSync(path.join(root, entry.file)), `missing art: ${entry.file}`);
  assert.equal(sha(entry.file), entry.sha256, `stale art hash: ${entry.file}`);
}
assert.equal(manifest.entries.length, 44, 'expected 44 hehuan runtime art assets');
const expandedArt=readJson('dev/cards36-art-manifest.json');
for(const entry of expandedArt.entries)assert.equal(sha(entry.file),entry.sha256,`stale expanded art: ${entry.file}`);
const homeArt=readJson('dev/home-art-manifest.json');
for(const entry of [homeArt.runtime,homeArt.original])assert.equal(sha(entry.file),entry.sha256,`stale home artwork: ${entry.file}`);

const browser = readJson('dev/hehuan-browser-results.json');
assert.equal(browser.failed, 0, 'browser checks failed');
assert.equal(browser.passed, 12, 'browser receipt must cover all twelve checks');
for (const [file, hash] of Object.entries(browser.inputs)) assert.equal(sha(file), hash, `stale browser input: ${file}`);

const regression = readJson('dev/v11-regression-results.json');
assert.equal(regression.engine.failed, 0, 'v11 engine regression failed');
assert.ok(regression.engine.passed>=527, 'expanded suite must retain prior checks');
assert.equal(regression.data_contract.cards, 132);
assert.equal(regression.data_contract.events, 161);
assert.equal(regression.data_contract.regions, 7);

for (const file of ['index.html', 'baiyao-standalone.html']) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  assert.ok(html.includes('H01'), `${file} is missing hehuan cards`);
  assert.ok(html.includes('晏绮罗'), `${file} is missing hehuan character`);
  assert.ok(html.includes('照心镜'), `${file} is missing heartmirror`);
}

const result = {
  version: 'hehuan-v1',
  passed: true,
  browserChecks: browser.passed,
  regression: regression.engine,
  art: { count: manifest.entries.length, manifest: 'dev/hehuan-art-manifest.json' },
  homeArt: homeArt.runtime,
  artifacts: Object.fromEntries(['index.html', 'baiyao-standalone.html'].map(file => [file, { bytes: fs.statSync(path.join(root, file)).size, sha256: sha(file) }]))
};
fs.writeFileSync(path.join(root, 'dev/hehuan-verification-results.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
