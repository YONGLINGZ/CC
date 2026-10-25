'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const N=require('./engine.js'),root=path.resolve(__dirname,'..');
test('all registered event exports have matching identities, current inputs and distinct boss chain folders',()=>{
 cp.execFileSync(process.execPath,['dev/export-events-md.cjs'],{cwd:root,stdio:'pipe'});
 const report=JSON.parse(fs.readFileSync(path.join(__dirname,'event-review-results.json')));
 assert.equal(report.count,N.EVENT_IDS.length);assert.equal(report.allIdentitiesMatched,true);
 assert.deepEqual(report.events.map(e=>e.id).sort(),N.EVENT_IDS.slice().sort());
 for(const [file,digest] of Object.entries(report.inputs))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex'),digest);
 let actual=0;for(const e of report.events){const snapshots=JSON.parse(fs.readFileSync(path.join(root,'recovery/events-md-export',e.file.replace(/\.md$/,'.snapshots.json'))));assert.equal(snapshots.length,e.snapshots);for(const x of snapshots)assert.equal(x.event.id,e.id);actual+=snapshots.length;}
 assert.equal(report.snapshots,actual);assert.ok(actual>1600);
 const get=id=>report.events.find(e=>e.id===id);
 for(const id of ['blood_debt','blood_choice','campfire_hunt','road_aftermath'])assert.ok(get(id).identityMatched);
 assert.notEqual(path.dirname(get('boss_snake_1').file),path.dirname(get('boss_snake_ascended_1').file));
 assert.notEqual(path.dirname(get('boss_feiye_1').file),path.dirname(get('boss_feiye_echo_1').file));
 assert.equal(path.dirname(get('boss_lotus_awake').file),path.dirname(get('boss_lotus_boss_1').file));
});
test('the automatic-hostility snapshots agree with actual engine transitions, including spent/invalid and dual credentials',()=>{
 const report=JSON.parse(fs.readFileSync(path.join(__dirname,'event-review-results.json')));
 for(const [boss,group]of Object.entries(N.ENEMY_FACTIONS.GROUPS)){
  const id='faction_'+boss+'_cave',entry=report.events.find(e=>e.id===id),rows=JSON.parse(fs.readFileSync(path.join(root,'recovery/events-md-export',entry.file.replace(/\.md$/,'.snapshots.json'))));
  for(const label of ['support','both','spent','invalid','hostility']){
   const g=N.createGame({rng:()=>.43,environment:false});g.newRun('sword');g.enterRegion();const s=g.state,n=s.map[0][0];n.type='event';n.storyId=id;s.availableNodes=[n.id];
   s.journey.factions={records:{},invalid:{},spent:{},behaviors:[],forfeited:{},seen:{}};
   if(label!=='hostility')s.player.questItems.push(group.support);
   if(label==='both')s.player.questItems.push(group.oppose);
   if(label==='spent')s.journey.factions.spent[group.support]=true;
   if(label==='invalid')s.journey.factions.invalid[group.support]=true;
   if(label==='hostility')s.journey.factions.behaviors.push({npc:group.npc,kind:'attacked'});
   assert.equal(g.enterNode(n.id),true);assert.equal(g.chooseEvent(0),true);
   const fixture=rows.find(r=>r.role==='sword'&&r.label===label);
   assert.equal(s.screen==='battle',!!fixture.event.transition,boss+' '+label);
   if(s.screen==='battle'){assert.equal(s.battle.enemy.id,fixture.event.transition.enemyId);assert.equal(s.battle.phase,'player');}
  }
 }
});
