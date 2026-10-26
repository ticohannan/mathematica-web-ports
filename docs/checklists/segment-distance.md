# Manual checks — Shortest Distance between Two Line Segments (`demos/segment-distance/`)

Each item compares the original in Mathematica with the port, as an operator procedure (owner rule R-B); the general
procedure is in [`docs/MATHEMATICA_CHECKS.md`](../MATHEMATICA_CHECKS.md). Record every result in the test-run file
`_internal\test-runs\<YYYY-MM-DD>_segment-distance.md` (create it with `npm run test-run -- segment-distance`).

Original notebook (all items): `_internal\originals\ShortestDistanceBetweenTwoLineSegments.nb`.
Port (all items): `http://127.0.0.1:8080/demos/segment-distance/` (after `npm run serve`).

### M-SD-01 Texts
**Open** — `_internal\originals\ShortestDistanceBetweenTwoLineSegments.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing; scroll to the title.
**Do** —
1. Compare title, caption and Details with the port's.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_segment-distance.md`, under the heading M-SD-01: per text: "same" or the differing words.
**Save** — File > Close, Don't Save.
**Port** — the page's caption, `details` and `credits`.
**Expected / what it decides** — identical texts (F-SD-11); the port adds the StackOverflow reference of the code.

### M-SD-02 Opening picture
**Open** — `_internal\originals\ShortestDistanceBetweenTwoLineSegments.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — do not touch any control.
**Do** —
1. Compare the picture and every control's value with the port's opening page.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_segment-distance.md`, under the heading M-SD-02: per difference: what, where.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — the same picture and values: green AB, blue CD, red B to near D, yellow segment with marks, two planes, labels A–D, "minimum distance is 5.51" (F-SD-07, F-SD-08, F-SD-09, F-SD-10); differences of shading listed as D-SD-06.

### M-SD-03 Each control
**Open** — `_internal\originals\ShortestDistanceBetweenTwoLineSegments.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing.
**Do** —
1. Move each control from one end of its range to the other, slowly; note how the picture changes.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_segment-distance.md`, under the heading M-SD-03: per control: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — every control changes the picture as in the original (F-SD-01…F-SD-03).

### M-SD-04 Initial settings
**Open** — `_internal\originals\ShortestDistanceBetweenTwoLineSegments.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — move every control away from its opening value.
**Do** —
1. ⊕ (top-right) > **Initial Settings**; on the port, **Initial settings**.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_segment-distance.md`, under the heading M-SD-04: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — both return to the opening picture (A-SD-01).

### M-SD-05 The page works on its own
**Steps** — open the port's page; move every control once; press **Initial settings**.
**Record** — anything that does not respond, or an error message on the page.
**Expected** — every control changes the picture; a focused z slider moves with the arrow keys; Initial settings restores the opening picture (A-SD-01).

### M-SD-06 Narrow window
**Steps** — make the browser window about 360 px wide (or use a phone); use every control.
**Record** — anything cut off, overlapping or not reachable.
**Expected** — the page stays usable; the picture scales down with the window.

### M-SD-07 Parallel segments and degenerate planes
**Open** — `_internal\originals\ShortestDistanceBetweenTwoLineSegments.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — in both, set the third snapshot's settings: A*xy* (−0.7, 5), B*xy* (5, 5), C*xy* (−5, −5), D*xy* (5, −5), A*z* = B*z* = 5, C*z* = D*z* = −5 (on the port: `window.__demo.setState({axy: [-0.7, 5], bxy: [5, 5], cxy: [-5, -5], dxy: [5, -5], az: 5, bz: 5, cz: -5, dz: -5})` in the browser console).
**Do** —
1. Compare the red rectangle and the label with the checkboxes off.
2. Switch both checkboxes on and look at the planes.
3. Set B*xy* = A*xy* (a segment of length 0) and look at the planes again.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_segment-distance.md`, under the heading M-SD-07: per step what each draws (in Mathematica: a plane, nothing or an error box).
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — step 1: the same rectangle and "minimum distance is 14.14" (F-SD-05); steps 2–3: the port draws no plane (D-SD-03); a plane or error box in Mathematica is recorded as a difference to decide.

### M-SD-08 Panel layout
**Open** — `_internal\originals\ShortestDistanceBetweenTwoLineSegments.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — do not touch any control; make the port's window about 700 px wide.
**Do** —
1. Compare where the xy pads, the z sliders, the checkboxes, the PlotLabel and the picture are.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_segment-distance.md`, under the heading M-SD-08: per element "same place" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same comparison on the port's page (also against `docs/original-snapshots/segment-distance-1.png`).
**Expected / what it decides** — xy pads in a row on top, z sliders and checkboxes at the left, the picture with its label at the right (F-SD-12); the look of the pads and sliders differs (D-SD-01).
