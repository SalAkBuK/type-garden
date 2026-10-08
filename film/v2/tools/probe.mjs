import fs from 'node:fs';
import path from 'node:path';
import { openRenderer as openV1,film } from '../../tools/renderer.mjs';
const dir=path.join(film,'v2','output','probe');fs.mkdirSync(dir,{recursive:true});
const r=await openV1({size:540,software:true});
try{
  for(const seed of [7,17,23]){
    const result=await r.page.evaluate(({seed})=>{
      const a=window.__typeGarden;
      a.setMode('type');a.state.text='ROSE GARDEN';a.state.seed=seed;a.setLook('crimson');a.setBleed('fluid');a.setMode('poster');a.state.busy=true;
      const s=a.stage;s.fill=0.62;s.layout(true);s.stagePrepare();
      const m=a.MOTIONS.find(m=>m.id==='bite'),fr=s.stageFrame(m);s.stageWarm(a.pcv.getContext('2d'),m);s.stageDraw(a.pcv.getContext('2d'),0.62*m.T,m);
      return {seed,wrapped:s.wrapped,S:s.St,letters:s.letters.map(l=>({ch:l.ch,x:l.x,y:l.y,line:l.line})),hero:s.anchors[s.biteId],id:s.biteId,fr,bounds:s.stageReach({bloomAge:()=>5900}),png:a.pcv.toDataURL('image/png')};
    },{seed});
    const {png,...info}=result;fs.writeFileSync(path.join(dir,`seed-${seed}.png`),Buffer.from(png.split(',')[1],'base64'));fs.writeFileSync(path.join(dir,`seed-${seed}.json`),JSON.stringify(info,null,2));console.log(info);
  }
}finally{await r.browser.close();}
