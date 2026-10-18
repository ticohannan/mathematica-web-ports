// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Yitong Lu
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/prm-3d/model.js — pure port of "Probabilistic Roadmap Method in 3D" (Initialization code + one evaluation of
// the Manipulate body). No DOM, no three.js. Names, constants and order of operations follow the original
// (docs/original-source/prm-3d.txt); the functions the three PRM Demonstrations share are in demos/common/prm-core.js
// (generalised to n dimensions for this app). The two pictures are returned as Graphics3D DATA (demos/common/g3d.js).
import { mLess, mGreater, mUnequal, euclid, roundTo } from '../../shared/mma.js';
import { NAMED, lighter, darker } from '../../shared/mma-colors.js';
import {
  TWO_PI, toroidDist, wrapto0to2pi, pathOKT, connectPoints as connectPointsCore, myAstar as myAstarCore, planQuery,
  progressOnPath, toroidLine, toroidLines, toroidPt as toroidPtCore,
} from '../common/prm-core.js';
import {
  Cylinder, Cuboid, Sphere, Point, Line, Opacity, EdgeForm, PointSize, RGBColor, GeometricTransformation, affine,
  rotationMatrix, Graphics3D,
} from '../common/g3d.js';

export { TWO_PI, toroidDist, wrapto0to2pi, toroidLine, toroidLines };

// ---- constants of the Manipulate's Module (and the control specifications) -------------------------------------
export const OBS_RAD = 0.5; // obsRad = 0.5
export const WIDTHA = 0.05; // widtha = .05
export const DELTA = 0.1; // delta = .1
export const W = 1 / 8, L = 1, PW = 0.25; // w = 1/8, l = 1, pw = .25: Module locals the original never uses (N-P3-04)
export const BATCH = 100; // "add 100 vertices": RandomReal[{0, 2π}, {100, 3}]
/** Control[{{Obstaxy, {1, 0}, ...}, 3{-1, -1}, {1, 1}}]: ORIGINAL QUIRK (Q-P3-13) the pads span {-3,-3} … {1,1} */
export const PAD_MIN = [-3, -3], PAD_MAX = [1, 1];
/** θ sliders {-.1, 6.3, 0.01}; radius {0, 12, 0.01}; progress {0, 1, 0.01}; blue_z / yellow_z vertical sliders 0 … 2 */
export const THETA_SLIDER = { min: -0.1, max: 6.3, step: 0.01 };
export const R_SLIDER = { min: 0, max: 12, step: 0.01 };
export const PROGRESS_SLIDER = { min: 0, max: 1, step: 0.01 };
export const Z_SLIDER = { min: 0, max: 2 };
/** {{viewPoint1, {1.3, -2.4, 2}}, None}, viewPoint2 likewise (ViewPoint -> Dynamic[...]) */
export const VIEWPOINT = [1.3, -2.4, 2];
/** PlotRange of the two pictures */
export const WORKSPACE_RANGE = [[-3.5, 3.5], [-3.5, 3.5], [-1.1, 3.4]];
export const PHASE_RANGE = [[0, TWO_PI], [0, TWO_PI], [0, TWO_PI]];

// colours of the source (named colours, Lighter/Darker as Blend with White/Black)
export const COLORS = {
  Red: NAMED.Red, Green: NAMED.Green, Blue: NAMED.Blue, Yellow: NAMED.Yellow, Brown: NAMED.Brown, Gray: NAMED.Gray,
  Magenta: NAMED.Magenta, Orange: NAMED.Orange, Purple: NAMED.Purple, Black: NAMED.Black, White: NAMED.White,
  LighterBrown: lighter(NAMED.Brown), DarkerGreen: darker(NAMED.Green),
};
const col = (name) => RGBColor(...COLORS[name]);

// ---- the Initialization data (Input cells; CC BY-NC-SA data of the original) ------------------------------------
// ptsI, badPtsI, goodPtsI, edgesNNI (181 edges) and edgesNNadji as written in the original's Input cells (readable
// source lines 178 … 190). edgesNNsaved / edgesNNadjSaved: the 180 edges and the adjacency of the SAVED state (the
// stored Manipulate variables, tests/golden/prm-3d.original-states.json states[0] = specs), which the published
// notebook opens with (F-P3-21, Q-P3-10).
export const ptsI = [[0.11,1.15,4.74],[4.16,5.33,3.1],[5.2,4.18,0.57],[0.22,4.84,5.49],[4.58,0.14,2.11],[4.64,6.14,0.39],[4.06,6.25,4.24],[0.7,2.93,2.94],[5.27,1.86,5.1],[2.83,5.26,3.61],[0.53,6.1,3.9],[3.94,0.5,2.84],[5.71,0.79,5.69],[3.45,1.65,2.51],[3.22,3.07,5.35],[4.29,1.8,3.43],[6.25,5.7,2.92],[5.06,1.06,5.32],[4.48,5.26,4.39],[6.17,3.53,4.72],[6.09,4.43,0.48],[0.26,5.36,4.49],[0.93,3.42,3.29],[1.55,2.34,5.05],[4.08,1.11,2.39],[4.34,4.16,2.1],[2.16,1.31,1.58],[0.98,4.58,3.65],[4.11,1.85,4.9],[1.59,2.27,1.06],[0.27,3.66,2.42],[1.67,6.19,2.51],[5.99,4.84,0.54],[2.75,4.06,5.68],[5.12,4.04,0.52],[5.22,5.22,1.74],[2.94,1.4,4.29],[5.14,1.22,3.36],[2.26,1.09,4.31],[3.77,3.37,3.07],[4.26,2.32,0.38],[1.14,2.55,1.54],[3.89,5.48,2.37],[5.75,6.17,3.8],[1.18,4.62,3.28],[0.84,5.38,4.89],[3.93,0.17,3.17],[1.58,0.79,0.94],[4.67,4.44,3.25],[2.06,4.44,1.88],[5.66,5.51,0.79],[5.48,5.85,2.78],[2.24,5.12,5.96],[5.12,2.62,3.82],[1.61,0.67,0.9],[2.86,0.13,0.76],[5.25,4.98,5],[4.14,1.94,2.16],[2.6,5.45,0.54],[4.72,2.14,2.87],[4.45,4.19,2.3],[1.64,3.97,0.81],[3.07,4.13,3.25],[0.11,6,3.96],[5.86,5.87,4.66],[4.87,6.2,3.02],[4.1,2.66,4.95],[4.07,3.79,2.48],[2,5.59,2.26],[4.66,0.64,2.06],[5.11,5.69,1.94],[5.05,4.15,3.81],[0.75,6.06,5.95],[3.64,1.45,3.87],[0.07,3.97,5.75],[1.07,3.84,3.44],[4.48,4.88,1.84],[1.11,4.23,1.25],[1.57,2.75,2.02],[4.71,4.95,3.01],[2.58,0.29,2.11],[1.92,0.17,3.17],[2.28,4.75,3.09],[5.72,0.09,4.05],[2.26,3.05,5.02],[5.59,5.32,5.63],[1.04,1.04,4.68],[1.03,3.39,5.12],[3.72,4.51,2.84],[0.43,5.91,0.47],[4.55,0.66,1.89],[1.73,5.75,2.25],[1.91,2.59,3.01],[4.17,5.08,5.52],[5.36,1.43,5.57],[3.79,3.06,6.27],[4.29,1.48,3.23],[1.05,0.07,1.27],[5.32,1.26,4.76],[0.75,1.51,5.22]];
export const badPtsI = [[5.2,4.18,0.57],[0.22,4.84,5.49],[4.58,0.14,2.11],[4.64,6.14,0.39],[4.48,5.26,4.39],[6.09,4.43,0.48],[4.34,4.16,2.1],[5.99,4.84,0.54],[5.12,4.04,0.52],[4.67,4.44,3.25],[4.72,2.14,2.87],[4.45,4.19,2.3],[1.64,3.97,0.81],[4.87,6.2,3.02],[4.66,0.64,2.06],[5.05,4.15,3.81],[4.48,4.88,1.84],[1.11,4.23,1.25],[4.71,4.95,3.01],[4.55,0.66,1.89]];
export const goodPtsI = [[0.11,1.15,4.74],[4.16,5.33,3.1],[4.06,6.25,4.24],[0.7,2.93,2.94],[5.27,1.86,5.1],[2.83,5.26,3.61],[0.53,6.1,3.9],[3.94,0.5,2.84],[5.71,0.79,5.69],[3.45,1.65,2.51],[3.22,3.07,5.35],[4.29,1.8,3.43],[6.25,5.7,2.92],[5.06,1.06,5.32],[6.17,3.53,4.72],[0.26,5.36,4.49],[0.93,3.42,3.29],[1.55,2.34,5.05],[4.08,1.11,2.39],[2.16,1.31,1.58],[0.98,4.58,3.65],[4.11,1.85,4.9],[1.59,2.27,1.06],[0.27,3.66,2.42],[1.67,6.19,2.51],[2.75,4.06,5.68],[5.22,5.22,1.74],[2.94,1.4,4.29],[5.14,1.22,3.36],[2.26,1.09,4.31],[3.77,3.37,3.07],[4.26,2.32,0.38],[1.14,2.55,1.54],[3.89,5.48,2.37],[5.75,6.17,3.8],[1.18,4.62,3.28],[0.84,5.38,4.89],[3.93,0.17,3.17],[1.58,0.79,0.94],[2.06,4.44,1.88],[5.66,5.51,0.79],[5.48,5.85,2.78],[2.24,5.12,5.96],[5.12,2.62,3.82],[1.61,0.67,0.9],[2.86,0.13,0.76],[5.25,4.98,5],[4.14,1.94,2.16],[2.6,5.45,0.54],[3.07,4.13,3.25],[0.11,6,3.96],[5.86,5.87,4.66],[4.1,2.66,4.95],[4.07,3.79,2.48],[2,5.59,2.26],[5.11,5.69,1.94],[0.75,6.06,5.95],[3.64,1.45,3.87],[0.07,3.97,5.75],[1.07,3.84,3.44],[1.57,2.75,2.02],[2.58,0.29,2.11],[1.92,0.17,3.17],[2.28,4.75,3.09],[5.72,0.09,4.05],[2.26,3.05,5.02],[5.59,5.32,5.63],[1.04,1.04,4.68],[1.03,3.39,5.12],[3.72,4.51,2.84],[0.43,5.91,0.47],[1.73,5.75,2.25],[1.91,2.59,3.01],[4.17,5.08,5.52],[5.36,1.43,5.57],[3.79,3.06,6.27],[4.29,1.48,3.23],[1.05,0.07,1.27],[5.32,1.26,4.76],[0.75,1.51,5.22]];
export const edgesNNI = [[[0.11,1.15,4.74],[0.75,1.51,5.22]],[[0.11,1.15,4.74],[1.04,1.04,4.68]],[[0.11,1.15,4.74],[5.32,1.26,4.76]],[[0.11,1.15,4.74],[5.71,0.79,5.69]],[[0.11,1.15,4.74],[5.36,1.43,5.57]],[[0.11,1.15,4.74],[5.27,1.86,5.1]],[[0.11,1.15,4.74],[5.72,0.09,4.05]],[[0.11,1.15,4.74],[5.06,1.06,5.32]],[[4.16,5.33,3.1],[3.89,5.48,2.37]],[[4.16,5.33,3.1],[3.72,4.51,2.84]],[[4.16,5.33,3.1],[3.93,0.17,3.17]],[[4.16,5.33,3.1],[2.83,5.26,3.61]],[[4.16,5.33,3.1],[3.94,0.5,2.84]],[[4.06,6.25,4.24],[3.93,0.17,3.17]],[[0.7,2.93,2.94],[0.93,3.42,3.29]],[[0.7,2.93,2.94],[0.27,3.66,2.42]],[[0.7,2.93,2.94],[1.07,3.84,3.44]],[[0.7,2.93,2.94],[1.91,2.59,3.01]],[[0.7,2.93,2.94],[1.57,2.75,2.02]],[[5.27,1.86,5.1],[5.36,1.43,5.57]],[[5.27,1.86,5.1],[5.32,1.26,4.76]],[[5.27,1.86,5.1],[5.06,1.06,5.32]],[[5.27,1.86,5.1],[5.71,0.79,5.69]],[[5.27,1.86,5.1],[5.12,2.62,3.82]],[[2.83,5.26,3.61],[2.28,4.75,3.09]],[[2.83,5.26,3.61],[3.07,4.13,3.25]],[[2.83,5.26,3.61],[3.72,4.51,2.84]],[[0.53,6.1,3.9],[0.11,6,3.96]],[[0.53,6.1,3.9],[0.26,5.36,4.49]],[[0.53,6.1,3.9],[5.75,6.17,3.8]],[[0.53,6.1,3.9],[5.72,0.09,4.05]],[[0.53,6.1,3.9],[6.25,5.7,2.92]],[[0.53,6.1,3.9],[5.86,5.87,4.66]],[[0.53,6.1,3.9],[0.84,5.38,4.89]],[[3.94,0.5,2.84],[3.93,0.17,3.17]],[[3.94,0.5,2.84],[4.08,1.11,2.39]],[[3.94,0.5,2.84],[4.29,1.48,3.23]],[[3.94,0.5,2.84],[3.45,1.65,2.51]],[[3.94,0.5,2.84],[3.89,5.48,2.37]],[[3.94,0.5,2.84],[3.64,1.45,3.87]],[[3.94,0.5,2.84],[4.29,1.8,3.43]],[[5.71,0.79,5.69],[5.36,1.43,5.57]],[[5.71,0.79,5.69],[5.06,1.06,5.32]],[[5.71,0.79,5.69],[5.32,1.26,4.76]],[[3.45,1.65,2.51],[4.14,1.94,2.16]],[[3.45,1.65,2.51],[4.08,1.11,2.39]],[[3.45,1.65,2.51],[4.29,1.48,3.23]],[[3.45,1.65,2.51],[4.29,1.8,3.43]],[[3.45,1.65,2.51],[3.64,1.45,3.87]],[[3.22,3.07,5.35],[2.26,3.05,5.02]],[[3.22,3.07,5.35],[4.1,2.66,4.95]],[[3.22,3.07,5.35],[3.79,3.06,6.27]],[[4.29,1.8,3.43],[4.29,1.48,3.23]],[[4.29,1.8,3.43],[3.64,1.45,3.87]],[[4.29,1.8,3.43],[4.08,1.11,2.39]],[[4.29,1.8,3.43],[4.14,1.94,2.16]],[[4.29,1.8,3.43],[4.11,1.85,4.9]],[[6.25,5.7,2.92],[5.48,5.85,2.78]],[[6.25,5.7,2.92],[0.11,6,3.96]],[[6.25,5.7,2.92],[5.75,6.17,3.8]],[[6.25,5.7,2.92],[5.72,0.09,4.05]],[[5.06,1.06,5.32],[5.36,1.43,5.57]],[[5.06,1.06,5.32],[5.32,1.26,4.76]],[[6.17,3.53,4.72],[0.07,3.97,5.75]],[[6.17,3.53,4.72],[1.03,3.39,5.12]],[[0.26,5.36,4.49],[0.84,5.38,4.89]],[[0.26,5.36,4.49],[0.11,6,3.96]],[[0.26,5.36,4.49],[5.86,5.87,4.66]],[[0.26,5.36,4.49],[5.75,6.17,3.8]],[[0.26,5.36,4.49],[0.98,4.58,3.65]],[[0.26,5.36,4.49],[5.72,0.09,4.05]],[[0.26,5.36,4.49],[5.59,5.32,5.63]],[[0.93,3.42,3.29],[1.07,3.84,3.44]],[[0.93,3.42,3.29],[0.27,3.66,2.42]],[[0.93,3.42,3.29],[0.98,4.58,3.65]],[[0.93,3.42,3.29],[1.18,4.62,3.28]],[[0.93,3.42,3.29],[1.91,2.59,3.01]],[[1.55,2.34,5.05],[2.26,3.05,5.02]],[[1.55,2.34,5.05],[0.75,1.51,5.22]],[[1.55,2.34,5.05],[1.03,3.39,5.12]],[[1.55,2.34,5.05],[1.04,1.04,4.68]],[[4.08,1.11,2.39],[4.14,1.94,2.16]],[[4.08,1.11,2.39],[4.29,1.48,3.23]],[[4.08,1.11,2.39],[3.93,0.17,3.17]],[[2.16,1.31,1.58],[1.58,0.79,0.94]],[[2.16,1.31,1.58],[1.61,0.67,0.9]],[[2.16,1.31,1.58],[2.58,0.29,2.11]],[[2.16,1.31,1.58],[1.59,2.27,1.06]],[[0.98,4.58,3.65],[1.18,4.62,3.28]],[[0.98,4.58,3.65],[1.07,3.84,3.44]],[[0.98,4.58,3.65],[2.28,4.75,3.09]],[[0.98,4.58,3.65],[0.84,5.38,4.89]],[[4.11,1.85,4.9],[4.1,2.66,4.95]],[[4.11,1.85,4.9],[3.64,1.45,3.87]],[[4.11,1.85,4.9],[2.94,1.4,4.29]],[[1.59,2.27,1.06],[1.14,2.55,1.54]],[[1.59,2.27,1.06],[1.57,2.75,2.02]],[[1.59,2.27,1.06],[1.58,0.79,0.94]],[[0.27,3.66,2.42],[1.07,3.84,3.44]],[[1.67,6.19,2.51],[1.73,5.75,2.25]],[[1.67,6.19,2.51],[2,5.59,2.26]],[[1.67,6.19,2.51],[1.92,0.17,3.17]],[[1.67,6.19,2.51],[2.58,0.29,2.11]],[[1.67,6.19,2.51],[1.05,0.07,1.27]],[[2.75,4.06,5.68],[2.24,5.12,5.96]],[[5.22,5.22,1.74],[5.11,5.69,1.94]],[[5.22,5.22,1.74],[5.66,5.51,0.79]],[[2.94,1.4,4.29],[2.26,1.09,4.31]],[[2.94,1.4,4.29],[3.64,1.45,3.87]],[[5.14,1.22,3.36],[5.32,1.26,4.76]],[[5.14,1.22,3.36],[5.72,0.09,4.05]],[[5.14,1.22,3.36],[5.12,2.62,3.82]],[[2.26,1.09,4.31],[1.04,1.04,4.68]],[[2.26,1.09,4.31],[3.64,1.45,3.87]],[[2.26,1.09,4.31],[1.92,0.17,3.17]],[[3.77,3.37,3.07],[4.07,3.79,2.48]],[[3.77,3.37,3.07],[3.07,4.13,3.25]],[[3.77,3.37,3.07],[3.72,4.51,2.84]],[[4.26,2.32,0.38],[3.79,3.06,6.27]],[[1.14,2.55,1.54],[1.57,2.75,2.02]],[[3.89,5.48,2.37],[3.72,4.51,2.84]],[[3.89,5.48,2.37],[3.93,0.17,3.17]],[[5.75,6.17,3.8],[5.72,0.09,4.05]],[[5.75,6.17,3.8],[0.11,6,3.96]],[[5.75,6.17,3.8],[5.86,5.87,4.66]],[[5.75,6.17,3.8],[5.48,5.85,2.78]],[[1.18,4.62,3.28],[1.07,3.84,3.44]],[[1.18,4.62,3.28],[2.28,4.75,3.09]],[[0.84,5.38,4.89],[0.75,6.06,5.95]],[[0.84,5.38,4.89],[0.11,6,3.96]],[[0.84,5.38,4.89],[5.86,5.87,4.66]],[[3.93,0.17,3.17],[4.29,1.48,3.23]],[[3.93,0.17,3.17],[3.64,1.45,3.87]],[[1.58,0.79,0.94],[1.61,0.67,0.9]],[[1.58,0.79,0.94],[1.05,0.07,1.27]],[[1.58,0.79,0.94],[2.86,0.13,0.76]],[[2.06,4.44,1.88],[2,5.59,2.26]],[[2.06,4.44,1.88],[2.28,4.75,3.09]],[[2.06,4.44,1.88],[1.73,5.75,2.25]],[[5.66,5.51,0.79],[0.43,5.91,0.47]],[[5.66,5.51,0.79],[5.11,5.69,1.94]],[[5.66,5.51,0.79],[5.59,5.32,5.63]],[[5.48,5.85,2.78],[5.11,5.69,1.94]],[[5.48,5.85,2.78],[5.72,0.09,4.05]],[[5.48,5.85,2.78],[0.11,6,3.96]],[[2.24,5.12,5.96],[2.6,5.45,0.54]],[[1.61,0.67,0.9],[1.05,0.07,1.27]],[[1.61,0.67,0.9],[2.86,0.13,0.76]],[[2.86,0.13,0.76],[2.6,5.45,0.54]],[[2.86,0.13,0.76],[2.58,0.29,2.11]],[[5.25,4.98,5],[5.59,5.32,5.63]],[[5.25,4.98,5],[5.86,5.87,4.66]],[[4.14,1.94,2.16],[4.29,1.48,3.23]],[[3.07,4.13,3.25],[3.72,4.51,2.84]],[[3.07,4.13,3.25],[2.28,4.75,3.09]],[[3.07,4.13,3.25],[4.07,3.79,2.48]],[[0.11,6,3.96],[5.72,0.09,4.05]],[[0.11,6,3.96],[5.86,5.87,4.66]],[[5.86,5.87,4.66],[5.72,0.09,4.05]],[[5.86,5.87,4.66],[5.59,5.32,5.63]],[[4.1,2.66,4.95],[3.79,3.06,6.27]],[[4.07,3.79,2.48],[3.72,4.51,2.84]],[[2,5.59,2.26],[1.73,5.75,2.25]],[[2,5.59,2.26],[2.58,0.29,2.11]],[[2,5.59,2.26],[2.28,4.75,3.09]],[[2,5.59,2.26],[1.92,0.17,3.17]],[[0.75,6.06,5.95],[0.43,5.91,0.47]],[[3.64,1.45,3.87],[4.29,1.48,3.23]],[[0.07,3.97,5.75],[1.03,3.39,5.12]],[[1.57,2.75,2.02],[1.91,2.59,3.01]],[[2.58,0.29,2.11],[1.73,5.75,2.25]],[[2.58,0.29,2.11],[1.92,0.17,3.17]],[[1.92,0.17,3.17],[1.73,5.75,2.25]],[[2.28,4.75,3.09],[1.73,5.75,2.25]],[[2.28,4.75,3.09],[3.72,4.51,2.84]],[[5.72,0.09,4.05],[5.32,1.26,4.76]],[[2.26,3.05,5.02],[1.03,3.39,5.12]],[[1.04,1.04,4.68],[0.75,1.51,5.22]],[[0.43,5.91,0.47],[1.05,0.07,1.27]],[[1.73,5.75,2.25],[1.05,0.07,1.27]],[[5.36,1.43,5.57],[5.32,1.26,4.76]]];
export const edgesNNadji = [[80,68,79,9,75,5,65,14],[34,70,38,6,8],[38],[17,24,60,73,61],[1,75,79,14,9,44],[2,64,50,70],[51,16,35,65,13,52,37],[2,38,19,77,10,34,58,12],[1,5,75,14,79],[8,48,19,77,12,58],[66,53,76],[8,10,77,58,19,48,22],[7,42,51,35,65],[1,5,9,75,79],[59,69],[7,37,51,52,35,21,65,67],[4,60,24,21,36,73],[66,80,69,68],[8,10,12,48,77,38],[39,45,62,23],[16,17,36,60,64,37],[12,53,58,28],[20,33,61,39],[4,17,60],[72,55,63,62,78],[43],[56,41],[22,30,58],[79,65,44],[28,68,58,63],[54,50,70],[76],[23,61],[2,8,70,38],[7,13,16,65,51,52,42],[17,21,60,64],[7,16,21,57,51,52],[2,3,8,19,34,77,58],[20,23,45,78,46],[55,64,72],[27,71,56,67],[13,35,56,65,51],[26,49],[5,29],[20,39,78,46],[39,45,49,62],[67,52],[10,12,19,77],[43,46],[6,31,70,64,54],[7,13,16,35,37,42,65,52],[7,16,35,37,47,51,65,67],[11,22,76],[31,50,70],[25,40,72,62,64,63],[27,41,42],[37,71],[8,10,12,22,28,30,38,77],[15,69],[4,17,21,24,36],[4,23,33,73],[20,25,46,55,72,63],[25,30,55,62,72],[6,21,36,40,50,55,72,70],[1,7,13,16,29,35,42,51,52,79],[11,18,69],[16,41,47,52],[1,18,30,80],[15,18,59,66],[2,6,31,34,50,54,64],[41,57,78],[25,40,55,62,63,64,78],[4,17,61],[],[1,5,9,14,79],[11,32,53],[8,10,12,19,38,48,58],[25,39,45,71,72],[1,5,9,14,29,65,75],[1,18,68]];
export const edgesNNsaved = [[[0.11,1.15,4.74],[0.75,1.51,5.22]],[[0.11,1.15,4.74],[1.04,1.04,4.68]],[[0.11,1.15,4.74],[5.32,1.26,4.76]],[[0.11,1.15,4.74],[5.71,0.79,5.69]],[[0.11,1.15,4.74],[5.36,1.43,5.57]],[[0.11,1.15,4.74],[5.27,1.86,5.1]],[[0.11,1.15,4.74],[5.72,0.09,4.05]],[[0.11,1.15,4.74],[5.06,1.06,5.32]],[[4.16,5.33,3.1],[3.89,5.48,2.37]],[[4.16,5.33,3.1],[3.72,4.51,2.84]],[[4.16,5.33,3.1],[3.93,0.17,3.17]],[[4.16,5.33,3.1],[2.83,5.26,3.61]],[[4.16,5.33,3.1],[3.94,0.5,2.84]],[[4.06,6.25,4.24],[3.93,0.17,3.17]],[[0.7,2.93,2.94],[0.93,3.42,3.29]],[[0.7,2.93,2.94],[0.27,3.66,2.42]],[[0.7,2.93,2.94],[1.07,3.84,3.44]],[[0.7,2.93,2.94],[1.91,2.59,3.01]],[[0.7,2.93,2.94],[1.57,2.75,2.02]],[[5.27,1.86,5.1],[5.36,1.43,5.57]],[[5.27,1.86,5.1],[5.32,1.26,4.76]],[[5.27,1.86,5.1],[5.06,1.06,5.32]],[[5.27,1.86,5.1],[5.71,0.79,5.69]],[[5.27,1.86,5.1],[5.12,2.62,3.82]],[[2.83,5.26,3.61],[2.28,4.75,3.09]],[[2.83,5.26,3.61],[3.07,4.13,3.25]],[[2.83,5.26,3.61],[3.72,4.51,2.84]],[[0.53,6.1,3.9],[0.11,6.0,3.96]],[[0.53,6.1,3.9],[0.26,5.36,4.49]],[[0.53,6.1,3.9],[5.75,6.17,3.8]],[[0.53,6.1,3.9],[5.72,0.09,4.05]],[[0.53,6.1,3.9],[6.25,5.7,2.92]],[[0.53,6.1,3.9],[5.86,5.87,4.66]],[[0.53,6.1,3.9],[0.84,5.38,4.89]],[[3.94,0.5,2.84],[3.93,0.17,3.17]],[[3.94,0.5,2.84],[4.08,1.11,2.39]],[[3.94,0.5,2.84],[4.29,1.48,3.23]],[[3.94,0.5,2.84],[3.45,1.65,2.51]],[[3.94,0.5,2.84],[3.89,5.48,2.37]],[[3.94,0.5,2.84],[3.64,1.45,3.87]],[[3.94,0.5,2.84],[4.29,1.8,3.43]],[[5.71,0.79,5.69],[5.36,1.43,5.57]],[[5.71,0.79,5.69],[5.06,1.06,5.32]],[[5.71,0.79,5.69],[5.32,1.26,4.76]],[[3.45,1.65,2.51],[4.14,1.94,2.16]],[[3.45,1.65,2.51],[4.08,1.11,2.39]],[[3.45,1.65,2.51],[4.29,1.48,3.23]],[[3.45,1.65,2.51],[4.29,1.8,3.43]],[[3.45,1.65,2.51],[3.64,1.45,3.87]],[[3.22,3.07,5.35],[2.26,3.05,5.02]],[[3.22,3.07,5.35],[4.1,2.66,4.95]],[[3.22,3.07,5.35],[3.79,3.06,6.27]],[[4.29,1.8,3.43],[4.29,1.48,3.23]],[[4.29,1.8,3.43],[3.64,1.45,3.87]],[[4.29,1.8,3.43],[4.08,1.11,2.39]],[[4.29,1.8,3.43],[4.14,1.94,2.16]],[[4.29,1.8,3.43],[4.11,1.85,4.9]],[[6.25,5.7,2.92],[5.48,5.85,2.78]],[[6.25,5.7,2.92],[0.11,6.0,3.96]],[[6.25,5.7,2.92],[5.75,6.17,3.8]],[[6.25,5.7,2.92],[5.72,0.09,4.05]],[[5.06,1.06,5.32],[5.36,1.43,5.57]],[[5.06,1.06,5.32],[5.32,1.26,4.76]],[[6.17,3.53,4.72],[0.07,3.97,5.75]],[[6.17,3.53,4.72],[1.03,3.39,5.12]],[[0.26,5.36,4.49],[0.84,5.38,4.89]],[[0.26,5.36,4.49],[0.11,6.0,3.96]],[[0.26,5.36,4.49],[5.86,5.87,4.66]],[[0.26,5.36,4.49],[5.75,6.17,3.8]],[[0.26,5.36,4.49],[0.98,4.58,3.65]],[[0.26,5.36,4.49],[5.72,0.09,4.05]],[[0.26,5.36,4.49],[5.59,5.32,5.63]],[[0.93,3.42,3.29],[1.07,3.84,3.44]],[[0.93,3.42,3.29],[0.27,3.66,2.42]],[[0.93,3.42,3.29],[0.98,4.58,3.65]],[[0.93,3.42,3.29],[1.18,4.62,3.28]],[[0.93,3.42,3.29],[1.91,2.59,3.01]],[[1.55,2.34,5.05],[2.26,3.05,5.02]],[[1.55,2.34,5.05],[0.75,1.51,5.22]],[[1.55,2.34,5.05],[1.03,3.39,5.12]],[[1.55,2.34,5.05],[1.04,1.04,4.68]],[[4.08,1.11,2.39],[4.14,1.94,2.16]],[[4.08,1.11,2.39],[4.29,1.48,3.23]],[[4.08,1.11,2.39],[3.93,0.17,3.17]],[[2.16,1.31,1.58],[1.58,0.79,0.94]],[[2.16,1.31,1.58],[1.61,0.67,0.9]],[[2.16,1.31,1.58],[2.58,0.29,2.11]],[[2.16,1.31,1.58],[1.59,2.27,1.06]],[[0.98,4.58,3.65],[1.18,4.62,3.28]],[[0.98,4.58,3.65],[1.07,3.84,3.44]],[[0.98,4.58,3.65],[2.28,4.75,3.09]],[[0.98,4.58,3.65],[0.84,5.38,4.89]],[[4.11,1.85,4.9],[4.1,2.66,4.95]],[[4.11,1.85,4.9],[3.64,1.45,3.87]],[[4.11,1.85,4.9],[2.94,1.4,4.29]],[[1.59,2.27,1.06],[1.14,2.55,1.54]],[[1.59,2.27,1.06],[1.57,2.75,2.02]],[[1.59,2.27,1.06],[1.58,0.79,0.94]],[[0.27,3.66,2.42],[1.07,3.84,3.44]],[[1.67,6.19,2.51],[1.73,5.75,2.25]],[[1.67,6.19,2.51],[2.0,5.59,2.26]],[[1.67,6.19,2.51],[1.92,0.17,3.17]],[[1.67,6.19,2.51],[2.58,0.29,2.11]],[[1.67,6.19,2.51],[1.05,0.07,1.27]],[[2.75,4.06,5.68],[2.24,5.12,5.96]],[[5.22,5.22,1.74],[5.11,5.69,1.94]],[[5.22,5.22,1.74],[5.66,5.51,0.79]],[[2.94,1.4,4.29],[2.26,1.09,4.31]],[[2.94,1.4,4.29],[3.64,1.45,3.87]],[[5.14,1.22,3.36],[5.32,1.26,4.76]],[[5.14,1.22,3.36],[5.72,0.09,4.05]],[[5.14,1.22,3.36],[5.12,2.62,3.82]],[[2.26,1.09,4.31],[1.04,1.04,4.68]],[[2.26,1.09,4.31],[3.64,1.45,3.87]],[[3.77,3.37,3.07],[4.07,3.79,2.48]],[[3.77,3.37,3.07],[3.07,4.13,3.25]],[[3.77,3.37,3.07],[3.72,4.51,2.84]],[[4.26,2.32,0.38],[3.79,3.06,6.27]],[[1.14,2.55,1.54],[1.57,2.75,2.02]],[[3.89,5.48,2.37],[3.72,4.51,2.84]],[[3.89,5.48,2.37],[3.93,0.17,3.17]],[[5.75,6.17,3.8],[5.72,0.09,4.05]],[[5.75,6.17,3.8],[0.11,6.0,3.96]],[[5.75,6.17,3.8],[5.86,5.87,4.66]],[[5.75,6.17,3.8],[5.48,5.85,2.78]],[[1.18,4.62,3.28],[1.07,3.84,3.44]],[[1.18,4.62,3.28],[2.28,4.75,3.09]],[[0.84,5.38,4.89],[0.75,6.06,5.95]],[[0.84,5.38,4.89],[0.11,6.0,3.96]],[[0.84,5.38,4.89],[5.86,5.87,4.66]],[[3.93,0.17,3.17],[4.29,1.48,3.23]],[[3.93,0.17,3.17],[3.64,1.45,3.87]],[[1.58,0.79,0.94],[1.61,0.67,0.9]],[[1.58,0.79,0.94],[1.05,0.07,1.27]],[[1.58,0.79,0.94],[2.86,0.13,0.76]],[[2.06,4.44,1.88],[2.0,5.59,2.26]],[[2.06,4.44,1.88],[2.28,4.75,3.09]],[[2.06,4.44,1.88],[1.73,5.75,2.25]],[[5.66,5.51,0.79],[0.43,5.91,0.47]],[[5.66,5.51,0.79],[5.11,5.69,1.94]],[[5.66,5.51,0.79],[5.59,5.32,5.63]],[[5.48,5.85,2.78],[5.11,5.69,1.94]],[[5.48,5.85,2.78],[5.72,0.09,4.05]],[[5.48,5.85,2.78],[0.11,6.0,3.96]],[[2.24,5.12,5.96],[2.6,5.45,0.54]],[[1.61,0.67,0.9],[1.05,0.07,1.27]],[[1.61,0.67,0.9],[2.86,0.13,0.76]],[[2.86,0.13,0.76],[2.6,5.45,0.54]],[[2.86,0.13,0.76],[2.58,0.29,2.11]],[[5.25,4.98,5.0],[5.59,5.32,5.63]],[[5.25,4.98,5.0],[5.86,5.87,4.66]],[[4.14,1.94,2.16],[4.29,1.48,3.23]],[[3.07,4.13,3.25],[3.72,4.51,2.84]],[[3.07,4.13,3.25],[2.28,4.75,3.09]],[[3.07,4.13,3.25],[4.07,3.79,2.48]],[[0.11,6.0,3.96],[5.72,0.09,4.05]],[[0.11,6.0,3.96],[5.86,5.87,4.66]],[[5.86,5.87,4.66],[5.72,0.09,4.05]],[[5.86,5.87,4.66],[5.59,5.32,5.63]],[[4.1,2.66,4.95],[3.79,3.06,6.27]],[[4.07,3.79,2.48],[3.72,4.51,2.84]],[[2.0,5.59,2.26],[1.73,5.75,2.25]],[[2.0,5.59,2.26],[2.58,0.29,2.11]],[[2.0,5.59,2.26],[2.28,4.75,3.09]],[[2.0,5.59,2.26],[1.92,0.17,3.17]],[[0.75,6.06,5.95],[0.43,5.91,0.47]],[[3.64,1.45,3.87],[4.29,1.48,3.23]],[[0.07,3.97,5.75],[1.03,3.39,5.12]],[[1.57,2.75,2.02],[1.91,2.59,3.01]],[[2.58,0.29,2.11],[1.73,5.75,2.25]],[[2.58,0.29,2.11],[1.92,0.17,3.17]],[[1.92,0.17,3.17],[1.73,5.75,2.25]],[[2.28,4.75,3.09],[1.73,5.75,2.25]],[[2.28,4.75,3.09],[3.72,4.51,2.84]],[[5.72,0.09,4.05],[5.32,1.26,4.76]],[[2.26,3.05,5.02],[1.03,3.39,5.12]],[[1.04,1.04,4.68],[0.75,1.51,5.22]],[[0.43,5.91,0.47],[1.05,0.07,1.27]],[[1.73,5.75,2.25],[1.05,0.07,1.27]],[[5.36,1.43,5.57],[5.32,1.26,4.76]]];
export const edgesNNadjSaved = [[80,68,79,9,75,5,65,14],[34,70,38,6,8],[38],[17,24,60,73,61],[1,75,79,14,9,44],[2,64,50,70],[51,16,35,65,13,52,37],[2,38,19,77,10,34,58,12],[1,5,75,14,79],[8,48,19,77,12,58],[66,53,76],[8,10,77,58,19,48,22],[7,42,51,35,65],[1,5,9,75,79],[59,69],[7,37,51,52,35,21,65,67],[4,60,24,21,36,73],[66,80,69,68],[8,10,12,48,77,38],[39,45,62,23],[16,17,36,60,64,37],[12,53,58,28],[20,33,61,39],[4,17,60],[72,55,63,62,78],[43],[56,41],[22,30,58],[79,65,44],[28,68,58],[54,50,70],[76],[23,61],[2,8,70,38],[7,13,16,65,51,52,42],[17,21,60,64],[7,16,21,57,51,52],[2,3,8,19,34,77,58],[20,23,45,78,46],[55,64,72],[27,71,56,67],[13,35,56,65,51],[26,49],[5,29],[20,39,78,46],[39,45,49,62],[67,52],[10,12,19,77],[43,46],[6,31,70,64,54],[7,13,16,35,37,42,65,52],[7,16,35,37,47,51,65,67],[11,22,76],[31,50,70],[25,40,72,62,64,63],[27,41,42],[37,71],[8,10,12,22,28,30,38,77],[15,69],[4,17,21,24,36],[4,23,33,73],[20,25,46,55,72,63],[25,55,62,72],[6,21,36,40,50,55,72,70],[1,7,13,16,29,35,42,51,52,79],[11,18,69],[16,41,47,52],[1,18,30,80],[15,18,59,66],[2,6,31,34,50,54,64],[41,57,78],[25,40,55,62,63,64,78],[4,17,61],[],[1,5,9,14,79],[11,32,53],[8,10,12,19,38,48,58],[25,39,45,71,72],[1,5,9,14,29,65,75],[1,18,68]];


// ---- Initialization functions --------------------------------------------------------------------------------------
const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/**
 * pointsegdis2[{seg, pointlist}] := Module[{u = Subtract@@seg, mean = Plus@@seg/2}, Min[EuclideanDistance[#,
 *   (mean - u Sign@# Min[1, Abs@#]/2)&@(-(2 (# - mean).u)/u.u)]& /@ pointlist]]
 * The division -(2 (#-mean).u)/u.u is evaluated as a·(1/b), Mathematica's Times[a, Power[b, -1]] (COMMON-DECISIONS
 * §4; N-P3-06: the plain a/b gives the same classification of both stored sample sets and the same 180, 107 and 359
 * edges). EuclideanDistance = Sqrt of the sum of squares, left to right.
 */
export function pointsegdis2([seg, pointlist]) {
  const u = sub3(seg[0], seg[1]);
  const mean = [(seg[0][0] + seg[1][0]) / 2, (seg[0][1] + seg[1][1]) / 2, (seg[0][2] + seg[1][2]) / 2];
  const inv = 1 / dot3(u, u);
  let best = Infinity;
  for (const p of pointlist) {
    const s = -(2 * dot3(sub3(p, mean), u)) * inv;
    const k = (Math.sign(s) * Math.min(1, Math.abs(s))) / 2;
    const d = euclid(p, [mean[0] - u[0] * k, mean[1] - u[1] * k, mean[2] - u[2] * k]);
    if (d < best) best = d;
  }
  return best;
}

/** isCollided[{seg, pointlist}, d]: 1 if pointsegdis2 < d else 0 — defined by the original, never used (N-P3-04). */
export const isCollided = (segPts, d) => (mLess(pointsegdis2(segPts), d) ? 1 : 0);
/** linDist := Sqrt[(#1[[1]]-#2[[1]])^2 + (#1[[2]]-#2[[2]])^2 + (#1[[3]]-#2[[3]])^2]& — defined, never used (N-P3-04). */
export const linDist = (a, b) => Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);

/**
 * jointAngle2Origin[{θ1, θ2, θ3}]: the joint points o1, o2, o3 of the three-link robot (link lengths 1, base height 1):
 *   o1 = {Cos θ1, Sin θ1, 1}; o2 = o1 + {Cos θ1 Cos θ2, Sin θ1 Cos θ2, Sin θ2};
 *   o3 = o2 + {Cos θ1 Cos θ2 Cos θ3 + Sin θ1 Sin θ3, Sin θ1 Cos θ2 Cos θ3 - Cos θ1 Sin θ3, Cos θ3 Sin θ2}
 * Products of three factors are formed left to right (as written).
 */
export function jointAngle2Origin([Theta1, Theta2, Theta3]) {
  const c1 = Math.cos(Theta1), s1 = Math.sin(Theta1), c2 = Math.cos(Theta2), s2 = Math.sin(Theta2);
  const c3 = Math.cos(Theta3), s3 = Math.sin(Theta3);
  const o1 = [c1, s1, 1];
  const o2 = [o1[0] + c1 * c2, o1[1] + s1 * c2, o1[2] + s2];
  const o3 = [o2[0] + (c1 * c2 * c3 + s1 * s3), o2[1] + (s1 * c2 * c3 - c1 * s3), o2[2] + c3 * s2];
  return [o1, o2, o3];
}

/** The four tested segments: link 1 ({0,0,1} → o1), link 2 (o1 → o2), link 3 (o2 → o3), base ({0,0,0} → {0,0,1+2 widtha}). */
export function robotSegments([o1, o2, o3], widtha = WIDTHA) {
  return { link1: [[0, 0, 1], o1], link2: [o1, o2], link3: [o2, o3], base: [[0, 0, 0], [0, 0, 1 + 2 * widtha]] };
}

/**
 * detCollision[{o1, o2, o3}, pObs3, obsRad, widtha]: a link closer than obsRad + widtha to a sphere centre, or the base
 * segment closer than obsRad + 2 widtha. `<` is Mathematica's tolerant Less; Or stops at the first True.
 * ORIGINAL QUIRK (Q-P3-06): the base is drawn as a cylinder of radius 1/8 from z = -2.1 but tested as a segment from
 * z = 0 with margin 2 widtha (a sphere centre within 0.6 of it makes every configuration collide).
 */
export function detCollision(o, pObs3, obsRad, widtha) {
  const { link1, link2, link3, base } = robotSegments(o, widtha);
  return mLess(pointsegdis2([link1, pObs3]), obsRad + widtha)
    || mLess(pointsegdis2([link2, pObs3]), obsRad + widtha)
    || mLess(pointsegdis2([link3, pObs3]), obsRad + widtha)
    || mLess(pointsegdis2([base, pObs3]), obsRad + 2 * widtha);
}

/**
 * pathOKTrobot[ps, pe, pObs3, obsRad, widtha, delta]: the local planner (prm-core pathOKT in 3D) with
 * detCollision[jointAngle2Origin[pt], ...] as the collision test. Quirks Q-P3-05 (end points untested, segments not
 * longer than delta accepted untested).
 */
export const pathOKTrobot = (ps, pe, pObs3, obsRad, widtha, delta) => pathOKT(ps, pe, (pt) => detCollision(jointAngle2Origin(pt), pObs3, obsRad, widtha), delta);

/** toroidPt[e, frac] of this Demonstration: zero test on the absolute differences, wrapto0to2π (N-P3-03). */
export const toroidPt = (e, frac) => toroidPtCore(e, frac, { zeroTest: 'absolute' });

/** myAstar[adjL, verts, si, fi] (text identical to the 2D versions; the 3D toroidDist): Dijkstra in effect (Q-P3-05, E-P3-01). */
export const myAstar = (adjL, verts, si, fi) => myAstarCore(adjL, verts, si, fi, toroidDist);

/** connectPoints[goodPts, edgesNNadjin, pObs3, obsRad, widtha, delta, edgesNNin, point2start, r] -> [edgesNNadj, edgesNN] */
export function connectPoints(goodPts, edgesNNadjin, pObs3, obsRad, widtha, delta, edgesNNin, point2start, r) {
  return connectPointsCore(goodPts, edgesNNadjin, (ps, pe) => pathOKTrobot(ps, pe, pObs3, obsRad, widtha, delta), edgesNNin, point2start, r, toroidDist);
}

/** Rotate[g, θ, w, p] (rotation by θ about the axis w through the point p) as a GeometricTransformation. */
export function RotateAbout(content, theta, w, p) {
  const R = rotationMatrix(theta, w);
  const Rp = [0, 1, 2].map((i) => R[i][0] * p[0] + R[i][1] * p[1] + R[i][2] * p[2]);
  return GeometricTransformation(content, affine(R, [p[0] - Rp[0], p[1] - Rp[1], p[2] - Rp[2]]));
}

/**
 * drawRobot[{θ1, θ2, θ3}, widtha] as Graphics3D data:
 *   {Cylinder[{{0,0,-2.1}, {0,0,1+2 widtha}}, 1/8] (base),
 *    Rotate[{Cylinder[{{0,0,1}, {1+widtha,0,1}}, widtha] (link 1),
 *      Rotate[{Cuboid[{1-widtha,-widtha,1-widtha}, {2+widtha,widtha,1+widtha}] (link 2),
 *        Rotate[{Cuboid[{2-widtha,-widtha,1-widtha}, {3+widtha,widtha,1+widtha}] (link 3)}, θ3, {0,0,-1}, {2,0,1}]},
 *      θ2, {0,-1,0}, {1,0,1}]}, θ1, {0,0,1}, {0,0,1}]}
 */
export function drawRobot([Theta1, Theta2, Theta3], widtha = WIDTHA) {
  return [
    Cylinder([[0, 0, -2.1], [0, 0, 1 + 2 * widtha]], 1 / 8),
    RotateAbout([
      Cylinder([[0, 0, 1], [1 + widtha, 0, 1]], widtha),
      RotateAbout([
        Cuboid([1 - widtha, -widtha, 1 - widtha], [2 + widtha, widtha, 1 + widtha]),
        RotateAbout([Cuboid([2 - widtha, -widtha, 1 - widtha], [3 + widtha, widtha, 1 + widtha])], Theta3, [0, 0, -1], [2, 0, 1]),
      ], Theta2, [0, -1, 0], [1, 0, 1]),
    ], Theta1, [0, 0, 1], [0, 0, 1]),
  ];
}

// ---- the Manipulate's state ----------------------------------------------------------------------------------------
/** The Manipulate variables that a saved state / snapshot Settings hold (original names; θ1 … θ3 as in the fixture). */
export const VAR_NAMES = ['θ1', 'θ2', 'θ3', 'Obstaxy', 'Obstaz', 'Obstbxy', 'Obstbz', 'showConfigObs', 'r', 'progress', 'qf',
  'pts', 'goodPts', 'badPts', 'edgesNN', 'edgesNNadj', 'rold', 'pObsOlda', 'pObsOldb', 'highResa', 'highResb',
  'freeConfigSpacea', 'freeConfigSpaceb', 'addPoints', 'restart', 'newgoal', 'viewPoint1', 'viewPoint2', 'path'];

const copy = (x) => JSON.parse(JSON.stringify(x));
export const cloneState = (s) => copy(s);

/**
 * The opening state = the notebook's saved state = the stored specifications (Initial Settings), F-P3-21: θ = 0.25,
 * spheres {1, 0, 0} and {0, -1, 1/2}, r = rold = 1.5, the 100 stored samples (80 free, 20 colliding), the 180 saved
 * edges, pObsOld = the sphere positions (no reclassification or rebuild at opening), view points {1.3, -2.4, 2}.
 * freeConfigSpacea/b: null = RegionPlot3D[False, ...] (no volume); otherwise a descriptor {c, quality} of the volume.
 */
export function initialState() {
  return copy({
    'θ1': 0.25, 'θ2': 0.25, 'θ3': 0.25,
    Obstaxy: [1, 0], Obstaz: 0, Obstbxy: [0, -1], Obstbz: 0.5, showConfigObs: false,
    r: 1.5, progress: 0, qf: [3.84, 4.86, 1.62],
    pts: ptsI, goodPts: goodPtsI, badPts: badPtsI, edgesNN: edgesNNsaved, edgesNNadj: edgesNNadjSaved,
    rold: 1.5, pObsOlda: [1, 0, 0], pObsOldb: [0, -1, 0.5], highResa: false, highResb: false,
    freeConfigSpacea: null, freeConfigSpaceb: null,
    addPoints: false, restart: false, newgoal: false,
    viewPoint1: VIEWPOINT, viewPoint2: VIEWPOINT,
    path: -1,
  });
}

/**
 * The state stored in the original's notebook (live state, specs or snapshot Settings, numbers already plain doubles)
 * as a port state. A stored RegionPlot3D volume becomes the descriptor of the sphere it shows at rest quality.
 */
export function stateFromSettings(s) {
  const st = {};
  for (const k of VAR_NAMES) if (k in s) st[k] = copy(s[k]);
  const hasVolume = (g) => !!(g && g.head === 'Graphics3D' && JSON.stringify(g.args[0]).includes('Polygon'));
  const pa = [s.Obstaxy[0], s.Obstaxy[1], s.Obstaz], pb = [s.Obstbxy[0], s.Obstbxy[1], s.Obstbz];
  st.freeConfigSpacea = hasVolume(s.freeConfigSpacea) ? { c: pa, quality: 'quality' } : null;
  st.freeConfigSpaceb = hasVolume(s.freeConfigSpaceb) ? { c: pb, quality: 'quality' } : null;
  return st;
}

// ---- one evaluation of the Manipulate body -----------------------------------------------------------------------------
/**
 * One evaluation of the Manipulate body, in the source's order (F-P3-19): restart; θ wrap; qs; new goal; pObs3a/b;
 * inCollision, inCollisionf; obstacle move; add points; rebuild; query; progress; C-obstacles; the two graphics.
 * `rng` supplies RandomReal (shared/random.js); `controlActive` is Mathematica's ControlActive (true while a slider,
 * pad or vertical slider is dragged). Returns { state, view }.
 */
export function evaluate(stateIn, rng, { controlActive = false } = {}) {
  const st = cloneState(stateIn);
  const obsRad = OBS_RAD, widtha = WIDTHA, delta = DELTA;
  const pObs3a = [st.Obstaxy[0], st.Obstaxy[1], st.Obstaz];
  const pObs3b = [st.Obstbxy[0], st.Obstbxy[1], st.Obstbz];

  if (st.restart) {
    // ORIGINAL QUIRK (Q-P3-08): pObsOlda = pObs3a assigns the Module local before it has a value in this evaluation;
    // it then refers to this evaluation's sphere position. rold, qf, highResa/b and the view points are kept.
    st.restart = false;
    st.pObsOlda = pObs3a.slice(); st.pObsOldb = pObs3b.slice();
    st.badPts = []; st.goodPts = []; st.pts = []; st.edgesNN = []; st.edgesNNadj = [];
  }

  // Enable torus property on the input sliders. ORIGINAL QUIRK (Q-P3-01): written back, the thumb jumps.
  for (const k of ['θ1', 'θ2', 'θ3']) {
    if (mLess(st[k], 0)) st[k] = TWO_PI + st[k];
    if (mGreater(st[k], TWO_PI)) st[k] = st[k] - TWO_PI;
  }
  const qs = [st['θ1'], st['θ2'], st['θ3']];

  // Set a random goal (Q-P3-09: the goal has no other control)
  if (st.newgoal) { st.newgoal = false; st.qf = rng.randomReal([0, TWO_PI], 3); }
  const qf = st.qf;

  const pObs3 = [pObs3a, pObs3b];
  const inCollision = detCollision(jointAngle2Origin(qs), pObs3, obsRad, widtha);
  const inCollisionf = detCollision(jointAngle2Origin(qf), pObs3, obsRad, widtha);

  // An obstacle moved: re-classify ALL samples in pts order; rold = -1 forces the rebuild below.
  // ORIGINAL QUIRK (Q-P3-07): the rebuild needs more than 5 free samples; with fewer the OLD edges stay.
  let movedA = false, movedB = false;
  if (mUnequal(st.pObsOlda, pObs3a) || mUnequal(st.pObsOldb, pObs3b)) {
    st.badPts = []; st.goodPts = [];
    for (const p of st.pts) (detCollision(jointAngle2Origin(p), pObs3, obsRad, widtha) ? st.badPts : st.goodPts).push(p);
    st.rold = -1;
    if (mUnequal(st.pObsOlda, pObs3a)) { st.pObsOlda = pObs3a.slice(); st.highResa = false; movedA = true; }
    if (mUnequal(st.pObsOldb, pObs3b)) { st.pObsOldb = pObs3b.slice(); st.highResb = false; movedB = true; }
  }

  if (st.addPoints) {
    st.addPoints = false;
    const point2start = st.goodPts.length + 1;
    const newpts = rng.randomReal([0, TWO_PI], [BATCH, 3]); // Generate random points in 3D (row by row)
    st.pts = st.pts.concat(newpts);
    for (const p of newpts) (detCollision(jointAngle2Origin(p), pObs3, obsRad, widtha) ? st.badPts : st.goodPts).push(p);
    // Update the connected points (incremental: only the new samples look for neighbours, Q-P3-05)
    if (st.goodPts.length > point2start - 1) {
      st.edgesNNadj = st.edgesNNadj.concat(Array.from({ length: st.goodPts.length - point2start + 1 }, () => []));
      if (st.r > 0) [st.edgesNNadj, st.edgesNN] = connectPoints(st.goodPts, st.edgesNNadj, pObs3, obsRad, widtha, delta, st.edgesNN, point2start, st.r);
    }
  }

  let rebuilt = false;
  if (mUnequal(st.r, st.rold) && st.goodPts.length > 5) {
    rebuilt = true;
    st.rold = st.r;
    st.edgesNN = [];
    st.edgesNNadj = st.goodPts.map(() => []);
    // Build an adjacency list:
    if (st.r > 0) [st.edgesNNadj, st.edgesNN] = connectPoints(st.goodPts, st.edgesNNadj, pObs3, obsRad, widtha, delta, st.edgesNN, 1, st.r);
  }

  // ORIGINAL QUIRK (Q-P3-02): `path` here is the Module local (initial -1); the Manipulate variable path is never
  // written and stays -1. Query: direct path first (Q-P3-04), then the single nearest sample each (Q-P3-05).
  const { path, qsn, qfn } = planQuery({
    qs, qf, r: st.r, goodPts: st.goodPts, edgesNNadj: st.edgesNNadj, dist: toroidDist,
    pathOK: (a, b) => pathOKTrobot(a, b, pObs3, obsRad, widtha, delta),
    qsFree: () => !inCollision, qfFree: () => !inCollisionf,
  });

  // Calculate the robot progress
  const prog = progressOnPath({ qs, qf, goodPts: st.goodPts, path, progress: st.progress, dist: toroidDist, pt: toroidPt });
  const robotq = prog ? prog.point : qs;

  // The C-obstacle volumes (RegionPlot3D, replaced by cspace3d.js: D-P3-02), cached per sphere (Q-P3-12):
  // If[!highResa, highResa = ControlActive[False, True]; freeConfigSpacea = RegionPlot3D[...]] and the same for b.
  const recomputed = { a: false, b: false };
  if (st.showConfigObs) {
    const quality = controlActive ? 'speed' : 'quality';
    if (!st.highResa) { st.highResa = !controlActive; st.freeConfigSpacea = { c: pObs3a.slice(), quality }; recomputed.a = true; }
    if (!st.highResb) { st.highResb = !controlActive; st.freeConfigSpaceb = { c: pObs3b.slice(), quality }; recomputed.b = true; }
  } else {
    // Else, remove the 3D plots of obstacles that are slow to compute
    st.freeConfigSpacea = null; st.freeConfigSpaceb = null; st.highResa = false; st.highResb = false;
  }

  const locals = { qs, qf, path, qsn, qfn, robotq, inCollision, inCollisionf, pObs3a, pObs3b, prog, rebuilt, movedA, movedB, recomputed };
  return { state: st, view: makeView(st, locals) };
}

/** toroidLine pieces → Graphics3D data {colour, Line, Line} */
const lineData = (pieces) => pieces.map((p) => [col(p.color), Line(p.line)]);
const points = (pts) => (pts.length ? [Point(pts)] : []);

function makeView(st, l) {
  const { qs, qf, path, qsn, qfn, robotq, inCollision, inCollisionf, pObs3a, pObs3b, prog } = l;
  const isPathList = Array.isArray(path) && path.length > 0;
  const red = (b) => col(b ? 'Red' : 'Brown');
  // Graphics3D[{{Opacity[0.2], EdgeForm[Gray], If[inCollision, Red, Brown], drawRobot[qs], If[inCollisionf, Red, Brown],
  //   drawRobot[qf]}, If[inCollision, Red, Brown], drawRobot[robotq], {Blue, Specularity[White, 10], Sphere[pObs3a, obsRad],
  //   Yellow, Specularity[White, 10], Sphere[pObs3b, obsRad]}}, PlotLabel -> "robot workspace", PlotRange -> {3.5{-1,1},
  //   3.5{-1,1}, {-1.1, 3.4}}, Lighting -> Automatic, ViewPoint -> Dynamic[viewPoint1], ImageSize -> {300, 300}]
  // ORIGINAL QUIRK (Q-P3-03): the moving robot is coloured by the START's collision state.
  const SPEC = { directive: 'specularity', value: [COLORS.White, 10] }; // Specularity[White, 10] (ignored by g3d flatten)
  const workspace = Graphics3D([
    [Opacity(0.2), EdgeForm(COLORS.Gray), red(inCollision), drawRobot(qs), red(inCollisionf), drawRobot(qf)],
    red(inCollision), drawRobot(robotq),
    [col('Blue'), SPEC, Sphere(pObs3a, OBS_RAD), col('Yellow'), SPEC, Sphere(pObs3b, OBS_RAD)],
  ], { PlotLabel: 'robot workspace', PlotRange: WORKSPACE_RANGE, ViewPoint: st.viewPoint1, ImageSize: [300, 300] });

  // the path part: direct path, roadmap path (thick, black end points) or thin connectors (Q-P3-11)
  let pathPart;
  if (path === -2) {
    pathPart = [Thickness(0.02), ...lineData(toroidLine([qs, qf], 'Magenta'))];
  } else if (isPathList) {
    const legs = [];
    for (let i = 0; i < path.length - 1; i++) legs.push(...lineData(toroidLine([st.goodPts[path[i] - 1], st.goodPts[path[i + 1] - 1]], 'Orange', 'Purple')));
    pathPart = [Thickness(0.02), ...lineData(toroidLine([qs, qsn], 'Magenta')), ...lineData(toroidLine([qf, qfn], 'Magenta')), ...legs,
      col('Black'), Point(qs), Point(qf)];
  } else {
    pathPart = [qsn ? lineData(toroidLine([qs, qsn], 'Magenta')) : [], qfn ? lineData(toroidLine([qf, qfn], 'Magenta')) : []];
  }
  // Show[Graphics3D[{PointSize[Large], Red, Point[badPts], Green, Point[goodPts], If[inCollision, Red, Brown], Point[qs],
  //   If[inCollisionf, Red, Brown], Point[qf], <path part>, Darker[Green], PointSize[Medium], Point[goodPts], Red,
  //   Point[badPts], toroidLines[edgesNN, Lighter[Brown], Brown], {Blue, PointSize[0.06], Cuboid[robotq - .1{1,1,1},
  //   robotq + .1{1,1,1}]}}, Axes -> True, PlotLabel -> ..., PlotRange -> {{0,2π},{0,2π},{0,2π}}, ...], freeConfigSpacea,
  //   freeConfigSpaceb]
  const phase = Graphics3D([
    PointSize('Large'), col('Red'), ...points(st.badPts), col('Green'), ...points(st.goodPts),
    red(inCollision), Point(qs), red(inCollisionf), Point(qf),
    pathPart,
    col('DarkerGreen'), PointSize('Medium'), ...points(st.goodPts), col('Red'), ...points(st.badPts),
    lineData(toroidLines(st.edgesNN, 'LighterBrown', 'Brown')),
    [col('Blue'), PointSize(0.06), Cuboid(robotq.map((v) => v - 0.1), robotq.map((v) => v + 0.1))],
  ], { PlotRange: PHASE_RANGE, ViewPoint: st.viewPoint2, ImageSize: [300, 300], Axes: true });

  // PlotLabel -> StringForm["robot phase space\n``", If[Length[path] == 0 && path == -1, Style["No path possible", Red],
  //   StringForm["path length = ``\n", Round[totdist, .01]]]]   (E-P3-06: "no path in this roadmap")
  const label = path === -1 ? { text: 'No path possible', red: true } : { text: 'path length = ', value: roundTo(prog.totdist, 0.01), red: false };
  return {
    qs, qf, path, qsn, qfn, robotq, inCollision, inCollisionf, pObs3a, pObs3b,
    totdist: prog ? prog.totdist : null, segment: prog && prog.segment ? prog.segment : null,
    label, workspace, phase,
    volumes: { a: st.freeConfigSpacea, b: st.freeConfigSpaceb },
    recomputed: l.recomputed, rebuilt: l.rebuilt,
    counts: { pts: st.pts.length, good: st.goodPts.length, bad: st.badPts.length, edges: st.edgesNN.length },
  };
}

/** Thickness[t] (a fraction of the picture width), as a g3d directive */
export const Thickness = (t) => ({ directive: 'thickness', value: t });
