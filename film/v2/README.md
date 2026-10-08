# ROSE GARDEN — Version 2

**A Beautiful Wound**: one encounter, one drop, one lasting stain.

This directory is separate from Version 1. The application and all existing Version 1 files are preserved. The existing Node / Playwright / ffmpeg pipeline is reused; there is no fframes dependency, application rewrite, or final-resolution render.

The review cut is square, 540 × 540, 60 fps, exactly 1,600 frames. Its 40 beats at 90 BPM last 26⅔ seconds, displayed as 26.7 seconds. Software Chromium was the faster visually equivalent capture path in the existing benchmark.

| Time | Passage |
| --- | --- |
| 0–2.67 s | Wing and petal macro; identity withheld |
| 2.67–5.33 s | One rose, butterfly, and wound; Bite at 4.00 s |
| 5.33–9.33 s | Suspended blood in a clear gap above the serif |
| 9.33–10.67 s | Native liquid impact, splash, and stain |
| 10.67–18.67 s | Continuous retreat; the planted name resolves from darkness |
| 18.67–22.67 s | Butterfly departs; camera settles |
| 22.67–26.67 s | Still crimson brand portrait; small credit appears at 24.67 s |

Version 2 deliberately gives the encounter its own timings, independent of Version 1. There is no title typing, material demonstration, palette cycling, Wither, or regrowth in this cut.

## Review artifacts

- [Draft cut](output/rose-garden-v2-draft.mp4)
- [Keyframe contact sheet](output/contact-sheet.png)
- [Individual keyframes](output/keyframes/)
- [Contact sheet sampled from the draft](output/draft-contact-sheet.png)
- [Encoded diagnostics](output/diagnostics/)
- [QA report](output/qa.json)
- [Design score](output/design-score.wav)
- [Version 1 preservation check](preservation-check.json)

The soundtrack is an original synthetic design score for reviewing the arc and the physical accents. It thins around the suspension, gives the impact body, opens with the retreat, and decays into the still portrait. It is a draft score, not a finished music production. Loudness and true peak are measured on the muxed draft.

The final attribution is exactly:

> Based on an original concept by Akshat Agarwal  
> Reimagined and expanded as Rose Garden

## Pipeline

Run from the repository root:

```powershell
node film/v2/tools/film.mjs timeline
node film/v2/tools/film.mjs keyframes
node film/v2/tools/film.mjs frame suspension@1.67
node film/v2/tools/film.mjs strip suspension
node film/v2/tools/film.mjs onion impact
node film/v2/tools/film.mjs render reveal
node film/v2/tools/film.mjs draft
node film/v2/tools/film.mjs inspect
node film/v2/tools/film.mjs audio-analysis
node film/v2/tools/preserve.mjs verify
```

`timeline.json` holds the scene boundaries, beat grid, physical event cues, identity, and proof frames. Scenes render independently and cache under this directory. The CLI rejects `--full`: this version is for review before an expensive final render.

`tools/renderer.mjs` reuses the existing deterministic browser bootstrap without writing to Version 1. The actual application draws every rose, vine, thorn, letter, butterfly, drop, spray, and stain. Film-only work controls framing, leading, lighting, one-bead emission, and time dilation. Slow-motion positions are interpolated between samples of the native blood trajectory; impact and stain generation remain native.

QA distinguishes the intentional still ending from unintended freezes, verifies physical cue frames and the retained wound, checks scene seams, compares draft frames against the contact sheet, measures audio, and exports encoded gradient diagnostics. These proofs await creative review; they are not labeled approved frames.
