// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tests/unit/mma-text.test.js — shared/mma-text.js: the text of exact numbers. Titles and expected texts are those of
// the drafts' TESTPLANs: dh-parameters T-DH-09 (snapshots 1–5), arm-configurations T-AC-07 (pictures 2–6),
// camera-lasers T-CL-03 (snapshot 3 labels), two-link-kinematics D-TK-04 (stacked dial labels).
import { describe, it, expect } from 'vitest';
import { piFraction, fractionText, fractionParts, numberText, numberParts, parsePiFraction, parseFraction, MINUS } from '../../shared/mma-text.js';
import { mmaNumberString } from '../../shared/mma-extra.js';

describe('multiples of π', () => {
  it('π-fraction labels: 5π/32, -13π/16, π/2, π, -π/2, 0 (exact slider values)', () => { // T-DH-09
    const ns = [5, -26, 16, 32, -16, 0, 1, -32, 27, -12];
    expect(ns.map((n) => piFraction(n, 32))).toEqual(['5π/32', '−13π/16', 'π/2', 'π', '−π/2', '0', 'π/32', '−π', '27π/32', '−3π/8']);
  });
  it('stacked form: −3π/4 is "3π" over "4" with a minus sign in front; π has no denominator', () => {
    expect(piFraction(-3, 4, { form: 'stacked' })).toEqual({ sign: MINUS, num: '3π', den: '4', text: '−3π/4' });
    expect(piFraction(1, 1, { form: 'stacked' })).toEqual({ sign: '', num: 'π', den: null, text: 'π' });
    expect(piFraction(8, 32, { form: 'stacked' })).toEqual({ sign: '', num: 'π', den: '4', text: 'π/4' });
  });
  it('the dial labels Rest@Range[-π, π, π/4]', () => {
    expect([-3, -2, -1, 0, 1, 2, 3, 4].map((k) => piFraction(k, 4))).toEqual(['−3π/4', '−π/2', '−π/4', '0', 'π/4', 'π/2', '3π/4', 'π']);
  });
  it('ASCII minus on request', () => expect(piFraction(-13, 16, { minus: '-' })).toBe('-13π/16'));
});

describe('exact rationals and slider texts', () => {
  // T-AC-07: revolute n = 0, −26, 1, 32 (nπ/32); prismatic reset 0.5 (machine); k = 11, 10, 30, 20 (k/20)
  it('slider value text: 0, 0.5 (machine reset), -13π/16, 11/20, 1/2, 3/2 (exact slider values)', () => {
    expect([0, -26, 1, 32].map((n) => piFraction(n, 32))).toEqual(['0', '−13π/16', 'π/32', 'π']);
    expect(numberText(0.5)).toBe('0.5');
    expect([11, 10, 30, 20].map((k) => fractionText(k, 20))).toEqual(['11/20', '1/2', '3/2', '1']);
  });
  // T-CL-03: values of T-CL-02 and their negatives
  it('number display of tick labels: 0.08 for 0.08000000000000002, 1/50, -3/2', () => {
    expect(numberText(0.08000000000000002)).toBe('0.08');
    expect(numberText(0.15000000000000002)).toBe('0.15');
    expect(numberText(0.75)).toBe('0.75');
    expect(numberText(1)).toBe('1');
    expect(numberText(10)).toBe('10');
    expect(numberParts({ num: 1, den: 50 })).toEqual({ sign: '', num: '1', den: '50', text: '1/50' });
    expect(numberParts({ num: -3, den: 2 })).toEqual({ sign: MINUS, num: '3', den: '2', text: '−3/2' });
    expect(numberText(-0.8)).toBe('−0.8');
  });
  it('fractions are reduced; a machine real is marked by its point; a π value inside numberParts', () => {
    expect(fractionParts(-2, -8)).toEqual({ sign: '', num: '1', den: '4', text: '1/4' });
    expect(fractionText(0, 7)).toBe('0');
    expect(numberText(1, { real: true })).toBe('1.');
    expect(numberText({ num: 5, den: 32, pi: true })).toBe('5π/32');
    expect(numberText(6.123233995736766e-17)).toBe(mmaNumberString(6.123233995736766e-17)); // "6.12323×10^-17"
  });
});

describe('parsing typed exact values', () => {
  it('parsePiFraction accepts "5π/32", "5 Pi/32" and other spellings of exact multiples of π', () => {
    for (const t of ['5π/32', '5 Pi/32', '5*Pi/32', ' 5 π / 32 ', '(5/32)π', '10π/64']) expect(parsePiFraction(t)).toEqual({ num: 5, den: 32 });
    expect(parsePiFraction('-13π/16')).toEqual({ num: -13, den: 16 });
    expect(parsePiFraction('−π/2')).toEqual({ num: -1, den: 2 });
    expect(parsePiFraction('Pi')).toEqual({ num: 1, den: 1 });
    expect(parsePiFraction('0')).toEqual({ num: 0, den: 1 });
    expect(parsePiFraction('0.5')).toBe(null);
    expect(parsePiFraction('π/0')).toBe(null);
  });
  it('parseFraction accepts integers and p/q only', () => {
    expect(parseFraction('11/20')).toEqual({ num: 11, den: 20 });
    expect(parseFraction('−3/2')).toEqual({ num: -3, den: 2 });
    expect(parseFraction('3')).toEqual({ num: 3, den: 1 });
    expect(parseFraction('0.5')).toBe(null);
  });
});
