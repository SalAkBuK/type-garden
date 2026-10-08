import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const direction = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const T = JSON.parse(fs.readFileSync(path.join(direction, 'timeline.json'), 'utf8'));
const out = path.join(direction, 'output');
const tiles = path.join(out, 'board-tiles');
const framePath = key => path.join(out, 'keyframes', key.id + '.png');
if (process.argv.some(arg => ['--full', '--render', '--video', '--audio'].includes(arg))) {
  throw new Error('This review tool only assembles existing stills. Continuous and final renders are held for review.');
}
if (T.keyframes.length !== 48 || T.durationSeconds !== 40) throw new Error('Expected the 48-frame, 40-second showcase storyboard.');
if (!T.scenes.every((s, i) => s.start === (i ? T.scenes[i - 1].end : 0)) || T.scenes.at(-1).end !== 40) {
  throw new Error('Storyboard passages must cover 0–40 seconds without gaps.');
}

const json = JSON.stringify(T).replaceAll('<', '\\u003c');
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<title>Rose Garden — Same Words, Many Worlds / V3 Showcase Review</title>
<style>
:root{color-scheme:dark;--bg:#0f1010;--paper:#f0e9df;--muted:#aaa49b;--line:#34322f;--red:#e34e68;--card:#151615}*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:30px}body{margin:0;background:var(--bg);color:var(--paper);font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased}a{color:inherit;text-underline-offset:5px}a:hover{color:white}button{font:inherit}a:focus-visible,button:focus-visible{outline:2px solid var(--red);outline-offset:5px}.wrap{width:min(1500px,calc(100% - 96px));margin:auto}.masthead{display:flex;justify-content:space-between;gap:24px;padding:27px 0 24px;border-bottom:1px solid var(--line);font-size:10px;letter-spacing:.15em;text-transform:uppercase}.masthead span:last-child{color:var(--muted)}.intro{display:grid;grid-template-columns:1.2fr 1fr;gap:70px;align-items:end;padding:70px 0 48px}h1{margin:0;font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:clamp(64px,8vw,125px);line-height:.92;letter-spacing:-.065em}h1 em{display:block;color:var(--red);font-weight:400}.premise{max-width:490px}.premise .lead{font-family:Georgia,'Times New Roman',serif;font-size:27px;line-height:1.3;margin:0 0 24px}.specs,.eyebrow{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);line-height:1.7}.specs{display:flex;flex-wrap:wrap;gap:6px 20px}.hero{display:block;width:100%;aspect-ratio:16/9;object-fit:contain;background:#080808}.hero-caption{display:flex;justify-content:space-between;gap:20px;font-size:10px;color:var(--muted);padding:16px 0;border-bottom:1px solid var(--line);letter-spacing:.08em;text-transform:uppercase}.note-row{display:grid;grid-template-columns:1fr 1fr;gap:40px;padding:25px 0 38px}.note-row p{margin:0;max-width:650px;color:var(--muted);font-size:13px;line-height:1.7}.note-row strong{color:var(--paper);font-weight:400}.resources{display:flex;gap:14px 24px;justify-content:flex-end;align-content:start;flex-wrap:wrap;font-size:12px;line-height:1.7}.timeline{display:flex;width:100%;margin-bottom:56px;border:1px solid var(--line);min-height:76px}.timeline a{display:flex;flex-direction:column;justify-content:center;padding:12px 8px;text-decoration:none;font-size:9px;gap:8px;border-right:1px solid var(--line);min-width:0;background:#191a18}.timeline a:nth-child(even){background:#251719}.timeline a:last-child{border:0}.timeline b{font-size:10px;font-weight:400}.timeline span{font-variant-numeric:tabular-nums;color:var(--muted);white-space:nowrap}.timeline a:hover{background:#3b1d25}.section-head{display:flex;align-items:end;justify-content:space-between;gap:28px;padding-bottom:22px;border-bottom:1px solid var(--line)}h2{margin:0;font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:40px;line-height:1.1;letter-spacing:-.03em}.section-head p{margin:0;color:var(--muted);font-size:12px;max-width:520px;line-height:1.7}.chapter{padding:35px 0 55px}.chapter-heading{display:grid;grid-template-columns:220px 1fr;gap:25px;align-items:start;margin-bottom:24px}h3{font-family:Georgia,'Times New Roman',serif;font-size:29px;font-weight:400;letter-spacing:-.025em;margin:6px 0 0}.chapter-copy{max-width:940px}.chapter-copy p{margin:0 0 11px;line-height:1.65;font-size:13px;color:#d0c7be}.chapter-copy dl{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin:0}.chapter-copy dt{font-size:9px;text-transform:uppercase;letter-spacing:.1em;color:var(--red);margin-bottom:5px}.chapter-copy dd{margin:0;color:var(--muted);font-size:11px;line-height:1.6}.cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:23px 15px}.card{min-width:0;margin:0}.image-button{display:block;cursor:zoom-in;position:relative;border:0;padding:0;background:#080808;width:100%;aspect-ratio:16/9}.image-button img{display:block;width:100%;height:100%;object-fit:contain;transition:filter .25s}.image-button:hover img{filter:brightness(1.14)}.image-button::after{content:'↗';position:absolute;right:10px;bottom:8px;font-size:16px;opacity:0;color:white;text-shadow:0 1px 5px black}.image-button:hover::after,.image-button:focus-visible::after{opacity:1}.card figcaption{padding:11px 0 0;line-height:1.45}.frame-index{font-size:9px;letter-spacing:.08em;color:var(--muted);font-variant-numeric:tabular-nums;display:flex;justify-content:space-between;gap:8px;margin-bottom:5px}.frame-title{font-size:12px;color:#e5d9cb}.source{font-size:9px;color:#888b83;margin-top:4px;line-height:1.5}.chapter + .chapter{border-top:1px solid var(--line)}.comparisons{padding:10px 0 60px}.pair-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:35px 25px;padding-top:30px}.pair{border-top:1px solid var(--line);padding-top:15px}.pair-head{display:flex;justify-content:space-between;gap:15px;align-items:baseline;margin-bottom:12px}.pair-head h3{font-size:24px;margin:0}.pair-head span{font-size:10px;color:var(--muted)}.pair .cards{grid-template-columns:repeat(2,minmax(0,1fr))}.pair p{font-size:12px;line-height:1.65;color:var(--muted);margin:14px 0 0}.downloads{padding:10px 0 50px}.download-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;padding-top:24px}.download-card{display:block;text-decoration:none;padding:21px;border:1px solid var(--line);background:#141513}.download-card:hover{border-color:#766859}.download-card b{display:block;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:400;margin-bottom:10px}.download-card span{color:var(--muted);font-size:11px;line-height:1.7}.review-limit{display:grid;grid-template-columns:1fr 1fr;gap:40px;padding:27px 0 40px;border-top:1px solid var(--line);font-size:12px;line-height:1.75;color:var(--muted)}.review-limit p{margin:0}footer{display:flex;justify-content:space-between;gap:25px;border-top:1px solid var(--line);padding:27px 0 40px}.identity{font-family:Georgia,'Times New Roman',serif;font-size:25px;letter-spacing:.08em}.credits p{margin:0;text-align:right;font-size:11px;line-height:1.85;color:var(--muted)}dialog{border:1px solid #4a403b;background:#0e0f0e;color:var(--paper);padding:16px;width:min(1200px,96vw);max-height:95vh;overflow:auto}dialog::backdrop{background:#000c}.lightbox-top{display:flex;justify-content:space-between;gap:20px;align-items:center;margin-bottom:12px;font-size:12px}.lightbox-top button{background:transparent;color:var(--paper);border:1px solid var(--line);padding:7px 13px;cursor:pointer}dialog img{display:block;width:100%;aspect-ratio:16/9;object-fit:contain;background:#000}dialog p{color:var(--muted);font-size:11px;line-height:1.6;margin:12px 0 0}@media(max-width:1100px){.wrap{width:calc(100% - 54px)}.intro{gap:40px}h1{font-size:clamp(62px,8.5vw,95px)}.premise .lead{font-size:23px}.cards{grid-template-columns:repeat(3,minmax(0,1fr))}.timeline{flex-wrap:wrap}.timeline a{flex-basis:20%!important;min-height:65px}.chapter-heading{grid-template-columns:180px 1fr}}@media(max-width:700px){.wrap{width:calc(100% - 30px)}.masthead{font-size:8px;letter-spacing:.09em}.intro{grid-template-columns:1fr;gap:26px;padding:45px 0 32px}h1{font-size:clamp(66px,16vw,112px)}.premise .lead{font-size:23px}.hero-caption{font-size:8px;line-height:1.6}.note-row,.review-limit{grid-template-columns:1fr;gap:18px}.resources{justify-content:flex-start}.timeline a{flex-basis:33.33%!important}.timeline{margin-bottom:35px}.section-head{display:block}.section-head p{margin-top:16px}h2{font-size:34px}.chapter-heading{grid-template-columns:1fr;gap:15px}.chapter-copy dl{grid-template-columns:1fr;gap:10px}.cards{grid-template-columns:repeat(2,minmax(0,1fr));gap:20px 10px}.pair-grid,.download-grid{grid-template-columns:1fr}.chapter{padding-bottom:35px}.frame-title{font-size:11px}.source{font-size:8px}footer{display:block}.credits{margin-top:18px}.credits p{text-align:left}}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}.image-button img{transition:none}}
</style>
</head>
<body>
<div class="wrap">
<header class="masthead"><span>Rose Garden / V3 showcase</span><span>New direction · storyboard review</span></header>
<div class="intro"><h1>Same words,<em>many worlds.</em></h1><div class="premise"><p class="lead">Type “in bloom.” Watch a garden take hold. Transform the living words into worlds of colour, texture and motion.</p><div class="specs"><span>40 seconds</span><span>48 renderer stills</span><span>9 passages</span><span>16:9</span></div></div></div>
<img class="hero" src="output/keyframes/08-complete.png" width="960" height="540" alt="The completed in bloom living typography from the actual Rose Garden application">
<div class="hero-caption"><span>5.90 seconds / the core idea, completely readable</span><span>Actual application artwork</span></div>
<div class="note-row"><p><strong>This is a still storyboard for review.</strong> The opening uses real typing and growth; the remaining frames use the native renderer. The images establish composition and sequence. Continuous animation, transitions, camera motion and the sound mix are proposed here; the expensive full render is held.</p><div class="resources"><a href="output/storyboard.png">All 48 frames ↗</a><a href="storyboard.md">Direction &amp; choreography ↗</a><a href="coverage.md">Renderer research &amp; coverage ↗</a><a href="../v3/review.html">Preserved Tender Violence V3 ↗</a></div></div>
<nav class="timeline" id="timeline" aria-label="Proposed 40-second narrative"></nav>
<div class="section-head"><h2>The film, frame by frame.</h2><p>Readable words remain the visual refrain. Match cuts preserve the composition; macro passages reveal the life and material within it. Captions belong to this review page and contact sheets.</p></div>
<main id="chapters"></main>
<section class="comparisons" aria-labelledby="material-title"><div class="section-head"><h2 id="material-title">One event. Four responses.</h2><p>Each pair shows an early and evolved state of a separate clean native simulation. The blood touches a glyph; the surface determines what happens next.</p></div><p class="material-dose" style="color:var(--muted);font-size:12px;line-height:1.7;margin:20px 0 0">All four material experiments use the same Fluid-based custom dose: Amount 3, within the application?s native control range. Native physics are unchanged. This stronger dose also reaches Wax?s existing runoff threshold.</p><div class="pair-grid" id="material-pairs"></div></section>
<section class="downloads" aria-labelledby="sheet-title"><div class="section-head"><h2 id="sheet-title">Contact sheets.</h2><p>Actual 960 × 540 source stills, grouped for closer review. No video or audio has been generated for this direction.</p></div><div class="download-grid"><a class="download-card" href="output/storyboard-growth-interaction.png"><b>Growth &amp; encounter</b><span>Frames 01–19 · 0–18s<br>Open → type → grow → butterfly → blood.</span></a><a class="download-card" href="output/storyboard-worlds.png"><b>Many worlds</b><span>Frames 20–30 · 18–27s<br>Seven Looks, three glyph refits, custom colours.</span></a><a class="download-card" href="output/storyboard-materials-climax.png"><b>Materials &amp; climax</b><span>Frames 31–48 · 27–40s<br>Ichor, absorption, wicking, wax, botanical crescendo, identity.</span></a></div></section>
<div class="review-limit"><p>The film’s sound direction is a 120 BPM pulse: typing becomes stem friction, wingbeats interrupt the rhythm, the blood impact opens the montage, and four material textures carry the final escalation. The identity lands on a sustained chord.</p><p>The application, V1, V2 and Tender Violence V3 remain separately preserved. This direction lives in <code>film/v3-showcase</code>. Growth and material clocks may be accelerated during animation; native algorithms and thresholds remain intact.</p></div>
<footer><div class="identity">ROSE GARDEN</div><div class="credits"><p>Based on an original concept by Akshat Agarwal</p><p>Reimagined and expanded as Rose Garden</p></div></footer>
</div>
<dialog id="lightbox"><div class="lightbox-top"><span id="lightbox-title"></span><button type="button" id="close-lightbox">Close ×</button></div><img id="lightbox-image" width="960" height="540" alt=""><p id="lightbox-source"></p></dialog>
<script id="storyboard-data" type="application/json">${json}</script>
<script>
const T=JSON.parse(document.getElementById('storyboard-data').textContent);
const titles={opening:'Open. Type. Grow.',beauty:'The living words',encounter:'A visitor, a wound',worlds:'Seven genuine Looks',fonts:'New letterforms','custom-colour':'Colour beyond presets',materials:'Blood meets matter',botanicals:'The garden takes over',identity:'ROSE GARDEN'};
const shortTitles={opening:'Type & grow',beauty:'Beauty',encounter:'Encounter',worlds:'Looks',fonts:'Fonts','custom-colour':'Colour',materials:'Materials',botanicals:'Botanicals',identity:'Identity'};
const element=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
const time=n=>n.toFixed(n%1?2:0)+'s';
const range=s=>time(s.start)+'–'+time(s.end);
const source=k=>k.source==='live-opening'?'Live application / actual typing and growth':[k.look,k.font,k.material,k.experiment?'Fluid-based custom / Amount 3':k.bleed==='fluid'?'Fluid bleeding':'Legacy bleeding',k.view].filter(Boolean).join(' / ');
const dialog=document.getElementById('lightbox');
function card(k){const fig=element('figure','card');const b=element('button','image-button');b.type='button';b.setAttribute('aria-label','Enlarge '+k.label);const img=element('img');img.src='output/keyframes/'+k.id+'.png';img.alt=k.label;img.width=960;img.height=540;img.loading='lazy';b.append(img);b.addEventListener('click',()=>{document.getElementById('lightbox-title').textContent=k.id.slice(0,2)+' / '+time(k.seconds)+' / '+k.label;const full=document.getElementById('lightbox-image');full.src=img.src;full.alt=k.label;document.getElementById('lightbox-source').textContent=source(k);dialog.showModal()});const cap=element('figcaption');const index=element('div','frame-index');index.append(element('span','',k.id.slice(0,2)),element('span','',time(k.seconds)));cap.append(index,element('div','frame-title',k.label),element('div','source',source(k)));fig.append(b,cap);return fig}
T.scenes.forEach((s,i)=>{const nav=element('a');nav.href='#'+s.id;nav.style.flex=(s.end-s.start)+' 1 0';nav.append(element('b','',shortTitles[s.id]),element('span','',range(s)));document.getElementById('timeline').append(nav);const chapter=element('section','chapter');chapter.id=s.id;const heading=element('div','chapter-heading');const title=element('div');title.append(element('div','eyebrow',String(i+1).padStart(2,'0')+' / '+range(s)),element('h3','',titles[s.id]));const copy=element('div','chapter-copy');copy.append(element('p','',s.intent));const dl=element('dl');[['Camera',s.camera],['Sound direction',s.sound]].forEach(([label,text])=>{const d=element('div');d.append(element('dt','',label),element('dd','',text));dl.append(d)});copy.append(dl);heading.append(title,copy);const cards=element('div','cards');T.keyframes.filter(k=>k.seconds>=s.start&&k.seconds<s.end).forEach(k=>cards.append(card(k)));chapter.append(heading,cards);document.getElementById('chapters').append(chapter)});
const materialPairs=[{name:'Ink',ids:['31-ink-wet','32-ink-flow'],fluid:'Silver ichor / Fluid-based custom',copy:'Silver remains on the sealed glyph, developing connected paths and pools.'},{name:'Blotting Paper',ids:['33-paper-wet','35-paper-halo'],fluid:'Crimson / Fluid-based custom',copy:'The wet impact becomes an absorbed pigment stain with a broader water front and feathered tide line.'},{name:'Linen',ids:['36-linen-wet','38-linen-wick'],fluid:'Crimson / Fluid-based custom',copy:'The same splash spreads along the weave, building a slower thread-directed stain.'},{name:'Wax',ids:['39-wax-wet','42-wax-fall'],fluid:'Crimson / Fluid-based custom',copy:'The surface holds rounded beads; accumulated weight produces sliding, hanging and runoff.'}];
materialPairs.forEach(p=>{const pair=element('article','pair');const head=element('div','pair-head');head.append(element('h3','',p.name),element('span','',p.fluid));const cards=element('div','cards');p.ids.forEach(id=>cards.append(card(T.keyframes.find(k=>k.id===id))));pair.append(head,cards,element('p','',p.copy));document.getElementById('material-pairs').append(pair)});
document.getElementById('close-lightbox').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()}});
</script>
</body>
</html>
`;
fs.writeFileSync(path.join(direction, 'review.html'), html);
if (process.argv.includes('--review-only')) {
  console.log(JSON.stringify({ review: path.join(direction, 'review.html'), stage: 'HTML only; no sheet assembly or rendering' }, null, 2));
  process.exit(0);
}

const missing = T.keyframes.filter(k => !fs.existsSync(framePath(k))).map(k => k.id);
if (missing.length) throw new Error('Storyboard source assets are not ready: ' + missing.join(', '));
fs.mkdirSync(tiles, { recursive: true });
const run = (exe, args) => {
  const r = spawnSync(exe, args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(exe + ': ' + (r.stderr || r.stdout));
  return r.stdout;
};
const filterPath = p => path.resolve(p).replaceAll('\\', '/').replaceAll(':', '\\:').replaceAll("'", "\\'");
const font = filterPath('C:/Windows/Fonts/consola.ttf');
const fontSerif = filterPath('C:/Windows/Fonts/georgia.ttf');
const drawTextFile = (file, y, size = 12, color = '0xc8bdb0', x = 10) =>
  `drawtext=fontfile='${font}':textfile='${filterPath(file)}':x=${x}:y=${y}:fontsize=${size}:fontcolor=${color}`;
for (let i = 0; i < T.keyframes.length; i++) {
  const k = T.keyframes[i];
  const caption = path.join(tiles, String(i).padStart(2, '0') + '.txt');
  fs.writeFileSync(caption, String(i + 1).padStart(2, '0') + '  ' + k.seconds.toFixed(2) + 's\n' + k.label + '\n');
  run('ffmpeg', ['-v', 'error', '-y', '-i', framePath(k), '-vf',
    `scale=384:216,pad=384:248:0:0:color=0x101110,${drawTextFile(caption, 219, 11)}`,
    '-frames:v', '1', path.join(tiles, String(i).padStart(2, '0') + '.png')]);
}
const sheets = [
  { name: 'storyboard', start: 0, count: 48, title: 'ROSE GARDEN / SAME WORDS, MANY WORLDS', detail: 'V3 SHOWCASE STORYBOARD  |  48 native stills  |  40 seconds  |  Review only' },
  { name: 'storyboard-growth-interaction', start: 0, count: 19, title: 'ROSE GARDEN / GROWTH & ENCOUNTER', detail: '01-19  |  0-18s  |  Open / type / grow / butterfly / blood / glyph response' },
  { name: 'storyboard-worlds', start: 19, count: 11, title: 'ROSE GARDEN / MANY WORLDS', detail: '20-30  |  18-27s  |  Seven Looks / three fonts / custom colour' },
  { name: 'storyboard-materials-climax', start: 30, count: 18, title: 'ROSE GARDEN / MATERIALS & CLIMAX', detail: '31-48  |  27-40s  |  Ichor / absorption / wicking / wax / botanicals / identity' },
];
for (const s of sheets) {
  const rows = Math.ceil(s.count / 4);
  const titleFile = path.join(tiles, s.name + '-title.txt');
  const detailFile = path.join(tiles, s.name + '-detail.txt');
  const footFile = path.join(tiles, s.name + '-footer.txt');
  fs.writeFileSync(titleFile, s.title);
  fs.writeFileSync(detailFile, s.detail);
  fs.writeFileSync(footFile, 'Actual renderer artwork / labels for storyboard review only / continuous animation and final render held');
  const filter = `tile=4x${rows}:nb_frames=${s.count}:padding=4:margin=4:color=0x101110,pad=iw:ih+96:0:70:color=0x101110,` +
    `drawtext=fontfile='${fontSerif}':textfile='${filterPath(titleFile)}':x=16:y=12:fontsize=27:fontcolor=0xf0e9df,` +
    drawTextFile(detailFile, 46, 13, '0xc8bdb0', 16) + ',' + drawTextFile(footFile, 'h-20', 12, '0x928e85', 16);
  run('ffmpeg', ['-v', 'error', '-y', '-framerate', '1', '-start_number', String(s.start), '-i', path.join(tiles, '%02d.png'),
    '-vf', filter, '-frames:v', '1', path.join(out, s.name + '.png')]);
}
const frames = T.keyframes.map(k => {
  const p = JSON.parse(run('ffprobe', ['-v', 'error', '-show_entries', 'stream=width,height', '-of', 'json', framePath(k)]));
  return { id: k.id, width: p.streams[0].width, height: p.streams[0].height };
});
if (!frames.every(k => k.width === 960 && k.height === 540)) throw new Error('Every source still must be 960 × 540.');
console.log(JSON.stringify({ pass: true, sourceFrames: frames.length, dimensions: [960, 540], review: path.join(direction, 'review.html'),
  sheets: sheets.map(s => path.join(out, s.name + '.png')), generatedVideo: false, generatedAudio: false, finalRendered: false }, null, 2));
