import fs from 'node:fs';
import path from 'node:path';
import { openRenderer,film } from './renderer.mjs';
const r=await openRenderer({software:true});
try{
  const result=await r.page.evaluate(()=>{
    const a=window.__typeGarden,s=a.stage,m=a.MOTIONS.find(m=>m.id==='bite'),dt=1000/60/m.clock;
    s.stageReset();let bite=null,impact=null;
    for(let t=0;t<m.T*0.5;t+=dt){s.stageSeek(m,t);if(s.sim.bit&&bite===null)bite={t:s.sim.t,u:s.sim.t/m.T};if(s.stains.length&&impact===null){impact={t:s.sim.t,u:s.sim.t/m.T,stains:s.stains.length};break;}}
    return {bite,impact};
  });
  fs.mkdirSync(path.join(film,'output'),{recursive:true});fs.writeFileSync(path.join(film,'output','physical-cues.json'),JSON.stringify(result,null,2));console.log(result);
}finally{await r.browser.close();}
