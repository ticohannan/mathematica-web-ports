# Design document: Minkowski Sum of Convex Robot and Obstacle

| | |
|---|---|
| Code version: | 0.1.20 |
| Document revision | 3 (2026-10-18) — harness run 2 evaluated (K-MS-01/02/03/04/07/08 resolved, P-MS-01 proposed, K-MS-11 new) |
| Status | describes the app as implemented; changes go through *Proposed changes* (§8) and [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md) |
| Original | Wolfram Demonstrations Project, "Minkowski Sum of Convex Robot and Obstacle", contributed by Shreyas Poyrekar, Arifa Sultana and Aaron T. Becker, published 2019-04-23 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/MinkowskiSumOfConvexRobotAndObstacle/>. Readable source: `docs/original-source/minkowski-sum.txt`; snapshots: `docs/original-snapshots/minkowski-sum-1.png` … `-5.png` (the extraction's pictures 6 and 7 are the Wolfram logo, not snapshots); golden data (`tests/golden/minkowski-sum.original-states.json`, COMMON-DECISIONS §1): the live state, the Settings of the five snapshot cells (raw notebook lines 4386, 5542, 6194, 7236, 7866) and the initial settings |
| Port files | `demos/minkowski-sum/minkowski.js` (the Initialization functions under their original names and one evaluation of the Manipulate body, geometry returned as data; pure), `main.js` (the Manipulate on `shared/manipulate.js`: controls, the ten locators, Graphics data, animation; v0.1.20), `index.html`; shared: `demos/common/polygon-core.js` (CC BY-NC-SA 3.0, owned by this app: `lineList`, `vector`, `areaOfPoly`, `centroidOfPoly`, `discretizeLineRev1` moved from motion-planning, `sameQ` (and `lineList`) from art-gallery; COMMON-DECISIONS §3, §6.3) |
| Role in the project | further demonstration (batch A) |

## 1. Purpose and background

Teaches how the configuration-space obstacle of a translating convex robot is built. The user shapes a convex robot
(blue, right) and a convex obstacle (red, left) with up to five vertices each by dragging invisible locators; the
Demonstration takes their convex hulls, draws the edge normals (inward for the robot, outward for the obstacle), sorts
all normals by angle ("sorted normals", lower left) and builds the Minkowski sum by adding the edges in that order
(lower right): every edge of the sum is a translated robot edge (blue) or obstacle edge (red), labelled α_i / β_j. The
view "move around Minkowski" animates the robot sliding around the obstacle with its centroid on the boundary of the
sum, which shows that the sum is the set of robot positions where robot and obstacle touch or overlap. The Details text
describes the four steps (convex hulls, normals, sorting, adding edges) after LaValle, *Planning Algorithms* (2006).

## 2. Scope

In scope: the original's controls ("view" setter, "show normals" and "enable locators" checkboxes, "number of robot
edges" and "number of obstacle edges" setters, the animated "move" slider of the move view), the ten invisible vertex
locators with the original's clamping, the Graham-scan hull, centroids, normals, the sorted-normal merge with its labels,
the discretised boundary used by the animation, both views' drawings, and the original's quirks (§7).
Out of scope (would need a design entry first): non-convex polygons, rotation of the robot, more than five vertices,
showing several obstacles, exporting the sum.

## 3. Users and use cases

| ID | User | Use case |
|----|------|----------|
| UC-MS-01 | student | change the robot and obstacle shapes and follow the four construction steps (hulls, normals, sorted normals, sum) |
| UC-MS-02 | student | see that every edge of the sum is a robot or obstacle edge, with the α/β labels and normals |
| UC-MS-03 | student | watch the robot slide around the obstacle with its centroid on the boundary of the sum |
| UC-MS-04 | tester | compare the port with the original's saved state, snapshots and the Mathematica harness |

## 4. Features

Verification references `golden "minkowski-sum: harness H-MS-nn"` name the golden tests that compare the port with the
Mathematica harness record of scenario H-MS-nn (`tests/harness/minkowski-sum.scenarios.json`, TESTPLAN); they skip
with the reason "no harness data (owner run pending)" until `tests/golden/minkowski-sum.harness.json` exists.

### 4.1 Controls

| ID | Feature | Reason | Since | Verified by |
|----|---------|--------|-------|-------------|
| F-MS-01 | "view" setter `{{stableOrMove, "static", "view"}, {"static", "move around Minkowski"}}`, default "static", always shown at the top | switch between the construction (UC-MS-01) and the animation (UC-MS-03) | v0.1.15 | e2e "minkowski-sum: has the controls of the original with their defaults"; e2e "minkowski-sum: move around Minkowski replaces the four controls by the running move slider and disables the locators"; golden "minkowski-sum: harness H-MS-17"; M-MS-05 |
| F-MS-02 | "show normals" checkbox `Control@{{a, False, "show normals"}, {True, False}}` (ControlPlacement 1), default unchecked; shown only in the static view; draws the normal arrows of robot, obstacle and Minkowski sum | use case UC-MS-02 | v0.1.15 | e2e "minkowski-sum: has the controls of the original with their defaults"; e2e "minkowski-sum: show normals draws the normal arrows"; golden "minkowski-sum: harness H-MS-21"; M-MS-03 |
| F-MS-03 | "enable locators" checkbox `Control@{{c, True, "enable locators"}, {True, False}}` (ControlPlacement 2), default checked, shown only in the static view; the locators have `Enabled -> c`; the body sets `c = True` in the static view and `c = False` in the move view (Q-MS-03) | as in the original | v0.1.15 | e2e "minkowski-sum: has the controls of the original with their defaults"; e2e "minkowski-sum: unchecking enable locators in the static view is undone by the next evaluation"; unit "static view sets c True and s 1, move view sets c False"; golden "minkowski-sum: harness H-MS-20"; M-MS-04 |
| F-MS-04 | "number of robot edges" setter `Control@{{m, 3, "number of robot edges"}, Range[1, 5]}` (ControlPlacement 3): buttons 1 … 5, default 3; the robot uses locators 1 … m | robot shape (UC-MS-01) | v0.1.15 | e2e "minkowski-sum: has the controls of the original with their defaults"; e2e "minkowski-sum: robot edges 5 shows the pentagon with labels alpha1 to alpha5"; golden "minkowski-sum: harness H-MS-02"; golden "minkowski-sum: harness H-MS-03"; golden "minkowski-sum: harness H-MS-04"; golden "minkowski-sum: harness H-MS-06" |
| F-MS-05 | "number of obstacle edges" setter `Control@{{n, 5, "number of obstacle edges"}, Range[1, 5]}` (ControlPlacement 4): buttons 1 … 5, default 5; the obstacle uses locators 6 … n + 5 | obstacle shape (UC-MS-01) | v0.1.15 | e2e "minkowski-sum: has the controls of the original with their defaults"; golden "minkowski-sum: harness H-MS-05"; golden "minkowski-sum: harness H-MS-07"; golden "minkowski-sum: harness H-MS-12" |
| F-MS-06 | "move" slider `Control@{{s, 1, "move"}, 1, dl, 1, AnimationRunning -> True, Appearance -> "Open"}` (ControlPlacement 5), only in the move view: integer 1 … dl (dl = 1017 at the defaults), value field and animation panel shown open, animation running as soon as the slider appears, looping; values 1 + k·1 (`shared/ui.js` `steps: 'mma'`) | drives the robot around the sum (UC-MS-03) | v0.1.15 | e2e "minkowski-sum: move around Minkowski replaces the four controls by the running move slider and disables the locators"; e2e "minkowski-sum: the animation moves the robot along the Minkowski boundary"; unit "move view: s = 119 puts the robot centroid on the second Minkowski vertex"; M-MS-06 |
| F-MS-07 | Control layout `Dynamic@If[stableOrMove != "move around Minkowski", Row[{a, Spacer[10], c, Spacer[10], m, Spacer[10], n}], s]`: one row of four controls in the static view, the "move" slider in the move view | as in the original | v0.1.15 | e2e "minkowski-sum: move around Minkowski replaces the four controls by the running move slider and disables the locators"; inventory |
| F-MS-08 | Ten locators `{{pts, {{2.885, 1.489}, {3.249, 2.60}, {2.298, 3.298}, {1.348, 2.607}, {1.710, 1.489}, {-1.710, 1.489}, {-1.347, 2.607}, {-2.298, 3.298}, {-3.249, 2.607}, {-2.885, 1.489}}}, {-3.249, 1.489}, {3.249, 3.298}, ControlType -> Locator, Appearance -> None, Enabled -> c}`: 1–5 robot, 6–10 obstacle; invisible; positions limited to x −3.249 … 3.249, y 1.489 … 3.298; all ten active even when unused (Q-MS-02); LocatorPane picking (a press anywhere moves the nearest locator, D-MS-04); inactive while `c` is False (move view) | shaping robot and obstacle (UC-MS-01) | v0.1.15 | e2e "minkowski-sum: dragging a robot vertex with the mouse reshapes the robot and the Minkowski sum"; e2e "minkowski-sum: a press away from every locator moves the nearest locator there, also an unused one"; e2e "minkowski-sum: move around Minkowski replaces the four controls by the running move slider and disables the locators"; M-MS-07 |

### 4.2 Model (`minkowski.js`)

| ID | Feature | Reason | Since | Verified by |
|----|---------|--------|-------|-------------|
| F-MS-09 | Vertex clamp, written back into `pts`: `Table[If[pts[[i]][[1]] < 1.34704, pts[[i]][[1]] = 1.34704], {i, 1, m, 1}]` and `Table[If[pts[[i]][[1]] > -1.34704, pts[[i]][[1]] = -1.34704], {i, 6, n + 5, 1}]` inside `If[pts != oldpts, …]` (always true, Q-MS-01); only the m robot and n obstacle locators in use are clamped (Q-MS-02) | keeps the robot right and the obstacle left of the centre line | v0.1.15 | unit "pts constraint: robot x below 1.34704 and obstacle x above -1.34704 are clamped, written back into pts"; unit "only the first m robot and n obstacle locators are clamped, unused ones stay"; e2e "minkowski-sum: a robot vertex dragged left of the limit stops at x = 1.34704"; golden "minkowski-sum: the saved state is the state after the first evaluation of the initial settings"; golden "minkowski-sum: harness H-MS-09"; golden "minkowski-sum: harness H-MS-10" |
| F-MS-10 | Convex hulls: `robopts = DeleteDuplicates@pts[[1;;m]]` (SameQ), `robot = If[Length >= 3, RotateLeft[convexHullGrahamScan@robopts, -1], robopts]`, the same for the obstacle; `rl = Length@robot`, `ol = Length@obstacle` (Manipulate variables). `convexHullGrahamScan` exactly as written: `Sort` by y with `#1[[2]] < #2[[2]] &`, the rest sorted by `ArcTan[x − x0, y − y0]` from the first point, the For/While loop with `clockwiseQ` (`Chop` of the cross product, `<= 0`), `If[m > 2, m = m − 1, If[i == n, Break[], i += 1]]`, swap `p[[{i, m}]] = p[[{m, i}]]`, result `p[[1;;m]]` | step 1 of the Details text | v0.1.15 | unit "convexHullGrahamScan returns the hull counter-clockwise from its first point (independent monotone-chain oracle)"; unit "y ties in the Graham sort start the hull at the later of the tied points"; unit "the hull drops interior points"; unit "three collinear points stay a zero-area polygon with the mean as centroid"; unit "DeleteDuplicates removes coincident locators with SameQ (1 ulp)"; golden "minkowski-sum: snapshot 1 numbering and order of the alpha and beta labels"; golden "minkowski-sum: snapshot 2 and 3 Settings (m 5, n 3, dragged vertices) give rl 5, ol 3 and dl 878"; golden "minkowski-sum: snapshot 4 and 5 Settings (m 2, n 4) give rl 2, ol 4 and dl 780"; golden "minkowski-sum: harness H-MS-25"; golden "minkowski-sum: harness H-MS-11"; golden "minkowski-sum: harness H-MS-14"; golden "minkowski-sum: harness H-MS-15"; golden "minkowski-sum: harness H-MS-16" |
| F-MS-11 | Centroids `rc = If[rl >= 3, centroidOfPoly@robot, Mean@robot]`, `oc` likewise; `centroidOfPoly` = signed shoelace (`areaOfPoly = 1/2 Total@(areaCalulation /@ lineList@poly)`, `Total@(centroidCal /@ lineList@poly)/(6 area)`), `Mean@poly` when `area != 0` is False | reference points of the sum (Details: "the centroid of the robot") | v0.1.15 | unit "centroidOfPoly: default robot (2.810667, 2.462333) and obstacle (-2.297845, 2.298053)"; unit "two-vertex robot: two opposite edges and the mean as centroid"; golden "minkowski-sum: harness H-MS-01" |
| F-MS-12 | Normals and edge vectors: robot `{If[rl >= 2, -normalVector[#], {0, 0}], If[rl >= 2, -vector[#], {0, 0}], "α", #} & /@ lineList@robot` (inward normal, forward edge vector), obstacle `{normalVector[#], vector[#], "β", #}` (outward normal, reversed edge vector); `normalVector[{{x2,y2},{x1,y1}}] := Normalize[{-y2 + y1, x2 - x1}]`, `vector[{{x2,y2},{x1,y1}}] := {x2 - x1, y2 - y1}`; names `Subscript[α, i]`, `Subscript[β, j]` via `AssociationThread` | step 2 of the Details text | v0.1.15 | unit "normalVector and vector take the edge as {{x2,y2},{x1,y1}}: outward normal of a counter-clockwise edge and the reversed edge vector"; unit "two-vertex robot: two opposite edges and the mean as centroid"; golden "minkowski-sum: harness H-MS-04"; golden "minkowski-sum: harness H-MS-05" |
| F-MS-13 | Sorted normals: `orderOfNormals = Sort[{If[!(n1 == 0 && n2 == 0), ArcTan[n1, n2], None], normal, vec, label, edge} & /@ Join[robot…, obstacle…], #1[[1]] < #2[[1]] &]` (tolerant Less, Mathematica's tie order, Q-MS-04, K-MS-01), `pos = SequencePosition[labels, {"α", "β"}][[1, 1]]`, `orderOfNormalsKeys = RotateLeft[Keys@orderOfNormals, pos]` | step 3 of the Details text | v0.1.15 | unit "default sorted normals: beta1 alpha3 beta2 beta3 alpha1 beta4 beta5 alpha2 with pos = 2"; unit "parallel robot and obstacle edges: tied angles keep Mathematica's Sort order (reverse input order)"; unit "single-point robot: None never compares less, the sort model finds no alpha-beta pair (regression pin)"; unit "minus zero: the inward normal of a vertical robot edge has the angle pi, not -pi"; golden "minkowski-sum: snapshot 1 numbering and order of the alpha and beta labels"; golden "minkowski-sum: harness H-MS-13"; golden "minkowski-sum: harness H-MS-06"; golden "minkowski-sum: harness H-MS-07"; golden "minkowski-sum: harness H-MS-08" |
| F-MS-14 | Minkowski vertices: `prev = rc + sortedVectors[[pos+1]][[5]][[1]] - sortedVectors[[pos]][[5]][[1]]`, then `{Chop[prev = prev - #[[3]]], #[[4]]} & /@ RotateLeft[sortedVectors, pos - 1]` (Q-MS-06; no DeleteDuplicates, Q-MS-07); `shiftedMinkwithSide = {-oc + offset + p, side}` with `offset = {2.298, -2.298}` and the first entry appended; `minkRobotlinelist` / `minkObstlinelist` = segments ending at an "α" / "β" vertex | step 4 of the Details text (UC-MS-02) | v0.1.15 | unit "default Minkowski vertices: the hull of obstacle minus robot plus rc, starting after alpha3"; unit "default Minkowski edges: three robot lines and five obstacle lines, closing edge alpha3"; unit "property: every Minkowski edge is a robot or obstacle edge and the polygon is the hull of O - (R - rc)"; unit "Chop applies to the stored vertex, the running sum keeps values below 1e-10"; golden "minkowski-sum: harness H-MS-01"; golden "minkowski-sum: harness H-MS-12" |
| F-MS-15 | Discretised boundary `discretPolygon = discretizePolyRev1[minkowskiPoints, step]` (`step` = 0.01, ControlType None): per edge `discretizeLineRev1` = points `p1 + (p2 − p1) t` for `t ∈ Range[0, 1, step/d]` (`{p1}` for d = 0), then the first vertex appended; `dl = Length@discretPolygon` (1017 at the defaults) sets the slider maximum | positions of the animation (UC-MS-03) | v0.1.15 | unit "discretizeLineRev1: points every step, the end point only when the step divides the length"; unit "dl at the defaults is 1017"; golden "minkowski-sum: the saved state is the state after the first evaluation of the initial settings"; golden "minkowski-sum: snapshot 2 and 3 Settings (m 5, n 3, dragged vertices) give rl 5, ol 3 and dl 878"; golden "minkowski-sum: snapshot 4 and 5 Settings (m 2, n 4) give rl 2, ol 4 and dl 780"; golden "minkowski-sum: harness H-MS-23" |
| F-MS-16 | View logic inside the Graphics: static view `c = True; s = 1;` (Q-MS-08); move view `c = False;`, robot drawn at `discretPolygon[[s]] - rc - oc + #` for each vertex, its centroid marker at `discretPolygon[[s]] - oc`, sum and obstacle shifted by `-oc` | the animation (UC-MS-03) | v0.1.15 | unit "static view sets c True and s 1, move view sets c False"; unit "move view: s = 119 puts the robot centroid on the second Minkowski vertex"; unit "move view: s = dl puts the robot centroid back on the first vertex"; unit "property: at every discretised boundary point the robot touches the obstacle without overlap"; golden "minkowski-sum: harness H-MS-17"; golden "minkowski-sum: harness H-MS-18"; golden "minkowski-sum: harness H-MS-19"; golden "minkowski-sum: harness H-MS-26"; golden "minkowski-sum: harness H-MS-27" |
| F-MS-17 | Initial values of the Manipulate variables (`stableOrMove` "static", `a` False, `c` True, `m` 3, `n` 5, `s` 1, `step` 0.01, `pts` as in F-MS-08) and one evaluation of the body per change; the initial settings (the output cell's stored `"Variables"`: unclamped `pts`, `dl`, `rl`, `ol` Null), evaluated once, give the live state (the saved state) and snapshot 1's Settings (`pts[[7]]` clamped to {−1.34704, 2.607}, `rl` 3, `ol` 5, `dl` 1017); live state and initial settings differ (COMMON-DECISIONS §6): the port opens in the live state, reached by that one evaluation, and its "Initial settings" restores the stored `"Variables"` and evaluates once (A-MS-01) | same opening picture as the original | v0.1.15 | golden "minkowski-sum: the saved state is the state after the first evaluation of the initial settings"; golden "minkowski-sum: evaluating the saved state again changes nothing"; e2e "minkowski-sum: loads without errors and draws obstacle, robot, sorted normals and Minkowski sum" |

### 4.3 Graphics (SVG)

| ID | Feature | Reason | Since | Verified by |
|----|---------|--------|-------|-------------|
| F-MS-18 | Frame: `PointSize[0.01]`; `{EdgeForm[Thin], White, Polygon@(7 CirclePoints[4])}` (axis-parallel square, half side 7/√2, as a machine number 4.949747468305833); `ImageSize -> .9{620, 450}` (558 × 405 px); no PlotRange option (all primitives), default padding. The square bounds every reachable picture (§6.5), so the port uses its range | same frame and scale as the original | v0.1.15 | unit "plot range: the square 7 CirclePoints[4] bounds the default picture, a spread-out robot and obstacle extend it"; golden "minkowski-sum: harness H-MS-22"; M-MS-02 |
| F-MS-19 | Static view, in the original's order: (1) Minkowski sum: `{Opacity[0.5], LightGreen, Polygon@shiftedMink}`, `{Blue, Line@minkRobotlinelist}`, `{Red, Line@minkObstlinelist}`, `{Black, Point@shiftedMink}`, `Text["Minkowski sum", {2.3, -4.75}]`, side-normal arrows (if `a`), side labels blue/red at `Mean@edge − 0.25 normalVector@edge` (or `+0.7`, Q-MS-09); (2) obstacle: `{EdgeForm[Red], LightRed, Polygon}`, red points at all n obstacle locators, black hull vertices, black centroid, outward arrows of length 0.45 (if `a`), red β labels at `Mean − 0.2 normal` (`+0.65` when ol = 2), `Text["obstacle", {-2.3, 0.8}]`; (3) robot: the same in blue/LightBlue with α labels and `Text["robot", {2.3, 0.8}]`; (4) sorted normals: black unit arrows from {−2.3, −1.5}, `{EdgeForm[Thin], White, Disk[{-2.3, -1.5}, {0.5, 0.5}]}` drawn over them, labels at `{-2.3, -1.5} + 1.2 normal`, `Text["sorted normals", {-2.3, -3.2}]` | the four construction steps side by side (UC-MS-01, UC-MS-02) | v0.1.15 | e2e "minkowski-sum: loads without errors and draws obstacle, robot, sorted normals and Minkowski sum"; unit "polygon labels: robot 0.2 outside, obstacle 0.2 inside, 0.65 outside for two-vertex polygons"; unit "Minkowski side labels: 0.25 inside, 0.7 outside for the two-vertex conditions as written"; golden "minkowski-sum: snapshot 1 numbering and order of the alpha and beta labels"; golden "minkowski-sum: snapshot 4 two-vertex robot labels on both sides of the segment"; M-MS-02; M-MS-03 |
| F-MS-20 | Move view: sum `{EdgeForm[None], LightGreen, Opacity[0.5], Polygon}` shifted by −oc, black vertices, blue and red edge lines, `Text["Minkowski sum", {0, 1.1}]`; obstacle at −oc (`EdgeForm[Red], LightRed`, black vertices, `Text["obstacle", {0, 0}]`); robot `{EdgeForm[Blue], Opacity[0.5], LightBlue}` at the s-th boundary point, black vertices, red centroid point, `Text["robot", … + {0.2, 0.2}]` | the animation (UC-MS-03) | v0.1.15 | e2e "minkowski-sum: the animation moves the robot along the Minkowski boundary"; golden "minkowski-sum: snapshots 3 and 5 show the robot centroid at (0.889, 0.450) for s 150 and (0.632, 0.974) for s 166"; M-MS-06 |
| F-MS-21 | Edge names as subscripted symbols α<sub>i</sub> (blue) and β<sub>j</sub> (red) in the polygon labels, the sorted-normal labels and the side labels of the sum (snapshots 2 and 4 show "Global\`α<sub>1</sub>", N-MS-01) | use case UC-MS-02 | v0.1.15 | golden "minkowski-sum: snapshot 1 numbering and order of the alpha and beta labels"; M-MS-02 |
| F-MS-22 | Title, caption and Details text of the original | explains the Demonstration | v0.1.15 | M-MS-01 |

### 4.4 Port additions

| ID | Feature | Reason | Since | Verified by |
|----|---------|--------|-------|-------------|
| A-MS-01 | "Initial settings" button: all controls and the ten locators back to the opening state | stands in for the Manipulate ⊕ menu → Initial Settings | v0.1.15 | e2e "minkowski-sum: Initial settings restores the opening state" |
| A-MS-02 | Arrow keys move a focused locator (0.05 units, Shift = 0.25); each key press is one update | keyboard access | v0.1.15 | e2e "minkowski-sum: arrow keys move a focused locator (port addition)" |
| A-MS-03 | `window.__demo` automation hook (state, view values, `moveLocator`, `setState`, `stopAnimation`, `worldToClient`) | automated tests | v0.1.15 | e2e "minkowski-sum: dragging a robot vertex with the mouse reshapes the robot and the Minkowski sum" |
| A-MS-04 | "All demos" link | site navigation | v0.1.15 | inventory; M-GEN-01 |
| A-MS-05 | Credit footer: original title, authors, licence, adaptation notice | required by CC BY-NC-SA 3.0 | v0.1.15 | e2e "attribution on" |
| A-MS-06 | Start-up notice (watchdog, `<noscript>`) when the page cannot start (DEC-22) | a clear message instead of an empty page | v0.1.15 | e2e "start-up notice when" |
| A-MS-07 | standalone bundle (owner rule R-A): `npm run bundle -- minkowski-sum` builds `dist/minkowski-sum/` with exactly the files the app imports, the licences, a generated README and a root `index.html` (§6, "Building and deploying this app alone") | anyone can host this one app elsewhere without the rest of the site (owner rule R-A, 2026-10-17) | v0.1.15 | e2e "bundle: minkowski-sum runs from its own folder" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|-------------|---------|
| `setter-stableOrMove-*` | F-MS-01 |
| `check-a` | F-MS-02 |
| `check-c` | F-MS-03 |
| `setter-m-*` | F-MS-04 |
| `setter-n-*` | F-MS-05 |
| `slider-s` | F-MS-06 |
| `value-s` | F-MS-06 |
| `plus-s` | F-MS-06 |
| `play-s` | F-MS-06 |
| `stepback-s` | F-MS-06 |
| `stepfwd-s` | F-MS-06 |
| `locator-*` | F-MS-08, A-MS-02 |
| `reset` | A-MS-01 |
| `crumbs` | A-MS-04 |
| `details` | F-MS-22 |
| `credits` | A-MS-05 |

Setter test ids follow `shared/ui.js` (`setter-<name>-<value>` with spaces replaced by `-`, e.g.
`setter-stableOrMove-move-around-Minkowski`); checkboxes follow `shared/ui-extra.js` (`check-<name>`); the ten
locators are `locator-pts-1` … `locator-pts-10`. The move slider's controls exist only in the move view and the four
static-view controls only in the static view (F-MS-07); the inventory test checks both views.

## 6. Design

### 6.1 Files and responsibilities

- `minkowski.js` (pure, no DOM, CC BY-NC-SA like the original): `convexHullGrahamScan` and `clockwiseQ`,
  `discretizePolyRev1`, `normalVector` (with `normalizeCR`, K-MS-02), `deleteDuplicates` (1-ulp `SameQ`), `rotateLeft`,
  `minkowskiWalk` (the `{Chop[prev = prev - #[[3]]], #[[4]]}` walk, Q-MS-06), `robotAt` (the move view's robot
  placement), constants (`OFFSET = [2.298, -2.298]`, `STEP = 0.01`, `X_LIMIT = 1.34704`, `LOCATOR_BOX`, `FRAME_HALF`,
  `DEFAULT_PTS`, `IMAGE_SIZE`), `initialSettings()` (the stored `"Variables"`), `clampToBox`, and `evaluate(state)` = one
  evaluation of the Manipulate body: clamp → hulls → centroids → normals → sort → merge → shifted sum and side lists →
  labels → discretisation → view logic (`c`, `s`), returning the new Manipulate variables (`pts`, `rl`, `ol`, `dl`, `c`,
  `s`), every local under its original name and every drawn item as data (`view.scene`: polygons, points, lines,
  arrows, labels with position, text and colour, in the original's drawing order) for both views. The polygon helpers
  `lineList`, `vector`, `areaCalulation`, `areaOfPoly`, `centroidCal`, `centroidOfPoly`, `discretizeLineRev1` come
  from `demos/common/polygon-core.js` and are re-exported under the original names.
- `demos/common/polygon-core.js` (CC BY-NC-SA 3.0, owned by this app, COMMON-DECISIONS §3; header credits "Motion
  Planning for Robot Path around Obstacles", "Art Gallery Problem" and this Demonstration): `lineList`, `vector`,
  `areaCalulation`, `areaOfPoly`, `centroidCal`, `centroidOfPoly`, `discretizeLineRev1`, `sameRealQ`, `sameQ` — moved
  unchanged from `demos/motion-planning/planner.js` and `demos/art-gallery/visibility.js` (v0.1.15), which import and
  re-export them; their unit, golden and parity tests are unchanged and green (§6.3). Unit tests:
  `tests/unit/polygon-core.test.js`.
- `main.js` (v0.1.20) is one `Manipulate({…})` call of `shared/manipulate.js`: the Manipulate variables
  `{stableOrMove, a, c, m, n, s, pts, step, dl, rl, ol}` as Mathematica control specs (the view setter; the hidden
  `step`, `dl`, `rl`, `ol`; `Row[{a, c, m, n}]` with the two checkboxes and two setter bars, test id `row-static`; the
  move slider `{{s, 1, "move"}, 1, dl, 1}` whose maximum is a function of the state, the last integer `dl`, D-MS-05;
  the ten locators `pts-1` … `pts-10` with the locator box and `Appearance -> None`), `body` = `evaluate` (with
  `Enabled -> c`: a locator moved while `c` is False is put back to the last evaluated position, so the picture and the
  state do not change), and `draw` returning the Graphics list of the original's `If` (the static view: sum, obstacle,
  robot, sorted normals; the move view: the robot moving around the sum) as `shared/graphics.js` data. The layer writes
  the body's `c`, `s` and the slider's range back into the controls after every evaluation. `after` hides the part of
  `Dynamic@If[…, Row[{a, c, m, n}], s]` not shown (both are built once, D-MS-06) and stops the animation outside the
  move view; choosing the move view opens the slider's ⊕ panel and starts its play button (F-MS-06). The notched
  arrowheads (D-MS-02) are `Polygon` data (`demos/common/plot-extras.js` `notchedArrowhead`; `shared/graphics.js`
  `Arrow` draws a plain triangle); the subscript labels α<sub>i</sub>, β<sub>j</sub> are drawn through the layer's `Raw`
  (`plot-extras.js` `tspanText`: subscript 0.35em down at 75 %, `data-key`), whose pixels `Subscript` data would change.
  The hook keeps `getState`, `view`, `moveLocator(n, p)`, `setState`, `stopAnimation`, `worldToClient`.
- `index.html`: page frame of the other ports (title, caption, controls, graphic, Details, credits, start-up notice).

### 6.2 State and evaluation order

One evaluation = the body in the original's order (§4.2). Moving a locator sets `pts[[i]]` to the pointer position
(limited to the locator box) and evaluates once per animation frame; the body may change `pts` (clamp), `c` and `s`,
and the Manipulate layer writes them back into the controls, as the front end shows the changed values. Changing `c` with the checkbox evaluates the
body, which sets `c = True` again in the static view (Q-MS-03, K-MS-09). Switching to the move view evaluates with the
current `s` (always 1 after the static view, Q-MS-08) and starts the animation; each animation step changes `s` and
evaluates. The opening state is the saved state (F-MS-17), which is the first evaluation of the initial settings.

### 6.3 Reuse: what is shared with motion-planning's `ConvexMinkowskiSumRev3` (exact comparison)

Both originals come from the same authors; the Minkowski parts were compared line by line
(motion-planning: `docs/original-source/motion-planning.txt` lines 17–54; this Demonstration: its Initialization and
the body lines `robotNormal = …` to `minkowskiPoints = …`).

| Original function / step | motion-planning (`planner.js`) | this Demonstration | Shareable? |
|---|---|---|---|
| `lineList` | `Partition[Join[list, {First[list]}], 2, 1]` | `Partition[Append[list, First[list]], 2, 1]` | yes, same result; `planner.js` `lineList` as is |
| `vector` | `{x2 - x1, y2 - y1}` with pattern `{{x2_,y2_},{x1_,y1_}}` | identical text | yes, `planner.js` `vector` |
| `areaOfPoly` | `0.5 *Total@(…)` | `1/2 *Total@(…)` (exact 1/2 × machine = × 0.5) | yes, same doubles; `planner.js` `areaOfPoly` |
| `centroidCal`, `centroidOfPoly` | `N[…, 3]` wrappers, `area != 0.0`, `N[Mean@poly, 3]` | no `N`, `area != 0`, `Mean@poly` | yes: `N[x, 3]` leaves machine reals unchanged and the tests decide alike; `planner.js` `centroidOfPoly` (its vector `Total` order is K-MS-08) |
| `discretizeLineRev1` | `d = N@EuclideanDistance[…]` | `d = EuclideanDistance[…]` (input is machine) | yes, `planner.js` `discretizeLineRev1` (its `Range` count rule reproduces dl = 1017, K-MS-04) |
| `normalVector` | `Normalize[{(-y2 + y1), x2 - x1}]` | identical text | text yes, JS no: `planner.js` normalises with 1/(dnrm2 `Norm`), art-gallery's `visibility.js` with 1/(correctly rounded length). This app uses `shared/mma-extra.js` `normalizeCR` (COMMON-DECISIONS §3; art-gallery's 2019/15.0.1 data fit it), lead K-MS-02; `normalVector` itself therefore stays in `minkowski.js` |
| merge (`ConvexMinkowskiSumRev3` vs the body) | `Block[…]`; entries `{angle, vec, flag 0/1, edge}`; `If[rl >= 2, -normalVector[#]]` (Null for < 2 vertices); `prev = Chop[prev - #[[2]]]`; `DeleteDuplicates@(…)`; returns the points only | entries `{angle, normal, vec, "α"/"β", edge}` in an Association with keys α<sub>i</sub>/β<sub>j</sub>; `{0, 0}` and angle `None` for < 2 vertices; `{Chop[prev = prev - #[[3]]], #[[4]]}`; no DeleteDuplicates; keeps the side of each vertex and the rotated keys | **no**: same sort predicate, same `SequencePosition` rule and the same `prev` formula, but four differences — (1) Chop of the running sum vs of the stored vertex (Q-MS-06); (2) degenerate polygons (`Null` vs `{0, 0}`/`None`, K-MS-01); (3) DeleteDuplicates only in motion-planning (Q-MS-07); (4) this Demonstration needs normals, sides and keys for its drawing. For rl, ol ≥ 2 and no running coordinate below 1e-10 in magnitude both give the same vertices in the same order before DeleteDuplicates |
| `convexHullGrahamScan`, `clockwiseQ`, `discretizePolyRev1` | — | new | new code (≈ 40 lines) |

So: five helpers (`lineList`, `vector`, `areaOfPoly`, `centroidOfPoly`, `discretizeLineRev1`, ≈ 30 lines of
`planner.js`) are reused unchanged; `normalVector` is the same text but uses `normalizeCR` here (K-MS-02); the merge
itself is written again for this app (`minkowskiWithSides`, ≈ 35 lines, following this Demonstration's own code). The
shared Mathematica semantics come from `shared/mma.js` (`sortMma`, `mLess`, `mEqual`, `chop`, `mean`, `total`),
`shared/mma-exact.js` (`arcTan`, `norm`) and `shared/mma-extra.js` (`normalizeCR`). DeleteDuplicates needs a 1-ulp
`SameQ` (art-gallery's `sameQ`; `demos/common/prm-core.js` has a different `sameReal`).
Decided in COMMON-DECISIONS §3 (approved with the drafts): the five helpers and `sameQ` move into
`demos/common/polygon-core.js` — CC BY-NC-SA 3.0, because they are derived from Demonstration code; its header credits
"Motion Planning for Robot Path around Obstacles", "Art Gallery Problem" and this Demonstration; owner: this app.
`planner.js` and `visibility.js` import them from there (or re-export them under their old names) with no behaviour
change; the move is gated on motion-planning's and art-gallery's unit, golden and compare tests.

### 6.4 Numerics

- Comparisons as in the original: `<`, `<=`, `==`, `!=` on reals are Mathematica's tolerant ones (`shared/mma.js`);
  `x != 0` with exact 0 decides exactly.
- `Sort[list, #1[[k]] < #2[[k]] &]` is `sortMma` (merge sort; a non-True comparison takes the right element, so tied
  elements end in reverse input order; confirmed by the motion-planning golden data and by snapshot 1 here, Q-MS-04).
  The predicate must return False — never JavaScript's coercion `null < x` — for the `None` angle (K-MS-01; harness
  run 2 shows that Mathematica treats `None < x` like True instead, P-MS-01).
- `ArcTan[x, y]` is the correctly rounded `arcTan` of `shared/mma-exact.js`; `Normalize` = `normalizeCR` (K-MS-02);
  `a/b` as `a·(1/b)` (`Total/(6 area)`, `step/d`; but `Mean` divides, K-MS-08); `EuclideanDistance` = `euclid`.
- No negative zero: `-normalVector[e]` of an axis-parallel robot edge gives a `-0.` component in JavaScript (e.g.
  {−1, −0} for a vertical edge); Mathematica has no signed zero, so the angle is π, never −π. The port's `arcTan`
  already adds `+ 0`; a unit test pins it, because with −π the sort changes pos (H-MS-11: 5 → 1, H-MS-13: 2 → 1 with
  another first vertex — measured with `ref/ms_model.py` before its own −0 fix).
- `DeleteDuplicates` = first occurrences under 1-ulp `SameQ` (K-MS-03).
- Exact values of the original are machine numbers everywhere (`pts` are reals), except `{0, 0}` normals (exact) and
  the exact `7 CirclePoints[4]` square, whose half side 7/√2 = 4.94974746830583267… is N[7/Sqrt[2]] = 7·(1/√2) =
  4.949747468305832 in 15.0.1 (harness run 2, K-MS-07; the port used the correctly rounded 4.949747468305833 before
  v0.1.17).
- `Total` of vectors is pairwise (⌈n/2⌉ split) and `Mean` = `Total/n` with a true division (`totalPairwise`,
  `meanMma` in `demos/common/polygon-core.js`, K-MS-08); scalar `Total` stays compensated (`total`; the records do not
  tell it from pairwise). The three-vector sums `rc + a − b` and `−oc + offset + p` follow the empirical rule of K-MS-11.

### 6.5 Plot range

The original sets no PlotRange, so Mathematica takes all primitives. Derived bound: the vertices lie in the locator
box (x ≤ 3.249, y 1.489 … 3.298) with robot x ≥ 1.34704 and obstacle x ≤ −1.34704; a centroid is at least a third of
the width from each side of a convex polygon, so a vertex is at most 2/3 of the polygon's width (≤ 1.902) or height
(≤ 1.809) from its centroid. The shifted sum therefore stays within x −0.238 … 4.834 and y −4.710 … 0.114, the move
view within |x| ≤ 3.80 and |y| ≤ 3.62, normal arrows and labels inside as well — all inside the square of half side
4.9497. The port therefore uses the square's range with the default padding (`createPlot` padding 0.02), and the
harness checks the plot range of the extreme scene (H-MS-22, K-MS-07).

### 6.6 Drawing

Thickness and point sizes as fractions of the plot width (`PointSize[0.01]`), `Thin` edges, Mathematica's named colours
(`shared/mma-colors.js`: LightGreen, LightRed, LightBlue, Blue, Red, Black), `Opacity[0.5]` faces. Arrows as a line
plus a filled notched head of fixed size (default `Arrowheads`, about 12 px long (0.0215 of the 558-px image width), D-MS-02). Labels: SVG text with a subscript `<tspan>`; `Text` positions are
centres. The ten locators carry no glyph (`Appearance -> None`); the drawn black/blue/red points are graphics.
Image: `ImageSize -> .9{620, 450}` = 558 × 405 px with the square plot range in the middle (white left and right, as in
the snapshots); the port widens the SVG's x range by 558/405 so that the picture has the same shape and the square the
same place. `PointSize[0.01]` is taken of the 405-px plot width; Greek label letters italic with a smaller roman index
(snapshot 1).

### 6.7 Building and deploying this app alone

Owner rule R-A (2026-10-17): this one app can be taken out of the repository and hosted anywhere.

- Command, in the repository folder: `npm run bundle -- minkowski-sum` → `dist/minkowski-sum/` (with `--zip` also
  `dist/minkowski-sum.zip`). `tools/bundle-app.mjs` follows every file the page loads (HTML, static imports,
  stylesheets) and copies exactly those, keeping the repository's folder layout, so no path is rewritten.
- Contents (generated with `npm run bundle -- --update-docs`; unit "bundle contents listed in DESIGN.md match the
  collector" keeps the table current):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/minkowski-sum/`) | 3 | `index.html`, `main.js`, `minkowski.js` |
| `shared/` | 14 | `graphics.js`, `manipulate.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `mma.js`, `random.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `ui-extra.js`, `ui-interval.js`, `ui.js` |
| `demos/common/` | 2 | `plot-extras.js`, `polygon-core.js` |
| added by the bundler | 7 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/minkowski-sum/DESIGN.md` |
<!-- bundle-contents:end -->

- Added files: `index.html` opens the app (the app's "All demos" link, `../../index.html`, leads back to it), a
  generated `README.md` (title, the credits of the footer, licence summary, how to serve and test), `.nojekyll`, this
  document, `LICENSE.md` and the `LICENSES/` texts of the SPDX identifiers found in the copied files.
- Requirements: any static web server; not `file://` (browsers block ES modules there); a current browser with ES
  modules (Firefox, Chromium, WebKit); no WebGL (SVG only).
- Checked by e2e "bundle: minkowski-sum runs from its own folder" (A-MS-07, `tests/e2e/bundle.spec.js`): the bundle
  folder alone is served, its root page must open the app, the app must start without page errors, every request must
  stay inside the folder and succeed, and every script and stylesheet of the bundle must be loaded.

## 7. Deviations (D), quirks kept (Q), known issues and leads (K) and notes (N)

| ID | Kind | Description |
|----|------|-------------|
| Q-MS-01 | quirk kept | `oldpts` is a Module local initialised to `{}` on every evaluation, so `If[pts != oldpts, …]` is always true: the clamp runs on every evaluation (the intended cache never works). Harmless; the port clamps on every evaluation. |
| Q-MS-02 | quirk kept | Only locators 1 … m and 6 … n + 5 are clamped and drawn; the unused ones stay where they are, invisible but active: all ten `Locator` controls belong to one LocatorPane, so a press nearest to an unused locator moves it with no visible effect. When m or n grows, the locator becomes a vertex (and is clamped then). Example: at the defaults locators 4 (1.348, 2.607) and 5 (1.71, 1.489) are unused. |
| Q-MS-03 | quirk kept | "enable locators" cannot be switched off in the static view: the body sets `c = True` whenever it draws the static view (`c = False` in the move view). Unchecking evaluates the body, which checks it again (to be confirmed by hand, K-MS-09). |
| Q-MS-04 | quirk kept | Ties in the three `Sort` calls (y of the Graham start point, polar angle, normal angle) keep Mathematica's order (reverse input order, `sortMma`). It decides the hull's first vertex and therefore the numbering α<sub>i</sub>/β<sub>j</sub>: at the defaults the obstacle's two lowest vertices tie at y = 1.489 and the hull starts at (−2.885, 1.489), so after `RotateLeft[…, -1]` β<sub>1</sub> is the lower left edge and β<sub>2</sub> the bottom edge — as in snapshot 1. With robot edges 5 the robot's tie gives the same numbering (α<sub>2</sub> = bottom). |
| Q-MS-05 | quirk kept | Degenerate hulls: three collinear points pass the Graham loop unchanged (`Break[]` at i = n) and form a zero-area "polygon"; its area is exactly 0 for vertical or horizontal lines (the only collinear cases the clamp and the locator box produce easily), so the centroid falls back to the mean. Two distinct points form a segment with two opposite edges; one point gives one zero edge `{p, p}` with normal `{0, 0}` (K-MS-01). |
| Q-MS-06 | quirk kept | `Chop[prev = prev - v]` stores the chopped vertex but keeps the unchopped running sum (motion-planning chops the running sum). Differs only when a coordinate of the running sum falls below 1e-10 in magnitude. |
| Q-MS-07 | quirk kept | The sum keeps a vertex between parallel robot and obstacle edges (collinear vertices) and has no DeleteDuplicates; the side lists then contain consecutive collinear segments of both colours. |
| Q-MS-08 | quirk kept | The static view sets `s = 1`, so the move view always starts at the first boundary point. |
| Q-MS-09 | quirk kept | Label offsets as written: polygon labels at `Mean − 0.2·normal` (robot outside, obstacle inside) or `+0.65·normal` when the polygon has two vertices; sum labels at `Mean − 0.25·normalVector` (inside) or `+0.7` for robot labels when `rl == 2 && (ol == 1 \|\| ol == 2)` and for obstacle labels when `(rl == 1 \|\| rl == 2) && ol == 2` — asymmetric conditions kept. |
| Q-MS-10 | quirk kept | Blue/red points are drawn at every robot/obstacle locator in use, including points inside the hull, under the black hull vertices. |
| Q-MS-11 | quirk kept | "number of robot edges" really sets the number of robot vertices (locators) used; the hull can have fewer edges (interior or coincident points). |
| D-MS-01 | deviation | What counts as one update differs: Mathematica's front end decides how often it re-evaluates during a drag or an animation; the port evaluates once per animation frame with the latest pointer position and once per key press. The body is idempotent apart from the clamp. |
| D-MS-02 | deviation | Sizes approximate Mathematica's: `Thin` lines, `PointSize[0.01]`, default arrowheads (drawn as notched triangles of a fixed size, about 12 px long (0.0215 of the 558-px image width), read off snapshots 1, 2 and 4), default text font and size (12 px), subscripts as SVG `<tspan>`. |
| D-MS-03 | deviation | The move slider uses the shared slider with its ⊕ panel (step back, play/pause, step forward) shown open; Mathematica's open panel also has faster, slower and direction buttons (snapshots 3 and 5), which the shared control does not have. Animation speed: the port sweeps 1 … dl in 6 s (shared default); the original's speed is not known (K-MS-05). The value field shows the integer s. |
| D-MS-04 | deviation | Locator picking follows the shared LocatorPane model (`pickAnywhere`): a press within 12 CSS px grabs the nearest locator in place, a press elsewhere makes the nearest of the ten (used or not, Q-MS-02) jump there; ties → lower locator number. The 12 px no-jump zone is the port's choice (as D-CP-06). |
| D-MS-06 | deviation | The control area `Dynamic@If[stableOrMove != "move around Minkowski", Row[{a, c, m, n}], s]` is re-created by the front end each time the view changes; the port builds both parts once and hides the part not shown (so the UI inventory sees both, §5). Entering the move view opens the slider's panel and starts its animation, as `AnimationRunning -> True` with `Appearance -> "Open"` does when the slider appears (K-MS-05); leaving it stops the animation. |
| D-MS-05 | deviation (provisional) | Robot or obstacle with one vertex (m = 1 or n = 1): if the original fails there (K-MS-01), the port draws what does not depend on the sum (hulls, points, labels, sorted normals) and leaves out the sum and the move view's robot, until the harness shows what the original draws. Harness run 2: the original does not fail — it draws a sum (K-MS-01); keeping the port's behaviour until the owner decides P-MS-01. |
| K-MS-01 | lead (resolved, P-MS-01) | `Sort` with the angle `None` (one-vertex robot or obstacle): `None < x` stays unevaluated, i.e. not True. Under the `sortMma` model None ends last when it comes from the robot (input first) and first when it comes from the obstacle (input last), so `SequencePosition[…, {"α", "β"}]` is empty for m = 1 and for n = 1 and `[[1, 1]]` fails (Part::partw), and the sum is not drawn. If Mathematica treats a non-Boolean result as "equal, keep order", m = 1 gives the obstacle itself as the sum (point robot) and n = 1 the reflected robot. The setters offer 1, so the authors may have seen it work. Harness H-MS-06, H-MS-07, H-MS-08, H-MS-24 decide; manual M-MS-08. **Resolved by harness run 2 (15.0.1): Mathematica draws a sum.** `Sort` treats the unevaluated `None < x` (and `None < None`) like True: the None entry keeps its input place — first when it is the robot's (H-MS-06 m = 1: α<sub>1</sub>, β<sub>1</sub> … β<sub>5</sub>, pos 1, dl 592, a 6-vertex sum = the obstacle), last when it is the obstacle's (H-MS-07 n = 1: α<sub>3</sub>, α<sub>1</sub>, α<sub>2</sub>, β<sub>1</sub>, pos 3; H-MS-24: α<sub>2</sub>, α<sub>1</sub>, β<sub>1</sub>, pos 2); H-MS-08 (m = n = 1): α<sub>1</sub>, β<sub>1</sub>, pos 1, dl 3. No `Part::partw`. The model "sortMma with a predicate that is True whenever an angle is None" reproduces all four recorded orders (golden). The port still draws no sum there (D-MS-05); P-MS-01 proposes the original's behaviour. |
| K-MS-02 | lead (resolved) | `Normalize`: this app uses `normalizeCR` (v·(1/correctly rounded length), `shared/mma-extra.js`), the model that fits art-gallery's 2019 snapshots and 15.0.1 state (D-AG-08); `planner.js` and the RRT 2018 data fit 1/(dnrm2 `Norm`) (a version difference, COMMON-DECISIONS §3). No golden data of this app holds normals, so the choice is provisional. Only last bits change, which matters for ties of normal angles (parallel edges, H-MS-13). Harness H-MS-01 and H-MS-25 capture `robotNormal` and `obstacleNormal` bit for bit and decide. **Resolved by harness run 2 (15.0.1):** `normalizeCR` reproduces all 29 recorded robot and obstacle normals bit for bit (H-MS-01, H-MS-25 and the other scenarios that capture them); 1/dnrm2 only 25, the 4 discriminating ones all fit CR. |
| K-MS-03 | lead (resolved) | `DeleteDuplicates` uses `SameQ` by default; art-gallery confirmed the 1-ulp tolerance of `SameQ`, `MatchQ` and `Position` (K-AG-08). Not yet confirmed for `DeleteDuplicates` on real pairs (H-MS-15). **Resolved by harness run 2:** H-MS-15 (pts[[2]] = 2.8850000000000002, 1 ulp from pts[[1]]) is reproduced bit for bit with `DeleteDuplicates` dropping the 1-ulp copy (`sameQ`). |
| K-MS-04 | lead (resolved) | Length of `Range[0, 1, step/d]` for reals: the motion-planning rule `Floor[1/h + 1e-12] + 1` reproduces the saved dl = 1017 (edge counts 118, 118, 191, 118, 118, 117, 118, 118 plus the closing point); an edge whose length is an exact multiple of 0.01 (1/h = 120.0 for d = 1.2000000000000002) tests the edge of the rule (H-MS-23). **Resolved by harness run 2:** dl 1017 (H-MS-01) and the discretised boundary of H-MS-23 (an edge of length 1.2000000000000002) are reproduced bit for bit by the `Floor[1/h + 1e-12] + 1` rule. |
| K-MS-05 | lead | Animation of `AnimationRunning -> True` with `Appearance -> "Open"`: lap time, whether it loops or bounces, and whether it restarts at s = 1 each time the move view appears. Manual M-MS-06. |
| K-MS-06 | lead | Whether a press near an unused (undrawn) locator moves it in the original (Q-MS-02). Manual M-MS-07. |
| K-MS-07 | lead (resolved) | The plot range of the original: the derivation of §6.5 says the square always bounds the picture; the harness records `PlotRange` of the extreme scene (H-MS-22). **Resolved by harness run 2:** `AbsoluteOptions[g, PlotRange]` (kernel, H-MS-01 and the extreme scene H-MS-22) is {{−4.949747468305832, 4.949747468305832}, {−4.949747468305832, 4.949747468305832}} — the square; the stored option is `PlotRange -> All`. The half side is N[7/Sqrt[2]] = 4.949747468305832 (also the `"n"` of the recorded `%g` square), one ulp below the correctly rounded value the port used before v0.1.17 (§6.4). |
| K-MS-08 | lead (resolved) | `Total` of the list of `centroidCal` 2-vectors: `planner.js` adds left to right; scalars use the compensated `total`. Last bits of rc and oc (H-MS-01 captures them bit for bit). **Resolved by harness run 2 (15.0.1):** the vector `Total` is pairwise, split at ⌈n/2⌉ (3 rows: (x1 + x2) + x3; 4: (x1 + x2) + (x3 + x4); 5: ((x1 + x2) + x3) + (x4 + x5)) — all 12 recorded centroids `rc`/`oc` bit for bit (left to right: 7 of 9 non-degenerate, compensated: 4); and `Mean` divides (`Total/n`; H-MS-11, H-MS-12: v·(1/3) is 1 ulp off). `demos/common/polygon-core.js` `totalPairwise`, `meanMma` (v0.1.17). |
| K-MS-09 | lead | Front-end behaviour of the "enable locators" checkbox (Q-MS-03): does it flip back at once, or stay unchecked until the next evaluation? The harness only shows that the body sets `c = True` (H-MS-20); manual M-MS-04. **Harness run 2:** H-MS-20 confirms the body part (one evaluation with c = False in the static view gives c = True); the front-end behaviour stays M-MS-04. |
| K-MS-10 | lead | `{EdgeForm[Blue], Opacity[0.5], LightBlue, Polygon}` (move view robot): whether the edge is drawn with the face opacity (as K-CP-08). The port draws the edge opaque. |
| K-MS-11 | lead (open) | Order of the three-vector sums `prev = rc + a − b` and `−oc + offset + p` (harness run 2, 15.0.1). The recorded `minkowskiPoints` fall into two classes: (a − b) + rc when the robot's point list `robopts` has at most 3 points, (rc + a) − b when it has 4 or 5 (also when the hull then has only 3 vertices, H-MS-16) — 14 of the 15 recorded sums; H-MS-22 (3 points, written order) is the exception. `−oc + offset + p` adds in written order everywhere except H-MS-12 (collinear robot and obstacle, `oc` from `Mean`), where (offset + p) − oc or (−oc + p) + offset fits. Neither sorting by value nor an exactly rounded sum explains the classes; a guess is that Plus adds packed-array operands first and that the hull of ≥ 4 points is packed. The port implements the robopts rule for `prev` and written order for the shifted sum (v0.1.17); the golden tests list the remaining last-bit differences of H-MS-12 (12 coordinates) and H-MS-22 (8) exactly. A harness probe (`Developer\`PackedArrayQ` of `robot`, `rc`, `oc` and the two edge points) would settle it. |
| N-MS-01 | note | Snapshots 2 and 4 show the labels as "Global\`α<sub>1</sub>": the label symbols are `$CellContext\`α`; the context prefix appears when a snapshot is rendered in another context. Snapshot 1 shows α<sub>1</sub>; the port shows α<sub>1</sub>. |
| N-MS-02 | note | `reflex` is defined in an Initialization cell but used nowhere and is not part of the stored `Initialization :>` of the Manipulate; not ported. |
| N-MS-03 | note | The sum built here is the configuration-space obstacle O ⊕ (−(R − rc)) for the robot's centroid as reference point; robot edges enter reversed ("added in the clockwise direction", Details). |
| N-MS-04 | note | The default robot locators 1–5 and obstacle locators 6–10 mirror each other except locator 4 (1.348) and locator 7 (−1.347): 1.348 passes the clamp, −1.347 is clamped to −1.34704 on the first evaluation, which is why the saved state holds −1.34704. |
| N-MS-05 | note | `step`, `dl`, `rl`, `ol` are Manipulate variables with `ControlType -> None`; `dl` sets the move slider's maximum through `Dynamic`. |
| N-MS-06 | note | The snapshot cells store their Settings (golden data, COMMON-DECISIONS §1): snapshot 1 = the live state; snapshots 2 (static, normals on) and 3 (move view, s 150, c False) share dragged vertices with m 5, n 3 (rl 5, ol 3, dl 878; locator 5 holds x 1.8849999999999998 from a drag, locators 3 and 4 sit on the clamp line 1.34704); snapshots 4 (static, normals on) and 5 (move view, s 166, c False) use the default vertices with m 2, n 4 (rl 2, ol 4, dl 780). `ref/ms_model.py` reproduces dl 878 and 780, and the robot centroids it computes for s 150 and s 166 agree with pictures 3 and 5. |

## 8. Proposed changes

| ID | Status | Requested by / date | Change | Reason | Acceptance criteria |
|----|--------|---------------------|--------|--------|---------------------|
| P-MS-01 | proposed 2026-10-18 (awaiting the owner) | harness run 2 / 2026-10-18 | one-vertex robot or obstacle (m = 1 or n = 1): sort the normals with a predicate that is True whenever an angle is None (the entry keeps its input place), find the α–β pair and draw the sum and the move view as the original; withdraw D-MS-05 | K-MS-01: the original draws a sum there (H-MS-06, H-MS-07, H-MS-08, H-MS-24); the port draws none | golden "minkowski-sum: harness H-MS-06", "H-MS-07", "H-MS-08", "H-MS-24" compare every capture bit for bit; unit "single-point robot: None never compares less, the sort model finds no alpha-beta pair (regression pin)" replaced; M-MS-08 updated |

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.15 | 2026-10-17 | first implementation, from the design draft approved by the owner on 2026-10-17 (DEC-17; draft of 2026-10-12 with COMMON-DECISIONS §6 and owner rules R-A/R-B/R-C applied). `demos/common/polygon-core.js` created (owned by this app; helpers moved from motion-planning and art-gallery without behaviour change). Changes against the draft: harness references written as the golden tests `minkowski-sum: harness H-MS-nn` (the design-docs test accepts only test titles, checklist items, inventory, compare and review); D-MS-06 added (both control sets in the page, one hidden); D-MS-02 and §6.6 state the arrowhead and image sizes used; A-MS-03 adds `stopAnimation`. |
| 2 | v0.1.16 | 2026-10-18 | version number only (batch B release); no change to this app |
| 3 | v0.1.17 | 2026-10-18 | harness run 2 (Mathematica 15.0.1) evaluated: vector `Total` pairwise and `Mean` as a division (`demos/common/polygon-core.js` `totalPairwise`, `meanMma`, used by `centroidOfPoly` and this app's `Mean`s; K-MS-08), the three-vector `prev` sum by the empirical rule of K-MS-11, frame half side N[7/Sqrt[2]] = 4.949747468305832 (K-MS-07); K-MS-01 (→ P-MS-01), K-MS-02, K-MS-03, K-MS-04, K-MS-07, K-MS-08 resolved, K-MS-09 with evidence, K-MS-11 new (open). Golden harness tests: `%plotRange` read as one record per graphic, the recorded differences of P-MS-01 and K-MS-11 asserted exactly |
| 4 | v0.1.18 | 2026-10-18 | version number only (harness run 3 accepted for manipulability-ellipsoid); no change to this app |
| 5 | v0.1.19 | 2026-10-21 | version number only (shared Manipulate layer added, four apps migrated to it); no change to this app |
| 6 | v0.1.20 | 2026-10-21 | `main.js` rewritten on the shared Manipulate layer (`shared/manipulate.js`, `shared/graphics.js`): control specs in Mathematica's form, the picture as Graphics data; no change to behaviour or picture (all unit, golden and browser tests unchanged and passing; screenshots and Manipulate state identical to v0.1.19 at sample settings) |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|-------------|---------|-------------|---------|
| I-MS-01 | Let "enable locators" really switch the locators off in the static view | the checkbox does what its label says | differs from the original's behaviour | Q-MS-03 |
| I-MS-02 | Deactivate (or show) the unused locators | presses no longer move invisible vertices | differs from the original | Q-MS-02 |
| I-MS-03 | Handle one-vertex robots and obstacles (point robot: the sum is the obstacle) | m = 1 / n = 1 always give a picture | only relevant if the original fails there | K-MS-01, D-MS-05 |
| I-MS-04 | Merge collinear vertices of the sum and label merged edges with both names | cleaner sum for parallel edges | changes the vertex list and the animation positions | Q-MS-07 |
| I-MS-05 | Speed and direction controls for the move animation | matches the open Manipulate panel | more controls; needs design entries | D-MS-03 |

## 11. Errors in the original (conceptual and mathematical)

Owner rule R-C (2026-10-17). Checked: `convexHullGrahamScan` (counter-clockwise hull; ties and collinear points as
Q-MS-04/Q-MS-05), `normalVector` (right-hand normal of the edge, i.e. outward for a counter-clockwise hull) and `vector`
(the reversed edge P − Q, so that `prev - vector` walks obstacle edges forward and robot edges backward, as the Details
say), the merge order by normal angle (obstacle outward normals, robot inward normals = outward normals of −R: correct),
the start vertex `rc + (obstacle vertex) − (robot vertex)`, `areaOfPoly`/`centroidOfPoly` (the shoelace formulas of the
cited reference: correct), `discretizePolyRev1` and the move view. Independent check: for the default polygons and for
robot edges 5 the vertex set of the original's sum (`ref/ms_model.py`) equals the convex hull of all o − (r − rc), o ∈
obstacle, r ∈ robot (Andrew's monotone chain, a separate script) — the sum is the correct configuration-space obstacle.

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|------|-----------------------|--------------------------|--------------------|-------------------------|--------|
| E-MS-01 | conceptual | Check box `Control@{{c, True, "enable locators"}, {True, False}}` with `Enabled -> c` on the locators, and in the body's static branch `c = True; (*Enable the Locators*)` | The check box cannot switch the locators off: whenever the static view is drawn the body sets `c = True` again, so the control does not do what its label says (in the move view the body sets `c = False`, and the check box is not shown there). | Keeps it: the check box re-checks itself on the next evaluation (Q-MS-03, F-MS-03). | Honouring the check box (I-MS-01) changes only that control's behaviour: e2e "minkowski-sum: unchecking enable locators in the static view is undone by the next evaluation", unit "static view sets c True and s 1, move view sets c False" and H-MS-20 change; no golden geometry changes (snapshots 3 and 5 store c False from the move view). | open |
| E-MS-02 | conceptual | Setters "number of robot edges" / "number of obstacle edges" offer 1; for one vertex the normal is `{0, 0}` and its angle `None` in `Sort[…, #1[[1]] < #2[[1]] &]`, then `pos = SequencePosition[sortedVectors[[;;, 4]], {"Alpha", "Beta"}][[1, 1]]` | A one-vertex robot (a point) has an empty edge set: its sum with the obstacle is the obstacle itself (a one-vertex obstacle gives the reflected robot). The code instead builds one zero "edge" whose angle `None` does not compare with numbers; under the port's model of Sort the α–β pair is then missing and `[[1, 1]]` fails (Part::partw), so no sum is drawn for a choice the setters offer. Whether Mathematica really fails here is lead K-MS-01. | Draws everything except the sum and the moving robot when the model finds no pair (D-MS-05, provisional). | Handling the degenerate cases (I-MS-03) changes only m = 1 or n = 1: unit "single-point robot: None never compares less, the sort model finds no alpha-beta pair (regression pin)", H-MS-06, H-MS-07, H-MS-08, H-MS-24 and M-MS-08 change; no saved state uses m or n = 1. | open |
| E-MS-03 | text | Title "Minkowski Sum of Convex Robot and Obstacle"; caption "The Minkowski sum of a convex obstacle and a robot delineates the region where an obstacle and a robot might collide." | The set drawn (and the one that delineates collisions) is the Minkowski sum of the obstacle and the robot **reflected** through its reference point, O ⊕ (−(R − rc)) (N-MS-03; the Details' "robot edges are added in the clockwise direction" is exactly this reflection). The plain Minkowski sum O ⊕ R of an asymmetric robot is a different polygon (e.g. the default triangle) and does not delineate the collision region. Robotics texts (LaValle [1]) call the drawn set the configuration-space obstacle or Minkowski difference. | Shows title and caption as in the original (F-MS-22). | Text only ("Minkowski sum of the obstacle and the reflected robot" or "configuration-space obstacle"); no value or test changes. | open |
