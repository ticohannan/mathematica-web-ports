// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// shared/svg-plot.js — a small SVG stand-in for Mathematica's 2D Graphics[...] inside Manipulate.
//
// * World coordinates are the original's (y up); PlotRange maps onto the SVG viewBox.
// * Sizes follow Mathematica's conventions: Thickness[t] and PointSize[d] are fractions of the
//   plot width; "absolute" sizes (AbsoluteThickness, AbsolutePointSize, font sizes) are pixels at the
//   original's ImageSize and scale with the picture.
// * Locators are dragged with container-level pointer handling and hit-testing in world units
//   (lessons of the cross-browser survey: no reliance on SVG child hit-testing, getScreenCTM or
//   pointer capture), plus arrow-key movement of a focused locator (a port addition).
// Browser-only module (uses the DOM).

import { css } from './mma-colors.js';

const SVGNS = 'http://www.w3.org/2000/svg';
export function svgNode(tag, attrs = {}) {
  const n = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== null && v !== false) n.setAttribute(k, String(v));
  return n;
}
const colour = (c) => (c == null ? 'none' : typeof c === 'string' ? c : css(c));

/** Approximate Mathematica named sizes. */
export const POINT_SIZE = { Tiny: 0.004, Small: 0.007, Medium: 0.01, Large: 0.013 }; // fraction of plot width (diameter)
export const ABS_THICK = { Thin: 0.5, Normal: 1, Thick: 2 }; // px at ImageSize

/**
 * createPlot(container, opts)
 *   plotRange: [[x0, x1], [y0, y1]]        (PlotRange)
 *   imageSize: width in px of the original  (ImageSize; heights follow the aspect ratio)
 *   padding:   PlotRangePadding as a fraction of each range (default 0.02, Mathematica's Scaled[0.02])
 *   label:     accessible description; testid: data-testid of the <svg> (default 'scene-svg')
 */
export function createPlot(container, opts) {
  const [[x0, x1], [y0, y1]] = opts.plotRange;
  const pad = opts.padding ?? 0.02;
  const px = (x1 - x0) * pad, py = (y1 - y0) * pad;
  const X0 = x0 - px, X1 = x1 + px, Y0 = y0 - py, Y1 = y1 + py;
  const W = X1 - X0, H = Y1 - Y0;
  const imageSize = opts.imageSize ?? 400;
  const unitsPerPx = W / imageSize; // world units per nominal pixel
  const svg = svgNode('svg', {
    viewBox: `${X0} ${-Y1} ${W} ${H}`, class: 'scene svg-plot', 'data-testid': opts.testid ?? 'scene-svg',
    role: 'img', 'aria-label': opts.label ?? 'graphic', preserveAspectRatio: 'xMidYMid meet',
  });
  svg.style.maxWidth = `${Math.round(imageSize * 1.25)}px`;
  const world = svgNode('g', { transform: 'scale(1,-1)' }); // y up
  svg.append(world);
  container.append(svg);
  const layers = new Map();
  const layer = (name) => {
    if (!layers.has(name)) { const g = svgNode('g', { 'data-layer': name }); world.append(g); layers.set(name, g); }
    return layers.get(name);
  };

  // ---- style helpers ------------------------------------------------------
  /** thickness: number = Thickness[t] (fraction of width) | {abs: px} | 'Thin' | 'Thick' */
  const strokeWidth = (t) => {
    if (t == null) return ABS_THICK.Normal * unitsPerPx;
    if (typeof t === 'number') return t * (x1 - x0);
    if (typeof t === 'string') return (ABS_THICK[t] ?? 1) * unitsPerPx;
    return t.abs * unitsPerPx;
  };
  const paint = (st = {}) => ({
    fill: st.fill === undefined ? 'none' : colour(st.fill),
    'fill-opacity': st.fillOpacity ?? st.opacity,
    stroke: st.stroke === undefined ? 'none' : colour(st.stroke),
    'stroke-opacity': st.strokeOpacity ?? st.opacity,
    'stroke-width': st.stroke === undefined ? undefined : strokeWidth(st.thickness),
    'stroke-dasharray': st.dash ? st.dash.map((d) => d * unitsPerPx).join(' ') : undefined,
    'stroke-linejoin': 'round', 'stroke-linecap': st.cap ?? 'round',
    'data-testid': st.testid,
  });
  const ptsAttr = (pts) => pts.map((p) => `${p[0]},${p[1]}`).join(' ');

  const api = {
    svg, world, layer, unitsPerPx, imageSize, plotRange: opts.plotRange, strokeWidth,
    clear: (name) => layer(name).replaceChildren(),
    polygon: (g, pts, st) => g.appendChild(svgNode('polygon', { points: ptsAttr(pts), ...paint(st) })),
    line: (g, pts, st) => g.appendChild(svgNode('polyline', { points: ptsAttr(pts), ...paint({ ...st, fill: undefined }), fill: 'none' })),
    rect: (g, [a, b], [c, d], st) => g.appendChild(svgNode('rect', { x: Math.min(a, c), y: Math.min(b, d), width: Math.abs(c - a), height: Math.abs(d - b), ...paint(st) })),
    disk: (g, [cx, cy], r, st) => g.appendChild(svgNode('circle', { cx, cy, r, ...paint(st) })),
    /** Circle[c, r, {a0, a1}] drawn as a sampled polyline from a0 to a1 (see arcPoints). */
    arc: (g, c, r, a0, a1, st) => api.line(g, arcPoints(c, r, a0, a1), st),
    /** Point with PointSize: size = fraction of width (number), named size, or {abs: px diameter} */
    point: (g, [cx, cy], size, color, testid) => {
      const d = typeof size === 'number' ? size * (x1 - x0) : typeof size === 'string' ? POINT_SIZE[size] * (x1 - x0) : (size?.abs ?? 3.5) * unitsPerPx;
      return g.appendChild(svgNode('circle', { cx, cy, r: d / 2, fill: colour(color), 'data-testid': testid }));
    },
    /** Text[str, pos]: font size in px at the nominal image size; anchor 'middle'|'start'|'end' */
    text: (g, str, [x, y], { fontPx = 12, color = [0, 0, 0], anchor = 'middle', italic = false, weight, family = 'system-ui, sans-serif', testid } = {}) => {
      const t = svgNode('text', {
        x: 0, y: 0, transform: `translate(${x},${y}) scale(1,-1)`, 'text-anchor': anchor, 'dominant-baseline': 'middle',
        'font-size': fontPx * unitsPerPx, fill: colour(color), 'font-style': italic ? 'italic' : undefined, 'font-weight': weight,
        'font-family': family, 'data-testid': testid,
      });
      t.textContent = str;
      return g.appendChild(t);
    },
    group: (g, attrs = {}) => g.appendChild(svgNode('g', attrs)),
    /** client (page) pixel position -> world coordinates, from getBoundingClientRect only */
    clientToWorld(cx, cy) {
      const r = svg.getBoundingClientRect();
      const s = Math.min(r.width / W, r.height / H); // 'meet'
      const ox = r.left + (r.width - W * s) / 2, oy = r.top + (r.height - H * s) / 2;
      return [X0 + (cx - ox) / s, Y1 - (cy - oy) / s];
    },
    worldToClient([x, y]) {
      const r = svg.getBoundingClientRect();
      const s = Math.min(r.width / W, r.height / H);
      const ox = r.left + (r.width - W * s) / 2, oy = r.top + (r.height - H * s) / 2;
      return { x: ox + (x - X0) * s, y: oy + (Y1 - y) * s };
    },
    /** world units per CSS pixel as currently displayed */
    displayScale() { const r = svg.getBoundingClientRect(); return W / Math.max(1, Math.min(r.width, (r.height * W) / H)); },
  };
  return api;
}

/** Sample the arc Circle[c, r, {a0, a1}] from a0 to a1 (either direction). */
export function arcPoints([cx, cy], r, a0, a1, n) {
  const k = n ?? Math.max(8, Math.ceil((Math.abs(a1 - a0) / (2 * Math.PI)) * 96));
  const out = [];
  for (let i = 0; i <= k; i++) {
    const a = a0 + ((a1 - a0) * i) / k;
    out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return out;
}

/**
 * Mathematica's default locator glyph (ring + cross hairs), in world units, centred at the origin.
 * size: nominal diameter in px (the original's is about 17 px including the hairs).
 */
export function locatorGlyph(plot, { color = [0.25, 0.25, 0.25], size = 17, ringFill = [1, 1, 1], ringOpacity = 0.55 } = {}) {
  const u = plot.unitsPerPx;
  const R = (size / 2.4) * u;
  const g = svgNode('g', { class: 'locator-glyph' });
  g.append(svgNode('circle', { r: R, fill: css(ringFill), 'fill-opacity': ringOpacity, stroke: css(color), 'stroke-width': 1 * u }));
  for (const [a, b, c, d] of [[-R * 1.6, 0, -R * 0.45, 0], [R * 0.45, 0, R * 1.6, 0], [0, -R * 1.6, 0, -R * 0.45], [0, R * 0.45, 0, R * 1.6]]) {
    g.append(svgNode('line', { x1: a, y1: b, x2: c, y2: d, stroke: css(color), 'stroke-width': 1 * u }));
  }
  return g;
}

/**
 * Draggable locators (Manipulate `Locator` controls).
 *   names: list of locator names
 *   get(name) -> [x, y]                     current position (drawn from this)
 *   onMove(name, [x, y], {source})          the user moved it (source: 'pointer' | 'key')
 *   appearance(name) -> SVG node | null     glyph; null = invisible (Appearance -> None) but still draggable
 *   hitPx: grab radius in CSS px (default 12); keyStep: world units per arrow key (Shift = 5×)
 *   pickAnywhere (default false; pass true for Manipulate Locator controls): as Mathematica's LocatorPane, which
 *     "by default directs any click to the nearest locator" (Wolfram Language reference, LocatorPane, Details): a press
 *     away from every locator makes the nearest one jump to the press point and drags it. PORT DEVIATION: a press
 *     within hitPx of a locator grabs it without a jump (the offset between pointer and locator is kept while
 *     dragging); the distance at which Mathematica grabs a locator without a jump is not known (owner check
 *     M-CP-08). pickAnywhere = false: presses away from all locators are ignored (the behaviour of v0.1.0).
 *   A press that grabs a locator also gives it keyboard focus, so a value typed into a control field is committed
 *   (its change event fires) before the drag starts.
 *   throttle: 'raf' (default: at most one onMove per animation frame, with the latest position) | 'none'
 * Returns { redraw(), nodes, dragging() }.
 */
export function addLocators(plot, { names, get, onMove, onStart, onEnd, appearance, hitPx = 12, keyStep = 0.05, throttle = 'raf', pickAnywhere = false, describe = (n) => `${n} locator; arrow keys move it`, layerName = 'locators' }) {
  const g = plot.layer(layerName);
  const nodes = {};
  for (const name of names) {
    const holder = svgNode('g', { class: 'locator', 'data-testid': `locator-${name}`, tabindex: 0, role: 'button', 'aria-label': describe(name) });
    const glyph = appearance ? appearance(name) : locatorGlyph(plot);
    if (glyph) holder.append(glyph);
    else holder.append(svgNode('circle', { r: 6 * plot.unitsPerPx, fill: 'transparent', class: 'locator-invisible' })); // keeps a focus target
    g.append(holder);
    nodes[name] = holder;
    holder.addEventListener('keydown', (e) => {
      const d = (e.shiftKey ? 5 : 1) * keyStep;
      const delta = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, d], ArrowDown: [0, -d] }[e.key];
      if (!delta) return;
      e.preventDefault();
      const [x, y] = get(name);
      onMove(name, [x + delta[0], y + delta[1]], { source: 'key' });
    });
  }
  const redraw = () => { for (const n of names) { const [x, y] = get(n); nodes[n].setAttribute('transform', `translate(${x},${y})`); } };

  let active = null, pendingPt = null, raf = 0, offset = [0, 0];
  const flush = () => { raf = 0; if (active && pendingPt) { const p = pendingPt; pendingPt = null; onMove(active, p, { source: 'pointer' }); } };
  /** nearest locator to p (ties: first in `names`) and its distance */
  const nearestTo = (p) => {
    let best = null, bd = Infinity;
    for (const n of names) {
      const [x, y] = get(n);
      const d = Math.hypot(x - p[0], y - p[1]);
      if (d < bd) { bd = d; best = n; }
    }
    return [best, bd];
  };
  plot.svg.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const p = plot.clientToWorld(e.clientX, e.clientY);
    const [n, d] = nearestTo(p);
    if (!n) return;
    const grabbed = d <= hitPx * plot.displayScale();
    if (!grabbed && !pickAnywhere) return;
    active = n;
    const [x, y] = get(n);
    offset = grabbed ? [x - p[0], y - p[1]] : [0, 0];
    nodes[n].classList.add('dragging');
    try { nodes[n].focus({ preventScroll: true }); } catch { /* old engines: focus without options */ }
    try { plot.svg.setPointerCapture(e.pointerId); } catch { /* not supported everywhere; window listeners below cover it */ }
    e.preventDefault();
    onStart?.(n);
    if (!grabbed) onMove(n, p, { source: 'pointer' }); // LocatorPane: the nearest locator jumps to the click
  });
  const move = (e) => {
    if (!active) return;
    const q = plot.clientToWorld(e.clientX, e.clientY);
    pendingPt = [q[0] + offset[0], q[1] + offset[1]];
    if (throttle === 'none') flush();
    else if (!raf) raf = requestAnimationFrame(flush);
  };
  const up = () => {
    if (!active) return;
    if (raf) { cancelAnimationFrame(raf); flush(); }
    nodes[active].classList.remove('dragging');
    const n = active; active = null;
    onEnd?.(n);
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
  redraw();
  return { redraw, nodes, dragging: () => active };
}
