# Design document: Configuration Space for Four-Bar Linkage

| | |
|---|---|
| Code version: | 0.1.24 |
| Document revision | 3 (2026-10-18) — harness run 2 evaluated (K-FB-02/03 resolved, P-FB-01/02 proposed) |
| Status | describes the app as implemented; changes go through *Proposed changes* (§8) and [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md) |
| Original | Wolfram Demonstrations Project, "Configuration Space for Four-Bar Linkage", contributed by Aaron T. Becker and Shiva Shahrokhi, published 2018-01-11 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/ConfigurationSpaceForFourBarLinkage/>. Readable source: `docs/original-source/four-bar-linkage.txt`; snapshots: `docs/original-snapshots/four-bar-linkage-1.png` … `-4.png` (the extraction's pictures 5 and 6 are the Wolfram logo); golden data (`tests/golden/four-bar-linkage.original-states.json`, COMMON-DECISIONS §1): the live state, the Settings of the four snapshot cells (raw notebook lines 4030, 6009, 7933, 9769, each with `pvals`, `plot`, `pnear`, `p`, `spacing`, `links`) and the initial settings |
| Port files | `demos/four-bar-linkage/fourbar.js` (Φpos, Φneg, mod2pi, the impossible-length test, the sampler that stands in for `Plot` + `EvaluationMonitor`, the replay table, `Nearest`, the linkage geometry, the two pictures as `shared/graphics.js` data, one evaluation of the Manipulate body; pure), `main.js` (the Manipulate on `shared/manipulate.js`: controls, the locator, the pictures' options; v0.1.21), `index.html`, `recorded-samples.json` (the original's samples of the four stored settings, CC BY-NC-SA, §6.3); shared: `shared/ui.js` slider with `steps: 'mma'`, `shared/ui-interval.js` `addIntervalSlider` (new, owned by this app, COMMON-DECISIONS §6), `shared/svg-frame.js` (frame, ticks, axes; owner distance-norms), `demos/common/arrow-arcs.js` (`bsplineCurve`, `tableStep`, `myArrowArc`; owner two-link-kinematics) |
| Role in the project | further demonstration (batch A) |

## 1. Purpose and background

A planar four-bar linkage: two ground pivots L<sub>4</sub> apart, a crank L<sub>1</sub> at angle θ on the left pivot, a
rocker L<sub>3</sub> at angle φ on the right pivot, and a coupler L<sub>2</sub> joining their tips. The closed chain
leaves one degree of freedom (Grübler's formula, Details), so the configuration space projected onto (θ, φ) is a
curve: φ = arctan(α, β) ± arccos(γ/√(α² + β²)) with α = 2L<sub>3</sub>L<sub>4</sub> − 2L<sub>1</sub>L<sub>3</sub> cos θ,
β = −2L<sub>1</sub>L<sub>3</sub> sin θ, γ = L<sub>2</sub>² − L<sub>4</sub>² − L<sub>3</sub>² − L<sub>1</sub>² +
2L<sub>1</sub>L<sub>4</sub> cos θ (Lynch and Park, *Modern Robotics*, 2017). The left graphic plots both branches over
θ ∈ [−π, π]; the user drags a point in it and the linkage on the right takes the sampled configuration nearest to
the point. A slider sets the separation L<sub>4</sub>, an interval slider the three link lengths (L<sub>1</sub> +
L<sub>2</sub> + L<sub>3</sub> = 2.5). Impossible lengths give a red message instead of a curve.

## 2. Scope

In scope: the original's controls (separation slider, link-length interval slider, the invisible locator), Φpos/Φneg,
mod2pi, the impossible-length test with its Piecewise, the configuration-space sampling with the record structure of
`EvaluationMonitor`, the snapping to the nearest sample, the cache of the samples, both graphics, and the original's
quirks (§7).
Out of scope (would need a design entry first): coupler curves, animation of the crank, more links, numeric readouts,
other projections of the configuration space.

## 3. Users and use cases

| ID | User | Use case |
|----|------|----------|
| UC-FB-01 | student | drag the point along the configuration-space curve and watch the linkage move through its configurations |
| UC-FB-02 | student | change the link lengths and the separation and see how the curve changes (Grashof cranks, rockers, bifurcations, impossible lengths) |
| UC-FB-03 | student | connect the two branches of φ (blue and orange) with the two assembly modes of the linkage |
| UC-FB-04 | tester | compare the port with the original's saved state, snapshots and the Mathematica harness |

## 4. Features

Verification references `golden "four-bar: harness H-FB-nn"` name the golden tests that compare the port with the
Mathematica harness record of scenario H-FB-nn (`tests/harness/four-bar-linkage.scenarios.json`, TESTPLAN); they skip
with the reason "no harness data (owner run pending)" until `tests/golden/four-bar-linkage.harness.json` exists. They
replay the harness's own samples into the port, so everything downstream of `Plot` is compared bit for bit.

### 4.1 Controls

| ID | Feature | Reason | Since | Verified by |
|----|---------|--------|-------|-------------|
| F-FB-01 | Separation slider `{{spacing, 0.75, Row[{"separation (", Subscript[Style["L", Italic], 4], ")"}]}, 0, 1.5, .05, ImageSize -> 180, Appearance -> "Labeled"}`: 0 … 1.5, step 0.05, default 0.75, value field and ⊕ animation panel; slider values are 0 + k·0.05 (`shared/ui.js` `steps: 'mma'`; K-FB-06) | sets L<sub>4</sub> (UC-FB-02) | v0.1.15 | e2e "four-bar: has the controls of the original with their defaults: separation 0.75 and link lengths {1.35, 2}"; e2e "four-bar: moving the separation slider redraws the curve and the base"; unit "slider values are min + k step: separation 0.15 is 0.15000000000000002" |
| F-FB-02 | Link-length interval slider `{{links, {1.35, 2}, Row[{"link lengths (", L1, ",", L2, ",", L3, ")"}]}, 0, 2.49, 0.05, ControlType -> IntervalSlider, Method -> "Push", MinIntervalSize -> 0.1, Appearance -> "Labeled", ImageSize -> {300, 20}}`: two thumbs on 0 … 2.49 in steps of 0.05, at least 0.1 apart, a thumb pushed by the other (Push), the value shown as "{1.35, 2}" to the right (exact 2 without a decimal point until moved); control: `shared/ui-interval.js` | sets L<sub>1</sub> = links<sub>1</sub>, L<sub>2</sub> = links<sub>2</sub> − links<sub>1</sub>, L<sub>3</sub> = 2.5 − links<sub>2</sub> (UC-FB-02) | v0.1.15 | e2e "four-bar: has the controls of the original with their defaults: separation 0.75 and link lengths {1.35, 2}"; e2e "four-bar: dragging a thumb of the link-lengths slider into the other pushes it (Push, MinIntervalSize 0.1)"; unit "IntervalSlider: Push keeps at least 0.1 between the thumbs and stops at 0 and 2.49"; unit "IntervalSlider values are min + k step and the right end gives 2.49"; unit "interval label shows {1.35, 2} at the start and reals with a trailing point after a change"; M-FB-05 |
| F-FB-03 | Locator `{{p, {-.9, -1}}, Locator, Appearance -> None}` (range Automatic): invisible; a press anywhere in the configuration-space plot moves it there and drags it (LocatorPane); it is not snapped (Q-FB-07); the visible glyph is drawn at `pnear` (F-FB-15) | explore the configurations (UC-FB-01) | v0.1.15 | e2e "four-bar: a press in the configuration-space plot snaps the locator glyph to the nearest sample and moves the linkage"; e2e "four-bar: dragging the locator along the curve moves the crank and rocker"; M-FB-04 |
| F-FB-04 | Hidden Manipulate variables `{pnear, None}, {plot, None}, {pvals, None}, {{spacingOld, -1}, None}, {{linksOld, {-1, -1}}, None}`; `ControlPlacement -> Top` | state of the original (sample cache) | v0.1.15 | unit "the cache: changing only p does not resample, changing spacing or links does"; golden "four-bar: harness H-FB-17" |

### 4.2 Model (`fourbar.js`)

| ID | Feature | Reason | Since | Verified by |
|----|---------|--------|-------|-------------|
| F-FB-05 | `lenlengths = {links[[1]], links[[2]] - links[[1]], 2.5 - links[[2]], spacing}` (defaults 1.35, 0.6499999999999999, 0.5, 0.75) | the four lengths | v0.1.15 | unit "lenlengths: L1 = links1, L2 = links2 - links1, L3 = 2.5 - links2, L4 = spacing" |
| F-FB-06 | `Φpos[θ, l]`, `Φneg[θ, l]` as written: `α = 2 l3 l4 - 2 l1 l3 Cos[θ]`, `β = -2 l1 l3 Sin[θ]`, `γ = l2^2 - l4^2 - l3^2 - l1^2 + 2 l1 l4 Cos[θ]`, `φ = mod2pi[ArcTan[α, β] ± ArcCos[γ/Sqrt[α^2 + β^2]]]`, `If[φ == -π, φ = π]`, result `Null` when `γ^2 >= α^2 + β^2` | the loop-closure equation (Details) | v0.1.15 | unit "Phipos and Phineg close the loop: the coupler length is L2 for every returned angle"; unit "Phipos and Phineg are Null exactly where gamma^2 >= alpha^2 + beta^2"; unit "a result within tolerance of -pi becomes exactly pi"; golden "four-bar: Phipos and Phineg reproduce the 200 saved sample values"; golden "four-bar: Phipos and Phineg reproduce the snapshot samples of settings 2, 3 and 4" |
| F-FB-07 | `mod2pi[θ] := ArcTan[Cos[θ], Sin[θ]]` — the second definition in the notebook, the one stored in the Manipulate's Initialization (the first, with `Chop`, is overwritten, N-FB-02); applied to φ and, listable, to both coordinates of `p` | wraps angles into (−π, π] | v0.1.15 | unit "mod2pi maps into (-pi, pi]: -pi stays -pi, 3pi/2 becomes -pi/2" |
| F-FB-08 | Impossible lengths: `impossibleLinks = l1 >= l2+l3+l4 ∨ l2 >= l1+l3+l4 ∨ l3 >= l2+l3+l1 ∨ l4 >= l2+l3+l1` (third condition as written, Q-FB-01); then `pnear = Piecewise[{{{0,0}, l1 == l2+l3+l4}, {{π,0}, l2 == l1+l3+l4}, {{π,π}, l3 == l2+l3+l1}, {{0,π}, l4 == l2+l3+l1}}, {π/2, π/2}]`, an empty `Plot[{}, …, Epilog -> {Style[Text[If[pnear == {π/2, π/2}, "invalid link lengths,\nno configuration possible", "only one configuration possible"], {0, 1}], Red, Medium]}]`, `spacingOld = spacing; linksOld = links` | tells the user when no or only one configuration exists | v0.1.15 | unit "impossibleLinks: the four conditions as written, the third never true while L1 + L2 > 0"; unit "Piecewise pnear: {0, 0}, {pi, 0} and {pi/2, pi/2} for the three reachable cases"; unit "invalid lengths give Alpha 0 and the invalid-lengths text, one configuration gives the other text"; e2e "four-bar: invalid link lengths show the red message"; golden "four-bar: harness H-FB-05"; golden "four-bar: harness H-FB-06"; golden "four-bar: harness H-FB-07"; golden "four-bar: harness H-FB-08" |
| F-FB-09 | Sampling with cache: `If[spacingOld != spacing ∨ linksOld != links, {plot, {pvals}} = Reap@Plot[{Φpos[θ, lenlengths], Φneg[θ, lenlengths]}, {θ, -π, π}, …, EvaluationMonitor :> Sow[{{θ, Φpos[θ, lenlengths]}, {θ, Φneg[θ, lenlengths]}}]]; spacingOld = spacing; linksOld = links]`. Outside the four recorded settings (§6.3) the port replaces `Plot` by its own sampler (D-FB-01) that produces the same record structure: one record `{{θ, Φpos}, {θ, Φneg}}` per evaluation, the evaluations of curve 1 (Φpos) first, then those of curve 2, only real results recorded; a run without records leaves `plot` and `pvals` unchanged (`Set` of `{plot, {pvals}}` to `{g, {}}` fails, K-FB-03) | the configuration-space curve and the snapping targets | v0.1.15 | unit "the sampler records both functions at every evaluated theta, curve 1 first, real results only"; unit "the sampler finds the domain edges within 2e-3 inside the true boundary"; unit "the sampler gives 40 to 60 evaluations per curve and a largest gap of at most 0.27 at the defaults"; unit "the sampler splits the curves at gaps: two loops for links {0.55, 0.7} and separation 1.45"; unit "Grashof crank: samples cover the whole range -pi to pi"; unit "no configuration at all: no records, plot and pvals keep their previous values"; unit "the cache: changing only p does not resample, changing spacing or links does"; golden "four-bar: the saved samples lie inside the true domain and reach within 6e-4 of its edges"; golden "four-bar: snapshot 2 records 1 to 25 are Plot's initial grid with its offsets"; golden "four-bar: each snapshot plot has two Lines and no exclusion segments"; golden "four-bar: harness H-FB-20"; golden "four-bar: harness H-FB-01"; golden "four-bar: harness H-FB-09"; golden "four-bar: harness H-FB-11"; golden "four-bar: harness H-FB-13"; golden "four-bar: harness H-FB-14" |
| F-FB-10 | Snapping `pnear = First@Nearest[Flatten[pvals, 1], mod2pi[p]]` (Euclidean in (θ, φ), no wrap-around, Q-FB-04; ties: first in record order, K-FB-04); `{θv, φv} = pnear` | the linkage takes a sampled configuration (UC-FB-01) | v0.1.15 | unit "Nearest: Euclidean, no wrap-around, first of equally near in record order"; golden "four-bar: First@Nearest of the saved pvals at mod2pi of {-0.9, -1} is the saved pnear"; golden "four-bar: First@Nearest at mod2pi of p gives the saved pnear in snapshots 2, 3 and 4"; golden "four-bar: harness H-FB-15"; golden "four-bar: harness H-FB-16"; golden "four-bar: harness H-FB-19" |
| F-FB-11 | Coupler angle `α = If[impossibleLinks ∧ pnear == {π/2, π/2}, 0, ArcTan[l3 Cos[φv] - l1 Cos[θv] + spacing, l3 Sin[φv] - l1 Sin[θv]]]` | direction of the coupler from the crank tip | v0.1.15 | unit "Alpha points the coupler from the crank tip to the rocker tip (default 1.3066234498934552)"; unit "invalid lengths give Alpha 0 and the invalid-lengths text, one configuration gives the other text" |
| F-FB-12 | Numerics: tolerant `==`, `>=`, `!=`; for the values computed inside `Plot` (the sampled Φpos, Φneg) the empirical rule of §6.4 — `Times` of several numbers in ascending (canonical) order, `Plus` in written order, `a/b` = `a·(1/b)` — which with correctly rounded functions reproduces 200/200, 160/160, 260/260 and 203/206 stored values; the body's own arithmetic in written (nested) order (K-FB-05); `ArcTan` from `shared/mma-exact.js` | same numbers as the original | v0.1.15 | golden "four-bar: Phipos and Phineg reproduce the 200 saved sample values"; golden "four-bar: Phipos and Phineg reproduce the snapshot samples of settings 2, 3 and 4"; golden "four-bar: Plus in written order: 203 of 206 snapshot-2 values, ascending order only 188"; unit "Times multiplies in ascending order: 2 l1 l4 Cos(theta) at theta -0.7935945728098851 is 1.4201068987776944" |
| F-FB-13 | Initial values and one evaluation of the body per change. The live state = the initial settings (the output cell's stored `"Variables"`/`Specifications` = snapshot 1's Settings) hold `p` {−0.9, −1}, `spacing` 0.75, `links` {1.35, 2}, the saved `pvals` (100 records), `plot`, `pnear` (−0.8877458382200738, −0.9960977669686768), `spacingOld` 0.75 and `linksOld` {1.35, 2}, so the opening (and Manipulate's Initial Settings) shows the saved samples without a new `Plot` (§6.3); `spacingOld` −1 and `linksOld` {−1, −1} are only the Input cell's values. The port replays the original's samples for the four stored settings | same opening picture as the original | v0.1.15 | golden "four-bar: the saved state is the state after the first evaluation of the initial settings"; golden "four-bar: the saved plot lines are the sorted sample points of each curve"; golden "four-bar: First@Nearest at mod2pi of p gives the saved pnear in snapshots 2, 3 and 4"; e2e "four-bar: loads without errors and draws the configuration space and the linkage" |

### 4.3 Graphics (SVG)

| ID | Feature | Reason | Since | Verified by |
|----|---------|--------|-------|-------------|
| F-FB-14 | Configuration-space plot: `PlotStyle -> Thick`, curve 1 (Φpos) RGBColor[0.368417, 0.506779, 0.709798], curve 2 (Φneg) RGBColor[0.880722, 0.611041, 0.142051] (the saved plot's colours), each drawn through its own samples in θ order and split only where no value exists (wrap-around jumps give the "spurious" vertical lines, Q-FB-03); `AxesLabel -> {"θ", "φ"}`, `AxesOrigin -> {0, 0}`, automatic ticks (−3 … 3, minor ticks), `PlotRange -> {{-π, π}, {-π, π}}`, `PlotRangePadding -> {{0, 0}, {0, 0}}` (saved plot), `AspectRatio -> 1`, `ImageSize -> 300`, `PlotLabel -> "configuration space"` | the configuration space (UC-FB-01, UC-FB-03) | v0.1.15 | e2e "four-bar: loads without errors and draws the configuration space and the linkage"; golden "four-bar: snapshot 2 shows the phi = pi branch and vertical lines at theta near -pi and 0"; golden "four-bar: snapshot 3 has its curve inside abs(theta) < 0.6536"; golden "four-bar: snapshot 4 has its bifurcation at (0, 0) and its curve inside abs(theta) < 1.3086"; M-FB-02; M-FB-03 |
| F-FB-15 | `Show[plot, Graphics[{Locator[pnear]}]]`: the default locator glyph at `pnear` — itself a `Locator` primitive, which Mathematica lets the user drag (K-FB-12) | shows the snapped configuration | v0.1.15 | e2e "four-bar: a press in the configuration-space plot snaps the locator glyph to the nearest sample and moves the linkage"; golden "four-bar: snapshot 1 shows the default curve, the locator glyph at (-0.89, -1.0) and the crank at about -51 degrees"; M-FB-04 |
| F-FB-16 | Impossible case: empty axes with the red `Medium` text at {0, 1} ("invalid link lengths," / "no configuration possible" on two lines, or "only one configuration possible"), the glyph at `pnear` | feedback for impossible lengths | v0.1.15 | e2e "four-bar: invalid link lengths show the red message"; golden "four-bar: harness H-FB-08" |
| F-FB-17 | Linkage graphic, in the original's order, all filled shapes with `EdgeForm[Directive[Thin, Black]]`: Brown pivots `Rectangle[{-.1, -.4}, {.1, .1}, RoundingRadius -> .1]` and at `spacing`, ground bar `Rectangle[{-.2, -.42}, {spacing + .2, -.3}]`; crank `{Darker[Gray], Rotate[Rectangle[{-w, -w}, {l1 + w, w}, RoundingRadius -> w], θv, {0, 0}]}` (w = .07); rocker `{Gray, Rotate[Rectangle[{spacing - w2, -w2}, {spacing + l3 + w2, w2}, RoundingRadius -> w2], φv, {spacing, 0}]}` (w2 = .05); coupler `{Lighter[Gray], CapForm["Round"], Thickness[0.02], Line[{B, B + l2 {Cos[α], Sin[α]}}]}`; two `Arrow`s between the pivots at y −.1 and the black "L<sub>4</sub>" at {spacing/2, −.2}; thin reference lines of length l1/2.8 and l3/2.8; Blue: circle of radius l1, crank line, `myArrowArc` of radius l1/3 from 0 to θv, "θ" at (0.1 + l1/3)(cos θv/2, sin θv/2), black "L<sub>1</sub>" at the crank middle; Red: the same for the rocker with "φ" and "L<sub>3</sub>"; Orange: circle of radius l2 around the crank tip, coupler line, black "L<sub>2</sub>" at the coupler middle with offset {−1, −1} | the linkage in the selected configuration (UC-FB-01, UC-FB-03) | v0.1.15 | e2e "four-bar: dragging the locator along the curve moves the crank and rocker"; golden "four-bar: snapshot 1 shows the default curve, the locator glyph at (-0.89, -1.0) and the crank at about -51 degrees"; M-FB-02 |
| F-FB-18 | `myArrowArc[c, r, {start, end}] := If[start == end, Point[c + r {Cos[start], Sin[start]}], Arrow[BSplineCurve[Table[c + r {Cos[t], Sin[t]}, {t, start, end, (end - start)/11}]]]]`: a cubic B-spline with 12 control points (it passes through the first and the last only) and an arrowhead at the end, a point when the angle is 0; implemented by `demos/common/arrow-arcs.js` | angle marks for θ and φ | v0.1.15 | unit "myArrowArc: 12 control points from 0 to the angle, a Point when the angle is 0"; unit "B-spline evaluation: clamped cubic from the first to the last control point" |
| F-FB-19 | Linkage graphic options `ImageSize -> 300, PlotRange -> {{-1.25, 2}, {-1.5, 1.5}}, PlotLabel -> "four‐bar linkage"`; the two graphics side by side (`Row`), stacked on narrow screens (D-FB-08) | as in the original | v0.1.15 | e2e "four-bar: loads without errors and draws the configuration space and the linkage"; M-FB-02; M-GEN-03 |
| F-FB-20 | Title, caption and Details text of the original | explains the Demonstration | v0.1.15 | M-FB-01 |

### 4.4 Port additions

| ID | Feature | Reason | Since | Verified by |
|----|---------|--------|-------|-------------|
| A-FB-01 | "Initial settings" button: controls, locator and samples back to the opening state (the saved samples, F-FB-13 — Mathematica's Initial Settings restore the stored Specifications, which hold them) | stands in for the Manipulate ⊕ menu → Initial Settings | v0.1.15 | e2e "four-bar: Initial settings restores the opening state" |
| A-FB-02 | Arrow keys move the focused locator `p` (0.05, Shift = 0.25); arrow keys, PageUp/PageDown, Home/End on a focused thumb of the interval slider | keyboard access | v0.1.15 | e2e "four-bar: arrow keys move the focused locator (port addition)" |
| A-FB-03 | `window.__demo` automation hook (state, view values, samples, `moveLocator`, `setState`, `worldToClient`, `linkageToClient`) | automated tests | v0.1.15 | e2e "four-bar: a press in the configuration-space plot snaps the locator glyph to the nearest sample and moves the linkage" |
| A-FB-04 | "All demos" link | site navigation | v0.1.15 | inventory; M-GEN-01 |
| A-FB-05 | Credit footer: original title, authors, licence, adaptation notice | required by CC BY-NC-SA 3.0 | v0.1.15 | e2e "attribution on" |
| A-FB-06 | Start-up notice (watchdog, `<noscript>`) when the page cannot start (DEC-22) | a clear message instead of an empty page | v0.1.15 | e2e "start-up notice when" |
| A-FB-07 | standalone bundle (owner rule R-A): `npm run bundle -- four-bar-linkage` builds `dist/four-bar-linkage/` with exactly the files the app imports, the licences, a generated README and a root `index.html` (§6, "Building and deploying this app alone") | anyone can host this one app elsewhere without the rest of the site (owner rule R-A, 2026-10-17) | v0.1.15 | e2e "bundle: four-bar-linkage runs from its own folder" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|-------------|---------|
| `slider-spacing` | F-FB-01 |
| `value-spacing` | F-FB-01 |
| `plus-spacing` | F-FB-01 |
| `play-spacing` | F-FB-01 |
| `stepback-spacing` | F-FB-01 |
| `stepfwd-spacing` | F-FB-01 |
| `islider-links-lo` | F-FB-02, A-FB-02 |
| `islider-links-hi` | F-FB-02, A-FB-02 |
| `locator-p` | F-FB-03, A-FB-02 |
| `reset` | A-FB-01 |
| `crumbs` | A-FB-04 |
| `details` | F-FB-20 |
| `credits` | A-FB-05 |

`islider-links-lo` / `islider-links-hi` are the two thumbs of the interval slider (focusable, `role="slider"`, inside the
container `islider-links`, COMMON-DECISIONS §6);
The value text `value-links` ("{1.35, 2}") is read-only text, not an interactive element, so it is not a row of this
inventory (whether the original's label can be edited is K-FB-10); the e2e tests read it.

## 6. Design

### 6.1 Files and responsibilities

- `fourbar.js` (pure, CC BY-NC-SA): `mod2pi`, `Phipos`, `Phineg` (the original's `Φpos`, `Φneg`) with `loopTerms` and
  `timesAscending` (§6.4), `lenlengthsOf`, `impossibleLinksOf`, `piecewisePnear`, `plotSamples` (the sampler, §6.2,
  parameters `SAMPLER`), `useRecordedSamples` / `recordedSamples` / `plotGrid` (the replay table, §6.3), `plotLines` (the
  curves as polylines), `nearestSample` (via `shared/mma-extra.js` `nearest`), `linkageGeometry` (with `myArrowArc`
  from `demos/common/arrow-arcs.js`), `initialSettings()` (the stored `"Variables"` = live state, with the saved samples),
  `fromSettings(settings)` (a state from stored Settings: the port's plot rebuilt from `pvals`), and
  `evaluate(state, {sampler})` = one evaluation of the Manipulate body returning the new Manipulate variables (`pnear`,
  `plot`, `pvals`, `spacingOld`, `linksOld`) and everything drawn (curve polylines, glyph position, linkage shapes,
  texts); `sampler` lets tests replace `plotSamples` (T-FB-15, harness replays).
- `recorded-samples.json` (app data, CC BY-NC-SA): `grid` (Plot's 25-point initial grid, snapshot 2 records 1–25) and,
  for the live state and snapshots 2–4, `spacing`, `links`, `curve1` (records of curve 1 = points of the stored plot's
  first Line) and `pvals` (the original's records; exact `Pi` written as its double). Extracted from
  `tests/golden/four-bar-linkage.original-states.json`; golden "four-bar: recorded-samples.json holds the pvals of the
  live state and of snapshots 2 to 4" keeps them equal. `main.js` loads it with `fetch` before the first evaluation.
- `main.js` (v0.1.20) is one `Manipulate({…})` call of `shared/manipulate.js`, made after `recorded-samples.json` is
  loaded: the Manipulate variables `{p, spacing, links, pnear, plot, pvals, spacingOld, linksOld}` as Mathematica control
  specs (the hidden `pnear`, `plot`, `pvals`, `spacingOld`, `linksOld`; the locator `p` with range [−π, π]² and
  `Appearance -> None`; the separation slider; the link lengths as `ControlType -> IntervalSlider`, `Method -> "Push"`,
  `MinIntervalSize -> 0.1`, plus the port options `trackPress` and `look: 'mma'`), `body: evaluate` and the options of
  the two pictures of `Row[{…}]` (`graphics` with two entries, containers `cspace` and `linkage` in `index.html`, the
  plot labels as text above each picture). Since v0.1.21 (owner decision D2) `evaluate` returns the two pictures as
  `shared/graphics.js` data in the original's order (`fourbar.js` `cspaceGraphics`, `linkageGraphics`): the
  configuration space (axes as data from `shared/graphics-extras.js` `axesGraphics`, drawn once with `cachedGraphics`;
  the curves in `Clip[…, range, 'fb-clip']`, PlotRangeClipping widened by half the curve width, §6.5; the glyph of
  `Locator[pnear]` as data, `locatorGlyph`; the Epilog text as `Text[Column[{…}]]`) and the linkage (rectangles,
  coupler, arrows, labels, circles, arcs). The notched arrowheads (D-FB-04) are `Polygon` data (`notchedArrowhead`;
  `shared/graphics.js` `Arrow` draws a plain triangle); L<sub>k</sub> is `Text[Style[Subscript[Style[L, Italic], k],
  ScriptSizeMultipliers -> "75%", ScriptBaselineShifts -> "0.3em"]]` (the subscript 0.3em down at 75 %), θ and φ
  `Text[Row[{Style[θ, Italic]}]]` — the same elements as the former `Raw` helpers `clipped` and `tspanText` (no `Raw`
  left). The hook keeps its functions
  (`getState`, `view`, `samples`, `moveLocator(p)`, `setState(partial, {linksExact})`, `worldToClient`,
  `linkageToClient`).
- Shared code (COMMON-DECISIONS §3, §6): `shared/ui-interval.js`, owned by this app (first in the build order; MIT),
  `addIntervalSlider(controls, {name, label, min, max, step, steps: 'mma', value: [lo, hi], minIntervalSize, method:
  'Push' | 'Stop' | 'Free', labeled, barDrag, trackPress, onInput})` — a track with two thumbs (`role="slider"`, pointer
  and keyboard), values min + k·step with the right end = max, Push or Stop behaviour, with `labeled` the label
  "{lo, hi}" formatted with `mmaNumberString` (exact integers without a point); test ids `islider-<name>` (container),
  `islider-<name>-lo` and `islider-<name>-hi` (the thumbs), `value-<name>` (the shown values). v0.1.15 adds the option
  `trackPress` (default off, so manipulator-workspaces is unchanged): a press on the track away from the thumbs moves the
  nearer thumb there and drags it (D-FB-05). `demos/common/arrow-arcs.js` (`bsplineCurve`, `tableStep`, `myArrowArc`;
  owner two-link-kinematics): this app's `myArrowArc` definition (11 steps, `Point` when start == end) matches the
  shared one, checked by T-FB-18.

### 6.2 The sampler (stands in for `Plot` with `EvaluationMonitor`; main fidelity risk)

What the original does, read from its four stored sample sets (live state = snapshot 1: 100 records; snapshots 2, 3,
4: 103, 80, 130 records, raw notebook lines 6009, 7933, 9769) and their stored plots:

- `Plot` evaluates the two functions separately: in the default records 1–50 are curve 1's evaluations, 51–100 curve
  2's (snapshots: 53 + 50, 40 + 40, 68 + 62); every record holds θ and both Φpos(θ) and Φneg(θ); each curve's `Line`
  is exactly the sorted (θ, φ) points of its own records (golden test). Each stored plot is two `Line`s, no exclusion
  segments.
- No stored record holds `Null`, and none lies outside the valid θ range (default |θ| < 1.0184438111156382) (K-FB-01).
- The initial grid is the same in every call: snapshot 2 (a Grashof setting, valid almost everywhere) starts with all
  25 grid points −π + kπ/12, k = 0 … 24, with fixed offsets — k = 0 and 24 are ±3.141592391790405 (2.6e-7 inside ±π),
  the interior offsets lie between −0.0190 and +0.0104 and never give exactly 0; k = 9 … 15 are bit for bit the default's
  first seven records. The full list is in `ref/fb_snapshots.out`.
- Then midpoints level by level (breadth first); the finest interior spacing is 1/8 of the grid spacing (3 levels) in
  all four sets — the gaps of 0.010–0.012 in snapshots 3 and 4 are the gaps next to the extreme (edge) records, every
  interior gap is ≥ 0.031 (checked when implementing, v0.1.15); flat intervals stay unrefined (largest gaps 0.25–0.27).
- The extreme records lie 3.4e-4 … 1.6e-3 inside the exact domain boundary (default: 4.6e-4 and 5.4e-4, one grid
  interval halved about 9 times) and are recorded last; intermediate bisection points are not recorded.

The port's `plotSamples(lenlengths)` (PORT DEVIATION D-FB-01) follows that structure, per curve, curve 1 first:
(1) the recorded 25-point grid with Mathematica's offsets (from snapshot 2; H-FB-11 re-checks it in 15.0.1) — no
interior grid point is exactly 0 or ±π, so a bifurcation at θ = 0 does not split the curve (snapshot 2 shows the
vertical line there); (2) a record for every evaluation with a real value; (3) breadth-first halving of the intervals
between consecutive grid points, at most 3 levels (`SAMPLER.MAX_LEVELS`), where the curve's polyline turns by more than
2° (`SAMPLER.TURN_DEG`; in plot units, both axes 2π wide) at an end of the interval, the end of a polyline piece
counting as a bend, so intervals next to a Null point are always refined (D-FB-09: the draft's 6 levels and first
threshold 10° do not fit the stored records); (4) for each grid interval with one real and one Null end, 9 bisection steps and one record for
the last real point; (5) curves drawn per curve through its own records sorted by θ, split where a grid point or
bisection shows no value. The port's samples are not expected to equal Mathematica's outside the recorded settings;
the tests compare coverage, density and the edges with the stored and harness records (T-FB-10 … T-FB-15), and
everything downstream of the samples (Nearest, angles, drawing) is tested bit for bit with replayed original samples.
A table of recorded samples for all slider settings would make the sampling exact (I-FB-01). Measured against the four
recorded sets (v0.1.15): 46/47, 51/49, 38/37 and 62/59 records per curve (original 50/50, 53/50, 40/40, 68/62), 80–90 %
of the port's θ values bit-identical with the original's (the halving `a + (b − a)·0.5` reproduces Plot's midpoints),
edges 2.6e-4 … 6e-4 inside the true boundary (original 3.4e-4 … 1.6e-3).

### 6.3 Opening state and replay of recorded samples

The live state and the initial settings (the output cell's stored `"Variables"`/`Specifications`, identical to snapshot 1's Settings) hold the saved
`pvals`, `plot`, `pnear`, `spacingOld` 0.75 and `linksOld` {1.35, 2}; the original therefore opens — and returns on
Manipulate's Initial Settings — with the saved samples and without a new `Plot` (`spacingOld` −1 / `linksOld` {−1, −1}
are only the Input cell's values). The port ships the original's samples of the four stored settings
(`recorded-samples.json`, from the notebook, CC BY-NC-SA) and uses them whenever (`spacing`, `links`) equals one of them
— (0.75, {1.35, 2}), (0.5, {1., 2.}), (1.35, {1.55, 2.1}), (0.9, {1.2000000000000002, 1.7000000000000002}), all
reachable with the `steps: 'mma'` sliders — so the opening picture and the three snapshot settings are the original's
bit for bit, including `pnear` for the stored `p`. For any other setting `plotSamples` runs. Whether Mathematica
15.0.1 reproduces the 2018 samples (version stability of `Plot`) is K-FB-02 (H-FB-01 … H-FB-04).

### 6.4 Numerics

- Values computed inside `Plot` (Φpos, Φneg at the sample points) are reproduced bit for bit by an empirical rule:
  `Times` of more than two numbers multiplies in canonical (ascending) order, `Plus` adds in written order, `a/b` =
  `a·(1/b)` (`γ/Sqrt[…]` = γ·(1/√…)), with correctly rounded Cos, Sin, ArcCos, ArcTan (Python/mpmath): 200/200 (live),
  160/160 (snapshot 3), 260/260 (snapshot 4), 203/206 (snapshot 2: 5 ulps at θ 1.5682884704754614, 1 ulp at θ
  −0.6574695454531441, unexplained). Written-order products give only 102–111 of 200; ascending `Plus` gives 188/206.
  Example: `((2 l1) l4) Cos[θ]` at θ = −0.7935945728098851 (c = 0.7013…) is ((c·0.75)·1.35)·2 = 1.4201068987776944,
  the written order gives 1.4201068987776946. Scripts: `ref/fb_numerics.py`, `ref/fb_snapshots.py`.
- The stored Initialization prints these products nested (`((2 l1) l4) Cos[θ]`), so the ascending rule is a fit for
  `Plot`'s evaluations only and is NOT applied to the body's own arithmetic (coupler angle, label positions, shapes),
  which follows the written order (COMMON-DECISIONS §4, K-FB-05).
- JavaScript's `Math.cos`, `Math.sin`, `Math.acos` are not correctly rounded (V8: 3, 7 and 8 of 100 differ in the last
  bit on these inputs); in Node 22 the port formulas give 176/200, 198/206, 141/160 and 225/260 bit for bit, at most
  2.7e-15 off elsewhere (`ref/fb_numerics_node.mjs`, `ref/fb_snapshots_node.mjs`). Browsers differ among themselves
  here (D-FB-02). `ArcTan` is `shared/mma-exact.js` `arcTan` (correctly rounded, no −0).
- `If[φ == -π, φ = π]`: tolerant equality, exact π afterwards (a machine `Math.PI` in the port); snapshot 2 holds 57
  such exact `Pi` values.
- Slider values: separation 0 + k·0.05 (k integer), link lengths likewise with the right end = 2.49 (`steps: 'mma'`,
  K-FB-06); the stored snapshot values (0.5, 1.35, 0.9, {1.2000000000000002, 1.7000000000000002}) are such values. The
  default `links` {1.35, 2} keeps an exact 2 in the label only (the arithmetic is the same).
- `mod2pi[p]`: machine arithmetic; the default p {−0.9, −1} gives {−0.9, −1.0} (in Mathematica the exact −1 stays
  exact; same number, D-FB-03).

### 6.5 Drawing

Plot styling from the stored plots (colours, `Thick`, zero padding); frame, axes and ticks from `shared/svg-frame.js`;
`Thick` ≈ 2.5 px and `Medium` text ≈ 12 px at ImageSize 300 (to be checked against snapshot 1, D-FB-04). Rounded
rectangles as SVG `rect` with `rx`, rotated about the pivots; `Thickness[0.02]` of the plot width for the coupler;
`Arrow` heads as filled triangles; `BSplineCurve` evaluated as a clamped uniform cubic B-spline (Mathematica's default
`SplineDegree` 3, `demos/common/arrow-arcs.js` `bsplineCurve`) and drawn as a polyline with the head at the end;
subscripted labels as `<tspan>`; the second graphic (the linkage) has no padding and is cut exactly at its plot range
(D-FB-10; circles are cut, as in the snapshots); the configuration-space curves are clipped at their plot range widened
by half the curve width (1.2 px), so that curves on φ = ±π are drawn at full width as in the snapshots instead of
being cut in half.
Implemented sizes (D-FB-04): curves 2.4 px (`Thickness[Large]` of the stored plot at ImageSize 300), `Medium` text
12 px, default arrowheads about 0.0215 of the image width (6.5 px), `Thin` 0.5 px, the default locator glyph of
`shared/svg-plot.js`. The linkage graphic has an explicit `PlotRange` and therefore no padding: it is cut exactly at the
plot range (D-FB-10; the draft assumed the default 2 % padding). The configuration-space picture leaves margins for the
tick labels and the axes labels θ and φ (`shared/svg-frame.js` `frameLayout`); the plot labels "configuration space"
and "four‐bar linkage" are text above each picture.

### 6.6 Building and deploying this app alone

Owner rule R-A (2026-10-17): this one app can be taken out of the repository and hosted anywhere.

- Command, in the repository folder: `npm run bundle -- four-bar-linkage` → `dist/four-bar-linkage/` (with `--zip` also
  `dist/four-bar-linkage.zip`). `tools/bundle-app.mjs` follows every file the page loads (HTML, static imports, the
  literal `fetch('./recorded-samples.json')`, stylesheets) and copies exactly those, keeping the repository's layout.
- Contents (generated with `npm run bundle -- --update-docs`; unit "bundle contents listed in DESIGN.md match the
  collector" keeps the table current):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/four-bar-linkage/`) | 4 | `fourbar.js`, `index.html`, `main.js`, `recorded-samples.json` |
| `shared/` | 15 | `graphics-extras.js`, `graphics.js`, `manipulate.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `mma.js`, `random.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `ui-extra.js`, `ui-interval.js`, `ui.js` |
| `demos/common/` | 2 | `arrow-arcs.js`, `prm-core.js` |
| added by the bundler | 7 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/four-bar-linkage/DESIGN.md` |
<!-- bundle-contents:end -->

- Added files: `index.html` opens the app (the app's "All demos" link, `../../index.html`, leads back to it), a
  generated `README.md` (title, the credits of the footer, licence summary, how to serve and test), `.nojekyll`, this
  document, `LICENSE.md` and the `LICENSES/` texts of the SPDX identifiers found in the copied files.
- Requirements: any static web server (the app fetches `recorded-samples.json`, so `file://` does not work); a current
  browser with ES modules (Firefox, Chromium, WebKit); no WebGL (SVG only).
- Checked by e2e "bundle: four-bar-linkage runs from its own folder" (A-FB-07, `tests/e2e/bundle.spec.js`): the bundle
  folder alone is served, its root page must open the app, the app must start without page errors, every request must
  stay inside the folder and succeed, and every script and stylesheet of the bundle must be loaded.

## 7. Deviations (D), quirks kept (Q), known issues and leads (K) and notes (N)

| ID | Kind | Description |
|----|------|-------------|
| Q-FB-01 | quirk kept | The third impossibility condition reads `l3 >= l2 + l3 + l1` (intended `l1 + l2 + l4`); it is true only if l1 + l2 ≤ 0, which the sliders never give (L<sub>2</sub> ≥ 0.1). A too-long L<sub>3</sub> is therefore not reported: e.g. links {0.05, 0.15}, separation 0.75 (L<sub>3</sub> = 2.35 > 0.9) goes to the sampling branch, which finds no configuration (K-FB-03). |
| Q-FB-02 | quirk kept | Piecewise branches {π, π} (same typo) and {0, π} (L<sub>4</sub> ≤ 1.5 < 2.5 = L<sub>1</sub> + L<sub>2</sub> + L<sub>3</sub>) can never be chosen; only {0, 0}, {π, 0} and the default {π/2, π/2} occur. |
| Q-FB-03 | quirk kept | "Vertical lines in the configuration space plot are spurious" (Details): where φ wraps between π and −π the curve's consecutive samples are joined; kept. |
| Q-FB-04 | quirk kept | `Nearest` measures plain Euclidean distance in (θ, φ): near the ±π seams the glyph snaps to a sample on the same side of the seam even when the one across the seam is closer on the torus. |
| Q-FB-05 | quirk kept | The linkage moves only between sampled configurations: in the default the samples are about 0.03 rad apart where the curve bends and up to 0.25 rad where it is straight, so a slow drag makes the linkage jump. |
| Q-FB-06 | quirk kept | `If[φ == -π, φ = π]` turns values within the tolerance of −π into exactly π. |
| Q-FB-07 | quirk kept | The invisible locator `p` stays where it was released; only the glyph sits at `pnear`. After a change of lengths the glyph moves to the sample nearest to the old `p`. |
| Q-FB-08 | quirk kept | `Flatten[pvals, 1]` holds both curves' values at every θ evaluated for either curve, including repeated θ (the grid points of curve 2 repeat those of curve 1); Nearest sees duplicates (harmless). |
| D-FB-01 | deviation (main) | The configuration-space samples come from the port's sampler (§6.2), not from Mathematica's `Plot`, whose refinement rules are internal (its initial grid is known, §6.2). Consequences: for settings other than the four recorded ones, the drawn curves differ slightly in their polyline points and the snapped configurations (`pnear`) differ in their digits and in where the jumps fall. The four stored settings are replayed exactly (§6.3). Measured against the stored and harness records (T-FB-10 … T-FB-15, H-FB-01 … H-FB-20). |
| D-FB-02 | deviation | Elementary functions: the browser's `Math.cos`, `Math.sin`, `Math.acos` instead of correctly rounded ones (Node 22: 176/200, 198/206, 141/160, 225/260 stored values bit for bit, the rest within 2.7e-15); differs between browsers in the last bits. Only the sampled values of non-recorded settings are affected; no visible effect; matters only for exact ties in Nearest (K-FB-04). Fix: I-FB-02. |
| D-FB-03 | deviation | Exact numbers of the original (the integer −1 in p, exact π after Q-FB-06, the exact `{π/2, π/2}`, the integer 2 in links) are machine numbers in the port; same values. The "{1.35, 2}" label is reproduced by keeping a flag for the exact 2 until the slider moves. The separation field: a typed whole number ("1") stays exact and shows without a point, as Mathematica keeps a typed Integer (shared `ui.js` since the review of v0.1.15; before it showed "1."); a dragged value is a machine real ("1."). Since v0.1.17 the cosines and sines of the Piecewise's exact 0 and π are exact in the α formula (Sin[π] = 0, not 1.2e-16), as the record shows (H-FB-06: α = 0 for `pnear` {π, 0}; the port had −4.1e-17); D-FB-11. |
| D-FB-04 | deviation | Look: line widths, `Medium` font, tick lengths and fonts, arrowheads, the locator glyph and the B-spline arcs approximate Mathematica's rendering. |
| D-FB-05 | deviation | The interval slider is the port's own control (track, two thumbs, label), not Mathematica's look; its colours follow snapshot 1 (`shared/ui-interval.js` option `look: 'mma'`: a grey track with a dark outline, white between the thumbs; measured at 2×: outline (109, 109, 109), track (164, 164, 164), about 5 px high), the thumbs are the port's; pressing the track away from the thumbs moves the nearer thumb there (Mathematica's behaviour there is K-FB-10). |
| D-FB-06 | deviation | What counts as one update differs (front end vs one evaluation per animation frame and per key press); the body is idempotent once the samples are cached. |
| D-FB-07 | deviation | Locator picking (shared LocatorPane model): any press in the first graphic moves `p` there; a press within 12 CSS px of `p` grabs it without a jump (port's choice, as D-CP-06). `p` is limited to [−π, π]² (K-FB-07). |
| D-FB-08 | deviation | On narrow screens the two graphics are stacked instead of side by side. |
| D-FB-09 | deviation | Sampler parameters chosen differently from the draft (§6.2): at most 3 halving levels (draft: up to 6) and a 2° turn threshold (draft: first value 10°), with the end of a polyline piece counting as a bend. Reason: the four recorded sets never refine below 1/8 of a grid interval (every interior gap ≥ 0.031), and with 10° the default gave 29 records per curve (original 50) and an unrefined 0.273 gap (T-FB-11 allows 0.27); with the chosen values the record counts are within 10 % of the original's in all four sets. |
| D-FB-10 | deviation | The linkage graphic (explicit `PlotRange -> {{-1.25, 2}, {-1.5, 1.5}}`) is drawn without padding and cut exactly at the plot range, as measured in snapshot 1 (the blue circle of radius 1.35 is cut at x = −1.25); the draft assumed the default 2 % padding. Mathematica does not clip a `Graphics` to its plot range (`PlotRangeClipping` is False), so above the range the original also draws into the band of the plot label (snapshot 3: the blue circle of radius 1.55 passes behind "four‐bar linkage"); the port cuts at the plot range there too. |
| D-FB-11 | deviation | Inside the sampled values the exact π of `If[φ == -π, φ = π]` (snapshot 2 holds 57, the 15.0.1 records 132 of 510 values in H-FB-02) is a machine π in the port, so α computed from such a `pnear` may differ in the last bit (`Sin[π]` is 0 in the original); no recorded scenario captures α at such a sample. The Piecewise's exact angles are handled exactly (D-FB-03). |
| K-FB-01 | lead (resolved for the records) | Does `Plot` evaluate the functions outside the valid range at all, and if so why are such evaluations not in `pvals`? None of the 413 stored records holds `Null`. The port records only real values, as observed. H-FB-01, H-FB-14 (with the `wl:` evaluation log). **Harness run 2 (15.0.1):** none of the 4 421 recorded `pvals` records (13 scenarios) holds `Null`; in H-FB-12 (all values `Null`) `Plot` evaluated the functions (100 `Power::infy` messages) and sowed nothing. So evaluations without a real value are not recorded, as the port does. Whether `Plot` evaluates outside the valid range in general is not shown: the `wl:` evaluation log of H-FB-01/H-FB-09/H-FB-11/H-FB-14 came back empty (N-FB-05). |
| K-FB-02 | lead (resolved: version difference, P-FB-01) | Version stability: does Mathematica 15.0.1's `Plot` produce the same records as the stored 2018 sets? If yes, recorded samples are valid references for every version the owner uses. H-FB-01 (forces a new `Plot` by setting `spacingOld` −1, `linksOld` {−1, −1}; the initial settings alone never resample) and H-FB-02 … H-FB-04 (fresh `Plot` at the three snapshot settings, compared with their stored records). **Resolved by harness run 2 (15.0.1): no.** A fresh `Plot` at the default lengths records 474 samples (232 + 242 points in the two Lines; 2018: 100), at the snapshot settings 255, 463 and 613 (2018: 103, 80, 130) — H-FB-01 … H-FB-04, H-FB-10. The port keeps the 2018 samples at the four recorded settings (the opening state and snapshots 2–4 equal the saved notebook; §6.3); what 15.0.1 draws after a slider move to those settings differs (denser curve, other `pnear`, e.g. H-FB-15: (0.1923349301073989, −2.3858590609174843) against the port's (0.18473107635407357, −2.4147644922571487)). Proposal P-FB-01; the golden tests assert the difference exactly. Everything downstream of the samples (`pnear`, θv, φv, α, the drawn points of both curves) reproduces the 15.0.1 records bit for bit when their samples are replayed. |
| K-FB-03 | known issue (resolved lead, P-FB-02) | No configuration in the sampling branch (Q-FB-01): if `Plot` records nothing, `Reap` returns {g, {}}, the assignment to `{plot, {pvals}}` fails (Set::shape) and both keep their old values, so the old curve stays and the linkage is drawn with the new lengths at the old angles. If `Plot` sows `Null` records instead, `Nearest` gets non-numeric data. The port implements the first reading. H-FB-09, H-FB-10, M-FB-06. **Resolved by harness run 2 (15.0.1):** the second reading is wrong and the first only half right: with no record (H-FB-09: links {0.05, 0.15}; H-FB-12: L<sub>1</sub> = 0 with separation 0) `{plot, {pvals}} = Reap@Plot[…]` gives one `Set::shape` message, assigns `plot` = the new, **empty** `Graphics` and leaves `pvals` (and so `pnear`) unchanged. The original therefore shows an empty configuration-space plot (frame and axes only) with the linkage at the old angles; the port keeps the old curve. Proposal P-FB-02 (visible change); the golden tests assert the recorded empty plot, the stale `pvals` and `pnear`, and the port's difference. |
| K-FB-04 | lead (resolved) | `Nearest` ties: which of several equally near samples `First` takes (port: the first in record order, `shared/mma-extra.js` assumption) and whether Nearest compares exactly. Exact tie available: p = (−1.0179884220375017, −1.6065914498986138) is equidistant (0.02778051000585058) from the two values of record 49 (and their duplicates), the next sample 0.089 away. H-FB-16. **Resolved by harness run 2:** H-FB-16 records `pnear` = (−1.0179884220375017, −1.6343719599044644), the first of the two equally near values of record 49 — the port's rule (first in record order, exact comparison). |
| K-FB-05 | lead (open; harness evidence) | Arithmetic order: inside `Plot`, ascending `Times` and written `Plus` fit the stored values (203/206 vs 188/206 with ascending `Plus`; 3 values of snapshot 2 unexplained); the stored code prints nested products, which written-order evaluation would follow (only 110/200 for the sampled values). Why `Plot`'s evaluations differ is unknown; the body's own arithmetic is assumed to follow the written order (COMMON-DECISIONS §4). The harness captures of `α`, label positions (`%g`) and Φpos at sample points (H-FB-02 … H-FB-04) check both. **Harness run 2 (15.0.1):** the 15.0.1 `Plot` records (fresh samples of H-FB-01 … H-FB-04, H-FB-13, H-FB-14) do not decide it. Among the 1 727 recorded values where written and ascending `Plus` give different doubles, 1 392 fit the written order, 249 the ascending order, 86 neither; but even where the order makes no difference only about half of the values equal the correctly rounded evaluation (H-FB-01: 460 of 948; the 2018 records: 200 of 200), so 15.0.1 (Windows) evaluates these functions with other elementary-function results than the 2018 notebook. α (the body's own arithmetic) is reproduced bit for bit in every scenario, but its three-term sums give the same double in both orders there. The port keeps written `Plus` and ascending `Times` inside `Plot`; the lead stays open (COMMON-DECISIONS §4). |
| K-FB-06 | lead | Slider arithmetic: Mathematica's slider values are min + k·step (robot-singularities, K-RS-06); assumed for the separation and both thumbs. Whether the interval slider's right end is 2.49 or 2.45 (2.49 is off the 0.05 grid) is unknown. M-FB-05, H-FB-18. |
| K-FB-07 | lead | Locator range `Automatic`: is `p` limited to the plot range ±π, and does the locator live only in the first graphic of the `Row`? M-FB-04, H-FB-19. **Harness run 2:** H-FB-19 (p = {4, −4}) records `pnear` (0.01576841755608262, 1.2881185370977353), `mod2pi` of both coordinates as the port; the locator range itself is front-end behaviour (M-FB-04). |
| K-FB-08 | lead | `Table[…, {t, 0, end, end/11}]` gives 12 points if the iterator count rule tolerates rounding (port: `Floor[n + 1e-12]` rule as for `Range`); `BSplineCurve` defaults (degree 3, clamped knots). The harness records the BSplineCurve points in the Graphics. |
| K-FB-09 | lead (resolved) | Exclusions: the four stored plots (default and snapshots 2–4, including the Grashof kite with bifurcations) each consist of two `Line`s with no `ExclusionsStyle -> Directive[Dashed, Thin]` segments. Other settings: H-FB-13, H-FB-14 record the plot primitives. **Resolved by harness run 2:** none of the 15.0.1 plots (H-FB-01 … H-FB-04, H-FB-13 with its two loops, H-FB-14 with the full θ range) contains `Dashing` or other exclusion segments. |
| K-FB-10 | lead | Interval slider details: is the "{…}" label editable, does dragging the bar between the thumbs move both, what happens on a track press, can the right thumb reach 2.49. M-FB-05. |
| K-FB-11 | lead (resolved) | L<sub>1</sub> = 0 with separation 0: α = β = 0 for every θ, `ArcTan[0., 0.]` is evaluated before the `Null` test (messages?); all values `Null`. H-FB-12. **Resolved by harness run 2:** H-FB-12 gives 100 `Power::infy` messages (`1/Sqrt[0.]`), no `ArcTan::indet`, no record, then `Set::shape` as in K-FB-03; α = −0.9960977669686768 from the stale `pnear`. |
| K-FB-12 | lead | The glyph is `Locator[pnear]`, a locator primitive inside the Graphics, which the front end lets the user drag (COMMON-DECISIONS §4). What dragging it does (moves only the glyph until the next evaluation? moves `p`?) is unknown; the port draws a static glyph and every press goes to `p`. M-FB-04. |
| N-FB-01 | note | The Details text numbers its snapshots differently from the published order: its "Snapshot 1 with link lengths [1, 1, 0.5, 0.5]" is the second picture (separation 0.5, links {1., 2.}), its "Snapshot 3 … bifurcation at (0, 0)" the fourth (separation 0.9, links {1.2, 1.7}). It says the more positive φ is drawn orange: in the saved plot curve 1 (Φpos, blue) is often the lower one after mod2pi. |
| N-FB-02 | note | Unused code: the combined `Φ[θ, l]` function and the first `mod2pi` (with `Chop`) are defined in the notebook but are not part of the Manipulate's stored Initialization (`mod2pi` without `Chop` replaced it); not ported. The stored Initialization also sets a global `impossibleLinks = False`, `Attributes[PlotRange] = {ReadProtected}` and `Attributes[Subscript] = {NHoldRest}` (Subscript's default attribute, saved by SaveDefinitions), none with effect on the body (its `impossibleLinks` is a Module local). |
| N-FB-03 | note | The crank angle θ is measured at the left pivot, φ at the right pivot; the coupler is drawn from the crank tip with length L<sub>2</sub> in direction α, which meets the rocker tip because the samples satisfy the loop equation (to rounding). |
| N-FB-04 | note | Snapshots 2–4 store the same invisible locator `p` = {0.9100000000000001, 1.0899999999999999}; their different glyph positions (1.5682884704754614, 0.9232811364269555), (0.6071028938293324, 1.227294095393258), (0.84510449245104, 1.1021600517398067) are the nearest samples of three different curves (First@Nearest reproduces all three). |
| N-FB-05 | note | Harness run 2: the scenarios' `wl:` capture that logs `Plot`'s evaluation points (`AppendTo[log, θ]` inside the `Plot`; H-FB-01, H-FB-09, H-FB-11, H-FB-14) came back `{}` although `Plot` sampled (H-FB-01: 474 records): the log cannot answer where `Plot` evaluates (harness limitation; the golden tests do not use it). `Plot`'s default style in 15.0.1 differs from the 2018 notebook's: curve colours RGBColor[0.24, 0.6, 0.8] and RGBColor[0.95, 0.627, 0.1425] inside `Directive[Opacity[1], …, AbsoluteThickness[2], Thickness[Large]]` and `Annotation` wrappers; the port draws the 2018 colours of the snapshots (D-FB-04). The golden tests read both palettes. |

## 8. Proposed changes

| ID | Status | Requested by / date | Change | Reason | Acceptance criteria |
|----|--------|---------------------|--------|--------|---------------------|
| P-FB-01 | proposed 2026-10-18 (awaiting the owner) | harness run 2 / 2026-10-18 | after a slider move to one of the four recorded settings, use the samples of a fresh 15.0.1 `Plot` (the harness records of H-FB-01 … H-FB-04 in `recorded-samples.json`) instead of the 2018 ones; the opening state (live state = initial settings, no new `Plot`) keeps the saved 100 samples | K-FB-02: 15.0.1 resamples these settings (474, 255, 463, 613 records) and snaps to other samples; the port shows the 2018 curve there | golden "four-bar: harness H-FB-01" … "H-FB-04" and "H-FB-15" compare `pvals` and `pnear` of the port bit for bit with the record (no recorded difference left); the saved-state and snapshot golden tests unchanged (the snapshots are loaded from their Settings, not resampled) |
| P-FB-02 | proposed 2026-10-18 (awaiting the owner) | harness run 2 / 2026-10-18 | when the sampler finds no configuration (too-long L<sub>3</sub>, Q-FB-01; L<sub>1</sub> = 0 with separation 0) draw the configuration-space plot empty (frame, axes and ticks only) and keep `pvals`, `pnear` and the linkage angles | K-FB-03: the original's `{plot, {pvals}} = …` assigns the empty `Graphics` and fails only for `pvals` (Set::shape); the port keeps the old curve | golden "four-bar: harness H-FB-09" and "H-FB-12" assert an empty port plot; unit "no configuration at all: no records, plot and pvals keep their previous values" renamed and changed for the plot; M-FB-06 updated |

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.15 | 2026-10-17 | first implementation, from the design draft approved by the owner on 2026-10-17 (DEC-17; draft of 2026-10-12 with COMMON-DECISIONS §6 and owner rules R-A/R-B/R-C applied). `recorded-samples.json` extracted from the notebook's stored states; `shared/ui-interval.js` (owned by this app) gains the option `trackPress` (D-FB-05). Changes against the draft: harness references written as the golden tests `four-bar: harness H-FB-nn` (the design-docs test accepts only test titles, checklist items, inventory, compare and review); `value-links` removed from the UI inventory (read-only text, not an interactive element); D-FB-09 (sampler parameters) and D-FB-10 (no padding of the linkage graphic) added; §6.2 corrected (all four recorded sets refine 3 levels; the small gaps of snapshots 3 and 4 are edge gaps); A-FB-03 adds `linkageToClient`; review fixes |
| 2 | v0.1.16 | 2026-10-18 | version number only (batch B release); no change to this app |
| 3 | v0.1.17 | 2026-10-18 | harness run 2 (Mathematica 15.0.1) evaluated: α of the impossible branch uses exact Cos/Sin of the Piecewise's 0 and π (H-FB-06; D-FB-03, D-FB-11); K-FB-02, K-FB-03, K-FB-04, K-FB-09, K-FB-11 resolved, K-FB-01 resolved for the records, K-FB-05 and K-FB-07 with evidence; proposals P-FB-01 (15.0.1 samples at the recorded settings) and P-FB-02 (empty plot when nothing is sampled); N-FB-05 (empty `Plot` log, 15.0.1 plot style). Golden harness tests read the 15.0.1 encoding (exact `Pi` as a symbol, the new plot colours, multi-segment Lines) and assert the recorded differences of P-FB-01/P-FB-02 exactly |
| 4 | v0.1.18 | 2026-10-18 | version number only (harness run 3 accepted for manipulability-ellipsoid); no change to this app |
| 5 | v0.1.19 | 2026-10-21 | version number only (shared Manipulate layer added, four apps migrated to it); no change to this app |
| 6 | v0.1.20 | 2026-10-21 | `main.js` rewritten on the shared Manipulate layer (`shared/manipulate.js`, `shared/graphics.js`): control specs in Mathematica's form, the picture as Graphics data; no change to behaviour or picture (all unit, golden and browser tests unchanged and passing; screenshots and Manipulate state identical to v0.1.19 at sample settings) |
| 7 | v0.1.21 | 2026-10-23 | the model builds the picture as `shared/graphics.js` Graphics data (owner decision D2) and the body returns {state, view, graphics}; `main.js` shortened; `Clip`, `Column` text and script-size directives replace the `Raw` parts; the old drawing output frozen in `tests/unit/fixtures/four-bar-linkage-drawing.pre-graphics.json` and tests that read the old format now read the same numbers through `annotations()`/`Cases()`; no change to behaviour or picture (screenshots and Manipulate state identical to v0.1.20 at sample settings) |
| 8 | v0.1.22 | 2026-10-25 | version number; bundle table (`shared/manipulate.js` now also loads `shared/graphics-extras.js` and `shared/svg-frame.js` for the new Graphics options `Axes`/`Frame`/`PlotLabel`); no change to this app's code, behaviour or picture (pixel parity with v0.1.21) |
| 9 | v0.1.23 | 2026-10-25 | version number; the shared code gained plot functions, a geometry kit, 3D text and tube primitives and fixes for new apps (v0.1.23); no change to this app's code, behaviour or picture (pixel and scene parity with v0.1.22) |
| 10 | v0.1.24 | 2026-10-26 | version number; the shared code gained a clock for bodies that read the time, Locator variables that change between one point and a list, sector disks and Opacity on points and text (v0.1.24); no change to this app's code, behaviour or picture (pixel and scene parity with v0.1.23) |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|-------------|---------|-------------|---------|
| I-FB-01 | Tables of `Plot` samples recorded by the harness for every slider setting (31 separations × about 1200 link pairs; θ only, φ recomputed: about 2.3 million doubles, loaded per separation); four settings are already recorded (§6.3) | the curve and the snapping equal the original's for every slider setting | download size (several MB), a long harness run, values typed off the grid still use the sampler | D-FB-01, K-FB-02 |
| I-FB-02 | Correctly rounded `Cos`, `Sin`, `ArcCos` in `shared/mma-exact.js` (double-double, like `arcTan`) | all sample values bit for bit, the same in every browser | more code, slower sampling (still far below a frame) | D-FB-02 |
| I-FB-03 | Report a too-long L<sub>3</sub> like the other impossible cases | no stale curve for impossible lengths | differs from the original | Q-FB-01, K-FB-03 |
| I-FB-04 | Snap on the torus (wrap-around distance) | no far jumps near the seams | differs from the original | Q-FB-04 |
| I-FB-05 | Solve φ for the θ of the locator instead of snapping to samples | smooth motion of the linkage | differs from the original's discrete behaviour | Q-FB-05 |
| I-FB-06 | Split the curves where φ wraps | no spurious vertical lines | differs from the original's picture | Q-FB-03 |

## 11. Errors in the original (conceptual and mathematical)

Owner rule R-C (2026-10-17). Checked: the loop-closure equation by hand — with crank tip A = L<sub>1</sub>(cos θ, sin θ) and
rocker tip B = (L<sub>4</sub>, 0) + L<sub>3</sub>(cos φ, sin φ), ‖A − B‖² = L<sub>2</sub>² expands to α cos φ + β sin φ = γ with exactly
the α, β, γ of `Phipos`/`Phineg` and the Details, solved by φ = atan2(β, α) ± arccos(γ/√(α² + β²)) (`ArcTan[α, β]` is
atan2(β, α): correct); the coupler direction `ArcTan[L3 Cos[φ] - L1 Cos[θ] + spacing, L3 Sin[φ] - L1 Sin[θ]]` (direction
from A to B: correct); the four impossibility conditions and the single-configuration angles {0, 0}, {π, 0}, {π, π},
{0, π} (each checked as the stretched or folded linkage: correct where the conditions are right); Grübler's count
3(4 − 1 − 4) + 4 = 1 (correct); the Details' bifurcation claims against the Grashof change-point condition s + l = p + q
(the kite {1, 1, 0.5, 0.5} and {1.2, 0.5, 0.8, 0.9} are change-point linkages, {1.55, 0.55, 0.4, 1.35} is not: the
claims are right); the colours of the two curves; the quirks Q-FB-01…08.

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|------|-----------------------|--------------------------|--------------------|-------------------------|--------|
| E-FB-01 | mathematical | `impossibleLinks = … ∨ lenlengths[[3]] >= lenlengths[[2]] + lenlengths[[3]] + lenlengths[[1]] ∨ …` and the Piecewise branch `{π, π}` with the same condition | Typo: the third condition must be L<sub>3</sub> ≥ L<sub>1</sub> + L<sub>2</sub> + L<sub>4</sub> (`lenlengths[[4]]`, not `[[3]]`). As written it is true only when L<sub>1</sub> + L<sub>2</sub> ≤ 0, which the sliders never give, so a too-long L<sub>3</sub> is never reported (e.g. links {0.05, 0.15}, separation 0.75: L<sub>3</sub> = 2.35 > 0.9) and the caption's promise "If any link is greater than the sum of the other three links, no valid configurations exist" is not shown; the "only one configuration" case {π, π} can never be chosen. | Keeps it (Q-FB-01, Q-FB-02); with a too-long L<sub>3</sub> the sampling branch finds nothing and the old curve stays (K-FB-03). | With the fix a too-long L<sub>3</sub> shows the red "invalid link lengths, no configuration possible" text and the {π, π} case becomes reachable: unit "impossibleLinks: the four conditions as written, the third never true while L1 + L2 > 0", H-FB-09, H-FB-10 and M-FB-06 change; no saved state has a too-long L<sub>3</sub>, so golden tests stay. Low risk; could be offered as a correction. | open |
| E-FB-02 | mathematical | `If[Gamma^2 >= Alpha^2 + Beta^2, Null, Phip]` (and the same in `Phineg`) | Where γ² = α² + β² the equation has exactly one solution φ = atan2(β, α) (the two branches meet); `>=` drops it. These are the turning points of the curve and the bifurcation points the Details advertise: for the lengths {1, 1, 0.5, 0.5} (Details' "Snapshot 1") θ = 0 gives α = −0.5, β = 0, γ = 0.5, so the valid configuration (0, π) — crank along +x, rocker folded onto the left pivot — is returned as `Null`; `Plot` samples exactly θ = 0 and ±π there and leaves the bifurcation point out. The test should be `>` (with ArcCos's argument clamped to 1, since rounding can push it to 1.0000000000000002). | Keeps it (F-FB-06). | `>` with a clamp adds the boundary samples: unit "Phipos and Phineg are Null exactly where gamma^2 >= alpha^2 + beta^2" (snapshot-2 lengths at θ 0 and ±π), golden "four-bar: snapshot 2 shows the phi = pi branch and vertical lines at theta near -pi and 0", the replayed snapshot-2 records and H-FB-02 change (Mathematica's own `Plot` would then sow these points); the glyph could then sit on the bifurcation. Possible as an option. | open |
| E-FB-03 | text | Details: "The ± sign in the expression for Φ gives two solutions. The more positive solution of Φ is drawn with an orange line, and the more negative solution with a blue line." | The colour follows the sign in the formula, not the size of the value: curve 1 (`Phipos`, the + sign) is `Plot`'s first colour, blue, curve 2 (`Phineg`) orange, and after `mod2pi` either can be the larger one (snapshot 2: blue φ = π for θ < 0, orange φ = π for θ > 0). "Orange = more positive" holds only on parts of some curves (e.g. the opening picture). | Draws the curves as the original (F-FB-14) and shows the text (F-FB-20, N-FB-01). | Text only ("the + solution is drawn blue, the − solution orange"); no test changes. | open |
| E-FB-04 | text | Details: "Snapshot 1 with link lengths [1, 1, 0.5, 0.5] has bifurcations at (0, π), (0, −π), (π, π) and (−π, −π). Snapshot 2 has no bifurcations, and Snapshot 3 with link lengths [0.9, 1.2, 0.5, 0.8] has a bifurcation at (0, 0)." | The snapshot numbers are off by one (these are snapshot pictures 2, 3 and 4; picture 1 is the opening state, N-FB-01), and the two length lists use different orders: [1, 1, 0.5, 0.5] is (L<sub>1</sub>, L<sub>2</sub>, L<sub>3</sub>, L<sub>4</sub>), but [0.9, 1.2, 0.5, 0.8] is (L<sub>4</sub>, L<sub>1</sub>, L<sub>2</sub>, L<sub>3</sub>) — in the first order picture 4 is [1.2, 0.5, 0.8, 0.9]. | Shows the text as in the original (F-FB-20, N-FB-01). | Text only; no test changes. | open |
