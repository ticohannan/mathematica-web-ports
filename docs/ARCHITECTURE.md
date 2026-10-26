# Architecture

What each app does and why is specified in its design document (`demos/<app>/DESIGN.md`);
how features are added is described in [`DESIGN_PROCESS.md`](DESIGN_PROCESS.md). Each design document ends with §11
*Errors in the original*: where the original is probably wrong, kept in the code until the owner decides (the
model files reproduce the original, errors included). Manual checks against the original in Mathematica follow
[`MATHEMATICA_CHECKS.md`](MATHEMATICA_CHECKS.md).

## Server vs. client

The deployment target is a **static file host** (GitHub Pages now; nginx/Caddy/OpenBSD httpd later if
wanted). The server executes no project code. Every page is HTML + ES modules that the browser
downloads once and then runs locally.

```
 Browser (client)                                         Server (static)
 ┌───────────────────────────────────────────────────┐    ┌─────────────────────┐
 │ index.html → demos/<x>/index.html                 │◀───│ GET *.html *.js *.css│
 │   main.js   (DOM, SVG / three.js, events)         │    │ (no logic, no state) │
 │     ├─ model / planner (pure JS math) ◀─ tested in Node without a browser     │
 │     ├─ shared/ui.js   (Manipulate-style controls)                            │
 │     └─ vendor/three   (WebGL)                                                 │
 └───────────────────────────────────────────────────┘    └─────────────────────┘
```

Consequences:

- No server-side attack surface beyond serving files; heavy interaction cannot overload the server.
- Works offline once loaded; can be hosted anywhere that serves files with correct MIME types
  (`.js` must be served as JavaScript for ES modules).
- No secrets, accounts, cookies or analytics.

## Module rule: pure model ↔ rendering

Each demo is split into

| File | May use DOM / WebGL? | Purpose | Tested by |
|------|---------------------|---------|-----------|
| `planner.js`, `rotations.js`, `model.js` (and the newer apps' model files, e.g. `carpaths.js`, `visibility.js`, `norms.js`, `demos/common/prm-core.js`) | **No** | line-by-line ports of the Wolfram code | Vitest (Node) + golden parity |
| `main.js` | Yes | builds controls, draws, handles input, exposes `window.__demo` | Playwright + manual checklist |

`window.__demo` is a small automation hook (get/set state, read computed results, read what was
actually rendered). It is what lets browser tests check *calculations shown on screen* instead of
only pixels.

## The Manipulate layer (`shared/manipulate.js`, `shared/graphics.js`; since v0.1.19)

The scaffolding every app used to write by hand — keeping the Manipulate variables, wiring each control to a
re-evaluation, locators and their ranges, `ControlActive`, the "Initial settings" button, layers and redraws, the
`window.__demo` hook — lives in two MIT modules, so that an app reads like its Mathematica source:

```js
Manipulate({
  name: 'robot-motion-obstacles',
  initial: initialState, ControlActive: true,
  body: evaluate,                                   // the pure model: one evaluation of the Manipulate body
  draw: (v, s) => [v.inCollision ? EdgeForm(Red) : EdgeForm(Black), armGraphics(v.geometry, v.arcs), …],
  graphics: { PlotRange: PLOT_RANGE, ImageSize: IMAGE_SIZE, PlotRangePadding: 0, label: '…' },
  controls: [
    [['pObs', [1.1, 1.1]], [-2, -2], [2, 2], Locator],
    [['Quality', 2, Style('Q', Italic)], 1, 10, 1, { Appearance: 'Labeled' }],
  ],
});
```

| Module | Provides |
|--------|----------|
| `shared/manipulate.js` | `Manipulate(spec)`; control specs in Mathematica's own forms (slider, setter bar with `Rule`, checkbox for `{False, True}`, `ControlType` `Slider`/`VerticalSlider`/`PopupMenu`/`IntervalSlider`, `Locator` incl. a list of points, 2D slider, `Control(factory)` for custom controls such as the dials, `Button`, `Row` of controls, hidden variables, `Delimiter`, headings; `Enabled` and ranges as functions of the state); Mathematica slider values (`steps: 'mma'`) by default; the controls show the variables after every evaluation; several pictures; `ControlActive`; `random` (`?seed=`, hook `setRng`), `settle`, `throttle`, `after`; reset; the test hook (`getState`, `setState`, `view`, `moveLocator`, `worldToClient`, `controlActive`, plus app extras); `cacheLast` (the originals' "…Old" caching as one helper); pure `parseControl`, `hookCopy`, `hookRead`; v0.1.22: the Graphics options `Axes`, `Ticks`, `AxesLabel`, `AxesOrigin`, `Frame`, `FrameTicks`, `FrameLabel`, `PlotLabel` (drawn once, room made automatically), `ControlPlacement: 'Top'`, a locator `Appearance` given as Graphics primitives or as a function of the state, a body that returns a bare list of primitives; v0.1.23: framed pictures (AspectRatio, per-axis PlotRangePadding, UpdateFrame, PlotRangeClipping) for plots, locator lists whose length changes at run time, `{True, False}` checkboxes, named slider widths; v0.1.24: `clock` (the body reads `AbsoluteTime[]` as `time`; `absoluteTime`, hook `setClock`) for bodies that drive in real time together with `settle`, Locator variables whose value changes between one point and a list of points; v0.1.25: the clock moved to `shared/clock.js`; `setState` accepts exact numbers in the saved-state form `{wl, n}` and the slider shows their text ("1/7", "5π/32") until moved |
| `shared/graphics.js` | 2D `Graphics` as data: primitives `Line`, `Polygon`, `Rectangle` (`RoundingRadius`), `Disk`, `Circle` (and arcs), `Point`, `Arrow`, `Text`, `Rotate`, `Translate`, `Inset` (of a small Graphics), `Raster`; directives (colours as `RGBColor` objects, `Darker`/`Lighter`/`Blend`, `Opacity`, `Thickness`/`AbsoluteThickness`/`Thin`/`Thick`, `AbsoluteDashing`, `CapForm`, `PointSize`, `Arrowheads`, `EdgeForm`, `FaceForm`, `Transparent`, `Directive`, fonts); `Style`/`Subscript` text; Mathematica's list scoping of directives; `Annotation[g, id, attrs]` for test ids; `Raw` as a migration aid for helpers not yet written as data; `Tooltip`, `cachedGraphics` (a part redrawn only when its keys change), ellipses (`Disk[c, {rx, ry}]`), `Text` offsets, `Superscript`, `Row` text; pure `walk`, `textOf`, `htmlOf`; v0.1.21: `Clip` (PlotRangeClipping for a part), `Column` (multi-line text), `ScriptSizeMultipliers`/`ScriptBaselineShifts`, and the queries `Cases`, `annotations`, `annotation` (tests and models read the drawn numbers from the data); v0.1.22: `ArrayPlot` (`DataRange`, `ColorRules`, `ColorFunction`), named font sizes (`Style(…, 'Medium')`, `FONT_SIZES`); v0.1.23: `Hue`, 2D `Ellipsoid[c, Σ]`, elliptic `Circle`, `scaleGraphics`, absolute named `PointSize`, `Arrowheads` lists; v0.1.24: sector disks `Disk[c, r, {a0, a1}]` (`sectorPoints`), `Opacity` also on points and text |
| `shared/graphics-extras.js` | picture parts as Graphics data not (yet) offered as options: `axesGraphics`, `locatorGlyph`, `notchedArrowhead`, `arrowheadPolygon`, `arcArrowGraphics`, `plotUnitsPerPx` (v0.1.21, from the former CC `plot-extras.js`/`arrow-graphics.js`); v0.1.22: `decorationMargins`, `plotDecorations` (the Graphics options above) |
| `shared/wl.js` | v0.1.22, for new apps ("simple mode", [NEW_APP.md](NEW_APP.md)): about 90 Wolfram Language list, vector and number functions under their own names (`Table` with Mathematica's iterators, `Range`, `Part`, `Select`, `Position`, `Fold`, `Nest`, `MapThread`, listable `Plus`/`Subtract`/`Times`/`Divide`, `Dot`, `Norm`, `Det`, `Inverse`, `RotationMatrix`, `ArcTan[x, y]`, `Round` (halves to even), `Mod`, `Random*` with an optional seeded source, `cacheLast`, …); plain JavaScript arithmetic — the course ports keep their exact helpers |
| `shared/clock.js` | v0.1.25: the page's one clock — `absoluteTime()` (Mathematica's `AbsoluteTime[]`), `setClock(t)` (tests fix the time; hook `window.__demo.setClock` on every page), `animate(step)` (one step per animation frame with the clock's time); read by the Manipulate layer's `clock`, the sliders' ⊕ animation and app animations (euler-angles' bookmark tour) |
| `shared/plot.js` | v0.1.23: `Plot`, `ListPlot`, `ListLinePlot`, `ParametricPlot`, `Show`, `Placed`, `ColorData[97]` as Graphics data (adaptive sampling, gaps, Filling, PlotStyle, PlotLegends, Epilog, automatic ranges and padding); the layer draws them with an `AspectRatio` (data scaled), PlotRangeClipping, the legend beside the image, and redraws the frame when its options change (`UpdateFrame`) |
| `shared/geometry.js` | v0.1.23: `ConvexHull`, `PolygonArea`, `RegionMember`, `SignedArea`, `SegmentIntersection`, `RegionNearest`/`RegionDistance`, `SegmentsClosestPoints`, `Eigensystem2`, `CircumCircle`, `RollPitchYawMatrix` (plain arithmetic, for new apps) |
| `tools/new-app.mjs` | v0.1.22: `npm run new-app -- <dir> --title … --slug … --authors …` [`--3d`] writes a working app on the layer (page, `main.js`, `model.js`, `DESIGN.md`, unit and browser tests, checklist) and registers it (landing page, `tests/e2e/apps.js`, LICENSE.md, README, DESIGN_PROCESS); `--remove <dir>` undoes it |
| `shared/graphics3d.js` | `Graphics3D` as data (v0.1.21, from `demos/common/g3d.js`): directives and list scoping, `Sphere`, `Cylinder`, `Cuboid`, `Polygon`, `Line`, `Point`, `Arrow`, `Ellipsoid`, `InfinitePlane`, `GeometricTransformation`, `Rotate`, `Show`, `ParametricPlot3D`, `GraphicsComplex`, `Group3D` (cached parts), `flatten`, bounds, `mul4`/`mul4Fma`, frame/tick/clip helpers; v0.1.23: `Tube`, `Cone`, `InfiniteLine`, `Text` (CSS2D labels, `FontSize`), `InfinitePlane[p, {v1, v2}]`, collinear planes drawn as nothing |
| `shared/graphics3d-three.js`, `shared/graphics3d-view.js` | the three.js renderer of flattened Graphics3D (`addPrims`, `fitViewer`, `disposeGroup`) and `View3D(options)`, a picture renderer for `Manipulate` (`{ id, renderer: View3D({...}) }`): one viewer kept across evaluations, `ImageSize`, `ViewPoint`, `ViewAngle`, `PlotRange` (refit or clipping), `BoxRatios`, `Boxed`/`Axes`/`Ticks`/`AxesLabel`/`PlotLabel`, `Lighting`, WebGL 2 fallback, plus port options |
| `shared/svd3.js`, `shared/plot3d.js`, `shared/region-plot3d.js` | 3×3 SVD and MatrixRank; a Plot3D box/ticks/lighting-shader frame; RegionPlot3D-style marching tetrahedra (v0.1.21, generic parts moved out of the apps, owner decision D1) |

They build on `shared/ui.js` and `shared/svg-plot.js`, which are unchanged; apps not yet migrated keep using those
directly. Migrated in v0.1.19: robot-motion-obstacles, bfs-motion-planning, dubins-path, art-gallery; in v0.1.20 the other
2D apps: rrt, prm, prm-seven-link, car-paths, camera-lasers, distance-norms, two-link-kinematics, four-bar-linkage,
minkowski-sum, dubins-isochrons, motion-planning (each with the same pictures and states as before, checked by its
unchanged tests and a pixel comparison). In v0.1.21 all eleven 3D apps followed (pictures `{ id, renderer }`: `View3D` or
the app's own renderer object for special drawing — torus-chart, prm-3d, unit-balls, euler-angles,
three-parametrizations, prm-robot-arm's inset), and nine 2D models build their pictures as Graphics data themselves (the
body returns `{ state, view, graphics }`); the car icon `demos/common/car-icon.js` returns Graphics data. Further layer
options: variable paths (`'theta.0'`), `Assign`, `Moved`, `merge`, `resetStops`, `initialSettings`, hook `graphics(k)`.
All 26 apps now use the layer. Tests: `tests/unit/graphics.test.js`, `tests/unit/manipulate.test.js`,
`tests/unit/graphics3d*.test.js` (pure parts) and the apps' browser tests.

## Mathematica semantics (`shared/mma.js`)

The ports reproduce Wolfram Language numeric behaviour that the originals depend on:
`ArcTan[x, y]` argument order and no signed zero, tolerant `Equal`/`Less`, `Mod[m, n, d]`,
`Round` half-to-even, exact `CirclePoints` radicals, and `Sort[list, p]` tie order. Several of these
were *required* to reproduce the original's cached results bit-for-bit (see tests/golden).

`shared/mma-exact.js` (since v0.1.7) goes one step further for the motion-planning port: `Det`, `Norm`
and `ArcTan` give Mathematica's results bit for bit (LU with fused multiply-add, BLAS `dnrm2`, correctly
rounded `atan2`), measured against Mathematica 15.0.1 with the comparison tool's trace mode.

The seven apps added in v0.1.12 add MIT helpers: `shared/mma-extra.js` (list semantics such as `Nearest`,
`MinimalBy`, `Position`, `Accumulate`, number formatting), `mma-colors.js` (named colours, `Lighter`/`Darker`),
`mma-lighting.js` (Mathematica's documented default lights), `random.js` (seeded or replayed random numbers, so
saved states of the originals can be replayed) and `requirements.js` (start-up watchdog and WebGL 2 notice, DEC-22).
v0.1.13 adds `beep.js` (a short Web Audio tone for Mathematica's `Beep[]`, played only after the user's first press,
touch or key press on the page and only while the browser lets audio run; used by the seven-link robot).

Generic MIT helpers for the batch of sixteen further apps (cross-app decisions: each app's design document cites them;
no Demonstration code in them — code derived from a Demonstration goes to `demos/common/`, CC BY-NC-SA):

| Module | Provides |
|--------|----------|
| `shared/ui.js` (additive options) | `Controls.slider` options `plus: false` (no ⊕ animation panel), `steps: 'mma'` (Mathematica's discrete slider values min + k·step in machine arithmetic, the right end = max; drag, keys, panel and typed values land on them; Mathematica-style value text), `labeled: 'text'`, `format`/`parse` hooks; pure helpers `mmaGrid`, `mmaSliderText`. Defaults unchanged. |
| `shared/ui-interval.js` | `addIntervalSlider` — IntervalSlider with `method` 'Free' / 'Push' / 'Stop', `minIntervalSize`, `labeled`, pointer and keyboard; pure `intervalStep`, `intervalShift`, `intervalLabel`. |
| `shared/mma-extra.js` (additions) | `lengthCR`, `normalizeCR` (v·(1/correctly rounded length)), `normalizeDnrm2` (v·(1/dnrm2 length)), `engineeringForm` / `engineeringParts` (EngineeringForm text), `nDigits` (text of N[x, n]). |
| `shared/mma-text.js` | text of exact numbers: `piFraction` ('inline' "5π/32" or 'stacked' parts), `fractionText` / `fractionParts`, `numberText` / `numberParts`, `parsePiFraction`, `parseFraction`. |
| `shared/exact-pi.js` | Cos/Sin of exact multiples of π with Mathematica's first-octant rewriting and exact 0, ±1, ±1/2: `reducePi`, `trigPi`, `cosPi`, `sinPi`, `cosSinPi`, `octantForm`; correctly rounded N[π/n] and N[num π/den]: `piOver`, `piFrac` (owner manipulability-ellipsoid, K-ME-09). |
| `shared/svg-frame.js` | Frame, frame ticks, axes and tick labels for `svg-plot.js` pictures: `drawFrame`, `drawAxes`, `clipToRange`, `frameLayout`; pure `ticks`, `automaticTicks`, `tickLabel`, `framePrimitives`, `axesPrimitives`. |
| `shared/three-helpers.js` (additive option) | `createViewer({imageSize: [w, h]})` for a non-square image (the square viewer is unchanged); pure `viewerSize`, `viewerCamera`. |

The 3D apps of batch B share the DH-family modules in `demos/common/` (CC BY-NC-SA, moved from robot-singularities in
v0.1.16, which keeps re-export shims): `svd3.js` (`manipEllip`; re-exports `shared/svd3.js`), `dh-chain.js`
(`dhTransform` with an explicit exact-angle path, `computeTd`) and `robot-draw.js` (joints, frames, gripper); the generic
Graphics3D model and renderer (formerly `g3d.js`, `g3d-three.js`) are MIT in `shared/` since v0.1.21. Their APIs are
listed in each file's header.

Their browser behaviour is tested on a test page that is not part of the site (`tests/e2e/fixtures/shared-controls.html`,
`tests/e2e/shared-controls.spec.js`); the pure parts by `tests/unit/<module>.test.js`.

## Rendering choices

- **Motion planning → SVG.** Flat 2D; locators are DOM elements (native pointer events, testable
  `data-testid`s, crisp at any zoom).
- **Newer 2D apps → SVG through `shared/svg-plot.js`**: Mathematica `Graphics` (plot range, absolute line widths
  and point sizes, text) mapped to SVG, and Manipulate locators with LocatorPane semantics (a press goes to the
  nearest locator; arrow keys move a focused locator).
- **Newer 3D apps (unit balls, robot singularities, the PRM robot-arm inset) → three.js** with Mathematica's
  documented default lights (`shared/mma-lighting.js`) and the surfaces/regions computed in the model files.
- **Rotation demos → three.js.** Mathematica conventions emulated: z-up camera from `ViewPoint`
  (scaled box coordinates), `ViewAngle`, approximate default lighting, `Thick` lines as screen-space
  lines, labels as HTML overlays.

## Browser requirements (decision DEC-22)

The WebGL apps require WebGL 2; there is no fallback renderer. Instead of an empty page, a browser that cannot run an
app gets a clear notice: the seven apps added in v0.1.12 load `shared/requirements.js` (a start-up watchdog, a WebGL 2
check, and a `<noscript>` message). The first three apps do not have the notice yet.

## Shared code and single-app deployment

Code used by several apps lives once, in `shared/` (MIT), `demos/common/` (CC BY-NC-SA 3.0) and `vendor/three/`; the
apps import it by relative paths (`../../shared/ui.js`) and through the import map, never by absolute URLs. That keeps
one app deployable on its own (owner rule R-A): `npm run bundle -- <dir>` (`tools/bundle-app.mjs`) follows the page's
imports and references and copies exactly the files it loads into `dist/<dir>/`, with the repository's layout, plus a
root page, README and licence texts; any static host can serve that folder. Rules for app code that follow from this:
reference files only by literal relative paths (a computed `import(…)` or `new URL(…, import.meta.url)` makes the
bundler stop; list such files in `tools/bundle-app.config.json`), and keep every file an app needs under `demos/`,
`shared/` or `vendor/`. `tests/e2e/bundle.spec.js` runs every app from its bundle alone.

## No build step

Import maps (`<script type="importmap">`) resolve `three` to `vendor/three/three.module.js`.
Supported by Firefox ≥ 108, Chrome/Edge ≥ 89, Safari ≥ 16.4.
