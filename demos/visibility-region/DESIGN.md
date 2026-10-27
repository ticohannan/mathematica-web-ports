# Design document: Visibility Region of a Polygon

| | |
|---|---|
| Code version: | 0.1.26 |
| Document revision | 2 (2026-10-26) |
| Status | describes the app as implemented; changes go through Proposed changes (§8) |
| Original | Wolfram Demonstrations Project, "Visibility Region of a Polygon", contributed by Shreyas Poyrekar, Arifa Sultana and Aaron T. Becker, published 2019-09-13 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/VisibilityRegionOfAPolygon/> Source as text: [`docs/original-source/visibility-region.txt`](../../docs/original-source/visibility-region.txt); snapshots `docs/original-snapshots/visibility-region-1…5.png`; saved states `tests/golden/visibility-region.original-states.json` (`states[0]` the live state, `specs` the Manipulate's initial values, `snapshots` the five snapshots' settings) |
| Port files | `model.js` (the Initialization definitions under their names — lines, normals, the segment test, angles, the winding-number test, reflex and glancing-blow tests — and the body: the visibility sweep statement by statement and the picture of one step; pure), `main.js` (the Manipulate on `shared/manipulate.js`), `index.html` |
| Role in the project | new demonstration, ported in simple mode (v0.1.26): generator, `shared/wl.js`, `shared/graphics.js`, plain arithmetic; the first port whose body is a long imperative algorithm (a sweep with its intermediate steps on a slider) |

## 1. Purpose and background

The visibility region of a point *p* in a polygon is the set of points that can be joined to *p* by a straight line
that does not cross a wall — the part of a building lit by a flashlight at *p*. The Demonstration computes it with
the angular sweep of Lee's thesis [1]: a ray from *p* parallel to the *x* axis finds the walls it crosses (the "J
list", sorted by distance; the nearest is visible); then the 40 corners (the 36 of the building and the 4 of the
square around it) are visited in order of their polar angle from *p*; at each corner the walls on its two sides enter
or leave the J list, and the corner, or where its ray meets the wall behind it, is added to the region when it is
visible. The slider steps through this sweep: the orange part is the region found so far, the blue ray points at the
current corner, the thick orange line is the latest visible wall and the green lines are the J list. Dragging the blue
point recomputes everything; a point outside the building (between its walls and the square) sees the building as an
obstacle.

## 2. Scope

In scope: the original's control, its 13 locators, the picture of every step of the sweep and its quirks, with the
notebook's saved state as the opening state. Out of scope: anything the original does not do (port additions are the
A- features); a different visibility algorithm (the original's sweep is ported as it is, §11 lists where it fails).

## 3. Users and use cases

- UC-VR-01: a student drags the blue point through the rooms and watches the yellow region change, also from outside
  the building.
- UC-VR-02: a student steps through the 42 steps of the sweep and follows how the J list (green), the latest visible
  wall (orange) and the region found so far (orange) evolve — the algorithm of the Details.
- UC-VR-03: a teacher uses the region for the art gallery problem: where must a guard stand to see a given room?

## 4. Features

| ID | Feature | Reason | Since | Verified by |
|----|----|----|----|----|
| F-VR-01 | Slider "vertices sorted by angle" `{{s, 3, "vertices sorted by angle"}, 1, m + 2, 1, Appearance -> "Labeled"}` (the stored specs; Q-VR-02): step 1 shows the first ray, step k + 1 the sweep after the k-th corner, step m + 2 the finished region | the Details' "the slider steps through each vertex" | v0.1.26 | e2e "has the control of the original with its saved value"; e2e "a slider step by keyboard moves the sweep"; M-VR-03 |
| F-VR-02 | Hidden variable `{{m, 40}, ControlType -> None}` written by the body as `Length@sortedList` (always 40): the slider's range 1 … m + 2 = 1 … 42 | the number of corners | v0.1.26 | e2e "has the control of the original with its saved value"; unit "step 3 (snapshot 1)" |
| F-VR-03 | Locator variable `{{pts, {13 points}}, 6{-1, -1}, 6{1, 1}, Locator, Appearance -> None}`: 13 invisible locators; pts[[13]] is the reference point p, drawn by the body as the blue point; pts[[11]], pts[[12]] make the unused `o`, the others are unused (Q-VR-01); as in a LocatorPane a click moves the nearest locator there | the reference point | v0.1.26 | e2e "dragging the blue point with the mouse"; e2e "a click away from the blue point moves the nearest invisible locator"; e2e "loads without errors and draws the saved state"; M-VR-08 |
| F-VR-04 | The polygons: the building `1.5 Reverse@{36 points}` (counter-clockwise, area 90) and the workspace `(6 (2 0.707107)) CirclePoints@4` (corners ±6.0000019); each is reversed (clockwise) when `testpoint` (winding number) finds p inside it; a p outside the building sees it as an obstacle inside the workspace (Q-VR-07) | the walls | v0.1.26 | unit "the polygons: the workspace 8.485284 CirclePoints[4]"; unit "the region equals a ray-casting visibility polygon"; M-VR-08 |
| F-VR-05 | Adjusting p before the sweep: coordinates beyond ±6 clamped; p on a corner of the building moved by 0.00001 (2 v₁ − v_index−1 − v_index+1) with index left at the last corner (E-VR-01); p on a wall moved 0.00001 against `normalVector` (the wall's right-hand normal), i.e. into the building | keeps p off the walls | v0.1.26 | unit "the nudges: p beyond ±6 is clamped" |
| F-VR-06 | The first ray `infiniteLine = {p, {0.1 + max x, p_y}}`: the walls it crosses (`SegmentIntersectionQ`), reversed, sorted by the distance of the crossing (`distSortCond`) — the J list; `fvPoint` its crossing with the nearest; the crossings of that wall with the other J-list walls that p sees are visible, and one above p's line becomes the latest visible wall `lvLine` | the start of the sweep | v0.1.26 | unit "the saved state: p = "; unit "distSortCond" |
| F-VR-07 | The 40 corner triples `vertexList` of both polygons sorted by the angle of their middle corner from p, ties by distance (`angleSortCond`); `{p, fvPoint}` added before and after (42 entries) | the order of the sweep | v0.1.26 | unit "the saved state: p = "; unit "angleSortCond (by angle, ties by distance)" |
| F-VR-08 | The sweep, per corner b (with a, c its neighbours): `tb` (b moved 0.00001 off a ray through the next corner, D-VR-01); visible when not `intersectInteriorQRev2` and no J-list wall crosses p b (and the further conditions of the original); a visible corner adds the crossing of `lvLine` with b c, then either itself (and its walls' crossings with the J list) or, for a glancing blow, b and the nearest wall point of the extended ray p b (`giList`) in the original's order; a hidden corner adds the crossing of `lvLine` with b a or b c; the walls b a, b c going counter-clockwise enter the J list, those ending at b leave it | the algorithm of the Details | v0.1.26 | unit "the region of the saved state"; unit "snapshots 2"; unit "the region equals a ray-casting visibility polygon"; unit "level with two corners" |
| F-VR-09 | The Initialization definitions with the original's names and arguments: `lineList`, `vector`, `normalVector`, `vertexList`, `λ`, `LineIntersectionPoint`, `SegmentIntersectionQ` (crossing rounded to 1e-7, end points excluded, Q-VR-05), `getAngle`, `intersectInteriorQRev2`, `getClockwiseAngle`, `testpoint`, `glancingBlow`, `reflex`, `extendedLine`, `pointOnSegmentQ`, `leftOrRight`, `noIntersection`, `angleSortCond`, `distSortCond` | side-by-side comparison with the original | v0.1.26 | unit "lineList, vertexList, vector, normalVector"; unit "LineIntersectionPoint: "; unit "SegmentIntersectionQ: a crossing inside both"; unit "getAngle in [0, 2π)"; unit "intersectInteriorQRev2: p inside the wedge"; unit "reflex: Chop"; unit "testpoint: winding number"; unit "pointOnSegmentQ: "; unit "leftOrRight (True on the right" |
| F-VR-10 | Step s shows the lists stored during the sweep: the orange region `visibleSList[[s]]`, the blue ray to `sortedList[[s, 2]]` with the arc `Circle[p, 0.2, {0, angle}]`, the latest visible wall `lvLineList[[s]]` and the J list `JlineList[[s]]` (one step behind, Q-VR-03); step 1: the first ray only; step m + 2: the whole region in orange, no wall (`Line@{{}, {}}`) | shows how the region is built | v0.1.26 | unit "step 3 (snapshot 1)"; unit "every step of the notebook"; unit "step 1 of the saved point"; e2e "a slider step by keyboard moves the sweep"; M-VR-03 |
| F-VR-11 | The picture (`PlotRange -> 6.05 {{-1, 1}, {-1, 1}}`, `ImageSize -> {450, 450}`): building and square outlined (`Opacity[0.5], EdgeForm[{Thin}], Transparent`), the region (`EdgeForm[Lighter[Purple, 0.8]], Opacity[0.5], Yellow`), the step's region (`Opacity[0.3], Orange`), p (`Blue`, Medium point, N-VR-02) and the arc, the ray (`Opacity[0.4], Blue`), `lvLine` (`Orange, Thickness[0.01]`), the J list (`Thickness[0.005], Green`), the region's corners (`Red` points) | the original's drawing | v0.1.26 | unit "the picture of the opening state"; e2e "loads without errors and draws the saved state"; M-VR-02 |
| F-VR-12 | Opening state = the notebook's saved state, which equals its stored initial settings: s = 3, m = 40, the 13 points, p = (−1.83, 0.47) | the published Demonstration's picture | v0.1.26 | unit "the opening state is the notebook"; e2e "has the control of the original with its saved value"; M-VR-02 |
| F-VR-13 | The five snapshot settings (p = (−1.83, 0.47) at step 3; p = (−1.69, 0.65) at steps 3, 10, 38 and 42) give the snapshot pictures | the original's examples | v0.1.26 | unit "snapshots 2"; unit "the region of the saved state"; e2e "review screenshots at the five snapshot settings"; M-VR-07 |
| F-VR-14 | Caption and Details text (from the Demonstration) with the five references | the original's explanation | v0.1.26 | M-VR-01 |
| A-VR-01 | "Initial settings" restores the stored initial values (= the opening state: step 3, the saved points) | Manipulate's Initial Settings | v0.1.26 | e2e "Initial settings restores the saved state"; M-VR-04 |
| A-VR-02 | Test and automation hook `window.__demo` (getState, setState, view, graphics, moveLocator, worldToClient) from the Manipulate layer; `view()` reports p, fvPoint, the step's vertex, angle, active edge, J list and region | automated tests | v0.1.26 | e2e "dragging the blue point with the mouse" |
| A-VR-03 | Start-up notice when the browser cannot run the page (DEC-22) | no empty page | v0.1.26 | e2e "start-up notice when" |
| A-VR-04 | Breadcrumb link to all demos | navigation | v0.1.26 | inventory |
| A-VR-05 | Credits footer (authors, title, source, licence, adaptation notice) | required by the licence (CC BY-NC-SA 3.0 §4) | v0.1.26 | e2e "attribution on" |
| A-VR-06 | This app can be bundled and served alone (§6.1) | owner rule R-A | v0.1.26 | e2e "bundle: visibility-region runs from its own folder" |
| A-VR-07 | The locators take the keyboard focus and move by 0.05 per arrow key (the layer's locator pane; K-VR-01) | use without a mouse | v0.1.26 | e2e "dragging the blue point with the mouse" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|----|----|
| `slider-s` | F-VR-01 |
| `value-s` | F-VR-01 |
| `plus-s` | F-VR-01 |
| `play-s` | F-VR-01 |
| `stepback-s` | F-VR-01 |
| `stepfwd-s` | F-VR-01 |
| `locator-pts-*` | F-VR-03, A-VR-07 |
| `reset` | A-VR-01 |
| `crumbs` | A-VR-04 |
| `details` | F-VR-14 |
| `credits` | A-VR-05 |

## 6. Design

- `model.js`: the Initialization definitions in the original's order under its names (F-VR-09), one function each;
  `visibility(pts)` is the body up to `Graphics`, statement by statement: the Module's locals, the nudges, the
  reversals, the first ray and J list, the sort, the `For` loop over the 40 corners with the original's nested `If`s,
  the final `Prepend`/`Append`; it returns the original's lists (`sortedList`, `visibleSList`, `JlineList`,
  `lvLineList`, 42 entries each, and `visibleList`). `evaluate(state)` → `{ state, view, graphics }` draws step s
  and returns m (a Manipulate variable the body writes). Mathematica's `==`, `!=`, `<`, … on computed reals are
  `Equal`, `Unequal`, `Less`, … of `shared/wl.js`; `AppendTo[x, e]` is `x = Append(x, e)` (lists are values, so the
  stored steps do not change later); `DeleteCases` patterns compare the numbers exactly; a 2 × 2 `Det` is the
  expansion a d − b c (N-VR-03). `SAVED` holds the notebook's saved state.
- `main.js`: one `Manipulate({…})` — the slider with the dynamic maximum `m + 2`, the hidden `m`, the Locator list
  `pts` with `Appearance: None`, `ControlPlacement: 'Top'`, `PlotRange` ±6.05 without padding (N-VR-04).
- The body runs the whole sweep at every evaluation, as the original (Q-VR-06): about 3 ms in Node.

### 6.1 Building and deploying this app alone

Owner rule R-A (2026-10-17): this one app can be taken out of the repository and hosted anywhere.

- Command, in the repository folder: `npm run bundle -- visibility-region` → `dist/visibility-region/`.
- Contents (generated with `node tools/bundle-app.mjs visibility-region --update-docs`):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/visibility-region/`) | 3 | `index.html`, `main.js`, `model.js` |
| `shared/` | 17 | `clock.js`, `graphics-extras.js`, `graphics.js`, `manipulate.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `mma.js`, `random.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `ui-extra.js`, `ui-interval.js`, `ui.js`, `wl.js` |
| added by the bundler | 7 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/visibility-region/DESIGN.md` |
<!-- bundle-contents:end -->

- Checked by e2e "bundle: visibility-region runs from its own folder" (A-VR-06).

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

- D-VR-01: `tb` compares `pbaAngle <= Pi/3` before this corner's `pbaAngle` is computed (E-VR-04). At the first corner
  the variable has no value yet: when that corner lies exactly between p and the next one (e.g. p = (1, −1.5), level
  with (3, −1.5) and (5.25, −1.5)), Mathematica leaves the comparison, the `If` and so `tb` unevaluated and the rest
  of that corner's test works on symbols; the port takes the comparison as False and gives the true region there.
- D-VR-02: a step number outside 1 … m + 2 (possible only through the test hook) is taken as the nearest end
  (Mathematica: a Part error).
- Q-VR-01: the Locator control has 13 points, all invisible; only pts[[13]] is p. As in a Mathematica LocatorPane a
  click moves the nearest locator to it, so a click away from the blue point usually moves one of the twelve unused
  invisible points and nothing changes (E-VR-05); to move p, grab the blue point. The blue point is drawn at p after
  the nudges (F-VR-05); the locator itself stays at pts[[13]].
- Q-VR-02: the published input cell reads `{{s, 1, …}}` and `{{m, 1}}`, but the notebook's Manipulate output (and
  so the published Demonstration, its saved state and its Initial Settings) was made with `{{s, 3, …}}` and
  `{{m, 40}}`; the port follows the output: it opens at step 3.
- Q-VR-03: the J list drawn at step s is the one after corner s − 2 (`JlineList` gets the first list twice), one step
  behind the ray, the orange wall and the orange region (snapshot 1: the green lines are the list after corner 1
  while the ray points at corner 2).
- Q-VR-04: at steps 1 and m + 2 the arc ends at `getAngle[{p, fvPoint}]`, which is 0 or a hair below 2π depending on
  the last bit of `fvPoint`'s y: a full circle in snapshot 5 (p = (−1.69, 0.65)), nothing at step 1 of the saved
  point (−1.83, 0.47) (N-VR-03).
- Q-VR-05: `SegmentIntersectionQ` rounds the crossing to 1e-7 and excludes the four end points: segments that only
  touch, or cross less than 5e-8 from an end point, do not intersect.
- Q-VR-06: `oldP` is a `Module` variable set to `{}` at every evaluation, so `If[oldP != p, …]` is always True: the
  whole sweep runs again whenever the slider moves (the slider only picks a stored step); m is written each time.
- Q-VR-07: p outside the building (in the white corridor along its walls, the slots or the notch) is not reversed:
  the building is then an obstacle and the visible part of the square around it is the region.
- K-VR-01: the arrow keys (A-VR-07) move p in steps of 0.05; from snapshot 2's point (−1.69, 0.65) two presses up
  reach y = 0.75, level with two corners, where the original's sweep misses part of the region (E-VR-02). Dragging
  with the mouse, as in Mathematica, almost never lands exactly on such a line.
- N-VR-01: the outlines are `EdgeForm[{Thin}]` (AbsoluteThickness 0.25, black) with `Transparent` faces; the renderer
  does not fade edges with the face's `Opacity[0.5]`: both draw a light gray 1-pixel line.
- N-VR-02: the original writes `PointSize -> Medium` (a rule, not a directive) inside the primitive list, and also
  `PreserveImageOptions -> True`; the snapshots show the blue point clearly larger (about 4.4 px) than the red ones
  (about 3 px), so the port uses `PointSize[Medium]`; the second rule has no visible effect and is left out.
- N-VR-03: a 2 × 2 `Det` (in `LineIntersectionPoint` and `SegmentIntersectionQ`) is computed as a d − b c. With the
  elimination of `shared/wl.js` `Det`, `fvPoint` lands exactly on p's line for snapshot 5 and the arc of the last step
  would be empty; with the expansion it lies 1.1e-16 below and the arc is the full circle the snapshot shows. No other
  result changed at 3000 random points. Larger matrices (the 3 × 3 of `reflex`) use `wl.js` `Det`.
- N-VR-04: `PlotRangePadding` is 0: in the snapshots the square's edges (±6.0000019) lie at x = 18 and 465 px, i.e.
  37.25 px per unit, so the 450-px picture spans ±6.05 (Mathematica's 2 % padding would give 35.8 px per unit).
- N-VR-05: the region was compared with an independent ray-casting visibility polygon: the same area (to 1e-8) at
  6000 random points inside and outside the building; differences only where p is level with corners or exactly on
  a line through two corners (E-VR-02), and by the 0.00001 nudges (3e-5 for the saved point, whose ray through
  (0, −0.75) also passes (2.25, −2.25)). At such exact positions the original's tolerances (Chop 1e-10, rounding to
  1e-7, `Equal`) decide, and Mathematica's rounding (e.g. of `VectorAngle`) may decide a case differently from the
  port's; in general position the two agree.
- N-VR-06: what Mathematica draws as nothing, the port leaves out: `Circle[p, 0.2, {0, 0}]` (the renderer would draw a
  dot for a zero-length arc), `Line@{{}, {}}` at step m + 2 (an invalid line) and `Point@{}` (a dot at the origin).
- N-VR-07: the functions' names do not always say what they compute: `getClockwiseAngle` returns the angle turned
  counter-clockwise from p3 − p2 to p1 − p2; `glancingBlow` is True when the ray crosses the wall at the corner (the
  body calls the other case the glancing blow); the port keeps the names and documents the meaning.
- N-VR-08: the Locator option `FrameMargins -> -5` of the original is left out: it changes nothing visible (the locators
  are invisible, `Appearance -> None`). `Sort(list, p)` of shared/wl.js keeps tied elements in input order, Mathematica's
  `Sort[list, p]` may not; in `giList` this matters only for exact distance ties at the degenerate positions of N-VR-05.

## 8. Proposed changes

No open proposal. Template (see [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md)):

| ID | Status | Requested by / date | Change | Reason | Acceptance criteria |
|----|--------|---------------------|--------|--------|---------------------|

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.25 | 2026-10-26 | generated by `tools/new-app.mjs` (example model and controls) |
| 2 | v0.1.26 | 2026-10-26 | the port: the original's slider, its 13 invisible locators and the visibility sweep statement by statement with every step drawn, in simple mode; opening state from the notebook; tests against the snapshots and against a ray-casting visibility polygon |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|-------------|---------|-------------|---------|
| I-VR-01 | Keep only the locator of the reference point (drop the twelve unused invisible ones) | a click anywhere moves the blue point | differs from the original's control | Q-VR-01, E-VR-05 |
| I-VR-02 | Nudge p off a corner along that corner's own bisector (use the corner's index, not the last one) | the nudge keeps p inside at every corner | p exactly on a corner changes its region | E-VR-01 |
| I-VR-03 | Treat corners on one ray from p as one event (or perturb p symbolically) | correct regions when p is level with corners | a change to the original's sweep | E-VR-02, K-VR-01 |
| I-VR-04 | Draw the J list of the current step (not the previous one) | the green lines match the ray and the orange wall | differs from the snapshots | Q-VR-03 |
| I-VR-05 | Draw the arc of steps 1 and m + 2 consistently (always empty, or always full) | no dependence on the last bit | differs from snapshot 5 or from the saved point's step 1 | Q-VR-04 |

## 11. Errors in the original (conceptual and mathematical)

Checked when porting (owner rule R-C): the region was compared with a ray-casting visibility polygon (N-VR-05) and the
helper definitions with hand-derived values (unit tests); the snapshot regions are right.

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|------|-----------------------|--------------------------|--------------------|-------------------------|--------|
| E-VR-01 | conceptual | the body: `If[Or@@((index = Flatten@Position[complexPoly, #]; p == #) & /@ complexPoly), p = p − 0.00001 (2 complexPoly[[1]] − RotateLeft[complexPoly, index − 2][[1]] − RotateLeft[complexPoly, index][[1]])]` | The `Map` assigns `index` for every corner, so it ends at the last corner (36) whichever corner p is on, and the shift is always 0.00001 (v₃₅ − v₁) = (−0.000015, +0.0000225) instead of along the corner's bisector; the `2 complexPoly[[1]]` should be twice the corner itself. At convex corners like (5.25, 3) this moves p out of the building | keeps it (unit "the nudges") | p on a corner (exact coordinates only) stays inside and sees the rooms; nothing changes for other points | kept |
| E-VR-02 | conceptual | the sweep: corners on one ray from p (`angleSortCond` ties, the `tb` nudge, the end-point rule of `SegmentIntersectionQ` for the first ray) | When p is exactly level with corners or on a line through two corners, the sweep can skip a corner: at p = (−1.69, 0.75) the region goes straight from (−5.25, 5.25) to (−2.25, 0.75) and misses the triangle with (−5.25, 0.75) (area 6.75 of 55.82); at p on the corner (2.25, 3) the region lacks 3.1 of 51.3. In general position the region is exact (N-VR-05) | keeps it (unit "level with two corners") | correct regions for such points (I-VR-03); the snapshots do not change | kept |
| E-VR-03 | text | Details, third paragraph: "add the lines that extend in the clockwise half-plane into the J list and remove the lines that extend in the counterclockwise half-plane" | The code adds the walls that go counter-clockwise from the ray (`pbaAngle < π`: ahead of the sweep, which turns counter-clockwise) and removes those that end at the corner (behind it): the two half-planes are swapped in the text | keeps the original's text | the sentence with the half-planes exchanged | kept |
| E-VR-04 | conceptual | the body, `tb = N@If[pointOnSegmentQ[{p, postB}, b], If[postB == a \|\| pbaAngle <= Pi/3, …], b]` | `pbaAngle` is assigned only later in the loop, so the test uses the previous corner's angle, and at the first corner a variable without value (D-VR-01) | takes the missing value as failing the test (D-VR-01) | the current corner's angle; the side of the nudge changes only for corners on one ray from p | kept |
| E-VR-05 | conceptual | the Manipulate: `{{pts, {13 points}}, …, Locator, Appearance -> None}` with only `pts[[13]]` used | Twelve invisible locators without any effect (two feed the unused `o`) catch the clicks near them, so a click on the picture often moves nothing visible | keeps them (Q-VR-01) | a click anywhere moves the blue point (I-VR-01) | kept |
