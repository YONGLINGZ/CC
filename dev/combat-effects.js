/* Original skill choreography. Presentation only; authoritative hits come from engine events. */
(function(root){
'use strict';
const PALETTES=Object.freeze({
 frost:{color:'#bcecff',core:'#f5fdff',shade:'#5186ad'},
 crimson:{color:'#f13c58',core:'#ffe4de',shade:'#8c173b'},
 charm:{color:'#fa9fcb',core:'#fff0fa',shade:'#ad548d'},
 claw:{color:'#eec784',core:'#fff5db',shade:'#8b6d4a'},
 blood:{color:'#dc6b72',core:'#ffe3cc',shade:'#86314b'},
 fire:{color:'#ff9b51',core:'#fff2bc',shade:'#c04c42'},
 moon:{color:'#d8b6ff',core:'#fff3ff',shade:'#8454be'},
 machine:{color:'#84e4d6',core:'#fff0bf',shade:'#4c8f9c'},
 enemy:{color:'#d3b393',core:'#fff0d7',shade:'#92616c'},
 venom:{color:'#9bd8a3',core:'#eaffcb',shade:'#4a8f88'}
});
const slashes=['M-99 75Q-5-55 103-69Q15-26-99 75Z','M-78 99Q-13-12 113-54Q25-2-78 99Z','M-113 45Q-12-70 77-97Q-5-36-113 45Z'];
const heart='M0 21C-9 13-26 1-24-12C-21-27-5-28 0-16C5-28 21-27 24-12C26 1 9 13 0 21Z';
const swordHeavy=new Set(['S04','S15','S16','S17','S18','S26','S33','S35','S36']);
const fallbackIds={assassin:'C01',sword:'S01',hehuan:'H01',mechanist:'J01',sovereign:'F01'};
function resolve(info={}){
 const id=String(info.enemy?(info.enemyId||'enemy'):(info.cardId||fallbackIds[info.character]||'C01')),authored=root.NightStage?.profiles?.[id];
 let family=id[0],theme='claw',shape='claw',motif=authored?.motif||'claw',boss=null;
 if(info.enemy){
  boss=root.NightBossMoves?.get(info.enemyId,info.intentName);family='enemy';motif=boss?.motif||(/snake/.test(info.enemyId)?'serpent':/lantern|fire|furnace/.test(info.enemyId)?'fire':/mirror/.test(info.enemyId)?'mirror':'blade');
  theme=/fire|lantern/.test(motif)?'fire':/serpent|tide|blackscale/.test(motif)?'venom':/moon|echo|dream|fate/.test(motif)?'moon':'enemy';shape=boss?'boss':motif==='serpent'?'serpent':motif==='fire'?'fire':'enemy';
 }else if(family==='S'||family==='D'){
  theme=family==='D'||info.fallen?'crimson':'frost';shape=id==='S17'?'sword-array':['S18','S36'].includes(id)?'greatsword':['S08','S16','S33'].includes(id)?'sword-wave':['S05','S15'].includes(id)?'sword-shards':id==='S19'?'sword-orbit':family==='D'&&['D01','D06','D11'].includes(id)?'soul':id==='D07'?'fire':'sword';
 }else if(family==='H'){theme='charm';shape=['H10','H30','H35'].includes(id)?'fan':id==='H25'?'needles':['H12','H22'].includes(id)?'blossom':'silk';}
 else if(family==='J'){
  // A named spell keeps its visual even when another machine executes it.
  // In particular, Mingdi's 引雷 / 追电 must not become its generic arrow.
  theme='machine';shape=['J33','J35'].includes(id)?'lightning':id==='J27'?'gear':info.executor==='mingdi'||['J07','J20','J34'].includes(id)?'bolt':info.executor==='shiying'?'lightning':info.executor==='chengshan'||id==='J15'?'gear':'wire';
 }else if(family==='F'){theme='moon';shape=['F05','F10','F12'].includes(id)?'moon':'soul';}
 else if(id==='C15'){theme='fire';shape='fire';}
 else if(['C16','C21'].includes(id)){theme='claw';shape='moon';}
 else if(['C14','C28','C30'].includes(id)){theme='blood';shape='claw';}
 const palette=PALETTES[theme],heavy=!!info.heavy||swordHeavy.has(id)||['H12','H35','F12','C21','J35','J39'].includes(id);
 return Object.freeze({id,family,theme,shape,motif,...palette,color:boss?.color||palette.color,bossPath:boss?.path||null,heavy,angle:(Number(info.hitIndex)||0)%2?32:-32,hitIndex:Number(info.hitIndex)||0});
}
const path=(d,cls='',extra='')=>`<path class="${cls}" d="${d}" ${extra}/>`;
function geometry(p){
 if(p.shape==='claw')return `<g class="skill-slashes skill-claw-rake" transform="rotate(${p.hitIndex%2?-12:12})">${slashes.map((d,i)=>path(d,'skill-blade skill-claw-stroke',`style="--stroke-order:${i}"`)).join('')}</g>`;
 if(p.shape==='greatsword')return `<g class="skill-slashes" transform="rotate(${p.angle})">${path('M-133 53L97-82 130-83 114-60Z','skill-blade')}${path('M-133 53L115-75','skill-edge')}${path('M-77-89L-45-48M-107-20L-65-8M67 53L105 83M40 74L55 108','skill-edge')}</g>`;
 if(p.shape==='sword-wave')return `<g class="skill-slashes" transform="rotate(${p.angle*.4})">${[-26,0,26].map(y=>`<g transform="translate(0 ${y})">${path('M-128 27Q-33-67 23-21T128-38Q55 31 12-4T-128 27Z','skill-blade')}</g>`).join('')}</g>`;
 if(p.shape==='sword-shards')return `<g class="skill-slashes">${[-60,-20,20,60].map((x,i)=>`<g transform="translate(${x} ${i%2?18:-18}) rotate(35)">${path('M0-80L8-13 0 72-8-13Z','skill-blade')}</g>`).join('')}</g>`;
 if(p.shape==='sword-orbit')return `<g class="skill-orbit"><ellipse class="skill-edge" rx="101" ry="42" transform="rotate(-28)"/>${[0,120,240].map(a=>`<g transform="rotate(${a}) translate(62 0) rotate(20)">${path('M0-52L5-38 2 30 11 32-11 32-2 30-5-38Z','skill-blade')}</g>`).join('')}</g>`;
 if(p.shape==='sword'||p.shape==='sword-array')return `<g class="skill-slashes" transform="rotate(${p.angle})">${path('M-120 23Q-5-54 121-14Q7-32-120 23Z','skill-blade')}${path('M-105 34Q5-25 98-8','skill-edge')}${p.shape==='sword-array'?[-49,0,49].map((x,i)=>`<g transform="translate(${x} ${i===1?-12:17}) rotate(16)">${path('M0-97L6-78 3 47 12 49 12 53 3 53 3 69-3 69-3 53-12 53-12 49-3 47-6-78Z','skill-sword')}</g>`).join(''):''}</g>`;
 if(p.shape==='silk'||p.shape==='fan')return `<g class="skill-silk">${path('M-122 51C-18-116 124-72 77 8S-97 67-41-21S95-50 124-4','skill-ribbon')}${path('M-118 54C-20-105 119-67 74 8S-89 62-37-20','skill-edge')}${p.shape==='fan'?'<g transform="translate(4 25) rotate(-13)"><path class="skill-fan" d="M0 49L-78-26Q0-112 78-26Z"/><path class="skill-edge" d="M0 49L-48-48M0 49L-17-68M0 49L20-66M0 49L50-47"/></g>':''}</g>`;
 if(p.shape==='blossom')return `<g class="skill-orbit">${[0,60,120,180,240,300].map(a=>`<g transform="rotate(${a})">${path('M0 0C-78-41-28-123 0-61C28-123 78-41 0 0Z','skill-fan')}</g>`).join('')}</g>`;
 if(p.shape==='needles')return `<g class="skill-slashes">${[-34,0,34].map(y=>`<g transform="translate(0 ${y}) rotate(-18)">${path('M-111 0L105-4 119 0 105 4Z','skill-blade')}${path('M-112 2Q-51 55-38 11','skill-ribbon')}</g>`).join('')}</g>`;
 if(p.shape==='moon'||p.shape==='soul')return `<g class="skill-orbit">${path('M68-94C-82-116-133 67-17 105C-73 28-22-68 68-94Z','skill-blade')}<ellipse class="skill-edge" rx="99" ry="40" transform="rotate(-30)"/>${p.shape==='soul'?path('M-21 56C-67-13-9-74 13-62C67-35 1 2 31 54L9 35-5 61-10 35Z','skill-soul'):''}</g>`;
 if(p.shape==='fire')return `<g class="skill-flame">${path('M0-102C-14-44 81-23 51 51C91 24 80-7 71-24C134 32 63 116-6 100C-78 107-113 39-61-26C-64 21-36 41-27 30C-8 10-53-24 0-102Z','skill-blade')}${path('M-2-45C49 16 11 34 30 67C-6 95-55 48-22 8C-20 43 5 34-2-45Z','skill-flame-core')}</g>`;
 if(p.shape==='bolt'||p.shape==='wire')return `<g class="skill-machine">${path(p.shape==='bolt'?'M-124 5L83 5 65-12M83 5L65 22M-105-11L-61-11M-87 23L-42 23':'M-122 18H-57L-31-24 3 24 40-16H114M-122 25H-54L-29-13 2 36 43-5H114','skill-edge')}${path('M92-18L123 4 92 27 101 4Z','skill-blade')}</g>`;
 if(p.shape==='lightning')return path('M38-117L-47-12H-13L-51 116 58-23H18L62-117Z','skill-blade');
 if(p.shape==='gear')return `<g class="skill-orbit">${path('M-18-91H18L23-65 45-52 69-61 87-30 66-14V14L87 30 69 61 45 52 23 65 18 91H-18L-23 65-45 52-69 61-87 30-66 14V-14L-87-30-69-61-45-52-23-65Z','skill-gear')}<circle class="skill-edge" r="39"/>${path('M-100 5H100M-5-100V100','skill-edge')}</g>`;
 if(p.shape==='boss')return `<g class="skill-boss-sign" transform="translate(-92 -92) scale(.92)">${path(p.bossPath,'skill-ribbon')}${path(p.bossPath,'skill-edge')}</g>`;
 if(p.shape==='serpent')return path('M-107 83Q-107-69 50-81L116-56 70-39Q-49-47-107 83Z','skill-blade');
 return `<g transform="rotate(${p.angle})">${path(slashes[0],'skill-blade')}${path(slashes[2],'skill-edge')}</g>`;
}
function particles(p){
 const n=p.heavy?12:8;
 return Array.from({length:n},(_,i)=>{
  const angle=i*360/n+17,pow=i%3===0?1.2:.82,r=55+(i%3)*17,x=Math.cos(angle*Math.PI/180)*r,y=Math.sin(angle*Math.PI/180)*r;
  const geo=p.theme==='frost'?'<path d="M0-12L4 0 0 12-4 0Z"/>':p.theme==='charm'?`<path d="${heart}" transform="scale(.42)"/>`:p.theme==='crimson'?'<path d="M0-14L3 2-2 11-4 0Z"/>':'<path d="M0-7L2-2 7 0 2 2 0 7-2 2-7 0-2-2Z"/>';
  return `<g class="skill-particle" style="--px:${x.toFixed(2)}px;--py:${y.toFixed(2)}px;--particle-scale:${pow}" data-particle="${p.theme}">${geo}</g>`;
 }).join('');
}
function impactSVG(p,{blocked=false,phase='impact',artwork=''}={}){
 const ice=p.theme==='frost',charm=p.theme==='charm';
 const motif=root.NightStage?.paths?.[p.motif],cast=motif?`<g transform="scale(1.1)">${path(motif,'skill-ribbon')}${path(motif,'skill-edge')}</g>`:`<g transform="scale(.52)">${geometry(p)}</g>`;
 const impact=artwork?artwork.replace('<svg','<svg x="-130" y="-120" width="260" height="240"'):geometry(p);
 const mist=ice&&phase==='impact'?'<g class="skill-frost-wisps"><path d="M-113 41Q-48 12 3 34T113 24"/><path d="M-91 62Q-28 39 25 54T108 43"/></g>':'';
 return `<svg viewBox="-150 -150 300 300" aria-hidden="true"><g class="skill-halo"><ellipse rx="106" ry="71" fill="currentColor" opacity=".08"/><ellipse class="skill-ring" rx="91" ry="57"/></g>${mist}${phase==='cast'?cast:impact}${blocked?'<path class="skill-guard" d="M0-77L67-38 57 41 0 82-57 41-67-38Z"/>':''}${charm&&phase==='impact'?`<g class="skill-heart-seal" transform="translate(0 -28)">${path(heart,'skill-heart')}<circle class="skill-heart-orbit" r="34"/></g>`:''}<g class="skill-particles">${particles(p)}</g>${ice?'<g class="skill-snow"><path d="M0-106V-76M-13-99L13-83M-13-83L13-99M84 40V70M71 47L97 63M71 63L97 47"/></g>':''}</svg>`;
}
// Travel is an extension of the selected skill, with its tip at x=144 (90%).
// Keep this anchor and the 125ms timing shared with the authoritative hit reveal.
function flightSVG(p){
 let mark;
 if(p.shape==='claw')mark=`<g class="skill-flight-claws">${[-12,0,12].map(y=>path(`M28 ${28+y}Q86 ${12+y} 144 ${24+y}Q98 ${20+y} 28 ${28+y}Z`,'skill-blade')).join('')}</g>`;
 else if(p.shape.startsWith('sword')||p.shape==='greatsword')mark=path('M25 28L118 21 145 28 118 35Z','skill-blade')+path('M43 19V37M15 28H43','skill-edge');
 else if(p.theme==='charm')mark=path('M4 34Q33 5 62 26T126 25','skill-ribbon')+path('M10 37Q40 12 65 31T128 28','skill-edge')+`<g transform="translate(132 27) rotate(-90) scale(.55)">${path(heart,'skill-heart')}</g>`;
 else if(p.shape==='lightning')mark=path('M12 30L61 17 51 29 100 17 89 30 145 24 92 42 101 30 47 42 57 30Z','skill-blade');
 else if(p.shape==='bolt')mark=path('M9 28H144L124 16M144 28L124 40M32 20H66M21 36H55','skill-edge');
 else if(p.shape==='wire')mark=path('M8 32H38L55 20 73 36 94 21 113 29H144','skill-ribbon')+path('M8 32H38L55 20 73 36 94 21 113 29H144','skill-edge');
 else mark=`<g transform="translate(122 28) scale(.18)">${geometry(p)}</g>`;
 return `<svg viewBox="0 0 160 56" preserveAspectRatio="none" aria-hidden="true" data-flight-shape="${p.shape}">${path('M3 28Q49 17 122 28Q49 39 3 28Z','skill-flight-wake')}${mark}</svg>`;
}
function reduced(mode){return mode!=='full'||(typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches);}
function findActor(stage,id){
 const safe=String(id||'player').replace(/[^a-z0-9_-]/gi,'');
 return stage.querySelector(`[data-combatant="${safe}"] .portrait, [data-combatant="${safe}"] .machine-portrait`);
}
function point(stage,id){const actor=findActor(stage,id);if(!actor)return null;const a=actor.getBoundingClientRect(),s=stage.getBoundingClientRect();return {x:a.left-s.left+a.width*.5,y:a.top-s.top+a.height*.46,w:a.width,h:a.height};}
function base(stage,p,phase,target,source){
 const el=document.createElement('div');el.className=`skill-vfx skill-vfx-${phase} skill-theme-${p.theme}`;el.dataset.skillFx=p.id;el.dataset.phase=phase;el.dataset.theme=p.theme;el.dataset.shape=p.shape;el.dataset.receiver=target;el.dataset.source=source;el.setAttribute('aria-hidden','true');
 el.style.setProperty('--skill-color',p.color);el.style.setProperty('--skill-core',p.core);el.style.setProperty('--skill-shade',p.shade);if(p.heavy)el.classList.add('skill-vfx-heavy');stage.append(el);
 while(stage.querySelectorAll('.skill-vfx').length>9)stage.querySelector('.skill-vfx').remove();return el;
}
function expire(el,ms){el._skillTimer=setTimeout(()=>el.remove(),ms);return el;}
function card(id,target,mode='full',phase='cast',source='player',info={}){
 const stage=typeof document!=='undefined'&&document.querySelector('.battle-stage');if(!stage||mode==='off')return null;
 const p=resolve({...info,cardId:id}),pos=point(stage,target);if(!pos)return null;
 const el=base(stage,p,phase==='impact'?'impact':'cast',target,source);el.dataset.phase=phase;el.style.left=pos.x+'px';el.style.top=pos.y+'px';el.innerHTML=`<span class="skill-aura"></span>${impactSVG(p,{blocked:info.blocked,artwork:info.enemyArtwork,phase:phase==='impact'?'impact':'cast'})}`;
 const small=reduced(mode);el.classList.toggle('skill-still',small);const duration=small?mode==='fast'?75:170:phase==='impact'?470:230;
 if(!small&&el.animate)el.animate(phase==='impact'?[{opacity:0,transform:'translate(-50%,-50%) scale(.72)'},{opacity:1,transform:'translate(-50%,-50%) scale(1.02)',offset:.2},{opacity:.8,transform:'translate(-50%,-50%) scale(1.08)',offset:.6},{opacity:0,transform:'translate(-50%,-50%) scale(1.2)'}]:[{opacity:0,transform:'translate(-50%,-50%) scale(.55)'},{opacity:.75,transform:'translate(-50%,-50%) scale(.75)',offset:.7},{opacity:0,transform:'translate(-50%,-50%) scale(.88)'}],{duration,easing:'cubic-bezier(.16,.7,.3,1)',fill:'forwards'});
 return expire(el,duration+15);
}
function launch(info={},target='enemy',mode='full',source='player'){
 const stage=typeof document!=='undefined'&&document.querySelector('.battle-stage');if(!stage||mode==='off'||reduced(mode))return null;
 const from=point(stage,source),to=point(stage,target);if(!from||!to)return null;const p=resolve(info),el=base(stage,p,'flight',target,source),dx=to.x-from.x,dy=to.y-from.y,angle=Math.atan2(dy,dx)*180/Math.PI,length=Math.min(150,Math.max(60,Math.hypot(dx,dy)*.32));
 el.style.left=from.x+'px';el.style.top=from.y+'px';el.style.width=length+'px';el.innerHTML=flightSVG(p);
 el.animate?.([{opacity:0,transform:`translate(-90%,-50%) rotate(${angle}deg) scaleX(.25)`},{opacity:1,transform:`translate(calc(-90% + ${dx*.2}px),calc(-50% + ${dy*.2}px)) rotate(${angle}deg) scaleX(.75)`,offset:.25},{opacity:1,transform:`translate(calc(-90% + ${dx}px),calc(-50% + ${dy}px)) rotate(${angle}deg) scaleX(1)`}],{duration:125,easing:'cubic-bezier(.52,.04,.81,.51)',fill:'forwards'});
 return expire(el,145);
}
function clear(){if(typeof document!=='undefined')document.querySelectorAll('.skill-vfx').forEach(el=>{clearTimeout(el._skillTimer);el.getAnimations?.().forEach(a=>a.cancel());el.remove();});}
const api={PALETTES,resolve,impactSVG,flightSVG,card,launch,clear,flightDuration:125};if(typeof module!=='undefined')module.exports=api;root.NightCombatEffects=api;
})(typeof globalThis!=='undefined'?globalThis:this);
