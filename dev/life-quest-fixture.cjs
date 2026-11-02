// Explicit completed-quest fixture for legacy lethal-resolution tests only.
// Acquisition/order/uniqueness are tested through real actions in difficulty-lifequest.test.cjs.
module.exports=function earnedLifeFixture(s,id){
 s.journey.lifeQuest={stage:'claimed',wins:2,hard:1,startedRegion:0,startedFloor:2,temperRegion:1,temperFloor:12,bossWon:true,claimFloor:22,claimed:true,reward:id,spent:false,battles:['4:paper','10:gate_boss','20:camp_boss']};
 if(!s.player.relics.includes(id))s.player.relics.push(id);
};
