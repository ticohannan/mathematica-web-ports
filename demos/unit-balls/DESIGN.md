# Design document: Unit Balls for Different p-Norms in 2D and 3D

| | |
|---|---|
| Code version: | 0.1.26 |
| Document revision | 5 (2026-10-17) — §11 Errors in the original (R-C); checklist items as operator procedures (R-B) |
| Status | describes the app as implemented; changes go through *Proposed changes* (§8) and [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md) |
| Original | Wolfram Demonstrations Project, "Unit Balls for Different p-Norms in 2D and 3D", contributed by Aaron T. Becker and Ravi Patel, published December 29, 2020 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/UnitBallsForDifferentPNormsIn2DAnd3D/>. Readable source: [`docs/original-source/unit-balls.txt`](../../docs/original-source/unit-balls.txt) (since v0.1.25 it shows the notebook's `(…)^(1/p)`; earlier extractions flattened it to `(…)^1/p`); saved state: `tests/golden/unit-balls.original-state.json`; snapshots: `docs/original-snapshots/unit-balls-1…7.png` |
| Port files | `norms.js` (the original's functions, p values and their display, plot ranges, surface and mesh-line generators; pure), `plot3d.js` (the picture of one evaluation: the fitted `LIGHTING`, `COLORS`, `FRAMING`, the two plots, the plane z = 1, axes, ticks, labels and plot label of this app, drawn with `shared/plot3d.js`; the renderer `UnitBallsView`), `main.js` (the Manipulate on `shared/manipulate.js`: the dimension setter, the formula line and the two p controls as `Control` factories, the body `scene(state)`, the test hook; v0.1.21), `index.html`; shared (MIT): `shared/plot3d.js` (the generic Plot3D frame: viewer, BoxRatios group, lit-surface shader, line segments, box edges, tick segments, anchored labels, framing; v0.1.21), `shared/manipulate.js`, `shared/three-helpers.js`, `shared/ui.js` |
| Role in the project | further demonstration (extra proof of concept alongside the motion-planning port); developed in a separate, unpublished repository and added to this site in v0.1.12; WebGL 2 page (DEC-22) |

## 1. Purpose and background

The Demonstration shows the unit ball — the points at distance at most 1 from the origin — for the p-norm
‖u‖_p = (Σ abs(u_n)^p)^(1/p), for p from 1/4 (buttons) or 0.1 (slider) to ∞. In **3D** it draws the unit ball as a solid (`RegionPlot3D`):
a star with spikes along the axes for p < 1, the octahedron for p = 1, the sphere for p = 2, a rounded cube for
large p and the cube for p = ∞. In **2D** it draws the norm of (x, y) as a height ("distance") over the square
−1.5 ≤ x, y ≤ 1.5 (`Plot3D`, orange) together with the plane at height 1 (blue "water", half transparent): seen from
above, the part of the surface under water is the 2D unit ball.

## 2. Scope

In scope: the original's controls (dimension setter, formula line, discrete-p setter bar, continuous-p slider with
its value label, both bound to one variable p), both plots with their labels, box, axes and ticks, colours and
mesh lines, rotating the view with the mouse.
Out of scope (would need a design entry first): other norms or dimensions, the 2D unit ball drawn as a curve,
keeping the rotated view across changes, exporting pictures.

## 3. Users and use cases

| ID | User | Use case |
|----|------|----------|
| UC-UB-01 | student | see how the unit ball changes from star to octahedron, sphere and cube as p grows |
| UC-UB-02 | student | relate the 2D norm surface to the unit circle of the norm (the water line at height 1) |
| UC-UB-03 | tester | compare the port with the original's saved state and snapshots side by side |

## 4. Features

### 4.1 Controls

| ID | Feature | Why | Since | Verified by |
|----|---------|-----|-------|-------------|
| F-UB-01 | "dimension" setter 2D / 3D (default 3D), its label in front of the buttons; 2D shows the `Plot3D`, 3D the `RegionPlot3D` | choose the view (UC-UB-01, UC-UB-02) | v0.1.0 | e2e "has the controls of the original with their defaults"; e2e "the formula switches with the dimension"; golden "unit-balls: snapshot 2: 3D with p = 1 gives the plot, label 1‐norm, setter and slider of the picture"; golden "unit-balls: snapshot 3: 3D with p = 2 gives the plot, label 2‐norm, setter and slider of the picture"; golden "unit-balls: snapshot 4: 3D with p = ∞ gives the plot, label ∞‐norm, setter and slider of the picture"; golden "unit-balls: snapshot 5: 2D with p = 0.5 gives the plot, label 0.5‐norm, setter and slider of the picture"; golden "unit-balls: snapshot 6: 2D with p = 2 gives the plot, label 2‐norm, setter and slider of the picture"; golden "unit-balls: snapshot 7: 2D with p = ∞ gives the plot, label ∞‐norm, setter and slider of the picture" |
| F-UB-02 | Formula line under the setter (`Dynamic`, TraditionalForm, MathML): ‖(x, y)‖_p = (abs(x)^p + abs(y)^p)^(1/p) in 2D, the same with z in 3D | states the norm being drawn | v0.1.0 | e2e "the formula switches with the dimension" |
| F-UB-03 | "discrete *p*" setter bar 1/4, 1/2, 1, 2, 3, 4, 9, 16, ∞ (fractions built up), setting p to the EXACT value; the button numerically equal to p is shown selected (the real 0.5 selects 1/2, Q-UB-02) | the characteristic norms in one click | v0.1.0 | e2e "every setter value draws in both modes and shows its label"; unit "setter selection compares numerically: 0.5 selects 1/2"; golden "unit-balls: snapshot 1: 3D with p = 0.5 gives the plot, label 0.5‐norm, setter and slider of the picture"; golden "unit-balls: snapshot 5: 2D with p = 0.5 gives the plot, label 0.5‐norm, setter and slider of the picture" |
| F-UB-04 | "continuous *p*" slider 0.1 … 16, step 0.01, 150 px wide, with ⊕ animation panel and the value shown right of it (`Appearance -> "Labeled"`, an editable field: typed 2 → exact 2, 1/4 → exact 1/4, 2.5 → real, 1*^1 → exact 10, Infinity or ∞); slider values are machine reals; bound to the same p as the setter bar | any p in between (UC-UB-01) | v0.1.0 | e2e "moving the slider with the mouse sets p to a machine real"; e2e "typing a value into the value field sets p (exact or real)"; unit "parseP reads typed values as Mathematica would" |
| F-UB-05 | Initial values: dimension "3D", p = 0.5 — a machine real: of the two initialisers `{p, 0.5}` (setter) and `{p, 1}` (slider) the first wins (N-UB-01) | same opening view as the original | v0.1.0 | golden "unit-balls: the saved state is the initial state of the port"; golden "unit-balls: the saved p = 0.5 shows as in snapshot 1 (label 0.5-norm, button 1/2 selected, slider 0.5)"; e2e "has the controls of the original with their defaults"; golden "unit-balls: snapshot 1: the Settings are the live state, p the machine real 0.5" |
| F-UB-06 | p = ∞ puts the slider's thumb at its left end and shows "∞" as its value (as snapshots 4 and 7) | same display as the original | v0.1.0 | e2e "choosing infinity puts the slider at its left end and shows ∞"; unit "slider thumb: infinity at the left end"; golden "unit-balls: snapshot 4: 3D with p = ∞ gives the plot, label ∞‐norm, setter and slider of the picture"; golden "unit-balls: snapshot 7: 2D with p = ∞ gives the plot, label ∞‐norm, setter and slider of the picture" |

### 4.2 Model (`norms.js`)

| ID | Feature | Why | Since | Verified by |
|----|---------|-----|-------|-------------|
| F-UB-07 | `myNorm[{x, y, z}, p]` and `myNorm2[{x, y}, p]` = (Σ abs^p)^(1/p), same names and formulas as the original's initialisation | the norms being drawn | v0.1.0 | unit "myNorm and myNorm2 by hand" |
| F-UB-08 | `If[p < 100, …]` in both plots: ∞ uses `Max[Abs[x], Abs[y]]` (2D) and the cube −1 ≤ x, y, z ≤ 1 (3D); `PlotPoints -> If[p < 100, 25, 23]` is recorded (N-UB-03) | the ∞-norm cannot be written as a power | v0.1.0 | unit "the infinity branch: p < 100 is false only for Infinity (and typed p >= 100)"; unit "PlotPoints: 25 for p < 100, 23 for infinity" |
| F-UB-09 | p keeps exact and machine values apart and displays them as Mathematica: 1/4 as a fraction, exact 2 as "2", the real 2. as "2.", 0.5 as "0.5", ∞ as "∞" | the label shows what the original shows | v0.1.0 | unit "p values display as in Mathematica"; golden "unit-balls: plot labels and slider values of the snapshots"; golden "unit-balls: snapshot 2: 3D with p = 1 gives the plot, label 1‐norm, setter and slider of the picture"; golden "unit-balls: snapshot 3: 3D with p = 2 gives the plot, label 2‐norm, setter and slider of the picture"; golden "unit-balls: snapshot 6: 2D with p = 2 gives the plot, label 2‐norm, setter and slider of the picture" |
| F-UB-10 | 2D surface: the height field z = distance(x, y) over −1.5 … 1.5 (grid of 120 × 120 cells containing the axes and, for ∞, the diagonals; denser near the axes for p < 1) with analytic normals; the plane z = 1 with `Opacity[0.5]`; `Mesh -> None`; the boundary curves of both surfaces (BoundaryStyle) | the norm as a landscape with the water line at 1 (UC-UB-02) | v0.1.0 | unit "height field values"; unit "height field for infinity: creases are triangle edges"; unit "the 2D grid contains the axes and is denser near them for p < 1"; review |
| F-UB-11 | 2D plot range: x, y from −1.5 to 1.5, z from the table `PLOT_RANGE_2D_Z_MEASURED` (measured in Mathematica 15.0.1 for the nine setter values and the slider values 0.1 and 0.5) or, for other p, the rule "full range [0, max(1, norm at the corners)]", plus `PlotRangePadding` Scaled[0.02] on every side; `BoxRatios {1, 1, 0.4}` | the box and the height of the water as in the original (lead L-D22-01, K-UB-01) | v0.1.0 | unit "plot range of the 2D mode: full range rule"; golden "unit-balls: plane height in the 2D snapshots matches the full-range rule"; unit "the 2D plot range agrees with the PlotRange measured in Mathematica (K-UB-01)" |
| F-UB-12 | 3D surface: the exact unit sphere of the p-norm, u/‖u‖_p for u on a subdivided cube (D-UB-01), octant patches so that creases are triangle edges; normals from the gradient of the norm; plot range −1.1 … 1.1 (+ padding Scaled[0.02]), `BoxRatios` Automatic (cube) | the unit ball itself (UC-UB-01) | v0.1.0 | unit "unit-ball vertices satisfy norm 1 within 1e-12 for the setter values and slider values"; unit "the unit ball for p = 1 is the octahedron with planar faces"; unit "the unit ball for infinity is the cube"; unit "sphere normals are radial for p = 2"; unit "the unit-ball mesh is closed and consistently oriented, enclosing the volume of the p-ball"; golden "unit-balls: the p = 0.5 star reaches the points ±1 on the axes, as the spikes in snapshot 1" |
| F-UB-13 | 3D mesh lines (`Mesh -> Automatic`): the curves x = g, y = g, z = g on the surface for g = multiples of 1/8 (measured, D-UB-03), without g = ±1 for the cube (no lines along its edges, snapshot 4; the octahedron keeps its edge lines in the planes 0, snapshot 2) | the grid that shows the shape of the ball | v0.1.0 | unit "mesh values are the multiples of 1/8 in the plot range"; unit "mesh lines lie on the surface and in their planes"; unit "mesh lines on the cube: 15 lines per direction on a face, none along its edges"; unit "the octahedron has mesh lines along its edges (planes x, y, z = 0)"; golden "unit-balls: the 3D snapshots show mesh lines at multiples of 1/8" |

### 4.3 Graphics (three.js)

| ID | Feature | Why | Since | Verified by |
|----|---------|-----|-------|-------------|
| F-UB-14 | Plot label `Row[{p, "‐norm"}] Invisible[1/2]`: p as displayed by F-UB-09, U+2010 hyphen, preceded by an invisible ½ and a space (Q-UB-01), gray, centred over the box | names the norm shown | v0.1.0 | e2e "has the controls of the original with their defaults"; e2e "every setter value draws in both modes and shows its label"; golden "unit-balls: snapshot 1: 3D with p = 0.5 gives the plot, label 0.5‐norm, setter and slider of the picture"; golden "unit-balls: snapshot 4: 3D with p = ∞ gives the plot, label ∞‐norm, setter and slider of the picture" |
| F-UB-15 | Box (gray edges), axes on the box edges, 3D: ticks −1.0 … 1.0 (major every 0.5, minor every 0.1, pointing into the box, U+2212 minus) and italic axes labels x, y, z; 2D: `Ticks -> None`, axes labels *x*, *y* and "distance" | same frame as the original | v0.1.0 | review; M-UB-02 |
| F-UB-16 | Camera: `ViewPoint {1.3, -2.4, 2}` in the scaled box, perspective, image framing fitted to the snapshots; the mouse rotates the view (as dragging in Mathematica), every control change restores the default view (Q-UB-03) | same picture and the same freedom to look around | v0.1.0 | e2e "mouse drag rotates the view, and a control change shows the default view again"; M-UB-06 |
| F-UB-17 | Colours and shading: the first surface orange/yellow, the plane blue at opacity 0.5, two-sided lighting, colours combined on sRGB values, mesh and boundary lines dark gray (fitted, D-UB-04) | the look of the original (orange shapes, blue water) | v0.1.0 | review; M-UB-03 |
| F-UB-18 | Title, caption, Details text with the formulas, and the original's related links | explains the Demonstration | v0.1.0 | M-UB-01 |

### 4.4 Port additions

| ID | Feature | Why | Since | Verified by |
|----|---------|-----|-------|-------------|
| A-UB-01 | "Initial settings" button: dimension 3D, p = 0.5, default view | stands in for the Manipulate ⊕ menu → Initial Settings | v0.1.0 | e2e "Initial settings restores the opening state" |
| A-UB-02 | Redraw after a WebGL context loss (shared viewer) | a GPU reset must not leave an empty picture | v0.1.0 | e2e "redraws after a WebGL context loss (port addition)" |
| A-UB-03 | `window.__demo` automation hook (`getState`, `setState({dimension, p})`, `view`, `stats`, `inkFraction`, `cameraPosition`) | automated tests | v0.1.0 | e2e "every setter value draws in both modes and shows its label" |
| A-UB-04 | "All demos" link (the private-preview banner of v0.1.0–v0.1.1 was removed in v0.1.12, when publication was cleared) | site navigation | v0.1.0 | inventory; M-GEN-01 |
| A-UB-05 | Credit footer: original title, authors, licence, adaptation notice | required by CC BY-NC-SA 3.0 | v0.1.0 | e2e "attribution on" |
| A-UB-06 | Start-up notice (watchdog, `<noscript>`) and WebGL 2 notice when the page cannot start (DEC-22) | a clear message instead of an empty page | v0.1.0 | e2e "start-up notice when"; e2e "WebGL 2 notice on" |
| A-UB-07 | Standalone bundle: `npm run bundle -- unit-balls` writes this app alone, with exactly the files it loads, a root page, README and licence texts, to `dist/unit-balls/` (§6.1) | owner rule R-A: anyone can take this one app and host it elsewhere | v0.1.15 | e2e "bundle: unit-balls runs from its own folder"; unit "bundle contents listed in DESIGN.md match the collector" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|-------------|---------|
| `setter-dimension-*` | F-UB-01 |
| `setter-p-*` | F-UB-03 |
| `slider-p` | F-UB-04 |
| `plus-p` | F-UB-04 |
| `play-p` | F-UB-04 |
| `stepback-p` | F-UB-04 |
| `stepfwd-p` | F-UB-04 |
| `value-p` | F-UB-04, F-UB-06 |
| `scene-canvas` | F-UB-16, A-UB-02 |
| `reset` | A-UB-01 |
| `crumbs` | A-UB-04 |
| `details` | F-UB-18 |
| `credits` | A-UB-05 |

## 6. Design

- **Model** (`norms.js`, pure): the original's `myNorm`, `myNorm2`, the `p < 100` branch (`finiteBranch`,
  `distance2D`, `inRegion3D`), `plotPoints3D`; the representation of p (string = exact Mathematica number such as
  `"1/4"`, `"2"`, `"Infinity"`; JS number = machine real) with `pDisplay`/`pText`/`parseP`/`setterSelection`/
  `sliderPosition`; the plot ranges (`plotRange2D` = table `PLOT_RANGE_2D_Z_MEASURED`, else `plotRangeZ2DRule`;
  `PADDING`); the generators `heightField`, `unitBallSurface`, `meshLines`; `scene(state)` = everything one
  evaluation of the Manipulate body draws, as data.
- **Drawing** (`plot3d.js` `drawUnitBalls`, renderer `UnitBallsView`; the generic parts in `shared/plot3d.js`, MIT since
  v0.1.21): `createPlot3D` makes a `shared/three-helpers.js` viewer with the scaled box [−0.5, 0.5]³ (centre 0, longest
  side 1), so the camera sits at the ViewPoint exactly as in Mathematica; each plot is placed in a group scaled from data
  coordinates to the box with its BoxRatios (`scaledBoxGroup`). Surfaces use the one-light shader `litSurfaceMaterial`
  with this app's fitted `LIGHTING` and `COLORS`, lines use `LineSegments2` (1 px; `boxEdgeSegments`, `tickSegments`
  with this app's tick values and lengths), labels are CSS2D elements anchored at box points (`anchored`) with offsets in
  pt; `frame` applies this app's `FRAMING`. The renderer writes colours without sRGB conversion, because Mathematica
  combines colours on their sRGB values.
- **Controls** (`main.js`, one `Manipulate({…})` call of `shared/manipulate.js` since v0.1.21): the dimension setter bar
  and the rest of the Column (formula line, "discrete p" setter bar, "continuous p" slider) as `Control` factories over
  `shared/ui.js` setter bars and slider, both p controls showing the one variable p; the slider's value label is a text
  field of the page (p may be a fraction or ∞); the formula follows the dimension in `after`. Every control change re-evaluates the body (slider drags at most once per frame),
  as Manipulate does, and the new graphic starts from the default view.
- **Measured from the snapshots** (no Mathematica available; the snapshots are 900 px wide for the 648.5 pt wide
  Manipulate, 1.388 px/pt, the 400 pt image at x 315 … 870, y 49.5 … 604.5):
  - Camera: a perspective camera at the ViewPoint {1.3, −2.4, 2} (scaled box, longest side 1), looking at the box
    centre, reproduces the 4 to 6 measured box corners within 1.3 px in both modes; a camera at another distance
    does not (3.8 px at 0.8×, 14 px at 0.5×). Fitted image scale and box-centre position give `FRAMING`: view angle
    27.23° (2D) and 32.33° (3D) for the 400 pt image; box centre (+14.4, +14.1) pt and (−1.0, +12.2) pt from the
    image centre.
  - PlotRangePadding: the corners of the plane z = 1 (2D) and of the cube (3D, p = ∞) lie consistently only for a
    padding of 2–3 % per side (2 %: residual ≤ 2.6 px); 2 % (Scaled[0.02]) is used.
  - Plot range in z (lead L-D22-01): with that padding the plane z = 1 sits at 0.181, 0.475 and 0.661 of the box
    height for p = 0.5, 2 and ∞; the full-range rule predicts 0.180, 0.473 and 0.660. A range clipped at, e.g., 4
    for p = 0.5 would put it at 0.25. Hence the rule. v0.1.1: confirmed by Mathematica's own PlotRange for all setter
    values and the slider values 0.1 and 0.5 (K-UB-01, resolved); those measured ranges are now used directly.
  - Mesh lines: intensity profiles along paths on the cube's top face, an octahedron face and the sphere show lines
    at multiples of 0.125 (to ±0.005), for PlotPoints 23 and 25 alike, not at the sampling grid (spacing 0.1 or
    0.0917). On the cube no line runs along the edges (±1; the shading just changes across the edge), while the
    octahedron's edges (planes 0) do carry lines.
  - Lighting/colours: the sphere (8830 pixels with known normals) fitted with base colour × (ambient + diffuse ·
    n·l) + specular · (n·h)^5 on sRGB values, light fixed to the camera: ambient 0.227, diffuse 0.982, direction
    (0.414, 0.411, 0.79), specular 0.212, base (1, 0.565, 0); RMS error 0.037. The same model gives the cube's faces
    within ~10/255 (e.g. top face 255/160/12 against 255/150/19). The plane colour (0.348, 0.593, 1) follows from
    the plane over white (179, 211, 255) at opacity 0.5. Mathematica's classic coloured lights fit much worse
    (RMS 0.12).
  - Labels: plot label 12 pt, gray 0.35; tick labels 10 pt, black; axes labels 10 pt, gray; their offsets from the
    box points measured in the snapshots (CSS in `index.html`). The visible label text is ~6 pt right of the box
    centre in all seven snapshots — the invisible ½ and space in front (Q-UB-01).
- Why the exact surface (D-UB-01) and not marching cubes at PlotPoints 25: the snapshots show RegionPlot3D's
  adaptive result, which resolves the p = 0.5 spikes up to ±1 on the axes (snapshot 1) and gives the octahedron
  flat faces and the cube flat faces; a plain 25³ marching-cubes mesh would cut the spikes short and bevel every
  edge more than the original does. The exact surface matches the snapshots' geometry best; what it does not
  reproduce are RegionPlot3D's small artefacts (slightly rounded edges, uneven shading).

### 6.1 Building and deploying this app alone

Owner rule R-A: this one app can be taken out of the repository and hosted anywhere.

- Command, in the repository folder: `npm run bundle -- unit-balls` → `dist/unit-balls/` (with `--zip` also `dist/unit-balls.zip`;
  `npm run bundle -- --all` bundles every app). `tools/bundle-app.mjs` follows every file the page loads (HTML, import
  map, static and literal dynamic imports, stylesheets, pictures) and copies exactly those, keeping the repository's
  folder layout, so no path is rewritten; it stops with a list of problems if a reference cannot be resolved.
- Contents (generated with `npm run bundle -- --update-docs`; unit "bundle contents listed in DESIGN.md match the
  collector" keeps the table current):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/unit-balls/`) | 4 | `index.html`, `main.js`, `norms.js`, `plot3d.js` |
| `shared/` | 18 | `clock.js`, `graphics-extras.js`, `graphics.js`, `manipulate.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `mma.js`, `plot3d.js`, `random.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `three-helpers.js`, `ui-extra.js`, `ui-interval.js`, `ui.js` |
| `vendor/three/` | 9 | `addons/controls/OrbitControls.js`, `addons/lines/Line2.js`, `addons/lines/LineGeometry.js`, `addons/lines/LineMaterial.js`, `addons/lines/LineSegments2.js`, `addons/lines/LineSegmentsGeometry.js`, `addons/renderers/CSS2DRenderer.js`, `three.core.js`, `three.module.js` |
| added by the bundler | 8 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/unit-balls/DESIGN.md`, `vendor/three/LICENSE` |
<!-- bundle-contents:end -->

- Added files: `index.html` opens the app (the app's "All demos" link, `../../index.html`, leads back to it and links
  to the app), a generated `README.md` (title, the credits of the footer, licence summary, how to serve and test),
  `.nojekyll` (GitHub Pages), this document, `LICENSE.md` and the `LICENSES/` texts of the SPDX identifiers found in the
  copied files, and `vendor/three/LICENSE` (three.js).
- Requirements: any static web server (`npx serve`, `python -m http.server`, GitHub Pages); not `file://` (browsers
  block ES modules there); a browser with ES modules and import maps (Firefox ≥ 108, Chrome/Edge ≥ 89, Safari ≥ 16.4);
  WebGL 2 (three.js draws the picture; without it the page shows the WebGL 2 notice, A-UB-06). No server-side code.
- Checked by e2e "bundle: unit-balls runs from its own folder" (`tests/e2e/bundle.spec.js`): the bundle folder alone is
  served, its root page must open the app, the app must start (`window.__demo.ready`) without page errors, every request
  must stay inside the folder and succeed, and every script and stylesheet of the bundle must be loaded.

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

| ID | Kind | Description |
|----|------|-------------|
| Q-UB-01 | quirk kept | `PlotLabel -> Row[{p, "‐norm"}] Invisible[1/2]` is a product: `Times` sorts `Invisible[1/2]` first, so an invisible ½ and a space stand in front of the label, which is shifted about 6 pt to the right and always as tall as a fraction. |
| Q-UB-02 | quirk kept | One variable p for two controls: the setter sets exact values (label "2"), the slider machine reals (label "2."); the setter shows the button selected whose value equals p numerically, so the initial real 0.5 shows "1/2" selected (snapshot 1) while the label says "0.5". |
| Q-UB-03 | quirk kept | Every control change makes a new graphic, which starts again from the default ViewPoint: a rotation done with the mouse is lost when p or the dimension changes (to confirm, K-UB-07). |
| Q-UB-04 | quirk kept | `p < 100` stands for p = ∞: a typed p ≥ 100 also shows the max-norm surface and the cube, labelled with the typed value ("100‐norm" for 100, "100.‐norm" for 100.). |
| D-UB-01 | deviation | 3D: the exact unit sphere of the norm (u/‖u‖_p on a subdivided cube, 24 × 24 cells per quadrant of each cube face) instead of RegionPlot3D's sampled region. Edges and tips are sharp; RegionPlot3D's slightly rounded edges and uneven shading are not reproduced; `PlotPoints` has no effect (N-UB-03). For p ≤ 1/4 the spikes are needles thinner than the original's sampling can resolve (K-UB-09). |
| D-UB-02 | deviation | 2D: a fixed 120 × 120 grid (denser near the axes for p < 1) instead of Plot3D's adaptive sampling (`MaxRecursion -> 5`); creases (axes for p ≤ 1, diagonals for ∞) are exact. |
| D-UB-03 | deviation | Mesh lines at the multiples of 1/8 measured in the snapshots (without ±1 for the cube), not computed by Mathematica's (unknown) `Mesh -> Automatic` rule; 1 px dark gray at opacity 0.75. |
| D-UB-04 | deviation | Lighting and colours are a model fitted to the snapshots (§6), not Mathematica's lighting definition or plot theme; shading of curved parts differs slightly (e.g. the octahedron's lower faces are darker). |
| D-UB-05 | deviation | Axes, ticks and axes labels stay on the box edges of the default view when the view is rotated; Mathematica moves them to the outer edges (`AxesEdge -> Automatic`). Fonts and label offsets approximate Mathematica's. |
| D-UB-06 | deviation | Image framing (view angle, box position) is fixed per mode as fitted for the default view; Mathematica fits the picture into the image itself. While rotating, parts of the box can leave the 400 px picture. |
| D-UB-07 | deviation | The slider's value field shows fractions as "1/4" text (Mathematica: a built-up fraction) and accepts only positive integers, fractions, decimals, Mathematica's scientific notation `m*^k` and ∞; `1e1` is refused, as it is not a number in Mathematica (1 times the symbol e1). Mathematica evaluates any input (K-UB-06). |
| D-UB-08 | deviation | When `PLOT_RANGE_2D_Z_MEASURED` cuts the surface, the cut parts are simply removed (clip planes are set only then, with a margin of 10^-4 of the box height, so that boundary lines at the ends of the range stay whole); Mathematica's `ClippingStyle` is not reproduced. |
| K-UB-01 | known issue (lead L-D22-01) — **resolved in v0.1.1** | Plot3D's automatic z range: the full-range rule fits the snapshots for p = 0.5, 2 and ∞, but Mathematica may clip extreme values for small p (p = 1/4: corners at 24; slider 0.1: 1536). Check in Mathematica (after evaluating the initialisation cells) with `Table[{p, PlotRange /. AbsoluteOptions[Plot3D[{If[p < 100, myNorm2[{x, y}, p], Max[Abs[x], Abs[y]]], 1}, {x, -1.5, 1.5}, {y, -1.5, 1.5}, MaxRecursion -> 5, PlotStyle -> {Automatic, Opacity[0.5]}, PerformanceGoal -> "Quality", Exclusions -> None, Mesh -> None, Ticks -> None, ImageSize -> {400, 400}], PlotRange]}, {p, {1/4, 1/2, 1, 2, 3, 4, 9, 16, Infinity, 0.1, 0.5}}]` and enter the z ranges in `PLOT_RANGE_2D_Z_MEASURED` (keys "1/4", "1/2", …, "∞", "0.1", "0.5").  **Answer** (extra-checks.wls, Mathematica 15.0.1, owner run 2026-10-06): no clipping for any p — zmin ≈ 0 (printed as \|zmin\| < 4e-15) and zmax = the corner value × (1 − 1.43e-7), e.g. 1/4: 23.99999657142858, 0.1: 1535.9997805714295, ∞: 1.4999997857142857. The factor 1 − 1.43e-7 = 1 − 10^-6/7 fits Plot3D's outermost samples lying 10^-6 of the initial grid step (3/14) inside ±1.5; the norm is homogeneous of degree 1, so the corner value shrinks by the same factor. **Changed:** the eleven measured ranges are in `PLOT_RANGE_2D_Z_MEASURED` and used by the page; the rule (full range, exact corner) is kept for other p and agrees with every measured row to 2e-7 (unit test); clip planes are not set for such rounding-size differences. |
| K-UB-02 | known issue (lead) | Lighting and default colours fitted (D-UB-04). To get Mathematica's own values: `Cases[Plot3D[{x, 1}, {x, 0, 1}, {y, 0, 1}], _RGBColor \| _Opacity \| _Specularity, Infinity]` and `AbsoluteOptions[Plot3D[x, {x, 0, 1}, {y, 0, 1}], Lighting]`. |
| K-UB-03 | known issue (lead) | The mesh-line rule (multiples of 1/8) is measured for p = 1, 2, ∞, and fits snapshot 1 (p = 0.5: rows of line crossings on a spike at 264/281/297/311/326 px, the port's at 264/280/295/310/326 px); whether it changes with p is not known. Check: count the lines on one octahedron face (port: 7 interior lines in each direction) and on the p = 1/4 star (M-UB-07). |
| K-UB-04 | known issue (lead) | Setter highlighting by numeric equality is inferred from snapshot 1 (real 0.5 shows 1/2 selected); the exact comparison Mathematica uses (tolerance, e.g. for slider values like 3.0000000000000004) is not known. |
| K-UB-05 | known issue (lead) | p = ∞ draws the slider thumb at the left end (seen in snapshots 4 and 7); what the ⊕ panel's step and play buttons do from ∞ is not known (port: they continue from 0.1). |
| K-UB-06 | known issue (lead) | The value field: Mathematica's labelled slider accepts any typed expression; what happens for 0, negative values, values above 16, tiny values or symbols is not known (port: ≤ 0, non-numbers and p below about 0.0101 are refused — for such p the 2D corner height 1.5 · 2^(1/p) passes 10^30 and the 3D corner norm 3^(1/p) overflows, beyond what the port can draw; values above 16 are accepted with the thumb at the right end). |
| K-UB-07 | known issue (lead) | Q-UB-03 (view reset on every change) is the usual behaviour of a 3D graphic in a Manipulate without a dynamic ViewPoint; confirm by rotating the 3D plot in the original and clicking a p button. |
| K-UB-08 | known issue (lead) — **resolved in v0.1.1** | Q-UB-01 is inferred from the label position; check `FullForm[Row[{1, "‐norm"}] Invisible[1/2]]` (expected `Times[Invisible[Rational[1, 2]], Row[…]]`).  **Answer** (extra-checks.wls, Mathematica 15.0.1, owner run 2026-10-06): the FullForm is `Times[Invisible[1/2], Row[…]]` — Invisible first, which confirms Q-UB-01. Nothing changed in the port. |
| K-UB-09 | known issue (lead) | For p = 1/4 and small slider values the exact star has long needle-thin spikes; the original's RegionPlot3D (PlotPoints 25, MaxRecursion default) may show them shorter or not at all. No snapshot shows p < 1/2 in 3D (M-UB-05). |
| N-UB-01 | note | Two initialisers for one variable: `{p, 0.5}` (setter) and `{p, 1}` (slider). The first wins: the saved Manipulate output has 0.5 in both specifications, and snapshot 1 shows 0.5. The snapshot Settings list p twice (one entry per control, always the same value): 0.5 (machine real) in snapshots 1 and 5, the exact integers 1 and 2 in snapshots 2, 3 and 6 (the slider field shows "1", "2", not "1.", as F-UB-09 and Q-UB-02 say), and `DirectedInfinity[1]` in 4 and 7 (`tests/golden/unit-balls.original-states.json`). |
| N-UB-02 | note | `p < 100` on a machine real uses Mathematica's tolerant `Less` (`mLess`); inside 0.1 … 16 this cannot matter. |
| N-UB-03 | note | `PlotPoints -> If[p < 100, 25, 23]` only controls RegionPlot3D's sampling; with the exact surface (D-UB-01) it has no visible effect. Kept in the model (`plotPoints3D`) for reference. |
| N-UB-04 | note | The Details text shows the original's formulas as MathML; the notebook's template placeholders ("References for demonstration.", submission notes) are not shown. |
| O-UB-01 | owner observation | Owner testing round 1 (Mathematica 15.0.1, 2026-10-06): the port behaves as the original ("fine"); the port is faster than the original. No change needed. No extra Manipulate state was saved for this app (no `unit-balls.owner-state-1.json`). |

## 8. Proposed changes

No open proposal. Template (see [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md)):

| ID | Status | Requested by / date | Change | Reason | Acceptance criteria |
|----|--------|---------------------|--------|--------|---------------------|

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.0 | 2026-10-06 | first AI conversion: feature list, quirks, deviations and leads written with the port |
| 2 | v0.1.1 | 2026-10-06 | owner testing round 1 (Mathematica 15.0.1): K-UB-01 resolved — measured 2D PlotRange values entered in `PLOT_RANGE_2D_Z_MEASURED` and used (F-UB-11, new unit test), explanation of the factor 1 − 1.43e-7, clip planes ignore rounding-size differences; K-UB-08 resolved (confirms Q-UB-01); O-UB-01 added (owner: fine, port faster); checklist M-UB-05 updated |
| 3 | v0.1.12 | 2026-10-06 | added to this repository and published: private-preview banner removed (A-UB-04), role line updated; no other feature changes. Versions v0.1.0 and v0.1.1 in this document (Since column, rows above) are versions of the separate repository the app was developed in, not of this repository |
| 3 | v0.1.13 | 2026-10-12 | no change to this app (collision beep with a mute checkbox in prm-seven-link; new `shared/beep.js` used only there) |
| 4 | v0.1.14 | 2026-10-16 | golden tests on the seven snapshot states (`tests/golden/unit-balls.original-states.json`, `tools/extract_state.py --snapshots`): dimension, exact or machine p, label, selected setter button and slider text of each picture; N-UB-01 extended; no change to the app |
| 5 | v0.1.15 | 2026-10-17 | §11 Errors in the original added (owner rule R-C); Mathematica checklist items rewritten as operator procedures (R-B); standalone bundle (owner rule R-A): §6.1, A-UB-07, tools/bundle-app.mjs; review fixes |
| 6 | v0.1.16 | 2026-10-18 | version number only (batch B release); no change to this app |
| 7 | v0.1.17 | 2026-10-18 | version number only (harness run 2 accepted); no change to this app |
| 8 | v0.1.18 | 2026-10-18 | version number only (harness run 3 accepted for manipulability-ellipsoid); no change to this app |
| 9 | v0.1.19 | 2026-10-21 | version number only (shared Manipulate layer added, four apps migrated to it); no change to this app |
| 10 | v0.1.20 | 2026-10-21 | version number only (Manipulate layer extended, eleven more apps migrated to it); no change to this app |
| 11 | v0.1.21 | 2026-10-23 | `main.js` rewritten on the shared Manipulate layer (`shared/manipulate.js`: controls, state, reset, hook) with the app's own three.js renderer object for its picture; generic parts moved to MIT shared modules (owner decision D1): Plot3D box, ticks and lighting shader → `shared/plot3d.js`; the fitted constants stay in `plot3d.js`; no change to behaviour or picture (all unit, golden and browser tests passing; three.js scene graph, full-page pixels (SwiftShader) and Manipulate state identical to v0.1.20 at sample settings) |
| 12 | v0.1.22 | 2026-10-25 | version number; bundle table (`shared/manipulate.js` now also loads `shared/graphics-extras.js` and `shared/svg-frame.js` for the new Graphics options `Axes`/`Frame`/`PlotLabel`); no change to this app's code, behaviour or picture (pixel parity with v0.1.21) |
| 13 | v0.1.23 | 2026-10-25 | version number; the shared code gained plot functions, a geometry kit, 3D text and tube primitives and fixes for new apps (v0.1.23); no change to this app's code, behaviour or picture (pixel and scene parity with v0.1.22) |
| 14 | v0.1.24 | 2026-10-26 | version number; the shared code gained a clock for bodies that read the time, Locator variables that change between one point and a list, sector disks and Opacity on points and text (v0.1.24); no change to this app's code, behaviour or picture (pixel and scene parity with v0.1.23) |
| 15 | v0.1.25 | 2026-10-26 | version number; the shared code gained one page clock (`shared/clock.js`: slider animations and app animations read it, tests fix it), tolerant `Equal`/`Unequal` in `shared/wl.js` and exact slider texts from saved states (v0.1.25); the readable source re-extracted with the exponent grouping (`(…)^(1/p)`), Original row and §11 note updated; no change to this app's code, behaviour or picture (pixel and scene parity with v0.1.24) |
| 16 | v0.1.26 | 2026-10-27 | version number; the shared code gained region and density plots (`RegionPlot`, two-parameter `ParametricPlot`, `DensityPlot`), `BSplineCurve`, decorated insets, textures on polygons, `settleInterval` for bodies that pause between evaluations, typeset control headings and fixes found by the seven new ports (v0.1.26); no change to this app's code, behaviour or picture (pixel and scene parity with v0.1.25) |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|-------------|---------|-------------|---------|
| I-UB-01 | Keep the user's rotation when p or the dimension changes (a shared ViewPoint) | easier to compare shapes from one chosen angle | differs from the original's behaviour | Q-UB-03 |
| I-UB-02 | Move axes and ticks to the outer box edges while rotating (`AxesEdge -> Automatic`) | readable axes from every angle | needs Mathematica's edge-choice rule; more code | D-UB-05 |
| I-UB-03 | Draw the 2D unit ball (the curve abs(x)^p + abs(y)^p = 1) on the water plane | shows directly what the caption calls the 2D unit ball | adds a feature the original does not have | F-UB-10 |
| I-UB-04 | Accept expressions in the value field (Sqrt[2], 3/2 + 1) | closer to Mathematica's input field | needs an expression parser | D-UB-07, K-UB-06 |

## 11. Errors in the original (conceptual and mathematical)

Where the original is probably wrong, as distinct from the quirks of §7 that are merely unusual (owner rule R-C,
[`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md) rule 9). Every row is an open question for the owner; the port
keeps the original's behaviour. Checked on 2026-10-17 against the readable source
[`docs/original-source/unit-balls.txt`](../../docs/original-source/unit-balls.txt). Not an error: `myNorm` read
`(…)^1/p` in the flattened source of that time (since v0.1.25 the extraction keeps the grouping: `(…)^(1/p)`), and the measured plot range (K-UB-01: 24 for p = 1/4 at the corner, i.e.
(2·1.5<sup>1/4</sup>)<sup>4</sup>) shows that the notebook computes (…)<sup>1/p</sup>, not (…)<sup>1</sup>/p. The Details formulas
for p = 1, 2, ∞ and 1/2 are correct as formulas.

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|------|-----------------------|--------------------------|--------------------|-------------------------|--------|
| E-UB-01 | text | Caption: "The distance is measured using different p-norms, which are standard norms for finite-dimensional spaces"; Details: "A p-norm is a norm on a finite-dimensional space of dimension N defined as …", "The following metric might represent these tradeoffs … ‖u‖<sub>1/2</sub> = (…)²"; plot labels "0.5‐norm", "1/4‐norm"; buttons 1/4 and 1/2 and the slider from 0.1 | For p < 1 the formula is not a norm: the triangle inequality fails (p = 1/2: ‖(1, 0) + (0, 1)‖ = 4 > ‖(1, 0)‖ + ‖(0, 1)‖ = 2) and the "unit ball" is not convex (the star shapes the Demonstration shows); d(u, v) = ‖u − v‖<sub>1/2</sub> is not a metric either (d((0,0),(1,1)) = 4 > 1 + 1). It is a quasi-norm; ‖u − v‖<sub>p</sub><sup>p</sup> is a metric for 0 < p < 1. The Details sentence "norms for p < 1 are uncommon" also calls them norms. | shows the original's text and labels (F-UB-18 and the plot label) | Wording only ("p-norm" → "p-norm (a quasi-norm for p < 1)", "metric" → "measure"); a changed plot label would change the label tests and M-UB-02. No computation changes. No I- entry yet. | open |
| E-UB-02 | text | Details: "The norm for p=∞ … In 3D the unit ball is a unit cube"; "The norm for p=2 is the usual Euclidean square norm" | The ∞-norm unit ball is the cube [−1, 1]³ of edge 2, not the unit cube (edge 1), as the picture itself shows (box −1…1). "Euclidean square norm" usually means the squared norm Σ u<sub>n</sub>², which is not what is plotted; the formula below the sentence is the Euclidean norm. | shows the original's text (F-UB-18) | Text only (M-UB-01). | open |
| E-UB-03 | text | Details: "This Demonstration shows sets of unit-norm vectors u for different p-norms"; "In 3D, this Demonstration shows unit balls for the selected norm value. The unit ball is distance 1 from the origin" | The unit ball is the set of points at distance AT MOST 1 (as the caption says, "within distance 1"); the points at distance exactly 1 (the unit-norm vectors) form the unit sphere, its surface. The 3D plot (`RegionPlot3D[myNorm[…] <= 1, …]`) draws the ball; the text mixes the two. | shows the original's text (F-UB-18) | Text only (M-UB-01). | open |
