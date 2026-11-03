/* Illustrated comic-panel introductions using existing paintings; no generated run state. */
(function(global){
'use strict';
const STORIES={
 assassin:[
  {title:'铃声先入夜',art:['portraits','cat'],caption:'夜契盟的夜铃，靠看准破绽吃饭。她习惯把脚步藏起来，把铃声留给已经发现她的人。',line:'别急。要害总会露出来。'},
  {title:'这一单，寻契器',art:['relics','bell'],caption:'这次的委托指向寒渊：寻找玄烬教遗失的契器。黑雾没有标价，雇主却已经把危险算进了报酬。',line:'东西我去找。价码，回来再谈。'},
  {title:'等一个破绽',art:['cards','C04'],caption:'猎印记下破绽，连击把机会撕开。必要时，她也会用血契换取更狠的一击——代价由自己承受。',line:'先看清，再下手。'},
  {title:'委托之外',art:['regions','fog_gate'],caption:'寻宝是明面上的来意。至于契器能否给自己的解契之路留一道缝，她要亲眼看过才肯作罢。',line:'我的契，可不只值这一单。'}
 ],
 sword:[
  {title:'霜落剑鞘',art:['portraits','sword'],caption:'太微剑宗的沈霜白，寡言，出剑也不爱多余的声响。她把追问留到敌人收势之后。',line:'跟紧。别碰雾。'},
  {title:'未归的同门',art:['events','swordgrave'],caption:'奉命进入寒渊，她要查明失踪同门的下落。没有见到人，任何传言都不能替他们写下结局。',line:'我来找人，不是来收一句传闻。'},
  {title:'蓄势，而后破局',art:['cards','S01'],caption:'霜寒封住杀势，剑意在交锋间积蓄。守住的一息，可能正是下一剑需要的距离。',line:'剑不能乱出，人不能乱丢。'},
  {title:'雾中寻迹',art:['regions','fog_gate'],caption:'山门之后，线索与危险走在同一条路上。她不会因为前方无人应答，就把剑宗的名字从寻人册上划掉。',line:'人未找全，便还没到回去的时候。'}
 ],
 hehuan:[
  {title:'扇后的人',art:['portraits','hehuan'],caption:'合欢宗外堂执事晏绮罗，惯于隔着一把扇子听人说话。她看的是来人的手，也看话里没有说出的价钱。',line:'看够了吗？看够了，就该看我的手了。'},
  {title:'扇下的纸页',art:['relics','heartmirror'],caption:'接应者将接收地点塞到扇下：长老只要账册；秦蘅若还活着，也别带她出封域。被卖进祭仪的，是她的成年师妹。',line:'她是我带进门的。'},
  {title:'藏在薄纱里的回答',art:['cards','H01'],caption:'她可以当场出手，也能将杀招藏入薄纱，等敌人自己踏进条件。观息的机会有限，判断比笑意更要稳。',line:'你先动。我等的就是这一手。'},
  {title:'连账一起算',art:['regions','fog_gate'],caption:'替秦蘅出头，外堂的药钱就可能断掉。她还是合上扇子：人要找，账册也要拿，宗门的吩咐不等于她的打算。',line:'行。那这趟我连账也一起算。'}
 ],
 mechanist:[
  {title:'旧线轴',art:['portraits','tinglan'],caption:'天工院外勤机关师陆听澜，把旧线轴重新缠紧。承山、鸣镝与拾萤，都是她手中各有职责的伙伴。',line:'先查线，再开匣。'},
  {title:'二十七天前',art:['mechanistItems','case'],caption:'最后一封急信说，救援三队已经接好断桥，第二天就能送伤员出域。如今，二十七天过去了。',line:'先把人找着。'},
  {title:'三机同心',art:['cards','J48'],caption:'承山护阵，鸣镝击敌，拾萤供能。她用驱动安排次序；最后主动执行的单位要接下敌招，过载也会损耗机体。',line:'别盯着我，你该防的是后面那个。'},
  {title:'护人的机关',art:['regions','broken_camp'],caption:'她检查承山胸前的红花，把机匣背稳。护民的机关为什么成了杀器？救援队在哪里？这些问题，要带着活人的回答回来。',line:'谁动过我们的图纸，回来再问。'}
 ],
 sovereign:[
  {title:'井下归来',art:['portraits','feiye'],caption:'从井下归来的绯夜，仍以无相宫主之名行走。她不愿解释，为什么自己认得这里的每一盏灯。',line:'我的名字，你还记得么？'},
  {title:'失落之物',art:['relics','veil'],caption:'本源散落，旧日的关系也没有随着封印沉寂。她再入寒渊，不为旁人的委托，只为取回属于自己的东西。',line:'我的东西，该还给我了。'},
  {title:'万相归潮',art:['cards','F01'],caption:'魂息在掌心聚拢，夜幕护住身形。她要让失落的力量逐一归来，却不肯提前告诉谁会为此付账。',line:'让散落的，归来。'},
  {title:'认得灯，不代表信得过人',art:['regions','mirror_heaven'],caption:'故地并不等于归处。旧影、誓言与镜后的声音仍在等她；她要亲自决定，哪些关系该留下，哪些该了结。',line:'这一次，由我来认路。'}
 ]};
const WORLD=[
 {title:'这里是寒渊',art:['regions','hanyuan_home'],caption:'玄烬教的引灵仪反噬，黑雾封闭寒渊。寻人者、寻宝者与留守者走进同一片雾，却未必站在同一边。',line:'每一个入域的人，都带着自己的来意。'},
 {title:'从山门，向七境深处',art:['regions','fog_gate'],caption:'旅程始于雾锁山门。断桥、旧仪与更深的异境相连，七境各有十段路。沿相连的遗径前行，在交锋、休整与抉择之间找到去路。',line:'你的第一步，还在雾外。'}
];
const ARRIVAL={assassin:'契器在雾里，自己的答案也可能在那里。',sword:'先走进山门，再找同门留下的痕迹。',hehuan:'秦蘅还在雾里。现在，该动身了。',mechanist:'把机匣背稳，去找救援队。',sovereign:'先过山门，再向旧日问路。'};
function pages(role){if(!STORIES[role])return [];return [...STORIES[role],...WORLD.map((p,i)=>({...p,line:i===1?ARRIVAL[role]:p.line}))].map(p=>({...p,art:[...p.art]}));}
const api={STORIES,WORLD,pages};if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(typeof document==='undefined')return;
let active=null,serial=0;
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function close(complete){const a=active;if(!a)return;active=null;a.root.remove();for(const [el,inert]of a.inert)el.inert=inert;document.body.style.overflow=a.overflow;if(a.focus?.isConnected)a.focus.focus({preventScroll:true});if(complete)a.onComplete?.();else a.onCancel?.();}
function heroImage(assets,kind){return kind==='cat'?assets.puppet?.normal||assets.portraits?.cat:assets.puppet?.[kind]?.normal||assets.portraits?.[kind];}
function draw(){const a=active;if(!a)return;const p=a.pages[a.index],hero=global.NightPact.CHARACTERS[a.role],assets=global.NightAssets||{},src=p.art[0]==='portraits'?heroImage(assets,p.art[1]):assets[p.art[0]]?.[p.art[1]],portrait=heroImage(assets,hero.portrait),last=a.index===a.pages.length-1;
 a.root.innerHTML=`<section class="prologue-book" role="document"><header><div><span class="prologue-kicker">${esc(hero.name)} · ${esc(hero.profession)} / ${a.index<4?'来时之路':'寒渊封域'}</span><h2 id="prologue-title" tabindex="-1">${esc(p.title)}</h2></div><button data-prologue="cancel">${a.replay?'关闭重看':'返回'}</button></header><div class="prologue-panels"><figure class="prologue-scene"><div class="prologue-image">${src?`<img src="${esc(src)}" alt="${esc(p.title)} · 原画分镜" onerror="this.hidden=true">`:''}<span class="prologue-frame-number" aria-hidden="true">${String(a.index+1).padStart(2,'0')}</span></div><figcaption>${esc(p.caption)}</figcaption></figure><figure class="prologue-person"><div class="prologue-image">${portrait?`<img src="${esc(portrait)}" alt="${esc(hero.name)}" onerror="this.hidden=true">`:''}</div><figcaption class="prologue-speech">“${esc(p.line)}”</figcaption></figure></div><p class="prologue-credit">既有原画分镜编排 · 手动翻页，无自动倒计时</p><footer><button data-prologue="prev" ${a.index===0?'disabled':''}>← 上一页</button><span role="status" aria-live="polite" aria-atomic="true">第 ${a.index+1} / ${a.pages.length} 页</span><button data-prologue="next" class="primary">${last?(a.replay?'结束重看':'开始旅程 →'):'下一页 →'}</button><button data-prologue="skip" class="prologue-skip">${a.replay?'关闭':'跳过故事，开始旅程'}</button></footer></section>`;
 a.root.dataset.page=String(a.index+1);a.root.scrollTop=0;a.root.querySelector('#prologue-title').focus({preventScroll:true});
}
function navigate(action){if(!active)return;if(action==='cancel')return close(false);if(action==='skip')return close(true);if(action==='prev'){active.index=Math.max(0,active.index-1);draw();}if(action==='next'){if(active.index===active.pages.length-1)return close(true);active.index++;draw();}}
api.open=function({role,replay=false,onComplete,onCancel}={}){if(active||!STORIES[role]||!global.NightPact?.CHARACTERS[role])return false;const root=document.createElement('div');root.className='prologue-overlay';root.id='character-prologue';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-labelledby','prologue-title');root.dataset.role=role;const inert=[...document.body.children].filter(e=>e.tagName!=='SCRIPT').map(e=>[e,e.inert]);active={id:++serial,role,replay,pages:pages(role),index:0,root,onComplete,onCancel,inert,focus:document.activeElement,overflow:document.body.style.overflow};inert.forEach(([e])=>e.inert=true);document.body.style.overflow='hidden';document.body.append(root);draw();return true;};
api.isOpen=()=>!!active;
document.addEventListener('click',e=>{if(!active)return;e.stopImmediatePropagation();const el=e.target.closest('[data-prologue]');if(el&&!el.disabled&&(e.detail<2||e.pointerType==='touch'))navigate(el.dataset.prologue);},true);
document.addEventListener('keydown',e=>{if(!active)return;e.stopImmediatePropagation();if(e.repeat){e.preventDefault();return;}if(['ArrowLeft','ArrowRight','Escape'].includes(e.key)){e.preventDefault();navigate(e.key==='Escape'?'cancel':e.key==='ArrowLeft'?'prev':'next');}if(e.key==='Tab'){const buttons=[...active.root.querySelectorAll('button:not(:disabled)')],first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&(document.activeElement===first||document.activeElement.id==='prologue-title')){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}},true);
global.NightPrologue=api;
})(typeof globalThis!=='undefined'?globalThis:this);
