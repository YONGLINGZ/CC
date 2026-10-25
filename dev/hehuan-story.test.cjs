'use strict';const test=require('node:test'),A=require('node:assert/strict'),N=require('./engine.js'),H=require('./hehuan.js');
function run(){const g=N.createGame({rng:()=>.43,environment:false,tales:false});g.newRun('hehuan');g.enterRegion();return g;}
function at(g,f=7,type='rest',story=null){const s=g.state,n=s.map[f-1][0];s.screen='map';s.floor=f;s.journey.regionIndex=Math.floor((f-1)/10);n.type=type;n.revealed=true;delete n.storyId;delete n.encounter;if(story)n.storyId=story;s.availableNodes=[n.id];A.equal(g.enterNode(n.id),true);return n;}
function kill(g){const b=g.state.battle;b.enemy.hp=1;b.enemy.block=0;b.hand=[{id:'H01',uid:'story-kill'}];b.energy=3;g.playCard('story-kill',true);}
function reward(g){if(g.state.reward.relicPending)g.chooseRelic(g.state.reward.relicChoices[0]);g.chooseReward(null);}
test('three personal episodes occur before original connected nodes without replacing P2, changing edges or skipping floors',()=>{
 const g=run();for(const [f,choice]of [[7,1],[35,1],[57,0]]){const n=at(g,f,'event','faction_snake_source'),old=JSON.stringify(n);A.equal(g.state.event.id,H.STORY_IDS[[7,35,57].indexOf(f)]);g.chooseEvent(choice);g.leaveEvent();A.equal(JSON.stringify(n),old);A.equal(g.state.floor,f);A.equal(g.state.screen,'event');A.equal(g.state.event.id,'faction_snake_source');A.equal(g.state.history.some(x=>x.floor===f),false);g.chooseEvent(3);g.leaveEvent();A.equal(g.state.floor,f+1);A.equal(g.state.history.filter(x=>x.floor===f).length,1);}
 A.equal(g.state.journey.hehuan.stage,3);A.equal(g.state.journey.hehuan.flags.rescuedQinHeng,true);A.equal(g.state.journey.hehuan.flags.ledgerPublished,true);
});
test('failed negotiation awards rescue and original only after real combat, then resumes the selected rest after one reward',()=>{
 const g=run();at(g,7);g.chooseEvent(4);g.leaveEvent();at(g,35);A.match(g.state.event.choices[1].text,/失败/);const gold=g.state.player.gold;g.chooseEvent(1);A.equal(g.state.journey.hehuan.flags.rescuedQinHeng,undefined);g.leaveEvent();A.equal(g.state.battle.enemy.name,'宗门代理·宋箴');kill(g);A.equal(g.state.screen,'reward');A.equal(g.state.journey.hehuan.flags.rescuedQinHeng,true);A.ok(g.state.player.questItems.includes('hehuan_ledger_original'));A.equal(g.state.player.gold,gold+35);reward(g);A.equal(g.state.screen,'rest');A.equal(g.state.floor,35);A.equal(g.state.history.filter(x=>x.floor===35).length,0);A.equal(g.chooseReward(null),false);g.rest(false);A.equal(g.state.floor,36);
});
test('patrol death does not release the witness or create a killed-patrol fact',()=>{
 const g=run();at(g);g.chooseEvent(3);A.equal(g.state.journey.hehuan.flags.killedPatrol,undefined);g.leaveEvent();g.state.player.hp=1;g.endTurn();g.resolveEnemyTurn();A.equal(g.state.screen,'defeat');A.equal(g.state.journey.hehuan.flags.killedPatrol,undefined);A.equal(g.state.journey.hehuan.flags.messengerAvailable,undefined);
});
test('bribe leaves Qin Heng behind, disables unsupported ledger choices and permits a truthful exit',()=>{
 const g=run();at(g,7);g.chooseEvent(2);g.leaveEvent();at(g,35);g.chooseEvent(3);g.leaveEvent();at(g,57);A.equal(g.state.event.choices.slice(0,4).every(x=>x.disabled),true);A.equal(g.state.journey.hehuan.flags.rescuedQinHeng,undefined);const before=JSON.stringify(g.state);A.equal(g.chooseEvent(0),false);A.equal(JSON.stringify(g.state),before);g.chooseEvent(4);g.leaveEvent();const ending=H.ending(g.state,true);A.match(ending.text.join(''),/没有|没能|仍/);A.equal(g.state.journey.hehuan.flags.ledgerDispositionMissed,true);
});
test('each ledger disposition has its own actual rewards, physical item consumption and relationship',()=>{
 for(const [index,flag,keeps]of [[0,'ledgerPublished',false],[1,'returnedLedger',false],[2,'ledgerLeverage',true],[3,'ledgerDestroyed',false]]){const g=run();g.state.journey.hehuan.stage=2;Object.assign(g.state.journey.hehuan.flags,{rescuedQinHeng:true,ledgerOriginal:true});g.state.player.questItems.push('hehuan_ledger_original');at(g,57);g.chooseEvent(index);A.equal(g.state.player.questItems.includes('hehuan_ledger_original'),keeps);A.equal(g.state.journey.hehuan.flags[flag],true);const snapshot=JSON.stringify(g.state);A.equal(g.chooseEvent(index),false);A.equal(JSON.stringify(g.state),snapshot);if(index===2)A.ok(g.state.player.deck.some(x=>x.id==='H12'));if(index===1)A.equal(g.state.journey.hehuan.flags.qinTrustLost,true);A.ok(H.ending(g.state,true).text.join('').length>20);}
});
test('all four P2 identity replies reflect true events without adding hostility or changing payment',()=>{
 for(const boss of ['gate_boss','camp_boss','snake','bell_boss']){const g=run();g.state.journey.hehuan.stage=3;at(g,4,'event','faction_'+boss+'_source');A.match(g.state.event.story.join(''),/晏绮罗/);g.chooseEvent(2);g.leaveEvent();at(g,8,'event','faction_'+boss+'_cave');g.chooseEvent(0);A.equal(g.state.screen,'event');A.ok(!g.state.player.path.fallen);}
});
test('new runs clear the personal facts and never give another character hehuan objects or a false fall',()=>{
 const g=run();g.state.journey.hehuan.flags.rescuedQinHeng=true;g.state.player.questItems.push('hehuan_ledger_original');g.newRun('sword');A.equal(g.state.journey.hehuan,undefined);A.equal(g.state.player.hp,60);A.equal(g.state.player.path.fallen,false);g.newRun('hehuan');A.deepEqual(g.state.journey.hehuan.flags,{});A.equal(g.state.player.hp,56);A.equal(g.state.player.questItems.length,0);
});
