#!/usr/bin/env node
// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tools/harness/check-wls.mjs — static structure check of a Wolfram Language script (.wls) WITHOUT Mathematica.
//
//   node tools/harness/check-wls.mjs <file.wls> [...]        exit 1 if any error is found
//
// The harness scripts are written by someone who cannot run them (HARNESS-WL §13); an earlier delivery failed on the
// owner's machine with a syntax error. This checker catches the mistakes that make a script unreadable or silently
// different, before the owner runs it:
//   * brackets [ ] { } ( ) balanced and correctly nested, strings and (nested) comments terminated
//   * no string literal spans lines (the scripts' convention; it catches a missing closing quote at its line)
//   * string escapes limited to \\ \" \n \t \r \b \f \: \. \| \[Name] and line continuation
//   * no backslash, named character or non-ASCII character outside strings and comments (encoding-proof source)
//   * empty arguments (",]", "[,", ",,", "{,", ",}") — Wolfram reads them as Null, almost always a typo
//   * a complete top-level line followed by a line that starts with an infix operator: wolframscript ends the
//     statement at the newline, so "x = a\n  + b" is two statements
//   * argument counts of common heads (Which even, Switch odd, If 2-4, Module/With/Block 2, ...)
//   * Module/With/Block whose first argument is not a {list}
//   * warnings: a top-level statement that does not end with ";" (the script's own convention)
// It is a structural check, not a parser of the full language; it cannot find wrong semantics.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ARG_COUNTS = {
  Which: { min: 2, even: true }, Switch: { min: 3, odd: true }, If: { min: 2, max: 4 },
  Module: { min: 2, max: 2 }, With: { min: 2, max: 2 }, Block: { min: 2, max: 2 },
  Function: { min: 1, max: 3 }, Table: { min: 1 }, Do: { min: 2 }, While: { min: 1, max: 2 },
  StringReplace: { min: 2, max: 3 }, Cases: { min: 2, max: 4 }, Position: { min: 2, max: 4 }, Replace: { min: 2, max: 3 },
  ReplacePart: { min: 2, max: 2 }, Map: { min: 2, max: 3 }, MapThread: { min: 2, max: 3 }, MapIndexed: { min: 2, max: 3 },
  Lookup: { min: 2, max: 3 }, Extract: { min: 2, max: 3 }, Catch: { min: 1, max: 3 }, Throw: { min: 1, max: 2 },
  TimeConstrained: { min: 2, max: 3 }, Check: { min: 2, max: 3 }, Quiet: { min: 1, max: 2 }, First: { min: 1, max: 2 },
  Last: { min: 1, max: 2 }, SelectFirst: { min: 2, max: 3 }, Select: { min: 2, max: 3 }, AnyTrue: { min: 2, max: 3 },
  AllTrue: { min: 2, max: 3 }, KeyValueMap: { min: 2, max: 2 }, StringSplit: { min: 1, max: 3 }, StringRiffle: { min: 1, max: 3 },
  SortBy: { min: 2, max: 3 }, Apply: { min: 2, max: 3 }, Scan: { min: 2, max: 3 }, CheckAbort: { min: 2, max: 2 },
  StringTake: { min: 2, max: 2 }, StringDrop: { min: 2, max: 2 }, StringStartsQ: { min: 2, max: 3 }, StringEndsQ: { min: 2, max: 3 },
  StringMatchQ: { min: 2, max: 3 }, StringContainsQ: { min: 2, max: 3 }, KeyExistsQ: { min: 2, max: 2 }, MemberQ: { min: 2, max: 3 },
  SetAttributes: { min: 2, max: 2 }, Append: { min: 2, max: 2 }, AppendTo: { min: 2, max: 2 }, Drop: { min: 2, max: 3 },
  Take: { min: 2, max: 3 }, IntegerString: { min: 1, max: 3 }, ToString: { min: 1, max: 3 }, ToExpression: { min: 1, max: 3 },
  Export: { min: 2, max: 4 }, Import: { min: 1, max: 3 }, OpenWrite: { min: 0, max: 2 }, OpenAppend: { min: 1, max: 2 },
  WriteString: { min: 2 }, BlockRandom: { min: 1, max: 2 }, AbsoluteTiming: { min: 1, max: 1 }, ReleaseHold: { min: 1, max: 1 },
  KeyDrop: { min: 1, max: 2 }, KeyTake: { min: 1, max: 2 }, DeleteCases: { min: 2, max: 4 }, Complement: { min: 1 },
  StringPosition: { min: 2, max: 3 }, StringCount: { min: 2, max: 3 }, StringCases: { min: 2, max: 3 }, Clip: { min: 1, max: 3 },
};
const INFIX_START = /^(===|=!=|==|!=|<=|>=|->|:>|\/\/\.|\/\/|\/\.|\/@|\/;|@@@|@@|<>|&&|\|\||~~|:=|\^=|\*\*|[+\-*/^=<>|.?&@~])/;
const CONT_END = /(,|\[|\{|\(|=|:=|->|:>|\+|-|\*|\/|\^|&&|\|\||<>|\/\.|\/@|@@|@|~~|\||:|;;)$/;
const STRING_ESCAPES = new Set(['\\', '"', 'n', 't', 'r', 'b', 'f', ':', '.', '|', '[', '\n']);

/** Check one script text. Returns { errors: [msg], warnings: [msg], statements }. */
export function checkWls(text) {
  const errors = [];
  const warnings = [];
  const src = text.replace(/\r\n/g, '\n');
  const lines = src.split('\n');
  const startOfLine = [0];
  for (let i = 0; i < src.length; i++) if (src[i] === '\n') startOfLine.push(i + 1);
  const lc = (i) => {
    let lo = 0, hi = startOfLine.length - 1;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (startOfLine[m] <= i) lo = m; else hi = m - 1; }
    return `line ${lo + 1}:${i - startOfLine[lo] + 1}`;
  };
  // ---- pass 1: mask strings and comments, check escapes and brackets
  const masked = src.split('');
  const stack = []; // {ch, i, head, args, argStart, empty}
  const PAIR = { '[': ']', '{': '}', '(': ')' };
  let i = src.startsWith('#!') ? src.indexOf('\n') : 0;
  if (i < 0) i = src.length;
  for (let k = 0; k < i; k++) masked[k] = ' ';
  const calls = []; // {head, i, args}
  while (i < src.length) {
    const c = src[i];
    if (c === '"') {
      const s = i;
      masked[i] = '"';
      i++;
      while (i < src.length && src[i] !== '"') {
        if (src[i] === '\\') {
          const e = src[i + 1];
          if (!STRING_ESCAPES.has(e)) errors.push(`${lc(i)}: unknown string escape \\${e ?? 'EOF'}`);
          if (e === '[') {
            const m = /^\\\[([A-Za-z0-9]+)\]/.exec(src.slice(i, i + 40));
            if (!m) errors.push(`${lc(i)}: malformed named character in a string`);
            else warnings.push(`${lc(i)}: named character \\[${m[1]}] in a string (the script avoids named characters)`);
          }
          if (e === ':' && !/^\\:[0-9a-fA-F]{4}/.test(src.slice(i, i + 6))) errors.push(`${lc(i)}: \\: needs 4 hex digits`);
          if (e === '.' && !/^\\\.[0-9a-fA-F]{2}/.test(src.slice(i, i + 4))) errors.push(`${lc(i)}: \\. needs 2 hex digits`);
          masked[i] = ' '; masked[i + 1] = src[i + 1] === '\n' ? '\n' : ' ';
          i += 2;
          continue;
        }
        if (src.charCodeAt(i) > 126 || (src.charCodeAt(i) < 32 && src[i] !== '\n' && src[i] !== '\t')) {
          warnings.push(`${lc(i)}: non-ASCII or control character in a string`);
        }
        masked[i] = src[i] === '\n' ? '\n' : ' ';
        i++;
      }
      if (i >= src.length) { errors.push(`${lc(s)}: unterminated string`); break; }
      const nl = src.slice(s, i).split('\n').length - 1;
      if (nl > 0) errors.push(`${lc(s)}: string spans ${nl + 1} lines — an unterminated string? (convention: no string literal spans lines)`);
      masked[i] = '"';
      i++;
      if (stack.length) { stack[stack.length - 1].empty = false; stack[stack.length - 1].argEmpty = false; }
      continue;
    }
    if (c === '(' && src[i + 1] === '*') {
      const s = i;
      let d = 0;
      while (i < src.length) {
        if (src[i] === '(' && src[i + 1] === '*') { d++; masked[i] = masked[i + 1] = ' '; i += 2; continue; }
        if (src[i] === '*' && src[i + 1] === ')') { d--; masked[i] = masked[i + 1] = ' '; i += 2; if (!d) break; continue; }
        if (src[i] !== '\n') masked[i] = ' ';
        i++;
      }
      if (d) { errors.push(`${lc(s)}: unterminated comment`); break; }
      continue;
    }
    if (c === '\\') {
      if (src[i + 1] === '\n') { masked[i] = ' '; i++; continue; }
      errors.push(`${lc(i)}: backslash outside a string (${src[i + 1] === '[' ? 'named character' : 'escape'}) — not allowed in this script`);
      i++;
      continue;
    }
    if (src.charCodeAt(i) > 126) { errors.push(`${lc(i)}: non-ASCII character outside a string`); i++; continue; }
    if (c === '<' && src[i + 1] === '|') {
      if (stack.length) { stack[stack.length - 1].empty = false; stack[stack.length - 1].argEmpty = false; }
      stack.push({ ch: '<|', i, head: null, args: 1, empty: true, argEmpty: true });
      i += 2;
      continue;
    }
    if (c === '|' && src[i + 1] === '>') {
      const top = stack.pop();
      if (!top) errors.push(`${lc(i)}: unmatched |>`);
      else if (top.ch !== '<|') errors.push(`${lc(i)}: |> closes ${top.ch} opened at ${lc(top.i)}`);
      else if (top.args > 1 && top.argEmpty) errors.push(`${lc(i)}: empty last entry before |>`);
      if (stack.length) stack[stack.length - 1].argEmpty = false;
      i += 2;
      continue;
    }
    if (c in PAIR) {
      const before = src.slice(Math.max(0, i - 40), i);
      const hm = c === '[' && src[i - 1] !== '[' && src[i + 1] !== '[' ? /([A-Za-z$][A-Za-z0-9$]*)$/.exec(before) : null;
      if (stack.length) stack[stack.length - 1].empty = false;
      stack.push({ ch: c, i, head: hm ? hm[1] : null, args: 1, empty: true, argEmpty: true, firstArgStart: i + 1 });
      i++;
      continue;
    }
    if (c === ']' || c === '}' || c === ')') {
      const top = stack.pop();
      if (!top) { errors.push(`${lc(i)}: unmatched closing ${c}`); i++; continue; }
      if (PAIR[top.ch] !== c) errors.push(`${lc(i)}: ${c} closes ${top.ch} opened at ${lc(top.i)}`);
      if (top.args > 1 && top.argEmpty) errors.push(`${lc(i)}: empty last argument before ${c}`);
      if (top.head) calls.push({ head: top.head, i: top.i, args: top.empty ? 0 : top.args, end: i });
      if (stack.length) stack[stack.length - 1].argEmpty = false;
      i++;
      continue;
    }
    if (c === ',') {
      const top = stack[stack.length - 1];
      if (!top) errors.push(`${lc(i)}: comma at top level`);
      else {
        if (top.argEmpty) errors.push(`${lc(i)}: empty argument before ,`);
        top.args++; top.argEmpty = true;
      }
      i++;
      continue;
    }
    if (!/\s/.test(c) && stack.length) { stack[stack.length - 1].argEmpty = false; stack[stack.length - 1].empty = false; }
    i++;
  }
  for (const t of stack) errors.push(`${lc(t.i)}: ${t.ch} is never closed`);
  // ---- argument counts and scoping constructs
  const code = masked.join('');
  for (const call of calls) {
    const rule = ARG_COUNTS[call.head];
    if (rule) {
      const n = call.args;
      const bad = (rule.min !== undefined && n < rule.min) || (rule.max !== undefined && n > rule.max) ||
        (rule.even && n % 2) || (rule.odd && n % 2 === 0);
      if (bad) errors.push(`${lc(call.i)}: ${call.head}[...] with ${n} argument(s)`);
    }
    if (['Module', 'With', 'Block'].includes(call.head)) {
      const after = code.slice(call.i + 1, call.i + 200).replace(/^\s+/, '');
      if (!after.startsWith('{')) errors.push(`${lc(call.i)}: ${call.head} whose first argument is not a {list}`);
    }
  }
  // ---- pass 2: top-level statements (depth 0 at line ends)
  let depth = 0;
  const lineDepthEnd = [];
  const codeLines = code.split('\n');
  for (const l of codeLines) {
    for (let j = 0; j < l.length; j++) {
      const ch = l[j];
      if (ch === '<' && l[j + 1] === '|') { depth++; j++; } else if (ch === '|' && l[j + 1] === '>') { depth--; j++; }
      else if (ch === '[' || ch === '{' || ch === '(') depth++;
      else if (ch === ']' || ch === '}' || ch === ')') depth--;
    }
    lineDepthEnd.push(depth);
  }
  let statements = 0;
  for (let n = 0; n < codeLines.length; n++) {
    const t = codeLines[n].trim();
    if (!t) continue;
    const startDepth = n ? lineDepthEnd[n - 1] : 0;
    if (lineDepthEnd[n] !== 0) continue;
    // line ends at depth 0: is the statement complete here?
    const nextIdx = codeLines.findIndex((x, j) => j > n && x.trim());
    const next = nextIdx >= 0 ? codeLines[nextIdx].trim() : '';
    const endsOpen = CONT_END.test(t) && !t.endsWith(';;');
    if (!endsOpen && t !== '') {
      if (next && INFIX_START.test(next) && !next.startsWith('(*')) {
        errors.push(`line ${nextIdx + 1}: starts with an operator but line ${n + 1} already completes a top-level statement (wolframscript ends the statement at the newline)`);
      }
      if (!t.endsWith(';') && !(startDepth === 0 && t.startsWith('#!'))) {
        warnings.push(`line ${n + 1}: top-level statement does not end with ";"`);
      }
      statements++;
    }
  }
  return { errors, warnings, statements, lines: lines.length };
}

function main(argv) {
  if (!argv.length) { console.log('usage: node tools/harness/check-wls.mjs <file.wls> [...]'); return 2; }
  let bad = 0;
  for (const f of argv) {
    const r = checkWls(fs.readFileSync(f, 'utf8'));
    console.log(`${path.basename(f)}: ${r.lines} lines, ${r.statements} top-level statements, ${r.errors.length} error(s), ${r.warnings.length} warning(s)`);
    for (const e of r.errors) console.log(`  ERROR ${e}`);
    for (const w of r.warnings) console.log(`  warn  ${w}`);
    if (r.errors.length) bad++;
  }
  return bad ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exit(main(process.argv.slice(2)));
