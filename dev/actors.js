/* Player sprite selection and action routing. Rules and saves live elsewhere. */
(function(root){'use strict';
const kinds=['cat','sword','hehuan','tinglan','feiye'];
const rows={idle:0,attack:1,heavy:2,cast:3,guard:4,hurt:5};
const poseActions={slash:'attack',thrust:'attack',flurry:'attack',counter:'attack',leap:'heavy',finisher:'heavy',step:'guard',guard:'guard',conceal:'cast',channel:'cast',chant:'cast',pull:'cast',bow:'cast',dance:'heavy',sacrifice:'cast',mend:'cast',hurt:'hurt'};
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;');
function source(id,appearance=''){
 const key=appearance||id,raw=root.NightAssets?.actorAppearances?.[key];
 if(raw&&(typeof raw==='string'||raw.src))return {group:'actorAppearances',key,columns:8,rows:6,...(typeof raw==='string'?{src:raw}:raw)};
 // An unavailable costume never silently shows the default clothing.
 if(appearance)return null;
 const base=root.NightAssets?.actors?.[id];return base?{group:'actors',key:id,columns:4,rows:6,...(typeof base==='string'?{src:base}:base)}:null;
}
function markup(id,appearance=''){
 const d=source(id,appearance);if(!d)return '';
 return `<span class="actor-sprite" data-actor-kind="${esc(id)}" data-actor-appearance="${esc(appearance)}" data-actor-action="idle" data-actor-frame="0" data-sprite-group="${d.group}" data-sprite-key="${esc(d.key)}" style="--sprite-columns:${d.columns||4};--sprite-rows:${d.rows||6};background-size:${(d.columns||4)*100}% ${(d.rows||6)*100}%;background-image:url('${esc(d.src)}')" aria-hidden="true"></span>`;
}
function stop(el){if(!el)return;clearTimeout(el._spriteTimer);el._spriteAnimation?.cancel();el._spriteAnimation=null;root.NightSpriteMotion?.idle(el);delete el.dataset.acting;el.dataset.actorAction='idle';el.dataset.actorFrame='0';el.style.backgroundPosition='0% 0%';}
function stopAll(){if(typeof document!=='undefined')document.querySelectorAll('.actor-sprite').forEach(stop);}
function position(row,col,columns=4,rowCount=6){return `${columns>1?col*100/(columns-1):0}% ${rowCount>1?row*100/(rowCount-1):0}%`;}
function play(actor,action,mode='full',phase='full'){
 const el=actor?.querySelector('.actor-sprite');if(!el)return false;
 action=rows[action]===undefined?(poseActions[action]||'cast'):action;
 clearTimeout(el._spriteTimer);el._spriteAnimation?.cancel();
 if(mode==='off'||mode==='reduced'||(typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches)){stop(el);return true;}
 actor.dataset.stagePose=action;
 const d=source(el.dataset.actorKind,el.dataset.actorAppearance)||{columns:4,rows:6};
 const duration=phase==='prepare'?165:phase==='impact'?325:action==='hurt'?350:action==='idle'?1800:520;
 el.dataset.acting='true';el.dataset.actorAction=action;el.dataset.actorPhase=phase;
 const finish=()=>{delete el.dataset.acting;el.dataset.actorAction='idle';el.dataset.actorFrame='0';};
 if(d.src&&root.NightSpriteMotion?.play(el,d,{row:rows[action],action,phase,mode,duration,onfinish:finish}))return true;
 // Static-safe fallback for slim builds, unsupported canvases and tests.
 const range=root.NightSpriteMotion?.phaseRange(d.columns,phase)||[0,d.columns-1];
 const frames=Array.from({length:range[1]-range[0]+1},(_,i)=>i+range[0]);
 el.dataset.actorFrame=String(frames[0]);el.style.backgroundPosition=position(rows[action],frames[0],d.columns,d.rows);
 if(mode==='fast'){el.style.backgroundPosition=position(rows[action],Math.min(d.columns-1,Math.ceil(d.columns/2)),d.columns,d.rows);el._spriteTimer=setTimeout(()=>stop(el),90);return true;}
 if(!el.animate){stop(el);return true;}
 const keys=frames.map((col,i)=>({backgroundPosition:position(rows[action],col,d.columns,d.rows),offset:i/frames.length,easing:'steps(1,end)'}));keys.push({backgroundPosition:position(rows[action],frames.at(-1),d.columns,d.rows),offset:1});
 el._spriteAnimation=el.animate(keys,{duration,fill:'forwards'});
 el._spriteAnimation.onfinish=()=>{if(el.isConnected){if(phase==='prepare')el._spriteTimer=setTimeout(()=>stop(el),650);else stop(el);}};
 return true;
}
function forCard(id){return root.NightActorCoverage?.[id]?.action||'cast';}
const api={kinds,rows,poseActions,source,markup,play,stopAll,forCard};if(typeof module!=='undefined')module.exports=api;root.NightActors=api;
})(typeof globalThis!=='undefined'?globalThis:this);
