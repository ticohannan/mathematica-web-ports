# Design document: Linking Autocorrelation of Gaussian Random Process to Conditional Probabilities

| | |
|---|---|
| Code version: | 0.1.44 |
| Document revision | 2 (2026-11-27) — the port |
| Status | describes the app as implemented; changes are proposed and approved before they are built |
| Original | Wolfram Demonstrations Project, "Linking Autocorrelation of Gaussian Random Process to Conditional Probabilities", contributed by Victor S. Frost, published 2023-09-06 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/LinkingAutocorrelationOfGaussianRandomProcessToConditionalPr/> |
| Port files | `model.js` (one evaluation of the Manipulate body; pure), `main.js` (the Manipulate on `shared/manipulate.js`), `index.html` |

## 1. Purpose and background

For a zero-mean Gaussian random process X(t) with autocorrelation R<sub>xx</sub>(τ), the value at t + τ given X(t) = y is
Gaussian with mean (R<sub>xx</sub>(τ)/R<sub>xx</sub>(0)) y and variance R<sub>xx</sub>(0)(1 − (R<sub>xx</sub>(τ)/R<sub>xx</sub>(0))²). The
Demonstration shows, for one of three autocorrelations (10 sinc(10πτ), 10 tri(τ), 10 e<sup>−10|τ|</sup>), four plots in a
framed grid: the correlation coefficient ρ(τ), the power spectral density, the conditional probability P(X(t + τ) > L |
X(t) = y) against the lag beside the unconditional P(X > L), and the conditional pdf with the area above the threshold
L shaded, with the conditional mean, variance and probability below it (caption).

## 2. Scope

In scope: the Demonstration's controls, picture and behaviour, reproduced from its Manipulate code
(`docs/original-source/gaussian-autocorrelation-conditional.txt`) and checked against its snapshots
(`docs/original-snapshots/gaussian-autocorrelation-conditional-*.png`) and saved settings
(`tests/golden/gaussian-autocorrelation-conditional.original-states.json`). Out of scope: anything the original does not do; the
port's additions are the A- features.

## 3. Users and use cases

- UC-GR-01: a student explores the Demonstration in a browser, without Mathematica: how the correlation time decides how
  long X(t) tells something about X(t + τ).
- UC-GR-02: Tico compares the port with the original (checklist `docs/checklists/gaussian-autocorrelation-conditional.md`).

## 4. Features

| ID | Feature | Reason | Since | Verified by |
|----|----|----|----|----|
| F-GR-01 | Sliders in one row: "lag τ" `{{t, 0.05, …}, 0.0001, 1.1, .001}`, y `{{y, 1, …}, -4, 4, .1}`, "threshold L" `{{L, 1, …}, -4, 4, .05}`, Appearance "Labeled", ImageSize Tiny | the original's controls | v0.1.44 | e2e "the threshold and lag sliders move the probability"; e2e "has its controls with their defaults" |
| F-GR-02 | Setter "autocorrelation function R<sub>XX</sub>(τ) =" `{f1 -> "10 sinc(10πτ) correlation time=0.1", f2 -> "10 tri(τ) correlation time=1.0", f3 -> 10 e^(−10\|τ\|) " correlation time=0.2"}` with the power spectral densities ½(Sign[5 − f] + Sign[5 + f]), 10 Sinc[f π]², 5.06606/(2.53303 + f²) | the original's control | v0.1.44 | e2e "the autocorrelation setter changes the plots and the numbers"; unit "each power spectral density is the Fourier transform of its autocorrelation"; unit "the correlation times of the labels are the integral of R over R(0)" |
| F-GR-03 | "correlation coefficient": `Plot[R(t)/R(0), {t, 0.00001, 1.1}, Frame -> True, FrameLabel -> {"lag τ", "ρ(τ)"}, PlotRange -> {{0, 1.1}, {-0.3, 1}}, GridLines -> Automatic, ImageSize -> {270, 190}]` | the original's picture | v0.1.44 | e2e "loads without errors and draws the four plots, the legend and the three lines" |
| F-GR-04 | "power spectral density": `Plot[PSD[f], {f, -6, 6}, PlotRange -> All, Frame -> True, …]` (the jumps of the rectangle drawn as vertical lines) | the original's picture | v0.1.44 | e2e "loads without errors and draws the four plots, the legend and the three lines" |
| F-GR-05 | "conditional probability": `Plot[{Q[L/√R(0)], Q[(L − ρ y)/√(R(0)(1 − ρ²))]}, {t, 0, 1.1}, PlotRange -> {{0, 1.1}, {0, 1}}, …]` with the legend below it (LineLegend, FontSize 10) | the original's picture | v0.1.44 | unit "for long lags the conditional probability tends to the unconditional one"; e2e "loads without errors and draws the four plots, the legend and the three lines" |
| F-GR-06 | "conditional pdf": `Plot[{pdf, UnitStep[L − x] pdf}, {x, -7, 7}, Filling -> {1 -> {2}}, PlotRange -> All, Epilog -> {Red, Line[{{L, 0}, {L, 10}}]}]`, and below it "conditional expected value =", "conditional variance =", "conditional probability =" with NumberForm[Chop[…], 4] | the original's picture | v0.1.44 | unit "the conditional probability is the area of the conditional pdf above L"; unit "the four snapshot settings give the numbers printed in the snapshot pictures"; e2e "the snapshot settings show the snapshots numbers" |
| F-GR-07 | The Grid of the four plots with Frame -> All (2 × 2 framed cells) | the original's layout | v0.1.44 | unit "the six pictures: the four plots, the legend and the three lines" |
| F-GR-08 | Opening state τ = 0.05, y = 1, L = 1, f1 (the notebook's live state = its initial settings) | the saved state | v0.1.44 | unit "the opening state is the notebook live state"; e2e "has its controls with their defaults" |
| F-GR-09 | Caption and Details text from the Demonstration | the original's explanation | v0.1.44 | M-GR-01 |
| F-GR-10 | Controls above the grid (ControlPlacement -> Top) | the original's layout | v0.1.44 | inventory |
| A-GR-01 | "Initial settings" button restores the opening state | Manipulate's Initial Settings | v0.1.44 | e2e "Initial settings restores the opening state" |
| A-GR-02 | Test and automation hook `window.__demo` (getState, setState, view, graphics) from the Manipulate layer | automated tests | v0.1.44 | e2e "the threshold and lag sliders move the probability" |
| A-GR-03 | Start-up notice when the browser cannot run the page | no empty page | v0.1.44 | e2e "start-up notice when" |
| A-GR-04 | Breadcrumb link to all demos | navigation | v0.1.44 | inventory |
| A-GR-05 | Credits footer (authors, title, source, licence, adaptation notice) | required by the licence (CC BY-NC-SA 3.0 §4) | v0.1.44 | e2e "attribution on" |
| A-GR-06 | This app can be bundled and served alone (§6.1) | rule 7 | v0.1.44 | e2e "bundle: gaussian-autocorrelation-conditional runs from its own folder" |
| A-GR-07 | Landing-page thumbnail `thumbnail.webp`: the picture at the initial settings, made by `tools/make-thumbnails.mjs`; the card's picture links to this app | requested 2026-11-05 | v0.1.44 | e2e "every card on the landing page has a thumbnail that loads" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|----|----|
| `slider-t` | F-GR-01 |
| `value-t` | F-GR-01 |
| `plus-t` | F-GR-01 |
| `play-t` | F-GR-01 |
| `stepback-t` | F-GR-01 |
| `stepfwd-t` | F-GR-01 |
| `slider-y` | F-GR-01 |
| `value-y` | F-GR-01 |
| `plus-y` | F-GR-01 |
| `play-y` | F-GR-01 |
| `stepback-y` | F-GR-01 |
| `stepfwd-y` | F-GR-01 |
| `slider-L` | F-GR-01 |
| `value-L` | F-GR-01 |
| `plus-L` | F-GR-01 |
| `play-L` | F-GR-01 |
| `stepback-L` | F-GR-01 |
| `stepfwd-L` | F-GR-01 |
| `setter-fun-*` | F-GR-02 |
| `reset` | A-GR-01 |
| `crumbs` | A-GR-04 |
| `details` | F-GR-09 |
| `credits` | A-GR-05 |

## 6. Design

- `model.js` (pure): `FUNCTIONS` (the three autocorrelations, their PSDs and labels), `Q`, `normalPdf`, `conditional(state)`
  (mean, variance, probabilities), `nf4` (NumberForm[Chop[x], 4]), `evaluate(state)` → `{ view, graphics }` with six
  pictures: the four plots of `shared/plot.js` and two small Graphics in pixel coordinates (the legend, the three lines).
  Test ids: `rplot-svg`, `psd-svg`, `pplot-svg`, `legend-svg`, `pdf-svg`, `pdf-text-svg`, `legend-*`, `threshold-line`,
  `text-mean`, `text-variance`, `text-probability`.
- `main.js`: one `Manipulate({…})`, ControlPlacement Top; the sliders in a Row, the setter below; the page's CSS grid of
  four framed cells holds the six pictures.

### 6.1 Building and deploying this app alone

Rule 7 of docs/DESIGN_PROCESS.md: this one app can be taken out of the repository and hosted anywhere.

- Command, in the repository folder: `npm run bundle -- gaussian-autocorrelation-conditional` → `dist/gaussian-autocorrelation-conditional/`.
- Contents (generated with `node tools/bundle-app.mjs gaussian-autocorrelation-conditional --update-docs`):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/gaussian-autocorrelation-conditional/`) | 3 | `index.html`, `main.js`, `model.js` |
| `shared/` | 19 | `clock.js`, `graphics-extras.js`, `graphics.js`, `manipulate.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `mma.js`, `number-form.js`, `plot.js`, `random.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `ui-extra.js`, `ui-interval.js`, `ui.js`, `wl.js` |
| added by the bundler | 7 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/gaussian-autocorrelation-conditional/DESIGN.md` |
<!-- bundle-contents:end -->

- Checked by e2e "bundle: gaussian-autocorrelation-conditional runs from its own folder" (A-GR-06).

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

| ID | Kind | Description |
|----|----|----|
| D-GR-01 | deviation | The legend placed Below the conditional probability plot and the three lines below the pdf are drawn as their own small pictures under the plots (the layer has no legend below a plot). |
| D-GR-02 | deviation | The plots use the layer's tick spacing (e.g. 0.02 instead of 0.05 on the pdf's axis) and the browser's fonts. |
| D-GR-03 | deviation | The jumps of the sinc's rectangular PSD and of the cut pdf are given to the plot as Exclusions at ±5 and at L, drawn as vertical lines in the curve's colour (Mathematica finds them and ExclusionsStyle -> Automatic joins them). |
| Q-GR-01 | quirk kept | The PSD is chosen by comparing the values `If[Rxx[t] == 10*Sinc[10*π*t], …]` at the current lag, not the function itself; it picks the right one for every lag of the slider (the three functions differ there). |
| Q-GR-02 | quirk kept | At τ = 0 the conditional variance is 0 and the conditional probability 0/0: the curve starts just after 0 (at ½ for L = y). |
| Q-GR-03 | quirk kept | The Details are the template's "Details, references or citation information". |
| N-GR-01 | note | Checked numerically (unit tests): the three PSDs are the Fourier transforms of their autocorrelations, the correlation times 0.1, 1.0 and 0.2 are ∫R/R(0), the conditional probability equals the integral of the conditional pdf above L, and the four snapshots' printed numbers are reproduced exactly. |

## 8. Proposed changes

Proposals for this app are tracked separately.

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.44 | 2026-11-27 | generated by `tools/new-app.mjs` (example model and controls) |
| 2 | v0.1.44 | 2026-11-27 | the port: the four framed plots (correlation coefficient, power spectral density, conditional probability with its legend, conditional pdf with its numbers), the three sliders and the setter |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|----|----|----|----|
| I-GR-01 | Mark the correlation time on the correlation coefficient plot | the reader sees where the conditional probability settles | not in the original | F-GR-03 |
| I-GR-02 | Draw the legend inside the plot's picture as Mathematica does | one picture per cell | a shared legend placement | D-GR-01 |
| I-GR-03 | Start the conditional probability at its limit at τ = 0 | no gap at the left end | differs from the original | Q-GR-02 |

## 11. Errors in the original (conceptual and mathematical)

Checked when the Demonstration's code was ported (rule 9), with the numbers of N-GR-01. Kind: conceptual,
mathematical, numerical or text; Status: open, kept or corrected in vX.Y.Z (the tests check these words).

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|------|-----------------------|--------------------------|--------------------|-------------------------|--------|
| E-GR-01 | text | the caption's "P(X(t+τ)\|X(t)=y)>L" | the condition stands inside and the event outside: the probability meant is P(X(t+τ) > L \| X(t) = y), as the plot's axis label writes it | kept (the caption is the original's text) | the caption reads like the plot's label | kept |
