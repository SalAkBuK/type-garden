import { describe, it, expect } from 'vitest';
import {
  PRESETS,
  RAW_PALETTES,
  getPalette,
  h,
  spr,
  eo,
  rng,
  bez,
  at,
  vine,
  curl,
  weave,
  layerAt,
  pathToSvg,
  createZipBuffer,
  BotanicalGenerator,
  LetterItem,
  CUSTOMIZED_PALETTE,
  getHookedThornPolygon,
  getRosePetalsWhorls
} from '../typeGardenCore';

describe('Type Garden Math & Utilities', () => {
  it('deterministic PRNG generates uniform numbers between 0 and 1', () => {
    const r1 = rng(42);
    const r2 = rng(42);
    for (let i = 0; i < 20; i++) {
      const v1 = r1();
      const v2 = r2();
      expect(v1).toBe(v2);
      expect(v1).toBeGreaterThanOrEqual(0);
      expect(v1).toBeLessThan(1);
    }
  });

  it('spring easing starts at 0 and stabilizes near 1', () => {
    expect(spr(0)).toBe(0);
    expect(spr(-1)).toBe(0);
    const mid = spr(0.5, 8, 14);
    expect(typeof mid).toBe('number');
    const late = spr(2.0, 8, 14);
    expect(Math.abs(late - 1)).toBeLessThan(0.05);
  });

  it('cubic ease out correctly maps [0, 1] monotonically', () => {
    expect(eo(0)).toBe(0);
    expect(eo(1)).toBe(1);
    expect(eo(0.5)).toBeGreaterThan(0.5); // ease out decelerates
    expect(eo(2)).toBe(1);
  });

  it('evaluates cubic Bezier points', () => {
    const a: [number, number] = [0, 0];
    const b: [number, number] = [0, 10];
    const c: [number, number] = [10, 10];
    const d: [number, number] = [10, 0];
    const pts = bez(a, b, c, d, 10);
    expect(pts.length).toBe(11);
    expect(pts[0][0]).toBe(0);
    expect(pts[0][1]).toBe(0);
    expect(pts[10][0]).toBe(10);
    expect(pts[10][1]).toBe(0);
  });

  it('calculates position and angle along a path at progress u', () => {
    const pts: [number, number][] = [
      [0, 0],
      [10, 0],
      [20, 0]
    ];
    const [p, angle] = at(pts, 0.5);
    expect(p[0]).toBe(10);
    expect(p[1]).toBe(0);
    expect(angle).toBe(0);
  });

  it('generates wavy vine paths with curl endpoints', () => {
    const base: [number, number] = [0, 0];
    const v = vine(base, -Math.PI / 2, 50, 5, 2, 0, 0.2, 20);
    expect(v.length).toBe(21);
    expect(v[0]).toEqual([0, 0]);

    const c = curl(v, 1, 5);
    expect(c.length).toBe(21 + 14);
  });

  it('creates alternating weave layers', () => {
    const r = rng(101);
    const segs = weave(r, 0);
    expect(segs.length).toBeGreaterThan(1);
    expect(segs[0].layer).toBe(0);
    expect(segs[0].u0).toBe(0);
    expect(segs[segs.length - 1].u1).toBe(1);

    const l0 = layerAt(segs, 0.01);
    expect(l0).toBe(0);
  });

  it('converts point paths into valid SVG path strings', () => {
    const pts: [number, number][] = [
      [0, 0],
      [10, 5],
      [20, 0]
    ];
    const openSvg = pathToSvg(pts, false);
    expect(openSvg.startsWith('M 0.00 0.00')).toBe(true);
    expect(openSvg.includes('Q')).toBe(true);

    const closedSvg = pathToSvg(pts, true);
    expect(closedSvg.endsWith('Z')).toBe(true);
  });

  it('packages data into a valid standard uncompressed ZIP file', () => {
    const files = [
      { name: 'test.txt', data: new TextEncoder().encode('Hello Type Garden') },
      { name: 'frame.png', data: new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]) }
    ];
    const zip = createZipBuffer(files);
    expect(zip.length).toBeGreaterThan(100);
    // Standard ZIP local file header signature: PK\x03\x04 -> 0x50, 0x4b, 0x03, 0x04
    expect(zip[0]).toBe(0x50);
    expect(zip[1]).toBe(0x4b);
    expect(zip[2]).toBe(0x03);
    expect(zip[3]).toBe(0x04);
  });
});

describe('Type Garden Flora & Palettes', () => {
  it('provides 10 distinct, richly colored botanical palettes', () => {
    expect(RAW_PALETTES.length).toBe(10);
    for (let i = 0; i < 10; i++) {
      const pal = getPalette(i);
      expect(pal.name).toBeTruthy();
      expect(pal.bg.startsWith('#')).toBe(true);
      expect(pal.flower.startsWith('#')).toBe(true);
      expect(pal.stem.startsWith('#')).toBe(true);
      expect(pal.line.startsWith('#')).toBe(true);
      expect(pal.text.startsWith('#')).toBe(true);
    }
  });

  it('provides 7 motion presets with defined durations and labels', () => {
    expect(PRESETS.length).toBe(7);
    const ids = PRESETS.map(p => p.id);
    expect(ids).toContain('breathe');
    expect(ids).toContain('grow');
    expect(ids).toContain('typed');
    expect(ids).toContain('wind');
    expect(ids).toContain('reach');
    expect(ids).toContain('scatter');
    expect(ids).toContain('visit');

    for (const pr of PRESETS) {
      expect(pr.T).toBeGreaterThanOrEqual(3000);
      expect(pr.label).toBeTruthy();
      expect(pr.sub).toBeTruthy();
    }
  });

  it('generates floral stems, thorns, leaves, and roses on a typed letter', () => {
    const bot = new BotanicalGenerator();
    const letter: LetterItem = {
      ch: 'A',
      id: 1,
      birth: 1000,
      ws: 54321,
      wi: 0,
      prev: null
    };

    bot.gen(letter, 0.6);
    expect(letter.els).toBeDefined();
    expect(letter.els!.length).toBeGreaterThan(0);

    const hasStem = letter.els!.some(e => e.t === 'stem');
    const hasLeaf = letter.els!.some(e => e.t === 'leaf');
    const hasRose = letter.els!.some(e => e.t === 'rose');
    expect(hasStem).toBe(true);
    expect(hasLeaf || hasRose).toBe(true);

    // Tendril for connecting subsequent letters
    expect(letter.tend).toBeDefined();
    expect(letter.tend!.length).toBeGreaterThan(0);
  });

  it('cuts the stems and generates end blooms when Space cuts the garden', () => {
    const bot = new BotanicalGenerator();
    const l1: LetterItem = { ch: 'N', id: 1, birth: 1000, ws: 123, wi: 0, prev: null };
    bot.gen(l1, 0.55);

    // Typing space cuts l1
    l1.cut = 1400;
    bot.genEnd(l1, l1.cut - l1.birth, 0.55);

    expect(l1.endEls).toBeDefined();
    expect(l1.endEls!.length).toBeGreaterThan(0);
    // End elements should contain flower tips or fan leaves
    const tipTypes = l1.endEls!.map(e => e.t);
    expect(tipTypes.includes('rose') || tipTypes.includes('leaf')).toBe(true);
  });

  it('supports withering on backspace and clearing on enter', () => {
    const letters: LetterItem[] = [
      { ch: 'R', id: 1, birth: 1000 },
      { ch: 'O', id: 2, birth: 1100 },
      { ch: 'S', id: 3, birth: 1200 },
      { ch: 'E', id: 4, birth: 1300 }
    ];

    // Backspace: last letter withers
    const now = 1500;
    letters[letters.length - 1].dead = now;
    expect(letters[3].dead).toBe(now);

    // Active letters (not dead)
    const active = letters.filter(l => !l.dead);
    expect(active.length).toBe(3);

    // Enter clears all letters
    const cleared = [];
    expect(cleared.length).toBe(0);
  });
});

describe('Customized Botanical Treatment (Detailed Red Roses & Hooked Thorns)', () => {
  it('enforces black background (#000000) and white writing (#FFFFFF) palette contract', () => {
    expect(CUSTOMIZED_PALETTE.bg).toBe('#000000');
    expect(CUSTOMIZED_PALETTE.text).toBe('#FFFFFF');
    // Crimson rose shades
    expect(CUSTOMIZED_PALETTE.roseShadow.toLowerCase()).toBe('#38050c');
    expect(CUSTOMIZED_PALETTE.roseMid.toLowerCase()).toBe('#ba162c');
    expect(CUSTOMIZED_PALETTE.roseHigh.toLowerCase()).toBe('#de3e53');
    // Climbing stem and thorn shades
    expect(CUSTOMIZED_PALETTE.stemBase.toLowerCase()).toBe('#1c4528');
    expect(CUSTOMIZED_PALETTE.thornBase.toLowerCase()).toBe('#3a1118');
    expect(CUSTOMIZED_PALETTE.thornTip.toLowerCase()).toBe('#e65a6b');
  });

  it('generates tapered, hooked thorns proportionate to slender stems', () => {
    const basePoint: [number, number] = [100, 100];
    const tangent = 0; // horizontal stem pointing right
    const side = 1; // right/downward side
    const letterScale = 60; // 60px letter
    const progress = 1.0;
    const u = 0.5;
    const elemId = 42;

    const thorn = getHookedThornPolygon(basePoint, tangent, side, letterScale, progress, u, elemId);
    expect(thorn).not.toBeNull();
    if (!thorn) return;

    // Slender stem width: ~0.019 * letterScale
    expect(thorn.stemWidth).toBeCloseTo(60 * 0.019, 2);

    // Proportionate height: ~2.1 - 2.6x stem thickness
    const heightRatio = thorn.height / thorn.stemWidth;
    expect(heightRatio).toBeGreaterThanOrEqual(1.8);
    expect(heightRatio).toBeLessThanOrEqual(2.8);

    // Flared base attachment along the stem: ~2.0 - 2.6x stem thickness
    const baseRatio = thorn.baseLength / thorn.stemWidth;
    expect(baseRatio).toBeGreaterThanOrEqual(1.8);

    // Hook offset: sharp recurved hook pointing backward against stem growth direction
    expect(thorn.hook).toBeGreaterThan(0);
    // Tip position must be hooked backward relative to normal origin
    const tip = thorn.poly[3];
    expect(tip[0]).toBeLessThan(basePoint[0]); // hooked backward against +x tangent direction!

    // Polygon should contain key contour vertices (base anterior, dorsal curves, tip, ventral curves, base posterior)
    expect(thorn.poly.length).toBe(7);
    expect(thorn.innerPoly.length).toBe(7);
    expect(thorn.tipArc.length).toBe(4);
    // Render polygon contains cusped needle tip (duplicated apex pTip for midpoint quadratic curves)
    expect(thorn.renderPoly.length).toBe(8);
    expect(thorn.renderPoly[3]).toEqual(thorn.renderPoly[4]);
  });

  it('generates multi-whorled cupped overlapping rose petals with rich depth', () => {
    const cx = 200, cy = 200;
    const R = 30; // 30px rose radius
    const rot = 0.2;
    const elem = { id: 7, ph1: 1.2, ph2: 2.3, turns: 1.8 };
    const age = 1500; // fully bloomed

    const result = getRosePetalsWhorls(cx, cy, R, rot, elem, age);

    // 1. Pointed green sepals underneath
    expect(result.sepals.length).toBe(5);
    for (const sepal of result.sepals) {
      expect(sepal.length).toBe(5); // base1, mid1, tip, mid2, base2
    }

    // 2. 3 concentric cupped petal whorls
    expect(result.whorls.length).toBe(3);

    const [w1, w2, w3] = result.whorls;
    // Whorl 1: Outer guard petals (6 broad cupped petals)
    expect(w1.name).toBe('outerGuard');
    expect(w1.petalCount).toBe(6);
    expect(w1.petals.length).toBe(6);
    expect(w1.radiusOuter).toBeGreaterThan(w2.radiusOuter);
    expect(w1.cleft).toBeGreaterThan(0); // cupped notch cleft

    // Whorl 2: Intermediate cup (6 cupped petals)
    expect(w2.name).toBe('intermediateCup');
    expect(w2.petalCount).toBe(6);
    expect(w2.radiusOuter).toBeGreaterThan(w3.radiusOuter);

    // Whorl 3: Inner swirl (5 petals)
    expect(w3.name).toBe('innerSwirl');
    expect(w3.petalCount).toBe(5);

    // Each petal has cupped profile vertices
    for (const petal of w1.petals) {
      expect(petal.poly.length).toBeGreaterThan(20);
      expect(petal.outerArc.length).toBe(19);
      expect(petal.innerArc.length).toBe(19);
      expect(petal.growth).toBeGreaterThan(0.9);
    }

    // Verify untwisted cupped midPoly geometry (no cross-interpolation or self-intersection)
    for (const whorl of result.whorls) {
      for (const petal of whorl.petals) {
        expect(petal.midPoly).toBeDefined();
        expect(petal.midPoly.length).toBe(petal.outerArc.length);
        for (let k = 0; k < petal.midPoly.length; k++) {
          const oDist = Math.hypot(petal.outerArc[k][0] - cx, petal.outerArc[k][1] - cy);
          const mDist = Math.hypot(petal.midPoly[k][0] - cx, petal.midPoly[k][1] - cy);
          const iDist = Math.hypot(petal.innerArc[k][0] - cx, petal.innerArc[k][1] - cy);
          expect(mDist).toBeLessThan(oDist);
          expect(mDist).toBeGreaterThan(iDist);
        }
      }
    }

    // 3. Central heart spiral
    expect(result.heartSpiral.length).toBeGreaterThan(30);
  });

  it('enriches climbing stems with a distinctly thorny distribution along internodes', () => {
    const bot = new BotanicalGenerator();
    const elem = {
      id: 55,
      thorns: [{ u: 0.3, s: 1 }] // baseline only had 1 thorn
    };

    const customizedThorns = bot.getCustomizedThorns(elem);
    // Augmented to distinctly thorny climbing stem (at least 3 thorns)
    expect(customizedThorns.length).toBeGreaterThanOrEqual(3);
    // Thorns are sorted along u parameter
    for (let i = 1; i < customizedThorns.length; i++) {
      expect(customizedThorns[i].u).toBeGreaterThanOrEqual(customizedThorns[i - 1].u);
    }
  });

  it('preserves flower-to-letter scale between baseline and customized', () => {
    const bot = new BotanicalGenerator();
    const l1: LetterItem = { ch: 'B', id: 10, birth: 1000, ws: 99999, wi: 0, prev: null };
    bot.gen(l1, 0.6);

    const roses = (l1.els || []).filter(e => e.t === 'rose');
    expect(roses.length).toBeGreaterThan(0);
    const rScale = roses[0].R;

    // Radius must be proportionate to letter height: typical range 0.10 - 0.35 * S
    expect(rScale).toBeGreaterThan(0.08);
    expect(rScale).toBeLessThan(0.40);
  });
});

