#!/usr/bin/env node
'use strict';

// Runtime has no dependencies: all scripts are ordinary inline scripts.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const slim = args.includes('--slim') || process.env.SLIM === '1';
const inline = !slim && args.includes('--inline');
const outputIndex = args.indexOf('--output');
const output = outputIndex >= 0 ? path.resolve(root, args[outputIndex + 1]) : path.join(root, 'index.html');
const read = name => fs.readFileSync(path.join(__dirname, name), 'utf8');
const script = text => text.replace(/^\s*<script[^>]*>/, '').replace(/<\/script>\s*$/, '').trimEnd();
const gameData = require('./engine.js');
const portraitIds = ['cat','fox','snake','paper','lantern','ape','bone','yaksha','raider','liu','ji','wen'];
const cardIds = Object.keys(gameData.CARDS);
const eventIds = [...new Set([...(gameData.EVENT_IDS || ['well','shrine','dreamshop','theatre','umbrella','pawnshop']),'fox','rest','shop'])];
const relicIds = Object.keys(gameData.RELICS);
const missing=[];
function asset(folder,id){
  if(slim)return '';
  const relative='assets/'+folder+'/'+id+'.webp';
  if(!fs.existsSync(path.join(root,relative))){missing.push(relative);return '';}
  return inline?'data:image/webp;base64,'+fs.readFileSync(path.join(root,relative)).toString('base64'):relative;
}
const resources={};
for(const [key,folder,ids] of [['portraits','portraits',portraitIds],['cards','cards',cardIds],['events','events',eventIds],['relics','relics',relicIds],['regions','regions',['fog_gate','broken_camp','ritual_core']]]){
  resources[key]=Object.fromEntries(ids.map(id=>[id,asset(folder,id)]));
}
resources.puppet=Object.fromEntries(['normal','wounded','critical','blink'].map(id=>[id,asset('puppet','cat-'+id)]));
if(gameData.CHARACTERS?.sword){
  resources.puppet.sword=Object.fromEntries(['normal','wounded','critical'].map(id=>[id,asset('puppet','sword-'+id)]));
  resources.portraits.sword=resources.puppet.sword.normal;
}
const rigPath=path.join(__dirname,'puppet-rig.json');
resources.puppetRig=fs.existsSync(rigPath)?JSON.parse(fs.readFileSync(rigPath,'utf8')):{};
resources.mode=slim?'slim':inline?'inline':'folder';
if(args.includes('--strict')&&missing.length)throw new Error('Missing release art: '+missing.join(', '));
const shell=read('shell.html').replace(/<\/body>\s*<\/html>\s*$/,'').trimEnd();
const ui=script(read('ui.js')).replace('  /*__IMAGES__*/','  const images=NightAssets.portraits;');
const sources=[script(read('art.js')),'globalThis.NightAssets='+JSON.stringify(resources)+';',fs.existsSync(path.join(__dirname,'audio.js'))?script(read('audio.js')):'',fs.existsSync(path.join(__dirname,'puppet.js'))?script(read('puppet.js')):'',fs.existsSync(path.join(__dirname,'scene.js'))?script(read('scene.js')):'',script(read('engine.js')),ui];
const html=shell+'\n'+sources.filter(Boolean).map(s=>'<script>\n'+s+'\n</script>').join('\n')+'\n</body></html>\n';
fs.mkdirSync(path.dirname(output),{recursive:true});
fs.writeFileSync(output,html,'utf8');
console.log('Built '+path.relative(root,output)+' ('+Buffer.byteLength(html)+' bytes, '+resources.mode+')'+(missing.length?' — '+missing.length+' art files pending':''));
