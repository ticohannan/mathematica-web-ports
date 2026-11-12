// SPDX-FileCopyrightText: 2014 Michaël Zasso and ml-matrix contributors
// SPDX-License-Identifier: MIT
// vendor/ml-matrix/index.js — ES-module entry for the unchanged UMD build of ml-matrix 6.15.1 (npm, MIT; see LICENSE
// here). The UMD file, loaded as a module, finds neither CommonJS nor AMD and puts its exports on
// globalThis.mlMatrix; this file re-exports what the shared modules use. Its EigenvalueDecomposition is the JAMA
// algorithm (Hessenberg reduction and shifted QR, hqr2), the one behind JAMA, Jama-derived libraries and the classic
// EISPACK routines.
import * as umd from './matrix.umd.js';

// browsers and Node: on globalThis; a test runner that gives modules a CommonJS `exports` object: there
const m = globalThis.mlMatrix ?? (umd.Matrix ? umd : umd.default);
export const Matrix = m.Matrix;
export const EigenvalueDecomposition = m.EigenvalueDecomposition;
export const LuDecomposition = m.LuDecomposition;
export const solve = m.solve;
export const inverse = m.inverse;
