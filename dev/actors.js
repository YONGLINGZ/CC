/* Generated character animation atlases. Presentation only: no rules or storage writes. */
(function(root){'use strict';
const kinds=['cat','sword','hehuan','tinglan','feiye'];
const rows={idle:0,attack:1,heavy:2,cast:3,guard:4,hurt:5};
const poseActions={slash:'attack',thrust:'attack',flurry:'attack',counter:'attack',leap:'heavy',finisher:'heavy',step:'guard',guard:'guard',conceal:'cast',channel:'cast',chant:'cast',pull:'cast',bow:'cast',dance:'heavy',sacrifice:'cast',mend:'cast',hurt:'hurt'};
function kind(id){return id==='sword_fallen'?'sword':id;}
function markup(id){id=kind(id);const src=root.NightAssets?.actors?.[id];if(!src)return '';return `<span class="actor-sprite" data-actor-kind="${id}" data-actor-action="idle" data-actor-frame="0" style="background-image:url('${src}')" aria-hidden="true"></span>`;}
function stop(el){if(!el)return;clearTimeout(el._spriteTimer);el._spriteAnimation?.cancel();el._spriteAnimation=null;delete el.dataset.acting;el.dataset.actorAction='idle';el.dataset.actorFrame='0';el.style.backgroundPosition='0% 0%';}
function stopAll(){if(typeof document!=='undefined')document.querySelectorAll('.actor-sprite').forEach(stop);}
function position(row,col){return `${col*100/3}% ${row*20}%`;}
function play(actor,action,mode='full',phase='full'){
 const el=actor?.querySelector('.actor-sprite');if(!el)return false;
 action=rows[action]===undefined?(poseActions[action]||'cast'):action;
 clearTimeout(el._spriteTimer);el._spriteAnimation?.cancel();
 if(mode==='off'||mode==='reduced'||(typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches)){stop(el);return true;}
 actor.dataset.stagePose=action;const row=rows[action];let frames=phase==='prepare'?[0,1]:phase==='impact'?[2,3]:action==='hurt'?[1,2,3]:[0,1,2,3];
 const duration=phase==='prepare'?150:phase==='impact'?260:action==='idle'?1200:480;
 el.dataset.acting='true';el.dataset.actorAction=action;el.dataset.actorPhase=phase;el.dataset.actorFrame=String(frames[0]);el.style.backgroundPosition=position(row,frames[0]);
 if(mode==='fast'){el.style.backgroundPosition=position(row,2);el.dataset.actorFrame='2';el._spriteTimer=setTimeout(()=>stop(el),90);return true;}
 const keys=frames.map((col,i)=>({backgroundPosition:position(row,col),offset:i/frames.length,easing:'steps(1,end)'}));keys.push({backgroundPosition:position(row,frames.at(-1)),offset:1});
 el._spriteAnimation=el.animate(keys,{duration,fill:'forwards'});
 el._spriteAnimation.onfinish=()=>{if(el.isConnected)stop(el);};
 return true;
}
function forCard(id){return root.NightActorCoverage?.[id]?.action||'cast';}
const api={kinds,rows,poseActions,markup,play,stopAll,forCard};if(typeof module!=='undefined')module.exports=api;root.NightActors=api;
})(typeof globalThis!=='undefined'?globalThis:this);
