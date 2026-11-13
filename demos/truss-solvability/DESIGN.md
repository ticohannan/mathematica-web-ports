# Design document: Determine If a Truss Can Be Solved

| | |
|---|---|
| Code version: | 0.1.40 |
| Document revision | 2 (2026-11-13) — the port |
| Status | describes the app as implemented; changes go through Proposed changes (§8) |
| Original | Wolfram Demonstrations Project, "Determine If a Truss Can Be Solved", contributed by Rachael L. Baumann and John L. Falconer, published 2018-01-19 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/DetermineIfATrussCanBeSolved/> |
| Port files | `model.js` (one evaluation of the Manipulate body; pure), `main.js` (the Manipulate on `shared/manipulate.js`), `errata-mode.js` (the corrections of the switch), `index.html` |
| Role in the project | new demonstration (v0.1.40 batch: statics of trusses, owner request 2026-11-13) |

## 1. Purpose and background

Whether the forces in a plane truss can be found from statics alone: count the unknowns (member forces and reaction
components) and the equations (two balances per joint). The truss of three triangles is supported at A, F and (optionally)
B; each support is a roller (one reaction) or a pin (two). The original's verdict is "solvable" when variables −
equations ≤ 0 and "statically indeterminate" otherwise (caption; DOF = 2 j − u in the Details).

## 2. Scope

In scope: the Demonstration's controls, picture and behaviour, reproduced from its Manipulate code
(`docs/original-source/truss-solvability.txt`) and checked against its snapshots (`docs/original-snapshots/truss-solvability-*.png`) and saved
settings (`tests/golden/truss-solvability.original-states.json`). Out of scope: anything the original does not do; the port's
additions are the A- features.

## 3. Users and use cases

- UC-TD-01: a student explores the Demonstration in a browser, without Mathematica.
- UC-TD-02: the owner compares the port with the original (checklist `docs/checklists/truss-solvability.md`), with the errors of the original kept or corrected.

## 4. Features

| ID | Feature | Reason | Since | Verified by |
|----|----|----|----|----|
| F-TD-01 | Checkbox "support at joint B" `{{ADTR, True}}` and "joint labels" `{{labels, False}}` | the original's controls | v0.1.40 | e2e "the support at B"; e2e "a setter bar changes the count and the verdict" |
| F-TD-02 | Setter bars "joint A", "joint B", "joint F" (roller \| pinned); without the support at B only "joint A" and "joint E" (PaneSelector on ADTR: the last joint is named E) | the original's controls | v0.1.40 | e2e "the support at B"; e2e "has its controls with their defaults" |
| F-TD-03 | The counts: members 13 (11 without B), reactions SA + SB + SF (SB only with B), joints 8 (7) × 2 balances; variables, equations and "variables − equations = d" with the verdict in green "solvable" (d ≤ 0) or red "statically indeterminate" — an Inset of a Graphics with ImageSize 600 at (1.5 w, 9) | the original's picture | v0.1.40 | unit "the counts as the snapshots show them"; unit "kept: the original verdict" |
| F-TD-04 | The truss (w = h = 5), the pin and roller pictures of the Initialization as insets (the roller at B turned by −π/2), reactions in blue, the loads FH, FG (FG, FF without B) down and FE (FD) to the left in green, joints as white points, optional joint labels in rounded frames | the original's picture | v0.1.40 | unit "the picture: supports, reactions and loads as in snapshot 2"; e2e "the snapshot settings" |
| F-TD-05 | Opening state: support at B, no labels, rollers at A, B and F | the saved settings | v0.1.40 | unit "the opening state" |
| F-TD-06 | Caption and Details from the Demonstration (placeholder "References for demonstration." kept) | the original's explanation | v0.1.40 | M-TD-01 |
| F-TD-07 | Controls above the picture | the original's layout | v0.1.40 | inventory |
| A-TD-01 | "Initial settings" button restores the opening state | Manipulate's Initial Settings | v0.1.40 | e2e "Initial settings restores the opening state" |
| A-TD-02 | Test and automation hook `window.__demo` (getState, setState, view, graphics) from the Manipulate layer | automated tests | v0.1.40 | e2e "has its controls with their defaults" |
| A-TD-03 | Start-up notice when the browser cannot run the page (DEC-22) | no empty page | v0.1.40 | e2e "start-up notice when" |
| A-TD-04 | Breadcrumb link to all demos | navigation | v0.1.40 | inventory |
| A-TD-05 | Credits footer (authors, title, source, licence, adaptation notice) | required by the licence (CC BY-NC-SA 3.0 §4) | v0.1.40 | e2e "attribution on" |
| A-TD-06 | This app can be bundled and served alone (§6.1) | owner rule R-A | v0.1.40 | e2e "bundle: truss-solvability runs from its own folder" |
| A-TD-07 | Landing-page thumbnail `thumbnail.webp`: the picture at the initial settings, made by `tools/make-thumbnails.mjs`; the card's picture links to this app | owner request 2026-11-05 | v0.1.40 | e2e "every card on the landing page has a thumbnail that loads" |
| A-TD-08 | Switch "errors of the original: kept \| corrected" beside "Initial settings" (variable `errata`, default kept = the original's behaviour). "corrected" changes only E-TD-01 (§11; `errata-mode.js`); the differences are listed on the page under "Errors of the original: what "corrected" changes" | owner request 2026-11-13: every code-level error of the original can be switched between the original's behaviour and its correction | v0.1.40 | unit "corrected mode (E-TD)"; e2e "errata switch on truss-solvability: kept is the original, corrected changes the listed result" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|----|----|
| `check-ADTR` | F-TD-01 |
| `check-labels` | F-TD-01 |
| `setter-SA-*` | F-TD-02 |
| `setter-SB-*` | F-TD-02 |
| `setter-SF-*` | F-TD-02 |
| `reset` | A-TD-01 |
| `crumbs` | A-TD-04 |
| `details` | F-TD-06 |
| `credits` | A-TD-05 |
| `setter-errata-*` | A-TD-08 |
| `errata-details` | A-TD-08 |

## 6. Design

- `model.js` (pure): `counts(state)` (the original's var and eq), `trussOf(state)` (the same truss for
  `shared/truss.js`, new in v0.1.40), `verdict(state)` (the original's sign test; corrected: `determinacy`, the rank of the
  joint balances), `evaluate(state)` → the picture. The pin and roller are the Initialization's Graphics drawn as insets.
- `main.js`: ControlPlacement Top; the setter bar of the last joint exists twice (labelled "joint F" with B, "joint E"
  without), one visible at a time (Visible, as the original's PaneSelector).

### 6.1 Building and deploying this app alone

Owner rule R-A (2026-10-17): this one app can be taken out of the repository and hosted anywhere.

- Command, in the repository folder: `npm run bundle -- truss-solvability` → `dist/truss-solvability/`.
- Contents (generated with `node tools/bundle-app.mjs truss-solvability --update-docs`):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/truss-solvability/`) | 4 | `errata-mode.js`, `index.html`, `main.js`, `model.js` |
| `shared/` | 19 | `clock.js`, `complex.js`, `errata.js`, `graphics-extras.js`, `graphics.js`, `manipulate.js`, `matrix.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `random.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `truss.js`, `ui-extra.js`, `ui-interval.js`, `ui.js` |
| `vendor/ml-matrix/` | 2 | `index.js`, `matrix.umd.js` |
| added by the bundler | 8 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/truss-solvability/DESIGN.md`, `vendor/ml-matrix/LICENSE` |
<!-- bundle-contents:end -->

- Checked by e2e "bundle: truss-solvability runs from its own folder" (A-TD-06).

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

| ID | Kind | Description |
|----|----|----|
| D-TD-01 | deviation | PlotRange {{-3.5, 19}, {-2.85, All}}: the upper end (All, the top of the counts' inset) is 10.37, measured on the snapshots. |
| D-TD-02 | deviation | Arrowheads 0.03 of the picture's width: the size Mathematica's automatic heads have on these Thick arrows in the snapshots. |
| Q-TD-01 | quirk kept | The verdict counts only; it does not look at where the supports are (E-TD-01). |

## 8. Proposed changes

No open proposal. Template (see [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md)):

| ID | Status | Requested by / date | Change | Reason | Acceptance criteria |
|----|--------|---------------------|--------|--------|---------------------|
| P-TD-01 | approved (owner request 2026-11-13), implemented in v0.1.40 as A-TD-08 | owner / 2026-11-13 | Switch "errors of the original: kept \| corrected": mark the current version, then offer each logical error of the original as a gated correction; the corrected mode changes only the code needed for E-TD-01 | the errors of the original were reproduced bug for bug; the owner wants to compare the original with a corrected version and to be able to go back | the default is the original (golden data, harness replays and parity unchanged); each correction has a unit test with an independently derived expected value and the browser test of the switch; the page documents the differences |

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.40 | 2026-11-13 | generated by `tools/new-app.mjs` (example model and controls) |
| 2 | v0.1.40 | 2026-11-13 | the port: the counts and verdict of the original, the pin and roller insets, the switch for E-TD-01 (shared/truss.js) |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|----|----|----|----|
| I-TD-01 | Let the user place the supports at other joints | shows that the count alone is not enough | not in the original | E-TD-01 |
| I-TD-02 | Show the member forces when the truss is determinate (shared/truss.js) | links the count to the solution | not in the original | F-TD-03 |
| I-TD-03 | Mark the joints whose balances cannot be met in a mechanism (the null space of the equilibrium matrix) | shows why the truss moves | a little linear algebra; not in the original | E-TD-01 |

## 11. Errors in the original (conceptual and mathematical)

Checked when the Demonstration's code was ported (owner rule R-C). Kind: conceptual, mathematical, numerical or
text; Status: open, kept or corrected in vX.Y.Z (the tests check these words). Not by Dr. Becker: findings here are
listed in the errata list as such and are not raised with him.

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|----|----|----|----|----|----|
| E-TD-01 | conceptual | `If[var - eq <= 0, "solvable", …]` and the Details' DOF = 2 j − u | a negative difference means fewer unknowns than equations: the truss is a mechanism and cannot be in equilibrium (without the support at B and with rollers at A and E: 13 unknowns, 14 equations, called "solvable"); and a difference of 0 is necessary, not sufficient (badly placed supports) | kept: the original's verdict **Switch:** with "errors of the original: corrected" (A-TD-08, v0.1.40) — the verdict comes from the rank of the joint-balance equations (shared/truss.js): "solvable" when the equations determine every member force and reaction, "statically indeterminate" when there are more unknowns than independent equations, and "unstable (a mechanism)" when the supports or members cannot hold the truss still. The counts above stay as in the original. | without B and with two rollers the verdict reads "unstable (a mechanism)"; every other setting keeps its verdict (here the count and the rank agree) | switchable since v0.1.40 |
| E-TD-02 | text | References | the placeholder "References for demonstration." was published | kept | none | kept |
