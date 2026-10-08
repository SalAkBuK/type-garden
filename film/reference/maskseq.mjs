// Emit N grayscale wick masks (white = world B) as PNGs, for ffmpeg maskedmerge. node maskseq.mjs outDir N
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
const dir = path.resolve(process.argv[2]), N = +process.argv[3] || 24;
fs.mkdirSync(dir, { recursive: true });
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const p = await b.newPage({ viewport: { width: 400, height: 400 } });
await p.goto('about:blank');
const frames = await p.evaluate(n => {
  const S = 1080;
  const h = (x, y) => { let k = Math.imul(x, 374761393) + Math.imul(y, 668265263); k = Math.imul(k ^ (k >>> 13), 1274126177); return ((k ^ (k >>> 16)) >>> 0) / 4294967296; };
  const vn = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); return (h(xi, yi) * (1 - u) + h(xi + 1, yi) * u) * (1 - v) + (h(xi, yi + 1) * (1 - u) + h(xi + 1, yi + 1) * u) * v; };
  const fbm = (x, y) => { let s = 0, a = 0.5, f = 1; for (let o = 0; o < 5; o++) { s += a * vn(x * f, y * f * 0.45); a *= 0.5; f *= 2.1; } return s; };
  const field = new Float32Array(S * S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) field[y * S + x] = fbm(x / 90 + 3.1, y / 90 + 7.7) * 0.75 + (1 - y / S) * 0.55;
  const out = [], c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'), img = g.createImageData(S, S);
  for (let f = 0; f < n; f++) {
    const t = f / (n - 1), lvl = t * 1.45 - 0.08, soft = 0.07;
    for (let i = 0; i < S * S; i++) { const d = (lvl - field[i]) / soft, m = Math.max(0, Math.min(1, d * 0.5 + 0.5)) * 255; img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = m; img.data[i * 4 + 3] = 255; }
    g.putImageData(img, 0, 0); out.push(c.toDataURL('image/png'));
  }
  return out;
}, N);
frames.forEach((d, i) => fs.writeFileSync(path.join(dir, `mask_${String(i).padStart(3, '0')}.png`), Buffer.from(d.split(',')[1], 'base64')));
console.log('masks', frames.length); await b.close();
