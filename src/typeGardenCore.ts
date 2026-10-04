// Type Garden Core Logic - Reusable and unit-testable engine components

export interface Palette {
  name: string;
  bg: string;
  flower: string;
  stem: string;
  line: string;
  text: string;
  vein: string;
}

export interface Preset {
  id: string;
  label: string;
  sub: string;
  T: number;
}

export const PRESETS: Preset[] = [
  { id: 'breathe', label: 'Breathe', sub: 'Slow sway · 3s', T: 3000 },
  { id: 'grow', label: 'Grow & wither', sub: 'Bloom, then back · 6s', T: 6000 },
  { id: 'typed', label: 'Typed', sub: 'Type, cut, repeat · 5s', T: 5000 },
  { id: 'wind', label: 'Gust', sub: 'Wind sweeps through · 4s', T: 4000 },
  { id: 'reach', label: 'Reach', sub: 'Stems follow a light · 6s', T: 6000 },
  { id: 'scatter', label: 'Scatter', sub: 'Random bloom, fade · 6s', T: 6000 },
  { id: 'visit', label: 'Visitor', sub: 'Butterfly drops by · 7s', T: 7000 }
];

export const RAW_PALETTES: [string, string, string, string, string, string][] = [
  ['Rose noir', '#000000', '#FF1400', '#3257FF', '#FFB4A8', '#FFFFFF'],
  ['Paper', '#F3EEE4', '#FF3B1F', '#1C2B8F', '#FFD2C4', '#111111'],
  ['Midnight', '#0D1B4C', '#FF5A4E', '#9FB4FF', '#FFD6CF', '#FFFFFF'],
  ['Citrus', '#0E1A12', '#FF8A00', '#1FA463', '#FFE2B8', '#FFF6E8'],
  ['Orchid', '#140A1F', '#E63CFF', '#2FB8A6', '#F9D1FF', '#FFFFFF'],
  ['Moss', '#133A2A', '#FFB7C5', '#7FD18B', '#FFFFFF', '#F6F1E7'],
  ['Tomato', '#FF1400', '#FFF1E0', '#0B0B0B', '#FF1400', '#000000'],
  ['Butter', '#FFE9A8', '#E4002B', '#0F5132', '#FFC2C2', '#1A1A1A'],
  ['Blush', '#FAD4D8', '#C8102E', '#274690', '#FFE3E6', '#1A1A1A'],
  ['Mono', '#000000', '#F2F2F2', '#6E6E6E', '#000000', '#FFFFFF']
];

export function getPalette(index: number): Palette {
  const p = RAW_PALETTES[index] || RAW_PALETTES[0];
  return {
    name: p[0],
    bg: p[1],
    flower: p[2],
    stem: p[3],
    line: p[4],
    text: p[5],
    vein: p[1]
  };
}

// Math helpers
export function h(n: number): number {
  const x = Math.sin(n) * 43758.5453;
  return x - Math.floor(x);
}

export function spr(t: number, k = 7, w = 16): number {
  if (t <= 0) return 0;
  return 1 - Math.exp(-t * k) * Math.cos(t * w);
}

export function eo(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return 1 - Math.pow(1 - t, 3);
}

export function eb(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

export function rng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function bez(a: [number, number], b: [number, number], c: [number, number], d: [number, number], n: number): [number, number][] {
  const P: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    P.push([
      u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0],
      u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1]
    ]);
  }
  return P;
}

export function at(P: [number, number][], u: number): [[number, number], number] {
  const n = P.length;
  const i = Math.min(n - 2, Math.max(1, Math.round(u * (n - 1))));
  return [P[i], Math.atan2(P[i + 1][1] - P[i - 1][1], P[i + 1][0] - P[i - 1][0])];
}

export function vine(
  base: [number, number],
  dir: number,
  len: number,
  amp: number,
  waves: number,
  ph: number,
  bend: number,
  n = 40
): [number, number][] {
  const P: [number, number][] = [[base[0], base[1]]];
  const step = len / n;
  let x = base[0], y = base[1];
  for (let i = 1; i <= n; i++) {
    const u = i / n;
    const a = dir + bend * u + amp * Math.sin(u * Math.PI * waves + ph) * Math.min(1, u * 3);
    x += Math.cos(a) * step;
    y += Math.sin(a) * step;
    P.push([x, y]);
  }
  return P;
}

export function curl(P: [number, number][], sign: number, rad: number): [number, number][] {
  const n = P.length, e = P[n - 1];
  const a = Math.atan2(e[1] - P[n - 2][1], e[0] - P[n - 2][0]);
  const c: [number, number] = [e[0] - Math.sin(a) * sign * rad, e[1] + Math.cos(a) * sign * rad];
  const a0 = Math.atan2(e[1] - c[1], e[0] - c[0]);
  for (let i = 1; i <= 14; i++) {
    const u = i / 14, t = a0 + sign * u * Math.PI * 1.6, rr = rad * (1 - 0.5 * u);
    P.push([c[0] + Math.cos(t) * rr, c[1] + Math.sin(t) * rr]);
  }
  return P;
}

export interface WeaveSegment {
  u0: number;
  u1: number;
  layer: number;
}

export function weave(r: () => number, startLayer: number): WeaveSegment[] {
  const cuts: number[] = [];
  const nc = 1 + Math.floor(r() * 3);
  for (let i = 0; i < nc; i++) cuts.push(0.15 + r() * 0.7);
  cuts.sort((a, b) => a - b);
  const segs: WeaveSegment[] = [];
  let u0 = 0, layer = startLayer;
  for (const c of cuts) {
    if (c <= u0) continue;
    segs.push({ u0, u1: c, layer });
    if (r() < 0.3) {
      const g = 0.02 + r() * 0.03;
      u0 = Math.min(0.98, c + g);
    } else {
      u0 = c;
    }
    layer = 1 - layer;
  }
  segs.push({ u0, u1: 1, layer });
  return segs;
}

export function layerAt(segs: WeaveSegment[], u: number): number {
  for (const s of segs) {
    if (u >= s.u0 && u <= s.u1) return s.layer;
  }
  return segs[segs.length - 1].layer;
}

export function pathToSvg(p: [number, number][], closed: boolean): string {
  const n = p.length;
  if (n < 2) return '';
  const m = (a: [number, number], b: [number, number]): [number, number] => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  let d = '';
  if (closed) {
    const s = m(p[n - 1], p[0]);
    d += `M ${s[0].toFixed(2)} ${s[1].toFixed(2)}`;
    for (let i = 0; i < n; i++) {
      const q = m(p[i], p[(i + 1) % n]);
      d += ` Q ${p[i][0].toFixed(2)} ${p[i][1].toFixed(2)} ${q[0].toFixed(2)} ${q[1].toFixed(2)}`;
    }
    d += ' Z';
  } else {
    d += `M ${p[0][0].toFixed(2)} ${p[0][1].toFixed(2)}`;
    for (let i = 1; i < n - 1; i++) {
      const q = m(p[i], p[i + 1]);
      d += ` Q ${p[i][0].toFixed(2)} ${p[i][1].toFixed(2)} ${q[0].toFixed(2)} ${q[1].toFixed(2)}`;
    }
    d += ` L ${p[n - 1][0].toFixed(2)} ${p[n - 1][1].toFixed(2)}`;
  }
  return d;
}

// Lightweight standard Uncompressed ZIP encoder
export function createZipBuffer(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const crcTable = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    crcTable[i] = c >>> 0;
  }
  function crc32(buf: Uint8Array): number {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  const parts: Uint8Array[] = [];
  const centralDir: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = new TextEncoder().encode(file.name);
    const data = file.data;
    const crc = crc32(data);
    const size = data.length;

    const header = new Uint8Array(30 + nameBytes.length);
    const view = new DataView(header.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 0, true);
    view.setUint16(8, 0, true);
    view.setUint16(10, 0, true);
    view.setUint16(12, 0, true);
    view.setUint32(14, crc, true);
    view.setUint32(18, size, true);
    view.setUint32(22, size, true);
    view.setUint16(26, nameBytes.length, true);
    view.setUint16(28, 0, true);
    header.set(nameBytes, 30);

    parts.push(header, data);

    const cd = new Uint8Array(46 + nameBytes.length);
    const cdView = new DataView(cd.buffer);
    cdView.setUint32(0, 0x02014b50, true);
    cdView.setUint16(4, 20, true);
    cdView.setUint16(6, 20, true);
    cdView.setUint16(8, 0, true);
    cdView.setUint16(10, 0, true);
    cdView.setUint16(12, 0, true);
    cdView.setUint16(14, 0, true);
    cdView.setUint32(16, crc, true);
    cdView.setUint32(20, size, true);
    cdView.setUint32(24, size, true);
    cdView.setUint16(28, nameBytes.length, true);
    cdView.setUint16(30, 0, true);
    cdView.setUint16(32, 0, true);
    cdView.setUint16(34, 0, true);
    cdView.setUint16(36, 0, true);
    cdView.setUint32(38, 0, true);
    cdView.setUint32(42, offset, true);
    cd.set(nameBytes, 46);

    centralDir.push(cd);
    offset += header.length + size;
  }

  const cdOffset = offset;
  let cdSize = 0;
  for (const cd of centralDir) cdSize += cd.length;

  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true);
  eocdView.setUint16(4, 0, true);
  eocdView.setUint16(6, 0, true);
  eocdView.setUint16(8, files.length, true);
  eocdView.setUint16(10, files.length, true);
  eocdView.setUint32(12, cdSize, true);
  eocdView.setUint32(16, cdOffset, true);
  eocdView.setUint16(20, 0, true);

  const totalLength = offset + cdSize + 22;
  const out = new Uint8Array(totalLength);
  let pos = 0;
  for (const p of parts) {
    out.set(p, pos);
    pos += p.length;
  }
  for (const cd of centralDir) {
    out.set(cd, pos);
    pos += cd.length;
  }
  out.set(eocd, pos);
  return out;
}

// Letter item interface
export interface LetterItem {
  ch: string;
  id: number;
  birth: number;
  tb?: number;
  dead?: number | null;
  cut?: number | null;
  ws?: number;
  wi?: number;
  prev?: LetterItem | null;
  x?: number;
  y?: number;
  tx?: number;
  ty?: number;
  tw?: number;
  line?: number;
  els?: any[];
  endEls?: any[] | null;
  tend?: any[];
  lean?: [number, number];
}

// Botanical Generator
export class BotanicalGenerator {
  uid = 1;
  density = 1;

  wordParams(ws: number) {
    const r = rng(ws * 7 + 13);
    const dens = this.density;
    return {
      roseP: 0.3 + r() * 0.3,
      leafy: (0.6 + r() * 0.8) * dens,
      dens,
      lean: (r() - 0.5) * 0.6,
      big: 0.85 + r() * 0.45,
      curvy: 0.8 + r() * 0.6,
      bridgeP: Math.min(0.95, (0.45 + r() * 0.35) * dens),
      w: 0.5
    };
  }

  grow(r: () => number, E: any[], nid: () => number, p: any, o: any) {
    const tip = o.tip || (r() < p.roseP ? 'rose' : r() < 0.45 ? 'fan' : r() < 0.6 ? 'leaf' : 'curl');
    let P = o.pts || vine(o.base, o.dir, o.len, (0.35 + r() * 0.45) * p.curvy, 1 + r() * 1.6, r() * 6.28, (r() - 0.5) * 1.2, 40);
    if (tip === 'curl') P = curl(P, r() < 0.5 ? -1 : 1, 0.05 + r() * 0.05);
    const segs = weave(r, o.layer0 != null ? o.layer0 : (r() < 0.5 ? 0 : 1));
    const dur = Math.max(320, (o.len || 0.8) * 620);
    const thorns: { u: number; s: number }[] = [];
    const nt = Math.floor(r() * 2.5);
    for (let i = 0; i < nt; i++) thorns.push({ u: 0.15 + r() * 0.65, s: r() < 0.5 ? -1 : 1 });
    E.push({ t: 'stem', id: nid(), pts: P, segs, d0: o.d0, dur, w: o.depth ? 0.82 : 1, thorns });
    const nl = Math.floor(r() * 2.8 * p.leafy);
    let sd = r() < 0.5 ? -1 : 1;
    for (let i = 0; i < nl; i++) {
      const u = 0.25 + r() * 0.6, [q, a] = at(P, u);
      sd = -sd;
      E.push({ t: 'leaf', id: nid(), x: q[0], y: q[1], a: a + sd * (0.55 + r() * 0.5), L: (0.14 + r() * 0.2) * (o.depth ? 0.8 : 1), bend: (r() - 0.5) * 1.2, layer: layerAt(segs, u), d0: o.d0 + dur * u });
    }
    const [tp, ta] = at(P, 1), td = o.d0 + dur * 0.8, tl = layerAt(segs, 1);
    if (tip === 'rose') {
      const R = (0.13 + r() * 0.15) * p.big * (o.depth ? 0.75 : 1);
      const over = tp[1] > -0.78 && tp[1] < 0.05 && Math.abs(tp[0]) < p.w * 0.5;
      const layer = over ? (r() < 0.22 ? 1 : 0) : (r() < 0.6 ? 1 : tl);
      E.push({ t: 'rose', id: nid(), x: tp[0], y: tp[1], R, rot: (r() - 0.5) * 1.0, ph1: r() * 6.28, ph2: r() * 6.28, turns: 1.8 + r() * 1, layer, d0: td });
      if (r() < 0.2) {
        const oo = ta + (r() < 0.5 ? 1 : -1) * 1.3;
        E.push({ t: 'rose', id: nid(), x: tp[0] + Math.cos(oo) * R * 1.4, y: tp[1] + Math.sin(oo) * R * 1.4, R: R * (0.6 + r() * 0.3), rot: (r() - 0.5) * 1.2, ph1: r() * 6.28, ph2: r() * 6.28, turns: 1.8 + r(), layer, d0: td + 120 });
      }
    } else if (tip === 'fan') {
      const spread = 0.6 + r() * 0.3;
      for (let j = 0; j < 2; j++) E.push({ t: 'leaf', id: nid(), x: tp[0], y: tp[1], a: ta + (j - 0.5) * spread, L: 0.2 + r() * 0.2, bend: (j - 0.5) * 0.8, layer: tl, d0: td + j * 60 });
    } else if (tip === 'leaf') {
      E.push({ t: 'leaf', id: nid(), x: tp[0], y: tp[1], a: ta + (r() - 0.5) * 0.3, L: 0.16 + r() * 0.16, bend: (r() - 0.5), layer: tl, d0: td });
    }
    if (!o.depth && r() < 0.3) {
      const u = 0.35 + r() * 0.35, [q, a] = at(P, u);
      this.grow(r, E, nid, p, { base: q, dir: a + (r() < 0.5 ? -1 : 1) * (0.7 + r() * 0.4), len: (o.len || 0.8) * (0.35 + r() * 0.2), d0: o.d0 + dur * u, depth: 1, layer0: layerAt(segs, u) });
    }
    return P;
  }

  gen(l: LetterItem, charWidth = 0.55) {
    const r = rng(((l.ws ?? 0) ^ Math.imul((l.wi ?? 0) + 1, 2654435761)) + Math.floor(Math.random() * 1e6));
    const p = this.wordParams(l.ws ?? 0);
    const E: any[] = [];
    let k0 = 0;
    const nid = () => l.id * 100 + (k0++);
    const w = charWidth;
    p.w = w;
    const inX = () => (r() - 0.5) * w * 0.7;

    const nUp = 1 + (r() < 0.45 * p.dens ? 1 : 0);
    for (let i = 0; i < nUp; i++) {
      this.grow(r, E, nid, p, {
        base: [inX(), -r() * 0.3],
        dir: -Math.PI / 2 + p.lean * 0.5 + (r() - 0.5) * 0.7,
        len: 0.6 + r() * 0.5,
        d0: 40 + i * 130,
        tip: (l.wi === 0 && i === 0) ? 'rose' : null
      });
    }
    if (r() < 0.4 * p.dens) {
      this.grow(r, E, nid, p, {
        base: [inX(), -0.1 - r() * 0.35],
        dir: Math.PI / 2 + (r() - 0.5) * 0.8,
        len: 0.35 + r() * 0.35,
        d0: 160
      });
    }
    if (l.prev && r() < p.bridgeP) {
      const px = -(charWidth + w) / 2;
      const a: [number, number] = [inX(), -0.05 - r() * 0.55];
      const b: [number, number] = [px + (r() - 0.5) * 0.25, -0.05 - r() * 0.55];
      const bulge = (r() < 0.55 ? -1 : 1) * (0.4 + r() * 0.4);
      const dx = b[0] - a[0];
      let P = bez(a, [a[0] + dx * 0.15, a[1] + bulge], [b[0] - dx * 0.15, b[1] + bulge * 0.9], b, 40);
      if (r() < 0.45) P = P.slice(0, Math.floor(P.length * (0.7 + r() * 0.2)));
      this.grow(r, E, nid, p, {
        pts: P,
        len: Math.abs(dx) + Math.abs(bulge),
        d0: 90,
        tip: r() < 0.5 ? 'curl' : r() < 0.5 ? 'leaf' : 'rose'
      });
    }
    if (l.wi === 0) {
      this.grow(r, E, nid, p, {
        base: [-w * 0.3, -0.15 - r() * 0.4],
        dir: Math.PI + (r() - 0.5) * 1.2,
        len: 0.45 + r() * 0.3,
        d0: 120,
        tip: 'curl'
      });
    }
    l.els = E;
    l.endEls = null;

    const T: any[] = [];
    const tr = rng(l.id * 977 + Math.floor(Math.random() * 1e6));
    this.grow(tr, T, () => l.id * 100 + 90 + T.length, p, {
      base: [w * 0.25, -0.1 - tr() * 0.45],
      dir: (tr() - 0.5) * 1.4,
      len: 0.45 + tr() * 0.25,
      d0: 0,
      tip: 'curl',
      depth: 1
    });
    l.tend = T.filter(e => e.t === 'stem').slice(0, 1);
  }

  genEnd(l: LetterItem, rel: number, charWidth = 0.55) {
    const r = rng((l.ws ?? 0) + (l.wi ?? 0) * 31 + Math.floor(Math.random() * 1e6));
    const p = this.wordParams(l.ws ?? 0);
    const E: any[] = [];
    let k0 = 50;
    const nid = () => l.id * 100 + (k0++);
    const w = charWidth;
    const n = 1 + Math.floor(r() * 2.5);
    p.w = w;
    for (let i = 0; i < n; i++) {
      const dir = -Math.PI / 2 + 0.6 + (i - (n - 1) / 2) * 0.9 + (r() - 0.5) * 0.4;
      this.grow(r, E, nid, p, {
        base: [(r() - 0.2) * w * 0.6, -r() * 0.5],
        dir,
        len: 0.4 + r() * 0.45,
        d0: rel + 40 + i * 90,
        depth: 1,
        tip: i === 0 || r() < 0.5 ? 'rose' : 'fan'
      });
    }
    l.endEls = E;
  }

  getCustomizedThorns(e: any): { u: number; s: number }[] {
    if (e._cThorns) return e._cThorns;
    const r = rng(e.id * 839 + 17);
    const list: { u: number; s: number }[] = (e.thorns || []).map((th: any) => ({ u: th.u, s: th.s }));
    const count = 3 + Math.floor(r() * 3);
    const sorted = [...list];
    for (let i = 0; i < count; i++) {
      const u = 0.12 + (i + 0.5 + (r() - 0.5) * 0.4) * (0.76 / count);
      const s = (i % 2 === 0 ? 1 : -1) * (r() < 0.85 ? 1 : -1);
      if (!sorted.some(th => Math.abs(th.u - u) < 0.08)) {
        sorted.push({ u: Math.max(0.1, Math.min(0.9, u)), s });
      }
    }
    sorted.sort((a, b) => a.u - b.u);
    return (e._cThorns = sorted);
  }
}

// Customized Botanical Treatment Constants & Mathematics
export interface BotanicalColors {
  bg: string;
  text: string;
  stemBase: string;
  stemLit: string;
  thornBase: string;
  thornBody: string;
  thornTip: string;
  roseShadow: string;
  roseMid: string;
  roseHigh: string;
  roseHeart: string;
  leafBase: string;
  leafVein: string;
  sepal: string;
}

export const CUSTOMIZED_PALETTE: BotanicalColors = {
  bg: '#000000',
  text: '#FFFFFF',
  stemBase: '#1c4528',
  stemLit: '#3d7c50',
  thornBase: '#3a1118',
  thornBody: '#851926',
  thornTip: '#e65a6b',
  roseShadow: '#38050c',
  roseMid: '#ba162c',
  roseHigh: '#de3e53',
  roseHeart: '#260306',
  leafBase: '#1b4327',
  leafVein: '#387548',
  sepal: '#193d22'
};

export interface ThornPolygonResult {
  poly: [number, number][];
  renderPoly: [number, number][];
  innerPoly: [number, number][];
  tipArc: [number, number][];
  stemWidth: number;
  height: number;
  baseLength: number;
  hook: number;
  recurveAngle: number;
}

export function getHookedThornPolygon(
  p: [number, number],
  tangentAngle: number,
  side: number,
  letterScale: number,
  progress: number,
  u: number,
  elemId: number
): ThornPolygonResult | null {
  const growFr = Math.min(1, Math.max(0, (progress - u) / 0.12));
  const sc = eo(growFr);
  if (sc <= 0.01) return null;

  const cosA = Math.cos(tangentAngle);
  const sinA = Math.sin(tangentAngle);
  const normX = -sinA * side;
  const normY = cosA * side;

  const stemW = letterScale * 0.019;
  const hVar = h(elemId * 19.3 + u * 47.1);
  const H = stemW * (2.1 + hVar * 0.55) * sc;
  const bLen = stemW * (2.2 + hVar * 0.4) * sc;
  const hook = H * (0.62 + hVar * 0.18);

  const pBaseFwd: [number, number] = [p[0] + cosA * (bLen * 0.42), p[1] + sinA * (bLen * 0.42)];
  const pBaseRear: [number, number] = [p[0] - cosA * (bLen * 0.68), p[1] - sinA * (bLen * 0.68)];
  const pTip: [number, number] = [p[0] + normX * H - cosA * hook, p[1] + normY * H - sinA * hook];

  const pDorsal1: [number, number] = [
    pBaseFwd[0] + normX * (H * 0.38) + cosA * (bLen * 0.08),
    pBaseFwd[1] + normY * (H * 0.38) + sinA * (bLen * 0.08)
  ];
  const pDorsal2: [number, number] = [
    p[0] + normX * (H * 0.82) - cosA * (hook * 0.25),
    p[1] + normY * (H * 0.82) - sinA * (hook * 0.25)
  ];

  const pVentral1: [number, number] = [
    pTip[0] - normX * (H * 0.32) + cosA * (hook * 0.32),
    pTip[1] - normY * (H * 0.32) + sinA * (hook * 0.32)
  ];
  const pVentral2: [number, number] = [
    pBaseRear[0] + normX * (H * 0.22) - cosA * (bLen * 0.12),
    pBaseRear[1] + normY * (H * 0.22) - sinA * (bLen * 0.12)
  ];

  const poly: [number, number][] = [
    pBaseFwd,
    pDorsal1,
    pDorsal2,
    pTip,
    pVentral1,
    pVentral2,
    pBaseRear
  ];

  const renderPoly: [number, number][] = [
    pBaseFwd,
    pDorsal1,
    pDorsal2,
    pTip,
    pTip,
    pVentral1,
    pVentral2,
    pBaseRear
  ];

  const innerPoly: [number, number][] = poly.map((pt) => [
    pt[0] * 0.86 + p[0] * 0.14,
    pt[1] * 0.86 + p[1] * 0.14
  ]);

  const tipArc: [number, number][] = [
    [pTip[0] + cosA * (hook * 0.22), pTip[1] + sinA * (hook * 0.22)],
    pTip,
    pTip,
    [pTip[0] - normX * (H * 0.18) + cosA * (hook * 0.15), pTip[1] - normY * (H * 0.18) + sinA * (hook * 0.15)]
  ];

  const recurveAngle = Math.atan2(pTip[1] - p[1], pTip[0] - p[0]);

  return {
    poly,
    renderPoly,
    innerPoly,
    tipArc,
    stemWidth: stemW,
    height: H,
    baseLength: bLen,
    hook,
    recurveAngle
  };
}

export interface PetalWhorl {
  whorlIndex: number;
  name: string;
  petalCount: number;
  radiusOuter: number;
  radiusInner: number;
  cleft: number;
  colShadow: string;
  colBody: string;
  colRim: string;
  petals: {
    angle: number;
    outerArc: [number, number][];
    innerArc: [number, number][];
    poly: [number, number][];
    midPoly: [number, number][];
    growth: number;
  }[];
}

export function getRosePetalsWhorls(
  cx: number,
  cy: number,
  R: number,
  rot: number,
  e: { id: number; ph1: number; ph2: number; turns: number },
  age: number
): { sepals: [number, number][][]; whorls: PetalWhorl[]; heartSpiral: [number, number][] } {
  const st = 85;
  const T = (x: number, y: number): [number, number] => {
    const cr = Math.cos(rot), sr = Math.sin(rot);
    return [cx + x * cr - y * sr, cy + x * sr + y * cr];
  };

  const sepals: [number, number][][] = [];
  const sepFr = spr(age / 750, 8, 14);
  if (sepFr > 0.05 && R >= 4) {
    const nSep = 5;
    const sepLen = R * 1.18 * sepFr;
    for (let k = 0; k < nSep; k++) {
      const ang = (k / nSep) * Math.PI * 2 + e.ph2 * 0.5;
      const cA = Math.cos(ang), sA = Math.sin(ang);
      const nX = -sA, nY = cA;
      const bW = R * 0.16 * sepFr;
      const p1 = T(cA * R * 0.22 - nX * bW, sA * R * 0.22 - nY * bW);
      const p2 = T(cA * sepLen * 0.6 - nX * (bW * 0.45), sA * sepLen * 0.6 - nY * (bW * 0.45));
      const tip = T(cA * sepLen + nX * (R * 0.07), sA * sepLen + nY * (R * 0.07));
      const p3 = T(cA * sepLen * 0.6 + nX * (bW * 0.45), sA * sepLen * 0.6 + nY * (bW * 0.45));
      const p4 = T(cA * R * 0.22 + nX * bW, sA * R * 0.22 + nY * bW);
      sepals.push([p1, p2, tip, p3, p4]);
    }
  }

  const buildPetal = (centerAngle: number, rIn: number, rOut: number, angSpan: number, s: number, cleft: number, scallopPhase: number, pIndex = 0) => {
    const N = 18;
    const outer: [number, number][] = [];
    const inner: [number, number][] = [];
    const pJitter = (h(e.id * 13.7 + pIndex * 29.3) - 0.5) * 0.07;
    const rVar = 1 + (h(e.id * 7.1 + pIndex * 19.9) - 0.5) * 0.08;
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const th = centerAngle + pJitter + (u - 0.5) * angSpan;
      const scallop = 1 - cleft * Math.sin(u * Math.PI) + 0.035 * Math.sin(u * Math.PI * 3 + scallopPhase);
      const ro = rOut * rVar * scallop * s;
      const ri = rIn * (0.8 + 0.2 * Math.sin(u * Math.PI)) * s;
      outer.push(T(Math.cos(th) * ro, Math.sin(th) * ro));
      inner.push(T(Math.cos(th) * ri, Math.sin(th) * ri));
    }
    const poly: [number, number][] = [...inner, ...[...outer].reverse()];
    const midPoly: [number, number][] = outer.map((p, idx) => {
      const ip = inner[idx];
      return [p[0] * 0.86 + ip[0] * 0.14, p[1] * 0.86 + ip[1] * 0.14];
    });
    return { outerArc: outer, innerArc: inner, poly, midPoly, growth: s, angle: centerAngle };
  };

  const whorls: PetalWhorl[] = [];

  const nW1 = 6;
  const w1Petals = [];
  for (let i = 0; i < nW1; i++) {
    const ph = (i / nW1) * Math.PI * 2 + e.ph1;
    const span = (Math.PI * 2 / nW1) * 1.48;
    const sPetal = spr((age - i * 25) / 1000, 8, 14);
    w1Petals.push(buildPetal(ph, R * 0.32, R * (0.95 + 0.08 * Math.sin(i * 2 + e.ph2)), span, sPetal, 0.14, i, i));
  }
  whorls.push({
    whorlIndex: 1,
    name: 'outerGuard',
    petalCount: nW1,
    radiusOuter: R * 0.95,
    radiusInner: R * 0.32,
    cleft: 0.14,
    colShadow: '#38050c',
    colBody: '#8f1122',
    colRim: '#de3e53',
    petals: w1Petals
  });

  const nW2 = 6;
  const w2Petals = [];
  for (let i = 0; i < nW2; i++) {
    const ph = (i / nW2) * Math.PI * 2 + e.ph1 + Math.PI / nW2 + 0.1;
    const span = (Math.PI * 2 / nW2) * 1.42;
    const sPetal = spr((age - (st * 1.4 + i * 22)) / 1000, 8, 14);
    w2Petals.push(buildPetal(ph, R * 0.22, R * (0.75 + 0.06 * Math.sin(i * 3 + e.ph1)), span, sPetal, 0.16, i * 1.5, i + 6));
  }
  whorls.push({
    whorlIndex: 2,
    name: 'intermediateCup',
    petalCount: nW2,
    radiusOuter: R * 0.75,
    radiusInner: R * 0.22,
    cleft: 0.16,
    colShadow: '#480812',
    colBody: '#b8162c',
    colRim: '#f06277',
    petals: w2Petals
  });

  const nW3 = 5;
  const w3Petals = [];
  for (let i = 0; i < nW3; i++) {
    const ph = (i / nW3) * Math.PI * 2 + e.ph2 + 0.4;
    const span = (Math.PI * 2 / nW3) * 1.38;
    const sPetal = spr((age - (st * 2.8 + i * 20)) / 1000, 8, 14);
    w3Petals.push(buildPetal(ph, R * 0.12, R * (0.52 + 0.05 * Math.sin(i * 2.5)), span, sPetal, 0.18, i * 2, i + 12));
  }
  whorls.push({
    whorlIndex: 3,
    name: 'innerSwirl',
    petalCount: nW3,
    radiusOuter: R * 0.52,
    radiusInner: R * 0.12,
    cleft: 0.18,
    colShadow: '#2e0408',
    colBody: '#ce1d37',
    colRim: '#f57b8e',
    petals: w3Petals
  });

  const sHeart = eo((age - st * 4.2) / 520);
  const heartSpiral: [number, number][] = [];
  if (sHeart > 0 && R > 3) {
    const turns = R < 20 ? Math.min(e.turns, 1.4) : e.turns;
    for (let i = 0; i <= 60; i++) {
      const u = i / 60;
      const th = e.ph1 + u * turns * Math.PI * 2;
      const rr = R * (0.05 + 0.28 * u) * sHeart;
      heartSpiral.push(T(Math.cos(th) * rr, Math.sin(th) * rr * 0.85));
    }
  }

  return { sepals, whorls, heartSpiral };
}

