# Design document: Denavit-Hartenberg Parameters for a Three-Link Robot

| | |
|---|---|
| Code version: | 0.1.28 |
| Document revision | 1 (2026-10-18) — first implementation |
| Status | describes the app as implemented; changes go through Proposed changes (§8) |
| Original | Wolfram Demonstrations Project, "Denavit-Hartenberg Parameters for a Three-Link Robot", contributed by Aaron T. Becker and Mary Burbage, published 2016-06-16 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/DenavitHartenbergParametersForAThreeLinkRobot/>. Readable source: [`docs/original-source/dh-parameters.txt`](../../docs/original-source/dh-parameters.txt); snapshots: `docs/original-snapshots/dh-parameters-1.png` … `-5.png`; saved state: `tests/golden/dh-parameters.original-states.json` (written with `tools/extract_state.py --snapshots` from the raw notebook: live state, initial settings and the five snapshot `Settings`) |
| Port files | app: `model.js` (T1, T2, T3, the Graphics3D content in the original's order, one evaluation of the body, the plot-range box and the framing helpers; pure), `main.js` (the Manipulate on `shared/manipulate.js`: 13 labelled sliders with ⊕ panels, 3 setter bars, 3 delimiters, the 3D picture as `View3D` of `shared/graphics3d-view.js`, hook extras; v0.1.21), `index.html`; common (CC BY-NC-SA; this app owns the DH-family move from robot-singularities, §6.5): `demos/common/dh-chain.js` (`dhTransform` — machine path by default, exact-angle path by an explicit argument), `demos/common/robot-draw.js` (`drawZArrow`, `drawCoordAxes`, `GROUND`, `drawJoint` variant `'dh'`, `drawGripper` shared with "Common Robot Arm Configurations"), `shared/graphics3d.js`, `shared/graphics3d-three.js` (and `demos/common/svd3.js`, moved but not used here); shared (MIT): `shared/exact-pi.js` (integer-angle trig, through `dh-chain.js`), `shared/mma-text.js` (`piFraction`, `parsePiFraction`), `shared/ui.js` (`Controls.slider` with `steps:'mma'` and `format`/`parse` hooks, `setterBar`, `delimiter`, `mmaSliderText`), `shared/mma-lighting.js`, `shared/three-helpers.js`, `shared/mma.js`, `shared/mma-colors.js` |
| Role in the project | further demonstration (batch B) |

## 1. Purpose and background

A teaching tool for the Denavit–Hartenberg (DH) convention: three joints, each with a joint type (revolute or
prismatic) and all four DH parameters θi, di, ri, αi on sliders, plus a gripper opening. The arm is drawn link by link:
joint i is drawn in the frame of the product of the previous DH transforms A1 … A(i−1), with A = Rot_z(θ) ·
Trans_z(d) · Trans_x(r) · Rot_x(α); each frame shows its x (blue), y (green) and z (red) axes. The default settings
are the anthropomorphic (elbow) arm of the Details table; the snapshots show a SCARA arm, a cylindrical robot, a
planar arm and a spherical wrist. The joint type changes only the drawing (cube instead of cylinder); the kinematics
always use all four parameters.

## 2. Scope

In scope: the 16 Manipulate controls (3 setter bars, 13 labelled sliders with value fields and ⊕ animation panels, 3
delimiters), `DHTransform`, `DrawJoint`, `DrawCoordAxes`, `DrawZArrow`, `DrawGripper`, the ground, the Graphics3D
options (automatic plot range with SphericalRegion, ImageSize 425, no box), mouse rotation, the saved opening state,
the exact display of the π-valued sliders, and the original's quirks (§7).
Out of scope (would need a design entry first): more than three links (the Details say the code "can easily be
extended"), numeric display of the transforms, presets for the robots of the Details tables, Autorun/bookmarks.

## 3. Users and use cases

| ID | User | Use case |
|----|------|----------|
| UC-DH-01 | student | change one DH parameter at a time and see what it does to the frames and the arm |
| UC-DH-02 | student | build the arms of the Details (anthropomorphic, SCARA, cylindrical, planar, spherical wrist) from their DH tables |
| UC-DH-03 | student | switch a joint between revolute and prismatic and animate a parameter with ⊕ |
| UC-DH-04 | tester | compare the port with the saved state, the snapshots and the Mathematica harness |

## 4. Features

### 4.1 Controls

| ID | Feature | Reason | Since | Verified by |
|----|---------|--------|-------|-------------|
| F-DH-01 | Three setter bars `{{j1,"Revolute","j1"},{"Revolute","Prismatic"}}` (j2, j3 alike), default "Revolute" | joint type (UC-DH-03) | v0.1.16 | e2e "has the controls of the original with their defaults (13 labelled sliders, 3 setter bars, 3 delimiters)"; e2e "Prismatic for j3 draws a cube joint and a long translucent axis bar"; unit "the joint type changes only the drawing: T1, T2, T3 do not depend on j1, j2, j3" |
| F-DH-02 | Angle sliders `{{Theta1,5π/32,"θ1"},-π,π,π/32,ImageSize->Small,Appearance->"Labeled"}`, θ2 default π/4, θ3 default −3π/8; `{{Alpha1,π/2,"α1"},-π,π,π/32,…}`, α2 and α3 default 0. Values are exact multiples of π/32 and are shown as fractions ("5π/32", "−13π/16", "π") | DH angles (UC-DH-01) | v0.1.16 | unit "π-fraction labels: 5π/32, -13π/16, π/2, π, -π/2, 0 (exact slider values)"; unit "θ and α sliders take the exact values -π + kπ/32 (k = 0..64), d, r and grip the machine values 0.01 k"; golden "dh parameters: snapshot 1 labels read 5π/32, 1, 0, π/2, π/4, 0, 1, 0, -3π/8, 0, 1, 0 and grip 1"; e2e "dragging the θ1 slider with the mouse turns the arm about the vertical axis and the label shows exact fractions of π" |
| F-DH-03 | Length sliders `{{d1,1,"d1"},0,1,0.01,ImageSize->Small,Appearance->"Labeled"}`, d2 = d3 = 0 by default; `{{r1,0,"r1"},0,1,0.01,…}`, r2 = r3 = 1 by default. The defaults are exact ("1", "0"); a moved value is a machine number ("1.", "0.", "0.81") (Q-DH-05) | DH offsets and lengths (UC-DH-01) | v0.1.16 | unit "value display: exact defaults 1 and 0, machine values after a move 1., 0., 0.81, 0.52"; golden "dh parameters: snapshot 2 (SCARA) labels read -13π/16, 1., 1., 0, 7π/32, 0., 1., π, 0, 0.81, 0., 0 and grip 0.52 with j3 Prismatic"; golden "dh parameters: snapshot 3 (cylindrical) labels read -3π/16, 1., 0., 0, 0, 0.74, 0., -π/2, 0, 0.89, 0., 0 and grip 1 with j2 and j3 Prismatic"; golden "dh parameters: snapshot 4 (planar) labels read 0, 0., 0.8, 0, -9π/32, 0., 0.8, 0, -3π/16, 0., 0.5, -π/2 and grip 1"; golden "dh parameters: snapshot 5 (spherical wrist) labels read 5π/32, 1, 0, -π/2, 5π/32, 0., 0., π/2, 27π/32, 0.77, 0., 0 and grip 0.49" |
| F-DH-04 | Grip slider `{{g,1,"grip"},0,1,0.01,ImageSize->Small,Appearance->"Labeled"}` | open and close the gripper | v0.1.16 | e2e "the grip slider opens and closes the gripper"; unit "DrawGripper: r3 ≠ 0 gives the hand along x (fingers at z = ±g/10 … ±(1+g)/10), r3 = 0 along z (fingers at x = ±g/10 …)" |
| F-DH-05 | `Appearance->"Labeled"` Manipulate controls: an editable value field and the ⊕ button opening the animation panel (step back, play/pause, step forward) for each of the 13 sliders (K-DH-01, K-DH-02) | exact entry and animation (UC-DH-03) | v0.1.16 | e2e "typing into the d1 value field sets d1 (clamped to 0..1)"; e2e "the ⊕ panel of θ1 animates the arm"; M-DH-04; M-DH-05 |
| F-DH-06 | Layout: groups (j1, θ1, d1, r1, α1), (j2 …), (j3 …), grip separated by `Delimiter`; controls at the left of the graphic (snapshots; the source sets no ControlPlacement, N-DH-03) | the original's layout | v0.1.16 | e2e "has the controls of the original with their defaults (13 labelled sliders, 3 setter bars, 3 delimiters)"; M-DH-02 |

### 4.2 Model (`model.js`, `demos/common/dh-chain.js`, `shared/exact-pi.js`)

| ID | Feature | Reason | Since | Verified by |
|----|---------|--------|-------|-------------|
| F-DH-07 | `DHTransform[d_, r_, Theta_, Alpha_] := RotationTransform[Theta, {0,0,1}].TranslationTransform[{0,0,d}].TranslationTransform[{r,0,0}].RotationTransform[Alpha, {1,0,0}]` (identical to robot-singularities' `dhTransform`; shared in `demos/common/dh-chain.js`, §6.5) | the DH convention of the Details | v0.1.16 | unit "DHTransform is Rot_z(θ).Trans_z(d).Trans_x(r).Rot_x(α) and equals the matrix A_i of the Details text"; unit "dhTransform keeps the machine path of robot-singularities: a machine angle equal to the double of -π gives sin -1.2246467991473532e-16, exact angles only through the explicit argument"; unit "the moved modules reproduce robot-singularities' Td and o3coords bit for bit through its re-export shims"; harness "H-DH-01" |
| F-DH-08 | `T1 = DHTransform[d1, r1, θ1, α1]`, T2, T3 alike (Module initial values); joint 2 drawn in T1, joint 3 in T1.T2, the gripper in T1.T2.T3 | forward kinematics, frame by frame | v0.1.16 | unit "default anthropomorphic arm: frame origins (0,0,1), (0.623613, 0.333328, 1.707107), (1.438402, 0.768842, 1.324423) equal the closed form"; unit "frame origins of the snapshot settings 2-5 equal an independent DH product"; harness "H-DH-01"; harness "H-DH-02"; harness "H-DH-03"; harness "H-DH-04"; harness "H-DH-05" |
| F-DH-09 | Exactness of the values: θi, αi are exact multiples of π/32 (integers n, θ = nπ/32; trig through `shared/exact-pi.js` via the explicit exact-angle argument of `dhTransform`, so Cos[π/2] is exactly 0); di, ri, g are exact at their defaults and machine numbers once moved ; a product with a machine factor is Mathematica's machine Dot (fused multiply-add chain, `mul4Fma`; v0.1.17, H-DH-02, H-DH-04, H-DH-05), sin(π/8) the correctly rounded 0.3826834323650898 (H-DH-07)| the original's labels, exact frames at right angles | v0.1.16 | unit "θ and α sliders take the exact values -π + kπ/32 (k = 0..64), d, r and grip the machine values 0.01 k"; unit "exact right angles: α1 = π/2 gives exact 0 and ±1 entries in T1 (no 6.1e-17)"; harness "H-DH-08" |
| F-DH-10 | Opening state = the live state (output cell, raw line 809; = snapshot 1's Settings, line 2748) = the initial settings (stored `"Variables"`, raw line 868), which the port's "Initial settings" restores (A-DH-01) = the source defaults: j1–j3 "Revolute", θ = (5π/32, π/4, −3π/8), d = (1, 0, 0), r = (0, 1, 1), α = (π/2, 0, 0), g = 1 (all exact) | the original's opening picture (snapshot 1) | v0.1.16 | golden "dh parameters: the live state (= the initial settings) is the opening state of the port"; golden "dh parameters: the five snapshot Settings load as port states with exact θ and α and the stored machine d, r and g"; e2e "Initial settings restores the opening state" |

### 4.3 Graphics (three.js)

| ID | Feature | Reason | Since | Verified by |
|----|---------|--------|-------|-------------|
| F-DH-11 | `Graphics3D[{{LightBrown, Cylinder[{{0,0,-2/5},{0,0,-1/5-1/20}}, 2.2]}, DrawJoint[j1,d1,r1,θ1], GeometricTransformation[DrawJoint[j2,d2,r2,θ2], T1], GeometricTransformation[DrawJoint[j3,d3,r3,θ3], T1.T2], GeometricTransformation[DrawGripper[g, r3], T1.T2.T3]}, SphericalRegion->True, ImageSize->425, Boxed->False]`; default ViewPoint, ViewAngle (automatic), Lighting and PlotRange (all objects) (D-DH-01) | the original's picture | v0.1.16 | unit "ground: light-brown cylinder radius 2.2 from z = -2/5 to -1/4"; unit "plot range = bounds of all primitives and changes with the arm (snapshot 4 smaller than snapshot 1)"; golden "dh parameters: with one zoom fitted to the five snapshots the ground disc widths (347.5, 370.5, 349.5, 402.5, 345.5 pt) are reproduced within 4 %"; e2e "loads without errors and draws the ground and the arm"; M-DH-02; M-DH-06 |
| F-DH-12 | `DrawJoint[j, d, r, Theta]` (jr = 1/5, ar = 1/20): `DrawCoordAxes[jr]` (Thick red z, blue x, green y arrows of length 2jr made of Lines, identical to robot-singularities); `Opacity[1]`; `{Opacity[0.5], Gray, If[j == "Prismatic", Cuboid[{-ar,-ar,-1+d-jr-.01}, {ar,ar,d+.01}], Cylinder[{{0,0,Min[-ar,d-jr]-.01}, {0,0,Max[ar,d]+.01}}, ar]]}`; `{LightBlue, If[j == "Prismatic", Cuboid[{-jr,-jr,-jr}, {jr,jr,jr}], {Cylinder[{{0,0,-jr}, {0,0,jr}}, jr]}]}`; `Rotate[{Opacity[0.5], Gray, Cuboid[{-ar,-ar,d-ar}, {r,ar,d+ar}]}, Theta, {0,0,1}]` (Q-DH-02, Q-DH-03) | the joints, their frames and the links | v0.1.16 | unit "DrawJoint revolute: gray translucent axis cylinder from Min[-ar, d-jr]-.01 to Max[ar, d]+.01 radius 1/20, opaque light-blue cylinder ±1/5 radius 1/5, link cuboid {-ar,-ar,d-ar}-{r,ar,d+ar} turned by θ"; unit "DrawJoint prismatic: axis cuboid from -1+d-jr-.01 to d+.01, light-blue cube of half-width 1/5"; unit "DrawJoint with r = 0 still draws the small link cuboid {-1/20,-1/20,d-1/20}-{0,1/20,d+1/20}"; unit "DrawZArrow and DrawCoordAxes are those of robot-singularities (identical code, shared module)"; harness "H-DH-07"; harness "H-DH-09" |
| F-DH-13 | `DrawGripper[g, r]`: `DrawCoordAxes[jr]` and, if `r != 0`, a gray hand along x (palm `Cuboid[{-2ar,-ar,-4ar},{0,ar,4ar}]`, fingers `Cuboid[{0,-ar,2g ar},{4ar,ar,2(1+g)ar}]` and its mirror in z), else "pointing along d" (palm `Cuboid[{-4ar,-ar,-2ar},{4ar,ar,0}]`, fingers `Cuboid[{2g ar,-ar,0},{2(1+g)ar,ar,4ar}]` and its mirror in x); called with r = r3 (Q-DH-04) | the end effector and its opening | v0.1.16 | unit "DrawGripper: r3 ≠ 0 gives the hand along x (fingers at z = ±g/10 … ±(1+g)/10), r3 = 0 along z (fingers at x = ±g/10 …)"; e2e "r3 = 0 turns the gripper to point along z"; harness "H-DH-06"; harness "H-DH-10" |
| F-DH-14 | The picture can be rotated with the mouse | see the frames from all sides | v0.1.16 | e2e "dragging in the picture rotates the view"; e2e "the camera framing follows the arm: the planar arm (snapshot 4) is drawn larger than the opening arm"; M-DH-06 |
| F-DH-15 | Title, caption and Details & Citations text (the A_i matrix, the five DH tables, the two references) | explains the Demonstration | v0.1.16 | M-DH-01 |

### 4.4 Port additions

| ID | Feature | Reason | Since | Verified by |
|----|---------|--------|-------|-------------|
| A-DH-01 | "Initial settings" button: all controls back to the opening state | stands in for the Manipulate ⊕ menu → Initial Settings | v0.1.16 | e2e "Initial settings restores the opening state" |
| A-DH-02 | `window.__demo` automation hook (state, setState, the three transforms, primitive summary, plot-range box, camera position) | automated tests | v0.1.16 | e2e "loads without errors and draws the ground and the arm" |
| A-DH-03 | "All demos" link | site navigation | v0.1.16 | inventory; M-GEN-01 |
| A-DH-04 | Credit footer: original title, authors, licence, adaptation notice | required by CC BY-NC-SA 3.0 | v0.1.16 | e2e "attribution on" |
| A-DH-05 | Start-up notice (watchdog, `<noscript>`) and WebGL 2 notice when the page cannot start (DEC-22) | a clear message instead of an empty page | v0.1.16 | e2e "start-up notice when"; e2e "WebGL 2 notice on" |
| A-DH-07 | Redraw after a WebGL context loss (as A-EA-06, unit-balls, prm-robot-arm) | the picture comes back after a GPU reset or sleep | v0.1.16 | e2e "redraws after a WebGL context loss (port addition)" |
| A-DH-06 | standalone bundle (owner rule R-A): `npm run bundle -- dh-parameters` builds `dist/dh-parameters/` with exactly the files the app imports, the licences, a generated README and a root `index.html` (§6, "Building and deploying this app alone") | anyone can host this one app elsewhere without the rest of the site (owner rule R-A, 2026-10-17) | v0.1.16 | e2e "bundle: dh-parameters runs from its own folder" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|-------------|---------|
| `setter-j*` | F-DH-01 |
| `slider-theta*` | F-DH-02 |
| `slider-alpha*` | F-DH-02 |
| `slider-d*` | F-DH-03 |
| `slider-r*` | F-DH-03 |
| `slider-g` | F-DH-04 |
| `value-*` | F-DH-05 |
| `plus-*` | F-DH-05 |
| `play-*` | F-DH-05 |
| `stepback-*` | F-DH-05 |
| `stepfwd-*` | F-DH-05 |
| `scene-canvas-workspace` | F-DH-11, F-DH-14 |
| `reset` | A-DH-01 |
| `crumbs` | A-DH-03 |
| `details` | F-DH-15 |
| `credits` | A-DH-04 |

Slider names: `theta1`–`theta3`, `d1`–`d3`, `r1`–`r3`, `alpha1`–`alpha3`, `g`.

## 6. Design

### 6.1 Files and responsibilities

- `model.js` (pure): `initialState()` (the live state = the initial settings), `evaluate(state)`: T1, T2, T3 from `dhTransform`
  (`demos/common/dh-chain.js`, exact-angle path for θ and α, F-DH-09), their products, the Graphics3D content in the
  original's order (`drawJoint(…, {variant: 'dh'})` and `drawGripper` of `demos/common/robot-draw.js`), and the
  plot-range box (`primitiveBounds`).
- `demos/common/dh-chain.js`: `dhTransform(d, r, θ, α)` with Math.cos/sin (robot-singularities' machine path, unchanged)
  and `dhTransform(d, r, θ, α, {exact: {theta: n, alpha: m}})` — exact-angle path with integers n, m (angle nπ/32), trig
  from `shared/exact-pi.js`. The machine path must not recognise doubles that happen to equal π/32 multiples:
  robot-singularities' slider values hit them (k = 1 and k = 26), and Mathematica keeps e.g. sin(−π·1.) =
  −1.2246467991473532e-16 there.
- `demos/common/robot-draw.js`: `drawZArrow`, `drawCoordAxes`, `GROUND`, `drawJoint(j, d, r, θ, {variant: 'rs'|'dh'|'ac'})`
  (this Demonstration is `'dh'`, §6.2), `drawWristCenter`, `drawGripper(g, r)`.
- `main.js` (v0.1.21): one `Manipulate({…})` call of `shared/manipulate.js`. The controls are Mathematica control specs
  on variable paths of the model's state (`'j.0'`, `'theta.0'`, …, so `getState()` keeps its shape): three setter bars,
  θ and α sliders on the integer n = −32 … 32 (`steps:'mma'`, step 1, value nπ/32, exact; `format` = `piFraction` of
  `shared/mma-text.js`, `parse` accepts "5π/32", "5 Pi/32" (`parsePiFraction`) or a number in radians, snapped to the
  nearest π/32, D-DH-07), d, r and g sliders (0 … 1 by 0.01) whose text (`mmaSliderText`) prints "1" for the exact default
  and "1.", "0.81" for a moved value — the control options `Assign` (also records that flag in `exact`) and `Moved`
  (shows it after reset/setState) —, `Delimiter`s; `resetStops` (Initial settings stops the ⊕ animations); `merge`
  (setState semantics of the hook). The body returns `{ view, graphics: view.graphic }`; the picture is
  `{ id: 'view', renderer: View3D({ImageSize: 425, ViewPoint, zoom: DH_ZOOM, thickPx: 3, …}) }` of
  `shared/graphics3d-view.js` (one viewer kept across evaluations, `addMathematicaLighting` and `LinearSRGBColorSpace`,
  refit with `fitViewer` only when the bounds change; it draws with `addPrims` of `shared/graphics3d-three.js`). Hook
  extras: `transforms`, `primitives(part)`, `view`, `inkFraction`, `camera`, `cameraPosition`, `evaluations`.
- `model.js` also exports `fitCamera` and `groundWidthFraction` (pure copies of fitViewer's arithmetic and the projected
  ground-disc width, for the framing test T-DH-22) and `stateFromSettings` (a snapshot's `Settings` as a port state).

### 6.2 Reuse, line by line against robot-singularities (RS)

| Original code here | RS original | RS port code | Verdict for this app |
|--------------------|-------------|--------------|----------------------|
| `DrawZArrow[jr_]` | `drawZArrow` — identical (only the comment and the capital letter differ) | `model.js` `drawZArrow` | shared (common/robot-draw.js) |
| `DrawCoordAxes[jr_]` = `{Thick, {Red, DrawZArrow}, {Blue, Rotate[…, π/2, {0,1,0}]}, {Green, Rotate[…, -π/2, {1,0,0}]}}` | identical | `model.js` `drawCoordAxes` | shared (common/robot-draw.js); `Rotate` keeps Math.cos/sin (g3d.rotationMatrix unchanged) |
| `DHTransform[d, r, θ, α]` = Rot_z(θ)·Trans_z(d)·Trans_x(r)·Rot_x(α) | `dhTransform` — identical | `robots.js` `dhTransform` (exact cos/sin only for the table constants 0, ±π/2, ±π) | shared (common/dh-chain.js); RS's machine path stays the default, this app passes its exact angles explicitly |
| ground `{LightBrown, Cylinder[{{0,0,-2/5},{0,0,-1/5-1/20}}, 2.2]}` | identical | `model.js` `GROUND` | shared (common/robot-draw.js) |
| `DrawJoint[j, d, r, θ]` | `drawJoint` — differs: (1) `Opacity[1]` then `{Opacity[0.5], Gray, …}` axis and `Rotate[{Opacity[0.5], Gray, Cuboid[…]}]` link (RS: opaque Gray); (2) prismatic axis `Cuboid[{-ar,-ar,-1+d-jr-.01}, …]` (RS: from `-jr-.01`); (3) joint body cube ±jr resp. `Cylinder[{{0,0,-jr},{0,0,jr}}, jr]` (RS: two cuboids with a 0.1 gap resp. `Cylinder[{{0,0,-jr-.05},{0,0,jr+.05}}, .7 jr]`); (4) link always drawn (RS: `If[r != 0, …]`); (5) type test `j == "Prismatic"` (RS: `"p" == j`) | `model.js` `drawJoint` | variant `'dh'` of `drawJoint` in common/robot-draw.js |
| `DrawGripper[g, r]` (two branches by `r != 0`) | `drawWristCenter` (axes and an orange point) | `model.js` `drawWristCenter` | `drawGripper` in common/robot-draw.js, shared with "Common Robot Arm Configurations" (identical definition) |
| joints: `DrawJoint[j1, d1, r1, θ1]` untransformed, then `GeometricTransformation[DrawJoint[…], T1]`, `…, T1.T2` | Table over joints with `Td[i-1]`, the joint variable replacing θ or d by type | `model.js` `robotGraphics` | not shared (here every parameter is a slider; the type only picks the drawing) |
| T1, T2, T3 as Module initial values | `Ad`, `Td` with `Chop` | `robots.js` `computeAd`, `computeTd` | not needed (three explicit products, no Chop) |
| Graphics3D options `SphericalRegion->True, ImageSize->425, Boxed->False` | workspace: `SphericalRegion->True, ImageSize->325, Boxed->False, PlotLabel->"Workspace"` | `main.js` `fitViewer` (bounding sphere × 1.26, D-RS-01) | `fitViewer(viewer, vp)` of common/g3d-three.js; the factor is re-measured on this Demonstration's snapshots (D-DH-01) |
| directives, scoping, `GeometricTransformation[g, TransformationFunction]`, `Rotate[g, θ, {0,0,1}]`, flatten, bounds | same language | `g3d.js` | shared (common/g3d.js); addition: `Cuboid` with corners in any order (the gripper's fingers give the larger z first, N-DH-06) |
| three.js conversion: cuboids and cylinders with default edges, translucent double-sided faces, Thick lines | same | `main.js` `addPrims` | shared (common/g3d-three.js) |
| controls: setter bars, `Appearance->"Labeled"` Manipulate sliders with ⊕ | popup, check boxes, setter, slider grid without ⊕ | `main.js` (own range + text field) | `shared/ui.js` slider with `steps:'mma'` and `format`/`parse` (COMMON-DECISIONS §3) |

Of the other users of the common modules, only "Robot Manipulator Workspaces" uses RS's `drawJoint` and
`drawWristCenter` (variant `'rs'`); "Common Robot Arm Configurations" has its own variant `'ac'` and shares `drawGripper`
with this app; "Manipulability Ellipsoid of a Robot Arm" uses g3d.js, svd3.js and g3d-three.js only. (Since v0.1.21 `g3d.js` and `g3d-three.js` are the MIT modules `shared/graphics3d.js` and `shared/graphics3d-three.js`, the generic SVD is `shared/svd3.js`, and the page draws through `shared/graphics3d-view.js` `View3D`; this table records the v0.1.16 move.)

### 6.3 State model and evaluation order

State: `j = [j1, j2, j3]` ("Revolute"/"Prismatic"), `theta = [n1, n2, n3]` and `alpha = [n…]` (integers, value nπ/32),
`d = [d1, d2, d3]`, `r = [r1, r2, r3]`, `g` (numbers) and separately `exact = {d: [..], r: [..], g}` (whether each value
is still exact: the label, Q-DH-05, the exact terms of `-1+d-jr-.01`, K-DH-06, and whether a transform is machine,
F-DH-09). One evaluation per
control change, in the original's order: T1, T2, T3; ground; DrawJoint 1 (untransformed); DrawJoint 2 in T1;
DrawJoint 3 in T1.T2; DrawGripper[g, r3] in T1.T2.T3; then the bounds of all primitives (automatic PlotRange) and a
refit of the camera when the bounds change (D-DH-01). The joint type never enters the transforms (Q-DH-01).

### 6.4 Numerics

Nothing is compared or displayed except the slider labels and `r != 0` (tolerant Unequal, `shared/mma.js`); exact
trig of the π/32 multiples keeps right angles exact (no 6.1e-17 tilt of frames at α = π/2). The drawing needs no
bit-exactness.

### 6.5 Move plan for the robot-singularities code (this app is the owner)

The shared DH-family modules are created by moving robot-singularities (RS) code; RS's behaviour must not change.

| Module (`demos/common/`) | Moved from | Exports |
|--------------------------|-----------|---------|
| `g3d.js` | `robot-singularities/g3d.js` | unchanged API; additions `EdgeForm` and `cuboidCorners` (corner order normalised where the box is drawn, not in `Cuboid`, N-DH-06/N-DH-08); `rotationMatrix` stays on Math.cos/sin (RS's `drawCoordAxes` uses `Rotate(π/2)` through it) |
| `svd3.js` | `robot-singularities/svd3.js` | `svd3(A, {zeroTol = 0})`, `matrixRank`, `manipEllip(J, c, {scale = 1/2, zeroTol = 0})`: singular values ≤ `zeroTol·σ1` become 0; the defaults keep robot-singularities' results unchanged; Manipulability Ellipsoid passes `scale: 1, zeroTol: 100 * 2 ** -53` (≈ 1.11e-14, the value of two-link-kinematics' `svd2`; COMMON-DECISIONS §5) |
| `dh-chain.js` | `robot-singularities/robots.js` (generic part) | `DOF`, `joints`, `dhTransform` (machine path default, explicit exact-angle path), `jointTransform`, `makeO3coords`, `computeAd`, `computeTd(Ad, {chop = true})` for n joints |
| `robot-draw.js` | `robot-singularities/model.js` (drawing part) | `drawZArrow`, `drawCoordAxes`, `GROUND`, `drawJoint(…, {variant: 'rs'\|'dh'\|'ac', dExact})` (`'rs'` default), `axisBottomZ` (K-DH-06), `drawWristCenter`, `drawGripper` |
| `g3d-three.js` | `robot-singularities/main.js` (not exported today) | `addPrims`, `disposeGroup(groups)`, `fitViewer(viewer, vp)` (parameters instead of RS's module globals) |

Conditions (review r4): `computeTd` chops by default (RS unchanged; Arm Configurations passes `chop: false`);
`disposeGroup`/`fitViewer` take parameters, so RS's `main.js` call sites change without behaviour change; RS keeps
re-export shims at its old paths (`robots.js`, `g3d.js`, `svd3.js`, `model.js` re-export from `demos/common/`) with SPDX
headers, so its tests stay unchanged; each moved file's SPDX-FileCopyrightText names the Demonstrations its code is
derived from (robot-singularities by Aaron T. Becker and Yitong Lu and this Demonstration by Aaron T. Becker and Mary
Burbage; `robot-draw.js` also "Common Robot Arm Configurations" by Mohammad Sultan and Aaron T. Becker, whose `'ac'`
variant it holds), not every app that imports it; `g3d.rotationMatrix` is not switched to exact trig; RS's DESIGN.md gets a
revision row (no feature change); the move is gated on RS's full unit, golden and e2e suite including the
`workspacePixelAt` colour checks, plus the regression tests T-DH-48 (RS's Td and o3coords bit for bit through the moved
modules) and T-DH-49 (machine path of `dhTransform`).

### 6.6 Building and deploying this app alone

Owner rule R-A (2026-10-17): this one app can be taken out of the repository and hosted anywhere. One command builds it:

```
npm run bundle -- dh-parameters
```

`tools/bundle-app.mjs dh-parameters` (npm script `bundle`) writes `dist/dh-parameters/`: the app with exactly the files it needs — its HTML, its modules and everything they import, recursively, with the repository's relative layout kept — plus the licence texts that apply, a generated `README.md` (title, the original's credits, licence, "serve this folder with any static web server", how to run its tests in the full repository) and a root `index.html` that opens the app (the "All demos" link of the bundled page leads to that root page). Nothing else. Contents (generated with `npm run bundle -- --update-docs`; unit "bundle contents listed in DESIGN.md match the collector" keeps the table current):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/dh-parameters/`) | 3 | `index.html`, `main.js`, `model.js` |
| `shared/` | 23 | `clock.js`, `exact-pi.js`, `graphics-extras.js`, `graphics.js`, `graphics3d-three.js`, `graphics3d-view.js`, `graphics3d.js`, `manipulate.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `mma-lighting.js`, `mma-text.js`, `mma.js`, `random.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `three-helpers.js`, `ui-extra.js`, `ui-interval.js`, `ui.js` |
| `demos/common/` | 2 | `dh-chain.js`, `robot-draw.js` |
| `vendor/three/` | 9 | `addons/controls/OrbitControls.js`, `addons/lines/Line2.js`, `addons/lines/LineGeometry.js`, `addons/lines/LineMaterial.js`, `addons/lines/LineSegments2.js`, `addons/lines/LineSegmentsGeometry.js`, `addons/renderers/CSS2DRenderer.js`, `three.core.js`, `three.module.js` |
| added by the bundler | 8 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/dh-parameters/DESIGN.md`, `vendor/three/LICENSE` |
<!-- bundle-contents:end -->

Licences: `LICENSES/CC-BY-NC-SA-3.0.txt` (this app and every `demos/…` module: derived from Wolfram Demonstration code); `LICENSES/MIT.txt` (the `shared/…` modules); `vendor/three/LICENSE` (three.js r186, MIT).

Requirements: WebGL 2 (three.js r186; `shared/requirements.js` shows the WebGL 2 notice without it) and ES modules with import maps (current Firefox, Chromium, WebKit).

Verified by e2e "bundle: dh-parameters runs from its own folder" (A-DH-06): the test runs the bundle command, serves `dist/dh-parameters/` alone with a static file server (no access to the rest of the repository), opens the root `index.html`, follows it to the app and checks: no console error, no failed request, every request stays inside the folder, the controls of §5 are present and the first picture is drawn (a WebGL 2 canvas with a non-empty frame); it also compares the folder's file list with the generated list in its `README.md`.

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

| ID | Kind | Description |
|----|------|-------------|
| Q-DH-01 | quirk kept | The joint type only changes the drawing: `DHTransform[d_i, r_i, θ_i, α_i]` always uses both θi and di, so a "Prismatic" joint still turns with θi and a "Revolute" joint still slides with di. |
| Q-DH-02 | quirk kept | Axis and link are translucent gray (Opacity 0.5); a prismatic joint's axis bar runs from −1 + d − jr − 0.01 = d − 1.21 to d + 0.01, i.e. it is 1.22 long for every d and sticks out about one unit below the joint body. |
| Q-DH-03 | quirk kept | The link cuboid is drawn also for r = 0: `Cuboid[{-ar,-ar,d-ar},{0,ar,d+ar}]` is a small box of 0.05 × 0.1 × 0.1 at the joint (snapshot 3). |
| Q-DH-04 | quirk kept | The gripper turns to "point along d" exactly when r3 = 0 (`If[r != 0, …]`), e.g. snapshots 2, 3 and 5 (r3 = 0.). |
| Q-DH-05 | quirk kept | Slider labels show exact defaults as "1", "0" and moved values as machine numbers "1.", "0.", "0.81"; θ and α are always exact fractions of π (snapshots 1–5). |
| D-DH-01 | deviation | Framing: automatic plot range = bounds of all primitives (as RS `primitiveBounds`), camera fitted to the bounding sphere (`fitViewer` of `shared/graphics3d-three.js`) with one zoom factor `DH_ZOOM` = 1.4 and refitted whenever the bounds change, so the picture "breathes" as in the original (ground disc 347.5 pt in snapshot 1, 402.5 pt in snapshot 4). **Decided while implementing:** the draft calibrated the zoom on snapshot 1 alone; that leaves snapshot 4 (the flat planar arm) 5.1 % too small, outside the 4 % tolerance, because the snapshots breathe more than this fit (ratio 1.158 between snapshots 4 and 1 against 1.10). The zoom is therefore fitted to all five snapshots (smallest largest error): 355.2, 370.3, 356.6, 390.6, 354.1 pt, i.e. +2.2 %, 0.0 %, +2.0 %, −3.0 %, +2.5 % (T-DH-22). Mathematica's exact rule is unknown (K-DH-03). |
| D-DH-02 | deviation | Colours and lighting as D-RS-02 (`shared/mma-lighting.js`, `LinearSRGBColorSpace`). |
| D-DH-03 | deviation | Sizes and edges as D-RS-03 (`Thick` = 3 px; default dark edges of cuboids and cylinder rims as 1 px black lines with the face's opacity). The frame arrows are Lines in the original too, so they need no arrowhead approximation. |
| D-DH-04 | deviation | Slider look of `shared/ui.js`; the value field shows "5π/32" inline instead of a stacked fraction; ⊕ panel as in the other ports (D-CP-04). |
| D-DH-05 | deviation | Rotation with OrbitControls (z stays vertical), kept when a control changes (as D-RS-07, K-DH-04). |
| D-DH-06 | deviation | Translucent bars drawn double-sided and sorted per object (as D-RS-08); overlapping translucent parts may blend differently. |
| D-DH-08 | deviation | The drawing's own rotations — the link cuboid's `Rotate[…, Theta, {0,0,1}]` in DrawJoint and DrawCoordAxes' `Rotate[…, ±π/2, …]` — use machine `Math.cos`/`Math.sin` (`g3d.rotationMatrix`, unchanged for robot-singularities, §6.5), so a frame arrow may be tilted by ~6·10⁻¹⁷; the transforms T1, T2, T3 use the exact path (F-DH-09). Invisible; no value is displayed. |
| D-DH-07 | deviation | Slider arithmetic: θ, α as exact integers n (label exact), d, r, g as 0.01·k (as D-RS-06). A typed value is clamped to the range and **snapped** to the nearest slider position (the `steps:'mma'` rule of `shared/ui.js` used by every new app; decided while implementing — the draft said "not snapped", but θ and α are stored as the integer n, so an off-grid angle cannot be represented exactly); a typed whole number that lands on a position stays exact ("1" shows "1", as Mathematica's typed Integer). What the original does is K-DH-01. |
| D-DH-09 | deviation (removed in v0.1.17) | DrawZArrow's head points `{±1/32, 0, 3/2 jr}`: with the exact jr = 1/5 the original's z is 3/10, drawn as 0.3 (harness H-DH-01 … H-DH-10: every recorded Line has 0.3). Since v0.1.17 the 'dh' and 'ac' variants and DrawGripper call `drawCoordAxes(jr, true)`, which uses 3/10; robot-singularities keeps the double product (3/2)·0.2 = 0.30000000000000004 (its pinned outputs, §6.5). Unit "DrawZArrow and DrawCoordAxes are those of robot-singularities (identical code, shared module)" compares within one ulp. |
| D-DH-10 | deviation | Exact entries of T1, T2, T3 and their products are computed in doubles (Mathematica keeps them exact, e.g. T1.T2.T3[1,1] = (√2 Cos[π/8] Cos[5π/32] + √2 Cos[5π/32] Sin[π/8])/2 in H-DH-01): they differ from Mathematica's N of the exact value by up to 2 ulp (4e-16), and the exact plot range of H-DH-01 by 3e-16 (z max 1.9899494936611664 against 1.9899494936611661). Machine matrices (a moved d or r) are bit for bit (F-DH-09). Invisible; nothing displayed. |
| K-DH-01 | known issue (lead) | What the original does with a typed value (exact or machine, snapped to the step or not, outside the range). Port: parse "5π/32", "5 Pi/32" or a number, clamp, snap to the slider position (D-DH-07). M-DH-04. |
| K-DH-02 | known issue (lead) | ⊕ animation of a slider with the exact step π/32: speed, direction, looping, and whether the values stay exact. M-DH-05. |
| K-DH-03 | known issue (lead; the box part resolved) | The automatic framing rule (SphericalRegion with automatic ViewAngle). Harness run 2: `AbsoluteOptions[…, PlotRange]` of the produced graphic (stored PlotRange All) is the port's box — bounds of all primitives without padding — exactly in H-DH-02 … H-DH-05 ({{−2.2, 2.2}, {−2.2, 2.2}, {−0.4, z}} with z = 1.4, 1.94, 0.4, 2.0318478792875756) and to 3e-16 in H-DH-01 (exact coordinates, D-DH-10). So the box is not the cause of the framing difference; the remaining candidate is Mathematica's sphere fit / automatic ViewAngle (not in the record: front end). The zoom factor stays measured from the five snapshots (D-DH-01; snapshot 4 −3.0 %). |
| K-DH-04 | known issue (lead) | Whether the original keeps a mouse rotation when a slider moves (as K-RS-07). M-DH-06. |
| K-DH-05 | known issue (lead) | Whether a d/r slider moved back to its left end gives "0." (machine, snapshot 2: d2 = "0.") or "0" in every case; the port gives "0." after any move. M-DH-04. |
| K-DH-06 | resolved (v0.1.17) | `Plus` order of DrawJoint's prismatic axis bottom `-1+d-jr-.01` (jr = 1/5). Evidence (harness run 2, %g3d): machine d = 0.81 (H-DH-02), 0.74, 0.89 (H-DH-03), 1.0, 0.5 (H-DH-07) give −0.39999999999999997, −0.47000000000000003, −0.32, −0.21000000000000002, −0.71 — the numbers added in written order, ((−1 + d) + −1/5) + −0.01; the v0.1.16 reading of COMMON-DECISIONS §7, (d + −0.01) + N[−6/5], gave −0.3999999999999999, −0.47, −0.31999999999999995, −0.20999999999999996. An exact d joins the exact terms (H-DH-07: d = 0 gives −1.21). §7's rule "exact terms last" was measured with the symbolic constant Pi/2; exact rationals are added in place. `axisBottomZ` follows the record; all Cuboids, Cylinders and Lines of the recorded %g3d (H-DH-01 … H-DH-05, H-DH-07, H-DH-09) and DrawGripper (H-DH-06, H-DH-10) are reproduced bit for bit. Unit "DrawJoint prismatic axis: -1+d-jr-.01 added in written order, ((-1 + d) + -1/5) + -0.01 (H-DH-02, H-DH-03, H-DH-07); an exact d joins the exact terms". |
| N-DH-01 | note | Details text: A_i is written "rot_z,θ trans_z,d trans_x,r rot_z,α" — the last factor is a rotation about x (`RotationTransform[Alpha, {1,0,0}]` in the code); the matrix printed next to it is the correct one. |
| N-DH-02 | note | Details SCARA table (r1 = 0) and snapshot 2 (r1 = 1.) differ; tests use the snapshots. |
| N-DH-03 | note | The source sets no `ControlPlacement`; the snapshots show the controls at the left of the graphic, which the port follows. |
| N-DH-04 | note | The body's Module locals `jr = 1/10, ar = 1/40` are unused (DrawJoint and DrawGripper use their own 1/5, 1/20). |
| N-DH-05 | note | The stored Initialization (SaveDefinitions) also holds stale definitions `DrawGripper[]`, `DrawGripper[0.49]`, `DrawGripper[1]`, `DrawGripper[1.]`, `DrawGripper[g_]` and assignments to `FE`g$$…` from the author's session; none matches the two-argument call. |
| N-DH-06 | note | `Cuboid[p, q]` takes any two opposite corners (the gripper fingers list the larger coordinate first); the port keeps the corners as written in the data and normalises them where they are drawn (`cuboidCorners` of `shared/graphics3d.js`, used by `g3d-three.js`; `primitiveBounds` is order-independent). |
| N-DH-08 | note | Robot-singularities' code moved to `demos/common/` with this app (§6.5): its regression test T-DH-48 compares hashes of robot-singularities' Td, o3coords, Jacobians, SVDs, ellipsoids and both flattened graphics for its 16 robots with values recorded before the move (`tests/unit/fixtures/robot-singularities.pre-move.json`). Cuboid corner normalisation (N-DH-06) was placed in the renderer (`cuboidCorners`), not in `Cuboid`, because robot-singularities' data for an out-of-range prismatic value (reversed corners, reachable only through the automation hook) must stay bit-identical. |
| N-DH-07 | note | The saved state equals the source defaults (raw notebook: `\[Theta]1$$ = Rational[5, 32] Pi`, …), so opening and Initial Settings coincide. |

## 8. Proposed changes

No open proposal. Template (see [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md)):

| ID | Status | Requested by / date | Change | Reason | Acceptance criteria |
|----|--------|---------------------|--------|--------|---------------------|

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.16 | 2026-10-18 | first implementation of the design draft approved by the owner (DEC-17; draft of 2026-10-12 with COMMON-DECISIONS §5, §6 and owner rules R-A/R-B/R-C applied), including the DH-family move of robot-singularities' code to `demos/common/` (§6.5, regression test T-DH-48); decided while implementing: D-DH-01 (one zoom fitted to all five snapshots, T-DH-22 retitled), D-DH-07 (typed values snap), D-DH-08 (machine trig of the drawing's rotations), A-DH-07 (context-loss redraw), N-DH-06/N-DH-08 (corner normalisation in the renderer); harness checks are golden tests `harness "H-DH-nn"` that skip until `tests/golden/dh-parameters.harness.json` exists |
| 2 | v0.1.16 | 2026-10-18 | review fixes: K-DH-06 (`-1+d-jr-.01` in COMMON §7 order, `axisBottomZ`), D-DH-09 (3/2 jr one ulp above 3/10, kept for robot-singularities), §6.3 state shape, §6.5 g3d row and SPDX sentence corrected, checklist M-DH-04 Port line (snaps, D-DH-07), e2e θ1 drag aims at the centre of the target position |
| 3 | v0.1.17 | 2026-10-18 | harness run 2 (Mathematica 15.0.1 records H-DH-01 … H-DH-10): K-DH-06 resolved (prismatic axis bottom in written order), products with a machine factor are Mathematica's fused machine Dot (`mul4Fma`, F-DH-09: T1.T2.T3 bit for bit in H-DH-02, -04, -05), `shared/exact-pi.js` sin(π/8) = 0.3826834323650898 (H-DH-07 machine T3, H-ME-12), D-DH-09 removed (3/2 jr drawn as 0.3), D-DH-10 (exact entries in doubles), K-DH-03 narrowed (the box equals Mathematica's PlotRange); golden tests compare T1, T2, T3, T1.T2.T3 (machine entries bit for bit), the plot range and every recorded primitive |
| 4 | v0.1.18 | 2026-10-18 | version number only (harness run 3 accepted for manipulability-ellipsoid); no change to this app |
| 5 | v0.1.19 | 2026-10-21 | version number only (shared Manipulate layer added, four apps migrated to it); no change to this app |
| 6 | v0.1.20 | 2026-10-21 | version number only (Manipulate layer extended, eleven more apps migrated to it); no change to this app |
| 7 | v0.1.21 | 2026-10-23 | `main.js` rewritten on the shared Manipulate layer with a 3D picture (`shared/manipulate.js` + `shared/graphics3d-view.js` `View3D`; Graphics3D data model and renderer moved to MIT `shared/graphics3d.js` / `shared/graphics3d-three.js`, owner decision D1); no change to behaviour or picture (all unit, golden and browser tests passing; three.js scene graph, full-page pixels (SwiftShader) and Manipulate state identical to v0.1.20 at sample settings) |
| 8 | v0.1.22 | 2026-10-25 | version number; bundle table (`shared/manipulate.js` now also loads `shared/graphics-extras.js` and `shared/svg-frame.js` for the new Graphics options `Axes`/`Frame`/`PlotLabel`); no change to this app's code, behaviour or picture (pixel parity with v0.1.21) |
| 9 | v0.1.23 | 2026-10-25 | version number; the shared code gained plot functions, a geometry kit, 3D text and tube primitives and fixes for new apps (v0.1.23); no change to this app's code, behaviour or picture (pixel and scene parity with v0.1.22) |
| 10 | v0.1.24 | 2026-10-26 | version number; the shared code gained a clock for bodies that read the time, Locator variables that change between one point and a list, sector disks and Opacity on points and text (v0.1.24); no change to this app's code, behaviour or picture (pixel and scene parity with v0.1.23) |
| 11 | v0.1.25 | 2026-10-26 | version number; the shared code gained one page clock (`shared/clock.js`: slider animations and app animations read it, tests fix it), tolerant `Equal`/`Unequal` in `shared/wl.js` and exact slider texts from saved states (v0.1.25); the ⊕ animation test now fixes the page clock and checks the exact value; no change to this app's code, behaviour or picture (pixel and scene parity with v0.1.24) |
| 12 | v0.1.26 | 2026-10-27 | version number; the shared code gained region and density plots (`RegionPlot`, two-parameter `ParametricPlot`, `DensityPlot`), `BSplineCurve`, decorated insets, textures on polygons, `settleInterval` for bodies that pause between evaluations, typeset control headings and fixes found by the seven new ports (v0.1.26); no change to this app's code, behaviour or picture (pixel and scene parity with v0.1.25) |
| 13 | v0.1.27 | 2026-10-28 | version number; the shared code gained spans with a step, a cyclic `Riffle`, `EvenQ`/`OddQ`, `ArcCos`/`ArcSin`, `DeleteCases`, `ToString` and `StringForm` (`shared/wl.js`), legend labels that are pictures and Mathematica's `Placed[…, {pos, align}]` form, `Automatic` in PlotStyle lists, `Fraction` labels, 3D `Line` with several polylines, and View3D's `Epilog` and `SphericalRegion: false` (v0.1.27); no change to this app's code, behaviour or picture (pixel and scene parity with v0.1.26) |
| 14 | v0.1.28 | 2026-10-29 | version number; the shared slider gained the option `pauseWhenHidden` (off by default; motion planning, PA2 fix F-02) plays and steps a stored value outside its range from the position shown, and stops a playing animation when the slider is disabled (it went on) (v0.1.28); no change to this app's code, behaviour or picture (pixel and scene parity with v0.1.27) |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|-------------|---------|-------------|---------|
| I-DH-01 | Preset buttons for the five robots of the Details tables | build the examples with one click | new controls | UC-DH-02 |
| I-DH-02 | Show the numeric A_i and T matrices | links the picture to the formula of the Details | adds UI | F-DH-07 |
| I-DH-03 | Grey out the slider that is not the joint variable (θ for prismatic, d for revolute) | makes the DH convention's "*" variables visible | departs from the original, where both act | Q-DH-01 |
| I-DH-04 | Optional fixed framing (no breathing while sliding) | steadier picture | departs from the original's automatic range | D-DH-01 |

## 11. Errors in the original (conceptual and mathematical)

Owner rule R-C (2026-10-17). Checked: `DHTransform[d, r, θ, α]` = Rot<sub>z</sub>(θ)·Trans<sub>z</sub>(d)·Trans<sub>x</sub>(r)·Rot<sub>x</sub>(α)
against Spong, Hutchinson and Vidyasagar [1] (correct), its composition T1, T1.T2, T1.T2.T3 for the joints and the
gripper (correct), the drawing functions, the Details' description of the four elementary transformations and of the
two frame-assignment rules (correct), the printed matrix A<sub>i</sub> (correct), and each of the five DH tables of the
Details against [1] and against the default settings and the snapshot `Settings` (anthropomorphic arm = the defaults;
SCARA, cylindrical robot, planar robot, spherical wrist = snapshots 2–5). Q-DH-01 (both θ and d act for either joint
type) lets the user set every DH parameter, which the DH convention allows; it is not listed.

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|------|-----------------------|--------------------------|--------------------|-------------------------|--------|
| E-DH-01 | text | Details: "A<sub>i</sub> = rot<sub>z,θ<sub>i</sub></sub> trans<sub>z,d<sub>i</sub></sub> trans<sub>x,r<sub>i</sub></sub> rot<sub>z,α<sub>i</sub></sub>" | The last factor is a rotation about **x** by α<sub>i</sub> (rot<sub>x,α<sub>i</sub></sub>), as the code (`RotationTransform[Alpha, {1, 0, 0}]`), the sentence before it ("(4) a rotation α about the x axis") and the matrix printed next to it all say. Same error as two-link-kinematics' Details (E-TK-01). | Shows the Details as in the original (F-DH-15, N-DH-01). | Text only; no value, golden data or test changes; M-DH-01 records the difference as intended. | open |
| E-DH-02 | text | Details tables: anthropomorphic arm "Joint 2: θ<sub>2</sub>\*, 0, 0, 0" and "Joint 3: θ<sub>3</sub>\*, 0, 0, 0" (columns θ, d, r, α); SCARA "Joint 1: θ<sub>1</sub>\*, d<sub>1</sub>, 0, 0" | The tables give zero link lengths where the robots need them: an anthropomorphic (elbow) arm has r<sub>2</sub> = a<sub>2</sub> ≠ 0 and r<sub>3</sub> = a<sub>3</sub> ≠ 0 ([1]; the defaults that the Details say give this arm have r<sub>2</sub> = r<sub>3</sub> = 1, and with 0 the shoulder, elbow and wrist coincide), and a SCARA has r<sub>1</sub> = a<sub>1</sub> ≠ 0 ([1]; snapshot 2 uses r<sub>1</sub> = 1., N-DH-02). The tables should read r<sub>2</sub>, r<sub>3</sub> and r<sub>1</sub> (like the planar robot's table, which names r<sub>i</sub>). | Shows the tables as in the original (F-DH-15); the defaults and snapshots are right. | Text only; no test changes (tests use the defaults and the snapshot `Settings`). | open |
