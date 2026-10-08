// Film-only location scouting: these proofs never enter the cut or an approval baseline.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { openRenderer,v2,beatSeconds } from './renderer.mjs';
const dir=path.join(v2,'output','probe','encounters');fs.mkdirSync(dir,{recursive:true});const items=[];
for(const seed of [7,23]){
  const r=await openRenderer({overrides:{seed,heroId:null}});
  try{
    const candidates=r.meta.candidates.filter(c=>c.hero.stage==='full').slice(0,3);
    for(const c of candidates){
      await r.page.evaluate(id=>{
        const f=window.__v2,c=f.candidates.find(c=>c.id===id),first=c.track.find(d=>d.st==='fall'),target=first.y+c.gap*.7;
        c.suspend=c.track.filter(d=>d.st==='fall').reduce((a,b)=>Math.abs(b.y-target)<Math.abs(a.y-target)?b:a);
        f.cue=c;f.s.biteId=id;f.s.stageReset();
      },c.id);
      for(const [beat,label]of [[4.5,'encounter'],[10.5,'suspended']]){
        const {png}=await r.draw(beat*beatSeconds),src=path.join(dir,`${seed}-${c.id}-${label}.png`);fs.writeFileSync(src,png);items.push({src,label:`seed ${seed} / ${c.id} / ${label}`});
      }
    }
  }finally{await r.browser.close();}
}
const spec=path.join(dir,'sheet.json');fs.writeFileSync(spec,JSON.stringify({cols:4,w:320,items},null,2));
spawnSync(process.execPath,[path.join(v2,'..','tools','sheet.mjs'),spec,path.join(dir,'sheet.png')],{stdio:'inherit'});
