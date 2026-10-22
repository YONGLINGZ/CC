/* Rebuild hash-bound evidence from real rule tests and public-action simulations. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),hash=name=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,name))).digest('hex');
const tests=['dev/engine.test.cjs','dev/rework.test.cjs','dev/reward.test.cjs','dev/v5-engine.test.cjs','dev/v6-engine.test.cjs','dev/v7-engine.test.cjs','dev/v8-engine.test.cjs','dev/v9-engine.test.cjs','dev/v10-combat.test.cjs','dev/v10-expedition.test.cjs','dev/v10-integration.test.cjs'];
const command=[process.execPath,'--test','--test-reporter=tap',...tests];
let output;
try { output=cp.execFileSync(command[0],command.slice(1),{cwd:root,encoding:'utf8',maxBuffer:12*1024*1024}); }
catch(error){fs.writeFileSync('/workspace/scratch/v10-engine-tap.log',error.stdout||'');console.error('Engine suite failed; complete TAP saved to /workspace/scratch/v10-engine-tap.log');process.exit(1);}

const count=key=>Number(output.match(new RegExp('^# '+key+' (\\d+)\\s*$','m'))?.[1]??NaN);
const engine={passed:count('pass'),failed:count('fail'),total:count('tests'),skipped:count('skipped'),legacy_checks:170};engine.new_checks=engine.total-170;
assert.equal(engine.passed,engine.total);assert.equal(engine.failed,0);assert.equal(engine.skipped,0);assert.ok(engine.new_checks>0);
const names=[...output.matchAll(/^ok \d+ - (.+)$/gm)].map(m=>m[1]);
fs.writeFileSync(path.join(__dirname,'v10-engine-results.json'),JSON.stringify({method:'Actual Node test execution; bounded arranged rule fixtures are explicitly labelled in test sources.',command:'node '+command.slice(1).join(' '),...engine,checks:names,inputs:Object.fromEntries(['dev/expedition.js','dev/engine.js','dev/expansion.js',...tests].map(n=>[n,hash(n)]))},null,2)+'\n');
cp.execFileSync(process.execPath,['dev/playtest.cjs'],{cwd:root,env:{...process.env,PLAYTEST_REPORT:'dev/v10-playtest-report.json'},encoding:'utf8',maxBuffer:12*1024*1024});
cp.execFileSync(process.execPath,['dev/v7-hidden-playtest.cjs'],{cwd:root,env:{...process.env,HIDDEN_PLAYTEST_REPORT:'dev/v10-hidden-playtest-report.json'},encoding:'utf8',maxBuffer:12*1024*1024});
const read=n=>JSON.parse(fs.readFileSync(path.join(root,n),'utf8')),p=read('dev/v10-playtest-report.json'),h=read('dev/v10-hidden-playtest-report.json'),N=require('./engine.js');
assert.equal(p.completed,150);assert.equal(h.completed,24);
const summarizePolicy=policy=>{const rows=p.details.filter(r=>r.starter==='sword'&&r.demonicPath===policy);return{policy,completed:rows.length,wins:rows.filter(r=>r.result==='victory').length,defeats:rows.filter(r=>r.result==='defeat').length,poisoned:rows.filter(r=>r.affliction.ticks>0).length,demonicUses:rows.reduce((n,r)=>n+r.demonicUses,0),fallen:rows.filter(r=>r.corruption.fallen).length};};
const evidence=['dev/expedition.js','dev/engine.js','dev/expansion.js',...tests,'dev/playtest.cjs','dev/v7-hidden-playtest.cjs','dev/v10-regression.cjs','dev/v10-engine-results.json','dev/v10-playtest-report.json','dev/v10-hidden-playtest-report.json'];
const report={version:'v10 pentagon exploration, inventory and status combat',engine,data_contract:{cards:Object.keys(N.CARDS).length,enemies:Object.keys(N.ENEMIES).length,events:N.EVENT_IDS.length,relics:Object.keys(N.RELICS).length},public_api:{method:p.method,completed:p.completed,wins:p.wins,defeats:p.defeats,all_victories_completed_30_nodes:p.details.filter(r=>r.result==='victory').every(r=>r.completedNodes===30),sword_policies:['refuse','learn'].map(summarizePolicy),report:'dev/v10-playtest-report.json'},hidden_api:{method:h.method,completed:h.completed,wins:h.wins,defeats:h.defeats,unlocks:h.unlocks,hidden_challenges:h.hidden_challenges,hidden_wins:h.hidden_wins,report:'dev/v10-hidden-playtest-report.json'},inputs:Object.fromEntries(evidence.map(n=>[n,hash(n)])),commands:['node dev/v10-regression.cjs'],note:'Actual rule tests and seeded public-action heuristic runs. New frost, bleed, enemy skills and usable consumables are exercised through actual game calls; narrative progression remains hidden in the UI. Sovereign public simulations explicitly begin with a pre-unlocked profile; hidden-route attempts begin with an empty profile. Not human balance or time-to-complete validation.'};
fs.writeFileSync(path.join(__dirname,'v10-regression-results.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({engine,public_api:{completed:p.completed,wins:p.wins,defeats:p.defeats},hidden_api:{completed:h.completed,wins:h.wins,defeats:h.defeats,unlocks:h.unlocks}},null,2));
