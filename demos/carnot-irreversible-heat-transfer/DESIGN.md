# Design document: Carnot Cycles with Irreversible Heat Transfer

| | |
|---|---|
| Code version: | 0.1.44 |
| Document revision | 2 (2026-11-27) — the port |
| Status | describes the app as implemented; changes are proposed and approved before they are built |
| Original | Wolfram Demonstrations Project, "Carnot Cycles with Irreversible Heat Transfer", contributed by Rachael L. Baumann, Megan Maguire and John L. Falconer, published 2014-07-02 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/CarnotCyclesWithIrreversibleHeatTransfer/> |
| Port files | `model.js` (one evaluation of the Manipulate body; pure), `main.js` (the Manipulate on `shared/manipulate.js`), `errata-mode.js` (the correction of the switch), `index.html` |

## 1. Purpose and background

A Carnot cycle between a hot and a cold reservoir, as a heat engine or as a heat pump, with irreversible heat
transfer: the cycle runs between its own temperatures *T*<sub>H</sub> and *T*<sub>C</sub>, which differ from the
reservoirs' *T*<sub>h</sub> and *T*<sub>c</sub> by the two slider values Δ*T*<sub>1</sub> and Δ*T*<sub>2</sub>. The picture is a
schematic: the cycle as a circle with its four strokes, arrows for the heats and the work, and boxes with the heats
*Q*, the work *W*<sub>S</sub>, the efficiency *η* (engine) or coefficient of performance *COP* (pump) and the entropy
changes of the reservoirs and their total. With both differences zero the process is reversible (Δ*S*<sub>total</sub> =
0); larger differences lower η or COP and raise Δ*S*<sub>total</sub>. The engine keeps *Q*<sub>H</sub> = 1250 J, the pump
*Q*<sub>C</sub> = 600 J (caption; Details).

## 2. Scope

In scope: the Demonstration's controls, picture and behaviour, reproduced from its Manipulate code
(`docs/original-source/carnot-irreversible-heat-transfer.txt`) and checked against its snapshots
(`docs/original-snapshots/carnot-irreversible-heat-transfer-*.png`) and saved settings
(`tests/golden/carnot-irreversible-heat-transfer.original-states.json`). Out of scope: anything the original does not do; the
port's additions are the A- features.

## 3. Users and use cases

- UC-CI-01: a student explores the Demonstration in a browser, without Mathematica: how irreversible heat transfer
  lowers the efficiency of an engine or the COP of a pump, and how the entropy of the reservoirs grows.
- UC-CI-02: Tico compares the port with the original (checklist `docs/checklists/carnot-irreversible-heat-transfer.md`),
  with the error of the original kept or corrected.

## 4. Features

| ID | Feature | Reason | Since | Verified by |
|----|----|----|----|----|
| F-CI-01 | Setter `{{csb, 1, ""}, {1 -> " heat engine ", 2 -> " heat pump "}, Setter}` | the original's control | v0.1.44 | e2e "the heat pump setter switches the cycle, the work box and the performance label" |
| F-CI-02 | Sliders \|T<sub>h</sub> − T<sub>H</sub>\| `{{ΔT1, 10, …}, 0, 50, 2}` and \|T<sub>c</sub> − T<sub>C</sub>\| `{{ΔT2, 12, …}, 0, 50, 2}`, Appearance "Labeled", ImageSize Small, all in one row with the setter (`Grid[{{…}}]`) | the original's controls | v0.1.44 | e2e "the arrow keys move a temperature difference in steps of 2"; e2e "has its controls with their defaults" |
| F-CI-03 | The Module: Th = 500 K (engine) or 325 K (pump), Tc = 275 K; TH = Th ∓ ΔT1, TC = Tc ± ΔT2; engine QH = −1250 J, QC = −QH TC/TH; pump QC = −600 J, QH = −QC TH/TC; η = (TH − TC)/TH, COP = TC/(TH − TC); W = η QH (engine) or −QC/COP (pump); ΔSh = QH/Th, ΔSc = QC/Tc | the original's model | v0.1.44 | unit "heat engine: Qh = -1250 J, Qc and the work from the engine temperatures"; unit "heat pump: Qc = -600 J, COP = TC/(TH - TC), W = -QC/COP"; unit "without temperature differences the total entropy change is zero (reversible)" |
| F-CI-04 | The picture `Show[cycle, labels, ImageSize -> {600, 430}]`: the circle of radius 2 with the four strokes (blue isotherms, green adiabats, Thick, three heads each), the work arrow, the arrows to and from the reservoirs (heads at the end for the engine, at the start for the pump), the reservoir lines, the seven boxes (EdgeForm Black; work LightRed for the engine, LightGreen for the pump; η/COP white; total LightBlue; the others LightYellow) | the original's picture | v0.1.44 | unit "the picture: the cycle, the arrows, the seven boxes and the labels"; unit "the stroke heads: at 1/3, 2/3 and the end for the engine, backwards at 0, 1/3 and 2/3 for the pump"; e2e "loads without errors and draws the cycle, the reservoirs, the boxes and the labels" |
| F-CI-05 | The labels (Style 18): the reservoirs, W<sub>S</sub> = NumberForm[W, {4, 0}] J, η = NumberForm[η, 2] or COP = NumberForm[COP, 2], the four temperatures in K, the four heats (Q<sub>h</sub> = QH and Q<sub>c</sub> = QC at the reservoirs, Q<sub>H</sub> = −QH and Q<sub>C</sub> = −QC at the cycle) as NumberForm[…, {4, 0}] J, the three entropy changes as NumberForm[…, {3, 2}] J/K — in Mathematica's number format ("−518.", "0.4") | the original's labels | v0.1.44 | unit "the snapshot settings give the numbers printed in the snapshot pictures"; e2e "the snapshot settings show the snapshots numbers" |
| F-CI-06 | Opening state csb = 1, ΔT1 = 10, ΔT2 = 12 (the notebook's live state = its initial settings) | the saved state | v0.1.44 | unit "the opening state is the notebook live state"; e2e "has its controls with their defaults" |
| F-CI-07 | Caption and Details text from the Demonstration | the original's explanation | v0.1.44 | M-CI-01 |
| F-CI-08 | Controls above the picture (a Manipulate without ControlPlacement) | the original's layout | v0.1.44 | inventory |
| A-CI-01 | "Initial settings" button restores the opening state | Manipulate's Initial Settings | v0.1.44 | e2e "Initial settings restores the opening state" |
| A-CI-02 | Test and automation hook `window.__demo` (getState, setState, view, graphics) from the Manipulate layer | automated tests | v0.1.44 | e2e "the snapshot settings show the snapshots numbers" |
| A-CI-03 | Start-up notice when the browser cannot run the page | no empty page | v0.1.44 | e2e "start-up notice when" |
| A-CI-04 | Breadcrumb link to all demos | navigation | v0.1.44 | inventory |
| A-CI-05 | Credits footer (authors, title, source, licence, adaptation notice) | required by the licence (CC BY-NC-SA 3.0 §4) | v0.1.44 | e2e "attribution on" |
| A-CI-06 | This app can be bundled and served alone (§6.1) | rule 7 | v0.1.44 | e2e "bundle: carnot-irreversible-heat-transfer runs from its own folder" |
| A-CI-07 | Landing-page thumbnail `thumbnail.webp`: the picture at the initial settings, made by `tools/make-thumbnails.mjs`; the card's picture links to this app | requested 2026-11-05 | v0.1.44 | e2e "every card on the landing page has a thumbnail that loads" |
| A-CI-08 | Switch "errors of the original: kept \| corrected" beside "Initial settings" (variable `errata`, default kept = the original's behaviour). "corrected" changes only E-CI-01 (§11; `errata-mode.js`); the differences are listed on the page under "Errors of the original: what "corrected" changes" | requested 2026-11-17: every code-level error of the original can be switched between the original's behaviour and its correction | v0.1.44 | unit "corrected mode (E-CI)"; e2e "errata switch on carnot-irreversible-heat-transfer: kept is the original, corrected changes the listed result" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|----|----|
| `setter-csb-*` | F-CI-01 |
| `slider-dT1` | F-CI-02 |
| `value-dT1` | F-CI-02 |
| `plus-dT1` | F-CI-02 |
| `play-dT1` | F-CI-02 |
| `stepback-dT1` | F-CI-02 |
| `stepfwd-dT1` | F-CI-02 |
| `slider-dT2` | F-CI-02 |
| `value-dT2` | F-CI-02 |
| `plus-dT2` | F-CI-02 |
| `play-dT2` | F-CI-02 |
| `stepback-dT2` | F-CI-02 |
| `stepfwd-dT2` | F-CI-02 |
| `reset` | A-CI-01 |
| `crumbs` | A-CI-04 |
| `details` | F-CI-07 |
| `credits` | A-CI-05 |
| `setter-errata-*` | A-CI-08 |
| `errata-details` | A-CI-08 |

## 6. Design

- `model.js` (pure): `cycle(state)` (the Module's numbers in the original's order; the mutual definitions of QH and
  QC resolved as Mathematica's evaluation does), `evaluate(state)` → `{ view, graphics }`: the cycle Graphics and the
  labels Graphics of the original as one list, `numberFormString` of `shared/number-form.js` for NumberForm with the
  typographic minus. Test ids: `cycle-circle`, `cycle-strokes`, `arrow-work`, `arrow-hot`, `arrow-cold`,
  `hot-reservoir`, `cold-reservoir`, `box-*`, `label-*`.
- `main.js`: one `Manipulate({…})`, ControlPlacement Top, the setter and the two sliders in one Row (the original's
  one-row Grid), the switch `ErrataControl(CORRECTIONS)`; PlotRange given (D-CI-01).
- `errata-mode.js`: the correction of E-CI-01 (§11).

### 6.1 Building and deploying this app alone

Rule 7 of docs/DESIGN_PROCESS.md: this one app can be taken out of the repository and hosted anywhere.

- Command, in the repository folder: `npm run bundle -- carnot-irreversible-heat-transfer` → `dist/carnot-irreversible-heat-transfer/`.
- Contents (generated with `node tools/bundle-app.mjs carnot-irreversible-heat-transfer --update-docs`):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/carnot-irreversible-heat-transfer/`) | 4 | `errata-mode.js`, `index.html`, `main.js`, `model.js` |
| `shared/` | 17 | `clock.js`, `errata.js`, `graphics-extras.js`, `graphics.js`, `manipulate.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `number-form.js`, `random.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `ui-extra.js`, `ui-interval.js`, `ui.js` |
| added by the bundler | 7 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/carnot-irreversible-heat-transfer/DESIGN.md` |
<!-- bundle-contents:end -->

- Checked by e2e "bundle: carnot-irreversible-heat-transfer runs from its own folder" (A-CI-06).

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

| ID | Kind | Description |
|----|----|----|
| D-CI-01 | deviation | PlotRange is given: x −6.554 … 9.254, y −5.665 … 5.665 — Mathematica's automatic range of the primitives (x −6.25 … 8.95, y −5 … 5) with its 2 % padding, and the room the ImageSize {600, 430} leaves above and below (the layer needs a PlotRange); measured on the snapshots: 38 px per unit, the reservoir labels above and below the lines. |
| D-CI-02 | deviation | `Arrowheads[{0, 0.03, 0.03, 0.03}]` (and its Reverse for the pump) puts heads at the fractions 0, 1/3, 2/3 and 1 of each stroke; the layer draws such a list at the two ends only, so the port gives the places (`Arrowheads[{{0.03, 1/3}, …}]`), the same heads. |
| D-CI-03 | deviation | The controls and the text use the layer's look and the browser's fonts; the slider labels stand above the sliders. |
| Q-CI-01 | quirk kept | The heats are printed with Mathematica's machine-number dot and no decimals ("−1250. J", "836. J") and η, COP with two significant digits ("0.4" for 0.3987), as in the snapshots. |
| Q-CI-02 | quirk kept | The sign convention follows the original: Q<sub>h</sub>, Q<sub>c</sub> are the reservoirs' heats (negative when a reservoir gives heat) and Q<sub>H</sub>, Q<sub>C</sub> the cycle's; W<sub>S</sub> is negative when the engine does work. |
| N-CI-01 | note | Checked numerically (unit tests): the energy balance −Q<sub>H</sub> = Q<sub>C</sub> − W holds for the engine and Q<sub>H</sub> = 600 + W for the pump; Δ*S*<sub>total</sub> = 0 at ΔT1 = ΔT2 = 0 and grows with either difference; the three snapshots' printed numbers are reproduced exactly. |

## 8. Proposed changes

Proposals for this app are tracked separately.

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.44 | 2026-11-27 | generated by `tools/new-app.mjs` (example model and controls) |
| 2 | v0.1.44 | 2026-11-27 | the port: the cycle schematic with the heats, work, efficiency or COP and entropy changes; the setter and two sliders; the switch for E-CI-01 |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|----|----|----|----|
| I-CI-01 | Show both COPs for the pump (heating and cooling) | the reader sees the two definitions | more text in the box | E-CI-01 |
| I-CI-03 | Label the sliders ΔT<sub>1</sub>, ΔT<sub>2</sub> as in the Details | the controls match the text | the labels differ from the original's | F-CI-02 |
| I-CI-02 | Hold the heat that is fixed (Q<sub>H</sub> or Q<sub>C</sub>) visibly (a note in its box) | the reader sees why the other values change | not in the original | F-CI-03 |

## 11. Errors in the original (conceptual and mathematical)

Checked when the Demonstration's code was ported (rule 9), with the numbers of N-CI-01. Kind: conceptual,
mathematical, numerical or text; Status: open, kept or corrected in vX.Y.Z (the tests check these words).

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|------|-----------------------|--------------------------|--------------------|-------------------------|--------|
| E-CI-01 | conceptual | `COP = TC/(TH - TC)` for the heat pump, shown as "COP" (and in the Details) | T<sub>C</sub>/(T<sub>H</sub> − T<sub>C</sub>) = Q<sub>C</sub>/W is the coefficient of performance of a refrigerator (heat taken from the cold side per unit of work); the COP of a heat pump is the heat delivered to the hot side per unit of work, Q<sub>H</sub>/W = T<sub>H</sub>/(T<sub>H</sub> − T<sub>C</sub>), larger by 1 (ΔT1 = 8, ΔT2 = 36: 2.5 against 3.5) | kept **Switch:** with "errors of the original: corrected" (A-CI-08, v0.1.44) — the label shows the heat pump's COP T_H/(T_H − T_C) = Q_H/W, the heat given to the hot side per unit of work ("COP = 3.5" there); the work and the heats are unchanged. | the pump's COP label is 1 higher; W (computed as Q<sub>C</sub>/COP with the original's COP) and every other number stay; the engine is unaffected; snapshot 3 shows 3.5 instead of 2.5 | switchable since v0.1.44 |
