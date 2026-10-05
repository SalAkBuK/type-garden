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

  it('gives offset companion flowers a stalk connected to their parent tip, which the customized view leaves out', () => {
    const garden = app();
    const parameters = { ...garden.wordParams(12345), w: 0.55 };
    let companions = 0;
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
        // The customized view shows only earned blooms, so a companion stalk would be bare: it goes with its rose
        expect(garden.thinned(stalk, elements)).toBe(true);
        expect(garden.vineShown(flower, elements)).toBeNull();
      }
    }
    expect(companions).toBeGreaterThan(0);
  });

  it('finishes a generated rose\'s stem with a leaf in the customized view, and shows earned blooms', () => {
    const garden = app();
    const parameters = { ...garden.wordParams(777), w: 0.55 };
    let leaves = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const elements: any[] = [];
      let nextId = seed * 100;
      garden.grow(garden.rng(seed), elements, () => nextId++, parameters, { base: [0, 0], dir: -Math.PI / 2, len: 0.9, d0: 0, tip: 'rose' });
      const flower = elements.find(element => element.t === 'rose' && !element.stem.companion);
      expect(garden.thinned(flower, elements)).toBe(true);
      const shown = garden.vineShown(flower, elements);
      if (garden.thinned(flower.stem, elements)) { expect(shown).toBeNull(); continue; }
      leaves++;
      expect(shown.t).toBe('leaf');
      expect([shown.x, shown.y]).toEqual([flower.x, flower.y]);
      expect(shown.stem).toBe(flower.stem);
    }
    expect(leaves).toBeGreaterThan(0);
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
  const tipRoses = (garden: any, count: number) => {
    const parameters = { ...garden.wordParams(777), w: 0.55 }, out: any[] = [];
    for (let seed = 1; seed <= count; seed++) {
      const elements: any[] = [];
      let nextId = seed * 100;
      garden.grow(garden.rng(seed), elements, () => nextId++, parameters, { base: [0, 0], dir: -Math.PI / 2, len: 0.9, d0: 0, tip: 'rose' });
      out.push({ elements, flower: elements.find(element => element.t === 'rose' && !element.stem.companion) });
    }
    return out;
  };

  it('finishes a share of the stem tips with ambient roses in mixed states, all smaller than earned blooms and never perches', () => {
    const garden = app();
    garden.REC = { roses: 1.5, cluster: 3 }; // with the word intensity at its lowest (0.35), still every visible tip
    const stages = new Set<string>();
    let shown = 0;
    for (const { elements, flower } of tipRoses(garden, 120)) {
      const rose = garden.vineShown(flower, elements);
      if (!rose) continue;
      shown++;
      stages.add(rose.stage);
      expect(rose).toMatchObject({ t: 'rose', amb: true, stem: flower.stem, x: flower.x, y: flower.y });
      expect(rose.bloom).toBeUndefined(); // so it neither opens with stillness nor becomes a perch
      const visual = rose.R * (rose.stage === 'full' ? 1.6 : rose.stage === 'bud' ? 0.85 : 1);
      expect(visual).toBeLessThan(0.14 * 1.6); // the smallest earned bloom
      if (rose.stage === 'half') expect(rose.cap).toBeGreaterThan(1500); // a pre-bloom holds partly open
      expect(garden.vineShown(flower, elements)).toBe(rose);
    }
    expect(shown).toBeGreaterThan(0);
    expect([...stages].sort()).toEqual(['bud', 'full', 'half']);
  });

  it('grows some words lusher than others', () => {
    const garden = app();
    const values = Array.from({ length: 50 }, (_, i) => garden.flora(1000 + i * 7919));
    expect(Math.min(...values)).toBeGreaterThanOrEqual(0.35);
    expect(Math.max(...values)).toBeLessThanOrEqual(1.5);
    expect(Math.max(...values) - Math.min(...values)).toBeGreaterThan(0.6);
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
});

describe('Standalone TypeGardenApp blood', () => {
  it('makes a bitten bloom bleed for good, with no drop limit', () => {
    const garden = writer();
    garden.biteRose(5, 1000);
    expect(garden.bites[5]).toEqual({ t: 1000, next: 1250 });
    garden.biteRose(5, 9000); // a second bite changes nothing
    expect(garden.bites[5]).toEqual({ t: 1000, next: 1250 });
  });

  it('makes the rest of a bitten bloom\'s cluster bleed too, more slowly', () => {
    const garden = writer();
    const b = { at: 0, end: 10, kind: 'word' }, main = { t: 'rose', id: 5, bloom: b }, bud = { t: 'rose', id: 6, bloom: b, cluster: true };
    garden._roseById = { 5: { e: main, l: { bloomEls: [main, bud] } } };
    garden.biteRose(5, 1000);
    expect(garden.bites[6]).toMatchObject({ t: 1000, slow: true });
    expect(garden.bites[6].next).toBeGreaterThan(1250);
  });

  it('sends later trails down the same channel, widening it', () => {
    const garden = writer(), letter: any = { ch: 'l' };
    const first = garden.bloodChannel(letter, 0.1, -0.6, 0.02);
    const second = garden.bloodChannel(letter, 0.12, -0.6, 0.02);
    expect(second).toBe(first);
    expect(first.w).toBeGreaterThan(0.02);
    expect(first.n).toBe(2);
    expect(garden.bloodChannel(letter, 0.3, -0.6, 0.02)).not.toBe(first);
    for (let i = 0; i < 100; i++) garden.bloodChannel(letter, 0.1, -0.6, 0.02);
    expect(first.w).toBeLessThanOrEqual(0.045);
  });

  it('collects blood in a pool along the foot of a stroke that spreads with its volume but stays on the foot', () => {
    const garden = writer(), letter: any = { ch: 'l' };
    garden.footSpan = () => [-0.2, 0.15];
    const pool = garden.feedPool(letter, 0, 0, 0.02, 1000);
    expect(garden.feedPool(letter, 0.05, 0.01, 0.02, 2000)).toBe(pool);
    expect(pool.vol).toBeCloseTo(0.04);
    expect(pool.fed).toBe(2000);
    const narrow = garden.poolSpan(pool);
    pool.vol = 5;
    const [a, b] = garden.poolSpan(pool);
    expect(b - a).toBeGreaterThan(narrow[1] - narrow[0]);
    expect(a).toBeGreaterThanOrEqual(-0.2);
    expect(b).toBeLessThanOrEqual(0.15);
    expect(garden.feedPool(letter, 0.05, -0.4, 0.02, 3000)).not.toBe(pool); // another edge, another pool
  });

  it('forgets a bloom\'s bite when its letter is removed, so a retyped letter does not inherit it', () => {
    const garden = writer();
    const letter: any = { ch: 'e', els: [], bloomEls: [{ t: 'rose', id: 77 }], _blood: { channels: [], pools: [], baked: [], fresh: [] } };
    garden.biteRose(77, 0);
    garden.releaseLetters([letter]);
    expect(garden.bites[77]).toBeUndefined();
    expect(letter._blood).toBeNull();
  });

  it('sends the butterfly to an open bloom it has not fed on, soon after the writer goes still', () => {
    const garden = writer();
    Object.assign(garden, {
      props: { blood: true }, reduced: false, _keyAt: 0, spawnFly: vi.fn(),
      perch: [{ id: 1, x: 10, y: 10, R: 5 }, { id: 2, x: 50, y: 10, R: 5 }], bites: { 1: { t: 0, next: 0 } },
    });
    garden.maybeVisit(500); // not still for long enough yet
    garden.maybeVisit(2000);
    garden.maybeVisit(4000);
    expect(garden.spawnFly).toHaveBeenCalledOnce();
    expect(garden.spawnFly.mock.calls[0][2]).toBe(2);
  });
});

describe('Standalone entry point parity', () => {
  it('ships the same application in index.html and type_garden.html', () => {
    const directOpenHtml = readFileSync(new URL('../../type_garden.html', import.meta.url), 'utf8');
    expect(directOpenHtml === html, 'The two standalone HTML entry points must stay synchronized.').toBe(true);
  });
});
