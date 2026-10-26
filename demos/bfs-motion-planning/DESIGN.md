# Design document: Breadth-First Search Robot Motion Planning

| | |
|---|---|
| Code version: | 0.1.23 |
| Document revision | 1 (2026-10-17) — first implementation |
| Status | describes the app as implemented; changes go through Proposed changes (§8) |
| Original | Wolfram Demonstrations Project, "Breadth-First Search Robot Motion Planning", contributed by Aaron T. Becker, Benedict Isichei and Praveen Reddy Padala, published 2017-12-12 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/BreadthFirstSearchRobotMotionPlanning/>. Readable source: `docs/original-source/bfs-motion-planning.txt`; snapshots: `docs/original-snapshots/bfs-motion-planning-1.png` … `-4.png` (the extraction's pictures 5 and 6 are the Wolfram logo); stored output cell (initial settings = stored `"Variables"`, Body, Specifications, Initialization): raw definition notebook lines 2373, 2749, 2949, 3336; fixture `tests/golden/bfs-motion-planning.original-states.json` (`states[0]` live state; `snapshots[1…4]` the snapshot Settings, raw lines 4456, 5720, 7383, 13618; `specs` the initial settings) |
| Port files | `demos/bfs-motion-planning/model.js` (`bfsTorus`, `getShortestPath`, the cell rule, one evaluation of the Manipulate body; pure), `main.js` (the Manipulate on `shared/manipulate.js`: Q and P sliders, locators, Graphics data; v0.1.19), `index.html`; shared with "Robot Motion with Obstacles": `demos/common/arm-grid.js` (new, pure) and `demos/common/arm-view.js` (new; Graphics data since v0.1.19), which compose `demos/common/two-link.js` (`armSegments`, `armGeometry`) and `demos/common/arrow-arcs.js` (`arrowArc`); `LOC_ICON` from `demos/common/prm-core.js` — API in `demos/robot-motion-obstacles/DESIGN.md` §6 |
| Role in the project | further demonstration (batch A) |

## 1. Purpose and background

The same two-link arm, obstacles and phase space as "Robot Motion with Obstacles" (same first author and
Initialization code), now with a planner: the user places an initial and a final configuration (two invisible
locators in the phase space) and the Demonstration finds the shortest path between them on a 16Q × 16Q grid of the
torus θ1 × θ2 by a breadth-first (FIFO-queue) search over the 8-connected free cells. The phase space shows the cost
of reaching every cell from the start as grey levels (white at the start, darker with distance), blocked and
unreachable cells in dark red, the path in green and the current cell in blue; the arm on the left is drawn at the
current cell, chosen by the slider P (fraction of the path). The label gives the path length in radians. The Details
text calls the planner resolution complete and explains the curse of dimensionality. Reference: Spong, Hutchinson,
Vidyasagar, *Robot Modeling and Control* (2006).

## 2. Scope

In scope: the original's controls (Q, P, two obstacle locators, start and goal locators), torus wrap, the obstacle
grid with its cache and ControlActive behaviour, the cell rule, `bfsTorus` and `getShortestPath` exactly as written,
the update flags, the drawing (arm, obstacles, cost-map inset with path, glyphs, label), title, caption and Details.
Out of scope (would need a design entry first): other search algorithms or metrics, path smoothing, more links.

## 3. Users and use cases

| ID | User | Use case |
|----|------|----------|
| UC-BF-01 | student | place start and goal configurations and see the shortest grid path and its length |
| UC-BF-02 | student | drive the arm along the path with P (or its ⊕ animation) and relate phase-space path and arm motion |
| UC-BF-03 | student | move obstacles and see how the cost map ("distance from the start") and the path change, including when no path exists |
| UC-BF-04 | student | change Q and see the resolution/cost trade-off of a resolution-complete planner |
| UC-BF-05 | tester | compare the port with the original's saved state, snapshot settings and snapshots |

## 4. Features

### 4.1 Controls

| ID | Feature | Reason | Since | Verified by |
|----|---------|--------|-------|-------------|
| F-BF-01 | Slider "Q" (italic): `{{Quality, 2, Style["Q", Italic]}, 1, 10, 1, Appearance -> "Labeled"}` — 1…10, step 1, default 2, value shown, ⊕ panel; `ControlPlacement -> Top`; values min + k·step (shared slider `steps: 'mma'`) | grid resolution, 16Q × 16Q cells (UC-BF-04) | v0.1.15 | e2e "has the controls of the original with their defaults: Q 2 and P 1"; harness "H-BF-06"; harness "H-BF-07"; harness "H-BF-08"; M-BF-08; golden "bfs: the snapshot labels read path length = 1.57, 2.99, 2.58 and 4.31 rads" |
| F-BF-02 | Slider "P" (italic): `{{progress, 1, Style["P", Italic]}, 0.0, 1.0, 0.01, Appearance -> "Labeled"}` — 0…1, step 0.01, default 1 (arm at the goal), value shown, ⊕ panel whose play button moves the arm along the path; values 0. + k·0.01 in machine arithmetic (COMMON-DECISIONS §4, `steps: 'mma'`) | follow the path (UC-BF-02) | v0.1.15 | e2e "has the controls of the original with their defaults: Q 2 and P 1"; e2e "moving the P slider moves the blue cell and the arm along the green path"; M-BF-03; golden "bfs: the snapshot labels read path length = 1.57, 2.99, 2.58 and 4.31 rads" |
| F-BF-03 | Obstacle locators `{{pObs, {1.1, 1.1}}, {-2.0, -2.0}, {2.0, 2.0}, Locator}` and `{{pObs2, {1.1, -1.1}}, {-2.0, -2.0}, {2.0, 2.0}, Locator}`: default locator glyph, drag limited to −2…2 | relocate the obstacles (UC-BF-03) | v0.1.15 | e2e "dragging an obstacle with the mouse shows the coarse grid while dragging and the fine grid after release"; M-BF-06; e2e "has the controls of the original with their defaults: Q 2 and P 1" |
| F-BF-04 | Start and goal locators `{{pConfigI, {4.5, 0.0}}, {xMin - .1, yMin - .1}, {xMax + .1, yMax + .1}, Locator, Appearance -> None}` and `{{pConfigF, {5.5, 0.0}}, …}` (range {2.8, −2.1} … {6.799999999999999, 1.9}): invisible; what the user sees are the Locator primitives drawn at them (F-BF-18) | choose start and goal (UC-BF-01) | v0.1.15 | e2e "dragging the goal locator changes the path and the label but not the cost map"; e2e "dragging the start locator past the top edge wraps it to the bottom edge"; M-BF-02; e2e "has the controls of the original with their defaults: Q 2 and P 1" |
| F-BF-05 | The four Locator controls form one LocatorPane: a press anywhere makes the nearest of pObs, pObs2, pConfigI, pConfigF jump there (limited to its range) and drags it (shared `addLocators(..., {pickAnywhere: true})`, D-BF-05) | the original's mouse behaviour | v0.1.15 | e2e "a press away from every locator moves the nearest locator there"; M-BF-07 |

### 4.2 Model (`model.js`, `demos/common/arm-grid.js`)

| ID | Feature | Reason | Since | Verified by |
|----|---------|--------|-------|-------------|
| F-BF-06 | Constants as in "Robot Motion with Obstacles" (xMin 2.9, yMin −2 exact, xMax 6.699999999999999, yMax 1.7999999999999998 — the stored Initialization assigns these literals —, w = 1/8, l = 1); `pConfigI = applyTorus[pConfigI]; pConfigF = applyTorus[pConfigF]` first in every evaluation: `applyTorus` tests the INPUT (`If[pConfigI[[1]] < xMin, pConfigO[[1]] = xMax]; If[pConfigI[[1]] > xMax, pConfigO[[1]] = xMin]`, same for y), tolerant comparisons, result assigned to the Manipulate variable; a locator dragged below the bottom edge (range down to −2.1) lands on exactly y = yMax (F-BF-09) | the torus (Details) | v0.1.15 | unit "applyTorus maps x < xMin to xMax, x > xMax to xMin and the same for y"; harness "H-BF-15"; e2e "dragging the start locator past the top edge wraps it to the bottom edge"; e2e "dragging the start locator below the bottom edge wraps it to the top row of the grid" |
| F-BF-07 | `pointsegdis2` with machine constants (`Plus@@seg/2.0`, `Min[1.0, …]`, `2.0`) — the same doubles as the other original's version (shared function) | the original's distance test | v0.1.15 | unit "the grid holds -1 for blocked and 0 for free cells at 16Q by 16Q" |
| F-BF-08 | Grid `freeConfigSpace = Table[If[pointsegdis2[link 1] < 2.0 w \|\| pointsegdis2[link 2 at a1 - a2] < 2.0 w, -1, 0], {a2, 1. (Pi/resolution), 2. Pi - 1. (Pi/resolution), 2. (Pi/resolution)}, {a1, …}]` (stored Body) (rows a2, columns a1, cell centres, −1 = blocked; with a whole resolution `1. (Pi/resolution)` is the correctly rounded π/resolution, K-BF-09); resolution = `ControlActive[highRes = False; 4 Quality, highRes = True; 16 Quality]`; recomputed only under the cache condition of the other original (`pObsOld != pObs \|\| pObs2Old != pObs2 \|\| QualityOld != Quality \|\| !highRes`), which also sets `updatedCspace = True` | obstacle region and search space (UC-BF-03) | v0.1.15 | unit "the grid holds -1 for blocked and 0 for free cells at 16Q by 16Q"; golden "bfs: the first evaluation of the initial settings gives the saved grid, costmap, parents and 9-cell path bit for bit"; golden "bfs: snapshot 2 settings reproduce grid, costmap, parents and the 15-cell path bit for bit"; golden "bfs: snapshot 4 settings reproduce grid, costmap, parents and the 50-cell path bit for bit"; golden "bfs: the snapshot 3 grid belongs to obstacle 2 at its default (1.1, -1.1), not to the saved position"; e2e "dragging an obstacle with the mouse shows the coarse grid while dragging and the fine grid after release"; harness "H-BF-02"; harness "H-BF-03"; harness "H-BF-04"; harness "H-BF-05"; harness "H-BF-20"; harness "H-BF-21" |
| F-BF-09 | Cell of a locator (stored Body): `pS = {Length[freeConfigSpace] ((x - xMin)/(xMax - xMin)), Length[freeConfigSpace] (1 - (y - yMin)/(yMax - yMin))}`, `lS = Round[{0.5 + pS[[2]], Max[1, pS[[1]] + 0.5]}]` (row, column; Round half to even), the same for pE/lE; at the defaults lS = {16, 14}, lE = {16, 22}. Division as a·(1/b) (COMMON-DECISIONS §4): at y = yMax, (yMax − yMin)·(1/(yMax − yMin)) = 0.9999999999999999, pS2 = 3.552713678800501e-15, row 1; a true division would give exactly 1, pS2 = 0 and row 0 (K-BF-03, H-BF-14 decides). Both rules reproduce lS/lE of all saved states | locator → grid cell | v0.1.15 | unit "locator to cell: Round[{.5 + pS2, Max[1, pS1 + .5]}] with half-even rounding"; golden "bfs: lS and lE of the five saved states follow from the locator positions"; e2e "dragging the start locator below the bottom edge wraps it to the top row of the grid"; harness "H-BF-14"; harness "H-BF-22"; M-BF-10 |
| F-BF-10 | `bfsTorus[cSpace, start]` exactly as written: `queue = {start}`, `lvl` all `Infinity` except `lvl[[start]] = 0.0`, `parent` all `{0.0, 0.0}`; while the queue is not empty take `First`, keep `Rest`; for `coords` in `{{1,0},{0,1},{-1,0},{0,-1}}` with `mylc = lvl[[v]] + 1.0`, then in `{{1,1},{-1,1},{-1,-1},{1,-1}}` with `mylc = lvl[[v]] + 1.41`: neighbour = v + coords wrapped (`r < 1 → d1`, `r > d1 → 1`, same for c); if `cSpace[[r,c]] > -0.5 && lvl[[r,c]] > mylc` (tolerant Greater) then `parent[[r,c]] = v`, `lvl[[r,c]] = mylc`, `AppendTo[queue, {r,c}]`; defined only for a start inside the grid (`/; 1 <= start[[1]] <= d1 && 1 <= start[[2]] <= d2`) | the planner (UC-BF-01) | v0.1.15 | unit "bfsTorus on a free 5 x 5 torus from (3, 3): costs 1.0, 1.41, 2.0, 2.41, 2.82 and the first-found parents"; unit "bfsTorus keeps the first of two costs equal within tolerance (6 x 6 torus from (4, 4): cell (1, 2) has 3.8200000000000003 via (6, 3))"; unit "bfsTorus allows a diagonal step between two blocked cells (corner cutting)"; unit "bfsTorus spreads from a blocked start cell"; unit "bfsTorus wraps neighbours around both edges"; unit "bfsTorus returns nothing for a start outside the grid (the original's condition)"; golden "bfs: an exact Greater does not reproduce the saved costmaps (542 of 1024 entries differ at the initial settings)"; golden "bfs: snapshot 3 settings keep their stale grid and reproduce costmap, parents and the 38-cell path from it"; harness "H-BF-16"; harness "H-BF-17"; harness "H-BF-12"; harness "H-BF-02"; golden "bfs: the first evaluation of the initial settings gives the saved grid, costmap, parents and 9-cell path bit for bit"; golden "bfs: snapshot 2 settings reproduce grid, costmap, parents and the 15-cell path bit for bit"; golden "bfs: snapshot 4 settings reproduce grid, costmap, parents and the 50-cell path bit for bit" |
| F-BF-11 | `getShortestPath[parents, start, end]`: `path = {end}`; if `parents[[end]] != {0, 0}`, follow parents until `start == ps`, appending each; then `path = Reverse[…]` (start first). A goal that was never reached, or equals the start, gives `{lE}` | the path (UC-BF-01) | v0.1.15 | unit "getShortestPath returns only the goal when it is unreachable or equals the start"; harness "H-BF-11"; harness "H-BF-13"; harness "H-BF-18"; unit "bfsTorus on a free 5 x 5 torus from (3, 3): costs 1.0, 1.41, 2.0, 2.41, 2.82 and the first-found parents"; golden "bfs: snapshot 2 settings reproduce grid, costmap, parents and the 15-cell path bit for bit"; golden "bfs: snapshot 4 settings reproduce grid, costmap, parents and the 50-cell path bit for bit" |
| F-BF-12 | Update flags: `If[lS != Round[…] \|\| updatedCspace, lS = …; {parents, costmap} = bfsTorus[freeConfigSpace, lS]; updatedCspace = False; updatedcostmap = True]`, then `If[lE != Round[…] \|\| updatedcostmap, lE = …; path = Reverse[getShortestPath[parents, lS, lE]]; updatedcostmap = False]` | search only when needed: a goal drag only re-walks the tree | v0.1.15 | unit "the search reruns only when lS changes or the grid was recomputed, the path only when lE changes or after a search"; golden "bfs: evaluating a saved state again changes nothing (no search, no path update)"; e2e "dragging the goal locator changes the path and the label but not the cost map" |
| F-BF-13 | Current configuration: `ccord = path[[Max[1, Ceiling[progress*Length[path]]]]]` (machine arithmetic), `Theta1 = ((2. ccord[[2]] - 1.)/Length[costmap]) Pi`, `Theta2 = ((-(2. ccord[[1]] - 1.))/Length[costmap]) Pi` (stored Body; cell centre; θ2 negative; division as a·(1/b), which changes the last bit for some cells, e.g. (10, 61) of 96: θ1 = 3.959715740462135 instead of 3.9597157404621353), `inCollision` as in the other original with link 2 at θ1 + θ2 | the arm on the left (UC-BF-02) | v0.1.15 | unit "ccord = path[[Max[1, Ceiling[progress Length[path]]]]] in machine arithmetic: 0.14 of 50 cells is cell 8"; unit "Theta1 = (2c - 1) pi/L and Theta2 = -(2r - 1) pi/L at the cell centre"; harness "H-BF-09"; harness "H-BF-10"; golden "bfs: snapshot 3 settings keep their stale grid and reproduce costmap, parents and the 38-cell path from it"; golden "bfs: snapshots show the saved path in green and the current cell in blue"; e2e "moving the P slider moves the blue cell and the arm along the green path" |
| F-BF-14 | Initial values. The live state (raw line 1667) and the initial settings (stored `"Variables"`/Specifications, raw lines 2373 and 2949) are equal: pObs {1.1, 1.1}, pObs2 {1.1, −1.1}, pConfigI {4.5, 0.}, pConfigF {5.5, 0.}, Quality 2, progress 1, freeConfigSpace = the saved 32 × 32 grid, costmap and parents = the saved arrays, path = the saved 9 cells, highRes True, pObsOld {1.1, 1.1}, pObs2Old {1.1, −1.1}, QualityOld 2, updatedCspace = updatedcostmap = False, lS {16, 14}, lE {16, 22}: the published notebook opens (and ⊕ → Initial Settings resets) without computing the grid, the search or the path. The Input cell's values (costmap/parents/path {{0, 0}}, lS = lE = {1.0, 1.0}, Olds {−3, −2}, QualityOld 1, flags False) compute the same state on the first evaluation; the port starts from them (D-BF-08), so it opens in the live state, and its "Initial settings" restores the stored `"Variables"` the same way (A-BF-01). One evaluation per front-end update | same opening state as the original | v0.1.15 | golden "bfs: the first evaluation of the initial settings gives the saved grid, costmap, parents and 9-cell path bit for bit"; golden "bfs: evaluating a saved state again changes nothing (no search, no path update)"; harness "H-BF-01"; harness "H-BF-23" |

### 4.3 Graphics (SVG)

| ID | Feature | Reason | Since | Verified by |
|----|---------|--------|-------|-------------|
| F-BF-15 | Outer graphic as in the other original (`PlotRange -> {{-2.2, 7.1}, {-2.4, 2.4}}`, `ImageSize -> {600, 320}`, no padding); texts in Black: θ1 at {4.8, −2.2}, θ2 at {2.8, 0}, "robot workspace" at {0, 2.2}, and at {4.8, 2.2} the `StringForm` text "robot phase space, path length = *value* rads" with *value* = `Round[(2. (Pi/Length[costmap])) costmap[[lE[[1]], lE[[2]]]], 0.01]` (stored Body; the Input cell writes `(2.0π)/(Length[costmap])`; `2. (Pi/L)` with the correctly rounded π/L, K-BF-09) (1.57 at the defaults; a whole value shows as "4.") | the path length (UC-BF-01) | v0.1.15 | unit "label: Round[2.0 pi/L costmap[[lE]], 0.01] shown like Mathematica (1.57, 4.)"; golden "bfs: the snapshot labels read path length = 1.57, 2.99, 2.58 and 4.31 rads"; e2e "the phase-space label reads path length = 1.57 rads at the initial settings, as in snapshot 1" |
| F-BF-16 | Arm and obstacles as in the other original (F-RM-14: `two-link.js` `armGeometry` with `robotArmLabel: 'link2'` and label radius l/2, `arrow-arcs.js` `arrowArc`, written as Graphics data by `arm-view.js` `armGraphics`, v0.1.19) except: link 2 inside `{LightGray, Rotate[…]}` (light grey); the top-level `If[inCollision, EdgeForm[Red], EdgeForm[Black]]` colours the edges of both bars AND of the Brown obstacle disks (black outline in snapshot 1); the elbow arc `Circle[elbow, l/3, {Theta1, Theta1 + Theta2}]` has its end below its start (θ2 < 0) and is drawn as the arc between the two angles (snapshot 4: θ2 = −35.6°, a short arc), its arrowhead points counter-clockwise at θ1 + θ2 (Q-BF-12); label conditions `Abs[θ] > Pi/4` tolerant (Q-RM-05) | the arm at the current cell (UC-BF-02) | v0.1.15 | unit "the elbow arc runs from Theta1 to Theta1 + Theta2 < Theta1 and is drawn as the short arc"; golden "bfs: snapshot 4 draws the elbow arc as the short arc of 35.6 degrees"; e2e "loads without errors and draws the arm, the obstacles, the cost map and the path"; e2e "a goal inside an obstacle region gives a one-cell path and red glyphs"; M-BF-09 |
| F-BF-17 | Phase-space inset: `ArrayPlot[costmapcolor, Mesh -> None, …, FrameStyle -> {{Red, Directive[Red, Dashed]}, {Blue, Directive[Blue, Dashed]}}]` placed as in the other original; `costmapcolor` = costmap with every path cell set to `Green` and then `ccord` set to `Blue`; ArrayPlot's default colouring: a cost v → GrayLevel[1 − v/max] (start white), `Infinity` (blocked or unreachable) → the default dark red for cells "for which no color is determined" (measured (127, 0, 0)), colours as given | cost map and path (UC-BF-01, UC-BF-03) | v0.1.15 | unit "arrayPlotColors for the costmap: grey 1 - v/max, Infinity dark red, Green path, Blue current cell"; golden "bfs: snapshot greys follow 255 (1 - cost/max) and blocked cells are dark red (127, 0, 0)"; golden "bfs: snapshots show the saved path in green and the current cell in blue"; harness "H-BF-19"; e2e "loads without errors and draws the arm, the obstacles, the cost map and the path" |
| F-BF-18 | Glyphs: `Locator[pConfigI, If[inCollision, loc[Red], loc[Darker[Green]]]]` and the same at pConfigF — both coloured by the CURRENT arm's collision state (Q-BF-06); `loc` drawn from prm-core's `LOC_ICON`; the glyphs are themselves draggable Locator primitives in Mathematica (K-BF-07) | show start and goal | v0.1.15 | unit "both glyphs take the colour of the current arm configuration"; e2e "a goal inside an obstacle region gives a one-cell path and red glyphs"; M-BF-05 |
| F-BF-19 | Title, caption and Details text of the original (with the reference) | explains the Demonstration | v0.1.15 | M-BF-01 |

### 4.4 Port additions

| ID | Feature | Reason | Since | Verified by |
|----|---------|--------|-------|-------------|
| A-BF-01 | "Initial settings" button: all controls and locators back to the opening state (the initial settings = the live state of F-BF-14, reached by one evaluation from the Input-cell values, D-BF-08) | stands in for the Manipulate ⊕ menu → Initial Settings | v0.1.15 | e2e "Initial settings restores the opening state" |
| A-BF-02 | Arrow keys move a focused locator (0.05 units, Shift = 0.25); each key press is one update with ControlActive False | keyboard access | v0.1.15 | e2e "arrow keys move a focused locator (port addition)" |
| A-BF-03 | `window.__demo` automation hook: `getState`, `setState` (any variable, e.g. snapshot settings or a synthetic grid), `view` (lS, lE, path, ccord, angles, inCollision, label text, grid size, search count), `moveLocator`, `worldToClient` | automated tests | v0.1.15 | e2e "dragging the goal locator changes the path and the label but not the cost map" |
| A-BF-04 | "All demos" link | site navigation | v0.1.15 | inventory; M-GEN-01 |
| A-BF-05 | Credit footer: original title, authors, licence, adaptation notice | required by CC BY-NC-SA 3.0 | v0.1.15 | e2e "attribution on" |
| A-BF-06 | Start-up notice (watchdog, `<noscript>`) when the page cannot start (DEC-22) | a clear message instead of an empty page | v0.1.15 | e2e "start-up notice when" |
| A-BF-07 | standalone bundle (owner rule R-A): `npm run bundle -- bfs-motion-planning` builds `dist/bfs-motion-planning/` with exactly the files the app imports, the licences, a generated README and a root `index.html` (§6, "Building and deploying this app alone") | anyone can host this one app elsewhere without the rest of the site (owner rule R-A, 2026-10-17) | v0.1.15 | e2e "bundle: bfs-motion-planning runs from its own folder"; unit "bundle contents listed in DESIGN.md match the collector" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|-------------|---------|
| `slider-Quality` | F-BF-01 |
| `value-Quality` | F-BF-01 |
| `plus-Quality` | F-BF-01 |
| `play-Quality` | F-BF-01 |
| `stepback-Quality` | F-BF-01 |
| `stepfwd-Quality` | F-BF-01 |
| `slider-progress` | F-BF-02 |
| `value-progress` | F-BF-02 |
| `plus-progress` | F-BF-02 |
| `play-progress` | F-BF-02 |
| `stepback-progress` | F-BF-02 |
| `stepfwd-progress` | F-BF-02 |
| `locator-pObs` | F-BF-03, F-BF-05, A-BF-02 |
| `locator-pObs2` | F-BF-03, F-BF-05, A-BF-02 |
| `locator-pConfigI` | F-BF-04, F-BF-05, A-BF-02 |
| `locator-pConfigF` | F-BF-04, F-BF-05, A-BF-02 |
| `reset` | A-BF-01 |
| `crumbs` | A-BF-04 |
| `details` | F-BF-19 |
| `credits` | A-BF-05 |

## 6. Design

**Files.** `model.js` (pure): `cellOf(p, L)` (F-BF-09), `bfsTorus(cSpace, start)` → `{parent, lvl}` or `null` when the
start is outside (the original's condition leaves the call unevaluated), `getShortestPath(parents, start, end)`,
`initialState()`, `evaluate(state, {controlActive})` — one evaluation of the body in the original's order: applyTorus
(both), pObsV, the grid cache, the search `If`, the path `If`, `costmapcolor`, `ccord`, θ1/θ2, inCollision — returning
the new state (all Manipulate variables: `pObs`, `pObs2`, `pConfigI`, `pConfigF`, `Quality`, `progress`,
`freeConfigSpace`, `costmap`, `parents`, `path`, `highRes`, `pObsOld`, `pObs2Old`, `updatedCspace`, `updatedcostmap`,
`lS`, `lE`, `QualityOld`) and a view (label text, colour array, arm geometry and arcs, glyph colour). `initialState()` returns the
Input cell's values; the first evaluation computes the live state (D-BF-08). Indices stay 1-based
like Mathematica's, so states compare directly with the saved ones. `main.js` (v0.1.19) is one `Manipulate({…})` call
of `shared/manipulate.js` (control specs in Mathematica's form, `ControlActive: true`, the body wraps `evaluate` to
count searches and walks for the hook, `draw` returns the Graphics list); the layer keeps the state and re-evaluates
after every change.

**Shared code.** `demos/common/arm-grid.js` (pure; constants, `pointsegdis2`, `armHits` on `two-link.js` `armSegments`,
`tableCount`/`tableAngles`, `cSpaceTable(obs, res, -1, 0, {exactPi: true})`, `applyTorus`, `arrayPlotColors`) and
`demos/common/arm-view.js` (Graphics data since v0.1.19: `armGraphics` of `two-link.js` `armGeometry` + `arrow-arcs.js`
`arrowArc`, `gridInset`, `insetFrame`, `configGlyph`/`locIcon` of prm-core's `LOC_ICON`), specified
in `demos/robot-motion-obstacles/DESIGN.md` §6 . `bfsTorus`, `getShortestPath` and `cellOf` stay in this app's
`model.js` (only this app uses them). Existing modules reused: `shared/manipulate.js` and `shared/graphics.js` (v0.1.19; on `shared/svg-plot.js`
`createPlot` with `padding: 0`, `addLocators` with `pickAnywhere`, `darkLocatorGlyph`, and `shared/ui.js` two
`Controls.slider` with ⊕ and `steps: 'mma'`),
`shared/mma.js` (`mGreater` for `lvl[[r,c]] > mylc`, `mLess`, `mUnequal` for the cache and `lS != …`,
`roundHalfEven`, `roundTo`; machine divisions of the stored code as a·(1/b); π over a whole resolution or L correctly rounded, K-BF-09), `shared/mma-extra.js` (`mmaNumberString` for "1.57" / "4." / "0."),
`shared/mma-colors.js`, `demos/common/prm-core.js` (`LOC_ICON`), `shared/requirements.js`. Not applicable: prm-core's
`myAstar`/`ptInPoly`, motion-planning's `myAstarRev2`/segment intersection — different search and geometry.

**Tests.** `tests/unit/bfs-motion-planning.test.js` (the shared grid module in `tests/unit/arm-grid.test.js`),
`tests/golden/bfs-motion-planning.golden.test.js` (saved states and snapshot pictures; `tests/support/png.js` reads the
pictures), `tests/golden/bfs-motion-planning.harness.test.js` (one test `harness "H-BF-nn"` per harness scenario: replays
`tests/harness/bfs-motion-planning.scenarios.json` on the model and compares with
`tests/golden/bfs-motion-planning.harness.json`; skipped with "no harness data (owner run pending)" until the owner's
Mathematica run is accepted; the replay is checked now against the TESTPLAN's reference values), `tests/e2e/bfs-motion-planning.spec.js`.
The automation hook also counts the searches and path walks (`view().searches`, `view().walks`) and returns the cost map
(`costmap()`).

**Search implementation.** The queue is an array with a head index (the original's `Rest` copies the list each step,
O(n²) and slow at Q = 10); the order of pops and pushes is the original's. `mylc` is computed per neighbour from the
current `lvl[[v]]`. The comparison `lvl > mylc` uses `mGreater` (tolerant); with an exact `>` the saved cost maps are
not reproduced (Q-BF-02). Q = 10: 160² = 25 600 cells, 1.00–1.03 pushes per free cell in the saved states (964
pushes for 960 free cells at the defaults; 12 082 for 11 687 in snapshot 3).

**ControlActive** as in the other app: true from a pointer press on a slider or locator until release, then one more
evaluation. While an obstacle or Q is dragged the grid is 4Q × 4Q, so the search and the path are recomputed on the
coarse grid at every update and again on the fine grid after release.

**Evaluation order and drawing order** follow the body: arm link 1, base point, arc 1, link 2 (light grey) with
"Robot Arm", elbow point, arc 2, obstacle disks, the cost-map inset with frame, the black texts, the two glyphs; the
Manipulate's obstacle locator glyphs on top.

### 6.1 Building and deploying this app alone

Owner rule R-A (2026-10-17): this one app can be taken out of the repository and hosted anywhere.

- Command, in the repository folder: `npm run bundle -- bfs-motion-planning` → `dist/bfs-motion-planning/` (with `--zip` also
  `dist/bfs-motion-planning.zip`; `npm run bundle -- --all` bundles every app). `tools/bundle-app.mjs` follows every file the page
  loads (HTML, static imports, stylesheet) and copies exactly those, keeping the repository's folder layout, so no path
  is rewritten.
- Contents (generated with `node tools/bundle-app.mjs bfs-motion-planning --update-docs`; unit "bundle contents listed in DESIGN.md
  match the collector" keeps the table current):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/bfs-motion-planning/`) | 3 | `index.html`, `main.js`, `model.js` |
| `shared/` | 16 | `exact-pi.js`, `graphics-extras.js`, `graphics.js`, `manipulate.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `mma.js`, `random.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `ui-extra.js`, `ui-interval.js`, `ui.js` |
| `demos/common/` | 5 | `arm-grid.js`, `arm-view.js`, `arrow-arcs.js`, `prm-core.js`, `two-link.js` |
| added by the bundler | 7 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/bfs-motion-planning/DESIGN.md` |
<!-- bundle-contents:end -->

- Added files: `index.html` opens the app (the app's "All demos" link, `../../index.html`, leads back to it), a
  generated `README.md` (title, the credits of the footer, licence summary, how to serve and test), `.nojekyll`
  (GitHub Pages), this document, `LICENSE.md` and the `LICENSES/` texts of the SPDX identifiers found in the copied
  files (CC BY-NC-SA 3.0 for this app and the `demos/common/` modules, MIT for `shared/`).
- Requirements: any static web server (`npx serve`, `python -m http.server`, GitHub Pages); not `file://` (browsers
  block ES modules there); a current browser with ES modules (Firefox, Chromium, WebKit); no WebGL (SVG and a 2D canvas
  for the grid picture). No server-side code.
- Checked by e2e "bundle: bfs-motion-planning runs from its own folder" (A-BF-07, `tests/e2e/bundle.spec.js`): the bundle folder
  alone is served, its root page must open the app, the app must start (`window.__demo.ready`) without page errors,
  every request must stay inside the folder and succeed, and every script and stylesheet of the bundle must be loaded.

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

| ID | Kind | Description |
|----|------|-------------|
| Q-BF-01 | quirk kept | The "breadth-first search" is a FIFO label-correcting search: a cell is re-queued whenever a cheaper cost is found, costs are 1.0 for the four straight and 1.41 (not √2) for the four diagonal neighbours, so `lvl` is the cheapest 8-connected path cost, not a hop count. The label's "path length … rads" is 2π/L × that cost (diagonals counted as 1.41 cells). |
| Q-BF-02 | quirk kept | Ties and near-ties: the first improvement wins, and a later candidate equal within Mathematica's tolerance (relative 2^-46) does not replace it because `lvl[[r,c]] > mylc` is a tolerant Greater. Example: 6 × 6 free torus from (4, 4): cell (1, 2) keeps 3.8200000000000003 with parent (6, 3); an exact `>` would switch to 3.82 via (2, 2). With an exact `>` the saved cost maps are not reproduced (542 of 1024 entries differ at the initial settings; the paths of snapshots 3 and 4 change). Neighbour order (down, right, up, left, then down-right, up-right, up-left, down-left in grid terms) decides parents and therefore paths. |
| Q-BF-03 | quirk kept | Corner cutting: a diagonal step between two blocked cells is allowed (only the target cell is tested). |
| Q-BF-04 | quirk kept | The start cell itself is never tested: a start inside an obstacle region still spreads to its free neighbours, and at P = 0 the arm is drawn there in collision (red edges, red glyphs). |
| Q-BF-05 | quirk kept | Unreachable goal (blocked, or free but enclosed): its cost is `Infinity`, its parent stays {0., 0.}, the path is the one cell {lE} (green, then blue), the arm jumps to the goal configuration (red if blocked) and the label shows the original's rendering of `Round[∞, 0.01]` (K-BF-01). There is no "no path" message although the Details call the planner resolution complete. |
| Q-BF-06 | quirk kept | Both glyphs take the colour of the arm at the CURRENT cell (`inCollision` of `ccord`), not of their own configuration: with P = 1 a start in collision has a green glyph, with P = 0 a blocked goal does. |
| Q-BF-07 | quirk kept | The arm is drawn at the centre of the current path cell (θ1 = (2c − 1)π/L, θ2 = −(2r − 1)π/L), not at the locator positions; at P = 0 and P = 1 it can be up to half a cell away from the start/goal locator. |
| Q-BF-08 | quirk kept | Cell rule asymmetry: the row is `Round[0.5 + pS[[2]]]` without a lower guard, the column `Round[Max[1, pS[[1]] + 0.5]]`; Round is half to even, so on an exact cell boundary k the cell is k for even k and k + 1 for odd k. Whether y = yMax (reached by every wrap from below) gives row 1 or row 0 depends on the division rule (F-BF-09, K-BF-03). |
| Q-BF-09 | quirk kept | `Ceiling[progress*Length[path]]` in machine arithmetic with the slider values 0. + k·0.01 (for these k the same doubles as the decimal literals): for a 50-cell path P = 0.14 gives 7.000000000000001 → cell 8, P = 0.28 → 14.000000000000002 → 15, P = 0.56 → 28.000000000000004 → 29. |
| Q-BF-10 | quirk kept | Blocked cells and free-but-unreachable cells look the same (ArrayPlot's default dark red for `Infinity`). |
| Q-BF-11 | quirk kept | The grey levels are scaled by the largest number ArrayPlot finds in `costmapcolor`, i.e. after the path cells have been replaced by colours (K-BF-02): moving the goal onto the farthest cell can change every grey. |
| Q-BF-12 | quirk kept | θ2 is negative; the elbow arc runs from θ1 down to θ1 + θ2, and `arrowArc` puts its head at θ1 + θ2 pointing along the counter-clockwise tangent, i.e. against the arc; the θ2 label condition uses `Abs`. |
| Q-BF-13 | quirk kept | Shared with the other app: wrap by jumping to the opposite edge (Q-RM-01); coarse 4Q grid, search and path while dragging (Q-RM-03); a non-integer Q gives Floor[16Q] cells stretched over the inset (Q-RM-02; L = Floor[16Q] is also used by the cell rule, so locators and cells stay consistent); Details text "16Q unit squares" for (16Q)² cells. |
| D-BF-01 | deviation | The ArrayPlot is drawn as an L × L image (nearest-neighbour scaling) inside the SVG (as D-RM-02). Grey value of a cost v: round(255 (1 − v/max)); dark red drawn as (127, 0, 0) as measured in the snapshots; Mathematica's exact Raster bytes are to be taken from the harness (H-BF-19). |
| D-BF-02 | deviation | Update rate and ControlActive approximated (as D-RM-03): one evaluation per animation frame while dragging, one more on release. |
| D-BF-03 | deviation | The shared sliders (`steps: 'mma'`) snap typed values to the step (Q whole numbers, P = 0. + k·0.01, the original's discrete values); value fields show Mathematica's text: Q always plain ("2"), P "1" in the opening state and after a typed whole number (Mathematica keeps a typed Integer exact; shared `ui.js` since the review of v0.1.15), a dragged or stepped P as a machine real ("0.", "0.5"). |
| D-BF-04 | deviation | Sizes, fonts, arrowheads, glyphs approximated (as D-RM-05). Fonts (`arm-view.js` `FONT`, Medium 12 px, other texts 10 px, Arial/Helvetica/sans-serif) measured at 2× against snapshot 1 (review of v0.1.15): "robot workspace" 144 × 20 px in the port vs 146 × 19 in the snapshot, "robot phase space, path length = 1.57 rads" 379 × 20 vs 379 × 19, the axis labels θ1/θ2 18 × 19 / 19 × 20 vs 17 × 19 / 19 × 19 (the earlier 13/12 px were about 20–24 % too large). |
| D-BF-05 | deviation | Locator picking with the shared 12 px no-jump zone; ties go to the first of pObs, pObs2, pConfigI, pConfigF (as D-RM-06). |
| D-BF-06 | deviation (provisional) | Unreachable goal: the port shows "path length = ∞ rads" until the harness shows what the original's `StringForm` displays for `Round[∞, 0.01]` (K-BF-01). |
| D-BF-07 | deviation (provisional) | Row 0. Every drag of the start or goal locator below the bottom edge (the range reaches −2.1) wraps it to exactly y = yMax. With the a·(1/b) division the port uses (COMMON-DECISIONS §4), that is row 1 and nothing special happens. If H-BF-14/H-BF-22 show that Mathematica divides exactly, the cell is row 0: `bfsTorus` stays unevaluated (its condition fails), `{parents, costmap} = …` fails with Set::shape and keeps the old values, and the path walk from a row-0 goal runs into `Part` errors (K-BF-03); the port would then keep the previous parents and cost map, walk the old tree to its root and drop what lies beyond — to be specified from the harness record before implementation. **Implemented in v0.1.15 (provisional, decided while building because the draft left it open):** `bfsTorus` returns nothing for a start outside the grid and the port then keeps the previous `parents` and `costmap` (as Mathematica's failed `Set` does) and still sets `updatedCspace = False`, `updatedcostmap = True`; `getShortestPath` stops the walk at a cell outside the grid or without a parent (instead of Mathematica's `Part` errors); path cells outside the grid are not coloured; a goal cell outside the grid gives the label "path length = Indeterminate rads". With the a·(1/b) division and even L (every whole Q) none of this is reachable; it is reachable only with a typed non-integer Q through `__demo.setState` (E-BF-07). Harness run 2 settled the division (K-BF-03: row 1), so for every whole Q none of this is reachable; the provisional handling stays for a typed non-integer Q only. |
| D-BF-08 | deviation | The published notebook opens with the live state (F-BF-14) and computes nothing; the port starts from the Input cell's values and computes grid, search and path on its first evaluation (and again for "Initial settings"). Same resulting state (golden "bfs: the first evaluation of the initial settings gives the saved grid, costmap, parents and 9-cell path bit for bit"); only the work differs. |
| K-BF-01 | known issue (lead) | What `Round[DirectedInfinity[1], 0.01]` evaluates to and how `StringForm` displays it (∞? unevaluated `Round[∞, 0.01]`?). H-BF-11, M-BF-04. **Harness run 2 (Mathematica 15.0.1, accepted v0.1.17):** not decided: H-BF-11 captures no `%text` (its record — lE {1, 4}, path {{1, 4}}, inCollision True — matches the port); a TESTPLAN line with `"%text"` added is proposed for the next run. |
| K-BF-02 | known issue (lead) | The maximum used for the grey scale (over the numbers left in `costmapcolor` after path colouring, or over `costmap`), and Mathematica's exact grey and dark-red bytes. Snapshots fit 255 (1 − v/max) within a few levels and (127, 0, 0) but cannot separate the two maxima (the goal was never the farthest cell). H-BF-19. **Harness run 2 (Mathematica 15.0.1, accepted v0.1.17):** not decided: H-BF-19 records `costmapcolor` before ArrayPlot (cost map matched bit for bit; RGBColor[0, 0, 1] at the goal, RGBColor[0, 1, 0] on the path), not the Raster; deciding it needs `"%g"` in the capture (proposed for the next run). |
| K-BF-03 | known issue (lead, important) — resolved by harness run 2 | Division rule at y = yMax (F-BF-09, D-BF-07): row 1 under a·(1/b), row 0 (and the failure cascade) under a true division. This is an everyday case (any start/goal drag below the bottom edge), so the harness record decides `cellOf`'s division and the row-0 handling. H-BF-14 (start), H-BF-22 (goal), e2e "dragging the start locator below the bottom edge wraps it to the top row of the grid". **Resolved by harness run 2 (Mathematica 15.0.1):** a·(1/b). H-BF-14 records pS = {13.473684210526319, 3.552713678800501e-15}, lS = {1, 14} and no messages; H-BF-22 pE = {21.894736842105267, 3.552713678800501e-15}, lE = {1, 22}, no messages, label "path length = 3.59 rads". Row 1, as the port; the row-0 cascade of D-BF-07 is not reachable with a whole Q. |
| K-BF-04 | known issue (lead) | Snapshot 3's settings hold a grid computed with obstacle 2 at its default (1.1, −1.1) while pObs2 = pObs2Old = (1.278, −0.34) (`ref/findobs.py`: exact match at (1.1, −1.1); 579 + 358 cells differ from the grid of the saved position). The cache condition is false for these settings, so the original's picture shows the stale grid; how the state arose (hand-edited settings?) is unknown. The port reproduces it when loaded with these settings (golden) and the harness shows the recomputed picture (H-BF-04). **Harness run 2 (Mathematica 15.0.1, accepted v0.1.17):** the port matches H-BF-03 (stale grid kept, cache condition false) and H-BF-04 (recomputed for the saved positions); how the saved state arose stays open. |
| K-BF-05 | known issue (lead) | Non-integer Q from the ⊕ field (as K-RM-01): with Q = 5.31, 84.96 → 84 cells. M-BF-08, H-BF-08. **Harness run 2 (Mathematica 15.0.1, accepted v0.1.17):** kernel side resolved: H-BF-08 records resolution 84.96, 84 rows, lS {40, 36}, lE {40, 58}, matched by the port; whether the ⊕ field accepts typed values stays M-BF-08. |
| K-BF-06 | known issue (lead) | ControlActive in the original (as K-RM-02): is the coarse grid, search and path recomputed at every update of an obstacle drag, and does the release always trigger the fine evaluation? M-BF-06, H-BF-20/21. **Harness run 2 (Mathematica 15.0.1, accepted v0.1.17):** kernel side matched: H-BF-20 (controlActive) gives the 8 × 8 grid and highRes False, H-BF-21 the 32 × 32 grid and highRes True after the release update; the front end's timing stays M-BF-06. |
| K-BF-07 | known issue (lead) | Picking among four locators (as K-RM-05); the start/goal glyphs are `Locator` primitives, themselves draggable (COMMON-DECISIONS §4): whether a press on one moves only the glyph (snapping back on the next evaluation) or the Manipulate's invisible locator. M-BF-07. |
| K-BF-08 | known issue (lead, resolved by COMMON-DECISIONS §4) | The P slider's values are 0. + k·0.01 in machine arithmetic (seen in several snapshots); for the boundaries of Q-BF-09 they equal the decimal literals. H-BF-10 checks the arithmetic, M-BF-03 the slider. **Harness run 2 (Mathematica 15.0.1, accepted v0.1.17):** H-BF-10 (progress 0.14 → the 8th cell) matched bit for bit. |
| K-BF-09 | known issue (lead) | `1. (Pi/resolution)` and `2. (Pi/L)` of the stored Body (N-BF-06): with a whole Q (the slider's steps) `resolution` = 4 Q or 16 Q and L = `Length[costmap]` are exact integers, so `Pi/resolution` is exact and the machine factor makes it the correctly rounded π/resolution (taken as `N[Pi/n]`). The port computes that with `shared/exact-pi.js` `piOver(n)` (64-digit π, BigInt comparison of the neighbouring doubles) in the grid's iterator (`cSpaceTable(…, {exactPi: true})`, F-BF-08) and in the label (F-BF-15); a non-integer resolution (a typed Q, K-BF-05) keeps π·(1/res) (COMMON-DECISIONS §4). It changes the last bit of the cell angles for resolution 12, 24, 48 and 96 (Q 3 and 6; e.g. π/48 = 0.06544984694978737 instead of 0.06544984694978735) and nothing in the saved grids (golden tests unchanged). Whether Mathematica's `Times[1., Pi/48]` really rounds once is for the harness (H-BF-02 … H-BF-05, H-BF-20 compare the grids). **Harness run 2 (Mathematica 15.0.1, accepted v0.1.17):** not decided: every recomputed grid of the run (resolution 8, 16, 32, 84.96, 96, 112, 160 in H-BF-01, 02, 04 … 08, 20, 21) is the same under piOver(n) and π·(1/n) (scratch check of both rules on the port's inputs), and the record agrees with both; the labels are rounded to 0.01. |
| N-BF-01 | note | The saved state equals snapshot 1's settings. The independent reference (`_internal/batch-ab/design/robot-motion-obstacles/ref/cspace.py`, `bfs.py`, `cmp_bf.py`) reproduces grid, cost map (bit for bit), parents, path, lS and lE of all five saved states — snapshot 3 from its saved (stale) grid. No saved state has an unreachable free cell (Infinity counts 64, 160, 857, 516 equal the blocked counts). |
| N-BF-02 | note | Snapshot 4 (θ2 = −35.6°) shows a short elbow arc and no θ2 label: evidence that `Circle[c, r, {a0, a1}]` with a1 < a0 is drawn between the two angles — the same question as car-paths K-CP-01. |
| N-BF-03 | note | `freeConfigSpace` (−1/0) is never drawn; the cost map is. The parent of the start stays {0., 0.} (`{0., 0.} != {0, 0}` is False), which ends the path walk. |
| N-BF-04 | note | The fixtures need the Integer8 CompressedData decoder and the snapshot-Settings parser described in N-RM-04; the BFS cost maps contain `DirectedInfinity[1]`. |
| N-BF-05 | note | The snapshot labels: 1.57 (cost 8.0 on 32 cells), 2.99 (15.23/32), 2.58 (46.01999999999997/112), 4.31 (65.80999999999993/96). |
| N-BF-06 | note | Stored output cell vs Input cell: the Body is the same computation (grouping as quoted above: `1. (Pi/resolution)`, `L ((x - xMin)/(xMax - xMin))`, `((2. c - 1.)/L) Pi`, `(2. (Pi/L)) cost`); the stored Initialization equals the Input cell's except for the evaluated `xMax`/`yMax` literals and `Attributes[PlotRange] = {ReadProtected}`; the Specifications carry the initial settings (F-BF-14). Both division rules reproduce all saved data (`_internal/batch-ab/design/robot-motion-obstacles/ref/divcheck.py`). |
| N-BF-07 | note | Harness golden tests (v0.1.17): a Body local that the evaluation never assigns is recorded as `null` (HW-45, mp-original rule; H-BF-23 `resolution`, the initial settings compute nothing); the test reads it with `isUnassignedLocal` of `tests/support/harness-json.js` and expects the port's view field to be undefined. The other 22 records match the port without change. |

## 8. Proposed changes

No open proposal. Template (see [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md)):

| ID | Status | Requested by / date | Change | Reason | Acceptance criteria |
|----|--------|---------------------|--------|--------|---------------------|

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.15 | 2026-10-17 | first implementation, from the design draft of 2026-10-12 approved by the owner on 2026-10-17 (DEC-17; draft revised after review r2, COMMON-DECISIONS §3–§6 and owner rules R-A/R-B/R-C). Built as specified, on the shared `demos/common/arm-grid.js` and `arm-view.js` of robot-motion-obstacles; decided while building: the provisional out-of-grid handling of D-BF-07 (the draft left it to the harness), the harness test file (§6 Tests); review fixes |
| 2 | v0.1.16 | 2026-10-18 | version number only (batch B release); no change to this app |
| 3 | v0.1.17 | 2026-10-18 | harness run 2 accepted (Mathematica 15.0.1): all 23 records match the port, no app code changed. Golden test adapter: an unassigned local recorded as null (H-BF-23, N-BF-07). K-BF-03 resolved (a·(1/b), row 1; D-BF-07 updated); evidence added to K-BF-01, 02, 04, 05, 06, 08, 09 (01, 02, 09 not decided by the record) |
| 4 | v0.1.18 | 2026-10-18 | version number only (harness run 3 accepted for manipulability-ellipsoid); no change to this app |
| 5 | v0.1.19 | 2026-10-21 | main.js rewritten on the new shared Manipulate layer (`shared/manipulate.js`, `shared/graphics.js`): the controls are written as Manipulate control specs and the picture as Graphics data; no change to behaviour or picture (all unit, golden and browser tests unchanged and passing; screenshots and Manipulate state identical to v0.1.18 at sample settings); `demos/common/arm-view.js` now returns Graphics data (§6) |
| 6 | v0.1.20 | 2026-10-21 | bundle table only (the Manipulate layer now also loads `shared/ui-extra.js`, `ui-interval.js`, `random.js`); no change to this app |
| 7 | v0.1.21 | 2026-10-23 | version number; bundle table (shared modules renamed in v0.1.21: `shared/graphics-extras.js` etc.) |
| 8 | v0.1.22 | 2026-10-25 | version number; bundle table (`shared/manipulate.js` now also loads `shared/graphics-extras.js` and `shared/svg-frame.js` for the new Graphics options `Axes`/`Frame`/`PlotLabel`); no change to this app's code, behaviour or picture (pixel parity with v0.1.21) |
| 9 | v0.1.23 | 2026-10-25 | version number; the shared code gained plot functions, a geometry kit, 3D text and tube primitives and fixes for new apps (v0.1.23); no change to this app's code, behaviour or picture (pixel and scene parity with v0.1.22) |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|-------------|---------|-------------|---------|
| I-BF-01 | Use √2 for diagonal steps | path lengths in true grid radians | differs from the original's numbers | Q-BF-01 |
| I-BF-02 | Forbid diagonal steps between two blocked cells | paths do not squeeze through obstacle corners | differs from the original's paths | Q-BF-03 |
| I-BF-03 | Show "no path" for an unreachable goal and a different colour for unreachable free cells | the resolution-completeness claim becomes visible | changes the original's picture and label | Q-BF-05, Q-BF-10 |
| I-BF-04 | Colour each glyph by its own configuration | start/goal collisions are visible at any P | differs from the original | Q-BF-06 |
| I-BF-05 | Animate the arm continuously between cell centres and end exactly at the locators | smoother motion | departs from the original's cell-by-cell motion | Q-BF-07 |
| I-BF-06 | Fixed grey scale (e.g. by the largest cost of the cost map) | greys do not jump when the goal moves | differs from ArrayPlot's scaling | Q-BF-11 |

## 11. Errors in the original (conceptual and mathematical)

Owner rule R-C (2026-10-17). Checked: `bfsTorus` against breadth-first search and against shortest-path algorithms, the
step costs, `getShortestPath`, the cell rule `Round[{.5 + pS[[2]], Max[1, pS[[1]] + .5]}]` at every edge value the
torus wrap can produce, the angle of a cell (θ1 = (2c − 1)π/L, θ2 = −(2r − 1)π/L, consistent with the grid's link 2 at
a1 − a2), the label `Round[(2.0π/L) cost, 0.01]`, the glyph colours, caption and Details against the code, and the
quirks Q-BF-01…13. Independent checks: the route-choice example of E-BF-02 (29·1.41 = 40.89 < 41 < 41.012 = 29·√2),
the Round half-to-even cases of E-BF-07 with Python's `round` (also half to even).

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|------|-----------------------|--------------------------|--------------------|-------------------------|--------|
| E-BF-01 | conceptual | Title, caption "a resolution-complete planner that finds the shortest path … by using a breadth-first search", Details "The path is discovered using breadth-first search"; `bfsTorus` (`queue`, `AppendTo[queue, {r, c}]` whenever `lvl[[r,c]] > mylc`, costs 1.0 and 1.41) | Not a breadth-first search: a cell is queued again whenever a cheaper cost is found, so it is a FIFO label-correcting search (Bellman–Ford–Moore) on the 8-connected grid with weighted steps. Its result is the cheapest weighted path (which is what "shortest" needs), not a BFS hop count; a true BFS over 8 neighbours would treat diagonal and straight steps alike. | Keeps the algorithm and the name (Q-BF-01, Q-BF-02, F-BF-10). | Renaming (text) changes nothing computed. Replacing it by a real BFS would change every cost map, path and label (all golden "bfs: … bit for bit" tests, golden "bfs: the snapshot labels read path length = 1.57, 2.99, 2.58 and 4.31 rads", H-BF-…); a Dijkstra search with the same costs gives the same costs but other parents on ties (paths of snapshots 3 and 4 may change). Text fix only is the low-risk option. | open |
| E-BF-02 | mathematical | `mylc = lvl[[v[[1]], v[[2]]]] + 1.41` for the four diagonal neighbours | A diagonal step of the grid has length √2 = 1.41421…; 1.41 undercounts every diagonal by 0.3 % (the label "path length = … rads" is too short by that much per diagonal) and can change the chosen route: 29 diagonals cost 40.89 < 41 straight steps with 1.41 but 41.012 > 41 with √2, so where two routes differ by 29 diagonals against 41 straight steps (possible for L = 16Q ≥ 41, i.e. Q ≥ 3) the original takes the wrong one. | Keeps 1.41 (Q-BF-01, F-BF-10). | √2 (I-BF-01) changes the cost map wherever a diagonal is used: golden "bfs: the first evaluation of the initial settings gives the saved grid, costmap, parents and 9-cell path bit for bit" and the snapshot 2/3/4 golden tests (costmap; parents and paths where ties move), golden "bfs: the snapshot labels read path length = 1.57, 2.99, 2.58 and 4.31 rads" (1.57 has no diagonal and stays), the harness scenarios with costs; must be kept as "original mode" or re-baselined. Possible as an option. | open |
| E-BF-03 | conceptual | Details: "A resolution-complete planner returns a path between the initial and final configuration if it exists or returns that such a path is impossible."; `getShortestPath` (`If[parents[[ps]] != {0, 0}, …]`, else `{end}`) and no test of the start cell | Never reports "impossible": an unreachable or blocked goal gives the one-cell path `{lE}`, the arm jumps to the goal and the label shows `Round[∞, 0.01]` (K-BF-01); a start inside an obstacle region is not tested and the search spreads from it (the first move leaves a colliding configuration). | Keeps it (Q-BF-04, Q-BF-05, D-BF-06 for the label). | A "no path" text and a refused blocked start (I-BF-03) change the picture and label only in those cases: e2e "a goal inside an obstacle region gives a one-cell path and red glyphs", H-BF-11 and M-BF-04/05 change; no saved state has an unreachable goal (N-BF-01), so the golden tests stay. Possible as an option. | open |
| E-BF-04 | conceptual | `bfsTorus`: diagonal neighbours `{{1,1},{-1,1},{-1,-1},{1,-1}}` accepted when `cSpace[[r,c]] > -0.5` (only the target cell is tested) | A diagonal step between two blocked cells is accepted, so a returned path can cut through the corner where two obstacle cells meet: the arm passes through a colliding configuration although the planner claims a collision-free path. | Keeps it (Q-BF-03). | Forbidding such steps (I-BF-02) changes paths and costs only where a path cuts a corner; which saved states are affected is to be computed with the reference `bfs.py` before a decision (the golden "bit for bit" tests would show it). Possible as an option. | open |
| E-BF-05 | conceptual | `Locator[pConfigI, If[inCollision, loc[Red], loc[Darker[Green]]]]` and the same for `pConfigF`, with `inCollision` computed for `ccord`, the current path cell | Both glyphs show whether the **current** configuration collides, not their own: at P = 1 a colliding start has a green glyph, at P = 0 a blocked goal has a green one. The colour therefore says something false about the glyph it is drawn on. | Keeps it (Q-BF-06). | Colouring each glyph by its own configuration (I-BF-04) changes glyph colours only when start or goal collides; e2e "a goal inside an obstacle region gives a one-cell path and red glyphs" and M-BF-05 change; no golden value changes (glyph colours are not in the saved data). | open |
| E-BF-06 | text | Details: "This Demonstration computes the obstacle regions using 16Q unit squares and determines if the centroid of each square is in a collision." | The grid has (16Q)² cells (1024 at Q = 2) of side 2π/(16Q) rad, not 16Q unit squares (same text error as robot-motion-obstacles E-RM-01). | Shows the Details as in the original (F-BF-19, Q-BF-13). | Text only; no test changes. | open |
| E-BF-07 | numerical | `lS = Round[{.5 + pS[[2]], Max[1, pS[[1]] + .5]}]` with `pS = {L (x - xMin)/(xMax - xMin), L (1 - (y - yMin)/(yMax - yMin))}` and the wrap `applyTorus` that puts a locator exactly on an edge | The cell rule relies on rounding at exact cell boundaries: the row has no lower guard, so y = yMax (every wrap from below) gives row Round[0.5] = 0 (half to even) when the division is exact, and only the last-bit result 0.9999999999999999 of a·(1/b) saves row 1 (K-BF-03); neither index has an upper guard, so y = yMin (wrap from above; pS2 = L exactly) and x = xMax (wrap from the left, when the quotient rounds to exactly 1) give Round[L + 0.5] = L + 1, outside the grid, whenever L = Floor[16Q] is odd (only for a typed non-integer Q, e.g. Q = 1.0625 → L = 17). Out-of-range cells leave `bfsTorus` unevaluated and break the path walk (D-BF-07). | Keeps the rule with a·(1/b) division (F-BF-09, Q-BF-08, D-BF-07 provisional). | Clamping both indices to 1…L (`Min[L, Max[1, …]]`) removes the failures; with even L and a·(1/b) nothing visible changes, so all golden tests stay; e2e "dragging the start locator below the bottom edge wraps it to the top row of the grid" stays; H-BF-14, H-BF-22 (whatever they record) and M-BF-10 would differ only if the original shows row 0. | open |
