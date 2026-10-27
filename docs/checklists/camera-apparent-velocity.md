# Manual checks — Maximizing Apparent Velocity in a Camera's Frame (`demos/camera-apparent-velocity/`)

Each item compares the original in Mathematica with the port, as an operator procedure (owner rule R-B); the general
procedure is in [`docs/MATHEMATICA_CHECKS.md`](../MATHEMATICA_CHECKS.md). Record every result in the test-run file
`_internal\test-runs\<YYYY-MM-DD>_camera-apparent-velocity.md` (create it with `npm run test-run -- camera-apparent-velocity`).

Original notebook (all items): `_internal\originals\MaximizingApparentVelocityInACamerasFrame.nb`.
Port (all items): `http://127.0.0.1:8080/demos/camera-apparent-velocity/` (after `npm run serve`).

### M-CV-01 Texts
**Open** — `_internal\originals\MaximizingApparentVelocityInACamerasFrame.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing; scroll to the title.
**Do** —
1. Compare title, caption and Details (formulas, snapshot descriptions, references) with the port's.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_camera-apparent-velocity.md`, under the heading M-CV-01: per text: "same" or the differing words.
**Save** — File > Close, Don't Save.
**Port** — the page's caption, `details` and `credits`.
**Expected / what it decides** — identical texts, including the Details' errors kept (E-CV-02 … E-CV-05) (F-CV-17).

### M-CV-02 Opening picture
**Open** — `_internal\originals\MaximizingApparentVelocityInACamerasFrame.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — do not touch any control.
**Do** —
1. Compare the picture, every control's value and the two coordinate displays with the port's opening page.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_camera-apparent-velocity.md`, under the heading M-CV-02: per difference: what, where.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — the same scene seen from the same direction (green axes, camera, yellow image plane with the upside-down label, the pink λ, the lines and arrows to the red goal, the cyan θ and magenta ϕ), *x*<sub>c</sub> = 1, *y*<sub>c</sub> = 1, *z*<sub>c</sub> = 15, *r* = 4, every checkbox off, and "x = 3.6 … ϕ = 110.8°", "(u, v) = (1.3, 1.3)", "0.3 = maxdist"; lighter plane edges and label in the port (D-CV-02, D-CV-03) (F-CV-05, F-CV-06, F-CV-15).

### M-CV-03 Each control
**Open** — `_internal\originals\MaximizingApparentVelocityInACamerasFrame.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing.
**Do** —
1. Move *x*<sub>c</sub>, *y*<sub>c</sub>, *z*<sub>c</sub> and *r* from one end of their range to the other, slowly; note how the picture and the displays change.
2. Set *x*<sub>c</sub> = 0 and *y*<sub>c</sub> = 0.
3. Turn on **show sphere**, then **show drone**, then **show 2D view**; turn each off again.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_camera-apparent-velocity.md`, under the heading M-CV-03: per control: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — the goal and the displays follow the sliders as in the original; on the axis the ring of goals and "infinite solutions"; the sphere with its silhouette, the drones (green start, red goal) and the 2D view of the image plane appear and go as in the original (F-CV-01 … F-CV-04, F-CV-07 … F-CV-12).

### M-CV-04 Initial settings
**Open** — `_internal\originals\MaximizingApparentVelocityInACamerasFrame.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — move every control away from its opening value.
**Do** —
1. ⊕ (top-right) > **Initial Settings**; on the port, **Initial settings**.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_camera-apparent-velocity.md`, under the heading M-CV-04: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — both return to the opening picture and values (A-CV-01, F-CV-15).

### M-CV-05 The page works on its own
**Steps** — open the port's page; move every control once; turn every checkbox on and off; press **Initial settings**.
**Record** — anything that does not respond, or an error message on the page.
**Expected** — every control changes the picture or the displays; Initial settings restores the opening picture (A-CV-01).

### M-CV-06 Narrow window
**Steps** — make the browser window about 360 px wide (or use a phone); use every control.
**Record** — anything cut off, overlapping or not reachable.
**Expected** — the page stays usable; the picture scales down with the window.

### M-CV-07 The image plane label
**Open** — `_internal\originals\MaximizingApparentVelocityInACamerasFrame.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — opening state.
**Do** —
1. Look at the label "image plane" on the image plane in the 3D picture; rotate both pictures so that the image plane is seen from above.
2. Turn on **show 2D view** and look at the label at the top of the yellow square.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_camera-apparent-velocity.md`, under the heading M-CV-07: per view: the label's orientation, place, size, darkness and letter shapes, "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — in both views the label is upside down (mirrored top to bottom, read left to right) over the same rectangle (*u* from −5 to 3, *v* from 3.6 to 5), translucent dark gray on yellow; in 3D the port's letters are lighter (D-CV-02), the letter shapes may differ a little (D-CV-01) (F-CV-13, Q-CV-01).

### M-CV-08 Snapshots
**Open** — `_internal\originals\MaximizingApparentVelocityInACamerasFrame.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the review screenshots `test-output\review-screenshots\chromium\camera-apparent-velocity-snapshot-1…8.png` (made by `npx playwright test tests/e2e/camera-apparent-velocity.spec.js`) next to it.
**Prepare** — scroll to the Snapshots section of the notebook.
**Do** —
1. Compare each of the eight snapshot pictures with the screenshot of the same number: the view (3D or 2D), the sphere and silhouette, the drones, the ring of goals, the arrows and angles, the control values and the two displays.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_camera-apparent-velocity.md`, under the heading M-CV-08: per snapshot: "same" or the differences.
**Save** — File > Close, Don't Save.
**Port** — the review screenshots.
**Expected / what it decides** — the same pictures, values and displays, with the differences of D-CV-01 … D-CV-03 and D-CV-07 (F-CV-16).

### M-CV-09 Layout
**Open** — `_internal\originals\MaximizingApparentVelocityInACamerasFrame.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing.
**Do** —
1. Compare the order of the headings, sliders, checkboxes and displays in the control column and their place left of the picture.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_camera-apparent-velocity.md`, under the heading M-CV-09: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — the same column (headings "drone starting location (green point)", "sphere radius", the four checkboxes, "Red point maximizes pixel change.", the two displays) left of the picture; the layer's slider look differs (D-CV-07) (F-CV-18).

### M-CV-10 Animate
**Open** — `_internal\originals\MaximizingApparentVelocityInACamerasFrame.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — opening state.
**Do** —
1. Turn on **animate** and watch for a few seconds; turn on **show drone**; set *x*<sub>c</sub> = *y*<sub>c</sub> = 0.
2. Turn on **show 2D view**; then turn off **show drone**.
3. Turn off **animate**.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_camera-apparent-velocity.md`, under the heading M-CV-10: per step: "same" or the difference (speed, which drones move).
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — a purple drone moves in steps of a tenth from the start to the goal (to every goal of the ring on the axis) and starts again; with show drone the start and goal drones are purple; in 2D the moving drones show only with show drone (Q-CV-04); the speed depends on the computer in Mathematica, at most ten steps a second in the port (D-CV-05) (F-CV-14).

### M-CV-11 Rotating the 3D picture
**Open** — `_internal\originals\MaximizingApparentVelocityInACamerasFrame.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — turn on **show sphere**.
**Do** —
1. Drag the 3D picture to turn it; look from below the image plane and from the side.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_camera-apparent-velocity.md`, under the heading M-CV-11: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — the scene turns about its centre in both, the labels stay upright, the label on the image plane is seen from the back when looking from below; in the port the labels stay in front of the sphere (D-CV-06) (F-CV-06).
