// Draft sound design for the V3 showcase: an original synthesized sketch, placed on the picture's own
// cue frames (native bite / bead / release / impact / drip events are read from the
// segment renders, not guessed). It is a timing and structure draft; production music and recorded
// foley remain unfinished.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const motion = JSON.parse(fs.readFileSync(path.join(dir, 'motion.json'), 'utf8'));
const out = path.join(dir, 'output', 'draft');
const fps = motion.fps, sr = 48000, dur = motion.frames / fps, N = Math.round(dur * sr), TAU = Math.PI * 2;
const sec = f => f / fps;
const clamp = x => Math.max(0, Math.min(1, x));
const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const run = (exe, args) => { const r = spawnSync(exe, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }); if (r.status !== 0) throw Error(exe + ': ' + r.stderr); return r.stdout + r.stderr; };
const metaOf = id => { const f = path.join(out, 'segments', id + '.json'); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null; };
const cuesOf = (id, name) => (metaOf(id)?.cues || []).filter(c => c.name === name).map(c => c.f);
const first = (id, name, fallback) => cuesOf(id, name)[0] ?? fallback;
const ramp = keys => t => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) return keys[i - 1][1] + (keys[i][1] - keys[i - 1][1]) * smooth((t - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0]));
  return keys.at(-1)[1];
};

export async function audio() {
  const L = new Float32Array(N), R = new Float32Array(N), accents = [];
  let rs = 90210; const noise = () => { rs = (Math.imul(rs, 1664525) + 1013904223) | 0; return (rs >>> 0) / 2147483648 - 1; };
  const add = (f, len, voice, pan = 0, name = null) => {
    const at = f / fps, start = Math.round(at * sr), count = Math.min(Math.round(len * sr), N - start);
    if (start < 0 || count < 1) return;
    if (name) accents.push({ name, frame: Math.round(f * 10) / 10, seconds: Math.round(at * 1000) / 1000 });
    for (let i = 0; i < count; i++) {
      const t = i / sr, p = i / count, v = voice(t, p), q = typeof pan === 'function' ? pan(p) : pan, ang = (Math.max(-1, Math.min(1, q)) + 1) * Math.PI / 4;
      L[start + i] += v * Math.cos(ang); R[start + i] += v * Math.sin(ang);
    }
  };
  // a pass of filtered air: dir -1 right-to-left, 1 left-to-right
  const air = (f, len, gain, dir = 1, name = null, bright = 0.62) => {
    let lo = 0, slow = 0;
    add(f, len, (t, p) => { lo = lo * bright + noise() * (1 - bright); slow = slow * 0.974 + lo * 0.026; const shape = Math.sin(Math.PI * p) ** 2; return ((lo - slow) * 0.64 + slow * 1.2) * gain * shape * (0.7 + 0.3 * Math.sin(TAU * (22 * t + 6 * t * t))); }, p => dir * (p * 2 - 1), name);
  };
  const body = (f, gain, hz = 46, name = null) => add(f, 0.7, t => Math.sin(TAU * (hz * t + 3.4 * (1 - Math.exp(-t * 17)))) * gain * Math.exp(-t * 9) * smooth(t / 0.004), 0, name);
  const knock = (f, gain, pan = 0, hz = 168, name = null) => add(f, 0.17, t => (Math.sin(TAU * hz * t) * 0.62 + noise() * 0.38) * gain * Math.exp(-t * 48) * smooth(t / 0.0015), pan, name);
  const glass = (f, hz, gain, d = 2.1, pan = 0, name = null) => add(f, d, (t, p) => (Math.sin(TAU * hz * t) + 0.28 * Math.sin(TAU * hz * 2.756 * t) + 0.09 * Math.sin(TAU * hz * 5.404 * t)) * gain * Math.exp(-t * 2.3) * smooth(t / 0.003) * smooth((1 - p) * 9), pan, name);
  const wet = (f, gain, pan = 0, name = null) => add(f, 0.2, t => (noise() * 0.07 + Math.sin(TAU * (113 * t - 27 * t * t)) * 0.05) * gain * Math.exp(-t * 34) * smooth(t / 0.002), pan, name);
  const tick = (f, gain, hz, pan = 0, name = null) => add(f, 0.12, t => (Math.sin(TAU * hz * t) * 0.5 + noise() * 0.5) * gain * Math.exp(-t * 70) * smooth(t / 0.001), pan, name);
  const chirp = (f, len, hz0, hz1, gain, pan = 0, name = null) => { let ph = 0; add(f, len, (t, p) => { ph += TAU * (hz0 + (hz1 - hz0) * p) / sr; return Math.sin(ph) * gain * Math.sin(Math.PI * p) ** 1.5; }, pan, name); };
  const hat = (f, gain, pan = 0) => add(f, 0.05, t => noise() * gain * Math.exp(-t * 85) * smooth(t / 0.0008), pan);

  // ---------- picture facts ----------
  const bite = first('encounter', 'bite', 360), bead = first('encounter', 'bead', 371), release = first('encounter', 'release', 405), impact = first('encounter', 'impact', 420);
  const drips = cuesOf('encounter', 'drip');
  const beat = 15; // 120 BPM at 30 fps
  const seg = id => motion.segments.find(s => s.id === id);
  const worlds = seg('looks'), fonts = motion.segments.filter(s => s.driver === 'font'), custom = seg('custom');
  const botanical = seg('botanical'), identity = seg('identity'), arrived = motion.identity.grow.at(-1)[0], hold = motion.identity.holdFrom;

  // ---------- the tonal bed ----------
  // D minor tension through the encounter; the first full chord arrives when the words are complete; a
  // major resolve under the title. Slow vibrato, detuned pairs.
  const voice = (hz, t, det = 0, dark = 1) => { const ph = TAU * hz * (1 + det) * t + 0.05 * Math.sin(TAU * 4.4 * t); return Math.sin(ph) + 0.22 * dark * Math.sin(2 * ph + 0.2) + 0.09 * dark * Math.sin(3 * ph + 0.5) + 0.04 * dark * Math.sin(5 * ph + 0.9); };
  const T = f => sec(f);
  const env = {
    low: ramp([[0, 0], [T(30), 0], [T(95), 0.55], [T(165), 0.8], [T(300), 0.75], [T(345), 0.5], [T(372), 0.28], [T(418), 0.2], [T(425), 0.9], [T(worlds.start), 0.9], [T(fonts[0].start), 0.85], [T(custom.start), 0.8], [T(botanical.start), 0.8], [T(identity.start), 0.95], [T(identity.start+5), 0.2], [T(hold), 0.9], [dur - 1.4, 0.8], [dur, 0]]),
    upper: ramp([[0, 0], [T(100), 0], [T(165), 0.8], [T(300), 0.85], [T(335), 0.35], [T(358), 0.08], [T(420), 0.04], [T(436), 0.7], [T(worlds.start), 0.85], [T(fonts[0].start), 0.75], [T(custom.start), 0.9], [T(botanical.start), 0.7], [T(identity.start-5), 0.9], [T(identity.start), 0.1], [T(arrived), 0.9], [dur - 1.4, 0.85], [dur, 0]]),
    dark: ramp([[0, 0], [T(332), 0], [T(358), 0.9], [T(372), 0.95], [T(419), 0.8], [T(424), 0]]),
    major: ramp([[0, 0], [T(arrived), 0], [T(hold+7), 0.95], [dur - 1.4, 0.9], [dur, 0]]),
    riser: ramp([[0, 0], [T(botanical.start), 0], [T(identity.start-5), 1], [T(identity.start), 0]])
  };
  const bassNotes = [[0, 73.416], ...worlds.looks.slice(1).map((l,i)=>[T(l.from),[87.307,98,116.54,110][i]]), [T(fonts[0].start),73.416], [T(custom.start),116.54], [T(identity.start),73.416]];
  const bassAt = t => { let hz = bassNotes[0][1]; for (const [at, h] of bassNotes) if (t >= at) hz = h; return hz; };
  let air0 = 0, air1 = 0, old0 = 0, old1 = 0;
  for (let i = 0; i < N; i++) {
    const t = i / sr, lo = env.low(t), up = env.upper(t), dk = env.dark(t), mj = env.major(t), rs_ = env.riser(t);
    const hz = bassAt(t);
    let l = voice(hz, t, -0.0004, 0.65) * 0.034 * lo + voice(hz * 1.5, t, -0.0007, 0.4) * 0.02 * lo;
    let r = voice(hz, t, 0.0004, 0.65) * 0.034 * lo + voice(hz * 1.5, t, 0.0007, 0.4) * 0.02 * lo;
    l += (voice(146.83, t, -0.0005, 0.3) * 0.013 + voice(174.61, t, 0.0004, 0.3) * 0.01 + voice(220, t, -0.0002, 0.25) * 0.008 + voice(329.63, t, 0.0003, 0.15) * 0.004) * up;
    r += (voice(146.83, t, 0.0005, 0.3) * 0.013 + voice(174.61, t, -0.0004, 0.3) * 0.01 + voice(220, t, 0.0002, 0.25) * 0.008 + voice(329.63, t, -0.0003, 0.15) * 0.004) * up;
    const tens = voice(155.56, t, 0.0006, 0.2) * 0.02 * dk * (0.6 + 0.4 * Math.sin(TAU * 5.2 * t));
    l += tens; r += tens * 0.9;
    const maj = (voice(185.0, t, -0.0004, 0.25) * 0.016 + voice(293.66, t, 0.0003, 0.2) * 0.012 + voice(369.99, t, -0.0002, 0.15) * 0.008) * mj;
    l += maj; r += maj * 0.96;
    if (rs_ > 0) { const f0 = 110 * (1 + 3.2 * rs_ * rs_), rr = voice(f0, t, 0, 0.3) * 0.018 * rs_ * rs_; l += rr; r += rr * 0.94; }
    // faint room air (opening and gaps)
    air0 = air0 * 0.994 + noise() * 0.006; air1 = air1 * 0.992 + noise() * 0.008;
    const earlyAir = (smooth(t / 0.3) * (1 - smooth((t - 3.0) / 1.5))) * 0.02;
    l += (air0 - old0) * 1.4 * earlyAir; r += (air1 - old1) * 1.4 * earlyAir; old0 = air0; old1 = air1;
    L[i] += l; R[i] += r;
  }

  // ---------- opening: keys, stems, blooms ----------
  const keyF = motion.openCam.keyFrames;
  keyF.forEach((f, i) => knock(f, 0.03 + (i % 3) * 0.004, (i - 3.5) * 0.06, i === 2 ? 128 : 150 + (i % 4) * 14, i === 0 ? 'first key' : (i === 7 ? 'last key' : null)));
  air(14, 10, 0.012, 1, 'app opens: close air');
  for (let k = 0; k < 9; k++) air(52 + k * 11, 14, 0.016 + 0.004 * Math.sin(k), k % 2 ? -1 : 1, k === 0 ? 'stem friction: vines find the glyphs' : null);
  for (const f of [86, 104, 121, 133]) tick(f, 0.016, 2200 + f * 4, Math.sin(f) * 0.5, f === 86 ? 'leaf unfurl ticks' : null);
  body(110, 0.05, 44, 'swell pulse'); body(135, 0.06, 45);
  glass(138, 659.25, 0.026, 1.8, -0.2, 'first rose opens'); glass(148, 783.99, 0.02, 1.6, 0.25); glass(156, 987.77, 0.014, 1.5, 0);
  glass(165, 293.66, 0.07, 3.6, -0.1, 'living words resolve: chord'); glass(165.3, 440, 0.026, 3.4, 0.2);
  body(165, 0.09, 43);

  // ---------- beauty ----------
  air(196, 26, 0.02, 1, 'camera glides into the coil'); air(256, 26, 0.022, -1, 'rise to the rose');
  for (const f of [248, 262, 276, 290]) tick(f, 0.012, 3100, Math.sin(f * 2) * 0.6, f === 248 ? 'drifting petals' : null);
  body(300, 0.05, 44, 'slow living pulse');

  // ---------- encounter ----------
  // wingbeats (the pulse drops out), the butterfly's pan follows the camera into the rose
  const beatsF = [];
  for (let f = 296; f < 346; f += 2.2) beatsF.push(f);
  beatsF.forEach((f, i) => { const p = i / beatsF.length; air(f, 3.2, 0.018 + p * 0.03, 1, i === 0 ? 'butterfly wingbeats approach' : null, 0.5); });
  air(346, 14, 0.012, -1, 'wings settle'); knock(346, 0.03, 0.05, 210, 'landing: foot touches petal'); body(346, 0.045, 52);
  for (const f of [350, 354, 357]) air(f, 4, 0.01, f % 2 ? 1 : -1);
  wet(bite, 0.1, -0.1, 'bite: close wet contact');
  chirp(bead, 16, 380, 880, 0.02, 0, 'bead gathers (quiet)');
  air(release - 2, 7, 0.008, 1, 'bead release breath');
  tick(release, 0.09, 1900, 0.0, 'release: surface tension lets go'); glass(release + 0.5, 1046.5, 0.03, 0.5, 0.05);
  chirp(release + 1, 14, 900, 260, 0.03, 0.05, 'fall');
  body(impact, 0.34, 39, 'IMPACT: first full rhythmic accent');
  add(impact, 0.19, t => (noise() * 0.13 + Math.sin(TAU * 137 * t) * 0.07) * Math.exp(-t * 31) * smooth(t / 0.001), 0);
  glass(impact + 2, 587.33, 0.03, 0.9, 0.12, 'impact glass tail');
  const dripSets = drips.length ? drips : [452, 472, 494];
  dripSets.forEach((f, i) => { wet(f, 0.055, Math.sin(i * 1.7) * 0.4, i === 0 ? 'drips keep falling (native)' : null); tick(f + 1, 0.02, 700 + i * 60, 0.1); });
  for (let j = 0; j < 12; j++) add(impact + 5 + j * 5.5, 0.14, t => (Math.sin(TAU * (170 + (j % 4) * 41) * t) * 0.045 + noise() * 0.025) * Math.exp(-t * 43) * smooth(t / 0.002), Math.sin(j * 1.7) * 0.4, j === 0 ? 'viscous trace on the stroke' : null);
  // the blood wipe: a reversed swell into the first world
  const wipe = seg('encounter').wipe;
  add(wipe.f0, (wipe.f1 - wipe.f0) / fps, (t, p) => (noise() * 0.07 * (p ** 2) + Math.sin(TAU * (60 + 140 * p * p) * t) * 0.05 * p) * smooth(p * 3), p => -0.5 + p, 'blood wipe: reverse swell');
  body(wipe.f1, 0.16, 46, 'first world arrives'); glass(wipe.f1, 587.33, 0.04, 1.4, -0.1);

  // ---------- the 120 BPM pulse: it begins at the impact and carries the montage ----------
  for (let f = impact + beat; f < botanical.start; f += beat) {
    const idx = Math.round((f - impact) / beat), loud = f >= worlds.start ? 1 : 0.5;
    if (f >= worlds.start) body(f, 0.1 * loud, 44 + (idx % 4) * 0.4);
    else body(f, 0.05, 44);
    if (f >= worlds.start) hat(f + beat / 2, 0.016, idx % 2 ? 0.3 : -0.3);
  }
  for (let f = botanical.start; f < identity.start; f += beat / 2) { const strong = Math.round((f - botanical.start) / (beat / 2)) % 2 === 0, p=(f-botanical.start)/(identity.start-botanical.start); if (strong) body(f, 0.08 + 0.05 * p, 45); hat(f + 3, 0.02 + 0.02 * p, strong ? -0.2 : 0.2); }

  // ---------- Looks: each cut is a pitched accent, each transition its own sound ----------
  const notes = [587.33, 698.46, 783.99, 932.33, 880];
  motion.segments.find(s => s.id === 'looks').looks.forEach((l, i) => glass(l.from + 0.5, notes[i], 0.05, 1.0, (i - 2) * 0.2, 'look: ' + l.look));
  // Keep the Look pitch accents and pulse; remove the competing wind/iris/push voices.
  // One already-existing, softer petal pass at the midpoint carries the smaller transition family.
  const pet = worlds.transitions[2];
  air(pet.f0, pet.f1 - pet.f0, 0.04, 1, 'petals pass the lens');
  body(pet.center, 0.07, 42, 'petal pass: soft thud');

  // ---------- fonts and the custom world: whip pans, one pitched knock per face ----------
  const whips = fonts.map(s=>s.start);
  const faceHz = [523.25, 659.25, 392.0, 587.33];
  whips.forEach((f, i) => {
    add(f - 6, 12 / fps, (t, p) => noise() * 0.025 * Math.sin(Math.PI * p) ** 1.4 * (0.6 + 0.4 * Math.sin(TAU * 30 * t)), q => 0.7 - 1.4 * q, 'anchored font change' + (i === 0 ? ': Silver to Cormorant' : i === 1 ? ': Cormorant to Bodoni' : i === 2 ? ': Bodoni to Unifraktur' : ': Unifraktur to the custom palette'));
    knock(f + 0.5, 0.07, 0, 190 - i * 14); glass(f + 0.6, faceHz[i], 0.045, 1.1, (i - 1.5) * 0.2); body(f, 0.1, 45);
  });
  for (let f = fonts[0].start; f < botanical.start; f += beat / 2) if (Math.round((f - fonts[0].start) / (beat / 2)) % 2) hat(f, 0.016, 0.2);
  glass(custom.start+7, 466.16, 0.04, 2.0, 0, 'custom world: warm chord change'); glass(custom.start+7.5, 587.33, 0.03, 2.0, 0.2);

  // ---------- botanical climax and the cut to the title ----------
  const bt = motion.botanical;
  add(botanical.start, (botanical.end-botanical.start) / fps, (t, p) => (noise() * 0.05 * p * p + Math.sin(TAU * (160 + 600 * p * p) * t) * 0.03 * p) * smooth(p * 4), p => -0.3 + 0.6 * p, 'botanical riser: garden builds');
  air(bt.gust.f0, bt.gust.f1 - bt.gust.f0, 0.14, 1, 'gust carries petals');
  for (let j = 0; j < 14; j++) tick(bt.storm.f0-10 + j * 1.8, 0.02, 2400 + j * 90, Math.sin(j * 1.9) * 0.7, j === 0 ? 'petal storm flutter' : null);
  air(bt.storm.f0, bt.storm.cut - bt.storm.f0, 0.16, 1);
  body(bt.storm.cut, 0.2, 41, 'cut to the title: the hush');

  // ---------- identity: a quiet arrival, then the resolve ----------
  const id = motion.identity;
  for (let k = 0; k < 6; k++) air(identity.start+5 + k * 8, 12, 0.014, k % 2 ? -1 : 1, k === 0 ? 'the name grows' : null);
  // Keep the approved title voicing and pan; only its cue placement moves with this edit.
  for (const off of [17,27,35,42]) { const f=identity.start+off, phaseFrame=1095+off; glass(f, 659.25 * (phaseFrame % 3 + 1) / 2, 0.015, 1.2, Math.sin(phaseFrame) * 0.4); }
  glass(hold, 293.66, 0.085, dur - sec(hold), -0.06, 'ROSE GARDEN fully arrived: warm major resolve');
  glass(hold+.3, 440, 0.03, 3.4, 0.2); glass(hold+.6, 587.33, 0.022, 3.2, -0.2);
  body(hold, 0.12, 43);

  // ---------- room: short stereo taps, then gentle mastering ----------
  const dryL = L.slice(), dryR = R.slice();
  for (const [delay, gain, cross] of [[0.071, 0.13, false], [0.127, 0.095, true], [0.233, 0.075, false], [0.419, 0.043, true], [0.673, 0.024, false]]) {
    const sh = Math.round(delay * sr);
    for (let i = sh; i < N; i++) { L[i] += (cross ? dryR[i - sh] : dryL[i - sh]) * gain; R[i] += (cross ? dryL[i - sh] : dryR[i - sh]) * gain; }
  }
  let peak = 0;
  for (let i = 0; i < N; i++) {
    const t = i / sr, fade = smooth(t / 0.02) * (1 - smooth((t - (dur - 1.2)) / 1.2));
    L[i] = Math.tanh(L[i] * 1.1) * fade; R[i] = Math.tanh(R[i] * 1.1) * fade;
    peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  }
  const pcm = Buffer.alloc(44 + N * 8);
  pcm.write('RIFF'); pcm.writeUInt32LE(pcm.length - 8, 4); pcm.write('WAVEfmt ', 8); pcm.writeUInt32LE(16, 16); pcm.writeUInt16LE(3, 20); pcm.writeUInt16LE(2, 22);
  pcm.writeUInt32LE(sr, 24); pcm.writeUInt32LE(sr * 8, 28); pcm.writeUInt16LE(8, 32); pcm.writeUInt16LE(32, 34); pcm.write('data', 36); pcm.writeUInt32LE(N * 8, 40);
  for (let i = 0; i < N; i++) { pcm.writeFloatLE(L[i], 44 + i * 8); pcm.writeFloatLE(R[i], 48 + i * 8); }
  const raw = path.join(out, 'sound-raw.wav'), wav = path.join(out, 'sound.wav');
  fs.writeFileSync(raw, pcm);
  const target = { I: -16, TP: -2.6, LRA: 12 };
  const settings = `I=${target.I}:TP=${target.TP}:LRA=${target.LRA}`;
  const parse = log => JSON.parse(log.slice(log.lastIndexOf('{'), log.lastIndexOf('}') + 1));
  const m = parse(run('ffmpeg', ['-hide_banner', '-i', raw, '-af', `loudnorm=${settings}:print_format=json`, '-f', 'null', '-']));
  run('ffmpeg', ['-v', 'error', '-y', '-i', raw, '-af', `loudnorm=${settings}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`, '-ar', String(sr), '-c:a', 'pcm_s24le', wav]);
  const log = run('ffmpeg', ['-hide_banner', '-i', wav, '-af', 'ebur128=peak=true', '-f', 'null', '-']);
  const sum = log.slice(log.lastIndexOf('Summary:'));
  const measured = { integratedLufs: Number(sum.match(/I:\s*([\d.-]+) LUFS/)?.[1]), truePeakDb: Number(sum.match(/Peak:\s*([\d.-]+) dBFS/)?.[1]), loudnessRangeLu: Number(sum.match(/LRA:\s*([\d.-]+) LU/)?.[1]) };
  run('ffmpeg', ['-v', 'error', '-y', '-i', wav, '-filter_complex', 'showwavespic=s=1600x240:split_channels=1:colors=dc4b69|b998bd:scale=sqrt', '-frames:v', '1', path.join(out, 'waveform.png')]);
  accents.sort((a, b) => a.frame - b.frame);
  const result = { status: 'Original synthesized sound sketch for timing review; production music and recorded foley remain unfinished.', bpm: motion.bpm, fps, durationSeconds: dur, target, measured, rawPeakDb: 20 * Math.log10(peak), accents,
    encounterCuesFromPicture: { bite, bead, release, impact, drips: dripSets } };
  fs.writeFileSync(path.join(out, 'sound-cues.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ wav, ...measured, accents: accents.length, encounter: result.encounterCuesFromPicture }));
  return wav;
}

export function mux() {
  const picture = path.join(out, 'picture.mp4'), wav = path.join(out, 'sound.wav'), draft = path.join(out, 'draft.mp4');
  run('ffmpeg', ['-v', 'error', '-y', '-i', picture, '-i', wav, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-t', String(dur), '-movflags', '+faststart', draft]);
  console.log(draft);
  return draft;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) { await audio(); mux(); }
