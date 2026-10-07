// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Ravi Patel
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/unit-balls/norms.js — the original's norm functions (myNorm, myNorm2), the values of p and how the
// original displays them, the plot ranges, and the surface / mesh-line generators of the two plots.
// Pure module: no DOM, no three.js (unit-tested in Node).
import { mEqual, mLess } from '../../shared/mma.js';
import { mmaNumberString } from '../../shared/mma-extra.js';

// ---- the Manipulate variables ---------------------------------------------------------------------------
// p is either an EXACT Mathematica number, written as a string in InputForm ("1/4", "2", "Infinity"; from the
// setter bar or typed into the slider's value field), or a MACHINE REAL, written as a JS number (from the
// slider; the initial value 0.5 is a real too). The difference is visible: the plot label shows "1/4" as a
// fraction, 2 as "2" and the real 2. as "2.".

/** Control@{{p, 0.5, ""}, {1/4, 1/2, 1, 2, 3, 4, 9, 16, Infinity}, ControlType -> SetterBar} */
export const SETTER_VALUES = ['1/4', '1/2', '1', '2', '3', '4', '9', '16', 'Infinity'];
/** Control@{{p, 1, ""}, 0.1, 16, .01, Appearance -> "Labeled", ImageSize -> 150} */
export const SLIDER = { min: 0.1, max: 16, step: 0.01 };
/** Control@{{dimension, "3D", "dimension"}, {"2D", "3D"}} */
export const DIMENSIONS = ['2D', '3D'];
/**
 * Initial values. Both p controls initialise p; the FIRST specification (0.5, a machine real) wins — the
 * original's saved Manipulate output has both specifications rewritten to 0.5 (tests/golden).
 */
export const INITIAL = Object.freeze({ dimension: '3D', p: 0.5 });

/** Is p an exact number (string form)? */
export const isExactP = (p) => typeof p === 'string';

/** Numerical value of p (Infinity for "Infinity"). */
export function pNumber(p) {
  if (typeof p === 'number') return p;
  if (p === 'Infinity') return Infinity;
  const m = /^(\d+)\/(\d+)$/.exec(p);
  if (m) return Number(m[1]) / Number(m[2]);
  return Number(p);
}

/**
 * Parse what a user types into the slider's value field, as Mathematica would evaluate it:
 * "2" → exact 2, "1/4" (or "2/8") → exact 1/4, "2." / "0.25" → machine real, "Infinity" / "∞" → ∞, and
 * Mathematica's scientific notation "m*^k" (exact when m is an integer: "1*^1" → 10, "5*^-1" → 1/2; real when m has
 * a point: "2.5*^-1" → 0.25). "1e1" is NOT a number in Mathematica (1 times the symbol e1) and is refused.
 * Returns null for anything else, for p ≤ 0 (no norm), and for p too small to draw (drawableP; K-UB-06).
 */
export function parseP(text) {
  const s = String(text).trim();
  let p = null;
  let m;
  if (/^(Infinity|∞)$/.test(s)) p = 'Infinity';
  else if ((m = /^(\d+)$/.exec(s))) p = exactP(BigInt(m[1]), 1n);
  else if ((m = /^(\d+)\s*\/\s*(\d+)$/.exec(s))) p = exactP(BigInt(m[1]), BigInt(m[2]));
  else if ((m = /^(\d+)\*\^([+-]?\d+)$/.exec(s))) {
    const k = Number(m[2]);
    p = k >= 0 ? exactP(BigInt(m[1]) * 10n ** BigInt(k), 1n) : exactP(BigInt(m[1]), 10n ** BigInt(-k));
  } else if ((m = /^(\d+\.\d*|\.\d+)(?:\*\^([+-]?\d+))?$/.exec(s))) p = Number(`${m[1]}e${m[2] ?? 0}`);
  return p !== null && drawableP(p) ? p : null;
}

const bgcd = (a, b) => (b ? bgcd(b, a % b) : a);
/** exact a/b in lowest terms as the string form ("2", "1/4"); null for a zero numerator or denominator */
function exactP(a, b) {
  if (a === 0n || b === 0n) return null;
  const g = bgcd(a, b);
  return b / g === 1n ? String(a / g) : `${a / g}/${b / g}`;
}

/**
 * Can the port draw p? p must be > 0, and for very small p the corner height of the 2D plot, 1.5 · 2^(1/p), and the
 * norm of the cube corner, 3^(1/p), outgrow what the drawing can handle (the 2D height is kept below 10^30, i.e.
 * p ≥ about 0.0101). ∞ is fine.
 */
export function drawableP(p) {
  const v = pNumber(p);
  if (v === Infinity) return true;
  if (!(v > 0) || Number.isNaN(v)) return false;
  return !finiteBranch(p) || (myNorm2([1.5, 1.5], v) <= 1e30 && Number.isFinite(myNorm([1, 1, 1], v)));
}

/**
 * How Mathematica displays p (in the plot label and in the slider's value field):
 * exact rational → built-up fraction, exact integer → "2", machine real → "0.5", "2.", ∞ → "∞".
 * Returns { kind: 'fraction', num, den } or { kind: 'text', text }.
 */
export function pDisplay(p) {
  if (typeof p === 'number') return { kind: 'text', text: mmaNumberString(p, { isReal: true }) };
  if (p === 'Infinity') return { kind: 'text', text: '∞' };
  const m = /^(\d+)\/(\d+)$/.exec(p);
  if (m) return { kind: 'fraction', num: m[1], den: m[2] };
  return { kind: 'text', text: p };
}

/** p as plain text ("1/4", "0.5", "2.", "∞"): the slider's value field and the plot-range table keys. */
export function pText(p) {
  const d = pDisplay(p);
  return d.kind === 'fraction' ? `${d.num}/${d.den}` : d.text;
}

/**
 * PlotLabel -> Row[{p, "‐norm"}] Invisible[1/2]: the label text (U+2010 HYPHEN, as \[Hyphen]). The product
 * with Invisible[1/2] puts an invisible ½ and a space IN FRONT of the label (Times sorts Invisible before Row;
 * ORIGINAL QUIRK Q-UB-01): the label is shifted right and is always as tall as a fraction.
 */
export function plotLabel(p) {
  return { prefix: { kind: 'fraction', num: '1', den: '2', invisible: true }, value: pDisplay(p), suffix: '‐norm' };
}
export const plotLabelText = (p) => `${pText(p)}‐norm`;

/**
 * Which setter button is shown selected for p. The original's snapshot shows "1/2" selected while p is the
 * machine real 0.5, so the comparison is numeric (tolerant ==, shared/mma.js), not structural (K-UB-04).
 * Returns the matching SETTER_VALUES entry or null.
 */
export function setterSelection(p) {
  if (p === 'Infinity') return 'Infinity';
  const v = pNumber(p);
  if (!Number.isFinite(v)) return null;
  return SETTER_VALUES.find((s) => s !== 'Infinity' && mEqual(pNumber(s), v)) ?? null;
}

/**
 * Where the slider's thumb sits for p. ∞ puts it at the left end, as the original's snapshots for p = ∞ show
 * (K-UB-05); values outside 0.1…16 (typed) are drawn at the nearest end.
 */
export function sliderPosition(p) {
  const v = pNumber(p);
  if (v === Infinity) return SLIDER.min;
  return Math.min(Math.max(v, SLIDER.min), SLIDER.max);
}

// ---- the original's functions -----------------------------------------------------------------------------

/** myNorm[{x_, y_, z_}, p_] := (Abs[x]^p + Abs[y]^p + Abs[z]^p)^(1/p)   (p a number) */
export function myNorm([x, y, z], p) {
  return (Math.abs(x) ** p + Math.abs(y) ** p + Math.abs(z) ** p) ** (1 / p);
}

/** myNorm2[{x_, y_}, p_] := (Abs[x]^p + Abs[y]^p)^(1/p) */
export function myNorm2([x, y], p) {
  return (Math.abs(x) ** p + Math.abs(y) ** p) ** (1 / p);
}

/**
 * The test `p < 100` in both plots: true → the p-norm, false → the ∞-norm branch. Exact p compares exactly,
 * a machine real with Mathematica's tolerant Less. Only ∞ reaches the false branch through the controls; a
 * typed p ≥ 100 does too (N-UB-02).
 */
export function finiteBranch(p) {
  return typeof p === 'number' ? mLess(p, 100) : pNumber(p) < 100;
}

/** 2D-mode height: If[p < 100, myNorm2[{x, y}, p], Max[Abs[x], Abs[y]]] */
export function distance2D(x, y, p) {
  return finiteBranch(p) ? myNorm2([x, y], pNumber(p)) : Math.max(Math.abs(x), Math.abs(y));
}

/** 3D-mode region: If[p < 100, myNorm[{x, y, z}, p] <= 1, -1 <= x <= 1 && -1 <= y <= 1 && -1 <= z <= 1] */
export function inRegion3D(x, y, z, p) {
  return finiteBranch(p) ? myNorm([x, y, z], pNumber(p)) <= 1 : Math.abs(x) <= 1 && Math.abs(y) <= 1 && Math.abs(z) <= 1;
}

/** RegionPlot3D[..., PlotPoints -> If[p < 100, 25, 23]] */
export const plotPoints3D = (p) => (finiteBranch(p) ? 25 : 23);

/**
 * Positions of RegionPlot3D's default mesh lines (Mesh -> Automatic, MeshFunctions x, y, z): the planes
 * x = g, y = g, z = g. MEASURED in the original's 3D snapshots (star, cube, octahedron, sphere; DESIGN.md §6): the
 * lines lie at the multiples of 1/8 inside the plot range {-1.1, 1.1}, for PlotPoints 25 and 23 alike — so they are
 * NOT the sampling grid. The rule Mathematica uses to choose them is not known (K-UB-03). For the cube (∞ branch)
 * the planes ±1 contain its faces: snapshot 4 shows no line along the cube's edges, so ±1 are left out there (the
 * octahedron's edges, in the planes 0, do carry lines in snapshot 2).
 */
export const MESH_STEP_3D = 1 / 8;
export function meshValues3D(p) {
  const n = Math.floor(1.1 / MESH_STEP_3D);
  const all = Array.from({ length: 2 * n + 1 }, (_, k) => (k - n) * MESH_STEP_3D);
  return p !== undefined && !finiteBranch(p) ? all.filter((g) => Math.abs(g) !== 1) : all;
}

// ---- plot ranges ------------------------------------------------------------------------------------------

/** PlotRangePadding (Scaled[0.02] on every side), fitted from the box and the surface corners in the snapshots. */
export const PADDING = 0.02;
export const padded = ([a, b]) => [a - PADDING * (b - a), b + PADDING * (b - a)];
/** BoxRatios: {1, 1, 0.4} for Plot3D (2D mode), Automatic = {1, 1, 1} for the RegionPlot3D cube {-1.1, 1.1}^3. */
export const BOX_RATIOS = { '2D': [1, 1, 0.4], '3D': [1, 1, 1] };

/**
 * K-UB-01 (lead L-D22-01, resolved in v0.1.1) — the z range of the 2D-mode Plot3D for each p, WITHOUT padding,
 * MEASURED in Mathematica: `PlotRange /. AbsoluteOptions[Plot3D[…], PlotRange]` (extra-checks.wls, Mathematica
 * 15.0.1, owner run 2026-10-06). Key = pText(p): exact setter values "1/4" … "16", "∞"; machine reals "0.1", "0.5".
 * No clipping for any p: zmax is the corner value times (1 − 1.43e-7). zmin was printed as |zmin| < 4e-15 (e.g.
 * 5.55e-17 for 1/4, -1.39e-17 for 1/2, 3.55e-15 for 0.1: rounding noise around the minimum 0 at the origin) and is
 * entered as 0. Values of p not in the table use plotRangeZ2DRule, which agrees with every measured row to 2e-7.
 */
export const PLOT_RANGE_2D_Z_MEASURED = Object.freeze({
  '1/4': [0, 23.99999657142858],
  '1/2': [0, 5.999999142857142],
  '1': [0, 2.9999995714285714],
  '2': [0, 2.1213200405138792],
  '3': [0, 1.8898813048592276],
  '4': [0, 1.7838104176739855],
  '9': [0, 1.6200893768970865],
  '16': [0, 1.5664104498681675],
  '∞': [0, 1.4999997857142857],
  '0.1': [0, 1535.9997805714295],
  '0.5': [0, 5.999999142857142],
});

/**
 * Rule for p not in the table: the FULL range of both surfaces, from the norm's minimum 0 (at the origin) to the
 * larger of the plane z = 1 and the norm at the corners (±1.5, ±1.5) — no clipping of large values. First inferred
 * from the 2D snapshots (p = 0.5, 2, ∞), then confirmed by the measured table above for all setter values and the
 * slider values 0.1 and 0.5. Mathematica's zmax is smaller by the factor 1 − 1.43e-7 = 1 − 10^-6/7: consistent
 * with Plot3D's outermost samples lying 2.14e-7 (= 10^-6 of the initial grid step 3/14) inside the bounds ±1.5 —
 * the norm is homogeneous of degree 1, so the corner value shrinks by the same relative amount. The rule keeps the
 * exact corner (a difference far below one pixel).
 */
export function plotRangeZ2DRule(p) {
  const corner = distance2D(1.5, 1.5, p);
  return [Math.min(0, 1), Math.max(corner, 1)];
}

/** {{x}, {y}, {z}} plot range of the 2D-mode Plot3D (before padding). */
export function plotRange2D(p) {
  const z = PLOT_RANGE_2D_Z_MEASURED[pText(p)] ?? plotRangeZ2DRule(p);
  return [[-1.5, 1.5], [-1.5, 1.5], [z[0], z[1]]];
}
/** {{x}, {y}, {z}} plot range of the 3D-mode RegionPlot3D (the variable ranges; before padding). */
export const plotRange3D = () => [[-1.1, 1.1], [-1.1, 1.1], [-1.1, 1.1]];
export const plotRange = (dimension, p) => (dimension === '2D' ? plotRange2D(p) : plotRange3D());

// ---- surface generators ----------------------------------------------------------------------------------
// Both return NON-INDEXED triangle lists (positions and vertex normals, 9 numbers per triangle) so that every
// triangle can carry its own normals along creases (the axes for p ≤ 1, the diagonals for ∞).

const sgn = (v, fallback) => (v > 0 ? 1 : v < 0 ? -1 : fallback);

/**
 * Grid coordinates c_i = half · sign(t)|t|^κ, t = -1 … 1 in n (even) steps: includes 0, exactly symmetric
 * (c_(n-i) = -c_i, so that the diagonals |x| = |y| pass through grid points), denser near 0 for κ > 1.
 */
export function gridCoords(n, half, kappa = 1) {
  const c = new Array(n + 1);
  for (let i = n / 2; i <= n; i++) {
    const t = (2 * i - n) / n;
    c[i] = i === n ? half : half * t ** kappa;
    c[n - i] = i === n / 2 ? 0 : -c[i];
  }
  return c;
}

/**
 * 2D mode: the height field z = distance2D(x, y, p) over {x, -1.5, 1.5} × {y, -1.5, 1.5}.
 * PORT DEVIATION (D-UB-02): a fixed grid of `cells`² cells (each split in two triangles) replaces Plot3D's
 * adaptive sampling (MaxRecursion -> 5). The grid contains the axes (and, for ∞, the diagonals as triangle
 * edges), so the creases of p ≤ 1 and ∞ are exact; for p < 1 it is denser near the axes, where the surface is
 * steep. Normals are the analytic gradient (−∂z/∂x, −∂z/∂y, 1), taken on the triangle's side of a crease.
 * Returns { positions, normals, triangles, boundary: [[x,y,z]…] (closed loop along the domain edge), zMin, zMax }.
 */
export function heightField(p, { cells = 120 } = {}) {
  const fin = finiteBranch(p);
  const pv = pNumber(p);
  const kappa = fin && pv < 1 ? Math.min(1 / pv, 4) : 1;
  const c = gridCoords(cells, 1.5, kappa);
  const n1 = cells + 1;
  const Z = new Float64Array(n1 * n1);
  let zMin = Infinity, zMax = -Infinity;
  for (let j = 0; j < n1; j++) for (let i = 0; i < n1; i++) {
    const z = distance2D(c[i], c[j], p);
    Z[j * n1 + i] = z;
    if (z < zMin) zMin = z;
    if (z > zMax) zMax = z;
  }
  const tri = 2 * cells * cells;
  const positions = new Float64Array(tri * 9);
  const normals = new Float64Array(tri * 9);
  const nv = [0, 0, 0];
  // vertex normal on the side (sx, sy) of the axes (for ∞: dom 0 = |x| dominates, 1 = |y|); false if undefined
  const vertexNormal = (x, y, sx, sy, dom) => {
    const gx = sgn(x, sx), gy = sgn(y, sy);
    let dx, dy;
    if (!fin) { dx = dom === 0 ? gx : 0; dy = dom === 0 ? 0 : gy; } else {
      const k = (Math.abs(x) ** pv + Math.abs(y) ** pv) ** (1 / pv - 1);
      dx = k * Math.abs(x) ** (pv - 1) * gx;
      dy = k * Math.abs(y) ** (pv - 1) * gy;
    }
    if (Number.isNaN(dx) || Number.isNaN(dy)) return false;
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) {
      // vertical wall (p < 1 at an axis): only the infinite components count
      const ix = Number.isFinite(dx) ? 0 : -Math.sign(dx), iy = Number.isFinite(dy) ? 0 : -Math.sign(dy);
      const l = Math.hypot(ix, iy);
      nv[0] = ix / l; nv[1] = iy / l; nv[2] = 0;
      return true;
    }
    const l = Math.hypot(dx, dy, 1);
    nv[0] = -dx / l; nv[1] = -dy / l; nv[2] = 1 / l;
    return true;
  };
  let o = 0;
  const emit = (ia, ja, ib, jb, ic, jc) => {
    const ax = c[ia], ay = c[ja], az = Z[ja * n1 + ia];
    const bx = c[ib], by = c[jb], bz = Z[jb * n1 + ib];
    const cx = c[ic], cy = c[jc], cz = Z[jc * n1 + ic];
    const mx = (ax + bx + cx) / 3, my = (ay + by + cy) / 3;
    const sx = sgn(mx, 1), sy = sgn(my, 1), dom = Math.abs(mx) >= Math.abs(my) ? 0 : 1;
    // face normal (fallback at the cone tip / the origin)
    const ux = bx - ax, uy = by - ay, uz = bz - az, vx = cx - ax, vy = cy - ay, vz = cz - az;
    let fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
    const fl = Math.hypot(fx, fy, fz) || 1;
    fx /= fl; fy /= fl; fz /= fl;
    for (const [x, y, z] of [[ax, ay, az], [bx, by, bz], [cx, cy, cz]]) {
      positions[o] = x; positions[o + 1] = y; positions[o + 2] = z;
      if (vertexNormal(x, y, sx, sy, dom)) { normals[o] = nv[0]; normals[o + 1] = nv[1]; normals[o + 2] = nv[2]; } else { normals[o] = fx; normals[o + 1] = fy; normals[o + 2] = fz; }
      o += 3;
    }
  };
  for (let j = 0; j < cells; j++) for (let i = 0; i < cells; i++) {
    const mx = (c[i] + c[i + 1]) / 2, my = (c[j] + c[j + 1]) / 2;
    // split each cell along the diagonal that points away from the origin, so that ∞'s creases are edges
    if (mx * my > 0) { emit(i, j, i + 1, j, i + 1, j + 1); emit(i, j, i + 1, j + 1, i, j + 1); } else { emit(i, j, i + 1, j, i, j + 1); emit(i + 1, j, i + 1, j + 1, i, j + 1); }
  }
  const pt = (i, j) => [c[i], c[j], Z[j * n1 + i]];
  const boundary = [];
  for (let i = 0; i < cells; i++) boundary.push(pt(i, 0));
  for (let j = 0; j < cells; j++) boundary.push(pt(cells, j));
  for (let i = cells; i > 0; i--) boundary.push(pt(i, cells));
  for (let j = cells; j >= 0; j--) boundary.push(pt(0, j));
  return { positions, normals, triangles: tri, boundary, zMin, zMax, grid: c };
}

/**
 * 3D mode: the boundary of the unit ball {v : ‖v‖_p ≤ 1} (the cube [-1, 1]^3 for the ∞ branch).
 * PORT DEVIATION (D-UB-01): instead of RegionPlot3D's sampled and refined mesh (PlotPoints 25 / 23), the exact
 * surface: every point u of a subdivided cube surface is moved to u/‖u‖_p, which lies on the unit sphere of the
 * p-norm for every p > 0 (star shapes for p < 1, the octahedron with flat faces for p = 1, the cube for ∞). Each
 * cube face is built as four quadrant patches (one per octant), so triangles never cross a coordinate plane:
 * the octahedron's edges are triangle edges and its faces are exactly planar. Within a patch the parameter is
 * |t|^κ with κ = 1/p (clamped to 0.5…4): dense near the spikes for p < 1, near the rounded edges for p > 1.
 * Normals: the gradient of ‖v‖_p (sign(v_i)|v_i|^(p-1)), with the patch's octant signs on the coordinate planes.
 * Returns { positions, normals, triangles }.
 */
export function unitBallSurface(p, { cells = 24 } = {}) {
  const fin = finiteBranch(p);
  const pv = pNumber(p);
  const kappa = fin ? Math.min(Math.max(1 / pv, 0.5), 4) : 1;
  const w = Array.from({ length: cells + 1 }, (_, i) => (i / cells) ** kappa);
  const tri = 6 * 4 * 2 * cells * cells;
  const positions = new Float64Array(tri * 9);
  const normals = new Float64Array(tri * 9);
  const nv = (cells + 1) * (cells + 1);
  const P = new Float64Array(nv * 3);
  const N = new Float64Array(nv * 3);
  const u = [0, 0, 0], oct = [0, 0, 0], g = [0, 0, 0];
  let o = 0;
  for (let a = 0; a < 3; a++) {
    const b = (a + 1) % 3, c = (a + 2) % 3;
    for (const sigma of [1, -1]) for (const qs of [1, -1]) for (const qt of [1, -1]) {
      oct[a] = sigma; oct[b] = qs; oct[c] = qt;
      for (let j = 0; j <= cells; j++) for (let i = 0; i <= cells; i++) {
        const k = 3 * (j * (cells + 1) + i);
        u[a] = sigma; u[b] = qs * w[i]; u[c] = qt * w[j];
        if (!fin) {
          P[k] = u[0]; P[k + 1] = u[1]; P[k + 2] = u[2];
          N[k] = 0; N[k + 1] = 0; N[k + 2] = 0; N[k + a] = sigma;
          continue;
        }
        const r = myNorm(u, pv);
        let inf = false;
        for (let d = 0; d < 3; d++) {
          const x = u[d] / r;
          P[k + d] = x;
          g[d] = sgn(x, oct[d]) * Math.abs(x) ** (pv - 1);
          if (!Number.isFinite(g[d])) inf = true;
        }
        if (inf) for (let d = 0; d < 3; d++) g[d] = Number.isFinite(g[d]) ? 0 : Math.sign(g[d]);
        const l = Math.hypot(g[0], g[1], g[2]);
        N[k] = g[0] / l; N[k + 1] = g[1] / l; N[k + 2] = g[2] / l;
      }
      const put = (ia, ib, ic) => {
        let A = 3 * ia, B = 3 * ib, C = 3 * ic;
        const ux = P[B] - P[A], uy = P[B + 1] - P[A + 1], uz = P[B + 2] - P[A + 2];
        const vx = P[C] - P[A], vy = P[C + 1] - P[A + 1], vz = P[C + 2] - P[A + 2];
        const fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
        // outward (counter-clockwise seen from outside): the surface is a radial graph around the origin
        if (fx * (P[A] + P[B] + P[C]) + fy * (P[A + 1] + P[B + 1] + P[C + 1]) + fz * (P[A + 2] + P[B + 2] + P[C + 2]) < 0) [B, C] = [C, B];
        for (const V of [A, B, C]) {
          positions[o] = P[V]; positions[o + 1] = P[V + 1]; positions[o + 2] = P[V + 2];
          normals[o] = N[V]; normals[o + 1] = N[V + 1]; normals[o + 2] = N[V + 2];
          o += 3;
        }
      };
      const at = (i, j) => j * (cells + 1) + i;
      for (let j = 0; j < cells; j++) for (let i = 0; i < cells; i++) {
        put(at(i, j), at(i + 1, j), at(i + 1, j + 1));
        put(at(i, j), at(i + 1, j + 1), at(i, j + 1));
      }
    }
  }
  return { positions, normals, triangles: tri };
}

/**
 * Mesh lines (RegionPlot3D's Mesh -> Automatic: lines at the initial sampling grid, MeshFunctions x, y, z):
 * the intersections of the triangle list with the planes x = g, y = g, z = g for g in `values` (sorted, equally
 * spaced). A vertex exactly on a plane counts as lying on the plane's side away from the origin, so a crease
 * lying in a plane (the octahedron's edges, the cube's edges) is drawn once and a face lying in a plane draws
 * nothing.
 * Returns a flat array of segment end points [x1, y1, z1, x2, y2, z2, …].
 */
export function meshLines(positions, values) {
  const out = [];
  const v0 = values[0], dv = (values[values.length - 1] - v0) / (values.length - 1);
  const nTri = positions.length / 9;
  for (let t = 0; t < nTri; t++) {
    const b = t * 9;
    for (let ax = 0; ax < 3; ax++) {
      const q0 = positions[b + ax], q1 = positions[b + 3 + ax], q2 = positions[b + 6 + ax];
      const lo = Math.min(q0, q1, q2), hi = Math.max(q0, q1, q2);
      if (hi === lo) continue;
      const k0 = Math.max(0, Math.floor((lo - v0) / dv) - 1), k1 = Math.min(values.length - 1, Math.ceil((hi - v0) / dv) + 1);
      for (let k = k0; k <= k1; k++) {
        const g = values[k];
        const f = [q0 - g, q1 - g, q2 - g];
        // a vertex ON the plane counts as lying on the side away from the origin (symmetric in ±g)
        const pos = g >= 0 ? f.map((x) => x >= 0) : f.map((x) => x > 0);
        if (pos[0] === pos[1] && pos[1] === pos[2]) continue;
        const seg = [];
        for (const [i, j] of [[0, 1], [1, 2], [2, 0]]) {
          if (pos[i] === pos[j]) continue;
          const s = f[i] / (f[i] - f[j]);
          for (let d = 0; d < 3; d++) {
            const pi = positions[b + 3 * i + d], pj = positions[b + 3 * j + d];
            seg.push(d === ax ? g : pi + (pj - pi) * s);
          }
        }
        // a single vertex touching the plane gives a zero-length segment: nothing to draw
        if (seg[0] !== seg[3] || seg[1] !== seg[4] || seg[2] !== seg[5]) out.push(...seg);
      }
    }
  }
  return out;
}

/** Everything one evaluation of the Manipulate body draws, as plain data (no rendering). */
export function scene(state) {
  const { dimension, p } = state;
  if (dimension === '2D') {
    const hf = heightField(p);
    return { dimension, kind: 'Plot3D', range: plotRange2D(p), boxRatios: BOX_RATIOS['2D'], surface: hf, plane: 1, meshValues: null, label: plotLabelText(p) };
  }
  const surface = unitBallSurface(p);
  const meshValues = meshValues3D(p);
  return { dimension, kind: 'RegionPlot3D', range: plotRange3D(), boxRatios: BOX_RATIOS['3D'], surface, plane: null, meshValues, mesh: meshLines(surface.positions, meshValues), plotPoints: plotPoints3D(p), label: plotLabelText(p) };
}
