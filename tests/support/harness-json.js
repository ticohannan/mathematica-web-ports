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
