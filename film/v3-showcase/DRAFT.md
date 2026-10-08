# Rose Garden showcase — draft 4

SAME WORDS, MANY WORLDS. Review-resolution continuous film with sound: 960 × 540, 30 fps, 38.000 seconds, 1,140 frames. The expensive master has not started.

Open `output/draft/review.html` for the video, contact sheets, twelve encoded keyframes, aspect diagnostics, sound cues and QA. The film is `output/draft/draft.mp4`.

The entire letter-material showcase is removed. There is no replacement feature demonstration. Seven seconds were removed; five were returned to the existing butterfly/blood consequence, stronger color/font worlds, botanical build and final identity. The result is two seconds shorter.

| Frames | Time | Passage |
| --- | --- | --- |
| 0–167 | 0.00–5.60 s | Preserved real UI hold, immediate typing, native growth and matched stage handoff |
| 168–287 | 5.60–9.60 s | Preserved living words, botanical camera travel and restrained rose beauty shot |
| 288–509 | 9.60–17.00 s | Butterfly / bite / bead / fall / blood. Contact and impact cues preserved; blood consequence and retreat extended by 0.50 s |
| 510–704 | 17.00–23.50 s | Five anchored Looks. Ivory, Old rose and Silver hold for 1.50 s each; Pink & black and Black rose for 1.00 s each |
| 705–869 | 23.50–29.00 s | Cormorant and Bodoni hold 1.50 s each, Unifraktur 1.00 s, cobalt/champagne 1.50 s. The phrase stays wide; the same native plants recolour into crimson |
| 870–989 | 29.00–33.00 s | Continuous growth from the existing garden into abundance, brief peak, recovered phrase and native passing petal |
| 990–1139 | 33.00–38.00 s | Approved lush crimson identity grows and blooms, completes at frame 1033 (34.43 s), settles by frame 1040 (34.67 s), then holds. Exact attribution reaches full alpha at 1070 (35.67 s) |

The application, V1, V2 and Tender Violence are preserved. The approved storyboard, timeline and original still review remain historical source documents; `motion.json` describes the current continuous edit. Draft 3, its source tools and edit are archived in `output/draft-3`. Earlier drafts remain archived.

Native roses, glyphs, butterfly, liquid behavior, plant growth and rendering are unchanged. Only the showcase edit, camera paths, supported native recolour/botanical controls and sound arrangement are adjusted. The former material driver remains available in the tooling for archived drafts, but has no segment in this film.

The native botanical controls begin at the default grown garden rather than returning to nearly bare buds. Growth takes four seconds and eases down after its brief peak. The shared outgoing garden remains under the passing petal and planted title; no empty plate or broad crimson field is introduced. The approved 15% larger identity and secondary 13 px attribution are retained.

Final attribution is exactly:

Based on an original concept by Akshat Agarwal  
Reimagined and expanded as Rose Garden

The existing synthesized review soundtrack follows this edit. Keystrokes, contact, bead release and first impact retain their picture cues. Montage accents, botanical rise and warm title resolve follow the new timing. Material percussion, paper/weave textures, bead/runoff sounds and the push into the material crop are removed. No new sound-event family is introduced. Audio monitoring is unavailable here; sound arrangement and numerical QA do not replace a listening review or establish a finished production mix.

Plan a 16:9 master and a separately reframed 1:1 version. A 9:16 version needs its own native camera pass for the real interface, phrase, butterfly approach, drop and final identity/credit. `ASPECT-PLAN.md` and the current encoded crop diagnostics document those shots. No alternate continuous aspect versions have been rendered.

```powershell
node film/v3-showcase/tools/draft.mjs render
node film/v3-showcase/tools/draft.mjs assemble
node film/v3-showcase/tools/draft.mjs audio
node film/v3-showcase/tools/draft.mjs mux
node film/v3-showcase/tools/draft-review.mjs
node film/v3-showcase/tools/aspect-plan.mjs
node film/v3-showcase/tools/polish-keyframes.mjs
node film/v3-showcase/tools/preserve.mjs verify
```

These tools are restricted to review resolution and reject `--full`. Stop after the review package; master rendering remains for a later approved step.
