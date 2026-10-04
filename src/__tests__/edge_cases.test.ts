// Edge Cases and Robustness Test Suite
import { describe, it, expect } from 'vitest';
import { DocumentModel, measureChar, getFontString, MeasureContext } from '../layoutEngine';
import { CameraController } from '../cameraController';
import { BOTANICAL_CONFIG } from '../config';
import { computeAmbientSway } from '../renderer';

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
    expect(camera.state.zoom).toBe(BOTANICAL_CONFIG.cameraMaxZoom);
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

  it('handles explicit newline breaks creating new lines and paragraph spacing', () => {
    const doc = new DocumentModel();
    const layout = doc.setText('First line\nSecond line', 22);
    expect(layout.lines.length).toBe(2);
    expect(layout.lines[0].words.map((w) => w.text)).toEqual(['First', 'line']);
    expect(layout.lines[1].words.map((w) => w.text)).toEqual(['Second', 'line']);
  });

  it('preserves plant identity during short word edits like in to it', () => {
    const doc = new DocumentModel();
    doc.setText('in', 2);
    const initialSeed = doc.getWords()[0].botanicalInstance.seed;

    doc.setText('it', 2);
    const afterSeed = doc.getWords()[0].botanicalInstance.seed;
    expect(afterSeed).toBe(initialSeed);
  });

  it('handles multi-line text with blank paragraphs correctly', () => {
    const doc = new DocumentModel();
    const layout = doc.setText('First stanza.\n\nSecond stanza.', 30);
    expect(layout.lines.length).toBe(3);
    expect(layout.lines[0].words.map((w) => w.text)).toEqual(['First', 'stanza.']);
    expect(layout.lines[1].words.length).toBe(0); // Blank empty line
    expect(layout.lines[2].words.map((w) => w.text)).toEqual(['Second', 'stanza.']);
    expect(layout.lines[2].y).toBeGreaterThan(layout.lines[0].y + BOTANICAL_CONFIG.baseFontSize * 2);
  });

  it('advances live growthProgress over time via lifecycle update', () => {
    const doc = new DocumentModel();
    doc.setText('bl', 2);
    const word = doc.getWords()[0];
    const bot = word.botanicalInstance;
    expect(bot.growthProgress).toBeLessThan(1.0);
    expect(bot.growthProgress).toBeGreaterThan(0.0);

    // Step lifecycle by 0.15s (growthSpeedPerChar is 0.12s)
    doc.lifecycleManager.update(0.15, performance.now() + 150, doc.getWords());
    expect(bot.growthProgress).toBe(1.0);
  });

  it('spawns trailing retraction when backspacing letters within a word', () => {
    const doc = new DocumentModel();
    doc.setText('blooming', 8);
    const word = doc.getWords()[0];
    expect(word.botanicalInstance.charNodes.length).toBe(8);

    // Backspace 3 letters to 'bloom'
    doc.setText('bloom', 5);
    const trailing = doc.lifecycleManager.getTrailingRetractions();
    expect(trailing.length).toBe(1);
    const tr = trailing[0];
    expect(tr.charIndexStart).toBe(5);
    expect(tr.nodes.length).toBeGreaterThan(0);
    expect(tr.retractionProgress).toBe(0.0);

    // Update lifecycle past retraction duration
    doc.lifecycleManager.update(0.3, performance.now() + 300);
    expect(tr.retractionProgress).toBe(1.0);
    expect(tr.isDead).toBe(true);
    expect(doc.lifecycleManager.getTrailingRetractions().length).toBe(0);
  });


  it('preserves downstream words identity when pasting multiple words', () => {
    const doc = new DocumentModel();
    doc.setText('crimson velvet roses', 20);
    const initialRosesSeed = doc.getWords()[2].botanicalInstance.seed;

    // Paste two words in front
    doc.setText('ancient dark gothic crimson velvet roses', 40);
    const words = doc.getWords();
    const rosesWord = words.find((w) => w.text === 'roses');
    expect(rosesWord).toBeDefined();
    expect(rosesWord!.botanicalInstance.seed).toBe(initialRosesSeed);
  });

  it('preserves exact ambient sway phase when middle word is deleted', () => {
    const doc = new DocumentModel();
    doc.setText('one two three', 13);
    const wordsBefore = doc.getWords();
    const word3Before = wordsBefore[2];
    const t = 20.0;
    const swayBefore = computeAmbientSway(word3Before.botanicalInstance.flatNodes[0], t, word3Before.botanicalInstance.phaseOffset);

    // Delete middle word "two"
    doc.setText('one three', 9);
    const wordsAfter = doc.getWords();
    const word3After = wordsAfter.find((w) => w.text === 'three')!;
    expect(word3After).toBeDefined();
    const swayAfter = computeAmbientSway(word3After.botanicalInstance.flatNodes[0], t, word3After.botanicalInstance.phaseOffset);

    // Phase offset and calculated sway must be 100% numerically identical
    expect(word3After.botanicalInstance.phaseOffset).toBe(word3Before.botanicalInstance.phaseOffset);
    expect(swayAfter).toEqual(swayBefore);
  });

  it('maps click coordinates accurately via getCharIndexAtPosition', () => {
    const doc = new DocumentModel();
    doc.setText('First line\nSecond line', 22);

    // Click near start of line 1
    const idx0 = doc.getCharIndexAtPosition(0, BOTANICAL_CONFIG.baseFontSize * 1.5);
    expect(idx0).toBe(0);

    // Click near second line
    const idx2 = doc.getCharIndexAtPosition(0, BOTANICAL_CONFIG.baseFontSize * 3.5);
    expect(idx2).toBeGreaterThanOrEqual(10); // Index of "Second"
  });

  it('maintains high close-up zoom (>=1.8x) on standard laptop and desktop viewports for initial text', () => {
    const doc = new DocumentModel();
    const layout = doc.setText('Beneath the dark moon climbing roses entwine', 44);

    // Standard laptop resolution (1280x800)
    const laptopCam = new CameraController(1280, 800);
    laptopCam.updateTarget(layout);
    expect(laptopCam.state.targetZoom).toBeGreaterThanOrEqual(1.8);
    expect(laptopCam.state.isAtReadabilityFloor).toBe(false);

    // Standard 1080p desktop resolution (1920x1080)
    const desktopCam = new CameraController(1920, 1080);
    desktopCam.updateTarget(layout);
    expect(desktopCam.state.targetZoom).toBe(BOTANICAL_CONFIG.cameraMaxZoom);
    expect(desktopCam.state.isAtReadabilityFloor).toBe(false);
  });

  it('sprouts blooming roses on ascenderless words such as "roses" and "velvet"', () => {
    const doc = new DocumentModel();
    // Test multiple seeds to confirm statistical bloom opportunity on 'roses'
    let sproutedRose = false;
    for (let trial = 0; trial < 10; trial++) {
      doc.setText(`trial${trial} roses`, 12);
      const rosesWord = doc.getWords().find((w) => w.text === 'roses');
      if (rosesWord && rosesWord.botanicalInstance.roses.length > 0) {
        sproutedRose = true;
        break;
      }
    }
    expect(sproutedRose).toBe(true);
  });

  it('generates large multi-layered rose blooms and robust thorns matching 68px scale', () => {
    const doc = new DocumentModel();
    doc.setText('blooming roses', 14);
    const words = doc.getWords();
    const word = words[0];

    // Thorns must be substantial (>= 14px length at 68px font size)
    expect(word.botanicalInstance.thorns.length).toBeGreaterThan(0);
    for (const th of word.botanicalInstance.thorns) {
      expect(th.length).toBeGreaterThanOrEqual(14);
    }

    // Roses must have petal layers with outer radius >= 25px (>= 50px diameter)
    const allRoses = words.flatMap((w) => w.botanicalInstance.roses);
    expect(allRoses.length).toBeGreaterThan(0);
    for (const rose of allRoses) {
      expect(rose.petalLayers.length).toBe(3);
      expect(rose.petalLayers[0].radius).toBeGreaterThanOrEqual(25);
    }
  });

  it('tracks cursor horizontally so typing is never lost off-screen on narrow viewports', () => {
    const doc = new DocumentModel();
    // Type a long line up to lineWidth
    doc.setText('Beneath the dark moon climbing roses entwine around stone', 56);
    const layout = doc.relayout();

    // Small viewport where line exceeds visible width at 2.0x zoom
    const cam = new CameraController(800, 600);
    cam.updateTarget(layout);

    // PanX must track rightward to keep cursor within visible document range
    const visibleWidthInDoc = 800 / cam.state.targetZoom;
    const cursorX = layout.cursorPos.x;
    expect(cam.state.targetPanX).toBeGreaterThan(-40);
    expect(cursorX - cam.state.targetPanX).toBeLessThanOrEqual(visibleWidthInDoc);
  });

  describe('Letter Advance & Overlap Prevention', () => {
    it('synchronizes ctx.font with BOTANICAL_CONFIG during measureChar and relayout', () => {
      const mockCtx: MeasureContext = {
        font: '10px sans-serif',
        letterSpacing: '5px',
        measureText: (text: string) => {
          // If font was properly set to 68px, return 68px scale width
          const sizeMatch = mockCtx.font?.match(/(\d+)px/);
          const size = sizeMatch ? parseInt(sizeMatch[1], 10) : 10;
          return { width: text.length * size * 0.5 };
        },
      };

      const w = measureChar('B', BOTANICAL_CONFIG.baseFontSize, mockCtx);
      expect(mockCtx.font).toBe(getFontString(BOTANICAL_CONFIG.baseFontSize));
      expect(mockCtx.letterSpacing).toBe('0px');
      // Must be measured at 68px scale (>= 30px), not at 10px scale (5px)
      expect(w).toBeGreaterThanOrEqual(30);

      const doc = new DocumentModel();
      const layout = doc.setText('Gothic letter', 13, mockCtx);
      expect(mockCtx.font).toBe(getFontString(BOTANICAL_CONFIG.baseFontSize));
      expect(layout.words.length).toBe(2);
      expect(layout.words[0].width).toBeGreaterThanOrEqual(150);
    });

    it('guards against 0-width or collapsed measurements from unready canvas or font loading', () => {
      // Mock a broken/unready canvas where measureText returns 0
      const zeroCtx: MeasureContext = {
        font: '10px sans-serif',
        measureText: () => ({ width: 0 }),
      };

      const w = measureChar('m', 68, zeroCtx);
      // Must fall back to proportional width, not 0
      expect(w).toBeGreaterThan(30);

      const doc = new DocumentModel();
      const layout = doc.setText('crimson briar', 13, zeroCtx);
      for (const word of layout.words) {
        expect(word.width).toBeGreaterThan(50);
        for (const metric of word.charMetrics) {
          expect(metric.width).toBeGreaterThanOrEqual(68 * 0.15);
        }
      }
    });

    it('guarantees strictly positive, non-overlapping horizontal placement for all characters in every word', () => {
      const doc = new DocumentModel();
      const layout = doc.setText('Beneath the dark moon climbing roses entwine', 44);

      for (const line of layout.lines) {
        for (const word of line.words) {
          expect(word.charMetrics.length).toBe(word.text.length);
          for (let c = 0; c < word.charMetrics.length; c++) {
            const m = word.charMetrics[c];
            expect(m.width).toBeGreaterThanOrEqual(68 * 0.15); // No 0-width or tiny collapsed glyphs
            expect(m.x).toBeGreaterThanOrEqual(0);
            if (c > 0) {
              const prev = word.charMetrics[c - 1];
              // Previous character must end before or exactly where current character starts
              expect(prev.x + prev.width).toBeLessThanOrEqual(m.x + 0.001);
              expect(m.x).toBeGreaterThan(prev.x);
            }
          }
        }
      }
    });

    it('guarantees clean, non-colliding word boundaries on every line', () => {
      const doc = new DocumentModel();
      const layout = doc.setText('Beneath the dark moon climbing roses entwine', 44);

      for (const line of layout.lines) {
        for (let w = 1; w < line.words.length; w++) {
          const prevWord = line.words[w - 1];
          const currWord = line.words[w];
          const gap = currWord.x - (prevWord.x + prevWord.width);
          // Gap between words must be at least space width (> 10px at 68px scale)
          expect(gap).toBeGreaterThanOrEqual(15);
        }
      }
    });

    it('guarantees vertical clearance between consecutive line baselines without overlap', () => {
      const doc = new DocumentModel();
      const layout = doc.setText('First line\nSecond line', 22);
      expect(layout.lines.length).toBe(2);

      const line0 = layout.lines[0];
      const line1 = layout.lines[1];
      const baselineDelta = line1.y - line0.y;
      expect(baselineDelta).toBe(BOTANICAL_CONFIG.baseFontSize * BOTANICAL_CONFIG.lineHeightMultiplier);

      // Line 0 descender reaches ~ y0 + 0.22 * S. Line 1 ascender reaches ~ y1 - 0.88 * S.
      const S = BOTANICAL_CONFIG.baseFontSize;
      const line0Bottom = line0.y + 0.22 * S;
      const line1Top = line1.y - 0.88 * S;
      const verticalClearance = line1Top - line0Bottom;
      expect(verticalClearance).toBeGreaterThan(0);
    });

    it('re-syncs botanical spline nodes if character metrics shift after web font finishes loading', () => {
      const doc = new DocumentModel();
      // First layout with simulated narrow metrics
      const narrowCtx: MeasureContext = {
        measureText: () => ({ width: 15 }), // Simulated fallback width
      };
      doc.setText('blooming', 8, narrowCtx);
      const initialWord = doc.getWords()[0];
      const initialFirstNodeX = initialWord.botanicalInstance.charNodes[0][0].relX;

      // Now simulated true 68px font loads with wide metrics
      const wideCtx: MeasureContext = {
        measureText: () => ({ width: 45 }), // Loaded Cormorant Garamond width
      };
      doc.setText('blooming', 8, wideCtx);
      const updatedWord = doc.getWords()[0];
      const updatedFirstNodeX = updatedWord.botanicalInstance.charNodes[0][0].relX;

      // Metrics updated
      expect(updatedWord.charMetrics[0].width).toBe(45);
      // Botanical instance seed is preserved
      expect(updatedWord.botanicalInstance.seed).toBe(initialWord.botanicalInstance.seed);
    });

    it('preserves botanical prefix nodes across animation frames for words with ascenders like climbing', () => {
      const doc = new DocumentModel();
      doc.setText('climbing', 8);
      const word1 = doc.getWords()[0];
      const initialNodeCount = word1.botanicalInstance.flatNodes.length;
      const initialLNode = word1.botanicalInstance.charNodes[1][0]; // 'l' is at index 1

      // Simulate next 5 animation frames calling relayout
      for (let f = 0; f < 5; f++) {
        doc.relayout();
      }

      const wordAfter = doc.getWords()[0];
      expect(wordAfter.botanicalInstance.flatNodes.length).toBe(initialNodeCount);
      const currentLNode = wordAfter.botanicalInstance.charNodes[1][0];
      expect(currentLNode.relX).toBe(initialLNode.relX);
      expect(currentLNode.relY).toBe(initialLNode.relY);
    });

    it('handles contractions and punctuation without distortion or false fallback', () => {
      const wApos = measureChar("'", 68);
      // Apostrophe should be thin (under 20px at 68px scale), not a bloated 32.6px default
      expect(wApos).toBeLessThanOrEqual(20);
      expect(wApos).toBeGreaterThanOrEqual(10);

      const doc = new DocumentModel();
      const layout = doc.setText("don't break words", 17);
      const dontWord = layout.words[0];
      expect(dontWord.charMetrics.length).toBe(5);

      // Verify each character strictly advances
      for (let i = 1; i < dontWord.charMetrics.length; i++) {
        const prev = dontWord.charMetrics[i - 1];
        const curr = dontWord.charMetrics[i];
        expect(curr.x).toBeGreaterThan(prev.x);
        expect(prev.x + prev.width).toBeLessThanOrEqual(curr.x + 0.001);
      }
    });

    it('handles multi-space gaps and accurate intra-space cursor placement', () => {
      const doc = new DocumentModel();
      const spaceW = measureChar(' ', 68);
      // "word1   word2" (3 spaces between word1 and word2)
      // Index 0..4: 'word1', index 5, 6, 7: spaces, index 8..12: 'word2'
      // Place cursor at index 7 (the 3rd space)
      const layout = doc.setText('word1   word2', 7);
      const w1 = layout.words[0];
      const w2 = layout.words[1];

      // w2 must be separated from w1 by at least 3 spaces
      const gap = w2.x - (w1.x + w1.width);
      expect(gap).toBeGreaterThanOrEqual(3 * spaceW - 0.5);

      // Cursor at index 7 should be placed inside the gap, NOT at the end of word2
      expect(layout.cursorPos.x).toBeLessThan(w2.x + 0.01);
      expect(layout.cursorPos.x).toBeGreaterThan(w1.x + w1.width);
    });

    it('retains canvas measure context in DocumentModel across subsequent relayout calls', () => {
      const mockCtx: MeasureContext = {
        measureText: () => ({ width: 35 }),
      };
      const doc = new DocumentModel();
      doc.setText('hello world', 11, mockCtx);
      expect(doc.getWords()[0].charMetrics[0].width).toBe(35);

      // Call relayout() with NO arguments (simulating background update or animation frame)
      const layoutAfter = doc.relayout();
      expect(layoutAfter.words[0].charMetrics[0].width).toBe(35);
    });
  });
});


