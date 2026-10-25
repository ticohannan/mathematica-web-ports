# Design document: Forward and Inverse Kinematics for Two-Link Arm

| | |
|---|---|
| Code version: | 0.1.21 |
| Document revision | 2 (2026-10-18) — `matrixRank` imported from `demos/common/svd3.js` (DH-family move) |
| Status | describes the app as implemented; changes go through *Proposed changes* (§8) and [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md) |
| Original | Wolfram Demonstrations Project, "Forward and Inverse Kinematics for Two-Link Arm", contributed by Aaron T. Becker and Lillian Lin, published 2016-06-20 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/ForwardAndInverseKinematicsForTwoLinkArm/>. Readable source: [`docs/original-source/two-link-kinematics.txt`](../../docs/original-source/two-link-kinematics.txt); saved states: `tests/golden/two-link-kinematics.original-states.json` (`states[0]` = the output cell's saved state, `snapshots[1…4]` = the four snapshot cells' `Settings`, raw notebook lines 3580, 5050, 6589, 8110; `specs` = the initial settings (stored `"Variables"`); exact values kept as `{"wl": …}` next to their double); snapshots: `docs/original-snapshots/two-link-kinematics-1…4.png` (the notebook's snapshot cells 5 and 6 are the Wolfram icon placeholder, N-TK-06) |
| Port files | `model.js` (initial values, one evaluation of the Manipulate body including the Jacobian, `Theta2inv`/`Theta1inv`, `svd2`, the pseudoinverse and the Graphics list (`scene`, with the `loc` icons) as `shared/graphics.js` data; pure), `velocity-pad.js` (the original's `make2VelControl`; browser-only), `main.js` (the Manipulate on `shared/manipulate.js`: controls, locators, test hook; v0.1.21), `index.html`; common modules owned by this app (COMMON-DECISIONS §3, all CC BY-NC-SA 3.0): `demos/common/two-link.js` (arm geometry; users TK, DN, robot-motion-obstacles, bfs-motion-planning), `demos/common/arrow-arcs.js` (arc arrows; TK, DN, RM, BFS, torus chart, four-bar, manipulability ellipsoid, camera-lasers), `demos/common/dial-control.js` (every `makeDialControl` variant; TK, DN, torus chart, manipulability ellipsoid, camera-lasers); shared module owned by this app (MIT, COMMON-DECISIONS §6): `shared/mma-text.js` (`piFraction` and the text of exact numbers; users: dial-control.js, camera-lasers, torus chart, manipulability ellipsoid, dh-parameters, arm-configurations) |
| Role in the project | further demonstration (batch A) |

## 1. Purpose and background

A planar revolute-revolute arm (link lengths r<sub>1</sub> and r<sub>2</sub> = 2 − r<sub>1</sub>) is moved either by
its joint angles θ<sub>1</sub>, θ<sub>2</sub> (two dials: forward kinematics) or by dragging its end effector (inverse
kinematics, with an "elbow up?" choice between the two solutions). The joint velocities (a point in the unit disk of a
second pad) map through the Jacobian J to an end-effector velocity, drawn as a green arrow ending in a green locator
(forward velocity kinematics); dragging that locator solves for the joint velocities (inverse velocity kinematics),
with the Moore–Penrose pseudoinverse at singular configurations. The manipulability ellipse (image of the unit disk of
joint velocities under J, from the singular value decomposition) is drawn in pink with its axes. Teaching goal (Details
text): forward/inverse kinematics, the two IK solutions, the reachable workspace (blue), the Jacobian and singularities
on the workspace boundary.

## 2. Scope

In scope: the original's controls (r<sub>1</sub> slider, two angle dials, "elbow up?" check box, joint-velocity pad),
the two invisible locators (end effector, end-effector velocity) with their hidden companions (`pEndp`, `pVelp`,
`IsElbowUpp`), one evaluation of the body per update with all its branches (IK/FK, inverse/forward velocity, singular
branch), the drawing (workspace, ellipse and axes, arm, angle and velocity arcs with B-spline arrows, locator icons,
velocity arrow), title, caption and Details.
Out of scope (would need a design entry first): more links, prismatic joints, a numeric read-out of angles or
velocities, the commented-out code of the original (`Text[{q}, {0, 1.5}]`, the 2π wrap of the dial angle).

## 3. Users and use cases

| ID | User | Use case |
|----|------|----------|
| UC-TK-01 | student | set the joint angles with the dials and watch the end effector (forward kinematics) |
| UC-TK-02 | student | drag the end effector, switch between elbow up and elbow down, and see where no solution exists (inverse kinematics) |
| UC-TK-03 | student | set joint velocities and see the end-effector velocity and the manipulability ellipse, or drag the velocity and read the joint velocities (velocity kinematics) |
| UC-TK-04 | student | change r<sub>1</sub> and see the workspace become an annulus and the singularities on its boundary |
| UC-TK-05 | tester | compare the port with the original's saved state, its snapshots and the Mathematica harness |

## 4. Features

### 4.1 Controls

| ID | Feature | Reason | Since | Verified by |
|----|---------|--------|-------|-------------|
| F-TK-01 | r<sub>1</sub> slider `{{r1, 1, "r₁"}, 0, 2, ImageSize -> 80, Appearance -> "Labeled"}`: continuous (no step), default exact 1, value field and ⊕ animation panel; r2 = 2 − r1 | the relative link lengths under r<sub>1</sub> + r<sub>2</sub> = 2 (UC-TK-04) | v0.1.15 | e2e "has the controls of the original with their defaults: r1, two dials, elbow up, joint velocity pad"; e2e "moving the r1 slider changes the link lengths and the white inner disk"; M-TK-10 |
| F-TK-02 | θ<sub>1</sub> dial `{{p1, {1, 0}, "θ₁"}, (makeDialControl[#1, {0, 0}, Red] &), ImageSize -> 140}`: a LocatorPane over a 140 pt dial; a press anywhere on the dial moves its locator there and the setter `pt = Normalize[#]` puts it on the unit circle; red hand (`makeHand[7, 7/3, .1, .3]`) rotated to `ArcTan[pt[[1]], pt[[2]]]`, red arc arrow at radius 0.3 from 0 to that angle (`Arrowheads[.05]`), gray circle, 17 long and 16 short tick lines, labels −3π/4 … π (FontSize 10) | joint angle 1 (UC-TK-01) | v0.1.15 | e2e "dragging a dial turns the arm and moves the end effector (forward kinematics)"; unit "makeHand gives the five hand vertices divided by 10"; unit "dial setter: a press point is normalised (correctly rounded length), the centre stays (0, 0)"; unit "dial-control clamp: a pointer far outside the plot range is clamped first, the far corner gives 45 degrees"; M-TK-06 |
| F-TK-03 | θ<sub>2</sub> dial `{{p2, {1, 0}, "θ₂"}, (makeDialControl[#1, {0, 0}, Blue] &), ImageSize -> 140}` (blue), same control as F-TK-02 | joint angle 2 (UC-TK-01) | v0.1.15 | e2e "dragging a dial turns the arm and moves the end effector (forward kinematics)"; golden "harness H-TK-09"; M-TK-06 |
| F-TK-04 | "elbow up?" check box `{{IsElbowUp, True, "elbow up?"}, {True, False}}`, default ticked; a change makes the next evaluation solve the IK again with the other root (F-TK-09); the body also overwrites it from the sign of θ<sub>2</sub> (F-TK-10, Q-TK-02) | choose between the two IK solutions (UC-TK-02) | v0.1.15 | e2e "clicking elbow up flips the arm to the other solution"; unit "the elbow checkbox switches to the other IK solution"; golden "harness H-TK-03"; golden "harness H-TK-21" |
| F-TK-05 | "joint velocity" pad `{{jointVel, {1, 0}, "joint\nvelocity"}, (make2VelControl[#1] &)}`: a 140 pt LocatorPane over a LightGreen unit disk with thin black axes, ticks every 0.2 (`Line[{{a, 0}, {a, 0.05}}]`), labels −1, 1 on both axes and θ̇<sub>1</sub> at {0.9, 0.2}, θ̇<sub>2</sub> at {0.2, 0.9}; setter `pt = If[Norm[Re[#]] > 1, Normalize[Re[#]], Re[#]]` (clamped to the unit disk; the LocatorPane first limits the pointer to the pad's plot range, K-TK-13); Thick red arrow {0, pt₂} → pt and blue arrow {pt₁, 0} → pt with `Arrowheads[{0, .1}]` | joint velocities limited to magnitude ≤ 1 (UC-TK-03) | v0.1.15 | e2e "the joint velocity pad keeps its locator inside the unit disk"; unit "velocity pad setter clamps to the unit disk"; golden "harness H-TK-16"; M-TK-07 |
| F-TK-06 | End-effector locator `{{pEnd, {2, 0}}, {-2, -2}, {2, 2}, Locator, Appearance -> None}`: invisible, limited to the square ±2; LocatorPane picking: a press anywhere in the graphic moves the nearer of pEnd and pVel there (D-TK-06); drawn as the icon `loc[Black, pEnd]` | drag the end effector (UC-TK-02) | v0.1.15 | e2e "dragging the end-effector locator with the mouse moves the arm (inverse kinematics) and turns the dials"; e2e "a press away from both locators moves the nearer one there"; M-TK-03; M-TK-08 |
| F-TK-07 | Velocity locator `{{pVel, {2, 1}}, {-4, -4}, {4, 4}, Locator, Appearance -> None}`: invisible, limited to ±4; drawn as `loc[Darker[Green], pVel]` | drag the end-effector velocity (UC-TK-03) | v0.1.15 | e2e "dragging the green locator changes the joint velocity pad (inverse velocity)"; M-TK-04 |
| F-TK-08 | Layout: `ControlPlacement -> Left` (controls in one column: r<sub>1</sub>, θ<sub>1</sub> dial, θ<sub>2</sub> dial, elbow up?, joint velocity; the graphic on the right); hidden variables `{{pEndp, {2, 0}}, {-2, -2}, {2, 2}, None}`, `{{pVelp, {1, 1}}, {-4, -4}, {4, 4}, None}`, `{{IsElbowUpp, True}, None}` | same arrangement and state as the original | v0.1.15 | e2e "has the controls of the original with their defaults: r1, two dials, elbow up, joint velocity pad"; golden "two-link-kinematics: evaluating the initial values once gives the saved state" |

### 4.2 Model (`model.js`, `demos/common/two-link.js`)

| ID | Feature | Reason | Since | Verified by |
|----|---------|--------|-------|-------------|
| F-TK-09 | One evaluation of the body per update, in the original's order: `r2 = 2 - r1`; `If[Norm[pEnd] >= 2, pEnd = 2 pEnd/Norm[pEnd]]`; `If[Norm[pEnd] <= Abs[r1 - r2], pEnd = Abs[r1 - r2] pEnd/Norm[pEnd]]`; then **IK** when `pEndp != pEnd \|\| IsElbowUpp != IsElbowUp`: `Theta2 = Theta2inv[x, y, r1, r2, IsElbowUp]`, `Theta1 = Theta1inv[x, y, r1, r2, Theta2]`, `p1 = {Cos θ1, Sin θ1}`, `p2 = {Cos θ2, Sin θ2}` (the dials follow; pEnd itself is not recomputed, Q-TK-06) | inverse kinematics as the original computes it (UC-TK-02) | v0.1.15 | unit "the clamp puts pEnd on the circle of radius 2 and on the inner circle abs(r1 - r2)"; unit "IK writes p1 and p2 but leaves pEnd as dragged"; unit "tolerant Unequal: a 1-ulp change of pEnd does not start IK"; golden "harness H-TK-02"; golden "harness H-TK-04" |
| F-TK-10 | **FK** otherwise: `Theta1 = ArcTan[p1[[1]], p1[[2]]]`, `Theta2 = ArcTan[p2[[1]], p2[[2]]]`, `pEnd = {r1 Cos[θ1] + r2 Cos[θ1 + θ2], r1 Sin[θ1] + r2 Sin[θ1 + θ2]}`; in both branches then `If[Theta2 > 0, IsElbowUp = False]; If[Theta2 < 0, IsElbowUp = True]; pEndp = pEnd; IsElbowUpp = IsElbowUp` | forward kinematics; the check box shows which solution is drawn (UC-TK-01) | v0.1.15 | unit "FK from the dials: theta from ArcTan of p1 and p2, pEnd = tip"; unit "IsElbowUp follows the sign of theta2 and is kept at theta2 = 0"; unit "r1 change keeps the joint angles unless the old tip is inside the new hole"; golden "harness H-TK-08"; golden "harness H-TK-09" |
| F-TK-11 | `Theta2inv[x, y, r1, r2, IsElbowUp] := Re[If[x^2 + y^2 >= (r1 + r2)^2, 0, Module[{D = (-r1^2 - r2^2 + x^2 + y^2)/(2 r1 r2)}, ArcTan[D, If[IsElbowUp, -1, 1] Sqrt[1 - D^2]]]]]` and `Theta1inv[x, y, r1, r2, Theta2] := Re[ArcTan[x, y] - ArcTan[r1 + r2 Cos[Theta2], r2 Sin[Theta2]]]`, same names; outside the circle θ2 is the exact 0; `Re` of the complex result when rounding gives abs(D) > 1: 0 for D > 1, π for D < −1 (Q-TK-08); Mathematica has no −0, so `-1·Sqrt[0.]` gives ArcTan[−1., 0.] = +π | the original's inverse kinematics formulas | v0.1.15 | unit "Theta2inv: on or beyond the outer circle theta2 is exactly 0 (tolerant >=)"; unit "Theta2inv: D = 0 gives -pi/2 elbow up and +pi/2 elbow down"; unit "Theta2inv: D = -1 gives +pi for both elbow settings (no negative zero)"; unit "Theta2inv: Re of the complex ArcTan is 0 for D > 1 and pi for D < -1"; unit "Theta1inv: theta1 = ArcTan[x, y] - ArcTan[r1 + r2 Cos[theta2], r2 Sin[theta2]]"; golden "harness H-TK-06"; golden "harness H-TK-07"; golden "harness H-TK-10"; golden "harness H-TK-11" |
| F-TK-12 | Jacobian `J = {{-r1 Sin[θ1] - r2 Sin[θ1 + θ2], -r2 Sin[θ1 + θ2]}, {r1 Cos[θ1] + r2 Cos[θ1 + θ2], r2 Cos[θ1 + θ2]}}`, `{U, Σ, V} = SingularValueDecomposition[J]` — singular values at or below 100·10⁻ᵖ·Σ11 (≈ 1.1·10⁻¹⁴ Σ11 at machine precision) are set to 0, Wolfram documentation (port: `svd2`, D-TK-03, K-TK-01), `q = Transpose[U].(pVel - pEnd)` | velocity kinematics and the ellipse (UC-TK-03) | v0.1.15 | unit "Jacobian at theta1 = pi/2, theta2 = -pi/2 has singular values (sqrt 5 +- 1)/2"; unit "svd2: J = U S V^T, orthogonal U and V, S descending"; unit "svd2: an exactly singular J has S22 exactly 0 (straight arm with r1 = r2)"; unit "svd2 zeroes singular values at or below 100 times 2^-53 of the largest"; golden "harness H-TK-01"; golden "harness H-TK-23" |
| F-TK-13 | **Inverse velocity** when `pVelp != pVel`, non-singular branch `Σ11 > 0 && Σ22 > 0`: `vNorm = Sqrt[q1^2/Σ11^2 + q2^2/Σ22^2]`; `If[vNorm > 1, pVel = (pVel - pEnd)/vNorm + pEnd]` (radial scaling onto the ellipse, Q-TK-04); `jointVel = V.{{1/Σ11, 0}, {0, 1/Σ22}}.Transpose[U].(pVel - pEnd)` | inverse velocity kinematics (UC-TK-03) | v0.1.15 | unit "inverse velocity inside the ellipse: jointVel = J^-1 (pVel - pEnd)"; unit "inverse velocity outside the ellipse scales pVel - pEnd radially to the ellipse"; golden "harness H-TK-14"; golden "harness H-TK-15"; golden "two-link-kinematics: snapshot 3 Settings are a fixed point and show the near-singular squash" |
| F-TK-14 | Singular branch (Σ22 not > 0, i.e. the SVD returned Σ22 = 0: J singular within the tolerance of F-TK-12 — the straight arm and the folded arm): `If[Σ11 > 0, pVel = U.{q1, 0} If[Sqrt[q1^2/Σ11^2] > 1, Abs[Σ11/q1], 1] + pEnd]` (projection onto the long axis, capped at Σ11); the second `If[Σ22 > 0, …]` can never run (Q-TK-03); `jointVel = PseudoInverse[J].(pVel - pEnd)` | velocities at singular configurations (Details text) | v0.1.15 | unit "singular branch projects pVel onto the long axis and caps it at Sigma11"; unit "PseudoInverse of the rank-1 Jacobian gives 2/5 and 1/5 at the initial settings"; unit "the second If of the singular branch never runs (Sigma11 > 0 for every r1 in 0..2)"; golden "harness H-TK-05"; golden "harness H-TK-18"; golden "harness H-TK-19"; golden "two-link-kinematics: snapshot 2 Settings: the singular branch with the cap gives jointVel = v1"; M-TK-04 |
| F-TK-15 | **Forward velocity** otherwise: `pVel = J.jointVel + pEnd`; in both cases `pVelp = pVel` | forward velocity kinematics (UC-TK-03) | v0.1.15 | unit "forward velocity pVel = J.jointVel + pEnd"; golden "two-link-kinematics: snapshot 4 Settings (r1 = 2.) are a forward-velocity fixed point"; golden "harness H-TK-16"; golden "harness H-TK-17"; golden "harness H-TK-24" |
| F-TK-16 | Initial values `r1 = 1`, `pEnd = pEndp = {2, 0}`, `pVel = {2, 1}`, `pVelp = {1, 1}`, `p1 = p2 = {1, 0}`, `IsElbowUp = IsElbowUpp = True`, `jointVel = {1, 0}`, then one evaluation: FK at θ = (0, 0), exact J = {{0, 0}, {2, 1}}, inverse velocity in the singular branch (pVelp ≠ pVel, Q-TK-01) → `jointVel = {2/5, 1/5}`, `pVelp = {2, 1}` — the live state (the saved state, raw line 1680, what the published notebook opens with) and snapshot 1's `Settings`. The initial settings (stored `"Variables"`, raw line 1710) are the declared values above (jointVel {1, 0}, pVelp {1, 1}) and differ from the live state (COMMON-DECISIONS §6); the port opens in the live state, reached by one evaluation of the initial settings, and its "Initial settings" restores the stored `"Variables"` and evaluates once (A-TK-01) | same opening picture as the original (snapshot 1) | v0.1.15 | golden "two-link-kinematics: evaluating the initial values once gives the saved state"; golden "two-link-kinematics: evaluating the saved state again changes nothing"; golden "harness H-TK-01" |
| F-TK-17 | Helpers with the original's names and arguments (`Theta2inv`, `Theta1inv`, `loc` in `model.js`; `myArrowArc`, `myArrowArc2` in `arrow-arcs.js`; `makeHand` in `dial-control.js`): `Theta2inv`, `Theta1inv`, `myArrowArc` (`start == end` → `Point[c + r {Cos[start], Sin[start]}]`, else `Arrow[BSplineCurve[Table[c + r {Cos[t], Sin[t]}, {t, start, end, (end - start)/11}]]]`, 12 control points), `myArrowArc2` (the same with `===`), `makeHand`, `loc[col, c]` (as drawing data) | side-by-side comparison with the original | v0.1.15 | unit "myArrowArc: equal angles give a Point at c + r (Cos, Sin), otherwise 12 B-spline control points"; unit "myArrowArc2 compares with SameQ: a 4-ulp difference draws an arrow"; unit "bsplineCurve: clamped cubic through the end points, end tangent along the last control leg"; golden "harness H-TK-22" |

### 4.3 Graphics (SVG)

| ID | Feature | Reason | Since | Verified by |
|----|---------|--------|-------|-------------|
| F-TK-18 | Workspace: `{LightBlue, EdgeForm[{Thin, Blue}], Disk[{0, 0}, 2], If[r1 != 1, {White, Disk[{0, 0}, Abs[r1 - r2]]}], Black, Text["Workspace", {0, 1.8}]}` (tolerant `!=`) | the reachable workspace (UC-TK-04) | v0.1.15 | e2e "moving the r1 slider changes the link lengths and the white inner disk"; golden "two-link-kinematics: snapshot 3 Settings are a fixed point and show the near-singular squash"; golden "two-link-kinematics: snapshot 4 Settings (r1 = 2.) are a forward-velocity fixed point" |
| F-TK-19 | Manipulability ellipse: `{EdgeForm[{Thin, Blue}], GeometricTransformation[{Opacity[0.5], If[MatrixRank[Σ] > 1, {LightRed, Ellipsoid[{0, 0}, Σ^2]}], Blue, Arrow[{{0, 0}, Σ[[1]]}], Arrow[{{0, 0}, -Σ[[1]]}], Red, Arrow[{{0, 0}, Σ[[2]]}], Red, Arrow[{{0, 0}, -Σ[[2]]}]}, {U, pEnd}]}`: an ellipse with semi-axes Σ11 along u₁ and Σ22 along u₂ centred at pEnd (only for rank 2: `matrixRank` of `demos/common/svd3.js` (robot-singularities' module, moved in v0.1.16), tolerance K-RS-05b), blue arrows pEnd ± Σ11 u₁, red arrows pEnd ± Σ22 u₂, all at opacity 0.5 | the manipulability ellipse of the Details text | v0.1.15 | unit "manipulability ellipse geometry: semi-axes Sigma11 and Sigma22 along U columns centred at pEnd"; unit "matrixRank of Sigma: 2 for the regular arm, 1 at theta2 = 0"; golden "two-link-kinematics: snapshot 1 shows blue axis arrows of length sqrt 5 and no pink ellipse"; M-TK-02 |
| F-TK-20 | Arm: `Gray, EdgeForm[Black]`, link 1 `Rotate[{Rectangle[{-w, -w}, {r1 + w, w}, RoundingRadius -> w], If[r2 < 1, {Black, Text["Robot Arm", {r1/2, 0}]}]}, θ1, {0, 0}]`, link 2 `Rotate[{Rectangle[{r1 Cos[θ1] - w, r1 Sin[θ1] - w}, {r1 Cos[θ1] + r2 + w, r1 Sin[θ1] + w}, RoundingRadius -> w], If[r2 >= 1, {Black, Text["Robot Arm", {r1 Cos[θ1] + r2/2, r1 Sin[θ1]}]}]}, θ1 + θ2, elbow]`, w = 1/8; black points at base and elbow; the label turns with its link (upside down for some angles, snapshot 2) | the arm itself | v0.1.15 | unit "label placement: Robot Arm on link 1 when r2 < 1, else link 2, theta labels only when abs(theta) > pi/4"; e2e "loads without errors and draws workspace, arm, ellipse arrows and the two locator icons"; M-TK-02 |
| F-TK-21 | Angle arcs in Darker[Gray]: `myArrowArc[{0, 0}, l/4, {0, θ1}]` and `myArrowArc[elbow, l/3, {θ1, θ1 + θ2}]` (l = 1), a Point when the angle is 0 (snapshot 1: gray dot at (1/4, 0)); labels `Style[θ₁, Medium]` at `l 2/5 {Cos[θ1/2], Sin[θ1/2]}` if `Abs[θ1] > π/4` and `Style[θ₂, Medium]` at `{r1 Cos[θ1] + r2/2 Cos[θ1 + θ2/2], r1 Sin[θ1] + r2/2 Sin[θ1 + θ2/2]}` if `Abs[θ2] > π/4` | shows the joint angles | v0.1.15 | unit "myArrowArc: equal angles give a Point at c + r (Cos, Sin), otherwise 12 B-spline control points"; unit "label placement: Robot Arm on link 1 when r2 < 1, else link 2, theta labels only when abs(theta) > pi/4"; M-TK-02 |
| F-TK-22 | Joint-velocity arcs: `{Red, PointSize[Large], myArrowArc[l{0, 0}, 1/2, Theta1 + {0, jointVel[[1]]}]}` and `{Thick, Blue, myArrowArc[elbow, 2/3, Theta1 + Theta2 + {0, jointVel[[2]]}]}` (arc from the link direction through the joint velocity in radians; a Point when the velocity is 0) | shows the joint velocities on the arm | v0.1.15 | golden "harness H-TK-17"; golden "harness H-TK-22"; M-TK-07 |
| F-TK-23 | Locator icons `loc[col, c]` (sc = 1/25: four hair lines from 1.5 sc to 3 sc, `Circle[c, 2 sc]`, `{Thickness[1/100], Opacity[0.5], Circle[c, 1.4 sc]}`): Darker[Green] at pVel, Black at pEnd; then `{Green, Thick, Arrow[{pEnd, pVel}]}` | shows where the two invisible locators are and the end-effector velocity | v0.1.15 | e2e "loads without errors and draws workspace, arm, ellipse arrows and the two locator icons"; M-TK-02 |
| F-TK-24 | `Graphics[…, PlotRange -> 3{{-1, 1}, {-1, 1}}, ImageSize -> 400]`, drawing order exactly as the list (workspace, ellipse, link 1, base group, link 2, elbow group, icons, velocity arrow); B-spline arrows: degree-3 clamped `BSplineCurve` through 12 control points with the default arrowhead at the end; nothing is clipped to the plot range (PlotRangeClipping False) except at the image edge | the original's picture | v0.1.15 | unit "bsplineCurve: clamped cubic through the end points, end tangent along the last control leg"; review; M-TK-02; M-TK-09 |
| F-TK-25 | Title, caption, Details (with the Denavit–Hartenberg matrix A<sub>i</sub> and ξ = J(q) q′ as MathML), the reference [1] and the original's related links | explains the Demonstration | v0.1.15 | M-TK-01 |

### 4.4 Port additions

| ID | Feature | Reason | Since | Verified by |
|----|---------|--------|-------|-------------|
| A-TK-01 | "Initial settings" button: all variables of F-TK-16 back to their initial values, then one evaluation (gives the saved state again) | stands in for the Manipulate ⊕ menu → Initial Settings | v0.1.15 | e2e "Initial settings restores the opening state" |
| A-TK-02 | Arrow keys move a focused locator (pEnd, pVel: 0.05 units, Shift = 0.25; dial and pad locators: 0.05 in their own coordinates, then their setters normalise/clamp — for the dials this is `dial-control.js`'s option `keyStep` with its default `0.05`, Shift 5×; dials with the Nearest-π/32 setter use `keyStep: 'grid'` instead, §6, COMMON-DECISIONS §5); each key press is one update | keyboard access | v0.1.15 | e2e "arrow keys move a focused locator (port addition)"; unit "dial-control keyStep 'grid': one key turns the dial by ±π/32, Shift by ±π/8, a radial key press also turns it" |
| A-TK-03 | `window.__demo` automation hook (`ready`, `getState`, `locals` of the last evaluation, `scene`, `moveLocator(name, [x, y])`, `setState` (assign, then evaluate once), `worldToClient`, `controlToClient(name, p)` for the dials and the pad) | automated tests | v0.1.15 | e2e "dragging the green locator changes the joint velocity pad (inverse velocity)" |
| A-TK-04 | "All demos" link | site navigation | v0.1.15 | inventory; M-GEN-01 |
| A-TK-05 | Credit footer: original title, authors, licence, adaptation notice | required by CC BY-NC-SA 3.0 | v0.1.15 | e2e "attribution on" |
| A-TK-06 | Start-up notice (watchdog, `<noscript>`) when the page cannot start (DEC-22) | a clear message instead of an empty page | v0.1.15 | e2e "start-up notice when" |
| A-TK-07 | standalone bundle (owner rule R-A): `npm run bundle -- two-link-kinematics` builds `dist/two-link-kinematics/` with exactly the files the app imports, the licences, a generated README and a root `index.html` (§6, "Building and deploying this app alone") | anyone can host this one app elsewhere without the rest of the site (owner rule R-A, 2026-10-17) | v0.1.15 | e2e "bundle: two-link-kinematics runs from its own folder" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document". The check box
gets `check-IsElbowUp` because that is the testid `shared/ui-extra.js` `addCheckbox` produces (`check-<name>`).

| data-testid | Feature |
|-------------|---------|
| `slider-r1` | F-TK-01 |
| `value-r1` | F-TK-01 |
| `plus-r1` | F-TK-01 |
| `play-r1` | F-TK-01 |
| `stepback-r1` | F-TK-01 |
| `stepfwd-r1` | F-TK-01 |
| `locator-p1` | F-TK-02, A-TK-02 |
| `locator-p2` | F-TK-03, A-TK-02 |
| `check-IsElbowUp` | F-TK-04 |
| `locator-jointVel` | F-TK-05, A-TK-02 |
| `locator-pEnd` | F-TK-06, A-TK-02 |
| `locator-pVel` | F-TK-07, A-TK-02 |
| `reset` | A-TK-01 |
| `crumbs` | A-TK-04 |
| `details` | F-TK-25 |
| `credits` | A-TK-05 |

## 6. Design

**Files and responsibilities.**
- `demos/two-link-kinematics/model.js` (pure, Node-testable): `INITIAL` (F-TK-16), `jacobian`, `Theta2inv`, `Theta1inv`,
  `svd2`, `pseudoInverse2`, `loc` (Jacobian, IK and SVD stay in this app, COMMON-DECISIONS §3), `evaluate(state)` = exactly one
  evaluation of the Manipulate body (F-TK-09…F-TK-15) returning `{state, locals}` with the Module locals the harness
  records (`Theta1`, `Theta2`, `r2`, `J`, `U`, `Sigma`, `V`, `q`, `vNorm`, which branches ran), and `scene(state,
  locals)` = the Graphics list as `shared/graphics.js` data in the original's order (v0.1.21, owner decision D2; before,
  a list of 19 kinds of part that `main.js` translated): disks (the hole-on-edge rule of D-TK-04 included), the
  ellipse as `Rotate[Disk[pEnd, {Σ11, Σ22}], …]`, arrows (`arrowheadPolygon` of `shared/graphics-extras.js`), the
  stadiums as rotated rounded `Rectangle`s, points, the B-spline arcs with their heads (`arcArrowGraphics`; `data-kind`
  'Point' | 'Arrow' | …), texts (rotated "Robot Arm"), the `loc` icons (`loc(col, c, role)`); every part an
  `Annotation` with its role as id.
- `demos/two-link-kinematics/velocity-pad.js` (browser-only): `make2VelControl(controls, {name, value, onInput})`, a
  140 pt `createPlot` with one locator (`addLocators`, `pickAnywhere: true`), setter clamp of F-TK-05 (`padSetter`,
  exported pure for the unit test).
- `demos/two-link-kinematics/main.js` (v0.1.20): one `Manipulate({…})` call of `shared/manipulate.js` with the
  Manipulate variables (`r1, pEnd, pEndp, pVel, pVelp, p1, p2, IsElbowUp, IsElbowUpp, jointVel`) as control specs in
  the original's order (the dials and the pad as `Control(makeDialControl, …)` and `Control(make2VelControl)`, the
  check box `{True, False}`); the body is `evaluate` and `scene` (keeping the previous state and picture where the
  original would compute with Indeterminate, D-TK-07), returning `{ state, view: { locals }, graphics }`; the browser
  tests read the picture through the layer's hook `graphics(0)` (the former hook `scene()` was removed in v0.1.21). The layer evaluates after every control change
  (slider input, dial or pad move, check box, locator move, key press) and writes the new state back into every
  control (dials, pad and check box follow the body's assignments).
- `index.html` as in the other 2D ports (crumbs, title, `#controls` left of `#graphic`, caption, details, credits,
  `shared/requirements.js`).

**Common code owned by this app (new, CC BY-NC-SA 3.0, header crediting every source Demonstration; COMMON-DECISIONS §3).**
- `demos/common/two-link.js` (pure): `elbowPosition(r1, θ1)`, `tipPosition(r1, r2, θ1, θ2)` (the source's
  `{r1 Cos[θ1] + r2 Cos[θ1 + θ2], r1 Sin[θ1] + r2 Sin[θ1 + θ2]}`), `armSegments(θ1, φ2, l1, l2)` (link 1 and link 2 as
  segments, φ2 = absolute angle of link 2; used by `arm-grid.js` `armHits`), `armGeometry({r1, r2, theta1, theta2, w,
  theta1LabelRadius, robotArmLabel: 'byR2' | 'link2'})` (the two `Rotate[Rectangle[…, RoundingRadius -> w]]` stadiums as
  centre segment + radius + rotation, base and elbow points, the θ-label anchors and their `Abs[θ] > π/4` visibility,
  the "Robot Arm" anchor and rotation) — no arcs, no colours. TK and DN use `robotArmLabel: 'byR2'` (link 1 when
  r<sub>2</sub> < 1) with label radius 2/5; robot-motion-obstacles and bfs-motion-planning use `'link2'`, l = 1 and
  label radius l/2.
- `demos/common/arrow-arcs.js` (pure): `bsplineCurve(points, {samples})` (Mathematica's `BSplineCurve` defaults:
  `SplineDegree -> 3`, clamped uniform knots, open; evaluated with de Boor's algorithm), `tableStep(start, end, n = 11)`
  (`Table[…, {t, start, end, (end - start)/11}]`: step = (end − start)·(1/11), t<sub>k</sub> = start + k·step,
  k = 0…11, 12 values, K-TK-07), `myArrowArc(c, r, [start, end])`, `myArrowArc2(c, r, [start, end])` returning
  `{kind: 'Point', at}` or `{kind: 'Arrow', control, curve, tip, direction}` (arrowhead direction = the end tangent, i.e.
  the last control leg; for a zero-length curve +x, snapshot 1 dial, Q-TK-05), and `arrowArc(circle)` (the
  `arrowArc[Circle[c, r, {start, end}]]` of robot-motion-obstacles, bfs-motion-planning and the torus chart: the arc plus
  an arrow whose shaft is r/10⁶ long, ending at the arc's end point along the counter-clockwise tangent there).
- `demos/common/dial-control.js` (browser-only): `makeHand(fl, bl, fw, bw)` (pure, exported) and
  `makeDialControl(controls, {name, label, color, imageSize = 140 | 'automatic', setter = 'normalize' | 'nearest32',
  arc = 'myArrowArc2' | 'arrowArcCircle', keyStep = 0.05 | 'grid', clamp = true, labels = 'stacked' | 'inline', value,
  onInput})` — one small `createPlot` with one `addLocators` locator
  (`pickAnywhere: true`, default `locatorGlyph`), gray circle, 17 long and 16 short ticks, labels −3π/4 … π, the hand and
  the arc of F-TK-02. Variants (all apps use this module; no app-level dials): `setter: 'normalize'` = `pt =
  Normalize[#]` (TK, DN, torus chart; `normalizeCR`, K-TK-11); `setter: 'nearest32'` = `pt = Nearest[Table[{Cos@a,
  Sin@a}, {a, -π, π, π/32}], #][[1]]` (manipulability ellipsoid, camera-lasers; Euclidean distances and input-order
  ties via `shared/mma-extra.js` `nearest`, K-TK-12); `arc: 'arrowArcCircle'` = the torus chart's
  `arrowArc[Circle[cent, 0.3, {0, ang}]]` after its `If[ang < 0, ang = ang + 2π]`, which never fires because `ang` is a
  `Dynamic` object (Q-TC-01): the angle stays in (−π, π], the arc runs clockwise for the lower half of the dial and the
  arrowhead points back along it; `imageSize: 'automatic'` for the manipulability ellipsoid, whose stored output-cell
  Initialization defines the dial without `ImageSize` (about 180 pt); TK 140, DN 120, camera-lasers 120, torus chart 160.
  Options decided in COMMON-DECISIONS §5: `keyStep` — a number = locator units per arrow key in the dial's own
  coordinates (default `0.05`, Shift = 5×), followed by the setter (TK, DN, torus chart; A-TK-02, A-TC-02), or `'grid'`
  = one table step per key along the dial for the `nearest32` setter (Right/Up = +π/32, Left/Down = −π/32, Shift = π/8;
  camera-lasers A-CL-03, manipulability ellipsoid A-ME-02); `clamp` (default `true`, every variant) — every dial is a
  `LocatorPane`, so the pointer is limited to the dial graphic's plot range before the setter runs (a drag far outside
  gives the angle of the clamped point). The clamp stays a lead shared with the torus chart, K-TC-04, until a drag far
  outside a dial is checked by hand there (M-TC-03).
  Labels and ids (COMMON-DECISIONS §6): the π-fraction labels are `piFraction` of `shared/mma-text.js`, `labels:
  'stacked'` (built-up fractions, as `Text[θ, …]` with an exact θ draws them in all five originals) or `'inline'`; the
  dial container has the test id `dial-<name>` (not interactive, not in the UI inventory), its locator `locator-<name>`
  (in the inventory). The module's tests are in this app's TESTPLAN (T-TK-23, T-TK-24, T-TK-86 `keyStep: 'grid'`,
  T-TK-87 `clamp`).
- `shared/mma-text.js` (MIT, generic; owned by this app since COMMON-DECISIONS §6, specified in camera-lasers' design §6,
  its main user): `piFraction(num, den)` ("3π/4", "−π/2", "π"), exact rationals as stacked or inline fractions, machine
  numbers through `mmaNumberString`.
- Coordination: robot-motion-obstacles owns `arm-grid.js`/`arm-view.js`; its `armHits` uses `armSegments` from
  `two-link.js` and its `armGraphics` (Graphics data since v0.1.19; formerly `drawArm`) draws `armGeometry`.

**Reused modules (exact exports).** `shared/svg-plot.js`: `createPlot` (main graphic `plotRange [[-3, 3], [-3, 3]]`,
`imageSize 400`; dials and pad with their own plots), `addLocators` (`pickAnywhere: true`, `appearance: () => null`
for pEnd/pVel, default glyph for dials and pad), `locatorGlyph`, `svgNode`, `POINT_SIZE`, `ABS_THICK`.
`shared/ui.js`: `Controls.slider` (r1: `step: 0` — continuous, so `steps: 'mma'` does not apply — labelled, ⊕ panel, `format` hook showing machine reals as Mathematica does, "2."), `el`. `shared/ui-extra.js`: `addCheckbox`.
`shared/mma.js`: `mEqual`, `mUnequal`, `mLess`, `mGreater`, `mLessEq`, `mGreaterEq`. `shared/mma-exact.js`: `arcTan`
(bit-exact `ArcTan[x, y]`, no −0), `norm` (dnrm2 `Norm`), `fma` (exact 2×2 determinant in `svd2`).
`shared/mma-colors.js`: `NAMED`, `darker`, `css`. `demos/common/prm-core.js`: `sameReal` (SameQ with last-bit
tolerance, for `myArrowArc2`). `shared/requirements.js` (start-up notice).
`shared/mma-extra.js`: `normalizeCR` (Normalize of the dial setter and of the pad clamp, K-TK-11), `nearest` (dial
variant 'nearest32'). `demos/common/svd3.js`: `matrixRank`, `RANK_TOL_REL` (MatrixRank
of Σ, tolerance K-RS-05b) — robot-singularities' module, moved unchanged to `demos/common/` by dh-parameters in
v0.1.16 (DH-family move, COMMON-DECISIONS §6; until then this app imported `demos/robot-singularities/svd3.js`).

**State model.** Manipulate variables (above) live in the `main.js` Manipulate (`shared/manipulate.js`); `evaluate` is pure and gets/returns them all.
Locals are recomputed on every evaluation. Exact Mathematica numbers (the initial values, a typed integer r1) are
machine numbers in the port (D-TK-01).

**Evaluation order** = the body's statement order (F-TK-09 → F-TK-10 → F-TK-12 → F-TK-13/14/15), then `scene`.
The port evaluates once per update: a drag gives at most one evaluation per animation frame with the latest pointer
position; a key press, a slider step, a check-box click one each (D-TK-02, K-TK-02).

**Numerics.**
- Tolerant comparisons wherever the original compares reals: `Norm[pEnd] >= 2` and `x^2 + y^2 >= (r1 + r2)^2`
  (`mGreaterEq`: the clamped point has x² + y² = 3.999999999999999, which must count as ≥ 4, otherwise θ2 becomes
  −2.98·10⁻⁸ instead of 0), `Norm[pEnd] <= Abs[r1 - r2]` (`mLessEq`), `pEndp != pEnd` and `pVelp != pVel` (Unequal on
  lists, tolerant per coordinate, K-SL-04), `Theta2 > 0`, `< 0`, `Σ11 > 0`, `Σ22 > 0` (against exact 0: plain sign
  tests), `vNorm > 1`, `Sqrt[q1^2/Σ11^2] > 1`, `r1 != 1`, `r2 < 1`, `r2 >= 1`, `Abs[θ] > π/4` (tolerant), `start ==
  end` (`mEqual`), `start === end` (`sameReal`).
- `ArcTan[x, y]`: `mma-exact.arcTan`. `Norm`: dnrm2. `Normalize`: reciprocal of the correctly rounded length.
- `a/b` is `a·(1/b)`, grouped as the stored Body writes it: the clamps are `2 (pEnd/Norm[pEnd])` and
  `Abs[r1 - r2] (pEnd/Norm[pEnd])` (raw notebook lines 1727–1732), i.e. `k·(pEnd·(1/n))` with the quotient first;
  `(pVel - pEnd)/vNorm` = `(pVel - pEnd)·(1/vNorm)` (N-TK-01). The 4-argument `Dot` `V.M.Transpose[U].(pVel - pEnd)`
  is evaluated left to right by the port, a lead (K-TK-10). The order of the four terms of D's numerator is
  taken as ascending (`Plus` is Orderless, `plusOrderless`) — a lead: four-bar's stored samples point to written order
  (K-FB-05), the harness decides (K-TK-03, COMMON-DECISIONS §4).
- Signed zeros are normalised (`+ 0`) wherever a product can give −0 (`-r1 Sin[0] - r2 Sin[0]`, `-1·Sqrt[0.]`).
- `Theta2inv` with `1 - D^2 < 0`: the real part of Mathematica's complex `ArcTan[D, ±i·√(D² − 1)]` =
  `−i Log[(D ∓ √(D² − 1))/1]` is 0 for D > 1 and π for D < −1 (Wolfram Language reference, ArcTan, for complex
  arguments); the port returns these constants instead of computing complex logarithms.
- `svd2(J)` (PORT DEVIATION D-TK-03): σ1 = √ of the larger eigenvalue of JᵀJ = {{p, q}, {q, r}}, ((p + r)/2 + hypot((p − r)/2, q)) (closed form; it gives the correctly rounded √2 of T-TK-83, which the (a ± d, c ∓ b) half-sum form missed by 1 ulp), σ2 =
  abs(det J)/σ1 with det J = J11·J22 − J12·J21 evaluated exactly (two `fma`), then **σ2 = 0 when σ2 ≤ 100·2⁻⁵³·σ1**
  (100·10^−MachinePrecision, the documented default tolerance of `SingularValueDecomposition`/`SingularValueList`/
  `PseudoInverse`, COMMON-DECISIONS §4; K-TK-01). An exactly singular J (straight arm with r1 = r2, snapshot 2) and a
  rounding-singular one (straight arm with r1 ≠ 1, folded arm θ2 = π: σ2 ≈ 10⁻¹⁶ σ1) both get σ2 = 0 and take the
  singular branch. v₁ = unit eigenvector of
  JᵀJ for σ1² (angle ½ atan2(2q, p − r); unit vectors get one Newton step towards length 1, so ‖UᵀU − I‖ ≤ 4·10⁻¹⁶), v₂ ⊥ v₁, u<sub>i</sub> = J v<sub>i</sub>/‖J v<sub>i</sub>‖ (u₂ = the perpendicular of u₁ when σ2 = 0),
  so that axis-aligned cases such as the initial J = {{0, 0}, {2, 1}} give u₁ = (0, 1) exactly; their signs are
  arbitrary: every use is sign-invariant (q enters squared or as `U.{q1, 0}` = (u₁·d)u₁, the
  inverse is V Σ⁻¹ Uᵀ = J⁻¹, ellipse and arrows are symmetric). `pseudoInverse2(J)` uses the same tolerance; for
  rank 1 it is Jᵀ/‖J‖²<sub>F</sub> (gives exactly the doubles of 2/5 and 1/5 at the initial settings).
- Drawing sizes: `Thin`, `Thick`, `PointSize[Large]`, `Medium` text, default arrowheads as in the other SVG ports
  (shared svg-plot conventions, D-CP-03, D-SL-03); default arrowhead length fitted to snapshot 1 (about 0.2 plot
  units, 27–30 px of the 801 px plot width) (D-TK-04).

**Region / contour built-ins.** None: the original draws only `Disk`, `Ellipsoid` (under `GeometricTransformation`),
`Rectangle` with `RoundingRadius`, `Arrow`, `BSplineCurve`, `Line`, `Circle`, `Point`, `Polygon`, `Text`. The
fidelity risks are `SingularValueDecomposition` (exact zero vs tiny σ2), `PseudoInverse`, `MatrixRank` tolerance,
`Table` with a real step, `BSplineCurve` and the automatic arrowhead size.

### 6.1 Building and deploying this app alone

Owner rule R-A (2026-10-17): this one app can be taken out of the repository and hosted anywhere. One command builds it:

```
npm run bundle -- two-link-kinematics
```

`tools/bundle-app.mjs two-link-kinematics` (npm script `bundle`) writes `dist/two-link-kinematics/`: the app with exactly the files it needs — its HTML, its modules and everything they import, recursively, with the repository's relative layout kept — plus the licence texts that apply, a generated `README.md` (title, the original's credits, licence, "serve this folder with any static web server", how to run its tests in the full repository) and a root `index.html` that opens the app (the "All demos" link of the bundled page leads to that root page). Nothing else. Contents (generated with `npm run bundle -- --update-docs`; unit "bundle contents listed in DESIGN.md match the collector" keeps the table current):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/two-link-kinematics/`) | 4 | `index.html`, `main.js`, `model.js`, `velocity-pad.js` |
| `shared/` | 19 | `exact-pi.js`, `graphics-extras.js`, `graphics.js`, `graphics3d.js`, `manipulate.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `mma-text.js`, `mma.js`, `random.js`, `requirements.js`, `style.css`, `svd3.js`, `svg-frame.js`, `svg-plot.js`, `ui-extra.js`, `ui-interval.js`, `ui.js` |
| `demos/common/` | 5 | `arrow-arcs.js`, `dial-control.js`, `prm-core.js`, `svd3.js`, `two-link.js` |
| added by the bundler | 7 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/two-link-kinematics/DESIGN.md` |
<!-- bundle-contents:end -->

Licences: `LICENSES/CC-BY-NC-SA-3.0.txt` (this app and every `demos/…` module: derived from Wolfram Demonstration code); `LICENSES/MIT.txt` (the `shared/…` modules).

Requirements: a current browser with ES modules (Firefox, Chromium, WebKit); no WebGL. Since the DH-family move (v0.1.16) the bundle contains `demos/common/svd3.js` and its import `shared/graphics3d.js` (CC BY-NC-SA 3.0) instead of robot-singularities' files.

Verified by e2e "bundle: two-link-kinematics runs from its own folder" (A-TK-07): the test runs the bundle command, serves `dist/two-link-kinematics/` alone with a static file server (no access to the rest of the repository), opens the root `index.html`, follows it to the app and checks: no console error, no failed request, every request stays inside the folder, the controls of §5 are present and the first picture is drawn (the SVG graphic is not empty); it also compares the folder's file list with the generated list in its `README.md`.

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

| ID | Kind | Description |
|----|------|-------------|
| Q-TK-01 | quirk kept | `pVelp` starts at {1, 1} while `pVel` starts at {2, 1}, so the very first evaluation runs inverse velocity: the declared initial `jointVel = {1, 0}` is never shown; the opening state has `jointVel = {2/5, 1/5}` (saved state, snapshot 1 pad at (0.4, 0.2)). |
| Q-TK-02 | quirk kept | `IsElbowUp` is overwritten from the sign of θ2 on every evaluation, also in FK (the check box follows the θ2 dial: ticked for θ2 < 0); at θ2 = 0 (straight arm) it keeps its value, so a click there changes the box but not the arm. On the inner boundary θ2 = π, which unticks the box even right after the user ticked it. |
| Q-TK-03 | quirk kept | In the singular branch the second `If[Σ22 > 0, pVel = U.{0, q2} …]` is dead: the branch is entered only when Σ22 is not > 0, and Σ11 > 0 always (column 2 of J has length r2, column 1 length r1 when r2 = 0). `Σ22 > 0` against the exact 0 is true for every σ2 the SVD keeps, so the singular branch runs exactly when `SingularValueDecomposition` has set Σ22 to 0 — J singular within its tolerance (≤ 100·10⁻ᵖ·Σ11): the straight arm (exactly singular for r1 = 1, rounding-singular otherwise) and the folded arm θ2 = π. |
| Q-TK-04 | quirk kept | Inverse velocity scales pVel − pEnd radially toward pEnd onto the ellipse (it does not project to the nearest ellipse point). Near a singularity but above the SVD tolerance (a thin ellipse, e.g. θ2 within about 10⁻⁷…10⁻² of 0 or π) a point off the long axis is pulled almost onto pEnd and jointVel becomes nearly the unit null vector ±v₂. Snapshot 3's `Settings` show exactly this (r1 = 1.59, now folded at θ2 = π): pVel − pEnd = 2.93·10⁻⁷, ‖jointVel‖ = 1.0000000086 (the rounding of pEnd + tiny offset), J·jointVel + pEnd = pVel. |
| Q-TK-05 | quirk kept | `myArrowArc` uses `==`, `myArrowArc2` `===` (comment "problem -- initial point too far out"). In the dial `ang` is a `Dynamic` object, so `0 === ang` is never true: the dial always draws an arrow, at angle 0 a zero-length one whose head points along +x (visible on the hand in snapshot 1). |
| Q-TK-06 | quirk kept | IK writes `p1`, `p2` but not `pEnd`: the black icon stays where it was dragged (after the clamps) while the arm's tip is the FK of the new angles; they agree to rounding. |
| Q-TK-07 | quirk kept | Moving r1 keeps the joint angles (FK: the tip moves) unless the old tip lies inside the new hole or beyond radius 2: then the clamp pushes it radially to the boundary, `pEndp != pEnd` and IK runs — the arm jumps. From a folded arm (tip at rounding distance 1.2·10⁻¹⁶ from the origin) the push direction is that rounding vector (port prediction for H-TK-09: tip to (0, 0.7999999999999998) for r1 = 1.4). |
| Q-TK-08 | quirk kept | `Re[…]` around both IK functions: when rounding gives abs(D) slightly above 1, `Sqrt[1 - D^2]` is imaginary and the real part of the complex `ArcTan` is 0 (D > 1) or π (D < −1). |
| Q-TK-09 | quirk kept | The pad setter applies `Re` to a real point (no effect) and clamps with `Norm[…] > 1` (tolerant), so a point a rounding error outside the disk is kept. |
| Q-TK-10 | quirk kept | `pVel = J.jointVel + pEnd` can lie up to 2 + Σ11 from the origin, at most 2 + 2√2 ≈ 4.83 (r1 = 0: Σ11 = 2√2) while the picture shows ±3: the green icon and arrow head can leave the picture, and the pVel locator range ±4 cannot hold such a point either. |
| D-TK-01 | deviation | The original's initial values are exact (integers, `jointVel` becomes the exact {2/5, 1/5} and Σ11 = √5); the port computes with machine numbers. The saved values are reproduced as the nearest doubles (0.4, 0.2); other last bits may differ in that one state (cf. D-CP-01). |
| D-TK-02 | deviation | What counts as one update differs: the front end decides how often it evaluates during a drag and may evaluate again after the body assigned its own variables (K-TK-02); the port evaluates once per animation frame or key press. |
| D-TK-03 | deviation | `SingularValueDecomposition`, `PseudoInverse`, `MatrixRank` are replaced by the closed-form `svd2` (σ2 = abs(det J)/σ1, then set to 0 at or below 100·2⁻⁵³·σ1, Mathematica's documented default tolerance), the rank-1 pseudoinverse with the same tolerance and `matrixRank` of `demos/common/svd3.js` (robot-singularities' module, moved in v0.1.16). Singular values may differ from LAPACK's in the last bits (which only matters within a few ulps of the tolerance); singular-vector signs differ freely (nothing drawn depends on them). |
| D-TK-04 | deviation | Line widths, point sizes, fonts, the B-spline (sampled polyline, 48 points) and arrowheads (filled triangle, length 0.21 plot units fitted to snapshot 1, half-width 0.3 of the length; the shaft of a straight arrow ends under the head; a zero-length straight arrow has no direction and draws nothing, K-TK-05), `Thin` edges of the workspace disks and the ellipse as `AbsoluteThickness[0.25]` (the shared 0.5 px drew the circle much darker than the snapshots, as car-paths D-CP-03), default points 3.5 px, text 11 px (`Medium` 13 px), "θ̇ᵢ" in the pad as θ with a dot above and a subscript approximate Mathematica's rendering; dial labels are drawn by `dial-control.js` with `piFraction` of `shared/mma-text.js`, `labels: 'stacked'` (−3π/4 as "3π" over "4" with a minus sign; SVG text approximates the typesetting). When the white hole's edge coincides with the workspace edge (r1 = 0 or 2, snapshot 4) both disks keep their fills but the circle is stroked once — by the hole, drawn last — instead of twice (Mathematica draws both edges; two antialiased 0.25 px strokes on top of each other came out visibly darker than the snapshot's single faint line). |
| D-TK-05 | deviation | The r1 value field uses `shared/ui.js`'s `format` hook so that a machine real shows as Mathematica shows it ("2.", "1.59"); it is an HTML input; typed values are clamped to 0…2 (Mathematica accepts any typed value, K-TK-09). |
| D-TK-06 | deviation | LocatorPane picking as in the other ports (D-CP-06): a press within 12 CSS px grabs a locator without a jump, elsewhere the nearer of pEnd/pVel jumps to the press point (ties: pEnd first, the order of the controls); the same rule inside each dial and the pad (one locator each). The no-jump distance of the original is unknown (M-TK-08). |
| D-TK-07 | deviation (decided by harness run 2) | pEnd exactly at the origin with r1 = 1 (`0 pEnd/0`): Mathematica computes with `Indeterminate` (H-TK-12, K-TK-04); the port ignores the update (the state before it is kept). A dial press exactly at its centre is not such an input (`ArcTan[0., 0.]` = 0., H-TK-13); the page's dial still ignores it: P-TK-01. |
| K-TK-01 | known issue (resolved in v0.1.17) | SVD tolerance. Wolfram documentation (COMMON-DECISIONS §4): `SingularValueDecomposition` sets to zero the singular values `SingularValueList` would drop, i.e. those ≤ 100·10⁻ᵖ times the largest (≈ 1.1·10⁻¹⁴ relative), and `PseudoInverse` uses the same default; the port follows it (D-TK-03). Evidence in the original: snapshot 2's `Settings` (r1 = 1, θ2 = 0, J exactly singular) are the singular branch with the cap (‖pVel − pEnd‖ = √5 within 4 ulps, jointVel = v₁ = (2, 1)/√5 within 1 ulp). Still to confirm: rounding-singular Jacobians (straight arm with r1 = 1.5, folded arm) and the edge (≤ or <; the tolerance in bits). Harness H-TK-05, H-TK-18, H-TK-19, H-TK-23; M-TK-04. Harness run 2 (Mathematica 15.0.1): `SingularValueDecomposition[{{1., 0.}, {1., 1.*^-14}}]` sets σ2 (5·10⁻¹⁵ relative) to 0, with `1.*^-13` σ2 = 7.071067811865477·10⁻¹⁴ is kept, `MatrixRank` of diag(1, 10⁻¹⁴) is 1 and of diag(1, 10⁻¹³) 2 (H-TK-23): the threshold is at least 10⁻¹⁴ and below 5·10⁻¹⁴ relative, consistent with the documented 100·2⁻⁵³ ≈ 1.1·10⁻¹⁴ the port uses; the singular branches of H-TK-01, -05, -18, -19 are taken as recorded. `PseudoInverse` there is the truncated SVD V·Σ⁺·Uᵀ (H-TK-23: {{0.5000000000000001, 0.5}, {2.5000000000000004·10⁻¹⁵, 2.5·10⁻¹⁵}}); the port's rank-1 formula Jᵀ/‖J‖²_F gives {{0.5, 0.5}, {0, 5·10⁻¹⁵}} for a J that is singular only within the tolerance (a difference of the size σ2/σ1) and agrees with the record wherever J is exactly singular (H-TK-01 bit for bit; the truncated-SVD formula with svd2's U, V would lose that, so it is not used). The shared `matrixRank` (K-RS-05, 3·2⁻⁵²) is applied here only to svd2's already truncated values, so the rank is the original's. |
| K-TK-02 | known issue (lead) | Does the front end evaluate the body again after it assigned `p1`, `p2`, `pEnd`, `pVel` (K-SL-02)? Here harmless: the second pass is FK and moves pEnd by at most an ulp (H-TK-02 step 2). The port does not re-evaluate. |
| K-TK-03 | known issue (lead) | On the inner boundary D is −1 only up to rounding: D = −1 or < −1 gives θ2 = π (check box unticked), D = −0.9999999999999999 gives θ2 = ∓(π − 1.5·10⁻⁸) (elbow up keeps its tick). Which one happens depends on Mathematica's summation order in D's numerator `-r1^2 - r2^2 + x^2 + y^2`. **The port's order is a lead, not a finding:** `model.js` `plusOrderless` adds the four terms in ascending (canonical, Orderless) order; four-bar-linkage's evidence (K-FB-05: inside `Plot` the stored samples fit `Plus` in **written** order, 203/206 against 188/206 for ascending order) points the other way, and no stored value of this app decides it (the saved states never sit on the inner boundary with the two orders apart). Batch-wide status: COMMON-DECISIONS §4 ("Plus order: unresolved"). Harness: H-TK-06, H-TK-07, H-TK-09 may not separate the orders (at r1 = 1.5 the written order is already ascending); a scenario that does — to add to the TESTPLAN as H-TK-25 — is `start live; set r1 0.1; set pEnd {0.4, 0.3}` (inner clamp to 1.8·{0.8, 0.6}), capturing `D`'s inputs, `Theta2` and `IsElbowUp`: written order gives D = −1.0000000000000004 → θ2 = π and the box unticked, ascending order D = −0.9999999999999998 → θ2 = −(π − 2.1·10⁻⁸) with elbow up kept (the same for pEnd {0.8, 0.6}; r1 = 0.03 gives −1.0000000000000007 against −0.9999999999999989). If the harness shows the written order, `theta2D` adds left to right. M-TK-05. Harness run 2 does not decide it: in H-TK-06/H-TK-07 (r1 1.5, pEnd pushed to (0.6, 0.8)) the four terms −2.25, −0.25, 0.36, 0.64 sum to exactly −1.5 in every order (D = −1, θ2 = π, box unticked — as the port), and no other IK step of the 24 scenarios has an order-dependent sum. A pose that decides it (found by search): r1 0.53 with pEnd (0.09, 0.04) from the live state — ascending order gives D = −1, θ2 = π, box unticked; written order D = −0.9999999999999999, θ2 = −3.141592638688632, box ticked (proposed TESTPLAN scenario for the next run, see the report to the lead). Still a lead. |
| K-TK-04 | known issue (resolved in v0.1.17) | `Indeterminate` inputs (D-TK-07): what Mathematica shows (error box, partly drawn arm, unchanged picture) and whether the state recovers on the next drag. Harness H-TK-12, H-TK-13; M-TK-06. Harness run 2: pEnd at the origin (H-TK-12) gives `Power::infy` and twice `Infinity::indet`, pEnd, pEndp and pVel become `{Indeterminate, Indeterminate}`, Theta1 and Theta2 are not assigned and the graphic is built with Indeterminate coordinates — the port keeps ignoring that update (D-TK-07). A dial press at the centre (H-TK-13) is not indeterminate: `ArcTan[0., 0.]` is 0. without a message, FK runs with θ1 = 0 (pEnd {2., 0.}, pVel {2., 1.}) — the port's model does the same, its dial ignores the press (P-TK-01). What the front end shows for H-TK-12 stays a manual check (M-TK-06). |
| K-TK-05 | known issue (lead) | Mathematica's automatic arrowhead size (`Arrowheads[Automatic]`) depends on the arrow and the image; the port uses one fitted length. The head of a zero-length arrow points along +x in snapshot 1 (dial); for the zero-length red arrows ±Σ22 u₂ at a singular J nothing is visible in snapshot 1. M-TK-09. |
| K-TK-06 | known issue (lead) | Snapshots 1 and 3 show a 1–2 px coloured dot just after some labels (red after "Workspace", green after θ₂); no primitive of the source draws it. Probably a rendering artefact of the snapshot tool; not reproduced. M-TK-09. |
| K-TK-07 | known issue (resolved in v0.1.17) | `Table[…, {t, start, end, (end - start)/11}]` with machine numbers: the port assumes Mathematica's iterator tolerance always gives 12 points ending at `end` (H-TK-22 records the control points). Harness run 2 (H-TK-22): 12 control points, the last at `end`, the arcs as the port's. |
| K-TK-08 | known issue (lead) | Machine `Sin`, `Cos`, `Sqrt` may differ in the last bit between Mathematica and the browser (K-CP-04); matters only at the boundaries of K-TK-01 and K-TK-03. Harness run 2: Mathematica 15.0.1's `Sin[0.7853981633974483]` is 0.7071067811865476 (= its `Cos`), V8's 0.7071067811865475 (correctly rounded): in H-TK-05 the tip on the outer boundary is (1.4142135623730951, 1.4142135623730951) in Mathematica, the port's FK gives 1 ulp less in y, and pVel − pEnd = (−0.25, 0.25) cancels, so jointVel differs by 5.3 ulps (the golden test allows 4 ulps of max |pEnd|·‖J⁺‖ there, as N-TK-08); elsewhere the state agrees bit for bit (17 of 24 scenarios) or within 3.1 ulps (H-TK-24). Stays open as a known limit. |
| K-TK-09 | known issue (lead) | Typed r1 outside 0…2 (r2 < 0 or r1 < 0: negative link lengths) — what the original draws is unknown; the port clamps (D-TK-05). Harness H-TK-20 records the body's result for r1 = 2.5; M-TK-10. Harness run 2 (H-TK-20): the body's state for r1 = 2.5 equals the port model's bit for bit; the page still clamps typed values (D-TK-05), what the original draws stays M-TK-10. |
| K-TK-10 | known issue (resolved in v0.1.17) | `jointVel = V.{{1/Σ11, 0}, {0, 1/Σ22}}.Transpose[U].(pVel - pEnd)` is one 4-argument `Dot`; the order in which Mathematica forms the products (left to right, right to left, matrix–vector first) changes the last bits of jointVel. The port evaluates left to right. Harness H-TK-14/H-TK-15 record jointVel bit for bit and H-TK-23 compares `a.b.c.d` with both groupings. Harness run 2: left to right. `a.b.c.d` equals `((a.b).c).d` bit for bit and differs from `a.(b.(c.d))` (H-TK-23), and the port's left-to-right Dot applied to the recorded U, Σ, V reproduces jointVel bit for bit in H-TK-14 ({−0.19999999999999998, 0.5}) and H-TK-15 ({−0.7071067811865475, 0.7071067811865476}). The port's own jointVel differs there by 1 and 2 ulps because svd2's U and V differ from LAPACK's in the last bit (P-TK-02). |
| K-TK-11 | known issue (resolved in v0.1.17) | Normalize model of the dial setter and the pad clamp: the port uses `normalizeCR` (v·(1/correctly rounded length), as the art-gallery 2019/15.0.1 data); `normalizeDnrm2` fits other data (COMMON-DECISIONS §3). No TK value decides it (the dial vectors in the snapshot `Settings` come from IK or from presses whose position is unknown). Harness H-TK-23 captures `Normalize` of test vectors. Harness run 2 (H-TK-23): `Normalize` of (3, 4.1), (−0.7, 0.31), (0.001, 2.5) equals `normalizeCR` bit for bit. |
| K-TK-12 | known issue (lead, for the apps using `setter: 'nearest32'`) | `dial-control.js`'s Nearest variant: a press exactly at the dial centre is not "all points equidistant" in machine arithmetic — dnrm2 gives 8 of the 65 rim points the distance 0.9999999999999999, and the first of them in table order wins (port: `nearest`, input-order ties). To be checked with the harness by the manipulability-ellipsoid and camera-lasers apps. |
| K-TK-13 | known issue (lead) | The joint-velocity pad is a `LocatorPane` too: the port limits the pointer to its plot range (±1 with the 2 % padding, ±1.04) before the setter, as COMMON-DECISIONS §5 decided for every dial (`dial-control.js` `dialPaneRange`, `clampToRange`); a drag far outside the pad gives the direction of the clamped point (unit "velocity pad setter clamps to the unit disk"). Not in the draft; same evidence as K-TC-04 (M-TC-03), check together with M-TK-07. |
| N-TK-01 | note | Order of operations as stored in the Body: the clamps are `2 (pEnd/Norm[pEnd])` and `Abs[r1 - r2] (pEnd/Norm[pEnd])` (quotient first, then the factor), `(pVel - pEnd)/vNorm` = (pVel − pEnd)·(1/vNorm); the multi-argument `Dot` is K-TK-10. The inner clamp at r1 = 1.4 therefore gives abs(1.4 − 0.6000000000000001) = 0.7999999999999998 times (pEnd·(1/n)). |
| N-TK-02 | note | "elbow up?" ticked means θ2 < 0 (the −√ root of `Theta2inv`). |
| N-TK-03 | note | The comment "the next are global variables to control how often freeConfigSpace is updated" is left over from Robot Motion with Obstacles; there is no `freeConfigSpace` here. `ang` in `make2VelControl` is unused. |
| N-TK-04 | note | The Details text describes Denavit–Hartenberg matrices; the code writes forward kinematics and J directly with Sin/Cos. |
| N-TK-05 | note | Saved state: the raw notebook stores `jointVel = {Rational[2, 5], Rational[1, 5]}` (exact); the first extracted JSON showed 0.4, 0.2. The fixture `tests/golden/two-link-kinematics.original-states.json` keeps the exact values as `{"wl": "2/5"}` next to their double. |
| N-TK-06 | note | The notebook's snapshot cells 5 and 6 contain the Wolfram icon placeholder, not a state; four real snapshots. |
| N-TK-07 | note | Snapshot `Settings` (raw notebook): 1 = the saved state; 2 = r1 1, straight arm (p2 = {1, 0} exact), elbow up off, pEnd (−1.9259280394283633, 0.5392598510399419), pVel (−2.5288388816592233, −1.613993156927415), jointVel (0.8944271909999155, 0.4472135954999578); 3 = r1 1.59, folded (p2 = (−1., 1.2246467991473532·10⁻¹⁶), θ2 = π), pEnd (0.5890309615033067, −1.0224688388359278), jointVel (0.32820990311228027, 0.9446048257303126); 4 = r1 2., θ2 dial (−0.8044332669603459, 0.5940430279091784), jointVel (0.7119664484531625, 0.7022134834058589). IK at snapshot 3's pEnd would give D = −0.9999999999999998 for every summation order, so it is a fixed-point case, not a D = −1 case. |
| N-TK-08 | note | Corrections of the draft TESTPLAN made while writing the tests (expected values from independent computations, not from the port): T-TK-87 — Normalize of the pointer (0.3, 0.4) is (0.6, 0.8) (‖(0.3, 0.4)‖ rounds to 0.5 exactly), the draft repeated (0.6000000000000001, 0.8), which belongs to (3, 4) (found by the module builder; tests/unit/dial-control.test.js); T-TK-36 — snapshot 4's pVel x = −1.364… + 1.041… = −0.323 cancels, so "within 1 ulp" holds for the summands but not for the sum (port −0.3231340149497999, saved −0.32313401494979965: 3 ulps of the sum, 0.8 ulp of abs(pEnd x)); the test bounds the difference by 1 ulp of abs(pEnd); T-TK-19 — the grid minimum of σ1 by the independent JᵀJ formula is 0.8838874555028117 (64 × 64 grid of k·2π/64), the draft's 0.8838874555028114 is matched within 1e-14. |

## 8. Proposed changes

Template: see [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md).

| ID | Status | Requested by / date | Change | Reason | Acceptance criteria |
|----|--------|---------------------|--------|--------|---------------------|
| P-TK-01 | proposed | harness run 2, 2026-10-18 | Accept a dial setter result (0, 0) (a press exactly at the dial centre) for the two-link dials instead of ignoring it: p1 or p2 becomes {0., 0.}, θ = 0, the arm turns to that angle | H-TK-13: `ArcTan[0., 0.]` is 0. without a message; the original runs FK with θ1 = 0 (pEnd {2., 0.}, pVel {2., 1.}); the port's model does the same, but `demos/common/dial-control.js` drops the (0, 0) result (shared with torus chart K-TC-03 and the other dial apps, so an owner decision per app) | golden "harness H-TK-13" and an e2e press at the exact dial centre show the arm at θ = 0 |
| P-TK-02 | proposed | harness run 2, 2026-10-18 | Reproduce LAPACK's 2×2 SVD (dgesvd) bits in svd2 | H-TK-14/H-TK-15: the port's U, V differ from Mathematica's in the last bit (e.g. 0.8506508083520399 and 0.85065080835204 swapped between U and V), so jointVel differs by 1–2 ulps although the Dot order is the original's (K-TK-10); invisible, a large change | golden "harness H-TK-14"/"H-TK-15" compare the port's own jointVel bit for bit |

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.15 | 2026-10-17 | first implementation of the design draft approved by the owner on 2026-10-17 (DEC-17; draft of 2026-10-12 with COMMON-DECISIONS §5, §6 and owner rules R-A/R-B/R-C applied); decided while implementing: K-TK-13 (pad pointer limited to its plot range), N-TK-08 (three TESTPLAN corrections), the σ1 formula of `svd2` and the drawing sizes of D-TK-04; harness checks are golden tests "harness H-TK-nn" that skip until `tests/golden/two-link-kinematics.harness.json` exists; review fixes |
| 2 | v0.1.16 | 2026-10-18 | DH-family move (COMMON-DECISIONS §6): `matrixRank` is imported from `demos/common/svd3.js` (robot-singularities' module, moved unchanged) instead of `demos/robot-singularities/svd3.js` — in `model.js` and the unit and golden tests; §6 text and §6.1 bundle table updated (the bundle carries `demos/common/svd3.js` and `demos/common/g3d.js`); no feature change |
| 3 | v0.1.17 | 2026-10-18 | harness run 2 accepted, no change to the app code: K-TK-01, K-TK-04, K-TK-07, K-TK-10, K-TK-11 resolved with the recorded values, K-TK-08 and K-TK-09 updated, K-TK-03 not decided by the record (decisive pose proposed); D-TK-07 decided; P-TK-01 (dial press at the centre), P-TK-02 (LAPACK SVD bits) proposed. Golden tests: H-TK-13 asserts the recorded θ1 = 0 without messages, H-TK-14/H-TK-15 jointVel bit for bit from the recorded U, Σ, V (the port's own within 2 ulps, P-TK-02), H-TK-05 jointVel within 4 ulps of max \|pEnd\|·‖J⁺‖ (cancellation, K-TK-08), H-TK-23 PseudoInverse against the recorded truncated SVD and MatrixRank through svd2 |
| 4 | v0.1.18 | 2026-10-18 | version number only (harness run 3 accepted for manipulability-ellipsoid); no change to this app |
| 5 | v0.1.19 | 2026-10-21 | version number only (shared Manipulate layer added, four apps migrated to it); no change to this app |
| 6 | v0.1.20 | 2026-10-21 | `main.js` rewritten on the shared Manipulate layer (`shared/manipulate.js`, `shared/graphics.js`): control specs in Mathematica's form, the picture as Graphics data; no change to behaviour or picture (all unit, golden and browser tests unchanged and passing; screenshots and Manipulate state identical to v0.1.19 at sample settings) |
| 7 | v0.1.21 | 2026-10-23 | the model builds the picture as `shared/graphics.js` Graphics data (owner decision D2) and the body returns {state, view, graphics}; `main.js` shortened; hook `scene()` replaced by the layer's `graphics(0)` (browser tests moved, same checks); the old drawing output frozen in `tests/unit/fixtures/two-link-kinematics-drawing.pre-graphics.json` and tests that read the old format now read the same numbers through `annotations()`/`Cases()`; no change to behaviour or picture (screenshots and Manipulate state identical to v0.1.20 at sample settings) |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|-------------|---------|-------------|---------|
| I-TK-01 | Show θ1, θ2 and the joint velocities as numbers next to the dials and the pad | students can read exact values | a new display not in the original | F-TK-02, F-TK-05 |
| I-TK-02 | Project an out-of-ellipse velocity to the nearest ellipse point instead of scaling it radially | the green locator follows the pointer more naturally near singularities | changes the original's inverse velocity | Q-TK-04 |
| I-TK-03 | Treat near-singular Jacobians with a much larger tolerance (e.g. σ2 ≤ 10⁻⁶ σ1) like singular ones | no collapse of the green locator onto the tip near the boundary (Q-TK-04, snapshot 3) | departs from the original's `Σ22 > 0` test and Mathematica's 1.1·10⁻¹⁴ tolerance | Q-TK-03, Q-TK-04, K-TK-01 |
| I-TK-04 | Keep the check box as the user set it at θ2 = 0 and on the inner boundary | less confusing check box | changes Q-TK-02 | Q-TK-02, K-TK-03 |
| I-TK-05 | Keep the green velocity icon inside the picture (or enlarge the plot range to ±4.3) | the velocity end point never disappears | differs from the original's framing | Q-TK-10 |
| I-TK-06 | Name the check box by what it selects ("elbow counter-clockwise?", θ2 < 0) or define elbow up geometrically (elbow above the line from the base to the tip) | the label is also true for tips left of the base (E-TK-03) | a relabel is cheap; a geometric rule flips the box when the tip crosses x = 0 and departs from the original | E-TK-03, Q-TK-02, F-TK-04 |

## 11. Errors in the original (conceptual and mathematical)

Owner rule R-C (2026-10-17). Checked: every formula of the body and the Initialization against Spong, Hutchinson and
Vidyasagar [1] — `Theta2inv`/`Theta1inv` (θ2 = atan2(±√(1 − D²), D), θ1 = atan2(y, x) − atan2(r2 sin θ2, r1 + r2 cos θ2):
correct), the Jacobian (correct), the ellipse `Ellipsoid[{0, 0}, Σ^2]` under `{U, pEnd}` (semi-axes σ1, σ2 along u1, u2:
correct, since `Ellipsoid[p, M]` with a matrix M has semi-axes √eig M), the inverse velocity V Σ⁻¹ Uᵀ, the radial scaling
`(pVel - pEnd)/vNorm` (lands on the ellipse: vNorm becomes 1), the singular-branch cap σ1/abs(q1), the clamps and the pad
setter; the Details text and the control labels; the quirks Q-TK-01…10. Independent checks: a Python atan2 script for the
elbow side (E-TK-03), det J = r1 r2 sin θ2 for E-TK-02.

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|------|-----------------------|--------------------------|--------------------|-------------------------|--------|
| E-TK-01 | text | Details: "A<sub>i</sub> = rot<sub>z,θ<sub>i</sub></sub> trans<sub>z,d<sub>i</sub></sub> trans<sub>x,a<sub>i</sub></sub> rot<sub>z,α<sub>i</sub></sub>" | The last factor must be a rotation about **x** by α<sub>i</sub> (rot<sub>x,α<sub>i</sub></sub>, Spong et al. [1]). The 4×4 matrix printed right after it (third row 0, s<sub>α</sub>, c<sub>α</sub>, d) is the correct rot<sub>x</sub> product, so the formula contradicts its own matrix. The same sentence is in dh-parameters' Details (E-DH-01, N-DH-01). | Shows the Details as in the original (F-TK-25); the code never uses DH matrices (N-TK-04). | Text only: "rot<sub>x,α<sub>i</sub></sub>". No computed value, golden data, snapshot comparison or harness scenario changes; M-TK-01 would record the difference as intended. | open |
| E-TK-02 | text | Details: "All locations on the boundary of this workspace have only one solution, but locations inside the blue region can be reached by two configurations" and "singular configurations occur on the boundary of the workspace" | Wrong for r1 = r2 = 1, the initial setting (`If[r1 != 1, {White, Disk[…]}]` draws no hole): the folded arm θ2 = π puts the tip at the origin, an interior point, where det J = r1 r2 sin θ2 = 0 (singular) and every θ1 is a solution (infinitely many). Both sentences hold only for r1 ≠ r2. | Shows the text as in the original (F-TK-25). The code reaches the origin only through the clamp `Abs[r1 - r2] pEnd/Norm[pEnd]` = 0/0 (K-TK-04, D-TK-07). | Text only ("for r1 ≠ r2; with r1 = r2 the centre is a singular point reached by every θ1"). No test changes. | open |
| E-TK-03 | text | Control label "elbow up?" with `Theta2inv[…] := … ArcTan[D, If[IsElbowUp, -1, 1] Sqrt[1 - D^2]]` and `If[Theta2 > 0, IsElbowUp = False]; If[Theta2 < 0, IsElbowUp = True]` | Ticked means θ2 < 0: the elbow lies on the counter-clockwise side of the line from the base to the tip. That is "up" only for tips right of the base. For tips left of it the ticked box draws the elbow **below**: r1 = r2 = 1, tip (−1.2, 0.3) → elbow (−0.79, −0.61); tip (1.2, 0.3) → elbow (0.41, 0.91) (independent atan2 computation). Spong's "elbow up/down" name the two signs for a tip in the first quadrant. | Keeps the label and the sign rule (F-TK-04, F-TK-10, N-TK-02, Q-TK-02). | Relabelling ("elbow counter-clockwise?") changes no number. A geometric rule (elbow above the base–tip line) would flip the box when the tip crosses x = 0 and change `IsElbowUp` in harness results with tips at x < 0 and θ2 ≠ 0 (none of H-TK-01…24 or the snapshot `Settings` has one: snapshot 2 has x < 0 but θ2 = 0); e2e "clicking elbow up flips the arm to the other solution" stays (tip (1, 1)). Option: I-TK-06. | open |
| E-TK-04 | numerical | `If[Σ[[1,1]] > 0 && Σ[[2,2]] > 0, vNorm = …; If[vNorm > 1, pVel = (pVel - pEnd)/vNorm + pEnd]; jointVel = V.{{1/Σ11, 0}, {0, 1/Σ22}}.Transpose[U].(pVel - pEnd), … PseudoInverse[J] …]` | The Details promise the pseudoinverse at singular configurations, but only an exactly zero Σ22 (≤ 1.1·10⁻¹⁴ Σ11 after the SVD's tolerance) takes that branch. Just above it (θ2 within about 10⁻⁷…10⁻² of 0 or π, reachable by dragging) the regular branch divides by a tiny Σ22: the green locator collapses onto the tip and the joint velocity jumps to the rim along the null vector. Snapshot 3's `Settings` show it: ‖pVel − pEnd‖ = 2.93·10⁻⁷, ‖jointVel‖ = 1.0000000086. | Keeps it (Q-TK-04, K-TK-01, D-TK-03 with the documented tolerance). | Treating near-singular J as singular (I-TK-03, e.g. Σ22 ≤ 10⁻⁶ Σ11) keeps the green locator on the long axis near the boundary. Snapshot 3 would no longer be a fixed point: golden "two-link-kinematics: snapshot 3 Settings are a fixed point and show the near-singular squash" and H-TK-24 (snapshot 3) must be kept as "original mode" or re-baselined; H-TK-18/19 unchanged (already singular). Possible as an option. | open |
