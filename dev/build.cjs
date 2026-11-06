#!/usr/bin/env node
'use strict';

// Runtime has no dependencies: all scripts are ordinary inline scripts.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const slim = args.includes('--slim') || process.env.SLIM === '1';
const all = args.includes('--all');
if(all && (slim || args.includes('--inline') || args.includes('--output')))throw new Error('--all produces index.html and baiyao-standalone.html; do not combine it with --slim, --inline or --output.');
const outputIndex = args.indexOf('--output');
if(outputIndex>=0 && (!args[outputIndex+1] || args[outputIndex+1].startsWith('--')))throw new Error('--output requires a file path.');
const read = name => fs.readFileSync(path.join(__dirname, name), 'utf8');
const script = text => text.replace(/^\s*<script[^>]*>/, '').replace(/<\/script>\s*$/, '').trimEnd();
const gameData = require('./engine.js');
const spriteFrames = require('./sprite-frames.js');
const portraitIds = [...new Set(['cat','fox','hehuan','tinglan','sword_fallen',...Object.keys(gameData.ENEMIES),...Object.keys(gameData.NPCS||{})])];
const cardIds = Object.keys(gameData.CARDS);
const eventIds = [...new Set([...(gameData.EVENT_ART_IDS || gameData.EVENT_IDS || ['well','shrine','dreamshop','theatre','umbrella','pawnshop']),'fox','rest','shop'])];
const relicIds = Object.keys(gameData.RELICS);
function build(inline,output){
const missing=[];
function asset(folder,id){
  if(slim)return '';
  if(folder==='weapons'&&gameData.WEAPONS[id]?.art==='vector')return '';
  const webp='assets/'+folder+'/'+id+'.webp',png='assets/'+folder+'/'+id+'.png';
  const relative=fs.existsSync(path.join(root,webp))?webp:png;
  if(!fs.existsSync(path.join(root,relative))){missing.push(webp);return '';}

  return inline?'data:image/'+(relative.endsWith('.png')?'png':'webp')+';base64,'+fs.readFileSync(path.join(root,relative)).toString('base64'):relative;
}
const resources={};
for(const [key,folder,ids] of [['portraits','portraits',portraitIds],['cards','cards',cardIds],['events','events',eventIds],['relics','relics',relicIds],['regions','regions',[...gameData.REGIONS.map(region=>region.id),'hanyuan_home']],['weapons','weapons',Object.keys(gameData.WEAPONS||{})],['items','items',Object.keys(require('./expansion.js').ITEMS||{})]]){
  resources[key]=Object.fromEntries(ids.map(id=>[id,asset(folder,id)]));
}
const outfitPortraits={cat:'assassin',sword:'sword',sword_fallen:'sword',hehuan:'hehuan',tinglan:'mechanist',feiye:'sovereign'};
resources.outfits=Object.fromEntries(Object.values(gameData.OUTFITS||{}).flatMap(o=>[
 ['item-'+o.id,asset('outfits',o.portrait?o.portrait+'-'+o.id:'item-'+o.id)],
 ...Object.entries(outfitPortraits).filter(([,role])=>o.characters.includes(role)).map(([kind])=>[kind+'-'+o.id,asset('outfits',kind+'-'+o.id)])]));
const roleEventIds=['well','shrine','dreamshop','theatre','umbrella','pawnshop','riftwatch','supply','cultlab','swordgrave','pilgrims','prisoner','echo','broker','fox','rest','shop','moon_trace','sealed_name','moon_vow','armory'];
resources.eventsByCharacter=Object.fromEntries(['sword','sovereign','sword_fallen'].map(character=>[character,Object.fromEntries(roleEventIds.map(id=>[id,asset('events-'+character,id)]))]));
resources.puppet=Object.fromEntries(['normal','wounded','critical','blink'].map(id=>[id,asset('puppet','cat-'+id)]));
if(gameData.CHARACTERS?.sword){
  resources.puppet.sword=Object.fromEntries(['normal','wounded','critical'].map(id=>[id,asset('puppet','sword-'+id)]));
  resources.portraits.sword=resources.puppet.sword.normal;
}
if(gameData.CHARACTERS?.sovereign){
  resources.puppet.feiye=Object.fromEntries(['normal','wounded','critical'].map(id=>[id,asset('puppet','feiye-'+id)]));
}
resources.puppet.sword_fallen=Object.fromEntries(['normal','wounded','critical'].map(id=>[id,asset('puppet','sword_fallen-'+id)]));
resources.factionCombat=Object.fromEntries(Object.keys(gameData.ENEMY_FACTIONS.DEFS).filter(id=>gameData.ENEMY_FACTIONS.DEFS[id].rank==='elite'||['m01','m02','m19','m20'].includes(id)).map(id=>[id,asset('faction-combat',id)]));
resources.factionItems=Object.fromEntries(Object.keys(gameData.ENEMY_FACTIONS.ITEMS).map(id=>[id,asset('faction-items',id)]));
resources.factionScenes=Object.fromEntries(Object.keys(gameData.ENEMY_FACTIONS.GROUPS).map(id=>[id,asset('faction-scenes',id)]));
resources.puppet.hehuan=Object.fromEntries(['normal','wounded','critical'].map(id=>[id,asset('puppet','hehuan-'+id)]));
resources.puppet.tinglan=Object.fromEntries(['normal','wounded','critical'].map(id=>[id,asset('puppet','tinglan-'+id)]));
resources.machines=Object.fromEntries(['chengshan','mingdi','shiying'].flatMap(id=>['normal','worn','broken'].map(mode=>[id+'-'+mode,asset('machines',id+'-'+mode)])));
resources.machineAvatars=Object.fromEntries(['chengshan','mingdi','shiying'].map(id=>[id,asset('machines',id+'-icon')]));
resources.mechanistItems={case:asset('items','mech_case'),avatar:asset('portraits','tinglan-avatar')};
resources.actors=Object.fromEntries(['cat','sword','hehuan','tinglan','feiye'].map(id=>[id,asset('actors',id)]));
resources.actorAppearances=Object.fromEntries(['sword_fallen',...Object.values(gameData.OUTFITS).flatMap(o=>Object.entries(outfitPortraits).filter(([,role])=>o.characters.includes(role)).map(([kind])=>kind+'-'+o.id))].map(key=>[key,{src:asset('actor-keyframes',key),columns:8,rows:6}]));
resources.enemyActors=Object.fromEntries([...Object.keys(gameData.ENEMIES),'ji'].map(id=>[id,asset('enemy-actors',id)]));
resources.bossActors=Object.fromEntries(Object.keys(gameData.BOSS_LORE).map(id=>[id,asset('boss-actors',id)]));
resources.machineActors=Object.fromEntries(['chengshan','mingdi','shiying'].map(id=>[id,asset('machine-actors',id)]));
// Repair metadata travels with the descriptor, including in offline data-URL builds.
for(const group of ['actors','actorAppearances','enemyActors','bossActors','machineActors']){
  for(const [key,raw] of Object.entries(resources[group])){
    const repair=spriteFrames.plans(group,key);
    if(repair)resources[group][key]={...(typeof raw==='string'?{src:raw}:raw),repair};
  }
}
resources.comics=Object.fromEntries(['assassin','sword','hehuan','mechanist','sovereign','world'].flatMap(role=>Array.from({length:role==='world'?2:4},(_,i)=>role+'-'+(i+1))).map(id=>[id,asset('comics',id)]));
for(const [id,m]of Object.entries(gameData.ROLE_STORIES.META))resources.events[id]=resources.comics[m.role+'-'+((m.step-1)%4+1)];
resources.puppetRig={};
resources.mode=slim?'slim':inline?'inline':'folder';
if((all||args.includes('--strict'))&&missing.length)throw new Error('Missing release art: '+missing.join(', '));
const release={...JSON.parse(read('release.json')),cards:Object.fromEntries(Object.keys(gameData.CHARACTERS).map(role=>[role,Object.values(gameData.CARDS).filter(c=>c.character===role&&!c.storyOnly).length])),totalCards:cardIds.length};
const shell=read('shell.html').replace(/<title>[^<]*<\/title>/,'<title>百妖夜契 · '+release.name+'</title>').replace(/<\/body>\s*<\/html>\s*$/,'').replace('衣影血誓版',release.name+' '+release.id).trimEnd();
const ui=script(read('ui.js')).replace('  /*__IMAGES__*/','  const images=NightAssets.portraits;');
const sources=[script(read('art.js')),'globalThis.NightAssets='+JSON.stringify(resources)+';',script(read('music.js')),fs.existsSync(path.join(__dirname,'audio.js'))?script(read('audio.js')):'',script(read('expansion.js')),script(read('hehuan.js')),script(read('mechanist.js')),script(read('expedition.js')),script(read('seven.js')),script(read('tales.js')),script(read('boss-quests.js')),script(read('enemy-factions.js')),...['story-v5.js','story-factions-v5.js','story-bosses-v5.js'].filter(n=>fs.existsSync(path.join(__dirname,n))).map(n=>script(read(n))),script(read('event-editorial.js')),script(read('role-stories.js')),script(read('replay-rules.js')),script(read('replay-profile.js')),script(read('engine.js')),script(read('prologue.js')),script(read('actor-coverage.js')),script(read('sprite-frames.js')),script(read('sprite-motion.js')),script(read('actors.js')),script(read('boss-moves.js')),script(read('encounter-actors.js')),script(read('stage.js')),script(read('combat-effects.js')),script(read('gear-visuals.js')),ui];
const html=shell+'\n<style>'+read('sprite-motion.css')+'\n'+read('combat-effects.css')+'\n'+read('gear-visuals.css')+'\n'+read('replay-ui.css')+'</style>\n<script>globalThis.NightRelease='+JSON.stringify(release)+';</script>\n'+sources.filter(Boolean).map(s=>'<script>\n'+s+'\n</script>').join('\n')+'\n</body></html>\n';
fs.mkdirSync(path.dirname(output),{recursive:true});
fs.writeFileSync(output,html,'utf8');
console.log('Built '+path.relative(root,output)+' ('+Buffer.byteLength(html)+' bytes, '+resources.mode+')'+(missing.length?' — '+missing.length+' art files pending':''));

return {output,bytes:Buffer.byteLength(html),mode:resources.mode};
}
if(all){
  build(false,path.join(root,'index.html'));
  build(true,path.join(root,'baiyao-standalone.html'));
}else{
  const inline=!slim&&args.includes('--inline');
  build(inline,outputIndex>=0?path.resolve(root,args[outputIndex+1]):path.join(root,'index.html'));
}
