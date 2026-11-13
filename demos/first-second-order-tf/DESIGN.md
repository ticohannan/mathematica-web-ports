# Design document: First- and Second-Order Transfer Functions

| | |
|---|---|
| Code version: | 0.1.40 |
| Document revision | 2 (2026-11-12) — the port |
| Status | describes the app as implemented; changes go through Proposed changes (§8) |
| Original | Wolfram Demonstrations Project, "First- and Second-Order Transfer Functions", contributed by Rachael L. Baumann, Adam J. Johnston and John L. Falconer, published 2017-09-08 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/FirstAndSecondOrderTransferFunctions/> |
| Port files | `model.js` (one evaluation of the Manipulate body; pure), `main.js` (the Manipulate on `shared/manipulate.js`), `index.html` |
| Role in the project | new demonstration (v0.1.37 batch: control theory and signals, DEC-56) |

## 1. Purpose and background

The unit-step response of a first-order or second-order process with dead time (FOPDT, SOPDT), with a block
diagram of the calculation (step, Laplace transform, transfer function, inverse transform) and markers for the gain, the
dead time and, for FOPDT, the time constant at 63.2 % of the gain (caption, Details).

## 2. Scope

In scope: the Demonstration's controls, picture and behaviour, reproduced from its Manipulate code
(`docs/original-source/first-second-order-tf.txt`) and checked against its snapshots (`docs/original-snapshots/first-second-order-tf-*.png`) and saved
settings (`tests/golden/first-second-order-tf.original-states.json`). Out of scope: anything the original does not do; the port's
additions are the A- features.

## 3. Users and use cases

- UC-FS-01: a student explores the Demonstration in a browser, without Mathematica.
- UC-FS-02: the owner compares the port with the original (checklist `docs/checklists/first-second-order-tf.md`).

## 4. Features

| ID | Feature | Reason | Since | Verified by |
|----|----|----|----|----|
| F-FS-01 | Popup "transfer function model": FOPDT \| SOPDT | the original's control | v0.1.37 | e2e "has its controls with their defaults"; M-FS-03 |
| F-FS-02 | Sliders time constant τ 1 … 10 (0.1), process gain K 1 … 13 (1), dead time θ 1 … 10 (0.1), damping coefficient ζ −0.05 … 2 (0.05) shown only for SOPDT (PaneSelector); Labeled, in a Grid of two columns | the original's controls | v0.1.37 | e2e "a control changes the picture"; e2e "ζ is shown only for SOPDT" |
| F-FS-03 | The response: OutputResponse of K e^(−θs)/(τs + 1) or K e^(−θs)/(τ²s² + 2ζτs + 1) to the unit step on 0 … 100 | the original's model | v0.1.37 | unit "FOPDT: K (1 − e^(−(t − θ)/τ))"; unit "SOPDT: the three damping formulas" |
| F-FS-04 | Epilog: the step (blue), the gain line (dashed green) with its label, the dead-time line (dashed purple) with its label, for FOPDT the time constant (dashed magenta box, double arrow, "time constant τ = …", "0.632 K = …") | the original's markers | v0.1.37 | unit "FOPDT: K (1 − e^(−(t − θ)/τ))"; M-FS-05 |
| F-FS-05 | The block diagram inset at {50, 17.5}: step = 1 → ℒ(1) → 1/s → K e^(−θs)/(…) → Y(s) → ℒ⁻¹(Y(s)) → y(t) | the original's diagram | v0.1.37 | unit "the block diagram" |
| F-FS-06 | Opening state: FOPDT, τ 7, K 10, θ 2, ζ 0.2 | the saved settings | v0.1.37 | unit "the opening state"; e2e "has its controls with their defaults"; M-FS-02 |
| F-FS-07 | Caption and Details from the Demonstration | the original's explanation | v0.1.37 | M-FS-01 |
| F-FS-08 | Frame with left ticks labelled, PlotRange {{−1, 100}, {0, 20}}, FrameLabel "dimensionless time t", "time‐domain response y(t)", label size 17 | the original's picture | v0.1.37 | e2e "the snapshot settings" |
| F-FS-09 | Four snapshot settings give the snapshots' pictures | faithfulness | v0.1.37 | e2e "the snapshot settings"; unit "snapshot 2" |
| A-FS-01 | "Initial settings" button restores the opening state | Manipulate's Initial Settings | v0.1.37 | e2e "Initial settings restores the opening state" |
| A-FS-02 | Test and automation hook `window.__demo` (getState, setState, view, graphics) from the Manipulate layer | automated tests | v0.1.37 | e2e "has its controls with their defaults" |
| A-FS-03 | Start-up notice when the browser cannot run the page (DEC-22) | no empty page | v0.1.37 | e2e "start-up notice when" |
| A-FS-04 | Breadcrumb link to all demos | navigation | v0.1.37 | inventory |
| A-FS-05 | Credits footer (authors, title, source, licence, adaptation notice) | required by the licence (CC BY-NC-SA 3.0 §4) | v0.1.37 | e2e "attribution on" |
| A-FS-06 | This app can be bundled and served alone (§6.1) | owner rule R-A | v0.1.37 | e2e "bundle: first-second-order-tf runs from its own folder" |
| A-FS-07 | Landing-page thumbnail `thumbnail.webp`: the picture at the initial settings, made by `tools/make-thumbnails.mjs`; the card's picture links to this app | owner request 2026-11-05 | v0.1.37 | e2e "every card on the landing page has a thumbnail that loads" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|----|----|
| `popup-tab` | F-FS-01 |
| `*-τ` | F-FS-02 |
| `*-k` | F-FS-02 |
| `*-θ` | F-FS-02 |
| `*-ζ` | F-FS-02 |
| `reset` | A-FS-01 |
| `crumbs` | A-FS-04 |
| `details` | F-FS-07 |
| `credits` | A-FS-05 |

## 6. Design

- `model.js` (pure): `plantOf(state)` and `responseOf(state)` with `TransferFunctionModel` (dead time) and
  `OutputResponse` of `shared/control.js` (new in v0.1.37: the exact response by a matrix exponential, the dead time as
  a shift); `blockDiagram(tab)`; `evaluate(state)` → the Plot with its Epilog and the diagram as an Inset.
- `main.js`: ControlPlacement Top; the popup, then two Rows of two sliders; `Visible` on ζ (PaneSelector).

### 6.1 Building and deploying this app alone

Owner rule R-A (2026-10-17): this one app can be taken out of the repository and hosted anywhere.

- Command, in the repository folder: `npm run bundle -- first-second-order-tf` → `dist/first-second-order-tf/`.
- Contents (generated with `node tools/bundle-app.mjs first-second-order-tf --update-docs`):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/first-second-order-tf/`) | 3 | `index.html`, `main.js`, `model.js` |
| `shared/` | 22 | `clock.js`, `complex.js`, `control.js`, `graphics-extras.js`, `graphics.js`, `manipulate.js`, `matrix.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `number-form.js`, `ode.js`, `plot.js`, `poly.js`, `random.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `ui-extra.js`, `ui-interval.js`, `ui.js` |
| `vendor/ml-matrix/` | 2 | `index.js`, `matrix.umd.js` |
| added by the bundler | 8 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/first-second-order-tf/DESIGN.md`, `vendor/ml-matrix/LICENSE` |
<!-- bundle-contents:end -->

- Checked by e2e "bundle: first-second-order-tf runs from its own folder" (A-FS-06).

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

| ID | Kind | Description |
|----|----|----|
| D-FS-01 | deviation | The response is computed exactly (matrix exponential), where Mathematica's OutputResponse gives a closed form; they agree to rounding (unit tests against the Details' formulas). |
| D-FS-02 | deviation | The block diagram's fraction is drawn as two text lines with a bar; AspectRatio -> Full is reproduced by scaling the diagram's y coordinates. |
| D-FS-03 | deviation | The diagram is 520 px wide (560 in the original) so that it spans the plot area, which is narrower in the port. |
| Q-FS-01 | quirk kept | ζ can be set to −0.05 (negative damping): the response then grows without bound and leaves the fixed plot range. |

## 8. Proposed changes

No open proposal. Template (see [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md)):

| ID | Status | Requested by / date | Change | Reason | Acceptance criteria |
|----|--------|---------------------|--------|--------|---------------------|

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.37 | 2026-11-12 | generated by `tools/new-app.mjs` (example model and controls) |
| 2 | v0.1.37 | 2026-11-12 | the port (DEC-56): OutputResponse with dead time (shared control.js), block diagram and markers; no correctable error found (no switch) |
| 3 | v0.1.38 | 2026-11-12 | version number (v0.1.38: one new app, forward-kinematics; shared/traditional-form.js is new, and `Lighting -> "Neutral"` in shared/mma-lighting.js and graphics3d-view.js is opt-in); no change to this app's code, behaviour or picture |
| 4 | v0.1.39 | 2026-11-12 | version number (v0.1.39: selective testing — tools/affected.mjs and publish:tested run only the browser tests a change can affect; no app code changed); no change to this app's code, behaviour or picture |
| 5 | v0.1.40 | 2026-11-13 | version number (v0.1.40: three truss ports; shared/truss.js is new; shared/graphics.js gains Mouseover, RotatedText, rounded and line-less Framed, Arrowheads[Large] and heads at given places, Grid alignment at "=", styled scripts and fitPlotRange — the changes to existing drawing are a styled script keeping its style and the baseline after it, and framed or backed labels keeping their outer spaces); no change to this app's code or behaviour |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|----|----|----|----|
| I-FS-01 | Time-constant markers for SOPDT | symmetry with FOPDT | not in the original | F-FS-04 |
| I-FS-02 | A choice of input (ramp, impulse) | more of process dynamics | not in the original | F-FS-03 |
| I-FS-03 | Reference values from Mathematica | tests against Mathematica | owner's Mathematica | — |

## 11. Errors in the original (conceptual and mathematical)

Checked when the Demonstration's code was ported (owner rule R-C). Kind: conceptual, mathematical, numerical or
text; Status: open, kept or corrected in vX.Y.Z (the tests check these words). Not by Dr. Becker: findings here are
listed in the errata list as such and are not raised with him.

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|----|----|----|----|----|----|
| — | none found | — | — | — | — | — |
