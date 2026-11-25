// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original (ECE 6311 Lecture 22 notebook) by Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/potential-fields/obstacle-pad.js — the obstacles' control (Dr. Becker's request of 2026-11-24): one pad for all
// the obstacles of a tab, each a locator in its own colour, with buttons to add and remove locators. A factory for
// Control(...) of shared/manipulate.js: factory(controls, { name, label, value, onInput, parent, … }) →
// { get, set, setEnabled, row }. The value is the list of the obstacles' points.
//
// Pointer: a press on a locator drags it; a press elsewhere moves the nearest locator there (as LocatorPane). Keys on a
// focused locator: arrows move it by 0.1 (Shift: 0.5), Delete or Backspace removes it. The x and y fields show and set
// the selected locator (the one last pressed, focused or added), which "Remove" removes.
import { el, svgEl, fmt } from '../../shared/ui.js';

/** Mathematica's default plot colours, ColorData[97], one per locator in order (at most eight obstacles). */
export const OBSTACLE_COLORS = Object.freeze([
  '#5e81b5', '#e19c24', '#8fb032', '#eb6235', '#8778b3', '#c56e1a', '#5d9ec7', '#ffbf00',
]);
export const MAX_OBSTACLES = OBSTACLE_COLORS.length;

/** Where "Add" puts a new obstacle: the first of these spots at least 1 away from every obstacle (else the origin). */
const SPOTS = [[2, -2], [-2, -2], [2, 2], [-2, 2], [0, -3], [3, 0], [0, 3], [-3, 0], [0, 0]];
export function nextSpot(points) {
  for (const p of SPOTS) if (points.every((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) >= 1)) return [...p];
  return [0, 0];
}

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const round2 = (v) => Math.round(v * 100) / 100;

export function obstaclePad(controls, opts) {
  const { name, label = '', onInput, parent } = opts;
  const [x0, y0] = opts.min ?? [-4, -4], [x1, y1] = opts.max ?? [4, 4];
  const minCount = opts.minCount ?? 1, maxCount = Math.min(opts.maxCount ?? MAX_OBSTACLES, MAX_OBSTACLES);
  let points = opts.value.map((p) => [...p]);
  let selected = points.length - 1;
  let enabled = true;
  const W = 150, H = Math.round(150 * ((y1 - y0) / (x1 - x0)));
  const toPx = ([x, y]) => [((x - x0) / (x1 - x0)) * W, H - ((y - y0) / (y1 - y0)) * H];

  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, class: 'ctl-pad pf-obstacles', 'data-testid': `pad-${name}`, role: 'group', 'aria-label': `${label || 'obstacles'}: drag a locator, or press the pad to move the nearest one` });
  svg.append(svgEl('rect', { x: 0.5, y: 0.5, width: W - 1, height: H - 1, rx: 3, class: 'pad-bg' }));
  svg.append(svgEl('line', { x1: W / 2, y1: 0, x2: W / 2, y2: H, class: 'pad-grid' }));
  svg.append(svgEl('line', { x1: 0, y1: H / 2, x2: W, y2: H / 2, class: 'pad-grid' }));
  const layer = svgEl('g', {});
  svg.append(layer);
  const swatch = el('span', { class: 'pf-swatch', 'aria-hidden': 'true' });
  const fx = el('input', { type: 'number', class: 'ctl-field', step: 'any', 'data-testid': `value-${name}-x`, 'aria-label': `${label || 'obstacle'} x` });
  const fy = el('input', { type: 'number', class: 'ctl-field', step: 'any', 'data-testid': `value-${name}-y`, 'aria-label': `${label || 'obstacle'} y` });
  const add = el('button', { type: 'button', class: 'ctl-button', 'data-testid': `add-${name}` }, 'Add');
  const remove = el('button', { type: 'button', class: 'ctl-button', 'data-testid': `remove-${name}` }, 'Remove');
  const count = el('span', { class: 'pf-count', 'data-testid': `count-${name}`, 'aria-live': 'polite' });
  const row = el('div', { class: 'ctl ctl-pad2d pf-obstacle-ctl', 'data-testid': `ctl-${name}` },
    label ? el('label', { class: 'ctl-label' }, label) : null,
    el('div', { class: 'ctl-line' }, svg,
      el('div', { class: 'pf-obstacle-side' },
        el('div', { class: 'ctl-pad-fields' }, swatch, el('span', {}, '{'), fx, el('span', {}, ','), fy, el('span', {}, '}')),
        el('div', { class: 'pf-obstacle-buttons' }, add, remove), count)));
  (parent ?? controls.root).append(row);

  let dots = [];
  const fire = () => onInput && onInput(points.map((p) => [...p]));
  const describe = (i) => `obstacle ${i + 1}: x ${fmt(points[i][0], 0.01)}, y ${fmt(points[i][1], 0.01)}`;
  function build() {
    const focused = dots.indexOf(document.activeElement);
    layer.replaceChildren();
    dots = points.map((_, i) => {
      const c = svgEl('circle', { r: 6, class: 'pf-locator', fill: OBSTACLE_COLORS[i], tabindex: enabled ? 0 : -1, role: 'slider', 'data-testid': `locator-${name}-${i + 1}`, 'aria-label': `obstacle ${i + 1}` });
      c.addEventListener('focus', () => { selected = i; draw(); });
      c.addEventListener('keydown', (e) => onKey(e, i));
      layer.append(c);
      return c;
    });
    if (focused >= 0 && dots[Math.min(focused, dots.length - 1)]) dots[Math.min(focused, dots.length - 1)].focus();
    draw();
  }
  function draw() {
    selected = clamp(selected, 0, points.length - 1);
    points.forEach((p, i) => {
      const [px, py] = toPx(p), c = dots[i];
      c.setAttribute('cx', px); c.setAttribute('cy', py);
      c.classList.toggle('is-selected', i === selected);
      c.setAttribute('aria-valuetext', describe(i));
    });
    const p = points[selected];
    fx.value = p ? fmt(p[0], 0.001) : ''; fy.value = p ? fmt(p[1], 0.001) : '';
    swatch.style.background = p ? OBSTACLE_COLORS[selected] : 'transparent';
    count.textContent = `${points.length} obstacle${points.length === 1 ? '' : 's'}`;
    add.disabled = !enabled || points.length >= maxCount;
    remove.disabled = !enabled || points.length <= minCount;
    fx.disabled = fy.disabled = !enabled || !p;
  }
  const move = (i, p) => { points[i] = [clamp(Number(p[0]), x0, x1), clamp(Number(p[1]), y0, y1)]; draw(); fire(); };
  function removeAt(i) {
    if (!enabled || points.length <= minCount) return;
    points.splice(i, 1);
    selected = Math.min(i, points.length - 1);
    build(); fire();
  }
  function onKey(e, i) {
    if (!enabled) return;
    const d = e.shiftKey ? 0.5 : 0.1;
    const step = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, d], ArrowDown: [0, -d] }[e.key];
    if (step) { e.preventDefault(); selected = i; move(i, [round2(points[i][0] + step[0]), round2(points[i][1] + step[1])]); return; }
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); removeAt(i); }
  }
  const fromEvent = (e) => {
    const r = svg.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W, py = ((e.clientY - r.top) / r.height) * H;
    return [round2(x0 + (px / W) * (x1 - x0)), round2(y0 + ((H - py) / H) * (y1 - y0))];
  };
  let dragging = -1;
  svg.addEventListener('pointerdown', (e) => {
    if (!enabled || !points.length) return;
    const p = fromEvent(e);
    const hit = dots.indexOf(e.target); // a press on a locator takes it, else the nearest
    let i = hit;
    if (i < 0) { let best = Infinity; points.forEach((q, k) => { const dd = Math.hypot(q[0] - p[0], q[1] - p[1]); if (dd < best) { best = dd; i = k; } }); }
    dragging = i; selected = i;
    svg.setPointerCapture?.(e.pointerId);
    e.preventDefault();
    dots[i].focus({ preventScroll: true });
    move(i, p);
  });
  svg.addEventListener('pointermove', (e) => { if (dragging >= 0) move(dragging, fromEvent(e)); });
  const stop = () => { dragging = -1; };
  svg.addEventListener('pointerup', stop);
  svg.addEventListener('pointercancel', stop);
  fx.addEventListener('change', () => points[selected] && move(selected, [fx.value, points[selected][1]]));
  fy.addEventListener('change', () => points[selected] && move(selected, [points[selected][0], fy.value]));
  add.addEventListener('click', () => {
    if (!enabled || points.length >= maxCount) return;
    points.push(nextSpot(points));
    selected = points.length - 1;
    build(); fire();
  });
  remove.addEventListener('click', () => removeAt(selected));
  build();

  const api = {
    get: () => points.map((p) => [...p]),
    set: (v) => { points = v.map((p) => [...p]); selected = Math.min(selected, points.length - 1); build(); },
    setEnabled: (b) => { enabled = b; row.classList.toggle('is-disabled', !b); build(); },
    row,
  };
  controls.controls?.set?.(name, api);
  return api;
}
