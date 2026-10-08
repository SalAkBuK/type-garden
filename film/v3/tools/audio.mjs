import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const v3 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const T = JSON.parse(fs.readFileSync(path.join(v3, 'timeline.json'), 'utf8'));
const out = path.join(v3, 'output');
const sr = 48000;
const TAU = Math.PI * 2;
const clamp = x => Math.max(0, Math.min(1, x));
const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const event = id => {
  const cue = T.events.find(e => e.id === id);
  if (!cue) throw new Error(`Missing score cue: ${id}`);
  return cue.seconds;
};
const scene = id => {
  const passage = T.scenes.find(s => s.id === id);
  if (!passage) throw new Error(`Missing score passage: ${id}`);
  return passage;
};
function run(args) {
  const r = spawnSync('ffmpeg', args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(r.stderr || 'ffmpeg failed');
  return r.stdout + r.stderr;
}
function parseJsonLog(log) {
  const start = log.lastIndexOf('{');
  const end = log.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('Missing ffmpeg loudness measurement');
  return JSON.parse(log.slice(start, end + 1));
}
function measureR128(file) {
  const log = run(['-hide_banner', '-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-']);
  const summary = log.slice(log.lastIndexOf('Summary:'));
  return {
    integratedLufs: Number(summary.match(/I:\s*([\d.-]+) LUFS/)?.[1]),
    truePeakDb: Number(summary.match(/Peak:\s*([\d.-]+) dBFS/)?.[1]),
    loudnessRangeLu: Number(summary.match(/LRA:\s*([\d.-]+) LU/)?.[1]),
  };
}

// Original synthesized review score. These sounds are an editorial sketch,
// not a claim that production music or recorded foley has been completed.
export function audio() {
  fs.mkdirSync(out, { recursive: true });
  const duration = T.durationSeconds;
  const samples = Math.round(duration * sr);
  const L = new Float64Array(samples);
  const R = new Float64Array(samples);
  let randomSeed = 307241;
  const noise = () => {
    randomSeed = (Math.imul(randomSeed, 1664525) + 1013904223) | 0;
    return (randomSeed >>> 0) / 2147483648 - 1;
  };
  const bite = event('bite'), impact = event('impact'), gust = event('gust');
  const bone = event('bone-cut'), absence = event('silence'), rebirth = event('return');
  const resolve = event('resolve'), fever = scene('fever').start;
  const beat = 60 / T.bpm;
  const bowed = (hz, t, detune = 0, darkness = 1) => {
    const phase = TAU * hz * (1 + detune) * t + .065 * Math.sin(TAU * 4.6 * t);
    return Math.sin(phase) + .24 * darkness * Math.sin(phase * 2 + .18)
      + .105 * darkness * Math.sin(phase * 3 + .43)
      + .043 * darkness * Math.sin(phase * 5 + .82);
  };
  let airL = 0, airR = 0, oldAirL = 0, oldAirR = 0;
  for (let i = 0; i < samples; i++) {
    const t = i / sr;
    airL = airL * .994 + noise() * .006;
    airR = airR * .992 + noise() * .008;
    const bandL = airL - oldAirL, bandR = airR - oldAirR;
    oldAirL = airL; oldAirR = airR;
    const earlyAir = smooth(t / .25) * (1 - smooth((t - 8.6) / 1.3));
    const bowOpen = smooth((t - scene('unfurl').start) / 1.8)
      * (1 - smooth((t - 9.05) / .85));
    const traceOpen = smooth((t - impact) / .38) * (1 - smooth((t - 19.6) / .4));
    const windWeight = smooth((t - gust) / .75) * (1 - smooth((t - 19.4) / .6));
    const returnOpen = smooth((t - rebirth) / 4.5);
    const bodyEnd = 1 - smooth((t - 34.88) / .12);
    const returnGain = returnOpen * bodyEnd;
    const bowGain = bowOpen * .026 + traceOpen * .023 + returnGain * .044;
    const fifthGain = bowOpen * .018 + windWeight * .019 + returnGain * .035;
    const upperGain = bowOpen * .010 + returnGain * .021;
    L[i] = bowed(73.4162, t, -.0004, .65) * bowGain
      + bowed(110, t, -.0007, .4) * fifthGain
      + bowed(174.6141, t, -.0002, .28) * upperGain
      + bowed(246.9417, t, -.00055, .18) * returnGain * .012
      + airL * .031 * earlyAir + bandL * .032 * earlyAir;
    R[i] = bowed(73.4162, t, .0004, .65) * bowGain
      + bowed(110, t, .0007, .4) * fifthGain
      + bowed(174.6141, t, .0002, .28) * upperGain
      + bowed(246.9417, t, .00055, .18) * returnGain * .012
      + airR * .029 * earlyAir + bandR * .036 * earlyAir;
  }

  const accents = [];
  function add(at, length, voice, pan = 0, name = null) {
    const start = Math.round(at * sr), count = Math.min(Math.round(length * sr), samples - start);
    if (start < 0 || count < 1) return;
    if (name) accents.push({ name, seconds: at, duration: count / sr, pan: typeof pan === 'number' ? pan : 'moving' });
    for (let i = 0; i < count; i++) {
      const t = i / sr, p = i / count, sample = voice(t, p);
      const position = typeof pan === 'function' ? pan(p) : pan;
      const angle = (Math.max(-1, Math.min(1, position)) + 1) * Math.PI / 4;
      L[start + i] += sample * Math.cos(angle);
      R[start + i] += sample * Math.sin(angle);
    }
  }
  function airyPass(at, length, gain, direction, name) {
    let low = 0, slow = 0;
    add(at, length, (t, p) => {
      low = low * .66 + noise() * .34;
      slow = slow * .974 + low * .026;
      const motion = Math.sin(Math.PI * p) ** 2;
      return ((low - slow) * .64 + slow * 1.25) * gain * motion
        * (.7 + .3 * Math.sin(TAU * (22 * t + 6 * t * t)));
    }, p => direction * (p * 2 - 1), name);
  }
  function lowBody(at, gain, hz = 48, name = null) {
    add(at, .7, t => Math.sin(TAU * (hz * t + 3.6 * (1 - Math.exp(-t * 17))))
      * gain * Math.exp(-t * 9) * smooth(t / .004), 0, name);
  }
  function dryKnock(at, gain, pan = 0, name = null) {
    add(at, .17, t => (Math.sin(TAU * 168 * t) * .65 + noise() * .35)
      * gain * Math.exp(-t * 48) * smooth(t / .0015), pan, name);
  }
  function glass(at, hz, gain, duration = 2.1, pan = 0, name = null) {
    add(at, duration, (t, p) => (Math.sin(TAU * hz * t)
      + .28 * Math.sin(TAU * hz * 2.756 * t)
      + .09 * Math.sin(TAU * hz * 5.404 * t))
      * gain * Math.exp(-t * 2.3) * smooth(t / .003) * smooth((1 - p) * 9), pan, name);
  }

  // The opening is tactile and close, with no regular click-track underneath it.
  airyPass(.22, .8, .017, 1, 'close air / vine friction');
  airyPass(1.32, .55, .009, -1, 'dry fiber');
  dryKnock(2.5, .024, -.45, 'one thorn tick');
  airyPass(3.2, 1.4, .025, 1, 'reverse breath into unfolding');
  lowBody(4.05, .074, 43, 'unfold pulse');
  lowBody(6.55, .052, 46, 'slow living pulse');
  airyPass(7.56, .19, .038, 1, 'wing snap one');
  airyPass(9.04, .16, .031, -1, 'wing snap two');

  // All backing falls away before contact. The suspended drop receives space.
  add(bite, .18, t => (noise() * .068 + Math.sin(TAU * (113 * t - 27 * t * t)) * .047)
    * Math.exp(-t * 37) * smooth(t / .002), -.12, 'close wet bite');
  airyPass(event('release') - .07, .22, .0048, 1, 'bead release breath');
  lowBody(impact, .32, 39, 'native impact body');
  add(impact, .19, t => (noise() * .125 + Math.sin(TAU * 137 * t) * .067)
    * Math.exp(-t * 31) * smooth(t / .001), 0, 'native impact liquid');
  glass(impact + .055, 587.3295, .025, .8, .12, 'impact glass tail');
  const grains = [.13, .29, .54, .78, 1.04, 1.31, 1.49, 1.78, 1.97, 2.23];
  for (let j = 0; j < grains.length; j++) {
    const hz = 180 + (j % 4) * 41;
    add(impact + grains[j], .14, t => (Math.sin(TAU * (hz * t + .65 * (1 - Math.exp(-t * 55))))
      * .048 + noise() * .027) * Math.exp(-t * 43) * smooth(t / .002), Math.sin(j * 1.71) * .45,
    j === 2 ? 'fluid granular rhythm' : null);
  }

  // Gust is asymmetrical, with passing air and broken percussion rather than a metronome.
  airyPass(gust - .12, 1.35, .19, 1, 'gust tearing air');
  airyPass(gust + 1.15, .85, .071, -1, 'petal pass right to left');
  airyPass(gust + 2.78, 1.05, .089, 1, 'petal pass left to right');
  airyPass(gust + 4.08, .70, .079, -1, 'last crimson wind');
  const stormPattern = [0, .5, 1.5, 2, 2.5, 3.5, 4, 5.5, 6, 6.5, 7.5];
  stormPattern.forEach((unit, j) => {
    const at = gust + unit * beat;
    dryKnock(at, j % 3 === 0 ? .092 : .048, Math.sin(j * 1.4) * .55,
      j === 0 ? 'broken storm percussion' : null);
    if ([0, 4, 7].includes(j)) lowBody(at, .105, 46 + j * .35);
  });

  // Bone exposes a dry narrow transient, then death drains into silence.
  dryKnock(bone, .145, 0, 'bone hard cut');
  add(bone, .055, t => noise() * .083 * Math.exp(-t * 85), 0, 'dry bone crack');
  lowBody(bone + .02, .105, 37, 'exposed heartbeat');
  lowBody(bone + 1.25, .056, 37, 'last heartbeat');
  add(scene('extinction').start, 2.47, (t, p) => {
    const phase = TAU * (164 * t - 29 * t * t);
    return (Math.sin(phase) + .19 * Math.sin(phase * 3) + noise() * .16)
      * .045 * Math.sin(Math.PI * p) ** 2 * (1 - p);
  }, -.10, 'descending string rasp');
  for (const [offset, pan] of [[.18, -.55], [.67, .35], [1.36, -.2], [2.02, .5]])
    dryKnock(scene('extinction').start + offset, .025, pan, 'brittle falling petal');

  // Rebirth is a continuous rise. Pulse returns at half time and then accelerates.
  add(rebirth, fever - rebirth, (t, p) => {
    const swell = Math.pow(p, 1.8) * (1 - smooth((p - .91) / .09));
    const pitch = TAU * (146.8324 * t + 4.4 * t * t);
    return (Math.sin(pitch) * .065 + Math.sin(pitch * 2.003) * .022
      + noise() * .015) * swell;
  }, p => -.55 + p * .95, 'regrowth reverse crescendo');
  airyPass(rebirth, 4.8, .031, 1, 'regrowth breath');
  [0, 2, 4, 5, 6, 7].forEach((unit, j) => {
    const at = rebirth + unit * beat;
    lowBody(at, .036 + j * .011, 46);
    if (j > 2) dryKnock(at, .043, j % 2 ? -.35 : .35);
  });

  // Four exact picture accents are the only regular run of strong attacks.
  const feverPan = [-.55, .45, -.2, .2];
  const feverPitch = [293.6648, 349.2282, 440, 493.8833];
  for (let j = 0; j < 4; j++) {
    const at = fever + j * beat;
    lowBody(at, .15 + j * .013, 44 + j);
    dryKnock(at, .083 + j * .004, feverPan[j], `fever accent ${j + 1}`);
    glass(at + .012, feverPitch[j], .019 + j * .003, .56, -feverPan[j]);
    airyPass(at + .055, .24, .032, j % 2 ? -1 : 1, null);
  }

  glass(resolve, 293.6648, .072, 4.94, -.12, 'identity warm bell');
  glass(resolve + .009, 440, .025, 4.9, .22, 'identity bell fifth');
  add(resolve, duration - resolve, (t, p) => (Math.sin(TAU * 146.8324 * t)
    + .63 * Math.sin(TAU * 220.06 * t) + .25 * Math.sin(TAU * 329.6276 * t))
    * .043 * smooth(t / .10) * Math.exp(-t * .39) * smooth((1 - p) * 5), -.06,
  'identity suspended chord');

  // Small deterministic room taps make the music spatial; the quiet void is gated
  // after reverb, so the 25–27.5s creative silence cannot inherit a long tail.
  const dryL = L.slice(), dryR = R.slice();
  for (const [delay, gain, cross] of [[.071, .13, false], [.127, .095, true], [.233, .075, false], [.419, .043, true], [.673, .024, false]]) {
    const shift = Math.round(delay * sr);
    for (let i = shift; i < samples; i++) {
      L[i] += (cross ? dryR[i - shift] : dryL[i - shift]) * gain;
      R[i] += (cross ? dryL[i - shift] : dryR[i - shift]) * gain;
    }
  }
  let room = 0;
  let rawPeak = 0;
  for (let i = 0; i < samples; i++) {
    const t = i / sr;
    const intoVoid = 1 - smooth((t - (absence - .032)) / .032);
    const outOfVoid = smooth((t - rebirth) / .048);
    const gate = t < absence ? intoVoid : t < rebirth ? 0 : outOfVoid;
    const fade = smooth(t / .02) * (1 - smooth((t - (duration - 1.15)) / 1.15));
    room = room * .995 + noise() * .005;
    const roomTone = room * .000085 * fade;
    L[i] = Math.tanh(L[i] * 1.12) * gate * fade + roomTone;
    R[i] = Math.tanh(R[i] * 1.12) * gate * fade + roomTone * .97;
    rawPeak = Math.max(rawPeak, Math.abs(L[i]), Math.abs(R[i]));
  }

  // 32-bit float PCM keeps the very quiet review passage intact before mastering.
  const pcm = Buffer.alloc(44 + samples * 8);
  pcm.write('RIFF'); pcm.writeUInt32LE(pcm.length - 8, 4); pcm.write('WAVEfmt ', 8);
  pcm.writeUInt32LE(16, 16); pcm.writeUInt16LE(3, 20); pcm.writeUInt16LE(2, 22);
  pcm.writeUInt32LE(sr, 24); pcm.writeUInt32LE(sr * 8, 28); pcm.writeUInt16LE(8, 32);
  pcm.writeUInt16LE(32, 34); pcm.write('data', 36); pcm.writeUInt32LE(samples * 8, 40);
  for (let i = 0; i < samples; i++) {
    pcm.writeFloatLE(L[i], 44 + i * 8); pcm.writeFloatLE(R[i], 48 + i * 8);
  }
  const raw = path.join(out, 'design-score-raw.wav');
  const normalized = path.join(out, 'design-score-normalized.wav');
  const wav = path.join(out, 'design-score.wav');
  fs.writeFileSync(raw, pcm);
  const target = { integratedLufs: -17, truePeakDb: -2.0, maximumTruePeakDb: -1.5, lra: 14 };
  const settings = `I=${target.integratedLufs}:TP=${target.truePeakDb}:LRA=${target.lra}`;
  const rawMeasure = parseJsonLog(run(['-hide_banner', '-i', raw, '-af', `loudnorm=${settings}:print_format=json`, '-f', 'null', '-']));
  run(['-v', 'error', '-y', '-i', raw, '-af',
    `loudnorm=${settings}:measured_I=${rawMeasure.input_i}:measured_TP=${rawMeasure.input_tp}:measured_LRA=${rawMeasure.input_lra}:measured_thresh=${rawMeasure.input_thresh}:offset=${rawMeasure.target_offset}:linear=true`,
    '-ar', String(sr), '-c:a', 'pcm_s24le', normalized]);
  // loudnorm and independent R128 integration use slightly different gating.
  // A measured constant trim keeps the dynamics while meeting the delivered target.
  const preliminaryR128 = measureR128(normalized);
  const deliveryTrimDb = target.integratedLufs - preliminaryR128.integratedLufs;
  run(['-v', 'error', '-y', '-i', normalized, '-af', `volume=${deliveryTrimDb}dB`,
    '-ar', String(sr), '-c:a', 'pcm_s24le', wav]);
  const finalMeasure = parseJsonLog(run(['-hide_banner', '-i', wav, '-af', `loudnorm=${settings}:print_format=json`, '-f', 'null', '-']));
  const deliveredR128 = measureR128(wav);
  const probe = spawnSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', wav], { encoding: 'utf8' });
  if (probe.status !== 0) throw new Error(probe.stderr);
  const decoded = JSON.parse(probe.stdout);
  const stream = decoded.streams.find(s => s.codec_type === 'audio');
  const measured = {
    durationSeconds: Number(decoded.format.duration),
    sampleRate: Number(stream.sample_rate),
    channels: stream.channels,
    integratedLufs: deliveredR128.integratedLufs,
    truePeakDb: Number(finalMeasure.input_tp),
    loudnessRangeLu: deliveredR128.loudnessRangeLu,
  };
  const waveform = path.join(out, 'waveform.png');
  run(['-v', 'error', '-y', '-i', wav, '-filter_complex',
    'showwavespic=s=1600x300:split_channels=1:colors=dc4b69|b998bd:scale=sqrt', '-frames:v', '1', waveform]);
  const result = {
    draftScore: true,
    status: 'Original synthesized audio sketch for storyboard and timing review; production music and recorded foley remain unfinished.',
    title: `${T.title} — ${T.concept} / Version 3 audio sketch`,
    bpm: T.bpm, bars: T.bars, durationSeconds: duration,
    target, measured, rawPeakDb: 20 * Math.log10(rawPeak), rawMeasure,
    deliveryTrimDb, deliveredR128, loudnormDeliveryMeasurement: finalMeasure,
    waveform: path.relative(v3, waveform).replaceAll('\\', '/'),
    wav: path.relative(v3, wav).replaceAll('\\', '/'),
    accents,
    structure: T.scenes.map(s => ({ id: s.id, start: s.start, end: s.end, intent: s.sound })),
    normalization: 'Measured two-pass ffmpeg loudnorm followed by a constant trim from independent R128 analysis; delivered as 48 kHz stereo 24-bit PCM.',
    pass: measured.durationSeconds === duration && measured.sampleRate === sr && measured.channels === 2
      && Math.abs(measured.integratedLufs - target.integratedLufs) <= 1
      && measured.truePeakDb <= target.maximumTruePeakDb,
  };
  fs.writeFileSync(path.join(out, 'audio-sketch.json'), JSON.stringify(result, null, 2) + '\n');
  if (!result.pass) throw new Error(`Audio sketch QA failed: ${JSON.stringify(measured)}`);
  console.log(JSON.stringify({ draftScore: true, wav, waveform, ...measured, pass: result.pass }, null, 2));
  return wav;
}

export const renderAudioSketch = audio;
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) audio();
