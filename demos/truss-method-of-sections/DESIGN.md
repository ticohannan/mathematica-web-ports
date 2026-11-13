# Design document: Method of Sections to Solve a Truss

| | |
|---|---|
| Code version: | 0.1.40 |
| Document revision | 2 (2026-11-13) — the port |
| Status | describes the app as implemented; changes go through Proposed changes (§8) |
| Original | Wolfram Demonstrations Project, "Method of Sections to Solve a Truss", contributed by Rachael L. Baumann and John L. Falconer, published 2017-09-08 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/MethodOfSectionsToSolveATruss/> |
| Port files | `model.js` (one evaluation of the Manipulate body; pure), `main.js` (the Manipulate on `shared/manipulate.js`), `errata-mode.js` (the corrections of the switch), `index.html` |
| Role in the project | new demonstration (v0.1.40 batch: statics of trusses, owner request 2026-11-13) |

## 1. Purpose and background

The method of sections: a Pratt-type truss of six panels (members F0 … F20, joints A … L) on a pin at A and a roller
at G, loaded with FD = 10 kN at D and FF = 15 kN at F. The reactions come from a moment balance about A and a force
balance; each cut through three members gives their forces from two force balances and one moment balance (caption,
Details).

## 2. Scope

In scope: the Demonstration's controls, picture and behaviour, reproduced from its Manipulate code
(`docs/original-source/truss-method-of-sections.txt`) and checked against its snapshots (`docs/original-snapshots/truss-method-of-sections-*.png`) and saved
settings (`tests/golden/truss-method-of-sections.original-states.json`). Out of scope: anything the original does not do; the port's
additions are the A- features.

## 3. Users and use cases

- UC-TX-01: a student explores the Demonstration in a browser, without Mathematica.
- UC-TX-02: the owner compares the port with the original (checklist `docs/checklists/truss-method-of-sections.md`), with the errors of the original kept or corrected.

## 4. Features

| ID | Feature | Reason | Since | Verified by |
|----|----|----|----|----|
| F-TX-01 | Setter bar "solve for reaction forces" \| "make cuts" (steps) | the original's control | v0.1.40 | e2e "making cuts" |
| F-TX-02 | Setter bar "calculate moment" \| "force balance" \| "reactions" (opt; shown with step 1) | the original's control | v0.1.40 | e2e "has its controls with their defaults" |
| F-TX-03 | Setter bar "cut sections" 1 … 6 \| solved (cuts), checkbox "make cut" (zoom; cuts 1 … 6) and "solve moment" (moment; cuts 2 … 5 with a cut made) — PaneSelectors of the original | the original's controls | v0.1.40 | e2e "making cuts" |
| F-TX-04 | Sliders "member width (m)" w and "member height (m)" h, 6 … 8 step 0.1, Labeled, ImageSize Small | the original's controls | v0.1.40 | e2e "a slider changes the angle and the forces" |
| F-TX-05 | The forces: the original's 18 balances (reactions, cuts 1 … 6) solved in the order of the cuts; θ = ArcTan[h/w] | the original's model | v0.1.40 | unit "the original's section balances give the forces of the method of joints" |
| F-TX-06 | Step 1: the truss on two rollers with the moment arms (3 w, 5 w, 6 w) and the moment balance — a Mouseover whose second form explains the signs —, the force balance, or the solved reactions | the original's picture | v0.1.40 | unit "the views"; e2e "the moment balance explains itself under the pointer" |
| F-TX-07 | Step 2: the labelled truss with the cut line; with "make cut" the piece left of the cut, its member forces with components, the moment arms (solve moment) and the balances, and under the picture the cut's equations (a second Graphics, ImageSize {605, 70}); "solved": every member as a double arrow, compression green and tension red, with its force turned along the member | the original's picture | v0.1.40 | unit "the numbers of the snapshots"; e2e "making cuts"; e2e "the snapshot settings" |
| F-TX-08 | Picture sizes and ranges: ImageSize {605, 375} ({605, 300} with a cut made), PlotRange {{-0.85, 6 w}, {-14.4, 20.7}} with PlotRangePadding {{5 %, 9 %}, None}; a cut's range from the Initialization's tables xmin, xmax, ymin, ymax | the original's options | v0.1.40 | e2e "the snapshot settings" |
| F-TX-09 | Opening state: step 1, calculate moment, cut 1, w = h = 8 | the saved settings | v0.1.40 | unit "the opening state" |
| F-TX-10 | Caption and Details from the Demonstration (Figure 1 is the page's labelled truss) | the original's explanation | v0.1.40 | M-TX-01 |
| F-TX-11 | Controls above the picture | the original's layout | v0.1.40 | inventory |
| A-TX-01 | "Initial settings" button restores the opening state | Manipulate's Initial Settings | v0.1.40 | e2e "Initial settings restores the opening state" |
| A-TX-02 | Test and automation hook `window.__demo` (getState, setState, view, graphics) from the Manipulate layer | automated tests | v0.1.40 | e2e "has its controls with their defaults" |
| A-TX-03 | Start-up notice when the browser cannot run the page (DEC-22) | no empty page | v0.1.40 | e2e "start-up notice when" |
| A-TX-04 | Breadcrumb link to all demos | navigation | v0.1.40 | inventory |
| A-TX-05 | Credits footer (authors, title, source, licence, adaptation notice) | required by the licence (CC BY-NC-SA 3.0 §4) | v0.1.40 | e2e "attribution on" |
| A-TX-06 | This app can be bundled and served alone (§6.1) | owner rule R-A | v0.1.40 | e2e "bundle: truss-method-of-sections runs from its own folder" |
| A-TX-07 | Landing-page thumbnail `thumbnail.webp`: the picture at the initial settings, made by `tools/make-thumbnails.mjs`; the card's picture links to this app | owner request 2026-11-05 | v0.1.40 | e2e "every card on the landing page has a thumbnail that loads" |
| A-TX-08 | Switch "errors of the original: kept \| corrected" beside "Initial settings" (variable `errata`, default kept = the original's behaviour). "corrected" changes only E-TX-01, E-TX-02 (§11; `errata-mode.js`); the differences are listed on the page under "Errors of the original: what "corrected" changes" | owner request 2026-11-13: every code-level error of the original can be switched between the original's behaviour and its correction | v0.1.40 | unit "corrected mode (E-TX)"; e2e "errata switch on truss-method-of-sections: kept is the original, corrected changes the listed result" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|----|----|
| `setter-steps-*` | F-TX-01 |
| `setter-opt-*` | F-TX-02 |
| `setter-cuts-*` | F-TX-03 |
| `check-zoom` | F-TX-03 |
| `check-moment` | F-TX-03 |
| `*-w` | F-TX-04 |
| `*-h` | F-TX-04 |
| `moment-balance` | F-TX-06 |
| `reset` | A-TX-01 |
| `crumbs` | A-TX-04 |
| `details` | F-TX-10 |
| `credits` | A-TX-05 |
| `setter-errata-*` | A-TX-08 |
| `errata-details` | A-TX-08 |

## 6. Design

- `model.js` (pure): `solve(w, h)` (the original's Solve of 18 linear balances, written out in the order of the cuts —
  each cut adds the unknowns it can solve), `geometry(w, h)` (joints and members, for the test against `shared/truss.js`),
  `evaluate(state)` → two pictures, named as the original's parts (truss, calculatemoment, forcebalance, solved,
  fullstructure, partialstructure, cut1 … cut6, cutsolved, equations).
- Interpolation: the Initialization's xmin, xmax, ymin, ymax are Interpolation of six points read only at the integer cut
  numbers, where an interpolation returns the points themselves; the port reads the points.
- `fitPlotRange` (shared/graphics.js, v0.1.40) widens a range to the shape of ImageSize {w, h}, as Mathematica centres a
  picture in a larger image.
- `main.js`: ControlPlacement Top; the second picture is collapsed (not removed) when there are no equations, so that its
  texts can be measured when it appears.

### 6.1 Building and deploying this app alone

Owner rule R-A (2026-10-17): this one app can be taken out of the repository and hosted anywhere.

- Command, in the repository folder: `npm run bundle -- truss-method-of-sections` → `dist/truss-method-of-sections/`.
- Contents (generated with `node tools/bundle-app.mjs truss-method-of-sections --update-docs`):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/truss-method-of-sections/`) | 4 | `errata-mode.js`, `index.html`, `main.js`, `model.js` |
| `shared/` | 19 | `clock.js`, `errata.js`, `graphics-extras.js`, `graphics.js`, `manipulate.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `mma.js`, `number-form.js`, `random.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `ui-extra.js`, `ui-interval.js`, `ui.js`, `wl.js` |
| added by the bundler | 7 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/truss-method-of-sections/DESIGN.md` |
<!-- bundle-contents:end -->

- Checked by e2e "bundle: truss-method-of-sections runs from its own folder" (A-TX-06).

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

| ID | Kind | Description |
|----|----|----|
| D-TX-01 | deviation | The equations' picture is 80 px high instead of 70: the three rows need it in the browser's font. |
| D-TX-02 | deviation | The rollers' outlines: the original's Tables with steps 0.01 and 0.0001 are drawn with steps of 0.01 (the same curve). |
| D-TX-03 | deviation | A Text offset larger than 1 (e.g. {-1.8, -1.5}) is drawn as its sign (left/right, above/below) — shared/graphics.js does not yet move a label further; the labels sit a little closer to their points (report: candidate). |
| N-TX-01 | note | cut 2's line `"\< = \>"var[…]` lacks a comma: Times[" = ", F3] displays as " = F3", the same text; nothing to correct. |
| N-TX-02 | note | The original's Solve with its section balances was checked against an independent method-of-joints solution (shared/truss.js) for several w and h: every member force and both reactions agree, and the five verticals are zero members. |

## 8. Proposed changes

No open proposal. Template (see [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md)):

| ID | Status | Requested by / date | Change | Reason | Acceptance criteria |
|----|--------|---------------------|--------|--------|---------------------|
| P-TX-01 | approved (owner request 2026-11-13), implemented in v0.1.40 as A-TX-08 | owner / 2026-11-13 | Switch "errors of the original: kept \| corrected": mark the current version, then offer each logical error of the original as a gated correction; the corrected mode changes only the code needed for E-TX-01, E-TX-02 | the errors of the original were reproduced bug for bug; the owner wants to compare the original with a corrected version and to be able to go back | the default is the original (golden data, harness replays and parity unchanged); each correction has a unit test with an independently derived expected value and the browser test of the switch; the page documents the differences |

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.40 | 2026-11-13 | generated by `tools/new-app.mjs` (example model and controls) |
| 2 | v0.1.40 | 2026-11-13 | the port: the 18 balances, the reaction and cut views with Mouseover, the solved truss, the equations picture; switch for E-TX-01, E-TX-02 |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|----|----|----|----|
| I-TX-01 | Let the user move the loads or change their size | explore other cases | not in the original | F-TX-05 |
| I-TX-02 | Text offsets beyond 1 in shared/graphics.js | label positions as Mathematica's | changes 49 labels in other apps; review with screenshots | D-TX-03 |
| I-TX-03 | Highlight the three members of the current cut in the full truss | links the cut to the whole | not in the original | F-TX-07 |

## 11. Errors in the original (conceptual and mathematical)

Checked when the Demonstration's code was ported (owner rule R-C). Kind: conceptual, mathematical, numerical or
text; Status: open, kept or corrected in vX.Y.Z (the tests check these words). Not by Dr. Becker: findings here are
listed in the errata list as such and are not raised with him.

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|----|----|----|----|----|----|
| E-TX-01 | numerical | cut 4, `NumberForm[Abs@F12, {3, 1}]` in the line "F13 = …" | the result line under the x balance of cut 4 prints the force of member 12 (10.6 kN at w = h = 8) under the label F13; the balance above it gives \|F13\| = 20.0 kN | kept: 10.6 kN **Switch:** with "errors of the original: corrected" (A-TX-08, v0.1.40) — the line shows the magnitude of F13 (20.0 kN at w = h = 8). | the line shows 20.0 kN at w = h = 8, as the solved truss does | switchable since v0.1.40 |
| E-TX-02 | mathematical | cut 5, the moment balance about I written in `equations` | "4 w RA + w FD − h F15 = 0": the load at D turns the piece the other way from RA, so its term is − w FD (the original's own Solve uses − w FD, its "+" commented out, and F15 = w/h (4 RA − FD) below) | kept: + w FD **Switch:** with "errors of the original: corrected" (A-TX-08, v0.1.40) — the line reads "4 w RA − w FD − h F15 = 0". | the line reads − w FD; the numbers are unchanged | switchable since v0.1.40 |
| E-TX-03 | text | Caption and Details | the reaction at the roller is called R_B, but the picture and the code call it R_G; the Details' moment about I names F17 where the picture solves F15, and carries the sign of E-TX-02 | kept (the texts are the original's) | none | kept |
| E-TX-04 | text | the balances' signs (cut 1: "RA − F0 sin θ" shown, `ra + f0 Sin[θ] == 0` solved) | the equations shown assume the directions drawn, the Solve assumes tension; both give the same magnitudes, which is all that is shown (Abs) | kept | none | kept |
