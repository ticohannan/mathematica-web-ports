# Design document: Shortest Distance between Two Line Segments

| | |
|---|---|
| Code version: | 0.1.24 |
| Document revision | 2 (2026-10-25) |
| Status | describes the app as implemented; changes go through Proposed changes (§8) |
| Original | Wolfram Demonstrations Project, "Shortest Distance between Two Line Segments", contributed by Aaron T. Becker, Victor M. Baez and Nikhil Navkar, published 2023-05-26 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/ShortestDistanceBetweenTwoLineSegments/> Source as text: [`docs/original-source/segment-distance.txt`](../../docs/original-source/segment-distance.txt); snapshots `docs/original-snapshots/segment-distance-1…4.png`; saved states `tests/golden/segment-distance.original-states.json` |
| Port files | `model.js` (the original's six functions and the Manipulate body; picture as Graphics3D data; pure), `main.js` (the Manipulate on `shared/manipulate.js`, picture by `View3D`), `index.html` (ControlPlacement {Top, Left} as page-level CSS) |
| Role in the project | new demonstration, ported in simple mode (v0.1.23): generator, `shared/wl.js`, plain arithmetic, new 3D primitives Tube, InfiniteLine, Text |

## 1. Purpose and background

Four points A, B, C, D in space define the segments AB (green) and CD (blue). The Demonstration finds the shortest
segment between them (red) and the shortest segment between the full lines AB and CD (yellow, with perpendicular
marks). When that yellow segment does not lie in both segments, the red one ends in at least one end point. Parallel
overlapping segments have infinitely many shortest segments, drawn as a translucent red rectangle. Translucent planes
through AB and CD, both normal to the common perpendicular, show the distance between the lines. The code follows a
StackOverflow algorithm (question 2824478), with special cases for segments of length 0.

## 2. Scope

In scope: the original's controls (four 2D sliders, four vertical sliders, two checkboxes), picture, PlotLabel and
behaviour, including the original's error in the clamping step (§11, kept). Out of scope: anything the original does
not do; port additions are the A- features.

## 3. Users and use cases

- UC-SD-01: a student moves the end points and sees when the closest points move from the interior to the end points.
- UC-SD-02: a student makes the segments parallel (e.g. snapshot 3) and sees the family of shortest segments.
- UC-SD-03: a teacher rotates the picture to show the planes through each segment and the common perpendicular.

## 4. Features

| ID | Feature | Reason | Since | Verified by |
|----|----|----|----|----|
| F-SD-01 | Top row "*xy* coordinates:" with four 2D sliders `{{axy, {-3, 3}, Subscript["A", Style["xy", Italic]]}, {-5, -5}, {5, 5}, Appearance -> Tiny}`, B (1, 1), C (−2, −4), D (4, −2); dragging moves the point continuously | the original's xy controls | v0.1.23 | e2e "has the controls of the original"; e2e "dragging in an xy pad with the mouse moves the point" |
| F-SD-02 | Left column "*z* coordinates:" with four `VerticalSlider`s A*z* 1, B*z* 2, C*z* −1, D*z* −2 in [−5, 5] (continuous, Appearance -> Tiny) | the original's z controls | v0.1.23 | e2e "has the controls of the original"; e2e "a z slider moves by keyboard" |
| F-SD-03 | Checkboxes "show plane for AB", "show plane for CD" (default True) | the original's plane switches | v0.1.23 | e2e "the plane checkboxes switch the planes" |
| F-SD-04 | `closestDistanceBetweenLines` transcribed: unit directions, `denom = Norm[Cross[uA, uB]]^2`; parallel (denom == 0): B before A / after A (nearest end points) or overlapping (line distance); otherwise t0, t1 from `Det[{t, uB, cross}]/denom`, clamped as in the original | the distance shown | v0.1.23 | unit "skew segments"; unit "parallel segments"; unit "snapshot" |
| F-SD-05 | `drawClosestDistanceBetweenLines`: red `drawShortestLineSeg` (spheres 0.4, tube 0.05) between the clamped points, yellow `drawPerpLineSeg` (spheres 0.4, tube 0.04, square marks of side 0.5 as Polygons) between the projected points; for overlapping parallel segments the red segment and a red `Opacity[0.5]` polygon of all solutions | the original's drawing | v0.1.23 | unit "drawShortestLineSeg"; unit "drawPerpLineSeg"; unit "parallel segments"; M-SD-07 |
| F-SD-06 | Segments of length 0: A = B and C = D: red segment between the points; A = B (or C = D): `findClosestPointLineSegment` for the distance and `drawClosestPointLineSegment` (yellow projection on the line, red to the clamped point) | the original's special cases | v0.1.23 | unit "findClosestPointLineSegment"; unit "drawClosestPointLineSegment"; unit "the other branches of the body" |
| F-SD-07 | The picture: green spheres 0.4 at A, B with `InfiniteLine` and `Tube` 0.05 when a ≠ b, blue at C, D likewise; translucent `InfinitePlane`s (Opacity 0.4, green through A, blue through D, spanned by the segment and (b−a)×(d−c)×segment) when the checkbox is on and dist > 0; white labels A–D (FontSize 14) | the original's Graphics3D | v0.1.23 | unit "the picture"; unit "the planes"; e2e "loads without errors"; M-SD-02 |
| F-SD-08 | Options: `Axes -> True`, `AxesLabel` italic *x*, *y*, *z*, `PlotRange -> 5.2 {{-1, 1}, {-1, 1}, {-1, 1}}`, `ImageSize -> {450, 400}`; the picture rotates with the mouse | the original's options | v0.1.23 | unit "the picture"; M-SD-02 |
| F-SD-09 | PlotLabel `Row[{"minimum distance is ", Round[dist, 0.01]}]` above the picture (a machine real: "5.51", "5.") | the original's result display | v0.1.23 | unit "roundedText"; e2e "loads without errors"; e2e "review screenshots at the four snapshot settings" |
| F-SD-10 | Opening state: the notebook's initial settings (A (−3, 3, 1), B (1, 1, 2), C (−2, −4, −1), D (4, −2, −2), both planes on) | the published state | v0.1.23 | unit "the opening state"; e2e "has the controls of the original"; M-SD-02 |
| F-SD-11 | Caption and Details text (from the Demonstration), with the StackOverflow reference of the code | the original's explanation | v0.1.23 | M-SD-01 |
| F-SD-12 | Layout `ControlPlacement -> {Top, Left}` as in snapshot 1: xy sliders above, z sliders and checkboxes left of the picture | the original's panel | v0.1.23 | M-SD-08; e2e "review screenshots at the four snapshot settings" |
| A-SD-01 | "Initial settings" button restores the opening state | Manipulate's Initial Settings | v0.1.23 | e2e "Initial settings restores the opening state" |
| A-SD-02 | Test and automation hook `window.__demo` (getState, setState, view, graphics, inkFraction) from the Manipulate layer | automated tests | v0.1.23 | e2e "a z slider moves by keyboard" |
| A-SD-03 | Start-up notice when the browser cannot run the page (DEC-22, WebGL 2 required) | no empty page | v0.1.23 | e2e "start-up notice when" |
| A-SD-04 | Breadcrumb link to all demos | navigation | v0.1.23 | inventory |
| A-SD-05 | Credits footer (authors, title, source, licence, adaptation notice) | required by the licence (CC BY-NC-SA 3.0 §4) | v0.1.23 | e2e "attribution on" |
| A-SD-06 | This app can be bundled and served alone (§6.1) | owner rule R-A | v0.1.23 | e2e "bundle: segment-distance runs from its own folder" |
| A-SD-07 | Hidden number fields of the 2D sliders (`value-…-x`, `value-…-y`, layer default; hidden by the page as Appearance -> Tiny has none) | the layer's 2D slider | v0.1.23 | e2e "has the controls of the original" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|----|----|
| `pad-axy` | F-SD-01 |
| `pad-bxy` | F-SD-01 |
| `pad-cxy` | F-SD-01 |
| `pad-dxy` | F-SD-01 |
| `value-*xy-x` | A-SD-07 |
| `value-*xy-y` | A-SD-07 |
| `vslider-az` | F-SD-02 |
| `vslider-bz` | F-SD-02 |
| `vslider-cz` | F-SD-02 |
| `vslider-dz` | F-SD-02 |
| `check-showPlaneAB` | F-SD-03 |
| `check-showPlaneCD` | F-SD-03 |
| `scene-canvas` | F-SD-07, F-SD-08 |
| `reset` | A-SD-01 |
| `crumbs` | A-SD-04 |
| `details` | F-SD-11 |
| `credits` | A-SD-05 |

## 6. Design

- `model.js`: `initialState()` (the notebook's settings) and `evaluate(state)` → `{ view, graphics }`: the body as
  written in the original (`Join[axy, {az}]` …, the nested `If` over a ≠ b / c ≠ d), with the six functions under
  their own names. `segmentsData` is the part `drawClosestDistanceBetweenLines` and `closestDistanceBetweenLines`
  share in the original (each repeats it); both return exactly what the originals return. `infinitePlane(p, {v1, v2})`
  turns `InfinitePlane[p, {v1, v2}]` into the three-point form of `shared/graphics3d.js`. `view` reports the points, the
  distance, the branch (`skew`, `before`, `after`, `overlap`, `A=B`, `C=D`, `points`), the label and the planes drawn.
- `main.js`: one `Manipulate({…})`: the 2D sliders in `#controls` (top row), the vertical sliders and checkboxes in
  the left column via the control option `parent`; `View3D` with `plotLabelElement` (the PlotLabel above the canvas)
  and `clipPadding: 0.21` (D-SD-05).
- `index.html`: page-level CSS for the {Top, Left} placement and the Tiny controls (80 px pads, 200 px sliders, no
  value fields), the label font of the 3D Text (D-SD-04).

### 6.1 Building and deploying this app alone

Owner rule R-A (2026-10-17): this one app can be taken out of the repository and hosted anywhere.

- Command, in the repository folder: `npm run bundle -- segment-distance` → `dist/segment-distance/`.
- Contents (generated with `node tools/bundle-app.mjs segment-distance --update-docs`):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/segment-distance/`) | 3 | `index.html`, `main.js`, `model.js` |
| `shared/` | 20 | `graphics-extras.js`, `graphics.js`, `graphics3d-three.js`, `graphics3d-view.js`, `graphics3d.js`, `manipulate.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `mma-lighting.js`, `random.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `three-helpers.js`, `ui-extra.js`, `ui-interval.js`, `ui.js`, `wl.js` |
| `vendor/three/` | 9 | `addons/controls/OrbitControls.js`, `addons/lines/Line2.js`, `addons/lines/LineGeometry.js`, `addons/lines/LineMaterial.js`, `addons/lines/LineSegments2.js`, `addons/lines/LineSegmentsGeometry.js`, `addons/renderers/CSS2DRenderer.js`, `three.core.js`, `three.module.js` |
| added by the bundler | 8 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/segment-distance/DESIGN.md`, `vendor/three/LICENSE` |
<!-- bundle-contents:end -->

- Checked by e2e "bundle: segment-distance runs from its own folder" (A-SD-06).

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

- D-SD-01: the 2D sliders are the layer's pads (80 px, a round thumb, no cross-hair lines) and the vertical sliders
  the browser's range input; a thumb at the limit is drawn half outside the pad. Their number fields are hidden
  (A-SD-07), as Appearance -> Tiny shows none.
- D-SD-02: the panel is laid out by page CSS (grid); the heading texts "*xy* coordinates:" and "*z* coordinates:" are
  page text, not controls. Below 560 px the left column goes above the picture.
- D-SD-03: an `InfinitePlane` whose two vectors do not span a plane (parallel segments with dist > 0, or a segment of
  length 0) is left out (since v0.1.23 `shared/graphics3d.js` also draws nothing for such a plane). What Mathematica draws
  there was not checked (M-SD-07).
- D-SD-04: the labels A–D are drawn in a sans-serif upright font on top of everything (CSS2D labels: also visible
  through a sphere in front), as the layer's 3D Text (v0.1.23).
- D-SD-05: the clipping box is 0.21 larger than the PlotRange, so spheres of points at ±5 stay whole as in the
  snapshots (Mathematica does not cut spheres at the PlotRange); planes and infinite lines still end at ±5.2.
- D-SD-06: lighting, sphere shading and the tick look follow `View3D`, not Mathematica's renderer; coincident red and
  yellow spheres show the later one (yellow), where Mathematica mixes them.
- Q-SD-01: the clamping steps use the unclamped projected points (E-SD-01): the red segment and the distance can be
  longer than the true shortest distance (snapshot 1 shows 5.51, the true distance is 5.27).
- Q-SD-02: in `drawClosestDistanceBetweenLines` the direction of the perpendicular marks depends on `t0 > 0.5` with t0
  a length, not a fraction (cosmetic, kept).
- Q-SD-03: `denom == 0` is an exact test: almost parallel segments take the skew branch with huge t0, t1 (clamped).
- Q-SD-04: Details refers to "Snapshot 2" for the parallel case; in the notebook's file order it is the third snapshot.
- N-SD-01: at snapshots 3 and 4 the distance equals an independent closest-points routine (`shared/geometry.js`
  `SegmentsClosestPoints`); it is never smaller in 2000 random cases (unit "the distance never undercuts").

## 8. Proposed changes

No open proposal. Template (see [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md)):

| ID | Status | Requested by / date | Change | Reason | Acceptance criteria |
|----|--------|---------------------|--------|--------|---------------------|

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.22 | 2026-10-25 | generated by `tools/new-app.mjs` (example model and controls) |
| 2 | v0.1.23 | 2026-10-25 | the port: the original's functions, controls ({Top, Left}), picture and PlotLabel in simple mode; opening state from the notebook |
| 3 | v0.1.24 | 2026-10-26 | version number; the shared code gained a clock for bodies that read the time, Locator variables that change between one point and a list, sector disks and Opacity on points and text (v0.1.24); no change to this app's code, behaviour or picture (pixel and scene parity with v0.1.23) |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|-------------|---------|-------------|---------|
| I-SD-01 | An option to use the corrected clamping (clamped points, as the StackOverflow code) | the true shortest distance | differs from the original | E-SD-01, Q-SD-01 |
| I-SD-02 | Cross-hair lines and an inset thumb in the layer's 2D slider (Appearance -> Tiny) | closer to the original's controls | shared/ui.js change | D-SD-01 |
| I-SD-03 | Hide 3D labels behind opaque objects (depth-tested text) | the labels as Mathematica draws them | renderer work in shared/ | D-SD-04 |
| I-SD-04 | A harness run in Mathematica at the snapshot settings (distance and drawn points) | the port checked against the original's own numbers | operator time | F-SD-04 |

## 11. Errors in the original (conceptual and mathematical)

Checked when porting (owner rule R-C).

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|------|-----------------------|--------------------------|--------------------|-------------------------|--------|
| E-SD-01 | mathematical | `closestDistanceBetweenLines` and `drawClosestDistanceBetweenLines`, "Clamp projection A/B" | `dot = Dot[uB, (pA - b0)]` and `Dot[uA, (pB - a0)]` use the unclamped projections pA, pB; the StackOverflow code projects the already clamped points (pAc, then the updated pBc). The result can exceed the true segment distance: snapshot 1 shows 5.51 where the true distance is 5.27, snapshot 2 5.3472 instead of 5.3463; about half of random cases with clamping are too long | keeps the original (Q-SD-01) | with pAc/pBc the distance equals `SegmentsClosestPoints` in 200 000 random cases (checked while porting); snapshot 1 would show 5.27 | kept |
