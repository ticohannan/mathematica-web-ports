# Design document: Common Robot Arm Configurations

| | |
|---|---|
| Code version: | 0.1.25 |
| Document revision | 1 (2026-10-18) — first implementation |
| Status | describes the app as implemented; changes go through Proposed changes (§8) |
| Original | Wolfram Demonstrations Project, "Common Robot Arm Configurations", contributed by Mohammad Sultan and Aaron T. Becker, published 2017-06-28 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/CommonRobotArmConfigurations/>. Readable source: [`docs/original-source/arm-configurations.txt`](../../docs/original-source/arm-configurations.txt); snapshots: `docs/original-snapshots/arm-configurations-1.png` … `-6.png` (pictures 1 and 2 are identical, N-AC-01); golden data: `tests/golden/arm-configurations.original-states.json` (written with `tools/extract_state.py --snapshots` from the raw notebook, COMMON-DECISIONS §1: `states[0]` = output-cell state, raw notebook line 1948; `snapshots[1…6]` = the snapshot cells' Settings, raw lines 5256, 7471, 9130, 10505, 12137, 13574; `specs` = the stored Specifications) |
| Port files | app: `robots.js` (the nine DH tables of the popup with the exactness of every entry, the rows of the DH-table control; pure), `model.js` (the opening state, the slider-grid reset of a robot change, one evaluation of the body: Ad, Td, the Graphics3D content, the per-entry exactness of H and the H strings, `drawShaft` transcribed but unreachable, the framing helpers, `stateFromSettings`; pure), `main.js` (the Manipulate on `shared/manipulate.js`: slider grid as a custom control, grip, check box, popup, DH table, H display, the model's Graphics3D drawn by `shared/graphics3d-view.js` `View3D` with clipping; automation hook; v0.1.21), `index.html`; common (CC BY-NC-SA, DH family, owner dh-parameters): `demos/common/dh-chain.js` (`dhTransform` with the explicit exact-angle path, `computeTd(Ad, {chop: false})`), `demos/common/robot-draw.js` (`drawJoint` variant `'ac'`, `drawGripper`, `GROUND`), `shared/graphics3d.js`, `shared/graphics3d-three.js` (`addPrims`, `disposeGroup`); shared (MIT): `shared/exact-pi.js` (`trigPi`, through `dh-chain.js` and for the exactness flags), `shared/mma-text.js` (`piFraction`, `fractionText`), `shared/ui.js` (joint sliders with `labeled: 'text'`, `plus: false`, `steps: 'mma'` and `format`; grip slider with `steps: 'mma'`), `shared/ui-extra.js` (`addCheckbox`, `addPopup`), `shared/mma-extra.js` (`mmaNumberString`, `nDigits`), `shared/mma-lighting.js`, `shared/three-helpers.js` (non-square `createViewer`) |
| Role in the project | further demonstration (batch B) |

## 1. Purpose and background

A catalogue of serial robot arms described by Denavit–Hartenberg parameters: the user picks one of nine robots
(planar elbow, elbow, anthropomorphic, Stanford, cylindrical, spherical, SCARA, Cartesian, CNC; 2 to 6 joints) from a
popup, sees its DH table, moves each joint variable (θ*i for revolute, d*i for prismatic joints) with a slider, opens
and closes the gripper, and reads the end-effector transform H = Td[dof] below the picture. "show robot" switches the
links and joints after the first off. The code descends from the Robotica package [1] and shares its drawing functions
and DH chain with "Robot Singularities in Three-Link Manipulators" (already ported).

## 2. Scope

In scope: the controls (variable slider grid, grip slider with ⊕, "show robot", the DH-parameter popup, the DH table),
the nine DH tables, the DH chain (`dhTransform`, `Ad`, `Td`), `drawJoint`, `drawCoordAxes`, `drawZArrow`, `drawGripper`,
the Graphics3D options (fixed PlotRange ±3 with clipping, ViewAngle 12°, ImageSize {420, 350}), the H display with
the original's number formats, mouse rotation, the saved opening state and the original's quirks (§7).
Out of scope (would need a design entry first): user-defined DH tables (the original's popup is the only input),
inverse kinematics, Jacobians, Autorun/bookmarks.

## 3. Users and use cases

| ID | User | Use case |
|----|------|----------|
| UC-AC-01 | student | compare the common arm types and their DH tables |
| UC-AC-02 | student | move each joint variable and watch the arm and its end-effector transform H |
| UC-AC-03 | student | hide the robot to see the base joint and the end-effector frame only |
| UC-AC-04 | tester | compare the port with the saved state, the snapshots and the Mathematica harness |

## 4. Features

### 4.1 Controls

| ID | Feature | Reason | Since | Verified by |
|----|---------|--------|-------|-------------|
| F-AC-01 | Joint slider grid (a `Dynamic[Grid[…]]` over `{i, dof}`): revolute joints `{Subsuperscript["θ", i, "*"], Slider[params[[i]] = 0; Dynamic[params[[i]]], {-π, π, π/32}, ImageSize->Small], Dynamic[params[[i]]]}`, prismatic joints `{Subsuperscript[Style["d", Italic], i, "*"], Slider[params[[i]] = 0.5; Dynamic[params[[i]]], {1/2, 3/2, 1/20}, ImageSize->Small], Dynamic[params[[i]]]}`; the value is plain text (no field, no ⊕); the grid is rebuilt when the robot changes, which resets params[[1 … dof]] (Q-AC-04, K-AC-07); `{{params, ConstantArray[0,20]}, ControlType->None}` | move the joints (UC-AC-02) | v0.1.16 | unit "slider grid: θ*i -π..π step π/32 reset 0, d*i 1/2..3/2 step 1/20 reset 0.5 (machine), only params 1..dof are reset"; unit "slider value text: 0, 0.5 (machine reset), -13π/16, 11/20, 1/2, 3/2 (exact slider values)"; unit "selecting another robot resets the joints, selecting the same robot keeps them"; e2e "choosing planar elbow rebuilds two θ* sliders and H reads 2.5"; e2e "dragging the θ*1 slider turns the arm and changes H"; M-AC-03; M-AC-04; M-AC-05 |
| F-AC-02 | Grip slider `Control@{{g,1,"grip"},0,1,0.01,ImageSize->Small,Appearance->"Labeled"}` with value field and ⊕ panel | open and close the gripper | v0.1.16 | e2e "the grip slider opens and closes the gripper"; e2e "has the controls of the original with their defaults" |
| F-AC-03 | Check box `Control@{{showRobot,True,"show robot"},{True,False}}` | hide joints 2 … dof (UC-AC-03) | v0.1.16 | e2e "show robot off leaves joint 1 and the gripper"; golden "arm configurations: picture 3 (grip 0.62, show robot off) shows only joint 1 and the gripper at (2, 0, 0.25)" |
| F-AC-04 | Text "DH parameters for robot arm" above `Control@{{DHParameters, <anthropomorphic table>, ""}, {<table> -> "planar elbow", … -> "elbow robot", … -> "anthropomorphic", … -> "Stanford robot", … -> "cylindrical robot", … -> "spherical robot", … -> "SCARA robot", … -> "Cartesian robot", … -> "CNC robot"}, ControlType->PopupMenu}` (default "anthropomorphic") | choose the robot (UC-AC-01) | v0.1.16 | unit "the popup has the 9 robots in the original order with dof 2, 3, 6, 6, 3, 3, 4, 4, 3 and their joint types"; e2e "choosing CNC robot shows three d* sliders at 0.5 and the table's θ column -π/2, -π/2, 0"; e2e "has the controls of the original with their defaults" |
| F-AC-05 | DH table control `Control@{{unusedVariable,1,""},(makeDHControl[#1,DHParameters]&),ImageSize->100}`: `Text[Grid[Transpose[{jointnum, jointtype, a, alpha, d, theta}], Frame->All]]` with the header row "joint, type, r, α, d, 0" (Q-AC-03) and per joint its number, type ("r"/"p"), r, α, d, θ, where the joint variable is shown as θ*i (`dhp[[1,i]] == "r"`) or d*i | read the DH table (UC-AC-01) | v0.1.16 | unit "the DH table: header joint, type, r, α, d, 0 (θ header left at 0), θ*i for revolute and d*i for prismatic joints"; golden "arm configurations: picture 2 (anthropomorphic) shows the six θ* sliders at 0, the DH table and H = 1. 0. 0. 2. / 0. -1. 0. 0. / 0. 0. -1. 0.25 / 0. 0. 0. 1."; golden "arm configurations: picture 6 (CNC robot) shows d* sliders at 0.5, the table's θ column -π/2, -π/2, 0 and H = 0. 1. 0. 0.5 / 0. 0. 1. 0.5 / 1. 0. 0. 0.5 / 0. 0. 0. 1." |
| F-AC-06 | Layout (`ControlPlacement->Left`): slider grid, "", grip, "", show robot, "", the popup's caption, popup, DH table; picture and H in a centred Column at the right | the original's layout | v0.1.16 | e2e "has the controls of the original with their defaults"; M-AC-02 |

### 4.2 Model (`robots.js`, `model.js`, `demos/common/dh-chain.js`, `shared/exact-pi.js`)

| ID | Feature | Reason | Since | Verified by |
|----|---------|--------|-------|-------------|
| F-AC-07 | The nine DH tables of the popup ({jointtypes, a, alpha, d, theta}), transcribed exactly, with machine entries 1.5 (planar elbow a2, anthropomorphic d1), 0.75, 0.5 kept machine and all others exact | the robots (UC-AC-01) | v0.1.16 | unit "the popup has the 9 robots in the original order with dof 2, 3, 6, 6, 3, 3, 4, 4, 3 and their joint types"; unit "H at the reset values equals an independent DH product for all 9 robots"; harness "H-AC-02"; harness "H-AC-03"; harness "H-AC-04"; harness "H-AC-05"; harness "H-AC-06"; harness "H-AC-07"; harness "H-AC-08"; harness "H-AC-09" |
| F-AC-08 | Body bookkeeping each evaluation: `DHdim = Dimensions[DHParameters]; dof = DHdim[[2]]; Table[{jointtype[i] = ToString[DHParameters[[1,i]]], a[i] = …[[2,i]], alpha[i] = …[[3,i]], d[i] = …[[4,i]], theta[i] = …[[5,i]]}, {i, 1, DHdim[[2]]}]` | the joint data of the chosen robot | v0.1.16 | unit "the popup has the 9 robots in the original order with dof 2, 3, 6, 6, 3, 3, 4, 4, 3 and their joint types"; harness "H-AC-01" |
| F-AC-09 | `Ad = Table[If[MemberQ[{"Prismatic","prismatic","P","p"}, ToString[DHParameters[[1,i]]]], dhTransform[params[[i]], a[i], theta[i], alpha[i]], dhTransform[d[i], a[i], params[[i]], alpha[i]]], {i, 1, DHdim[[2]]}]`; `Td[1] = Ad[[1]]; Td[i] = Chop[Td[i-1].Ad[[i]]]`; `dhTransform` identical to robot-singularities'; the Chop acts on the TransformationFunction (entries below 10^-10 become 0., K-AC-01) and a product with a machine factor is Mathematica's machine Dot (fused multiply-add chain, K-AC-02) (Q-AC-05) | forward kinematics (UC-AC-02) | v0.1.16 | unit "dhTransform, Ad and Td are those of robot-singularities generalised to dof joints, machine products are the fused Dot, chopped"; harness "H-AC-11"; unit "H at the reset values equals an independent DH product for all 9 robots"; harness "H-AC-14" |
| F-AC-10 | Exactness of every value and of every H entry, because it decides the H format: revolute slider values are exact multiples of π/32 (reset exact 0), prismatic slider values exact multiples of 1/20 (reset machine 0.5). At the reset values every Ad entry is a plain number and H is all machine as soon as one machine number enters (pictures 2, 4, 6) or all exact (picture 5); a TransformationFunction with one machine entry is all machine, also away from the reset values (H-AC-18, H-AC-11: K-AC-09 resolved), so H is either all machine or all exact (Q-AC-06) | the original's H display | v0.1.16 | unit "exactness at the reset values: H is exact for the elbow robot and for exact prismatic values, all machine as soon as a machine number enters (1.5, 0.75, 0.5, the 0.5 reset)"; unit "exact multiples of π/2 give exact zeros in H (no 6.1×10^-17 residues)"; e2e "moving all three CNC sliders switches H to the two-digit exact display (original quirk)"; unit "a TransformationFunction with one machine entry is all machine, also away from the reset values (K-AC-09, H-AC-18)"; harness "H-AC-12"; harness "H-AC-16"; harness "H-AC-18" |
| F-AC-11 | Opening state = the live state (output cell, raw line 1948; = snapshot 1's Settings, line 5256), equal here to the initial settings (stored `"Variables"`, raw line 2349), which the port's "Initial settings" restores (A-AC-01) = the source defaults: anthropomorphic table, dof 6, params = 20 zeros (exact), g = 1, showRobot True | the original's opening picture | v0.1.16 | golden "arm configurations: the live state (= the initial settings) is the opening state of the port"; golden "arm configurations: the six snapshot Settings load as port states and are fixed points of one evaluation"; e2e "Initial settings restores the opening state" |

### 4.3 Graphics (three.js) and the H display

| ID | Feature | Reason | Since | Verified by |
|----|---------|--------|-------|-------------|
| F-AC-12 | `Graphics3D[{{LightBrown, Cylinder[{{0,0,-2/5},{0,0,-1/5-1/20}}, 2.2]}, <joint 1 untransformed: drawJoint[jointtype[1], d[1], a[1], params[[1]]] (revolute) or drawJoint[jointtype[1], params[[1]], a[1], theta[1]]>, If[dof == 1, GeometricTransformation[drawGripper[g, 0], Chop[Td[dof]]], If[showRobot, Table[<joint i in Td[i-1]>, {i, 2, dof}]], <drawShaft …>], GeometricTransformation[drawGripper[g, 0], Chop[Td[dof]]]}, …]` (Q-AC-01, Q-AC-02, Q-AC-08) | the arm (UC-AC-02, UC-AC-03) | v0.1.16 | unit "drawShaft is never drawn (4-argument If) and show robot off leaves joint 1 and the gripper"; unit "the gripper is always drawGripper[g, 0] (hand along z)"; e2e "loads without errors and draws the ground, the arm and H"; harness "H-AC-15" |
| F-AC-13 | `drawJoint[j, d, r, Theta]` of this Demonstration (jr = 1/5, ar = 1/20): `drawCoordAxes[jr]`, `Opacity[1]`, `{Opacity[0.5], Gray, If[MemberQ[{"Prismatic","prismatic","P","p"}, j], Cuboid[{-ar,-ar,-1+d-jr-.01},{ar,ar,d+.01}], Cylinder[{{0,0,Min[-ar,d-jr]-.01},{0,0,Max[ar,d]+.01}}, ar]]}`, `{LightBlue, If[j == "p", {Cuboid[{-jr,-jr,-jr},{jr,jr,jr-.1}], Cuboid[{-jr,-jr,jr},{jr,jr,jr+.05}]}, {Cylinder[{{0,0,-jr-.05},{0,0,jr+.05}}, .7 jr]}]}`, `Rotate[{Opacity[0.5], Gray, Cuboid[{-ar,-ar,d-ar},{r,ar,d+ar}]}, Theta, {0,0,1}]`; `drawGripper[g, r]` identical to "Denavit–Hartenberg Parameters for a Three-Link Robot" (called with r = 0) | the joints and gripper | v0.1.16 | unit "drawJoint of this Demonstration: translucent axis and link, two light-blue cuboids for p, cylinder radius 0.14 from -0.25 to 0.25 for r"; unit "the gripper is always drawGripper[g, 0] (hand along z)"; unit "drawJoint variant 'ac' is the source's drawJoint, element by element (verified against the raw notebook)"; harness "H-AC-01" |
| F-AC-14 | Options `SphericalRegion->True, ImageSize->{420,350}, Boxed->False, ViewAngle->12Degree, PlotRange->3{{-1,1},{-1,1},{-1,1}}`; default ViewPoint {1.3, −2.4, 2} and Lighting; everything beyond ±3 is clipped (e.g. the Stanford robot's end frame at z = 3.5 for d*3 = 3/2) (D-AC-01) | the original's fixed picture | v0.1.16 | golden "arm configurations: fixed framing, the ground disc is 716 px wide in all five pictures (camera model 719 px)"; unit "PlotRange ±3 clips the Stanford end frame at d*3 = 3/2 (z = 3.5) and the Cartesian one at d* = 3/2 (z = 3.5)"; e2e "the plot range ±3 clips the arm (Stanford robot with d*3 = 3/2)"; harness "H-AC-17" |
| F-AC-15 | Below the picture `Text@Row[{Style["H", Italic], " = ", MatrixForm[N[Chop[Td[dof]], 2]]}]`, displayed as "H = TransformationFunction[(" 4 × 4 matrix with a vertical bar before the last column and a line before the last row ")]"; machine entries in machine format ("1.", "0.", "0.25"), exact entries with two significant digits ("1.0", "−0.71") and exact zeros as "0", decided per entry (which entries are machine away from the reset values is K-AC-09) (Q-AC-06, D-AC-04, D-AC-05) | the end-effector transform (UC-AC-02) | v0.1.16 | unit "H display: anthropomorphic at zero reads 1. 0. 0. 2. / 0. -1. 0. 0. / 0. 0. -1. 0.25 / 0. 0. 0. 1."; unit "H display: elbow robot at zero reads 1.0 0 0 2.0 / 0 0 -1.0 0 / 0 1.0 0 1.0 / 0 0 0 1.0"; unit "two-digit display of exact entries: cos π/32 gives 1.0, sin π/32 0.098, -1/√2 -0.71, 1/4 0.25, 1 + 1/√2 1.7"; unit "machine display: 1., 0., 0.25, 2.5, -1. and 6.12323×10^-17"; golden "arm configurations: picture 4 (planar elbow) shows H = 1. 0. 0. 2.5 / 0. 1. 0. 0. / 0. 0. 1. 0. / 0. 0. 0. 1."; golden "arm configurations: picture 5 (elbow robot) shows H = 1.0 0 0 2.0 / 0 0 -1.0 0 / 0 1.0 0 1.0 / 0 0 0 1.0"; harness "H-AC-10"; harness "H-AC-11"; harness "H-AC-13" |
| F-AC-16 | The picture can be rotated with the mouse | see the arm from all sides | v0.1.16 | e2e "dragging in the picture rotates the view"; M-AC-08 |
| F-AC-17 | Title, caption and Details & Citations text (DOF, DH parameter names, snapshot captions, two references) | explains the Demonstration | v0.1.16 | M-AC-01 |

### 4.4 Port additions

| ID | Feature | Reason | Since | Verified by |
|----|---------|--------|-------|-------------|
| A-AC-01 | "Initial settings" button: back to the initial settings (the stored `"Variables"`, here the opening state) | stands in for the Manipulate ⊕ menu → Initial Settings | v0.1.16 | e2e "Initial settings restores the opening state" |
| A-AC-02 | `window.__demo` automation hook (state, setState, Td list, H strings, exactness, primitive summary, clipping planes, camera position) | automated tests | v0.1.16 | e2e "loads without errors and draws the ground, the arm and H" |
| A-AC-03 | "All demos" link | site navigation | v0.1.16 | inventory; M-GEN-01 |
| A-AC-04 | Credit footer: original title, authors, licence, adaptation notice | required by CC BY-NC-SA 3.0 | v0.1.16 | e2e "attribution on" |
| A-AC-05 | Start-up notice (watchdog, `<noscript>`) and WebGL 2 notice when the page cannot start (DEC-22) | a clear message instead of an empty page | v0.1.16 | e2e "start-up notice when"; e2e "WebGL 2 notice on" |
| A-AC-06 | standalone bundle (owner rule R-A): `npm run bundle -- arm-configurations` builds `dist/arm-configurations/` with exactly the files the app imports, the licences, a generated README and a root `index.html` (§6, "Building and deploying this app alone") | anyone can host this one app elsewhere without the rest of the site (owner rule R-A, 2026-10-17) | v0.1.16 | e2e "bundle: arm-configurations runs from its own folder" |
| A-AC-07 | Redraw after a WebGL context loss (the viewer redraws when the browser restores the context) | a picture instead of a blank canvas after a GPU reset | v0.1.16 | e2e "redraws after a WebGL context loss (port addition)" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|-------------|---------|
| `slider-params-*` | F-AC-01 |
| `slider-g` | F-AC-02 |
| `value-g` | F-AC-02 |
| `plus-g` | F-AC-02 |
| `play-g` | F-AC-02 |
| `stepback-g` | F-AC-02 |
| `stepfwd-g` | F-AC-02 |
| `check-showRobot` | F-AC-03 |
| `popup-DHParameters` | F-AC-04 |
| `scene-canvas-workspace` | F-AC-14, F-AC-16 |
| `reset` | A-AC-01 |
| `crumbs` | A-AC-03 |
| `details` | F-AC-17 |
| `credits` | A-AC-04 |

Slider names: `params-1` … `params-<dof>` (the grid), `g`. Not interactive, therefore not rows of this inventory but
stable test ids of the page: `value-params-*` (the plain value text beside each joint slider), `ctl-*` (control rows),
`dh-table` (F-AC-05), `h-matrix` (F-AC-15).

## 6. Design

### 6.1 Files and responsibilities

- `robots.js` (pure): `ROBOTS` = the nine popup entries in the original's order, each `{name, jointtype, a, alpha,
  d, theta}` with every entry `{v, exact}` (exact angles with `pi: n` for nπ/32) or `{q: i}` for the table's
  `Subscript[q, i]`; `dhTableRows(robot)` (the makeDHControl grid including the "0" header; labels by
  `shared/mma-text.js` and `mmaNumberString`), `entryText`, `cellText`.
- `model.js` (pure): `initialState()` (the live state = the initial settings), `selectRobot(st, index)` (reset of
  params[[1 … dof]] as the grid rebuild does; the same robot changes nothing), `evaluate(st)`: DHdim, dof (assigned),
  joint arrays, `Ad` (`dhTransform` of `demos/common/dh-chain.js` with the explicit exact-angle path for exact angles),
  `Td` (`computeTd(Ad, {chop: false})`), the Graphics3D content (`drawJoint(…, {variant: 'ac'})`, `drawGripper(g, 0)`,
  `GROUND` of `demos/common/robot-draw.js`; `drawShaft` transcribed, never called), the per-entry exactness of Ad, Td and
  H (`dhKinds`, `dotKinds`, §6.4) and the H strings (`hDisplay`, `entryString`); `valueText` (slider value texts),
  `fixedCamera` / `groundWidthPt` (framing check, D-AC-01), `stateFromSettings` (golden data → port state).
- `main.js` (v0.1.21) is one `Manipulate({…})` call of `shared/manipulate.js`: the slider grid as a `Control` with
  `shared/ui.js` `Controls.slider` (`plus: false`, `labeled: 'text'` — a plain value text as the original's
  `Dynamic[params[[i]]]`; revolute on the integer n = −32 … 32, value nπ/32 exact; prismatic on k = 10 … 30, value k/20
  exact; the reset value 0.5 is machine and shown "0.5" until the slider moves; `format` from `shared/mma-text.js`),
  rebuilt with the DH table on a robot change, a reset and setState (`buildGrid`); the grip slider spec on the path
  `g.v` with its ⊕ panel (`Assign` records the exactness, `Moved` restores "1" vs "1."); the check box and the popup
  (`Assign` = `selectRobot`) placed in their own containers (`parent`); the H display in `after`; `merge` = the hook's
  setState rule. The picture is the model's `graphic` with its own options (PlotRange ±3, ViewAngle 12°, ImageSize
  {420, 350}): `View3D` (`shared/graphics3d-view.js`) makes the non-square viewer (fixed camera, never refitted) with
  `addMathematicaLighting`, `LinearSRGBColorSpace` and the six clipping planes at ±3; the automation hook `window.__demo`.

### 6.2 Reuse, line by line against robot-singularities (RS)

| Original code here | RS original | RS port code | Verdict for this app |
|--------------------|-------------|--------------|----------------------|
| `drawZArrow`, `drawCoordAxes` | identical | `model.js` | shared (common/robot-draw.js) |
| `dhTransform` | identical | `robots.js` `dhTransform` | shared (common/dh-chain.js); RS's machine path stays the default, this app passes exact angles through the explicit exact-angle argument (`shared/exact-pi.js`) |
| `Ad = Table[If[<prismatic>, dhTransform[params[[i]], a, theta, alpha], dhTransform[d, a, params[[i]], alpha]]]` | identical structure; RS tests `"p" == jointtype[i]`, here `MemberQ[{"Prismatic","prismatic","P","p"}, ToString[…]]` | `robots.js` `computeAd` (DOF = 3) | shared, generalised to dof = 2 … 6 |
| `Td[1] = Ad[[1]]; Td[i] = Chop[Td[i-1].Ad[[i]]]` | identical | `robots.js` `computeTd` (applies `chop` 1e-10) | `model.js` evaluates the chain itself (exactness per matrix): a product with a machine factor is `mul4Fma` of `common/dh-chain.js` (Mathematica's machine Dot) followed by `chop` (K-AC-01, K-AC-02); an exact product is the plain `mul4` |
| ground cylinder | identical | `model.js` `GROUND` | shared (common/robot-draw.js) |
| joint 1 untransformed, joints 2 … dof as `GeometricTransformation[drawJoint[…], Td[i-1]]`, joint variable in θ or d by type | identical structure (RS tests `"r" == jointtype[i]`, here `MemberQ[{"Revolute","revolute","R","r"}, …]`); RS draws it inside `If[showRobot, {…}]` together with the wrist centre, here joint 1 is always drawn and only joints 2 … dof depend on showRobot | `model.js` `robotGraphics` (DOF = 3) | own evaluate (different If structure, dof 2 … 6), using shared pieces |
| `drawJoint` | differs: translucent gray axis and link (`Opacity[0.5]`), prismatic axis from `-1+d-jr-.01`, link always drawn, axis type test by MemberQ — the joint body (two cuboids / cylinder .7 jr) is RS's | `model.js` `drawJoint` | variant `'ac'` of `drawJoint` in common/robot-draw.js (a hybrid of RS's and the DH Demonstration's) |
| `drawGripper[g, 0]` at `Chop[Td[dof]]` | `drawWristCenter[0]` (axes + orange point) | `model.js` | `drawGripper` of common/robot-draw.js, shared with the DH Demonstration (identical definition) |
| `drawShaft` | — | — | transcribed but unreachable (Q-AC-01) |
| slider grid `Slider[params[[i]] = 0; Dynamic[…], {-π, π, π/32}]`, `{1/2, 3/2, 1/20}` reset 0.5 | same idiom (`{-π 1.01, π 1.01, 0.01π}`, `{0, 1, 0.01}`, Appearance "Labeled") | `main.js` `buildSliders` (index range input, text field) | same rebuild pattern with `shared/ui.js` sliders (`plus: false`, `format`); different ranges, exact values, plain (non-editable) value text, no 6.28 wrap |
| popup of robots | `iType` popup of 16 names | `addPopup` | same helper; here the popup value is the table itself |
| `Graphics3D` options `ViewAngle->12Degree, PlotRange->±3, ImageSize->{420,350}` | automatic range and angle, ImageSize 325 | `View3D` SphericalRegion fit (bounding sphere × 1.26) | different framing: fixed box and angle, non-square, clipping (D-AC-01) |
| H display `MatrixForm[N[Chop[Td[dof]], 2]]` | — | — | new `hDisplay` (`mmaNumberString` for machine entries, `nDigits(x, 2)` of shared/mma-extra.js for exact ones) |
| DH table `makeDHControl` | — | — | new |

Robot tables compared with RS's Type table (N-AC-02): "cylindrical robot" and "CNC robot" are identical to RS's
cylindrical and CNC arms; "Stanford robot" equals RS's Stanford arm in its first three joints; "elbow robot" differs
in d1 (1 here, 2 in RS); "spherical robot" has a = {0.75, 1, 0} (RS: {0, 0, 0}); "SCARA robot" (4 joints) and
"Cartesian robot" (4 joints) differ completely.

### 6.3 State model and evaluation order

State: `robot` (0-based index 0 … 8 into `ROBOTS`; the original stores the table itself in `DHParameters`), `params` (20
entries `{v, exact}` with `pi: n` for nπ/32 or `frac: k` for k/20), `g` (`{v, exact}`), `showRobot`, and `dof`
(assigned by the body). A robot change runs
`selectRobot` (grid rebuild → params[[1 … dof]] reset, Q-AC-04) and then one evaluation; a slider change runs one
evaluation. Evaluation order as in the body: DHdim, dof, joint arrays, Ad, Td (chopped, fused machine Dot), ground, joint 1, joints 2 … dof
(if showRobot), gripper at Td[dof], then H's exactness and strings.

### 6.4 Numerics and the H display

- Angles from the tables and sliders are integers n (nπ/32); `shared/exact-pi.js` gives exact 0 and ±1 at multiples of
  π/2, so machine-format H shows "0." where Mathematica has an exact zero turned machine (no 6.12323×10^-17).
- Exactness (K-AC-09, resolved by H-AC-18 and H-AC-11). Each Ad entry is tagged plain-exact (a rational: 0, ±1,
  1/2 …), symbolic-exact (contains Cos/Sin of a non-right-angle multiple of π/32) or machine, and a matrix with one
  machine entry is all machine (`allMachine`): Mathematica 15.0.1 records every entry of every Td[i] of the
  anthropomorphic arm at θ*1 = π/32 as MachinePrecision, already Td[1] = Ad[[1]] (its d = 1.5 is the only machine
  number), so H is either all machine or all exact. Products of exact matrices are formed entry by entry (an exact 0
  factor makes the term exact 0). Machine entries print with `mmaNumberString(v, {isReal: true})` (6 significant
  digits, "1.", "0.", "0.995185"); exact entries with `nDigits(v, 2)` ("1.0", "0.098", "−0.71", "2.8") and exact zeros as
  "0"; the port treats an exact entry with |x| < 1e-12 as an exact zero (D-AC-05). The golden tests derive the expected
  text of every entry from the recorded boxes `ToBoxes[MatrixForm[N[Chop[Td[dof]], 2]]]` (H-AC-01 … H-AC-18) except a
  two-digit tie (K-AC-04) and the high-precision case of P-AC-01.
- Products: a product with a machine factor is Mathematica's machine Dot, each entry the fused multiply-add chain
  fma(a4, b4, fma(a3, b3, fma(a2, b2, a1·b1))) (`mul4Fma`; H-AC-11 reproduces Td[3] … Td[6] bit for bit, the plain sum
  Σk A[i][k]·B[k][j] was 1 ulp off in 3 entries), then `Chop` (entries below 10^-10 become 0., shown "0."; K-AC-01):
  the residues such as 1.6653345369377348e-16 that the port showed before v0.1.17 are gone (K-AC-02). Exact products
  use the plain sum of doubles (their values only feed the two-digit display).

### 6.5 Building and deploying this app alone

Owner rule R-A (2026-10-17): this one app can be taken out of the repository and hosted anywhere. One command builds it:

```
npm run bundle -- arm-configurations
```

`tools/bundle-app.mjs arm-configurations` (npm script `bundle`) writes `dist/arm-configurations/`: the app with exactly the files it needs — its HTML, its modules and everything they import, recursively, with the repository's relative layout kept — plus the licence texts that apply, a generated `README.md` (title, the original's credits, licence, "serve this folder with any static web server", how to run its tests in the full repository) and a root `index.html` that opens the app (the "All demos" link of the bundled page leads to that root page). Nothing else. Contents (generated with `npm run bundle -- --update-docs`; unit "bundle contents listed in DESIGN.md match the collector" keeps the table current):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/arm-configurations/`) | 4 | `index.html`, `main.js`, `model.js`, `robots.js` |
| `shared/` | 23 | `clock.js`, `exact-pi.js`, `graphics-extras.js`, `graphics.js`, `graphics3d-three.js`, `graphics3d-view.js`, `graphics3d.js`, `manipulate.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `mma-lighting.js`, `mma-text.js`, `mma.js`, `random.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `three-helpers.js`, `ui-extra.js`, `ui-interval.js`, `ui.js` |
| `demos/common/` | 2 | `dh-chain.js`, `robot-draw.js` |
| `vendor/three/` | 9 | `addons/controls/OrbitControls.js`, `addons/lines/Line2.js`, `addons/lines/LineGeometry.js`, `addons/lines/LineMaterial.js`, `addons/lines/LineSegments2.js`, `addons/lines/LineSegmentsGeometry.js`, `addons/renderers/CSS2DRenderer.js`, `three.core.js`, `three.module.js` |
| added by the bundler | 8 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/arm-configurations/DESIGN.md`, `vendor/three/LICENSE` |
<!-- bundle-contents:end -->

Requirements: WebGL 2 (three.js r186; `shared/requirements.js` shows the WebGL 2 notice without it) and ES modules with import maps (current Firefox, Chromium, WebKit).

Verified by e2e "bundle: arm-configurations runs from its own folder" (A-AC-06): the test runs the bundle command, serves `dist/arm-configurations/` alone with a static file server (no access to the rest of the repository), opens the root `index.html`, follows it to the app and checks: no console error, no failed request, every request stays inside the folder, the controls of §5 are present and the first picture is drawn (a WebGL 2 canvas with a non-empty frame); it also compares the folder's file list with the generated list in its `README.md`.

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

| ID | Kind | Description |
|----|------|-------------|
| Q-AC-01 | quirk kept | `drawShaft` is dead code: it sits in the fourth argument of `If[dof == 1, …, …, …]`, which Mathematica evaluates only when `dof == 1` is neither True nor False. With "show robot" off only joint 1 and the gripper are drawn (picture 3). |
| Q-AC-02 | quirk kept | The gripper is always `drawGripper[g, 0]`, i.e. the "pointing along d" branch (hand along the last z axis), whatever the last link length. |
| Q-AC-03 | quirk kept | The DH table's θ column header reads "0": `makeDHControl` sets the headers of type, r, α and d but leaves `theta[[1]]` at its ConstantArray value 0 (pictures 1–6). |
| Q-AC-04 | quirk kept | Choosing a robot rebuilds the slider grid, which runs `params[[i]] = 0` (revolute) or `params[[i]] = 0.5` (prismatic, a machine number at the slider's left end 1/2) for i = 1 … dof (as Q-RS-02); params beyond dof keep their values (unused). Choosing the same robot changes nothing. |
| Q-AC-05 | quirk kept | `Chop` acts on the TransformationFunctions `Td[i]` (H-AC-14: `Chop[TransformationFunction[{{1., 0., 0., 1.*^-17}, …}]]` gives the machine 0. there), but the TransformationFunction keeps a machine matrix, so a chopped entry still shows "0." (picture 2), never "0". The port chops machine products (v0.1.17; before, it inferred from picture 2 that Chop does nothing, K-AC-01). The same `Td[i] = Chop[…]` stands in robot-singularities (which chops) and Robot Manipulator Workspaces (chops since v0.1.17, Q-MW-09). |
| Q-AC-06 | quirk kept | H's number format depends on exactness: CNC at the reset shows "0. 1. 0. 0.5 …" (machine), after moving all three sliders by one step "0 1.0 0 0.55 …" (exact, two digits, all plain numbers); the elbow robot shows the two-digit format; robots with machine table entries show the machine format at the reset values, and after a joint moves to a non-right angle possibly a mix of both (K-AC-09). |
| Q-AC-07 | quirk kept | Mixed joint-type tests (MemberQ of four spellings for Ad, joint 1 and the axis, `j == "p"` for the joint body, `dhp[[1,i]] == "r"` in the table); consistent for the nine tables, which use "r" and "p" only. |
| Q-AC-08 | quirk kept | With dof == 1 the gripper would be drawn twice; no table has one joint (unreachable). |
| Q-AC-09 | quirk kept | Translucent gray axes and links; a prismatic axis bar runs from −1 + d − jr − 0.01 to d + 0.01 (as Q-DH-02); a link with r = 0 is still a small cuboid at the joint (picture 3: the box on top of joint 1's axis). |
| D-AC-01 | deviation | Framing: camera at the PlotRange centre (0, 0, 0) + ViewPoint × 6, vertical field of view 12° over the image height 350, image 420 × 350 (non-square: the non-square `createViewer` of `shared/three-helpers.js`, owner Manipulability Ellipsoid). Fits all five pictures: ground disc 716 px wide at 2 px per pt, model 359.6 pt = 719 px (0.4 %). Fixed: the picture does not rescale when the arm moves. |
| D-AC-02 | deviation | Colours and lighting as D-RS-02. |
| D-AC-03 | deviation | Sizes and edges as D-RS-03 (`Thick` 3 px; cuboid edges and cylinder rims 1 px black with the face's opacity). |
| D-AC-04 | deviation | H is an HTML block "H = TransformationFunction[(" grid ")]" with the bar and line of Mathematica's TransformationFunction box; typography approximate; slider value text and table entries with inline fractions ("−13π/16", "11/20", "π/2"). |
| D-AC-05 | deviation | Exactness is emulated with flags; exact entries are computed in doubles (1–2 ulp from Mathematica's N of the exact value, H-AC-10) and an entry with \|x\| < 1e-12 is printed "0". Mathematica prints "0" only for symbolically simplified zeros; for an exact zero it does not simplify (radicals) it prints a high-precision H (K-AC-03, P-AC-01). |
| D-AC-06 | deviation | Rotation with OrbitControls (as D-RS-07). |
| D-AC-07 | deviation | The slider grid is rebuilt synchronously on a robot change; any transient state of the original's two Dynamics (K-AC-06) is not reproduced. |
| D-AC-08 | deviation | Translucent parts double-sided and sorted per object (as D-RS-08). |
| K-AC-01 | resolved (v0.1.17) | Chop on a TransformationFunction (Q-AC-05). Evidence H-AC-14 (Mathematica 15.0.1): `Chop[TransformationFunction[{{1.,0.,0.,1.*^-17},{0.,1.,0.,0.},{0.,0.,1.,0.},{0.,0.,0.,1.}}]]` = `TransformationFunction[{{1.,0.,0.,0.},…}]` — Chop acts, the entry becomes the machine 0. (the matrix stays machine, so it prints "0.", not "0"); `Chop[Td[dof]] === Td[dof]` is True at the reset (nothing to chop). The port chops every machine product (`model.js`). |
| K-AC-02 | resolved (v0.1.17) | Residues of machine zeros and the last bits of machine H. Evidence H-AC-11 (anthropomorphic at {−11, −27, 19, 0, −8, 8}·π/32): Td[5][1,3] and Td[5][2,3] are 0. where the port had −2.7755575615628914e-17 and 1.6653345369377348e-16 (shown "1.66533×10^-16"), and Td[3] … Td[6] differ from the plain sum in the last bit (Td[6][2,1] −0.9569403357322087 recorded, −0.9569403357322088 before); the fused multiply-add Dot plus Chop reproduces all six Td bit for bit. |
| K-AC-03 | answered, difference kept (P-AC-01) | `N[x, 2]` of an exact zero that is not simplified. Evidence H-AC-10 (elbow robot at θ = (0, 3π/8, π/4)): `N[Chop[Td[dof]], 2]` gives N::meprec ($MaxExtraPrecision = 50 reached on H[1,4]) and an H whose entries are not two-digit numbers: H[1,4] = `0``51.41433341922468` (a zero of accuracy 51.4), the other non-integer entries carry precision ≈ 51 (`-0.38268343236508977172845998403039886676134456248562704143380063562754603331323`51.0878212339189`), the ±1 entries `1.`52.`; the original therefore shows long digit strings in this state where the port shows "−0.38 −0.92 0 0 / … / 0 0 0 1.0". Matching needs Mathematica's adaptive-precision N (proposal P-AC-01); the golden test asserts the recorded boxes and the port's text. |
| K-AC-04 | known issue (lead, not decided by the record) | Two-digit rounding of exact ties (cylindrical robot with d*2 = 27/20: z = 47/20 = 2.35 → "2.3" or "2.4"?). H-AC-13 records the kernel's box `2.35`2.` (N[47/20, 2]); which digits the front end draws for it is front-end formatting, not in the record (M-AC-07). The port rounds the double 2.3500000000000001 and prints "2.4". |
| K-AC-05 | known issue (lead) | The bare `Slider[…, {1/2, 3/2, 1/20}]` and `{-π, π, π/32}` are assumed to give exact values (like the DH Demonstration's labelled sliders, whose labels show "−13π/16"); none of the six pictures shows a moved joint. M-AC-04. |
| K-AC-06 | known issue (lead) | On a robot change the grid's Dynamic may re-render with the old dof before the body updates it (e.g. Part errors for joints 3 … 6 when going from anthropomorphic to planar elbow). M-AC-05. |
| K-AC-07 | known issue (lead) | The body assigns `dof` on every evaluation; if that re-rendered the grid, every slider move would reset the joints. Robot-singularities' identical idiom (`Type`) keeps slider values (its owner state), so the port assumes no reset; all six pictures happen to show reset values. M-AC-05. |
| K-AC-08 | known issue (lead) | Whether a mouse rotation survives a control change (as K-RS-07). M-AC-08. |
| K-AC-09 | resolved (v0.1.17) | Mixed exactness. Evidence H-AC-18 (anthropomorphic, θ*1 = π/32): `Map[Precision, First[Td[dof]], {2}]` is MachinePrecision for all 16 entries and every recorded Td[i] (i = 1 … 6) is a machine matrix, Td[1] = Ad[[1]] included (its only machine number is d = 1.5); H-AC-11 and H-AC-16 the same. So a TransformationFunction with one machine entry is all machine; the draft's per-entry rule (exact bottom row 0 0 0 1 among machine entries) does not occur. The port collapses the kinds (`allMachine` in `model.js`); the displayed H is unchanged in every recorded state (H-AC-11, H-AC-16, H-AC-18 boxes = the port's text), but states with an all-exact Ad among machine ones no longer show mixed formats (e.g. the Cartesian robot with d*1 … d*3 = 11/20, θ*4 = π/32 is now all machine). |
| K-AC-10 | resolved (v0.1.17) | `Plus` order of drawJoint's (and the unreachable drawShaft's) prismatic axis bottom `-1+d-jr-.01` (`axisBottomZ` of `demos/common/robot-draw.js`): Mathematica adds the numbers in written order, ((−1 + d) + −1/5) + −0.01, for a machine d (dh-parameters H-DH-02, H-DH-03, H-DH-07: five values bit for bit; K-DH-06), and −0.01 + N[k/20 − 6/5] for an exact slider value k/20 (`exactRatio`; H-AC-17 %g3d, Stanford d*3 = 3/2). Drawing only. The golden tests compare every Cuboid, Cylinder and Line of the recorded %g3d (H-AC-01, H-AC-15, H-AC-17) bit for bit. Unit "prismatic axis -1+d-jr-.01 in written order: an exact slider value k/20 joins the exact terms, a machine value is added term by term". |
| N-AC-07 | note | The coordinate-axis arrows' 3/2 jr with the exact jr = 1/5 is the exact 3/10, drawn as 0.3 (`drawCoordAxes(jr, true)`; H-AC-15 %g3d; the double product was 0.30000000000000004 before v0.1.17). |
| N-AC-01 | note | Pictures 1 and 2 are byte-identical (thumbnail and the Details' snapshot 1); Details snapshots 1–5 are pictures 2–6: 2 anthropomorphic at zero, 3 grip 0.62 with show robot off, 4 planar elbow, 5 elbow robot, 6 CNC robot. |
| N-AC-02 | note | The nine tables versus robot-singularities' Type table: see §6.2. |
| N-AC-03 | note | The q entries of the tables (`Subscript[q, i]` in the Input cell, TextCells in the stored popup values and Settings, raw line ≈ 1948) are never used in a computation (revolute θ and prismatic d are replaced by params); harness scenarios that set a table with `Subscript[q,i]` are therefore equivalent, and scenarios for robots with snapshot Settings load those instead. |
| N-AC-04 | note | `params` has 20 entries and `dof` a hidden range 1 … 20 (ControlType None); the body assigns dof. The Module's `jr = 1/10, ar = 1/40` are unused. |
| N-AC-05 | note | The stored Initialization of the output cell equals the input cells' definitions (checked in the raw notebook). |
| N-AC-06 | note | `drawJoint` variant `'ac'` of `demos/common/robot-draw.js` (owner dh-parameters) was written from this draft (F-AC-13); at implementation it was checked line by line against the readable source and the stored Initialization in the raw notebook (output cell): axes, `Opacity[1]`, the translucent gray axis with the four-spelling MemberQ test (prismatic bar from −1 + d − jr − 0.01 to d + 0.01, otherwise the cylinder from Min[−ar, d − jr] − 0.01 to Max[ar, d] + 0.01, radius ar), the light-blue body with the test j == "p" (two cuboids, or the cylinder of radius 0.7 jr from −jr − 0.05 to jr + 0.05) and the always-drawn translucent link rotated by Theta — identical, no change needed. Pinned by unit "drawJoint variant 'ac' is the source's drawJoint, element by element (verified against the raw notebook)". |

## 8. Proposed changes

Template: [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md).

| ID | Status | Requested by / date | Change | Reason | Acceptance criteria |
|----|--------|---------------------|--------|--------|---------------------|
| P-AC-01 | proposed | harness run 2 review, 2026-10-18 | Reproduce Mathematica's `N[…, 2]` of an exact H that contains an unsimplified exact zero: N::meprec, the zero shown as a zero of accuracy ≈ 51 and the other entries with ≈ 51 digits (K-AC-03). Needs exact symbolic arithmetic for the entries (radicals of Cos/Sin of kπ/32) and Mathematica's adaptive-precision rules; changes the H text (very long numbers) in such states. Alternative: keep the two-digit display as a documented deviation. | The original shows a ~51-digit H in such states (H-AC-10); the port shows two digits | The H text of H-AC-10 equals the front-end rendering of the recorded boxes; harness "H-AC-10" then compares every entry (it now asserts the recorded difference) |

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.16 | 2026-10-18 | first implementation of the design draft approved by the owner (DEC-17; draft of 2026-10-12 with COMMON-DECISIONS §5, §6 and owner rules R-A/R-B/R-C applied); decided while implementing: A-AC-07 (context-loss redraw), N-AC-06 (`drawJoint` `'ac'` verified against the source, unchanged), K-AC-09 and K-AC-04 completed with what the port does, §5 lists only interactive elements (`value-params-*`, `dh-table`, `h-matrix` are named below the table as non-interactive test ids), `robot` is a 0-based index (§6.3); harness checks are golden tests `harness "H-AC-nn"` that skip until `tests/golden/arm-configurations.harness.json` exists |
| 2 | v0.1.16 | 2026-10-18 | review fixes: K-AC-10 (`-1+d-jr-.01` in COMMON §7 order for drawJoint `'ac'` and drawShaft); unit tests: the no-negative-zero check and the Chop check can fail now |
| 3 | v0.1.17 | 2026-10-18 | harness run 2 (Mathematica 15.0.1 records H-AC-01 … H-AC-18): K-AC-01 resolved (Chop acts: the port chops machine products), K-AC-02 resolved (machine products = the fused multiply-add Dot, `mul4Fma`: H-AC-11 bit for bit, no 10^-16 residues in H), K-AC-09 resolved (a matrix with one machine entry is all machine), K-AC-10 resolved (prismatic axis bottom in written order, via dh-parameters' records), N-AC-07 (3/2 jr = 0.3); K-AC-03 answered with proposal P-AC-01 (high-precision H, difference asserted by the test); K-AC-04 stays open (front-end rounding); `shared/exact-pi.js` sin(π/8) = 0.3826834323650898 (H-ME-12) shifts exact entries' doubles by 1 ulp; golden tests compare Td bit for bit, the H text with the recorded boxes, and the %g3d primitives |
| 4 | v0.1.18 | 2026-10-18 | version number only (harness run 3 accepted for manipulability-ellipsoid); no change to this app |
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
| I-AC-01 | Label the DH table's last column "θ" | correct header | departs from the original | Q-AC-03 |
| I-AC-02 | Draw the shaft of the last joint when "show robot" is off (the evident intent of drawShaft) | the hidden-robot view shows where the end effector hangs | departs from the original | Q-AC-01 |
| I-AC-03 | One number format for H (e.g. always 3 decimals) | no format switch between robots | departs from the original | Q-AC-06 |
| I-AC-04 | A user-editable DH table | build any robot | large UI addition | F-AC-04 |
| I-AC-05 | Widen the plot range or fit it to the arm | the Stanford and Cartesian arms stay visible at full extension | changes the original's framing | F-AC-14 |

## 11. Errors in the original (conceptual and mathematical)

Owner rule R-C (2026-10-17). Checked: `dhTransform` (Rot<sub>z</sub>(θ)·Trans<sub>z</sub>(d)·Trans<sub>x</sub>(r)·Rot<sub>x</sub>(α): correct), the
chain `Td[i] = Td[i-1].Ad[[i]]` and the choice of the joint variable by type (θ for revolute, d for prismatic: correct),
each of the nine DH tables against the robot it names (Spong et al. [2]; planar elbow, elbow robot, anthropomorphic
arm with spherical wrist, Stanford robot, cylindrical robot and CNC robot: consistent) — with an independent NumPy
computation of every joint axis z<sub>i−1</sub> and origin at sample joint values; the drawing code (`drawJoint`,
`drawShaft`, `drawGripper`), the DH table control, the H display, the Details. The SCARA table (all α = 0, the tool and
the prismatic axis point up rather than down as in [2]) is a valid SCARA geometry and is not listed.

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|------|-----------------------|--------------------------|--------------------|-------------------------|--------|
| E-AC-01 | conceptual | Popup value "Cartesian robot": `{{"p","p","p","r"}, {0,0,0,0}, {Pi/2, Pi/2, 0, 0}, {q1, q2, q3, 0.5}, {0, Pi, 0, q4}}` | A Cartesian robot moves along three mutually orthogonal axes. With α<sub>1</sub> = π/2, θ<sub>2</sub> = π, α<sub>2</sub> = π/2 the three prismatic joints slide along z<sub>0</sub> = (0, 0, 1), z<sub>1</sub> = (0, −1, 0) and z<sub>2</sub> = (0, 0, 1): joints 1 and 3 are parallel, so the arm can only move in a vertical plane (rank 2; independent axis computation). The CNC robot's table (`{-Pi/2, Pi/2, 0}`, θ = `{-Pi/2, -Pi/2, 0}`) does give three orthogonal axes (z, x, y). | Keeps the table (F-AC-04; H-AC-08 records it). | A corrected table (e.g. α<sub>2</sub> = −π/2 or θ<sub>2</sub> = −π/2, chosen so that z<sub>2</sub> is the third direction) changes the Cartesian robot's drawing and H: unit "H at the reset values equals an independent DH product for all 9 robots" (Cartesian entry), unit "PlotRange ±3 clips the Stanford end frame at d*3 = 3/2 (z = 3.5) and the Cartesian one at d* = 3/2 (z = 3.5)" and H-AC-08 change; no snapshot shows the Cartesian robot. | open |
| E-AC-02 | conceptual | Popup value "spherical robot": `{{"r","r","p"}, {0.75, 1, 0}, {-Pi/2, Pi/2, 0}, {1, 0, q3}, {q1, q2, 0}}` | A spherical (polar) RRP robot has its first two joint axes intersecting, so that the prismatic joint extends from a fixed centre and (q1, q2, d3) are spherical coordinates of the wrist ([2]; the app's own Stanford table has r = 0 there). Here r<sub>1</sub> = 0.75 and r<sub>2</sub> = 1: joint 2's axis passes 0.75 from joint 1's axis and the sliding axis is offset again, so the end point does not move on spheres about a fixed point. Probably chosen to make the links visible; the name then does not fit. | Keeps the table (F-AC-04; H-AC-06 records it). | r<sub>1</sub> = r<sub>2</sub> = 0 would make it spherical but changes its picture and H: unit "H at the reset values equals an independent DH product for all 9 robots" (spherical entry) and H-AC-06 change; no snapshot shows it. Keeping the table and renaming is the other option. | open |
| E-AC-03 | conceptual | `If[dof == 1, GeometricTransformation[drawGripper[g, 0], …], If[showRobot, Table[…joints 2 … dof…]], If[MemberQ[…], GeometricTransformation[drawShaft[…], Td[dof-1]], …]]` | `drawShaft` (written to draw the last joint's shaft when the robot is hidden) is the **fourth** argument of `If[dof == 1, …, …, …]`, which Mathematica evaluates only when `dof == 1` is neither True nor False — never. With "show robot" off only joint 1 and the gripper float in the air; the evident intent (a shaft carrying the gripper) is never drawn. | Keeps it: `drawShaft` is transcribed but unreachable (Q-AC-01). | Drawing the shaft (I-AC-02) changes the "show robot" off picture: unit "drawShaft is never drawn (4-argument If) and show robot off leaves joint 1 and the gripper", H-AC-15 and golden comparisons with picture 3 (snapshot 2 of the Details) change. Possible as an option. | open |
| E-AC-04 | text | DH table control `makeDHControl`: headers set by `alpha[[1]] = "α"; d[[1]] = "d"; jointtype[[1]] = "type"; a[[1]] = "r"`, while `theta = ConstantArray[0, dof + 1]` | The θ column's header is never set and reads "0" (all pictures); it should read "θ". | Keeps the "0" header (Q-AC-03). | Header "θ" (I-AC-01): unit "the DH table: header joint, type, r, α, d, 0 (θ header left at 0), θ*i for revolute and d*i for prismatic joints" and the golden-snapshot comparison of the table change. | open |
| E-AC-05 | conceptual | `Td[i] = Chop[Td[i-1].Ad[[i]]]` and the display `Row[{"H", " = ", MatrixForm[N[Chop[Td[dof]], 2]]}]`, where `dhTransform` returns a `TransformationFunction` | H is meant to be the homogeneous matrix, but `Td` is a `TransformationFunction` object, not a matrix: `Chop` removes only entries below 10⁻¹⁰ and the matrix stays machine (zeros show "0.", H-AC-14), and `MatrixForm` prints the wrapper "H = TransformationFunction[( … )]" around the matrix. `TransformationMatrix[Td[dof]]` gives the intended matrix. | Keeps both effects: Td chopped as stored, zeros shown "0." (Q-AC-05, K-AC-01 resolved by H-AC-14) and the wrapper text (D-AC-04). | Showing `TransformationMatrix` chopped changes every H text: golden-snapshot comparisons of H in pictures 1–6, H-AC-01…13 (`ToBoxes` captures) and M-AC-07 change; the drawing is unchanged. The same `Chop` idiom is in robot-singularities and manipulator-workspaces (Q-MW-09), where it is invisible. | open |
