# Design document: Performance Characteristics for Step Response of an Underdamped Process

| | |
|---|---|
| Code version: | 0.1.39 |
| Document revision | 2 (2026-11-12) — the port |
| Status | describes the app as implemented; changes go through Proposed changes (§8) |
| Original | Wolfram Demonstrations Project, "Performance Characteristics for Step Response of an Underdamped Process", contributed by Housam Binous, Mohammad Mozahar Hossain and Ahmed Bellagi, published 2015-10-26 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/PerformanceCharacteristicsForStepResponseOfAnUnderdampedProc/> |
| Port files | `model.js` (one evaluation of the Manipulate body; pure), `main.js` (the Manipulate on `shared/manipulate.js`), `index.html` |
| Role in the project | new demonstration (v0.1.37 batch: control theory and signals, DEC-56) |

## 1. Purpose and background

The step response of an underdamped second-order process and its performance characteristics: overshoot a/b,
decay ratio c/a, period P, rise time t_r and time to the first peak t_p, drawn as arrows on the response or listed in a
table (caption, Details).

## 2. Scope

In scope: the Demonstration's controls, picture and behaviour, reproduced from its Manipulate code
(`docs/original-source/underdamped-step-performance.txt`) and checked against its snapshots (`docs/original-snapshots/underdamped-step-performance-*.png`) and saved
settings (`tests/golden/underdamped-step-performance.original-states.json`). Out of scope: anything the original does not do; the port's
additions are the A- features.

## 3. Users and use cases

- UC-UP-01: a student explores the Demonstration in a browser, without Mathematica.
- UC-UP-02: the owner compares the port with the original (checklist `docs/checklists/underdamped-step-performance.md`).

## 4. Features

| ID | Feature | Reason | Since | Verified by |
|----|----|----|----|----|
| F-UP-01 | Sliders steady-state gain K_g 0.1 … 10 (0.1), time constant τ 0.5 … 1.5 (0.1), damping coefficient ζ 0.05 … 0.3 (0.01), step magnitude M 5 … 10 (0.5); Labeled, Tiny, on the left | the original's controls | v0.1.37 | e2e "has its controls with their defaults"; e2e "a control changes the picture"; M-UP-03 |
| F-UP-02 | Setter response \| performance (`ctrl`) | the original's control | v0.1.37 | e2e "the performance table" |
| F-UP-03 | yanal[t], tp = πτ/√(1 − ζ²), the rise time FindRoot[yanal == M K_g, {t, 0, tp}], the two maxima FindMaximum from {tp, tp + 0.2} and from tp + P | the original's computation | v0.1.37 | unit "yanal is the step response"; unit "the rise time solves" |
| F-UP-04 | The response (red, thick) on 0 … 3P with GridLines and the arrows b (green), a (red), P (blue), c (black), the dashed setpoint line, AspectRatio 1.5 | the original's picture | v0.1.37 | e2e "the snapshot settings"; M-UP-05 |
| F-UP-05 | The table: property \| value, NumberForm {5, 4}, coloured rows (purple header, alternating blue-grey and green), Frame -> All | the original's table | v0.1.37 | unit "the table of snapshot 3" |
| F-UP-06 | Opening state: K_g 5, τ 1, ζ 0.2, M 5, response | the saved settings | v0.1.37 | unit "the opening state"; M-UP-02 |
| F-UP-07 | Caption and Details from the Demonstration | the original's explanation | v0.1.37 | M-UP-01 |
| F-UP-08 | PlotRange -> All of Show[…]: the range includes the P arrow above the first peak | the original's range | v0.1.37 | M-UP-05 |
| F-UP-09 | Four snapshot settings give the snapshots' pictures | faithfulness | v0.1.37 | e2e "the snapshot settings" |
| A-UP-01 | "Initial settings" button restores the opening state | Manipulate's Initial Settings | v0.1.37 | e2e "Initial settings restores the opening state" |
| A-UP-02 | Test and automation hook `window.__demo` (getState, setState, view, graphics) from the Manipulate layer | automated tests | v0.1.37 | e2e "has its controls with their defaults" |
| A-UP-03 | Start-up notice when the browser cannot run the page (DEC-22) | no empty page | v0.1.37 | e2e "start-up notice when" |
| A-UP-04 | Breadcrumb link to all demos | navigation | v0.1.37 | inventory |
| A-UP-05 | Credits footer (authors, title, source, licence, adaptation notice) | required by the licence (CC BY-NC-SA 3.0 §4) | v0.1.37 | e2e "attribution on" |
| A-UP-06 | This app can be bundled and served alone (§6.1) | owner rule R-A | v0.1.37 | e2e "bundle: underdamped-step-performance runs from its own folder" |
| A-UP-07 | Landing-page thumbnail `thumbnail.webp`: the picture at the initial settings, made by `tools/make-thumbnails.mjs`; the card's picture links to this app | owner request 2026-11-05 | v0.1.37 | e2e "every card on the landing page has a thumbnail that loads" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|----|----|
| `*-Kg` | F-UP-01 |
| `*-τ` | F-UP-01 |
| `*-ζ` | F-UP-01 |
| `*-M` | F-UP-01 |
| `setter-ctrl-*` | F-UP-02 |
| `reset` | A-UP-01 |
| `crumbs` | A-UP-04 |
| `details` | F-UP-07 |
| `credits` | A-UP-05 |

## 6. Design

- `model.js` (pure): `characteristics(state)` — yanal, FindRoot (two starting values: the secant method kept inside
  its bracket) and FindMaximum of `shared/numeric.js`; `evaluate(state)` → the plot with its arrows, or the table as a
  `Grid` (Frame, Background rows, ItemSize) in a picture of the same size.
- `main.js`: the original's controls on the left.

### 6.1 Building and deploying this app alone

Owner rule R-A (2026-10-17): this one app can be taken out of the repository and hosted anywhere.

- Command, in the repository folder: `npm run bundle -- underdamped-step-performance` → `dist/underdamped-step-performance/`.
- Contents (generated with `node tools/bundle-app.mjs underdamped-step-performance --update-docs`):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/underdamped-step-performance/`) | 3 | `index.html`, `main.js`, `model.js` |
| `shared/` | 19 | `clock.js`, `complex.js`, `graphics-extras.js`, `graphics.js`, `manipulate.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `number-form.js`, `numeric.js`, `plot.js`, `random.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `ui-extra.js`, `ui-interval.js`, `ui.js` |
| added by the bundler | 7 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/underdamped-step-performance/DESIGN.md` |
<!-- bundle-contents:end -->

- Checked by e2e "bundle: underdamped-step-performance runs from its own folder" (A-UP-06).

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

| ID | Kind | Description |
|----|----|----|
| D-UP-01 | deviation | The table is drawn by the port's Grid: column widths from ItemSize {9.3, 3.3} ems, colours computed with Lighter/Blend/Darker; borders and spacing approximate Mathematica's. |
| D-UP-02 | deviation | The plot's range is computed (0 … 3P, 0 … 1.1 × the first peak) to include the arrow and its label, as Show with PlotRange -> All does. |

## 8. Proposed changes

No open proposal. Template (see [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md)):

| ID | Status | Requested by / date | Change | Reason | Acceptance criteria |
|----|--------|---------------------|--------|--------|---------------------|

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.37 | 2026-11-12 | generated by `tools/new-app.mjs` (example model and controls) |
| 2 | v0.1.37 | 2026-11-12 | the port (DEC-56): the response with its arrows and the table (shared FindRoot, FindMaximum, Grid); no correctable error found (no switch) |
| 3 | v0.1.38 | 2026-11-12 | version number (v0.1.38: one new app, forward-kinematics; shared/traditional-form.js is new, and `Lighting -> "Neutral"` in shared/mma-lighting.js and graphics3d-view.js is opt-in); no change to this app's code, behaviour or picture |
| 4 | v0.1.39 | 2026-11-12 | version number (v0.1.39: selective testing — tools/affected.mjs and publish:tested run only the browser tests a change can affect; no app code changed); no change to this app's code, behaviour or picture |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|----|----|----|----|
| I-UP-01 | Show the settling time | another usual characteristic | not in the original | F-UP-05 |
| I-UP-02 | Allow ζ up to 1 | the whole underdamped range | labels crowd (the caption's reason) | F-UP-01 |
| I-UP-03 | Reference values from Mathematica | tests against Mathematica | owner's Mathematica | — |

## 11. Errors in the original (conceptual and mathematical)

Checked when the Demonstration's code was ported (owner rule R-C). Kind: conceptual, mathematical, numerical or
text; Status: open, kept or corrected in vX.Y.Z (the tests check these words). Not by Dr. Becker: findings here are
listed in the errata list as such and are not raised with him.

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|----|----|----|----|----|----|
| E-UP-01 | text | Caption | "step input U(t) = M/s": M/s is U(s), the Laplace transform | kept | none | kept |
