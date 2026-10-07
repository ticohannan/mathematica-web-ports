#!/usr/bin/env python3
# SPDX-FileCopyrightText: 2026 Tico Hannan
# SPDX-License-Identifier: MIT
"""Extract the saved Manipulate state(s) of a Wolfram notebook into JSON (golden fixtures).

Works for both "author" notebooks and the newer Demonstrations *definition* notebooks (Mathematica 14+),
whose snapshots are stored as pictures and which therefore hold one live state (the main Manipulate
output). Every DynamicModuleBox[{var$$ = value, ...}, ...] found in the file is decoded; identical
states are reported once.

Usage:  python tools/extract_state.py NOTEBOOK.nb OUT.json [var1 var2 ...]
        (no variable names = all variables of the state)

Values are converted to JSON: numbers, strings, True/False, nested lists; Rational[a, b] and simple
products/sums of numbers (e.g. Rational[-1, 2] Pi) are evaluated to floats; CompressedData is decoded
with tools/mdecode.py; any other expression becomes {"head": name, "args": [...]}.
The data extracted is the ORIGINAL program's state, so it remains under the original's licence.
"""
import re, sys, json, math, base64, zlib, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mdecode import dec  # noqa: E402

TOK = re.compile(r'''
  (?P<ws>\s+)
 |(?P<num>\d+\.?\d*(?:`[\d.]*`?\d*\.?\d*)?(?:\*\^-?\d+)?|\.\d+(?:`[\d.]*)?(?:\*\^-?\d+)?)
 |(?P<str>"(?:\\.|[^"\\])*")
 |(?P<sym>(?:\$?[A-Za-z][A-Za-z0-9]*`)*\$?[A-Za-z][A-Za-z0-9$]*)
 |(?P<op>->|:>|===|==|!=|<=|>=|&&|\|\||[\[\]{}(),=+\-*/^;<>!&@.])
''', re.X)

def tokenize(s):
    out, i = [], 0
    while i < len(s):
        m = TOK.match(s, i)
        if not m:
            out.append(('op', s[i])); i += 1; continue
        i = m.end()
        k = m.lastgroup
        if k != 'ws': out.append((k, m.group(k)))
    return out

def num(text):
    t = text.split('`')[0]
    mant, _, exp = text.partition('*^')
    mant = mant.split('`')[0]
    if exp: return float(mant) * 10 ** int(exp)
    return float(mant) if ('.' in mant or '`' in text) else int(mant)

def short(sym):
    s = sym.split('`')[-1]
    return s[:-2] if s.endswith('$$') else s

CONST = {'Pi': math.pi, 'E': math.e, 'Degree': math.pi / 180, 'Infinity': math.inf}

def is_num(v): return isinstance(v, (int, float)) and not isinstance(v, bool)

class Parser:
    def __init__(self, toks): self.t, self.i = toks, 0
    def peek(self, k=0): return self.t[self.i + k] if self.i + k < len(self.t) else ('eof', '')
    def take(self): tok = self.peek(); self.i += 1; return tok
    def expect(self, v):
        tok = self.take()
        if tok[1] != v: raise ValueError(f'expected {v!r}, got {tok!r} near token {self.i}')
    def expr(self):
        e = self.sum_()
        while self.peek()[1] in ('->', ':>', '==', '!=', '<', '>', '<=', '>=', '&&', '||', '==='):
            op = self.take()[1]; r = self.sum_()
            e = {'head': {'->': 'Rule', ':>': 'RuleDelayed'}.get(op, op), 'args': [e, r]}
        return e
    def sum_(self):
        e = self.prod()
        while self.peek()[1] in ('+', '-'):
            op = self.take()[1]; r = self.prod()
            if is_num(e) and is_num(r): e = e + r if op == '+' else e - r
            else: e = {'head': 'Plus', 'args': [e, r if op == '+' else {'head': 'Times', 'args': [-1, r]}]}
        return e
    def starts_primary(self):
        k, v = self.peek()
        return k in ('num', 'str', 'sym') or v in ('(', '{')
    def prod(self):
        e = self.power()
        while True:
            if self.peek()[1] in ('*', '/'):
                op = self.take()[1]; r = self.power()
            elif self.starts_primary():
                op = '*'; r = self.power()
            else: return e
            if is_num(e) and is_num(r): e = e * r if op == '*' else e / r
            else: e = {'head': 'Times', 'args': [e, r if op == '*' else {'head': 'Power', 'args': [r, -1]}]}
    def power(self):
        e = self.unary()
        if self.peek()[1] == '^':
            self.take(); r = self.power()
            e = e ** r if is_num(e) and is_num(r) else {'head': 'Power', 'args': [e, r]}
        return e
    def unary(self):
        if self.peek()[1] == '-':
            self.take(); v = self.unary()
            return -v if is_num(v) else {'head': 'Times', 'args': [-1, v]}
        if self.peek()[1] == '!':
            self.take(); return {'head': 'Not', 'args': [self.unary()]}
        return self.postfix()
    def postfix(self):
        e = self.primary()
        while self.peek()[1] == '[':
            self.take(); args = self.args(']')
            e = call(e, args)
        return e
    def args(self, close):
        out = []
        if self.peek()[1] == close: self.take(); return out
        while True:
            start = self.i
            try:
                out.append(self.compound())
                if self.peek()[1] not in (',', close): raise ValueError('unexpected ' + repr(self.peek()))
            except (ValueError, IndexError, TypeError, OverflowError, ZeroDivisionError):
                # an expression this small parser does not understand (functions, patterns, ...):
                # skip it, keep the assignment target if there is one
                self.i = start
                target = self.peek()
                self.skip_element(close)
                out.append({'head': 'Set', 'args': [{'sym': short(target[1])}, {'unparsed': True}]}
                           if target[0] == 'sym' and self.t[start + 1][1] == '=' else {'unparsed': True})
            tok = self.take()
            if tok[1] == ',': continue
            if tok[1] == close: return out
            raise ValueError(f'unexpected {tok!r} in argument list')
    def skip_element(self, close):
        depth = 0
        while True:
            v = self.peek()[1]
            if v == 'eof': return
            if v in ('[', '{', '('): depth += 1
            elif v in (']', '}', ')'):
                if depth == 0: return
                depth -= 1
            elif v == ',' and depth == 0: return
            self.i += 1
    def compound(self):
        e = self.assign()
        while self.peek()[1] == ';':
            self.take()
            if self.peek()[1] in (',', ']', '}', ')', 'eof'): e = {'head': 'CompoundExpression', 'args': [e, None]}
            else: e = {'head': 'CompoundExpression', 'args': [e, self.assign()]}
        return e
    def assign(self):
        e = self.expr()
        if self.peek()[1] == '=':
            self.take(); return {'head': 'Set', 'args': [e, self.assign()]}
        return e
    def primary(self):
        k, v = self.take()
        if k == 'num': return num(v)
        if k == 'str': return wl_string(v)
        if k == 'sym':
            if v == 'True': return True
            if v == 'False': return False
            if v == 'Null': return None
            if v in CONST: return CONST[v]
            return {'sym': short(v)}
        if v == '{': return self.args('}')
        if v == '(':
            e = self.expr(); self.expect(')'); return e
        raise ValueError(f'unexpected token {v!r}')

NAMED = {'Hyphen': '\u2010', 'Theta': '\u03b8', 'Phi': '\u03c6', 'Alpha': '\u03b1', 'Pi': '\u03c0', 'Infinity': '\u221e'}
def wl_string(v):
    s = v[1:-1]
    s = re.sub(r'\\[<>]', '', s)                      # \< \> string-box delimiters
    s = re.sub(r'\\\[(\w+)\]', lambda m: NAMED.get(m.group(1), '\\[' + m.group(1) + ']'), s)
    s = re.sub(r'\\:([0-9a-fA-F]{4})', lambda m: chr(int(m.group(1), 16)), s)
    return s.replace('\\"', '"').replace('\\n', '\n').replace('\\t', '\t').replace('\\\\', '\\')

def call(head, args):
    name = head.get('sym') if isinstance(head, dict) else None
    if name == 'Rational' and len(args) == 2 and all(is_num(a) for a in args): return args[0] / args[1]
    if name == 'CompressedData' and len(args) == 1 and isinstance(args[0], str):
        s = re.sub(r'[\s\\]', '', args[0])
        return to_py(dec(zlib.decompress(base64.b64decode(s[2:])), 4)[0])
    if name in ('Sqrt',) and len(args) == 1 and is_num(args[0]): return math.sqrt(args[0])
    return {'head': name or head, 'args': args}

def to_py(e):  # mdecode output -> JSON-able
    if isinstance(e, tuple):
        if e[0] in ('Sym', 'Str'): return e[1]
        if e[0] == 'Big': return float(e[1].split('`')[0])
        if e[0] == 'Packed':
            dims, d = e[1], e[2]
            def shape(flat, dims):
                if len(dims) == 1: return list(flat)
                step = len(flat) // dims[0]
                return [shape(flat[k * step:(k + 1) * step], dims[1:]) for k in range(dims[0])]
            return shape(d, dims)
        h, a = e
        if h == ('Sym', 'List'): return [to_py(x) for x in a]
        if h == ('Sym', 'Rational') and len(a) == 2: return to_py(a[0]) / to_py(a[1])
        return {'head': to_py(h), 'args': [to_py(x) for x in a]}
    return e

def states(path):
    text = open(path, encoding='utf-8', errors='replace').read()
    text = re.sub(r'\\\r?\n', '', text)
    out = []
    for m in re.finditer(r'DynamicModuleBox\[\{', text):
        j, depth, instr = m.end(), 1, False
        while depth:
            c = text[j]
            if instr:
                if c == '\\': j += 1
                elif c == '"': instr = False
            elif c == '"': instr = True
            elif c in '{[(': depth += 1
            elif c in '}])': depth -= 1
            j += 1
        body = text[m.end():j - 1]
        if '$$' not in body: continue
        try:
            p = Parser(tokenize(body + '}'))
            vals = p.args('}')
        except Exception as ex:  # keep going: a state we cannot parse is reported, not fatal
            out.append({'__error__': str(ex)}); continue
        st = {}
        for v in vals:
            if isinstance(v, dict) and v.get('head') == 'Set' and isinstance(v['args'][0], dict) and 'sym' in v['args'][0]:
                st[v['args'][0]['sym']] = v['args'][1]
            elif isinstance(v, dict) and 'sym' in v:
                st[v['sym']] = None
        if st and st not in out: out.append(st)
    return out

if __name__ == '__main__':
    nb, out_file, *names = sys.argv[1:]
    sts = states(nb)
    if names: sts = [{k: s.get(k) for k in names} for s in sts]
    json.dump({'source': os.path.basename(nb),
               'note': 'Saved Manipulate state(s) of the ORIGINAL notebook, computed by the original Mathematica code. '
                       'Golden parity fixture (CC BY-NC-SA 3.0, as the original).',
               'states': sts}, open(out_file, 'w', encoding='utf-8'), indent=1)
    print(out_file, len(sts), 'state(s);', ', '.join(sorted(sts[0].keys())) if sts else '')
