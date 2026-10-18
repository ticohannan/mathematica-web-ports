# Manual checks — Dubins car (`demos/dubins-path/`)

Each item compares the original in Mathematica with the port, as an operator procedure (owner rule R-B). The general
procedure — starting Mathematica, Enable Dynamics, the ⊕ menu, invisible locators, waiting, recording, saving,
sending results back — is in [`docs/MATHEMATICA_CHECKS.md`](../MATHEMATICA_CHECKS.md). Record every result in the
test-run file `_internal\test-runs\<YYYY-MM-DD>_dubins-path.md` (create it with `npm run test-run -- dubins-path`).
Differences are findings, not failures of the tester.

Original notebook (all items):
`_internal\originals\batch-ab\Demonstration-Shortest-Path-for-the-Dubins-Car-2-0-0-definition.nb`.
Port (all items): `http://127.0.0.1:8080/demos/dubins-path/` (after `npm run serve`).

Where things are in the original (snapshot 1): two long sliders at the top, labelled **progress** (upper) and **r<sub>min</sub>**
(lower); a small **+** button right of each slider opens its animation panel (value field, play, step buttons); the value
is printed right of the **+** (0.25 and 3 at the start). Below them the grey picture: the label "… path length, …
distance" at the top centre, the pale green start car at the origin, the pale red goal car at (2, 2) with the black
cross-hair **goal locator** on its rear axle, the red cross-hair **heading glyph** 2 units from it (drag it to turn the
goal car), the blue moving car, the thick shortest path and five thin other paths, four dashed grey circles. The **⊕**
button is at the top-right corner of the panel. The test-run file for a day is
`_internal\test-runs\<YYYY-MM-DD>_dubins-path.md` (one per app and day; write the item ID as a heading).

### M-DP-01 Texts
**Open** — `_internal\originals\batch-ab\Demonstration-Shortest-Path-for-the-Dubins-Car-2-0-0-definition.nb` with
Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any cell
(no Shift+Enter). Open the port's page next to it.
**Prepare** — nothing; scroll to the title.
**Do** —
1. Compare the title and the caption (two paragraphs) with the port's.
2. Scroll to "Details & Citations"; compare the eight paragraphs and the four references.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_dubins-path.md`, under the heading M-DP-01: per text: "same" or the differing words.
**Save** — File > Close, Don't Save.
**Port** — the page's caption, `details` and `credits`.
**Expected / what it decides** — identical texts (F-DP-18), including the validity sentence of E-DP-02.

### M-DP-02 Opening picture (snapshot 1)
**Open** — `_internal\originals\batch-ab\Demonstration-Shortest-Path-for-the-Dubins-Car-2-0-0-definition.nb` with
Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any cell
(no Shift+Enter).
**Prepare** — do not touch any control (live state); afterwards also ⊕ (top-right) > **Initial Settings**.
**Do** —
1. Check: label "20.76 path length, 2.83 distance" at the top centre of the grey area; thick pink LSL path (short left
   arc, tangent, almost a full left circle into the goal); thin brown, dark green, orange and dark yellow paths; four
   dashed grey circles of radius 3; pale green start car at the origin heading right; pale red goal car at (2, 2)
   heading down-right; the blue car on the last arc with turned front tyres; the black goal locator on the goal's rear
   axle and the red heading glyph 2 units down-right of it.
2. Compare line widths (thin words, dashed circles, thick path), dash pattern, car size, headlight cones (no edge
   lines) and glyphs with the port.
3. Measure on a screenshot the length (px) of one dash of a dashed circle and the picture width (px).
4. ⊕ > Initial Settings; repeat step 1.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_dubins-path.md`, under the heading M-DP-02: yes/no per point of step 1; differences of step 2; the dash length and picture width; whether Initial
Settings changes anything.
**Save** — File > Close, Don't Save.
**Port** — open the page and press "Initial settings" (`reset`); compare.
**Expected / what it decides** — the picture of snapshot 1 (F-DP-12…F-DP-17); the dash length fits D-DP-03.

### M-DP-03 Driving along the path
**Open** — `_internal\originals\batch-ab\Demonstration-Shortest-Path-for-the-Dubins-Car-2-0-0-definition.nb` with
Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any cell
(no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**.
**Do** —
1. Drag the **progress** slider's thumb slowly from the left end to the right end (about 5 s); watch the blue car.
2. Click the **+** right of **progress** and press the play button; watch one run; stop it.
3. In the **progress** panel's value field type `0.5`, Enter; read the blue car's rear-axle position (zoom 200 %:
   Window > Magnification; the grid: 20 px per unit at 100 % (40 at 200 %)).
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_dubins-path.md`, under the heading M-DP-03: steps 1–2: does the car follow the thick path from start car to goal car; are the front tyres turned left
on left arcs, right on right arcs, straight on the straight piece; step 3: the car's position.
**Save** — File > Close, Don't Save.
**Port** — the same on the page (`slider-progress`, `plus-progress`, `play-progress`, `value-progress`).
**Expected / what it decides** — the car follows the path (F-DP-10, F-DP-11); at 0.5 the rear axle is near (6.80, 5.47).

### M-DP-04 Goal locator and heading
**Open** — `_internal\originals\batch-ab\Demonstration-Shortest-Path-for-the-Dubins-Car-2-0-0-definition.nb` with
Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any cell
(no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**.
**Do** —
1. Press on the black goal locator and drag it around; then drag it towards the upper-right corner beyond the grey area.
2. Press on the red heading glyph and drag it once around the goal car, about 4 units away; release.
3. Zoom 200 % (Window > Magnification); drag the red glyph and drop it exactly on the goal car's rear axle (the black
   locator's centre).
4. Drag the goal locator to the upper-right limit and the heading glyph further outwards in the same direction.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_dubins-path.md`, under the heading M-DP-04: step 1: does the goal car keep its heading and the red glyph follow 2 units away; where the car stops
(x = 13, y = 8?); step 2: does the car turn and the glyph snap back to 2 units; step 3: which way the car points;
step 4: whether the red glyph can be outside ±13 × ±8.
**Save** — File > Close, Don't Save.
**Port** — the same on the page (`locator-goalXY`, `locator-goalThetaloc`).
**Expected / what it decides** — F-DP-03, F-DP-04; step 3: the car points right (Q-DP-04); step 4: yes (Q-DP-09).

### M-DP-05 Picking a locator (D-DP-05, K-DP-04, K-DP-05)
**Open** — `_internal\originals\batch-ab\Demonstration-Shortest-Path-for-the-Dubins-Car-2-0-0-definition.nb` with
Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any cell
(no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings** before each step.
**Do** —
1. (a) Press on empty grey space far from both locators, e.g. at (−10, −6).
2. (b) Press about 5, 10 and 15 screen pixels left of the black goal locator's centre (reset between presses).
3. (c) Press on the red heading glyph and drag it 2 cm.
4. (d) Drag the red glyph onto the goal locator's centre, release, then press there and drag.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_dubins-path.md`, under the heading M-DP-05: (a) whether a locator jumps there and which; (b) jump yes/no at 5, 10, 15 px; (c) whether the goal car
turns or only the glyph moves and snaps back; (d) which locator moves.
**Save** — File > Close, Don't Save.
**Port** — the same on the page; port: (a) the nearer locator jumps, (b) no jump within 12 px, (c) the car turns,
(d) the goal locator moves.
**Expected / what it decides** — K-DP-04 (one LocatorPane for two Locator controls?), K-DP-05 (draggable glyph
primitive), D-DP-05.

### M-DP-06 Reversed car and ties (Q-DP-01, Q-DP-02)
**Open** — `_internal\originals\batch-ab\Demonstration-Shortest-Path-for-the-Dubins-Car-2-0-0-definition.nb` with
Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any cell
(no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**; in the **progress** panel's value field (via its **+**) type `0`, Enter.
**Do** —
1. Drag the black goal locator to (8, 3) as exactly as possible (zoom 200 %; 20 px per unit at 100 %, 40 at 200 %).
2. Drag the red heading glyph straight above the goal (heading up).
3. Look at the thick path's colour and at the blue car at the origin.
4. Drag the goal locator onto the x-axis at about (8, 0) and the heading glyph to its right (heading 0); look at the
   thick path's colour.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_dubins-path.md`, under the heading M-DP-06: step 3: thick path colour and the direction the blue car points (right or left); step 4: thick path
colour.
**Save** — File > Close, Don't Save.
**Port** — the same on the page; port: step 3 orange RSL and the car pointing LEFT (backwards); step 4 dark yellow
(RSR) if exactly on the axis.
**Expected / what it decides** — the tie order of Q-DP-01 (K-DP-01, K-DP-02) and the backwards car of Q-DP-02 /
E-DP-01 (only when the pose is hit exactly; record whether it could be).

### M-DP-07 r_min extremes (Q-DP-06)
**Open** — `_internal\originals\batch-ab\Demonstration-Shortest-Path-for-the-Dubins-Car-2-0-0-definition.nb` with
Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any cell
(no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**.
**Do** —
1. Drag the **r<sub>min</sub>** slider's thumb to the left end (0.001); read the label.
2. Drag it to the right end (5); read the label.
3. Set it back to 3 (type `3` in its panel's value field). Drag the goal locator slowly away from the start to the
   right edge and back, watching when the blue and orange paths appear/disappear and when the brown and dark green
   ones disappear.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_dubins-path.md`, under the heading M-DP-07: the two labels; step 1: do the circles shrink to points and is the thick path (almost) the straight
segment; step 3: whether the words appear/disappear (approximate goal positions).
**Save** — File > Close, Don't Save.
**Port** — the same on the page (`slider-minRadius`, `value-minRadius`, `locator-goalXY`).
**Expected / what it decides** — "2.83 path length, 2.83 distance" and "33.05 path length, 2.83 distance"; words
appear and vanish at circle-centre distances 2 r<sub>min</sub> and 4 r<sub>min</sub> (F-DP-06…F-DP-09, Q-DP-06, E-DP-02).

### M-DP-08 Typed values outside the slider ranges (K-DP-07)
**Open** — `_internal\originals\batch-ab\Demonstration-Shortest-Path-for-the-Dubins-Car-2-0-0-definition.nb` with
Mathematica 15.0.1 via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not evaluate any cell
(no Shift+Enter).
**Prepare** — ⊕ > **Initial Settings**; open Window > Messages and clear it.
**Do** —
1. Click the **+** right of **progress**; type `1.5` in its value field; Enter.
2. ⊕ > Initial Settings; click the **+** right of **r<sub>min</sub>**; type `0`; Enter.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_dubins-path.md`, under the heading M-DP-08: per case: the value shown right of the slider, what is drawn (where the blue car is; error boxes), the
Messages text.
**Save** — File > Close, Don't Save.
**Port** — the same on the page (`value-progress`, `value-minRadius`); the port clamps to 1 and 0.001.
**Expected / what it decides** — settles K-DP-07 (D-DP-04).
