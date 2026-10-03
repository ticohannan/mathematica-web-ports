// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Shreyas Poyrekar, Aaron T. Becker and Arifa Sultana
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/motion-planning/main.js — SVG rendering + locator dragging (browser only).
import { Controls, svgEl } from '../../shared/ui.js';
import { computeScene, lineList, pathLength, DEFAULTS, LOCATOR_RANGES, PLOT_RANGE, regularPolygon } from './planner.js';

// Mathematica named colours used by the original
const COL = {
  White: '#ffffff', Black: '#000000', Red: '#ff0000',
  LightYellow: 'rgb(255,255,217)', LightGray: 'rgb(217,217,217)', LightRed: 'rgb(255,217,217)',
  LightGreen: 'rgb(224,255,224)', LightBlue: 'rgb(222,240,255)',
  DarkerGreen: 'rgb(0,170,0)', LighterGreen: 'rgb(85,255,85)', Orange: 'rgb(255,128,0)',
  Purple: 'rgb(128,0,128)', Blue: '#0000ff', Gray: 'rgb(128,128,128)', DarkerRed: 'rgb(170,0,0)',
};
const W = 2 * PLOT_RANGE; // plot width in user units
const IMAGE_PX = 425; // ImageSize -> 425
const REL = (t) => t * W; // Thickness[t] / PointSize[t] are fractions of the plot width
const PX = (p) => (p / IMAGE_PX) * W; // absolute sizes (Thin, Thick, fonts) at the nominal image size

let state = structuredClone(DEFAULTS);
applyUrlParams(state);
let scene = computeScene(state);

/**
 * PORT ADDITION: a scene can be opened from a link, e.g.
 * ?r1=-2,2.75&r2=0.5,-3&o1=2,2.5&o2=-1,-0.5&o3=-2,-2.4&o4=2,-1&n=3&x=4&view=config
 * (used by tools/explore-motion.mjs reports and for sharing test cases).
 */
function applyUrlParams(st) {
  const q = new URLSearchParams(location.search);
  for (const k of ['r1', 'r2', 'o1', 'o2', 'o3', 'o4']) {
    const v = q.get(k)?.split(',').map(Number);
    if (v && v.length === 2 && v.every(Number.isFinite)) {
      const [[x0, y0], [x1, y1]] = LOCATOR_RANGES[k];
      st[k] = [Math.min(Math.max(v[0], x0), x1), Math.min(Math.max(v[1], y0), y1)];
    }
  }
  for (const k of ['n', 'x']) { const v = Number(q.get(k)); if ([3, 4, 5].includes(v)) st[k] = v; }
  if (q.get('view') === 'config') st.configOrWork = 'configuration space';
}
const sceneLink = () => {
  const p = (v) => `${+v[0].toFixed(4)},${+v[1].toFixed(4)}`;
  return `${location.origin}${location.pathname}?r1=${p(state.r1)}&r2=${p(state.r2)}&o1=${p(state.o1)}&o2=${p(state.o2)}&o3=${p(state.o3)}&o4=${p(state.o4)}&n=${state.n}&x=${state.x}${state.configOrWork === 'workspace' ? '' : '&view=config'}`;
};

// ---- SVG skeleton -----------------------------------------------------------
const svg = svgEl('svg', {
  viewBox: `${-PLOT_RANGE} ${-PLOT_RANGE} ${W} ${W}`, class: 'scene', 'data-testid': 'scene-svg',
  role: 'img', 'aria-label': 'Workspace with robot, obstacles and planned path',
});
const world = svgEl('g', { transform: 'scale(1,-1)' }); // math coordinates: y up
const layer = svgEl('g');
const locatorLayer = svgEl('g');
world.append(layer, locatorLayer);
svg.append(world);
document.getElementById('graphic').append(svg);

const ptsAttr = (pts) => pts.map((p) => `${p[0]},${p[1]}`).join(' ');
function poly(pts, { fill = 'none', fillOpacity = 1, stroke = null, strokeWidth = null, strokeOpacity = 1, nonScaling = false, testid } = {}) {
  return svgEl('polygon', {
    points: ptsAttr(pts), fill, 'fill-opacity': fillOpacity,
    stroke: stroke ?? 'none', 'stroke-width': strokeWidth ?? 0, 'stroke-opacity': strokeOpacity,
    'vector-effect': nonScaling ? 'non-scaling-stroke' : null, 'stroke-linejoin': 'round', 'data-testid': testid,
  });
}
function polyline(pts, { stroke, width, opacity = 1, nonScaling = false, testid }) {
  return svgEl('polyline', {
    points: ptsAttr(pts), fill: 'none', stroke, 'stroke-width': width, 'stroke-opacity': opacity,
    'vector-effect': nonScaling ? 'non-scaling-stroke' : null, 'stroke-linecap': 'butt', 'stroke-linejoin': 'round', 'data-testid': testid,
  });
}
function lines(segs, opts) {
  const g = svgEl('g', { 'data-testid': opts.testid });
  for (const s of segs) g.append(polyline(s, { ...opts, testid: undefined }));
  return g;
}
function point(p, color, sizeFrac = 0.01, testid) {
  return svgEl('circle', { cx: p[0], cy: p[1], r: REL(sizeFrac) / 2, fill: color, 'data-testid': testid });
}

// ---- drawing (mirrors the Graphics[...] list of the original, in order) -------
function draw() {
  const sc = scene;
  const inside = sc.robotinsideobstcond.some(Boolean);
  const ws = state.configOrWork === 'workspace';
  const s = state.s;
  const sIdx = Math.min(Math.max(s, 1), Math.max(sc.discretePath.length, 1)) - 1;
  const atS = sc.discretePath[sIdx];
  const thin = { stroke: COL.Black, strokeWidth: 0.5, nonScaling: true }; // EdgeForm[{Thin}]
  layer.replaceChildren();
  const add = (n) => { layer.append(n); return n; };

  // Background rectangle 4.75 {{-1,-1},{1,1}}
  add(svgEl('rect', { x: -4.75, y: -4.75, width: 9.5, height: 9.5, fill: ws ? COL.White : inside ? COL.Red : COL.White, 'data-testid': 'background' }));

  if (ws) {
    add(poly(sc.borderpoly, { fill: COL.LightYellow, ...thin, testid: 'boundary' }));
  } else {
    const edge = { stroke: COL.Black, strokeWidth: REL(0.003) };
    add(poly(sc.configBoundary, { fill: COL.LightGray, ...edge, testid: 'config-boundary-fill' }));
    if (sc.path.length) add(polyline(sc.path, { stroke: COL.LighterGreen, width: 2, nonScaling: true, testid: 'path' }));
    sc.robotobstconfig.forEach((cob, i) => {
      const hit = sc.obstCollision[0][i] || sc.obstCollision[1][i];
      add(poly(cob, { fill: hit ? COL.Red : COL.White, fillOpacity: 0.5, ...edge, strokeOpacity: 0.5, testid: `cobstacle-fill-${i + 1}` }));
    });
    if (s !== 1 && atS) add(point(atS, COL.DarkerGreen, 0.01, 'progress-point'));
  }

  if (ws) {
    sc.obstaclepoly.forEach((ob, i) => add(poly(ob, { fill: COL.LightRed, ...thin, testid: `obstacle-${i + 1}` })));
    add(poly(sc.robotEndPoly, { fill: sc.robotinsideobstcond[1] ? COL.Red : COL.LightGreen, ...thin, testid: 'robot-end' }));
    if (sc.path.length) add(polyline(sc.path, { stroke: COL.DarkerGreen, width: 2, opacity: 0.5, nonScaling: true, testid: 'path' }));
    if (sc.robotinsideobstcond[0]) {
      add(poly(sc.robotStartPoly, { fill: COL.Red, ...thin, testid: 'robot-start' }));
    } else {
      add(poly(sc.robotStartPoly, { fill: COL.LightBlue, ...thin, testid: 'robot-start' }));
      if (!inside && sc.path.length) {
        const traveled = lineList(sc.discretePath).slice(0, Math.max(0, sIdx));
        add(lines(traveled, { stroke: COL.DarkerGreen, width: REL(0.003), testid: 'path-traveled' }));
        add(poly(regularPolygon(atS, state.n), { fill: COL.Orange, fillOpacity: 0.5, ...thin, strokeOpacity: 0.5, testid: 'robot-moving' }));
        add(point(atS, COL.Red, 0.01, 'progress-point'));
      }
    }
  }

  // Visibility lines (drawn in both views)
  add(lines(sc.linesStarttoObstacles, { stroke: COL.Orange, width: REL(0.003), opacity: 0.25, testid: 'lines-start' }));
  add(lines(sc.linesEndtoObstacles, { stroke: COL.Purple, width: REL(0.003), opacity: 0.25, testid: 'lines-end' }));
  add(lines(sc.verticestoVertices, { stroke: COL.Blue, width: REL(0.003), opacity: 0.25, testid: 'lines-bitangent' }));

  // Configuration-space outlines (transparent fill, gray edges) + red vertex points
  const outline = { stroke: COL.Gray, strokeWidth: REL(0.003), strokeOpacity: 0.7 };
  sc.robotobstconfig.forEach((cob, i) => add(poly(cob, { ...outline, testid: `cobstacle-${i + 1}` })));
  add(poly(sc.configBoundary, { ...outline, testid: 'config-boundary' }));
  const vg = add(svgEl('g', { 'data-testid': 'cobstacle-vertices' }));
  for (const v of sc.robotobstconfig.flat()) vg.append(point(v, COL.Red));

  if (sc.path.length === 0) {
    const [x, y] = [state.r1[0], state.r1[1] + 0.5];
    const t = svgEl('text', {
      x: 0, y: 0, transform: `translate(${x},${y}) scale(1,-1)`, 'text-anchor': 'middle', 'dominant-baseline': 'middle',
      'font-size': PX(18), fill: COL.DarkerRed, 'font-family': 'Times New Roman, serif', 'data-testid': 'no-path',
    });
    t.textContent = 'No path exists.';
    add(t);
  }
  drawLocators();
  updateReadout();
}

// ---- locators ---------------------------------------------------------------
const LOCATORS = ['r1', 'r2', 'o1', 'o2', 'o3', 'o4'];
const locatorNodes = {};
const LOC_R = PX(7);
function makeLocator(name) {
  const g = svgEl('g', { class: 'locator', 'data-testid': `locator-${name}`, tabindex: 0, role: 'button',
    'aria-label': `${name.startsWith('r') ? (name === 'r1' ? 'robot start' : 'robot end') : 'obstacle ' + name.slice(1)} locator; arrow keys move it` });
  g.append(svgEl('circle', { r: LOC_R, class: 'ring', 'stroke-width': 1, 'vector-effect': 'non-scaling-stroke' }));
  for (const [x1, y1, x2, y2] of [[-LOC_R * 1.5, 0, -LOC_R * 0.45, 0], [LOC_R * 0.45, 0, LOC_R * 1.5, 0], [0, -LOC_R * 1.5, 0, -LOC_R * 0.45], [0, LOC_R * 0.45, 0, LOC_R * 1.5]]) {
    g.append(svgEl('line', { x1, y1, x2, y2, class: 'hair', 'stroke-width': 1, 'vector-effect': 'non-scaling-stroke' }));
  }
  g.append(svgEl('circle', { r: LOC_R * 2, fill: 'transparent' })); // bigger hit area
  locatorLayer.append(g);
  locatorNodes[name] = g;

  let dragging = false;
  g.addEventListener('pointerdown', (e) => { dragging = true; g.setPointerCapture(e.pointerId); g.classList.add('dragging'); e.preventDefault(); });
  g.addEventListener('pointermove', (e) => { if (dragging) moveLocator(name, clientToWorld(e.clientX, e.clientY)); });
  const end = () => { dragging = false; g.classList.remove('dragging'); };
  g.addEventListener('pointerup', end);
  g.addEventListener('pointercancel', end);
  g.addEventListener('keydown', (e) => {
    const d = e.shiftKey ? 0.25 : 0.05;
    const delta = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, d], ArrowDown: [0, -d] }[e.key];
    if (!delta) return;
    e.preventDefault();
    moveLocator(name, [state[name][0] + delta[0], state[name][1] + delta[1]]);
  });
}
function drawLocators() {
  for (const name of LOCATORS) locatorNodes[name].setAttribute('transform', `translate(${state[name][0]},${state[name][1]})`);
}
function clientToWorld(cx, cy) {
  const pt = svg.createSVGPoint();
  pt.x = cx; pt.y = cy;
  const p = pt.matrixTransform(world.getScreenCTM().inverse());
  return [p.x, p.y];
}
const clampTo = (name, [x, y]) => {
  const [[x0, y0], [x1, y1]] = LOCATOR_RANGES[name];
  return [Math.min(Math.max(x, x0), x1), Math.min(Math.max(y, y0), y1)];
};
let pending = false;
function moveLocator(name, p) {
  state[name] = clampTo(name, p);
  state.s = 1; // the original resets progress whenever robot/obstacle locators change
  drawLocators();
  if (!pending) {
    pending = true;
    requestAnimationFrame(() => { pending = false; recompute(); });
  }
}
LOCATORS.forEach(makeLocator);

// ---- controls -----------------------------------------------------------------
const controls = new Controls(document.getElementById('controls'));
const C = {};
C.configOrWork = controls.setterBar({
  name: 'configOrWork', value: state.configOrWork,
  options: [{ value: 'workspace', label: 'workspace' }, { value: 'configuration space', label: 'configuration space' }],
  onChange: (v) => { state.configOrWork = v; draw(); },
});
controls.delimiter();
controls.heading('number of sides');
C.x = controls.setterBar({ name: 'x', label: 'boundary', value: state.x, options: [3, 4, 5].map((v) => ({ value: v })), onChange: (v) => { state.x = v; recompute(); } });
C.n = controls.setterBar({ name: 'n', label: 'robot', value: state.n, options: [3, 4, 5].map((v) => ({ value: v })), onChange: (v) => { state.n = v; state.s = 1; recompute(); } });
controls.delimiter();
C.s = controls.slider({ name: 's', label: 'progress', min: 1, max: Math.max(1, scene.discretePath.length), step: 1, value: 1, labeled: false, animSeconds: 8,
  onInput: (v) => { state.s = v; draw(); } });
C.s.row.id = 'progress-row';

function recompute() {
  scene = computeScene(state);
  const len = Math.max(1, scene.discretePath.length);
  // PORT DEVIATION: the original does not clamp s when the path gets shorter
  // (e.g. after a boundary change); the port clamps it to the new path length.
  state.s = Math.min(state.s, len);
  C.s.setRange(1, len);
  C.s.set(state.s);
  C.s.setEnabled(scene.discretePath.length > 0);
  draw();
}

// ---- optional numeric readout (port addition, for testing) -------------------
const readout = document.getElementById('readout');
const showReadout = document.getElementById('show-readout');
showReadout.addEventListener('change', () => { readout.hidden = !showReadout.checked; updateReadout(); });
const f = (v) => v.toFixed(4);
function updateReadout() {
  if (readout.hidden) return;
  const sc = scene;
  readout.textContent = [
    `start ${state.r1.map(f)}  end ${state.r2.map(f)}  robot sides ${state.n}  boundary sides ${state.x}`,
    `start valid: ${!sc.robotinsideobstcond[0]}  end valid: ${!sc.robotinsideobstcond[1]}`,
    `path vertices: ${sc.path.map((p) => `(${p.map(f).join(', ')})`).join(' → ') || '(none)'}`,
    `path length: ${sc.path.length ? f(pathLength(sc.path)) : '–'}   discretised points: ${sc.discretePath.length}   progress s = ${state.s}`,
    sc.graph ? `graph: ${sc.graph.allPoints.length} nodes, ${sc.graph.allLines.length} edges` : 'graph: not needed (direct line or invalid start/end)',
    sc.diagnostics.length ? `diagnostics: ${sc.diagnostics.join('; ')}` : '',
    `link to this scene: ${sceneLink()}`,
  ].filter(Boolean).join('\n');
  readout.style.whiteSpace = 'pre-wrap';
}

document.getElementById('reset').addEventListener('click', () => {
  state = structuredClone(DEFAULTS);
  for (const k of ['configOrWork', 'x', 'n']) C[k].set(state[k]);
  recompute();
});

recompute();

// ---- test / automation hook -------------------------------------------------
window.__demo = {
  name: 'motion-planning',
  getState: () => structuredClone(state),
  setState: (partial) => {
    const p = structuredClone(partial);
    const movesScene = LOCATORS.some((k) => k in p) || 'n' in p;
    for (const k of LOCATORS) if (k in p) p[k] = clampTo(k, p[k]);
    state = { ...state, ...p };
    if (movesScene && !('s' in partial)) state.s = 1;
    for (const k of ['configOrWork', 'x', 'n']) C[k].set(state[k]);
    recompute();
  },
  scene: () => structuredClone({ ...scene, graph: scene.graph && { nodes: scene.graph.allPoints.length, edges: scene.graph.allLines.length } }),
  /** client (page) pixel coordinates of a locator centre, for real mouse-drag tests */
  locatorClientPoint: (name) => {
    const r = locatorNodes[name].querySelector('circle').getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  },
  worldToClient: ([x, y]) => {
    const pt = svg.createSVGPoint(); pt.x = x; pt.y = y;
    const p = pt.matrixTransform(world.getScreenCTM());
    return { x: p.x, y: p.y };
  },
  sceneLink,
  ready: true,
};
