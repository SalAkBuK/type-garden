import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openRenderer } from '../../tools/renderer.mjs';

const direction = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// This is a storyboard capture, not a frame renderer. All glyphs and plants come
// from the actual live typing view. In particular, Creep is never substituted for
// typing, and individual species are never hidden to manufacture a growth order.
export const openingKeys = [
  { char: 'i', nativeMs: 120 }, { char: 'n', nativeMs: 200 },
  { char: ' ', nativeMs: 280 }, { char: 'b', nativeMs: 360 },
  { char: 'l', nativeMs: 440 }, { char: 'o', nativeMs: 520 },
  { char: 'o', nativeMs: 600 }, { char: 'm', nativeMs: 680 }
];

export const openingFrames = [
  { id: '01-open', seconds: 0.15, nativeMs: 0, intent: 'Actual application, empty writing canvas, native controls and caret.' },
  { id: '02-typing', seconds: 1.00, nativeMs: 420, intent: 'The real writing record contains in b; early canes follow the first letters.' },
  { id: '03-letters', seconds: 1.55, nativeMs: 950, intent: 'All eight characters have been entered and their native layout settles; the last glyph still has early growth.' },
  { id: '04-wrap', seconds: 2.15, nativeMs: 1100, intent: 'Native vines climb and begin winding around the glyph contours.' },
  { id: '05-foliage', seconds: 2.75, nativeMs: 1750, intent: 'Leaves unfurl where each moving vine tip has reached them.' },
  { id: '06-buds', seconds: 3.50, nativeMs: 2750, intent: 'Stillness earns the last word a bud; native rose heads swell.' },
  { id: '07-bloom', seconds: 4.65, nativeMs: 6200, intent: 'Native rose petal architecture opens; buds and half-open roses remain varied.' },
  { id: '08-complete', seconds: 5.90, nativeMs: 13500, intent: 'The finished living typography, with earned clusters, thorns and ambient petals.' }
];

export async function captureOpening({ outputDir = path.join(direction, 'output', 'keyframes') } = {}) {
  if (process.argv.includes('--full')) throw Error('Opening exports eight review stills only. Final production requires draft review.');
  fs.mkdirSync(outputDir, { recursive: true });
  const r = await openRenderer({ size: 540, software: true });
  const states = [];
  try {
    // The first frame is a screenshot of the real app at a landscape viewport,
    // keeping both native top controls and bottom typing hints readable. No app
    // source, DOM labels, settings names or branding are changed.
    await r.page.setViewportSize({ width: 1080, height: 608 });
    await r.page.evaluate(() => {
      const a = window.__typeGarden;
      window.__filmClock = 200000;
      a.setMode('type'); a.setLook('crimson'); a.state.busy = false;
      a.clearText(); a.layout(true); a.t0 = window.__filmClock - 1000;
      a.lastKey = window.__filmClock; a.paint(window.__filmClock, true);
    });
    const appScreenshot = await r.page.screenshot({ type: 'png' });
    const initial = await r.page.evaluate(async (data) => {
      const c = document.createElement('canvas'); c.width = 960; c.height = 540;
      const i = new Image(); i.src = data; await i.decode();
      c.getContext('2d').drawImage(i, 0, 0, 1080, 607.5, 0, 0, 960, 540);
      return c.toDataURL('image/png');
    }, `data:image/png;base64,${appScreenshot.toString('base64')}`);
    fs.writeFileSync(path.join(outputDir, '01-open.png'), decode(initial));
    states.push({ ...openingFrames[0], source: 'actual application screenshot', mode: 'type', text: '', nativeUi: true,
      sourceViewport: [1080, 608], proofSize: [960, 540], proofOnly: true });

    // Restore the renderer's intended square viewport before creating any glyph.
    // Cropping, not stretching a square image, supplies the film's 16:9 canvas.
    await r.page.setViewportSize({ width: 1080, height: 1080 });
    const metadata = await r.page.evaluate(prepareOpening, { keys: openingKeys, frames: openingFrames });
    for (const frame of openingFrames.slice(1)) {
      const result = await r.page.evaluate(drawOpening, frame);
      fs.writeFileSync(path.join(outputDir, `${frame.id}.png`), decode(result.png));
      states.push({ ...frame, ...result.state });
    }
    if (r.errors.length) throw Error(r.errors.join('\n'));
    const proof = { ...metadata, states, keyChronology: openingKeys, frameCount: states.length,
      note: 'Post-typing native time accelerates from 0.68 to 13.5 seconds inside the opening. Native plant clocks, thresholds and pause-grown blooms are unchanged; stems, leaves, buds and roses overlap as they do in the live product.',
      proofOnly: true, continuousFramesRendered: 0 };
    fs.writeFileSync(path.join(outputDir, '..', 'opening-proof.json'), JSON.stringify(proof, null, 2));
    return proof;
  } finally { await r.browser.close(); }
}

function decode(data) { return Buffer.from(data.split(',')[1], 'base64'); }

function prepareOpening({ keys }) {
  const a = window.__typeGarden, base = 210000;
  window.__filmClock = base;
  a.setMode('type'); a.setLook('crimson'); a.state.busy = false;
  a.clearText(); a.fill = 0.62; a.layout(true);
  // Clear only transient state from the page's pre-populated landing garden.
  // The new sequence then uses the unmodified add/keyEvent/frame/paint methods.
  a.flies = []; a.stains = []; a.drops = []; a.bites = {}; a.petalFall = [];
  a.dof = []; a._dofSeeded = false; a._glow = null; a._cuts = {};
  a._keyAt = null; a._sproutFor = null; a._pace = null; a._openBloom = null;
  a._visitAt = null; a._pfT = base; a.lt = base - 1000 / 60;
  a.t0 = base - 1000; a.lastKey = base; a.mx = a.my = null;
  // The opening gives the viewer a clean growing canvas after the real UI shot.
  a.paint(base, true);
  const out = document.createElement('canvas'); out.width = 960; out.height = 540;
  window.__showcaseOpening = { base, keys, nextKey: 0, nativeMs: 0, out, executedKeys: [],
    crop: { x: 0, y: 191.25, width: 1080, height: 607.5 } };
  return { source: 'index.html / actual live Type view', sourceViewport: [1080, 1080], proofSize: [960, 540],
    font: a.F, fontWeight: a.FW, nativeGrowthClock: 1.6, fill: a.fill,
    method: 'add(character, __filmClock, keyEvent(__filmClock)); frame(); paint(__filmClock, caret)',
    camera: 'Uniform source-canvas scale with a 16:9 crop; no square-to-landscape distortion.',
    growthChoreography: 'Unmodified native growth. Individual species overlap naturally; pause after the final m earns its bloom at 1580 ms. The automatic ambient visit is scheduled later so the butterfly entrance remains reserved for its encounter scene.' };
}

function drawOpening(frame) {
  const a = window.__typeGarden, f = window.__showcaseOpening, step = 1000 / 60;
  if (frame.nativeMs < f.nativeMs) throw Error('Opening proof frames must be captured in chronological order.');
  // Manual internal steps are necessary: the shared export bootstrap freezes RAF
  // and performance.now, so every native simulation reads this explicit clock.
  while (f.nativeMs < frame.nativeMs - 1e-7) {
    const nextMs = Math.min(frame.nativeMs, f.nativeMs + step, f.keys[f.nextKey]?.nativeMs ?? Infinity);
    f.nativeMs = nextMs; window.__filmClock = f.base + nextMs;
    while (f.nextKey < f.keys.length && f.keys[f.nextKey].nativeMs <= nextMs + 1e-7) {
      const key = f.keys[f.nextKey++], now = f.base + key.nativeMs;
      a.lastKey = now;
      const gap = a.keyEvent(now); a.add(key.char, now, gap);
      f.executedKeys.push({ ...key, clock: now, gap: Number.isFinite(gap) ? gap : null });
    }
    // Native visits are time-scheduled. Reserve that existing interaction for
    // the next scene instead of letting compressed stillness summon it early.
    a._visitAt = f.base + 90000;
    a.frame();
  }
  a.paint(window.__filmClock, frame.nativeMs <= 1100);
  const g = f.out.getContext('2d'), c = f.crop;
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  g.drawImage(a.cv, c.x * a.dpr, c.y * a.dpr, c.width * a.dpr, c.height * a.dpr, 0, 0, 960, 540);
  const letters = a.letters.filter(l => !l.dead), elements = letters.flatMap(l => a.letterLists(l, true).flat());
  const counts = {};
  for (const e of elements) counts[e.t] = (counts[e.t] || 0) + 1;
  const blooms = letters.filter(l => l.bloom).map(l => ({ character: l.ch, kind: l.bloom.kind,
    nativeAtMs: l.bloom.at - f.base, end: l.bloom.end == null ? null : l.bloom.end - f.base,
    earnedClusterCount: (l.bloomEls || []).filter(e => e.t === 'rose' && e.cluster).length }));
  const nativeRoseStates = [];
  for (const l of letters) for (const list of a.letterLists(l, true)) for (const e of list) {
    if (e.t !== 'rose') continue;
    const age = (window.__filmClock - l.birth) / a._G;
    const a0 = e.stem ? (age - a.vineCross(e.stem, e.su ?? 1)) * a._G - (e.lag || 0) : age - e.d0;
    const effectiveAge = e.bloom ? a.bloomAge(e, a0, window.__filmClock) : e.cap != null ? Math.min(a0, e.cap) : a0;
    nativeRoseStates.push({ id: e.id, letter: l.ch, stage: e.stage, vineArrivalAgeMs: a0,
      effectiveAgeMs: effectiveAge, earned: Boolean(e.bloom), cluster: Boolean(e.cluster),
      nativeAnchorVisible: Boolean(a._blooms[e.id]), nativeHeld: Boolean(e._held) });
  }
  return { png: f.out.toDataURL('image/png'), state: { source: 'actual live typing canvas', mode: a.state.mode,
    text: letters.map(l => l.ch).join(''), clock: window.__filmClock, nativeMs: f.nativeMs,
    typedKeys: f.executedKeys.slice(), blooms, nativeRoseStates, generatedElementCounts: counts,
    visibleRoseAnchors: a.perch.length, nativeOpeningRoses: a._openingRoses,
    ambientPetals: a.dof.length, fallingPetals: a.petalFall.length, crop: c,
    letters: letters.map(l => ({ ch: l.ch, id: l.id, seed: l.seed, seeds: l._seeds || {}, birthMs: l.birth - f.base,
      x: l.x, y: l.y, targetX: l.tx, targetY: l.ty })),
    fontSize: a.Sd, nativeGrowthClock: a._G, proofOnly: true } };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const proof = await captureOpening();
  console.log(`${proof.frameCount} opening review stills; true native typing, ${proof.continuousFramesRendered} continuous frames.`);
}
