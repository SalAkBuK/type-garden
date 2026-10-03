// Configuration for Gothic Botanical Letter (V1)
// Tunable parameters as specified in build_brief.md Section 3

export interface BotanicalConfig {
  // Visual Palette
  colorBackground: string;
  colorText: string;
  colorStemBase: string;
  colorStemRim: string;
  colorThornBase: string;
  colorThornTip: string;
  colorRoseDeep: string;
  colorRoseMid: string;
  colorRoseHighlight: string;

  // Typography
  fontFamily: string;
  baseFontSize: number; // px at 1.0x scale
  letterSpacing: string;
  lineHeightMultiplier: number;

  // Botanical Growth Dynamics
  stemThickness: number; // px
  growthSpeedPerChar: number; // seconds per glyph stroke
  thornFrequency: number; // thorns per character / unit length
  maxRosesPerWord: number;
  bloomDuration: number; // seconds

  // Ambient Respiration
  idleRespirationPeriod: number; // seconds per full cycle
  idleSwayAmplitude: number; // px drift
  ambientPhaseJitter: number; // subtle offset across words

  // Camera & Framing
  cameraMaxZoom: number; // initial close-up
  cameraMinZoom: number; // readability floor
  cameraDampingFactor: number; // spring interpolation speed
  panLookaheadLines: number; // lines ahead kept in view during auto-pan
  viewportMarginRatio: number; // boundary margin before reframing triggers
  lineWidth: number; // maximum text wrapping line width in px at 1.0x
}

export const BOTANICAL_CONFIG: BotanicalConfig = {
  // Visual Palette
  colorBackground: '#050507',
  colorText: '#f5f5f7',
  colorStemBase: '#253526',
  colorStemRim: '#4f6950',
  colorThornBase: '#3d2f26',
  colorThornTip: '#6e5648',
  colorRoseDeep: '#7a0c1a',
  colorRoseMid: '#b81d33',
  colorRoseHighlight: '#d9364f',

  // Typography
  fontFamily: 'Cormorant Garamond, "Times New Roman", serif',
  baseFontSize: 32, // px at 1.0x scale
  letterSpacing: '0.04em',
  lineHeightMultiplier: 1.8,

  // Botanical Growth Dynamics
  stemThickness: 2.2, // px
  growthSpeedPerChar: 0.12, // seconds per glyph stroke
  thornFrequency: 0.35, // thorns per unit length
  maxRosesPerWord: 2,
  bloomDuration: 0.8, // seconds

  // Ambient Respiration
  idleRespirationPeriod: 5.0, // seconds per full cycle
  idleSwayAmplitude: 1.5, // px drift
  ambientPhaseJitter: 0.4, // subtle offset across words

  // Camera & Framing
  cameraMaxZoom: 1.0, // initial close-up
  cameraMinZoom: 0.45, // readability floor
  cameraDampingFactor: 0.08, // spring interpolation speed
  panLookaheadLines: 1.5, // lines ahead kept in view during auto-pan
  viewportMarginRatio: 0.15, // boundary margin before reframing triggers
  lineWidth: 650, // maximum width before wrapping
};
