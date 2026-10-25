// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tests/support/harness-json.js — read Mathematica-harness golden data in a port's golden tests (HW-47, HW-65…HW-67).
//
//   const h = harnessCase('rrt', 'H-RT-04');          // { status: 'ok' | 'skip' | 'stale', reason, scenario, record, file }
//   if (h.status !== 'ok') return ctx.skip(h.reason);
//   const verts = captureOf(h.record, 'verts');        // lexical JSON value (numbers keep 1.0 vs 1)
//   expect(sameDouble(exactDouble(verts[3][0][0]), port.verts[3][0][0])).toBe(true);
//
// The golden file tests/golden/<dir>.harness.json (or .json.gz) is written by `npm run harness -- <dir> --accept`.
// It is read with the lexical reader (tools/lib/json-lexical.mjs): a machine real stays distinguishable from an exact
// integer, so `2.0` (Mathematica 2.) and `2` (Mathematica 2) never compare equal by accident.

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { parseLexical, LexNumber, isLexReal, isLexInteger } from '../../tools/lib/json-lexical.mjs';
import { scenarioSha256 } from '../../tools/harness/scenario-schema.mjs';

export const NO_DATA = 'no harness data (owner run pending)';
const cache = new Map();

/** Parsed golden file of an app, or null. opts.root = repository root (default: cwd), opts.file = explicit path. */
export function loadHarnessGolden(dir, { root = '.', file = null } = {}) {
  const p = file ?? path.join(root, 'tests', 'golden', `${dir}.harness.json`);
  if (cache.has(p)) return cache.get(p);
  let text = null;
  if (fs.existsSync(p)) text = fs.readFileSync(p, 'utf8');
  else if (fs.existsSync(`${p}.gz`)) text = zlib.gunzipSync(fs.readFileSync(`${p}.gz`)).toString('utf8');
  const v = text == null ? null : parseLexical(text);
  cache.set(p, v);
  return v;
}
/** The committed scenario file tests/harness/<dir>.scenarios.json (lexical). */
export function loadScenarioFile(dir, { root = '.', file = null } = {}) {
  const p = file ?? path.join(root, 'tests', 'harness', `${dir}.scenarios.json`);
  return parseLexical(fs.readFileSync(p, 'utf8'));
}

/**
 * Everything a golden test needs for one scenario: its inputs, its recorded result and whether the result is usable.
 * status 'skip' (no data yet, HW-67), 'stale' (the scenario changed since the run: "rerun H-XX-nn"), 'failed' (the
 * harness recorded a status other than ok), 'ok'.
 */
export function harnessCase(dir, id, opts = {}) {
  const file = opts.scenarioFile ?? loadScenarioFile(dir, opts);
  const scenario = file.scenarios.find((s) => s.id === id);
  if (!scenario) throw new Error(`${id} is not in tests/harness/${dir}.scenarios.json`);
  const golden = opts.golden ?? loadHarnessGolden(dir, opts);
  if (!golden) return { status: 'skip', reason: NO_DATA, scenario, file };
  const record = (golden.scenarios ?? []).find((r) => r.id === id);
  if (!record) return { status: 'skip', reason: `${NO_DATA}: ${id} not in the golden file`, scenario, file, golden };
  if (record.scenarioSha256 && record.scenarioSha256 !== scenarioSha256(file, scenario)) {
    return { status: 'stale', reason: `rerun ${id} (the scenario changed since the harness run)`, scenario, file, golden, record };
  }
  if (record.status !== 'ok') return { status: 'failed', reason: `${id}: harness status ${record.status}: ${(record.notes ?? []).join('; ')}`, scenario, file, golden, record };
  return { status: 'ok', reason: null, scenario, file, golden, record, version: golden.wolframVersion };
}

/** Step record (1-based step number). */
export function stepRecord(record, step) {
  const s = (record.steps ?? [])[step - 1];
  if (!s) throw new Error(`${record.id}: no step ${step}`);
  return s;
}
/** A capture after the last step, or after step n with { step: n } (captureEachStep scenarios, HW-66). */
export function captureOf(record, name, { step = null } = {}) {
  const caps = step == null ? record.capture : stepRecord(record, step).capture;
  if (!caps || !(name in caps)) throw new Error(`${record.id}: no capture "${name}"${step == null ? '' : ` at step ${step}`}`);
  return caps[name];
}
/** Recorded random draws ($RandomDraws capture, or all draws of the scenario's steps). */
export function randomDraws(record) {
  if (record.capture && '$RandomDraws' in record.capture) return record.capture.$RandomDraws;
  return (record.steps ?? []).flatMap((s) => s.randomDrawRecords ?? []);
}

// ---------------------------------------------------------------- values (HW-45 encoding)
export const isMachineReal = (v) => isLexReal(v);
// Exact numbers are {"wl": <a Wolfram-readable form, e.g. "1/2", "-13*Pi/16">, "n": <its double>}; older fixtures
// call the double "value" — both are accepted. Integers are plain JSON integers while |x| <= 2^53 - 1
// (Number.isSafeInteger), larger ones {"wl": "<digits>"} without a double.
const numKey = (v) => ('n' in v ? 'n' : 'value' in v ? 'value' : null);
export const isExact = (v) => v !== null && typeof v === 'object' && !(v instanceof LexNumber) && !Array.isArray(v) && typeof v.wl === 'string';
export const isInteger = (v) => isLexInteger(v) || (isExact(v) && /^-?\d+$/.test(v.wl) && numKey(v) === null);
export const isNotEvaluated = (v) => v !== null && typeof v === 'object' && (v.notEvaluated === true || v.notReached === true);
/**
 * True when capture `name` of a record is a Body local that was never assigned: HW-45 writes an unassigned Module
 * local as JSON null (mp-original rule). JSON null is also Mathematica's Null, so the capture must resolve to a local
 * (record.resolved[name].kind === 'local'); for a Manipulate variable or global, null stays Null and this is false.
 */
export function isUnassignedLocal(record, name, { step = null } = {}) {
  const r = record.resolved && record.resolved[name];
  return !!r && r.kind === 'local' && captureOf(record, name, { step }) === null;
}

/** The double of a machine real, or of an exact value's "n"/"value" (e.g. {"wl":"Pi/2","n":1.5707963267948966}). */
export function exactDouble(v) {
  if (v instanceof LexNumber) return v.value;
  if (typeof v === 'number') return v;
  if (isExact(v) && numKey(v)) return exactDouble(v[numKey(v)]);
  if (isInteger(v)) return Number(BigInt(v.wl));
  throw new Error(`not a number: ${JSON.stringify(v)}`);
}
/**
 * Two recorded values equal BY VALUE (not by text): numbers and exact numbers by their double (exact values without a
 * double, i.e. big integers, by their digits), lists and objects element by element ("wl" texts are not compared).
 */
export function sameValue(a, b) {
  const isNum = (v) => v instanceof LexNumber || typeof v === 'number' || (isExact(v) && (numKey(v) || isInteger(v)));
  if (isNum(a) && isNum(b)) {
    if (isInteger(a) && isInteger(b) && !(a instanceof LexNumber && b instanceof LexNumber)) return intOf(a) === intOf(b);
    return sameDouble(exactDouble(a), exactDouble(b));
  }
  if (Array.isArray(a) || Array.isArray(b)) return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => sameValue(x, b[i]));
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const ka = Object.keys(a), kb = Object.keys(b);
    return ka.length === kb.length && ka.every((k) => k in b && sameValue(a[k], b[k]));
  }
  return a === b;
}
/** A machine real as a JS double; throws for exact numbers (use exactDouble when an exact value is acceptable). */
export function realOf(v) {
  if (!isLexReal(v)) throw new Error(`expected a machine real, got ${v instanceof LexNumber ? `the integer ${v.text}` : JSON.stringify(v)}`);
  return v.value;
}
/** An exact integer as BigInt (also the {"wl":"<digits>"} form of large integers). */
export function intOf(v) {
  if (isLexInteger(v)) return v.bigint;
  if (isInteger(v)) return BigInt(v.wl);
  throw new Error(`expected an exact integer, got ${v instanceof LexNumber ? `the real ${v.text}` : JSON.stringify(v)}`);
}
/** Bit-exact equality of doubles (Object.is, but 0 and -0 equal: Mathematica has no signed zero). */
export const sameDouble = (a, b) => Object.is(a, b) || (a === 0 && b === 0);

/** Lexical value -> plain JS: reals and integers -> numbers, exact values -> their double, others unchanged. */
export function toJS(v) {
  if (v instanceof LexNumber) return v.value;
  if (Array.isArray(v)) return v.map(toJS);
  if (isExact(v) && numKey(v)) return toJS(v[numKey(v)]);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, toJS(x)]));
  return v;
}
/**
 * Numeric symbols and exact infinities as doubles (HW-45 writes a bare symbol as {"sym": "Pi"} and Infinity as
 * {"wl": "Infinity"} without "n"). Added for harness run 2 (Circle[{r, 0}, r, {Pi, …}] in dubins-isochrons).
 */
export const NUMERIC_SYMBOLS = Object.freeze({ Pi: Math.PI, E: Math.E, Degree: Math.PI / 180, GoldenRatio: (1 + Math.sqrt(5)) / 2, EulerGamma: 0.5772156649015329, Catalan: 0.915965594177219, Infinity: Infinity });
const WL_INFINITY = Object.freeze({ Infinity: Infinity, '-Infinity': -Infinity, 'DirectedInfinity[1]': Infinity, 'DirectedInfinity[-1]': -Infinity });
/** true for {"sym": S} with S a key of NUMERIC_SYMBOLS, or an exact ±Infinity */
export const isNumericSymbol = (v) => v !== null && typeof v === 'object' && !(v instanceof LexNumber) && !Array.isArray(v)
  && ((typeof v.sym === 'string' && Object.hasOwn(NUMERIC_SYMBOLS, v.sym)) || (isExact(v) && numKey(v) === null && Object.hasOwn(WL_INFINITY, v.wl)));
/** toJS, and in addition numeric symbols and exact infinities as doubles (isNumericSymbol); other values as toJS. */
export function toJSNumeric(v) {
  if (isNumericSymbol(v)) return typeof v.sym === 'string' ? NUMERIC_SYMBOLS[v.sym] : WL_INFINITY[v.wl];
  if (v instanceof LexNumber || isExact(v)) return toJS(v);
  if (Array.isArray(v)) return v.map(toJSNumeric);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, toJSNumeric(x)]));
  return v;
}
/** Deep bit-exact comparison of a recorded value with a JS value (numbers by sameDouble). Returns the first difference or null. */
export function firstDifference(recorded, actual, where = '') {
  if (recorded instanceof LexNumber || isExact(recorded)) {
    if (actual !== null && typeof actual === 'object') return sameValue(recorded, actual) ? null : `${where || '.'}: ${JSON.stringify(toJS(recorded))} vs ${JSON.stringify(toJS(actual))}`;
    if (typeof actual !== 'number') return `${where || '.'}: expected a number, got ${JSON.stringify(actual)}`;
    const e = exactDouble(recorded);
    return sameDouble(e, actual) ? null : `${where || '.'}: ${e} (recorded) vs ${actual}`;
  }
  if (Array.isArray(recorded)) {
    if (!Array.isArray(actual) || actual.length !== recorded.length) return `${where || '.'}: length ${recorded.length} vs ${Array.isArray(actual) ? actual.length : 'not an array'}`;
    for (let i = 0; i < recorded.length; i++) { const d = firstDifference(recorded[i], actual[i], `${where}[${i}]`); if (d) return d; }
    return null;
  }
  if (recorded !== null && typeof recorded === 'object') {
    for (const k of Object.keys(recorded)) { const d = firstDifference(recorded[k], actual?.[k], `${where}.${k}`); if (d) return d; }
    return null;
  }
  return recorded === actual ? null : `${where || '.'}: ${JSON.stringify(recorded)} vs ${JSON.stringify(actual)}`;
}

/**
 * HW-45 compound expressions {"h": head, "a": [args]} (harness records) → the {head, args} form of the
 * original-states fixtures (tools/extract_state.py), recursively, so one reader serves both. Numbers and exact values
 * are converted as toJS does (machine/exact distinction lost); {"sym": …} and strings stay as they are.
 */
export function asHeadArgs(v) {
  if (Array.isArray(v)) return v.map(asHeadArgs);
  if (v && typeof v === 'object' && !(v instanceof LexNumber) && !isExact(v) && typeof v.h !== 'undefined' && Array.isArray(v.a) && Object.keys(v).length === 2) {
    return { head: asHeadArgs(v.h), args: v.a.map(asHeadArgs) };
  }
  if (v && typeof v === 'object' && !(v instanceof LexNumber) && !isExact(v)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, asHeadArgs(x)]));
  return toJS(v);
}

/**
 * Every compound expression {"h", "a"} with a head in `heads` inside a recorded value (e.g. a %g3d graphic), depth
 * first in expression order, not descending into a match: findHeads(g, ['Cuboid', 'Cylinder']). Values stay lexical.
 */
export function findHeads(v, heads, out = []) {
  const set = heads instanceof Set ? heads : new Set(heads);
  if (Array.isArray(v)) { for (const x of v) findHeads(x, set, out); return out; }
  if (v && typeof v === 'object' && !(v instanceof LexNumber) && typeof v.h === 'string' && Array.isArray(v.a)) {
    if (set.has(v.h)) out.push(v);
    else for (const x of v.a) findHeads(x, set, out);
  }
  return out;
}

// ---------------------------------------------------------------- graphics primitives (HW-45 %g3d against g3d.js)
// g3dPrimitiveDifferences(recordedGraphicOrList, portContent) -> {counts, differences}: compares, in expression order,
// Cuboid corners, Cylinder end points and radius, Line point lists (a recorded Line of several polylines counts as
// that many) with a port content tree built with shared/graphics3d.js (untransformed, as the record holds them inside
// GeometricTransformation/Rotate), by value bit for bit (exact recorded numbers by their double). Rotate angles and
// directives are not compared. portPrimitives(content) lists the port's cuboid/cylinder/line primitives.
const G3D_HEADS = ['Cuboid', 'Cylinder', 'Line'];
const G3D_PORT = { cuboid: 'Cuboid', cylinder: 'Cylinder', line: 'Line' };

/** the port's cuboid/cylinder/line primitives of a g3d.js content tree, g3dDepth first, untransformed */
export function portPrimitives(g, out = []) {
  if (Array.isArray(g)) { for (const x of g) portPrimitives(x, out); return out; }
  if (g && typeof g === 'object') {
    if (g.prim && G3D_PORT[g.prim]) out.push(g);
    else if (g.content !== undefined) portPrimitives(g.content, out);
  }
  return out;
}

const g3dArgsOf = (p) => (p.prim === 'cuboid' ? [p.min, p.max] : p.prim === 'cylinder' ? [[p.p1, p.p2], p.radius] : [p.points]);
const g3dDepth = (v) => (Array.isArray(v) ? 1 + g3dDepth(v[0]) : 0);
/**
 * Line primitives as a list of polylines: a recorded Line[{{p, q}, {p, q}, …}] (several lines in one primitive) is
 * split into its polylines, so that it compares with the port's one Line per polyline.
 */
function g3dLineParts(list, recorded) {
  return list.flatMap((p) => {
    const pts = recorded ? p.a[0] : p.points;
    return g3dDepth(pts) === 3 ? pts.map((x) => ({ pts: x })) : [{ pts }];
  });
}

/** {counts, differences}: differences lists "Cuboid #k: recorded … vs port …" for every primitive that differs */
export function g3dPrimitiveDifferences(recorded, portContent) {
  const rec = findHeads(recorded, G3D_HEADS);
  const port = portPrimitives(portContent);
  const recLines = g3dLineParts(rec.filter((p) => p.h === 'Line'), true), portLines = g3dLineParts(port.filter((p) => p.prim === 'line'), false);
  const count = (list, f, lines) => ({ ...Object.fromEntries(G3D_HEADS.map((h) => [h, list.filter((p) => f(p) === h).length])), Line: lines.length });
  const counts = { recorded: count(rec, (p) => p.h, recLines), port: count(port, (p) => G3D_PORT[p.prim], portLines) };
  const differences = [];
  if (JSON.stringify(counts.recorded) !== JSON.stringify(counts.port)) differences.push(`counts (Line = polylines) ${JSON.stringify(counts.recorded)} vs ${JSON.stringify(counts.port)}`);
  recLines.forEach((l, k) => {
    if (portLines[k] && !sameValue(l.pts, portLines[k].pts)) differences.push(`Line #${k + 1}: recorded ${JSON.stringify(toJS(l.pts))} vs port ${JSON.stringify(portLines[k].pts)}`);
  });
  for (const h of ['Cuboid', 'Cylinder']) {
    const r = rec.filter((p) => p.h === h), q = port.filter((p) => G3D_PORT[p.prim] === h);
    r.forEach((p, k) => {
      if (!q[k]) return;
      const a = p.a.slice(0, h === 'Cylinder' ? 2 : h === 'Cuboid' ? 2 : 1), b = g3dArgsOf(q[k]);
      if (h === 'Cylinder' && a.length === 1) a.push(1); // Cylinder[{p, q}] = radius 1
      if (!sameValue(a, b)) differences.push(`${h} #${k + 1}: recorded ${JSON.stringify(toJS(a))} vs port ${JSON.stringify(b)}`);
    });
  }
  return { counts, differences };
}

// ---------------------------------------------------------------- numeric constants encoded as symbols (run 2)
// HW-45 encodes a bare exact constant such as `Pi` as a Symbol ({"sym": "Pi"}), not as {"wl", "n"} (that form is only
// for compound exact numbers like Pi/2). NUMERIC_SYMBOLS lists the constants and their doubles (N[c] in 15.0.1);
// exactSymbols(v) returns a copy of a recorded value with each of them replaced by the exact-number form
// {"wl": "Pi", "n": 3.141592653589793}, so the other helpers (exactDouble, sameValue, toJS, firstDifference) compare
// them by value. Other symbols are left unchanged.
// NUMERIC_SYMBOLS: defined above (Pi, E, Degree, Infinity).
export function exactSymbols(v) {
  if (Array.isArray(v)) return v.map(exactSymbols);
  if (v === null || typeof v !== 'object' || v instanceof LexNumber) return v;
  const keys = Object.keys(v);
  if (keys.length === 1 && keys[0] === 'sym' && Object.hasOwn(NUMERIC_SYMBOLS, v.sym)) return { wl: v.sym, n: NUMERIC_SYMBOLS[v.sym] };
  return Object.fromEntries(keys.map((k) => [k, exactSymbols(v[k])]));
}

// ---------------------------------------------------------------- typeset strings (run 2)
// A string written in a notebook with the linear box syntax ("\!\(\*SuperscriptBox[\(RRT\), \(*\)]\)") holds, in the
// kernel, private-use characters instead of the escapes; the harness records the kernel string (RRT H-RT-06 inputEcho:
// \! = U+F7C1, \( = U+F7C9, \* = U+F7C8, \) = U+F7C0). kernelBoxString(s) turns the notebook spelling into the kernel
// string, so it compares with a recorded value.
const BOX_ESCAPES = { '!': '', '(': '', '*': '', ')': '' };
export const kernelBoxString = (s) => s.replace(/\\([!(*)])/g, (_, c) => BOX_ESCAPES[c]);

// ---------------------------------------------------------------- numeric symbols, plot ranges (harness run 2)
/** exactDouble, also for numeric symbols ({"sym":"Pi"} → Math.PI, see NUMERIC_SYMBOLS / isNumericSymbol above). */
export function numericDouble(v) {
  return isNumericSymbol(v) ? toJSNumeric(v) : exactDouble(v);
}
/**
 * The %plotRange capture (HW-50): one entry per graphic of %g/%g3d, {head, value, method, tried, storedOption}.
 * Returns [{head, value (plain JS numbers, or null when no method worked), method, stored (plain JS or undefined)}].
 */
export function plotRanges(rec) {
  return [].concat(rec).map((g) => ({ head: g.head, value: g.value == null ? null : toJS(g.value), method: g.method, stored: g.storedOption === undefined ? undefined : toJS(g.storedOption) }));
}
