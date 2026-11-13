# Design document: Lowpass Filter Design by Pole Placement

| | |
|---|---|
| Code version: | 0.1.40 |
| Document revision | 2 (2026-11-06) — implemented after the owner's "go" (Q-1: the lower plot of even-odd-synthesis at 500 px); compared with the four snapshots |
| Status | describes the app as implemented; changes go through Proposed changes (§8) |
| Original | Wolfram Demonstrations Project, "Lowpass Filter Design by Pole Placement", contributed by Aaron T. Becker, published 2015-12-30 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/LowpassFilterDesignByPolePlacement/> |
| Port files | `model.js` (the poles of the five arrangements, the transfer function and its scaling, the two plots; pure), `main.js` (the Manipulate on `shared/manipulate.js`), `index.html` |
| Role in the project | new demonstration, simple mode (v0.1.33): generator, `shared/wl.js`, `shared/plot.js`, plain arithmetic |

## 1. Purpose and background

An ideal lowpass filter passes every frequency below the cut-off ω_c and none above; it cannot be built because it is
non-causal. A causal filter H(s) = Π 1/(s − p_k) approximates it, and its magnitude response |H(jω)| depends on where
the poles p_k lie in the left half-plane. The Demonstration places n poles in one of four arrangements (on a vertical
line, a "triangle", the Butterworth semicircle, an ellipse) or lets the user drag, add and delete them ("manual"), and
plots the poles beside |H(jω)| (scaled to a maximum of about 1) and the ideal filter.

Source as text: [`docs/original-source/lowpass-filter-design.txt`](../../docs/original-source/lowpass-filter-design.txt); snapshots `docs/original-snapshots/lowpass-filter-design-1…4.png`; saved states `tests/golden/lowpass-filter-design.original-states.json`. The notebook has no initialization cell; everything is inside the Manipulate.

## 2. Scope

In scope: the whole Manipulate (setter bar, two sliders, the invisible auto-created pole locators, the pole plot and the
magnitude plot), caption and Details. Out of scope: nothing.

## 3. Users and use cases

- UC-LF-01: a student compares the arrangements and sees how pole placement shapes the magnitude response.
- UC-LF-02: a student drags, adds or deletes poles in "manual" mode and sees the effect.

## 4. Features

Source: the Manipulate (notebook cell "Manipulate"). The ω_c of the text is 1 in the code.

| ID | Feature | Reason | Since | Verified by |
|----|----|----|----|----|
| F-LF-01 | Setter bar `type` {"vertical line", "triangle", "Butterworth", "elliptical", "manual"}, initially "vertical line" | the arrangement | v0.1.33 | e2e "has its controls with their defaults"; e2e "each type gives its pole arrangement" |
| F-LF-02 | Slider `{{n, 3, Row[{Style["n", Italic], ", number of poles"}]}, 1, 20, 1, Appearance -> "Labeled", Enabled -> If[type == "manual", False, True]}` — the `Enabled` is evaluated once, so the slider is never disabled (Q-LF-01) | the number of poles | v0.1.33 | e2e "has its controls with their defaults" |
| F-LF-03 | Slider `{{α, -1, "α, real component"}, -2, -1/100, Appearance -> "Labeled", Enabled -> …}` (continuous; never disabled, Q-LF-01) | the real part of the poles | v0.1.33 | e2e "has its controls with their defaults" |
| F-LF-04 | Locators `{{p, {{-1, -1}, {-1, 1}}}, Locator, LocatorAutoCreate -> True, Appearance -> None}`: invisible, on the pole plot; in every type but "manual" the body sets p to the computed poles (so a drag springs back); in "manual" the poles are p: drag a pole, add one (Alt/⌘ + click on empty space), delete one (Alt/⌘ + click on it); with none left the body puts one at {α, 0} | manual pole placement | v0.1.33 | e2e "manual: drag, add and delete a pole"; unit "manual mode takes the poles from p"; M-LF-07 |
| F-LF-05 | The pole arrangements, θ = π/n: vertical line {α, imV} with imV = (i − 1) 2/(n − 1) − 1 (0 for n = 1); triangle {α(1 − 0.95 \|imV\|), imV}; Butterworth {cos(π/2 + (i − ½)θ), sin(π/2 + (i − ½)θ)}; elliptical {−α cos(π/2 + (i − ½)θ), sin(π/2 + (i − ½)θ)}; manual: p, and the body sets n = Length[p] and α = Min of the real parts (the sliders follow) | the four designs | v0.1.33 | unit "the poles of each arrangement" |
| F-LF-06 | H(ω) = Π 1/(jω − Re p_k − j Im p_k); scale s = Max[\|H(0)\|, \|H(1)\|, \|H(Im p_⌈n/2⌉)\|]; the plotted magnitude \|H(ω)\|/s | the filter | v0.1.33 | unit "the magnitude response at the snapshot settings" |
| F-LF-07 | Pole plot: `ListPlot[poles, AspectRatio -> 1, PlotRange -> {{-2.1, 0.2}, {-1.1, 1.1}}, PlotMarkers -> {red thick ×, 0.06}, ImageSize -> {220, 350}]` with tick labels −2ω_c, −3/2 ω_c, −ω_c, −1/2 ω_c and ±j ω_c, ±1/2 j ω_c | where the poles are | v0.1.33 | e2e "loads without errors and draws the picture" |
| F-LF-08 | Magnitude plot: `Plot[{HeavisidePi[ω/2], \|H(ω)\|/s}, {ω, -2.5, 2.5}, PlotRange -> All, AxesLabel -> {"ω", \|H(ω)\|}, ImageSize -> {350, 350}, ExclusionsStyle -> Dashed]`: the ideal filter (blue) with dashed jumps at ±ω_c, the filter (orange); ticks ±ω_c, ±2ω_c | the response | v0.1.33 | e2e "loads without errors and draws the picture"; unit "the magnitude response at the snapshot settings" |
| F-LF-09 | The two plots side by side (`Row`), controls on top | layout | v0.1.33 | e2e "loads without errors and draws the picture" |
| F-LF-10 | Opening state type "vertical line", n = 3, α = −1, p = {{−1, −1}, {−1, 1}} (replaced by the three poles at once) | the Manipulate's initial values | v0.1.33 | unit "the opening state"; e2e "has its controls with their defaults" |
| F-LF-11 | The four snapshot settings load and give the original's pictures | parity with the original | v0.1.33 | e2e "the four snapshot settings"; unit "the magnitude response at the snapshot settings" |
| F-LF-12 | Caption and Details text (from the Demonstration) | the original's explanation | v0.1.33 | M-LF-01 |
| A-LF-01 | "Initial settings" button restores the opening state | Manipulate's Initial Settings | v0.1.33 | e2e "Initial settings restores the opening state" |
| A-LF-02 | Test and automation hook `window.__demo` from the Manipulate layer | automated tests | v0.1.33 | e2e "each type gives its pole arrangement" |
| A-LF-03 | Start-up notice when the browser cannot run the page (DEC-22) | no empty page | v0.1.33 | e2e "start-up notice when" |
| A-LF-04 | Breadcrumb link to all demos | navigation | v0.1.33 | inventory |
| A-LF-05 | Credits footer (authors, title, source, licence, adaptation notice) | required by the licence (CC BY-NC-SA 3.0 §4) | v0.1.33 | e2e "attribution on" |
| A-LF-06 | This app can be bundled and served alone (§6.1) | owner rule R-A | v0.1.33 | e2e "bundle: lowpass-filter-design runs from its own folder" |
| A-LF-07 | Landing-page thumbnail `thumbnail.webp` | owner request 2026-11-05 | v0.1.33 | e2e "every card on the landing page has a thumbnail that loads" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|----|----|
| `setter-type-*` | F-LF-01 |
| `*-n` | F-LF-02 |
| `*-α` | F-LF-03 |
| `locator-p-*` | F-LF-04 |
| `reset` | A-LF-01 |
| `crumbs` | A-LF-04 |
| `details` | F-LF-12 |
| `credits` | A-LF-05 |

## 6. Design

- `model.js` (pure): `initialState()`; `polesOf(type, n, α)` (the four arrangements), `poleState(state)` (the body's
  assignments: p = {{α, 0}} when empty, manual n and α, p = the poles otherwise), `absH(poles, ω)` (|H| in closed form,
  Π 1/|jω − p|), `scaleOf(poles, n)`, `peakOf` (for the tests and E-LF-03); `evaluate(state)` → `{ state, view,
  graphics }` with the two plots of `shared/plot.js`: `ListPlot(poles, { PlotMarkers: [cross, 0.06], … })` and
  `Plot([HeavisidePi(ω/2), |H|/s], [-2.5, 2.5], { Exclusions: [-1, 1], ExclusionsStyle: Dashed, … })`; tick labels
  as text expressions (ω_c subscripts; fractions written inline, D-LF-03).
- `main.js`: one `Manipulate({…})` with ControlPlacement Top, two pictures (`Row` of the original: `#graphic`,
  `#graphic2` side by side), the setter bar, the two sliders as written (Enabled left out, Q-LF-01) and the Locator
  list `p` with `{ LocatorAutoCreate: true, Appearance: None }` on picture 0.
- Shared code added for this app (v0.1.33, MIT, opt-in): S-1 Plot `Exclusions`/`ExclusionsStyle`, S-2 ListPlot
  `PlotMarkers`, S-5 `LocatorAutoCreate`, S-6 `HeavisidePi`; and a fix: the locators of a Locator list are made from
  the list after the first evaluation (a body that changes the list's length at once, as here 2 → 3 poles).
- Size: model 78 lines, main 24 lines (the WL Manipulate is 36 lines).

### 6.1 Building and deploying this app alone

Owner rule R-A (2026-10-17): this one app can be taken out of the repository and hosted anywhere.

- Command, in the repository folder: `npm run bundle -- lowpass-filter-design` → `dist/lowpass-filter-design/`.
- Contents (generated with `node tools/bundle-app.mjs lowpass-filter-design --update-docs`):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/lowpass-filter-design/`) | 3 | `index.html`, `main.js`, `model.js` |
| `shared/` | 18 | `clock.js`, `graphics-extras.js`, `graphics.js`, `manipulate.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `mma.js`, `plot.js`, `random.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `ui-extra.js`, `ui-interval.js`, `ui.js`, `wl.js` |
| added by the bundler | 7 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/lowpass-filter-design/DESIGN.md` |
<!-- bundle-contents:end -->

- Checked by e2e "bundle: lowpass-filter-design runs from its own folder" (A-LF-06).

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

| ID | Kind | Description |
|----|------|-------------|
| D-LF-01 | deviation | Mathematica finds the jumps of `HeavisidePi[ω/2]` symbolically (automatic `Exclusions`); the port passes them (ω = ±1) to the shared `Exclusions` option (S-1). |
| D-LF-02 | deviation | Adaptive sampling of \|H\| as in `shared/plot.js` (not Mathematica's sampler); the narrow resonances of "vertical line" with α near 0 may peak slightly differently. |
| Q-LF-01 | quirk kept | `Enabled -> If[type == "manual", False, True]` (and the α slider's) is evaluated once when the Manipulate is built, not dynamically: both sliders stay enabled in every type (snapshot 4: "manual" with both sliders active). Moving them in "manual" or α in "Butterworth" does nothing visible (the body overwrites n and α in "manual"). |
| Q-LF-02 | quirk kept | In every type but "manual" the invisible pole locators are set to the computed poles, so dragging them springs back and Alt-click adds a pole that disappears at once; switching to "manual" starts from the poles of the previous type. |
| Q-LF-03 | quirk kept | In "manual" the n slider shows the number of poles even above its range (more than 20 created) and α the smallest real part, also outside −2 … −1/100 (a pole in the right half-plane). |
| N-LF-01 | note | ω_c = 1 throughout; the tick labels write the multiples of ω_c. |
| D-LF-03 | deviation | Tick labels: Mathematica stacks the fractions (½ ω_c, ³⁄₂ ω_c) in the tick labels; the port writes them inline (1/2 ω_c), the axes' text being plain SVG text. |
| D-LF-04 | deviation | Image padding of the pole plot set by hand ({{34, 8}, {18, 8}} px) for its tick labels; Mathematica computes it. |
| N-LF-02 | note | Snapshot 1's saved Settings hold `type` as the whole list of the setter's values (the Manipulate's short form `{type, {…}}` before a choice was made); the shown value is the first, "vertical line", and the tests map it so. |

## 8. Proposed changes

No open proposal. Template (see [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md)):

| ID | Status | Requested by / date | Change | Reason | Acceptance criteria |
|----|--------|---------------------|--------|--------|---------------------|

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.33 | 2026-11-06 | generated by `tools/new-app.mjs`, then the design written from the notebook (owner request 2026-11-06) |
| 2 | v0.1.33 | 2026-11-06 | implemented after the owner's "go" (2026-11-06); shared additions S-1 … S-7: `shared/plot.js` Exclusions/ExclusionsStyle, PlotMarkers, InterpolationOrder 0; `shared/ui-extra.js` + `shared/manipulate.js` CheckboxBar; `shared/svg-plot.js` + `shared/manipulate.js` LocatorAutoCreate; `shared/wl.js` HeavisidePi; `shared/graphics.js` JoinForm; compared with the four snapshots |
| 3 | v0.1.34 | 2026-11-10 | version number (v0.1.34: the switch "errors of the original: kept \| corrected" for the apps with code-level findings in §11, `shared/errata.js`); no change to this app's code, behaviour or picture |
| 4 | v0.1.35 | 2026-11-11 | version number (v0.1.35: two new apps, paths-inside-a-polygon and voronoi-diagrams; no shared code changed); no change to this app's code, behaviour or picture |
| 5 | v0.1.36 | 2026-11-11 | version number (v0.1.36: the full colour menu of voronoi-diagrams); no change to this app's code, behaviour or picture |
| 6 | v0.1.37 | 2026-11-12 | version number (v0.1.37: thirteen control and signal ports and the shared modules they use; the additions to shared/plot.js, graphics.js and manipulate.js are opt-in); no change to this app's code, behaviour or picture |
| 7 | v0.1.38 | 2026-11-12 | version number (v0.1.38: one new app, forward-kinematics; shared/traditional-form.js is new, and `Lighting -> "Neutral"` in shared/mma-lighting.js and graphics3d-view.js is opt-in); no change to this app's code, behaviour or picture |
| 8 | v0.1.39 | 2026-11-12 | version number (v0.1.39: selective testing — tools/affected.mjs and publish:tested run only the browser tests a change can affect; no app code changed); no change to this app's code, behaviour or picture |
| 9 | v0.1.40 | 2026-11-13 | version number (v0.1.40: three truss ports; shared/truss.js is new; shared/graphics.js gains Mouseover, RotatedText, rounded and line-less Framed, Arrowheads[Large] and heads at given places, Grid alignment at "=", styled scripts and fitPlotRange — the changes to existing drawing are a styled script keeping its style and the baseline after it, and framed or backed labels keeping their outer spaces); no change to this app's code or behaviour |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|-------------|---------|-------------|---------|
| I-LF-01 | Disable the sliders that have no effect (dynamic `Enabled`) | no dead controls | differs from the original | Q-LF-01, E-LF-04 |
| I-LF-02 | Scale by the true maximum of \|H\| on the plotted range | the peak exactly 1 | a numeric search per evaluation | E-LF-03 |
| I-LF-03 | Keep manual poles in conjugate pairs (and warn for right-half-plane poles) | physically meaningful filters | differs from the original | E-LF-05 |

## 11. Errors in the original (conceptual and mathematical)

Checked on 2026-11-06 against the notebook and a numerical probe of |H| (PG-R-26).

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|------|-----------------------|--------------------------|--------------------|-------------------------|--------|
| E-LF-01 | conceptual | type "elliptical" and its Details ("placing poles along an elliptical circumference enables faster roll-off, but introduces ripple") | poles on an ellipse are the Chebyshev (type I) design; an elliptic (Cauer) filter also has zeros on the jω axis and its poles are not on an ellipse — the name and text mix the two | keeps the label "elliptical" | rename to "Chebyshev (ellipse)" in the text | open |
| E-LF-02 | text | Details, "triangle": "real component α(1 − 0.95 Im(p))" | the code uses α(1 − 0.95 \|Im(p)\|); with Im(p) the lower half would lie further left than α | keeps the code (Abs) | the text says \|Im(p)\| | open |
| E-LF-03 | numerical | `s = Max[Abs[Hfilter[0]], Abs[Hfilter[1]], Abs[Hfilter[poles[[Ceiling[n/2], 2]]]]]` | the scale samples three frequencies only; the drawn peak exceeds 1 elsewhere (probe: 1.034 for vertical line, n = 4, α = −0.3; 1.06 in snapshot 4) — the Details say "about 1", which holds | keeps it | I-LF-02 | open |
| E-LF-04 | conceptual | `Enabled -> If[type == "manual", False, True]` without `Dynamic` | the intent (disable n and α in "manual", α in "Butterworth") is not met: the condition is evaluated once (Q-LF-01) | keeps it | `Enabled -> Dynamic[…]` | open |
| E-LF-05 | conceptual | "manual" mode | nothing keeps poles in conjugate pairs or in the left half-plane: an unpaired complex pole gives a filter with complex coefficients (\|H\| not symmetric, snapshot 4), a pole with Re p > 0 an unstable one — both are plotted as if they were valid lowpass filters | keeps it | I-LF-03 | open |
| E-LF-06 | text | Details, "vertical line" and "triangle": "places n poles equally spaced on [along] the imaginary axis between −j ω_c and j ω_c" | the poles lie on the line Re p = α (vertical line) or on the triangle's two sides, not on the imaginary axis; poles on the imaginary axis would make the filter marginally stable | shows the original text | "equally spaced between α − j ω_c and α + j ω_c" | open |

