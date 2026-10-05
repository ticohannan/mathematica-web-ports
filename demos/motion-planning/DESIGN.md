# Design document: Motion Planning for Robot Path around Obstacles

| | |
|---|---|
| Code version: | 0.1.11 |
| Document revision | 4 (2026-10-03) — first comparison after P-MP-01; division as in Mathematica; K-MP-03…05 updated |
| Status | describes the app as implemented; changes go through *Proposed changes* (§8) and [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md) |
| Original | Wolfram Demonstrations Project, "Motion Planning for Robot Path around Obstacles" by Shreyas Poyrekar, Aaron T. Becker and Arifa Sultana (CC BY-NC-SA 3.0); author notebook made with Mathematica 10.2. Readable source: [`docs/original-source/motion-planning.txt`](../../docs/original-source/motion-planning.txt) |
| Port files | `planner.js` (computation, pure), `main.js` (SVG drawing and interaction), `index.html` (page) |

## 1. Purpose and background

The original Demonstration teaches **motion planning for a polygonal robot among polygonal
obstacles**. Its caption: "Motion planning seeks a continuous sequence of valid configurations for a
robot to move from the initial position to the destination position. Valid configurations do not
enter or collide with any obstacle." The Details text explains the standard textbook method that the
app makes visible step by step:

1. reject start/goal positions that collide with an obstacle or leave the workspace;
2. map each obstacle into the robot's **configuration space** with a Minkowski sum (and shrink the
   boundary accordingly), so the robot can be treated as a point (its centre);
3. build a **visibility graph** from the start, the goal and the C-obstacle vertices (visible
   bitangent lines);
4. find the **shortest path** in that graph (A*), and animate the robot along it.

Every visual element exists to show one of these steps; the controls exist so a learner can move
things and watch the steps react. The port's purpose is to make this Demonstration run in any modern
browser without Wolfram software, **faithfully**: same controls, same pictures, same numbers
(see `compare`). It is also the subject of a course assignment that evaluates an AI-assisted
conversion, which is why faithfulness is preferred over "improvements": the delivered code reproduces
the original's behaviour, quirks included (§7), and ideas for improving the app are collected,
unimplemented, in §10 (owner decision, 2026-10-03).

## 2. Scope

In scope: everything the original Manipulate shows and lets the user do (§4.1–4.4), plus a few
port additions for testing, accessibility and sharing (§4.5), each labelled `A-MP-nn`.

Out of scope (would each need a design entry first): other planning algorithms, robot rotation, more
or fewer obstacles, other obstacle shapes, saving scenes, touch-specific gestures beyond pointer
events, fixing the original algorithm's quirks (§7) — candidates are listed in §10.

## 3. Users and use cases

| ID | User | Use case |
|----|------|----------|
| UC-MP-01 | student | move the robot and obstacles and see where a path exists and what it looks like |
| UC-MP-02 | student | switch to configuration space to understand C-obstacles (Minkowski sums) |
| UC-MP-03 | student | follow the robot along its path with the progress slider or its animation |
| UC-MP-04 | tester / grader | compare the port with the original: same scene, same numbers, same picture |
| UC-MP-05 | tester | reproduce a scene exactly and share it (link), read exact numbers |

## 4. Features

Columns: **Why** = the reason the feature exists; **Since** = first code version with it;
**Verified by** = tests and checks (see [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md)).

### 4.1 Controls (original Manipulate, `ControlPlacement -> Left`)

| ID | Feature | Why | Since | Verified by |
|----|---------|-----|-------|-------------|
| F-MP-01 | View setter "workspace" / "configuration space" (default workspace) | shows the same problem in both spaces — the core idea of the method (UC-MP-02) | v0.1.0 | e2e "configuration space view shows C-obstacles"; M-MP-10 |
| F-MP-02 | Heading "number of sides" above the two side-count setters | original layout; groups the shape controls | v0.1.0 | M-MP-01 |
| F-MP-03 | Boundary sides setter 3 / 4 / 5 (default 4) | shows how the workspace shape changes the free space | v0.1.0 | e2e "boundary sides setter changes the boundary polygon"; M-MP-06 |
| F-MP-04 | Robot sides setter 3 / 4 / 5 (default 3) | shows how the robot's shape changes the C-obstacles | v0.1.0 | e2e "robot sides setter changes the robot polygon"; M-MP-07 |
| F-MP-05 | "progress" slider without a value field, 1 … number of path points, step 1, with the ⊕ animation panel (step back, play/pause, step forward; the animation sweeps the range in 8 s and loops) | moves the robot along its path (UC-MP-03) | v0.1.0 | e2e "progress slider moves the robot along the path"; M-MP-08 |
| F-MP-06 | Six draggable locators: start r1 (−2, 2.75), goal r2 (0.5, −3), obstacles o1 (2, 2.5), o2 (−1, −0.5), o3 (−2, −2.4), o4 (2, −1); robot locators kept in [−4.25, 4.15]², obstacle locators in [−3.75, 3.75]² | direct manipulation of the planning problem (UC-MP-01) | v0.1.0 | e2e "dragging the start locator with the mouse"; e2e "locators stay inside their ranges"; M-MP-02; M-MP-03; M-MP-04; M-MP-05 |
| F-MP-07 | Progress resets to 1 when a locator or the robot side count changes | a new path starts at its beginning | v0.1.0 | e2e "robot sides setter changes the robot polygon and resets progress" |

### 4.2 Computation (`planner.js`, function-by-function port of the original)

| ID | Feature | Why | Since | Verified by |
|----|---------|-----|-------|-------------|
| F-MP-10 | Boundary: regular x-gon of radius 5 (x < 5) or 4.75 (x = 5), centred vertically | the workspace | v0.1.0 | unit "boundary polygons are centred vertically"; M-MP-06 |
| F-MP-11 | Robot: regular n-gon of radius 0.5 at the start and at the goal | the robot at both ends of the task | v0.1.0 | golden "robot polygons (bit-identical)" |
| F-MP-12 | Obstacles: o1 triangle, o2 square, o3 pentagon, o4 hexagon, radius 0.5 | four obstacles of different shapes | v0.1.0 | golden "obstacle polygons (bit-identical)" |
| F-MP-13 | C-obstacle of each obstacle = Minkowski sum with the reflected robot (`ConvexMinkowskiSumRev3`), vertex order as in the original | step 2 of the method | v0.1.0 | golden "Minkowski sums (C-obstacles), vertex for vertex"; unit "property: robot overlaps obstacle"; compare |
| F-MP-14 | Configuration-space boundary: the boundary shrunk by the robot (`configBoundaryFunc`) | step 2 (inverse Minkowski sum of the boundary) | v0.1.0 | unit "square boundary, triangle robot"; compare |
| F-MP-15 | Start and goal validity: centre inside the C-boundary and outside every C-obstacle (`testpoint`) | step 1 | v0.1.0 | unit "start inside an obstacle -> invalid"; unit "robot partly outside the boundary -> invalid"; compare |
| F-MP-16 | Vertices visible from the start and from the goal (rotational sweep, `visiblePolys`) | step 3 | v0.1.0 | golden "visibility lines from the start (bit-identical)"; golden "visibility lines from the end (bit-identical)"; compare |
| F-MP-17 | Visible bitangent lines between C-obstacles (`visBiLineRev2`, `biTangents2polyRev1`) | step 3 | v0.1.0 | golden "visible bitangent lines between C-obstacles (bit-identical)"; compare |
| F-MP-18 | C-obstacle edges that cross no other C-obstacle edge are added to the graph; graph nodes outside the C-boundary are removed | completes the graph so paths can slide along obstacle edges and stay inside the workspace | v0.1.0 | golden "discretised path (robot trajectory)"; compare |
| F-MP-19 | Straight path when the start–goal line crosses no C-obstacle edge | shortest possible path; no graph needed | v0.1.0 | unit "direct line when nothing is in the way" |
| F-MP-20 | Shortest path through the graph (`myAstarRev2`); "no path" when the goal is unreachable | step 4 | v0.1.0 | unit "finds the shorter of two routes"; unit "returns -1 when the goal is unreachable"; unit "default scene: path is the hand-checkable"; compare |
| F-MP-21 | Path discretised every 0.09 units, goal appended (`discretizeLineRev1`) → the progress positions | smooth robot animation | v0.1.0 | unit "discretises a segment every 0.09 units"; golden "discretised path (robot trajectory)" |
| F-MP-22 | Mathematica's own floating-point results for `Det`, `Norm`, `Normalize` and `ArcTan` (bit for bit) and for `VectorAngle` (as closely as known, K-MP-02), in `shared/mma-exact.js` (from P-MP-01); since v0.1.8 also division as Mathematica evaluates it, `a/b` = `a·b⁻¹` (`linelineInt`, `λ`) | near-degenerate scenes then take the same decisions as the original (visibility, intersections, validity) and give the same picture and path | v0.1.7 | unit "results recorded from Mathematica"; unit "matches exact BigInt arithmetic"; unit "the unrolled 2x2 path follows the general algorithm"; unit "configBoundaryFunc reproduces the original bit for bit"; compare |

### 4.3 Graphics (drawn in the order of the original `Graphics[…]`, plot range ±4.65, image size 425)

| ID | Feature | Why | Since | Verified by |
|----|---------|-----|-------|-------------|
| F-MP-30 | Background square ±4.75: white; in configuration space red when the start or the goal is invalid | signals an impossible task | v0.1.0 | e2e "start inside an obstacle: robot drawn red"; M-MP-11 |
| F-MP-31 | Workspace: LightYellow boundary, LightRed obstacles, LightBlue start robot and LightGreen goal robot (red when invalid), thin black edges | the real-world picture | v0.1.0 | M-MP-01; review |
| F-MP-32 | Workspace: path in dark green (50 %), the travelled part solid, an orange half-transparent robot and a red point at the progress position | shows the robot moving along the path | v0.1.0 | e2e "progress slider moves the robot along the path"; M-MP-08 |
| F-MP-33 | Configuration space: LightGray C-boundary with a black edge, C-obstacles white (red if the start or goal is inside) at 50 % opacity, light-green path, dark-green point at the progress position when progress ≠ 1 | the planning picture | v0.1.0 | e2e "configuration space view shows C-obstacles"; M-MP-10 |
| F-MP-34 | Both views, all at 25 % opacity: orange lines visible from the start, purple lines visible from the goal, blue bitangent lines | shows the visibility graph | v0.1.0 | M-MP-12; golden "visibility lines from the start (bit-identical)" |
| F-MP-35 | Both views: gray outlines (70 % opacity) of the C-obstacles and C-boundary, red points at C-obstacle vertices | shows the C-obstacles also in the workspace view | v0.1.0 | M-MP-12 |
| F-MP-36 | "No path exists." in large dark-red text at start + (0, 0.5) when there is no path | tells the user the task is impossible | v0.1.0 | e2e "start inside an obstacle: robot drawn red and" |

### 4.4 Page content

| ID | Feature | Why | Since | Verified by |
|----|---------|-----|-------|-------------|
| F-MP-40 | Title, caption and the original's Details text (four steps, references), collapsible | explains the method; part of the original | v0.1.0 | M-MP-14 |

### 4.5 Port additions (not in the original — flag them in any comparison)

| ID | Feature | Why | Since | Verified by |
|----|---------|-----|-------|-------------|
| A-MP-01 | "Initial settings" button: restores all controls and locators | stands in for the Manipulate ⊕ menu → Initial Settings | v0.1.0 | inventory; M-MP-01 |
| A-MP-02 | "show numbers" checkbox and readout: start/goal, validity, path vertices and length, graph size, link to the scene | lets testers check calculations exactly and share scenes (UC-MP-04, UC-MP-05) | v0.1.0 | inventory; M-MP-12 |
| A-MP-03 | Scene from URL parameters `?r1=x,y&r2=…&o1…o4=…&n=3&x=4&view=config` (values clamped to the locator ranges) | reproducible test cases and links from reports (UC-MP-05) | v0.1.0 | e2e "a scene can be opened from a link" |
| A-MP-04 | Arrow keys move a focused locator by 0.05 (Shift: 0.25) | keyboard accessibility and precise positioning | v0.1.0 | e2e "keyboard: arrow keys move a focused locator"; M-GEN-04 |
| A-MP-05 | `window.__demo` automation hook (read/set state, read results) | automated browser tests and the comparison tools | v0.1.0 | e2e "loads without errors with the original default scene" |
| A-MP-06 | "All demos" link back to the landing page | site navigation | v0.1.0 | inventory; M-GEN-01 |
| A-MP-07 | Credit footer: original title, authors, licence, adaptation notice, links to this document and LICENSE.md | required by the CC BY-NC-SA 3.0 licence | v0.1.1 | e2e "attribution on" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest
ancestor). `*` matches any text. The browser test "every control on … is specified in its design
document" fails if the page has an element not listed here, or a row here matches nothing.

| data-testid | Feature |
|-------------|---------|
| `setter-configOrWork-*` | F-MP-01 |
| `setter-x-*` | F-MP-03 |
| `setter-n-*` | F-MP-04 |
| `*-s` | F-MP-05 |
| `locator-*` | F-MP-06, A-MP-04 |
| `details` | F-MP-40 |
| `reset` | A-MP-01 |
| `show-readout` | A-MP-02 |
| `crumbs` | A-MP-06 |
| `credits` | A-MP-07 |

## 6. Design

- **Pure model, separate rendering.** `planner.js` contains only computation: each original
  function is ported with the same name, arguments and order of operations, so that its results can be
  compared with the original number for number. `computeScene(state)` evaluates the whole Manipulate
  body for one set of control values and returns every quantity that is drawn. `main.js` owns the
  state, builds the controls (`shared/ui.js`), draws the SVG and handles pointer and keyboard input.
- **State.** `{configOrWork, x, n, s, r1, r2, o1…o4}` — the Manipulate variables of the original.
  Moving a locator or changing x or n recomputes the scene (on the next animation frame while
  dragging) and redraws it; the view setter and the progress slider only redraw.
- **Numbers.** Wolfram Language semantics the original depends on are reproduced in `shared/mma.js`
  (argument order of `ArcTan`, tolerant `Equal`/`Less`, `Chop`, `Mod`, exact `CirclePoints`, `Sort`
  tie order, compensated `Total`, `EuclideanDistance`). Last-bit agreement matters: it decides
  near-degenerate visibility and validity questions. Since v0.1.7 (F-MP-22) `shared/mma-exact.js`
  computes `Det`, `Norm`, `ArcTan` and `VectorAngle` the way Mathematica 15.0.1 was measured to
  (`npm run compare:original -- --trace`): `Det` = LU factorisation of the transposed matrix with
  partial pivoting and fused multiply-add updates; `Norm` = BLAS `dnrm2` scaling; `ArcTan` =
  correctly rounded `atan2`; `Normalize` = multiplication by `1/Norm`. JavaScript has no fused
  multiply-add and its `Math.atan2` is not correctly rounded, so both are computed with double-double
  arithmetic, with an exact BigInt fallback for the rare cases the fast path cannot prove.
  Division: Mathematica evaluates `a/b` as `Times[a, Power[b, -1]]`, i.e. `a * (1/b)` with two
  roundings; the port writes such divisions the same way (v0.1.8; found through `configBoundaryFunc`).
  Cost: none measurable — the same version replaced a string-based comparison in `visiblePolys`
  with a structural one, and a whole scene computes in about 35 ms in Node (41 ms in v0.1.6).
- **Drawing.** SVG in the original's coordinates (y up); Mathematica sizes (`Thin`, `Thick`,
  `Thickness`, `PointSize`, "Large" text) converted for the 425-pixel image size.
- **Verification.** Golden tests compare with results stored in the original notebook; the
  comparison tool (`npm run compare:original`) runs the original code in Mathematica on many scenes;
  an independent reference planner checks paths for collisions and optimality.

## 7. Deviations (D), original quirks kept (Q), known issues (K)

| ID | Kind | Description |
|----|------|-------------|
| D-MP-01 | deviation | Progress `s` is clamped to the new path length when the path gets shorter without a reset (e.g. boundary change). Original behaviour for s > Length[discretePath] unknown (likely a Part error). |
| D-MP-02 | deviation | If start or goal is missing from the graph (all their lines were removed) the port reports no path; the original evaluates `First@@{}` (error, silenced by `Quiet`) with undefined result. |
| D-MP-03 | deviation | Progress slider disabled only when the start or goal is invalid (the original's range is then 1…0). With valid ends but no route the path is {goal}, so the slider stays enabled with range 1…1, as in the original. |
| D-MP-04 | deviation | Locator look approximates Mathematica's; clicking on empty space does not move a locator (Mathematica's LocatorPane may move the nearest locator — verify in the original, M-MP-05). |
| D-MP-05 | deviation | Line widths: `Thin` = 0.5 px, `Thick` = 2 px, "Large" text = 18 px at nominal size — approximations of Mathematica's sizes. The progress slider is 120 px wide (original `ImageSize -> 90`); its animation speed (8 s per sweep) is a guess. |
| D-MP-06 | deviation | The original caches intermediate results (`prev*` variables) and recomputes the C-obstacles only when an obstacle or the robot shape changes; the port recomputes everything on each change. The C-obstacle coordinates depend in their last bits on where the robot stood when they were computed, and in near-degenerate scenes that can change the path or the validity, so the interactive original can give different results for the same scene depending on the order of drags. The port always gives the result of a fresh computation. Check with `npm run compare:original -- --history`. (Corrected in v0.1.3; first described as affecting speed only.) |
| Q-MP-01 | quirk kept | `myAstarRev2` heuristic is `EuclideanDistance[verts[[nbr]], verts[[nbr]]]` = 0 → it is Dijkstra's algorithm (still optimal on its graph). |
| Q-MP-02 | quirk kept | `angleSortCond` tie-break compares a distance with an angle (`c < b`, intended `c < d`). |
| Q-MP-03 | quirk kept | In `visiblePolys` one `SegmentIntersectionQ` call has the wrong argument shape and never evaluates; the port reproduces the resulting no-op. |
| Q-MP-04 | quirk kept | `getClockwiseAngle` forces the angle to 0 when the two vectors agree in either coordinate. |
| Q-MP-05 | quirk kept | `SegmentIntersectionQ` ignores intersections at endpoints and treats parallel/collinear segments as non-intersecting. |
| Q-MP-06 | quirk kept | `testpoint`: points exactly on a polygon edge count as outside. |
| Q-MP-07 | quirk kept | Minkowski sum keeps collinear intermediate vertices for parallel edges, in Mathematica's tie order. |
| Q-MP-08 | quirk kept | C-obstacles are built from the robot START polygon; overlapping obstacles are not merged — edges that cross another C-obstacle edge are dropped from the graph instead. |
| Q-MP-09 | quirk kept | Obstacles are not checked against the boundary or each other. |
| K-MP-01 | known issue (cause fixed in v0.1.7; see K-MP-05) | In v0.1.4 the comparison with the original (Mathematica 15.0.1) matched in 52 of 65 freshly computed scenes; 13 differed, 3 with a different path. Cause: `Det` rounding in `LineIntersectionPoint` → `SegmentIntersectionQ` endpoint tests → `visiblePolys`. Fixed by P-MP-01 / F-MP-22. Owner's run on v0.1.7: 60 of 65 scenes match, **the path is the original's in all 65**; the 5 remaining differences are K-MP-05. |
| K-MP-02 | known issue | `VectorAngle`: the best formula found matches Mathematica bit for bit in about 87 % of calls; the rest differ by one unit in the last place. It enters only `getClockwiseAngle`, whose results are compared with other angles; in the traced scenes this never changed a decision. |
| K-MP-03 | known issue | `getClockwiseAngle` returns `N[2 Pi, 3]` — a 3-digit arbitrary-precision number — when its angle is forced to 0 (Q-MP-04) and the cross product is negative; the port returns the machine number 2π. Measured in Mathematica 15.0.1 (v0.1.7 trace, section 1d): such a number counts as *equal* to machine numbers within about 0.016 of 2π (6.27 and 6.29 compare equal; 6.25 is smaller, 6.30 larger), so `intersectInteriorQRev2` can differ when the other angle lies in that band. A model of this changes no decision in any of the 65 comparison scenes; the exact limits are measured by the next trace run (bisection, section 1d) and the rule will then be reproduced. |
| K-MP-04 | known issue (fixed in v0.1.8) | The configuration-space boundary differed from the original in the last bit in most scenes (all 48 "last-bit" scenes of the v0.1.7 run). Cause: the port computed `a/b` in `linelineInt`; Mathematica computes `a·b⁻¹`. Fixed; bit-identical in the traced scenes C2, C3, R016. |
| K-MP-05 | known issue | Owner's run on v0.1.7: in 5 of 65 scenes (B3, R017, R019, R025, R039) some visibility or bitangent lines differ from the original (`verticestoVertices`, once `linesStarttoObstacles`); start/goal validity and the path are the same in all of them. Not caused by K-MP-03 or K-MP-04 (modelling or fixing those does not change these scenes). Next: trace these scenes (`compare:original -- --trace=…`); the report now lists the lines that differ. |

## 8. Proposed changes

No open proposal. Template for a request: copy a row (see [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md)).

| ID | Status | Requested by / date | Change | Reason | Acceptance criteria |
|----|--------|---------------------|--------|--------|---------------------|
| P-MP-01 | implemented in v0.1.7 as F-MP-22 (approved by the owner 2026-10-03) | comparison with the original / 2026-10-03 | compute `Norm`, `ArcTan`, `Det` and `VectorAngle` exactly as Mathematica does (formulas identified with `compare:original --trace`) | fixes K-MP-01: the port should give the original's result in every scene | `npm run compare:original` reports no DIFFERENT scene among fresh computations; golden and unit tests still pass; no change to controls or drawing |

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.0 | 2026-10-02 | feature list F/A/D/Q written with the first port |
| 1 | v0.1.1 | 2026-10-03 | credit footer added (A-MP-07) |
| 1 | v0.1.3 | 2026-10-03 | D-MP-06 corrected |
| 2 | v0.1.6 | 2026-10-03 | full design document: purpose, scope, use cases, reasons, versions, UI inventory, design, known issues, change process; no feature changes |
| 3 | v0.1.7 | 2026-10-03 | P-MP-01 implemented (F-MP-22); K-MP-01 cause found; K-MP-02…04 recorded; §10 *Improvements to consider* added; no change to controls or drawing |
| 4 | v0.1.8 | 2026-10-03 | F-MP-22 extended to division (`a·b⁻¹`), fixes K-MP-04; K-MP-01 result of the v0.1.7 comparison; K-MP-03 measured; K-MP-05 recorded; no change to controls or drawing |
| 4 | v0.1.9 | 2026-10-03 | no change (WebKit browser tests added, test tooling only) |
| 4 | v0.1.10 | 2026-10-03 | no change (WebKit browser tests now required to publish; test tooling only) |
| 4 | v0.1.11 | 2026-10-05 | no change (WebGL context-loss recovery in the 3D demos only) |

## 10. Improvements to consider (not implemented)

Ideas for making the app better than the original. **None of them is implemented**: for the course
assignment the port reproduces the original's behaviour. An idea becomes work only when the owner
turns it into a proposal in §8 and approves it; its I- ID is then referenced there.

| ID | Improvement | Benefit | Cost / risk | Related |
|----|-------------|---------|-------------|---------|
| I-MP-01 | Robust geometric predicates (exact orientation and intersection tests instead of `Chop` and tolerant comparisons) | removes the near-degenerate failures: detours, missing visibility lines and false "No path exists." when vertices are almost aligned | results then differ from the original in exactly those scenes; moderate code change in `planner.js` | Q-MP-05, K-MP-01 |
| I-MP-02 | Do not let the path pass between two C-obstacles that only touch at a corner, and merge overlapping C-obstacles into one region | paths never squeeze through a point where the robot would touch two obstacles | needs polygon union; changes the graph the page shows | Q-MP-05, Q-MP-08 |
| I-MP-03 | Real A* heuristic (distance to the goal, `EuclideanDistance[verts[[nbr]], verts[[fi]]]`) | faster search on large graphs; matches the intent of the code | no visible change on these small graphs; tie-breaking between equally short paths could change | Q-MP-01 |
| I-MP-04 | `angleSortCond` tie-break by distance (`c < d`) | the rotational sweep orders collinear vertices correctly | may change visibility lines in collinear scenes | Q-MP-02 |
| I-MP-05 | When the start or goal is invalid, say why (outside the workspace / inside obstacle n), draw no visibility lines from it, and keep the "No path exists." text inside the picture | clearer feedback for learners | page layout and text change; adds a control-free output (needs F- entry) | F-MP-30, F-MP-36 |
| I-MP-06 | Warn when an obstacle sticks out of the workspace or overlaps another obstacle | learners see why the free space looks odd | one more output (needs an F- entry); no change to the planning | Q-MP-09 |
| I-MP-07 | Incremental recomputation or a Web Worker for the planner | smoother dragging on slow devices | more code; no benefit visible on desktop (about 35 ms per scene) | §6 |
| I-MP-08 | Robot rotation (a third degree of freedom) | closer to real motion planning | large change: 3-D configuration space; out of scope of the original | §2 |

