# Design document: Link Budget for Communication Systems

| | |
|---|---|
| Code version: | 0.1.37 |
| Document revision | 2 (2026-11-12) — the port |
| Status | describes the app as implemented; changes go through Proposed changes (§8) |
| Original | Wolfram Demonstrations Project, "Link Budget for Communication Systems", contributed by Victor S. Frost, published 2023-07-06 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/LinkBudgetForCommunicationSystems/> |
| Port files | `model.js` (one evaluation of the Manipulate body; pure), `main.js` (the Manipulate on `shared/manipulate.js`), `index.html` |
| Role in the project | new demonstration (v0.1.37 batch: control theory and signals, DEC-56) |

## 1. Purpose and background

A link budget relates a radio link's design parameters to the pre-detection signal-to-noise ratio. The
Demonstration plots (S/N) in dB against the distance between transmitter and receiver on a logarithmic axis, from the
transmitter power, the gains of two parabolic antennas, the path loss with exponent n, the noise of the receiver and the
bandwidth, and labels the plot with the two antenna gains (caption and Details).

## 2. Scope

In scope: the Demonstration's controls, picture and behaviour, reproduced from its Manipulate code
(`docs/original-source/link-budget.txt`) and checked against its snapshots (`docs/original-snapshots/link-budget-*.png`) and saved
settings (`tests/golden/link-budget.original-states.json`). Out of scope: anything the original does not do; the port's
additions are the A- features.

## 3. Users and use cases

- UC-LB-01: a student explores the Demonstration in a browser, without Mathematica.
- UC-LB-02: the owner compares the port with the original (checklist `docs/checklists/link-budget.md`).

## 4. Features

| ID | Feature | Reason | Since | Verified by |
|----|----|----|----|----|
| F-LB-01 | Sliders (each under its own label, ControlPlacement -> Left): carrier frequency `fc` 2 … 40000 MHz (continuous), transmit and receive antenna diameters `Dtt`, `Dr` 0.001 … 40 m (step 0.0001), transmit power `Pt` −20 … 30 dBW (0.1), path-loss exponent `n` 2 … 6 (0.1), noise figure `F` 0.01 … 15 dB (0.1), antenna temperature `Ta` 2 … 500 K (5), bandwidth `Be` 0.01 … 2500 MHz (0.1); all Appearance -> "Labeled", ImageSize -> Tiny | the original's controls | v0.1.37 | e2e "has its controls with their defaults"; e2e "a control changes the picture"; M-LB-03 |
| F-LB-02 | Distance sliders `dmin` 10 … dmax − 1 and `dmax` dmin + 1 … 36 000 000 m (step 1): each limits the other (Dynamic ranges) | the original's controls | v0.1.37 | M-LB-05 |
| F-LB-03 | The plotted function: (S/N)dB = Pt + 20 log10(π Dtt/λ) − (20 log10(4π/λ) + 10 n log10 d) + 20 log10(π Dr/λ) − 10 log10(Be·10⁶) − 10 log10(1.38×10⁻²³ (Ta + 290 (10^(F/10) − 1))), λ = 3×10⁸/(fc·10⁶) | the link budget of the Details | v0.1.37 | unit "the link budget term by term" |
| F-LB-04 | Opening state = the notebook's initial settings: fc 1000, Dtt 1, Dr 1, Pt 10, n 2, F 2, Ta 290, Be 2, dmin 100, dmax 10000 | the Manipulate's saved settings | v0.1.37 | unit "the opening state"; e2e "has its controls with their defaults"; M-LB-02 |
| F-LB-05 | Caption and Details text (with the references) from the Demonstration | the original's explanation | v0.1.37 | M-LB-01 |
| F-LB-06 | `LogLinearPlot` over {d, dmin, dmax}: Frame, Axes, GridLines -> Full (lines at every major and minor tick), ImageSize {400, 350}, FrameLabel "distance (m)" and "(S/N)dB"; log ticks labelled 1, 2, 5 × 10ᵏ or 1, 5 × 10ᵏ as Mathematica labels them ("10⁴", "1×10⁵", …) | the original's picture | v0.1.37 | unit "the plotted range starts at 0"; e2e "the snapshot settings"; M-LB-06 |
| F-LB-07 | PlotLabel: "transmit antenna gain = … dB" and "receive antenna gain = … dB" on two lines, NumberForm[…, 4] | the original's labels | v0.1.37 | unit "the antenna gains of the four snapshots" |
| F-LB-08 | PlotRange -> All with AxesOrigin -> {0, 0}: the S/N axis reaches down to 0 (all four snapshots) | the original's plot range | v0.1.37 | unit "the plotted range starts at 0" |
| F-LB-09 | Four snapshot settings give the snapshots' pictures | faithfulness | v0.1.37 | e2e "the snapshot settings"; M-LB-06 |
| A-LB-01 | "Initial settings" button restores the opening state | Manipulate's Initial Settings | v0.1.37 | e2e "Initial settings restores the opening state" |
| A-LB-02 | Test and automation hook `window.__demo` (getState, setState, view, graphics) from the Manipulate layer | automated tests | v0.1.37 | e2e "has its controls with their defaults" |
| A-LB-03 | Start-up notice when the browser cannot run the page (DEC-22) | no empty page | v0.1.37 | e2e "start-up notice when" |
| A-LB-04 | Breadcrumb link to all demos | navigation | v0.1.37 | inventory |
| A-LB-05 | Credits footer (authors, title, source, licence, adaptation notice) | required by the licence (CC BY-NC-SA 3.0 §4) | v0.1.37 | e2e "attribution on" |
| A-LB-06 | This app can be bundled and served alone (§6.1) | owner rule R-A | v0.1.37 | e2e "bundle: link-budget runs from its own folder" |
| A-LB-07 | Landing-page thumbnail `thumbnail.webp`: the picture at the initial settings, made by `tools/make-thumbnails.mjs`; the card's picture links to this app | owner request 2026-11-05 | v0.1.37 | e2e "every card on the landing page has a thumbnail that loads" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|----|----|
| `*-fc` | F-LB-01 |
| `*-Dtt` | F-LB-01 |
| `*-Dr` | F-LB-01 |
| `*-Pt` | F-LB-01 |
| `*-n` | F-LB-01 |
| `*-F` | F-LB-01 |
| `*-Ta` | F-LB-01 |
| `*-Be` | F-LB-01 |
| `*-dmin` | F-LB-02 |
| `*-dmax` | F-LB-02 |
| `reset` | A-LB-01 |
| `crumbs` | A-LB-04 |
| `details` | F-LB-05 |
| `credits` | A-LB-05 |

## 6. Design

- `model.js` (pure): the link budget's terms `wavelength`, `antennaGain`, `pathLoss`, `noiseDensity` and `snr(state,
  d)`, written as the original's one-line formula; `evaluate(state)` → `{ view, graphics }` with `LogLinearPlot` of
  `shared/plot.js` (new in v0.1.37: plots in Log[d] with Mathematica's log ticks) and `GridLines: 'Full'`.
- `main.js`: one `Manipulate({…})` with the original's Column of labels (headings) and unlabelled sliders; the
  distance sliders' ranges are functions of the state (`dmin` up to `dmax − 1`, `dmax` from `dmin + 1`).
- Shared code used: `shared/plot.js` LogLinearPlot, GridLines, `shared/number-form.js` NumberForm.

### 6.1 Building and deploying this app alone

Owner rule R-A (2026-10-17): this one app can be taken out of the repository and hosted anywhere.

- Command, in the repository folder: `npm run bundle -- link-budget` → `dist/link-budget/`.
- Contents (generated with `node tools/bundle-app.mjs link-budget --update-docs`):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/link-budget/`) | 3 | `index.html`, `main.js`, `model.js` |
| `shared/` | 17 | `clock.js`, `graphics-extras.js`, `graphics.js`, `manipulate.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `number-form.js`, `plot.js`, `random.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `ui-extra.js`, `ui-interval.js`, `ui.js` |
| added by the bundler | 7 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/link-budget/DESIGN.md` |
<!-- bundle-contents:end -->

- Checked by e2e "bundle: link-budget runs from its own folder" (A-LB-06).

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

| ID | Kind | Description |
|----|----|----|
| D-LB-01 | deviation | The S/N axis: the port computes the range itself (0 and the curve's two ends, the curve being a straight line in log d) with 2 % and 4 % padding; Mathematica's padding may differ by a few pixels. |
| D-LB-02 | deviation | The horizontal axis line at S/N = 0 is drawn inside the frame (Axes -> True), as Mathematica draws axes inside a frame; its exact grey and the grid lines' (GrayLevel 0.87) are measured, not Mathematica's values. |
| N-LB-01 | note | Log ticks: the label rules (which multiples are labelled, "10⁴" against "1×10⁵") reproduce the four snapshots; other ranges are unverified (M-LB-06). |
| N-LB-02 | note | ToString[NumberForm[x, 4]] of the gains: four significant digits, trailing zeros dropped ("20.4", "6.067"). |

## 8. Proposed changes

No open proposal. Template (see [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md)):

| ID | Status | Requested by / date | Change | Reason | Acceptance criteria |
|----|--------|---------------------|--------|--------|---------------------|

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.37 | 2026-11-12 | generated by `tools/new-app.mjs` (example model and controls) |
| 2 | v0.1.37 | 2026-11-12 | the port (DEC-56): LogLinearPlot of the link budget, the original's controls and texts; no correctable error found (no switch) |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|----|----|----|----|
| I-LB-01 | Show the S/N value under the mouse | reading values | not in the original | F-LB-06 |
| I-LB-02 | Mark a gain below 0 dB (the Details say S/N is then not valid) | warns of invalid settings | not in the original | §11 |
| I-LB-03 | Reference values from Mathematica (export script, `tools/wolfram/export-control-reference.wls`) | tests against Mathematica itself | needs the owner's Mathematica | — |

## 11. Errors in the original (conceptual and mathematical)

Checked when the Demonstration's code was ported (owner rule R-C). Kind: conceptual, mathematical, numerical or
text; Status: open, kept or corrected in vX.Y.Z (the tests check these words). Not by Dr. Becker: findings here are
listed in the errata list as such and are not raised with him.

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|----|----|----|----|----|----|
| E-LB-01 | text | Details | "T₀ = 290⁰ K" — the degree sign is written as a superscript 0 (kelvin take no degree sign) | the text is kept | none on the results | kept |
