// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Haoran Zhao
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/robot-motion-obstacles/model.js — "Robot Motion with Obstacles" (Aaron T. Becker and Haoran Zhao): the
// Manipulate variables and exactly one evaluation of the Manipulate body, in the original's order of operations.
// Pure: no DOM, importable in Node. The shared grid code is in demos/common/arm-grid.js (owned by this app).
import { mUnequal } from '../../shared/mma.js';
import { armGeometry } from '../common/two-link.js';
import { arrowArc } from '../common/arrow-arcs.js';
import { W, L, applyTorus, locatorToAngles, armHits, cSpaceTable } from '../common/arm-grid.js';

/**
 * The Input cell's values (the first value of each control specification): obstacles {1.1, 1.1} and {1.1, -1.1},
 * configuration {5, 0}, Q 2, and the cache variables freeConfigSpace ({freeConfigSpace, {0, 0}, None} → 0), highRes
 * False, pObsOld = pObs2Old = {-3, -2}, QualityOld 1. The first evaluation computes the 64 × 64 grid, which gives the
 * live state saved in the notebook (D-RM-07).
 */
export function initialState() {
  return {
    pObs: [1.1, 1.1], pObs2: [1.1, -1.1], pConfig: [5, 0], Quality: 2,
    freeConfigSpace: 0, highRes: false, pObsOld: [-3, -2], pObs2Old: [-3, -2], QualityOld: 1,
  };
}

/**
 * One evaluation of the Manipulate body. `controlActive` = Mathematica's ControlActive[] during this evaluation.
 * Returns { state (the new values of the Manipulate variables; the input is not modified), view }.
 * The view holds the Module locals and the drawing data: Theta1, Theta2, inCollision, resolution (undefined when the
 * grid was not recomputed), recomputed, geometry (two-link.js armGeometry), arcs (arrow-arcs.js arrowArc of the two
 * angle arcs), glyph ('red' | 'green': loc[Red] or loc[Darker[Green]]), gridSize.
 */
export function evaluate(input, { controlActive = false } = {}) {
  const st = { ...input, pConfig: [...input.pConfig], pObs: [...input.pObs], pObs2: [...input.pObs2] };
  // (*enable torus property*) If[pConfig[[1]] < xMin, pConfig[[1]] = xMax]; If[pConfig[[1]] > xMax, …]; the same for y
  st.pConfig = applyTorus(st.pConfig);
  const [Theta1, Theta2] = locatorToAngles(st.pConfig);
  const pObsV = [st.pObs, st.pObs2];
  const inCollision = armHits(Theta1, Theta1 + Theta2, pObsV);
  // Inside the Graphics list: the cache If, then the ArrayPlot
  let resolution, recomputed = false;
  if (mUnequal(st.pObsOld, st.pObs) || mUnequal(st.pObs2Old, st.pObs2) || mUnequal(st.QualityOld, st.Quality) || !st.highRes) {
    // resolution = ControlActive[highRes = False; 8 Quality, highRes = True; 32 Quality]
    if (controlActive) { st.highRes = false; resolution = 8 * st.Quality; } else { st.highRes = true; resolution = 32 * st.Quality; }
    st.freeConfigSpace = cSpaceTable(pObsV, resolution, 1, 0);
    st.pObsOld = [...st.pObs]; st.pObs2Old = [...st.pObs2]; st.QualityOld = st.Quality;
    recomputed = true;
  }
  const geometry = armGeometry({ r1: L, r2: L, theta1: Theta1, theta2: Theta2, w: W, theta1LabelRadius: L / 2, robotArmLabel: 'link2' });
  const arcs = [
    arrowArc({ center: [0, 0], r: L / 3, start: 0, end: Theta1 }),
    arrowArc({ center: geometry.elbow, r: L / 3, start: Theta1, end: Theta1 + Theta2 }),
  ];
  const grid = st.freeConfigSpace;
  const gridSize = Array.isArray(grid) ? grid.length : 0;
  return {
    state: st,
    view: { Theta1, Theta2, inCollision, resolution, recomputed, geometry, arcs, glyph: inCollision ? 'red' : 'green', gridSize, pObsV },
  };
}

/** Number of blocked cells (1s) of a grid. */
export const blockedCount = (grid) => (Array.isArray(grid) ? grid.reduce((s, row) => s + row.reduce((t, v) => t + (v === 1 ? 1 : 0), 0), 0) : 0);
