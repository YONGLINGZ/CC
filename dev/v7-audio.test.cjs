/* Actual offline sound renders for the sovereign, clues and weapon disruption. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const source=fs.readFileSync(path.join(__dirname,'audio.js'),'utf8'),report={audioSha256:crypto.createHash('sha256').update(source).digest('hex'),passed:0,failed:0,errors:[],externalRequests:[]};
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))report.externalRequests.push(r.url());});await page.setContent('<button id="go">开启声音</button>');await page.addScriptTag({content:source});
  async function render(ids,method){return page.evaluate(async({ids,method})=>{const r=await NightAudio[method](ids),a=r.channels[0],rate=r.sampleRate;return ids.map((id,j)=>{let peak=0,sum=0,h=2166136261;const start=Math.round(j*1.2*rate),end=Math.round((j*1.2+1.05)*rate);for(let i=start;i<end;i++){peak=Math.max(peak,Math.abs(a[i]));sum+=a[i]*a[i];h=Math.imul(h^Math.round(a[i]*32767),16777619);}return {id,peak,rms:Math.sqrt(sum/(end-start)),hash:h>>>0};});},{ids,method});}
  report.cards=await render(Array.from({length:12},(_,i)=>'F'+String(i+1).padStart(2,'0')),'renderOffline');assert.equal(new Set(report.cards.map(x=>x.hash)).size,12);for(const x of report.cards){assert.ok(x.rms>.0004);assert.ok(x.peak<.85);}report.passed++;
  report.events=await render(['moon_trace','sealed_name','moon_vow','armory','sovereign_wake','sovereign_recall','sovereign_memory'],'renderEncountersOffline');assert.equal(new Set(report.events.map(x=>x.hash)).size,7);for(const x of report.events){assert.ok(x.rms>.0004);assert.ok(x.peak<.85);}report.passed++;
  await page.evaluate(()=>document.querySelector('#go').onclick=()=>NightAudio.unlock());await page.click('#go');await page.waitForFunction(()=>NightAudio.getState().unlocked);report.cues=await page.evaluate(async()=>{const out=[];for(const type of ['soul','environment','weapon','powerRecovered']){out.push({type,ok:NightAudio.playEvent({type,amount:2,rebellious:true})});await new Promise(r=>setTimeout(r,200));}return out;});assert.ok(report.cues.every(x=>x.ok));report.passed++;
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.externalRequests,[]);report.passed++;
 }catch(e){report.failed++;report.error=e.stack;process.exitCode=1;}finally{await browser.close();fs.writeFileSync(path.join(__dirname,'v7-audio-results.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));}
})();
