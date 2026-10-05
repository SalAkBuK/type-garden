# Type Garden — Gothic Botanical Edition

An interactive generative typography canvas and type generator where climbing rose stems, sharp hooked thorns, and deep crimson roses grow out of letterforms in real time as you type.

Based on the original **Type Garden** by **Akshat Agarwal** ([type-garden.vercel.app](https://type-garden.vercel.app/)).

---

## 🌹 Credits & Attribution

* **Original Concept, Design & Mechanics**: **Akshat Agarwal**
  * Original Project: [Type Garden](https://type-garden.vercel.app/)
  * Original Design: Created for Claude Design using custom interactive components.
  * Core Mechanics: Typing to grow stems and flowers, <kbd>Space</kbd> cuts stems for a new garden, <kbd>Backspace</kbd> withers letters, <kbd>Enter</kbd> clears the field, 2-pass over/under $z$-layering around glyphs, and butterfly visitors.

* **This Adaptation & Customization**:
  * **Zero-Build Self-Contained App**: Rebuilt into a single, standalone HTML/Canvas file ([`type_garden.html`](type_garden.html) / [`index.html`](index.html)) that runs directly in any modern browser without bundlers or build steps.
  * **Typography**: Uses **Playfair Display Bold (700)** from Google Fonts for letterforms (replacing commercial *GT Ultra Fine*) and **DM Mono** for the interface.
  * **Customized Botanical Rendering**:
    * **Half-Open Long-Stem Roses**: Each bloom is modelled in 3D and seen almost side-on, like a florist's hybrid-tea rose just before full bloom. Petals are placed on the golden-angle spiral real roses follow and form an egg-shaped cup: they swell from a round base, rise upright, and open at the lip, where the margins roll back into points around a tight central spiral. Each petal is shaded across its curve by the light it faces (crimson `#ac0818` body, `#e22632` highlights, near-black `#420008` shadow pooling at the base), and the rose unfurls from a teardrop bud while its five slim sepals fold down beneath it.
    * **Vine-Led Growth**: In the customized view the vines grow on a slower, eased clock, with a hooked tip that searches and straightens as it matures. Leaves unfurl from a curl only once the tip has passed them, and each rose waits for its vine to arrive. Shoots nod over at the tip rather than coiling like a pea tendril, and flowers follow their stems when the garden leans toward the cursor.
    * **Letter-Hugging Wraps**: Each letter is scanned once on a hidden canvas to find its ink. A vine then roots at the foot of the tallest stroke (the stem of an R, the side of an O) and coils up it, passing over the letter on the front of each turn and behind it on the back. It grows loose, cinches tight once it is fully grown, then breaks free at the top and ends in a leaf. The wraps vary across a word for rhythm: about a quarter of the letters stay bare, the rest get a loose loop or a medium coil, and some coiled letters get a second, slimmer vine braided the other way. To keep the wraps legible, the customized view drops side branches and about half of the bare wandering vines.
    * **Three Tiers of Roses**: The garden mixes closed buds, partly open roses and full blooms, in a clear hierarchy. *Ambient roses* belong to the plant's own growth: about half of the visible stem tips (`REC.roses`) carry one, opening as the vine reaches it. Roughly half are closed buds, a third partly open roses that hold at their own point, and the rest small full blooms, all smaller and a little darker than the earned blooms. They never draw the butterfly or bleed, and the rest of the stem tips end in a leaf. Each word has its own floral intensity, so some words grow lush and others stay quiet, which keeps negative space in the composition. *Earned blooms* are the largest roses and come from the writing (below).
    * **Earned Blooms**: When you pause (about 0.9 s after a letter, 0.35 s after a full stop, "!" or "?"), the newest letter sprouts a shoot carrying a closed bud, continuing from its coiled vine or rising from the top of its tallest stroke. The bud swells, then opens only while you stay still, and it holds wherever it got to when you type again: a short pause leaves a closed bud, about 5 s a half-open goblet, about 7 s a full bloom turned toward you. As it opens, a bloom gathers roses on short side stalks (up to three, `REC.cluster`: a bud, then a partly open rose that keeps opening while you stay still, then another bud), so a long pause leaves a small bouquet. Each word gets at most one bloom. A full stop's bloom is larger and opens faster, "!" faster still, a question mark's stays a closed bud, and a comma's is a small bud. Every rose faces the way its stem grows and stays lit from the upper left. A bloom left in stillness long past its peak begins to drop a petal now and then.
    * **The Writing Record**: The garden is seeded from the text itself (each letter from the text up to it), so the same words grow the same garden and different words grow different ones. How you type adds marks on top. A hesitation inside a word (a gap well over your own typing pace) ties a knot: a cane sags below the baseline between the two letters and twists into a prickly loop, larger the longer you hesitated. A letter you delete and retype grows from a cut, woody stub at its foot (one more for each rewrite), and its regrowth starts out the red-bronze of new rose shoots and greens over about 45 s.
    * **Pruning**: Backspace prunes the newest letter instead of erasing it: its flower droops and fades, its leaves curl and shrink, then its vines draw back toward the root while the letter fades beside its neighbour. Deleting a space draws back the word's end growth the same way.
    * **Atmosphere**: A faint crimson glow sits behind the words and fades to black. The customized view holds still (no hand-drawn wobble) for a photographic finish.
    * **Black Butterfly and Blood**: Open blooms draw a velvet-black butterfly with crimson veins, margins and spots. Soon after you go still it comes to an open bloom it hasn't fed on, lands, feeds and bites; typing before it bites startles it away, and it comes back at your next pause. A bitten bloom bleeds for as long as its letter lasts, and the rest of its cluster bleeds with it, more slowly. Every few seconds (a little more often from a full bloom) a drop beads on its lowest petals, falls and splashes onto the letter below, with satellite droplets around the splash and a spray kicked up from it. Each bloom's shoot turns back over its own letter, so even thin letters catch what drips. From each splash blood runs slowly down the stroke, and later drops follow the same channel and widen it. At the stroke's bottom edge the blood collects in a pool along the foot, which spreads along it and, once full, swells a bead that drips onto whatever lies below: the floor of a bowl, a letter on the next line, or away. Blood darkens as it dries and is masked to the glyph's true outline. Dried blood is baked into each letter's bitmap, so it builds up indefinitely without slowing the page, and it fades away with its letter when the letter is pruned. (`props.blood` turns it off.)
    * **Reduced Motion**: With the system's reduced-motion setting on, letters snap into place, and the sway after typing, the lean toward the cursor, falling petals and the butterfly's flight are turned off (a still garden's open blooms simply begin to bleed).
    * **Performance**: On canvas opening roses blend between two nearby bitmap poses every animation frame, with pose renders spread across frames; a bloom that stops opening settles on one bitmap. Still-growing vines skip their shadows until they finish, and settled vines and leaves are cached per letter once cursor movement stops. Exports render exact poses, SVG stays fully vector, and cached bitmaps are freed as soon as letters are removed.
    * **Rose Prickles, Vines and Leaves**: Prickles are curved claws: a broad base flattened along the cane, tapering to a needle point that hooks back toward the stem's base. They are near-black maroon where they grow from the cane and bone-pale at the point, with a lit back edge and a shadowed hook. They are irregular in every way: spacing in runs and gaps, sides mostly but not always alternating, sizes mostly middling with now and then a big one, each with its own lean and hook. The coils over the letters carry fewer, smaller ones. Vines taper from a woody root to a slender tip, have a lit edge facing the light, and cast a soft shadow onto a letter wherever they pass in front of it. Leaves are real rose leaves: a short stalk with one or two opposite pairs of toothed leaflets and a larger end leaflet, each shaded lighter on the side facing the light.
    * **Gothic High-Contrast Palette**: Pitch-black background (`#000000`) and crisp bone-white text (`#FFFFFF`).
  * **Interactive Comparison Slider**: The app opens in the customized view. <kbd>Tab</kbd> (or the "compare" hint) cycles to the baseline and then to a side-by-side split with a draggable divider, showing both treatments on the exact same text, coordinates, and view.

---

## 🌿 Quick Start

No installation or build steps required.

### 1. Direct Browser Opening
Simply double-click [`type_garden.html`](type_garden.html) (or [`index.html`](index.html)) in any web browser (Chrome, Edge, Safari, Firefox).

### 2. Local Dev Server (Optional)
```bash
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

### 3. Run Automated Verification Tests
```bash
npm test
```
Runs 81 automated tests in Vitest covering spline interpolation, thorn and petal geometry, layout stability, and the standalone app's bloom continuity, flower attachments, cursor tracking, bitmap cleanup, simultaneous bloom scheduling, and the writing record (pause-sprouted buds, stillness-driven opening, content seeding, hesitations, revisions, pruning, ambient rose tiers and bloom clusters, and the blood: permanent and cluster bleeding, shared channels, pools, butterfly targeting).

---

## ⌨️ Controls & Interactions

| Key / Action | Interaction |
| :--- | :--- |
| **Typing** | Vines and leaves sprout and climb around the letterforms. In the customized view nothing blooms while you type. |
| **Pausing** | In the customized view, stillness sprouts a bud on the newest letter and opens it the longer you stay still; typing again holds it where it is. |
| **Space** | Cuts the active stems, sending out end-of-word growth on the trailing edge while starting a fresh root system for the next word. |
| **Backspace** | In the customized view, prunes the most recent character: its plant wilts and draws back, and a letter retyped there grows as a revision. In the baseline, withers and fades it. |
| **Enter** | Clears the canvas back to an open void. |
| **Tab** | Cycles the treatment: `Customized` → `Baseline` → `Split View`. The "compare" hint does the same. |
| **Divider Drag** | In Split View, click or drag the hairline vertical divider to inspect baseline vs. customized rendering side by side. |
| **Visitors** | In the baseline, a butterfly now and then drifts in while you type and alights on a rose. In the customized view a black butterfly comes to open blooms when you pause, and its bite makes a bloom bleed for good. |
| **Mouse / Touch Move** | Flowers and climbing stems subtly lean and turn their faces toward your cursor. |

---

## 🎨 Features & Modes

* **Type Mode**: Fullscreen fluid typing experience with bottom controls, 10 palette swatches (*Rose noir*, *Paper*, *Midnight*, *Citrus*, *Orchid*, *Moss*, *Tomato*, *Butter*, *Blush*, *Mono*), and instant PNG/SVG vector exports.
* **Poster Mode**: Square 1080×1080 animated stage with 7 motion presets:
  1. **Breathe**: Slow ambient respiration and organic sway (3s loop).
  2. **Grow & wither**: Full bloom cycle and withering return (6s loop).
  3. **Typed**: Continuous typing, cutting, and looping (5s loop).
  4. **Gust**: Sweeping wind wave bending stems and petals (4s loop).
  5. **Reach**: Stems dynamically track and reach toward a moving light source (6s loop).
  6. **Scatter**: Randomized asynchronous blooming and fading (6s loop).
  7. **Visitor**: Butterfly alights and rests on rose perches (7s loop).
* **Exporting**:
  * **PNG**: High-resolution canvas snapshot.
  * **SVG**: Clean vector graphic with letter outlines and botanical curves.
  * **MP4 / WebM**: Smooth 30 FPS video recording of loops.
  * **PNG Frames**: Generates a `.zip` archive containing individual frame sequences directly in-browser.

---

## 📄 License

Original Type Garden concept and design by Akshat Agarwal.
Distributed for creative and educational exploration.
