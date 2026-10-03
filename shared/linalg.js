// shared/linalg.js — tiny 3x3 linear-algebra helpers (row-major arrays). Pure, Node-testable.

export const matMul = (A, B) =>
  A.map((row, i) => B[0].map((_, j) => row.reduce((s, _v, k) => s + A[i][k] * B[k][j], 0)));
export const matVec = (A, v) => A.map((row) => row[0] * v[0] + row[1] * v[1] + row[2] * v[2]);
export const transpose = (A) => A[0].map((_, j) => A.map((row) => row[j]));

/** Mathematica RotationMatrix[theta, w]: right-handed rotation by theta about axis w (normalised). */
export function rotationMatrix(theta, w) {
  const n = Math.hypot(w[0], w[1], w[2]);
  const [x, y, z] = w.map((v) => v / n);
  const c = Math.cos(theta), s = Math.sin(theta), v = 1 - c;
  return [
    [c + x * x * v, x * y * v - z * s, x * z * v + y * s],
    [x * y * v + z * s, c + y * y * v, y * z * v - x * s],
    [x * z * v - y * s, y * z * v + x * s, c + z * z * v],
  ];
}

