# Manual checks — Rapidly exploring random tree (`demos/rrt/`)

Each item compares the original in Mathematica with the port, as an operator procedure (owner rule R-B). The general
procedure — starting Mathematica, Enable Dynamics, the ⊕ menu, invisible locators, waiting, recording, saving,
sending results back — is in [`docs/MATHEMATICA_CHECKS.md`](../MATHEMATICA_CHECKS.md). Record every result in the
test-run file `_internal\test-runs\<YYYY-MM-DD>_rrt.md` (create it with `npm run test-run -- rrt`).
Differences are findings, not failures of the tester.

Original notebook (all items):
`_internal\originals\batch-ab\Demonstration-Rapidly-Exploring-Random-Tree-RRT-and-RRT-1-0-0-definition.nb`.
Port (all items): `http://127.0.0.1:8080/demos/rrt/` (after `npm run serve`).

Where things are in the original (snapshot 1): the controls are in a column on the left, the picture on the right. From
top to bottom: the heading "tree type" with the buttons **Random Tree**, **RRT**, **RRT\***; the heading "obstacle type"
with a popup menu (**none**, **sparse**, **narrow passage**, **concave**); the heading "number of nodes to add:" with the
buttons **1**, **10**, **100**, **200**, **500**; the heading "exploration bias" with a slider and its value right of it;
the heading "goal radius" with a slider and its value. These two sliders have no **+** button and no value field (their
value can only be dragged; the arrow keys move a clicked slider by one step). In the picture: the label at the top, the
tree (red points, black edges), the blue walls and obstacles, the yellow goal disk with the cross-hair **goal locator**
at (18, −18). The **⊕** button is at the top-right corner of the panel. The test-run file for a day is
`_internal\test-runs\<YYYY-MM-DD>_rrt.md` (one per app and day; write the item ID as a heading).

### M-RT-01 Texts
**Open** — `_internal\originals\batch-ab\Demonstration-Rapidly-Exploring-Random-Tree-RRT-and-RRT-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter). Open the port's page next to it.
**Prepare** — nothing; scroll to the title.
**Do** —
1. Compare title and caption with the port's.
2. Scroll to "Details & Citations"; compare the three paragraphs and the four references.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_rrt.md`, under the heading M-RT-01: per text: "same" or the differing words.
**Save** — File > Close, Don't Save.
**Port** — the page's caption, `details` and `credits`.
**Expected / what it decides** — identical texts (F-RT-23), including E-RT-03…05.

### M-RT-02 Opening picture (snapshot 1)
**Open** — `_internal\originals\batch-ab\Demonstration-Rapidly-Exploring-Random-Tree-RRT-and-RRT-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — do not touch any control (live state); afterwards also ⊕ (top-right) > **Initial Settings**.
**Do** —
1. Check: label "1 node, goal not yet reached"; white square with blue border walls; the narrow-passage walls with
     gaps at the upper right (x 5…6, y 5…10) and lower left (x −6…−5, y −9…−7); one red point at the centre; yellow goal
     disk of radius 1 with the locator at (18, −18).
2. Check the controls: **RRT** selected, popup **narrow passage**, buttons 1 … 500, "exploration bias" value 0, "goal
     radius" value 1.
3. Measure on a screenshot the red point's diameter, the label's text height and the picture width (px).
4. ⊕ > Initial Settings; repeat steps 1–2.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_rrt.md`, under the heading M-RT-02: yes/no per point of steps 1–2; the three measurements; same after Initial Settings yes/no.
**Save** — File > Close, Don't Save.
**Port** — open the page and press "Initial settings" (`reset`); compare.
**Expected / what it decides** — the picture of snapshot 1 (F-RT-07, F-RT-20); measurements check D-RT-03.

### M-RT-03 Growing trees and the last five nodes (K-RT-04)
**Open** — `_internal\originals\batch-ab\Demonstration-Rapidly-Exploring-Random-Tree-RRT-and-RRT-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**.
**Do** —
1. Click the button **10** under "number of nodes to add:" once; watch the label and the dashed line.
2. Click **100** once; watch again.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_rrt.md`, under the heading M-RT-03: the final labels; whether the count visibly runs up one by one at the end of each batch (how many steps,
roughly how fast).
**Save** — File > Close, Don't Save.
**Port** — the same on the page (`button-add-10`, `button-add-100`); the port shows the last five nodes one per frame.
**Expected / what it decides** — "11 nodes", then "111 nodes"; the last five one by one settles K-RT-04 (Q-RT-12).

### M-RT-04 Tree types and obstacles
**Open** — `_internal\originals\batch-ab\Demonstration-Rapidly-Exploring-Random-Tree-RRT-and-RRT-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**.
**Do** —
1. Click **Random Tree**, then **200**; look at the tree. Click **RRT**, then **200**; then **RRT\***, then **200**.
2. Each time check that switching the tree type resets the label to "1 node".
3. Choose **sparse**, **concave** and **none** in the "obstacle type" popup; with each, grow 200 nodes with **RRT**.
4. Zoom 400 % (Window > Magnification) on the concave obstacle and on the walls: look for edges lying on or touching a
     wall edge.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_rrt.md`, under the heading M-RT-04: per tree type a one-line description (blob, spreads, straighter branches); resets yes/no; step 4: any edge
touching or lying along an obstacle edge (where).
**Save** — File > Close, Don't Save (the owner state is made in M-RT-12).
**Port** — the same on the page (`setter-treeType-*`, `popup-obstacles`, `button-add-200`).
**Expected / what it decides** — F-RT-01, F-RT-02; edges along clockwise-obstacle edges are possible (Q-RT-01, E-RT-01).

### M-RT-05 Goal locator (K-RT-09)
**Open** — `_internal\originals\batch-ab\Demonstration-Rapidly-Exploring-Random-Tree-RRT-and-RRT-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**; click **100** twice (a tree of 201 nodes).
**Do** —
1. Press on the goal locator and drag it to the far upper-left corner and beyond.
2. Drag it slowly over the tree; watch the disk colour and the dark green path.
3. Press on empty space (e.g. at (−10, 10)).
4. Press about 5, 10 and 15 screen pixels from the goal locator's centre (put it back between presses).
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_rrt.md`, under the heading M-RT-05: step 1: where it stops (±19?); step 2: disk turns green when a node is inside yes/no, path follows yes/no;
step 3: does the goal jump there; step 4: jump yes/no at 5, 10, 15 px.
**Save** — File > Close, Don't Save.
**Port** — the same on the page (`locator-finalGoal`); port: no jump within 12 px.
**Expected / what it decides** — F-RT-06; the no-jump distance settles K-RT-09 (D-RT-06).

### M-RT-06 Exploration bias (Q-RT-02)
**Open** — `_internal\originals\batch-ab\Demonstration-Rapidly-Exploring-Random-Tree-RRT-and-RRT-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**; choose **none** in the popup; click the "exploration bias" slider's thumb and
press the Right arrow key until the value reads 0.9 (18 presses); "goal radius" stays 1.
**Do** —
1. Click **100** twice.
2. Zoom on the goal: count the visible points near it; read the label.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_rrt.md`, under the heading M-RT-06: the node count in the label; whether the tree runs straight to the goal; whether the count rose although
no new points appear; whether the green newest point sits on the goal.
**Save** — File > Close, Don't Save (the owner state is made in M-RT-12).
**Port** — the same on the page (`slider-explorationBias`, `button-add-100`, `popup-obstacles`).
**Expected / what it decides** — duplicate nodes on the goal (Q-RT-02, E-RT-02).

### M-RT-07 Tooltips
**Open** — `_internal\originals\batch-ab\Demonstration-Rapidly-Exploring-Random-Tree-RRT-and-RRT-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**; click **RRT** and **100**.
**Do** —
1. Hold the mouse still over the root (centre) until a tooltip appears.
2. The same over a node one step from the root, then over a deep node.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_rrt.md`, under the heading M-RT-07: the three tooltip texts exactly (e.g. "0", "1.", "3.41421").
**Save** — File > Close, Don't Save.
**Port** — the same on the page (each red point's tooltip).
**Expected / what it decides** — "0", "1.", up to six digits (F-RT-22, Q-RT-09).

### M-RT-08 Goal disk around the root (K-RT-06)
**Open** — `_internal\originals\batch-ab\Demonstration-Rapidly-Exploring-Random-Tree-RRT-and-RRT-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings** (1 node, goal radius 1).
**Do** —
1. Drag the goal locator to about (0.5, 0.5) without adding nodes.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_rrt.md`, under the heading M-RT-08: the label exactly ("1 node, path length 0" or "… 0."), the disk colour.
**Save** — File > Close, Don't Save.
**Port** — the same on the page (`locator-finalGoal`); the port shows "0".
**Expected / what it decides** — settles K-RT-06 with H-RT-13 (F-RT-21).

### M-RT-09 Large RRT\* trees (K-RT-05)
**Open** — `_internal\originals\batch-ab\Demonstration-Rapidly-Exploring-Random-Tree-RRT-and-RRT-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**; click **RRT\*** (narrow passage).
**Do** —
1. Click **500** five times, waiting each time until the label stops changing; time each press with a stopwatch.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_rrt.md`, under the heading M-RT-09: the time per press (s); the label after each; whether `$Aborted` or an error appears; the final count
(expected 2501).
**Save** — File > Close, Don't Save.
**Port** — the same on the page (`setter-treeType-*`, `button-add-500`); record the port's times too.
**Expected / what it decides** — settles K-RT-05 (D-RT-02).

### M-RT-10 Slider value display (K-RT-07)
**Open** — `_internal\originals\batch-ab\Demonstration-Rapidly-Exploring-Random-Tree-RRT-and-RRT-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**.
**Do** —
1. Click the "exploration bias" slider's thumb; press the Right arrow key once, then the Left arrow key once; read the
     value after each.
2. Drag the "goal radius" slider to 2.5 (arrow keys: 15 presses Right from 1); read the value.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_rrt.md`, under the heading M-RT-10: the three value texts exactly.
**Save** — File > Close, Don't Save.
**Port** — the same on the page (`slider-explorationBias`, `value-explorationBias`, `slider-goalRadius`, `value-goalRadius`).
**Expected / what it decides** — "0.05", then "0." (as snapshots 2–6), "2.5" (F-RT-04, K-RT-07, D-RT-04).

### M-RT-11 Goal radius 0
**Open** — `_internal\originals\batch-ab\Demonstration-Rapidly-Exploring-Random-Tree-RRT-and-RRT-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**; popup **none**; "goal radius" dragged to its left end (0); "exploration bias"
set to 0.9 (arrow keys).
**Do** —
1. Click **100**; look at the disk and the label.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_rrt.md`, under the heading M-RT-11: whether the disk (a point) turns green and the label shows a path length.
**Save** — File > Close, Don't Save.
**Port** — the same on the page (`slider-goalRadius`, `slider-explorationBias`, `button-add-100`).
**Expected / what it decides** — green once a node lies exactly on the goal (F-RT-05, unit "goalRadius 0: only a node
exactly on the goal reaches it").

### M-RT-12 Owner states for golden data
**Open** — `_internal\originals\batch-ab\Demonstration-Rapidly-Exploring-Random-Tree-RRT-and-RRT-1-0-0-definition.nb`
with Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any
cell (no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**.
**Do** —
1. State A: click **RRT\*** (narrow passage), click **500** twice (1001 nodes).
2. Save (see Save), reopen the downloaded original, ⊕ > Initial Settings.
3. State B: as M-RT-06 (none, bias 0.9, RRT, **100** twice).
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_rrt.md`, under the heading M-RT-12: for each state: the label text and the file name it was saved under.
**Save** — after each state: File > Save As… `_internal\originals\saved\rrt_M-RT-12_<YYYY-MM-DD>.nb` (state A) and
`_internal\originals\saved\rrt_M-RT-12b_<YYYY-MM-DD>.nb` (state B), then close; never overwrite the downloaded original.
**Port** — none in the browser: the saved files are extracted (`tools/extract_state.py`, snapshot settings included)
into `tests/golden/rrt.owner-state-k.json`.
**Expected / what it decides** — new golden data checked like snapshots 3–6 (T-RT-38 … T-RT-48; F-RT-19).
