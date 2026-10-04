// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tools/lib/trace-replay.mjs — replay calls recorded inside the ORIGINAL (mp-original.wls trace
// mode) through the port's functions and through candidate implementations of built-ins, to find
// the lowest-level function whose results differ. Used by compare-with-original.mjs --trace.
import * as P from '../../demos/motion-planning/planner.js';
import { arcTan as arcTanExact } from '../../shared/mma-exact.js';
import { CANDIDATES } from './numerics-candidates.mjs';

/** Original function name → port function (same argument structure as the Wolfram call). */
export const PORT_FUNCTIONS = {
  reflex: P.reflex, biTangent: P.biTangent, glancingBlow: P.glancingBlow,
  LineIntersectionPoint: P.LineIntersectionPoint, SegmentIntersectionQ: P.SegmentIntersectionQ,
  getAngle: P.getAngle, pointOnSegmentQ: P.pointOnSegmentQ, getClockwiseAngle: P.getClockwiseAngle,
  intersectInteriorQRev2: P.intersectInteriorQRev2, angleSortCond: P.angleSortCond,
  distSortCond: P.distSortCond, testpoint: P.testpoint, visiblePolys: P.visiblePolys,
  visBiLineRev2: P.visBiLineRev2, biTangents2polyRev1: P.biTangents2polyRev1,
  ConvexMinkowskiSumRev3: P.ConvexMinkowskiSumRev3, centroidOfPoly: P.centroidOfPoly,
  areaOfPoly: P.areaOfPoly, linelineInt: P.linelineInt, discretizeLineRev1: P.discretizeLineRev1,
  // built-ins as the port computes them
  ArcTan: (x, y) => arcTanExact(x, y),
};
export const DEFAULT_TRACE_FUNCTIONS = ['reflex', 'biTangent', 'glancingBlow', 'LineIntersectionPoint',
  'SegmentIntersectionQ', 'getAngle', 'pointOnSegmentQ', 'getClockwiseAngle', 'intersectInteriorQRev2',
  'angleSortCond', 'distSortCond', 'testpoint', 'visiblePolys', 'visBiLineRev2', 'biTangents2polyRev1'];
export const DEFAULT_TRACE_SYSTEM = ['Det', 'VectorAngle', 'Norm', 'ArcTan', 'EuclideanDistance'];

const same = (a, b) => {
  if (Array.isArray(a)) return Array.isArray(b) && a.length === b.length && a.every((v, i) => same(v, b[i]));
  return a === b; // 0 === -0; NaN never equal
};
const isWL = (v) => typeof v === 'string' && v.startsWith('WL:');

/** Replay user-function records through the port. Returns per-function stats + first mismatches. */
export function replayPort(records, maxExamples = 5) {
  const stats = {};
  records.forEach(([name, args, result], idx) => {
    const st = (stats[name] ??= { calls: 0, compared: 0, mismatches: 0, skipped: 0, firstIndex: null, examples: [] });
    st.calls++;
    const f = PORT_FUNCTIONS[name];
    if (!f || isWL(result) || (Array.isArray(args) && JSON.stringify(args).includes('"WL:'))) { st.skipped++; return; }
    let port;
    try { port = f(...args); } catch (e) { port = `exception: ${e.message}`; }
    st.compared++;
    if (!same(result, port)) {
      st.mismatches++;
      if (st.firstIndex === null) st.firstIndex = idx;
      if (st.examples.length < maxExamples) st.examples.push({ idx, args, original: result, port });
    }
  });
  return stats;
}

/** Score candidate implementations of built-ins against recorded (or probed) calls. */
export function scoreCandidates(name, calls, maxExamples = 3) {
  const make = CANDIDATES[name];
  if (!make) return null;
  const score = {};
  for (const [args, result] of calls) {
    if (typeof result !== 'number') continue;
    const outs = make(args);
    for (const [k, v] of Object.entries(outs)) {
      const sc = (score[k] ??= { compared: 0, mismatches: 0, examples: [] });
      sc.compared++;
      if (v !== result && !(v === 0 && result === 0)) {
        sc.mismatches++;
        if (sc.examples.length < maxExamples) sc.examples.push({ args, original: result, candidate: v });
      }
    }
  }
  return score;
}

const fmt = (v) => JSON.stringify(v, (k, x) => (typeof x === 'number' ? Number(x.toPrecision(17)) : x));

/** Markdown section for one traced scene. */
export function traceMarkdown(id, records) {
  const md = [`### Scene ${id}: ${records.length} distinct recorded calls`, ''];
  const stats = replayPort(records);
  const rows = Object.entries(stats).sort((a, b) => (a[1].firstIndex ?? 1e12) - (b[1].firstIndex ?? 1e12));
  md.push('Original functions replayed through the port (same arguments, exact comparison). The function with the', 'EARLIEST first mismatch is usually the root cause; later ones inherit it.', '');
  md.push('| function | calls | compared | mismatches | first mismatch at call # |', '|---|---|---|---|---|');
  for (const [n, s] of rows) md.push(`| ${n} | ${s.calls} | ${s.compared} | ${s.mismatches} | ${s.firstIndex ?? '—'} |`);
  md.push('');
  for (const [n, s] of rows.filter(([, s]) => s.mismatches)) {
    md.push(`Examples for \`${n}\`:`, '');
    for (const e of s.examples) md.push(`- call #${e.idx}: args \`${fmt(e.args)}\` → original \`${fmt(e.original)}\`, port \`${fmt(e.port)}\``);
    md.push('');
  }
  const sys = {};
  for (const [name, args, result] of records) if (CANDIDATES[name]) (sys[name] ??= []).push([args, result]);
  for (const [name, calls] of Object.entries(sys)) md.push(...candidateMarkdown(`${name} (calls inside this scene)`, name, calls));
  return { md, stats };
}

export function candidateMarkdown(title, name, calls) {
  const score = scoreCandidates(name, calls);
  if (!score) return [];
  const md = [`#### ${title}: ${calls.length} calls`, '', '| candidate formula | compared | mismatches |', '|---|---|---|'];
  const entries = Object.entries(score).sort((a, b) => a[1].mismatches - b[1].mismatches);
  for (const [k, s] of entries) md.push(`| ${k} | ${s.compared} | ${s.mismatches} |`);
  md.push('');
  const worst = entries.filter(([, s]) => s.mismatches).slice(0, 2);
  for (const [k, s] of worst) for (const e of s.examples.slice(0, 2)) md.push(`- ${k}: args \`${fmt(e.args)}\` → Mathematica \`${fmt(e.original)}\`, candidate \`${fmt(e.candidate)}\``);
  md.push('');
  return md;
}
