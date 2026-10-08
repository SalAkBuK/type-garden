import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { timeline as T,v3 } from './renderer.mjs';

// Review media uses already rendered stills only. It never captures a motion sequence.
if(process.argv.includes('--full'))throw Error('Final rendering is held for draft review.');
const out=path.join(v3,'output'),thumbs=path.join(out,'board-tiles');
fs.mkdirSync(thumbs,{recursive:true});
const run=(exe,args)=>{
  const r=spawnSync(exe,args,{encoding:'utf8',maxBuffer:16*1024*1024});
  if(r.status!==0)throw Error(`${exe}: ${r.stderr||r.stdout}`);
  return r.stdout;
};
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const font="C\\:/Windows/Fonts/consola.ttf";
const fontSerif="C\\:/Windows/Fonts/georgia.ttf";
const caption=(text,y,size=17,color='0xbbaeb3')=>`drawtext=fontfile='${font}':text='${text}':x=14:y=${y}:fontsize=${size}:fontcolor=${color}`;
const representatives=['02-coil','04-unfurl','06-visitor','08-fall','10-trace','12-storm',
  '13-negative','16-skeleton','17-thorn','20-return','21c-wing','24-attribution'];
const names=['THE SEAM','UNFURL','THE VISITOR','THE WOUND','THE TRACE','RUPTURE',
  'THE NEGATIVE','EXTINCTION','SILENCE','RETURN','FEVER','IDENTITY'];
for(let i=0;i<T.scenes.length;i++) {
  const s=T.scenes[i],label=`${String(i+1).padStart(2,'0')}  ${s.start.toFixed(2)}-${s.end.toFixed(2)}  ${names[i]}`;
  run('ffmpeg',['-v','error','-y','-i',path.join(out,'keyframes',representatives[i]+'.png'),
    '-vf',`scale=480:270,pad=480:308:0:0:color=0x100b0e,${caption(label,282,17)}`,
    '-frames:v','1',path.join(thumbs,String(i).padStart(2,'0')+'.png')]);
}
const board=path.join(out,'storyboard.png');
run('ffmpeg',['-v','error','-y','-framerate','1','-i',path.join(thumbs,'%02d.png'),
  '-vf',`tile=4x3:padding=4:margin=4:color=0x100b0e,pad=iw:ih+104:0:72:color=0x100b0e,`+
    `drawtext=fontfile='${fontSerif}':text='ROSE GARDEN / TENDER VIOLENCE':x=20:y=15:fontsize=30:fontcolor=0xf1e7df,`+
    `drawtext=fontfile='${font}':text='V3 STORYBOARD  |  40 seconds  |  Native renderer stills  |  For creative review':x=20:y=50:fontsize=15:fontcolor=0xbbaeb3,`+
    `drawtext=fontfile='${font}':text='Crimson - Bone - Crimson  /  96 BPM - 16 bars  /  Final identity held 35-40s':x=20:y=h-24:fontsize=15:fontcolor=0xbbaeb3`,
  '-frames:v','1',board]);

// Every hold begins at its exact storyboard time; no animated stand-in flora.
const stills=T.keyframes.map((k,i)=>{
  const file=path.join(out,'keyframes',k.id+'.png').replaceAll('\\','/').replaceAll("'","'\\''");
  const duration=(T.keyframes[i+1]?.seconds??T.durationSeconds)-k.seconds;
  if(duration<=0)throw Error('Keyframe times must increase');
  return `file '${file}'\nduration ${duration.toFixed(9)}`;
});
stills.push(`file '${path.join(out,'keyframes',T.keyframes.at(-1).id+'.png').replaceAll('\\','/')}'`);
const list=path.join(out,'animatic-stills.txt');fs.writeFileSync(list,stills.join('\n')+'\n');
const video=path.join(out,'rose-garden-v3-timing-animatic.mp4'),audio=path.join(out,'design-score.wav');
if(!fs.existsSync(audio))throw Error('Generate the original audio sketch before muxing.');
run('ffmpeg',['-v','error','-y','-f','concat','-safe','0','-i',list,'-i',audio,
  '-t','40','-vf',`fps=24,drawbox=x=0:y=0:w=iw:h=23:color=black@0.72:t=fill,`+
    caption('V3 / STILL-KEYFRAME TIMING ANIMATIC / REVIEW',5,12,'0xd9cbd0'),
  '-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p',
  '-c:a','aac','-b:a','192k','-ar','48000','-movflags','+faststart',video]);
const probe=JSON.parse(run('ffprobe',['-v','error','-show_streams','-show_format','-of','json',video]));
const vs=probe.streams.find(s=>s.codec_type==='video'),as=probe.streams.find(s=>s.codec_type==='audio');
const scenes=T.scenes.map(s=>({...s,startFrame:Math.round(s.start*T.fps),endFrameExclusive:Math.round(s.end*T.fps)}));
const states=JSON.parse(fs.readFileSync(path.join(out,'keyframe-states.json'),'utf8'));
const checks={timelineDuration:T.durationSeconds===40&&T.frames===2400&&T.fps===60,
  contiguousTimeline:scenes.every((s,i)=>s.start===(i?scenes[i-1].end:0))&&scenes.at(-1).end===40,
  finalCutBoundaries:scenes.every(s=>Number.isInteger(s.start*T.fps)&&Number.isInteger(s.end*T.fps)),
  rhythm:T.bars*4*60/T.bpm===40,
  twoLooks:new Set(T.scenes.map(s=>s.look)).size===2,
  keyframes:T.keyframes.every(k=>fs.existsSync(path.join(out,'keyframes',k.id+'.png'))),
  nativeBead:states.find(s=>s.id==='07-bead')?.drops.some(d=>d.st==='bead'),
  nativeFall:states.find(s=>s.id==='08-fall')?.drops.some(d=>d.st==='fall'),
  nativeImpact:states.find(s=>s.id==='09-impact')?.stains>0,
  identityHold:T.scenes.at(-1).start===35,
  attribution:T.credits[0]==='Based on an original concept by Akshat Agarwal'&&T.credits[1]==='Reimagined and expanded as Rose Garden',
  animaticDuration:Math.abs(Number(probe.format.duration)-40)<.001,
  animaticFrames:Number(vs.nb_frames)===960,
  animaticSize:vs.width===960&&vs.height===540,
  audio:as?.channels===2&&Number(as.sample_rate)===48000};
const qa={pass:Object.values(checks).every(Boolean),reviewStage:'still-keyframe timing animatic',checks,
  animatic:{duration:Number(probe.format.duration),frames:Number(vs.nb_frames),fps:vs.avg_frame_rate,width:vs.width,height:vs.height},
  finalTarget:{rendered:false,duration:40,fps:60,frames:2400,width:3840,height:2160},
  scenes,keyframes:T.keyframes.map(k=>({...k,sha256:hash(path.join(out,'keyframes',k.id+'.png'))})),
  limitations:['Stills establish composition and pacing; continuous camera/native motion remains to be reviewed.',
    'Score is an original synthetic review sketch; finished production mix remains.',
    'Full-resolution final has not been rendered.']};
fs.writeFileSync(path.join(out,'qa.json'),JSON.stringify(qa,null,2));
console.log(JSON.stringify({pass:qa.pass,checks,video,board},null,2));
if(!qa.pass)process.exitCode=1;
