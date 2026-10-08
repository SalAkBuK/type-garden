// Contact sheet: node sheet.mjs spec.json out.png
// spec: { cols, w, gap?, bg?, items: [{ src, label?, crop?: [x,y,size] }] }
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
const specFile = process.argv[2], out = path.resolve(process.argv[3]);
const spec = JSON.parse(fs.readFileSync(specFile, 'utf8'));
const { cols = 4, w = 400, gap = 4, bg = '#161616' } = spec;
const cell = it => {
  const src = 'file:///' + it.src.replace(/\\/g, '/');
  const label = it.label ? `<div class="l">${it.label}</div>` : '';
  if (it.crop) {
    const [cx, cy, cs, iw] = it.crop; const k = w / cs, W = (iw || 2160) * k;
    return `<div class="c" style="width:${w}px;height:${w}px;overflow:hidden;position:relative"><img src="${src}" style="position:absolute;width:${W}px;left:${-cx * k}px;top:${-cy * k}px">${label}</div>`;
  }
  return `<div class="c" style="width:${w}px;height:${w}px;position:relative"><img src="${src}" style="width:${w}px;height:${w}px;display:block">${label}</div>`;
};
const html = `<body style="margin:0;background:${bg}"><style>.l{position:absolute;left:6px;bottom:5px;font:600 13px/1.2 ui-monospace,Consolas,monospace;color:#fff;background:#000b;padding:2px 6px;border-radius:2px}</style>
<div style="display:grid;grid-template-columns:repeat(${cols},${w}px);gap:${gap}px;width:max-content">${spec.items.map(cell).join('')}</div></body>`;
const tmp = out.replace(/\.png$/, '.html'); fs.writeFileSync(tmp, html);
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const p = await b.newPage({ viewport: { width: cols * (w + gap), height: 400 } });
await p.goto('file:///' + tmp.replace(/\\/g, '/')); await p.waitForTimeout(500);
await p.screenshot({ path: out, fullPage: true }); await b.close(); console.log('wrote', out);
