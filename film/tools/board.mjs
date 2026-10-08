// Storyboard sheet: real renderer frames + beat-grid timeline -> one PNG.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
const SP = 'C:/Users/oneof/AppData/Local/Temp/claude/c--Users-oneof-OneDrive-Documents-type-garden-type-garden/eef69958-f5f9-44a7-8ae7-33376c5c94a2/scratchpad/shots';
const OUT = path.resolve(process.argv[2] || 'storyboard.png');
const src = n => 'file:///' + SP + '/' + n + '.png';
const CW = 330, GAP = 14, W = CW * 4 + GAP * 3;

// a tile: image n (iw px wide) cropped to [x,y,s], shown at size px
const tile = (n, size, crop, iw, label) => {
  const [x, y, s] = crop || [0, 0, iw], k = size / s;
  return `<div class="tile" style="width:${size}px;height:${size}px"><div style="width:${size}px;height:${size}px;background:url('${src(n)}') ${-x * k}px ${-y * k}px/${iw * k}px ${iw * k}px no-repeat"></div>${label ? `<i>${label}</i>` : ''}</div>`;
};
const panel = ({ span = 1, tc, bar, title, tiles, text, sound, cols }) => {
  const w = CW * span + GAP * (span - 1);
  const n = tiles.length, c = cols || n, size = Math.floor((w - GAP * (c - 1)) / c);
  const rows = Math.ceil(n / c);
  return `<section style="grid-column:span ${span}"><div class="meta"><b>${tc}</b><span>${bar}</span><em>${title}</em></div>
  <div class="tiles" style="grid-template-columns:repeat(${c},${size}px)">${tiles.map(t => tile(t.n, size, t.crop, t.iw, t.label)).join('')}</div>
  <p>${text}</p><p class="snd">♪ ${sound}</p></section>`;
};

const P = [];
P.push(panel({ tc: '0:00.0', bar: 'BAR 1', title: 'OVERTURE · frame 0', tiles: [{ n: 'd_0.34', iw: 2160, crop: [740, 760, 560] }],
  text: 'The black butterfly on the hero bloom, macro, lit by the rose’s own red glow. No title, no UI. A slow push; the wings open.', sound: 'Silence → low drone, a glass-harmonica fifth.' }));
P.push(panel({ tc: '0:01.3', bar: 'BAR 1 · BEAT 3', title: 'THE BITE', tiles: [{ n: 'd_0.31', iw: 2160, crop: [700, 720, 600] }],
  text: 'The bloom takes the bite. A bead swells at the petal edge and hangs, held on the beat.', sound: 'Heartbeat sub begins. One soft wet pluck.' }));
P.push(panel({ tc: '0:02.7', bar: 'BAR 2 · DOWNBEAT', title: 'IMPACT', tiles: [{ n: 'd_0.4', iw: 2160, crop: [560, 560, 760] }],
  text: 'The drop falls through the dark (the camera tilts down with it) and splashes on the “l” exactly on the downbeat.', sound: 'Sub hit + glassy drop, long reverb tail.' }));
P.push(panel({ tc: '0:03.3', bar: 'BAR 2', title: 'REVEAL', tiles: [{ n: 't1_bloom_bite_b', iw: 1080, crop: [40, 80, 1000] }],
  text: 'The camera pulls back and rises: the whole word, the whole garden, for the first time. Blood keeps creeping down the letters; the butterfly lifts away.', sound: 'Drone opens into a pad. Riser into bar 3.' }));

const sk = (n, tc, title, text, sound) => panel({ tc, bar: 'BAR 3', title, tiles: [{ n: 'm_' + n + '_0.72', iw: 2160, crop: [640, 800, 640] }], text, sound });
P.push(sk('ink', '0:05.3', 'FOUR SKINS · INK', 'Same splash, same framing, same instant: a hard cut every beat. Ink is sealed: the blood sits glossy on the surface.', 'Wet tick + glass ping.'));
P.push(sk('blotting', '0:06.0', '· BLOTTING PAPER', 'It drinks. The stain wicks through the letter inside its outline, feathers along the fibres and leaves a pale ring.', 'Soft breath, paper rustle.'));
P.push(sk('linen', '0:06.7', '· LINEN', 'It soaks along the thread grid of the weave.', 'Dry thread rasp.'));
P.push(sk('wax', '0:07.3', '· WAX', 'It refuses. Beads gather, slide, hang, then drop as real falling drops. Held two beats; the last drop leaves the frame.', 'Glass-bead clicks; the last drop pitches down.'));

P.push(panel({ span: 4, tc: '0:08.0', bar: 'BAR 4', title: 'WORLD STROBE · 8 hits · 20·20·10·10·5·5·5·5 frames', cols: 8, tiles: [
  { n: 'w_crimson', iw: 1080, label: 'crimson' }, { n: 'bt_ivory_dense', iw: 1080, label: 'ivory · roses 200%' }, { n: 'w_silver', iw: 1080, label: 'silver ichor' }, { n: 'w_blackrose', iw: 1080, label: 'black rose' },
  { n: 'bt_mourning_thorn', iw: 1080, label: 'mourning · bare, thorns 200%' }, { n: 'w_oldrose', iw: 1080, label: 'old rose' }, { n: 'w_pinkblack', iw: 1080, label: 'pink & black' }, { n: 'bt_blackletter_br', iw: 1080, label: 'blackletter' }],
  text: 'Composition locked: the same seeds, so every vine, thorn and rose stays exactly where it was while the world around it changes. Hard cuts accelerate with the music. A few hits also carry one botanical or typeface change (density, bare thorny canes, blackletter), all from the real controls.',
  sound: 'Full rhythm: sub on every beat, a harp pluck on every hit, pitch climbing, then the bar drops out on the last hit.' }));

P.push(panel({ tc: '0:10.7', bar: 'BAR 5', title: 'ICHOR', tiles: [{ n: 'ich_0.75', iw: 2160, crop: [560, 700, 700] }],
  text: 'Silver world. The bite now bleeds ichor: liquid chrome running down black letters on a pale page. A bead hangs and falls.', sound: 'Everything thins to glass; one dripping note.' }));
P.push(panel({ span: 3, tc: '0:13.3', bar: 'BARS 6–7', title: 'WITHER · time-lapse', cols: 4, tiles: [
  { n: 'wi_silver_0.02', iw: 1080, label: 'whole' }, { n: 'wi_silver_0.32', iw: 1080, label: 'drain works down' }, { n: 'wi_silver_0.5', iw: 1080, label: 'petals, leaves fall' }, { n: 'wi_silver_0.82', iw: 1080, label: 'thorned skeleton' }],
  text: 'The camera pulls back from the ichor to the whole silver garden, and the life is drawn out of it top-down: roses bow and brown, petals and leaves fall, the green drains from the vines until only the thorned skeleton is left. Held for one beat in near silence.',
  sound: 'The drone pitches down and the filter closes; petals as tiny dry ticks; the last beat is nearly silent.' }));

P.push(panel({ span: 2, tc: '0:18.7', bar: 'BAR 8', title: 'THE HINGE · the page wicks', cols: 3, tiles: [
  { n: 'wick_0', iw: 1080, label: '20%' }, { n: 'wick_2', iw: 1080, label: '60%' }, { n: 'dead_oldrose', iw: 2160, label: 'old rose' }],
  text: 'The dead vines are the one thing that doesn’t change. The next world rises through the page from the bottom edge, like liquid climbing blotting paper; the letters turn from black to cream as the front passes. (A rough proof of the mask: the final edge is finer.)',
  sound: 'Low note swells; a choir pad enters as the front crosses the letters.' }));
P.push(panel({ span: 2, tc: '0:19.5', bar: 'BAR 8', title: 'REBIRTH · a different palette', cols: 3, tiles: [
  { n: 'rg_0.89', iw: 2160, label: 'regrowing' }, { n: 'rg_0.95', iw: 2160, label: '' }, { n: 'rg_0.99', iw: 2160, label: 'old rose, whole' }],
  text: 'The same garden grows back in the same places, in old rose: aubergine page, cream letters, dusty-pink roses. Lush → dead → lush, a completely different life.', sound: 'Rising shimmer into a hard stop on the bar line.' }));

P.push(panel({ span: 2, tc: '0:21.3', bar: 'BARS 9–10', title: 'TITLE · typed live', cols: 2, tiles: [
  { n: 'tvs_typed4', iw: 2160, label: '“Type” + caret' }, { n: 'tvs_typed', iw: 2160, label: 'reflows to two lines' }, { n: 'tvs_p1', iw: 2160, label: 'a bud sprouts' }, { n: 'tvs_p3', iw: 2160, label: 'stillness opens it' }],
  text: 'Hard cut to black and the crimson home palette. “Type Garden” is typed in the real type view, on sixteenth notes: vines sprout per letter, the line reflows into a stack, and after the pause the earned bloom opens (time-lapse). Bookends the opening.',
  sound: 'Soft key clicks are the only human sound. Reverse swell into the bloom.' }));
P.push(panel({ span: 2, tc: '0:24.5 → 0:26.7', bar: 'BAR 10', title: 'IDENTITY · final hold', tiles: [{ n: 'tvs_p9', iw: 2160 }],
  text: 'Type / Garden, the earned bloom open between the lines, one petal drifting. No tagline. A single small credit line is optional (see questions).', sound: 'A bell with a long tail over a suspended chord; no resolution.' }));

// ---- timeline
const TW = W, bw = TW / 10;
const scenes = [[0, 1, 'OVERTURE', '#7a1626'], [1, 2, 'IMPACT · REVEAL', '#8a2433'], [2, 3, 'FOUR SKINS', '#5b6370'], [3, 4, 'WORLD STROBE', '#9a8a66'], [4, 5, 'ICHOR', '#8e97a8'], [5, 7, 'WITHER', '#5a4a38'], [7, 8, 'REBIRTH', '#a45a78'], [8, 10, 'TITLE', '#b02438']];
const cuts = [2.0, 2.25, 2.5, 2.75, 3.0, 3.25, 3.375, 3.5, 3.625, 3.75, 3.8125, 3.875, 3.9375, 8.0, 7.0];
const energy = [[0, .1], [.5, .2], [1, .3], [1.05, .75], [1.5, .5], [2, .55], [2.5, .62], [3, .7], [3.5, .86], [3.95, 1], [4, .35], [4.5, .38], [5, .32], [5.5, .2], [6, .12], [6.7, .05], [7, .05], [7.5, .5], [7.95, .6], [8, .04], [8.5, .3], [9, .55], [9.5, .5], [10, .18]];
const ex = b => (b * bw).toFixed(1), ey = v => (138 - v * 76).toFixed(1);
const timeline = `<svg width="${TW}" height="188" viewBox="0 0 ${TW} 188" xmlns="http://www.w3.org/2000/svg" font-family="ui-monospace,Consolas,monospace">
  ${scenes.map(([a, b, t, c]) => `<g><rect x="${ex(a)}" y="0" width="${((b - a) * bw - 2).toFixed(1)}" height="30" fill="${c}"/><text x="${(+ex(a) + 8).toFixed(1)}" y="19" font-size="11" font-weight="700" fill="#fff">${t}</text></g>`).join('')}
  ${[...Array(11)].map((_, i) => `<line x1="${ex(i)}" y1="34" x2="${ex(i)}" y2="140" stroke="#3a3a3f" stroke-width="1"/>`).join('')}
  ${[...Array(10)].map((_, i) => `<text x="${(+ex(i) + 6).toFixed(1)}" y="46" font-size="10" fill="#8d8d95">bar ${i + 1} · ${(i * 80 / 30).toFixed(1)}s</text>`).join('')}
  ${[...Array(40)].map((_, i) => `<line x1="${ex(i / 4)}" y1="50" x2="${ex(i / 4)}" y2="${i % 4 ? 55 : 60}" stroke="#55555c"/>`).join('')}
  <polyline points="${energy.map(([b, v]) => `${ex(b)},${ey(v)}`).join(' ')}" fill="none" stroke="#e8c26a" stroke-width="2"/>
  <polyline points="${energy.map(([b, v]) => `${ex(b)},${ey(v)}`).join(' ')} ${ex(10)},140 0,140" fill="#e8c26a22" stroke="none"/>
  <text x="6" y="78" font-size="10" fill="#e8c26a">music energy</text>
  ${cuts.map(c => `<line x1="${ex(c)}" y1="150" x2="${ex(c)}" y2="166" stroke="#fff" stroke-width="1.5"/>`).join('')}
  <text x="6" y="182" font-size="10" fill="#8d8d95">cuts: none in bars 1–2 (one continuous camera) · beat cuts bar 3 · strobe bar 4 · wick bar 8 · hard cut bar 9</text>
</svg>`;

const html = `<!doctype html><meta charset="utf-8"><style>
 *{box-sizing:border-box} body{margin:0;background:#0c0c0e;color:#e9e6df;font:13px/1.45 ui-sans-serif,system-ui,Segoe UI,sans-serif}
 .wrap{width:${W + 64}px;padding:30px 32px 36px}
 h1{font:600 30px/1.1 Georgia,'Times New Roman',serif;margin:0 0 6px;letter-spacing:.2px} h1 small{font:12px ui-monospace,Consolas,monospace;color:#9b9ba3;margin-left:12px;letter-spacing:.5px}
 .sub{color:#a9a9b1;margin:0 0 20px;max-width:1100px}
 .grid{display:grid;grid-template-columns:repeat(4,${CW}px);gap:26px ${GAP}px;margin-top:22px}
 section .meta{display:flex;gap:9px;align-items:baseline;margin-bottom:7px;font:11px ui-monospace,Consolas,monospace;white-space:nowrap}
 .meta b{color:#e8c26a} .meta span{color:#7f7f88} .meta em{font-style:normal;color:#fff;font-weight:700;letter-spacing:.4px}
 .tiles{display:grid;gap:${GAP}px}
 .tile{position:relative;overflow:hidden;background:#000;outline:1px solid #2a2a2e}
 .tile i{position:absolute;left:0;bottom:0;right:0;padding:3px 6px;font:10px/1.2 ui-monospace,Consolas,monospace;font-style:normal;color:#fff;background:linear-gradient(#0000,#000c)}
 section p{margin:8px 0 0;color:#cfcdc6;font-size:12.5px} section p.snd{color:#9ab0c9;margin-top:5px;font-size:11.5px}
 .foot{margin-top:28px;color:#8d8d95;font:11px/1.5 ui-monospace,Consolas,monospace;border-top:1px solid #26262a;padding-top:12px}
</style><div class="wrap">
 <h1>Type Garden — launch film <small>STORYBOARD v1 · for review</small></h1>
 <p class="sub">Square 1080 × 1080 · 26.7 s (800 frames at 30 fps) · 90 BPM, 10 bars of 80 frames, one beat = 20 frames · music and sound design only, no voiceover, no captions. Every image below is a real frame from the Type Garden renderer on <b>realistic-roses</b> (none are mock-ups). The camera moves, the page-wick mask and the grain are the only designed layers added on top.</p>
 ${timeline}
 <div class="grid">${P.join('')}</div>
 <div class="foot">Real: garden, roses, vines, thorns, butterfly, blood and ichor, materials, looks, typefaces, botanical controls, Wither, the live typing. Designed on top: camera (canvas transforms at 2× render size so macro stays sharp), the wicking page transition, light film grain (also prevents banding in the dark gradients), the soundtrack (original, synthesised, locked to an event log from the render).</div>
</div>`;
fs.writeFileSync(OUT.replace(/\.png$/, '.html'), html);
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const p = await b.newPage({ viewport: { width: W + 64, height: 900 }, deviceScaleFactor: 1.5 });
await p.goto('file:///' + OUT.replace(/\\/g, '/').replace(/\.png$/, '.html')); await p.waitForTimeout(2500);
await p.screenshot({ path: OUT, fullPage: true }); await b.close(); console.log('wrote', OUT);
