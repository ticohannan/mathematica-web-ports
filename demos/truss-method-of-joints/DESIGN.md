# Design document: Method of Joints to Solve a Truss Problem

| | |
|---|---|
| Code version: | 0.1.40 |
| Document revision | 2 (2026-11-13) — the port |
| Status | describes the app as implemented; changes go through Proposed changes (§8) |
| Original | Wolfram Demonstrations Project, "Method of Joints to Solve a Truss Problem", contributed by Rachael L. Baumann and John L. Falconer, published 2017-09-08 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/MethodOfJointsToSolveATrussProblem/> |
| Port files | `model.js` (one evaluation of the Manipulate body; pure), `main.js` (the Manipulate on `shared/manipulate.js`), `errata-mode.js` (the corrections of the switch), `index.html` |
| Role in the project | new demonstration (v0.1.40 batch: statics of trusses, owner request 2026-11-13) |

## 1. Purpose and background

The method of joints: a truss of three equilateral triangles (w = 1, θ = 60°) on a pin at A and a roller at E, loaded
with FC = 1 kN at C. The reactions come from a moment balance about A and force balances; the member forces from two
force balances at each joint, A, B, C, D in turn (caption, Details).

## 2. Scope

In scope: the Demonstration's controls, picture and behaviour, reproduced from its Manipulate code
(`docs/original-source/truss-method-of-joints.txt`) and checked against its snapshots (`docs/original-snapshots/truss-method-of-joints-*.png`) and saved
settings (`tests/golden/truss-method-of-joints.original-states.json`). Out of scope: anything the original does not do; the port's
additions are the A- features.

## 3. Users and use cases

- UC-TJ-01: a student explores the Demonstration in a browser, without Mathematica.
- UC-TJ-02: the owner compares the port with the original (checklist `docs/checklists/truss-method-of-joints.md`), with the errors of the original kept or corrected.

## 4. Features

| ID | Feature | Reason | Since | Verified by |
|----|----|----|----|----|
| F-TJ-01 | Setter bar "reaction forces" \| "balances at joints" (steps) | the original's control | v0.1.40 | e2e "balances at joints" |
| F-TJ-02 | Popup menu truss \| calculate moment \| x-force balance \| y-force balance \| solved (opt; shown with step 1) | the original's control | v0.1.40 | e2e "the popup menu steps through the reaction forces" |
| F-TJ-03 | Setter bar "joints" A … D \| solved and checkbox "focus on joint" (joints A … D) — PaneSelectors of the original | the original's controls | v0.1.40 | e2e "balances at joints" |
| F-TJ-04 | The forces: the original's 9 balances (reactions, joints A … D) solved in the order of the joints | the original's model | v0.1.40 | unit "the original's joint balances give the forces of an independent solution" |
| F-TJ-05 | Step 1: the truss of thick grey members on a pin and a roller with its reactions and load; the moment balance (Mouseover with the explanation of the signs), the x- and y-force balances, the solved reactions | the original's picture | v0.1.40 | unit "the numbers of the snapshots"; e2e "the popup menu steps through the reaction forces" |
| F-TJ-06 | Step 2: the labelled truss with a dashed red circle at the joint; in focus the members at the joint with their components, the known forces and θ, and under the picture the joint's balances (a second Graphics); "solved": every member as a double arrow, compression green and tension red, its force turned along it | the original's picture | v0.1.40 | unit "the solved truss"; e2e "balances at joints"; e2e "the snapshot settings" |
| F-TJ-07 | Picture sizes and ranges: ImageSize {600, 395} ({600, 300} in focus); PlotRange {{-0.37 w, 2.25 w}, {-0.64 h or -1.2 h, 1.1 h}} in step 1, {{-0.21 w, 2.21 w}, {-0.25 h, 1.27 h}} for the labelled truss, All in focus and for the solved truss | the original's options | v0.1.40 | unit "PlotRange -> All of a joint in focus" |
| F-TJ-08 | Opening state: step 1, truss, joint A, not in focus | the saved settings | v0.1.40 | unit "the opening state" |
| F-TJ-09 | Caption and Details from the Demonstration (Figure 1 is the page's labelled truss) | the original's explanation | v0.1.40 | M-TJ-01 |
| F-TJ-10 | Controls above the picture | the original's layout | v0.1.40 | inventory |
| A-TJ-01 | "Initial settings" button restores the opening state | Manipulate's Initial Settings | v0.1.40 | e2e "Initial settings restores the opening state" |
| A-TJ-02 | Test and automation hook `window.__demo` (getState, setState, view, graphics) from the Manipulate layer | automated tests | v0.1.40 | e2e "has its controls with their defaults" |
| A-TJ-03 | Start-up notice when the browser cannot run the page (DEC-22) | no empty page | v0.1.40 | e2e "start-up notice when" |
| A-TJ-04 | Breadcrumb link to all demos | navigation | v0.1.40 | inventory |
| A-TJ-05 | Credits footer (authors, title, source, licence, adaptation notice) | required by the licence (CC BY-NC-SA 3.0 §4) | v0.1.40 | e2e "attribution on" |
| A-TJ-06 | This app can be bundled and served alone (§6.1) | owner rule R-A | v0.1.40 | e2e "bundle: truss-method-of-joints runs from its own folder" |
| A-TJ-07 | Landing-page thumbnail `thumbnail.webp`: the picture at the initial settings, made by `tools/make-thumbnails.mjs`; the card's picture links to this app | owner request 2026-11-05 | v0.1.40 | e2e "every card on the landing page has a thumbnail that loads" |
| A-TJ-08 | Switch "errors of the original: kept \| corrected" beside "Initial settings" (variable `errata`, default kept = the original's behaviour). "corrected" changes only E-TJ-01 (§11; `errata-mode.js`); the differences are listed on the page under "Errors of the original: what "corrected" changes" | owner request 2026-11-13: every code-level error of the original can be switched between the original's behaviour and its correction | v0.1.40 | unit "corrected mode (E-TJ)"; e2e "errata switch on truss-method-of-joints: kept is the original, corrected changes the listed result" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|----|----|
| `setter-steps-*` | F-TJ-01 |
| `popup-opt` | F-TJ-02 |
| `setter-joints-*` | F-TJ-03 |
| `check-focus` | F-TJ-03 |
| `reset` | A-TJ-01 |
| `crumbs` | A-TJ-04 |
| `details` | F-TJ-09 |
| `credits` | A-TJ-05 |
| `setter-errata-*` | A-TJ-08 |
| `errata-details` | A-TJ-08 |

## 6. Design

- `model.js` (pure): `solve()` (the original's Solve written out joint by joint), `rangeAll(content, size)` (PlotRange
  -> All: the points, arcs and the estimated extents of the labels), `evaluate(state)` → two pictures, named as the
  original's parts (truss, calculatemoment, Xforcebalance, Yforcebalance, solved, fullstructure, partialstructure,
  jointA … jointD, jointssolved, equations).
- `main.js`: ControlPlacement Top; the second picture is collapsed (not removed) when there are no equations.

### 6.1 Building and deploying this app alone

Owner rule R-A (2026-10-17): this one app can be taken out of the repository and hosted anywhere.

- Command, in the repository folder: `npm run bundle -- truss-method-of-joints` → `dist/truss-method-of-joints/`.
- Contents (generated with `node tools/bundle-app.mjs truss-method-of-joints --update-docs`):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/truss-method-of-joints/`) | 4 | `errata-mode.js`, `index.html`, `main.js`, `model.js` |
| `shared/` | 17 | `clock.js`, `errata.js`, `graphics-extras.js`, `graphics.js`, `manipulate.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `number-form.js`, `random.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `ui-extra.js`, `ui-interval.js`, `ui.js` |
| added by the bundler | 7 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/truss-method-of-joints/DESIGN.md` |
<!-- bundle-contents:end -->

- Checked by e2e "bundle: truss-method-of-joints runs from its own folder" (A-TJ-06).

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

| ID | Kind | Description |
|----|----|----|
| D-TJ-01 | deviation | PlotRange -> All: Mathematica keeps every label inside the picture; the port estimates a label's box from its font size and length (0.55 em per character, 1.5 em high). |
| D-TJ-02 | deviation | The equations' picture is 80 px high instead of 70, and joint C's balances are drawn at 15 instead of 17 px so that they fit 605 px in the browser's font. |
| D-TJ-03 | deviation | A Text offset larger than 1 is drawn as its sign (as D-TX-03): the "θ = 60.°" labels at B, C and D sit closer to their joints. |
| N-TJ-01 | note | `h = w/2 Tan[Theta]` comes before `Theta = 60°` in the Module; h is kept as an expression in the local Theta and evaluates to √3/2 once Theta has its value, so the order does no harm. |
| N-TJ-02 | note | The current notebook's step labels are " reaction forces " and " balances at joints "; snapshots 2 … 5 come from an earlier version ("solve for reaction forces", "do balances at joints"). The port follows the code. |
| N-TJ-03 | note | The original's balances were checked against an independent solution (shared/truss.js): all seven member forces and the reactions agree; RA,x = 0. |

## 8. Proposed changes

No open proposal. Template (see [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md)):

| ID | Status | Requested by / date | Change | Reason | Acceptance criteria |
|----|--------|---------------------|--------|--------|---------------------|
| P-TJ-01 | approved (owner request 2026-11-13), implemented in v0.1.40 as A-TJ-08 | owner / 2026-11-13 | Switch "errors of the original: kept \| corrected": mark the current version, then offer each logical error of the original as a gated correction; the corrected mode changes only the code needed for E-TJ-01 | the errors of the original were reproduced bug for bug; the owner wants to compare the original with a corrected version and to be able to go back | the default is the original (golden data, harness replays and parity unchanged); each correction has a unit test with an independently derived expected value and the browser test of the switch; the page documents the differences |

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.40 | 2026-11-13 | generated by `tools/new-app.mjs` (example model and controls) |
| 2 | v0.1.40 | 2026-11-13 | the port: the 9 balances, the reaction views with Mouseover, the joints in focus with PlotRange All, the solved truss, the equations picture; switch for E-TJ-01 |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|----|----|----|----|
| I-TJ-01 | Let the user change θ or the load | explore other cases | not in the original | F-TJ-04 |
| I-TJ-02 | Highlight the members of the joint in focus in the full truss | links the joint to the whole | not in the original | F-TJ-06 |
| I-TJ-03 | Text offsets beyond 1 in shared/graphics.js | label positions as Mathematica's | changes labels in other apps; review with screenshots | D-TJ-03 |

## 11. Errors in the original (conceptual and mathematical)

Checked when the Demonstration's code was ported (owner rule R-C). Kind: conceptual, mathematical, numerical or
text; Status: open, kept or corrected in vX.Y.Z (the tests check these words). Not by Dr. Becker: findings here are
listed in the errata list as such and are not raised with him.

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|----|----|----|----|----|----|
| E-TJ-01 | text | joint C in `equations` | the two balances read "∑ Fy = −FC + …" and "∑ Fx = −FAC − …": the "= 0" of every other balance is missing | kept **Switch:** with "errors of the original: corrected" (A-TJ-08, v0.1.40) — they read "∑ Fy = 0 = −FC + …" and "∑ Fx = 0 = −FAC − …", as at the other joints. | the balances read "∑ Fy = 0 = −FC + …" and "∑ Fx = 0 = −FAC − …" | switchable since v0.1.40 |
