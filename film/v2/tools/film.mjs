import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { openRenderer,timeline as T,v2,beatSeconds,frameAt } from './renderer.mjs';
import { audio } from './audio.mjs';
import { inspect } from './inspect.mjs';
const [cmd='timeline',...args]=process.argv.slice(2),out=path.join(v2,'output');fs.mkdirSync(out,{recursive:true});
if(args.includes('--full'))throw Error('Version 2 is draft-only until reviewed.');
const total=Math.round(T.duration.numerator/T.duration.denominator*T.fps);
let end=0;for(const s of T.scenes){if(s.startBeat!==end)throw Error('Timeline gap');end=s.endBeat;}
if(end!==40||total!==1600||T.fps!==60)throw Error('Expected 40 beats / 1600 frames / 60 fps');
const hash=v=>crypto.createHash('sha256').update(v).digest('hex');
const write=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2));
const run=(exe,argv)=>{const r=spawnSync(exe,argv,{encoding:'utf8',maxBuffer:32*1024*1024});if(r.status)throw Error(r.stderr);return r.stdout+r.stderr;};
const find=id=>{const s=T.scenes.find(s=>s.id===id);if(!s)throw Error('Unknown scene '+id);return s;};
async function frame(spec,destination){
  const [id,offset='0']=spec.split('@'),s=find(id),seconds=s.startBeat*beatSeconds+Number(offset);
  if(seconds<s.startBeat*beatSeconds||seconds>=s.endBeat*beatSeconds)throw Error('Offset must be inside scene');
  const r=await openRenderer();try{const {png,state}=await r.draw(seconds);fs.writeFileSync(destination,png);console.log(state);}finally{await r.browser.close();}
}
async function render(s){
  const dependencies=['timeline.json','tools/renderer.mjs'].map(p=>hash(fs.readFileSync(path.join(v2,p))));
  dependencies.push(hash(fs.readFileSync(path.join(v2,'..','..','index.html'))),hash(fs.readFileSync(path.join(v2,'..','tools','renderer.mjs'))));
  const key=hash(JSON.stringify({dependencies,s,fps:T.fps,size:T.draftSize})).slice(0,16),dir=path.join(v2,'cache',`${s.id}-${key}`),clip=path.join(dir,'clip.mp4'),manifest=path.join(dir,'manifest.json');
  if(fs.existsSync(clip)&&fs.existsSync(manifest)){console.log('cached',s.id);return {dir,clip,...JSON.parse(fs.readFileSync(manifest))};}
  fs.mkdirSync(dir,{recursive:true});const r=await openRenderer(),start=frameAt(s.startBeat),stop=frameAt(s.endBeat),hashes=[],states=[],begin=performance.now();
  console.log('rendering',s.id,start,'to',stop-1);
  try{
    for(let i=start;i<stop;i++){
      const {png,state}=await r.draw(i/T.fps);hashes.push(hash(png));states.push({frame:i,...state});fs.writeFileSync(path.join(dir,String(i-start).padStart(5,'0')+'.png'),png);
      if((i-start+1)%120===0)console.log(s.id,i-start+1,'/',stop-start);
    }
    if(r.errors.length)throw Error(r.errors.join('\n'));
  }finally{await r.browser.close();}
  run('ffmpeg',['-v','error','-y','-framerate',String(T.fps),'-i',path.join(dir,'%05d.png'),'-frames:v',String(stop-start),'-vf',`noise=alls=${T.filmGrain.strength}:allf=u:all_seed=${T.filmGrain.seed}`,'-c:v','libx264','-preset','fast','-crf','16','-pix_fmt','yuv420p',clip]);
  const result={id:s.id,key,startFrame:start,frames:stop-start,size:T.draftSize,fps:T.fps,hashes,states,elapsedMs:Math.round(performance.now()-begin)};write(manifest,result);console.log('rendered',s.id,result.frames,'frames',result.elapsedMs+'ms');return {dir,clip,...result};
}
async function sheet(items,destination,onion=false){
  if(onion){
    const images=items.map(it=>fs.readFileSync(it.src).toString('base64')),r=await openRenderer();
    try{const data=await r.page.evaluate(async images=>{const c=document.createElement('canvas');c.width=c.height=540;const g=c.getContext('2d');g.fillStyle='#000';g.fillRect(0,0,540,540);g.globalAlpha=1/images.length;for(const data of images){const img=new Image();img.src='data:image/png;base64,'+data;await img.decode();g.drawImage(img,0,0);}return c.toDataURL('image/png');},images);fs.writeFileSync(destination,Buffer.from(data.split(',')[1],'base64'));}finally{await r.browser.close();}
  }else{const spec=destination.replace('.png','.json');write(spec,{cols:4,w:320,items});run(process.execPath,[path.join(v2,'..','tools','sheet.mjs'),spec,destination]);}
}
async function draft(){
  const clips=[];for(const s of T.scenes)clips.push(await render(s));
  const list=path.join(out,'clips.txt');fs.writeFileSync(list,clips.map(c=>`file '${c.clip.replaceAll('\\','/').replaceAll("'","'\\''")}'`).join('\n'));
  const silent=path.join(out,'rose-garden-v2-draft-silent.mp4'),video=path.join(out,'rose-garden-v2-draft.mp4');
  run('ffmpeg',['-v','error','-y','-f','concat','-safe','0','-i',list,'-c','copy',silent]);
  const wav=audio();run('ffmpeg',['-v','error','-y','-i',silent,'-i',wav,'-c:v','copy','-c:a','aac','-b:a','192k','-t',String(T.duration.numerator/T.duration.denominator),'-movflags','+faststart',video]);
  write(path.join(out,'draft-manifest.json'),clips);
  const items=[];for(const c of clips)for(const q of [0,.5,.99]){const i=Math.floor(q*(c.frames-1));items.push({src:path.join(c.dir,String(i).padStart(5,'0')+'.png'),label:`${c.id} · ${((c.startFrame+i)/T.fps).toFixed(2)}s`});}
  await sheet(items,path.join(out,'draft-contact-sheet.png'));
  await inspect(video,clips);console.log('draft',video);
}
if(cmd==='timeline')console.log(JSON.stringify({concept:T.concept,fps:T.fps,frames:total,duration:T.duration.numerator/T.duration.denominator,scenes:T.scenes.map(s=>({...s,startFrame:frameAt(s.startBeat),endFrame:frameAt(s.endBeat)})),events:T.events.map(e=>({...e,frame:frameAt(e.beat),seconds:e.beat*beatSeconds}))},null,2));
else if(cmd==='keyframes')run(process.execPath,[path.join(v2,'tools','keyframes.mjs')]);
else if(cmd==='frame')await frame(args[0],path.resolve(args[1]||path.join(out,'frame.png')));
else if(cmd==='render')await render(find(args[0]));
else if(cmd==='draft')await draft();
else if(cmd==='audio')console.log(audio());
else if(cmd==='audio-analysis')console.log(run('ffmpeg',['-hide_banner','-i',args[0]||path.join(out,'design-score.wav'),'-af','ebur128=peak=true','-f','null','-']));
else if(cmd==='inspect')await inspect(path.resolve(args[0]||path.join(out,'rose-garden-v2-draft.mp4')));
else if(['strip','onion'].includes(cmd)){
  const c=await render(find(args[0])),items=[];for(let i=0;i<8;i++){const j=Math.floor((c.frames-1)*i/7);items.push({src:path.join(c.dir,String(j).padStart(5,'0')+'.png'),label:`${c.id}@${(j/T.fps).toFixed(2)}`});}await sheet(items,path.join(out,`${c.id}-${cmd}.png`),cmd==='onion');
}else throw Error('Commands: timeline, keyframes, frame scene@time, strip, onion, render, draft, audio, audio-analysis, inspect. Draft-only.');
