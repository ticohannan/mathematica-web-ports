# Architecture

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
| `planner.js`, `rotations.js`, `model.js` | **No** | line-by-line ports of the Wolfram code | Vitest (Node) + golden parity |
| `main.js` | Yes | builds controls, draws, handles input, exposes `window.__demo` | Playwright + manual checklist |

`window.__demo` is a small automation hook (get/set state, read computed results, read what was
actually rendered). It is what lets browser tests check *calculations shown on screen* instead of
only pixels.

## Mathematica semantics (`shared/mma.js`)

The ports reproduce Wolfram Language numeric behaviour that the originals depend on:
`ArcTan[x, y]` argument order and no signed zero, tolerant `Equal`/`Less`, `Mod[m, n, d]`,
`Round` half-to-even, exact `CirclePoints` radicals, and `Sort[list, p]` tie order. Several of these
were *required* to reproduce the original's cached results bit-for-bit (see tests/golden).

## Rendering choices

- **Motion planning → SVG.** Flat 2D; locators are DOM elements (native pointer events, testable
  `data-testid`s, crisp at any zoom).
- **Rotation demos → three.js.** Mathematica conventions emulated: z-up camera from `ViewPoint`
  (scaled box coordinates), `ViewAngle`, approximate default lighting, `Thick` lines as screen-space
  lines, labels as HTML overlays.

## No build step

Import maps (`<script type="importmap">`) resolve `three` to `vendor/three/three.module.js`.
Supported by Firefox ≥ 108, Chrome/Edge ≥ 89, Safari ≥ 16.4.
