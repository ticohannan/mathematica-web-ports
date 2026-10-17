// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tests/unit/harness-json-lexical.test.js — the lexical JSON reader/writer (tools/lib/json-lexical.mjs, HW-06/HW-07):
// numbers keep their source text, so a machine real `1.0` and an exact integer `1` stay different values.
import { describe, it, expect } from 'vitest';
import {
  parseLexical, stringifyLexical, canonicalLexical, toPlain, LexNumber, isLexReal, isLexInteger, lexReal, lexInt,
  realText, wireReal, fromWireReal, binaryParts, asciiEscape,
} from '../../tools/lib/json-lexical.mjs';

describe('parseLexical keeps the text of numbers', () => {
  it('1.0 is a real, 1 an integer, both with value 1', () => {
    const v = parseLexical('[1.0, 1, -2, 2.5e3, 1E-17, -0.0, 0]');
    expect(v.map((x) => x.text)).toEqual(['1.0', '1', '-2', '2.5e3', '1E-17', '-0.0', '0']);
    expect(v.map((x) => x.isReal)).toEqual([true, false, false, true, true, true, false]);
    expect(isLexReal(v[0]) && isLexInteger(v[1])).toBe(true);
    expect(v[0].value).toBe(1);
    expect(Object.is(v[5].value, -0)).toBe(true);
  });
  it('round trip: text out equals text in, whitespace aside', () => {
    const t = '{"a":[1.0,1,0.15000000000000002,-1.2e-300,true,false,null,"x\\"y"],"b":{"c":[]},"d":{}}';
    expect(stringifyLexical(parseLexical(t))).toBe(t);
  });
  it('the double of a real is exactly the one JSON.parse gives', () => {
    for (const s of ['0.1', '0.15000000000000002', '-4.65', '1e-17', '123456.789', '5e-324', '1.7976931348623157e308']) {
      expect(Object.is(parseLexical(s).value, JSON.parse(s))).toBe(true);
    }
  });
  it('big integers keep every digit', () => {
    const v = parseLexical('12345678901234567890123');
    expect(v.isInteger).toBe(true);
    expect(v.bigint).toBe(12345678901234567890123n);
  });
  it('strings: escapes and \\u sequences decode as JSON.parse does', () => {
    const t = '"a\\\\b\\n\\t\\u03b8\\u0000\\/"';
    expect(parseLexical(t)).toBe(JSON.parse(t));
  });
  it('rejects malformed JSON and duplicate keys', () => {
    for (const bad of ['[1,]', '{"a":1,}', '01', '1.', '.5', '{"a":1,"a":2}', '"x', '[1 2]', 'nan', '+1', '1.0e']) {
      expect(() => parseLexical(bad), bad).toThrow();
    }
  });
  it('keeps key order', () => {
    expect(Object.keys(parseLexical('{"z":1,"a":2,"m":3}'))).toEqual(['z', 'a', 'm']);
  });
});

describe('writing', () => {
  it('lexReal always writes a decimal point or an exponent', () => {
    expect(realText(1)).toBe('1.0');
    expect(realText(-0)).toBe('-0.0');
    expect(realText(1e21)).toBe('1.0e21');
    expect(realText(1.5e-7)).toBe('1.5e-7');
    expect(realText(0.1 + 0.2)).toBe('0.30000000000000004');
    expect(lexReal(2).isReal).toBe(true);
    expect(lexInt(2).isReal).toBe(false);
    for (let i = 0; i < 2000; i++) {
      const x = (Math.random() - 0.5) * 10 ** Math.floor(Math.random() * 40 - 20);
      expect(Object.is(Number(realText(x)), x)).toBe(true);
    }
  });
  it('plain JS integers are written as integers, non-integers as reals', () => {
    expect(stringifyLexical([1, 1.5, -0])).toBe('[1,1.5,-0.0]');
    // beyond Number.isSafeInteger a JS number is not an exact integer any more: written as a real, never "1e+21"
    expect(stringifyLexical([1e21, 2 ** 53, 2 ** 53 - 1])).toBe('[1.0e21,9007199254740992.0,9007199254740991]');
  });
  it('indent and ascii options', () => {
    expect(stringifyLexical({ a: [1, 2] }, { indent: 2 })).toBe('{\n  "a": [\n    1,\n    2\n  ]\n}');
    expect(stringifyLexical(['θ'], { ascii: true })).toBe('["\\u03b8"]');
    expect(asciiEscape('"ϕ"')).toBe('"\\u03d5"');
  });
  it('canonical form sorts keys and is compact', () => {
    expect(canonicalLexical(parseLexical('{"b":1.0,"a":[2,{"d":1,"c":2}]}'))).toBe('{"a":[2,{"c":2,"d":1}],"b":1.0}');
  });
  it('toPlain gives JS numbers', () => {
    expect(toPlain(parseLexical('{"a":[1.0,2]}'))).toEqual({ a: [1, 2] });
  });
  it('LexNumber rejects non-JSON text', () => {
    expect(() => new LexNumber('1.')).toThrow();
    expect(() => new LexNumber('0x10')).toThrow();
  });
});

describe('wire reals m*2^e (HW-07)', () => {
  it('known values', () => {
    expect(wireReal(0.5)).toBe('1*2^-1');
    expect(wireReal(-0.75)).toBe('-3*2^-2');
    expect(wireReal(0.1)).toBe('3602879701896397*2^-55');
    expect(wireReal(0)).toBe('0*2^0');
    expect(wireReal(-0)).toBe('0*2^0');
    expect(wireReal(6)).toBe('3*2^1');
    expect(wireReal(5e-324)).toBe('1*2^-1074');
  });
  it('m is odd and m*2^e is the double exactly (random doubles, all magnitudes)', () => {
    const buf = new DataView(new ArrayBuffer(8));
    for (let i = 0; i < 3000; i++) {
      buf.setUint32(0, (Math.random() * 2 ** 32) >>> 0);
      buf.setUint32(4, (Math.random() * 2 ** 32) >>> 0);
      const x = buf.getFloat64(0);
      if (!Number.isFinite(x)) continue;
      const { m, e } = binaryParts(x);
      if (x !== 0) expect(m % 2n !== 0n).toBe(true);
      expect(Object.is(fromWireReal(wireReal(x)), x === 0 ? 0 : x)).toBe(true);
    }
  });
  it('m has at most 53 bits', () => {
    for (const x of [0.1, 1 / 3, Math.PI, 1e300, 2 ** -1022, 123456.789, -4.65, Number.MAX_VALUE]) {
      const { m } = binaryParts(x);
      expect((m < 0n ? -m : m) < 2n ** 53n).toBe(true);
    }
  });
});
