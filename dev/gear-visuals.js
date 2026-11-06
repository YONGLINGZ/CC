/* Equipment insignia and bounded proc feedback. Presentation only: never settles effects. */
(function(root){
'use strict';
const THEMES=Object.freeze({
 frost:{color:'#bcecff',core:'#f5fdff'},crimson:{color:'#ed647a',core:'#ffe0e6'},
 claw:{color:'#dec196',core:'#fff1d5'},moon:{color:'#c7b4ef',core:'#f4eaff'},
 charm:{color:'#eaa8cf',core:'#fff0fa'},machine:{color:'#8dd7cc',core:'#e3fff6'},
 jade:{color:'#9bcfb5',core:'#edfff3'},neutral:{color:'#c5c0b3',core:'#fff9e9'}
});
// These are small interface drawings, not replacement character art or animation frames.
const MOTIFS=Object.freeze({
 blade:'<path d="M32 8l4 7-2 30h-4l-2-30zM23 43h18M32 45v11M28 55h8"/>',
 frost:'<path d="M32 7v50M12 20l40 24M12 44l40-24M26 12l6 6 6-6M26 52l6-6 6 6M13 27l9-1-2-9M44 47l-2-9 9-1M13 37l9 1-2 9M44 17l-2 9 9 1"/>',
 lantern:'<path d="M24 18h16l4 25H20zM24 18v-7h16v7M32 23v14M26 48h12M32 48v9M14 32h-5M50 32h5"/><path class="gear-fill" d="M32 25c-10 9-3 17 0 17s10-8 0-17z"/>',
 moonblade:'<path d="M20 10c-18 16-10 43 13 45-13-10-14-30-13-45zM42 9l4 8-2 26h-4l-2-26zM34 42h16M42 44v11M39 54h6"/>',
 claw:'<path d="M19 10c-10 16-9 31-5 43M32 8c-10 18-10 35-5 47M45 12c-9 14-9 29-5 39"/><path d="M14 53l3-10M27 55l3-12M40 51l3-10"/>',
 shadowclaw:'<path d="M39 7C10 8 1 45 29 57 12 41 24 17 39 7zM38 17c-9 11-11 22-11 32M48 20c-7 10-9 19-9 28M56 24c-6 8-8 15-8 22"/>',
 bellclaw:'<path d="M24 13a8 8 0 0116 0M20 28c0-13 24-13 24 0l4 9H16zM27 42h10M32 43v5M12 12c-7 10-7 20-5 27M52 12c7 10 7 20 5 27M21 49l-4 8M43 49l4 8"/>',
 silkfan:'<path d="M32 49L9 25q23-27 46 0zM32 49L21 17M32 49V12M32 49l11-32M31 50c-20 16-21-7-11-4M33 50c20 16 21-7 11-4"/>',
 rainfan:'<path d="M32 48L10 28q22-25 44 0zM32 48L22 21M32 48V17M32 48l10-27M14 8l-3 8M28 4l-3 8M42 5l-3 8M55 10l-3 8M23 53h18"/>',
 oathfan:'<path d="M32 37L10 22q22-23 44 0zM32 37L22 15M32 37V9M32 37l10-22M32 38c-20-9-21 12-8 12l8-12 8 12c13 0 12-21-8-12zM27 48l-7 10M37 48l7 10"/>',
 thread:'<path d="M17 13h30M17 51h30M21 13v38M43 13v38M23 20l18 7-18 7 18 7M44 41c18 0 15 17 2 14M11 18v27"/>',
 compass:'<path d="M32 8l-6 9v10L13 52M32 8l6 9v10l13 25M20 40h24M22 20h20M29 16h6M13 52l-2 6M51 52l2 6"/><circle cx="32" cy="20" r="3"/>',
 gear:'<path d="M26 8h12l2 7 6 3 7-2 6 11-5 5v7l5 5-6 10-7-2-6 3-2 7H26l-2-7-6-3-7 2-6-10 5-5v-7l-5-5 6-11 7 2 6-3z" transform="translate(4 0) scale(.875)"/><circle cx="32" cy="31" r="12"/><path d="M32 19v24M20 31h24"/>',
 crescent:'<path d="M42 7C7 6 0 49 34 57 16 45 20 18 42 7zM45 27l3 7 8 2-8 3-3 8-3-8-8-3 8-2z"/>',
 echo:'<path d="M32 12l13 20-13 20-13-20zM13 16c-10 8-10 24 0 32M51 16c10 8 10 24 0 32M8 9c-15 13-15 33 0 46M56 9c15 13 15 33 0 46"/><path d="M27 32h10"/>',
 crown:'<path d="M13 22l8 10 11-19 11 19 8-10-4 26H17zM17 54h30M36 5c-13-1-14 14-4 17-4-6-1-13 4-17zM25 41h14"/>',
 moon:'<path d="M43 7C8 6 0 49 34 57 16 45 20 18 43 7zM41 32c-8-9-18 1 0 14 18-13 8-23 0-14z"/>',
 mirror:'<ellipse cx="32" cy="26" rx="19" ry="22"/><ellipse cx="32" cy="26" rx="14" ry="17"/><path d="M27 48v10h10V48M23 29l15-15M27 38l15-15"/>',
 dream:'<path d="M11 27l21-9 21 9v22l-21 9-21-9zM11 27l21 9 21-9M32 36v22M23 9c-10 9 7 10-1 18M38 5c-10 9 7 10-1 18"/>',
 blood:'<path class="gear-fill" d="M32 7C25 22 13 29 13 40a19 19 0 0038 0C51 29 39 22 32 7z"/><path d="M23 36c-5 8-1 14 6 15M32 19v8"/>',
 bell:'<path d="M27 12a5 5 0 0110 0v5M20 32c0-20 24-20 24 0l7 12H13zM26 49h12M29 55h6M8 20l5 4M56 20l-5 4"/>',
 jade:'<circle cx="32" cy="32" r="22"/><circle cx="32" cy="32" r="7"/><path d="M22 14l3 11M43 19l-6 8M49 43l-11-6M20 49l7-11M12 29l13 1"/>',
 fox:'<path d="M13 8l17 14h4L51 8l-4 29-15 18-15-18zM19 30l7 4M45 30l-7 4M28 43h8M23 17l2 6M41 17l-2 6"/>',
 silk:'<path d="M12 16c21-20 37 15 18 23S7 54 17 57M52 12C31 3 16 32 35 39s23 15 12 18M18 11c23-3 23 21 12 28M47 9C27 10 26 29 35 39"/>',
 vial:'<path d="M24 9h16v8H24zM26 17v10C10 32 9 55 26 57h12c17-2 16-25 0-30V17M19 39c8-4 18 4 26 0M32 45v9M28 49h8"/>',
 veil:'<path d="M12 14q20-15 40 0l-6 38q-14-10-28 0zM18 21q14-9 28 0M20 30q12-9 24 0M22 39q10-9 20 0M17 52v7M25 49v7M39 49v7M47 52v7"/>',
 heart:'<path d="M32 22C12 3 0 32 32 49 64 32 52 3 32 22zM32 49v9M25 58h14"/><circle cx="32" cy="31" r="23"/>',
 relic:'<path d="M32 8l20 24-20 24L12 32zM22 32h20M32 22v20"/>'
});
const FAMILY_MOTIF=Object.freeze({sword:'blade',claw:'claw',fan:'silkfan',spool:'thread',seal:'crescent',treasure:'moon',relic:'relic'});
const live=new Set();
function escape(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function signature(id,kind='weapon'){
 const rules=root.NightReplayRules;if(!rules||!id)return null;
 const base=(kind==='weapon'?root.NightPact?.WEAPONS:root.NightPact?.RELICS)?.[id];
 const raw=typeof rules.getSignature==='function'?rules.getSignature(id,kind,base):kind==='weapon'?rules.weaponSignature?.(id):rules.relicPresentation?.(id,base);
 if(!raw)return null;
 const motif=Object.hasOwn(MOTIFS,raw.motif)?raw.motif:Object.hasOwn(FAMILY_MOTIF,raw.family)?FAMILY_MOTIF[raw.family]:'relic';
 const theme=motif==='blood'?'crimson':raw.role==='sword'||motif==='frost'?'frost':raw.role==='assassin'?(motif==='shadowclaw'?'moon':'claw'):raw.role==='hehuan'||['silk','heart'].includes(motif)?'charm':raw.role==='mechanist'||motif==='gear'?'machine':raw.role==='sovereign'||['moon','mirror','dream','veil'].includes(motif)?'moon':['claw','bell','fox'].includes(motif)?'claw':'jade';
 return {...raw,id:String(id),kind:kind==='weapon'?'weapon':'relic',motif,theme,tier:['common','rare','legendary','treasure'].includes(raw.tier)?raw.tier:'common'};
}
function svg(p){return `<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><g class="gear-glyph" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${MOTIFS[p.motif]}</g></svg>`;}
function badge(id,kind='weapon'){
 const p=signature(id,kind);if(!p)return '';
 const label=[p.name,p.label].filter(Boolean).join(' · ');
 return `<span class="gear-badge" data-gear-id="${escape(p.id)}" data-gear-kind="${p.kind}" data-gear-theme="${p.theme}" data-gear-motif="${p.motif}" data-gear-tier="${p.tier}" role="img" aria-label="${escape(label)}" title="${escape(label)}">${svg(p)}</span>`;
}
function all(container,selector){const nodes=Array.from(container?.querySelectorAll?.(selector)||[]);if(container?.matches?.(selector))nodes.unshift(container);return nodes;}
function repaint(node,p){node.dataset.gearTheme=p.theme;node.dataset.gearTier=p.tier;node.dataset.gearMotif=p.motif;}
function clearDecoration(node){node.querySelector?.('.gear-card-insignia')?.remove();delete node.dataset.gearTheme;delete node.dataset.gearTier;delete node.dataset.gearMotif;}
function decorate(container,state){
 if(!container)return;
 for(const node of all(container,'.weapon-card[data-weapon], .relic-card[data-relic], .replay-collection-card[data-weapon], .replay-collection-card[data-relic]')){
  const kind=node.dataset.weapon?'weapon':'relic',id=node.dataset.weapon||node.dataset.relic,p=signature(id,kind);
  if(!p){clearDecoration(node);continue;}
  repaint(node,p);let mark=node.querySelector('.gear-card-insignia');
  if(!mark){mark=node.ownerDocument.createElement('span');mark.className='gear-card-insignia';mark.setAttribute('aria-hidden','true');node.prepend(mark);}
  mark.innerHTML=badge(id,kind);
 }
 const player=state?.player,p=signature(player?.equippedWeapon),fallen=!!player?.path?.fallen;
 for(const stage of all(container,'.battle-stage'))stage.dataset.gearFallen=String(fallen);
 for(const portrait of all(container,'[data-combatant="player"] .portrait')){
  let mark=portrait.querySelector('.gear-portrait-insignia');
  if(!p){mark?.remove();continue;}
  if(!mark){mark=portrait.ownerDocument.createElement('span');mark.className='gear-portrait-insignia';mark.setAttribute('aria-hidden','true');portrait.append(mark);}
  mark.innerHTML=badge(p.id);const glyph=mark.querySelector('.gear-badge');
  if(glyph&&p.role==='sword'&&fallen)glyph.dataset.gearTheme='crimson';
 }
 // A scene replaced by render no longer needs delayed callbacks holding its nodes.
 for(const item of live)if(item.el.isConnected===false)dispose(item);
}
function dispose(item){clearTimeout(item.timer);item.el.getAnimations?.().forEach(a=>a.cancel());item.el.remove();live.delete(item);}
function clear(container){for(const item of [...live])if(!container||container===item.stage||container.contains?.(item.el))dispose(item);}
function play(event,mode='full'){
 if(!event||!['gearProc','echoStart','echoEnd','treasureEcho'].includes(event.type))return null;
 const id=event.gearId||event.weaponId||event.relicId,kind=event.gearKind||(event.relicId?'relic':'weapon'),p=signature(id,kind);
 const doc=root.document,stage=doc?.querySelector('.battle-stage');if(!p||!stage)return null;
 const target=String(event.target||'player');if(!/^[a-z0-9_-]+$/i.test(target))return null;
 const portrait=stage.querySelector(`[data-combatant="${target}"] .portrait, [data-combatant="${target}"] .machine-portrait`);if(!portrait)return null;
 const box=portrait.getBoundingClientRect(),bounds=stage.getBoundingClientRect();if(!bounds.width||!bounds.height)return null;
 if(p.role==='sword'&&(event.fallen===true||stage.dataset.gearFallen==='true'))p.theme='crimson';
 // Keep the signal in an edge gutter, away from the central actor silhouette.
 const size=32,pad=size/2+2,x=Math.max(pad,Math.min(bounds.width-pad,box.left-bounds.left+10)),y=Math.max(pad,Math.min(bounds.height-pad,box.bottom-bounds.top-14));
 const key=`${target}:${kind}:${id}`;
 for(const item of [...live])if(item.key===key||item.el.isConnected===false)dispose(item);
 while(live.size>=4)dispose(live.values().next().value);
 const small=mode!=='full'||root.matchMedia?.('(prefers-reduced-motion: reduce)').matches===true;
 const el=doc.createElement('span');el.className='gear-proc';repaint(el,p);el.dataset.gearProc=p.id;el.dataset.receiver=target;el.dataset.motion=small?'still':'full';el.dataset.gearEvent=event.type;el.setAttribute('aria-hidden','true');
 el.style.left=x+'px';el.style.top=y+'px';el.innerHTML=svg(p);stage.append(el);
 const duration=small?900:640;
 if(!small&&el.animate){
  const turn=p.theme==='machine'?22:p.theme==='charm'?-8:0,shift=p.theme==='claw'?-4:0;
  el.animate([{opacity:.25,transform:`translate(-50%,-50%) translateY(${shift}px) rotate(${-turn}deg) scale(.86)`},{opacity:1,transform:'translate(-50%,-50%) rotate(0deg) scale(1)',offset:.25},{opacity:1,transform:`translate(-50%,-50%) rotate(${turn}deg) scale(1)`,offset:.68},{opacity:0,transform:`translate(-50%,-50%) rotate(${turn}deg) scale(1.06)`}],{duration,easing:'ease-out',fill:'forwards'});
 }
 const item={el,stage,key,timer:null};live.add(item);item.timer=setTimeout(()=>dispose(item),duration+30);return el;
}
const api={badge,decorate,play,clear,signature,THEMES};root.NightGearVisuals=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
