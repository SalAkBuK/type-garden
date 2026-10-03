// Botanical Engine: Manages plant instances, keystroke growth, partial-word edit stability, and deletion retraction
import {
  BotanicalInstance,
  SplineNode,
  Thorn,
  RoseBloom,
  WordToken,
  CharMetric,
} from './types';
import { BOTANICAL_CONFIG } from './config';
import { generateCharSplineNodes, hashString } from './glyphStrokes';

let nextInstanceId = 1;

/**
 * Creates a brand-new botanical instance for a word with a unique deterministic seed.
 */
export function createBotanicalInstance(wordText: string, seed?: number): BotanicalInstance {
  const instanceSeed = seed ?? ((hashString(wordText) ^ (nextInstanceId * 0x45d9f3b)) >>> 0);
  nextInstanceId++;

  return {
    id: `botanical-${instanceSeed}-${Date.now()}`,
    seed: instanceSeed,
    wordText: '',
    charNodes: [],
    flatNodes: [],
    thorns: [],
    roses: [],
    growthProgress: 1.0,
    revealedCharCount: 0,
    isRetracting: false,
    retractionProgress: 0.0,
    isDead: false,
    createdAt: performance.now(),
    lastMutatedAt: performance.now(),
  };
}

/**
 * Updates a word's botanical instance when its characters change.
 * Satisfies the Law of Stable Plant Identity:
 * - Prefix unchanged: nodes, thorns, and roses for preceding characters retain exact coordinates and state.
 * - Suffix added: new nodes append smoothly with live keystroke growth.
 * - Suffix deleted: trailing nodes truncate/retract without affecting preceding nodes.
 */
export function updateBotanicalInstanceForWord(
  instance: BotanicalInstance,
  newText: string,
  charMetrics: CharMetric[],
  fontSize: number,
  isMidWordTyping: boolean = true
): void {
  const oldText = instance.wordText;
  instance.wordText = newText;
  instance.lastMutatedAt = performance.now();

  // Find longest common prefix
  let commonPrefixLen = 0;
  while (
    commonPrefixLen < oldText.length &&
    commonPrefixLen < newText.length &&
    oldText[commonPrefixLen] === newText[commonPrefixLen]
  ) {
    commonPrefixLen++;
  }

  // Preserve untouched prefix nodes, thorns, and roses
  const newCharNodes: SplineNode[][] = instance.charNodes.slice(0, commonPrefixLen);
  const preservedThorns: Thorn[] = instance.thorns.filter((th) => th.charIndex < commonPrefixLen);
  const preservedRoses: RoseBloom[] = instance.roses.filter((r) => r.charIndex < commonPrefixLen);

  // If text is empty, clear out
  if (newText.length === 0) {
    instance.charNodes = [];
    instance.flatNodes = [];
    instance.thorns = [];
    instance.roses = [];
    instance.revealedCharCount = 0;
    return;
  }

  // Generate nodes for new/modified characters starting from commonPrefixLen
  for (let i = commonPrefixLen; i < newText.length; i++) {
    const char = newText[i];
    const metric = charMetrics[i] || { x: i * fontSize * 0.5, y: 0, width: fontSize * 0.5 };
    const { nodes, thorns, rose } = generateCharSplineNodes(
      char,
      i,
      metric.x,
      metric.width,
      fontSize,
      instance.seed
    );

    newCharNodes.push(nodes);
    preservedThorns.push(...thorns);
    if (rose && preservedRoses.length < BOTANICAL_CONFIG.maxRosesPerWord) {
      preservedRoses.push(rose);
    }
  }

  instance.charNodes = newCharNodes;
  instance.thorns = preservedThorns;
  instance.roses = preservedRoses;

  // Re-flatten spline nodes in index order
  instance.flatNodes = newCharNodes.flat();

  // Update growth status
  if (isMidWordTyping) {
    // Current unfinished word: live growth advances to the newest character
    instance.revealedCharCount = newText.length;
    instance.growthProgress = 0.2; // begins live keystroke advance for latest glyph
  } else {
    // Word completed: full growth, trigger blooms
    instance.revealedCharCount = newText.length;
    instance.growthProgress = 1.0;
    for (const r of instance.roses) {
      r.isBloomed = true;
    }
  }
}

/**
 * Triggers blooming of all roses on this instance (e.g. when word completes or typing pauses).
 */
export function bloomWordRoses(instance: BotanicalInstance): void {
  for (const rose of instance.roses) {
    rose.isBloomed = true;
  }
}

/**
 * Retraction manager: manages retracting flora when words are deleted.
 * Unaffected words continue ambient breathing and reflow without interruption.
 */
export class BotanicalLifecycleManager {
  private retractingInstances: {
    instance: BotanicalInstance;
    wordToken: WordToken;
    startTime: number;
    duration: number; // ms
  }[] = [];

  /**
   * Initiates localized retraction for a deleted word token.
   */
  startRetraction(wordToken: WordToken, durationMs: number = 350): void {
    wordToken.botanicalInstance.isRetracting = true;
    wordToken.botanicalInstance.retractionProgress = 0.0;
    this.retractingInstances.push({
      instance: wordToken.botanicalInstance,
      wordToken,
      startTime: performance.now(),
      duration: durationMs,
    });
  }

  /**
   * Updates animated states:
   * - Retracting flora shrink and fade out
   * - Rose blooms unfurl smoothly
   * - Live keystroke growth advances
   */
  update(dt: number, currentTime: number): void {
    // 1. Update retracting instances
    for (let i = this.retractingInstances.length - 1; i >= 0; i--) {
      const item = this.retractingInstances[i];
      const elapsed = currentTime - item.startTime;
      const progress = Math.min(1.0, elapsed / item.duration);
      item.instance.retractionProgress = progress;

      if (progress >= 1.0) {
        item.instance.isDead = true;
        this.retractingInstances.splice(i, 1);
      }
    }
  }

  /**
   * Returns list of currently retracting word tokens so renderer can draw their dying vines.
   */
  getRetractingTokens(): { instance: BotanicalInstance; wordToken: WordToken }[] {
    return this.retractingInstances.map((item) => ({
      instance: item.instance,
      wordToken: item.wordToken,
    }));
  }
}
