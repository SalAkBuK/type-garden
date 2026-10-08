// Review stills only. Tests center crops of the encoded 16:9 draft; no alternate film render.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(dir, 'output', 'draft');
const crops = path.join(out, 'aspect-planning');
fs.mkdirSync(crops, { recursive: true });
const run = args => {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], { encoding: 'utf8', maxBuffer: 16 << 20 });
  if (r.status !== 0) throw Error(r.stderr);
};
const motion=JSON.parse(fs.readFileSync(path.join(dir,'motion.json')));
const seg=id=>motion.segments.find(s=>s.id===id);
const shots = [
  ['product-ui',20,'Both social crops lose the actual controls. Reframe the real interface or fit its complete plate.'],
  ['typed-phrase',156,'The completed phrase is too wide for either center crop. Use a wider native camera.'],
  ['living-portrait',196,'Square and vertical crops lose phrase ends. Fit the full phrase with side clearance.'],
  ['coil',236,'Detail is adaptable; retain enough glyph contour to show the trellis.'],
  ['rose',272,'Recenter on the rose and attached cane; preserve the approved macro restraint.'],
  ['visitor-arrival',305,'Track butterfly and bloom together; a static vertical crop loses the approach.'],
  ['landing',345,'Recenter on the butterfly and rose. Test wing clearance throughout the motion.'],
  ['bead',395,'Center on the hanging bead; keep a fragment of the source rose.'],
  ['fall',411,'Track the real falling drop into the glyph rather than using a fixed crop.'],
  ['looks',seg('looks').end-25,'All five Looks need the same wider social camera; a center crop truncates in bloom.'],
  ['font-refit',seg('font-bodoni').start+20,'Keep phrase center and baseline fixed; fit the widest actual glyph set.'],
  ['custom-palette',seg('custom').start+15,'Fit the full phrase with the same world anchor. Preserve the recolour into botanical growth.'],
  ['botanical-peak',seg('botanical').end-35,'Widen around the full phrase and retain enough side growth to read abundance.'],
  ['botanical-recovery',seg('botanical').end-11,'Recover a readable full phrase before the passing petal; center crops cut its ends.'],
  ['identity',motion.frames-10,'Square retains both words and credit with tight outer growth margins; widen modestly. Vertical truncates GARDEN and attribution: fit the complete lockup and lay out the same wording.']
];
for (const [id, f] of shots) {
  const base = path.join(crops, `${id}-16x9.jpg`);
  run(['-i', path.join(out, 'draft.mp4'), '-vf', `select=eq(n\\,${f})`, '-frames:v', '1', '-q:v', '2', base]);
  run(['-i', base, '-vf', 'crop=540:540:210:0', path.join(crops, `${id}-square.jpg`)]);
  run(['-i', base, '-vf', 'crop=304:540:328:0', path.join(crops, `${id}-vertical.jpg`)]);
}
const plan = {
  source: motion.version + '; center-crop stills are diagnostics, not approved alternate compositions.',
  recommendation: 'Plan a 16:9 master and a separately framed 1:1 social version. A 9:16 version is viable only with its own native camera pass and attribution layout; do not derive it by blind cropping.',
  centerCropPixels: { square: [210, 0, 540, 540], vertical: [328, 0, 304, 540] },
  noAlternateVideosRendered: true,
  shots: shots.map(([id, frame, action]) => ({ id, frame, seconds: frame / 30, action }))
};
fs.writeFileSync(path.join(out, 'aspect-plan.json'), JSON.stringify(plan, null, 2) + '\n');
fs.writeFileSync(path.join(dir, 'ASPECT-PLAN.md'), `# Aspect ratio plan\n\n${plan.recommendation}\n\nThe 960 x 540 source leaves 540 pixels of width in a square crop and only 304 in a vertical crop. The anchored phrase occupies about 690-800 pixels across the wide passages. Cropping alone loses letters. A social version must fit the native composition before rendering. The final two-line portrait is easier to adapt, but the 15% enlarged lockup and author line still need deliberate safe margins.\n\n| Shot | Time | Required framing |\n| --- | --- | --- |\n${plan.shots.map(s => `| ${s.id} | ${s.seconds.toFixed(2)} s | ${s.action} |`).join('\n')}\n\nNo square or vertical video, or full-resolution master, was rendered. The review page includes crop diagnostics from the completed draft.\n`);
const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Rose Garden aspect planning</title><style>body{background:#101010;color:#eee;font:15px Arial;margin:36px}p{max-width:900px;line-height:1.6}section{margin:40px 0}.row{display:flex;align-items:flex-start;gap:18px}img{height:270px;width:auto;max-width:100%;object-fit:contain}small{display:block;color:#aaa;margin-bottom:8px}@media(max-width:900px){.row{flex-wrap:wrap}}</style><h1>Aspect ratio planning</h1><p>${plan.recommendation}</p><p>These are literal center crops. Visible truncation identifies shots that need reframing. No alternate continuous videos have been rendered.</p>${shots.map(([id,f,action])=>`<section><h2>${id} / ${(f/30).toFixed(2)} s</h2><p>${action}</p><div class="row">${[['16x9','16:9 source'],['square','1:1 center crop'],['vertical','9:16 center crop']].map(([suffix,label])=>`<div><small>${label}</small><img src="${id}-${suffix}.jpg" alt="${label}"></div>`).join('')}</div></section>`).join('')}`;
fs.writeFileSync(path.join(crops, 'index.html'), html);
console.log(JSON.stringify({ shots: shots.length, review: path.join(crops, 'index.html'), recommendation: plan.recommendation }));
