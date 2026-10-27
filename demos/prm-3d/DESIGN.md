# Design document: Probabilistic Roadmap Method in 3D

| | |
|---|---|
| Code version: | 0.1.26 |
| Document revision | 1 (2026-10-18) — first implementation |
| Status | describes the app as implemented; changes go through Proposed changes (§8) |
| Original | Wolfram Demonstrations Project, "Probabilistic Roadmap Method in 3D", contributed by Aaron T. Becker and Yitong Lu, published 2020-02-26 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/ProbabilisticRoadmapMethodIn3D/>. Readable source: [`docs/original-source/prm-3d.txt`](../../docs/original-source/prm-3d.txt); snapshots: `docs/original-snapshots/prm-3d-1.png` … `-5.png` (files 6 and 7 of the extraction are 96 × 100 placeholder icons); golden data: `tests/golden/prm-3d.original-states.json` (written with `tools/extract_state.py --snapshots` from the raw notebook, COMMON-DECISIONS §1: `states[0]` = the live state, `snapshots[1…5]` = the five snapshot cells' Settings — complete states with samples, roadmaps and, in 3 and 4, the RegionPlot3D volumes; raw notebook lines 10908, 12996, 16776, 21566, 24913 — and `specs` = the initial settings, equal to the live state up to the option form of `freeConfigSpacea/b`; Greek names and exact 1/2 kept, N-P3-01) |
| Port files | app: `model.js` (the Initialization functions under their original names, the stored Initialization data and saved roadmap, one evaluation of the Manipulate body returning both pictures as Graphics3D data; pure), `cspace3d.js` (RegionPlot3D replacement: margin field of detCollision on a grid, meshed by `shared/region-plot3d.js`, cache; pure), `view3d.js` (the two three.js pictures as renderers of the Manipulate layer, `PrmViews`, with their Dynamic view points), `main.js` (the Manipulate on `shared/manipulate.js`: the four Rows of controls, the body `evaluate`, the automation hook; v0.1.21), `index.html`; common (CC BY-NC-SA): [`demos/common/prm-core.js`](../../demos/common/prm-core.js) generalised to n dimensions by this app (owner prm-3d, COMMON-DECISIONS §3; the 2D unit and golden replays of prm and prm-robot-arm guard it, unchanged), `shared/graphics3d.js` (data model: Cylinder, Cuboid, Sphere, Point, Line, GeometricTransformation, flatten) and `shared/graphics3d-three.js` (`addPrims`, `disposeGroup`, `fitViewer`) of the DH family (owner dh-parameters, used unchanged); shared (MIT): `shared/manipulate.js` (controls, state, ControlActive, frame throttling, Initial settings, random source, hook), `shared/region-plot3d.js` (marching tetrahedra with face caps and boundary lines; v0.1.21), `shared/ui.js` (θ, radius and progress sliders with `steps: 'mma'`, `labeled`/`plus` options, `slider2D`), `shared/ui-extra.js` (buttons, check box, vertical sliders, rows), `shared/random.js`, `shared/mma.js`, `shared/mma-extra.js`, `shared/mma-colors.js`, `shared/mma-lighting.js`, `shared/three-helpers.js` |
| Role in the project | further demonstration (batch B) |

## 1. Purpose and background

The probabilistic roadmap method (PRM, Kavraki et al. 1996) for a three-link robot arm with three revolute joints among
two spheres (blue and yellow) that the user can move. Left: the robot workspace in 3D with the start and goal
configurations (translucent) and the robot at the current "progress" position. Right: the robot's 3D phase space
(θ1, θ2, θ3 on a 3-torus [0, 2π)³) with the sampled configurations (green free, red in collision), the roadmap, the
planned path and, on demand, the configuration-space obstacles as translucent volumes. It is the 3D sibling of the two
2D PRM ports (prm, prm-robot-arm): the Initialization functions are the same code extended by one coordinate, the body
has the same structure, and the opening state is a stored roadmap (100 samples, 180 edges) that gives a path at once.

## 2. Scope

In scope: the original's controls (θ1–θ3 sliders, two 2D sliders and two vertical sliders for the spheres, "show
configuration space obstacles", "add 100 vertices", "restart", "new goal", radius, progress), collision detection,
local planner, roadmap construction (incremental and full), query, graph search, path following, both 3D pictures with
their persistent view points, the C-obstacle volumes, the labels, and the original's quirks.
Out of scope (would need a design entry first): a goal control other than "new goal", more links or obstacles, exact
C-obstacle surfaces, animation of "progress", other planners.

## 3. Users and use cases

| ID | User | Use case |
|----|------|----------|
| UC-P3-01 | student | relate robot poses in the workspace to points of the 3D phase space and its obstacle volumes |
| UC-P3-02 | student | build a roadmap (add samples, change the radius), plan a path and follow it with "progress" |
| UC-P3-03 | student | move the spheres and see the samples re-classified and the roadmap rebuilt |
| UC-P3-04 | tester | compare the port with the saved state (a complete roadmap), the snapshots and the Mathematica harness |

## 4. Features

### 4.1 Controls

| ID | Feature | Reason | Since | Verified by |
|----|---------|--------|-------|-------------|
| F-P3-01 | Start sliders `Control@{{θ1, .25, "θ₁"}, -.1, 6.3, 0.01, ImageSize -> Small}` and the same for θ2, θ3, in one Row with `Spacer[10]`: slider with ⊕ animation panel, no value field, default 0.25; a value below 0 or above 2π is shifted by 2π and written back (Q-P3-01) | the start configuration qs (UC-P3-01) | v0.1.16 | e2e "has the controls of the original with their defaults"; e2e "dragging the theta1 slider with the mouse turns the robot and moves the start point"; e2e "a theta slider pushed to its end wraps by 2π (original quirk)"; unit "theta values below 0 or above 2π are shifted by 2π and written back: -0.1 gives 6.183185307179587, 6.3 gives 0.01681469282041359"; harness "H-P3-07" |
| F-P3-02 | Blue sphere: `Control[{{Obstaxy, {1, 0}, blue_xy}, 3{-1,-1}, {1,1}}]` (2D slider over {−3, −3} … {1, 1}) and `Control[{{Obstaz, 0, blue_z}, 0, 2, ControlType -> VerticalSlider, ImageSize -> {Automatic, 80}}]` | move obstacle a (UC-P3-03) | v0.1.16 | e2e "dragging the blue_xy pad moves the blue sphere and re-classifies the samples"; e2e "has the controls of the original with their defaults"; unit "the sphere pads span {-3, -3} to {1, 1} (original quirk)" |
| F-P3-03 | Yellow sphere: `Obstbxy` default {0, −1} (same range), `Obstbz` default 1/2 (exact, also in the saved state), vertical slider 0 … 2; both pads span {−3, −3} … {1, 1} (Q-P3-13) | move obstacle b | v0.1.16 | e2e "has the controls of the original with their defaults"; unit "moving an obstacle re-classifies every sample and sets rold = -1" |
| F-P3-04 | Check box "show configuration\n space obstacles" (default False): the C-obstacle volumes of the blue and the yellow sphere in the phase space (F-P3-22, F-P3-25) | see why samples are red (UC-P3-01) | v0.1.16 | e2e "show configuration space obstacles draws the blue and yellow volumes"; M-P3-05 |
| F-P3-05 | Button "add 100 vertices" (`addPoints = True`): 100 random configurations, classified and connected incrementally (F-P3-15) | build the roadmap (UC-P3-02) | v0.1.16 | e2e "add 100 vertices with a seed gives reproducible samples (port addition)"; unit "add 100 vertices consumes RandomReal[{0, 2π}, {100, 3}] row by row and classifies with detCollision" |
| F-P3-06 | Button "restart" (`restart = True`): removes all samples, edges and the adjacency; pObsOlda/b take this evaluation's sphere positions; rold, radius, goal and the view points are kept | start over | v0.1.16 | e2e "restart removes the samples and the roadmap"; unit "restart clears pts, goodPts, badPts, edgesNN and edgesNNadj but keeps rold and qf" |
| F-P3-07 | Button "new goal" (`newgoal = True`): `qf = RandomReal[{0, 2π}, 3]`; the goal has no other control (Q-P3-09) | a new query | v0.1.16 | e2e "new goal moves the goal (seeded)"; unit "new goal consumes RandomReal[{0, 2π}, 3] before any sampling of the same evaluation" |
| F-P3-08 | "radius" slider `Control[{{r, 1.5, "radius"}, 0, 12, 0.01, Appearance -> "Labeled"}]` in the button row: value field and ⊕ panel; a change rebuilds the roadmap when more than 5 free samples exist | roadmap density (UC-P3-02) | v0.1.16 | e2e "the radius slider rebuilds the roadmap: 1.19 gives No path possible and 1.86 a path"; unit "with the first sample set, radius 1.19 gives 101 edges and no path"; harness "H-P3-03"; harness "H-P3-04" |
| F-P3-09 | "progress" slider `{{progress, 0, "progress"}, 0, 1, 0.01, ControlType -> Slider, ImageSize -> 500}`: plain slider, no ⊕, no value field (snapshots) | follow the path (UC-P3-02) | v0.1.16 | e2e "the progress slider moves the robot along the path"; unit "progress 0.5 on the saved path puts the robot on segment 4 at (2.0865392601981254, 5.1017467996397725, 2.794532688302591)" |
| F-P3-10 | Layout `ControlPlacement -> Top`: row θ1 θ2 θ3; row blue_xy, blue_z, yellow_xy, yellow_z, check box (`Spacer[20]`); row of the three buttons and radius (`Spacer[10]`); progress; then the two pictures side by side (`Row[{…, Spacer[10], …}]`) | the original's layout (snapshots) | v0.1.16 | inventory; M-P3-02 |

### 4.2 Model (`model.js`, `demos/common/prm-core.js`)

| ID | Feature | Reason | Since | Verified by |
|----|---------|--------|-------|-------------|
| F-P3-11 | `jointAngle2Origin[{θ1, θ2, θ3}]`: o1 = {Cos θ1, Sin θ1, 1}; o2 = o1 + {Cos θ1 Cos θ2, Sin θ1 Cos θ2, Sin θ2}; o3 = o2 + {Cos θ1 Cos θ2 Cos θ3 + Sin θ1 Sin θ3, Sin θ1 Cos θ2 Cos θ3 − Cos θ1 Sin θ3, Cos θ3 Sin θ2} | forward kinematics for the collision test | v0.1.16 | unit "jointAngle2Origin: zero gives (1,0,1), (2,0,1), (3,0,1), θ2 = π/2 lifts links 2 and 3, θ3 = π/2 turns link 3 to -y"; unit "drawRobot geometry (rotations about z through (0,0,1), -y through (1,0,1), -z through (2,0,1)) matches jointAngle2Origin" |
| F-P3-12 | `detCollision[{o1, o2, o3}, pObs3, obsRad, widtha]` = link 1 ({0,0,1}→o1), link 2 (o1→o2), link 3 (o2→o3) closer than obsRad + widtha = 0.55 to a sphere centre, or the base segment {0,0,0}→{0,0,1 + 2 widtha} closer than obsRad + 2 widtha = 0.6 (`pointsegdis2`, tolerant Less, Or in this order) | collision test of the PRM | v0.1.16 | unit "detCollision: the start (0.25, 0.25, 0.25) is free (link distances 1.0301, 1.0306, 1.6178, base 1.0)"; unit "detCollision: θ = (0, 3π/2, 0) puts link 2 through the blue centre"; unit "a sphere at (0, 0, 1) makes every configuration collide (base test)"; golden "prm 3d: detCollision reproduces the 80 free and 20 colliding saved samples in order"; golden "prm 3d: the second sample set of snapshots 2 to 5 is classified 86 free and 14 colliding in order"; harness "H-P3-12"; harness "H-P3-13"; harness "H-P3-14"; harness "H-P3-15" |
| F-P3-13 | Local planner `pathOKTrobot[ps, pe, pObs3, obsRad, widtha, delta]`, delta = 0.1: the shorter way round the 3-torus per coordinate (`If[d < 2π − d, 0, ±2π]`, tolerant), `dist = Sqrt[dx² + dy² + dz²]`; dist ≤ delta → True untested; else `n = Ceiling[dist/delta]` interior samples `ps + {dx, dy, dz} i/(n+1)`, each coordinate wrapped once by `wrapto0to2π[x] := If[x > 2π, x − 2π, If[x < 0, x + 2π, x]]`; end points never tested (Q-P3-05) | the PRM's local planner | v0.1.16 | unit "pathOKTrobot accepts a segment not longer than delta without any test (original quirk)"; unit "pathOKTrobot tests n = Ceiling[dist/delta] interior samples ps + d i/(n+1), never the end points"; unit "pathOKTrobot goes the short way round the 3-torus and wraps each sample once"; unit "wrapto0to2π and the 2D wrap give the same result on (-2π, 4π)" |
| F-P3-14 | `toroidDist` = Sqrt of the sum of the three per-coordinate `Min[d², (2π − Abs[d])²]`; `toroidLine` (two pieces in color1 leaving the cube when any coordinate is shorter round the torus, else one piece in color2); `toroidLines`; `toroidPt` (point at a fraction of the shortest edge, wrapped once per coordinate; zero test on the absolute differences, N-P3-03) | distances, edge drawing and path points on the 3-torus | v0.1.16 | unit "toroidDist 3D: (0,0,0)-(6,0,0) is 0.28318530717958623, (0.1,0.1,0.1)-(6.2,6.2,6.2) is 0.31728625923515424"; unit "toroidLine 3D: a wrapped edge gives two pieces leaving the cube in color1, an inner edge one piece in color2"; unit "toroidPt 3D: fraction along the shortest edge, wrapped once per coordinate" |
| F-P3-15 | `connectPoints` (text identical to the 2D robot-arm version): for i from point2start, up to 10 nearest other free samples within r (`Nearest[Drop[goodPts, {i}], ps, {10, r}, DistanceFunction -> toroidDist]`, input order on ties, inclusive radius), edge when not yet adjacent and `pathOKTrobot[ps, pe]`; 1-based adjacency; incremental after "add 100 vertices", full rebuild when `r != rold && Length[goodPts] > 5`; `If[r > 0, …]` | the roadmap (UC-P3-02) | v0.1.16 | golden "prm 3d: connectPoints with r = 1.5 on the 80 saved free samples gives the 180 saved edges and the adjacency, in order"; golden "prm 3d: evaluating the code's initial values (rold = -1) rebuilds the 180 saved edges, not the 181 of edgesNNI"; unit "with the first sample set, radius 1.19 gives 101 edges and no path"; unit "radius 0 gives no edges and empty adjacency lists"; harness "H-P3-18"; harness "H-P3-19"; harness "H-P3-02" |
| F-P3-16 | Query (as both 2D PRMs): direct path `path = -2` when `toroidDist[qs, qf] < r && pathOKTrobot[qs, qf]`; else qs (if free) and qf (if free) each try only their single nearest free sample (`Do[…, Break[]]`), then `myAstar` (Dijkstra in effect, Q-PR-01); the result is the Module local `path`, the Manipulate variable `path` stays −1 (Q-P3-02) | plan the motion | v0.1.16 | unit "the saved roadmap gives path 71, 78, 72, 64, 70, 34 with qsn (0.43, 5.91, 0.47) and qfn (3.89, 5.48, 2.37)"; unit "a direct path is accepted even when the start is in collision (original quirk)"; unit "the Manipulate variable path is shadowed by the Module local and stays -1 (original quirk)"; golden "prm 3d: snapshot 1 (saved state) reads path length = 8.09"; harness "H-P3-01" |
| F-P3-17 | Robot progress: `robotq = qs` without a path; on the direct path `toroidPt[{qs, qf}, progress]`; on a roadmap path the point at `progress · Total[dists]` along qs → goodPts[[path]] → qf (tolerant While) | the moving robot and the blue cube | v0.1.16 | unit "progress 0.5 on the saved path puts the robot on segment 4 at (2.0865392601981254, 5.1017467996397725, 2.794532688302591)"; harness "H-P3-05"; harness "H-P3-06" |
| F-P3-18 | Obstacle move: when `pObsOlda != pObs3a \|\| pObsOldb != pObs3b`, every sample is re-classified (badPts, goodPts rebuilt in pts order), `rold = -1`, and pObsOld and highRes of the moved sphere are reset; the rebuild needs more than 5 free samples (Q-P3-07) | samples follow the spheres (UC-P3-03) | v0.1.16 | unit "moving an obstacle re-classifies every sample and sets rold = -1"; unit "an obstacle move that leaves at most 5 free samples keeps the OLD edges (original quirk)"; harness "H-P3-10"; harness "H-P3-11"; harness "H-P3-17" |
| F-P3-19 | Evaluation order of the body: restart; θ wrap; qs; new goal; pObs3a/b; inCollision, inCollisionf; obstacle move; add points; rebuild; query; progress; C-obstacles; the two graphics | same results as the original for the same inputs and random numbers | v0.1.16 | unit "new goal consumes RandomReal[{0, 2π}, 3] before any sampling of the same evaluation"; unit "restart clears pts, goodPts, badPts, edgesNN and edgesNNadj but keeps rold and qf" |
| F-P3-20 | Random numbers through an injectable `rng` (`shared/random.js`): `randomReal([0, 2π], [100, 3])` (row-major, as `RandomReal[{0, 2π}, {100, 3}]`) and `randomReal([0, 2π], 3)`; unseeded by default like the original; recorded numbers can be replayed (`replayRng`) | reproducible tests and comparison with harness records | v0.1.16 | unit "add 100 vertices consumes RandomReal[{0, 2π}, {100, 3}] row by row and classifies with detCollision"; harness "H-P3-08"; harness "H-P3-09" |
| F-P3-21 | Opening state = the notebook's saved state = the stored specifications (Initial Settings): θ = (0.25, 0.25, 0.25), qf = {3.84, 4.86, 1.62}, r = rold = 1.5, pts = the 100 stored samples ptsI, goodPts (80), badPts (20), edgesNN (180), edgesNNadj, pObsOlda {1, 0, 0}, pObsOldb {0, −1, 1/2} (exact, as Obstbz; the JSON extraction shows 0.5), spheres at {1, 0, 0} and {0, −1, 1/2}, progress 0, view points {1.3, −2.4, 2}; no rebuild at opening (r = rold); the live state equals snapshot 1's Settings and the initial settings (the output cell's stored `"Variables"`, raw line 7751; they differ only in the option form of `freeConfigSpacea/b`, COMMON-DECISIONS §6); the port opens in the live state and its "Initial settings" restores the stored `"Variables"` (A-P3-01) | same opening picture as the original (snapshot 1, "path length = 8.09") | v0.1.16 | golden "prm 3d: the saved Manipulate variables are the opening state and equal the stored specifications"; golden "prm 3d: evaluating the saved state changes nothing and gives path length 8.09"; golden "prm 3d: the saved Manipulate path stays -1 (shadowing quirk)"; harness "H-P3-20"; harness "H-P3-21"; harness "H-P3-22" |
| F-P3-22 | C-obstacles: only while the check box is on; per sphere `If[!highResa, highResa = ControlActive[False, True]; freeConfigSpacea = RegionPlot3D[detCollision[jointAngle2Origin[{a1, a2, a3}], {pObs3a}, obsRad, widtha], {a1, 0, 2π}, {a2, 0, 2π}, {a3, 0, 2π}, Mesh -> None, PlotStyle -> Directive[Blue, Opacity[0.5]]]]` (Yellow for b): recomputed on every evaluation while a control is active, once more at rest, then cached; switching off empties both and resets highResa/b (D-P3-02) | see the obstacle regions (UC-P3-01) | v0.1.16 | unit "the C-obstacle volumes: recomputed while a control is active, once more at rest, then cached per sphere"; unit "the C-obstacle field is negative exactly where detCollision with that sphere is True"; unit "marching tetrahedra encloses the blue C-obstacle of the default sphere and closes it on the cube faces"; harness "H-P3-16" |

### 4.3 Graphics (three.js, two viewers)

| ID | Feature | Reason | Since | Verified by |
|----|---------|--------|-------|-------------|
| F-P3-23 | Workspace graphic: `{Opacity[0.2], EdgeForm[Gray], If[inCollision, Red, Brown], drawRobot[qs], If[inCollisionf, Red, Brown], drawRobot[qf]}`, then `If[inCollision, Red, Brown], drawRobot[robotq]` (Q-P3-03), then `{Blue, Specularity[White, 10], Sphere[pObs3a, 0.5], Yellow, Specularity[White, 10], Sphere[pObs3b, 0.5]}`; `drawRobot`: base `Cylinder[{{0,0,-2.1}, {0,0,1+2 widtha}}, 1/8]`, link 1 `Cylinder[{{0,0,1}, {1+widtha,0,1}}, widtha]`, links 2 and 3 cuboids of half-width widtha, rotated by θ3 about {0,0,−1} through {2,0,1}, by θ2 about {0,−1,0} through {1,0,1} and by θ1 about {0,0,1} through {0,0,1}; box, `PlotRange -> {3.5{-1,1}, 3.5{-1,1}, {-1.1, 3.4}}` (parts outside clipped), "robot workspace", `ImageSize -> {300, 300}`, default lighting | see robot and spheres (UC-P3-01) | v0.1.16 | e2e "loads without errors and draws the workspace and the phase space"; e2e "a start configuration in collision turns the start and moving robots red"; unit "drawRobot geometry (rotations about z through (0,0,1), -y through (1,0,1), -z through (2,0,1)) matches jointAngle2Origin"; M-P3-02 |
| F-P3-24 | Phase-space graphic, drawing order as in the source: `PointSize[Large]` Red badPts, Green goodPts, qs and qf in Red/Brown by collision; the path (`Thickness[0.02]`: direct `toroidLine[{qs, qf}, Magenta]`, or connectors Magenta, roadmap path `toroidLine[…, Orange, Purple]` and Black end points), or thin Magenta connectors without a path; `Darker[Green]` and Red `PointSize[Medium]` points on top of the large ones; roadmap edges `toroidLines[edgesNN, Lighter[Brown], Brown]`; the robot progress as a Blue `Cuboid[robotq − .1{1,1,1}, robotq + .1{1,1,1}]`; box `{0, 2π}³` without padding, axes with labels θ1, θ2, θ3, ticks, two-line label "robot phase space" + red "No path possible" or "path length = `Round[totdist, .01]`"; lines leaving the cube are clipped (`ImageSize -> {300, 300}`) | the phase space (UC-P3-01, UC-P3-02) | v0.1.16 | e2e "loads without errors and draws the workspace and the phase space"; e2e "has the controls of the original with their defaults"; golden "prm 3d: snapshot 1 (saved state) reads path length = 8.09"; golden "prm 3d: snapshots 2 to 5 Settings (second sample set) give 107 edges and no path at r = 1.19, 359 edges and path length 8.51 at r = 1.86"; M-P3-02 |
| F-P3-25 | C-obstacle volumes in the phase space: translucent Blue / Yellow (`Directive[Lighting -> Automatic, RGBColor[…], Opacity[0.5]]`, no edges) solids closed on the cube faces, with `GrayLevel[0]` boundary lines where they meet the faces (as stored in the Settings of snapshots 3 and 4: blue 488 vertices spanning θ2 3.37 … 5.29, yellow 948 vertices over the whole cube) | show the obstacle regions (UC-P3-01) | v0.1.16 | e2e "show configuration space obstacles draws the blue and yellow volumes"; golden "prm 3d: the volumes stored in snapshots 3 and 4 lie on the boundary of the port field and have its extent"; M-P3-05 |
| F-P3-26 | `ViewPoint -> Dynamic[viewPoint1]` / `Dynamic[viewPoint2]` with Manipulate variables (default {1.3, −2.4, 2}): a mouse rotation of either picture is written back and survives every re-evaluation; both pictures rotate independently | look around without losing the view (UC-P3-01) | v0.1.16 | e2e "a rotated view stays rotated after a control change (Dynamic view points)"; unit "Initial settings restore both view points to {1.3, -2.4, 2}"; M-P3-06 |
| F-P3-27 | Title, caption and Details & Citations text (with the Kavraki et al. reference) | explains the Demonstration | v0.1.16 | M-P3-01 |

### 4.4 Port additions

| ID | Feature | Reason | Since | Verified by |
|----|---------|--------|-------|-------------|
| A-P3-01 | "Initial settings" button: the stored specifications (= the saved state), including both view points | stands in for the Manipulate ⊕ menu → Initial Settings | v0.1.16 | e2e "Initial settings restores the opening state and the view points" |
| A-P3-02 | `window.__demo` automation hook: `getState`, `view` (qs, qf, path, qsn, qfn, totdist, robotq, label, counts, volume descriptors, both pictures as Graphics3D data), `setRng` (seeded or replayed), `loadState`, `loadSettings` (a stored state of the original), `robotColors`, `inkFraction(view)` (without an argument the smaller of the two pictures; no forced render), `camera(view)` (with the current ViewPoint), `volumeCount`, `evaluations` | automated tests | v0.1.16 | e2e "loads without errors and draws the workspace and the phase space" |
| A-P3-03 | URL parameter `?seed=N` (whole number): reproducible "add 100 vertices" and "new goal" (default unseeded, like the original) | reproducible runs for testing and teaching | v0.1.16 | e2e "add 100 vertices with a seed gives reproducible samples (port addition)" |
| A-P3-04 | "All demos" link | site navigation | v0.1.16 | inventory; M-GEN-01 |
| A-P3-05 | Credit footer: original title, authors, licence, adaptation notice | required by CC BY-NC-SA 3.0 | v0.1.16 | e2e "attribution on" |
| A-P3-06 | Start-up notice (watchdog, `<noscript>`) and WebGL 2 notice (DEC-22; both pictures are 3D, so the page needs WebGL 2) | a clear message instead of an empty page | v0.1.16 | e2e "start-up notice when"; e2e "WebGL 2 notice on" |
| A-P3-07 | Both views redraw after a WebGL context loss and restore | robustness | v0.1.16 | e2e "the views redraw after a WebGL context loss" |
| A-P3-08 | standalone bundle (owner rule R-A): `npm run bundle -- prm-3d` builds `dist/prm-3d/` with exactly the files the app imports, the licences, a generated README and a root `index.html` (§6, "Building and deploying this app alone") | anyone can host this one app elsewhere without the rest of the site (owner rule R-A, 2026-10-17) | v0.1.16 | e2e "bundle: prm-3d runs from its own folder" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|-------------|---------|
| `slider-Theta*` | F-P3-01 |
| `plus-Theta*` | F-P3-01 |
| `play-Theta*` | F-P3-01 |
| `stepback-Theta*` | F-P3-01 |
| `stepfwd-Theta*` | F-P3-01 |
| `pad-Obstaxy` | F-P3-02 |
| `value-Obstaxy-*` | F-P3-02 |
| `vslider-Obstaz` | F-P3-02 |
| `pad-Obstbxy` | F-P3-03 |
| `value-Obstbxy-*` | F-P3-03 |
| `vslider-Obstbz` | F-P3-03 |
| `check-showConfigObs` | F-P3-04 |
| `button-addPoints` | F-P3-05 |
| `button-restart` | F-P3-06 |
| `button-newgoal` | F-P3-07 |
| `slider-r` | F-P3-08 |
| `value-r` | F-P3-08 |
| `plus-r` | F-P3-08 |
| `play-r` | F-P3-08 |
| `stepback-r` | F-P3-08 |
| `stepfwd-r` | F-P3-08 |
| `slider-progress` | F-P3-09 |
| `scene-canvas-workspace` | F-P3-23, F-P3-26, A-P3-07 |
| `scene-canvas-phase` | F-P3-24, F-P3-25, F-P3-26, A-P3-07 |
| `reset` | A-P3-01 |
| `crumbs` | A-P3-04 |
| `details` | F-P3-27 |
| `credits` | A-P3-05 |

## 6. Design

### 6.1 Relation to the 2D PRM ports (prm, prm-robot-arm)

| Part | 2D ports | This Demonstration | Port plan |
|------|----------|--------------------|-----------|
| `myAstar` | prm-core `myAstar` | text identical (comments aside); uses the 3D `toroidDist` | prm-core `myAstar(adjL, verts, si, fi, dist = toroidDist)` |
| `connectPoints` | prm-core core + app wrapper with `pathOKTrobot` | text identical to prm-robot-arm's | prm-core core with a `dist` parameter for `Nearest`; app wrapper as in prm-robot-arm |
| query (direct path, nearest connection, myAstar) and progress | prm-core `planQuery`, `progressOnPath` | same inline code | the same functions with `dist` and `toroidPt` parameters |
| `pointsegdis2`, `isCollided`, `linDist` | prm-robot-arm model (`linDist` unused) | text identical (linDist with 3 terms, unused) | kept in this app's `model.js` (as prm-robot-arm keeps its own; robot-motion-obstacles' `arm-grid.js` has the 2D variant, I-RM-05), with `a/b` as `a·(1/b)` (COMMON-DECISIONS §4; both forms reproduce every stored classification and roadmap, N-P3-06) |
| `toroidDist` | Sqrt of 2 `Min` terms | Sqrt of 3 `Min` terms | n-dimensional loop; 2D operations unchanged |
| `pathOKT` / `pathOKTrobot` | dx, dy; wrap with two sequential Ifs (`<0` then `>2π`) | dx, dy, dz; `wrapto0to2π` (`>2π` then `<0`, nested) | n-dimensional prm-core `pathOKT` with the collision predicate; one wrap function (equivalent results, unit test) |
| `toroidLine` | `dx > dx2 \|\| dy > dy2` | `… \|\| dz > dz2` | n-dimensional |
| `toroidPt` | zero test on the SHORTEST differences, wrap `pt + If[pt > 2π, -2π, If[pt < 0, 2π, 0]]` | zero test on the ABSOLUTE differences, `wrapto0to2π` | n-dimensional with option `zeroTest: 'shortest' \| 'absolute'` (N-P3-03) |
| collision | `detCollision[θ1, θ2, …]`: link 1, link 2 (elbow direction {Sin θ1 Sin θ2, −Cos θ1 Sin θ2, Cos θ2}), base | `detCollision[{o1, o2, o3}, …]` with `jointAngle2Origin`: links 1, 2, 3, base | app model |
| start and goal | locators in the phase plot (jump to the opposite edge) | three θ sliders (shift by 2π) and "new goal" (random) | app model |
| opening state | empty (restart = True) | the stored roadmap (100 samples, 180 edges) | saved state |
| C-obstacles | RegionPlot (2D), one plot with two regions, marching squares | RegionPlot3D per sphere with own cache flags | new `cspace3d.js` (marching tetrahedra, D-P3-02) |
| view | 2D phase plot in SVG, 3D workspace inset with ViewPoint from a slider | two Graphics3D with Dynamic view points | two three.js viewers |
| random numbers | `rng` (shared/random.js), `?seed=N`, replay of recorded numbers | `RandomReal[{0, 2π}, {100, 3}]`, `RandomReal[{0, 2π}, 3]` | same `rng` mechanism; the opening state needs no random numbers (its samples are the stored ptsI); the second sample set of snapshots 2–5 is stored too, so "restart" + "add 100 vertices" replayed with those 300 numbers (`replayRng`) must give the snapshot 2 state (T-P3-36) |

The prm-core generalisation must keep every 2D result bit for bit: the existing unit and golden tests of prm and
prm-robot-arm (550 classifications and 1740 edges replayed, owner states 1) are the regression test, run unchanged.

### 6.2 Modules

- **`demos/common/prm-core.js`** (generalised, v0.1.16): `toroidDist(a, b)` (any dimension, terms added in coordinate
  order from the first, so 2D results are the same doubles), `wrapto0to2pi(x)` (`If[x > 2π, x − 2π, If[x < 0, x + 2π, x]]`
  with tolerant comparisons; the 2D sequential wrap gives the same double on (−2π, 4π), so `pathOKT` uses this one wrap
  for every dimension), `pathOKT(ps, pe, collides, delta)` (any dimension), `toroidLine`, `toroidLines` (any dimension),
  `toroidPt(e, frac, {zeroTest: 'shortest' | 'absolute'})` (N-P3-03; the 'absolute' variant also wraps with
  wrapto0to2π), `connectPoints(…, r, dist = toroidDist)` (a shorter adjacency list filled with empty lists, K-P3-05),
  `myAstar(…, dist = toroidDist)`, `planQuery({…, dist})`, `progressOnPath({…, dist, pt})`. Every existing export and its
  2D behaviour are kept; the prm and prm-robot-arm unit and golden replays run unchanged.
- **`model.js`** (pure): constants (`OBS_RAD = 0.5`, `WIDTHA = .05`, `DELTA = .1`, unused `W = 1/8`, `L = 1`, `PW = .25`),
  the control ranges (`PAD_MIN`/`PAD_MAX` = {−3, −3}/{1, 1}, θ, radius, progress, heights), `pointsegdis2` (3D, `a·(1/b)`),
  `isCollided` and `linDist` (unused, N-P3-04), the stored data `ptsI`, `badPtsI`, `goodPtsI`, `edgesNNI`, `edgesNNadji`
  and the saved roadmap `edgesNNsaved`, `edgesNNadjSaved` (CC BY-NC-SA data of the original), `jointAngle2Origin`,
  `robotSegments`, `detCollision`, `pathOKTrobot`, `toroidPt` (absolute zero test), `myAstar`, `connectPoints[goodPts,
  edgesNNadjin, pObs3, obsRad, widtha, delta, edgesNNin, point2start, r]`, `RotateAbout` (Rotate[g, θ, w, p] as a g3d
  `GeometricTransformation`, D-P3-10), `drawRobot` as g3d data, `initialState()` (= saved state = stored specifications),
  `stateFromSettings(settings)` (a stored state as a port state), `evaluate(state, rng, {controlActive})` performing one
  evaluation of the body in the order of F-P3-19 and returning `{state, view}`; the view holds both pictures as
  Graphics3D data (`workspace`, `phase`, in the source's drawing order), the query results, the label, the volume
  descriptors and the counts.
- **`cspace3d.js`** (pure): `field(a1, a2, a3, c)` = min over the four tests of (distance − limit) for one sphere centre
  c (negative = collision, the same comparisons as detCollision); `cObstacle(c, n)` samples the field on an (n+1)³ grid
  over [0, 2π]³ (the grid loop precomputes the cosines and sines and reproduces `field` bit for bit) and hands the grid to
  `shared/region-plot3d.js` `marchingTetrahedra` (MIT since v0.1.21; no notebook content), which splits every grid
  cube into the six Kuhn tetrahedra along its main diagonal and runs marching tetrahedra (triangles oriented outwards,
  vertices shared per grid edge), then closes the volume on the six cube faces with caps cut from the same face
  triangulation and returns the crossing segments on the faces as the boundary lines; the mesh is watertight (unit test).
  n = 24 while a control is active, 48 at rest (D-P3-02); `volumeFor({c, quality})` caches results per sphere position and
  quality, mirroring highResa/highResb.
- **`main.js`** (one `Manipulate({…})` call of `shared/manipulate.js` since v0.1.21): Controls as in F-P3-10, four `Row`s of
  Manipulate control specs (sliders for θ1–θ3 with ⊕, without value field, −0.1 + k·0.01; 2D sliders for the pads,
  `VerticalSlider`s (value hidden); radius with value field (`Appearance: 'Labeled'`) and ⊕; progress as
  `ControlType: Slider` — no ⊕, no value field); the check box and the three buttons are `Control` factories over
  `shared/ui-extra.js` that evaluate at once, while `throttle: 'frame'` coalesces slider input; `ControlActive: true`,
  `random: true` (`?seed=N`, hook `setRng`). **`view3d.js`** (`PrmViews`, the two renderers): two `createViewer`s side by side (300 px each) with
  `LinearSRGBColorSpace` and `shared/mma-lighting.js`, framed by `fitViewer` with the zooms of D-P3-09; the workspace drawn
  with `addPrims` (clipped to the plot range) and Phong spheres; the phase cube drawn in data coordinates with clipping
  planes at the cube faces, points as screen-size discs (`THREE.Points` with a disc texture, sizes D-P3-04), thin lines
  batched per colour, thick lines as fat lines (6 px), the progress cube with `addPrims`, ticks and axis labels on fixed
  edges (D-P3-08), the volumes as translucent Lambert meshes (smooth normals on the surface, flat caps) with black
  boundary lines; plot labels as HTML above each canvas (two lines on the right, "No path possible" red). The cameras are
  kept across evaluations and their view points written into the state on every rotation (viewPoint1, viewPoint2) so
  that "Initial settings" can restore them. `ControlActive` is true while a slider, pad or vertical slider is pressed with
  the mouse; on release the body is evaluated once more, as Mathematica does. Slider input is evaluated at most once per
  animation frame; buttons and the check box evaluate at once (D-P3-06).
- **State model** (Manipulate variables): `θ1, θ2, θ3, Obstaxy, Obstaz, Obstbxy, Obstbz, showConfigObs, r, progress,
  qf, pts, goodPts, badPts, edgesNN, edgesNNadj, rold, pObsOlda, pObsOldb, highResa, highResb, freeConfigSpacea,
  freeConfigSpaceb (as descriptors: sphere position and quality, or none), addPoints, restart, newgoal, viewPoint1,
  viewPoint2, path (never written, Q-P3-02)`.
- **Numerics**: tolerant comparisons from shared/mma.js (`<`, `>`, `<=`, `!=` on vectors), `Total` compensated
  (shared/mma.js `total`) for the path length, `Round[totdist, .01]` display as in the 2D ports, `Ceiling`,
  `EuclideanDistance` as `euclid` (prm-robot-arm), `Position` of identical elements, `nearest` with input order on ties
  and inclusive radius (K-PR-01 resolved). `RandomReal` arrays row-major.

### 6.3 Building and deploying this app alone

Owner rule R-A (2026-10-17): this one app can be taken out of the repository and hosted anywhere. One command builds it:

```
npm run bundle -- prm-3d
```

`tools/bundle-app.mjs prm-3d` (npm script `bundle`) writes `dist/prm-3d/`: the app with exactly the files it needs — its HTML, its modules and everything they import, recursively, with the repository's relative layout kept — plus the licence texts that apply, a generated `README.md` (title, the original's credits, licence, "serve this folder with any static web server", how to run its tests in the full repository) and a root `index.html` that opens the app (the "All demos" link of the bundled page leads to that root page). Nothing else. Contents (generated with `npm run bundle -- --update-docs`; unit "bundle contents listed in DESIGN.md match the collector" keeps the table current):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/prm-3d/`) | 5 | `cspace3d.js`, `index.html`, `main.js`, `model.js`, `view3d.js` |
| `shared/` | 21 | `clock.js`, `graphics-extras.js`, `graphics.js`, `graphics3d-three.js`, `graphics3d.js`, `manipulate.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `mma-lighting.js`, `mma.js`, `random.js`, `region-plot3d.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `three-helpers.js`, `ui-extra.js`, `ui-interval.js`, `ui.js` |
| `demos/common/` | 1 | `prm-core.js` |
| `vendor/three/` | 9 | `addons/controls/OrbitControls.js`, `addons/lines/Line2.js`, `addons/lines/LineGeometry.js`, `addons/lines/LineMaterial.js`, `addons/lines/LineSegments2.js`, `addons/lines/LineSegmentsGeometry.js`, `addons/renderers/CSS2DRenderer.js`, `three.core.js`, `three.module.js` |
| added by the bundler | 8 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/prm-3d/DESIGN.md`, `vendor/three/LICENSE` |
<!-- bundle-contents:end -->

Licences: `LICENSES/CC-BY-NC-SA-3.0.txt` (this app and every `demos/…` module: derived from Wolfram Demonstration code); `LICENSES/MIT.txt` (the `shared/…` modules); `vendor/three/LICENSE` (three.js r186, MIT).

Requirements: WebGL 2 (three.js r186; `shared/requirements.js` shows the WebGL 2 notice without it) and ES modules with import maps (current Firefox, Chromium, WebKit).

Verified by e2e "bundle: prm-3d runs from its own folder" (A-P3-08): the test runs the bundle command, serves `dist/prm-3d/` alone with a static file server (no access to the rest of the repository), opens the root `index.html`, follows it to the app and checks: no console error, no failed request, every request stays inside the folder, the controls of §5 are present and the first picture is drawn (a WebGL 2 canvas with a non-empty frame); it also compares the folder's file list with the generated list in its `README.md`.

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

| ID | Kind | Description |
|----|------|-------------|
| Q-P3-01 | quirk kept | The θ sliders run from −0.1 to 6.3; the body shifts a value below 0 by +2π and above 2π by −2π and writes it back (`If[θ1 < 0, θ1 = 2π + θ1]`), so the slider thumb jumps to the other end: −0.1 → 6.183185307179587, 6.3 → 0.01681469282041359 (off the slider's 0.01 grid). |
| Q-P3-02 | quirk kept | The Module local `path` (initial −1) shadows the Manipulate variable `{{path, -1}, None}`, which is never written and stays −1 (the saved state shows −1 although a path exists). |
| Q-P3-03 | quirk kept | `If[inCollision, Red, Brown]` before `drawRobot[robotq, widtha]` colours the MOVING robot by the START's collision state, wherever it is (as Q-PA-04). The translucent start and goal robots are coloured by their own states. |
| Q-P3-04 | quirk kept | A direct path is accepted even when the start or the goal is in collision: the direct test comes first and the in-collision checks are only in its else branch; the planner does not test end points (as Q-PA-11). |
| Q-P3-05 | quirk kept | The shared PRM quirks: Dijkstra-like "A*", untested end points and untested segments ≤ delta, directional planner, incremental connection of new samples, single-candidate connection of start and goal — see `demos/prm/DESIGN.md` Q-PR-01, Q-PR-03, Q-PR-04, Q-PR-05, Q-PR-07. |
| Q-P3-06 | quirk kept | The base is drawn as a cylinder of radius 1/8 from z = −2.1 to 1.1 (clipped by the plot range at −1.1) but tested as the segment z = 0 … 1.1 with margin 0.6 (as Q-PA-01): a sphere centre within 0.6 of the axis segment, e.g. at (0, 0, 1), makes EVERY configuration collide. |
| Q-P3-07 | quirk kept | After an obstacle move that leaves at most 5 free samples the roadmap is not rebuilt (`Length[goodPts] > 5`): the OLD edges stay drawn although their end points may now be red (as Q-PA-06). |
| Q-P3-08 | quirk kept | "restart" sets `pObsOlda = pObs3a` before the Module local has a value in that evaluation; pObsOlda then refers to that evaluation's sphere position (as N-PA-02); restart keeps rold, so after restart and "add 100 vertices" the new samples are connected incrementally from point 1 (a full build) and no rebuild follows unless the radius changes. |
| Q-P3-09 | quirk kept | The goal qf has no control: it changes only by "new goal" (random) and is never wrapped or tested against [0, 2π) (RandomReal stays inside). |
| Q-P3-10 | quirk kept | The Initialization data `edgesNNI` / `edgesNNadji` (181 edges) are never shown: the stored Manipulate starts from the saved state (180 edges), and the code's own first evaluation would rebuild them (`{{rold, -1}, None}`). They contain one edge longer than the radius 1.5: (2.26, 1.09, 4.31)–(1.92, 0.17, 3.17), toroidal length 1.50386. `{{edgesNNadj, edgesNNadj}, None}` names itself (presumably edgesNNadji was meant). |
| Q-P3-11 | quirk kept | Samples are drawn twice: large Red/Green points, later medium Darker[Green]/Red points on top (green dots with a dark-green centre); the roadmap edges come after the points. The qs/qf points are drawn black on a found path. |
| Q-P3-12 | quirk kept | The C-obstacle volumes are recomputed on every evaluation while any control is active (ControlActive), then once more at rest and cached per sphere; switching the check box off empties both and resets their caches, so switching it on again recomputes both. |
| Q-P3-13 | quirk kept | The sphere pads are `Control[{{Obstaxy, {1, 0}, …}, 3{-1, -1}, {1, 1}}]`: the 2D sliders span {−3, −3} … {1, 1}, so a sphere centre can go to −3 in x and y but never beyond 1 (probably `3{1, 1}` was meant); the snapshots' pads show the default thumbs off-centre accordingly. Kept. |
| Q-P3-14 | quirk kept | Links 2 and 3 are drawn as square cuboids of half-width widtha = 0.05 (corners 0.0707 from the link axis) but tested as capsules of radius widtha (`pointsegdis2 … < obsRad + widtha`), and the base is tested with radius 2·widtha = 0.1 against the drawn 1/8 (Q-P3-06): a sphere may overlap a drawn link edge by up to 0.02 without a collision (E-P3-05). |
| Q-P3-15 | quirk kept | The phase-space label says "No path possible" (`If[Length[path] == 0 && path == -1, Style["No path possible", Red], …]`) whenever the current roadmap has no path, also where a larger radius or more samples find one (snapshots 2–3 against 4–5; E-P3-06). |
| D-P3-01 | deviation | JavaScript cannot reproduce Mathematica's random numbers: after "add 100 vertices" or "new goal" the samples and goals differ from the original's runs (as they differ between the original's own runs). The opening state needs no random numbers; harness records with `SeedRandom` are replayed through `replayRng` in the golden tests. |
| D-P3-02 | deviation | `RegionPlot3D` is replaced by the sign of the margin field (`cspace3d.js` `field`, negative where detCollision with that sphere is True) sampled on a 25³ (control active) or 49³ (at rest) grid over [0, 2π]³. **Decided while implementing:** marching tetrahedra (each grid cube split into the six Kuhn tetrahedra along its main diagonal) instead of the draft's marching cubes — the same grid and interpolation without a 256-case table, and a mesh that is watertight by construction; the volume is closed on the cube faces by caps cut from the same face triangulation (so caps and surface share every boundary vertex) and the `GrayLevel[0]` boundary lines are the crossing segments on the faces (the unit test is retitled "marching tetrahedra encloses …"). Mathematica's adaptive sampling (PlotPoints, MaxRecursion) gives smoother and differently placed boundaries; the vertices of the volumes stored in snapshots 3 and 4 lie within 0.0004 of the port field's zero set (golden test). The volumes are illustration only: the PRM never uses them. Computing a 49³ volume takes about 0.1–0.4 s in a browser. |
| D-P3-03 | deviation | Colours and lights: `LinearSRGBColorSpace` output and `shared/mma-lighting.js` (as D-RS-02); `Specularity[White, 10]` approximated with a Phong highlight; `EdgeForm[Gray]` of the translucent robots drawn as 1 px gray edges. |
| D-P3-04 | deviation | Point sizes as screen-size discs measured on snapshot 1 (2 px per pt): `PointSize[Large]` 6.5 px (red points 13 px wide in the picture), `PointSize[Medium]` 4 px (the dark-green centres 7–8 px wide); `PointSize[0.06]` (no effect in the original, N-P3-04) is not drawn; `Thickness[0.02]` as 2 % of the 300 px picture (6 px; the purple path is 10 px tall in the picture where it runs diagonally); default lines 1 px. |
| D-P3-05 | deviation | Rotation with OrbitControls (z axis stays vertical); the port keeps the whole camera across evaluations, while the original keeps only the ViewPoint (a changed ViewVertical or zoom may be reset, K-P3-04). |
| D-P3-06 | deviation | Update rate: the port evaluates at most once per animation frame while a slider, pad or vertical slider moves and immediately after a button or the check box (the original uses `SynchronousUpdating -> False`, so its kernel may lag behind the controls during long rebuilds; the port's evaluations are synchronous and complete). ControlActive is approximated as in D-PA-07: true from a mouse press on a slider, pad or vertical slider until the release, after which the body is evaluated once more; keyboard steps and the ⊕ animation count as inactive. |
| D-P3-07 | deviation | Controls are the shared Manipulate-style controls: the 2D sliders show editable x/y fields (the original shows none) and round dragged positions to 0.01 (shared `slider2D`), the vertical sliders show no value, the ⊕ panels open below the sliders. |
| D-P3-08 | deviation | Phase-space axes and ticks on fixed cube edges chosen for the default view point (as D-RS-05); Mathematica moves them when the view is rotated. |
| D-P3-09 | deviation | Framing (**decided while implementing**; the original has no SphericalRegion, Mathematica fits the box to the image): the camera is fitted with `fitViewer` (`shared/graphics3d-three.js`) and one zoom per picture chosen so that, at the default view point, the workspace box spans 0.86 and the phase cube 0.735 of the 300 px picture width, as measured on snapshot 1 (`WS_ZOOM` = 0.99, `PH_ZOOM` = 0.92). The plot labels are drawn above the canvases, so the original's phase cube, which its label pushes down and partly out of the picture, is shown whole. |
| D-P3-10 | deviation | **Decided while implementing:** drawRobot's `Rotate[g, θ, w, p]` (rotation about an axis through a point) is built in `model.js` (`RotateAbout`, a `GeometricTransformation` of `shared/graphics3d.js` with the matrix T(p)·R(θ, w)·T(−p)) instead of extending g3d.js, which the DH family owns (dh-parameters); the rotation matrices use machine `Math.cos`/`Math.sin` like g3d's `Rotate`. No visible effect. |
| K-P3-01 | known issue (lead) — resolved by K-PR-01/K-PR-02 | `Nearest` ties in input order, inclusive radius, `Position`/SameQ with 1-ulp tolerance: answered for the 2D PRMs (extra-checks.wls, Mathematica 15.0.1); the 3D code uses the same calls. |
| K-P3-02 | known issue (lead) — resolved by harness run 2 | Sums of three machine numbers (`toroidDist`, `dist = Sqrt[dx^2 + dy^2 + dz^2]`, `EuclideanDistance`): the port adds left to right; if Mathematica's `Plus` of three terms rounds differently, only exact ties at the radius or between path lengths can change. The saved roadmap (180 edges) is reproduced; harness H-P3-01 records `totdist` bit for bit. **Resolved by harness run 2 (Mathematica 15.0.1):** the record agrees with left-to-right addition — totdist 8.090258898868402 (H-P3-01) and 8.506123161547425 (H-P3-21) bit for bit, 6.89983468942569 (H-P3-19, rebuilt roadmap of 200 samples, with its path {89, 76, 61, 4, 155, 158} and all edges exact); no recorded case separates the orders, so a tie case would still need its own scenario. |
| K-P3-03 | known issue (lead) | RegionPlot3D sampling of the original (and its "Speed" variant while ControlActive): the Settings of snapshots 3 and 4 store the at-rest volumes (highResa = highResb = True; blue 488, yellow 948 vertices, GrayLevel[0] boundary lines), the harness records further ones (H-P3-16, H-P3-22); the port's grid sizes are a choice, compared against them by extent and boundary distance. **Harness run 2 (Mathematica 15.0.1, accepted v0.1.17):** H-P3-16 and H-P3-22 record identical volumes (deterministic in 15.0.1); their 488 (blue) and 948 (yellow) vertices are bit-identical to snapshot 3's stored ones, but the Polygon/Line index lists (384/784 polygons, 8/10 lines) and VertexNormals differ — a version difference of RegionPlot3D's mesh connectivity, not of the region. The port's volumes pass the N-P3-07 comparison against both records (before v0.1.17 that comparison read the harness records' `{h, a}` encoding as empty and passed vacuously; fixed). The "Speed" variant while ControlActive is not recorded; the lead stays open for it. |
| K-P3-04 | known issue (lead) | Dynamic view points: does a rotation in the original keep its ViewVertical and zoom after a re-evaluation (only ViewPoint is Dynamic)? M-P3-06. |
| K-P3-05 | known issue (lead) — defensive guard, not reachable by the documented steps | After an obstacle move that leaves at most 5 free samples (Q-P3-07) the adjacency lists of the old samples stay, so the list is LONGER than goodPts (and stale); a following "add 100 vertices" would join empty lists for its new free samples and call connectPoints on the stale lists before the rebuild of the same evaluation (r ≠ rold = −1, when more than 5 are free then) replaces the result. But every position of sphere a on a 0.1 grid of its pad and slider that leaves at most 5 of the 100 stored samples free leaves none (the sphere then reaches the base, Q-P3-06: every configuration collides), so the new samples are not free either and connectPoints is not called (review of v0.1.16). The port uses a longer list as it is (as the original) and fills a SHORTER one — not produced by the original's body — with empty lists up to goodPts.length (`connectPoints` of prm-core, a dense array); H-P3-17 and M-P3-07 exercise the base case only (no free sample, no connectPoints call). Unit "connectPoints with an adjacency shorter than goodPts (K-P3-05) finishes and gives symmetric lists". |
| K-P3-06 | known issue (lead) — resolved by the review (2026-10-12) | The first draft assumed that snapshots 2–5 were made after "new goal". Wrong: their Settings store the complete state with the DEFAULT goal {3.84, 4.86, 1.62} and a SECOND sample set (100 points, 86 free, 14 colliding: made after "restart" and "add 100 vertices"); r = rold = 1.19 in snapshots 2–3 and 1.86 in 4–5. Replaying them (reviewer and independent Python) reproduces the classification, 107 and 359 edges and the adjacency exactly; at 1.19 the start and goal connect to (6.184370139895083, 5.996718735354918, 5.9072498189673155) and (3.589035608654555, 3.9302429986404572, 2.447177213076131) but there is no path ("No path possible"); at 1.86 the path is {54, 83, 73, 68, 32, 72}, totdist 8.506123161547425 ("path length = 8.51"). The start connector wraps to the cube corner, which is why the magenta pieces sit there. Golden-saved tests (T-P3-36, T-P3-71 … T-P3-73). |
| K-P3-07 | known issue (lead) | The θ slider values produced by dragging (−0.1 + k·0.01 like D-RS-06?) and whether the written-back wrapped value (e.g. 0.01681469282041359) is shown as is; M-P3-03. |
| N-P3-01 | note | `states/Probabilistic-Roadmap-Method-in-3D.json` lacks θ1–θ3 (`\[Theta]1$$` was not parsed) and shows Obstbz, pObsOldb as 0.5; the raw notebook has 0.25 for all three θ and exact 1/2 (Rational[1, 2]); the planned extractor keeps both (COMMON-DECISIONS §1). The stored specifications (Initial Settings) equal the saved state in every variable (rold 1.5, the 180 edges, pObsOld {1, 0, 0} and {0, −1, 1/2}), unlike the code's `{{rold, -1}, None}` and `{{pObsOlda, {-3, -2, -2}}, None}`. |
| N-P3-02 | note | Independent check (Python re-implementation of the source, 2026-10-12): detCollision reproduces goodPtsI/badPtsI in order; connectPoints with r = 1.5 reproduces the saved 180 edges and adjacency exactly, in order; the query gives qsn = (0.43, 5.91, 0.47), qfn = (3.89, 5.48, 2.37), path {71, 78, 72, 64, 70, 34}, totdist 8.090258898868402 → "path length = 8.09" as in snapshot 1. With the FIRST sample set (not a snapshot): r = 1.19: 101 edges, no path; r = 1.86: 317 edges, path {71, 78, 62, 34}, 6.249367797545131; r = 12: 398 edges. The snapshots 2–5 use the second set (K-P3-06). |
| N-P3-03 | note | `toroidPt`'s zero test uses `dist = Sqrt[dx^2 + dy^2 + dz^2]` with the ABSOLUTE differences (the 2D versions use the shortest-way differences): only points that differ by exactly 2π in a coordinate behave differently, and since qs, qf and the samples lie in [0, 2π] the resulting point is the same. Kept as written. |
| N-P3-04 | note | Unused: `w = 1/8`, `l = 1`, `pw = .25`, `linDist`, `isCollided`, `qsni`/`qfni` outside the query; `PointSize[0.06]` before the progress `Cuboid` has no effect (left over from the commented-out `Point[robotq]`). |
| N-P3-06 | note | `pointsegdis2`'s `-(2 (#-mean).u)/u.u` is evaluated as `a·(1/b)` (COMMON-DECISIONS §4); the plain division `a/b` (prm-robot-arm, K-PA-02) gives the same classification of both stored sample sets and the same 180, 107 and 359 edges, so the stored data cannot tell them apart (independent Python, 2026-10-12). |
| N-P3-05 | note | At progress 1 the robot ends at (3.84, 4.859999999999999, 1.6199999999999997), not exactly at qf (rounding of the last segment); the robot drawn there is visually at the goal. |
| N-P3-07 | note | The stored and recorded RegionPlot3D volumes (snapshots 3 and 4; harness H-P3-16, H-P3-22) are compared with the port by their vertices: every vertex is within the field's largest change over one 49³ grid cell of the port field's zero set, or a cap vertex on a cube face inside the region, and the extents agree within one cell (blue θ2 3.37 … 5.295). The TESTPLAN's symmetric-difference measure (T-P3-48) needs closed recorded meshes and is not used. |
| N-P3-08 | note | Harness golden tests (v0.1.17): H-P3-19 has no `$RandomDraws` capture, so its record holds only per-step draw counts (HW-52). Its first five steps are exactly H-P3-18 (same start, restart, seed 4, add, seed 5, add), which captures the draws; the test replays H-P3-18's two recorded draws after checking the step prefix and the per-step counts (1, 1) and that no later step draws. The compound-expression reader of the volume comparison accepts the fixtures' `{head, args}` and the harness records' `{h, a}` (HW-45) and fails if a recorded volume reads as empty. |

## 8. Proposed changes

No open proposal. Template (see [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md)):

| ID | Status | Requested by / date | Change | Reason | Acceptance criteria |
|----|--------|---------------------|--------|--------|---------------------|

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.16 | 2026-10-18 | first implementation of the design draft approved by the owner (DEC-17; draft of 2026-10-12 with COMMON-DECISIONS §6 and owner rules R-A/R-B/R-C applied), including the generalisation of `demos/common/prm-core.js` to n dimensions (§6.2; the prm and prm-robot-arm unit and golden replays run unchanged and stay green); decided while implementing: D-P3-02 (marching tetrahedra, unit test retitled), D-P3-04 (measured sizes), D-P3-06, D-P3-07, D-P3-09 (framing), D-P3-10 (`RotateAbout` in the app), N-P3-07 (how volumes are compared); harness checks are golden tests `harness "H-P3-nn"` that skip until `tests/golden/prm-3d.harness.json` exists |
| 2 | v0.1.16 | 2026-10-18 | review fixes: K-P3-05 rewritten (the stale list is longer, not shorter; the guard is defensive, not reachable; prm-core fills a shorter list densely), H-P3-17's why and M-P3-07 describe the base case they exercise, Q-P3-14 (links tested as capsules) and Q-P3-15 ("No path possible") cited by E-P3-05/E-P3-06, checklist pad positions (three quarters up), unused THICK_PX removed; e2e: context-loss test polls each canvas, pad press inside the pad; unit: the Initial-settings test runs the reset path |
| 3 | v0.1.17 | 2026-10-18 | harness run 2 accepted (Mathematica 15.0.1): all 22 records match the port, no app code changed. Golden test adapter: H-P3-19's draws from H-P3-18 (N-P3-08); volume reader fixed for the `{h, a}` encoding (H-P3-16/22 had passed vacuously). K-P3-02 resolved; K-P3-03 evidence (vertices bit-identical to the stored volumes, connectivity differs by version) |
| 4 | v0.1.18 | 2026-10-18 | version number only (harness run 3 accepted for manipulability-ellipsoid); no change to this app |
| 5 | v0.1.19 | 2026-10-21 | version number only (shared Manipulate layer added, four apps migrated to it); no change to this app |
| 6 | v0.1.20 | 2026-10-21 | version number only (Manipulate layer extended, eleven more apps migrated to it); no change to this app |
| 7 | v0.1.21 | 2026-10-23 | `main.js` rewritten on the shared Manipulate layer (`shared/manipulate.js`: controls, state, reset, hook) with the app's own three.js renderer object for its picture; generic parts moved to MIT shared modules (owner decision D1): marching tetrahedra → `shared/region-plot3d.js`; drawing code in `view3d.js`; no change to behaviour or picture (all unit, golden and browser tests passing; three.js scene graph, full-page pixels (SwiftShader) and Manipulate state identical to v0.1.20 at sample settings) |
| 8 | v0.1.22 | 2026-10-25 | version number; bundle table (`shared/manipulate.js` now also loads `shared/graphics-extras.js` and `shared/svg-frame.js` for the new Graphics options `Axes`/`Frame`/`PlotLabel`); no change to this app's code, behaviour or picture (pixel parity with v0.1.21) |
| 9 | v0.1.23 | 2026-10-25 | version number; the shared code gained plot functions, a geometry kit, 3D text and tube primitives and fixes for new apps (v0.1.23); no change to this app's code, behaviour or picture (pixel and scene parity with v0.1.22) |
| 10 | v0.1.24 | 2026-10-26 | version number; the shared code gained a clock for bodies that read the time, Locator variables that change between one point and a list, sector disks and Opacity on points and text (v0.1.24); no change to this app's code, behaviour or picture (pixel and scene parity with v0.1.23) |
| 11 | v0.1.25 | 2026-10-26 | version number; the shared code gained one page clock (`shared/clock.js`: slider animations and app animations read it, tests fix it), tolerant `Equal`/`Unequal` in `shared/wl.js` and exact slider texts from saved states (v0.1.25); no change to this app's code, behaviour or picture (pixel and scene parity with v0.1.24) |
| 12 | v0.1.26 | 2026-10-27 | version number; the shared code gained region and density plots (`RegionPlot`, two-parameter `ParametricPlot`, `DensityPlot`), `BSplineCurve`, decorated insets, textures on polygons, `settleInterval` for bodies that pause between evaluations, typeset control headings and fixes found by the seven new ports (v0.1.26); no change to this app's code, behaviour or picture (pixel and scene parity with v0.1.25) |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|-------------|---------|-------------|---------|
| I-P3-01 | A goal control (three sliders or "use the current start as goal") | queries without random goals | adds UI the original does not have | Q-P3-09 |
| I-P3-02 | Real A* (heuristic for every node) | fewer expansions, matches the name | tie results can differ | Q-P3-05 |
| I-P3-03 | Test the end points and make the local planner symmetric | roadmap independent of the trying side | departs from the original's roadmap | Q-P3-05 |
| I-P3-04 | Colour the moving robot by its own collision state | correct feedback along the path | departs from the original's picture | Q-P3-03 |
| I-P3-05 | Trace the end effector path in the workspace | links the phase-space path to the motion | new graphics | F-P3-23 |
| I-P3-06 | Smoother C-obstacle surfaces (finer grid, surface nets, or computed in a worker) | nicer volumes | more computation | D-P3-02 |
| I-P3-07 | Test the base as drawn | collisions match the picture | differs from the original near the base | Q-P3-06 |

## 11. Errors in the original (conceptual and mathematical)

Owner rule R-C (2026-10-17). Checked: `jointAngle2Origin` against `drawRobot` (link 3's direction Rot<sub>z</sub>(θ1)·Rot<sub>y</sub>(−θ2)
applied to (cos θ3, −sin θ3, 0) gives exactly the code's o3 − o2: kinematics and drawing agree), `detCollision`
(capsules of radius widtha around the links, the base as a capsule of radius 2·widtha), `pointsegdis2` (correct, as in
robot-motion-obstacles), `toroidDist` (the flat-torus metric: correct), `pathOKTrobot`, `toroidLine`, `toroidPt`,
`connectPoints`, `myAstar` against A\*, the query and the progress walk, the labels, caption and Details (N-P3-02, K-P3-06
re-derive the saved roadmaps independently). Not listed because they have no effect: the unused Initialization data with
one edge longer than the radius and the self-referencing `{{edgesNNadj, edgesNNadj}, None}` (Q-P3-10; the saved state
overrides both).

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|------|-----------------------|--------------------------|--------------------|-------------------------|--------|
| E-P3-01 | mathematical | `myAstar`: `fScore[[nbr]] = gScore[[nbr]] + toroidDist[verts[[nbr]], verts[[nbr]]]` (under the comment `fScore[n] := gScore[n] + h(n)`) | Index typo: the heuristic h(n) must be the distance from the neighbour to the **goal**, `verts[[fi]]`; the distance of a vertex to itself is always 0, so the search is Dijkstra's algorithm, not A\* (only the start node gets a real heuristic). The path is still a shortest one (h = 0 is admissible), but more nodes are expanded and among equally short paths another one may be returned. Shared with the 2D PRM ports (prm-core `myAstar`, Q-PR-01). | Keeps it (Q-P3-05; prm-core `myAstar` text identical). | With h = distance to the goal (I-P3-02) totdist stays the same; the returned path can change only on exact ties: the saved path {71, 78, 72, 64, 70, 34} and the snapshot 4–5 path {54, 83, 73, 68, 32, 72} (golden "prm 3d: snapshots 2 to 5 Settings (second sample set) give 107 edges and no path at r = 1.19, 359 edges and path length 8.51 at r = 1.86", H-P3-01) must be re-checked; the 2D PRMs' golden replays share the function and would need the same check. | open |
| E-P3-02 | mathematical | Sphere pads `Control[{{Obstaxy, {1, 0}, blue_xy}, 3{-1, -1}, {1, 1}}]` and the same for `Obstbxy` | Typo in the range: `3{-1, -1}, {1, 1}` spans {−3, −3} … {1, 1}, so a sphere can go to −3 in x and y but never beyond 1 (the workspace plot range is ±3.5); `3{-1, -1}, 3{1, 1}` was evidently meant (the snapshots' pads show the default thumbs off-centre). | Keeps the asymmetric range (Q-P3-13). | The symmetric range changes only how far the pads reach and where their thumbs sit: unit "the sphere pads span {-3, -3} to {1, 1} (original quirk)" and the golden-snapshot pad positions change; no computed state changes. | open |
| E-P3-03 | conceptual | Query: `If[toroidDist[qs, qf] < r && pathOKTrobot[qs, qf, …], path = -2, If[!inCollision && …, … connect qs …]; If[!inCollisionf && …, … connect qf …]]` and `pathOKTrobot`, which tests only the points `i/(n + 1)` strictly between the ends and nothing for a step ≤ delta | A collision-free path must start and end in free configurations. The direct-path branch is taken before the start and goal are tested, and the local planner never tests the two end points, so a start or goal in collision is accepted as a "path" (label "path length = …") whenever it is closer than the radius to the other end; segments up to delta = 0.1 are accepted untested. | Keeps it (Q-P3-04, Q-P3-05; unit "a direct path is accepted even when the start is in collision (original quirk)", unit "pathOKTrobot accepts a segment not longer than delta without any test (original quirk)"). | Testing the end points (I-P3-03) changes results only when the start or goal collides (or a sub-delta segment crosses a sphere surface): those two unit tests, H-P3-12…15 (direct path) change; the saved and snapshot roadmaps use free samples and stay. | open |
| E-P3-04 | conceptual | `If[inCollision, Red, Brown], drawRobot[robotq, widtha]` (the moving robot) | The moving robot is coloured by the collision state of the **start** configuration, not of its own configuration `robotq`: it stays brown while passing through an obstacle on an accepted invalid path (E-P3-03) and red along a whole free path from a colliding start. The colour therefore says something false about the robot it is drawn on. | Keeps it (Q-P3-03). | Colouring by `robotq` (I-P3-04) changes the moving robot's colour only when start and current state differ: e2e "a start configuration in collision turns the start and moving robots red" and the corresponding golden-snapshot colours change. | open |
| E-P3-05 | mathematical | `detCollision`: base `pointsegdis2[{{{0,0,0}, {0,0,1+2 widtha}}, pObs3}] < obsRad + 2*widtha` and links `< obsRad + widtha`; `drawRobot`: base `Cylinder[{{0,0,-2.1}, {0,0,1+2 widtha}}, 1/8]`, links 2 and 3 `Cuboid[{…, -widtha, 1-widtha}, {…, widtha, 1+widtha}]` | The collision test uses smaller bodies than the ones drawn: the base is tested with radius 2·widtha = 0.1 but drawn with radius 1/8 = 0.125, and the square links 2 and 3 (half-width 0.05, corners 0.0707 from the axis) are tested as round capsules of radius 0.05. A sphere can overlap the drawn base by up to 0.025 and a link edge by up to 0.02 without a collision being reported. Small, but the picture and the test disagree. | Keeps the test and the drawing (Q-P3-06 for the base, Q-P3-14 for the links). | Testing the drawn sizes (I-P3-07, e.g. base radius 1/8 and capsule radius √2·widtha for links 2 and 3) can change the classification of samples near a sphere: golden "prm 3d: detCollision reproduces the 80 free and 20 colliding saved samples in order", the snapshot classifications (86/14) and the saved roadmaps must be re-checked (re-baseline or "original mode"). | open |
| E-P3-06 | text | Phase-space label `If[Length[path] == 0 && path == -1, Style["No path possible", Red], …]` | A PRM only knows that its current roadmap has no path; "No path possible" claims that none exists. Snapshots 2–3 show "No path possible" at radius 1.19 for the same samples that give a path of length 8.51 at radius 1.86 (snapshots 4–5), and the caption itself says to add vertices or increase the radius when no path is found. | Shows the label as in the original (Q-P3-15, F-P3-24). | Text only ("No path found"): e2e "restart removes the samples and the roadmap", e2e "the radius slider rebuilds the roadmap: 1.19 gives No path possible and 1.86 a path" and the golden-snapshot label of snapshots 2–3 change their expected text. | open |
