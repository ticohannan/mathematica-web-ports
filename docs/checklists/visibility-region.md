# Manual checks — Visibility Region of a Polygon (`demos/visibility-region/`)

Each item compares the original in Mathematica with the port, as an operator procedure (owner rule R-B); the general
procedure is in [`docs/MATHEMATICA_CHECKS.md`](../MATHEMATICA_CHECKS.md). Record every result in the test-run file
`_internal\test-runs\<YYYY-MM-DD>_visibility-region.md` (create it with `npm run test-run -- visibility-region`).

Original notebook (all items): `_internal\originals\VisibilityRegionOfAPolygon.nb`.
Port (all items): `http://127.0.0.1:8080/demos/visibility-region/` (after `npm run serve`).

### M-VR-01 Texts
**Open** — `_internal\originals\VisibilityRegionOfAPolygon.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing; scroll to the title.
**Do** —
1. Compare title, caption and Details (with the five references) with the port's.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_visibility-region.md`, under the heading M-VR-01: per text: "same" or the differing words.
**Save** — File > Close, Don't Save.
**Port** — the page's caption, `details` and `credits`.
**Expected / what it decides** — identical texts, including the Details' swapped half-planes (E-VR-03) (F-VR-14).

### M-VR-02 Opening picture
**Open** — `_internal\originals\VisibilityRegionOfAPolygon.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — do not touch any control.
**Do** —
1. Compare the picture and the slider's value with the port's opening page.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_visibility-region.md`, under the heading M-VR-02: per difference: what, where.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — the same picture: the building and the square outlined in gray, the yellow region with 21 red corners, the orange triangle from the blue point to the right wall up to (5.25, 3), the blue ray to the corner (5.25, 3.75) with a tiny arc, the orange-and-green wall y = 3, the green right edge of the square; "vertices sorted by angle" = 3 (F-VR-11, F-VR-12).

### M-VR-03 Each control
**Open** — `_internal\originals\VisibilityRegionOfAPolygon.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing.
**Do** —
1. Move the slider "vertices sorted by angle" from 1 to 42, slowly; note how the picture changes.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_visibility-region.md`, under the heading M-VR-03: per control: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — the slider runs from 1 to 42; at each step the blue ray turns counter-clockwise to the next corner, the orange region grows, the orange wall and the green J list change as in the original; at 42 the whole region is orange (F-VR-01, F-VR-02, F-VR-10).

### M-VR-04 Initial settings
**Open** — `_internal\originals\VisibilityRegionOfAPolygon.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — move the slider and the blue point away from their opening values.
**Do** —
1. ⊕ (top-right) > **Initial Settings**; on the port, **Initial settings**.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_visibility-region.md`, under the heading M-VR-04: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — both return to the opening picture: step 3, the blue point at (−1.83, 0.47) (A-VR-01, Q-VR-02).

### M-VR-05 The page works on its own
**Steps** — open the port's page; move the slider once; drag the blue point once; press **Initial settings**.
**Record** — anything that does not respond, or an error message on the page.
**Expected** — the slider and the blue point change the picture; Initial settings restores the opening picture (A-VR-01).

### M-VR-06 Narrow window
**Steps** — make the browser window about 360 px wide (or use a phone); use the slider and drag the blue point.
**Record** — anything cut off, overlapping or not reachable.
**Expected** — the page stays usable; the picture scales down with the window.

### M-VR-07 Snapshots
**Open** — `_internal\originals\VisibilityRegionOfAPolygon.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the review screenshots `test-output\review-screenshots\chromium\visibility-region-snapshot-1…5.png` (made by `npx playwright test tests/e2e/visibility-region.spec.js`) next to it.
**Prepare** — scroll to the Snapshots section of the notebook.
**Do** —
1. Compare each of the five snapshot pictures with the screenshot of the same number: the yellow region and its red corners, the orange region, the blue ray and arc, the orange wall, the green lines, the slider value.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_visibility-region.md`, under the heading M-VR-07: per snapshot: "same" or the differences.
**Save** — File > Close, Don't Save.
**Port** — the review screenshots.
**Expected / what it decides** — the same pictures, also the full blue circle of snapshot 5 (step 42) and the green J list one step behind the ray in snapshots 1–4 (Q-VR-03, Q-VR-04) (F-VR-13).

### M-VR-08 Dragging the point, inside and outside the building
**Open** — `_internal\originals\VisibilityRegionOfAPolygon.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — slider at 42 in both (the whole region in orange).
**Do** —
1. Drag the blue point through each room of the building and watch the region.
2. Drag it out of the building into the white corridor between the building's right wall and the square, then into the slot at the top middle.
3. Initial settings; then click once on the picture in the corridor halfway between the blue point and the right wall, at the blue point's height (not on the blue point).
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_visibility-region.md`, under the heading M-VR-08: per step: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — the region follows the point; outside the building the region lies between the building and the square (Q-VR-07); the click in step 3 changes nothing (an invisible locator moved there, Q-VR-01) (F-VR-03, F-VR-04, F-VR-08).

### M-VR-09 The first and last steps
**Open** — `_internal\originals\VisibilityRegionOfAPolygon.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — do not move the blue point.
**Do** —
1. Set the slider to 1, then to 2, then to 41, then to 42.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_visibility-region.md`, under the heading M-VR-09: per step: "same" or the difference (in particular the blue arc around the point).
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — step 1: only the blue ray to the right wall and a light purple line, no arc in the port (Q-VR-04, N-VR-06: note whether Mathematica draws an arc, a full circle or nothing); step 2: the first corner (5.25, 3) and the orange triangle; step 41: the ray to (5.25, −0.75); step 42: the whole region orange, no orange wall (F-VR-10).
