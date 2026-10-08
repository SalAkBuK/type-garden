# Type Garden film

Continues the approved storyboard on `realistic-roses` at application HEAD `60cdc764a176e3931a84fb680535868e8d76d1a4`. Application source is unchanged. No fframes or replacement renderer.

`timeline.json` owns the ten-bar / 90 BPM structure, cuts, sound events, text and credit. Exact duration is **80/3 seconds**, displayed as 26.7; 800 frames at 30 fps or 1,600 at 60 fps. **60 fps is selected** after the local motion and cost benchmark. Intermediate Wither frames contain real leaf/petal motion, rather than duplicates.

The original storyboard and five proof tools are preserved byte-for-byte. `reference/` archives the available temporary planning specs, scripts and 112 source files (100 PNGs and 12 HTML sheets), including material, wick, live typing and Wither proofs. Its scripts retain their original paths as historical evidence. `tools/board.mjs` still points to its original temporary source; do not blindly regenerate the approved storyboard.

## Run

Node, local Chrome, ffmpeg and ffprobe are required. Dependencies are isolated under `film/`; the application package is unchanged. On PowerShell with script execution disabled, use `npm.cmd`.

```powershell
npm.cmd install --prefix film
node film/tools/film.mjs timeline
node film/tools/film.mjs frame opening@0 film/output/macro.png
node film/tools/film.mjs frame title@5 film/output/identity.png --full
node film/tools/film.mjs strip wither
node film/tools/film.mjs onion wither
node film/tools/film.mjs render materials
node film/tools/film.mjs draft
node film/tools/film.mjs draft --fps=30
node film/tools/film.mjs audio-analysis film/output/soundtrack.wav
node film/tools/film.mjs inspect film/output/draft-60.mp4
node film/tools/diagnostics.mjs 60
node film/tools/benchmark.mjs
node film/tools/cue-probe.mjs
```

`scene@time` uses seconds local to that scene. Single-frame inspection replays from scene start, preserving simulation and cache history. `strip` and `onion` use scene clips. Draft is 540 square, from the real 1080 stage. `--full` uses 1080 output from a 2160 stage and 2× type-view canvas. `--gpu` requests the locally verified RTX adapter; default software capture is slightly faster for this readback-heavy draft workload. Set `FILM_CHROME` to override the Chrome executable path.

Every scene starts in an isolated seeded browser with manual time. The existing stage owns fixed-step blood/material simulation, deterministic plants and Wither. The final scene uses the app's real `add`, `keyEvent`, `frame`, `paint` and pause sprouting; its internal clock advances at 60 Hz. The pause is accelerated as in the approved proof. Film layers add camera crops, a fibrous bottom-up page wick, light deterministic encoding grain and the tiny original-author credit.

Scene cache keys include application HTML, adapter, timeline, dimensions, fps and GPU mode. Original images and existing cache entries are never overwritten by a new key. Incomplete scenes lack a completion manifest and are rendered again. Output and cache are ignored by Git; archive them separately if moving machines.

## Inspection

`output/draft-60.mp4` is the current draft, with original synthesized music and sound design. `contact-60.png` summarizes it. `cues-60.png` shows the frames before, at and after events. Full-size diagnostic stills are `macro-full.png` and `identity-full.png`.

Open `output/review.html` for video playback, scene seeking, matched 30/60 fps Wither samples and links to the diagnostics. `review-summary.json` records the selected frame rate, measured renderer costs and current QA results. Regenerate these with `node film/tools/review.mjs` after inspection.

`qa-60.json` checks decoded frame count, frame-grid timing, renderer-state Bite/first-splash alignment, exact raw-frame duplicates, encoded black/freezedetect events and measured audio loudness/true peak. `inspection-60.log` includes per-frame signal statistics. Audio is normalized in two passes; measured AAC output is the delivery check, rather than an assumed limiter setting.

`diagnostics-60.json` measures seams and compares re-rendered original proof specs against preserved images at 540 square. `diagnostics-60/dark-gradient.png` enlarges an encoded dark crop for visual banding review. Large differences at palette hard cuts are intentional. The Wither → wick seam preserves the dead structure. Exact duplicates during the dead hold are intentional; the low-motion detector also flags quiet growth and palette holds. Review these in scene context, rather than treating all freeze warnings as broken frames.

The eight world hits remain primarily palette changes. The approved optional density/font accents are preserved in the storyboard/reference proofs but omitted from this first motion draft to keep the composition locked. Material shots replay the same splash experiment through each real material, showing wet surface trails, capillary absorption, weave-directed soaking and wax beads.

The original storyboard's labels round bar times and describe wax as “held two beats,” while its four material starts at 5.3 / 6.0 / 6.7 / 7.3 and world start at 8.0 allocate one beat to wax. This implementation follows those approved cut positions; it does not extend or shift the ten-bar sequence.

No full film render or commit has been made. The draft, scene clips, cue sheet, diagnostics and benchmark are the pre-render review artifacts.
