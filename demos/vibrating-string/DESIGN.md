# Design document: The Vibrating String

| | |
|---|---|
| Code version: | 0.1.43 |
| Document revision | 2 (2026-11-17) — the port |
| Status | describes the app as implemented; changes are proposed and approved before they are built |
| Original | Wolfram Demonstrations Project, "The Vibrating String", contributed by Alain Goriely and Mark Robertson-Tessi, published 2007-11-27 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/TheVibratingString/> |
| Port files | `model.js` (one evaluation of the Manipulate body; pure), `main.js` (the Manipulate on `shared/manipulate.js`), `errata-mode.js` (the corrections of the switch), `index.html` |

## 1. Purpose and background

The wave equation ∂ₜₜu = c²∂ₓₓu describes an idealized string fixed at x = 0 and x = 1. With the locators the reader
draws the string's initial shape (a smooth piecewise cubic through the points, or straight segments between them); the
Trigger lets it go with no initial velocity. The motion is built as d'Alembert's solution: the periodic odd extension F
of the initial shape gives u(x, t) = (F(x − ct) + F(x + ct))/2, the sum of a left- and a right-travelling wave, which can
be drawn separately (better seen on a wider x interval). The first three Fourier modes Bₘ sin(mπx) cos(mπct) of the same
solution can be shown beside the picture (caption).

## 2. Scope

In scope: the Demonstration's controls, picture and behaviour, reproduced from its Manipulate code
(`docs/original-source/vibrating-string.txt`) and checked against its snapshots (`docs/original-snapshots/vibrating-string-*.png`)
and saved settings (`tests/golden/vibrating-string.original-states.json`). Out of scope: anything the original does not do;
the port's additions are the A- features.

## 3. Users and use cases

- UC-VS-01: a student draws an initial shape of a string and watches it vibrate, as the sum of two travelling waves and
  through its first Fourier modes, in a browser without Mathematica.
- UC-VS-02: Tico compares the port with the original (checklist `docs/checklists/vibrating-string.md`), with the errors of
  the original kept or corrected.

## 4. Features

| ID | Feature | Reason | Since | Verified by |
|----|----|----|----|----|
| F-VS-01 | Setter bar "initial data": piecewise polynomial \| piecewise linear (`{{idpolynom, 1, "initial data"}, {1 -> …, 2 -> …}}`, above the picture) | the original's choice of the interpolation | v0.1.41 | e2e "has its controls with their defaults"; e2e "the setter bar chooses the piecewise-linear initial data"; M-VS-03 |
| F-VS-02 | Slider "velocity" c 0 … 3 (continuous, Labeled, above the picture) | the wave speed | v0.1.41 | e2e "the sliders set the velocity and the x interval"; M-VS-03 |
| F-VS-03 | Slider "x interval" a 0 … 2 step 1 (Labeled, above the picture): the plot shows −a ≤ x ≤ 1 + a | shows the extension beyond the string | v0.1.41 | e2e "the sliders set the velocity and the x interval"; M-VS-03 |
| F-VS-04 | Locator list `points` (initial {{1/2, 1}}) within {0.001, −2} … {1 − 0.001, 2}, `LocatorAutoCreate -> {All, {1, 10}}`: drag a point; a click beside the points adds one (dragged at once while the button is held); Alt-click (⌘-click on a Mac) on a point deletes it; at least 1 and at most 10 points (a click beyond the limits has no effect) | the original's way of drawing the initial shape | v0.1.41 | e2e "dragging a point with the mouse changes the string"; e2e "LocatorAutoCreate -> {All, {1, 10}}: a click beside the points adds one and drags it"; e2e "LocatorAutoCreate -> {All, {1, 10}}: with 10 points a click beside them has no effect"; M-VS-05 |
| F-VS-05 | The body's rules on the points: one point per x (the later one stays) and a point at x = 0.001 or x = 0.999 (an end of the range) removed | the original's clean-up of the points | v0.1.41 | unit "the points: one per x (the later one stays)"; e2e "a point moved to either end of its range is removed"; M-VS-05 |
| F-VS-06 | Initial data: ptsrt = Union[{{10⁻⁸, 0}}, points, {{1, 0}}]; ptsrt2 = Hermite data {{x}, y, dy} (chord slopes at the ends, central differences inside); piecewise polynomial = `Interpolation[ptsrt2]` (cubic Hermite, `shared/numeric.js`), piecewise linear = `MyPiecewise[ptsrt, x]` | the original's two interpolations | v0.1.41 | unit "the Hermite data of the opening state"; unit "the polynomial string of the opening state"; unit "the snapshot 2 Hermite data" |
| F-VS-07 | F = PeriodicExtension of OddExtension of the initial data (odd, period 2); evolving string (F[x − ct] + F[x + ct])/2, left wave F[x + ct]/2, right wave F[x − ct]/2 | d'Alembert's solution | v0.1.41 | unit "F is odd with period 2"; unit "the evolving string is the Fourier series"; unit "snapshot 4 (t = 4.156…, c = 0.5)" |
| F-VS-08 | The plot: `Plot[{If[id, …], If[string, …], If[ltw, …], If[rtw, …]}, {x, −a, 1 + a}, PlotRange -> {{−a, 1 + a}, {−2, 2}}, ImageSize -> {400, 300}]`, colours ColorData[97] by position (an unchecked curve keeps the others' colours), the points' locators on it | the original's picture | v0.1.41 | e2e "loads without errors and draws the opening picture"; e2e "the checkboxes show and hide the four curves"; e2e "the four snapshot settings"; M-VS-02 |
| F-VS-09 | Checkboxes "initial string", "evolving string", "left wave", "right wave" (left of the picture) | choose the curves | v0.1.41 | e2e "the checkboxes show and hide the four curves"; M-VS-03 |
| F-VS-10 | Trigger "run" on t, 0 … ∞ (play/pause, reset; 1 unit of t per second, Mathematica's default over an infinite range) | lets the string vibrate | v0.1.41 | e2e "the Trigger runs the string"; M-VS-06 |
| F-VS-11 | Fourier coefficients Bn = NIntegrate[2 FB Sin[mπx], {x, 0, 1}, AccuracyGoal -> 6], m = 1, 2, 3 (`shared/numeric.js`) | the modes' amplitudes | v0.1.41 | unit "Fourier coefficients of the opening state"; unit "Fourier coefficients of the piecewise-linear tent" |
| F-VS-12 | Checkbox "display modes" and the Dynamic in the control column: three framed plots "First mode", "Second mode", "Third mode" of Bn[[m]] Sin[mπx] Cos[mπct], PlotRange {{0, 1}, {−2, 2}}, ImageSize 160, one under the other | the Fourier view of the same motion | v0.1.41 | e2e "display modes shows the first three Fourier modes in the control column"; M-VS-07 |
| F-VS-13 | `ControlPlacement -> {Top, Top, Top, Left, …}`: setter bar and sliders above, the rest at the left of the picture | the original's layout | v0.1.41 | inventory; M-VS-02 |
| F-VS-14 | Opening state = the notebook's live state = the initial settings: polynomial, c 0.5, a 0, points {{1/2, 1}}, initial and evolving string on, waves off, t 0, modes off | the saved settings | v0.1.41 | unit "the opening state is the live state of the notebook and its initial settings"; e2e "has its controls with their defaults"; M-VS-02 |
| F-VS-15 | Caption and Details text from the Demonstration (the Details are the original's placeholder texts, E-VS-02) | the original's explanation | v0.1.41 | M-VS-01 |
| F-VS-16 | Each snapshot's settings give the snapshot's picture | faithfulness | v0.1.41 | e2e "the four snapshot settings + screenshots for review"; unit "each snapshot settings: the initial string passes through the points" |
| A-VS-01 | "Initial settings" button restores the opening state | Manipulate's Initial Settings | v0.1.41 | e2e "Initial settings restores the opening state" |
| A-VS-02 | Test and automation hook `window.__demo` (getState, setState, view, graphics, moveLocator, worldToClient, setClock) from the Manipulate layer; `view` gives the points, ptsrt, ptsrt2, Bn and the curves at x = 0, 0.1, …, 1 | automated tests | v0.1.41 | e2e "the sliders set the velocity and the x interval" |
| A-VS-03 | Start-up notice when the browser cannot run the page | no empty page | v0.1.41 | e2e "start-up notice when" |
| A-VS-04 | Breadcrumb link to all demos | navigation | v0.1.41 | inventory |
| A-VS-05 | Credits footer (authors, title, source, licence, adaptation notice) | required by the licence (CC BY-NC-SA 3.0 §4) | v0.1.41 | e2e "attribution on" |
| A-VS-06 | This app can be bundled and served alone (§6.1) | rule 7 | v0.1.41 | e2e "bundle: vibrating-string runs from its own folder" |
| A-VS-07 | Landing-page thumbnail `thumbnail.webp`: the picture at the initial settings, made by `tools/make-thumbnails.mjs`; the card's picture links to this app | requested 2026-11-05 | v0.1.41 | e2e "every card on the landing page has a thumbnail that loads" |
| A-VS-08 | Switch "errors of the original: kept \| corrected" beside "Initial settings" (variable `errata`, default kept = the original's behaviour). "corrected" changes only E-VS-03, E-VS-04 (§11; `errata-mode.js`); the differences are listed on the page under "Errors of the original: what "corrected" changes" | requested 2026-11-17: every code-level error of the original can be switched between the original's behaviour and its correction | v0.1.41 | unit "corrected mode (E-VS)"; e2e "errata switch on vibrating-string: kept is the original, corrected changes the listed result" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|----|----|
| `setter-idpolynom-*` | F-VS-01 |
| `*-c` | F-VS-02 |
| `*-a` | F-VS-03 |
| `locator-points-*` | F-VS-04 |
| `*-id` | F-VS-09 |
| `*-string` | F-VS-09 |
| `*-ltw` | F-VS-09 |
| `*-rtw` | F-VS-09 |
| `trigger-*-t` | F-VS-10 |
| `*-modedisp` | F-VS-12 |
| `reset` | A-VS-01 |
| `crumbs` | A-VS-04 |
| `details` | F-VS-15 |
| `credits` | A-VS-05 |
| `setter-errata-*` | A-VS-08 |
| `errata-details` | A-VS-08 |

## 6. Design

- `model.js` (pure): the original's functions under their names — `cleanPoints` (the body's three `//.` rules),
  `ptsrtOf`, `ptsrt2Of`, `MyPiecewise`, `PeriodicExtension`, `OddExtension`, `F`, `FB`, `BnOf`, `modePlot` — and
  `evaluate(state)` → `{ state, view, graphics }` with four pictures: the plot (`shared/plot.js` Plot) and the three mode
  plots. A curve that is switched off is NaN (Mathematica's Null: nothing drawn, the colours stay by position). Machine
  reals in the patterns are compared as SameQ does (`Equal` of `shared/wl.js`). F takes many periods off at once (the
  original subtracts 2 per step: the same value up to rounding). The Hermite interpolation is `Interpolation` of
  `shared/numeric.js` (v0.1.41), the coefficients `NIntegrate` (breakpoints at the data points).
- `main.js`: one `Manipulate`; the three top controls are placed in `#controls-top` (control option `parent`), the others
  in `#controls` at the left; the three mode plots are pictures 2–4 (`#mode1` … `#mode3` in `#modes`, shown by `after`
  while "display modes" is checked); `LocatorAutoCreate: [All, [1, 10]]` (shared/manipulate.js, v0.1.41: All and count
  limits, opt-in).
- `index.html`: the layout of the snapshots (a grid: top row, left column, picture), the plot centred in a 4 : 3 box
  (ImageSize {400, 300} with AspectRatio 1/GoldenRatio).

### 6.1 Building and deploying this app alone

Rule 7 of docs/DESIGN_PROCESS.md: this one app can be taken out of the repository and hosted anywhere.

- Command, in the repository folder: `npm run bundle -- vibrating-string` → `dist/vibrating-string/`.
- Contents (generated with `node tools/bundle-app.mjs vibrating-string --update-docs`):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/vibrating-string/`) | 4 | `errata-mode.js`, `index.html`, `main.js`, `model.js` |
| `shared/` | 21 | `clock.js`, `complex.js`, `errata.js`, `graphics-extras.js`, `graphics.js`, `manipulate.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `mma.js`, `numeric.js`, `plot.js`, `random.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `ui-extra.js`, `ui-interval.js`, `ui.js`, `wl.js` |
| added by the bundler | 7 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/vibrating-string/DESIGN.md` |
<!-- bundle-contents:end -->

- Checked by e2e "bundle: vibrating-string runs from its own folder" (A-VS-06).

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

| ID | Kind | Description |
|----|----|----|
| D-VS-01 | deviation | The Trigger is drawn as two buttons (play/pause, reset); Mathematica's has three (play, pause, reset). |
| D-VS-02 | deviation | The plot's ticks and image padding are given explicitly (x every 0.2, 0.5 or 1 for x interval 0, 1, 2; y every 1, minor ticks between), as the snapshots show Mathematica's automatic choice; the port's automatic ticks would put y labels every 0.5. The y axis has no "0" label (Mathematica writes one). |
| D-VS-03 | deviation | The locators are the shared locator glyph (a ring with a cross); Mathematica's are filled light grey. |
| D-VS-04 | deviation | Curves are sampled by the shared adaptive sampler, not Mathematica's: they agree to well under a pixel, but whether a sample falls exactly on a data point (E-VS-03) or on x = ±1 (E-VS-04) can differ. |
| Q-VS-01 | quirk | A point dragged (or moved with the arrow keys) to the left or right end of its range disappears: the body removes points at x = 0.001 and x = 0.999. This can remove the last point (the limit of 1 applies only to Alt-clicks); the string is then flat and a click adds a point again. |
| Q-VS-02 | quirk | The piecewise-linear string drops to 0 where the plot samples a data point exactly (E-VS-03): at the opening settings with "piecewise linear" and x interval 1 the port draws a vertical line from the top of the tent to the axis at x = 1/2. |
| Q-VS-03 | quirk | The evolving string at t = 0 hides the initial string (both are the same curve; the evolving string is drawn on top, as in snapshot 1). |
| K-VS-01 | known issue | What Mathematica does with a plain click beside the points when there are already 10 (the port: nothing, from the reference page's "no effect"), and whether a new point follows the mouse while the button is held (the port: yes), are not checked in Mathematica (M-VS-05). |
| K-VS-02 | known issue | No snapshot shows the mode plots: their size inside GraphicsGrid and their ticks are assumed (160 px wide each, ticks as the main plot) (M-VS-07). |
| N-VS-01 | note | The Fourier coefficients are computed with breakpoints at the data points; Mathematica's NIntegrate finds the kinks itself; both agree with the closed forms to 10⁻⁸ (unit tests). |
| N-VS-02 | note | t runs at 1 unit per second, so the string's period is 2/c seconds (4 s at c = 0.5); snapshot 4 (t = 4.156) shows the string one period later plus 0.078. |

## 8. Proposed changes

Proposals for this app are tracked separately.

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.41 | 2026-11-17 | generated by `tools/new-app.mjs` (example model and controls) |
| 2 | v0.1.41 | 2026-11-17 | the port: the two interpolations (Hermite by `Interpolation` of shared/numeric.js), the periodic odd extension and d'Alembert's sum, the Fourier coefficients and the three mode plots, the Trigger, the Locator list with `LocatorAutoCreate -> {All, {1, 10}}` (new in shared/manipulate.js and shared/svg-plot.js); switch for E-VS-03, E-VS-04 |
| 3 | v0.1.42 | 2026-11-23 | version number (v0.1.42: one new app, Potential Fields, from Dr. Becker's Lecture 22 notebook; no shared code changed); no change to this app's code, behaviour or picture |
| 4 | v0.1.43 | 2026-11-25 | version number (v0.1.43: Dr. Becker's changes to Artificial Potential Fields; no shared code changed); no change to this app's code, behaviour or picture |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|----|----|----|----|
| I-VS-01 | A slider for t beside the Trigger (scrub through the motion) | look at one moment closely | not in the original | F-VS-10 |
| I-VS-02 | The sum of the first three modes drawn over the string | shows how well three modes approximate it | not in the original | F-VS-12 |
| I-VS-03 | Mathematica reference values of Bn and of the curves at the snapshots | tests against Mathematica itself | Tico's Mathematica | F-VS-11 |

## 11. Errors in the original (conceptual and mathematical)

Checked when the Demonstration's code was ported (rule 9). Kind: conceptual, mathematical, numerical or
text; Status: open, kept or corrected in vX.Y.Z (the tests check these words). Not by Dr. Becker: findings here are
listed in the errata list as such and are not raised with him. Checked numerically: the Fourier coefficients against
closed forms, d'Alembert's sum against the Fourier series of the tent, the time evolution of the modes
(Bₘ sin(mπx) cos(mπct) is the solution for a string of length 1), the direction of the two waves (F(x + ct) moves left).

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|----|----|----|----|----|----|
| E-VS-01 | text | Caption: "construct approximations … on the interval 0 to π" | the string, the locators and the plot are on the interval 0 to 1 | kept: the caption as published | none on the computation; the caption would read "0 to 1" | kept |
| E-VS-02 | text | Details & Citations, References | the template placeholders "Details, references or citation information" and "References for demonstration." were published (also "Link to a related demonstration" and "SymbolName …" among the related items) | kept: the Details show the two placeholders | none | kept |
| E-VS-03 | mathematical | `MyPiecewise[P_, x_] := … Piecewise[Table[{…, P[[i, 1]] < x < P[[i + 1, 1]]}, …]]` | open intervals: at every data point (each locator) no condition holds and Piecewise gives its default 0, so the piecewise-linear string is 0 there instead of the locator's height; a curve drops to the axis wherever the plot samples a data point exactly (Q-VS-02) | kept: 0 at the data points (Q-VS-02) **Switch:** with "errors of the original: corrected" (A-VS-08, v0.1.41) — the intervals are closed, so the piecewise-linear string passes through every locator. The Fourier coefficients do not change (single points do not change an integral). | the vertical drops disappear; Bn, the golden settings and the snapshots (all piecewise polynomial) are unchanged | switchable since v0.1.41 |
| E-VS-04 | numerical | `PeriodicExtension[g_, x_] := If[Abs[x] < 1, g[x], PeriodicExtension[g, x − 2 Sign[x]]]` | at x = ±1 (every odd integer) the evaluation never ends (1 → −1 → 1 …; Mathematica stops it with an iteration or recursion limit message and the value is not a number) — wherever a curve is sampled at an odd integer: the right end x = 1 of the initial string (at every t) and of the evolving string at t = 0, and the ends of wider x intervals (x = −1 for x interval 1, x = 3 for x interval 2); also the number of steps grows with \|x ± ct\| over a long run | kept: no value (NaN) at x = ±1, a gap of one sample **Switch:** with "errors of the original: corrected" (A-VS-08, v0.1.41) — the extension also stops at x = ±1 itself, so the string is 0 at x = ±1 (its fixed ends) as everywhere else on its period. | the string has its value 0 at the fixed ends; the drawn curves change by less than a pixel; in Mathematica the messages would disappear | switchable since v0.1.41 |
