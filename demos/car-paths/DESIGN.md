# Design document: Shortest Path for Forward and Reverse Motion of a Car

| | |
|---|---|
| Code version: | 0.1.12 |
| Document revision | 3 (2026-10-06) — published on the main site (private-preview banner removed) |
| Status | describes the app as implemented; changes go through *Proposed changes* (§8) and [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md) |
| Original | Wolfram Demonstrations Project, "Shortest Path for Forward and Reverse Motion of a Car", contributed by Francesco Bernardini and Aaron T. Becker, published January 4, 2023 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/ShortestPathForForwardAndReverseMotionOfACar/>. Readable source: [`docs/original-source/car-paths.txt`](../../docs/original-source/car-paths.txt); snapshots: `docs/original-snapshots/car-paths-*.png` |
| Port files | `carpaths.js` (constants, the Reeds–Shepp and Dubins formulas, path/car geometry as data, one evaluation of the Manipulate body; pure), `main.js` (SVG drawing, locators, controls), `index.html` |
| Role in the project | further demonstration (extra proof of concept alongside the motion-planning port); developed in a separate, unpublished repository and added to this site in v0.1.12 |

## 1. Purpose and background

Shows the shortest path between two poses (position of the rear-axle centre and heading) of a car with a minimum
turning radius *r*<sub>min</sub>: either a Reeds–Shepp car (forward and reverse gear; the optimum is one of 48 words of
at most five arcs/straights) or a Dubins car (forward only; six words). The user moves the start and goal cars and their
headings with locators, changes *r*<sub>min</sub>, and slides a blue car along the path. The Reeds–Shepp code is a
conversion of the MIT-licensed Python library `reeds_shepp.py` (nathanlct, benjaminbecker); the Dubins words were added
by the authors of the Demonstration.

## 2. Scope

In scope: the original's controls (progress, *r*<sub>min</sub>, type, swap button), the four invisible locators with
their coupling rules, the Reeds–Shepp and Dubins formulas, the drawing (path with construction circles, three cars,
locator glyphs, plot label).
Out of scope (would need a design entry first): drawing all candidate paths (commented out in the original), obstacles,
other car models, export of the path.

## 3. Users and use cases

| ID | User | Use case |
|----|------|----------|
| UC-CP-01 | student | move start and goal cars and see the shortest Reeds–Shepp path and its length |
| UC-CP-02 | student | compare the Dubins path with the Reeds–Shepp path, and see that swapping start and goal changes only the Dubins length |
| UC-CP-03 | student | drive the car along the path with the progress slider and watch gear changes and steering |
| UC-CP-04 | tester | compare the port with the original's saved state and snapshots |

## 4. Features

### 4.1 Controls

| ID | Feature | Why | Since | Verified by |
|----|---------|-----|-------|-------------|
| F-CP-01 | "progress" slider 0…1, step 0.001, labelled value field and ⊕ animation panel (`{{progress, 0.0}, 0, 1, 0.001, Appearance -> "Labeled", ImageSize -> 500}`), default 0 | drive the blue car along the path (UC-CP-03) | v0.1.0 | e2e "has the controls of the original with their defaults: progress, r_min, type and the swap button"; e2e "moving the progress slider with the mouse moves the blue car along the path"; M-CP-03 |
| F-CP-02 | *r*<sub>min</sub> slider 0.001…10, step 0.001, labelled, default 3; the body corrects non-numeric values to 3 and clamps to 0.001…10 | the minimum turning radius | v0.1.0 | e2e "the r_min value field changes the turning radius and the path length"; unit "input corrections of minRadius and progress" |
| F-CP-03 | "type" setter Reeds-Shepp (default) / Dubins | the two car models (UC-CP-02) | v0.1.0 | e2e "the Dubins setter gives 26.47 in the configuration of snapshot 2"; unit "type Dubins uses the six forward-only words" |
| F-CP-04 | Button "swap start and goal": `locs = Join[locs[[3;;4]], locs[[1;;2]]]; locsOld = locs` | metric vs non-metric (UC-CP-02) | v0.1.0 | e2e "swap start and goal exchanges the cars and the Reeds-Shepp length stays 24.08"; unit "swap start and goal exchanges the locator pairs" |
| F-CP-05 | Four invisible locators (`{{locs, …}, {-14, -9}, {14, 9}, Locator, Appearance -> None}`): 1 start position, 2 start orientation, 3 goal position, 4 goal orientation; pointer positions limited to −14…14 × −9…9; LocatorPane picking: a press within 12 px grabs a locator in place, a press anywhere else makes the nearest of the four jump to the press point and drags it (D-CP-06), also while progress is animating | moving the cars (UC-CP-01) | v0.1.0 | e2e "dragging the start locator with the mouse moves the start car and keeps its heading"; e2e "dragging the goal orientation locator with the mouse turns the goal car"; e2e "dragging a car beyond 13 x 8 stops it at the limit"; M-CP-08; e2e "a press away from every locator moves the nearest locator there"; e2e "a press on the start car body drags the car"; e2e "dragging a car centre while progress is animating moves the car and the path follows" |

### 4.2 Model (`carpaths.js`)

| ID | Feature | Why | Since | Verified by |
|----|---------|-----|-------|-------------|
| F-CP-06 | Locator coupling of the Manipulate body: a moved position is clamped to ±13 × ±8, keeps the heading of the OLD locator pair and carries its orientation marker; a moved marker sets the heading (`angfrom1to2`) and is put back 2 units from the car; `locsOld` follows | headings are set by dragging a marker around the car (Q-CP-02) | v0.1.0 | unit "dragging the start position keeps the heading and carries the orientation marker 2 units away"; unit "dragging an orientation marker turns the car and holds the marker 2 units away"; unit "the goal locators behave like the start locators"; unit "positions are clamped to 13 x 8 (tighter than the locator range 14 x 9)" |
| F-CP-07 | Reeds–Shepp optimum: `getAllPaths` (12 formulas `path1`…`path12`, each plain / `timeflip` / `reflect` / `reflect∘timeflip`), `getOptimalPath` = first shortest (`First@MinimalBy`) | the shortest path with both gears (UC-CP-01) | v0.1.0 | unit "Reeds-Shepp optimal lengths agree with the upstream Python library (fixture)"; unit "every Reeds-Shepp and Dubins candidate path ends at the goal (independent integrator)"; unit "ties keep generation order: straight behind picks the timeflip variant of path1"; unit "the Reeds-Shepp length does not change when start and goal are swapped (Details text)"; golden "car-paths: getOptimalPath of the saved inputs equals the saved optPath, 3 of 4 parameters bit for bit"; golden "car-paths: the saved optPath is the correctly rounded exact result (why the port differs by 1 ulp)"; golden "car-paths: snapshots 3 and 4 (r_min 8.142, poses read off the pictures) give about 18.18 and 56.43"; golden "car-paths: owner state 1 (machine-number poses, r_min 6.318) gives the saved optPath bit for bit" |
| F-CP-08 | Dubins optimum: `getAllDubinsPaths` (`dLSL`, `dLSR`, `dRSR`, `dRSL`, `dLRL`, `dRLR`), `getOptimalDubinsPath` = first shortest | the forward-only car (UC-CP-02) | v0.1.0 | unit "Dubins paths drive forward only and are never shorter than the Reeds-Shepp path (Details text)"; unit "Dubins U-turn has length pi times r_min, ties keep the order LSL, LSR, RSR, RSL, LRL, RLR"; golden "car-paths: snapshot 2 (Dubins, both headings turned by pi) reads path length 26.47 and distance 20.62" |
| F-CP-09 | Helpers with the original's names: `changeOfBasisR` (goal in the start's frame, lengths ÷ *r*<sub>min</sub>), `modπ` (`modPi`, result in (−π, π]), `mod2π` (`mod2Pi`, [0, 2π)), `cart2Polar`, `angfrom1to2`, `createPathElement`, `reverseSteering`, `reverseGear`, `timeflip`, `reflect`, `pathLength`; constants sLEFT = −1, sSTRAIGHT = 0, sRIGHT = 1, gFORWARD = 1, gBACKWARD = −1 | the formulas work with radius 1 at the origin | v0.1.0 | unit "changeOfBasisR: goal in the frame of the start, lengths divided by minRadius"; unit "modPi maps into (-pi, pi] and keeps pi as pi (the Python maps it to -pi)"; unit "mod2Pi maps into [0, 2pi) and its Phi < 0 branch is dead"; unit "cart2Polar: radius and Mathematica ArcTan[x, y] angle, and 0 at the origin"; unit "createPathElement reverses the gear of a negative parameter"; unit "reverseSteering, reverseGear, timeflip and reflect"; unit "constants of the original: sLEFT -1, sSTRAIGHT 0, sRIGHT 1, gFORWARD 1, gBACKWARD -1"; unit "angfrom1to2 gives the headings of the default cars: -pi/2 (start) and -ArcTan[1/2] (goal)"; unit "pathLength is the sum of the parameters" |
| F-CP-10 | `getPos`: pose of the car after `progress` × path length, and `Alpha` (= *r*<sub>min</sub> on a left arc, −*r*<sub>min</sub> on a right arc, 0 straight) for the front wheels | the moving car (UC-CP-03) | v0.1.0 | unit "getPos: a quarter left turn of radius 2 ends at (2, 2) heading up, Alpha = r_min"; unit "getPos: a backward right arc moves the car to (-1, -1) and turns it left, Alpha = -r_min"; unit "getPos: progress stops inside an element"; unit "getPos: at progress 0 the car sits at the start with the wheels of the first arc (snapshot 1 shows turned front tyres)" |
| F-CP-11 | Progress cache exactly as written: recompute when `progress == progressOld \|\| progressOld == -1`, else `progressOld = progress` (never active, Q-CP-06) | fidelity | v0.1.0 | unit "progressOld stays -1, so the path is recomputed on every evaluation (the cache never works)"; unit "with a progressOld other than -1 the path is kept until progress repeats (cache branch as written)" |
| F-CP-12 | Degenerate poses as in the original: identical start and goal give a zero-length path; zero-length elements are kept (Q-CP-04); the original's ρ == 0 branches of `path5` (live) and `path7` (dead) | same output as the original in edge cases | v0.1.0 | unit "identical start and goal: the original gives a zero-length path (the Python would divide by zero)"; unit "straight ahead gives L0 S5 L0: zero-length elements are kept (the DeleteCases pattern with exact 0 never matches reals)"; unit "the rho == 0 branch of path7 can never run (u1 = 20/16 > 1)" |
| F-CP-13 | Initial values of the Manipulate variables (`locs` = `locsOld` = {{−10, −5}, {−10, −7}, {8, 5}, {10, 4}}, progress 0, progressOld −1, *r*<sub>min</sub> 3, Reeds-Shepp) and one evaluation of the body per change | same opening picture as the original | v0.1.0 | golden "car-paths: the saved state is the state after the first evaluation of the initial settings"; golden "car-paths: evaluating the saved state again keeps locators, settings and path word"; unit "the first evaluation of the initial settings keeps the locators and computes the path" |

### 4.3 Graphics (SVG)

| ID | Feature | Why | Since | Verified by |
|----|---------|-----|-------|-------------|
| F-CP-14 | Path (`drawPath`): orange, Thickness 0.005; for each arc first the grey construction circle (Thin) and its centre (PointSize 0.01), then the arc `Circle[c, r, {angS, angE}]`; straight elements as lines | shows the path and its turning circles | v0.1.0 | unit "drawPath: arcs with centres, angles and construction circles, lines for straight elements"; unit "drawPath: a forward right arc has angE < angS (drawn between the two angles, K-CP-01)"; e2e "loads without errors and draws the path, the three cars and the locator glyphs"; review |
| F-CP-15 | Cars (`drawCar`): body 2 × 1 with its rear axle at the pose, yellow headlights (Opacity 0.8·opac), axles and tyres in Darker[Gray], front tyres turned by `ArcTan[Alpha ∓ .375, 1.4]`, black arrow (Arrowheads 0.02); start car Green 0.2, goal car Red 0.2, moving car Blue 0.6, drawn in this order after the path | the car poses and the steering | v0.1.0 | unit "drawCar: body rectangle of the car centred at the rear axle"; unit "drawCar: front wheels turn by ArcTan[Alpha - .375, 1.4] and ArcTan[Alpha + .375, 1.4] (Mathematica argument order)"; unit "drawCar: headlights, axles, four tyres and the arrow, with the opacities of the original"; M-CP-02 |
| F-CP-16 | Locator glyphs drawn at `locsOld`: default locator glyph for the positions; `colorLocatorOrient` (vertical reticle only, circle, faint ring) rotated by the heading, Darker[Green] for the start, Red for the goal | shows which locator does what | v0.1.0 | e2e "loads without errors and draws the path, the three cars and the locator glyphs"; M-CP-02 |
| F-CP-17 | Plot label "path length: `Round[pathLength·r_min, 0.01]`   distance: `Round[Norm[goal − start], 0.01]`" (Style 14, Black); PlotRange {{−15, 15}, {−10, 10}}, ImageSize 620 | the numbers of the Demonstration (Q-CP-01) | v0.1.0 | e2e "plot label reads path length 24.08 and distance 20.62 at the start, as in the original snapshot"; golden "car-paths: snapshot 1 label reads path length 24.08 and distance 20.62"; unit "distance includes the heading difference: 20.62 at the initial settings (the xy distance would be 20.59)"; unit "Round[x, 0.01] display rounding" |
| F-CP-18 | Title, caption and details text of the original | explains the Demonstration | v0.1.0 | M-CP-01 |

### 4.4 Port additions

| ID | Feature | Why | Since | Verified by |
|----|---------|-----|-------|-------------|
| A-CP-01 | "Initial settings" button: all controls and locators back to the opening state | stands in for the Manipulate ⊕ menu → Initial Settings | v0.1.0 | e2e "Initial settings restores the opening state" |
| A-CP-02 | Arrow keys move a focused locator (0.1 units; Shift = 0.5); each key press is one update | keyboard access | v0.1.0 | e2e "arrow keys move a focused locator (port addition)" |
| A-CP-03 | `window.__demo` automation hook (state, view values, label text, `moveLocator`, `setState`, `worldToClient`) | automated tests | v0.1.0 | e2e "the Dubins setter gives 26.47 in the configuration of snapshot 2" |
| A-CP-04 | "All demos" link (the private-preview banner of v0.1.0–v0.1.1 was removed in v0.1.12, when publication was cleared) | site navigation | v0.1.0 | inventory; M-GEN-01 |
| A-CP-05 | Credit footer: original title, authors, licence, adaptation notice | required by CC BY-NC-SA 3.0 | v0.1.0 | e2e "attribution on" |
| A-CP-06 | Start-up notice (watchdog, `<noscript>`) when the page cannot start (DEC-22) | a clear message instead of an empty page | v0.1.0 | e2e "start-up notice when" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|-------------|---------|
| `slider-progress` | F-CP-01 |
| `value-progress` | F-CP-01 |
| `plus-progress` | F-CP-01 |
| `play-progress` | F-CP-01 |
| `stepback-progress` | F-CP-01 |
| `stepfwd-progress` | F-CP-01 |
| `slider-minRadius` | F-CP-02 |
| `value-minRadius` | F-CP-02 |
| `plus-minRadius` | F-CP-02 |
| `play-minRadius` | F-CP-02 |
| `stepback-minRadius` | F-CP-02 |
| `stepfwd-minRadius` | F-CP-02 |
| `setter-type-*` | F-CP-03 |
| `button-swap` | F-CP-04 |
| `locator-*` | F-CP-05, A-CP-02 |
| `reset` | A-CP-01 |
| `crumbs` | A-CP-04 |
| `details` | F-CP-18 |
| `credits` | A-CP-05 |

## 6. Design

- `carpaths.js` holds every function of the original's initialization code under the same name (`modπ`/`mod2π` are
  spelled `modPi`/`mod2Pi`), in the same order of operations, plus `evaluate(state)`, which performs exactly one
  evaluation of the Manipulate body: locator coupling and clamping, `start`/`goal`, the input corrections of
  *r*<sub>min</sub> and progress, the progress cache, `getPos`, and the two label values. `drawPath` and `drawCar` return
  geometry as data (arcs, lines, world-coordinate polygons) instead of graphics primitives; no DOM code, unit-tested.
- Paths are arrays of `[param, steer, gear]` machine numbers, as after the original's `N[path]`.
- Mathematica semantics come from the shared helpers: tolerant `==`, `<`, `>`, `<=`, `>=` (`shared/mma.js`) wherever
  the original compares reals, `Mod`, `Round[x, 0.01]` (half to even), `Total` (compensated sum), `MinimalBy` (input
  order), a bit-exact `ArcTan[x, y]` (`shared/mma-exact.js`, Mathematica argument order) and BLAS-style `Norm`.
- `main.js` keeps the Manipulate variables (`locs`, `locsOld`, `progress`, `progressOld`, `optPath`, `minRadius`,
  `type`) and calls `evaluate` after every control change, as Mathematica re-evaluates the body. A locator drag sets
  `locs[i]` to the pointer position (limited to the locator range) once per animation frame and evaluates.
- The invisible Manipulate locators sit at `locs`; the drawn glyphs sit at `locsOld`, as in the original.
- Drawing order follows the original's `Graphics` list: path (with construction), start car, goal car, moving car,
  locator glyphs. The plot label is an HTML line above the SVG (D-CP-05).

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

| ID | Kind | Description |
|----|------|-------------|
| Q-CP-01 | quirk kept | The label "distance" is `Norm[goal - start]` of the {x, y, θ} triples: the heading difference (not reduced modulo 2π) is included. Initial settings: 20.62, while the planar distance is 20.59. |
| Q-CP-02 | quirk kept | Car positions are clamped to ±13 × ±8 by the body, tighter than the locator range ±14 × ±9: dragging further leaves the car at the limit while the pointer moves on. A moved position keeps the heading computed from the OLD locator pair. |
| Q-CP-03 | quirk kept | Equal-length paths: `First@MinimalBy` keeps generation order (path1 plain, timeflip, reflect, reflect∘timeflip, then path2 …; Dubins: LSL, LSR, RSR, RSL, LRL, RLR). Which of several equally short paths is drawn therefore depends on that order (and on last-bit rounding, K-CP-02). |
| Q-CP-04 | quirk kept | `DeleteCases[paths, {0, _, _}, 2]` never removes anything: the pattern's exact `0` does not match the machine `0.` of `N[path]`. Zero-length elements stay in the path, and a zero-length arc still draws its grey construction circle and centre (e.g. two circles for a car driving straight ahead). |
| Q-CP-05 | quirk kept | Dead code kept: `If[Phi < -π, …]` in `modπ` and `If[Phi < 0, …]` in `mod2π` (Mod already gives 0 ≤ Phi < 2π), and the `ρ == 0` branch of `path7` (then u1 = 20/16 > 1). |
| Q-CP-06 | quirk kept | The progress cache never works: `progressOld` starts at −1 and is only assigned in the branch that requires `progressOld != -1`, so the path is recomputed on every evaluation. |
| D-CP-01 | deviation | The port always computes with machine numbers. The original's initial settings are exact numbers (integer locators, *r*<sub>min</sub> = 3), so Mathematica evaluates the formulas symbolically until `N[path]`, and comparisons are exact. For the saved state this gives 0.6464033872903242 for the first parameter where the port (and any machine-arithmetic order, and the Python) gives 0.6464033872903241; a 300-bit evaluation rounded once reproduces all four saved parameters (fixture `exactDefault`). Only last bits differ; the labels are unaffected. |
| D-CP-02 | deviation | What counts as one update differs: Mathematica's front end decides how often it re-evaluates during a drag (and the body assigns its own variables, which can trigger further evaluations); the port evaluates once per animation frame with the latest pointer position and once per key press. The body is idempotent, so the final picture is the same. |
| D-CP-03 | deviation | Sizes approximate Mathematica's: Thickness/PointSize as fractions of the plot width, default line width 1 px, `Thin` = AbsoluteThickness[0.25] = 0.25 px at ImageSize 620 (construction circles, headlight edges), the arrowhead (Arrowheads[.02]) drawn as a plain triangle, the locator glyphs as SVG (the orientation glyph's `Antialiasing -> False` is not reproduced). Headlight edges get the headlight opacity (K-CP-08). Measured darkest pixel of a grey construction circle at the initial settings: snapshot 1 220/255, port 204/255 in Chromium (181 with the shared 0.5 px `Thin` of the first draft); the remaining difference is rasterisation of sub-pixel strokes. |
| D-CP-04 | deviation | Slider value fields show "0" where Mathematica shows "0." (an HTML number field cannot show a trailing point); slider, setter and ⊕ panel look like the shared port controls, not like Mathematica's. |
| D-CP-05 | deviation | The plot label is an HTML line (14 px, black, centred) above the SVG instead of text inside the graphic; font differs. |
| D-CP-06 | deviation (resolved in v0.1.1) | Locator picking. v0.1.0: only a press within 12 CSS px of an invisible locator grabbed it, a press elsewhere did nothing, so the cars could not be dragged by their bodies (O-CP-01). The original's `Locator` controls are LocatorPane locators, which "by default direct any click to the nearest locator" (Wolfram Language reference, LocatorPane, Details). Since v0.1.1 (shared `addLocators`, `pickAnywhere`): a press within 12 px grabs the nearest locator in place (the pointer offset is kept), a press anywhere else makes the nearest of the four locators jump to the press point and drags it; all four are always active; on an exact tie the first in the order start, start orientation, goal, goal orientation wins. PORT DEVIATION kept: the 12 px zone in which a press grabs a locator WITHOUT making it jump (pointer offset kept) is the port's own choice — the distance at which Mathematica grabs an invisible locator without a jump is unknown (M-CP-08 (c)), and so is its order on exact ties (M-CP-08 (d), K-CP-10). A press that grabs a locator also gives it keyboard focus (port addition A-CP-02). During a drag see D-CP-02. |
| K-CP-01 | known issue (lead) | `Circle[c, r, {angS, angE}]` with angE < angS (forward right or backward left arcs): the port draws the arc between the two angles (it covers [min, max]). Snapshot 1 supports this (the goal-side right arc of 1.11 rad is drawn short, not as its 2π complement), but Mathematica's direction convention should be checked by the owner (e.g. a single R+ arc). Owner round 1 (2026-10-06): the requested picture (arc-test.png) was not uploaded; picture requested again. |
| K-CP-02 | known issue (lead) | Ties between different paths: which one is drawn depends on whether `MinimalBy` compares lengths exactly, with SameQ's last-bit tolerance or with Equal's tolerance, and on how `Total` rounds. Example from the fixture: start (10.567, 3.978, 2.365506), goal (2.433, 6.701, −0.211651), *r*<sub>min</sub> 10 has five equally short paths; the port and the Python pick different words. Check in Mathematica. |
| K-CP-03 | known issue (lead) | Tolerant comparisons can admit values just outside a formula's domain (`ρ >= 2` with ρ a hair below 2, then `Sqrt[ρ² − 4]` of a tiny negative number; `ArcSin` of a value a hair above 1 in `path5`/`path7`). Mathematica then computes complex numbers; the port gets NaN and such a path is never chosen. What Mathematica draws in that case is unknown. |
| K-CP-04 | known issue (lead) | Machine `Sin`, `Cos`, `ArcCos`, `ArcSin`, `Sqrt`, `Mod` may differ in the last bit between Mathematica and the browser (only `ArcTan` and `Norm` are bit-exact reproductions). Matters only for exact ties (K-CP-02) and at domain edges (K-CP-03). |
| K-CP-05 | known issue (lead) | The original draws its own `Locator` objects at `locsOld` (static positions) on top of the invisible Manipulate locators at `locs`. Whether a click on a glyph can grab such a static locator instead of the Manipulate locator is not known; the port always drags the Manipulate locator. |
| K-CP-06 | known issue (lead) | Differences between the upstream Python and the original (the port keeps the original): radians and division by *r*<sub>min</sub> (Python: degrees, radius 1); `modπ` gives (−π, π] (Python `M`: [−π, π)), so a half-turn element keeps its gear; `path2` does not reduce Phi first (Python does); extra `ρ == 0` branch in `path5` (Python divides by zero for identical poses) and `ρ > 0` checks; zero-length elements kept (Python removes them); `Total` vs left-to-right `sum`; the Dubins words have no Python counterpart (checked by geometry, the Details text and snapshot 2). |
| K-CP-07 | known issue (lead, display part resolved in v0.1.1) | Slider values: Mathematica's *r*<sub>min</sub> slider may produce 0.001 + k·0.001 with other last bits than the port's snapped value; a value typed into the field as an integer would be exact in Mathematica (exact arithmetic, D-CP-01). extra-checks.wls, Mathematica 15.0.1, owner run 2026-10-06: the `Round[…, 0.01]`/`Round[…, 0.1]` display strings are "24.08", "669.7", "670.", "20.62", which confirms the port's label formatting (F-CP-17) — resolved for the display. The slider's last bits and typed integer values were not part of that check and stay open. |
| K-CP-08 | known issue (lead) | `EdgeForm[{Thin, Black}]` inside `{Yellow, Opacity[0.8 opac], …}`: whether Mathematica applies the opacity to the headlight edges; the port does. |
| K-CP-09 | known issue (lead) | D-CP-01 is verified for the saved state only. The other exact states (after "swap start and goal" and with Dubins at the initial settings, *r*<sub>min</sub> 3) were not compared; `N` of a symbolic expression is not guaranteed to be correctly rounded. Example: after the swap the port's straight piece is 4.699796477066469, the exact value rounds to 4.699796477066468. Check with wolframscript. |
| K-CP-10 | known issue (lead, resolved in v0.1.1) | Locator picking in the original (D-CP-06). Answer: owner observation O-CP-01 (Mathematica 15.0.1, 2026-10-06: the cars can be dragged by pressing on them, also while the animation runs) and the LocatorPane reference (any click goes to the nearest locator). Changed: nearest-locator picking (D-CP-06). Still unverified: from how far a press grabs a locator without making it jump, and which locator wins when two lie on top of each other (M-CP-08). |
| O-CP-01 | owner observation | Owner testing round 1 (Mathematica 15.0.1, 2026-10-06): in v0.1.0 the centres of the cars could not be dragged in the port; in the original they can, even while progress is animating. Cause: the 12 px grab radius (D-CP-06). Fixed in v0.1.1; tests e2e "a press away from every locator moves the nearest locator there", e2e "a press on the start car body drags the car", e2e "dragging a car centre while progress is animating moves the car and the path follows". |
| O-CP-02 | owner observation | Owner state 1 (Mathematica 15.0.1, saved 2026-10-06; `tests/golden/car-paths.owner-state-1.json`): machine-number poses, *r*<sub>min</sub> 6.318, progress 0.4. `getOptimalPath` of its locators reproduces the saved optPath bit for bit, and evaluating the state leaves it unchanged (golden "car-paths: owner state 1 (machine-number poses, r_min 6.318) gives the saved optPath bit for bit"). Supports D-CP-01: with machine-number inputs the port and the original agree to the last bit. |
| N-CP-01 | note | `Times` is Orderless in Mathematica: products such as `gear*minRadius*sectionParam` in `getPos`/`drawPath` may be formed in another order there (last bit of drawn positions only). |
| N-CP-02 | note | The original's header comment says the formulas take "angle (in degrees)" (copied from the Python); the Wolfram code works in radians. |
| N-CP-03 | note | `getAllPaths` returns all candidates, but only the optimum is used: the line that would draw all of them in pink is commented out in the original ("This draws far too many lines"). |
| N-CP-04 | note | For right turns (Alpha < 0) the front-wheel angle `ArcTan[Alpha ± .375, 1.4]` lies between π/2 and π; a tyre rectangle turned by that angle about its centre looks the same as one turned by the small mirrored angle. |
| N-CP-05 | note | At progress 0 the moving car already shows the steering of the first path element (snapshot 1: turned front tyres). |

## 8. Proposed changes

No open proposal. Template (see [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md)):

| ID | Status | Requested by / date | Change | Reason | Acceptance criteria |
|----|--------|---------------------|--------|--------|---------------------|

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.0 | 2026-10-06 | first AI conversion: feature list, quirks and deviations written with the port |
| 2 | v0.1.1 | 2026-10-06 | owner testing round 1: nearest-locator (LocatorPane) picking, also during the progress animation (F-CP-05, D-CP-06 and K-CP-10 resolved, O-CP-01); golden test for owner state 1 (O-CP-02); K-CP-07 display part resolved by extra-checks.wls; K-CP-01 picture requested again; M-CP-08 updated |
| 3 | v0.1.12 | 2026-10-06 | added to this repository and published: private-preview banner removed (A-CP-04), role line updated; no other feature changes. Versions v0.1.0 and v0.1.1 in this document (Since column, rows above) are versions of the separate repository the app was developed in, not of this repository |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|-------------|---------|-------------|---------|
| I-CP-01 | Label the "distance" as a configuration-space norm, or show the planar distance next to it | users are not misled by a "distance" that includes the heading | changes the original's label | Q-CP-01 |
| I-CP-02 | Drop zero-length elements (and their construction circles) | no stray grey circles on straight paths | differs from the original's picture | Q-CP-04 |
| I-CP-03 | Optional overlay of all candidate paths (the original's commented-out pink drawing) | shows why the optimum wins | clutter; a new control needs a design entry | N-CP-03 |
| I-CP-04 | Exact (high-precision) evaluation while all inputs are integers | bit-identical numbers with the original at the initial settings | needs a high-precision math library; only the last bit changes | D-CP-01, K-CP-09 |
