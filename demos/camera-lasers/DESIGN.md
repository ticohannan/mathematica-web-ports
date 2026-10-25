# Design document: Measuring Distance and Orientation Using Camera and Lasers

| | |
|---|---|
| Code version: | 0.1.21 |
| Document revision | 1 (2026-10-17) — first implementation |
| Status | describes the app as implemented; changes go through *Proposed changes* (§8) and [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md) |
| Original | Wolfram Demonstrations Project, "Measuring Distance and Orientation Using Camera and Lasers", contributed by Shiva Shahrokhi and Aaron T. Becker, published 2016-06-29 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/MeasuringDistanceAndOrientationUsingCameraAndLasers/>. Readable source: [`docs/original-source/camera-lasers.txt`](../../docs/original-source/camera-lasers.txt); snapshots: `docs/original-snapshots/camera-lasers-1.png` … `camera-lasers-4.png` (pictures 5 and 6 of the extraction are the Wolfram logo placeholder); saved states (COMMON-DECISIONS §1): [`tests/golden/camera-lasers.original-states.json`](../../tests/golden/camera-lasers.original-states.json), written by `python3 tools/extract_state.py --snapshots`, with `states[0]` = the live output-cell state, `snapshots[1…4]` = the four snapshot cells' `"Settings"` (raw notebook lines 3870, 5398, 7079, 8753) and `specs`, exact values kept as `{"wl":"-1/5"}` |
| Port files | `model.js` (the Initialization functions, one evaluation of the Manipulate body, the top view and the camera image as `shared/graphics.js` data; pure, no DOM), `main.js` (the Manipulate on `shared/manipulate.js`: controls, the object locator, the dial and the pictures' options; v0.1.21), `index.html` (the two picture containers `top-view` and `camera-image`); shared (COMMON-DECISIONS §3): `demos/common/segments.js` (owner rrt; `Gamma` = the original's `γ`, `lineIntersectionPoint`, `segmentIntersectionQ` — spelled `LineIntersectionPoint`, `SegmentIntersectionQ` in this original), `demos/common/dial-control.js` and `demos/common/arrow-arcs.js` (owner two-link-kinematics), `shared/mma-text.js` (MIT, owner two-link-kinematics since COMMON-DECISIONS §6, specified here: exact fractions and multiples of π; `model.js` draws them as stacked text in Graphics data), `demos/common/prm-core.js` `LOC_ICON` and `demos/common/arm-view.js` `locIcon` (owner robot-motion-obstacles; the `loc[Black]` icon) |
| Role in the project | further demonstration (batch A) — 2D: both pictures are `Graphics` (no `Graphics3D`); the "3D" cuboid in the camera image is the original's own pinhole projection drawn as 2D polygons |

## 1. Purpose and background

A pinhole camera with focal length λ looks along its optical axis; two lasers mounted s units left and right of the
camera point in the same direction. Where the laser beams hit an object, the camera sees two bright dots; their image
coordinate u = s·λ/z gives the distance z of each hit point, and two distances give the object's angle
(arctan(2s, z₁ − z₂), Details text). The Demonstration shows a **top view** (camera, lasers, beams, the field of
view and a brown 1 × 4 object that the user moves with a locator and turns with a dial) and the **camera image** (the
ground plane in perspective, the object drawn as a cuboid of height 2 with only its visible faces, the two red laser
dots, and a distance reticule whose labels read the distance directly).

## 2. Scope

In scope: the original's controls (object locator, the orientation dial with its snapping, laser spacing s,
focal length λ with its ⊕ panel), the locator rule, the laser–object intersection, the projection, both pictures
with all their primitives, the reticule scale and labels (exact fractions as fractions).
Out of scope (would need a design entry first): other object shapes or several objects, a computed angle read-out,
lens distortion, 3D views.

## 3. Users and use cases

| ID | User | Use case |
|----|------|----------|
| UC-CL-01 | student | move the object and read its distance off the reticule at the two laser dots |
| UC-CL-02 | student | turn the object and see the two dots read different distances (orientation from two distances) |
| UC-CL-03 | student | change the laser spacing and the focal length and see the reticule scale and the perspective change |
| UC-CL-04 | tester | compare the port with the original's saved state, the four snapshot settings and the Mathematica harness |

## 4. Features

### 4.1 Controls

| ID | Feature | Reason | Since | Verified by |
|----|---------|--------|-------|-------------|
| F-CL-01 | Object locator `{{p, {3, -1/5}}, Locator, Appearance -> None}` (range Automatic): invisible Manipulate locator in the top view; the original draws its own `Locator[p, loc[Black]]` icon at p (the `loc` icon of prm-core `LOC_ICON`, black; that primitive is itself draggable, K-CL-10); LocatorPane picking: a press anywhere in the top view moves p there (`addLocators`, `pickAnywhere: true`); positions limited to the top view's plot range −1…15 × −4…4 (K-CL-01) | place the object (UC-CL-01) | v0.1.15 | e2e "dragging the object locator with the mouse moves the object and the laser dots"; e2e "a press in the top view away from the object moves it there (LocatorPane)"; e2e "dragging below the top view leaves the object at its last position"; M-CL-04 |
| F-CL-02 | Orientation dial `{{p1, {1, 0}, "θ"}, makeDialControl[#1, {0, 0}, Red] &, ImageSize -> {120, 120}}` under the heading "object orientation": a 120 × 120 LocatorPane whose locator value is snapped by `pt = Nearest[Table[{Cos@a, Sin@a}, {a, -π, π, π/32}], #][[1]]` to the nearest of 65 points on the unit circle (a press anywhere jumps there); label "θ" on the left. Port: `demos/common/dial-control.js` `makeDialControl(controls, {name: 'p1', label: 'θ', color: Red, imageSize: 120, setter: 'nearest32', arc: 'myArrowArc2', keyStep: 'grid'})` (owner two-link-kinematics; no app-level dial, COMMON-DECISIONS §3) | turn the object (UC-CL-02) | v0.1.15 | e2e "clicking the dial at 45 degrees turns the object by π/4 and shows the θ label"; e2e "the dial snaps to multiples of π/32"; unit "the dial snaps to the nearest of the 65 points {Cos a, Sin a}, a = -π … π in steps of π/32"; unit "a press at the dial centre: the nearest32 setter picks k = −24 as Mathematica does (K-CL-09, harness H-CL-16)"; golden "camera-lasers: snapshots 3 and 4 have off-grid dial values (made with an earlier dial)"; golden "H-CL-16"; M-CL-05 |
| F-CL-03 | Dial picture (`makeDialControl`'s Graphics, drawn by `dial-control.js`): Gray `Circle[{0, 0}]`; Gray tick lines from radius 0.94 to 1 at a = 0, π/8, …, 2π and from 0.98 to 1 at π/16 + kπ/8; labels `Text[θ, 0.7 {Cos θ, Sin θ}]` for θ in `Rest@Range[-π, π, π/4]` (−3π/4 … π, exact, FontSize 10, Gray; text through `shared/mma-text.js`); Red hand `makeHand[7, 7/3, .1, .3]` = `Polygon[{{-bl,-bw},{-bl,bw},{fl,fw},{fl+8fw,0},{fl,-fw}}/10]` with `EdgeForm[Black]`, rotated by `ang = ArcTan[pt[[1]], pt[[2]]]` about the centre; Red arc arrow `myArrowArc2[{0, 0}, 0.3, {0, ang}]` = `Arrow[BSplineCurve[Table[0.3 {Cos t, Sin t}, {t, 0, ang, ang/11}]]]` with `Arrowheads[.05]` (`arrow-arcs.js`); because `ang` is a `Dynamic` object the `Point` branch never runs, and at ang = 0 only the arrowhead shows: at (0.3, 0), pointing +x, on the hand (snapshot 1, Q-CL-10) | the original's dial look (snapshots) | v0.1.15 | unit "the dial is dial-control.js with setter nearest32, arc myArrowArc2, size 120 and Red"; M-CL-05 |
| F-CL-04 | "laser spacing" (heading text `"\nlaser spacing"`, i.e. after a blank line) `{{s, 1}, 0.1, 2, 0.01, VerticalSlider, ImageSize -> {Automatic, 80}, Appearance -> "Labeled"}`: vertical slider, label "s" on its left, value below; values 0.1 + k·0.01 (min + k·step, COMMON-DECISIONS §4) | the lasers' distance from the axis (UC-CL-03) | v0.1.15 | e2e "has the controls of the original with their defaults: dial at 0, s 1, λ 0.5"; e2e "laser spacing 0.65 switches the reticule to halves with fraction labels"; M-CL-06 |
| F-CL-05 | "camera focal length" `{{λ, 0.5}, 0.1, 2, 0.01, ImageSize -> 80, Appearance -> "Labeled"}`: a Manipulator — slider, value field and ⊕ animation panel (snapshot 1 shows the ⊕), label "λ"; port `Controls.slider` with `steps: 'mma'` (0.1 + k·0.01) | the focal length (UC-CL-03) | v0.1.15 | e2e "has the controls of the original with their defaults: dial at 0, s 1, λ 0.5"; e2e "λ 1.2 draws 5 converging ground lines (Round half to even)"; e2e "the λ ⊕ panel animates the focal length"; M-CL-06 |
| F-CL-06 | Layout `ControlPlacement -> Left`; headings `Style["object orientation", 12, Bold]`, `Style["\nlaser spacing", 12, Bold]`, `Style["camera focal length", 12, Bold]`; output `Column[{top view, Framed[camera image, ImageMargins -> 0, FrameMargins -> 0]}]` | same arrangement as the original (snapshots) | v0.1.15 | inventory; M-CL-02 |

### 4.2 Model (`model.js`)

| ID | Feature | Reason | Since | Verified by |
|----|---------|--------|-------|-------------|
| F-CL-07 | Manipulate variables and initial values as stored: `p = {3, -1/5}`, `pFixed = {3, -1/5}` (`ControlType -> None`), `p1 = {1, 0}`, `s = 1`, `λ = 0.5`; Module constants `plotRange = {{-1, 15}, {-4, 4}}`, `imsz = 450`, `camWidth = 0.8`; the live state equals these initial settings (stored `"Variables"`, raw line 1906): the port opens in it and its "Initial settings" restores them (A-CL-01) | same opening picture as the original | v0.1.15 | golden "camera-lasers: the saved state is the state after the first evaluation of the initial settings"; golden "H-CL-01"; M-CL-09 |
| F-CL-08 | Reticule scale `sc = Piecewise[{{1/50, λ s < 1/10}, {1/10, λ s < 1/4}, {1/2, λ s < 1/2}, {1, True}}]`, an exact rational; comparisons tolerant (`mLess`) | keeps the reticule labels inside the image for small s·λ | v0.1.15 | unit "reticule scale sc: 1/50, 1/10, 1/2, 1 by λ s with tolerant Less at 0.1, 0.25, 0.5"; golden "H-CL-05"; golden "H-CL-13"; golden "H-CL-14" |
| F-CL-09 | Orientation `θ = ArcTan[p1[[1]], p1[[2]]]` (Mathematica argument order, bit-exact `shared/mma-exact.js arcTan`), then `If[θ < 0, θ = θ + 2π]`: θ ∈ [0, 2π) | the object's angle | v0.1.15 | unit "θ = ArcTan[p1[[1]], p1[[2]]] moved into [0, 2π)"; golden "H-CL-07" |
| F-CL-10 | Locator rule `If[p[[2]] <= plotRange[[2, 1]], p = pFixed]; pFixed = p` (tolerant `<=`; the upper-edge test is commented out in the original, Q-CL-02) | keeps the object off the bottom edge | v0.1.15 | unit "locator rule: p.y <= -4 restores pFixed, otherwise pFixed follows p"; e2e "dragging below the top view leaves the object at its last position"; golden "camera-lasers: the four snapshot settings keep p and pFixed when evaluated"; golden "H-CL-08" |
| F-CL-11 | Object `objectPts = (RotationMatrix[θ].# + p) & /@ {{-1/2, -2}, {1/2, -2}, {1/2, 2}, {-1/2, 2}}` — a 1 × 4 rectangle (counter-clockwise), long side along the y axis at θ = 0; the closing point is appended twice (Q-CL-01) | the brown object | v0.1.15 | unit "objectPts: the 1 x 4 rectangle rotated by θ about p, counter-clockwise from {-1/2, -2}"; unit "objectPts gets its closing point twice (original quirk, no visible effect)" |
| F-CL-12 | Laser hits: `L1 = {0, s}`, `L2 = {0, -s}`, `InterPt1 = {10000, s}`, `sl1 = {L1, InterPt1}` (same for 2); for each edge of the closed object: `If[SegmentIntersectionQ[{sl1, edge}], T = LineIntersectionPoint[{sl1, edge}]; If[InterPt1[[1]] > T[[1]], InterPt1 = T]]` — the nearest hit, else the point at x = 10000 (Q-CL-04); `SegmentIntersectionQ`: `Det == 0` → no (parallel), else `0 <= γ <= 1` for both segments (tolerant, inclusive); shared `demos/common/segments.js` `segmentIntersectionQ`, `lineIntersectionPoint`, `Gamma` (division a·(1/b)) | where each laser hits the object | v0.1.15 | unit "lasers hit the nearest object edge: the default object gives {5/2, 1} and {5/2, -1}"; unit "a laser that misses keeps {10000, ±s}"; unit "a laser through a corner hits it (inclusive ends, parallel edges ignored)"; unit "SegmentIntersectionQ, LineIntersectionPoint and γ as in the original (shared segment geometry)"; golden "H-CL-09"; golden "H-CL-10"; M-CL-07 |
| F-CL-13 | Pinhole projection `Convert3DtoCam[λ, pt3d] := Module[{k = λ/Max[0.001, pt3d[[3]]]}, k {-pt3d[[1]], pt3d[[2]]}]` (top-view x is the depth z, top-view y the lateral x of the camera frame, so u = −λ·y/z, Q-CL-06); laser images `InterPt3D1 = Convert3DtoCam[λ, {InterPt1[[2]], 0, InterPt1[[1]]}]` and `InterPt3D2` | the camera image (Details formula) | v0.1.15 | unit "Convert3DtoCam: k = λ/Max[0.001, z], image point k {-x, y}"; golden "camera-lasers: snapshot 1 shows dots at u = ±0.2 and the front face from -0.36 to 0.44" |
| F-CL-14 | Visible faces: for each edge `{P, Q}` of the closed object (6 points after the second AppendTo), draw the face only if `P[[2]]/P[[1]] > Q[[2]]/Q[[1]]` (tolerant `>`), as `Polygon` of `Convert3DtoCam[λ, {P[[2]], -1, P[[1]]}]`, `{P[[2]], 1, P[[1]]}`, `{Q[[2]], 1, Q[[1]]}`, `{Q[[2]], -1, Q[[1]]}` (a cuboid of height 2 standing on the ground y = −1) | the object in the camera image | v0.1.15 | unit "visible faces: only edges with P.y/P.x > Q.y/Q.x are drawn, the default shows the front face from u -0.36 to 0.44"; golden "camera-lasers: snapshot 3 (s 0.65) reticule labels in halves and two visible faces"; golden "H-CL-12"; golden "H-CL-02"; golden "H-CL-03"; golden "H-CL-04" |
| F-CL-15 | Numerics: tolerant comparisons; `Det` exact for integer pairs and `shared/mma-exact.js det` for machine numbers; `a/b` = `a·b⁻¹`; `Round` half to even (`Round[20λ]`, `Round[3/λ]`, λ = 0.24 and 1.2 are exact halves); bit-exact `ArcTan`; machine arithmetic where the original computes exactly (D-CL-01); the 65 dial points as `dial-control.js`'s `nearest32` setter computes them (machine values of the original's exact `{Cos[kπ/32], Sin[kπ/32]}`, D-CL-01) | identical decisions (hit or miss, visible face, number of grid lines) | v0.1.15 | unit "ground grid: Round[20λ] horizontal lines and 2 Round[3/λ] + 1 converging lines, halves to even (λ 1.2 gives 5)"; golden "H-CL-06"; golden "H-CL-11" |

### 4.3 Graphics (SVG)

| ID | Feature | Reason | Since | Verified by |
|----|---------|--------|-------|-------------|
| F-CL-16 | Top view, in the original's order: `{Opacity[0.2], Blue, Polygon[{{0, 0}, 10000 {λ, -camWidth}, 10000 {λ, camWidth}}]}` (field of view); `{Brown, EdgeForm[Black], Polygon[objectPts]}`; `Arrowheads[.025]`; `arrowArc[Circle[p, 1, {π/2, π/2 + θ}]]` (the arc plus a 10⁻⁶-long arrow at its end = an arrowhead along the counter-clockwise tangent; `arrow-arcs.js` `arrowArc`); `Line[{p + {0, 1}, p, p + 1.6 {-Sin θ, Cos θ}}]`; `If[Abs[θ] >= π/16, Text[Style["θ", Medium], p + 1.5 {-Sin[θ/2], Cos[θ/2]}]]`; Black optical axis `Line[{{0, 0}, {500, 0}}]`; `Darker[Gray]` camera `Rectangle[{-1.5 λ, -camWidth}, {0, camWidth}]`; Orange lasers `Rectangle[L - {1/2, 1/8}, L + {0, 1/8}]` with black edges; Red beams `Line[{L1, InterPt1}]`, `Line[{L2, InterPt2}]`; Red Dashed reflections `Line[{InterPt1, {0, 0}}]`, `Line[{InterPt2, {0, 0}}]`; Thick Blue image planes at x = ±λ (−camWidth…camWidth) and a Large Blue pinhole `Point[{0, 0}]`; Black `Text[Style["top view", Medium], {7, 3.5}]`; λ arrows `Arrow[{{λ + 1/2, 2 camWidth}, {λ, 2 camWidth}}]`, `Arrow[{{-1/2, 2 camWidth}, {0, 2 camWidth}}]`, `Text["λ", {λ/2, 2 camWidth}]`; Thin Blue lines x = λ and x = 0 from y 0 to 2.2 camWidth; `{Opacity[0.2], Blue, Polygon[{{0, 0}, {-λ, -camWidth}, {-λ, camWidth}}]}`; s arrows `Arrow[{{-1/4, 1/2}, {-1/4, 0}}]`, `Arrow[{{-1/4, -s - 1/2}, {-1/4, -s}}]`, `Text["s", {-1/4, -s/2}]`; the `loc[Black]` icon at p. `PlotRange -> {{-1, 15}, {-4, 4}}` (no padding, measured), `GridLines` at every integer with `Directive[Thin, Dashed, Gray]`, `ImageSize -> 450` | the original's top view (snapshots 1–4) | v0.1.15 | unit "top view elements in the original's order with their colours"; unit "orientation arc from π/2 to π/2 + θ, counter-clockwise"; unit "θ label only for θ >= π/16 (tolerant), so for every clockwise dial position"; e2e "loads without errors and draws the top view and the camera image of snapshot 1"; M-CL-02; M-CL-03; golden "H-CL-15" |
| F-CL-17 | Camera image, in the original's order: `{Thin, Gray, …}` ground lines `Line[{Convert3DtoCam[λ, {-50, -1, i}], Convert3DtoCam[λ, {50, -1, i}]}]` for i = 1…`Round[20 λ]` and converging lines `Line[{Convert3DtoCam[λ, {i, -1, 0}], Convert3DtoCam[λ, {i, -1, Round[20 λ] + 1}]}]` for i = −`Round[3/λ]`…`Round[3/λ]`; LightGray horizon band `Rectangle[{-camWidth, -λ/(Round[20 λ] + 1)}, {camWidth, 0}]` (its top is `Convert3DtoCam[λ, {500, 0, ∞}][[2]]` = 0); `{Opacity[0.2], Blue, Rectangle[{-camWidth, -camWidth}, {camWidth, 0}]}`; Brown faces with black edges (F-CL-14); Red laser dots `PointSize[λ (0.2/InterPt1[[1]])]`, `Point[InterPt3D1]` and the same for laser 2 (sizes are fractions of the image width, Q-CL-05); Black Thin reticule `Line[{{-camWidth, 0}, {camWidth, 0}}]`, major ticks from −0.025 to 0.05 with labels `Text[i, {s λ/i, -.05}]`, `Text[-i, {-s λ/i, -.05}]` (the stored Body groups the positions as `s (λ/i)` and `(-s) (λ/i)`: λ·(1/i) first, then times s; the same in the tick lines) for i in `sc {.8, 1, 1.2, 1.5, 2, 3, 5, 10}`, minor ticks from −0.025 to 0 for i in `sc {.5, .6, …, 2, 3, …, 10, 20, 30, 50, 100, 200}`; `Text[Style["camera image", Medium], {0, .4 camWidth}]`; `PlotRange -> {{-camWidth, camWidth}, {-camWidth/2, camWidth/2}}`, `ImageSize -> 450`, framed (primitives outside the range are cut by the frame) | the original's camera image (snapshots 1–4) | v0.1.15 | unit "camera image elements in the original's order"; unit "laser dot sizes are PointSize[λ 0.2/x]: 0.04 at the default"; golden "camera-lasers: snapshot 2 dots at u = ±0.0776, face from -0.152 to 0.158"; golden "camera-lasers: snapshot 4 only the left laser hits (x 4.514), one dot"; unit "an object face at x = 0 gives no laser dot and no face instead of an error (port deviation)"; e2e "loads without errors and draws the top view and the camera image of snapshot 1"; M-CL-03; golden "H-CL-02"; golden "H-CL-03"; golden "H-CL-04" |
| F-CL-18 | Reticule labels keep Mathematica's number forms: exact rationals as stacked fractions ("1/2", "3/2", "1/50"), exact integers plainly ("1", "10"), machine reals with six significant digits ("0.08" for 0.08000000000000002, "0.75"), negative labels with a minus in front ("−1/2", "−0.8"); exactness follows the original: `sc` is exact, the list elements 1, 2, 3, 5, 10 are exact, .8, 1.2, 1.5 are machine | the labels the snapshots show (snapshot 3: −1/2, −0.6, −0.75, −1, −3/2, −5/2, −5) | v0.1.15 | unit "tick labels keep exactness: 1/2 and 3/2 as fractions, 0.75 as a real, 1 as an integer"; unit "number display of tick labels: 0.08 for 0.08000000000000002, 1/50, -3/2"; golden "camera-lasers: snapshot 3 (s 0.65) reticule labels in halves and two visible faces"; e2e "laser spacing 0.65 switches the reticule to halves with fraction labels"; M-CL-06 |
| F-CL-19 | Title, caption and Details text (including the projection formulas) of the original | explains the Demonstration | v0.1.15 | M-CL-01 |

### 4.4 Port additions

| ID | Feature | Reason | Since | Verified by |
|----|---------|--------|-------|-------------|
| A-CL-01 | "Initial settings" button: p = pFixed = {3, −1/5}, p1 = {1, 0}, s = 1, λ = 0.5 | stands in for the Manipulate ⊕ menu → Initial Settings | v0.1.15 | e2e "Initial settings restores the opening state" |
| A-CL-02 | Arrow keys move the focused object locator (0.1 units; Shift = 0.5), one evaluation per key press | keyboard access | v0.1.15 | e2e "arrow keys move the object locator and turn the dial (port additions)" |
| A-CL-03 | Arrow keys turn the focused dial by one grid step: Right/Up = +π/32, Left/Down = −π/32; with Shift by four grid steps, ±π/8. This is `dial-control.js`'s option `keyStep: 'grid'` (COMMON-DECISIONS §5), used because the default 0.05 locator step (A-TK-02) followed by the π/32 snapping would turn the dial erratically — a key pressed in the radial direction would not turn it at all | keyboard access to the dial | v0.1.15 | e2e "arrow keys move the object locator and turn the dial (port additions)" |
| A-CL-04 | `window.__demo` automation hook: `getState`, `view`, `loadState` (e.g. a snapshot setting, also with off-grid p1), `moveLocator`, `worldToClient` | automated tests | v0.1.15 | e2e "the four snapshot settings load through the automation hook" |
| A-CL-05 | "All demos" link | site navigation | v0.1.15 | inventory; M-GEN-01 |
| A-CL-06 | Credit footer: original title, authors, licence, adaptation notice | required by CC BY-NC-SA 3.0 | v0.1.15 | e2e "attribution on" |
| A-CL-07 | Start-up notice (watchdog, `<noscript>`) when the page cannot start (DEC-22) | a clear message instead of an empty page | v0.1.15 | e2e "start-up notice when" |
| A-CL-08 | standalone bundle (owner rule R-A): `npm run bundle -- camera-lasers` builds `dist/camera-lasers/` with exactly the files the app imports, the licences, a generated README and a root `index.html` (§6, "Building and deploying this app alone") | anyone can host this one app elsewhere without the rest of the site (owner rule R-A, 2026-10-17) | v0.1.15 | e2e "bundle: camera-lasers runs from its own folder" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|-------------|---------|
| `locator-p` | F-CL-01, A-CL-02 |
| `locator-p1` | F-CL-02, A-CL-03 |
| `vslider-s` | F-CL-04 |
| `slider-lambda` | F-CL-05 |
| `value-lambda` | F-CL-05 |
| `plus-lambda` | F-CL-05 |
| `play-lambda` | F-CL-05 |
| `stepback-lambda` | F-CL-05 |
| `stepfwd-lambda` | F-CL-05 |
| `reset` | A-CL-01 |
| `crumbs` | A-CL-05 |
| `details` | F-CL-19 |
| `credits` | A-CL-06 |

(`vslider-` is the testid prefix of `shared/ui-extra.js addVerticalSlider`; its value below the slider, `value-s`, is plain text, not an interactive element, so it is not an inventory row; the dial is a small SVG picture whose only
interactive element is its locator `locator-p1`.)

## 6. Design

- **Files.** `model.js` holds the original's functions under their names: `Convert3DtoCam`, `γ`,
  `LineIntersectionPoint` and `SegmentIntersectionQ` (thin aliases of `demos/common/segments.js` `Gamma`,
  `lineIntersectionPoint`, `segmentIntersectionQ`), and `evaluate(state)`, which performs exactly one evaluation of the
  Manipulate body (sc, L1/L2, θ, locator rule, objectPts, laser hits, InterPt3D) and returns `{ state, view, graphics }`:
  `graphics` = both pictures as `shared/graphics.js` data in the original's order (v0.1.21, owner decision D2), every
  part an `Annotation` with its role as id (the test ids): the top view's grid lines first (drawn once,
  `cachedGraphics`), filled shapes (Rectangle drawn as its polygon), lines, the dashed reflections cut to the window
  (`dashedLine`, D-CL-08), arrows with `arrowheadPolygon` of `shared/graphics-extras.js`, points, texts, the reticule's
  tick labels with their exactness (`tickLabel`: stacked fractions; `data-text` holds the label's text) and the
  `loc[Black]` icon (`demos/common/arm-view.js` `locIcon`, an `Inset`; same pixels as the former `Raw` group).
  `arrowArc`, `myArrowArc2` and `makeHand` come from the common modules. No DOM; unit-tested in Node. `main.js` is one
  `Manipulate({…})` call of `shared/manipulate.js`: the object locator, `pFixed`, the three headings, the dial
  (`Control(makeDialControl, DIAL_OPTIONS)`), the vertical s slider (`Control` of `addVerticalSlider` with the `mmaGrid`
  values 0.1 + k·0.01) and the λ slider as Mathematica control specs; `body: evaluate`; the options of the two pictures
  (`graphics: [{id: 'top-view'}, {id: 'camera-image'}]`) and the test hook (`view()`: the model's view without drawing
  data; the pictures through the layer's `graphics(k)`).
- **Reused code** (exact exports): `shared/mma.js` `mEqual`, `mLess`, `mGreater`, `mLessEq`, `roundHalfEven`;
  `shared/mma-exact.js` `arcTan`, `det`; `shared/mma-extra.js` `mmaNumberString`; `shared/mma-colors.js` `NAMED`,
  `darker`; `shared/manipulate.js` (v0.1.20; it creates the pictures with `shared/svg-plot.js` `createPlot`, padding 0, the
  locator with `addLocators`, `pickAnywhere: true`, the λ slider with `Controls.slider`, ⊕ panel, `steps: 'mma'`, and
  the headings), `shared/graphics.js` (the pictures as data); `shared/ui.js` `mmaGrid`; `shared/ui-extra.js`
  `addVerticalSlider` (s); `shared/requirements.js`; `demos/common/segments.js` `Gamma`, `lineIntersectionPoint`, `segmentIntersectionQ`;
  `demos/common/dial-control.js` `makeDialControl` (`setter: 'nearest32'`, `arc: 'myArrowArc2'`, `imageSize: 120`,
  `keyStep: 'grid'`, colour Red) and `makeHand`; `demos/common/arrow-arcs.js` `arrowArc` (the top view's orientation arc), `myArrowArc2`
  and `bsplineCurve` (inside the dial); `demos/common/prm-core.js` `LOC_ICON` (the `loc[col]` icon data) through the shared `locIcon` of
  `demos/common/arm-view.js` (owner robot-motion-obstacles, COMMON-DECISIONS §3; since v0.1.21 — N-CL-03).
- **New code.** (1) `shared/mma-text.js` (MIT, owned by two-link-kinematics since COMMON-DECISIONS §6; this app is its main user and specifies it): Text of exact numbers — a
  rational p/q as a stacked fraction (numerator, bar, denominator), a negative one with a leading minus, multiples of
  π as `piFraction(num, den)` (`3π/4`, `π/2`, `π`; used by `dial-control.js` for the dial labels and by `format` hooks
  such as "5π/32" in dh-parameters and arm-configurations, COMMON-DECISIONS §5), and
  machine numbers through `mmaNumberString`. (2) A small exact-rational type in `model.js` for `sc` and the tick
  values (`{num, den}`; a product with an exact integer stays exact, with a machine number becomes machine).
  (3) The model and pictures of this app.
- **State model.** The Manipulate variables `p`, `pFixed`, `p1`, `s`, `λ` (stored as `lambda`). The port computes with
  machine numbers; the initial `p = {3, -1/5}` is `[3, -0.2]`, and `p1` holds the machine values the `nearest32`
  setter gives instead of the original's exact `{Cos[kπ/32], Sin[kπ/32]}`. The saved states keep `Rational[-1, 5]` as
  `{"wl":"-1/5"}` next to −0.2; the loader uses the double (D-CL-01).
- **Evaluation order** (one call of `evaluate`): sc; L1, L2; θ; locator rule; objectPts; InterPt1/2 (the edge loop,
  laser 1 before laser 2 per edge); InterPt3D1/2; top view; camera image (with the second closing point). The Manipulate layer
  evaluates after every control change, once per animation frame while dragging (the locator's pointer throttle).
- **Numerics.** As F-CL-15. Bit-exactness with the original is not a goal here because the original computes exactly
  (symbolically) in the opening state and after every dial move; decisions (hit or miss, which face is visible, sc,
  grid-line counts) are compared exactly and coordinates with a tolerance of 1e-12 (harness). Products are grouped as
  in the stored Body (e.g. `s (λ/i)`, `λ (0.2/x)`).
- **Sizes.** `PointSize[Large]` (pinhole) 7.5 px absolute (K-CL-05); laser dots `PointSize[λ·0.2/x]` × 450 px
  (measured 37 px in the 2× snapshot 1 = 0.04 × 450 × 2); `Thin` 0.25 px, `Thick` 2 px; `Arrowheads[.025]` and `[.05]`
  as fractions of the picture width; `Medium` text ≈ 12 px; dial labels 10 px.
- **Golden data.** The extracted state file has the live state only (and lost the exact `-1/5` and the symbol `λ`);
  the four snapshot cells store `"Settings"` with p, pFixed, p1, s, λ (raw notebook lines 3870, 5398, 7079, 8753;
  fixture `tests/golden/camera-lasers.original-states.json`, COMMON-DECISIONS §1). Snapshots 3 and 4 have
  dial values off the π/32 grid (`{0.49613893835683376, -0.8682431421244592}`, `{0.7607566910198931,
  -0.6490371769540347}`, unit vectors), i.e. they were made with an earlier dial that used `Normalize` (the
  commented-out line in `makeDialControl`, K-CL-08); the body accepts any p1, so the golden tests use them as they
  are.

### 6.1 Building and deploying this app alone

Owner rule R-A (2026-10-17): this one app can be taken out of the repository and hosted anywhere.

- Command, in the repository folder: `npm run bundle -- camera-lasers` → `dist/camera-lasers/` (with `--zip` also
  `dist/camera-lasers.zip`; `npm run bundle -- --all` bundles every app). `tools/bundle-app.mjs` follows every file the
  page loads (HTML, import map, static and literal dynamic imports, stylesheets, pictures) and copies exactly those,
  keeping the repository's folder layout, so no path is rewritten; it stops with a list of problems if a reference
  cannot be resolved.
- Contents (generated with `node tools/bundle-app.mjs camera-lasers --update-docs`; unit "bundle contents listed in
  DESIGN.md match the collector" keeps the table current):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/camera-lasers/`) | 3 | `index.html`, `main.js`, `model.js` |
| `shared/` | 17 | `exact-pi.js`, `graphics-extras.js`, `graphics.js`, `manipulate.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `mma-text.js`, `mma.js`, `random.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `ui-extra.js`, `ui-interval.js`, `ui.js` |
| `demos/common/` | 7 | `arm-grid.js`, `arm-view.js`, `arrow-arcs.js`, `dial-control.js`, `prm-core.js`, `segments.js`, `two-link.js` |
| added by the bundler | 7 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/camera-lasers/DESIGN.md` |
<!-- bundle-contents:end -->

- Added files: `index.html` opens the app (the app's "All demos" link, `../../index.html`, leads back to it and links
  to the app), a generated `README.md` (title, the credits of the footer, licence summary, how to serve and test),
  `.nojekyll` (GitHub Pages), this document, `LICENSE.md` and the `LICENSES/` texts of the SPDX identifiers found in the
  copied files (CC BY-NC-SA 3.0 for this app and the `demos/common/` modules, MIT for the `shared/` modules).
- Requirements: any static web server (`npx serve`, `python -m http.server`, GitHub Pages); not `file://` (browsers
  block ES modules there); a browser with ES modules (Firefox, Chromium, WebKit); no WebGL needed (SVG only). No
  server-side code.
- Checked by e2e "bundle: camera-lasers runs from its own folder" (A-CL-08, `tests/e2e/bundle.spec.js`): the bundle
  folder alone is served, its root page must open the app, the app must start (`window.__demo.ready`) without page
  errors, every request must stay inside the folder and succeed, and every script and stylesheet of the bundle must be
  loaded.

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

| ID | Kind | Description |
|----|------|-------------|
| Q-CL-01 | quirk kept | `AppendTo[objectPts, objectPts[[1]]]` is evaluated twice (in the laser loop and again in the camera image), so the face loop sees a sixth, zero-length edge {P1, P1}; its test `P.y/P.x > P.y/P.x` is False and nothing is drawn. The top view's `Polygon[objectPts]` gets 5 points (closed). |
| Q-CL-02 | quirk kept | The locator rule only refuses `p[[2]] <= -4`; the upper-edge test is commented out. While the pointer is dragged below the top view, the locator sits at y = −4 and every evaluation restores the last accepted position, so the object stops slightly above the bottom edge while the pointer moves on. |
| Q-CL-03 | quirk kept | θ is moved into [0, 2π): the orientation arc always runs counter-clockwise from the vertical (a dial one step clockwise of 0 gives an arc of 63π/32), and the θ label (shown for `Abs[θ] >= π/16`) appears for every clockwise dial position; it stays hidden only for θ = 0 and π/32. |
| Q-CL-04 | quirk kept | A laser that misses keeps `InterPt = {10000, ±s}`: its beam runs to x = 10000, its dashed "reflection" runs back to the pinhole almost along the axis (snapshot 4), and its dot lies at u = ∓λ s/10000 with `PointSize[2·10⁻⁵ λ]` (invisible). |
| Q-CL-05 | quirk kept | Laser dot size `PointSize[λ 0.2/x]` grows without bound for close objects: for a hit at x < 0.2·λ the dot is wider than the whole image (e.g. s = 0.1, λ = 0.5, object face at x = 0.05 → dots of twice the image width centred at u = ∓1, covering most of the camera image). A face exactly at x = 0 divides by zero (K-CL-03). |
| Q-CL-06 | quirk kept | The camera image is mirrored left–right relative to the top view's y axis: u = −λ·y/z. The upper laser in the top view (y = +s) appears on the left, and the left half of the reticule is labelled with negative distances (−0.8 … −10). |
| Q-CL-07 | quirk kept | Points with depth z ≤ 0.001 are projected with z = 0.001 (`Max[0.001, …]`): faces of an object that reaches behind the camera are drawn hugely enlarged; the converging ground lines start at z = 0, i.e. 1000·λ units away. |
| Q-CL-08 | quirk kept | The dial grid contains {−1, 0} twice (a = −π and a = π); both mean θ = π, so the duplicate is harmless. A press exactly at the dial centre selects k = −24, θ = 5π/4 (K-CL-09, H-CL-16). |
| Q-CL-09 | quirk kept | `SegmentIntersectionQ` treats parallel segments as not intersecting and end points as hits: a laser running exactly along the top or bottom edge of an unturned object (p.y ± 2 = ±s) ignores that edge but hits the corner where the front edge starts (p = {3, −1}, s = 1: InterPt1 = {5/2, 1}). |
| Q-CL-10 | quirk kept | `myArrowArc2` tests `start === end` with `end = ang`, a `Dynamic` object, so its `Point` branch never runs; at ang = 0 the B-spline has zero length and only the arrowhead shows: a red arrowhead at (0.3, 0) pointing +x on the hand (snapshot 1; the same as two-link-kinematics Q-TK-05). The port draws it (`arrow-arcs.js` `myArrowArc2`). |
| D-CL-01 | deviation | The original computes exactly in the opening state (`p = {3, -1/5}`, `p1 = {1, 0}`) and symbolically after every dial move (`p1 = {Cos[kπ/32], Sin[kπ/32]}`); the port always uses machine numbers. Coordinates differ in the last bits only; decisions at exact boundaries (a laser exactly through a corner, a face exactly edge-on) are decided with Mathematica's tolerances. |
| D-CL-02 | deviation | Sizes and fonts approximate Mathematica's: `PointSize[Large]` 7.5 px (K-CL-05), `Thin` 0.25 px, `Thick` 2 px, arrowheads as plain triangles, `Medium` text ≈ 12 px, stacked fractions drawn with SVG text and a bar. |
| D-CL-03 | deviation | The dial's arc arrow (`Arrow[BSplineCurve[…]]`) is drawn by `demos/common/arrow-arcs.js` (`bsplineCurve`, de Boor, sampled as a polyline) with a plain triangular arrowhead. |
| D-CL-04 | deviation | Controls are the shared port controls. The λ value field shows Mathematica's text (`steps: 'mma'`): the opening 0.5 as "0.5", a dragged or stepped value as a machine real ("1.", "1.2"), a typed whole number as an exact integer ("1"; shared `ui.js` since the review of v0.1.15, before it showed "1."). |
| D-CL-05 | deviation | Update rate while dragging: one evaluation per animation frame. |
| D-CL-06 | deviation | Locator picking: a press within 12 px of the object locator grabs it in place, farther away it jumps (LocatorPane); Mathematica's no-jump distance is unknown (as D-CP-06). Presses in the camera image do nothing (the locator belongs to the top view, K-CL-01). |
| D-CL-07 | deviation | Division by zero (a face or a hit exactly at x = 0): JavaScript gives ±Infinity/NaN where Mathematica gives `ComplexInfinity`/`Indeterminate` with messages; the port leaves out primitives with non-finite coordinates or sizes (regression pin until K-CL-03 is answered). |
| D-CL-08 | deviation | Drawing only (`model.js` `dashedLine` since v0.1.21; before, `main.js` `prim` and `drawPrims`): every dashed line primitive is clipped to the picture's plot range plus 20 px on each side (`model.js` `clipPolyline`, Liang–Barsky) before its SVG element is made; a dashed line keeps the dash phase of the whole line (`stroke-dashoffset` = the length cut off). Reason: a missing laser's dashed reflection runs from x = 10000 (Q-CL-04), and Chromium rasterised every dash of the 10000-unit line (about 1.1 s per repaint, dragging stalled). Solid lines (the beam to x = 10000, the camera image's ground lines) are drawn unclipped, one SVG element per primitive. The picture is unchanged (the cut parts lie outside the image); the solid beams keep the original's points (unit "the model keeps the original points (beam to x = 10000)"). |
| K-CL-01 | known issue (lead) | Which picture the Manipulate's `Locator` control lives in (assumed: the first `Graphics` of the `Column`, the top view) and its range ("Automatic": assumed the top view's plot range −1…15 × −4…4). Check in M-CL-04 (drag into the camera image and past the top and right edges). |
| K-CL-02 | known issue (lead) — **resolved** (harness run 2) | Exact evaluation in the original: `ArcTan[Cos[π/32], Sin[π/32]]` simplifies to the exact π/32 (H-CL-07 records θ = `Pi/32`, `Pi/16`, `Pi/4`, `Pi/2`, `31 Pi/32`, `63 Pi/32`, `3 Pi/2` and, for {−1, 0}, the symbol `Pi`; also H-CL-15), objectPts and InterPt stay exact symbolic expressions; their N values agree with the port's machine computation within the golden tolerance 1e-12 (D-CL-01). |
| K-CL-03 | known issue (lead) — kernel side answered (harness run 2) | A face exactly at x = 0 (p = {1/2, 0}, θ = 0): `PointSize[λ 0.2/0]` and `P[[2]]/P[[1]]` divide by zero. H-CL-11 (exact and machine p): `Power::infy` and `Greater::nord` messages (12 per evaluation), InterPt1 = {0, 1}, InterPt3D1 = {−500., 0.}, and the picture keeps 3 Points and 7 Polygons (3 more than for a face at x = 0.05) with ComplexInfinity inside; the port draws no laser dot and no degenerate face (regression pin of the unit test). What the front end shows for those primitives (nothing, or a pink error box) is still M-CL-08 (N-CL-05). |
| K-CL-04 | known issue (lead) | Typesetting of exact numbers in `Text` inside Graphics (stacked fractions as in snapshot 3, the minus sign, the dial's `3π/4`): sizes and baseline only estimated (M-CL-06). |
| K-CL-05 | known issue (lead) | `PointSize[Large]` measures about 7 px here (the pinhole, 13–14 px in the 2× snapshot, partly covered by the optical axis) and 7.5 px in rrt (15 px in its 2× snapshots, uncovered); both apps use 7.5 px. Whether Mathematica defines it as an absolute size is not documented. |
| K-CL-06 | known issue (lead) — **resolved for the design** | Slider values: discrete sliders give `min + k*step` in machine arithmetic (COMMON-DECISIONS §4); the port uses `steps: 'mma'`. The sc thresholds are compared tolerantly, so 0.5·0.2 = 0.1 and 0.10000000000000002 both give sc = 1/10. |
| K-CL-07 | known issue (lead) — **resolved** | `myArrowArc2` with a `Dynamic` angle: snapshot 1 (dial at 0) shows the degenerate arrowhead at radius 0.3 pointing +x (review r3; two-link-kinematics Q-TK-05). Recorded as Q-CL-10 and drawn by the port. |
| K-CL-08 | known issue (lead) | Snapshots 3 and 4 were made with a dial that normalised the pointer instead of snapping it (their p1 values are off the π/32 grid). The current dial cannot reproduce them exactly (snapshot 3: θ = 5.231535094631212, nearest grid value 53π/32 = 5.203262832508095). Whether the published notebook's dial really snaps (it does in the stored code) can be checked in M-CL-05. |
| K-CL-09 | known issue (lead) — **resolved** (harness run 2) | Dial centre press: Mathematica 15.0.1 (H-CL-16) `Nearest[Table[{Cos@a, Sin@a}, {a, -π, π, π/32}], {0., 0.}]` returns 11 of the 65 exact points, k = −24, −19, −13, −8, −3, 3, 8, 13, 19, 24, 29 (the points at the least √-distance 0.9999999999999999 without k = −29), the first being {−1/√2, −1/√2} (Position 9, **k = −24**); for the machine table N[…] it returns exactly the four ±1/√2 points, those at the least SQUARED machine distance 0.9999999999999998. The setter takes `[[1]]`, so the dial goes to k = −24. Port (v0.1.17, harness run 2): `dial-control.js` `nearest32` uses the squared Euclidean distance in machine arithmetic, ties first in table order, which gives k = −24 at the centre (before: √-distance, k = −29). The exact table's full tie set is not reproduced (only its first point is used). Tests: golden "H-CL-16", unit "a press at the dial centre …". |
| K-CL-10 | known issue (lead) | `Locator[p, loc[Black]]` inside the top view is itself an interactive `Locator` primitive (with a static value) at the same place as the invisible Manipulate locator. A press exactly on the icon might drag that inner locator (moving only the icon until the next evaluation) instead of the Manipulate's; the port sends every press to the Manipulate locator (as K-PR-05). M-CL-04 compares a drag started on the icon with one started just beside it. |
| N-CL-01 | note | Unused definitions: the two-argument `LineIntersectionPoint[{a,b},{c,d}]` (only the one-argument form is called), the pattern name `s` in `arrowArc[s_Circle]` is unrelated to the laser spacing s, `T` is reused for both lasers; `loc` is ported as the prm-core icon. |
| N-CL-02 | note | Snapshot facts used by the tests: 1 = live state; 2 = p (6.94, −0.04), θ = 0; 3 = p (6.94, −0.04), s = 0.65, θ = 5.2315 (sc = 1/2); 4 = p (5.18, 1.01), θ = 5.5769, the right laser misses. All with λ = 0.5. |
| N-CL-03 | note | The `loc[Black]` icon was drawn by `main.js` (`locIcon`, from prm-core's `LOC_ICON` data) instead of the shared `locIcon` of `demos/common/arm-view.js` named in the draft: that module (owner robot-motion-obstacles) did not exist yet when this app was built. Since v0.1.21 the model uses the shared `locIcon` (an `Inset` of the same data; pixel-identical, parity check). |
| N-CL-04 | note | The harness comparisons of the test plan (T-CL-31 … T-CL-41, T-CL-67; scenarios H-CL-01 … H-CL-16) are in `tests/golden/camera-lasers.golden.test.js` (the build brief's single golden file; the test plan named a separate `camera-lasers.harness.test.js`), titled "H-CL-nn: …"; the feature rows cite them as golden "H-CL-nn". They compare the captured variables (sc, θ, objectPts, the four InterPt values, p, pFixed) to 1e-12 (1e-9 beyond 100) and the label texts of `%text` with their exactness; the drawn data (`%primitives`, `%g`) is covered by the unit tests of the primitive lists. They SKIP ("no harness data (owner run pending)") until `tests/golden/camera-lasers.harness.json` exists. |
| N-CL-05 | note | Harness run 2 (Mathematica 15.0.1): all 16 records agree with the port within the golden tolerances once the test reads the record as encoded (HW-45: `%text` entries are {input, plain, boxes, pos}; exact θ = π is the symbol `{"sym": "Pi"}`; the replay keeps each step's state separately). The `%text` comparison now checks every recorded text and label at its recorded position (1e-12) with its exactness, and that the port draws no other text. H-CL-11 (face at x = 0) is pinned as recorded; the front-end appearance of its ComplexInfinity primitives stays M-CL-08 (K-CL-03). |

## 8. Proposed changes

No open proposal. Template (see [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md)):

| ID | Status | Requested by / date | Change | Reason | Acceptance criteria |
|----|--------|---------------------|--------|--------|---------------------|

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.15 | 2026-10-17 | first implementation of the approved draft (DEC-17; draft of 2026-10-12 with COMMON-DECISIONS §5, §6 and owner rules R-A/R-B/R-C): `model.js`, `main.js`, `index.html`; uses `demos/common/segments.js` (owner rrt), `dial-control.js` with `keyStep: 'grid'` and `arrow-arcs.js` (owner two-link-kinematics); tests with the TESTPLAN titles (unit, golden incl. the harness replays — N-CL-04, e2e); §6.1 bundle table generated. Changed against the draft: T-CL-17's regression pin is k = −29, not −31 (K-CL-09: the exact-π table of `dial-control.js`); the `loc` icon is drawn by `main.js` (N-CL-03), so the bundle has no `arm-view.js`, `two-link.js` or `arm-grid.js`; §5 without the draft's `value-s` row (the vertical slider's value is plain text, not interactive); review fixes |
| 2 | v0.1.16 | 2026-10-18 | version number only (batch B release); no change to this app |
| 3 | v0.1.17 | 2026-10-18 | harness run 2: the dial's nearest32 setter in `demos/common/dial-control.js` uses the squared machine distance, so a press at the exact centre gives k = −24 as in Mathematica (K-CL-09 resolved by H-CL-16; was k = −29); K-CL-02 resolved (H-CL-07), K-CL-03 kernel side answered (H-CL-11); golden harness replay reads `%text` and symbol values as encoded and checks texts with positions (N-CL-05); `shared/exact-pi.js` π/8 values now Math.cos/Math.sin(π/8) (H-ME-12; no camera-lasers value uses them) |
| 4 | v0.1.18 | 2026-10-18 | version number only (harness run 3 accepted for manipulability-ellipsoid); no change to this app |
| 5 | v0.1.19 | 2026-10-21 | version number only (shared Manipulate layer added, four apps migrated to it); no change to this app |
| 6 | v0.1.20 | 2026-10-21 | `main.js` rewritten on the shared Manipulate layer (`shared/manipulate.js`, `shared/graphics.js`): control specs in Mathematica's form, the picture as Graphics data; no change to behaviour or picture (all unit, golden and browser tests unchanged and passing; screenshots and Manipulate state identical to v0.1.19 at sample settings) |
| 7 | v0.1.21 | 2026-10-23 | the model builds the picture as `shared/graphics.js` Graphics data (owner decision D2) and the body returns {state, view, graphics}; `main.js` shortened; the `loc` icon is `demos/common/arm-view.js` `locIcon` (no `Raw` left); the old drawing output frozen in `tests/unit/fixtures/camera-lasers-drawing.pre-graphics.json` and tests that read the old format now read the same numbers through `annotations()`/`Cases()`; no change to behaviour or picture (screenshots and Manipulate state identical to v0.1.20 at sample settings) |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|-------------|---------|-------------|---------|
| I-CL-01 | Show the two measured distances and the computed angle arctan(2s, z₁ − z₂) as text | links the picture to the Details formula | new output; must say what happens when a laser misses | F-CL-12 |
| I-CL-02 | Limit the laser dot size (and skip it for a miss) | no image-filling red discs for very close objects | differs from the original's picture | Q-CL-04, Q-CL-05 |
| I-CL-03 | Measure θ clockwise as negative (keep θ in (−π, π]) | the arc goes the short way, the label appears only for real turns | differs from the original's arc and label | Q-CL-03 |
| I-CL-04 | Also refuse positions at the top edge (the commented-out test) or clamp instead of freezing | the object follows the pointer along the edges | differs from the original | Q-CL-02 |
| I-CL-05 | Exact arithmetic in the opening state (rational p) | bit-identical numbers with the original there | needs exact rationals throughout; only last bits change | D-CL-01 |

## 11. Errors in the original (conceptual and mathematical)

Owner rule R-C (2026-10-17). Checked: the pinhole projection `Convert3DtoCam` (u = −λ x/z, v = λ y/z with the camera's
x axis pointing to the camera's right, i.e. −y of the top view: the natural, non-inverted view; the Details' frame
writes u = λ x<sub>c</sub>/z<sub>c</sub> with x<sub>c</sub> to the right, consistent), the field of view (half-width camWidth at
distance λ: correct), the ground grid and the vanishing point (0, 0) (correct), the laser hits (`SegmentIntersectionQ`,
`LineIntersectionPoint`, nearest hit along each beam: correct; a beam along an edge hits the corner first, Q-CL-09, which
is the right first hit), the reticule ticks at u = ±sλ/i (a laser hitting at depth i appears exactly there: correct
magnitudes), the `sc` scale choice, the dot size `PointSize[λ 0.2/x]` (apparent size ∝ λ/z: correct), the face drawing
and its visibility test, and the Details' formulas re-derived by hand: with lasers at x<sub>c</sub> = ±s hitting at depths
z<sub>1</sub>, z<sub>2</sub>, the image coordinates are u<sub>1</sub> = sλ/z<sub>1</sub>, u<sub>2</sub> = −sλ/z<sub>2</sub>, the depths
z<sub>1</sub> = sλ/u<sub>1</sub>, z<sub>2</sub> = −sλ/u<sub>2</sub>, and the face angle arctan(2s, z<sub>1</sub> − z<sub>2</sub>).

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|------|-----------------------|--------------------------|--------------------|-------------------------|--------|
| E-CL-01 | text | Details: "Lasers mounted at (s, 0, 0) and (−s, 0, 0) that terminate at z coordinates z<sub>1</sub> and z<sub>2</sub> have image plane coordinates (s λ/z<sub>1</sub>, 0) and (s λ/z<sub>2</sub>, 0)." | By the Details' own formula u = λ x<sub>c</sub>/z<sub>c</sub>, the laser at x<sub>c</sub> = −s appears at (**−** s λ/z<sub>2</sub>, 0); the two dots lie on opposite sides of the vanishing point, as every picture shows. | Shows the Details as in the original (F-CL-19); the picture is right. | Text only; no value or test changes; M-CL-01 records the difference as intended. | open |
| E-CL-02 | text | Details: "Thus the distance to objects with image plane coordinates (u<sub>1</sub>, 0) and (u<sub>2</sub>, 0) gives camera frame coordinates (s, 0, λ/u<sub>1</sub>) and (−s, 0, λ/u<sub>2</sub>)." and "the angle to the object is computed as arctan(2s, λ/u<sub>1</sub> − λ/u<sub>2</sub>)" | From u<sub>1</sub> = sλ/z<sub>1</sub> the depth is z<sub>1</sub> = **s**λ/u<sub>1</sub>, not λ/u<sub>1</sub> (and z<sub>2</sub> = −sλ/u<sub>2</sub>, E-CL-01); the angle of the face through (s, 0, z<sub>1</sub>) and (−s, 0, z<sub>2</sub>) is arctan(2s, z<sub>1</sub> − z<sub>2</sub>) = arctan(2s, sλ/u<sub>1</sub> + sλ/u<sub>2</sub>). The printed formulas are right only for s = 1, the default, which hides the error. The code does not compute the angle (it only shows the reticule), so nothing drawn is wrong. | Shows the text as in the original (F-CL-19). | Text only; no test changes. If I-CL-01 (show the measured distances and angle) is ever built, it must use the corrected formulas. | open |
| E-CL-03 | text | Reticule labels `Text[-i, {-s λ/i, -.05}]` on the left half, with the Details' "The readings on the reticule directly measure the distance from the object to the camera." | The left half of the reticule is labelled with negative numbers (−0.8 … −10, snapshot 1): the laser on the camera's left (top-view y = +s, image u < 0) reads "−2.5" for a distance of 2.5. A distance is never negative; the labels should be the same positive numbers on both sides. | Draws the negative labels (Q-CL-06, F-CL-18). | Positive labels on the left change the reticule text only: golden-snapshot comparisons of the label texts (snapshot 1: "−0.8 … −10") and M-CL-02/M-CL-06 change; no computed value changes. Could be offered as an option. | open |
| E-CL-04 | conceptual | `Convert3DtoCam[λ_, pt3d_] := Module[{k = λ/Max[0.001, pt3d[[3]]]}, …]` and the face test `If[#[[1,2]]/#[[1,1]] > #[[2,2]]/#[[2,1]], …]` | A pinhole camera cannot image points at or behind the pinhole (z ≤ 0). The original projects them as if they were 0.001 in front: an object that reaches behind the camera (the locator's range is assumed to be the top view's x = −1 … 15, K-CL-01, and a turned cuboid is 4 long) is drawn hugely enlarged across the image, and the face-visibility test, which compares the bearings y/x of the edge's end points, is meaningless when an end point has x ≤ 0 (wrong faces drawn or hidden, division by zero at x = 0, K-CL-03). | Keeps it (Q-CL-07, D-CL-07 for the division by zero). | Clipping faces at a near plane (or not drawing points with z ≤ 0) changes the camera image only for objects reaching behind the camera: H-CL-11 and M-CL-07/08 change; the snapshots (objects in front) stay. | open |
