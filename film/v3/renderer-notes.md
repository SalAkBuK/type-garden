# Rose Garden V3 renderer research

Direction: **TENDER VIOLENCE**. 40 seconds, 16:9, 96 BPM: 64 beats, 16 bars, 0.625 seconds per beat. The progression is abstract coil -> unfurl -> wound -> Gust -> bone / Wither -> regrowth -> identity. Crimson and Mourning are the only looks. This document records source research and a proposed film implementation; it does not imply that a draft or final film has been rendered.

## The actual application

The current full artwork renderer is the inline `TypeGardenApp` in [`../../index.html`](../../index.html), mirrored in [`../../type_garden.html`](../../type_garden.html). Both files had SHA256 `3E8CBF8A378DDEA1765A1DD9BEB594562EC806A69CF3695E1F08A8334BECE302` when researched. The Vite proof in `src/renderer.ts` predates the standalone application's advanced roses, writing record, materials and poster scripts. Use the standalone renderer.

The renderer is an illustrated 2.5D composition. Its rose petals have projected 3D geometry and depth sorting; its whole garden is a Canvas scene. A free camera orbit through a volumetric garden would invent geometry. Truthful film cameras translate, scale and rotate the Canvas scene, or track points on native anatomy. The clean shaded curves and precise graphic edges visible in the existing reference sheets are the visual character to preserve.

All V3 output and new tools belong under `film/v3`. Research found no applicable `AGENTS.md` in the repository or inspected ancestors. Do not modify either standalone application, the Vite sources, V1 or V2.

## Native visual vocabulary

Source locations below refer to `index.html` as researched.

| Element | Actual implementation | Film use |
| --- | --- | --- |
| Letter and coil | `glyph` at line 3527 scans the active font on a hidden Canvas; `climbTrack` at 3549 traces the tallest continuous stroke; `genWrap` at 3575 builds a helical vine around it, switching front/back layer on each turn. | Make a glyph curve feel like an enormous white landscape before the camera reveals its letter. Follow the coil's actual path. |
| Coil tightening / braid | `wrapLoose` at 3151 contracts the initial loose wrap after growth. `genWrap` at 3641 can add a slimmer counter-rotating braid. | A contraction provides a forceful rhythmic accent without an invented interaction. |
| Cane and searching tip | `searchTip` at 3772 bends a still-growing tip into a hook. `drawStemCustomized` at 3783 tapers stems, shades their rounded section, adds a lit edge and casts shadows over a letter. | Macro tracking should finish at a thorn or the searching tip; root and shadow make the scale feel tangible. |
| Thorn | `getCustomizedThorns` at 3116, `prickleCustomized` at 3167 and `thornCustomized` at 3242 give canes hooked sharp geometry. Hesitation and rewrite marks retain their larger thorns. | Choose one clear recurved profile rather than a screen of arbitrary spikes. |
| Rose | `bloomState` at 3313 and `roseCustomized` at 3324 model overlapping bud growth, goblet opening and full bloom. Golden-angle petals at 3436 have curved surfaces, rolled pointed lips, reverse colour, upper-left lighting and painter's depth order at 3490. Full blooms tilt toward the viewer at 3359. | The rose can change from a teardrop to a cupped side profile to a face-on spiral; let that real morphology drive the shot. |
| Leaves | `leafCustomized` at 3271 draws a stalk, opposing toothed leaflets and a terminal leaflet. `drawElCustomized` at 3854 releases newly grown leaves from a curl after the vine reaches them. | Use an unfolding leaf as a brief secondary rhythm; roses remain the focal form. |
| Floral composition | Hero flowers start each word in `gen` at 2848; `genCluster` at 3678 adds their companions. `separateRoses` at 2466 moves newcomers by bending connected stalks. `coverGuard` at 2549 preserves glyph readability. | Keep a deliberate large-to-small hierarchy. Native spacing must settle before recording camera anchors. |
| Layering | `drawRearRoses` at 5373 and `drawFrontPlants` at 5384 prevent late stems/leaves crossing bloom heads; glyphs can remain in front of rear blossoms. | Maintain real occlusion in macro shots; this is part of the design, not a compositing error. |
| Butterfly and bite | `butterflyNoir` at 2103 has velvet wing gradients, coloured margins/veins/spots and foreshortened wing beats. `biteRose` at 4053 starts real droplets and `bloodStep` at 4099 advances them onto actual glyph ink. | Transfer attention from wingbeat to hanging liquid, falling liquid and the consequence on the letter. |
| Fluid liquid | Fluid implementation begins at 4317; `tracePath` at 4379 follows ink; `flowRun` at 4419, `beadShape` at 4441 and `paintRun` at 4507 implement wandering rivulets, pooling, bead necks, wet merging and drying. | Choose a real native drop-to-serif encounter. Retiming a measured native trajectory is valid; drawing a replacement animated droplet is not. |
| Material | Definitions at 597; material behavior at 4599. Ink retains liquid; blotting absorbs along fibres, linen absorbs on a weave; `beadTick` at 4910 merges/slides/hangs/drops wax beads. | Material research informs the wound's tactile detail. This direction does not require a four-material comparison. Ink + Fluid is a strong clear wound on white Crimson lettering. |
| Writing record | `keyEvent` at 2255, `checkSprout` at 2265 and `bloomAge` at 2352 make earned blooms open only in stillness. `genMarks` at 2658 adds prickly hesitation loops and cut woody rewrite stubs. | An optional knot/scar macro may add history, but should not make this film a typing demonstration. |
| Withering | `wither` at 2326, `leafPose` at 2342, `witherBow` at 2347 and `scriptWither` at 5868 bow/shrink/darken flowers, yellow/brown/curl leaves and drain canes to umber/ash. `stageDeadFall` at 5896 sheds dry petals and leaves. | A top-down loss of colour and structure creates the rupture. Mourning supplies a bone page and dark silhouettes; the native dying ramps supply the loss of life. |

## The two looks

The presets are defined at line 493 and selected by `setLook` at 994. `setAppearance` at 1016 recolours without changing plants, writing records, bloom clocks or placement.

| Look | Native values / finish | Role in this film |
| --- | --- | --- |
| Crimson gothic | Black page `#000000`, white letters `#FFFFFF`, crimson rose body `#AC0818`, blood `#960A16`, green vines `#1D4C28`, black butterfly with crimson markings; faint red glow. | Dense velvet darkness, living sculpture, wound and restored final garden. |
| Mourning | Bone page `#ECE5D8`, black letters `#0E0B0A`, black velvet roses `#3A0810`, glossy red blood `#CC1222`, green vines; soft warm page light and lighter cast shadows. | A hard editorial turn into pale space, dark rose silhouettes and exposed structure. |

Do not label the looks in the film. The switch should feel like a change of dramatic state, with a composition or silhouette carried across the cut. Native Wither has its own dying colours: Mourning is not a fake desaturation filter.

## Native motion timings and useful phases

The `MOTIONS` table at line 460 supplies the native periods. `stageScene` at 5727 converts loop phase to a script; source behavior can be sampled or retimed into a film shot while keeping the native geometry. The figures below are native timing, not proposed V3 shot durations.

| Motion | Native duration | Native choreography / phase landmarks |
| --- | --- | --- |
| Breathe | 8 s | `scriptBreathe`, 5835: full-grown garden, one slow cycle. Height-dependent sway is approximately `0.034 * S` in x and `0.008 * S` in y; flower rotation approximately 0.06 rad. Useful for almost-still identity. |
| Creep | 16 s | `scriptCreep`, 5849: full age multiplied by a sweep: 0.50 rise, 0.12 hold, 0.28 fall, 0.10 rest. Each letter is delayed across a 0.34 phase span. Per letter this is 8 s growth, 1.92 s hold, 4.48 s retraction, 1.6 s rest; full stagger spans 5.44 s. Useful for coil emergence and return. |
| Bloom & fall | 12 s | `scriptBloom`, 5855: each bloom has up to 0.30 deterministic phase offset; rose age sweeps 1500 -> 5900 ms using 0.34 rise / 0.34 hold / 0.26 fall. `stagePetals`, 6020, releases 4 petals per full rose or 2 per other open rose starting at phases 0.36-0.56; fall lives 5.2-6.6 s. |
| Wither | 26 s | `scriptWither`, 5868: slight letter stagger `0.012 * index`; `witherTiming`, 5879, starts near phase 0.04 plus 0.30 by vertical position and up to 0.03 seed jitter. Roses die over 0.20, leaves over 0.22, stems over 0.30 with an extra 0.05 delay. `witherLife`, 5876, holds structure until phase 0.80 (20.8 s), retracts it to zero by 0.86 (22.36 s), then regrows to the end. `leafLetGo`, 5891: about 70% of dry leaves release, each near 90-98% of its individual death. |
| Gust | 9 s | `scriptGust`, 5934: strength rises during phases 0.04-0.14 and dies during 0.70-0.82. `gustFront`, 5954, traverses from beyond left to beyond right between 0.06 and 0.74. `gustWarp`, 5949, bends higher parts more. `stageBlownPetals`, 5956, tears 5 petals from each full bloom or 3 from other open roses, with fast horizontal paths, spin and flip; lives 3.2-4.4 s. |
| Bite | 14 s | Clock runs at 2x. Bite occurs at phase 0.26: 3.64 s loop time. `bfly`, 6041: arrival 0.04-0.20 (0.56-2.8 s), perch 0.20-0.36 (2.8-5.04 s), departure 0.36-0.48 (5.04-6.72 s). `scriptBite`, 5977, holds blood to 0.80, then fades it to 0.95. `stageCamera`, 5995, supplies only a restrained native 1.15x maximum push; V3 may use separate cinematic Canvas camera transforms. |

Individual rose state in vine mode (`bloomState`, 3313): swell 0-1450 ms, opening 650-3850 ms, full-bloom change 2550-5900 ms, sepal release 350-1900 ms. These clocks describe real rose deformation, not merely scale-up. Native poster `POSTER.age` is 13000 ms.

## Determinism and isolated film stages

`makeStage` at 5598 uses `Object.create(this)` and assigns independent letters, flowers, stains, drops, bites, randomness and clock. It explicitly delegates `theme`, `bots` and `bot0` to the application. The current poster therefore **inherits botanical settings**; a stale README assertion that the poster is unaffected must not guide implementation. `stageRender` at 5648 passes `vine: true`, and `cur` at 1184 consequently reads the inherited `bots`.

`stageWrite` at 5621 writes through the same `add` / `keyEvent` path as interactive typing, with 170 ms character gaps and 1500 ms word gaps. `add` at 2749 seeds ordinary letters from the exact text prefix plus a salt. `makeStage` stores the seed as `_salt`; `seedOf` at 2292 retains per-letter seed streams for typeface refits. The opening `in bloom` has a separate fixed seeded composition (`seedOpening`, 5575).

`stagePrepare` at 5660 grows native coils, marks, earned blooms and clusters, settles rose spacing, and records `anchors`, `roseEl`, and `collect`. It chooses a bite target from open blooms near the middle with glyph ink below. Anchor coordinates should be measured after this preparation, with the final text, seed, font, botanical settings, fill and leading already applied.

Most scripted motions are functions of loop phase. Blood is simulated: `stageReset` at 5699 resets its seeded source; `stageSeek` at 5709 advances in fixed 1/60-second simulation steps, with time scaled by `m.clock`, and resets on backward seek. A film may map time to measured simulation time, but must keep stain/drop state and trajectories from this engine. Carry a selected full rose's logical ID across Crimson/Mourning colour changes; only the cache's paint changes.

## Native macro anchors to select

No new captures were made for this research. The following selectors derive camera subjects from existing native stage state rather than drawing substitutes.

1. **Wound rose:** V2 records the proven candidate `67925899.2` for `ROSE GARDEN`, seed 7, Playfair, fill 0.62, leading 1.65 (`../v2/timeline.json:7`). Its adapter evaluates actual native bite -> bead -> release -> impact tracks (`../v2/tools/renderer.mjs:48`). This is a useful initial candidate, not a guaranteed V3 coordinate: a new layout can change where the drop hits. Select from `s.anchors` + `s.roseEl`, reject buds, require `inkBelow`, then simulate candidates and prefer a long unobstructed fall onto a readable serif. Record the exact ID and measured cues in V3 metadata.
2. **Coil:** after `stagePrepare`, inspect each visible letter's `wrapEls` for `t === 'stem'`, `main`, and preferably a second `wrap` stem. Use `e.pts` / `e.nW` plus letter origin and `s.St`: `x = l.x + pt[0] * S`, `y = l.y + pt[1] * S`. For growth phases, apply `wrapLoose` and `searchTip` through the native renderer rather than tracing a surrogate. Prefer a tall straight stroke on R, G, D or N, front/back transitions and a detached free tip. Hide readability by crop, not by replacing the glyph.
3. **Rose spiral:** use a prepared `anchors[id]` centre, radius and stage, paired with `roseEl[id]`. The visible centre is the anchor's `x/y`, while the receptacle and growth direction are available in `collect.roses[id]` (`px`, `py`, `aim`, `bx`, `by`, `R`, `stage`). Anchor the camera to the actual head, not `e.x/e.y` alone, because a tilted flower's head is offset from its stalk.
4. **Thorn:** select a visible front-pass stem in `wrapEls` or `markEls`; choose one of `getCustomizedThorns(e)` for which `layerAt(e.segs, th.u) === 1` and `thornOn(e, th, s.cur())` passes. Its root comes from `s.at(e.pts, th.u)`, transformed through the same native `wpt`. Hesitation/rewrite thorns are larger but require a genuinely authored writing record; ordinary prickles are sufficient if no such record is in V3.
5. **Dead structure:** use `collect.roses` and `collect.leaves` prepared before death, and native `drain` / `gone` options. A coil still wrapped around a black glyph on the bone page can retain composition across the death event. Keep at least one fine terminal tendril visible as a graphic counterpoint.

One primary coil and one primary rose should recur across the film. Secondary macro shots should share their curve direction, light side or diagonal, so cuts feel designed rather than like a catalogue.

## Sharp caches and exact poses

`roseSprite` at 3946 reads the current Canvas transform scale, sizes its bitmap for that scale, and marks a pose due when scale, size, age, rotation or colour key changes. Opening roses blend two nearby poses to keep live interaction responsive; settled roses retain a bitmap. Withering roses draw live because their geometry changes (`roseCustomized`, 3410). The source can therefore remain sharp in a genuine enlarged macro.

`renderCustomized` at 5423 sets `_throttle = !state.busy`. On an isolated offline stage, `state.busy = true` avoids live pose rationing and requests exact native pose painting. Do not change live application state permanently. `stampPlants` at 3726 has a small live per-frame cache budget; V2's stage-local wrapper explicitly invalidates foliage caches when camera scale changes and allows an unlimited offline budget (`../v2/tools/renderer.mjs:36`). V3 should provide its own equivalent wrapper under V3, or deliberately render those native plants live.

Warm the actual requested shot scale/state before accepting draft stills. `stageWarm` at 5825 renders twelve start frames; a V3 warm-up may similarly prepare the relevant scene. A warm-up is not a final render. Record source size, output size, camera transform and any retimed native phase alongside review stills.

## Composition and truthful film choices

- Start tightly enough that the white letter and green helix are recognizable as shapes, not as readable title text. The reveal should disclose something viewers have already been seeing.
- Maintain the actual upper-left light direction through camera cuts. Canvas rotations rotate the light with the artwork; do not add unexplained moving 3D lighting.
- Make the unfurl shot large and slow enough to show the real goblet-to-face transformation. Avoid reducing every sequence to a push-in.
- Let the wound occupy a concise, consequential passage. V2 already explored the long suspended-drop portrait; V3 needs the Gust / Wither rupture and return to justify its larger scope.
- Use the native Gust's petal direction as the cut direction into Mourning. Avoid generic particles, UI panels or stock gradients.
- In the bone passage, frame air and thin canes as deliberately as the earlier blooms. A strong dead silhouette is more memorable than full-frame noise.
- Regrowth should rebuild the same seeded identity; a changed composition must be a deliberate separate shot, not accidental reseeding.
- End on the native planted **ROSE GARDEN** with a settled camera and adequate reading time. Attribution must read exactly: `Based on an original concept by Akshat Agarwal` and `Reimagined and expanded as Rose Garden`.
- Keep the application and prior film work unchanged. Do not execute the expensive final render before the draft is reviewed.
