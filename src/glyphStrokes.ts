// Typographic stroke anatomy and procedural wrapping generator
import { GlyphStroke, SplineNode, Thorn, RoseBloom, PetalLayer } from './types';
import { BOTANICAL_CONFIG } from './config';

// Deterministic PRNG (Mulberry32)
export function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function combineSeed(seed: number, index: number, char: string): number {
  return (seed ^ Math.imul(index, 374761393) ^ Math.imul(char.charCodeAt(0) || 0, 668265263)) >>> 0;
}

/**
 * Character typographic stroke classification.
 * Coordinates are relative to character origin at baseline (0, 0):
 * - y is negative upward: ascender ~ -0.85 * S, cap ~ -0.75 * S, x-height ~ -0.45 * S, baseline = 0, descender = +0.22 * S
 */
export function getGlyphStrokes(char: string, width: number, fontSize: number): GlyphStroke[] {
  const S = fontSize;
  const W = width;
  const strokes: GlyphStroke[] = [];
  const lower = char.toLowerCase();

  switch (lower) {
    case 't':
      strokes.push(
        { type: 'vertical', label: 'stem', x0: 0.35 * W, y0: -0.75 * S, x1: 0.35 * W, y1: 0.0 },
        { type: 'horizontal', label: 'crossbar', x0: 0.1 * W, y0: -0.48 * S, x1: 0.75 * W, y1: -0.48 * S }
      );
      break;

    case 'h':
      strokes.push(
        { type: 'vertical', label: 'ascender', x0: 0.22 * W, y0: -0.88 * S, x1: 0.22 * W, y1: 0.0 },
        { type: 'curve', label: 'arch', x0: 0.22 * W, y0: -0.42 * S, x1: 0.78 * W, y1: 0.0, cx: 0.5 * W, cy: -0.48 * S }
      );
      break;

    case 'd':
      strokes.push(
        { type: 'vertical', label: 'ascender', x0: 0.75 * W, y0: -0.88 * S, x1: 0.75 * W, y1: 0.0 },
        { type: 'loop', label: 'bowl', x0: 0.15 * W, y0: -0.22 * S, x1: 0.75 * W, y1: -0.22 * S }
      );
      break;

    case 'b':
      strokes.push(
        { type: 'vertical', label: 'ascender', x0: 0.22 * W, y0: -0.88 * S, x1: 0.22 * W, y1: 0.0 },
        { type: 'loop', label: 'bowl', x0: 0.22 * W, y0: -0.22 * S, x1: 0.82 * W, y1: -0.22 * S }
      );
      break;

    case 'l':
    case 'i':
      strokes.push(
        { type: 'vertical', label: 'stem', x0: 0.5 * W, y0: lower === 'l' ? -0.88 * S : -0.45 * S, x1: 0.5 * W, y1: 0.0 }
      );
      break;

    case 'f':
      strokes.push(
        { type: 'vertical', label: 'stem', x0: 0.35 * W, y0: -0.88 * S, x1: 0.35 * W, y1: 0.0 },
        { type: 'horizontal', label: 'crossbar', x0: 0.15 * W, y0: -0.48 * S, x1: 0.65 * W, y1: -0.48 * S }
      );
      break;

    case 'k':
      strokes.push(
        { type: 'vertical', label: 'ascender', x0: 0.22 * W, y0: -0.88 * S, x1: 0.22 * W, y1: 0.0 },
        { type: 'diagonal', label: 'upper-arm', x0: 0.75 * W, y0: -0.45 * S, x1: 0.25 * W, y1: -0.2 * S },
        { type: 'diagonal', label: 'lower-leg', x0: 0.35 * W, y0: -0.2 * S, x1: 0.8 * W, y1: 0.0 }
      );
      break;

    case 'o':
    case 'c':
      strokes.push(
        { type: 'loop', label: 'bowl', x0: 0.15 * W, y0: -0.22 * S, x1: 0.85 * W, y1: -0.22 * S }
      );
      break;

    case 'e':
      strokes.push(
        { type: 'horizontal', label: 'crossbar', x0: 0.15 * W, y0: -0.24 * S, x1: 0.85 * W, y1: -0.24 * S },
        { type: 'loop', label: 'bowl', x0: 0.15 * W, y0: -0.24 * S, x1: 0.85 * W, y1: -0.24 * S }
      );
      break;

    case 'm':
    case 'n':
      strokes.push(
        { type: 'vertical', label: 'stem1', x0: 0.18 * W, y0: -0.45 * S, x1: 0.18 * W, y1: 0.0 },
        { type: 'vertical', label: 'stem2', x0: 0.82 * W, y0: -0.45 * S, x1: 0.82 * W, y1: 0.0 }
      );
      break;

    case 'r':
      strokes.push(
        { type: 'vertical', label: 'stem', x0: 0.25 * W, y0: -0.45 * S, x1: 0.25 * W, y1: 0.0 },
        { type: 'curve', label: 'arm', x0: 0.25 * W, y0: -0.38 * S, x1: 0.8 * W, y1: -0.42 * S }
      );
      break;

    case 'g':
    case 'p':
    case 'y':
      strokes.push(
        { type: 'loop', label: 'bowl', x0: 0.2 * W, y0: -0.22 * S, x1: 0.8 * W, y1: -0.22 * S },
        { type: 'vertical', label: 'descender', x0: 0.75 * W, y0: -0.25 * S, x1: 0.75 * W, y1: 0.22 * S }
      );
      break;

    default:
      // General glyph spine
      strokes.push(
        { type: 'vertical', label: 'spine', x0: 0.45 * W, y0: -0.45 * S, x1: 0.45 * W, y1: 0.0 }
      );
      break;
  }

  return strokes;
}

/**
 * Generate stroke-level wrapping spline nodes for a specific character.
 * Alternates z-depth:
 *   z = -1: behind the glyph stroke
 *   z = +1: in front of the glyph stroke
 * Creates genuine physical weaving around letter ascenders, crossbars, and bowls.
 */
export function generateCharSplineNodes(
  char: string,
  charIndex: number,
  charRelX: number,
  charWidth: number,
  fontSize: number,
  seed: number
): { nodes: SplineNode[]; thorns: Thorn[]; rose?: RoseBloom } {
  const S = fontSize;
  const W = charWidth;
  const scale = fontSize / 32;
  const rng = mulberry32(combineSeed(seed, charIndex, char));
  const nodes: SplineNode[] = [];
  const thorns: Thorn[] = [];
  let rose: RoseBloom | undefined = undefined;

  const lower = char.toLowerCase();
  const strokes = getGlyphStrokes(char, W, S);
  const primaryStroke = strokes[0];

  // Alternating phase seed for ambient sway
  const basePhase = (charIndex * 0.7 + seed % 10) * Math.PI;

  const isUpper = char >= 'A' && char <= 'Z';
  const isPunctuation = /[.,;:!?'"()—\-]/.test(char);

  if (isPunctuation) {
    // Subtle low baseline grounding tendril: no giant thorn shoots
    nodes.push({
      id: `${charIndex}-n0`,
      charIndex,
      relX: charRelX + Math.max(1, Math.round(scale)),
      relY: -0.04 * S,
      z: -1,
      isAnchor: true,
      anchorType: 'punct-back',
      swayPhase: basePhase,
      swayAmp: BOTANICAL_CONFIG.idleSwayAmplitude * 0.4,
    });
    nodes.push({
      id: `${charIndex}-n1`,
      charIndex,
      relX: charRelX + 0.5 * W,
      relY: -0.1 * S,
      z: 1,
      isAnchor: true,
      anchorType: 'punct-front',
      swayPhase: basePhase + 0.6,
      swayAmp: BOTANICAL_CONFIG.idleSwayAmplitude * 0.5,
    });
    nodes.push({
      id: `${charIndex}-n2`,
      charIndex,
      relX: charRelX + W,
      relY: -0.04 * S,
      z: -1,
      isAnchor: false,
      swayPhase: basePhase + 1.2,
      swayAmp: BOTANICAL_CONFIG.idleSwayAmplitude * 0.4,
    });
  } else if (lower === 's') {
    // Sinuous S-curve: vine wraps through the spine waist and loops over both crests
    const midX = charRelX + 0.5 * W;
    const waistY = -0.24 * S;
    const topY = isUpper ? -0.75 * S : -0.45 * S;

    nodes.push({
      id: `${charIndex}-n0`,
      charIndex,
      relX: charRelX + 0.2 * W,
      relY: -0.06 * S,
      z: -1, // BEHIND bottom tail
      isAnchor: true,
      anchorType: 's-bottom-back',
      swayPhase: basePhase,
      swayAmp: BOTANICAL_CONFIG.idleSwayAmplitude,
    });
    nodes.push({
      id: `${charIndex}-n1`,
      charIndex,
      relX: charRelX + 0.7 * W,
      relY: -0.14 * S,
      z: 1, // IN FRONT of lower bowl
      isAnchor: true,
      anchorType: 's-lower-front',
      swayPhase: basePhase + 0.5,
      swayAmp: BOTANICAL_CONFIG.idleSwayAmplitude * 1.1,
    });
    nodes.push({
      id: `${charIndex}-n2`,
      charIndex,
      relX: midX,
      relY: waistY,
      z: -1, // BEHIND central diagonal waist
      isAnchor: true,
      anchorType: 's-waist-back',
      swayPhase: basePhase + 1.0,
      swayAmp: BOTANICAL_CONFIG.idleSwayAmplitude,
    });
    nodes.push({
      id: `${charIndex}-n3`,
      charIndex,
      relX: charRelX + 0.25 * W,
      relY: topY + 0.08 * S,
      z: 1, // IN FRONT of upper loop
      isAnchor: true,
      anchorType: 's-upper-front',
      swayPhase: basePhase + 1.5,
      swayAmp: BOTANICAL_CONFIG.idleSwayAmplitude * 1.2,
    });
    nodes.push({
      id: `${charIndex}-n4`,
      charIndex,
      relX: charRelX + 0.75 * W,
      relY: topY,
      z: -1, // BEHIND top crest
      isAnchor: true,
      anchorType: 's-top-back',
      swayPhase: basePhase + 2.0,
      swayAmp: BOTANICAL_CONFIG.idleSwayAmplitude,
    });

    thorns.push({
      id: `th-${charIndex}-0`,
      charIndex,
      relX: charRelX + 0.72 * W,
      relY: -0.15 * S,
      length: 8.5 * scale,
      angle: -Math.PI * 0.25,
      side: 1,
      maturity: 1.0,
    });

    if (rng() > 0.45) {
      rose = createRoseBloom(`${charIndex}-bloom`, charIndex, charRelX + 0.75 * W, topY - 4 * scale, 1, rng, fontSize);
    }
  } else if (lower === 't') {
    // Letter 't' / 'T': vine wraps vertically around the stem, then loops across crossbar!
    const stemX = charRelX + (isUpper ? 0.5 : 0.35) * W;
    const barY = isUpper ? -0.74 * S : -0.48 * S;
    const topY = isUpper ? -0.76 * S : -0.72 * S;

    // Node 1: Loop approaching bottom behind stem
    nodes.push({
      id: `${charIndex}-n0`,
      charIndex,
      relX: stemX - 5 * scale + (rng() - 0.5) * 2 * scale,
      relY: -0.05 * S,
      z: -1, // Behind stem
      isAnchor: true,
      anchorType: 'vertical-back',
      swayPhase: basePhase,
      swayAmp: BOTANICAL_CONFIG.idleSwayAmplitude,
    });

    // Node 2: Climbing up, crosses in FRONT of stem
    nodes.push({
      id: `${charIndex}-n1`,
      charIndex,
      relX: stemX,
      relY: isUpper ? -0.4 * S : -0.28 * S,
      z: 1, // In front of stem
      isAnchor: true,
      anchorType: 'vertical-front',
      swayPhase: basePhase + 0.5,
      swayAmp: BOTANICAL_CONFIG.idleSwayAmplitude * 1.1,
    });

    // Node 3: At crossbar junction, wraps BEHIND crossbar arm
    nodes.push({
      id: `${charIndex}-n2`,
      charIndex,
      relX: stemX + 5 * scale,
      relY: barY + 3 * scale,
      z: -1, // Behind crossbar
      isAnchor: true,
      anchorType: 'crossbar-back',
      swayPhase: basePhase + 1.0,
      swayAmp: BOTANICAL_CONFIG.idleSwayAmplitude * 0.9,
    });

    // Node 4: Loops up onto crossbar in FRONT
    nodes.push({
      id: `${charIndex}-n3`,
      charIndex,
      relX: charRelX + 0.75 * W,
      relY: barY - 3 * scale,
      z: 1, // In front of crossbar
      isAnchor: true,
      anchorType: 'crossbar-front',
      swayPhase: basePhase + 1.5,
      swayAmp: BOTANICAL_CONFIG.idleSwayAmplitude * 1.2,
    });

    // Thorn on stem
    thorns.push({
      id: `th-${charIndex}-0`,
      charIndex,
      relX: stemX - 3 * scale,
      relY: isUpper ? -0.35 * S : -0.2 * S,
      length: 8.5 * scale,
      angle: Math.PI * 1.15, // pointing outward left
      side: -1,
      maturity: 1.0,
    });

    if ((isUpper && rng() > 0.35) || (!isUpper && rng() > 0.5)) {
      rose = createRoseBloom(`${charIndex}-bloom`, charIndex, stemX, topY - 4 * scale, 1, rng, fontSize);
    }
  } else if (lower === 'h' || lower === 'b' || lower === 'd' || lower === 'l' || lower === 'k' || isUpper) {
    // Tall ascender / Capital letter: vine spirals climbing up and over the ascender spine!
    const stemRel = lower === 'd' ? 0.75 : (lower === 'k' || isUpper ? 0.3 : 0.25);
    const stemX = charRelX + stemRel * W;
    const topY = isUpper ? -0.78 * S : -0.88 * S;

    // Node 1: Loop behind lower ascender
    nodes.push({
      id: `${charIndex}-n0`,
      charIndex,
      relX: stemX - 6 * scale,
      relY: -0.15 * S,
      z: -1, // BEHIND
      isAnchor: true,
      anchorType: 'vertical-back',
      swayPhase: basePhase,
      swayAmp: BOTANICAL_CONFIG.idleSwayAmplitude,
    });

    // Node 2: Crosses in FRONT of ascender at mid-height
    nodes.push({
      id: `${charIndex}-n1`,
      charIndex,
      relX: stemX,
      relY: -0.45 * S,
      z: 1, // IN FRONT
      isAnchor: true,
      anchorType: 'vertical-front',
      swayPhase: basePhase + 0.6,
      swayAmp: BOTANICAL_CONFIG.idleSwayAmplitude * 1.2,
    });

    // Node 3: Loops BEHIND ascender near peak
    nodes.push({
      id: `${charIndex}-n2`,
      charIndex,
      relX: stemX + 5 * scale,
      relY: topY + 0.12 * S,
      z: -1, // BEHIND
      isAnchor: true,
      anchorType: 'vertical-back',
      swayPhase: basePhase + 1.2,
      swayAmp: BOTANICAL_CONFIG.idleSwayAmplitude * 0.9,
    });

    // Node 4: Crests peak of ascender IN FRONT
    nodes.push({
      id: `${charIndex}-n3`,
      charIndex,
      relX: stemX - 2 * scale,
      relY: topY - 3 * scale,
      z: 1, // IN FRONT
      isAnchor: true,
      anchorType: 'ascender-crest',
      swayPhase: basePhase + 1.8,
      swayAmp: BOTANICAL_CONFIG.idleSwayAmplitude * 1.4,
    });

    // Node 5: Arch descent to next character
    nodes.push({
      id: `${charIndex}-n4`,
      charIndex,
      relX: charRelX + W + Math.max(1, Math.round(scale)),
      relY: -0.25 * S,
      z: -1,
      isAnchor: false,
      swayPhase: basePhase + 2.2,
      swayAmp: BOTANICAL_CONFIG.idleSwayAmplitude,
    });

    // Thorns along the ascender
    thorns.push({
      id: `th-${charIndex}-0`,
      charIndex,
      relX: stemX - 4 * scale,
      relY: -0.32 * S,
      length: 9.5 * scale,
      angle: Math.PI * 0.85,
      side: -1,
      maturity: 1.0,
    });
    thorns.push({
      id: `th-${charIndex}-1`,
      charIndex,
      relX: stemX + 4 * scale,
      relY: -0.65 * S,
      length: 8.5 * scale,
      angle: -Math.PI * 0.2,
      side: 1,
      maturity: 1.0,
    });

    // Ascender letters are prime locations for blooms!
    if (rng() > 0.25) {
      rose = createRoseBloom(`${charIndex}-bloom`, charIndex, stemX - 2 * scale, topY - 5 * scale, 1, rng, fontSize);
    }
  } else if (lower === 'o' || lower === 'c' || lower === 'e' || lower === 'a') {
    // Bowl / Loop letters: vine threads through the bowl!
    const centerX = charRelX + 0.5 * W;
    const centerY = -0.22 * S;
    const radiusX = 0.38 * W;
    const radiusY = 0.22 * S;

    // Node 1: Enters bowl behind left rim
    nodes.push({
      id: `${charIndex}-n0`,
      charIndex,
      relX: centerX - radiusX - 2 * scale,
      relY: centerY + 2 * scale,
      z: -1, // BEHIND left stroke
      isAnchor: true,
      anchorType: 'bowl-back',
      swayPhase: basePhase,
      swayAmp: BOTANICAL_CONFIG.idleSwayAmplitude,
    });

    // Node 2: Inside bowl interior, loops over bottom in FRONT
    nodes.push({
      id: `${charIndex}-n1`,
      charIndex,
      relX: centerX,
      relY: centerY + radiusY * 0.6,
      z: 1, // IN FRONT of bowl bottom
      isAnchor: true,
      anchorType: 'bowl-front',
      swayPhase: basePhase + 0.7,
      swayAmp: BOTANICAL_CONFIG.idleSwayAmplitude * 1.1,
    });

    // Node 3: Exits bowl behind right rim
    nodes.push({
      id: `${charIndex}-n2`,
      charIndex,
      relX: centerX + radiusX + 3 * scale,
      relY: centerY - radiusY * 0.3,
      z: -1, // BEHIND right stroke
      isAnchor: true,
      anchorType: 'bowl-back',
      swayPhase: basePhase + 1.4,
      swayAmp: BOTANICAL_CONFIG.idleSwayAmplitude,
    });

    // Thorn on outer crest
    thorns.push({
      id: `th-${charIndex}-0`,
      charIndex,
      relX: centerX - radiusX,
      relY: centerY - 4 * scale,
      length: 8.0 * scale,
      angle: -Math.PI * 0.75,
      side: -1,
      maturity: 1.0,
    });

    // Rose bloom opportunity at crest of bowl
    if (rng() > 0.45) {
      rose = createRoseBloom(`${charIndex}-bloom`, charIndex, centerX, centerY - radiusY - 4 * scale, 1, rng, fontSize);
    }
  } else {
    // General letters: undulating organic wave weaving over baseline & x-height
    const midX = charRelX + 0.5 * W;

    nodes.push({
      id: `${charIndex}-n0`,
      charIndex,
      relX: charRelX + 2 * scale,
      relY: -0.08 * S,
      z: -1, // BEHIND
      isAnchor: true,
      anchorType: 'general-back',
      swayPhase: basePhase,
      swayAmp: BOTANICAL_CONFIG.idleSwayAmplitude,
    });

    nodes.push({
      id: `${charIndex}-n1`,
      charIndex,
      relX: midX,
      relY: -0.32 * S,
      z: 1, // IN FRONT
      isAnchor: true,
      anchorType: 'general-front',
      swayPhase: basePhase + 0.8,
      swayAmp: BOTANICAL_CONFIG.idleSwayAmplitude * 1.15,
    });

    nodes.push({
      id: `${charIndex}-n2`,
      charIndex,
      relX: charRelX + W,
      relY: -0.12 * S,
      z: -1, // BEHIND
      isAnchor: false,
      swayPhase: basePhase + 1.5,
      swayAmp: BOTANICAL_CONFIG.idleSwayAmplitude,
    });

    thorns.push({
      id: `th-${charIndex}-0`,
      charIndex,
      relX: midX + 2 * scale,
      relY: -0.34 * S,
      length: 7.5 * scale,
      angle: -Math.PI * 0.45,
      side: 1,
      maturity: 1.0,
    });

    // Rose bloom opportunity on crest of general letters
    if (rng() > 0.5) {
      rose = createRoseBloom(`${charIndex}-bloom`, charIndex, midX, -0.42 * S - 4 * scale, 1, rng, fontSize);
    }
  }

  return { nodes, thorns, rose };
}


/**
 * Procedural crimson gothic rose generator
 */
export function createRoseBloom(
  id: string,
  charIndex: number,
  relX: number,
  relY: number,
  z: number,
  rng: () => number,
  fontSize: number = 32
): RoseBloom {
  const scale = fontSize / 32;
  const baseRadius = (13.5 + rng() * 5.5) * scale;
  const rotation = rng() * Math.PI * 2;

  const petalLayers: PetalLayer[] = [
    // Outer calyx / deep velvet petals
    {
      count: 6,
      radius: baseRadius,
      rotation: rotation,
      color: BOTANICAL_CONFIG.colorRoseDeep,
    },
    // Middle petal whorl
    {
      count: 5,
      radius: baseRadius * 0.75,
      rotation: rotation + Math.PI / 5,
      color: BOTANICAL_CONFIG.colorRoseMid,
    },
    // Inner core whorl
    {
      count: 4,
      radius: baseRadius * 0.48,
      rotation: rotation + Math.PI / 3,
      color: BOTANICAL_CONFIG.colorRoseHighlight,
    },
  ];

  return {
    id,
    charIndex,
    relX,
    relY,
    z,
    targetScale: 1.0,
    currentScale: 0.1, // starts small, blooms
    rotation,
    petalLayers,
    isBloomed: false,
    bloomSpeed: 1.0 / BOTANICAL_CONFIG.bloomDuration,
  };
}
