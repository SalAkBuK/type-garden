# Gothic Botanical Letter — Implementation Proof (V1)

An epistolary canvas where typed words act as physical trellises: climbing rose stems with sharp thorns and deep crimson blooms coil around actual letterform strokes in real time, while a dynamic camera pulls back smoothly and transitions to readable auto-panning at the readability floor.

## Running the Proof

### 1. Run Interactive Web Proof
```bash
npm run dev
```
Open the provided local URL (typically `http://localhost:5173`) in any modern browser.

### 2. Run Headless Verification Test Suite
```bash
npm test
```
Executes the comprehensive Vitest suite covering all 6 observable acceptance criteria and boundary edge cases.

---

## Architecture & Verified Mechanics

1. **Live Mid-Word Keystroke Advance:**
   - Tendril tips and nodes advance continuously on every keystroke (`revealedCharCount`, `growthProgress`) mid-word without waiting for a spacebar or word boundary.
2. **Stroke-Level Weaving ($z = \pm 1$):**
   - Letterforms are classified into typographic stroke skeletons (vertical spines, crossbars, bowls, ascenders).
   - Stems weave through alternating $z$-depths: passing behind the glyph stroke ($z = -1$) and curling over the front ($z = +1$).
3. **Stable Plant Identity in Partial-Word Edits:**
   - Every word token holds a deterministic 32-bit seed and character node hierarchy.
   - Partial edits preserve prefix nodes, thorns, and rose blooms with zero flickering or re-randomization.
4. **Isolated Deletion & Retraction:**
   - Backspacing or deleting a word triggers an isolated animated retraction into the baseline.
   - Neighboring words maintain undisturbed ambient breathing and growth stages.
5. **Word Reflow Tracking:**
   - When text reflows across lines, attached flora translates synchronously with layout coordinates while preserving deterministic plant seeds.
6. **Dynamic Framing & Readability Floor:**
   - Smooth critically-damped spring camera zooming.
   - Strictly clamps at the readability floor ($Z_{\text{min}} = 0.45\times$).
   - Initiates damped vertical auto-panning to keep the active typing line centered at the golden ratio (~62% down the screen).
7. **Thorn & Rose Detail:**
   - Multi-layered gothic crimson roses (`#7a0c1a` deep, `#b81d33` mid, `#d9364f` highlight) with organic bloom animation.
   - Sharp thorns with dark woody base (`#3d2f26`) and pale tips (`#6e5648`).
