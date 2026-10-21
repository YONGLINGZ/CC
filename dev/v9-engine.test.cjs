/* V9 keeps story decisions and path rules internal while showing current effects. */
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const N=require('./engine.js');
const X=require('./expansion.js');
const random=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
let serial=0;
function run(starter='sword') {
  const g=N.createGame({environment:false,rng:random(10)});
  assert.equal(g.newRun(starter),true);return g;
}
function enter(g,floor=8,type='fight',storyId) {
  const s=g.state,n=s.map[floor-1][0];
  s.floor=floor;s.journey.regionIndex=Math.floor((floor-1)/10);s.screen='map';
  s.availableNodes=[n.id];s.history=s.history.filter(h=>h.floor!==floor);
  n.revealed=true;n.type=type;if(storyId)n.storyId=storyId;
  assert.equal(g.enterNode(n.id),true);return type==='event'?s.event:s.battle;
}
function battle(g) {
  const b=enter(g);b.enemy.hp=b.enemy.maxHp=1000;b.energy=99;return b;
}
function play(g,id) {
  const c={id,uid:'v9-'+(++serial)};g.state.battle.hand.push(c);
  assert.equal(g.playCard(c.uid,true),true);
}
function eventText(e) {
  return [e.name,e.description,e.kicker,e.whisper,e.connection,e.risk,...e.story,
    ...e.choices.flatMap(c=>[c.label,c.text,c.outcome])].filter(Boolean).join('\n');
}
const hiddenRules=/魔念|减半|不可逆|第六|六次|六分|\b50\s*%|会记住|可能引来后患|可能面对追猎|追踪风险|按原有规则|使用时才结算|选择.{0,4}(?:记录|记下)|故人行迹\s*·\s*\d\s*\/\s*3/;

test('demonic cards retain complete immediate effects without path instructions',()=>{
  const expected={
    D01:[1,'造成 4 点伤害，恢复 6 生命。击杀或伤害被护盾阻挡仍治疗。'],
    D02:[1,'造成 8 点伤害，恢复 3 生命。击杀或被护盾阻挡仍治疗。'],
    D03:[2,'造成 16 点伤害，恢复 5 生命。击杀或被护盾阻挡仍治疗。'],
    D04:[1,'获得 12 护盾，抽 1 张牌。'],D05:[0,'抽 2 张牌。消耗。'],
    D06:[3,'造成 26 点伤害，恢复 6 生命。击杀或被护盾阻挡仍治疗。']
  };
  const g=run();
  for(const[id,[cost,text]]of Object.entries(expected)){
    assert.equal(N.CARDS[id].cost,cost);assert.equal(N.CARDS[id].text,text);
    assert.equal(g.getEffectiveCard(id).text,text);assert.equal(N.CARDS[id].corruption,1);
    assert.equal(N.CARDS[id].storyOnly,true);assert.doesNotMatch(text,hiddenRules);
  }
  assert.equal(N.CARDS.D05.exhaust,true);
  assert.deepEqual(X.CORRUPTION,{threshold:6,perDemonicCard:1,fallenAttackScale:.5,fallenBlockScale:.5,preventingItem:'clearheart_jade',irreversible:true});
  assert.equal(X.ITEMS.clearheart_jade.preventsCorruption,true);
  assert.doesNotMatch(X.ITEMS.clearheart_jade.text,hiddenRules);
});

test('sixth use still changes the portrait state and preserves counters without narrating them',()=>{
  const g=run(),p=g.state.player;p.path.learned=true;const b=battle(g);p.hp=10;
  for(let used=1;used<=6;used++){
    play(g,'D01');const status=g.getCorruptionStatus();
    assert.equal(p.path.uses,used);assert.equal(p.path.corruption,used);
    assert.equal(p.path.fallen,used===6);assert.equal(status.stage,used===6?'fallen':'tempted');
    assert.equal(status.threshold,6);assert.equal(status.corruption,used);
    assert.doesNotMatch(status.label+' '+status.text,hiddenRules);
    assert.doesNotMatch(status.label+' '+status.text,/\d/);
  }
  assert.equal(g.state.character,'sword');assert.equal(p.character,'sword');
  assert.equal(N.CHARACTERS.sword.name,'沈霜白');assert.equal(g.state.stats.demonicUses,6);
  assert.equal(b.events.filter(e=>e.type==='fallen').length,1);
  assert.equal(g.getCorruptionStatus().text,'因气息逆转，部分旧有功法难以运转，魔道招式仍顺手。');
  const narrative=[g.state.notice,...g.state.journey.journal.map(j=>j.text),...b.logs].join('\n');
  assert.doesNotMatch(narrative,hiddenRules);
  assert.doesNotMatch(narrative,/魔念\s*[+＋#]|\d\s*\/\s*6/);
});

test('jade still stops the hidden boundary and cannot reverse an existing fall',()=>{
  for(const fallen of[false,true]){
    const g=run(),p=g.state.player;
    Object.assign(p.path,{learned:true,corruption:fallen?6:5,uses:fallen?6:5,fallen});
    enter(g,22,'event','mirror_trial');assert.equal(g.chooseEvent(0),true);
    assert.ok(p.questItems.includes('clearheart_jade'));assert.equal(p.path.protected,true);
    const b=battle(g);play(g,'D01');
    assert.equal(p.path.corruption,fallen?6:5);assert.equal(p.path.fallen,fallen);
    assert.equal(p.path.uses,fallen?7:6);assert.equal(g.getCorruptionStatus().protected,true);
    assert.equal(g.getEffectiveCard('S01').damage,fallen?3:6);assert.equal(b.enemy.hp,996);
    assert.doesNotMatch(g.getCorruptionStatus().text,hiddenRules);
  }
});

test('effective sword cards show actual current values without explaining the hidden penalty',()=>{
  const g=run(),p=g.state.player;p.path.fallen=true;
  const bases={S01:['damage',3],S02:['block',3],S04:['damage',5],S05:['damage',2],S06:['block',1],S07:['block',3],S08:['damage',1],S12:['block',7],S14:['damage',2],S15:['damage',6],S16:['damage',8]};
  for(const[id,[key,value]]of Object.entries(bases)){
    const effective=g.getEffectiveCard(id);assert.equal(effective[key],value,id);
    assert.equal(effective.fallenPenalty,true);assert.equal(effective.attackMultiplier,.5);
    assert.doesNotMatch(effective.text,/入魔|减半|衰减|基础值|50\s*%|额外增伤照常/);
    assert.notEqual(effective.text,N.CARDS[id].text,id);
  }
  for(let intent=0;intent<=8;intent++){
    const current=run();current.state.player.path.fallen=true;const b=battle(current);b.swordIntent=intent;
    play(current,'S04');assert.equal(1000-b.enemy.hp,5+Math.floor(3*intent/2),`intent ${intent}`);
  }
  assert.equal(g.getEffectiveCard('S04').text,'消耗全部剑意，造成 5＋⌊3×消耗层数÷2⌋ 点伤害。');
  assert.equal(g.getEffectiveCard('S08').text,'连续攻击 3 次，每次 1 点伤害；若结算前剑意至少 3 层，每次改为 2 点。不消耗剑意。');
  assert.equal(g.getEffectiveCard('S03').text,N.CARDS.S03.text);
});

test('all event choices keep their mechanics internal across hidden NPC and sword branches',()=>{
  for(const fallen of[false,true])for(const intent of['grateful','greedy'])for(const aided of[false,true])for(const id of N.EVENT_IDS){
    const g=run();g.state.player.path.fallen=fallen;g.state.player.path.learned=fallen;
    g.state.journey.hidden.jiIntent=intent;
    Object.assign(g.state.journey.flags,{liuAid:aided,jiHelp:aided,jiExposed:aided,wenFreed:aided,wenCleansed:false,wenEvidence:aided});
    const e=enter(g,5,'event',id);
    assert.equal(e.id,id);assert.doesNotMatch(eventText(e),hiddenRules,`${id}/${fallen}/${intent}/${aided}`);
    assert.doesNotMatch(eventText(e),/修为不足\s*\d|需要灵识|灵识至少|固定(?:顺序|循环)/,id);
  }
  assert.ok(Object.values(N.NPCS).every(n=>!n.description));
});

test('ordinary choices still record the same flags and journal without advertising later consequences',()=>{
  const cases=[['liu_first',0,'liuAid',true],['liu_first',2,'liuAid',false],
    ['ji_first',0,'jiHelp',true],['ji_first',2,'jiHelp',false],
    ['ji_return',0,'jiExposed',true],['ji_return',2,'jiExposed',false],
    ['wen_first',0,'wenFreed',true],['wen_first',1,'wenFreed',false],
    ['wen_return',0,'wenCleansed',true],['wen_return',1,'wenCleansed',false],
    ['demonic_offer',1,'demonicRefused',true]];
  for(const[id,index,flag,value]of cases){
    const g=run();if(id==='wen_return')g.state.journey.flags.wenFreed=true;
    const e=enter(g,5,'event',id),before=g.state.journey.journal.length;
    assert.equal(g.chooseEvent(index),true);assert.equal(g.state.journey.flags[flag],value,id);
    assert.equal(g.state.journey.journal.length,before+1,id);
    assert.equal(g.state.journey.journal.at(-1).text,e.choices[index].outcome);
    assert.equal(g.chooseEvent(index),false);assert.equal(g.state.journey.journal.length,before+1);
  }
});

test('quiet clue choices still require all three facts before opening the hidden threshold',()=>{
  for(const complete of[false,true]){
    const g=run('mark');
    for(const[id,floor]of[['moon_trace',4],['sealed_name',14],['moon_vow',24]]){
      const e=enter(g,floor,'event',id);
      assert.doesNotMatch(eventText(e),/线索|进度|三条|三处|解锁|已记录/);
      assert.equal(g.chooseEvent(id==='moon_vow'&&!complete?2:0),true);
    }
    assert.equal(g.state.journey.flags.bellEcho,true);assert.equal(g.state.journey.flags.ritualName,true);
    assert.equal(!!g.state.journey.flags.emptyVow,complete);
    const b=enter(g,30,'boss');b.enemy.hp=1;b.energy=99;play(g,'C01');
    assert.equal(g.state.screen,complete?'threshold':'victory');
  }
});

test('poison relief and treatment keep meaningful prices, healing and rejection rules',()=>{
  const g=run(),p=g.state.player;p.affliction.active=true;p.affliction.revealed=true;
  p.hp=20;enter(g,6,'rest');assert.equal(g.rest('cleanse'),true);
  assert.equal(p.hp,25);assert.equal(p.affliction.suppressed,4);assert.equal(p.affliction.active,true);
  assert.doesNotMatch(g.state.notice,/\d\s*次|压制接下来/);
  enter(g,8,'shop');const hp=p.hp,gold=p.gold;assert.equal(g.buyAntidote(),true);
  assert.equal(p.hp,hp+6);assert.equal(p.gold,gold-30);assert.equal(p.affliction.suppressed,6);
  assert.doesNotMatch(g.state.notice,/\d\s*次|压制接下来/);assert.equal(g.buyAntidote(),false);
  enter(g,22,'event','mirror_trial');const before=structuredClone(p);
  assert.equal(g.chooseEvent(1),false);assert.deepEqual(p,before);
  p.gold=40;enter(g,22,'event','mirror_trial');const currentHp=p.hp;assert.equal(g.chooseEvent(1),true);
  assert.equal(p.gold,0);assert.equal(p.hp,currentHp);assert.equal(p.affliction.active,false);
  assert.ok(!p.questItems.includes('clearheart_jade'));
});

test('equipment descriptions omit control algorithms while backend requirements remain unchanged',()=>{
  assert.equal(N.WEAPONS.rime.requiredLevel,2);assert.equal(N.WEAPONS.spirit.requiredLevel,2);
  assert.equal(N.WEAPONS.divine.requiredLevel,4);assert.equal(N.WEAPONS.divine.bonus,4);
  for(const weapon of Object.values(N.WEAPONS))assert.doesNotMatch(weapon.text,/至少\s*\d|不足\s*\d|灵识.*\d|固定循环|依回合|灵力\s*−1/);
  const g=run(),p=g.state.player;p.weaponInventory.push('rime','divine');
  assert.equal(g.equipWeapon('rime'),false);assert.equal(g.equipWeapon('divine'),true);
  const b=battle(g);assert.equal(b.energy,99);assert.equal(g.getWeaponStatus().controlled,false);
  assert.match(g.getWeaponStatus().omen,/灵力 −1/);
});
