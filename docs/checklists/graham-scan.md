# Manual checks — Graham Scan to Find the Convex Hull of a Set of Points in 2D (`demos/graham-scan/`)

Each item compares the original in Mathematica with the port, as an operator procedure (owner rule R-B); the general
procedure is in [`docs/MATHEMATICA_CHECKS.md`](../MATHEMATICA_CHECKS.md). Record every result in the test-run file
`_internal\test-runs\<YYYY-MM-DD>_graham-scan.md` (create it with `npm run test-run -- graham-scan`).

Original notebook (all items): `_internal\originals\GrahamScanToFindTheConvexHullOfASetOfPointsIn2D.nb`.
Port (all items): `http://127.0.0.1:8080/demos/graham-scan/` (after `npm run serve`).

### M-GS-01 Texts
**Open** — `_internal\originals\GrahamScanToFindTheConvexHullOfASetOfPointsIn2D.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing; scroll to the title.
**Do** —
1. Compare title, caption and Details with the port's.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_graham-scan.md`, under the heading M-GS-01: per text: "same" or the differing words.
**Save** — File > Close, Don't Save.
**Port** — the page's caption, `details` and `credits`.
**Expected / what it decides** — identical texts (F-GS-10).

### M-GS-02 Opening picture
**Open** — `_internal\originals\GrahamScanToFindTheConvexHullOfASetOfPointsIn2D.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — do not touch any control.
**Do** —
1. Compare the picture and every control's value with the port's opening page.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_graham-scan.md`, under the heading M-GS-02: per difference: what, where.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — the same picture and values: 20 points, one ray, step 1, *n* = 20 (F-GS-07, F-GS-09).

### M-GS-03 Each control
**Open** — `_internal\originals\GrahamScanToFindTheConvexHullOfASetOfPointsIn2D.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing.
**Do** —
1. Move each control from one end of its range to the other, slowly; note how the picture changes.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_graham-scan.md`, under the heading M-GS-03: per control: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — every control changes the picture as in the original: the step adds rays and hull edges, dropped edges dashed red (F-GS-01…F-GS-06, F-GS-08).

### M-GS-04 Initial settings
**Open** — `_internal\originals\GrahamScanToFindTheConvexHullOfASetOfPointsIn2D.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — move every control away from its opening value.
**Do** —
1. ⊕ (top-right) > **Initial Settings**; on the port, **Initial settings**.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_graham-scan.md`, under the heading M-GS-04: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — both return to the opening picture (A-GS-01).

### M-GS-05 The page works on its own
**Steps** — open the port's page; move every control once; press **Initial settings**.
**Record** — anything that does not respond, or an error message on the page.
**Expected** — every control changes the picture; a focused point moves with the arrow keys (A-GS-08); Initial settings restores the opening picture (A-GS-01).

### M-GS-06 Narrow window
**Steps** — make the browser window about 360 px wide (or use a phone); use every control.
**Record** — anything cut off, overlapping or not reachable.
**Expected** — the page stays usable; the picture scales down with the window.

### M-GS-07 New points
**Open** — `_internal\originals\GrahamScanToFindTheConvexHullOfASetOfPointsIn2D.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — set *n* to 11 in both.
**Do** —
1. Click **generate n new points** in both; then move **step** to its right end.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_graham-scan.md`, under the heading M-GS-07: the number of points, the step slider's maximum, whether the hull closes.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page (the points themselves differ: both are random).
**Expected / what it decides** — 11 points, step maximum 10, a closed blue hull through the outermost points (F-GS-04, F-GS-08).
