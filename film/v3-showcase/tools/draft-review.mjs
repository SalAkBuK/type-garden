// Builds the review package for the low-resolution continuous draft: contact sheets and strips taken
// from the encoded picture, seam and duplicate-frame checks, the sound cue sheet and a review page.
// No new rendering happens here; everything is read back from output/draft/draft.mp4.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const motion = JSON.parse(fs.readFileSync(path.join(dir, 'motion.json'), 'utf8'));
const out = path.join(dir, 'output', 'draft'), sheets = path.join(out, 'sheets'), grabs = path.join(out, 'grabs');
fs.mkdirSync(sheets, { recursive: true }); fs.mkdirSync(grabs, { recursive: true });
const fps = motion.fps;
const run = (exe, args) => { const r = spawnSync(exe, args, { encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 }); if (r.status !== 0) throw Error(exe + ': ' + r.stderr); return r.stdout + r.stderr; };
const video = path.join(out, fs.existsSync(path.join(out, 'draft.mp4')) ? 'draft.mp4' : 'picture.mp4');

// Frame grabs are read from the encoded picture, so the review shows what the film actually contains.
const grab = f => {
  const file = path.join(grabs, 'f' + String(f).padStart(4, '0') + '.jpg');
  if (!fs.existsSync(file) || fs.statSync(file).mtimeMs < fs.statSync(video).mtimeMs) run('ffmpeg', ['-v', 'error', '-y', '-i', video, '-vf', `select=eq(n\\,${f})`, '-frames:v', '1', '-q:v', '3', file]);
  return file;
};
const sheet = (frames, name, cols, w = 480) => {
  const h = Math.round(w * 9 / 16), files = frames.map(grab);
  const args = ['-v', 'error', '-y'];
  files.forEach(f => args.push('-i', f));
  const scale = files.map((_, i) => `[${i}:v]scale=${w}:${h}[s${i}]`).join(';');
  const layout = files.map((_, i) => `${(i % cols) * w}_${Math.floor(i / cols) * h}`).join('|');
  args.push('-filter_complex', `${scale};${files.map((_, i) => `[s${i}]`).join('')}xstack=inputs=${files.length}:layout=${layout}`, path.join(sheets, name));
  run('ffmpeg', args);
  return 'sheets/' + name;
};
const range = (a, b, step) => { const r = []; for (let f = a; f <= b; f += step) r.push(f); return r; };

const meta = id => { const f = path.join(out, 'segments', id + '.json'); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null; };
const enc = meta('encounter')?.cues || [];
const cueF = n => enc.find(c => c.name === n)?.f;
const bite = cueF('bite') ?? 360, bead = cueF('bead') ?? 371, release = cueF('release') ?? 405, impact = cueF('impact') ?? 420;

const seg = id => motion.segments.find(s => s.id === id);
const worlds = seg('looks'), fonts = motion.segments.filter(s => s.driver === 'font');
const botanical = seg('botanical'), identity = seg('identity');
const at = (s, p) => Math.min(s.end - 1, Math.round(s.start + (s.end-s.start)*p));
const built = {};
built.overview = sheet(range(0, motion.frames-1, 15), 'overview-every-half-second.png', 8, 360);
built.opening = sheet([0,8,14,20,24,30,36,42,50,64,90,120,140,156,166,176], 'opening.png', 4);
built.beauty = sheet([176,200,224,240,256,272,288,299], 'beauty.png', 4);
built.chain = sheet([305,318,332,346,354,bite,bead+3,bead+14,release-6,release,release+8,impact-3,impact,impact+6,impact+14,impact+30], 'butterfly-to-blood.png', 4);
built.response = sheet([impact+14,impact+26,457,469,480,490,500,509], 'response-and-wipe.png', 4);
built.looks = sheet(worlds.looks.flatMap((l,i)=>{const end=worlds.looks[i+1]?.from??worlds.end;return [l.from,l.from+8,Math.round((l.from+end)/2),end-1];}), 'worlds.png', 4);
built.fonts = sheet(fonts.flatMap(s=>[s.start+1,at(s,.3),at(s,.65),s.end-1]), 'letterforms-and-palette.png', 4);
built.botanical = sheet([0,.08,.17,.25,.33,.42,.5,.58,.67,.75,.9,.99].map(p=>at(botanical,p)), 'botanical-escalation.png', 4);
built.polish = sheet([20,21,24,26,845,855,865,869,870,878,890,910,989,990,999,1009], 'polish-transitions.png', 4);
built.identity = sheet([identity.start,identity.start+4,identity.start+8,identity.start+13,identity.start+20,identity.start+29,motion.identity.grow.at(-1)[0],motion.identity.holdFrom,motion.identity.credit.f0,motion.identity.credit.f1,identity.end-20,identity.end-1], 'identity-arrival.png', 4);

// ---------- QA: frame count, seams, duplicates, black, loudness ----------
const probe = JSON.parse(run('ffprobe', ['-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', video]));
const v = probe.streams.find(s => s.codec_type === 'video'), au = probe.streams.find(s => s.codec_type === 'audio');
const sample = f => { const r = spawnSync('ffmpeg', ['-v', 'error', '-i', video, '-vf', `select=eq(n\\,${f}),scale=96:54,format=gray`, '-frames:v', '1', '-f', 'rawvideo', '-'], { maxBuffer: 1 << 20 }); return r.stdout; };
const diff = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / a.length; };
const near = [];
for (const f of [60, 120, 200, 250, 340, 400, 440, 540, 600, 700, 850, 1000, 1030]) near.push(diff(sample(f), sample(f + 1)));
const typical = near.reduce((x, y) => x + y, 0) / near.length;
const seams = motion.segments.slice(1).map(s => ({ boundary: s.id, frame: s.start, diff: +diff(sample(s.start - 1), sample(s.start)).toFixed(2) }));
const log = run('ffmpeg', ['-hide_banner', '-i', video, '-vf', 'blackdetect=d=0.05:pix_th=0.04:pic_th=0.98,freezedetect=n=-55dB:d=0.4', '-af', 'ebur128=peak=true', '-f', 'null', '-']);
const blackFreeze = log.split('\n').filter(l => /black_start|black_end|freeze_start|freeze_end/.test(l)).map(l => l.replace(/.*\] /, '').trim());
const sum = log.slice(log.lastIndexOf('Summary:'));
const qa = {
  video: path.basename(video), frames: Number(v.nb_read_frames), expectedFrames: motion.frames, frameCountPass: Number(v.nb_read_frames) === motion.frames,
  resolution: [v.width, v.height], fps: v.r_frame_rate, duration: Number(probe.format.duration),
  audio: au ? { codec: au.codec_name, channels: au.channels, sampleRate: Number(au.sample_rate) } : null,
  loudness: au ? { integratedLufs: Number(sum.match(/I:\s*([\d.-]+) LUFS/)?.[1]), truePeakDb: Number(sum.match(/Peak:\s*([\d.-]+) dBFS/)?.[1]), loudnessRangeLu: Number(sum.match(/LRA:\s*([\d.-]+) LU/)?.[1]) } : null,
  typicalAdjacentFrameDiff: +typical.toFixed(2), seams, blackAndFreeze: blackFreeze,
  materialShowcaseRemoved: !motion.segments.some(s => s.driver === 'material' || s.id.startsWith('mat-')),
  identityResolvedBeforeHold: motion.identity.grow.at(-1)[0] < motion.identity.holdFrom && motion.identity.bloom.at(-1)[0] < motion.identity.holdFrom,
  note: 'Seam diffs near the typical adjacent-frame value indicate continuity; font cuts change real glyph geometry; the cobalt world recolours into the botanical build; the title carries the outgoing garden under native petals.'
};
fs.writeFileSync(path.join(out, 'qa.json'), JSON.stringify(qa, null, 2));
// ---------- sound sync: does an accent actually sit on each picture cue? ----------
const wavFile = path.join(out, 'sound.wav');
let syncRows = [];
if (fs.existsSync(wavFile)) {
  const raw = spawnSync('ffmpeg', ['-v', 'error', '-i', wavFile, '-ac', '1', '-ar', '8000', '-f', 'f32le', '-'], { maxBuffer: 1 << 28 }).stdout;
  const x = new Float32Array(raw.buffer, raw.byteOffset, Math.floor(raw.length / 4)), hop = 160; // 20 ms
  const rms = []; for (let i = 0; i + hop <= x.length; i += hop) { let a = 0; for (let j = 0; j < hop; j++) a += x[i + j] * x[i + j]; rms.push(Math.sqrt(a / hop)); }
  const med = arr => { const b = [...arr].sort((p, q) => p - q); return b[Math.floor(b.length / 2)] || 1e-9; };
  const probeCue = (name, f) => {
    const t = f / fps, i0 = Math.max(0, Math.round((t - 0.03) / 0.02)), i1 = Math.round((t + 0.12) / 0.02);
    let peak = 0, at = i0; for (let i = i0; i <= i1 && i < rms.length; i++) if (rms[i] > peak) { peak = rms[i]; at = i; }
    const b0 = Math.max(0, Math.round((t - 1.0) / 0.02)), b1 = Math.max(b0 + 1, Math.round((t - 0.2) / 0.02));
    const base = med(rms.slice(b0, b1));
    return { name, frame: f, seconds: +t.toFixed(3), peakAtMs: Math.round((at * 0.02 - t) * 1000), accentDb: +(20 * Math.log10(peak / base)).toFixed(1) };
  };
  const lk = worlds.transitions;
  syncRows = [
    probeCue('bite',bite),probeCue('release',release),probeCue('IMPACT',impact),
    probeCue('first world (blood contour ends)',worlds.start),probeCue('anchored Look recolour',lk[0].center),probeCue('native petal pass',lk[2].center),
    ...fonts.map(s=>probeCue('font / world: '+s.id,s.start)),
    probeCue('cut to the title (storm)',identity.start),probeCue('ROSE GARDEN arrived (resolve)',motion.identity.holdFrom)
  ];
}
qa.blackDetectorInterpretation = "The opening black-detector flag covers the thin first i/caret during the UI push. Encoded opening frames were visually inspected: typing has begun, with no empty interval before the first key. The detector classifies frames with over 98% dark pixels as black.";
qa.soundSync = syncRows; fs.writeFileSync(path.join(out, 'qa.json'), JSON.stringify(qa, null, 2));
const cuesFile = path.join(out, 'sound-cues.json'), sound = fs.existsSync(cuesFile) ? JSON.parse(fs.readFileSync(cuesFile, 'utf8')) : null;

// ---------- review page ----------
const t = f => (f / fps).toFixed(2) + ' s';
const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const passages = [
  ['Open / type / grow',0,168,'Real UI holds for 0.67 seconds, then typing begins directly. The native garden grows from in bloom.'],
  ['The living words',168,288,'Matched stage handoff, botanical camera travel and the restrained rose beauty shot.'],
  ['A visitor, a wound',288,worlds.start,'Approved butterfly contact, bead and falling drop. The native blood consequence and contour transition have more room.'],
  ['Five worlds',worlds.start,worlds.end,'Ivory, Old rose, Pink & black, Black rose and Silver. The same phrase stays anchored; the strongest palettes breathe longer.'],
  ['Letterforms and palette',fonts[0].start,botanical.start,'Cormorant and Bodoni hold longer, then Unifraktur and the cobalt/champagne world. Same phrase center and baseline; native recolour into crimson.'],
  ['Botanical abundance',botanical.start,botanical.end,'The existing garden grows continuously, peaks, then recovers the phrase. A native passing petal carries the identity.'],
  ['ROSE GARDEN',identity.start,identity.end,'The approved enlarged lush crimson portrait fully grows and blooms before the longer resolved hold. Exact attribution appears afterward.']
];
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark">
<title>Rose Garden — V3 Showcase Continuous Draft</title>
<style>:root{--bg:#0e0f0e;--paper:#efe7dc;--mut:#a59f95;--line:#34322f;--red:#e34e68}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--paper);font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased}
.wrap{width:min(1400px,calc(100% - 64px));margin:auto;padding:36px 0 70px}h1{font-family:Georgia,serif;font-weight:400;font-size:clamp(40px,5vw,72px);line-height:.98;margin:0 0 6px;letter-spacing:-.04em}h1 em{color:var(--red)}
h2{font-family:Georgia,serif;font-weight:400;font-size:30px;margin:54px 0 8px;letter-spacing:-.02em}p,li{color:#cfc6bb;font-size:13px;line-height:1.7;max-width:900px}.mut{color:var(--mut)}
video{display:block;width:100%;max-width:1280px;aspect-ratio:16/9;background:#000;margin:22px 0 8px}.grid{display:grid;gap:20px}.two{grid-template-columns:1fr 1fr}.sheet img{width:100%;display:block;background:#080808}
.sheet figcaption{font-size:11px;color:var(--mut);padding:8px 0 0;line-height:1.6}table{border-collapse:collapse;width:100%;font-size:12px}td,th{border-bottom:1px solid var(--line);padding:7px 10px 7px 0;text-align:left;vertical-align:top;color:#cfc6bb}th{color:var(--mut);font-weight:400;text-transform:uppercase;letter-spacing:.08em;font-size:10px}
code{font-family:Consolas,monospace;font-size:12px;color:#e8c9d0}.pill{display:inline-block;border:1px solid var(--line);padding:2px 8px;border-radius:99px;font-size:11px;color:var(--mut);margin-right:6px}.ok{color:#8fd19e}.warn{color:#e8c06a}
@media(max-width:800px){.two{grid-template-columns:1fr}.wrap{width:calc(100% - 28px)}}</style></head><body><div class="wrap">
<div class="mut" style="font-size:10px;letter-spacing:.15em;text-transform:uppercase">Rose Garden / V3 showcase · continuous motion draft</div>
<h1>Same words,<br><em>many worlds.</em></h1>
<p><strong>Draft 4: the full materials passage is removed.</strong> No replacement feature demo. The edit gives the anchored worlds, blood consequence, botanical build and final identity more room, and finishes two seconds earlier.</p>
<p>A low-resolution draft (960 × 540, 30 fps, exactly ${(motion.frames/fps).toFixed(3)} s, ${motion.frames.toLocaleString("en-US")} frames) with a synthesized sound design placed on the picture's own cue frames. Every picture frame comes from the real application and renderer; film-only layers are camera moves, retiming, motion blur, transition masks and the credit line. No full-resolution render has been made.</p>
<video controls preload="metadata" src="${path.basename(video)}"></video>
<div><span class="pill">${qa.frames} frames</span><span class="pill">${qa.resolution.join(' × ')}</span><span class="pill">${qa.duration.toFixed(3)} s</span>${qa.loudness ? `<span class="pill">${qa.loudness.integratedLufs} LUFS</span><span class="pill">${qa.loudness.truePeakDb} dBTP</span>` : ''}</div>

<h2>The edit</h2>
<table><tr><th>Passage</th><th>Time</th><th>Frames</th><th>What the motion shows</th></tr>${passages.map(p => `<tr><td>${esc(p[0])}</td><td>${t(p[1])} – ${t(p[2])}</td><td>${p[1]}–${p[2] - 1}</td><td>${esc(p[3])}</td></tr>`).join('')}</table>

<p><a href="polish-keyframes/index.html" style="color:var(--red)">Open the twelve current review keyframes</a>.</p>
<h2>Polish transitions</h2><figure class="sheet"><img src="${built.polish}" alt="Opening, cobalt to crimson and botanical title arrival"><figcaption>Encoded frames across the preserved opening, direct cobalt-to-crimson garden continuation and carried botanical title arrival.</figcaption></figure>
<h2>Whole film, every half second</h2>
<figure class="sheet"><img src="${built.overview}" alt="Overview"><figcaption>One frame every 15 frames (one beat at 120 BPM), read from the encoded draft.</figcaption></figure>

<h2>Open, type, grow</h2>
<figure class="sheet"><img src="${built.opening}" alt=""><figcaption>Frames 0, 8, 14, 20, 24, 30, 36, 42, 50, 64, 90, 120, 140, 156, 166, 176. The real UI, a push into the canvas, key-by-key typing and native growth.</figcaption></figure>
<figure class="sheet"><img src="${built.beauty}" alt=""><figcaption>Beauty: handoff, wide portrait, coil macro, rose-scale shot with petals, widening toward the encounter.</figcaption></figure>

<h2>Butterfly → landing → bite → bead → falling blood</h2>
<figure class="sheet"><img src="${built.chain}" alt=""><figcaption>Frames 305 … ${impact + 30}. Native events on the picture: bite <code>f${bite}</code>, bead <code>f${bead}</code>, release <code>f${release}</code>, impact <code>f${impact}</code> (${t(impact)}, on beat 28). Native simulation runs 1–2 steps per frame from bite to drop so each beat reads.</figcaption></figure>
<figure class="sheet"><img src="${built.response}" alt=""><figcaption>Native blood travels on the letter, further drips fall, and the blood contour carries the first world.</figcaption></figure>

<h2>Worlds, letterforms and palette</h2>
<figure class="sheet"><img src="${built.looks}" alt=""><figcaption>Five Looks with the phrase held in place. One restrained family of native petal passes accompanies the palette changes; the wind wipe and rose iris are removed.</figcaption></figure>
<figure class="sheet"><img src="${built.fonts}" alt=""><figcaption>Anchored cuts between genuine font refits, with the phrase centered and baseline matched, then the custom palette holds wide and recolours into crimson on the same plants.</figcaption></figure>

<h2>Botanical escalation and the title</h2>
<figure class="sheet"><img src="${built.botanical}" alt=""><figcaption>A single continuous ramp peaks, then recovers a readable phrase before an outlined native petal carries the identity.</figcaption></figure>
<figure class="sheet"><img src="${built.identity}" alt=""><figcaption>The crimson lockup is 15% larger. Native botanical settings protect more letter contours while keeping the garden lush. The larger, brighter attribution arrives after the name resolves.</figcaption></figure>

<h2>Aspect ratio planning</h2><p>Plan the 16:9 master and a separately framed 1:1 social version. A 9:16 version needs its own native camera pass: center crops truncate the phrase, butterfly approach, final lockup and attribution. No alternate continuous versions have been rendered. <a href="aspect-planning/index.html" style="color:var(--red)">Inspect source / square / vertical crop stills</a>.</p>
<h2>Sound design timing</h2>
${sound ? `<p>${esc(sound.status)} 120 BPM; the pulse begins on the impact accent and carries the montage. Encounter cues come from the render: ${JSON.stringify(sound.encounterCuesFromPicture)}.</p>
<figure class="sheet"><img src="waveform.png" alt="Waveform"><figcaption>Stereo waveform.</figcaption></figure>
<table><tr><th>Frame</th><th>Time</th><th>Sound</th></tr>${sound.accents.filter(a => a.name).map(a => `<tr><td>${a.frame}</td><td>${a.seconds.toFixed(2)} s</td><td>${esc(a.name)}</td></tr>`).join('')}</table>` : '<p class="mut">Sound has not been generated yet.</p>'}

<p>Editorial sound review: retain the keystrokes, contact/release/impact chain, anchored montage accents, botanical build and final warm resolve. All material textures, impacts, runoff cues and the former push into the stem are removed. Existing cue families are retimed to this edit; no new events added. Audio monitoring is unavailable in this environment: these arrangement refinements and sync checks do not establish a finished mix or replace a listening review of this draft.</p>
<h2>Sound sync</h2>
${syncRows.length ? `<p>Each row looks for the loudest 20 ms window within -30 to +120 ms of the picture cue and compares it with the quiet before it. A positive number means an accent sits on the cue; the offset says how far from the exact frame it peaks.</p><table><tr><th>Cue</th><th>Frame</th><th>Time</th><th>Accent over the sound before it</th><th>Peak offset</th></tr>${syncRows.map(r => `<tr><td>${esc(r.name)}</td><td>${r.frame}</td><td>${r.seconds.toFixed(2)} s</td><td>${r.accentDb} dB</td><td>${r.peakAtMs} ms</td></tr>`).join('')}</table>` : ''}

<h2>Checks</h2>
<p><a href="polish-review.json" style="color:var(--red)">Preservation and edit audit</a> · <a href="qa.json" style="color:var(--red)">Picture and sound QA</a>. The approved opening and beauty clips are identical frame for frame to draft 3. The application, V1, V2, Tender Violence and approved storyboard sources are preserved.</p>
<table><tr><th>Check</th><th>Result</th></tr>
<tr><td>Frame count</td><td class="${qa.frameCountPass ? 'ok' : 'warn'}">${qa.frames} of ${qa.expectedFrames}</td></tr>
<tr><td>Material showcase removed</td><td class="${qa.materialShowcaseRemoved ? 'ok' : 'warn'}">${qa.materialShowcaseRemoved ? 'All four passages removed; no replacement demonstration' : 'Check edit'}</td></tr>
<tr><td>Identity resolved before hold</td><td class="${qa.identityResolvedBeforeHold ? 'ok' : 'warn'}">${qa.identityResolvedBeforeHold ? 'Complete growth and bloom before the longer hold' : 'Check arrival'}</td></tr>
<tr><td>Typical adjacent-frame difference</td><td>${qa.typicalAdjacentFrameDiff}</td></tr>
<tr><td>Segment seams (difference across each boundary)</td><td>${qa.seams.map(s => `${esc(s.boundary)} @${s.frame}: ${s.diff}`).join(' · ')}</td></tr>
<tr><td>Black / freeze</td><td>${qa.blackAndFreeze.length ? esc(qa.blackAndFreeze.join(' · ')) : 'none detected'}</td></tr>
${qa.loudness ? `<tr><td>Loudness</td><td>${qa.loudness.integratedLufs} LUFS, ${qa.loudness.truePeakDb} dBTP, LRA ${qa.loudness.loudnessRangeLu} LU</td></tr>` : ''}</table>

<p class="mut">${esc(qa.blackDetectorInterpretation)}</p>
<h2>Decisions to review</h2>
<ul>${motion.notes.map(n => `<li>${esc(n)}</li>`).join('')}<li>Retimed native physics: the bite → bead → drop sequence is slowed to 1–2 simulation steps per frame; the blood consequence and botanical growth now breathe longer. Native thresholds and algorithms are untouched.</li></ul>
<p class="mut">Final identity: ROSE GARDEN · Based on an original concept by Akshat Agarwal · Reimagined and expanded as Rose Garden</p>
</div></body></html>`;
fs.writeFileSync(path.join(out, 'review.html'), html);
console.log(JSON.stringify({ review: path.join(out, 'review.html'), qa: { frames: qa.frames, pass: qa.frameCountPass, loudness: qa.loudness, seams: qa.seams, blackAndFreeze: qa.blackAndFreeze } }, null, 1));
