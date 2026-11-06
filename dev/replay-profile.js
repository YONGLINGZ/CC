/* Permanent discoveries, bounded run records and portable deterministic saves. */
(function(root){
  'use strict';
  const VERSION=2, MAX_RECORDS=60;
  const INITIAL_WEAPONS=new Set(['training','cat_claws','silk_fan','work_spool','moon_seal']);
  const NO_ECHO_RELICS=new Set(['bell','frostseal','veil','heartmirror','concentric_spool','fox','ninelives']);
  const ROLES=['assassin','sword','hehuan','mechanist','sovereign'];
  const own=(o,k)=>Object.prototype.hasOwnProperty.call(o||{},k);
  const plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v)&&(Object.getPrototypeOf(v)===Object.prototype||Object.getPrototypeOf(v)===null);
  const clone=v=>JSON.parse(JSON.stringify(v));
  const integer=(v,min=0,max=1000000)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
  const id=v=>typeof v==='string'&&/^[a-zA-Z0-9_:.\-]{1,120}$/.test(v);
  function dictionary(catalog,kind){return catalog?.[kind==='weapon'?'WEAPONS':kind==='relic'?'RELICS':'OUTFITS']||{};}
  function ids(value,defs){return [...new Set((Array.isArray(value)?value:[]).filter(v=>typeof v==='string'&&own(defs,v)))];}
  function normalize(value,catalog={}){
    const v=plain(value)?value:{}, old=plain(v.collections)?v.collections:{};
    const p={version:VERSION,unlocks:Array.isArray(v.unlocks)&&v.unlocks.includes('feiye')?['feiye']:[],collections:{
      weapons:ids(old.weapons,catalog.WEAPONS),relics:ids(old.relics,catalog.RELICS),cosmetics:ids(old.cosmetics,catalog.OUTFITS)
    },cooldowns:{},runSerial:integer(v.runSerial)?v.runSerial:0,records:[],readStories:[],mastery:{}};
    if(plain(v.cooldowns))for(const [key,run] of Object.entries(v.cooldowns)){
      const [kind,item]=key.split(':');
      if(['weapon','relic'].includes(kind)&&own(dictionary(catalog,kind),item)&&integer(run,1)&&run<=p.runSerial)p.cooldowns[key]=run;
    }
    if(Array.isArray(v.records))for(const r of v.records.slice(-MAX_RECORDS)){
      if(!plain(r)||!integer(r.id,1)||!ROLES.includes(r.character)||!['short','long'].includes(r.mode)||typeof r.seed!=='string')continue;
      p.records.push({id:r.id,character:r.character,mode:r.mode,seed:r.seed.slice(0,80),challenge:integer(r.challenge,0,3)?r.challenge:0,
        oath:id(r.oath)?r.oath:null,won:r.won===true,floor:integer(r.floor,1,71)?r.floor:1,battles:integer(r.battles)?r.battles:0,
        cardsPlayed:integer(r.cardsPlayed)?r.cardsPlayed:0,maxHit:integer(r.maxHit)?r.maxHit:0,finale:r.finale==='abyss'?'abyss':'fate',
        echo:plain(r.echo)&&['weapon','relic'].includes(r.echo.kind)&&own(dictionary(catalog,r.echo.kind),r.echo.id)?{kind:r.echo.kind,id:r.echo.id}:null,
        newCollections:Array.isArray(r.newCollections)?r.newCollections.filter(e=>plain(e)&&['weapon','relic','cosmetic'].includes(e.kind)&&own(dictionary(catalog,e.kind),e.id)).map(e=>({kind:e.kind,id:e.id})):[],
        endedAt:typeof r.endedAt==='string'?r.endedAt.slice(0,40):'',starter:id(r.starter)?r.starter:null});
      p.runSerial=Math.max(p.runSerial,r.id);
    }
    p.readStories=[...new Set((Array.isArray(v.readStories)?v.readStories:[]).filter(id))].slice(-1024);
    if(plain(v.mastery))for(const role of ROLES)if(integer(v.mastery[role]))p.mastery[role]=v.mastery[role];
    return p;
  }
  function valid(value,catalog={}){
    if(!plain(value)||![1,2].includes(value.version)||!Array.isArray(value.unlocks)||value.unlocks.some(v=>v!=='feiye'))return false;
    if(value.version===1)return true;
    if(!plain(value.collections)||!plain(value.cooldowns)||!integer(value.runSerial)||!Array.isArray(value.records)||value.records.length>MAX_RECORDS||!Array.isArray(value.readStories)||!plain(value.mastery))return false;
    for(const [key,defs] of [['weapons',catalog.WEAPONS],['relics',catalog.RELICS],['cosmetics',catalog.OUTFITS]]){
      if(!Array.isArray(value.collections[key])||value.collections[key].some(v=>!own(defs,v)))return false;
    }
    if(value.readStories.length>1024||value.readStories.some(v=>!id(v)))return false;
    if(value.records.some(r=>!plain(r)||!integer(r.id,1,value.runSerial)||!ROLES.includes(r.character)||!['short','long'].includes(r.mode)||typeof r.seed!=='string'||r.seed.length>80||!integer(r.challenge,0,3)||typeof r.won!=='boolean'||!integer(r.floor,1,71)||!integer(r.battles)||!integer(r.cardsPlayed)||!integer(r.maxHit)))return false;
    for(const [key,n] of Object.entries(value.cooldowns)){const [kind,item,...rest]=key.split(':');if(rest.length||!['weapon','relic'].includes(kind)||!own(dictionary(catalog,kind),item)||!integer(n,1,value.runSerial))return false;}
    if(Object.entries(value.mastery).some(([role,n])=>!ROLES.includes(role)||!integer(n)))return false;
    return safeTree(value);
  }
  function echoStatus(profile,selection,role,catalog={}){
    if(!selection)return {available:true,reason:'不携带回响，旅途中仍可发现宝物。'};
    const {kind,id:item}=selection,def=dictionary(catalog,kind)[item];
    if(!['weapon','relic'].includes(kind)||!def)return {available:false,reason:'未识别的宝物。'};
    if(!(profile.collections?.[kind==='weapon'?'weapons':'relics']||[]).includes(item))return {available:false,reason:'先在旅途中获得此物，才能留下回响。'};
    if((kind==='weapon'&&INITIAL_WEAPONS.has(item))||(kind==='relic'&&NO_ECHO_RELICS.has(item)))return {available:false,reason:'随身初始物与续命任务信物不提供回响。'};
    if(kind==='weapon'&&def.characters&&!def.characters.includes(role))return {available:false,reason:'这件兵器不适合当前角色。'};
    if(profile.cooldowns?.[kind+':'+item])return {available:false,reason:'温养中：换一件或空手出发，走过首境后恢复。'};
    return {available:true,reason:'可带入：前三场胜利后归藏；本局获得的真品不受此限制。'};
  }
  function begin(profile,config,catalog,role){
    profile.runSerial++;
    const selected=echoStatus(profile,config.echo,role,catalog).available?config.echo:null;
    return {...clone(config),enabled:true,id:profile.runSerial,echo:selected?{kind:selected.kind,id:selected.id,remaining:3,claimed:false,acquired:false}:null,newCollections:[],settled:false,recharged:false};
  }
  function commitEcho(profile,run){
    if(!run?.enabled||!run.echo||run.echo.claimed)return false;
    run.echo.claimed=true;profile.cooldowns[run.echo.kind+':'+run.echo.id]=run.id;return true;
  }
  function observe(profile,state,catalog={}){
    if(profile.version!==VERSION||!state?.replay?.enabled)return false;
    let changed=false;const run=state.replay,p=state.player;
    for(const [kind,key,values] of [['weapon','weapons',p.weaponInventory],['relic','relics',p.relics],['cosmetic','cosmetics',p.outfitInventory]]){
      for(const item of ids(values,dictionary(catalog,kind))){
        if(run.echo?.kind===kind&&run.echo.id===item&&!run.echo.acquired)continue;
        if(!profile.collections[key].includes(item)){profile.collections[key].push(item);run.newCollections.push({kind,id:item});changed=true;}
      }
    }
    const story=state.event?.id;
    if(id(story)&&state.event?.resolved&&!profile.readStories.includes(story)){profile.readStories.push(story);profile.readStories=profile.readStories.slice(-1024);changed=true;}
    return changed;
  }
  function milestone(profile,run){
    if(profile.version!==VERSION||!run?.enabled||run.recharged)return false;
    run.recharged=true;let changed=false;
    for(const [key,usedRun] of Object.entries(profile.cooldowns))if(usedRun<run.id){delete profile.cooldowns[key];changed=true;}
    return changed;
  }
  function finish(profile,state){
    const run=state?.replay;
    if(profile.version!==VERSION||!run?.enabled||run.settled||!['victory','defeat'].includes(state.screen))return false;
    run.settled=true;
    if(profile.records.some(r=>r.id===run.id))return false;
    const won=state.screen==='victory'&&state.result?.won===true;
    profile.records.push({id:run.id,character:state.character,starter:state.starter,mode:run.mode,seed:run.seed,challenge:run.challenge,oath:run.oath||null,won,
      floor:state.floor,battles:state.stats.battles,cardsPlayed:state.stats.cardsPlayed,maxHit:state.stats.maxHit,finale:run.finale||'fate',
      echo:run.echo?{kind:run.echo.kind,id:run.echo.id}:null,newCollections:clone(run.newCollections),endedAt:new Date().toISOString()});
    profile.records=profile.records.slice(-MAX_RECORDS);
    if(won)profile.mastery[state.character]=(profile.mastery[state.character]||0)+1;
    return true;
  }
  function prng(seed){
    // FNV-1a seed hash + Mulberry32. The integer cursor is the entire RNG state.
    let cursor=2166136261;
    for(const ch of String(seed))cursor=Math.imul(cursor^ch.charCodeAt(0),16777619)>>>0;
    const random=()=>{cursor=(cursor+0x6D2B79F5)>>>0;let t=cursor;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
    random.state=()=>cursor;
    random.restore=value=>{if(!integer(value,0,4294967295))return false;cursor=value>>>0;return true;};
    return random;
  }
  function safeTree(value){
    let count=0;
    function visit(v,depth){
      if(++count>160000||depth>45)return false;
      if(v===null||typeof v==='boolean')return true;
      if(typeof v==='number')return Number.isFinite(v)&&Math.abs(v)<1e12;
      if(typeof v==='string')return v.length<=40000;
      if(Array.isArray(v))return v.length<=10000&&v.every(x=>visit(x,depth+1));
      if(!plain(v))return false;
      return Object.entries(v).every(([k,x])=>!['__proto__','prototype','constructor'].includes(k)&&visit(x,depth+1));
    }
    return visit(value,0);
  }
  function validateRun(value,catalog={}){
    try{
      if(!plain(value)||value.version!==VERSION||value.engine!=='review12'||!safeTree(value))return false;
      if(!integer(value.serial)||!integer(value.eventSerial)||!integer(value.rngState,0,4294967295)||typeof value.seed!=='string'||value.seed.length>80)return false;
      const s=value.state,p=s?.player,r=s?.replay,b=s?.battle;
      if(!plain(s)||!plain(p)||!plain(r)||!r.enabled||!integer(r.id,1)||!['short','long'].includes(r.mode)||r.seed!==value.seed||!integer(r.challenge,0,3))return false;
      if(!['arrival','map','battle','reward','relic','shop','rest','fox','event','cave','threshold','victory','defeat'].includes(s.screen))return false;
      if(!ROLES.includes(s.character)||!own(catalog.STARTERS,s.starter)||!integer(s.totalFloors,30,70)||s.totalFloors!==(r.mode==='short'?30:70)||!integer(s.floor,1,s.totalFloors+1))return false;
      if(!Array.isArray(s.regions)||s.regions.length!==s.totalFloors/10||!Array.isArray(s.map)||s.map.length!==s.totalFloors)return false;
      const allNodes=s.map.flat();
      if(s.map.some((row,i)=>!Array.isArray(row)||!row.length||row.length>8||row.some(n=>n.floor!==i+1))||allNodes.some(n=>!plain(n)||!id(n.id)||!integer(n.floor,1,s.totalFloors)||!Array.isArray(n.next)))return false;
      const nodeIds=new Set(allNodes.map(n=>n.id));
      if(nodeIds.size!==allNodes.length||allNodes.some(n=>n.next.some(v=>!nodeIds.has(v))))return false;
      if(value.activeNodeId!==null&&!nodeIds.has(value.activeNodeId))return false;
      if(!Array.isArray(s.availableNodes)||s.availableNodes.some(v=>!nodeIds.has(v))||!Array.isArray(s.history)||!Array.isArray(s.seenEvents)||!plain(s.journey)||!plain(s.stats))return false;
      if(!integer(p.maxHp,1,10000)||!integer(p.hp,0,p.maxHp)||!integer(p.gold)||!integer(p.level,1,100)||!plain(p.path)||!plain(p.affliction)||!Array.isArray(p.questItems))return false;
      for(const [list,defs] of [[p.weaponInventory,catalog.WEAPONS],[p.relics,catalog.RELICS],[p.outfitInventory,catalog.OUTFITS]])if(!Array.isArray(list)||list.some(v=>!own(defs,v)))return false;
      if(!own(catalog.WEAPONS,p.equippedWeapon)||!p.weaponInventory.includes(p.equippedWeapon)||(p.equippedOutfit!==null&&!p.outfitInventory.includes(p.equippedOutfit)))return false;
      const cardValid=c=>plain(c)&&own(catalog.CARDS,c.id)&&typeof c.uid==='string'&&c.uid.length<80;
      if(!Array.isArray(p.deck)||p.deck.length>300||p.deck.some(c=>!cardValid(c)))return false;
      if(new Set(p.deck.map(c=>c.uid)).size!==p.deck.length)return false;
      if(r.echo&&(!plain(r.echo)||!['weapon','relic'].includes(r.echo.kind)||!own(dictionary(catalog,r.echo.kind),r.echo.id)||!integer(r.echo.remaining,0,3)))return false;
      if(!Array.isArray(r.newCollections)||typeof r.settled!=='boolean'||typeof r.recharged!=='boolean')return false;
      if(s.screen==='battle'&&(!b||!['player','enemy'].includes(b.phase)))return false;
      if(b){
        if(!plain(b)||!plain(b.enemy)||!own(catalog.ENEMIES,b.enemy.id)||!integer(b.enemy.maxHp,1,100000)||!integer(b.enemy.hp,0,b.enemy.maxHp))return false;
        for(const k of ['hand','draw','discard','exhaust'])if(!Array.isArray(b[k])||b[k].length>500||b[k].some(c=>!cardValid(c)))return false;
        if(!Array.isArray(b.events)||!Array.isArray(b.logs)||!integer(b.turn,1,10000)||!integer(b.energy,0,10000))return false;
      }
      const cards=[...p.deck,...(b?[...b.hand,...b.draw,...b.discard,...b.exhaust]:[])];
      if(cards.some(c=>/^card-\d+$/.test(c.uid)&&Number(c.uid.slice(5))>value.serial))return false;
      const required={reward:'reward',relic:'reward',shop:'shop',event:'event',cave:'cave'}[s.screen];
      if(required&&!plain(s[required]))return false;
      return true;
    }catch(_){return false;}
  }
  const api={VERSION,MAX_RECORDS,normalize,valid,echoStatus,begin,commitEcho,observe,milestone,finish,prng,validateRun,safeTree};
  root.NightReplayProfile=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis==='object'?globalThis:window);
