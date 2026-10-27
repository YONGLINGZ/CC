/* Original offline score: 灯下行. All voices are synthesized here, no samples or requests. */
(function(root,factory){const api=factory(root);root.NightMusic=api;if(typeof module==='object'&&module.exports)module.exports=api;})(typeof window==='object'?window:globalThis,function(root){
 'use strict';
 const SCORE=Object.freeze({id:'lantern-path',name:'灯下行',bpm:72,bars:24,beatsPerBar:4,duration:80,scale:'D宫五声',instruments:'仿古琴拨弦、轻箫与稀疏泛音',description:'雾中缓行，灯下调息。无鼓点、无强烈高潮的舒缓循环主题。'});
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),TAU=Math.PI*2;
 // D E F# A B; phrases leave breathing room rather than filling every beat.
 const FLUTE=[
  [],[[.5,69,2.3]],[[0,71,1.4],[2,74,1.5]],[[0,71,2.8]],
  [[.5,69,1.3],[2.5,66,1]],[[0,64,2.7]],[[.5,66,1.2],[2.5,69,1.1]],[[0,62,2.8]],
  [],[[.5,66,2.2]],[[0,69,1.5],[2.5,71,1]],[[0,74,2.8]],
  [[.5,76,1.1],[2,74,1.6]],[[0,71,2.7]],[[.5,69,1.1],[2.5,66,1]],[[0,64,2.7]],
  [],[[.5,69,2.3]],[[0,71,1.3],[2,74,1.4]],[[.5,69,2.4]],
  [[0,66,1.5],[2.5,64,1]],[[.5,62,2.3]],[[0,64,1.2],[2,66,1.2]],[[0,62,2.8]]
 ];
 const HARMONY=[[50,57,64],[50,59,66],[47,54,62],[45,52,59],[50,57,66],[52,59,66],[45,57,64],[50,57,62]];
 function scoreEvents(){
  const events=[];
  for(let bar=0;bar<SCORE.bars;bar++){
   const chord=HARMONY[bar%8],phrase=Math.floor(bar/8);
   events.push({voice:'qin',beat:bar*4+.035,midi:chord[0],duration:4.8,level:.15,pan:-.2});
   if(bar%4!==3)events.push({voice:'qin',beat:bar*4+1.53,midi:chord[1],duration:3.8,level:.105,pan:.22});
   if(bar%2===0)events.push({voice:'qin',beat:bar*4+2.76,midi:chord[2],duration:3.3,level:.08,pan:-.08});
   // Small answering phrases in the third verse; no build-up in volume.
   if(phrase===2&&bar%4===1)events.push({voice:'qin',beat:bar*4+3.02,midi:chord[1]+12,duration:2.5,level:.045,pan:.28});
   for(const [beat,midi,length]of FLUTE[bar])events.push({voice:'xiao',beat:bar*4+beat+.02,midi,duration:length*60/SCORE.bpm,level:.075,pan:.08});
   if(bar%8===6)events.push({voice:'harmonic',beat:bar*4+2,midi:chord[2]+12,duration:5.5,level:.035,pan:-.3});
  }
  return events;
 }
 function renderPCM(options={}){
  const sampleRate=clamp(Math.round(Number(options.sampleRate)||22050),8000,48000),frames=Math.round(SCORE.duration*sampleRate);
  const channels=[new Float32Array(frames),new Float32Array(frames)],events=scoreEvents();
  let noiseSeed=0x6b29dc51;
  const noise=()=>{noiseSeed=(Math.imul(noiseSeed,1664525)+1013904223)>>>0;return noiseSeed/2147483648-1;};
  for(const e of events){
   const start=Math.round(e.beat*60/SCORE.bpm*sampleRate),freq=440*2**((e.midi-69)/12),count=Math.round(e.duration*sampleRate);
   const left=Math.cos((e.pan+1)*Math.PI/4),right=Math.sin((e.pan+1)*Math.PI/4);
   let phase=0,air=0;
   for(let i=0;i<count;i++){
    const t=i/sampleRate;let value;
    if(e.voice==='xiao'){
     const a=clamp(t/.22,0,1),release=clamp((e.duration-t)/.43,0,1);
     const breath=Math.sin(Math.PI*clamp(t/e.duration,0,1))**.28;
     phase+=TAU*freq/sampleRate*(1+.0018*Math.sin(TAU*4.3*t)*clamp((t-.28)/.6,0,1));
     air=.86*air+.14*noise();
     value=(Math.sin(phase)+.12*Math.sin(phase*2)+.035*Math.sin(phase*3)+air*.035)*a*release*breath;
    }else{
     phase+=TAU*freq/sampleRate*(1+.002*Math.exp(-t*22));
     const decay=e.voice==='harmonic'?2.9:1.45,env=(1-Math.exp(-t*120))*Math.exp(-t/decay)*clamp((e.duration-t)/.25,0,1);
     value=(Math.sin(phase)+.38*Math.exp(-t*1.3)*Math.sin(phase*2)+.16*Math.exp(-t*2.3)*Math.sin(phase*3)+.055*Math.exp(-t*4)*Math.sin(phase*5))*env;
    }
    const index=(start+i)%frames,s=value*e.level;
    channels[0][index]+=s*left;channels[1][index]+=s*right;
   }
  }
  // Circular early reflections carry the previous phrase across the loop seam.
  // They are rendered from a dry copy so no feedback or runtime nodes accumulate.
  const dry=channels.map(c=>new Float32Array(c));
  for(let c=0;c<2;c++)for(const [delay,amount]of [[.113,.12],[.241,.085],[.397,.045]]){
   const d=Math.round(delay*sampleRate),source=dry[1-c];
   for(let i=0;i<frames;i++)channels[c][i]+=source[(i-d+frames)%frames]*amount;
  }
  for(const ch of channels)for(let i=0;i<frames;i++)ch[i]=ch[i]/(1+Math.abs(ch[i])*.5);
  return {sampleRate,duration:SCORE.duration,channels,score:{...SCORE},events};
 }
 const state={context:null,bus:null,buffer:null,source:null,preparing:null,enabled:true,volume:.55,master:.3,muted:false,hidden:false,offset:0,startedAt:0,stopTimer:null,lastError:'',starts:0};
 function wantsPlayback(){return state.enabled&&!state.muted&&!state.hidden&&state.volume>0&&state.master>0;}
 function stopNow(){if(state.stopTimer){clearTimeout(state.stopTimer);state.stopTimer=null;}if(state.source){const s=state.source;state.offset=(state.offset+state.context.currentTime-state.startedAt)%SCORE.duration;state.source=null;try{s.stop();s.disconnect();}catch(_){}}}
 function gainTo(value,duration=.55){const ctx=state.context,gain=state.bus?.gain;if(!ctx||!gain)return;gain.cancelScheduledValues(ctx.currentTime);gain.setValueAtTime(gain.value,ctx.currentTime);gain.linearRampToValueAtTime(value,ctx.currentTime+duration);}
 function sync(){
  if(!state.context||!state.bus)return;
  if(wantsPlayback()&&state.buffer&&state.context.state==='running'){
   if(state.stopTimer){clearTimeout(state.stopTimer);state.stopTimer=null;}
   if(!state.source){const source=state.context.createBufferSource();source.buffer=state.buffer;source.loop=true;source.loopStart=0;source.loopEnd=SCORE.duration;source.connect(state.bus);source.start(0,state.offset);state.startedAt=state.context.currentTime;state.source=source;state.starts++;}
   gainTo(state.master*state.volume*.9,.8);
  }else{
   gainTo(0,.16);if(state.source&&!state.stopTimer)state.stopTimer=setTimeout(()=>{state.stopTimer=null;if(!wantsPlayback())stopNow();},200);
  }
 }
 async function attach(ctx){
  if(!ctx||ctx.state==='closed')return false;
  try{
   if(state.context&&state.context!==ctx){stopNow();state.bus?.disconnect();state.buffer=null;}
   state.context=ctx;
   if(!state.bus||state.bus.context!==ctx){state.bus=ctx.createGain();state.bus.gain.value=0;state.bus.connect(ctx.destination);}
   if(!state.buffer&&!state.preparing)state.preparing=(async()=>{await new Promise(r=>setTimeout(r,0));const pcm=renderPCM(),buffer=ctx.createBuffer(2,pcm.channels[0].length,pcm.sampleRate);pcm.channels.forEach((channel,i)=>buffer.copyToChannel(channel,i));state.buffer=buffer;return buffer;})().finally(()=>{state.preparing=null;});
   if(state.preparing)await state.preparing;sync();return true;
  }catch(e){state.lastError=String(e?.message||e);return false;}
 }
 function setEnabled(value){state.enabled=!!value;sync();return state.enabled;}
 function setVolume(value){const n=Number(value);if(Number.isFinite(n))state.volume=clamp(n,0,1);sync();return state.volume;}
 function setMaster(muted,volume){state.muted=!!muted;const n=Number(volume);if(Number.isFinite(n))state.master=clamp(n,0,1);sync();}
 function setHidden(value){state.hidden=!!value;if(!state.hidden&&wantsPlayback()&&state.context?.state==='suspended')void state.context.resume().then(sync).catch(()=>{});sync();}
 function getState(){return {enabled:state.enabled,volume:state.volume,playing:!!state.source&&wantsPlayback(),ready:!!state.buffer,preparing:!!state.preparing,activeSources:state.source?1:0,starts:state.starts,hidden:state.hidden,lastError:state.lastError,score:{...SCORE}};}
 if(root.document){state.hidden=!!root.document.hidden;root.document.addEventListener('visibilitychange',()=>setHidden(root.document.hidden));root.addEventListener('pagehide',()=>{state.hidden=true;stopNow();});root.addEventListener('pageshow',()=>setHidden(root.document.hidden));}
 return {getState,attach,setEnabled,setVolume,setMaster,setHidden,renderPCM,scoreEvents,score:Object.freeze({...SCORE})};
});
