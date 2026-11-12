# Design document: Defects in an Optical Fiber

| | |
|---|---|
| Code version: | 0.1.37 |
| Document revision | 2 (2026-11-06) — implemented after the owner's "go" (Q-1: the lower plot of even-odd-synthesis at 500 px); compared with the four snapshots |
| Status | describes the app as implemented; changes go through Proposed changes (§8) |
| Original | Wolfram Demonstrations Project, "Defects in an Optical Fiber", contributed by Aaron T. Becker and Hoang Nguyen, published 2016-10-27 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/DefectsInAnOpticalFiber/> |
| Port files | `model.js` (`Gamma`, `LineIntersectionPoint`, `SegmentIntersectionQ`, `angtest`, `testpoint`, `incidentAng`, `normAng`, the recursive `TraceLaser` and one evaluation of the body; pure), `main.js` (the Manipulate on `shared/manipulate.js`), `index.html` |
| Role in the project | new demonstration, simple mode (v0.1.33): generator, `shared/wl.js`, `shared/graphics.js`, the segment helpers of `demos/common/segments.js`, plain arithmetic |

## 1. Purpose and background

Light in an optical fiber of index N = 1.5 in vacuum (N = 1) travels by total internal reflection; a triangular
defect (vacuum) cut into the fiber's lower edge lets light escape. Two light sources (locators) each emit a ray at an
angle set by a slider. At every boundary the ray is traced recursively: it is reflected, and — unless the angle of
incidence exceeds the critical angle — also refracted (Snell's law), the reflected share of the power given by the
normal-incidence Fresnel reflectance ((N1 − N2)/(N1 + N2))². Each ray segment is drawn with opacity 5 × its power; the
boundary normals are drawn in blue at each hit.

Source as text: [`docs/original-source/optical-fiber-defects.txt`](../../docs/original-source/optical-fiber-defects.txt); snapshots `docs/original-snapshots/optical-fiber-defects-1…4.png`; saved states `tests/golden/optical-fiber-defects.original-states.json`. The saved definitions in the output cell are the initialization cell's (checked 2026-11-06).

## 2. Scope

In scope: the whole Manipulate (four sliders, two locators, the picture), caption and Details. Out of scope: nothing.

## 3. Users and use cases

- UC-OF-01: a student moves a source and changes its angle and sees total internal reflection, refraction and
  the light lost at the defect.
- UC-OF-02: a student changes the defect's height and width and sees which rays escape.

## 4. Features

Source: the Manipulate and the initialization cells. len = 5, fiber height DD = 1.

| ID | Feature | Reason | Since | Verified by |
|----|----|----|----|----|
| F-OF-01 | Sliders `{{h, 3 * .135, "defect height"}, 0, 1}` and `{{w, 3 * .260, "defect width"}, 1/32, 2}` in one row (no value field) | the defect's size | v0.1.33 | e2e "has its controls with their defaults" |
| F-OF-02 | Sliders `{{θ1, -4π/64, "light angle θ1"}, -π, π}` and `{{θ2, -4π/64, "light angle θ2"}, -π, π}` in one row | the rays' directions | v0.1.33 | e2e "has its controls with their defaults" |
| F-OF-03 | Locators `{{p, {{-1.8, 1/2}, {-3.8, 1/2}}}, Locator}` (default glyph, unbounded) | the sources | v0.1.33 | e2e "dragging a source moves its ray" |
| F-OF-04 | Picture: light-gray fiber `Rectangle[{-5, 0}, {5, 1}]`, the defect as a white triangle {(0, h), (w/2, 0), (−w/2, 0)}, `ImageSize -> Large`, `PlotRange -> {{-4.9, 5}, {-2, 4}}` | the scene | v0.1.33 | e2e "loads without errors and draws the picture" |
| F-OF-05 | Boundaries (five segments): bottom left, the defect's two sides, bottom right, top | where light reflects | v0.1.33 | unit "the boundary segments" |
| F-OF-06 | Start medium: a source inside the fiber and not inside the defect (`testpoint`) starts with N1 = 1.5, N2 = 1; otherwise N1 = 1, N2 = 1.5 | correct indices | v0.1.33 | unit "a source inside the fiber starts in N = 1.5" |
| F-OF-07 | `TraceLaser[pt, θ, pow, segs, N1, N2]`: the nearest boundary hit with squared distance above 0.001 (distance above 0.0316) within 50 units; the segment drawn with `Opacity[5 pow]`; it stops when no boundary is hit, the hit is 25 or more from the origin, or pow ≤ 1/100; otherwise, with the incidence angle from `incidentAng` and critical angle ArcSin[N2/N1] (π when N1 ≤ N2): if \|incAng\| < critAng a refracted ray at θ − incAng + ArcSin[N1/N2 sin incAng] with pow(1 − R), R = ((N1 − N2)/(N1 + N2))², recursing with the indices swapped; the normal at the hit (blue, Thickness 0.002, 0.2 long, solid outward, dashed inward); and a reflected ray at θ − π − 2 incAng with power pow R (pow if not refracted) | the light paths | v0.1.33 | unit "TraceLaser at the snapshot settings"; unit "power is conserved at each split"; M-OF-07 |
| F-OF-08 | Ray style: Red, Thick, `CapForm["Butt"]`, `JoinForm["Bevel"]` | the original's look | v0.1.33 | e2e "loads without errors and draws the picture" |
| F-OF-09 | Opening state h = 0.405, w = 0.78, θ1 = θ2 = −π/16, p = {{−1.8, 1/2}, {−3.8, 1/2}} | the Manipulate's initial values | v0.1.33 | unit "the opening state" |
| F-OF-10 | The four snapshot settings load and give the original's pictures | parity with the original | v0.1.33 | e2e "the four snapshot settings"; unit "TraceLaser at the snapshot settings" |
| F-OF-11 | Caption and Details text (from the Demonstration) | the original's explanation | v0.1.33 | M-OF-01 |
| A-OF-01 | "Initial settings" button restores the opening state | Manipulate's Initial Settings | v0.1.33 | e2e "Initial settings restores the opening state" |
| A-OF-02 | Test and automation hook `window.__demo` from the Manipulate layer | automated tests | v0.1.33 | e2e "dragging a source moves its ray" |
| A-OF-03 | Start-up notice when the browser cannot run the page (DEC-22) | no empty page | v0.1.33 | e2e "start-up notice when" |
| A-OF-04 | Breadcrumb link to all demos | navigation | v0.1.33 | inventory |
| A-OF-05 | Credits footer (authors, title, source, licence, adaptation notice) | required by the licence (CC BY-NC-SA 3.0 §4) | v0.1.33 | e2e "attribution on" |
| A-OF-06 | This app can be bundled and served alone (§6.1) | owner rule R-A | v0.1.33 | e2e "bundle: optical-fiber-defects runs from its own folder" |
| A-OF-07 | Landing-page thumbnail `thumbnail.webp` | owner request 2026-11-05 | v0.1.33 | e2e "every card on the landing page has a thumbnail that loads" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|----|----|
| `*-h` | F-OF-01 |
| `*-w` | F-OF-01 |
| `*-θ1` | F-OF-02 |
| `*-θ2` | F-OF-02 |
| `locator-p-*` | F-OF-03 |
| `reset` | A-OF-01 |
| `crumbs` | A-OF-04 |
| `details` | F-OF-11 |
| `credits` | A-OF-05 |

## 6. Design

- `model.js` (pure): `angtest`, `testpoint`, `incidentAng`, `normAng` and the recursive `TraceLaser` as in the
  initialization cells (Graphics data: `Opacity[5 pow]`, the segment, then the refracted ray, the normals and the
  reflected ray in a sublist, so the directives are scoped as in Mathematica); the segment helpers from
  `demos/common/segments.js`; `edgesOf`, `startIndices`; `evaluate(state)` → `{ view: { rays, indices }, graphics }`
  (every traced segment with its power in `view.rays`).
- `main.js`: one `Manipulate({…})`, ControlPlacement Top, the two Rows of sliders without value fields and the two
  locators; `graphics: { PlotRange: [[-4.9, 5], [-2, 4]], ImageSize: 576 }` (Large).
- Shared code added for this app (v0.1.33, MIT, opt-in): S-7 `JoinForm`.
- Size: model 112 lines, main 25 lines (the WL definitions 60 lines, the Manipulate 30).

### 6.1 Building and deploying this app alone

Owner rule R-A (2026-10-17): this one app can be taken out of the repository and hosted anywhere.

- Command, in the repository folder: `npm run bundle -- optical-fiber-defects` → `dist/optical-fiber-defects/`.
- Contents (generated with `node tools/bundle-app.mjs optical-fiber-defects --update-docs`):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/optical-fiber-defects/`) | 3 | `index.html`, `main.js`, `model.js` |
| `shared/` | 17 | `clock.js`, `graphics-extras.js`, `graphics.js`, `manipulate.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `mma.js`, `random.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `ui-extra.js`, `ui-interval.js`, `ui.js`, `wl.js` |
| `demos/common/` | 1 | `segments.js` |
| added by the bundler | 7 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/optical-fiber-defects/DESIGN.md` |
<!-- bundle-contents:end -->

- Checked by e2e "bundle: optical-fiber-defects runs from its own folder" (A-OF-06).

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

| ID | Kind | Description |
|----|------|-------------|
| D-OF-01 | deviation | Tolerances: the segment helpers are the shared ones of `demos/common/segments.js` (the same definitions; `Det[…] == 0` and `0 <= Gamma <= 1` with Mathematica's tolerant comparisons, Det as Mathematica's); the one remaining difference is that a machine real with an integral value (e.g. the top edge's 1.) is taken as exact there. Rays grazing a vertex may split differently. |
| Q-OF-01 | quirk kept | `Opacity[5 pow]`: a ray is fully opaque until its power falls below 0.2. The normals inherit the opacity of the ray that hit the boundary. |
| Q-OF-02 | quirk kept | The fiber's ends (x = ±5) are open: no boundary, so rays leave there; and `PlotRange` starts at −4.9, cutting 0.1 off the fiber's left end. |
| Q-OF-03 | quirk kept | The locators are unbounded and the sliders show no values. |
| D-OF-02 | deviation | Faint rays look lighter than in the snapshots: a ray of `Opacity[0.19]` measures 0.35 there (as if drawn twice), 0.19 here; the opacities are the original's. |

## 8. Proposed changes

No open proposal. Template (see [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md)):

| ID | Status | Requested by / date | Change | Reason | Acceptance criteria |
|----|--------|---------------------|--------|--------|---------------------|

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.33 | 2026-11-06 | generated by `tools/new-app.mjs`, then the design written from the notebook (owner request 2026-11-06) |
| 2 | v0.1.33 | 2026-11-06 | implemented after the owner's "go" (2026-11-06); shared additions S-1 … S-7: `shared/plot.js` Exclusions/ExclusionsStyle, PlotMarkers, InterpolationOrder 0; `shared/ui-extra.js` + `shared/manipulate.js` CheckboxBar; `shared/svg-plot.js` + `shared/manipulate.js` LocatorAutoCreate; `shared/wl.js` HeavisidePi; `shared/graphics.js` JoinForm; compared with the four snapshots |
| 3 | v0.1.34 | 2026-11-10 | version number (v0.1.34: the switch "errors of the original: kept \| corrected" for the apps with code-level findings in §11, `shared/errata.js`); no change to this app's code, behaviour or picture |
| 4 | v0.1.35 | 2026-11-11 | version number (v0.1.35: two new apps, paths-inside-a-polygon and voronoi-diagrams; no shared code changed); no change to this app's code, behaviour or picture |
| 5 | v0.1.36 | 2026-11-11 | version number (v0.1.36: the full colour menu of voronoi-diagrams); no change to this app's code, behaviour or picture |
| 6 | v0.1.37 | 2026-11-12 | version number (v0.1.37: thirteen control and signal ports and the shared modules they use; the additions to shared/plot.js, graphics.js and manipulate.js are opt-in); no change to this app's code, behaviour or picture |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|-------------|---------|-------------|---------|
| I-OF-01 | Fresnel reflectance for the actual angle (unpolarised average of s and p) | physically right powers | differs from the original | E-OF-01 |
| I-OF-02 | Value fields on the sliders | readable settings | differs from the original | Q-OF-03 |
| I-OF-03 | Show the power of each ray segment (e.g. on hover) | the faint rays become readable numbers | more text in the picture | Q-OF-01 |

## 11. Errors in the original (conceptual and mathematical)

Checked on 2026-11-06 against the notebook, its Details and a numerical check of the Details formulas (PG-R-26).

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|------|-----------------------|--------------------------|--------------------|-------------------------|--------|
| E-OF-01 | conceptual | `powReflect = pow ((N1 - N2)/(N1 + N2))^2` for every angle | this is the normal-incidence reflectance; the reflected share grows with the angle of incidence (to 1 at the critical angle, Fresnel), so oblique rays leak too much power into the refracted ray | keeps it | I-OF-01 | open |
| E-OF-02 | mathematical | Details: "the ratio of refracted light is 1 − ((N1 − N2)/(N1 + N2))² = N1(N2(2/(N1 + N2)))²" | the right side is wrong; 1 − R = 4 N1 N2/(N1 + N2)². Probe: equal only when N2 = 1 (0.96 for 1.5 → 1), but 1.44 instead of 0.96 for 1 → 1.5 (a ratio above 1) | shows the original text | correct the formula | open |
| E-OF-03 | text | Details: "the light is reflected. If the latter medium has a lower index of refraction or if θa is greater than the critical angle θc, the light is refracted as well" | inverted: light is also refracted when the latter medium has a higher index, or when θa is smaller than θc (the code does this: `Abs[incAng] < critAng`) | shows the original text; the code is right | correct the sentence | open |
| E-OF-04 | text | Caption: "light can still be refracted through the boundary if the angle between the light and boundary is greater than the critical angle" | the critical angle is measured from the normal, not from the boundary: with φ the angle to the boundary, refraction needs φ > 90° − θc, not φ > θc (41.8°) | shows the original text | "angle between the light and the normal is smaller than the critical angle" | open |

