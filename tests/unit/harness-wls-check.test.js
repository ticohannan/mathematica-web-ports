// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tests/unit/harness-wls-check.test.js — the structural checker of Wolfram Language scripts (tools/harness/check-wls.mjs)
// passes on the harness and on mp-original.wls, and FAILS on deliberately broken copies of the harness. The harness
// cannot be run here (no Mathematica), so this check stands between a typo and the owner's first run.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { checkWls } from '../../tools/harness/check-wls.mjs';

const HARNESS = fs.readFileSync('tools/wolfram/manipulate-harness.wls', 'utf8');
const MP = fs.readFileSync('tools/wolfram/mp-original.wls', 'utf8');

/** Replace the first occurrence of `from` (must exist) in the harness text. */
const broken = (from, to) => {
  expect(HARNESS.includes(from), `fixture text not found: ${from}`).toBe(true);
  return HARNESS.replace(from, to);
};

describe('check-wls on the real scripts', () => {
  it('manipulate-harness.wls: no errors, no warnings', () => {
    const r = checkWls(HARNESS);
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
    expect(r.statements).toBeGreaterThan(300);
  });
  it('mp-original.wls (ran on the owner\'s Mathematica 15.0.1): no errors', () => {
    expect(checkWls(MP).errors).toEqual([]);
  });
  it('the other Wolfram scripts in tools/wolfram/: no errors', () => {
    for (const f of fs.readdirSync('tools/wolfram').filter((x) => x.endsWith('.wls'))) {
      expect(checkWls(fs.readFileSync(`tools/wolfram/${f}`, 'utf8')).errors, f).toEqual([]);
    }
  });
  it('CRLF line endings (a Windows checkout) change nothing', () => {
    const r = checkWls(HARNESS.replace(/\n/g, '\r\n'));
    expect(r.errors).toEqual([]);
  });
  it('the harness source is pure ASCII and uses no named characters', () => {
    expect(/[^\x09\x0a\x0d\x20-\x7e]/.test(HARNESS)).toBe(false);
    expect(/(^|[^\\])\\\[[A-Za-z]+\]/.test(HARNESS.replace(/\(\*[\s\S]*?\*\)/g, ''))).toBe(false);
  });
  it('every requirement block the harness implements is cited in its source', () => {
    for (const id of ['HW-07', 'HW-11', 'HW-12', 'HW-24', 'HW-25', 'HW-27', 'HW-30', 'HW-31', 'HW-34', 'HW-35', 'HW-36', 'HW-38', 'HW-45', 'HW-46', 'HW-52', 'HW-73']) {
      expect(HARNESS, id).toContain(id);
    }
  });
});

describe('check-wls catches deliberately broken copies', () => {
  const cases = [
    ['a missing closing bracket', () => broken('hwFlag[name_String] := MemberQ[hwOpts, "--" <> name];', 'hwFlag[name_String] := MemberQ[hwOpts, "--" <> name;'), /never closed|closes/],
    ['a wrong closing bracket', () => broken('hwFlag[name_String] := MemberQ[hwOpts, "--" <> name];', 'hwFlag[name_String] := MemberQ[hwOpts, "--" <> name};'), /closes \[/],
    ['an unterminated string', () => broken('hwPhaseName = "start";', 'hwPhaseName = "start;'), /unterminated string|never closed/],
    ['an unterminated comment', () => broken('(* ======================================================================== 1. JSON writer *)', '(* ======================================================================== 1. JSON writer'), /unterminated comment/],
    ['an unknown string escape', () => broken('"stored copies: "', '"stored \\d copies: "'), /unknown string escape \\d/],
    ['a named character in code', () => broken('hwToolVersion = "1.0.0";', 'hwToolVersion = \\[Alpha];'), /backslash outside a string/],
    ['a non-ASCII character in code', () => broken('hwToolVersion = "1.0.0";', 'hwToolVersion = \u03b8;'), /non-ASCII character outside a string/],
    ['an empty argument', () => broken('hwOpts = Drop[hwArgs, 4];', 'hwOpts = Drop[hwArgs, , 4];'), /empty argument/],
    ['a trailing comma', () => broken('hwOpts = Drop[hwArgs, 4];', 'hwOpts = Drop[hwArgs, 4,];'), /empty last argument/],
    ['a continuation line after a complete statement', () => broken('hwStartTime = AbsoluteTime[];', 'hwStartTime = AbsoluteTime[]\n  + 0;'), /starts with an operator/],
    ['Which with an odd number of arguments', () => broken('hwMode = Which[hwFlag["smoke"], "smoke", hwFlag["self-check"], "self-check", True, "run"];', 'hwMode = Which[hwFlag["smoke"], "smoke", hwFlag["self-check"], "self-check", True];'), /Which\[\.\.\.\] with 5/],
    ['If with one argument', () => broken('If[!IntegerQ[hwUseCopy], hwUseCopy = 0];', 'If[!IntegerQ[hwUseCopy]];'), /If\[\.\.\.\] with 1/],
    ['Module without a variable list', () => broken('hwOptValue[name_String, default_] := Module[{m = ', 'hwOptValue[name_String, default_] := Module[m = Select[{}, True &], {m = '), /Module whose first argument/],
    ['a stray closing bracket', () => broken('hwToolVersion = "1.0.0";', 'hwToolVersion = "1.0.0"];'), /unmatched closing \]/],
    ['an association closed by ]', () => broken('hwStructure = <||>;', 'hwStructure = <|];'), /closes <\|/],
    ['a statement without its semicolon (warning)', () => broken('hwToolVersion = "1.0.0";', 'hwToolVersion = "1.0.0"'), null],
  ];
  it.each(cases)('%s', (_, make, re) => {
    const r = checkWls(make());
    if (re) {
      expect(r.errors.length, 'expected an error').toBeGreaterThan(0);
      expect(r.errors.join('\n')).toMatch(re);
    } else {
      expect(r.warnings.join('\n')).toMatch(/does not end with ";"/);
    }
  });
});
