'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const R=require('./replay-rules.js');
test('each profession gets two bounded, distinct vows with a visible cost and an existing-card swap',()=>{
 const game=require('./engine.js');
 assert.equal(Object.keys(R.OATHS).length,10);
 for(const role of R.ROLES){const list=R.oathsFor(role);assert.equal(list.length,2);assert.notDeepEqual(list[0].effects,list[1].effects);for(const oath of list){assert.ok(oath.benefit&&oath.cost&&oath.text.includes('代价'));assert.ok(Object.keys(oath.effects).some(k=>['initialMaxHpPenalty','startEnergyPenalty','firstAttackSelfLoss'].includes(k)));for(const [key,n]of Object.entries(oath.effects)){assert.ok(R.EFFECTS[key],key);assert.ok(Number.isInteger(n)&&n>0&&n<=8);}
   for(const swap of oath.starterSwap){assert.equal(swap.count,1);assert.equal(game.CARDS[swap.from].character,role);assert.equal(game.CARDS[swap.to].character,role);assert.ok(!game.CARDS[swap.to].locked);}
  }}
 assert.equal(R.oath('assassin_hunter','sword'),null);assert.deepEqual(R.oathsFor('unknown'),[]);
});
test('starter changes preserve ten cards and instance identity without editing the caller',()=>{
 const cards=[{id:'C01',uid:'a'},{id:'C01',uid:'b'},...Array.from({length:8},(_,i)=>({id:'C02',uid:'x'+i}))],before=JSON.stringify(cards);
 const changed=R.applyStarterSwap(cards,'assassin_hunter','assassin');assert.equal(changed.length,10);assert.equal(changed[0].id,'C08');assert.equal(changed[0].uid,'a');assert.equal(changed[1].id,'C01');assert.equal(JSON.stringify(cards),before);assert.notEqual(changed[1],cards[1]);
 assert.deepEqual(R.applyStarterSwap(['S01','S02'],'assassin_hunter','sword'),['S01','S02']);assert.deepEqual(R.applyStarterSwap(['C01','C01'],'assassin_chain','assassin'),['C06','C01']);
});
test('challenge tiers keep earlier rules and add turn-sequencing pressure',()=>{
 assert.deepEqual(R.CHALLENGES.map(x=>x.level),[0,1,2,3]);assert.deepEqual(R.challengeRules(0),{});
 assert.equal(R.challengeRules(1).unusedEnergyEnemyBlock,2);assert.equal(R.challengeRules(1).unusedEnergyEnemyBlockCap,6);assert.equal(R.challengeRules(2).thirdCardEnemyBlock,4);assert.equal(R.challengeRules(3).turnStartEnemyBlock,3);
 for(let i=1;i<4;i++)for(const [key,value]of Object.entries(R.challengeRules(i-1)))assert.equal(R.challengeRules(i)[key],value);
 for(const bad of [-1,4,1.5,'bogus',NaN])assert.equal(R.challenge(bad).level,0);
});
test('all current weapons have distinct readable identities and explicit baseline overrides',()=>{
 const game=require('./engine.js');assert.deepEqual(Object.keys(R.WEAPON_SIGNATURES).sort(),Object.keys(game.WEAPONS).sort());
 const motifs=[];for(const [id,s]of Object.entries(R.WEAPON_SIGNATURES)){assert.equal(s.id,id);assert.equal(s.name,game.WEAPONS[id].name);assert.ok(game.WEAPONS[id].characters.includes(s.role));assert.ok(/^#[\da-f]{6}$/i.test(s.color));assert.ok(s.icon&&s.label&&s.procText);assert.ok(R.TIERS[s.tier]);assert.ok(s.bonus>=0&&s.bonus<=3);for(const key of ['bonus','block','openingDraw','openingDrive','openingSoul'])assert.equal(typeof s[key],'number');assert.equal(s.openingBlock,s.block);for(const key of Object.keys(s.effects))assert.ok(R.EFFECTS[key],key);assert.equal(s.echoEligible,s.tier!=='common');motifs.push(s.motif);}
 assert.equal(new Set(motifs).size,16);assert.equal(R.weaponSignature('missing'),null);
 // Higher rarity is not a strict replacement for the lower tier's opening or engine.
 assert.ok(R.weaponSignature('bell_reaper').bonus<R.weaponSignature('shadow_fang').bonus);
 assert.ok(R.weaponSignature('rescue_hub').openingDrive<R.weaponSignature('copper_caliper').openingDrive);
 assert.ok(R.weaponSignature('sovereign_sigil').openingSoul<R.weaponSignature('echo_jade').openingSoul);
 assert.equal(R.weaponSignature('divine').effects.firstAttackSelfLoss,1);
});
test('relic identity preserves the live rule text and distinguishes quest prizes from echoes',()=>{
 const game=require('./engine.js');assert.deepEqual(Object.keys(R.RELIC_PRESENTATION).sort(),Object.keys(game.RELICS).sort());for(const [id,base]of Object.entries(game.RELICS)){const view=R.relicPresentation(id,base);assert.equal(R.relicPresentation(id).name,base.name);assert.equal(view.name,base.name);assert.equal(view.text,base.text);assert.ok(view.icon&&view.motif&&view.color);}
 assert.equal(R.relicPresentation('fox').echoEligible,false);assert.equal(R.relicPresentation('ninelives').echoEligible,false);assert.equal(R.relicPresentation('godblood').echoEffects.openingBlock,4);assert.equal(R.getSignature('mirror','relic').tier,'treasure');assert.equal(R.relicPresentation('unknown'),null);
 for(const id of ['frostseal','bell','veil','heartmirror','concentric_spool'])assert.equal(R.relicPresentation(id).echoEligible,false);
});
test('config normalizes options without accepting cross-role vows or unrecognized equipment',()=>{
 const input={mode:'long',seed:'  snow-07  ',challenge:'2',oath:'sword_frost',echo:{kind:'weapon',id:'rime'},cosmetic:'mist',finale:'abyss'},before=JSON.stringify(input);
 assert.deepEqual(R.normalizeConfig(input,'sword'),{mode:'long',seed:'snow-07',challenge:2,oath:'sword_frost',echo:{kind:'weapon',id:'rime'},cosmetic:'mist',finale:'abyss'});assert.equal(JSON.stringify(input),before);
 const blocked=R.normalizeConfig({...input,echo:{kind:'weapon',id:'divine'},cosmetic:'<script>',challenge:99},'assassin');assert.equal(blocked.oath,null);assert.equal(blocked.echo,null);assert.equal(blocked.cosmetic,null);assert.equal(blocked.challenge,0);
 assert.equal(R.normalizeConfig({echo:{kind:'relic',id:'fox'}}).echo,null);assert.equal(R.normalizeConfig().mode,'short');assert.equal(R.normalizeConfig(null).finale,'fate');assert.equal(R.MODES.short.floors,30);assert.equal(R.MODES.long.floors,70);
 for(const id of ['constructor','__proto__','toString']){assert.equal(R.mode(id).id,'short');assert.equal(R.oath(id),null);assert.equal(R.weaponSignature(id),null);assert.equal(R.relicPresentation(id),null);}
});
test('daily seeds are explicit UTC dates and reject impossible calendar dates',()=>{
 assert.equal(R.dailySeed('2026-11-06'),'2026-11-06');assert.equal(R.dailySeed(new Date('2026-11-06T23:59:00Z')),'2026-11-06');assert.equal(R.dailySeed(new Date('2026-11-07T01:00:00+02:00')),'2026-11-06');for(const bad of ['',null,'2026-02-30','2026-13-01','11/06/26'])assert.throws(()=>R.dailySeed(bad));
});
test('browser and CommonJS expose the same data without storage or a DOM',()=>{
 const context={};vm.runInNewContext(fs.readFileSync(__dirname+'/replay-rules.js','utf8'),context);assert.ok(context.NightReplayRules);assert.equal(context.NightReplayRules.oathsFor('mechanist').length,2);assert.equal(context.NightReplayRules.weaponSignature('rescue_hub').motif,'gear');assert.equal(Object.isFrozen(R.OATHS.assassin_hunter.effects),true);assert.throws(()=>{R.OATHS.assassin_hunter.effects.firstAttackMark=99;});assert.equal(R.ECHO_RULES.battles,3);
});
test('personal chapter guidance stays inside the selected journey and preserves long-journey slots',()=>{
 const stories=require('./role-stories.js');
 for(const character of Object.keys(stories.ARCS))for(const mode of ['short','long'])for(let stage=0;stage<=6;stage++){
  const state={character,replay:{enabled:true,mode},journey:{personal:{stage,choices:[],lastOutcome:''}}},before=JSON.stringify(state);
  const expected=mode==='short'?[3,7,12,17,22,27]:[3,15,27,39,51,63],progress=stories.progress(state);
  assert.equal(progress.nextFloor,expected[stage]||null);assert.equal(progress.total,6);assert.equal(JSON.stringify(state),before);
 }
 assert.equal(stories.progress({character:'assassin',journey:{personal:{stage:5}}}).nextFloor,63);
 assert.equal(stories.progress({character:'sword'}),null);
});
