# Design document: Rotating a Tesseract in Perspective

| | |
|---|---|
| Code version: | 0.1.41 |
| Document revision | 2 (2026-11-17) |
| Status | describes the app as implemented; changes are proposed and approved before they are built |
| Original | Wolfram Demonstrations Project, "Rotating a Tesseract in Perspective", contributed by Alexander Perepelitsa, published 2014-06-30 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/RotatingATesseractInPerspective/> |
| Port files | `model.js` (the original's initialization code and the Manipulate body; pure), `picture3d.js` (draws the tubes with CapForm and Specularity), `main.js` (the Manipulate on `shared/manipulate.js`), `index.html` |

## 1. Purpose and background

The caption: "A tesseract (or hypercube) is the 4D analog of the cube in 3D. It is constructed by translating a unit
cube one unit perpendicular to the 3-space of the cube. The resulting 4D object is rotated in 4D and projected to
3-space in perspective." The original builds the 32 edges of the tesseract recursively (`UpDimShape`: a segment →
a square → a cube → a tesseract, each shape copied at −1 and +1 in a new coordinate and the copies joined), rotates
them by the angle a of the slider "rotate" in the plane of the third and fourth coordinates (z, w) with homogeneous
5 × 5 matrices, moves the tesseract to w = −3 and projects it from the origin of 4-space onto the 3-space w = −1
(`Perspective[…, -1]`). The edges are drawn as tubes. At a = 0 the picture is the familiar "cube in a cube"; as a
grows the two cubes (w = ±1) turn into each other.

## 2. Scope

In scope: the original's slider, its picture (geometry, tubes, colour, lighting, plot range, image size), the
opening state and the snapshots' settings. Out of scope: anything the original does not do (port additions are the
A- features in §4).

## 3. Users and use cases

- UC-TT-01: a student turns the tesseract in 4D with the slider and watches the inner and outer cubes exchange places,
  in a browser, without Mathematica.
- UC-TT-02: a student turns the 3D picture with the mouse to see the projection from other directions.

## 4. Features

| ID | Feature | Reason | Since | Verified by |
|----|----|----|----|----|
| F-TT-01 | Slider "rotate" `{{a, 0, "rotate"}, 0, 2*3.1416, .0001, Appearance -> "Labeled"}`: 0 to 6.2832 in 62832 steps of 0.0001, value field with Mathematica's text of the value; arrow keys move one step; a typed value is used | the original's control | v0.1.41 | e2e "has the slider rotate of the original"; e2e "an arrow key moves a by one step"; e2e "dragging the slider with the mouse"; e2e "a value typed into the field is used"; M-TT-04 |
| F-TT-02 | The slider's ⊕ panel (step back, step forward, play/pause), as Mathematica's Labeled slider has | the original's control | v0.1.41 | e2e "the ⊕ panel: a step forward and play on the fixed page clock move a"; M-TT-06 |
| F-TT-03 | The edges: `IncDim`, `DblSegments`, `ConnectPoints`, `DblConnSegments` (with `Union`), `UpDimShape`; `Sqr`, `myCube`, `Tes` with 4, 12 and 32 edges in the original's order | the original's construction | v0.1.41 | unit "Sqr, myCube and Tes have 4, 12 and 32 edges"; unit "Tes is the tesseract"; unit "IncDim appends a coordinate" |
| F-TT-04 | Rotation and projection: `R4x`, `R4y`, `R4z`, `R4k`, `Rotate4X` … `Rotate4K`, `DropUnit`, `Homogen`, `RotFigure4[Tes, 0, 0, 0, a]`, `Trans5[…, 0, 0, 0, -3]`, `Perspective[…, -1]` (`PersPoint`, `Ortho`, `Mtr4`, `Trans5vec`) | the original's mathematics | v0.1.41 | unit "PersPoint scales a point"; unit "a = 0 (the opening state, snapshot 1)"; unit "the edges at each snapshot"; unit "a half turn gives the same picture"; e2e "an arrow key moves a by one step" |
| F-TT-05 | The picture `Graphics3D[{Lighter@Blue, CapForm["Round"], Specularity[White, 20], Tube[edges, 0.04]}, PlotRange -> {{-.7, .7}, {-.7, .7}, {-.7, .7}}, Boxed -> False, Lighting -> "Neutral", ImageSize -> 1.1 {400, 400}, SphericalRegion -> True]`: 32 tubes with round ends, white highlights, the default view point, a 440 × 440 px image; drawn by `View3D` with `picture3d.js` (D-TT-01 … D-TT-03) | the original's picture | v0.1.41 | unit "the picture: 32 tubes of radius 0.04"; unit "the Graphics3D options of the original"; unit "the picture stays inside the plot range"; e2e "loads without errors and draws the opening picture"; M-TT-02; M-TT-03; compare |
| F-TT-06 | Opening state a = 0: the notebook's live state, the Manipulate's initial value and snapshot 1 | golden data | v0.1.41 | unit "the opening state is the notebook"; e2e "loads without errors and draws the opening picture" |
| F-TT-07 | The four snapshots' settings (a = 0, 3.88301, 0.992743, 4.1846) give the hand-projected tesseract and the value text the snapshots show | golden data | v0.1.41 | e2e "snapshot 1: the saved setting"; e2e "snapshot 2: the saved setting"; e2e "snapshot 3: the saved setting"; e2e "snapshot 4: the saved setting"; M-TT-05; compare |
| F-TT-08 | Dragging the picture turns the 3D view (Mathematica's mouse rotation of a Graphics3D); a is unchanged | the original's behaviour | v0.1.41 | e2e "dragging the picture turns the 3D view"; M-TT-07 |
| F-TT-09 | Caption and Details text (the caption from the notebook; the original has no details text: the Details say how the picture is made) | the original's explanation | v0.1.41 | M-TT-01 |
| A-TT-01 | "Initial settings" button restores the opening state | Manipulate's Initial Settings | v0.1.41 | e2e "Initial settings restores the opening state a = 0"; M-TT-08 |
| A-TT-02 | Test and automation hook `window.__demo` (getState, setState, view with the edges, graphics, setClock, inkFraction, pixelAt, camera, meshCount) | automated tests | v0.1.41 | e2e "snapshot 1: the saved setting"; e2e "the ⊕ panel: a step forward" |
| A-TT-03 | Start-up notice when the browser cannot run the page (WebGL 2 required) | no empty page | v0.1.41 | e2e "start-up notice when" |
| A-TT-04 | Breadcrumb link to all demos | navigation | v0.1.41 | inventory |
| A-TT-05 | Credits footer (authors, title, source, licence, adaptation notice) | required by the licence (CC BY-NC-SA 3.0 §4) | v0.1.41 | e2e "attribution on" |
| A-TT-06 | This app can be bundled and served alone (§6.1) | rule 7 | v0.1.41 | e2e "bundle: tesseract-perspective runs from its own folder" |
| A-TT-07 | Landing-page thumbnail `thumbnail.webp`: the picture at the initial settings, made by `tools/make-thumbnails.mjs`; the card's picture links to this app | requested 2026-11-05 | v0.1.41 | e2e "every card on the landing page has a thumbnail that loads" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|----|----|
| `slider-a` | F-TT-01 |
| `value-a` | F-TT-01 |
| `plus-a` | F-TT-02 |
| `play-a` | F-TT-02 |
| `stepback-a` | F-TT-02 |
| `stepfwd-a` | F-TT-02 |
| `scene-canvas` | F-TT-05, F-TT-08 |
| `reset` | A-TT-01 |
| `crumbs` | A-TT-04 |
| `details` | F-TT-09 |
| `credits` | A-TT-05 |

## 6. Design

- `model.js` (simple mode): the original's initialization code with the same names and in the same order (`IncDim` …
  `Trans5`; the 5 × 5 matrices applied as written, the unused rotations with angle 0 included); `Lighter`, `CapForm`,
  `Specularity`, `White` and a `Tube` that takes a list of lines (a list of `shared/graphics3d.js` Tubes), the two
  directives as data that `shared/graphics3d.js` ignores; `styledTubes(graphics)` (the tubes with their colour, cap
  form and specularity, directives scoped to their list); `edges(a)` and `evaluate(state)` → `{ view: { a, edges },
  graphics }`; `initialState()`.
- `picture3d.js` (browser only): `drawTubes`, the `draw` option of `View3D`: each segment an open cylinder (32 sides)
  and, with `CapForm["Round"]`, a sphere at each end; one shader material per style: ambient and three directional
  lights of `MMA_NEUTRAL_LIGHTS` (`shared/mma-lighting.js`), diffuse plus white Blinn highlights with exponent 20,
  computed on the displayed colour values, with the clipping planes of the plot range.
- `main.js`: one `Manipulate({…})` — the slider spec in Mathematica's form, `ControlPlacement: 'Top'`, `View3D` with
  `ImageSize: 440`, `zoom: 1.043` (D-TT-02) and `draw: drawTubes`; the Graphics3D options (PlotRange, Boxed,
  Lighting, SphericalRegion) come from the body's Graphics3D.
- `index.html`: the white picture box as wide as the 440 px image (a page style; the pages' box is 560 px wide).

### 6.1 Building and deploying this app alone

Rule 7 of docs/DESIGN_PROCESS.md: this one app can be taken out of the repository and hosted anywhere.

- Command, in the repository folder: `npm run bundle -- tesseract-perspective` → `dist/tesseract-perspective/`.
- Contents (generated with `node tools/bundle-app.mjs tesseract-perspective --update-docs`):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/tesseract-perspective/`) | 4 | `index.html`, `main.js`, `model.js`, `picture3d.js` |
| `shared/` | 22 | `clock.js`, `graphics-extras.js`, `graphics.js`, `graphics3d-three.js`, `graphics3d-view.js`, `graphics3d.js`, `manipulate.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `mma-lighting.js`, `mma.js`, `random.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `three-helpers.js`, `ui-extra.js`, `ui-interval.js`, `ui.js`, `wl.js` |
| `vendor/three/` | 9 | `addons/controls/OrbitControls.js`, `addons/lines/Line2.js`, `addons/lines/LineGeometry.js`, `addons/lines/LineMaterial.js`, `addons/lines/LineSegments2.js`, `addons/lines/LineSegmentsGeometry.js`, `addons/renderers/CSS2DRenderer.js`, `three.core.js`, `three.module.js` |
| added by the bundler | 8 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/tesseract-perspective/DESIGN.md`, `vendor/three/LICENSE` |
<!-- bundle-contents:end -->

- Checked by e2e "bundle: tesseract-perspective runs from its own folder" (A-TT-06).

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

- D-TT-01: `Tube` of a list of lines, `CapForm["Round"]` and `Specularity[White, 20]` are not in the shared 3D renderer
  (its Tube is one polyline with flat ends, its surfaces are Lambert, without highlights): the port draws the tubes
  itself (`picture3d.js`, through View3D's `draw` option): open cylinders with a sphere at each end and a shader with
  the Neutral lights and white Blinn highlights (half vector, exponent 20, per pixel), the model of
  demos/dubins-reachability-3d. Mathematica's own highlight formula is not documented; the highlights' places and
  sizes match the snapshots by eye.
- D-TT-02: the camera is the shared SphericalRegion fit with the default ViewPoint {1.3, −2.4, 2} and `zoom: 1.043`,
  measured on the snapshots: without it the tesseract was 258 × 285 px at a = 0, the snapshot shows 269 × 297 px; with
  it the ink's bounding box equals the snapshot's to 1 px in all four snapshots.
- D-TT-03: the light directions: the depth component of each Neutral light's direction (ImageScaled position minus the
  image centre, `shared/mma-lighting.js`) is scaled by 0.6, measured on the four snapshots: with the shared directions
  the tubes' sides were lighter than in the snapshots (mean |difference| on the tube pixels 15 / 20 of 255 in red /
  blue, mean difference +7 / +19); with 0.6 it is 7 / 6 and the mean difference within ±2 (best of 0 … 1 in steps of
  0.05 to 0.1). The shared lights are unchanged.
- D-TT-04: the controls look like the layer's (label above the slider, an editable value field, the ⊕ panel's
  buttons; the play button runs at the layer's speed, not necessarily Mathematica's: M-TT-06); the value field shows
  Mathematica's text of the value (6 significant digits, "3.88301" as in snapshot 2).
- Q-TT-01: the slider ends at 2*3.1416 = 6.2832, 1.5 × 10⁻⁵ rad past a full turn (E-TT-02): the picture at the end
  differs from the opening picture by less than 10⁻⁵ units (invisible); kept.
- Q-TT-02: the tube radius 0.04 is the same for every edge: the projection makes the far cube smaller but not its
  edges thinner, so the inner cube's tubes look as thick as the outer cube's (the snapshots show this); kept.
- Q-TT-03: `RotFigure4` applies all four rotations; three of them with angle 0 (identity matrices); the port computes
  them as written.
- K-TT-01: residual shading differences to the snapshots: mean |difference| about 7 of 255 per channel on the tube
  pixels (D-TT-03), largest at the highlights and at the anti-aliased tube edges; the ink differs from the snapshots'
  in about 3 % of the pixels (edges).
- N-TT-01: a half turn (a = π) gives the same picture as a = 0 (z → −z, w → −w: the two cubes exchange places); the
  picture repeats with period π (unit "a half turn gives the same picture").
- N-TT-02: `ConnectPoints` pairs every point of the flattened segment list, so each joining edge is produced once per
  segment through its vertex (8 for 4 joining edges of the cube, 24 for 8 of the tesseract); `Union` removes the
  duplicates and sorts them (canonical order), as the port does with `shared/wl.js` Union.
- N-TT-03: the picture never reaches the plot range: |x|, |y| ≤ 1/(3 − √2) ≈ 0.631 and |z| ≤ √14/7 ≈ 0.535 for every a
  (z = √2 sin φ / (3 − √2 cos φ) is largest at cos φ = √2/3), plus the tube radius 0.04 < 0.7 (unit "the picture
  stays inside the plot range"): the clipping planes never cut a tube.

## 8. Proposed changes

Proposals for this app are tracked separately.

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.41 | 2026-11-17 | generated by `tools/new-app.mjs` (example model and controls) |
| 2 | v0.1.41 | 2026-11-17 | the port: the original's edge construction, 4D rotation and perspective projection, the slider "rotate", the tubes with round caps and white highlights in Neutral lighting (app-local), the snapshots' settings; unit and browser tests; checklist |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|-------------|---------|-------------|---------|
| I-TT-01 | `Tube` of several lines, `CapForm` and `Specularity` in `shared/graphics3d.js` / `graphics3d-three.js` (this app's `picture3d.js` as a start) | other ports draw tubes with round caps and highlights without app code | a shared change; the other 3D ports' pictures must stay the same | D-TT-01 |
| I-TT-02 | Check the direction of Mathematica's ImageScaled lights in `shared/mma-lighting.js` against more snapshots (this app measured a depth factor 0.6) | closer shading in every 3D port | a shared change; every 3D port's pictures would change | D-TT-03 |
| I-TT-03 | Sliders for the three other rotation planes (`RotFigure4` takes four angles; the original passes 0) | more ways to turn the tesseract | not in the original (a port addition) | Q-TT-03 |

## 11. Errors in the original (conceptual and mathematical)

Checked numerically in the unit tests (edge lengths, vertex degrees, the projection derived by hand, the plot range).
Kind: conceptual, mathematical, numerical or text; Status: open, kept or corrected in vX.Y.Z (the tests check these
words).

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|------|-----------------------|--------------------------|--------------------|-------------------------|--------|
| E-TT-01 | text | the caption: "constructed by translating a unit cube one unit perpendicular to the 3-space of the cube" | the code's cube has the coordinates ±1, so its edge is 2, not 1, and its two copies lie at w = −1 and w = +1, 2 units apart, not 1 (unit "Tes is the tesseract": every edge has length 2). The shape is right (a cube moved by its own edge length gives the regular tesseract); only the sizes in the text are wrong | keeps the caption as written; the port note says that the cube has edge 2 | the text would read "a cube of edge 2 two units" (or "a cube by its edge length"); the picture does not change | kept |
| E-TT-02 | numerical | the slider's maximum `2*3.1416` | 2π written with a 5-digit π: the slider ends at 6.2832, 1.5 × 10⁻⁵ rad past a full turn (Q-TT-01) | keeps 2*3.1416 (F-TT-01) | `2 Pi`: the end of the slider would draw exactly the opening picture; the change is under 10⁻⁵ units (far below a pixel) | kept |
