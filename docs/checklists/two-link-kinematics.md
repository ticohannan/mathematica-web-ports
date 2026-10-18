# Manual checks — Forward and Inverse Kinematics for Two-Link Arm (`demos/two-link-kinematics/`)

Each item compares the original in Mathematica with the port, as an operator procedure (owner rule R-B). The general
procedure — starting Mathematica, Enable Dynamics, the ⊕ menu, invisible locators, waiting, recording, saving,
sending results back — is in [`docs/MATHEMATICA_CHECKS.md`](../MATHEMATICA_CHECKS.md). Record every result in the
test-run file `_internal\test-runs\<YYYY-MM-DD>_two-link-kinematics.md` (create it with
`npm run test-run -- two-link-kinematics`). Differences are findings, not failures of the tester.

Original notebook (all items):
`_internal\originals\batch-ab\Demonstration-Forward-and-Inverse-Kinematics-for-Two-Link-Arm-1-0-0-definition.nb`.
Port (all items): `http://127.0.0.1:8080/demos/two-link-kinematics/` (after `npm run serve`).

Where things are in the original (snapshot 1, `docs/original-snapshots/two-link-kinematics-1.png`): the Manipulate panel
has the controls in one column on the left and the picture on the right. From top to bottom on the left: the slider
labelled **r₁** (a small **+** button right of the slider opens its animation panel with a value field; the current
value is printed right of the **+**), the dial labelled **θ₁** (red hand), the dial labelled **θ₂** (blue hand), the
check box labelled **elbow up?**, and the green disk labelled **joint velocity** (the joint-velocity pad, with its own
cross-hair locator). In the picture (x and y from −3 to 3, the centre of the blue disk is (0, 0), the blue disk has
radius 2): the black cross-hair circle is the end-effector locator (pEnd), the green one the velocity locator (pVel);
both are drawn icons over invisible locators. The **⊕** button is at the top-right corner of the whole panel. In the
port the same controls carry the test ids `slider-r1`, `value-r1`, `plus-r1`, `locator-p1`, `locator-p2`,
`check-IsElbowUp`, `locator-jointVel`, `locator-pEnd`, `locator-pVel` and `reset` ("Initial settings").

### M-TK-01 Texts
**Open** — `_internal\originals\batch-ab\Demonstration-Forward-and-Inverse-Kinematics-for-Two-Link-Arm-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter). Open the port's page next to it.
**Prepare** — nothing; scroll the notebook to the title.
**Do** —
1. Compare the title and the caption (the paragraph under "Caption") with the port's title and caption.
2. Scroll to "Details & Citations": compare every paragraph with the port's Details, in particular the matrix
   A<sub>i</sub> (four rows), the line "ξ = J(q) q′" and the paragraph about the pseudoinverse.
3. Compare the reference [1] (Spong, Hutchinson, Vidyasagar) and the related links under "External Links".
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_two-link-kinematics.md`, under the heading M-TK-01: for each of title, caption, each Details paragraph, reference, links: "same" or the differing words.
**Save** — File > Close, Don't Save.
**Port** — the same texts in the page's caption, Details and credits sections (test ids `details`, `credits`).
**Expected / what it decides** — identical texts (F-TK-25), including the original's errors E-TK-01 and E-TK-02.

### M-TK-02 Opening picture (snapshot 1)
**Open** — `_internal\originals\batch-ab\Demonstration-Forward-and-Inverse-Kinematics-for-Two-Link-Arm-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — do not touch any control: the notebook opens in its live state. Afterwards also click **⊕** (top-right
of the panel) > **Initial Settings** and look again.
**Do** —
1. Look at the picture on the right without moving the mouse over it.
2. Check: straight gray arm along +x, black icon at (2, 0) (right edge of the blue disk), green icon above it at
   (2, 1) with a green arrow up to it, two half-transparent blue arrows of length about 2.24 up and down from (2, 0),
   no pink ellipse; **elbow up?** ticked; the locator of the **joint velocity** pad at (0.4, 0.2); a gray dot on link 1
   at x = 0.25; a red arrowhead near (0.46, 0.19) and a blue one near (1.65, 0.13).
3. Measure on screen (a screenshot and an image viewer are fine) the length in pixels of the arrowheads of the long
   blue arrows and of the two arc arrows on the arm.
4. Do the same after ⊕ > Initial Settings.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_two-link-kinematics.md`, under the heading M-TK-02: yes/no for each point of step 2; the three arrowhead lengths (px) and the picture width (px); whether
Initial Settings gives the same picture.
**Save** — File > Close, Don't Save.
**Port** — open the page, then press "Initial settings" (`reset`); the port must show the same picture both times.
**Expected / what it decides** — the picture of snapshot 1 both times (F-TK-16, F-TK-19…F-TK-24); the arrowhead sizes
settle the fitted length of D-TK-04 and K-TK-05.

### M-TK-03 Inverse kinematics
**Open** — `_internal\originals\batch-ab\Demonstration-Forward-and-Inverse-Kinematics-for-Two-Link-Arm-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — ⊕ (top-right of the panel) > **Initial Settings**.
**Do** —
1. Press on the black icon in the picture (at (2, 0)) and drag it slowly in a circle of radius about 1 around the
   centre of the blue disk (about 5 seconds per turn); watch the arm, the **θ₁** and **θ₂** dial hands and the
   **elbow up?** box.
2. Drag it outwards beyond the blue disk to the picture's right edge and around; watch where the icon stops.
3. Release it at about (1, 1). Click **elbow up?** (left column) to untick it; click again to tick it.
4. Drag the black icon to about (−1.2, 0.3) (left of the centre) and look whether the elbow is above or below the
   tip with **elbow up?** ticked.
5. Drag the black icon back to the right edge (arm straight) and click **elbow up?** once.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_two-link-kinematics.md`, under the heading M-TK-03: any jump of the arm in steps 1–2 (where); the radius at which the icon stops (step 2); the arm before
and after each click in step 3; elbow above or below in step 4; in step 5 whether the box changed and whether the arm
moved.
**Save** — File > Close, Don't Save.
**Port** — the same drags on the page (black icon = `locator-pEnd`) and clicks on the "elbow up?" box
(`check-IsElbowUp`).
**Expected / what it decides** — no jumps inside the disk, the icon stops on the circle of radius 2; step 3 flips the
arm between the two solutions; step 4: elbow below the tip (E-TK-03); step 5: box changes, arm does not (Q-TK-02).
Confirms F-TK-04, F-TK-06, F-TK-09…F-TK-11.

### M-TK-04 Singular configurations (K-TK-01, Q-TK-04)
**Open** — `_internal\originals\batch-ab\Demonstration-Forward-and-Inverse-Kinematics-for-Two-Link-Arm-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — ⊕ (top-right of the panel) > **Initial Settings** (r₁ = 1, arm straight).
**Do** —
1. (a) Drag the black icon to the right edge of the blue disk and beyond (arm straight). Then drag the green icon
   about 1 unit to the left of the blue arrows' line and release.
2. (b) Click the small **+** right of the **r₁** slider; in the value field that opens type `1.5` and press Enter.
   Repeat (a).
3. (c) Still r₁ = 1.5: drag the black icon into the white hole in the middle (the arm folds), then drag the green
   icon about 0.5 units sideways and release.
4. (d) Turn the **θ₂** dial by pressing on its rim a few degrees above its "0" mark (right side of the dial), then
   drag the green icon about 0.5 units off the very thin pink ellipse.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_two-link-kinematics.md`, under the heading M-TK-04: for each of (a)–(d): where the green icon ends (on the blue line, at its end, on the black icon, …) and
the position of the locator of the **joint velocity** pad (inside or on the rim, approximate coordinates).
**Save** — File > Close, Don't Save.
**Port** — the same four cases on the page (green icon = `locator-pVel`, r1 typed in `value-r1`, θ₂ dial =
`locator-p2`).
**Expected / what it decides** — (a), (b), (c): the green icon slides along the long (blue) axis and stops at its end
(singular branch, F-TK-14); (d): the green icon falls almost onto the black icon and the pad locator jumps to the rim
(Q-TK-04, E-TK-04, as snapshot 3). Settles the SVD tolerance lead K-TK-01 for rounding-singular arms (b, c).

### M-TK-05 Inner boundary (K-TK-03)
**Open** — `_internal\originals\batch-ab\Demonstration-Forward-and-Inverse-Kinematics-for-Two-Link-Arm-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**; click the **+** right of the **r₁** slider, type `1.5` in the value field,
press Enter (a white hole of radius 1 appears).
**Do** —
1. Make sure **elbow up?** is ticked. Drag the black icon from (1.5, 0) straight into the white hole and release at
   about (0.3, 0.4).
2. Look at the **elbow up?** box.
3. Untick **elbow up?**, drag the black icon out to (1.5, 0) and back into the hole as in step 1.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_two-link-kinematics.md`, under the heading M-TK-05: after step 2 and after step 3: ticked or unticked; the angle shown by the **θ₂** dial hand.
**Save** — File > Close, Don't Save.
**Port** — the same on the page (`value-r1`, `check-IsElbowUp`, `locator-pEnd`).
**Expected / what it decides** — the port predicts θ₂ = π and the box unticked in both cases; an original that keeps
the tick in step 2 means D = −0.9999999999999999 (θ₂ = −(π − 1.5·10⁻⁸)). Settles K-TK-03 together with H-TK-06/07.

### M-TK-06 Dials
**Open** — `_internal\originals\batch-ab\Demonstration-Forward-and-Inverse-Kinematics-for-Two-Link-Arm-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**.
**Do** —
1. Press (single click) inside the **θ₁** dial, halfway between its centre and its "π/2" label. Watch the dial's
   cross-hair locator, the red hand and the red arc, and the arm.
2. Look closely at the **θ₂** dial (still at 0): is there a small arrowhead on the hand pointing right?
3. Press as exactly as possible on the centre of the **θ₁** dial (where the hand starts).
4. After step 3, drag the black icon in the picture a little.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_two-link-kinematics.md`, under the heading M-TK-06: step 1: where the locator went (on the rim at π/2?) and whether the arm turned to point up; step 2:
yes/no; step 3: what happened (nothing, error box, arm disappears, pink error frame…) and the message text if any;
step 4: whether the picture recovers.
**Save** — File > Close, Don't Save.
**Port** — the same presses on the page's dials (`locator-p1`, `locator-p2`).
**Expected / what it decides** — step 1: locator on the rim at π/2, arm up (F-TK-02, setter Normalize); step 2: yes
(Q-TK-05); step 3: the port ignores the press (D-TK-07); the original's behaviour settles K-TK-04 with H-TK-13.

### M-TK-07 Velocity pad
**Open** — `_internal\originals\batch-ab\Demonstration-Forward-and-Inverse-Kinematics-for-Two-Link-Arm-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**; drag the black icon to about (1, 1) so that the arm is bent.
**Do** —
1. In the **joint velocity** pad (bottom of the left column), drag its locator slowly outside the light-green disk
   and around it once.
2. Watch the red arc at the base and the blue arc at the elbow in the picture, and the green arrow.
3. Drag the pad locator as close as possible to the pad's centre (0, 0) and release.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_two-link-kinematics.md`, under the heading M-TK-07: step 1: does the locator stay on the disk's rim; step 2: do the arcs grow and shrink with the pad's
coordinates; step 3: whether the arcs become points and whether the red point is larger than the blue one.
**Save** — File > Close, Don't Save.
**Port** — the same on the page (`locator-jointVel`).
**Expected / what it decides** — locator held on the rim (F-TK-05); arcs of length = joint velocity in radians; at
(0, 0) two points, the red one larger (F-TK-22).

### M-TK-08 Picking a locator (D-TK-06)
**Open** — `_internal\originals\batch-ab\Demonstration-Forward-and-Inverse-Kinematics-for-Two-Link-Arm-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**.
**Do** —
1. Press (and release without moving) about 5 screen pixels to the left of the black icon's centre. Note whether the
   icon jumps to the press point. ⊕ > Initial Settings.
2. Repeat at 10 px and at 15 px.
3. Drag the locator of the **joint velocity** pad to its centre (the green icon moves onto the black icon). Press
   on the two icons and drag down by about 1 unit.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_two-link-kinematics.md`, under the heading M-TK-08: for 5, 10, 15 px: jump yes/no; step 3: which icon moved (black or green).
**Save** — File > Close, Don't Save.
**Port** — the same on the page; the port grabs without a jump within 12 CSS px and moves pEnd on a tie.
**Expected / what it decides** — the no-jump distance of the original (D-TK-06); on a tie the port moves pEnd (the
first locator in control order).

### M-TK-09 Details of the drawing (K-TK-05, K-TK-06)
**Open** — `_internal\originals\batch-ab\Demonstration-Forward-and-Inverse-Kinematics-for-Two-Link-Arm-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**.
**Do** —
1. Zoom the notebook to 200 % (Window > Magnification > 200 %) and look right after the word "Workspace" for a small
   red dot.
2. Turn the **θ₂** dial to about 3π/4 (press on its rim near the "3π/4" label) so that the θ₂ label appears in the
   picture; look right after the θ₂ label for a small green dot.
3. Compare the arrowheads of the short arc arrows and of the long blue arrows (same size or scaled).
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_two-link-kinematics.md`, under the heading M-TK-09: dots present yes/no (steps 1, 2); arrowheads same size / scaled.
**Save** — File > Close, Don't Save.
**Port** — the port draws no such dots and one fitted arrowhead length.
**Expected / what it decides** — dots absent in the live original = snapshot artefacts (K-TK-06); the arrowhead rule
for K-TK-05.

### M-TK-10 r1 slider (Q-TK-07, K-TK-09)
**Open** — `_internal\originals\batch-ab\Demonstration-Forward-and-Inverse-Kinematics-for-Two-Link-Arm-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**; press on the **θ₂** dial's rim at its "π" label (left side) so that the arm
is folded.
**Do** —
1. Drag the **r₁** slider's thumb slowly from 1 to the right end; watch the arm.
2. Click the **+** right of the **r₁** slider, type `2.5` in the value field, press Enter; look at the picture.
3. Type `-0.5` in the same field, press Enter; look at the picture.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_two-link-kinematics.md`, under the heading M-TK-10: step 1: whether and where the arm jumps; steps 2 and 3: what is drawn (arm, hole, error messages,
value shown next to the slider).
**Save** — File > Close, Don't Save.
**Port** — the same on the page (`slider-r1`, `value-r1`); the port clamps typed values to 0…2.
**Expected / what it decides** — the arm jumps when the tip is pushed out of the hole (Q-TK-07); steps 2–3 settle
K-TK-09 with H-TK-20 (D-TK-05).
