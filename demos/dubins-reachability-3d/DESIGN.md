# Design document: 3D Reachability Set for a Dubins Car

| | |
|---|---|
| Code version: | 0.1.26 |
| Document revision | 2 (2026-10-27) |
| Status | describes the app as implemented; changes go through Proposed changes (§8) |
| Original | Wolfram Demonstrations Project, "3D Reachability Set for a Dubins Car", contributed by Mohammad Sultan and Aaron T. Becker, published 2020-12-16 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/3DReachabilitySetForADubinsCar/> Source as text: [`docs/original-source/dubins-reachability-3d.txt`](../../docs/original-source/dubins-reachability-3d.txt); snapshots `docs/original-snapshots/dubins-reachability-3d-1…4.png`; saved states `tests/golden/dubins-reachability-3d.original-states.json` (`states[0]` the live state, `specs` the Manipulate's initial values — the same here —, `snapshots` the four snapshots' settings; each also stores the computed plot `plotReach`) |
| Port files | `model.js` (the Initialization definitions — the seven boundary lines in 3D and 2D, the two pose formulas `dubbins3D`, `dubbins3Ds`, the car icon — and one evaluation of the Manipulate body: the 2D plot with the cars or the 3D plot with the sphere; pure), `main.js` (the Manipulate on `shared/manipulate.js`, the two pictures in one place), `picture3d.js` (where the 3D picture is adjusted after View3D's drawing: the plot theme's lighting, the box behind the content, the refit; browser only), `index.html` |
| Role in the project | new demonstration, ported in simple mode (v0.1.26): `shared/wl.js`, `shared/plot.js`, `shared/graphics.js`, `shared/graphics3d.js` and View3D; the first port whose picture switches between a 2D plot and a 3D graphic |

## 1. Purpose and background

A Dubins car moves forward at unit speed in the plane and turns with a radius of at least r: its state is the position
(x, y) of the rear axle's centre and the heading θ, with dx = cos θ, dy = sin θ, dθ = u, |u| ≤ 1/r. Dubins (1957) showed
that a shortest path consists of at most three segments, each a right turn R, a straight segment S or a left turn L at the
maximum rate; the optimal words are RSR, LSL, RSL, LSR, RLR and LRL. The set of states reachable at time t is therefore
bounded by six parametric surfaces, one per word, parameterised by the two switching times t τ₁ and t τ₂, and the
surfaces meet along seven lines (RS, LS, RL, LR, the RLR/LRL paths with no net change of θ, SL, SR) — Patsko, Pyatko and
Fedotov (2003). The Demonstration draws this set in 3D (x, y, θ) with a sphere at the pose of a car that drives a path of
a chosen word and switching times, or its projection on the plane (the seven lines, the gray reachable region) with the
car icon driving the path, the start car and the minimum-turning circles.

## 2. Scope

In scope: the original's controls, its two pictures and their behaviour, with the notebook's saved state as the opening
state. Out of scope: anything the original does not do; port additions are the A- features.

## 3. Users and use cases

- UC-D3-01: a student turns the 3D set to see how the six surfaces fit together and how r and t change it.
- UC-D3-02: a student picks a word and switching times and follows the car (path progress) in 2D, then sees in 3D where
  its final pose lies on the surface of that word.
- UC-D3-03: a teacher compares the 2D projection (the seven lines bounding the reachable region) with the 3D set.

## 4. Features

| ID | Feature | Reason | Since | Verified by |
|----|----|----|----|----|
| F-D3-01 | Setter "dimension" `{{dim, "3D", ""}, {"2D", "3D"}}`: the picture is the 2D projection or the 3D set (one picture place, N-D3-01) | the two views of the Demonstration | v0.1.26 | e2e "the dimension setter switches to the 2D projection"; unit "the hidden variables: a new r recomputes the plot"; M-D3-03 |
| F-D3-02 | Slider *r* (m) `{{r, 1.8, ""}, .5, 10, Appearance -> "Labeled", ImageSize -> 100}`: the minimum turning radius (both pictures, the turning circles, the sphere's pose) | the car's turning radius | v0.1.26 | e2e "has the controls of the original with their saved values"; e2e "a keyboard step of r"; M-D3-03 |
| F-D3-03 | Slider *t* (s) `{{t, 10, ""}, .1, 14, Appearance -> "Labeled", ImageSize -> 100}`: the time (the size of the set, the sphere's radius 0.05 t, polySteps) | the time of the reachable set | v0.1.26 | e2e "has the controls of the original with their saved values"; unit "the 2D picture: seven curves and the legend"; M-D3-03 |
| F-D3-04 | "path type" `{{path, "RSR", ""}, {"RSR", "LSL", "RSL", "LSR", "RLR", "LRL"}}`, a PopupMenu (six values, as Mathematica shows them, N-D3-04): the turns {p1, p2, p3} and the colour of the Piecewise (ColorData[97] 2, 1, 3, 4, 5, 6) | the word of the car's path | v0.1.26 | e2e "the path popup chooses the path"; unit "pathParameters: the turns of the three segments" |
| F-D3-05 | IntervalSlider "switching times *τ*" `{{τ, {0.5, 0.75}, ""}, 0, 1, 0.01, ImageSize -> 100, ControlType -> IntervalSlider, Method -> "Push"}`: the fractions of t where the car switches; one end pushes the other | the path's switching times | v0.1.26 | e2e "the switching times τ by keyboard; Method Push"; unit "carPose: the switching times rescaled" |
| F-D3-06 | Slider "path progress (%)" `{{p, 100, ""}, 0, 100, 1, Appearance -> "Labeled", ImageSize -> 100}`: the car (2D) or the sphere (3D) at p % of the path, the switching times rescaled to the part driven | following the car along its path | v0.1.26 | e2e "the path progress p moves the car back along its path"; unit "carPose: the switching times rescaled" |
| F-D3-07 | Hidden variables `{dimold, 1, None}`, `{rold, 1, None}`, `{told, 1, None}`, `{plotReach, 1, None}`: the plot is computed again when t, r or dim change; `ControlActive[None, told = t; rold = r; dimold = dim]`: while a slider is dragged the old values stay, so the plot follows at every step (Q-D3-05) | the original's plot cache | v0.1.26 | unit "the hidden variables: a new r recomputes the plot"; e2e "dragging r with the mouse: rold, told, dimold stay" |
| F-D3-08 | The Initialization formulas: `dubbins3D` (CCC paths), `dubbins3Ds` (paths with a straight middle part), the seven boundary lines `mRS3D` … `mSR3D` and their 2D parts `mRS` … `mSR`; the car's pose at progress p (`If[τ[[i]] < p/100., τ[[i]] 100/p, 1]`) | the reachable set's geometry | v0.1.26 | unit "dubbins3Ds: a quarter turn right ends at (r, r)"; unit "dubbins3D: three quarter turns L, R, L"; unit "the seven lines are the edges of the surfaces"; unit "RLR and LRL with no net change of θ" |
| F-D3-09 | 2D: `ParametricPlot` of the seven lines over s ∈ [0, 1] (`mRLR[s/2, t, r]`), ColorData[97] 1–7, with `PlotLegends -> Placed[{"RS", "LS", "RL", "LR", "RLR, Δθ = 0", "SL", "SR"}, {Left, Bottom}]` (D-D3-04) and the Prolog `{Opacity[0.4], Gray, Polygon[LS–RS–RL], Polygon[LS–RS–LR]}` (polySteps 0.02, 0.05 for t < 10; even-odd filled: dark where the two overlap); `Show[…, AspectRatio -> Automatic, AxesOrigin -> {0, 0}, PlotRange -> {{-15, 15}, {-16, 16}}, ImageSize -> 440]` with the plot's PlotRangePadding Scaled[0.05] (N-D3-05) | the projection of the set on the plane | v0.1.26 | unit "the 2D picture: seven curves and the legend"; e2e "the dimension setter switches to the 2D projection"; M-D3-07 |
| F-D3-10 | 2D epilog: the dashed gray minimum-turning circles at (±r, 0) and the radius arrow (Arrowheads[0.02]; its label is not drawn, Q-D3-03); the car's path (101 points, Thickness[0.01], the path's colour); the start car (Red, Opacity 0.5, no lights) and the car at progress p (Green, Opacity 0.8, headlights, front wheels steering the current turn `cAlpha`) | the car and its path | v0.1.26 | unit "the 2D body: the path of 101 points"; e2e "the path progress p moves the car back along its path"; M-D3-07 |
| F-D3-11 | `drawCar[xy, θ, α, opac, sc, lights]`: body, headlights `If[lights, …]` (7 units long, Yellow, Opacity 0.8 opac, no edges), axles, tyres (the front ones turned by `ArcTan[α ∓ .375, 1.4]` unless α == 0), black arrow; `Translate[Rotate[Translate[…, {0.7, 0}], θ, {0, 0}], xy]` | the car icon | v0.1.26 | unit "drawCar: Translate[Rotate[Translate["; M-D3-07 |
| F-D3-12 | 3D: `ParametricPlot3D` of the seven lines (ColorData[97] 1–7, AbsoluteThickness[2], D-D3-08) and of the six surfaces over τ₁ ∈ [0, 1], τ₂ ∈ [τ₁, 1] — RSR, LSL, RSL, LSR (`dubbins3Ds`) and RLR, LRL (`dubbins3D[τ1/2, 1/2 + τ2/2, …]`) — in the plot theme's colours ColorData[97] 2, 1, 3, 4, 5, 6 with its lighting (D-D3-03) and 15 + 15 mesh lines at τ₁ = k/16 and τ₂ = k/16 in GrayLevel[0.2] (D-D3-02); `Show[…, Graphics3D[{clr, Sphere[pose, 0.05 t]}], ImageSize -> {450, 450}]` with the curves' options: Axes, AxesLabel {*x*, *y*, θ}, PlotRange -> All with PlotRangePadding Scaled[0.05] (N-D3-05), the box (behind the content, D-D3-07), automatic ticks (D-D3-06) | the 3D reachable set | v0.1.26 | unit "plotReach3D: seven curves in ColorData[97] 1–7"; unit "triangularSurface: a grid of τ1 ≤ τ2"; unit "the 3D plot range: PlotRange -> All"; unit "axisTicks: the snapshots' major ticks"; e2e "loads without errors and draws the 3D set"; M-D3-06 |
| F-D3-13 | The sphere (radius 0.05 t) in the path's colour at the car's pose (x, y, θ) at progress p; PlotRange -> All includes it (Q-D3-02) | where the path ends on the set | v0.1.26 | unit "evaluating the saved state keeps it"; e2e "the path popup chooses the path"; e2e "the switching times τ by keyboard; Method Push" |
| F-D3-14 | Opening state = the notebook's saved state = the Manipulate's initial values: 3D, r = 1.8, t = 10, RSR, τ = {0.5, 0.75}, p = 100 | the published Demonstration | v0.1.26 | unit "the opening state is the notebook's saved state"; e2e "has the controls of the original with their saved values"; M-D3-02 |
| F-D3-15 | The four snapshot settings (3D RSR; 2D RSL {0.17, 0.52}; 3D LSL with r = 1.04, {0.37, 0.86}; 2D LRL) give the snapshot pictures | the original's examples | v0.1.26 | unit "the notebook's four snapshot settings evaluate"; e2e "review screenshots at the four snapshot settings"; M-D3-08 |
| F-D3-16 | The 3D picture turns when dragged (Mathematica's 3D graphics); the view direction stays when the body draws again | looking at the set from all sides | v0.1.26 | e2e "dragging the 3D picture turns the view"; M-D3-06 |
| F-D3-17 | Caption and Details text (from the Demonstration) with the system equations, the colours of the six words, the seven lines and two references | the original's explanation | v0.1.26 | M-D3-01 |
| A-D3-01 | "Initial settings" restores the opening state (the Manipulate's initial values are the saved state) | Manipulate's Initial Settings | v0.1.25 | e2e "Initial settings restores the opening state"; M-D3-04 |
| A-D3-02 | Test and automation hook `window.__demo` (getState, setState, view, graphics, inkFraction, camera, pixelAt, themed) from the Manipulate layer and this page | automated tests | v0.1.25 | e2e "a keyboard step of r"; e2e "loads without errors and draws the 3D set" |
| A-D3-03 | Start-up notice when the browser cannot run the page (DEC-22, WebGL 2 required) | no empty page | v0.1.25 | e2e "start-up notice when"; e2e "WebGL 2 notice on" |
| A-D3-04 | Breadcrumb link to all demos | navigation | v0.1.25 | inventory |
| A-D3-05 | Credits footer (authors, title, source, licence, adaptation notice) | required by the licence (CC BY-NC-SA 3.0 §4) | v0.1.25 | e2e "attribution on" |
| A-D3-06 | This app can be bundled and served alone (§6.1) | owner rule R-A | v0.1.25 | e2e "bundle: dubins-reachability-3d runs from its own folder" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|----|----|
| `setter-dim-2D` | F-D3-01 |
| `setter-dim-3D` | F-D3-01 |
| `slider-r` | F-D3-02 |
| `value-r` | F-D3-02 |
| `plus-r` | F-D3-02 |
| `play-r` | F-D3-02 |
| `stepback-r` | F-D3-02 |
| `stepfwd-r` | F-D3-02 |
| `slider-t` | F-D3-03 |
| `value-t` | F-D3-03 |
| `plus-t` | F-D3-03 |
| `play-t` | F-D3-03 |
| `stepback-t` | F-D3-03 |
| `stepfwd-t` | F-D3-03 |
| `popup-path` | F-D3-04 |
| `islider-τ-lo` | F-D3-05 |
| `islider-τ-hi` | F-D3-05 |
| `slider-p` | F-D3-06 |
| `value-p` | F-D3-06 |
| `plus-p` | F-D3-06 |
| `play-p` | F-D3-06 |
| `stepback-p` | F-D3-06 |
| `stepfwd-p` | F-D3-06 |
| `scene-canvas` | F-D3-12, F-D3-16 |
| `reset` | A-D3-01 |
| `crumbs` | A-D3-04 |
| `details` | F-D3-17 |
| `credits` | A-D3-05 |

## 6. Design

- `model.js`: the Initialization definitions under the original's names (`mRS3D` … `mSR3D`, `dubbins3D`, `dubbins3Ds`,
  `mRS` … `mSR`, `drawCar`), `pathParameters` (the Piecewise), `carPose` (the pose at progress p), and
  `evaluate(state, { controlActive })` → `{ state, view, graphics: [3D picture or null, 2D picture or null] }`: the body
  line by line, its assignments to `dimold`, `rold`, `told`, `plotReach` returned in `state` (the If conditions with
  `Unequal` of `shared/wl.js`, `<` on reals with `Less`). The plots are computed by `plotReach2D(t, r)` (shared/plot.js
  `ParametricPlot` with the legend and the Prolog; `show2D` = the Show with its options) and `plotReach3D(t, r)`
  (shared/graphics3d.js `ParametricPlot3D` for the seven curves; `triangularSurface` for each surface: a GraphicsComplex
  over the grid τ₁ = i/n ≤ τ₂ = j/n, n = `surfaceDivisions(t, r)`, a multiple of 16 so that the mesh lines are grid
  lines), each cached for the last (t, r). The 3D picture is `Graphics3D[{Group3D(plot, key "t r"), sphere}]` with an
  explicit PlotRange = the bounds of plot and sphere padded by 5 % (`padded`) and `Ticks` from `axisTicks`; the plot
  part is drawn again by View3D only when t or r change. `THEME_LIGHTING` holds the plot theme's lights per surface.
  `view` reports the turns, the colour, the car or the sphere, the plot range and bounds, the grid size and whether the
  original's If computed a new plot.
- `main.js`: one `Manipulate({…})` — the original's control specs (hidden variables as `None` controls, the six-valued
  `path` as `PopupMenu`, `τ` as `IntervalSlider` with `Method: 'Push'` and `look: 'mma'`), `ControlActive: true`,
  `throttle: 'frame'` (at most one evaluation per frame while a slider moves: a new 3D plot takes tens of ms), two
  pictures (`graphic`: View3D, `graphic2`: the SVG plot) of which `after` shows the one of the current dimension. A body
  wrapper gives the picture of the other dimension its last graphics (3D: View3D keeps its cached parts; 2D: the frame
  without content), so that switching back draws nothing twice and the hidden picture keeps its frame.
- `picture3d.js`: after each 3D drawing (`after`): `fitViewer` again when the plot range changed (D-D3-05), the six
  surface meshes of a new plot get a ShaderMaterial with the plot theme's lights and white Blinn highlights (D-D3-03),
  and the frame lines are drawn first without depth (D-D3-07). Only the three.js objects View3D made are changed.
- `index.html`: the controls' text in Mathematica's plain style, the canvas with a 12 px white margin for the frame's
  labels (the label layer moved with it), the stacked pictures.

### 6.1 Building and deploying this app alone

Owner rule R-A (2026-10-17): this one app can be taken out of the repository and hosted anywhere.

- Command, in the repository folder: `npm run bundle -- dubins-reachability-3d` → `dist/dubins-reachability-3d/`.
- Contents (generated with `node tools/bundle-app.mjs dubins-reachability-3d --update-docs`):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/dubins-reachability-3d/`) | 4 | `index.html`, `main.js`, `model.js`, `picture3d.js` |
| `shared/` | 23 | `clock.js`, `graphics-extras.js`, `graphics.js`, `graphics3d-three.js`, `graphics3d-view.js`, `graphics3d.js`, `manipulate.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `mma-lighting.js`, `mma.js`, `plot.js`, `random.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `three-helpers.js`, `ui-extra.js`, `ui-interval.js`, `ui.js`, `wl.js` |
| `vendor/three/` | 9 | `addons/controls/OrbitControls.js`, `addons/lines/Line2.js`, `addons/lines/LineGeometry.js`, `addons/lines/LineMaterial.js`, `addons/lines/LineSegments2.js`, `addons/lines/LineSegmentsGeometry.js`, `addons/renderers/CSS2DRenderer.js`, `three.core.js`, `three.module.js` |
| added by the bundler | 8 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/dubins-reachability-3d/DESIGN.md`, `vendor/three/LICENSE` |
<!-- bundle-contents:end -->

- Checked by e2e "bundle: dubins-reachability-3d runs from its own folder" (A-D3-06).

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

- D-D3-01: the curves are sampled by the layer — 2D: shared/plot.js's adaptive sampler; 3D: `ParametricPlot3D`'s 241
  equally spaced points (Mathematica: 57 to 416 adaptive points per curve in the saved plot); the drawn lines agree to
  well under a pixel.
- D-D3-02: each surface is a regular grid of its triangular domain with 64 divisions per parameter (up to 128 for large
  turning angles t/r), not Mathematica's adaptive mesh (2572 to 6107 polygons per surface in the saved plot); the mesh
  lines are where Mathematica draws them (τ₁ = k/16 and τ₂ = k/16, k = 1 … 15, read from the saved plot's 90 + 90
  lines). shared/graphics3d.js `ParametricPlot3D` takes rectangular domains only (its surfaces would put the mesh lines
  at constant (τ₂ − τ₁)/(1 − τ₁) and has no default colours), hence the port's own `triangularSurface`.
- D-D3-03: View3D lights every surface with Mathematica's default `Lighting -> Automatic`; Mathematica's plot theme
  lights each ParametricPlot3D surface with its own ambient light, three directional lights tinted with its colour and
  `Specularity[White, 3 or 6]` (values in `THEME_LIGHTING`, read from the notebook's saved plot). picture3d.js gives the
  surfaces a material with these lights (white Blinn highlights; the light directions from the image centre as
  shared/mma-lighting.js assumes): the colours of the surfaces in snapshots 1 and 3 are reproduced (median pixel per
  colour, snapshot vs port: blue 59, 100, 179 vs 57, 97, 173 and 82, 129, 203 vs 84, 135, 230; orange 140, 63, 13 vs
  144, 66, 14; green 120, 158, 39 vs 106, 142, 34 and 126, 173, 31 vs 124, 170, 30; Phong highlights with the reflection
  vector instead of the half vector gave blue 41, 74, 142 and green 71, 106, 10). The sphere keeps View3D's default
  lighting, as in the original (a Graphics3D primitive).
- D-D3-04: `Placed[…, {Left, Bottom}]` is not in the layer (it takes a centre in scaled coordinates of the padded plot
  range); `LEGEND_AT` = {0.165, 0.175} puts the legend where snapshots 2 and 4 show it (rows from y ≈ −6.2 to −16.3, 12
  px from the left edge). The legend's font and row spacing are the layer's.
- D-D3-05: framing: View3D fits the box's bounding sphere (zoom 0.99: the box 400 px wide as in snapshot 1) and is
  fitted again when the plot range changes (picture3d.js); Mathematica fits the projected box and its labels into the
  image (the box's shape changes the fit slightly) and rescales while the picture is turned. The frame's labels may
  reach the 12 px white margin around the canvas.
- D-D3-06: Ticks: `axisTicks` takes the {1, 2, 5}·10ⁿ step whose number of divisions is closest to 4, which gives the
  six axes of snapshots 1 and 3 (step 5 for ranges from 12.2 to 21.2); View3D's own ticks (graphics3d.js `niceTicks`)
  take step 10 for the x and θ axes of snapshot 3. Minor ticks every step/5, labels as View3D's. The tick marks are View3D's
  (darker and longer than Mathematica's light grey short ticks) and negative labels use a hyphen ("-5"; Mathematica
  "−5"), as in the other 3D ports.
- D-D3-07: the box and its ticks are drawn behind the content: in snapshots 1 and 3 every box edge, the three front
  edges included, is hidden where the surfaces cover it (checked pixel by pixel along the projected edges); View3D
  depth-tests the frame, which would draw the front edges across the surfaces. picture3d.js draws the frame lines first
  and without depth.
- D-D3-08: AbsoluteThickness[2] of the 3D curves is View3D's `Thick` drawn 2 px wide (`thickPx: 2`), the mesh lines
  1 px (graphics3d.js has no AbsoluteThickness).
- D-D3-09: the value fields of the sliders are the layer's input fields (Mathematica: editable labels); the popup is the
  browser's select element.
- Q-D3-01: kept as dead code in the original, not ported: the Module's `fs = Max[0, If[p/100 t <= τ, 1, τ/(p/100 t)]]`
  compares a number with the list τ (left from "Isochrons for a Dubins Car") and is never used; the Module locals x, y
  of `dubbins3D` and `dubbins3Ds` and the argument sc of `drawCar` are unused too.
- Q-D3-02: the sphere's radius 0.05 t grows with t, and PlotRange -> All includes the sphere: in snapshot 1 the y range
  begins at the sphere's lowest point (−4.37), not at the surfaces' (−4.35); a sphere at an extreme pose enlarges the
  box.
- Q-D3-03: the radius label `Text["r", {r, -r/3}, Left]` does not appear in snapshots 2 and 4 (Left is not a Text offset
  {dx, dy}); the port draws no label (M-D3-07 checks it in Mathematica).
- Q-D3-04: `mRLR3D[a]` runs along the RLR paths with no net change of θ in the opposite direction (it equals RLR with τ =
  {1/2 − a, 1 − a} and LRL with τ = {a, a + 1/2}); the line is the same.
- Q-D3-05: while a slider is dragged (ControlActive) told, rold and dimold are not updated, so the original computes its
  plot at every step of a drag of r or t and once more on release; the port's cache returns the same plot without
  computing it again.
- K-D3-01: the lighting model of D-D3-03 (Blinn highlights, light directions from the image centre) is fitted to the
  snapshots' colours, not taken from Mathematica's renderer: the highlights' places and sizes may differ slightly.
- K-D3-02: the theme's light values come from the notebook's saved plot (the Mathematica version that made it); another
  version's plot theme may differ (check: `Cases[ParametricPlot3D[{u, v, 0}, {u, 0, 1}, {v, 0, 1}], _Rule, Infinity]`).
- K-D3-03: picture3d.js relies on View3D's objects (the frame group is the scene's group that is not a content group;
  the surfaces are the Lambert meshes of the plot group, in drawing order); the e2e tests check the result (the number of
  themed surfaces, the front edge's pixels, the refit).
- N-D3-01: the original has one output that shows either the 2D plot or the 3D graphic; the Manipulate layer has a
  fixed list of pictures, so the port has two (`graphic`, `graphic2`) in one place and shows the one of the current
  dimension; the other keeps its last drawing (reported to the lead: a picture the body leaves out could be hidden by the
  layer itself).
- N-D3-02: the notebook stores the computed plot in the variable plotReach (megabytes of Graphics); the port computes
  the plot from r, t and dim (cached) and keeps in plotReach only `{dim, r, t}`. The tests and the review screenshots
  pass the saved settings without it.
- N-D3-03: the text above the controls ("dimension", "*r* (m)", "*t* (s)", "path type", "switching times *τ*", "path
  progress (%)": strings and Row[…] items before controls with empty labels in the original) is the controls' labels
  here, in plain text as in the snapshots; "move car" (Style[…, 12]) is a larger heading, the empty strings are spacing.
- N-D3-04: Mathematica shows a control with more than five values as a PopupMenu (the snapshots); the port sets
  `ControlType: PopupMenu` (the layer would make a setter bar).
- N-D3-05: both of the original's plots carry two PlotRangePadding options; Mathematica uses the first, Scaled[0.05]:
  snapshot 1's y range reaches −5.09, so the tick −5 is drawn (with Scaled[0.02] it would end at −4.64), and snapshot
  2's axes reach ±16.5 and ±17.6.
- N-D3-06: snapshot 2's legend reads "RLR,Δθ=0" (an earlier version of the code); the notebook's code and snapshot 4
  read "RLR, Δθ = 0", as the port.
- N-D3-07: the formulas were checked against the motion they describe: quarter and half turns of known end poses, the
  seven lines as the surfaces' edges, and the Details' statement that RLR and LRL with Δθ = 0 give the same line (unit
  tests).
- N-D3-08: `AutorunSequencing -> {1}` and `SynchronousInitialization -> False` are left out: they act only through the
  Autorun menu and the notebook's start-up, which a web page does not have.

## 8. Proposed changes

No open proposal. Template (see [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md)):

| ID | Status | Requested by / date | Change | Reason | Acceptance criteria |
|----|--------|---------------------|--------|--------|---------------------|

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.25 | 2026-10-26 | generated by `tools/new-app.mjs` (example model and controls) |
| 2 | v0.1.26 | 2026-10-27 | the port: the original's controls, the 2D plot with the cars and the 3D set with the sphere in one picture place, the plot cache with ControlActive, in simple mode; the plot theme's lighting, the box behind the content and the refit as workarounds for View3D (picture3d.js); opening state from the notebook |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|-------------|---------|-------------|---------|
| I-D3-01 | Golden tests against the saved plots: the notebook's states store Mathematica's sampled points of the seven lines and six surfaces for r = 1.8 and 1.04; check that they lie on the port's lines and surfaces | the formulas checked against the original's own output | parsing the 12 MB fixture in a unit test (slow) | F-D3-08 |
| I-D3-02 | Mark the switching points on the 2D path (where the car changes from one turn to the next) | shows what τ means on the path | differs from the original | F-D3-05 |
| I-D3-03 | Draw the car's whole path in 3D (x, y, θ along the path) up to the sphere | shows how the path reaches its surface | differs from the original; a second curve in the 3D picture | F-D3-13 |
| I-D3-04 | Move the workarounds of picture3d.js into the shared layer (per-primitive Lighting and Specularity, the frame behind the content, PlotRangePadding and refit for explicit ranges) | other 3D ports get Mathematica's look; this page loses its private three.js code | shared code change (the lead) | D-D3-03, D-D3-05, D-D3-07 |

## 11. Errors in the original (conceptual and mathematical)

Checked when porting (owner rule R-C): the pose formulas give the right end poses for turns of known angles, the seven
lines are the edges of the six surfaces, the RLR and LRL lines with Δθ = 0 coincide, and the Details' colours, lines and
words match the code (unit tests; N-D3-07).

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|------|-----------------------|--------------------------|--------------------|-------------------------|--------|
| E-D3-01 | text | Details, paragraph on the switching times | "the second command until t τ₁" should read "until t τ₂" | keeps the original's text | the sentence describes the three segments correctly | kept |
| E-D3-02 | text | Caption | "a forward-moving car with a bounded velocity": the sets drawn are those of constant unit speed (the Details: "moves forward at a constant speed"); with a speed only bounded by 1 the set reachable at time t would be the union of these sets for all times up to t | keeps the original's text | "with a constant velocity" (or "unit speed") would match the pictures | open |
