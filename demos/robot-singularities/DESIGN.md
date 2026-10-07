# Design document: Robot Singularities in Three-Link Manipulators

| | |
|---|---|
| Code version: | 0.1.12 |
| Document revision | 3 (2026-10-06) — published on the main site (private-preview banner removed) |
| Status | describes the app as implemented; changes go through *Proposed changes* (§8) and [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md) |
| Original | Wolfram Demonstrations Project, "Robot Singularities in Three-Link Manipulators", contributed by Aaron T. Becker and Yitong Lu, published January 11, 2021 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/RobotSingularitiesInThreeLinkManipulators/>. Readable source: [`docs/original-source/robot-singularities.txt`](../../docs/original-source/robot-singularities.txt); snapshots: `docs/original-snapshots/robot-singularities-*.png`; saved state: `tests/golden/robot-singularities.original-state.json` |
| Port files | shared: `shared/mma-lighting.js` (Mathematica's documented default lighting, new with this port); app: `robots.js` (Type table, dhTransform, o3coords, Td, the transcribed Jacobians, joint-variable rules; pure), `singular-sets.js` (the 64 hand-written singularity graphics as data; pure), `svd3.js` (SVD, MatrixRank, manipulability ellipsoid; pure), `g3d.js` (a small model of Graphics3D directives, Show, ParametricPlot3D, InfinitePlane clipping, bounds; pure), `model.js` (drawJoint & co. and one evaluation of the Manipulate body; pure), `main.js` (controls, two three.js viewers), `index.html` |
| Role in the project | further demonstration (extra proof of concept alongside the motion-planning port); developed in a separate, unpublished repository and added to this site in v0.1.12 |

## 1. Purpose and background

A teaching tool for the velocity Jacobian of serial three-joint robots: the user picks one of 16 robot types
(Denavit–Hartenberg tables), moves the joints with sliders and sees, in red, the configurations where the linear
(or angular) velocity Jacobian loses rank — in the workspace (left) and in the joint ("phase") space (right).
The manipulability ellipsoid (image of a ball of joint velocities of diameter 1 under the Jacobian) shows how the
robot's possible end-effector velocities collapse at those configurations. The singular sets are hand-written
graphics in the original (not computed at run time); the Jacobians are hand-written matrices.

## 2. Scope

In scope: the original's controls (robot popup, joint slider grid, "show robot", "show manipulability ellipsoid",
"velocity singularities" Linear/Angular), the 16 robots, the transcribed Jacobians, the 64 singular-set graphics,
the robot drawing, the manipulability ellipsoid, the two 3D graphics with mouse rotation, and the original's quirks
(slider reset on robot change, ±6.28 wrap, recomputation only on change, the stale label of the saved state).
Out of scope (would need a design entry first): computing singular sets automatically, more robots, inverse
kinematics, showing numbers (determinant, singular values), animation of the sliders.

## 3. Users and use cases

| ID | User | Use case |
|----|------|----------|
| UC-RS-01 | student | choose a robot and see where its Jacobian is singular, in joint space and in the workspace |
| UC-RS-02 | student | move the joints into and out of a singular set and watch the manipulability ellipsoid collapse |
| UC-RS-03 | student | compare linear-velocity and angular-velocity singularities |
| UC-RS-04 | tester | compare the port with the original's saved state, snapshots and Details text |

## 4. Features

### 4.1 Controls

| ID | Feature | Why | Since | Verified by |
|----|---------|-----|-------|-------------|
| F-RS-01 | Popup menu with the 16 robot names (default 2 "elbow robot arm"), above the other controls (`ControlPlacement -> Top`) | choose the robot (UC-RS-01) | v0.1.0 | e2e "has the controls of the original with their defaults"; e2e "choosing another robot rebuilds the sliders and resets them: SCARA shows d3 = 0.5"; unit "the Type table has the 16 robots of the popup menu with the joint types of the original" |
| F-RS-02 | Joint slider grid: per joint a label θ_i (revolute, −1.01π … 1.01π, step 0.01π) or d_i (prismatic, 0 … 1, step 0.01) and the current value next to it (`Appearance -> "Labeled"`, 6 significant digits); the grid is rebuilt when the robot changes and every rebuild resets the joints to 0 (revolute) / 0.5 (prismatic) (Q-RS-02) | move the joints (UC-RS-02) | v0.1.0 | unit "sliderSpec: revolute -1.01π to 1.01π in steps of 0.01π, prismatic 0 to 1 in steps of 0.01"; unit "selectType resets the joint values to the slider defaults, selecting the same robot keeps them (original quirk)"; unit "defaultParams: 0 for revolute and 0.5 for prismatic joints (the slider grid initial values)"; e2e "dragging the θ1 slider with the mouse turns the elbow arm about the vertical axis"; e2e "choosing another robot rebuilds the sliders and resets them: SCARA shows d3 = 0.5"; golden "robot singularities: snapshot 4 (SCARA arm) shows θ1 = 0, θ2 = 0, d3 = 0.5 and phase axes θ1, θ2, d3 with d3 from 0 to 1"; golden "robot singularities: owner state 1 joint values are slider values min + k step bit for bit (k = 60, 18, 149)" |
| F-RS-03 | A revolute value below −π or above π jumps by ±6.28 at the next evaluation ("the slider jumps by 2π when pushed to the limit", Details) (Q-RS-03) | joints turn without end | v0.1.0 | unit "wrapParams: a revolute angle beyond π jumps by 6.28, not 2π (original quirk)"; unit "wrapParams: π itself and 1 ulp above are not wrapped (tolerant Greater)"; unit "evaluate wraps the joint values by 6.28 and stores them"; e2e "pushing a joint slider to its end makes it jump by 6.28 (original quirk)" |
| F-RS-04 | Check box "show robot" (default off): draws the robot in the workspace | see the arm (UC-RS-02) | v0.1.0 | e2e "show robot draws the robot and show manipulability ellipsoid adds the ellipsoid and the phase-space ball" |
| F-RS-05 | Check box "show manipulability ellipsoid" (default off): ellipsoid at the end point and a light-blue ball of radius 1/2 around the configuration in phase space | see the velocity ellipsoid (UC-RS-02) | v0.1.0 | e2e "show robot draws the robot and show manipulability ellipsoid adds the ellipsoid and the phase-space ball"; unit "phase graphic: blue sphere radius 0.2 at params, plus a light-blue sphere radius 1/2 with the ellipsoid" |
| F-RS-06 | Setter "velocity singularities" Linear (default) / Angular: selects the Jacobian (myJacob / myJacobAngular) and the singular sets | compare linear and angular singularities (UC-RS-03) | v0.1.0 | e2e "Angular shows the angular-velocity singular sets (elbow: whole phase cube and the sphere)"; e2e "has the controls of the original with their defaults" |

### 4.2 Model (`robots.js`, `singular-sets.js`, `svd3.js`, `model.js`)

| ID | Feature | Why | Since | Verified by |
|----|---------|-----|-------|-------------|
| F-RS-07 | Type table of the 16 robots ({jointtypes, a, alpha, d, theta}), `dhTransform[d, r, θ, α] = Rot_z(θ).Trans_z(d).Trans_x(r).Rot_x(α)`, `o3coords` (end point of the chain), `Td[i] = Chop[Td[i-1].Ad[[i]]]` | forward kinematics as in the original | v0.1.0 | unit "dhTransform is Rot_z(theta).Trans_z(d).Trans_x(r).Rot_x(alpha)"; unit "o3coords of the elbow arm: (2,0,2) stretched, (0,0,4) straight up, (0,0,2) folded"; unit "o3coords of the planar, SCARA and Stanford arms (hand-derived)"; unit "Td of the elbow arm at zero is the hand-derived chain of frames (shoulder at height 2, x along the links)"; unit "Td end column equals the hand-derived elbow end point (cos q1 r, sin q1 r, 2 + sin q2 + sin(q2+q3)), r = cos q2 + cos(q2+q3)"; unit "the planar arm theta row lists q2 twice (original quirk, harmless)" |
| F-RS-08 | The 16 hand-written linear-velocity Jacobians `myJacob`, transcribed exactly (same rows and columns) | the singularities and the ellipsoid come from them | v0.1.0 | unit "myJacob of the elbow arm at zero is {{0,0,0},{2,0,0},{0,2,1}} (hand-derived)"; unit "every linear Jacobian equals the numerical derivative of o3coords (all 16 robots)"; unit "elbow determinant equals -4cos(θ2+θ3/2)cos²(θ3/2)sin(θ3/2) from the Details text"; golden "robot singularities: the 32 Jacobians equal the Piecewise matrices of the input cell (fixture, evaluated independently)" |
| F-RS-09 | The 16 hand-written angular-velocity Jacobians `myJacobAngular`, transcribed exactly, including the spherical wrist's sign (K-RS-01) | Angular mode | v0.1.0 | unit "angular Jacobians: columns are the joint z axes (0 for prismatic) except the spherical wrist, whose entry (3,3) has the opposite sign"; unit "the elbow angular Jacobian has determinant 0 everywhere (Details text)"; golden "robot singularities: the 32 Jacobians equal the Piecewise matrices of the input cell (fixture, evaluated independently)" |
| F-RS-10 | The 64 hand-written singular sets (workspace and phase space × Linear/Angular × 16 robots) as data with the original's primitives (Sphere, Line, Cylinder, Cuboid, Polygon, InfinitePlane, ParametricPlot3D curves and surfaces of o3coords), colours, opacities and thicknesses; Graphics3D directive scoping and Show reproduced | show where the Jacobian loses rank (UC-RS-01) | v0.1.0 | golden "robot singularities: the saved singularspace3D equals the elbow Linear recipe exactly (spheres, radii, line, opacities, colours, thickness)"; golden "robot singularities: the saved singularphasespace3D equals the elbow Linear phase recipe exactly (6 thick lines, 5 InfinitePlanes at opacity 0.5)"; golden "robot singularities: snapshot 3 stored o3coords surfaces of the offset spherical wrist lie on the port surfaces (3837 vertices within 1e-7)"; golden "robot singularities: owner state 1 singularphasespace3D equals the offset PUMA Linear phase recipe exactly, label Phase Space"; golden "robot singularities: owner state 1 workspace rings equal the port Table points to 1 ulp (red, thick)"; golden "robot singularities: owner state 1 stored o3coords surfaces of the offset PUMA arm lie on the port surfaces (2030 vertices within 1e-7)"; unit "elbow Linear workspace set: red spheres r=0.15 at z=0,2,4, a thick red line with opacity 0.4 and a red sphere r=2 with opacity 0.3"; unit "the Linear phase-space sets satisfy det J = 0 (all 16 robots)"; unit "cuboid phase-space sets mark robots whose Jacobian is singular everywhere"; unit "the elbow phase-space set is the five planes θ3 = 0, ±π and θ2 + θ3/2 = ±π/2 of the Details text"; unit "elbow: singular configurations map onto the drawn sphere of radius 2 or the vertical line"; unit "the CNC arm has no singular set (Linear) and its phase graphic is empty"; unit "offset spherical wrist Linear workspace curves are the thick circles o3coords(a, 0 or π, -π/2)"; unit "flatten applies directives in order and scopes them to lists"; unit "Show keeps the styles of each graphic separate and takes options from the first"; unit "Rotate turns about an axis through the origin (π/2 about y maps z to x)" |
| F-RS-11 | The singular sets are recomputed only when the robot or Linear/Angular changes (`iTypeOld`, `isJLinearVelOld`); the stored phase graphic keeps its options; the opening state is the notebook's saved state, whose phase graphic carries the label "phase space" (Q-RS-04, Q-RS-05) | the original's caching, and its opening picture (snapshot 1) | v0.1.0 | unit "opening state: the singular sets are not recomputed, so the stale label phase space stays (original quirk)"; unit "changing the robot or Linear/Angular recomputes the singular sets and the label becomes Phase Space, a slider move does not"; unit "initial state: the values saved in the original notebook (elbow, zeros, Linear, iTypeOld 2, label phase space)"; golden "robot singularities: the saved Manipulate variables are the opening state of the port"; golden "robot singularities: owner state 1 evaluated by the port keeps its variables (no wrap, no recompute)"; golden "robot singularities: snapshot 1 shows the lowercase label phase space at opening, snapshots 2-4 show Phase Space after a recompute"; e2e "the phase-space label reads phase space at opening (as snapshot 1) and Phase Space after changing the robot" |
| F-RS-12 | Manipulability ellipsoid: `{U, Σ, V} = SingularValueDecomposition[N[J]]`, Σ/2; for Σ_ii > 0.1 two arrows ±Σ_ii along column i of U (blue, red, green) and a ring (unit circle scaled by `DiagonalMatrix[...]` with the original's rotations; blue, red, darker green); a light-blue ellipsoid with semi-axes Σ_ii only when `MatrixRank[Σ] > 2`; all moved by `{U, o3coords[params]}` (Q-RS-08) | see the velocity ellipsoid collapse (UC-RS-02) | v0.1.0 | unit "svd3 of the elbow Jacobian at zero: singular values √5, 2, 0 with U columns ±z, ±y, ±x (hand-derived)"; unit "svd3 reconstructs A = U Σ Vᵀ with orthogonal U and V and descending singular values"; unit "svd3 singular values are the square roots of the eigenvalues of AᵀA (trace and determinant check)"; unit "matrixRank uses the relative tolerance 3 eps of the largest singular value"; unit "svd3 orders repeated singular values by the dominant axis of their singular vectors"; golden "robot singularities: CNC Jacobian SVD as in Mathematica up to column signs (U = diag(-1,-1,1), V = {{0,0,1},{-1,0,0},{0,-1,0}})"; golden "robot singularities: MatrixRank of DiagonalMatrix {1, 1e-13, 0.5} is 3 and of {1, 1e-17, 0.5} is 2 as in Mathematica"; unit "manipEllip halves the singular values, draws arrows and rings only for Σ_ii > 0.1 and the ellipsoid only at full rank"; unit "manipEllip for a hand-made Jacobian with singular values 3, 2, 0.5: blue arrows ±1.5 z, red ±1 x, green ±0.25 y, rings in those planes"; golden "robot singularities: snapshots 2 and 4 show a flat ellipse (no ellipsoid), snapshot 3 a full ellipsoid" |

### 4.3 Graphics (three.js)

| ID | Feature | Why | Since | Verified by |
|----|---------|-----|-------|-------------|
| F-RS-13 | Workspace graphic (ImageSize 325, `SphericalRegion`, no box, label "Workspace", Mathematica's default lighting and colour arithmetic): light-brown ground cylinder radius 2.2, the robot (drawJoint per joint in frame Td[i-1]: gray axis cylinder/cuboid, light-blue joint, gray link; red/blue/green coordinate arrows; orange wrist-centre point), the singular set, the ellipsoid; plot range = all shown objects | the left picture of the original | v0.1.0 | e2e "loads without errors and draws the workspace and the phase space"; e2e "the ground top is peach and the translucent singular sphere red as in snapshot 1 (Mathematica colours)"; unit "mma-lighting: the documented default lights of Lighting -> Automatic"; unit "mma-lighting: replaces the lights of a camera with one ambient and four directional lights"; unit "drawCoordAxes: red z, blue x and green y arrows of length 2jr = 0.4 with thick lines"; unit "drawJoint: revolute = gray axis cylinder, light-blue joint cylinder r = 0.14, gray link rotated by Theta, prismatic = gray cuboid and two light-blue cuboids"; unit "the robot: wrist centre point at the end point, ground cylinder radius 2.2"; unit "workspace plot range covers all shown objects (ground ±2.2, top sphere to z = 4.15)"; M-RS-02; M-RS-05 |
| F-RS-14 | Phase-space graphic (ImageSize 280): PlotRange ±3.15 (revolute) or {0, 1} (prismatic) per joint, BoxRatios {1,1,1}, box, axes with ticks and labels θ_i / d_i, the singular set (InfinitePlanes clipped to the box), a blue ball radius 0.2 at the configuration (an ellipsoid on screen when the axes differ) | the right picture of the original | v0.1.0 | unit "phaseOpt: PlotRange ±3.15 for revolute and {0, 1} for prismatic joints, axes labels θ_i / d_i"; unit "infinitePlanePolygon clips the plane θ2 + θ3/2 = π/2 to the plot range box"; unit "infinitePlanePolygon of a plane lying on a face of the box is that face"; golden "robot singularities: the saved phase-space options equal phaseOpt of the elbow arm with the stale label phase space"; e2e "loads without errors and draws the workspace and the phase space"; M-RS-02 |
| F-RS-15 | Both graphics can be rotated with the mouse | "Rotate the three-dimensional plots to better see the singular sets" (Details) | v0.1.0 | e2e "dragging in the workspace picture rotates the view"; M-RS-07 |
| F-RS-16 | Title, caption and Details & Citations text of the original (with the two Jacobian matrices and the reference) | explains the Demonstration | v0.1.0 | M-RS-01 |

### 4.4 Port additions

| ID | Feature | Why | Since | Verified by |
|----|---------|-----|-------|-------------|
| A-RS-01 | "Initial settings" button: all controls back to the opening state (the saved state, label "phase space") | stands in for the Manipulate ⊕ menu → Initial Settings | v0.1.0 | e2e "Initial settings restores the opening state" |
| A-RS-02 | The value next to each joint slider is an editable field; a typed value is clamped to the slider range (not snapped) | keyboard entry of exact values (K-RS-06) | v0.1.0 | inventory; M-RS-03 |
| A-RS-03 | `window.__demo` automation hook (state, setState, ink fraction of each canvas, Jacobian, SVD, ellipsoid and singular-set summaries, camera position, workspace pixel colour at a world point) | automated tests | v0.1.0 | e2e "loads without errors and draws the workspace and the phase space" |
| A-RS-04 | "All demos" link (the private-preview banner of v0.1.0–v0.1.1 was removed in v0.1.12, when publication was cleared) | site navigation | v0.1.0 | inventory; M-GEN-01 |
| A-RS-05 | Credit footer: original title, authors, licence, adaptation notice | required by CC BY-NC-SA 3.0 | v0.1.0 | e2e "attribution on" |
| A-RS-06 | Start-up notice (watchdog, `<noscript>`) and WebGL 2 notice when the page cannot start (DEC-22) | a clear message instead of an empty page | v0.1.0 | e2e "start-up notice when"; e2e "WebGL 2 notice on" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|-------------|---------|
| `popup-iType` | F-RS-01 |
| `slider-params-*` | F-RS-02, F-RS-03 |
| `value-params-*` | F-RS-02, A-RS-02 |
| `check-showRobot` | F-RS-04 |
| `check-showManipulability` | F-RS-05 |
| `setter-isJLinearVel-*` | F-RS-06 |
| `scene-canvas-workspace` | F-RS-13, F-RS-15 |
| `scene-canvas-phase` | F-RS-14, F-RS-15 |
| `reset` | A-RS-01 |
| `crumbs` | A-RS-04 |
| `details` | F-RS-16 |
| `credits` | A-RS-05 |

## 6. Design

- `robots.js`: the Type table exactly as in the body (`Type = {...}[[iType]]`), `dhTransform` as the product of
  the four transforms in the original's order, `o3coords` (product of the joint transforms, translation column),
  `Td` with `Chop`, `myJacob` / `myJacobAngular` as `switch` statements over iType with the original's
  expressions written out term by term, `wrapParams` (the six `If`s, tolerant comparisons from `shared/mma.js`),
  `defaultParams` (the slider grid's `params[[i]] = 0` / `0.5`) and `phaseOpt`.
- `g3d.js` models just enough of Graphics3D for the original's graphics to be written as data close to the source:
  directives (Red, Thick, Opacity, …) apply to later primitives in the same list, sublists scope them, `Show`
  keeps each graphic's styles and takes options from the first, `ParametricPlot3D` keeps functions and ranges
  (PlotStyle lists are cycled), `GeometricTransformation` / `Rotate` (about an axis through the origin) carry
  4×4 matrices. `flatten` resolves a graphic into styled primitives; the same samples feed the renderer, the
  bounds and the tests.
- `singular-sets.js` holds the 64 graphics in the original's order; o3coords of the current robot is passed in.
- `svd3.js`: one-sided Jacobi SVD (descending singular values, null directions completed to an orthonormal basis),
  MatrixRank with a relative tolerance, and `manipEllip` built exactly as in the body.
- `model.js`: `initialState` (= the notebook's saved Manipulate variables), `selectType` (popup + slider-grid reset),
  `evaluate` (one evaluation of the body: wrap, recompute the singular sets only when needed, ellipsoid, Ad/Td,
  the two `Show`s). The draw functions of the Initialization code are data builders.
- `main.js`: two `createViewer`s (shared/three-helpers) side by side with their own orbit controls, each with
  `outputColorSpace = LinearSRGBColorSpace` and the lights of `shared/mma-lighting.js`; the phase-space
  contents live in a group scaled to the unit cube (BoxRatios {1,1,1}), clipped to the box with clipping planes;
  box, ticks and labels are drawn separately. Singular sets are turned into three.js objects only when they are
  recomputed (as the original recomputes them only then); the ground, robot, ellipsoid and phase-space balls are
  rebuilt on every evaluation.

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

| ID | Kind | Description |
|----|------|-------------|
| Q-RS-01 | quirk kept | The planar arm's theta row is {q1, q2, q2}; harmless (a revolute joint's theta entry is replaced by its slider value). |
| Q-RS-02 | quirk kept | Choosing another robot resets every joint to 0 (revolute) or 0.5 (prismatic): the sliders are built in a Dynamic Grid with `params[[i]] = 0;` in the Slider's first argument, and the grid is rebuilt whenever Type changes. Re-selecting the current robot changes nothing (K-RS-08). |
| Q-RS-03 | quirk kept | Revolute joints jump by ±6.28 (not 2π) once they pass ±π: pushing θ to 1.01π gives θ = −3.10699. The test also applies to prismatic values (never triggered in 0 … 1). |
| Q-RS-04 | quirk kept | The singular sets are recomputed only when iType or the Linear/Angular choice changes; the phase-space options (PlotRange, labels) are those of the evaluation that computed them. |
| Q-RS-05 | quirk kept | The page opens in the notebook's saved state: iTypeOld = 2 and isJLinearVelOld = "Linear" equal the current choices, so the stored graphics (from an earlier version of the code) are shown with the phase-space label "phase space" (lower case, snapshot 1) until the robot or the Jacobian choice changes; then the label is "Phase Space". "Initial settings" returns to this state, as the original's Initial Settings does (K-RS-03, verified). |
| Q-RS-06 | quirk kept | The hand-written singular sets and Jacobians are kept as written even where they disagree with the kinematics (K-RS-01, K-RS-02). |
| Q-RS-07 | quirk kept | The twisted spherical arm's Linear phase-space surfaces are the only ones without `Mesh -> None`, so they show mesh lines. |
| Q-RS-08 | quirk kept | Arrows and rings are drawn only for halved singular values > 0.1, independently of the rank test of the ellipsoid: e.g. the offset spherical wrist at zero (Σ/2 ≈ 0.61, 0.34, 0.074) shows a full ellipsoid but no green arrows or ring. |
| D-RS-01 | deviation | Framing: the workspace uses the bounding sphere of the shown objects like `SphericalRegion`, drawn 1.26 times larger than "sphere fills the picture" (factor measured on snapshots 1, 3 and 4); the phase box is fitted by its bounding sphere ×1.04, so that its width relative to the ground disk is as in snapshot 1 (red phase content width / ground disk width: 1.145 in the port, 1.144 in snapshot 1); tick labels sit close to the box edges to stay inside the picture. Vertical placement and the exact scale differ slightly from Mathematica. |
| D-RS-02 | deviation | Colours: Mathematica lights and blends the displayed (sRGB) colour values directly, so both renderers use `outputColorSpace = LinearSRGBColorSpace` (no linear→sRGB conversion), and the lights are Mathematica's documented defaults from the new `shared/mma-lighting.js` (<https://reference.wolfram.com/language/ref/Lighting.html>) instead of shared/three-helpers' lights (K-RS-10). Measured on the opening picture: ground top (243, 193, 127) vs (250, 200, 149) in snapshot 1; translucent sphere near its centre (242, 125, 125) vs (236, 124, 124). |
| D-RS-03 | deviation | Line widths: `Thick` = 3 px (≈ 2.9 pt measured in snapshot 2), default 1 px; the default dark edges of cuboids, polygons, InfinitePlanes and cylinder rims are drawn as 1 px black lines with the face's opacity (ParametricPlot3D surfaces and spheres have none, as in the original's `EdgeForm[]`); `Arrowheads[.02]` and `PointSize[.02]` as fractions of the workspace box diagonal; the arrowhead cone shape is approximate. |
| D-RS-04 | deviation | ParametricPlot3D curves and surfaces are sampled on fixed grids (241 points, 61 × 61) instead of Mathematica's adaptive sampling; the default mesh (Q-RS-07) is drawn as 15 lines in each direction. |
| D-RS-05 | deviation | Phase-space axes: ticks at −2, 0, 2 (0, 0.5, 1 for prismatic joints) with minor ticks every 0.5 (0.1), placed on fixed box edges chosen for the default view point; Mathematica moves the axes to other edges when the view is rotated. |
| D-RS-06 | deviation | Slider values are min + k·step with an integer k (the right end gives max exactly); the browser's own decimal stepping could not reach 1.01π. The value is shown with 6 significant digits like Mathematica (the centre of a θ slider is 4.44089×10^-16 in this arithmetic). Mathematica uses the same arithmetic: the owner's saved joint values are bit for bit min + k·step (K-RS-06). |
| D-RS-07 | deviation | Rotation uses OrbitControls (the z axis stays vertical) instead of Mathematica's free rotation; the rotation is kept when a control changes (K-RS-07). |
| D-RS-08 | deviation | Translucent solids are drawn with both faces blended (back, then front), as Mathematica does; objects are still sorted per object by three.js, so where several translucent surfaces overlap the blending can differ from Mathematica's. |
| D-RS-09 | deviation | SVD tie order: one-sided Jacobi does not fix which singular vector comes first among equal singular values; the port orders them by their dominant axis (x, y, z), which reproduces Mathematica's choice for the CNC arm (all singular values 1: blue arrows and ring along x, red along y, green along z). Signs of singular vectors may still differ from Mathematica's; nothing drawn depends on them (arrows go both ways, rings and the ellipsoid are symmetric). For other ties the order is not verified. |
| K-RS-01 | known issue (lead) | The spherical wrist's angular Jacobian has −Cos[q2] in row 3, column 3; the joint axis z2 = (−cos q1 sin q2, −sin q1 sin q2, cos q2) gives +cos q2 (the offset spherical wrist, same alphas, has +Cos[q2]). Determinant and singular values are unchanged; the ellipse orientation in Angular mode differs from the true one. Kept as written. |
| K-RS-02 | known issue (lead) | Spherical wrist, Linear: every configuration is singular and the end point moves on the unit sphere around (0, 0, 1), but the translucent sphere drawn there has radius 0.2 (radius 1 may have been intended). Kept as written. |
| K-RS-03 | lead, verified | The original's Initial Settings returns exactly to the port's opening state: the cached Manipulate Specifications in the notebook store iTypeOld = 2, isJLinearVelOld = "Linear" and the elbow graphics with PlotLabel "phase space" as initial values (verified in the notebook by the review). Re-evaluating the input cell instead would start with iTypeOld = −1 and show "Phase Space". |
| K-RS-04 | lead, resolved | SVD basis choice. extra-checks.wls, Mathematica 15.0.1, owner run 2026-10-06: the CNC Jacobian gives U = {{-1,0,0},{0,-1,0},{0,0,1}}, Σ = IdentityMatrix[3], V = {{0,0,1},{-1,0,0},{0,-1,0}}. The port's first version put the singular vectors in column order (blue along z), which changed the colours of the CNC ellipsoid's rings and arrows; it now orders ties by dominant axis (D-RS-09) and matches Mathematica up to column signs, which do not affect the picture. |
| K-RS-05 | lead, partly resolved | MatrixRank tolerance. extra-checks.wls, Mathematica 15.0.1, owner run 2026-10-06: MatrixRank[DiagonalMatrix[{1, 1e-13, 0.5}]] = 3, MatrixRank[DiagonalMatrix[{1, 1e-17, 0.5}]] = 2. The port's former threshold of 1e-12 × the largest singular value gave 2 for the first case; it now uses max(dims) · eps = 3 · 2^-52 ≈ 6.7e-16 × the largest (Tolerance option of MatrixRank, <https://reference.wolfram.com/language/ref/MatrixRank.html>). The two data points only bound Mathematica's tolerance between 1e-17 and 1e-13 relative; the 3 · eps value is the port's choice, not verified. It matters: at the slider centre (θ = 4.44×10^-16, D-RS-06) the elbow and PUMA Jacobians have σmin/σmax ≈ 0.7–1.5e-16, inside that range (a sampled scan found about 771 slider configurations there), so whether the flat ellipse or a full ellipsoid is drawn there depends on the choice. Open checks added by the coordinator to tools/wolfram/extra-checks.wls under K-RS-05: MatrixRank[DiagonalMatrix[{1., x, .5}]] for x = 1.5*^-16, 3*^-16, 1*^-15, 1*^-14, and MatrixRank of the elbow Jacobian at a slider-centre configuration (θ = (0.56548667764616312, −0.81681408993334603, 4.4408920985006262*^-16), k = 119, 75, 101; port: σ = 2.236…, 1.369…, 3.31e-16, rank 2). The unit test of the 2 eps / 4 eps boundary is a regression pin of the port's choice. |
| K-RS-06 | lead, partly resolved | Slider arithmetic: owner state 1 (Mathematica 15.0.1, saved 2026-10-06) holds θ = −1.2880529879718148, −2.607521902479528, 1.507964473723101, which are bit for bit min + k·step with k = 60, 18, 149 (and not k·0.01π), so the port's arithmetic (D-RS-06) is Mathematica's. Still unverified: whether the original's value label at the slider centre reads 4.44089×10^-16 and whether it can be edited (A-RS-02). |
| K-RS-07 | known issue (lead) | Whether the original keeps a mouse rotation when the body re-evaluates (moving a slider) or resets the view is not verified; the port keeps it. |
| K-RS-08 | known issue (lead) | The body re-assigns Type (same value) on every evaluation. Since the original's sliders work, this evidently does not rebuild the slider grid each time; the port resets the joints only when the robot changes. |
| K-RS-09 | known issue (lead) | The stored phase graphic refers to the Module variable phaseOpt of the evaluation that computed it; the port therefore keeps its options with it (consistent with the saved state). |
| K-RS-10 | lead, resolved | Default lighting. extra-checks.wls, Mathematica 15.0.1, owner run 2026-10-06: Mathematica's default Lighting list is exactly the one in shared/mma-lighting.js. This also confirms that shared/three-helpers.js does not reproduce it (colours of directional lights 1 and 3 swapped, 4th light RGBColor[0, 0.18, 0.5] instead of RGBColor[0, 0, 0.18], green light at z = 2 instead of 3) — recorded as K-TP-01 and K-EA-02 for the two rotation demos, which use shared/three-helpers.js; that file is not changed here. Remaining assumption in shared/mma-lighting.js: each directional light shines from its ImageScaled position toward the image centre. |
| N-RS-01 | note | The Type table's symbolic entries (q_i, stored as TextCells in the notebook) are never used in a computation. |
| N-RS-02 | note | `o3coords` is defined with `Set` on symbolic arguments in the original (an expanded expression); the port multiplies the numeric matrices (same values up to rounding). The table's exact angles (π/2, π, …) are evaluated exactly, as Mathematica does. |
| N-RS-03 | note | Checks done while porting: all 16 linear Jacobians agree with numerical derivatives of o3coords; every drawn Linear phase-space set satisfies det J = 0 and a root search of det J along random lines found no undrawn singular configuration; singular configurations map onto the drawn workspace sets (except K-RS-02). |
| N-RS-04 | note | The transcription was compared with the InputForm of the Manipulate cached in the notebook: identical code, only the stored initial values differ (K-RS-03). |
| N-RS-05 | note | The elbow (2) and PUMA (3) arms share Jacobians and singular sets: the PUMA's offsets +1/3 and −1/3 along parallel joint axes cancel. |
| N-RS-06 | note | Snapshots 2 and 3 were made with an OLDER version of the code: their stored settings draw the singular points as `Point` with `PointSize -> Large` (dots) instead of `Sphere[…, 0.15]` / `Sphere[…, 0.2]`, and snapshot 2 has an opaque thick line from (0, 0, 2) to (0, 0, 4) instead of the 0.4-opacity line from (0, 0, 0). The port follows the current code (as in snapshot 1 and the saved state); do not change it toward those two snapshots. |
| N-RS-07 | note | Golden fixtures: `tests/golden/robot-singularities.jacobians.json` (the 32 Piecewise matrices of the input cell as Wolfram expressions, extracted from the box structure and cross-checked against an independent extraction) and `tests/golden/robot-singularities.snapshot3-vertices.json` (the 3837 vertices of snapshot 3's stored o3coords surfaces; all lie within 5e-10 of the port's surfaces). |
| O-RS-01 | owner observation | Owner testing round 1 (Mathematica 15.0.1, 2026-10-06): the port works like the original and is much faster than it. Owner state 1 (offset PUMA arm, θ = (−0.41π, −0.83π, 0.48π), robot and ellipsoid shown) is reproduced by the golden tests: the stored phase-space set exactly, the workspace rings to 1 ulp (Cos/Sin last bit), the 2030 stored surface vertices within 1e-12 of the port's surfaces. |

## 8. Proposed changes

No open proposal. Template (see [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md)):

| ID | Status | Requested by / date | Change | Reason | Acceptance criteria |
|----|--------|---------------------|--------|--------|---------------------|

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.0 | 2026-10-06 | first AI conversion: feature list, quirks, deviations and leads written with the port; after review: Mathematica colour arithmetic and documented lighting (new shared/mma-lighting.js), double-sided translucent solids, default edges, phase-space scale, Thick = 3 px, golden fixtures (Jacobians, snapshot 3 surfaces), K-RS-03 verified |
| 2 | v0.1.1 | 2026-10-06 | owner testing round 1: K-RS-04 resolved (SVD tie order by dominant axis, D-RS-09), K-RS-05 partly resolved (MatrixRank tolerance 3 eps relative, a port choice within the bounds of the data; checks added to extra-checks.wls), K-RS-06 partly resolved (slider arithmetic confirmed), K-RS-10 resolved (lighting confirmed, lead for the main repository), O-RS-01 added, golden tests for owner state 1 |
| 3 | v0.1.12 | 2026-10-06 | added to this repository and published: private-preview banner removed (A-RS-04), role line updated; no other feature changes. Versions v0.1.0 and v0.1.1 in this document (Since column, rows above) are versions of the separate repository the app was developed in, not of this repository |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|-------------|---------|-------------|---------|
| I-RS-01 | Correct the spherical wrist's angular Jacobian sign and the radius of its Linear workspace sphere | correct teaching material | departs from the original | K-RS-01, K-RS-02 |
| I-RS-02 | Compute the singular sets from det J at run time (e.g. marching cubes in joint space, mapped through o3coords) | works for any robot, no hand-written sets | large effort; pictures would differ from the original's clean planes and lines | F-RS-10 |
| I-RS-03 | Keep the joint values when switching between robots with the same joint types | less re-adjusting while comparing robots | departs from the original's slider reset | Q-RS-02 |
| I-RS-04 | Show det J and the singular values next to the graphics | links the picture to the numbers | adds UI the original does not have | F-RS-12 |
| I-RS-05 | Wrap revolute joints by exactly 2π | joint angles stay on the slider grid after a jump | departs from the original's 6.28 | Q-RS-03 |
