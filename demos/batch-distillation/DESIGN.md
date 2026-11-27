# Design document: Batch Distillation

| | |
|---|---|
| Code version: | 0.1.44 |
| Document revision | 2 (2026-11-27) — the port |
| Status | describes the app as implemented; changes are proposed and approved before they are built |
| Original | Wolfram Demonstrations Project, "Batch Distillation", contributed by Neil Hendren and John L. Falconer, published 2019-05-30 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/BatchDistillation/> |
| Port files | `model.js` (one evaluation of the Manipulate body: the equilibrium data, the Rayleigh solution, the body's assignments and the drawing; pure), `main.js` (the Manipulate on `shared/manipulate.js`, the app-local "click to collect" trigger), `index.html` |

## 1. Purpose and background

One mole of a binary mixture of A and B undergoes a batch distillation without reflux. The vapour leaving the still is in
equilibrium with its liquid (invented equilibrium and boiling-point data for an ideal mixture, a minimum-boiling and a
maximum-boiling azeotrope); it is condensed and collected in a flask. Each click on "click to collect" evaporates the set
amount in 4 s; the flask is then set aside and an empty one put in its place, until 0.2 mol remain in the still or eight
flasks are full. The still's composition follows from the Rayleigh equation, the flask's from a mass balance; the
equilibrium temperature is shown at the thermometer, and the flasks set aside, the x–y plot or the T–x–y plot at the
right.

## 2. Scope

In scope: the Demonstration's controls, picture and behaviour, reproduced from its Manipulate code
(`docs/original-source/batch-distillation.txt`) and checked against its snapshots
(`docs/original-snapshots/batch-distillation-*.png`) and saved settings
(`tests/golden/batch-distillation.original-states.json`). Out of scope: anything the original does not do; the
port's additions are the A- features.

## 3. Users and use cases

- UC-BA-01: a student of separations follows a batch distillation flask by flask in a browser, without Mathematica: how
  the distillate gets poorer in the volatile component, how an azeotrope limits the separation.
- UC-BA-02: Tico compares the port with the original (checklist `docs/checklists/batch-distillation.md`).

## 4. Features

| ID | Feature | Reason | Since | Verified by |
|----|----|----|----|----|
| F-BA-01 | Slider "initial mole fraction in still" `{{z, 0.5}, 0.05, 0.95, 0.01, Appearance -> "Labeled", ImageSize -> 135}`, enabled only before the first collection and while nothing runs | the original's control | v0.1.44 | e2e "has its controls with their defaults"; e2e "click to collect fills a flask in 4 s, sets it aside and moves to the next stage" |
| F-BA-02 | Button "reset": stage = 1, the flasks emptied, z = 0.5; disabled while a collection runs | the original's control | v0.1.44 | e2e "reset empties the flasks; at 0.2 mol left the collection is disabled"; unit "reset empties the flasks and goes back to stage 1 with z = 0.5" |
| F-BA-03 | Popup menu of the mixture: no azeotrope, minimum boiling azeotrope, maximum boiling azeotrope (`az`), enabled as the slider of z | the original's control | v0.1.44 | e2e "the display buttons show the x–y and the T–x–y plots (snapshots 2 and 4)" |
| F-BA-04 | Slider "amount to evaporate (moles)" `{{molesToEvap, 0.1}, 0.05, 0.25, 0.01, Appearance -> "Labeled", ImageSize -> 120}`, disabled while inProg; the guard of the body lowers it to what leaves 0.2 mol in the still | the original's control | v0.1.44 | unit "the guard against boiling dry lowers the amount to evaporate to what leaves 0.2 mol" |
| F-BA-05 | "click to collect:" — Trigger of evapProg from 0 to 1 in 4 s (DefaultDuration 4, play button only, one repetition), disabled while inProg; at evapProg = 1 the body stores the flask's amount and mole fraction, sets evapProg = 0 and moves to the next stage | the original's control | v0.1.44 | e2e "click to collect fills a flask in 4 s, sets it aside and moves to the next stage"; unit "the end of a collection stores the flask, sets evapProg = 0 and moves to the next stage" |
| F-BA-06 | Radio buttons "display:" flasks, x–y plot, T–x–y plot (`graph`, Appearance Vertical) | the original's control | v0.1.44 | e2e "the display buttons show the x–y and the T–x–y plots (snapshots 2 and 4)" |
| F-BA-07 | The model: eqdata and eqtempdata of the three mixtures; the Rayleigh equation ∫ dx/(eqdata(x) − x) from xbf to the still's composition = Log[(1 − collectedVol)/molb] solved in the FindRoot range of the original's Which; the flask's mole fraction by the mass balance (eqdata[compb] while molt < 0.01); T = eqtempdata[compb] − 273.15; inProg = molb ≤ 0.2 or stage = 9 or evapProg > 0 | the original's model | v0.1.44 | unit "the Rayleigh solution satisfies its integral equation (an independent quadrature)"; unit "a run of collections keeps the mass balances, and the still empties to 0.2 mol"; unit "the invented equilibrium data and the azeotropes the FindRoot ranges keep apart" |
| F-BA-08 | The picture (PlotRange {{−3, 16}, {−0.8, 9}}, ImageSize {600, 340}): the still with its liquid level and surface, the heating coil, the glass column and condenser with the coolant arrows, the thermometer and its column, the collection flask filling, the labels x<sub>B, still</sub> and amount, y<sub>B</sub> with its arrow, x<sub>B, stage</sub> and amount, the temperature; tooltips on the coil, the flask, the thermometer and the labels | the original's picture | v0.1.44 | e2e "loads without errors and draws the still, the flask and the labels of snapshot 1"; unit "the snapshot settings give the stored xt and the numbers printed in the snapshot pictures" |
| F-BA-09 | Inset at {11, 4}, 300 × 340 px: the flasks set aside in two columns with their amount, mole fraction and number; the x–y plot with the diagonal and the still's point; the T–x–y plot with the bubble-point and dew-point lines, the two points and their labels | the original's picture | v0.1.44 | unit "the flasks set aside sit in two columns of the inset, numbered with their ordinal"; e2e "the display buttons show the x–y and the T–x–y plots (snapshots 2 and 4)" |
| F-BA-10 | Opening state: the notebook's live state (z = 0.5, no azeotrope, 0.1 mol, flasks shown, stage 1) | the saved state | v0.1.44 | unit "the opening state is the notebook live state"; e2e "has its controls with their defaults" |
| F-BA-11 | Caption and Details text from the Demonstration | the original's explanation | v0.1.44 | M-BA-01 |
| F-BA-12 | Controls above the picture in two rows, as the original's Column of Rows | the original's layout | v0.1.44 | inventory |
| A-BA-01 | "Initial settings" button restores the opening state | Manipulate's Initial Settings | v0.1.44 | e2e "Initial settings restores the opening state" |
| A-BA-02 | Test and automation hook `window.__demo` (getState, setState, view, graphics) from the Manipulate layer | automated tests | v0.1.44 | e2e "the display buttons show the x–y and the T–x–y plots (snapshots 2 and 4)" |
| A-BA-03 | Start-up notice when the browser cannot run the page | no empty page | v0.1.44 | e2e "start-up notice when" |
| A-BA-04 | Breadcrumb link to all demos | navigation | v0.1.44 | inventory |
| A-BA-05 | Credits footer (authors, title, source, licence, adaptation notice) | required by the licence (CC BY-NC-SA 3.0 §4) | v0.1.44 | e2e "attribution on" |
| A-BA-06 | This app can be bundled and served alone (§6.1) | rule 7 | v0.1.44 | e2e "bundle: batch-distillation runs from its own folder" |
| A-BA-07 | Landing-page thumbnail `thumbnail.webp`: the picture at the initial settings, made by `tools/make-thumbnails.mjs`; the card's picture links to this app | requested 2026-11-05 | v0.1.44 | e2e "every card on the landing page has a thumbnail that loads" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|----|----|
| `slider-z` | F-BA-01 |
| `value-z` | F-BA-01 |
| `plus-z` | F-BA-01 |
| `play-z` | F-BA-01 |
| `stepback-z` | F-BA-01 |
| `stepfwd-z` | F-BA-01 |
| `button-reset-flasks` | F-BA-02 |
| `popup-az` | F-BA-03 |
| `slider-molesToEvap` | F-BA-04 |
| `value-molesToEvap` | F-BA-04 |
| `plus-molesToEvap` | F-BA-04 |
| `play-molesToEvap` | F-BA-04 |
| `stepback-molesToEvap` | F-BA-04 |
| `stepfwd-molesToEvap` | F-BA-04 |
| `trigger-play-evapProg` | F-BA-05 |
| `radio-graph-1` | F-BA-06 |
| `radio-graph-2` | F-BA-06 |
| `radio-graph-3` | F-BA-06 |
| `reset` | A-BA-01 |
| `crumbs` | A-BA-04 |
| `details` | F-BA-11 |
| `credits` | A-BA-05 |

## 6. Design

- `model.js`: `eqdata`, `eqtempdata`, `findRootRange`, `rayleigh` (the integral followed from the still's composition in
  the direction its sign gives, by Gauss–Legendre quadrature, and the crossing step bisected), `compute(state)` (the
  Module's numbers), `step(state)` (the body's assignments, repeated while they change something, as the Manipulate
  evaluates its body again when a tracked variable changes), `reset`, the drawing of the original's Initialization
  (FilledCurve of BSplineCurve as polygons through `bsplinePoints`), `evaluate(state)` → `{ view, state, graphics }`.
  Test ids: `still-liquid`, `still-surface`, `coil`, `receiver`, `thermometer`, `thermometer-column`, `label-*`,
  `arrow-vapor`, `inset-<graph>`, `flask-<n>`, `flask-label-<n>`, `flask-number-<n>`, `xy-point`, `diagonal`,
  `bubble-point`, `dew-point`.
- `main.js`: one `Manipulate({…})`, ControlPlacement Top, two Rows of controls, the hidden variables; the app-local
  control `collectTrigger` (a play button running evapProg from 0 to 1 in 4 s and stopping at 1, where the body resets
  it); `after` enables and disables the trigger and the button "reset" and shows the tooltip of the amount when boilDry.

### 6.1 Building and deploying this app alone

Rule 7 of docs/DESIGN_PROCESS.md: this one app can be taken out of the repository and hosted anywhere.

- Command, in the repository folder: `npm run bundle -- batch-distillation` → `dist/batch-distillation/`.
- Contents (generated with `node tools/bundle-app.mjs batch-distillation --update-docs`):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/batch-distillation/`) | 3 | `index.html`, `main.js`, `model.js` |
| `shared/` | 17 | `clock.js`, `graphics-extras.js`, `graphics.js`, `manipulate.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `number-form.js`, `plot.js`, `random.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `ui-extra.js`, `ui-interval.js`, `ui.js` |
| added by the bundler | 7 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/batch-distillation/DESIGN.md` |
<!-- bundle-contents:end -->

- Checked by e2e "bundle: batch-distillation runs from its own folder" (A-BA-06).

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

| ID | Kind | Description |
|----|----|----|
| D-BA-01 | deviation | The Rayleigh equation is solved by following the integral from the still's composition and bisecting the crossing step (FindRoot with NIntegrate in the original); the roots agree to about 10⁻⁹, and the stored xt of the four snapshots is reproduced to 10⁻¹². |
| D-BA-02 | deviation | "click to collect" is an app-local play button (the layer's Trigger runs on when the body resets its variable at the end of a collection); it is disabled as the original's Enabled -> Dynamic@Not[inProg]. |
| D-BA-03 | deviation | The lines of a two-line label (Column) are centred on each other; Mathematica aligns them at the left. |
| D-BA-04 | deviation | AspectRatio -> Full of the inset (ImageSize {300, 340}) is given as the number 340/300: the plot's frame fills the inset's width, its height follows. |
| D-BA-05 | deviation | The tooltips on the bubble-point and dew-point lines and on the diagonal are left out; the tooltips of the picture's objects and labels are kept. |
| Q-BA-01 | quirk kept | The tooltip "Boiling the pot dry will damage it!" is shown only while boilDry is True; the body, evaluated again after it lowered the amount, usually sets boilDry back to False. |
| Q-BA-02 | quirk kept | The process stops after eight flasks (stage = 9) even when more than 0.2 mol remain; the caption mentions only the 0.2 mol. |
| Q-BA-03 | quirk kept | The mole fractions of the flasks are clipped to 0.99 on their labels. |
| Q-BA-04 | quirk kept | The label of the first flask column can be covered by the white top of the second column's flask (drawn after it), as in the original. |
| N-BA-01 | note | Checked (unit tests): the stored xt of the four snapshots and the numbers printed in their pictures (86.4, 81.9, 104.0 and 86.9 °C; 0.74, 0.59, 0.54 and 0.73); the Rayleigh roots against an independent Simpson quadrature; the overall and component balances after every flask of a run. |

## 8. Proposed changes

Proposals for this app are tracked separately.

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.44 | 2026-11-27 | generated by `tools/new-app.mjs` (example model and controls) |
| 2 | v0.1.44 | 2026-11-27 | the port: the still, the condenser and the flasks, the Rayleigh solution, the collections flask by flask, the x–y and T–x–y plots and the controls |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|----|----|----|----|
| I-BA-01 | Show the average mole fraction of all the distillate (x<sub>D, avg</sub> of the Details) | the result of the batch at a glance | not in the original | F-BA-09 |
| I-BA-02 | Mark the azeotrope on the x–y and T–x–y plots | where the separation stops can be seen | not in the original | F-BA-09 |
| I-BA-03 | A pause button for a collection | a collection can be followed step by step | not in the original (play button only) | F-BA-05 |

## 11. Errors in the original (conceptual and mathematical)

Checked when the Demonstration's code was ported (rule 9), with the checks of N-BA-01. Kind: conceptual,
mathematical, numerical or text; Status: open, kept or corrected in vX.Y.Z (the tests check these words).

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|------|-----------------------|--------------------------|--------------------|-------------------------|--------|
| E-BA-01 | text | the caption's "Click \"reset\" to display one of the plots or to start over" | the radio buttons "display:" choose the plot; reset empties the flasks and starts over | kept (the caption is the original's text) | the caption would describe the controls as they work | kept |
| E-BA-02 | text | the Details' "D<sub>i</sub> (mol) is the mass of distillate" and "final mass" | amounts in moles, not masses | kept (the Details are the original's text) | the Details' quantities would read as the picture's (mol) | kept |
