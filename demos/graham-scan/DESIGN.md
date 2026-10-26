# Design document: Graham Scan to Find the Convex Hull of a Set of Points in 2D

| | |
|---|---|
| Code version: | 0.1.23 |
| Document revision | 2 (2026-10-25) |
| Status | describes the app as implemented; changes go through Proposed changes (§8) |
| Original | Wolfram Demonstrations Project, "Graham Scan to Find the Convex Hull of a Set of Points in 2D", contributed by Aaron T. Becker, Yitong Lu and Daniel Biediger, published 2020-11-25 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/GrahamScanToFindTheConvexHullOfASetOfPointsIn2D/> Source as text: [`docs/original-source/graham-scan.txt`](../../docs/original-source/graham-scan.txt); snapshots `docs/original-snapshots/graham-scan-1…5.png`; saved states `tests/golden/graham-scan.original-states.json` |
| Port files | `model.js` (the Manipulate body: start point, sort, scan, picture as Graphics data; pure), `main.js` (the Manipulate on `shared/manipulate.js`), `index.html` |
| Role in the project | new demonstration, ported in simple mode (v0.1.23): generator, `shared/wl.js`, plain arithmetic |

## 1. Purpose and background

The Demonstration shows the steps of the Graham scan, an algorithm that finds the convex hull of a finite set of points
in 2D in O(n log n): the lowest point is the start; the other points are sorted by polar angle around it (without
trigonometry, by −run/rise); a stack of hull points is extended point by point, and points are popped while the turn
to the next point is a right turn. A step slider walks through the sorted points; the points can be dragged and a
button makes new random points.

## 2. Scope

In scope: the original's controls, picture and behaviour, with its 20 saved points as the opening state. Out of scope:
anything the original does not do; port additions are the A- features.

## 3. Users and use cases

- UC-GS-01: a student steps through the scan and sees which edges are dropped and why.
- UC-GS-02: a student drags points (e.g. into the hull or onto a line with the start) and watches the hull change.
- UC-GS-03: a teacher makes new point sets of a chosen size for an exercise (reproducible with `?seed=N`).

## 4. Features

| ID | Feature | Reason | Since | Verified by |
|----|----|----|----|----|
| F-GS-01 | Locator list `{{Allpts, …}, {-1, -1}, {1, 1}, ControlType -> Locator, Appearance -> None}`: every point is draggable inside [−1, 1]², drawn only as the picture's points | the original's locators | v0.1.23 | e2e "dragging a point with the mouse moves it"; e2e "loads without errors" |
| F-GS-02 | Slider "step" `{{iMax, 1, "step"}, 1, Length[Allpts] - 1, 1, ImageSize -> 120, Appearance -> "Labeled"}`; its maximum follows the number of points; the body clamps iMax to it (`If[iMax > Length[pts], iMax = Length[pts]]`) | the original's step slider | v0.1.23 | e2e "the step slider adds one sorted point per step"; unit "the step is clamped" |
| F-GS-03 | Heading "number of points" and slider *n* `{{n, 20, Style["n", Italic]}, 2, 200, 1, Appearance -> "Labeled"}` | the size of the next point set | v0.1.23 | e2e "has the controls of the original" |
| F-GS-04 | Button "generate *n* new points": `Allpts = RandomReal[{-1, 1}, {n, 2}]` — the number of locators changes with it | a new problem | v0.1.23 | e2e "generate n new points" |
| F-GS-05 | Start point: `First@MaximalBy[MinimalBy[Allpts, Last], First]` (lowest, rightmost of ties), removed from the list and moved down by 0.001; the others ordered by `Ordering` of (x₀ − x)/(y − y₀) (−∞ for equal y) | the scan's first step, as the original | v0.1.23 | unit "start: the lowest point" |
| F-GS-06 | The scan: stack {start, first sorted point}; for steps 2…iMax, pop while `isLeftTurn[stack[[-2]], stack[[-1]], p] < 0` (½ Det of the 3 × 3 matrix), recording the popped edges of the current step; push p | the algorithm | v0.1.23 | unit "step by step"; unit "snapshot" |
| F-GS-07 | The picture: dropped edges dashed red; the stack thick blue (all but the last point) with its last edge dashed; one ray per step from the start in `Hue[(i - 1)/(1.1 Length[pts])]`; points `PointSize[Medium]`; the start point red; `PlotRange -> 1.05 {{-1, 1}, {-1, 1}}`, `ImageSize -> 440` | the original's drawing | v0.1.23 | unit "the picture"; e2e "loads without errors"; M-GS-02 |
| F-GS-08 | At the last step the start point is pushed again, closing the hull | the original's end of the scan | v0.1.23 | unit "step by step"; e2e "the step slider adds one sorted point per step" |
| F-GS-09 | Opening state: the 20 points stored in the notebook, step 1, *n* = 20 | the published state | v0.1.23 | unit "the opening state"; M-GS-02 |
| F-GS-10 | Caption and Details text (from the Demonstration) | the original's explanation | v0.1.23 | M-GS-01 |
| A-GS-01 | "Initial settings" button restores the opening state (also the 20 locators) | Manipulate's Initial Settings | v0.1.23 | e2e "Initial settings restores the opening state" |
| A-GS-02 | Test and automation hook `window.__demo` (getState, setState, view, graphics, moveLocator, worldToClient, setRng) | automated tests | v0.1.23 | e2e "the step slider adds one sorted point per step" |
| A-GS-03 | Start-up notice when the browser cannot run the page (DEC-22) | no empty page | v0.1.23 | e2e "start-up notice when" |
| A-GS-04 | Breadcrumb link to all demos | navigation | v0.1.23 | inventory |
| A-GS-05 | Credits footer (authors, title, source, licence, adaptation notice) | required by the licence (CC BY-NC-SA 3.0 §4) | v0.1.23 | e2e "attribution on" |
| A-GS-06 | This app can be bundled and served alone (§6.1) | owner rule R-A | v0.1.23 | e2e "bundle: graham-scan runs from its own folder" |
| A-GS-07 | `?seed=N` in the address makes "generate *n* new points" reproducible (seeded random source) | repeatable examples and tests | v0.1.23 | e2e "generate n new points" |
| A-GS-08 | Arrow keys move a focused point (port addition of the Manipulate layer) | keyboard access | v0.1.23 | M-GS-05 |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|----|----|
| `locator-Allpts-*` | F-GS-01, A-GS-08 |
| `slider-iMax` | F-GS-02 |
| `value-iMax` | F-GS-02 |
| `plus-iMax` | F-GS-02 |
| `play-iMax` | F-GS-02 |
| `stepback-iMax` | F-GS-02 |
| `stepfwd-iMax` | F-GS-02 |
| `slider-n` | F-GS-03 |
| `value-n` | F-GS-03 |
| `plus-n` | F-GS-03 |
| `play-n` | F-GS-03 |
| `stepback-n` | F-GS-03 |
| `stepfwd-n` | F-GS-03 |
| `button-generate` | F-GS-04 |
| `reset` | A-GS-01 |
| `crumbs` | A-GS-04 |
| `details` | F-GS-10 |
| `credits` | A-GS-05 |

## 6. Design

- `model.js`: `initialState()` (the notebook's 20 points) and `evaluate(state)` → `{ state, view, graphics }`: the
  body as written in the original, with `shared/wl.js` (`MinimalBy`, `MaximalBy`, `Ordering`, `Most`) and
  `shared/graphics.js` (`Hue`, `Dashed`, `Thick`). The body's assignment to iMax is returned in `state`. `view` reports
  the start point, the order, the stack, the dropped edges and the clamped step for the tests.
- `main.js`: one `Manipulate({…})` — the original's control specs (the step slider's maximum a function of the state,
  the button a `Button(…)` that writes `Allpts` with the page's random source).
- Locators: one per point; when the button changes the number of points, the layer adds or removes locators (v0.1.23).

### 6.1 Building and deploying this app alone

Owner rule R-A (2026-10-17): this one app can be taken out of the repository and hosted anywhere.

- Command, in the repository folder: `npm run bundle -- graham-scan` → `dist/graham-scan/`.
- Contents (generated with `node tools/bundle-app.mjs graham-scan --update-docs`):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/graham-scan/`) | 3 | `index.html`, `main.js`, `model.js` |
| `shared/` | 15 | `graphics-extras.js`, `graphics.js`, `manipulate.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `random.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `ui-extra.js`, `ui-interval.js`, `ui.js`, `wl.js` |
| added by the bundler | 7 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/graham-scan/DESIGN.md` |
<!-- bundle-contents:end -->

- Checked by e2e "bundle: graham-scan runs from its own folder" (A-GS-06).

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

- D-GS-01: the heading "number of points" is drawn as the layer's control heading (bold), the original's `Row` is
  plain text.
- D-GS-02: new random points come from the page's random source, not Mathematica's `RandomReal` stream; the opening
  points are the notebook's own.
- Q-GS-01: only the edges dropped in the current (last) step are shown (`droppedLines = {}` at every step), as in
  the original.
- Q-GS-02: the start point is drawn 0.001 below the point it came from (the original's nudge), and the stack keeps
  points collinear with an edge (`isLeftTurn < 0` pops only right turns).
- N-GS-01: the finished hull equals an independent convex hull (`shared/geometry.js` `ConvexHull`) at all five
  snapshot settings (unit "snapshot").

## 8. Proposed changes

No open proposal. Template (see [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md)):

| ID | Status | Requested by / date | Change | Reason | Acceptance criteria |
|----|--------|---------------------|--------|--------|---------------------|

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.22 | 2026-10-25 | generated by `tools/new-app.mjs` (example model and controls) |
| 2 | v0.1.23 | 2026-10-25 | the port: the original's controls, scan and picture in simple mode; opening state from the notebook |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|-------------|---------|-------------|---------|
| I-GS-01 | Show all edges dropped so far, not only those of the last step | the whole history of the scan at a glance | differs from the original (Q-GS-01) | Q-GS-01 |
| I-GS-02 | A harness run in Mathematica at the snapshot settings (start, order, stack) | the port checked against the original's own numbers | operator time | F-GS-05, F-GS-06 |
| I-GS-03 | Animate the step slider (play button) at a readable speed by default | a hands-free demonstration | none | F-GS-02 |

## 11. Errors in the original (conceptual and mathematical)

Checked when porting (owner rule R-C).

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|------|-----------------------|--------------------------|--------------------|-------------------------|--------|
| — | none found | — | — | — | — | — |
