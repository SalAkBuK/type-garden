// Export review keyframes from the completed encoded draft. The approved storyboard stays intact.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(dir, 'output', 'draft');
const dest = path.join(out, 'polish-keyframes');
fs.mkdirSync(dest, { recursive: true });
const motion=JSON.parse(fs.readFileSync(path.join(dir,'motion.json')));
const seg=id=>motion.segments.find(s=>s.id===id);
const selected = [
  ['01-product',20],['02-living-words',176],['03-rose',272],['04-contact',345],
  ['05-blood-consequence',434],['06-first-world',seg('looks').start+25],
  ['07-fifth-look',seg('looks').end-25],['08-cormorant',seg('font-cormorant').start+25],
  ['09-custom-world',seg('custom').start+20],['10-recovered-phrase',seg('botanical').end-11],
  ['11-passing-petal',seg('identity').start+4],['12-final-identity',motion.frames-10]
];
for (const [id, frame] of selected) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', path.join(out, 'draft.mp4'),
    '-vf', `select=eq(n\\,${frame})`, '-frames:v', '1', path.join(dest, id + '.png')], { encoding: 'utf8' });
  if (r.status !== 0) throw Error(r.stderr);
}
const rows = selected.map(([id,frame]) => ({ id, frame, seconds: frame / 30, file: id + '.png' }));
fs.writeFileSync(path.join(dest, 'frames.json'), JSON.stringify(rows, null, 2) + '\n');
fs.writeFileSync(path.join(dest, 'index.html'), `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Rose Garden polish keyframes</title><style>body{margin:32px;background:#111;color:#eee;font:14px Arial}img{display:block;width:min(960px,100%)}figure{margin:30px 0}figcaption{margin-bottom:10px}</style><h1>Polished draft keyframes</h1><p>All stills come from the encoded 960 x 540 continuous draft. The original storyboard is preserved.</p>${rows.map(r=>`<figure><figcaption>${r.id} / frame ${r.frame} / ${r.seconds.toFixed(2)} s</figcaption><a href="${r.file}"><img src="${r.file}" alt="${r.id}"></a></figure>`).join('')}`);
console.log(JSON.stringify({ keyframes: rows.length, directory: dest }));
