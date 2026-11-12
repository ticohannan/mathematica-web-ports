// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// shared/complex.js — complex numbers for the control and signal ports (v0.1.37), Mathematica's names where it has
// them. A complex number is a plain object { re, im }; a real number is accepted wherever a complex one is.
//
//   Complex(1, 2)                 Complex[1, 2]  (also I = Complex(0, 1))
//   cadd, csub, cmul, cdiv        +, −, ×, ÷ of two numbers (real or complex)
//   Re(z), Im(z), Abs(z), Arg(z)  Re, Im, Abs, Arg (Arg in (−π, π], Arg[0] = 0 as Mathematica)
//   Conjugate(z), cexp(z), csqrt(z) (principal root, as Sqrt), cpow(z, n) (integer n), cneg(z), cscale(z, k)
//   isReal(z, tol)                |Im z| ≤ tol·max(1, |z|)
//   ctext(z, fmt)                 "a + b i" / "a - b i" with fmt(x) for each part (Mathematica's InputForm-like
//                                 output, as the FC port shows its poles)

export const Complex = (re, im = 0) => ({ re, im });
export const I = Object.freeze(Complex(0, 1));

const asC = (z) => (typeof z === 'number' ? { re: z, im: 0 } : z);
export const Re = (z) => (typeof z === 'number' ? z : z.re);
export const Im = (z) => (typeof z === 'number' ? 0 : z.im);
export const cadd = (a, b) => { a = asC(a); b = asC(b); return Complex(a.re + b.re, a.im + b.im); };
export const csub = (a, b) => { a = asC(a); b = asC(b); return Complex(a.re - b.re, a.im - b.im); };
export const cmul = (a, b) => { a = asC(a); b = asC(b); return Complex(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re); };
export const cneg = (a) => { a = asC(a); return Complex(-a.re, -a.im); };
export const cscale = (a, k) => { a = asC(a); return Complex(a.re * k, a.im * k); };
/** a / b by Smith's algorithm (no overflow for large parts). */
export function cdiv(a, b) {
  a = asC(a); b = asC(b);
  if (Math.abs(b.re) >= Math.abs(b.im)) {
    const r = b.im / b.re, d = b.re + b.im * r;
    return Complex((a.re + a.im * r) / d, (a.im - a.re * r) / d);
  }
  const r = b.re / b.im, d = b.re * r + b.im;
  return Complex((a.re * r + a.im) / d, (a.im * r - a.re) / d);
}
export const Abs = (z) => (typeof z === 'number' ? Math.abs(z) : Math.hypot(z.re, z.im));
export const Arg = (z) => { z = asC(z); return z.re === 0 && z.im === 0 ? 0 : Math.atan2(z.im, z.re); };
export const Conjugate = (z) => { z = asC(z); return Complex(z.re, -z.im); };
export const cexp = (z) => { z = asC(z); const m = Math.exp(z.re); return Complex(m * Math.cos(z.im), m * Math.sin(z.im)); };
/** The principal square root (branch cut on the negative real axis, as Mathematica's Sqrt). */
export function csqrt(z) {
  z = asC(z);
  if (z.im === 0) return z.re >= 0 ? Complex(Math.sqrt(z.re), 0) : Complex(0, Math.sqrt(-z.re));
  const m = Math.hypot(z.re, z.im), re = Math.sqrt((m + z.re) / 2), im = Math.sign(z.im) * Math.sqrt((m - z.re) / 2);
  return Complex(re, im);
}
/** z^n for an integer n (repeated squaring). */
export function cpow(z, n) {
  z = asC(z);
  if (n < 0) return cdiv(1, cpow(z, -n));
  let r = Complex(1, 0), b = z;
  while (n > 0) { if (n & 1) r = cmul(r, b); b = cmul(b, b); n >>= 1; }
  return r;
}
export const isReal = (z, tol = 0) => Math.abs(Im(z)) <= tol * Math.max(1, Abs(z));
/** "a + b i" / "a - b i" (or "a" for a real number), each part written by fmt. */
export function ctext(z, fmt = String) {
  z = asC(z);
  if (z.im === 0) return fmt(z.re);
  return `${fmt(z.re)} ${z.im < 0 ? '-' : '+'} ${fmt(Math.abs(z.im))} i`;
}
