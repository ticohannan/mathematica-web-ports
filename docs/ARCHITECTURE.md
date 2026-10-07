# Architecture

What each app does and why is specified in its design document (`demos/<app>/DESIGN.md`);
how features are added is described in [`DESIGN_PROCESS.md`](DESIGN_PROCESS.md).

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

## No build step

Import maps (`<script type="importmap">`) resolve `three` to `vendor/three/three.module.js`.
Supported by Firefox ≥ 108, Chrome/Edge ≥ 89, Safari ≥ 16.4.
