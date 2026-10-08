import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const film = path.join(root, 'film');
export const timeline = JSON.parse(fs.readFileSync(path.join(film, 'timeline.json')));
export const beatSeconds = 60 / timeline.bpm;
export const frameAt = (beat, fps) => Math.round(beat * beatSeconds * fps);
export async function openRenderer({size=540, software=false, highPerformance=false}={}) {
  const executablePath = process.env.FILM_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
  const browser = await chromium.launch({executablePath, headless:true, args:software ? ['--disable-gpu','--disable-accelerated-2d-canvas'] : highPerformance ? ['--use-angle=d3d11','--force_high_performance_gpu'] : []});
  const page = await browser.newPage({viewport:{width:1080,height:1080},deviceScaleFactor:size===1080?2:1});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(() => {
    window.__filmClock=100000;
    performance.now=()=>window.__filmClock;
    window.requestAnimationFrame=()=>0;
    let s=4242;
    Math.random=()=>((s=Math.imul(s^(s>>>15),0x2c1b3c6d)+0x6d2b79f5|0)>>>0)/4294967296;
  });
  await page.goto(pathToFileURL(path.join(root,'index.html')).href);
  // RAF polling cannot work when the renderer clock is manually driven.
  await page.waitForFunction(()=>window.__typeGarden?.fontsReady, {polling:100});
  await page.evaluate(async ({size,timeline})=>{
    const a=window.__typeGarden;
    await document.fonts.ready;
    const scale=size===1080?2:1;
    a.setMode('type'); a.POSTER.size=1080*scale; a.pcv.width=a.pcv.height=1080*scale;
    a.state.text=timeline.body; a.state.seed=timeline.seed; a.setMode('poster');
    a.state.busy=true;
    const c=document.createElement('canvas'); c.width=c.height=size;
    window.__film={out:c,ctx:c.getContext('2d'),size,scale,look:null,material:null,titleReady:false,titleAt:0,typed:0,timeline};
    a.stage.stageWarm(a.pcv.getContext('2d'),a.MOTIONS.find(m=>m.id==='bite'));
  },{size,timeline});
  return {browser,page,errors,async draw(scene,seconds){
    const data=await page.evaluate(drawFrame,{scene,seconds});
    return Buffer.from(data.split(',')[1],'base64');
  }};
}

// Adapter only: every plant, drop, stain, death and regrowth is drawn by the existing app.
// Draft uses the 1080 proof stage; full output uses the approved 2160 macro source.
export function drawFrame({scene,seconds}) {
  const a=window.__typeGarden,f=window.__film,T=f.timeline,g=f.ctx,N=f.size,ST=1080*f.scale;
  const beat=seconds*T.bpm/60, p=Math.max(0,Math.min(1,(beat-scene.startBeat)/(scene.endBeat-scene.startBeat)));
  const lerp=(x,y,v)=>x+(y-x)*v, smooth=v=>{v=Math.max(0,Math.min(1,v));return v*v*(3-2*v);};
  const set=(look,material='ink')=>{
    if(f.look!==look){a.setLook(look);f.look=look;}
    if(f.material!==material){a.setMaterial(material);f.material=material;a.stage?.stageReset();}
  };
  const stage=(look,motion,u,material='ink')=>{
    set(look,material);
    const m=a.MOTIONS.find(m=>m.id===motion);
    const s=a.stage;
    if(scene.id==='ichor'&&beat>=scene.handoffStartBeat){
      // Interpolate the real camera's affine transform into the next frame, without dissolving two gardens.
      const q=smooth((beat-scene.handoffStartBeat)/(scene.endBeat-scene.handoffStartBeat));
      const fr=s.stageFrame(m);s._fr=fr;
      const cam=s.stageCamera(u,m)||{z:1,x:ST/2,y:ST/2},next=s.stageFrame(a.MOTIONS.find(m=>m.id==='wither'));
      const fit={f:lerp(fr.f*cam.z,next.f,q),x:lerp(fr.x+(cam.x-ST/2)/fr.f,next.x,q),y:lerp(fr.y+(cam.y-ST/2)/fr.f,next.y,q)};
      const originalFrame=s.stageFrame,originalScript=s.scriptBite;
      s.stageFrame=()=>fit;
      s.scriptBite=function(...v){const sc=originalScript.apply(this,v);sc.cam=null;sc.st.bloodFade=(sc.st.bloodFade??1)*(1-q);return sc;};
      try{s.stageDraw(a.pcv.getContext('2d'),u*m.T,m);}finally{s.stageFrame=originalFrame;s.scriptBite=originalScript;}
    }else s.stageDraw(a.pcv.getContext('2d'),u*m.T,m);
  };
  const crop=(x=0,y=0,s=1080)=>{g.setTransform(1,0,0,1,0,0);g.drawImage(a.pcv,x*f.scale,y*f.scale,s*f.scale,s*f.scale,0,0,N,N);};
  if(scene.id==='title') {
    if(!f.titleReady) {
      a.setMode('type');a.setLook('crimson');a.props.showHint=false;a.fill=scene.fill;a.clearText();
      document.getElementById('tg-bar').style.display='none';
      f.titleReady=true;f.titleAt=0;f.typed=0;f.nextKey=(scene.typeStartBeat-scene.startBeat)*60/T.bpm*1000;
      a.maybeVisit=()=>{};
    }
    const real=(beat-scene.startBeat)*60/T.bpm*1000;
    // Fixed 60 Hz internal stepping makes 30/60 fps and random seeks agree.
    while(f.titleAt+1000/60<=real+1e-5) {
      f.titleAt+=1000/60;
      const clock=100000+f.titleAt+(f.typed>=scene.text.length ? Math.max(0,f.titleAt-f.lastKey)*(scene.pauseClockScale-1):0);
      window.__filmClock=clock;
      if(f.typed<scene.text.length && f.titleAt>=f.nextKey-1e-5) {
        const ch=scene.text[f.typed++];a.add(ch,clock,a.keyEvent(clock));
        f.nextKey+=(ch===' '?scene.spaceStepBeats:scene.keyStepBeats)*60/T.bpm*1000;
        f.lastKey=f.titleAt;
      }
      a.Sd+=(a.St-a.Sd)*0.3; a.frame();
    }
    a.paint(window.__filmClock,f.typed<scene.text.length);
    g.drawImage(a.cv,0,0,N,N);
    if(beat>=scene.bloomHoldBeat){g.fillStyle='#a99b9e';g.font=`${N*0.012}px Georgia`;g.textAlign='center';g.fillText(T.credit,N/2,N*0.962);}
  } else if(scene.id==='rebirth') {
    if(beat<scene.wickEndBeat) {
      stage('silver','wither',scene.deadU);const A=a.pcv.getContext('2d').getImageData(0,0,ST,ST);
      stage('oldrose','wither',scene.deadU);const B=a.pcv.getContext('2d').getImageData(0,0,ST,ST);
      if(!f.wickField){
        f.wickField=new Float32Array(ST*ST);
        const hash=(x,y)=>{let n=Math.imul(x,374761393)+Math.imul(y,668265263);n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967296;};
        const noise=(x,y)=>{const X=Math.floor(x),Y=Math.floor(y),u=smooth(x-X),v=smooth(y-Y);return lerp(lerp(hash(X,Y),hash(X+1,Y),u),lerp(hash(X,Y+1),hash(X+1,Y+1),u),v);};
        for(let y=0;y<ST;y++)for(let x=0;x<ST;x++)f.wickField[y*ST+x]=(1-y/(ST-1))*0.85+noise(x/f.scale/42,y/f.scale/115)*0.1+noise(x/f.scale/9,y/f.scale/38)*0.04;
      }
      const w=smooth((beat-scene.startBeat)/(scene.wickEndBeat-scene.startBeat));
      for(let i=0;i<f.wickField.length;i++){
        const mask=smooth((w*1.08-f.wickField[i])/0.025);
        for(let k=0;k<3;k++)A.data[i*4+k]=lerp(A.data[i*4+k],B.data[i*4+k],mask);
      }
      a.pcv.getContext('2d').putImageData(A,0,0);crop();
    }else {stage('oldrose','wither',lerp(0.80,0.99,smooth((beat-scene.wickEndBeat)/(scene.endBeat-scene.wickEndBeat))));crop();}
  } else {
    let u=lerp(...scene.u,p),look=scene.look,material='ink';
    if(scene.id==='opening') {
      const biteBeat=T.events.find(e=>e.id==='bite').beat,impactBeat=T.events.find(e=>e.id==='impact').beat;
      if(!f.physicalCues){
        // Find the renderer's actual first splash, then retime its existing simulation onto the score.
        const s=a.stage,m=a.MOTIONS.find(m=>m.id==='bite'),dt=1000/60/m.clock;
        s.stageReset();let biteU=null,impactU=null;
        for(let t=0;t<m.T*0.5;t+=dt){s.stageSeek(m,t);if(s.sim.bit&&biteU===null)biteU=s.sim.t/m.T+1e-7;if(s.stains.length){impactU=s.sim.t/m.T+1e-7;break;}}
        if(biteU===null||impactU===null)throw Error('Cannot locate physical Bite / impact cues');
        f.physicalCues={biteU,impactU};s.stageReset();
      }
      const {biteU,impactU}=f.physicalCues;
      u=beat<biteBeat?lerp(scene.u[0],biteU,beat/biteBeat):beat<impactBeat?lerp(biteU,impactU,(beat-biteBeat)/(impactBeat-biteBeat)):lerp(impactU,scene.u[1],(beat-impactBeat)/(scene.endBeat-impactBeat));
    }
    if(scene.id==='materials'){
      const hit=scene.hits.filter(h=>h.beat<=beat).at(-1);material=hit.material;
      // Restart the same physical experiment on each material, then advance its liquid simulation.
      const span=material==='wax'?1:1;
      u=lerp(...scene.u,Math.min(1,(beat-hit.beat)/span));
    }
    if(scene.id==='worlds')look=scene.hits.filter(h=>h.beat<=beat).at(-1).look;
    if(scene.id==='wither')u=lerp(...scene.u,Math.min(1,(beat-scene.startBeat)/(scene.deadHoldBeat-scene.startBeat)));
    stage(look,scene.motion,u,material);
    if(scene.id==='opening') {
      const impactBeat=T.events.find(e=>e.id==='impact').beat;
      const pull=smooth((beat-impactBeat)/(scene.endBeat-impactBeat-0.5)),s=lerp(280,1080,pull);
      crop(lerp(370,0,pull),lerp(380,0,pull),s);
    }else if(scene.id==='materials')crop(320,400,320);
    else if(scene.id==='ichor') {
      const pull=smooth((p-0.55)/0.45);crop(lerp(280,0,pull),lerp(350,0,pull),lerp(350,1080,pull));
    }
    else crop();
  }
  return f.out.toDataURL('image/png');
}
