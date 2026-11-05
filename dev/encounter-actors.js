/* Enemy and machine frame atlases: rendering only, no game state access. */
(function(root){'use strict';
const rows={idle:0,attack:1,skill:2,hurt:3};
const warmed=new Map();
function readyBoss(id){const src=root.NightAssets?.bossActors?.[id];if(!src||typeof Image==='undefined')return Promise.resolve(false);if(!warmed.has(src)){const image=new Image(),entry={status:'pending'};image.src=src;entry.promise=image.decode().then(()=>{entry.status='ready';return true},()=>{entry.status='failed';return false});warmed.set(src,entry);}return warmed.get(src).promise;}
const attacks=new Set(['attack','slash','thrust','flurry','finisher','counter','leap']);
function action(name){return name==='idle'?'idle':name==='hurt'||name==='fall'?'hurt':attacks.has(name)?'attack':'skill';}
function markup(id,type='enemy'){
 if(type==='enemy')readyBoss(id);
 const src=root.NightAssets?.[type==='machine'?'machineActors':'enemyActors']?.[id];
 return src?`<span class="encounter-sprite" data-encounter-id="${id}" data-encounter-type="${type}" data-frame-action="idle" style="background-image:url('${src}')" aria-hidden="true"></span>`:'';
}
function stop(el){if(!el)return;clearTimeout(el._frameTimer);el._frameAnimation?.cancel();el._frameAnimation=null;delete el.dataset.acting;delete el.dataset.bossMove;const src=root.NightAssets?.[el.dataset.encounterType==='machine'?'machineActors':'enemyActors']?.[el.dataset.encounterId];if(src)el.style.backgroundImage=`url('${src}')`;el.dataset.frameAction='idle';el.style.backgroundPosition='0% 0%';}
function stopAll(){document.querySelectorAll('.encounter-sprite').forEach(stop);}
function play(actor,name,mode='full',phase='impact'){
 const el=actor?.querySelector('.encounter-sprite');if(!el)return false;
 stop(el);actor.dataset.stagePose=name;
 if(mode==='off'||mode==='reduced'||matchMedia('(prefers-reduced-motion: reduce)').matches||actor.dataset.machineStage==='broken')return true;
 const a=action(name),boss=a!=='hurt'&&root.NightBossMoves?.get(el.dataset.encounterId,actor.dataset.bossIntent),special=boss&&root.NightAssets?.bossActors?.[el.dataset.encounterId]&&warmed.get(root.NightAssets.bossActors[el.dataset.encounterId])?.status==='ready'?root.NightAssets.bossActors[el.dataset.encounterId]:null,row=special?boss.row:rows[a],position=i=>`${i*100/3}% ${row*100/3}%`;
 if(special){el.style.backgroundImage=`url('${special}')`;el.dataset.bossMove=boss.name;}el.dataset.acting='true';el.dataset.frameAction=a;el.style.backgroundPosition=position(0);
 if(mode==='fast'){el.style.backgroundPosition=position(2);el._frameTimer=setTimeout(()=>stop(el),90);return true;}
 const frames=special?(phase==='prepare'?[0,1]:[2,3]):[0,1,2,3];const keys=frames.map((i,k)=>({backgroundPosition:position(i),offset:k/frames.length,easing:'steps(1,end)'}));keys.push({backgroundPosition:position(frames.at(-1)),offset:1});
 el._frameAnimation=el.animate(keys,{duration:special?(phase==='prepare'?180:300):a==='hurt'?300:440,fill:'forwards'});
 el._frameAnimation.onfinish=()=>{if(el.isConnected)stop(el);};return true;
}
const api={rows,action,markup,play,stopAll,readyBoss};if(typeof module!=='undefined')module.exports=api;root.NightEncounterActors=api;
})(typeof globalThis!=='undefined'?globalThis:this);
