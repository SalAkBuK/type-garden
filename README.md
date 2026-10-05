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
    * **Vine-Led Growth**: In the customized view the vines grow on a slower, eased clock, with a hooked tip that searches and straightens as it matures. Leaves unfurl from a curl only once the tip has passed them, and each rose waits for its vine to arrive. Some shoots end in a curling tendril, and flowers follow their stems when the garden leans toward the cursor.
    * **Letter-Hugging Wraps**: Each letter is scanned once on a hidden canvas to find its ink. A vine then roots at the foot of the tallest stroke (the stem of an R, the side of an O) and coils up it, passing over the letter on the front of each turn and behind it on the back. It grows loose, cinches tight once it is fully grown, then breaks free at the top and ends in a rose or a leaf; about half the coils also carry a bud or a partly open rose partway up. The wraps vary across a word for rhythm: about a quarter of the letters stay bare, the rest get a loose loop or a medium coil, and some coiled letters get a second, slimmer vine braided the other way. The customized view keeps each flower-bearing root stem and leaves out the side branches, plus about a third of the scattered buds and partly open roses so the hero clusters stand out.
    * **Hero Roses and Clusters**: Every word opens with a full hero bloom on its first letter, flanked by two buds and a partly open rose on short stalks branching from the hero's stem, with a pair of leaves. Buds and partly open roses gather on the coils and vine ends around them, so the crimson sits close in among the letters. The opening "in bloom" always grows the same garden.
    * **Rose Heads Never Overlap**: Each head reserves the space its petals will fill when fully open. A head that would overlap another is moved the least distance that clears it, to just touching, by bending its stalk: the base stays rooted (a coiled vine bends only where it leaves the letter), the last stretch moves as one so the rose keeps its pose, and leaves and side shoots move with it. Nothing is removed. Roses riding a coil never move; roses already on screen keep their places and newcomers make room; among roses that appear together, full blooms stay and partly open roses, then buds, step aside. Spacing is worked out for where the letters are going rather than while they ease into place, and each stalk returns to how it grew once the crowd around it clears (for example after pruning), so moves never pile up as the text reflows.
    * **Layering**: Blossoms overlapping the lettering sit behind the white glyphs, keeping the type readable and crisp. Foliage is drawn in separate passes: front vines still weave over letters, but no stem or leaf ever crosses a rose head, including in SVG exports.
    * **Pause-Driven Blooms**: When you pause (about 0.9 s after a letter, 0.35 s after a full stop, "!" or "?"), the newest letter sprouts a shoot carrying a closed bud, continuing from its coiled vine or rising from the top of its tallest stroke. The bud swells, then opens only while you stay still, holding its progress when you type again: a short pause leaves a closed bud, about 5 s a half-open goblet, about 7 s a full bloom turned toward you. As it opens, a bloom gathers up to five roses on short side stalks, mixing buds, partly open roses and a small full bloom, so a long pause leaves a fuller bouquet. Each word gets at most one earned bloom. A full stop's bloom is larger and opens faster, "!" faster still, a question mark's stays a closed bud, and a comma's is a small bud. Every rose faces the way its stem grows and stays lit from the upper left. Open roses let a petal go now and then; an earned bloom's age only runs in stillness, so it sheds only while you are still.
    * **The Writing Record**: The garden is seeded from the text itself, so the same words grow the same garden and different words grow different ones (the opening text keeps its own fixed composition). A hesitation inside a word ties a knot: a cane sags below the baseline between the two letters and twists into a prickly loop, larger the longer you hesitated. A letter you delete and retype grows from a cut, woody stub at its foot, and its regrowth starts out the red-bronze of new rose shoots and greens over about 45 s.
    * **Pruning**: Backspace prunes the newest letter: its flower droops and fades, its leaves curl and shrink, then its vines draw back toward the root while the letter fades beside its neighbour. Deleting a space draws back the word's end growth the same way.
    * **Atmosphere**: A faint crimson glow sits behind the words and fades to black, and a few out-of-focus petals drift past at different depths: big soft ones in front of everything, tiny dim ones far behind. The customized view holds still (no hand-drawn wobble) for a photographic finish.
    * **Black Butterfly and Blood**: The customized visitor is a velvet-black butterfly with crimson veins, margins and spots. Click the garden or a rose to call it to the nearest bloom; automatic visitors prefer roses that have a letter below them. It lands, feeds for a few seconds and flies away. The rose it fed on releases a few dark-red drops: they bead on the petals over a letter, fall, and splash onto it. From each splash, blood creeps slowly down the stroke to its bottom edge (clipped to the letter's shape), where a bead swells and drips off, landing on any letter further down. The blood darkens as it dries and stays for as long as the letter does. Repeat visits add fresh splashes without replacing earlier stains.
    * **Performance**: On canvas opening roses blend between two nearby bitmap poses every animation frame, with pose renders spread across frames to keep many simultaneous blooms responsive. A bloom that stops opening settles on one bitmap. Still-growing vines skip their shadows until they finish, and settled vines and leaves are cached per letter once cursor movement stops. Exports render exact poses, SVG stays fully vector, and cached bitmaps are freed as soon as letters are removed.
    * **Rose Prickles, Vines and Leaves**: One or two small, sharp hooked prickles per cane, about the width of the stem and varying in size and hook, the odd one larger (olive base, reddish-brown body, a fine pale point); a hesitation knot's or a scar's thorns are far larger, curving back to a needle. Vines taper from a woody root to a slender tip, have a lit edge facing the light, and cast a soft shadow onto a letter wherever they pass in front of it. Leaves are real rose leaves: a short stalk with one or two opposite pairs of toothed leaflets and a larger end leaflet, each shaded lighter on the side facing the light.
    * **Gothic High-Contrast Palette**: Pitch-black background (`#000000`) and crisp bone-white text (`#FFFFFF`).
  * **Treatment Switcher**: Starts in the customized gothic treatment. Use the treatment buttons or <kbd>Tab</kbd> to switch between Customized and Baseline on the same text and view.

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
Runs 106 automated tests in Vitest covering spline interpolation, thorn and petal geometry, layout stability, and the standalone app's floral composition (hero clusters, coil roses, thinning), rose heads that never overlap (least-distance moves on connected stalks, settled-layout placement, stalks restored when a crowd clears), unobstructed rose layering, readable typography, pause-driven blooming, rose clusters, sprite continuity, writing record, rose click targeting, persistent splatter across repeat visits, smooth glyph masking, and bitmap cleanup.

---

## ⌨️ Controls & Interactions

| Key / Action | Interaction |
| :--- | :--- |
| **Typing** | Vines and leaves sprout and climb around the letterforms. In the customized view, typing holds earned blooms at their current opening. |
| **Pausing** | In the customized view, stillness sprouts a bud on the newest letter and opens it the longer you stay still; typing again holds it where it is. |
| **Space** | Cuts the active stems, sending out end-of-word growth on the trailing edge while starting a fresh root system for the next word. |
| **Backspace** | In the customized view, prunes the most recent character: its plant wilts and draws back, and a letter retyped there grows as a revision. In the baseline, withers and fades it. |
| **Enter** | Clears the canvas back to an open void. |
| **Tab** | Toggles treatment view between `Customized` and `Baseline`. |
| **Visitors** | While you type, a butterfly now and then drifts in and alights on a rose. In the customized view the visitor is a black butterfly: click the garden to call one to the nearest rose (one also drops by when the garden is quiet). |
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
