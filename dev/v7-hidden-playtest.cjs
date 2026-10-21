/* Public actions only: deliberately follow the three visible clue scenes. */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {playRun}=require('./playtest.cjs');
const runs=[];
for(const starter of ['mark','sword'])for(let seed=1000;seed<1012;seed++)runs.push(playRun(seed,starter,0,{hiddenChallenge:true}));
const report={
  method:'Public API only; 24 active-environment attempts deliberately choose the three clue nodes and their first legal options, then challenge the optional boss if available. No resource, pile, price, damage or profile edits. Not a human balance test.',
  completed:runs.length,wins:runs.filter(x=>x.result==='victory').length,
  defeats:runs.filter(x=>x.result==='defeat').length,
  unlocks:runs.filter(x=>x.profile.unlocks.includes('feiye')).length,details:runs
};
fs.writeFileSync(path.join(__dirname,'v7-hidden-playtest-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({completed:report.completed,wins:report.wins,defeats:report.defeats,unlocks:report.unlocks},null,2));
