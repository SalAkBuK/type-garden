import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { film,timeline as T,frameAt } from './renderer.mjs';
const fps=Number(process.argv[2]||T.fps),out=path.join(film,'output'),dir=path.join(out,`diagnostics-${fps}`);
fs.mkdirSync(dir,{recursive:true});
const clips=JSON.parse(fs.readFileSync(path.join(out,`draft-${fps}-manifest.json`)));
const at=i=>{const c=clips.find(c=>i>=c.startFrame&&i<c.startFrame+c.frames);return path.join(c.dir,`${String(i-c.startFrame).padStart(5,'0')}.png`);};
const run=(exe,args)=>{const r=spawnSync(exe,args,{maxBuffer:80*1024*1024});if(r.status!==0)throw Error(String(r.stderr));return r.stdout;};
function raw(file) {return run('ffmpeg',['-v','error','-i',file,'-vf','scale=540:540','-frames:v','1','-f','rawvideo','-pix_fmt','rgb24','-']);}
function compare(name,A,B){const a=raw(A),b=raw(B);let sum=0,max=0,changed=0;for(let i=0;i<a.length;i+=3){let d=0;for(let k=0;k<3;k++){const v=Math.abs(a[i+k]-b[i+k]);sum+=v;max=Math.max(max,v);d=Math.max(d,v);}if(d>3)changed++;}return {name,comparisonSize:540,meanAbsoluteChannelDifference:sum/a.length,pixelsChangedOver3:changed/(a.length/3),maxChannelDifference:max};}
const cues=[...T.events,...T.scenes.slice(1).map(s=>({id:`${s.id}-cut`,beat:s.startBeat})),...T.scenes.flatMap(s=>(s.hits||[]).map(h=>({id:`${s.id}-${h.look||h.material}`,beat:h.beat})))],items=[];
for(const e of cues){const i=frameAt(e.beat,fps);for(const d of [-1,0,1]){const file=path.join(dir,`${e.id}-${d+1}.png`);fs.copyFileSync(at(i+d),file);items.push({src:file,label:`${e.id} f${i+d}`});}}
const seams=T.scenes.slice(1).map(s=>{const i=frameAt(s.startBeat,fps);return compare(s.id,at(i-1),at(i));});
const approvedProofDiffs=[],recheck=path.join(out,'proof-recheck');
if(fs.existsSync(recheck))for(const name of fs.readdirSync(recheck).filter(n=>n.endsWith('.png'))){const ref=path.join(film,'reference','shots',name);if(fs.existsSync(ref))approvedProofDiffs.push(compare(name,ref,path.join(recheck,name)));}
const spec=path.join(dir,'sheet.json');fs.writeFileSync(spec,JSON.stringify({cols:3,w:270,gap:3,items}));
run(process.execPath,[path.join(film,'tools','sheet.mjs'),spec,path.join(out,`cues-${fps}.png`)]);
run('ffmpeg',['-v','error','-y','-ss','0.5','-i',path.join(out,`draft-${fps}.mp4`),'-vf','crop=240:160:290:0,scale=960:640:flags=neighbor','-frames:v','1',path.join(dir,'dark-gradient.png')]);
const motion=[];
for(let i=0;i<14;i++)motion.push(compare(`wither-${i}`,path.join(out,'benchmark','software-60',`${String(2*i).padStart(5,'0')}.png`),path.join(out,'benchmark','software-60',`${String(2*i+1).padStart(5,'0')}.png`)));
const report={fps,seams,approvedProofDiffs,sixtyFpsIntermediateMotion:motion,notes:{seams:'Hard cuts intentionally change palette. Wither to wick must retain the same skeleton.',proofs:'Original kf.mjs re-rendered preserved proof specs. Pixel differences measured at draft resolution, never auto-approved.',banding:'Inspect dark-gradient.png, enlarged encoded crop.',holds:'Title pre-roll and dead hold are intentional; review low-motion detections in context.'}};
fs.writeFileSync(path.join(out,`diagnostics-${fps}.json`),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
