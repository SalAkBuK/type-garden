# Rose Garden — Version 3

**TENDER VIOLENCE** — an art-directed 40-second brand-film proposal.

Start with [review.html](review.html). The [storyboard](storyboard.md) defends the direction and defines every shot, camera, transition and sound cue. The [research](research.md) and [renderer notes](renderer-notes.md) document the current app and previous film work.

Review artifacts:

- [40-second timing animatic with original audio sketch](output/rose-garden-v3-timing-animatic.mp4)
- [Actual-renderer storyboard contact sheet](output/storyboard.png)
- [27 native keyframes](output/keyframes/)
- [Timeline and technical validation](output/qa.json)
- [Preservation verification](preservation-check.json)

The animatic is a timed sequence of native rendered stills at 960 × 540 / 24 fps, not a continuous motion draft or a final film. The proposed final is 16:9, 3840 × 2160 / 60 fps: exactly 40.000 seconds and 2,400 frames, 96 BPM / 16 bars. Only Crimson and Mourning looks are used. Exact attribution is carried in the end frame.

All new code and output live here. The application, V1 and V2 are untouched. The V3 preservation tool maintains its own immutable selective baseline; do not use V2's sibling-sensitive preservation command to evaluate V3.

Reproduce the inexpensive review artifacts from the repository root:

```powershell
node film/v3/tools/keyframes.mjs
node film/v3/tools/audio.mjs
node film/v3/tools/review.mjs
node film/v3/tools/preserve.mjs verify
```

These tools cannot perform a 4K final render. `--full` is rejected. A new continuous motion draft follows creative review; expensive final production follows review of that motion draft.
