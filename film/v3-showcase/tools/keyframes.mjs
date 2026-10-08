import fs from 'node:fs';
import path from 'node:path';
import { openRenderer,timeline as T,direction } from './renderer.mjs';

if(process.argv.includes('--full'))throw Error('Storyboard review only. No final frame-sequence export.');
const out=path.join(direction,'output'),dir=path.join(out,'keyframes');fs.mkdirSync(dir,{recursive:true});
// --only=13-arrive,14-land recaptures just those stills and merges their state
// into the existing record; the encounter is re-scouted deterministically.
const only=process.argv.find(a=>a.startsWith('--only='))?.slice(7).split(',');
const statesFile=path.join(out,'keyframe-states.json');
const r=await openRenderer(),states=only?JSON.parse(fs.readFileSync(statesFile,'utf8')):[];
try {
  if(!only)fs.writeFileSync(path.join(out,'renderer-metadata.json'),JSON.stringify(r.meta,null,2));
  for(const k of T.keyframes.filter(k=>k.source!=='live-opening'&&(!only||only.includes(k.id)))) {
    const {png,state}=await r.draw(k);
    fs.writeFileSync(path.join(dir,k.id+'.png'),png);
    const at=states.findIndex(s=>s.id===k.id);at<0?states.push(state):states[at]=state;
    fs.writeFileSync(path.join(out,'keyframe-states.json'),JSON.stringify(states,null,2));
    console.log(k.id,k.seconds,k.phase||k.view,png.length);
  }
  if(r.errors.length)throw Error(r.errors.join('\n'));
}finally{await r.browser.close();}
fs.writeFileSync(path.join(out,'keyframe-states.json'),JSON.stringify(states,null,2));
console.log('40 native showcase stills, plus 8 live opening stills. No continuous or final render.');
