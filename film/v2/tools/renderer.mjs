import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openRenderer as openV1 } from '../../tools/renderer.mjs';
export const v2=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const timeline=JSON.parse(fs.readFileSync(path.join(v2,'timeline.json'),'utf8'));
export const beatSeconds=60/timeline.bpm;
export const frameAt=beat=>Math.round(beat*beatSeconds*timeline.fps);
export async function openRenderer({overrides={}}={}){
  // Read-only reuse of the existing deterministic Chromium bootstrap. Every output stays in v2.
  const r=await openV1({size:timeline.draftSize,software:true});
  const meta=await r.page.evaluate(prepare,{...timeline,...overrides});
  return {...r,meta,async draw(seconds){
    const result=await r.page.evaluate(draw,seconds);
    return {png:Buffer.from(result.png.split(',')[1],'base64'),state:result.state};
  }};
}
function prepare(T){
  const a=window.__typeGarden;
  a.setLook(T.look);a.setMaterial(T.material);a.setBleed(T.bleed);
  a.state.text=T.text;a.state.seed=T.seed;a.state.busy=true;
  a.stage?.stageRelease();
  const original=a.stageWrite;
  a.stageWrite=function(text){
    this.fill=T.fill;original.call(this,text);
    if(this.wrapped&&T.leading){
      const first=Math.min(...this.letters.filter(l=>l.ch!==' ').map(l=>l.y));
      for(const l of this.letters){l.y=first+(l.y-first)*T.leading/2.1;l.ty=l.y;}
    }
  };
  try{a.stage=a.makeStage(T.text,T.seed);}finally{a.stageWrite=original;}
  const s=a.stage,m=a.MOTIONS.find(m=>m.id==='bite'),dt=1000/60/m.clock;
  s.state={...a.state,busy:true};
  // Live UI budgets defer bitmap updates. Offline frames need every requested native
  // layer at the current camera scale immediately, including the first still frame.
  const stampPlants=s.stampPlants;
  s.stampPlants=function(B,l,layer,...rest){
    this._plantBudget=Infinity;
    const transform=B.ctx.getTransform(),scale=Math.hypot(transform.a,transform.b),cached=l._plantCache?.[layer];
    if(cached&&Math.abs(cached.scale-scale)>1e-12){this.freeBitmap(cached.cv);delete l._plantCache[layer];}
    return stampPlants.call(this,B,l,layer,...rest);
  };
  // The native Bite emits a series of beads. This film uses its first bead only.
  const bloodStep=s.bloodStep;
  s.bloodStep=function(...args){for(const b of Object.values(this.bites))b.max=1;return bloodStep.apply(this,args);};
  const candidates=[];
  for(const [id,hero]of Object.entries(s.anchors)){
    if(hero.stage==='bud'||hero.R<25)continue;
    s.biteId=id;s.stageReset();let bite=null,bead=null,release=null,impact=null,lastDrop=null,track=[];
    for(let t=0;t<6500;t+=dt){
      s.stageSeek(m,t);
      if(s.sim.bit&&bite===null)bite=s.sim.t;
      const d=s.drops.find(d=>d.id===id&&d.st!=='spray');
      if(d){lastDrop={t:s.sim.t,x:d.x,y:d.y,r:d.r,st:d.st};track.push(lastDrop);if(bead===null)bead=s.sim.t;if(d.st==='fall'&&release===null)release=s.sim.t;}
      if(s.stains.length){const st=s.stains[0];impact={t:s.sim.t,x:st.l.x+st.lx*s.St,y:st.l.y+st.ly*s.St,ch:st.l.ch};break;}
    }
    if(impact&&release){
      const fall=track.filter(d=>d.st==='fall'),first=fall[0];
      candidates.push({id,hero,bite,bead,release,impact,lastDrop,track,gap:impact.y-first.y,score:(hero.stage==='full'?120:0)+Math.min(160,impact.y-first.y)+hero.R-Math.abs(hero.x-540)*.15});
    }
  }
  candidates.sort((a,b)=>b.score-a.score);
  const cue=candidates.find(c=>T.heroId===c.id)||candidates[0];
  if(!cue)throw Error('No native rose → blood → serif encounter found');
  s.biteId=cue.id;s.stageReset();s._fr={f:1,x:540,y:540};
  const fr=s.stageFrame(m),view=fr.view;
  const bounds={x0:fr.x+(view.x0-540)/fr.f,x1:fr.x+(view.x1-540)/fr.f,y0:fr.y+(view.y0-540)/fr.f,y1:fr.y+(view.y1-540)/fr.f};
  const midY=(cue.release?cue.track.find(d=>d.t>=cue.release).y:cue.hero.y)+cue.gap*.70;
  cue.suspend=cue.track.reduce((best,d)=>d.st==='fall'&&Math.abs(d.y-midY)<Math.abs(best.y-midY)?d:best,cue.track.find(d=>d.st==='fall'));
  const out=document.createElement('canvas');out.width=out.height=T.draftSize;
  const mask=document.createElement('canvas');mask.width=mask.height=T.draftSize;
  const f=window.__v2={T,s,m,cue,candidates,bounds,out,g:out.getContext('2d'),mask,mg:mask.getContext('2d'),lastTime:-1};
  // Stabilize the source caches before any proof frame is accepted.
  for(let i=0;i<12;i++){
    const ctx=a.pcv.getContext('2d');ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,1080,1080);
    s.stageAges(s.POSTER.t0,()=>s.POSTER.age);s._swayT=0;s.stageRender(s.backend(ctx),s.POSTER.t0,{bloomAge:()=>5900,bloodFade:1});
  }
  s.stageReset();
  return {seed:T.seed,heroId:cue.id,hero:cue.hero,cues:{bite:cue.bite,bead:cue.bead,release:cue.release,suspend:cue.suspend,impact:cue.impact},bounds,candidates:candidates.map(({track,...c})=>c)};
}
function draw(seconds){
  const f=window.__v2,{T,s,m,cue:c,out,g,mask,mg}=f,N=out.width,b=seconds*T.bpm/60;
  const clamp=x=>Math.max(0,Math.min(1,x)),mix=(x,y,p)=>x+(y-x)*p,smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
  const E=id=>T.events.find(e=>e.id===id).beat;
  const interpolate=(points,x)=>{for(let i=1;i<points.length;i++)if(x<=points[i][0]){const [x0,y0]=points[i-1],[x1,y1]=points[i];return mix(y0,y1,clamp((x-x0)/(x1-x0)));}return points.at(-1)[1];};
  const dt=1000/60/m.clock;
  // Time dilation follows the real drop trajectory. There is no substitute animated droplet.
  const physical=interpolate([[0,0],[E('bite'),c.bite+1e-4],[7.5,c.bead+dt*2],[E('release'),c.release+1e-4],[10,c.suspend.t],[12.5,c.suspend.t+dt*.28],[13.25,c.suspend.t+dt*2],[E('impact'),c.impact.t+1e-4],[16,c.impact.t+500],[22,c.impact.t+1400],[34,c.impact.t+1600],[40,c.impact.t+1600]],b);
  s.stageSeek(m,physical);
  // Resample positions from the native trajectory between its fixed simulation steps.
  // This prevents a slow-motion bead from jumping 20 output pixels in one frame.
  const primary=s.drops.find(d=>d.id===c.id&&d.st!=='spray');
  let restore=null;
  if(primary&&s.sim.t<c.impact.t){
    const next=c.track.find(d=>d.t>s.sim.t+1e-4)||{t:c.impact.t,x:c.impact.x,y:c.impact.y};
    const p=clamp((physical-s.sim.t)/(next.t-s.sim.t));
    restore={x:primary.x,y:primary.y};primary.x=mix(primary.x,next.x,p);primary.y=mix(primary.y,next.y,p);
  }
  const now=s.POSTER.t0+s.sim.t*m.clock;
  s.stageAges(now,()=>s.POSTER.age);s._swayT=Math.min(seconds,E('portrait-hold')*60/T.bpm)*55;
  const hero=c.hero,dropX=c.suspend.x,hit=c.impact;
  const final={x:(f.bounds.x0+f.bounds.x1)/2,y:(f.bounds.y0+f.bounds.y1)/2+20,span:Math.max(f.bounds.x1-f.bounds.x0,f.bounds.y1-f.bounds.y0)*1.28};
  const signatureSpan=Math.max(hero.R*2.45,c.gap+hero.R*1.4);
  const poses=[
    [0,{x:hero.x-18,y:hero.y-15,span:hero.R*.90}],
    [4,{x:hero.x,y:hero.y,span:hero.R*3.35}],
    [8.5,{x:dropX+signatureSpan*.16,y:c.suspend.y,span:signatureSpan}],
    [12.5,{x:dropX+signatureSpan*.16,y:c.suspend.y,span:signatureSpan}],
    [14,{x:hit.x+20,y:hit.y-20,span:Math.max(125,hero.R*2.85)}],
    [16,{x:hit.x+20,y:hit.y-20,span:Math.max(125,hero.R*2.85)}],
    [28,{...final,span:final.span*.96}],
    [34,final],[40,final]
  ];
  let cam=poses.at(-1)[1];
  for(let i=1;i<poses.length;i++)if(b<=poses[i][0]){const [a,A]=poses[i-1],[z,B]=poses[i],p=smooth((b-a)/(z-a));cam={x:mix(A.x,B.x,p),y:mix(A.y,B.y,p),span:Math.exp(mix(Math.log(A.span),Math.log(B.span),p))};break;}
  g.setTransform(1,0,0,1,0,0);g.globalCompositeOperation='source-over';g.fillStyle=s.theme().bg;g.fillRect(0,0,N,N);
  g.save();g.translate(N/2,N/2);g.scale(N/cam.span,N/cam.span);g.translate(-cam.x,-cam.y);
  const B=s.backend(g);s._fr={f:1,x:540,y:540};
  s.stageRender(B,now,{bloomAge:()=>5900,bloodFade:1});
  const bu=b<=28?mix(.205,.345,Math.min(b,28)/28):b<32?mix(.36,.48,(b-28)/4):.5;
  const butterfly=s.bfly(bu,m);
  if(butterfly){g.save();g.globalAlpha=butterfly.perched?.42:.12;s.stageHalo(B,butterfly.x,butterfly.y,butterfly.s*2.8);g.restore();s.butterflyNoir(B,butterfly.x,butterfly.y,butterfly.s,butterfly.ang,butterfly.open,butterfly.perched);}
  g.restore();
  // Lighting opens around the encounter, then progressively resolves the same planted identity.
  const reveal=smooth((b-16)/15),floor=mix(T.lighting.openingFloor,1,reveal);
  mg.setTransform(1,0,0,1,0,0);mg.fillStyle=`rgb(${floor*255},${floor*255},${floor*255})`;mg.fillRect(0,0,N,N);
  const pool=(x,y,r,level=1)=>{x=(x-cam.x)*N/cam.span+N/2;y=(y-cam.y)*N/cam.span+N/2;r*=N/cam.span;const gradient=mg.createRadialGradient(x,y,r*.16,x,y,r);gradient.addColorStop(0,`rgba(255,255,255,${level})`);gradient.addColorStop(.5,`rgba(255,255,255,${level*.9})`);gradient.addColorStop(1,'rgba(255,255,255,0)');mg.fillStyle=gradient;mg.fillRect(0,0,N,N);};
  const signature=smooth((b-6.5)/2);
  pool(hero.x,hero.y,hero.R*mix(mix(T.lighting.openingRadius,T.lighting.signatureRadius,signature),8,reveal));
  if(b>7){
    const d=s.drops.find(d=>d.st!=='spray');
    if(d)pool(d.x,d.y,mix(13,550,reveal),1);
    pool(hit.x+8,hit.y+24,mix(mix(42,95,smooth((b-14)/.6)),550,reveal),smooth((b-7)/2));
  }
  g.globalCompositeOperation='multiply';g.drawImage(mask,0,0);g.globalCompositeOperation='source-over';
  if(b>=E('attribution')){
    g.fillStyle='#97878c';g.textAlign='center';g.font=`${N*.0122}px Georgia`;
    T.credits.forEach((line,i)=>g.fillText(line,N/2,N*(.947+i*.019)));
  }
  const result={png:out.toDataURL('image/png'),state:{beat:b,simTime:s.sim.t,bit:s.sim.bit,stains:s.stains.length,drop:s.drops.filter(d=>d.st!=='spray').map(d=>({x:d.x,y:d.y,st:d.st})),butterfly:!!butterfly,camera:cam}};
  if(restore)Object.assign(primary,restore);
  return result;
}
