# Design document: Chart for a Torus

| | |
|---|---|
| Code version: | 0.1.16 |
| Document revision | 1 (2026-10-18) — first implementation |
| Status | describes the app as implemented; changes go through *Proposed changes* (§8) and [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md) |
| Original | Wolfram Demonstrations Project, "Chart for a Torus", contributed by Aaron T. Becker and Haoran Zhao, published 2016-05-02 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/ChartForATorus/>. Readable source: [`docs/original-source/torus-chart.txt`](../../docs/original-source/torus-chart.txt); snapshots: `docs/original-snapshots/torus-chart-1.png` … `-4.png` (files 5 and 6 of the extraction are 96 × 100 placeholder icons); golden data: `tests/golden/torus-chart.original-states.json` (COMMON-DECISIONS §1: `states[0]` = the live state, `snapshots[1…4]` = the snapshot cells' Settings, raw notebook lines 2311, 6086, 9212, 12067, `specs` = the initial settings; λ read from the raw notebook by `tools/extract_state.py --snapshots`, N-TC-01) |
| Port files | app: `model.js` (TorusToPlane, the dial angles, the plot label, one evaluation of the body, the style constants; pure), `surface.js` (sampling of the manifold: grid, front-face orientation and normals, boundary curves, the 15 z contours of the mesh; pure), `main.js` (controls, the three.js picture with its own two-sided light shader and back-to-front triangle order, the test hook), `index.html`; common (CC BY-NC-SA, owner two-link-kinematics, COMMON-DECISIONS §3): `demos/common/dial-control.js` (`makeDialControl` with `setter: 'normalize'`, `arc: 'arrowArcCircle'`, `imageSize: 160`, `labels: 'stacked'`; no app-level dial) and through it `demos/common/arrow-arcs.js` (`arrowArc`); shared (MIT): `shared/three-helpers.js` (square viewer, fat lines, CSS2D labels, ink), `shared/ui.js` (λ slider, `mmaSliderText`), `shared/mma.js` (tolerant comparisons), `shared/mma-exact.js` (`arcTan`), `shared/mma-colors.js`; through dial-control.js: `shared/mma-extra.js` (`normalizeCR`), `shared/mma-text.js` (`piFraction`), `shared/exact-pi.js`, `shared/svg-plot.js` |
| Role in the project | further demonstration (batch B) |

## 1. Purpose and background

Shows why a torus (the configuration space of a two-joint revolute robot) has no single global chart onto the plane.
A slider λ morphs the embedded 2-torus (λ = 0) into a cylinder (cut along a circle, λ = 1) and then into the flat
square [0, 2π]² (λ = 2); two rotary dials set the angles θ and φ of a point, drawn as a green ball on the surface.
Moving a dial through 0 shows the discontinuities that the cuts introduce (the ball jumps across the square). The two
dials are a custom control of the original (`makeDialControl`: a `LocatorPane` with a dial graphic), new for this project.

## 2. Scope

In scope: the λ slider with its animation panel, the two dial controls (picking, normalisation, dial graphic with hand
and arrowed arc), the angle computation, `TorusToPlane`, the parametric surface with two-coloured faces, red boundary,
the "Business" plot theme's look, the green ball, the plot label, mouse rotation, and the quirks of the dial drawing.
Out of scope (would need a design entry first): other charts or atlases, numeric angle display, a second point,
showing the cut lines on the torus.

## 3. Users and use cases

| ID | User | Use case |
|----|------|----------|
| UC-TC-01 | student | morph the torus into a cylinder and a plane and follow a point (θ, φ) |
| UC-TC-02 | student | turn a dial through 0 and see the jump in the cut chart (discontinuity) |
| UC-TC-03 | student | relate the robot-arm configuration torus to the square phase plots of the PRM demonstrations |
| UC-TC-04 | tester | compare the port with the saved state, the 4 snapshots and the Mathematica harness |

## 4. Features

### 4.1 Controls

| ID | Feature | Reason | Since | Verified by |
|----|---------|--------|-------|-------------|
| F-TC-01 | Slider λ `Row[{Control@{{λ, 0, "Torus -> Plane"}, 0, 2, Appearance -> "Labeled", ImageSize -> Small}}]`: label "Torus → Plane", 0 … 2 without a step (continuous), value shown, ⊕ animation panel; default 0 | morph torus → cylinder → plane (UC-TC-01) | v0.1.16 | e2e "has the controls of the original with their defaults"; e2e "dragging the lambda slider changes the plot label from Plane to Cylinder to 2-Torus"; e2e "the play button of lambda animates the morph"; M-TC-05 |
| F-TC-02 | Dial θ: `{{p1, {1, 0}, "θ"}, (makeDialControl[#1, {0, 0}, Red] &), ImageSize -> {160, 160}}` — the variable is a POINT p1 (default {1, 0}), shown by a red hand | set the first angle (UC-TC-01, UC-TC-02) | v0.1.16 | e2e "dragging the theta dial locator with the mouse turns the hand and moves the green ball"; unit "dial graphic: 17 major ticks from 0.94 to 1, 16 minor ticks from 0.98 to 1, 8 labels at radius 0.7"; M-TC-03 |
| F-TC-03 | Dial φ: `{{p2, {1, 0}, "φ"}, (makeDialControl[#1, {0, 0}, Blue] &), ImageSize -> {160, 160}}`, blue hand | set the second angle | v0.1.16 | e2e "has the controls of the original with their defaults"; e2e "a press anywhere in a dial moves its locator there, normalised to the rim" |
| F-TC-04 | Dial picking: `LocatorPane[Dynamic[pt, (pt = Normalize[#]) &], <dial graphic>]` — a press anywhere in the dial moves the (only) locator to the press point, a drag follows the pointer; every new position is normalised to the unit circle (`normalizeCR`, K-TC-08), so the locator glyph always sits on the rim; the pointer position is limited to the dial's plot range before normalising (`dial-control.js` option `clamp`, on by default for every dial, COMMON-DECISIONS §5; K-TC-04); `Normalize[{0, 0}] = {0, 0}` at the exact centre (K-TC-03) | turn the dial by grabbing or clicking anywhere (UC-TC-02) | v0.1.16 | unit "Normalize puts the dial point on the unit circle, the zero vector stays zero"; e2e "a press anywhere in a dial moves its locator there, normalised to the rim"; golden "chart for a torus: the saved and snapshot dial points are unit vectors to 2.3e-16"; golden "torus-chart: harness H-TC-11 a dial point at the exact centre"; M-TC-03 |
| F-TC-05 | Layout `ControlPlacement -> Left`: the λ row on top, the θ dial, the φ dial, each dial with its label (θ, φ) to its left; the 3D picture to the right | the original's layout (snapshots) | v0.1.16 | inventory; M-TC-02 |

### 4.2 Model (`model.js`, `surface.js`)

| ID | Feature | Reason | Since | Verified by |
|----|---------|--------|-------|-------------|
| F-TC-06 | `θ = ArcTan[p1[[1]], p1[[2]]]; If[θ < 0, θ = θ + 2π]` and the same for φ from p2: angles in [0, 2π] — 2π itself occurs when a tiny negative ArcTan is shifted (θ + 2π rounds to 2π, H-TC-13) (Mathematica argument order, no signed zero) | the point (θ, φ) on the torus | v0.1.16 | unit "theta from the dial: ArcTan[x, y] plus 2π when negative, in [0, 2π]"; golden "chart for a torus: the saved state gives theta 5.29146324975242, phi 0.9575889779203874 and the green ball at (0.9575889779203874, 0.9917220574271663, 0)"; golden "chart for a torus: snapshots 2 to 4 Settings give the angles and the ball positions of the pictures"; golden "torus-chart: harness H-TC-12 dial points on the axes give 0, π and 3π/2"; golden "torus-chart: harness H-TC-13 a dial point just below the positive x axis gives θ = 2π in machine arithmetic"; golden "torus-chart: harness H-TC-14 negative zero in a dial point" |
| F-TC-07 | `TorusToPlane[λ, u, v] = If[λ <= 1, {π/3 (3 - Cos[u] (-2 - λ + (λ-1) Cos[v])), π/3 (3 - (-2 - λ + (λ-1) Cos[v]) Sin[u]), -λ (v - π) + (1 - λ) Sin[v]}, {(λ-1) v + (2-λ)(π + Cos[u] π), (λ-1)(2π - u) + (2-λ)(π + Sin[u] π), (λ-2)(v - π)}]` (tolerant `<=`), formulas term by term | the morph: torus (λ = 0), cylinder of radius π (λ = 1), square (λ = 2) | v0.1.16 | unit "TorusToPlane at lambda 0 is the torus: (0, 0) gives (2π, π, 0) and (π, π) gives (2π/3, π, 0)"; unit "TorusToPlane at lambda 1 is the cylinder (π (1 + cos u), π (1 + sin u), π - v)"; unit "TorusToPlane at lambda 2 is the square (v, 2π - u, 0)"; unit "the two branches of TorusToPlane agree at lambda = 1"; golden "torus-chart: harness H-TC-06 lambda = 1 at the branch boundary" |
| F-TC-08 | Plot label `If[λ < 1/2, "2-Torus", If[λ < 1.2, "Cylinder", "Plane"]]` (tolerant Less), in the "Business" theme's label style: gray (102, 102, 102) ≈ GrayLevel[0.4] in snapshot 1, a little larger than the black tick labels (17 px against 15 px glyph height in the 2× snapshot; port 12 px against 10.5 px fonts, D-TC-10), shown as an HTML line above the picture; exact style from the harness (K-TC-01) | names the stage of the morph | v0.1.16 | unit "PlotLabel: 2-Torus below 1/2, Cylinder below 1.2, Plane from 1.2 (strict tolerant Less)"; golden "chart for a torus: the snapshot Settings lambda 2., 0.13, 0.56, 1.45 give the labels Plane, 2-Torus, Cylinder, Plane as pictured"; golden "torus-chart: harness H-TC-07 to H-TC-10 plot labels at and around 1/2 and 1.2"; golden "chart for a torus: the plot label is gray (102, 102, 102) and larger than the tick labels as in snapshot 1"; M-TC-05 |
| F-TC-09 | Opening state = the live state (the notebook's saved state, COMMON-DECISIONS §6): λ = 2., p1 = {0.5472493629827029, −0.8369696139735457}, p2 = {0.5754934061746134, 0.8178064193007667} (snapshot 1); "Initial settings" restores the initial settings = the stored `"Variables"` (raw line 840) = the code's values λ = 0, p1 = p2 = {1, 0} | same opening picture as the original | v0.1.16 | unit "initial state is the saved state (lambda 2., p1 and p2 of the notebook)"; unit "Initial settings are the code's initial values (lambda 0, p1 = p2 = {1, 0})"; golden "chart for a torus: the saved Manipulate variables are the opening state of the port"; golden "torus-chart: harness H-TC-01 the saved state"; golden "torus-chart: harness H-TC-02 the initial settings" |
| F-TC-10 | Surface data: `ParametricPlot3D[TorusToPlane[λ, u, v], {u, 0, 2π}, {v, 0, 2π}, …]` sampled on a fixed grid (D-TC-01), front faces = the side of ∂u × ∂v (N-TC-02), boundary = the four parameter edges u = 0, u = 2π, v = 0, v = 2π, mesh lines = 15 contours of z at equally spaced levels between the lowest and highest z of the grid (fitted to the snapshots, D-TC-02, K-TC-02); z does not depend on u, so each contour is a curve v = const (N-TC-06) | the surface of the morph | v0.1.16 | unit "surface sampling: fixed grid over [0, 2π]², boundary curves u = 0, u = 2π, v = 0, v = 2π"; unit "front faces of the manifold are the side of du x dv: outside of the torus top at lambda 0.13, inside of the funnel at lambda 0.56, top of the square at lambda 2"; unit "mesh lines are contours of z, none on the flat square at lambda 2"; golden "torus-chart: harness H-TC-03 to H-TC-05 the manifold at lambda 0.13, 0.56 and 1.45 (mesh, lighting, sampling)" |

### 4.3 Graphics

| ID | Feature | Reason | Since | Verified by |
|----|---------|--------|-------|-------------|
| F-TC-11 | Dial graphic, drawn by `demos/common/dial-control.js` with `arc: 'arrowArcCircle'` (SVG, ImageSize 160 × 160, plot range of the unit dial): `Gray, Circle[cent]`; 17 major ticks `Line[{cent + .94 {Cos a, Sin a}, cent + {Cos a, Sin a}}]` for a = 0, π/8, …, 2π (the one at 0 drawn twice); 16 minor ticks from .98 at a = π/16 + k π/8; labels `Text[θ, cent + .7 {Cos θ, Sin θ}]` for θ in `Rest@Range[-Pi, Pi, Pi/4]` (−3π/4, −π/2, −π/4, 0, π/4, π/2, 3π/4, π as fractions, gray, FontSize 10); the hand `makeHand[7, 7/3, .1, .3]` = polygon {(−7/30, −0.03), (−7/30, 0.03), (0.7, 0.01), (0.78, 0), (0.7, −0.01)} in the dial's colour with a black edge, rotated by `ang` about the centre; black `Circle[cent, 0.3, {0, ang}]` with a tiny `Arrow` (Arrowheads[.05]) at its end pointing counterclockwise; the default locator glyph at pt. `ang = ArcTan[pt]` ∈ (−π, π] (Q-TC-01) | the original's rotary dial | v0.1.16 | unit "dial graphic: 17 major ticks from 0.94 to 1, 16 minor ticks from 0.98 to 1, 8 labels at radius 0.7"; unit "makeHand[7, 7/3, .1, .3] is the polygon (-7/30, -0.03), (-7/30, 0.03), (0.7, 0.01), (0.78, 0), (0.7, -0.01)"; unit "the dial arc goes from 0 to ArcTan in (-π, π] and its arrowhead points counterclockwise (original quirk)"; golden "chart for a torus: snapshots 1 and 2 show clockwise arcs with counterclockwise arrowheads for dials in the lower half"; M-TC-04 |
| F-TC-12 | Manifold: `PlotStyle -> Directive[Opacity[0.8], FaceForm[RGBColor[0.34398, 0.49112, 0.89936], RGBColor[0.97, 0.606, 0.081]]]` (front blue, back orange), `BoundaryStyle -> Directive[Thick, Red]`, `PlotTheme -> "Business"` (lighting and mesh, D-TC-02), `PlotRange -> {{-m, 2π+m}, {-m, 2π+m}, {-π-m, π+m}}` with m = 0.2, box and axes with ticks (ParametricPlot3D defaults), `ImageSize -> {350, 350}`, `SphericalRegion -> True`, plot label (F-TC-08) | the original's 3D picture | v0.1.16 | e2e "loads without errors and draws the surface, the ball and both dials"; e2e "the flat square at lambda 2 is blue from above as in snapshot 1"; unit "the face colours are RGBColor[0.34398, 0.49112, 0.89936] in front and RGBColor[0.97, 0.606, 0.081] behind, opacity 0.8, as in the source"; M-TC-06 |
| F-TC-13 | `config = Graphics3D[{Green, Sphere[TorusToPlane[λ, θ, φ], 2/10]}]`; `Show[manifold, config]` (options of the manifold) | the point (θ, φ) | v0.1.16 | unit "the green ball sits at TorusToPlane of the dial angles, radius 0.2"; e2e "dragging the theta dial locator with the mouse turns the hand and moves the green ball" |
| F-TC-14 | The 3D picture can be rotated with the mouse | look at the surface from all sides | v0.1.16 | e2e "dragging in the 3D picture rotates the view"; M-TC-07 |
| F-TC-15 | Title, caption and Details & Citations text of the original (incl. the atlas question) | explains the Demonstration | v0.1.16 | M-TC-01 |

### 4.4 Port additions

| ID | Feature | Reason | Since | Verified by |
|----|---------|--------|-------|-------------|
| A-TC-01 | "Initial settings" button: the stored initial settings (λ = 0, both dials at {1, 0}), view reset | stands in for the Manipulate ⊕ menu → Initial Settings | v0.1.16 | e2e "Initial settings restores lambda 0 and both dials at 0"; M-TC-08 |
| A-TC-02 | Arrow keys on a focused dial locator, as every `dial-control.js` dial (A-TK-02; option `keyStep`, default 0.05, Shift 5×, COMMON-DECISIONS §5): the locator moves by 0.05 (Shift 0.25) in dial coordinates, then the setter normalises it — a turn of about 2.9° (14°) for a key across the hand; each key press is one update | keyboard access | v0.1.16 | e2e "arrow keys turn a focused dial (port addition)" |
| A-TC-03 | `window.__demo` automation hook (state, setState, view: θ, φ, ball centre, label, surface statistics, dial angle, ink fraction, pixel colour, camera) | automated tests | v0.1.16 | e2e "loads without errors and draws the surface, the ball and both dials" |
| A-TC-04 | "All demos" link | site navigation | v0.1.16 | inventory; M-GEN-01 |
| A-TC-05 | Credit footer: original title, authors, licence, adaptation notice | required by CC BY-NC-SA 3.0 | v0.1.16 | e2e "attribution on" |
| A-TC-06 | Start-up notice (watchdog, `<noscript>`) and WebGL 2 notice (DEC-22); without WebGL 2 the dials still work | a clear message instead of an empty page | v0.1.16 | e2e "start-up notice when"; e2e "WebGL 2 notice on"; e2e "without WebGL 2 the notice is shown and the dials still work" |
| A-TC-07 | The view redraws itself after a WebGL context loss and restore (shared viewer) | robustness | v0.1.16 | e2e "the view redraws after a WebGL context loss" |
| A-TC-08 | standalone bundle (owner rule R-A): `npm run bundle -- torus-chart` builds `dist/torus-chart/` with exactly the files the app imports, the licences, a generated README and a root `index.html` (§6, "Building and deploying this app alone") | anyone can host this one app elsewhere without the rest of the site (owner rule R-A, 2026-10-17) | v0.1.16 | e2e "bundle: torus-chart runs from its own folder" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|-------------|---------|
| `slider-lambda` | F-TC-01 |
| `value-lambda` | F-TC-01 |
| `plus-lambda` | F-TC-01 |
| `play-lambda` | F-TC-01 |
| `stepback-lambda` | F-TC-01 |
| `stepfwd-lambda` | F-TC-01 |
| `locator-p1` | F-TC-02, F-TC-04, F-TC-11, A-TC-02 |
| `locator-p2` | F-TC-03, F-TC-04, F-TC-11, A-TC-02 |
| `scene-canvas` | F-TC-12, F-TC-14, A-TC-07 |
| `reset` | A-TC-01 |
| `crumbs` | A-TC-04 |
| `details` | F-TC-15 |
| `credits` | A-TC-05 |

## 6. Design

- **How the original's dial is built.** `makeDialControl[Dynamic[pt_], cent_, color_]` is not a built-in control: it
  returns `LocatorPane[Dynamic[pt, (pt = Normalize[#]) &], graphic]`, so the Manipulate variable (p1 or p2) is the
  position of ONE locator of a LocatorPane, and the dial picture is the pane's background graphic. The pane's second
  argument is evaluated once in the kernel: `ang = Dynamic[ArcTan[pt[[1]], pt[[2]]]]` is a Dynamic object, so the
  following `If[ang < 0, ang = ang + 2π]` cannot decide and does nothing (Q-TC-01); `Rotate[…, ang, cent]` and
  `arrowArc[Circle[cent, 0.3, {0, ang}]]` keep the Dynamic inside the graphic, and the front end re-evaluates those
  parts when pt changes (the snapshots show hand, arc and arrowhead following the locator). The Manipulate itself
  only reads p1 and p2 in the body.
- **The dial is `demos/common/dial-control.js`** (owner two-link-kinematics; COMMON-DECISIONS §3, no app-level dial):
  `makeDialControl(controls, {name: 'p1', label: 'θ', color: Red, imageSize: 160, setter: 'normalize', arc:
  'arrowArcCircle', value, onInput})` and the same for p2 (Blue, 'φ'). It draws the gray circle, 17 long and 16 short
  ticks, the labels −3π/4 … π (`labels: 'stacked'`: `piFraction` of `shared/mma-text.js`, gray, FontSize 10), `makeHand(7, 7/3, .1, .3)`
  rotated by `ang = arcTan(pt)` ∈ (−π, π], and with `arc: 'arrowArcCircle'` the torus chart's
  `arrowArc[Circle[cent, 0.3, {0, ang}]]` (`demos/common/arrow-arcs.js` `arrowArc`: the arc from 0 to ang plus an arrow of
  length 0.3·10⁻⁶ along the counterclockwise tangent at its end) WITHOUT the `+2π` of the never-firing `If` (Q-TC-01);
  one `addLocators` locator (`pickAnywhere: true`, default `locatorGlyph`), `setter: 'normalize'` = `normalizeCR` of
  the pointer (K-TC-08). Test ids: the container `dial-p1` (not in the UI inventory) and its locator `locator-p1` (COMMON-DECISIONS §6). The dial's plot range is the unit dial with the default padding, and the
  pointer is limited to that range before the setter runs (option `clamp`, default `true` for every dial,
  COMMON-DECISIONS §5; K-TC-04).
  The torus chart keeps its own unit tests of the drawing data it relies on (T-TC-08 … T-TC-10).
- **`model.js`** (pure): `TorusToPlane(λ, u, v)` written term by term as the source (`(1/3)·π·(3 − …)` in this order,
  tolerant `mLessEq(λ, 1)`), `angleOf(p)` (F-TC-06), `plotLabel(λ)` (mLess with 1/2 and 1.2), `initialState()`,
  `initialSettings()`, `evaluate(st)` → `{θ, φ, config: {center, radius: 0.2}, label}`.
- **`surface.js`** (pure): `sampleManifold(λ, n)` returns positions on an (n+1) × (n+1) grid over [0, 2π]² (n = 72,
  5° steps, D-TC-01), unit normals of the ∂u × ∂v side from the analytic partial derivatives (`frontNormal`), triangles
  ordered so that the counterclockwise face is the ∂u × ∂v side, the four boundary polylines, the z range of the grid
  and the mesh: `meshLevels` = 15 equally spaced levels strictly between the lowest and highest z, and for each level
  every root v* of z(v) = level (a 1440-interval scan of v, then bisection) gives the contour polyline v = v* over the
  grid's u values (N-TC-06: z depends on v only, so the contour is exact); the renderer and the tests use the same data.
- **`main.js`**: `Controls.slider` (λ, label "Torus → Plane", step 0 = continuous, so `steps: 'mma'` does not apply; ⊕ panel;
  the `format` hook shows Mathematica's text of the value with `mmaSliderText`: the saved machine real as "2.", the exact
  initial setting as "0", dragged values as machine reals, D-TC-06), two `makeDialControl`s with labels θ and ϕ
  (ControlPlacement Left), one square `createViewer` (shared/three-helpers, 350 px, ViewPoint {1.3, −2.4, 2}, PlotRange of
  F-TC-12, which is a cube) with `outputColorSpace = LinearSRGBColorSpace` (colour values are blended as displayed, as
  D-RS-02). The camera's view angle is set so that the box's bounding sphere fills the picture, × 1/0.93 (`ZOOM`, fitted
  to snapshot 1, D-TC-07). The surface is ONE BufferGeometry drawn two-sided with a small shader of this app
  (`LIGHTS`): front faces in the first FaceForm colour, back faces (`!gl_FrontFacing`, normal flipped) in the second,
  colour = base · (ambient + Σ diffuse_i max(0, n·l_i)) + specular · Σ max(0, n·h_i)^shininess, clipped to 1, alpha 0.8,
  depth writes off, polygon offset (lines on the surface stay in front); its triangles are re-sorted back to front by
  their centroids' distance from the camera after every camera change and every re-sampling (D-TC-03). The boundary is
  four fat red lines (2.5 px), the mesh 1 px dark gray (0.2) line segments, the green ball a sphere of radius 0.2 with
  the same shader, opaque. Box: nine gray edges (the three at the corner nearest the default view point are not drawn,
  as in the snapshots), ticks and labels 0, 2, 4, 6 on x (front-bottom edge) and y (right-bottom edge) and −3 … 3 on z
  (left vertical edge), CSS2D labels (D-TC-08). The plot label is an HTML line above the canvas (gray, 12 px). Without
  WebGL 2 (`shared/requirements.js` shows its notice) the viewer is not created and the dials and slider still work
  (A-TC-06).
- **Lighting of the "Business" theme as fitted (D-TC-02)**: lights fixed to the camera (x right, y up, z toward the
  viewer): ambient 0.1; directional (1, 0.1, 0.35) × 0.7, (0, 0.8, 0.6) × 0.55, (0, 0, 1) × 0.4; specular 0.25 with
  shininess 14. Fitted on the snapshot colours: the flat square (133, 169, 255) needs a total diffuse factor ≈ 1.2 for an
  upward face and no highlight (port (136, 169, 255)); the brightest blue (186, 223, 255) and orange (255, 255, 122) both
  need diffuse ≈ 1.23 plus white ≈ 0.24 (a specular term); the darkest back faces ≈ 0.09 (a small ambient); bright faces
  are those turned to the right of the picture and toward the viewer (snapshots 3 and 4).
- **State model**: `λ`, `p1`, `p2` (the Manipulate variables). One evaluation per change (slider input, dial move,
  animation frame); the surface is re-sampled only when λ changes, the ball when λ, p1 or p2 change.
- **Numerics**: `arcTan` (bit-exact, mma-exact.js) for θ, φ and the dial angle; tolerant comparisons from
  shared/mma.js; 2π as `2 * Math.PI` (N[2π]).

### 6.1 Building and deploying this app alone

Owner rule R-A (2026-10-17): this one app can be taken out of the repository and hosted anywhere. One command builds it:

```
npm run bundle -- torus-chart
```

`tools/bundle-app.mjs torus-chart` (npm script `bundle`) writes `dist/torus-chart/`: the app with exactly the files it needs — its HTML, its modules and everything they import, recursively, with the repository's relative layout kept — plus the licence texts that apply, a generated `README.md` (title, the original's credits, licence, "serve this folder with any static web server", how to run its tests in the full repository) and a root `index.html` that opens the app (the "All demos" link of the bundled page leads to that root page). Nothing else. Contents (generated with `npm run bundle -- --update-docs`; unit "bundle contents listed in DESIGN.md match the collector" keeps the table current):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/torus-chart/`) | 4 | `index.html`, `main.js`, `model.js`, `surface.js` |
| `shared/` | 11 | `exact-pi.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `mma-text.js`, `mma.js`, `requirements.js`, `style.css`, `svg-plot.js`, `three-helpers.js`, `ui.js` |
| `demos/common/` | 3 | `arrow-arcs.js`, `dial-control.js`, `prm-core.js` |
| `vendor/three/` | 9 | `addons/controls/OrbitControls.js`, `addons/lines/Line2.js`, `addons/lines/LineGeometry.js`, `addons/lines/LineMaterial.js`, `addons/lines/LineSegments2.js`, `addons/lines/LineSegmentsGeometry.js`, `addons/renderers/CSS2DRenderer.js`, `three.core.js`, `three.module.js` |
| added by the bundler | 8 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/torus-chart/DESIGN.md`, `vendor/three/LICENSE` |
<!-- bundle-contents:end -->

Licences: `LICENSES/CC-BY-NC-SA-3.0.txt` (this app and every `demos/…` module: derived from Wolfram Demonstration code); `LICENSES/MIT.txt` (the `shared/…` modules); `vendor/three/LICENSE` (three.js r186, MIT).

Requirements: WebGL 2 (three.js r186; `shared/requirements.js` shows the WebGL 2 notice without it, the dials still work) and ES modules with import maps (current Firefox, Chromium, WebKit).

Verified by e2e "bundle: torus-chart runs from its own folder" (A-TC-08): the test runs the bundle command, serves `dist/torus-chart/` alone with a static file server (no access to the rest of the repository), opens the root `index.html`, follows it to the app and checks: no console error, no failed request, every request stays inside the folder and every script and stylesheet of the bundle is loaded.

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

| ID | Kind | Description |
|----|------|-------------|
| Q-TC-01 | quirk kept | In `makeDialControl`, `If[ang < 0, ang = ang + 2π]` is applied to a Dynamic object and never fires, so the dial's arc runs from 0 to the ArcTan value in (−π, π]: for a locator in the lower half the arc goes CLOCKWISE from 0 to the hand, and the arrowhead at its end, whose direction is the counterclockwise tangent `{-Sin[end], Cos[end]}`, points back along the arc. Seen in snapshot 1 (θ dial, −57°) and snapshot 2 (φ dial, −60°): the arrowhead's tip is at the arc's end, its wings below-left of it (pixel analysis 2026-10-12). The model angles θ, φ themselves are in [0, 2π] (the body's `If` works). Implemented by `dial-control.js` `arc: 'arrowArcCircle'`. |
| Q-TC-02 | quirk kept | The dial reads −3π/4 … π (labels `Rest@Range[-Pi, Pi, Pi/4]`) while the angle used is in [0, 2π]: a hand at the label "−π/4" means θ = 7π/4. |
| Q-TC-03 | quirk kept | The plot label says "Cylinder" from λ = 1/2 and "Plane" from λ = 1.2, although the surface is the cylinder only at λ = 1 and flat only at λ = 2 (snapshot 4: a half-pipe at λ = 1.45 labelled "Plane"). |
| Q-TC-04 | quirk kept | Module locals `c2 = {0, -2.5}` and `thetaList = Rest@Range[-Pi, Pi, Pi/4]` are never used; the major tick at a = 2π repeats the one at 0. |
| Q-TC-05 | quirk kept | The ball (radius 2/10, fixed in data units) is centred ON the surface, so half of it is inside the closed torus at λ = 0 and seen only through the translucent surface (snapshot 2 shows it pale behind the surface). |
| D-TC-01 | deviation | ParametricPlot3D's adaptive sampling (default PlotPoints and MaxRecursion) is replaced by a fixed 73 × 73 grid (5° steps); boundary and mesh lines are sampled on the same grid. Harness records (H-TC-01 … H-TC-05) give the original's polygons for comparison. |
| D-TC-02 | deviation | `PlotTheme -> "Business"` is not available in the browser; its effect is rebuilt from the snapshots (decided at implementation, 2026-10-18; the draft named this a lead): (a) lighting: a white light model fixed to the camera with the values of §6 ("Lighting of the Business theme as fitted"), fitted on the snapshot colours — the flat square (133, 169, 255) needs a diffuse factor ≈ 1.2 for an upward face and no highlight, the brightest blue and orange both need ≈ 1.23 plus a white specular ≈ 0.24, the darkest back faces ≈ 0.09; the default coloured lights of Mathematica (`shared/mma-lighting.js`) would give about (124, 137, 173) for the square and are not used; (b) mesh: thin dark lines that are 15 contours of z at equally spaced levels between the lowest and highest z (snapshot 4: 15 equally spaced arcs over the length of the half-pipe; snapshots 2 and 3 agree when the contours seen through the translucent surface are counted; none on the flat square of snapshot 1), drawn 1 px dark gray (0.2). Both are replaced by the theme's actual Lighting and Mesh/MeshFunctions/MeshStyle when the harness records them (K-TC-01, K-TC-02). |
| D-TC-03 | deviation | Translucent two-coloured faces: the port draws the one surface two-sided in a single pass, its triangles sorted back to front by centroid distance after every camera change (as Mathematica sorts its translucent polygons); the opaque ball, boundary and mesh lines are drawn first and seen through the surface at 80 %. Per-triangle sorting cannot resolve intersecting or cyclically overlapping triangles (none seen in the four snapshot states); the review screenshots of the four snapshots match the originals' layering (the pale ball inside the torus of snapshot 2, the far end arc through the half-pipe of snapshot 4). |
| D-TC-04 | deviation | Line widths: `Thick` red boundary 2.5 px (≈ 5 px in the 2× snapshots), mesh 1 px dark gray, box edges and ticks 1 px gray (0.55); the green ball's highlight follows the fitted lights (D-TC-02). |
| D-TC-05 | deviation | The dial is drawn in SVG by `dial-control.js`: fonts, the fraction labels, the arrowhead (a plain filled triangle of 5 % of the dial width instead of Mathematica's notched arrowhead) and the locator glyph (shared `locatorGlyph`) approximate the original's. |
| D-TC-06 | deviation | λ slider: Mathematica's continuous slider produces values whose resolution depends on its pixel width (the snapshot Settings hold exactly 0.13, 0.56, 1.45, N-TC-05); the port's range input (step `any`) gives other values for the same pixel. The value field shows Mathematica's text of the value (`mmaSliderText`, up to 6 significant digits): the saved machine real as "2." as in snapshot 1, the exact initial setting as "0", every dragged or animated value as a machine real ("0.", "1.45"). (Changed from the draft, which showed "2" as D-CP-04: `shared/ui.js` now offers the Mathematica text.) |
| D-TC-07 | deviation | Rotation uses OrbitControls (z up), kept when a control changes (K-TC-07); the framing of `SphericalRegion` with the fixed PlotRange: the bounding sphere of the box fills the 350 px canvas, then × 1/0.93, fitted to snapshot 1 (box width about 0.79 of the image width in both). The plot label is an HTML line above the canvas, not inside the 350 × 350 image, so the picture is about 20 px taller than the original's. |
| D-TC-08 | deviation | Box axes, tick labels (0, 2, 4, 6 on x and y, −3 … 3 on z, major ticks only) and the omitted box edges (the three at the corner nearest the default view point, as in the snapshots) are fixed for the default view point (as D-RS-05); Mathematica moves them when the view is rotated. |
| D-TC-09 | deviation | Update rate: the port evaluates once per animation frame while a dial or the slider is dragged; Mathematica decides its own rate. |
| D-TC-10 | deviation | Label sizes: snapshot 1 shows the plot label "Plane" 17 px high against 15 px for the tick digits (2× picture), not the "about 1.5×" the draft assumed; the port uses 12 px for the label and 10.5 px for the tick labels (system sans-serif fonts instead of Mathematica's). The golden test checks the measured ratio (between 1 and 1.3). |
| K-TC-01 | known issue (lead) | The lights of `PlotTheme -> "Business"` (and whether they apply to the green ball, which is shown with the manifold's options): harness H-TC-01 … H-TC-05 record the theme's resolved options and the output's `Lighting` and `LabelStyle` directly (`wl:Charting`ResolvePlotTheme["Business", ParametricPlot3D]`, `%options:…`). |
| K-TC-02 | known issue (lead) | The mesh of the theme: implemented as `MeshFunctions -> {#3 &}` with 15 equally spaced levels (D-TC-02, from snapshot 4); not read from Mathematica yet. Harness H-TC-01 … H-TC-05 read the theme directly (`wl:Charting`ResolvePlotTheme["Business", ParametricPlot3D]` and the AbsoluteOptions Lighting and LabelStyle of the output; Mesh, MeshFunctions and MeshStyle are not Graphics3D options) and record the mesh lines with `manifold`; the port takes levels, style and count from them. |
| K-TC-03 | known issue (lead) | A press exactly at the dial centre: `Normalize[{0, 0}] = {0, 0}`, then `ArcTan[0, 0]` is indeterminate in the body (θ and the ball undefined) and in the dial (hand angle). The port keeps the previous angles in that case and records nothing else; harness H-TC-11 shows what the body gives, M-TC-03 what the front end draws. |
| K-TC-04 | known issue (lead) | LocatorPane limits the locator to its range (by default the graphic's plot range) before the Dynamic's function runs: a pointer dragged outside the dial is clamped first, so the angle is that of the clamped point (e.g. 45° at a far corner). The port does the same through `dial-control.js`'s option `clamp` (default `true`, every dial, COMMON-DECISIONS §5); it stays a lead until a drag far outside a dial is checked by hand (M-TC-03). |
| K-TC-05 | known issue (lead) | Which values the continuous λ slider produces when dragged (the snapshot Settings hold 0.13, 0.56, 1.45 exactly — dragged, typed or rounded by the slider?) and how its label rounds them (D-TC-06): saving the notebook after a drag shows the stored value (M-TC-05). |
| K-TC-06 | known issue (lead) | The original passes `ImageSize -> {160, 160}` in the control specification; the dials in the snapshots are about 150 px wide, consistent with 160 px including the pane's padding. The port uses 160 px. |
| K-TC-08 | known issue (lead) | Normalize model of the dial setter: `normalizeCR` (as two-link-kinematics, K-TK-11) or `normalizeDnrm2` (COMMON-DECISIONS §3). The saved and snapshot points (\|p1\| = 1.0000000000000002 in the saved state) are Normalize outputs of unknown press points and cannot decide it; harness H-TK-23 of two-link-kinematics captures Normalize of test vectors for all dial users. |
| K-TC-07 | known issue (lead) | Whether a mouse rotation of the original's 3D picture survives a change of λ or of a dial (port: kept). |
| K-TC-09 | known issue (lead) | Order of operations in `TorusToPlane`: the port follows COMMON-DECISIONS §7 (machine terms of a Plus in written order, the exact constants −2, 3, π, 2π last) and uses the double of each exact constant in products (`(1/3)·π·(…)` as 1/3 × π × (…), which equals the double of π/3 rounded from π; the correctly rounded π/3 is 1 ulp larger). The values differ from other orders by at most a few ulps; the golden tests compare the balls of the stored Settings (16 printed digits) to 1e-15 and the harness balls (`config`) bit for bit, so the harness records H-TC-01 … H-TC-06 (`config`, `manifold`) decide. |
| N-TC-01 | note | `states/Chart-for-a-Torus.json` lacks λ (its extractor could not parse the symbol `\[Lambda]`); the raw notebook's DynamicModuleBox holds `\[Lambda]$$ = 2.`, `p1$$ = {0.5472493629827029, -0.8369696139735457}`, `p2$$ = {0.5754934061746134, 0.8178064193007667}`; the stored specifications (Initial Settings) are λ = 0, p1 = p2 = {1, 0}, as in the code. `tools/extract_state.py --snapshots` now reads λ (the fixture holds λ = 2.). |
| N-TC-02 | note | Face orientation: with ∂u × ∂v the front side is the outside of the torus near its top (λ = 0.13), the INSIDE of the funnel (λ = 0.56, z decreasing in v) and the upper side of the square (λ = 2); this matches the blue/orange areas of snapshots 1–4 (blue = first FaceForm colour = front). |
| N-TC-03 | note | Saved state numbers (= snapshot 1's Settings; computed 2026-10-12 with an independent Python evaluation): θ = 2π − 0.9917220574271659 = 5.29146324975242 (−56.82° on the dial), φ = 0.9575889779203874 (54.87°), ball at (0.9575889779203874, 0.9917220574271663, 0) at λ = 2; \|p1\| = 1.0000000000000002, \|p2\| = 1 (Normalize output). |
| N-TC-05 | note | Snapshot Settings (raw lines 2311, 6086, 9212, 12067): 1 λ = 2., p1, p2 = the live state; 2 λ = 0.13 and 3 λ = 0.56, both with p1 = {0.812780051147898, 0.5825706724990715} (θ = 0.6218879334516852, 35.63°), p2 = {0.5048833150379537, −0.8631876031294046} (φ = 5.241635761216535, dial −59.68°); 4 λ = 1.45, p1 = {0.5031907286678233, −0.8641753818425663} (θ = 5.239676027398976, dial −59.79°), p2 = {0.853281833651959, 0.5214500094539749} (φ = 0.5485494024505281). Balls: (5.328386094975314, 4.709005293658027, −1.0239788187140584), (5.5095942218748215, 4.838888575366346, −1.5558266856479135), (2.844174353672654, 0.7042672683202926, 1.426173788126596) (independent Python). The λ values 0.13, 0.56, 1.45 are two-decimal machine numbers although the slider is continuous (K-TC-05). |
| N-TC-04 | note | The discontinuity the Demonstration teaches: at λ = 2 the ball is at (φ, 2π − θ, 0); turning θ through 0 makes it jump between y = 2π and y ≈ 0 (H-TC-13). |
| N-TC-06 | note | In both branches of `TorusToPlane` z depends on v only (−λ(v − π) + (1 − λ) sin v, resp. (λ − 2)(v − π)), so every contour of z is a set of curves v = const over all u: exact contours are found from z(v) alone (`surface.js`). z is monotonic in v for λ ≥ about 0.5 (one contour per level), not for small λ (two per level, snapshot 2). |

## 8. Proposed changes

No open proposal. Template (see [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md)):

| ID | Status | Requested by / date | Change | Reason | Acceptance criteria |
|----|--------|---------------------|--------|--------|---------------------|

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.16 | 2026-10-18 | first implementation from the approved design draft (2026-10-12; COMMON-DECISIONS §5, §6, owner rules R-A/R-B/R-C applied 2026-10-17). Decided at implementation: the "Business" lighting and mesh fitted to the snapshots (D-TC-02), back-to-front triangle order (D-TC-03), boundary 2.5 px (D-TC-04), "2." shown (D-TC-06), framing and omitted front box edges (D-TC-07, D-TC-08), label sizes (D-TC-10), exact contours (N-TC-06), operation order lead K-TC-09 |
| 2 | v0.1.16 | 2026-10-18 | review fixes: E-TC-03 counterexample and reason corrected (constant map, (cos u, cos v); compactness and invariance of domain); golden harness balls compared bit for bit (K-TC-09), H-TC-13 expectation written out; e2e λ drag to 0 moves past the end of the track |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|-------------|---------|-------------|---------|
| I-TC-01 | Draw the dial arc and its arrowhead in the direction of the model angle [0, 2π] (fix the Dynamic `If`) | the arc matches θ as used | departs from the original's drawing | Q-TC-01 |
| I-TC-02 | Show θ and φ as numbers next to the dials | links dial and coordinates | adds UI | F-TC-06 |
| I-TC-03 | Draw the cut lines (u = 0 and v = 0 circles) on the torus at every λ | shows where the chart tears | new graphics | N-TC-04 |
| I-TC-04 | Label the stages by exact λ (torus at 0, cylinder at 1, plane at 2) | less misleading label | departs from the original's thresholds | Q-TC-03 |
| I-TC-05 | Offer a second chart (shifted cut) to illustrate an atlas | answers the Details question | new control | F-TC-15 |

## 11. Errors in the original (conceptual and mathematical)

Owner rule R-C (2026-10-17). Checked: `TorusToPlane` at the three stages by hand — λ = 0: a torus about (π, π) with
major radius 2π/3 and a tube of horizontal semi-axis π/3 and vertical semi-axis 1 (a slightly elliptic tube; still a
torus, not listed); λ = 1: the cylinder of radius π and height 2π from both branches (continuous at λ = 1); λ = 2: the
square [0, 2π]² at z = 0 with the ball at (φ, 2π − θ, 0) — correct; the cut "along its longest circumference" (v = 0, the
outer equator: correct); θ and φ in [0, 2π) in the body (correct); the dial; the plot label; the caption's and Details'
mathematical statements about charts and atlases.

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|------|-----------------------|--------------------------|--------------------|-------------------------|--------|
| E-TC-01 | conceptual | In `makeDialControl`: `ang = Dynamic[ArcTan[pt[[1]], pt[[2]]]]; If[ang < 0, ang = ang + 2π]` and `arrowArc[Circle[cent, 0.3, {0, ang}]]` | The `If` is meant to put the dial angle into [0, 2π) like the body does for θ and φ, but `ang` is a `Dynamic` object, so `ang < 0` never evaluates to True: for a hand in the lower half the arc runs **clockwise** from 0 to the hand (it shows −57° where the model uses 303°), and its arrowhead, drawn along the counter-clockwise tangent, points back along the arc (snapshots 1 and 2). | Keeps it (Q-TC-01; `dial-control.js` `arc: 'arrowArcCircle'`). | Arcs counter-clockwise from 0 to the model angle (I-TC-01) change only the dial drawing: unit "the dial arc goes from 0 to ArcTan in (-π, π] and its arrowhead points counterclockwise (original quirk)", golden "chart for a torus: snapshots 1 and 2 show clockwise arcs with counterclockwise arrowheads for dials in the lower half" and M-TC-04 change; the 3D picture and all harness numbers stay. Possible as an option of `dial-control.js`. | open |
| E-TC-02 | text | Plot label `If[λ < 1/2, "2-Torus", If[λ < 1.2, "Cylinder", "Plane"]]` | The surface is a cylinder only at λ = 1 and a plane only at λ = 2; the label says "Cylinder" for an opening torus/funnel from λ = 0.5 (snapshot 3, λ = 0.56) and "Plane" for a curved half-pipe from λ = 1.2 (snapshot 4, λ = 1.45). | Keeps the thresholds (Q-TC-03, F-TC-08). | Exact-stage labels (I-TC-04, e.g. "torus → cylinder" between the stages) change the label text: unit "PlotLabel: 2-Torus below 1/2, Cylinder below 1.2, Plane from 1.2 (strict tolerant Less)", the golden-snapshot labels of snapshots 3 and 4 and M-TC-05 change. | open |
| E-TC-03 | text | Caption: "Locally, the 2-torus resembles ℝ², but there is no global continuous mapping since the Euclidean plane extends to infinity." | False as stated: continuous maps from the torus to ℝ² exist, e.g. any constant map or (u, v) ↦ (cos u, cos v). What does not exist is a continuous **one-to-one** map (a global chart, a homeomorphism onto an open subset of ℝ²). The reason is compactness, not that the plane extends to infinity: by invariance of domain a continuous injective map of the torus (a compact 2-manifold without boundary) into ℝ² would be open, so its image would be open and, as a continuous image of a compact space, compact and therefore closed — a non-empty, bounded, open and closed subset of the connected plane, which is impossible. | Shows the caption as in the original (F-TC-15). | Text only ("no global chart: no continuous one-to-one map onto a region of the plane exists, because the torus is compact"); no test changes. | open |
