# Manual checks — Rotating a Tesseract in Perspective (`demos/tesseract-perspective/`)

Each item compares the original in Mathematica with the port, as an operator procedure (rule 8); the general
procedure is in [`docs/MATHEMATICA_CHECKS.md`](../MATHEMATICA_CHECKS.md). Record every result in the test-run file
`_internal\test-runs\<YYYY-MM-DD>_tesseract-perspective.md` (create it with `npm run test-run -- tesseract-perspective`). Item M-TT-03
settles what only a person can see in Mathematica: the look of the tubes (round ends, highlights, shading).

Original notebook (all items): `_internal\originals\wolfram-2026-11-17\RotatingATesseractInPerspective.nb`.
Port (all items): `http://127.0.0.1:8080/demos/tesseract-perspective/` (after `npm run serve`).

### M-TT-01 Texts
**Open** — `_internal\originals\wolfram-2026-11-17\RotatingATesseractInPerspective.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing; scroll to the title.
**Do** —
1. Compare title and caption with the port's; the original has no details text.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_tesseract-perspective.md`, under the heading M-TT-01: per text: "same" or the differing words.
**Save** — File > Close, Don't Save.
**Port** — the page's caption, `details` and `credits`.
**Expected / what it decides** — identical title and caption (F-TT-09); the Details are the port's own description.

### M-TT-02 Opening picture
**Open** — `_internal\originals\wolfram-2026-11-17\RotatingATesseractInPerspective.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — do not touch any control.
**Do** —
1. Compare the picture (two nested cubes joined at the corners, the view direction, the size in the image) and the value beside **rotate** (0) with the port's opening page.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_tesseract-perspective.md`, under the heading M-TT-02: per difference: what, where.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — the same picture and value (F-TT-05, F-TT-06).

### M-TT-03 Tubes: round ends and highlights
**Open** — `_internal\originals\wolfram-2026-11-17\RotatingATesseractInPerspective.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — do not touch any control.
**Do** —
1. Zoom into the picture (Mathematica: none needed; the port: browser zoom 200 %) and look at a corner where three tubes meet and at a long vertical tube.
2. Note the shape of the tube ends (round or flat) and where the white highlights lie on the vertical tubes (left, centre or right of the tube's middle).
3. Compare how dark the side of the tubes turned away from the light is.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_tesseract-perspective.md`, under the heading M-TT-03: tube ends: round or flat; highlights: position; dark sides: darker, the same or lighter in the port.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — round ends, highlights at the same places; the dark sides about as dark (D-TT-01, D-TT-03, K-TT-01).

### M-TT-04 The slider "rotate"
**Open** — `_internal\originals\wolfram-2026-11-17\RotatingATesseractInPerspective.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing.
**Do** —
1. Drag the slider **rotate** slowly from the left end to the right end; watch the two cubes exchange places at about the middle (π).
2. At the right end, read the value beside the slider.
3. Click the slider's knob and press the right arrow key once; read the value.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_tesseract-perspective.md`, under the heading M-TT-04: per step: "same" or the difference; the two values read.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page (the arrow key on the focused slider).
**Expected / what it decides** — the same motion; the value at the right end 6.2832; one arrow-key step changes the value by 0.0001 (F-TT-01, Q-TT-01).

### M-TT-05 The snapshots' settings
**Open** — `_internal\originals\wolfram-2026-11-17\RotatingATesseractInPerspective.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing.
**Do** —
1. Click ⊕ beside the slider to show its value field; type 3.8830085198369844 and Enter; compare the picture with snapshot 2 of the notebook.
2. The same with 0.9927432785343746 (snapshot 3) and 4.184601414581604 (snapshot 4).
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_tesseract-perspective.md`, under the heading M-TT-05: per snapshot: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page (the value field is always shown).
**Expected / what it decides** — the pictures of snapshots 2, 3 and 4 (F-TT-07).

### M-TT-06 Animation of the slider
**Open** — `_internal\originals\wolfram-2026-11-17\RotatingATesseractInPerspective.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing.
**Do** —
1. Click ⊕ beside the slider; click the play button; let it run for about 10 s; click it again to stop.
2. Click the step-forward and step-back buttons once each and read the value.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_tesseract-perspective.md`, under the heading M-TT-06: the value after 10 s of play (roughly); the value after each step.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page (`plus-a`, `play-a`, `stepfwd-a`, `stepback-a`).
**Expected / what it decides** — the tesseract turns while playing; a step changes the value by 0.0001 (F-TT-02; the speed of play may differ, D-TT-04).

### M-TT-07 Mouse rotation of the picture
**Open** — `_internal\originals\wolfram-2026-11-17\RotatingATesseractInPerspective.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing.
**Do** —
1. Drag inside the picture from its centre to the right by about a quarter of its width.
2. Move the slider; check that the view direction you set stays.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_tesseract-perspective.md`, under the heading M-TT-07: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — the picture turns with the mouse; the slider leaves the view direction as it is (F-TT-08).

### M-TT-08 Initial settings
**Open** — `_internal\originals\wolfram-2026-11-17\RotatingATesseractInPerspective.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — move the slider away from 0.
**Do** —
1. ⊕ (top-right) > **Initial Settings**; on the port, **Initial settings**.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_tesseract-perspective.md`, under the heading M-TT-08: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — both return to the opening picture, a = 0 (A-TT-01).

### M-TT-09 The page works on its own
**Steps** — open the port's page; move the slider; drag the picture; press **Initial settings**.
**Record** — anything that does not respond, or an error message on the page.
**Expected** — the slider turns the tesseract; Initial settings restores the opening picture (A-TT-01).

### M-TT-10 Narrow window
**Steps** — make the browser window about 360 px wide (or use a phone); use the slider and drag the picture.
**Record** — anything cut off, overlapping or not reachable.
**Expected** — the page stays usable; the picture scales down with the window.
