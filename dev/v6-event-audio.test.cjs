/* Actual offline waveform rendering for the thirteen linked/sect encounters. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const ids=['liu_first','liu_return','liu_final','ji_first','ji_return','ji_final','wen_first','wen_return','wen_final','sect_duel','herb_caravan','relic_dispute','night_watch'];
(async()=>{
  const source=fs.readFileSync(path.join(__dirname,'audio.js'),'utf8');
  const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  const result={audioSha256:crypto.createHash('sha256').update(source).digest('hex'),passed:0,failed:0,errors:[],externalRequests:[],note:'Actual Chromium OfflineAudioContext; no human listening evaluation.'};
  try{
    const page=await browser.newPage();page.on('pageerror',e=>result.errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))result.externalRequests.push(r.url());});
    await page.setContent('<button>音效</button>');await page.addScriptTag({content:source});
    result.waveforms=await page.evaluate(async ids=>{
      if(!ids.every(id=>NightAudio.encounters.includes(id)))throw Error('Missing encounter sound');
      const before=NightAudio.getState(),rendered=await NightAudio.renderEncountersOffline(ids),a=rendered.channels[0],rate=rendered.sampleRate;
      const values=ids.map((id,j)=>{let peak=0,sum=0,hash=2166136261;const start=Math.round(j*1.2*rate),end=Math.round((j*1.2+1.05)*rate);for(let i=start;i<end;i++){const x=a[i];peak=Math.max(peak,Math.abs(x));sum+=x*x;hash=Math.imul(hash^Math.round(x*32767),16777619);}return {id,peak,rms:Math.sqrt(sum/(end-start)),hash:hash>>>0};});
      return {values,before,after:NightAudio.getState(),rejected:rendered.rejectedVoices};
    },ids);
    assert.equal(result.waveforms.values.length,13);assert.equal(new Set(result.waveforms.values.map(x=>x.hash)).size,13);for(const x of result.waveforms.values){assert.ok(x.rms>.0004,x.id+' silent');assert.ok(x.peak<.85,x.id+' clips');}result.passed++;
    assert.equal(result.waveforms.rejected,0);assert.equal(result.waveforms.before.contextState,'not-created');assert.equal(result.waveforms.after.contextState,'not-created');assert.equal(result.waveforms.after.sourcesCreated,0);result.passed++;
    assert.deepEqual(result.errors,[]);assert.deepEqual(result.externalRequests,[]);result.passed++;
  }catch(error){result.failed++;result.error=error.stack;process.exitCode=1;}finally{await browser.close();fs.writeFileSync(path.join(__dirname,'v6-event-audio-results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));}
})();
