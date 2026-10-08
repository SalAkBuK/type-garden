import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { openRenderer, timeline as T, beatSeconds, frameAt, film, root } from './renderer.mjs';
const [command='timeline',...args]=process.argv.slice(2);
const fps=Number(args.find(a=>a.startsWith('--fps='))?.split('=')[1]||T.fps);
const size=args.includes('--full')?T.squareSize:T.squareSize/2;
const software=!args.includes('--gpu');
const out=path.join(film,'output');fs.mkdirSync(out,{recursive:true});
const run=(exe,argv)=>{const r=spawnSync(exe,argv,{encoding:'utf8',maxBuffer:32*1024*1024});if(r.status!==0)throw Error(`${exe}: ${r.stderr}`);return r.stdout+r.stderr;};
const write=(file,value)=>fs.writeFileSync(file,JSON.stringify(value,null,2));
const hash=v=>crypto.createHash('sha256').update(v).digest('hex');
const duration=T.duration.numerator/T.duration.denominator;
if(![30,60].includes(fps))throw Error('Use 30 or 60 fps to keep every beat and cut on an exact frame.');
const total=Math.round(duration*fps);
function validate() {
  if(Math.abs(total-T.bars*T.beatsPerBar*beatSeconds*fps)>1e-7)throw Error('Beat grid / duration mismatch');
  let end=0;
  for(const s of T.scenes){if(s.startBeat!==end)throw Error(`Gap or overlap at ${s.id}`);end=s.endBeat;
    for(const beat of [s.startBeat,s.endBeat,...(s.hits||[]).map(h=>h.beat)])if(Math.abs(beat*beatSeconds*fps-frameAt(beat,fps))>1e-7)throw Error('Off-frame cut');}
  if(end!==40)throw Error('Expected ten bars');
}
validate();
function find(id) {const s=T.scenes.find(s=>s.id===id);if(!s)throw Error(`Unknown scene ${id}`);return s;}
function locate(seconds) {return T.scenes.find(s=>seconds>=s.startBeat*beatSeconds&&seconds<s.endBeat*beatSeconds)||T.scenes.at(-1);}
async function frame(spec,filename) {
  const [id,offset='0']=spec.split('@'),s=find(id),sec=s.startBeat*beatSeconds+Number(offset);
  if(sec<s.startBeat*beatSeconds||sec>=s.endBeat*beatSeconds)throw Error('Frame time is local to scene and must be inside it');
  const r=await openRenderer({size,software,highPerformance:!software});
  try{for(let i=frameAt(s.startBeat,fps);i<Math.floor(sec*fps+1e-7);i++)await r.draw(s,i/fps);fs.writeFileSync(filename,await r.draw(s,sec));if(r.errors.length)throw Error(r.errors.join('\n'));}finally{await r.browser.close();}
}
async function sheet(items,filename,onion=false) {
  const r=await openRenderer({size,software,highPerformance:!software});
  try {
    const png=await r.page.evaluate(async ({items,onion})=>{
      const images=await Promise.all(items.map(it=>new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=it.src;})));
      const w=270,h=300,cols=onion?1:Math.min(4,items.length),rows=onion?1:Math.ceil(items.length/cols);
      const c=document.createElement('canvas');c.width=cols*w;c.height=rows*h;const g=c.getContext('2d');g.fillStyle='#171316';g.fillRect(0,0,c.width,c.height);
      for(let i=0;i<items.length;i++){const x=onion?0:(i%cols)*w,y=onion?0:Math.floor(i/cols)*h;g.globalAlpha=onion?1/items.length:1;g.drawImage(images[i],x,y,w,w);g.globalAlpha=1;if(!onion){g.fillStyle='#ded2cc';g.font='12px monospace';g.fillText(items[i].label,x+7,y+w+19);}}
      return c.toDataURL('image/png');
    },{items:items.map(it=>({...it,src:'data:image/png;base64,'+fs.readFileSync(it.file).toString('base64')})),onion});
    fs.writeFileSync(filename,Buffer.from(png.split(',')[1],'base64'));
  }finally{await r.browser.close();}
}
const fingerprints=[path.join(root,'index.html'),path.join(film,'tools','renderer.mjs'),path.join(film,'timeline.json')].map(f=>hash(fs.readFileSync(f)));
async function render(s) {
  const key=hash(JSON.stringify({fingerprints,s,fps,size,software})).slice(0,16);
  const dir=path.join(film,'cache',`${s.id}-${key}`),clip=path.join(dir,'clip.mp4'),manifest=path.join(dir,'manifest.json');
  if(fs.existsSync(manifest)&&fs.existsSync(clip)){console.log('cached',s.id);return {dir,clip,...JSON.parse(fs.readFileSync(manifest))};}
  fs.mkdirSync(dir,{recursive:true});
  const r=await openRenderer({size,software,highPerformance:!software}),start=frameAt(s.startBeat,fps),end=frameAt(s.endBeat,fps),hashes=[],cueSamples=[],t0=performance.now();
  try {
    for(let i=start;i<end;i++) {const png=await r.draw(s,i/fps);hashes.push(hash(png));fs.writeFileSync(path.join(dir,`${String(i-start).padStart(5,'0')}.png`),png);
      if(s.id==='opening'&&T.events.filter(e=>['bite','impact'].includes(e.id)).some(e=>[frameAt(e.beat,fps)-1,frameAt(e.beat,fps)].includes(i)))cueSamples.push({frame:i,...await r.page.evaluate(()=>({bit:window.__typeGarden.stage.sim.bit,stains:window.__typeGarden.stage.stains.length,physicalCues:window.__film.physicalCues}))});
    }
    if(r.errors.length)throw Error(r.errors.join('\n'));
  }finally{await r.browser.close();}
  run('ffmpeg',['-v','error','-y','-framerate',String(fps),'-i',path.join(dir,'%05d.png'),'-frames:v',String(end-start),'-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p',clip]);
  const m={id:s.id,key,fps,size,startFrame:start,frames:end-start,hashes,cueSamples,elapsedMs:Math.round(performance.now()-t0)};write(manifest,m);console.log('rendered',s.id,m.frames,'frames',m.elapsedMs,'ms');return {dir,clip,...m};
}
function audio() {
  const sr=T.audio.sampleRate,n=Math.round(duration*sr),a=new Float64Array(n),b=new Float64Array(n);
  let rand=4242;const noise=()=>{rand=(Math.imul(rand,1664525)+1013904223)|0;return(rand>>>0)/2147483648-1;};
  const add=(start,len,fn)=>{const first=Math.round(start*sr),count=Math.min(Math.round(len*sr),n-first);for(let i=0;i<count;i++){const t=i/sr,v=fn(t,i/count);a[first+i]+=v;b[first+i]+=v*0.94;}};
  for(let i=0;i<n;i++){
    const t=i/sr,beat=t/beatSeconds;
    let energy=beat<20?0.7:beat<27?0.7*(27-beat)/7:beat<28?0.015:beat<32?(beat-28)/4:beat<33?0.08:0.55;
    const fade=Math.min(1,t/1.5,(duration-t)/2),pad=(Math.sin(2*Math.PI*55*t)+0.4*Math.sin(2*Math.PI*82.4069*t)+0.3*Math.sin(2*Math.PI*110.1*t));
    a[i]=pad*0.06*energy*fade;b[i]=(pad+0.12*Math.sin(2*Math.PI*82.51*t))*0.06*energy*fade;
  }
  const bell=(beat,freq,gain=0.13)=>add(beat*beatSeconds,2.3,(t)=>gain*Math.exp(-t*3)*(Math.sin(t*freq*2*Math.PI)+0.25*Math.sin(t*freq*5.4*Math.PI)));
  for(const e of T.events){if(e.sound==='sub-drop'){add(e.beat*beatSeconds,1.4,t=>0.28*Math.sin(2*Math.PI*(45*t+8*(1-Math.exp(-t*12))))*Math.exp(-t*5));bell(e.beat,660);}if(e.sound==='wet-pluck')add(e.beat*beatSeconds,0.16,t=>noise()*0.12*Math.exp(-t*40));}
  const bite=T.events.find(e=>e.id==='bite').beat,opening=T.scenes.find(s=>s.id==='opening'),world=T.scenes.find(s=>s.id==='worlds');
  for(let beat=bite;beat<opening.endBeat;beat++)add(beat*beatSeconds,0.32,t=>0.08*Math.sin(2*Math.PI*52*t)*Math.exp(-t*17));
  for(let beat=world.startBeat;beat<world.endBeat;beat++)add(beat*beatSeconds,0.38,t=>0.15*Math.sin(2*Math.PI*(48*t+4*(1-Math.exp(-t*16))))*Math.exp(-t*13));
  for(const s of T.scenes)for(const hit of s.hits||[])bell(hit.beat,220*Math.pow(2,(hit.beat-8)/12),s.id==='worlds'?0.12:0.08);
  bell(16,880,0.08);
  for(let beat=21;beat<27;beat+=0.5)add(beat*beatSeconds,0.06,t=>noise()*0.024*Math.exp(-t*75));
  const title=T.scenes.at(-1);let key=title.typeStartBeat;
  for(const ch of title.text){add(key*beatSeconds,0.045,t=>noise()*0.07*Math.exp(-t*95));key+=ch===' '?title.spaceStepBeats:title.keyStepBeats;}
  bell(title.bloomHoldBeat,523.251,0.14);
  const pcm=Buffer.alloc(44+n*4);pcm.write('RIFF');pcm.writeUInt32LE(pcm.length-8,4);pcm.write('WAVEfmt ',8);pcm.writeUInt32LE(16,16);pcm.writeUInt16LE(1,20);pcm.writeUInt16LE(2,22);pcm.writeUInt32LE(sr,24);pcm.writeUInt32LE(sr*4,28);pcm.writeUInt16LE(4,32);pcm.writeUInt16LE(16,34);pcm.write('data',36);pcm.writeUInt32LE(n*4,40);
  for(let i=0;i<n;i++){pcm.writeInt16LE(Math.round(Math.max(-1,Math.min(1,a[i]))*32767),44+i*4);pcm.writeInt16LE(Math.round(Math.max(-1,Math.min(1,b[i]))*32767),46+i*4);}
  const raw=path.join(out,'soundtrack-raw.wav'),wav=path.join(out,'soundtrack.wav');fs.writeFileSync(raw,pcm);
  const first=run('ffmpeg',['-hide_banner','-i',raw,'-af',`loudnorm=I=${T.audio.integratedLufs}:TP=${T.audio.truePeakDb}:LRA=11:print_format=json`,'-f','null','-']);
  const m=JSON.parse(first.slice(first.lastIndexOf('{'),first.lastIndexOf('}')+1));
  run('ffmpeg',['-v','error','-y','-i',raw,'-af',`loudnorm=I=${T.audio.integratedLufs}:TP=${T.audio.truePeakDb}:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`,'-ar',String(sr),wav]);
  return wav;
}
function inspect(video,clips=[]) {
  const manifest=path.join(out,`draft-${fps}-manifest.json`);
  if(!clips.length&&fs.existsSync(manifest))clips=JSON.parse(fs.readFileSync(manifest));
  const probe=JSON.parse(run('ffprobe',['-v','error','-count_frames','-show_streams','-show_format','-of','json',video]));
  const v=probe.streams.find(s=>s.codec_type==='video');
  const log=run('ffmpeg',['-hide_banner','-i',video,'-vf','blackdetect=d=0.1:pix_th=0.02:pic_th=0.99,freezedetect=n=-50dB:d=0.5,signalstats,metadata=print','-af','ebur128=peak=true','-f','null','-']);
  fs.writeFileSync(path.join(out,`inspection-${fps}.log`),log);
  const duplicates=clips.flatMap(c=>c.hashes.flatMap((h,i)=>i&&h===c.hashes[i-1]?[{scene:c.id,frame:c.startFrame+i}]:[]));
  const cues=[...T.events,...T.scenes.flatMap(s=>(s.hits||[]).map(h=>({id:`${s.id}:${h.look||h.material}`,beat:h.beat})))].map(e=>({...e,frame:frameAt(e.beat,fps),seconds:e.beat*beatSeconds}));
  const audioLog=log.slice(log.lastIndexOf('Summary:')).split('[Parsed_metadata')[0].trim();
  const cueSamples=clips.find(c=>c.id==='opening')?.cueSamples||[];
  const physicalCueChecks=T.events.filter(e=>['bite','impact'].includes(e.id)).map(e=>{
    const f=frameAt(e.beat,fps),before=cueSamples.find(s=>s.frame===f-1),on=cueSamples.find(s=>s.frame===f);
    return {id:e.id,frame:f,before,on,pass:before&&on ? e.id==='bite' ? !before.bit&&on.bit : before.stains===0&&on.stains>0 : null};
  });
  const result={video,expectedFrames:total,actualFrames:Number(v.nb_read_frames),frameCountPass:Number(v.nb_read_frames)===total,resolution:[v.width,v.height],duration:probe.format.duration,cues,physicalCueChecks,exactDuplicateFrames:duplicates,blackAndFreezeEvents:log.split('\n').filter(l=>/black_start:|freeze_start:|freeze_end:/.test(l)),audioSummary:audioLog,reviewRequired:['Inspect seams/contact sheet','Inspect dark-gradient crops for banding','Review material movement and pause-earned bloom','Compare approved proof frames separately; film crops are designed layers']};
  write(path.join(out,`qa-${fps}.json`),result);console.log(JSON.stringify({frameCountPass:result.frameCountPass,actualFrames:result.actualFrames,audioSummary:result.audioSummary,duplicateFrames:duplicates.length,blackAndFreezeEvents:result.blackAndFreezeEvents},null,2));
  if(!result.frameCountPass)throw Error('Frame count mismatch');if(physicalCueChecks.some(c=>c.pass===false))throw Error('Physical cue misalignment');return result;
}
async function draft() {
  const clips=[];for(const s of T.scenes)clips.push(await render(s));
  // concat demuxer: safe forward-slash paths; clips share codec, size, rate.
  const list=path.join(out,'clips.txt');fs.writeFileSync(list,clips.map(c=>`file '${c.clip.replaceAll('\\','/').replaceAll("'","'\\''")}'`).join('\n'));
  const silent=path.join(out,`draft-${fps}-silent.mp4`),video=path.join(out,`draft-${fps}.mp4`);
  run('ffmpeg',['-v','error','-y','-f','concat','-safe','0','-i',list,'-c','copy',silent]);
  const wav=audio();run('ffmpeg',['-v','error','-y','-i',silent,'-i',wav,'-vf',`noise=alls=${T.filmGrain.strength}:allf=t+u:all_seed=${T.filmGrain.seed}`,'-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-t',String(duration),'-movflags','+faststart',video]);
  const items=[];
  for(const c of clips){for(const q of [0,0.5,0.98]){const i=Math.floor(q*(c.frames-1));items.push({file:path.join(c.dir,`${String(i).padStart(5,'0')}.png`),label:`${c.id} ${((c.startFrame+i)/fps).toFixed(2)}s`});}}
  await sheet(items,path.join(out,`contact-${fps}.png`));write(path.join(out,`draft-${fps}-manifest.json`),clips);inspect(video,clips);
}
if(command==='timeline')console.log(JSON.stringify({duration,displaySeconds:26.7,fps,totalFrames:total,framesPerBeat:beatSeconds*fps,scenes:T.scenes.map(s=>({id:s.id,startFrame:frameAt(s.startBeat,fps),endFrame:frameAt(s.endBeat,fps),seconds:[s.startBeat*beatSeconds,s.endBeat*beatSeconds]}))},null,2));
else if(command==='frame')await frame(args[0],path.resolve(args[1]&&!args[1].startsWith('--')?args[1]:path.join(out,'frame.png')));
else if(command==='render')await render(find(args[0]));
else if(command==='draft')await draft();
else if(command==='audio')console.log(audio());
else if(command==='audio-analysis')console.log(run('ffmpeg',['-hide_banner','-i',args[0]||path.join(out,'soundtrack.wav'),'-af','ebur128=peak=true','-f','null','-']));
else if(command==='inspect')inspect(path.resolve(args[0]||path.join(out,`draft-${fps}.mp4`)));
else if(['strip','onion'].includes(command)) {
  const s=find(args[0]),items=[],c=await render(s);
  for(let i=0;i<8;i++){const index=Math.floor((c.frames-1)*i/7),file=path.join(c.dir,`${String(index).padStart(5,'0')}.png`);items.push({file,label:`${s.id}@${(index/fps).toFixed(2)}`});}
  await sheet(items,path.join(out,`${s.id}-${command}.png`),command==='onion');
}else throw Error('Commands: timeline, frame scene@seconds [path], strip scene, onion scene, render scene, draft, audio, audio-analysis [file], inspect [video]. Flags: --fps=30|60 --full --gpu');
