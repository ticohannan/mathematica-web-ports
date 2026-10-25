# Design document: Probabilistic Roadmap Method

| | |
|---|---|
| Code version: | 0.1.22 |
| Document revision | 6 (2026-10-18) — `demos/common/prm-core.js` generalised to n dimensions (by prm-3d); no change to this app |
| Status | describes the app as implemented; changes go through *Proposed changes* (§8) and [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md) |
| Original | Wolfram Demonstrations Project, "Probabilistic Roadmap Method", contributed by Aaron T. Becker and Yitong Lu, published January 13, 2020 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/ProbabilisticRoadmapMethod/>. Readable source: [`docs/original-source/prm.txt`](../../docs/original-source/prm.txt); snapshots: `docs/original-snapshots/prm-*.png`; saved state: `tests/golden/prm.original-state.json` |
| Port files | `model.js` (obstacles, the Manipulate body as one pure evaluation, the data of the picture and the picture as `shared/graphics.js` data), `main.js` (the Manipulate on `shared/manipulate.js`: controls, locators; v0.1.21), `index.html`; shared with "PRM for Robot Arm" and "PRM in 3D" (generalised to n dimensions in v0.1.16): [`demos/common/prm-core.js`](../common/prm-core.js) (`toroidDist`, `angtest`, `ptInPoly`, `ptInPolys`, `pathOKT`, `myAstar`, `toroidLine(s)`, `toroidPt`, `connectPoints` core, the query and progress code, the `loc` icon) |
| Role in the project | further demonstration (extra proof of concept alongside the motion-planning port); developed in a separate, unpublished repository and added to this site in v0.1.12 |

## 1. Purpose and background

The probabilistic roadmap method (PRM, Kavraki et al. 1996) on a two-dimensional configuration space shaped like a
torus (two joint angles, each 0…2π, wrapping at the edges). The user samples random configurations in batches of 50
(green = free, red = inside one of four random polygonal C-obstacles), chooses a connection radius for the roadmap,
and drags a start and a goal configuration; the Demonstration connects both to the roadmap, searches it ("A*") and
lets the user move along the path with a "progress" slider.

## 2. Scope

In scope: the original's controls (add 50 vertices, radius, progress, show obstacles, restart), the two locators,
the random obstacles and samples, the local planner, the incremental and full roadmap construction, the query and
graph search, the picture and its label. Out of scope (would need a design entry first): other planners, saving or
loading roadmaps in the UI, more obstacles, a real A* heuristic.

## 3. Users and use cases

| ID | User | Use case |
|----|------|----------|
| UC-PR-01 | student | sample the configuration space and watch the roadmap grow with the radius |
| UC-PR-02 | student | drag start and goal configurations and follow the planned path with "progress" |
| UC-PR-03 | tester | compare the port with the original's saved state (its own random numbers) and snapshots |

## 4. Features

### 4.1 Controls

| ID | Feature | Why | Since | Verified by |
|----|---------|-----|-------|-------------|
| F-PR-01 | "add 50 vertices" button: `RandomReal[{0, 2π}, {50, 2}]` samples, classified with `ptInPolys` (free → goodPts, colliding → badPts, in sampling order); the new free samples are connected to the roadmap incrementally (`connectPoints` from point2start) | step (1) and (2) of the PRM (UC-PR-01) | v0.1.0 | e2e ""add 50 vertices" samples 50 configurations, drawn as green (free) and red (in collision) points"; unit ""add 50 vertices" adds 50 samples, classified with ptInPolys in sampling order"; golden "prm: snapshot 2: polygons, free and colliding samples and the roadmap of radius r are rebuilt from the saved samples bit for bit"; golden "prm: snapshot 4: polygons, free and colliding samples and the roadmap of radius r are rebuilt from the saved samples bit for bit" |
| F-PR-02 | "radius" slider 0…1, step 0.01, default 0.5, value shown, with Mathematica's ⊕ animation panel: when r ≠ rold and there are more than 5 free samples, the whole roadmap is rebuilt from point 1 (rold = r); r = 0 leaves no edges | roadmap density (UC-PR-01) | v0.1.0 | e2e "moving the radius slider with the mouse rebuilds the roadmap"; unit "a radius change rebuilds the whole roadmap from point 1 (rold = r)"; unit "radius 0 empties the roadmap (no connectPoints for r = 0)"; unit "with at most 5 good points no rebuild happens (rold stays -1)" |
| F-PR-03 | "progress" slider 0…1, step 0.01, value shown, ⊕ panel; enabled only when a path exists (`Length[path] > 0 \|\| path == -2`); moves the purple point along qs → path → qf by arc length | step (3): traverse the path (UC-PR-02) | v0.1.0 | e2e "a path enables the progress slider, shows "path length = 1.8" and moves the purple point"; unit "progressOnPath walks qs -> path -> qf by arc length"; unit "no samples: "no path possible" and the progress slider disabled" |
| F-PR-04 | "show obstacles" checkbox (default off): draws the C-obstacle polygons in Pink | the PRM does not need them, but they explain the red samples | v0.1.0 | e2e ""show obstacles" draws the four pink obstacle polygons" |
| F-PR-05 | "restart" button: 4 new random polygons, all samples and the roadmap removed; r, rold, the locators, progress and the checkbox are kept | start over with a new configuration space | v0.1.0 | e2e "restart draws new obstacles and removes the samples"; unit "restart keeps r, rold, the locators and the obstacle checkbox" |
| F-PR-06 | Two locators, goal qf (default {5, 5}) and start qs ({1, 1}), `Appearance -> None`, range {-.1, -.1}…{2.1π, 2.1π}; a locator pulled past an edge jumps to the opposite edge (Q-PR-06); the Manipulate's Locator controls form a LocatorPane, which "by default directs any click to the nearest locator" (reference.wolfram.com/language/ref/LocatorPane.html, Details): a press away from both locators moves the nearer one there (since v0.1.1; the 12 px zone in which a press grabs without a jump is a port choice, D-PR-07); a press that grabs a locator gives it keyboard focus, so a value typed into a field is committed first | choose the query (UC-PR-02) | v0.1.0 | e2e "dragging the start locator with the mouse moves qs"; e2e "a locator dragged past the left edge jumps to the right edge (2π), as in the original"; e2e "a press away from every locator moves the nearest locator there"; e2e "a value typed into the radius field is committed when the picture is pressed next"; unit "a locator dragged past an edge jumps to the opposite edge (qs[[1]] = 2π, not +2π)"; unit "locator positions are clipped to the Manipulate range {-.1,-.1}..{2.1π,2.1π}" |

### 4.2 Model (`model.js`, `demos/common/prm-core.js`)

| ID | Feature | Why | Since | Verified by |
|----|---------|-----|-------|-------------|
| F-PR-07 | Obstacles: `polySides = RandomInteger[{3, 7}, 4]`, `polyXY = RandomReal[{0, 2π}, {4, 2}]`, polygons = polyXY + exact `CirclePoints[n]` (machine values as Mathematica's: closed forms for n = 3…6, a correctly rounded table for n = 7 since v0.1.1) (circumradius 1, flat bottom edge, counter-clockwise), not wrapped (Q-PR-02) | the original's random C-space | v0.1.0 | unit "makePolys shifts the exact CirclePoints[n] by polyXY (flat bottom edge, counter-clockwise)"; unit "the first evaluation (restart = True) draws 4 random regular polygons with 3 to 7 sides and no samples"; unit "restart consumes RandomInteger[{3,7},4] then RandomReal[{0,2π},{4,2}] (replayed numbers)"; golden "prm: polygons are polyXY + CirclePoints[polySides], bit for bit"; golden "prm owner state: polygons including the 7-gon are polyXY + CirclePoints, bit for bit"; unit "circlePoints(7) gives the correctly rounded unit-circle values, first vertex at -π/2 + π/7, counter-clockwise"; golden "prm: snapshot 2: polygons, free and colliding samples and the roadmap of radius r are rebuilt from the saved samples bit for bit"; golden "prm: snapshot 5: polygons, free and colliding samples and the roadmap of radius r are rebuilt from the saved samples bit for bit" |
| F-PR-08 | Collision test `ptInPolys` / `ptInPoly` / `angtest` (all adjacent vertex pairs on the same side; convex polygons) | step (1): free or colliding | v0.1.0 | unit "angtest is p1.{{0,-1},{1,0}}.p2 > 0 (= y1 x2 - x1 y2 > 0)"; unit "ptInPoly: inside and outside of a convex polygon, either orientation"; unit "ptInPoly: a point ON an edge of a counter-clockwise polygon counts as inside (all tests False), of a clockwise one as outside"; unit "ptInPolys is true when the point is in any of the polygons"; golden "prm: classifying the saved samples with ptInPolys reproduces goodPts and badPts in order" |
| F-PR-09 | Torus distance `toroidDist` (shorter way round in each coordinate) | the metric of the roadmap and the search | v0.1.0 | unit "toroidDist is the plain distance when no coordinate wraps"; unit "toroidDist wraps each coordinate across 2π independently"; unit "toroidDist is symmetric" |
| F-PR-10 | Local planner `pathOKT[ps, pe, polys, delta]`, delta = 0.1: straight segment the short way round the torus, `Ceiling[dist/delta]` interior samples `ps + d i/(n+1)` each wrapped once, end points untested, segments ≤ delta accepted untested (Q-PR-04) | the PRM's "local planner" | v0.1.0 | unit "pathOKT accepts a segment not longer than delta WITHOUT testing anything (original quirk)"; unit "pathOKT tests n = Ceiling[dist/delta] interior samples ps + d i/(n+1), never the end points"; unit "pathOKT goes the short way round the torus and wraps each sample once"; unit "pathOKT stops at the first colliding sample (Or)"; unit "pathOKT[ps, pe, polys, delta] refuses a segment through the triangle" |
| F-PR-11 | Roadmap `connectPoints`: for each free sample from point2start, the up to 10 nearest other free samples within r (`Nearest[..., {10, r}, DistanceFunction -> toroidDist]`), an edge when not yet adjacent and `pathOKT(ps, pe)` accepts; 1-based adjacency lists; full rebuild on a radius change, incremental on new samples (Q-PR-05, Q-PR-07) | step (2): the roadmap | v0.1.0 | unit "connectPoints adds each pair once, in Nearest order, with 1-based adjacency lists"; unit "connectPoints only connects points within radius r"; unit "connectPoints tries a refused pair again from the other side (the planner is directional)"; unit "connectPoints from point2start only lets the new points look for neighbours"; unit "connectPoints takes at most the 10 nearest points"; unit "new samples are connected incrementally: only the new points look for neighbours (original quirk)"; golden "prm: a rebuild with r = 0.87 at 289 good points plus four incremental batches at r = 0.14 reproduces the saved edges and adjacency exactly, in order"; golden "prm: snapshot 4: polygons, free and colliding samples and the roadmap of radius r are rebuilt from the saved samples bit for bit"; golden "prm: snapshot 5: polygons, free and colliding samples and the roadmap of radius r are rebuilt from the saved samples bit for bit"; golden "prm: snapshot 3: polygons, free and colliding samples and the roadmap of radius r are rebuilt from the saved samples bit for bit" |
| F-PR-12 | Query: path = -2 (direct) when `toroidDist[qs, qf] < r` and `pathOKT[qs, qf]`; otherwise qs and qf (each only if not inside an obstacle and with more than 5 free samples) connect to their single nearest free sample if `pathOKT` accepts, then `myAstar` on the roadmap; -1 = no path | step (3): answer the query | v0.1.0 | unit "planQuery gives path -2 when qs and qf are closer than r and the planner accepts the segment"; unit "planQuery connects qs and qf to their nearest good points and searches the roadmap"; unit "planQuery gives -1 when the start is in collision or there are at most 5 good points"; unit "planQuery tries only the single nearest good point for qs and qf (original quirk)"; unit "a direct path is accepted even when start and goal are inside an obstacle (original quirk)"; golden "prm: the saved query gives path -1 ("no path possible") because the start (1,1) lies inside obstacle 2"; golden "prm: snapshot 2: evaluating the saved state reproduces the saved path, changes nothing and the label reads no path possible"; golden "prm: snapshot 4: evaluating the saved state reproduces the saved path, changes nothing and the label reads path length = 4.4" |
| F-PR-13 | Graph search `myAstar`: Dijkstra in effect (heuristic only on the start node), lowest fScore = first in openSet order, no closed set (Q-PR-01) | shortest roadmap path | v0.1.0 | unit "myAstar finds the shortest path and returns 1-based node lists, or -1"; unit "myAstar expands by gScore only (heuristic only on the start node): Dijkstra tie result, not A*"; unit "myAstar ties between equal gScores go to the node first in openSet (insertion order)"; golden "prm: snapshot 4: evaluating the saved state reproduces the saved path, changes nothing and the label reads path length = 4.4"; golden "prm: snapshot 5: evaluating the saved state reproduces the saved path, changes nothing and the label reads path length = 4.36" |
| F-PR-14 | One evaluation of the Manipulate body in the original's order (restart, locator wrap, add points, rebuild, query); randomness through an injectable `rng` (unseeded by default, like the original) | same results as the original for the same random numbers | v0.1.0 | golden "prm: replaying the original random numbers through the Manipulate body reproduces the saved state"; golden "prm owner state: ptInPolys reproduces the 162 free and 38 colliding samples in order"; golden "prm owner state: radius 0.29 before the first batch, then four batches, reproduces the 98 edges and the adjacency in order"; golden "prm owner state: path -1 and "no path possible" as saved"; golden "prm: snapshot 1: the Settings are the live state (550 samples, r = 0.14, no path)" |

### 4.3 Graphics (SVG)

| ID | Feature | Why | Since | Verified by |
|----|---------|-----|-------|-------------|
| F-PR-15 | Picture: PlotRange {0, 2π}², axes at {0, 0} spanning exactly 0…2π with ticks 0…6 (minor ticks every 0.2 up to 6.2), drawing not clipped at the plot range; in the original's order: Pink polygons (if shown); roadmap edges (Blue, LightBlue pieces for edges that wrap); Thickness 0.02 Magenta connectors or direct line, green path edges (Lighter[Green] wrapped pieces), black start/goal points, purple progress point (PointSize 0.04); without a path thin Magenta connectors; dark green free and red colliding samples (PointSize Medium); the locator icons `loc[col]` (red when inside an obstacle, dark green otherwise) | the original's picture | v0.1.0 | e2e "loads without errors and draws axes, the two locator icons and the label"; unit "toroidLine draws a plain edge in color2 (color1 when color2 is -1)"; unit "toroidLine draws a wrapping edge as two pieces in color1 that leave the square"; unit "toroidPt interpolates along the short way and wraps back into [0, 2π]"; unit "a roadmap path: green edges, thick magenta connectors, black end points, purple progress point"; unit "a start inside an obstacle gets a red icon and no connection to the roadmap"; unit "the locator icon loc[col] has cross hairs from 2 to 10 units and circles of radius 5 and 3 at {-0.5, 0.5}"; review |
| F-PR-16 | Plot label "no path possible" (path = -1) or "path length = x" with x = `Round[totdist, .01]` | result of the query | v0.1.0 | unit "direct connection: path = -2, label "path length = 0.3", progress enabled"; e2e "the saved state of the original shows "no path possible" and a red start icon (snapshot 1)"; golden "prm: snapshot 3: evaluating the saved state reproduces the saved path, changes nothing and the label reads no path possible"; golden "prm: snapshot 4: evaluating the saved state reproduces the saved path, changes nothing and the label reads path length = 4.4"; golden "prm: snapshot 5: evaluating the saved state reproduces the saved path, changes nothing and the label reads path length = 4.36" |
| F-PR-17 | Title, caption and details text of the original | explains the Demonstration | v0.1.0 | M-PR-01 |

### 4.4 Port additions

| ID | Feature | Why | Since | Verified by |
|----|---------|-----|-------|-------------|
| A-PR-01 | "Initial settings" button: the opening state (restart = True: new random obstacles, no samples, radius 0.5, locators {1, 1} and {5, 5}) | stands in for the Manipulate ⊕ menu → Initial Settings | v0.1.0 | e2e "Initial settings restores the opening state" |
| A-PR-02 | Arrow keys move a focused locator (0.05; Shift = 0.25); each key press is one update | keyboard access | v0.1.0 | e2e "arrow keys move a focused locator (port addition)" |
| A-PR-03 | `window.__demo` automation hook: `getState`, `view`, `setRng` (seeded or replayed random numbers), `loadState` (e.g. the original's saved state), `moveLocator`, `worldToClient` | automated tests, comparison with the saved state | v0.1.0 | e2e "the saved state of the original shows "no path possible" and a red start icon (snapshot 1)" |
| A-PR-04 | "All demos" link (the private-preview banner of v0.1.0–v0.1.1 was removed in v0.1.12, when publication was cleared) | site navigation | v0.1.0 | inventory; M-GEN-01 |
| A-PR-05 | Credit footer: original title, authors, licence, adaptation notice | required by CC BY-NC-SA 3.0 | v0.1.0 | e2e "attribution on" |
| A-PR-06 | Start-up notice (watchdog, `<noscript>`) when the page cannot start (DEC-22) | a clear message instead of an empty page | v0.1.0 | e2e "start-up notice when" |
| A-PR-07 | URL parameter `?seed=N` (whole number): reproducible obstacles and samples (default: unseeded, like the original) | reproducible runs for testing and teaching | v0.1.0 | e2e "?seed=N gives reproducible obstacles and samples (port addition)" |
| A-PR-08 | Standalone bundle: `npm run bundle -- prm` writes this app alone, with exactly the files it loads, a root page, README and licence texts, to `dist/prm/` (§6.1) | owner rule R-A: anyone can take this one app and host it elsewhere | v0.1.15 | e2e "bundle: prm runs from its own folder"; unit "bundle contents listed in DESIGN.md match the collector" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|-------------|---------|
| `button-add-vertices` | F-PR-01 |
| `slider-radius` | F-PR-02 |
| `value-radius` | F-PR-02 |
| `plus-radius` | F-PR-02 |
| `play-radius` | F-PR-02 |
| `stepback-radius` | F-PR-02 |
| `stepfwd-radius` | F-PR-02 |
| `slider-progress` | F-PR-03 |
| `value-progress` | F-PR-03 |
| `plus-progress` | F-PR-03 |
| `play-progress` | F-PR-03 |
| `stepback-progress` | F-PR-03 |
| `stepfwd-progress` | F-PR-03 |
| `check-show-obstacles` | F-PR-04 |
| `button-restart` | F-PR-05 |
| `locator-*` | F-PR-06, A-PR-02 |
| `reset` | A-PR-01 |
| `crumbs` | A-PR-04 |
| `details` | F-PR-17 |
| `credits` | A-PR-05 |

## 6. Design

- `demos/common/prm-core.js` holds the functions both PRM Demonstrations define identically, under the original names.
  Two are generalised so that both apps can use them: `pathOKT(ps, pe, collides, delta)` takes the obstacle test as a
  predicate, and `connectPoints(goodPts, adj, pathOK, edges, point2start, r)` takes the local planner. `model.js`
  keeps the original's signatures as thin wrappers (`pathOKT[ps, pe, polys, delta]`, `connectPoints[goodPts,
  edgesNNadjin, polys, delta, edgesNNin, point2start, r]`). The inline query and progress code of both bodies is
  `planQuery` and `progressOnPath`. Indexes stored by the original (adjacency lists, paths) stay 1-based, so the
  state compares directly with the saved state.
- `model.js` `evaluate(state, rng)` performs exactly one evaluation of the Manipulate body and returns the new state
  (the Manipulate variables), a `view` with everything the Graphics draws (line pieces with colours, points,
  label, icon colours, whether "progress" is enabled; the hook `view()` reports it) and (v0.1.21, owner decision D2)
  `graphics` = `picture(view, state)`: the Graphics list in the original's order as `shared/graphics.js` data (the axes
  as a `cachedGraphics` part drawn once, the `loc[col]` icons as `demos/common/arm-view.js` `configGlyph`; `RANGE` and
  `IMAGE` give the picture's PlotRange and ImageSize). No DOM; unit-tested in Node.
- `main.js` (v0.1.20) is one `Manipulate({…})` call of `shared/manipulate.js`: the two locators, the two `Button`s,
  the radius and progress sliders (progress with `Enabled` as a function of the state; both keep the port's own steps
  and number fields, `steps: undefined`) and the checkbox as Mathematica control specs, `random: true`, `body` =
  `evaluate` (its result carries the picture). The layer keeps
  the Manipulate variables and evaluates the body after every control change (one evaluation per animation frame while
  dragging). Thickness and PointSize fractions refer to the total width of the picture, as in Mathematica.
- Random numbers come from `shared/random.js` (`createRng`; `replayRng` replays the original's numbers in the golden
  test). Mathematica's tolerant comparisons come from `shared/mma.js`.

### 6.1 Building and deploying this app alone

Owner rule R-A: this one app can be taken out of the repository and hosted anywhere.

- Command, in the repository folder: `npm run bundle -- prm` → `dist/prm/` (with `--zip` also `dist/prm.zip`;
  `npm run bundle -- --all` bundles every app). `tools/bundle-app.mjs` follows every file the page loads (HTML, import
  map, static and literal dynamic imports, stylesheets, pictures) and copies exactly those, keeping the repository's
  folder layout, so no path is rewritten; it stops with a list of problems if a reference cannot be resolved.
- Contents (generated with `npm run bundle -- --update-docs`; unit "bundle contents listed in DESIGN.md match the
  collector" keeps the table current):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/prm/`) | 3 | `index.html`, `main.js`, `model.js` |
| `shared/` | 16 | `exact-pi.js`, `graphics-extras.js`, `graphics.js`, `manipulate.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `mma.js`, `random.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `ui-extra.js`, `ui-interval.js`, `ui.js` |
| `demos/common/` | 4 | `arm-grid.js`, `arm-view.js`, `prm-core.js`, `two-link.js` |
| added by the bundler | 7 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/prm/DESIGN.md` |
<!-- bundle-contents:end -->

- Added files: `index.html` opens the app (the app's "All demos" link, `../../index.html`, leads back to it and links
  to the app), a generated `README.md` (title, the credits of the footer, licence summary, how to serve and test),
  `.nojekyll` (GitHub Pages), this document, `LICENSE.md` and the `LICENSES/` texts of the SPDX identifiers found in the
  copied files.
- Requirements: any static web server (`npx serve`, `python -m http.server`, GitHub Pages); not `file://` (browsers
  block ES modules there); a browser with ES modules and import maps (Firefox ≥ 108, Chrome/Edge ≥ 89, Safari ≥ 16.4);
  no WebGL needed (SVG only). No server-side code.
- Checked by e2e "bundle: prm runs from its own folder" (`tests/e2e/bundle.spec.js`): the bundle folder alone is
  served, its root page must open the app, the app must start (`window.__demo.ready`) without page errors, every request
  must stay inside the folder and succeed, and every script and stylesheet of the bundle must be loaded.

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

| ID | Kind | Description |
|----|------|-------------|
| Q-PR-01 | quirk kept | "A*" is Dijkstra's algorithm: only the start node gets the heuristic (`fScore[si] = toroidDist[si, fi]`); every other node gets `gScore + toroidDist[nbr, nbr]` = gScore + 0. Equal fScores go to the node first in openSet (insertion) order; no closed set. The path is still a shortest one; ties can differ from a real A*. With three or more equal lowest fScores the original's `openSet[[First@@Position[...]]]` becomes `First[{k1}, {k2}, {k3}]`, an error after which the search cannot finish (it runs until Manipulate times out); with two it is `First[{k1}, {k2}]` = k1. The port takes the first of the ties in every case (exact ties need equal path lengths, which random samples practically never give). Confirmed by extra-checks.wls (Mathematica 15.0.1, owner run 2026-10-06; labelled K-PR-06 in that run): a three-way tie makes the original's selection fail (an error / $Failed instead of a node). |
| Q-PR-02 | quirk kept | The polygons are not wrapped across 0/2π, although distances, edges, samples and planner points wrap: the part of a polygon outside the square blocks nothing, and the configuration "torus" has obstacles only inside the square. |
| Q-PR-03 | quirk kept | qs and qf are connected only to their single nearest free sample (`Nearest[goodPts, qs, 1, ...]` inside a `Do` with `Break`): if the local planner refuses that one, no other sample is tried and there is no path. |
| Q-PR-04 | quirk kept | `pathOKT` never tests its end points, and a segment not longer than delta (0.1) is accepted without any test. |
| Q-PR-05 | quirk kept | `pathOKT` is directional (samples from ps towards pe): a pair refused from one side can be accepted later from the other side. |
| Q-PR-06 | quirk kept | A locator pulled past an edge jumps to the OPPOSITE edge (`qs[[1]] = 2π` or `0`), it is not shifted by 2π; while the pointer stays outside, the locator stays at the far edge. |
| Q-PR-07 | quirk kept | New samples are connected incrementally: only the new points look for neighbours; older points do not get the new ones among their 10 nearest until the radius changes. The roadmap therefore depends on the order of operations (the saved state shows it, K-PR-03). |
| Q-PR-08 | quirk kept | A point exactly on an edge of a (counter-clockwise) polygon counts as inside (all angle tests False). |
| Q-PR-09 | quirk kept | The "progress" value is kept while its slider is disabled and is used again when a path reappears. |
| Q-PR-10 | quirk kept | A direct path is accepted even when the start or the goal lies inside an obstacle: the direct test `If[toroidDist[qs, qf] < r && pathOKT[qs, qf, ...], path = -2, ...]` comes first and the in-obstacle checks are only in its else branch (and `pathOKT` does not test end points, Q-PR-04). E.g. start inside a polygon, goal 0.08 away: red start icon, "path length = 0.08", progress enabled. |
| D-PR-01 | deviation | ImageSize ≈ 380 px estimated from the snapshots (the notebook does not set it); the margin around the plot range for tick labels and the label, fonts and axis grey approximate Mathematica's (axes and ticks span exactly 0…2π as in the snapshots). The picture is centred in its panel. |
| D-PR-02 | deviation | `PointSize[Medium]` drawn as 5.5 px, the default point size as 0.008 of the width and default lines as 1 px — estimated from the snapshots. |
| D-PR-03 | deviation | JavaScript cannot reproduce Mathematica's random numbers: obstacles and samples differ from the original's (as the original's own runs differ from each other). The golden test replays the original's numbers from its saved state (`replayRng`). |
| D-PR-04 | deviation | What counts as one update while dragging: the port evaluates once per animation frame with the latest pointer position (and once per arrow key); Mathematica's front end decides its own update rate. |
| D-PR-05 | deviation | Controls are the shared Manipulate-style controls: labels above the sliders, value fields show "0" where Mathematica shows "0." for a real zero. |
| D-PR-06 | deviation | `Quiet[Nearest[...]]`: Nearest of an empty list (only one free sample) gives no neighbours in the port; the original's behaviour in that case was not checked. |
| D-PR-07 | deviation | Locator picking (shared/svg-plot.js): a press within 12 px of a locator grabs it in place (offset kept, no jump), a press farther away makes the nearest locator jump to the press point (LocatorPane). Mathematica's no-jump distance is not known; 12 px is a port choice (M-PR-07). |
| K-PR-01 | known issue (lead) — **resolved** in v0.1.1 | `Nearest[..., {10, r}, DistanceFunction -> toroidDist]`: the order of equal distances and whether the radius is inclusive are not documented; the port keeps input order and uses `<= r`. Only exact ties matter (the golden replay of 1740 edges matched). **Answer** (extra-checks.wls, Mathematica 15.0.1, owner run 2026-10-06; the radius check is labelled K-PR-04 in that run): equal distances come in input order, for toroidDist as DistanceFunction and for the default one, and the radius test is inclusive (<= r). The port already does both (shared/mma-extra.js `nearest`: stable order, `d <= r`); nothing changed. |
| K-PR-02 | known issue (lead) — **resolved** in v0.1.1 | `Position` uses SameQ, which for machine reals tolerates the last bit; the port finds the lowest fScore with a 1-ulp tolerance and goodPts positions exactly. Check with wolframscript if ties ever differ. **Answer** (extra-checks.wls, Mathematica 15.0.1, owner run 2026-10-06, the check also used for art-gallery K-AG-08): Position, SameQ and MatchQ treat a 1-ulp difference of machine reals as equal. The port matches: fScore ties use a 1-ulp tolerance (`sameReal`); goodPts positions are found exactly, which is harmless because the point looked up is always an element of goodPts itself (from Nearest or the path), so the exact match exists — only two different samples within 1 ulp in both coordinates (practically impossible for RandomReal) could make Mathematica pick an earlier one. Nothing changed. |
| K-PR-03 | known issue (lead) | The original's saved state is not what its code produces on its own: r = rold = 0.14, but the roadmap is a full rebuild with r = 0.87 when there were 289 free samples (after sample batch 7) plus four incremental batches with r = 0.14 (golden test, exact in set, order and adjacency). This history is unique on the slider's 0.01 grid (any r from about 0.86955 to 0.87295 gives the same edges; a rebuild after batches 1–6 does not reproduce them) — found by the port and confirmed by an independent review. The code cannot get there by itself: `rold` is assigned only in the rebuild branch, which runs `rold = r; edgesNN = {}; edgesNNadj = ConstantArray[{}, ...]` BEFORE `connectPoints`, so an aborted rebuild would leave an EMPTY roadmap (and a rebuild with 0.14 is fast anyway). The saved state needs rold to change while edgesNN kept its old value: an interruption exactly between those statements, front-end and kernel values of the DynamicModule out of sync, or an edit of the saved values. To be looked at in Mathematica (M-PR-03); the port does what the code says. Snapshot cell 1 holds the same state (`tests/golden/prm.original-states.json`), so the snapshots add no evidence on this history; snapshots 4 and 5 (a later session) are plain full rebuilds of radius 0.65 and 0.77. |
| K-PR-04 | known issue (lead) | Arithmetic order at the last-bit level (`x/y` as x·y⁻¹ in Mathematica, `Ceiling[dist/delta]` close to an integer) may differ; it matters only at exact boundaries (the replay matched all 550 classifications and 1740 edges bit for bit). Owner state 1 (Mathematica 15.0.1, saved 2026-10-06) confirms again: classification, 98 edges and adjacency bit for bit; the only last-bit difference found was CirclePoints[7] (fixed in v0.1.1, F-PR-07). |
| K-PR-05 | known issue (lead) — partly **resolved** in v0.1.1 | In the original both the Manipulate's invisible locators and the `Locator[qs, loc[...]]` primitives with the icons sit at the same place; the port drags the Manipulate's locators (whether a drag on the icon works the same in Mathematica: M-PR-07). **Answer**: Manipulate `Locator` controls are LocatorPane locators, and LocatorPane "by default directs any click to the nearest locator" (reference.wolfram.com/language/ref/LocatorPane.html, Details); a press on an icon therefore drags that (nearest) locator. Since v0.1.1 the port does the same for any press (shared `addLocators` `pickAnywhere`, F-PR-06); both locators are always active. **Still open**: the visible icons are themselves `Locator[qs, loc[...]]` / `Locator[qf, ...]` primitives inside the Graphics (prm.txt lines 244–245); the LocatorPane reference does not say whether a press ON such an inner Locator goes to it (which would move only the icon, not qs) or to the Manipulate's locator. The port sends it to the Manipulate's locator (M-PR-07). |
| O-PR-01 | owner observation | Owner testing round 1 (Mathematica 15.0.1, 2026-10-06): the original shows the message "toroidLine is not a graphics primitive or directive" and always shows "no path possible"; the other controls work. Diagnosis (coordinator): the owner's tested copy lost the saved definitions of exactly `toroidLine` and `toroidLines`, which the original download has in the Manipulate's saved Initialization, so the kernel never defined them (cause unknown, possibly the 15.0.1 re-save). Because his copy always showed "no path possible", the saved path = -1 says little by itself; the strong evidence of owner state 1 is the bit-exact classification and edge replay (golden tests). "no path possible" is also what the port computes for that state: both ends connect, but the roadmap at r = 0.29 does not join them (golden test). Path display could not be compared yet (K-PR-06). |
| K-PR-06 | known issue (lead) | Compare the path display (green path, magenta connectors, purple progress point, "path length = x") with a working original: re-open the pristine download, or run Evaluation ▸ Evaluate Initialization Cells, then move a control; use a radius of about 0.6–0.8 with 200+ samples so that a path exists (M-PR-05). |
| N-PR-01 | note | `pathOK` (planner without torus) is defined but not used by the original. |
| N-PR-02 | note | Snapshot 1 is the saved state: radius 0.14, show obstacles on, start (1, 1) inside the pentagon around (1.28, 1.63) → red icon, no connection, "no path possible". The replay of the original's random numbers reproduces the saved polygons (bit for bit), 550 samples, 442/108 classification, 1740 edges and the adjacency lists in order. |
| N-PR-03 | note | `totdist` is assigned while the Graphics list is built (inside the primitives), before the PlotLabel option is evaluated; it is set whenever the label needs it. |

## 8. Proposed changes

No open proposal. Template (see [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md)):

| ID | Status | Requested by / date | Change | Reason | Acceptance criteria |
|----|--------|---------------------|--------|--------|---------------------|

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.0 | 2026-10-06 | first AI conversion: feature list, quirks and deviations written with the port |
| 2 | v0.1.1 | 2026-10-06 | owner testing round 1 (after an independent review): K-PR-02 resolved, K-PR-05 reopened as partly resolved (inner Locator icons), D-PR-07 (12 px grab zone), focus on press; CirclePoints[7] as correctly rounded table (F-PR-07); LocatorPane press-anywhere picking (F-PR-06, K-PR-05 resolved); K-PR-01 resolved (Nearest ties in input order, inclusive radius); Q-PR-01 three-way tie confirmed; owner state 1 golden tests; O-PR-01 owner observation and K-PR-06 |
| 3 | v0.1.12 | 2026-10-06 | added to this repository and published: private-preview banner removed (A-PR-04), role line updated; no other feature changes. Versions v0.1.0 and v0.1.1 in this document (Since column, rows above) are versions of the separate repository the app was developed in, not of this repository |
| 3 | v0.1.13 | 2026-10-12 | no change to this app (collision beep with a mute checkbox in prm-seven-link; new `shared/beep.js` used only there) |
| 4 | v0.1.14 | 2026-10-16 | golden tests on the five snapshot states (`tests/golden/prm.original-states.json`, `tools/extract_state.py --snapshots`): snapshots 2–5 (200 samples, obstacles {4, 4, 4, 7} incl. the 7-gon) rebuilt bit for bit — polygons, classification, roadmaps of radius 0, 0.65 and 0.77 in order, paths and labels "no path possible", "path length = 4.4" and "4.36"; K-PR-03 note; no change to the app |
| 5 | v0.1.15 | 2026-10-17 | §11 Errors in the original added (owner rule R-C); Mathematica checklist items rewritten as operator procedures (R-B); standalone bundle (owner rule R-A): §6.1, A-PR-08, tools/bundle-app.mjs; review fixes |
| 6 | v0.1.16 | 2026-10-18 | `demos/common/prm-core.js` generalised to n dimensions by "Probabilistic Roadmap Method in 3D" (owner prm-3d, approved by the owner): `toroidDist`, `pathOKT`, `toroidLine` and `toroidPt` loop over the coordinates (sums from the first term, left to right, so every 2D result is the same double), one wrap `wrapto0to2pi` (the same double as the 2D sequential wrap on (−2π, 4π)), `toroidPt` option `zeroTest`, optional distance function / toroidPt parameters of `connectPoints`, `myAstar`, `planQuery` and `progressOnPath`, missing adjacency lists taken as empty in `connectPoints`; every export and its behaviour unchanged for this app — its unit and golden replays run unchanged and pass; bundle contents unchanged |
| 7 | v0.1.17 | 2026-10-18 | version number only (harness run 2 accepted); no change to this app |
| 8 | v0.1.18 | 2026-10-18 | version number only (harness run 3 accepted for manipulability-ellipsoid); no change to this app |
| 9 | v0.1.19 | 2026-10-21 | version number only (shared Manipulate layer added, four apps migrated to it); no change to this app |
| 10 | v0.1.20 | 2026-10-21 | `main.js` rewritten on the shared Manipulate layer (`shared/manipulate.js`, `shared/graphics.js`): control specs in Mathematica's form, the picture as Graphics data; no change to behaviour or picture (all unit, golden and browser tests unchanged and passing; screenshots and Manipulate state identical to v0.1.19 at sample settings) |
| 11 | v0.1.21 | 2026-10-23 | the model builds the picture as `shared/graphics.js` Graphics data (owner decision D2) and the body returns {state, view, graphics}; `main.js` shortened; the old drawing output frozen in `tests/unit/fixtures/prm-drawing.pre-graphics.json` and tests that read the old format now read the same numbers through `annotations()`/`Cases()`; no change to behaviour or picture (screenshots and Manipulate state identical to v0.1.20 at sample settings) |
| 12 | v0.1.22 | 2026-10-25 | version number; bundle table (`shared/manipulate.js` now also loads `shared/graphics-extras.js` and `shared/svg-frame.js` for the new Graphics options `Axes`/`Frame`/`PlotLabel`); no change to this app's code, behaviour or picture (pixel parity with v0.1.21) |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|-------------|---------|-------------|---------|
| I-PR-01 | Wrap the obstacle polygons across the edges (draw and test the shifted copies) | the C-space becomes a real torus, as the Details text says | differs from the original's pictures and results | Q-PR-02 |
| I-PR-02 | Use the heuristic toroidDist[nbr, goal] for every node (real A*) | fewer expanded nodes, matches the "A* search" in the Details | tie results can differ from the original | Q-PR-01 |
| I-PR-03 | Test the end points and make the local planner symmetric | a roadmap that does not depend on which side tried first | departs from the original's roadmap | Q-PR-04, Q-PR-05 |
| I-PR-04 | Re-run the neighbour search of old points when samples are added (or always rebuild) | the roadmap would not depend on the order of operations | more computation per batch; differs from the original | Q-PR-07 |

## 11. Errors in the original (conceptual and mathematical)

Where the original is probably wrong, as distinct from the quirks of §7 that are merely unusual (owner rule R-C,
[`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md) rule 9). Every row is an open question for the owner; the port
keeps the original's behaviour unless the row says otherwise. Checked on 2026-10-17 against the readable source
[`docs/original-source/prm.txt`](../../docs/original-source/prm.txt) and the Details text. Not errors: `toroidDist`
is the correct flat-torus distance, `pathOKT` samples the shorter way round with spacing below `delta`, `ptInPoly`
is a correct test for the convex (regular) polygons used, and the incremental connection of new samples (Q-PR-07) is
the usual incremental PRM.

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|------|-----------------------|--------------------------|--------------------|-------------------------|--------|
| E-PR-01 | conceptual | `myAstar`: `fScore[[nbr]]=gScore[[nbr]]+toroidDist[verts[[nbr]] , verts[[nbr]]]`; Details (3): "a graph search is used (A* search in this Demonstration)" | The heuristic is the distance of a node to itself (0), so the search is Dijkstra's algorithm, not A*; only the start node gets `toroidDist[verts[[si]], verts[[fi]]]`. The path found is still a shortest roadmap path. | keeps it (Q-PR-01) | Same path lengths; another of several equally short paths may be drawn; fewer nodes expanded. Golden replays of the saved roadmaps unaffected (no path stored). Offered as I-PR-02. | open |
| E-PR-02 | mathematical | `myAstar`: `current =openSet[[ First@@Position[fScore[[openSet]],currentfscore]]]` | `First@@Position[…]` applies `First` to the list of positions as a sequence: with one lowest fScore it is `First[{k}]` = k, with two `First[{k1},{k2}]` = k1, with three or more `First` gets too many arguments and fails, and the search never finishes (it runs until the Manipulate times out; confirmed by extra-checks.wls, Mathematica 15.0.1). Intended: `First[First[Position[…]]]` or `First@Flatten@Position[…]`. | deviates: takes the first of the ties in every case (Q-PR-01) | The original would always finish; only exact three-way ties of path length change (practically never with random samples). No golden data affected. | open |
| E-PR-03 | conceptual | Obstacles `polys` drawn and tested only inside [0, 2π]² (`ptInPolys[polys, pt]` without shifted copies), while samples, distances, edges and the planner wrap; Details: "The resulting configuration space is shaped like a toroid, and so wraps from 2π to 0 on the edges" | On a torus an obstacle that sticks out over an edge must reappear on the opposite edge; here the part outside the square blocks nothing, so the obstacle regions are not those of a torus and paths can cross where an obstacle should be. | keeps it (Q-PR-02) | Samples near the edges opposite an overhanging polygon would turn red and some edges and paths would disappear; the golden replay (saved polygons, 550 samples, 1740 edges) would need new data or an "original mode". Offered as I-PR-01. | open |
| E-PR-04 | conceptual | Query: `Do[If[pathOKT[qs,pe,polys,delta], qsn = pe; Break[]], {pe, Quiet[Nearest[goodPts,qs,1,DistanceFunction->toroidDist]]}]` (same for qf); Details (3): "The local planner attempts to connect the initial configuration to the nearest point in the roadmap" | `Nearest[…, 1]` gives one candidate, so the `Do`/`Break` loop never tries a second one: if the straight line to the nearest sample is blocked, the start (or goal) is not connected and "no path possible" is shown although other nearby samples connect to the roadmap. The loop structure suggests several candidates were intended (e.g. `Nearest[…, {10, r}]` as for the roadmap). | keeps it (Q-PR-03) | More queries succeed; "no path possible" would appear only when no nearby sample can be reached. The owner state and snapshot states that show "no path possible" would need checking (snapshot 1 has the start inside an obstacle and stays without path). No I- entry yet. | open |
| E-PR-05 | conceptual | `pathOKT`: `If[dist<= delta, True, … Table[pt = ps+ {dx,dy}*(i)/(n+1); …, {i,1,n}]]` (end points never tested), and the direct test `If[toroidDist[qs,qf]<r && pathOKT[qs,qf,polys,delta], path=-2, If[!ptInPolys[polys,qs] …]]` before the in-obstacle checks | The local planner never tests the end points of a segment and accepts any segment up to `delta` = 0.1 without a test; because the direct start–goal test comes first, a start (or goal) INSIDE an obstacle gets a "path" to a goal less than r away (red start icon, "path length = 0.08", progress enabled), contradicting "find a continuous path … that is collision-free". The planner is also directional (samples from ps toward pe), so a pair refused from one side can be accepted from the other. | keeps it (Q-PR-04, Q-PR-05, Q-PR-10) | No path from or to a configuration in collision; a few short edges near obstacle boundaries would disappear; roadmaps no longer depend on which end tried first. The golden edge replay would need new data or an "original mode". Offered as I-PR-03. | open |
