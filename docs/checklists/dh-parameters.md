# Manual checks — Denavit-Hartenberg Parameters for a Three-Link Robot (`demos/dh-parameters/`)

Each item compares the original in Mathematica with the port, as an operator procedure (owner rule R-B). The general
procedure — starting Mathematica, Enable Dynamics, the ⊕ menu, waiting, recording, saving, sending results back — is in
[`docs/MATHEMATICA_CHECKS.md`](../MATHEMATICA_CHECKS.md). Record every result in the test-run file
`_internal\test-runs\<YYYY-MM-DD>_dh-parameters.md` (create it with `npm run test-run -- dh-parameters`). Differences
are findings, not failures of the tester.

Original notebook (all items):
`_internal\originals\batch-ab\Demonstration-Denavit-Hartenberg-Parameters-for-a-Three-Link-Robot-1-0-0-definition.nb`.
Port (all items): `http://127.0.0.1:8080/demos/dh-parameters/` (after `npm run serve`).

Where things are in the original (snapshot 1, `docs/original-snapshots/dh-parameters-1.png`): the controls are in a
column on the left, the 3D picture on the right. Three groups separated by lines, one per joint i = 1, 2, 3: the button
row **jᵢ** (buttons **Revolute** and **Prismatic**), then the sliders **θᵢ**, **dᵢ**, **rᵢ**, **αᵢ**; below the last line
the slider **grip**. Every slider has a small **+** right of it that opens its animation panel (value field, play, step
buttons); the value is printed right of the **+** (θ and α as fractions of π, e.g. "5π/32"). The picture can be rotated
by dragging it. The **⊕** button is at the top-right corner of the panel. In the port the same controls carry the test
ids `setter-j1-Revolute` … `setter-j3-Prismatic`, `slider-theta1` … `slider-g`, `value-*`, `plus-*`, `play-*`,
`scene-canvas-workspace` and `reset` ("Initial settings").

### M-DH-01 Texts
**Open** — `_internal\originals\batch-ab\Demonstration-Denavit-Hartenberg-Parameters-for-a-Three-Link-Robot-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter). Open the port's page next to it.
**Prepare** — nothing; scroll to the title.
**Do** —
  1. Compare title and caption with the port's.
  2. Scroll to "Details & Citations"; compare every paragraph, the A<sub>i</sub> formula and matrix, the five DH tables entry
   by entry with their sentences, and both references.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_dh-parameters.md`, under the heading M-DH-01: per text and table: "same" or the differing entries.
**Save** — File > Close, Don't Save.
**Port** — the page's caption, `details` and `credits`.
**Expected / what it decides** — identical texts (F-DH-15), including E-DH-01 and E-DH-02.

### M-DH-02 Opening picture (F-DH-06, F-DH-11, D-DH-01)
**Open** — `_internal\originals\batch-ab\Demonstration-Denavit-Hartenberg-Parameters-for-a-Three-Link-Robot-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — do not touch any control (live state); afterwards also ⊕ (top-right) > **Initial Settings**.
**Do** —
  1. Compare with `docs/original-snapshots/dh-parameters-1.png`: peach ground disc, three light-blue joint cylinders
   with translucent grey axes and links, red/blue/green frame arrows, grey gripper; controls in three groups and grip.
  2. Measure on a screenshot the ground disc's width and the picture's width (px).
  3. ⊕ > Initial Settings; repeat step 1.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_dh-parameters.md`, under the heading M-DH-02: yes/no for step 1; the two widths; same after Initial Settings yes/no.
**Save** — File > Close, Don't Save.
**Port** — open the page and press "Initial settings" (`reset`); compare (`scene-canvas-workspace`).
**Expected / what it decides** — snapshot 1 (F-DH-06, F-DH-11); the widths check the framing of D-DH-01.

### M-DH-03 The snapshot robots (Q-DH-01 … Q-DH-04)
**Open** — `_internal\originals\batch-ab\Demonstration-Denavit-Hartenberg-Parameters-for-a-Three-Link-Robot-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings** before each robot. Set values by clicking the **+** of a slider and typing in its
value field (π fractions as e.g. `-13 Pi/16`), Enter; joint types with the **jᵢ** buttons.
**Do** —
  1. Snapshot 2 (SCARA): θ₁ −13π/16, d₁ 1, r₁ 1, α₁ 0; θ₂ 7π/32, d₂ 0, r₂ 1, α₂ π; θ₃ 0, d₃ 0.81, r₃ 0, α₃ 0; grip 0.52;
   j₃ **Prismatic**.
  2. Snapshot 3 (cylindrical): θ₁ −3π/16, d₁ 1, r₁ 0, α₁ 0; θ₂ 0, d₂ 0.74, r₂ 0, α₂ −π/2; θ₃ 0, d₃ 0.89, r₃ 0, α₃ 0;
   grip 1; j₂ and j₃ **Prismatic**.
  3. Snapshot 4 (planar): θ₁ 0, d₁ 0, r₁ 0.8, α₁ 0; θ₂ −9π/32, d₂ 0, r₂ 0.8, α₂ 0; θ₃ −3π/16, d₃ 0, r₃ 0.5, α₃ −π/2;
   grip 1.
  4. Snapshot 5 (spherical wrist): θ₁ 5π/32, d₁ 1, r₁ 0, α₁ −π/2; θ₂ 5π/32, d₂ 0, r₂ 0, α₂ π/2; θ₃ 27π/32, d₃ 0.77,
   r₃ 0, α₃ 0; grip 0.49.
  5. ⊕ > Initial Settings; click **Prismatic** in j₁ and set d₁ to 0.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_dh-parameters.md`, under the heading M-DH-03: steps 1–4: like the snapshot picture yes/no (differences); step 5: does the axis bar of joint 1 reach about
one unit below the base, through the ground.
**Save** — File > Close, Don't Save.
**Port** — the same values on the page (`setter-j*`, `value-*`); compare.
**Expected / what it decides** — snapshots 2–5 (golden-snapshot labels T-DH-18 … T-DH-21); step 5 as Q-DH-02.

### M-DH-04 Value fields (K-DH-01, K-DH-05)
**Open** — `_internal\originals\batch-ab\Demonstration-Denavit-Hartenberg-Parameters-for-a-Three-Link-Robot-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**.
**Do** —
  1. Click the **+** of **θ₁**; type `1` in its value field, Enter; then `0.3`, Enter.
  2. Click the **+** of **d₁**; type `1.5`, Enter; then `-0.2`, Enter.
  3. Drag the **d₂** slider's thumb to the right and back to the far left end.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_dh-parameters.md`, under the heading M-DH-04: per typed value: the label shown (exact, snapped to π/32 or 0.01, clamped, kept out of range) and whether
the picture changes; step 3: the label "0." or "0".
**Save** — File > Close, Don't Save.
**Port** — the same on the page (`value-*`); the port clamps to the range and snaps to the nearest slider position (D-DH-07; a typed whole number on a position stays exact), and shows "0." after a move.
**Expected / what it decides** — settles K-DH-01 and K-DH-05 (D-DH-07, Q-DH-05).

### M-DH-05 Animation (K-DH-02)
**Open** — `_internal\originals\batch-ab\Demonstration-Denavit-Hartenberg-Parameters-for-a-Three-Link-Robot-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**.
**Do** —
  1. Click the **+** of **θ₁**; press the play button; watch for 20 s; stop it.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_dh-parameters.md`, under the heading M-DH-05: time for one sweep from −π to π (s); direction; loops or bounces; whether the label keeps showing fractions
of π.
**Save** — File > Close, Don't Save.
**Port** — the same on the page (`plus-*`, `play-*`).
**Expected / what it decides** — settles K-DH-02 (F-DH-05).

### M-DH-06 Rotation and framing (K-DH-03, K-DH-04)
**Open** — `_internal\originals\batch-ab\Demonstration-Denavit-Hartenberg-Parameters-for-a-Three-Link-Robot-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**.
**Do** —
  1. Drag in the picture to rotate it by about 90° around the vertical; then move the **θ₂** slider a little.
  2. ⊕ > Initial Settings; drag the **θ₂** slider slowly from −π to π; watch the size of the ground disc.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_dh-parameters.md`, under the heading M-DH-06: step 1: rotation kept yes/no; step 2: smallest and largest ground-disc width (px).
**Save** — File > Close, Don't Save.
**Port** — the same on the page (`scene-canvas-workspace`, `slider-theta*`); the port keeps the rotation.
**Expected / what it decides** — settles K-DH-04 and gives the breathing range for K-DH-03 (F-DH-14, D-DH-01, D-DH-05).

### M-DH-07 Extremes
**Open** — `_internal\originals\batch-ab\Demonstration-Denavit-Hartenberg-Parameters-for-a-Three-Link-Robot-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**.
**Do** —
  1. Set **α₁** to its right end (π), then its left end (−π).
  2. Set **θ₁**, **θ₂**, **θ₃** to π and then to −π.
  3. Set **r₃** to 0 and **grip** to 0.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_dh-parameters.md`, under the heading M-DH-07: per step a screenshot name and whether the two ends give the same picture (steps 1–2); step 3: the
gripper's look (pointing along d, closed).
**Save** — File > Close, Don't Save.
**Port** — the same on the page; compare the pictures.
**Expected / what it decides** — same frames for ±π (F-DH-07); the gripper rule of Q-DH-04 (F-DH-13).
