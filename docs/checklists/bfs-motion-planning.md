# Manual checks — Breadth-first search robot motion planning (`demos/bfs-motion-planning/`)

Each item compares the original in Mathematica with the port, as an operator procedure (owner rule R-B). The general
procedure — starting Mathematica, Enable Dynamics, the ⊕ menu, invisible locators, waiting, recording, saving,
sending results back — is in [`docs/MATHEMATICA_CHECKS.md`](../MATHEMATICA_CHECKS.md). Record every result in the
test-run file `_internal\test-runs\<YYYY-MM-DD>_bfs-motion-planning.md` (create it with `npm run test-run -- bfs-motion-planning`).
Differences are findings, not failures of the tester.

Original notebook (all items): `_internal\originals\batch-ab\Demonstration-Breadth-First-Search-Robot-Motion-Planning-1-0-0-definition.nb`.
Port (all items): `http://127.0.0.1:8080/demos/bfs-motion-planning/` (after `npm run serve`).

Where things are in the original (snapshot 1): two sliders at the top, labelled **Q** (italic, upper) and **P** (italic,
lower); a small **+** button right of each slider opens its animation panel (value field, play, step buttons); the value
is printed right of the **+**. Below them one picture: on the left "robot workspace" with the arm and two brown obstacle
disks with cross-hair locators (obstacle 1 at the top, (1.1, 1.1); obstacle 2 at the bottom, (1.1, −1.1)); on the right
the phase space titled "robot phase space, path length = … rads", a grey cost map with dark-red obstacle cells, a green
path and two green cross-hair glyphs: the **start glyph** (left one, at (4.5, 0)) and the **goal glyph** (right one, at
(5.5, 0), on the blue cell). The **⊕** button is at the top-right corner of the panel. The test-run file for a day is
`_internal\test-runs\<YYYY-MM-DD>_bfs-motion-planning.md` (one per app and day; write the item ID as a heading).

### M-BF-01 Texts
**Open** — `_internal\originals\batch-ab\Demonstration-Breadth-First-Search-Robot-Motion-Planning-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter). Open the port's page next to it.
**Prepare** — nothing; scroll to the title.
**Do** —
1. Compare title and caption with the port's.
2. Scroll to "Details & Citations"; compare the five paragraphs and the reference with the port's Details and credits.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_bfs-motion-planning.md`, under the heading M-BF-01: per text: "same" or the differing words.
**Save** — File > Close, Don't Save.
**Port** — the page's caption, `details` and `credits`.
**Expected / what it decides** — identical texts (F-BF-19), including the claims of E-BF-01, E-BF-03 and E-BF-06.

### M-BF-02 Opening picture (snapshot 1)
**Open** — `_internal\originals\batch-ab\Demonstration-Breadth-First-Search-Robot-Motion-Planning-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — do not touch any control (live state); afterwards also ⊕ (top-right) > **Initial Settings**.
**Do** —
1. Check: **Q** 2, **P** 1; title "robot phase space, path length = 1.57 rads"; grey cost map white around the start
   glyph and darker outwards; four dark-red bands; a horizontal green path of 9 cells ending in a blue cell under the
   goal glyph; the arm at the goal configuration with link 2 light grey; brown obstacles with black outlines; both
   glyphs green; texts black.
2. Measure on a screenshot: the text height of "robot workspace", the θ₁ arc's arrowhead length, the glyph diameter,
   the picture width (px).
3. Repeat step 1 after ⊕ > Initial Settings.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_bfs-motion-planning.md`, under the heading M-BF-02: yes/no per point of step 1; the four measurements; whether Initial Settings changes anything.
**Save** — File > Close, Don't Save.
**Port** — open the page and press "Initial settings" (`reset`); compare.
**Expected / what it decides** — the picture of snapshot 1 both times (F-BF-14…F-BF-18); the measurements check D-BF-04.

### M-BF-03 Moving along the path (K-BF-08)
**Open** — `_internal\originals\batch-ab\Demonstration-Breadth-First-Search-Robot-Motion-Planning-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**.
**Do** —
1. Click the **P** slider's thumb, then press the Left arrow key repeatedly from 1 down to 0, watching the blue cell
   and the arm.
2. Click the **+** right of the **P** slider and press the play button; watch one cycle; stop it.
3. Rebuild snapshot 4 approximately: click the **+** right of **Q**, type `6`, Enter; drag obstacle 1's cross-hair to
   about (−1.08, 1.22); drag the start glyph to about (3.34, −1.24) and the goal glyph to about (5.29, 1.43). Count the
   green path cells n (including both ends; zoom with Window > Magnification > 200 %).
4. In the **P** panel's value field type `0.14`, Enter; count which cell from the start is blue.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_bfs-motion-planning.md`, under the heading M-BF-03: steps 1–2: does the blue cell move one cell at a time from goal to start; step 3: n; step 4: the index of
the blue cell and the value shown right of the **P** slider.
**Save** — File > Close, Don't Save.
**Port** — the same on the page (`slider-progress`, `plus-progress`, `play-progress`, `value-progress`, `value-Quality`,
the locators).
**Expected / what it decides** — cell-by-cell motion (F-BF-13); in step 4 the blue cell is number
Ceiling(0.14 n) computed in machine arithmetic (for n = 50: cell 8, Q-BF-09); settles K-BF-08 for the slider.

### M-BF-04 Goal inside an obstacle region (Q-BF-05, K-BF-01)
**Open** — `_internal\originals\batch-ab\Demonstration-Breadth-First-Search-Robot-Motion-Planning-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**.
**Do** —
1. Drag the goal glyph (right glyph) up and to the right onto the dark-red band at the upper right and release
   inside it.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_bfs-motion-planning.md`, under the heading M-BF-04: the title text exactly as shown (e.g. "path length = ∞ rads", "Round[∞, 0.01]"); whether the path is one
cell at the goal; where the arm is and whether its outline is red; whether the obstacle outlines are red; the colours
of both glyphs.
**Save** — if the title shows something other than "∞": File > Save As…
`_internal\originals\saved\bfs-motion-planning_M-BF-04_<YYYY-MM-DD>.nb` (golden data for K-BF-01), then close;
otherwise File > Close, Don't Save.
**Port** — the same drag on the page (`locator-pConfigF`); the port shows "path length = ∞ rads" (D-BF-06).
**Expected / what it decides** — one-cell path, arm red at the goal, glyphs green at P = 1 (Q-BF-05, Q-BF-06, E-BF-03,
E-BF-05); the label text settles K-BF-01.

### M-BF-05 Start inside an obstacle region (Q-BF-04, Q-BF-06)
**Open** — `_internal\originals\batch-ab\Demonstration-Breadth-First-Search-Robot-Motion-Planning-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**.
**Do** —
1. Drag the start glyph (left glyph) down and to the left onto the dark-red band at the lower left; release.
2. Look at the cost map; then set **P** to 0 (drag its thumb to the left end).
3. Set **P** back to 1.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_bfs-motion-planning.md`, under the heading M-BF-05: step 1: does the cost map still spread from the start; step 2: arm colour (red outline?) and both glyph
colours; step 3: both glyph colours.
**Save** — File > Close, Don't Save.
**Port** — the same on the page (`locator-pConfigI`, `slider-progress`).
**Expected / what it decides** — the map spreads (Q-BF-04); P = 0: arm and both glyphs red; P = 1: both glyphs green
(Q-BF-06, E-BF-05).

### M-BF-06 Moving an obstacle (K-BF-06)
**Open** — `_internal\originals\batch-ab\Demonstration-Breadth-First-Search-Robot-Motion-Planning-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**.
**Do** —
1. Press on obstacle 1's cross-hair, drag it slowly towards the base and keep the button down for 2 s; watch the phase
   space.
2. Release; watch again.
3. Click the **+** right of **Q**, type `10`, Enter; repeat steps 1–2 and time (s) how long the fine picture takes
   after release.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_bfs-motion-planning.md`, under the heading M-BF-06: while held: coarse grid (8 × 8 cells at Q = 2) with a coarse path yes/no; after release: fine grid yes/no;
the time at Q = 10.
**Save** — File > Close, Don't Save.
**Port** — the same on the page (`locator-pObs`, `value-Quality`).
**Expected / what it decides** — coarse while held, fine after release (F-BF-08, Q-BF-13); settles K-BF-06 with
H-BF-20/21.

### M-BF-07 Picking (K-BF-07)
**Open** — `_internal\originals\batch-ab\Demonstration-Breadth-First-Search-Robot-Motion-Planning-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings** before each step.
**Do** —
1. (a) Press on empty phase space near the lower-left corner.
2. (b) Press exactly halfway between the two glyphs (at (5, 0)).
3. (c) Press about 5, 10 and 15 screen pixels left of the start glyph's centre.
4. (d) Press in the workspace at about (0.5, −1.5).
5. (e) Press exactly on the goal glyph and drag it 1 cm up.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_bfs-motion-planning.md`, under the heading M-BF-07: (a) which glyph moved there; (b) which glyph moved; (c) jump yes/no at 5, 10, 15 px; (d) which obstacle
moved; (e) whether only the glyph moved (and snapped back) or the goal changed (path and label change).
**Save** — File > Close, Don't Save.
**Port** — the same on the page; port: (a) the nearer glyph, (b) the start glyph, (c) no jump within 12 px, (d)
obstacle 2, (e) the goal changes.
**Expected / what it decides** — the picking rule of D-BF-05 and the draggable glyph primitive of K-BF-07.

### M-BF-08 Non-integer Q (K-BF-05)
**Open** — `_internal\originals\batch-ab\Demonstration-Breadth-First-Search-Robot-Motion-Planning-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**.
**Do** —
1. Click the **+** right of the **Q** slider; type `5.31` in the value field; press Enter.
2. Read the value right of the slider and the title "path length = … rads"; count cells along a band step (zoom
   200 %).
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_bfs-motion-planning.md`, under the heading M-BF-08: the value shown; the title's number; whether the grid looks like 84 × 84 cells.
**Save** — if Q shows 5.31: File > Save As… `_internal\originals\saved\bfs-motion-planning_M-BF-08_<YYYY-MM-DD>.nb`,
then close; otherwise File > Close, Don't Save.
**Port** — the port's value field snaps to whole numbers (D-BF-03); the model (golden tests) takes 5.31.
**Expected / what it decides** — 84 × 84 cells and the label 1.65 per the reference (K-BF-05, H-BF-08).

### M-BF-09 Angle arcs (Q-BF-12)
**Open** — `_internal\originals\batch-ab\Demonstration-Breadth-First-Search-Robot-Motion-Planning-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**; drag the goal glyph to about (5.29, 1.43) (as snapshot 4's goal).
**Do** —
1. Look at the elbow arc (θ₂) of the arm: its length, the arrowhead position and direction, and whether a θ₂ label
   is shown.
2. Drag the goal glyph slowly downwards until the θ₂ label appears; note where.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_bfs-motion-planning.md`, under the heading M-BF-09: step 1: short arc between θ₁ + θ₂ and θ₁ yes/no, arrowhead at θ₁ + θ₂ pointing counter-clockwise yes/no,
label shown yes/no; step 2: does the label appear when |θ₂| passes 45°.
**Save** — File > Close, Don't Save.
**Port** — the same on the page (`locator-pConfigF`).
**Expected / what it decides** — short arc, head against the arc, label only for |θ₂| > 45° (Q-BF-12, F-BF-16).

### M-BF-10 Start or goal dragged below the bottom edge (K-BF-03)
**Open** — `_internal\originals\batch-ab\Demonstration-Breadth-First-Search-Robot-Motion-Planning-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**; open the Messages window (Window > Messages) and clear it.
**Do** —
1. Drag the start glyph slowly straight down past the bottom edge of the phase space and release below it.
2. Look at the glyph, the cost map, the path and the Messages window.
3. ⊕ > Initial Settings; do the same with the goal glyph.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_bfs-motion-planning.md`, under the heading M-BF-10: per glyph: where it lands (top edge?); whether the cost map and path are recomputed normally; any message
text (copy it); whether the picture keeps the old cost map or shows a broken path.
**Save** — if messages appeared: File > Save As… `_internal\originals\saved\bfs-motion-planning_M-BF-10_<YYYY-MM-DD>.nb`,
then close; otherwise File > Close, Don't Save.
**Port** — the same drags on the page (`locator-pConfigI`, `locator-pConfigF`); port: the glyph jumps to the top edge,
row 1, normal recomputation.
**Expected / what it decides** — settles K-BF-03 (row 1 or row 0, D-BF-07) with H-BF-14/22; a failure confirms E-BF-07.
