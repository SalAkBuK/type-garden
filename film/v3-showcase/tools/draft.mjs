// Orchestrates the low-resolution continuous draft of the V3 showcase.
//   node tools/draft.mjs render [--force] [id ...]   render segments in parallel (cached by content key)
//   node tools/draft.mjs assemble                    concatenate segments into output/draft/picture.mp4 (silent)
//   node tools/draft.mjs audio                       synthesize the sound design from the picture's cue frames
//   node tools/draft.mjs mux                         picture + sound -> output/draft/draft.mp4
//   node tools/draft.mjs all
// 960 x 540 at 30 fps. Full-resolution rendering is not available from this tool.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const motion = JSON.parse(fs.readFileSync(path.join(dir, 'motion.json'), 'utf8'));
const out = path.join(dir, 'output', 'draft'), segDir = path.join(out, 'segments');
fs.mkdirSync(segDir, { recursive: true });
const [command = 'render', ...rest] = process.argv.slice(2);
if (process.argv.includes('--full')) throw Error('Draft only. No full-resolution render is available from this tool.');
const ids = rest.filter(a => !a.startsWith('--'));
const force = rest.includes('--force');
const run = (exe, args) => { const r = spawnSync(exe, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }); if (r.status !== 0) throw Error(exe + ': ' + r.stderr); return r.stdout + r.stderr; };

async function render() {
  const todo = (ids.length ? motion.segments.filter(s => ids.includes(s.id)) : motion.segments);
  const longest = [...todo].sort((a, b) => (b.end - b.start) - (a.end - a.start));
  const workers = Math.max(2, Math.min(6, Math.floor(os.cpus().length / 4)));
  const queue = longest.map(s => s.id), running = new Set(), failures = [];
  const t0 = Date.now();
  await new Promise(resolve => {
    const next = () => {
      while (running.size < workers && queue.length) {
        const id = queue.shift();
        const p = spawn(process.execPath, [path.join(dir, 'tools', 'segment.mjs'), id, ...(force ? ['--force'] : [])], { stdio: ['ignore', 'pipe', 'pipe'] });
        let log = ''; p.stdout.on('data', d => { log += d; }); p.stderr.on('data', d => { log += d; });
        running.add(id);
        p.on('close', code => { running.delete(id); console.log((code === 0 ? 'ok   ' : 'FAIL ') + log.trim().split('\n').slice(-2).join(' | ').slice(0, 220)); if (code !== 0) failures.push(id); if (!queue.length && !running.size) resolve(); else next(); });
      }
      if (!queue.length && !running.size) resolve();
    };
    next();
  });
  console.log(`rendered ${todo.length} segments in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  if (failures.length) throw Error('Failed segments: ' + failures.join(', '));
}

function assemble() {
  const list = path.join(out, 'segments.txt');
  fs.writeFileSync(list, motion.segments.map(s => {
    const f = path.join(segDir, s.id + '.mp4');
    if (!fs.existsSync(f)) throw Error('Missing segment ' + s.id);
    return `file '${f.replaceAll('\\', '/').replaceAll("'", "'\\''")}'`;
  }).join('\n'));
  const picture = path.join(out, 'picture.mp4');
  // One re-encode: a faint temporal grain keeps the dark gradients from banding.
  run('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-vf', 'noise=alls=3:allf=t:all_seed=7', '-c:v', 'libx264', '-preset', 'medium', '-crf', '14', '-pix_fmt', 'yuv420p', '-r', String(motion.fps), picture]);
  const probe = JSON.parse(run('ffprobe', ['-v', 'error', '-count_frames', '-show_streams', '-of', 'json', picture]));
  const v = probe.streams.find(s => s.codec_type === 'video');
  console.log(JSON.stringify({ picture, frames: Number(v.nb_read_frames), expected: motion.frames, width: v.width, height: v.height, ok: Number(v.nb_read_frames) === motion.frames }));
  if (Number(v.nb_read_frames) !== motion.frames) throw Error('Frame count mismatch');
}

const steps = { render, assemble };
if (command === 'all') { await render(); assemble(); }
else if (steps[command]) await steps[command]();
else if (!['audio', 'mux'].includes(command)) throw Error('Commands: render, assemble, audio, mux, all');
if (command === 'audio' || command === 'mux') {
  const m = await import('./draft-audio.mjs');
  if (command === 'audio') await m.audio(); else m.mux();
}
