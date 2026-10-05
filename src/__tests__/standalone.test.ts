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

function app() {
  return Object.assign(Object.create(StandaloneApp.prototype), {
    props: {}, _vine: true, _G: 1.6, _now: 10000, _plantBudget: 2,
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
    _vine: true, _throttle: true, _sprBudget: 8,
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
    F: "'Playfair Display',serif", dpr: scale,
    inkBounds: () => ({ x0: -0.3, x1: 0.3, y0: -0.75, y1: 0.02 }),
    paintStain: vi.fn((g: any, _letter: any, stain: any) => g.operations.push({ kind: 'stain', stain, operation: g.globalCompositeOperation })),
    paintStainBeads: vi.fn((g: any, _letter: any, stain: any) => g.operations.push({ kind: 'bead', stain, operation: g.globalCompositeOperation })),
  });
  return { garden, context: context(scale) };
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
    state: { busy: true }, fontsReady: false, backend,
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
      state: { mode: 'type', treatment: 'customized' }, W: 600, H: 400,
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
        key: 0, lx: 30, ly: 40, lean: [0, 0],
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
      const roses = letter.clusterEls.filter((element: any) => element.t === 'rose');
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

  it('accumulates splashes across return visits without restarting earlier trails', () => {
    const letter = { ch: 'O', x: 100, y: 100 };
    const garden = Object.assign(writer(), {
      _blooms: { 5: { x: 100, y: 0, R: 8, stage: 'half' } },
      stains: [], inkBelow: () => true, inkAt: () => true, inkEnd: () => -0.2,
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
        expect(run.len).toBeGreaterThan(original.lengths[i]);
        expect(run.dropped).toBe(false);
      });
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

describe('Standalone entry point parity', () => {
  it('ships the same application in index.html and type_garden.html', () => {
    const directOpenHtml = readFileSync(new URL('../../type_garden.html', import.meta.url), 'utf8');
    expect(directOpenHtml === html, 'The two standalone HTML entry points must stay synchronized.').toBe(true);
  });
});
