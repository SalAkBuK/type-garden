// Vitest unit tests verifying all Acceptance Criteria from build_brief.md Section 8
import { describe, it, expect } from 'vitest';
import { DocumentModel } from '../layoutEngine';
import { getGlyphStrokes, generateCharSplineNodes } from '../glyphStrokes';
import { CameraController } from '../cameraController';
import { BOTANICAL_CONFIG } from '../config';
import { computeAmbientSway } from '../renderer';

describe('1. Mid-Word Advance Check', () => {
  it('advances tendril tips and nodes continuously with each keystroke across individual letter strokes', () => {
    const doc = new DocumentModel();
    const sequence = ['b', 'bl', 'blo', 'bloom', 'bloomi', 'bloomin', 'blooming'];
    let prevNodeCount = 0;

    for (let i = 0; i < sequence.length; i++) {
      const text = sequence[i];
      const layout = doc.setText(text, text.length);

      expect(layout.words.length).toBe(1);
      const word = layout.words[0];
      const bot = word.botanicalInstance;

      // Character count must match the typed length mid-word
      expect(bot.revealedCharCount).toBe(text.length);
      expect(bot.charNodes.length).toBe(text.length);

      // Node count must advance monotonically with each character
      const currentNodeCount = bot.flatNodes.length;
      expect(currentNodeCount).toBeGreaterThan(prevNodeCount);
      prevNodeCount = currentNodeCount;

      // Botanical growth progress is active for the current keystroke
      expect(bot.growthProgress).toBeGreaterThan(0);
    }
  });
});

describe('2. Stroke-Level Weaving Check', () => {
  it('produces alternating z-depths (-1 behind, +1 in front) for letter strokes (t, h, d, b, l, o, s, T)', () => {
    const testChars = ['t', 'h', 'd', 'b', 'l', 'o', 's', 'T'];
    const fontSize = 32;
    const charWidth = 18;
    const seed = 12345;

    for (const char of testChars) {
      const { nodes, thorns } = generateCharSplineNodes(char, 0, 0, charWidth, fontSize, seed);

      // Verify stroke classification
      const strokes = getGlyphStrokes(char, charWidth, fontSize);
      expect(strokes.length).toBeGreaterThan(0);

      // Must have at least one node passing behind glyph stroke (z = -1)
      const behindNodes = nodes.filter((n) => n.z < 0);
      expect(behindNodes.length).toBeGreaterThan(0);

      // Must have at least one node passing in front of glyph stroke (z = +1)
      const frontNodes = nodes.filter((n) => n.z > 0);
      expect(frontNodes.length).toBeGreaterThan(0);

      // Inspect letter 't': vine wraps around vertical spine and crossbar
      if (char === 't' || char === 'T') {
        const hasVerticalWeave = nodes.some((n) => n.anchorType === 'vertical-front' || n.anchorType === 'vertical-back');
        const hasCrossbarWeave = nodes.some((n) => n.anchorType === 'crossbar-front' || n.anchorType === 'crossbar-back');
        expect(hasVerticalWeave).toBe(true);
        expect(hasCrossbarWeave).toBe(true);
      }

      // Inspect letter 's': sinuous waist and crest weaving
      if (char === 's') {
        const hasWaist = nodes.some((n) => n.anchorType === 's-waist-back');
        const hasCrest = nodes.some((n) => n.anchorType === 's-upper-front');
        expect(hasWaist).toBe(true);
        expect(hasCrest).toBe(true);
      }

      // Inspect letter 'h' or 'd': vine wraps around tall ascender
      if (char === 'h' || char === 'd') {
        const hasAscenderFront = nodes.some((n) => n.anchorType === 'vertical-front' || n.anchorType === 'ascender-crest');
        const hasAscenderBack = nodes.some((n) => n.anchorType === 'vertical-back');
        expect(hasAscenderFront).toBe(true);
        expect(hasAscenderBack).toBe(true);
      }
    }

    // Verify punctuation grounding: punctuation dots must not sprout invasive thorn spikes
    const punctRes = generateCharSplineNodes('.', 0, 0, 8, fontSize, seed);
    expect(punctRes.thorns.length).toBe(0);
    expect(punctRes.nodes.length).toBeGreaterThan(0);
  });
});

describe('3. Partial-Word Edit Stability Check', () => {
  it('preserves exact vine curves, thorns, and seeds on untouched characters when backspacing or editing', () => {
    const doc = new DocumentModel();

    // Step 1: Type "blooming"
    doc.setText('blooming', 8);
    const word1 = doc.getWords()[0];
    const initialSeed = word1.botanicalInstance.seed;
    const initialNodesPrefix = word1.botanicalInstance.charNodes.slice(0, 5).map((nodes) =>
      nodes.map((n) => ({ relX: n.relX, relY: n.relY, z: n.z }))
    );
    const initialThornsPrefix = word1.botanicalInstance.thorns
      .filter((th) => th.charIndex < 5)
      .map((th) => ({ relX: th.relX, relY: th.relY, angle: th.angle, length: th.length }));

    expect(word1.text).toBe('blooming');

    // Step 2: Backspace 3 characters to "bloom"
    doc.setText('bloom', 5);
    const wordAfterBackspace = doc.getWords()[0];

    // Seed must remain strictly identical
    expect(wordAfterBackspace.botanicalInstance.seed).toBe(initialSeed);
    expect(wordAfterBackspace.botanicalInstance.charNodes.length).toBe(5);

    // Nodes for characters 0..4 must be 100% numerically identical
    const currentNodes = wordAfterBackspace.botanicalInstance.charNodes.map((nodes) =>
      nodes.map((n) => ({ relX: n.relX, relY: n.relY, z: n.z }))
    );
    expect(currentNodes).toEqual(initialNodesPrefix);

    // Thorns for characters 0..4 must be 100% numerically identical
    const currentThorns = wordAfterBackspace.botanicalInstance.thorns.map((th) => ({
      relX: th.relX,
      relY: th.relY,
      angle: th.angle,
      length: th.length,
    }));
    expect(currentThorns).toEqual(initialThornsPrefix);

    // Step 3: Insert character in middle e.g. "bloozm" (edit at index 4)
    doc.setText('bloozm', 5);
    const wordEditedMid = doc.getWords()[0];

    // Characters 0..3 prefix must still be strictly preserved
    const prefix3Nodes = wordEditedMid.botanicalInstance.charNodes.slice(0, 4).map((nodes) =>
      nodes.map((n) => ({ relX: n.relX, relY: n.relY, z: n.z }))
    );
    expect(prefix3Nodes).toEqual(initialNodesPrefix.slice(0, 4));
  });
});

describe('4. Deletion & Ambient Decoupling Check', () => {
  it('retracts deleted word while neighboring words preserve plant instances and ambient respiration', () => {
    const doc = new DocumentModel();

    // Type 3 words
    doc.setText('gothic rose garden', 18);
    let words = doc.getWords();
    expect(words.length).toBe(3);

    const w1Seed = words[0].botanicalInstance.seed;
    const w2Seed = words[1].botanicalInstance.seed;
    const w3Id = words[2].id;

    // Evaluate ambient sway at continuous global times t1 and t2
    const t1 = 10.0; // 10 seconds
    const t2 = 10.5; // 10.5 seconds
    const sway1_t1 = computeAmbientSway(words[0].botanicalInstance.flatNodes[0], t1, 0);
    const sway1_t2 = computeAmbientSway(words[0].botanicalInstance.flatNodes[0], t2, 0);
    expect(sway1_t1).not.toEqual(sway1_t2); // Ambient respiration is actively varying

    // Backspace word 3: "gothic rose "
    doc.setText('gothic rose ', 12);
    words = doc.getWords();
    expect(words.length).toBe(2);

    // Word 1 and 2 retain their exact plant instance seeds
    expect(words[0].botanicalInstance.seed).toBe(w1Seed);
    expect(words[1].botanicalInstance.seed).toBe(w2Seed);

    // Retraction manager must contain word 3
    const retracting = doc.lifecycleManager.getRetractingTokens();
    expect(retracting.length).toBe(1);
    expect(retracting[0].wordToken.id).toBe(w3Id);
    expect(retracting[0].instance.isRetracting).toBe(true);

    // Word 1 continues continuous ambient respiration with unchanged phase formula
    const sway1_afterDelete = computeAmbientSway(words[0].botanicalInstance.flatNodes[0], t2, 0);
    expect(sway1_afterDelete).toEqual(sway1_t2); // Continuous, un-restarted ambient phase!
  });
});

describe('5. Reflow Position Check', () => {
  it('synchronously moves attached flora when words reflow to line 2 without resetting', () => {
    const doc = new DocumentModel();

    // Line width is 650px. Add enough words so word 4 wraps to line 2
    doc.setText('crimson velvet thorns bloom', 27);
    let layout = doc.relayout();
    const wordBloom = layout.words.find((w) => w.text === 'bloom');
    expect(wordBloom).toBeDefined();

    const originalSeed = wordBloom!.botanicalInstance.seed;
    const originalRelNodes = wordBloom!.botanicalInstance.flatNodes.map((n) => ({
      relX: n.relX,
      relY: n.relY,
      z: n.z,
    }));

    // Insert long words at the beginning: forcing "bloom" to wrap to the next line
    doc.setText('magnificent gothic tapestry crimson velvet thorns bloom', 55);
    layout = doc.relayout();

    const wrappedBloom = layout.words.find((w) => w.text === 'bloom');
    expect(wrappedBloom).toBeDefined();

    // Must be on lineIndex > 0
    expect(wrappedBloom!.lineIndex).toBeGreaterThan(0);

    // Seed and local botanical structure MUST BE IDENTICAL (not re-seeded)
    expect(wrappedBloom!.botanicalInstance.seed).toBe(originalSeed);
    const newRelNodes = wrappedBloom!.botanicalInstance.flatNodes.map((n) => ({
      relX: n.relX,
      relY: n.relY,
      z: n.z,
    }));
    expect(newRelNodes).toEqual(originalRelNodes);

    // Absolute position reflects line 2 baseline
    expect(wrappedBloom!.y).toBeGreaterThan(BOTANICAL_CONFIG.baseFontSize * 1.5);
  });
});

describe('6. Readability Floor Check', () => {
  it('clamps zoom to cameraMinZoom and transitions to vertical auto-panning tracking the active line', () => {
    const camera = new CameraController(1200, 800);
    const doc = new DocumentModel();

    // 1. Single short line: should stay near cameraMaxZoom
    doc.setText('A gothic letter begins', 22);
    let layout = doc.relayout();
    camera.updateTarget(layout);
    expect(camera.state.targetZoom).toBeCloseTo(BOTANICAL_CONFIG.cameraMaxZoom, 0);
    expect(camera.state.isAtReadabilityFloor).toBe(false);
    expect(camera.state.targetPanY).toBe(0);

    // 2. Many lines exceeding viewport: 25 lines of prose
    const longLetter = Array.from({ length: 25 }, (_, i) => `Line ${i + 1} of dark gothic roses entwine around aged pergolas`).join(' ');
    doc.setText(longLetter, longLetter.length);
    layout = doc.relayout();
    expect(layout.lines.length).toBeGreaterThan(15);

    camera.updateTarget(layout);

    // Target zoom MUST clamp at cameraMinZoom
    expect(camera.state.targetZoom).toBe(BOTANICAL_CONFIG.cameraMinZoom);
    expect(camera.state.isAtReadabilityFloor).toBe(true);

    // Auto-panning MUST be active (targetPanY > 0) to keep active line at golden ratio
    expect(camera.state.targetPanY).toBeGreaterThan(0);

    // Camera step damping interpolates zoom towards cameraMinZoom
    for (let f = 0; f < 60; f++) {
      camera.step(0.016);
    }
    expect(camera.state.zoom).toBeLessThanOrEqual(BOTANICAL_CONFIG.cameraMinZoom + 0.1);
    expect(camera.state.panY).toBeGreaterThan(0);
  });
});
