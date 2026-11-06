'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const RP=require('./replay-profile.js'),G=require('./engine.js');
const profile=()=>RP.normalize({version:1,unlocks:['feiye']},G);
const config=(echo=null)=>({mode:'short',seed:'test-seed',challenge:0,oath:null,echo,finale:'fate'});
test('v1 migrates without invented treasure or power; normalized data is detached',()=>{
  const old={version:1,unlocks:['feiye']},p=RP.normalize(old,G);
  assert.equal(p.version,2);assert.deepEqual(p.unlocks,['feiye']);assert.deepEqual(p.collections,{weapons:[],relics:[],cosmetics:[]});
  assert.equal(RP.valid(p,G),true);p.unlocks.length=0;assert.deepEqual(old.unlocks,['feiye']);
});
test('echo ownership, role compatibility and quest provenance are required',()=>{
  const p=profile();p.collections.weapons=['rime','training'];p.collections.relics=['jade','fox','ninelives','bell'];
  assert.equal(RP.echoStatus(p,{kind:'weapon',id:'rime'},'sword',G).available,true);
  for(const [role,kind,id] of [['assassin','weapon','rime'],['sword','weapon','divine'],['sword','weapon','training'],['assassin','relic','fox'],['assassin','relic','ninelives'],['assassin','relic','bell']])assert.equal(RP.echoStatus(p,{kind,id},role,G).available,false);
});
test('preparation consumes nothing; first battle consumes once; same run cannot temper its echo',()=>{
  const p=profile();p.collections.relics=['jade'];
  const r=RP.begin(p,config({kind:'relic',id:'jade'}),G,'assassin');
  assert.deepEqual(p.cooldowns,{});assert.equal(r.echo.remaining,3);
  assert.equal(RP.commitEcho(p,r),true);assert.equal(RP.commitEcho(p,r),false);
  assert.equal(RP.milestone(p,r),false);assert.equal(p.cooldowns['relic:jade'],r.id);
  assert.equal(RP.echoStatus(p,{kind:'relic',id:'jade'},'assassin',G).available,false);
});
test('abandon/new-run spam never tempers; another run first-realm milestone does exactly once',()=>{
  const p=profile();p.collections.relics=['jade','moon'];
  const one=RP.begin(p,config({kind:'relic',id:'jade'}),G,'assassin');RP.commitEcho(p,one);
  for(let i=0;i<8;i++)RP.begin(p,config(),G,'assassin');
  assert.ok(p.cooldowns['relic:jade']);
  const next=RP.begin(p,config({kind:'relic',id:'moon'}),G,'assassin');RP.commitEcho(p,next);
  assert.equal(RP.milestone(p,next),true);assert.equal(p.cooldowns['relic:jade'],undefined);assert.equal(p.cooldowns['relic:moon'],next.id);
  assert.equal(RP.milestone(p,next),false);
});
test('discoveries survive losses while temporary echoes never become acquisitions',()=>{
  const p=profile();p.collections.relics=['jade'];const r=RP.begin(p,config({kind:'relic',id:'jade'}),G,'assassin');
  const s={replay:r,player:{weaponInventory:['shadow_fang'],relics:['jade','moon'],outfitInventory:['moon']},event:{id:'personal_assassin_1',resolved:true}};
  assert.equal(RP.observe(p,s,G),true);assert.deepEqual(r.newCollections,[{kind:'weapon',id:'shadow_fang'},{kind:'relic',id:'moon'},{kind:'cosmetic',id:'moon'}]);
  assert.equal(RP.observe(p,s,G),false);assert.deepEqual(p.readStories,['personal_assassin_1']);
});
test('terminal records are idempotent and bounded; losses grant no mastery power',()=>{
  const p=profile();
  for(let i=0;i<65;i++){
    const s={replay:RP.begin(p,config(),G,'assassin'),screen:'defeat',result:{won:false},character:'assassin',starter:'mark',floor:5,stats:{battles:2,cardsPlayed:16,maxHit:12}};
    assert.equal(RP.finish(p,s),true);assert.equal(RP.finish(p,s),false);
  }
  assert.equal(p.records.length,60);assert.deepEqual(p.mastery,{});assert.equal(RP.valid(p,G),true);
});
test('RNG cursor reproduces continuation exactly, independent of wall time',()=>{
  const a=RP.prng('共用种子'),b=RP.prng('共用种子');assert.deepEqual(Array.from({length:100},a),Array.from({length:100},b));
  const cursor=a.state(),expected=Array.from({length:100},a);const restored=RP.prng('different');assert.equal(restored.restore(cursor),true);
  assert.deepEqual(Array.from({length:100},restored),expected);assert.equal(restored.restore(-1),false);assert.equal(restored.restore(NaN),false);
});
test('profile and snapshot reject corrupt, unknown and unsafe payloads',()=>{
  const p=profile();p.collections.weapons.push('missing');assert.equal(RP.valid(p,G),false);
  assert.equal(RP.safeTree(JSON.parse('{"__proto__":{"polluted":true}}')),false);
  assert.equal(RP.safeTree({n:Infinity}),false);assert.equal(RP.validateRun({version:2,engine:'review12',state:{}},G),false);
});
