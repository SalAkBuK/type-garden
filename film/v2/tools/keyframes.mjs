import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { openRenderer,timeline as T,v2,beatSeconds } from './renderer.mjs';
const output=path.join(v2,'output'),dir=path.join(output,'keyframes');fs.mkdirSync(dir,{recursive:true});
const r=await openRenderer(),items=[],states=[];
try{
  fs.writeFileSync(path.join(output,'renderer-metadata.json'),JSON.stringify(r.meta,null,2));
  console.log('hero',r.meta.heroId,r.meta.hero,'cues',r.meta.cues,'bounds',r.meta.bounds);
  for(const k of T.keyframes){
    const {png,state}=await r.draw(k.beat*beatSeconds),src=path.join(dir,k.id+'.png');
    fs.writeFileSync(src,png);items.push({src,label:`${(k.beat*beatSeconds).toFixed(2)}s · ${k.label}`});states.push({id:k.id,...state});
  }
  if(r.errors.length)throw Error(r.errors.join('\n'));
}finally{await r.browser.close();}
fs.writeFileSync(path.join(output,'keyframe-states.json'),JSON.stringify(states,null,2));
const spec=path.join(output,'contact-sheet.json');fs.writeFileSync(spec,JSON.stringify({cols:4,w:360,gap:4,bg:'#0a0809',items},null,2));
const sheet=spawnSync(process.execPath,[path.join(v2,'..','tools','sheet.mjs'),spec,path.join(output,'contact-sheet.png')],{stdio:'inherit'});if(sheet.status)throw Error('Contact sheet failed');
