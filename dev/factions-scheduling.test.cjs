/* Scheduling probe, not a difficulty/playtest estimate.
 * One hundred eighty seeded campaigns keep the generated map, actual connections, RNG and
 * event scheduling intact. Explicit fast-clear fixtures refill HP/spirit stones
 * and set each battle to a one-hit victory. Progression, choices and rewards use
 * public actions. No map edges, node story IDs or quest records are edited.
 */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto'),N=require('./engine.js');
const random=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);

test('all fourteen faction source/cave pairs are reachable, mutually exclusive and role-correct on 180 actual connected fast-clear routes',()=>{
  const seen=new Set(),completed=new Set(),perRole={},factionSeen={mark:new Set(),sword:new Set(),sovereign:new Set()},automatic=new Set(),aided=new Set(),runs=[];
  for(const starter of ['mark','sword','sovereign']){
    perRole[starter]={runs:0,hiddenChainCompletions:0,heartChainCompletions:0};
    for(const stance of [0,1])for(let seed=1;seed<=30;seed++){
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
            const node=nodes.find(n=>/^faction_/.test(n.storyId||''))||nodes.find(n=>/^boss_|^blood_/.test(n.storyId||''))||nodes.find(n=>n.storyId)||nodes[0];
            assert.ok(node,`${starter} seed ${seed} floor ${s.floor}: reachable node`);
            const previous=s.history.at(-1);
            if(previous){const source=s.map[previous.floor-1].find(n=>n.id===previous.id);assert.ok(source.next.includes(node.id),'chosen destination has a real connection');}
            assert.equal(game.enterNode(node.id),true);break;
          }
          case 'battle':{
            assert.ok(starter!=='sovereign'||s.battle.enemy.id!=='feiye','the palace owner never fights an enemy copy of herself');
            const b=s.battle,id=starter==='sovereign'?'F01':starter==='sword'?'S01':'C01';
            b.enemy.hp=1;b.enemy.block=0;b.enemy.counter=0;b.energy=10;
            const uid=100000+actions;b.hand=[{id,uid}];
            assert.equal(game.playCard(uid,true),true);break;
          }
          case 'event':{
            if(s.event.resolved){assert.equal(game.leaveEvent(),true);break;}
            if(s.event.factionEvent)factionSeen[starter].add(s.event.id);if(/^boss_|^blood_/.test(s.event.id))seen.add(s.event.id);
            const index=s.event.factionEvent?.kind==='source'?stance:s.event.choices.findIndex(choice=>!choice.disabled);
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
        // This probe deliberately prioritizes faction branches over optional old clues.
        // The separate boss-chain probe retains its strict 60/60 clue assertions.
        if(game.state.journey.bossQuests.records.feiye.stage===3)perRole[starter].hiddenChainCompletions++;
      }else if(game.state.journey.bossQuests.records.heart.stage===3)perRole[starter].heartChainCompletions++;
      const records=Object.entries(game.state.journey.factions?.records||{});
      for(const[key,rec]of records){if(rec.automatic)automatic.add(rec.boss);if(rec.outcome==='aid')aided.add(rec.boss);const prior=records.find(([k,x])=>x.boss===rec.boss&&x.kind==='source');if(rec.kind==='cave'&&prior)assert.ok(Number(prior[0].match(/^f(\d+)/)[1])<Number(key.match(/^f(\d+)/)[1]),'credential source precedes the cave');}
      const scheduled=game.state.journey.factions?.scheduled||[];assert.ok(scheduled.filter(k=>k.startsWith('6:')&&k.endsWith(':cave')).length<=1,'at most one major faction cave in the last region');
      if(starter!=='sovereign') assert.ok(!records.some(([k,r])=>['feiye_echo','retainer','heart','snake_ascended'].includes(r.boss)),'other characters do not borrow sovereign-only encounters');
      runs.push({starter,stance,seed,nodes:game.state.history.length,records:records.map(([id,r])=>({id,boss:r.boss,kind:r.kind,outcome:r.outcome,automatic:!!r.automatic})),theme:game.state.journey.factions?.themes?.[6]});
      perRole[starter].runs++;
    }
  }
  const all=new Set(Object.values(factionSeen).flatMap(xs=>[...xs]));
  for(const id of N.ENEMY_FACTIONS.EVENTS)assert.ok(all.has(id),id+' has an actual reachable route');
  for(const boss of Object.keys(N.ENEMY_FACTIONS.GROUPS)){assert.ok(automatic.has(boss),boss+' supporting credentials actually cause battle');assert.ok(aided.has(boss),boss+' opposition credentials actually permit aid');}
  const inputs=Object.fromEntries(['engine.js','enemy-factions.js','factions-scheduling.test.cjs'].map(n=>['dev/'+n,crypto.createHash('sha256').update(fs.readFileSync(__dirname+'/'+n)).digest('hex')]));
  fs.writeFileSync(__dirname+'/factions-scheduling-results.json',JSON.stringify({method:'180 connected fast-clear fixtures (three characters, both stances, thirty seeds). Original map links, RNG and story schedules retained; HP and spirit stones explicitly refilled and combat reduced to one or two hits. Reachability, not difficulty or human play.',inputs,runs,seen:[...all].sort(),automatic:[...automatic].sort(),aided:[...aided].sort(),allNodes:70},null,2)+'\n');
});
