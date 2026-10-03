#!/usr/bin/env node
// tools/explore-motion.mjs — randomized differential testing of the motion-planning port.
//
// Generates reproducible random scenes (seeded), runs the port (planner.js)
// and the independent reference planner (tests/support/reference-planner.js),
// and reports every disagreement with a link that opens the exact scene in
// the browser demo. This is an INVESTIGATION tool, not a pass/fail test:
// disagreements may be faults in the port, faults inherited from the original
// algorithm, or limitations of the (sampling-based) reference. Each one must be
// looked at by a person before it is called a fault.
//
// Usage:  node tools/explore-motion.mjs [count=200] [seed=1] [--base=http://127.0.0.1:8080] [--uniform]
//   default sampling: valid start/goal, direct line usually blocked (exercises the planner);
//   --uniform: start/goal anywhere (also exercises the invalid-position handling).
// Output: test-output/explore-motion.json and test-output/explore-motion.md

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeScene, pathLength, LOCATOR_RANGES } from '../demos/motion-planning/planner.js';
import { referencePlan, convexOverlap, strictlyInsideConvex } from '../tests/support/reference-planner.js';

function segmentHitsInterior(p, q, poly) {
  for (let j = 1; j < 200; j++) {
    const t = j / 200;
    if (strictlyInsideConvex([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t], poly)) return true;
  }
  return false;
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const count = Number(args.find((a) => /^\d+$/.test(a)) ?? 200);
const seed = Number(args.filter((a) => /^\d+$/.test(a))[1] ?? 1);
const base = (args.find((a) => a.startsWith('--base=')) ?? '--base=http://127.0.0.1:8080').slice(7);
const uniform = args.includes('--uniform'); // plain uniform sampling (mostly invalid start/goal)

let s = seed >>> 0 || 1;
const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const inRange = (name) => {
  const [[x0, y0], [x1, y1]] = LOCATOR_RANGES[name];
  return [Number((x0 + rand() * (x1 - x0)).toFixed(2)), Number((y0 + rand() * (y1 - y0)).toFixed(2))];
};
const fmtP = (p) => `${p[0]},${p[1]}`;
export const sceneUrl = (st) => `${base}/demos/motion-planning/?r1=${fmtP(st.r1)}&r2=${fmtP(st.r2)}&o1=${fmtP(st.o1)}&o2=${fmtP(st.o2)}&o3=${fmtP(st.o3)}&o4=${fmtP(st.o4)}&n=${st.n}&x=${st.x}`;

const findings = [];
const stats = { scenes: 0, agree: 0, overlappingScenes: 0, bothEndsValid: 0, portPathFound: 0, graphSearchUsed: 0, byKind: {} };
const t0 = Date.now();

for (let i = 0; i < count; i++) {
  const st = { configOrWork: 'workspace', s: 1, x: pick([3, 4, 5]), n: pick([3, 4, 5]),
    r1: inRange('r1'), r2: inRange('r2'), o1: inRange('o1'), o2: inRange('o2'), o3: inRange('o3'), o4: inRange('o4') };
  if (!uniform) {
    // Rejection-sample start/goal so that both are valid and (mostly) the direct
    // line is blocked: exercises the visibility graph + A* code paths.
    const wantBlocked = rand() < 0.85;
    for (let tries = 0; tries < 400; tries++) {
      const probe = referencePlan({ ...st });
      if (probe.startOk && probe.goalOk) {
        const blocked = probe.cobstacles.some((c) => segmentHitsInterior(st.r1, st.r2, c));
        if (!wantBlocked || blocked) break;
      }
      st.r1 = inRange('r1'); st.r2 = inRange('r2');
    }
  }
  stats.scenes++;
  let port, ref;
  try { port = computeScene(st); } catch (e) { record('port-exception', st, String(e)); continue; }
  ref = referencePlan(st);
  const overlapping = ref.cobstacles.some((a, ia) => ref.cobstacles.some((b, ib) => ib > ia && convexOverlap(a, b)));
  if (overlapping) stats.overlappingScenes++;
  const portValid = [!port.robotinsideobstcond[0], !port.robotinsideobstcond[1]];
  const kinds = [];
  if (portValid[0] !== ref.startOk) kinds.push('start-validity-differs');
  if (portValid[1] !== ref.goalOk) kinds.push('goal-validity-differs');
  const portLen = port.path.length ? pathLength(port.path) : Infinity;
  if (ref.startOk && ref.goalOk) stats.bothEndsValid++;
  if (port.path.length) stats.portPathFound++;
  if (port.graph) stats.graphSearchUsed++;
  if (port.path.length) {
    // every sample along the port's path must be a free configuration (independent check)
    let bad = null;
    for (let k = 0; k + 1 < port.path.length && !bad; k++) {
      const [p, q] = [port.path[k], port.path[k + 1]];
      const n = Math.max(2, Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1]) / 0.01));
      for (let j = 1; j < n; j++) {
        const pt = [p[0] + ((q[0] - p[0]) * j) / n, p[1] + ((q[1] - p[1]) * j) / n];
        if (!ref.freePoint(pt)) { bad = pt; break; }
      }
    }
    if (bad) kinds.push('port-path-collides');
    const ends = port.path[0], ende = port.path[port.path.length - 1];
    if (ends[0] !== st.r1[0] || ends[1] !== st.r1[1] || ende[0] !== st.r2[0] || ende[1] !== st.r2[1]) kinds.push('path-endpoints-wrong');
  }
  if (ref.startOk && ref.goalOk) {
    if (!port.path.length && ref.length < Infinity) kinds.push('port-finds-no-path-but-one-exists');
    if (port.path.length && ref.length === Infinity) kinds.push('port-path-where-reference-finds-none');
    if (port.path.length && ref.length < Infinity && portLen > ref.length + 1e-6) kinds.push('port-path-longer-than-shortest');
    if (port.path.length && ref.length < Infinity && portLen < ref.length - 1e-6) kinds.push('port-path-shorter-than-reference');
  }
  if (kinds.length === 0) { stats.agree++; continue; }
  for (const k of kinds) record(k, st, { portLength: portLen, referenceLength: ref.length, overlapping, portPath: port.path, referencePath: ref.path });
}

function record(kind, st, detail) {
  stats.byKind[kind] = (stats.byKind[kind] ?? 0) + 1;
  findings.push({ kind, url: sceneUrl(st), state: st, detail });
}

const outDir = path.join(root, 'test-output');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'explore-motion.json'), JSON.stringify({ seed, count, stats, findings }, null, 1));
const md = [
  `# Motion-planning exploration (seed ${seed}, ${count} random scenes)`,
  '',
  `Generated ${new Date().toISOString()} in ${((Date.now() - t0) / 1000).toFixed(1)} s.`,
  '',
  'Each row is a DISAGREEMENT between the port and the independent reference planner. It is a lead to investigate, not a confirmed fault.',
  '',
  `- scenes: ${stats.scenes}, full agreement: ${stats.agree}, scenes with overlapping C-obstacles: ${stats.overlappingScenes}`,
  `- both ends valid (reference): ${stats.bothEndsValid}, port found a path: ${stats.portPathFound}, port needed graph search (direct line blocked): ${stats.graphSearchUsed}`,
  ...Object.entries(stats.byKind).map(([k, v]) => `- ${k}: ${v}`),
  '',
  '| # | kind | port length | reference length | overlapping C-obstacles | open in browser |',
  '|---|------|-------------|------------------|--------------------------|-----------------|',
  ...findings.map((f, i) => `| ${i + 1} | ${f.kind} | ${f.detail?.portLength?.toFixed?.(4) ?? '-'} | ${f.detail?.referenceLength?.toFixed?.(4) ?? '-'} | ${f.detail?.overlapping ?? '-'} | [scene](${f.url}) |`),
].join('\n');
fs.writeFileSync(path.join(outDir, 'explore-motion.md'), md);
console.log(md.split('\n').slice(0, 12).join('\n'));
console.log(`\nFull report: test-output/explore-motion.md`);
