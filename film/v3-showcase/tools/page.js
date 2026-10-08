// Browser-side shot driver for the V3 showcase draft. It runs inside the real Rose Garden page
// (index.html) after the existing film bootstrap has frozen requestAnimationFrame and
// performance.now. Every plant, drop, stain, petal and butterfly is drawn by the application's own
// renderer. This file only decides where the camera is, which native simulation time a film frame
// shows, which Look is active, and how two real renders are joined (masks, motion blur, a credit).
(() => {
  'use strict';
  const a = window.__typeGarden;
  const W = 960, H = 540;
  const clamp = (x, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x));
  const lerp = (x, y, v) => x + (y - x) * v;
  const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
  const eio = x => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  const eo = x => 1 - Math.pow(1 - clamp(x), 3);
  const ei = x => Math.pow(clamp(x), 3);
  const M = window.__motion = { cues: [], W, H };

  // ---------- smooth channels ----------
  // Monotone cubic through [x, y] keys. `flat` zeroes the end slopes (an eased start and stop);
  // otherwise the ends keep the one-sided slope so a path can continue through a cut.
  function pchip(keys, flat = false) {
    const n = keys.length, xs = keys.map(k => k[0]), ys = keys.map(k => k[1]);
    if (n === 1) return () => ys[0];
    const h = [], d = [], m = new Array(n).fill(0);
    for (let i = 0; i < n - 1; i++) { h[i] = xs[i + 1] - xs[i]; d[i] = (ys[i + 1] - ys[i]) / h[i]; }
    if (n === 2) { m[0] = m[1] = flat ? 0 : d[0]; }
    else {
      for (let i = 1; i < n - 1; i++) {
        if (d[i - 1] * d[i] <= 0) m[i] = 0;
        else { const w1 = 2 * h[i] + h[i - 1], w2 = h[i] + 2 * h[i - 1]; m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]); }
      }
      m[0] = flat ? 0 : d[0]; m[n - 1] = flat ? 0 : d[n - 2];
    }
    return x => {
      if (x <= xs[0]) return ys[0] + (flat ? 0 : m[0] * (x - xs[0]));
      if (x >= xs[n - 1]) return ys[n - 1] + (flat ? 0 : m[n - 1] * (x - xs[n - 1]));
      let i = 0; while (x > xs[i + 1]) i++;
      const t = (x - xs[i]) / h[i], t2 = t * t, t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h[i] * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h[i] * m[i + 1];
    };
  }
  M.pchip = pchip;

  // ---------- canvases and a fixed screen-space noise field for masks ----------
  const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
  M.out = mk(); const cA = mk(), cB = mk(), cW = mk();
  const gOut = M.out.getContext('2d'), gA = cA.getContext('2d'), gB = cB.getContext('2d'), gW = cW.getContext('2d', { willReadFrequently: true });
  const noise = (() => {
    const hash = (x, y, s) => { let n = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 2147483647); n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
    const vn = (x, y, s) => { const X = Math.floor(x), Y = Math.floor(y), u = smooth(x - X), v = smooth(y - Y); return lerp(lerp(hash(X, Y, s), hash(X + 1, Y, s), u), lerp(hash(X, Y + 1, s), hash(X + 1, Y + 1, s), u), v); };
    const f = new Float32Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) f[y * W + x] = vn(x / 70, y / 70, 1) * 0.55 + vn(x / 23, y / 23, 2) * 0.3 + vn(x / 8, y / 8, 3) * 0.15;
    return f;
  })();

  // ---------- anchors, stage building and scouting ----------
  M.motion = null; M.def = null; M.S = null; M.cam = null;

  async function build(spec = {}) {
    a.stage?.stageRelease(); a.stage = null;
    const base = M.motion.defaults.stage, sp = { ...base, ...spec };
    a.state.busy = true; a.setLook(sp.look);
    if (a.font().id !== sp.font) {
      await a.setFont(sp.font);
      if (a.font().id !== sp.font) throw Error('Font refit failed: ' + sp.font);
      a.stage?.stageRelease(); a.stage = null;
    }
    a.setMaterial(sp.material); a.setBleed(sp.bleed);
    // The same supported Fluid-based custom dose is used for every material experiment: the app's own Amount control.
    if (sp.experiment) { a.baseBleed('fluid'); a.editBleed({ amount: 3 }); }
    a.setAppearance({ botanical: a.cleanBotanical(sp.botanical), ...(sp.appearance || {}) });
    a.state.text = sp.text || M.motion.text; a.state.seed = M.motion.seed;
    const keys = [['i', 120], ['n', 200], [' ', 280], ['b', 360], ['l', 440], ['o', 520], ['o', 600], ['m', 680]];
    const original = a.stageWrite;
    // The live input's own content seeds and key chronology, so this garden is the opening's garden.
    a.stageWrite = function (text) {
      this.fill = 0.62; this._salt = '';
      let last = 0;
      for (let i = 0; i < text.length; i++) {
        const t = text === 'in bloom' ? keys[i][1] : 120 + i * 100;
        this.add(text[i], t, this.keyEvent(t)); last = t;
      }
      this.checkSprout(last + 1500); this.layout(true);
      for (const l of this.letters) { l.x = l.tx; l.y = l.ty; l.cut = null; }
    };
    let s;
    try { s = a.stage = a.makeStage(a.state.text, M.motion.seed); } finally { a.stageWrite = original; }
    s.state = { ...a.state, busy: true };
    const stamp = s.stampPlants;
    s.stampPlants = function (B, l, layer, ...rest) {
      this._plantBudget = Infinity;
      const t = B.ctx.getTransform(), scale = Math.hypot(t.a, t.b), cache = l._plantCache?.[layer];
      if (cache && Math.abs(cache.scale - scale) > 1e-12) { this.freeBitmap(cache.cv); delete l._plantCache[layer]; }
      return stamp.call(this, B, l, layer, ...rest);
    };
    s._fr = { f: 1, x: 540, y: 540 }; s._swayT = 0;
    const box = s.stageReach({ bloomAge: () => 5900 });
    M.S = s; M.spec = sp;
    M.wide = { x: (box.x0 + box.x1) / 2, y: (box.y0 + box.y1) / 2, span: Math.max((box.x1 - box.x0) * H / W, box.y1 - box.y0) * 1.22 };
    M.mot = a.MOTIONS.find(m => m.id === 'bite');
    M.dt = 1000 / 60 / M.mot.clock;
    return s;
  }
  M.build = build;

  // The first real rose-to-ink collision for this configuration, and the drop's track to it.
  function scout() {
    const s = M.S, m = M.mot, dt = M.dt, candidates = [], originalBlood = s.bloodStep;
    s.bloodStep = function (...args) { for (const b of Object.values(this.bites)) b.max = 1; return originalBlood.apply(this, args); };
    for (const [id, hero] of Object.entries(s.anchors)) {
      if (hero.stage === 'bud' || hero.R < 23) continue;
      s.biteId = id; s.stageReset();
      let bite = null, bead = null, release = null, impact = null; const track = [];
      for (let t = 0; t < 7000; t += dt) {
        s.stageSeek(m, t);
        if (s.sim.bit && bite === null) bite = s.sim.t;
        const d = s.drops.find(d => String(d.id) === id && d.st !== 'spray');
        if (d) { track.push({ t: s.sim.t, x: d.x, y: d.y, r: d.r, st: d.st }); if (bead === null) bead = s.sim.t; if (d.st === 'fall' && release === null) release = s.sim.t; }
        if (s.stains.length) { const st = s.stains[0]; impact = { t: s.sim.t, x: st.l.x + st.lx * s.St, y: st.l.y + st.ly * s.St, ch: st.l.ch }; break; }
      }
      if (impact && release) candidates.push({ id, hero, bite, bead, release, impact, track, score: Math.min(120, impact.y - hero.y) + hero.R * 2 - Math.abs(hero.x - 540) * 0.08 });
    }
    s.bloodStep = originalBlood;
    candidates.sort((x, y) => y.score - x.score);
    if (!candidates.length) throw Error('No real rose-to-ink collision found');
    M.cue = candidates[0]; s.biteId = M.cue.id; s.stageReset();
    return M.cue;
  }
  M.scout = scout;

  // ---------- camera ----------
  function phraseBox(s) {
    const S = s.St, ls = s.letters.filter(l => l.ch !== ' ');
    let x0 = Infinity, x1 = -Infinity, base = 0;
    for (const l of ls) { const hw = s.mw(l.ch) * S / 2; x0 = Math.min(x0, l.x - hw); x1 = Math.max(x1, l.x + hw); base = l.y; }
    return { x0, x1, w: x1 - x0, cx: (x0 + x1) / 2, base };
  }
  // Where in the garden a key points, as a function of the key's own film frame.
  function anchorXY(k, steps) {
    const s = M.S, c = M.cue, at = k.at || 'wide';
    let x, y;
    if (at === 'wide') { x = M.wide.x; y = M.wide.y; }
    else if (at === 'hero') { const h = s.anchors[c.id] || c.hero; x = h.x; y = h.y; }
    else if (at === 'hit') { x = c.impact.x; y = c.impact.y; }
    else if (at === 'bead') { x = c.track[0].x; y = c.track[0].y; }
    else if (at === 'drop') {
      const tau = steps ? steps(k.f) * M.dt : c.release, tr = c.track;
      let i = 0; while (i < tr.length - 1 && tr[i + 1].t <= tau) i++;
      x = tr[i].x; y = tr[i].y;
    }
    else if (at.startsWith('letter:')) { const l = s.letters.find(l => l.ch === at.slice(7)); x = l.x; y = l.y; }
    else if (at === 'phrase') { const p = phraseBox(s); x = p.cx; y = p.base - 0.62 * s.St; }
    else if (at === 'handoff') { x = M.handoff.x; y = M.handoff.y; }
    return [x + (k.dx || 0), y + (k.dy || 0)];
  }
  function spanOf(k) {
    const s = M.S, c = M.cue;
    if (k.at === 'handoff') return M.handoff.span;
    if (k.span) return k.span;
    if (k.spanR) return k.spanR * (s.anchors[c.id] || c.hero).R;
    if (k.spanK) return k.spanK * M.wide.span;
    if (k.spanP) { const p = phraseBox(s); return p.w / (0.72 * W / H) * k.spanP; }
    return M.wide.span;
  }
  function camPath(keys, steps) {
    const ks = keys.map(k => { const [x, y] = anchorXY(k, steps); return { f: k.f, x, y, ls: Math.log(spanOf(k)), roll: k.roll || 0, whip: k.whip || 0 }; });
    const px = pchip(ks.map(k => [k.f, k.x])), py = pchip(ks.map(k => [k.f, k.y])), pl = pchip(ks.map(k => [k.f, k.ls])),
      pr = pchip(ks.map(k => [k.f, k.roll])), pw = pchip(ks.map(k => [k.f, k.whip]));
    const f0 = ks[0].f;
    return f => { f = Math.max(f, f0); const span = Math.exp(pl(f)); return { x: px(f) + pw(f) * span * W / H, y: py(f), span, roll: pr(f) }; };
  }
  M.camPath = camPath;

  function setCam(g, cam) {
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    g.save(); g.translate(W / 2, H / 2); g.rotate((cam.roll || 0) * Math.PI / 180);
    g.scale(H / cam.span, H / cam.span); g.translate(-cam.x, -cam.y);
  }
  const toScreen = (cam, x, y) => {
    const k = H / cam.span, r = (cam.roll || 0) * Math.PI / 180, dx = (x - cam.x) * k, dy = (y - cam.y) * k;
    return [W / 2 + dx * Math.cos(r) - dy * Math.sin(r), H / 2 + dx * Math.sin(r) + dy * Math.cos(r)];
  };

  // One real render of the stage into canvas g through a camera.
  function renderStage(g, cam, o) {
    const s = M.S;
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    g.fillStyle = s.theme().bg; g.fillRect(0, 0, W, H);
    setCam(g, cam);
    const B = s.backend(g); s._fr = { f: 1, x: 540, y: 540 };
    s.stageRender(B, o.now, o.st);
    if (o.after) o.after(B);
    g.restore();
  }

  // ---------- live look switching (a real native recolour, never a rebuild) ----------
  let lookNow = null;
  const useLook = id => { if (lookNow !== id) { a.setLook(id); lookNow = id; } };

  // ---------- breathing sway: native Breathe warp, its clock and amplitude eased by film time ----------
  function swayAt(f) {
    const rate = M.swayRate;
    let acc = 0; for (let j = M.swayFrom; j < f; j++) acc += rate(j);
    return { t: acc * 1000 / M.motion.fps, amp: rate(f) };
  }
  function swayStyle(f, now) {
    const s = M.S, S = s.St, { t, amp } = swayAt(f), ph = t / 8000 * Math.PI * 2;
    s._swayT = t;
    const st = {
      warp: (x, y, l) => {
        const hh = Math.max(0, (l.y - y) / S), w = ph + l.id * 0.37;
        return [x + (Math.sin(w) * 0.8 + Math.sin(2 * ph + l.id * 0.91) * 0.2) * S * 0.034 * hh * amp, y + Math.cos(2 * ph + l.id * 0.53) * S * 0.008 * hh * amp];
      },
      rotw: e => Math.sin(ph + e.id * 0.7) * 0.06 * amp
    };
    return st;
  }

  // ---------- petal storm: the application's own out-of-focus petals, thrown across the lens ----------
  function storm(g, f, spec) {
    const s = M.S, rng = (() => { let x = spec.seed * 2654435761 >>> 0; return () => { x = (Math.imul(x ^ (x >>> 15), 2246822507) + 0x9e3779b9) >>> 0; return x / 4294967296; }; })();
    const sp = spec.sharp ? null : s.dofSprite('fg', s.St), N = spec.n || 9, p = (f - spec.f0) / (spec.f1 - spec.f0);
    if (p <= 0 || p >= 1) return;
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    for (let i = 0; i < N; i++) {
      const delay = rng() * 0.28, life = 0.62 + rng() * 0.1, q = clamp((p - delay) / life);
      const x0 = -200 - rng() * 140, y0 = H * (0.2 + rng() * 0.9), x1 = W + 220, y1 = H * (rng() * 0.8 - 0.15);
      const e = eio(q), size = 9 + rng() * 9, rot0 = rng() * 6.28, spin = (rng() - 0.5) * 5, flip = rng() * 6.28, fs = 2 + rng() * 3;
      if (q <= 0 || q >= 1) continue;
      g.globalAlpha = Math.min(1, 0.96 * Math.min(q / 0.12, (1 - q) / 0.12, 1));
      g.translate(lerp(x0, x1, e), lerp(y0, y1, e) + Math.sin(q * 6 + i) * 30); g.rotate(rot0 + spin * q);
      if (spec.sharp) {
        s.drawPetal(s.backend(g), {x:0,y:0,s:(spec.petalSize || 100)*(0.7+rng()*0.5),t:q,sw:2,ph:i,rot:0,flip:flip+fs*q},1);
      } else {
        g.scale(size * Math.max(0.3, Math.abs(Math.cos(flip + fs * q))), size);
        g.drawImage(sp.cv, -sp.w / 2, -sp.h / 2);
      }
      g.setTransform(1, 0, 0, 1, 0, 0);
    }
    if (spec.heroPetal) {
      // A recognizable native petal crosses the center; its edges never become a colour card.
      const q = clamp((f - (spec.cut - 6)) / 18);
      if (q > 0 && q < 1) {
        s.drawPetal(s.backend(g), {x:lerp(-280,W+280,smooth(q)),y:H*0.49,s:430,t:q,sw:1.5,ph:0,rot:-0.18+q*0.45,flip:0.3+q*0.35},1);
      }
    }
    g.restore();
  }

  // ---------- compositing two real renders ----------
  function blend(mask, tint, g) {
    const A = gA.getImageData(0, 0, W, H), B = gB.getImageData(0, 0, W, H), o = gW.createImageData(W, H), d = o.data, da = A.data, db = B.data;
    for (let i = 0, p = 0; i < W * H; i++, p += 4) {
      const m = mask(i % W, (i / W) | 0, i);
      let r = da[p] + (db[p] - da[p]) * m, gg = da[p + 1] + (db[p + 1] - da[p + 1]) * m, b = da[p + 2] + (db[p + 2] - da[p + 2]) * m;
      if (tint) { const e = tint(m); if (e > 0) { r = r + (tint.r - r) * e; gg = gg + (tint.g - gg) * e; b = b + (tint.b - b) * e; } }
      d[p] = r; d[p + 1] = gg; d[p + 2] = b; d[p + 3] = 255;
    }
    g.putImageData(o, 0, 0);
  }

  // ---------- frame assembly with optional motion blur ----------
  M.drivers = {};
  M.frame = f => {
    const drv = M.driver;
    const c0 = drv.cam ? drv.cam(f - 0.5) : null, c1 = drv.cam ? drv.cam(f + 0.5) : null;
    let n = 1;
    if (c0) {
      const px = Math.hypot(c1.x - c0.x, c1.y - c0.y) * (H / c1.span) + Math.abs(Math.log(c1.span / c0.span)) * W * 0.16 + Math.abs(c1.roll - c0.roll) * 4;
      if (px > 3) n = Math.min(26, Math.ceil(px * 0.5 / 1.5) + 1);
    }
    drv.prepare(f);
    if (n === 1) { drv.draw(f, f, gOut); drv.after?.(f, gOut); }
    else {
      const acc = new Float32Array(W * H * 3);
      for (let j = 0; j < n; j++) {
        const sub = f + (j / (n - 1) - 0.5) * 0.5;
        drv.draw(f, sub, gW);
        const im = gW.getImageData(0, 0, W, H).data;
        for (let i = 0, q = 0; i < W * H; i++, q += 3) { const p = i * 4; acc[q] += im[p]; acc[q + 1] += im[p + 1]; acc[q + 2] += im[p + 2]; }
      }
      const o = gOut.createImageData(W, H), d = o.data;
      for (let i = 0, q = 0; i < W * H; i++, q += 3) { const p = i * 4; d[p] = acc[q] / n; d[p + 1] = acc[q + 1] / n; d[p + 2] = acc[q + 2] / n; d[p + 3] = 255; }
      gOut.putImageData(o, 0, 0);
      drv.after?.(f, gOut);
    }
    return M.out.toDataURL('image/png');
  };

  const cue = (name, f, extra) => { if (!M.cues.some(c => c.name === name && c.f === f)) M.cues.push({ name, f, ...extra }); };
  M.cue_ = cue;

  // =========================================================================================
  // Driver: stage with a retimed native bite simulation (beauty, encounter and Looks share it)
  // =========================================================================================
  M.drivers.encounter = async (def, motion) => {
    await build(def.stage || {}); scout();
    const s = M.S, m = M.mot, c = M.cue;
    M.swayRate = pchip(motion.paths.swayRate.map(k => [k[0], k[1]])); M.swayFrom = 0;
    const steps = pchip(def.steps, false);
    const stepAt = f => Math.max(0, steps(f));
    // Anchors derive from the same stage in every worker, so the shared camera path is the same everywhere.
    M.handoff = M.handoff || handoffCam();
    const encSteps = pchip(motion.segments.find(x => x.id === 'encounter').steps, false);
    const cam = camPath(motion.paths[def.path], encSteps);
    const looks = def.looks, trans = def.transitions || [];
    const lookAt = f => { let cur = looks ? looks[0].look : 'crimson'; if (looks) for (const l of looks) if (f >= l.from) cur = l.look; return cur; };
    // Pre-roll the simulation to the first frame, then it only ever steps forward.
    let seen = { bit: false, bead: false, fall: false, stains: 0, runoff: false };
    const driver = {
      cam,
      prepare(f) {
        const k = Math.floor(stepAt(f) + 1e-6);
        // Track native events by the film frame on which they first appear.
        s.stageSeek(m, k * M.dt);
        if (s.sim.bit && !seen.bit) { seen.bit = true; cue('bite', f); }
        const d = s.drops.find(d => String(d.id) === c.id && d.st !== 'spray');
        if (d && !seen.bead) { seen.bead = true; cue('bead', f); }
        if (d && d.st === 'fall' && !seen.fall) { seen.fall = true; cue('release', f); }
        if (s.stains.length > seen.stains) { for (let i = seen.stains; i < s.stains.length; i++) cue(i === 0 ? 'impact' : 'drip', f, { n: i + 1 }); seen.stains = s.stains.length; }
        this.k = k;
      },
      render(g, camF, look, f) {
        useLook(look);
        const tau = this.k * M.dt, now = s.POSTER.t0 + tau * m.clock;
        s.stageAges(now, () => s.POSTER.age);
        const st = { bloomAge: () => 5900, bloodFade: 1, ...swayStyle(f, now) };
        let after = null;
        const pet = def.petals, u = tau / m.T;
        const showBfly = def.butterfly && f >= def.butterfly[0] && f <= def.butterfly[1];
        after = B => {
          if (pet && f >= pet.f0 - 2) {
            const ga = Math.min(1, (f - pet.f0) / pet.fadeIn, (pet.f1 - f) / pet.fadeOut + 0), uu = pet.u0 + (f - pet.f0) / (12 * motion.fps);
            if (ga > 0) { const g2 = B.ctx; g2.save(); g2.globalAlpha = clamp(ga); s.stagePetals(B, uu, 12, Math.max(0.5, s.St / 200)); g2.restore(); }
          }
          if (showBfly) { const b = s.bfly(u, m); if (b) { s.stageHalo(B, b.x, b.y, b.s * 2.8); s.butterflyNoir(B, b.x, b.y, b.s, b.ang, b.open, b.perched); } }
          if (this.gust) { const g2 = B.ctx; g2.save(); s.stageBlownPetals(B, this.gust.u, 9, Math.max(0.5, s.St / 200)); g2.restore(); }
        };
        if (this.gust) { const gu = this.gust.u, S = s.St, ease = x => smooth(x), strength = ease((gu - 0.04) / 0.1) * (1 - ease((gu - 0.7) / 0.12)); const front = s.gustFront(gu);
          const wind = x => { const d = (x - front) / (S * 1.6); return strength * Math.exp(-d * d * 1.1); };
          st.warp = (x, y, l) => s.gustWarp(x, y, l, wind(x), Math.sin(gu * Math.PI * 2 * 9 + l.id * 1.3 + y * 0.02) * 0.2, Math.cos(gu * Math.PI * 2 * 7 + l.id));
          st.rotw = e => Math.sin(gu * Math.PI * 2 + e.id) * 0.04; }
        renderStage(g, cam(camF), { now, st, after });
      },
      draw(f, camF, g) {
        this.gust = null;
        const look = lookAt(f), tr = trans.find(t => f >= (t.f0 ?? t.center - t.half) && f <= (t.f1 ?? t.center + t.half));
        const before = t => lookAt((t.f0 ?? t.center - t.half) - 1), after = t => lookAt((t.f1 ?? t.center + t.half) + 1);
        const wipe = def.wipe && f >= def.wipe.f0 ? def.wipe : null;
        if (wipe && f <= wipe.f1) {
          // Encounter -> first world: the blood's own contour carries the cut.
          const p = (f - wipe.f0) / (wipe.f1 - wipe.f0), cm = cam(camF);
          this.render(gA, camF, 'crimson', f); this.render(gB, camF, wipe.to, f);
          const [ox, oy] = toScreen(cam(f), c.impact.x, c.impact.y), far = Math.hypot(Math.max(ox, W - ox), Math.max(oy, H - oy)) * 1.35, R = far * eo(p);
          const edge = 26, br = 112, bg = 9, bb = 24;
          const maskFn = (x, y, i) => { const d = Math.hypot(x - ox, y - oy) * (1 + (noise[i] - 0.5) * 0.5) + (noise[i] - 0.5) * 40; return smooth((R - d) / edge); };
          const tf = m_ => 4 * m_ * (1 - m_) * 0.9; tf.r = br; tf.g = bg; tf.b = bb;
          blend(maskFn, tf, g); lookNow = null; return;
        }
        if (tr && tr.type === 'wind') {
          const pu = (f - tr.f0) / (tr.f1 - tr.f0), gu = lerp(tr.u0, tr.u1, pu);
          const from = before(tr), to = after(tr);
          this.gust = { u: gu };
          this.render(gA, camF, from, f); this.render(gB, camF, to, f);
          const front = s.gustFront(gu), cm = cam(camF), [fx] = toScreen(cm, front, M.wide.y), edge = 70;
          const maskFn = (x, y, i) => smooth((fx - x + (y - H / 2) * 0.22 + (noise[i] - 0.5) * 90) / edge);
          blend(maskFn, null, g); lookNow = null; return;
        }
        if (tr && tr.type === 'iris') {
          const pu = (f - tr.f0) / (tr.f1 - tr.f0), cm = cam(camF);
          const from = before(tr), to = after(tr);
          this.render(gA, camF, from, f); this.render(gB, camF, to, f);
          const hh = s.anchors[c.id] || c.hero, [ox, oy] = toScreen(cm, hh.x, hh.y), far = Math.hypot(Math.max(ox, W - ox), Math.max(oy, H - oy)) * 1.2, R = far * eio(pu);
          const maskFn = (x, y, i) => { const th = Math.atan2(y - oy, x - ox), lobe = 1 + 0.17 * Math.cos(5 * th + 0.4) + 0.05 * Math.cos(10 * th + 1.3) + (noise[i] - 0.5) * 0.06; return smooth((R * lobe - Math.hypot(x - ox, y - oy)) / 7); };
          blend(maskFn, null, g); lookNow = null; return;
        }
        if (tr && (tr.type === 'push' || tr.type === 'match')) {
          const from = before(tr), to = after(tr), q = smooth((f - (tr.center - tr.half)) / (2 * tr.half));
          this.render(gA, camF, from, f); this.render(gB, camF, to, f);
          blend(() => q, null, g); lookNow = null; return;
        }
        if (tr && tr.type === 'petals') {
          const cut = f >= tr.center, side = cut ? after(tr) : before(tr);
          this.render(g, camF, side, f);
          const gg = g; storm(gg, f, tr);
          // a dark veil under the petals at the cut hides the colour jump
          const peak = 1 - Math.min(1, Math.abs(f - tr.center) / 5);
          if (peak > 0) { gg.save(); gg.setTransform(1, 0, 0, 1, 0, 0); gg.fillStyle = `rgba(14,3,8,${(tr.veil ?? 0.55) * peak})`; gg.fillRect(0, 0, W, H); gg.restore(); }
          return;
        }
        this.render(g, camF, look, f);
      }
    };
    M.driver = driver;
    // the petal wipe needs the application's own petal sprite in the right look; warm it once per look
    return driver;
  };

  // The camera at the end of the live opening, matched letter for letter so the stage takes over invisibly.
  function handoffCam() {
    const s = M.S, st = M.motion.openCam, kEnd = st.kEnd;
    const live = M.liveLayout || (M.liveLayout = liveLayout());
    const crop = { w: 1080 / kEnd, h: 607.5 / kEnd }; crop.x = 540 - crop.w / 2; crop.y = 495 - crop.h / 2;
    const sx = W / crop.w;
    const li = live.letters.find(l => l.ch === 'i'), lm = live.letters.filter(l => l.ch === 'm').at(-1);
    const si = s.letters.find(l => l.ch === 'i'), sm = s.letters.filter(l => l.ch === 'm').at(-1);
    const pxPer = (lm.tx - li.tx) * sx / (sm.x - si.x), span = H / pxPer;
    const lb = live.letters.find(l => l.ch === 'b'), sb = s.letters.find(l => l.ch === 'b');
    const pbx = (lb.tx - crop.x) * sx, pby = (lb.ty - crop.y) * sx;
    return { x: sb.x - (pbx - W / 2) / pxPer, y: sb.y - (pby - H / 2) / pxPer, span };
  }
  M.handoffCam = handoffCam;

  // The live Type view's layout for the typed phrase (no growth simulation): letter targets and size.
  function liveLayout() {
    const base = 90000; window.__filmClock = base;
    const stageSave = a.stage;
    a.setMode('type'); a.state.busy = false; a.clearText(); a.fill = 0.62; a.layout(true);
    const keys = [['i', 120], ['n', 200], [' ', 280], ['b', 360], ['l', 440], ['o', 520], ['o', 600], ['m', 680]];
    for (const [ch, t] of keys) { const now = base + t; a.lastKey = now; a.add(ch, now, a.keyEvent(now)); }
    a.layout(true);
    const out = { St: a.St, Sd: a.Sd, letters: a.letters.filter(l => !l.dead && l.ch !== ' ').map(l => ({ ch: l.ch, tx: l.tx, ty: l.ty })) };
    a.clearText();
    return out;
  }
  M.liveLayout = null;

  // =========================================================================================
  // Driver: the live Type view (the opening). Forward-only: native time advances by 1/60 s steps.
  // =========================================================================================
  M.drivers.opening = async (def, motion, extra) => {
    const oc = motion.openCam, base = 210000;
    const plate = new Image(); plate.src = extra.plate; await plate.decode();
    window.__filmClock = base;
    a.setMode('type'); a.setLook('crimson'); a.state.busy = false;
    a.clearText(); a.fill = 0.62; a.layout(true);
    a.flies = []; a.stains = []; a.drops = []; a.bites = {}; a.petalFall = [];
    a.dof = []; a._dofSeeded = false; a._glow = null; a._cuts = {};
    a._keyAt = null; a._sproutFor = null; a._pace = null; a._openBloom = null;
    a._visitAt = null; a._pfT = base; a.lt = base - 1000 / 60;
    a.t0 = base - 1000; a.lastKey = base; a.mx = a.my = null;
    a.paint(base, true);
    const keys = oc.keys, keyF = oc.keyFrames;
    // film frame -> native ms (typing plays slowly enough to read; growth then accelerates)
    const nm = pchip(oc.native.map(k => [k[0], k[1]]), false);
    const camK = pchip(oc.zoom.map(k => [k[0], k[1]]), false);
    const st = { ms: 0, next: 0 }, held = [];
    const stepTo = target => {
      const step = 1000 / 60;
      while (st.ms < target - 1e-7) {
        const nextMs = Math.min(target, st.ms + step, keys[st.next]?.[1] ?? Infinity);
        st.ms = nextMs; window.__filmClock = base + nextMs;
        while (st.next < keys.length && keys[st.next][1] <= nextMs + 1e-7) {
          const [ch, t] = keys[st.next++], now = base + t; a.lastKey = now; a.add(ch, now, a.keyEvent(now));
        }
        a._visitAt = base + 90000; a.frame();
      }
    };
    const liveInto = (g, f) => {
      stepTo(Math.max(0, nm(f)));
      a.paint(window.__filmClock, st.ms <= 1100);
      const k = clamp(camK(f), 1, 3), cw = 1080 / k, ch = 607.5 / k, cx = 540 - cw / 2, cy = 495 - ch / 2;
      g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1;
      g.drawImage(a.cv, cx * a.dpr, cy * a.dpr, cw * a.dpr, ch * a.dpr, 0, 0, W, H);
    };
    M.openKeyFrames = keyF;
    const driver = {
      cam: null,
      prepare() {},
      live: liveInto,
      draw(f, _c, g) {
        g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
        const p0 = oc.plate;
        if (f < p0.dissolve[1]) liveInto(g, f); else liveInto(g, f);
        if (f < p0.dissolve[1]) {
          // The real application, with its own controls, pushes past the lens into the canvas.
          const q = clamp((f - p0.hold) / (p0.dissolve[1] - p0.hold)), z = lerp(1, p0.zoom, eio(q)), al = 1 - smooth((f - p0.dissolve[0]) / (p0.dissolve[1] - p0.dissolve[0]));
          const sw = 1080 / z, sh = 608 / z;
          g.save(); g.globalAlpha = clamp(al); g.drawImage(plate, 540 - sw / 2, 304 - sh / 2, sw, sh, 0, 0, W, H); g.restore();
        }
      }
    };
    M.driver = driver;
    // The last live frames are held aside so they can be dissolved into the stage.
    M.holdLive = f => { liveInto(gB, f); held[f] = gB.getImageData(0, 0, W, H); };
    M.liveHeld = held;
    return driver;
  };

  // Stage frames dissolved over the held live frames [from, end): the matched handoff.
  M.openBlend = async (def, motion) => {
    const d = await M.drivers.encounter({ ...motion.segments.find(s => s.id === 'beauty') }, motion);
    const out = [];
    for (let f = def.blendFrom; f < def.end; f++) {
      d.prepare(f); d.draw(f, f, gA);
      const live = M.liveHeld[f], stg = gA.getImageData(0, 0, W, H), o = gOut.createImageData(W, H), q = smooth((f - def.blendFrom + 1) / (def.end - def.blendFrom + 1));
      for (let i = 0; i < live.data.length; i += 4) { for (let k = 0; k < 3; k++) o.data[i + k] = live.data[i + k] + (stg.data[i + k] - live.data[i + k]) * q; o.data[i + 3] = 255; }
      gOut.putImageData(o, 0, 0); out.push(M.out.toDataURL('image/png'));
    }
    return out;
  };

  // The application's own gust, parameterised by its loop position, as render options.
  function gustStyle(s, gu, st) {
    const S = s.St, strength = smooth((gu - 0.04) / 0.1) * (1 - smooth((gu - 0.7) / 0.12)), front = s.gustFront(gu);
    const wind = x => { const d = (x - front) / (S * 1.6); return strength * Math.exp(-d * d * 1.1); };
    st.warp = (x, y, l) => s.gustWarp(x, y, l, wind(x), Math.sin(gu * Math.PI * 2 * 9 + l.id * 1.3 + y * 0.02) * 0.2, Math.cos(gu * Math.PI * 2 * 7 + l.id));
    st.rotw = e => Math.sin(gu * Math.PI * 2 + e.id) * 0.04;
    return st;
  }
  const veil = (g, alpha) => { if (alpha <= 0) return; g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = 'rgba(12,2,7,' + alpha.toFixed(3) + ')'; g.fillRect(0, 0, W, H); g.restore(); };
  const fadeTo = (f, a0, a1) => smooth((f - a0) / (a1 - a0));

  // =========================================================================================
  // Driver: a fresh stage in one typeface (and optionally a custom palette), phrase-matched
  // =========================================================================================
  M.drivers.font = async (def, motion) => {
    await build(def.stage || {}); scout();
    const s = M.S, appearance = { ...a.appearance };
    M.swayRate = pchip(motion.paths.swayRate); M.swayFrom = 0;
    const cam = camPath(motion.paths[def.path], null);
    M.driver = {
      cam, prepare() {},
      draw(f, camF, g) {
        const now = s.POSTER.t0 + f * 1000 / motion.fps;
        s.stageAges(now, () => s.POSTER.age);
        const opts = { now, st: { bloomAge: () => 5900, bloodFade: 1, ...swayStyle(f, now) } };
        const bridge = def.paletteBridge;
        if (bridge && f >= bridge.f0) {
          a.setAppearance(appearance); renderStage(gA, cam(camF), opts);
          a.setAppearance(a.LOOKS.find(l => l.id === bridge.to).appearance); renderStage(gB, cam(camF), opts);
          blend(() => smooth((f - bridge.f0) / (bridge.f1 - bridge.f0)), null, g);
          a.setAppearance(appearance);
        } else renderStage(g, cam(camF), opts);
      }
    };
  };

  // =========================================================================================
  // Driver: one fresh native encounter on one surface, from the drop's arrival to its fate
  // =========================================================================================
  M.drivers.material = async (def, motion) => {
    await build(def.stage || {}); scout();
    const s = M.S, m = M.mot, c = M.cue, impactStep = Math.round(c.impact.t / M.dt);
    M.swayRate = pchip(motion.paths.swayRate); M.swayFrom = 0;
    const mc = motion.material, rel = pchip((def.steps || mc.steps).map(k => [k[0], k[1]]), false);
    const first = def.start;
    const keys = (def.cam || mc.cam).map(k => ({ ...k, f: first + k.f }));
    const cam = camPath(keys, null);
    const seen = { stains: 0, runoff: false, soak: false };
    M.driver = {
      cam,
      prepare(f) {
        const k = impactStep + Math.floor(rel(f - first) + 1e-6);
        const detect = () => {
          if (s.stains.length > seen.stains) { cue(seen.stains === 0 ? 'impact' : 'stain', f, { n: s.stains.length }); seen.stains = s.stains.length; }
          for (const d of s.drops) if (d.st === 'fall' && d.id == null && !seen.runoff) { seen.runoff = true; cue('runoff', f); }
          if (!seen.soak && s.letters.some(l => l._soak)) { seen.soak = true; cue('soak', f); }
        };
        // Step in small chunks so a native event inside a long time-lapse step is still seen on the frame it first shows.
        if (this.k !== undefined) for (let kk = this.k + 3; kk < k; kk += 3) { s.stageSeek(m, kk * M.dt); detect(); }
        s.stageSeek(m, k * M.dt); this.k = k; detect();
      },
      draw(f, camF, g) {
        const tau = this.k * M.dt, now = s.POSTER.t0 + tau * m.clock;
        s.stageAges(now, () => s.POSTER.age);
        renderStage(g, cam(camF), { now, st: { bloomAge: () => 5900, bloodFade: 1, ...swayStyle(f, now) } });
      }
    };
  };

  // =========================================================================================
  // Driver: botanical escalation. Built at the lush end (so everything exists), settled to the
  // sparse end, then the native botanical values are dragged up as a visitor's slider would.
  // =========================================================================================
  M.drivers.botanical = async (def, motion) => {
    const bt = motion.botanical;
    await build({ botanical: bt.lush }); scout();
    const s = M.S;
    M.swayRate = pchip(motion.paths.swayRate); M.swayFrom = 0;
    const cam = camPath(motion.paths.botanical, null), ramp = pchip(bt.ramp.map(k => [k[0], k[1]]), false);
    const apply = v => {
      const patch = {}; for (const k in bt.lush) patch[k] = lerp(bt.sparse[k], bt.lush[k], v);
      s.beforeBotanical(); a.setAppearance({ botanical: patch }); s.afterBotanical();
      for (const l of s.letters) if (l.els) l._easeUntil = Infinity;
    };
    s._bk = 1; apply(0);
    const warm = s.POSTER.t0;
    for (let i = 0; i < 3; i++) renderStage(gW, cam(def.start), { now: warm, st: { bloomAge: () => 5900, bloodFade: 1 } });
    s._bk = bt.ease; let lastV = -1;
    M.driver = {
      cam,
      prepare(f) { const v = clamp(ramp(f)); if (Math.abs(v - lastV) > 1e-4) { apply(v); lastV = v; } },
      draw(f, camF, g) {
        const now = s.POSTER.t0 + f * 1000 / motion.fps;
        s.stageAges(now, () => s.POSTER.age);
        let st = { bloomAge: () => 5900, bloodFade: 1, ...swayStyle(f, now) }, after = null;
        const gp = bt.gust, gu = gp && f >= gp.f0 ? lerp(gp.u0, gp.u1, clamp((f - gp.f0) / (gp.f1 - gp.f0))) : null;
        if (gu !== null) { st = gustStyle(s, gu, st); after = B => { const g2 = B.ctx; g2.save(); s.stageBlownPetals(B, gu, 9, Math.max(0.5, s.St / 200)); g2.restore(); }; }
        renderStage(g, cam(camF), { now, st, after });
        const sv = bt.storm; storm(g, f, sv);
      }
    };
  };

  // =========================================================================================
  // Driver: the planted ROSE GARDEN. The garden arrives (growth and bloom), then holds quietly.
  // =========================================================================================
  M.drivers.identity = async (def, motion) => {
    const id = motion.identity;
    // Carry the actual outgoing garden under the same petal storm; never clear to a field.
    const botanical = motion.segments.find(x => x.id === 'botanical');
    await M.drivers.botanical(botanical, motion);
    const outgoing = mk(), og = outgoing.getContext('2d');
    for (let f = botanical.start; f <= botanical.end; f++) { M.driver.prepare(f); M.driver.draw(f, f, og); }
    await build({ ...(def.stage || {}), botanical: id.botanical });
    const s = M.S;
    M.swayRate = pchip(motion.paths.swayRate); M.swayFrom = 0;
    const cam = camPath(motion.paths.identity, null);
    const grow = pchip(id.grow.map(k => [k[0], k[1]]), false), bloom = pchip(id.bloom.map(k => [k[0], k[1]]), false);
    const n = s.letters.filter(l => l.ch !== ' ' && l.els).length;
    M.driver = {
      cam, prepare() {},
      draw(f, camF, g) {
        const now = s.POSTER.t0 + f * 1000 / motion.fps, gv = clamp(grow(f)), bv = clamp(bloom(f));
        s.stageAges(now, (l, i) => s.POSTER.age * clamp(gv * (1 + id.stagger * n) - id.stagger * i));
        renderStage(g, cam(camF), { now, st: { bloomAge: () => 1500 + 4400 * bv, bloodFade: 1, ...swayStyle(f, now) } });
        if (f < id.carryUntil) {
          g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
          g.globalAlpha = 1 - fadeTo(f, def.start, id.carryUntil);
          g.drawImage(outgoing, 0, 0); g.restore();
        }
        const sv = id.storm; storm(g, f, sv);
      },
      after(f, g) {
        // The credit is secondary: small, low in contrast, and only after the name has fully arrived.
        const q = fadeTo(f, id.credit.f0, id.credit.f1);
        if (q <= 0) return;
        g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.textAlign = 'center'; g.fillStyle = 'rgba(205,188,194,' + (id.credit.alpha * q).toFixed(3) + ')';
        g.font = id.credit.px + 'px Georgia, serif'; if ('letterSpacing' in g) g.letterSpacing = '0.6px';
        motion.credits.forEach((line, i) => g.fillText(line, W / 2, H - id.credit.bottom + i * id.credit.leading));
        g.restore();
      }
    };
  };

  M.begin = async (def, motion, extra = {}) => {
    M.motion = motion; M.def = def; M.cues = []; lookNow = null;
    await document.fonts.ready;
    if (!M.liveLayout) M.liveLayout = liveLayout();
    const drv = M.drivers[def.driver];
    if (!drv) throw Error('Unknown driver ' + def.driver);
    await drv(def, motion, extra);
    return true;
  };
  M.ready = true;
})();
