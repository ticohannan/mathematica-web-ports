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
v0.1.16, which keeps re-export shims): `g3d.js` (Graphics3D as data), `svd3.js` (3×3 SVD, `zeroTol`), `dh-chain.js`
(`dhTransform` with an explicit exact-angle path, `computeTd`), `robot-draw.js` (joints, frames, gripper) and
`g3d-three.js` (`addPrims`, `disposeGroup`, `fitViewer`); their APIs are listed in each file's header.

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
