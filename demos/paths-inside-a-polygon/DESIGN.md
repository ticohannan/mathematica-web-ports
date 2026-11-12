# Design document: Paths inside a Polygon

| | |
|---|---|
| Code version: | 0.1.37 |
| Document revision | 2 (2026-11-11) — implemented after the owner's "go" (2026-11-11); compared with the snapshots |
| Status | describes the app as implemented; changes go through Proposed changes (§8) |
| Original | Wolfram Demonstrations Project, "Paths inside a Polygon", contributed by Stan Wagon and Karen Saxe, published 2012-04-27 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/PathsInsideAPolygon/> |
| Port files | `model.js` (the initialization: orientation tests, the ear-cutting triangulation, `Inside`, reflex vertices, `VisibleReflexEdges`, `ShortestInsidePath` with a Dijkstra search on the edge list; one evaluation of the body; pure), `main.js` (the Manipulate on `shared/manipulate.js`), `index.html` |
| Role in the project | new demonstration (not by Dr. Becker: Stan Wagon and Karen Saxe), simple mode (v0.1.35): generator, `shared/manipulate.js`, `shared/graphics.js`, exact integer arithmetic |

## 1. Purpose and background

The shortest path between two points inside a simple polygon bends only at reflex vertices. The Demonstration
builds the graph whose edges are the segments between reflex vertices (and the start and finish points) that stay
inside the polygon, drawn in blue, and finds the shortest path in it (red). The user picks one of two polygons
("random", "orthogonal") and drags the start and finish points.

Source as text: [`docs/original-source/paths-inside-a-polygon.txt`](../../docs/original-source/paths-inside-a-polygon.txt); snapshots `docs/original-snapshots/paths-inside-a-polygon-1…4.png`; saved states `tests/golden/paths-inside-a-polygon.original-states.json`. Everything is in the Manipulate's `Initialization`; there is no separate initialization cell.

## 2. Scope

In scope: the Manipulate (setter bar "polygon type", the two locators, the picture), caption, Details and
References. Out of scope: `polygonEx[3]` and `A[3]`, `B[3]` (defined, not reachable from the controls), the
`AlgorithmTraceQ` printing and the "Path distance" label (switched off by the body, Q-PI-02).

## 3. Users and use cases

- UC-PI-01: a student sees why a shortest path bends only at reflex vertices and how the visibility graph is built.
- UC-PI-02: a student drags the two points and watches the path change between routes.

## 4. Features

Source: the Manipulate and its `Initialization`.

| ID | Feature | Reason | Since | Verified by |
|----|----|----|----|----|
| F-PI-01 | Setter bar `{{i, 1, "polygon type"}, {1 -> "random", 2 -> "orthogonal"}}` | the polygon | v0.1.35 | e2e "has its controls with their defaults" |
| F-PI-02 | Locators `{{pt, {A[i], B[i]}}, Locator}` (default glyph, unbounded); A[1] = {500, 100}, B[1] = {500, 910}, A[2] = {300, 1150}, B[2] = {1150, 450} | start and finish | v0.1.35 | e2e "dragging a point moves the path" |
| F-PI-03 | The body: `pt = Round[pt]` (integer positions); when pt is one of the default pairs it becomes the chosen polygon's pair; a point outside the polygon moves to its nearest vertex (`Nearest[pol, p]`) | points always inside | v0.1.35 | unit "the body rounds and snaps the points"; e2e "switching the polygon moves the default points"; M-PI-07 |
| F-PI-04 | The polygons `polygonEx[1]` (39 vertices as evaluated, Q-PI-01) and `polygonEx[2]` (52 vertices, reversed) | the scenes | v0.1.35 | unit "the two polygons as evaluated" |
| F-PI-05 | Geometry: `SignedArea`, `Orientation` (of a triangle: Sign of the area; of a polygon: of the triangle at its lexicographically smallest vertex), `LeftOf`, `RightOf`, `IntersectOpen`, `BetweenSW`, `IntersectClosed`; closed-triangle `Inside`; `Triangulate` by `PolygonDiagonal` (ear at the smallest vertex, else the diagonal to the inside vertex farthest from u w) | exact geometry | v0.1.35 | unit "the geometric predicates"; unit "the triangulation covers the polygon" |
| F-PI-06 | `VisibleReflexEdges`: border edges between two reflex vertices, and every pair of reflex vertices whose midpoint is inside and whose segment meets no border edge (`IntersectClosed`) except the border edges at its own ends; `ReflexVertexQ` is "not a left turn" (collinear vertices count as reflex) | the visibility graph | v0.1.35 | unit "the visibility graph at the snapshot settings" |
| F-PI-07 | `ShortestInsidePath`: the start and finish edges (to every reflex vertex, and start–finish) with the same tests (a border edge is passed over when one end of the edge has the coordinates of one of its end points), the edge weights `Norm`, `FindShortestPath` from start to finish | the path | v0.1.35 | unit "the shortest path at the snapshot settings"; unit "the path agrees with an independent planner"; M-PI-08 |
| F-PI-08 | Picture: the polygon (`EdgeForm[Black]`, `FaceForm[RGBColor[1, 1, .6]]`), all graph edges (Blue, `Thickness[.001]`), the two points (Red, `PointSize[.02]`), the path (Red, Thick); `ImageSize -> {450, 450}`, `PlotRange -> All`, no frame, no label | the scene | v0.1.35 | e2e "loads without errors and draws the picture" |
| F-PI-09 | Opening state i = 1, pt = {{500, 100}, {500, 910}} | the Manipulate's initial values | v0.1.35 | unit "the opening state" |
| F-PI-10 | The four snapshot settings load and give the original's pictures | parity with the original | v0.1.35 | e2e "the four snapshot settings"; unit "the shortest path at the snapshot settings" |
| F-PI-11 | Caption, Details and References (from the Demonstration) | the original's explanation | v0.1.35 | M-PI-01 |
| A-PI-01 | "Initial settings" button restores the opening state | Manipulate's Initial Settings | v0.1.35 | e2e "Initial settings restores the opening state" |
| A-PI-02 | Test and automation hook `window.__demo` from the Manipulate layer | automated tests | v0.1.35 | e2e "dragging a point moves the path" |
| A-PI-03 | Start-up notice when the browser cannot run the page (DEC-22) | no empty page | v0.1.35 | e2e "start-up notice when" |
| A-PI-04 | Breadcrumb link to all demos | navigation | v0.1.35 | inventory |
| A-PI-05 | Credits footer (authors, title, source, licence, adaptation notice) | required by the licence (CC BY-NC-SA 3.0 §4) | v0.1.35 | e2e "attribution on" |
| A-PI-06 | This app can be bundled and served alone (§6.1) | owner rule R-A | v0.1.35 | e2e "bundle: paths-inside-a-polygon runs from its own folder" |
| A-PI-07 | Landing-page thumbnail `thumbnail.webp` | owner request 2026-11-05 | v0.1.35 | e2e "every card on the landing page has a thumbnail that loads" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|----|----|
| `setter-i-*` | F-PI-01 |
| `locator-pt-*` | F-PI-02 |
| `reset` | A-PI-01 |
| `crumbs` | A-PI-04 |
| `details` | F-PI-11 |
| `credits` | A-PI-05 |

## 6. Design

- `model.js` (pure): the Initialization's functions with their names (`SignedArea`, `Orientation`, `LeftOf`, `RightOf`,
  `IntersectOpen`, `BetweenSW`, `IntersectClosed`, `InsideTri` = `Inside` of a triangle, `InsidePoly`, `PolygonDiagonal`,
  `Triangulate`, `ReflexVertexQ`, `InsideFast`, `VisibleReflexEdges`, `ShortestInsidePath`), 1-based index lists where
  the original passes indices; the polygons as evaluated (`POLYGONS`); the body: `bodyPoints` (Round, defaults,
  nearest vertex) and `evaluate(state)` → `{ state, view: { pt, reflex, edges, path, pathLength }, graphics }`.
  Every coordinate is an integer, so the orientation tests are exact in doubles (products below 2⁵³).
- The picture's PlotRange is the polygon's bounding box with equal scales (`AspectRatio` from the box) and
  `UpdateFrame`, so the frame follows a change of polygon.
- `main.js`: one `Manipulate({…})`, ControlPlacement Top: the setter bar (Rule labels) and the Locator list `pt`.
- Shared code: none added.
- Size: model 172 lines, main 19 lines (the WL Initialization is 112 lines, the Manipulate 9).

### 6.1 Building and deploying this app alone

Owner rule R-A (2026-10-17): this one app can be taken out of the repository and hosted anywhere.

- Command, in the repository folder: `npm run bundle -- paths-inside-a-polygon` → `dist/paths-inside-a-polygon/`.
- Contents (generated with `node tools/bundle-app.mjs paths-inside-a-polygon --update-docs`):

<!-- bundle-contents:begin (generated by `npm run bundle -- --update-docs`; do not edit by hand) -->
| Area | Files | Files loaded by the page |
|---|---|---|
| the app (`demos/paths-inside-a-polygon/`) | 3 | `index.html`, `main.js`, `model.js` |
| `shared/` | 15 | `clock.js`, `graphics-extras.js`, `graphics.js`, `manipulate.js`, `mma-colors.js`, `mma-exact.js`, `mma-extra.js`, `random.js`, `requirements.js`, `style.css`, `svg-frame.js`, `svg-plot.js`, `ui-extra.js`, `ui-interval.js`, `ui.js` |
| added by the bundler | 7 | `index.html`, `README.md`, `.nojekyll`, `LICENSE.md`, `LICENSES/CC-BY-NC-SA-3.0.txt`, `LICENSES/MIT.txt`, `demos/paths-inside-a-polygon/DESIGN.md` |
<!-- bundle-contents:end -->

- Checked by e2e "bundle: paths-inside-a-polygon runs from its own folder" (A-PI-06).

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

| ID | Kind | Description |
|----|------|-------------|
| D-PI-01 | deviation | `FindShortestPath` is Mathematica's; the port runs Dijkstra on the same edges and weights. Between paths of exactly equal length the two may choose differently (none found in the snapshots or in 2,400 random pairs, where every length agreed with the independent planner except the E-PI-01 cases). |
| D-PI-02 | deviation | `Graph[v, edges]` lists the point coordinates as vertices while the edges use integers (the integers become further vertices); the port builds the graph on the integers only. Two consequences to be checked in Mathematica: where a point coincides with a polygon vertex (a snapped point) `v` holds a duplicate (K-PI-01); and where the start or finish has no edge at all (E-PI-01) the integer vertex n + 1 or n + 2 is not in the graph, so `FindShortestPath` most likely returns unevaluated with a message and the picture fails (an error picture) — the port draws the polygon without a path (M-PI-08). |
| Q-PI-01 | quirk kept | `{723, 558};{762, 611}` in `polygonEx[1]` is a CompoundExpression: the vertex (723, 558) is dropped (E-PI-02). Also `{638, 513+10}` and `{872, 596-18}`: hand edits, evaluated as 523 and 578. |
| Q-PI-02 | quirk kept | The vertex labels (`Table[Text[…]];{}`: the `;` makes the list `{}`) and the "Path distance" label (`PlotLabel -> None` is passed first and wins) are not drawn. |
| Q-PI-03 | quirk kept | A point dragged outside jumps to the nearest polygon vertex, not to the nearest boundary point; a switch of the polygon keeps moved points (only the default pair is replaced), so they usually jump to vertices of the other polygon. |
| K-PI-01 | known issue (lead) | A point that lies exactly on a polygon vertex (every snapped point) gives `Graph` a repeated vertex coordinate; whether Mathematica then still finds the path (as the port does) is to be checked (M-PI-07). |
| D-PI-03 | deviation | The locators are the shared layer’s glyph (a light disc with a cross), which pales the red points under it; Mathematica’s default locator glyph leaves them dark red. |

## 8. Proposed changes

No open proposal. Template (see [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md)):

| ID | Status | Requested by / date | Change | Reason | Acceptance criteria |
|----|--------|---------------------|--------|--------|---------------------|

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.35 | 2026-11-11 | generated by `tools/new-app.mjs`, then the design written from the notebook (owner request 2026-11-11) |
| 2 | v0.1.35 | 2026-11-11 | implemented after the owner's "go" (2026-11-11); compared with the snapshots |
| 3 | v0.1.36 | 2026-11-11 | version number (v0.1.36: the full colour menu of voronoi-diagrams); no change to this app's code, behaviour or picture |
| 4 | v0.1.37 | 2026-11-12 | version number (v0.1.37: thirteen control and signal ports and the shared modules they use; the additions to shared/plot.js, graphics.js and manipulate.js are opt-in); no change to this app's code, behaviour or picture |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|-------------|---------|-------------|---------|
| I-PI-01 | Points on an edge: let the edge through the point not block its own segments | a path for every inside point | differs from the original | E-PI-01 |
| I-PI-02 | Show the path length (the original's switched-off label) | a number to compare routes | differs from the original | Q-PI-02 |
| I-PI-03 | Snap an outside point to the nearest boundary point | smoother dragging | differs from the original | Q-PI-03 |

## 11. Errors in the original (conceptual and mathematical)

Checked on 2026-11-11 against the notebook and an independent shortest-path planner (visibility graph over all
vertices, exact segment-in-polygon test) on 2,000 seeded random integer start/finish pairs per polygon in a sandbox probe
(the unit test repeats the comparison on 150 pairs per polygon and the two examples below).

| ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
|----|------|-----------------------|--------------------------|--------------------|-------------------------|--------|
| E-PI-01 | conceptual | `ShortestInsidePath`: the border-edge test `MemberQ[v[[border[[i]]]], v[[#[[1]]]]] \|\| … \|\| !IntersectClosed[…]` | a start or finish point lying ON an edge (but not at a vertex) counts as inside, yet every segment from it touches that edge (`BetweenSW`) and is removed: no path at all (in Mathematica probably an error picture, D-PI-02), or a longer one. Reachable: positions are integers and the orthogonal polygon's edges lie on integer lines; 51 of 2,000 random pairs there (e.g. (169, 970) → (169, 1020): no path, true length 50; (745, 484) → (322, 1105): 948.19 instead of 802.78). The random polygon: none in 2,000 | keeps it | I-PI-01 | open |
| E-PI-02 | mathematical | `polygonEx[1]`: `{723,558};{762,611}` | almost certainly a comma typed as a semicolon: the vertex (723, 558) is dropped (Q-PI-01). The polygon stays simple either way | keeps it | add the vertex | open |

