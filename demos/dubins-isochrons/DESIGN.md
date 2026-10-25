# Design document: Isochrons for a Dubins Car

| | |
|---|---|
| Code version: | 0.1.22 |
| Document revision | 1 (2026-10-17) — first implementation |
| Status | describes the app as implemented; changes go through *Proposed changes* (§8) and [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md) |
| Original | Wolfram Demonstrations Project, "Isochrons for a Dubins Car", contributed by Aaron T. Becker and Shiva Shahrokhi, published 2017-12-18 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/IsochronsForADubinsCar/>. Readable source: [`docs/original-source/dubins-isochrons.txt`](../../docs/original-source/dubins-isochrons.txt); snapshots: `docs/original-snapshots/dubins-isochrons-1.png` … `dubins-isochrons-5.png` (pictures 6 and 7 of the extraction are the Wolfram icon, not snapshots); golden fixture (COMMON-DECISIONS §1): `tests/golden/dubins-isochrons.original-states.json` with `states[0]` = the live output-cell state including the original's cached `ParametricPlot` output `plotReach` (raw definition notebook line 1111), `specs` = the initial settings (stored `"Variables"`, raw line 3792, equal to the live state; the output cell `"Specifications"`, line 5286, also hold the cached plot), `snapshots[1…5]` = the `"Settings"` of the five snapshot cells with their own cached plots (lines 7853, 10287, 17941, 25604, 33224; 2–4 hold the "≤" region meshes) |
| Port files | `isochrons.js` (the original's `mRS`, `mLS`, `mRL`, `mLR`, the car state and path graphics of the `Piecewise`, Mathematica's `Table` iterator, the grey polygons, the sampled isochrons and region meshes, the plot-cache rule, one evaluation of the Manipulate body, `epiGraphics` as `shared/graphics.js` data (v0.1.21); pure), `main.js` (the Manipulate on `shared/manipulate.js`: controls on the left, plotReach and axes as Graphics data; v0.1.20), `index.html`; shared car icon `demos/common/car-icon.js` (owned by dubins-path, CC BY-NC-SA 3.0, §6); axes and ticks from `shared/svg-frame.js` (owner distance-norms, MIT) |
| Role in the project | further demonstration (batch A) |

## 1. Purpose and background

A Dubins car (forward speed 1, minimum turning radius *r*) starts at the origin heading up (+y). The Demonstration shows
where it can be after time *t*. The boundary of that set consists of four curves — isochrons — reached by turning at the
maximum rate to the right or left for a fraction *s* of the time and then either driving straight (RS, LS) or turning the
other way (RL, LR) for the rest. With "set =" the four isochrons are drawn for the given *t* and the area between the
outer and inner isochrons is shaded grey; with "set ≤" the four sets reachable within any time ≤ *t* are drawn as
translucent coloured regions. Under "move car" the user picks a path type, a switching time *τ* and a percentage *p* of
the time: a green car shows the pose at time *p*·*t*/100 and the whole path to time *t* is drawn thick.

How the isochrons are computed (the main fidelity question): by **explicit closed-form formulas** (`mRS`, `mLS`, `mRL`,
`mLR` in the initialization code) — no `ContourPlot`, `RegionPlot` or `NDSolve`. They are drawn with `ParametricPlot`:
one parameter (*s* ∈ [0, 1]) for the curves, two parameters (*s* ∈ [0, 1], *t*1 ∈ [0, *t*]) for the regions. The grey
band is two polygons built from `Table` samples of the same formulas (step `polySteps`), so it is exactly reproducible;
the curves and regions depend on `ParametricPlot`'s adaptive sampling and meshing, which the port replaces by fixed
sampling (D-DI-01, D-DI-02), checked against the cached plots stored in the notebook.

## 2. Scope

In scope: the original's six controls (*r*, *t*, set, path, *τ*, *p*) with their layout, the four formulas, the car
state and path drawing of the four path types, both plot modes (isochrons with the grey band, reachable regions), the
plot cache variables, the axes, the two cars.
Out of scope (would need a design entry first): which of the paths is optimal for a given point, isochrons for other
start headings, an animation of the set growing with *t* beyond the ⊕ panel of the *t* slider.

## 3. Users and use cases

| ID | User | Use case |
|----|------|----------|
| UC-DI-01 | student | see the isochrons for given *r* and *t* and compare them with the sets reachable within time *t* |
| UC-DI-02 | student | choose a path type and switching time *τ* and see which boundary point the car reaches |
| UC-DI-03 | student | move the car along the path with *p* and see the steering |
| UC-DI-04 | tester | compare the port with the saved state, the cached plots, the snapshots and the Mathematica harness |

## 4. Features

### 4.1 Controls

| ID | Feature | Reason | Since | Verified by |
|----|---------|--------|-------|-------------|
| F-DI-01 | *r* slider `{{r,2,Row[{Style["r",Italic]," (m)"}]},.5,10,Appearance->"Labeled",ImageSize->100}` — continuous, default 2 | the minimum turning radius (UC-DI-01) | v0.1.15 | e2e "dubins-isochrons has the controls of the original with their defaults: r 2, t 10, set =, path RS, tau 0.5, p 100"; e2e "dragging the t and r sliders recomputes the isochrons"; golden "harness H-DI-11"; golden "harness H-DI-16" |
| F-DI-02 | *t* slider `{{t,10,Row[{Style["t",Italic]," (s)"}]},.1,14,Appearance->"Labeled",ImageSize->100}` — continuous, default 10 | the time of the isochron (UC-DI-01) | v0.1.15 | e2e "dubins-isochrons has the controls of the original with their defaults: r 2, t 10, set =, path RS, tau 0.5, p 100"; e2e "dragging the t and r sliders recomputes the isochrons"; golden "harness H-DI-17"; M-DI-05 |
| F-DI-03 | "set" setter bar `Row[{Control@{set,{"=","≤"}},Style[" t",Italic]}]` (the values are the strings "=" and "≤" = `\[LessEqual]`; default "="), followed by an italic " t" | isochrons (=) or reachable sets (≤) (UC-DI-01) | v0.1.15 | e2e "the set setter switches between isochrons and reachable regions"; golden "harness H-DI-02" |
| F-DI-04 | "path" setter bar `Row[{Control@{path,{"RS","LS","LR","RL"}}}]`, default "RS" | the path type of the car (UC-DI-02) | v0.1.15 | e2e "the path setter and the tau slider move the green car to the selected boundary point"; golden "harness H-DI-03"; golden "harness H-DI-04"; golden "harness H-DI-05" |
| F-DI-05 | *τ* slider `{{τ,0.5,"τ (s)"},0,14,0.01,Appearance->"Labeled",ImageSize->100}` — step 0.01, default 0.5 | the switching time (UC-DI-02) | v0.1.15 | e2e "the path setter and the tau slider move the green car to the selected boundary point"; golden "harness H-DI-08" |
| F-DI-06 | *p* slider `{{p,100,Row[{Style["p",Italic]," (%)"}]},0,100,1,Appearance->"Labeled",ImageSize->100}` — step 1, default 100 | how much of the path the car has driven (UC-DI-03) | v0.1.15 | e2e "moving the p slider with the mouse drives the car from the origin along the thick path"; golden "harness H-DI-09"; golden "harness H-DI-10" |
| F-DI-07 | Control layout `ControlPlacement->Left`: `Style["plot parameters",12]`, *r*, *t*, set, `Delimiter`, `Style["move car",12]`, path, *τ*, *p*; hidden variables `{rold,1,None}`, `{told,1,None}`, `{plotReach,1,None}`, `{setold,1,None}` (Input cell; the initial settings and the live state hold `rold 2`, `told 10`, `setold "="` and the cached plot, F-DI-14) | same panel as the original (snapshots) | v0.1.15 | e2e "dubins-isochrons has the controls of the original with their defaults: r 2, t 10, set =, path RS, tau 0.5, p 100"; M-DI-02 |

### 4.2 Model (`isochrons.js`)

| ID | Feature | Reason | Since | Verified by |
|----|---------|--------|-------|-------------|
| F-DI-08 | The four formulas, start (0, 0) heading up, `α = τ t/r`, `β = (1-τ) t/r` (here `τ` is the fraction *s* of the time spent in the first turn): `mRS = {r(1-Cos[α]) - t(τ-1)Sin[α], r Sin[α] - t(τ-1)Cos[α]}`, `mLS = {-r(1-Cos[α]) + t(τ-1)Sin[α], r Sin[α] - t(τ-1)Cos[α]}`, `mRL = r{1-2Cos[α]+Cos[α-β], 2Sin[α]-Sin[α-β]}`, `mLR = r{-1+2Cos[α]-Cos[α-β], 2Sin[α]-Sin[α-β]}`; multiplication order as measured on the saved polygon (N-DI-07) | the isochrons themselves (UC-DI-01) | v0.1.15 | unit "mRS, mLS, mRL and mLR agree with an RK4 integration of the Dubins car"; unit "isochron formulas at a quarter turn: mRS gives (2 + pi, 2) and mRL gives (4, 4)"; unit "isochron end points: s = 0 is straight ahead and RL at s = 0 equals LS at s = 1"; golden "dubins-isochrons: the saved grey polygons are reproduced point by point" |
| F-DI-09 | Car state from the `Piecewise` (branches `path == "RS"`, `"LS"`, `"RL"`, otherwise LR): `fs = Max[0, If[p/100 t <= τ, 1, τ/(p/100 t)]]`, `cxy = mXX[fs, p/100 t, r]`, heading `cθ = π/2 ∓ Min[p/100 t, τ]/r (± Max[p/100 t - τ, 0]/r for RL/LR)`, front wheels `cα = If[p/100 t < τ, ∓r, 0 or ±r]` | the moving car (UC-DI-02, UC-DI-03) | v0.1.15 | unit "car pose of snapshot 1: RS, tau 0.5, p 100"; unit "car pose of snapshot 2: LR, tau 5.57, p 100"; unit "car poses of snapshots 3 to 5: RL tau 4.27, RL tau 1.2, RS tau 1.2"; unit "while p t/100 < tau the car is still turning (fs = 1)"; unit "at the switching instant the car is at the end of the turn and its wheels show the second segment"; unit "tau beyond t: a pure turn for the whole time t"; unit "p 0 puts the car at the origin heading up"; golden "harness H-DI-03"; golden "harness H-DI-04"; golden "harness H-DI-05"; golden "harness H-DI-06"; golden "harness H-DI-07"; golden "harness H-DI-20" |
| F-DI-10 | Path graphics with `maxα = Min[t,τ]/r`: RS `{Blue, Circle[{r,0},r,π+{0,-maxα}], Line[{r{1-Cos[maxα],Sin[maxα]}, … + Max[0,t-τ]{Sin[maxα],Cos[maxα]}}]}`, LS `{Orange, Circle[{-r,0},r,{0,maxα}], Line[…]}`, RL `{Red, Circle[{r,0},r,π+{0,-maxα}], Circle[r{1-2Cos[maxα],2Sin[maxα]},r,-maxα+{0,Max[t-τ,0]/r}]}`, LR `{Green, Circle[{-r,0},r,{0,maxα}]` (twice, Q-DI-05) `, Circle[r{-1+2Cos[maxα],2Sin[maxα]},r,(π+maxα)-{0,Max[t-τ,0]/r}]}` — always the whole path to time *t* | shows the path the car follows (UC-DI-02) | v0.1.15 | unit "path graphics: arc centres and angles and the straight piece of each path"; golden "harness H-DI-03"; golden "harness H-DI-04"; golden "harness H-DI-05" |
| F-DI-11 | Plot cache: `If[t != told ∨ plotReach == 1 ∨ setold != set ∨ rold != r, ControlActive[None, told = t; rold = r]; setold = set; plotReach = If[set == "=", …, …]]` — the plot is recomputed only when *t*, *r* or set changed (or when `plotReach` is 1, which only the Input cell's initial values give, N-DI-08) | the original keeps the expensive plot while *τ*, *p* or path change | v0.1.15 | unit "plot cache: recomputed when t, r or set change or plotReach is 1, kept when tau, p or path change"; golden "harness H-DI-14"; golden "harness H-DI-21" |
| F-DI-12 | "=" plot: `ParametricPlot[{mRS[s,t,r], mLS[s,t,r], mLR[s,t,r], mRL[s,t,r]}, {s,0,1}, Prolog->{{Opacity[0.4], Gray, Polygon[Join[Table[mLS[s,t,r],{s,1,0,-polySteps}], Table[mRS[s,t,r],{s,0,1,polySteps}], Table[mRL[s,t,r],{s,0,1,polySteps}]]], Polygon[Join[Table[mLS…,{s,1,0,-polySteps}], Table[mRS…,{s,0,1,polySteps}], Table[mLR[s,t,r],{s,1,0,-polySteps}]]]}}]` with `polySteps = If[t<10, 0.05, 0.02] If[r<1, r^2, 1]` and Mathematica's `Table` iterator (values min + k·step) | the isochrons and the band between them (UC-DI-01) | v0.1.15 | unit "polySteps is 0.05 for t < 10 and 0.02 otherwise, times r^2 for r < 1"; unit "Table iterator: {s, 0, 1, 0.02} and {s, 1, 0, -0.02} give 51 values each"; unit "Table iterator with a step that does not divide 1 stops short of the end"; unit "the two grey polygons are LS(1..0)+RS(0..1)+RL(0..1) and LS(1..0)+RS(0..1)+LR(1..0)"; unit "isochron sampling: every sample lies on its curve and the turning angle per step is at most 1 degree"; golden "dubins-isochrons: the saved grey polygons are reproduced point by point"; golden "dubins-isochrons: every point of the saved isochron lines lies on the port's curve"; golden "dubins-isochrons: the port's isochrons are within 0.01 of the saved ParametricPlot lines"; golden "dubins-isochrons: the saved plot range is within 2e-6 of the analytic extremes of the isochrons"; golden "harness H-DI-01"; golden "harness H-DI-11"; golden "harness H-DI-12"; golden "harness H-DI-13"; golden "harness H-DI-15"; M-DI-07 |
| F-DI-13 | "≤" plot: `ParametricPlot[{mRS[s,t1,r], mLS[s,t1,r], mLR[s,t1,r], mRL[s,t1,r]}, {s,0,1}, {t1,0,t}, Frame->False]` — four regions (images of the parameter rectangle) | the sets reachable within time *t* (UC-DI-01) | v0.1.15 | unit "region mesh: image points lie inside their region and the holes beside the start stay empty"; golden "dubins-isochrons: snapshot settings 2 to 4 regions agree with the saved region meshes"; golden "harness H-DI-02"; golden "harness H-DI-18"; golden "harness H-DI-19"; golden "harness H-DI-23"; M-DI-03 |
| F-DI-14 | Initial values = the live state = the initial settings (stored `"Variables"`, raw line 3792; the `"Specifications"`, line 5286, hold the same values): `r 2`, `rold 2`, `t 10`, `told 10`, `plotReach` = the cached "=" plot for *r* 2, *t* 10, `set "="`, `setold "="`, `path "RS"`, `τ 0.5`, `p 100`; the first evaluation does not recompute the plot (the cache test is not True). The Input cell's `1`s for `rold`, `told`, `plotReach`, `setold` would force a computation; the port's `initialState()` holds plot data computed at load for (2, 10, "=") in place of the cached Graphics (D-DI-10). The port opens in this state; its "Initial settings" restores the stored `"Variables"` (A-DI-01). One evaluation of the body per change | same opening picture as the original (snapshot 1) | v0.1.15 | unit "initial state is the live state: r 2, t 10, set =, path RS, tau 0.5, p 100 with the plot cached"; golden "dubins-isochrons: the initial settings equal the live state and evaluating them keeps the cached plot"; golden "harness H-DI-01"; golden "harness H-DI-22" |

### 4.3 Graphics (SVG)

| ID | Feature | Reason | Since | Verified by |
|----|---------|--------|-------|-------------|
| F-DI-15 | `Show[{plotReach, Graphics[epiGraphics]}, AspectRatio->Automatic, ImageSize->{440}, AxesOrigin->{0,0}, PlotRange->{{-15,15},{-16,16}}]` with the plot's own options: `PlotRangePadding` Scaled[0.05] on all sides (visible −16.5…16.5 × −17.6…17.6), `PlotRangeClipping`, axes through the origin with automatic ticks (labelled major ticks at multiples of 5, minor ticks every 1, snapshot 1), axes in front of the plot | the frame of the picture | v0.1.15 | e2e "dubins-isochrons loads without errors and draws four isochrons, the grey band, the axes and both cars"; M-DI-02 |
| F-DI-16 | "=" rendering: grey polygons first (Prolog), each `Opacity[0.4], Gray`, filled with the even–odd rule (self-intersecting; Q-DI-02), then the curves in ColorData[97] colours 1–4 (mRS blue, mLS orange, mLR green, mRL red) with `AbsoluteThickness[1.6]` | the isochron picture of snapshots 1 and 5 | v0.1.15 | golden "dubins-isochrons: snapshot 1 grey shading follows the even-odd rule"; e2e "dubins-isochrons loads without errors and draws four isochrons, the grey band, the axes and both cars"; M-DI-02 |
| F-DI-17 | "≤" rendering: the four regions in the same colours with face `Opacity[0.3]`, no polygon edges, each region drawn as one translucent unit (`Method -> {"TransparentPolygonMesh" -> True}`), then the four boundary lines (images of the edges of the parameter rectangle) in the opaque colours; axes in front (`"AxesInFront" -> True`) | the reachable-set picture of snapshots 2–4 | v0.1.15 | golden "dubins-isochrons: snapshot settings 2 to 4 regions agree with the saved region meshes"; e2e "the set setter switches between isochrons and reachable regions"; M-DI-03 |
| F-DI-18 | `epiGraphics = {{Dashed, Gray, Circle[{r,0},r], Circle[{-r,0},r]}, {Thick, pathGraphics}, Red, drawCar[{0,0},π/2,0,.5,.5,False], Green, drawCar[cxy,cθ,cα,.8,.5,True]}` drawn over the plot | turning circles, path and cars (UC-DI-02) | v0.1.15 | e2e "the path setter and the tau slider move the green car to the selected boundary point"; golden "dubins-isochrons: snapshots 1 to 5 show the green car at the computed poses"; M-DI-04 |
| F-DI-19 | `drawCar[xy,Theta,Alpha,opac,sc,lights]`: the car-paths car with `If[lights, {Yellow, Opacity[0.8 opac], EdgeForm[None], Polygon[{{1,.35},{8,.05},{8,.55}}], Polygon[{{1,-.35},{8,-.05},{8,-.55}}]}]` (beams to x = 8 instead of 4, optional, no edge) and an unused `sc` argument | the car icon of the original | v0.1.15 | unit "drawCar of this Demonstration differs from the default car only in optional headlights 8 units long without edges"; M-DI-02 |
| F-DI-20 | Title, caption and details text (with the formulas and two references) of the original | explains the Demonstration | v0.1.15 | M-DI-01 |

### 4.4 Port additions

| ID | Feature | Reason | Since | Verified by |
|----|---------|--------|-------|-------------|
| A-DI-01 | "Initial settings" button: all controls and the hidden variables back to the initial settings (stored `"Variables"` = the live state of F-DI-14, plot cached) | stands in for the Manipulate ⊕ menu → Initial Settings | v0.1.15 | e2e "Initial settings restores the opening state" |
| A-DI-02 | `window.__demo` automation hook (state, car state, path graphics, plot data summary: point counts, polygon points, region areas; `setState`, `worldToClient`) | automated tests | v0.1.15 | e2e "the path setter and the tau slider move the green car to the selected boundary point" |
| A-DI-03 | "All demos" link | site navigation | v0.1.15 | inventory; M-GEN-01 |
| A-DI-04 | Credit footer: original title, authors, licence, adaptation notice | required by CC BY-NC-SA 3.0 | v0.1.15 | e2e "attribution on" |
| A-DI-05 | Start-up notice (watchdog, `<noscript>`) when the page cannot start (DEC-22) | a clear message instead of an empty page | v0.1.15 | e2e "start-up notice when" |
| A-DI-06 | standalone bundle (owner rule R-A): `npm run bundle -- dubins-isochrons` builds `dist/dubins-isochrons/` with exactly the files the app imports, the licences, a generated README and a root `index.html` (§6, "Building and deploying this app alone") | anyone can host this one app elsewhere without the rest of the site (owner rule R-A, 2026-10-17) | v0.1.15 | e2e "bundle: dubins-isochrons runs from its own folder" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document". The Greek
variable τ is written `tau` in test ids.

| data-testid | Feature |
|-------------|---------|
| `slider-r` | F-DI-01 |
| `value-r` | F-DI-01 |
| `plus-r` | F-DI-01 |
| `play-r` | F-DI-01 |
| `stepback-r` | F-DI-01 |
| `stepfwd-r` | F-DI-01 |
| `slider-t` | F-DI-02 |
| `value-t` | F-DI-02 |
| `plus-t` | F-DI-02 |
| `play-t` | F-DI-02 |
| `stepback-t` | F-DI-02 |
| `stepfwd-t` | F-DI-02 |
| `setter-set-*` | F-DI-03 |
| `setter-path-*` | F-DI-04 |
| `slider-tau` | F-DI-05 |
| `value-tau` | F-DI-05 |
| `plus-tau` | F-DI-05 |
| `play-tau` | F-DI-05 |
| `stepback-tau` | F-DI-05 |
| `stepfwd-tau` | F-DI-05 |
| `slider-p` | F-DI-06 |
| `value-p` | F-DI-06 |
| `plus-p` | F-DI-06 |
| `play-p` | F-DI-06 |
| `stepback-p` | F-DI-06 |
| `stepfwd-p` | F-DI-06 |
| `reset` | A-DI-01 |
| `crumbs` | A-DI-03 |
| `details` | F-DI-20 |
| `credits` | A-DI-04 |

The setter values give `setter-set-=`, `setter-set-≤`, `setter-path-RS`, `-LS`, `-LR`, `-RL`. Non-interactive test ids
of the graphic (the grey bands carry their point count as `data-points`): `isochron-RS|LS|LR|RL`, `grey-band-1|2`, `region-RS…`, `region-boundary-RS…`, `path-graphics`
(with `data-path`), `start-car`, `moving-car`, `turning-circle-right|left`, `axis-x`, `axis-y`.

## 6. Design

- `isochrons.js` (pure, no DOM): `mRS`, `mLS`, `mRL`, `mLR` under the original's names; `carState(path, r, t, τ, p)`
  returning `{fs, maxAlpha, cxy, cTheta, cAlpha, pathGraphics}` exactly as the `Piecewise` (pieces as `shared/graphics.js`
  data `Circle[c, r, {a1, a2}]` / `Line[{from, to}]` since v0.1.21, before `{kind, …}` records; colour name); `polySteps(t, r)`; `tableValues(min, max,
  step)` = Mathematica's iterator (count `Floor[(max-min)/step]` + 1, values `min + k·step`, K-DI-01);
  `greyPolygons(t, r)`; `isochronCurves(t, r)` and `reachRegions(t, r)` (fixed sampling, below); `needsPlot(state)` = the
  `If` condition of F-DI-11 with tolerant `!=` (`shared/mma.js` `mUnequal`) and the sentinel `plotReach === 1`;
  `evaluate(state)` (one evaluation: car state, cache test, plot data if needed, `told`/`rold`/`setold` updates);
  `epiGraphics(r, view)` (v0.1.21): the dashed turning circles, `{Thick, pathGraphics}` (annotated `path-graphics` with
  `data-path`) and the two cars `{Red, drawCar[…]}`, `{Green, drawCar[…]}` (`demos/common/car-icon.js`, `Arrowheads[.02]`
  as `arrowSize` = 0.02 × the padded width of the 440 px picture) as Graphics data; `initialState()`.
- State: the Manipulate variables `r`, `t`, `set` ("=" | "≤"), `path`, `tau`, `p`, and the hidden `rold`, `told`,
  `setold`, `plotReach` (1 or the plot data); `initialState()` = the live state (F-DI-14) with the plot data computed
  at load. Evaluation order as the body: Module initialisers (`fs`, `polySteps`), `maxα`,
  the `Piecewise`, `epiGraphics`, the cache `If`, `Show`.
- Arithmetic: `α = s*t*(1/r)` (`a/b` as `a*(1/b)`), `p/100 t` as `(p/100)*t`; the products `∓t(τ−1)X` from left to
  right as `(t*(s-1))*X`, the order of Mathematica 15.0.1 (harness run 2, K-DI-04; v0.1.15/v0.1.16 nested `-(t*((s-1)*X))`
  as in the notebook's saved polygon, N-DI-07); comparisons `<=`, `<` on reals tolerant (`mLessEq`, `mLess`).
- Isochron curves ("=", D-DI-01): each curve sampled at *N* + 1 uniform values of *s* with
  *N* = max(400, ⌈(*t*/*r*)·180/π⌉) (≤ 1° of heading change per step; 400 at the opening state, 1605 at *t* 14, *r* 0.5),
  plus the exact end points. The grey polygons use `tableValues` and are exact.
- Regions ("≤", D-DI-02): per path type a uniform grid of *N*s × *N*t cells over [0, 1] × [0, *t*] with
  *N*s = clamp(⌈8 *t*/*r*⌉, 40, 200), *N*t = clamp(⌈4 *t*⌉, 20, 56) (≤ 11 200 quads per region); every quad's image is
  oriented counter-clockwise and all quads of a region form one SVG `<path>` (non-zero fill) inside a group with
  `opacity="0.3"`, so a region is one translucent union (TransparentPolygonMesh) even where the map folds; the boundary
  is the image of the rectangle's edges (*s* = 0 for *t*1: 0 → *t*, *t*1 = *t* for *s*: 0 → 1, *s* = 1 for *t*1: *t* → 0),
  sampled like the curves. Regions are recomputed only by the cache rule; performance is checked by hand (M-DI-06).
- `main.js` (v0.1.20; 89 → 74 lines in v0.1.21) is one `Manipulate({…})` call of `shared/manipulate.js`: the controls as Mathematica control
  specs in the original's order (headings "plot parameters" and "move car", the sliders `r`, `t`, `τ` (test id `tau`),
  `p` with `Appearance -> "Labeled"`, `ImageSize -> 100` and the typeset labels `Row[{Style["r", Italic], " (m)"}]` …,
  the setter bars `set` (with the italic suffix " t" added after the call) and `path`, `Delimiter`, the hidden `rold`,
  `told`, `plotReach`, `setold`), and a body returning `{state, view, graphics}` with `evaluate` and the Graphics of
  `Show[{plotReach, Graphics[epiGraphics]}]` as `shared/graphics.js` data: plot (grey polygons + curves, or regions + boundaries; redrawn only when `plotReach`
  changes, `cachedGraphics`), axes through the origin with ticks and labels (F-DI-15; `shared/svg-frame.js`
  `axesPrimitives` as data via `shared/graphics-extras.js` `axesGraphics`, drawn once), `isochrons.js` `epiGraphics`.
  `PlotRange [[-15,15],[-16,16]]`, `ImageSize 440`, `PlotRangePadding 0.05`. Still through the layer's `Raw`: each "≤"
  region's quads as one `<path>` (one translucent union; separate polygons would change the picture); the cars are data
  since v0.1.21 (before: `drawCarSvg` as `Raw`). `shared/mma-colors.js` (`css`; the four ColorData[97] colours as constants),
  `shared/requirements.js`. Layout: controls in a left column (`ControlPlacement->Left`), stacked above the graphic
  below ~760 px width (D-DI-06).
- Reuse from car-paths/dubins-path: only the car icon. `drawCar` differs from car-paths' (headlights optional via
  `lights`, beams to x = 8, `EdgeForm[None]`, extra unused `sc`); with `demos/common/car-icon.js` (owned by dubins-path,
  CC BY-NC-SA 3.0, credits in its header; `drawCar(xy, Theta, Alpha, opac, {lights, beam: 8, headlightEdge: null, id, arrowSize})`,
  see dubins-path §6) the code is shared;
  `wheelAngle` (`ArcTan[Alpha∓.375, 1.4]`) is identical. No path or word code is shared (different formulas: the
  isochron formulas are endpoint formulas of two-piece paths from a fixed start, not shortest-path words).

### 6.1 Building and deploying this app alone

Owner rule R-A (2026-10-17): this one app can be taken out of the repository and hosted anywhere. One command builds it:

```
npm run bundle -- dubins-isochrons
```

`tools/bundle-app.mjs dubins-isochrons` (npm script `bundle`) writes `dist/dubins-isochrons/`: the app with exactly the files it needs — its HTML, its modules and everything they import, recursively, with the repository's relative layout kept — plus the licence texts that apply, a generated `README.md` (title, the original's credits, licence, "serve this folder with any static web server", how to run its tests in the full repository) and a root `index.html` that opens the app (the "All demos" link of the bundled page leads to that root page). Nothing else. Contents (generated with `npm run bundle -- --update-docs`; unit "bundle contents listed in DESIGN.md match the collector" keeps the table current):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/dubins-isochrons/`) | 3 | `index.html`, `isochrons.js`, `main.js` |
| `shared/` | 15 | `graphics-extras.js`, `graphics.js`, `manipulate.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `mma.js`, `random.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `ui-extra.js`, `ui-interval.js`, `ui.js` |
| `demos/common/` | 1 | `car-icon.js` |
| added by the bundler | 7 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/dubins-isochrons/DESIGN.md` |
<!-- bundle-contents:end -->

Licences: `LICENSES/CC-BY-NC-SA-3.0.txt` (this app and every `demos/…` module: derived from Wolfram Demonstration code); `LICENSES/MIT.txt` (the `shared/…` modules).

Requirements: a current browser with ES modules (Firefox, Chromium, WebKit); no WebGL.

Verified by e2e "bundle: dubins-isochrons runs from its own folder" (A-DI-06, `tests/e2e/bundle.spec.js`): the app is bundled into `test-output/bundle-e2e/<browser>/dubins-isochrons/`, that folder alone is served by a static file server, its root page must open the app, the app must start (`window.__demo.ready`) without page errors, every request must stay inside the folder and succeed, every script and stylesheet of the bundle must be loaded, and the app's "All demos" link must reach the bundle's root page. The contents table above is kept current by the unit test named there.

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

| ID | Kind | Description |
|----|------|-------------|
| Q-DI-01 | quirk kept | The Details text gives the RS end position as `r{1-cos α, sin α} - (t-τ){sin α, cos α}` and LS as `r{cos α-1, sin α} + (t-τ){sin α, -cos α}`; the straight part has the wrong sign in both (the code is right: `mRS[0.5, 2π, 2] = (2+π, 2)`, a quarter turn right then straight east; RK4 check N-DI-02). The text is kept verbatim. |
| Q-DI-02 | quirk kept | The grey band in "=" mode is two self-intersecting polygons, P1 = LS(*s* 1→0) + RS(0→1) + RL(0→1) and P2 = LS(1→0) + RS(0→1) + LR(1→0), each with `Opacity[0.4]` Gray, filled by the even–odd rule; where both cover the plane the grey is darker. Verified on snapshot 1: at (−1, 3) both winding numbers are −2 → white (non-zero filling would be dark), at (4, 2) one polygon → RGB 204, at (6, 6) both → 174 (= 0.6·204 + 0.4·127.5). The port uses `fill-rule="evenodd"` and per-polygon opacity. |
| Q-DI-03 | quirk kept | `polySteps = If[t<10, 0.05, 0.02] If[r<1, r^2, 1]`: when 1/`polySteps` is not an integer the `Table` chains stop short — e.g. *r* 0.7, *t* 5: step 0.024499999999999997, 41 values, ascending chains end at *s* = 0.98, descending ones at 0.02 — so the band's corners are joined by short chords instead of following the curves to their ends. |
| Q-DI-04 | quirk kept | `cα` uses the strict `p/100 t < τ` while `fs` uses `<=`: at the switching instant the car sits at the end of the first turn while its front wheels already show the second segment (RS/LS straight, RL left, LR right). |
| Q-DI-05 | quirk kept | The LR path graphics contain `Circle[{-r,0},r,{0,maxα}]` twice (drawn twice; no visible effect). |
| Q-DI-06 | quirk kept | `drawCar`'s `sc` argument is never used; the start car (red, opacity 0.5) has no headlights; the moving car's beams are 8 units long (4 in the other car Demonstrations) and are clipped at the image edge. |
| Q-DI-07 | quirk kept | The cache test `plotReach == 1` stays unevaluated once `plotReach` is a Graphics (neither True nor False); the `If` still works because `Or` returns True as soon as another test is True, and does nothing otherwise. `ControlActive[None, told = t; rold = r]` leaves `told`/`rold` unchanged during a drag, so the plot is recomputed on every update while *t* or *r* is dragged and once more on release. |
| Q-DI-08 | quirk kept | *τ* may exceed *t* (slider up to 14): then the path is a pure turn for the whole time *t* (`maxα = t/r`, straight part 0, `fs = 1`). `Max[0, …]` in `fs` is redundant. |
| Q-DI-09 | quirk kept | The thick path is always the whole path to time *t*, independent of *p*; *p* only moves the car along it. |
| D-DI-01 | deviation | "=" curves: `ParametricPlot`'s adaptive sampling (saved state: 772, 772, 984, 984 points) is replaced by fixed sampling (§6). PORT DEVIATION, checked: every saved point lies on the port's curve, Hausdorff distance between the polylines ≤ 0.01 units (≈ 0.15 px). |
| D-DI-02 | deviation | "≤" regions: `ParametricPlot`'s adaptive 2D mesh (snapshot 2: one GraphicsComplex of 12 790 points, ≈ 3 000 quads per region plus a few larger polygons) is replaced by a fixed parameter grid drawn as one translucent union per region (§6). PORT DEVIATION, checked against the meshes stored in snapshot cells 2–4 (coverage on a 0.05 grid: at most 0.42 % of the covered grid points differ) and by hand (M-DI-03). The quads are straight-edged: along the fold lines of the RL and LR regions the true image can lie up to 0.025 units (0.35 px) outside the mesh; unit "region mesh: …" (T-DI-19) therefore accepts image points within 0.03 of the mesh (21 of 2000 random points, all RL/LR). |
| D-DI-03 | deviation | Axes and ticks are drawn with `shared/svg-frame.js` (F-DI-15); font, tick lengths and grey levels approximate Mathematica's. |
| D-DI-04 | deviation | Sizes approximate Mathematica's: `AbsoluteThickness[1.6]` curves, 1 px region boundaries, `Thick` = 2 px path, `Dashed` pattern, car arrowheads as plain triangles. |
| D-DI-05 | deviation | Slider values: `Controls.slider` with `steps: 'mma'` (COMMON-DECISIONS §3) gives *τ* = 0 + *k*·0.01 and *p* = 0 + *k*·1 exactly as Mathematica's discrete sliders (e.g. 427·0.01 = 4.2700000000000005, as in snapshot 3's Settings); *r* and *t* are continuous. Value fields: a dragged or stepped value of *τ*, *r* or *t* is a machine real and shows with its point ("4.", "4.27"), as in Mathematica; a typed whole number ("2") stays exact and shows as "2" (Mathematica keeps a typed Integer exact; `shared/ui.js` since the review of v0.1.15 — before, a typed "2" showed "2." and was stored as a real), a typed "2." is a machine real; *p* (integer min and step) always shows plain integers. The exact integer is the same JavaScript number, so only the text differs. Remaining deviations: typed values are snapped to the step and clamped to the slider ranges (Mathematica's field stores the typed value as typed; what it does with off-step or out-of-range values is untested). |
| D-DI-06 | deviation | `ControlPlacement->Left`: a left control column on wide screens; on narrow screens (phone width) the controls stack above the graphic. |
| D-DI-07 | deviation | The opening state is exact in the original (*r* 2, *t* 10, *p* 100 integers; *τ* 0.5 and the `Table` values are machine numbers); the port uses machine numbers throughout. Only last bits can differ (the saved grey polygon is reproduced to ≤ 1 ulp). |
| D-DI-08 | deviation | `ControlActive` is not modelled: the port sets `told`/`rold` on every evaluation. No visible difference (the plot always matches the current *t*, *r*, set). |
| D-DI-09 | deviation | What counts as one update during a slider drag differs (front end vs one evaluation per input event/animation frame); the picture after the drag is the same. |
| D-DI-10 | deviation | The original opens with the cached `plotReach` of the live state (sampled by the Mathematica version that saved the notebook, D-DI-01/D-DI-02 apply to it as to any plot); the port computes equivalent plot data at load and stores it as the cached plot, so its first evaluation, like the original's, does not recompute. Option I-DI-04 would show the original's own points instead. |
| D-DI-11 | deviation (test expectation changed) | T-DI-25 asked that the port's sampled curves reach at least the saved PlotRange (max *x* ≥ 8.858406252505215). With the sampling rule of §6 (401 samples per curve at *r* 2, *t* 10) the port's samples lie up to 6·10⁻⁵ units (0.001 px) inside the analytic extremes, below Mathematica's adaptively placed samples. Not visible; the sampling rule was kept. Golden "dubins-isochrons: the saved plot range is within 2e-6 of the analytic extremes of the isochrons" checks the saved PlotRange against the analytic extremes (dense sampling of the formulas) within 2·10⁻⁶ and the port's samples within 10⁻⁴ of them. |
| K-DI-01 | known issue (resolved in v0.1.17) | `Table`'s iteration count when (max − min)/step is a hair below an integer (does Mathematica add a tolerance?). The saved data does not decide it (1/0.02 rounds to exactly 50). Harness run 2: `Floor[(max − min)/step] + 1` values `min + k·step`, no tolerance — step 0.024499999999999997 gives chains of 41 (polygons of 123 points, H-DI-11), 0.0125 81 (243, H-DI-12), 0.0072 139 (417, H-DI-13), as the port's `tableValues`; the coordinates agree bit for bit except the last bits of K-DI-03. |
| K-DI-02 | known issue (lead) | Folded regions: whether Mathematica's TransparentPolygonMesh blends a region that covers a point twice only once (the port's union) — compare snapshots 2–4 and M-DI-03. |
| K-DI-03 | known issue (lead) | Machine `Sin`/`Cos` last bits: with glibc the saved grey polygon (306 coordinates) is reproduced exactly except the four coordinates at *s* = 0.5 (α = 2.5), 1 ulp each; browsers' `Math.sin`/`Math.cos` may differ elsewhere. Harness run 2 (with the product order of K-DI-04): V8's `Math.sin`/`Math.cos` reproduce 15.0.1's grey polygons bit for bit except 8 of 612 coordinates (H-DI-01), 17/492 (H-DI-11), 28/972 (H-DI-12), 43/1668 (H-DI-13), 22/2412 (H-DI-17), 0/252 (H-DI-16), each within one ulp of max(*t*, *r*); glibc (correctly rounded) does not do better (20, 22, 19, 59, 57, 0), so Mathematica's `Sin`/`Cos` are neither — not reproducible in general, last bits only. The car states and path graphics of all 23 scenarios are bit-identical. Stays open as a known limit. |
| K-DI-04 | known issue (lead) | Evaluation order of `Times`: measured with exact *t* = 10, *r* = 2 on the saved polygon (N-DI-07, Input-cell definitions `t (τ-1) Sin[α]`, one flat product). The output cell's stored Initialization prints these terms as `-(t (τ - 1)) Sin[α]` and `+(t (τ - 1)) Sin[α]` — the same expression or a nested product evaluated as written (COMMON-DECISIONS §4)? With machine *t* and *r* (after a drag) the order may also differ. Harness H-DI-01 and H-DI-15 recompute with the stored definitions (cache forced). Last bits only. Resolved by harness run 2 (v0.1.17): Mathematica 15.0.1 evaluates all four terms as `(t·(τ−1))·X`, with exact (H-DI-01, H-DI-15) and machine *t*, *r* (H-DI-11…13, H-DI-16, H-DI-17): with that order the port's grey polygons differ from the record in 0–3.5 % of the coordinates (K-DI-03), with the nested order of v0.1.16 in 4–15 % (46/612 … 372/2412). The notebook's saved polygon (authoring version) matches the nested order instead; H-DI-01 differs from it in 50 of 612 coordinates. The port follows 15.0.1. |
| K-DI-05 | known issue (resolved in v0.1.17) | Whether Mathematica 15.0.1 samples the "=" curves exactly as the cached plot in the notebook (H-DI-01 compares). If not, golden tests keep using the saved points only through point-on-curve and Hausdorff checks (which do not depend on it). Harness run 2: the same parameter values (772, 772, 984, 984 points, every coordinate within 1 ulp of 10 of the saved one — the product order of K-DI-04), but a different style: P-DI-01. |
| K-DI-06 | known issue (lead) | Whether the axes are drawn in front of the cars and path (`epiGraphics`) or only in front of the plot; the port draws them between the plot and `epiGraphics`. M-DI-02. |
| K-DI-07 | known issue (resolved in v0.1.17) | `ControlActive` during the ⊕ animation of *t* or *r* (whether `told` is updated each frame); no visible effect expected. Harness run 2 (H-DI-21): with `ControlActive` true and *t* 12, `told` stays 10 while the plot is recomputed for *t* 12 (so every frame of a drag recomputes it); the next evaluation with `ControlActive` false sets `told` 12. The port sets `told` at once (D-DI-08); the plot is the same in every frame. |
| N-DI-01 | note | The isochrons are explicit formulas evaluated by `ParametricPlot` (curves) and a two-parameter `ParametricPlot` (regions); the grey band comes from `Table`; there is no `ContourPlot`, `RegionPlot`, `FindRoot` or `NDSolve`. |
| N-DI-02 | note | The four formulas agree with an RK4 integration of the Dubins car (turn for *s t*, then the second segment) within 2.4·10⁻¹² for 40 random (*s*, *t*, *r*) (Python, this design). |
| N-DI-03 | note | Colours: `ParametricPlot`'s default ColorData[97] 1–4 for the list order {mRS, mLS, mLR, mRL}: (0.368417, 0.506779, 0.709798), (0.880722, 0.611041, 0.142051), (0.560181, 0.691569, 0.194885), (0.922526, 0.385626, 0.209179); the path colours Blue (RS), Orange (LS), Green (LR), Red (RL) match them. |
| N-DI-04 | note | The snapshot cells store their settings with their own cached `plotReach` (snapshots 2–4: "≤" region meshes; 5: "="). Settings: 1 RS τ 0.5 "="; 2 LR τ 5.57 "≤"; 3 RL τ 4.2700000000000005 "≤"; 4 RL τ 1.2 "≤"; 5 RS τ 1.2 "="; all *r* 2, *t* 10, *p* 100. |
| N-DI-05 | note | The Details text says the car starts at (0, 0, 0); the code and the pictures start it at the origin heading up (+y, π/2), and *x* to the right is reached by turning right. |
| N-DI-06 | note | The cached plot's own PlotRange {{−8.858406252505215, 8.858406252505215}, {−3.716814366621081, 10}} (extremes of the sampled points; the analytic extremes are 8.858407346 and −3.716814693) is replaced by Show's PlotRange. |
| N-DI-07 | note | Multiplication order measured on the saved grey polygon (*t* 10, *r* 2 exact): the terms `-t(τ-1)Sin[α]`, `-t(τ-1)Cos[α]` are reproduced as `-(t*((s-1)*X))`, the term `+t(τ-1)Sin[α]` of `mLS` as `(t*(s-1))*X`; `α = 5 s` for any order. Superseded in v0.1.17 by the 15.0.1 record (K-DI-04): `(t*(s-1))*X` for all terms; the golden test of the saved polygon allows one ulp of 10 (556 of 612 coordinates identical). |
| N-DI-09 | note | Implementation (v0.1.15): the Mathematica-harness scenarios of the TESTPLAN (`tests/harness/dubins-isochrons.scenarios.json`) are replayed by the golden tests "dubins-isochrons harness H-DI-nn: …" (cited as `golden "harness H-DI-nn"`); they skip until `tests/golden/dubins-isochrons.harness.json` exists. In a step run with `ControlActive` true (H-DI-21) the port's `told`/`rold` are not compared (D-DI-08). The grey-level part of T-DI-27 is checked on the picture and against the even–odd counts of the port's polygons; in the browser the e2e test checks that the bands are drawn with `fill-rule="evenodd"` (the pixel levels are compared by hand, M-DI-02). Grey polygon reproduction in Node (V8's `Math.sin`/`Math.cos`): 592 of 612 coordinates bit-identical, the rest within 2 ulp (K-DI-03). |
| N-DI-08 | note | Input cell vs initial settings: the Input cell declares `{rold,1,None}`, `{told,1,None}`, `{plotReach,1,None}`, `{setold,1,None}`; the output cell stores `{{rold, 2}, 1, ControlType -> None}`, `{{told, 10}, …}`, `{{plotReach, Graphics[…]}, …}`, `{{setold, "="}, …}`, i.e. the state after the authoring session's first evaluation with its cached plot. The published notebook therefore opens with that cached plot and recomputes only when *t*, *r* or set change (`plotReach == 1` is then never True). Control specs, `mRS` … `mLR` and `drawCar` of the stored Initialization were checked against the Input cells: same, apart from the printed grouping of K-DI-04. |

## 8. Proposed changes

Template: see [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md).

| ID | Status | Requested by / date | Change | Reason | Acceptance criteria |
|----|--------|---------------------|--------|--------|---------------------|
| P-DI-01 | proposed | harness run 2, 2026-10-18 | Decide which Mathematica version's plot style the port follows. Now: the style of the notebook's saved plots (ColorData[97] 1–4: (0.368417, 0.506779, 0.709798), (0.880722, 0.611041, 0.142051), (0.560181, 0.691569, 0.194885), (0.922526, 0.385626, 0.209179), `AbsoluteThickness[1.6]`), for every plot. Option: after the first recomputation use 15.0.1's style | Mathematica 15.0.1 recomputes the plots (after *t*, *r* or set changed: H-DI-01, -02, -11…-19, -21, -23) in its new default style, (0.24, 0.6, 0.8), (0.95, 0.627, 0.1425), (0.455, 0.7, 0.21), (0.922526, 0.385626, 0.209179) with `AbsoluteThickness[2]` (regions with `Opacity[0.3]`), while the opening shows the saved plot in the old style (H-DI-22, H-DI-14 steps 1–4). In 15.0.1 the curve colours change at the first drag of *t* or *r*; the path colours (N-DI-03) no longer match | golden "harness H-DI-nn" assert the recorded style of each plot (new style after a recomputation, the saved style before) |

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.15 | 2026-10-17 | first implementation of the approved design draft (2026-10-12, owner approval 2026-10-17, DEC-17): `isochrons.js`, `main.js`, `index.html`, the car icon from `demos/common/car-icon.js` (owner dubins-path), axes from `shared/svg-frame.js`; harness references cited as the golden tests that replay them; D-DI-11 (extremes of the sampled curves), D-DI-02 completed (fold lines), N-DI-09; review fixes |
| 2 | v0.1.16 | 2026-10-18 | version number only (batch B release); no change to this app |
| 3 | v0.1.17 | 2026-10-18 | harness run 2 accepted: `mRS`/`mLS` multiply `t (τ-1) X` from left to right, `(t*(s-1))*X`, as Mathematica 15.0.1 (K-DI-04 resolved, N-DI-07 superseded; car states bit-identical in all 23 scenarios, grey polygons except K-DI-03's last bits); K-DI-01, K-DI-05, K-DI-07 resolved, K-DI-03 updated with the evidence; P-DI-01 proposed (15.0.1's plot style). Golden tests: the `{"h", "a"}` encoding read, scenario values converted to doubles, a fresh state per step, the symbol `Pi` in Circle angles (`toJSNumeric`), a point-on-curve search that also finds the nearest arc of curves with many turns and cusps, polygon tolerance one ulp of max(*t*, *r*) with ≥ 95 % identical (≥ 90 % for the saved cache) |
| 4 | v0.1.18 | 2026-10-18 | version number only (harness run 3 accepted for manipulability-ellipsoid); no change to this app |
| 5 | v0.1.19 | 2026-10-21 | version number only (shared Manipulate layer added, four apps migrated to it); no change to this app |
| 6 | v0.1.20 | 2026-10-21 | `main.js` rewritten on the shared Manipulate layer (`shared/manipulate.js`, `shared/graphics.js`): control specs in Mathematica's form, the picture as Graphics data; no change to behaviour or picture (all unit, golden and browser tests unchanged and passing; screenshots and Manipulate state identical to v0.1.19 at sample settings) |
| 7 | v0.1.21 | 2026-10-23 | the model builds the picture as `shared/graphics.js` Graphics data (owner decision D2) and the body returns {state, view, graphics}; `main.js` shortened; path pieces are `Circle`/`Line` data (hook `view().pathGraphics.pieces` in that form); the car icon is Graphics data; the old drawing output frozen in `tests/unit/fixtures/dubins-isochrons-drawing.pre-graphics.json` and tests that read the old format now read the same numbers through `annotations()`/`Cases()`; no change to behaviour or picture (screenshots and Manipulate state identical to v0.1.20 at sample settings) |
| 8 | v0.1.22 | 2026-10-25 | version number; bundle table (`shared/manipulate.js` now also loads `shared/graphics-extras.js` and `shared/svg-frame.js` for the new Graphics options `Axes`/`Frame`/`PlotLabel`); no change to this app's code, behaviour or picture (pixel parity with v0.1.21) |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|-------------|---------|-------------|---------|
| I-DI-01 | Correct the sign of the straight part in the Details formulas for RS and LS | the text matches the picture | changes the original's text | Q-DI-01 |
| I-DI-02 | Also draw the isochron for the car's current time *p t*/100 | shows that the car is on the boundary of its own reachable set | clutter; a new control or style needs a design entry | F-DI-09 |
| I-DI-03 | Sample the grey band with the same fine grid as the curves | the band's corners follow the curves for *r* < 1 | differs from the original | Q-DI-03 |
| I-DI-04 | Show the original's cached curve points (from the saved state) in the opening picture until *t*, *r* or set change | the opening picture uses Mathematica's own sample points | ships ≈ 3 500 points of data; differs from the port's own sampling only below 0.15 px | D-DI-10, D-DI-01 |
| I-DI-05 | Coarser region mesh while a slider is dragged, full mesh on release | smoother dragging at large *t*/*r* | a behaviour the original does not have | D-DI-02, M-DI-06 |

## 11. Errors in the original (conceptual and mathematical)

Owner rule R-C (2026-10-17). Checked: `mRS`, `mLS`, `mRL`, `mLR` against the motion of a car that starts at the origin
heading up (+y) and turns for the fraction τ of the time, then goes straight or turns the other way — derived by hand
(right turn about (r, 0): r{1 − cos α, sin α}, heading π/2 − α, straight direction {sin α, cos α}; second centre
r{1 − 2 cos α, 2 sin α} for RL; mirror images for LS, LR) and by the RK4 integration of N-DI-02 (agreement 2.4·10⁻¹²):
all four are correct; the path graphics (`Circle` start and end angles, line ends) and the moving car's heading `cTheta`
for each path type: correct; the claim that RS, LS, RL, LR bound the reachable set (Cockayne and Hall [2]: optimal paths
to a point with free final heading are of type CS or CC); the Details formulas and statements against the code and the
pictures; the quirks Q-DI-01…09.

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|------|-----------------------|--------------------------|--------------------|-------------------------|--------|
| E-DI-01 | text | Details: "The car position for an RS path is r{1 − cos α, sin α} − (t − τ){sin α, cos α}." and "For LS the ending position is r{cos α − 1, sin α} + (t − τ){sin α, −cos α}." | The straight part has the wrong sign in both: after a right turn by α the car heads along {sin α, cos α}, so RS ends at r{1 − cos α, sin α} **+** (t − τ){sin α, cos α}; LS ends at r{cos α − 1, sin α} + (t − τ){−sin α, cos α}. The code (`mRS`, `mLS`) is right: `mRS[0.5, 2π, 2]` = (2 + π, 2), a quarter turn right then straight east. | Shows the Details verbatim (Q-DI-01, F-DI-20). | Text only (I-DI-01); no computed value, golden data or test changes; M-DI-01 records the difference as intended. | open |
| E-DI-02 | text | Details: "For a car starting at (0, 0, 0), define the switching time as τ …" | The formulas that follow (and the code and every picture: `drawCar[{0, 0}, π/2, …]`) are for a car starting at the origin heading **up**, (0, 0, π/2); for heading 0 they would be rotated by −90°. | Shows the text as in the original (F-DI-20, N-DI-05). | Text only ("(0, 0, π/2)"); no test changes. | open |
| E-DI-03 | text | Details: "The minimum turning radius circles are drawn tangent to the starting and ending positions with gray dashed circles." | Only the two circles at the start are drawn (`{Dashed, Gray, Circle[{r, 0}, r], Circle[{-r, 0}, r]}`); there are no circles at the end position (the sentence comes from the Dubins path Demonstration, which draws both). | Shows the text as in the original (F-DI-20); draws the two start circles. | Text only ("tangent to the starting position"); no test changes. | open |
| E-DI-04 | numerical | `polySteps = If[t < 10, 0.05, 0.02] If[r < 1, r^2, 1]` with `Table[mRS[s, t, r], {s, 0, 1, polySteps}]` (and the descending tables `{s, 1, 0, -polySteps}`) for the grey band of the "=" picture | When 1/polySteps is not a whole number (every r < 1 except a few), the tables stop before the curve ends: e.g. r 0.7, t 5: step 0.024499999999999997, 41 values, ascending chains end at s = 0.98, descending ones at 0.02. The band then misses the last 2 % of each isochron and its corners are closed by straight chords, so the grey area no longer matches the curves it is meant to fill. | Keeps it (Q-DI-03). | Ending each table exactly at s = 1 (or 0) (I-DI-03) changes the band only for r < 1: unit "Table iterator with a step that does not divide 1 stops short of the end", H-DI-11…13 (polygon points) and M-DI-07 change; the saved state and the snapshots (r = 2) stay. Possible as an option. | open |
