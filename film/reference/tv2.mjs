// Title typing with a hesitation (knot) and a typo + backspace (rewrite scar), on the fake clock.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const outDir = process.argv[2] || 'shots';
const FILE = 'C:/Users/oneof/OneDrive/Documents/type-garden/type-garden/index.html';
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const p = await b.newPage({ viewport: { width: 1080, height: 1080 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.addInitScript(() => {
  window.__t = 100000; performance.now = () => window.__t; window.requestAnimationFrame = () => 0;
  let s = 4242; Math.random = () => ((s = Math.imul(s ^ (s >>> 15), 0x2c1b3c6d) + 0x6d2b79f5 | 0) >>> 0) / 4294967296;
});
await p.goto('file:///' + FILE);
await p.waitForFunction(() => window.__typeGarden && window.__typeGarden.fontsReady);
const shots = await p.evaluate(async () => {
  const a = window.__typeGarden; a.maybeVisit = () => {};
  a.setMode('type'); a.setLook('crimson'); a.props.showHint = false;
  document.getElementById('tg-bar').style.display = 'none';
  a.clearText();
  const FR = 1000 / 30, out = {}, grab = n => { out[n] = a.cv.toDataURL('image/png'); };
  const step = ms => { for (let i = 0; i < Math.round(ms / FR); i++) { window.__t += FR; a.frame(); } };
  const type = ch => { const now = window.__t; a.add(ch, now, a.keyEvent(now)); };
  const back = () => { const now = window.__t; a.mark(); a.keyEvent(now); a.prune(now); };
  step(300);
  for (const ch of 'Type Gar') { type(ch); step(ch === ' ' ? 330 : 167); }
  step(900); // hesitation inside the word
  for (const ch of 'dem') { type(ch); step(167); }
  step(250); grab('typo');
  back(); step(500); grab('pruned');
  type('n'); step(300); grab('retyped');
  step(2500); grab('r2');
  step(3000); grab('r5');
  step(3500); grab('r8');
  return out;
});
for (const [k, v] of Object.entries(shots)) fs.writeFileSync(`${outDir}/tv2_${k}.png`, Buffer.from(v.split(',')[1], 'base64'));
console.log('errors:', errs.join('|') || 'none', Object.keys(shots).join(' '));
await b.close();
