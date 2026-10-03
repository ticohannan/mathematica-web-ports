# Design: Motion Planning for Robot Path around Obstacles

Original: Wolfram Demonstrations Project, by Shreyas Poyrekar, Aaron T. Becker and Arifa Sultana
(author notebook created with Mathematica 10.2). Readable original source:
`docs/original-source/motion-planning.txt`. Port files: `planner.js` (pure computation, line-by-line
port), `main.js` (SVG rendering + interaction), `index.html`.

## 1. Features re-implemented

### Controls (left panel, `ControlPlacement -> Left`)
| ID | Feature (original spec) | Port | Verified by |
|----|-------------------------|------|-------------|
| F-MP-01 | View setter `{configOrWork, "workspace"}` with options workspace / configuration space | setter bar | e2e "configuration space view…", M-MP-10 |
| F-MP-02 | Label "number of sides" | heading | M-MP-01 |
| F-MP-03 | Boundary sides `{{x,4},3,5,1,SetterBar}` | setter 3/4/5, default 4 | e2e "boundary sides setter…", M-MP-06 |
| F-MP-04 | Robot sides `{{n,3},3,5,1,SetterBar}` | setter 3/4/5, default 3 | e2e "robot sides setter…", M-MP-07 |
| F-MP-05 | Progress slider `{{s,1},1,Length@discretePath,1, ImageSize->90}`, unlabelled | slider 1…len, step 1, ⊕ animation panel | e2e "progress slider…", M-MP-08 |
| F-MP-06 | Six locators: r1 (-2,2.75), r2 (0.5,-3) in [-4.25,4.15]²; o1 (2,2.5), o2 (-1,-0.5), o3 (-2,-2.4), o4 (2,-1) in [-3.75,3.75]² | draggable SVG locators, clamped | e2e drag + clamping tests, M-MP-02…05 |
| F-MP-07 | Progress resets to 1 when robot/obstacle locators or robot sides change | yes | e2e "robot sides setter…" |

### Geometry and algorithm (`planner.js`)
| ID | Feature | Original function | Verified by |
|----|---------|-------------------|-------------|
| F-MP-10 | Boundary: regular x-gon, radius 5 (x<5) or 4.75 (x=5), centred vertically | `borderpoly` | unit "boundary polygons are centred", golden |
| F-MP-11 | Robot: regular n-gon radius 0.5 at r1 (start) and r2 (end) | `robotStartPoly` | golden "robot polygons" |
| F-MP-12 | Obstacles: o1 triangle, o2 square, o3 pentagon, o4 hexagon, radius 0.5 | `obstaclepoly` | golden "obstacle polygons" |
| F-MP-13 | C-obstacle = Minkowski sum of obstacle and reflected robot (convex merge) | `ConvexMinkowskiSumRev3` | golden (vertex order), unit property test |
| F-MP-14 | Configuration-space boundary (boundary shrunk by robot) | `configBoundaryFunc` | unit "square boundary, triangle robot" |
| F-MP-15 | Start/end validity: centroid inside C-boundary and outside every C-obstacle | `testpoint`, `robotinsideobstcond` | unit "start inside…", "robot partly outside…" |
| F-MP-16 | Visibility from start/end (rotational sweep) | `visiblePolys` | golden "visibility lines" |
| F-MP-17 | Bitangent lines between C-obstacles, filtered by visibility | `visBiLineRev2`, `biTangents2polyRev1` | golden "visible bitangent lines" |
| F-MP-18 | C-obstacle edges that cross no other C-obstacle edge join the graph | `noInterConfig` | golden (via trajectory) |
| F-MP-19 | Graph nodes outside the C-boundary removed | `dpoints` | exploration tool |
| F-MP-20 | Direct path if the straight line hits no C-obstacle edge | main body | unit "direct line…" |
| F-MP-21 | Shortest path by `myAstarRev2` | `myAstarRev2` | unit A* tests, golden trajectory |
| F-MP-22 | Path discretised every 0.09 units, r2 appended | `discretizeLineRev1` | unit, golden trajectory |

### Graphics (order as in the original `Graphics[...]`)
| ID | Feature | Verified by |
|----|---------|-------------|
| F-MP-30 | Background square ±4.75: white; in configuration space red if start or end invalid | e2e "start inside an obstacle…", M-MP-11 |
| F-MP-31 | Workspace: LightYellow boundary, LightRed obstacles, LightBlue start robot, LightGreen end robot (red if invalid), thin black edges | M-MP-01, review screenshots |
| F-MP-32 | Workspace: path Darker[Green] 50 % Thick; travelled part solid; orange 50 % robot and red point at progress position | e2e progress test, M-MP-08 |
| F-MP-33 | Configuration space: LightGray C-boundary, C-obstacles white (red if containing start/end), Lighter[Green] path, dark green point at progress if s≠1 | e2e config test, M-MP-10 |
| F-MP-34 | Both views: orange start-visibility lines, purple end-visibility lines, blue bitangent lines (25 % opacity) | M-MP-12 |
| F-MP-35 | Both views: gray C-obstacle and C-boundary outlines, red points at C-obstacle vertices | M-MP-12 |
| F-MP-36 | "No path exists." in large dark red at r1 + (0, 0.5) when there is no path | e2e "start inside an obstacle…" |
| F-MP-37 | Plot range ±4.65, image size 425 | M-MP-01 |

### Page content
| ID | Feature | Verified by |
|----|---------|-------------|
| F-MP-40 | Caption, Details (4 steps), references, author credit | M-MP-14 |

### Port additions (not in the original — flag them in any comparison)
| ID | Addition | Why |
|----|----------|-----|
| A-MP-01 | "Initial settings" button | stands in for Manipulate's ⊕ menu → Initial Settings |
| A-MP-02 | "show numbers" readout: path vertices, length, graph size, link to scene | lets testers check calculations, share scenes |
| A-MP-03 | Scene from URL parameters (`?r1=x,y&…&n=3&x=4&view=config`) | reproducible test cases |
| A-MP-04 | Arrow keys move a focused locator (Shift = bigger step) | accessibility / precise testing |
| A-MP-05 | `window.__demo` automation hook | browser tests |

## 2. Deliberate deviations (D) and preserved original quirks (Q)

| ID | Kind | Description |
|----|------|-------------|
| D-MP-01 | deviation | Progress `s` is clamped to the new path length when the path gets shorter without a reset (e.g. boundary change). Original behaviour for s > Length[discretePath] unknown (likely a Part error). |
| D-MP-02 | deviation | If start or goal is missing from the graph (all their lines were removed) the port reports no path; the original evaluates `First@@{}` (error, silenced by `Quiet`) with undefined result. |
| D-MP-03 | deviation | Progress slider disabled when there is no path (original: slider range 1…0 or 1…1, behaviour unknown). |
| D-MP-04 | deviation | Locator look approximates Mathematica's; clicking on empty space does not move a locator (Mathematica's LocatorPane may move the nearest locator — **verify in the original**, M-MP-05). |
| D-MP-05 | deviation | Line widths: `Thin` = 0.5 px, `Thick` = 2 px, "Large" text = 18 px at nominal size — approximations of Mathematica's sizes. |
| D-MP-06 | deviation | The original caches intermediate results between evaluations (`prev*` variables); the port recomputes everything on each change. The caches never change results, only speed. |
| Q-MP-01 | quirk kept | `myAstarRev2` heuristic is `EuclideanDistance[verts[[nbr]], verts[[nbr]]]` = 0 → it is Dijkstra's algorithm (still optimal on its graph). |
| Q-MP-02 | quirk kept | `angleSortCond` tie-break compares a distance with an angle (`c < b`, intended `c < d`). |
| Q-MP-03 | quirk kept | In `visiblePolys` one `SegmentIntersectionQ` call has the wrong argument shape and never evaluates; the port reproduces the resulting no-op. |
| Q-MP-04 | quirk kept | `getClockwiseAngle` forces the angle to 0 when the two vectors agree in either coordinate. |
| Q-MP-05 | quirk kept | `SegmentIntersectionQ` ignores intersections at endpoints and treats parallel/collinear segments as non-intersecting. |
| Q-MP-06 | quirk kept | `testpoint`: points exactly on a polygon edge count as outside. |
| Q-MP-07 | quirk kept | Minkowski sum keeps collinear intermediate vertices for parallel edges, in Mathematica's tie order (reproduced via `sortMma` + exact `CirclePoints`). |
| Q-MP-08 | quirk kept | C-obstacles are built from the robot START polygon; overlapping obstacles are not merged — edges that cross another C-obstacle edge are dropped from the graph instead. |
| Q-MP-09 | quirk kept | Obstacles are not checked against the boundary or each other. |

## 3. Test plan

### Automated (run `npm test`, `npm run test:e2e`)
- Golden parity: all 5 cached states of the original (3 distinct scenes) reproduce, BIT FOR BIT, polygons,
  Minkowski sums, visibility/bitangent lines and the full trajectory (`tests/golden/parity.test.js`).
- Unit/property: see `tests/unit/planner.test.js` (hand-derived + independent oracle).
- Browser: `tests/e2e/motion-planning.spec.js` (controls present, mouse drag, clamping, invalid
  start, setters, progress, configuration view, URL scenes, keyboard, snapshot trajectories + screenshots).
- Investigation: `tools/explore-motion.mjs` — differential testing vs the reference planner.

### Manual
`docs/MANUAL_TEST_CHECKLIST.md`, section MP.

### Known coverage gaps
- No golden data for boundary 5 or robot 5 sides.
- Behaviour of the original in degenerate scenes (overlapping obstacles, start touching an obstacle,
  points exactly on boundaries) is unknown until compared in Wolfram software.
- Performance on slow machines while dragging (recomputation runs on every animation frame).
