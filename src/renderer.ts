// Canvas Renderer: Multi-pass z-depth rendering, botanical stems, thorns, gothic rose blooms, and camera transforms
import {
  DocumentLayout,
  WordToken,
  SplineNode,
  Thorn,
  RoseBloom,
  CameraState,
} from './types';
import { BOTANICAL_CONFIG } from './config';

export function computeAmbientSway(
  node: SplineNode,
  timeSec: number,
  wordIndex: number
): { x: number; y: number } {
  const period = BOTANICAL_CONFIG.idleRespirationPeriod;
  const phase =
    (timeSec / period) * 2 * Math.PI +
    wordIndex * BOTANICAL_CONFIG.ambientPhaseJitter +
    node.swayPhase;

  return {
    x: Math.sin(phase) * node.swayAmp,
    y: Math.cos(phase * 0.7) * (node.swayAmp * 0.4),
  };
}

export class BotanicalRenderer {
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  render(
    layout: DocumentLayout,
    camera: CameraState,
    retractingTokens: { instance: any; wordToken: WordToken }[],
    timeSec: number,
    debugMode: boolean = false
  ): void {
    const ctx = this.ctx;
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;

    // 1. Clear background
    ctx.save();
    ctx.fillStyle = BOTANICAL_CONFIG.colorBackground;
    ctx.fillRect(0, 0, width, height);

    // 2. Setup Camera Transform
    ctx.save();
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.panX, -camera.panY);

    const allWords = layout.words;

    // Pass 1: Stems BEHIND glyphs (z < 0)
    for (let w = 0; w < allWords.length; w++) {
      this.drawWordStem(allWords[w], w, timeSec, -1, 1.0);
    }
    for (let r = 0; r < retractingTokens.length; r++) {
      const item = retractingTokens[r];
      const alpha = 1.0 - item.instance.retractionProgress;
      this.drawWordStem(item.wordToken, r + 100, timeSec, -1, alpha, item.instance.retractionProgress);
    }

    // Pass 2: Glyph Text (Bone-white)
    ctx.fillStyle = BOTANICAL_CONFIG.colorText;
    ctx.font = `${BOTANICAL_CONFIG.baseFontSize}px ${BOTANICAL_CONFIG.fontFamily}`;
    ctx.textBaseline = 'alphabetic';

    for (const line of layout.lines) {
      for (const word of line.words) {
        let curX = word.x;
        for (const metric of word.charMetrics) {
          ctx.fillText(metric.char, curX, word.y);
          curX += metric.width;
        }
      }
    }

    // Pass 3: Stems IN FRONT of glyphs (z > 0)
    for (let w = 0; w < allWords.length; w++) {
      this.drawWordStem(allWords[w], w, timeSec, 1, 1.0);
    }
    for (let r = 0; r < retractingTokens.length; r++) {
      const item = retractingTokens[r];
      const alpha = 1.0 - item.instance.retractionProgress;
      this.drawWordStem(item.wordToken, r + 100, timeSec, 1, alpha, item.instance.retractionProgress);
    }

    // Pass 4: Thorns
    for (let w = 0; w < allWords.length; w++) {
      this.drawWordThorns(allWords[w], w, timeSec, 1.0);
    }
    for (let r = 0; r < retractingTokens.length; r++) {
      const item = retractingTokens[r];
      const alpha = 1.0 - item.instance.retractionProgress;
      this.drawWordThorns(item.wordToken, r + 100, timeSec, alpha);
    }

    // Pass 5: Gothic Rose Blooms
    for (let w = 0; w < allWords.length; w++) {
      this.drawWordRoses(allWords[w], w, timeSec, 1.0);
    }
    for (let r = 0; r < retractingTokens.length; r++) {
      const item = retractingTokens[r];
      const alpha = 1.0 - item.instance.retractionProgress;
      this.drawWordRoses(item.wordToken, r + 100, timeSec, alpha);
    }

    // Pass 6: Typing Cursor
    this.drawCursor(layout.cursorPos, timeSec);

    // Optional debug overlays (stroke bones, anchors, z-depth indicators)
    if (debugMode) {
      this.drawDebugOverlay(layout, camera);
    }

    ctx.restore(); // Camera transform
    ctx.restore(); // Background save
  }

  private drawWordStem(
    word: WordToken,
    wordIndex: number,
    timeSec: number,
    targetZ: number,
    alpha: number,
    retractionFactor: number = 0.0
  ): void {
    const ctx = this.ctx;
    const bot = word.botanicalInstance;
    const flatNodes = bot.flatNodes;
    if (flatNodes.length < 2) return;

    // Apply live keystroke growth limit or retraction limit
    const totalNodes = flatNodes.length;
    let visibleCount = totalNodes;

    if (retractionFactor > 0) {
      visibleCount = Math.max(1, Math.floor(totalNodes * (1.0 - retractionFactor)));
    } else if (bot.growthProgress < 1.0 && bot.revealedCharCount > 0) {
      // Partial last glyph growth
      const fullGlyphNodes = Math.max(0, (bot.revealedCharCount - 1) * 3);
      visibleCount = Math.min(totalNodes, fullGlyphNodes + Math.ceil(bot.growthProgress * 4));
    }

    if (visibleCount < 2) return;

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

    // Outer stem rim stroke
    ctx.strokeStyle = BOTANICAL_CONFIG.colorStemRim;
    ctx.lineWidth = BOTANICAL_CONFIG.stemThickness + 1.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    this.renderSplinePass(word, wordIndex, flatNodes, visibleCount, timeSec, targetZ, true);

    // Core stem stroke
    ctx.strokeStyle = BOTANICAL_CONFIG.colorStemBase;
    ctx.lineWidth = BOTANICAL_CONFIG.stemThickness;
    this.renderSplinePass(word, wordIndex, flatNodes, visibleCount, timeSec, targetZ, false);

    ctx.restore();
  }

  private renderSplinePass(
    word: WordToken,
    wordIndex: number,
    nodes: SplineNode[],
    count: number,
    timeSec: number,
    targetZ: number,
    isRim: boolean
  ): void {
    const ctx = this.ctx;

    for (let i = 0; i < count - 1; i++) {
      const n0 = nodes[i];
      const n1 = nodes[i + 1];

      // Check z-filter:
      // If targetZ == -1, draw segments where either n0 or n1 is <= 0
      // If targetZ == 1, draw segments where both or either n0/n1 > 0
      const isBehind = n0.z < 0 && n1.z < 0;
      const isInFront = n0.z > 0 && n1.z > 0;
      const isTransition = (n0.z < 0 && n1.z > 0) || (n0.z > 0 && n1.z < 0);

      const sway0 = computeAmbientSway(n0, timeSec, wordIndex);
      const sway1 = computeAmbientSway(n1, timeSec, wordIndex);

      const p0 = { x: word.x + n0.relX + sway0.x, y: word.y + n0.relY + sway0.y };
      const p1 = { x: word.x + n1.relX + sway1.x, y: word.y + n1.relY + sway1.y };

      if (targetZ < 0) {
        if (isBehind) {
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.stroke();
        } else if (isTransition) {
          // Half of transition segment is behind
          const midX = (p0.x + p1.x) * 0.5;
          const midY = (p0.y + p1.y) * 0.5;
          ctx.beginPath();
          if (n0.z < 0) {
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(midX, midY);
          } else {
            ctx.moveTo(midX, midY);
            ctx.lineTo(p1.x, p1.y);
          }
          ctx.stroke();
        }
      } else {
        if (isInFront) {
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.stroke();
        } else if (isTransition) {
          // Half of transition segment is in front
          const midX = (p0.x + p1.x) * 0.5;
          const midY = (p0.y + p1.y) * 0.5;
          ctx.beginPath();
          if (n0.z > 0) {
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(midX, midY);
          } else {
            ctx.moveTo(midX, midY);
            ctx.lineTo(p1.x, p1.y);
          }
          ctx.stroke();
        }
      }
    }
  }

  private drawWordThorns(
    word: WordToken,
    wordIndex: number,
    timeSec: number,
    alpha: number
  ): void {
    const ctx = this.ctx;
    const bot = word.botanicalInstance;
    if (bot.thorns.length === 0) return;

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

    for (const thorn of bot.thorns) {
      if (thorn.charIndex >= bot.revealedCharCount) continue;

      // Ambient breathing sway
      const sway = computeAmbientSway(
        { id: '', charIndex: thorn.charIndex, relX: thorn.relX, relY: thorn.relY, z: 1, isAnchor: false, swayPhase: thorn.charIndex * 0.7, swayAmp: BOTANICAL_CONFIG.idleSwayAmplitude },
        timeSec,
        wordIndex
      );

      const rootX = word.x + thorn.relX + sway.x;
      const rootY = word.y + thorn.relY + sway.y;

      const len = thorn.length * thorn.maturity;
      const tipX = rootX + Math.cos(thorn.angle) * len;
      const tipY = rootY + Math.sin(thorn.angle) * len;

      const perpAngle = thorn.angle + Math.PI / 2;
      const baseHalfWidth = 1.8;
      const b1x = rootX + Math.cos(perpAngle) * baseHalfWidth;
      const b1y = rootY + Math.sin(perpAngle) * baseHalfWidth;
      const b2x = rootX - Math.cos(perpAngle) * baseHalfWidth;
      const b2y = rootY - Math.sin(perpAngle) * baseHalfWidth;

      // Draw thorn triangle with shaded base to tip
      ctx.beginPath();
      ctx.moveTo(b1x, b1y);
      ctx.lineTo(tipX, tipY);
      ctx.lineTo(b2x, b2y);
      ctx.closePath();

      ctx.fillStyle = BOTANICAL_CONFIG.colorThornBase;
      ctx.fill();

      // Sharp tip highlight
      ctx.strokeStyle = BOTANICAL_CONFIG.colorThornTip;
      ctx.lineWidth = 1.0;
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawWordRoses(
    word: WordToken,
    wordIndex: number,
    timeSec: number,
    alpha: number
  ): void {
    const ctx = this.ctx;
    const bot = word.botanicalInstance;
    if (bot.roses.length === 0) return;

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

    for (const rose of bot.roses) {
      if (rose.charIndex >= bot.revealedCharCount) continue;

      // Update bloom scale smoothly
      if (rose.isBloomed && rose.currentScale < rose.targetScale) {
        rose.currentScale = Math.min(rose.targetScale, rose.currentScale + rose.bloomSpeed * 0.02);
      }

      if (rose.currentScale <= 0.05) continue;

      const sway = computeAmbientSway(
        { id: '', charIndex: rose.charIndex, relX: rose.relX, relY: rose.relY, z: 1, isAnchor: true, swayPhase: rose.charIndex * 0.9, swayAmp: BOTANICAL_CONFIG.idleSwayAmplitude * 1.2 },
        timeSec,
        wordIndex
      );

      const cx = word.x + rose.relX + sway.x;
      const cy = word.y + rose.relY + sway.y;
      const scale = rose.currentScale;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rose.rotation);

      // 1. Dark green sepal/calyx behind bloom
      ctx.fillStyle = '#1c281d';
      for (let s = 0; s < 5; s++) {
        const sa = (s * 2 * Math.PI) / 5;
        const slen = 10 * scale;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(sa - 0.2) * (slen * 0.4), Math.sin(sa - 0.2) * (slen * 0.4));
        ctx.lineTo(Math.cos(sa) * slen, Math.sin(sa) * slen);
        ctx.lineTo(Math.cos(sa + 0.2) * (slen * 0.4), Math.sin(sa + 0.2) * (slen * 0.4));
        ctx.closePath();
        ctx.fill();
      }

      // 2. Multi-petal layers
      for (const layer of rose.petalLayers) {
        ctx.fillStyle = layer.color;
        const r = layer.radius * scale;
        const count = layer.count;

        for (let p = 0; p < count; p++) {
          const angle = layer.rotation + (p * 2 * Math.PI) / count;
          const px = Math.cos(angle) * (r * 0.55);
          const py = Math.sin(angle) * (r * 0.55);

          ctx.beginPath();
          ctx.arc(px, py, r * 0.55, 0, Math.PI * 2);
          ctx.fill();

          // Subtle velvet petal edge
          ctx.strokeStyle = 'rgba(20, 2, 5, 0.45)';
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }

      // 3. Central bud spiral/shadow core
      ctx.fillStyle = '#42060e';
      ctx.beginPath();
      ctx.arc(0, 0, 3.2 * scale, 0, Math.PI * 2);
      ctx.fill();

      // Highlight curl
      ctx.strokeStyle = BOTANICAL_CONFIG.colorRoseHighlight;
      ctx.lineWidth = 1.2 * scale;
      ctx.beginPath();
      ctx.arc(0, 0, 1.8 * scale, 0.2, Math.PI * 1.5);
      ctx.stroke();

      ctx.restore();
    }

    ctx.restore();
  }

  private drawCursor(cursorPos: { x: number; y: number }, timeSec: number): void {
    const ctx = this.ctx;
    // Pulsing bone-white cursor
    const pulse = 0.5 + 0.5 * Math.sin(timeSec * 4.5);
    ctx.save();
    ctx.strokeStyle = `rgba(245, 245, 247, ${pulse})`;
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    const h = BOTANICAL_CONFIG.baseFontSize;
    ctx.moveTo(cursorPos.x + 1, cursorPos.y - h * 0.85);
    ctx.lineTo(cursorPos.x + 1, cursorPos.y + h * 0.15);
    ctx.stroke();
    ctx.restore();
  }

  private drawDebugOverlay(layout: DocumentLayout, camera: CameraState): void {
    const ctx = this.ctx;
    ctx.save();

    // Draw stroke anchors and z-depth indicator
    for (const word of layout.words) {
      for (const node of word.botanicalInstance.flatNodes) {
        ctx.fillStyle = node.z > 0 ? '#44ff88' : '#ff4444';
        ctx.beginPath();
        ctx.arc(word.x + node.relX, word.y + node.relY, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }
}
