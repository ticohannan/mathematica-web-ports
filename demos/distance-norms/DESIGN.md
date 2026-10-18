# Design document: Distance Norms in Robot Workspace and Phase Space

| | |
|---|---|
| Code version: | 0.1.16 |
| Document revision | 1 (2026-10-17) — first implementation |
| Status | describes the app as implemented; changes go through *Proposed changes* (§8) and [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md) |
| Original | Wolfram Demonstrations Project, "Distance Norms in Robot Workspace and Phase Space", contributed by Aaron T. Becker and Benedict Isichei, published 2017-12-13 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/DistanceNormsInRobotWorkspaceAndPhaseSpace/>. Readable source: [`docs/original-source/distance-norms.txt`](../../docs/original-source/distance-norms.txt); saved states: `tests/golden/distance-norms.original-states.json` (`states[0]` = the output cell's saved state, `snapshots[1…6]` = the six snapshot cells' `Settings`, raw notebook lines 2407, 3613, 4818, 6021, 7213, 8429; `specs` = the initial settings; exact values kept as `{"wl": …}`); snapshots: `docs/original-snapshots/distance-norms-1…6.png` (the notebook's snapshot cells 7 and 8 are the Wolfram icon placeholder, N-DN-05) |
| Port files | `model.js` (initial values, one evaluation of the Manipulate body: arm data, the parameter-space norm ball, its sheets and their images; picture layout and styles as data; pure), `main.js` (SVG drawing, frame and ticks, controls, the invisible locator, test hook), `index.html`; common with "Forward and Inverse Kinematics for Two-Link Arm": `demos/common/two-link.js`, `demos/common/arrow-arcs.js`, `demos/common/dial-control.js` (CC BY-NC-SA 3.0, owner two-link-kinematics, used unchanged); shared helper `shared/svg-frame.js` (MIT: Frame, FrameTicks and Axes of a 2D plot; owned by this app, used unchanged) |
| Role in the project | further demonstration (batch A) |

## 1. Purpose and background

A planar two-link arm (link lengths r<sub>1</sub> and r<sub>2</sub> = 2 − r<sub>1</sub>, joint angles set with two dials)
is drawn together with the set of points "within distance d" of its configuration, for the L<sub>1</sub>, L<sub>2</sub>,
L<sub>3</sub> or L<sub>∞</sub> norm. In **workspace** mode the norm is taken in the plane: the shaded set is the p-norm
ball of radius d around the arm's tip. In **phase space** mode the norm is taken in joint space: all configurations
(θ<sub>1</sub> + Δθ<sub>1</sub>, θ<sub>2</sub> + Δθ<sub>2</sub>) with ‖(Δθ<sub>1</sub>, Δθ<sub>2</sub>)‖<sub>p</sub> < d are
mapped through the forward kinematics and the tips they reach are shaded. The Details text explains why the
workspace norm is misleading (it can include unreachable points) and why the phase-space set is the right one for
planners such as PRM and RRT; the mapping is done with `ParametricPlot`.

## 2. Scope

In scope: the original's controls (norm space setter, norm type setter, d slider, r<sub>1</sub> slider, two angle
dials), the invisible end-effector locator it carries over from the kinematics Demonstration (without effect), one
evaluation of the body per update, the arm drawn as `Prolog`, the shaded region with its boundary, frame, axes and
ticks of the `ParametricPlot`, title, caption and Details.
Out of scope (would need a design entry first): other norms or p values, more links, showing the parameter-space ball
itself, mesh lines (`Mesh -> Full` is commented out in the original), using the end-effector locator.

## 3. Users and use cases

| ID | User | Use case |
|----|------|----------|
| UC-DN-01 | student | compare the L<sub>1</sub>, L<sub>2</sub>, L<sub>3</sub> and L<sub>∞</sub> distance sets of one configuration |
| UC-DN-02 | student | compare the workspace norm with the phase-space norm, e.g. near the workspace boundary where the workspace set leaves the reachable disk |
| UC-DN-03 | student | change d, r<sub>1</sub> and the joint angles and watch the phase-space set bend and fold |
| UC-DN-04 | tester | compare the port with the original's saved state, its snapshots and the Mathematica harness |

## 4. Features

### 4.1 Controls

| ID | Feature | Reason | Since | Verified by |
|----|---------|--------|-------|-------------|
| F-DN-01 | "norm space" setter `{{cORw, "phase space", "norm space"}, {"workspace", "phase space"}}`, default "phase space"; a value that is not one of the two choices (snapshots 3–6 store `cORw = "configuration"`, Q-DN-07) shows no button selected and makes the body's `If[cORw == "workspace", …, …]` take the phase-space map | where the norm is measured (UC-DN-02) | v0.1.15 | e2e "has the controls of the original with their defaults: norm space, norm type, d, r1 and two dials"; e2e "every norm type and both norm spaces draw a region"; golden "distance-norms: snapshots 3 to 6 store cORw = configuration: no button selected and the phase-space map" |
| F-DN-02 | "norm type" setter `{{p, ∞, "norm type"}, {1, 2, 3, ∞}}` (buttons 1, 2, 3, ∞), default ∞ | which norm (UC-DN-01) | v0.1.15 | e2e "every norm type and both norm spaces draw a region"; golden "harness H-DN-02"; golden "harness H-DN-03" |
| F-DN-03 | "d" slider `{{bound, 1/2, "d"}, 0.01, π, 0.01, ImageSize -> 80, Appearance -> "Labeled"}`: 0.01 … π in steps of 0.01, default exact 1/2 (shown as a built-up ½ in the original), value field and ⊕ animation panel; slider values are `0.01 + k·0.01` in machine arithmetic (`shared/ui.js` `steps: 'mma'`) | the distance (UC-DN-03) | v0.1.15 | e2e "moving the d slider with the mouse grows the region"; golden "harness H-DN-05"; golden "harness H-DN-06" |
| F-DN-04 | r<sub>1</sub> slider `{{r1, 1, "r₁"}, 0, 2, 0.01, ImageSize -> 80, Appearance -> "Labeled"}`, default exact 1, slider values `k·0.01` (`steps: 'mma'`); r2 = 2 − r1 | link lengths with r<sub>1</sub> + r<sub>2</sub> = 2 (UC-DN-03) | v0.1.15 | e2e "has the controls of the original with their defaults: norm space, norm type, d, r1 and two dials"; golden "harness H-DN-07"; golden "harness H-DN-08"; golden "harness H-DN-09" |
| F-DN-05 | θ<sub>1</sub> dial `{{p1, {1, 0}, "θ₁"}, (makeDialControl[#1, {0, 0}, Red] &)}`: the dial of the kinematics Demonstration (common `makeDialControl`, setter `Normalize`, `myArrowArc2` arc) with `ImageSize -> 120` | joint angle 1 (UC-DN-03) | v0.1.15 | e2e "dragging a dial turns the arm and moves the region"; unit "theta from the dials: ArcTan of p1 and p2 (bit-exact), p2 = {0, 1} gives pi/2"; M-DN-07 |
| F-DN-06 | θ<sub>2</sub> dial `{{p2, {0, 1}, "θ₂"}, (makeDialControl[#1, {0, 0}, Blue] &)}`, default pointing up (θ<sub>2</sub> = π/2) | joint angle 2 (UC-DN-03) | v0.1.15 | e2e "dragging a dial turns the arm and moves the region"; golden "harness H-DN-10"; M-DN-07 |
| F-DN-07 | Invisible locator `{{pEnd, {2, 0}}, {-2, -2}, {2, 2}, Locator, Appearance -> None}` and the hidden `{{pEndp, {2, 0}}, {-2, -2}, {2, 2}, None}`, `{{IsElbowUpp, True}, None}`: kept, but the body never uses them (Q-DN-01); a press anywhere in the plot moves the invisible locator (limited to ±2) and changes nothing else | same controls and state as the original | v0.1.15 | e2e "a press in the plot moves only the invisible locator"; unit "the invisible locator pEnd does not change the picture"; golden "harness H-DN-13"; M-DN-06 |
| F-DN-08 | Layout `ControlPlacement -> Left`: norm space, norm type, d, r<sub>1</sub>, θ<sub>1</sub> dial, θ<sub>2</sub> dial in one column; the plot on the right | same arrangement as the original | v0.1.15 | e2e "has the controls of the original with their defaults: norm space, norm type, d, r1 and two dials" |

### 4.2 Model (`model.js`, `demos/common/two-link.js`)

| ID | Feature | Reason | Since | Verified by |
|----|---------|--------|-------|-------------|
| F-DN-09 | One evaluation of the body per update: `r2 = 2 - r1`; `Theta1 = ArcTan[p1[[1]], p1[[2]]]`; `Theta2 = ArcTan[p2[[1]], p2[[2]]]`; `arm` (F-DN-15); `ParametricPlot[map, {Theta1d, -bound, bound}, {Theta2d, -bound, bound}, PlotRange -> {{-2.5, 2.5}, {-2.5, 2.5}}, RegionFunction -> Function[{x, y, Theta1d, Theta2d}, Norm[{Theta1d, Theta2d}, p] < bound], PlotStyle -> Opacity[0.5], Prolog -> arm]` | the original's computation | v0.1.15 | unit "theta from the dials: ArcTan of p1 and p2 (bit-exact), p2 = {0, 1} gives pi/2"; golden "distance-norms: the saved state is the initial state of the port"; golden "harness H-DN-01" |
| F-DN-10 | Workspace map (`cORw == "workspace"`): `{r1 Cos[θ1] + r2 Cos[θ1 + θ2] + Theta1d, r1 Sin[θ1] + r2 Sin[θ1 + θ2] + Theta2d}` — the tip shifted by (Δθ<sub>1</sub>, Δθ<sub>2</sub>): the region is the p-norm ball of radius d around the tip | workspace distance (UC-DN-02) | v0.1.15 | unit "workspace mode: the region is the p-ball of radius d around the tip"; golden "distance-norms: snapshot 2 workspace square of side 1 around the tip (-0.0096, 1.99995)"; golden "harness H-DN-03"; golden "harness H-DN-14" |
| F-DN-11 | Phase-space map (otherwise): `{r1 Cos[θ1 + Theta1d] + r2 Cos[θ1 + Theta1d + θ2 + Theta2d], r1 Sin[θ1 + Theta1d] + r2 Sin[θ1 + Theta1d + θ2 + Theta2d]}` — the forward kinematics of the shifted angles | phase-space distance (UC-DN-02) | v0.1.15 | unit "phase-space mode maps the corners and vertices as in snapshots 1 and 5"; golden "distance-norms: snapshot 1 region (infinity norm) spans x 0.036 to 1.719 and y 0.061 to 1.479"; golden "harness H-DN-02" |
| F-DN-12 | Norm of the region function `Norm[{Theta1d, Theta2d}, p]` for p = 1, 2, 3, ∞ (sum of absolute values; Euclidean; (abs³ + abs³)<sup>1/3</sup>; maximum); the region is the parameter-space ball B = {Norm < d} (strict `<`, Q-DN-04) | the four norms of the Details text (UC-DN-01) | v0.1.15 | unit "Norm[v, p] for p = 1, 2, 3 and infinity"; unit "ball boundary: every point has norm d, with the corners of the square and the vertices of the diamond"; golden "distance-norms: snapshot 3 region (3-norm) spans x 0.201 to 1.647 and y 0.279 to 1.434"; golden "distance-norms: snapshot 4 region (2-norm) spans x 0.276 to 1.601 and y 0.349 to 1.409"; golden "distance-norms: snapshot 5 region (1-norm) spans x 0.398 to 1.479 and y 0.398 to 1.358"; M-DN-03 |
| F-DN-13 | Region construction (replaces `ParametricPlot`'s sampling, D-DN-01): the exact boundary of B (∞: square with corners (±d, ±d); 1: diamond with vertices (±d, 0), (0, ±d); 2, 3: the curve d·u/‖u‖<sub>p</sub>, u = (cos φ, sin φ)), cut along the lines Δθ<sub>2</sub> = kπ − θ<sub>2</sub> (k integer, inside (−d, d)) into at most 3 **sheets**, on each of which the arm map is one-to-one; each sheet's boundary is mapped and filled as one polygon; the region boundary line is the image of the boundary of B | the shaded set and its outline without a sampling mesh | v0.1.15 | unit "sheets: the ball is cut where theta2 + theta2d is a multiple of pi"; unit "sheet areas add up to the integral of r1 r2 abs(sin(theta2 + theta2d))"; unit "the mapped boundary has no gap larger than 0.01 plot units"; unit "degenerate arms: r1 = 0 or r1 = 2 give zero area and a boundary on the circle of radius 2"; golden "distance-norms: snapshot 6 Settings (1-norm near the fold) give a region spanning x 1.514 to 1.998 and y -0.585 to 1.275"; golden "harness H-DN-04"; golden "harness H-DN-05"; golden "harness H-DN-15" |
| F-DN-14 | Initial values `cORw = "phase space"`, `p = ∞`, `bound = 1/2`, `r1 = 1`, `p1 = {1, 0}`, `p2 = {0, 1}`, `pEnd = pEndp = {2, 0}`, `IsElbowUpp = True` — the live state (the saved state, what the published notebook opens with), the initial settings (stored `"Variables"`, raw line 919) and snapshot 1's `Settings` (the body assigns no Manipulate variable, so all three equal the initial values); the port opens in it and its "Initial settings" restores the stored `"Variables"` (A-DN-01) | same opening picture as the original (snapshot 1) | v0.1.15 | golden "distance-norms: the saved state is the initial state of the port"; golden "harness H-DN-01"; golden "harness H-DN-15" |

### 4.3 Graphics (SVG)

| ID | Feature | Reason | Since | Verified by |
|----|---------|--------|-------|-------------|
| F-DN-15 | Arm, drawn first (`Prolog`, under the region): `LightGray, EdgeForm[Black]`, link 1 `Rotate[{Rectangle[{-w, -w}, {r1 + w, w}, RoundingRadius -> w], If[r2 < 1, {Black, Text["Robot Arm", {r1/2, 0}]}]}, θ1, {0, 0}]`; `{Black, Point[{{0, 0}}], , Red, myArrowArc[{0, 0}, l/4, {0, θ1}], If[Abs[θ1] > π/4, Text[Style[θ₁, Medium], l 2/5 {Cos[θ1/2], Sin[θ1/2]}]]}`; link 2 `Rotate[{Rectangle[{r1 Cos[θ1] - w, r1 Sin[θ1] - w}, {r1 Cos[θ1] + r2 + w, r1 Sin[θ1] + w}, RoundingRadius -> w], If[r2 >= 1, {Black, Text["Robot Arm", {r1 Cos[θ1] + r2/2, r1 Sin[θ1]}]}]}, θ1 + θ2, elbow]`; `{Black, Point[elbow]}`; `Blue, myArrowArc[elbow, l/3, {θ1, θ1 + θ2}]`, `If[Abs[θ2] > π/4, Text[Style[θ₂, Medium], {r1 Cos[θ1] + r2/2 Cos[θ1 + θ2/2], r1 Sin[θ1] + r2/2 Sin[θ1 + θ2/2]}]]` (w = 1/8, l = 1); a zero angle draws a point (snapshot 1: red point at (1/4, 0)) | the configuration whose neighbourhood is shown | v0.1.15 | unit "arm data at the initial settings: red point at (1/4, 0), blue arc to pi/2, theta2 label at (1.3536, 0.3536), Robot Arm on link 2"; unit "label switch: Robot Arm on link 1 when r2 < 1 (tolerant), else link 2"; golden "harness H-DN-09"; golden "harness H-DN-10"; golden "harness H-DN-12"; M-DN-02 |
| F-DN-16 | Region style: `PlotStyle -> Opacity[0.5]` with the default first plot colour ColorData[97] 1 = RGB(0.368417, 0.506779, 0.709798); outline (`BoundaryStyle -> Automatic`) in the same colour, opaque, about 1 pt; no mesh lines (snapshots 1–6); drawn over the arm, so the arm and its labels are tinted where they overlap | the look of the original | v0.1.15 | golden "distance-norms: region fill and boundary colours of snapshot 1"; e2e "loads without errors and draws the arm under the shaded region"; M-DN-02 |
| F-DN-17 | Plot frame: `ParametricPlot` defaults — `Frame -> True` with ticks on all four sides (labels −2 … 2 on the left and bottom, major ticks at the integers, minor ticks every 0.2), axes through the origin without ticks, frame, axes and tick labels in gray (labels GrayLevel 0.4), `PlotRange -> {{-2.5, 2.5}, {-2.5, 2.5}}` without padding (frame exactly at ±2.5), `AspectRatio` 1, `ImageSize` 360 (the default, saved `size` 360), region clipped at the frame | the original's plot | v0.1.15 | golden "distance-norms: frame at exactly plus-minus 2.5 with ticks every 1 and minor ticks every 0.2"; golden "distance-norms: snapshot 2 workspace square of side 1 around the tip (-0.0096, 1.99995)"; M-DN-02 |
| F-DN-18 | Title, caption, Details (the norm formulas as MathML, written as the original's boxes, E-DN-03 and E-DN-04 included; the snapshot remark and the containment L<sub>1</sub> ⊆ L<sub>2</sub> ⊆ L<sub>3</sub> ⊆ L<sub>∞</sub>), the original's related links (the fourteen URLs stored in the notebook, with `https`); "References for demonstration." is not shown (N-DN-06) | explains the Demonstration | v0.1.15 | M-DN-01 |

### 4.4 Port additions

| ID | Feature | Reason | Since | Verified by |
|----|---------|--------|-------|-------------|
| A-DN-01 | "Initial settings" button: all variables of F-DN-14 back to their initial values | stands in for the Manipulate ⊕ menu → Initial Settings | v0.1.15 | e2e "Initial settings restores the opening state" |
| A-DN-02 | Arrow keys move a focused locator (dial locators 0.05 in dial coordinates, then normalised; the invisible pEnd 0.05 units, Shift = 0.25); each key press is one update | keyboard access | v0.1.15 | e2e "arrow keys move a focused dial locator (port addition)" |
| A-DN-03 | `window.__demo` automation hook (`ready`, state, region data: sheets, boundary, areas; `setState`, `moveLocator`, `worldToClient`) | automated tests | v0.1.15 | e2e "every norm type and both norm spaces draw a region" |
| A-DN-04 | "All demos" link | site navigation | v0.1.15 | inventory; M-GEN-01 |
| A-DN-05 | Credit footer: original title, authors, licence, adaptation notice | required by CC BY-NC-SA 3.0 | v0.1.15 | e2e "attribution on" |
| A-DN-06 | Start-up notice (watchdog, `<noscript>`) when the page cannot start (DEC-22) | a clear message instead of an empty page | v0.1.15 | e2e "start-up notice when" |
| A-DN-07 | standalone bundle (owner rule R-A): `npm run bundle -- distance-norms` builds `dist/distance-norms/` with exactly the files the app imports, the licences, a generated README and a root `index.html` (§6, "Building and deploying this app alone") | anyone can host this one app elsewhere without the rest of the site (owner rule R-A, 2026-10-17) | v0.1.15 | e2e "bundle: distance-norms runs from its own folder"; unit "bundle contents listed in DESIGN.md match the collector" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document". Setter
testids follow `shared/ui.js` (`setter-<name>-<value>` with spaces as `-`): `setter-cORw-workspace`,
`setter-cORw-phase-space`, `setter-p-1`, `setter-p-2`, `setter-p-3`, `setter-p-Infinity`.

| data-testid | Feature |
|-------------|---------|
| `setter-cORw-*` | F-DN-01 |
| `setter-p-*` | F-DN-02 |
| `slider-bound` | F-DN-03 |
| `value-bound` | F-DN-03 |
| `plus-bound` | F-DN-03 |
| `play-bound` | F-DN-03 |
| `stepback-bound` | F-DN-03 |
| `stepfwd-bound` | F-DN-03 |
| `slider-r1` | F-DN-04 |
| `value-r1` | F-DN-04 |
| `plus-r1` | F-DN-04 |
| `play-r1` | F-DN-04 |
| `stepback-r1` | F-DN-04 |
| `stepfwd-r1` | F-DN-04 |
| `locator-p1` | F-DN-05, A-DN-02 |
| `locator-p2` | F-DN-06, A-DN-02 |
| `locator-pEnd` | F-DN-07, A-DN-02 |
| `reset` | A-DN-01 |
| `crumbs` | A-DN-04 |
| `details` | F-DN-18 |
| `credits` | A-DN-05 |

## 6. Design

**Files and responsibilities.**
- `demos/distance-norms/model.js` (pure, Node-testable): `INITIAL`, `initialState()` (F-DN-14), `normP(v, p)`
  (F-DN-12), `ballBoundary(p, d, {samples})`, `sheetCuts(theta2, d)`, `sheets(p, d, theta2)` (counter-clockwise
  parameter-space polygons `{poly, lo, hi}`, implicitly closed), `mapWorkspace(conf)`, `mapPhase(conf)` (F-DN-10/11, the
  source's expressions; each returns the map (a, b) ↦ (x, y) for `conf = {r1, r2, theta1, theta2}`), `mapPolygon(poly,
  F)` (§6 step 4), `polygonArea`, `armData(r1, r2, θ1, θ2)` (F-DN-15), `evaluate(state)` = one evaluation of the body
  returning `{locals: {r2, Theta1, Theta2}, arm, region: {mode, sheets: [{param, lo, hi, world, area}], boundary,
  totalArea, degenerate}}`; the picture's layout and styles as data: `IMAGE` (ImageSize 360 and the measured image
  padding), `FRAME` (the `drawFrame` options), `REGION_STYLE` (colour and opacity), `PLOT_RANGE`, the control ranges.
- `demos/distance-norms/main.js`: keeps the Manipulate variables (`cORw, p, bound, r1, p1, p2, pEnd, pEndp,
  IsElbowUpp`), builds the controls in the original's order (`Controls.setterBar` ×2, `Controls.slider` ×2,
  `makeDialControl` ×2), evaluates after every change of cORw, p, bound, r1, p1, p2 and redraws; a pEnd move only moves
  the invisible locator (no evaluation: the body does not depend on it, N-DN-03). Drawing layers in this order: arm
  (Prolog), frame with ticks, labels and axes, region (one polygon per sheet), outline; region and outline are clipped
  to the frame.
- `demos/distance-norms/main.js`: keeps the Manipulate variables (`cORw, p, bound, r1, p1, p2, pEnd, pEndp,
  IsElbowUpp`), builds the controls in the original's order (`Controls.setterBar` ×2, `Controls.slider` ×2,
  `makeDialControl` ×2), evaluates after every change of cORw, p, bound, r1, p1, p2 and redraws; a pEnd move only moves
  the invisible locator (no evaluation needed: the body does not depend on it, N-DN-03).
- `shared/svg-frame.js` (MIT; owned by this app, built with the v0.1.15 foundation and used here unchanged):
  `frameLayout(range, {imageSize, margins})` (plot range with room for the labels), `drawFrame(plot, layer, {range,
  majorStep, minorStep, axes, fontPx, tickLengthsPx, …})` — Frame lines, FrameTicks on four sides with labels on the left
  and bottom, Axes lines through the origin — and `clipToRange` (PlotRangeClipping); pure `framePrimitives` for the
  golden test. Kept separate from `svg-plot.js` so that file stays unchanged; four-bar-linkage and dubins-isochrons use
  it too.
- `index.html` as in the other 2D ports.

**Common code.** From `demos/common/two-link.js`: `armGeometry` (link stadiums, joint points, label anchors with
`theta1LabelRadius = 2/5`, "Robot Arm" on link 1 when `r2 < 1`), `tipPosition`; from `demos/common/arrow-arcs.js`:
`myArrowArc` (red/blue angle arcs); from `demos/common/dial-control.js`: `makeDialControl` with `imageSize: 120`,
`setter: 'normalize'`, `arc: 'myArrowArc2'`, `keyStep: 0.05`, `labels: 'stacked'`, and `drawArcArrow` (draws the
myArrowArc data of the arm: a Point, or the sampled B-spline with its arrowhead). All three are specified in the
kinematics design document (two-link-kinematics DESIGN.md §6); this app adds nothing to them and changes none.

**Reused modules (exact exports).** `shared/svg-plot.js`: `createPlot` (`plotRange [[-2.5, 2.5], [-2.5, 2.5]]`,
`padding: 0`, `imageSize 360` plus the measured image padding for the frame labels), `addLocators` (`pickAnywhere:
true`, `appearance: () => null` for pEnd), `svgNode`. `shared/ui.js`: `Controls.setterBar`, `Controls.slider` (d: min
0.01, max π, step 0.01; r1: 0…2, step 0.01; both with `steps: 'mma'` and the `format` hook, so that the exact initial
d shows as "1/2" and slider values as Mathematica prints them); the setter bar shows no selection for a value outside
its options (Q-DN-07). `shared/mma.js`: `mLess`, `mGreaterEq`, `mGreater` (label and link
tests, through `two-link.js`). `shared/mma-exact.js`: `arcTan`, `norm` (dnrm2 for p = 2 in `normP`).
`shared/mma-colors.js`: `NAMED`, `css`. `shared/mma-text.js`: `parseFraction` (typed values such as `1/2`; `Pi` and `π`
are read as π). `shared/svg-frame.js`: `frameLayout`, `drawFrame`, `clipToRange`. `shared/requirements.js`.

**Region construction (the `ParametricPlot` replacement, D-DN-01).**
1. Boundary of B in parameter space (a, b) = (Δθ<sub>1</sub>, Δθ<sub>2</sub>): p = ∞ — the four edges of the square,
   p = 1 — the four edges of the diamond, each edge sampled with 128 points and its corners exact; p = 2, 3 — 512
   points d·u(φ)/‖u(φ)‖<sub>p</sub>, φ = 2πk/512 (contains the axis points). Closed polygon, counter-clockwise.
2. Workspace mode: one sheet = B translated to the tip (the map is a translation).
3. Phase-space mode: the map F(a, b) has Jacobian determinant r1·r2·sin(θ<sub>2</sub> + b), which changes sign on the
   lines b = kπ − θ<sub>2</sub>. B is cut (polygon clipping by a horizontal line, exact) along every such line with
   −d < b < d — at most two lines, at most three sheets (d ≤ π). On a sheet, θ<sub>2</sub> + b lies in one interval
   (kπ, (k + 1)π) and θ<sub>1</sub> + a in an interval shorter than 2π, so F is one-to-one there (each reachable point
   has exactly one elbow solution with θ<sub>2</sub> in that interval); the image of a sheet is therefore bounded by
   the image of the sheet's boundary, a simple closed curve. Each sheet boundary (ball arcs + the straight cuts, the
   cuts sampled with 128 points) is mapped with F and filled as one SVG polygon at fill opacity 0.5. Where two sheets
   overlap (the map folds at the circles of radius abs(r1 − r2) and r1 + r2) the overlap is darker, as separately
   blended polygons would be (K-DN-01).
4. Refinement: wherever two consecutive mapped points are more than 0.01 plot units (≈ 1.4 px) apart, the parameter
   segment between them is halved until they are not (at most 8 times) — a fixed rule, no adaptivity in the parameter
   domain beyond that.
5. Boundary line = F(boundary of B) (closed polyline, opaque, 1 px at 360 pt). The cut lines are not part of it
   (`BoundaryStyle` outlines the boundary of the `RegionFunction` region only). Near a fold the folded part of the
   ball boundary maps to within about 1.5 px of the fold circle (snapshot 6 `Settings`: θ<sub>2</sub> + Δθ<sub>2</sub> ≤ 0.208
   gives radius ≥ 2 cos 0.104 = 1.989), so the fold edge looks outlined there in both; H-DN-04 records Mathematica's lines.
6. Degenerate arms (r1 = 0 or r2 = 0, tested exactly in phase-space mode): F has rank 1, the image of B has zero area,
   so the model gives every sheet the area 0 and nothing is filled (D-DN-08); the boundary runs back and forth on the
   circle of radius 2 — the same result `ParametricPlot` would give with zero-area triangles (K-DN-02, H-DN-07/08).

**State model.** Manipulate variables in `main.js`, `evaluate` pure. The body assigns nothing, so there is no feedback
between evaluations. Exact initial numbers (1/2, 1, the dial vectors) are machine numbers in the port (D-DN-04).

**Evaluation order** = the body's: r2, θ<sub>1</sub>, θ<sub>2</sub>, arm, region. Once per update (slider drags at most
once per animation frame).

**Numerics.** `ArcTan` bit-exact (`mma-exact.arcTan`); `Norm[v, 2]` dnrm2, p = 1 sum, p = 3 (abs³ + abs³)^(1/3), ∞ max;
tolerant `r2 < 1`, `r2 >= 1`, `Abs[θ] > π/4`, `start == end` (myArrowArc); `cORw == "workspace"` is a string test.
Only the arm and the corner/vertex images are compared with tight tolerances; the region outline is compared with the
harness record geometrically (Hausdorff distance), because `ParametricPlot`'s sample points cannot be reproduced.

**Region / contour built-ins.** `ParametricPlot` with two parameters, `RegionFunction` (strict `<`), `PlotStyle ->
Opacity[0.5]`, the automatic `BoundaryStyle`, `Frame`/`Axes`/`FrameTicks` defaults. No `RegionPlot`, `ContourPlot` or
`DensityPlot`. Fidelity risks: the sampled vs exact outline (D-DN-01), blending of overlapping parts (K-DN-01),
degenerate maps (K-DN-02), the frame's tick and label style (D-DN-03).

### 6.1 Building and deploying this app alone

Owner rule R-A (2026-10-17): this one app can be taken out of the repository and hosted anywhere.

- Command, in the repository folder: `npm run bundle -- distance-norms` → `dist/distance-norms/` (with `--zip` also
  `dist/distance-norms.zip`). `tools/bundle-app.mjs` follows every file the page loads (HTML, static imports,
  stylesheets) and copies exactly those, keeping the repository's folder layout, so no path is rewritten; it stops with
  a list of problems if a reference cannot be resolved.
- Contents (generated with `node tools/bundle-app.mjs distance-norms --update-docs`; unit "bundle contents listed in
  DESIGN.md match the collector" keeps the table current):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/distance-norms/`) | 3 | `index.html`, `main.js`, `model.js` |
| `shared/` | 11 | `exact-pi.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `mma-text.js`, `mma.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `ui.js` |
| `demos/common/` | 4 | `arrow-arcs.js`, `dial-control.js`, `prm-core.js`, `two-link.js` |
| added by the bundler | 7 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/distance-norms/DESIGN.md` |
<!-- bundle-contents:end -->

- Added files: `index.html` opens the app (the app's "All demos" link, `../../index.html`, leads back to it and links to
  the app), a generated `README.md` (title, the credits of the footer, licence summary, how to serve and test),
  `.nojekyll` (GitHub Pages), this document, `LICENSE.md` and the `LICENSES/` texts of the SPDX identifiers found in the
  copied files (CC BY-NC-SA 3.0 for this app and `demos/common/`, MIT for `shared/`).
- Requirements: any static web server (`npx serve`, `python -m http.server`, GitHub Pages); not `file://` (browsers block
  ES modules there); a current browser with ES modules (Firefox, Chromium, WebKit); no WebGL (SVG only). No server-side
  code.
- Checked by e2e "bundle: distance-norms runs from its own folder" (A-DN-07, `tests/e2e/bundle.spec.js`): the bundle
  folder alone is served, its root page must open the app, the app must start (`window.__demo.ready`) without page
  errors, every request must stay inside the folder and succeed, and every script and stylesheet of the bundle must be
  loaded.

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

| ID | Kind | Description |
|----|------|-------------|
| Q-DN-01 | quirk kept | The Manipulate still has the end-effector locator `pEnd` (invisible) and the hidden `pEndp`, `IsElbowUpp` of the kinematics Demonstration; the body never uses them. A press in the plot grabs the invisible locator (LocatorPane), which moves within ±2 and changes nothing. |
| Q-DN-02 | quirk kept | `{Black, Point[{{0, 0}}], , Red, …}`: the double comma puts a `Null` in the arm list (ignored by Graphics; nothing drawn). |
| Q-DN-03 | quirk kept | The arm is `Prolog`, so it is drawn under the half-transparent region: where they overlap the arm and its labels are tinted blue (snapshot 1: black text under the region measures (47, 65, 90)). |
| Q-DN-04 | quirk kept | `RegionFunction` uses a strict `<`: for ∞ the region is the open square, whose edges coincide with the parameter domain ±d. No visible effect. |
| Q-DN-05 | quirk kept | In workspace mode the joint-angle offsets Δθ<sub>1</sub>, Δθ<sub>2</sub> (radians) are added to x and y (lengths): the set is the norm ball of radius d around the tip, as the Details text intends. |
| Q-DN-06 | quirk kept | "Robot Arm" turns with its link (upside down for some angles); the θ labels are not rotated. The θ<sub>1</sub> arc and label are red, the θ<sub>2</sub> ones blue (the kinematics Demonstration uses dark gray). |
| Q-DN-07 | quirk kept | Snapshots 3–6 store `cORw = "configuration"` (an older name of the second choice, raw notebook lines 4818, 6021, 7213, 8429), which is not one of the setter's values: the setter shows no button selected (snapshot pictures 3–6) and `cORw == "workspace"` is False, so the phase-space map is drawn. The port's setter bar shows no selection for such a value and the model tests `cORw === "workspace"` only. |
| D-DN-01 | deviation | `ParametricPlot` (adaptive sampling of the parameter square, `RegionFunction` clipping, refinement, triangulated output) is replaced by the exact norm ball, its sheets and their mapped outlines (§6). The outline is the exact curve sampled every ≤ 0.01 units instead of Mathematica's piecewise-linear approximation; the difference is below a pixel at the default size: the extents of the exact sets, computed for snapshots 1, 3, 4 and 5, agree with the extents measured in the pictures within 0.007 units (1 px); the harness record gives the exact comparison. |
| D-DN-02 | deviation | Overlapping sheets are drawn as separate translucent polygons (darker where the map folds); inside a sheet there is one polygon, so no seams. If Mathematica blends overlapping triangles differently (K-DN-01), only the overlap shading differs. |
| D-DN-03 | deviation | Frame, ticks, tick labels and axes are drawn by `shared/svg-frame.js` with measured sizes (frame 688 px = 5 units in snapshot 1 at 2.19 px/pt; major ticks 9 px, minor 5 px; image padding left 62 px, right 39 px, top 33 px, bottom 62 px of the 789 px picture); fonts and anti-aliasing differ. |
| D-DN-04 | deviation | Exact initial values (d = 1/2, r1 = 1) are machine numbers in the model; the value fields use the `format` hook ("1/2" as text where the original shows a built-up ½; "2." for the real 2.), cf. D-UB-07. Typed values are clamped to the slider ranges (K-DN-06). A typed whole number stays exact and shows without a point ("1", "2"), as Mathematica keeps a typed Integer (shared `ui.js` since the review of v0.1.15; before it showed "2."); dragged values show as machine reals ("2."). |
| D-DN-05 | deviation | LocatorPane picking (12 px no-jump zone) for the dials and the invisible locator, as D-CP-06. |
| D-DN-06 | deviation | One evaluation per animation frame during drags; the original re-samples the `ParametricPlot` in the kernel on every update and is slower (cf. O-PA-01). |
| D-DN-07 | deviation | Arc arrowheads, point sizes, text and line widths approximate Mathematica's (D-TK-04), fitted to snapshot 1 at 2.19 px/pt: points 2.4 pt across, arrowheads a filled triangle 0.03 of the image width long (`drawArcArrow` of `dial-control.js`), θ labels `Medium` = 12 pt, "Robot Arm" (Graphics' default text) 9 pt — the measured length of "Robot Arm" (0.68 plot units in snapshot 6) — tick labels 10 pt, edges and outline 1 pt. Font: Helvetica/Arial instead of Mathematica's. |
| D-DN-08 | deviation | Degenerate arms (r1 = 0 or r2 = 0 exactly, phase-space mode): the rank-1 map has an image of zero area; the mapped sheet polygons would still enclose slivers of about 10⁻⁶ from the chords of the sampled curve, so the model sets every sheet's area to 0 and fills nothing; only the outline (on the circle of radius 2) is drawn. What the original shows is K-DN-02. |
| D-DN-09 | deviation | At a fold the image of the ball boundary meets the fold circle tangentially; the chords of the two sampled curves (each segment ≤ 0.01 units, chord depth ≤ 6·10⁻⁶ units) may cross each other there, so a sheet polygon is simple only up to that depth near the fold circles (unit test "sheet areas add up to the integral of r1 r2 abs(sin(theta2 + theta2d))" checks this). Invisible at any zoom the page offers. |
| K-DN-01 | known issue (lead) | Does Mathematica draw overlapping parts of a folded region darker (each triangle blended separately) or uniformly? No snapshot shows a large overlap (snapshot 6's double-covered strip is 0.011 units, about 1.5 px, wide). Harness H-DN-05 records whether the output polygons overlap; M-DN-04 compares by eye with d = π. |
| K-DN-02 | known issue (lead) | Degenerate arms (r1 = 0 or 2): whether the original shows the boundary line on the circle of radius 2, nothing, or an error. Harness H-DN-07, H-DN-08; M-DN-05. |
| K-DN-03 | known issue (lead) | A dial press exactly at its centre gives p1 = {0., 0.} and `ArcTan[0., 0.]` (as K-TK-04). Port: the update is ignored (D-TK-07). Harness H-DN-11. |
| K-DN-04 | known issue (lead) | Snapshot 2 shows a small blue dot after "Robot Arm" that no primitive draws (as K-TK-06); not reproduced. M-DN-02. |
| K-DN-05 | known issue (lead) | The d slider ends at π, but its 0.01 grid from 0.01 ends at 3.14: whether the original's slider can reach π itself is unknown (port: π is the range end, values snap to the grid; the ⊕ field accepts π). |
| K-DN-06 | known issue (lead) | Typed d ≤ 0 makes the parameter range invalid (`{Theta1d, 0, 0}` or reversed); what the original shows is unknown; the port clamps to 0.01 … π. M-DN-08. |
| N-DN-01 | note | The Details say "The arm's workspace is the unit disk"; with r<sub>1</sub> + r<sub>2</sub> = 2 it is the disk of radius 2. Text kept as in the original. |
| N-DN-02 | note | The arm code is the kinematics Demonstration's with LightGray links and coloured arcs; both ports draw it with `armGeometry` from `demos/common/two-link.js`. |
| N-DN-03 | note | The plotted expressions use the global symbols `Theta1d`, `Theta2d` (localised by `ParametricPlot`), the `RegionFunction` its own `Function` arguments. Because the body never refers to `pEnd`, moving the invisible locator does not change the output in any case; whether it triggers an evaluation is irrelevant (H-DN-13). |
| N-DN-04 | note | Saved state: the raw notebook stores `bound = Rational[1, 2]` and `p = DirectedInfinity[1]`; the extracted JSON shows `bound` as 0.5. |
| N-DN-05 | note | Snapshot `Settings` (raw notebook): 1 = the saved state (phase space, ∞); 2 = workspace, ∞, p1 = {0., 1.}, p2 = {0.9999539231848051, 0.009599557662574138} (θ = (π/2, 0.0095997), tip (−0.0096, 1.99995): the square reaches y 2.49995, just inside the frame); 3, 4, 5 = `cORw = "configuration"` (Q-DN-07) with p = 3, 2, 1 at the opening angles; 6 = `cORw = "configuration"`, p = 1, p1 = {0.9407478840311477, 0.3391067954065765}, p2 = {0.9576538422043407, −0.28792207020522664} (θ = (0.34597, −0.29206) = (19.82°, −16.73°)). All have d = 1/2 and r1 = 1 exact. The notebook's snapshot cells 7 and 8 contain the Wolfram icon placeholder. |
| N-DN-06 | note | "References for demonstration." under References is a template placeholder of the notebook and is not shown. |
| N-DN-07 | note | The phase-space area of snapshot 6 (1-norm, θ = (0.34597, −0.29206)) is 0.146968 (1-D integral of 2(d − abs b)·abs sin(θ2 + b), 200 000 steps); the draft's 0.14685 came from a 2000² midpoint rule that loses the cells cut by the diamond's edges (0.08 % low). Tests use the 0.5 % tolerance of the TESTPLAN, so both values pass; the port gives 0.146968. |

## 8. Proposed changes

No open proposal. Template (see [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md)):

| ID | Status | Requested by / date | Change | Reason | Acceptance criteria |
|----|--------|---------------------|--------|--------|---------------------|

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.15 | 2026-10-17 | first implementation of the design draft of 2026-10-12 (approved by the owner 2026-10-17, DEC-17; COMMON-DECISIONS §6 and owner rules R-A/R-B/R-C applied). Changes against the draft: harness references written as golden test titles (`golden "harness H-DN-nn"`, the harness comparisons live in `tests/golden/distance-norms.golden.test.js` and skip until the harness data exist); D-DN-07 made concrete, D-DN-08, D-DN-09, N-DN-07 added; E-DN-03 and E-DN-04 added to §11; the picture layout and styles are data in `model.js` (§6); review fixes |
| 2 | v0.1.16 | 2026-10-18 | version number only (batch B release); no change to this app |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|-------------|---------|-------------|---------|
| I-DN-01 | Show the parameter-space ball next to the workspace picture (an inset in θ<sub>1</sub>, θ<sub>2</sub>) | students see what is being mapped | a new view not in the original | F-DN-13 |
| I-DN-02 | Overlay the workspace boundary (circles of radius 2 and abs(r1 − r2)) | shows directly that the workspace norm ball can leave the reachable set (Details text) | adds drawing the original lacks | Q-DN-05, N-DN-01 |
| I-DN-03 | Remove the inert end-effector locator | presses in the plot no longer grab an invisible locator | changes the original's controls | Q-DN-01 |
| I-DN-04 | Correct "unit disk" in the Details to "disk of radius 2" | accurate text | departs from the original's wording | N-DN-01 |
| I-DN-05 | A slider for p (any p ≥ 1) instead of four buttons | continuous comparison of norms (as in Unit Balls) | a new control | F-DN-02 |

## 11. Errors in the original (conceptual and mathematical)

Owner rule R-C (2026-10-17). Checked: that each "norm" is the norm it is labelled as — `Norm[{Theta1d, Theta2d}, p]` for
p = 1, 2, 3, ∞ is the sum of absolute values, the Euclidean norm, (abs³ + abs³)<sup>1/3</sup> and the maximum, matching the
setter labels 1, 2, 3, ∞ and the Details' L<sub>1</sub>, L<sub>2</sub>, L<sub>3</sub>, L<sub>∞</sub> (correct); the workspace map (the
p-ball of radius d around the tip, as the Details' workspace norms say, Q-DN-05) and the phase-space map (forward
kinematics of the shifted angles: correct); the Details' containment L<sub>1</sub> ⊆ L<sub>2</sub> ⊆ L<sub>3</sub> ⊆ L<sub>∞</sub> (true for
balls of equal radius because ‖x‖<sub>p</sub> does not increase with p, and kept by the map); the arm code (as two-link-kinematics,
N-DN-02); the caption, the Details (each formula box of the raw notebook, lines 8560–8830) and the snapshot references
against the snapshot `Settings` (N-DN-05). The stale
`cORw = "configuration"` of snapshots 3–6 (Q-DN-07) is old data in the notebook, not an error of the Demonstration's
logic, and is not listed.

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|------|-----------------------|--------------------------|--------------------|-------------------------|--------|
| E-DN-01 | text | Details: "The arm's workspace is the unit disk, but the L<sub>∞</sub> < 1/2 workspace norm shown in Snapshot 1 includes an area inaccessible to the robot arm." | With r<sub>1</sub> + r<sub>2</sub> = 2 (`r2 = 2 - r1`) the workspace is the disk of radius 2 (an annulus for r<sub>1</sub> ≠ 1), not the unit disk; the square of snapshot 2 reaches y = 2.49995, outside radius 2, which is the point being made. | Shows the Details as in the original (F-DN-18, N-DN-01). | Text only ("the disk of radius 2", I-DN-04); no value or test changes; M-DN-01 records the difference as intended. | open |
| E-DN-02 | text | The same sentence: "… shown in Snapshot 1 …" | Snapshot 1 (the opening state, `Settings` = the saved state, N-DN-05) is the **phase-space** L<sub>∞</sub> picture, which stays inside the workspace; the workspace L<sub>∞</sub> square that leaves the disk is snapshot 2 (`cORw = "workspace"`, θ = (π/2, 0.0096)). Unless the published page numbers its snapshots differently, the reference should be "Snapshot 2". | Shows the text as in the original (F-DN-18). | Text only; no test changes. Same check as M-DN-01. | open |
| E-DN-03 | text | Details: "The vector norm ‖x‖<sub>p</sub> … is defined as" `RadicalBox[RowBox[{SubscriptBox["∑", "i"], "\|", SubscriptBox["x", "i"], SuperscriptBox["\|", "p"]}], RowBox[{"1", "/", "p"}]]` (raw notebook line 8578) | The radical's index is 1/p: the (1/p)-th root of Σ abs(x<sub>i</sub>)<sup>p</sup> is (Σ abs(x<sub>i</sub>)<sup>p</sup>)<sup>p</sup>, not the p-norm (Σ abs(x<sub>i</sub>)<sup>p</sup>)<sup>1/p</sup>. The p-th root (index p) or the exponent 1/p was meant; the L<sub>3</sub> formulas further down use the index 3 correctly. The code (`Norm[…, p]`) is right. | Shows the formula as the original writes it (an `mroot` with index 1/p, F-DN-18). | Text only (index p instead of 1/p); no value, test or snapshot changes. M-DN-01 records the formula. | open |
| E-DN-04 | text | Details, phase-space norms: "L<sub>∞</sub> = max(abs(θ<sub>1</sub><sup>*</sup> − θ<sub>1</sub> , abs(θ<sub>2</sub><sup>*</sup> − θ<sub>2</sub>))" — the box `RowBox[{"\|", RowBox[{…θ1*, "-", θ1}]}]` has no closing "\|" (raw notebook lines 8796–8800) | A typo: the absolute value of the first difference is not closed, so the formula reads "max(\|θ₁* − θ₁ ,\|θ₂* − θ₂\|)". The workspace L<sub>∞</sub> formula above it is written correctly. | Shows the formula as the original writes it (F-DN-18). | Text only (add the closing bar); no test changes. M-DN-01 records it. | open |
