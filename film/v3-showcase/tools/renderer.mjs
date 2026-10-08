import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openRenderer as openNative } from '../../tools/renderer.mjs';

export const direction=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const timeline=JSON.parse(fs.readFileSync(path.join(direction,'timeline.json'),'utf8'));

// Offline storyboard export through the existing film pipeline. No application
// files, prior films, UI labels or native rendering algorithms are changed.
export async function openRenderer() {
  const r=await openNative({size:540,software:true});
  const meta=await r.page.evaluate(prepare,timeline);
  return {...r,meta,async draw(spec) {
    const result=await r.page.evaluate(draw,spec);
    return {png:Buffer.from(result.png.split(',')[1],'base64'),state:result.state};
  }};
}

async function prepare(T) {
  const a=window.__typeGarden;
  const needed=[...new Set(T.keyframes.filter(k=>k.source!=='live-opening').map(k=>k.font))];
  const loaded=await Promise.all(needed.map(async id=>{
    const entry=a.FONTS.find(f=>f.id===id);
    if(!entry||!await a.loadFont(entry))throw Error('Native font unavailable: '+id);
    return {id,family:entry.family,weight:entry.weight};
  }));
  const out=document.createElement('canvas');out.width=T.proofSize[0];out.height=T.proofSize[1];
  const f=window.__showcase={T,out,loaded,s:null,baseCue:null,wide:null,lastConfig:null};
  const keys=[['i',120],['n',200],[' ',280],['b',360],['l',440],['o',520],['o',600],['m',680]];
  f.build=async function(spec) {
    a.stage?.stageRelease();a.stage=null;
    a.state.busy=true;a.setLook(spec.look||'crimson');
    if(a.font().id!==(spec.font||'playfair')) {
      await a.setFont(spec.font||'playfair');
      if(a.font().id!==(spec.font||'playfair'))throw Error('Font refit failed');
      a.stage?.stageRelease();a.stage=null;
    }
    a.setMaterial(spec.material||'ink');a.setBleed(spec.bleed||'legacy');
    if(spec.experiment) {
      // The same supported Fluid-based custom dose is used for every material.
      // Enough liquid is needed to overcome Wax's native pinning threshold.
      // This is the actual application's Amount control, not altered physics.
      a.baseBleed('fluid');a.editBleed({amount:3});
    }
    a.setAppearance({botanical:a.cleanBotanical(spec.botanical),...(spec.appearance||{})});
    a.state.text=spec.text||T.text;a.state.seed=T.seed;
    const original=a.stageWrite;
    // Use exactly the live input's content seeds and key chronology. A salted
    // poster would grow a different garden; it would break this film's refrain.
    a.stageWrite=function(text) {
      this.fill=.62;this._salt='';
      let last=0;
      for(let i=0;i<text.length;i++) {
        const t=text==='in bloom'?keys[i][1]:120+i*100;
        this.add(text[i],t,this.keyEvent(t));last=t;
      }
      this.checkSprout(last+1500);this.layout(true);
      for(const l of this.letters){l.x=l.tx;l.y=l.ty;l.cut=null;}
    };
    try {f.s=a.stage=a.makeStage(a.state.text,T.seed);}finally{a.stageWrite=original;}
    const s=f.s;s.state={...a.state,busy:true};
    const stamp=s.stampPlants;
    s.stampPlants=function(B,l,layer,...rest) {
      this._plantBudget=Infinity;
      const t=B.ctx.getTransform(),scale=Math.hypot(t.a,t.b),cache=l._plantCache?.[layer];
      if(cache&&Math.abs(cache.scale-scale)>1e-12){this.freeBitmap(cache.cv);delete l._plantCache[layer];}
      return stamp.call(this,B,l,layer,...rest);
    };
    s._fr={f:1,x:540,y:540};s._swayT=0;
    const box=s.stageReach({bloomAge:()=>5900});
    if(!f.wide)f.wide={x:(box.x0+box.x1)/2,y:(box.y0+box.y1)/2,
      span:Math.max((box.x1-box.x0)*out.height/out.width,box.y1-box.y0)*1.22};
    return {s,box};
  };
  await f.build({look:'crimson',font:'playfair',material:'ink',bleed:'legacy',text:T.text});
  const s=f.s,m=a.MOTIONS.find(m=>m.id==='bite'),dt=1000/60/m.clock,candidates=[];
  const originalBlood=s.bloodStep;
  s.bloodStep=function(...args){for(const b of Object.values(this.bites))b.max=1;return originalBlood.apply(this,args);};
  for(const [id,hero]of Object.entries(s.anchors)) {
    if(hero.stage==='bud'||hero.R<23)continue;
    s.biteId=id;s.stageReset();let bite=null,bead=null,release=null,impact=null,track=[];
    for(let t=0;t<7000;t+=dt) {
      s.stageSeek(m,t);
      if(s.sim.bit&&bite===null)bite=s.sim.t;
      const d=s.drops.find(d=>String(d.id)===id&&d.st!=='spray');
      if(d){track.push({t:s.sim.t,x:d.x,y:d.y,r:d.r,st:d.st});if(bead===null)bead=s.sim.t;if(d.st==='fall'&&release===null)release=s.sim.t;}
      if(s.stains.length){const st=s.stains[0];impact={t:s.sim.t,x:st.l.x+st.lx*s.St,y:st.l.y+st.ly*s.St,ch:st.l.ch};break;}
    }
    if(impact&&release)candidates.push({id,hero,bite,bead,release,impact,track,
      score:Math.min(120,impact.y-hero.y)+hero.R*2-(Math.abs(hero.x-540)*.08)});
  }
  s.bloodStep=originalBlood;
  candidates.sort((x,y)=>y.score-x.score);
  if(!candidates.length)throw Error('No real in bloom rose-to-ink collision found');
  f.baseCue=candidates[0];s.stageReset();
  f.metadata={source:'index.html / live-content seeded native stage',loadedFonts:loaded,
    contentSalt:'',seed:T.seed,text:T.text,wideCamera:f.wide,
    encounter:{...f.baseCue,track:undefined},
    letters:s.letters.map(l=>({ch:l.ch,id:l.id,seed:l.seed,plantSeeds:l._seeds})),
    proofOnly:true,continuousFramesRendered:0};
  return f.metadata;
}

async function draw(spec) {
  const f=window.__showcase,a=window.__typeGarden,{s,box}=await f.build(spec),
    c=f.baseCue,T=f.T,out=f.out,g=out.getContext('2d'),W=out.width,H=out.height;
  const m=a.MOTIONS.find(m=>m.id==='bite');
  const hero=s.anchors[c.id]||c.hero;
  s.biteId=c.id;s.stageReset();
  let physical=0,butterflyU=null,runoff=false;
  if(spec.phase) {
    physical={arrive:2400,land:3000,bite:c.bite+40,bead:c.bead+100,
      fall:c.release+(c.impact.t-c.release)*.55,impact:c.impact.t+30,
      response:c.impact.t+1900,wet:c.impact.t+80,
      middle:c.impact.t+1600,developed:c.impact.t+4300,runoff:c.impact.t+6000}[spec.phase];
    // Optional placement relative to the native release, still a real engine time.
    if(spec.atRelease!==undefined)physical=c.release+spec.atRelease;
    s.stageSeek(m,physical);
    if(spec.phase==='runoff') {
      // Seek a genuine bead leaving the wax, identified by native id:null. This
      // is not one of the rose's emitter drops and never a drawn replacement.
      s.stageReset();
      for(let t=c.impact.t;t<c.impact.t+16000;t+=1000/60/m.clock) {
        s.stageSeek(m,t);
        const d=s.drops.find(d=>d.id==null&&d.st==='fall');
        if(d){physical=s.sim.t;runoff=true;break;}
      }
      if(!runoff)throw Error('No native Wax runoff found in proof interval');
    }
    if(['arrive','land','bite','bead','fall','impact','response'].includes(spec.phase)) {
      butterflyU=spec.butterflyU??{arrive:.16,land:.21,bite:.267,bead:.29,fall:.315,impact:.335,response:.35}[spec.phase];
    }
  }
  const now=s.POSTER.t0+(spec.phase?s.sim.t*m.clock:0);
  s.stageAges(now,()=>s.POSTER.age);s._swayT=0;
  let st={bloomAge:()=>5900,bloodFade:1},after=null;
  if(spec.motion) {
    const motion=a.MOTIONS.find(m=>m.id===spec.motion),u=spec.u??.4;
    const script=s['script'+motion.id[0].toUpperCase()+motion.id.slice(1)](u,u*motion.T,now,motion);
    st={...st,...script.st};after=script.after;
  }
  let cam={...f.wide,roll:0};
  const hit=c.impact,mid=s.letters.find(l=>l.ch==='b')||s.letters.find(l=>l.ch!==' ');
  if(spec.view==='rose')cam={x:hero.x,y:hero.y,span:hero.R*2.9,roll:-8};
  if(spec.view==='coil')cam={x:mid.x,y:mid.y-s.St*.43,span:95,roll:-12};
  if(spec.view==='arrival')cam={x:hero.x,y:hero.y+28,span:Math.max(240,hero.R*6),roll:0};
  if(spec.view==='encounter'||spec.view==='gap')cam={x:hero.x,y:(hero.y+hit.y)/2,
    span:Math.max(180,hit.y-hero.y+hero.R*2),roll:0};
  // Tight framings for the butterfly-to-blood chain. They follow the actual
  // native butterfly pose and the rose's own live drop, never a drawn marker.
  const fly=butterflyU!==null?s.bfly(butterflyU,m):null,
    drop=s.drops.find(d=>String(d.id)===String(c.id)&&d.st!=='spray');
  if(spec.view==='contact')cam={x:hero.x+(spec.dx||0),y:hero.y+(spec.dy||0),span:hero.R*(spec.zoom||2),roll:0};
  if(spec.view==='bead'&&(drop||fly))cam={x:drop?drop.x:fly.x,y:drop?drop.y-(spec.lift||0):fly.y,span:spec.span||96,roll:0};
  if(spec.view==='drop'&&(drop||fly))cam={x:drop?drop.x:fly.x,y:drop?drop.y:fly.y,span:spec.span||140,roll:0};
  if(spec.view==='impact'||spec.view==='liquid'||spec.view==='material')cam={x:hit.x+5,y:hit.y+s.St*.23,span:126,roll:0};
  if(spec.view==='thorn') {
    // Native contour measurement, scoped to this export stage only.
    const records=[],original=s.thornCustomized;
    s.thornCustomized=function(B,P,th,...rest) {
      let poly=null;const proxy=Object.create(B);
      proxy.fill=(p,col)=>{if(!poly&&p?.length>4)poly=p;return B.fill(p,col);};
      const result=original.call(this,proxy,P,th,...rest);
      if(poly){const xs=poly.map(p=>p[0]),ys=poly.map(p=>p[1]),x=(Math.max(...xs)+Math.min(...xs))/2,y=(Math.max(...ys)+Math.min(...ys))/2;
        const height=Math.max(Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys));
        const clearance=Math.min(...s.letters.filter(l=>l.ch!==' ').map(l=>Math.abs(l.y-s.St*.4-y)));
        records.push({x,y,height,score:height+Math.min(clearance,60)*.13});}
      return result;
    };
    try{s.stageRender(s.backend(g),now,st);}finally{s.thornCustomized=original;}
    records.sort((x,y)=>y.score-x.score);
    if(!records.length)throw Error('No native prickle geometry found');
    cam={x:records[0].x,y:records[0].y,span:Math.max(70,records[0].height*7),roll:-15};
  }
  if(spec.view==='identity')cam={x:(box.x0+box.x1)/2,y:(box.y0+box.y1)/2,
    span:Math.max((box.x1-box.x0)*H/W,box.y1-box.y0)*1.25,roll:0};
  g.setTransform(1,0,0,1,0,0);g.globalAlpha=1;g.globalCompositeOperation='source-over';
  g.fillStyle=s.theme().bg;g.fillRect(0,0,W,H);
  g.save();g.translate(W/2,H/2);g.rotate((cam.roll||0)*Math.PI/180);
  g.scale(H/cam.span,H/cam.span);g.translate(-cam.x,-cam.y);
  const B=s.backend(g);s._fr={f:1,x:540,y:540};
  s.stageRender(B,now,st);if(after)after(B);
  if(butterflyU!==null) {
    const b=s.bfly(butterflyU,m);
    if(b){s.stageHalo(B,b.x,b.y,b.s*2.8);s.butterflyNoir(B,b.x,b.y,b.s,b.ang,b.open,b.perched);}
  }
  g.restore();
  if(spec.credits) {
    g.fillStyle='#c0aeb3';g.font='14px Georgia';g.textAlign='center';
    T.credits.forEach((line,i)=>g.fillText(line,W/2,H-39+i*20));
  }
  const soak=s.letters.filter(l=>l._soak).map(l=>{
    const field=l._soak,sum=v=>v.reduce((a,b)=>a+b,0);
    return {ch:l.ch,material:field.mat?.id,RES:field.RES,
      water:sum(field.w),pigment:sum(field.pm)+sum(field.pb),everWet:sum(field.ever),
      beads:(field.beads||[]).map(b=>({x:b.x,y:b.y,volume:b.v,hang:b.hang,velocity:b.vy,dried:b.dried||false}))};
  });
  return {png:out.toDataURL('image/png'),state:{id:spec.id,seconds:spec.seconds,
    text:s.letters.map(l=>l.ch).join(''),look:spec.look,font:a.font().id,
    material:a.material().id,bleed:a.bleed(),appearance:a.appearance,
    camera:cam,physicalTime:physical,nativeRunoff:runoff,
    heroId:c.id,stains:s.stains.length,bit:s.sim.bit,soak,
    drops:s.drops.filter(d=>d.st!=='spray').map(d=>({id:d.id,st:d.st,x:d.x,y:d.y,r:d.r})),
    letters:s.letters.map(l=>({ch:l.ch,id:l.id,seed:l.seed,x:l.x,y:l.y})),
    anchors:Object.entries(s.anchors).map(([id,r])=>({id,...r})),
    source:'actual Rose Garden renderer',proofOnly:true}};
}
