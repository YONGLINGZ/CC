// Real Chromium / Web Audio checks; no network, audio files or npm installation.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { chromium } = require('playwright');

const audioPath = path.join(__dirname, 'audio.js');
const source = fs.readFileSync(audioPath, 'utf8');
const audio = require(audioPath);
const report = [];
async function check(name, fn) { const result = await fn(); report.push({ name, passed: true, ...(result || {}) }); }
function wav(samples, rate) {
  const out = Buffer.alloc(44 + samples.length * 2);
  out.write('RIFF',0); out.writeUInt32LE(out.length - 8,4); out.write('WAVEfmt ',8);
  out.writeUInt32LE(16,16); out.writeUInt16LE(1,20); out.writeUInt16LE(1,22);
  out.writeUInt32LE(rate,24); out.writeUInt32LE(rate * 2,28); out.writeUInt16LE(2,32); out.writeUInt16LE(16,34);
  out.write('data',36); out.writeUInt32LE(samples.length * 2,40);
  for(let i=0;i<samples.length;i++)out.writeInt16LE(Math.round(Math.max(-1,Math.min(1,samples[i])) * 32767),44+i*2);
  return out;
}

(async () => {
  let browser;
  try {
    await check('88 independent signatures across four roles; 153 encounter motifs', () => {
      assert.equal(audio.profiles.length,88); assert.equal(audio.encounters.length,153);
      assert.equal(audio.assassinProfiles.length,36);assert.equal(audio.swordProfiles.length,16);
      const profiles = audio.profiles.map(id => audio.profile(id));
      assert.equal(new Set(profiles.map(p => p.signature)).size,88);
      assert.equal(audio.profile('C99'),null);
      const first=audio.profile('C01');first.notes[0]=1;assert.notEqual(audio.profile('C01').notes[0],1);
    });
    await check('unsupported Web Audio falls back silently without creating context', async () => {
      const env={};vm.createContext(env);vm.runInContext(source,env);
      assert.equal(await env.NightAudio.unlock(),false);
      assert.equal(env.NightAudio.playCard('C01'),false);
      assert.equal(env.NightAudio.playEvent({type:'attack',cardId:'C01'}),false);
      assert.equal(env.NightAudio.getState().eventsPlayed,0);
    });
    await check('permission rejection does not throw or require another context', async () => {
      let contexts=0;
      const env={AudioContext:class { constructor(){contexts++;this.state='suspended';} createGain(){throw new Error('Audio blocked');} }};
      vm.createContext(env);vm.runInContext(source,env);
      assert.equal(await env.NightAudio.unlock(),false);
      assert.equal(env.NightAudio.playCue('victory'),false);
      assert.equal(contexts,1);
    });
    browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
    const page=await browser.newPage();
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.setContent('<button id="unlock">启用音效</button>');
    await page.addScriptTag({path:audioPath});
    await page.evaluate(() => {
      window.graph={oscillators:0,buffers:0,startCalls:0,connections:0,contexts:0};
      for(const [name,key] of [['createOscillator','oscillators'],['createBufferSource','buffers']]){
        const original=BaseAudioContext.prototype[name];
        BaseAudioContext.prototype[name]=function(...args){const node=original.apply(this,args);graph[key]++;
          const start=node.start;node.start=function(...a){graph.startCalls++;return start.apply(this,a);};return node;};
      }
      const connect=AudioNode.prototype.connect;AudioNode.prototype.connect=function(...args){graph.connections++;return connect.apply(this,args);};
      document.getElementById('unlock').onclick=async()=>{await NightAudio.unlock();};
    });
    await check('loading or requesting sound does not autoplay/create AudioContext',async()=>{
      assert.equal(await page.evaluate(()=>NightAudio.getState().contextState),'not-created');
      assert.equal(await page.evaluate(()=>NightAudio.playCard('C04')),false);
      assert.equal(await page.evaluate(()=>NightAudio.getState().contextState),'not-created');
    });
    await page.click('#unlock');
    await page.waitForFunction(()=>NightAudio.getState().unlocked);
    await check('genuine user click unlocks live audio graph',async()=>{
      const state=await page.evaluate(()=>NightAudio.getState());assert.equal(state.contextState,'running');assert.equal(state.volume,.3);
    });
    await check('all 70 casts/impacts create and start actual connected audio sources',async()=>{
      await page.evaluate(async()=>{for(const id of NightAudio.profiles){NightAudio.playCard(id);await new Promise(r=>setTimeout(r,45));}
        for(const id of NightAudio.profiles){NightAudio.playEvent({type:'attack',source:'player',cardId:id,hitIndex:1,damage:6});await new Promise(r=>setTimeout(r,id.startsWith('S')?200:125));}});
      const result=await page.evaluate(()=>({state:NightAudio.getState(),graph}));
      assert.equal(result.state.profilesUsed.length,88);assert.ok(result.graph.oscillators>100);assert.ok(result.graph.buffers>40);
      assert.ok(result.graph.startCalls>160);assert.ok(result.graph.connections>300);assert.ok(result.state.eventsPlayed>=140);
      assert.equal(result.state.rejectedVoices,0);assert.ok(result.state.peakScheduled<=result.state.maxVoices);
      return { sourcesCreated:result.state.sourcesCreated,oscillators:result.graph.oscillators,noiseSources:result.graph.buffers };
    });
    await check('150 encounters, snake intents, defense/poison/relic/reward cues all produce graph',async()=>{
      const checks=await page.evaluate(async()=>{
        const out=[];
        for(const id of NightAudio.encounters){out.push(NightAudio.playEncounter(id));await new Promise(r=>setTimeout(r,500));}
        for(const name of ['snakeBlade','snakeBreath','snakeCoil','snakeShed','block','mark','consumeMark','heal','selfDamage','power','poison','cleanse','resurrect','rewardReveal','rareReveal','treasure','coin','combo','victory','death']){
          out.push(NightAudio.playCue(name,{amount:4}));await new Promise(r=>setTimeout(r,130));
        }
        return {out,state:NightAudio.getState()};
      });
      assert.ok(checks.out.every(Boolean));assert.equal(checks.state.encountersUsed.length,153);assert.equal(checks.state.rejectedVoices,0);
    });
    await check('ordinary enemy and snake intent events select matching attack sound',async()=>{
      const result=await page.evaluate(async()=>{
        const out=[];
        for(const enemyId of ['paper','lantern','ape','bone','yaksha']){
          const ok=NightAudio.playEvent({type:'attack',source:'enemy',damage:6,hitIndex:0},{enemyId});out.push({ok,cue:NightAudio.getState().lastCue});await new Promise(r=>setTimeout(r,130));
        }
        for(const intentName of ['鳞刃','蛇息','绞缠']){
          const ok=NightAudio.playEvent({type:'attack',source:'enemy',damage:5,hitIndex:0},{enemyId:'snake',intentName});out.push({ok,cue:NightAudio.getState().lastCue});await new Promise(r=>setTimeout(r,130));
        }
        return out;
      });
      assert.ok(result.every(p=>p.ok));assert.equal(new Set(result.map(p=>p.cue)).size,8);
      assert.equal(result[6].cue,'cue:snakeBreath');assert.equal(result[7].cue,'cue:snakeCoil');
    });
    await check('muting cancels every voice immediately; unmuting keeps context; volume clamps',async()=>{
      const result=await page.evaluate(()=>{
        NightAudio.playCue('treasure');const before=NightAudio.getState();NightAudio.setMuted(true);const muted=NightAudio.getState();
        const blocked=NightAudio.playCard('C04');NightAudio.setVolume(3);const high=NightAudio.getState().volume;
        NightAudio.setVolume(-1);const low=NightAudio.getState().volume;NightAudio.setVolume(.3);NightAudio.setMuted(false);
        const resumed=NightAudio.playCard('C01');return {before,muted,blocked,high,low,resumed};
      });
      assert.ok(result.before.activeVoices>0);assert.equal(result.muted.activeVoices,0);assert.equal(result.blocked,false);
      assert.equal(result.high,1);assert.equal(result.low,0);assert.equal(result.resumed,true);assert.equal(result.muted.contextsCreated,1);
    });
    await check('burst protection limits live source count',async()=>{
      const state=await page.evaluate(()=>{for(let i=0;i<100;i++)NightAudio.preview('C21');return NightAudio.getState();});
      assert.ok(state.activeVoices<=56);assert.ok(state.peakScheduled<=56);assert.ok(state.rejectedVoices>0);
      await page.evaluate(()=>{NightAudio.setMuted(true);NightAudio.setMuted(false);});
    });
    await check('52 OfflineAudioContext renders contain distinct, unclipped, non-silent sound',async()=>{
      const result=await page.evaluate(async()=>{
        const rendered=await NightAudio.renderOffline(NightAudio.profiles),a=rendered.channels[0],rate=rendered.sampleRate;
        const values=NightAudio.profiles.map((id,j)=>{let sum=0,peak=0,hash=2166136261;
          for(let i=Math.floor(j*1.2*rate);i<Math.floor((j*1.2+.95)*rate);i++){sum+=a[i]*a[i];peak=Math.max(peak,Math.abs(a[i]));hash=Math.imul(hash^Math.round(a[i]*32767),16777619);}
          return {id,rms:Math.sqrt(sum/(.95*rate)),peak,hash:hash>>>0};});return values;
      });
      assert.equal(result.length,88);assert.equal(new Set(result.map(p=>p.hash)).size,88);
      for(const p of result){assert.ok(p.rms>.0004,p.id+' silent');assert.ok(p.peak<.85,p.id+' clips');assert.ok(Number.isFinite(p.rms));}
      return {distinctRenders:result.length,minRMS:Math.min(...result.map(p=>p.rms)),maxPeak:Math.max(...result.map(p=>p.peak))};
    });
    const preview=await page.evaluate(async()=>{const r=await NightAudio.renderOffline(['C01','C04','C05','C15','C02','C13','C21','C36']);return {sampleRate:r.sampleRate,samples:Array.from(r.channels[0])};});
    const output='/workspace/scratch/audio-preview.wav';fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,wav(preview.samples,preview.sampleRate));
    assert.deepEqual(errors,[]);
    const result={passed:report.length,failed:0,checks:report,preview:output,audioSha256:crypto.createHash('sha256').update(source).digest('hex'),note:'Programmatically synthesized effects; real Chromium AudioContext/OfflineAudioContext executed. Listening quality is not a test assertion.'};
    fs.writeFileSync('/workspace/scratch/audio-test-report.json',JSON.stringify(result,null,2));
    fs.writeFileSync(path.join(__dirname,'v8-audio-regression-results.json'),JSON.stringify(result,null,2)+'\n');
    console.log(JSON.stringify(result,null,2));
  }catch(error){console.error(JSON.stringify({passed:report.length,failed:1,checks:report,error:error.stack},null,2));process.exitCode=1;}
  finally{if(browser)await browser.close();}
})();
