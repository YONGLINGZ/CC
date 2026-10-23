/* Scheduling probe, not a difficulty/playtest estimate.
 * Ninety seeded campaigns keep the generated map, actual connections, RNG and
 * event scheduling intact. Explicit fast-clear fixtures refill HP/spirit stones
 * and set each battle to a one-hit victory. Progression, choices and rewards use
 * public actions. No map edges, node story IDs or quest records are edited.
 */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),N=require('./engine.js');
const random=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);

test('ninety fast-clear fixtures reach all fourteen three-stage boss chains and the linked blood events through actual connected routes',()=>{
  const seen=new Set(),completed=new Set(),perRole={};
  for(const starter of ['mark','sword','sovereign']){
    perRole[starter]={runs:0,hiddenChainCompletions:0,heartChainCompletions:0};
    for(let seed=1;seed<=30;seed++){
      const game=N.createGame({rng:random(seed),environment:false,profile:{version:1,unlocks:['feiye']}});
      assert.equal(game.newRun(starter),true);let actions=0;
      while(!['victory','defeat'].includes(game.state.screen)&&actions++<1500){
        const s=game.state,p=s.player;
        // Fast-clear resources only; this fixture does not evaluate survivability.
        p.hp=p.maxHp;p.gold=500;p.affliction.active=false;
        switch(s.screen){
          case 'arrival':assert.equal(game.enterRegion(),true);break;
          case 'map':{
            const nodes=game.getAvailableNodes();
            const node=nodes.find(n=>/^boss_|^blood_/.test(n.storyId||''))||nodes.find(n=>n.storyId)||nodes[0];
            assert.ok(node,`${starter} seed ${seed} floor ${s.floor}: reachable node`);
            const previous=s.history.at(-1);
            if(previous){const source=s.map[previous.floor-1].find(n=>n.id===previous.id);assert.ok(source.next.includes(node.id),'chosen destination has a real connection');}
            assert.equal(game.enterNode(node.id),true);break;
          }
          case 'battle':{
            const b=s.battle,id=starter==='sovereign'?'F01':starter==='sword'?'S01':'C01';
            b.enemy.hp=1;b.enemy.block=0;b.enemy.counter=0;b.energy=10;
            const uid=100000+actions;b.hand=[{id,uid}];
            assert.equal(game.playCard(uid,true),true);break;
          }
          case 'event':{
            if(s.event.resolved){assert.equal(game.leaveEvent(),true);break;}
            if(/^boss_|^blood_/.test(s.event.id))seen.add(s.event.id);
            const index=s.event.choices.findIndex(choice=>!choice.disabled);
            assert.ok(index>=0,'there is a legal event choice');assert.equal(game.chooseEvent(index),true);break;
          }
          case 'reward':if(s.reward.relicPending)assert.equal(game.chooseRelic(s.reward.relicChoices[0]),true);else assert.equal(game.chooseReward(null),true);break;
          case 'rest':assert.equal(game.rest(true),true);break;
          case 'shop':assert.equal(game.leaveShop(),true);break;
          case 'fox':assert.equal(game.fox(false),true);break;
          case 'cave':if(s.cave?.result)assert.equal(game.leaveCave(),true);else assert.equal(game.exploreCave(),true);break;
          case 'threshold':assert.equal(game.leaveThreshold(),true);break;
          default:assert.fail('Unexpected screen '+s.screen);
        }
      }
      assert.ok(actions<1500,'campaign terminates');assert.equal(game.state.screen,'victory');
      assert.equal(game.state.history.length,70,'all seventy actual map steps completed');
      for(const[boss,record]of Object.entries(game.state.journey.bossQuests.records))if(record.stage===3)completed.add(boss);
      if(starter!=='sovereign'){
        assert.equal(game.state.journey.bossQuests.records.feiye.stage,3,`${starter} seed ${seed}: hidden boss evidence chain must actually be offered and completed`);
        perRole[starter].hiddenChainCompletions++;
      }else if(game.state.journey.bossQuests.records.heart.stage===3)perRole[starter].heartChainCompletions++;
      perRole[starter].runs++;
    }
  }
  for(const[boss,quest]of Object.entries(N.BOSS_QUESTS)){
    assert.equal(quest.stages.length,3);
    for(let step=1;step<=3;step++)assert.ok(seen.has(`boss_${boss}_${step}`),`${boss} stage ${step} reachable through scheduling`);
    assert.ok(completed.has(boss),boss+' has a complete naturally scheduled chain in the probe');
  }
  for(const id of ['blood_lesson','blood_debt','blood_choice'])assert.ok(seen.has(id),id+' reachable');
  assert.ok(perRole.sovereign.heartChainCompletions>0,'optional heart clues can all be followed');
});
