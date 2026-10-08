// Key-frame renderer for the film storyboard: real Type Garden stage frames, one PNG per shot.
// usage: node kf.mjs shots.json outdir
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const [specFile, outDir] = process.argv.slice(2);
const shots = JSON.parse(fs.readFileSync(specFile, 'utf8'));
fs.mkdirSync(outDir, { recursive: true });
const FILE = 'C:/Users/oneof/OneDrive/Documents/type-garden/type-garden/index.html';
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const p = await b.newPage({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 1 });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.addInitScript(() => { let s = 4242; Math.random = () => ((s = Math.imul(s ^ (s >>> 15), 0x2c1b3c6d) + 0x6d2b79f5 | 0) >>> 0) / 4294967296; });
await p.goto('file:///' + FILE);
await p.waitForFunction(() => window.__typeGarden && window.__typeGarden.fontsReady);
let cur = '';
for (const s of shots) {
  const t0 = Date.now();
  const key = JSON.stringify([s.text, s.font || 'playfair', s.size || 1080, s.seed || 7, s.botanical || null]);
  if (key !== cur) {
    cur = key;
    await p.evaluate(async ({ text, font, size, seed, botanical }) => {
      const a = window.__typeGarden;
      a.setMode('type');
      a.POSTER.size = size; a.pcv.width = size; a.pcv.height = size;
      if (font && font !== 'playfair' || a.font().id !== 'playfair') { await a.setFont(font || 'playfair'); }
      if (botanical) a.editBotanical(botanical);
      a.state.text = text; a.state.seed = seed;
      a.setMode('poster');
    }, { text: s.text, font: s.font, size: s.size || 1080, seed: s.seed || 7, botanical: s.botanical });
    await p.waitForFunction(() => window.__typeGarden.stage);
  }
  const r = await p.evaluate(async ({ look, bleed, material, motion, t, u, appearance }) => {
    const a = window.__typeGarden;
    if (look) a.setLook(look);
    if (appearance) a.setAppearance(appearance);
    if (bleed) a.setBleed(bleed);
    if (material) a.setMaterial(material);
    const st = a.stage, m = a.MOTIONS.find(x => x.id === motion), g = a.pcv.getContext('2d');
    a.state.busy = true; a.state.motion = motion;
    if (material !== undefined || bleed !== undefined) st.stageReset();
    const tt = t != null ? t : u * m.T;
    for (let i = 0; i < 4; i++) st.stageDraw(g, tt, m); // (settle repainted sprites)
    st.stageDraw(g, tt, m);
    const data = a.pcv.toDataURL('image/png');
    a.state.busy = false;
    return data;
  }, s);
  fs.writeFileSync(`${outDir}/${s.name}.png`, Buffer.from(r.split(',')[1], 'base64'));
  console.log(s.name, Date.now() - t0, 'ms');
}
console.log('errors:', errs.join(' | ') || 'none');
await b.close();
