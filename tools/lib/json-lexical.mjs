// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tools/lib/json-lexical.mjs — a JSON reader/writer that keeps every number's SOURCE TEXT.
//
// Why: JSON.parse turns `1.0` into the JavaScript number 1, so "machine real 1.0" and "exact integer 1" — two
// different values for Wolfram Language — become indistinguishable. The Mathematica harness
// (tools/wolfram/manipulate-harness.wls, design doc HARNESS-WL, requirements HW-06/HW-47) decides integer vs real
// by the text of the number: a `.`, `e` or `E` makes it a real. Every tool that reads scenario files or harness
// results uses this module so the distinction survives.
//
//   parseLexical(text)            -> value; numbers are LexNumber objects, objects are plain objects (key order kept),
//                                    duplicate keys are an error
//   stringifyLexical(value, opts) -> text; LexNumber is written with its own text; plain JS numbers are written
//                                    with String(n) (integers) — pass reals as LexNumber (lexReal) to keep a `.`
//   canonicalLexical(value)       -> compact text with object keys sorted (for hashes)
//   toPlain(value)                -> the same value with every LexNumber replaced by a JS number (lossy for 1.0 vs 1)
//   isLexReal(v) / isLexInteger(v)
//   lexReal(x) / lexInt(n)        -> LexNumber from a JS number (lexReal always writes a `.` or exponent)
//   wireReal(x)                   -> "m*2^e" with integers m, e and m*2^e === x exactly (HW-07; -0 -> "0*2^0")

export class LexNumber {
  constructor(text) {
    if (typeof text !== 'string' || !/^-?(0|[1-9][0-9]*)(\.[0-9]+)?([eE][+-]?[0-9]+)?$/.test(text)) {
      throw new Error(`not a JSON number: ${text}`);
    }
    this.text = text;
  }
  /** true when written with a decimal point or an exponent (machine real for Wolfram Language). */
  get isReal() { return /[.eE]/.test(this.text); }
  get isInteger() { return !this.isReal; }
  /** The JavaScript double the text denotes (integers beyond 2^53 lose digits: use .bigint). */
  get value() { return Number(this.text); }
  get bigint() {
    if (this.isReal) throw new Error(`${this.text} is a real, not an integer`);
    return BigInt(this.text);
  }
  toString() { return this.text; }
  toJSON() { return this.value; }
}

export const isLexNumber = (v) => v instanceof LexNumber;
export const isLexReal = (v) => v instanceof LexNumber && v.isReal;
export const isLexInteger = (v) => v instanceof LexNumber && v.isInteger;

/** Shortest text that reads back as the same double, always with a `.` or an exponent. */
export function realText(x) {
  if (typeof x !== 'number' || !Number.isFinite(x)) throw new Error(`not a finite number: ${x}`);
  if (Object.is(x, -0)) return '-0.0';
  let s = String(x); // shortest round-trip representation (ECMAScript)
  if (/e/.test(s)) {
    const [m, e] = s.split('e');
    s = `${m.includes('.') ? m : `${m}.0`}e${e.replace('+', '')}`;
  } else if (!s.includes('.')) s += '.0';
  return s;
}
export const lexReal = (x) => new LexNumber(realText(x));
export function lexInt(n) {
  if (typeof n === 'bigint') return new LexNumber(n.toString());
  if (!Number.isSafeInteger(n)) throw new Error(`not a safe integer: ${n}`);
  return new LexNumber(String(n));
}

// ---------------------------------------------------------------- reader
export function parseLexical(text) {
  if (typeof text !== 'string') throw new TypeError('parseLexical expects a string');
  let i = 0;
  const n = text.length;
  const fail = (msg) => {
    const before = text.slice(0, i);
    const line = before.split('\n').length;
    const col = i - before.lastIndexOf('\n');
    throw new SyntaxError(`${msg} at line ${line}, column ${col}`);
  };
  const ws = () => { while (i < n && (text[i] === ' ' || text[i] === '\t' || text[i] === '\n' || text[i] === '\r')) i++; };
  const value = () => {
    ws();
    if (i >= n) fail('unexpected end of input');
    const c = text[i];
    if (c === '{') return object();
    if (c === '[') return array();
    if (c === '"') return string();
    if (c === 't') return literal('true', true);
    if (c === 'f') return literal('false', false);
    if (c === 'n') return literal('null', null);
    if (c === '-' || (c >= '0' && c <= '9')) return number();
    return fail(`unexpected character ${JSON.stringify(c)}`);
  };
  const literal = (word, v) => {
    if (text.startsWith(word, i)) { i += word.length; return v; }
    return fail(`expected ${word}`);
  };
  const number = () => {
    const m = /^-?(0|[1-9][0-9]*)(\.[0-9]+)?([eE][+-]?[0-9]+)?/.exec(text.slice(i, i + 400));
    if (!m) fail('bad number');
    i += m[0].length;
    return new LexNumber(m[0]);
  };
  const string = () => {
    i++; // opening quote
    let out = '';
    let start = i;
    while (true) {
      if (i >= n) fail('unterminated string');
      const c = text.charCodeAt(i);
      if (c === 34) { out += text.slice(start, i); i++; return out; }
      if (c < 32) fail('control character in string');
      if (c === 92) {
        out += text.slice(start, i);
        const e = text[i + 1];
        const simple = { '"': '"', '\\': '\\', '/': '/', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t' };
        if (e in simple) { out += simple[e]; i += 2; } else if (e === 'u') {
          const h = text.slice(i + 2, i + 6);
          if (!/^[0-9a-fA-F]{4}$/.test(h)) fail('bad \\u escape');
          out += String.fromCharCode(parseInt(h, 16)); i += 6;
        } else fail(`bad escape \\${e}`);
        start = i;
      } else i++;
    }
  };
  const array = () => {
    i++;
    const out = [];
    ws();
    if (text[i] === ']') { i++; return out; }
    while (true) {
      out.push(value());
      ws();
      if (text[i] === ',') { i++; continue; }
      if (text[i] === ']') { i++; return out; }
      fail('expected , or ]');
    }
  };
  const object = () => {
    i++;
    const out = {};
    ws();
    if (text[i] === '}') { i++; return out; }
    while (true) {
      ws();
      if (text[i] !== '"') fail('expected a key string');
      const k = string();
      if (Object.prototype.hasOwnProperty.call(out, k)) fail(`duplicate key ${JSON.stringify(k)}`);
      ws();
      if (text[i] !== ':') fail('expected :');
      i++;
      const v = value();
      Object.defineProperty(out, k, { value: v, enumerable: true, writable: true, configurable: true });
      ws();
      if (text[i] === ',') { i++; continue; }
      if (text[i] === '}') { i++; return out; }
      fail('expected , or }');
    }
  };
  const v = value();
  ws();
  if (i < n) fail('trailing characters after the JSON value');
  return v;
}

// ---------------------------------------------------------------- writer
const quote = (s) => JSON.stringify(s);
function scalar(v) {
  if (v instanceof LexNumber) return v.text;
  if (v === null) return 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'string') return quote(v);
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) throw new Error(`cannot write ${v} as JSON`);
    // integers only while exact and written without exponent (String(1e21) is "1e+21", a real for the lexical reader)
    return Number.isSafeInteger(v) && !Object.is(v, -0) ? String(v) : realText(v);
  }
  if (typeof v === 'bigint') return v.toString();
  return undefined;
}

/**
 * Write a value. opts.indent (number of spaces, default 0 = compact); opts.inlineDepth: nesting depth from which
 * arrays/objects are written on one line (default Infinity = only `indent` decides); opts.ascii: escape every
 * non-ASCII character as \uXXXX.
 */
export function stringifyLexical(value, opts = {}) {
  const indent = opts.indent ?? 0;
  const inlineDepth = opts.inlineDepth ?? Infinity;
  const pad = (d) => (indent ? `\n${' '.repeat(indent * d)}` : '');
  const go = (v, d) => {
    const s = scalar(v);
    if (s !== undefined) return s;
    const inline = !indent || d >= inlineDepth;
    if (Array.isArray(v)) {
      if (!v.length) return '[]';
      if (inline) return `[${v.map((x) => go(x, d + 1)).join(',')}]`;
      return `[${v.map((x) => pad(d + 1) + go(x, d + 1)).join(',')}${pad(d)}]`;
    }
    if (typeof v === 'object') {
      const keys = Object.keys(v).filter((k) => v[k] !== undefined);
      if (!keys.length) return '{}';
      const sep = indent && !inline ? ': ' : ':';
      if (inline) return `{${keys.map((k) => `${quote(k)}:${go(v[k], d + 1)}`).join(',')}}`;
      return `{${keys.map((k) => `${pad(d + 1)}${quote(k)}${sep}${go(v[k], d + 1)}`).join(',')}${pad(d)}}`;
    }
    throw new Error(`cannot write a ${typeof v} as JSON`);
  };
  const out = go(value, 0);
  return opts.ascii ? asciiEscape(out) : out;
}

/** Escape every non-ASCII UTF-16 unit as \uXXXX (valid inside JSON strings, the only place they can occur). */
export function asciiEscape(text) {
  return text.replace(/[\u007f-￿]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
}

/** Compact text with object keys sorted by code unit order: the input of scenario hashes (HW-59). */
export function canonicalLexical(value) {
  const sortKeys = (v) => {
    if (Array.isArray(v)) return v.map(sortKeys);
    if (v && typeof v === 'object' && !(v instanceof LexNumber)) {
      const o = {};
      for (const k of Object.keys(v).sort()) if (v[k] !== undefined) o[k] = sortKeys(v[k]);
      return o;
    }
    return v;
  };
  return stringifyLexical(sortKeys(value), { ascii: true });
}

/** Replace LexNumber by JS numbers (for code that does not care about 1.0 vs 1). */
export function toPlain(v) {
  if (v instanceof LexNumber) return v.value;
  if (Array.isArray(v)) return v.map(toPlain);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, toPlain(x)]));
  return v;
}

// ---------------------------------------------------------------- exact binary form (wire format, HW-07)
/** {m, e} as BigInt/Number with x === m * 2^e exactly and m odd (or m = 0). -0 gives m = 0. */
export function binaryParts(x) {
  if (typeof x !== 'number' || !Number.isFinite(x)) throw new Error(`not a finite number: ${x}`);
  if (x === 0) return { m: 0n, e: 0 };
  const dv = new DataView(new ArrayBuffer(8));
  dv.setFloat64(0, x);
  const hi = dv.getUint32(0), lo = dv.getUint32(4);
  const sign = hi >>> 31 ? -1n : 1n;
  const expBits = (hi >>> 20) & 0x7ff;
  let mant = (BigInt(hi & 0xfffff) << 32n) | BigInt(lo);
  let e;
  if (expBits === 0) e = -1074; // subnormal
  else { mant |= 1n << 52n; e = expBits - 1075; }
  while ((mant & 1n) === 0n) { mant >>= 1n; e++; }
  return { m: sign * mant, e };
}
export function wireReal(x) {
  const { m, e } = binaryParts(x);
  return `${m}*2^${e}`;
}
/**
 * Inverse of wireReal (exact: m has at most 53 bits). Note: subnormal doubles (|x| < 2^-1022) are written exactly too,
 * but Mathematica has no subnormal machine reals — N[m*2^e] gives an arbitrary-precision number there, which the
 * harness rejects as "bad real" (prelude-failed). No scenario uses one.
 */
export function fromWireReal(s) {
  const m = /^(-?[0-9]+)\*2\^(-?[0-9]+)$/.exec(s);
  if (!m) throw new Error(`bad wire real ${s}`);
  const mant = BigInt(m[1]);
  const e = Number(m[2]);
  if (mant === 0n) return 0;
  // scale in two steps so neither factor overflows/underflows on its own
  const half = Math.trunc(e / 2);
  return Number(mant) * 2 ** half * 2 ** (e - half);
}
