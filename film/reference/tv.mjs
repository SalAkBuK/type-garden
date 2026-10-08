// Type view driven on a fake clock: type a title on the beat, pause, let the earned bloom open. Captures canvas frames.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const outDir = process.argv[2] || 'shots', text = process.argv[3] || 'Type Garden', look = process.argv[4] || 'crimson';
fs.mkdirSync(outDir, { recursive: true });
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
const shots = await p.evaluate(async ({ text, look }) => {
  const a = window.__typeGarden; a.maybeVisit = () => {};
  a.setMode('type'); a.setLook(look); a.props.showHint = false;
  document.getElementById('tg-bar').style.display = 'none';
  a.clearText();
  const FR = 1000 / 30, out = {}, grab = n => { out[n] = a.cv.toDataURL('image/png'); };
  const step = ms => { for (let i = 0; i < Math.round(ms / FR); i++) { window.__t += FR; a.Sd += (a.St - a.Sd) * 0.3; a.frame(); } };
  // frame() runs the type view's own animation (letters ease to their places, bloom clocks, caret): the caret is hidden by painting without it
  const paint = () => a.paint(window.__t, false);
  step(300);
  let i = 0;
  for (const ch of text) { const now = window.__t; a.add(ch, now, a.keyEvent(now)); step(ch === ' ' ? 330 : 167); i++; if (i === 4) grab('typed4'); }
  paint(); grab('typed');
  step(1000); paint(); grab('p1');
  step(2000); paint(); grab('p3');
  step(3000); paint(); grab('p6');
  step(3000); paint(); grab('p9');
  return out;
}, { text, look });
for (const [k, v] of Object.entries(shots)) fs.writeFileSync(`${outDir}/tv_${k}.png`, Buffer.from(v.split(',')[1], 'base64'));
console.log('errors:', errs.join('|') || 'none', Object.keys(shots).join(' '));
await b.close();
