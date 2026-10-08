import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { timeline as T,v2,frameAt,beatSeconds } from './renderer.mjs';
const out=path.join(v2,'output');
const run=(exe,args,binary=false)=>{const r=spawnSync(exe,args,{encoding:binary?null:'utf8',maxBuffer:40*1024*1024});if(r.status)throw Error(String(r.stderr));return binary?r.stdout:r.stdout+r.stderr;};
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
export async function inspect(video,clips){
  clips ||= JSON.parse(fs.readFileSync(path.join(out,'draft-manifest.json'),'utf8'));
  const probe=JSON.parse(run('ffprobe',['-v','error','-count_frames','-show_streams','-show_format','-of','json',video]));
  const stream=probe.streams.find(s=>s.codec_type==='video'),states=clips.flatMap(c=>c.states);
  const log=run('ffmpeg',['-hide_banner','-i',video,'-vf','blackdetect=d=0.1:pix_th=0.02:pic_th=0.99,freezedetect=n=-50dB:d=0.5,signalstats,metadata=print','-af','ebur128=peak=true','-f','null','-']);
  fs.writeFileSync(path.join(out,'inspection.log'),log);
  const at=i=>states.find(s=>s.frame===i);
  const cues=T.events.map(e=>({...e,frame:frameAt(e.beat),seconds:e.beat*beatSeconds}));
  const physicalChecks=['bite','release','impact','butterfly-gone'].map(id=>{
    const e=cues.find(e=>e.id===id),before=at(e.frame-1),on=at(e.frame);
    const pass=id==='bite'?!before.bit&&on.bit:id==='impact'?before.stains===0&&on.stains===1:id==='release'?!before.drop.some(d=>d.st==='fall')&&on.drop.some(d=>d.st==='fall'):before.butterfly&&!on.butterfly;
    return {id,frame:e.frame,pass,before,on};
  });
  const hashes=clips.flatMap(c=>c.hashes),duplicates=[];
  for(let i=1;i<hashes.length;i++)if(hashes[i]===hashes[i-1])duplicates.push(i);
  const hold=frameAt(T.events.find(e=>e.id==='portrait-hold').beat),credit=frameAt(T.events.find(e=>e.id==='attribution').beat);
  const unintendedDuplicates=duplicates.filter(f=>f<hold);
  const stillChecks={holdFrame:hold,creditFrame:credit,portraitStill:hashes.slice(hold,credit).every(h=>h===hashes[hold]),finalCreditStill:hashes.slice(credit).every(h=>h===hashes[credit]),butterflyGone:states.filter(s=>s.frame>=hold).every(s=>!s.butterfly),oneStainRetained:states.filter(s=>s.frame>=hold).every(s=>s.stains===1)};
  const keyframeDiffs=T.keyframes.map(k=>{
    const frame=frameAt(k.beat),c=clips.find(c=>frame>=c.startFrame&&frame<c.startFrame+c.frames),image=fs.readFileSync(path.join(c.dir,String(frame-c.startFrame).padStart(5,'0')+'.png'));
    const proof=path.join(out,'keyframes',k.id+'.png');return {id:k.id,frame,reviewStatus:'Awaiting creative review',matchesContactSheet:fs.existsSync(proof)&&sha(fs.readFileSync(proof))===sha(image)};
  });
  const seams=[];
  for(const c of clips.slice(1)){
    const frame=c.startFrame;
    const raw=run('ffmpeg',['-v','error','-i',video,'-vf',`select=eq(n\\,${frame-1})+eq(n\\,${frame})`,'-fps_mode','passthrough','-frames:v','2','-f','rawvideo','-pix_fmt','rgb24','-'],true),len=T.draftSize*T.draftSize*3;
    if(raw.length!==len*2)throw Error('Seam extraction failed');
    let sum=0,max=0;for(let i=0;i<len;i++){const d=Math.abs(raw[i]-raw[i+len]);sum+=d;max=Math.max(max,d);}
    seams.push({frame,into:c.id,meanChannelDifference:sum/len,maxChannelDifference:max});
  }
  const diagnostics=path.join(out,'diagnostics');fs.mkdirSync(diagnostics,{recursive:true});
  for(const [name,frame]of [['suspended-encoded',frameAt(10.5)],['impact-encoded',frameAt(14.25)],['emergence-encoded',frameAt(21)],['portrait-encoded',frameAt(39)]])run('ffmpeg',['-v','error','-y','-i',video,'-vf',`select=eq(n\\,${frame})`,'-frames:v','1',path.join(diagnostics,name+'.png')]);
  run('ffmpeg',['-v','error','-y','-i',path.join(diagnostics,'emergence-encoded.png'),'-vf','crop=200:200:260:20,eq=gamma=2,scale=800:800:flags=neighbor','-frames:v','1',path.join(diagnostics,'dark-gradient-lifted.png')]);
  const summary=log.slice(log.lastIndexOf('Summary:')).split('[Parsed_metadata')[0].trim();
  const lufs=Number(summary.match(/I:\s*([\d.-]+) LUFS/)?.[1]),peak=Number(summary.match(/Peak:\s*([\d.-]+) dBFS/)?.[1]);
  const audio={integratedLufs:lufs,truePeakDb:peak,loudnessPass:Math.abs(lufs-T.audio.integratedLufs)<1,truePeakPass:peak<=T.audio.truePeakDb+.2,summary};
  const blackAndFreezeEvents=log.split('\n').filter(l=>/black_start:|freeze_start:|freeze_end:/.test(l));
  const result={frameCount:Number(stream.nb_read_frames),expectedFrames:1600,frameCountPass:Number(stream.nb_read_frames)===1600,resolution:[stream.width,stream.height],fps:stream.avg_frame_rate,duration:probe.format.duration,cues,physicalChecks,stillChecks,duplicates:{total:duplicates.length,unintended:unintendedDuplicates},keyframeDiffs,seams,seamCheckPass:seams.every(s=>s.meanChannelDifference<2),blackFramePass:!blackAndFreezeEvents.some(e=>e.includes('black_start:')),blackAndFreezeEvents,nearStaticReview:'Near-static detection also flags the designed suspended drop, settling stain, departure anticipation, and camera deceleration. Raw hashes confirm movement before the intentional portrait hold.',audio,darkGradients:{mitigation:'Subtle static dither; temporal noise is disabled so the portrait remains still.',diagnostics,review:'Encoded gradients and the lifted crop reviewed at draft scale. Final-resolution gradients will need another check after creative approval.'}};
  result.pass=result.frameCountPass&&result.blackFramePass&&result.seamCheckPass&&physicalChecks.every(c=>c.pass)&&Object.entries(stillChecks).filter(([k])=>!k.endsWith('Frame')).every(([,v])=>v)&&unintendedDuplicates.length===0&&audio.loudnessPass&&audio.truePeakPass&&keyframeDiffs.every(d=>d.matchesContactSheet);
  fs.writeFileSync(path.join(out,'qa.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify({pass:result.pass,frames:result.frameCount,resolution:result.resolution,cues:physicalChecks.map(({id,pass})=>({id,pass})),still:stillChecks,unintendedDuplicates:unintendedDuplicates.length,keyframeMatches:keyframeDiffs.every(d=>d.matchesContactSheet),audio:{lufs,peak}},null,2));
  if(!result.pass)throw Error('Draft QA needs attention: see output/qa.json');return result;
}
