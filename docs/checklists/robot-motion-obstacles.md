# Manual checks — Robot motion with obstacles (`demos/robot-motion-obstacles/`)

Each item compares the original in Mathematica with the port, as an operator procedure (owner rule R-B). The general
procedure — starting Mathematica, Enable Dynamics, the ⊕ menu, invisible locators, waiting, recording, saving,
sending results back — is in [`docs/MATHEMATICA_CHECKS.md`](../MATHEMATICA_CHECKS.md). Record every result in the
test-run file `_internal\test-runs\<YYYY-MM-DD>_robot-motion-obstacles.md` (create it with `npm run test-run -- robot-motion-obstacles`).
Differences are findings, not failures of the tester.

Original notebook (all items): `_internal\originals\batch-ab\Demonstration-Robot-Motion-with-Obstacles-1-0-0-definition.nb`.
Port (all items): `http://127.0.0.1:8080/demos/robot-motion-obstacles/` (after `npm run serve`).

Where things are in the original (snapshot 1): one slider at the top, labelled **Q** (italic); a small **+** button right
of the slider opens its animation panel (value field, play, step buttons); the value is printed right of the **+**. Below
it one picture: on the left "robot workspace" with the gray two-link arm and two brown obstacle disks, each with a
cross-hair locator on it (obstacle 1 at the top, (1.1, 1.1); obstacle 2 at the bottom, (1.1, −1.1)); on the right
"robot phase space", a square with black bands and a green cross-hair glyph in the middle (the configuration locator).
The **⊕** button is at the top-right corner of the panel. The test-run file for a day is
`_internal\test-runs\<YYYY-MM-DD>_robot-motion-obstacles.md` (one per app and day; write the item ID as a heading).

### M-RM-01 Texts
**Open** — `_internal\originals\batch-ab\Demonstration-Robot-Motion-with-Obstacles-1-0-0-definition.nb` with
Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any cell
(no Shift+Enter). Open the port's page next to it.
**Prepare** — nothing; scroll to the title.
**Do** —
1. Compare title and caption with the port's.
2. Scroll to "Details & Citations"; compare the five paragraphs and the reference (Spong, Hutchinson, Vidyasagar
   2006) with the port's Details and credits.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_robot-motion-obstacles.md`, under the heading M-RM-01: per text: "same" or the differing words.
**Save** — File > Close, Don't Save.
**Port** — the page's caption, `details` and `credits`.
**Expected / what it decides** — identical texts (F-RM-17), including "32Q unit squares" (E-RM-01).

### M-RM-02 Opening picture (snapshot 1)
**Open** — `_internal\originals\batch-ab\Demonstration-Robot-Motion-with-Obstacles-1-0-0-definition.nb` with
Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any cell
(no Shift+Enter).
**Prepare** — do not touch any control (live state). Afterwards also ⊕ (top-right) > **Initial Settings**.
**Do** —
1. Check: **Q** shows 2; arm gray with black edges, link 1 pointing down-left, link 2 back up-right over it, both θ
   arcs with arrowheads and both labels θ₁, θ₂; brown obstacles with black outlines and cross-hairs at (1.1, ±1.1);
   phase space with four black diagonal bands (64 × 64 cells) and a green glyph in the middle; frame left red,
   right red dashed, bottom blue, top blue dashed; texts "robot workspace", "robot phase space", θ₁, θ₂ in gray.
2. Measure on a screenshot: the height of the text "robot workspace", the arrowhead length of the θ₁ arc, the glyph
   diameter (px), and the picture width (px).
3. Repeat step 1 after ⊕ > Initial Settings.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_robot-motion-obstacles.md`, under the heading M-RM-02: yes/no per point of step 1; the four measurements; whether Initial Settings changes anything.
**Save** — File > Close, Don't Save.
**Port** — open the page and press "Initial settings" (`reset`); compare.
**Expected / what it decides** — the picture of snapshot 1 both times (F-RM-12…F-RM-16); the measurements check
D-RM-05.

### M-RM-03 Moving an obstacle
**Open** — `_internal\originals\batch-ab\Demonstration-Robot-Motion-with-Obstacles-1-0-0-definition.nb` with
Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any cell
(no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings** (Q = 2).
**Do** —
1. Press on the cross-hair of obstacle 1 (upper brown disk) and drag it slowly (about 3 s) towards the base (0, 0)
   and back; keep the mouse button down and look at the phase space.
2. Release and look again.
3. Click the **+** right of the **Q** slider, type `10` in the value field, press Enter; repeat steps 1–2.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_robot-motion-obstacles.md`, under the heading M-RM-03: whether the bands are coarse (16 × 16 at Q = 2, 80 × 80 at Q = 10) while the button is held; how long
(s) the fine grid takes to appear after release at Q = 2 and at Q = 10.
**Save** — File > Close, Don't Save.
**Port** — the same on the page (`locator-pObs`, `value-Quality`).
**Expected / what it decides** — coarse grid while dragging, fine grid after release (F-RM-11, Q-RM-03).

### M-RM-04 ControlActive (K-RM-02)
**Open** — `_internal\originals\batch-ab\Demonstration-Robot-Motion-with-Obstacles-1-0-0-definition.nb` with
Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any cell
(no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**.
**Do** —
1. (a) Drag the **Q** slider's thumb from 2 to 6 and hold the mouse button for 2 s; then release.
2. (b) Click the **+** right of the **Q** slider; in the panel press the play button (triangle); watch the phase
   space for one cycle; press it again to stop.
3. (c) Drag only the green glyph in the phase space around for 3 s.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_robot-motion-obstacles.md`, under the heading M-RM-04: (a) grid coarse (8Q cells) while held yes/no, fine (32Q) after release yes/no; (b) every animation step
fine or coarse; (c) does the grid change at all.
**Save** — File > Close, Don't Save.
**Port** — the same on the page (`slider-Quality`, `plus-Quality`, `play-Quality`, `locator-pConfig`); the port: (a)
coarse then fine, (b) fine, (c) no change.
**Expected / what it decides** — settles K-RM-02 (D-RM-03).

### M-RM-05 Non-integer Q (K-RM-01)
**Open** — `_internal\originals\batch-ab\Demonstration-Robot-Motion-with-Obstacles-1-0-0-definition.nb` with
Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any cell
(no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**; drag obstacle 1 to about (0.233, 0.685) and obstacle 2 to about (1.917,
0.87) (as snapshot 2).
**Do** —
1. Click the **+** right of the **Q** slider; type `5.31` in the value field; press Enter.
2. Look at the value shown right of the slider and count the cells along one edge of a band step (zoom 200 %:
   Window > Magnification).
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_robot-motion-obstacles.md`, under the heading M-RM-05: the value shown (5.31 or 5 or other); whether the grid looks like snapshot 2 (169 × 169 cells).
**Save** — if Q shows 5.31: File > Save As… `_internal\originals\saved\robot-motion-obstacles_M-RM-05_<YYYY-MM-DD>.nb`
(a state with typed Q, golden data for K-RM-01), then close; otherwise File > Close, Don't Save.
**Port** — the port cannot take 5.31 (D-RM-04); its model can (golden tests of snapshots 2 and 4).
**Expected / what it decides** — K-RM-01: if the original accepts 5.31, the port's value field should too (a
proposed change); the picture shows E-RM-02.

### M-RM-06 Torus wrap (Q-RM-01)
**Open** — `_internal\originals\batch-ab\Demonstration-Robot-Motion-with-Obstacles-1-0-0-definition.nb` with
Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any cell
(no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**.
**Do** —
1. Press on the green glyph in the phase space and drag it slowly right, past the right (red dashed) edge, keep the
   mouse 1 s outside, then drag back in.
2. Repeat past the left, top and bottom edges.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_robot-motion-obstacles.md`, under the heading M-RM-06: per edge: does the glyph jump to the opposite edge; does it stay there while the pointer is outside;
does it follow the pointer back in; the θ arc shown (full circle or none).
**Save** — File > Close, Don't Save.
**Port** — the same on the page (`locator-pConfig`).
**Expected / what it decides** — jump to the opposite edge and stay there while outside (Q-RM-01, E-RM-03); any
difference is a finding for F-RM-06.

### M-RM-07 Picking (D-RM-06, K-RM-05)
**Open** — `_internal\originals\batch-ab\Demonstration-Robot-Motion-with-Obstacles-1-0-0-definition.nb` with
Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any cell
(no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings** before each of the steps below.
**Do** —
1. (a) Press on empty workspace near obstacle 2 (about (0.5, −1.5)).
2. (b) Press in the phase space far from the glyph (near its lower-left corner).
3. (c) Press exactly on the base of the arm (0, 0).
4. (d) Press about 5, 10 and 15 screen pixels from the cross-hair of obstacle 1 (reset between presses).
5. (e) Press in the empty strip between workspace and phase space, at about x = 2.5, y = 0.
6. (f) Press exactly on the green glyph and drag it 1 cm.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_robot-motion-obstacles.md`, under the heading M-RM-07: (a) which locator moved; (b) did the glyph jump; (c) which obstacle moved; (d) jump yes/no at 5, 10,
15 px; (e) which locator moved and where it stopped; (f) whether only the glyph moved and snapped back, or the arm
changed.
**Save** — File > Close, Don't Save.
**Port** — the same on the page; port: (a) obstacle 2, (b) glyph jumps, (c) obstacle 1, (d) no jump within 12 px,
(f) the configuration changes.
**Expected / what it decides** — the picking rules of D-RM-06 and the draggable glyph primitive of K-RM-05.

### M-RM-08 Collision colours (Q-RM-04)
**Open** — `_internal\originals\batch-ab\Demonstration-Robot-Motion-with-Obstacles-1-0-0-definition.nb` with
Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any cell
(no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**.
**Do** —
1. Drag the green glyph slowly onto the nearest black band and off again.
2. Move it along the band's edge in small steps and look at the colour of the glyph and of the cell under it.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_robot-motion-obstacles.md`, under the heading M-RM-08: whether glyph, arm outline and both obstacle outlines are red exactly while the arm overlaps a disk;
whether a red glyph on a white cell or a green glyph on a black cell occurs (where).
**Save** — File > Close, Don't Save.
**Port** — the same on the page (`locator-pConfig`).
**Expected / what it decides** — red outlines and glyph in collision (F-RM-09, F-RM-14, F-RM-16); mismatches at
band edges are expected in both (Q-RM-04).
