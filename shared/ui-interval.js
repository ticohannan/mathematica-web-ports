// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// shared/ui-interval.js — Mathematica's IntervalSlider as a Manipulate control, in plain DOM (COMMON-DECISIONS §6;
// specified by the four-bar-linkage draft F-FB-02 / §6 and the manipulator-workspaces draft F-MW-02 / §6).
//
//   addIntervalSlider(controls, {name, label, min, max, step, steps: 'mma', value: [lo, hi], minIntervalSize,
//                                method: 'Push' | 'Stop' | 'Free', labeled, format, barDrag, trackPress, look, onInput,
//                                parent})
//
// Semantics (Wolfram Language documentation of IntervalSlider, reference.wolfram.com/language/ref/IntervalSlider):
//  - two thumbs on {min, max, step}; with a step the values are Mathematica's discrete slider values
//    min + k·step in machine arithmetic, the right end giving max (the positions of shared/ui.js mmaGrid; the
//    four-bar draft's {0, 2.49, 0.05} therefore ends …, 2.45, 2.49 — lead K-FB-06/K-FB-10); step 0 = continuous;
//  - MinIntervalSize: "how close the two endpoints can be to each other" (default 0);
//  - Method: "Free" (default: "when trying to drag one endpoint past the other, the default method will not stop
//    you"), "Push" ("the dragging of one endpoint pushes the other out of the way"), "Stop" ("you cannot drag one
//    endpoint past the other"). A pushed thumb goes to the nearest position that keeps MinIntervalSize; when it
//    reaches the end of the range both stop, the pushing thumb MinIntervalSize before the end (T-FB-21, T-MW-22).
//    The gap test is tolerant by 1e-9 of a step, so 1.6 − 1.5000000000000004 counts as 0.1 (T-MW-21) while the
//    off-grid end 2.49 − 2.4000000000000004 = 0.09 does not (T-FB-21) — an ASSUMPTION within the drafts' cases;
//  - Appearance -> "Labeled": the value "{lo, hi}" beside the slider (`labeled: true`), each number as
//    Mathematica shows it: an exact opening integer plainly ("{1.35, 2}"), a moved value as a machine real
//    (mmaNumberString: "2.", "2.05"); set(value, {exact}) states the exactness of values loaded from a saved state.
//    (Mathematica's label is an editable field; this port shows text — four-bar D-FB-03.)
// Port behaviour where the documentation is silent (leads K-MW-01, M-FB-05, M-MW-04): a press on a thumb drags it;
// a press on the highlighted bar between the thumbs drags both by whole steps, keeping their distance in positions
// (`barDrag`, default true); a press elsewhere on the track does nothing, or, with `trackPress: true`, moves the nearer
// thumb there (ties: the lower one) with the Method rule and drags it (four-bar D-FB-05); arrow keys move a focused thumb by one
// position (Right/Up +1, Left/Down −1, Page Up/Down ±10, Home/End to the range ends), with the Method rule.
// Mathematica's slower fine drag with a modifier key is not reproduced.
// One onInput([lo, hi]) per change of the value (pointer events arrive at most once per frame in the browsers).
// Look: by default a light track with a dark bar between the thumbs; `look: 'mma'` draws the IntervalSlider as the
// four-bar snapshots show it (a grey track with a dark outline, the part between the thumbs white with the same
// outline; measured at 2×: outline (109, 109, 109), track (164, 164, 164), about 5 px high).
// Test ids: container `islider-<name>`, thumbs `islider-<name>-lo` / `islider-<name>-hi` (role="slider", focusable),
// the shown value `value-<name>` (only with `labeled`), the row `ctl-<name>`.
import { el, mmaGrid } from './ui.js';
import { mmaNumberString } from './mma-extra.js';

const clampTo = (v, a, b) => Math.min(Math.max(v, a), b);

/** The positions of an interval slider: a discrete mmaGrid or a continuous range. */
function positions({ min, max, step = 0 }) {
  if (step > 0) {
    const g = mmaGrid(min, max, step);
    return { ...g, snap: (x) => g.valueAt(g.indexOf(x)) };
  }
  return { min, max, step: 0, n: null, valueAt: (x) => x, indexOf: (x) => clampTo(x, min, max), snap: (x) => clampTo(x, min, max) };
}

/**
 * One move of a thumb, as a pure function: value [lo, hi]; which 'lo' | 'hi'; target the pointer (or key) value
 * of that thumb in slider units; spec {min, max, step, minIntervalSize = 0, method = 'Free'}. Returns the new
 * [lo, hi] (positions of the grid when step > 0).
 */
export function intervalStep(value, which, target, spec) {
  const P = positions(spec);
  const m = spec.minIntervalSize ?? 0;
  const method = spec.method ?? 'Free';
  const tol = 1e-9 * (spec.step > 0 ? spec.step : Math.abs(spec.max - spec.min));
  const gapOK = (a, b) => b - a >= m - tol;
  // smallest position >= x, largest position <= x (tolerant), or null
  const ceilPos = (x) => {
    if (P.n == null) return x <= spec.max + tol ? Math.max(x, spec.min) : null;
    for (let k = 0; k <= P.n; k++) if (P.valueAt(k) >= x - tol) return P.valueAt(k);
    return null;
  };
  const floorPos = (x) => {
    if (P.n == null) return x >= spec.min - tol ? Math.min(x, spec.max) : null;
    for (let k = P.n; k >= 0; k--) if (P.valueAt(k) <= x + tol) return P.valueAt(k);
    return null;
  };
  let [lo, hi] = value;
  const t = P.snap(target);
  if (which === 'lo') {
    if (method === 'Free') return t <= hi ? [t, hi] : [hi, t];
    if (gapOK(t, hi)) return [t, hi];
    if (method === 'Stop') { const s = floorPos(hi - m); return s == null ? [lo, hi] : [Math.max(Math.min(s, t), spec.min), hi]; }
    const h = ceilPos(t + m);
    if (h != null) return [t, h];
    const top = P.valueAt(P.n ?? spec.max);
    return [floorPos(top - m) ?? spec.min, top];
  }
  if (method === 'Free') return t >= lo ? [lo, t] : [t, lo];
  if (gapOK(lo, t)) return [lo, t];
  if (method === 'Stop') { const s = ceilPos(lo + m); return s == null ? [lo, hi] : [lo, Math.min(Math.max(s, t), spec.max)]; }
  const l = floorPos(t - m);
  if (l != null) return [l, t];
  const bottom = P.valueAt(0);
  return [bottom, ceilPos(bottom + m) ?? spec.max];
}

/**
 * Both thumbs moved together by dk positions (a drag of the bar between them), keeping their distance in
 * positions and stopping at the range ends. Continuous sliders move by dk slider units.
 */
export function intervalShift(value, dk, spec) {
  const P = positions(spec);
  if (P.n == null) {
    const d = clampTo(dk, spec.min - value[0], spec.max - value[1]);
    return [value[0] + d, value[1] + d];
  }
  const a = P.indexOf(value[0]), b = P.indexOf(value[1]);
  const d = clampTo(Math.round(dk), -a, P.n - b);
  return d === 0 ? [...value] : [P.valueAt(a + d), P.valueAt(b + d)];
}

/** The label of Appearance -> "Labeled": "{1.35, 2}"; exact = [bool, bool] (an exact number has no trailing point). */
export function intervalLabel([lo, hi], exact = [Number.isInteger(lo), Number.isInteger(hi)]) {
  const s = (v, ex) => mmaNumberString(v, { isReal: !ex || !Number.isInteger(v) });
  return `{${s(lo, exact[0])}, ${s(hi, exact[1])}}`;
}

export function addIntervalSlider(controls, opts) {
  const { name, label = '', min, max, step = 0, minIntervalSize = 0, method = 'Free', labeled = false, onInput, parent } = opts;
  const barDrag = opts.barDrag !== false;
  const spec = { min, max, step: opts.steps === 'mma' || step > 0 ? step : 0, minIntervalSize, method };
  const P = positions(spec);
  let value = [...opts.value];
  let exact = [Number.isInteger(value[0]), Number.isInteger(value[1])];
  let enabled = opts.enabled !== false;
  const text = () => (opts.format ? opts.format([...value], { exact: [...exact] }) : intervalLabel(value, exact));

  const TH = 14; // thumb width in px
  const mmaLook = opts.look === 'mma';
  const trackStyle = mmaLook
    ? 'height:5px;margin-top:-2.5px;background:#a4a4a4;border:1px solid #6d6d6d;box-sizing:border-box;border-radius:2.5px'
    : 'height:4px;margin-top:-2px;background:#c9cdd2;border-radius:2px';
  const barStyle = mmaLook
    ? 'height:5px;margin-top:-2.5px;background:#fff;border-top:1px solid #6d6d6d;border-bottom:1px solid #6d6d6d;box-sizing:border-box'
    : 'height:6px;margin-top:-3px;background:#5a6b80;border-radius:2px';
  const track = el('div', { class: 'islider-track', style: `position:absolute;left:0;right:0;top:50%;${trackStyle}` });
  const bar = el('div', { class: 'islider-bar', 'data-testid': `islider-${name}-bar`, style: `position:absolute;top:50%;${barStyle};cursor:grab` });
  const thumb = (which) => el('div', {
    class: `islider-thumb islider-thumb-${which}`, role: 'slider', tabindex: 0, 'data-testid': `islider-${name}-${which}`,
    'aria-label': `${label || name} ${which === 'lo' ? 'lower' : 'upper'} end`, 'aria-valuemin': min, 'aria-valuemax': max,
    // the lower thumb hangs below the track, the upper one stands above it (as in the originals' pictures)
    style: `position:absolute;width:${TH}px;height:11px;margin-left:${-TH / 2}px;background:#fff;border:1px solid #5a6b80;`
      + `box-sizing:border-box;cursor:ew-resize;touch-action:none;${which === 'lo' ? 'top:50%;border-radius:0 0 4px 4px' : 'bottom:50%;border-radius:4px 4px 0 0'}`,
  });
  const lo = thumb('lo'), hi = thumb('hi');
  const box = el('div', {
    class: 'islider', 'data-testid': `islider-${name}`, role: 'group', 'aria-label': label || name,
    style: `position:relative;flex:1 1 auto;min-width:120px;height:26px;margin:0 ${TH / 2}px;touch-action:none;user-select:none`,
  }, track, bar, lo, hi);
  // a fixed-width label, so that the track does not change size while the value text changes during a drag
  const out = labeled ? el('span', { class: 'ctl-valuetext', 'data-testid': `value-${name}`, style: 'flex:0 0 auto;min-width:8.5em;font-size:0.82rem;white-space:nowrap' }) : null;
  const row = el('div', { class: 'ctl ctl-islider', 'data-testid': `ctl-${name}` },
    label ? el('label', { class: 'ctl-label' }, label) : null,
    el('div', { class: 'ctl-line' }, box, out));
  (parent ?? controls.root).append(row);

  const frac = (v) => (max === min ? 0 : (v - min) / (max - min));
  const draw = () => {
    const a = frac(value[0]) * 100, b = frac(value[1]) * 100;
    lo.style.left = `${a}%`; hi.style.left = `${b}%`;
    bar.style.left = `${a}%`; bar.style.width = `${Math.max(0, b - a)}%`;
    const t = text();
    for (const [n, v] of [[lo, value[0]], [hi, value[1]]]) { n.setAttribute('aria-valuenow', String(v)); n.setAttribute('aria-valuetext', t); }
    if (out) out.textContent = t;
  };
  // a thumb whose value changes becomes a machine real (shown "2." instead of the exact "2")
  const commit = (next) => {
    const changed = [next[0] !== value[0], next[1] !== value[1]];
    exact = exact.map((x, i) => x && !changed[i]);
    value = next;
    draw();
    if ((changed[0] || changed[1]) && onInput) onInput([...value]);
  };
  const move = (which, target) => commit(intervalStep(value, which, target, spec));

  // ---- pointer: thumbs and bar; listeners on window while dragging (no pointer capture needed)
  let drag = null;
  // the track's position is read once per drag (layout changes during the drag do not move the scale)
  const pointerValue = (e) => {
    const r = drag?.rect ?? box.getBoundingClientRect();
    return min + clampTo((e.clientX - r.left) / Math.max(1, r.width), 0, 1) * (max - min);
  };
  const onMove = (e) => {
    if (!drag) return;
    e.preventDefault();
    if (drag.which === 'bar') {
      const dv = pointerValue(e) - drag.v0;
      const dk = spec.step > 0 ? Math.round(dv / spec.step) : dv;
      commit(intervalShift(drag.value0, dk, spec));
    } else {
      move(drag.which, pointerValue(e));
      // Free: a thumb dragged past the other continues as the other end
      if (method === 'Free') drag.which = Math.abs(pointerValue(e) - value[0]) <= Math.abs(pointerValue(e) - value[1]) ? 'lo' : 'hi';
    }
  };
  const onUp = () => {
    drag = null;
    bar.style.cursor = 'grab';
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
  };
  const start = (which, e) => {
    if (!enabled || e.button > 0) return;
    e.preventDefault();
    e.stopPropagation();
    (which === 'bar' ? (value[0] <= value[1] ? lo : hi) : which === 'lo' ? lo : hi).focus({ preventScroll: true });
    drag = { which, rect: box.getBoundingClientRect(), value0: [...value] };
    drag.v0 = pointerValue(e);
    if (which === 'bar') bar.style.cursor = 'grabbing';
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };
  lo.addEventListener('pointerdown', (e) => start('lo', e));
  hi.addEventListener('pointerdown', (e) => start('hi', e));
  bar.addEventListener('pointerdown', (e) => { if (barDrag) start('bar', e); });
  if (opts.trackPress) {
    box.addEventListener('pointerdown', (e) => {
      if (!enabled || e.button > 0 || drag) return;
      const r = box.getBoundingClientRect();
      const v = min + clampTo((e.clientX - r.left) / Math.max(1, r.width), 0, 1) * (max - min);
      const which = Math.abs(v - value[0]) <= Math.abs(v - value[1]) ? 'lo' : 'hi';
      start(which, e);
      move(which, v);
    });
  }

  // ---- keyboard on a focused thumb
  const keyStep = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 10, PageDown: -10 };
  const onKey = (which) => (e) => {
    if (!enabled) return;
    const i = which === 'lo' ? 0 : 1;
    let target;
    if (e.key in keyStep) {
      const d = keyStep[e.key];
      target = P.n == null ? value[i] + d * (max - min) / 100 : P.valueAt(clampTo(P.indexOf(value[i]) + d, 0, P.n));
    } else if (e.key === 'Home') target = min;
    else if (e.key === 'End') target = max;
    else return;
    e.preventDefault();
    move(which, target);
  };
  lo.addEventListener('keydown', onKey('lo'));
  hi.addEventListener('keydown', onKey('hi'));

  draw();
  const api = {
    get: () => [...value],
    /** programmatic assignment (no onInput), e.g. a saved state; how.exact = [bool, bool] (default: integers exact) */
    set: (v, how = {}) => {
      value = [Number(v[0]), Number(v[1])];
      exact = how.exact ? [...how.exact] : [Number.isInteger(value[0]), Number.isInteger(value[1])];
      draw();
    },
    text,
    setEnabled: (b) => {
      enabled = b;
      for (const n of [lo, hi]) { n.setAttribute('aria-disabled', String(!b)); n.tabIndex = b ? 0 : -1; }
      row.classList.toggle('is-disabled', !b);
      if (!b) onUp();
    },
    row,
  };
  api.setEnabled(enabled);
  controls.controls.set(name, api);
  return api;
}
