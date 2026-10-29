// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// shared/ui.js
// Minimal re-implementation of Mathematica Manipulate controls in plain DOM:
// labelled sliders (with the "+" animation panel), setter bars, a 2D slider,
// delimiters and text labels. No framework, no build step.
//
// Every interactive element gets a stable data-testid so the Playwright tests
// (tests/e2e) can find it without depending on layout or wording.
//
// Controls.slider options (all optional except name/min/max/value; the defaults keep the behaviour the first
// ten apps were built with):
//   label, step (0 = continuous), value, enabled, onInput(v), animSeconds  — as before
//   labeled  true (default): an editable value field `value-<name>`; false: no value shown;
//            'text': the value as plain, non-editable text `value-<name>` (Mathematica's Dynamic[x] beside a
//            Slider, e.g. a slider grid).
//   plus     true (default): the ⊕ button `plus-<name>` with the animation panel `anim-<name>` (play, step
//            back/forward) of a Manipulate control with Appearance -> "Labeled"; false: neither (a plain Slider,
//            ControlType -> Slider, or a Manipulate slider without the panel).
//   pauseWhenHidden  (v0.1.28) true: a playing animation stands still while the ⊕ panel is closed and goes on when it
//            is opened again (the play button keeps showing pause), as Mathematica's panel behaves (seen in
//            motion-planning, F-02); default false, the behaviour every other app was built with.
//   steps    undefined (default): user input snaps to min + round((v − min)/step)·step, rounded to 10 decimals.
//            'mma': Mathematica's discrete slider {min, max, step}: the positions are k = 0 … n with the value
//            min + k·step in machine arithmetic (k·0.05 for k = 3 is 0.15000000000000002) and the right end giving
//            max exactly (also when max is off the step grid, e.g. {0, 2.49, 0.05} ends 2.45, 2.49); the range
//            input runs on k, so a drag, the arrow keys, Home/End, the ⊕ panel and a typed value (snapped to the
//            nearest position) all land on these values (mmaGrid below). With step 0 the slider stays continuous.
//            The value field is a text field showing Mathematica's text of the value (mmaSliderText): exact
//            integers as "2", machine reals as "0.15", "1." — the values are machine reals unless min and step are
//            integers (or option realValues says otherwise), and the opening value counts as exact until the user
//            moves the slider (Mathematica shows the exact default 0 as "0" and the moved value as "0."). A whole
//            number typed into the field ("2", no point) stays exact like Mathematica's typed Integer when the
//            stored value equals it (after parse, snapping and clamping): it shows as "2", not "2.", until the next drag, key,
//            ⊕ step or typed non-integer (the format hook then receives moved = false too; isMoved() stays true).
//   realValues  (steps 'mma') whether moved values are machine reals; default: not (min and step integers).
//   format(v, {moved, k, min, max, step})  the text shown for v (value field or 'text' label), e.g. "5π/32" or
//            "1/2" with piFraction/fractionText of shared/mma-text.js; implies a text field.
//   parse(text)  a typed text → a number (null / NaN rejects the entry and restores the shown text), e.g. "5π/32"
//            → 5 for a slider over the integer n of nπ/32; the result is then clamped (and snapped with a step).
// The returned api: get(), set(v, {moved, exactText}) (programmatic, stores v as given; `exactText` (v0.1.25) is shown
// instead of the number until the value changes, unless the slider has its own format; `moved` sets what the default text
// shows, otherwise unchanged), setRange(a, b), setEnabled(b), stop(), isMoved(), row.
import { mmaNumberString } from './mma-extra.js';
import { animate } from './clock.js';

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children.flat()) if (c != null) node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return node;
}

const svgNS = 'http://www.w3.org/2000/svg';
export function svgEl(tag, attrs = {}) {
  const node = document.createElementNS(svgNS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== null) node.setAttribute(k, String(v));
  return node;
}

/** Number formatting similar to Mathematica's labelled slider display. */
export function fmt(v, step) {
  if (!Number.isFinite(v)) return String(v);
  const decimals = step && step < 1 ? Math.min(6, Math.max(0, Math.ceil(-Math.log10(step) - 1e-9))) : 0;
  const s = v.toFixed(Math.max(decimals, Number.isInteger(v) ? 0 : 3));
  return s.replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '').replace(/^-0$/, '0');
}

const snapTo = (v, min, step) => (step ? Math.round((v - min) / step) * step + min : v);
const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

/**
 * Positions of Mathematica's discrete slider {min, max, step} (step > 0): k = 0 … n with valueAt(k) = min + k·step
 * in machine arithmetic, and valueAt(n) = max. If max lies on the grid (within 1e-9 steps) the last grid point IS
 * the right end (it gives max exactly, as robot-singularities D-RS-06); otherwise the right end is one extra position
 * after the last grid point ({0, 2.49, 0.05}: …, 2.4000000000000004, 2.45, 2.49 — four-bar-linkage K-FB-06).
 * indexOf(v) is the nearest position of v (clamped to the range).
 */
export function mmaGrid(min, max, step) {
  const K = Math.floor((max - min) / step + 1e-9);
  const endOnGrid = Math.abs(min + K * step - max) <= 1e-9 * Math.abs(step);
  const n = endOnGrid ? K : K + 1;
  const valueAt = (k) => (k >= n ? max : k <= 0 ? min : min + k * step);
  const indexOf = (v) => {
    if (!(v > min)) return 0;
    if (v >= max) return n;
    const k = Math.min(Math.round((v - min) / step), n);
    if (!endOnGrid && k >= K) return Math.abs(max - v) < Math.abs(v - valueAt(K)) ? n : K;
    return k;
  };
  return { min, max, step, n, endOnGrid, valueAt, indexOf };
}

/**
 * Mathematica's text of a slider value: an exact value (the opening value of an integer slider position, or any value
 * of a slider with integer min and step) plainly ("0", "2", "0.75" for a non-integer), a moved machine real with
 * mmaNumberString ("0.", "0.15", "4.27", "1.").
 */
export function mmaSliderText(v, { moved = false, realValues = true } = {}) {
  return moved && realValues ? mmaNumberString(v, { isReal: true }) : mmaNumberString(v);
}

/**
 * Container for Manipulate-style controls.
 */
export class Controls {
  constructor(container) {
    this.root = container;
    this.controls = new Map();
  }

  heading(text) {
    const h = el('div', { class: 'ctl-heading' }, text);
    this.root.append(h);
    return h; // v0.1.26: the element (a typeset heading sets its HTML)
  }

  delimiter() {
    this.root.append(el('hr', { class: 'ctl-delimiter' }));
  }

  /**
   * Labelled slider with Mathematica's "+" panel (value field, play/pause, step).
   * opts: {name, label, min, max, step, value, labeled, enabled, onInput, animSeconds,
   *        plus, steps, realValues, format, parse}  — see the file header.
   */
  slider(opts) {
    const { name, label = '', step = 0, labeled = true, onInput, format, parse } = opts;
    const withPlus = opts.plus !== false;
    const mma = opts.steps === 'mma';
    let { min, max } = opts;
    let value = opts.value;
    let enabled = opts.enabled !== false;
    let playing = false, stopAnim = null;
    let moved = false;
    let typedExact = false; // the last user input was a typed whole number kept exact (file header, steps 'mma')
    const animSeconds = opts.animSeconds ?? 6; // time to sweep the full range
    // steps 'mma' with a step: the range input runs on the position index k (mmaGrid)
    let grid = mma && step > 0 ? mmaGrid(min, max, step) : null;
    const realValues = opts.realValues ?? !(step > 0 && Number.isInteger(min) && Number.isInteger(step));
    const textual = mma || !!format || !!parse; // the value field shows text, not an <input type=number>
    const shownMoved = () => moved && !typedExact;
    const info = () => ({ moved: shownMoved(), k: grid ? grid.indexOf(value) : undefined, min, max, step });
    let exactText = null; // v0.1.25: set({exactText}) — the text of an exact value (e.g. "1/7"), shown until the next change
    const show = (v) => (exactText !== null ? exactText : format ? format(v, info()) : mma ? mmaSliderText(v, { moved: shownMoved(), realValues }) : fmt(v, step));

    const range = grid
      ? el('input', { type: 'range', min: 0, max: grid.n, step: 1, value: grid.indexOf(value), 'data-testid': `slider-${name}`, 'aria-label': label || name })
      : el('input', {
        type: 'range', min, max, step: step || 'any', value,
        'data-testid': `slider-${name}`, 'aria-label': label || name,
      });
    let field = null;
    if (labeled === 'text') {
      field = el('span', { class: 'ctl-valuetext', 'data-testid': `value-${name}`, style: 'min-width:3em;font-size:0.82rem' }, show(value));
    } else if (labeled && textual) {
      field = el('input', {
        type: 'text', class: 'ctl-field', inputmode: 'decimal', autocomplete: 'off', spellcheck: 'false', value: show(value),
        'data-testid': `value-${name}`, 'aria-label': `${label || name} value`,
      });
    } else if (labeled) {
      field = el('input', {
        type: 'number', class: 'ctl-field', step: step || 'any', min, max, value: fmt(value, step),
        'data-testid': `value-${name}`, 'aria-label': `${label || name} value`,
      });
    }
    if (grid) range.setAttribute('aria-valuetext', show(value));
    const showField = (v) => {
      if (grid) range.setAttribute('aria-valuetext', show(v));
      if (!field) return;
      if (labeled === 'text') field.textContent = show(v);
      else field.value = textual ? show(v) : fmt(v, step);
    };
    let playBtn = null, backBtn = null, fwdBtn = null, panel = null, plus = null;
    if (withPlus) {
      playBtn = el('button', { type: 'button', class: 'ctl-btn', 'data-testid': `play-${name}`, title: 'Play / pause animation' }, '▶');
      backBtn = el('button', { type: 'button', class: 'ctl-btn', 'data-testid': `stepback-${name}`, title: 'Step back' }, '−');
      fwdBtn = el('button', { type: 'button', class: 'ctl-btn', 'data-testid': `stepfwd-${name}`, title: 'Step forward' }, '+');
      panel = el('div', { class: 'ctl-anim', hidden: true, 'data-testid': `anim-${name}` }, backBtn, playBtn, fwdBtn);
      plus = el('button', {
        type: 'button', class: 'ctl-plus', 'data-testid': `plus-${name}`, title: 'Show animation controls', 'aria-expanded': 'false',
      }, '⊕');
    }

    const row = el('div', { class: 'ctl ctl-slider', 'data-testid': `ctl-${name}` },
      label ? el('label', { class: 'ctl-label' }, label) : null,
      el('div', { class: 'ctl-line' }, range, field, plus),
      panel);
    this.root.append(row);

    // User input snaps to the slider step. Programmatic set() (fire = false)
    // stores the exact value, like a Manipulate variable assigned in code
    // (e.g. converted angles written back into disabled sliders).
    const set = (v, fire = true, typedInteger = null) => {
      v = Number(v);
      if (fire) { typedExact = false; exactText = null; }
      if (fire) {
        if (grid) v = grid.valueAt(grid.indexOf(v));
        else {
          v = clamp(snapTo(v, min, step), Math.min(min, max), Math.max(min, max));
          if (step) v = Number(v.toFixed(10));
        }
        moved = true;
        if (typedInteger !== null && v === typedInteger) typedExact = true;
      }
      value = v;
      range.value = String(grid ? grid.indexOf(v) : v);
      showField(v);
      if (fire && onInput) onInput(v);
    };
    // a position index of the mma grid (drag, keys, ⊕ panel): exactly min + k·step, max at the right end
    const setIndex = (k) => {
      k = clamp(Math.round(k), 0, grid.n);
      moved = true;
      typedExact = false;
      exactText = null;
      value = grid.valueAt(k);
      range.value = String(k);
      showField(value);
      if (onInput) onInput(value);
    };
    range.addEventListener('input', () => (grid ? setIndex(Number(range.value)) : set(range.value)));
    if (field && labeled !== 'text') {
      field.addEventListener('change', () => {
        if (!textual) return set(field.value);
        const t = field.value;
        const v = parse ? parse(t) : t.trim() === '' ? NaN : Number(t.trim().replace(/[−–]/g, '-'));
        if (v == null || !Number.isFinite(Number(v))) { showField(value); return; }
        // a whole-number literal stays exact (file header): "2" → 2 shown as "2"
        const lit = t.trim().replace(/[−–]/g, '-');
        set(Number(v), true, mma && /^-?\d+$/.test(lit) ? Number(lit) : null);
      });
    }
    // a stored value outside the range (kept by the app while the range is shorter, motion-planning F-09) steps and plays
    // from the position shown, the nearer end (v0.1.28; values inside the range are unchanged)
    const shown = () => clamp(value, Math.min(min, max), Math.max(min, max));
    const stepBy = (dir) => (grid ? setIndex(grid.indexOf(value) + dir) : set(shown() + dir * (step || (max - min) / 100)));
    let animPos = 0; // continuous position; the displayed value snaps to the step
    const snapped = (x) => (grid ? grid.valueAt(grid.indexOf(x)) : snapTo(x, min, step));
    // v0.1.25: driven by the page clock (shared/clock.js animate), so that tests can fix and step the time
    const tick = (t, dt) => {
      if (!playing) return false;
      // pauseWhenHidden (v0.1.28): with the ⊕ panel closed the animation stands still and goes on when it is opened
      // again, still playing (Mathematica does not update a Dynamic that is not displayed; motion-planning F-02)
      if (opts.pauseWhenHidden && panel?.hidden) return true;
      animPos += ((max - min) * dt) / animSeconds;
      if (animPos > max) animPos = min + (animPos - max); // loop like Manipulate's default animator
      if (snapped(animPos) !== value) set(animPos);
      return true;
    };
    if (withPlus) {
      plus.addEventListener('click', () => {
        panel.hidden = !panel.hidden;
        plus.setAttribute('aria-expanded', String(!panel.hidden));
      });
      backBtn.addEventListener('click', () => stepBy(-1));
      fwdBtn.addEventListener('click', () => stepBy(+1));
      playBtn.addEventListener('click', () => {
        playing = !playing;
        playBtn.textContent = playing ? '❚❚' : '▶';
        playBtn.setAttribute('aria-pressed', String(playing));
        animPos = shown();
        stopAnim?.(); stopAnim = playing ? animate(tick) : null;
      });
    }

    const api = {
      get: () => value,
      set: (v, how) => {
        if (how && 'moved' in how) { moved = !!how.moved; typedExact = false; }
        exactText = format ? null : how?.exactText ?? null; // shown until the value changes (v0.1.25); a format keeps its own text
        set(v, false);
      },
      setRange: (a, b) => {
        min = a; max = b;
        if (grid) {
          grid = mmaGrid(a, b, step);
          range.max = String(grid.n);
        } else {
          range.min = String(a); range.max = String(b);
        }
        if (field && field.type === 'number') { field.min = String(a); field.max = String(b); }
        set(value, false);
      },
      setEnabled: (b) => {
        enabled = b;
        // a playing animation stops when the slider is disabled: before v0.1.28 the click came after `disabled` was set
        // and did nothing, so the animation went on (found with motion-planning F-09)
        if (!b && playing) playBtn.click();
        for (const n of [range, field, playBtn, backBtn, fwdBtn]) if (n && n.tagName !== 'SPAN') n.disabled = !b;
        row.classList.toggle('is-disabled', !b);
      },
      stop: () => { if (playing) playBtn.click(); },
      isMoved: () => moved,
      row,
    };
    api.setEnabled(enabled);
    this.controls.set(name, api);
    return api;
  }

  /** SetterBar: one button per option. opts: {name, label, options:[{value,label}], value, onChange} */
  setterBar(opts) {
    const { name, label = '', options, onChange } = opts;
    let value = opts.value;
    const buttons = options.map((o) => el('button', {
      type: 'button', class: 'ctl-setter-btn', 'data-testid': `setter-${name}-${String(o.value).replace(/\s+/g, '-')}`,
      'aria-pressed': String(o.value === value),
    }, o.label ?? String(o.value)));
    const row = el('div', { class: 'ctl ctl-setter', 'data-testid': `ctl-${name}` },
      label ? el('label', { class: 'ctl-label' }, label) : null,
      el('div', { class: 'ctl-setter-group', role: 'group', 'aria-label': label || name }, buttons));
    this.root.append(row);
    const set = (v, fire = true) => {
      value = v;
      buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(options[i].value === v)));
      if (fire && onChange) onChange(v);
    };
    buttons.forEach((b, i) => b.addEventListener('click', () => set(options[i].value)));
    const api = {
      get: () => value, set: (v) => set(v, false), row,
      setEnabled: (b) => { buttons.forEach((n) => { n.disabled = !b; }); row.classList.toggle('is-disabled', !b); },
    };
    this.controls.set(name, api);
    return api;
  }

  /**
   * 2D slider (Mathematica Slider2D): opts {name, label, min:[x,y], max:[x,y], value:[x,y], enabled, onInput}
   */
  slider2D(opts) {
    const { name, label = '', onInput } = opts;
    const [x0, y0] = opts.min, [x1, y1] = opts.max;
    let value = [...opts.value];
    let enabled = opts.enabled !== false;
    const W = 150, H = 150 * ((y1 - y0) / (x1 - x0)) + 0;
    const h = Math.max(70, Math.round(H));
    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${h}`, width: W, height: h, class: 'ctl-pad', 'data-testid': `pad-${name}`, role: 'slider', 'aria-label': label || name, tabindex: 0 });
    svg.append(svgEl('rect', { x: 0.5, y: 0.5, width: W - 1, height: h - 1, rx: 3, class: 'pad-bg' }));
    svg.append(svgEl('line', { x1: W / 2, y1: 0, x2: W / 2, y2: h, class: 'pad-grid' }));
    svg.append(svgEl('line', { x1: 0, y1: h / 2, x2: W, y2: h / 2, class: 'pad-grid' }));
    const thumb = svgEl('circle', { r: 5, class: 'pad-thumb' });
    svg.append(thumb);
    const fx = el('input', { type: 'number', class: 'ctl-field', step: 'any', 'data-testid': `value-${name}-x`, 'aria-label': `${label} x` });
    const fy = el('input', { type: 'number', class: 'ctl-field', step: 'any', 'data-testid': `value-${name}-y`, 'aria-label': `${label} y` });
    const row = el('div', { class: 'ctl ctl-pad2d', 'data-testid': `ctl-${name}` },
      label ? el('label', { class: 'ctl-label' }, label) : null,
      el('div', { class: 'ctl-line' }, svg, el('div', { class: 'ctl-pad-fields' }, el('span', {}, '{'), fx, el('span', {}, ','), fy, el('span', {}, '}'))));
    this.root.append(row);
    const toPx = ([x, y]) => [((x - x0) / (x1 - x0)) * W, h - ((y - y0) / (y1 - y0)) * h];
    const draw = () => {
      const [px, py] = toPx(value);
      thumb.setAttribute('cx', px); thumb.setAttribute('cy', py);
      fx.value = fmt(value[0], 0.001); fy.value = fmt(value[1], 0.001);
    };
    const set = (v, fire = true) => {
      value = [clamp(Number(v[0]), x0, x1), clamp(Number(v[1]), y0, y1)];
      draw();
      if (fire && onInput) onInput([...value]);
    };
    const fromEvent = (e) => {
      const r = svg.getBoundingClientRect();
      const px = ((e.clientX - r.left) / r.width) * W, py = ((e.clientY - r.top) / r.height) * h;
      // Mathematica Slider2D default step is continuous; round display to 0.01 like the original
      return [Math.round((x0 + (px / W) * (x1 - x0)) * 100) / 100, Math.round((y0 + ((h - py) / h) * (y1 - y0)) * 100) / 100];
    };
    let dragging = false;
    svg.addEventListener('pointerdown', (e) => { if (!enabled) return; dragging = true; svg.setPointerCapture(e.pointerId); set(fromEvent(e)); });
    svg.addEventListener('pointermove', (e) => { if (dragging) set(fromEvent(e)); });
    svg.addEventListener('pointerup', () => { dragging = false; });
    fx.addEventListener('change', () => set([fx.value, value[1]]));
    fy.addEventListener('change', () => set([value[0], fy.value]));
    draw();
    const api = {
      get: () => [...value],
      set: (v) => set(v, false),
      setEnabled: (b) => {
        enabled = b; fx.disabled = !b; fy.disabled = !b;
        row.classList.toggle('is-disabled', !b);
        svg.setAttribute('aria-disabled', String(!b));
      },
      row,
    };
    api.setEnabled(enabled);
    this.controls.set(name, api);
    return api;
  }
}

/** Page chrome shared by the demos: caption + details toggling, reset button. */
export function wireReset(button, fn) {
  button.addEventListener('click', fn);
}
