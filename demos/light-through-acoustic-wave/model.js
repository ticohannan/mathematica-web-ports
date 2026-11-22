// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Brendon O'Leary
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/light-through-acoustic-wave/model.js — "Path of Light through an Acoustic Wave": one evaluation of the
// Manipulate body, the state in, { state, view, graphics } out (pure, no DOM). Simple mode: shared/plot.js Plot.
//
// Manipulate[If[m > n − .1, m = n − .1]; Plot[{lightPath, m Sin[w x]}, {x, 0, 50}, PlotStyle -> {Thick, Dashed},
//   ImageSize -> {500, 300}, ImagePadding -> {{25, 25}, {10, 10}}], {{n, 1, …}, .8, 5}, {{m, .7, …}, 0, n − .1},
//   {{w, .5, …}, .3, 2}, {{θ, .01, …}, −.02, .02}]
import { Graphics, Annotation, Thick, Dashed } from '../../shared/graphics.js';
import { Plot } from '../../shared/plot.js';

/** The Manipulate's initial settings = the notebook's live state (tests/golden/…original-states.json). */
export const initialState = () => ({ n: 1, m: 0.7, w: 0.5, θ: 0.01 });

/** If[m > n − .1, m = n − .1] — the body changes its own variable m (machine arithmetic: 0.8 − .1 = 0.7000000000000001). */
export const clampM = ({ n, m }) => (m > n - 0.1 ? n - 0.1 : m);

/**
 * The light path, the original's expression term by term:
 * (2 (ArcTan[(m + n Tan[w x/2])/Sqrt[−m² + n²]] + π Ceiling[w x/(2π) − .5]) n Tan[θ])/(Sqrt[−m² + n²] w)
 *   − (2 n ArcTan[m/Sqrt[−m² + n²]] Tan[θ])/(Sqrt[−m² + n²] w).
 * It is n tan θ ∫₀ˣ dξ/(n + m sin wξ); the Ceiling term moves ArcTan to the next branch at each pole of Tan[w x/2]
 * (x = (2k + 1)π/w), so the curve is continuous there (DESIGN.md N-LT-01).
 */
export function lightPath(x, { n, m, w, θ }) {
  const r = Math.sqrt(-m * m + n * n);
  return (2 * (Math.atan((m + n * Math.tan((w * x) / 2)) / r) + Math.PI * Math.ceil((w * x) / (2 * Math.PI) - 0.5)) * n * Math.tan(θ)) / (r * w)
    - (2 * n * Math.atan(m / r) * Math.tan(θ)) / (r * w);
}

/** The acoustic wave (the change of the refractive index): m Sin[w x]. */
export const wave = (x, { m, w }) => m * Math.sin(w * x);

/** The largest |Δy/Δx| between neighbouring points of a drawn line (one run of points). */
export function steepestChord(pts) {
  let s = 0;
  for (let i = 1; i < pts.length; i++) s = Math.max(s, Math.abs((pts[i][1] - pts[i - 1][1]) / (pts[i][0] - pts[i - 1][0])));
  return s;
}

/** The Manipulate body. */
export function evaluate(state) {
  const s = { ...state, m: clampM(state) };
  const plot = Plot((x) => [lightPath(x, s), wave(x, s)], [0, 50], {
    PlotStyle: [Thick, Dashed], ImageSize: [500, 300], ImagePadding: [[25, 25], [10, 10]],
    label: 'The path of light (solid) and the acoustic wave (dashed)',
  });
  const [path, sound] = plot.list;
  const pts = path.find((d) => d && d.head === 'Line').pts;
  return {
    state: s,
    view: {
      m: s.m,
      yEnd: lightPath(50, s),
      plotRange: plot.options.PlotRange,
      samples: pts.length,
      steepest: steepestChord(pts), // a spike at a branch point would show here (N-LT-01)
    },
    graphics: Graphics([Annotation(path, 'light-path'), Annotation(sound, 'sound-wave')], plot.options),
  };
}
