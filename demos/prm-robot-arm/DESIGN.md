# Design document: Probabilistic Roadmap Method for Robot Arm

| | |
|---|---|
| Code version: | 0.1.12 |
| Document revision | 3 (2026-10-06) — published on the main site (private-preview banner removed) |
| Status | describes the app as implemented; changes go through *Proposed changes* (§8) and [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md) |
| Original | Wolfram Demonstrations Project, "Probabilistic Roadmap Method for Robot Arm", contributed by Aaron T. Becker and Yitong Lu, published January 29, 2020 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/ProbabilisticRoadmapMethodForRobotArm/>. Readable source: [`docs/original-source/prm-robot-arm.txt`](../../docs/original-source/prm-robot-arm.txt); snapshots: `docs/original-snapshots/prm-robot-arm-*.png`; saved state: `tests/golden/prm-robot-arm.original-state.json` |
| Port files | `model.js` (collision geometry, the Manipulate body as one pure evaluation, the C-obstacle regions; pure), `workspace3d.js` (three.js workspace inset), `main.js` (outer picture and phase-space inset in SVG, locators, controls), `index.html`; shared with "Probabilistic Roadmap Method": [`demos/common/prm-core.js`](../common/prm-core.js) |
| Role in the project | further demonstration (extra proof of concept alongside the motion-planning port); developed in a separate, unpublished repository and added to this site in v0.1.12 |

## 1. Purpose and background

The probabilistic roadmap method for a two-link robot arm (link 1 turns about the vertical axis on a base, link 2
about the elbow) among two spherical obstacles (blue and orange) that the user can move. Left: the robot workspace in
3D with the start and goal configurations (translucent) and the robot at the current "progress" position. Right: the
robot's phase space (θ1, θ2 on a torus) with the sampled configurations, the roadmap, the planned path and, on demand,
the configuration-space obstacles.

## 2. Scope

In scope: the original's controls (two 2D sliders and two vertical sliders for the spheres, view angle, show
obstacles, add 100 vertices, restart, progress, radius), the two phase-space locators, collision detection, roadmap,
query, path following, both insets and their texts. Out of scope (would need a design entry first): more links or
obstacles, exact C-obstacle boundaries, keeping the 3D rotation across updates.

## 3. Users and use cases

| ID | User | Use case |
|----|------|----------|
| UC-PA-01 | student | relate robot poses in the workspace to points of the phase space and its obstacle regions |
| UC-PA-02 | student | build a roadmap, plan a path and watch the robot follow it |
| UC-PA-03 | student | move the obstacles and see the samples and the roadmap change |
| UC-PA-04 | tester | compare the port with the original's saved state and snapshots |

## 4. Features

### 4.1 Controls

| ID | Feature | Why | Since | Verified by |
|----|---------|-----|-------|-------------|
| F-PA-01 | Blue sphere: 2D slider "blue_xy" {-1,-1}…{1,1}, default {1, -0.6}; vertical slider "blue_z" 0…2, default 0.4 | move obstacle a (UC-PA-03) | v0.1.0 | e2e "the blue_xy pad moves the blue sphere"; e2e "the blue_z slider moves the blue sphere: samples are re-classified and the roadmap rebuilt"; e2e "has the controls of the original with their defaults" |
| F-PA-02 | Orange sphere: 2D slider "orange_xy", default {-0.8, 0.2}; vertical slider "orange_z" 0…2, default 1/2 | move obstacle b (UC-PA-03) | v0.1.0 | e2e "has the controls of the original with their defaults"; unit "moving an obstacle re-classifies every sample and rebuilds the roadmap" |
| F-PA-03 | "view angle" slider -π/2…3π/2, default -π/2: ViewPoint {2 Cos[viewAng], 2 Sin[viewAng], 1} of the 3D inset | look at the robot from around (UC-PA-01) | v0.1.0 | e2e "the view angle slider turns the 3D view point to {2 Cos, 2 Sin, 1}" |
| F-PA-04 | "show obstacles" checkbox (default off): the C-obstacle regions of the blue (LightBlue) and orange (LightOrange) sphere in the phase space, recomputed at "Speed" quality while a control is dragged and once at full quality on release, then kept (`highRes`) | see why samples are red (UC-PA-01) | v0.1.0 | e2e "show obstacles draws the blue and orange C-obstacle regions"; unit "the C-obstacle plot: recomputed while a control is active, once more at full quality on release, then cached"; unit "the two RegionPlot predicates together are detCollision"; unit "regionPolygons covers the orange C-obstacle at θ1 = 2.9 (the sphere direction) and not at θ1 = 0.5" |
| F-PA-05 | "add 100 vertices" button: `RandomReal[{0, 2π}, {100, 2}]` samples classified with `detCollision`, connected incrementally | build the roadmap (UC-PA-02) | v0.1.0 | e2e ""add 100 vertices" samples 100 configurations and builds the roadmap"; unit ""add 100 vertices": 100 samples classified with detCollision, roadmap built with radius 1.0" |
| F-PA-06 | "restart" button: removes all samples and the roadmap (keeps rold, obstOld and all controls) | start over | v0.1.0 | e2e "restart removes the samples, Initial settings restores the opening state"; unit "restart clears the samples but keeps rold and obstOld" |
| F-PA-07 | "progress" slider 0…1 (default 0, always enabled): robot position along the path, by arc length. It is a plain `Control[{..., ControlType -> Slider}]` inside a `Row`: NO ⊕ animation panel and no value field, as in the snapshots (the only ⊕ on the page belongs to "radius", F-PA-08) | follow the path (UC-PA-02) | v0.1.0 | e2e "has the controls of the original with their defaults"; unit "progressOnPath walks qs -> path -> qf by arc length" |
| F-PA-08 | "radius" slider 0…2, step 0.01, default 1.0, value shown, ⊕ panel (`Appearance -> "Labeled"` of an ordinary Manipulate control; its play button animates the RADIUS, which rebuilds the roadmap at every step — there is no animator for "progress", O-PA-02): full roadmap rebuild when r ≠ rold and more than 5 free samples | roadmap density (UC-PA-02) | v0.1.0 | e2e "has the controls of the original with their defaults"; unit ""add 100 vertices": 100 samples classified with detCollision, roadmap built with radius 1.0" |
| F-PA-09 | Locators pConfig (start, {5, 0}) and pConfigf (goal, {4, -1}) in the phase-space inset, `Appearance -> None`, range {xMin-.1, yMin-.1}…{xMax+.1, yMax+.1}; θ = (p - min)/(max - min) 2π; pulled past an edge they jump to the opposite edge (Q-PA-02); icons `loc[...]` red when the configuration is in collision; the Locator controls form a LocatorPane, which "by default directs any click to the nearest locator" (reference.wolfram.com/language/ref/LocatorPane.html): a press anywhere on the picture except the 3D inset moves the nearer locator there (since v0.1.1, K-PA-05; the 12 px no-jump grab zone is a port choice, D-PA-09) | choose start and goal (UC-PA-01) | v0.1.0 | e2e "dragging the start locator with the mouse changes the start configuration and the robot"; e2e "a press away from every locator moves the nearest locator there"; e2e "a start configuration in collision turns its icon and the base and robot red"; unit "locator position -> angles: (p - min)/(max - min) 2π"; unit "a locator dragged past an edge of the phase plot jumps to the opposite edge"; unit "locators are clipped to {xMin-.1, yMin-.1}..{xMax+.1, yMax+.1}" |

### 4.2 Model (`model.js`, `demos/common/prm-core.js`)

| ID | Feature | Why | Since | Verified by |
|----|---------|-----|-------|-------------|
| F-PA-10 | `detCollision`: link 1 ({0,0,1} → {Cos θ1, Sin θ1, 1}) or link 2 (from the elbow along {Sin θ1 Sin θ2, -Cos θ1 Sin θ2, Cos θ2}) closer than obsRad + widtha = 0.55 to a sphere centre, or the base segment {0,0,0} → {0,0,1.1} closer than 0.6 (`pointsegdis2`, tolerant Less) | collision test of the PRM | v0.1.0 | unit "pointsegdis2 is the distance from the nearest point to the segment (clamped to the end points)"; unit "robotSegments: link 1 from {0,0,1} along θ1, link 2 from the elbow along {Sin θ1 Sin θ2, -Cos θ1 Sin θ2, Cos θ2}"; unit "detCollision: link 1, link 2 and base against the sphere margins 0.55 / 0.55 / 0.6"; unit "the base is tested as a segment with margin 0.6 although it is drawn with radius 1/8 (original quirk)"; golden "robot arm: start (5,0) and goal (4,-1) are not in collision (hand calculation, green icons and brown base in the snapshots)"; golden "robot arm owner state: detCollision reproduces the 179 free and 21 colliding samples in order" |
| F-PA-11 | Moving an obstacle re-classifies all samples and sets rold = -1 (roadmap rebuilt when more than 5 free samples, Q-PA-06) | samples follow the obstacles (UC-PA-03) | v0.1.0 | unit "moving an obstacle re-classifies every sample and rebuilds the roadmap"; unit "an obstacle move that leaves at most 5 free samples keeps the OLD roadmap edges (no rebuild, original quirk)" |
| F-PA-12 | Roadmap, query and graph search as in the PRM Demonstration (shared core: `pathOKTrobot` = `pathOKT` with `detCollision`, `connectPoints`, direct path -2, nearest-sample connection, Dijkstra-like `myAstar`); the result lives in the Module local `path` (Q-PA-03); label "No path possible" or "Path length = x" (`Round[totdist, .01]`, italic) | plan the motion (UC-PA-02) | v0.1.0 | golden "robot arm owner state: radius 1.52 and the final spheres before two batches of 100 reproduce the 1173 edges and the adjacency in order"; golden "robot arm owner state: the saved Manipulate path stays -1 (shadowing quirk)"; unit "the Manipulate variable path is shadowed by the Module local and stays -1 even when a path exists (original quirk)"; unit "planQuery connects qs and qf to their nearest good points and searches the roadmap"; unit "a direct path is accepted even when start and goal are in collision (original quirk)"; golden "robot arm: without samples the label reads "No path possible" (snapshot 1)" |
| F-PA-13 | Robot progress `robotq` = qs without a path, else `toroidPt` along the path at "progress" | the robot in 3D and the blue point | v0.1.0 | unit "the first evaluation: no samples, rold = -1, obstOld = pObs3, "No path possible""; unit "progressOnPath at progress 1 ends on qf for irrational segment lengths"; unit "progressOnPath stops at a segment end that progress reaches within Mathematica tolerance (tolerant Less)" |
| F-PA-14 | Initial values and first evaluation as in the original (restart = True, obstOld = pObs3, rold = -1, xMin = 2.9, yMin = -2, xMax = xMin + 3.8, yMax = yMin + 3.8) | same opening state | v0.1.0 | golden "robot arm: the first evaluation of the initial settings gives the saved state"; unit "xMin = 2.9, yMin = -2, xMax = xMin + 3.8, yMax = yMin + 3.8 in machine arithmetic" |

### 4.3 Graphics

| ID | Feature | Why | Since | Verified by |
|----|---------|-----|-------|-------------|
| F-PA-15 | Outer picture: PlotRange {{-2.2, 7.1}, {-2.4, 2.4}}, ImageSize {600, 320}; texts "robot workspace" {0, 2.25}, "robot phase space" {4.8, 2.25}, the path label {4.8, 2} (italic), θ1 {4.8, -2.2}, θ2 {2.8, 0}; the two locator icons | the original's layout | v0.1.0 | e2e "loads without errors and draws the 3D workspace and the phase space"; review |
| F-PA-16 | 3D workspace inset (three.js, centred on {0, 0}, 280 px): translucent brown start and goal robots with grey edges (`draw2Drobot`: cylinder link 1, cuboid link 2), base cylinder (radius 1/8, z -0.1…1.1) brown or red when the start is in collision, the current robot at robotq in the base colour (Q-PA-04), blue and orange spheres of radius 0.5 with white specular highlights, box of PlotRange {±1.5, ±1.5, -0.1…2.4}, rotatable with the mouse | see the robot and obstacles (UC-PA-01) | v0.1.0 | e2e "loads without errors and draws the 3D workspace and the phase space"; e2e "a start configuration in collision turns its icon and the base and robot red"; unit "draw2Drobot geometry (Rotate q2 about x through {1,0,1}, then q1 about z through {0,0,1}) matches the segments detCollision tests"; review |
| F-PA-17 | Phase-space inset (SVG): {0, 0} of the plot at {xMin, yMin}, width 3.8; frame Red (left), Red dashed (right), Blue (bottom), Blue dashed (top) with ticks; clipped to 0…2π; drawing order: C-obstacles, path (Thickness 0.02 Magenta / Green with Orange wrapped pieces, black end points), dark green and red samples, roadmap edges (Brown, Lighter[Brown] wrapped pieces) on top of the points, blue robot point (PointSize 0.04) | the original's phase plot (UC-PA-01) | v0.1.0 | e2e "loads without errors and draws the 3D workspace and the phase space"; e2e "show obstacles draws the blue and orange C-obstacle regions"; review |
| F-PA-18 | Title, caption and details text of the original | explains the Demonstration | v0.1.0 | M-PA-01 |

### 4.4 Port additions

| ID | Feature | Why | Since | Verified by |
|----|---------|-----|-------|-------------|
| A-PA-01 | "Initial settings" button: the opening state (controls, locators, no samples) | stands in for the Manipulate ⊕ menu → Initial Settings | v0.1.0 | e2e "restart removes the samples, Initial settings restores the opening state" |
| A-PA-02 | Arrow keys move a focused locator (0.05; Shift = 0.25) | keyboard access | v0.1.0 | e2e "arrow keys move a focused locator (port addition)" |
| A-PA-03 | `window.__demo` automation hook: `getState`, `view`, `setRng`, `loadState`, `moveLocator`, `worldToClient`, `phaseToClient`, `inkFraction`, `camera`, `robotColor` | automated tests | v0.1.0 | e2e "a start configuration in collision turns its icon and the base and robot red" |
| A-PA-04 | "All demos" link (the private-preview banner of v0.1.0–v0.1.1 was removed in v0.1.12, when publication was cleared) | site navigation | v0.1.0 | inventory; M-GEN-01 |
| A-PA-05 | Credit footer: original title, authors, licence, adaptation notice | required by CC BY-NC-SA 3.0 | v0.1.0 | e2e "attribution on" |
| A-PA-06 | Start-up notice (watchdog, `<noscript>`) when the page cannot start; when WebGL 2 is missing, a notice in the 3D inset only (the page has no `data-needs-webgl2`, owner's choice for this hybrid page) and the phase space keeps working | a clear message instead of an empty or dead page (DEC-22) | v0.1.0 | e2e "start-up notice when"; e2e "WebGL 2 notice on"; e2e "without WebGL 2 the 3D inset shows a notice and the phase space keeps working" |
| A-PA-07 | URL parameter `?seed=N` (whole number): reproducible samples (default: unseeded, like the original) | reproducible runs | v0.1.0 | e2e "?seed=N gives reproducible samples (port addition)" |
| A-PA-08 | The 3D inset redraws itself after a WebGL context loss and restore (shared viewer) | robustness (GPU resets) | v0.1.0 | e2e "the 3D view redraws after a WebGL context loss" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|-------------|---------|
| `pad-blue-xy` | F-PA-01 |
| `value-blue-xy-*` | F-PA-01 |
| `vslider-blue-z` | F-PA-01 |
| `pad-orange-xy` | F-PA-02 |
| `value-orange-xy-*` | F-PA-02 |
| `vslider-orange-z` | F-PA-02 |
| `slider-view-angle` | F-PA-03 |
| `check-show-obstacles` | F-PA-04 |
| `button-add-vertices` | F-PA-05 |
| `button-restart` | F-PA-06 |
| `slider-progress` | F-PA-07 |
| `slider-radius` | F-PA-08 |
| `value-radius` | F-PA-08 |
| `plus-radius` | F-PA-08 |
| `play-radius` | F-PA-08 |
| `stepback-radius` | F-PA-08 |
| `stepfwd-radius` | F-PA-08 |
| `locator-*` | F-PA-09, A-PA-02 |
| `scene-canvas` | F-PA-16, A-PA-08 |
| `reset` | A-PA-01 |
| `crumbs` | A-PA-04 |
| `details` | F-PA-18 |
| `credits` | A-PA-05 |

## 6. Design

- The shared PRM functions (`toroidDist`, `pathOKT`, `myAstar`, `toroidLine(s)`, `toroidPt`, `connectPoints` core,
  the query and progress code, the `loc` icon) are in `demos/common/prm-core.js`; `model.js` adds this
  Demonstration's own functions under the original names (`pointsegdis2`, `isCollided`, `detCollision`,
  `pathOKTrobot`, `connectPoints[goodPts, edgesNNadjin, pObs3, obsRad, widtha, delta, edgesNNin, point2start, r]`,
  `draw2Drobot` as data) and `evaluate(state, rng, {controlActive})`, one evaluation of the Manipulate body.
- `freeConfigSpace` in the state describes the RegionPlot (obstacle positions and quality, or none); `main.js` turns
  it into SVG paths (cached) with `regionPolygons` (grid + marching squares, D-PA-01).
- `main.js` draws the outer Graphics as one SVG (y up) with the phase-space inset as a scaled group in the original's
  coordinates; the three.js canvas of the workspace inset lies UNDER the SVG (whose texts are drawn over it); the SVG
  lets pointer events through except on the phase panel and the locators, so the 3D view can be rotated with the
  mouse. `ControlActive` is true while a slider, pad or locator is dragged; on release the body is evaluated once more,
  as Mathematica does.
- `workspace3d.js` builds the Graphics3D with `shared/three-helpers.js` (camera from ViewPoint, Mathematica-like
  lights, orbit controls, context-loss recovery). Without WebGL 2 it shows a notice instead.

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

| ID | Kind | Description |
|----|------|-------------|
| Q-PA-01 | quirk kept | The base is drawn as a cylinder of radius 1/8 from z = -0.1 to 1.1 but tested as the segment z = 0…1.1 with margin obsRad + 2 widtha = 0.6, i.e. a capsule of radius 0.1 around the axis that reaches up to z = 1.2. Above the drawn top (z 1.1…1.2) the test reports contact with nothing drawn: a sphere centred at (0, 0, 1.69) counts as colliding although it touches neither base nor link 1. Sideways the capsule (0.1) is thinner than the drawn cylinder (0.125): a sphere 0.61 from the axis overlaps the drawn base without a collision. Below z = 0 the capsule lies inside the drawn cylinder. |
| Q-PA-02 | quirk kept | A locator pulled past an edge of the phase plot jumps to the opposite edge (`pConfig[[1]] = xMax`), it is not shifted. |
| Q-PA-03 | quirk kept | The Module local `path` shadows the Manipulate variable `path`, which is never written and stays -1 (the saved state shows -1). |
| Q-PA-04 | quirk kept | `If[inCollision, Red, Brown]` colours the base AND the current robot drawn after it: the moving robot is red whenever the START configuration is in collision, wherever it is. |
| Q-PA-05 | quirk kept | Each evaluation creates a new Graphics3D with ViewPoint {2 Cos[viewAng], 2 Sin[viewAng], 1}; a rotation made with the mouse lasts only until the next update (any control or locator change). Known Manipulate behaviour, to be confirmed (K-PA-04). |
| Q-PA-06 | quirk kept | After an obstacle move that leaves at most 5 free samples, the roadmap is not rebuilt (`Length[goodPts] > 5`): the OLD edges stay drawn although their end points may now be red. |
| Q-PA-07 | quirk kept | The C-obstacle plot is computed only when "show obstacles" is on and cached in `freeConfigSpace` while `highRes` is True; it is recomputed only after an obstacle move, a restart or switching it off and on. |
| Q-PA-08 | quirk kept | The roadmap edges are drawn after (on top of) the sample points, the reverse of the PRM Demonstration. |
| Q-PA-09 | quirk kept | The shared PRM quirks: Dijkstra-like "A*", end points of the local planner untested, directional planner, incremental connection of new samples, single-candidate connection of start and goal (see `demos/prm/DESIGN.md` Q-PR-01, -03, -04, -05, -07; the direct-path case is Q-PA-11). |
| Q-PA-10 | quirk kept | The "progress" slider is never disabled (unlike the PRM Demonstration); without a path the robot stays at the start. |
| Q-PA-11 | quirk kept | A direct path is accepted even when the start or the goal is in collision: the direct test (`toroidDist[qs, qf] < r && pathOKTrobot[...]`) comes before the `!inCollision` / `!inCollisionf` checks, which are only in its else branch, and the planner does not test end points. E.g. start at θ1 = 2.9 (link 1 in the orange sphere) and goal 0.08 away: red icons and base, "Path length = 0.08". |
| D-PA-01 | deviation | RegionPlot is replaced by sampling the margin field (minimum of distance - limit over the three segments) on a grid over [0, 2π]² (48 × 48 while dragging, 160 × 160 at rest) with marching squares; fill LightBlue / LightOrange, boundaries in the default plot colours (ColorData[97] 1 and 2, as in the snapshots). Boundaries are approximate (Mathematica refines adaptively). |
| D-PA-02 | deviation | The 3D inset is drawn with three.js: Mathematica's default lighting, `Specularity[White, 10]`, `EdgeForm`, tessellation and the automatic view angle are approximated (camera fitted to the box's bounding sphere). |
| D-PA-03 | deviation | Layout: the 3D inset is a separate canvas under the SVG, placed from ImageSize {600, 320} and the inset's 280 px; fonts and tick lengths approximate Mathematica's. |
| D-PA-04 | deviation | `PointSize[Medium]` drawn as 4.5 px and default lines as 1 px — estimated from the snapshots. |
| D-PA-05 | deviation | In the 3D inset the colours are used without sRGB-to-linear conversion and the output is not re-encoded, so the lighting acts on the sRGB values as in Mathematica's renderer. The lights are Mathematica's documented default lights (`shared/mma-lighting.js`, Lighting reference page); the light anchor (shining toward the image centre) is an assumption. |
| D-PA-06 | deviation | JavaScript cannot reproduce Mathematica's random numbers; samples differ from the original's runs (the saved state holds no samples). |
| D-PA-07 | deviation | While dragging, the port evaluates once per animation frame; Mathematica decides its own update rate. ControlActive is approximated: true while a slider, pad or locator is dragged with the mouse, false for keyboard changes. |
| D-PA-08 | deviation | Controls are the shared Manipulate-style controls: the 2D sliders show editable x/y fields (the original shows none), labels sit above the controls, the vertical sliders show no value as in the original. |
| D-PA-09 | deviation | Locator picking (shared/svg-plot.js): a press within 12 px of a locator grabs it in place (no jump), a press farther away makes the nearest locator jump there (LocatorPane); a grabbing press gives the locator keyboard focus. Mathematica's no-jump distance is not known; 12 px is a port choice (M-PA-08). |
| K-PA-01 | known issue (lead) — **resolved** in v0.1.1 | `Nearest` tie order, radius inclusiveness and `Position` tolerance: resolved as K-PR-01 and K-PR-02 of the PRM Demonstration (extra-checks.wls, Mathematica 15.0.1, owner run 2026-10-06; the radius check is labelled K-PR-04 in that run): input order, inclusive radius, Position/SameQ treat 1 ulp as equal; the port matches or is unaffected (goodPts lookups always find the identical element). Owner state 1 reproduces classification, edges and adjacency bit for bit. |
| K-PA-02 | known issue (lead) | Last-bit arithmetic: `(p - xMin)/(xMax - xMin) 2π` (xMax - xMin is 3.7999999999999994 in machine arithmetic, the port uses it too) and `pointsegdis2`'s divisions may round differently in Mathematica; this matters only exactly on a collision boundary. |
| K-PA-03 | known issue (lead) | The resolution Mathematica's RegionPlot uses at "Speed" (while dragging) and at "Quality" is not known; the port's 48 / 160 grids are guesses. |
| K-PA-04 | known issue (lead) | Whether a mouse rotation of the original's 3D inset survives a re-evaluation of the body (Q-PA-05 assumes it does not; M-PA-04). |
| K-PA-05 | known issue (lead) | Picking in the original, three open points (M-PA-08): (a) the LocatorPane covers the whole outer Graphics including the 3D inset — does a press on the 3D inset move the nearest locator or rotate the view? The port rotates. (b) Presses in the strips outside both insets also go to the nearest locator, with the clamp and the torus jump: e.g. a press at outer (2.5, 0) moves the goal locator to x = 2.8 (clamped), which is < xMin, so it jumps to the right edge (6.7, 0) — the port does this; check the original. (c) The icons are `Locator[pConfig, ...]` / `Locator[pConfigf, ...]` primitives inside the Graphics (prm-robot-arm.txt lines 359–360); whether a press on such an inner Locator goes to it (moving only the icon) or to the Manipulate's locator is not documented; the port sends it to the Manipulate's locator. |
| O-PA-01 | owner observation | Owner testing round 1 (Mathematica 15.0.1, 2026-10-06): the port reacts more smoothly than the original (expected: the original rebuilds the roadmap and the RegionPlot in the kernel on every update, D-PA-07). |
| O-PA-02 | owner observation | "The port's play button seems to animate the radius slider, not progress": faithful — in the original the ⊕ animator belongs to the radius slider (`Appearance -> "Labeled"`), progress is a plain Slider inside a Row without ⊕ (snapshots 1–5 show the same). See F-PA-07, F-PA-08, M-PA-06. |
| O-PA-03 | owner observation | Owner state 1 (Mathematica 15.0.1, saved 2026-10-06): samples, classification, 1173 edges and adjacency are reproduced bit for bit by replaying radius 1.52 and the final sphere positions before two batches (golden tests). For that state the port finds a path and shows "Path length = 3.58" (the saved `path` is -1 because of Q-PA-03); this value comes from the port itself and is only a regression pin (golden "regression pin of the port path label") until it is compared with the original's label (M-PA-06). |
| N-PA-01 | note | `w = 1/8`, `l = 1`, `isCollided`, `linDist` and `pathOK` are defined but not used by the original. |
| N-PA-02 | note | `pObsOld = pObs3` in the restart branch assigns the Module local pObs3 before it has a value; pObsOld then shows that evaluation's pObs3 (as in the saved state) and is never used. Owner state 1 confirms it: pObsOld holds {{-0.02, -0.47, 2}, {0.09, -0.84, 0.34}}, sphere positions from the evaluation of the last restart, not the current ones. |
| N-PA-03 | note | The saved state holds no samples; it equals the first evaluation of the initial settings. Hand calculation: the start (5, 0) is θ = (3.4723, 3.3069), 0.0589 outside the orange sphere's margin (link 2); the goal (4, -1) is θ = (1.8188, 1.6535), clear of both spheres. Both icons are green and the base is brown, as in snapshot 1; in snapshot 3 the start locator sits right next to the orange C-obstacle. Snapshots 2–5 show random runs with samples (not reproducible). |

## 8. Proposed changes

No open proposal. Template (see [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md)):

| ID | Status | Requested by / date | Change | Reason | Acceptance criteria |
|----|--------|---------------------|--------|--------|---------------------|

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.0 | 2026-10-06 | first AI conversion: feature list, quirks and deviations written with the port |
| 2 | v0.1.1 | 2026-10-06 | owner testing round 1 (after an independent review): K-PA-01 resolved (incl. Position), K-PA-05 extended (strips, inner Locator icons), D-PA-09 (12 px grab zone), owner-state citations moved to F-PA-10/F-PA-12, path label marked as regression pin; LocatorPane press-anywhere picking outside the 3D inset (F-PA-09, K-PA-05); progress/radius animator stated (F-PA-07, F-PA-08, O-PA-02); K-PA-01 partly resolved; owner state 1 golden tests (O-PA-03); O-PA-01 |
| 3 | v0.1.12 | 2026-10-06 | added to this repository and published: private-preview banner removed (A-PA-04), role line updated; no other feature changes. Versions v0.1.0 and v0.1.1 in this document (Since column, rows above) are versions of the separate repository the app was developed in, not of this repository |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|-------------|---------|-------------|---------|
| I-PA-01 | Test the base as drawn (cylinder of radius 1/8 from z = -0.1) | collisions match the picture | differs from the original's results near the base | Q-PA-01 |
| I-PA-02 | Keep the user's 3D rotation across updates (a dynamic view point) | the 3D view can be studied while moving the locators | departs from the original's behaviour | Q-PA-05 |
| I-PA-03 | Clear or rebuild the roadmap after every obstacle move, also with few free samples | no stale edges | differs from the original | Q-PA-06 |
| I-PA-04 | Exact C-obstacle boundaries (adaptive refinement or analytic contours) | more faithful obstacle shapes | more computation; the original is also approximate | D-PA-01 |
