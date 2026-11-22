# Manual checks — Rotating a Hypercube in 4D (`demos/hypercube-4d-rotation/`)

Each item compares the original in Mathematica with the port, as an operator procedure (rule 8); the general
procedure is in [`docs/MATHEMATICA_CHECKS.md`](../MATHEMATICA_CHECKS.md). Record every result in the test-run file
`_internal\test-runs\<YYYY-MM-DD>_hypercube-4d-rotation.md` (create it with `npm run test-run -- hypercube-4d-rotation`). Items M-HY-05 and
M-HY-06 settle what only a person can see in Mathematica: whether the duration slider changes the speed of a running
animation, and how the translucent faces look while the view is turned.

Original notebook (all items): `_internal\originals\wolfram-2026-11-17\RotatingAHypercubeIn4D.nb`.
Port (all items): `http://127.0.0.1:8080/demos/hypercube-4d-rotation/` (after `npm run serve`).

### M-HY-01 Texts
**Open** — `_internal\originals\wolfram-2026-11-17\RotatingAHypercubeIn4D.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing; scroll to the title.
**Do** —
1. Compare title, caption and the related links with the port's caption and **Details**.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_hypercube-4d-rotation.md`, under the heading M-HY-01: per text: "same" or the differing words.
**Save** — File > Close, Don't Save.
**Port** — the page's caption, `details` and `credits`.
**Expected / what it decides** — identical caption; the Details of the port add the description of the projection (F-HY-11, E-HY-01).

### M-HY-02 Opening picture
**Open** — `_internal\originals\wolfram-2026-11-17\RotatingAHypercubeIn4D.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — do not touch any control. Note the angle column (W-Z and X-Y run).
**Do** —
1. Pause **W‐Z** and **X‐Y** with their ▶/❚❚ buttons.
2. Compare the picture (the outer and inner cube, colours red at the top, blue at the bottom, black edges 3 px) and every control's value with the port's page, paused the same way.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_hypercube-4d-rotation.md`, under the heading M-HY-02: per difference: what, where.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — the same picture and values; the port opens at the notebook's live state, W-Z and X-Y running (F-HY-01, F-HY-02).

### M-HY-03 Hypercube, faces, opacity, axes
**Open** — `_internal\originals\wolfram-2026-11-17\RotatingAHypercubeIn4D.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — pause W‐Z and X‐Y; press **reset rotations**.
**Do** —
1. Click **1 hole**, then **3 holes**, then **full**: note which faces disappear.
2. Click **blue**, then **edges only**, then **color**: note the colours and the red points at the vertices.
3. Move **opacity** from 0 to 1.
4. Check and uncheck **axes**: note the colours and the X, Y, Z labels, and whether the picture's size changes.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_hypercube-4d-rotation.md`, under the heading M-HY-03: per control: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — 1 hole: the y = ±1 squares of both cubes are open; 3 holes: only the 12 squares between the two cubes; edges only ignores the hypercube choice; the axes do not change the size of the picture (Q-HY-01, Q-HY-02, F-HY-03 … F-HY-06).

### M-HY-04 Projection parameter
**Open** — `_internal\originals\wolfram-2026-11-17\RotatingAHypercubeIn4D.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — pause W‐Z and X‐Y; press **reset rotations**; check **axes**.
**Do** —
1. Move the slider under **stereographic projection** from 1 to 0.001, slowly.
2. Type 0.5 in its field (if Mathematica offers one) and compare the size of the inner cube with the outer one.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_hypercube-4d-rotation.md`, under the heading M-HY-04: "same" or the difference (sizes of the cubes and the axes).
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — at 1 the inner cube is half the outer one; towards 0.001 they become equal (a parallel projection) and the axes grow to ±2 (F-HY-07, E-HY-01).

### M-HY-05 Animators and duration
**Open** — `_internal\originals\wolfram-2026-11-17\RotatingAHypercubeIn4D.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — ⊕ (top right of the panel) > **Initial Settings**; if W-Z and X-Y do not run, start them with ▶.
**Do** —
1. Time one full turn of **W‐Z** (the angle column from 0 to 360) with a watch.
2. Move **duration** to 40 while W-Z runs; time the next full turn.
3. Click the direction button (→) of W-Z once and twice: note the arrows and the motion.
4. Click the reset button (|◀) of W-Z; click ▶ of **W‐X**.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_hypercube-4d-rotation.md`, under the heading M-HY-05: the two times in seconds, the arrows, and "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — about 20 s, then 40 s if Mathematica applies the new duration to a running Animator (the port does: N-HY-04); → ← ↔ in turn; reset puts the angle to 0 (F-HY-08, F-HY-09).

### M-HY-06 Turning the view
**Open** — `_internal\originals\wolfram-2026-11-17\RotatingAHypercubeIn4D.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — pause W‐Z and X‐Y.
**Do** —
1. Drag the picture slowly half a turn around; watch the translucent faces of the colour mode.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_hypercube-4d-rotation.md`, under the heading M-HY-06: "same" or the difference (faces that look darker or lighter from some directions).
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — the view turns in both; the port's blending order is computed for the opening view, so from other directions some faces may look different (K-HY-01).

### M-HY-07 Reset rotations and Initial settings
**Open** — `_internal\originals\wolfram-2026-11-17\RotatingAHypercubeIn4D.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — set every angle away from 0 (drag the progress sliders); pause all Animators.
**Do** —
1. Click **reset rotations (with animations stopped)**.
2. Set other values in every control; ⊕ > **Initial Settings**; on the port, **Initial settings**.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_hypercube-4d-rotation.md`, under the heading M-HY-07: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — reset rotations puts the six angles to 0 and does not stop a running Animator; Initial Settings gives the controls' initial values, all angles 0 (F-HY-10, A-HY-01).

### M-HY-08 The page works on its own
**Steps** — open the port's page; use every control once; press **Initial settings**.
**Record** — anything that does not respond, or an error message on the page.
**Expected** — every control changes the picture; Initial settings restores the initial values (A-HY-01).

### M-HY-09 Narrow window
**Steps** — make the browser window about 360 px wide (or use a phone); use every control.
**Record** — anything cut off, overlapping or not reachable.
**Expected** — the page stays usable; the picture scales down with the window.
