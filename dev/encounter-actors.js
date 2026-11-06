/* Enemy, BOSS and machine animation routing; no rule or persistence access. */
(function(root){'use strict';
const rows={idle:0,attack:1,skill:2,hurt:3};
const warmed=new Map();
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;');
function descriptor(raw){return raw?{columns:4,rows:4,...(typeof raw==='string'?{src:raw}:raw)}:null;}
function readyBoss(id){
 const d=descriptor(root.NightAssets?.bossActors?.[id]);if(!d?.src||typeof Image==='undefined')return Promise.resolve(false);
 // A preload may finish after a fast encounter switch. Only analyse the atlas
 // while that enemy is still represented in the current document.
 if(root.NightSpriteMotion)return root.NightSpriteMotion.warm(d,0,()=>typeof document!=='undefined'&&!!document.querySelector(`.encounter-sprite[data-encounter-type="enemy"][data-encounter-id="${esc(id)}"]`));
 if(!warmed.has(d.src)){const image=new Image(),entry={status:'pending'};image.src=d.src;entry.promise=image.decode().then(()=>{entry.status='ready';return true},()=>{entry.status='failed';return false});warmed.set(d.src,entry);}return warmed.get(d.src).promise;
}
const attacks=new Set(['attack','slash','thrust','flurry','finisher','counter','leap']);
function action(name){return name==='idle'?'idle':name==='hurt'||name==='fall'?'hurt':attacks.has(name)?'attack':'skill';}
function source(id,type='enemy'){return descriptor(root.NightAssets?.[type==='machine'?'machineActors':'enemyActors']?.[id]);}
function markup(id,type='enemy'){
 if(type==='enemy')readyBoss(id);
 const d=source(id,type),group=type==='machine'?'machineActors':'enemyActors';
 return d?.src?`<span class="encounter-sprite" data-encounter-id="${esc(id)}" data-encounter-type="${esc(type)}" data-frame-action="idle" data-sprite-group="${group}" data-sprite-key="${esc(id)}" style="--sprite-columns:${d.columns||4};--sprite-rows:${d.rows||4};background-size:${(d.columns||4)*100}% ${(d.rows||4)*100}%;background-image:url('${esc(d.src)}')" aria-hidden="true"></span>`:'';
}
function stop(el){if(!el)return;clearTimeout(el._frameTimer);el._frameAnimation?.cancel();el._frameAnimation=null;root.NightSpriteMotion?.idle(el);delete el.dataset.acting;delete el.dataset.bossMove;const d=source(el.dataset.encounterId,el.dataset.encounterType);if(d?.src)el.style.backgroundImage=`url('${d.src}')`;el.dataset.frameAction='idle';el.style.backgroundPosition='0% 0%';}
function stopAll(){if(typeof document!=='undefined')document.querySelectorAll('.encounter-sprite').forEach(stop);}
function play(actor,name,mode='full',phase='impact'){
 const el=actor?.querySelector('.encounter-sprite');if(!el)return false;
 clearTimeout(el._frameTimer);el._frameAnimation?.cancel();actor.dataset.stagePose=name;
 if(mode==='off'||mode==='reduced'||(typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches)||actor.dataset.machineStage==='broken'){stop(el);return true;}
 const a=action(name),boss=a!=='hurt'&&root.NightBossMoves?.get(el.dataset.encounterId,actor.dataset.bossIntent),special=boss&&descriptor(root.NightAssets?.bossActors?.[el.dataset.encounterId]);
 const d=special||source(el.dataset.encounterId,el.dataset.encounterType)||{columns:4,rows:4},row=special?boss.row:rows[a];
 const duration=phase==='prepare'?180:a==='hurt'?350:special?350:480;
 if(special){el.dataset.bossMove=boss.name;el.style.backgroundImage=`url('${d.src}')`;}else delete el.dataset.bossMove;
 el.dataset.acting='true';el.dataset.frameAction=a;
 const finish=()=>{delete el.dataset.acting;delete el.dataset.bossMove;el.dataset.frameAction='idle';};
 // Keep the present figure during decoding; a boss uses its named gesture as
 // soon as that exact atlas is ready, never a permanently cached generic attack.
 if(d.src&&root.NightSpriteMotion?.play(el,d,{row,action:a,phase:special?phase:'full',mode,duration,onfinish:finish}))return true;
 const columns=d.columns||4,rowCount=d.rows||4,position=i=>`${i*100/Math.max(1,columns-1)}% ${row*100/Math.max(1,rowCount-1)}%`;
 el.style.backgroundPosition=position(0);
 if(mode==='fast'){el.style.backgroundPosition=position(Math.min(columns-1,Math.ceil(columns/2)));el._frameTimer=setTimeout(()=>stop(el),90);return true;}
 if(!el.animate){stop(el);return true;}
 const range=special&&phase==='prepare'?[0,Math.max(1,Math.floor((columns-1)/3))]:special&&phase==='impact'?[Math.max(1,Math.floor((columns-1)/3)),columns-1]:[0,columns-1];
 const frames=Array.from({length:range[1]-range[0]+1},(_,i)=>range[0]+i),keys=frames.map((i,k)=>({backgroundPosition:position(i),offset:k/frames.length,easing:'steps(1,end)'}));keys.push({backgroundPosition:position(frames.at(-1)),offset:1});
 el._frameAnimation=el.animate(keys,{duration,fill:'forwards'});el._frameAnimation.onfinish=()=>{if(el.isConnected){if(phase==='prepare')el._frameTimer=setTimeout(()=>stop(el),650);else stop(el);}};return true;
}
const api={rows,action,source,markup,play,stopAll,readyBoss};if(typeof module!=='undefined')module.exports=api;root.NightEncounterActors=api;
})(typeof globalThis!=='undefined'?globalThis:this);
