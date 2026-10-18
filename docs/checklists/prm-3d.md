# Manual checks — Probabilistic Roadmap Method in 3D (`demos/prm-3d/`)

Each item compares the original in Mathematica with the port, as an operator procedure (owner rule R-B). The general
procedure — starting Mathematica, Enable Dynamics, the ⊕ menu, waiting, recording, saving, sending results back — is in
[`docs/MATHEMATICA_CHECKS.md`](../MATHEMATICA_CHECKS.md). Record every result in the test-run file
`_internal\test-runs\<YYYY-MM-DD>_prm-3d.md` (create it with `npm run test-run -- prm-3d`; one per app and day; write the
item ID as a heading). Differences are findings, not failures of the tester. Open the published notebook as it is (do not
re-evaluate the input cell).

Original notebook (all items):
`_internal\originals\batch-ab\Demonstration-Probabilistic-Roadmap-Method-in-3D-1-0-0-definition.nb`.
Port (all items): `http://127.0.0.1:8080/demos/prm-3d/` (after `npm run serve`).

Where things are in the original (snapshot 1, `docs/original-snapshots/prm-3d-1.png`): the controls are in rows above the
two pictures. Row 1: the sliders **θ₁**, **θ₂**, **θ₃** (start configuration; each with a small **+** right of it that
opens its animation panel with a value field; no value is shown otherwise). Row 2: the square pad **blue_xy** (drag its
thumb to move the blue sphere in x, y), the vertical slider **blue_z**, the pad **yellow_xy**, the vertical slider
**yellow_z**, and the check box **show configuration space obstacles**. Row 3: the buttons **add 100 vertices**,
**restart** and **new goal**, and the slider **radius** (with **+** and its value, "1.5"). Row 4: the long slider
**progress** (no **+**, no value). Below: "robot workspace" on the left and "robot phase space" (with "path length = …" or
"No path possible") on the right; both can be rotated by dragging. The **⊕** button is at the top-right corner of the
panel. In the port the same controls carry the test ids `slider-Theta1` … `slider-Theta3`, `plus-Theta*`, `pad-Obstaxy`,
`vslider-Obstaz`, `pad-Obstbxy`, `vslider-Obstbz`, `check-showConfigObs`, `button-addPoints`, `button-restart`,
`button-newgoal`, `slider-r`, `value-r`, `slider-progress`, `scene-canvas-workspace`, `scene-canvas-phase` and `reset`
("Initial settings").

### M-P3-01 Texts
**Open** — `_internal\originals\batch-ab\Demonstration-Probabilistic-Roadmap-Method-in-3D-1-0-0-definition.nb` with
Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any cell
(no Shift+Enter). Open the port's page next to it.
**Prepare** — nothing; scroll to the title.
**Do** —
  1. Compare title and caption with the port's.
  2. Scroll to "Details & Citations"; compare the three paragraphs and the Kavraki et al. reference.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_prm-3d.md`, under the heading M-P3-01: per text: "same" or the differing words.
**Save** — File > Close, Don't Save.
**Port** — the page's caption, `details` and `credits`.
**Expected / what it decides** — identical texts (F-P3-27).

### M-P3-02 Opening picture (snapshot 1)
**Open** — `_internal\originals\batch-ab\Demonstration-Probabilistic-Roadmap-Method-in-3D-1-0-0-definition.nb` with
Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any cell
(no Shift+Enter).
**Prepare** — do not touch anything (live state).
**Do** —
  1. Check: θ sliders near the left end (0.25); **radius** 1.5; "path length = 8.09"; workspace: brown base, translucent
     start and goal robots, the robot at the start, blue sphere at (1, 0, 0) and yellow at (0, −1, 0.5); phase space:
     20 red and 80 green points, brown roadmap, thick magenta connectors, purple/orange path, black start/goal points,
     blue cube at the start corner.
  2. Compare framing, point sizes and colours with `docs/original-snapshots/prm-3d-1.png`; measure one green point's
     diameter and each picture's width (px).
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_prm-3d.md`, under the heading M-P3-02: yes/no per point of step 1; differences of step 2; the measurements.
**Save** — File > Close, Don't Save.
**Port** — open the page; compare (`scene-canvas-workspace`, `scene-canvas-phase`).
**Expected / what it decides** — snapshot 1 (F-P3-21, F-P3-23, F-P3-24); sizes as D-P3-04.

### M-P3-03 Start sliders (Q-P3-01, K-P3-07)
**Open** — `_internal\originals\batch-ab\Demonstration-Probabilistic-Roadmap-Method-in-3D-1-0-0-definition.nb` with
Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any cell
(no Shift+Enter).
**Prepare** — none (live state).
**Do** —
  1. Drag the **θ₂** thumb slowly to the right end and a little beyond; watch the thumb and the robot.
  2. Drag the **θ₁** thumb to the left end.
  3. Click the **+** of **θ₃**; press play; watch the robot for 10 s; stop.
  4. Click the **+** of **θ₂** and read the value field.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_prm-3d.md`, under the heading M-P3-03: step 1: does the thumb jump to the left end, does the robot keep turning smoothly; step 2: where the thumb
goes; step 3: continuous turning yes/no; step 4: the value shown (e.g. 0.0168…); the saved file name (see Save).
**Save** — after step 4: File > Save As… `_internal\originals\saved\prm-3d_M-P3-03_<YYYY-MM-DD>.nb` (the stored θ values
show the slider arithmetic, K-P3-07), then close.
**Port** — the same on the page (`slider-Theta*`, `plus-Theta*`, `play-Theta*`).
**Expected / what it decides** — 6.3 → 0.01681469282041359 and −0.1 → 6.183185307179587 (Q-P3-01); settles K-P3-07.

### M-P3-04 Roadmap controls (F-P3-05 … F-P3-08)
**Open** — `_internal\originals\batch-ab\Demonstration-Probabilistic-Roadmap-Method-in-3D-1-0-0-definition.nb` with
Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any cell
(no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**.
**Do** —
  1. Click **add 100 vertices** twice; watch the phase space.
  2. Click **new goal**.
  3. Click the **+** of **radius**; type `1.19`, Enter; then `1.86`, Enter.
  4. Click **restart**.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_prm-3d.md`, under the heading M-P3-04: per step: what changes (points added, roadmap grows, goal moves, rebuild on the radius change, empty
picture after restart) and the phase-space label.
**Save** — File > Close, Don't Save.
**Port** — the same on the page (`button-addPoints`, `button-newgoal`, `value-r`, `button-restart`); random numbers
differ (D-P3-01).
**Expected / what it decides** — incremental growth, a random goal, a rebuild on radius change, empty picture after
restart with "No path possible" (F-P3-05…F-P3-08; label as E-P3-06).

### M-P3-05 Configuration-space obstacles (F-P3-22, F-P3-25, K-P3-03)
**Open** — `_internal\originals\batch-ab\Demonstration-Probabilistic-Roadmap-Method-in-3D-1-0-0-definition.nb` with
Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any cell
(no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**.
**Do** —
  1. Tick **show configuration space obstacles**; time (s) until the volumes appear.
  2. Drag the **yellow_z** slider up slowly and hold for 2 s; release; time until the final volumes appear.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_prm-3d.md`, under the heading M-P3-05: step 1: the time and a screenshot name (blue and yellow volumes with dark outlines on the cube faces);
step 2: coarse volumes while dragging yes/no, the time after release.
**Save** — File > Close, Don't Save.
**Port** — the same on the page (`check-showConfigObs`, `vslider-Obstbz`); compare shapes.
**Expected / what it decides** — snapshots 3–4 (F-P3-22, F-P3-25); data for K-P3-03 and Q-P3-12.

### M-P3-06 Rotation (F-P3-26, K-P3-04)
**Open** — `_internal\originals\batch-ab\Demonstration-Probabilistic-Roadmap-Method-in-3D-1-0-0-definition.nb` with
Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any cell
(no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**.
**Do** —
  1. Rotate both pictures by dragging; then move **θ₁** a little and change **radius** (type `1.6`).
  2. Tilt one picture so that its vertical axis leans; zoom it (Alt+drag or the mouse wheel); move **θ₁** again.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_prm-3d.md`, under the heading M-P3-06: step 1: both rotations kept yes/no; step 2: tilt kept yes/no, zoom kept yes/no.
**Save** — File > Close, Don't Save.
**Port** — the same on the page (`scene-canvas-workspace`, `scene-canvas-phase`); the port keeps everything.
**Expected / what it decides** — settles K-P3-04 (D-P3-05).

### M-P3-07 Obstacles at the base and stale edges (Q-P3-06, Q-P3-07)
**Open** — `_internal\originals\batch-ab\Demonstration-Probabilistic-Roadmap-Method-in-3D-1-0-0-definition.nb` with
Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any cell
(no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**; open Window > Messages and clear it.
**Do** —
  1. Drag the **blue_xy** thumb to the pad's point {0, 0} (three quarters of the way from the left edge and three
     quarters of the way up: the pad spans −3 … 1 in both directions) and **blue_z** to 1.
  2. Click **add 100 vertices**.
  3. Drag **blue_xy** back to {1, 0} (right edge, three quarters of the way up) and **blue_z** to 0.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_prm-3d.md`, under the heading M-P3-07: step 1: every sample red yes/no, robots red yes/no, old brown edges still drawn yes/no; step 2: all new
points red yes/no; step 3: roadmap rebuilt yes/no; any message text.
**Save** — if messages appeared: File > Save As… `_internal\originals\saved\prm-3d_M-P3-07_<YYYY-MM-DD>.nb`, then
close; otherwise File > Close, Don't Save.
**Port** — the same on the page (`pad-Obstaxy`, `vslider-Obstaz`, `button-addPoints`).
**Expected / what it decides** — Q-P3-06, Q-P3-07: with the sphere on the base axis every configuration collides, so
step 2 gives no free sample and connectPoints is not called; messages recorded with H-P3-17 (none expected). K-P3-05's
guard is not reached by these steps.

### M-P3-08 Initial Settings (A-P3-01)
**Open** — `_internal\originals\batch-ab\Demonstration-Probabilistic-Roadmap-Method-in-3D-1-0-0-definition.nb` with
Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any cell
(no Shift+Enter).
**Prepare** — none.
**Do** —
  1. Change several controls (θ₁, radius, a sphere) and rotate both pictures.
  2. ⊕ > **Initial Settings**.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_prm-3d.md`, under the heading M-P3-08: the label, the samples and roadmap, the view points after step 2.
**Save** — File > Close, Don't Save.
**Port** — the same, then "Initial settings" (`reset`).
**Expected / what it decides** — the opening picture of M-P3-02 ("path length = 8.09") including the default view
points, in both (A-P3-01).
