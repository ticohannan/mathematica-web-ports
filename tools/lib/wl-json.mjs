// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tools/lib/wl-json.mjs — read the fixtures written by `python tools/extract_state.py --snapshots`
// (tests/golden/<dir>.original-states.json; format in docs/TESTING.md):
//   states[0]      live state of the Manipulate output cell
//   specs          initial settings (the Manipulate's stored "Variables")
//   snapshots[k]   Settings stored with snapshot cell k (k = 1, 2, … = picture docs/original-snapshots/<dir>-k.png)
// A JSON integer is an exact Wolfram integer, a JSON number with a decimal point or exponent a machine real (bit-exact);
// other exact numbers are {wl, n} objects: wl a Wolfram-readable form (not necessarily InputForm, so compare exact values
// by value), n its double, absent when there is none (Infinity; integers above 2^53 - 1 are {wl: digits}). Fixtures
// written before the harness encoding call the double `value`; both are read.
import fs from 'node:fs';

/** true for an exact-number object {wl, n} (or the older {wl, value}) */
export const isExact = (v) => v !== null && typeof v === 'object' && !Array.isArray(v) && typeof v.wl === 'string'
  && Object.keys(v).every((k) => k === 'wl' || k === 'n' || k === 'value');
/** the double of an exact-number object, or null when it has none */
export const exactDouble = (v) => (typeof v.n === 'number' ? v.n : typeof v.value === 'number' ? v.value : null);

/**
 * Deep copy with every exact-number object replaced: by its double (`n`), by `infinity` for Infinity, by the
 * nearest double for a big integer {wl: digits}. Options: `exact(obj, path)` may return a replacement for an exact object first (undefined = default).
 */
export function plain(v, { infinity = Infinity, exact } = {}, path = []) {
  if (Array.isArray(v)) return v.map((x, i) => plain(x, { infinity, exact }, [...path, i]));
  if (isExact(v)) {
    if (exact) { const r = exact(v, path); if (r !== undefined) return r; }
    const d = exactDouble(v);
    if (d === null) {
      if (v.wl === 'Infinity') return infinity;
      if (v.wl === '-Infinity') return typeof infinity === 'number' ? -infinity : `-${infinity}`;
      if (/^-?\d+$/.test(v.wl)) return Number(BigInt(v.wl));
      throw new Error(`no double for ${v.wl} at ${path.join('.')}`);
    }
    return d;
  }
  if (v !== null && typeof v === 'object') {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, plain(x, { infinity, exact }, [...path, k])]));
  }
  return v;
}

/** Paths (arrays of keys) of every exact-number object in v */
export function exactPaths(v, path = [], out = []) {
  if (isExact(v)) out.push(path);
  else if (Array.isArray(v)) v.forEach((x, i) => exactPaths(x, [...path, i], out));
  else if (v !== null && typeof v === 'object') for (const [k, x] of Object.entries(v)) exactPaths(x, [...path, k], out);
  return out;
}

/**
 * Read a fixture. Returns { raw, live, specs, snapshots, count, cellIds }: `snapshots[k - 1]` is snapshot k
 * (the raw JSON values, exact objects included; use plain() for doubles).
 */
export function loadStates(file) {
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  const keys = Object.keys(raw.snapshots).map(Number).sort((a, b) => a - b);
  keys.forEach((k, i) => { if (k !== i + 1) throw new Error(`${file}: snapshot keys must be 1..n`); });
  return {
    raw,
    live: raw.states[0],
    specs: raw.specs,
    snapshots: keys.map((k) => raw.snapshots[k]),
    count: keys.length,
    cellIds: keys.map((k) => raw.snapshotCellIds[k]),
  };
}

/**
 * Whether a number in the fixture TEXT was written as an exact integer (no decimal point, no exponent): JSON.parse
 * gives the same double for 2 and 2.0, Wolfram does not. `pointer` lists the keys from the fixture's top level,
 * e.g. ['snapshots', '2', 'locs', 1, 0]. Needs JSON.parse source text access (Node 21+).
 */
export function isIntegerLiteral(text, pointer) {
  const src = JSON.parse(text, (key, value, context) => {
    if (typeof value !== 'number') return value;
    if (!context || typeof context.source !== 'string') throw new Error('JSON.parse source text access needed (Node 21+)');
    return { literal: context.source };
  });
  let v = src;
  for (const k of pointer) v = v[k];
  if (!v || typeof v.literal !== 'string') throw new Error(`not a number at ${pointer.join('.')}`);
  return /^-?\d+$/.test(v.literal);
}
