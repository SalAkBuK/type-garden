import fs from 'node:fs';
import path from 'node:path';
import { openRenderer,timeline as T,v3 } from './renderer.mjs';

if(process.argv.includes('--full'))throw Error('Final production waits for draft review. This tool exports storyboard stills only.');
const out=path.join(v3,'output'),dir=path.join(out,'keyframes');fs.mkdirSync(dir,{recursive:true});
const r=await openRenderer(),states=[];
try {
  fs.writeFileSync(path.join(out,'renderer-metadata.json'),JSON.stringify(r.meta,null,2));
  for(const k of T.keyframes) {
    const {png,state}=await r.draw(k.seconds);
    fs.writeFileSync(path.join(dir,k.id+'.png'),png);states.push({id:k.id,...state});
    console.log(k.id,k.seconds,state.scene,png.length);
  }
  if(r.errors.length)throw Error(r.errors.join('\n'));
} finally {await r.browser.close();}
fs.writeFileSync(path.join(out,'keyframe-states.json'),JSON.stringify(states,null,2));
console.log(T.keyframes.length+' native-renderer storyboard stills. No motion sequence or final render.');
