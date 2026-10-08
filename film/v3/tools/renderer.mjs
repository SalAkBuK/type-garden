import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openRenderer as openV2 } from '../../v2/tools/renderer.mjs';

export const v3 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const timeline = JSON.parse(fs.readFileSync(path.join(v3, 'timeline.json'), 'utf8'));

// Reuse V2's deterministic native encounter scouting, never its draw/output tools.
// Its bootstrap only reads V1/V2 files. All artifacts from this adapter live in V3.
export async function openRenderer() {
  const r = await openV2({ overrides: { text: timeline.text, seed: timeline.seed,
    heroId: timeline.heroId, draftSize: 540, look: 'crimson', material: 'ink', bleed: 'fluid' } });
  const meta = await r.page.evaluate(prepare, timeline);
  return { ...r, meta, async draw(seconds) {
    const result = await r.page.evaluate(draw, seconds);
    return { png: Buffer.from(result.png.split(',')[1], 'base64'), state: result.state };
  } };
}

function prepare(T) {
  const f = window.__v2, s = f.s, a = window.__typeGarden;
  const [W,H] = T.proofSize;
  f.out.width = W; f.out.height = H;
  f.T3 = T; f.currentLook = 'crimson';
  f.letter = s.letters.find(l => l.ch === 'E') || s.letters[0];
  f.first = s.letters.find(l => l.ch === 'R') || f.letter;
  f.rose = f.cue.hero;
  f.coil = { x:f.letter.x + s.St * .07, y:f.letter.y - s.St * .43 };
  const box = s.stageReach({bloomAge:()=>5900});
  f.nativeBounds = box;
  f.final = {x:(box.x0+box.x1)/2, y:(box.y0+box.y1)/2,
    span:Math.max((box.x1-box.x0)*H/W,(box.y1-box.y0))*1.25};
  // Measure the actual native thorn polygons in the drained pose. This avoids
  // approximating a thorn from a letter-relative point or drawing extra armament.
  const thorns=[], originalThorn=s.thornCustomized;
  s.thornCustomized=function(B,P,th,...rest) {
    let poly=null;
    const proxy=Object.create(B);
    proxy.fill=(points,col)=>{if(!poly&&points?.length>4)poly=points;return B.fill(points,col);};
    const result=originalThorn.call(this,proxy,P,th,...rest);
    if(poly) {
      const xs=poly.map(p=>p[0]),ys=poly.map(p=>p[1]),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);
      const x=(x0+x1)/2,y=(y0+y1)/2;
      const clearance=Math.min(...s.letters.filter(l=>l.ch!==' ').map(l=>{
        const hw=s.mw(l.ch)*s.St/2;
        return Math.hypot(Math.max(l.x-hw-x,0,x-l.x-hw),Math.max(l.y-s.St*.8-y,0,y-l.y-s.St*.25));
      }));
      thorns.push({x,y,x0,x1,y0,y1,clearance,height:Math.max(x1-x0,y1-y0)});
    }
    return result;
  };
  const death=a.MOTIONS.find(m=>m.id==='wither'),dead=s.scriptWither(.78,.78*death.T,s.POSTER.t0+.78*death.T,death);
  try {s.stageRender(s.backend(f.out.getContext('2d')),s.POSTER.t0+.78*death.T,dead.st);}
  finally {s.thornCustomized=originalThorn;}
  thorns.sort((A,B)=>(Math.min(B.clearance,100)+B.height*3)-(Math.min(A.clearance,100)+A.height*3));
  if(!thorns.length)throw Error('No native thorn geometry measured');
  f.thorn=thorns[0];
  return {source:'index.html / native isolated stage', rendererVersion:3,
    seed:T.seed, heroId:f.cue.id, hero:f.rose, impact:f.cue.impact,
    coil:f.coil, thorn:f.thorn, measuredThorns:thorns.length, font:a.F, bounds:box, finalCamera:f.final,
    letters:s.letters.filter(l=>l.ch!==' ').map(l=>({ch:l.ch,x:l.x,y:l.y}))};
}

function draw(seconds) {
  const f=window.__v2, T=f.T3, a=window.__typeGarden, s=f.s,
    c=f.cue, g=f.out.getContext('2d'), W=f.out.width,H=f.out.height;
  const clamp=x=>Math.max(0,Math.min(1,x)), mix=(x,y,p)=>x+(y-x)*p,
    smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
  const scene=T.scenes.find(sc=>seconds>=sc.start&&seconds<sc.end)||T.scenes.at(-1);
  const p=clamp((seconds-scene.start)/(scene.end-scene.start)),q=smooth(p);
  if(f.currentLook!==scene.look){a.setLook(scene.look);f.currentLook=scene.look;}
  const m=a.MOTIONS.find(m=>m.id===scene.motion), hero=f.rose, coil=f.coil;
  const pose=(x,y,span,roll=0)=>({x,y,span,roll});
  const blend=(A,B,v=q)=>({x:mix(A.x,B.x,v),y:mix(A.y,B.y,v),
    span:Math.exp(mix(Math.log(A.span),Math.log(B.span),v)),roll:mix(A.roll||0,B.roll||0,v)});
  let cam, sc, physical=null;
  const u=scene.u?mix(scene.u[0],scene.u[1],p):0;
  let now=s.POSTER.t0+u*m.T;
  s._swayT=seconds*35;
  if(scene.motion==='bite') {
    const knots=[[7.5,2500],[10,c.bite+1e-3],[10.75,c.bead+120],
      [11.25,c.release+1e-3],[12.2,c.suspend.t],[12.5,c.impact.t+1e-3],[15,c.impact.t+3200]];
    physical=knots.at(-1)[1];
    for(let i=1;i<knots.length;i++)if(seconds<=knots[i][0]){
      physical=mix(knots[i-1][1],knots[i][1],clamp((seconds-knots[i-1][0])/(knots[i][0]-knots[i-1][0])));break;
    }
    s.stageSeek(m,physical);now=s.POSTER.t0+s.sim.t*m.clock;
    s.stageAges(now,()=>s.POSTER.age);sc={st:{bloomAge:()=>5900,bloodFade:1}};
  } else {
    if(seconds>=20||seconds<7.5)s.stageReset();
    sc=s['script'+m.id[0].toUpperCase()+m.id.slice(1)](u,u*m.T,now,m);
  }
  switch(scene.id) {
    case 'seam': cam=blend(pose(coil.x-20,coil.y+19,48,-24),pose(coil.x+4,coil.y-14,60,-10));break;
    case 'unfurl': cam=blend(pose(hero.x-12,hero.y-8,hero.R*.85,12),pose(hero.x,hero.y,hero.R*3.5,-4));break;
    case 'visitor': cam=seconds<8.125?pose(hero.x-7,hero.y-8,hero.R*.95,-12):blend(pose(hero.x,hero.y,hero.R*3.4,8),pose(hero.x,hero.y+12,hero.R*2.8,0));break;
    case 'wound': cam=blend(pose(hero.x,hero.y+40,170,0),pose(c.impact.x,c.impact.y-20,148,0));break;
    case 'trace': cam=blend(pose(c.impact.x+5,c.impact.y+14,92,0),pose(c.impact.x+8,c.impact.y+61,102,-9));break;
    case 'rupture': cam=p<.7
      ?blend(pose(410,355,205,-14),pose(715,580,235,14),smooth(p/.7))
      :blend(pose(715,580,235,14),pose(hero.x,hero.y+13,hero.R*3.4,14),smooth((p-.7)/.3));break;
    case 'negative': cam=blend(pose(hero.x,hero.y+13,hero.R*3.4,14),pose(675,365,225,-8));break;
    case 'extinction': cam=blend(pose(675,365,225,-8),pose(670,350,270,0));break;
    case 'silence': cam=pose(f.thorn.x,f.thorn.y,Math.max(34,f.thorn.height*6),-22);break;
    case 'return': cam=blend(pose(f.first.x,f.first.y-s.St*.18,125,-14),pose(hero.x,hero.y+10,195,8));break;
    case 'fever': {
      const n=Math.min(3,Math.floor(p*4));
      cam=[pose(hero.x,hero.y,hero.R*1.65,-16),pose(coil.x,coil.y,120,19),
        pose(hero.x,hero.y,hero.R*1.4,-8),pose(f.final.x,f.final.y,f.final.span*.84,0)][n];break;
    }
    default: cam=pose(f.final.x,f.final.y,f.final.span,0);s._swayT=35*35;sc.st.bloomAge=()=>5900;break;
  }
  // The illustrated renderer has no free 3D orbit; these are genuine canvas transforms.
  g.setTransform(1,0,0,1,0,0);g.globalCompositeOperation='source-over';g.globalAlpha=1;
  g.fillStyle=s.theme().bg;g.fillRect(0,0,W,H);
  g.save();g.translate(W/2,H/2);g.rotate(cam.roll*Math.PI/180);
  g.scale(H/cam.span,H/cam.span);g.translate(-cam.x,-cam.y);
  s._fr={f:1,x:540,y:540};const B=s.backend(g);
  s.stageRender(B,now,sc.st);
  if(sc.after)sc.after(B);
  if(scene.motion==='bite') {
    const bu=seconds<10?mix(.18,.259,(seconds-7.5)/2.5):mix(.265,.35,(seconds-10)/5);
    const b=s.bfly(bu,m);
    if(b){s.stageHalo(B,b.x,b.y,b.s*2.8);s.butterflyNoir(B,b.x,b.y,b.s,b.ang,b.open,b.perched);}
  }
  if(scene.id==='fever'&&p>=.5&&p<.75) {
    const b=s.bfly(.24,a.MOTIONS.find(m=>m.id==='bite'));
    if(b){s.stageHalo(B,b.x,b.y,b.s*2.8);s.butterflyNoir(B,b.x,b.y,b.s,b.ang,b.open,b.perched);}
  }
  g.restore();
  if(scene.id==='identity'&&seconds>=36.25) {
    g.textAlign='center';g.fillStyle='#c0aeb3';g.font='14px Georgia';
    T.credits.forEach((line,i)=>g.fillText(line,W/2,H-39+i*20));
  }
  return {png:f.out.toDataURL('image/png'),state:{seconds,scene:scene.id,look:scene.look,
    motion:scene.motion,nativeU:u,physicalTime:physical,camera:cam,
    stains:s.stains.length,bit:s.sim?.bit||false,
    drops:s.drops.filter(d=>d.st!=='spray').map(d=>({x:d.x,y:d.y,st:d.st})),
    proofOnly:true}};
}
