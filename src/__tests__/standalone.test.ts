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
const StandaloneApp = runInNewContext(classSource);

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
    getTransform: () => ({ a: 1, b: 0 }),
    setTransform: vi.fn(), save: vi.fn(), restore: vi.fn(),
    translate: vi.fn(), rotate: vi.fn(), scale: vi.fn(),
    clearRect: () => { draws.length = 0; },
    drawImage(image: any) {
      draws.push({ image, alpha: this.globalAlpha, operation: this.globalCompositeOperation });
    },
  };
}

function spriteHarness() {
  class TestCanvas {
    context = canvasContext();
    constructor(public width: number, public height: number) {}
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

  it('gives offset companion flowers a stalk connected to their parent tip', () => {
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
        if (!parentHidden) visibleCompanions++;
      }
    }
    expect(companions).toBeGreaterThan(0);
    expect(visibleCompanions).toBeGreaterThan(0);
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

describe('Standalone entry point parity', () => {
  it('ships the same application in index.html and type_garden.html', () => {
    const directOpenHtml = readFileSync(new URL('../../type_garden.html', import.meta.url), 'utf8');
    expect(directOpenHtml === html, 'The two standalone HTML entry points must stay synchronized.').toBe(true);
  });
});
