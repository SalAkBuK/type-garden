import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { timeline as T,v2,beatSeconds } from './renderer.mjs';
const out=path.join(v2,'output');
const run=(args)=>{const r=spawnSync('ffmpeg',args,{encoding:'utf8',maxBuffer:16*1024*1024});if(r.status)throw Error(r.stderr);return r.stderr;};
export function audio(){
  fs.mkdirSync(out,{recursive:true});
  const sr=T.audio.sampleRate,duration=T.duration.numerator/T.duration.denominator,n=Math.round(sr*duration),L=new Float64Array(n),R=new Float64Array(n);
  const clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
  let seed=2407,low=0,previous=0;
  const noise=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return(seed>>>0)/2147483648-1;};
  for(let i=0;i<n;i++){
    const t=i/sr,b=t/beatSeconds;
    // A continuous harmonic arc; the beat grid governs duration, not a parade of accents.
    const opening=smooth(t/.8)*(1-.94*smooth((b-6)/3.4)),returning=smooth((b-16)/12)*(1-smooth((b-33)/6.8));
    const close=1-smooth((b-35)/5),fade=clamp((duration-t)/.7);
    const v= Math.sin(2*Math.PI*73.4162*t+.06*Math.sin(t*1.1))+.22*Math.sin(2*Math.PI*146.8324*t)+.10*Math.sin(2*Math.PI*220.2486*t);
    const fifth=Math.sin(2*Math.PI*110*t+.09*Math.sin(t*.71));
    const tension=Math.sin(2*Math.PI*77.7817*t+.12*Math.sin(t*.43));
    const upper=Math.sin(2*Math.PI*174.6141*t)+.55*Math.sin(2*Math.PI*220.02*t)+.23*Math.sin(2*Math.PI*293.6648*t);
    const raw=noise();low=low*.985+raw*.015;const breath=(low-previous);previous=low;
    const pad=(v*.036+fifth*.019+tension*.014)*(opening*.78+returning*.75)*fade;
    const lift=upper*.019*returning*fade;
    const air=low*.018*(opening+returning*.5)*close+breath*.032*opening;
    L[i]=pad+lift+air;R[i]=pad*.94+lift*.98+air*.75+Math.sin(2*Math.PI*109.86*t)*.007*(opening+returning)*fade;
  }
  const add=(at,length,fn,pan=0)=>{
    const first=Math.round(at*sr),count=Math.min(Math.round(length*sr),n-first);
    for(let i=0;i<count;i++){const v=fn(i/sr,i/count);L[first+i]+=v*(1-pan*.3);R[first+i]+=v*(1+pan*.3);}
  };
  const event=id=>T.events.find(e=>e.id===id).beat*beatSeconds;
  // Clothlike wing movement, soft contact, then a close liquid body impact.
  for(const [at,pan,gain]of [[.18,-.3,.014],[1.15,.2,.012],[2.5,.1,.009],[event('depart')+.35,.6,.008],[event('depart')+1.3,.9,.005]])
    add(at,.32,(t,p)=>noise()*gain*Math.sin(Math.PI*p)**2*Math.sin(2*Math.PI*47*t),pan);
  add(event('bite'),.21,t=>(noise()*.09+Math.sin(2*Math.PI*(97*t-14*t*t))*.085)*Math.exp(-t*30));
  add(event('bite')+.045,.46,t=>Math.sin(2*Math.PI*(51*t+2*(1-Math.exp(-t*11))))*.058*Math.exp(-t*11));
  add(event('release'),.55,(t,p)=>noise()*.011*Math.sin(Math.PI*p)**2);
  add(event('impact'),.72,t=>.30*Math.sin(2*Math.PI*(42*t+4.2*(1-Math.exp(-t*18))))*Math.exp(-t*9));
  add(event('impact'),.19,t=>noise()*.20*Math.exp(-t*43)+Math.sin(2*Math.PI*(142*t-55*t*t))*.11*Math.exp(-t*25));
  add(event('impact')+.055,.60,t=>Math.sin(2*Math.PI*587.33*t)*.018*Math.exp(-t*8));
  // A single slow opening of the harmony accompanies the retreat; no per-beat clicks.
  add(event('retreat')+.25,8.5,(t,p)=>Math.sin(2*Math.PI*146.8324*t+.04*Math.sin(t))*Math.sin(Math.PI*p)**2*.028,.15);
  add(event('portrait-hold')-.8,4.4,(t,p)=>(Math.sin(2*Math.PI*146.8324*t)+.6*Math.sin(2*Math.PI*220*t))*.025*smooth(t/.22)*Math.exp(-t*.8)*smooth((1-p)*5));
  const pcm=Buffer.alloc(44+n*4);pcm.write('RIFF');pcm.writeUInt32LE(pcm.length-8,4);pcm.write('WAVEfmt ',8);pcm.writeUInt32LE(16,16);pcm.writeUInt16LE(1,20);pcm.writeUInt16LE(2,22);pcm.writeUInt32LE(sr,24);pcm.writeUInt32LE(sr*4,28);pcm.writeUInt16LE(4,32);pcm.writeUInt16LE(16,34);pcm.write('data',36);pcm.writeUInt32LE(n*4,40);
  for(let i=0;i<n;i++){pcm.writeInt16LE(Math.round(Math.max(-1,Math.min(1,L[i]))*32767),44+i*4);pcm.writeInt16LE(Math.round(Math.max(-1,Math.min(1,R[i]))*32767),46+i*4);}
  const raw=path.join(out,'design-score-raw.wav'),wav=path.join(out,'design-score.wav');fs.writeFileSync(raw,pcm);
  const target=`I=${T.audio.integratedLufs}:TP=${T.audio.truePeakDb}:LRA=12`;
  const log=run(['-hide_banner','-i',raw,'-af',`loudnorm=${target}:print_format=json`,'-f','null','-']);
  const m=JSON.parse(log.slice(log.lastIndexOf('{'),log.lastIndexOf('}')+1));
  run(['-v','error','-y','-i',raw,'-af',`loudnorm=${target}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true,alimiter=limit=0.708:level=false:attack=2:release=80:latency=true`,'-ar',String(sr),wav]);
  fs.writeFileSync(path.join(out,'audio-normalization.json'),JSON.stringify({draftScore:true,target:T.audio,measuredRaw:m},null,2));
  return wav;
}
