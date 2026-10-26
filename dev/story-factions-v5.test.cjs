'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const F=require('./enemy-factions.js'),V=require('./story-factions-v5.js');
const forbidden=/包裹|牌组|节点|结算|战利|历练|凭证|委托|行动尚未完成|不视为|不代表|不替代|尚缺「|行动行动/;
const presentation=new Set(['story','description','label','text','outcome','riskSummary','factionV5Revision']);
function mechanics(value){
  if(Array.isArray(value))return value.map(mechanics);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([k])=>!presentation.has(k)).map(([k,v])=>[k,mechanics(v)]));
  return value;
}
function fixture(boss,kind='source',mode='approach',stance=null,character='sword'){
  const g=F.GROUPS[boss],nodeId=`f8-test-${boss}-${kind}`;
  const state={character,player:{questItems:[],inventory:{herb:1},gold:80},journey:{factions:{records:{},invalid:{},behaviors:[],forfeited:{}},bossQuests:{records:{}}}};
  state.journey.factions.records[nodeId]={boss,kind,mode,resolved:false,known:[],outcome:null};
  if(stance==='support')state.player.questItems.push(g.support);
  if(stance==='oppose'){state.player.questItems.push(g.oppose);state.journey.factions.forfeited[g.support]=true;state.journey.factions.behaviors.push({npc:g.npc,kind:'oppose'});}
  if(stance==='investigate')state.journey.factions.behaviors.push({npc:g.npc,kind:'investigate'});
  if(stance==='oldEnemy')state.journey.factions.behaviors.push({npc:g.npc,kind:'attacked'});
  if(stance==='after')state.journey.bossQuests.records[boss]={concluded:true};
  return {state,event:F.build(boss,kind,state,nodeId)};
}
function assertRewritten(boss,x){
  const before=structuredClone(x.event),stateBefore=JSON.stringify(x.state),rngTrap={random(){throw Error('presentation must not use RNG');}};
  V.rewrite(x.event,x.state,{ENEMY_FACTIONS:F,...rngTrap});
  assert.equal(x.event.factionV5Revision,V.REVISION,boss);
  assert.deepEqual(mechanics(x.event),mechanics(before),`${boss} presentation must not mutate conditions, rewards, IDs or actions`);
  assert.equal(JSON.stringify(x.state),stateBefore,`${boss} presentation must not mutate run state`);
  for(const p of x.event.story||[])assert.doesNotMatch(p,forbidden,`${boss} story`);
  for(const c of x.event.choices||[]){assert.ok(c.outcome,`${boss} outcome`);assert.notEqual(c.outcome,c.text,`${boss}/${c.factionKey||c.factionAction}`);assert.doesNotMatch(c.outcome,forbidden,`${boss}/${c.factionKey||c.factionAction} outcome`);}
  const once=JSON.stringify(x.event);V.rewrite(x.event,x.state,{ENEMY_FACTIONS:F});assert.equal(JSON.stringify(x.event),once,'re-render is idempotent');
}
test('all 28 faction source/cave IDs have their own scenes and preserve mechanical fields',()=>{
  assert.equal(Object.keys(V.SCENES).length,14);assert.deepEqual(Object.keys(V.SCENES).sort(),Object.keys(F.GROUPS).sort());
  const openings=new Set();
  for(const boss of Object.keys(F.GROUPS)){
    for(const kind of ['source','cave']){const x=fixture(boss,kind);assertRewritten(boss,x);assert.ok(!openings.has(x.event.story[0]),`${boss}/${kind} distinct opening`);openings.add(x.event.story[0]);}
    const x=fixture(boss);assert.equal(x.event.choices.length,4);assert.deepEqual(x.event.choices.map(c=>c.factionKey),['support','oppose','investigate','leave']);
  }
  assert.equal(openings.size,28);
});
test('hostile entry, dialogue, opposition, investigation and aftermath keep truth and do not recycle option text',()=>{
  for(const boss of Object.keys(F.GROUPS)){
    for(const mode of ['approach','inside','hostile'])for(const stance of [null,'support','oppose','investigate','oldEnemy'])assertRewritten(`${boss}/${mode}/${stance}`,fixture(boss,'cave',mode,stance));
    assertRewritten(`${boss}/after-source`,fixture(boss,'source','approach','after'));
    assertRewritten(`${boss}/after-cave`,fixture(boss,'cave','approach','after'));
  }
});
test('source acknowledgement never claims later promised work has already happened',()=>{
  for(const boss of ['snake','camp_boss','gate_boss','bell_boss']){
    const x=fixture(boss);V.rewrite(x.event,x.state,{ENEMY_FACTIONS:F});
    assert.notEqual(x.event.choices[1].outcome,V.SCENES[boss].aid);
    assert.match(x.event.choices[1].text,/履行后才取得/);
    assert.match(x.event.choices[0].text,/8护盾/);assert.match(x.event.choices[0].text,/用过护盾仍会认出/);
  }
  const x=fixture('camp_boss');V.rewrite(x.event,x.state,{ENEMY_FACTIONS:F});assert.doesNotMatch(JSON.stringify(x.event),/行动行动/);
});
test('well and medicine scenes distinguish old-price purchase, contract purchase and paid testimony',()=>{
  const variants={};for(const stance of [null,'oppose','investigate']){const x=fixture('snake','cave','inside',stance);V.rewrite(x.event,x.state,{ENEMY_FACTIONS:F});variants[String(stance)]=x.event.choices[0];}
  assert.equal(variants.null.factionKey,'talk');assert.equal(variants.null.goldCost,12);assert.equal(variants.null.itemGrants,undefined);assert.match(variants.null.outcome,/多出三瓶/);
  assert.equal(variants.oppose.goldCost,12);assert.deepEqual(variants.oppose.itemGrants,[{id:'herb',count:1}]);assert.equal(variants.oppose.questItem,'clean_gauze');assert.match(variants.oppose.outcome,/锤声/);
  assert.equal(variants.investigate.goldCost,8);assert.equal(variants.investigate.questItem,undefined);assert.match(variants.investigate.outcome,/八就八/);
});
test('the palace owner gets a personal encounter without obtaining global emancipation',()=>{
  for(const kind of ['source','cave']){const x=fixture('feiye',kind,kind==='source'?'approach':'inside','oppose','sovereign');assertRewritten('palace-owner/'+kind,x);assert.match(x.event.story.join(''),/您|你落印/);}
  const x=fixture('feiye','source','approach',null,'sovereign');V.rewrite(x.event,x.state,{ENEMY_FACTIONS:F});assert.match(x.event.choices[1].outcome,/那一张名帖/);
});
test('post-boss echoes are specific, narrative only, and aid use is truthfully distinguished',()=>{
  const seen=new Set();for(const boss of Object.keys(F.GROUPS))for(const outcome of ['help','talk','aid','leave','defeated']){
    const state={},before=JSON.stringify(state),a=V.aftermath(boss,outcome,state);assert.ok(a,`${boss}/${outcome}`);assert.doesNotMatch(a,forbidden);assert.equal(JSON.stringify(state),before);assert.ok(!seen.has(a),`${boss}/${outcome} unique echo`);seen.add(a);
  }
  assert.match(V.aftermath('snake','aid',{}, {itemName:'净砂药纱',spent:true}),/使用过/);
  assert.match(V.aftermath('snake','aid',{}, {itemName:'净砂药纱',spent:false}),/原样/);
  assert.equal(V.aftermath('not-a-boss','help',{}),null);
});
