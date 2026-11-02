/* Fixed 80HP / 14-card mid-build fixtures, not natural runs. Oracle previews score cards.
   Same fixtures/seeds on both versions. No edits during combat. */
const fs=require('fs'),path=require('path');
const base=process.argv[2]||__dirname,out=process.argv[3]||'/workspace/difficulty-evidence/arena.json',N=require(path.resolve(base,'engine.js'));
const random=seed=>()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296;};
const decks={mark:['C01','C02','C03','C04','C05','C06','C07','C08','C09','C10','C17','C18','C19','C24'],sword:['S01','S02','S03','S04','S05','S06','S07','S08','S09','S10','S12','S14','S15','S16'],hehuan:['H01','H02','H03','H04','H05','H07','H08','H09','H10','H11','H12','H14','H16','H18'],mechanist:['J01','J02','J03','J05','J06','J07','J08','J11','J15','J17','J20','J25','J27','J35'],sovereign:['F01','F02','F03','F04','F05','F06','F07','F08','F09','F10','F11','F12','F03','F07']};
const rows=[];
for(const role of Object.keys(decks))for(const [floor,id]of [[10,'gate_boss'],[30,'snake'],[50,'furnace_boss'],[70,'abyss_boss']])for(let seed=1;seed<=3;seed++){
 const g=N.createGame({rng:random(seed),profile:{unlocks:['feiye']},environment:false,tales:false,bossQuests:false,factions:false});g.newRun(role);const s=g.state;for(const id of ['hehuan','mechanist'])if(s.journey[id])s.journey[id].stage=3;s.player.hp=s.player.maxHp=80;s.player.level=6;s.player.deck=decks[role].map((id,i)=>({id,uid:'fixture'+i}));s.player.relics.push('moon','jade');s.floor=floor;s.journey.regionIndex=Math.floor((floor-1)/10);s.screen='map';const n=s.map[floor-1][0];n.revealed=true;n.type='boss';n.encounter={enemyId:id};delete n.storyId;s.availableNodes=[n.id];g.enterNode(n.id);const hp=s.battle.enemy.hp;let steps=0;
 while(s.screen==='battle'&&s.battle.turn<=60&&steps++<1500){const b=s.battle;
  if(role==='mechanist'&&b.squad.roster.mingdi.place==='reserve'&&b.energy>0&&b.squad.slots.filter(Boolean).length<2&&g.squadAction('deploy','mingdi'))continue;
  let best=null;const incoming=g.getIntent().hits.reduce((a,x)=>a+x,0);
  for(const c of b.hand){let opts=[null];if(c.id.startsWith('J')){const o=g.getSquadCardOptions(c.uid);if(!o.available)continue;opts=o.choices;}
   for(const o of opts){let p;try{p=g.previewCard(c.uid,o);}catch{continue;}if(!p.available)continue;const damage=b.enemy.hp-p.enemyHpAfter,heal=p.playerHpAfter-s.player.hp;const after=p.resources?.after||{},shield=Math.max(0,p.blockGained||0);const score=damage*1.4+heal+(p.drawCount||0)*2+Math.min(incoming,shield)*1.1+(N.CARDS[c.id].cost===0?2:0)+(p.enemyHpAfter<=0?1000:0)+(p.playerHpAfter<=0?-10000:0)+(['C03','C10','S03','F03','J05','J17'].includes(c.id)?8:0);if(!best||score>best.score)best={c,o,score};}
  }
  if(best&&best.score>=0&&g.playCard(best.c.uid,true,best.o))continue;
  g.endTurn();g.resolveEnemyTurn();
 }
 rows.push({role,seed,floor,id,enemyHp:hp,won:!['defeat','battle'].includes(s.screen),screen:s.screen,turns:s.battle.turn,hp:s.player.hp,steps});
}
fs.writeFileSync(out,JSON.stringify({method:'Fixed 80HP, level6,14-card decks,moon+jade relics,3 seeds; oracle immediate-card policy (no hehuan traps), mechanist deploys mingdi. No medicine, no resources edited during combat. A/B pressure isolation, not natural player victory rates.',rows},null,2));console.log(out,rows.length,rows.filter(x=>x.won).length);
