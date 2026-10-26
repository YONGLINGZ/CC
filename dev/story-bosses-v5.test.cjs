'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const Q=require('./boss-quests.js');
const N=require('./engine.js');
const V5=require('./story-bosses-v5.js');

function fixture(boss,step,held=[]){
  return {character:'sword',floor:step*2,journey:{regionIndex:0,bossQuests:{records:{[boss]:{region:0,stage:step-1,choices:{},lastOutcome:'',guard:0}}}},player:{questItems:held.slice(),gold:60,hp:35,maxHp:60,deck:[]}};
}
function source(boss,step,state){return Q.build(`boss_${boss}_${step}`,state);}
function presented(boss,step,state){return V5.rewrite(source(boss,step,state),state,N);}
function ruleFields(choice){return Object.fromEntries(Object.entries(choice).filter(([key])=>!['label','text','outcome','riskSummary'].includes(key)));}
function narrative(e){return [...e.story,...e.choices.map(c=>c.outcome),e.connection||''].join('\n');}

test('all fourteen boss histories have three bespoke two-choice scenes and preserve retained authoritative effects',()=>{
  assert.deepEqual(Object.keys(V5.CHAINS).sort(),Object.keys(Q.QUESTS).sort());
  assert.equal(V5.EVENT_IDS.length,42);
  const outcomes=new Set();
  for(const boss of Object.keys(Q.QUESTS))for(const step of [1,2,3]){
    const state=fixture(boss,step);
    const e=source(boss,step,state);
    const before=structuredClone(e);
    assert.equal(e.choices.length,4,'baseline really has the removed template choices');
    V5.rewrite(e,state,N);
    const key=step<3?'witness':'prepare';
    assert.deepEqual(e.choices.map(c=>c.key),[key,'leave']);
    for(const choice of e.choices){
      assert.deepEqual(ruleFields(choice),ruleFields(before.choices.find(c=>c.key===choice.key)),`${boss} ${step} ${choice.key}`);
      assert.notEqual(choice.outcome,choice.text);
      assert.ok(choice.outcome.trim(),'each result has its own scene');
      assert.ok(!outcomes.has(choice.outcome),'no repeated result template');outcomes.add(choice.outcome);
    }
    assert.equal(e.id,before.id);
    assert.deepEqual(e.bossQuest,before.bossQuest);
    assert.equal(e.description,e.story[0]);
    assert.equal(e.bossEditorialRevision,5);
  }
  assert.equal(outcomes.size,84);
});

test('rules, missing-item checklists, old paid bandages and abstract disclaimers stay out of scene prose',()=>{
  const forbidden=/包裹|牌组|节点|结算|战利|历练|凭证|委托|行动尚未完成|不视为|不代表|不替代|尚缺|行动行动|每回合|首回合|护盾\s*\+?\d|又替你包扎/;
  for(const boss of Object.keys(Q.QUESTS))for(const step of [1,2,3])for(const mask of [0,1,2,3]){
    const items=Q.QUESTS[boss].items.filter((_,i)=>mask&(1<<i));
    const e=presented(boss,step,fixture(boss,step,items));
    assert.doesNotMatch(narrative(e),forbidden,`${boss} step ${step} mask ${mask}`);
    assert.doesNotMatch(e.choices.map(c=>c.label).join('\n'),/15|18|打工|收取工钱/);
  }
});

test('all fourteen final approaches have four truthful inventory-dependent scenes; exact aids remain in rule text',()=>{
  for(const boss of Object.keys(Q.QUESTS)){
    const scenes=new Set(),q=Q.QUESTS[boss];
    for(const mask of [0,1,2,3]){
      const held=q.items.filter((_,i)=>mask&(1<<i)),state=fixture(boss,3,held);
      const e=presented(boss,3,state);scenes.add(e.story.join('\n'));
      assert.equal(e.choices[0].bossGuard,10);
      for(const [i,item]of q.items.entries()){
        assert.ok(e.choices[0].riskSummary.includes(`${mask&(1<<i)?'已携带':'未携带'}「${N.QUEST_ITEMS[item].name}」`));
        const expected=V5.CHAINS[boss][2][mask&(1<<i)?'present':'absent'][i];
        assert.ok(e.story.includes(expected));
      }
    }
    assert.equal(scenes.size,4,boss+' distinguishes both items, either one and neither');
  }
});

test('later scenes remember the exact retained previous branch and do not invent a signature for legacy paid fixtures',()=>{
  for(const boss of Object.keys(Q.QUESTS))for(const step of [2,3])for(const key of ['witness','leave','redeem']){
    const state=fixture(boss,step),record=state.journey.bossQuests.records[boss];
    record.choices[step-1]={key,floor:step-1};record.lastOutcome='旧版实际记录：付灵石买物，未署名。';
    const e=presented(boss,step,state);
    assert.equal(e.connection,key==='redeem'?record.lastOutcome:V5.CHAINS[boss][step-2][key==='witness'?'yes':'no']);
  }
});

test('rewriting is idempotent, reads without mutating authority and never consumes a random roll',()=>{
  const savedRandom=Math.random;
  Math.random=()=>{throw Error('Presentation must not draw RNG');};
  try{
    for(const boss of Object.keys(Q.QUESTS))for(const step of [1,2,3]){
      const state=fixture(boss,step,Q.QUESTS[boss].items),before=structuredClone(state);
      const e=presented(boss,step,state),snapshot=structuredClone(e);
      assert.equal(V5.rewrite(e,state,N),e);assert.deepEqual(e,snapshot);assert.deepEqual(state,before);
    }
  }finally{Math.random=savedRandom;}
  const unrelated={id:'well',story:['井边有水。'],choices:[{key:'leave',outcome:'走了。'}]},copy=structuredClone(unrelated);
  assert.equal(V5.rewrite(unrelated,{},N),unrelated);assert.deepEqual(unrelated,copy);
});

test('puppet awakening keeps its four one-shot aftermath effects and cannot be created by presentation alone',()=>{
  const state=fixture('lotus_boss',3,Q.QUESTS.lotus_boss.items),raw=Q.awakening(state),before=structuredClone(raw);
  const e=V5.rewrite(raw,state,N);
  assert.equal(e.bossAwakening,true);assert.equal(e.choices.length,4);
  for(const c of e.choices)assert.deepEqual(ruleFields(c),ruleFields(before.choices.find(x=>x.key===c.key)));
  assert.doesNotMatch(narrative(e),/结算|战利|历练|茶确实凉了|复仇不再是|由你自己决定/);
  for(const mask of [0,1,2,3]){
    const approaching=presented('lotus_boss',3,fixture('lotus_boss',3,Q.QUESTS.lotus_boss.items.filter((_,i)=>mask&(1<<i))));
    assert.equal(approaching.bossAwakening,undefined,'only the engine may create an awakening');
    assert.ok(!approaching.choices.some(c=>c.itemGrants||c.heal||c.goldGain),'preparation never pays awakening rewards');
    assert.match(approaching.choices[0].riskSummary,/同时持有.*亲历前两段/);
  }
});
