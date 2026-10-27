# Manual checks — Reachable Set for a Drone (`demos/drone-reachable-set/`)

Each item compares the original in Mathematica with the port, as an operator procedure (owner rule R-B); the general
procedure is in [`docs/MATHEMATICA_CHECKS.md`](../MATHEMATICA_CHECKS.md). Record every result in the test-run file
`_internal\test-runs\<YYYY-MM-DD>_drone-reachable-set.md` (create it with `npm run test-run -- drone-reachable-set`).

Original notebook (all items): `_internal\originals\ReachableSetForADrone.nb`.
Port (all items): `http://127.0.0.1:8080/demos/drone-reachable-set/` (after `npm run serve`).

### M-DR-01 Texts
**Open** — `_internal\originals\ReachableSetForADrone.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing; scroll to the title.
**Do** —
1. Compare title, caption and Details (with the equations and the two references) with the port's.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_drone-reachable-set.md`, under the heading M-DR-01: per text: "same" or the differing words.
**Save** — File > Close, Don't Save.
**Port** — the page's caption, `details` and `credits`.
**Expected / what it decides** — identical texts, also the errors kept (E-DR-01…E-DR-03) (F-DR-14).

### M-DR-02 Opening picture
**Open** — `_internal\originals\ReachableSetForADrone.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — do not touch any control.
**Do** —
1. Compare the picture and every control's value with the port's opening page.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_drone-reachable-set.md`, under the heading M-DR-02: per difference: what, where.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — the same picture (the blue set with its orange left and blue right boundary, the darker slivers at x̂ ≈ ±6, the dashed path to the orange point at about (5.6, 2.1), the frame −6 … 6 by −4 … 4 with the axes and the labels x̂, ẑ; the LocatorPane with the locator at (1, 0)) and the values T̂ final 3, t̂ 3, U<sub>min/max</sub> {0.102, 2.04}, drone and optimum off (F-DR-08…F-DR-10, F-DR-12).

### M-DR-03 Each control
**Open** — `_internal\originals\ReachableSetForADrone.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing.
**Do** —
1. Move **T̂ final** from end to end, slowly; then back to about 3.
2. Move **t̂** from end to end.
3. Drag each end of **U<sub>min/max</sub>** past the other one.
4. Tick **drone**, then **optimum**; untick both.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_drone-reachable-set.md`, under the heading M-DR-03: per control: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — T̂ changes the set, the path and the square (t̂ follows while it has not been moved, Q-DR-01); t̂ moves the point along the path; a dragged end of the interval pushes the other one, never closer than 0.1; drone draws the drone turned with the path, optimum the five coloured curves (F-DR-01…F-DR-05). The port redraws during a drag, the original when the mouse is released (D-DR-01).

### M-DR-04 Initial settings
**Open** — `_internal\originals\ReachableSetForADrone.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — move every control (also the t̂ slider and the locator) away from its opening value.
**Do** —
1. ⊕ (top-right) > **Initial Settings**; on the port, **Initial settings**.
2. Move **T̂ final** a little.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_drone-reachable-set.md`, under the heading M-DR-04: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — both return to the opening picture; after step 2, t̂ follows T̂ again (t = T restored, Q-DR-01) (A-DR-01, F-DR-12).

### M-DR-05 The page works on its own
**Steps** — open the port's page; move every control once; drag the locator in the small square; press **Initial settings**.
**Record** — anything that does not respond, or an error message on the page.
**Expected** — every control and the locator change the picture; Initial settings restores the opening picture (A-DR-01).

### M-DR-06 Narrow window
**Steps** — make the browser window about 360 px wide (or use a phone); use every control and the locator.
**Record** — anything cut off, overlapping or not reachable.
**Expected** — the page stays usable; the controls and the small square stack above the picture, which scales down with the window (F-DR-15).

### M-DR-07 Snapshots
**Open** — `_internal\originals\ReachableSetForADrone.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the review screenshots `test-output\review-screenshots\chromium\drone-reachable-set-snapshot-1…6.png` (made by `npx playwright test tests/e2e/drone-reachable-set.spec.js`) next to it.
**Prepare** — scroll to the Snapshots section of the notebook.
**Do** —
1. Compare each of the six snapshot pictures with the screenshot of the same number: the set and its boundary colours, the optimum curves, the drone (position, attitude, size), the path, the frame's range and ticks, the axes and their labels, the LocatorPane and the controls' values.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_drone-reachable-set.md`, under the heading M-DR-07: per snapshot: "same" or the differences.
**Save** — File > Close, Don't Save.
**Port** — the review screenshots.
**Expected / what it decides** — the same pictures and values; snapshot 5 with z ticks every 5, snapshot 6 without a horizontal axis and x̂ (Q-DR-04); the IntervalSlider's look differs (D-DR-04) (F-DR-13).

### M-DR-08 The LocatorPane
**Open** — `_internal\originals\ReachableSetForADrone.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — opening state; tick **optimum**.
**Do** —
1. Drag the locator slowly from (1, 0) to the top right corner and on beyond the square.
2. Click inside the square away from the locator.
3. Set **T̂ final** to 1 and look at the square and the locator.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_drone-reachable-set.md`, under the heading M-DR-08: per step: "same" or the difference (also whether the original's picture follows during the drag or only after the release).
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — the locator stays in the square [0, T̂]² and the drone's end point moves over the set, along the brown and green boundaries at the square's right and top edges; a click moves the locator there; with T̂ = 1 the square is small, the red line gives way to a blue point and the locator is pulled into the square (F-DR-06, Q-DR-02, N-DR-01; the drag itself: D-DR-01).

### M-DR-09 Large and small final times
**Open** — `_internal\originals\ReachableSetForADrone.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — opening state; tick **optimum**.
**Do** —
1. Type 10 into the T̂ field (⊕ panel in Mathematica) and compare the pictures.
2. Type 0.1 and compare.
3. Set U<sub>min/max</sub> to {0., 0.1} (drag the upper end to the left) with T̂ = 3.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_drone-reachable-set.md`, under the heading M-DR-09: per step: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — at T̂ = 10 the two regions overlap and fold (darker), the boundaries smooth (D-DR-03); at T̂ = 0.1 a narrow strip (K-DR-01); with {0., 0.1} the set lies below the start and there is no horizontal axis (Q-DR-04) (F-DR-08, F-DR-10).
