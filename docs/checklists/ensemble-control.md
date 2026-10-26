# Manual checks — Ensemble Control of Robots with Unicycle Kinematics (`demos/ensemble-control/`)

Each item compares the original in Mathematica with the port, as an operator procedure (owner rule R-B); the general
procedure is in [`docs/MATHEMATICA_CHECKS.md`](../MATHEMATICA_CHECKS.md). Record every result in the test-run file
`_internal\test-runs\<YYYY-MM-DD>_ensemble-control.md` (create it with `npm run test-run -- ensemble-control`).

Original notebook (all items): `_internal\originals\EnsembleControlOfRobotsWithUnicycleKinematics.nb`.
Port (all items): `http://127.0.0.1:8080/demos/ensemble-control/` (after `npm run serve`).

### M-EC-01 Texts
**Open** — `_internal\originals\EnsembleControlOfRobotsWithUnicycleKinematics.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing; scroll to the title.
**Do** —
1. Compare title, caption and Details with the port's.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_ensemble-control.md`, under the heading M-EC-01: per text: "same" or the differing words.
**Save** — File > Close, Don't Save.
**Port** — the page's caption, `details` and `credits`.
**Expected / what it decides** — identical texts (F-EC-11).

### M-EC-02 Opening picture
**Open** — `_internal\originals\EnsembleControlOfRobotsWithUnicycleKinematics.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — do not touch any control.
**Do** —
1. Compare the picture and every control's value with the port's opening page.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_ensemble-control.md`, under the heading M-EC-02: per difference: what, where.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — the same two pictures (the two robots at the same places, the plot from about 45 to 167 with the red point at about −1) and the values n = 2, forward command 0 (F-EC-06…F-EC-09).

### M-EC-03 Each control
**Open** — `_internal\originals\EnsembleControlOfRobotsWithUnicycleKinematics.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing.
**Do** —
1. Move each control from one end of its range to the other, slowly; note how the picture changes.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_ensemble-control.md`, under the heading M-EC-03: per control: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — every control changes the picture as in the original: a new n gives n new robots and goals; the forward command moves the bright robots along their dashed lines and the blue point along the curve (F-EC-01, F-EC-03, F-EC-04, F-EC-07). The robots themselves are random in both (D-EC-01).

### M-EC-04 Initial settings
**Open** — `_internal\originals\EnsembleControlOfRobotsWithUnicycleKinematics.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — move every control away from its opening value.
**Do** —
1. ⊕ (top-right) > **Initial Settings**; on the port, **Initial settings**.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_ensemble-control.md`, under the heading M-EC-04: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — both return to the opening picture (A-EC-01).

### M-EC-05 The page works on its own
**Steps** — open the port's page; move every control once; press **Initial settings**.
**Record** — anything that does not respond, or an error message on the page.
**Expected** — every control changes the picture; the button moves and turns the robots (F-EC-05); Initial settings restores the opening picture (A-EC-01).

### M-EC-06 Narrow window
**Steps** — make the browser window about 360 px wide (or use a phone); use every control.
**Record** — anything cut off, overlapping or not reachable.
**Expected** — the page stays usable; the picture scales down with the window.

### M-EC-07 Snapshots
**Open** — `_internal\originals\EnsembleControlOfRobotsWithUnicycleKinematics.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the review screenshots `test-output\review-screenshots\chromium\ensemble-control-snapshot-1…4.png` (made by `npx playwright test tests/e2e/ensemble-control.spec.js`) next to it.
**Prepare** — scroll to the Snapshots section of the notebook.
**Do** —
1. Compare each of the four snapshot pictures with the screenshot of the same number: robots, paths, dashed lines, goals, the curve, the red line and points, the blue point.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_ensemble-control.md`, under the heading M-EC-07: per snapshot: "same" or the differences.
**Save** — File > Close, Don't Save.
**Port** — the review screenshots.
**Expected / what it decides** — the same pictures; the plot's y range may be a little narrower and its ticks denser (K-EC-01) (F-EC-10, F-EC-06…F-EC-08).

### M-EC-08 Steering to the goals
**Open** — `_internal\originals\EnsembleControlOfRobotsWithUnicycleKinematics.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — leave n = 2.
**Do** —
1. In both, ten times: move **forward command** to the red line's value, then click **turn counter‑clockwise**.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_ensemble-control.md`, under the heading M-EC-08: the lowest value of the curve before and after the ten steps; whether the faint paths grow by one segment per step.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page (the turns differ: both are random).
**Expected / what it decides** — in both the curve's minimum falls step by step and the robots approach their goals; after each click the forward command is 0 and the blue point is at v = 0 (F-EC-05, F-EC-08, UC-EC-01).
