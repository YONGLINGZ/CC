/* Seven-region hidden-route probe: public actions only, fixed attempts and no state fixtures. */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {playRun}=require('./playtest.cjs');
const runs=[];
for(const starter of ['mark','sword'])for(let seed=1000;seed<1012;seed++)runs.push(playRun(seed,starter,0,{hiddenChallenge:true,demonicPath:seed%2?'learn':'refuse',rescueStranger:seed%3!==0}));
const report={
  method:'Public API only; 24 active-environment 70-step attempts deliberately seek the three clue nodes and select their clue options when legal, then challenge the optional boss if available. No resource, pile, price, damage or profile edits. Not a human balance test.',
  completed:runs.length,wins:runs.filter(x=>x.result==='victory').length,
  defeats:runs.filter(x=>x.result==='defeat').length,
  unlocks:runs.filter(x=>x.profile.unlocks.includes('feiye')).length,hidden_challenges:runs.filter(x=>x.hiddenBossStarted).length,hidden_wins:runs.filter(x=>x.hiddenWin).length,details:runs
};
fs.writeFileSync(process.env.HIDDEN_PLAYTEST_REPORT||path.join(__dirname,'v11-hidden-playtest-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({completed:report.completed,wins:report.wins,defeats:report.defeats,unlocks:report.unlocks},null,2));
