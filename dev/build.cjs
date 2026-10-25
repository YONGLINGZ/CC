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
const portraitIds = [...new Set(['cat','fox','hehuan','sword_fallen',...Object.keys(gameData.ENEMIES),...Object.keys(gameData.NPCS||{})])];
const cardIds = Object.keys(gameData.CARDS);
const eventIds = [...new Set([...(gameData.EVENT_ART_IDS || gameData.EVENT_IDS || ['well','shrine','dreamshop','theatre','umbrella','pawnshop']),'fox','rest','shop'])];
const relicIds = Object.keys(gameData.RELICS);
function build(inline,output){
const missing=[];
function asset(folder,id){
  if(slim)return '';
  const relative='assets/'+folder+'/'+id+'.webp';
  if(!fs.existsSync(path.join(root,relative))){missing.push(relative);return '';}
  return inline?'data:image/webp;base64,'+fs.readFileSync(path.join(root,relative)).toString('base64'):relative;
}
const resources={};
for(const [key,folder,ids] of [['portraits','portraits',portraitIds],['cards','cards',cardIds],['events','events',eventIds],['relics','relics',relicIds],['regions','regions',[...gameData.REGIONS.map(region=>region.id),'hanyuan_home']],['weapons','weapons',Object.keys(gameData.WEAPONS||{})],['items','items',Object.keys(require('./expansion.js').ITEMS||{})]]){
  resources[key]=Object.fromEntries(ids.map(id=>[id,asset(folder,id)]));
}
resources.outfits=Object.fromEntries(Object.keys(gameData.OUTFITS||{}).flatMap(id=>['item','cat','sword','sword_fallen'].map(role=>[role+'-'+id,asset('outfits',role+'-'+id)])));
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
resources.puppetRig={};
resources.mode=slim?'slim':inline?'inline':'folder';
if((all||args.includes('--strict'))&&missing.length)throw new Error('Missing release art: '+missing.join(', '));
const release={...JSON.parse(read('release.json')),cards:Object.fromEntries(['assassin','sword','hehuan','sovereign'].map(role=>[role,Object.values(gameData.CARDS).filter(c=>c.character===role&&!c.storyOnly).length])),totalCards:cardIds.length};
const shell=read('shell.html').replace(/<\/body>\s*<\/html>\s*$/,'').replace('衣影血誓版',release.name+' '+release.id).trimEnd();
const ui=script(read('ui.js')).replace('  /*__IMAGES__*/','  const images=NightAssets.portraits;');
const sources=[script(read('art.js')),'globalThis.NightAssets='+JSON.stringify(resources)+';',fs.existsSync(path.join(__dirname,'audio.js'))?script(read('audio.js')):'',script(read('expansion.js')),script(read('hehuan.js')),script(read('expedition.js')),script(read('seven.js')),script(read('tales.js')),script(read('boss-quests.js')),script(read('enemy-factions.js')),script(read('event-editorial.js')),script(read('engine.js')),ui];
const html=shell+'\n<script>globalThis.NightRelease='+JSON.stringify(release)+';</script>\n'+sources.filter(Boolean).map(s=>'<script>\n'+s+'\n</script>').join('\n')+'\n</body></html>\n';
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
