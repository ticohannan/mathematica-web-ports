# Design document: Robot Motion with Obstacles

| | |
|---|---|
| Code version: | 0.1.18 |
| Document revision | 1 (2026-10-17) — first implementation |
| Status | describes the app as implemented; changes go through Proposed changes (§8) |
| Original | Wolfram Demonstrations Project, "Robot Motion with Obstacles", contributed by Aaron T. Becker and Haoran Zhao, published 2016-04-18 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/RobotMotionWithObstacles/>. Readable source: `docs/original-source/robot-motion-obstacles.txt`; snapshots: `docs/original-snapshots/robot-motion-obstacles-1.png` … `-4.png` (the extraction's pictures 5 and 6 are the Wolfram logo, N-RM-03); stored output cell (Body, Initialization, Specifications and the initial settings): raw definition notebook lines 1074–1340 (Body 1133, Specifications 1281, Initialization 1305); fixture `tests/golden/robot-motion-obstacles.original-states.json` (`states[0]` live state, raw line 1076; `snapshots[1…4]` the snapshot Settings, raw lines 2117, 2946, 3747, 4533; `specs` the initial settings) |
| Port files | `demos/robot-motion-obstacles/model.js` (constants, one evaluation of the Manipulate body; pure), `main.js` (SVG drawing, locators, Q slider, ControlActive tracking), `index.html`; shared with "Breadth-First Search Robot Motion Planning" and owned by this app (COMMON-DECISIONS §3): `demos/common/arm-grid.js` (new, pure, CC BY-NC-SA) and `demos/common/arm-view.js` (new, browser-only, CC BY-NC-SA); they compose `demos/common/two-link.js` (`armSegments`, `armGeometry`) and `demos/common/arrow-arcs.js` (`arrowArc`) owned by two-link-kinematics, and `LOC_ICON` of `demos/common/prm-core.js` |
| Role in the project | further demonstration (batch A) |

## 1. Purpose and background

A two-link planar arm (links of length l = 1, drawn as rounded bars of half-width w = 1/8) turns about a fixed base
in the workspace on the left; two small circular obstacles (radius w) can be dragged. The right half shows the robot's
phase space (configuration space) θ1 × θ2 ∈ [0, 2π]² as a black-and-white grid: a cell is black when the arm, placed at
the cell centre's angles, touches an obstacle. The user drags an invisible locator in the phase space to set the arm's
angles; it wraps around at the edges (the phase space is a torus, shown by solid/dashed frame lines of the same colour).
The grid has 32Q × 32Q cells; Q is a slider. While a control is dragged the grid is computed at a quarter of the
resolution (8Q × 8Q) and refined on release. The Details text explains the curse of dimensionality (k^n cells for n
joints). Reference: Spong, Hutchinson, Vidyasagar, *Robot Modeling and Control* (2006).

## 2. Scope

In scope: the original's controls (Q slider, two obstacle locators, the invisible configuration locator), the torus
wrap, the collision test, the configuration-space grid with its cache and ControlActive behaviour, the drawing (arm
with angle arcs and labels, obstacles, phase-space inset with its frame, texts, coloured locator glyph), title, caption
and Details text.
Out of scope (would need a design entry first): path planning (that is the BFS Demonstration, which shares this
port's code), more links or obstacles, exact obstacle-region boundaries.

## 3. Users and use cases

| ID | User | Use case |
|----|------|----------|
| UC-RM-01 | student | move the arm through its phase space and see which configurations collide with an obstacle |
| UC-RM-02 | student | move an obstacle in the workspace and watch its phase-space region change shape |
| UC-RM-03 | student | change Q and see how the grid (32Q × 32Q collision checks) refines — the curse of dimensionality |
| UC-RM-04 | tester | compare the port with the original's saved state, snapshot settings and snapshots |

## 4. Features

### 4.1 Controls

| ID | Feature | Reason | Since | Verified by |
|----|---------|--------|-------|-------------|
| F-RM-01 | Slider "Q" (italic label): `{{Quality, 2, Style["Q", Italic]}, 1, 10, 1, Appearance -> "Labeled"}` — 1…10, step 1, default 2, value shown, ⊕ animation panel; `ControlPlacement -> Top`; values `min + k·step` (shared slider `steps: 'mma'`; here the integers 1…10) | resolution of the phase-space grid, 32Q × 32Q cells (UC-RM-03) | v0.1.15 | e2e "has the controls of the original with their defaults: Q 2"; e2e "the Q slider changes the grid to 32Q by 32Q cells"; harness "H-RM-02"; harness "H-RM-03"; M-RM-05 |
| F-RM-02 | Obstacle locators `{{pObs, {1.1, 1.1}}, {-2, -2}, {2, 2}, Locator}` and `{{pObs2, {1.1, -1.1}}, {-2, -2}, {2, 2}, Locator}`: default locator glyph (visible), drag limited to −2…2 in x and y | relocate the obstacles (UC-RM-02) | v0.1.15 | e2e "dragging an obstacle with the mouse shows the coarse grid while dragging and the fine grid after release"; unit "obstacle locators are limited to -2..2 and the configuration locator to {2.8, -2.1}..{6.799999999999999, 1.9}"; M-RM-03; e2e "has the controls of the original with their defaults: Q 2" |
| F-RM-03 | Configuration locator `{{pConfig, {5, 0}}, {xMin - .1, yMin - .1}, {xMax + .1, yMax + .1}, Locator, Appearance -> None}` = range {2.8, −2.1} … {6.799999999999999, 1.9} (values of the saved `specs`): invisible; what the user sees is the Locator primitive drawn at pConfig (F-RM-16) | set the arm's angles (UC-RM-01) | v0.1.15 | e2e "dragging the configuration locator with the mouse rotates the arm"; unit "obstacle locators are limited to -2..2 and the configuration locator to {2.8, -2.1}..{6.799999999999999, 1.9}"; M-RM-06; e2e "has the controls of the original with their defaults: Q 2" |
| F-RM-04 | The three Locator controls form one LocatorPane over the whole graphic, which "by default directs any click to the nearest locator": a press anywhere makes the nearest of pObs, pObs2, pConfig jump to the press point (limited to its range) and drags it (shared `addLocators(..., {pickAnywhere: true})`; D-RM-06) | the original's mouse behaviour (as in the ten ports) | v0.1.15 | e2e "a press away from every locator moves the nearest locator there"; M-RM-07 |

### 4.2 Model (`model.js`, `demos/common/arm-grid.js`)

| ID | Feature | Reason | Since | Verified by |
|----|---------|--------|-------|-------------|
| F-RM-05 | Constants "to space the overlay plot": `xMin = 2.9; yMin = -2; xMax = xMin + 3.8; yMax = yMin + 3.8` in machine arithmetic (xMax 6.699999999999999, yMax 1.7999999999999998, xMax − xMin 3.7999999999999994, yMax − yMin 3.8); Module locals `w = 1/8`, `l = 1`; the stored Initialization assigns the evaluated literals `xMax = 6.699999999999999`, `yMax = 1.7999999999999998` (same doubles) | same geometry and mapping as the original | v0.1.15 | unit "xMin, yMin, xMax, yMax in machine arithmetic: 2.9, -2, 6.699999999999999, 1.7999999999999998" |
| F-RM-06 | "enable torus property": `If[pConfig[[1]] < xMin, pConfig[[1]] = xMax]; If[pConfig[[1]] > xMax, pConfig[[1]] = xMin]` and the same for y with yMin/yMax, tolerant comparisons, assigned to the Manipulate variable (the invisible locator jumps to the opposite edge, Q-RM-01) | the phase space is a torus (Details) | v0.1.15 | unit "a configuration locator left of xMin jumps to xMax and one right of xMax jumps to xMin"; unit "a configuration locator below yMin jumps to yMax and one above yMax jumps to yMin"; unit "a configuration locator exactly on an edge does not wrap (tolerant Less)"; harness "H-RM-06"; harness "H-RM-07"; harness "H-RM-17"; e2e "dragging the configuration locator past the right edge wraps it to the left edge"; harness "H-RM-19" |
| F-RM-07 | Angles, as in the stored Body: `θ1 = (((pConfig[[1]] - xMin)/(xMax - xMin)) 2) Pi`, `θ2 = (((pConfig[[2]] - yMin)/(yMax - yMin)) 2) Pi`, the machine division computed as a·(1/b) (COMMON-DECISIONS §4 working rule, K-RM-06); at {5, 0}: θ1 = 3.4722866171255617 (198.9°), θ2 = 3.306939635357677 (189.5°) under both division rules; at y = yMax (after a wrap from below) θ2 = 6.283185307179585 with a·(1/b), 6.283185307179586 with a true division (H-RM-19 decides) | locator position → arm angles (UC-RM-01) | v0.1.15 | unit "locator {5, 0} gives Theta1 3.4722866171255617 and Theta2 3.306939635357677"; harness "H-RM-01"; harness "H-RM-19"; e2e "dragging the configuration locator with the mouse rotates the arm" |
| F-RM-08 | `pointsegdis2[{seg, pointlist}]` as written: u = a − b, mean = (a + b)/2, t = −(2 (p − mean).u)/u.u, closest point = mean − u Sign[t] Min[1, Abs[t]]/2, result = Min over the points of `EuclideanDistance[p, closest]` | the original's distance test | v0.1.15 | unit "pointsegdis2 is the distance to the nearest point of the segment, clamped to the end points"; unit "pointsegdis2 takes the minimum over the point list" |
| F-RM-09 | `inCollision` = pointsegdis2[link 1 {0,0} → l{Cos θ1, Sin θ1}] < 2w \|\| pointsegdis2[link 2 elbow → elbow + l{Cos[θ1+θ2], Sin[θ1+θ2]}] < 2w (tolerant Less, Or stops at the first True); the obstacles enter as points, so 2w = 1/4 is exactly bar half-width + disk radius (N-RM-05) | colour of the outline and the glyph | v0.1.15 | unit "inCollision is False at the initial settings (green glyph in snapshot 1)"; unit "a straight arm at 45 degrees through obstacle 1 is in collision"; harness "H-RM-08"; e2e "the configuration glyph and the arm outline turn red when the arm touches an obstacle" |
| F-RM-10 | Grid `freeConfigSpace = Table[If[link 1 or link 2 at (a1, a1 − a2) closer than 2w, 1, 0], {a2, Pi/resolution, 2 Pi - Pi/resolution, 2 (Pi/resolution)}, {a1, …}]` (stored Body; the Input cell writes `(2π)/(resolution)`): rows a2, columns a1, cell centres (2k − 1)π/resolution; link 2 at the ABSOLUTE angle a1 − a2 (N-RM-02); resolution = 32 Quality (8 Quality while a control is active); number of rows/columns = Mathematica's Table iterator count (resolution for whole values, Floor for others, e.g. 169 for 169.92; Q-RM-02, K-RM-03); 1 = blocked | the phase-space obstacle region (UC-RM-01, UC-RM-02) | v0.1.15 | golden "robot-motion: the first evaluation of the initial settings gives the saved 64 x 64 grid (240 blocked cells)"; golden "robot-motion: snapshot 2 settings (Q 5.31) give the saved 169 x 169 grid (4600 blocked cells)"; golden "robot-motion: snapshot 3 settings (Q 8) give the saved 256 x 256 grid (10133 blocked cells)"; golden "robot-motion: snapshot 4 settings (Q 5.31, obstacle 2 outside the locator range) give the saved 169 x 169 grid (1484 blocked cells)"; golden "robot-motion: every sample of the saved grids is at least 5e-6 from the 1/4 threshold"; unit "the table has res rows and columns for whole res and Floor[res] for res = 169.92"; unit "row i and column j sample a2 = (2i - 1) pi/res and a1 = (2j - 1) pi/res with link 2 at a1 - a2"; unit "an obstacle at the origin blocks every cell, obstacles farther than 2.25 from the origin block none"; harness "H-RM-04"; harness "H-RM-05"; harness "H-RM-16"; harness "H-RM-18"; harness "H-RM-02"; harness "H-RM-03" |
| F-RM-11 | Cache and ControlActive: the grid is recomputed only `If[(pObsOld != pObs \|\| pObs2Old != pObs2 \|\| QualityOld != Quality \|\| !highRes), …]` (tolerant Unequal); inside, `resolution = ControlActive[highRes = False; 8 Quality, highRes = True; 32 Quality]`; afterwards `pObsOld = pObs; pObs2Old = pObs2; QualityOld = Quality` | fast coarse feedback while dragging, fine grid at rest (the original's TODO comment) | v0.1.15 | unit "the grid is recomputed only when an obstacle or Q changed or the last grid was coarse"; unit "while a control is active the grid has 8Q cells per side and highRes is False"; unit "pObsOld != pObs is tolerant: a change of 1 ulp does not recompute the grid"; golden "robot-motion: evaluating a saved state again changes nothing (cache condition false)"; e2e "dragging an obstacle with the mouse shows the coarse grid while dragging and the fine grid after release"; harness "H-RM-11"; harness "H-RM-12"; harness "H-RM-13"; harness "H-RM-14"; harness "H-RM-15"; M-RM-04 |
| F-RM-12 | Initial values. The live state and the initial settings (stored `"Variables"`/Specifications, raw lines 1112 and 1281) are equal: pObs {1.1, 1.1}, pObs2 {1.1, −1.1}, pConfig {5, 0} (exact integers), Quality 2, freeConfigSpace = the 64 × 64 grid of the saved state, highRes True, pObsOld {1.1, 1.1}, pObs2Old {1.1, −1.1}, QualityOld 2: the published notebook opens, and its ⊕ → Initial Settings resets, with the cache condition false, so nothing is computed. The Input cell's values (pObsOld = pObs2Old = {−3, −2}, QualityOld 1, freeConfigSpace and highRes from their `None` specs) compute the same grid on the first evaluation; the port starts from these and computes (D-RM-07), so it opens in the live state, and its "Initial settings" restores the stored `"Variables"` the same way (A-RM-01). One evaluation per front-end update | same opening state as the original | v0.1.15 | golden "robot-motion: the first evaluation of the initial settings gives the saved 64 x 64 grid (240 blocked cells)"; golden "robot-motion: evaluating a saved state again changes nothing (cache condition false)"; harness "H-RM-01"; harness "H-RM-20" |

### 4.3 Graphics (SVG)

| ID | Feature | Reason | Since | Verified by |
|----|---------|--------|-------|-------------|
| F-RM-13 | Outer graphic: `PlotRange -> {{-2.2, 7.1}, {-2.4, 2.4}}`, `ImageSize -> {600, 320}`, no plot-range padding (measured: 64.5 px per unit in the snapshots, D-RM-05); texts in Gray (the list's first directive): "robot workspace" at {0, 2.25}, "robot phase space" at {4.8, 2.25}, θ1 at {4.8, −2.2}, θ2 at {2.8, 0} | the original's layout | v0.1.15 | e2e "loads without errors and draws the arm, the obstacles and the phase space"; golden "robot-motion: snapshot 1 shows Q 2, a green glyph at {5, 0} and the arm at 198.9 and 189.5 degrees"; M-RM-02 |
| F-RM-14 | Arm and obstacles: Gray fill and `If[inCollision, EdgeForm[Red], EdgeForm[Black]]` at the top of the Graphics list, so the edge colour applies to both bars AND to the Brown obstacle disks (black outline in snapshot 1, red in collision); `Arrowheads[0.02]`; link 1 = `Rotate[Rectangle[{-w, -w}, {l + w, w}, RoundingRadius -> w], Theta1, {0, 0}]`; black base point; Darker[Gray] `arrowArc[Circle[{0, 0}, l/3, {0, Theta1}]]` and, if `Abs[Theta1] > Pi/4` (tolerant Greater, Q-RM-05), the label θ1 (Medium) at (l/2){Cos[θ1/2], Sin[θ1/2]}; link 2 = the same bar from the elbow, rotated by θ1 + θ2 about the elbow, with the black text "Robot Arm" at its middle, rotated with it; black elbow point; `arrowArc[Circle[elbow, l/3, {Theta1, Theta1 + Theta2}]]` and label θ2 if `Abs[Theta2] > Pi/4`; `arrowArc` = the arc plus an arrow whose shaft is r/10^6 long, ending at the arc's end point along the counter-clockwise tangent there (only the head is visible); then the Brown disks of radius w (on top of the arm). Geometry from `two-link.js` `armGeometry({r1: 1, r2: 1, theta1, theta2, w: 1/8, theta1LabelRadius: 1/2, robotArmLabel: 'link2'})` and `arrow-arcs.js` `arrowArc`, drawn by `arm-view.js` `drawArm` | the arm, its angles and the obstacles (UC-RM-01) | v0.1.15 | unit "armGeometry and arrowArc: stadiums, arcs, arrowheads and label positions at the initial settings"; unit "the theta labels are shown only when Abs[theta] > pi/4"; e2e "the configuration glyph and the arm outline turn red when the arm touches an obstacle"; e2e "loads without errors and draws the arm, the obstacles and the phase space"; harness "H-RM-08"; M-RM-02; M-RM-08; golden "robot-motion: snapshot 1 shows Q 2, a green glyph at {5, 0} and the arm at 198.9 and 189.5 degrees" |
| F-RM-15 | Phase-space inset: `Inset[ArrayPlot[freeConfigSpace, Mesh -> None, ImageMargins -> None, ImagePadding -> None, PlotRangePadding -> None, FrameStyle -> {{Red, Directive[Red, Dashed]}, {Blue, Directive[Blue, Dashed]}}], {xMin, yMin}, {0, 0}, xMax - xMin]`: square of side 3.7999999999999994 from (2.9, −2); row 1 at the top; ArrayPlot's default colours (0 white, 1 black); frame left Red, right Red dashed, bottom Blue, top Blue dashed, no ticks (snapshots) | the phase space (UC-RM-01) | v0.1.15 | unit "arrayPlotColors: 0 white, 1 black, row 1 at the top"; golden "robot-motion: the snapshot pictures show the saved grids (at least 99 percent of cell centres agree)"; harness "H-RM-09"; harness "H-RM-10"; e2e "the Q slider changes the grid to 32Q by 32Q cells"; M-RM-02; e2e "loads without errors and draws the arm, the obstacles and the phase space" |
| F-RM-16 | Configuration glyph: the Locator primitive `Locator[pConfig, If[inCollision, loc[Red], loc[Darker[Green]]]]` drawn last; `loc[col]` is the original's 17 px icon, drawn from `LOC_ICON` of `demos/common/prm-core.js` (identical definition) by `arm-view.js` `locIcon`; such a Locator primitive is itself draggable in Mathematica (K-RM-05) | shows the configuration and whether it collides | v0.1.15 | e2e "the configuration glyph and the arm outline turn red when the arm touches an obstacle"; M-RM-02; M-RM-08; harness "H-RM-08"; unit "inCollision is False at the initial settings (green glyph in snapshot 1)" |
| F-RM-17 | Title, caption and Details text of the original (with the reference) | explains the Demonstration | v0.1.15 | M-RM-01 |

### 4.4 Port additions

| ID | Feature | Reason | Since | Verified by |
|----|---------|--------|-------|-------------|
| A-RM-01 | "Initial settings" button: all controls and locators back to the opening state (the initial settings = the live state of F-RM-12, reached by one evaluation from the Input-cell values, D-RM-07) | stands in for the Manipulate ⊕ menu → Initial Settings | v0.1.15 | e2e "Initial settings restores the opening state" |
| A-RM-02 | Arrow keys move a focused locator (0.05 units, Shift = 0.25); each key press is one update with ControlActive False (full-resolution grid) | keyboard access | v0.1.15 | e2e "arrow keys move a focused locator (port addition)" |
| A-RM-03 | `window.__demo` automation hook: `getState`, `setState` (any variable, e.g. Q = 5.31 or the snapshot settings), `view` (angles, inCollision, grid size, glyph colour), `moveLocator`, `worldToClient`, `gridImageSize` | automated tests | v0.1.15 | e2e "dragging an obstacle with the mouse shows the coarse grid while dragging and the fine grid after release" |
| A-RM-04 | "All demos" link | site navigation | v0.1.15 | inventory; M-GEN-01 |
| A-RM-05 | Credit footer: original title, authors, licence, adaptation notice | required by CC BY-NC-SA 3.0 | v0.1.15 | e2e "attribution on" |
| A-RM-06 | Start-up notice (watchdog, `<noscript>`) when the page cannot start (DEC-22) | a clear message instead of an empty page | v0.1.15 | e2e "start-up notice when" |
| A-RM-07 | standalone bundle (owner rule R-A): `npm run bundle -- robot-motion-obstacles` builds `dist/robot-motion-obstacles/` with exactly the files the app imports, the licences, a generated README and a root `index.html` (§6, "Building and deploying this app alone") | anyone can host this one app elsewhere without the rest of the site (owner rule R-A, 2026-10-17) | v0.1.15 | e2e "bundle: robot-motion-obstacles runs from its own folder"; unit "bundle contents listed in DESIGN.md match the collector" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|-------------|---------|
| `slider-Quality` | F-RM-01 |
| `value-Quality` | F-RM-01 |
| `plus-Quality` | F-RM-01 |
| `play-Quality` | F-RM-01 |
| `stepback-Quality` | F-RM-01 |
| `stepfwd-Quality` | F-RM-01 |
| `locator-pObs` | F-RM-02, F-RM-04, A-RM-02 |
| `locator-pObs2` | F-RM-02, F-RM-04, A-RM-02 |
| `locator-pConfig` | F-RM-03, F-RM-04, A-RM-02 |
| `reset` | A-RM-01 |
| `crumbs` | A-RM-04 |
| `details` | F-RM-17 |
| `credits` | A-RM-05 |

## 6. Design

**Files.** `model.js` (pure, Node-testable): `initialState()`, `evaluate(state, {controlActive})` — exactly one
evaluation of the Manipulate body (wrap of pConfig, θ1/θ2, pObsV, inCollision, the cache `If` with ControlActive, the
grid, the "Old" variables) returning the new state and a view object (angles, inCollision, arm geometry and arcs, grid, glyph
colour). `main.js` keeps the Manipulate variables (`pObs`, `pObs2`, `pConfig`, `Quality`, `freeConfigSpace`, `highRes`,
`pObsOld`, `pObs2Old`, `QualityOld`), draws, and calls `evaluate` after every change, as Mathematica re-evaluates
the body. `index.html` as in the other 2D ports.

**Shared code (new) — `demos/common/arm-grid.js`** (pure, CC BY-NC-SA 3.0, header crediting both originals and
two-link-kinematics; owned by this app, COMMON-DECISIONS §3). The functions that this Demonstration and "Breadth-First
Search Robot Motion Planning" (same first author, same Initialization code) define identically or with only
exact-vs-machine constants. Original names where the original has one. Machine divisions of the stored code are
computed as a·(1/b) (COMMON-DECISIONS §4 working rule; K-RM-06):

| Export | Meaning | Used by |
|--------|---------|---------|
| `xMin, yMin, xMax, yMax` | 2.9, −2, 6.699999999999999, 1.7999999999999998 (the stored literals = xMin + 3.8, yMin + 3.8) | RM, BF |
| `W, L` | w = 1/8, l = 1 | RM, BF |
| `PLOT_RANGE, IMAGE_SIZE` | {{−2.2, 7.1}, {−2.4, 2.4}}, {600, 320} | RM, BF |
| `OBS_RANGE, CONFIG_RANGE` | locator ranges {−2, −2}…{2, 2} and {2.8, −2.1}…{6.799999999999999, 1.9}; `clampTo(p, range)` | RM, BF |
| `pointsegdis2([seg, pointlist])` | F-RM-08 (t = −(2 (p − mean).u)·(1/u.u)) | RM, BF |
| `armHits(theta1, phi2, obs, margin = 2 * W)` | on `armSegments(theta1, phi2, 1, 1)` of `two-link.js`: `mLess(pointsegdis2(link1), margin) \|\| mLess(pointsegdis2(link2), margin)` (Or short-circuit) | RM, BF |
| `tableCount(res, {exactPi})`, `tableAngles(res, {exactPi})` | iterator `{a, Pi/res, 2 Pi - Pi/res, 2 (Pi/res)}`: count = Floor[(max − min)·(1/step) + 1e-10] + 1 (tolerance per K-RM-03), values min + k·step; min = π·(1/res), or with `exactPi` (BF, K-BF-09) and a whole res the correctly rounded π/res (`shared/exact-pi.js` `piOver`) | RM, BF |
| `cSpaceTable(obs, res, hit, free, {exactPi})` | F-RM-10: rows a2, columns a1, `armHits(a1, a1 - a2, obs) ? hit : free` (RM: 1/0, BF: −1/0) | RM, BF |
| `applyTorus(p)` | the BFS original's function; RM's inline "enable torus property" code is the same rule (F-RM-06) | RM, BF |
| `locatorToAngles(p)` | F-RM-07 | RM |
| `arrayPlotColors(array)` | ArrayPlot's default colouring as RGBA bytes, row 1 first: a number v → GrayLevel[1 − Abs[v]/Max[Abs[numbers]]] (zero → white; all-zero array → white), a colour entry → that colour, anything else (Infinity) → default dark red RGBColor[0.5, 0, 0] (BF) | RM, BF |

Not in arm-grid.js (COMMON-DECISIONS §3): the arm geometry (`armSegments`, `armGeometry`, in `two-link.js`), the
arcs (`arrowArc`, in `arrow-arcs.js`), `LOC_ICON` (imported from `prm-core.js` only), and the original's unused
helper (`isCollided` in the Input cell, `inCollision[{seg, pointlist}, d]` in the stored Initialization; N-RM-01).

`demos/common/arm-view.js` (browser-only, CC BY-NC-SA, owned by this app): `drawArm(plot, layer, geometry, arcs,
{edge, link1Fill, link2Fill, labelColor})` (draws `armGeometry` + the two `arrowArc` results; RM: link 2 Gray, BF:
LightGray), `drawGridInset(plot, layer, rgba)` (rgba = `arrayPlotColors(array)`, whose width and height give n: an
n × n canvas turned into an SVG `<image>` over the inset square with `image-rendering: pixelated`; one element instead
of up to 102 400 rects at Q = 10; test id `grid-image` with `data-width`/`data-height`), `drawInsetFrame(plot, layer)`
(the FrameStyle lines, no ticks; 0.5 px lines, 2 px dashes as measured in the snapshots), `locIcon(plot, color)` (draws
prm-core's `LOC_ICON`, the drawing that `prm-robot-arm/main.js` has inline). Helpers added while building (no
behaviour of their own): `drawArrowArc` (one `arrowArc` result: the arc polyline and its arrowhead triangle),
`drawThetaLabel` (θ with a subscript), `drawObstacles` (the Brown disks under the arm's EdgeForm), `obstacleGlyph`
(the default locator glyph of the obstacle locators: `shared/svg-plot.js` `darkLocatorGlyph`, `locatorGlyph` with a
dark translucent ring, as measured in the snapshots; rrt's goal locator uses the same) and `FONT` (the two font sizes of D-RM-05).

**Tests.** `tests/unit/arm-grid.test.js` (the shared grid module), `tests/unit/robot-motion-obstacles.test.js`,
`tests/golden/robot-motion-obstacles.golden.test.js` (saved states and snapshot pictures; `tests/support/png.js` reads
the pictures), `tests/golden/robot-motion-obstacles.harness.test.js` (one test `harness "H-RM-nn"` per harness scenario:
replays `tests/harness/robot-motion-obstacles.scenarios.json` on the model and compares with
`tests/golden/robot-motion-obstacles.harness.json`; skipped with "no harness data (owner run pending)" until the owner's
Mathematica run is accepted), `tests/e2e/robot-motion-obstacles.spec.js`.

**Reused (existing).** `shared/svg-plot.js` (`createPlot` with `padding: 0`, `addLocators` with `pickAnywhere: true`,
`onStart`/`onEnd`, `darkLocatorGlyph` for the two obstacle locators), `shared/ui.js` (`Controls.slider` with ⊕ panel and
`steps: 'mma'`),
`shared/mma.js` (`mLess`, `mGreater`, `mUnequal`, `mEqual`), `shared/mma-colors.js` (`NAMED.Gray`, `NAMED.Brown`,
`darker`), `demos/common/prm-core.js` (`LOC_ICON`, `TWO_PI`), `demos/common/two-link.js` (`armSegments`,
`armGeometry`), `demos/common/arrow-arcs.js` (`arrowArc`), `shared/requirements.js` (start-up notice). Not
applicable: prm-core's `ptInPoly` and motion-planning's `SegmentIntersectionQ`/`linelineInt` — these originals use a
point-to-segment distance only. `demos/prm-robot-arm/model.js` defines the same xMin…yMax, `toAngles`, `clampLoc` and a
3D `pointsegdis2`; it keeps them (moving it onto arm-grid.js would be a separate approved change, I-RM-05).

**ControlActive.** `controlActive` is true from a pointer press on the Q slider or a locator until the pointer is
released anywhere; on release `main.js` evaluates once more with `controlActive = false` (pattern of
`prm-robot-arm/main.js`). Keyboard moves, typed values and the ⊕ animation evaluate with `controlActive = false`.

**Evaluation order** (as in the body): wrap pConfig → θ1, θ2 → pObsV → inCollision → (inside the Graphics list) the
cache `If` and the grid → drawing. Drawing order: arm link 1, base point, arc 1 (+label), link 2 with "Robot Arm",
elbow point, arc 2 (+label), obstacle disks, grid inset with frame, the four texts, the configuration glyph; the
Manipulate's obstacle locator glyphs on top.

**Initial state.** `initialState()` returns the Input cell's values (Olds {−3, −2}, QualityOld 1, highRes False); the
first evaluation computes the live state of F-RM-12 (D-RM-07).

**Numerics.** All arithmetic in doubles (D-RM-01); machine divisions as a·(1/b) (K-RM-06). Tolerant `<`, `>`, `!=` from `shared/mma.js` wherever the original
compares reals. `xMax - xMin` is computed, not written as 3.8. Performance: Q = 10 → 320² = 102 400 cells × up to 4
point–segment distances ≈ 10 ms in JS (the original needs seconds, which is why it has the coarse mode).

### 6.1 Building and deploying this app alone

Owner rule R-A (2026-10-17): this one app can be taken out of the repository and hosted anywhere.

- Command, in the repository folder: `npm run bundle -- robot-motion-obstacles` → `dist/robot-motion-obstacles/` (with `--zip` also
  `dist/robot-motion-obstacles.zip`; `npm run bundle -- --all` bundles every app). `tools/bundle-app.mjs` follows every file the page
  loads (HTML, static imports, stylesheet) and copies exactly those, keeping the repository's folder layout, so no path
  is rewritten.
- Contents (generated with `node tools/bundle-app.mjs robot-motion-obstacles --update-docs`; unit "bundle contents listed in DESIGN.md
  match the collector" keeps the table current):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/robot-motion-obstacles/`) | 3 | `index.html`, `main.js`, `model.js` |
| `shared/` | 9 | `exact-pi.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `mma.js`, `requirements.js`, `style.css`, `svg-plot.js`, `ui.js` |
| `demos/common/` | 5 | `arm-grid.js`, `arm-view.js`, `arrow-arcs.js`, `prm-core.js`, `two-link.js` |
| added by the bundler | 7 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/robot-motion-obstacles/DESIGN.md` |
<!-- bundle-contents:end -->

- Added files: `index.html` opens the app (the app's "All demos" link, `../../index.html`, leads back to it), a
  generated `README.md` (title, the credits of the footer, licence summary, how to serve and test), `.nojekyll`
  (GitHub Pages), this document, `LICENSE.md` and the `LICENSES/` texts of the SPDX identifiers found in the copied
  files (CC BY-NC-SA 3.0 for this app and the `demos/common/` modules, MIT for `shared/`).
- Requirements: any static web server (`npx serve`, `python -m http.server`, GitHub Pages); not `file://` (browsers
  block ES modules there); a current browser with ES modules (Firefox, Chromium, WebKit); no WebGL (SVG and a 2D canvas
  for the grid picture). No server-side code.
- Checked by e2e "bundle: robot-motion-obstacles runs from its own folder" (A-RM-07, `tests/e2e/bundle.spec.js`): the bundle folder
  alone is served, its root page must open the app, the app must start (`window.__demo.ready`) without page errors,
  every request must stay inside the folder and succeed, and every script and stylesheet of the bundle must be loaded.

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

| ID | Kind | Description |
|----|------|-------------|
| Q-RM-01 | quirk kept | The torus wrap assigns the opposite edge (`pConfig[[1]] = xMax`), it does not shift by the period: a locator dragged past the left edge jumps to the right edge, and while the pointer stays outside every update sets it there again (θ1 = 2π, full θ1 arc). A position exactly on an edge does not wrap (tolerant Less). |
| Q-RM-02 | quirk kept | A non-integer Q (snapshots 2 and 4 have Q = 5.3100000000000005, resolution 169.92) gives Floor[169.92] = 169 cells per side sampled at (2k − 1)π/169.92, but ArrayPlot stretches them over the whole inset, so cell k is drawn up to 0.92 cell (0.54 %) away from its angle; the picture no longer matches the locator exactly at the far edges. |
| Q-RM-03 | quirk kept | While any control is dragged and the grid is recomputed, it has 8Q cells per side (16 × 16 at Q = 2) and `highRes` becomes False; the next evaluation with the control released recomputes at 32Q. Dragging the configuration locator alone never recomputes (cache condition false). |
| Q-RM-04 | quirk kept | The glyph colour and the red outline use the continuous angles of the locator, the grid uses cell centres: near a region boundary the glyph can be red on a white cell or green on a black one. |
| Q-RM-05 | quirk kept | Angle labels appear only when `Abs[Theta] > Pi/4`, a tolerant Greater: θ within 2^-46 (relative) of π/4 counts as equal and has no label (e.g. θ1 = 0.7853981633974486, 3 ulp above π/4, at pConfig {3.375, −2}; H-RM-08); θ ∈ [0, 2π] here, so θ1 = 350° shows its label while 40° does not; at θ = 0 the arc is empty but its arrowhead is still drawn. |
| Q-RM-06 | quirk kept | Texts kept although inexact: the caption and Details say "32Q unit squares" (there are (32Q)²), the variable holding the BLOCKED cells is called `freeConfigSpace`, and the caption says "Move the locator in phase space vertically or horizontally" (any direction works). |
| Q-RM-07 | quirk kept | A loaded state may hold positions outside the locator ranges (snapshot 4: pObs2 = {2.1, 1.1}); they are used as they are, only dragging is limited. |
| D-RM-01 | deviation | The original evaluates the grid with exact angles when Q is a whole number (`Cos[π/64]` etc., numericised when combined with the machine obstacle positions) and with machine angles otherwise; the port always uses doubles. Effect: none on the five saved grids (reproduced cell for cell; the closest sample is 9.6e-6 from the 1/4 threshold, snapshot 3); a cell can differ only if a sample lies within about 1e-15 of the threshold. |
| D-RM-02 | deviation | The ArrayPlot is drawn as an n × n image scaled with nearest-neighbour sampling inside the SVG. Mathematica rasterises and resamples its own way; with cells smaller than a screen pixel (Q ≥ 8: 256 or more cells in 245 px) edges differ by a pixel. The snapshots themselves agree with the saved grids at 99.3–100 % of cell centres. |
| D-RM-03 | deviation | Update rate and ControlActive are approximated: the port evaluates once per animation frame while dragging and once more on release; ControlActive is true only while a slider or locator is dragged with the mouse (as D-PA-07). |
| D-RM-04 | deviation | The shared slider (`steps: 'mma'`, values min + k·step) snaps typed values to whole numbers, so Q = 5.31 (snapshots 2 and 4) cannot be entered in the port (K-RM-01); the model accepts any Q (golden tests, `__demo.setState`). Value fields show "2" like the original's label. |
| D-RM-05 | deviation | Sizes approximated: no plot-range padding (measured in snapshot 1: the obstacle centres at y = ±1.1 are 284 px apart at 2× resolution → 64.5 px per unit = 600/9.3), fonts (`arm-view.js` `FONT`: Medium 12 px for the arm's θ labels, 10 px for the other texts, all in Arial/Helvetica/sans-serif as rrt's label; measured at 2× against snapshot 1 (review of v0.1.15): "robot workspace" 144 × 19 px in the port vs 145 × 19 in the snapshot, "robot phase space" 163 × 19 vs 163 × 19, the arm's θ1/θ2 20 × 22 / 21 × 23 vs 18 × 23 / 21 × 23, the axis labels θ1/θ2 17 × 19 / 17 × 20 vs 16 × 19 / 19 × 19; the earlier 13/12 px in the system sans-serif were about 20–24 % too large), arrowheads as filled triangles 2 % of the plot width long and 0.6 of that wide, point size (0.8 % of the width), frame lines 0.5 px with 2 px dashes, the `loc` icon and the default locator glyph as SVG (the obstacle locators' ring darkened with black at opacity 0.3, which matches the 70 % brown measured under the ring in snapshot 1, (108, 73, 39) against (155, 105, 55); the ring's exact shape differs). Snapshot pictures and the port's screenshots at the same settings were compared by eye (v0.1.15): same layout, grid, arm, labels and glyph positions. |
| D-RM-06 | deviation | Locator picking (shared `addLocators`): a press within 12 px grabs a locator in place, a press farther away makes the nearest one jump there; ties go to the first of pObs, pObs2, pConfig. The no-jump distance and the tie rule of the original are unknown (M-RM-07). |
| D-RM-07 | deviation | The published notebook opens with the live state (stored grid, Olds = current, highRes True; F-RM-12) and computes nothing; the port starts from the Input cell's values and computes the grid on its first evaluation (and again for "Initial settings"). The resulting state is the same (golden "robot-motion: the first evaluation of the initial settings gives the saved 64 x 64 grid (240 blocked cells)"); only the work done differs. |
| K-RM-01 | known issue (lead) | How the original got Q = 5.3100000000000005 (snapshots 2 and 4) with a step-1 slider: typed into the ⊕ panel's field, or edited settings? If the original accepts typed non-integer values, the port's value field should too (a proposed change). M-RM-05. |
| K-RM-02 | known issue (lead) | ControlActive details in the original: is the body evaluated once more on release for every control (obstacle locators, configuration locator, Q slider, ⊕ animation)? How often is the coarse grid recomputed during a drag? M-RM-04. |
| K-RM-03 | known issue (lead) | Table's iteration count and values for a machine-number resolution: the count Mathematica uses near whole numbers (e.g. Q = 2.03125 → resolution 65.0, where (2π − 2π/65)/(2π/65) may come out as 63.99999999999999) and whether the values are min + k·step or accumulated. Reproduced for 169.92 (golden); the port's tolerance 1e-10 is a guess. The tolerance is also needed for a whole machine resolution: BF's coarse grid at Q = 2 (resolution 8.) gives (max − min)/step = 6.999999999999999, which without it would make 7 rows instead of 8 (H-BF-20 decides). H-RM-05. **Harness run 2 (Mathematica 15.0.1, accepted v0.1.17):** the count is resolved for the case recorded: H-RM-05 (Q = 2.03125, resolution 65.) records 65 rows, as the port with its tolerance; H-BF-20's resolution is the exact integer 8 (Quality = 2 exact), so it does not test the machine case. Whether the values are min + k·step or accumulated is not visible in a 0/1 grid; the tolerance 1e-10 stays a choice. |
| K-RM-04 | known issue (lead) | ArrayPlot of a constant array: all zeros (both obstacles out of reach) should be white ("zero values are shown white"), all ones (an obstacle at the base) black; to be confirmed with the Raster the harness records (H-RM-09, H-RM-10). **Harness run 2 (Mathematica 15.0.1, accepted v0.1.17):** not decided: H-RM-09 and H-RM-10 capture `freeConfigSpace` only (all 0, all 1, matched); the Raster colours need `"%g"` (TESTPLAN change proposed for the next run). |
| K-RM-05 | known issue (lead) | Picking in the original (as K-PA-05): a press in the workspace near the phase space can move an obstacle locator to its range limit x = 2; a press at {0, 0} is equally far from both default obstacles; and the drawn `Locator[pConfig, …]` glyph is itself a draggable Locator primitive (COMMON-DECISIONS §4): whether a press on it moves only the glyph (which snaps back on the next evaluation) or the Manipulate's invisible locator is unknown; the port always moves the Manipulate locator. M-RM-07. |
| K-RM-06 | known issue (lead) — resolved by harness run 2 | Last bits: machine `a/b` is taken as a·(1/b) (COMMON-DECISIONS §4 working rule) in the angle mapping, `pointsegdis2` and `Pi/resolution` — the last only for a non-integer Q (a machine resolution such as 169.92): with a whole Q (the slider's steps) `resolution` is an exact integer, `Pi/resolution` is exact and the Table iterator works with exact multiples of π, which the port evaluates in machine numbers (D-RM-01; BF's `1. (Pi/resolution)` is the correctly rounded π/resolution there, K-BF-09); `EuclideanDistance` and the browser's `Sin`/`Cos` may also differ in the last bit. Visible only (a) within about 1e-15 of the 1/4 threshold (D-RM-01) and (b) at y = yMax after a wrap from below, where θ2 is 6.283185307179585 (a·(1/b)) or 6.283185307179586 (true division). Both rules reproduce all saved grids (`ref/divcheck.py`); H-RM-01 and H-RM-19 decide. **Resolved by harness run 2 (Mathematica 15.0.1):** a·(1/b). H-RM-19 records Theta2 = 6.283185307179585 (a true division would give 6.283185307179586); H-RM-01 records the 64 × 64 grid (240 blocked), Theta1 = 3.4722866171255617, Theta2 = 3.306939635357677, matched bit for bit, and all 20 records match the port's `Sin`/`Cos`/distance arithmetic in Node. |
| N-RM-01 | note | The Input cell defines `isCollided[{seg, pointlist}, d]`, the stored Initialization the same helper under the name `inCollision[{seg, pointlist}, d]` with `If[Map[… < d &, pointlist], 1, 0]` (a list as condition, so it would stay unevaluated); neither is used (the Body's `inCollision` is a Module local) and neither is ported (COMMON-DECISIONS §3). |
| N-RM-02 | note | The table uses link 2 at a1 − a2 with row 1 (a2 small) at the top, while the arm uses θ1 + θ2 with θ2 growing upwards. Cell row i is drawn where the locator gives θ2 = 2π − a2, so a1 − a2 ≡ θ1 + θ2 (mod 2π): picture and locator agree. |
| N-RM-03 | note | The extraction's snapshot pictures 5 and 6 are the Wolfram logo, not the Demonstration; snapshot 1 equals the saved state. |
| N-RM-04 | note | The saved state, the initial settings and all four snapshot Settings store `freeConfigSpace` as CompressedData of Integer8 packed arrays; `tools/extract_state.py --snapshots` decodes them (unsigned 8-bit packed arrays, `packedTypes` in the fixture) into `tests/golden/robot-motion-obstacles.original-states.json` (COMMON-DECISIONS §1). Independent reference decoder of the design: `_internal/batch-ab/design/robot-motion-obstacles/ref/dec2.py`, `snapstates.py`. |
| N-RM-05 | note | The collision test equals the drawn geometry: bar half-width w plus disk radius w = 2w. Obstacles farther than 2 + 2w = 2.25 from the base can never be touched; the locator range allows up to 2√2. |
| N-RM-06 | note | The body assigns its own variables (pConfig on wrap, freeConfigSpace, highRes, the Olds); a second evaluation of the result changes nothing, so whether the front end re-evaluates (K-SL-02) has no visible effect here. |
| N-RM-07 | note | Stored output cell vs Input cell: the Body is the same computation written as `(((p - xMin)/(xMax - xMin)) 2) Pi` and `2 (Pi/resolution)`; the Initialization differs only by the evaluated `xMax`/`yMax` literals, the renamed unused helper (N-RM-01) and `Attributes[PlotRange] = {ReadProtected}`; the Specifications carry the initial settings (F-RM-12). Quoted control specs above are the same in both. |
| N-RM-08 | note | Harness golden tests (v0.1.17): a Body local that the evaluation never assigns is recorded as `null` (HW-45; H-RM-20 `resolution`, the initial settings compute nothing); the test reads it with `isUnassignedLocal` of `tests/support/harness-json.js` and expects the port's view field to be undefined. |

## 8. Proposed changes

No open proposal. Template (see [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md)):

| ID | Status | Requested by / date | Change | Reason | Acceptance criteria |
|----|--------|---------------------|--------|--------|---------------------|

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.15 | 2026-10-17 | first implementation, from the design draft of 2026-10-12 approved by the owner on 2026-10-17 (DEC-17; draft revised after review r2, COMMON-DECISIONS §3–§6 and owner rules R-A/R-B/R-C). Built as specified; additions while building: the arm-view.js helpers and the measured frame and glyph sizes (§6, D-RM-05), the harness test file (§6 Tests). New shared code: `demos/common/arm-grid.js`, `demos/common/arm-view.js`; review fixes |
| 2 | v0.1.16 | 2026-10-18 | version number only (batch B release); no change to this app |
| 3 | v0.1.17 | 2026-10-18 | harness run 2 accepted (Mathematica 15.0.1): all 20 records match the port, no app code changed. Golden test adapter: an unassigned local recorded as null (H-RM-20, N-RM-08). K-RM-06 resolved (a·(1/b)); evidence added to K-RM-03 (count) and K-RM-04 (not decided) |
| 4 | v0.1.18 | 2026-10-18 | version number only (harness run 3 accepted for manipulability-ellipsoid); no change to this app |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|-------------|---------|-------------|---------|
| I-RM-01 | Draw a non-integer-Q grid at its true angular extent (or round Q) | cells line up with the locator at every Q | differs from the original's snapshots 2 and 4 | Q-RM-02 |
| I-RM-02 | Show the number of collision checks ((32Q)²) next to Q | makes the curse-of-dimensionality point of the Details visible | a new text element needs a design entry | Q-RM-06 |
| I-RM-03 | Wrap the dragged locator by shifting it one period (keeping it under the pointer's continued motion) | smoother crossing of the torus seam | departs from the original's jump | Q-RM-01 |
| I-RM-04 | Colour the glyph from the grid cell under it, or overlay exact region boundaries | glyph and picture always agree | differs from the original | Q-RM-04 |
| I-RM-05 | Move `prm-robot-arm/model.js`'s xMin…yMax, `toAngles`, `clampLoc` and `pointsegdis2` onto `demos/common/arm-grid.js` | one implementation of the shared overlay code | touches a published app; needs its tests re-run | F-RM-05, F-RM-08 |

## 11. Errors in the original (conceptual and mathematical)

Owner rule R-C (2026-10-17). Checked: `pointsegdis2` against the projection onto a segment (with s = 2(p − mean)·u/u·u,
the code's t = −s and closest point mean − u clamp(t)/2 = mean + u clamp(s)/2: correct), the collision radius 2w (bar
half-width plus disk radius: correct, N-RM-05), the angle mapping and the cell centres (2k − 1)π/res against the inset
placement (column j and row i land on θ1 = (2j − 1)π/res and θ2 = 2π − (2i − 1)π/res, with link 2 at a1 − a2 ≡ θ1 + θ2:
correct, N-RM-02), the frame colours against the Details (red/red dashed = θ1 edges, blue/blue dashed = θ2 edges), the
caption and Details, and the quirks Q-RM-01…07.

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|------|-----------------------|--------------------------|--------------------|-------------------------|--------|
| E-RM-01 | text | Caption: "The obstacle regions are computed using 32Q unit squares."; Details: "This Demonstration computes the obstacle regions using 32Q unit squares and determines if the centroid of each square is in a collision." | The grid has 32Q × 32Q = (32Q)² squares (4096 at Q = 2), and they are not unit squares: each side is 2π/(32Q) rad. The next paragraph's k<sup>n</sup> argument needs exactly this square count. | Shows caption and Details as in the original (F-RM-17, Q-RM-06). | Text only ("(32Q)² squares"); no value, golden data or test changes; M-RM-01 records the difference as intended. | open |
| E-RM-02 | numerical | `Table[…, {a2, π/resolution, 2π - π/resolution, 2π/resolution}, {a1, …}]` with `resolution = 32 Quality` and the inset `Inset[ArrayPlot[freeConfigSpace, …], {xMin, yMin}, {0, 0}, xMax - xMin]` | For a non-integer Q (snapshots 2 and 4: Q = 5.31, resolution 169.92) Table takes Floor[169.92] = 169 samples at the true angles (2k − 1)π/169.92, but ArrayPlot stretches the 169 cells over the full 2π square: cell k is drawn up to 0.92 cell (0.54 % of 2π) away from the angle it was computed for, so the picture and the locator disagree near the far edges. Reachable by typing Q in the ⊕ field (as the snapshots show). | Keeps it (Q-RM-02, F-RM-10); the port's value field cannot take non-integer Q (D-RM-04), only `__demo.setState` and the golden tests can. | Drawing the cells at their true extent (I-RM-01) or rounding Q changes the picture for non-integer Q only: golden "robot-motion: the snapshot pictures show the saved grids (at least 99 percent of cell centres agree)" for snapshots 2 and 4 and M-RM-05 would no longer match; the saved 169 × 169 grids themselves (golden tests of snapshots 2 and 4) stay. Possible as an option. | open |
| E-RM-03 | conceptual | `If[pConfig[[1]] < xMin, pConfig[[1]] = xMax]; If[pConfig[[1]] > xMax, pConfig[[1]] = xMin]` (and the same for y) under the comment "enable torus property" | A torus wrap should subtract or add one period (xMax − xMin), keeping the overshoot. The original sets the locator to the opposite edge: a drag up to 0.1 past an edge (the locator range ends at xMin − 0.1, xMax + 0.1) loses up to 0.1/3.8 · 2π = 0.165 rad (9.5°) of the angle, and while the pointer stays outside, every update sets the edge value again — the arm does not follow the pointer there. | Keeps it (Q-RM-01, F-RM-06). | A period shift (I-RM-03) makes the arm follow the pointer across the seam. Changes harness H-RM-06, H-RM-07, H-RM-19 (wrapped values), unit "a configuration locator left of xMin jumps to xMax and one right of xMax jumps to xMin", unit "a configuration locator below yMin jumps to yMax and one above yMax jumps to yMin", e2e "dragging the configuration locator past the right edge wraps it to the left edge" and M-RM-06; positions exactly on an edge (H-RM-17) unchanged. Possible as an option. | open |
