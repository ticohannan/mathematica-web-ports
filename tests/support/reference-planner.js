// tests/support/reference-planner.js
//
// An INDEPENDENT reference implementation used only as a test oracle for the
// motion-planning port. It deliberately shares no code with planner.js except
// the scene construction (polygon shapes / positions), so a bug in the port's
// geometry routines cannot hide itself.
//
// Method: textbook visibility graph over all C-obstacle vertices + start + goal.
// An edge is allowed if sampled points along it are never strictly inside any
// C-obstacle (union semantics, so overlapping obstacles are handled) and stay
// inside the configuration-space boundary. Shortest path by Dijkstra.
// It is slow (O(V^2 * E * samples)) but simple enough to check by hand.

const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const crossZ = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** Signed area (positive = counter-clockwise). */
export function signedArea(poly) {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % poly.length];
    s += x1 * y2 - x2 * y1;
  }
  return s / 2;
}

/** Strictly inside a convex polygon (any orientation) by more than `margin`. */
export function strictlyInsideConvex(p, poly, margin = 1e-7) {
  const orient = Math.sign(signedArea(poly)) || 1;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const len = dist(a, b) || 1;
    if ((orient * crossZ(a, b, p)) / len <= margin) return false;
  }
  return true;
}

/** Separating-axis test: do two convex polygons overlap (with positive-area intersection)? */
export function convexOverlap(P, Q, margin = 1e-9) {
  for (const poly of [P, Q]) {
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const n = [-(b[1] - a[1]), b[0] - a[0]];
      const proj = (R) => R.map((p) => n[0] * p[0] + n[1] * p[1]);
      const pp = proj(P), qq = proj(Q);
      if (Math.max(...pp) <= Math.min(...qq) + margin || Math.max(...qq) <= Math.min(...pp) + margin) return false;
    }
  }
  return true;
}

/** Points along a segment, including both ends. */
function samples(p, q, step = 0.01) {
  const n = Math.max(2, Math.ceil(dist(p, q) / step));
  const out = [];
  for (let k = 0; k <= n; k++) out.push([p[0] + ((q[0] - p[0]) * k) / n, p[1] + ((q[1] - p[1]) * k) / n]);
  return out;
}

/** Is the segment free (never strictly inside any C-obstacle, never outside the boundary)? */
export function segmentFree(p, q, cobstacles, boundary, margin = 1e-7) {
  for (const s of samples(p, q)) {
    if (cobstacles.some((c) => strictlyInsideConvex(s, c, margin))) return false;
    if (boundary && !insideOrOnConvex(s, boundary, 1e-7)) return false;
  }
  return true;
}

export function insideOrOnConvex(p, poly, tol = 1e-9) {
  const orient = Math.sign(signedArea(poly)) || 1;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const len = dist(a, b) || 1;
    if ((orient * crossZ(a, b, p)) / len < -tol) return false;
  }
  return true;
}

/** Shortest collision-free path length (or Infinity), plus the path. */
export function referenceShortestPath(start, goal, cobstacles, boundary) {
  const nodes = [start, goal, ...cobstacles.flat()].filter((v, i, arr) =>
    arr.findIndex((w) => Math.abs(w[0] - v[0]) < 1e-12 && Math.abs(w[1] - v[1]) < 1e-12) === i);
  const ok = nodes.map((v) => insideOrOnConvex(v, boundary, 1e-7) && !cobstacles.some((c) => strictlyInsideConvex(v, c)));
  const N = nodes.length;
  const g = new Array(N).fill(Infinity), prev = new Array(N).fill(-1), done = new Array(N).fill(false);
  g[0] = 0;
  for (;;) {
    let u = -1;
    for (let i = 0; i < N; i++) if (!done[i] && ok[i] && g[i] < Infinity && (u < 0 || g[i] < g[u])) u = i;
    if (u < 0) break;
    if (u === 1) break;
    done[u] = true;
    for (let v = 0; v < N; v++) {
      if (done[v] || !ok[v] || v === u) continue;
      const d = g[u] + dist(nodes[u], nodes[v]);
      if (d < g[v] - 1e-12 && segmentFree(nodes[u], nodes[v], cobstacles, boundary)) { g[v] = d; prev[v] = u; }
    }
  }
  if (g[1] === Infinity) return { length: Infinity, path: [] };
  const path = [];
  for (let k = 1; k !== -1; k = prev[k]) path.unshift(nodes[k]);
  return { length: g[1], path };
}

export { dist };

// ---------------------------------------------------------------------------
// Independent scene construction (does not use planner.js / shared/mma.js)
// ---------------------------------------------------------------------------

function ngon(c, sides, radius) {
  const pts = [];
  for (let k = 0; k < sides; k++) {
    const t = -Math.PI / 2 + Math.PI / sides + (2 * Math.PI * k) / sides;
    pts.push([c[0] + radius * Math.cos(t), c[1] + radius * Math.sin(t)]);
  }
  return pts;
}

/** Andrew's monotone chain convex hull, counter-clockwise, no collinear points. */
export function convexHull(points) {
  const P = points.map((p) => [p[0], p[1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (P.length < 3) return P;
  const lower = [], upper = [];
  for (const p of P) { while (lower.length >= 2 && crossZ(lower[lower.length - 2], lower[lower.length - 1], p) <= 1e-12) lower.pop(); lower.push(p); }
  for (const p of P.slice().reverse()) { while (upper.length >= 2 && crossZ(upper[upper.length - 2], upper[upper.length - 1], p) <= 1e-12) upper.pop(); upper.push(p); }
  upper.pop(); lower.pop();
  return lower.concat(upper);
}

/** Reference C-obstacle: hull of { o + (c - r) : o in obstacle, r in robot }, c = robot centre. */
export function referenceCObstacle(robot, centre, obstacle) {
  const pts = [];
  for (const o of obstacle) for (const r of robot) pts.push([o[0] + centre[0] - r[0], o[1] + centre[1] - r[1]]);
  return convexHull(pts);
}

/** Builds the scene exactly as the Demonstration describes it, independently of the port. */
export function referenceScene(state) {
  const R = state.x < 5 ? 5.0 : 4.75;
  let border = ngon([0, 0], state.x, R);
  const ys = border.map((p) => p[1]);
  const shift = (Math.max(...ys) + Math.min(...ys)) / 2;
  border = border.map((p) => [p[0], p[1] - shift]);
  const robotAt = (c) => ngon(c, state.n, 0.5);
  const obstacles = [state.o1, state.o2, state.o3, state.o4].map((c, i) => ngon(c, i + 3, 0.5));
  const cobstacles = obstacles.map((ob) => referenceCObstacle(robotAt(state.r1), state.r1, ob));
  // Robot centre c is valid w.r.t. the boundary if every robot vertex is inside the boundary.
  const offsets = robotAt([0, 0]);
  const insideBoundary = (c) => offsets.every((o) => insideOrOnConvex([c[0] + o[0], c[1] + o[1]], border, 1e-7));
  // Configuration-space boundary as a polygon: erode each boundary edge by the robot's support distance.
  return { border, obstacles, cobstacles, insideBoundary, robotAt };
}

/** Reference planner on an independently built scene. */
export function referencePlan(state) {
  const sc = referenceScene(state);
  const freePoint = (p) => sc.insideBoundary(p) && !sc.cobstacles.some((c) => strictlyInsideConvex(p, c));
  const startOk = freePoint(state.r1), goalOk = freePoint(state.r2);
  if (!startOk || !goalOk) return { ...sc, startOk, goalOk, length: Infinity, path: [] };
  const nodes = [state.r1, state.r2, ...sc.cobstacles.flat()].filter((v, i, arr) =>
    arr.findIndex((w) => Math.abs(w[0] - v[0]) < 1e-12 && Math.abs(w[1] - v[1]) < 1e-12) === i);
  const okNode = nodes.map((v, i) => i < 2 || freePoint(v));
  const segFree = (p, q) => samples(p, q).every(freePoint);
  const N = nodes.length;
  const g = new Array(N).fill(Infinity), prev = new Array(N).fill(-1), done = new Array(N).fill(false);
  g[0] = 0;
  for (;;) {
    let u = -1;
    for (let i = 0; i < N; i++) if (!done[i] && okNode[i] && g[i] < Infinity && (u < 0 || g[i] < g[u])) u = i;
    if (u < 0 || u === 1) break;
    done[u] = true;
    for (let v = 0; v < N; v++) {
      if (done[v] || !okNode[v] || v === u) continue;
      const d = g[u] + dist(nodes[u], nodes[v]);
      if (d < g[v] - 1e-12 && segFree(nodes[u], nodes[v])) { g[v] = d; prev[v] = u; }
    }
  }
  const path = [];
  if (g[1] < Infinity) for (let k = 1; k !== -1; k = prev[k]) path.unshift(nodes[k]);
  return { ...sc, startOk, goalOk, freePoint, length: g[1], path };
}
