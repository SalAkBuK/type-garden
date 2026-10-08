# Rose Garden V3 — project research

This research supports **TENDER VIOLENCE**, a new 40-second, 16:9 Rose Garden brand film at 96 BPM. It is grounded in the existing project, including its renderer, interactions, customization, native motion loops and previous film work. V3 is separate from V1 and V2. This document is research and a production constraint record; it does not approve a final render.

At 96 BPM, one beat is 0.625 seconds. Forty seconds is exactly 64 beats, or 16 bars of 4/4. This offers enough structure for a genuine change in pace: tension, abundance, rupture, an exposed skeleton, and return.

## The current application and the renderer to use

The active application is the self-contained HTML/Canvas implementation in [index.html](../../index.html#L407), mirrored by [type_garden.html](../../type_garden.html#L407). At the time of research their SHA-256 hashes are identical: `3E8CBF8A378DDEA1765A1DD9BEB594562EC806A69CF3695E1F08A8334BECE302`. The inline `TypeGardenApp` class owns both the type view and the poster stage. Startup exposes that real application as `window.__typeGarden`: [index.html:6484](../../index.html#L6484).

The TypeScript modules under `src/` are a different, earlier implementation. They use `DocumentModel`, `CameraController` and `BotanicalRenderer`, initialize a long sentence, and trigger all word roses after a 1.2-second typing pause: [src/main.ts:1](../../src/main.ts#L1), [src/main.ts:83](../../src/main.ts#L83), [src/main.ts:156](../../src/main.ts#L156). Their configured typeface is Cormorant Garamond and their colors/growth timings differ: [src/config.ts:49](../../src/config.ts#L49). Those modules are useful historical context, but must not be mistaken for the richer current application or used as a replacement film renderer.

Current defaults are customized treatment, Crimson gothic, Playfair Display, Legacy bleeding, Ink, `in bloom`, seed 7, and Breathe poster motion: [index.html:643](../../index.html#L643). The app and its existing UI retain the Type Garden name. The requested ROSE GARDEN identity belongs to the new film; this task does not rename or rewrite the app.

### How the actual drawing works

The customized renderer draws the glow, foliage, roses, glyphs, stains, foreground plants and droplets in deliberate passes. Rear roses are drawn behind glyphs; front foliage is masked against rose heads; foreground blooms then cover remaining plants: [index.html:5496](../../index.html#L5496), [index.html:5513](../../index.html#L5513). This gives the lettering crispness and allows a vine to pass over a stroke while the rose remains clear. It is a distinctive visual grammar worth photographing closely.

Roses are procedurally modeled with internally projected petal depth, shaded fronts and reverses, rolled rims, sepals and overlapping opening phases. The rose's internal transform accepts a `z` coordinate and projects it into the current Canvas view: [index.html:3324](../../index.html#L3324). The description of golden-angle petals and half-open hybrid-tea geometry is documented in [README.md:20](../../README.md#L20); the actual petal shading is in [index.html:3490](../../index.html#L3490). This is not a freely orbitable 3D garden. Camera translation, scale, crops and restrained image-plane rotation are supportable film techniques; a true spatial orbit would require a new scene system and should not be implied.

Opening roses use bitmap pose caching and blending for responsive playback. Film capture should request sufficient native resolution and replay the scene to the desired time, rather than magnifying a low-resolution screenshot. Exact pose rendering, vector backend behavior and cache release are described in [README.md:31](../../README.md#L31), with the bitmap path in [index.html:3945](../../index.html#L3945).

## The interaction is a writing record

The strongest truthful positioning is **living typography that records the act of writing**. Words seed the plants, stillness opens them, hesitation ties knots and revision leaves scars. This makes the botanical system feel authored and consequential, rather than ornamental.

| Input or condition | Actual result | Source |
| --- | --- | --- |
| Type a character | Plants are generated from the text up to and including that character. The same text creates the same garden; a different character changes the subsequent seeds. | [index.html:2750](../../index.html#L2750), [index.html:2288](../../index.html#L2288) |
| Pause | After 900 ms, the newest eligible letter sprouts an earned bud. Its opening clock advances while the writer stays still. Further writing freezes that bloom at the opening it earned. | [index.html:2252](../../index.html#L2252), [index.html:2349](../../index.html#L2349) |
| Sentence punctuation | Period, exclamation and question mark use a 350-ms sprout threshold. A period opens faster; an exclamation faster still. A question mark remains a bud. Comma-like punctuation earns a smaller bud. | [index.html:643](../../index.html#L643), [index.html:2265](../../index.html#L2265), [index.html:2277](../../index.html#L2277), [index.html:2353](../../index.html#L2353) |
| Continue a word after a hesitation | A cane sags between the two letters and twists into a thorned loop. Length and thorn count increase with the hesitation. The threshold also considers the writer's recent pace. | [index.html:2654](../../index.html#L2654), [index.html:2764](../../index.html#L2764) |
| Space | Ends the active word's stem system, generates its trailing growth and begins the next word. | [index.html:2758](../../index.html#L2758) |
| Backspace | Prunes the newest character. It wilts and retracts over the 650-ms pruning interval while staying beside its previous neighbor. The position is recorded for a rewrite. | [index.html:2298](../../index.html#L2298), [index.html:643](../../index.html#L643), [index.html:2970](../../index.html#L2970) |
| Retype a pruned position | Grows woody cut stubs, up to three revisions, and red-bronze new shoots which green over about 45 seconds. | [index.html:2683](../../index.html#L2683), [index.html:2314](../../index.html#L2314), [index.html:5468](../../index.html#L5468) |
| Enter | Clears the type canvas and writing record. | [index.html:2741](../../index.html#L2741), [index.html:2310](../../index.html#L2310) |
| Tab | Switches Customized/Baseline treatment on the same text. | [index.html:2723](../../index.html#L2723) |
| Pointer movement | Nearby stems and roses lean toward the pointer with an eased deformation. | [index.html:719](../../index.html#L719), [index.html:5437](../../index.html#L5437) |
| Click garden | Calls a visitor to the nearest live rose. | [index.html:744](../../index.html#L744), [index.html:1999](../../index.html#L1999) |

The earned bloom is limited to one per word; punctuation can carry its own bloom. A word therefore does not become a new bouquet at every pause: [index.html:2272](../../index.html#L2272). Opening time is retained, including across a font change. The roughly five-second half-open and seven-second full-open timings in [README.md:26](../../README.md#L26) describe the overall behavior, while the implementation includes shoot arrival and the bloom's own age. Film retiming must be labeled as choreography, not an assertion about exact real-time typing latency.

### Botanical form and growth

The letter is a trellis. The renderer scans its ink to locate a climbing track. A vine roots near the stroke's foot, follows the ink, and alternates front/back passes as it winds upward. Its coil begins loose and cinches after it reaches full growth. Some letters receive a second, slimmer reverse braid: [index.html:3549](../../index.html#L3549), [index.html:3573](../../index.html#L3573), [index.html:3603](../../index.html#L3603), [index.html:3641](../../index.html#L3641), [index.html:3150](../../index.html#L3150).

Leaves and roses wait for the vine tip to arrive, rather than appearing simultaneously. Customized growth uses a slower, eased vine clock: [index.html:5434](../../index.html#L5434), [index.html:3886](../../index.html#L3886). The foliage is rose foliage: compound toothed leaflets, a larger terminal leaflet, individual shaded faces and thin stalks. Canes taper and carry lit edges and small hooked prickles: [README.md:32](../../README.md#L32), [index.html:3112](../../index.html#L3112).

Every word's opening letter carries a hero bloom, normally flanked by two buds and a half-open satellite. Earned blooms gather additional satellites as they open: [index.html:2854](../../index.html#L2854), [index.html:3674](../../index.html#L3674), [index.html:2378](../../index.html#L2378). Bud, half-open goblet and full bloom are actual rose states, with separate opening limits: [index.html:3313](../../index.html#L3313), [index.html:3340](../../index.html#L3340).

Spacing bends stems to make room for rose heads; it does not simply delete colliding roses. Coiled flowers keep their anchors, existing on-screen roses keep priority, and the solution is based on target letter positions: [README.md:24](../../README.md#L24). The coverage safeguard also limits how much an enlarged full bloom can obscure a glyph: [index.html:2542](../../index.html#L2542). These are reasons to use the real renderer rather than a collection of hand-positioned rose cutouts.

## Palette and finish

The customized system has seven looks. Colors change the same garden's finish while keeping its composition and behavior. The complete preset definition is in [index.html:484](../../index.html#L484); the preserving application path is in [index.html:994](../../index.html#L994).

| Look | Page | Lettering | Rose direction |
| --- | --- | --- | --- |
| Crimson gothic | `#000000` | `#FFFFFF` | Crimson `#AC0818`; black velvet visitor and crimson markings |
| Ivory | `#EEE6D5` | `#120E0B` | Crimson, with about 40% of smaller roses ivory |
| Silver ichor | `#DEDFE5` | `#0D0D11` | Pearl roses, silver-white liquid and silver visitor markings |
| Black rose | `#150C0F` | `#EFE6D4` | Crimson garden, black velvet hero and earned blooms |
| Mourning | `#ECE5D8` | `#0E0B0A` | Black velvet roses on bone; glossy red liquid |
| Old rose | `#1B0B18` | `#F4EAE0` | Dusty old-rose pink `#CE6886` |
| Pink & black | `#D9D6D8` | `#120C0E` | Pink garden, black focal blooms |

V3 commits to **Crimson gothic and Mourning only**. Crimson supplies saturation, darkness and lushness. Mourning supplies the bone ground and sharp black forms needed to expose the organism as a graphic skeleton. The change is a purposeful film match cut, not a preset tour. Mourning also changes rose ink; a genuinely withered rose subsequently follows the native maroon/brown/ash death ramp rather than remaining a flat black silhouette: [index.html:631](../../index.html#L631), [index.html:2333](../../index.html#L2333).

The crimson rose face ramp is near-black `#420008`, body `#AC0818`, highlight `#E22632`. Black roses contain deep crimson highlights rather than neutral black. The custom finish includes shaded reverses, shadow pooling, a rim and cast shadow: [index.html:513](../../index.html#L513). The vine is dark green with a paler rim, and the butterfly is velvet black with crimson veins, margins and spots: [index.html:609](../../index.html#L609).

A native soft pool of light sits behind the words. The type view also has foreground and background out-of-focus petal layers: [index.html:5496](../../index.html#L5496), [index.html:5293](../../index.html#L5293). The scripted poster suppresses the live random depth-of-field simulation and uses deterministic native motion petals instead: [index.html:5511](../../index.html#L5511), [index.html:5537](../../index.html#L5537), [index.html:6018](../../index.html#L6018). Any extra film lighting or depth treatment must be identified as finishing, not as a new app feature.

## Appearance and botanical customization

The appearance panel controls page and letter color, main and secondary rose color, the secondary color's placement, liquid, foliage, butterfly wings/markings and font. The second rose color can go to focal hero/earned blooms, to a scattered share of smaller roses, or nowhere. Existing plants are recolored without changing their seeds, clock, location or writing record: [index.html:473](../../index.html#L473), [index.html:1008](../../index.html#L1008), [index.html:1650](../../index.html#L1650).

Looks leave font and botanicals in place. Clicking the active look opens the panel without changing appearance, and the Custom swatch restores a retained custom appearance: [index.html:998](../../index.html#L998), [index.html:1105](../../index.html#L1105). Preferences, custom bleeding and material are kept in browser localStorage: [index.html:1051](../../index.html#L1051), [index.html:1077](../../index.html#L1077). Film scenes should use isolated browser state so the user's saved look does not alter deterministic capture.

The eleven botanical controls are real compositional tools. Their neutral values represent the existing garden. They use plant hashes and drawing scales rather than inventing new plant identities: [index.html:568](../../index.html#L568), [index.html:1137](../../index.html#L1137).

| Control | Supported range or behavior |
| --- | --- |
| Roses | 0–200% of neutral; hero and earned blooms remain, scattered/branch roses thin or return |
| Minimum rose size | 50–150% |
| Maximum rose size | 50–160% |
| Buds / Half-open / Full | Three shares of one mix; changing one redistributes the other two |
| Bloom clusters | 0–200%; satellites and their leaves |
| Foliage | 0–200%; leaves, bare shoots, then more branches |
| Leaf size | 50–180% |
| Vines | 50–200% thickness |
| Thorns | 0–200%; visibility, extra prickles and size |

Ranges: [index.html:574](../../index.html#L574). Compiled behavior: [index.html:1157](../../index.html#L1157). Changes ease visible plant growth in or out; reversing a control restores the seeded plants. A full rose moved over the type can be eased smaller, then kept half-open if needed, while the hero/earned coverage limit is freer. Ordinary/focal coverage thresholds are 20%/35% of a letter's ink, applying when the customized mix or sizes require safeguarding: [index.html:1165](../../index.html#L1165), [index.html:2542](../../index.html#L2542). Writing marks retain their thorns independently of decorative prickles: [README.md:60](../../README.md#L60).

These controls can help compose the V3 portrait before capture. They should not be presented as on-screen sliders or an eleven-step demonstration.

## Butterfly, liquid and letter materials

The customized visitor has foreshortened velvet wings with separate margins, veins and spots. Live visitors fly, perch, feed and leave. A bite is triggered after a perched feeding interval; automatic visits prefer roses above ink so a drop can hit the letters: [index.html:2013](../../index.html#L2013), [index.html:2054](../../index.html#L2054), [index.html:2101](../../index.html#L2101). A clicked rose remains the target even when another would spill blood onto a letter more conveniently: [index.html:1999](../../index.html#L1999).

Native blood forms beads on the rose, releases falling drops, intersects the letter ink, splashes and leaves clipped stains. It can drip from a stroke edge onto a lower letter. Repeat visits add marks rather than replacing the old ones. Liquid darkens as it dries: [README.md:30](../../README.md#L30), [index.html:4050](../../index.html#L4050), [index.html:4100](../../index.html#L4100), [index.html:4149](../../index.html#L4149).

Legacy makes straight creeping trails and stroke-end beads. Fluid traces wandering paths, follows steep edges, pools, hangs drops, and can merge a later run into an older wet channel: [index.html:551](../../index.html#L551), [index.html:4181](../../index.html#L4181), [index.html:4317](../../index.html#L4317). Custom bleeding controls amount, trails, thickness, length, wander, splatter, bead production, pooling, merging, drying, gloss and aged appearance. A style change affects future splashes; old trails retain their originating effect, while drying/gloss settings apply across marks: [index.html:1236](../../index.html#L1236).

Material is distinct from bleeding color and path. The four material definitions and response parameters are in [index.html:597](../../index.html#L597):

| Letter material | Actual wet response | Film relevance |
| --- | --- | --- |
| Ink | Sealed; the selected bleeding effect remains on the surface | A crisp, legible wound and trail |
| Blotting paper | Fast absorption; fibre feathering, water ahead of pigment, bound stain, tide line and pale water halo | A possible small capillary macro if it serves the edit |
| Linen | Slower absorption with a thread-grid weave | A different directional soaking texture |
| Wax | Rejects film into beads which gather, merge, slide, hang and drop | Glossy bead behavior |

The simulation remains inside the glyph outline, including around bowls and along hairlines. A dry absorbent letter drinks a splash; a saturated letter allows more surface run/drip: [index.html:4599](../../index.html#L4599). These are liquid response systems, not a promise of a separately modeled 3D paper/cloth/wax object. Material changes preserve already established liquid; switching between repellent and absorbent behavior can dry what was present instead of replaying it from scratch: [index.html:4648](../../index.html#L4648).

V3 should use one short, consequential native wound passage. V1 already juxtaposes all four materials; V2 already builds an entire film around one drop. V3 needs no material catalog.

## Fonts and typography

The seven curated families are Playfair Display 700, Cormorant Garamond 700, EB Garamond 700, Bodoni Moda 700, DM Serif Display 400, Cinzel 700 and UnifrakturMaguntia 400: [index.html:433](../../index.html#L433). Playfair is loaded with the page; other faces are loaded on demand. If loading fails, the current face stays, and a later choice supersedes an unfinished earlier load: [index.html:1389](../../index.html#L1389).

Font changes refit every plant to the new glyph geometry from its retained seeds. Text, IDs, birth times, bloom clocks, hesitations and revisions persist. Blood moves to the nearest valid ink and material liquid is transferred: [index.html:1553](../../index.html#L1553), [index.html:1565](../../index.html#L1565). This is a real reshaping operation, not a continuous typographic morph feature. Film cuts or compositing may use two actual states, but must not imply that the app performs a smooth arbitrary font interpolation.

The app accepts TTF, OTF, WOFF and WOFF2 uploads up to 6 MB. Files stay in the browser, are validated before use, can derive their family name from the file and are drawn at their own weight. The latest five are retained in IndexedDB; uploaded faces are embedded in SVG exports: [index.html:1423](../../index.html#L1423), [index.html:1426](../../index.html#L1426), [index.html:1490](../../index.html#L1490), [index.html:1542](../../index.html#L1542).

The film's final name should be actual planted typography, with the renderer's roses and helices carried into the identity. DM Mono belongs to the app interface; there is no need for its controls or hints to enter the film.

## Native motion and safe film reuse

The poster is a second stage running the same customized renderer. It inherits the app's theme, botanicals, material, font and liquid settings while owning its letters, droplets, stains, spacing and canvas. The type view is not swapped out: [index.html:5558](../../index.html#L5558), [index.html:5598](../../index.html#L5598).

The stage writes words through the actual `add`, `keyEvent` and `checkSprout` methods, pausing between words to earn buds. It then prepares fully grown anchor positions and applies motion scripts: [index.html:5620](../../index.html#L5620), [index.html:5647](../../index.html#L5647), [index.html:5657](../../index.html#L5657).

Plants, petal paths and butterfly choreography are deterministic functions of loop position. Blood/material simulation uses a seeded random stream and fixed time steps; seeking backward replays it. This is the appropriate basis for reproducible film capture: [index.html:5564](../../index.html#L5564), [index.html:5700](../../index.html#L5700).

| Native motion | Loop | Actual motion | V3 use |
| --- | --- | --- | --- |
| Breathe | 8 s | Restrained sway and a slow breath | Opening tension or final portrait |
| Creep | 16 s | Staggered growth, blooming and retraction | Coil/glyph abstraction becoming alive |
| Bloom & fall | 12 s | Buds swell/open, petals release, flowers fold again | Rich petal architecture and beauty |
| Wither | 26 s | Top-down drain; rose bow/shrivel/curl; leaf yellow/brown/curl/fall; umber/ash canes; dead hold, retraction and regrowth | Exposed structure, then a genuinely native return |
| Gust | 9 s | A wind front crosses the words, bends foliage and tears petals into flight | The film's main rupture and directional transition |
| Bite | 14 s | Visitor lands/feeds/leaves; native liquid response, gentle camera push and eventual liquid fade | A brief consequential wound |

Loop definitions: [index.html:446](../../index.html#L446). Growth/bloom scripts: [index.html:5832](../../index.html#L5832). Wither: [index.html:5864](../../index.html#L5864). Gust: [index.html:5932](../../index.html#L5932). Bite: [index.html:5975](../../index.html#L5975).

Wither is more than an opacity fade: color, posture, size and leaf curl change. About seven in ten dry leaves detach; petals and leaves have deterministic falling paths: [index.html:2341](../../index.html#L2341), [index.html:5890](../../index.html#L5890), [index.html:5894](../../index.html#L5894). Gust is likewise actual deformation and petal release, not a generic particle overlay: [index.html:5947](../../index.html#L5947), [index.html:5955](../../index.html#L5955).

The native poster fits the full garden within a square 1080 stage, with a margin and a scale floor. V3's 16:9 film composition will be a deliberate camera interpretation of that actual artwork, not an alteration to the user's poster mode: [index.html:445](../../index.html#L445), [index.html:5793](../../index.html#L5793). Macro crops are intentional; the final planted identity must remain readable and complete. Bite's native camera is only a restrained push and drift: [index.html:5991](../../index.html#L5991). More forceful travel belongs to the film adapter.

## Existing film work and V3's distinction

V1 is already a 26⅔-second, ten-bar 90-BPM film. Its opening uses a butterfly/bite/impact reveal; the middle cycles Ink/Paper/Linen/Wax and seven looks, then silver ichor, Wither, rebirth and a typed Type Garden ending. Its pipeline uses seeded browser scenes, native fixed-step simulation, Canvas camera crops, original synthesized music, diagnostic frames and cached clips: [V1 timeline](../timeline.json), [V1 README](../README.md). V1's README explicitly records that a full film render had not been made at that stage.

V2 is **A Beautiful Wound**, also 26⅔ seconds at 90 BPM. It concentrates on one rose and visitor, suspended drop, native impact, retained stain, continuous retreat, butterfly departure and still ROSE GARDEN portrait. It intentionally omits title typing, materials, palette cycles, Wither and regrowth. It is a 540-square review cut, with a CLI rejecting `--full`: [V2 timeline](../v2/timeline.json), [V2 README](../v2/README.md). Its time dilation and one-bead choreography are film interventions; native impact/stain production remains the application renderer.

V3 should not stretch either film or reassemble their feature sections. **TENDER VIOLENCE** makes the botanical-letter organism the subject. Its arc is glyph/coil abstraction → blooming richness → a brief visitor/wound/liquid beat → native Gust petal rupture → hard match cut into Mourning → Wither skeleton → regrowth and crimson crescendo → planted name. Two looks and a 16:9 composition give the film a stricter visual premise; a 40-second musical form gives it space for escalation and release.

The main underused source behavior is Gust. It supplies fast real directional energy absent from V2, and its stripped petals can conceal a cut without inventing a plant behavior. Over/under coil tightening, rose macro architecture and the native skeleton are the other distinguishing subjects. A knot or revision scar is available as a precise detail, but does not need a feature explanation.

## Provenance, documentation discrepancies and production limits

The project explicitly credits **Akshat Agarwal** with the original Type Garden concept, design and mechanics, and describes this repository as an adaptation using new standalone rendering, typography and botanicals: [README.md:5](../../README.md#L5), [README.md:11](../../README.md#L11), [README.md:16](../../README.md#L16). The README's License section states distribution for creative and educational exploration: [README.md:126](../../README.md#L126). This research reports that repository provenance; it does not independently establish a different license or authorship claim.

The requested film credit is exact, and already appears in V2's timeline:

> Based on an original concept by Akshat Agarwal  
> Reimagined and expanded as Rose Garden

The final identity is **ROSE GARDEN**. No substitute credit or generic copyright line should obscure that wording.

Observed documentation discrepancies:

1. [README.md:61](../../README.md#L61) says botanicals do not affect the poster, and [index.html:1183](../../index.html#L1183) retains an older comment with the same implication. The current implementation forwards `bots()` into the isolated stage and renders with `vine:true`: [index.html:5598](../../index.html#L5598), [index.html:5647](../../index.html#L5647). Current poster behavior therefore **does inherit** customized botanicals. The later Poster Mode documentation also says it follows them: [README.md:107](../../README.md#L107).
2. README describes automatic visitors as arriving while typing, but the customized implementation schedules them during quiet periods, with a 9–18-second wait when there is a free live perch: [index.html:2136](../../index.html#L2136). Baseline has a separate typing-triggered visitor chance: [index.html:2786](../../index.html#L2786).
3. The older TypeScript app's fonts, camera model and 1.2-second all-word bloom trigger differ from the current standalone app. Current film work must follow the inline implementation, not extrapolate from `src/config.ts`.
4. “3D modeled rose” describes the bloom's projected construction. It does not mean the entire garden supports a free 3D camera orbit.

Production constraints for V3:

- Keep all new research, timeline, adapter, review media and caches under `film/v3/`. Leave app source, V1 and V2 intact.
- Use the actual app's plants, letters, roses, butterfly, drops and motion scripts. Film additions may control framing, retiming, cuts, typography presentation, sound and finishing; record those additions as such.
- Preserve semantic truth: no smooth font morph claimed as built-in, no water/cloth/wax geometry invented, no arbitrary 3D plant orbit, no liquid traveling outside native ink/material rules unless clearly a film transition.
- Keep native simulation history for liquid and pose caches. Warm/replay a scene to a sample time; do not assume a stateless screenshot reconstructs blood history.
- Treat the draft, source keyframes and timing animatic as review artifacts. They demonstrate composition and pacing; they do not authorize an expensive final render.
- The direction is chosen: TENDER VIOLENCE, 40 seconds, 16:9, 96 BPM, Crimson gothic and Mourning. The review should assess that direction's actual imagery, scale, transitions and rhythm, rather than select among safe alternatives.
