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
    * **Vine-Led Growth**: In the customized view the vines grow on a slower, eased clock, with a hooked tip that searches and straightens as it matures. Leaves unfurl from a curl only once the tip has passed them, and each rose waits for its vine to arrive: the bud emerges, swells, its sepals peel back, and then the petals slowly loosen into the half-open bloom.
    * **Letter-Hugging Wraps**: Each letter is scanned once on a hidden canvas to find its ink. A vine then roots at the foot of the tallest stroke (the stem of an r, the side of an o) and coils up it, passing over the letter on the front of each turn and behind it on the back. It grows loose, cinches tight once it is fully grown, then breaks free at the top and ends in a rose or a leaf. To keep the wraps legible, the customized view drops side branches and about half of the bare wandering vines; vines that end in a rose always stay.
    * **Bloom Variety and Falling Petals**: Each word gets a hero: its first rose keeps opening past the half-open goblet into a full, wide-cupped bloom seen in three-quarter view. Other roses are a mix of tight buds and half-open roses, and some wraps sprout a bud partway up the coil, so roses also open on the letters themselves. Blooms in front of a letter cast a soft shadow onto it, and open roses now and then let a petal go, which drifts down past the letters, swaying, tumbling and fading out. Once a rose has finished opening it is drawn from a small cached bitmap instead of being rebuilt every frame (SVG export stays fully vector), which keeps the customized view at about twice the frame rate of the original version.
    * **Rose Prickles, Vines and Leaves**: Small hooked prickles about the width of the stem (olive base, reddish-brown body, pale tan point). Vines taper from a woody root to a slender tip, have a lit edge facing the light, and cast a soft shadow onto a letter wherever they pass in front of it. Leaves are real rose leaves: a short stalk with one or two opposite pairs of toothed leaflets and a larger end leaflet, each shaded lighter on the side facing the light.
    * **Gothic High-Contrast Palette**: Pitch-black background (`#000000`) and crisp bone-white text (`#FFFFFF`).
  * **Interactive Comparison Slider**: Side-by-side draggable split divider and keyboard toggle (<kbd>Tab</kbd>) to compare the baseline Type Garden rendering with the customized gothic treatment on the exact same text, coordinates, and view.

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
Runs 52 automated tests in Vitest verifying mathematical spline interpolation, hooked thorn polygons, cupped petal whorl geometries, and layout stability.

---

## ⌨️ Controls & Interactions

| Key / Action | Interaction |
| :--- | :--- |
| **Typing** | Vines, curling tendrils, and rosebuds sprout and climb around the letterforms. |
| **Space** | Cuts the active stems, sparking blooming roses on the trailing edge while starting a fresh root system for the next word. |
| **Backspace** | Progressively withers and fades the most recent character's garden. |
| **Enter** | Clears the canvas back to an open void. |
| **Tab** | Toggles treatment view between `Split View` $\leftrightarrow$ `Customized` $\leftrightarrow$ `Baseline`. |
| **Divider Drag** | In Split View, click or drag the hairline vertical divider to inspect baseline vs. customized rendering side by side. |
| **Canvas Click** | Spawns an interactive visitor butterfly that flutters across the garden and alights on rose perches. |
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
