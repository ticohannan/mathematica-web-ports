# Design document: Harmonic Distortion of Nonlinear Transfer Function

| | |
|---|---|
| Code version: | 0.1.40 |
| Document revision | 2 (2026-11-12) — the port |
| Status | describes the app as implemented; changes go through Proposed changes (§8) |
| Original | Wolfram Demonstrations Project, "Harmonic Distortion of Nonlinear Transfer Function", contributed by Carsten Roppel, published 2011-03-07 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/HarmonicDistortionOfNonlinearTransferFunction/> |
| Port files | `model.js` (one evaluation of the Manipulate body; pure), `main.js` (the Manipulate on `shared/manipulate.js`), `index.html` |
| Role in the project | new demonstration (v0.1.37 batch: control theory and signals, DEC-56) |

## 1. Purpose and background

A sine of 1 kHz and amplitude 1 passes through the nonlinear transfer function y = x + c₁x² + c₂x³, optionally
clipped at ±level. The Demonstration shows 5 ms of the output and its magnitude spectrum (the DFT of 4096 samples at 16
kHz), linear or in decibels: c₁ creates even harmonics, c₂ and symmetric clipping odd ones (caption).

## 2. Scope

In scope: the Demonstration's controls, picture and behaviour, reproduced from its Manipulate code
(`docs/original-source/harmonic-distortion.txt`) and checked against its snapshots (`docs/original-snapshots/harmonic-distortion-*.png`) and saved
settings (`tests/golden/harmonic-distortion.original-states.json`). Out of scope: anything the original does not do; the port's
additions are the A- features.

## 3. Users and use cases

- UC-HD-01: a student explores the Demonstration in a browser, without Mathematica.
- UC-HD-02: the owner compares the port with the original (checklist `docs/checklists/harmonic-distortion.md`), with the errors of the original kept or corrected.

## 4. Features

| ID | Feature | Reason | Since | Verified by |
|----|----|----|----|----|
| F-HD-01 | Sliders c₁ and c₂ −0.5 … 0.5 (step 0.01, Labeled) under the bold heading "coefficients" | the original's controls | v0.1.37 | e2e "has its controls with their defaults"; e2e "a control changes the picture"; M-HD-03 |
| F-HD-02 | Checkbox "clipping" (`{True, False}`) and the slider "level" 0.5 … 1 (0.01), shown only while clipping is on (PaneSelector) | the original's controls | v0.1.37 | e2e "the level slider is shown only while clipping is on" |
| F-HD-03 | Setter "scale": linear \| decibel | the original's controls | v0.1.37 | e2e "decibel scale" |
| F-HD-04 | Opening state = the initial settings: c₁ = c₂ = 0, clipping off, level 0.8, scale linear | the saved settings | v0.1.37 | unit "the opening state"; e2e "has its controls with their defaults"; M-HD-02 |
| F-HD-05 | Caption and Details (the original's placeholder Details, E-HD-02) | the original's explanation | v0.1.37 | M-HD-01 |
| F-HD-06 | Initialization: x = Sin[2π f₀ i] for i = 0, 1/fs, … (4096 samples, f₀ = 1000, fs = 16000); y = x + c₁x² + c₂x³; Clip[y, {−level, level}] | the original's model | v0.1.37 | unit "the opening state and the Initialization data"; unit "c1 gives even harmonics" |
| F-HD-07 | Spectrum (2/nbr) Take[Abs[Fourier[z, FourierParameters -> {1, −1}]], nbr/2] against f = 0, fs/nbr, …; decibel: 20 log10(spectrum + 2×10⁻⁵) | the original's DFT | v0.1.37 | unit "the spectrum of the pure sine"; unit "clipping at 0.7" |
| F-HD-08 | GraphicsColumn of two joined ListPlots (AspectRatio 0.4, ImageSize {400, 200}): the first 81 samples in blue, PlotRange {−2, 2}; the spectrum, PlotRange {−0.1, 1.5} or {−100, 3} | the original's pictures | v0.1.37 | e2e "the snapshot settings"; M-HD-05 |
| F-HD-09 | Four snapshot settings give the snapshots' pictures | faithfulness | v0.1.37 | e2e "the snapshot settings" |
| A-HD-01 | "Initial settings" button restores the opening state | Manipulate's Initial Settings | v0.1.37 | e2e "Initial settings restores the opening state" |
| A-HD-02 | Test and automation hook `window.__demo` (getState, setState, view, graphics) from the Manipulate layer | automated tests | v0.1.37 | e2e "has its controls with their defaults" |
| A-HD-03 | Start-up notice when the browser cannot run the page (DEC-22) | no empty page | v0.1.37 | e2e "start-up notice when" |
| A-HD-04 | Breadcrumb link to all demos | navigation | v0.1.37 | inventory |
| A-HD-05 | Credits footer (authors, title, source, licence, adaptation notice) | required by the licence (CC BY-NC-SA 3.0 §4) | v0.1.37 | e2e "attribution on" |
| A-HD-06 | This app can be bundled and served alone (§6.1) | owner rule R-A | v0.1.37 | e2e "bundle: harmonic-distortion runs from its own folder" |
| A-HD-07 | Landing-page thumbnail `thumbnail.webp`: the picture at the initial settings, made by `tools/make-thumbnails.mjs`; the card's picture links to this app | owner request 2026-11-05 | v0.1.37 | e2e "every card on the landing page has a thumbnail that loads" |
| A-HD-08 | Switch "errors of the original: kept \| corrected" beside "Initial settings" (variable `errata`, default kept = the original's behaviour). "corrected" changes only E-HD-01 (§11; `errata-mode.js`); the differences are listed on the page under "Errors of the original: what "corrected" changes" | owner request 2026-11-12: every code-level error of the original can be switched between the original's behaviour and its correction | v0.1.37 | unit "corrected mode (E-HD)"; e2e "errata switch on harmonic-distortion: kept is the original, corrected changes the listed result" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|----|----|
| `*-c1` | F-HD-01 |
| `*-c2` | F-HD-01 |
| `check-clipping` | F-HD-02 |
| `*-level` | F-HD-02 |
| `setter-scale-*` | F-HD-03 |
| `reset` | A-HD-01 |
| `crumbs` | A-HD-04 |
| `details` | F-HD-05 |
| `credits` | A-HD-05 |
| `setter-errata-*` | A-HD-08 |
| `errata-details` | A-HD-08 |

## 6. Design

- `model.js` (pure): the Initialization's samples `X`, `output(state)` (the transfer function and Clip),
  `spectrum(z, corrected)` with `Fourier` of `shared/numeric.js` (new in v0.1.37: Mathematica's FourierParameters, a
  radix-2 FFT for the 4096 samples), the time and frequency grids `T`, `FREQ`; `evaluate(state)` → two ListPlots.
- `main.js`: the original's controls; `Visible: (s) => s.clipping` on the level slider (the new shared option for
  PaneSelector); `ErrataControl(CORRECTIONS)` (`errata-mode.js`).
- The page stacks the two pictures (`.pictures`), as GraphicsColumn.

### 6.1 Building and deploying this app alone

Owner rule R-A (2026-10-17): this one app can be taken out of the repository and hosted anywhere.

- Command, in the repository folder: `npm run bundle -- harmonic-distortion` → `dist/harmonic-distortion/`.
- Contents (generated with `node tools/bundle-app.mjs harmonic-distortion --update-docs`):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/harmonic-distortion/`) | 4 | `errata-mode.js`, `index.html`, `main.js`, `model.js` |
| `shared/` | 19 | `clock.js`, `complex.js`, `errata.js`, `graphics-extras.js`, `graphics.js`, `manipulate.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `numeric.js`, `plot.js`, `random.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `ui-extra.js`, `ui-interval.js`, `ui.js` |
| added by the bundler | 7 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/harmonic-distortion/DESIGN.md` |
<!-- bundle-contents:end -->

- Checked by e2e "bundle: harmonic-distortion runs from its own folder" (A-HD-06).

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

| ID | Kind | Description |
|----|----|----|
| D-HD-01 | deviation | FrameLabel -> {{None, None}, {"time[s]", "signal"}} puts "signal" (and "magnitude spectrum (DFT)") on the TOP of the frame; the port draws them as plot labels above the frame. GraphicsColumn's Spacings -> {−20, 10} (which crops the left edge of both plots in the snapshots) is not reproduced. |
| D-HD-02 | deviation | Tick steps of the vertical axes set to Mathematica's (1 for the signal, 0.5 / 20 for the spectrum), as the snapshots show; the automatic steps of the port's frame would be finer. |
| N-HD-01 | note | f₀/fs = 1/16 and 4096 samples: exactly 256 periods, so each harmonic falls on one DFT bin (bin 256 k) and there is no leakage. |

## 8. Proposed changes

No open proposal. Template (see [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md)):

| ID | Status | Requested by / date | Change | Reason | Acceptance criteria |
|----|--------|---------------------|--------|--------|---------------------|
| P-HD-01 | approved (owner request 2026-11-12), implemented in v0.1.37 as A-HD-08 | owner / 2026-11-12 | Switch "errors of the original: kept \| corrected": mark the current version, then offer each logical error of the original as a gated correction; the corrected mode changes only the code needed for E-HD-01 | the errors of the original were reproduced bug for bug; the owner wants to compare the original with a corrected version and to be able to go back | the default is the original (golden data, harness replays and parity unchanged); each correction has a unit test with an independently derived expected value and the browser test of the switch; the page documents the differences |

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.37 | 2026-11-12 | generated by `tools/new-app.mjs` (example model and controls) |
| 2 | v0.1.37 | 2026-11-12 | the port (DEC-56): two ListPlots of the signal and its DFT (shared Fourier), the level slider shown only while clipping; switch for E-HD-01 |
| 3 | v0.1.38 | 2026-11-12 | version number (v0.1.38: one new app, forward-kinematics; shared/traditional-form.js is new, and `Lighting -> "Neutral"` in shared/mma-lighting.js and graphics3d-view.js is opt-in); no change to this app's code, behaviour or picture |
| 4 | v0.1.39 | 2026-11-12 | version number (v0.1.39: selective testing — tools/affected.mjs and publish:tested run only the browser tests a change can affect; no app code changed); no change to this app's code, behaviour or picture |
| 5 | v0.1.40 | 2026-11-13 | version number (v0.1.40: three truss ports; shared/truss.js is new; shared/graphics.js gains Mouseover, RotatedText, rounded and line-less Framed, Arrowheads[Large] and heads at given places, Grid alignment at "=", styled scripts and fitPlotRange — the changes to existing drawing are a styled script keeping its style and the baseline after it, and framed or backed labels keeping their outer spaces); no change to this app's code or behaviour |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|----|----|----|----|
| I-HD-01 | Harmonic distortion (THD) in a label | a single figure of merit | not in the original | F-HD-07 |
| I-HD-02 | Asymmetric clipping levels | even harmonics from clipping | not in the original | F-HD-06 |
| I-HD-03 | Reference values from Mathematica (`tools/wolfram/export-control-reference.wls`) | tests against Mathematica | owner's Mathematica | — |

## 11. Errors in the original (conceptual and mathematical)

Checked when the Demonstration's code was ported (owner rule R-C). Kind: conceptual, mathematical, numerical or
text; Status: open, kept or corrected in vX.Y.Z (the tests check these words). Not by Dr. Becker: findings here are
listed in the errata list as such and are not raised with him.

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|----|----|----|----|----|----|
| E-HD-01 | mathematical | spectrum = (2/nbr) Take[Abs[Fourier[…]], nbr/2] | the factor 2 (one-sided spectrum of a real signal) is applied to the DC bin too, so a mean value is drawn at twice its size (c₁ = 0.5: mean 0.25 drawn as 0.5) | kept: every bin 2/nbr \|DFT\| **Switch:** with "errors of the original: corrected" (A-HD-08, v0.1.37) — the DC bin is 1/N ∣DFT∣ (the mean of the signal, 0.25 in that example); the other bins are unchanged. | the 0 Hz line halves; nothing else changes | switchable since v0.1.37 |
| E-HD-02 | text | Details and References | the template's placeholders ("Details, references or citation information", "References for demonstration.") were published | the texts are kept | none | kept |
| E-HD-03 | text | Caption | "nonlinear input signals of the form y = …" — y is the output of the nonlinear transfer function, x the input | the text is kept | none | kept |
