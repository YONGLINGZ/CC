/* Small offline expedition rules: inventory, fixed cave discoveries and shop supplies. */
(function(root){
  'use strict';
  const ITEMS={
    herb:{name:'回春草',text:'恢复 6 点生命。不会解除毒素。',icon:'herb',rarity:'common',price:9,heal:6},
    dewherb:{name:'凝露叶',text:'恢复 12 点生命。不会解除毒素。',icon:'herb',rarity:'common',price:16,heal:12},
    healing_pill:{name:'回气丹',text:'恢复 24 点生命。不会解除毒素。',icon:'pill',rarity:'uncommon',price:28,heal:24},
    fullheal_pill:{name:'九转还元丹',text:'将生命完全恢复至当前上限。不会解除毒素。',icon:'fullheal',rarity:'rare',price:55,fullHeal:true},
    antidote:{name:'百草解厄丹',text:'清除全部战斗毒素，并彻底根除缠脉毒；不恢复生命。',icon:'antidote',rarity:'rare',price:42,cure:true},
    battle_pill:{name:'虎魄丹',text:'本场战斗每张攻击牌的第一段伤害 +2，最多 +4；战斗外服用则在下一场生效。',icon:'strength',rarity:'uncommon',price:32,power:2},
    spirit_pill:{name:'聚灵丹',text:'立即获得 2 点灵力。只能在自己的战斗回合使用。',icon:'pill',rarity:'uncommon',price:20,energy:2}
  };
  const OUTSIDE_SCREENS=['arrival','map','rest','shop','fox','event','cave','threshold'];
  function create(hooks){
    const getState=hooks.getState;
    const random=()=>Math.max(0,Math.min(.999999999999,Number((hooks.rng||Math.random)())||0));
    const pick=values=>values[Math.floor(random()*values.length)];
    const emit=()=>hooks.emit?.();
    const note=message=>hooks.note?.(message);
    const event=(type,fields)=>hooks.event?.(type,fields);
    const log=message=>hooks.log?.(message);
    function resetRun(){const s=getState();s.player.inventory={herb:2};s.player.pendingPillPower=0;s.cave=null;}
    function grantItem(id,amount=1){
      if(!ITEMS[id]||!Number.isSafeInteger(amount)||amount<1)return false;
      const p=getState().player;p.inventory=p.inventory||{};p.inventory[id]=(p.inventory[id]||0)+amount;return true;
    }
    function getItemUse(id){
      const s=getState(),p=s.player,b=s.battle,item=ITEMS[id];
      const no=reason=>({usable:false,reason});
      if(!item||!(p.inventory?.[id]>0))return no('包裹中没有此物');
      if(p.hp<=0||s.screen==='defeat'||s.screen==='victory'||s.screen==='title')return no('此时无法服用');
      const battle=s.screen==='battle';
      if(battle&&(!b||b.phase!=='player'||b.enemy.hp<=0))return no('等待自己的回合');
      if(!battle&&!OUTSIDE_SCREENS.includes(s.screen))return no('完成当前结算后再服用');
      if(battle&&b.itemUsedTurn===b.turn)return no('本回合已服用一件药物');
      if((item.heal||item.fullHeal)&&p.hp>=p.maxHp)return no('生命已满');
      if(item.cure&&!(p.affliction?.active||(battle&&b.poison>0)))return no('当前没有需要清除的毒素');
      if(item.energy&&!battle)return no('只能在自己的战斗回合服用');
      if(item.power&&(battle?(b.pillPower||0):(p.pendingPillPower||0))>=4)return no('药力已达上限');
      return {usable:true,reason:battle?'不消耗灵力；每回合限服用一件':'服用后消耗一件'};
    }
    function getInventory(){
      const inventory=getState().player.inventory||{};
      return Object.keys(ITEMS).filter(id=>inventory[id]>0).map(id=>({id,...ITEMS[id],count:inventory[id],...getItemUse(id)}));
    }
    function useItem(id){
      const availability=getItemUse(id);if(!availability.usable)return false;
      const s=getState(),p=s.player,b=s.screen==='battle'?s.battle:null,item=ITEMS[id];
      if(b)hooks.beginEvents?.();
      // Consume and lock before effects: reentrant renders cannot spend this dose twice.
      p.inventory[id]--;if(!p.inventory[id])delete p.inventory[id];
      if(b)b.itemUsedTurn=b.turn;
      let result='';
      if(item.heal||item.fullHeal){const amount=hooks.heal(item.fullHeal?p.maxHp:item.heal,item.name);result=`恢复 ${amount} 点生命`;}
      if(item.cure){
        const poison=b?.poison||0;
        if(b){b.poison=0;if(poison)event('poison',{target:'player',amount:-poison,total:0});}
        if(p.affliction?.active){
          if(hooks.cureAffliction)hooks.cureAffliction();
          else {p.affliction.active=false;p.affliction.revealed=true;p.affliction.suppressed=0;}
        }
        result='毒素已清，经脉恢复平静';
      }
      if(item.power){
        if(b)b.pillPower=Math.min(4,(b.pillPower||0)+item.power);
        else p.pendingPillPower=Math.min(4,(p.pendingPillPower||0)+item.power);
        result=b?`本场攻击牌首段增伤 ${b.pillPower}`:`下一场攻击牌首段增伤 ${p.pendingPillPower}`;
      }
      if(item.energy){b.energy+=item.energy;result=`获得 ${item.energy} 点灵力`;event('energy',{target:'player',amount:item.energy,total:b.energy});}
      log(`${item.name}：${result}。`);
      if(b)event('item',{target:'player',itemId:id,name:item.name,text:result});
      note(`服下${item.name}，${result}。`);emit();return true;
    }
    function makeShopStock(){
      const first=pick(['herb','dewherb','healing_pill']);
      const second=pick(['fullheal_pill','antidote','battle_pill','spirit_pill']);
      return [first,second].map(id=>({id,price:ITEMS[id].price,bought:false}));
    }
    function buyItem(index){
      const s=getState();if(s.screen!=='shop'||!Number.isInteger(index))return false;
      const entry=s.shop?.items?.[index];
      if(!entry||entry.bought||!ITEMS[entry.id]||s.player.gold<entry.price)return false;
      entry.bought=true;s.player.gold-=entry.price;grantItem(entry.id);
      note(`花费 ${entry.price} 金币，${ITEMS[entry.id].name}已收入包裹。`);emit();return true;
    }
    function rewardItem(id,amount=1){return {kind:'item',id,amount,name:ITEMS[id].name};}
    function rollCave(){
      const s=getState(),roll=random();
      if(roll<.28){
        const enemyId=pick(s.floor>=21?['bone','raider','yaksha']:s.floor>=11?['bone','ape','raider']:['paper','lantern','bone','ape']);
        return {kind:'enemy',enemyId,battleKind:enemyId==='yaksha'?'elite':'fight',title:'封石后的动静',text:'石门内传来兵刃刮过地面的声音。守在药匣旁的身影转向了你。',rewards:[rewardItem(pick(['healing_pill','battle_pill','antidote','spirit_pill']))]};
      }
      if(roll<.43)return {kind:'coins',title:'遗落的铜匣',text:'铜匣底铺着一层旧绒，散落的灵钱仍带着微光。',rewards:[{kind:'gold',amount:25+Math.floor(random()*21),name:'金币'}]};
      if(roll<.63)return {kind:'herbs',title:'石缝里的药香',text:'滴水润着一簇完好的灵草。你辨清药性，收进了包裹。',rewards:[rewardItem(pick(['herb','dewherb']),2+Math.floor(random()*2))]};
      if(roll<.85){const id=pick(['healing_pill','spirit_pill','battle_pill','antidote','fullheal_pill']);return {kind:'pills',title:ITEMS[id].rarity==='rare'?'封存的玉瓶':'未冷的丹炉',text:'炉旁的玉瓶封蜡未破，药香在瓶口凝成一线白雾。',rewards:[rewardItem(id)]};}
      const available=Object.keys(hooks.relics||{}).filter(id=>!['bell','fox','frostseal','veil'].includes(id)&&!s.player.relics.includes(id));
      if(available.length){const id=pick(available);return {kind:'treasure',title:'尘封秘藏',text:'重重封印自行散去。一件完整的灵物悬在石台上，仿佛等了很久。',rewards:[{kind:'relic',id,amount:1,name:hooks.relics[id].name}]};}
      return {kind:'treasure',title:'满匣流光',text:'封印后的石匣盛满灵钱。你将这份意外之财收好。',rewards:[{kind:'gold',amount:60,name:'金币'},rewardItem('fullheal_pill')]};
    }
    function enterCave(node){
      const s=getState();if(!node||node.type!=='cave'||s.player.hp<=0)return false;
      if(s.cave?.nodeId===node.id)return false;
      s.cave={nodeId:node.id,name:'未知洞府',description:'半掩的石门后，丹香与风声交错。这里可能留下灵草、丹药或秘藏，也可能有人守着它们。',status:'unexplored',explored:false,resolved:false,outcome:rollCave(),result:null};
      s.screen='cave';return true;
    }
    function deliver(cave){
      // Reserve the discovery before invoking reward hooks, so even reentrant
      // UI/profile callbacks cannot deliver the same sealed cache twice.
      if(cave.resolved)return cave.result;
      cave.resolved=true;cave.status='resolved';
      const rewards=[];
      for(const entry of cave.outcome.rewards){
        if(entry.kind==='item')grantItem(entry.id,entry.amount);
        if(entry.kind==='gold')getState().player.gold+=entry.amount;
        if(entry.kind==='relic'&&!hooks.addRelic(entry.id)){getState().player.gold+=40;rewards.push({kind:'gold',amount:40,name:'金币'});continue;}
        rewards.push({...entry});
      }
      const rare=rewards.some(r=>r.kind==='relic'||(r.kind==='item'&&ITEMS[r.id].rarity==='rare'));
      cave.result={title:cave.outcome.title,text:cave.outcome.text,rewards,rarity:rare?'rare':'common'};
      return cave.result;
    }
    function exploreCave(){
      const s=getState(),cave=s.cave;
      if(s.screen!=='cave'||!cave||cave.explored||cave.resolved||s.player.hp<=0)return false;
      cave.explored=true;
      if(cave.outcome.kind==='enemy'){
        cave.status='fighting';
        hooks.startBattle(cave.outcome.battleKind,{enemyId:cave.outcome.enemyId,caveId:cave.nodeId});
        if(s.battle)s.battle.caveNodeId=cave.nodeId;
        if(s.screen==='battle')note('石门内的守卫已经逼近。击败它，才能带走药匣。');
      }else{
        const result=deliver(cave);
        note(`${result.title}：${result.rewards.map(r=>`${r.name} ×${r.amount}`).join('、')}。`);
      }
      emit();return true;
    }
    function onBattleWin(battle){
      const s=getState(),cave=s.cave;
      if(!cave||cave.status!=='fighting'||cave.resolved||battle!==s.battle||battle.caveNodeId!==cave.nodeId||battle.enemy.hp>0||s.player.hp<=0||battle.phase!=='ended')return null;
      const result=deliver(cave);result.title='守卫身后的药匣';result.text='石门重归寂静。你打开药匣，将保存完好的丹药收入包裹。';
      log(result.rewards.map(r=>`洞府收获：${r.name} ×${r.amount}`).join('。'));
      return result;
    }
    function leaveCave(){
      const s=getState(),cave=s.cave;
      if(s.screen!=='cave'||!cave||!['unexplored','resolved'].includes(cave.status)||s.player.hp<=0)return false;
      cave.status='complete';hooks.advance();emit();return true;
    }
    return {resetRun,grantItem,getInventory,getItemUse,useItem,makeShopStock,buyItem,enterCave,exploreCave,onBattleWin,leaveCave};
  }
  const api={ITEMS,create};root.NightExpedition=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis==='object'?globalThis:window);
