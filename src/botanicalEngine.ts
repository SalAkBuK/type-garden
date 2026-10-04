// Botanical Engine: Manages plant instances, keystroke growth, partial-word edit stability, and deletion retraction
import {
  BotanicalInstance,
  SplineNode,
  Thorn,
  RoseBloom,
  WordToken,
  CharMetric,
  TrailingRetraction,
} from './types';
import { BOTANICAL_CONFIG } from './config';
import { generateCharSplineNodes, hashString } from './glyphStrokes';

let nextInstanceId = 1;

/**
 * Creates a brand-new botanical instance for a word with a unique deterministic seed and persistent phase offset.
 */
export function createBotanicalInstance(wordText: string, seed?: number): BotanicalInstance {
  const instanceSeed = seed ?? ((hashString(wordText) ^ (nextInstanceId * 0x45d9f3b)) >>> 0);
  nextInstanceId++;

  return {
    id: `botanical-${instanceSeed}-${Date.now()}`,
    seed: instanceSeed,
    phaseOffset: ((instanceSeed % 1000) / 1000) * Math.PI * 2,
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
 * - Suffix deleted: trailing nodes smoothly retract without affecting preceding nodes.
 */
export function updateBotanicalInstanceForWord(
  instance: BotanicalInstance,
  newText: string,
  charMetrics: CharMetric[],
  fontSize: number,
  isMidWordTyping: boolean = true,
  lifecycleManager?: BotanicalLifecycleManager,
  wordX: number = 0,
  wordY: number = 0
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

  // Check if character metrics have genuinely shifted (e.g. true web font loaded over fallback font)
  if (commonPrefixLen > 0 && instance.lastCharWidths && instance.lastCharWidths.length >= commonPrefixLen) {
    for (let c = 0; c < commonPrefixLen; c++) {
      const metric = charMetrics[c];
      const prevW = instance.lastCharWidths[c];
      if (metric && prevW !== undefined && Math.abs(metric.width - prevW) > 1.5) {
        commonPrefixLen = 0;
        break;
      }
    }
  }

  // If text was shortened, start trailing retraction for discarded characters
  if (oldText.length > newText.length && lifecycleManager) {
    const deletedNodes = instance.charNodes.slice(newText.length).flat();
    const deletedThorns = instance.thorns.filter((th) => th.charIndex >= newText.length);
    const deletedRoses = instance.roses.filter((r) => r.charIndex >= newText.length);
    if (deletedNodes.length > 0) {
      lifecycleManager.startTrailingRetraction({
        id: `trailing-${instance.id}-${Date.now()}`,
        wordX,
        wordY,
        charIndexStart: newText.length,
        nodes: deletedNodes,
        thorns: deletedThorns,
        roses: deletedRoses,
        retractionProgress: 0.0,
        startTime: performance.now(),
        duration: 250,
        isDead: false,
        phaseOffset: instance.phaseOffset,
      });
    }
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
  instance.lastCharWidths = charMetrics.map((m) => m.width);

  // Re-flatten spline nodes in index order
  instance.flatNodes = newCharNodes.flat();

  // Update growth status
  instance.revealedCharCount = newText.length;
  if (isMidWordTyping) {
    // Current unfinished word: start live keystroke growth for newest stroke (tip emerges at 0.1)
    if (newText.length > commonPrefixLen) {
      instance.growthProgress = 0.1;
    }
  } else {
    // Word completed: full growth, trigger blooms
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
 * Retraction and lifecycle manager: manages retracting flora when words or characters are deleted,
 * live keystroke growth progression, and rose unfurling.
 * Unaffected words continue ambient breathing and reflow without interruption.
 */
export class BotanicalLifecycleManager {
  private retractingInstances: {
    instance: BotanicalInstance;
    wordToken: WordToken;
    startTime: number;
    duration: number; // ms
  }[] = [];

  private trailingRetractions: TrailingRetraction[] = [];

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
   * Initiates localized retraction for trailing characters removed via backspacing.
   */
  startTrailingRetraction(retraction: TrailingRetraction): void {
    this.trailingRetractions.push(retraction);
  }

  /**
   * Updates animated states:
   * - Retracting whole-word flora shrink and fade out
   * - Trailing backspaced characters smoothly retract
   * - Live keystroke growth advances towards 1.0
   * - Rose blooms unfurl smoothly based on dt
   */
  update(dtSec: number, currentTime: number, activeWords?: WordToken[]): void {
    // 1. Update whole-word retracting instances
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

    // 2. Update trailing backspaced character retractions
    for (let i = this.trailingRetractions.length - 1; i >= 0; i--) {
      const item = this.trailingRetractions[i];
      const elapsed = currentTime - item.startTime;
      const progress = Math.min(1.0, elapsed / item.duration);
      item.retractionProgress = progress;

      if (progress >= 1.0) {
        item.isDead = true;
        this.trailingRetractions.splice(i, 1);
      }
    }

    // 3. Update active words growth and blooming
    if (activeWords) {
      const growthRate = dtSec / BOTANICAL_CONFIG.growthSpeedPerChar;
      for (const word of activeWords) {
        const bot = word.botanicalInstance;
        if (!bot.isRetracting && bot.growthProgress < 1.0) {
          bot.growthProgress = Math.min(1.0, bot.growthProgress + growthRate);
        }

        // Bloom roses smoothly via physics simulation step
        for (const rose of bot.roses) {
          if (rose.isBloomed && rose.currentScale < rose.targetScale) {
            rose.currentScale = Math.min(
              rose.targetScale,
              rose.currentScale + rose.bloomSpeed * dtSec
            );
          }
        }
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

  /**
   * Returns list of trailing character retractions.
   */
  getTrailingRetractions(): TrailingRetraction[] {
    return this.trailingRetractions;
  }
}
