// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Yitong Lu
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/prm-3d/view3d.js — the two three.js pictures of "Probabilistic Roadmap Method in 3D" as renderers of
// shared/manipulate.js ({ draw(graphics, ctx) }): "robot workspace" (the model's Graphics3D, spheres with a Phong
// highlight) and "robot phase space" (points as disc sprites, lines and the robot-progress cube in the source's order,
// the hand-made axes frame, the translucent C-obstacle volumes of cspace3d.js), both with the Dynamic view points of
// the original (browser only).
import { THREE, createViewer, fatLine, label, inkFraction, requireWebGL2 } from '../../shared/three-helpers.js';
import { addMathematicaLighting } from '../../shared/mma-lighting.js';
import { flatten } from '../../shared/graphics3d.js';
import { addPrims, disposeGroup, fitViewer } from '../../shared/graphics3d-three.js';
import { mmaNumberString } from '../../shared/mma-extra.js';
import { VIEWPOINT, WORKSPACE_RANGE, PHASE_RANGE, COLORS, TWO_PI } from './model.js';
import { volumeFor } from './cspace3d.js';

const IMAGE = 300; // ImageSize -> {300, 300}
// The pictures' framing (no SphericalRegion: Mathematica fits the box to the image), measured on snapshot 1: the
// workspace box spans 0.86 and the phase cube 0.735 of the 300 px picture width at the default view point (D-P3-09).
const WS_ZOOM = 0.99;
const PH_ZOOM = 0.92;
const POINT_PX = { Large: 6.5, Medium: 4 }; // PointSize[Large], PointSize[Medium] measured on snapshot 1 (D-P3-04)

const rgb = (c) => new THREE.Color().setRGB(c[0], c[1], c[2], THREE.LinearSRGBColorSpace);
const longest = (box) => Math.max(...box.map(([a, b]) => b - a));
const center = (box) => box.map(([a, b]) => (a + b) / 2);

/** clipping planes of a PlotRange box (parts outside the box are clipped, as Mathematica does) */
function clipPlanes(box, eps) {
  const out = [];
  box.forEach(([a, b], k) => {
    const n = [0, 0, 0];
    n[k] = 1; out.push(new THREE.Plane(new THREE.Vector3(...n), -a + eps));
    n[k] = -1; out.push(new THREE.Plane(new THREE.Vector3(...n), b + eps));
  });
  return out;
}
const WS_CLIP = clipPlanes(WORKSPACE_RANGE, 1e-4);
const PH_CLIP = clipPlanes(PHASE_RANGE, 1e-4);

/** Boxed -> True: the 12 edges of the box, thin gray */
function boxEdges(box) {
  const pts = [];
  const c = box;
  for (const y of c[1]) for (const z of c[2]) pts.push(c[0][0], y, z, c[0][1], y, z);
  for (const x of c[0]) for (const z of c[2]) pts.push(x, c[1][0], z, x, c[1][1], z);
  for (const x of c[0]) for (const y of c[1]) pts.push(x, y, c[2][0], x, y, c[2][1]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: rgb([0.55, 0.55, 0.55]) }));
}

/**
 * One picture: a 300 px viewer made at the first evaluation in the picture's element, with Mathematica's lights on the
 * displayed colour values (D-P3-03), clipping, the box edges and the content groups; ViewPoint -> Dynamic[viewPoint]
 * (F-P3-26): applyViewPoint(vp) puts the camera there and fits the box; a mouse rotation calls onViewPoint(vp).
 */
function picture({ box, zoom, testid, aria, viewPointOf: vpOf, onViewPoint, groups, onCreate, draw }) {
  let v = null;
  const self = {
    prepare: requireWebGL2, // no WebGL 2: stop before the controls, as the old page did
    get viewer() { return v; },
    /** the viewer's camera as a Mathematica ViewPoint (scaled so that the longest box side is 1) */
    viewPoint: () => v.camera.position.clone().sub(v.controls.target).divideScalar(longest(box)).toArray(),
    /** put the camera at the ViewPoint vp (z up) and fit the box */
    applyViewPoint(vp) {
      const c = new THREE.Vector3(...center(box));
      v.controls.target.copy(c);
      v.camera.position.copy(c.clone().add(new THREE.Vector3(...vp).multiplyScalar(longest(box))));
      v.camera.up.set(0, 0, 1);
      fitViewer(v, { box, zoom, viewPoint: vp });
    },
    draw(graphics, ctx) {
      if (!v) {
        v = createViewer(ctx.element, { box, viewPoint: VIEWPOINT, size: IMAGE, maxSize: IMAGE });
        v.renderer.domElement.setAttribute('data-testid', testid);
        v.renderer.domElement.setAttribute('aria-label', aria);
        // D-P3-03 (as D-RS-02): Mathematica lights and blends the displayed colour values directly
        v.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
        v.renderer.localClippingEnabled = true;
        addMathematicaLighting(v.camera);
        self.applyViewPoint(vpOf(ctx.state));
        // a mouse rotation is written back into the Manipulate variable and survives every re-evaluation
        v.controls.addEventListener('change', () => onViewPoint(self.viewPoint()));
        v.scene.add(boxEdges(box));
        v.scene.add(...groups);
        onCreate?.(v);
      }
      draw(v, graphics, ctx);
      v.render();
    },
    inkFraction: () => inkFraction(v.renderer),
    camera: () => ({ position: v.camera.position.toArray(), target: v.controls.target.toArray(), fov: v.camera.fov, viewPoint: self.viewPoint() }),
  };
  return self;
}

// ---- workspace -------------------------------------------------------------------------------------------------------
const sphereGeo = new THREE.SphereGeometry(0.5, 64, 40);
function drawWorkspace(ws, group, graphics) {
  disposeGroup(group, [ws]);
  const prims = flatten(graphics);
  addPrims(group, prims.filter((p) => p.type !== 'sphere'), { viewer: ws, clip: WS_CLIP, box: WORKSPACE_RANGE, size: 7, thinPx: 1 });
  // {Blue, Specularity[White, 10], Sphere[pObs3a, obsRad], Yellow, ...}: a Phong highlight (D-P3-03)
  for (const p of prims.filter((q) => q.type === 'sphere')) {
    const m = new THREE.MeshPhongMaterial({ color: rgb(p.color), specular: rgb(COLORS.White), shininess: 10, clippingPlanes: WS_CLIP });
    for (const c of p.centers) {
      const s = new THREE.Mesh(sphereGeo.clone(), m);
      s.position.set(...c);
      group.add(s);
    }
  }
}

// ---- phase space -----------------------------------------------------------------------------------------------------
const disc = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.beginPath(); g.arc(32, 32, 31, 0, 2 * Math.PI); g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  return t;
})();

/** Axes on the box edges Mathematica uses for the default view point (D-P3-08): θ1 front-bottom, θ2 top-left, θ3 front-left */
function drawPhaseFrame(phFrame) {
  const gray = [0.2, 0.2, 0.2];
  const S = TWO_PI;
  const axes = [
    { sub: '1', at: (t) => [t, 0, 0], out: [0, -1, -1] },
    { sub: '2', at: (t) => [0, t, S], out: [-1, 0, 1] },
    { sub: '3', at: (t) => [0, 0, t], out: [-1, -1, 0] },
  ];
  for (const ax of axes) {
    const o = ax.out.map((v) => v / Math.hypot(...ax.out));
    const segs = [];
    for (let v = 0; v <= 6.0001; v += 0.5) {
      const p = ax.at(v);
      const len = Number.isInteger(v / 2) ? 0.035 * S : 0.018 * S;
      segs.push(...p, ...p.map((x, i) => x + o[i] * len));
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(segs, 3));
    phFrame.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: rgb(gray) })));
    for (const v of [0, 2, 4, 6]) phFrame.add(label(String(v), ax.at(v).map((x, i) => x + o[i] * 0.07 * S), [0.13, 0.13, 0.13], { cls: 'p3-tick' }));
    phFrame.add(label(`<i>θ</i><sub>${ax.sub}</sub>`, ax.at(S / 2).map((x, i) => x + o[i] * 0.16 * S), [0.13, 0.13, 0.13], { html: true, cls: 'p3-axis' }));
  }
}

const pointPx = (s) => (typeof s === 'number' ? s * IMAGE : POINT_PX[s] ?? 3);
/** points, lines and the progress cube in the source's order (renderOrder), default-thickness lines batched per colour */
function drawPhase(ph, phGroup, graphics) {
  disposeGroup(phGroup, [ph]);
  const prims = flatten(graphics);
  let order = 0;
  const thin = new Map(); // default-thickness lines batched per colour, drawn in the order of their first piece
  for (const p of prims) {
    if (p.type === 'point') {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(p.points.flat(), 3));
      const m = new THREE.PointsMaterial({ color: rgb(p.color ?? [0, 0, 0]), size: pointPx(p.pointSize), sizeAttenuation: false, map: disc, alphaTest: 0.5, clippingPlanes: PH_CLIP });
      const pts = new THREE.Points(g, m);
      pts.renderOrder = order++;
      phGroup.add(pts);
    } else if (p.type === 'line') {
      if (typeof p.thickness === 'number') {
        const l = fatLine(ph, p.points, p.color ?? [0, 0, 0], p.thickness * IMAGE);
        l.material.clippingPlanes = PH_CLIP;
        l.renderOrder = order++;
        phGroup.add(l);
      } else {
        const key = (p.color ?? [0, 0, 0]).join(',');
        if (!thin.has(key)) thin.set(key, { color: p.color ?? [0, 0, 0], pts: [], order: order++ });
        thin.get(key).pts.push(...p.points[0], ...p.points[1]);
      }
    } else if (p.type === 'cuboid') {
      const g = new THREE.Group();
      addPrims(g, [p], { viewer: ph, clip: PH_CLIP, box: PHASE_RANGE, size: TWO_PI });
      g.renderOrder = order++;
      phGroup.add(g);
    }
  }
  for (const { color, pts, order: o } of thin.values()) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: rgb(color), clippingPlanes: PH_CLIP }));
    l.renderOrder = o;
    phGroup.add(l);
  }
}

// freeConfigSpacea / b: translucent Blue / Yellow volumes (Directive[Lighting -> Automatic, colour, Opacity[0.5]], no edges),
// GrayLevel[0] boundary lines on the cube faces (F-P3-25), drawn after everything else (renderOrder 1000)
function drawVolumes(ph, phVol, volumes) {
  disposeGroup(phVol, [ph]);
  for (const [desc, color, name] of [[volumes.a, COLORS.Blue, 'blue'], [volumes.b, COLORS.Yellow, 'yellow']]) {
    const v = volumeFor(desc);
    if (!v) continue;
    const mat = () => new THREE.MeshLambertMaterial({ color: rgb(color), transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false });
    const pos = new Float32Array(v.vertices.length * 3);
    v.vertices.forEach((q, i) => pos.set(q, 3 * i));
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    sg.setIndex(v.surface.flat());
    sg.computeVertexNormals();
    const surface = new THREE.Mesh(sg, mat());
    surface.name = `c-obstacle-${name}`;
    surface.renderOrder = 1000;
    const cp = [], cn = [];
    for (const { tri, normal } of v.caps) for (const i of tri) { cp.push(...v.vertices[i]); cn.push(...normal); }
    const cg = new THREE.BufferGeometry();
    cg.setAttribute('position', new THREE.Float32BufferAttribute(cp, 3));
    cg.setAttribute('normal', new THREE.Float32BufferAttribute(cn, 3));
    const caps = new THREE.Mesh(cg, mat());
    caps.renderOrder = 1000;
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.Float32BufferAttribute(v.lines.flat(2), 3));
    const lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: rgb([0, 0, 0]) }));
    phVol.add(surface, caps, lines);
  }
}

/**
 * The two pictures. onViewPoint(k, vp): a mouse rotation of picture k (1 workspace, 2 phase) — the page writes it into
 * viewPoint1 / viewPoint2. The phase picture also writes the path label (Dynamic text above it) and rebuilds the
 * volumes only when a descriptor changes (Q-P3-12).
 */
export function PrmViews({ onViewPoint, pathLabel }) {
  const wsGroup = new THREE.Group();
  const workspace = picture({
    box: WORKSPACE_RANGE, zoom: WS_ZOOM, testid: 'scene-canvas-workspace', aria: 'Robot workspace (3D, drag to rotate)',
    viewPointOf: (s) => s.viewPoint1, onViewPoint: (vp) => onViewPoint(1, vp), groups: [wsGroup],
    draw: (v, graphics) => drawWorkspace(v, wsGroup, graphics),
  });
  const phFrame = new THREE.Group(); // ticks and labels (Axes -> True, AxesLabel)
  const phGroup = new THREE.Group(); // points, lines, the robot-progress cube
  const phVol = new THREE.Group(); // the C-obstacle volumes (freeConfigSpacea, freeConfigSpaceb)
  let volKey = null;
  const phase = picture({
    box: PHASE_RANGE, zoom: PH_ZOOM, testid: 'scene-canvas-phase', aria: 'Robot phase space θ1, θ2, θ3 (3D, drag to rotate)',
    viewPointOf: (s) => s.viewPoint2, onViewPoint: (vp) => onViewPoint(2, vp), groups: [phFrame, phGroup, phVol],
    onCreate: () => drawPhaseFrame(phFrame),
    draw: (v, graphics, { view }) => {
      drawPhase(v, phGroup, graphics);
      const key = JSON.stringify(view.volumes);
      if (key !== volKey) { volKey = key; drawVolumes(v, phVol, view.volumes); }
      pathLabel.textContent = view.label.red ? view.label.text : `${view.label.text}${mmaNumberString(view.label.value)}`;
      pathLabel.classList.toggle('p3-red', view.label.red);
    },
  });
  return { workspace, phase, volumeCount: () => phVol.children.filter((o) => o.isMesh).length };
}
