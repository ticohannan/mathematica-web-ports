// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// shared/ui.js
// Minimal re-implementation of Mathematica Manipulate controls in plain DOM:
// labelled sliders (with the "+" animation panel), setter bars, a 2D slider,
// delimiters and text labels. No framework, no build step.
//
// Every interactive element gets a stable data-testid so the Playwright tests
// (tests/e2e) can find it without depending on layout or wording.

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
 * Container for Manipulate-style controls.
 */
export class Controls {
  constructor(container) {
    this.root = container;
    this.controls = new Map();
  }

  heading(text) {
    this.root.append(el('div', { class: 'ctl-heading' }, text));
  }

  delimiter() {
    this.root.append(el('hr', { class: 'ctl-delimiter' }));
  }

  /**
   * Labelled slider with Mathematica's "+" panel (value field, play/pause, step).
   * opts: {name, label, min, max, step, value, labeled, enabled, onInput, animSeconds}
   */
  slider(opts) {
    const { name, label = '', step = 0, labeled = true, onInput } = opts;
    let { min, max } = opts;
    let value = opts.value;
    let enabled = opts.enabled !== false;
    let playing = false, raf = 0, lastT = 0;
    const animSeconds = opts.animSeconds ?? 6; // time to sweep the full range

    const range = el('input', {
      type: 'range', min, max, step: step || 'any', value,
      'data-testid': `slider-${name}`, 'aria-label': label || name,
    });
    const field = el('input', {
      type: 'number', class: 'ctl-field', step: step || 'any', min, max, value: fmt(value, step),
      'data-testid': `value-${name}`, 'aria-label': `${label || name} value`,
    });
    const playBtn = el('button', { type: 'button', class: 'ctl-btn', 'data-testid': `play-${name}`, title: 'Play / pause animation' }, '▶');
    const backBtn = el('button', { type: 'button', class: 'ctl-btn', 'data-testid': `stepback-${name}`, title: 'Step back' }, '−');
    const fwdBtn = el('button', { type: 'button', class: 'ctl-btn', 'data-testid': `stepfwd-${name}`, title: 'Step forward' }, '+');
    const panel = el('div', { class: 'ctl-anim', hidden: true, 'data-testid': `anim-${name}` }, backBtn, playBtn, fwdBtn);
    const plus = el('button', {
      type: 'button', class: 'ctl-plus', 'data-testid': `plus-${name}`, title: 'Show animation controls', 'aria-expanded': 'false',
    }, '⊕');

    const row = el('div', { class: 'ctl ctl-slider', 'data-testid': `ctl-${name}` },
      label ? el('label', { class: 'ctl-label' }, label) : null,
      el('div', { class: 'ctl-line' }, range, labeled ? field : null, plus),
      panel);
    this.root.append(row);

    // User input snaps to the slider step. Programmatic set() (fire = false)
    // stores the exact value, like a Manipulate variable assigned in code
    // (e.g. converted angles written back into disabled sliders).
    const set = (v, fire = true) => {
      v = Number(v);
      if (fire) {
        v = clamp(snapTo(v, min, step), Math.min(min, max), Math.max(min, max));
        if (step) v = Number(v.toFixed(10));
      }
      value = v;
      range.value = String(v);
      field.value = fmt(v, step);
      if (fire && onInput) onInput(v);
    };
    range.addEventListener('input', () => set(range.value));
    field.addEventListener('change', () => set(field.value));
    plus.addEventListener('click', () => {
      panel.hidden = !panel.hidden;
      plus.setAttribute('aria-expanded', String(!panel.hidden));
    });
    const stepBy = (dir) => set(value + dir * (step || (max - min) / 100));
    backBtn.addEventListener('click', () => stepBy(-1));
    fwdBtn.addEventListener('click', () => stepBy(+1));
    let animPos = 0; // continuous position; the displayed value snaps to the step
    const tick = (t) => {
      if (!playing) return;
      const dt = lastT ? (t - lastT) / 1000 : 0;
      lastT = t;
      animPos += ((max - min) * dt) / animSeconds;
      if (animPos > max) animPos = min + (animPos - max); // loop like Manipulate's default animator
      if (snapTo(animPos, min, step) !== value) set(animPos);
      raf = requestAnimationFrame(tick);
    };
    playBtn.addEventListener('click', () => {
      playing = !playing;
      playBtn.textContent = playing ? '❚❚' : '▶';
      playBtn.setAttribute('aria-pressed', String(playing));
      lastT = 0;
      animPos = value;
      if (playing) raf = requestAnimationFrame(tick); else cancelAnimationFrame(raf);
    });

    const api = {
      get: () => value,
      set: (v) => set(v, false),
      setRange: (a, b) => {
        min = a; max = b;
        range.min = String(a); range.max = String(b);
        field.min = String(a); field.max = String(b);
        set(value, false);
      },
      setEnabled: (b) => {
        enabled = b;
        for (const n of [range, field, playBtn, backBtn, fwdBtn]) n.disabled = !b;
        row.classList.toggle('is-disabled', !b);
        if (!b && playing) playBtn.click();
      },
      stop: () => { if (playing) playBtn.click(); },
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
    const api = { get: () => value, set: (v) => set(v, false), row };
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
