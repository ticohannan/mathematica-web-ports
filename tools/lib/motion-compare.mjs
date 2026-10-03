// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tools/lib/motion-compare.mjs — comparison helpers for tools/compare-with-original.mjs
// (port vs the original Wolfram code run by tools/wolfram/mp-original.wls, plus the independent
// reference planner). Pure functions; unit-tested in tests/unit/motion-compare.test.js.

import { computeScene, pathLength, DEFAULTS, LOCATOR_RANGES } from '../../demos/motion-planning/planner.js';
import { referencePlan, strictlyInsideConvex } from '../../tests/support/reference-planner.js';

export const LOCATORS = ['r1', 'r2', 'o1', 'o2', 'o3', 'o4'];
export const LAST_BIT_TOL = 1e-12; // "same number up to rounding in the last bits"
export const ROUTE_TOL = 1e-9; // paths whose vertices differ by more than this are different routes

// ---------------------------------------------------------------- exchange format

/** Exact value of a double as "m/2^k" (or an integer string), so the Wolfram side gets the identical double. */
export function exactRational(x) {
  if (!Number.isFinite(x)) throw new Error(`not a finite number: ${x}`);
  if (Number.isInteger(x)) return BigInt(x).toString();
  let y = x, k = 0;
  while (!Number.isInteger(y)) { y *= 2; k++; } // multiplying by 2 is exact
  return `${BigInt(y)}/${1n << BigInt(k)}`;
}

/** Clamp a scene to the locator ranges of the original Manipulate (the page clamps link values the same way). */
export function clampScene(st) {
  const out = { ...st };
  for (const k of LOCATORS) {
    const [[x0, y0], [x1, y1]] = LOCATOR_RANGES[k];
    out[k] = [Math.min(Math.max(st[k][0], x0), x1), Math.min(Math.max(st[k][1], y0), y1)];
  }
  return out;
}

/** Scene record for the Wolfram script (coordinates as exact rationals). */
export function sceneForWolfram(sc) {
  const conv = (st) => Object.fromEntries(Object.entries(st).map(([k, v]) =>
    [k, LOCATORS.includes(k) ? v.map(exactRational) : v]));
  const rec = { id: sc.id, x: sc.x, n: sc.n, ...conv(Object.fromEntries(LOCATORS.map((k) => [k, sc[k]]))) };
  if (sc.prelude) rec.prelude = conv(sc.prelude);
  return rec;
}

export function sceneUrl(base, st) {
  const p = (v) => `${v[0]},${v[1]}`; // String(number) round-trips exactly
  return `${base}/demos/motion-planning/?r1=${p(st.r1)}&r2=${p(st.r2)}&o1=${p(st.o1)}&o2=${p(st.o2)}&o3=${p(st.o3)}&o4=${p(st.o4)}&n=${st.n}&x=${st.x}`;
}

// ---------------------------------------------------------------- scene sources

/** Seeded random scenes; mostly "planner-exercising" (valid start/goal, direct line blocked), some uniform. */
export function randomScenes(count, seed = 1, uniformShare = 0.3) {
  let s = seed >>> 0 || 1;
  const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const inRange = (name) => {
    const [[x0, y0], [x1, y1]] = LOCATOR_RANGES[name];
    return [Number((x0 + rand() * (x1 - x0)).toFixed(2)), Number((y0 + rand() * (y1 - y0)).toFixed(2))];
  };
  const out = [];
  for (let i = 0; i < count; i++) {
    const st = { x: pick([3, 4, 5]), n: pick([3, 4, 5]) };
    for (const k of LOCATORS) st[k] = inRange(k);
    const uniform = rand() < uniformShare;
    if (!uniform) {
      for (let tries = 0; tries < 400; tries++) {
        const probe = referencePlan(st);
        if (probe.startOk && probe.goalOk && probe.cobstacles.some((c) => segmentHitsInterior(st.r1, st.r2, c))) break;
        st.r1 = inRange('r1'); st.r2 = inRange('r2');
      }
    }
    out.push({ id: `R${String(i + 1).padStart(3, '0')}`, title: uniform ? 'random (uniform)' : 'random (planner-exercising)', ...st });
  }
  return out;
}

/** The interactive original keeps C-obstacles computed when the obstacles last moved (O-36). */
export function withHistory(sc) {
  return { ...sc, id: `${sc.id}~h`, title: `${sc.title} — after moving the robot from the default start`,
    prelude: { r1: DEFAULTS.r1.slice(), r2: DEFAULTS.r2.slice() } };
}

// ---------------------------------------------------------------- generic comparison

const isNum = (v) => typeof v === 'number';
export function exactEqual(a, b) {
  if (Array.isArray(a)) return Array.isArray(b) && a.length === b.length && a.every((v, i) => exactEqual(v, b[i]));
  if (isNum(a) && isNum(b)) return a === b; // 0 === -0 is fine
  return a === b;
}
/** Largest absolute difference between two numeric arrays of the same shape; Infinity if shapes differ. */
export function maxAbsDiff(a, b) {
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return Infinity;
    return a.reduce((m, v, i) => Math.max(m, maxAbsDiff(v, b[i])), 0);
  }
  if (isNum(a) && isNum(b)) return Math.abs(a - b);
  return a === b ? 0 : Infinity;
}
/** identical | last-bit | DIFFERENT (with the size of the difference) */
export function compareNumeric(orig, port, tol = LAST_BIT_TOL) {
  if (exactEqual(orig, port)) return { status: 'identical', diff: 0 };
  const diff = maxAbsDiff(orig, port);
  return { status: diff <= tol ? 'last-bit' : 'DIFFERENT', diff };
}
/** Line lists: same order → like compareNumeric; otherwise compare as sets (tolerance ROUTE_TOL). */
export function compareLines(orig, port) {
  const base = compareNumeric(orig, port);
  if (base.status !== 'DIFFERENT') return base;
  const close = (l, m) => maxAbsDiff(l, m) <= ROUTE_TOL || maxAbsDiff(l, [m[1], m[0]]) <= ROUTE_TOL;
  const onlyOrig = orig.filter((l) => !port.some((m) => close(l, m)));
  const onlyPort = port.filter((l) => !orig.some((m) => close(l, m)));
  if (!onlyOrig.length && !onlyPort.length) return { status: orig.length === port.length ? 'reordered' : 'duplicates-differ', diff: base.diff };
  return { status: 'DIFFERENT', diff: base.diff, onlyOrig, onlyPort };
}

// ---------------------------------------------------------------- planner-specific

export function segmentHitsInterior(p, q, poly, steps = 200) {
  for (let j = 1; j < steps; j++) {
    const t = j / steps;
    if (strictlyInsideConvex([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t], poly)) return true;
  }
  return false;
}

/** What the port computes, in the same shape as the Wolfram script's record. */
export function portRecord(st) {
  const sc = computeScene(st);
  return {
    robotinsideobstcond: sc.robotinsideobstcond, obstCollision: sc.obstCollision,
    robotobstconfig: sc.robotobstconfig, configBoundary: sc.configBoundary, obstaclepoly: sc.obstaclepoly,
    robotStartPoly: sc.robotStartPoly, robotEndPoly: sc.robotEndPoly, borderpoly: sc.borderpoly,
    linesStarttoObstacles: sc.linesStarttoObstacles, linesEndtoObstacles: sc.linesEndtoObstacles,
    verticestoVertices: sc.verticestoVertices, path: sc.path, discretePath: sc.discretePath,
    diagnostics: sc.diagnostics,
  };
}

const isPath = (p) => Array.isArray(p) && p.every((q) => Array.isArray(q) && q.length === 2 && q.every(isNum));
export const pathLen = (p) => (isPath(p) && p.length ? pathLength(p) : null);

/** Field-by-field comparison of one scene. Verdict: identical | last-bit | DIFFERENT | original-error. */
export function compareScene(orig, port) {
  if (!orig || orig.status !== 'ok') {
    return { verdict: 'original-error', fields: {}, notes: [`original status: ${orig ? orig.status : 'missing'}`] };
  }
  const fields = {};
  const notes = [];
  fields.validity = exactEqual(orig.robotinsideobstcond, port.robotinsideobstcond) ? { status: 'identical', diff: 0 } : { status: 'DIFFERENT', diff: Infinity };
  fields.obstCollision = exactEqual(orig.obstCollision, port.obstCollision) ? { status: 'identical', diff: 0 } : { status: 'DIFFERENT', diff: Infinity };
  for (const k of ['obstaclepoly', 'robotStartPoly', 'robotEndPoly', 'borderpoly', 'robotobstconfig', 'configBoundary']) fields[k] = compareNumeric(orig[k], port[k]);
  for (const k of ['linesStarttoObstacles', 'linesEndtoObstacles', 'verticestoVertices']) fields[k] = compareLines(orig[k] ?? [], port[k] ?? []);
  if (!isPath(orig.path)) {
    fields.path = { status: 'DIFFERENT', diff: Infinity };
    notes.push(`original path is not a list of points: ${String(orig.path).slice(0, 160)}`);
  } else {
    fields.path = compareNumeric(orig.path, port.path, ROUTE_TOL);
    if (fields.path.status === 'DIFFERENT' && orig.path.length && port.path.length) {
      notes.push(`different route: original ${orig.path.length} vertices, length ${pathLen(orig.path)?.toFixed(6)}; port ${port.path.length} vertices, length ${pathLen(port.path)?.toFixed(6)}`);
    }
  }
  fields.discretePath = compareNumeric(orig.discretePath ?? [], port.discretePath ?? [], LAST_BIT_TOL);
  const statuses = Object.values(fields).map((f) => f.status);
  const verdict = statuses.includes('DIFFERENT') ? 'DIFFERENT'
    : statuses.every((s) => s === 'identical') ? 'identical' : 'last-bit';
  if (statuses.includes('reordered')) notes.push('some line lists contain the same lines in a different order');
  if (orig.messages?.length) notes.push(`original messages: ${orig.messages.join(', ')}`);
  return { verdict, fields, notes };
}

/**
 * Check one result (original or port) against the independent reference planner.
 * Returns a list of flags, e.g. 'crosses-obstacle', 'longer-than-shortest', 'no-path-but-one-exists',
 * 'path-undefined' (the result is not a list of points).
 */
export function referenceFlags(st, ref, rec) {
  const flags = [];
  if (!rec || !Array.isArray(rec.robotinsideobstcond)) return flags;
  const [startBad, goalBad] = rec.robotinsideobstcond;
  if (!startBad !== ref.startOk) flags.push(`start-validity(ref:${ref.startOk ? 'valid' : 'invalid'})`);
  if (!goalBad !== ref.goalOk) flags.push(`goal-validity(ref:${ref.goalOk ? 'valid' : 'invalid'})`);
  if (startBad || goalBad || !ref.startOk || !ref.goalOk) return flags;
  if (!Array.isArray(rec.path)) { flags.push('path-undefined'); return flags; } // e.g. the original's First@@{} case
  if (!isPath(rec.path) || rec.path.length === 0) {
    if (Number.isFinite(ref.length)) flags.push('no-path-but-one-exists');
    return flags;
  }
  for (let k = 0; k + 1 < rec.path.length; k++) {
    const [p, q] = [rec.path[k], rec.path[k + 1]];
    if (ref.cobstacles.some((c) => segmentHitsInterior(p, q, c))) { flags.push('crosses-obstacle'); break; }
  }
  const L = pathLen(rec.path);
  if (Number.isFinite(ref.length) && L > ref.length + 1e-6) flags.push('longer-than-shortest');
  return flags;
}

/** Golden self-check: does the fresh Wolfram run reproduce the original's cached results? */
export function goldenSelfCheck(orig, cached) {
  if (!orig || orig.status !== 'ok') return { ok: false, fields: { status: { status: orig ? orig.status : 'missing' } } };
  const fields = {
    obstaclepoly: compareNumeric(orig.obstaclepoly, cached.prevObstaclepoly),
    robotStartPoly: compareNumeric(orig.robotStartPoly, cached.prevRobotStartPoly),
    robotEndPoly: compareNumeric(orig.robotEndPoly, cached.prevRobotEndPoly),
    robotobstconfig: compareNumeric(orig.robotobstconfig, cached.prevRobotobstconfig),
    linesStarttoObstacles: compareNumeric(orig.linesStarttoObstacles, cached.linesStarttoObstacles),
    linesEndtoObstacles: compareNumeric(orig.linesEndtoObstacles, cached.linesEndtoObstacles),
    verticestoVertices: compareNumeric(orig.verticestoVertices, cached.verticestoVertices),
    discretePath: compareNumeric(orig.discretePath, cached.discretePath, 1e-12),
  };
  return { ok: Object.values(fields).every((f) => f.status !== 'DIFFERENT'), fields };
}

export function referenceFor(st) { return referencePlan(st); }
