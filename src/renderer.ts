// Canvas Renderer: Multi-pass z-depth rendering, smooth Catmull-Rom botanical stems, recurved thorns, gothic roses, and camera transforms
import {
  DocumentLayout,
  WordToken,
  SplineNode,
  Thorn,
  RoseBloom,
  CameraState,
  TrailingRetraction,
} from './types';
import { BOTANICAL_CONFIG } from './config';

export function computeAmbientSway(
  node: SplineNode,
  timeSec: number,
  phaseOffset: number
): { x: number; y: number } {
  const period = BOTANICAL_CONFIG.idleRespirationPeriod;
  const phase = (timeSec / period) * 2 * Math.PI + phaseOffset + node.swayPhase;

  return {
    x: Math.sin(phase) * node.swayAmp,
    y: Math.cos(phase * 0.7) * (node.swayAmp * 0.4),
  };
}

interface SplinePoint {
  x: number;
  y: number;
  z: number;
}

/**
 * Catmull-Rom spline interpolation point evaluator
 */
function catmullRomPoint(
  p0: SplinePoint,
  p1: SplinePoint,
  p2: SplinePoint,
  p3: SplinePoint,
  t: number
): SplinePoint {
  const t2 = t * t;
  const t3 = t2 * t;

  const f0 = -0.5 * t3 + t2 - 0.5 * t;
  const f1 = 1.5 * t3 - 2.5 * t2 + 1.0;
  const f2 = -1.5 * t3 + 2.0 * t2 + 0.5 * t;
  const f3 = 0.5 * t3 - 0.5 * t2;

  return {
    x: p0.x * f0 + p1.x * f1 + p2.x * f2 + p3.x * f3,
    y: p0.y * f0 + p1.y * f1 + p2.y * f2 + p3.y * f3,
    z: p1.z + (p2.z - p1.z) * t,
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
    trailingRetractions: TrailingRetraction[] = [],
    timeSec: number,
    debugMode: boolean = false
  ): void {
    const ctx = this.ctx;
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;

    // 1. Clear background to dark void
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
      this.drawWordStem(allWords[w], timeSec, -1, 1.0);
    }
    for (let r = 0; r < retractingTokens.length; r++) {
      const item = retractingTokens[r];
      const alpha = 1.0 - item.instance.retractionProgress;
      this.drawWordStem(item.wordToken, timeSec, -1, alpha, item.instance.retractionProgress);
    }
    for (const tr of trailingRetractions) {
      const alpha = 1.0 - tr.retractionProgress;
      this.drawTrailingStem(tr, timeSec, -1, alpha);
    }

    // Pass 2: Glyph Text (Bone-white)
    ctx.fillStyle = BOTANICAL_CONFIG.colorText;
    ctx.font = `${BOTANICAL_CONFIG.baseFontSize}px ${BOTANICAL_CONFIG.fontFamily}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    if ('letterSpacing' in ctx) {
      try {
        (ctx as any).letterSpacing = '0px';
      } catch {
        // ignore
      }
    }

    for (const line of layout.lines) {
      for (const word of line.words) {
        for (const metric of word.charMetrics) {
          ctx.fillText(metric.char, word.x + metric.x, word.y);
        }
      }
    }

    // Pass 3: Stems IN FRONT of glyphs (z > 0)
    for (let w = 0; w < allWords.length; w++) {
      this.drawWordStem(allWords[w], timeSec, 1, 1.0);
    }
    for (let r = 0; r < retractingTokens.length; r++) {
      const item = retractingTokens[r];
      const alpha = 1.0 - item.instance.retractionProgress;
      this.drawWordStem(item.wordToken, timeSec, 1, alpha, item.instance.retractionProgress);
    }
    for (const tr of trailingRetractions) {
      const alpha = 1.0 - tr.retractionProgress;
      this.drawTrailingStem(tr, timeSec, 1, alpha);
    }

    // Pass 4: Thorns
    for (let w = 0; w < allWords.length; w++) {
      this.drawWordThorns(allWords[w], timeSec, 1.0);
    }
    for (let r = 0; r < retractingTokens.length; r++) {
      const item = retractingTokens[r];
      const alpha = 1.0 - item.instance.retractionProgress;
      this.drawWordThorns(item.wordToken, timeSec, alpha, item.instance.retractionProgress);
    }
    for (const tr of trailingRetractions) {
      const alpha = 1.0 - tr.retractionProgress;
      this.drawTrailingThorns(tr, timeSec, alpha);
    }

    // Pass 5: Gothic Rose Blooms
    for (let w = 0; w < allWords.length; w++) {
      this.drawWordRoses(allWords[w], timeSec, 1.0);
    }
    for (let r = 0; r < retractingTokens.length; r++) {
      const item = retractingTokens[r];
      const alpha = 1.0 - item.instance.retractionProgress;
      this.drawWordRoses(item.wordToken, timeSec, alpha, item.instance.retractionProgress);
    }
    for (const tr of trailingRetractions) {
      const alpha = 1.0 - tr.retractionProgress;
      this.drawTrailingRoses(tr, timeSec, alpha);
    }

    // Pass 6: Typing Cursor
    this.drawCursor(layout.cursorPos, timeSec);

    // Optional debug wireframe overlay (anchor points & z-depth)
    if (debugMode) {
      this.drawDebugOverlay(layout);
    }

    ctx.restore(); // Camera transform
    ctx.restore(); // Background save
  }

  private calculateVisibleNodeRange(
    bot: any,
    retractionFactor: number = 0.0
  ): { visibleCount: number; tipProgress: number } {
    const flatNodes: SplineNode[] = bot.flatNodes;
    const totalNodes = flatNodes.length;
    if (totalNodes < 2) return { visibleCount: totalNodes, tipProgress: 1.0 };

    if (retractionFactor > 0) {
      const count = Math.max(1, Math.floor(totalNodes * (1.0 - retractionFactor)));
      return { visibleCount: count, tipProgress: 1.0 };
    }

    if (bot.growthProgress >= 1.0 || bot.revealedCharCount === 0) {
      return { visibleCount: totalNodes, tipProgress: 1.0 };
    }

    // Compute exact nodes for completed characters
    const completedChars = Math.max(0, bot.revealedCharCount - 1);
    let completedNodesCount = 0;
    for (let c = 0; c < completedChars && c < bot.charNodes.length; c++) {
      completedNodesCount += bot.charNodes[c].length;
    }

    const activeCharIndex = bot.revealedCharCount - 1;
    const activeNodes = bot.charNodes[activeCharIndex] || [];
    const activeLen = activeNodes.length;

    const visibleInActive = Math.max(1, Math.min(activeLen, Math.ceil(bot.growthProgress * activeLen)));
    const totalVisible = Math.min(totalNodes, completedNodesCount + visibleInActive);

    return { visibleCount: totalVisible, tipProgress: bot.growthProgress };
  }

  private drawWordStem(
    word: WordToken,
    timeSec: number,
    targetZ: number,
    alpha: number,
    retractionFactor: number = 0.0
  ): void {
    const ctx = this.ctx;
    const bot = word.botanicalInstance;
    const flatNodes = bot.flatNodes;
    if (flatNodes.length < 2) return;

    const { visibleCount } = this.calculateVisibleNodeRange(bot, retractionFactor);
    if (visibleCount < 2) return;

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

    // Outer stem rim stroke
    ctx.strokeStyle = BOTANICAL_CONFIG.colorStemRim;
    ctx.lineWidth = BOTANICAL_CONFIG.stemThickness + 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    this.renderCatmullRomPass(word.x, word.y, bot.phaseOffset, flatNodes, visibleCount, timeSec, targetZ);

    // Inner stem core stroke
    ctx.strokeStyle = BOTANICAL_CONFIG.colorStemBase;
    ctx.lineWidth = BOTANICAL_CONFIG.stemThickness;
    this.renderCatmullRomPass(word.x, word.y, bot.phaseOffset, flatNodes, visibleCount, timeSec, targetZ);

    ctx.restore();
  }

  private drawTrailingStem(
    tr: TrailingRetraction,
    timeSec: number,
    targetZ: number,
    alpha: number
  ): void {
    const ctx = this.ctx;
    const nodes = tr.nodes;
    if (nodes.length < 2) return;

    const visibleCount = Math.max(1, Math.floor(nodes.length * (1.0 - tr.retractionProgress)));
    if (visibleCount < 2) return;

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

    ctx.strokeStyle = BOTANICAL_CONFIG.colorStemRim;
    ctx.lineWidth = BOTANICAL_CONFIG.stemThickness + 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    this.renderCatmullRomPass(tr.wordX, tr.wordY, tr.phaseOffset, nodes, visibleCount, timeSec, targetZ);

    ctx.strokeStyle = BOTANICAL_CONFIG.colorStemBase;
    ctx.lineWidth = BOTANICAL_CONFIG.stemThickness;
    this.renderCatmullRomPass(tr.wordX, tr.wordY, tr.phaseOffset, nodes, visibleCount, timeSec, targetZ);

    ctx.restore();
  }

  private renderCatmullRomPass(
    wordX: number,
    wordY: number,
    phaseOffset: number,
    nodes: SplineNode[],
    count: number,
    timeSec: number,
    targetZ: number
  ): void {
    const ctx = this.ctx;
    if (count < 2) return;

    // Convert nodes to swayed positions
    const points: SplinePoint[] = [];
    for (let i = 0; i < count; i++) {
      const n = nodes[i];
      const sway = computeAmbientSway(n, timeSec, phaseOffset);
      points.push({
        x: wordX + n.relX + sway.x,
        y: wordY + n.relY + sway.y,
        z: n.z,
      });
    }

    const segmentsPerSpan = 6;

    for (let i = 0; i < count - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(count - 1, i + 2)];

      let prevSub = p1;

      for (let s = 1; s <= segmentsPerSpan; s++) {
        const t = s / segmentsPerSpan;
        const sub = catmullRomPoint(p0, p1, p2, p3, t);
        const avgZ = (prevSub.z + sub.z) * 0.5;

        const matchesZ = targetZ < 0 ? avgZ <= 0.05 : avgZ >= -0.05;

        if (matchesZ) {
          ctx.beginPath();
          ctx.moveTo(prevSub.x, prevSub.y);
          ctx.lineTo(sub.x, sub.y);
          ctx.stroke();
        }

        prevSub = sub;
      }
    }
  }

  private drawWordThorns(
    word: WordToken,
    timeSec: number,
    alpha: number,
    retractionFactor: number = 0.0
  ): void {
    const ctx = this.ctx;
    const bot = word.botanicalInstance;
    if (bot.thorns.length === 0) return;

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

    const totalNodes = bot.flatNodes.length;
    const { visibleCount } = this.calculateVisibleNodeRange(bot, retractionFactor);
    const growthFraction = totalNodes > 0 ? visibleCount / totalNodes : 1.0;

    for (const thorn of bot.thorns) {
      if (thorn.charIndex >= bot.revealedCharCount) continue;
      // Shrink with retraction or active growth
      const maturity = thorn.maturity * (1.0 - retractionFactor);
      if (maturity <= 0.05) continue;

      this.renderSingleThorn(word.x, word.y, thorn, bot.phaseOffset, timeSec, maturity);
    }

    ctx.restore();
  }

  private drawTrailingThorns(
    tr: TrailingRetraction,
    timeSec: number,
    alpha: number
  ): void {
    const ctx = this.ctx;
    if (tr.thorns.length === 0) return;

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

    for (const thorn of tr.thorns) {
      const maturity = thorn.maturity * (1.0 - tr.retractionProgress);
      if (maturity <= 0.05) continue;
      this.renderSingleThorn(tr.wordX, tr.wordY, thorn, tr.phaseOffset, timeSec, maturity);
    }

    ctx.restore();
  }

  private renderSingleThorn(
    wordX: number,
    wordY: number,
    thorn: Thorn,
    phaseOffset: number,
    timeSec: number,
    maturity: number
  ): void {
    const ctx = this.ctx;
    const sway = computeAmbientSway(
      { id: '', charIndex: thorn.charIndex, relX: thorn.relX, relY: thorn.relY, z: 1, isAnchor: false, swayPhase: thorn.charIndex * 0.7, swayAmp: BOTANICAL_CONFIG.idleSwayAmplitude },
      timeSec,
      phaseOffset
    );

    const rootX = wordX + thorn.relX + sway.x;
    const rootY = wordY + thorn.relY + sway.y;

    const len = thorn.length * maturity;
    const tipX = rootX + Math.cos(thorn.angle) * len;
    const tipY = rootY + Math.sin(thorn.angle) * len;

    const perpAngle = thorn.angle + Math.PI / 2;
    const baseHalfWidth = Math.max(2.5, thorn.length * 0.38) * maturity;
    const b1x = rootX + Math.cos(perpAngle) * baseHalfWidth;
    const b1y = rootY + Math.sin(perpAngle) * baseHalfWidth;
    const b2x = rootX - Math.cos(perpAngle) * baseHalfWidth;
    const b2y = rootY - Math.sin(perpAngle) * baseHalfWidth;

    // Recurved curved spine
    const archFactor = thorn.side * Math.max(2.0, thorn.length * 0.32) * maturity;
    const cpX = (rootX + tipX) * 0.5 + Math.cos(perpAngle) * archFactor;
    const cpY = (rootY + tipY) * 0.5 + Math.sin(perpAngle) * archFactor;

    ctx.beginPath();
    ctx.moveTo(b1x, b1y);
    ctx.quadraticCurveTo(cpX, cpY, tipX, tipY);
    ctx.lineTo(b2x, b2y);
    ctx.closePath();

    ctx.fillStyle = BOTANICAL_CONFIG.colorThornBase;
    ctx.fill();

    // Sharp ivory/amber tip highlight
    ctx.strokeStyle = BOTANICAL_CONFIG.colorThornTip;
    ctx.lineWidth = Math.max(1.2, thorn.length * 0.1);
    ctx.beginPath();
    ctx.moveTo(b1x, b1y);
    ctx.quadraticCurveTo(cpX, cpY, tipX, tipY);
    ctx.stroke();
  }

  private drawWordRoses(
    word: WordToken,
    timeSec: number,
    alpha: number,
    retractionFactor: number = 0.0
  ): void {
    const ctx = this.ctx;
    const bot = word.botanicalInstance;
    if (bot.roses.length === 0) return;

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

    for (const rose of bot.roses) {
      if (rose.charIndex >= bot.revealedCharCount) continue;
      const effectiveScale = rose.currentScale * (1.0 - retractionFactor);
      if (effectiveScale <= 0.05) continue;

      this.renderSingleRose(word.x, word.y, rose, bot.phaseOffset, timeSec, effectiveScale);
    }

    ctx.restore();
  }

  private drawTrailingRoses(
    tr: TrailingRetraction,
    timeSec: number,
    alpha: number
  ): void {
    const ctx = this.ctx;
    if (tr.roses.length === 0) return;

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

    for (const rose of tr.roses) {
      const effectiveScale = rose.currentScale * (1.0 - tr.retractionProgress);
      if (effectiveScale <= 0.05) continue;
      this.renderSingleRose(tr.wordX, tr.wordY, rose, tr.phaseOffset, timeSec, effectiveScale);
    }

    ctx.restore();
  }

  private renderSingleRose(
    wordX: number,
    wordY: number,
    rose: RoseBloom,
    phaseOffset: number,
    timeSec: number,
    scale: number
  ): void {
    const ctx = this.ctx;

    const sway = computeAmbientSway(
      { id: '', charIndex: rose.charIndex, relX: rose.relX, relY: rose.relY, z: 1, isAnchor: true, swayPhase: rose.charIndex * 0.9, swayAmp: BOTANICAL_CONFIG.idleSwayAmplitude * 1.2 },
      timeSec,
      phaseOffset
    );

    const cx = wordX + rose.relX + sway.x;
    const cy = wordY + rose.relY + sway.y;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rose.rotation);

    const outerRadius = (rose.petalLayers[0]?.radius ?? 14) * scale;

    // 1. Dark mossy green sepals/calyx behind bloom
    ctx.fillStyle = '#182419';
    for (let s = 0; s < 5; s++) {
      const sa = (s * 2 * Math.PI) / 5;
      const slen = outerRadius * 1.35;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(sa - 0.22) * (slen * 0.38), Math.sin(sa - 0.22) * (slen * 0.38));
      ctx.lineTo(Math.cos(sa) * slen, Math.sin(sa) * slen);
      ctx.lineTo(Math.cos(sa + 0.22) * (slen * 0.38), Math.sin(sa + 0.22) * (slen * 0.38));
      ctx.closePath();
      ctx.fill();
    }

    // 2. Layered velvety crimson petals with natural curvature
    for (const layer of rose.petalLayers) {
      ctx.fillStyle = layer.color;
      const r = layer.radius * scale;
      const count = layer.count;

      for (let p = 0; p < count; p++) {
        const angle = layer.rotation + (p * 2 * Math.PI) / count;
        const px = Math.cos(angle) * (r * 0.58);
        const py = Math.sin(angle) * (r * 0.58);
        const petalW = r * 0.55;

        ctx.beginPath();
        ctx.arc(px, py, petalW, 0, Math.PI * 2);
        ctx.fill();

        // Velvet petal edge contour
        ctx.strokeStyle = 'rgba(25, 2, 7, 0.45)';
        ctx.lineWidth = Math.max(1.0, r * 0.05);
        ctx.stroke();
      }
    }

    // 3. Central bud spiral/shadow core
    ctx.fillStyle = '#3a050c';
    ctx.beginPath();
    ctx.arc(0, 0, outerRadius * 0.32, 0, Math.PI * 2);
    ctx.fill();

    // Vibrant petal fold highlight
    ctx.strokeStyle = BOTANICAL_CONFIG.colorRoseHighlight;
    ctx.lineWidth = Math.max(1.6, outerRadius * 0.12);
    ctx.beginPath();
    ctx.arc(0, 0, outerRadius * 0.18, 0.2, Math.PI * 1.5);
    ctx.stroke();

    ctx.restore();
  }

  private drawCursor(cursorPos: { x: number; y: number }, timeSec: number): void {
    const ctx = this.ctx;
    const pulse = 0.5 + 0.5 * Math.sin(timeSec * 4.5);
    ctx.save();
    ctx.strokeStyle = `rgba(245, 245, 247, ${pulse})`;
    ctx.lineWidth = Math.max(2.5, BOTANICAL_CONFIG.baseFontSize * 0.045);
    ctx.beginPath();
    const h = BOTANICAL_CONFIG.baseFontSize;
    ctx.moveTo(cursorPos.x + 1, cursorPos.y - h * 0.85);
    ctx.lineTo(cursorPos.x + 1, cursorPos.y + h * 0.15);
    ctx.stroke();
    ctx.restore();
  }

  private drawDebugOverlay(layout: DocumentLayout): void {
    const ctx = this.ctx;
    ctx.save();

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
