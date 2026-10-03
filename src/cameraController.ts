// Camera Controller: Dynamic reframing, spring damping, readability floor clamping, and auto-panning
import { CameraState, DocumentLayout } from './types';
import { BOTANICAL_CONFIG } from './config';

export class CameraController {
  public state: CameraState;

  constructor(viewportWidth: number, viewportHeight: number) {
    this.state = {
      zoom: BOTANICAL_CONFIG.cameraMaxZoom,
      targetZoom: BOTANICAL_CONFIG.cameraMaxZoom,
      panX: 0,
      panY: 0,
      targetPanY: 0,
      isAtReadabilityFloor: false,
      activeLineIndex: 0,
      viewportWidth,
      viewportHeight,
    };
  }

  setViewport(width: number, height: number): void {
    this.state.viewportWidth = width;
    this.state.viewportHeight = height;
  }

  updateTarget(layout: DocumentLayout): void {
    const { viewportWidth, viewportHeight } = this.state;
    const margin = BOTANICAL_CONFIG.viewportMarginRatio;

    // Active text bounds
    let maxLineWidth = 0;
    for (const line of layout.lines) {
      if (line.width > maxLineWidth) maxLineWidth = line.width;
    }
    // ensure at least 300px for stability
    const contentWidth = Math.max(320, maxLineWidth);
    const contentHeight = Math.max(BOTANICAL_CONFIG.baseFontSize * 2, layout.totalHeight);

    // Margins around text
    const paddedWidth = contentWidth * (1 + 2 * margin);
    const paddedHeight = contentHeight * (1 + 2 * margin);

    // Ideal zoom to fit text within viewport
    const scaleX = viewportWidth / paddedWidth;
    const scaleY = viewportHeight / paddedHeight;
    const idealZoom = Math.min(scaleX, scaleY);

    // Readability floor check: clamp zoom between cameraMinZoom (0.45x) and cameraMaxZoom (1.0x)
    const minZoom = BOTANICAL_CONFIG.cameraMinZoom;
    const maxZoom = BOTANICAL_CONFIG.cameraMaxZoom;

    if (idealZoom <= minZoom) {
      this.state.targetZoom = minZoom;
      this.state.isAtReadabilityFloor = true;
    } else {
      this.state.targetZoom = Math.min(maxZoom, Math.max(minZoom, idealZoom));
      this.state.isAtReadabilityFloor = false;
    }

    // Active line and auto-panning
    const activeLineY = layout.cursorPos.y;
    this.state.activeLineIndex = layout.cursorPos.lineIndex;

    // Center active writing line at approximately the vertical golden ratio (62% down viewport)
    // when text content at current target zoom exceeds viewport
    const totalRenderedHeight = contentHeight * this.state.targetZoom;

    if (totalRenderedHeight > viewportHeight * 0.75 || this.state.isAtReadabilityFloor) {
      // Auto-pan: active line sits at 62% down the screen
      const desiredScreenY = viewportHeight * 0.62;
      const targetPan = activeLineY - desiredScreenY / this.state.targetZoom;
      this.state.targetPanY = Math.max(0, targetPan);
    } else {
      this.state.targetPanY = 0;
    }

    // Horizontal centering
    const leftMargin = Math.max(40, (viewportWidth / this.state.targetZoom - BOTANICAL_CONFIG.lineWidth) / 2);
    this.state.panX = -leftMargin;
  }

  step(dt: number = 0.016): void {
    const factor = BOTANICAL_CONFIG.cameraDampingFactor;
    // Critically damped spring / exponential lerp
    this.state.zoom += (this.state.targetZoom - this.state.zoom) * factor;
    this.state.panY += (this.state.targetPanY - this.state.panY) * factor;
  }
}
