/* V8 chapter routes, persistent affliction and the sword's demonic path.
 * State mutations below arrange bounded rule fixtures; progression uses public actions. */
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const N=require('./engine.js');
const random=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
let cardSerial=0;
function run(starter='sword',extra={}) {
  const game=N.createGame({environment:false,rng:random(10),...extra});
  assert.equal(game.newRun(starter),true);return game;
}
function enter(game,floor=1,type='fight',storyId) {
  const s=game.state,n=s.map[floor-1].find(n=>n.type===type)||s.map[floor-1][0];
  s.floor=floor;s.journey.regionIndex=Math.floor((floor-1)/10);s.screen='map';
  s.history=s.history.filter(h=>h.floor!==floor);s.availableNodes=[n.id];
  n.revealed=true;n.type=type;
  if(storyId)n.storyId=storyId;else if(type==='event')delete n.storyId;
  assert.equal(game.enterNode(n.id),true);return s.battle;
}
function eventAt(game,id,floor=5) { enter(game,floor,'event',id);assert.equal(game.state.event.id,id);return game.state.event; }
function play(game,id) {
  const b=game.state.battle,c={id,uid:'v8-fixture-'+(++cardSerial)};
  b.hand.push(c);return game.playCard(c.uid,true);
}
function kill(game,id=game.state.character==='sovereign'?'F01':game.state.character==='sword'?'S01':'C01') {
  const b=game.state.battle;b.enemy.hp=1;b.enemy.block=0;b.energy=99;
  assert.equal(play(game,id),true);
}
function turn(game) {assert.equal(game.endTurn(),true);assert.equal(game.resolveEnemyTurn(),true);}
function reward(game) {
  if(game.state.reward.relicPending)assert.equal(game.chooseRelic(game.state.reward.relicChoices[0]),true);
  assert.equal(game.chooseReward(null),true);
}
function durableBattle(game,floor=8) {
  const b=enter(game,floor);b.enemy.id='lantern';b.enemy.hp=b.enemy.maxHp=1000;b.enemy.intentIndex=0;b.energy=99;return b;
}
function choose(game,index=0) {assert.equal(game.chooseEvent(index),true);assert.equal(game.chooseEvent(index),false);}

test('twenty templates generate three independent ten-step, forty-plus-node connected chapter maps',()=>{
  assert.equal(N.ROUTE_TEMPLATES.length,20);
  assert.deepEqual(N.REGIONS.map(r=>r.stages),[[1,10],[11,20],[21,30]]);
  const layouts=new Set(),placements=new Map();
  for(let template=0;template<20;template++)for(let seed=1;seed<=20;seed++){
    const game=run('mark',{routeTemplate:template,rng:random(seed)}),s=game.state;
    assert.equal(s.map.length,30);assert.equal(s.chapterTemplates.length,3);
    const all=s.map.flat(),byId=new Map(all.map(n=>[n.id,n])),seen=new Set([s.map[0][0].id]);
    for(let chapter=0;chapter<3;chapter++){
      const rows=s.map.slice(chapter*10,chapter*10+10),nodes=rows.flat();
      assert.equal(rows.length,10);assert.ok(nodes.length>=40,`template ${template}, chapter ${chapter}`);
      assert.equal(s.chapterTemplates[chapter].id,N.ROUTE_TEMPLATES[template].id);
      assert.equal(s.chapterTemplates[chapter].nodeCount,nodes.length);
      assert.equal(rows[0].length,1);assert.equal(rows[9].length,1);assert.equal(rows[9][0].type,'boss');
      assert.ok(nodes.every(n=>n.regionIndex===chapter));
      let crossings=0;
      for(let step=0;step<9;step++){
        const source=rows[step],destination=rows[step+1],lanes=new Map(destination.map(n=>[n.id,n.lane]));
        if(source.length>1)for(const n of source)assert.ok(n.next.length>=1&&n.next.length<=3,`${n.id} has ${n.next.length} exits`);
        for(let i=0;i<source.length;i++)for(let j=i+1;j<source.length;j++)for(const a of source[i].next)for(const b of source[j].next)if(lanes.get(a)>lanes.get(b))crossings++;
      }
      assert.ok(crossings>0,`template ${template}, chapter ${chapter} has no crossing`);
    }
    for(const row of s.map)for(const n of row){
      assert.ok(seen.has(n.id),`${n.id} unreachable`);assert.ok(Number.isFinite(n.xJitter)&&Math.abs(n.xJitter)<=.14);assert.ok(Number.isFinite(n.yJitter)&&Math.abs(n.yJitter)<=.175);
      if(n.floor<30)assert.ok(n.next.length>0,`${n.id} dead end`);
      for(const id of n.next){assert.ok(byId.has(id));assert.equal(byId.get(id).floor,n.floor+1);seen.add(id);}
    }
    assert.equal(seen.size,all.length);
    for(const [floor,id]of[[4,'moon_trace'],[14,'sealed_name'],[24,'moon_vow']]){
      const n=s.map[floor-1].find(n=>n.storyId===id);assert.ok(n,id);
      for(const previous of s.map[floor-2])assert.ok(previous.next.includes(n.id));
    }
    if(seed===1)layouts.add(JSON.stringify(s.map.map(row=>row.map(n=>n.next))));
    if(!placements.has(template))placements.set(template,new Set());
    placements.get(template).add(JSON.stringify(s.map.map(row=>row.map(n=>n.type))));
  }
  assert.equal(layouts.size,20);
  for(const variations of placements.values())assert.ok(variations.size>=15);
  const independent=run('sword',{routeTemplate:[1,7,18]});
  assert.deepEqual(independent.state.chapterTemplates.map(t=>t.id),[1,7,18].map(i=>N.ROUTE_TEMPLATES[i].id));
});

test('chapters reveal ten steps at a time and bosses 10/20 grant rewards before the next arrival',()=>{
  const game=run('mark'),s=game.state;
  assert.equal(game.enterNode('f1-0'),false);assert.equal(game.enterRegion(),true);
  assert.ok(s.map.slice(0,10).flat().every(n=>n.revealed));assert.ok(s.map.slice(10).flat().every(n=>!n.revealed));
  for(const floor of[10,20]){
    enter(game,floor,'boss');const before=s.player.gold;kill(game);
    assert.equal(s.screen,'reward');assert.equal(s.reward.chapterBoss,true);assert.equal(s.player.gold,before+35);
    assert.equal(s.result,null);assert.equal(game.startHiddenBoss(),false);
    reward(game);assert.equal(s.floor,floor+1);assert.equal(s.screen,'arrival');
    assert.equal(s.history.filter(h=>h.floor===floor).length,1);
    assert.equal(game.enterNode(s.availableNodes[0]),false);assert.equal(game.enterRegion(),true);
    assert.ok(s.map.slice(floor,floor+10).flat().every(n=>n.revealed));
  }
  enter(game,30,'boss');kill(game);assert.equal(s.screen,'victory');assert.equal(s.result.floor,30);
  assert.equal(s.history.filter(h=>h.floor===30).length,1);assert.equal(game.chooseReward(null),false);
});

test('sword milestones preserve optional hidden clues and ordinary NPC introductions',()=>{
  const game=run(),s=game.state;
  for(const[floor,id]of[[5,'tainted_mercy'],[7,'demonic_offer'],[17,'demonic_warning'],[22,'mirror_trial'],[27,'demon_manual']])assert.ok(s.map[floor-1].every(n=>n.storyId===id));
  for(const[floor,id]of[[4,'moon_trace'],[14,'sealed_name'],[24,'moon_vow']])assert.ok(s.map[floor-1].some(n=>n.storyId===id),id);
  assert.ok(s.map[23].some(n=>n.storyId==='fallen_hunt'));
  assert.deepEqual(new Set(s.map[2].map(n=>n.storyId)),new Set(['liu_first','ji_first','wen_first']));
  assert.ok(!s.player.deck.some(c=>c.id.startsWith('D')));
  for(const id of['D01','D02','D03','D04','D05','D06'])assert.equal(N.CARDS[id].storyOnly,true);
  enter(game,2,'shop');assert.ok(game.state.shop.cards.every(c=>!c.id.startsWith('D')));
  game.leaveShop();durableBattle(game,4);kill(game);assert.ok(game.state.reward.cards.every(id=>!id.startsWith('D')));
  for(let template=0;template<20;template++)for(let seed=1;seed<=10;seed++){
    const sword=run('sword',{routeTemplate:template,rng:random(seed)}).state,clue=sword.map[23].find(n=>n.storyId==='moon_vow');
    assert.ok(clue);assert.ok(sword.map[23].some(n=>n.storyId==='fallen_hunt'&&n.id!==clue.id));
    for(const previous of sword.map[22])assert.ok(previous.next.includes(clue.id),`sword ${template}/${seed}: clue disconnected`);
    for(const row of sword.map)if(row.length>1)for(const node of row)assert.ok(node.next.length>=1&&node.next.length<=3);
  }
});

test('a tainted kindness stays hidden until the next node, then ticks only on entries and player turns',()=>{
  const game=run(),s=game.state,p=s.player;eventAt(game,'tainted_mercy');const before=p.hp;
  choose(game);assert.equal(p.hp,before);assert.equal(p.affliction.active,true);assert.equal(p.affliction.revealed,false);assert.equal(p.affliction.ticks,0);
  game.getAffliction();game.getCorruptionStatus();game.getEffectiveCard('S01');
  assert.equal(game.leaveEvent(),true);assert.equal(p.affliction.ticks,0);
  enter(game,6,'rest');assert.equal(p.affliction.revealed,true);assert.equal(p.affliction.ticks,1);assert.equal(p.hp,before-1);
  for(let i=0;i<5;i++){game.getAffliction();game.getAvailableNodes();game.getEnvironment();}
  assert.equal(p.affliction.ticks,1);assert.equal(game.rest(false),true);assert.equal(p.affliction.ticks,1);
  const b=durableBattle(game,8);assert.equal(p.affliction.ticks,3);assert.equal(p.hp,before-3);
  b.block=999;const hp=p.hp;turn(game);assert.equal(p.affliction.ticks,4);assert.equal(p.hp,hp-1);
  b.energy=99;kill(game);const ticks=p.affliction.ticks;game.getAffliction();reward(game);assert.equal(p.affliction.ticks,ticks);
});

test('healing leaves poison active; rest and 30-gold antidotes offer finite relief rather than a cure',()=>{
  for(const relief of['rest','antidote']){
    const game=run(),p=game.state.player;eventAt(game,'tainted_mercy');choose(game);game.leaveEvent();p.hp=20;
    enter(game,6,'rest');assert.equal(p.hp,19);game.rest(true);assert.equal(p.hp,37);assert.equal(p.affliction.active,true);
    let duration;
    if(relief==='rest'){
      enter(game,8,'rest');const hp=p.hp,gold=p.gold;assert.equal(game.rest('cleanse'),true);
      assert.equal(p.hp,hp+6);assert.equal(p.gold,gold);duration=4;
    }else{
      enter(game,8,'shop');const hp=p.hp,gold=p.gold;
      assert.equal(game.buyAntidote(),true);assert.equal(p.gold,gold-30);assert.equal(p.hp,hp+6);assert.equal(game.buyAntidote(),false);
      game.leaveShop();duration=6;
    }
    assert.equal(p.affliction.active,true);assert.equal(p.affliction.suppressed,duration);
    const hp=p.hp,b=durableBattle(game,9);assert.equal(p.hp,hp);assert.equal(p.affliction.suppressed,duration-2);
    for(let i=0;i<duration-2;i++){b.enemy.intentIndex=0;turn(game);assert.equal(p.hp,hp);}
    assert.equal(p.affliction.suppressed,0);b.enemy.intentIndex=0;turn(game);assert.equal(p.hp,hp-1);
  }
  const poor=run();eventAt(poor,'tainted_mercy');choose(poor);poor.leaveEvent();poor.state.player.gold=0;
  enter(poor,6,'shop');assert.equal(poor.buyAntidote(),false);assert.equal(poor.leaveShop(),true);
  enter(poor,8,'rest');assert.equal(poor.rest('cleanse'),true);assert.equal(poor.state.player.affliction.active,true);
  assert.equal(poor.state.player.affliction.suppressed,4);assert.equal(poor.state.screen,'map');
});

test('optional forty-gold treatment permanently cures poison independently of taking clearheart jade',()=>{
  for(const id of['demonic_warning','mirror_trial']){
    const game=run(),p=game.state.player;p.affliction.active=true;p.affliction.revealed=true;
    eventAt(game,id,id==='demonic_warning'?17:22);const hp=p.hp,gold=p.gold;choose(game,1);
    assert.equal(p.gold,gold-40);assert.equal(p.affliction.active,false);assert.equal(p.hp,hp);
    assert.ok(!p.questItems.includes('clearheart_jade'));game.leaveEvent();
    const ticks=p.affliction.ticks;durableBattle(game,25);assert.equal(p.hp,hp);assert.equal(p.affliction.ticks,ticks);
  }
});

test('persistent poison can kill on entry or turn; fox and nine lives resolve the same lethal tick once',()=>{
  for(const protection of[null,'fox']){
    const game=run(),p=game.state.player;eventAt(game,'tainted_mercy');choose(game);game.leaveEvent();p.hp=1;
    if(protection)p.relics.push(protection);enter(game,6,'rest');
    assert.equal(p.affliction.ticks,1);
    if(protection){assert.equal(game.state.screen,'rest');assert.equal(p.hp,12);assert.ok(!p.relics.includes('fox'));}
    else{assert.equal(game.state.screen,'defeat');assert.equal(p.hp,0);assert.equal(game.rest('cleanse'),false);}
  }
  const game=run(),p=game.state.player,b=durableBattle(game);p.relics.push('ninelives');
  p.affliction.active=true;p.affliction.revealed=true;p.hp=1;b.enemy.intentIndex=0;
  turn(game);assert.equal(p.hp,18);assert.equal(b.nineUsed,true);assert.equal(p.affliction.ticks,1);
  p.hp=1;b.enemy.intentIndex=0;turn(game);assert.equal(game.state.screen,'defeat');assert.equal(p.affliction.ticks,2);
});

test('the demonic offer learns a story-only heal while refusal leaves the poison untreated',()=>{
  for(const index of[0,1]){
    const game=run(),p=game.state.player;p.affliction.active=true;
    eventAt(game,'demonic_offer',7);choose(game,index);
    assert.equal(p.affliction.active,true);
    assert.equal(p.deck.some(c=>c.id==='D01'),index===0);assert.equal(p.path.learned,index===0);
    assert.equal(p.path.corruption,0);
  }
});

test('demonic cards cannot spend energy or resolve effects before learning, even when injected into a hand',()=>{
  const game=run(),p=game.state.player,b=durableBattle(game);p.hp=20;
  for(const id of['D01','D02','D03','D04','D05','D06']){
    const card={id,uid:`locked-${id}`};b.hand.push(card);
    const before={energy:b.energy,hp:p.hp,enemy:b.enemy.hp,block:b.block,played:b.played,draw:b.draw.length,path:structuredClone(p.path),stats:structuredClone(game.state.stats)};
    assert.ok(game.getEffectiveCard(id));assert.equal(game.playCard(card.uid,true),false);
    assert.ok(b.hand.includes(card));assert.equal(b.energy,before.energy);assert.equal(p.hp,before.hp);assert.equal(b.enemy.hp,before.enemy);assert.equal(b.block,before.block);assert.equal(b.played,before.played);assert.equal(b.draw.length,before.draw);
    assert.deepEqual(p.path,before.path);assert.deepEqual(game.state.stats,before.stats);
  }
  eventAt(game,'demonic_offer',7);choose(game);game.leaveEvent();const learned=durableBattle(game);p.hp=20;
  assert.equal(play(game,'D01'),true);assert.equal(learned.enemy.hp,996);assert.equal(p.hp,26);assert.equal(p.path.corruption,1);
  const other=run('mark'),otherBattle=durableBattle(other);other.state.player.path.learned=true;
  assert.equal(play(other,'D01'),false);assert.equal(otherBattle.enemy.hp,1000);
});

test('six demonic uses trigger irreversible falling; jade acquired before the threshold blocks all future gain',()=>{
  for(const withJade of[false,true]){
    const game=run(),p=game.state.player;
    eventAt(game,'demonic_offer',7);choose(game);game.leaveEvent();
    if(withJade){eventAt(game,'demonic_warning',17);choose(game);assert.ok(p.questItems.includes('clearheart_jade'));game.leaveEvent();}
    const b=durableBattle(game);p.hp=10;
    for(let i=0;i<6;i++){b.energy=99;assert.equal(play(game,'D01'),true);assert.equal(p.path.fallen,!withJade&&i===5);}
    assert.equal(p.path.corruption,withJade?0:6);assert.equal(p.path.uses,6);assert.equal(game.state.stats.demonicUses,6);
    if(!withJade){
      kill(game);reward(game);eventAt(game,'mirror_trial',22);choose(game);
      assert.ok(p.questItems.includes('clearheart_jade'));assert.equal(p.path.fallen,true);assert.equal(p.path.corruption,6);
      durableBattle(game,25);play(game,'D01');assert.equal(p.path.fallen,true);assert.equal(p.path.corruption,6);
    }
  }
  const edge=run(),p=edge.state.player;p.path.corruption=5;p.path.learned=true;eventAt(edge,'mirror_trial',22);choose(edge);edge.leaveEvent();
  durableBattle(edge);play(edge,'D01');assert.equal(p.path.corruption,5);assert.equal(p.path.fallen,false);
});

test('falling halves old sword attack and block bases but keeps weapon, power and relic additions whole',()=>{
  const game=run(),p=game.state.player;p.path.fallen=true;p.level=4;p.power=2;p.weaponInventory.push('divine');p.equippedWeapon='divine';p.relics.push('silk');
  const b=durableBattle(game);b.bloodPower=2;b.nextAttack=4;b.energy=99;
  assert.equal(play(game,'S01'),true);assert.equal(b.events.find(e=>e.type==='attack').amount,3+4+2+2+4);
  assert.equal(play(game,'S02'),true);assert.equal(b.block,3+2);
  assert.equal(play(game,'S08'),true);assert.deepEqual(b.events.filter(e=>e.type==='attack').map(e=>e.amount),[5,1,1]);
  const effective=game.getEffectiveCard('S01');assert.ok(effective.text);assert.notEqual(effective.text,N.CARDS.S01.text);
  assert.equal(N.CARDS.S01.text.includes('6 点伤害'),true);
});

test('all six demonic techniques retain their full damage, block, draw, heal and exhaust rules after falling',()=>{
  const expected={D01:{damage:4,heal:6},D02:{damage:8,heal:3},D03:{damage:16,heal:5},D04:{block:12,draw:1},D05:{draw:2,exhaust:true},D06:{damage:26,heal:6}};
  for(const[id,want]of Object.entries(expected)){
    const game=run(),p=game.state.player;p.path.fallen=true;p.path.corruption=6;p.path.learned=true;
    const b=durableBattle(game);p.hp=20;b.energy=99;b.hand=[];b.draw=Array.from({length:5},(_,i)=>({id:'S01',uid:`draw-${id}-${i}`}));
    assert.equal(play(game,id),true);
    assert.equal(1000-b.enemy.hp,want.damage||0,id);assert.equal(p.hp,20+(want.heal||0),id);
    assert.equal(b.block,want.block||0,id);assert.equal(b.hand.length,want.draw||0,id);
    assert.equal(b.exhaust.some(c=>c.id===id),!!want.exhaust,id);
    assert.equal(game.getEffectiveCard(id).text,N.CARDS[id].text);
  }
});

test('fallen hunt starts actual combat, awards its demonic manuscript only on victory and completes once',()=>{
  const game=run(),s=game.state,p=s.player;p.path.fallen=true;p.path.corruption=6;p.path.learned=true;
  eventAt(game,'fallen_hunt',24);const held=p.deck.length;choose(game);
  assert.equal(s.screen,'event');assert.equal(p.deck.length,held);assert.equal(game.leaveEvent(),true);
  assert.equal(s.screen,'battle');assert.equal(s.battle.enemy.id,'apothecary');assert.equal(s.battle.enemy.hp,60);
  assert.equal(game.leaveEvent(),false);kill(game,'D01');assert.equal(s.screen,'reward');
  const acquired=p.deck.filter(c=>['D02','D03'].includes(c.id)).map(c=>c.id);
  assert.ok(acquired.length>=1);assert.ok(new Set(acquired).size===acquired.length);
  const count=p.deck.length,gold=p.gold;assert.equal(game.playCard('missing',true),false);assert.equal(p.deck.length,count);assert.equal(p.gold,gold);
  reward(game);assert.equal(s.floor,25);assert.equal(s.history.filter(h=>h.floor===24).length,1);assert.equal(game.chooseReward(null),false);
});

test('new run clears poison, corruption, quest items and gear while a legitimate hidden unlock persists',()=>{
  let saves=0;const game=run('mark',{onProfileChange:()=>saves++}),s=game.state;
  Object.assign(s.journey.flags,{bellEcho:true,ritualName:true,emptyVow:true});enter(game,30,'boss');kill(game);
  assert.equal(s.screen,'threshold');const completed=s.history.length;assert.equal(game.startHiddenBoss(),true);kill(game);
  assert.equal(s.result.hiddenWin,true);assert.deepEqual(game.getProfile().unlocks,['feiye']);assert.equal(saves,1);assert.equal(s.history.length,completed);
  s.player.affliction.active=true;s.player.path.fallen=true;s.player.path.corruption=6;s.player.questItems.push('clearheart_jade');s.player.weaponInventory.push('divine');
  assert.equal(game.newRun('sword'),true);const p=game.state.player;
  assert.equal(p.affliction.active,false);assert.equal(p.affliction.ticks,0);assert.equal(p.affliction.suppressed,0);assert.equal(p.path.corruption,0);assert.equal(p.path.fallen,false);assert.equal(p.path.uses,0);
  assert.deepEqual(p.questItems,[]);assert.deepEqual(p.weaponInventory,['training']);assert.deepEqual(game.getProfile().unlocks,['feiye']);
  const detached=game.getProfile();detached.unlocks.length=0;assert.deepEqual(game.getProfile().unlocks,['feiye']);
  assert.equal(game.newRun('sovereign'),true);
  for(const[floor,id]of[[3,'sovereign_wake'],[13,'sovereign_recall'],[23,'sovereign_memory']])assert.ok(game.state.map[floor-1].every(n=>n.storyId===id));
  for(const[floor,id]of[[10,'feiye_echo'],[20,'retainer'],[26,'heart'],[30,'snake_ascended']])assert.equal(game.state.map[floor-1][0].encounter.enemyId,id);
});

test('regional pressure changes draw, energy and the first attack without blanket life loss',()=>{
  for(const[floor,hand,energy]of[[1,4,3],[11,5,2],[21,5,3]]){
    const game=run('mark',{environment:true}),b=durableBattle(game,floor),p=game.state.player;
    // The fixture raises energy after entry; inspect its opening event and restore the actual value.
    const penalty=b.events.find(e=>e.type==='environment'&&e.kind==='energy');
    assert.equal(!!penalty,floor===11);assert.equal(b.hand.length,hand);assert.equal(p.hp,60);
    b.energy=energy;
    if(floor===21){
      play(game,'C01');assert.equal(b.events.find(e=>e.type==='attack').amount,5);
      play(game,'C01');assert.equal(b.events.find(e=>e.type==='attack').amount,6);
    }
    const hp=p.hp;b.enemy.intentIndex=0;turn(game);assert.equal(b.energy,3);assert.equal(b.hand.length,5);assert.equal(p.hp,hp);
    if(floor===21){play(game,'C01');assert.equal(b.events.find(e=>e.type==='attack').amount,5);}
  }
});

test('a public journey visits exactly thirty connected nodes and carries one NPC chain through three chapters',()=>{
  for(const seed of[3,15,81]){
    const game=run('mark',{rng:random(seed)}),s=game.state;
    let steps=0;
    while(!['victory','defeat'].includes(s.screen)&&steps++<200){
      if(s.screen==='arrival'){assert.equal(game.enterRegion(),true);continue;}
      if(s.screen==='map'){
        const available=game.getAvailableNodes();assert.ok(available.length);
        const node=available.find(n=>n.type==='event'&&n.npc==='liu')||available.find(n=>n.type==='rest')||available[0];
        assert.equal(game.enterNode(node.id),true);continue;
      }
      if(s.screen==='battle'){kill(game);continue;}
      if(s.screen==='reward'){reward(game);continue;}
      if(s.screen==='event'){
        if(!s.event.resolved){let safe=s.event.choices.findIndex(c=>!c.disabled&&!c.goldCost&&!c.hpCost&&!c.maxHpCost&&!c.battle);if(safe<0)safe=s.event.choices.findIndex(c=>!c.disabled&&!c.battle);if(safe<0)safe=s.event.choices.findIndex(c=>!c.disabled);assert.ok(safe>=0,s.event.id);assert.equal(game.chooseEvent(safe),true);}
        assert.equal(game.leaveEvent(),true);continue;
      }
      if(s.screen==='rest'){assert.equal(game.rest(true),true);continue;}
      if(s.screen==='shop'){assert.equal(game.leaveShop(),true);continue;}
      if(s.screen==='fox'){assert.equal(game.fox(false),true);continue;}
      if(s.screen==='threshold'){assert.equal(game.leaveThreshold(),true);continue;}
      assert.fail(`unexpected screen ${s.screen}`);
    }
    assert.equal(s.screen,'victory');assert.equal(s.history.length,30);assert.deepEqual(s.history.map(h=>h.floor),Array.from({length:30},(_,i)=>i+1));
    assert.equal(s.stats.chapterBosses,2);assert.equal(s.journey.step,3);assert.ok(s.journey.chain);
    assert.equal(s.journey.journal.filter(j=>j.npc===s.journey.chain&&[3,13,23].includes(j.floor)).length,3);
    assert.equal(game.enterNode('f30-0'),false);
  }
});

// The fallen branch may attack someone who offered help; loot still requires victory.
test('fallen-only manuscript plunder attacks an unhostile keeper and grants five pages once after real victory',()=>{
  const normal=run();eventAt(normal,'demon_manual',27);assert.ok(!normal.state.event.choices.some(c=>c.flags?.fallenPlunder));
  const game=run(),s=game.state,p=s.player;Object.assign(p.path,{fallen:true,corruption:6,learned:true,uses:6});
  eventAt(game,'demon_manual',27);assert.ok(s.event.story.join('').includes('没有拔剑'));
  const index=s.event.choices.findIndex(c=>c.flags?.fallenPlunder);assert.ok(index>=0);
  const held=p.deck.length,gold=p.gold;choose(game,index);assert.equal(p.deck.length,held);assert.equal(p.gold,gold);
  assert.equal(game.leaveEvent(),true);assert.equal(s.screen,'battle');assert.equal(s.battle.enemy.name,'守卷弟子');assert.equal(s.battle.enemy.hp,42);
  assert.equal(game.chooseEvent(index),false);kill(game);assert.equal(s.screen,'reward');assert.equal(p.deck.length,held+5);assert.equal(p.gold,gold+20);
  for(const id of ['D02','D03','D04','D05','D06'])assert.equal(p.deck.filter(c=>c.id===id).length,1);
  const earned=p.deck.length;assert.equal(game.playCard('missing',true),false);assert.equal(p.deck.length,earned);reward(game);assert.equal(s.floor,28);assert.equal(game.chooseReward(null),false);
});
