// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// shared/manipulate.js — Mathematica's Manipulate for the browser: controls written as Manipulate control specs, the
// body re-evaluated after every change, the picture written as Graphics data (shared/graphics.js).
//
//   Manipulate({
//     name: 'my-demo',
//     body: (s) => Graphics([Red, Disk(s.p, s.r)], { PlotRange: [[-2, 2], [-2, 2]], ImageSize: 400 }),
//     controls: [
//       [['r', 1, Style('r', Italic)], 0.1, 2, 0.1, { Appearance: 'Labeled' }],
//       [['p', [0, 0]], [-2, -2], [2, 2], Locator],
//     ],
//   });
//
// What it does for you (each item is code every app of this repository used to write by hand):
//   * builds the controls (shared/ui.js) from Mathematica-style specs (table below) and keeps the Manipulate
//     variables in one `state` object; every control change re-evaluates the body and redraws;
//   * locators: draggable on the picture (shared/svg-plot.js addLocators), kept inside their range;
//   * ControlActive (when spec.ControlActive is true, i.e. the body uses ControlActive[]): `controlActive` is true while
//     a slider or locator is dragged with the mouse; on release the body is evaluated once more with false;
//   * the "Initial settings" button (an element with id `reset`, if the page has one);
//   * the test hook window.__demo (getState, setState, view, moveLocator, worldToClient, controlActive, ready) that
//     the browser tests and the Mathematica comparison use.
//
// Control specs (Manipulate's own forms; JS arrays for Mathematica lists):
//   [[name, init, label], min, max, step, opts]         slider (step omitted or 0: continuous)
//   [[name, init, label], [v1, v2, …], opts]            setter bar; a value may be Rule(value, label)
//   [[name, init], [xmin, ymin], [xmax, ymax], Locator, opts]   locator on the picture
//   [[name, init, label], [xmin, ymin], [xmax, ymax], opts]     2D slider
//   [[name, init], None] or [name, init, None]          a variable with no control (hidden state)
//   Delimiter, or a string (a heading)
//   {x, xmin, xmax, step} and {x, {v1, v2, …}}     short forms: the initial value is xmin, or v1
//   [[name, init], xmin, xmax, None] or { ControlType: None }   also hidden; [[p, p0], Locator] a locator with no range
// opts: { Appearance: 'Labeled' } shows the value field (default: none, as in Mathematica); { Appearance: None } on a
// locator draws no glyph (still draggable); Enabled: false (sliders, setter bars, 2D sliders); any lower-case key is
// passed to shared/ui.js unchanged
// (e.g. plus: false, format, parse, animSeconds). Labels may be strings or Style/Subscript expressions.
//
// The picture's options (PlotRange, ImageSize, Background) are read once, at the first evaluation.
// The body: body(state, { controlActive }) returns either a Graphics[…] or { state, view } (a model in the ports'
// style: the new Manipulate variables and the values to draw). In the second form pass draw(view, state) → Graphics
// list; the Graphics options then come from spec.graphics. Pure models stay testable in Node: only this file and
// the renderer touch the DOM.
//
// Mathematica slider semantics are the default: values min + k·step in machine arithmetic, the right end = max
// (shared/ui.js `steps: 'mma'`).

import { Controls } from './ui.js';
import { createPlot, addLocators, darkLocatorGlyph, locatorGlyph } from './svg-plot.js';
import { render, htmlOf, textOf } from './graphics.js';

/** Markers used in control specs. */
export const Locator = Object.freeze({ marker: 'Locator' });
export const Delimiter = Object.freeze({ marker: 'Delimiter' });
export { None } from './graphics.js';
/** Rule[value, label] for setter-bar values. */
export const Rule = (value, label) => Object.freeze({ rule: true, value, label });

const isPoint = (x) => Array.isArray(x) && x.length === 2 && x.every((v) => typeof v === 'number');
const isNone = (x) => x && x.dir === 'none';

/**
 * Parse one Manipulate control spec into a plain description (pure; unit-tested):
 *   { kind: 'slider' | 'setter' | 'locator' | 'slider2D' | 'hidden' | 'delimiter' | 'heading', name, init, label,
 *     min, max, step, values, opts }
 */
export function parseControl(spec) {
  if (spec === Delimiter) return { kind: 'delimiter' };
  if (typeof spec === 'string') return { kind: 'heading', label: spec };
  if (!Array.isArray(spec)) throw new Error(`Manipulate: not a control spec: ${JSON.stringify(spec)}`);
  // [name, init, None]
  if (typeof spec[0] === 'string' && isNone(spec[2])) return { kind: 'hidden', name: spec[0], init: spec[1] };
  // the short forms {x, xmin, xmax(, step)} and {x, {v1, v2, …}}: the initial value is xmin, or v1
  if (typeof spec[0] === 'string') {
    const [name, ...more] = spec;
    if (typeof more[0] === 'number') return parseControl([[name, more[0]], ...more]);
    if (Array.isArray(more[0]) && !isPoint(more[0])) { const v = more[0][0]; return parseControl([[name, v && v.rule ? v.value : v], ...more]); }
    if (isPoint(more[0])) return parseControl([[name, more[0]], ...more]);
    throw new Error(`Manipulate: unrecognised control spec for ${name}: ${JSON.stringify(spec)}`);
  }
  const [head, ...rest] = spec;
  if (!Array.isArray(head) || typeof head[0] !== 'string') throw new Error(`Manipulate: a control spec starts with [name, init, label]: ${JSON.stringify(spec)}`);
  const [name, init, label = name] = head;
  const last = rest[rest.length - 1];
  const opts = last && typeof last === 'object' && !Array.isArray(last) && !last.marker && !last.dir ? rest.pop() : {};
  const base = { name, init, label, opts };
  // {{x, x0}, None}, {{x, x0}, xmin, xmax, None}, ControlType -> None: a variable with no control
  if (rest.length === 0 || rest.some(isNone) || isNone(opts.ControlType)) return { ...base, kind: 'hidden' };
  if (rest.includes(Locator)) {
    const bounded = isPoint(rest[0]) && isPoint(rest[1]); // {{p, p0}, Locator} has no range
    return { ...base, kind: 'locator', min: bounded ? rest[0] : null, max: bounded ? rest[1] : null, multi: Array.isArray(init?.[0]) };
  }
  if (isPoint(rest[0]) && isPoint(rest[1])) return { ...base, kind: 'slider2D', min: rest[0], max: rest[1] };
  if (Array.isArray(rest[0])) {
    const values = rest[0].map((v) => (v && v.rule ? { value: v.value, label: v.label } : { value: v, label: String(v) }));
    return { ...base, kind: 'setter', values };
  }
  if (typeof rest[0] === 'number' && typeof rest[1] === 'number') return { ...base, kind: 'slider', min: rest[0], max: rest[1], step: rest[2] ?? 0 };
  throw new Error(`Manipulate: unrecognised control spec for ${name}: ${JSON.stringify(spec)}`);
}

/**
 * cacheLast() → remember(keys, compute): compute() runs only when one of `keys` differs (===) from the previous call;
 * otherwise the previous result is returned — the originals' "…Old" variables as one generic helper (e.g. rebuild an
 * image only when its data changed).
 */
export function cacheLast() {
  let keys = null, value;
  return (k, compute) => {
    if (!keys || k.length !== keys.length || k.some((x, i) => x !== keys[i])) { keys = k; value = compute(); }
    return value;
  };
}

/**
 * Copy for the test hook: JSON, with Infinity and -Infinity written as "Infinity" and "-Infinity" (JSON has neither);
 * NaN becomes null, as in JSON.
 */
export const hookCopy = (x) => JSON.parse(JSON.stringify(x, (k, v) => (v === Infinity ? 'Infinity' : v === -Infinity ? '-Infinity' : v)));
/** The reverse of hookCopy for values given to setState. */
export const hookRead = (v) => (v === 'Infinity' ? Infinity : v === '-Infinity' ? -Infinity : Array.isArray(v) ? v.map(hookRead) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, w]) => [k, hookRead(w)])) : v);

const clampTo = ([x, y], lo, hi) => (lo ? [Math.min(Math.max(x, lo[0]), hi[0]), Math.min(Math.max(y, lo[1]), hi[1])] : [x, y]);
const passThrough = (opts) => Object.fromEntries(Object.entries(opts).filter(([k]) => /^[a-z]/.test(k)));

/**
 * Manipulate(spec) — see the file header. spec:
 *   name                      the app's name (window.__demo.name)
 *   body(state, {controlActive}) → Graphics | { state, view }
 *   draw(view, state) → graphics list        (with the { state, view } form)
 *   graphics: { PlotRange, ImageSize, PlotRangePadding, Background, label }   (with draw; label = accessible description)
 *   ControlActive: true       the body reads ControlActive[] (track mouse drags, re-evaluate on release)
 *   controls: [control specs]
 *   initial() → state         optional: the initial Manipulate variables (default: the controls' init values)
 *   locators: { pickAnywhere, keyStep, describe(name), appearance(name, plot) }   options of the locator pane
 *   hook: { view(view, state), …extra }   what window.__demo.view() returns, plus extra hook functions (ctx) => fn
 *   elements: { controls, graphic, reset }  element ids (default 'controls', 'graphic', 'reset')
 * Returns ctx: { get state, get view, plot, controls, run(), set(name, value) }.
 */
export function Manipulate(spec) {
  const ids = { controls: 'controls', graphic: 'graphic', reset: 'reset', ...spec.elements };
  const parsed = spec.controls.map(parseControl);
  const vars = parsed.filter((c) => c.name);
  const initial = () => {
    const s = spec.initial ? spec.initial() : {};
    for (const c of vars) if (!(c.name in s)) s[c.name] = structuredClone(c.init);
    return s;
  };
  let state = initial();
  let view = null;
  let controlActive = false;

  // ---- the picture
  const g0 = spec.graphics ?? {};
  const graphicEl = document.getElementById(ids.graphic);
  let plot = null, layer = null;
  const ensurePlot = (options) => {
    if (plot) return;
    if (!options?.PlotRange) throw new Error('Manipulate: give the Graphics a PlotRange (in the Graphics options or in spec.graphics)');
    plot = createPlot(graphicEl, {
      plotRange: options.PlotRange, imageSize: Array.isArray(options.ImageSize) ? options.ImageSize[0] : options.ImageSize,
      padding: options.PlotRangePadding ?? 0.02, label: options.label ?? g0.label,
    });
    if (options.Background) { // Background -> colour: a rectangle over the plot range, under everything
      const [[x0, x1], [y0, y1]] = options.PlotRange;
      plot.rect(plot.layer('background'), [x0, y0], [x1, y1], { fill: options.Background.rgb });
    }
    layer = plot.layer('graphics');
  };
  if (g0.PlotRange) ensurePlot(g0);

  // ---- evaluation
  let locators = null;
  function run() {
    const r = spec.body(state, { controlActive });
    let graphics;
    if (r && r.head === 'Graphics') { graphics = r; view = r; } else {
      if (r && r.state) state = r.state;
      view = r && 'view' in r ? r.view : r;
      graphics = spec.draw(view, state);
    }
    ensurePlot(graphics?.options ?? g0);
    layer.replaceChildren();
    render(plot, layer, graphics);
    if (!locators) makeLocators();
    locators?.redraw();
  }

  // ---- controls
  const controls = new Controls(document.getElementById(ids.controls));
  const apis = new Map();
  const setVar = (name, v) => { state[name] = v; run(); };
  const tracksActive = !!spec.ControlActive;
  const markActive = (input) => { if (tracksActive) input?.addEventListener('pointerdown', () => { controlActive = true; }); };
  for (const c of parsed) {
    const label = c.label == null ? '' : textOf(c.label, { sep: ' ' });
    const extra = passThrough(c.opts ?? {});
    let api = null;
    if (c.kind === 'delimiter') controls.delimiter();
    else if (c.kind === 'heading') controls.heading(c.label);
    else if (c.kind === 'slider') {
      api = controls.slider({
        name: c.name, label, min: c.min, max: c.max, step: c.step, value: state[c.name],
        steps: 'mma', labeled: c.opts.Appearance === 'Labeled', enabled: c.opts.Enabled !== false,
        onInput: (v) => setVar(c.name, v), ...extra,
      });
      markActive(api.row.querySelector('input[type=range]'));
    } else if (c.kind === 'setter') {
      const options = c.values.map((o) => ({ value: o.value, label: textOf(o.label) }));
      api = controls.setterBar({ name: c.name, label, options, value: state[c.name], onChange: (v) => setVar(c.name, v), ...extra });
    } else if (c.kind === 'slider2D') {
      api = controls.slider2D({
        name: c.name, label, min: c.min, max: c.max, value: state[c.name], enabled: c.opts.Enabled !== false,
        onInput: (v) => setVar(c.name, v), ...extra,
      });
      markActive(api.row.querySelector('svg'));
    }
    if (api && c.kind === 'setter' && c.opts.Enabled === false) api.row.querySelectorAll('button').forEach((b) => { b.disabled = true; });
    if (api) {
      apis.set(c.name, api);
      const html = htmlOf(c.label);
      const lab = api.row.querySelector('.ctl-label');
      if (lab && html !== label) lab.innerHTML = html; // typeset label (italic, subscripts)
    }
  }
  const syncControls = (how) => { for (const [n, api] of apis) api.set(state[n], how); };

  // one locator per Locator control; a control whose value is a list of points gives one locator per point,
  // named name-1, name-2, … (Mathematica's {{pts, {p1, p2, …}}, …, Locator})
  const locs = parsed.filter((c) => c.kind === 'locator').flatMap((c) => (c.multi
    ? state[c.name].map((_, i) => ({ ...c, name: `${c.name}-${i + 1}`, variable: c.name, index: i }))
    : [{ ...c, variable: c.name, index: null }]));
  const locOf = (n) => locs.find((l) => l.name === n);
  const getLoc = (n) => { const c = locOf(n); return c.index === null ? state[c.variable] : state[c.variable][c.index]; };
  const moveLocator = (n, p) => {
    const c = locOf(n);
    const q = clampTo(p, c.min, c.max);
    if (c.index === null) state[c.variable] = q; else state[c.variable][c.index] = q;
    run();
  };
  function makeLocators() {
    if (!locs.length) return;
    const L = spec.locators ?? {};
    locators = addLocators(plot, {
      names: locs.map((c) => c.name),
      get: getLoc,
      appearance: (n) => {
        const c = locOf(n);
        if (isNone(c.opts.Appearance)) return null;
        return L.appearance ? L.appearance(n, plot) : locatorGlyph(plot);
      },
      pickAnywhere: L.pickAnywhere ?? true, // Manipulate's locators form one LocatorPane
      keyStep: L.keyStep ?? 0.05,
      describe: L.describe ?? ((n) => `${n} locator; arrow keys move it`),
      onStart: tracksActive ? () => { controlActive = true; } : undefined,
      onMove: (n, p) => moveLocator(n, p),
    });
  }

  if (plot && !locators) makeLocators();

  document.getElementById(ids.reset)?.addEventListener('click', () => {
    state = initial();
    syncControls({ moved: false });
    run();
  });

  run(); // the first evaluation (it also makes the picture and the locators when the body returns the Graphics)

  // ControlActive becomes False when the mouse is released: the body is evaluated once more. Registered after the
  // locators, so that a drag's last move is applied before this evaluation.
  if (tracksActive) {
    const release = () => { if (controlActive) { controlActive = false; run(); } };
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
  }

  const ctx = {
    get state() { return state; },
    set state(s) { state = s; },
    get view() { return view; },
    get plot() { return plot; },
    get controlActive() { return controlActive; },
    controls: apis,
    moveLocator,
    /** [width, height] of the image drawn by Raster with this Annotation id (null if none) — for tests */
    rasterSize: (id) => {
      const img = plot.svg.querySelector(`[data-testid="${id}"]`);
      return img ? [Number(img.getAttribute('data-width')), Number(img.getAttribute('data-height'))] : null;
    },
    run,
    set: setVar,
  };

  // ---- test / automation hook
  const H = spec.hook ?? {};
  const extras = Object.fromEntries(Object.entries(H).filter(([k]) => k !== 'view').map(([k, f]) => [k, f(ctx)]));
  window.__demo = {
    name: spec.name,
    getState: () => hookCopy(state),
    /** replace any Manipulate variables (e.g. a snapshot's Settings) and evaluate once */
    setState: (partial) => {
      state = { ...state, ...hookRead(JSON.parse(JSON.stringify(partial))) };
      syncControls();
      run();
      return hookCopy(state);
    },
    view: () => hookCopy(H.view ? H.view(view, state) : view),
    /** move a locator to world point p as one front-end update (its range applies) */
    moveLocator: (n, p) => { moveLocator(n, p); return hookCopy(state); },
    worldToClient: (p) => plot.worldToClient(p),
    controlActive: () => controlActive,
    ...extras,
    ready: true,
  };
  return ctx;
}

export { darkLocatorGlyph, locatorGlyph };
