# Design document: Path of Light through an Acoustic Wave

| | |
|---|---|
| Code version: | 0.1.43 |
| Document revision | 2 (2026-11-17) — the port |
| Status | describes the app as implemented; changes are proposed and approved before they are built |
| Original | Wolfram Demonstrations Project, "Path of Light through an Acoustic Wave", contributed by Brendon O'Leary, published 2010-07-15 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/PathOfLightThroughAnAcousticWave/> |
| Port files | `model.js` (one evaluation of the Manipulate body; pure), `main.js` (the Manipulate on `shared/manipulate.js`), `index.html` |

## 1. Purpose and background

A sound wave changes the pressure of the air and with it the refractive index, n_air + m sin(w x). Light that crosses
the sound wave bends toward the normal of the wavefronts where the index is high and away from it where it is low. The
Demonstration plots the light's path y(x) (bold) over the acoustic wave m sin(w x) (dashed) for x from 0 to 50; the
sliders set the index of the undisturbed air n_air, the "sound volume" m, the sound frequency w and the initial angle θ
of the light. The path comes from the principle of least time: the Euler–Lagrange equation of
t = ∫ (n_air + m sin w x)/c √(1 + y′²) dx with its term in y′³ dropped (Details), whose solution with y(0) = 0,
y′(0) = tan θ is y(x) = n tan θ ∫₀ˣ dξ/(n + m sin w ξ), written in closed form with ArcTan and a Ceiling term that keeps
the branch continuous.

## 2. Scope

In scope: the Demonstration's controls, picture and behaviour, reproduced from its Manipulate code
(`docs/original-source/light-through-acoustic-wave.txt`) and checked against its snapshots
(`docs/original-snapshots/light-through-acoustic-wave-*.png`) and saved settings
(`tests/golden/light-through-acoustic-wave.original-states.json`). Out of scope: anything the original does not do; the
port's additions are the A- features.

## 3. Users and use cases

- UC-LT-01: a student explores the Demonstration in a browser, without Mathematica.
- UC-LT-02: Tico compares the port with the original (checklist `docs/checklists/light-through-acoustic-wave.md`).

## 4. Features

| ID | Feature | Reason | Since | Verified by |
|----|----|----|----|----|
| F-LT-01 | Slider "index of refraction of air n_air" `{{n, 1, …}, .8, 5, Appearance -> "Labeled"}` (continuous; the label with Subscript n_air) | the original's control | v0.1.41 | e2e "has its controls with their defaults"; e2e "the mouse: the maximum of m follows n"; M-LT-03 |
| F-LT-02 | Slider "sound volume m" `{{m, .7, …}, 0, n − .1, Appearance -> "Labeled"}`: its maximum follows n (a function of the state as the slider bound) | the original's control | v0.1.41 | e2e "has its controls with their defaults"; e2e "the mouse: the maximum of m follows n"; e2e "Initial settings restores the opening state"; M-LT-05 |
| F-LT-03 | Slider "frequency of sound w" `{{w, .5, …}, .3, 2, Appearance -> "Labeled"}` | the original's control | v0.1.41 | e2e "the keyboard moves a slider to its ends"; e2e "typing a value"; M-LT-03 |
| F-LT-04 | Slider "initial angle of light θ" `{{θ, .01, …}, −.02, .02, Appearance -> "Labeled"}` | the original's control | v0.1.41 | e2e "the keyboard moves a slider to its ends"; M-LT-03 |
| F-LT-05 | The body's `If[m > n − .1, m = n − .1]`: when n is lowered below m + .1 the body sets m = n − .1 (machine arithmetic: 0.8 − .1 = 0.7000000000000001) and the m slider shows it | the original's guard (√(n² − m²) stays real, n + m sin w x ≥ 0.1) | v0.1.41 | unit "If[m > n − .1, m = n − .1]: the body lowers m"; e2e "the mouse: the maximum of m follows n, and lowering n lowers m"; M-LT-05 |
| F-LT-06 | The light path, the original's closed form term by term: (2 (ArcTan[(m + n Tan[w x/2])/√(n² − m²)] + π Ceiling[w x/(2π) − .5]) n Tan[θ])/(√(n² − m²) w) − (2 n ArcTan[m/√(n² − m²)] Tan[θ])/(√(n² − m²) w) | the original's model | v0.1.41 | unit "the light path is n tan θ ∫₀ˣ dξ/(n + m sin wξ)"; unit "m = 0: the path is the straight line"; unit "the Details' equation without the cubic term"; unit "continuous at the branch points" |
| F-LT-07 | The acoustic wave m Sin[w x] | the original's model | v0.1.41 | unit "m = 0: the path is the straight line y = x tan θ; the wave is m sin wx"; e2e "loads without errors and draws the picture" |
| F-LT-08 | `Plot[{path, wave}, {x, 0, 50}, PlotStyle -> {Thick, Dashed}, ImageSize -> {500, 300}, ImagePadding -> {{25, 25}, {10, 10}}]`: the path Thick in ColorData[97, 1], the wave dashed in ColorData[97, 2], axes, the automatic plot range | the original's picture | v0.1.41 | unit "the plot: PlotStyle {Thick, Dashed}"; unit "the drawn curves have no spikes"; e2e "the snapshot settings"; M-LT-02 |
| F-LT-09 | Opening state = the notebook's live state = the initial settings: n = 1, m = 0.7, w = 0.5, θ = 0.01 | the saved settings | v0.1.41 | unit "the opening state = the live state and the initial settings of the notebook"; e2e "has its controls with their defaults"; M-LT-02 |
| F-LT-10 | Caption and Details text (from the notebook; the external links as text) | the original's explanation | v0.1.41 | M-LT-01 |
| F-LT-11 | Four snapshot settings give the snapshots' pictures | faithfulness | v0.1.41 | unit "snapshot 1 and 2"; unit "snapshot 3"; unit "snapshot 4"; e2e "the snapshot settings + screenshots for review"; M-LT-06 |
| F-LT-12 | Controls above the picture (Mathematica's default ControlPlacement) | the original's layout | v0.1.41 | M-LT-02 |
| A-LT-01 | "Initial settings" button restores the opening state (and the m slider's maximum 0.9) | Manipulate's Initial Settings | v0.1.41 | e2e "Initial settings restores the opening state"; M-LT-04 |
| A-LT-02 | Test and automation hook `window.__demo` (getState, setState, view, graphics) from the Manipulate layer; view = { m, yEnd, plotRange, samples, steepest } | automated tests | v0.1.41 | e2e "the snapshot settings + screenshots for review" |
| A-LT-03 | Start-up notice when the browser cannot run the page | no empty page | v0.1.41 | e2e "start-up notice when" |
| A-LT-04 | Breadcrumb link to all demos | navigation | v0.1.41 | inventory |
| A-LT-05 | Credits footer (authors, title, source, licence, adaptation notice) | required by the licence (CC BY-NC-SA 3.0 §4) | v0.1.41 | e2e "attribution on" |
| A-LT-06 | This app can be bundled and served alone (§6.1) | rule 7 | v0.1.41 | e2e "bundle: light-through-acoustic-wave runs from its own folder" |
| A-LT-07 | Landing-page thumbnail `thumbnail.webp`: the picture at the initial settings, made by `tools/make-thumbnails.mjs`; the card's picture links to this app | requested 2026-11-05 | v0.1.41 | e2e "every card on the landing page has a thumbnail that loads" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|----|----|
| `*-n` | F-LT-01 |
| `*-m` | F-LT-02 |
| `*-w` | F-LT-03 |
| `*-θ` | F-LT-04 |
| `reset` | A-LT-01 |
| `crumbs` | A-LT-04 |
| `details` | F-LT-10 |
| `credits` | A-LT-05 |

## 6. Design

- `model.js` (pure): `initialState()`; `clampM(state)` (the body's If); `lightPath(x, state)` (the original's
  expression, term by term, in `Math` arithmetic); `wave(x, state)`; `evaluate(state)` → `{ state, view, graphics }`:
  the state with m lowered where the If applies (the layer writes it back to the m slider, docs/NEW_APP.md "x changed
  inside the body"), the hook's view, and the `Plot` of `shared/plot.js` with the curves annotated `light-path` and
  `sound-wave`. `steepestChord(pts)` measures the steepest chord of the drawn path (a spike would show there).
- `main.js`: the original's four sliders in Mathematica's form; the m slider's maximum is `(s) => s.n - 0.1` (the
  layer's dynamic slider range); `ControlPlacement: 'Top'`.
- `index.html`: caption and Details from the notebook (the two equations as `.formula` paragraphs).

### 6.1 Building and deploying this app alone

Rule 7 of docs/DESIGN_PROCESS.md: this one app can be taken out of the repository and hosted anywhere.

- Command, in the repository folder: `npm run bundle -- light-through-acoustic-wave` → `dist/light-through-acoustic-wave/`.
- Contents (generated with `node tools/bundle-app.mjs light-through-acoustic-wave --update-docs`):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/light-through-acoustic-wave/`) | 3 | `index.html`, `main.js`, `model.js` |
| `shared/` | 16 | `clock.js`, `graphics-extras.js`, `graphics.js`, `manipulate.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `plot.js`, `random.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `ui-extra.js`, `ui-interval.js`, `ui.js` |
| added by the bundler | 7 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/light-through-acoustic-wave/DESIGN.md` |
<!-- bundle-contents:end -->

- Checked by e2e "bundle: light-through-acoustic-wave runs from its own folder" (A-LT-06).

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

| ID | Kind | Description |
|----|----|----|
| D-LT-01 | deviation | The curves are sampled by the shared adaptive sampler (`shared/plot.js`), not Mathematica's; the automatic plot range is padded as the shared Plot pads it. At snapshot 3 the original's vertical axis reaches just past 1.0 and shows the tick label 1.0 at its top; the port's padded range ends at about 0.995, so its top label is 0.5 (the curves are the same). |
| D-LT-02 | deviation | The labels are drawn above the sliders and the value fields beside them (the pages' control layout), not to the left of the sliders as in Mathematica's panel. |
| Q-LT-01 | quirk kept | The body changes its own variable: lowering n below m + .1 lowers m to n − .1, and raising n again does not bring m back. |
| Q-LT-02 | quirk kept | The path is the solution of the equation without the y′³ term (E-LT-01), as the Details say. |
| N-LT-01 | note | Mathematica's Plot has `Exclusions -> Automatic` and finds the poles of Tan[w x/2] and the jumps of Ceiling[w x/(2π) − .5], both at x = (2k + 1)π/w; the closed form is continuous there (checked numerically: the jump over ±10⁻¹²…10⁻³ relative is within the slope bound), so its break is invisible. The port draws one line through these points. Within a few units in the last place of a pole the two branch terms can round differently and give a value one period step 2π n tan θ/(w √(n² − m²)) off; no sample of the port's sampler lands there at the snapshot settings or at 300 random settings (unit "the drawn curves have no spikes"), and none can be aimed at with the sliders. |
| N-LT-02 | note | The units are arbitrary (Details): n_air from 0.8 to 5 and m up to n − .1 are not the values of air (n ≈ 1.0003, changes of about 10⁻⁶); the guard keeps the index n + m sin w x ≥ 0.1. |
| N-LT-03 | note | n sin θ ≤ 5 sin 0.02 = 0.09999 stays just below the smallest index 0.1 in the controls' ranges, so the least-time path itself never meets total reflection; at that corner (n = 5, m = 4.9, θ = 0.02) the linear equation's slope n tan θ/(n − m) reaches 1.0. |
| N-LT-04 | note | The Details' "The third-order term was omitted" means the term m w cos(w x) (y′)³, of third order in the small slope y′; the equation stays of second order. |

## 8. Proposed changes

Proposals for this app are tracked separately.

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.41 | 2026-11-17 | generated by `tools/new-app.mjs` (example model and controls) |
| 2 | v0.1.41 | 2026-11-17 | the port: the light path and the acoustic wave in one Plot, four sliders with the maximum of m following n, the body's If on m, the Details' differential equation checked in the unit tests (§11) |
| 3 | v0.1.42 | 2026-11-23 | version number (v0.1.42: one new app, Potential Fields, from Dr. Becker's Lecture 22 notebook; no shared code changed); no change to this app's code, behaviour or picture |
| 4 | v0.1.43 | 2026-11-25 | version number (v0.1.43: Dr. Becker's changes to Artificial Potential Fields; no shared code changed); no change to this app's code, behaviour or picture |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|-------------|---------|-------------|---------|
| I-LT-01 | Draw the least-time path itself (Snell's invariant (n + m sin w x) y′/√(1 + y′²) = n sin θ, integrated numerically) as a third curve or on a switch | shows how good the dropped-term approximation is (E-LT-01) | not in the original; numerical integration near the turning points; a new control | E-LT-01 |
| I-LT-02 | Reference values from Mathematica for the plot range and the tick labels at the snapshot settings | settles D-LT-01 exactly | Tico's Mathematica | D-LT-01 |
| I-LT-03 | Show the index of refraction n + m sin w x instead of m sin w x for the dashed curve | the dashed curve would be the index the Details speak of | not in the original; changes the picture | F-LT-07 |

## 11. Errors in the original (conceptual and mathematical)

Checked when the Demonstration's code was ported (rule 9), with the numerical checks of
`tests/unit/light-through-acoustic-wave.test.js`: the closed form is n tan θ ∫₀ˣ dξ/(n + m sin w ξ) (Simpson
integration), solves (n + m sin w x) y″ + m w cos(w x) y′ = 0 with y(0) = 0, y′(0) = tan θ (finite differences), is
continuous at the branch points, and the Euler–Lagrange equation in the Details is right for the integrand
(n + m sin w x)√(1 + y′²). Kind: conceptual, mathematical, numerical or text; Status: open, kept or corrected in vX.Y.Z
(the tests check these words).

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|------|-----------------------|--------------------------|--------------------|-------------------------|--------|
| E-LT-01 | conceptual | the plotted path and the Details: "The path of light was calculated by the principle of least time" … "The third-order term was omitted" | The curve is the least-time path only while y′² ≪ 1: dropping m w cos(w x) y′³ changes the relative slope by about y′². In the controls' ranges the slope n tan θ/(n − m) reaches 1.0 (n = 5, m = 4.9, θ = 0.02), and there, with w = 0.3, the path at x = 50 ends at 4.31 while the least-time path (Snell's invariant, integrated numerically) ends at about 12.5. At the opening state and the snapshots the difference is 0.02 %, 0.15 % and 0.7 %. The Details do not say that the approximation is for small angles. | kept: the original's closed form (Q-LT-02) | the path would be computed by numerical integration of the exact equation; the opening picture and the snapshots change by under a pixel, large n with m near n − .1 and \|θ\| near 0.02 change a lot; could be offered as a third curve (I-LT-01) | kept |
