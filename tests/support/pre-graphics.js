// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/support/pre-graphics.js — compare a model's Graphics data with the drawing output frozen before the model
// returned its picture itself (tests/unit/fixtures/<app>-drawing.pre-graphics.json, v0.1.21, owner decision D2).
//
//   const fx = preGraphics('camera-lasers');            // { about, states: [{ name, steps, graphics, state, model? }] }
//   const { replaced } = sameDrawing(newGraphics, fx.states[0].graphics);   // throws on any other difference
//
// The fixtures hold window.__demo.graphics(k) of the old page: JSON (functions dropped, cachedGraphics parts expanded
// into "thunk", Raw parts as {"head":"Raw"}). graphicsJSON() turns new Graphics data into the same form.
import fs from 'node:fs';
import { expect } from 'vitest';

export const preGraphics = (app) => JSON.parse(fs.readFileSync(`tests/unit/fixtures/${app}-drawing.pre-graphics.json`, 'utf8'));

/** Graphics data as the old page's hook copied it: JSON, cached parts expanded, Raw closures dropped, ±Infinity as text. */
export const graphicsJSON = (g) => JSON.parse(JSON.stringify(g, (k, v) => (typeof v === 'function' ? (v.length === 0 ? v() : undefined)
  : v === Infinity ? 'Infinity' : v === -Infinity ? '-Infinity' : v)));

// what shared/graphics.js walk() skips in a list (`cond && x` leftovers; JSON writes undefined as null)
const drop = (x) => x === null || x === false;
const norm = (x) => (Array.isArray(x) ? x.filter((y) => !drop(y)).map(norm)
  : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, norm(v)])) : x);

/**
 * Assert that new Graphics data equal the frozen old drawing data exactly (same structure, same numbers bit for bit),
 * except where the old data had a Raw part: any data may stand there (the replacement is returned, so the test can
 * name what replaced each Raw). Items that walk() skips (null, false) are ignored on both sides.
 */
export function sameDrawing(neu, old, label = '') {
  const n = norm(graphicsJSON(neu)), replaced = [];
  const sub = (o, x) => {
    if (o && o.head === 'Raw') { replaced.push(x); return x; }
    if (Array.isArray(o)) return Array.isArray(x) && x.length === o.length ? o.map((y, i) => sub(y, x[i])) : o;
    if (o && typeof o === 'object') return x && typeof x === 'object' ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, sub(v, x[k])])) : o;
    return o;
  };
  expect(n, label).toEqual(sub(norm(old), n));
  return { replaced };
}
