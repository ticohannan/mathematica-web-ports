# Design document: Manipulability Ellipsoid of a Robot Arm

| | |
|---|---|
| Code version: | 0.1.25 |
| Document revision | 1 (2026-10-18) — first implementation |
| Status | describes the app as implemented; changes go through *Proposed changes* (§8) and [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md) |
| Original | Wolfram Demonstrations Project, "Manipulability Ellipsoid of a Robot Arm", contributed by Aaron T. Becker and Mary Burbage, published 2016-06-24 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/ManipulabilityEllipsoidOfARobotArm/>. Readable source: [`docs/original-source/manipulability-ellipsoid.txt`](../../docs/original-source/manipulability-ellipsoid.txt); snapshots: `docs/original-snapshots/manipulability-ellipsoid-1.png` … `-4.png`; golden data: `tests/golden/manipulability-ellipsoid.original-states.json` (COMMON-DECISIONS §1, written by `tools/extract_state.py --snapshots`: `states[0]` = output-cell state, raw notebook line 1715; `snapshots[1…4]` = the snapshot cells' Settings, raw lines 5000, 7841, 10766, 14286; `specs` = the stored Specifications) |
| Port files | app: `model.js` (JvRRRanthro, the joint points, the θ/θprev/p logic of the body with its angle encodings, `settle`, the SVD and μ, `splineCircle` as a sampled arc, the robot and ellipsoid graphics as Graphics3D data; pure), `main.js` (the Manipulate on `shared/manipulate.js`: three dials as custom controls, μ label, the model's Graphics3D drawn by `shared/graphics3d-view.js` `View3D` with PlotRange clipping; automation hook; v0.1.21), `index.html` — no app-level dial file; common (CC BY-NC-SA): `demos/common/dial-control.js` and through it `demos/common/arrow-arcs.js` (owner two-link-kinematics; `setter: 'nearest32'`, `arc: 'myArrowArc2'`, `imageSize: 'automatic'`, `keyStep: 'grid'`, `labels: 'stacked'`), `shared/graphics3d.js`, `shared/graphics3d-three.js`, `demos/common/svd3.js` (`manipEllip(J, c, {scale: 1, zeroTol: 100 * 2 ** -53})`) (DH family, owner dh-parameters; used unchanged); shared (MIT): `shared/exact-pi.js` (owner: this app; used unchanged), `shared/three-helpers.js` (non-square `createViewer` with `imageSize`, owner: this app; used unchanged), `shared/mma-lighting.js`, `shared/mma-text.js` (π-fraction dial labels, owner two-link-kinematics, through dial-control.js), `shared/mma-extra.js` (`nearest`, `engineeringForm`), `shared/mma-exact.js` (`det`, `arcTan`), `shared/mma.js` (tolerant `!=`), `shared/svg-plot.js`, `shared/ui.js`, `shared/mma-colors.js` |
| Role in the project | further demonstration (batch B) |

## 1. Purpose and background

A teaching tool for the manipulability of a three-link elbow (anthropomorphic) arm: the user sets the three joint
angles with three dials (steps of π/32) and sees the arm, the manipulability measure μ = σ1·σ2·σ3 (the product of the
singular values of the linear velocity Jacobian, shown as `EngineeringForm[Det[Σfull]]`) and the manipulability
ellipsoid at the end effector: the image of the unit ball of joint velocities under the Jacobian J (Spong, Hutchinson
and Vidyasagar, eq. 4.98, per the Details). Its principal axes are drawn as arrows and rings (blue, red, green). At
singular configurations (θ3 = 0 or θ2 + θ3/2 = π/2 + kπ: rank 2; θ3 = π, the folded arm whose end effector sits on
the shoulder because r2 = r3, or θ2 = ±π/2 with θ3 = 0: rank 1) the filled ellipsoid disappears and only the
flattened rings and arrows remain. The link lengths are fixed (d1 = 2, r2 = r3 = 1).
This Demonstration (2016) is the ancestor of "Robot Singularities in Three-Link Manipulators" (2021, already ported):
the ellipsoid block of that port is this code with the singular values halved.

## 2. Scope

In scope: the three dial controls (LocatorPane snapped to multiples of π/32, hand, ticks, labels, arrow arc), the six
hidden θ/θprev variables and the p ↔ θ logic of the body, `JvRRRanthro`, the singular value decomposition, the μ
label, the arrows/rings/ellipsoid, the robot drawing (cylinders and angle arcs), the Graphics3D options (fixed
PlotRange with clipping, ViewAngle 18°, SphericalRegion, ImageSize {440, 420}, no box), mouse rotation, the saved
opening state, and the original's quirks (§7).
Out of scope (would need a design entry first): Autorun and bookmarks of the Manipulate ⊕ menu (N-ME-04), other link
lengths, numeric display of the singular values or of J, a continuous (unsnapped) dial.

## 3. Users and use cases

| ID | User | Use case |
|----|------|----------|
| UC-ME-01 | student | set the joint angles with the dials and read the manipulability μ |
| UC-ME-02 | student | turn the elbow to 0 or π, or put the end effector above the shoulder, and watch the ellipsoid collapse to an ellipse or a line |
| UC-ME-03 | student | relate the ellipsoid's axes (arrows, rings) to the arm and rotate the picture to see them |
| UC-ME-04 | tester | compare the port with the saved state, the snapshots and the Mathematica harness |

## 4. Features

### 4.1 Controls

| ID | Feature | Reason | Since | Verified by |
|----|---------|--------|-------|-------------|
| F-ME-01 | Three dials at the left (`ControlPlacement->Left`), labels θ1, θ2, θ3: `Control@{{p1,{1,0},"θ1"},(makeDialControl[#1,{0,0},Red]&)}`, `{{p2,{1,0},"θ2"},…Blue}`, `{{p3,{1/Sqrt[2],1/Sqrt[2]},"θ3"},…Green}`. Each dial is a `Graphics[…]` WITHOUT ImageSize in the notebook's stored Initialization (the published version; the Input cell's `ImageSize->140` is not in it): automatic size, measured in snapshot 1 as a circle 346–347 px across at 2 px per pt (173 pt, an image of about 180 pt) with dial centres 378 px (189 pt) apart (N-ME-05); gray unit circle; ticks every π/8 from radius 0.94 to 1 and at π/16 + kπ/8 from 0.98 to 1; gray labels −3π/4, −π/2, −π/4, 0, π/4, π/2, 3π/4, π at radius 0.7 (`FontSize->10`, `Rest@Range[-Pi,Pi,Pi/4]`); a hand in the dial's colour with black edge, `makeHand[7, 7/3, .1, .3]` = polygon {{−7/3, −.3}, {−7/3, .3}, {7, .1}, {7.8, 0}, {7, −.1}}/10, rotated by `ang = ArcTan[pt[[1]], pt[[2]]]`; an arrow arc of radius 0.3 from 0 to ang (`Arrowheads[.05]`, `myArrowArc2`); the default locator glyph at pt | set the joint angles (UC-ME-01) | v0.1.16 | e2e "has the controls of the original with their saved values (μ = 671.892×10^-3)"; unit "the dial table has 65 points, the first and last both {-1, 0}"; unit "dial arrow arc is always an arrow: 12 B-spline control points from 0 to ang, also at ang = 0"; golden "manipulability ellipsoid: snapshot 1 dial circles are 346 px across and 378 px apart (automatic ImageSize of the stored makeDialControl)"; M-ME-03 |
| F-ME-02 | Dial interaction (LocatorPane, one locator): a press anywhere in a dial moves its locator to the press point and the setter `pt = Nearest[Table[{Cos@a, Sin@a}, {a, -π, π, π/32}], #][[1]]` snaps it to the nearest of the 65 table points (multiples of π/32; −π and π are both {−1, 0}); dragging keeps snapping. Port: `demos/common/dial-control.js` with its Nearest-π/32 setter option | the original's angle input | v0.1.16 | unit "dial snapping (Nearest-π/32 option of dial-control.js): a press at (0.3, 0.95) gives 13π/32 and a press at (-1.2, 0) gives π"; e2e "a press in the θ3 dial moves its hand to the nearest multiple of π/32 and updates μ"; e2e "dragging the θ1 dial locator turns the arm about the vertical axis"; harness "H-ME-03"; harness "H-ME-11"; M-ME-03 |
| F-ME-03 | Hidden variables `{Theta1,0,2π,π/32,ControlType->None}`, `{Theta1prev,0,2π,π/32,ControlType->None}`, `{{Theta2,0},-π/4,5/4π,π/32,ControlType->None}`, `{Theta2prev,-π/4,5/4π,π/32,ControlType->None}`, `{{Theta3,π/4},-3/4π,3/4π,π/32,ControlType->None}`, `{Theta3prev,-3/4π,3/4π,π/32,ControlType->None}`. Each evaluation: `If[θiprev != θi, p_i = {Cos[θi], Sin[θi]}; θiprev = θi]` (i = 1, 2, 3), then `θi = ArcTan[p_i[[1]], p_i[[2]]]`, and `If[θ1 < 0, θ1 = θ1 + 2π]` (θ1 in [0, 2π); θ2, θ3 in (−π, π]); `!=` is Mathematica's tolerant Unequal (snapshot 3's Settings keep θ1prev one ulp below θ1) (Q-ME-04, Q-ME-06, Q-ME-07) | the dials drive the joint angles; the θ variables let Autorun and bookmarks drive the dials | v0.1.16 | unit "the prev mechanism: the first evaluation of the source defaults sets p2 = {1,0}, p3 = {1/√2,1/√2}, θ = (0, 0, π/4) and leaves θ1prev = 0"; unit "a dial change updates θi at once and θiprev only at the next evaluation (original quirk)"; unit "θ1 below zero is moved up by 2π (dial at -π/8 gives θ1 = 15π/8), θ2 and θ3 stay in (-π, π]"; unit "a dial change followed by the re-evaluations of the front end (settle) keeps the new angle, and a second dial change is not undone"; e2e "arrow keys on a focused dial step by π/32 (port addition)"; golden "manipulability ellipsoid: the four snapshot Settings are fixed points of one evaluation (snapshot 3 keeps θ1prev one ulp below θ1)"; harness "H-ME-02"; harness "H-ME-03"; harness "H-ME-04"; harness "H-ME-16" |

### 4.2 Model (`model.js`, `demos/common/svd3.js`, `shared/exact-pi.js`)

| ID | Feature | Reason | Since | Verified by |
|----|---------|--------|-------|-------------|
| F-ME-04 | `JvRRRanthro[θ1, θ2, θ3, r2, r3]` transcribed from the Initialization code (rows x, y, z): {−(r2 c2 + r3 c23) s1, −r2 s2 c1 − r3 c1 s23, −r3 c1 s23}, {c1 (r2 c2 + r3 c23), −r2 s1 s2 − r3 s1 s23, −r3 s1 s23}, {0, r2 c2 + r3 c23, r3 c23} (c23 = Cos[θ2 + θ3] …); Module constants w = 1/8, r1 = 1 (unused), r2 = r3 = 1, d1 = 2 | the velocity Jacobian of the Details | v0.1.16 | unit "JvRRRanthro at zero is {{0,0,0},{2,0,0},{0,2,1}} with singular values √5, 2, 0"; unit "JvRRRanthro equals the numerical derivative of oc (central differences, 200 random grid configurations)"; unit "JvRRRanthro equals robot-singularities myJacob of the elbow arm (sum-to-product form) within 2e-15"; harness "H-ME-07" |
| F-ME-05 | Joint points in closed form (not a DH chain): o0 = {0,0,0}, o1 = {0,0,d1}, o2 = {r2 c1 c2, r2 c2 s1, d1 + r2 s2}, oc = {c1 (r2 c2 + r3 c23), s1 (r2 c2 + r3 c23), d1 + r2 s2 + r3 s23}, joint-2/3 axis z1 = {s1, −c1, 0} | where the arm and the ellipsoid are drawn | v0.1.16 | unit "o1, o2, oc and z1 at the saved state (oc = (-0.221153, 0.729045, 2.690501))"; unit "JvRRRanthro equals the numerical derivative of oc (central differences, 200 random grid configurations)"; harness "H-ME-01" |
| F-ME-06 | `{U, Σfull, V} = SingularValueDecomposition[N[JvRRRanthro[θ1, θ2, θ3, r2, r3]]]` — singular values ≤ 100·10^-p·σ1 (≈ 1.1e-14 relative) are returned as 0 (Wolfram documentation, COMMON-DECISIONS §4), so μ is exactly 0. at singular configurations (K-ME-01; port: `svd3(J, {zeroTol: 100 * 2 ** -53})`, COMMON-DECISIONS §5) —, `Σ = Σfull/1`; label `Text@Style["Manipulability μ = ", FontSize->18]` above `Text@Style[Row[{EngineeringForm[Det[Σfull]], Invisible["9"^"9"]}], FontSize->18]` (Q-ME-09, K-ME-04) | the manipulability measure (UC-ME-01) | v0.1.16 | unit "det J = -(cos θ2 + cos(θ2+θ3)) sin θ3 (Details formula with r2 = r3 = 1)"; unit "Det of the diagonal Σfull equals the product of the singular values (bit-exact Det of shared/mma-exact.js)"; unit "EngineeringForm display: 0.6718917 gives 671.892×10^-3, 1.2071068 gives 1.20711, 0.5 gives 500.×10^-3, 0 gives 0."; unit "SVD tolerance: singular values at most 100·10^-p·σ1 (1.1e-14 relative) are set to 0, so μ reads 0. at every singular grid configuration"; golden "manipulability ellipsoid: μ of the snapshot Settings reads 671.892×10^-3, 1.20711, 1.20711, 1.20711"; golden "manipulability ellipsoid: snapshot 1 shows a full ellipsoid with three arrow pairs and rings and the label 671.892×10^-3"; harness "H-ME-01"; harness "H-ME-06"; harness "H-ME-14" |
| F-ME-07 | Ellipsoid block (identical to robot-singularities' `manipEllip` except the scale; port `manipEllip(J, oc, {scale: 1, zeroTol: 100 * 2 ** -53})`): `GeometricTransformation[{Arrowheads[.02], If[Σ11 > 0.1, {Blue, Arrow[{o0, Σ[[1]]}], Arrow[{o0, -Σ[[1]]}], Blue, <unit circle>·DiagonalMatrix[{Σ11, Σ22, 1}]}], If[Σ22 > 0.1, {Red, …, Red, <unit circle>·DiagonalMatrix[{1, Σ22, Σ33}].RotationMatrix[π/2, {0,1,0}]}], If[Σ33 > 0.1, {Green, …, Darker[Green], <unit circle>·DiagonalMatrix[{Σ11, 1, Σ33}].RotationMatrix[π/2, {1,0,0}]}], If[MatrixRank[Σ] > 2, {Opacity[0.5], LightBlue, Ellipsoid[{0,0,0}, Σ^2]}]}, {U, oc}]` (Q-ME-08) | see the velocity ellipsoid collapse (UC-ME-02, UC-ME-03) | v0.1.16 | unit "manipEllip with scale 1: arrows ±σi along the columns of U, rings, ellipsoid semi-axes σi at oc (saved state σ = 1.248191, 0.761850, 0.706560)"; unit "rank 1 at (π/4, π/2, 0): only the blue arrows and the degenerate blue ring are drawn"; unit "JvRRRanthro at zero is {{0,0,0},{2,0,0},{0,2,1}} with singular values √5, 2, 0"; e2e "θ3 = π (a press at the left of the θ3 dial) folds the arm and leaves only the blue arrows and ring"; golden "manipulability ellipsoid: snapshots 2-4 show flat full-rank ellipsoids and a full blue circle at θ2 = 0"; harness "H-ME-05"; harness "H-ME-08" |
| F-ME-08 | Exact angles: in the original the table points, θi (exact `ArcTan`) and J before `N` are exact multiples of π/32, so symbolic cancellations (Cos[5π/8] = −Cos[3π/8], Sin[θ2 + π] = −Sin[θ2]) give exact zero entries of J. The port keeps every angle as an integer k (θ = kπ/32) and evaluates Cos/Sin through Mathematica's automatic reduction to the first octant (`shared/exact-pi.js`), so the same entries are exactly 0 (D-ME-06). Machine angles are also accepted (snapshots 2 and 3 were made with an earlier continuous dial and hold machine θ1 and p1): then θ = `arcTan` of p (bit-exact, shared/mma-exact.js) and Math.cos/sin | the rank decisions and μ at singular configurations (UC-ME-02) | v0.1.16 | unit "octant table of shared/exact-pi.js: cos 19π/32 is the double of -sin 3π/32 and cos π/4 = sin π/4 = 0.7071067811865475 (bits provisional until H-ME-12)"; unit "machine dial values: θ = ArcTan[p] bit-exact and the prev comparison tolerant (one ulp counts as equal)"; golden "manipulability ellipsoid: snapshots 2 and 3 have machine θ1 = ArcTan of their normalised p1, bit for bit (1.1311921798353952, 0.8929626109272769)"; unit "exact zero columns at θ2 + θ3/2 = π/2 (rank 2) and at θ3 = π (two zero columns, rank 1): the zero singular values are exactly 0 and no ellipsoid is drawn"; unit "θ3 = 0 gives exactly proportional columns 2 and 3, the SVD tolerance sets σ3 to 0 and the rank is 2"; unit "rank scan: all 12032 exactly singular configurations of the π/32 grid have rank at most 2 and all others rank 3"; harness "H-ME-05"; harness "H-ME-06"; harness "H-ME-07"; harness "H-ME-12" |
| F-ME-09 | Opening state = the live state (DynamicModule, raw line 1673) = the initial settings (output cell's `"Variables"`, raw line 1715) = snapshot 1's Settings (line 5000); the port opens in it and its "Initial settings" restores the stored `"Variables"` (A-ME-01): θ1 = θ1prev = 19π/32, θ2 = θ2prev = 9π/16, θ3 = θ3prev = −21π/32, p1 = {−Sin[3π/32], Cos[3π/32]}, p2 = {−Sin[π/16], Cos[π/16]}, p3 = {−Sin[5π/32], −Cos[5π/32]} (μ = 0.671892, snapshot 1); these are also the initial values of the stored Specifications (N-ME-03) | the original's opening picture | v0.1.16 | golden "manipulability ellipsoid: the live state (= the initial settings) is the opening state of the port"; golden "manipulability ellipsoid: the four snapshot Settings are fixed points of one evaluation (snapshot 3 keeps θ1prev one ulp below θ1)"; harness "H-ME-01" |

### 4.3 Graphics (three.js workspace, SVG dials)

| ID | Feature | Reason | Since | Verified by |
|----|---------|--------|-------|-------------|
| F-ME-10 | Robot drawing after the ellipsoid, under `Gray, EdgeForm[Black], Arrowheads[.02]`: red base `Cylinder[{o0, o1/4}, 3w]`; gray shaft `Cylinder[{o0, o1}, w]`; `{Thick, Red, splineCircle[o0, 1, {0, θ1}], Point[{Cos θ1, Sin θ1, 0}], PointSize[Medium], Point[at θ1 − .05 Sign[θ1]], PointSize[Large], Point[at θ1 − .12 Sign[θ1]]}` on the floor; gray links `Cylinder[{o1, o2}, w]`, `Cylinder[{o2, oc}, w]`; blue `Cylinder[{o1 − z1/4, o1 + z1/4}, 2w]`; green `Cylinder[{o2 − z1/4, o2 + z1/4}, 2w]`; `{Thick, Blue, splineCircle[o0, 1/2, {0, θ2}]}` and `{Thick, Green, splineCircle[o0, 1/2, {θ2, θ2 + θ3}]}` turned into the arm's vertical plane by `{RotationMatrix[θ1, {0,0,1}].RotationMatrix[π/2, {1,0,0}], o1}` (resp. `o2`) (Q-ME-01, Q-ME-02, Q-ME-05); `splineCircle` drawn as a sampled arc (D-ME-04, D-ME-12) | the arm and its joint angles | v0.1.16 | unit "robot drawing: base cylinder radius 3/8 to z = 1/2, shaft radius 1/8 to z = 2, joint cylinders radius 1/4 along z1, floor points at θ1, θ1 - .05 Sign θ1, θ1 - .12 Sign θ1"; unit "splineCircle arcs: equal start and end draw a full circle, a negative sweep goes the long way (θ3 = -21π/32 gives 43π/32)"; e2e "loads without errors and draws the robot, the ellipsoid and three dials"; harness "H-ME-10"; harness "H-ME-13"; M-ME-02; M-ME-05 |
| F-ME-11 | Graphics3D options: `SphericalRegion->True, PlotRange->{{-3.5,3.5},{-4,4},{-1,5}}, ImageSize->{440,420}, ViewAngle->18Degree, Boxed->False`; default ViewPoint {1.3, −2.4, 2} and default Lighting; everything outside the PlotRange is clipped: on the dial grid only the ellipsoid passes it, by at most 0.0138 — the top passes z = 5 in 768 configurations (e.g. θ = (61, 23, 3)·π/32: 5.01384) and the bottom passes z = −1 in another 768 (e.g. (10, −23, −3)·π/32: −1.01384); x and y never (D-ME-01) | the original's picture | v0.1.16 | e2e "the workspace is clipped at the plot range (clipping planes x = ±3.5, y = ±4, z = -1 and 5)"; golden "manipulability ellipsoid: framing of snapshot 1, base cylinder 72 px wide at 2 px per pt (camera model 71.1 px)"; harness "H-ME-09"; harness "H-ME-15"; M-ME-02; M-ME-06 |
| F-ME-12 | Layout: `Column[{"Manipulability μ =", μ, Graphics3D}, Center]` to the right of the dials | the original's layout | v0.1.16 | e2e "has the controls of the original with their saved values (μ = 671.892×10^-3)"; M-ME-02 |
| F-ME-13 | The workspace can be rotated with the mouse (Graphics3D default) | look at the ellipsoid from all sides (UC-ME-03) | v0.1.16 | e2e "dragging in the workspace picture rotates the view"; M-ME-08 |
| F-ME-14 | Title, caption and Details & Citations text of the original (J, the determinant, the two references) | explains the Demonstration | v0.1.16 | M-ME-01 |

### 4.4 Port additions

| ID | Feature | Reason | Since | Verified by |
|----|---------|--------|-------|-------------|
| A-ME-01 | "Initial settings" button: back to the opening state (the saved state, F-ME-09) | stands in for the Manipulate ⊕ menu → Initial Settings | v0.1.16 | e2e "Initial settings restores the opening state" |
| A-ME-02 | Arrow keys on a focused dial locator turn it by one table step (Right/Up = +π/32, Left/Down = −π/32; Shift = π/8); each key press is one update (`dial-control.js` option `keyStep: 'grid'`, COMMON-DECISIONS §5) | keyboard access (a plain x/y key step would be undone by the snapping) | v0.1.16 | e2e "arrow keys on a focused dial step by π/32 (port addition)" |
| A-ME-03 | `window.__demo` automation hook (getState, setState, μ text, SVD, joint points, ellipsoid summary, primitives, clipping planes and their coverage, dial angles and dial-to-page coordinates, ink, camera position) | automated tests | v0.1.16 | e2e "loads without errors and draws the robot, the ellipsoid and three dials" |
| A-ME-04 | "All demos" link | site navigation | v0.1.16 | inventory; M-GEN-01 |
| A-ME-05 | Credit footer: original title, authors, licence, adaptation notice | required by CC BY-NC-SA 3.0 | v0.1.16 | e2e "attribution on" |
| A-ME-06 | Start-up notice (watchdog, `<noscript>`) and WebGL 2 notice when the page cannot start (DEC-22) | a clear message instead of an empty page | v0.1.16 | e2e "start-up notice when"; e2e "WebGL 2 notice on" |
| A-ME-07 | standalone bundle (owner rule R-A): `npm run bundle -- manipulability-ellipsoid` builds `dist/manipulability-ellipsoid/` with exactly the files the app imports, the licences, a generated README and a root `index.html` (§6, "Building and deploying this app alone") | anyone can host this one app elsewhere without the rest of the site (owner rule R-A, 2026-10-17) | v0.1.16 | e2e "bundle: manipulability-ellipsoid runs from its own folder"; unit "bundle contents listed in DESIGN.md match the collector" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document". The μ label
(`mu-label`, F-ME-06) and the dial containers (`dial-p*`) are not interactive and therefore not listed (the draft
listed `mu-label`; the inventory test collects only interactive elements).

| data-testid | Feature |
|-------------|---------|
| `locator-p*` | F-ME-01, F-ME-02, A-ME-02 |
| `scene-canvas-workspace` | F-ME-11, F-ME-13 |
| `reset` | A-ME-01 |
| `crumbs` | A-ME-04 |
| `details` | F-ME-14 |
| `credits` | A-ME-05 |

## 6. Design

### 6.1 Files and responsibilities

- `model.js` (pure, Node-testable): constants `w = 1/8, r1 = 1, r2 = 1, r3 = 1, d1 = 2`; the angle encodings (§6.3:
  `angleValue`, `cosA`, `sinA`, `addA`, `unequalA`, `pointOfAngle`, `angleOfPoint`, `pointXY`, `wrapK`);
  `updateAngles(state)` (the prev tests, the three ArcTan lines, the 2π shift of θ1); `trig`, `JvRRRanthro(angles)`,
  `points(angles)` (o0, o1, o2, oc, z1); `manipulability(J)` (`svd3(J, {zeroTol: 100 * 2 ** -53})`, rank, μ = `det` of
  the diagonal Σfull); `muText` (`engineeringForm`); `splineArcAngles` and `splineCircle(m, r, angles)` (a sampled `Line`,
  D-ME-12); `armPlaneRotation(θ1)`; `robotContent(angles, points)` (Graphics3D data, `shared/graphics3d.js`);
  `evaluate(state)` = one evaluation of the body (order in 6.3; the ellipsoid by `manipEllip(J, oc, {scale: 1, zeroTol:
  100 * 2 ** -53})` of `demos/common/svd3.js`, then the robot); `settle(state)` = evaluations until no variable changes
  (D-ME-10); `ellipsoidSummary(view)`; `initialState()` (= live state = initial settings), `SOURCE_DEFAULTS` (the Input
  cell's values, for the tests).
- Dials: `demos/common/dial-control.js` (owner two-link-kinematics; no app-level dial file) with the options
  `{imageSize: 'automatic', setter: 'nearest32', arc: 'myArrowArc2', keyStep: 'grid', labels: 'stacked'}`: the
  Nearest-π/32 setter over `Table[{Cos@a, Sin@a}, {a, -π, π, π/32}]` (exact table points from `shared/exact-pi.js`,
  `nearest` of shared/mma-extra.js, ties per K-ME-05), hand `makeHand[7, 7/3, .1, .3]` in the dial colour with black
  edge, ticks and π labels (`piFraction` of `shared/mma-text.js`), the arrow arc `myArrowArc2` of
  `demos/common/arrow-arcs.js` (always an Arrow, Q-ME-03), automatic image size (180 px, F-ME-01), LocatorPane picking
  via `shared/svg-plot.js` `addLocators` (`pickAnywhere: true`), and `keyStep: 'grid'` (A-ME-02). A dial's `onInput`
  stores the index m of the snapped table point (−32 stored as 32, the same point {−1, 0}).
- `main.js` (browser, v0.1.21) is one `Manipulate({…})` call of `shared/manipulate.js`: three dials as `Control`s
  on the paths `m.0`, `m.1`, `m.2` (the dial shows the point of m[i]; `Assign` stores the snapped table index), the
  μ label (HTML, 18 px, mantissa and superscript exponent; `data-text` holds the plain EngineeringForm text, D-ME-09)
  in `after`, `merge` = the hook's setState rule. The body runs `settle` (D-ME-10) and returns the model's graphic
  with the port's default `PointSize` (D-ME-03) and its own options; `View3D` (`shared/graphics3d-view.js`) makes the
  non-square viewer from them (box = PlotRange, viewPoint {1.3, −2.4, 2}, ViewAngle 18°, ImageSize {440, 420}; fixed
  camera), `addMathematicaLighting` of `shared/mma-lighting.js` + `LinearSRGBColorSpace` (as robot-singularities),
  `localClippingEnabled` and six clipping planes at the PlotRange (`clipOrder: 'max-first'`), points with the image
  width as size (`pointLength: 'ImageWidth'`), everything else with the box diagonal (D-ME-03); without WebGL 2 the
  picture is left out (`webgl2Fallback`); the automation hook.

### 6.2 Reuse, line by line against robot-singularities (RS)

| Original code here | RS original | RS port code | Verdict for this app |
|--------------------|-------------|--------------|----------------------|
| `splineCircle[m_List, r_, angles_List: {0, 2π}]` (Initialization) | identical definition | `g3d.js` `UnitCircle()` (only the full unit circle, sampled 129 points) | identical code; this app also needs ARCS `{0, θ1}`, `{0, θ2}`, `{θ2, θ2+θ3}` with the `Mod[angles//N, 2π]`, `If[end <= start, end += 2π]` logic → `splineCircle(m, r, angles)` in this app's `model.js`, a sampled `Line` primitive (Q-ME-01, Q-ME-02; `shared/graphics3d.js` has no `SplineArc`, D-ME-12) |
| `{U, Σfull, V} = SingularValueDecomposition[N[J]]` | identical | `svd3.js` `svd3` | shared (`demos/common/svd3.js`) with its `zeroTol` option (COMMON-DECISIONS §5, documented by dh-parameters): this app passes `100 * 2 ** -53`, the documented tolerance 100·10^-p·σ1 (K-ME-01); the default 0 keeps RS unchanged |
| `MatrixRank[Σ] > 2` | identical (`MatrixRank[Σfull]`) | `svd3.js` `matrixRank` (3 eps relative, K-RS-05) | shared unchanged |
| ellipsoid `GeometricTransformation[{Arrowheads[.02], If[…>0.1, …] ×3, If[MatrixRank…, Ellipsoid[{0,0,0}, Σ^2]]}, {U, oc}]` | identical text, but `Σfull = Σfull/2` and translation `o3coords[params]`; here `Σ = Σfull/1` (separate variable) and translation `oc` | `svd3.js` `manipEllip(J, o3)` (halves inside) | `manipEllip(J, c, {scale = 1/2, zeroTol = 0})` (COMMON-DECISIONS §3, §5; here `scale: 1`, `zeroTol: 100 * 2 ** -53`); colours Blue/Red/Green/Darker[Green], LightBlue at Opacity 0.5, thresholds and rotations identical |
| `JvRRRanthro` (closed form, r2, r3 parameters) | `myJacob` iType 2 "elbow robot arm" (same matrix written with 2 Cos[q2 + q3/2] Cos[q3/2]) | `robots.js` `myJacob(2, …)` | mathematically equal (N-ME-02), textually different → own transcription in `model.js` (different rounding and exact zeros) |
| o0 … oc, z1 closed form | `o3coords` from the DH chain | `robots.js` `makeO3coords` | not shared (no DH chain here) |
| robot: Cylinders, thick arcs, Points with PointSize[Medium/Large], `EdgeForm[Black]` | `drawJoint`, `drawCoordAxes`, `drawWristCenter` | `model.js` | new (colours: red base, blue and green joints, gray links) |
| three dial controls (LocatorPane) | popup + slider grid | `main.js` | `demos/common/dial-control.js` + `arrow-arcs.js` (owner two-link-kinematics), not in this app |
| Graphics3D options `PlotRange` fixed, `ViewAngle->18Degree`, `ImageSize->{440,420}` | workspace: no PlotRange, automatic ViewAngle, `ImageSize->325` | `main.js` `View3D` SphericalRegion fit (bounding sphere × 1.26) | different framing (D-ME-01): fixed box, fixed angle, non-square image, clipping |
| `Det[Σfull]`, `EngineeringForm` | — | — | `det` of shared/mma-exact.js, `engineeringForm` of shared/mma-extra.js (COMMON-DECISIONS §3) |
| exact angles (multiples of π/32) | machine slider values (−1.01π + k·0.01π) | `robots.js` `cosSinConst` for table constants only | `shared/exact-pi.js` (MIT, octant reduction; owner: this app, present since the v0.1.15 foundation, used unchanged); `dhTransform` keeps its machine path |
| directives, scoping, `GeometricTransformation[g, {m, v}]`, Show, flatten, primitiveBounds | same language | `g3d.js` | shared (`shared/graphics3d.js`, unchanged): `EdgeForm` (added by dh-parameters); `PointSize[Medium]`/`PointSize[Large]` passed as the numbers 0.01 / 0.013 (D-ME-03); the arcs by this app's `splineCircle` (D-ME-12); the arm-plane rotation `RotationMatrix[θ1, {0,0,1}].RotationMatrix[π/2, {1,0,0}]` built in `model.js` from the exact trig of θ1 (`rotationMatrix` stays on Math.cos/sin) |
| three.js conversion (`addPrims`, cylinders with rims, arrows as line + cone, ellipsoid, translucent double-sided), lighting, colour space | same | `main.js` (not exported) | `shared/graphics3d-three.js` (`addPrims`, `disposeGroup(groups)`, `fitViewer(viewer, vp)`); clipping planes passed through `addPrims`' context as RS's phase space does |

Moving RS code into `demos/common/` (g3d.js, svd3.js, dh-chain.js, robot-draw.js, g3d-three.js) is owned by
"Denavit–Hartenberg Parameters for a Three-Link Robot", whose design §6 holds the move plan and its conditions (RS keeps
re-export shims, RS's suite gates the move). This app uses g3d.js, svd3.js and g3d-three.js only. (Since v0.1.21 `g3d.js` and `g3d-three.js` are the MIT modules `shared/graphics3d.js` and `shared/graphics3d-three.js`, the generic SVD is `shared/svd3.js`, and the page draws through `shared/graphics3d-view.js` `View3D`; this table records the v0.1.16 move.) Of the other users,
"Robot Manipulator Workspaces" shares RS's `drawJoint` and `drawWristCenter`; the DH and Arm-Configurations
Demonstrations have their own `drawJoint` variants and share `drawGripper`.

### 6.3 State model and evaluation order

State (the Manipulate variables): `{k: [θ1, θ2, θ3], kprev: [θ1prev, θ2prev, θ3prev], m: [p1, p2, p3]}`. An exact angle
is an integer k (θ = kπ/32), a machine angle `{r: radians}`; a dial point is an integer m (the exact table point
{Cos[mπ/32], Sin[mπ/32]}, −31 … 32) or `{p: [x, y]}` (machine numbers). The machine forms occur only in replayed
Settings (snapshots 2 and 3, K-ME-08) and harness inputs; the dials produce exact points. One evaluation of the body,
in the original's order:

1. for i = 1, 2, 3: if `kiprev != ki` (tolerant Unequal, `mUnequal` of shared/mma.js, for machine values) then `p_i = {Cos θi, Sin θi}` (mi = ki reduced to −31 … 32) and `kiprev = ki`;
2. `ki = ArcTan[p_i]` (= mi reduced to −31 … 32, i.e. (−π, π]; exact, like Mathematica's exact ArcTan of the table
   points); `If[θ1 < 0, θ1 += 2π]` (k1 += 64);
3. o0, o1, o2, oc, z1 and `J = JvRRRanthro` from `shared/exact-pi.js` values (F-ME-08);
4. `svd3(J, {zeroTol: 100 * 2 ** -53})` → U, Σfull (descending; singular values ≤ 100·10^-p·σ1 set to 0), V; Σ = Σfull/1; `rank = matrixRank(Σ)`;
   μ = `det(diag(Σfull))` (shared/mma-exact.js);
5. graphics: ellipsoid block (F-ME-07) then robot (F-ME-10), as data.

In the original the Text with `Det[Σfull]` is evaluated before the SVD (which sits inside the Graphics3D list); the
snapshots show the current μ, so the evaluator's re-evaluation of the Column after Σfull was set is relied on (it may
emit a `Det::matsq` message on every update, K-ME-04);
the port computes the SVD first. A dial move sets `m_i`; then `settle` evaluates the body until no variable changes —
normally three evaluations: the first sets θi from the new point, the second brings the stale θiprev up to date
(Q-ME-06), the third changes nothing. The front end does the same, because the body's own assignments to the
Manipulate variables trigger it again; with a single evaluation per change the next dial move would be undone (the
stale θiprev would put p_i back to the old angle; D-ME-10).

### 6.4 Numerics

- Trig of kπ/32 (`shared/exact-pi.js`, MIT): reduce k mod 64 to the first octant like Mathematica's automatic rules (Cos[19π/32]
  → −Sin[3π/32], Cos[3π/8] → Sin[π/8]); base values j = 0 … 8: j = 0 → (1, 0), j = 4 → `Math.cos/sin(π/8)`
  (Mathematica keeps Cos[π/8], Sin[π/8] unevaluated and N gives 0.3826834323650898, not the machine radical
  ½√(2−√2) = …897: H-ME-04, H-ME-12; harness run 2), j = 8 → 1/√2 = 0.7071067811865475 (as cached in the
  motion-planning original, `shared/mma.js` REF[45]), others `Math.cos/sin(jπ/32)`. Bit agreement with Mathematica's `N`
  is confirmed by the harness (H-ME-12: all 33 table points bit for bit, K-ME-02); exact cancellation does not depend on it. Plain `Math.cos(19π/32)` differs from
  −sin(3π/32) by 7 ulp, so plain trig would not reproduce the saved p-values or the exact zeros.
- SVD: one-sided Jacobi (`svd3`); no ties between non-zero singular values occur on the π/32 grid (scan of all 262144
  dial configurations), so D-RS-09 does not arise; signs and null-space bases do not change the picture (D-ME-05).
- Zero tolerance and rank: singular values ≤ 100·10^-p·σ1 (≈ 1.1e-14 relative, the documented SingularValueDecomposition
  tolerance) become 0, then `matrixRank` (3 eps relative). On the grid the exactly singular configurations have σ3/σ1 ≤
  7.9e-17 with the octant table (5.6e-16 with plain Math.cos) and all others ≥ 0.0048, so both rules agree (K-ME-03).
- μ text: `engineeringForm(x)` — 6 significant digits, exponent a multiple of 3 shown as "×10^e" (superscript), trailing
  "." for a whole mantissa ("500.×10^-3"), "0." for zero (formats confirmed by H-ME-14).

### 6.5 Building and deploying this app alone

Owner rule R-A (2026-10-17): this one app can be taken out of the repository and hosted anywhere. One command builds it:

```
npm run bundle -- manipulability-ellipsoid
```

`tools/bundle-app.mjs manipulability-ellipsoid` (npm script `bundle`) writes `dist/manipulability-ellipsoid/`: the app with exactly the files it needs — its HTML, its modules and everything they import, recursively, with the repository's relative layout kept — plus the licence texts that apply, a generated `README.md` (title, the original's credits, licence, "serve this folder with any static web server", how to run its tests in the full repository) and a root `index.html` that opens the app (the "All demos" link of the bundled page leads to that root page). Nothing else. Contents (generated with `npm run bundle -- --update-docs`; unit "bundle contents listed in DESIGN.md match the collector" keeps the table current):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/manipulability-ellipsoid/`) | 3 | `index.html`, `main.js`, `model.js` |
| `shared/` | 24 | `clock.js`, `exact-pi.js`, `graphics-extras.js`, `graphics.js`, `graphics3d-three.js`, `graphics3d-view.js`, `graphics3d.js`, `manipulate.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `mma-lighting.js`, `mma-text.js`, `mma.js`, `random.js`, `requirements.js`, `style.css`, `svd3.js`, `svg-frame.js`, `svg-plot.js`, `three-helpers.js`, `ui-extra.js`, `ui-interval.js`, `ui.js` |
| `demos/common/` | 4 | `arrow-arcs.js`, `dial-control.js`, `prm-core.js`, `svd3.js` |
| `vendor/three/` | 9 | `addons/controls/OrbitControls.js`, `addons/lines/Line2.js`, `addons/lines/LineGeometry.js`, `addons/lines/LineMaterial.js`, `addons/lines/LineSegments2.js`, `addons/lines/LineSegmentsGeometry.js`, `addons/renderers/CSS2DRenderer.js`, `three.core.js`, `three.module.js` |
| added by the bundler | 8 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/manipulability-ellipsoid/DESIGN.md`, `vendor/three/LICENSE` |
<!-- bundle-contents:end -->

Licences: `LICENSES/CC-BY-NC-SA-3.0.txt` (this app and every `demos/…` module: derived from Wolfram Demonstration code); `LICENSES/MIT.txt` (the `shared/…` modules); `vendor/three/LICENSE` (three.js r186, MIT).

Requirements: WebGL 2 (three.js r186; `shared/requirements.js` shows the WebGL 2 notice without it) and ES modules with import maps (current Firefox, Chromium, WebKit).

Verified by e2e "bundle: manipulability-ellipsoid runs from its own folder" (A-ME-07): the test runs the bundle command, serves `dist/manipulability-ellipsoid/` alone with a static file server (no access to the rest of the repository), opens the root `index.html`, follows it to the app and checks: no console error, no failed request, every request stays inside the folder and every script and stylesheet of the bundle is loaded.

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

| ID | Kind | Description |
|----|------|-------------|
| Q-ME-01 | quirk kept | `splineCircle` draws a FULL circle when start and end coincide after `Mod[…, 2π]` (`If[end <= start, end += 2π]`): θ1 = 0 gives a full red floor circle, θ2 = 0 a full blue circle (snapshots 2–4), θ3 = 0 a full green circle. |
| Q-ME-02 | quirk kept | A negative sweep is drawn the long way round: `splineCircle[o0, 1/2, {0, θ2}]` with θ2 < 0 and `{θ2, θ2 + θ3}` with θ3 < 0 become counter-clockwise arcs of 2π + θ2 resp. 2π + θ3 (saved state: θ3 = −21π/32 gives a green arc of 43π/32). |
| Q-ME-03 | quirk kept | `myArrowArc2[c, r, {start, end}]` tests `start === end`, but `end` is `ang = Dynamic[ArcTan[…]]`, never SameQ to 0, so the Point branch is never used: the dial's arc is always an Arrow over a 12-point BSplineCurve (Table with the symbolic step (end − start)/11), also when ang = 0 (degenerate arrow, K-ME-06). |
| Q-ME-04 | quirk kept | θ1 is kept in [0, 2π) while θ2 and θ3 stay in (−π, π] (their `+2π` lines are commented out); the dials show ArcTan in (−π, π] for all three, so the θ1 dial and the red floor arc can disagree in sign (snapshot 4: θ1 = 59π/32, dial −5π/32, floor arc 59π/32). |
| Q-ME-05 | quirk kept | The three floor points sit at θ1, θ1 − .05 Sign[θ1], θ1 − .12 Sign[θ1]; at θ1 = 0 Sign is 0 and they coincide at (1, 0, 0). |
| Q-ME-06 | quirk kept | After a dial move θi is updated at once but θiprev only at the next evaluation; no visible effect (p_i is re-set to the same exact point). |
| Q-ME-07 | quirk kept | The hidden variables' ranges (θ2: −π/4 … 5π/4, θ3: −3π/4 … 3π/4) do not limit the dials: the dials reach any multiple of π/32, e.g. θ3 = π. |
| Q-ME-08 | quirk kept | Arrows and rings are drawn for Σii > 0.1 independently of the rank test (as Q-RS-08); a singular value of 0 leaves a flat ring (rank 2) or a line-like ring (rank 1); the filled ellipsoid appears only at MatrixRank 3. No grid configuration has a singular value within 1e-9 of 0.1. |
| Q-ME-09 | quirk kept | μ is printed with `EngineeringForm` (exponent a multiple of 3): 0.671892 reads "671.892×10^-3" (snapshot 1). |
| Q-ME-10 | quirk kept | Dead/unused code kept out of the picture as in the original: `r1 = 1` is never used, the floor `Cuboid` is commented out; `myArrowArc` (with `==`) is in the Input cell only, not in the stored Initialization. |
| D-ME-01 | deviation | Framing: camera at the PlotRange centre (0, 0, 2) + ViewPoint × longest side (8), vertical field of view 18° over the image height 420, image 440 × 420 (non-square: the new non-square `createViewer` of `shared/three-helpers.js`, owned by this app; the two rotation demos keep the square one). This model fits snapshot 1 (2 px per pt): red base cylinder 72 px wide vs 71.1 px computed (and the ground disc of "Common Robot Arm Configurations" to 0.4 %). Remaining differences: placement within the image, SphericalRegion's effect when rotating. |
| D-ME-02 | deviation | Colours and lighting as D-RS-02: `shared/mma-lighting.js` (documented default lights) and `LinearSRGBColorSpace`. |
| D-ME-03 | deviation | Sizes as D-RS-03: `Thick` = 3 px, default lines 1 px, `Arrowheads[.02]` as a fraction of the PlotRange box diagonal, arrowhead cone approximate; `PointSize[Medium]` and `PointSize[Large]` as 0.01 and 0.013 of the image width (shared/svg-plot.js POINT_SIZE), the default point size 0.008 (port choice; all to be compared, M-ME-05) — "image width" taken as the width the 440-px image shows at the PlotRange centre (9.15 units); the point markers carry no clipping planes (they lie on the floor circle, inside the plot range); `EdgeForm[Black]` cylinder rims as 1 px black lines. |
| D-ME-04 | deviation | `splineCircle` (an exact rational quadratic B-spline circle) is drawn as a sampled arc; the dial's `BSplineCurve` (degree 3, clamped) is evaluated to a polyline by `bsplineCurve` of `demos/common/arrow-arcs.js`; dial `Circle`, ticks and texts in SVG. |
| D-ME-05 | deviation | SVD by one-sided Jacobi instead of LAPACK: singular-vector signs may differ (invisible: arrows go both ways, rings and ellipsoid are symmetric); in rank-deficient cases the null-space basis differs (invisible: the corresponding arrows/rings are below 0.1 and not drawn, and the degenerate rings lie in the span of the non-null columns). |
| D-ME-06 | deviation | Exact arithmetic emulated: integer angles and the octant table give the original's exact zeros; non-zero entries may differ from Mathematica's `N` of the exact expressions in the last bits (K-ME-02). |
| D-ME-07 | deviation | Dial look: SVG by `demos/common/dial-control.js`; the stored code draws the labels as the other dials do (`Text[θ, …]` with exact θ: stacked fractions), so the dials use `labels: 'stacked'` (`piFraction` of `shared/mma-text.js`, COMMON-DECISIONS §6); font approximate, locator glyph from shared/svg-plot.js; image size ≈ 180 pt as measured (F-ME-01). |
| D-ME-08 | deviation | Rotation with OrbitControls (z stays vertical), kept when a dial moves (as D-RS-07, K-ME-07). |
| D-ME-09 | deviation | The μ label is HTML text (18 px) above the canvas; the `Invisible["9"^"9"]` spacer is replaced by a fixed line height with room for the exponent. |
| D-ME-10 | deviation | Update rate: a dial update (at most one per animation frame while dragging, one per key press) runs `settle`: evaluations of the body until no variable changes (normally three); Mathematica's front end decides its own update rate (as D-CP-02); the final picture is the same. Decided at implementation, differing from the draft's "one evaluation per change": with one evaluation the stale θiprev of the previous move puts p_i back at the next move (the second arrow key or the second drag step was undone in the first browser run), while the front end re-evaluates the body after its own assignments to θi; the harness keeps "one evaluation per `set` step" (COMMON-DECISIONS §2) and so does `evaluate`. |
| D-ME-11 | deviation | Translucent ellipsoid drawn double-sided and sorted per object (as D-RS-08). |
| D-ME-12 | deviation | `splineCircle` lives in this app's `model.js` (a `Line` of points m + r{Cos t, Sin t, 0}, at most 2π/128 apart, after the original's `Mod`/`If` angle logic) instead of the draft's `SplineArc` primitive in `shared/graphics3d.js`: the DH-family owner did not add `SplineArc` (no other user) and the module is not this app's to change. The picture is the same as with a g3d primitive (D-ME-04). |
| K-ME-01 | known issue (lead) — **resolved** (harness run 2) | μ at exactly singular dial positions. A raw LAPACK SVD leaves a tiny σ3 in 3840 of the 12032 singular grid configurations (NumPy; e.g. θ = (0, π/4, 0): σ3 = 8.8e-17, μ = 2.79e-16 → "279.442×10^-18"), but SingularValueDecomposition's documented Tolerance sets singular values ≤ 100·10^-p·σ1 (≈ 1.1e-14 relative) to 0 (COMMON-DECISIONS §4). The port applies that rule (`zeroTol` of `svd3`/`manipEllip`, COMMON-DECISIONS §5), so the label reads "0." at every singular configuration. To be confirmed by H-ME-05 … H-ME-08 (Σfull and the μ text). Confirmed by H-ME-05 … H-ME-08: Σfull has exact 0. where the port has 0 (θ3 = π: σ = {0.9999999999999998, 0., 0.}, rank 1; θ3 = 0: σ3 = 0.; H-ME-07: σ3 = 0.; H-ME-08: rank 1), Det[Σfull] = 0. and the μ text "0.". |
| K-ME-02 | known issue (lead) — **resolved** (harness run 2) | Which doubles Mathematica's `N` gives for Cos/Sin of kπ/32: H-ME-12 records N[Table[{Cos[kπ/32], Sin[kπ/32]}, {k, 0, 32}]]; Cos[π/8], Sin[π/8] stay unevaluated (H-ME-04 records p1 = {Cos[Pi/8], −Sin[Pi/8]}) and N[Sin[π/8]] = 0.3826834323650898 = Math.sin(π/8), not the machine radical ½√(2−√2) = 0.3826834323650897 the port used. Port fixed in `shared/exact-pi.js` (the π/8 base uses Math.cos/Math.sin); all 33 points now agree bit for bit (golden "H-ME-12"); N[1/√2] = 0.7071067811865475 as before. |
| K-ME-03 | known issue (lead) | MatrixRank tolerance shared with K-RS-05 (extra-checks-2, K-RS-05b); on this grid the decision is safe either way (σ3 is 0 after the SVD tolerance at singular points, σ3/σ1 ≥ 0.0048 elsewhere). |
| K-ME-04 | known issue (lead) — answered for the kernel (harness run 2) | Evaluation order of `Det[Σfull]`: the Column evaluates it before the SVD inside the Graphics3D list assigns Σfull, so each update may first evaluate `Det` of an unassigned symbol (a `Det::matsq` message) before the re-evaluated Column shows the current μ (the snapshots do). H-ME-01 records `%text` and `%messages`. Messages are not shown in the port. H-ME-01: no message at all (`%messages` empty) and the `%text` after one evaluation already holds the current μ ("671.892" × SuperscriptBox["10", "-3"]), as the port shows; whether the front end's first update differs is not decidable headless. |
| K-ME-05 | known issue (lead) — **resolved** (centre H-CL-16, midpoint H-ME-11, harness runs 2 and 3) | `Nearest` ties of the dial setter `Nearest[table, #][[1]]`. Centre: Mathematica 15.0.1 (camera-lasers H-CL-16, the same table and expression) returns 11 points of the exact table, the first {−1/√2, −1/√2} (k = −24); for the machine table exactly the points at the least squared machine distance. Port (harness run 2): `dial-control.js` `nearest32` uses the squared machine distance, ties first in table order: centre → k = −24 (before: √-distance, k = −29). Midpoint: run 1's H-ME-11 was prelude-failed (`Nearest::mepcmp`: the exact point {Cos[π/64], Sin[π/64]} cannot be compared with the exact table); the TESTPLAN line is replaced (harness run 2) by `drag` steps with machine pointers, N[{Cos[π/64], Sin[π/64]}] (equal squared machine distances 0.0024090875896552147 to k = 0 and k = 1, unequal √-distances: the port picks k = 0) and {0., 0.}; harness run 3 (2026-10-18) recorded it: `Nearest` at the machine midpoint returns {1, 0} and {Cos[π/32], Sin[π/32]}, the first k = 0 — the tie goes to the first point in table order, as the port's rule says; at {0., 0.} the first point is {−1/√2, −1/√2} (k = −24), as H-CL-16. The port gives k = 0 and k = −24 (golden "H-ME-11" passes). Unreachable with a mouse in practice. |
| K-ME-06 | known issue (lead) | How Mathematica draws the degenerate dial arrow at ang = 0 (12 equal points; two-link-kinematics' Q-TK-05: a zero-length arrow's head points along +x) and the degenerate rings (rank 1: a ring with one zero semi-axis). Manual M-ME-07. |
| K-ME-07 | known issue (lead) | Whether the original keeps a mouse rotation when a dial moves (as K-RS-07). M-ME-08. |
| K-ME-08 | lead, resolved | Snapshot Settings (raw lines 7841, 10766, 14286): snapshots 2–4 have θ2 = 0, θ3 = π/4 exact; snapshot 2 has θ1 = 1.1311921798353952 with p1 = {0.42558128300629366, 0.9049202017607503}, snapshot 3 θ1 = 0.8929626109272769 (θ1prev 0.8929626109272768) with p1 = {0.6271071064982527, 0.7789330375451982} — machine numbers on the unit circle, i.e. made with an earlier continuous dial (`pt = Normalize[#]`, commented out in the source); snapshot 4 has θ1 = 59π/32 exact. The port replays them through its machine path (F-ME-08); the dial UI itself only produces π/32 points. μ does not depend on θ1 (1.20711 for all three). |
| K-ME-09 | known issue (lead) — **resolved** (harness run 2; decision reversed) | The double of an exact angle kπ/32 (θi, θiprev, the bookkeeping `Unequal` against a machine angle, θ2 + θ3 with one machine term): Mathematica's N[kπ/32] is (k/32)·N[π] with one rounding of the product, NOT the correctly rounded kπ/32 the review of v0.1.16 chose: H-ME-01 records N[19π/32] = 1.8653206380689396 (correctly rounded …398), H-ME-04 N[15π/8] = 5.890486225480862 (…8625), also −11π/32 and 31π/32 in the camera-lasers records (all 26 exact multiples of π in this run's records agree with (k/den)·Math.PI). Port: `angleValue` = (k/32)·π (equal to k·Math.PI/32, den a power of two); θ2 + θ3 of two exact angles as N[(k2 + k3)π/32]. `piFrac` stays in `shared/exact-pi.js` (correctly rounded value, documented as not Mathematica's N). The snapshot fixture's "n" values from tools/extract_state.py are correctly rounded and can differ from N in the last bit for these angles. |
| K-ME-10 | known issue (lead) | `Plus` order of `oc`'s z `d1 + r2 s2 + r3 s23` (d1 = 2 exact): the port adds the machine terms first, then d1 (COMMON-DECISIONS §7; o2's `d1 + r2 s2` has two terms, unchanged). For exact θ2, θ3 (every snapshot) the original's coordinates are exact expressions that Graphics3D numericizes, whose bits §7 does not settle; the harness `oc`/`o2` captures are compared to 1e-14. The e2e θ3 = π check compares oc to (0, 0, 2) within 1e-15. |
| N-ME-01 | note | Details text: the snapshot descriptions (3D, 2D, 1D ellipse) do not match the notebook's snapshots (all four have full rank: μ = 0.671892, 1.20711 ×3); the determinant is printed as "−r2 r3 (r2 c2 + r2 c23) s3" (r2 where r3 belongs; harmless at r2 = r3 = 1); "at [θ1, θ2, kπ] the Jacobian has rank 2" holds for θ3 = 0 only — at θ3 = π (folded arm, r2 = r3) the rank is 1. Grid count (262144 dial configurations): 12032 singular, of which 4224 have rank 1 (θ3 = π: 4096; θ2 = ±π/2 with θ3 = 0: 128); the smallest σ3/σ1 of a non-singular configuration is 0.0048. |
| N-ME-02 | note | `JvRRRanthro` equals RS's elbow `myJacob` mathematically (2 cos(q2 + q3/2) cos(q3/2) = c2 + c23) but is written differently; transcribed separately, compared by a unit test. |
| N-ME-03 | note | The stored Specifications of the Manipulate output cell carry the saved values (θ1 → 19π/32, …, p1 → {−Sin[3π/32], Cos[3π/32]}) as initial values, so the original's Initial Settings returns to the saved state (as K-RS-03); re-evaluating the input cell would start at θ = (0, 0, π/4) with μ = 1.20711. |
| N-ME-04 | note | `AutorunSequencing->{1,3,5}`: Autorun (⊕ menu) animates θ1, θ2, θ3 through their hidden ranges; the prev mechanism then moves the dials. Not ported (the ports have no ⊕ menu; I-ME-02); what the original's Autorun does is recorded by M-ME-09. |
| N-ME-05 | note | The stored Initialization of the output cell (raw notebook ≈ line 1940–2100, the version the published notebook runs) differs from the Input cell: its `makeDialControl` has NO `ImageSize->140` (so the dial has the automatic size, F-ME-01), `myArrowArc` is absent, and it holds a stray `Attributes[PlotRange] = {ReadProtected}`; `JvRRRanthro`, `splineCircle`, `makeHand`, `myArrowArc2` and the Body are identical. The port follows the stored version (COMMON-DECISIONS §4). |
| N-ME-06 | note | Harness run 2 (Mathematica 15.0.1): test-side reading fixed where the golden test misread the record — an exact angle π is the symbol `{"sym": "Pi"}` (H-ME-05 θ3), `%plotRange` is a list of {head, value, method, …} per graphic (H-ME-09, H-ME-15: AbsoluteOptions gives the stored {{−3.5, 3.5}, {−4, 4}, {−1, 5}}, the ellipsoid's overshoot does not widen it); the replay applies `drag` steps through the port's setter. |

## 8. Proposed changes

No open proposal. Template (see [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md)):

| ID | Status | Requested by / date | Change | Reason | Acceptance criteria |
|----|--------|---------------------|--------|--------|---------------------|

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.16 | 2026-10-18 | first implementation from the approved design draft (2026-10-12; COMMON-DECISIONS §5, §6, owner rules R-A/R-B/R-C applied 2026-10-17). Decided at implementation: `settle` after each change instead of one evaluation (D-ME-10), `splineCircle` in `model.js` (D-ME-12), the μ label not in the UI inventory (§5), point sizes relative to the image width and arrowheads to the box diagonal (D-ME-03) |
| 2 | v0.1.16 | 2026-10-18 | review fixes: K-ME-09 (exact angles as the correctly rounded N[kπ/32], `piFrac` added to `shared/exact-pi.js`), K-ME-10 (oc's z in COMMON §7 order), Q-ME-04 snapshot 4 values corrected, N-ME-04 cites M-ME-09; golden harness comparison: angles in ulps, recorded zero σ and μ exactly, μ text in full; tests take their expected values from independent sources (R-16) |
| 3 | v0.1.17 | 2026-10-18 | harness run 2: exact angles as N[kπ/32] = (k/32)·π (K-ME-09 reversed, H-ME-01/H-ME-04); π/8 table values = the recorded N[Cos[π/8]], N[Sin[π/8]] as constants (K-ME-02, H-ME-12; `shared/exact-pi.js`); the dial's nearest32 setter with the squared machine distance, centre → k = −24 (K-ME-05, H-CL-16; `dial-control.js`); K-ME-01 and K-ME-04 answered (H-ME-05 … H-ME-08, H-ME-01); H-ME-11's TESTPLAN line replaced by `drag` steps (prelude-failed in run 1; rerun pending); golden harness comparison reads `{"sym": "Pi"}` angles and `%plotRange` records as encoded (N-ME-06) |
| 4 | v0.1.18 | 2026-10-18 | harness run 3: H-ME-11 recorded and accepted; K-ME-05 resolved (ties of the dial setter: first point in table order); no change to the app |
| 5 | v0.1.19 | 2026-10-21 | version number only (shared Manipulate layer added, four apps migrated to it); no change to this app |
| 6 | v0.1.20 | 2026-10-21 | version number only (Manipulate layer extended, eleven more apps migrated to it); no change to this app |
| 7 | v0.1.21 | 2026-10-23 | `main.js` rewritten on the shared Manipulate layer with a 3D picture (`shared/manipulate.js` + `shared/graphics3d-view.js` `View3D`; Graphics3D data model and renderer moved to MIT `shared/graphics3d.js` / `shared/graphics3d-three.js`, owner decision D1); no change to behaviour or picture (all unit, golden and browser tests passing; three.js scene graph, full-page pixels (SwiftShader) and Manipulate state identical to v0.1.20 at sample settings) |
| 8 | v0.1.22 | 2026-10-25 | version number; bundle table (`shared/manipulate.js` now also loads `shared/graphics-extras.js` and `shared/svg-frame.js` for the new Graphics options `Axes`/`Frame`/`PlotLabel`); no change to this app's code, behaviour or picture (pixel parity with v0.1.21) |
| 9 | v0.1.23 | 2026-10-25 | version number; the shared code gained plot functions, a geometry kit, 3D text and tube primitives and fixes for new apps (v0.1.23); no change to this app's code, behaviour or picture (pixel and scene parity with v0.1.22) |
| 10 | v0.1.24 | 2026-10-26 | version number; the shared code gained a clock for bodies that read the time, Locator variables that change between one point and a list, sector disks and Opacity on points and text (v0.1.24); no change to this app's code, behaviour or picture (pixel and scene parity with v0.1.23) |
| 11 | v0.1.25 | 2026-10-26 | version number; the shared code gained one page clock (`shared/clock.js`: slider animations and app animations read it, tests fix it), tolerant `Equal`/`Unequal` in `shared/wl.js` and exact slider texts from saved states (v0.1.25); no change to this app's code, behaviour or picture (pixel and scene parity with v0.1.24) |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|-------------|---------|-------------|---------|
| I-ME-01 | Show σ1, σ2, σ3 and the rank next to μ | links the picture to the numbers | adds UI the original does not have | F-ME-06 |
| I-ME-02 | An Autorun button that sweeps θ1, θ2, θ3 as the original's ⊕ Autorun does | animation without the ⊕ menu | timing and order to be specified | N-ME-04 |
| I-ME-03 | Draw zero angles as nothing and negative angles the short way | joint-angle arcs that match the dials | departs from the original's picture | Q-ME-01, Q-ME-02 |
| I-ME-04 | Sliders for the link lengths r2, r3 and d1 | explore how link lengths change manipulability | new controls; Details formula assumes r2, r3 | F-ME-04 |

## 11. Errors in the original (conceptual and mathematical)

Owner rule R-C (2026-10-17). Checked: `JvRRRanthro` against the derivative of the arm's own forward kinematics `oc`
(columns ∂oc/∂θ1, ∂oc/∂θ2, ∂oc/∂θ3: identical) and against the elbow manipulator of Spong et al. [2]; μ = Det[Σfull] =
σ1σ2σ3 = abs(det J) = √det(J Jᵀ) (correct, as the Details say); the ellipsoid `Ellipsoid[{0,0,0}, Σ^2]` under `{U, oc}`
(semi-axes σi along the columns of U: correct) and its three rings (the unit circle rotated into the u1u2, u2u3 and u1u3
planes and scaled by the two singular values of that plane: correct); the Details' determinant, rank and snapshot
statements — with an independent NumPy computation of J, its singular values and determinant (r2 = r3 = 1 and
r2 = 1, r3 = 2); the drawing of the joint-angle arcs (`splineCircle`). The 0.1 display threshold for arrows and rings
(Q-ME-08) is a drawing choice, not listed.

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|------|-----------------------|--------------------------|--------------------|-------------------------|--------|
| E-ME-01 | text | Details: "The determinant of the Jacobian is J = −r<sub>2</sub> r<sub>3</sub> (r<sub>2</sub> c<sub>2</sub> + r<sub>2</sub> c<sub>23</sub>) s<sub>3</sub>." | Typo: det J = −r<sub>2</sub> r<sub>3</sub> s<sub>3</sub> (r<sub>2</sub> c<sub>2</sub> + **r<sub>3</sub>** c<sub>23</sub>) ([2]); with r<sub>2</sub> = 1, r<sub>3</sub> = 2 at θ = (0.4, 0.3, 0.9) the true determinant is −2.632, the printed formula gives −2.064 (the code uses r<sub>2</sub> = r<sub>3</sub> = 1, where both agree). Also "J =" should read "det J =". | Shows the Details as in the original (F-ME-14, N-ME-01). | Text only; no value or test changes (μ is computed from the SVD). | open |
| E-ME-02 | text | Details: "When the elbow manipulator is in the configuration [θ<sub>1</sub>, θ<sub>2</sub>, kπ], k ∈ ℤ, the Jacobian has rank 2 … At the configuration [θ<sub>1</sub>, π/2 + kπ, jπ], (j, k) ∈ ℤ², the Jacobian has rank 1" | With r<sub>2</sub> = r<sub>3</sub> (the code's r2 = r3 = 1) every configuration with θ<sub>3</sub> = π (k odd) has rank **1**, not 2: the folded arm puts the wrist back on the shoulder, so r<sub>2</sub>c<sub>2</sub> + r<sub>3</sub>c<sub>23</sub> = 0 as well (θ = (0.3, 0.7, π): singular values 1, 0, 0). And the list misses the shoulder singularity r<sub>2</sub>c<sub>2</sub> + r<sub>3</sub>c<sub>23</sub> = 0 with θ<sub>3</sub> ≠ kπ (wrist on the base axis), e.g. θ<sub>2</sub> = π/4, θ<sub>3</sub> = π/2 or θ<sub>2</sub> = 3π/8, θ<sub>3</sub> = π/4: rank 2. | Shows the text as in the original (F-ME-14, N-ME-01); the computed picture is right. | Text only; no test changes. M-ME-04 already visits θ<sub>3</sub> = π and θ = (·, 3π/8, π/4). | open |
| E-ME-03 | text | Details: "Snapshot 1 gives a three-dimensional ellipse, snapshot 2 a two-dimensional ellipse, and snapshot 3 a one-dimensional ellipse." | All four snapshots of the notebook have full rank (μ = 0.671892, 1.20711, 1.20711, 1.20711; snapshots 2–4 have θ<sub>2</sub> = 0, θ<sub>3</sub> = π/4, N-ME-01, K-ME-08): none shows a flat ellipse or a line. | Shows the text as in the original (F-ME-14). | Text only (or new snapshots that show rank 2 and 1); no test changes. | open |
| E-ME-04 | conceptual | `splineCircle[m, r, angles]` with `{start, end} = Mod[angles // N, 2π]; If[end <= start, end += 2π]`, used for the joint-angle arcs `splineCircle[o0, 1, {0, θ1}]`, `{0, θ2}`, `{θ2, θ2 + θ3}` | The arcs are meant to show the joint angles, but after the `Mod` an angle of 0 becomes a full circle (2π) and a negative angle θ is drawn counter-clockwise as 2π + θ (saved state: θ<sub>3</sub> = −21π/32 is drawn as an arc of 43π/32). The picture therefore shows angles the joints do not have. | Keeps it (Q-ME-01, Q-ME-02). | Drawing nothing for 0 and the short (signed) way for negative angles (I-ME-03) changes the arcs only: golden-snapshot comparisons of the arcs (snapshot 1's long green arc, the full blue circles of snapshots 2–4) and M-ME-05 change; μ, the ellipsoid and the harness numbers stay. Possible as an option. | open |
