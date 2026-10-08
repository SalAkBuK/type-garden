// Transition proof: a page-wide wicking front rising through the dead skeleton, world A -> world B.
// usage: node wick.mjs A.png B.png outPrefix  (renders frames at fractions)
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
const [A, B, outPrefix] = process.argv.slice(2).map(s => path.resolve(s));
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const p = await b.newPage({ viewport: { width: 800, height: 800 } });
await p.goto('about:blank');
const ds = x => 'data:image/png;base64,' + fs.readFileSync(x).toString('base64');
const res = await p.evaluate(async ({ a, b, fr }) => {
  const load = s => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = s; });
  const [ia, ib] = await Promise.all([load(a), load(b)]);
  const N = 1080; // working size (downsampled for the proof)
  const mk = im => { const c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d'); g.drawImage(im, 0, 0, N, N); return g.getImageData(0, 0, N, N); };
  const da = mk(ia), db = mk(ib);
  // value noise, 4 octaves, stretched along the paper's "fibres" (more vertical coherence) for a wicking edge
  const h = (x, y) => { let n = Math.imul(x, 374761393) + Math.imul(y, 668265263); n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
  const vn = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); return (h(xi, yi) * (1 - u) + h(xi + 1, yi) * u) * (1 - v) + (h(xi, yi + 1) * (1 - u) + h(xi + 1, yi + 1) * u) * v; };
  const fbm = (x, y) => { let s = 0, a = 0.5, f = 1; for (let o = 0; o < 5; o++) { s += a * vn(x * f, y * f * 0.45); a *= 0.5; f *= 2.1; } return s; };
  const field = new Float32Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) field[y * N + x] = fbm(x / 90 + 3.1, y / 90 + 7.7) * 0.75 + (1 - y / N) * 0.55; // 0..~1.3: low where the front arrives first (the bottom)
  const outs = [];
  for (const t of fr) {
    const c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d'); const o = g.createImageData(N, N);
    const lvl = t * 1.45 - 0.08, soft = 0.07;
    for (let i = 0; i < N * N; i++) {
      const d = (lvl - field[i]) / soft, m = Math.max(0, Math.min(1, d * 0.5 + 0.5)); // 1 = world B
      const rim = Math.exp(-Math.pow((d - 0.0), 2) * 1.2) * 0.35; // a faint wet darkening where the front passes
      for (let k = 0; k < 3; k++) { const v = da.data[i * 4 + k] * (1 - m) + db.data[i * 4 + k] * m; o.data[i * 4 + k] = v * (1 - rim * 0.5); }
      o.data[i * 4 + 3] = 255;
    }
    g.putImageData(o, 0, 0); outs.push(c.toDataURL('image/png'));
  }
  return outs;
}, { a: ds(A), b: ds(B), fr: [0.2, 0.4, 0.6, 0.8] });
res.forEach((d, i) => fs.writeFileSync(`${outPrefix}_${i}.png`, Buffer.from(d.split(',')[1], 'base64')));
console.log('ok', res.length); await b.close();
