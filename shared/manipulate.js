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
//   * builds the controls (shared/ui.js, ui-extra.js, ui-interval.js) from Mathematica-style specs (table below) and
//     keeps the Manipulate variables in one `state` object; every control change re-evaluates the body and redraws;
//     after every evaluation the controls show the variables' values (a body may change them, as in Mathematica);
//   * locators: draggable on the picture (shared/svg-plot.js addLocators), kept inside their range; options
//     locators: { pickAnywhere, keyStep, describe, appearance, testid(name), pointer: false (the page handles presses
//     itself), throttle: 'frame' (glyph at once, body on the next frame), onPlace(name, ctx) };
//   * ControlActive (when spec.ControlActive is true, i.e. the body uses ControlActive[]): `controlActive` is true while
//     a slider or locator is dragged with the mouse; on release the body is evaluated once more with false;
//   * the "Initial settings" button (an element with id `reset`, if the page has one);
//   * the test hook window.__demo (getState, setState, view, moveLocator, worldToClient, controlActive, ready; setRng
//     with `random`) that the browser tests and the Mathematica comparison use.
//
// Control specs (Manipulate's own forms; JS arrays for Mathematica lists):
//   [[name, init, label], min, max, step, opts]         slider (step omitted or 0: continuous); min and max may be
//                                                       functions of the state (Mathematica's Dynamic range)
//   [[name, init, label], [v1, v2, …], opts]            setter bar; a value may be Rule(value, label);
//                                                       {False, True} gives a checkbox, as in Mathematica
//   [[name, init], [xmin, ymin], [xmax, ymax], Locator, opts]   locator on the picture (a list of points: one locator
//                                                       per point, named name-1, name-2, …)
//   [[name, init, label], [xmin, ymin], [xmax, ymax], opts]     2D slider
//   [[name, [lo, hi], label], min, max, step, { ControlType: IntervalSlider, Method: 'Push', MinIntervalSize: d }]
//   [[name, init, label], Control(factory, options)]    a control made by a factory with the shared/ui-extra.js
//                                                       signature factory(controls, {name, label, value, onInput,
//                                                       onChange, parent, …options}) → {get, set, setEnabled?, row}
//                                                       (e.g. demos/common/dial-control.js makeDialControl)
//   Button(label, action, { name })                     Mathematica's Button[label, action]: action(state, ctx)
//                                                       changes the state, then the body is evaluated
//   Row([spec, spec, …], { name, class })               controls side by side
//   [[name, init], None] or [name, init, None]          a variable with no control (hidden state)
//   Delimiter, or a string (a heading)
//   {x, xmin, xmax, step} and {x, {v1, v2, …}}     short forms: the initial value is xmin, or v1
//   [[name, init], xmin, xmax, None] or { ControlType: None }   also hidden; [[p, p0], Locator] a locator with no range
// opts (Mathematica's option names): Appearance: 'Labeled' shows the value field (default: none, as in Mathematica);
// Appearance: None on a locator draws no glyph (still draggable); ControlType: Slider (a plain slider, no ⊕ panel),
// VerticalSlider, PopupMenu, SetterBar, Checkbox, IntervalSlider; ImageSize: px width of a slider track; Enabled: a
// boolean or a function of the state; any lower-case key is passed to the shared/ui*.js control unchanged (e.g. plus,
// format, parse, animSeconds); a locator's picture: k puts it on picture k (several pictures, below). Labels may be
// strings or Style/Subscript/Superscript/Row expressions.
//
// The body: body(state, { controlActive, rng }) returns either a Graphics[…] or { state, view } (a model in the ports'
// style: the new Manipulate variables and the values to draw). In the second form pass draw(view, state) → Graphics
// list (or, with several pictures, a list of Graphics lists, one per picture); the Graphics options then come from
// spec.graphics (an options object, or a list of them with { id } = the container element of each picture). The
// picture's options (PlotRange, ImageSize, Background) are read once, at the first evaluation. Pure models stay testable
// in Node: only this file and the renderer touch the DOM.
//
// Front-end behaviour options: random (a seeded or replayed random source for the body, ?seed=N in the page URL, hook
// setRng), settle(state) (evaluate again on the next frame while it is true — Mathematica re-evaluates a body that
// changes its own variables), throttle: 'frame' (at most one evaluation per animation frame for control input),
// after(ctx) (runs after every evaluation and drawing: sounds, text outside the picture).
//
// Mathematica slider semantics are the default: values min + k·step in machine arithmetic, the right end = max
// (shared/ui.js `steps: 'mma'`).

import { Controls } from './ui.js';
import { addButton, addCheckbox, addPopup, addVerticalSlider, addRow } from './ui-extra.js';
import { addIntervalSlider } from './ui-interval.js';
import { createPlot, addLocators, darkLocatorGlyph, locatorGlyph } from './svg-plot.js';
import { createRng, replayRng } from './random.js';
import { render, htmlOf, textOf } from './graphics.js';

/** Markers used in control specs. */
export const Locator = Object.freeze({ marker: 'Locator' });
export const Delimiter = Object.freeze({ marker: 'Delimiter' });
export { None, Row } from './graphics.js';
/** Rule[value, label] for setter-bar and popup values. */
export const Rule = (value, label) => Object.freeze({ rule: true, value, label });
/** ControlType values. */
export const Slider = Object.freeze({ controlType: 'Slider' });
export const VerticalSlider = Object.freeze({ controlType: 'VerticalSlider' });
export const PopupMenu = Object.freeze({ controlType: 'PopupMenu' });
export const SetterBar = Object.freeze({ controlType: 'SetterBar' });
export const Checkbox = Object.freeze({ controlType: 'Checkbox' });
export const IntervalSlider = Object.freeze({ controlType: 'IntervalSlider' });
/** Control(factory, options): a control built by a factory (Mathematica's Control[{x, …}] with a custom appearance). */
export const Control = (factory, options = {}) => Object.freeze({ marker: 'Control', factory, options });
/** Button[label, action] (in the control list): action(state, ctx) changes the state; options { name }. */
export const Button = (label, action, options = {}) => Object.freeze({ marker: 'Button', label, action, options });

const isPoint = (x) => Array.isArray(x) && x.length === 2 && x.every((v) => typeof v === 'number');
const isNone = (x) => x && x.dir === 'none';
const isBound = (x) => typeof x === 'number' || typeof x === 'function';

/**
 * Parse one Manipulate control spec into a plain description (pure; unit-tested):
 *   { kind: 'slider' | 'vslider' | 'interval' | 'setter' | 'popup' | 'checkbox' | 'locator' | 'slider2D' | 'custom' |
 *     'button' | 'row' | 'hidden' | 'delimiter' | 'heading', name, init, label, min, max, step, values, opts, … }
 */
export function parseControl(spec) {
  if (spec === Delimiter) return { kind: 'delimiter' };
  if (typeof spec === 'string') return { kind: 'heading', label: spec };
  if (spec && spec.marker === 'Button') {
    const name = spec.options.name ?? textOf(spec.label);
    return { kind: 'button', name: null, buttonName: name, label: spec.label, action: spec.action, opts: spec.options };
  }
  if (spec && spec.head === 'Row') return { kind: 'row', items: spec.items.map(parseControl), opts: spec.opts ?? {} };
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
  const type = opts.ControlType?.controlType;
  // {{x, x0}, None}, {{x, x0}, xmin, xmax, None}, ControlType -> None: a variable with no control
  if (rest.length === 0 || rest.some(isNone) || isNone(opts.ControlType)) return { ...base, kind: 'hidden' };
  if (rest[0] && rest[0].marker === 'Control') return { ...base, kind: 'custom', factory: rest[0].factory, options: rest[0].options };
  if (rest.includes(Locator)) {
    const bounded = isPoint(rest[0]) && isPoint(rest[1]); // {{p, p0}, Locator} has no range
    return { ...base, kind: 'locator', min: bounded ? rest[0] : null, max: bounded ? rest[1] : null, multi: Array.isArray(init?.[0]) };
  }
  if (isPoint(rest[0]) && isPoint(rest[1])) return { ...base, kind: 'slider2D', min: rest[0], max: rest[1] };
  if (Array.isArray(rest[0])) {
    const values = rest[0].map((v) => (v && v.rule ? { value: v.value, label: v.label } : { value: v, label: String(v) }));
    const boolean = values.length === 2 && values[0].value === false && values[1].value === true;
    const kind = type === 'PopupMenu' ? 'popup' : type === 'Checkbox' || (boolean && type !== 'SetterBar') ? 'checkbox' : 'setter';
    return { ...base, kind, values };
  }
  if (isBound(rest[0]) && isBound(rest[1])) {
    const kind = type === 'IntervalSlider' ? 'interval' : type === 'VerticalSlider' ? 'vslider' : 'slider';
    return { ...base, kind, min: rest[0], max: rest[1], step: rest[2] ?? 0, plain: type === 'Slider' };
  }
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

/** The random source of a page: ?seed=N gives reproducible draws, otherwise unseeded (as the originals). */
export function pageRng() {
  const seedParam = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('seed') : null;
  return createRng({ seed: seedParam !== null && /^\d+$/.test(seedParam) ? Number(seedParam) : null });
}

const clampTo = ([x, y], lo, hi) => (lo ? [Math.min(Math.max(x, lo[0]), hi[0]), Math.min(Math.max(y, lo[1]), hi[1])] : [x, y]);
const passThrough = (opts) => Object.fromEntries(Object.entries(opts).filter(([k]) => /^[a-z]/.test(k) && k !== 'picture'));
const sameValue = (a, b) => a === b || (typeof a === 'object' && typeof b === 'object' && JSON.stringify(a) === JSON.stringify(b));
const bound = (b, state) => (typeof b === 'function' ? b(state) : b);

/**
 * Manipulate(spec) — see the file header. spec:
 *   name                      the app's name (window.__demo.name)
 *   body(state, {controlActive, rng}) → Graphics | { state, view }
 *   draw(view, state) → graphics list (several pictures: a list of graphics lists)   (with the { state, view } form)
 *   graphics: { PlotRange, ImageSize, PlotRangePadding, Background, label, id, testid, svgClass, maxWidth } or a list
 *             of them (several pictures); svgClass/maxWidth replace svg-plot's class and width cap
 *   ControlActive: true       the body reads ControlActive[] (track mouse drags, re-evaluate on release)
 *   controls: [control specs]
 *   initial() → state         optional: the initial Manipulate variables (default: the controls' init values)
 *   locators: { pickAnywhere, keyStep, describe(name), appearance(name, plot) }   options of the locator pane
 *   random, settle(state), throttle: 'frame', after(ctx)   front-end behaviour (file header)
 *   hook: { view(view, state), copy, …extra }   what window.__demo.view() returns (copied by `copy`, default JSON with
 *             "Infinity"), plus extra hook functions (ctx) => fn
 *   elements: { controls, graphic, reset }  element ids (default 'controls', 'graphic', 'reset')
 * Returns ctx: { state, view, plot, plots, rng, controls, run(), set(name, value), setState(partial, how), moveLocator,
 *   rasterSize(id), controlActive }.
 */
export function Manipulate(spec) {
  const ids = { controls: 'controls', graphic: 'graphic', reset: 'reset', ...spec.elements };
  const parsed = spec.controls.map(parseControl);
  const flat = (list) => list.flatMap((c) => (c.kind === 'row' ? flat(c.items) : [c]));
  const all = flat(parsed);
  const vars = all.filter((c) => c.name);
  const initial = () => {
    const s = spec.initial ? spec.initial() : {};
    for (const c of vars) if (!(c.name in s)) s[c.name] = structuredClone(c.init);
    return s;
  };
  let state = initial();
  let view = null;
  let controlActive = false;
  let rng = spec.random ? pageRng() : null;

  // ---- the pictures (one, or several side by side: Row/Column/Grid of Graphics)
  const several = Array.isArray(spec.graphics);
  const g0 = several ? spec.graphics : [spec.graphics ?? {}];
  const plots = [], layers = [];
  const ensurePlots = (optionsList) => {
    if (plots.length) return;
    optionsList.forEach((options, k) => {
      if (!options?.PlotRange) throw new Error('Manipulate: give the Graphics a PlotRange (in the Graphics options or in spec.graphics)');
      const el = document.getElementById(options.id ?? g0[k]?.id ?? (k === 0 ? ids.graphic : `${ids.graphic}${k + 1}`));
      const plot = createPlot(el, {
        plotRange: options.PlotRange, imageSize: Array.isArray(options.ImageSize) ? options.ImageSize[0] : options.ImageSize,
        padding: options.PlotRangePadding ?? 0.02, label: options.label ?? g0[k]?.label, testid: options.testid ?? g0[k]?.testid,
      });
      const svgClass = options.svgClass ?? g0[k]?.svgClass, maxWidth = options.maxWidth ?? g0[k]?.maxWidth;
      if (svgClass !== undefined) plot.svg.setAttribute('class', svgClass ?? 'scene'); // e.g. null: no svg-plot locator CSS
      if (maxWidth !== undefined) plot.svg.style.maxWidth = maxWidth ?? '';
      if (options.Background) { // Background -> colour: a rectangle over the plot range, under everything
        const [[x0, x1], [y0, y1]] = options.PlotRange;
        plot.rect(plot.layer('background'), [x0, y0], [x1, y1], { fill: options.Background.rgb });
      }
      plots.push(plot);
      layers.push(plot.layer('graphics'));
    });
  };
  if (g0.every((g) => g.PlotRange)) ensurePlots(g0);

  // ---- evaluation
  let locatorPanes = null;
  let pending = 0, queued = 0;
  function run() {
    if (pending) { cancelAnimationFrame(pending); pending = 0; }
    if (queued) { cancelAnimationFrame(queued); queued = 0; }
    const r = spec.body(state, { controlActive, rng });
    let pictures;
    if (r && r.head === 'Graphics') { pictures = [r]; view = r; } else {
      if (r && r.state) state = r.state;
      view = r && 'view' in r ? r.view : r;
      const d = spec.draw(view, state);
      pictures = several ? d : [d];
    }
    ensurePlots(pictures.map((p, k) => (p?.head === 'Graphics' ? { ...p.options, id: g0[k]?.id } : g0[k])));
    pictures.forEach((p, k) => { layers[k].replaceChildren(); render(plots[k], layers[k], p); });
    if (!locatorPanes) makeLocators();
    locatorPanes?.forEach((l) => l.redraw());
    updateControls();
    spec.after?.(ctx);
    if (spec.settle && spec.settle(state)) pending = requestAnimationFrame(() => { pending = 0; run(); });
  }
  // control input: at once, or (throttle 'frame') at most once per animation frame
  const requestRun = () => {
    if (spec.throttle !== 'frame') { run(); return; }
    if (!queued) queued = requestAnimationFrame(() => { queued = 0; run(); });
  };

  // ---- controls
  const root = new Controls(document.getElementById(ids.controls));
  const apis = new Map();
  const dynamic = []; // controls whose Enabled or range depend on the state
  const shown = new Map(); // the value each control shows (what it was set to or what the user entered)
  const setVar = (name, v) => { state[name] = v; shown.set(name, v); requestRun(); };
  const tracksActive = !!spec.ControlActive;
  const markActive = (node) => { if (tracksActive) node?.addEventListener('pointerdown', () => { controlActive = true; }); };
  const setWidth = (api, px) => {
    const r = api.row.querySelector('input[type=range]');
    if (r && px) Object.assign(r.style, { flex: `0 0 ${px}px`, width: `${px}px`, minWidth: `${px}px` });
  };
  const makeControl = (c, controls, parent) => {
    const label = c.label == null ? '' : textOf(c.label, { sep: ' ' });
    const extra = passThrough(c.opts ?? {});
    const enabled = typeof c.opts?.Enabled === 'function' ? c.opts.Enabled(state) : c.opts?.Enabled !== false;
    const onInput = (v) => setVar(c.name, v);
    let api = null;
    switch (c.kind) {
      case 'delimiter': controls.delimiter(); return;
      case 'heading': controls.heading(c.label); return;
      case 'row': {
        const rowEl = addRow(controls, { name: c.opts.name });
        if (c.opts.class) rowEl.classList.add(c.opts.class);
        const sub = new Controls(rowEl);
        sub.controls = controls.controls;
        c.items.forEach((item) => makeControl(item, sub, rowEl));
        return;
      }
      case 'button': {
        const b = addButton(controls, {
          name: c.buttonName, label: textOf(c.label), parent,
          onClick: () => { c.action(state, ctx); requestRun(); },
        });
        if (htmlOf(c.label) !== textOf(c.label)) b.button.innerHTML = htmlOf(c.label);
        return;
      }
      case 'slider':
        api = controls.slider({
          name: c.name, label, min: bound(c.min, state), max: bound(c.max, state), step: c.step, value: state[c.name],
          steps: 'mma', labeled: c.opts.Appearance === 'Labeled', enabled, plus: !c.plain, onInput, ...extra,
        });
        setWidth(api, c.opts.ImageSize);
        markActive(api.row.querySelector('input[type=range]'));
        break;
      case 'vslider':
        api = addVerticalSlider(controls, { name: c.name, label, min: bound(c.min, state), max: bound(c.max, state), step: c.step, value: state[c.name], onInput, parent, ...extra });
        markActive(api.row.querySelector('input[type=range]'));
        break;
      case 'interval':
        api = addIntervalSlider(controls, {
          name: c.name, label, min: bound(c.min, state), max: bound(c.max, state), step: c.step, value: state[c.name],
          method: c.opts.Method ?? 'Free', minIntervalSize: c.opts.MinIntervalSize ?? 0, labeled: c.opts.Appearance === 'Labeled',
          enabled, onInput, parent, ...extra,
        });
        markActive(api.row);
        break;
      case 'setter':
        api = controls.setterBar({
          name: c.name, label, options: c.values.map((o) => ({ value: o.value, label: textOf(o.label) })), value: state[c.name],
          onChange: onInput, ...extra,
        });
        c.values.forEach((o, i) => { // typeset value labels (e.g. RRT with a superscript star)
          if (htmlOf(o.label) !== textOf(o.label)) api.row.querySelectorAll('button')[i].innerHTML = htmlOf(o.label);
        });
        if (!enabled) api.row.querySelectorAll('button').forEach((b) => { b.disabled = true; });
        break;
      case 'popup':
        api = addPopup(controls, { name: c.name, label, options: c.values.map((o) => ({ value: o.value, label: textOf(o.label) })), value: state[c.name], onChange: onInput, parent, ...extra });
        break;
      case 'checkbox':
        api = addCheckbox(controls, { name: c.name, label, value: state[c.name], onChange: onInput, parent, ...extra });
        if (!enabled) api.setEnabled(false);
        break;
      case 'slider2D':
        api = controls.slider2D({ name: c.name, label, min: c.min, max: c.max, value: state[c.name], enabled, onInput, ...extra });
        markActive(api.row.querySelector('svg'));
        break;
      case 'custom':
        api = c.factory(controls, { name: c.name, label, value: state[c.name], onInput, onChange: onInput, parent, ...c.options });
        if (api.row) markActive(api.row);
        break;
      default: return; // locator, hidden: no control here
    }
    apis.set(c.name, api);
    shown.set(c.name, state[c.name]);
    const html = htmlOf(c.label);
    const lab = api.row?.querySelector('.ctl-label, :scope > span');
    if (lab && html !== label) lab.innerHTML = html; // typeset label (italic, subscripts)
    if (typeof c.opts?.Enabled === 'function' || typeof c.min === 'function' || typeof c.max === 'function') {
      c.created = { enabled, range: [bound(c.min, state), bound(c.max, state)] }; // what the control was built with
      dynamic.push(c);
    }
  };
  for (const c of parsed) makeControl(c, root, null);

  /** after an evaluation: the controls show the variables (a body may change them) and their dynamic Enabled/range */
  const lastDynamic = new Map(); // Enabled / range last applied, so that a control is touched only on a change
  function updateControls() {
    for (const c of dynamic) {
      const api = apis.get(c.name);
      const now = {
        enabled: typeof c.opts.Enabled === 'function' ? !!c.opts.Enabled(state) : undefined,
        range: typeof c.min === 'function' || typeof c.max === 'function' ? [bound(c.min, state), bound(c.max, state)] : undefined,
      };
      const before = lastDynamic.get(c.name) ?? c.created;
      if (now.enabled !== undefined && now.enabled !== before.enabled) {
        if (!api.setEnabled) throw new Error(`Manipulate: control ${c.name} cannot change Enabled`);
        api.setEnabled(now.enabled);
      }
      if (now.range && !sameValue(now.range, before.range)) {
        if (!api.setRange) throw new Error(`Manipulate: control ${c.name} cannot change its range`);
        api.setRange(...now.range);
      }
      lastDynamic.set(c.name, now);
    }
    // write-back: a body that changed a variable; compared with what the control shows, not with its get(), which
    // may return a value snapped by the browser
    for (const [n, api] of apis) if (!sameValue(shown.get(n), state[n])) { api.set(state[n]); shown.set(n, state[n]); }
  }
  const syncControls = (how) => { for (const [n, api] of apis) { api.set(state[n], how); shown.set(n, state[n]); } };

  // one locator per Locator control; a control whose value is a list of points gives one locator per point,
  // named name-1, name-2, … (Mathematica's {{pts, {p1, p2, …}}, …, Locator})
  const locs = all.filter((c) => c.kind === 'locator').flatMap((c) => (c.multi
    ? state[c.name].map((_, i) => ({ ...c, name: `${c.name}-${i + 1}`, variable: c.name, index: i }))
    : [{ ...c, variable: c.name, index: null }]));
  const locOf = (n) => locs.find((l) => l.name === n);
  const getLoc = (n) => { const c = locOf(n); return c.index === null ? state[c.variable] : state[c.variable][c.index]; };
  const placeLocator = (n, p) => {
    const c = locOf(n);
    const q = clampTo(p, c.min, c.max);
    if (c.index === null) state[c.variable] = q; else state[c.variable][c.index] = q;
  };
  const moveLocator = (n, p) => { placeLocator(n, p); run(); };
  // locators: { throttle: 'frame' }: the glyph moves at once, the body is evaluated on the next animation frame
  const moveLocatorLater = (n, p) => {
    placeLocator(n, p);
    spec.locators?.onPlace?.(n, ctx);
    locatorPanes?.forEach((l) => l.redraw());
    if (!queued) queued = requestAnimationFrame(() => { queued = 0; run(); });
  };
  function makeLocators() {
    locatorPanes = [];
    if (!locs.length) return;
    const L = spec.locators ?? {};
    const byPicture = new Map();
    for (const c of locs) { const k = c.opts.picture ?? 0; if (!byPicture.has(k)) byPicture.set(k, []); byPicture.get(k).push(c); }
    for (const [k, list] of byPicture) {
      const plot = plots[k];
      locatorPanes.push(addLocators(plot, {
        names: list.map((c) => c.name),
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
        onMove: (n, p) => (L.throttle === 'frame' ? moveLocatorLater(n, p) : moveLocator(n, p)),
        pointer: L.pointer ?? true,
        ...(L.testid ? { testid: L.testid } : {}),
      }));
    }
  }

  if (plots.length && !locatorPanes) makeLocators();

  const cancelPending = () => {
    if (pending) { cancelAnimationFrame(pending); pending = 0; }
    if (queued) { cancelAnimationFrame(queued); queued = 0; }
  };
  document.getElementById(ids.reset)?.addEventListener('click', () => {
    cancelPending();
    state = initial();
    syncControls({ moved: false });
    run();
  });

  const ctx = {
    get state() { return state; },
    set state(s) { state = s; },
    get view() { return view; },
    get plot() { return plots[0]; },
    plots,
    get rng() { return rng; },
    get controlActive() { return controlActive; },
    controls: apis,
    moveLocator,
    /** replace Manipulate variables and evaluate once; how = { moved } is passed to the sliders */
    setState: (partial, how) => {
      cancelPending();
      state = { ...state, ...partial };
      syncControls(how);
      run();
      return state;
    },
    /** [width, height] of the image drawn by ImageRaster with this Annotation id (null if none) — for tests */
    rasterSize: (id, k = 0) => {
      const img = plots[k].svg.querySelector(`[data-testid="${id}"]`);
      return img ? [Number(img.getAttribute('data-width')), Number(img.getAttribute('data-height'))] : null;
    },
    run,
    set: setVar,
  };

  run(); // the first evaluation (it also makes the pictures and the locators when the body returns the Graphics)

  // ControlActive becomes False when the mouse is released: the body is evaluated once more. Registered after the
  // locators, so that a drag's last move is applied before this evaluation.
  if (tracksActive) {
    const release = () => { if (controlActive) { controlActive = false; run(); } };
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
  }

  // ---- test / automation hook
  const H = spec.hook ?? {};
  // hook.copy: how values leave the hook (default JSON with "Infinity"; e.g. structuredClone keeps Infinity and -0)
  const copy = H.copy ?? hookCopy;
  const read = H.copy ? (x) => structuredClone(x) : (x) => hookRead(JSON.parse(JSON.stringify(x)));
  const extras = Object.fromEntries(Object.entries(H).filter(([k]) => k !== 'view' && k !== 'copy').map(([k, f]) => [k, f(ctx)]));
  window.__demo = {
    name: spec.name,
    getState: () => copy(state),
    /** replace any Manipulate variables (e.g. a snapshot's Settings) and evaluate once */
    setState: (partial) => copy(ctx.setState(read(partial))),
    view: () => copy(H.view ? H.view(view, state) : view),
    /** move a locator to world point p as one front-end update (its range applies) */
    moveLocator: (n, p) => { moveLocator(n, p); return copy(state); },
    worldToClient: (p, k = 0) => plots[k].worldToClient(p),
    controlActive: () => controlActive,
    ...(spec.random ? {
      /** replace the random source: {seed: n} (generated) or {reals: […], integers: […]} (replayed draws) */
      setRng: (s) => { rng = s && (s.reals || s.integers) ? replayRng(s) : createRng({ seed: s?.seed ?? null }); },
    } : {}),
    ...extras,
    ready: true,
  };
  return ctx;
}

export { darkLocatorGlyph, locatorGlyph };
