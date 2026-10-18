# Manual checks — Distance norms (`demos/distance-norms/`)

Each item compares the original in Mathematica with the port, as an operator procedure (owner rule R-B). The general
procedure — starting Mathematica, Enable Dynamics, the ⊕ menu, invisible locators, waiting, recording, saving,
sending results back — is in [`docs/MATHEMATICA_CHECKS.md`](../MATHEMATICA_CHECKS.md). Record every result in the
test-run file `_internal\test-runs\<YYYY-MM-DD>_distance-norms.md` (create it with `npm run test-run -- distance-norms`).
Differences are findings, not failures of the tester.

Original notebook (all items):
`_internal\originals\batch-ab\Demonstration-Distance-Norms-in-Robot-Workspace-and-Phase-Space-1-0-0-definition.nb`.
Port (all items): `http://127.0.0.1:8080/demos/distance-norms/` (after `npm run serve`).

Where things are in the original (snapshots 1 and 2): the controls are in one column on the left, the plot on the right.
From top to bottom: the button row labelled **norm space** (buttons **workspace** and **phase space**), the button row
labelled **norm type** (buttons **1**, **2**, **3**, **∞**), the slider labelled **d** and the slider labelled **r₁** (each
with a small **+** button right of the slider that opens its animation panel with a value field; the value is printed
right of the **+**: "½" and "1" at the start), the dial labelled **θ₁** (red hand) and the dial labelled **θ₂** (blue hand),
each with a cross-hair locator on its rim. The plot has a frame with ticks from −2 to 2. The **⊕** button is at the
top-right corner of the panel. An invisible locator (the end-effector locator of the kinematics Demonstration) sits at
(2, 0) in the plot; a press anywhere in the plot moves it and nothing else. In the port the same controls carry the same
labels; **Initial settings** above the plot stands for ⊕ > Initial Settings.

### M-DN-01 Texts
**Open** — `_internal\originals\batch-ab\Demonstration-Distance-Norms-in-Robot-Workspace-and-Phase-Space-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter). Open the port's page next to it.
**Prepare** — nothing; scroll to the title.
**Do** —
1. Compare title and caption with the port's.
2. Scroll to "Details & Citations"; compare every paragraph: the vector norm formulas, the workspace and phase-space
   norms, the sentence about "Snapshot 1" and the unit disk, the containment L₁ ⊆ L₂ ⊆ L₃ ⊆ L∞.
3. Compare the related links.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_distance-norms.md`, under the heading M-DN-01: per text: "same" or the differing words.
**Save** — File > Close, Don't Save.
**Port** — the page's caption, `details` and `credits`.
**Expected / what it decides** — identical texts (F-DN-18), including E-DN-01 and E-DN-02 and the two formula slips
E-DN-03 (the general p-norm drawn as a root with index 1/p) and E-DN-04 (no closing bar in the phase-space L∞ formula).

### M-DN-02 Opening picture (snapshot 1)
**Open** — `_internal\originals\batch-ab\Demonstration-Distance-Norms-in-Robot-Workspace-and-Phase-Space-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — do not touch any control (live state); afterwards also ⊕ (top-right) > **Initial Settings**.
**Do** —
1. Check: **phase space** and **∞** selected, **d** shows ½, **r₁** 1; arm along +x then straight up; a red dot on link 1
   at x = 0.25; blue arc and blue θ₂ label at the elbow; "Robot Arm" vertical on link 2; the curved quadrilateral from
   about (0.04, 1.02) to (1.72, 0.06) drawn over the arm (the arm shows through, tinted).
2. Compare the frame, tick labels, outline width and colours with the port.
3. Click **workspace** in the **norm space** row, press on the **θ₁** dial's rim at its "π/2" label, and look right
   after "Robot Arm" for a small blue dot (zoom 200 %: Window > Magnification).
4. ⊕ > Initial Settings; repeat step 1.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_distance-norms.md`, under the heading M-DN-02: yes/no per point of step 1; differences in step 2; step 3: dot yes/no; whether Initial Settings gives the
same picture.
**Save** — File > Close, Don't Save.
**Port** — open the page and press "Initial settings" (`reset`); compare.
**Expected / what it decides** — the picture of snapshot 1 (F-DN-14…F-DN-17); the dot settles K-DN-04 (artefact if absent).

### M-DN-03 Norms and spaces (snapshots 2–5)
**Open** — `_internal\originals\batch-ab\Demonstration-Distance-Norms-in-Robot-Workspace-and-Phase-Space-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings** (phase space, ∞, opening angles).
**Do** —
1. In the **norm type** row click **1**, **2**, **3**, **∞** in turn; look at the region each time.
2. Click **workspace** in the **norm space** row; click **1**, **2**, **3**, **∞** again.
3. With **workspace** and **∞**: press on the **θ₁** dial's rim at its "π/2" label, then press on the **θ₂** dial's rim
   just above its "0" mark (θ₂ about 0.01).
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_distance-norms.md`, under the heading M-DN-03: step 1: shape per button (compare with snapshots 5, 4, 3, 1); step 2: diamond, circle, rounded square,
square around the tip (1, 1) yes/no; step 3: the square's top edge position (just inside the frame top at 2.5?).
**Save** — File > Close, Don't Save.
**Port** — the same on the page (`setter-p-1` … `setter-p-Infinity`, `setter-cORw-workspace`, `locator-p1`, `locator-p2`).
**Expected / what it decides** — the shapes of snapshots 1–5 (F-DN-10…F-DN-13); in the notebook's snapshot pictures
3–6 no **norm space** button is selected (Q-DN-07), in the live original one always is.

### M-DN-04 Folds (snapshot 6, K-DN-01)
**Open** — `_internal\originals\batch-ab\Demonstration-Distance-Norms-in-Robot-Workspace-and-Phase-Space-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**; click **1** in the **norm type** row.
**Do** —
1. Press on the **θ₁** dial's rim at about 20° (a little above the "0" mark, a quarter of the way to "π/4"), then on the
**θ₂** dial's rim at about −17° (below its "0" mark, a little less than halfway to "−π/4").
  2. Compare the region with snapshot 6 (a thin crescent along the outer circle with a kink).
  3. Click **∞**; press on the **θ₂** dial's rim exactly at "0"; drag the **d** slider's thumb to the right end.
  4. Look for parts of the region that are darker (covered twice).
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_distance-norms.md`, under the heading M-DN-04: step 2: like snapshot 6 yes/no; step 3: does the region cover the whole disk of radius 2; step 4: darker
overlaps yes/no and where.
**Save** — File > Close, Don't Save.
**Port** — the same on the page; the port draws overlapping sheets darker (D-DN-02).
**Expected / what it decides** — settles K-DN-01 (darker or uniform overlaps) with H-DN-04/05.

### M-DN-05 Degenerate arms (K-DN-02)
**Open** — `_internal\originals\batch-ab\Demonstration-Distance-Norms-in-Robot-Workspace-and-Phase-Space-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings** (phase space).
**Do** —
1. Drag the **r₁** slider's thumb to the left end (0).
2. Drag it to the right end (2).
3. Click **workspace** in the **norm space** row; repeat steps 1–2.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_distance-norms.md`, under the heading M-DN-05: per case: a line along the circle of radius 2, nothing, an error box or message (copy its text).
**Save** — File > Close, Don't Save.
**Port** — the same on the page (`slider-r1`, `setter-cORw-workspace`); in workspace the port draws the usual ball
around the tip.
**Expected / what it decides** — settles K-DN-02 with H-DN-07/08.

### M-DN-06 Invisible locator (Q-DN-01)
**Open** — `_internal\originals\batch-ab\Demonstration-Distance-Norms-in-Robot-Workspace-and-Phase-Space-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**.
**Do** —
1. Press anywhere in the plot (e.g. at (−1, −1)) and drag about 2 cm; release.
2. Move the mouse slowly over the point where you released; watch the cursor shape.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_distance-norms.md`, under the heading M-DN-06: whether anything visible changed; whether the cursor changes over the release point.
**Save** — File > Close, Don't Save.
**Port** — the same on the page (`locator-pEnd`): nothing visible changes.
**Expected / what it decides** — nothing changes (Q-DN-01, F-DN-07).

### M-DN-07 Dials (K-DN-03)
**Open** — `_internal\originals\batch-ab\Demonstration-Distance-Norms-in-Robot-Workspace-and-Phase-Space-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**.
**Do** —
1. Press inside the **θ₁** dial halfway between its centre and its "3π/4" label.
2. Press as exactly as possible on the centre of the **θ₂** dial.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_distance-norms.md`, under the heading M-DN-07: step 1: locator on the rim at 3π/4, hand, arm and region follow yes/no; step 2: what happens (nothing,
error box, region disappears, message text).
**Save** — File > Close, Don't Save.
**Port** — the same on the page (`locator-p1`, `locator-p2`); the port ignores a press at the exact centre.
**Expected / what it decides** — step 1 as F-DN-05; step 2 settles K-DN-03 with H-DN-11.

### M-DN-08 Slider ends and typed values (K-DN-05, K-DN-06)
**Open** — `_internal\originals\batch-ab\Demonstration-Distance-Norms-in-Robot-Workspace-and-Phase-Space-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**.
**Do** —
1. Drag the **d** slider's thumb to the right end; read the value right of the **+**.
2. Click the **+** right of the **d** slider; in the value field type `0`, Enter; then `-1`, Enter; then `4`, Enter.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_distance-norms.md`, under the heading M-DN-08: step 1: the value (3.14 or π); step 2: per typed value the value shown and what the plot shows (message
text if any).
**Save** — File > Close, Don't Save.
**Port** — the same on the page (`slider-bound`, `value-bound`); the port clamps to 0.01 … π.
**Expected / what it decides** — settles K-DN-05 (π reachable?) and K-DN-06 (typed d ≤ 0), D-DN-04.
