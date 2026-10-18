# Manual checks — Manipulability Ellipsoid of a Robot Arm (`demos/manipulability-ellipsoid/`)

Each item compares the original in Mathematica with the port, as an operator procedure (owner rule R-B). The general
procedure — starting Mathematica, Enable Dynamics, the ⊕ menu, waiting, recording, saving, sending results back — is in
[`docs/MATHEMATICA_CHECKS.md`](../MATHEMATICA_CHECKS.md). Record every result in the test-run file
`_internal\test-runs\<YYYY-MM-DD>_manipulability-ellipsoid.md` (create it with `npm run test-run -- manipulability-ellipsoid`).
Differences are findings, not failures of the tester. Open the published notebook as it is (do not re-evaluate the input
cell).

Original notebook (all items): `_internal\originals\batch-ab\Demonstration-Manipulability-Ellipsoid-of-a-Robot-Arm-1-0-0-definition.nb`.
Port (all items): `http://127.0.0.1:8080/demos/manipulability-ellipsoid/` (after `npm run serve`).

Where things are in the original (snapshot 1, `docs/original-snapshots/manipulability-ellipsoid-1.png`): three dials in a
column on the left, labelled **θ₁** (red hand), **θ₂** (blue hand) and **θ₃** (green hand), each with a cross-hair
locator on its rim; a click anywhere on a dial moves its hand to the nearest multiple of π/32 in that direction (to set
an angle, click the rim at the angle; the labels 0, π/4, π/2, 3π/4, π, −3π/4, −π/2, −π/4 mark the main angles, the long
ticks every π/8, the short ones every π/16). On the right the label "Manipulability μ =" with its value, and the 3D
picture (rotate it by dragging). The **⊕** button is at the top-right corner of the panel. In the port the dials'
locators carry the test ids `locator-p1`, `locator-p2`, `locator-p3`; the μ value is `mu-label`, the picture
`scene-canvas-workspace`, the button "Initial settings" `reset`.

### M-ME-01 Texts
**Open** — `_internal\originals\batch-ab\Demonstration-Manipulability-Ellipsoid-of-a-Robot-Arm-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter). Open the port's page next to it.
**Prepare** — nothing; scroll to the title.
**Do** —
1. Compare title and the three caption paragraphs with the port's.
2. Scroll to "Details & Citations"; compare the Jacobian matrix entry by entry, the determinant formula, the rank
   statements, the snapshot sentence and both references.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_manipulability-ellipsoid.md`, under the heading M-ME-01: per text: "same" or the differing words or symbols.
**Save** — File > Close, Don't Save.
**Port** — the page's caption, `details` and `credits`.
**Expected / what it decides** — identical texts (F-ME-14), including E-ME-01…03.

### M-ME-02 Opening picture (F-ME-09, F-ME-10, F-ME-11, D-ME-01)
**Open** — `_internal\originals\batch-ab\Demonstration-Manipulability-Ellipsoid-of-a-Robot-Arm-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — do not touch anything (live state).
**Do** —
1. Compare with `docs/original-snapshots/manipulability-ellipsoid-1.png`: label "Manipulability μ = 671.892×10^-3";
   red base, grey shaft, blue and green joint cylinders, grey links; red floor arc from the x axis to 19π/32 with a
   thickening at its end; a long green arc (43π/32); light-blue ellipsoid with blue, red, green arrows and rings.
2. Measure on a screenshot the red base cylinder's width (px), the picture width (px) and one dial's diameter (px).
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_manipulability-ellipsoid.md`, under the heading M-ME-02: yes/no per point of step 1; the three measurements.
**Save** — File > Close, Don't Save.
**Port** — open the page; compare (`mu-label`, `scene-canvas-workspace`); port: base 71 px wide at 2 px per pt, dials
about 173 pt across.
**Expected / what it decides** — snapshot 1 (F-ME-09…F-ME-11); measurements check D-ME-01 and the dial size of F-ME-01.

### M-ME-03 Dials (F-ME-01, F-ME-02, D-ME-07)
**Open** — `_internal\originals\batch-ab\Demonstration-Manipulability-Ellipsoid-of-a-Robot-Arm-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**.
**Do** —
1. Click inside the **θ₁** dial near its centre, then far from the locator near the rim, then just outside the circle.
2. Press on the **θ₁** locator and drag it slowly once around the dial (about 10 s).
3. Look closely at the hand, the ticks, the labels and the arrow arc.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_manipulability-ellipsoid.md`, under the heading M-ME-03: step 1: does the hand jump to the nearest multiple of π/32 in the direction of the click each time;
step 2: does it move in steps (64 per turn); step 3: differences in look.
**Save** — File > Close, Don't Save.
**Port** — the same on the page (`locator-p*`).
**Expected / what it decides** — π/32 snapping and LocatorPane clicks (F-ME-01, F-ME-02); look as D-ME-07.

### M-ME-04 Singular configurations and μ (F-ME-07, F-ME-08, K-ME-01)
**Open** — `_internal\originals\batch-ab\Demonstration-Manipulability-Ellipsoid-of-a-Robot-Arm-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**.
**Do** —
1. Click the **θ₃** dial's rim at "0": look at the ellipsoid and read μ.
2. Click the **θ₂** dial at "π/2" (θ₃ still 0): arm straight up.
3. Click the **θ₃** dial at "π" (folded arm).
4. Click **θ₂** at 3π/8 (the long tick between "π/4" and "π/2") and **θ₃** at "π/4".
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_manipulability-ellipsoid.md`, under the heading M-ME-04: per step: the μ text exactly; which arrows and rings are visible; ellipsoid flat, line-like or full.
**Save** — File > Close, Don't Save.
**Port** — the same on the page; port: μ "0." in every step, step 2 only blue arrows and a line-like blue ring, step 3
only blue arrows, step 4 a flat ellipse.
**Expected / what it decides** — settles K-ME-01 (μ exactly 0 at singular dials); steps 3–4 also show E-ME-02 (rank 1
at θ₃ = π, the shoulder singularity not listed in the Details).

### M-ME-05 Arcs and points (Q-ME-01, Q-ME-02, Q-ME-05, D-ME-03)
**Open** — `_internal\originals\batch-ab\Demonstration-Manipulability-Ellipsoid-of-a-Robot-Arm-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**.
**Do** —
1. Click the **θ₁** dial at "0": look at the floor.
2. Click the **θ₂** dial at "−π/2": look at the blue arc.
3. Measure the sizes (px) of the three red floor points (set θ₁ to "π/2" for that).
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_manipulability-ellipsoid.md`, under the heading M-ME-05: step 1: full red circle yes/no, the three points together at (1, 0, 0) yes/no; step 2: does the blue arc
go three quarters round; step 3: the three sizes.
**Save** — File > Close, Don't Save.
**Port** — the same on the page; compare point sizes (D-ME-03).
**Expected / what it decides** — Q-ME-01, Q-ME-02, Q-ME-05 (E-ME-04); the sizes check D-ME-03.

### M-ME-06 Clipping (F-ME-11)
**Open** — `_internal\originals\batch-ab\Demonstration-Manipulability-Ellipsoid-of-a-Robot-Arm-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**.
**Do** —
1. Set θ = (61π/32, 23π/32, 3π/32) with clicks on the dial rims (the ticks are π/16 = 2 steps apart): **θ₁** one step
   beyond the tick just below "0" (−3π/32, the same as 61π/32); **θ₂** one step before the "3π/4" label, towards
   "π/2" (23π/32); **θ₃** one step beyond the tick just above "0" (3π/32).
2. Zoom the notebook (Window > Magnification > 200 %) and look at the top of the ellipsoid.
3. Set θ = (10π/32, −23π/32, −3π/32): **θ₁** on the tick between "π/4" and the next long tick (5π/16); **θ₂** one step
   before the "−3π/4" label, towards "−π/2"; **θ₃** one step beyond the tick just below "0". Look at the ellipsoid's
   bottom.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_manipulability-ellipsoid.md`, under the heading M-ME-06: whether the ellipsoid is cut flat at the top (step 2) and at the bottom (step 3).
**Save** — File > Close, Don't Save.
**Port** — the same on the page (arrow keys on a focused dial locator move it one π/32 step, A-ME-02).
**Expected / what it decides** — cut flat at z = 5 and z = −1 in both (F-ME-11); hardly visible.

### M-ME-07 Degenerate drawings (Q-ME-03, K-ME-06)
**Open** — `_internal\originals\batch-ab\Demonstration-Manipulability-Ellipsoid-of-a-Robot-Arm-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**.
**Do** —
1. Click the **θ₂** dial at "0"; zoom 400 % on the dial: is there an arrowhead at radius 0.3 under the hand, and which
   way does it point?
2. Click **θ₂** at "π/2" and **θ₃** at "0" (rank 1); look at the blue ring in the picture.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_manipulability-ellipsoid.md`, under the heading M-ME-07: step 1: arrowhead yes/no and its direction; step 2: the ring's look (a line, a very thin ellipse, nothing).
**Save** — File > Close, Don't Save.
**Port** — the same on the page; port: arrowhead pointing +x (Q-TK-05), a line-like ring.
**Expected / what it decides** — settles K-ME-06.

### M-ME-08 Rotation and Initial settings (K-ME-07, N-ME-03)
**Open** — `_internal\originals\batch-ab\Demonstration-Manipulability-Ellipsoid-of-a-Robot-Arm-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — none (live state).
**Do** —
1. Drag in the 3D picture to rotate it by about 90°; then click the **θ₁** dial somewhere.
2. ⊕ > **Initial Settings**.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_manipulability-ellipsoid.md`, under the heading M-ME-08: step 1: rotation kept yes/no; step 2: does the picture return to the opening picture (μ = 671.892×10^-3).
**Save** — File > Close, Don't Save.
**Port** — the same on the page (`scene-canvas-workspace`, then "Initial settings" `reset`); the port keeps the rotation.
**Expected / what it decides** — settles K-ME-07; Initial Settings = the saved state (N-ME-03, A-ME-01).

### M-ME-09 Autorun (N-ME-04)
**Open** — `_internal\originals\batch-ab\Demonstration-Manipulability-Ellipsoid-of-a-Robot-Arm-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**.
**Do** —
1. ⊕ > **Autorun**; watch for 30 s; stop it (click in the panel or ⊕ > Autorun again).
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_manipulability-ellipsoid.md`, under the heading M-ME-09: which dials move, in which order, their ranges (θ₁ 0…2π, θ₂ −π/4…5π/4, θ₃ −3π/4…3π/4?) and the time
per sweep.
**Save** — File > Close, Don't Save.
**Port** — the port has no Autorun (I-ME-02); nothing to compare.
**Expected / what it decides** — the data for I-ME-02 (N-ME-04).
