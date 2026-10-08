import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { spawnSync } from 'node:child_process';
import { openRenderer, timeline, film } from './renderer.mjs';
const out=path.join(film,'output','benchmark');fs.mkdirSync(out,{recursive:true});
const results=[];
for(const mode of ['default','software','high-performance']) {
  const software=mode==='software';
  const r=await openRenderer({software,highPerformance:mode==='high-performance'});
  try {
    const cdp=await r.browser.newBrowserCDPSession();
    const info=await cdp.send('SystemInfo.getInfo');
    for(const fps of [30,60]) {
      const folder=path.join(out,`${mode}-${fps}`);fs.mkdirSync(folder,{recursive:true});
      const scene=timeline.scenes.find(s=>s.id==='wither');
      await r.draw(scene,15);
      const start=performance.now(),frames=fps/2;
      for(let i=0;i<frames;i++)fs.writeFileSync(path.join(folder,`${String(i).padStart(5,'0')}.png`),await r.draw(scene,15+i/fps));
      const elapsed=performance.now()-start;
      const encode=spawnSync('ffmpeg',['-v','error','-y','-framerate',String(fps),'-i',path.join(folder,'%05d.png'),'-c:v','libx264','-crf','18','-pix_fmt','yuv420p',path.join(out,`${mode}-${fps}.mp4`)],{encoding:'utf8'});
      if(encode.status!==0)throw Error(encode.stderr);
      const result={mode,fps,frames,elapsedMs:Math.round(elapsed),msPerFrame:elapsed/frames,estimatedFullFilmSeconds:elapsed/frames*(800*fps/30)/1000,gpu:info.gpu,errors:r.errors};
      results.push(result);console.log(JSON.stringify({...result,gpu:{renderer:info.gpu.auxAttributes.glRenderer,canvas:info.gpu.featureStatus['2d_canvas']}}));
    }
  }finally{await r.browser.close();}
}
fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));
