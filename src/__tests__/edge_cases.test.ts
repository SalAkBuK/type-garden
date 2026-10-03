// Edge Cases and Robustness Test Suite
import { describe, it, expect } from 'vitest';
import { DocumentModel } from '../layoutEngine';
import { CameraController } from '../cameraController';
import { BOTANICAL_CONFIG } from '../config';

describe('Edge Cases & Robustness', () => {
  it('handles completely empty document gracefully', () => {
    const doc = new DocumentModel();
    const layout = doc.setText('', 0);
    expect(layout.words.length).toBe(0);
    expect(layout.lines.length).toBe(1);
    expect(layout.cursorPos.x).toBe(0);
    expect(layout.cursorPos.y).toBe(BOTANICAL_CONFIG.baseFontSize * BOTANICAL_CONFIG.lineHeightMultiplier);

    const camera = new CameraController(800, 600);
    camera.updateTarget(layout);
    expect(camera.state.zoom).toBe(1.0);
    expect(camera.state.panY).toBe(0);
    camera.step(0.016);
    expect(Number.isFinite(camera.state.zoom)).toBe(true);
    expect(Number.isFinite(camera.state.panY)).toBe(true);
  });

  it('handles whitespace-only text gracefully', () => {
    const doc = new DocumentModel();
    const layout = doc.setText('     \n\t   ', 3);
    expect(layout.words.length).toBe(0);
  });

  it('handles words with heavy punctuation and symbols', () => {
    const doc = new DocumentModel();
    const layout = doc.setText('“Gothic, dark-rose; bloom!... — yes?”', 35);
    expect(layout.words.length).toBeGreaterThan(0);
    for (const word of layout.words) {
      expect(word.botanicalInstance.charNodes.length).toBe(word.text.length);
      expect(word.botanicalInstance.flatNodes.length).toBeGreaterThan(0);
    }
  });

  it('handles rapid backspace-to-empty then retyping without memory leaks or crash', () => {
    const doc = new DocumentModel();
    doc.setText('Crimson night blossoms', 22);
    expect(doc.getWords().length).toBe(3);

    // Backspace completely to empty
    doc.setText('', 0);
    expect(doc.getWords().length).toBe(0);
    // 3 words should now be in retraction
    const retracting = doc.lifecycleManager.getRetractingTokens();
    expect(retracting.length).toBe(3);

    // Retype new words
    doc.setText('Pale moon rises', 15);
    expect(doc.getWords().length).toBe(3);

    // Step lifecycle
    const now = performance.now();
    doc.lifecycleManager.update(100, now + 400); // 400ms > 350ms retraction duration
    expect(doc.lifecycleManager.getRetractingTokens().length).toBe(0);
  });

  it('handles camera boundary conditions (extremely narrow or wide viewport)', () => {
    const doc = new DocumentModel();
    doc.setText('Testing extreme viewports with botanical vines', 46);
    const layout = doc.relayout();

    // Very small viewport (mobile / tiny embed)
    const smallCamera = new CameraController(100, 100);
    smallCamera.updateTarget(layout);
    // Must clamp to cameraMinZoom (0.45x)
    expect(smallCamera.state.targetZoom).toBe(BOTANICAL_CONFIG.cameraMinZoom);
    expect(smallCamera.state.isAtReadabilityFloor).toBe(true);

    // Very large 4K viewport
    const largeCamera = new CameraController(3840, 2160);
    largeCamera.updateTarget(layout);
    // Must clamp to cameraMaxZoom (1.0x)
    expect(largeCamera.state.targetZoom).toBe(BOTANICAL_CONFIG.cameraMaxZoom);
    expect(largeCamera.state.isAtReadabilityFloor).toBe(false);
  });
});
