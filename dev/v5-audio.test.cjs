/* Actual Web Audio checks for the frost-sword class and sealed-region motifs. */
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {chromium}=require('playwright');
const audioPath=path.join(__dirname,'audio.js');
const source=fs.readFileSync(audioPath,'utf8');
const audio=require(audioPath);
const swordIds=Array.from({length:16},(_,i)=>'S'+String(i+1).padStart(2,'0'));
const newEncounters=['riftwatch','supply','cultlab','swordgrave','pilgrims','prisoner','echo','broker'];
const report={audioSha256:crypto.createHash('sha256').update(source).digest('hex'),results:[],errors:[],requests:[],note:'Actual Chromium AudioContext/OfflineAudioContext. No human listening evaluation.'};
let browser,page;
async function test(name,fn){try{await fn();report.results.push({name,ok:true});console.log('PASS '+name);}catch(error){report.results.push({name,ok:false,error:error.stack});console.error('FAIL '+name+': '+error.message);}}
async function reset(){await page.evaluate(()=>{NightAudio.setMuted(true);NightAudio.setVolume(.3);NightAudio.setMuted(false);window.audioTrace=[];});}
function digest(value){return crypto.createHash('sha256').update(value).digest('hex');}

(async()=>{
  await test('old 36 assassin signatures are byte-identical to v4; 16 sword signatures are independent',async()=>{
    const old=audio.assassinProfiles.map(id=>audio.profile(id));
    assert.equal(digest(JSON.stringify(old)),'fdfea696abffe826a17d8aeccb35007954fe6fe131ccb2f587a510261d872b53');
    assert.deepEqual(audio.swordProfiles,swordIds);assert.equal(audio.profiles.length,76);assert.equal(audio.encounters.length,150);
    assert.equal(new Set(audio.profiles.map(id=>audio.profile(id).signature)).size,76);
    assert.ok(swordIds.every(id=>!['claw','pounce','tear'].includes(audio.profile(id).kind)));
    report.assassinProfilesPreserved=36;report.newProfiles=swordIds.map(id=>({id,...audio.profile(id)}));
  });
  await test('new card and status requests never auto-create audio and unsupported browsers degrade safely',async()=>{
    const env={};vm.createContext(env);vm.runInContext(source,env);
    assert.equal(env.NightAudio.getState().contextState,'not-created');
    assert.equal(env.NightAudio.playCard('S16'),false);
    assert.equal(env.NightAudio.playEvent({type:'chill',amount:3,total:3}),false);
    assert.equal(env.NightAudio.playEvent({type:'swordIntent',amount:2,total:4}),false);
    assert.equal(env.NightAudio.playEncounter('cultlab'),false);
    assert.equal(await env.NightAudio.unlock(),false);
    assert.equal(env.NightAudio.getState().contextsCreated,0);
  });
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  try{
    page=await browser.newPage();
    page.on('pageerror',e=>report.errors.push(e.message));page.on('request',r=>{if(/^https?:/i.test(r.url()))report.requests.push(r.url());});
    await page.setContent('<button id="unlock">启用音效</button>');await page.addScriptTag({content:source});
    await page.evaluate(()=>{
      window.audioTrace=[];
      const create=BaseAudioContext.prototype.createOscillator;
      BaseAudioContext.prototype.createOscillator=function(...args){
        const node=create.apply(this,args),set=node.frequency.setValueAtTime;
        node.frequency.setValueAtTime=function(value,...rest){audioTrace.push(value);return set.call(this,value,...rest);};return node;
      };
      document.querySelector('#unlock').onclick=()=>NightAudio.unlock();
    });
    await page.click('#unlock');await page.waitForFunction(()=>NightAudio.getState().unlocked);

    await test('all 16 new sounds actually render non-silent unique unclipped audio, distinct from cat attacks',async()=>{
      const ids=[...swordIds,'C01','C05','C16'];
      const rendered=await page.evaluate(async ids=>{
        const r=await NightAudio.renderOffline(ids),data=r.channels[0],rate=r.sampleRate;
        const values=ids.map((id,j)=>{let peak=0,sum=0,hash=2166136261;const start=Math.round(j*1.2*rate),end=Math.round((j*1.2+1.05)*rate);
          for(let i=start;i<end;i++){const value=data[i];peak=Math.max(peak,Math.abs(value));sum+=value*value;hash=Math.imul(hash^Math.round(value*32767),16777619);}return{id,rms:Math.sqrt(sum/(end-start)),peak,hash:hash>>>0};});
        return{values,sources:r.sourcesCreated,rejected:r.rejectedVoices};
      },ids);
      assert.equal(rendered.values.length,19);assert.equal(new Set(rendered.values.map(x=>x.hash)).size,19);assert.equal(rendered.rejected,0);
      for(const x of rendered.values){assert.ok(Number.isFinite(x.rms)&&x.rms>.0004,x.id+' silent');assert.ok(x.peak<.85,x.id+' clips');}
      report.cardWaveforms=rendered;
    });
    await test('eight new regions render eight distinct non-silent offline motifs without touching live state',async()=>{
      const before=await page.evaluate(()=>NightAudio.getState());
      const result=await page.evaluate(async ids=>{
        const r=await NightAudio.renderEncountersOffline(ids),data=r.channels[0],rate=r.sampleRate;
        return ids.map((id,j)=>{let peak=0,sum=0,hash=2166136261;const start=Math.round(j*1.2*rate),end=Math.round((j*1.2+1.05)*rate);
          for(let i=start;i<end;i++){const value=data[i];peak=Math.max(peak,Math.abs(value));sum+=value*value;hash=Math.imul(hash^Math.round(value*32767),16777619);}return{id,rms:Math.sqrt(sum/(end-start)),peak,hash:hash>>>0};});
      },newEncounters);
      assert.equal(new Set(result.map(x=>x.hash)).size,8);for(const x of result){assert.ok(x.rms>.0004,x.id+' silent');assert.ok(x.peak<.85,x.id+' clips');}
      const after=await page.evaluate(()=>NightAudio.getState());assert.equal(after.eventsPlayed,before.eventsPlayed);assert.equal(after.sourcesCreated,before.sourcesCreated);report.encounterWaveforms=result;
    });
    await test('context cardId routes actual metal/ice sources; later attack segments shift pitch',async()=>{
      await reset();
      const result=await page.evaluate(()=>{
        const played=NightAudio.playEvent({type:'attack',source:'player',damage:4,hitIndex:0},{cardId:'S05'}),state=NightAudio.getState(),first=[...audioTrace];
        audioTrace=[];NightAudio.playEvent({type:'attack',source:'player',damage:3,hitIndex:0},{cardId:'S08'});const segment0=[...audioTrace];
        audioTrace=[];NightAudio.playEvent({type:'attack',source:'player',damage:3,hitIndex:2},{cardId:'S08'});const segment2=[...audioTrace];
        return{played,state,first,segment0,segment2};
      });
      assert.equal(result.played,true);assert.equal(result.state.lastCue,'hit:S05');assert.ok(result.state.profilesUsed.includes('S05'));
      assert.ok(result.first.includes(330),'S05 must create its steel fundamental instead of C01 claw bass');assert.notDeepEqual(result.segment0,result.segment2);
      assert.ok(result.segment2[0]>result.segment0[0]);report.routing=result;
    });
    await test('chill, sword-intent and frostseal events create live sources once; zero changes remain silent',async()=>{
      await reset();
      const result=await page.evaluate(async()=>{
        const checks=[];
        for(const event of [{type:'chill',amount:2,total:2},{type:'chill',amount:-2,total:0},{type:'swordIntent',amount:2,total:4},{type:'swordIntent',amount:-4,total:0},{type:'relic',relic:'frostseal'}]){
          const before=NightAudio.getState().sourcesCreated;audioTrace=[];const ok=NightAudio.playEvent(event,{cardId:'S15'});const after=NightAudio.getState();checks.push({event,ok,created:after.sourcesCreated-before,cue:after.lastCue,frequencies:[...audioTrace]});await new Promise(r=>setTimeout(r,180));
        }
        const before=NightAudio.getState();const zero=[NightAudio.playEvent({type:'chill',amount:0,total:4}),NightAudio.playEvent({type:'swordIntent',amount:0,total:8})];return{checks,before,zero,after:NightAudio.getState()};
      });
      assert.ok(result.checks.every(x=>x.ok&&x.created>0));assert.deepEqual(result.zero,[false,false]);assert.equal(result.after.sourcesCreated,result.before.sourcesCreated);assert.equal(result.after.eventsPlayed,result.before.eventsPlayed);
      assert.equal(result.checks[4].cue,'cue:frostseal');assert.notDeepEqual(result.checks[0].frequencies,result.checks[1].frequencies);assert.notDeepEqual(result.checks[2].frequencies,result.checks[3].frequencies);report.statusEvents=result.checks;
    });
    await test('mute, zero volume and voice cap also govern sword storms and new-region sounds',async()=>{
      await reset();
      const result=await page.evaluate(()=>{
        NightAudio.preview('S16');const before=NightAudio.getState();NightAudio.setMuted(true);const muted=NightAudio.getState();const blocked=NightAudio.playEncounter('echo');
        NightAudio.setMuted(false);NightAudio.setVolume(0);const silent=NightAudio.playEvent({type:'attack',source:'player',cardId:'S16'});NightAudio.setVolume(.3);
        for(let i=0;i<40;i++)NightAudio.preview('S16');const burst=NightAudio.getState();NightAudio.setMuted(true);NightAudio.setMuted(false);return{before,muted,blocked,silent,burst,after:NightAudio.getState()};
      });
      assert.ok(result.before.activeVoices>0);assert.equal(result.muted.activeVoices,0);assert.equal(result.blocked,false);assert.equal(result.silent,false);
      assert.ok(result.burst.activeVoices<=56);assert.ok(result.burst.rejectedVoices>0);assert.equal(result.after.activeVoices,0);report.soundLimits=result;
    });
    await test('live new encounter requests succeed; no runtime network or uncaught script errors',async()=>{
      await reset();const result=await page.evaluate(async ids=>{const out=[];for(const id of ids){out.push(NightAudio.playEncounter(id));await new Promise(r=>setTimeout(r,300));}return{out,state:NightAudio.getState()};},newEncounters);
      assert.ok(result.out.every(Boolean));for(const id of newEncounters)assert.ok(result.state.encountersUsed.includes(id));
      assert.deepEqual(report.requests,[]);assert.deepEqual(report.errors,[]);report.finalLiveState=result.state;
    });
    report.browser=await browser.version();
  }finally{
    if(browser)await browser.close();report.passed=report.results.filter(r=>r.ok).length;report.failed=report.results.filter(r=>!r.ok).length;
    fs.writeFileSync(path.join(__dirname,'v8-sword-audio-results.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
  }
  if(report.failed)process.exitCode=1;
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
