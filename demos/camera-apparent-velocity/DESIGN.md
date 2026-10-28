# Design document: Maximizing Apparent Velocity in a Camera's Frame

| | |
|---|---|
| Code version: | 0.1.27 |
| Document revision | 2 (2026-10-27) |
| Status | describes the app as implemented; changes go through Proposed changes (§8) |
| Original | Wolfram Demonstrations Project, "Maximizing Apparent Velocity in a Camera's Frame", contributed by Mohammad Sultan and Aaron T. Becker, published 2018-11-07 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/MaximizingApparentVelocityInACamerasFrame/> Source as text: [`docs/original-source/camera-apparent-velocity.txt`](../../docs/original-source/camera-apparent-velocity.txt); snapshots `docs/original-snapshots/camera-apparent-velocity-1…8.png`; saved states `tests/golden/camera-apparent-velocity.original-states.json` (`states[0]` the live state, equal to `specs`, the Manipulate's initial values; `snapshots` the eight snapshots' settings) |
| Port files | `model.js` (the Initialization definitions of the computation and of the 3D picture, the coordinate grids and one evaluation of the Manipulate body; pure), `picture2d.js` (the 2D definitions, the rasterized label and the body's 2D Graphics; pure), `main.js` (the Manipulate on `shared/manipulate.js` with the 3D picture by `View3D` and the 2D picture as SVG), `index.html` |
| Role in the project | new demonstration, ported in simple mode (v0.1.26): generator, `shared/wl.js`, plain arithmetic; the first port with a Texture (`Texture`, `Rasterize`, `ImageReflect` and textured polygons added to the shared 2D and 3D graphics for it) |

## 1. Purpose and background

A drone at (*x*<sub>c</sub>, *y*<sub>c</sub>, *z*<sub>c</sub>) in the frame of a pinhole camera can move a distance *r* in
any direction: after one time step it can be anywhere in a ball of radius *r*. Which goal makes it move the most in
the camera's picture? The camera projects a point (*x*, *y*, *z*) onto the image plane *z* = *λ* at
*λ*/*z* (*x*, *y*); the ball projects onto an ellipse (the sphere's silhouette). The goal that moves farthest in the
picture is the point where the line of sight touches the sphere on its outer side (latitude *ϕ*, longitude *θ*): its
projection is the outer end of the ellipse's major axis. Because cos *ϕ* < 0 the drone always comes closer to the
camera. When the drone is on the optical axis ((*x*<sub>c</sub>, *y*<sub>c</sub>) = (0, 0)) every *θ* is optimal: the
goals form a ring. The picture shows the camera, the image plane with the projected start (green) and goal (red), the
sphere and its silhouette, the drones and the angles; "show 2D view" shows the image plane as the camera sees it, and
"animate" moves a drone from the start to the goal. The focal length *λ* is 5.

## 2. Scope

In scope: the original's controls, both pictures, the two coordinate displays and the animation, as the published
Demonstration shows them (the definitions saved with its Manipulate, N-CV-01), with the notebook's saved state as
the opening state. Out of scope: anything the original does not do; port additions are the A- features.

## 3. Users and use cases

- UC-CV-01: a student moves the drone's start and the radius and sees where the optimal goal is, in 3D and in the
  image plane, with its coordinates.
- UC-CV-02: a student turns on "show sphere" and sees that the goal is where the line of sight touches the sphere and
  that the sphere projects onto an ellipse whose outer end is the projected goal.
- UC-CV-03: a teacher puts the drone on the optical axis ((*x*<sub>c</sub>, *y*<sub>c</sub>) = (0, 0)) to show the
  ring of equally good goals, and animates the drones.

## 4. Features

| ID | Feature | Reason | Since | Verified by |
|----|----|----|----|----|
| F-CV-01 | Heading "drone starting location (green point)" and the sliders *x*<sub>c</sub> `{{xc, 1, Subscript[Style["x", Italic], "c"]}, -10, 10, 1, Appearance -> "Labeled", ImageSize -> 60}`, *y*<sub>c</sub> (the same, 1) and *z*<sub>c</sub> (10 … 20, step 1, 15), with the layer's value field and ⊕ panel | the drone's start | v0.1.26 | e2e "has the controls of the original with their saved values"; e2e "a slider moves by keyboard; the goal and both grids follow" |
| F-CV-02 | Heading "sphere radius" and the continuous slider *r* `{{r, 4, Style["r", Italic]}, 1, 5, Appearance -> "Labeled", ImageSize -> 60}` (the end shows "5." as Mathematica's machine number) | the distance the drone can move | v0.1.26 | e2e "has the controls of the original with their saved values"; e2e "a slider moves by keyboard; the goal and both grids follow" |
| F-CV-03 | Checkboxes "show sphere" (Silhouette), "show 2D view" (imPlaneView), "show drone" (showDrone), "animate" (animation), all off; the hidden variable `{{a, 0.5}, 0, 1, .1, ControlType -> None}` | the original's switches | v0.1.26 | e2e "has the controls of the original with their saved values"; e2e "show sphere and show drone add"; e2e "show 2D view switches" |
| F-CV-04 | `computeShortestPt[xc, yc, zc, r]`: *θ* = ArcTan[*x*<sub>c</sub>, *y*<sub>c</sub>] (0 on the axis), *ϕ* = 3π/2 − ArcTan[√*r*², √(*d*² − *r*²)] − ArcTan[√(*x*<sub>c</sub>² + *y*<sub>c</sub>²), *z*<sub>c</sub>], the goal on the sphere's parametric equations, each coordinate Chopped | the optimal goal | v0.1.26 | unit "computeShortestPt at the opening state"; unit "the goal is on the sphere and the line of sight to it is tangent"; unit "the goal moves the farthest in the image" |
| F-CV-05 | The two displays `Control@{{unusedVariable, 1, ""}, (sphericaldist[#1, xc, yc, zc, r] &)}` and `… imagePlaneCoor …` under "Red point maximizes pixel change. / coordinates in camera frame" and "image plane coordinates": Grids (right / left aligned) of *x*, *y*, *z*, *θ*, *ϕ* and (*u*, *v*), *λ*, maxdist with `NumberForm[…, {10, 1}]`, degrees with a superscript ∘; on the axis "infinite solutions", "(*x*, *y*) = 3.0(cos θ, sin θ)", "θ ∈ (0, 360)∘" | the numbers of the solution | v0.1.26 | unit "the two grids show the numbers of the snapshots"; unit "the grids for (xc, yc) = (0, 0)"; unit "a coordinate Chop made the exact 0"; e2e "has the controls of the original with their saved values and the two coordinate grids" |
| F-CV-06 | The 3D picture: `drawaxes` (green *x*, *y*, *z* and black *u*, *v* arrows with italic labels), `drawCamera` (green translucent box and aperture funnel), `imagePlane` (yellow plane at *z* = *λ* = 5 with dark edges, a faint 30 × 30 plane below it, the label, the pink double arrow *λ*); `SphericalRegion -> True, ImageSize -> 427.5, Boxed -> False, ViewAngle -> 12°, PlotRange -> 20 {{-1, 1}, {-1, 1}, {-0.1, 1}}`, default ViewPoint; it turns with the mouse | the original's scene | v0.1.26 | unit "the 3D picture of the opening state"; e2e "loads without errors and draws the 3D view"; M-CV-02; M-CV-11 |
| F-CV-07 | `drawSphereLinesArrowsPoints`: green start and its projection, red goal and its projection (PointSize 0.01), blue arrows from the pinhole to the goal and its projection, black arrow from the start to the goal, the translucent arrow between the projections (Opacity 0.4), black lines through the sphere's centre; with "show sphere" the purple sphere (Opacity 0.3) | the solution in 3D | v0.1.26 | unit "the 3D picture of the opening state"; unit "show sphere: the sphere" |
| F-CV-08 | `drawThetaPhi`: *θ* line and arcs (Cyan) at the start and in the image plane, *ϕ* line and arc (Magenta), labels θ, θ, ϕ; for *θ* = 0 one straight arrow | the angles of the solution | v0.1.26 | unit "drawThetaPhi: the θ arcs and the ϕ arc end with a full-size head" |
| F-CV-09 | The silhouette (show sphere): the ellipse with semi-axes *r λ* √((*x*<sub>c</sub>² + *y*<sub>c</sub>² + *z*<sub>c</sub>² − *r*²)/(*r*² − *z*<sub>c</sub>²)²) and *r λ*/√(*z*<sub>c</sub>² − *r*²), centred one semi-axis inward from the projected goal, turned by ellipAng = ArcTan[*x*, *y*]; Purple, Opacity 0.4; in 3D at *z* = 5.01 (25 vertices), in 2D with EdgeForm[Thick] (49 vertices) | the sphere seen by the camera | v0.1.26 | unit "the silhouette: the ellipse of the code's axes"; unit "show sphere: the sphere"; unit "the 2D view (snapshot 3 settings)" |
| F-CV-10 | "show drone": `drawDrone` (four motors and the body in the drone's colour, four yellow arms, four flat gray rotors, Translate to the point) at the start (Darker@Green) and the goal (Red); `draw2Ddrone` (gray rotor disks with thin black edges, brown arms, the coloured centre) in 2D | the drone | v0.1.26 | unit "drawDrone: four motors"; e2e "show sphere and show drone add" |
| F-CV-11 | (*x*<sub>c</sub>, *y*<sub>c</sub>) = (0, 0): `infiniteArrowsPoints` — 21 goals `Table[…, {θ, 0, 2π, 0.1π}]` on a ring at height *z*: blue lines from the pinhole, gray arrows from the start and in the image plane, red points; with "show drone" 22 drones; in 2D `infiniteArrowsPoints2D` | infinitely many solutions | v0.1.26 | unit "(xc, yc) = (0, 0): 21 goals on a ring"; e2e "show sphere and show drone add the sphere, its silhouette and the drones; (xc, yc) = (0, 0)" |
| F-CV-12 | "show 2D view": the image plane as 2D Graphics instead of the 3D picture — `imagePlane2D` (yellow square with a black edge and the label), `drawArrowsPoints2D`, `drawaxesuv`, the silhouette, `drawTheta2D` (θ line, `Arrow[BSplineCurve[…]]` arc, label) or the ring of goals, the drones; PlotRange All (Mathematica's 2 % padding), ImageSize {427.5, 427.5} | the camera's own view | v0.1.26 | unit "the 2D view (snapshot 3 settings)"; unit "the 2D plot range is PlotRange -> All"; unit "graphics2D draws the θ arc"; e2e "show 2D view switches"; e2e "the 2D plot range follows its content" |
| F-CV-13 | The label "image plane": `Rasterize[Style["image plane", "SR"], RasterSize -> 500, ImageSize -> 200, Background -> None]` as `Texture` on a polygon with `VertexTextureCoordinates` (Opacity 0.5, EdgeForm[None]) at the top of the image plane, in both views, upside down as in the snapshots (Q-CV-01) | the original's label | v0.1.26 | unit "the label: Rasterize"; e2e "loads without errors and draws the 3D view: the scene, its nine labels, the textured image plane label"; e2e "show 2D view switches to the image plane as 2D Graphics with its upside-down label"; M-CV-07 |
| F-CV-14 | "animate": `If[animation, a = Mod[a + .1, 1]]` at every evaluation, so the body evaluates itself again (D-CV-05); a purple drone at the fraction *a* of the way from the start to the goal (to every goal of the ring), in 3D also without "show drone" (Q-CV-04) | the motion | v0.1.26 | unit "animate: a = Mod[a + 0.1, 1]"; e2e "animate moves the purple drone"; M-CV-10 |
| F-CV-15 | Opening state: the notebook's saved state, also the Manipulate's initial settings (*x*<sub>c</sub> = 1, *y*<sub>c</sub> = 1, *z*<sub>c</sub> = 15, *r* = 4, *a* = 0.5, every checkbox off) | the published state | v0.1.26 | unit "the opening state is the notebook's saved state"; e2e "Initial settings restores the opening state"; M-CV-02 |
| F-CV-16 | The eight snapshot settings give the snapshot pictures (3D, 3D with sphere and drones, 2D, …, the ring in 2D) | the original's examples | v0.1.26 | unit "the notebook's eight snapshot settings evaluate"; e2e "review screenshots at the eight snapshot settings"; M-CV-08 |
| F-CV-17 | Caption and Details text (from the Demonstration) with the formulas, the snapshot descriptions and two references | the original's explanation | v0.1.26 | M-CV-01 |
| F-CV-18 | Layout `ControlPlacement -> Left`: headings, sliders, checkboxes and the two displays in a column at the left of the picture | the original's panel | v0.1.26 | M-CV-09; e2e "review screenshots at the eight snapshot settings" |
| A-CV-01 | "Initial settings" button restores the opening state (and the 3D picture) | Manipulate's Initial Settings | v0.1.26 | e2e "Initial settings restores the opening state and the 3D view"; M-CV-04 |
| A-CV-02 | Test and automation hook `window.__demo` (getState, setState, view, graphics, inkFraction, pixelAt, textures) from the Manipulate layer | automated tests | v0.1.26 | e2e "loads without errors and draws the 3D view" |
| A-CV-03 | Start-up notice when the browser cannot run the page (DEC-22, WebGL 2 required) | no empty page | v0.1.26 | e2e "start-up notice when" |
| A-CV-04 | Breadcrumb link to all demos | navigation | v0.1.26 | inventory |
| A-CV-05 | Credits footer (authors, title, source, licence, adaptation notice) | required by the licence (CC BY-NC-SA 3.0 §4) | v0.1.26 | e2e "attribution on" |
| A-CV-06 | This app can be bundled and served alone (§6.1) | owner rule R-A | v0.1.26 | e2e "bundle: camera-apparent-velocity runs from its own folder" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|----|----|
| `slider-xc` | F-CV-01 |
| `value-xc` | F-CV-01 |
| `plus-xc` | F-CV-01 |
| `play-xc` | F-CV-01 |
| `stepback-xc` | F-CV-01 |
| `stepfwd-xc` | F-CV-01 |
| `slider-yc` | F-CV-01 |
| `value-yc` | F-CV-01 |
| `plus-yc` | F-CV-01 |
| `play-yc` | F-CV-01 |
| `stepback-yc` | F-CV-01 |
| `stepfwd-yc` | F-CV-01 |
| `slider-zc` | F-CV-01 |
| `value-zc` | F-CV-01 |
| `plus-zc` | F-CV-01 |
| `play-zc` | F-CV-01 |
| `stepback-zc` | F-CV-01 |
| `stepfwd-zc` | F-CV-01 |
| `slider-r` | F-CV-02 |
| `value-r` | F-CV-02 |
| `plus-r` | F-CV-02 |
| `play-r` | F-CV-02 |
| `stepback-r` | F-CV-02 |
| `stepfwd-r` | F-CV-02 |
| `check-Silhouette` | F-CV-03, F-CV-09 |
| `check-imPlaneView` | F-CV-03, F-CV-12 |
| `check-showDrone` | F-CV-03, F-CV-10 |
| `check-animation` | F-CV-03, F-CV-14 |
| `scene-canvas` | F-CV-06 |
| `reset` | A-CV-01 |
| `crumbs` | A-CV-04 |
| `details` | F-CV-17 |
| `credits` | A-CV-05 |

## 6. Design

- `model.js`: the Initialization definitions under the original's names — `computeShortestPt`, `sphericaldist` and
  `imagePlaneCoor` (their Grids as rows of text expressions of `shared/graphics.js`: Row, Style, Superscript),
  `drawDrone`, `drawaxes`, `drawCamera`, `drawSphereLinesArrowsPoints`, `infiniteArrowsPoints`, `drawThetaPhi`,
  `label`, `imagePlane` — and `evaluate(state)` → `{ state, view, graphics: [3D, 2D] }`: the body line by line (the
  animation step returned in `state`; the silhouette's axes, centre and angle; `If[imPlaneView, Graphics[…],
  Graphics3D[…]]`), the picture not shown returned empty. Small local helpers stand in for what `shared/graphics3d.js`
  does not have: `Translate` and `RotateAbout` (Rotate about a point) as GeometricTransformation, `EllipsoidR`
  (semi-axes), the colours Purple, Pink, Magenta, Cyan, and the two arrow workarounds of K-CV-01. `view` reports the
  goal, its projection (*u*, *v*), the silhouette, the axis case, *a* and the 2D plot range for the tests.
- `picture2d.js`: `draw2Ddrone`, `drawArrowsPoints2D`, `drawaxesuv`, `infiniteArrowsPoints2D`, `arc2D`, `drawTheta2D`,
  `text`, `label2D`, `imagePlane2D`, `plotRangeAll` (Mathematica's PlotRange All of the picture) and `graphics2D` (the
  body's `Graphics[…]`, with Annotation test ids `image-plane`, `silhouette`, `theta`, `drone-start`, `drone-goal`,
  `drone-animated`); in its own file so that 2D and 3D primitives keep their Mathematica names in each file.
- `main.js`: one `Manipulate({…})` with the original's control specs; two pictures, `graphic` (View3D,
  `pointLength: 'ImageWidth'`: PointSize relative to the image width) and `graphic2` (SVG, made again when its plot
  range changes); `settle` + `settleInterval` for the animation; `after` shows the picture of the current view, writes
  the two Grids into their displays (`Control` factories without input) and renders the 3D label layer (K-CV-02).
- `index.html`: the ControlPlacement -> Left column (plain headings, checkbox after its label, the Grids as right/left
  aligned tables) and the two picture containers in one place.
- Shared code added for this port (v0.1.26, MIT, owner exception for the lead's integration): in `shared/graphics.js`
  `Texture(image)`, `Polygon(pts, { VertexTextureCoordinates })`, `Rasterize(expr, { RasterSize, ImageSize,
  Background })`, `ImageReflect(image)`, `textureMatrix(pts, vtc)` (pure) and `imageCanvas(image)` (browser), a
  textured polygon drawn as an SVG `<image>` placed by the affine map and clipped to the polygon; in
  `shared/graphics3d.js` `Texture(image)` and `Polygon(points, { VertexTextureCoordinates })` (a flattened polygon
  carries `texture` and `textureCoordinates` when it has both); in `shared/graphics3d-three.js` textured polygons as a
  white Lambert mesh with UVs and a CanvasTexture of the image. Unit tests in `tests/unit/graphics.test.js` and
  `tests/unit/graphics3d.test.js`. Polygons without textures are unchanged.

### 6.1 Building and deploying this app alone

Owner rule R-A (2026-10-17): this one app can be taken out of the repository and hosted anywhere.

- Command, in the repository folder: `npm run bundle -- camera-apparent-velocity` → `dist/camera-apparent-velocity/`.
- Contents (generated with `node tools/bundle-app.mjs camera-apparent-velocity --update-docs`):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/camera-apparent-velocity/`) | 4 | `index.html`, `main.js`, `model.js`, `picture2d.js` |
| `shared/` | 22 | `clock.js`, `graphics-extras.js`, `graphics.js`, `graphics3d-three.js`, `graphics3d-view.js`, `graphics3d.js`, `manipulate.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `mma-lighting.js`, `mma.js`, `random.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `three-helpers.js`, `ui-extra.js`, `ui-interval.js`, `ui.js`, `wl.js` |
| `vendor/three/` | 9 | `addons/controls/OrbitControls.js`, `addons/lines/Line2.js`, `addons/lines/LineGeometry.js`, `addons/lines/LineMaterial.js`, `addons/lines/LineSegments2.js`, `addons/lines/LineSegmentsGeometry.js`, `addons/renderers/CSS2DRenderer.js`, `three.core.js`, `three.module.js` |
| added by the bundler | 8 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/camera-apparent-velocity/DESIGN.md`, `vendor/three/LICENSE` |
<!-- bundle-contents:end -->

- Checked by e2e "bundle: camera-apparent-velocity runs from its own folder" (A-CV-06).

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

- N-CV-01: the published Demonstration runs the definitions saved with its Manipulate output (SaveDefinitions ->
  True), not the notebook's Input cells. They differ only in colours: `Green` where the Input cells write
  `Darker@Green` (`drawaxes`, `drawCamera`, the start points of `drawSphereLinesArrowsPoints`, `infiniteArrowsPoints`
  and `drawArrowsPoints2D`) and `Cyan` for `Darker@Cyan` (`drawThetaPhi`, `drawTheta2D`), and the label's picture
  is saved as `Graphics[Raster[…]]`. The snapshots show the saved definitions (bright green axes, cyan θ); the port
  follows them. The drones' `Darker[Green]` is in the body and the same in both.
- Q-CV-01: the label "image plane" is drawn upside down in both views, as in the snapshots: the saved definitions hold
  its picture as `Graphics[Raster[…]]` (row 1 at the bottom), and Texture takes the rows of that raster from the top.
  The port rasterizes the text and turns it with `ImageReflect`, keeping the original's texture coordinates.
- Q-CV-02: the ϕ label is placed at the azimuth *θ*/2 (`Cos[0.5 θ]`, `Sin[0.5 θ]`), while the ϕ arc is drawn at the
  azimuth *θ*.
- Q-CV-03: in the 2D view the body sets `EdgeForm[Thick], Purple, Opacity[0.4]` at the top level for the silhouette;
  the directives also apply to everything after it — θ, its arc and label, and all drones are drawn at opacity 0.4.
- Q-CV-04: the animated drones are drawn in 3D whenever "animate" is on, in the 2D view only together with "show
  drone"; with "animate" the start and goal drones are purple.
- Q-CV-05: on the axis the label `Row[{"(", Style["x", Italic], ", " Style["y", Italic], ") ="}]` lacks a comma: the
  string ", " is multiplied by *y*, which Mathematica shows with a space ("(*x*,  *y*) =").
- Q-CV-06: the last row of "image plane coordinates" shows the value on the left and the name on the right
  ("0.3 = maxdist").
- Q-CV-07: in the 2D view the body passes *r λ*/*z* as *r* to `drawTheta2D`: the θ line is 0.5 *r λ*/*z* long, but
  `arc2D` scales its radius once more by *λ*/*z*<sub>c</sub>, so the arc is about a third of the line.
- Q-CV-08: on the axis the ring has 21 entries for *θ* = 0, 0.1π, …, 2π: the first and the last goal (and drone)
  coincide; the red points `Point[{{0, 0, 0}, …}]` also put red points at the pinhole (inside the camera).
- D-CV-01: the label's letters are drawn by the browser (Verdana, else DejaVu Sans or another sans-serif) into a
  500-pixel canvas, not the raster saved in the notebook; the letter shapes differ a little (I-CV-01).
- D-CV-02: in 3D the label is lighter than in the snapshots (the darkest letter pixels there are about 75 % black, the
  port's at most about 50 %, softened by the texture filtering at that size); in the 2D view it matches (50 % black).
- D-CV-03: lighting, translucency and edges follow `View3D` (shared with the other 3D ports): translucent faces blend
  once; edges of translucent polygons take the face's opacity, so the image plane's edges are lighter than in the
  snapshots; the silhouette on the image plane is more orange, the snapshots' more pink.
- D-CV-04: the camera's aperture is one non-planar Polygon of 16 vertices in the original, which Mathematica fills as
  the four sides of a funnel; `shared/graphics3d-three.js` fills a polygon as a fan from its first vertex, so the port
  draws the same four sides as four Polygons (`APERTURE` keeps the original's vertices; same edges, unit "drawCamera").
- D-CV-05: "animate" makes the body evaluate itself again, as in Mathematica, at most ten times a second
  (`settleInterval`; Mathematica as fast as it can draw, depending on the computer); one evaluation moves *a* by 0.1.
  The interval is measured in real time, not on the page clock, so `setClock` does not freeze or step the animation
  (tests check it by polling).
- D-CV-06: the 3D labels are CSS2D labels (the layer's 3D Text): drawn on top of everything in an upright
  sans-serif, *x*, *y*, *z*, *u*, *v* in italics.
- D-CV-07: the controls are the layer's: a slider's label above it, a value field and a ⊕ panel (play and step
  buttons); the checkbox follows its label as in Mathematica; the two displays are HTML tables in the control column.
- D-CV-08: both pictures stay on the page in one place, the one of the current view shown; the hidden one is drawn
  empty (the 3D view keeps its rotation while the 2D view is shown).
- K-CV-01: `shared/graphics3d-three.js` draws an Arrow from its first to its second point only and takes one number for
  Arrowheads. The θ and ϕ arcs (`Arrow[Table[…]]`, 13 points) are drawn as their Line and a two-point Arrow on the
  last segment as long as the head (Arrowheads × the plot range's diagonal, View3D's size), so the head has its full
  size; the λ arrow (`Arrowheads[{-0.011, 0.011}]`, a head at each end) as two arrows from its middle (I-CV-02).
- K-CV-02: `View3D` rebuilds the 3D labels at every evaluation but renders them on the next animation frame; an
  evaluation of the animation loop runs after that frame's rendering, so the page was painted without labels while
  animating. The page renders the label layer itself after every evaluation (`after`).
- N-CV-02: `NumberForm[v, {10, 1}]` shows one decimal; a coordinate that Chop made the exact 0 (e.g. *y* for
  *y*<sub>c</sub> = 0) is the exact integer 0, shown "0" (unit "a coordinate Chop made the exact 0").
- N-CV-03: the goal was checked against what it claims: it is on the sphere, the line of sight to it touches the
  sphere, no point of the ball projects farther from the projected start (sampled), and the silhouette ellipse passes
  through the projections of the sphere's tangent circle (unit tests); *ϕ* is always between 90° and 270°.

## 8. Proposed changes

No open proposal. Template (see [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md)):

| ID | Status | Requested by / date | Change | Reason | Acceptance criteria |
|----|--------|---------------------|--------|--------|---------------------|

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.25 | 2026-10-26 | generated by `tools/new-app.mjs` (example model and controls) |
| 2 | v0.1.26 | 2026-10-27 | the port: the original's (saved) definitions, controls, 3D and 2D pictures, coordinate displays and animation in simple mode; opening state from the notebook; Texture, Rasterize and ImageReflect added to the shared graphics |
| 3 | v0.1.27 | 2026-10-28 | version number; the shared code gained spans with a step, a cyclic `Riffle`, `EvenQ`/`OddQ`, `ArcCos`/`ArcSin`, `DeleteCases`, `ToString` and `StringForm` (`shared/wl.js`), legend labels that are pictures and Mathematica's `Placed[…, {pos, align}]` form, `Automatic` in PlotStyle lists, `Fraction` labels, 3D `Line` with several polylines, and View3D's `Epilog` and `SphericalRegion: false` (v0.1.27); no change to this app's code, behaviour or picture (DOM parity with v0.1.26) |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|-------------|---------|-------------|---------|
| I-CV-01 | Use the label's raster saved in the notebook (497 × 99 pixels, decoded with `tools/mdecode.py`) as the texture image | the original's letters exactly | about 5 kB of data in the app; a decoder for it | D-CV-01 |
| I-CV-02 | Arrows along a polyline and `Arrowheads[{s1, s2, …}]` in `shared/graphics3d-three.js` (as the 2D renderer has them) | the arcs and the λ arrow written as in the original | a shared change; the 3D ports' arrows to be checked | K-CV-01 |
| I-CV-03 | Render the CSS2D labels in `View3D.draw` itself | no app workaround for labels rebuilt in an animation loop | a shared change | K-CV-02 |
| I-CV-04 | Depth-tested 3D labels | labels hidden behind the sphere as in Mathematica | renderer work in shared/ | D-CV-06 |
| I-CV-05 | A harness run in Mathematica at the snapshot settings (goal, grids) | the port checked against the original's own numbers | operator time | F-CV-04 |

## 11. Errors in the original (conceptual and mathematical)

Checked when porting (owner rule R-C): the optimal goal and the silhouette formulas are right (N-CV-03). The errors
found are in the displayed distance and in the Details text.

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|------|-----------------------|--------------------------|--------------------|-------------------------|--------|
| E-CV-01 | mathematical | `imagePlaneCoor`, `maxdist` | maxdist = √((*x*/*z* − *x*<sub>c</sub>/*z*<sub>c</sub>)² + (*y*/*z* − *y*<sub>c</sub>/*z*<sub>c</sub>)²) has no factor *λ*, while the (*u*, *v*) shown above it are *λ x*/*z*, *λ y*/*z*: the "maximum distance" is a fifth of the distance between the projected start and goal in the image plane (snapshot 1: 0.3, the image distance is 1.43) | keeps the original | maxdist × 5 (1.4 in snapshot 1) | kept |
| E-CV-02 | text | Details, the formula for *ϕ* | "*ϕ* = 3π/2 − arctan(…) + arctan(…)": the code (and the geometry) subtracts both arctangents; with the text's sign snapshot 1 would have *ϕ* = 280° instead of 110.8° | keeps the original's text | "3π/2 − (arctan(…) + arctan(…))" | kept |
| E-CV-03 | text | Details, the silhouette's axes | "minor axis = *r λ*/√(*r*² − *z*<sub>c</sub>²)" is the root of a negative number (*z*<sub>c</sub> > *r*); the code's √(*z*<sub>c</sub>² − *r*²) is right; "major/minor axis" are the semi-axes | keeps the original's text | √(*z*<sub>c</sub>² − *r*²), "semi-axis" | kept |
| E-CV-04 | text | Details, the ellipse's centre and rotation angle | arctan(*y*/*x*) with one argument gives the wrong direction for *x* < 0; the code uses ArcTan[*x*, *y*] | keeps the original's text | arctan(*x*, *y*) | kept |
| E-CV-05 | text | Details, the snapshot descriptions | seven descriptions for eight snapshots: "Snapshot 2: 2D view when … *r* = 4" describes no picture (the second shows the 3D view with sphere and drones, the third the 2D view with *r* = 2); from the fourth picture on the numbers are one too low | keeps the original's text | eight descriptions in the pictures' order | kept |
