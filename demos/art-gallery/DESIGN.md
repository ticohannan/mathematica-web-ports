# Design document: Art Gallery Problem

| | |
|---|---|
| Code version: | 0.1.12 |
| Document revision | 3 (2026-10-06) — published on the main site (private-preview banner removed) |
| Status | describes the app as implemented; changes go through *Proposed changes* (§8) and [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md) |
| Original | Wolfram Demonstrations Project, "Art Gallery Problem", contributed by Shreyas Poyrekar, Arifa Sultana and Aaron T. Becker, published September 13, 2019 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/ArtGalleryProblem/>. Readable source: [`docs/original-source/art-gallery.txt`](../../docs/original-source/art-gallery.txt); snapshots: `docs/original-snapshots/art-gallery-*.png` |
| Port files | `visibility.js` (the Initialization code: `visiblePolys` and its helpers; pure), `model.js` (environments, Manipulate variables, one evaluation of the Manipulate body with the original's caching; pure), `main.js` (SVG drawing, locators, controls), `index.html` |
| Role in the project | further demonstration (extra proof of concept alongside the motion-planning port); developed in a separate, unpublished repository and added to this site in v0.1.12 |

## 1. Purpose and background

The art gallery problem asks how many omnidirectional guards (cameras) are needed to see every point of a polygonal
gallery. The Demonstration lets the user place up to eight guards and shows, in the guard's colour, the region each
guard sees. The region is computed with a rotational sweep around the guard (after D.-T. Lee, reference [1]) — the
same family of functions the authors used in "Motion Planning for Robot Path around Obstacles", in a later revision.
Three environments: a square room with a movable square and triangle, an irregular polygon, and a "cubicle" floor plan.

## 2. Scope

In scope: the original's two setters (number of guards, environment), the ten locators (eight guards, two obstacle
centres), the visibility computation with all its numerical details and quirks, the original's caching of visible
regions, the drawing. Out of scope (would need a design entry first): coverage statistics, automatic guard placement,
new environments, a robust visibility algorithm (I-AG-01).

## 3. Users and use cases

| ID | User | Use case |
|----|------|----------|
| UC-AG-01 | student | place guards by dragging and try to cover a gallery with as few guards as possible |
| UC-AG-02 | student | move the obstacles of the "movable obstacles" room and watch the visible regions change |
| UC-AG-03 | tester | compare the port with the original's saved states, snapshots and behaviour in Mathematica |

## 4. Features

### 4.1 Controls

| ID | Feature | Why | Since | Verified by |
|----|---------|-----|-------|-------------|
| F-AG-01 | "number of guards" setter bar 1…8 (`ControlType -> Setter`, default 1): guards 1…s and their regions are shown | choose how many guards to use (UC-AG-01) | v0.1.0 | e2e "has the controls of the original: number of guards 1 to 8 and environment, with their defaults"; e2e "number of guards 8 shows eight guards and eight regions" |
| F-AG-02 | "environment" setter bar: movable obstacles / irregular / cubicle (default cubicle) | the three galleries of the original | v0.1.0 | e2e "the environment setter switches to movable obstacles and to the irregular polygon" |
| F-AG-03 | Ten invisible locators `pts` (`Appearance -> None`, range 4{-1,-1}…4{1,1}): pts 1 = centre of the square, pts 2 = centre of the triangle, pts 3…10 = guards 1…8; all of them draggable at all times (Q-AG-04); as in a LocatorPane, a press anywhere moves the nearest of the ten locators to the press point and drags it, a press within 12 px of a locator grabs it without a jump (offset kept, D-AG-09) and gives it keyboard focus | moving guards and obstacles (UC-AG-01, UC-AG-02) | v0.1.0 | e2e "dragging guard 1 with the mouse moves it and recomputes only its region"; e2e "dragging the square obstacle moves it and recomputes every guard"; e2e "the invisible locators of an unused guard and of an obstacle can be dragged (original quirk)"; e2e "a press away from every locator moves the nearest locator there"; e2e "in movable obstacles a press on the body of the square drags the square"; unit "clampPt keeps locators inside 4{-1,-1} to 4{1,1}" |

### 4.2 Visibility (`visibility.js`)

| ID | Feature | Why | Since | Verified by |
|----|---------|-----|-------|-------------|
| F-AG-04 | The original's helper functions, same names and formulas: `testpoint`, `lineList`, `vector`, `vertexList`, `angleSortCond` (ties by distance, c < d), `getAngle`, `λ`, `LineIntersectionPoint`, `SegmentIntersectionQ` (crossing rounded to multiples of 1e-7, strict 0 < λ < 1, end points excluded), `distSortCond`, `intersectInteriorQRev2` (0 replaced by 6.28319), `getClockwiseAngle`, `pointOnSegmentQ`, `glancingBlow`, `reflex`, `extendedLine` (length 40), `leftOrRight`, `noIntersection`, `normalVector` | the building blocks of `visiblePolys`, ported one by one | v0.1.0 | unit "lineList closes the polygon and vertexList gives consecutive triples"; unit "getAngle returns the direction in [0, 2 Pi)"; unit "testpoint: inside and outside, in either orientation"; unit "LineIntersectionPoint of the diagonals of a square is its centre"; unit "lambda is the parameter of the projection along the segment"; unit "SegmentIntersectionQ: a proper crossing counts"; unit "SegmentIntersectionQ: end points, T-junctions, parallel and collinear segments do not count"; unit "SegmentIntersectionQ rounds the crossing to multiples of 1e-7 before testing the end points"; unit "pointOnSegmentQ is true only strictly between the end points"; unit "getClockwiseAngle: right angles in both turning directions and zero for the same direction"; unit "intersectInteriorQRev2 is False when p lies on the ray from w2 through w3 (0 becomes the literal 6.28319)"; unit "reflex is a counter-clockwise turn and glancingBlow compares the two neighbours"; unit "extendedLine has length 40 (the motion-planning version uses 20)"; unit "leftOrRight, normalVector and noIntersection" |
| F-AG-05 | `visiblePolys[polys, pm]`: the region visible from a guard, by a rotational sweep over all vertices sorted by angle, with the list of crossed edges (`jList`), the latest visible edge (`lvLine`) and glancing lines extended by 40 units; a guard inside an obstacle sees that obstacle, a guard outside the gallery sees the outside up to the invisible square (Q-AG-06) | the visible region of each guard, as the original computes it | v0.1.0 | golden "art-gallery: the visibility polygon of guard 1 is bit-identical, including the points shifted by the collinearity nudge"; golden "art-gallery: the 2019 snapshots are bit-identical for every shown guard with the default Normalize (K-AG-03)"; golden "art-gallery: owner state 1, the square around a guard inside it matches the original bit for bit"; unit "a guard in a square room sees exactly the four corners"; unit "for generic guard positions the region is the true visibility polygon in all three environments"; unit "guards in the cubicle corridors and doorways see the true visibility polygon"; unit "a guard inside a convex obstacle sees only that obstacle (original quirk)"; unit "a guard outside the gallery sees the outside up to the invisible square"; golden "art-gallery: a guard inside a movable obstacle sees exactly that obstacle, whose vertices match the original bit for bit" |
| F-AG-06 | A guard exactly on an edge is moved 1e-5 along the edge's normal before the sweep | the original's way out of a degenerate start | v0.1.0 | unit "guard on an edge: shifted by 1e-5 along the edge normal (default guard 6 of the cubicle)" |
| F-AG-07 | A guard exactly on a vertex is moved by 1e-5 × (vertex 3 + vertex 5 of polygon 1) (Q-AG-01); in "movable obstacles" no region (D-AG-01) | the original's vertex nudge, quirk included | v0.1.0 | unit "guard on a cubicle vertex: shifted by 1e-5 times vertices 3 and 5 of polygon 1 into the wall (original quirk)"; unit "guard on an irregular vertex: shifted by 1e-5 times vertices 3 and 5 of the irregular polygon (original quirk)"; unit "guard on a vertex in movable obstacles: no region, as the original only has a symbolic result (port deviation)"; unit "a guard on the cubicle vertex (1.5, -3.5) is shifted below the wall and gets a self-crossing region (original quirk)"; e2e "a guard on a vertex of the movable square draws no region (port deviation)" |
| F-AG-08 | A swept vertex b with the next vertex straight behind it (p, b, postB collinear) is moved 1e-5 sideways (`tb`), the side chosen with the angle of the PREVIOUS vertex; in the first sweep step the choice waits for the current vertex's angle (Q-AG-02) | the original's collinearity nudge, quirk included | v0.1.0 | golden "art-gallery: the visibility polygon of guard 1 is bit-identical, including the points shifted by the collinearity nudge"; unit "the default guard 1 at (0, 0) is shifted only in its collinear vertices: slivers of width 7e-5"; unit "stale tb: a guard collinear with two later vertices takes the previous vertex angle (original quirk)"; unit "first sweep step with a collinear successor: the vertex is kept, tb resolved with the current angle (original quirk)"; unit "the first sweep step also takes the vertex for the default guards 2 and 3 of the cubicle"; unit "first sweep step at the exact centre of the square room: tb waits for the current angle and all four corners stay (original quirk)" |
| F-AG-09 | Mathematica numerics: tolerant `==`, `<`, `<=` on reals, `Chop`, `Mod`, `Round` (half to even), Mathematica's `Sort` with a predicate; `Det`, `ArcTan`, `VectorAngle` as measured for the motion-planning port; `a/b` = `a·b⁻¹`; `Norm` = classic BLAS dnrm2; `Normalize[v]` = `v·(1/length)` with the correctly rounded length (default) or the dnrm2 `Norm` (D-AG-08, K-AG-03); `Position` and `DeleteCases` patterns match like `SameQ` (1-ulp tolerance). The unit tests of the two `Normalize` models and of the 2-ulp `SameQ` case are regression pins (expected values from the port's own formulas), pending K-AG-10 and K-AG-08 | identical decisions and identical numbers as the original, also in near-degenerate positions | v0.1.0 | golden "art-gallery: the saved state is the state after the first evaluation of the initial settings"; golden "art-gallery: the 14.1 state needs Normalize via the dnrm2 Norm (the default Normalize changes last bits)"; golden "art-gallery: with Normalize via the dnrm2 Norm the 2019 snapshots keep their points and order within 3 ulps"; golden "art-gallery: owner state 1, movable obstacles with five guards: every visible region is bit-identical with the defaults"; unit "Normalize models: correctly rounded length and dnrm2 Norm differ in the last bit for {1.5, 2.5} (regression pin, K-AG-10)"; unit "sameQ accepts reals differing in the last binary digit, as SameQ, MatchQ and Position do"; unit "sameQ rejects a 2-ulp difference (regression pin, K-AG-08)" |

### 4.3 Manipulate body (`model.js`)

| ID | Feature | Why | Since | Verified by |
|----|---------|-----|-------|-------------|
| F-AG-10 | Environments as in the original: movable obstacles = {square pts 1 + CirclePoints[4], triangle pts 2 + CirclePoints[3], bound 5 CirclePoints[4], invisible 7 CirclePoints[4]}; irregular = {Reverse of the 11-vertex polygon, invisible}; cubicle = {Reverse of the 36-vertex plan, invisible}; initial pts {{1,0},{2,2},{0,0},{0,-1.5},{-2,-1},{-1.5,0.5},{-0.6,-1},{-2.5,0.5},{-2,1},{-1.25,3}} | the same galleries and start positions as the original | v0.1.0 | unit "the environments list their polygons in the original order, ending with the invisible 7-square"; unit "the square and the triangle follow pts 1 and 2 (CirclePoints[4] and CirclePoints[3])"; unit "irregular and cubicle polygons are the reversed vertex lists of the original"; golden "art-gallery: the saved state is the state after the first evaluation of the initial settings" |
| F-AG-11 | One evaluation of the body per control change, recomputing a guard's region only when its locator moved, an obstacle locator moved, the environment changed or the guard is new (`ptsOld`, `sOld`, `prevReg`); regions of hidden guards stay cached | the original's speed-up, with the same results | v0.1.0 | unit "the first evaluation computes only guard 1 and records ptsOld, sOld and prevReg"; unit "raising the number of guards computes only the new guards"; unit "lowering and raising the number of guards again recomputes the guards above the old count"; unit "moving a guard recomputes only that guard"; unit "a guard moved by less than the Equal tolerance is not recomputed"; unit "changing the environment recomputes every shown guard"; unit "moving an obstacle locator recomputes every guard, also in the cubicle where no obstacle is drawn (original quirk)"; unit "in movable obstacles, moving the square changes the regions of the guards"; unit "evaluate does not modify its input state"; golden "art-gallery: evaluating the saved state again recomputes nothing"; golden "art-gallery: owner state 1, evaluating it again recomputes nothing and keeps the cached regions" |
| F-AG-12 | Speed: eight guards in the cubicle in about 25 ms (Node) / 32 ms (Chromium, test sandbox) for a full recomputation | dragging stays fluid | v0.1.0 | unit "eight guards in the cubicle: time of a full computation (reported)"; e2e "eight guards in the cubicle: time of a full computation in the browser (reported)" |

### 4.4 Graphics (SVG)

| ID | Feature | Why | Since | Verified by |
|----|---------|-----|-------|-------------|
| F-AG-13 | Drawing order and styles of the original: visible regions (colour i, `Opacity[0.3]`), then the environment outline (movable obstacles: bound, square, triangle with `EdgeForm[Thin]`; irregular: `EdgeForm[Thin]`; cubicle: `EdgeForm[{Opacity[0.7], Gray, Thick}]`), then the guards as `Disk[…, 0.1]` in colour i with a thin black edge; `PlotRange -> 4{{-1,1},{-1,1}}`, `ImageSize -> 450`; controls on top | the same picture as the original | v0.1.0 | e2e "loads without errors and draws the cubicle, guard 1 and its visible region"; e2e "the environment setter switches to movable obstacles and to the irregular polygon"; M-AG-02; review |
| F-AG-14 | Guard and region colours `ColorData[100, "ColorList"]`, exact values from Mathematica 15.0.1 (D-AG-02 resolved; only colours 1–8 are used, s ≤ 8) | each guard and its region share a colour | v0.1.0 | golden "art-gallery: the guard colours reproduce the region tints of the snapshot pictures (Opacity 0.3 over white)"; M-AG-07 |
| F-AG-15 | Title, caption, Details text and references of the original | explains the Demonstration | v0.1.0 | M-AG-01 |

### 4.5 Port additions

| ID | Feature | Why | Since | Verified by |
|----|---------|-----|-------|-------------|
| A-AG-01 | "Initial settings" button: controls, locators and cached regions back to the opening state | stands in for the Manipulate ⊕ menu → Initial Settings | v0.1.0 | e2e "Initial settings restores the opening state" |
| A-AG-02 | Arrow keys move a focused locator (0.05; Shift = 0.25); each key press is one evaluation | keyboard access | v0.1.0 | e2e "arrow keys move a focused guard locator (port addition)" |
| A-AG-03 | `window.__demo` automation hook (state, recomputed guards, per-guard traces of the quirk paths, last evaluation time, `moveLocator`, `setState`) | automated tests, owner's comparisons | v0.1.0 | e2e "a guard on a vertex of the movable square draws no region (port deviation)"; e2e "eight guards in the cubicle: time of a full computation in the browser (reported)" |
| A-AG-04 | "All demos" link (the private-preview banner of v0.1.0–v0.1.1 was removed in v0.1.12, when publication was cleared) | site navigation | v0.1.0 | inventory; M-GEN-01 |
| A-AG-05 | Credit footer: original title, authors, licence, adaptation notice | required by CC BY-NC-SA 3.0 | v0.1.0 | e2e "attribution on" |
| A-AG-06 | Start-up notice (watchdog, `<noscript>`) when the page cannot start (DEC-22) | a clear message instead of an empty page | v0.1.0 | e2e "start-up notice when" |
| A-AG-07 | Second `Normalize` model in `visibility.js` (`withNormalizeModel('viaNorm', …)`), used by tests and comparisons only; the page always uses the default | checks the state saved by Mathematica 14.1, which needs it (D-AG-08, K-AG-03) | v0.1.0 | golden "art-gallery: the visibility polygon of guard 1 is bit-identical, including the points shifted by the collinearity nudge"; golden "art-gallery: the 14.1 state needs Normalize via the dnrm2 Norm (the default Normalize changes last bits)" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|-------------|---------|
| `setter-s-*` | F-AG-01 |
| `setter-reg-*` | F-AG-02 |
| `locator-pts-*` | F-AG-03, A-AG-02 |
| `reset` | A-AG-01 |
| `crumbs` | A-AG-04 |
| `details` | F-AG-15 |
| `credits` | A-AG-05 |

## 6. Design

- `visibility.js` ports the Initialization code function by function (names, argument order, constants, order of
  operations). `visiblePolys(polys, pm, trace)` returns the region's points in the original's order; the optional
  `trace` object records which special paths ran (`nudgedOnEdge`, `nudgedOnVertex`, `partError`, `deferredTb`,
  `staleTb`, the shifted guard `p`). In the first sweep step the choice of `tb` waits until `pbaAngle` holds the current
  vertex's angle, as Mathematica's re-evaluation of the stored unevaluated `If` does (Q-AG-02; derived from the
  source, lead K-AG-02). Where the original's whole result is symbolic (D-AG-01) the port returns `null`
  (`UNEVALUATED`).
- `model.js` holds the Manipulate variables (`s`, `reg`, `pts`, `ptsOld`, `sOld`, `prevReg`, `visibleRegion`) and
  `evaluate(state)`, which performs one evaluation of the body: environment polygons, the `Table` that recomputes only
  the regions the original recomputes, and the updates of `ptsOld`, `sOld`, `prevReg`. It returns the new state and
  which guards were recomputed. `main.js` calls it after every control change, as Mathematica re-evaluates the body.
- Numbers: `shared/mma.js` (tolerant comparisons, `Chop`, `Mod`, `Round`, `CirclePoints`, `Sort` with a predicate,
  `Total`, `EuclideanDistance`) and `shared/mma-exact.js` (`Det` with fused multiply-add LU, correctly rounded
  `ArcTan`, `VectorAngle`, dnrm2 `Norm`). The shared `VectorAngle` is bit-identical with Mathematica in only about
  87 % of calls (motion-planning port, K-MP-02), but `getClockwiseAngle` only feeds tolerant comparisons. Divisions are
  written `a * (1 / b)` like Mathematica's `a b^-1`; `Normalize` multiplies by the reciprocal of the correctly rounded
  length (D-AG-08); `Position` and `DeleteCases` patterns match with `SameQ`'s 1-ulp tolerance. Result: the 25 regions
  of the five snapshots saved in 2019 and the 5 regions of owner state 1 (Mathematica 15.0.1) are bit-identical; the
  region of the state saved by Mathematica 14.1 (25 points, including values such as 7.000000000000001e-05 from the
  1e-5 shifts) is bit-identical with `Normalize` via the dnrm2 `Norm` (K-AG-03, K-AG-10).
- Golden data: the snapshot cells of the original notebook keep their Manipulate settings, including the computed
  `visibleRegion`; they were extracted with the parser of `tools/extract_state.py` and are embedded in the golden test.
  The owner's saved state 1 (`tests/golden/art-gallery.owner-state-1.json`) is a third source.
- An independent reference (angular ray casting of the true visibility polygon, in the unit test) agrees with the
  port for generic guard positions (development sweep: 1199 of 1200 random positions, obstacles not overlapping; the
  exception was a guard level with a vertex, Q-AG-07).
- Drawing: `shared/svg-plot.js` with PlotRange ±4 and no padding (an explicit PlotRange). Locators:
  `addLocators` with ten invisible locators (`locator-pts-1` … `locator-pts-10`).

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

| ID | Kind | Description |
|----|------|-------------|
| Q-AG-01 | quirk kept | Vertex nudge: `index = Flatten@Position[polys[[k]], #]` is evaluated for every vertex of every polygon, so it ends as the position of the last vertex of the last polygon (the invisible square: {4}), and the shift is `0.00001 (polys[[1, 3]] + polys[[1, 5]])` whichever vertex the guard is on. Cubicle: (−0.5, −1.5)·1e-5, so the default guard 4 at the vertex (−1.5, 0.5) moves to (−1.500005, 0.499985), inside the wall arm, and sees along the arm and out of the gallery to the left. Irregular: (−0.8, 1.85)·1e-5. Movable obstacles: see D-AG-01. |
| Q-AG-02 | quirk kept | `pbaAngle` is read in the `tb = …` line before it is assigned in the same iteration. From the second sweep step on it is the angle of the previous vertex, which picks the side of the 1e-5 shift (the saved Mathematica 14.1 state confirms this: with the current vertex's angle guard 1's region differs). In the first step it has no value: `pbaAngle <= Pi/3` stays symbolic and `tb` (then `abcList`) holds the unevaluated `If`. Mathematica re-evaluates a stored expression at each use, and `pbaAngle` is assigned before `tb` or `abcList` is used (`intersectInteriorQRev2`, `glancingBlow`, `extendedLine`), so in the first step the `If` resolves with the CURRENT vertex's angle; the port defers the choice the same way. Derived from the source only (no saved data reaches this path): lead K-AG-02. |
| Q-AG-03 | quirk kept | The horizontal start ray `infiniteLine` ends at {maxX + 0.11, y} with the y of the UNSHIFTED guard position. |
| Q-AG-04 | quirk kept | All ten locators are Manipulate controls with `Appearance -> None`: the locators of unused guards and the obstacle centres stay draggable (invisible) in every environment, and dragging an obstacle locator recomputes every guard even where no obstacle is drawn. With nearest-locator picking (D-AG-04) a press near a hidden guard or a hidden obstacle centre moves that invisible locator; all ten take part in every mode because the original's `pts` control always holds all ten (lead K-AG-09). |
| Q-AG-05 | quirk kept | A visible non-glancing vertex whose extended line meets nothing (`giList == {}`) adds neither the vertex nor a point. Cannot happen inside the invisible square; kept for fidelity. |
| Q-AG-06 | quirk kept | A guard inside a movable obstacle sees exactly that obstacle; a guard outside the irregular polygon or the cubicle sees the outside up to the invisible 7-square (as in snapshots 2, 4, 5, 6). |
| Q-AG-07 | quirk kept | Degenerate alignments give regions that differ from the true visibility polygon: guards collinear with two vertices (stale `tb`: (−0.15, −1.3) loses about 2.25 of area, (0.5, −2.5) about 1.25), a start ray through a vertex (irregular, guard (−1.411, 1.35)), a guard on the cubicle vertex (1.5, −3.5), shifted below the wall by Q-AG-01, whose region polygon crosses itself, and slivers of width 7e-5 from the 1e-5 shifts (default guard 1). Reproduced, not fixed (I-AG-01). |
| Q-AG-08 | quirk kept | Vertices are compared with Mathematica's tolerant `==` (`postB == a`, `b == prevA`, …); `DeleteCases` and `Position` match structurally (SameQ and literal patterns, which still accept machine reals differing in the last bit). Since v0.1.1 the port matches there with `sameQ`, which accepts a difference of at most one unit in the last place (K-AG-08); the values compared are copies of the same vertices, so no saved region changes. `SegmentIntersectionQ` rounds to 1e-7 and `Chop` uses an absolute 1e-10, so near-degenerate decisions follow the original's thresholds. |
| D-AG-01 | deviation | "movable obstacles" and a guard exactly on a vertex of any polygon: `polys[[1, {5}]]` does not exist (polygon 1 is the 4-vertex square), Mathematica prints Part::partw and continues with a symbolic `p`; its result cannot be reproduced. The port draws no region for that guard (the disk is drawn). Lead: K-AG-01. |
| D-AG-02 | deviation (resolved in v0.1.1) | v0.1.0 sampled the colours from the snapshot pictures. Since v0.1.1 `GUARD_COLORS` holds the exact `ColorData[100, "ColorList"]` values read by extra-checks.wls (Mathematica 15.0.1, owner run 2026-10-06); no deviation left. |
| D-AG-03 | deviation | Sizes approximate Mathematica's: `Thin` = 0.25 px and `Thick` = 2 px at the 450-pixel image size (both measured in the snapshots); `FrameMargins -> -5` is not reproduced; the picture scales with the page (at most 564 px wide). |
| D-AG-04 | deviation | Locators: since v0.1.1 a press anywhere moves the nearest locator (Manipulate `Locator` controls are LocatorPane locators, which "by default direct any click to the nearest locator", Wolfram Language reference, LocatorPane, Details); v0.1.0 ignored presses farther than 12 px, so the invisible obstacle centres could hardly be grabbed (O-AG-01). Remaining deviations: during a drag the body is evaluated once per animation frame with the latest pointer position (the results do not depend on how many updates happen); between locators at the same distance the port takes the lower `pts` index (Mathematica's tie rule unknown). |
| D-AG-05 | deviation | The port uses machine numbers everywhere; in Mathematica the initial positions such as {0, 0} and {−2, −1} and positions clamped at ±4 are exact integers until a locator is dragged. No effect found: the guard at the exact {0, 0} is bit-identical with the saved state, and the clamped guard {1.83, −4} of snapshot 5 is bit-identical with the 2019 data. |
| D-AG-06 | deviation | Messages that the original prints (Part::partw in D-AG-01) are not shown. |
| D-AG-07 | deviation | Regions are SVG polygons filled with the even-odd rule; Mathematica's fill of a self-crossing polygon (Q-AG-07) is not verified. Lead: K-AG-06. |
| D-AG-08 | deviation | `Normalize` (in `normalVector` and `extendedLine`) multiplies by the reciprocal of the correctly rounded length, not of the dnrm2 `Norm`: that reproduces the 2019 snapshots and the owner's 15.0.1 state bit for bit. The state saved by Mathematica 14.1 is reproduced only with `Normalize` via the dnrm2 `Norm`; why that build differs is not explained (lead K-AG-10). |
| D-AG-09 | deviation | Grab zone: a press within 12 px of a locator grabs it without a jump (the pointer-to-locator offset is kept while dragging); farther away the nearest locator jumps to the press point (D-AG-04). The distance at which Mathematica grabs an invisible (`Appearance -> None`) locator without a jump is not known; the owner checks it with M-AG-06. A press that grabs a locator also gives it keyboard focus (shared `addLocators`). |
| K-AG-01 | known issue (lead) | Check D-AG-01 in Mathematica (Initialization cells evaluated): `visiblePolys[N@{(#+{1,0})&/@CirclePoints[4], (#+{2,2})&/@CirclePoints[3], 5 CirclePoints[4], 7 CirclePoints[4]}, N@{1+1/Sqrt[2], -1/Sqrt[2]}]` — expected Part::partw and a symbolic result; in the Manipulate, what is drawn for that guard (nothing, an error box)? And Q-AG-01: `visiblePolys[N@{cubiclePoly, 7 CirclePoints[4]}, {-1.5, 0.5}]` (cubiclePoly = the Manipulate's value) should give a region inside x ≤ −1.5 reaching x = −4.9497 (the port's: 6 points, area 1.9876). |
| K-AG-02 | known issue (lead) | Most important check: the first-step behaviour of Q-AG-02 (deferred `If`) is derived from the source, not from saved data. In Mathematica, cubicle, 2 guards, default positions: guard 2's (yellow) region should include the triangle (1.5, −0.5), (1.5, −1.5), (3.5, −3.5). Or evaluate `visiblePolys[N@{cubiclePoly, 7 CirclePoints[4]}, {0, -1.5}]`: the port predicts 19 points, area 18.2767, starting {3.5, −1.50002333…}, {1.5, −1.5}, {1.5, −0.5}. Print the port's list with `node --input-type=module -e "import {visiblePolys} from './demos/art-gallery/visibility.js'; import {environment, INITIAL_PTS} from './demos/art-gallery/model.js'; console.log(JSON.stringify(visiblePolys(environment('cubicle', INITIAL_PTS).listofPoly, [0, -1.5])))"`. |
| K-AG-03 | known issue (resolved in v0.1.1) | `Norm` and `Normalize`. extra-checks.wls (Mathematica 15.0.1, owner run 2026-10-06): `Norm[{1.5, 2.5}]` = 2.91547594742265, i.e. classic dnrm2 scaling (the port's `Norm`). Bit-for-bit tests show that `Normalize` uses a different length: with `v·(1/length)` and the correctly rounded length the port reproduces 30 of the 31 saved regions (all 25 of the 2019 snapshots and all 5 of owner state 1); only the 14.1 saved state needs the dnrm2 `Norm` in `Normalize`. That is now the default (D-AG-08); the 14.1 model stays available for its golden test (A-AG-07). |
| K-AG-04 | known issue (resolved in v0.1.1) | Colours: extra-checks.wls (Mathematica 15.0.1, owner run 2026-10-06) gave the first eight `ColorData[100, "ColorList"]` colours; they replace the sampled ones (D-AG-02). Only `cval[[1]]`…`cval[[8]]` are ever used (guards 1…s, s ≤ 8; the two obstacle locators are not drawn), so no index wraps. |
| K-AG-05 | known issue (resolved in v0.1.1) | Which locator a click grabs: LocatorPane directs any click to the nearest locator (reference cited in D-AG-04), and the owner found the obstacles draggable in the original (O-AG-01); implemented in v0.1.1. The remaining question is K-AG-09. |
| K-AG-06 | known issue (lead) | Fill of a self-crossing region: compare the guard on the cubicle vertex (1.5, −3.5) (Q-AG-07) between Mathematica and the port. |
| K-AG-07 | known issue (lead) | Compare in Mathematica the degenerate positions of Q-AG-07 and Q-AG-02 (cubicle (1.235, −1.5), (−0.15, −1.3), (0.5, −2.5), (1.5, −3.5); irregular (−1.411, 1.35)) with the port; they go through the quirk paths and are pinned only by analysis and unit tests. |
| K-AG-08 | known issue (resolved in v0.1.1) | `Position`, `SameQ` and `MatchQ` treat a 1-ulp difference of machine reals as equal (extra-checks.wls, Mathematica 15.0.1, owner run 2026-10-06). The port's `Position` (vertex nudge) and the `DeleteCases` patterns (`{b,_}`, `{_,b}`) now use `sameQ` with that tolerance instead of bitwise equality (Q-AG-08). No saved region changes. Only the 1-ulp case (0.1 + 0.2 vs 0.3) was checked; that 2 ulps are NOT SameQ is a regression pin until `SameQ[1.5, 1.5 + 2^-51]` (queued in extra-checks.wls) is read. |
| K-AG-09 | known issue (lead) | In the cubicle and the irregular room, does a click near (2, 2) or (1, 0) (the hidden triangle and square centres) or near a hidden guard move that invisible locator in the original? The source says yes (all ten `pts` are locators); the port does that. Check M-AG-06. |
| K-AG-10 | known issue (lead; check queued in extra-checks.wls) | Why does the 14.1 saved state need `Normalize` via the dnrm2 `Norm` while 2019 and 15.0.1 data need the correctly rounded length? Possible: a different build or packed-array path in 14.1. Check in 15.0.1: `Normalize[{1.5, 2.5}] // InputForm` should be `{0.5144957554275265, 0.8574929257125441}` (1/correctly rounded length) and `{1.5, 2.5} (1/Norm[{1.5, 2.5}]) // InputForm` gives `{0.5144957554275266, 0.8574929257125442}` (the dnrm2 variant). Note: this 2-vector does not tell where the 14.1 difference comes from; a rerun of the 14.1 state in 15.0.1 (Initial settings, then save) would show whether 15.0.1 reproduces it. |
| O-AG-01 | owner observation | Owner testing (Mathematica 15.0.1, 2026-10-06): the port looks the same as the original. In "movable obstacles" the obstacles can be dragged in the original but not in v0.1.0 of the port (presses had to hit the invisible centre within 12 px). Fixed in v0.1.1 (D-AG-04). |
| O-AG-02 | owner observation | Owner testing (Mathematica 15.0.1, 2026-10-06): while an obstacle is dragged over a guard, or a guard into or inside an obstacle, the original briefly shows red/pink flashes and messages such as `Det::luc: … badly conditioned matrix {{-0.866025,1.5},{0.866025,-1.5}} …`. Lead, not confirmed: the matrix is a triangle edge against itself reversed (exactly singular, `SegmentIntersectionQ` treats it as parallel, as the port does); the flash is probably Mathematica's rendering of an invalid graphic while the guard is inside or on an obstacle. The port shows no messages (D-AG-06) and, in a scan of 6000 obstacle-over-guard positions, never produced a non-numeric or degenerate region, so it has no equivalent to show; documented only. |
| N-AG-01 | note | Snapshot cell 1 holds the same state as the live output and has no "Snapshot" cell tag; the notebook was last saved by Mathematica 14.1. Snapshot cells 2–6 date from the authors' 2019 session and keep their computed regions (26 regions in all are compared bit for bit). |
| N-AG-02 | note | Unused in the original: the function `vector`, the Module variable `theta` and the pattern variable `x` of `pm:{x_, y_}`. The `Table` inside the `For` loop reuses the name `i` (Table localises it, the loop's `i` is restored). `{EdgeForm[{Thin, Black}]}` in the irregular branch has no primitive and no effect. |
| N-AG-03 | note | The cached region of a guard that is hidden (i > s) is never drawn: raising s recomputes it (`sOld < i - 2`). |

## 8. Proposed changes

No open proposal. Template (see [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md)):

| ID | Status | Requested by / date | Change | Reason | Acceptance criteria |
|----|--------|---------------------|--------|--------|---------------------|

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.0 | 2026-10-06 | first AI conversion: feature list, quirks and deviations written with the port |
| 2 | v0.1.1 | 2026-10-06 | owner testing round 1: nearest-locator picking (D-AG-04, K-AG-05 resolved, O-AG-01); exact `ColorData[100]` colours (K-AG-04, D-AG-02 resolved); `Norm` confirmed dnrm2 and `Normalize` with the correctly rounded length as default (K-AG-03 resolved, D-AG-08, K-AG-10, A-AG-07 now a `Normalize` model); 1-ulp `SameQ` in `Position`/`DeleteCases` (K-AG-08 resolved); owner state 1 golden tests; owner observations O-AG-01, O-AG-02; lead K-AG-09; 12 px no-jump grab zone recorded as D-AG-09; regression pins labelled (K-AG-08, K-AG-10) |
| 3 | v0.1.12 | 2026-10-06 | added to this repository and published: private-preview banner removed (A-AG-04), role line updated; no other feature changes. Versions v0.1.0 and v0.1.1 in this document (Since column, rows above) are versions of the separate repository the app was developed in, not of this repository |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|-------------|---------|-------------|---------|
| I-AG-01 | A robust visibility polygon (exact orientation predicates, no 1e-5 shifts) | correct regions in degenerate alignments, no lost areas or slivers | results then differ from the original exactly where the original glitches | Q-AG-02, Q-AG-07 |
| I-AG-02 | Show the uncovered part of the gallery and the covered fraction | answers the Demonstration's question at a glance | extra polygon union computation; a new feature | UC-AG-01 |
| I-AG-03 | Make the locators of hidden guards and absent obstacles inactive, show obstacle handles | no surprising invisible drags | departs from the original's behaviour | Q-AG-04 |
| I-AG-04 | A defined result for a guard on a vertex in "movable obstacles" (e.g. shift along the vertex bisector) | the region never disappears | the original has no defined result there | D-AG-01, Q-AG-01 |
