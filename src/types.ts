// Type definitions for Gothic Botanical Letter

export type StrokeType = 'vertical' | 'horizontal' | 'curve' | 'loop' | 'diagonal';

export interface GlyphStroke {
  type: StrokeType;
  label: string; // e.g., 'stem', 'crossbar', 'bowl', 'ascender', 'descender'
  x0: number; // normalized [0..1] relative to character width
  y0: number; // normalized [0..1] relative to font cap height / ascender
  x1: number;
  y1: number;
  cx?: number; // optional bezier control point for curves
  cy?: number;
}

export interface SplineNode {
  id: string;
  charIndex: number;
  relX: number; // relative to word origin
  relY: number;
  z: number; // -1 = behind glyph stroke, +1 = in front of glyph stroke
  isAnchor: boolean;
  anchorType?: string; // 'vertical-front', 'vertical-back', 'crossbar', 'bowl-in', 'bowl-out'
  swayPhase: number;
  swayAmp: number;
}

export interface Thorn {
  id: string;
  charIndex: number;
  relX: number;
  relY: number;
  length: number;
  angle: number; // outward direction
  side: -1 | 1;
  maturity: number; // 0 to 1 (bud to sharp thorn)
}

export interface PetalLayer {
  count: number;
  radius: number;
  rotation: number;
  color: string;
}

export interface RoseBloom {
  id: string;
  charIndex: number;
  relX: number;
  relY: number;
  z: number; // 1 = in front, -1 = behind
  targetScale: number;
  currentScale: number; // 0 to targetScale
  rotation: number;
  petalLayers: PetalLayer[];
  isBloomed: boolean;
  bloomSpeed: number;
}

export interface BotanicalInstance {
  id: string;
  seed: number;
  wordText: string;
  charNodes: SplineNode[][]; // index 0..text.length-1
  flatNodes: SplineNode[];
  thorns: Thorn[];
  roses: RoseBloom[];
  growthProgress: number; // 0 to 1 within newest stroke
  revealedCharCount: number; // how many characters have fully grown vine
  isRetracting: boolean;
  retractionProgress: number; // 0 to 1
  isDead: boolean;
  createdAt: number;
  lastMutatedAt: number;
}

export interface CharMetric {
  char: string;
  x: number; // relative to line start
  y: number; // baseline
  width: number;
}

export interface WordToken {
  id: string;
  text: string;
  startIndex: number; // index in full text string
  endIndex: number;
  lineIndex: number;
  x: number; // position on canvas (in document space)
  y: number; // baseline position
  width: number;
  height: number;
  charMetrics: CharMetric[];
  botanicalInstance: BotanicalInstance;
}

export interface DocumentLayout {
  lines: {
    lineIndex: number;
    words: WordToken[];
    y: number; // baseline
    height: number;
    width: number;
  }[];
  words: WordToken[];
  totalHeight: number;
  activeWordId?: string;
  cursorPos: {
    lineIndex: number;
    charIndexInDoc: number;
    x: number;
    y: number;
  };
}

export interface CameraState {
  zoom: number;
  targetZoom: number;
  panX: number;
  panY: number;
  targetPanY: number;
  isAtReadabilityFloor: boolean;
  activeLineIndex: number;
  viewportWidth: number;
  viewportHeight: number;
}
