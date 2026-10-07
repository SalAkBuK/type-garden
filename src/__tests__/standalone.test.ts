import { describe, expect, it, vi } from 'vitest';
// These imports belong to the Node test harness; the browser app has no Node type dependency.
// @ts-ignore -- @types/node is not installed in this browser-only project.
import { readFileSync } from 'node:fs';
// @ts-ignore -- @types/node is not installed in this browser-only project.
import { runInNewContext } from 'node:vm';

const htmlUrl = new URL('../../index.html', import.meta.url);
const html: string = readFileSync(htmlUrl, 'utf8');
const inlineScript = html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
if (!inlineScript) throw new Error('The standalone page has no inline application script.');

// Evaluate the actual class shipped in the page, without booting its DOM constructor.
const classStart = inlineScript.indexOf('class TypeGardenApp');
const bootstrapStart = inlineScript.lastIndexOf("window.addEventListener('DOMContentLoaded'");
if (classStart < 0 || bootstrapStart < classStart) throw new Error('Cannot find the standalone application class.');
const classSource = `${inlineScript.slice(classStart, bootstrapStart)}\nTypeGardenApp;`;
const StandaloneApp = runInNewContext(classSource, { performance: { now: () => 10000 } });

// The constructor's tables (the looks; the curated rose inks, blood, butterfly markings and velvet, petals and vines; the
// typefaces), read from the shipped source, and the weight the default typeface is drawn in
function constructorTable(name: string) {
  const head = `this.${name} = `, open = classSource.indexOf(head) + head.length;
  let depth = 0, end = open;
  for (; end < classSource.length; end++) {
    const c = classSource[end];
    if (c === '[' || c === '{') depth++;
    else if ((c === ']' || c === '}') && --depth === 0) break;
  }
  return runInNewContext(`(${classSource.slice(open, end + 1)})`);
}
const TABLES = { ...Object.fromEntries(['LOOKS', 'INK', 'ICHOR', 'WINGS', 'DOF', 'VINES', 'GROUNDS', 'FONTS', 'BLEEDS', 'BLEED_CONTROLS', 'MATERIALS', 'BOTANICAL'].map(name => [name, constructorTable(name)])), FW: 700 };

function app() {
  return Object.assign(Object.create(StandaloneApp.prototype), {
    props: {}, _vine: true, _G: 1.6, _now: 10000, _plantBudget: 2,
    state: { look: 'crimson' }, ...structuredClone(TABLES),
  });
}

type BloomState = { grow: number; open: number; full: number; sepO: number; opening: boolean };

function canvasContext() {
  const draws: { image: any; alpha: number; operation: string }[] = [];
  return {
    draws, globalAlpha: 1, globalCompositeOperation: 'source-over',
    canvas: { width: 1000, height: 700 },
    getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    setTransform: vi.fn(), save: vi.fn(), restore: vi.fn(),
    translate: vi.fn(), rotate: vi.fn(), scale: vi.fn(),
    fillText: vi.fn(),
    clearRect: () => { draws.length = 0; },
    drawImage(image: any) {
      draws.push({ image, alpha: this.globalAlpha, operation: this.globalCompositeOperation });
    },
  };
}

function spriteHarness() {
  class TestCanvas {
    context = canvasContext();
    constructor(public width: number, public height: number) { this.context.canvas = this; }
    getContext() { return this.context; }
  }
  const SpriteApp = runInNewContext(classSource, { OffscreenCanvas: TestCanvas });
  const garden = Object.assign(Object.create(SpriteApp.prototype), {
    _vine: true, _throttle: true, _sprBudget: 8, state: { look: 'crimson' }, ...structuredClone(TABLES),
    backend: (context: unknown) => ({ ctx: context }),
    roseCustomized: vi.fn(),
  });
  const flower: any = { id: 123, ph1: 0, stage: 'full' };
  const context = canvasContext();
  const frame = (age: number, budget = 8, opening = true) => {
    garden._now = 10000 + age;
    garden._sprBudget = budget;
    garden.roseSprite({ ctx: context }, 5, 10, 25, 0, flower, age, 1, opening);
    return context.draws[context.draws.length - 1].image;
  };
  return { garden, flower, frame };
}

function stainHarness(scale = 1) {
  const context = (pixelScale: number) => {
    const operations: any[] = [];
    const saved: any[] = [];
    let transform = { a: pixelScale, b: 0, c: 0, d: pixelScale, e: 0, f: 0 };
    const g: any = {
      operations, globalAlpha: 1, globalCompositeOperation: 'source-over',
      font: '', textAlign: '', textBaseline: '', fillStyle: '',
      getTransform: () => transform,
      setTransform: vi.fn((a: number, b: number, c: number, d: number, e: number, f: number) => { transform = { a, b, c, d, e, f }; }),
      save: vi.fn(() => saved.push({ transform, operation: g.globalCompositeOperation })),
      restore: vi.fn(() => {
        const state = saved.pop();
        if (state) { transform = state.transform; g.globalCompositeOperation = state.operation; }
      }),
      translate: vi.fn(), scale: vi.fn(), clearRect: vi.fn(),
      fillText: vi.fn((text: string, x: number, y: number) => operations.push({
        kind: 'glyph', text, x, y, font: g.font, align: g.textAlign, baseline: g.textBaseline,
        operation: g.globalCompositeOperation, transform,
      })),
      drawImage: vi.fn((image: any, ...coordinates: number[]) => operations.push({ kind: 'image', image, coordinates, operation: g.globalCompositeOperation })),
    };
    return g;
  };
  class TestCanvas {
    context = context(1);
    constructor(public width: number, public height: number) {}
    getContext() { return this.context; }
  }
  const StainApp = runInNewContext(classSource, { OffscreenCanvas: TestCanvas });
  const garden = Object.assign(Object.create(StainApp.prototype), {
    F: "'Playfair Display',serif", dpr: scale, state: { look: 'crimson' }, ...structuredClone(TABLES),
    inkBounds: () => ({ x0: -0.3, x1: 0.3, y0: -0.75, y1: 0.02 }),
    paintStain: vi.fn((g: any, _letter: any, stain: any) => g.operations.push({ kind: 'stain', stain, operation: g.globalCompositeOperation })),
    paintStainBeads: vi.fn((g: any, _letter: any, stain: any) => g.operations.push({ kind: 'bead', stain, operation: g.globalCompositeOperation })),
  });
  return { garden, context: context(scale) };
}

// A test letterform as the glyph scan gives it: a row of ink runs (em) for each 1/80 em row k that ink(k) gives any for
function glyphRows(ink: (k: number) => number[][] | null, from = -64, to = 4) {
  const rows: { y: number; runs: number[][] }[] = [];
  for (let k = from; k <= to; k++) { const runs = ink(k); if (runs) rows.push({ y: (k + 0.5) / 80, runs }); }
  return rows;
}
// An upright stroke 0.16 em wide, from the cap height down to its bottom edge 0.2 em above the baseline
const stroke = () => glyphRows(k => (k >= -60 && k < -16 ? [[-0.08, 0.08]] : null));
// The bleeding effects (legacy is the default), and the legacy one with some of its values changed
const FLUID = () => (TABLES as any).BLEEDS.find((b: any) => b.id === 'fluid').fx;
const LEGACY = (patch: Record<string, number> = {}) => ({ ...(TABLES as any).BLEEDS.find((b: any) => b.id === 'legacy').fx, ...patch });
// A stand-in canvas that keeps the fill styles and glow it is given, and counts its arcs and ellipses
function fillLog() {
  const fills: string[] = [], blurs: number[] = [], ellipses: number[][] = [];
  let blur = 0, arcs = 0;
  const g: any = {
    set fillStyle(value: string) { fills.push(value); }, get fillStyle() { return fills[fills.length - 1]; },
    set shadowBlur(value: number) { blur = value; blurs.push(value); }, get shadowBlur() { return blur; },
    strokeStyle: '', lineWidth: 1, lineCap: '', shadowColor: '', getTransform: () => ({ a: 1 }),
    beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, fill() {}, stroke() {}, quadraticCurveTo() {}, bezierCurveTo() {},
    arc() { arcs++; }, ellipse(...a: number[]) { ellipses.push(a); },
  };
  return { g, fills, blurs, ellipses, arcs: () => arcs };
}

function roseLayerHarness() {
  const operations: any[] = [];
  const canvases: any[] = [];
  const makeContext = (canvas: any, name: string) => {
    let transform = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
    const saved: any[] = [];
    const context: any = {
      canvas, name, globalAlpha: 1, globalCompositeOperation: 'source-over',
      font: '', textAlign: '', textBaseline: '', fillStyle: '',
      getTransform: () => ({ ...transform }),
      setTransform: vi.fn((a: number, b: number, c: number, d: number, e: number, f: number) => { transform = { a, b, c, d, e, f }; }),
      save: vi.fn(() => saved.push({ transform: { ...transform }, alpha: context.globalAlpha, operation: context.globalCompositeOperation })),
      restore: vi.fn(() => {
        const state = saved.pop();
        if (state) { transform = state.transform; context.globalAlpha = state.alpha; context.globalCompositeOperation = state.operation; }
      }),
      clearRect: vi.fn(),
      fillText: vi.fn((ch: string, x: number, y: number) => operations.push({
        kind: context.globalCompositeOperation === 'destination-out' ? 'glyph-mask' : 'glyph',
        ch, x, y, context: name, font: context.font, align: context.textAlign,
        baseline: context.textBaseline, alpha: context.globalAlpha, transform: { ...transform },
      })),
      drawImage: vi.fn((image: any, ...coordinates: number[]) => operations.push({
        kind: 'image', context: name, image, coordinates, operation: context.globalCompositeOperation,
        transform: { ...transform }, alpha: context.globalAlpha,
      })),
    };
    return context;
  };
  class LayerCanvas {
    context: any;
    constructor(public width: number, public height: number) {
      this.context = makeContext(this, `layer-${canvases.length}`);
      canvases.push(this);
    }
    getContext() { return this.context; }
  }
  const LayerApp = runInNewContext(classSource, { performance: { now: () => 10000 }, OffscreenCanvas: LayerCanvas });
  const mainCanvas = { width: 1200, height: 800 }, context = makeContext(mainCanvas, 'main');
  const backend = (g: any) => ({
    ctx: g, fill: vi.fn(), stroke: vi.fn(),
    text: (ch: string, x: number, y: number, S: number) => {
      g.font = `700 ${S}px "Playfair Display",serif`; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      g.fillText(ch, x, y);
    },
  });
  const garden: any = Object.assign(Object.create(LayerApp.prototype), {
    props: {}, F: '"Playfair Display",serif', dpr: 2, W: 600, H: 400,
    state: { busy: true }, fontsReady: false, backend, ...structuredClone(TABLES),
    vineShown: (element: any) => element,
    vineCross: () => 0,
    plantSettled: () => true,
    drawStemCustomized: vi.fn((B: any, element: any, letter: any, _age: number, k: number, _state: any, _f: number, _amp: number, layer: number, fr?: number) => {
      operations.push({ kind: 'foliage', element, letter, k, layer, fr, wilt: garden._wp, tint: garden._tint, context: B.ctx?.name });
    }),
    drawElCustomized: vi.fn((B: any, element: any, letter: any, _age: number, k: number) => {
      operations.push({ kind: element.t === 'rose' ? 'rose' : 'foliage', element, letter, k, wilt: garden._wp, tint: garden._tint, context: B.ctx?.name });
    }),
    stampPlants: vi.fn((B: any, letter: any, layer: number) => {
      if (!letter.cached) return false;
      operations.push({ kind: 'cached-foliage', letter, layer, context: B.ctx?.name });
      return true;
    }),
    dofUpdate: vi.fn(), dofDraw: vi.fn(), drawFallingPetals: vi.fn(), bloodStep: vi.fn(),
    drawLetterStains: vi.fn(() => operations.push({ kind: 'blood' })),
    drawBloodFront: vi.fn(), pruneFade: () => 0.5,
    endK: () => 0.4,
  });
  const rose = (id: number, layer: number) => ({ t: 'rose', id, layer, d0: 0, stage: 'bud' });
  const stem = (id: number) => ({ t: 'stem', id });
  const leaf = (id: number, layer: number) => ({ t: 'leaf', id, layer });
  const letters: any[] = [
    { ch: 'a', id: 1, birth: 0, x: 100, y: 200, els: [rose(101, 0), stem(102), leaf(103, 1), rose(104, 1)],
      wrapEls: [stem(105), rose(106, 0)], markEls: [leaf(107, 0), rose(108, 1)],
      bloomEls: [stem(109), rose(110, 0)] },
    { ch: 'b', id: 2, birth: 0, x: 200, y: 200, cached: true, rev: true,
      els: [rose(201, 0), stem(202), rose(203, 1)], wrapEls: [], markEls: [] },
    { ch: 'c', id: 3, birth: 0, x: 300, y: 200, dead: 9800,
      els: [rose(301, 0), stem(302)], endEls: [stem(303), rose(304, 1)], endDead: 9750,
      tend: [stem(305)], tb: 0, wrapEls: [], markEls: [] },
    { ch: 'd', id: 4, birth: 0, x: 400, y: 200,
      els: [rose(401, 0), stem(402)], endEls: [stem(403), rose(404, 1)], endDead: 9750,
      tend: [stem(405)], tb: 0, wrapEls: [], markEls: [] },
  ];
  const state = { S: 100, speed: 1, vine: true, face: false, recoil: 20, wither: 650, C: {}, letters };
  return { garden, backend: backend(context), context, operations, canvases, letters, state };
}

describe('Standalone TypeGardenApp unobstructed rose layering', () => {
  it('draws every rose once after its global foliage pass and protects rear heads from all front greenery', () => {
    const { garden, backend, operations, letters, state } = roseLayerHarness();
    garden.renderCustomized(backend, 10000, state);
    const roses = operations.filter(operation => operation.kind === 'rose');
    const expected = letters.flatMap(letter => garden.letterLists(letter, true).flat().filter((element: any) => element.t === 'rose'));
    expect(roses.map(operation => operation.element.id).sort()).toEqual(expected.map((element: any) => element.id).sort());
    const rearRoses = roses.filter(operation => operation.element.layer === 0);
    const frontRoses = roses.filter(operation => operation.element.layer === 1);
    const foliage = operations.filter(operation => ['foliage', 'cached-foliage'].includes(operation.kind));
    const phase = (operation: any) => operation.layer ?? operation.element.layer;
    const indices = (events: any[]) => events.map(event => operations.indexOf(event));
    expect(Math.max(...indices(foliage.filter(operation => phase(operation) === 0)))).toBeLessThan(Math.min(...indices(rearRoses)));
    expect(Math.max(...indices(foliage.filter(operation => phase(operation) === 1)))).toBeLessThan(Math.min(...indices(frontRoses)));
    expect(rearRoses.every(operation => operation.context === garden._roseLayer.cg.name)).toBe(true);
    expect(foliage.filter(operation => phase(operation) === 1).every(operation => operation.context === garden._foliageLayer.cg.name)).toBe(true);
    expect(frontRoses.every(operation => operation.context === 'main')).toBe(true);

    const glyphs = operations.filter(operation => operation.kind === 'glyph');
    expect(Math.max(...indices(rearRoses))).toBeLessThan(Math.min(...indices(glyphs)));
    const bloodIndex = operations.findIndex(operation => operation.kind === 'blood');
    expect(Math.max(...indices(glyphs))).toBeLessThan(bloodIndex);
    expect(bloodIndex).toBeLessThan(Math.min(...indices(foliage.filter(operation => phase(operation) === 1))));
    expect(operations.filter(operation => operation.kind === 'glyph-mask')).toHaveLength(0);
    const mask = operations.find(operation => operation.kind === 'image' && operation.operation === 'destination-out');
    expect(mask).toMatchObject({ context: garden._foliageLayer.cg.name, image: garden._roseLayer.cv, coordinates: [0, 0] });

    expect(operations.filter(operation => operation.kind === 'cached-foliage').map(operation => operation.layer)).toEqual([0, 1]);
    expect(foliage.filter(operation => [305, 405].includes(operation.element?.id))).toHaveLength(4); // pruned and live trailing tendrils, both layers
    const deadRose = roses.find(operation => operation.element.id === 301);
    const endRose = roses.find(operation => operation.element.id === 304);
    expect(deadRose.wilt).toBeCloseTo(200 / 650);
    expect(endRose.k).toBeCloseTo(deadRose.k * 0.4);
    expect(roses.find(operation => operation.element.id === 404).k).toBeCloseTo(0.4);
    expect(roses.find(operation => operation.element.id === 201).tint).toBeCloseTo(0.8);
    expect(garden._wp).toBeNull();
    expect(garden._tint).toBe(0);
  });

  it('never tints a chosen vine colour bronze: a rewritten letter shows white vines as white at once', () => {
    const { garden, backend, operations, state } = roseLayerHarness();
    garden.appearance = { ...garden.look().appearance, vine: '#FFFFFF' };
    garden._theme = null;
    expect(garden.theme().freshShoots).toBe(false);
    garden.renderCustomized(backend, 10000, state);
    const rewritten = operations.filter(operation => operation.letter?.id === 2 && operation.kind !== 'cached-foliage');
    expect(rewritten.length).toBeGreaterThan(0);
    expect(rewritten.every(operation => operation.tint === 0)).toBe(true);
    expect(garden._tint).toBe(0);
  });

  it('uses exact rear-petal alpha at physical pixel coordinates without altering the target transform', () => {
    const { garden, backend, context, operations, canvases } = roseLayerHarness();
    const transform = { a: 1.5, b: 0.2, c: -0.1, d: 1.5, e: 33.25, f: -4.5 };
    context.setTransform(transform.a, transform.b, transform.c, transform.d, transform.e, transform.f);
    context.globalAlpha = 0.75;
    const rear = garden.drawRearRoses(backend, (target: any) => {
      expect(target.ctx.getTransform()).toEqual(transform);
      expect(target.ctx.globalAlpha).toBe(1);
    });
    garden.drawFrontPlants(backend, rear, (target: any) => {
      expect(target.ctx.getTransform()).toEqual(transform);
      expect(target.ctx.globalCompositeOperation).toBe('source-over');
    });
    const mask = operations.find(operation => operation.operation === 'destination-out');
    expect(mask.image).toBe(rear.cv);
    expect(mask.transform).toEqual({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
    expect(mask.coordinates).toEqual([0, 0]);
    expect(operations.filter(operation => operation.context === 'main').every(operation => operation.transform.a === 1 && operation.transform.e === 0)).toBe(true);
    expect(context.getTransform()).toEqual(transform);
    expect(context.globalAlpha).toBe(0.75);
    expect(garden._foliageLayer.cg.globalCompositeOperation).toBe('source-over');
    expect(garden._foliageLayer.cg.getTransform()).toEqual(transform);
    expect(canvases.map(canvas => [canvas.width, canvas.height])).toEqual([[1200, 800], [1200, 800]]);

    garden.drawRearRoses(backend, vi.fn());
    garden.drawFrontPlants(backend, rear, vi.fn());
    expect(canvases).toHaveLength(2);
    expect(canvases.every(canvas => canvas.context.clearRect.mock.calls.length === 2)).toBe(true);
    context.canvas.width = 1600;
    context.canvas.height = 1000;
    const resized = garden.drawRearRoses(backend, vi.fn());
    garden.drawFrontPlants(backend, resized, vi.fn());
    expect(canvases.slice(0, 2).map(canvas => [canvas.width, canvas.height])).toEqual([[0, 0], [0, 0]]);
    expect(canvases.slice(2).map(canvas => [canvas.width, canvas.height])).toEqual([[1600, 1000], [1600, 1000]]);
  });

  it('registers each visible butterfly perch once while drawing rear and front roses once', () => {
    const { garden, backend, state } = roseLayerHarness();
    const flower = (id: number, layer: number) => ({
      t: 'rose', id, layer, d0: 0, x: 0, y: -1, R: 0.1, rot: 0, ph1: 0, stage: 'bud',
    });
    state.letters = [
      { ch: 'a', id: 1, birth: 0, x: 100, y: 200, els: [flower(101, 0), flower(102, 1)], wrapEls: [], markEls: [] },
      { ch: 'b', id: 2, birth: 0, x: 200, y: 200, cached: true, els: [flower(201, 0), flower(202, 1)], wrapEls: [], markEls: [] },
    ];
    state.face = true;
    garden.faceTurn = () => null;
    garden.roseCustomized = vi.fn();
    garden.drawElCustomized = StandaloneApp.prototype.drawElCustomized;
    garden.renderCustomized(backend, 10000, state);
    expect(garden.roseCustomized.mock.calls.map((call: any[]) => call[5].id).sort()).toEqual([101, 102, 201, 202]);
    expect(garden.perch.map((perch: any) => perch.id).sort()).toEqual([101, 102, 201, 202]);
    expect(Object.keys(garden._blooms).sort()).toEqual(['101', '102', '201', '202']);
  });

  it('protects rear rose geometry in SVG exports while keeping native text above the rear flowers', () => {
    let svg = '';
    const anchor = { click: vi.fn(), href: '', download: '' };
    const SVGApp = runInNewContext(classSource, {
      performance: { now: () => 10000 }, setTimeout: vi.fn(),
      Blob: class { constructor(parts: string[]) { svg = parts.join(''); } },
      URL: { createObjectURL: () => 'test:svg', revokeObjectURL: vi.fn() },
      document: { createElement: () => anchor },
    });
    const garden: any = Object.assign(Object.create(SVGApp.prototype), {
      state: { mode: 'type', treatment: 'customized' }, W: 600, H: 400, ...structuredClone(TABLES),
      pal: () => ({ bg: '#000', C: {} }), mainState: () => ({ letters: [], S: 100 }),
      renderCustomized(this: any, B: any) {
        const rear = this.drawRearRoses(B, (target: any) => target.fill([[10, 10], [60, 10], [40, 50]], '#C41A30'));
        B.text('A', 40, 50, 100, '#FFFFFF');
        this.drawFrontPlants(B, rear, (target: any) => target.stroke([[0, 20], [100, 20]], '#1C4528', 4));
        B.fill([[70, 10], [90, 10], [80, 40]], '#C41A30');
      },
    });
    garden.saveSVG();
    const rearId = svg.match(/<g id="(rearRoses\d+)">/)?.[1];
    expect(rearId).toBeDefined();
    expect(svg).toContain(`<use href="#${rearId}"`);
    expect(svg).toContain('style="mask-type:luminance"');
    expect(svg).toContain('values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"'); // black mask keeps the original petal alpha
    expect(svg.indexOf(`id="${rearId}"`)).toBeLessThan(svg.indexOf('<text '));
    expect(svg.indexOf('<text ')).toBeLessThan(svg.indexOf('mask="url('));
    expect(svg).toContain('font-weight="700"');
    expect(anchor.click).toHaveBeenCalledOnce();
  });
});

describe('Standalone TypeGardenApp bloom continuity', () => {
  it('grows and unfurls continuously without shrinking or overshooting', () => {
    const garden = app();
    for (const stage of ['bud', 'half', 'full']) {
      let previous: BloomState = garden.bloomState({ stage }, -16);
      expect(previous.grow).toBe(0);
      for (let age = 0; age <= 7200; age += 16) {
        const state: BloomState = garden.bloomState({ stage }, age);
        for (const property of ['grow', 'open', 'full', 'sepO'] as const) {
          expect(Number.isFinite(state[property])).toBe(true);
          expect(state[property]).toBeGreaterThanOrEqual(previous[property] - 1e-10);
          expect(state[property]).toBeGreaterThanOrEqual(0);
          expect(state[property]).toBeLessThanOrEqual(1);
          expect(state[property] - previous[property]).toBeLessThan(0.04);
        }
        previous = state;
      }
      expect(previous.grow).toBe(1);
      expect(previous.opening).toBe(false);
      expect(previous.full).toBe(stage === 'full' ? 1 : 0);
      expect(previous.open).toBe(stage === 'bud' ? 0.16 : 1);
    }
  });

  it('keeps buds closed and finishes half-open flowers before hero blooms', () => {
    const garden = app();
    const bud: BloomState = garden.bloomState({ stage: 'bud' }, 4000);
    const half: BloomState = garden.bloomState({ stage: 'half' }, 4000);
    const hero: BloomState = garden.bloomState({ stage: 'full' }, 4000);
    expect(bud.open).toBeLessThan(half.open);
    expect(bud.full).toBe(0);
    expect(half.open).toBe(1);
    expect(half.full).toBe(0);
    expect(half.opening).toBe(false);
    expect(hero.full).toBeGreaterThan(0);
    expect(hero.full).toBeLessThan(1);
    expect(hero.opening).toBe(true);
  });
});

describe('Standalone TypeGardenApp flower attachment', () => {
  it('returns the exact vine endpoint for an attachment at u=1', () => {
    const points = [[0, 0], [10, -2], [20, -3], [30, -9]];
    const [position] = app().at(points, 1);
    expect(Array.from(position)).toEqual(points[points.length - 1]);
  });

  it('gives offset companion flowers a stalk connected to their parent tip, shown whenever the parent stem is', () => {
    const garden = app();
    const parameters = { ...garden.wordParams(12345), w: 0.55 };
    let companions = 0;
    let visibleCompanions = 0;
    for (let seed = 1; seed <= 80; seed++) {
      const elements: any[] = [];
      let nextId = seed * 100;
      garden.grow(garden.rng(seed), elements, () => nextId++, parameters, {
        base: [0, 0], dir: -Math.PI / 2, len: 0.9, d0: 0, tip: 'rose', hero: true,
      });
      for (const flower of elements.filter(element => element.t === 'rose')) {
        const stalk = flower.stem;
        expect([flower.x, flower.y]).toEqual(Array.from(stalk.pts[stalk.pts.length - 1]));
        if (!stalk.companion) continue;
        companions++;
        expect(elements).toContain(stalk);
        expect(stalk.keep).toBe(true);
        expect(stalk.pu).toBe(1);
        expect(stalk.par).toBeDefined();
        expect(Array.from(stalk.pts[0])).toEqual(Array.from(stalk.par.pts[stalk.par.pts.length - 1]));
        const parentHidden = garden.thinned(stalk.par, elements);
        expect(garden.thinned(stalk, elements)).toBe(parentHidden);
        expect(garden.vineShown(flower, elements)).toBe(parentHidden ? null : flower);
        if (!parentHidden) visibleCompanions++;
      }
    }
    expect(companions).toBeGreaterThan(0);
    expect(visibleCompanions).toBeGreaterThan(0);
  });

  it('shows each generated rose as itself, leaving out about a third of the scattered buds and partly open roses', () => {
    const garden = app();
    const parameters = { ...garden.wordParams(777), w: 0.55 };
    let shown = 0, dropped = 0;
    for (let seed = 1; seed <= 120; seed++) {
      const elements: any[] = [];
      let nextId = seed * 100;
      garden.grow(garden.rng(seed), elements, () => nextId++, parameters, { base: [0, 0], dir: -Math.PI / 2, len: 0.9, d0: 0, tip: 'rose' });
      const flower = elements.find(element => element.t === 'rose' && !element.stem.companion);
      const drop = garden.roseDropped(flower);
      // never a stand-in: the rose itself, or nothing
      expect(garden.vineShown(flower, elements)).toBe(drop ? null : flower);
      if (drop) dropped++; else shown++;
    }
    expect(shown).toBeGreaterThan(0);
    expect(dropped / 120).toBeGreaterThan(0.15);
    expect(dropped / 120).toBeLessThan(0.45);
    // an earned bloom always shows
    expect(garden.thinned({ t: 'rose', bloom: { at: 0, end: null, kind: 'word' } }, [])).toBe(false);
  });

  it('refuses to stamp a settled plant bitmap after cursor lean changes', () => {
    const garden = app();
    garden._plantBudget = 0; // A changed lean must draw live if a fresh bitmap cannot be built this frame.
    const drawImage = vi.fn();
    const context = {
      getTransform: () => ({ a: 1, b: 0 }), save: vi.fn(), restore: vi.fn(),
      translate: vi.fn(), scale: vi.fn(), drawImage,
    };
    const letter = {
      x: 30, y: 40, lean: [0.8, 0.4], _settleN: 0,
      _plantCache: { 1: {
        cv: {}, x0: 0, y0: 0, w: 60, h: 80, S: 100, scale: 1,
        key: 0, vine: garden.theme().vine, lx: 30, ly: 40, lean: [0, 0], // (painted in the current vine colours)
      } },
    };
    const state = { S: 100, face: true };
    expect(garden.stampPlants({ ctx: context }, letter, 1, [], 10000, state)).toBe(false);
    expect(drawImage).not.toHaveBeenCalled();

    letter.lean = [0, 0];
    expect(garden.stampPlants({ ctx: context }, letter, 1, [], 10000, state)).toBe(true);
    expect(drawImage).toHaveBeenCalledOnce();

    Object.assign(letter, { _leanChanged: garden._now });
    expect(garden.stampPlants({ ctx: context }, letter, 1, [], 10000, state)).toBe(false);
    expect(drawImage).toHaveBeenCalledOnce();

    // a bitmap holding an older vine colour stays up until its turn to be repainted, then repaints in the new colours
    delete (letter as any)._leanChanged;
    garden.setAppearance({ vine: '#4B2A5E' });
    expect(garden.stampPlants({ ctx: context }, letter, 1, [], 10000, state)).toBe(true);
    expect(drawImage).toHaveBeenCalledTimes(2);
    garden._plantBudget = 1;
    expect(garden.stampPlants({ ctx: context }, letter, 1, [], 10000, state)).toBe(true);
    expect(letter._plantCache[1].vine).toBe(garden.theme().vine);
  });
});

describe('Standalone TypeGardenApp sprite continuity', () => {
  it('blends cached opening poses on every frame without repainting their geometry', () => {
    const { garden, flower, frame } = spriteHarness();
    frame(500);
    expect(garden.roseCustomized).toHaveBeenCalledTimes(2);
    let previousWeight = -1;
    for (const age of [500, 516, 532, 548]) {
      const mixed = frame(age);
      expect(mixed).toBe(flower._spr.mix);
      const [current, next] = mixed.context.draws;
      expect(current.image).toBe(flower._spr.cv);
      expect(next.image).toBe(flower._spr.next);
      expect(current.alpha + next.alpha).toBeCloseTo(1);
      expect(next.operation).toBe('lighter');
      expect(next.alpha).toBeGreaterThan(previousWeight);
      previousWeight = next.alpha;
    }
    expect(garden.roseCustomized).toHaveBeenCalledTimes(2);
  });

  it('holds a completed pose when samples are rationed, then resumes without a jump', () => {
    const { garden, flower, frame } = spriteHarness();
    frame(500);
    const nextPose = flower._spr.next;
    const completedAt = flower._spr.blendEnd + 1;
    expect(frame(completedAt, 0)).toBe(nextPose);
    expect(frame(completedAt + 100, 0)).toBe(nextPose);
    expect(garden.roseCustomized).toHaveBeenCalledTimes(2);

    const resumed = frame(completedAt + 116);
    const [held, next] = resumed.context.draws;
    expect(held.image).toBe(nextPose);
    expect(held.alpha).toBe(1);
    expect(next.alpha).toBe(0);
    expect(garden.roseCustomized).toHaveBeenCalledTimes(3);
    expect(frame(completedAt + 132).context.draws[1].alpha).toBeGreaterThan(0);
  });

  it('settles on the final pose and releases the temporary blend canvases', () => {
    const { garden, flower, frame } = spriteHarness();
    frame(5700);
    frame(5900, 8, false);
    const previousPose = flower._spr.cv;
    const blendCanvas = flower._spr.mix;
    const finalPose = flower._spr.next;
    expect(frame(6000, 8, false)).toBe(finalPose);
    expect(flower._spr.opening).toBe(false);
    expect(flower._spr.next).toBeNull();
    expect(flower._spr.mix).toBeNull();
    expect(previousPose.width).toBe(0);
    expect(blendCanvas.width).toBe(0);
    expect(finalPose.width).toBeGreaterThan(0);
    const renderCount = garden.roseCustomized.mock.calls.length;
    expect(frame(7000, 8, false)).toBe(finalPose);
    expect(garden.roseCustomized).toHaveBeenCalledTimes(renderCount);
  });

  it('holds the exact opening pose when typing interrupts a blend', () => {
    const { garden, flower, frame } = spriteHarness();
    frame(500);
    frame(532);
    expect(flower._spr.blendEnd).toBeGreaterThan(532);

    const held = frame(532, 8, false);
    expect(held).toBe(flower._spr.cv);
    expect(flower._spr.opening).toBe(false);
    expect(flower._spr.mix).toBeNull();
    expect(flower._spr.next).toBeNull();
    expect(garden.roseCustomized.mock.calls[garden.roseCustomized.mock.calls.length - 1][6]).toBe(532);
    const paints = garden.roseCustomized.mock.calls.length;
    expect(frame(532, 8, false)).toBe(held);
    expect(garden.roseCustomized).toHaveBeenCalledTimes(paints);
  });

  it('shares pose updates across a large group of simultaneously opening flowers', () => {
    const { garden } = spriteHarness();
    const flowers = Array.from({ length: 80 }, (_, id) => ({
      t: 'rose', id: id + 200, ph1: 0, stage: 'full', layer: 0, d0: 0, x: 0, y: -1,
    }));
    garden.state = { busy: false };
    garden.drawElCustomized = (backend: any, flower: any, _letter: any, age: number) => {
      garden.roseSprite(backend, 0, 0, 25, 0, flower, age, 1, true);
    };
    const backend = { ctx: canvasContext(), fill: vi.fn(), text: vi.fn() };
    const state = {
      S: 100, speed: 1, vine: false, C: {},
      letters: [{ ch: 'a', x: 0, y: 0, birth: 9500, els: flowers }],
    };
    for (let frame = 0; frame < 120; frame++) {
      garden.renderCustomized(backend, 10000 + frame * 1000 / 60, state);
    }
    const paints = new Map<number, number>();
    for (const call of garden.roseCustomized.mock.calls) {
      const id = call[5].id;
      paints.set(id, (paints.get(id) || 0) + 1);
    }
    const counts = flowers.map(flower => paints.get(flower.id) || 0);
    expect(Math.min(...counts)).toBeGreaterThan(2);
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(2);
  });
});

// A garden that records writing without a DOM: keys go through keyEvent exactly as the page's key handler sends them
function writer() {
  return Object.assign(app(), {
    letters: [], _cuts: {}, flies: [], perch: [], cache: {}, state: { treatment: 'customized', mode: 'type' },
    // the constructor's writing-record settings
    REC: { pause: 900, punct: 350, hes: 450, emerge: 1300, open: 1, stop: 1.5, bang: 2.4, wither: 650 },
  });
}
function typeInto(garden: any, text: string, start: number, step: number | ((i: number) => number)) {
  let t = start;
  for (let i = 0; i < text.length; i++) {
    if (i > 0) t += typeof step === 'number' ? step : step(i);
    garden.add(text[i], t, garden.keyEvent(t));
  }
  return t;
}
const live = (garden: any) => garden.letters.filter((l: any) => !l.dead);

describe('Standalone TypeGardenApp writing record', () => {
  it('sprouts a bud on the newest letter once the writer pauses, and stops it opening when typing resumes', () => {
    const garden = writer();
    const last = typeInto(garden, 'rose', 0, 120);
    garden.checkSprout(last + 800);
    expect(live(garden).some((l: any) => l.bloom)).toBe(false);
    garden.checkSprout(last + 1000);
    const tip = live(garden)[3];
    expect(tip.bloom).toEqual({ at: last + 900, end: null, kind: 'word' });
    garden.add(' ', last + 2500, garden.keyEvent(last + 2500));
    expect(tip.bloom.end).toBe(last + 2500);
  });

  it('sprouts a sentence\'s bud sooner than a word\'s, since the full stop already ends it', () => {
    const garden = writer();
    const last = typeInto(garden, 'rose.', 0, 120);
    garden.checkSprout(last + 300);
    expect(live(garden).some((l: any) => l.bloom)).toBe(false);
    garden.checkSprout(last + 400);
    expect(live(garden)[4].bloom).toEqual({ at: last + 350, end: null, kind: 'stop' });
  });

  it('settles a pause retroactively when the next key arrives before any frame ran', () => {
    const garden = writer();
    typeInto(garden, 'in bloom', 0, i => (i === 2 ? 2600 : 170));
    const n = live(garden)[1];
    expect(n.bloom).toMatchObject({ at: 170 + 900, end: 170 + 2600, kind: 'word' });
    expect(live(garden).filter((l: any) => l.bloom)).toHaveLength(1);
  });

  it('allows one bloom per word, plus one for a sentence end, a question or a comma', () => {
    const garden = writer();
    let t = typeInto(garden, 'ro', 0, 100);
    garden.checkSprout(t + 1000); // a long hesitation inside the word sprouts its bud on "o"
    t = typeInto(garden, 'se', t + 1500, 100);
    garden.checkSprout(t + 1000); // the word already has its bud
    expect(live(garden).filter((l: any) => l.bloom).map((l: any) => l.ch)).toEqual(['o']);
    for (const [mark, kind] of [['.', 'stop'], ['!', 'bang'], ['?', 'ask'], [',', 'comma']]) {
      t = typeInto(garden, ' ab' + mark, t + 1500, 100);
      garden.checkSprout(t + 1000);
      expect(live(garden)[live(garden).length - 1].bloom.kind).toBe(kind);
    }
  });

  it('opens an earned bloom only through the stillness of its own pause', () => {
    const garden = writer();
    const flower: any = { bloom: { at: 1000, end: null, kind: 'word' } };
    // the bud started swelling at 1500 (so a = now - 1500)
    let previous = -1;
    for (let now = 1500; now <= 6000; now += 50) {
      const age = garden.bloomAge(flower, now - 1500, now);
      expect(age).toBeGreaterThanOrEqual(previous);
      previous = age;
    }
    expect(previous).toBeGreaterThan(3850); // a long stillness carries a half-open rose all the way
    flower.bloom.end = 4000;
    const held = garden.bloomAge(flower, 9000 - 1500, 9000);
    expect(garden.bloomAge(flower, 20000 - 1500, 20000)).toBe(held);
    expect(garden.bloomFrozen(flower, 9000 - 1500)).toBe(true);
    expect(held).toBeLessThan(previous);
    // "!" opens faster than a word's bud through the same stillness
    const bang = garden.bloomAge({ bloom: { at: 1000, end: 4000, kind: 'bang' } }, 7500, 9000);
    expect(bang).toBeGreaterThan(held);
  });

  it('seeds growth from the text itself rather than from how many keys were pressed', () => {
    const rose = writer(), ruin = writer(), rewritten = writer();
    typeInto(rose, 'rose', 0, 100);
    typeInto(ruin, 'ruin', 0, 100);
    expect(live(rose)[0].seed).toBe(live(ruin)[0].seed); // the same first letter
    expect(live(rose)[1].seed).not.toBe(live(ruin)[1].seed);
    // "rosx", Backspace, "e": the same text as "rose", so the same growth, marked as a revision
    let t = typeInto(rewritten, 'rosx', 0, 100);
    rewritten.keyEvent(t += 100); rewritten.prune(t);
    rewritten.add('e', t += 100, rewritten.keyEvent(t));
    const [a, b] = [live(rose)[3], live(rewritten)[3]];
    expect(b.seed).toBe(a.seed);
    expect(b.els.map((e: any) => e.pts)).toEqual(a.els.map((e: any) => e.pts));
    expect(a.rev).toBe(0);
    expect(b.rev).toBe(1);
  });

  it('records a hesitation inside a word but not before a new word', () => {
    const garden = writer();
    typeInto(garden, 'ro s', 0, i => (i === 2 ? 700 : i === 3 ? 1200 : 100));
    const [r, o, , s] = live(garden);
    expect(r.hes).toBe(0);
    expect(o.hes).toBe(0);
    expect(s.hes).toBe(0); // it starts a new word
    const word = writer();
    typeInto(word, 'ros', 0, i => (i === 2 ? 700 : 100));
    expect(live(word)[2].hes).toBe(700);
  });

  it('judges hesitation against the writer\'s own pace', () => {
    const slow = writer();
    typeInto(slow, 'gardens', 0, 560); // a slow, even typist
    expect(live(slow).filter((l: any) => l.hes).length).toBeLessThanOrEqual(1);
    typeInto(slow, 'x', 7 * 560 + 2000, 0); // then a real hesitation, long even for them
    expect(live(slow)[7].hes).toBe(2000 + 560);
  });

  it('draws back the end-of-word growth when its space is deleted instead of dropping it', () => {
    const garden = writer();
    const t = typeInto(garden, 'rose ', 0, 100);
    const e = live(garden)[3];
    expect(e.endEls.length).toBeGreaterThan(0);
    garden.keyEvent(t + 500); garden.prune(t + 500);
    expect(e.endEls.length).toBeGreaterThan(0);
    expect(garden.endK(e, t + 500, 650)).toBe(1);
    expect(garden.endK(e, t + 500 + 650, 650)).toBe(0);
  });
});

describe('Standalone TypeGardenApp rose density', () => {
  it('leaves out generated side branches with their flowers, keeping each rose-bearing root', () => {
    const garden = app();
    const parameters = { ...garden.wordParams(777), w: 0.55, roseP: 0.55 };
    let branches = 0, roots = 0;
    for (let seed = 1; seed <= 120; seed++) {
      const elements: any[] = [];
      let nextId = seed * 100;
      garden.grow(garden.rng(seed), elements, () => nextId++, parameters, { base: [0, -0.3], dir: -Math.PI / 2, len: 1.15, d0: 0, tip: 'rose' });
      const root = elements.find(element => element.t === 'stem' && !element.par);
      const flower = elements.find(element => element.t === 'rose' && element.stem === root);
      if (!garden.roseDropped(flower)) {
        roots++;
        expect(garden.thinned(root, elements)).toBe(false);
        expect(garden.vineShown(flower, elements)).toBe(flower);
      }
      for (const stalk of elements.filter(element => element.t === 'stem' && element.par && !element.companion)) {
        branches++;
        expect(garden.thinned(stalk, elements)).toBe(true);
        for (const element of elements.filter(e => e.stem === stalk)) expect(garden.vineShown(element, elements)).toBeNull();
      }
    }
    expect(roots).toBeGreaterThan(0);
    expect(branches).toBeGreaterThan(0);
  });

  it('opens a full hero rose at the start of every word', () => {
    const garden = writer();
    typeInto(garden, 'in bloom red roses grow here through quiet words', 0, 120);
    const starts = live(garden).filter((letter: any) => letter.wi === 0);
    expect(starts).toHaveLength(9);
    for (const letter of starts) {
      const hero = letter.els.find((element: any) => element.t === 'rose' && element.stage === 'full' && !element.stem.companion);
      expect(hero).toBeDefined();
      expect(garden.vineShown(hero, letter.els)).toBe(hero);
      expect(hero.bloom).toBeUndefined(); // it doesn't wait on the pause clocks
    }
  });

  it('flanks each hero rose with two buds and a partly open rose on stalks branching from its stem', () => {
    const garden = writer();
    typeInto(garden, 'in bloom', 0, 120);
    for (const letter of live(garden).filter((letter: any) => letter.wi === 0)) {
      const hero = letter.els.find((element: any) => element.t === 'rose' && element.stage === 'full' && !element.stem.companion);
      garden.genCluster(letter);
      const grown = letter.clusterEls.filter((element: any) => element.t === 'rose');
      expect(grown).toHaveLength(6); // three more satellites are grown for a garden given richer clusters...
      const roses = grown.filter((rose: any) => garden.vineShown(rose, letter.clusterEls)); // ...and are hidden at the neutral setting
      expect(roses.map((rose: any) => rose.stage)).toEqual(['bud', 'bud', 'half']);
      for (const rose of roses) {
        const stalk = rose.stem;
        expect(stalk.par).toBe(hero.stem);
        const [attachment] = garden.at(hero.stem.pts, stalk.pu);
        expect(Array.from(stalk.pts[0])).toEqual(Array.from(attachment));
        expect(Array.from(stalk.pts[stalk.pts.length - 1])).toEqual([rose.x, rose.y]);
        expect(rose.R).toBeLessThan(hero.R);
        expect(garden.vineShown(rose, letter.clusterEls)).toBe(rose);
      }
      expect(garden.letterLists(letter, true)[0]).toBe(letter.clusterEls); // drawn first, behind their hero
    }
  });

  it('gathers a bud, a partly open rose and another bud around an earned bloom as it opens, and none for a question', () => {
    const garden = app();
    garden.REC = { cluster: 3 };
    const make = (kind: string) => {
      const stem = { pts: Array.from({ length: 19 }, (_, i) => [0, -i * 0.03]) };
      return { letter: { id: 42, bloomEls: [] as any[] }, flower: { id: 4299.2, R: 0.15, stem, bloom: { at: 0, end: null, kind } } as any };
    };
    const { letter, flower } = make('word');
    garden.growCluster(letter, flower, 2000, 100);
    expect(letter.bloomEls).toHaveLength(0);
    garden.growCluster(letter, flower, 3000, 120);
    expect(letter.bloomEls).toHaveLength(2); // a stalk and its rose
    expect(letter.bloomEls[0].d0).toBe(120); // each stalk starts growing when its rose is earned
    garden.growCluster(letter, flower, 9000, 300);
    const roses = letter.bloomEls.filter((e: any) => e.t === 'rose');
    expect(roses.map((r: any) => r.stage)).toEqual(['bud', 'half', 'bud']);
    expect(roses.every((r: any) => r.cluster && r.bloom === flower.bloom)).toBe(true);
    const question = make('ask');
    garden.growCluster(question.letter, question.flower, 9000, 300);
    expect(question.letter.bloomEls).toHaveLength(0);
  });

  it('gathers five smaller mixed roses on connected stalks without duplicating them or crossing letter IDs', () => {
    const garden = app();
    garden.REC = { cluster: 5 };
    const stem = { t: 'stem', id: 4299, pts: Array.from({ length: 19 }, (_, i) => [0, -i * 0.03]) };
    const flower = { t: 'rose', id: 4299.2, R: 0.15, stem, bloom: { at: 0, end: null, kind: 'word' } };
    const letter = { id: 42, bloomEls: [stem, { t: 'leaf', id: 4299.1 }, flower] as any[] };
    garden.growCluster(letter, flower, 9000, 300);
    const roses = letter.bloomEls.filter((element: any) => element.cluster);
    expect(roses.map((rose: any) => rose.stage)).toEqual(['bud', 'half', 'bud', 'half', 'full']);
    expect(new Set(letter.bloomEls.map((element: any) => element.id)).size).toBe(letter.bloomEls.length);
    expect(new Set(roses.map((rose: any) => rose.stem.pts[0][1])).size).toBe(5);
    for (const rose of roses) {
      expect(rose.R).toBeGreaterThan(0);
      expect(rose.R).toBeLessThan(flower.R);
      expect(rose.bloom).toBe(flower.bloom);
      expect(rose.stem.pts.every((point: number[]) => point.every(Number.isFinite))).toBe(true);
      const first = rose.stem.pts[0], last = rose.stem.pts[rose.stem.pts.length - 1];
      expect(first[0]).toBe(0);
      expect(first[1]).toBeGreaterThanOrEqual(-0.54);
      expect(first[1]).toBeLessThanOrEqual(0);
      expect(Array.from(last)).toEqual([rose.x, rose.y]);
      for (const id of [rose.id, rose.stem.id]) {
        expect(id).toBeGreaterThan(flower.id);
        expect(id).toBeLessThan((letter.id + 1) * 100);
      }
    }
    const grown = [...letter.bloomEls];
    garden.growCluster(letter, flower, 12000, 800);
    garden.growCluster(letter, flower, 4000, 900);
    expect(letter.bloomEls).toEqual(grown);
    expect(letter.bloomEls.every((element: any, index: number) => element === grown[index])).toBe(true);
  });

  it('shares the earned pause across the larger cluster and holds every rose when typing resumes', () => {
    const garden = writer();
    garden.REC.cluster = 5;
    const last = typeInto(garden, 'rose', 0, 120);
    garden.checkSprout(last + 1000);
    const letter = live(garden)[3];
    letter.bloomEls = [];
    const flower = { id: letter.id * 100 + 99.2, R: 0.15, stem: { pts: Array.from({ length: 19 }, (_, i) => [0, -i * 0.03]) }, bloom: letter.bloom };
    garden.growCluster(letter, flower, 9000, 300);
    const roses = letter.bloomEls.filter((element: any) => element.cluster);
    expect(roses).toHaveLength(5);
    for (const rose of roses) {
      expect(rose.bloom).toBe(letter.bloom);
      expect(garden.bloomAge(rose, 2000, 9000)).toBeGreaterThan(garden.bloomAge(rose, 1500, 8500));
    }
    garden.keyEvent(10000);
    expect(letter.bloom.end).toBe(10000);
    for (const rose of roses) {
      const held = garden.bloomAge(rose, 3000, 11000);
      expect(garden.bloomAge(rose, 9000, 17000)).toBe(held);
      expect(garden.bloomFrozen(rose, 9000)).toBe(true);
      expect(garden.bloomState(rose, garden.bloomAge(rose, 9000, 17000))).toEqual(garden.bloomState(rose, held));
    }
    garden.growCluster(letter, flower, 9000, 900);
    expect(letter.bloomEls.filter((element: any) => element.cluster)).toHaveLength(5);
  });
});

describe('Standalone TypeGardenApp separate rose heads', () => {
  const stalk = (id: number, x: number, y: number, extra = {}) => ({
    t: 'stem', id, pts: Array.from({ length: 19 }, (_, i) => [x * i / 18, y * i / 18]), d0: 0, dur: 600, par: null, keep: true, ...extra,
  });
  const rose = (id: number, stem: any, stage: string, R: number, extra = {}) => {
    const tip = stem.pts[stem.pts.length - 1];
    return { t: 'rose', id, x: tip[0], y: tip[1], R, rot: 0, ph1: 0, ph2: 0, stage, layer: 1, d0: 0, stem, su: 1, ...extra } as any;
  };
  function fixture() {
    const garden = Object.assign(writer(), { reduced: true });
    const mainStem = stalk(100, 0, -1.05), sideStem = stalk(200, 0.1, -1.0);
    const full = rose(101, mainStem, 'full', 0.23, { bloom: { at: 1000, end: null, kind: 'word' } });
    const half = rose(201, sideStem, 'half', 0.15);
    const [leafPoint, leafAngle] = garden.at(sideStem.pts, 0.55);
    const leaf = { t: 'leaf', id: 250, x: leafPoint[0], y: leafPoint[1], a: leafAngle, layer: 1, L: 0.1, bend: 0.5, d0: 0, stem: sideStem, su: 0.55 };
    const letter: any = { ch: 'o', id: 1, x: 100, y: 220, birth: 0, els: [mainStem, full, sideStem, half, leaf], wrapEls: [], markEls: [] };
    return { garden, letter, full, half, leaf, sideStem, mainStem };
  }
  // heads in em, from where each letter is going (tx, ty) or else where it is
  const head = (garden: any, e: any, l: any) => garden.roseFootprint(e, (l.tx ?? l.x) / 100, (l.ty ?? l.y) / 100);
  const gap = (garden: any, a: any, al: any, b: any, bl: any) => {
    const p = head(garden, a, al), q = head(garden, b, bl);
    return Math.hypot(p.x - q.x, p.y - q.y) - p.r - q.r;
  };

  it('moves an overlapping half-open rose just clear of the full bloom, keeping its stalk, leaves and pose', () => {
    const { garden, letter, full, half, leaf, sideStem } = fixture();
    const elements = [...letter.els], fullPosition = [full.x, full.y], base = [...sideStem.pts[0]], aim = garden.roseAim(half);
    const overlap = gap(garden, full, letter, half, letter), before = head(garden, half, letter);
    expect(overlap).toBeLessThan(0); // the reported collision
    garden.separateRoses([letter], 100);
    expect(letter.els.every((element: any, i: number) => element === elements[i])).toBe(true); // nothing removed or replaced
    expect([full.x, full.y]).toEqual(fullPosition);
    // clear by a hairline, and moved no further than that: straight out from the full bloom by the depth of the overlap
    expect(gap(garden, full, letter, half, letter)).toBeCloseTo(0.015, 5);
    const after = head(garden, half, letter);
    expect(Math.hypot(after.x - before.x, after.y - before.y)).toBeCloseTo(0.015 - overlap, 5);
    expect(Array.from(sideStem.pts[0])).toEqual(base);
    expect(Array.from(sideStem.pts[sideStem.pts.length - 1])).toEqual([half.x, half.y]);
    const [leafAfter] = garden.at(sideStem.pts, leaf.su);
    expect([leaf.x, leaf.y]).toEqual(Array.from(leafAfter));
    expect(garden.roseAim(half)).toBe(aim);
    expect([full.stage, half.stage]).toEqual(['full', 'half']);
  });

  it('moves a smaller full bloom off a larger one by the least distance, the larger keeping its place', () => {
    const { garden, letter, full } = fixture();
    const stem = stalk(500, 0.05, -1), second = rose(501, stem, 'full', 0.12);
    letter.els.push(stem, second);
    const overlap = gap(garden, full, letter, second, letter), before = head(garden, second, letter);
    expect(overlap).toBeLessThan(0); // stacked
    const fullPosition = [full.x, full.y], count = letter.els.length, base = [...stem.pts[0]];
    garden.separateRoses([letter], 100);
    expect([full.x, full.y]).toEqual(fullPosition);
    expect(letter.els).toHaveLength(count);
    expect(Array.from(stem.pts[0])).toEqual(base); // still growing from the same point
    expect(Array.from(stem.pts[stem.pts.length - 1])).toEqual([second.x, second.y]);
    expect(gap(garden, full, letter, second, letter)).toBeCloseTo(0.015, 5);
    const after = head(garden, second, letter);
    expect(Math.hypot(after.x - before.x, after.y - before.y)).toBeCloseTo(0.015 - overlap, 5);
    const positions = JSON.stringify(letter.els);
    garden.separateRoses([letter], 100);
    expect(JSON.stringify(letter.els)).toBe(positions);
  });

  it('keeps roses already on screen in place when a newcomer arrives, and never moves a rose riding a coil', () => {
    const { garden, letter, full, half } = fixture();
    garden.separateRoses([letter], 100);
    const settled = [half.x, half.y], fullPosition = [full.x, full.y];
    // a full bloom that arrives later right where the half-open rose now sits makes room itself
    const stem = stalk(600, half.x, half.y), late = rose(601, stem, 'full', 0.2);
    letter.els.push(stem, late);
    garden.separateRoses([letter], 100);
    expect([half.x, half.y]).toEqual(settled);
    expect([full.x, full.y]).toEqual(fullPosition);
    for (const other of [full, half]) expect(gap(garden, late, letter, other, letter)).toBeGreaterThan(0.015 - 1e-6);
    // a rose on a coil can't leave it: the bud beside it moves instead
    const n = 30, coil = {
      t: 'stem', id: 700, nW: 20, wrap: { c: Array(n).fill(0), ph: Array(n).fill(0) }, d0: 0, dur: 600, par: null,
      pts: Array.from({ length: n }, (_, i) => [0.04 * Math.sin(i), -i * 0.03]),
    };
    const riding = { ...rose(701, coil, 'half', 0.1), wi: 10, su: 10 / (n - 1), x: coil.pts[10][0], y: coil.pts[10][1] };
    const budStem = stalk(800, coil.pts[10][0] + 0.05, coil.pts[10][1]), bud = rose(801, budStem, 'bud', 0.1);
    const other: any = { ch: 'l', id: 2, x: 100, y: 220, birth: 0, els: [budStem, bud], wrapEls: [coil, riding], markEls: [] };
    expect(gap(garden, riding, other, bud, other)).toBeLessThan(0);
    const coilPoints = coil.pts, ridingPosition = [riding.x, riding.y];
    garden.separateRoses([other], 100);
    expect(coil.pts).toBe(coilPoints);
    expect([riding.x, riding.y]).toEqual(ridingPosition);
    expect(gap(garden, riding, other, bud, other)).toBeCloseTo(0.015, 5);
  });

  it('places heads for where the letters are going, and puts a stalk back as it grew once the crowd clears', () => {
    const garden = Object.assign(writer(), { reduced: true });
    const sideStem = stalk(200, 0.3, -1.0), half = rose(201, sideStem, 'half', 0.15);
    const [leafPoint, leafAngle] = garden.at(sideStem.pts, 0.55);
    const leaf = { t: 'leaf', id: 250, x: leafPoint[0], y: leafPoint[1], a: leafAngle, layer: 1, L: 0.1, bend: 0.5, d0: 0, stem: sideStem, su: 0.55 };
    const letter: any = { ch: 'o', id: 1, x: 100, y: 220, tx: 100, ty: 220, birth: 0, els: [sideStem, half, leaf], wrapEls: [], markEls: [] };
    const neighborStem = stalk(400, -0.1, -1.0), neighborFull = rose(401, neighborStem, 'full', 0.23);
    // the neighbour is still easing in from far off, but is headed for x = 150, where its bloom overlaps the half-open rose
    const neighbor: any = { ch: 'n', id: 2, x: 600, y: 220, tx: 150, ty: 220, birth: 0, els: [neighborStem, neighborFull], wrapEls: [], markEls: [] };
    const grown = sideStem.pts, original = [half.x, half.y, leaf.x, leaf.y, leaf.a];
    expect(gap(garden, half, letter, neighborFull, neighbor)).toBeLessThan(0);
    garden.separateRoses([letter, neighbor], 100);
    expect(gap(garden, half, letter, neighborFull, neighbor)).toBeCloseTo(0.015, 5);
    expect([neighborFull.x, neighborFull.y]).toEqual([-0.1, -1.0]); // the full bloom keeps its place
    // easing frames move nothing
    const positions = JSON.stringify([letter.els, neighbor.els]);
    for (const x of [400, 250, 170, 150]) {
      neighbor.x = x;
      garden.separateRoses([letter, neighbor], 100);
      expect(JSON.stringify([letter.els, neighbor.els])).toBe(positions);
    }
    // pruned: the half-open rose goes back exactly where it grew, with its leaf
    neighbor.dead = 1;
    garden.separateRoses([letter, neighbor], 100);
    expect(sideStem.pts).toBe(grown);
    expect([half.x, half.y, leaf.x, leaf.y, leaf.a]).toEqual(original);
  });

  it('keeps a child shoot attached and its flower in place while moving its parent stalk', () => {
    const { garden, letter, sideStem } = fixture();
    const [attachment] = garden.at(sideStem.pts, 0.5);
    const childStem: any = {
      t: 'stem', id: 300, par: sideStem, pu: 0.5, d0: 0, dur: 500, keep: true,
      pts: Array.from({ length: 19 }, (_, i) => [attachment[0] + (1.6 - attachment[0]) * i / 18, attachment[1] + (-1.7 - attachment[1]) * i / 18]),
    };
    childStem.pts[childStem.pts.length - 1] = [1.6, -1.7];
    const child = rose(301, childStem, 'full', 0.16);
    letter.els.push(childStem, child);
    const childTip = [child.x, child.y], childAim = garden.roseAim(child);
    garden.separateRoses([letter], 100);
    const [parentAfter] = garden.at(sideStem.pts, childStem.pu);
    expect(Array.from(childStem.pts[0])).toEqual(Array.from(parentAfter));
    expect(Array.from(childStem.pts[childStem.pts.length - 1])).toEqual(childTip);
    expect([child.x, child.y]).toEqual(childTip);
    expect(garden.roseAim(child)).toBe(childAim);
  });

  it('bends only the part of a coiled vine that leaves the letter', () => {
    const garden = Object.assign(writer(), { reduced: true });
    const n = 30, nW = 20;
    const pts = Array.from({ length: n }, (_, i) => [0.05 * Math.sin(i) + Math.max(0, i - nW + 1) * 0.02, -i * 0.04]);
    const coil = { t: 'stem', id: 700, pts, nW, wrap: { c: Array(n).fill(0), ph: Array(n).fill(0) }, d0: 0, dur: 600, par: null };
    const top = rose(701, coil, 'half', 0.15);
    const blockStem = stalk(800, 0.02, -1.2), blocker = rose(801, blockStem, 'full', 0.25);
    const letter: any = { ch: 'l', id: 3, x: 100, y: 220, birth: 0, els: [blockStem, blocker], wrapEls: [coil, top], markEls: [] };
    expect(gap(garden, blocker, letter, top, letter)).toBeLessThan(0);
    garden.separateRoses([letter], 100);
    expect(gap(garden, blocker, letter, top, letter)).toBeCloseTo(0.015, 5);
    for (let i = 0; i < nW; i++) expect(Array.from(coil.pts[i])).toEqual(pts[i]); // the coil round the letter stays put
    expect(Array.from(coil.pts[n - 1])).toEqual([top.x, top.y]);
  });

  it('uses the displaced head for butterfly clicks while retaining sprites, blood and crisp letter positions', () => {
    const { garden, letter, full, half } = fixture();
    const foliage = { width: 120, height: 80 }, sprite = { cv: { width: 40, height: 50 } };
    const stainCache = { cv: { width: 30, height: 40 } }, stain = { l: letter, lx: 0.02, ly: -0.7, runs: [{ len: 0.2 }] };
    const bite = { t: 9000, next: 9250, n: 1, max: 5 };
    letter._plantCache = { 0: { cv: foliage } }; letter._stainCache = stainCache; half._spr = sprite;
    Object.assign(garden, { letters: [letter], stains: [stain], bites: { [half.id]: bite }, _blooms: {},
      fa: {}, W: 800, H: 600, Sd: 100, inkBelow: () => false, faceTurn: () => null, roseCustomized: vi.fn() });
    const textPosition = [letter.x, letter.y, letter.ch];
    garden.separateRoses([letter], 100);
    expect(letter._plantCache).toBeNull(); // its stalk changed shape, so the stamped foliage is redrawn
    expect(foliage).toEqual({ width: 0, height: 0 });
    expect(half._spr).toBe(sprite);
    expect(sprite.cv).toEqual({ width: 40, height: 50 });
    expect(letter._stainCache).toBe(stainCache);
    expect(garden.stains[0]).toBe(stain);
    expect(garden.bites[half.id]).toBe(bite);
    expect([letter.x, letter.y, letter.ch]).toEqual(textPosition);
    for (const flower of [full, half]) garden.drawElCustomized({}, flower, letter, 5000, 1, { S: 100, face: true, vine: true }, 0, 0);
    expect(garden.perch.map((perch: any) => perch.id).sort()).toEqual([full.id, half.id].sort());
    const bloom = garden._blooms[half.id];
    expect(bloom).toBeDefined();
    expect(garden.roseCustomized.mock.calls.find((call: any[]) => call[5] === half).slice(1, 3)).toEqual([letter.x + half.x * 100, letter.y + half.y * 100]);
    garden.callVisitor(bloom.x, bloom.y);
    expect(garden.flies).toHaveLength(1);
    expect(garden.flies[0].pid).toBe(half.id);
    garden.biteRose(half.id, 11000);
    expect(garden.bites[half.id]).toBe(bite);
    expect(garden.stains[0]).toBe(stain);
  });
});

describe('Standalone TypeGardenApp retained butterfly interaction', () => {
  // Exercise the actual pointer handler registered by init, without booting the animation loop or DOM.
  const pointerBody = inlineScript.match(/this\.appEl\.addEventListener\('pointerdown', e => \{([\s\S]*?)\n\s*\}\);/)?.[1];
  if (!pointerBody) throw new Error('Cannot find the garden pointer handler.');
  const pointerDown = runInNewContext(`(function(e) {${pointerBody}})`);

  it('lets a click on a visible ambient rose call a butterfly to that rose', () => {
    const garden = Object.assign(writer(), {
      fa: {}, mx: null, my: null, _blooms: {}, W: 800, H: 600, Sd: 100,
      cv: { tagName: 'CANVAS' }, focus: vi.fn(), inkBelow: (x: number) => x > 500, roseCustomized: vi.fn(),
    });
    const letter = { ch: 'r', x: 100, y: 120, els: [], birth: 8000 };
    const rose = {
      t: 'rose', id: 17, x: 0, y: -0.9, R: 0.1, rot: 0, ph1: 0, ph2: 0,
      stage: 'bud', cap: 1500, amb: true, d0: 0,
    };
    garden.letters = [letter];
    garden.drawElCustomized({}, rose, letter, 2000, 1, { S: 100, face: true, vine: true }, 0, 0);
    expect(garden.perch).toHaveLength(1);
    expect(garden.perch[0].id).toBe(17);
    expect(garden._blooms[17]).toBeDefined();
    // Automatic visitors prefer the distant rose over the text; an explicit click should reach this rose instead.
    garden.perch.push({ id: 18, x: 550, y: 30, R: 10 });

    pointerDown.call(garden, { target: garden.cv, clientX: 100, clientY: 30 });
    expect(garden.focus).toHaveBeenCalledOnce();
    expect(garden.flies).toHaveLength(1);
    expect(garden.flies[0]).toMatchObject({ pid: 17, st: 'fly' });

    pointerDown.call(garden, { target: garden.cv, clientX: 100, clientY: 30 });
    expect(garden.flies).toHaveLength(1); // the occupied rose keeps its existing visitor

    pointerDown.call(garden, { target: { tagName: 'BUTTON' }, clientX: 100, clientY: 30 });
    expect(garden.flies).toHaveLength(1);
  });

  it('freezes a pause bloom when typing resumes while the called butterfly keeps approaching', () => {
    const garden = Object.assign(writer(), {
      W: 800, H: 600, Sd: 100, inkBelow: () => false,
    });
    const last = typeInto(garden, 'rose', 0, 120);
    garden.checkSprout(last + 1000);
    const tip = live(garden)[3];
    garden.perch = [{ id: 17, x: 100, y: 30, R: 10 }];
    garden.spawnFly(100, 30);
    const visitor = garden.flies[0];

    garden.add(' ', last + 2500, garden.keyEvent(last + 2500));
    expect(tip.bloom.end).toBe(last + 2500);
    const flower = { bloom: tip.bloom };
    const held = garden.bloomAge(flower, 8500, 10000);
    expect(held).toBeGreaterThan(garden.REC.emerge);
    expect(garden.bloomAge(flower, 13500, 15000)).toBe(held);
    expect(garden.flies[0]).toBe(visitor);
    expect(visitor).toMatchObject({ pid: 17, st: 'fly' });
  });

  it('keeps automatic visitors preferring a free rose above the text', () => {
    const garden = Object.assign(writer(), {
      W: 800, H: 600, Sd: 100, inkBelow: (x: number) => x > 500,
      perch: [{ id: 17, x: 100, y: 30, R: 10 }, { id: 18, x: 550, y: 30, R: 10 }],
    });
    garden.spawnFly(100, 30);
    expect(garden.flies[0]).toMatchObject({ pid: 18, st: 'fly' });
  });

  it('keeps all six visitors when an occupied rose is clicked again', () => {
    const garden = Object.assign(writer(), {
      W: 800, H: 600, Sd: 100, cv: { tagName: 'CANVAS' }, focus: vi.fn(), inkBelow: () => false,
      perch: [{ id: 17, x: 100, y: 30, R: 10 }],
      flies: Array.from({ length: 6 }, (_, i) => ({ pid: i === 5 ? 17 : 100 + i, st: 'fly', x: 20, y: 20 })),
    });
    pointerDown.call(garden, { target: garden.cv, clientX: 100, clientY: 30 });
    expect(garden.flies).toHaveLength(6);
    expect(garden.flies.every((visitor: any) => visitor.st === 'fly')).toBe(true);
  });
});

describe('Standalone TypeGardenApp retained blood splatter', () => {
  it('sheds a finite burst after a bite, then stops producing drops', () => {
    const garden = Object.assign(writer(), {
      _blooms: { 5: { x: 100, y: 30, R: 10, stage: 'half' } }, inkBelow: () => true,
    });
    garden.biteRose(5, 1000);
    const bite = garden.bites[5];
    expect(bite).toMatchObject({ t: 1000, next: 1250, n: 0 });
    expect(bite.max).toBeGreaterThanOrEqual(4);
    expect(bite.max).toBeLessThanOrEqual(6);
    garden.biteRose(5, 2000);
    expect(garden.bites[5]).toBe(bite);

    for (let i = 0; i <= bite.max; i++) garden.bloodStep(1250 + i * 2000, 0, 100, []);
    expect(garden.drops).toHaveLength(bite.max);
    expect(garden.drops.every((drop: any) => drop.st === 'bead' && drop.id === '5')).toBe(true);
    expect(garden.bites[5]).toBeUndefined();
    garden.bloodStep(25000, 0, 100, []);
    expect(garden.drops).toHaveLength(bite.max);
  });

  it('creeps down a letter stroke, then beads and drips from its bottom edge', () => {
    const garden = Object.assign(writer(), { stains: [], inkEnd: () => -0.2, inkAt: () => false });
    const letter = { ch: 'l', x: 20, y: 100 };
    garden.addStain({ l: letter, lx: 0.05, ly: -0.6 }, 0.03, 1000);
    const stain = garden.stains[0];
    expect(stain.runs.length).toBeGreaterThan(0);
    garden.bloodStep(2000, 1, 100, [letter]);
    for (const run of stain.runs) {
      expect(run.len).toBeGreaterThan(0);
      expect(run.len).toBeLessThan(run.y1 - stain.ly);
      expect(run.bead).toBe(0);
      run.len = run.y1 - stain.ly; // advance to the stroke edge
    }
    garden.bloodStep(3000, 0.8, 100, [letter]);
    expect(stain.runs.every((run: any) => run.bead > 0 && !run.dropped)).toBe(true);
    expect(garden.drops).toHaveLength(0);
    garden.bloodStep(4000, 0.8, 100, [letter]);
    expect(stain.runs.every((run: any) => run.dropped)).toBe(true);
    expect(garden.drops.length).toBe(stain.runs.length);
    expect(garden.drops.every((drop: any) => drop.st === 'fall' && drop.id === null)).toBe(true);
    garden.bloodStep(5000, 0, 100, [letter]);
    expect(stain.done).toBe(true);
  });

  it('in the fluid effect, runs down a letter stroke, then pools at its bottom edge and hangs a bead that drips, while liquid is left', () => {
    const garden = Object.assign(writer(), { stains: [], glyphs: { l: stroke() }, bloodFx: FLUID() });
    const letter = { ch: 'l', x: 20, y: 100 };
    garden.addStain({ l: letter, lx: 0.02, ly: -0.6 }, 0.04, 1000);
    const stain = garden.stains[0], run = stain.runs[0];
    expect(stain.r).toBe(0.04); // the first mark on a clean letter keeps its size
    // its way keeps to the ink, a little in from the stroke's sides, and ends at the stroke's bottom edge
    expect(run.path.every(([x, y]: number[]) => garden.inkAt('l', x, y) && Math.abs(x) < 0.08 - run.w / 2)).toBe(true);
    expect([run.edge, run.ledge, run.joined]).toEqual([-0.2, [-0.08, 0.08], false]);
    stain.runs.length = 1; run.reach = run.total + 0.65; // liquid enough to reach the edge and drip twice

    garden.bloodStep(2000, 1, 100, [letter]);
    expect(run.len).toBeGreaterThan(0);
    expect(run.len).toBeLessThan(run.total);
    expect(run.bead).toBeNull();
    let t = 2000;
    while (run.len < run.total && t < 60000) garden.bloodStep(t += 100, 0.1, 100, [letter]);
    expect(run.len).toBe(run.total);
    // at the edge, the bead swells and draws down until it lets go
    let fall: any;
    const shapes: any[] = [];
    while (!fall && t < 60000) {
      garden.bloodStep(t += 100, 0.1, 100, [letter]);
      if (run.bead?.drops === 0) shapes.push(garden.beadShape(run));
      fall = garden.drops.find((drop: any) => drop.st === 'fall' && drop.id === null);
    }
    expect(shapes.length).toBeGreaterThan(5);
    expect(shapes[shapes.length - 1].r).toBeGreaterThan(shapes[0].r);
    expect(shapes[shapes.length - 1].cy - shapes[shapes.length - 1].r).toBeGreaterThan(shapes[0].cy - shapes[0].r);
    expect(fall.x).toBeCloseTo(letter.x + run.end[0] * 100, 9);
    expect(fall.y).toBeGreaterThan(letter.y + run.edge * 100);
    expect(run.bead).toMatchObject({ drops: 1, f: 0.2, snap: 1 }); // what is left springs back and starts again
    while (!stain.done && t < 60000) garden.bloodStep(t += 100, 0.1, 100, [letter]);
    expect(stain.done).toBe(true);
    expect(run.bead.drops).toBe(2);
    expect(run.bead.left).toBeLessThan(0.3);
  });

  it('in the fluid effect, stops partway down when it carries little liquid, its front slowing as it runs out', () => {
    const garden = Object.assign(writer(), { stains: [], glyphs: { l: stroke() }, bloodFx: FLUID() });
    const letter = { ch: 'l', x: 20, y: 100 };
    garden.addStain({ l: letter, lx: 0, ly: -0.7 }, 0.04, 0);
    const stain = garden.stains[0], run = stain.runs[0];
    stain.runs.length = 1; Object.assign(run, { reach: 0.1, stalls: [] });
    expect(run.total).toBeGreaterThan(0.4);
    const steps: number[] = [];
    let t = 0;
    while (!stain.done && t < 30000) { const len = run.len; garden.bloodStep(t += 100, 0.1, 100, [letter]); steps.push(run.len - len); }
    expect(stain.done).toBe(true);
    expect(run.len).toBeCloseTo(0.1, 9);
    expect(run.bead).toBeNull();
    expect(garden.drops).toHaveLength(0);
    const full = steps.filter(step => step > 0).slice(0, -1);
    full.forEach((step, i) => { if (i) expect(step).toBeLessThan(full[i - 1]); });
  });

  it('in the fluid effect, takes an older run\'s wet track where it comes near it, easing over to it and getting farther along it', () => {
    const garden = Object.assign(writer(), { stains: [], glyphs: { l: stroke() }, bloodFx: FLUID() });
    const letter = { ch: 'l', x: 20, y: 100 };
    const old = { l: letter, lx: 0, ly: -0.7, r: 0.04, born: 0, seed: 1, runs: [] as any[], fx: FLUID() };
    garden.addRun(old, 0, 0.0224, 0.5, [], 0.05, garden.rng(3));
    const track = old.runs[0];
    const later = { l: letter, lx: 0.015, ly: -0.68, r: 0.03, born: 1000, seed: 2, runs: [] as any[], fx: FLUID() };
    track.len = 0; // not yet wet: the new run keeps to its own way
    garden.addRun(later, 0, 0.015, 0.3, [old], 0.05, garden.rng(5));
    expect(later.runs[0].joined).toBe(false);
    expect(later.runs[0].reach).toBe(0.3);

    track.len = track.total; // wet all the way down
    later.runs.length = 0;
    garden.addRun(later, 0, 0.015, 0.3, [old], 0.05, garden.rng(5));
    const run = later.runs[0];
    expect(run.joined).toBe(true);
    expect(run.path.slice(-10)).toEqual(track.path.slice(-10));
    expect([run.end, run.edge, run.ledge]).toEqual([track.path[track.path.length - 1], track.edge, track.ledge]);
    expect(run.reach).toBeGreaterThan(0.3); // the wet way lets its liquid go farther
    // no sideways jump onto the track (they start 0.015 em apart): no step aside larger than the track's own meander
    const widest = (path: number[][]) => Math.max(...path.slice(1).map((p, i) => Math.abs(p[0] - path[i][0])));
    expect(widest(run.path)).toBeLessThanOrEqual(widest(track.path));
  });

  it('in the fluid effect, traces a run along a slanting stroke, and stops it where the ink below steps away', () => {
    const garden = Object.assign(writer(), {
      glyphs: {
        '/': glyphRows(k => (k >= -60 && k < 0 ? [[-0.05 + (k + 60) * 0.6 / 80, 0.05 + (k + 60) * 0.6 / 80]] : null)),
        'Z': glyphRows(k => (k >= -60 && k < -30 ? [[-0.1, 0]] : k >= -30 && k < 0 ? [[0.05, 0.15]] : null)),
      },
    });
    const slant = garden.tracePath('/', 0, -0.74, 1, 0.01);
    expect(slant.pts.every(([x, y]: number[]) => garden.inkAt('/', x, y))).toBe(true);
    expect(slant.edge).toBe(0);
    expect(slant.pts[slant.pts.length - 1][0]).toBeGreaterThan(0.3); // carried along with the stroke
    const step = garden.tracePath('Z', -0.05, -0.74, 1, 0.01);
    expect(step.edge).toBe(-30 / 80);
    expect(step.ledge).toEqual([-0.1, 0]);
    expect(step.pts.every(([x, y]: number[]) => x >= -0.1 && x <= 0 && y < -30 / 80)).toBe(true);
  });

  it('in the fluid effect, hangs a bead that swells and stretches on a narrowing neck, and springs back up as a drop lets go', () => {
    const garden = app();
    const run: any = { w: 0.02, end: [0.01, -0.21], edge: -0.2, bead: { f: 0.1, snap: 0 } };
    const small = garden.beadShape(run);
    expect([small.x, small.top]).toEqual([0.01, -0.2]);
    expect(small.cy).toBeCloseTo(-0.2 + small.r * 0.8, 12); // no stretch while it is small
    run.bead.f = 0.95;
    const full = garden.beadShape(run);
    expect(full.r).toBeGreaterThan(small.r);
    expect(full.neck).toBeLessThan(small.neck);
    expect(full.cy - full.r).toBeGreaterThan(small.cy - small.r); // drawn down below the edge
    run.bead.snap = 1;
    expect(garden.beadShape(run).cy).toBeLessThan(full.cy);
  });

  it('in the fluid effect, throws up spray of mixed sizes, the fine droplets faster; those that come down on the letter leave specks', () => {
    const garden = Object.assign(writer(), { stains: [], glyphs: { l: stroke() }, bloodFx: FLUID() });
    const letter = { ch: 'l', x: 20, y: 100 }, S = 100;
    const st = { l: letter, lx: 0, ly: -0.5, r: 0.04, born: 0, seed: 1, runs: [], specks: [] as any[], done: true, fx: FLUID() };
    garden.stains.push(st);
    const spray: any[] = [];
    for (let i = 0; i < 40; i++) {
      garden.drops = [];
      garden.splashSpray({ x: 20, y: 50, r: 2 }, st, S);
      expect(garden.drops.length).toBeGreaterThanOrEqual(2);
      expect(garden.drops.length).toBeLessThanOrEqual(7);
      spray.push(...garden.drops);
    }
    expect(spray.every(d => d.st === 'spray' && d.stain === st && d.vy < 0 && d.r >= 0.16 && d.r <= 1 && d.life >= 0.25 && d.life <= 0.7)).toBe(true);
    const sizes = spray.map(d => d.r).sort((a, b) => a - b), speed = (d: any) => Math.hypot(d.vx, d.vy);
    expect(sizes[sizes.length - 1]).toBeGreaterThan(sizes[0] * 3);
    const bySize = spray.slice().sort((a, b) => a.r - b.r), third = Math.floor(spray.length / 3);
    const mean = (list: any[]) => list.reduce((sum, d) => sum + speed(d), 0) / list.length;
    expect(mean(bySize.slice(0, third))).toBeGreaterThan(mean(bySize.slice(-third)));

    garden.drops = [
      { st: 'spray', x: 20, y: 50, vx: 0, vy: 10, r: 0.6, t: 0.1, life: 0.5, stain: st }, // coming down onto the ink
      { st: 'spray', x: 90, y: 50, vx: 0, vy: 10, r: 0.6, t: 0.1, life: 0.5, stain: st }, // beside the letter
    ];
    garden.bloodStep(1000, 0.01, S, [letter]);
    expect(st.specks).toHaveLength(1);
    expect(st.specks[0].x).toBe(0);
    expect(st.specks[0].s).toBeCloseTo(0.006, 12);
    expect(garden.drops).toHaveLength(1);
    garden.bloodStep(1500, 0.5, S, [letter]);
    expect(garden.drops).toHaveLength(0); // the other has faded out
    expect(garden.stains).toEqual([st]); // spray never starts new splashes
  });

  it('in the fluid effect, keeps most of a wet letter clean: later splashes on it are smaller, with fewer satellites and a single run', () => {
    const garden = Object.assign(writer(), { stains: [], glyphs: { l: stroke() }, bloodFx: FLUID() });
    const letter = { ch: 'l', x: 20, y: 100 };
    garden.addStain({ l: letter, lx: 0, ly: -0.6 }, 0.04, 0);
    expect(garden.stains[0].r).toBe(0.04);
    garden.stains[0].r = 0.2; // a letter already well covered
    for (let i = 0; i < 20; i++) garden.addStain({ l: letter, lx: 0, ly: -0.5 }, 0.04, 1000);
    const later = garden.stains.slice(1);
    expect(later.every((s: any) => Math.abs(s.r - 0.018) < 1e-12 && s.runs.length === 1 && s.specks.length <= 4)).toBe(true);
  });

  it('in the fluid effect, dries from glossy to matte over about 25 s after its liquid last moved, as blood or as see-through ichor', () => {
    const garden = app();
    expect([0, 3000, 25000, 40000].map(t => garden.wetness(0, t))).toEqual([1, 1, 0, 0]);
    expect(garden.wetness(0, 14000)).toBeGreaterThan(0);
    expect(garden.wetness(0, 14000)).toBeLessThan(1);
    expect([garden.liquidTone(0, 0).body, garden.liquidTone(0, 30000).body]).toEqual(['rgba(150,10,22,0.95)', 'rgba(88,8,14,0.95)']);
    Object.assign(garden, { state: { look: 'silver' }, _theme: null }); garden.appearance = { ...garden.look().appearance };
    expect(garden.liquidTone(0, 0).body).toBe('rgba(240,244,252,0.95)');
    const dried = garden.liquidTone(0, 30000);
    expect(dried.a).toBeCloseTo(0.55, 9); // dried ichor lets the letter show through
    expect(dried.edgeRGB).toBe(garden.ICHOR.ichor.rim);
  });

  it('keeps a stain live while its liquid still moves, and settles it once that has been still for 25 s', () => {
    const { garden, context } = stainHarness();
    const letter: any = { ch: 'O', x: 20, y: 100 };
    const stain = { l: letter, done: true, born: 0, runs: [{ wetAt: 20000 }] }; // splashed long ago; its bead only just dripped
    garden.stains = [stain];
    garden.drawLetterStains(context, 30000, 100);
    expect(letter._stainCache).toBeUndefined();
    expect(garden._stainLayer.cg.operations[0].stain).toBe(stain);
    garden.drawLetterStains(context, 46000, 100);
    expect(letter._stainCache.list).toEqual([stain]);
  });

  for (const [effect, bloodFx] of [['legacy', undefined], ['fluid', FLUID()]] as const) it(`accumulates splashes across return visits without restarting earlier trails (${effect})`, () => {
    const letter = { ch: 'O', x: 100, y: 100 };
    const garden = Object.assign(writer(), {
      _blooms: { 5: { x: 100, y: 0, R: 8, stage: 'half' } },
      stains: [], inkBelow: () => true, glyphs: { O: stroke() }, bloodFx,
    });
    let landed = 0;
    let originals: { stain: any; born: number; runs: any[]; lengths: number[] }[] = [];

    for (let visit = 0; visit < 4; visit++) {
      const start = 1000 + visit * 30000;
      garden.biteRose(5, start);
      const bite = garden.bites[5];
      for (let drop = 0; drop < bite.max; drop++) {
        const now = start + 250 + drop * 2000;
        garden.bloodStep(now, 0, 100, [letter]);
        const bead = garden.drops.find((d: any) => d.st === 'bead');
        expect(bead).toBeDefined();
        // Advance this emitted drop to a collision on the same letter, without waiting for its fall.
        Object.assign(bead, { st: 'fall', id: null, x: letter.x, y: letter.y - 60 });
        garden.bloodStep(now + 1, 0, 100, [letter]);
        landed++;
      }
      expect(garden.bites[5]).toBeUndefined(); // each visitor finishes its finite burst
      garden.bloodStep(start + 15000, 0.5, 100, [letter]);
      if (!visit) originals = garden.stains.map((stain: any) => ({
        stain, born: stain.born, runs: stain.runs, lengths: stain.runs.map((run: any) => run.len),
      }));
    }

    expect(landed).toBeGreaterThan(10);
    expect(garden.stains).toHaveLength(landed);
    for (const original of originals) {
      expect(garden.stains).toContain(original.stain);
      expect(original.stain.born).toBe(original.born);
      expect(original.stain.runs).toBe(original.runs);
      expect(original.runs.length).toBeGreaterThan(0);
      original.runs.forEach((run: any, i: number) => {
        expect(run.len).toBeGreaterThanOrEqual(original.lengths[i]); // (a small second fluid run may already have stopped)
        expect(run.dropped || run.bead).toBeFalsy(); // not yet down at the edge
      });
      expect(original.runs[0].len).toBeGreaterThan(original.lengths[0]);
    }
  });

  it('keeps settled stains on the letter while newer splashes and beads stay live', () => {
    const { garden, context } = stainHarness(2);
    const letter: any = { ch: 'O', x: 20, y: 100 };
    const settled = { l: letter, done: true, born: 0 };
    const fresh = { l: letter, done: false, born: 29000 };
    garden.stains = [settled, fresh];
    garden.drawLetterStains(context, 30000, 100);
    const cached = letter._stainCache, scratch = garden._stainLayer;
    expect(cached.cg.operations.map((operation: any) => operation.kind)).toEqual(['stain', 'glyph', 'bead']);
    expect(cached.cg.operations[0].stain).toBe(settled);
    expect(cached.cg.operations[1]).toMatchObject({ text: 'O', operation: 'destination-in' });
    expect(cached.cg.operations[2]).toMatchObject({ stain: settled, operation: 'source-over' });
    expect(scratch.cg.operations.map((operation: any) => operation.kind)).toEqual(['stain', 'glyph']);
    expect(scratch.cg.operations[0].stain).toBe(fresh);
    expect(context.operations.map((operation: any) => operation.kind)).toEqual(['image', 'image', 'bead']);
    expect(context.operations[0].image).toBe(cached.cv);
    expect(context.operations[1].image).toBe(scratch.cv);
    expect(garden.paintStainBeads).toHaveBeenCalledWith(context, letter, fresh, 100, 30000);
    expect(garden.stains).toHaveLength(2);
  });

  it('preserves the original dried splatter when later visits add and dry more marks', () => {
    const { garden, context } = stainHarness();
    const letter: any = { ch: 'O', x: 20, y: 100 };
    garden.stains = [];
    garden.inkEnd = (_ch: string, _x: number, y: number) => y;
    for (let i = 0; i < 10; i++) garden.addStain({ l: letter, lx: i * 0.01, ly: -0.6 }, 0.03, 0);
    const originals = garden.stains.slice();
    garden.drawLetterStains(context, 30000, 100);
    const originalCache = letter._stainCache;

    for (let i = 0; i < 6; i++) garden.addStain({ l: letter, lx: -i * 0.01, ly: -0.5 }, 0.03, 31000);
    const added = garden.stains.slice(originals.length);
    garden.drawLetterStains(context, 32000, 100);
    expect(garden.stains).toHaveLength(16);
    expect(letter._stainCache).toBe(originalCache);
    expect(originalCache.list).toEqual(originals);
    expect(garden._stainLayer.cg.operations.filter((op: any) => op.kind === 'stain').map((op: any) => op.stain)).toEqual(added);

    // Once the new splashes dry, rebuilding the bitmap must still paint all earlier marks.
    garden.drawLetterStains(context, 60000, 100);
    expect(letter._stainCache).not.toBe(originalCache);
    expect(letter._stainCache.list).toEqual([...originals, ...added]);
    expect(letter._stainCache.cg.operations.filter((op: any) => op.kind === 'stain').map((op: any) => op.stain)).toEqual([...originals, ...added]);
    expect(originals.every((stain: any) => stain.born === 0)).toBe(true);
  });

  it('masks splashes with the real glyph font and display transform, then restores normal compositing', () => {
    const { garden } = stainHarness(2);
    const letter = { ch: 'O', x: 20, y: 100 };
    const layer = garden.stainCanvas(letter, 123, 2);
    const stain = { l: letter };
    garden.paintLetterStains(layer, 'O', [stain], 1000);
    const [splash, mask] = layer.cg.operations;
    expect(splash).toMatchObject({ kind: 'stain', stain, operation: 'source-over' });
    expect(mask).toMatchObject({
      kind: 'glyph', text: 'O', x: 0, y: 0, operation: 'destination-in',
      font: `700 123px ${garden.F}`, align: 'center', baseline: 'alphabetic',
      transform: { a: 2, b: 0, c: 0, d: 2, e: -layer.x0 * 2, f: -layer.y0 * 2 },
    });
    expect(layer.cg.globalCompositeOperation).toBe('source-over');
    garden.paintLetterStains(layer, 'O', [stain], 1100);
    expect(layer.cg.operations[2].operation).toBe('source-over');
    expect(layer.cg.clearRect).toHaveBeenCalledWith(0, 0, layer.cv.width, layer.cv.height);
  });

  it('reuses the larger scratch raster while cropping smaller letters to their current display bounds', () => {
    const { garden, context } = stainHarness(2);
    const letter = { ch: 'O', x: 20, y: 100 };
    garden.stains = [{ l: letter, done: false, born: 1000 }];
    garden.drawLetterStains(context, 2000, 100);
    const first = garden._stainLayer, canvas = first.cv;
    expect(canvas.width).toBe(first.cw);
    expect(canvas.height).toBe(first.ch);
    expect(first.w).toBe(first.cw / 2);
    expect(first.h).toBe(first.ch / 2);
    const width = canvas.width, height = canvas.height;

    garden.drawLetterStains(context, 2100, 50);
    const smaller = garden._stainLayer;
    expect(smaller.cv).toBe(canvas);
    expect(smaller.cw).toBeLessThan(width);
    expect(smaller.ch).toBeLessThan(height);
    expect(smaller.cg.clearRect).toHaveBeenLastCalledWith(0, 0, width, height);
    expect(context.drawImage).toHaveBeenLastCalledWith(
      canvas, 0, 0, smaller.cw, smaller.ch,
      letter.x + smaller.x0, letter.y + smaller.y0, smaller.w, smaller.h,
    );
    expect(smaller.cg.operations[smaller.cg.operations.length - 1].font).toBe(`700 50px ${garden.F}`);
  });

  it('reuses settled masks at nearby sizes and rebuilds them when display scale or type size grows', () => {
    const { garden, context } = stainHarness(2);
    const letter: any = { ch: 'O', x: 20, y: 100 };
    const settled = [{ l: letter, done: true, born: 0 }];
    garden.stampStains(context, letter, settled, 100, 30000);
    const first = letter._stainCache, width = first.cv.width;
    garden.stampStains(context, letter, settled, 103, 30100);
    expect(letter._stainCache).toBe(first);
    expect(garden.paintStain).toHaveBeenCalledOnce();

    context.setTransform(3, 0, 0, 3, 0, 0);
    garden.stampStains(context, letter, settled, 100, 30200);
    const sharper = letter._stainCache;
    expect(sharper).not.toBe(first);
    expect(sharper.scale).toBe(3);
    expect(sharper.cv.width).toBeGreaterThan(width);
    expect(sharper.cv.width).toBe(sharper.cw);
    expect(sharper.w).toBe(sharper.cw / 3);
    expect(first.cv.width).toBe(0);

    garden.stampStains(context, letter, settled, 110, 30300);
    expect(letter._stainCache).not.toBe(sharper);
    expect(letter._stainCache.S).toBe(110);
    expect(sharper.cv.width).toBe(0);
    expect(garden.paintStain).toHaveBeenCalledTimes(3);
  });

  it('rebuilds a settled mask when one dried stain replaces another at the same count', () => {
    const { garden, context } = stainHarness();
    const letter: any = { ch: 'O', x: 20, y: 100 };
    const firstStain = { l: letter, done: true, born: 0 };
    const replacement = { l: letter, done: true, born: 1000 };
    garden.stampStains(context, letter, [firstStain], 100, 30000);
    const firstCanvas = letter._stainCache.cv;
    garden.stampStains(context, letter, [replacement], 100, 31000);
    expect(letter._stainCache.cv).not.toBe(firstCanvas);
    expect(firstCanvas.width).toBe(0);
    expect(letter._stainCache.list[0]).toBe(replacement);
    expect(garden.paintStain).toHaveBeenCalledTimes(2);
    expect(garden.paintStain.mock.calls[1][2]).toBe(replacement);
    expect(garden.paintStainBeads.mock.calls[1][2]).toBe(replacement);
  });

  it('forgets a removed bloom\'s bite so a retyped letter can attract a fresh visit', () => {
    const garden = writer();
    const letter = { ch: 'e', els: [], bloomEls: [{ t: 'rose', id: 77 }] };
    garden.biteRose(77, 0);
    garden.releaseLetters([letter]);
    expect(garden.bites[77]).toBeUndefined();
  });

  it('releases a rose\'s bite and sprite when its letter is removed', () => {
    const garden = writer();
    const canvas = { width: 20, height: 20 };
    const flower = { t: 'rose', id: 77.2, _spr: { cv: canvas } };
    const letter = { ch: 'e', els: [flower] };
    garden.biteRose(77.2, 0);
    garden.releaseLetters([letter]);
    expect(garden.bites[77.2]).toBeUndefined();
    expect(flower._spr).toBeNull();
    expect(canvas.width).toBe(0);
    expect(canvas.height).toBe(0);
  });

  it('grows companion roses around a bitten bloom without adding perpetual inherited bites', () => {
    const garden = writer();
    garden.REC.cluster = 3;
    const stem = { pts: Array.from({ length: 19 }, (_, i) => [0, -i * 0.03]) };
    const letter = { id: 42, bloomEls: [] as any[] };
    const flower = { id: 5.2, R: 0.15, stem, bloom: { at: 0, end: null, kind: 'word' } };
    garden.biteRose(flower.id, 1000);
    const bite = garden.bites[flower.id];
    garden.growCluster(letter, flower, 9000, 300);
    const roses = letter.bloomEls.filter((element: any) => element.t === 'rose');
    expect(roses).toHaveLength(3);
    expect(roses.every((rose: any) => !garden.bites[rose.id])).toBe(true);
    expect(garden.bites[flower.id]).toBe(bite);
    expect(bite.max).toBeGreaterThanOrEqual(4);
    expect(bite.max).toBeLessThanOrEqual(6);
  });
});

describe('Standalone TypeGardenApp bleeding effects', () => {
  const letter = { ch: 'l', x: 20, y: 100 };
  // a garden whose letters are upright strokes, bleeding in the legacy effect with `patch`, its splashes left in place
  const bleeding = (patch: Record<string, number> = {}) => Object.assign(writer(), { stains: [], drops: [], H: 1e9, glyphs: { l: stroke() }, bloodFx: LEGACY(patch) });
  const settle = (garden: any, st: any) => { let t = 0; while (!st.done && t < 120000) garden.bloodStep(t += 100, 0.1, 100, [letter]); };
  const falls = (garden: any) => garden.drops.filter((d: any) => d.st === 'fall' && d.id === null).length;

  it('bleeds in the legacy effect unless another is chosen, and each splash keeps the effect it was made with', () => {
    const garden = Object.assign(writer(), { stains: [], glyphs: { l: stroke() }, paintStainLegacy: vi.fn(), paintStainFluid: vi.fn() });
    expect([garden.bleed(), garden.fx()]).toEqual(['legacy', garden.BLEEDS[0].fx]);
    const old = garden.addStain({ l: letter, lx: 0, ly: -0.7 }, 0.04, 0);
    expect(old.fx.style).toBe('legacy');
    expect(old.runs.every((run: any) => run.y1 === -0.2 && !run.path)).toBe(true); // straight down to the stroke's bottom edge
    expect(garden.setBleed('fluid')).toBe(true);
    expect(garden.setBleed('fluid')).toBe(false); // (already in use)
    expect(garden.setBleed('watercolour')).toBe(false);
    const fresh = garden.addStain({ l: letter, lx: 0, ly: -0.5 }, 0.04, 1000);
    expect(fresh.fx.style).toBe('fluid');
    expect(fresh.runs.length && fresh.runs.every((run: any) => run.path)).toBeTruthy();
    garden.bloodStep(2000, 1, 100, [letter]);
    expect(old.runs[0].len).toBeGreaterThan(0); // the older splash's trails creep on in their own way
    for (const st of [old, fresh]) garden.paintStain({}, letter, st, 100, 2000);
    expect(garden.paintStainLegacy.mock.calls.map((call: any) => call[2])).toEqual([old]);
    expect(garden.paintStainFluid.mock.calls.map((call: any) => call[2])).toEqual([fresh]);
  });

  it('builds a custom effect from the one showing, on either trail style, each change a new effect', () => {
    const garden = writer();
    garden.setBleed('custom'); // nothing built yet: it starts from the effect showing
    expect([garden.bleed(), garden.fx()]).toEqual(['custom', garden.BLEEDS[0].fx]);
    expect(garden.fx()).not.toBe(garden.BLEEDS[0].fx);
    garden.setBleed('fluid');
    expect(garden.editBleed({ trails: 3, thick: 99, nonsense: 5 })).toBe(true);
    const custom = garden.fx();
    expect(garden.bleed()).toBe('custom');
    expect(custom).toEqual({ ...FLUID(), trails: 3, thick: 2.5 }); // from the fluid effect showing, kept within each control's range
    expect(garden.customBleed).toBe(custom);
    expect(garden.BLEEDS[1].fx).toEqual(FLUID()); // the preset itself is untouched
    expect(garden.editBleed({ trails: 3 })).toBe(false);
    expect(garden.editBleed({ style: 'legacy' })).toBe(false); // (a control edit never changes the trail style)
    garden.editBleed({ pool: 1.5 });
    expect(garden.fx()).not.toBe(custom); // (splashes made with the earlier one keep it)
    const mine = garden.fx();
    garden.setBleed('legacy');
    expect(garden.fx()).toBe(garden.BLEEDS[0].fx);
    garden.setBleed('custom'); // the visitor's own comes back
    expect(garden.fx()).toBe(mine);
    // choosing a trail style starts the custom effect over from that style's own values, never a mix of the two
    expect(garden.baseBleed('legacy')).toBe(true);
    expect([garden.bleed(), garden.fx(), garden.customBleed]).toEqual(['custom', LEGACY(), garden.fx()]);
    expect(garden.fx()).not.toBe(garden.BLEEDS[0].fx);
    garden.editBleed({ trails: 2 });
    expect(garden.baseBleed('legacy')).toBe(true); // the style in use again: back to its own values
    expect(garden.fx()).toEqual(LEGACY());
    garden.baseBleed('fluid');
    expect(garden.fx()).toEqual(FLUID());
    expect(garden.baseBleed('watercolour')).toBe(false);
  });

  it('bleeds more or less from each bite with the amount', () => {
    for (const [amount, lo, hi] of [[1, 4, 6], [2, 8, 12], [0.25, 1, 2]]) {
      const garden = Object.assign(writer(), { bloodFx: LEGACY({ amount }) });
      garden.biteRose(5, 0);
      expect(garden.bites[5].max).toBeGreaterThanOrEqual(lo);
      expect(garden.bites[5].max).toBeLessThanOrEqual(hi);
    }
  });

  it('in the legacy style, sets how many trails a splash has, how thick, and how straight they run', () => {
    const splash = (patch: Record<string, number>) => { const garden = bleeding(patch); return garden.addStain({ l: letter, lx: 0, ly: -0.7 }, 0.04, 0); };
    expect(splash({ trails: 3 }).runs).toHaveLength(3);
    expect(splash({ trails: 0 })).toMatchObject({ runs: [], done: true });
    expect(splash({ trails: 1, thick: 2 }).runs.map((run: any) => run.w)).toEqual([0.04]);
    expect(Math.abs(splash({ trails: 1, wander: 0 }).runs[0].wob)).toBe(0);
    expect(splash({ splatSize: 1.5 }).r).toBeCloseTo(0.06, 12);
  });

  it('in the legacy style, short trails stop on the way down, and the beads drip as many times as there are beads', () => {
    let garden = bleeding({ trails: 1, length: 0.4 });
    const short = garden.addStain({ l: letter, lx: 0, ly: -0.7 }, 0.04, 0);
    settle(garden, short);
    const run = short.runs[0];
    expect(run.len).toBeLessThan(run.y1 - short.ly);
    expect([run.bead, run.dropped, falls(garden)]).toEqual([0, false, 0]);
    for (const [beads, drips] of [[1, 1], [2, 2], [3, 3], [0, 0]]) {
      garden = bleeding({ trails: 1, beads });
      const st = garden.addStain({ l: letter, lx: 0, ly: -0.7 }, 0.04, 0);
      settle(garden, st);
      expect(st.runs[0].len).toBe(st.runs[0].y1 - st.ly);
      expect(falls(garden)).toBe(drips);
      const { g, ellipses } = fillLog();
      garden.paintStainBeads(g, letter, st, 100, 60000);
      expect(ellipses).toHaveLength(beads ? 1 : 0); // no beads, nothing hangs
    }
    // long trails hang longer drips
    const hanging = (length: number) => {
      const g2 = bleeding({ trails: 1, length }), st = g2.addStain({ l: letter, lx: 0, ly: -0.7 }, 0.04, 0);
      settle(g2, st);
      const { g, ellipses } = fillLog();
      g2.paintStainBeads(g, letter, st, 100, 60000);
      return ellipses[0][3];
    };
    expect(hanging(2)).toBeGreaterThan(hanging(1) * 1.5);
  });

  it('in the legacy style, sends a new trail down an older one\'s channel when merging', () => {
    const garden = bleeding({ trails: 1, merge: 1 });
    const first = garden.addStain({ l: letter, lx: 0, ly: -0.7 }, 0.04, 0), a = first.runs[0];
    const second = garden.addStain({ l: letter, lx: 0.02, ly: -0.6 }, 0.04, 1000), b = second.runs[0];
    // it starts where the older trail passes and ends where it ends
    expect(second.lx + b.dx).toBeCloseTo(first.lx + a.dx + a.wob * (0.1 / (a.y1 + 0.7)), 12);
    expect(second.lx + b.dx + b.wob).toBeCloseTo(first.lx + a.dx + a.wob, 12);
    expect(b.y1).toBe(a.y1);
    garden.bloodFx = LEGACY({ trails: 1 });
    expect(garden.addStain({ l: letter, lx: 0.02, ly: -0.6 }, 0.04, 2000).runs[0].dx).toBe(0); // without merging, its own line
  });

  it('in the legacy style, sets the splatter thrown and its size, and pools blood at the edges only when pooling', () => {
    const garden = writer();
    for (const [splat, n] of [[1, 4], [2, 8], [0, 0]]) {
      garden.drops = [];
      garden.splashSpray({ x: 0, y: 0, r: 2 }, { fx: LEGACY({ splat, splatSize: 1.5 }) }, 100);
      expect(garden.drops).toHaveLength(n);
      expect(garden.drops.every((d: any) => d.r >= 0.6 - 1e-9 && d.r <= 1.2 + 1e-9)).toBe(true);
    }
    const marks = (fx: any) => {
      const { g, arcs, ellipses } = fillLog();
      const run = { dx: 0, w: 0.02, y1: -0.2, len: 0.4, v: 0.04, wob: 0, bead: 1, dropped: true };
      garden.paintStain(g, { x: 0, y: 0 }, { lx: 0, ly: -0.6, r: 0.04, born: 0, seed: 1, runs: [run], fx }, 100, 10000);
      return [arcs(), ellipses.length];
    };
    expect(marks(LEGACY())).toEqual([5, 0]); // the satellite droplets; no pool
    expect(marks(LEGACY({ splat: 2, pool: 1 }))).toEqual([10, 1]);
    expect(marks(LEGACY({ splat: 0 }))).toEqual([0, 0]);
  });

  it('paints every splash, older ones too, with the drying time, dried look and gloss in use', () => {
    const garden = app(), { g, fills, blurs } = fillLog();
    const st = { lx: 0, ly: -0.5, r: 0.05, born: 0, seed: 1, runs: [] };
    const body = (now: number) => { fills.length = 0; garden.paintStain(g, { x: 0, y: 0 }, st, 100, now); return fills[0]; };
    expect(body(30000)).toBe('rgba(88,8,14,0.95)'); // dried
    garden.bloodFx = LEGACY({ dry: 60 });
    expect(body(30000)).toBe('rgba(119,9,18,0.95)'); // half dry
    garden.bloodFx = LEGACY({ aged: 0 });
    expect(body(30000)).toBe('rgba(150,10,22,0.95)'); // still fresh-looking
    garden.bloodFx = LEGACY({ aged: 2 });
    expect(body(30000)).toBe('rgba(26,6,6,0.475)'); // darker still, and fading
    Object.assign(garden, { state: { look: 'silver' }, _theme: null }); garden.appearance = { ...garden.look().appearance };
    for (const gloss of [1, 0]) {
      garden.bloodFx = LEGACY({ gloss });
      blurs.length = 0;
      body(0);
      expect(Math.max(...blurs) > 0).toBe(gloss > 0); // ichor glows only with gloss
      expect(fills.some(f => f.startsWith('rgba(255,255,255,') && !f.endsWith(',0.000)'))).toBe(gloss > 0); // and shines
    }
  });

  it('settles splashes into the letter once dry, for the drying time in use, and repaints them when the finish changes', () => {
    const { garden, context } = stainHarness();
    const letter: any = { ch: 'O', x: 20, y: 100 }, stain = { l: letter, done: true, born: 0 };
    garden.stains = [stain];
    garden.bloodFx = LEGACY({ dry: 60 });
    garden.drawLetterStains(context, 30000, 100);
    expect(letter._stainCache).toBeUndefined(); // still drying
    garden.drawLetterStains(context, 61000, 100);
    const cache = letter._stainCache;
    expect(cache.list).toEqual([stain]);
    garden.drawLetterStains(context, 62000, 100);
    expect(letter._stainCache).toBe(cache);
    garden.bloodFx = LEGACY({ dry: 60, gloss: 0.5 });
    garden.drawLetterStains(context, 63000, 100);
    expect(letter._stainCache).not.toBe(cache); // repainted in the new finish
  });

  it('in the fluid style, sets how far runs wander, whether they merge and pool, and how many beads drip', () => {
    const garden = Object.assign(writer(), { stains: [], drops: [], glyphs: { l: stroke() }, bloodFx: { ...FLUID(), trails: 1, wander: 0 } });
    const straight = garden.addStain({ l: letter, lx: 0, ly: -0.7 }, 0.04, 0).runs[0];
    expect(straight.path.every((p: number[]) => p[0] === straight.path[0][0])).toBe(true);
    // a splash beside a wet track follows it, unless merging is off
    for (const [merge, joined] of [[1, true], [0, false]] as const) {
      garden.stains = [];
      garden.bloodFx = { ...FLUID(), trails: 1, merge };
      const track = garden.addStain({ l: letter, lx: 0, ly: -0.7 }, 0.04, 0).runs[0];
      track.len = track.total;
      expect(garden.addStain({ l: letter, lx: 0.01, ly: -0.65 }, 0.03, 1000).runs[0].joined).toBe(joined);
    }
    // pooling, and the number of drips from the same liquid
    const run = () => ({ dx: 0, w: 0.02, seed: 1, path: [[0, -0.49], [0, -0.4], [0, -0.3]], cum: [0, 0.09, 0.19], total: 0.19, len: 0.19,
      reach: 0.79, stalls: [], wetAt: 0, bead: null, end: [0, -0.3], edge: -0.29, ledge: [-0.08, 0.08] });
    for (const [beads, drips] of [[1, 2], [2, 4], [0, 0]]) {
      garden.drops = [];
      const st = { l: letter, runs: [run()], fx: { ...FLUID(), beads } }, r = st.runs[0];
      for (let t = 0; t < 600 && garden.flowRun(st, r, t * 100, 0.1, 100); t++);
      expect(garden.drops).toHaveLength(drips);
    }
    garden.paintPool = vi.fn();
    const { g } = fillLog();
    const pooled = (pool: number) => { const st = { l: letter, lx: 0, ly: -0.5, r: 0.04, born: 0, seed: 1, runs: [{ ...run(), bead: { f: 0.5, left: 0.3, drops: 0, snap: 0 } }], fx: { ...FLUID(), pool } }; garden.paintStain(g, letter, st, 100, 0); };
    pooled(1); pooled(0);
    expect(garden.paintPool).toHaveBeenCalledOnce();
  });
});

describe('Standalone TypeGardenApp looks and appearance', () => {
  // a hero, an earned bloom, then buds, partly open roses and cluster roses
  const roses = () => [
    { t: 'rose', id: 101, stage: 'full' },
    { t: 'rose', id: 4299.2, stage: 'full', bloom: { at: 0, end: null, kind: 'word' } },
    ...Array.from({ length: 300 }, (_, i) => ({ t: 'rose', id: 1000 + i * 1.37, stage: i % 2 ? 'half' : 'bud', cluster: i % 5 === 0 })),
  ];
  // show a preset as setLook does (without the page around it)
  const use = (garden: any, id: string) => {
    garden.state.look = id;
    garden.appearance = { ...garden.look().appearance };
    garden._theme = null;
    return garden.theme();
  };
  const lightness = (garden: any, rgb: number[]) => garden.toLch(rgb)[0];

  it('offers seven presets, each setting every colour, falling back to crimson gothic', () => {
    const garden = app();
    expect(garden.LOOKS.map((look: any) => look.id)).toEqual(['crimson', 'ivory', 'silver', 'blackrose', 'mourning', 'oldrose', 'pinkblack']);
    const fields = ['bg', 'text', 'rosePrimary', 'roseSecondary', 'secondaryRole', 'blood', 'vine', 'wing', 'wingMarks']; // (not the font: that stays the visitor's)
    for (const look of garden.LOOKS) {
      expect(Object.keys(look.appearance).sort()).toEqual([...fields].sort());
      expect(['focal', 'scattered', 'off']).toContain(look.appearance.secondaryRole);
      expect(look.appearance.text).not.toBe(look.appearance.bg); // letters always stand off their page
    }
    garden.state.look = 'sepia';
    expect(garden.look().id).toBe('crimson');
  });

  it('keeps the crimson gothic colours exactly as they were', () => {
    const garden = app(), theme = garden.theme();
    expect([theme.bg, theme.text, theme.light, ...theme.glow, theme.shade, theme.shadeK])
      .toEqual(['#000000', '#FFFFFF', false, 'rgba(92,8,22,0.26)', 'rgba(48,3,12,0.12)', 'rgba(0,0,0,0)', '0,0,0', 1]);
    expect(garden.INK.crimson).toMatchObject({
      face: [[66, 0, 8], [172, 8, 24], [226, 38, 50]], back: [[86, 6, 14], [178, 22, 34], [230, 70, 78]],
      base: '30,0,4', baseA: 0.75, edge: '30,0,5', edgeA: 1, rim: '240,80,92', rimA: 1, cast: '4,0,1', castA: 1,
    });
    expect(theme.blood).toBe(garden.ICHOR.blood);
    expect(garden.ICHOR.blood).toMatchObject({ wet: [150, 10, 22], dry: [88, 8, 14], drop: '110,4,14' });
    expect(theme.dof).toBe(garden.DOF.crimson);
    expect(theme.wing).toBe(garden.WINGS.crimson);
    for (const rose of roses()) expect(garden.roseInk(rose)).toBe(garden.INK.crimson);
  });

  it('compiles every preset to its own hand-tuned colours', () => {
    const garden = app(), inks = Object.values(garden.INK), bloods = Object.values(garden.ICHOR);
    for (const look of garden.LOOKS) {
      const theme = use(garden, look.id);
      expect(inks).toContain(theme.ink.primary);
      expect(inks).toContain(theme.ink.secondary);
      expect(bloods).toContain(theme.blood);
      expect(Object.values(garden.DOF)).toContain(theme.dof);
      expect(Object.values(garden.WINGS)).toContain(theme.wing);
      expect([theme.glow[0], theme.glow[1], theme.shade, theme.shadeK]).toEqual([...look.finish.glow, look.finish.shade, look.finish.shadeK]);
    }
    expect(use(garden, 'silver')).toMatchObject({ light: true, ink: { primary: garden.INK.pearl }, blood: garden.ICHOR.ichor, wing: garden.WINGS.silver });
    expect(use(garden, 'ivory')).toMatchObject({ light: true, secondaryRole: 'scattered', ink: { secondary: garden.INK.ivory }, blood: garden.ICHOR.gloss });
  });

  it('colours roses by their part in the composition, the same way every time', () => {
    const garden = app(), list = roses(), focal = list.slice(0, 2), rest = list.slice(2);
    // ivory: crimson heroes and earned blooms, with some ivory roses scattered among the rest
    use(garden, 'ivory');
    for (const rose of focal) expect(garden.roseRole(rose)).toBe('primary');
    const pale = rest.filter(rose => garden.roseRole(rose) === 'secondary');
    expect(pale.length / rest.length).toBeGreaterThan(0.3);
    expect(pale.length / rest.length).toBeLessThan(0.5);
    expect(garden.roseInk(pale[0])).toBe(garden.INK.ivory);
    expect(rest.filter(rose => garden.roseRole(rose) === 'secondary')).toEqual(pale);
    // silver: every rose cool pearl
    use(garden, 'silver');
    for (const rose of list) expect(garden.roseInk(rose)).toBe(garden.INK.pearl);
    // black rose: the focal blooms are black, the rest of the garden crimson
    use(garden, 'blackrose');
    for (const rose of focal) expect(garden.roseInk(rose)).toBe(garden.INK.black);
    for (const rose of rest) expect(garden.roseInk(rose)).toBe(garden.INK.crimson);
    // mourning: a garden of black roses; old rose: all dusty pink; pink & black: a pink garden around black focal roses
    use(garden, 'mourning');
    for (const rose of list) expect(garden.roseInk(rose)).toBe(garden.INK.black);
    use(garden, 'oldrose');
    for (const rose of list) expect(garden.roseInk(rose)).toBe(garden.INK.pink);
    use(garden, 'pinkblack');
    for (const rose of focal) expect(garden.roseInk(rose)).toBe(garden.INK.black);
    for (const rose of rest) expect(garden.roseInk(rose)).toBe(garden.INK.pink);
  });

  it('switches presets by copying their appearance and redrawing coloured bitmaps, leaving the garden untouched', () => {
    const garden = Object.assign(writer(), { updateTheme: vi.fn(), buildPalettesUI: vi.fn(), paint: vi.fn(), focus: vi.fn(), buildPoster: vi.fn() });
    garden.state.look = 'crimson';
    typeInto(garden, 'rose', 0, 120);
    const letter = live(garden)[0], rose = letter.els.find((element: any) => element.t === 'rose');
    const canvases = [{ width: 4, height: 4 }, { width: 4, height: 4 }];
    rose._spr = { cv: canvases[0] }; letter._stainCache = { cv: canvases[1] }; garden._dofSpr = { fg: {} };
    const snapshot = () => JSON.stringify(live(garden).map((l: any) => [l.ch, l.id, l.seed, l.hes, l.rev, l.els.map((e: any) => [e.t, e.id, e.x, e.y])]));
    const garden0 = snapshot(), crimson = garden.theme();
    garden.setLook('blackrose');
    const preset = garden.LOOKS.find((look: any) => look.id === 'blackrose');
    expect(garden.state.look).toBe('blackrose');
    expect(garden.appearance).toEqual({ ...preset.appearance, font: 'playfair', botanical: garden.cleanBotanical() }); // (the typeface and botanicals stay as they were)
    expect(garden.appearance).not.toBe(preset.appearance); // a copy: editing it never edits the preset
    expect(garden.theme()).not.toBe(crimson);
    expect(garden.theme().bg).toBe('#150C0F');
    expect([rose._spr, letter._stainCache, garden._dofSpr]).toEqual([null, null, null]);
    expect(canvases).toEqual([{ width: 0, height: 0 }, { width: 0, height: 0 }]); // freed, not left for collection
    expect(snapshot()).toBe(garden0);
    expect(garden.updateTheme).toHaveBeenCalled();
    expect(garden.buildPalettesUI).toHaveBeenCalled();
    expect(garden.paint).toHaveBeenCalled();
    garden.paint.mockClear();
    garden.setLook('blackrose'); // already showing
    garden.setLook('sepia'); // no such look
    expect(garden.paint).not.toHaveBeenCalled();
    expect(garden.state.look).toBe('blackrose');
  });

  it('bleeds red blood in the crimson preset and luminous silver ichor in the silver preset', () => {
    const garden = app(), { g, fills } = fillLog();
    const stain = { lx: 0, ly: -0.5, r: 0.05, born: 0, seed: 1, runs: [] };
    garden.paintStain(g, { x: 0, y: 0 }, stain, 100, 0);
    expect(fills[0]).toBe('rgba(150,10,22,0.95)');
    expect(g.shadowColor).toBe('');
    use(garden, 'silver');
    fills.length = 0;
    garden.paintStain(g, { x: 0, y: 0 }, stain, 100, 0);
    expect(fills[0]).toBe('rgba(240,244,252,0.95)');
    expect(g.shadowColor).toBe(garden.ICHOR.ichor.glow);
    expect(g.shadowBlur).toBe(0); // the glow is switched off again for whatever is painted next
  });

  it('in the fluid effect, bleeds red blood in the crimson preset and luminous silver ichor in the silver preset', () => {
    const garden = app(), { g, fills } = fillLog();
    // a splash with one run that has reached the edge below and hangs a bead there
    const run = { dx: 0, w: 0.02, seed: 1, path: [[0, -0.49], [0, -0.4], [0, -0.3]], cum: [0, 0.09, 0.19], total: 0.19, len: 0.19,
      reach: 0.5, stalls: [0.1], wetAt: 0, bead: { f: 0.7, left: 0.3, drops: 0, snap: 0 }, end: [0, -0.3], edge: -0.29, ledge: [-0.08, 0.08] };
    const stain = { lx: 0, ly: -0.5, r: 0.05, born: 0, seed: 1, runs: [run], fx: FLUID() };
    garden.paintStain(g, { x: 0, y: 0 }, stain, 100, 0);
    garden.paintStainBeads(g, { x: 0, y: 0 }, stain, 100, 0);
    expect(fills[0]).toBe('rgba(150,10,22,0.95)');
    expect(fills.filter(fill => fill === 'rgba(150,10,22,0.95)').length).toBeGreaterThanOrEqual(3); // splash, run and bead
    expect(g.shadowColor).toBe('');
    use(garden, 'silver');
    fills.length = 0;
    garden.paintStain(g, { x: 0, y: 0 }, stain, 100, 0);
    expect(g.shadowBlur).toBe(0); // the glow is switched off again for whatever is painted next
    garden.paintStainBeads(g, { x: 0, y: 0 }, stain, 100, 0);
    expect(fills[0]).toBe('rgba(240,244,252,0.95)');
    expect(g.shadowColor).toBe(garden.ICHOR.ichor.glow);
    expect(fills.some(fill => fill.startsWith(`rgba(${garden.ICHOR.ichor.rim},`))).toBe(true); // the bead's shaded underside
    expect(g.shadowBlur).toBe(0);
  });

  it('generates a full rose ink for any colour, its body that colour and its ramps running dark to light', () => {
    const garden = app();
    for (const hex of ['#3A5BD9', '#E2A21A', '#F4F1EA', '#120208', '#2F8F7F', '#7E1BAA']) {
      const ink = garden.inkFor(hex);
      expect(Object.values(garden.INK)).not.toContain(ink);
      expect(garden.rgbHex(ink.face[1])).toBe(hex.toLowerCase());
      for (const ramp of [ink.face, ink.back]) {
        expect(ramp.every((c: number[]) => c.length === 3 && c.every(v => Number.isInteger(v) && v >= 0 && v <= 255))).toBe(true);
        expect(lightness(garden, ramp[0])).toBeLessThan(lightness(garden, ramp[1]));
        expect(lightness(garden, ramp[1])).toBeLessThanOrEqual(lightness(garden, ramp[2]) + 1e-9);
      }
      for (const key of ['base', 'edge', 'rim', 'cast', 'petalRim']) expect(ink[key]).toMatch(/^\d{1,3},\d{1,3},\d{1,3}$/);
      for (const key of ['baseA', 'edgeA', 'rimA', 'castA']) { expect(ink[key]).toBeGreaterThan(0); expect(ink[key]).toBeLessThanOrEqual(1); }
      expect(garden.inkFor(hex)).toEqual(ink); // the same colour always gives the same ink
    }
    expect(garden.inkFor('#ac0818')).toBe(garden.INK.crimson); // curated inks are matched whatever the case
  });

  it('derives the glow and cast shadow from the page once a preset finish no longer applies', () => {
    const garden = app(), crimson = garden.LOOKS[0];
    // the preset's own page and rose keep its art-directed finish; another page drops it
    garden.appearance = { ...crimson.appearance, text: '#E8E0D0' };
    garden._theme = null;
    expect(garden.theme().glow[0]).toBe(crimson.finish.glow[0]);
    garden.appearance = { ...crimson.appearance, bg: '#F2EEE6', text: '#111111' };
    garden._theme = null;
    const light = garden.theme();
    expect(light.light).toBe(true);
    expect(light.glow[0]).toMatch(/^rgba\(\d+,\d+,\d+,0\.8\)$/);
    expect(light.glow[2]).toMatch(/,0\)$/); // fades into the page
    expect(light.shadeK).toBe(0.45);
    garden.appearance = { ...crimson.appearance, bg: '#0B1430', rosePrimary: '#3A5BD9' };
    garden._theme = null;
    const dark = garden.theme();
    expect([dark.light, dark.glow[2], dark.shade, dark.shadeK]).toEqual([false, 'rgba(0,0,0,0)', '0,0,0', 1]);
    expect(dark.glow[0]).not.toBe(crimson.finish.glow[0]); // tinted by the blue roses instead
  });

  it('makes a pale blood colour glow like ichor and lets every blood dry darker', () => {
    const garden = app();
    expect(garden.bloodFor('#960A16')).toBe(garden.ICHOR.blood);
    const teal = garden.bloodFor('#3FE0C0'), wine = garden.bloodFor('#4A0A10');
    expect(teal.glow).toMatch(/^rgba\(/);
    expect(teal.rim).toMatch(/^\d{1,3},\d{1,3},\d{1,3}$/);
    expect(wine.glow).toBeUndefined();
    for (const blood of [teal, wine]) expect(lightness(garden, blood.dry)).toBeLessThan(lightness(garden, blood.wet));
  });

  it('measures contrast as WCAG does and converts colours to and from OKLCH', () => {
    const garden = app();
    expect(garden.contrast('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(garden.contrast('#777777', '#777777')).toBe(1);
    for (const hex of ['#AC0818', '#3A5BD9', '#F4F1EA', '#120208', '#2F8F7F']) {
      const rgb = garden.hexRgb(hex), back = garden.fromLch(garden.toLch(rgb));
      back.forEach((v: number, i: number) => expect(Math.abs(v - rgb[i])).toBeLessThanOrEqual(1));
    }
  });
  it('draws the vines and the butterfly in the theme, the original greens and velvet black by default', () => {
    const garden = app(), theme = garden.theme();
    expect(theme.vine).toEqual({
      stem: '#163a20', stemLit: '#4f8f5b', stemMid: [36, 89, 47], stalk: '#183d22', leafLit: '#36763f', leafMid: '#1d4c28', leafDark: '#11301a',
      leafRim: 'rgba(150,200,150,0.35)', sepal: [[12, 30, 16], [28, 66, 36], [58, 112, 64]], prickle: '#2b3a20', thornRoot: '#1f2914',
    });
    expect(theme.ground).toBe(garden.GROUNDS.black);
    for (const look of garden.LOOKS) expect(use(garden, look.id).vine).toEqual(theme.vine); // every preset keeps the green vines
  });

  it('grows any vine colour into a family shaped like the green one', () => {
    const garden = app(), L = (hex: string) => lightness(garden, garden.hexRgb(hex));
    for (const hex of ['#4B2A5E', '#6E4A22', '#9AA79E', '#1E1C1C']) {
      const vine = garden.vineFor(hex);
      expect(vine.leafMid).toBe(hex.toLowerCase());
      expect(L(vine.leafDark)).toBeLessThan(L(vine.leafMid));
      expect(L(vine.leafMid)).toBeLessThan(L(vine.leafLit));
      expect(L(vine.stem)).toBeLessThan(L(vine.stemLit));
      expect(lightness(garden, vine.sepal[0])).toBeLessThan(lightness(garden, vine.sepal[1]));
      expect(lightness(garden, vine.sepal[1])).toBeLessThan(lightness(garden, vine.sepal[2]));
      expect(vine.leafRim).toMatch(/^rgba\(\d+,\d+,\d+,0\.35\)$/);
      expect(garden.vineFor(hex)).toEqual(vine);
    }
    const ground = garden.groundFor('#3A0D4A');
    expect(ground.velvet[1]).toBe('#3a0d4a');
    expect(lightness(garden, garden.hexRgb(ground.velvet[0]))).toBeGreaterThan(lightness(garden, garden.hexRgb(ground.velvet[2]))); // lit at the root, dark at the edge
  });

  it('paints leaves in the chosen vine colours, and a rewritten letter\'s regrowth still starts bronze', () => {
    const garden = app(), strokes: string[] = [], stops: string[] = [];
    const B = { stroke: (_: any, colour: string) => strokes.push(colour), fill: (_: any, style: any) => style.stops && stops.push(...style.stops.map((s: any[]) => s[1])) };
    garden.appearance = { ...garden.look().appearance, vine: '#4B2A5E' };
    garden._theme = null;
    const vine = garden.theme().vine;
    garden.leafCustomized(B, 0, 0, 0, 40, 0);
    expect(strokes[0]).toBe(vine.stalk);
    expect(new Set(stops)).toEqual(new Set([vine.leafLit, vine.leafMid, vine.leafDark]));
    expect(strokes).toContain(vine.leafRim);
    garden._tint = 1; // a rewritten letter, just regrown
    expect(garden.tc(vine.stem, '#5c2a17')).toBe('rgb(92,42,23)');
    garden._tint = 0;
    expect(garden.tc(vine.stem, '#5c2a17')).toBe(vine.stem);
  });

  it('redraws stamped plants along with the other coloured bitmaps', () => {
    const garden = app(), foliage = { width: 50, height: 50 };
    const letter: any = { ch: 'a', els: [], _plantCache: { 1: { cv: foliage } } };
    garden.letters = [letter];
    garden.restyle();
    expect(letter._plantCache).toBeNull();
    expect(foliage).toEqual({ width: 0, height: 0 });
  });
  it('recolours without touching the garden, its writing record, bloom clocks, blood or rose placement', () => {
    const garden = writer();
    const last = typeInto(garden, 'roses', 0, (i: number) => (i === 3 ? 1400 : 120)); // a hesitation before the second s
    garden.checkSprout(last + 1000); // a pause sprouts a bloom on the last letter
    const letters = live(garden);
    garden.stains = [{ l: letters[1], lx: 0.02, ly: -0.6, r: 0.04, born: 500, seed: 3, runs: [{ dx: 0, w: 0.02, y1: 0, len: 0.1, v: 0.04, wob: 0, bead: 0, dropped: false }] }];
    garden.drops = [{ st: 'fall', x: 10, y: 20, vx: 0, vy: 30, r: 3, t: 0.2 }];
    garden.biteRose(letters[0].els.find((e: any) => e.t === 'rose').id, 1000);
    const record = () => JSON.stringify({
      letters: garden.letters.map((l: any) => ({ ch: l.ch, id: l.id, seed: l.seed, ws: l.ws, wi: l.wi, hes: l.hes, rev: l.rev, birth: l.birth, bloom: l.bloom, els: l.els })),
      stains: garden.stains.map((s: any) => ({ ...s, l: s.l.id })), drops: garden.drops, bites: garden.bites, pace: garden._pace,
    });
    expect(letters.some((l: any) => l.hes > 0) && letters.some((l: any) => l.bloom)).toBe(true);
    const before = record();
    expect(garden.setAppearance({
      bg: '#0B1430', text: '#F2EEE4', rosePrimary: '#3A5BD9', roseSecondary: '#F2EEE4', secondaryRole: 'scattered',
      blood: '#C9A227', vine: '#4B2A5E', wing: '#3A0D4A', wingMarks: '#E0B040',
    })).toBe(true);
    expect(record()).toBe(before);
    expect(garden.state.look).toBe('custom');
    const theme = garden.theme();
    expect([theme.bg, theme.text, theme.ink.primary.face[1], theme.vine.leafMid, theme.secondaryRole]).toEqual(['#0B1430', '#F2EEE4', [58, 91, 217], '#4b2a5e', 'scattered']);
  });

  it('selects a preset again when the values match it, and keeps its finish while its page and primary rose stay', () => {
    const garden = app(), crimson = garden.LOOKS[0], ivory = garden.LOOKS[1];
    garden.setAppearance({ blood: '#cc1222' });
    expect(garden.state.look).toBe('custom');
    expect(garden.theme().glow[0]).toBe(crimson.finish.glow[0]); // the same page and roses keep the art-directed glow
    garden.setAppearance({ blood: '#960a16' });
    expect(garden.state.look).toBe('crimson');
    garden.setAppearance({ ...ivory.appearance, bg: ivory.appearance.bg.toLowerCase() });
    expect(garden.state.look).toBe('ivory');
    expect(garden.theme().glow.slice(0, 2)).toEqual(ivory.finish.glow);
    garden.setAppearance({ bg: '#101010', text: '#F0F0F0' });
    expect(garden.state.look).toBe('custom');
    expect(garden.theme().glow[0]).not.toBe(ivory.finish.glow[0]); // a new page: derived from it instead
  });

  it('ignores values that are not colours and leaves the font to its own path', () => {
    const garden = app(), before = { ...garden.look().appearance };
    expect(garden.setAppearance({ bg: 'red', text: '#12', secondaryRole: 'everywhere', font: 'cinzel', petals: '#fff' })).toBe(false);
    expect(garden.appearance ?? before).toEqual(before);
    expect(garden.state.look).toBe('crimson');
    expect([garden.normHex('#abc'), garden.normHex('3a5bd9'), garden.normHex(' #3A5BD9 ')]).toEqual(['#AABBCC', '#3A5BD9', '#3A5BD9']);
  });

  it('compiles the theme once however many changes arrive before the next frame', () => {
    const garden = app(), compile = vi.spyOn(garden, 'compileTheme');
    for (let i = 0; i < 30; i++) garden.setAppearance({ rosePrimary: garden.rgbHex([100 + i, 20, 40]) });
    expect(compile).not.toHaveBeenCalled();
    garden.theme(); garden.theme();
    expect(compile).toHaveBeenCalledOnce();
    expect(garden._chrome).toBe(true); // the page's chrome follows on the next frame
    // generated colours are kept per colour, so a cache can tell an unchanged colour by identity
    expect(garden.inkFor(garden.appearance.rosePrimary)).toBe(garden.theme().ink.primary);
  });

  it('repaints a rose sprite only when its own colours change, waiting its turn with the old colours meanwhile', () => {
    const { garden, flower, frame } = spriteHarness();
    const paints = () => garden.roseCustomized.mock.calls.length;
    frame(6000, 8, false);
    const painted = paints();
    frame(6100, 8, false);
    expect(paints()).toBe(painted); // settled: drawn from its bitmap
    garden.setAppearance({ roseSecondary: '#3A5BD9' }); // no rose takes the secondary colour yet
    frame(6200, 8, false);
    expect(paints()).toBe(painted);
    const key = flower._spr.key;
    garden.setAppearance({ secondaryRole: 'focal' }); // this hero bloom now takes it
    frame(6300, 0, false); // no turn this frame: it stays up in its old colours
    expect([paints(), flower._spr.key]).toEqual([painted, key]);
    frame(6400, 8, false);
    expect(paints()).toBe(painted + 1);
    expect(flower._spr.key).toBe(garden.spriteKey(flower));
  });

  it('repaints settled stains only when the blood colour changes', () => {
    const { garden, context } = stainHarness();
    const letter: any = { ch: 'O', x: 20, y: 100 }, stain = { l: letter, done: true, born: 0 };
    garden.stampStains(context, letter, [stain], 100, 30000);
    garden.stampStains(context, letter, [stain], 100, 30100);
    expect(garden.paintStain).toHaveBeenCalledTimes(1);
    garden.setAppearance({ text: '#EFE6D4', rosePrimary: '#CE6886' }); // blood unchanged
    garden.stampStains(context, letter, [stain], 100, 30200);
    expect(garden.paintStain).toHaveBeenCalledTimes(1);
    garden.setAppearance({ blood: '#C9A227' });
    garden.stampStains(context, letter, [stain], 100, 30300);
    expect(garden.paintStain).toHaveBeenCalledTimes(2);
    expect(letter._stainCache.blood).toBe(garden.theme().blood);
  });
  // the Custom panel's page elements, faked: a panel that can contain things, and the bar it floats above
  const withPanel = (garden: any) => {
    const inside = { id: 'control-in-panel' };
    garden.apEl = { hidden: true, style: {}, contains: (el: any) => el === inside, querySelectorAll: () => [], querySelector: () => null };
    garden.barEl = { getBoundingClientRect: () => ({ height: 0, top: 0 }) };
    garden.buildPalettesUI = vi.fn();
    return inside;
  };

  it('warns quietly about the one combination that reads worst, and never about a preset', () => {
    const garden = app(), crimson = garden.LOOKS[0].appearance;
    for (const look of garden.LOOKS) expect(garden.contrastWarning(look.appearance)).toBe('');
    expect(garden.contrastWarning({ ...crimson, text: '#1A1A1A' })).toBe('Letters are hard to read on this page');
    expect(garden.contrastWarning({ ...crimson, blood: '#F2F2F2' })).toBe('Blood will barely show on these letters');
    expect(garden.contrastWarning({ ...crimson, rosePrimary: '#000000' })).toBe('Roses melt into the page');
    expect(garden.contrastWarning({ ...crimson, roseSecondary: '#000000' })).toBe(''); // the second colour is off
    expect(garden.contrastWarning({ ...crimson, roseSecondary: '#000000', secondaryRole: 'focal' })).toBe('Roses melt into the page');
    expect(garden.contrastWarning({ ...crimson, vine: '#020202' })).toBe('Vines melt into the page');
    // the most important worry first
    expect(garden.contrastWarning({ ...crimson, text: '#111111', blood: '#111111', vine: '#000000' })).toBe('Letters are hard to read on this page');
  });

  it('keeps what the visitor builds, opens the panel without changing colours, and brings Custom back after a preset', () => {
    const garden = Object.assign(writer(), { updateTheme: vi.fn(), paint: vi.fn(), focus: vi.fn() });
    withPanel(garden);
    garden.state.look = 'crimson';
    garden.pickCustom(); // nothing built yet: the panel opens on the look showing
    expect([garden.state.look, garden.apOpen, garden.apEl.hidden]).toEqual(['crimson', true, false]);
    garden.editAppearance({ bg: '#0B1430', rosePrimary: '#3A5BD9' });
    const built = { ...garden.appearance };
    expect(garden.customAppearance).toEqual(built);
    expect(garden.state.look).toBe('custom');
    garden.pickLook('ivory'); // trying a preset with the panel open
    expect([garden.state.look, garden.apOpen]).toEqual(['ivory', true]);
    expect(garden.customAppearance).toEqual(built); // the custom appearance is kept
    // the swatch of the look showing closes and opens the panel, and opening it never changes the colours
    const ivory = { ...garden.appearance };
    garden.pickLook('ivory');
    expect([garden.state.look, garden.apOpen]).toEqual(['ivory', false]);
    garden.pickLook('ivory');
    expect([garden.state.look, garden.apOpen, garden.appearance]).toEqual(['ivory', true, ivory]);
    garden.pickCustom(); // Custom, with a preset showing: back to the custom appearance
    expect([garden.state.look, garden.apOpen]).toEqual(['custom', true]);
    expect(garden.appearance).toEqual(built);
    garden.pickCustom(); // Custom again, now showing: closes the panel
    expect([garden.apOpen, garden.apEl.hidden]).toEqual([false, true]);
  });

  it('keeps keys pressed in the panel away from the garden, and closes it on Escape', () => {
    const garden = Object.assign(writer(), { updateTheme: vi.fn(), paint: vi.fn(), focus: vi.fn(), mark: vi.fn() });
    const inside = withPanel(garden);
    garden.state.look = 'crimson';
    typeInto(garden, 'in', 0, 120);
    garden.openAppearance();
    const press = (key: string, target: any = {}) => garden.key({ key, target, timeStamp: 5000, preventDefault: vi.fn() });
    for (const key of ['a', 'Backspace', 'Enter', 'Tab', ' ']) press(key, inside);
    expect(live(garden).map((l: any) => l.ch).join('')).toBe('in');
    expect(garden.state.treatment).toBe('customized'); // Tab moved between the panel's controls, not to Baseline
    expect(garden.apOpen).toBe(true);
    press('Escape');
    expect(garden.apOpen).toBe(false);
    press('s');
    expect(live(garden).map((l: any) => l.ch).join('')).toBe('ins'); // outside the panel, typing grows the garden again
  });
  it('remembers each letter\'s seeds, so its plants can regrow the same', () => {
    const garden = writer(), rand = vi.fn(() => 0.25);
    garden.rand = rand;
    const opening: any = { ch: 'a', id: 1, seed: null }; // the opening text draws its seeds from a stream
    const first = [garden.seedOf(opening, 1), garden.seedOf(opening, 2)];
    expect([garden.seedOf(opening, 1), garden.seedOf(opening, 2)]).toEqual(first);
    expect(rand).toHaveBeenCalledTimes(2);
  });

  it('refits the garden to a new typeface keeping the writing record, and regrows it exactly on returning', () => {
    const garden = writer();
    let half = 0.2; // half the stroke width of every letter in the typeface in use (a stand-in for real letterforms)
    garden.glyph = () => Array.from({ length: 57 }, (_, i) => ({ y: -0.7 + i / 80, runs: [[-half, half]] }));
    garden.mw = (ch: string) => (ch === ' ' ? 0.45 : half * 3);
    let t = typeInto(garden, 'roses', 0, (i: number) => (i === 2 ? 1400 : 120)); // a hesitation inside the word
    garden.keyEvent(t += 150); garden.prune(t);
    garden.add('s', t += 300, garden.keyEvent(t)); // a rewritten letter
    for (const ch of ' bleed') garden.add(ch, t += 120, garden.keyEvent(t));
    garden.checkSprout(t + 1000); // a pause bloom
    const letters = live(garden);
    const run = () => ({ dx: 0, w: 0.02, y1: 0, len: 0.2, v: 0.04, wob: 0, bead: 0, dropped: false });
    garden.stains = [
      { l: letters[0], lx: 0.1, ly: -0.5, r: 0.04, born: 0, seed: 1, runs: [run()] },
      { l: letters[1], lx: 0.25, ly: -0.5, r: 0.04, born: 0, seed: 2, runs: [run()] }, // only the wider typeface has ink here
    ];
    expect([letters.some((l: any) => l.hes), letters.some((l: any) => l.rev), letters.some((l: any) => l.bloom)]).toEqual([true, true, true]);
    const record = () => JSON.stringify(garden.letters.map((l: any) => [l.ch, l.id, l.seed, l.ws, l.wi, l.hes, l.rev, l.birth, l.bloom, l.dead ?? null, l.endRel ?? null]));
    const plants = () => JSON.stringify(garden.letters.map((l: any) => [l.els, l.endEls, l.tend]));
    const ids = () => JSON.stringify(garden.letters.map((l: any) => (l.els || []).map((e: any) => e.id)));
    const rec0 = record(), plants0 = plants(), ids0 = ids();

    half = 0.3; // a wider typeface
    garden.reshape();
    expect(record()).toBe(rec0);
    expect(ids()).toBe(ids0); // the same plants, from the same seeds...
    expect(plants()).not.toBe(plants0); // ...fitted to the new letterforms
    expect(garden.stains.map((s: any) => [s.lx, garden.inkAt(s.l.ch, s.lx, s.ly)])).toEqual([[0.1, true], [0.25, true]]);

    half = 0.2; // and back
    garden.reshape();
    expect(record()).toBe(rec0);
    expect(plants()).toBe(plants0);
    // the stain that only the wider letters had ink under moves to the nearest ink; a trail keeps to the letter
    expect(garden.stains).toHaveLength(2);
    expect(garden.stains[1].lx).toBeCloseTo(0.2, 9);
    for (const s of garden.stains) {
      expect(garden.inkAt(s.l.ch, s.lx, s.ly)).toBe(true);
      for (const r of s.runs) expect(r.len).toBeLessThanOrEqual(r.y1 - s.ly + 1e-9);
    }
    // a stain with no ink anywhere near is let go
    garden.stains.push({ l: letters[2], lx: 0.9, ly: -0.5, r: 0.04, born: 0, seed: 3, runs: [run()] });
    garden.reshape();
    expect(garden.stains).toHaveLength(2);
  });

  it('refits fluid splashes to a new typeface too, tracing their runs again over the new letterforms', () => {
    const garden = writer();
    let half = 0.2;
    garden.glyph = () => Array.from({ length: 57 }, (_, i) => ({ y: -0.7 + i / 80, runs: [[-half, half]] }));
    garden.mw = (ch: string) => (ch === ' ' ? 0.45 : half * 3);
    typeInto(garden, 'ab', 0, 120);
    const letters = live(garden);
    // a run part-way down, with a bead it hung at the edge of the letters it ran down before
    const run = () => ({ dx: 0, w: 0.02, seed: 1, path: [], cum: [0], total: 0, len: 0.2, v: 0.04, wetAt: 0,
      bead: { f: 0.5, left: 0.2, drops: 0, snap: 0 }, stalls: [], reach: 1 });
    garden.stains = [
      { l: letters[0], lx: 0.1, ly: -0.5, r: 0.04, born: 0, seed: 1, runs: [run()], specks: [], fx: FLUID() },
      { l: letters[1], lx: 0.25, ly: -0.5, r: 0.04, born: 0, seed: 2, runs: [run()], specks: [], fx: FLUID() }, // only the wider typeface has ink here
    ];
    half = 0.3;
    garden.reshape();
    half = 0.2;
    garden.reshape();
    expect(garden.stains).toHaveLength(2);
    expect(garden.stains[1].lx).toBeCloseTo(0.2, 9);
    for (const s of garden.stains) {
      expect(s.runs).toHaveLength(1);
      for (const r of s.runs) {
        expect(r.path.every(([x, y]: number[]) => garden.inkAt(s.l.ch, x, y))).toBe(true); // traced again over the letter
        expect(r.len).toBeLessThanOrEqual(r.total);
        expect(r.bead).toBeNull(); // not down at the new edge, so nothing hangs there
      }
    }
  });

  it('switches typeface only once it has loaded, the latest choice winning, and keeps it across presets', async () => {
    const garden = Object.assign(writer(), { updateTheme: vi.fn(), buildPalettesUI: vi.fn(), paint: vi.fn(), focus: vi.fn(), reshape: vi.fn(),
      F: '"Playfair Display",Georgia,serif' }); // (as the constructor sets it)
    garden.state.look = 'crimson';
    garden.appearance = { ...garden.look().appearance, font: 'playfair' };
    const loads: Record<string, (ok: boolean) => void> = {};
    garden.loadFont = (f: any) => new Promise(resolve => { loads[f.id] = resolve; });
    expect(await garden.setFont('comic')).toBe(false); // not one of the curated typefaces
    // a typeface that fails to load changes nothing
    const failing = garden.setFont('cinzel');
    loads.cinzel(false);
    expect(await failing).toBe(false);
    expect([garden.appearance.font, garden.F, garden.reshape.mock.calls.length]).toEqual(['playfair', '"Playfair Display",Georgia,serif', 0]);
    // two choices in quick succession: the later one is the one shown, even if the earlier finishes loading last
    const first = garden.setFont('bodoni'), second = garden.setFont('unifraktur');
    loads.unifraktur(true);
    expect(await second).toBe(true);
    loads.bodoni(true);
    expect(await first).toBe(false);
    expect([garden.appearance.font, garden.F, garden.FW]).toEqual(['unifraktur', '"UnifrakturMaguntia",Georgia,serif', 400]);
    expect(garden.reshape).toHaveBeenCalledOnce();
    // the presets are colour looks: the typeface stays as chosen
    garden.setLook('mourning');
    expect([garden.state.look, garden.appearance.font]).toEqual(['mourning', 'unifraktur']);
    expect(garden.setAppearance({ blood: '#C9A227', font: 'playfair' })).toBe(true);
    expect(garden.appearance.font).toBe('unifraktur'); // (a typeface is only ever chosen through setFont)
  });
  // the app with a stand-in for the browser's storage (initially holding `stored`; `refuse` makes every access throw)
  const storeHarness = (stored: string | null = null, refuse = false) => {
    const data: Record<string, string> = {};
    if (stored != null) data['typeGarden.appearance'] = stored;
    const localStorage = {
      getItem: (k: string) => { if (refuse) throw new Error('denied'); return data[k] ?? null; },
      setItem: (k: string, v: string) => { if (refuse) throw new Error('denied'); data[k] = v; },
    };
    const StoreApp = runInNewContext(classSource, { localStorage, performance: { now: () => 10000 } });
    const garden = Object.assign(Object.create(StoreApp.prototype), { state: { look: 'crimson' }, STORE: 'typeGarden.appearance', ...structuredClone(TABLES) });
    garden.appearance = { ...garden.look().appearance, font: 'playfair', botanical: garden.cleanBotanical() };
    return { garden, data };
  };

  it('keeps the visitor\'s appearance in their browser and brings it back on the next visit', () => {
    const first = storeHarness();
    first.garden.setAppearance({ bg: '#0B1430', text: '#F2EEE4', rosePrimary: '#3A5BD9', secondaryRole: 'scattered' });
    first.garden.customAppearance = { ...first.garden.appearance };
    first.garden.appearance = { ...first.garden.appearance, font: 'cinzel' }; // (as setFont leaves it)
    first.garden.storeAppearance();
    const saved = JSON.parse(first.data['typeGarden.appearance']);
    expect(saved.look).toBe('custom');
    expect(saved.appearance).toEqual(first.garden.appearance);

    const next = storeHarness(first.data['typeGarden.appearance']);
    next.garden.restoreAppearance();
    expect(next.garden.state.look).toBe('custom');
    expect(next.garden.appearance).toEqual({ ...first.garden.appearance, font: 'playfair' }); // the typeface follows once loaded...
    expect(next.garden._savedFont).toBe('cinzel'); // ...as queued here
    expect(next.garden.customAppearance).toEqual(first.garden.customAppearance);
    expect(next.garden.theme().bg).toBe('#0B1430');

    // a preset comes back as that preset
    const ivory = storeHarness(JSON.stringify({ look: 'ivory', appearance: { ...first.garden.LOOKS[1].appearance, font: 'playfair' }, custom: null }));
    ivory.garden.restoreAppearance();
    expect([ivory.garden.state.look, ivory.garden._savedFont, ivory.garden.customAppearance]).toEqual(['ivory', null, undefined]);
  });

  it('ignores anything in storage it does not recognise, and never fails when storage refuses', () => {
    const odd = storeHarness(JSON.stringify({ look: 'nonsense', appearance: { bg: 'red', text: '#123456', secondaryRole: 'everywhere', font: 'comic', blood: 12 }, custom: 7 }));
    odd.garden.restoreAppearance();
    const crimson = odd.garden.LOOKS[0].appearance;
    expect(odd.garden.appearance).toEqual({ ...crimson, text: '#123456', font: 'playfair', botanical: odd.garden.cleanBotanical() });
    expect([odd.garden._savedFont, odd.garden.customAppearance, odd.garden.state.look]).toEqual([null, undefined, 'custom']);
    for (const stored of ['not json', '"a string"', 'null']) {
      const { garden } = storeHarness(stored);
      garden.restoreAppearance();
      expect([garden.appearance, garden.state.look]).toEqual([{ ...crimson, font: 'playfair', botanical: garden.cleanBotanical() }, 'crimson']);
    }
    const refused = storeHarness(null, true);
    expect(() => { refused.garden.restoreAppearance(); refused.garden.storeAppearance(); }).not.toThrow();
  });

  it('keeps the botanicals with the appearance, brings them back checked, and gives an older saved appearance the neutral ones', () => {
    const first = storeHarness();
    first.garden.setAppearance({ botanical: { roses: 1.5, foliage: 0.4, buds: 0.5, half: 0.3, full: 0.2 } });
    first.garden.customAppearance = { ...first.garden.appearance };
    first.garden.storeAppearance();
    const saved = JSON.parse(first.data['typeGarden.appearance']);
    expect(saved.appearance.botanical).toMatchObject({ roses: 1.5, foliage: 0.4 });
    expect(saved.custom.botanical).toEqual(saved.appearance.botanical);
    const next = storeHarness(first.data['typeGarden.appearance']);
    next.garden.restoreAppearance();
    expect(next.garden.appearance.botanical).toEqual(first.garden.appearance.botanical);
    expect(next.garden.customAppearance.botanical).toEqual(first.garden.appearance.botanical);
    expect(next.garden.state.look).toBe('crimson'); // (botanicals are not part of what a look is)
    // saved before botanicals existed: the neutral ones
    const old = storeHarness(JSON.stringify({ look: 'crimson', appearance: { ...first.garden.LOOKS[0].appearance, font: 'playfair' }, custom: null }));
    old.garden.restoreAppearance();
    expect(old.garden.appearance.botanical).toEqual(old.garden.cleanBotanical());
    // saved with nonsense: brought into range
    const odd = storeHarness(JSON.stringify({ look: 'crimson', appearance: { ...first.garden.LOOKS[0].appearance, font: 'playfair', botanical: { roses: 50, leaf: 'x', thorns: -1, roseLo: 1.4, roseHi: 0.6 } }, custom: null }));
    odd.garden.restoreAppearance();
    expect(odd.garden.appearance.botanical).toMatchObject({ roses: 2, leaf: 1, thorns: 0 });
    expect(odd.garden.appearance.botanical.roseHi).toBeGreaterThanOrEqual(odd.garden.appearance.botanical.roseLo);
  });

  it('keeps the bleeding effect in the browser with the appearance, and brings back only what it recognises', () => {
    const first = storeHarness();
    first.garden.setBleed('fluid');
    first.garden.editBleed({ trails: 2.5, gloss: 0.4 });
    first.garden.storeAppearance();
    const saved = JSON.parse(first.data['typeGarden.appearance']);
    expect([saved.bleed, saved.bleedCustom]).toEqual(['custom', first.garden.customBleed]);
    const next = storeHarness(first.data['typeGarden.appearance']);
    next.garden.restoreAppearance();
    expect([next.garden.bleed(), next.garden.fx(), next.garden.customBleed]).toEqual(['custom', first.garden.customBleed, first.garden.customBleed]);
    // values out of range are brought into it; anything unrecognised keeps the legacy preset's
    const odd = storeHarness(JSON.stringify({ bleed: 'custom', bleedCustom: { style: 'watercolour', trails: 99, gloss: 'shiny', dry: -5 } }));
    odd.garden.restoreAppearance();
    expect([odd.garden.bleed(), odd.garden.fx()]).toEqual(['custom', LEGACY({ trails: 4, dry: 5 })]);
    for (const [bleed, shown] of [['fluid', 'fluid'], ['nonsense', 'legacy'], ['custom', 'legacy']]) { // (custom, with nothing kept)
      const { garden } = storeHarness(JSON.stringify({ bleed }));
      garden.restoreAppearance();
      expect([garden.bleed(), garden.fx()]).toEqual([shown, garden.BLEEDS.find((b: any) => b.id === shown).fx]);
    }
  });
  // a minimal TrueType file whose name table holds a full name (nameID 4) and a family name (nameID 1), in UTF-16
  const fontFile = (full: string, family = 'Fam') => {
    const names = [[4, full], [1, family]] as const, strings = names.map(([, s]) => s);
    const strBytes = strings.reduce((n, s) => n + s.length * 2, 0), nameLen = 6 + names.length * 12 + strBytes, at = 12 + 16;
    const v = new DataView(new ArrayBuffer(at + nameLen));
    v.setUint32(0, 0x00010000); v.setUint16(4, 1); // one table
    v.setUint32(12, 0x6E616D65); v.setUint32(20, at); v.setUint32(24, nameLen); // 'name' at `at`
    v.setUint16(at, 0); v.setUint16(at + 2, names.length); v.setUint16(at + 4, 6 + names.length * 12);
    let off = 0;
    names.forEach(([id, s], j) => {
      const r = at + 6 + j * 12;
      v.setUint16(r, 3); v.setUint16(r + 2, 1); v.setUint16(r + 4, 0x409); v.setUint16(r + 6, id); v.setUint16(r + 8, s.length * 2); v.setUint16(r + 10, off);
      for (let k = 0; k < s.length; k++) v.setUint16(at + 6 + names.length * 12 + off + k * 2, s.charCodeAt(k));
      off += s.length * 2;
    });
    return v.buffer;
  };
  const fakeFile = (name: string, data: ArrayBuffer, size = data.byteLength) => ({ name, size, arrayBuffer: async () => data });

  it('reads an uploaded typeface\'s own name, and knows the same file again', () => {
    const garden = app();
    expect(garden.fontName(fontFile('Old English Text MT', 'Old English'))).toBe('Old English Text MT');
    expect(garden.fontName(new TextEncoder().encode('wOF2 compressed, no readable name').buffer)).toBeNull();
    expect(garden.fontName(new ArrayBuffer(3))).toBeNull();
    const a = fontFile('A'), b = fontFile('B');
    expect(garden.hashBytes(a)).toBe(garden.hashBytes(fontFile('A')));
    expect(garden.hashBytes(a)).not.toBe(garden.hashBytes(b));
    expect(garden.fontMime('x.WOFF2')).toBe('font/woff2');
  });

  it('uses a visitor\'s own font file like a curated typeface, refusing what it cannot use', async () => {
    const garden = Object.assign(writer(), { reshape: vi.fn(), storeUserFonts: vi.fn(), buildFontMenu: vi.fn(),
      F: '"Playfair Display",Georgia,serif' });
    garden.appearance = { ...garden.look().appearance, font: 'playfair' };
    let usable = true;
    garden.loadUserFont = vi.fn(async () => usable);
    // too large, or not a font: nothing changes
    expect(await garden.uploadFont(fakeFile('huge.ttf', fontFile('Huge'), 7 * 1024 * 1024))).toBe(false);
    usable = false;
    expect(await garden.uploadFont(fakeFile('notes.ttf', new ArrayBuffer(64)))).toBe(false);
    expect([garden.appearance.font, garden.userFonts, garden.reshape.mock.calls.length]).toEqual(['playfair', undefined, 0]);
    // a font: kept, named from the file, and chosen (drawn at its own weight)
    usable = true;
    expect(await garden.uploadFont(fakeFile('OLDENGL.TTF', fontFile('Old English Text MT')))).toBe(true);
    const mine = garden.font();
    expect(mine).toMatchObject({ user: true, name: 'Old English Text MT', weight: 400 });
    expect([garden.appearance.font, garden.F, garden.FW]).toEqual([mine.id, `"${mine.family}",Georgia,serif`, 400]);
    expect(garden.storeUserFonts).toHaveBeenCalledOnce();
    expect(garden.reshape).toHaveBeenCalledOnce();
    // the same file again is the same typeface; a sixth upload lets the oldest go
    await garden.uploadFont(fakeFile('copy.ttf', fontFile('Old English Text MT')));
    expect(garden.userFonts).toHaveLength(1);
    for (const n of ['B', 'C', 'D', 'E', 'F']) await garden.uploadFont(fakeFile(`${n}.ttf`, fontFile(n)));
    expect(garden.userFonts.map((f: any) => f.name)).toEqual(['B', 'C', 'D', 'E', 'F']);
    expect(garden.font().name).toBe('F');
  });

  it('restores a saved choice of the visitor\'s own typeface once their fonts are read back, in upload order', async () => {
    const saved = storeHarness(JSON.stringify({ look: 'crimson', appearance: { ...writer().LOOKS[0].appearance, font: 'user:0a1b2c3d' }, custom: null }));
    saved.garden.restoreAppearance();
    expect([saved.garden.appearance.font, saved.garden._savedFont]).toEqual(['playfair', 'user:0a1b2c3d']);
    const garden = Object.assign(app(), { buildFontMenu: vi.fn() });
    const rows = [
      { id: 'user:0000000b', name: 'Second', data: new ArrayBuffer(8), order: 1 },
      { id: 'user:0000000a', name: 'First', data: new ArrayBuffer(8), order: 0 },
      { id: 'not-an-id', name: 'Junk', data: new ArrayBuffer(8) },
      { id: 'user:0000000c', name: 'No data', data: 'oops' },
    ];
    garden.fontDB = async () => ({
      transaction: () => ({ objectStore: () => ({ getAll: () => { const req: any = {}; Promise.resolve().then(() => { req.result = rows; req.onsuccess(); }); return req; } }) }),
    });
    await garden.restoreUserFonts();
    expect(garden.userFonts.map((f: any) => [f.id, f.name, f.user])).toEqual([['user:0000000a', 'First', true], ['user:0000000b', 'Second', true]]);
    expect(garden.buildFontMenu).toHaveBeenCalled();
  });

  it('embeds the visitor\'s own typeface in an SVG export, and imports a curated one', () => {
    const SvgApp = runInNewContext(classSource, { btoa });
    const garden = Object.assign(Object.create(SvgApp.prototype), { ...structuredClone(TABLES) });
    const data = fontFile('Mine'), mine = garden.userFontEntry('user:12345678', 'Mine', data, 'font/ttf');
    const css = garden.svgFontCss(mine);
    expect(css.startsWith("@font-face { font-family: 'TG upload 12345678'; src: url(data:font/ttf;base64,")).toBe(true);
    const embedded = atob(css.match(/base64,([^)]+)\)/)[1]);
    expect(Array.from(embedded, (c: string) => c.charCodeAt(0))).toEqual(Array.from(new Uint8Array(data))); // the file itself
    expect(garden.svgFontCss(garden.FONTS[5])).toBe("@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700&amp;display=swap');");
  });
});

describe('Standalone TypeGardenApp letter materials', () => {
  // The app with a clock the test moves (the materials time beads and spreading by it)
  const clocked = () => {
    const clock = { t: 10000 };
    const App = runInNewContext(classSource, { performance: { now: () => clock.t } });
    const garden = Object.assign(Object.create(App.prototype), { props: {}, state: { look: 'crimson' }, ...structuredClone(TABLES), stains: [], drops: [] });
    garden.bloodFx = LEGACY();
    return { garden, clock };
  };
  const material = (garden: any, id: string) => garden.MATERIALS.find((m: any) => m.id === id);
  // A letter's liquid over a letterform given cell by cell (what soakField builds from the glyph), at 80 cells to the em
  const field = (garden: any, M: any, nx: number, ny: number, ink: (x: number, y: number) => boolean) => {
    const n = nx * ny, A = () => new Float32Array(n), inked = A();
    for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) inked[y * nx + x] = ink(x, y) ? 1 : 0;
    const f: any = { ch: 'l', RES: 80, SUB: 1, ox: 0, oy: 0, nx, ny, n, ink: inked, w: A(), pm: A(), pb: A(), film: A(), ever: A(), sat: A(), dw: A(), dp: A(),
      seed: 7, mat: null, box: null, done: false, ver: 0, dep: 0 };
    garden.soakFibres(f, M);
    return f;
  };
  const sum = (a: Float32Array) => a.reduce((s, v) => s + v, 0);

  it('leaves the blood to the bleeding effect while the letters are ink', () => {
    const { garden } = clocked(), letter: any = { ch: 'l', x: 0, y: 0 }, hit = { l: letter, lx: 0, ly: -0.5 };
    garden.addStainLegacy = vi.fn(() => ({ runs: [] }));
    garden.soakField = vi.fn();
    expect(garden.material().id).toBe('ink');
    const st = garden.addStain(hit, 0.04, 1000);
    expect(garden.addStainLegacy).toHaveBeenCalledWith(hit, 0.04, 1000);
    expect(garden.soakField).not.toHaveBeenCalled();
    expect(st.mat).toBeUndefined();
    expect(letter._soak).toBeUndefined();
  });

  it('cuts a splash\'s trails and holds back its drips where an absorbent letter is dry, and lets them run where it is soaked', () => {
    const { garden } = clocked(), made: any[] = [];
    garden.state.material = 'blotting';
    garden.soakField = () => ({});
    garden.addStainLegacy = vi.fn(() => { made.push(garden.fx()); return { runs: [] }; });
    for (const full of [0, 1]) { garden.soakAt = () => full; expect(garden.addStain({ l: {}, lx: 0, ly: -0.5 }, 0.04, 1000).mat.id).toBe('blotting'); }
    const [dry, soaked] = made;
    expect(dry.length).toBeCloseTo(0.12);
    expect([dry.beads, dry.pool]).toEqual([0, 0]);
    expect(soaked).toEqual(LEGACY());
    expect(garden.fx()).toEqual(LEGACY()); // (the effect in use is as it was)
  });

  it('gives wax only the splash, and puts the effect back even when a splash fails', () => {
    const { garden } = clocked();
    garden.state.material = 'wax';
    garden.soakField = () => ({}); garden.soakAt = () => 0;
    garden.addStainFluid = vi.fn(() => { throw new Error('no room'); });
    garden.addStainLegacy = vi.fn(() => ({ runs: [], fx: garden.fx() }));
    expect(garden.addStain({ l: {}, lx: 0, ly: -0.5 }, 0.04, 1000).fx).toEqual({ ...LEGACY(), trails: 0, beads: 0, pool: 0 });
    garden.bloodFx = FLUID();
    expect(() => garden.addStain({ l: {}, lx: 0, ly: -0.5 }, 0.04, 1000)).toThrow('no room');
    expect(garden.fx()).toEqual(FLUID());
  });

  it('wicks liquid through the letter only, up as well as down, and keeps every drop of blood', () => {
    const { garden } = clocked(), f = field(garden, material(garden, 'blotting'), 24, 60, x => x >= 9 && x < 15); // (an upright stroke 6 cells wide)
    const at = 30 * 24 + 12;
    f.film[at] = 40; f.box = [12, 30, 12, 30];
    for (let k = 0; k < 120; k++) garden.soakTick(f, 0.05);
    for (let y = 0; y < 60; y++) for (let x = 0; x < 24; x++) if (x < 9 || x >= 15) expect(f.w[y * 24 + x] + f.pm[y * 24 + x] + f.pb[y * 24 + x]).toBe(0);
    const wet = (y: number) => [9, 10, 11, 12, 13, 14].some(x => f.ever[y * 24 + x] > 0); // (anywhere across the stroke)
    const rows = (from: number, step: number) => { let y = from; while (y + step >= 0 && y + step < 60 && wet(y + step)) y += step; return Math.abs(y - from); };
    expect(rows(30, -1)).toBeGreaterThanOrEqual(2); // (it climbs)
    expect(rows(30, 1)).toBeGreaterThan(rows(30, -1)); // (and sags a little further)
    expect(sum(f.pm) + sum(f.pb) + sum(f.film)).toBeCloseTo(40, 3);
    expect(Math.min(...f.w, ...f.pm, ...f.pb)).toBeGreaterThanOrEqual(0);
    // the blood is densest where it fell
    expect(f.pm[at] + f.pb[at]).toBeGreaterThan(f.pm[22 * 24 + 12] + f.pb[22 * 24 + 12]);
  });

  it('slides a heavy bead down a wax letter and lets it fall from the end of the stroke, while a small one stays and dries', () => {
    const { garden, clock } = clocked(), f = field(garden, material(garden, 'wax'), 20, 60, (x, y) => x >= 3 && x < 17 && y < 40);
    garden.bloodFx = LEGACY({ dry: 5 });
    for (let y = 4; y <= 6; y++) for (let x = 9; x <= 11; x++) f.film[y * 20 + x] = 12; // (a big splash near the top)
    f.film[20 * 20 + 5] = 3; // (a droplet)
    f.box = [5, 4, 11, 20];
    for (let k = 0; k < 240; k++) { clock.t += 50; garden.beadTick(f, 0.05, { x: 0, y: 0 }, 100); }
    const fell = garden.drops.filter((d: any) => d.st === 'fall');
    expect(fell).toHaveLength(1);
    expect(fell[0].y).toBeGreaterThan(48); // (from the stroke's end, 40 cells down: half an em)
    // what stayed is dried where it was: the droplet, and at most a speck where the splash landed
    expect(f.beads.every((b: any) => b.dried)).toBe(true);
    expect(f.beads.some((b: any) => Math.round(b.x) === 5 && Math.round(b.y) === 20)).toBe(true);
    expect(f.beads.every((b: any) => b.v < material(garden, 'wax').pin)).toBe(true);
    expect(f.pb[25 * 20 + 10]).toBeGreaterThan(0); // (the smear it left on the way down)
  });

  it('keeps the material with the appearance and brings it back, ignoring one it does not know', () => {
    const harness = (stored: string | null = null) => {
      const data: Record<string, string> = {};
      if (stored != null) data['typeGarden.appearance'] = stored;
      const localStorage = { getItem: (k: string) => data[k] ?? null, setItem: (k: string, v: string) => { data[k] = v; } };
      const StoreApp = runInNewContext(classSource, { localStorage, performance: { now: () => 10000 } });
      const garden = Object.assign(Object.create(StoreApp.prototype), { state: { look: 'crimson', material: 'ink' }, STORE: 'typeGarden.appearance', ...structuredClone(TABLES) });
      garden.appearance = { ...garden.look().appearance, font: 'playfair' };
      return { garden, data };
    };
    const first = harness();
    expect(first.garden.setMaterial('glass')).toBe(false);
    expect(first.garden.setMaterial('wax')).toBe(true);
    first.garden.storeAppearance();
    const next = harness(first.data['typeGarden.appearance']);
    next.garden.restoreAppearance();
    expect(next.garden.material().id).toBe('wax');
    const odd = harness(JSON.stringify({ material: 'glass' }));
    odd.garden.restoreAppearance();
    expect(odd.garden.material().id).toBe('ink');
  });
});

describe('Standalone TypeGardenApp botanicals', () => {
  // three words of customized plants, grown the way the page grows them (the usual way of writing, no DOM)
  const grown = () => {
    const garden = writer();
    typeInto(garden, 'in bloom red roses', 0, 120);
    for (const letter of live(garden)) if (letter.els) garden.genCluster(letter);
    return garden;
  };
  const botanical = (garden: any, patch: Record<string, number>) => garden.setAppearance({ botanical: patch });
  const shown = (garden: any, kind: string) => new Set<number>(live(garden).flatMap((letter: any) => letter.els
    ? garden.letterLists(letter, true).flatMap((list: any[]) => list.filter((e: any) => e.t === kind && garden.vineShown(e, list)).map((e: any) => e.id)) : []));
  const subset = (a: Set<number>, b: Set<number>) => [...a].every(id => b.has(id));

  it('compiles the neutral values to exactly the constants the garden has always used', () => {
    const garden = app(), B = garden.compileBotanical();
    expect([B.roseDrop, B.leafDrop, B.bareDrop, B.branchRose, B.branchLeaf, B.leafGone, B.roseGone]).toEqual([0.3, 0.35, 0.5, 0, 0, 0, 0]);
    expect([B.lo, B.hi, B.leaf, B.vine, B.thornShow, B.thornExtra, B.thornSize]).toEqual([1, 1, 1, 1, 1, 0, 1]);
    expect(B.cap).toEqual({ hero: 3, leaf: 2, earned: 5 });
    expect([B.stageB, B.stageH, B.dBud, B.dHalf].map((v: number) => +v.toFixed(12))).toEqual([0.28, 0.88, 0.28, 0.88]);
    expect(garden.cleanBotanical()).toEqual(Object.fromEntries(garden.BOTANICAL.map((c: any) => [c.k, c.def])));
    expect(garden.bots()).toBe(garden.bots()); // compiled once for the appearance in use
  });

  it('checks every value, keeping the largest roses at least as big as the smallest and a mix of nothing the usual mix', () => {
    const garden = app(), clean = garden.cleanBotanical({ roses: 9, leaf: 'big', vine: -3, thorns: NaN, roseLo: 1.4, roseHi: 0.6 });
    expect([clean.roses, clean.leaf, clean.vine, clean.thorns]).toEqual([2, 1, 0.5, 1]);
    expect(clean.roseHi).toBeGreaterThanOrEqual(clean.roseLo);
    expect(garden.cleanBotanical({ buds: 0, half: 0, full: 0 })).toMatchObject({ buds: 0.28, half: 0.6, full: 0.12 });
    expect(garden.cleanBotanical(null)).toEqual(garden.cleanBotanical());
  });

  it('shows more roses as the density rises and fewer as it falls, each setting holding the last one\'s roses, and always the hero blooms', () => {
    const garden = grown(), at = (roses: number) => { botanical(garden, { roses }); return shown(garden, 'rose'); };
    const usual = shown(garden, 'rose'), sets = [0, 0.5, 1, 1.5, 2].map(at);
    expect(sets[2]).toEqual(usual); // the neutral setting is the garden as it grows
    for (let i = 1; i < sets.length; i++) expect(subset(sets[i - 1], sets[i])).toBe(true);
    expect(sets[0].size).toBeLessThan(sets[2].size);
    expect(sets[2].size).toBeLessThan(sets[4].size);
    const heroes = live(garden).flatMap((l: any) => l.els.filter((e: any) => e.t === 'rose' && e.stage === 'full' && !e.stem.companion).map((e: any) => e.id));
    expect(heroes.length).toBeGreaterThan(0);
    for (const id of heroes) expect(sets[0].has(id)).toBe(true);
  });

  it('brings leaves and leafy shoots back as the foliage rises, to none at all, without moving the vines that stay', () => {
    const garden = grown(), at = (foliage: number) => { botanical(garden, { foliage }); return { leaves: shown(garden, 'leaf'), stems: shown(garden, 'stem') }; };
    const usual = at(1), sets = [0, 0.5, 1, 1.5, 2].map(at);
    expect(sets[0].leaves.size).toBe(0);
    for (let i = 1; i < sets.length; i++) { expect(subset(sets[i - 1].leaves, sets[i].leaves)).toBe(true); expect(subset(sets[i - 1].stems, sets[i].stems)).toBe(true); }
    expect(sets[2].leaves).toEqual(usual.leaves);
    expect(sets[4].leaves.size).toBeGreaterThan(sets[2].leaves.size);
    expect(sets[4].stems.size).toBeGreaterThan(sets[2].stems.size);
  });

  it('gathers more or fewer satellites around each hero rose as the clusters change, the usual three and two leaves at the neutral setting', () => {
    const garden = grown(), count = () => {
      let roses = 0, leaves = 0;
      for (const letter of live(garden)) if (letter.clusterEls) for (const e of letter.clusterEls) if (garden.vineShown(e, letter.clusterEls)) { if (e.t === 'rose') roses++; else if (e.t === 'leaf') leaves++; }
      return [roses, leaves];
    };
    const heroes = live(garden).filter((l: any) => l.clusterEls && l.clusterEls.length).length;
    expect(heroes).toBeGreaterThan(0);
    const at = (clusters: number) => { botanical(garden, { clusters }); return count(); };
    expect(at(1)).toEqual([3 * heroes, 2 * heroes]);
    expect(at(0)).toEqual([0, 0]);
    expect(at(2)).toEqual([6 * heroes, 4 * heroes]);
    expect(at(0.5)).toEqual([heroes, heroes]);
  });

  it('lets an earned bloom gather up to two more satellites, or fewer, with the clusters', () => {
    const garden = app();
    garden.REC = { cluster: 5 };
    const make = () => ({ letter: { id: 42, bloomEls: [] as any[] }, flower: { id: 4299.2, R: 0.15, stem: { pts: Array.from({ length: 19 }, (_, i) => [0, -i * 0.03]) }, bloom: { at: 0, end: null, kind: 'word' } } as any });
    const rich = make(); garden.setAppearance({ botanical: { clusters: 2 } });
    garden.growCluster(rich.letter, rich.flower, 20000, 100);
    const satellites = rich.letter.bloomEls.filter((e: any) => e.t === 'rose');
    expect(satellites.map((e: any) => e.cr)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(rich.letter.bloomEls.every((e: any) => e.cg === 'earned')).toBe(true);
    const shownRoses = (list: any[]) => list.filter((e: any) => e.t === 'rose' && garden.vineShown(e, list)).length;
    expect(shownRoses(rich.letter.bloomEls)).toBe(7);
    garden.setAppearance({ botanical: { clusters: 0.4 } }); // already grown, so hidden rather than grown again
    expect(shownRoses(rich.letter.bloomEls)).toBe(2);
    garden.setAppearance({ botanical: { clusters: 1 } });
    const usual = make();
    garden.growCluster(usual.letter, usual.flower, 20000, 100);
    expect(usual.letter.bloomEls.filter((e: any) => e.t === 'rose')).toHaveLength(5);
  });

  it('stretches the roses by how far up the garden\'s range of sizes they are, and spaces the heads by the sizes drawn', () => {
    const garden = app(), small = { id: 1, R: 0.07, x: 0, y: -0.5, rot: 0, stage: 'half' }, mid = { ...small, id: 2, R: 0.185 }, big = { ...small, id: 3, R: 0.3 };
    expect([small, mid, big].map(e => garden.roseR(e))).toEqual([0.07, 0.185, 0.3]);
    const usual = garden.roseFootprint(big, 0, 0).r;
    botanical(garden, { roseLo: 0.5, roseHi: 1.5 });
    expect(garden.roseR(small)).toBeCloseTo(0.035);
    expect(garden.roseR(mid)).toBeCloseTo(0.185);
    expect(garden.roseR(big)).toBeCloseTo(0.45);
    expect(garden.roseR({ ...big, R: 0.9 })).toBeCloseTo(1.35); // (beyond the range, the large end)
    expect(garden.roseFootprint(big, 0, 0).r).toBeGreaterThan(usual);
    garden._vine = false;
    expect(garden.roseR(big)).toBe(0.3); // the poster grows as it always has
    expect(garden.cur().roseHi).toBeUndefined();
    expect(garden.cur().vine).toBe(1);
  });

  it('keeps every rose\'s usual stage at the neutral mix, and moves them along the line from closed to open as the mix changes', () => {
    const garden = app(), legacy = (e: any) => { const hs = garden.h(e.id * 3.17 + 0.5), clear = e.wi == null && (e.y < -0.9 || e.y > 0.15); return hs < 0.12 && clear ? 'full' : hs < 0.4 ? 'bud' : 'half'; };
    const ambient = () => Array.from({ length: 300 }, (_, i) => ({ t: 'rose', id: 100 + i * 3.7, x: 0, y: i % 3 === 0 ? -1.2 : -0.4, R: 0.12, rot: 0 }));
    const coil = () => Array.from({ length: 100 }, (_, i) => ({ t: 'rose', id: 9000 + i * 1.3, x: 0, y: -0.4, R: 0.1, rot: 0, wi: 3, stage: i % 2 ? 'bud' : 'half', soft: true }));
    const roses = ambient(), expected = roses.map(legacy), coils = coil(), coilStages = coils.map(e => e.stage);
    expect(roses.map(e => garden.roseStage(e))).toEqual(expected);
    expect(coils.map(e => garden.roseStage(e))).toEqual(coilStages);
    const stages = (list: any[], mix: Record<string, number>) => { botanical(garden, mix); return list.map(e => garden.roseStage(e)); };
    const share = (list: string[], s: string) => list.filter(x => x === s).length / list.length;
    expect(stages(roses, { buds: 1, half: 0, full: 0 }).every(s => s === 'bud')).toBe(true);
    expect(stages(coils, { buds: 1, half: 0, full: 0 }).every(s => s === 'bud')).toBe(true); // the coiled roses follow the mix too
    expect(share(stages(roses, { buds: 0.1, half: 0.3, full: 0.6 }), 'full')).toBeGreaterThan(0.45);
    // more of one stage only ever takes roses from the stages next to it: nothing that was full stops being full
    const before = stages(roses, { buds: 0.28, half: 0.6, full: 0.12 }), after = stages(roses, { buds: 0.2, half: 0.4, full: 0.4 });
    expect(before).toEqual(expected);
    before.forEach((s, i) => { if (s === 'full') expect(after[i]).toBe('full'); });
    // heroes and earned blooms carry their own stage and never move
    const hero = { t: 'rose', id: 5, x: 0, y: -1, R: 0.2, rot: 0, stage: 'full' };
    expect(stages([hero], { buds: 1, half: 0, full: 0 })).toEqual(['full']);
  });

  it('grows more thorns, and bigger ones, as the danger rises, from smooth canes, and never hides a knot\'s or scar\'s', () => {
    const garden = app(), stem = { t: 'stem', id: 77, thorns: [{ u: 0.3, s: 1 }, { u: 0.7, s: -1 }] }, knot = { t: 'stem', id: 78, thornK: 1, fixedThorns: true, thorns: [{ u: 0.5, s: 1 }] };
    const all = garden.getCustomizedThorns(stem), usual = all.filter((th: any) => th.x === undefined), extras = all.filter((th: any) => th.x !== undefined);
    expect(extras.length).toBeGreaterThan(0);
    const shown = (e: any, thorns: number) => { botanical(garden, { thorns }); return garden.getCustomizedThorns(e).filter((th: any) => garden.thornOn(e, th, garden.bots())); };
    expect(shown(stem, 1)).toEqual(usual); // the neutral setting shows exactly the usual prickles
    expect(shown(stem, 0)).toHaveLength(0);
    const half = shown(stem, 0.5);
    expect(half.length).toBeLessThanOrEqual(usual.length);
    expect(half.every((th: any) => usual.includes(th))).toBe(true);
    expect(shown(stem, 2)).toHaveLength(usual.length + extras.length);
    expect(shown(knot, 0)).toHaveLength(1);
    expect(garden.compileBotanical({ thorns: 0 }).thornSize).toBeLessThan(1);
    expect(garden.compileBotanical({ thorns: 2 }).thornSize).toBeGreaterThan(1.5);
    expect(garden.getCustomizedThorns(stem)).toBe(all); // (remembered: the extras came from a stream of their own)
  });

  it('eases plants in and out when a botanical changes rather than popping them, and settles each one', () => {
    const garden = grown();
    garden._frameNo = 0; garden._bk = 0.4;
    const letter = live(garden).find((l: any) => l.els.some((e: any) => e.t === 'rose' && e.stage !== 'full' && !garden.thinned(e, l.els)));
    const element = letter.els.find((e: any) => e.t === 'rose' && e.stage !== 'full' && !garden.thinned(e, letter.els)), list = letter.els;
    expect(garden.vineShown(element, list)).toBe(element);
    expect(element._v).toBeUndefined(); // settled: nothing to ease
    botanical(garden, { roses: 0 }); // hides it
    const seen: number[] = [];
    for (let frame = 1; frame < 40; frame++) { garden._frameNo = frame; if (garden.vineShown(element, list)) seen.push(element._v ?? 1); else break; }
    expect(garden.thinned(element, list)).toBe(true);
    expect(seen.length).toBeGreaterThan(3);
    expect(seen.slice(0, -1).every((v, i) => v > seen[i + 1])).toBe(true); // shrinking a little every frame
    expect(garden.vineShown(element, list)).toBeNull();
    expect(element._v).toBeUndefined();
    botanical(garden, { roses: 1 }); // and back
    const up: number[] = [];
    for (let frame = 80; frame < 120; frame++) { garden._frameNo = frame; if (garden.vineShown(element, list)) { up.push(element._v ?? 1); if (element._v === undefined) break; } }
    expect(up[0]).toBeLessThan(0.5);
    expect(up[up.length - 1]).toBe(1);
    expect(up.slice(0, -1).every((v, i) => v < up[i + 1])).toBe(true);
  });

  it('only shows and hides what the plants already are: the writing record and every plant\'s identity are untouched', () => {
    const garden = grown();
    const record = () => JSON.stringify(live(garden).map((l: any) => [l.ch, l.id, l.seed, l.hes, l.rev, l.birth, (l.els || []).map((e: any) => [e.t, e.id, e.x, e.y, e.R, e.d0, e.a])]));
    const before = record();
    botanical(garden, { roses: 2, foliage: 0, thorns: 2, vine: 1.8, leaf: 1.6, clusters: 2, roseHi: 1.5, buds: 0.1, half: 0.2, full: 0.7 });
    expect(record()).toBe(before);
    botanical(garden, { roses: 0.2, foliage: 1.7, thorns: 0, clusters: 0 });
    expect(record()).toBe(before);
  });

  it('keeps them in the appearance, which a look leaves alone, and in the custom appearance once edited', () => {
    const garden = Object.assign(writer(), { updateTheme: vi.fn(), buildPalettesUI: vi.fn(), paint: vi.fn(), focus: vi.fn(), buildPoster: vi.fn() });
    garden.state.look = 'crimson';
    expect(botanical(garden, { roses: 1 })).toBe(false); // nothing differs
    expect(botanical(garden, { roses: 1.4, thorns: 1.6 })).toBe(true);
    expect(garden.state.look).toBe('crimson'); // they are not part of what a look is
    expect(garden.appearance.botanical).toMatchObject({ roses: 1.4, thorns: 1.6, foliage: 1 });
    garden.setLook('ivory');
    expect(garden.appearance.botanical).toMatchObject({ roses: 1.4, thorns: 1.6 });
    garden.editBotanical({ foliage: 1.3 });
    expect(garden.customAppearance.botanical).toMatchObject({ roses: 1.4, foliage: 1.3 });
    // an edit changes only what it names; the three bloom shares stay one mix; the largest never falls below the smallest
    garden.editBotanical({ full: 0.4 });
    const b = garden.appearance.botanical;
    expect(b.buds + b.half + b.full).toBeCloseTo(1, 2);
    expect(b.full).toBe(0.4);
    expect(b.half / b.buds).toBeCloseTo(0.6 / 0.28, 1); // the other two keep their proportion
    garden.editBotanical({ roseLo: 1.3 });
    garden.editBotanical({ roseHi: 0.8 });
    expect(garden.appearance.botanical.roseLo).toBeLessThanOrEqual(garden.appearance.botanical.roseHi);
    expect(garden.customAppearance.botanical).toEqual(garden.appearance.botanical);
  });

  it('names the controls for what they do', () => {
    const garden = app(), label = (k: string) => garden.BOTANICAL.find((c: any) => c.k === k).label;
    expect([label('roseLo'), label('roseHi'), label('clusters')]).toEqual(['Min rose size', 'Max rose size', 'Bloom clusters']);
  });

  it('leaves every look botanically neutral: a look sets colours only, and trying looks never changes a botanical', () => {
    const garden = Object.assign(writer(), { updateTheme: vi.fn(), buildPalettesUI: vi.fn(), paint: vi.fn(), focus: vi.fn(), buildPoster: vi.fn() });
    expect(garden.LOOKS.some((look: any) => 'botanical' in look.appearance || 'botanical' in look)).toBe(false);
    botanical(garden, { roses: 1.3, foliage: 0.6, thorns: 1.7, clusters: 0.5, roseHi: 1.4, full: 0.3 });
    const set = JSON.stringify(garden.appearance.botanical);
    for (const look of garden.LOOKS) { garden.setLook(look.id); expect(JSON.stringify(garden.appearance.botanical)).toBe(set); }
    garden.setLook('crimson');
    expect(garden.state.look).toBe('crimson'); // (and a look is still matched by its colours alone)
  });

  // a stand-in letter 'l': a stem 0.14 em wide from the baseline up to -0.75 em, in the glyph scan's rows
  const stem = () => {
    const rows = new Map<number, number[][]>();
    for (let k = -60; k < 0; k++) rows.set(k, [[-0.07, 0.07]]);
    return rows;
  };
  const withLetter = (garden: any) => Object.assign(garden, { inkIndex: () => stem() });
  const letters = [{ ch: 'l', tx: 0, ty: 0, els: [] }];

  it('measures how much of a letter\'s ink a rose head covers', () => {
    const garden = withLetter(app());
    expect(garden.inkArea('l')).toBeCloseTo(0.14 * 0.75, 3);
    expect(garden.inkCover({ x: 0, y: -0.4, r: 2 }, letters, 1)).toBeCloseTo(1, 3); // all of it
    expect(garden.inkCover({ x: 3, y: -0.4, r: 0.3 }, letters, 1)).toBe(0); // none
    const half = garden.inkCover({ x: 0, y: -0.375, r: 0.1 }, letters, 1); // a small head on the middle of the stem
    expect(half).toBeGreaterThan(0.15);
    expect(half).toBeLessThan(0.35);
    expect(garden.inkCover({ x: 0, y: -0.4, r: 2 }, [{ ...letters[0], dead: 1 }, { ch: ' ', tx: 0, ty: 0 }], 1)).toBe(0); // dead letters and spaces have none
  });

  it('eases a full bloom smaller where it would cover too much of a letter, then holds an ordinary one half-open, and never caps the slider', () => {
    const garden = withLetter(app());
    garden.setAppearance({ botanical: { buds: 0, half: 0, full: 1 } }); // every ordinary rose promoted to a full bloom
    const B = garden.bots(), rose = (x: number, y: number, id = 11): any => ({ t: 'rose', id, x, y, R: 0.2, rot: 0, soft: true, stage: 'half' });
    expect(B.guard).toBe(true);
    const natural = 0.2, head = (e: any, k = 1) => garden.roseFootprint(e, 0, 0, k);
    // clear of the letter: a full bloom keeps its full size
    const free = rose(2, -0.4); garden.roseStage(free);
    garden.coverGuard(free, 0, 0, letters, 1);
    expect([free.stage, free._rt]).toEqual(['full', 1]);
    // scan across the stem for a spot where a full bloom covers a little more than the allowance
    let edge: any = null;
    for (let x = 0.5; x > 0; x -= 0.01) { const e = rose(x, -0.4); garden.roseStage(e); const c = garden.inkCover(head(e), letters, 1); if (!edge && c > B.cover + 0.05 && c < 0.5) edge = e; }
    expect(edge).not.toBeNull();
    garden.coverGuard(edge, 0, 0, letters, 1);
    expect(edge.stage).toBe('full'); // eased smaller rather than closed
    expect(edge._rt).toBeLessThan(1);
    expect(edge._rt).toBeGreaterThanOrEqual(natural / (0.2 * 1.6) - 1e-9); // never below its size in the garden as grown
    expect(garden.inkCover(head(edge, edge._rt), letters, 1)).toBeLessThanOrEqual(B.cover + 0.02);
    // right over the letter: easing is not enough, so an ordinary rose that the mix promoted stays half-open
    const over = rose(0, -0.4, 12); garden.roseStage(over);
    garden.coverGuard(over, 0, 0, letters, 1);
    expect([over.stage, over._rt, over._ms]).toEqual(['half', 1, 'full']);
    expect(garden.roseDropped(over)).toBe(false); // (it is still the mix's full bloom as far as being left out goes)
    // the settings change back: it opens fully again
    garden.setAppearance({ botanical: { buds: 0.28, half: 0.6, full: 0.12 } });
    garden.coverGuard(over, 0, 0, letters, 1);
    expect(over._rt).toBe(1);
    expect(garden.bots().guard).toBe(false);
  });

  it('is freer with hero and earned blooms, easing them only past a looser allowance and never below their size in the garden as grown', () => {
    const garden = withLetter(app());
    garden.setAppearance({ botanical: { roseLo: 1.6, roseHi: 1.6 } });
    const B = garden.bots(), hero = (x: number): any => ({ t: 'rose', id: 21, x, y: -0.4, R: 0.2, rot: 0, stage: 'full' });
    expect(B.coverFree).toBeGreaterThan(B.cover);
    const spots = [] as any[];
    for (let x = 0.7; x > 0; x -= 0.01) { const e = hero(x); spots.push({ x, c: garden.inkCover(garden.roseFootprint(e, 0, 0), letters, 1) }); }
    const middling = spots.find(s => s.c > B.cover + 0.04 && s.c < B.coverFree - 0.04), heavy = spots.find(s => s.c > B.coverFree + 0.1);
    expect(middling && heavy).toBeTruthy();
    const a = hero(middling.x); garden.coverGuard(a, 0, 0, letters, 1);
    expect(a._rt).toBe(1); // an ordinary full bloom here would be eased; a hero is not
    const b = hero(heavy.x); garden.coverGuard(b, 0, 0, letters, 1);
    expect(b._rt).toBeLessThan(1);
    expect(b._rt).toBeGreaterThanOrEqual(1 / 1.6 - 1e-9);
    expect(b.stage).toBe('full'); // never closed
  });

  it('does nothing at the neutral settings, in the poster, or for roses that are not full', () => {
    const garden = withLetter(app()), over: any = { t: 'rose', id: 31, x: 0, y: -0.4, R: 0.2, rot: 0, stage: 'full' };
    expect(garden.bots().guard).toBe(false);
    garden.coverGuard(over, 0, 0, letters, 1);
    expect(over._rt).toBe(1);
    garden.setAppearance({ botanical: { roseLo: 1.6, roseHi: 1.6 } });
    const half: any = { t: 'rose', id: 32, x: 0, y: -0.4, R: 0.2, rot: 0, stage: 'half' };
    garden.coverGuard(half, 0, 0, letters, 1);
    expect([half._rt, half.stage]).toEqual([1, 'half']);
    garden._vine = false; // the poster grows as it always has
    garden.coverGuard(over, 0, 0, letters, 1);
    expect(over._rt).toBe(1);
  });

  it('arrives at an eased size over a moment rather than popping', () => {
    const garden = app(), rose: any = { id: 41 };
    garden._frameNo = 1; garden._bk = 0.4;
    rose._rt = 0.7;
    expect(garden.roseRelief(rose)).toBe(0.7); // first seen: no easing
    rose._rt = 1;
    garden._frameNo = 2;
    expect(garden.roseRelief(rose)).toBeCloseTo(0.82, 5);
    expect(garden.roseRelief(rose)).toBeCloseTo(0.82, 5); // once a frame
    for (let f = 3; f < 30; f++) { garden._frameNo = f; garden.roseRelief(rose); }
    expect(garden.roseRelief(rose)).toBe(1);
    expect(garden.roseRelief({ id: 42 })).toBe(1); // a rose nothing has eased
  });
});

describe('Standalone entry point parity', () => {
  it('ships the same application in index.html and type_garden.html', () => {
    const directOpenHtml = readFileSync(new URL('../../type_garden.html', import.meta.url), 'utf8');
    expect(directOpenHtml === html, 'The two standalone HTML entry points must stay synchronized.').toBe(true);
  });
});
