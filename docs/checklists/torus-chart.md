# Manual checks — Chart for a Torus (`demos/torus-chart/`)

Each item compares the original in Mathematica with the port, as an operator procedure (owner rule R-B). The general
procedure — starting Mathematica, Enable Dynamics, the ⊕ menu, waiting, recording, saving, sending results back — is in
[`docs/MATHEMATICA_CHECKS.md`](../MATHEMATICA_CHECKS.md). Record every result in the test-run file
`_internal\test-runs\<YYYY-MM-DD>_torus-chart.md` (create it with `npm run test-run -- torus-chart`). Differences are
findings, not failures of the tester.

Original notebook (all items): `_internal\originals\batch-ab\Demonstration-Chart-for-a-Torus-1-0-0-definition.nb`.
Port (all items): `http://127.0.0.1:8080/demos/torus-chart/` (after `npm run serve`).

Where things are in the original (snapshot 1, `docs/original-snapshots/torus-chart-1.png`): the controls are in a column
on the left, the 3D picture on the right. At the top the slider labelled **Torus → Plane** (λ; a small **+** right of it
opens its animation panel with a value field, play and step buttons; the value, "2.", is printed right of the **+**);
below it the dial labelled **θ** (red hand) and the dial labelled **ϕ** (blue hand), each with a cross-hair locator on
its rim; a press anywhere on a dial moves its locator to the rim in that direction. The picture shows the surface in a
box with the stage label ("2-Torus", "Cylinder" or "Plane") above it and a green ball at the point (θ, ϕ); rotate it by
dragging. The **⊕** button is at the top-right corner of the panel. In the port the same controls carry the test ids
`slider-lambda`, `value-lambda`, `plus-lambda`, `play-lambda`, `locator-p1`, `locator-p2`, `scene-canvas` and `reset`
("Initial settings").

### M-TC-01 Texts
**Open** — `_internal\originals\batch-ab\Demonstration-Chart-for-a-Torus-1-0-0-definition.nb` with Mathematica 15.0.1
via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any cell (no Shift+Enter).
Open the port's page next to it.
**Prepare** — nothing; scroll to the title.
**Do** —
1. Compare title and caption (including "Two rotary dials determine a point (θ, φ) (highlighted in green)" and "there
   is no global continuous mapping since the Euclidean plane extends to infinity") with the port's.
2. Scroll to "Details & Citations"; compare the four paragraphs including the atlas question.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_torus-chart.md`, under the heading M-TC-01: per text: "same" or the differing words.
**Save** — File > Close, Don't Save.
**Port** — the page's caption, `details` and `credits`.
**Expected / what it decides** — identical texts (F-TC-15), including E-TC-03.

### M-TC-02 Opening picture (snapshot 1)
**Open** — `_internal\originals\batch-ab\Demonstration-Chart-for-a-Torus-1-0-0-definition.nb` with Mathematica 15.0.1
via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any cell (no Shift+Enter).
**Prepare** — do not touch anything (live state).
**Do** —
1. Check: **Torus → Plane** at "2.", label "Plane", a blue square with red edges in the box, the green ball near the
   corner (1, 1, 0); **θ** hand at about −57° (lower right), **φ** hand at about +55°.
2. Compare framing, box, tick labels and colours with `docs/original-snapshots/torus-chart-1.png`; measure the box
   width and picture width (px).
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_torus-chart.md`, under the heading M-TC-02: yes/no per point of step 1; differences of step 2; the two widths.
**Save** — File > Close, Don't Save.
**Port** — open the page; compare (`scene-canvas`, `value-lambda`, `locator-p1`, `locator-p2`).
**Expected / what it decides** — snapshot 1 (F-TC-09, F-TC-12, F-TC-13); framing D-TC-07.

### M-TC-03 Dial picking (F-TC-04, K-TC-03, K-TC-04)
**Open** — `_internal\originals\batch-ab\Demonstration-Chart-for-a-Torus-1-0-0-definition.nb` with Mathematica 15.0.1
via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any cell (no Shift+Enter).
**Prepare** — none (live state).
**Do** —
1. (a) Press anywhere inside the **θ** dial, halfway between its centre and its "3π/4" label.
2. (b) Drag the **θ** locator around once.
3. (c) Drag it far outside the dial to the lower-left corner of the whole panel and beyond; look at the hand.
4. (d) Zoom 400 % (Window > Magnification); press exactly at the centre of the **θ** dial.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_torus-chart.md`, under the heading M-TC-03: (a) locator on the rim in that direction yes/no; (b) stays on the rim yes/no; (c) the angle the hand
shows; (d) what is shown (error, unchanged hand, hand at 0, ball missing) and any message text.
**Save** — File > Close, Don't Save.
**Port** — the same on the page (`locator-p1`); port: (c) the angle of the pointer clamped to the dial's range,
(d) the previous angles are kept.
**Expected / what it decides** — settles K-TC-04 (c) and K-TC-03 (d) with H-TC-11.

### M-TC-04 Dial arc direction (Q-TC-01)
**Open** — `_internal\originals\batch-ab\Demonstration-Chart-for-a-Torus-1-0-0-definition.nb` with Mathematica 15.0.1
via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any cell (no Shift+Enter).
**Prepare** — ⊕ (top-right) > **Initial Settings**.
**Do** —
1. Press on the **θ** dial's rim at the "−π/4" label (lower right); zoom 400 % on the small black arc near the centre.
2. Press on the rim at the "3π/4" label; look again.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_torus-chart.md`, under the heading M-TC-04: per step: does the arc run clockwise or counter-clockwise from the "0" direction to the hand; which way
the arrowhead at the hand end points.
**Save** — File > Close, Don't Save.
**Port** — the same on the page (`locator-p1`).
**Expected / what it decides** — −45°: clockwise arc with a counter-clockwise (backwards) arrowhead; +135°:
counter-clockwise arc and arrowhead (Q-TC-01, E-TC-01).

### M-TC-05 The morph and its labels (F-TC-01, F-TC-08, K-TC-05)
**Open** — `_internal\originals\batch-ab\Demonstration-Chart-for-a-Torus-1-0-0-definition.nb` with Mathematica 15.0.1
via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any cell (no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings** (λ = 0).
**Do** —
1. Drag the **Torus → Plane** thumb slowly from 0 to 2 (about 10 s); note the label at each stage.
2. Click the **+**; type `0.5` in the value field, Enter; then `1.2`, Enter.
3. Press the play button in the panel; watch one run; stop it.
4. Drag the thumb to about 1.3 and release (do not type).
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_torus-chart.md`, under the heading M-TC-05: step 1: the stages seen (torus, opening torus, funnel, cylinder at 1, half-pipe, square at 2) and the λ
where the label changes; step 2: the labels; step 3: does the morph run; step 4: the file name (see Save).
**Save** — after step 4: File > Save As… `_internal\originals\saved\torus-chart_M-TC-05_<YYYY-MM-DD>.nb` (the stored λ
shows the continuous slider's resolution, K-TC-05), then close.
**Port** — the same on the page (`slider-lambda`, `value-lambda`, `plus-lambda`, `play-lambda`).
**Expected / what it decides** — "Cylinder" from 0.5 and "Plane" from 1.2 (F-TC-08, E-TC-02); the saved λ settles
K-TC-05 (D-TC-06).

### M-TC-06 Look of the surface (F-TC-12, D-TC-02, K-TC-01, K-TC-02)
**Open** — `_internal\originals\batch-ab\Demonstration-Chart-for-a-Torus-1-0-0-definition.nb` with Mathematica 15.0.1
via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any cell (no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**.
**Do** —
1. Type λ = `0.13`, then `0.56`, then `1.45` in the **Torus → Plane** value field (snapshots 2–4).
2. Each time look at: blue outside / orange inside, the red boundary, the thin dark horizontal mesh rings (count them
   on one side), the brightness of the blue on top, the green ball's highlight.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_torus-chart.md`, under the heading M-TC-06: per λ: the ring count, the colours (a screenshot name), the ball's look.
**Save** — File > Close, Don't Save.
**Port** — the same on the page (`value-lambda`, `scene-canvas`).
**Expected / what it decides** — data for K-TC-01 (lighting) and K-TC-02 (mesh levels), D-TC-02.

### M-TC-07 Rotation (F-TC-14, K-TC-07)
**Open** — `_internal\originals\batch-ab\Demonstration-Chart-for-a-Torus-1-0-0-definition.nb` with Mathematica 15.0.1
via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any cell (no Shift+Enter).
**Prepare** — none (live state).
**Do** —
1. Drag in the 3D picture to rotate it by about 90°; then move the **Torus → Plane** slider a little.
2. Rotate again; then press on the **φ** dial somewhere.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_torus-chart.md`, under the heading M-TC-07: rotation kept yes/no after each step.
**Save** — File > Close, Don't Save.
**Port** — the same on the page (`scene-canvas`); the port keeps the rotation.
**Expected / what it decides** — settles K-TC-07 (D-TC-07).

### M-TC-08 Initial Settings (A-TC-01)
**Open** — `_internal\originals\batch-ab\Demonstration-Chart-for-a-Torus-1-0-0-definition.nb` with Mathematica 15.0.1
via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any cell (no Shift+Enter).
**Prepare** — none.
**Do** —
1. ⊕ > **Initial Settings**.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_torus-chart.md`, under the heading M-TC-08: λ, both hands, the label, the ball's position.
**Save** — File > Close, Don't Save.
**Port** — press "Initial settings" (`reset`) on the page.
**Expected / what it decides** — λ = 0, both hands at 0, "2-Torus", ball on the outer equator at (2π, π, 0) in both
(A-TC-01).
