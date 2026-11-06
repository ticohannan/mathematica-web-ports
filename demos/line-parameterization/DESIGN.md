# Design document: Line Parameterization

| | |
|---|---|
| Code version: | 0.1.33 |
| Document revision | 2 (2026-11-02) — implemented after the owner's approval; compared with the owner's three screenshots of the original |
| Status | describes the app as implemented; changes go through Proposed changes (§8) |
| Original | Lecture notebook "Lecture-18-lineparameterization.nb" (Aaron T. Becker, course lecture material; created with Mathematica 10.0, last saved with Mathematica 13.2 for macOS). Not a published Wolfram Demonstration: no public page, no licence statement in the file. Dr. Becker gave the notebook to the owner to convert; licensed as his Demonstrations, CC BY-NC-SA 3.0, until he says otherwise (owner, 2026-11-02). The dial and the arrow arc are the same definitions as in Dr. Becker's CC BY-NC-SA 3.0 Demonstrations. Private copy: `_internal/originals/lectures/Lecture-18-lineparameterization.nb` (SHA-256 `0116714b…7e`) |
| Port files | `model.js` (one evaluation of the Manipulate body; pure), `main.js` (the Manipulate on `shared/manipulate.js`, the dial from `demos/common/dial-control.js`), `index.html` |
| Mode | simple (P), as v0.1.23–v0.1.27; the dial's exact π/32 grid comes with the shared dial (as in camera-lasers and manipulability-ellipsoid) |
| Role in the project | new app (not a Demonstration) |

## 1. Purpose and background

The normal (Hesse) form of a straight line, `x cos θ + y sin θ = ρ`: every line in the plane is given by its distance
ρ ≥ 0 from the origin and the direction θ of its normal. The picture shows the normal from the origin to the line (a
blue two-headed arrow of length ρ), the angle θ from the x-axis (a red arc), a right-angle mark at the foot point, the
line itself (thick, purple) with the foot point, and the equation written along the line. The user sets ρ with a slider
and θ with a dial. This is the parameterization of lines used, for example, by the Hough transform for line detection.

The notebook has no caption or Details text (it is a lecture notebook); the page's short explanation is a port
addition (A-LP-07).

## 2. Scope

In scope: the notebook's `Manipulate` — the ρ slider, the θ dial, the picture — with the saved definitions it runs
(PG-R-21). Out of scope: `splineCircle` (defined in the initialization cell, never used); the dead four-argument
`makeDialControl` in the saved definitions (N-LP-02).

**Licence (owner, 2026-11-02):** "Dr Becker gave me this file to convert -- lets stick with his existing license norms
he's used elsewhere until he says otherwise": CC BY-NC-SA 3.0 as his Demonstrations, credit "Aaron T. Becker, ECE 6311
Lecture 18 notebook". The source text (`docs/original-source/line-parameterization.txt`), the saved state and the
owner's screenshots (`docs/original-snapshots/line-parameterization-1…3.png`) are published under the same terms.

## 3. Users and use cases

- UC-LP-01: a student sets ρ and θ and sees which line `x cos θ + y sin θ = ρ` is.
- UC-LP-02: a lecturer shows that ρ is the distance to the origin and θ the direction of the normal, for all four
  quadrants (θ from 0 to 2π).

## 4. Features

From the Manipulate (source: `docs/original-source/line-parameterization.txt`). u = {cos θ, sin θ} (the normal's
direction), n = {−sin θ, cos θ} (along the line).

| ID | Feature | Reason | Since | Verified by |
|----|----|----|----|----|
| F-LP-01 | Slider ρ `{{ρ, 1, Style["ρ", Blue]}, 0, 3, 0.1, Appearance -> "Labeled", ImageSize -> 120}`: label ρ in blue, value field, ⊕ panel, 120 px track, Mathematica's slider values 0.1 k | the line's distance from the origin | v0.1.31 | e2e "has its controls with their defaults"; e2e "the slider moves the line" |
| F-LP-02 | Dial θ `{{p1, {1, 0}, Style["θ", Red]}, (makeDialControl[#1, {0, 0}, Red] &)}`: the shared dial (`demos/common/dial-control.js`) with the saved definition's options — setter Nearest on the 65 multiples of π/32, arc `myArrowArc2` in red, no ImageSize (automatic, as manipulability-ellipsoid F-ME-01), stacked π-fraction labels −3π/4 … π, arrow keys one π/32 step | the normal's direction | v0.1.31 | e2e "the dial sets θ in steps of π/32"; e2e "ρ = 0.1 and θ = 3π/2"; e2e "keyboard: arrow keys turn the dial" |
| F-LP-03 | θ = ArcTan[p1[[1]], p1[[2]]], plus 2π when negative: θ ∈ [0, 2π), exactly k π/32 (the model keeps k) | the body's angle | v0.1.31 | unit "theta is k pi/32 in [0, 2pi)" |
| F-LP-04 | Right-angle mark: black polyline ρu, (ρ − 0.2)u, (ρ − 0.2)u + 0.2n, ρu + 0.2n | shows that the normal meets the line at 90° | v0.1.31 | unit "the picture at the saved state" |
| F-LP-05 | Red arc `myArrowArc2[{0, 0}, ρ/2, {0, θ}]` (B-spline through 12 points with an arrowhead; a point when θ === 0) | the angle θ | v0.1.31 | unit "the arc is a point at theta 0 and an arrow otherwise" |
| F-LP-06 | Red label "θ" (Medium) at 0.75ρ in the direction θ − π/16, only when θ ≥ π/16 (`Abs[θ] >= π/16`, exact: from k = 2 on) | names the angle | v0.1.31 | unit "the theta label appears from k = 2" |
| F-LP-07 | Blue arrow from the origin to ρu with heads at both ends (`Arrowheads[{-.03, .03}]`) and the label "ρ" (Medium) at (ρ/2)u + 0.15n | the distance ρ | v0.1.31 | unit "the picture at the saved state" |
| F-LP-08 | Purple, Thick: the line from ρu − 5n to ρu + 5n | the line itself | v0.1.31 | unit "every point of the line satisfies x cos theta + y sin theta = rho" |
| F-LP-09 | Purple label "*x* cos θ + *y* sin θ = ρ" (Medium) at 1.2ρu, rotated by θ − π/2 (about its own centre) | the equation along the line | v0.1.31 | e2e "the equation label is rotated with the line" |
| F-LP-10 | Purple point, PointSize Large, at ρu | the foot point | v0.1.31 | unit "the picture at the saved state" |
| F-LP-11 | Picture: Axes with italic labels *x*, *y*, PlotRange ±3 in both directions, default ImageSize (Medium, 360 px, D-LP-02: measured on the screenshots), controls on the left | the frame of reference | v0.1.31 | e2e "loads without errors and draws the picture" |
| F-LP-12 | Opening state ρ = 1, p1 = {1, 0} (θ = 0) | the Manipulate's initial values | v0.1.31 | unit "the opening state"; e2e "has its controls with their defaults" |
| F-LP-13 | The notebook's saved state ρ = 1.8, p1 = {1/√2, 1/√2} (θ = π/4) — the state the notebook opens in — loads through the hook and gives the picture of the owner's screenshot 1 | golden check against the original's own values | v0.1.31 | unit "the picture at the saved state"; e2e "the saved state of the notebook" |
| A-LP-01 | "Initial settings" button restores the opening state | Manipulate's Initial Settings | v0.1.31 | e2e "Initial settings restores the opening state" |
| A-LP-02 | Test and automation hook `window.__demo` (getState, setState, view, graphics) from the Manipulate layer | automated tests | v0.1.31 | e2e "the slider moves the line" |
| A-LP-03 | Start-up notice when the browser cannot run the page (DEC-22) | no empty page | v0.1.31 | e2e "start-up notice when" |
| A-LP-04 | Breadcrumb link to all demos | navigation | v0.1.31 | inventory |
| A-LP-05 | Credits footer: author, title, source (a lecture notebook, §2), licence, adaptation notice | required by the licence of the shared dial code (CC BY-NC-SA 3.0 §4) and fair credit | v0.1.31 | e2e "attribution on" |
| A-LP-06 | This app can be bundled and served alone (§6.1) | owner rule R-A | v0.1.31 | e2e "bundle: line-parameterization runs from its own folder" |
| A-LP-07 | A two-sentence caption explaining the normal form (the notebook has none), marked as the port's text | the page needs a caption | v0.1.31 | M-LP-01 |
| A-LP-08 | Landing-page thumbnail `thumbnail.webp`: the picture at the initial settings, made by `tools/make-thumbnails.mjs`; the card's picture links to this app | owner request 2026-11-05 | v0.1.32 | e2e "every card on the landing page has a thumbnail that loads" |

## 5. UI inventory

| data-testid | Feature |
|----|----|
| `*-rho` | F-LP-01 |
| `*-p1` | F-LP-02 |
| `reset` | A-LP-01 |
| `crumbs` | A-LP-04 |
| `details` | A-LP-07 |
| `credits` | A-LP-05 |

## 6. Design

- `model.js` (pure): `initialState()` = `{ rho: 1, p1: [1, 0] }`; `evaluate(state)` → `{ view, graphics }`: k =
  `nearest32Index(p1)` (the dial's own table), θ index k mod 64 (the `+2π` rule), θ = kπ/32, then the Graphics list
  in the original's order with `Annotation` test ids (`marker`, `arc`, `theta-label`, `rho-arrow`, `rho-label`, `line`,
  `equation`, `foot`). `myArrowArc2` written in `model.js` as in the notebook, its SameQ branch exact (`k === 0`; the
  shared `arrow-arcs.js` version compares machine numbers); Arrow[BSplineCurve] from `shared/graphics.js`. Plain
  arithmetic otherwise (mode P).
- `main.js`: one `Manipulate({…})`: the slider spec as written, the dial as `Control(makeDialControl, { setter:
  'nearest32', arc: 'myArrowArc2', imageSize: 'automatic', keyStep: 'grid', labels: 'stacked', color: Red })` and a hook
  `dialToClient` for real-mouse tests,
  `graphics: { PlotRange: [[-3, 3], [-3, 3]], ImageSize: 360, Axes: true, AxesLabel: [Style('x', Italic), Style('y',
  Italic)] }`.
- Rotated text: `Rotate[Text[…, pos], θ − π/2]` without a centre turns about the text's centre (its position). The
  shared `Rotate` turns a centred Text about its position since v0.1.31 (S-1).
- Size: model 59 lines, main 33 lines (the WL body is 32 lines and the definitions 30).

### 6.1 Building and deploying this app alone

Owner rule R-A (2026-10-17): this one app can be taken out of the repository and hosted anywhere.

- Command, in the repository folder: `npm run bundle -- line-parameterization` → `dist/line-parameterization/`.
- Contents (generated with `node tools/bundle-app.mjs line-parameterization --update-docs`):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/line-parameterization/`) | 3 | `index.html`, `main.js`, `model.js` |
| `shared/` | 18 | `clock.js`, `exact-pi.js`, `graphics-extras.js`, `graphics.js`, `manipulate.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `mma-text.js`, `mma.js`, `random.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `ui-extra.js`, `ui-interval.js`, `ui.js` |
| `demos/common/` | 3 | `arrow-arcs.js`, `dial-control.js`, `prm-core.js` |
| added by the bundler | 7 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/line-parameterization/DESIGN.md` |
<!-- bundle-contents:end -->

- Checked by e2e "bundle: line-parameterization runs from its own folder" (A-LP-06).

### 6.2 Shared-code and tooling additions (approved 2026-11-02, implemented in v0.1.31)

| ID | Where | What | Why generic | Other apps |
|---|---|---|---|---|
| S-1 | `shared/graphics.js` (MIT) | `Rotate(Text(…, pos), θ)` without a centre turns about the text's position (Mathematica: about the centre of the bounding box, which for centred text is its position) | Mathematica's own behaviour; today it throws | none use it (they all pass a centre); unit test |
| S-2 | `tools/new-app.mjs`, `tests/e2e/apps.js`, `tests/e2e/site.spec.js`, LICENSE.md row (MIT tooling) | an original that is not a published Demonstration: generator option `--source "<description>"` instead of `--slug`; the credits say "Adapted from <description>" with no Wolfram link; the attribution test checks the source the app declares | needed for any lecture or course notebook (owner: more may follow) | none change; unit test of the generator |

No new mathematics is needed: the dial (nearest π/32), `myArrowArc2`, `makeHand`, Arrowheads lists, `Thick`, named
font sizes, `PointSize[Large]` and `Axes`/`AxesLabel` exist.

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

| ID | Kind | Description |
|----|------|-------------|
| D-LP-01 | deviation | Line widths, fonts, arrowheads and the B-spline arc are drawn as in the shared code (D-TK-04): approximations of Mathematica's, not measured for this notebook. |
| D-LP-02 | deviation | The picture's size: the notebook gives no ImageSize; Mathematica's default is Medium (360 px). Measured on the owner's screenshots at 100 % (a 2× display): 6 plot units = 678 device px, i.e. 56.5 px per unit at 1× (port: 360 px with 2 % padding = 57.7), the dial circle 172 px (port: automatic, 180 px), the ρ slider track 120 px. As every port, the page may show the picture up to 1.25× its ImageSize (shared/svg-plot.js). |
| D-LP-03 | deviation | Credits: the original is a lecture notebook without a public page; the footer names the author and the notebook, licensed as his Demonstrations (owner 2026-11-02; generator option `--source`, S-2). |
| D-LP-04 | deviation | Controls as in every port (shared layer): the ρ label above the slider and an editable value field after it; the original puts ρ left of the slider and shows the value as text after its ⊞ button. The notebook opens in its saved state (ρ = 1.8, θ = π/4), the port at the initial settings (ρ = 1, θ = 0), as every port. |
| Q-LP-01 | quirk kept | θ ∈ [0, 2π) in the picture, but the dial shows angles in (−π, π] (labels −3π/4 … π; its own arc runs clockwise for negative angles): for a dial position below the x-axis the dial's arc and the picture's arc show different angles (E-LP-01; the owner's screenshot 3: the dial at −π/2 with a clockwise arc, the picture's θ = 3π/2). |
| Q-LP-02 | quirk kept | The equation is rotated by θ − π/2, so it is upside down for θ in (π, 2π) (screenshot 3). |
| Q-LP-03 | quirk kept | The right-angle mark's second corner is (ρ − 0.2)u: for ρ < 0.2 the mark reaches past the origin (E-LP-02). |
| Q-LP-04 | quirk kept | The dial's `ang` is a `Dynamic` object, so its `myArrowArc2` always draws an arrow (also at 0), as in the other dial apps (Q-TK-05). |
| K-LP-01 | known issue (lead) | ρ = 0: the arc has radius 0 and the blue arrow length 0. What Mathematica draws then (nothing, or lone arrowheads) is not known; the port draws nothing for empty and zero-length primitives (PG-R-25). Check on a screenshot. |
| K-LP-02 | known issue (resolved 2026-11-02) | The notebook saves no picture (no snapshot cells, the output is a live DynamicModule). The owner took three screenshots in Mathematica (`docs/original-snapshots/line-parameterization-1.png` the saved state ρ = 1.8, θ = π/4 at 200 % zoom; `-2.png` ρ = 1.8, θ = 9π/32 at 100 % — the dial one step on, as the blue arrow's angle 50.6° and the line's axis crossings (about 2.9 and 2.33; 2.84 and 2.33 computed) show; `-3.png` ρ = 0.1, θ = 3π/2). The port's review screenshots at the same three settings agree in every element (lines, marker, arc, arrows, labels and their places, the upside-down equation, the dial); differences are the control layout (D-LP-04), drawing details (D-LP-01) and K-LP-03. |
| K-LP-03 | known issue (lead) | At ρ = 0.1, θ = 3π/2 (screenshot 3) Mathematica draws the red arc's arrowhead large, above the axis right of the origin, pointing up and right; the port's sits left of the origin and points left and down. Both draw the head on a B-spline of radius 0.05; how Mathematica places and orients a head on so short a curve is not known. Only visible for ρ below about 0.3. |
| N-LP-01 | note | Lines through the origin (ρ = 0) have two parameters (θ and θ + π); every other line exactly one, since ρ ≥ 0. |
| N-LP-02 | note | The saved definitions (`Initialization :>` of the output cell) also hold an older four-argument `makeDialControl[Dynamic[ang], Dynamic[pt], cent, color]` with the `Normalize` setter, which never matches the three-argument call; leftover symbols `a[1] … a[6] = 0` and `FE`θ$$578`; and `splineCircle` is defined but unused. None of them changes the app. |
| N-LP-03 | note | The extracted source writes θ as `Theta` (`tools/nbextract.py`); in the notebook it is the Greek letter. |

## 8. Proposed changes

No open proposal.

| ID | Status | Requested by / date | Change | Reason | Acceptance criteria |
|----|--------|---------------------|--------|--------|---------------------|

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.30 | 2026-11-02 | generated by `tools/new-app.mjs`, then the design written from the notebook (owner request 2026-11-02) |
| 2 | v0.1.31 | 2026-11-02 | implemented after the owner's approval (licence and credit as above); S-1 `Rotate` of a centred Text, S-2 generator option `--source`; compared with the owner's three screenshots (K-LP-02 resolved, D-LP-02 measured, D-LP-04) |
| 3 | v0.1.32 | 2026-11-05 | A-LP-08: landing-page thumbnail (owner request 2026-11-05; `tools/make-thumbnails.mjs`); no change to this app's code, behaviour or picture |
| 4 | v0.1.33 | 2026-11-06 | version number (v0.1.33: four new apps; opt-in shared additions S-1 … S-7, unused by this app, and the locators of a Locator list made after the first evaluation); no change to this app's code, behaviour or picture |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|-------------|---------|-------------|---------|
| I-LP-01 | Dial labels and arc in [0, 2π) like the picture (or the picture in (−π, π] with ρ allowed negative) | one angle convention on the page | differs from the original | E-LP-01 |
| I-LP-02 | Keep the equation readable (rotate by θ + π/2 when upside down) and inside the picture for ρ > 2.5 | readable label everywhere | differs from the original | Q-LP-02, E-LP-03 |
| I-LP-03 | An exact circular arc (`Circle[{0,0}, ρ/2, {0, θ}]` with an arrowhead) instead of the B-spline | the arc stays on its circle | differs from the original | E-LP-04 |
| I-LP-04 | Show the line's equation with the numbers (e.g. "0.71x + 0.71y = 1.8") | the link between picture and equation | a port addition | — |

## 11. Errors in the original (conceptual and mathematical)

Checked on 2026-11-02 against the notebook's saved definitions and a numerical probe of the geometry (PG-R-26). Kind:
conceptual, mathematical, numerical or text; Status: open, kept or corrected in vX.Y.Z.

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|------|-----------------------|--------------------------|--------------------|-------------------------|--------|
| E-LP-01 | conceptual | the body's `If[θ < 0, θ = θ + 2π]` against the dial's `ArcTan` and labels in (−π, π] | two angle conventions for the same θ: below the x-axis the dial says (and draws) e.g. −π/2 clockwise while the picture draws and labels 3π/2 counter-clockwise | keeps both (Q-LP-01) | one convention on the page (I-LP-01) | open |
| E-LP-02 | conceptual | right-angle mark `(ρ - .2){Cos θ, Sin θ}` | for ρ < 0.2 the mark extends past the origin (at ρ = 0 it points away from a normal of length 0) | keeps it (Q-LP-03) | mark size min(0.2, ρ/2), or no mark at ρ = 0 | open |
| E-LP-03 | conceptual | the equation at `1.2 ρ {Cos θ, Sin θ}` with `PlotRange -> {{-3, 3}, {-3, 3}}`, ρ up to 3 | for ρ > 2.5 (θ near an axis; > 2.71 at θ = π/8) the equation's anchor leaves the picture and the text is cut off or not shown; at ρ = 3, θ = 0 the line lies on the picture's right edge | keeps it | a PlotRange of ±3.7, or the label at min(1.2ρ, 2.4) | open |
| E-LP-04 | mathematical | `myArrowArc2`: `Arrow[BSplineCurve[Table[c + r{Cos t, Sin t}, {t, start, end, (end - start)/11}]]]` (the author's comment: "problem -- initial point too far out") | a B-spline through control points on the circle is not the circle: it passes inside it — probe: 7 % of r for an arc of 63π/32, 1.8 % for π, 0.1 % for π/4 — while its ends lie on the circle, so the start looks "too far out" | keeps it (same shared code as the other dial apps) | an exact arc (I-LP-03) | open |
| E-LP-05 | conceptual | the ρ arrow's `Arrowheads[{-.03, .03}]` | the heads are sized as a fraction of the picture width (about 0.18 plot units each), not of ρ: for ρ below about 0.36 the two heads overlap and reach past the origin and the foot point (screenshot 3, ρ = 0.1) | keeps it | heads scaled to ρ (e.g. `Arrowheads[{-Min[.03, ρ/12], …}]`) | open |
