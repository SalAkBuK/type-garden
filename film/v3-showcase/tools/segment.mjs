// Renders one segment of the V3 showcase draft through the real renderer.
//   node tools/segment.mjs <id>                      encode the segment to output/draft/segments/<id>.mp4
//   node tools/segment.mjs <id> --frames=300,360,420 write preview stills to output/draft/preview/
// Draft only: 960 x 540 at 30 fps. There is no full-resolution path here.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { openRenderer } from '../../tools/renderer.mjs';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.resolve(dir, '../..');
const motion = JSON.parse(fs.readFileSync(path.join(dir, 'motion.json'), 'utf8'));
const id = process.argv[2];
const arg = name => process.argv.find(a => a.startsWith('--' + name + '='))?.slice(name.length + 3);
if (process.argv.includes('--full')) throw Error('Draft only. No full-resolution render is available from this tool.');
const def = motion.segments.find(s => s.id === id);
if (!def) throw Error('Unknown segment ' + id + '. Segments: ' + motion.segments.map(s => s.id).join(', '));

const out = path.join(dir, 'output', 'draft'), segDir = path.join(out, 'segments'), prevDir = path.join(out, 'preview');
fs.mkdirSync(segDir, { recursive: true }); fs.mkdirSync(prevDir, { recursive: true });
const hash = v => crypto.createHash('sha256').update(v).digest('hex');
const swayRate = motion.paths.swayRate;
const byDriver = {
  opening: { openCam: motion.openCam },
  encounter: { path: motion.paths[def.path], swayRate, openCam: motion.openCam, encounter: motion.segments.find(s => s.id === 'encounter').steps },
  font: { path: motion.paths[def.path], swayRate },
  material: { material: motion.material, swayRate },
  botanical: { botanical: motion.botanical, path: motion.paths.botanical, swayRate },
  identity: { identity: motion.identity, path: motion.paths.identity, swayRate, credits: motion.credits,
    outgoing: { botanical: motion.botanical, path: motion.paths.botanical, segment: motion.segments.find(s => s.id === 'botanical') } }
}[def.driver];
// A segment is re-rendered only when something that can change it has changed.
const key = hash(JSON.stringify({
  def, byDriver, defaults: motion.defaults, fps: motion.fps,
  page: hash(fs.readFileSync(path.join(dir, 'tools', 'page.js'))), app: hash(fs.readFileSync(path.join(root, 'index.html'))),
  worker: hash(fs.readFileSync(fileURLToPath(import.meta.url)))
})).slice(0, 16);
const mp4 = path.join(segDir, id + '.mp4'), meta = path.join(segDir, id + '.json');
const frames = arg('frames')?.split(',').map(Number);
if (!frames && !process.argv.includes('--force') && fs.existsSync(mp4) && fs.existsSync(meta) && JSON.parse(fs.readFileSync(meta, 'utf8')).key === key) {
  console.log('cached', id); process.exit(0);
}

const t0 = Date.now();
const r = await openRenderer({ size: 540, software: true });
let encoder = null, enc = null;
const startEncoder = () => {
  enc = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(motion.fps), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '12', '-pix_fmt', 'yuv420p', '-g', String(motion.fps), '-r', String(motion.fps), mp4],
  { stdio: ['pipe', 'inherit', 'inherit'] });
  encoder = new Promise((res, rej) => { enc.on('close', c => (c === 0 ? res() : rej(Error('ffmpeg exited ' + c)))); enc.on('error', rej); });
};
const push = data => new Promise((res, rej) => {
  const buf = Buffer.from(data.split(',')[1], 'base64');
  if (enc.stdin.write(buf)) res(); else enc.stdin.once('drain', res);
  enc.stdin.once('error', rej);
});
const save = (data, name) => fs.writeFileSync(path.join(prevDir, name), Buffer.from(data.split(',')[1], 'base64'));
try {
  await r.page.addScriptTag({ path: path.join(dir, 'tools', 'page.js') });
  const extra = {};
  if (def.driver === 'opening') {
    // The first frames are the real application, UI included, as it opens.
    await r.page.setViewportSize({ width: 1080, height: 608 });
    await r.page.evaluate(() => {
      const a = window.__typeGarden;
      window.__filmClock = 200000;
      a.setMode('type'); a.setLook('crimson'); a.state.busy = false;
      a.clearText(); a.layout(true); a.t0 = window.__filmClock - 1000;
      a.lastKey = window.__filmClock; a.paint(window.__filmClock, true);
    });
    extra.plate = 'data:image/png;base64,' + (await r.page.screenshot({ type: 'png' })).toString('base64');
    await r.page.setViewportSize({ width: 1080, height: 1080 });
  }
  await r.page.evaluate(([d, m, e]) => window.__motion.begin(d, m, e), [def, motion, extra]);
  const frame = f => r.page.evaluate(f => window.__motion.frame(f), f);
  if (def.driver !== 'opening') for (let i = 0; i < 3; i++) await frame(def.start);
  if (frames) {
    // Preview mode renders forward-only drivers from their first frame so the state is honest.
    const want = new Set(frames);
    const last = Math.max(...frames);
    if (def.driver === 'opening') {
      for (let f = 0; f <= Math.min(last, def.blendFrom - 1); f++) { const d = await frame(f); if (want.has(f)) save(d, `${id}-f${String(f).padStart(4, '0')}.png`); }
      if (last >= def.blendFrom) {
        for (let f = def.blendFrom; f < def.end; f++) await r.page.evaluate(f => window.__motion.holdLive(f), f);
        const blend = await r.page.evaluate(([d, m]) => window.__motion.openBlend(d, m), [def, motion]);
        blend.forEach((d, i) => { const f = def.blendFrom + i; if (want.has(f)) save(d, `${id}-f${String(f).padStart(4, '0')}.png`); });
      }
    } else for (const f of frames) save(await frame(f), `${id}-f${String(f).padStart(4, '0')}.png`);
  } else {
    startEncoder();
    if (def.driver === 'opening') {
      for (let f = def.start; f < def.blendFrom; f++) await push(await frame(f));
      for (let f = def.blendFrom; f < def.end; f++) await r.page.evaluate(f => window.__motion.holdLive(f), f);
      for (const d of await r.page.evaluate(([d, m]) => window.__motion.openBlend(d, m), [def, motion])) await push(d);
    } else {
      for (let f = def.start; f < def.end; f++) await push(await frame(f));
    }
    enc.stdin.end(); await encoder;
  }
  const cues = await r.page.evaluate(() => window.__motion.cues);
  if (r.errors.length) throw Error(r.errors.join('\n'));
  if (!frames) fs.writeFileSync(meta, JSON.stringify({ id, key, start: def.start, end: def.end, frames: def.end - def.start, fps: motion.fps, elapsedMs: Date.now() - t0, cues }, null, 2));
  console.log(id, frames ? 'preview ' + frames.join(',') : `${def.end - def.start} frames`, (Date.now() - t0) + ' ms', cues.length ? JSON.stringify(cues.map(c => c.name + '@' + c.f)) : '');
} finally { await r.browser.close(); }
