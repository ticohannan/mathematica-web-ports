# Design document: Shortest Path for the Dubins Car

| | |
|---|---|
| Code version: | 0.1.26 |
| Document revision | 1 (2026-10-17) — first implementation |
| Status | describes the app as implemented; changes go through *Proposed changes* (§8) and [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md) |
| Original | Wolfram Demonstrations Project, "Shortest Path for the Dubins Car", contributed by Aaron T. Becker and Shiva Shahrokhi, published 2017-12-14 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/ShortestPathForTheDubinsCar/>. Readable source: [`docs/original-source/dubins-path.txt`](../../docs/original-source/dubins-path.txt); snapshots: `docs/original-snapshots/dubins-path-1.png` … `dubins-path-4.png` (pictures 5 and 6 of the extraction are the Wolfram icon, not snapshots); golden fixture (COMMON-DECISIONS §1): `tests/golden/dubins-path.original-states.json` with `states[0]` = the live output-cell state, `snapshots[1…4]` = the `"Settings"` of the four snapshot cells (raw definition notebook lines 3511, 4416, 5299, 6178) and `specs` = the initial settings (output cell `"Variables"`, line 2047, and `"Specifications"`, line 2235); exact values kept as `{"wl": …}` |
| Port files | `dubins.js` (the original's functions `angPt2Pt`, `distPt2Pt`, `arcLen`, `drawLSL` … `drawRLR` with their drawings as data, the `Sort` selection, the moving-car module, one evaluation of the Manipulate body and `picture`, its Graphics list as `shared/graphics.js` data (v0.1.21); pure), `main.js` (the Manipulate on `shared/manipulate.js`: controls, locators, Graphics options; v0.1.19), `index.html`; new shared module owned by this app: `demos/common/car-icon.js` (CC BY-NC-SA 3.0; header credits "Shortest Path for Forward and Reverse Motion of a Car", this Demonstration and "Isochrons for a Dubins Car"; `drawCar` with `{lights, beam, headlightEdge, id, arrowSize}` returning Graphics data (v0.1.21; before, records drawn by `drawCarSvg`), `wheelAngle`; car-paths uses it since v0.1.20; §6) |
| Role in the project | further demonstration (batch A) |

## 1. Purpose and background

Shows the shortest path of a Dubins car — a car that only drives forward and has a minimum turning radius
*r*<sub>min</sub> — from a fixed start pose (rear-axle centre at the origin, heading along +x) to a goal pose that the
user sets with two locators (goal position and goal heading). Dubins (1957) proved that the shortest path consists of at
most three pieces, each a circular arc of radius *r*<sub>min</sub> or a straight line; the six candidate "words" are LSL,
LSR, RSR, RSL, LRL, RLR. The original constructs each word geometrically from the four turning circles (left and right
of the start and of the goal), draws all existing words thin in their own colours, draws the shortest one thick and writes
its length. A progress slider drives a blue car along the shortest path, with the front wheels turned on the arcs.

Related app: car-paths (Reeds–Shepp and Dubins cars by the same group of authors). Its Dubins words are the algebraic
formulas of the Reeds–Shepp library; this Demonstration's words are a different, geometric construction with the same
lengths (N-DP-01), so the two apps share no word code (§6).

## 2. Scope

In scope: the original's two sliders (progress, *r*<sub>min</sub>), the goal position locator (visible) and the invisible
goal heading locator with their coupling rules, the six geometric words with their validity conditions, the selection by
`Sort`, the moving car, the drawing (start, goal and moving car, dashed turning circles, all candidate words, the
shortest word, the text label, the heading glyph).
Out of scope (would need a design entry first): a movable start pose, Reeds–Shepp words (car-paths app), the optimality
regions of reference [4] (mentioned in Details only), the unused `drawCarOld`, the unused control variable `goalTheta`.

## 3. Users and use cases

| ID | User | Use case |
|----|------|----------|
| UC-DP-01 | student | drag the goal car and its heading and see the six candidate words and the shortest one with its length |
| UC-DP-02 | student | change *r*<sub>min</sub> and see when LSR/RSL (circle distance > 2 *r*<sub>min</sub>) and LRL/RLR (< 4 *r*<sub>min</sub>) exist |
| UC-DP-03 | student | drive the car along the shortest path with the progress slider and see the steering on the arcs |
| UC-DP-04 | tester | compare the port with the original's saved state, the snapshot settings, the snapshots and the Mathematica harness |

## 4. Features

### 4.1 Controls

| ID | Feature | Reason | Since | Verified by |
|----|---------|--------|-------|-------------|
| F-DP-01 | "progress" slider: `{{progress,0.25},0,1,Appearance->"Labeled",ImageSize->400}` — continuous (no step), default 0.25, labelled value field and ⊕ animation panel; `ControlPlacement->Top` | drive the blue car along the shortest path (UC-DP-03) | v0.1.15 | e2e "dubins-path has the controls of the original with their defaults: progress 0.25 and r_min 3"; e2e "moving the progress slider with the mouse moves the blue car along the thick path"; M-DP-03 |
| F-DP-02 | *r*<sub>min</sub> slider: `{{minRadius,3,"r_min"},0.001,5,Appearance->"Labeled",ImageSize->400}` (label `SubscriptBox[r, min]`) — continuous, default 3 | the minimum turning radius (UC-DP-02) | v0.1.15 | e2e "dubins-path has the controls of the original with their defaults: progress 0.25 and r_min 3"; e2e "the r_min value field changes the turning circles and the path length"; golden "harness H-DP-14"; golden "harness H-DP-15"; M-DP-07; M-DP-08 |
| F-DP-03 | Goal position locator `{{goalXY,{2,2}},{-13,-8},{13,8},Locator}`: visible (Mathematica's default locator glyph), pointer positions limited to −13…13 × −8…8 | move the goal car (UC-DP-01) | v0.1.15 | e2e "dragging the goal locator with the mouse moves the goal car and keeps its heading"; e2e "the goal locator stops at 13 x 8"; M-DP-04 |
| F-DP-04 | Goal heading locator `{{goalThetaloc,{4,0}},Locator,Appearance->None}`: invisible, no range of its own (port: the plot range, D-DP-06), lying under the red heading glyph (F-DP-17). Both locators are picked as in a LocatorPane: a press within 12 px grabs the nearer locator in place, a press elsewhere makes the nearer one jump there (D-DP-05) | turn the goal car (UC-DP-01) | v0.1.15 | e2e "dragging the heading locator with the mouse turns the goal car"; e2e "a press away from both locators moves the nearer one there"; M-DP-05 |

### 4.2 Model (`dubins.js`)

| ID | Feature | Reason | Since | Verified by |
|----|---------|--------|-------|-------------|
| F-DP-05 | Locator coupling, first in the body: `If[goalXYold != goalXY, goalThetaloc = goalXY + 2{Cos[Theta],Sin[Theta]}; goalXYold = goalXY]` (tolerant Unequal), then `dTheta = Sqrt[…]` (distance heading locator − goal), `Theta = If[dTheta > 0, ArcTan[Δx, Δy], 0]`, `goalThetaloc = goalXY + 2{Cos[Theta],Sin[Theta]}`: a moved goal keeps the old heading and carries the heading locator; a moved heading locator sets Theta and is put back 2 units from the goal | headings are set by dragging a marker around the car | v0.1.15 | unit "locator coupling: a moved goal keeps its heading and carries the heading locator 2 units away"; unit "locator coupling: a moved heading locator turns the goal car and is put back 2 units away"; unit "the heading locator dropped on the goal centre gives heading 0"; golden "harness H-DP-03"; golden "harness H-DP-04"; golden "harness H-DP-05"; golden "harness H-DP-21" |
| F-DP-06 | Turning circles: start pose fixed at the origin with heading 0, `csL = {0,+minRadius}`, `csR = {0,-minRadius}`, `ceL = goalXY + minRadius{Cos[Theta+π/2],Sin[Theta+π/2]}`, `ceR = goalXY + minRadius{Cos[Theta-π/2],Sin[Theta-π/2]}` | the construction of all words | v0.1.15 | unit "turning circles at the opening state" |
| F-DP-07 | Helpers with the original's names: `angPt2Pt[ps,pe] = Chop[N[ArcTan[pe1-ps1, pe2-ps2]]]` (Mathematica argument order, angles below 10⁻¹⁰ become exact 0), `distPt2Pt[ps,pe] = Sqrt[(pe1-ps1)^2+(pe2-ps2)^2]`, `arcLen[aS,aE,dir]` (`Theta = aE-aS`; `While[dir>0 ∧ Theta<0, Theta+=2π; a2+=2π]`; `While[dir<0 ∧ Theta>0, Theta-=2π; a2-=2π]`; one further reduction if \|Theta\| > 2π; returns `{Abs[Theta], a1, a2}`) | the words are built from these | v0.1.15 | unit "angPt2Pt is ArcTan[dx, dy] with Mathematica argument order and Chop below 1e-10"; unit "distPt2Pt is the square root of the sum of squares"; unit "arcLen counts left arcs counter-clockwise within one turn"; unit "arcLen counts right arcs clockwise and moves the end angle with the arc" |
| F-DP-08 | CSC words as in the original, each returning `{length, drawing}`: `drawLSL` (outer tangent, `oLSL = minRadius{Cos[α-π/2],Sin[α-π/2]}`, arcs `arcLen[-π/2, α-π/2, 1]`, `arcLen[α-π/2, Theta-π/2, 1]`, Pink), `drawRSR` (Darker[Yellow]), `drawLSR` (inner tangent, only `If[dLR > 2 minRadius, …]` with `γ = ArcCos[2 (minRadius/dLR)]` (grouping of the stored definition), else `{∞, {}}`, Blue), `drawRSL` (same condition, Orange); lengths = tangent length + minRadius·(sum of arc angles) | the forward-only shortest-path candidates (UC-DP-01, UC-DP-02) | v0.1.15 | unit "the six word lengths at the opening state"; unit "every word length equals the algebraic Dubins formula of car-paths times r_min"; unit "every word drawing is a connected forward path from the start pose to the goal pose"; unit "LSR and RSL exist only when the circle distance exceeds 2 r_min"; golden "harness H-DP-12"; golden "harness H-DP-13"; golden "harness H-DP-18"; golden "harness H-DP-23" |
| F-DP-09 | CCC words: `drawLRL` (only `If[dLL < 4minRadius, …]`, `β = -ArcCos[dLL/(4 minRadius)]`, middle circle `cC = csL + 2minRadius{Cos[α-β],Sin[α-β]}`, arcs with dir 1, −1, 1, Brown) and `drawRLR` (dir −1, 1, −1, Darker[Green]); length = minRadius·(sum of the three arc angles) | the two all-arc words (UC-DP-02) | v0.1.15 | unit "LRL and RLR exist only when the circle distance is below 4 r_min"; unit "LRL pose: the middle arc turns right (Alpha = -r_min)"; unit "RLR pose: the middle arc turns left (Alpha = r_min)"; golden "harness H-DP-10"; golden "harness H-DP-11"; golden "harness H-DP-19" |
| F-DP-10 | Selection `shortestPath = (Sort[{dLSL,dLSR,dRSR,dRSL,dLRL,dRLR}])[[1]]` (the `MinimalBy` line is commented out): canonical order compares the lengths numerically (`∞` after every number) and, on equal lengths, the drawings, i.e. the colours (Q-DP-01) | the shortest word is drawn thick and labelled | v0.1.15 | unit "Sort tie-break: equal lengths are ordered by colour LSR, RLR, LRL, RSR, RSL, LSL"; unit "goal straight ahead: the four CSC words tie at length 8 and LSR (blue) is drawn"; golden "harness H-DP-06"; golden "harness H-DP-07"; golden "harness H-DP-09" |
| F-DP-11 | Moving car (the inner `Module[{distTrav,ang1,ang2,ang3,angP,xyP,drawing,Alpha}, …]`): `distTrav = progress·length`; on the first arc (`distTrav <= Abs[minRadius·ang1]`) the angle is interpolated on the arc, `Alpha = Sign[ang1] minRadius`, heading `angP += Sign[ang1+10^-6] π/2` (Q-DP-02); on the middle piece (`distTrav <= length - Abs[minRadius·ang3]`) either a circle (`Sign[ang2]`) or the line (`Alpha = 0`, heading `ArcTan` of the line); else the third arc (`Sign[ang3]`); drawn as `{Blue, drawCar[xyP, angP, Alpha, 0.8]}` | the car moving along the path with steering (UC-DP-03) | v0.1.15 | unit "moving car at the opening state and progress 0.25 is on the third arc"; unit "progress 0 puts the car on the start and progress 1 on the goal with the goal heading"; unit "on the straight segment Alpha is 0 and the heading is the line direction"; unit "goal (8, 3) heading up: RSL is drawn and at progress 0 the moving car faces backwards"; golden "harness H-DP-08"; golden "harness H-DP-16"; golden "harness H-DP-17"; golden "harness H-DP-22"; M-DP-03; M-DP-06 |
| F-DP-12 | Initial values = the live state = the initial settings (output cell `"Variables"`, line 2047, and `"Specifications"`, line 2235) = snapshot 1's Settings; the port opens in it and its "Initial settings" restores the stored `"Variables"` (A-DP-01): `goalXY = goalXYold = {2,2}`, `Theta = -π/4`, `goalThetaloc = {2+√2, 2-√2}` (exact), `goalTheta = 0`, `progress = 0.25`, `minRadius = 3`; one evaluation of the body per change. The Input cell has `Theta = π/2` and `goalThetaloc = {4,0}` instead; one evaluation of those gives the same state, so the opening picture is the same (Q-DP-03) | same opening picture as the original (snapshot 1) | v0.1.15 | unit "initial state is the live state and the Input-cell values give the same state after one evaluation"; unit "evaluation is idempotent to the last bit"; golden "dubins-path: the port's initial state is the live state and one evaluation keeps it"; golden "dubins-path: evaluating the saved state gives the label of snapshot 1 and keeps the locators"; golden "harness H-DP-01"; golden "harness H-DP-02"; golden "harness H-DP-24"; golden "harness H-DP-25" |

### 4.3 Graphics (SVG)

| ID | Feature | Reason | Since | Verified by |
|----|---------|--------|-------|-------------|
| F-DP-13 | Graphics frame: `PlotRange->{{-15,15},{-10,10}}`, `ImageSize->600`, `Background->Lighter[Gray,.92]` (RGB 0.96), no plot-range padding (measured, D-DP-08) | same picture as the original | v0.1.15 | e2e "dubins-path loads without errors and draws both cars, the turning circles, the candidate words and the label"; M-DP-02 |
| F-DP-14 | Drawing order of the original's `Graphics` list: `{Green, drawCar[{0,0},0,0,0.2]}` (start), `{Red, drawCar[goalXY,Theta,0,0.2]}` (goal), the heading glyph, `{Thin,Gray,Dashed, Circle[csL,r], Circle[csR,r], Circle[ceL,r], Circle[ceR,r]}`, `{Thin, dLSL[[2]], dLSR[[2]], dRSR[[2]], dRSL[[2]], dLRL[[2]], dRLR[[2]]}` (all existing words in their colours), the label, `{Thickness[0.005], shortestPath[[2]]}`, `{Blue, drawCar[xyP,angP,Alpha,0.8]}`; the Manipulate's goal locator glyph on top. Arcs `Circle[c, r, {a1, a2}]` are drawn between the two angles (as K-CP-01) | the picture of the Demonstration | v0.1.15 | e2e "dubins-path loads without errors and draws both cars, the turning circles, the candidate words and the label"; golden "dubins-path: snapshot settings 2 to 4 give the labels and path words of the pictures"; golden "dubins-path: snapshots 2 to 4 show the thick path in the colour of the computed word"; M-DP-02 |
| F-DP-15 | `drawCar[xy,Theta,Alpha,opac]`: the car-paths car (body 2 × 1 around the rear axle, axles and tyres in Darker[Gray], front tyres turned by `ArcTan[Alpha∓.375,1.4]`, arrow with `Arrowheads[.02]`) except that the yellow headlights have `EdgeForm[None]` | the car icon of the original | v0.1.15 | unit "drawCar of this Demonstration differs from the default car (car-paths"; M-DP-02 |
| F-DP-16 | Label `{Black, Style[Text[StringForm["`` path length, `` distance", Round[N[shortestPath[[1]]],0.01], N[Round[Sqrt[goalXY1^2+goalXY2^2],0.01]]], {0,8}], FontSize->14]}`: text centred at (0, 8) inside the plot; "distance" is the planar distance of the goal from the start (Q-DP-08) | the numbers of the Demonstration | v0.1.15 | unit "label: Round to 0.01 and a trailing point for whole numbers"; e2e "dubins-path label reads 20.76 path length, 2.83 distance at the start"; golden "dubins-path: snapshot 1 reads 20.76 path length and 2.83 distance with the pink LSL path" |
| F-DP-17 | Heading glyph `Locator[goalThetaloc, Graphics[{Red, {AbsoluteThickness[1], Antialiasing->False, LineBox[4 reticle arms from ±2 to ±10], Antialiasing->True, CircleBox[{-0.5,0.5},5]}, {AbsoluteThickness[3], Opacity[0.3], CircleBox[{-0.5,0.5},3]}}, ImageSize->17, PlotRange->{{-8,8},{-8,8}}]]` (not rotated; all four arms, unlike car-paths' vertical-only glyph) | shows where the heading locator is | v0.1.15 | e2e "dubins-path loads without errors and draws both cars, the turning circles, the candidate words and the label"; golden "dubins-path: snapshot 1 reads 20.76 path length and 2.83 distance with the pink LSL path"; M-DP-02 |
| F-DP-18 | Title, caption and details text (with the four references) of the original | explains the Demonstration | v0.1.15 | M-DP-01 |

### 4.4 Port additions

| ID | Feature | Reason | Since | Verified by |
|----|---------|--------|-------|-------------|
| A-DP-01 | "Initial settings" button: controls and locators back to the initial settings (= the live state, F-DP-12) | stands in for the Manipulate ⊕ menu → Initial Settings | v0.1.15 | e2e "Initial settings restores the opening state" |
| A-DP-02 | Arrow keys move a focused locator (0.1 units; Shift = 0.5); each key press is one update | keyboard access | v0.1.15 | e2e "arrow keys move a focused locator (port addition)" |
| A-DP-03 | `window.__demo` automation hook (state, view values incl. the six lengths and the chosen word, label text, `moveLocator`, `setState`, `worldToClient`) | automated tests | v0.1.15 | e2e "dubins-path label reads 20.76 path length, 2.83 distance at the start" |
| A-DP-04 | "All demos" link | site navigation | v0.1.15 | inventory; M-GEN-01 |
| A-DP-05 | Credit footer: original title, authors, licence, adaptation notice | required by CC BY-NC-SA 3.0 | v0.1.15 | e2e "attribution on" |
| A-DP-06 | Start-up notice (watchdog, `<noscript>`) when the page cannot start (DEC-22) | a clear message instead of an empty page | v0.1.15 | e2e "start-up notice when" |
| A-DP-07 | standalone bundle (owner rule R-A): `npm run bundle -- dubins-path` builds `dist/dubins-path/` with exactly the files the app imports, the licences, a generated README and a root `index.html` (§6, "Building and deploying this app alone") | anyone can host this one app elsewhere without the rest of the site (owner rule R-A, 2026-10-17) | v0.1.15 | e2e "bundle: dubins-path runs from its own folder" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|-------------|---------|
| `slider-progress` | F-DP-01 |
| `value-progress` | F-DP-01 |
| `plus-progress` | F-DP-01 |
| `play-progress` | F-DP-01 |
| `stepback-progress` | F-DP-01 |
| `stepfwd-progress` | F-DP-01 |
| `slider-minRadius` | F-DP-02 |
| `value-minRadius` | F-DP-02 |
| `plus-minRadius` | F-DP-02 |
| `play-minRadius` | F-DP-02 |
| `stepback-minRadius` | F-DP-02 |
| `stepfwd-minRadius` | F-DP-02 |
| `locator-goalXY` | F-DP-03, A-DP-02 |
| `locator-goalThetaloc` | F-DP-04, A-DP-02 |
| `reset` | A-DP-01 |
| `crumbs` | A-DP-04 |
| `details` | F-DP-18 |
| `credits` | A-DP-05 |

Non-interactive test ids of the graphic (not part of the inventory check): `plot-label`, `start-car`, `goal-car`,
`moving-car`, `heading-glyph`, `turning-circle-csL|csR|ceL|ceR`, `candidate-LSL` … `candidate-RLR`, `shortest-path`
(with `data-word`).

## 6. Design

- `dubins.js` (pure, no DOM) holds the original's functions under their names — `angPt2Pt`, `distPt2Pt`, `arcLen`,
  `drawLSL`, `drawLSR`, `drawRSR`, `drawRSL`, `drawLRL`, `drawRLR` — in the original's order of operations. Each `draw…`
  returns `[length, drawing]` with `drawing = {colour, word, pieces: [Circle[c, r, {a1, a2}] | Line[{from, to}], …]}`, the
  pieces as `shared/graphics.js` data (v0.1.21; before, `{kind:'arc', c, r, a1, a2}` / `{kind:'line', from, to}` records;
  `null` for a word that does not exist, length `Infinity`), so that the moving-car module can index it as the original
  does (`drawing[[2,3,1]]` = first arc's start angle `angles[0]`, `drawing[[3]]` = middle piece, `Head[…] == Circle`).
- `sortWords(cands)` reproduces `Sort[…][[1]]` on `{length, drawing}` pairs: lengths compared numerically, `Infinity` last;
  on equal lengths the drawings are compared in canonical order, which here means the colour triples lexicographically
  (Pink {1, .5, .5}, Blue {0, 0, 1}, Darker[Yellow] {2/3, 2/3, 0}, Orange {1, .5, 0}, Brown {.6, .4, .2},
  Darker[Green] {0, 2/3, 0}) → order LSR, RLR, LRL, RSR, RSL, LSL (Q-DP-01; K-DP-02 for the exact/machine form of the
  colour components).
- `movingCar(shortestPath, progress, minRadius)` is the inner Module, line for line (including the unguarded divisions,
  K-DP-10, and `Sign[ang1 + 10^-6]`, Q-DP-02).
- `evaluate(state)` performs exactly one evaluation of the Manipulate body: the coupling (F-DP-05), the circles, the six
  words, the selection, the label values, the moving car. `initialState()` gives the live-state values of F-DP-12 (machine numbers: Theta −0.7853981633974483, goalThetaloc (3.414213562373095, 0.5857864376269049), the values Mathematica's `N` gives for −π/4 and {2 + √2, 2 − √2}, harness H-DP-25). The state holds
  the Manipulate variables `goalXY`, `goalXYold`, `Theta`, `goalThetaloc`, `goalTheta` (kept, unused), `progress`,
  `minRadius`.
- Numerics (shared helpers, cite: `shared/mma.js` `mEqual`/`mUnequal`/`mLess`/`mGreater`/`chop`/`roundTo`;
  `shared/mma-exact.js` `arcTan` (bit-exact Mathematica `ArcTan[x, y]`); `shared/mma-extra.js` `mmaNumberString`):
  tolerant `!=` on the point lists (`goalXYold != goalXY`), tolerant `>`/`<` in the validity tests and in `arcLen`
  (comparisons with exact 0 are plain), `Chop` with 10⁻¹⁰, `Round[x, 0.01]` half to even, `Sqrt` of the sum of squares
  for `distPt2Pt` and the label distance (not `Math.hypot`, not dnrm2), `Math.acos`, `Math.cos`, `Math.sin` (K-DP-08).
  `a/b` is evaluated as `a*(1/b)` where the original divides machine numbers, with the grouping of the stored definitions (e.g. `2 (minRadius/dLR)`,
  `dLL/(4 minRadius)`, `distTrav/Abs[minRadius ang1]`, `ang2 ((distTrav - Abs[minRadius ang1])/Abs[minRadius ang2])`). The output cell's stored Initialization and Body were checked against the Input cells: same definitions and specs except the initial values (F-DP-12) and the extras of Q-DP-07.
- `dubins.js` `picture(state, view)` (v0.1.21) is the Manipulate's Graphics list as `shared/graphics.js` data in the
  original's order (F-DP-14): the three cars `{Green, drawCar[…]}` (`demos/common/car-icon.js`, `headlightEdge: null`,
  `Arrowheads[.02]` as `arrowSize` = 0.02 × the 600 px picture's width), the heading glyph as an `Inset` of a 17 px
  Graphics, the dashed circles, the candidate words and the shortest path (`{colour, pieces…}` annotated
  `candidate-<word>` / `shortest-path` with `data-word`), the label. Tests read its numbers with `annotations()`.
- `main.js` (v0.1.19; 77 → 42 lines in v0.1.21) is one `Manipulate({…})` call of `shared/manipulate.js`: the two
  sliders and the locators `goalXY`, `goalThetaloc` as Mathematica control specs (the layer draws them with
  `shared/svg-plot.js` `addLocators`, `pickAnywhere: true`, `locatorGlyph` for the visible goal locator), the Graphics
  options (`Background -> Lighter[Gray, .92]`), and a body returning `{state, view, graphics}` from `evaluate` and
  `picture`. No `Raw` part is left (before v0.1.21 the cars went through `drawCarSvg` as `Raw`). `shared/requirements.js`.
  The goal locator is drawn by the locator layer at `goalXY`; the heading locator is invisible (`appearance` → null) and
  the red glyph (F-DP-17) is drawn in the graphic at the reset `goalThetaloc`, in the original's drawing order.
- Reuse from car-paths. Shareable (identical code): `drawCar` except the headlight edge (F-DP-15), `wheelAngle`, the
  geometry helpers `rot`/`rectPts`, and `drawCarSvg` of car-paths' `main.js`. They move to
  `demos/common/car-icon.js` (owned by this app, CC BY-NC-SA 3.0 with credits to the three car Demonstrations;
  `drawCar(xy, Theta, Alpha, opac, {lights = true, beam = 4, headlightEdge = 'thin', id, arrowSize})`; since v0.1.21 it
  returns `shared/graphics.js` data — the body in the caller's colour, every part `Annotation[…, role]`, the arrow as
  shaft and filled head when `arrowSize` is given — and `drawCarSvg` / `demos/common/car-graphics.js` are gone).
  This app calls it with `headlightEdge: null`, dubins-isochrons with `{lights, beam: 8, headlightEdge: null}`.
  car-paths uses it since v0.1.20 (owner request to fold repeated code; its unit tests "drawCar: …" pass unchanged
  and its pictures are pixel-identical); `carpaths.js` re-exports `drawCar` and `wheelAngle` from it.
  Not shareable: car-paths' `dLSL` … `dRLR`, `getOptimalDubinsPath`, `getPos`, `drawPath`, the locator coupling — the
  formulas are different code (algebraic in the start frame with radius 1 vs. geometric with circle centres), the
  selection differs (`First@MinimalBy` in generation order vs. `Sort` with colour tie-break), the validity tests differ
  at the boundary (`ρ >= 2`/`ρ <= 4` vs. strict `>`/`<`), and the progress logic differs. car-paths' word formulas serve
  as an independent oracle in the unit tests (N-DP-01).
- Drawing order and layers follow F-DP-14; the label is SVG text at (0, 8) (14 px at ImageSize 600).

### 6.1 Building and deploying this app alone

Owner rule R-A (2026-10-17): this one app can be taken out of the repository and hosted anywhere. One command builds it:

```
npm run bundle -- dubins-path
```

`tools/bundle-app.mjs dubins-path` (npm script `bundle`) writes `dist/dubins-path/`: the app with exactly the files it needs — its HTML, its modules and everything they import, recursively, with the repository's relative layout kept — plus the licence texts that apply, a generated `README.md` (title, the original's credits, licence, "serve this folder with any static web server", how to run its tests in the full repository) and a root `index.html` that opens the app (the "All demos" link of the bundled page leads to that root page). Nothing else. Contents (generated with `npm run bundle -- --update-docs`; unit "bundle contents listed in DESIGN.md match the collector" keeps the table current):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/dubins-path/`) | 3 | `dubins.js`, `index.html`, `main.js` |
| `shared/` | 16 | `clock.js`, `graphics-extras.js`, `graphics.js`, `manipulate.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `mma.js`, `random.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `ui-extra.js`, `ui-interval.js`, `ui.js` |
| `demos/common/` | 1 | `car-icon.js` |
| added by the bundler | 7 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/dubins-path/DESIGN.md` |
<!-- bundle-contents:end -->

Licences: `LICENSES/CC-BY-NC-SA-3.0.txt` (this app and every `demos/…` module: derived from Wolfram Demonstration code); `LICENSES/MIT.txt` (the `shared/…` modules).

Requirements: a current browser with ES modules (Firefox, Chromium, WebKit); no WebGL.

Verified by e2e "bundle: dubins-path runs from its own folder" (A-DP-07, `tests/e2e/bundle.spec.js`): the app is bundled into `test-output/bundle-e2e/<browser>/dubins-path/`, that folder alone is served by a static file server, its root page must open the app, the app must start (`window.__demo.ready`) without page errors, every request must stay inside the folder and succeed, every script and stylesheet of the bundle must be loaded, and the app's "All demos" link must reach the bundle's root page. The contents table above is kept current by the unit test named there.

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

| ID | Kind | Description |
|----|------|-------------|
| Q-DP-01 | quirk kept | Ties between words are decided by `Sort`'s canonical order, i.e. by colour: LSR (Blue) < RLR (Darker[Green]) < LRL (Brown) < RSR (Darker[Yellow]) < RSL (Orange) < LSL (Pink). Exact ties occur in symmetric poses: goal straight ahead (all four CSC words have the straight length; port arithmetic: LSR drawn), goal on the x-axis with heading 0 (LSL = RSR → RSR), heading locator dropped on the goal centre at the opening position (LSL = RSR = 21.68 → RSR). Near-ties are decided by the last bit: goal (8, 3) heading π/2 gives RSL 9.712388980384688 and LSL 9.71238898038469 in the port's arithmetic, an exact tie at 9.71238898038469 in Mathematica 15.0.1 (harness H-DP-08); RSL is drawn either way. Recorded ties (harness, machine numbers): straight ahead LSR (H-DP-06), heading locator on the goal centre RSR (H-DP-05), goal behind on the x-axis RSR with LSL = RSR, LSR = RSL, LRL = RLR bit-identical (H-DP-09) — the port draws the same words. With exact integer inputs the order differs (P-DP-01). car-paths uses `First@MinimalBy` (generation order) instead. |
| Q-DP-02 | quirk kept | On the first arc the heading is `angP += Sign[ang1+10^-6] π/2`, on the others `Sign[ang2]`, `Sign[ang3]`. When a right-turning first arc has zero length (or less than 10⁻⁶ rad), the moving car is drawn facing backwards (heading +π instead of 0). Example: goal (8, 3) heading π/2, *r*<sub>min</sub> 3: RSL wins the tie with LSL (Q-DP-01), its first arc has zero length, and at progress 0 the blue car points along −x; from the straight piece on it is correct. |
| Q-DP-03 | quirk kept | Initial values: the Input cell's `{{Theta,π/2},None}` and `{{goalThetaloc,{4,0}},Locator,Appearance->None}` are not what the published notebook opens with — the output cell stores the state after the first evaluation (`Theta = -π/4`, `goalThetaloc = {2+√2, 2-√2}`), which the port uses (F-DP-12). Evaluating the Input-cell values once gives the same state (direction from {2, 2} to {4, 0} = −π/4), so the opening picture (goal car heading down-right) is the same either way. `goalTheta` (`{{goalTheta,0},-π,π,None}`) is never used. |
| Q-DP-04 | quirk kept | Dropping the heading locator exactly on the goal centre gives `dTheta = 0` and `Theta = 0` (the `If[dTheta > 0, …, 0]` branch); the locator is then put 2 units to the right. |
| Q-DP-05 | quirk kept | `angPt2Pt` chops angles below 10⁻¹⁰ to exact 0 (this makes some ties exact, Q-DP-01); `ArcTan[0, 0]` is not guarded (K-DP-03). |
| Q-DP-06 | quirk kept | Validity tests are strict: LSR/RSL need `dLR > 2 minRadius`, LRL/RLR need `dLL < 4 minRadius` (tolerant comparisons), as the Details text says; at exactly 2 *r*<sub>min</sub> (4 *r*<sub>min</sub>) the word does not exist. Visible example: goal (2, 2) with heading exactly 0 (heading locator dropped on the goal, Q-DP-04) and *r*<sub>min</sub> 1 gives `dLR = 2`, so LSR (length π) is excluded and the label jumps to 9.11 (RSR); 10⁻⁶ higher the label reads 3.14. car-paths' formulas accept the boundary (`ρ >= 2`, `ρ <= 4`). |
| Q-DP-07 | quirk kept | Placeholder `shortestPath = {20, {Pink, Circle[{0,3},3,{-3,-1.3}], Line[{{0.7,0.1},{4.,1.}}], Circle[{2,2},3,{-1.3,5π/4}]}}` in the Module is always overwritten before use; `drawCarOld` is defined in the Input cell and never used. The stored Initialization of the output cell (what the published notebook runs) does not contain `drawCarOld` but has a global `shortestPath` with the same placeholder value, `Attributes[PlotRange] = {ReadProtected}` and a second, 3-argument `drawCar[xy, Theta, Alpha]` (the old all-wheel-steering car, arrow 1.75, never called). Neither is ported as behaviour (the constant is kept in `dubins.js` with a comment). |
| Q-DP-08 | quirk kept | "distance" in the label is the planar distance of the goal position from the start (origin), without the heading (car-paths includes the heading). The Details text says "If r_min = 0, then the shortest path is a straight line", but the slider's minimum is 0.001. |
| Q-DP-09 | quirk kept | The heading locator has no range in the original; only the goal position is limited (±13 × ±8). The heading locator is put back 2 units from the goal after every evaluation, so it can lie up to 2 units outside ±13 × ±8 (still inside the plot range). |
| D-DP-01 | deviation | The opening (live) state is exact in the original (`goalXY {2,2}` and `minRadius 3` are integers, `Theta = -π/4`, `goalThetaloc = {2+√2, 2-√2}`); the port starts from the same values as machine numbers. Because `angPt2Pt` applies `N`, all six lengths are machine numbers there too, but intermediate values (`dLL`, circle centres) are exact. The port computes with machine numbers: LSL = 20.764501874731444 where the exact value is 20.76450187473144620 (correctly rounded 20.764501874731447, 200-bit evaluation). Only last bits differ; the label is the same. |
| D-DP-02 | deviation | What counts as one update: Mathematica's front end decides how often it re-evaluates during a drag (and the body assigns its own variables `goalThetaloc`, `goalXYold`, `Theta`); the port evaluates once per animation frame and once per key press. The body is idempotent up to the last bit (K-DP-06). |
| D-DP-03 | deviation | Sizes approximate Mathematica's: `Thin` = 0.25 px, `Thickness[0.005]` = 3 px at ImageSize 600, `Dashed` as dashes and gaps of 4 px at ImageSize 600 (measured on snapshot 1: about 8 px each in the 2× picture; M-DP-02 compares by hand), the white margin of the Manipulate pane around the grey picture as CSS padding, arrowheads as plain triangles, glyphs as SVG (`Antialiasing->False` not reproduced). |
| D-DP-04 | deviation | Sliders use the shared `Controls.slider` with `steps: 'mma'` (COMMON-DECISIONS §3; both sliders here are continuous, so values are not snapped). Value fields as in Mathematica: a dragged value is a machine real and shows with its point ("3.", "2.5"); a typed whole number ("2") stays exact and shows as "2" (Mathematica keeps a typed Integer exact and shows "3" for a typed 3), a typed "2." is a machine real shown "2." (`shared/ui.js` since the review of v0.1.15; before, a typed "2" showed "2." and was stored as a real). The port keeps the exact integer as the same JavaScript number: only the text differs, the computation is the same. Remaining deviations: typed values are clamped to the slider range (K-DP-07); the controls look like the shared port controls. |
| D-DP-05 | deviation | Locator picking as in the other ports (`addLocators`, `pickAnywhere`): a press within 12 CSS px grabs the nearer locator without a jump, a press elsewhere moves the nearer of the two locators to the press point; on an exact tie the goal locator wins. PORT DEVIATION: the 12 px no-jump zone and the tie rule are the port's choice; whether two separate `Locator` controls behave as one LocatorPane is a lead (K-DP-04). |
| D-DP-06 | deviation | The invisible heading locator is limited to the plot range (−15…15 × −10…10) while dragging; the original gives it no range (a locator cannot leave the graphic in the front end either). |
| D-DP-07 | deviation | The label is SVG text with a system font; Mathematica's font and exact baseline differ. |
| D-DP-08 | deviation (measurement) | No plot-range padding: measured on snapshot 1 (2× picture), the image shows exactly −15…15 × −10…10 at 40.0 px per unit; the label at y = 8 is centred 320 px above the origin and the reticle sits at (3.40, 0.62) (true (3.41, 0.59)). The port uses `padding: 0`. |
| D-DP-09 | deviation (engine-independent opening) | The original's opening state is exact (Theta −π/4, goalThetaloc {2 + √2, 2 − √2}) and stays exact on every evaluation until a locator is dragged. The port keeps the constants (3.414213562373095, 0.5857864376269049) — `N` of the exact values as Mathematica 15.0.1 gives them (harness H-DP-01, H-DP-25; v0.1.17, before: the correctly rounded 0.585786437626905, one ulp above) — while goal and heading are untouched instead of recomputing them with `Math.cos`/`Math.sin`, whose last bit differs between browser engines (Chromium gave 0.5857864376269051, Firefox and WebKit 0.5857864376269049; owner's run 2026-10-17). After the first drag, machine arithmetic as before. |
| K-DP-01 | known issue (resolved in v0.1.17) | Which word wins an exact tie depends on whether the lengths are bit-identical, i.e. on last-bit rounding of `ArcCos`, `ArcTan`, `Cos`, `Sin` (e.g. straight ahead: is `AlphaL2R - GammaLSR` exactly −π/2 or one ulp below, which would make the first LSR arc a full turn?). Harness run 2 (Mathematica 15.0.1): straight ahead in machine numbers all four CSC lengths are 8.0 and LSR is drawn, the port's lengths and car bit for bit (H-DP-06); goal behind, all three mirror ties exact, RSR drawn, bit for bit (H-DP-09); goal (8, 3) RSL = LSL = 9.71238898038469 exactly, RSL drawn (the port: RSL one ulp shorter, the same word, H-DP-08). Exact integer inputs (H-DP-07) give RSR instead of LSR: P-DP-01. |
| K-DP-02 | known issue (resolved in v0.1.17) | Canonical order of the colour components: `Darker[Yellow]`, `Darker[Green]` may be exact (2/3) or machine numbers, `Blue` is exact; `Order[0, 0.]` could decide a Blue/Darker[Green] tie before the second component. Harness run 2: `Darker[Yellow]` = `RGBColor[2/3, 2/3, 0]`, `Darker[Green]` = `RGBColor[0, 2/3, 0]`, `Blue` = `RGBColor[0, 0, 1]`, all exact (H-DP-02 drawings); no `Order[0, 0.]` arises and the order of Q-DP-01 stands. |
| K-DP-03 | known issue (lead) | `ArcTan[0, 0]` when two circle centres coincide (only for an exact goal pose equal to the start pose, H-DP-20): Mathematica returns `Indeterminate` (with a message) while `arcTan` gives 0. Unreachable by mouse. Resolved by harness run 2 (H-DP-20): four `ArcTan::indet` messages, all four captured lengths and `shortestPath[[1]]` `Indeterminate` (the drawn word's colour `Darker[Green]`), the moving-car Module not reached (no `angP`, `xyP`); the port gives finite lengths. Kept as a deviation: the pose needs the goal exactly at the origin with heading exactly 0. |
| K-DP-04 | known issue (lead) | Do the two separate `Locator` controls form one LocatorPane (a press anywhere moves the nearer of the two)? car-paths had one control with four points. To check by hand (M-DP-05). |
| K-DP-05 | known issue (lead) | The red glyph is a `Locator` primitive with a static position inside `Graphics` (as K-CP-05); such primitives are themselves draggable in the front end (COMMON-DECISIONS §4): whether pressing on it can drag that static locator instead of the invisible Manipulate locator under it is unknown; the port always drags the Manipulate locator. |
| K-DP-06 | known issue (lead) | Self-assignment re-evaluation: if Mathematica re-runs the body after it assigns `goalThetaloc`, `goalXYold`, `Theta`, the result is the same up to the last bit (100 port evaluations of the opening state change nothing). Resolved by harness run 2 (H-DP-24, machine-number opening): Mathematica's second evaluation moves Theta by one ulp (−0.7853981633974483 → −0.7853981633974484, from the last bit of its `Sin`, K-DP-08) and the state is then a fixed point (settle: no change); goalThetaloc stays (3.414213562373095, 0.5857864376269049). The port is a fixed point from the first evaluation (Theta −0.7853981633974483). Last bit only. |
| K-DP-07 | known issue (lead) | Values typed into the Labeled fields outside the slider ranges: in Mathematica, progress > 1 would extrapolate the car beyond the goal on the last arc and *r*<sub>min</sub> = 0 would divide by zero; the port clamps (M-DP-08). |
| K-DP-08 | known issue (resolved in v0.1.17) | Machine `Sin`, `Cos`, `ArcCos`, `Sqrt` may differ in the last bit between Mathematica and the browser (only `ArcTan` is a bit-exact reproduction). Matters only for ties (K-DP-01). Harness run 2: they do — e.g. `2 + 2 Sin[-0.7853981633974483]` is 0.5857864376269049 in Mathematica 15.0.1 (H-DP-02), 0.5857864376269051 in V8 (Node, Chromium); the port's lengths, centres and car differ from the record by a few ulp (at most about 30: ceR[[2]] of H-DP-01, exact in the original) in H-DP-01, -02, -08, -13, -16, -17, -21…-25 and are bit-identical in H-DP-03…-06, -09…-12, -14, -15, -18, -19; no drawn word differs (the golden tests compare decisions exactly, lengths within 4 ulp). |
| K-DP-09 | known issue (lead) | `Chop`'s exact criterion (\|x\| < 10⁻¹⁰ or ≤) — irrelevant in practice. |
| K-DP-10 | known issue (lead) | The middle and last pieces divide by `Abs[minRadius*ang2]`, `Abs[minRadius*ang3]` or the line length without a guard; with tolerant `<=` a zero-length middle piece could be selected and divide by zero (car not drawn). Not observed. |
| N-DP-01 | note | The six lengths agree with car-paths' algebraic Dubins words × *r*<sub>min</sub> within 10⁻⁹ for 20 000 random poses (Python transcription of both, this design; same validity except at the exact boundaries, Q-DP-06). Used as an independent oracle in unit tests. |
| N-DP-02 | note | The definition notebook stores the settings of the four snapshots; snapshots 2–4 are machine-number poses (e.g. snapshot 2: `goalXY {3.6000000000000014, -3.84}`, `goalThetaloc {5.014213562373096, -5.254213562373095}`, `Theta -0.7853981633974483`). Evaluated with an independent transcription they give exactly the labels of the pictures: 23.91/5.26 (LSR, blue), 22.5/4.05 (LSL, pink), 17.02/5.99 (RSL, orange). |
| N-DP-03 | note | The Details text says the turning circles are drawn "with dashed gray circles", the six colours are LRL brown, RLR dark green, LSL pink, LSR blue, RSL orange, RSR dark yellow — as in the code. |
| N-DP-05 | note | Implementation (v0.1.15): the e2e tests drag with the real mouse, which places a locator only to about 0.05 units (one CSS pixel is about 0.05 units at the page's size), so after a mouse drag the labels are compared within 0.06 (T-DP-40…T-DP-42); the exact labels of these poses are checked in the unit tests (T-DP-19, T-DP-20) and at a range limit (T-DP-43). The Mathematica-harness scenarios of the TESTPLAN (`tests/harness/dubins-path.scenarios.json`) are replayed by the golden tests "dubins-path harness H-DP-nn: …" (cited as `golden "harness H-DP-nn"`); they skip until `tests/golden/dubins-path.harness.json` exists. |
| N-DP-04 | note | `If[Head[drawing[[3]]] == Circle, …]` with a `Line` head compares two different symbols; `Line == Circle` stays unevaluated (neither True nor False), so the `If` does nothing, as if False — the following `Head[…] == Line` branch draws the line. The port uses a plain kind test. |

## 8. Proposed changes

Template: see [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md).

| ID | Status | Requested by / date | Change | Reason | Acceptance criteria |
|----|--------|---------------------|--------|--------|---------------------|
| P-DP-01 | proposed | harness run 2, 2026-10-18 | Track which lengths are exact (integer inputs) so that `Sort` puts an exact length before an equal machine length, as the original does | H-DP-07 (goal (8, 0), heading locator (10, 0), progress 0, all exact integers): `dLSL` = `dRSR` = 8 (exact), `dLSR` = `dRSL` = 8. (machine); `Sort` gives 8 before 8., so the original draws RSR (and its car on the zero-length first arc faces backwards, `angP` = π exactly, Q-DP-02) where the port, with machine numbers only, draws LSR (`angP` 0). Not reachable with the mouse (dragged locators are machine reals); needs exactness tracking through the word functions (I-DP-05) | golden "harness H-DP-07" compares the drawn word and the car with the record instead of asserting the recorded difference |

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.15 | 2026-10-17 | first implementation of the approved design draft (2026-10-12, owner approval 2026-10-17, DEC-17): `dubins.js`, `main.js`, `index.html`, the shared car icon `demos/common/car-icon.js` (owned by this app); harness references cited as the golden tests that replay them; dash pattern measured (D-DP-03); N-DP-05; review fixes |
| 2 | v0.1.16 | 2026-10-18 | version number only (batch B release); no change to this app |
| 3 | v0.1.17 | 2026-10-18 | harness run 2 accepted: the opening constant goalThetaloc[[2]] is now 0.5857864376269049, Mathematica's `N[2 - Sqrt[2]]` (H-DP-01, H-DP-25; D-DP-09; was 0.585786437626905); K-DP-01, K-DP-02, K-DP-03, K-DP-06, K-DP-08 resolved with the recorded values; Q-DP-01 updated (H-DP-08 is an exact tie in Mathematica); P-DP-01 proposed (exact-integer tie, H-DP-07; the golden test asserts the recorded difference). Golden-test adapter: scenario values (read lexically) converted to doubles, the colour of a drawing read from the `{"h", "a"}` encoding, a fresh state object per step |
| 4 | v0.1.18 | 2026-10-18 | version number only (harness run 3 accepted for manipulability-ellipsoid); no change to this app |
| 5 | v0.1.19 | 2026-10-21 | main.js rewritten on the new shared Manipulate layer (`shared/manipulate.js`, `shared/graphics.js`): the controls are written as Manipulate control specs and the picture as Graphics data; no change to behaviour or picture (all unit, golden and browser tests unchanged and passing; screenshots and Manipulate state identical to v0.1.18 at sample settings) |
| 6 | v0.1.20 | 2026-10-21 | bundle table only (the Manipulate layer now also loads `shared/ui-extra.js`, `ui-interval.js`, `random.js`); no change to this app; §6: car-paths now uses `demos/common/car-icon.js` |
| 7 | v0.1.21 | 2026-10-23 | the model builds the picture as `shared/graphics.js` Graphics data (owner decision D2) and the body returns {state, view, graphics}; `main.js` shortened; path pieces are `Circle`/`Line` data (hook `view().shortestPath.pieces` in that form); the car icon of `demos/common/car-icon.js` is Graphics data (no `Raw`); the old drawing output frozen in `tests/unit/fixtures/dubins-path-drawing.pre-graphics.json` and tests that read the old format now read the same numbers through `annotations()`/`Cases()`; no change to behaviour or picture (screenshots and Manipulate state identical to v0.1.20 at sample settings) |
| 8 | v0.1.22 | 2026-10-25 | version number; bundle table (`shared/manipulate.js` now also loads `shared/graphics-extras.js` and `shared/svg-frame.js` for the new Graphics options `Axes`/`Frame`/`PlotLabel`); no change to this app's code, behaviour or picture (pixel parity with v0.1.21) |
| 9 | v0.1.23 | 2026-10-25 | version number; the shared code gained plot functions, a geometry kit, 3D text and tube primitives and fixes for new apps (v0.1.23); no change to this app's code, behaviour or picture (pixel and scene parity with v0.1.22) |
| 10 | v0.1.24 | 2026-10-26 | version number; the shared code gained a clock for bodies that read the time, Locator variables that change between one point and a list, sector disks and Opacity on points and text (v0.1.24); no change to this app's code, behaviour or picture (pixel and scene parity with v0.1.23) |
| 11 | v0.1.25 | 2026-10-26 | version number; the shared code gained one page clock (`shared/clock.js`: slider animations and app animations read it, tests fix it), tolerant `Equal`/`Unequal` in `shared/wl.js` and exact slider texts from saved states (v0.1.25); no change to this app's code, behaviour or picture (pixel and scene parity with v0.1.24) |
| 12 | v0.1.26 | 2026-10-27 | version number; the shared code gained region and density plots (`RegionPlot`, two-parameter `ParametricPlot`, `DensityPlot`), `BSplineCurve`, decorated insets, textures on polygons, `settleInterval` for bodies that pause between evaluations, typeset control headings and fixes found by the seven new ports (v0.1.26); no change to this app's code, behaviour or picture (pixel and scene parity with v0.1.25) |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|-------------|---------|-------------|---------|
| I-DP-01 | Use `Sign[ang1]` with a correct zero case for the first arc (heading of the start pose) | no backwards car at progress 0 | differs from the original | Q-DP-02 |
| I-DP-02 | Break ties in a documented word order (e.g. LSL, LSR, RSR, RSL, LRL, RLR as car-paths) | predictable choice in symmetric poses | differs from the original's picture in those poses | Q-DP-01, K-DP-01 |
| I-DP-03 | Movable start pose (two more locators, as car-paths) | general start configurations | new controls need design entries | §2 |
| I-DP-04 | Show the optimality regions of reference [4] for the current goal heading | the Details text points to them | substantial new computation | N-DP-03 |
| I-DP-05 | Exact (high-precision) evaluation while the inputs are integers | bit-identical lengths at the opening state | needs a high-precision library; only last bits change | D-DP-01 |

## 11. Errors in the original (conceptual and mathematical)

Owner rule R-C (2026-10-17). Checked: the six word functions `drawLSL` … `drawRLR` (tangent points, `ArcCos[2 minRadius/dLR]`
for the inner tangents, `-ArcCos[dLL/(4 minRadius)]` for the middle circle, the start and end angles given to `arcLen`,
the turning directions) against the Shkel–Lumelsky / LaValle closed forms (as in A. Walker's `dubins.c`): an independent
Python transcription of both over 20 000 random poses (goal in ±13 × ±8, any heading, r<sub>min</sub> 0.2…5) gives the same
length for every word within 1.3·10⁻¹³, the same validity, and the same minimum in every case — the word formulas are
correct. Also checked: `arcLen`'s normalisation for the angle ranges that occur, the motion along the path, the label,
the colours and the Details. Ties decided by colour order (Q-DP-01) are a choice between equally short paths, not an
error.

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|------|-----------------------|--------------------------|--------------------|-------------------------|--------|
| E-DP-01 | mathematical | `angP += Sign[ang1 + 10^-6] π/2` (first segment of the moving car), next to `Alpha = Sign[ang1] minRadius` | The heading on an arc is the radius angle plus π/2 for a left (counter-clockwise) arc and minus π/2 for a right arc, i.e. it needs the arc's turning direction. `Sign[ang1 + 10^-6]` gives +1 for a right arc whose angle is 0 (or above −10⁻⁶): at progress 0 the blue car is drawn facing backwards (heading +π off). Example: goal (8, 3) heading π/2, r<sub>min</sub> 3 — RSL wins the tie with LSL, its first arc is empty, and the car at the origin points along −x. | Keeps it (Q-DP-02). | Using the arc's direction (I-DP-01) turns the car the right way at progress 0 in those poses only; unit "goal (8, 3) heading up: RSL is drawn and at progress 0 the moving car faces backwards", harness H-DP-08 (heading capture) and M-DP-06 change; no snapshot or saved state shows it. | open |
| E-DP-02 | text | Details: "LSR (blue) and RSL (orange) are potentially valid only if the distance from start to goal is greater than 2 r<sub>min</sub>. The two paths composed entirely of curves, LRL (brown) and RLR (dark green), are potentially valid only if the distance from start to goal is less than 4 r<sub>min</sub>." | The conditions are on the distance between the centres of the two turning circles (`dLR = distPt2Pt[csL, ceR]`, `dLL = distPt2Pt[csL, ceL]`), as the code correctly does — not on the start–goal distance. Counter-examples with r<sub>min</sub> = 1: goal (0, 2.1) heading 0 is 2.1 from the start but `dLR` = 0.1, so LSR does not exist; goal (0, 4.5) heading π is 4.5 from the start but `dLL` = 2.5, so LRL exists. | Shows the Details as in the original (F-DP-18; Q-DP-06 follows the code). | Text only ("the distance between the centres of the two turning circles"); no value or test changes. | open |
| E-DP-03 | mathematical | `If[dLR > 2 minRadius, …]` in `drawLSR`/`drawRSL` and `If[dLL < 4 minRadius, …]` in `drawLRL`/`drawRLR` | At exactly `dLR = 2 minRadius` the LSR/RSL path exists (straight piece of length 0) and at `dLL = 4 minRadius` the CCC path exists (middle arc π); the strict tests drop them, so the shortest path jumps to a longer word at the boundary. Example (Q-DP-06): goal (2, 2), heading 0, r<sub>min</sub> 1 (typed) gives `dLR = 2`: the label reads 9.11 (RSR) instead of 3.14 (LSR, a quarter circle each way), while 10⁻⁶ further away it reads 3.14. car-paths accepts the boundary (`ρ >= 2`, `ρ <= 4`). | Keeps the strict tests, tolerant as Mathematica's (Q-DP-06). | `>=` / `<=` change the result only on the boundary (measure-zero poses reachable by typing r<sub>min</sub> or dropping the heading glyph on the goal): unit "LSR and RSL exist only when the circle distance exceeds 2 r_min", unit "LRL and RLR exist only when the circle distance is below 4 r_min" and harness H-DP-18, H-DP-19 change; no golden state lies on a boundary. Possible as an option. | open |
