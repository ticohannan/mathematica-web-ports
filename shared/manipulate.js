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
//   * the test hook window.__demo (getState, setState, view, graphics, moveLocator, worldToClient, controlActive, setClock,
//     ready; setRng with `random`) that the browser tests and the Mathematica comparison use.
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
// Appearance: None on a locator draws no glyph (still draggable); a locator's Appearance may also be Graphics primitives
// drawn around the point (coordinates relative to it, in picture units), or a function (state, name) → primitives that
// is evaluated again after every evaluation (a state-dependent locator picture); ControlType: Slider (a plain slider, no ⊕ panel),
// VerticalSlider, PopupMenu, SetterBar, Checkbox, IntervalSlider; ImageSize: px width of a slider track; Enabled: a
// boolean or a function of the state; any lower-case key is passed to the shared/ui*.js control unchanged (e.g. plus,
// format, parse, animSeconds); a locator's picture: k puts it on picture k (several pictures, below). Labels may be
// strings or Style/Subscript/Superscript/Row expressions.
//
// The body: body(state, { controlActive, rng, time }) returns a Graphics[…], a list of primitives (options from spec.graphics), or { state, view, graphics } (a model in the
// ports' style: the new Manipulate variables, the values the hook reports and the picture — a graphics list, or with
// several pictures a list of them), or { state, view } with draw(view, state) → graphics list(s). Without `graphics`
// the Graphics options come from spec.graphics (an options object, or a list of them with { id } = the container
// element of each picture). The
// picture's options (PlotRange, ImageSize, Background) are read once, at the first evaluation. Pure models stay testable
// in Node: only this file and the renderer touch the DOM.
//
// Layout: ControlPlacement: 'Top' puts the controls above the picture (default: beside it, as the pages are written).
// Front-end behaviour options: random (a seeded or replayed random source for the body, ?seed=N in the page URL, hook
// setRng), settle(state) (evaluate again on the next frame while it is true — Mathematica re-evaluates a body that
// changes its own variables; settleInterval: seconds of real time at least between such evaluations, Mathematica's
// Pause[dt] in the body), throttle: 'frame' (at most one evaluation per animation frame for control input),
// after(ctx) (runs after every evaluation and drawing: sounds, text outside the picture), clock (v0.1.24: the body
// reads the time — Mathematica's AbsoluteTime[] — as `time` in its second argument: seconds since 1900-01-01 00:00 UTC;
// the page clock of shared/clock.js, which the hook's setClock(t) fixes at t for tests and setClock(null) releases).
//
// Mathematica slider semantics are the default: values min + k·step in machine arithmetic, the right end = max
// (shared/ui.js `steps: 'mma'`).

import { Controls } from './ui.js';
import { addButton, addCheckbox, addPopup, addVerticalSlider, addRow } from './ui-extra.js';
import { addIntervalSlider } from './ui-interval.js';
import { createPlot, addLocators, darkLocatorGlyph, locatorGlyph, svgNode } from './svg-plot.js';
import { createRng, replayRng } from './random.js';
import { absoluteTime, setClock } from './clock.js';
import { render, htmlOf, textOf, scaleGraphics } from './graphics.js';
import { decorationMargins, plotDecorations, legendExtraPx } from './graphics-extras.js';
import { frameLayout } from './svg-frame.js';

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
/** A text expression (Style, Subscript, Superscript, or a Row of strings and text expressions) — not a control spec. */
const isTextExpr = (x) => !!x && typeof x === 'object' && !Array.isArray(x) && (['Style', 'Subscript', 'Superscript'].includes(x.head)
  || (x.head === 'Row' && Array.isArray(x.items) && x.items.length > 0 && x.items.every((i) => typeof i === 'string' || typeof i === 'number' || isTextExpr(i))));
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
  // v0.1.26: a text expression in the control list is a heading too (Row[{"linear velocity ", Style["v", Italic]}]);
  // a Row of control specs stays a row of controls
  if (isTextExpr(spec)) return { kind: 'heading', label: spec };
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
    const boolean = values.length === 2 && ((values[0].value === false && values[1].value === true) || (values[0].value === true && values[1].value === false)); // {False, True} or {True, False}
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
/** An exact number in the saved-state form {wl, n} (tools/extract_state.py): n its double ({wl: "Infinity"} has no n). */
const isExactNumber = (v) => v && typeof v === 'object' && !Array.isArray(v) && typeof v.wl === 'string' && (typeof v.n === 'number' || /^-?Infinity$/.test(v.wl)) && Object.keys(v).every((k) => k === 'wl' || k === 'n');
/** Plain numbers for {wl, n} anywhere in a value (in lists and plain objects); a part without any is returned as it was
 *  (the same array or object, so that caches keyed on identity keep working). */
export function numbersOf(v) {
  if (isExactNumber(v)) return v.n ?? (v.wl.startsWith('-') ? -Infinity : Infinity);
  if (Array.isArray(v)) { const w = v.map(numbersOf); return w.some((x, i) => x !== v[i]) ? w : v; }
  if (v && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype) {
    let changed = false;
    const w = Object.fromEntries(Object.entries(v).map(([k, x]) => { const y = numbersOf(x); if (y !== x) changed = true; return [k, y]; }));
    return changed ? w : v;
  }
  return v;
}
/**
 * How Mathematica's slider field shows an exact value given in Wolfram form: rationals "1/7", "-1/2"; rational multiples
 * of π in their InputForm variants ("5*Pi/32", "(-5*Pi)/32", "-1/2*Pi", "3/2*Pi", "-(Pi/2)", "Pi/4") → "5π/32",
 * "-5π/32", "-π/2", "3π/2", "-π/2", "π/4"; "Infinity" → "∞"; 1/Sqrt[n] forms ("(2)^(-1/2)", "1/Sqrt[2]") → "1/√2",
 * Sqrt[n] → "√n". Anything else (e.g. an arbitrary-precision real) → null (shown as a number).
 */
export function exactLabel(wl) {
  let t = String(wl).replace(/\s+/g, '');
  if (/^-?\d+(\/\d+)?$/.test(t)) return t;
  if (/^-?Infinity$/.test(t)) return t.replace('Infinity', '∞');
  let m = /^\(?(\d+)\)?\^\(-1\/2\)$/.exec(t) ?? /^1\/Sqrt\[(\d+)\]$/.exec(t);
  if (m) return `1/√${m[1]}`;
  m = /^Sqrt\[(\d+)\]$/.exec(t) ?? /^\(?(\d+)\)?\^\(1\/2\)$/.exec(t);
  if (m) return `√${m[1]}`;
  let sign = 1;
  if (/^-\(.*\)$/.test(t)) { sign = -1; t = t.slice(2, -1); }
  // p/q * Pi in its forms: [-]a*Pi/b, ([-]a*Pi)/b, [-]a/b*Pi, [-]Pi, ([-]Pi)/b
  m = /^\(?(-?)(\d+)?\*?Pi\)?(?:\/(\d+))?$/.exec(t) ?? /^(-?)(\d+)\/(\d+)\*Pi$/.exec(t);
  if (!m) return null;
  if (m[1] === '-') sign = -sign;
  const num = m[2] && m[2] !== '1' ? m[2] : '', den = m[3] ? `/${m[3]}` : '';
  return `${sign < 0 ? '-' : ''}${num}π${den}`;
}
/** The reverse of hookCopy for values given to setState. */
export const hookRead = (v) => (v === 'Infinity' ? Infinity : v === '-Infinity' ? -Infinity : Array.isArray(v) ? v.map(hookRead) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, w]) => [k, hookRead(w)])) : v);

/** The random source of a page: ?seed=N gives reproducible draws, otherwise unseeded (as the originals). */
export function pageRng() {
  const seedParam = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('seed') : null;
  return createRng({ seed: seedParam !== null && /^\d+$/.test(seedParam) ? Number(seedParam) : null });
}

// AbsoluteTime[] and the page clock: shared/clock.js (v0.1.25; re-exported here as in v0.1.24)
export { absoluteTime } from './clock.js';

const clampTo = ([x, y], lo, hi) => (lo ? [Math.min(Math.max(x, lo[0]), hi[0]), Math.min(Math.max(y, lo[1]), hi[1])] : [x, y]);
const passThrough = (opts) => Object.fromEntries(Object.entries(opts).filter(([k]) => /^[a-z]/.test(k) && k !== 'picture'));
/** a variable name with dots is a path into the state: 'theta.0' is state.theta[0] (keeps a model's state shape) */
const pathOf = (name) => name.split('.').map((k) => (/^\d+$/.test(k) ? Number(k) : k));
export const getVar = (state, name) => (name.includes('.') ? pathOf(name).reduce((o, k) => o?.[k], state) : state[name]);
export function setVar(state, name, v) {
  if (!name.includes('.')) { state[name] = v; return; }
  const ks = pathOf(name), last = ks.pop();
  ks.reduce((o, k, i) => (o[k] ??= typeof (ks[i + 1] ?? last) === 'number' ? [] : {}), state)[last] = v;
}
const hasVar = (state, name) => (name.includes('.') ? getVar(state, name) !== undefined : name in state);
const sameValue = (a, b) => a === b || (typeof a === 'object' && typeof b === 'object' && JSON.stringify(a) === JSON.stringify(b));
const bound = (b, state) => (typeof b === 'function' ? b(state) : b);

/**
 * Manipulate(spec) — see the file header. spec:
 *   name                      the app's name (window.__demo.name)
 *   body(state, {controlActive, rng, time}) → Graphics | { state, view, graphics } | { state, view }
 *   draw(view, state) → graphics list (several pictures: a list of graphics lists)   (only for the { state, view } form)
 *   graphics: { PlotRange, ImageSize, PlotRangePadding, Background, Axes, AxesOrigin, AxesLabel, Ticks, Frame, FrameTicks,
 *             FrameLabel, PlotLabel, label, id, testid, svgClass, maxWidth } or a list
 *             of them (several pictures); svgClass/maxWidth replace svg-plot's class and width cap
 *   ControlActive: true       the body reads ControlActive[] (track mouse drags, re-evaluate on release)
 *   controls: [control specs]
 *   initial() → state         optional: the initial Manipulate variables (default: the controls' init values)
 *   initialSettings() → state optional: what "Initial settings" restores when it differs from the opening state (a
 *                             notebook saved in another state than its Initial Settings; default initial)
 *   locators: { pickAnywhere, keyStep, describe(name), appearance(name, plot) }   options of the locator pane
 *   random, settle(state), throttle: 'frame', after(ctx), clock   front-end behaviour (file header)
 *   hook: { view(view, state), copy, …extra }   what window.__demo.view() returns (copied by `copy`, default JSON with
 *             "Infinity"), plus extra hook functions (ctx) => fn
 *   elements: { controls, graphic, reset }  element ids (default 'controls', 'graphic', 'reset')
 *   merge(state, partial) → state   how setState combines a partial state (default { ...state, ...partial })
 *   resetStops: true          Initial settings and setState also stop running slider animations
 * A picture option { renderer } draws that picture with an object { draw(graphics, { element, state, view, k }) }
 * instead of SVG — shared/graphics3d-view.js View3D for Graphics3D — so that 2D pages never load three.js.
 * Initial settings also calls reset() of every renderer that has one (e.g. View3D's resetView option); prepare() of every
 * renderer runs before the controls are made (View3D: throws without WebGL 2 unless webgl2Fallback, as createViewer did).
 * Control options: a variable name with dots is a path into the state ('theta.0'); Assign(state, value) replaces the
 * default assignment; Moved(state) says whether a slider shows its value as moved after a reset or setState (for an
 * IntervalSlider: true sets both ends as machine reals, "2." instead of "2"); a lower-case `parent` element also
 * places controls whose factory has no parent option (sliders, setter bars) there.
 * Returns ctx: { state, view, graphics(k), plot, plots, rng, controls, run(), set(name, value), setState(partial, how), moveLocator,
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
    for (const c of vars) if (!hasVar(s, c.name)) setVar(s, c.name, structuredClone(c.init));
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
  // v0.1.23: pictures with an AspectRatio, per-axis PlotRangePadding or UpdateFrame (plots of shared/plot.js) are made
  // by framedPicture: data coordinates scaled to the AspectRatio, and (UpdateFrame) made again when their frame options
  // change between evaluations. The other pictures keep the code below unchanged.
  const scales = [], frameKeys = [];
  let clipCount = Math.floor(Math.random() * 1e6); // clipPath ids unique in the page
  const isFramed = (o) => o && (o.AspectRatio !== undefined || o.UpdateFrame || Array.isArray(o.PlotRangePadding));
  const FRAME_OPTS = ['PlotRange', 'PlotRangePadding', 'AspectRatio', 'ImageSize', 'Background', 'Axes', 'AxesOrigin', 'Ticks',
    'AxesLabel', 'Frame', 'FrameTicks', 'FrameLabel', 'PlotLabel', 'PlotLegends', 'LabelStyle'];
  const frameKey = (o) => JSON.stringify(FRAME_OPTS.map((n) => o[n] ?? null));
  const elementOf = (options, k) => document.getElementById(options.id ?? g0[k]?.id ?? (k === 0 ? ids.graphic : `${ids.graphic}${k + 1}`));
  function framedPicture(options, k) {
    if (!options?.PlotRange) throw new Error('Manipulate: give the Graphics a PlotRange (in the Graphics options or in spec.graphics)');
    const el = elementOf(options, k);
    const R = options.PlotRange, [[x0, x1], [y0, y1]] = R;
    const pad = options.PlotRangePadding ?? 0.02, [px, py] = Array.isArray(pad) ? pad : [pad, pad];
    const Rp = [[x0 - (x1 - x0) * px, x1 + (x1 - x0) * px], [y0 - (y1 - y0) * py, y1 + (y1 - y0) * py]];
    const ar = options.AspectRatio;
    const sy = typeof ar === 'number' ? (ar * (Rp[0][1] - Rp[0][0])) / (Rp[1][1] - Rp[1][0]) : 1;
    const S = [[Rp[0][0], Rp[0][1]], [Rp[1][0] * sy, Rp[1][1] * sy]];
    const decor = { ...g0[k], ...options };
    const margins = decorationMargins(decor) ?? {};
    const extra = legendExtraPx(decor); // a legend outside widens the image (Mathematica)
    const [mL, mR, mT, mB] = [margins.left ?? 0, (margins.right ?? 0) - extra, margins.top ?? 0, margins.bottom ?? 0];
    let imageSize = options.ImageSize ?? 400;
    // ImageSize -> {w, h}: the plot area and its labels fit inside w × h (the plot area keeps the AspectRatio)
    if (Array.isArray(imageSize)) imageSize = typeof ar === 'number' ? Math.min(imageSize[0] - mL - mR, (imageSize[1] - mT - mB) / ar) + mL + mR : imageSize[0];
    imageSize += extra;
    const layout = frameLayout(S, { imageSize, margins });
    const plot = createPlot(el, { plotRange: layout.plotRange, imageSize, padding: 0, label: options.label ?? g0[k]?.label, testid: options.testid ?? g0[k]?.testid });
    if (options.Background) plot.rect(plot.layer('background'), [S[0][0], S[1][0]], [S[0][1], S[1][1]], { fill: options.Background.rgb });
    const deco = plotDecorations(decor, { range: Rp, plotRange: Rp, visible: layout.plotRange, unitsPerPx: plot.unitsPerPx, scale: [1, sy] });
    // FrameInFront (v0.1.26, set by DensityPlot): the frame, ticks and labels over the picture instead of under it
    if (deco.below.length && !options.FrameInFront) render(plot, plot.layer('decorations'), deco.below);
    const layer = plot.layer('graphics');
    if (options.PlotRangeClipping) { // PlotRangeClipping -> True: the content is clipped to the (padded) plot range
      const id = `prclip-${++clipCount}`;
      const cp = svgNode('clipPath', { id, clipPathUnits: 'userSpaceOnUse' });
      cp.append(svgNode('rect', { x: S[0][0], y: S[1][0], width: S[0][1] - S[0][0], height: S[1][1] - S[1][0] }));
      const defs = svgNode('defs'); defs.append(cp); plot.svg.prepend(defs);
      layer.setAttribute('clip-path', `url(#${id})`);
    }
    if (deco.below.length && options.FrameInFront) render(plot, plot.layer('labels'), deco.below);
    if (deco.above.length) render(plot, plot.layer('labels'), deco.above);
    return { plot, layer, scale: [1, sy], key: frameKey(options) };
  }
  const toWorld = (k, p) => (scales[k] ? [p[0] * scales[k][0], p[1] * scales[k][1]] : p);
  const fromWorld = (k, p) => (scales[k] ? [p[0] / scales[k][0], p[1] / scales[k][1]] : p);
  const ensurePlots = (optionsList) => {
    if (plots.length) return;
    optionsList.forEach((options, k) => {
      if (g0[k]?.renderer) { plots.push(null); layers.push(null); return; } // drawn by its renderer (e.g. Graphics3D)
      if (isFramed(options)) {
        const f = framedPicture(options, k);
        plots.push(f.plot); layers.push(f.layer); scales[k] = f.scale; frameKeys[k] = f.key;
        return;
      }
      if (!options?.PlotRange) throw new Error('Manipulate: give the Graphics a PlotRange (in the Graphics options or in spec.graphics)');
      const el = document.getElementById(options.id ?? g0[k]?.id ?? (k === 0 ? ids.graphic : `${ids.graphic}${k + 1}`));
      // ImageSize -> {w, h} (v0.1.26): the plot range is fitted into w × h, as Mathematica does (the width is the smaller of
      // w and h × the range's aspect); a square picture of a square range is unchanged
      const [[rx0, rx1], [ry0, ry1]] = options.PlotRange;
      const IS = options.ImageSize;
      const imageSize = (Array.isArray(IS) ? (IS.length > 1 ? Math.min(IS[0], (IS[1] * (rx1 - rx0)) / (ry1 - ry0)) : IS[0]) : IS) ?? 400;
      const pad = options.PlotRangePadding ?? 0.02;
      // Axes / Frame / labels (graphics-extras.js): room outside the padded plot range where the labels need it
      const decor = { ...g0[k], ...options };
      const margins = decorationMargins(decor);
      const [[x0, x1], [y0, y1]] = options.PlotRange;
      const padded = [[x0 - (x1 - x0) * pad, x1 + (x1 - x0) * pad], [y0 - (y1 - y0) * pad, y1 + (y1 - y0) * pad]];
      const layout = margins ? frameLayout(padded, { imageSize, margins }) : null;
      const plot = createPlot(el, {
        plotRange: layout ? layout.plotRange : options.PlotRange, imageSize,
        padding: layout ? 0 : pad, label: options.label ?? g0[k]?.label, testid: options.testid ?? g0[k]?.testid,
      });
      const svgClass = options.svgClass ?? g0[k]?.svgClass, maxWidth = options.maxWidth ?? g0[k]?.maxWidth;
      if (svgClass !== undefined) plot.svg.setAttribute('class', svgClass ?? 'scene'); // e.g. null: no svg-plot locator CSS
      if (maxWidth !== undefined) plot.svg.style.maxWidth = maxWidth ?? '';
      if (options.Background) { // Background -> colour: a rectangle over the plot range, under everything
        const [[x0, x1], [y0, y1]] = options.PlotRange;
        plot.rect(plot.layer('background'), [x0, y0], [x1, y1], { fill: options.Background.rgb });
      }
      const deco = plotDecorations(decor, { range: padded, plotRange: options.PlotRange, visible: layout ? layout.plotRange : padded, unitsPerPx: plot.unitsPerPx });
      if (deco.below.length) render(plot, plot.layer('decorations'), deco.below);
      plots.push(plot);
      layers.push(plot.layer('graphics'));
      if (deco.above.length) render(plot, plot.layer('labels'), deco.above);
    });
  };
  if (g0.every((g) => g.PlotRange || g.renderer)) ensurePlots(g0);

  // ---- evaluation
  let locatorPanes = null;
  const locatorGraphics = []; // locators whose Appearance is Graphics data: { g, plot, name, a, drawn }
  let pending = 0, queued = 0;
  let pictures = []; // the graphics drawn by the last evaluation (one per picture)
  let lastRun = 0; // performance.now() when the last evaluation started (settleInterval)
  function run() {
    lastRun = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (pending) { cancelAnimationFrame(pending); pending = 0; }
    if (queued) { cancelAnimationFrame(queued); queued = 0; }
    const r = spec.body(state, spec.clock ? { controlActive, rng, time: absoluteTime() } : { controlActive, rng });
    let d;
    if (r && r.head === 'Graphics') { d = several ? [r] : r; view = r; } else if (Array.isArray(r) && !spec.draw) {
      d = r; view = r; // a bare list of primitives (or, with several pictures, one list per picture)
    } else {
      if (r && r.state) state = r.state;
      view = r && 'view' in r ? r.view : r;
      d = r && 'graphics' in r ? r.graphics : spec.draw(view, state);
    }
    pictures = several ? d : [d];
    const optionsOf = (p, k) => (p?.head === 'Graphics' ? { ...p.options, id: g0[k]?.id } : g0[k]);
    ensurePlots(pictures.map(optionsOf));
    pictures.forEach((p, k) => {
      const r = g0[k]?.renderer;
      if (r) { r.draw(p, { element: document.getElementById(g0[k].id ?? (k === 0 ? ids.graphic : `${ids.graphic}${k + 1}`)), state, view, k }); return; }
      const o = optionsOf(p, k);
      // v0.1.23: frame options changed → the picture is made again (not while one of its locators is dragged: then
      // after the drag, see makePane's onEnd)
      if (frameKeys[k] !== undefined && o?.UpdateFrame && frameKey(o) !== frameKeys[k]) { if (paneOf.get(k)?.dragging()) rebuildLater.add(k); else rebuildPicture(k, o); }
      layers[k].replaceChildren(); render(plots[k], layers[k], scales[k] ? scaleGraphics(p, scales[k]) : p);
    });
    if (!locatorPanes) makeLocators(); else syncLocators();
    locatorPanes?.forEach((l) => l.redraw());
    for (const L of locatorGraphics) {
      if (L.drawn && typeof L.a !== 'function') continue;
      const look = typeof L.a === 'function' ? L.a(state, L.name) : L.a;
      L.g.replaceChildren(); render(L.plot, L.g, scales[L.k] ? scaleGraphics(look, scales[L.k]) : look); L.drawn = true;
    }
    updateControls();
    spec.after?.(ctx);
    // settle: evaluate again on the next frame; settleInterval (v0.1.26, seconds of real time) waits at least that long
    // between evaluations (Mathematica's Pause[dt] in a self-evaluating body)
    if (spec.settle && spec.settle(state)) {
      const iv = (spec.settleInterval ?? 0) * 1000;
      const tick = () => { pending = 0; if (iv && performance.now() - lastRun < iv) { pending = requestAnimationFrame(tick); return; } run(); };
      pending = requestAnimationFrame(tick);
    }
  }
  // control input: at once, or (throttle 'frame') at most once per animation frame
  const requestRun = () => {
    if (spec.throttle !== 'frame') { run(); return; }
    if (!queued) queued = requestAnimationFrame(() => { queued = 0; run(); });
  };

  // ---- controls
  const controlsEl = document.getElementById(ids.controls);
  // ControlPlacement: Top (Mathematica's option): controls above the picture (the pages' class controls-top)
  if (String(spec.ControlPlacement ?? '').toLowerCase() === 'top') controlsEl?.closest('.manipulate')?.classList.add('controls-top', 'placement-top');
  const root = new Controls(controlsEl);
  const apis = new Map();
  const dynamic = []; // controls whose Enabled or range depend on the state
  const shown = new Map(); // the value each control shows (what it was set to or what the user entered)
  const byName = new Map(); // control descriptions by variable name
  // Assign(state, value): a control's own assignment (e.g. also record that a slider was moved); default: the variable
  const assign = (name, v) => { const c = byName.get(name); if (c?.opts?.Assign) c.opts.Assign(state, v); else setVar(state, name, v); shown.set(name, v); requestRun(); };
  const val = (name) => getVar(state, name);
  const tracksActive = !!spec.ControlActive;
  const markActive = (node) => { if (tracksActive) node?.addEventListener('pointerdown', () => { controlActive = true; }); };
  const setWidth = (api, px) => {
    const r = api.row.querySelector('input[type=range]');
    if (typeof px === 'string') px = { Tiny: 60, Small: 100, Medium: 180, Large: 300 }[px]; // v0.1.23: ImageSize -> Small etc.
    if (r && px) Object.assign(r.style, { flex: `0 0 ${px}px`, width: `${px}px`, minWidth: `${px}px` });
  };
  const makeControl = (c, controls, parent) => {
    const label = c.label == null ? '' : textOf(c.label, { sep: ' ' });
    const extra = passThrough(c.opts ?? {});
    const enabled = typeof c.opts?.Enabled === 'function' ? c.opts.Enabled(state) : c.opts?.Enabled !== false;
    if (c.name) byName.set(c.name, c);
    const onInput = (v) => assign(c.name, v);
    let api = null;
    switch (c.kind) {
      case 'delimiter': controls.delimiter(); return;
      case 'heading': {
        const h = controls.heading(textOf(c.label));
        if (h && typeof c.label !== 'string' && htmlOf(c.label) !== textOf(c.label)) h.innerHTML = htmlOf(c.label); // typeset (v0.1.26)
        return;
      }
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
          name: c.name, label, min: bound(c.min, state), max: bound(c.max, state), step: c.step, value: val(c.name),
          steps: 'mma', labeled: c.opts.Appearance === 'Labeled', enabled, plus: !c.plain, onInput, ...extra,
        });
        setWidth(api, c.opts.ImageSize);
        markActive(api.row.querySelector('input[type=range]'));
        break;
      case 'vslider':
        api = addVerticalSlider(controls, { name: c.name, label, min: bound(c.min, state), max: bound(c.max, state), step: c.step, value: val(c.name), onInput, parent, ...extra });
        markActive(api.row.querySelector('input[type=range]'));
        break;
      case 'interval':
        api = addIntervalSlider(controls, {
          name: c.name, label, min: bound(c.min, state), max: bound(c.max, state), step: c.step, value: val(c.name),
          method: c.opts.Method ?? 'Free', minIntervalSize: c.opts.MinIntervalSize ?? 0, labeled: c.opts.Appearance === 'Labeled',
          enabled, onInput, parent, ...extra,
        });
        markActive(api.row);
        if (c.opts.Moved) { const set0 = api.set; api.set = (v, how) => set0(v, how && how.moved ? { exact: [false, false] } : undefined); }
        break;
      case 'setter':
        api = controls.setterBar({
          name: c.name, label, options: c.values.map((o) => ({ value: o.value, label: textOf(o.label) })), value: val(c.name),
          onChange: onInput, ...extra,
        });
        c.values.forEach((o, i) => { // typeset value labels (e.g. RRT with a superscript star)
          if (htmlOf(o.label) !== textOf(o.label)) api.row.querySelectorAll('button')[i].innerHTML = htmlOf(o.label);
        });
        if (!enabled) api.row.querySelectorAll('button').forEach((b) => { b.disabled = true; });
        break;
      case 'popup':
        api = addPopup(controls, { name: c.name, label, options: c.values.map((o) => ({ value: o.value, label: textOf(o.label) })), value: val(c.name), onChange: onInput, parent, ...extra });
        break;
      case 'checkbox':
        api = addCheckbox(controls, { name: c.name, label, value: val(c.name), onChange: onInput, parent, ...extra });
        if (!enabled) api.setEnabled(false);
        break;
      case 'slider2D':
        api = controls.slider2D({ name: c.name, label, min: c.min, max: c.max, value: val(c.name), enabled, onInput, ...extra });
        markActive(api.row.querySelector('svg'));
        break;
      case 'custom':
        api = c.factory(controls, { name: c.name, label, value: val(c.name), onInput, onChange: onInput, parent, ...c.options });
        if (api.row) markActive(api.row);
        break;
      default: return; // locator, hidden: no control here
    }
    if (extra.parent && api.row && api.row.parentNode !== extra.parent) extra.parent.append(api.row);
    apis.set(c.name, api);
    shown.set(c.name, val(c.name));
    const html = htmlOf(c.label);
    const lab = api.row?.querySelector('.ctl-label, :scope > span');
    if (lab && html !== label) lab.innerHTML = html; // typeset label (italic, subscripts)
    if (typeof c.opts?.Enabled === 'function' || typeof c.min === 'function' || typeof c.max === 'function') {
      c.created = { enabled, range: [bound(c.min, state), bound(c.max, state)] }; // what the control was built with
      dynamic.push(c);
    }
  };
  // a renderer that cannot work here (e.g. no WebGL 2) stops the page before the controls, as the pages that made
  // their viewer first did (the start-up notice of shared/requirements.js then stands alone)
  for (const g of g0) g?.renderer?.prepare?.();
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
    for (const [n, api] of apis) if (!sameValue(shown.get(n), val(n))) { api.set(val(n)); shown.set(n, val(n)); }
  }
  // Moved(state): whether a slider shows its value as moved (machine number "1.") after a reset or setState
  // how.moved may be a list of variable names (v0.1.26: only those sliders show their value as moved, "5.")
  const howFor = (n, how) => {
    if (Array.isArray(how?.moved)) how = { ...how, moved: how.moved.includes(n) };
    const m = byName.get(n)?.opts?.Moved; return m ? { ...how, moved: !!m(state) } : how;
  };
  // resetStops: a reset or setState also stops running slider animations (the ports that did so by hand)
  const syncControls = (how, exact) => {
    for (const [n, api] of apis) {
      if (spec.resetStops) api.stop?.();
      const h = howFor(n, how);
      api.set(val(n), exact?.has(n) ? { ...h, exactText: exact.get(n) } : h);
      shown.set(n, val(n));
    }
  };

  // one locator per Locator control; a control whose value is a list of points gives one locator per point,
  // named name-1, name-2, … (Mathematica's {{pts, {p1, p2, …}}, …, Locator}). v0.1.24: whether the value is a list
  // of points is read from its current value, so that a body may change a point into a list of points and back
  // (Mathematica's Locator follows the variable's value); an empty list keeps the form of the initial value.
  const isMultiNow = (c) => { const v = val(c.name); return Array.isArray(v) && (v.length ? Array.isArray(v[0]) : c.multi); };
  const computeLocs = () => all.filter((c) => c.kind === 'locator').flatMap((c) => (isMultiNow(c)
    ? val(c.name).map((_, i) => ({ ...c, name: `${c.name}-${i + 1}`, variable: c.name, index: i }))
    : [{ ...c, variable: c.name, index: null }]));
  let locs = computeLocs(); // computed again when a Locator list changes its length (v0.1.23, syncLocators)
  const locOf = (n) => locs.find((l) => l.name === n);
  const getLoc = (n) => { const c = locOf(n); return c.index === null ? val(c.variable) : val(c.variable)[c.index]; };
  const placeLocator = (n, p) => {
    const c = locOf(n);
    const q = clampTo(p, c.min, c.max);
    if (c.index === null) setVar(state, c.variable, q); else val(c.variable)[c.index] = q;
  };
  const moveLocator = (n, p) => { placeLocator(n, p); run(); };
  // locators: { throttle: 'frame' }: the glyph moves at once, the body is evaluated on the next animation frame
  const moveLocatorLater = (n, p) => {
    placeLocator(n, p);
    spec.locators?.onPlace?.(n, ctx);
    locatorPanes?.forEach((l) => l.redraw());
    if (!queued) queued = requestAnimationFrame(() => { queued = 0; run(); });
  };
  const paneOf = new Map(); // picture index → its locator pane
  const rebuildLater = new Set(); // pictures whose frame changed during a drag
  const namesOn = (k) => locs.filter((c) => (c.opts.picture ?? 0) === k).map((c) => c.name);
  // v0.1.23: a Locator list whose length changed (e.g. a Button made new points) gets locators added or removed
  function syncLocators() {
    const fresh = computeLocs();
    if (fresh.length === locs.length && fresh.every((c, i) => c.name === locs[i].name)) return;
    locs = fresh;
    const names = new Set(locs.map((c) => c.name));
    for (let i = locatorGraphics.length - 1; i >= 0; i--) if (!names.has(locatorGraphics[i].name)) locatorGraphics.splice(i, 1);
    const ks = new Set([...paneOf.keys(), ...locs.map((c) => c.opts.picture ?? 0)]);
    for (const k of ks) {
      if (paneOf.has(k)) paneOf.get(k).setNames(namesOn(k));
      else { const pane = makePane(k, namesOn(k)); paneOf.set(k, pane); locatorPanes.push(pane); }
    }
  }
  // v0.1.23: picture k made again (its frame options changed); its locators move to the new picture
  function rebuildPicture(k, options) {
    rebuildLater.delete(k);
    if (locatorPanes) syncLocators(); // v0.1.24: a Locator list that changed in the same evaluation (the new pane gets the new names)
    const next = plots[k].svg.nextSibling, parent = plots[k].svg.parentNode;
    plots[k].svg.remove();
    const f = framedPicture(options, k);
    if (next) parent.insertBefore(f.plot.svg, next); // keep the element order of the container
    plots[k] = f.plot; layers[k] = f.layer; scales[k] = f.scale; frameKeys[k] = f.key;
    for (let i = locatorGraphics.length - 1; i >= 0; i--) if (locatorGraphics[i].k === k) locatorGraphics.splice(i, 1);
    if (paneOf.has(k)) {
      const old = paneOf.get(k);
      old.destroy();
      const pane = makePane(k, namesOn(k));
      paneOf.set(k, pane); locatorPanes[locatorPanes.indexOf(old)] = pane;
    }
  }
  function makeLocators() {
    locatorPanes = [];
    if (!locs.length) return;
    const byPicture = new Map();
    for (const c of locs) { const k = c.opts.picture ?? 0; if (!byPicture.has(k)) byPicture.set(k, []); byPicture.get(k).push(c); }
    for (const [k, list] of byPicture) {
      const pane = makePane(k, list.map((c) => c.name));
      paneOf.set(k, pane);
      locatorPanes.push(pane);
    }
  }
  function makePane(k, names) {
    const L = spec.locators ?? {};
    {
      const plot = plots[k];
      const scaled = !!scales[k];
      const onMove = (n, p) => (L.throttle === 'frame' ? moveLocatorLater(n, p) : moveLocator(n, p));
      return addLocators(plot, {
        names,
        get: scaled ? (n) => toWorld(k, getLoc(n)) : getLoc,
        appearance: (n) => {
          const c = locOf(n);
          const a = c.opts.Appearance;
          if (isNone(a)) return null;
          if (Array.isArray(a) || typeof a === 'function' || a?.head) { // Graphics primitives around the point
            const g = svgNode('g', { class: 'locator-appearance' });
            locatorGraphics.push({ g, plot, name: n, a, k });
            return g;
          }
          return L.appearance ? L.appearance(n, plot) : locatorGlyph(plot);
        },
        pickAnywhere: L.pickAnywhere ?? true, // Manipulate's locators form one LocatorPane
        keyStep: L.keyStep ?? 0.05,
        describe: L.describe ?? ((n) => `${n} locator; arrow keys move it`),
        onStart: tracksActive ? () => { controlActive = true; } : undefined,
        ...(scaled ? { onEnd: () => { if (rebuildLater.has(k)) requestRun(); } } : {}),
        onMove: scaled ? (n, p) => onMove(n, fromWorld(k, p)) : onMove,
        pointer: L.pointer ?? true,
        ...(L.testid ? { testid: L.testid } : {}),
      });
    }
  }

  if (plots.length && !locatorPanes) makeLocators();

  const cancelPending = () => {
    if (pending) { cancelAnimationFrame(pending); pending = 0; }
    if (queued) { cancelAnimationFrame(queued); queued = 0; }
  };
  document.getElementById(ids.reset)?.addEventListener('click', () => {
    cancelPending();
    state = spec.initialSettings ? spec.initialSettings() : initial();
    syncControls({ moved: false });
    g0.forEach((g) => g?.renderer?.reset?.());
    run();
  });

  const ctx = {
    get state() { return state; },
    set state(s) { state = s; },
    get view() { return view; },
    /** the graphics drawn by the last evaluation: graphics(k) for picture k (default 0) */
    graphics: (k = 0) => pictures[k],
    get plot() { return plots[0]; },
    plots,
    get rng() { return rng; },
    get controlActive() { return controlActive; },
    controls: apis,
    moveLocator,
    /** replace Manipulate variables and evaluate once; how = { moved } is passed to the sliders */
    setState: (partial, how) => {
      cancelPending();
      // v0.1.25: exact numbers as the saved states write them ({wl: "1/7", n: 0.142857…}) set the number and show
      // the exact text in the slider's field ("1/7", "5π/32"), as Mathematica shows an exact value until it is moved
      const exact = new Map();
      for (const [k, v] of Object.entries(partial)) { const t = isExactNumber(v) ? exactLabel(v.wl) : null; if (t !== null) exact.set(k, t); }
      partial = Object.fromEntries(Object.entries(partial).map(([k, v]) => [k, numbersOf(v)]));
      state = spec.merge ? spec.merge(state, partial) : { ...state, ...partial };
      syncControls(how, exact);
      run();
      return state;
    },
    /** [width, height] of the image drawn by ImageRaster with this Annotation id (null if none) — for tests */
    rasterSize: (id, k = 0) => {
      const img = plots[k].svg.querySelector(`[data-testid="${id}"]`);
      return img ? [Number(img.getAttribute('data-width')), Number(img.getAttribute('data-height'))] : null;
    },
    run,
    set: assign,
    /** the renderer of picture k (a picture given as { renderer }, e.g. shared/graphics3d-view.js View3D) */
    renderer: (k = 0) => g0[k]?.renderer ?? null,
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
  const flushQueued = () => { if (queued) run(); }; // run() cancels the queued frame
  const H = spec.hook ?? {};
  // hook.copy: how values leave the hook (default JSON with "Infinity"; e.g. structuredClone keeps Infinity and -0)
  const copy = H.copy ?? hookCopy;
  const read = H.copy ? (x) => structuredClone(x) : (x) => hookRead(JSON.parse(JSON.stringify(x)));
  const extras = Object.fromEntries(Object.entries(H).filter(([k]) => k !== 'view' && k !== 'copy').map(([k, f]) => [k, f(ctx)]));
  window.__demo = {
    name: spec.name,
    // a control or locator input waiting for its animation frame (throttle 'frame') is evaluated first, so the hook never
    // reads the state or view of the evaluation before (v0.1.26; the page itself still evaluates once per frame)
    getState: () => { flushQueued(); return copy(state); },
    /** replace any Manipulate variables (e.g. a snapshot's Settings) and evaluate once */
    setState: (partial, how) => copy(ctx.setState(read(partial), how)), // how: { moved: true | [names] } (v0.1.26)
    view: () => { flushQueued(); return copy(H.view ? H.view(view, state) : view); },
    /** the Graphics data of picture k as last drawn (Raw parts and functions are dropped by the copy) */
    graphics: (k = 0) => { flushQueued(); return hookCopy(pictures[k]); }, // always JSON (functions dropped), whatever hook.copy is
    /** move a locator to world point p as one front-end update (its range applies) */
    // locator and SVG-coordinate functions only where there is an SVG picture (not on pages of renderer pictures only)
    ...(plots.some(Boolean) ? {
      moveLocator: (n, p) => { moveLocator(n, p); return copy(state); },
      worldToClient: (p, k = 0) => plots[k].worldToClient(toWorld(k, p)),
    } : {}),
    controlActive: () => controlActive,
    /** fix the page clock (shared/clock.js) at t (seconds, as AbsoluteTime[]), or null for the real clock: the body's
     *  `time` (clock), the sliders' animation and app animations read it (v0.1.24 with `clock`; v0.1.25 on every page) */
    setClock: (t) => { setClock(t); },
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
