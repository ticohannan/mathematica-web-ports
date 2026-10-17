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
        python tools/extract_state.py --snapshots NOTEBOOK.nb OUT.json
        (exact mode, since v0.1.14: the live state, the initial settings and the Settings of every snapshot cell,
         TaggingRules -> {"Settings" :> {...}}; format described in FORMAT_NOTE below and in docs/TESTING.md)
        python tools/extract_state.py --self-test

Values are converted to JSON: numbers, strings, True/False, nested lists; Rational[a, b] and simple
products/sums of numbers (e.g. Rational[-1, 2] Pi) are evaluated to floats; CompressedData is decoded
with tools/mdecode.py; any other expression becomes {"head": name, "args": [...]}. These legacy values are
kept unchanged; the exact mode (--snapshots) keeps exact numbers exact, Greek variable names and reads *^ exponents
with correct rounding.
The data extracted is the ORIGINAL program's state, so it remains under the original's licence.
"""
import re, sys, json, math, base64, zlib, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mdecode import dec  # noqa: E402
# Windows consoles and pipes default to a legacy code page; print Greek variable names (θ1) as UTF-8 instead of failing
for _s in (sys.stdout, sys.stderr):
    try: _s.reconfigure(encoding='utf-8', errors='backslashreplace')
    except (AttributeError, ValueError): pass

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
        return to_py(dec(zlib.decompress(base64.b64decode(s[2:])), 4, byte_arrays=False)[0])  # as before v0.1.14
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

# ---------------------------------------------------------------------------------------------------------------
# Exact mode (--snapshots, added in v0.1.14): the live state, the initial settings and the Settings of every snapshot
# cell, with exact numbers kept exact, machine reals bit-exact and Greek variable names kept. The legacy functions
# above are unchanged, so the default output stays as it was.
# ---------------------------------------------------------------------------------------------------------------
from fractions import Fraction  # noqa: E402

# Named characters met in the notebooks (\[Name] in symbols and strings) -> Unicode; others stay as written.
NAMED_X = {
    'Alpha': 'α', 'Beta': 'β', 'Gamma': 'γ', 'Delta': 'δ', 'Epsilon': 'ϵ', 'CurlyEpsilon': 'ε', 'Zeta': 'ζ',
    'Eta': 'η', 'Theta': 'θ', 'CurlyTheta': 'ϑ', 'Iota': 'ι', 'Kappa': 'κ', 'Lambda': 'λ', 'Mu': 'μ', 'Nu': 'ν',
    'Xi': 'ξ', 'Omicron': 'ο', 'Pi': 'π', 'Rho': 'ρ', 'Sigma': 'σ', 'Tau': 'τ', 'Upsilon': 'υ', 'Phi': 'ϕ',
    'CurlyPhi': 'φ', 'Chi': 'χ', 'Psi': 'ψ', 'Omega': 'ω',
    'CapitalGamma': 'Γ', 'CapitalDelta': 'Δ', 'CapitalTheta': 'Θ', 'CapitalLambda': 'Λ', 'CapitalXi': 'Ξ',
    'CapitalPi': 'Π', 'CapitalSigma': 'Σ', 'CapitalPhi': 'Φ', 'CapitalPsi': 'Ψ', 'CapitalOmega': 'Ω',
    'Hyphen': '‐', 'Infinity': '∞', 'Degree': '°', 'LessEqual': '≤', 'GreaterEqual': '≥', 'NotEqual': '≠',
}
_NAME = r'(?:[A-Za-z$]|\\\[[A-Za-z]+\])(?:[A-Za-z0-9$]|\\\[[A-Za-z]+\])*'
TOK_X = re.compile(
    r'(?P<ws>\s+)'
    r'|(?P<num>(?:\d+\.?\d*|\.\d+)(?:``?-?[\d.]*)?(?:\*\^-?\d+)?)'
    r'|(?P<str>"(?:\\.|[^"\\])*")'
    r'|(?P<sym>' + _NAME + r'(?:`' + _NAME + r')*)'
    r'|(?P<op>->|:>|===|==|!=|<=|>=|&&|\|\||[\[\]{}(),=+\-*/^;<>!&@.#])')
PI_F = Fraction('3.14159265358979323846264338327950288419716939937510582097494459230781640628620899862803482534211706798')
SAFE_INT = 2 ** 53 - 1  # largest integer written as a plain JSON integer (Number.isSafeInteger, as the harness)


def named_x(s):
    s = re.sub(r'\\\[(\w+)\]', lambda m: NAMED_X.get(m.group(1), '\\[' + m.group(1) + ']'), s)
    return re.sub(r'\\:([0-9a-fA-F]{4})', lambda m: chr(int(m.group(1), 16)), s)


def tokenize_x(s):
    out, i = [], 0
    while i < len(s):
        m = TOK_X.match(s, i)
        if not m:
            out.append(('op', s[i])); i += 1; continue
        i = m.end()
        k = m.lastgroup
        if k != 'ws': out.append((k, m.group(k)))
    return out


class X:
    """A Wolfram number that is neither an integer nor a machine real: q * Pi^k with q a Fraction (k = 0 for a
    Rational), or opaque (its Wolfram text and an approximate double: arbitrary-precision reals, Sin[...], Infinity)."""
    def __init__(self, q=None, k=0, wl=None, value=None):
        self.q, self.k, self._wl, self._value = q, k, wl, value

    @property
    def algebraic(self): return self.q is not None

    def wl(self):
        if not self.algebraic: return self._wl
        q, k = self.q, self.k
        if k == 0: return f'{q.numerator}/{q.denominator}' if q.denominator != 1 else str(q.numerator)
        pi = 'Pi' if k == 1 else f'Pi^{k}'
        top = {1: pi, -1: '-' + pi}.get(q.numerator, f'{q.numerator}*{pi}')
        return top if q.denominator == 1 else f'{top}/{q.denominator}'

    def value(self):
        if not self.algebraic: return self._value
        return float(self.q * PI_F ** self.k)  # float(Fraction) is correctly rounded

    def approx(self):
        v = self.value()
        return math.nan if v is None else v


def _exact(v):  # int / Fraction / algebraic X -> (q, k); anything else -> None
    if isinstance(v, bool): return None
    if isinstance(v, int): return Fraction(v), 0
    if isinstance(v, Fraction): return v, 0
    if isinstance(v, X) and v.algebraic: return v.q, v.k
    return None


def _make(q, k):
    if q == 0: return 0
    if k == 0: return q.numerator if q.denominator == 1 else q
    return X(q, k)


def _wl_of(v):
    if isinstance(v, bool) or v is None: return None
    if isinstance(v, int): return str(v)
    if isinstance(v, Fraction): return f'{v.numerator}/{v.denominator}'
    if isinstance(v, X): return v.wl()
    return None


def _approx(v):
    if isinstance(v, (int, Fraction)) and not isinstance(v, bool): return float(v)
    if isinstance(v, X): return v.approx()
    if isinstance(v, float): return v
    return math.nan


def _opaque(wl, value):
    return X(wl=wl, value=None if value is None or math.isnan(value) or math.isinf(value) else value)


def _is_exactnum(v): return _exact(v) is not None or isinstance(v, X)


class ExactParser(Parser):
    """Same grammar as Parser; values as in the exact mode (int, float, Fraction, X, str, bool, None, dicts)."""
    def sum_(self):
        e = self.prod()
        while self.peek()[1] in ('+', '-'):
            op = self.take()[1]; r = self.prod()
            e = self.add(e, r if op == '+' else self.neg(r))
        return e

    def prod(self):
        e = self.power()
        while True:
            if self.peek()[1] in ('*', '/'):
                op = self.take()[1]; r = self.power()
            elif self.starts_primary():
                op = '*'; r = self.power()
            else: return e
            e = self.mul(e, r) if op == '*' else self.div(e, r)

    def power(self):
        e = self.unary()
        if self.peek()[1] == '^':
            self.take(); e = self.pow(e, self.power())
        return e

    def unary(self):
        if self.peek()[1] == '-':
            self.take(); return self.neg(self.unary())
        if self.peek()[1] == '!':
            self.take(); return {'head': 'Not', 'args': [self.unary()]}
        return self.postfix()

    def postfix(self):
        e = self.primary()
        while self.peek()[1] == '[':
            self.take(); e = self.call(e, self.args(']'))
        return e

    # arithmetic: exact numbers stay exact, machine reals stay machine reals, anything else stays an expression
    def neg(self, v):
        if isinstance(v, float): return -v
        return self.mul(-1, v)

    def add(self, a, b):
        ea, eb = _exact(a), _exact(b)
        if ea and eb and (ea[1] == eb[1] or ea[0] == 0 or eb[0] == 0):
            return _make(ea[0] + eb[0], ea[1] if ea[0] != 0 else eb[1])
        if isinstance(a, float) and isinstance(b, float): return a + b
        if _is_exactnum(a) and _is_exactnum(b): return _opaque(f'({_wl_of(a)}) + ({_wl_of(b)})', _approx(a) + _approx(b))
        return {'head': 'Plus', 'args': [a, b]}

    def mul(self, a, b):
        ea, eb = _exact(a), _exact(b)
        if ea and eb: return _make(ea[0] * eb[0], ea[1] + eb[1])
        if isinstance(a, float) and isinstance(b, float): return a * b
        if type(a) is int and a == -1 and isinstance(b, X): return _opaque(f'-({b.wl()})', -b.approx())
        if _is_exactnum(a) and _is_exactnum(b): return _opaque(f'({_wl_of(a)})*({_wl_of(b)})', _approx(a) * _approx(b))
        return {'head': 'Times', 'args': [a, b]}

    def div(self, a, b):
        eb = _exact(b)
        if eb and eb[0] != 0: return self.mul(a, _make(1 / eb[0], -eb[1]))
        if isinstance(a, float) and isinstance(b, float): return a / b
        return {'head': 'Times', 'args': [a, {'head': 'Power', 'args': [b, -1]}]}

    def pow(self, a, b):
        ea = _exact(a)
        if ea and isinstance(b, int) and not isinstance(b, bool) and (ea[0] != 0 or b > 0):
            return _make(ea[0] ** b, ea[1] * b)
        if _is_exactnum(a) and _is_exactnum(b): return _opaque(f'({_wl_of(a)})^({_wl_of(b)})', _approx(a) ** _approx(b))
        return {'head': 'Power', 'args': [a, b]}

    def primary(self):
        k, v = self.take()
        if k == 'num': return num_x(v)
        if k == 'str': return wl_string_x(v)
        if k == 'sym':
            name = named_x(v)
            if name in ('True', 'False'): return name == 'True'
            if name == 'Null': return None
            if name == 'Pi': return X(Fraction(1), 1)
            if name == 'Degree': return X(Fraction(1, 180), 1)
            if name == 'E': return _opaque('E', math.e)
            if name == 'Infinity': return _opaque('Infinity', None)
            parts = name.split('`')
            sym, ctx = parts[-1], '`'.join(parts[:-1])
            out = {'sym': sym[:-2] if sym.endswith('$$') else sym}
            if ctx: out['_ctx'] = ctx          # keys starting with _ are used here only, never written
            if sym.endswith('$$'): out['_dd'] = True
            return out
        if v == '{': return self.args('}')
        if v == '(':
            e = self.expr(); self.expect(')'); return e
        raise ValueError(f'unexpected token {v!r}')

    def call(self, head, args):
        name = head.get('sym') if isinstance(head, dict) else None
        if name == 'Rational' and len(args) == 2 and all(isinstance(a, int) and not isinstance(a, bool) for a in args):
            return _make(Fraction(args[0], args[1]), 0)
        if name == 'CompressedData' and len(args) == 1 and isinstance(args[0], str):
            s = re.sub(r'[\s\\]', '', args[0])
            return to_py_x(dec(zlib.decompress(base64.b64decode(s[2:])), 4)[0])
        if name == 'DirectedInfinity' and len(args) == 1 and args[0] in (1, -1) and not isinstance(args[0], bool):
            return _opaque('Infinity' if args[0] == 1 else '-Infinity', None)
        if name in FUNCS and args and all(_is_exactnum(a) for a in args):
            ea = _exact(args[0])
            if name == 'Sqrt' and ea and ea[1] == 0 and ea[0] >= 0:
                q = ea[0]; rn, rd = math.isqrt(q.numerator), math.isqrt(q.denominator)
                if rn * rn == q.numerator and rd * rd == q.denominator: return _make(Fraction(rn, rd), 0)
            try: val = FUNCS[name](*[_approx(a) for a in args])
            except (ValueError, OverflowError, TypeError): val = None
            return _opaque(f'{name}[' + ', '.join(_wl_of(a) for a in args) + ']', val)
        return {'head': name if name is not None else head, 'args': args}


FUNCS = {'Sqrt': math.sqrt, 'Sin': math.sin, 'Cos': math.cos, 'Tan': math.tan, 'Exp': math.exp, 'Log': math.log,
         'ArcTan': lambda *a: math.atan(a[0]) if len(a) == 1 else math.atan2(a[1], a[0])}  # ArcTan[x, y]


def num_x(text):
    """Number token -> int (exact integer), float (machine real, bit-exact) or X (arbitrary precision / exact)."""
    mant, _, exp = text.partition('*^')
    digits, tick, prec = mant.partition('`')
    if not tick and '.' not in digits:  # exact integer, possibly with *^
        n, e = int(digits), int(exp or 0)
        return n * 10 ** e if e >= 0 else _make(Fraction(n, 10 ** -e), 0)
    value = float(digits + ('e' + exp if exp else ''))  # correctly rounded decimal -> double, as Mathematica reads it
    if prec == '': return value  # 1.5 or 1.5` : machine real
    return X(wl=text, value=value)  # 1.5`20. or 1.5``10 : arbitrary precision, keep its text


def wl_string_x(v):
    s = re.sub(r'\\[<>]', '', v[1:-1])
    s = named_x(s)
    return s.replace('\\"', '"').replace('\\n', '\n').replace('\\t', '\t').replace('\\\\', '\\')


def _big(text):
    if re.fullmatch(r'-?\d+', text): return int(text)
    mant, _, exp = text.partition('*^')
    return X(wl=text, value=float(mant.split('`')[0] + ('e' + exp if exp else '')))


def to_py_x(e):  # mdecode output -> exact-mode values
    if isinstance(e, tuple):
        if e[0] == 'Sym':
            v = e[1].split('`')[-1]
            if v in ('True', 'False'): return v == 'True'
            if v == 'Null': return None
            if v == 'Pi': return X(Fraction(1), 1)
            return {'sym': v}
        if e[0] == 'Str': return e[1]
        if e[0] == 'Big': return _big(e[1])
        if e[0] == 'Packed':
            dims, d = e[1], e[2]

            def shape(flat, dims):
                if len(dims) == 1: return list(flat)
                step = len(flat) // dims[0]
                return [shape(flat[k * step:(k + 1) * step], dims[1:]) for k in range(dims[0])]
            out = shape(d, dims)
            return TypedList(out, e[3]) if len(e) > 3 else out
        h, a = e
        hv, args = to_py_x(h), [to_py_x(x) for x in a]
        if isinstance(hv, dict) and hv.get('sym') == 'List': return args
        p = ExactParser([])
        if isinstance(hv, dict) and hv.get('sym') in ('Times', 'Plus', 'Power') and args:
            op = {'Times': p.mul, 'Plus': p.add, 'Power': p.pow}[hv['sym']]
            acc = args[0]
            for x in args[1:]: acc = op(acc, x)
            return acc
        return p.call(hv, args)
    return e


def _exact_json(wl, n):  # {"wl": text, "n": double}; no "n" when there is no finite double (Infinity)
    return {'wl': wl} if n is None else {'wl': wl, 'n': n}


class TypedList(list):
    """A decoded packed array that remembers how it was stored (element type, e.g. "UnsignedInteger8")."""
    def __init__(self, items, etype):
        list.__init__(self, items)
        self.etype = etype


def to_json_x(v, path='', types=None):
    """Exact-mode value -> JSON value (see FORMAT_NOTE). types (dict) collects path -> element type of TypedLists."""
    if isinstance(v, bool) or v is None or isinstance(v, str): return v
    if isinstance(v, int): return v if abs(v) <= SAFE_INT else {'wl': str(v)}  # big integer: digits, no double
    if isinstance(v, float):
        if math.isnan(v) or math.isinf(v): raise ValueError('non-finite machine real')
        return v
    if isinstance(v, Fraction): return _exact_json(f'{v.numerator}/{v.denominator}', float(v))
    if isinstance(v, X): return _exact_json(v.wl(), v.value())
    if isinstance(v, list):
        if isinstance(v, TypedList) and types is not None: types[path] = v.etype
        return [to_json_x(x, f'{path}/{i}', types) for i, x in enumerate(v)]
    if isinstance(v, dict): return {k: to_json_x(x, f'{path}/{k}', types) for k, x in v.items() if not k.startswith('_')}
    raise TypeError(type(v))


def _balanced(text, start):
    """Index just after the bracket that closes the one opened before `start` (strings skipped)."""
    j, depth, instr = start, 1, False
    while depth:
        c = text[j]
        if instr:
            if c == '\\': j += 1
            elif c == '"': instr = False
        elif c == '"': instr = True
        elif c in '{[(': depth += 1
        elif c in '}])': depth -= 1
        j += 1
    return j


def assignments(body, keep=lambda t: True):
    """'a = 1, b = 2, ...' (inside of a list) -> (dict in file order, names with a different repeated value, number of
    elements the parser could not read). keep(target) selects the variables (target = parsed symbol)."""
    p = ExactParser(tokenize_x(body + '}'))
    vals = p.args('}')
    st, dups = {}, []
    for v in vals:
        if isinstance(v, dict) and v.get('head') == 'Set' and isinstance(v['args'][0], dict) and 'sym' in v['args'][0]:
            target, value = v['args'][0], v['args'][1]
        elif isinstance(v, dict) and 'sym' in v:
            target, value = v, None
        else: continue
        if not keep(target): continue
        name = target['sym']
        if name in st:  # Settings repeat a variable that is both a control and a local (unit balls: p): keep the first
            if to_json_x(st[name]) != to_json_x(value): dups.append(name)
            continue
        st[name] = value
    return st, dups, _count_unparsed(st)


def _count_unparsed(v):  # elements the small parser skipped ({"unparsed": true})
    if isinstance(v, dict): return 1 if v.get('unparsed') else sum(_count_unparsed(x) for x in v.values())
    if isinstance(v, list): return sum(_count_unparsed(x) for x in v)
    return 0


def _manipulate_var(t):  # a Manipulate variable in the cell context (not Typeset`..., not a localised copy x$123)
    return t.get('_ctx') == '$CellContext' and not re.search(r'\$\d+$', t['sym'])


def notebook_states(path):
    """Exact-mode states of a notebook: {'states': live states (output cells, file order), 'specs': initial settings,
    'snapshots': Settings of the snapshot cells (file order), 'snapshotCellIds': [...], 'problems': [...]}."""
    text = open(path, encoding='utf-8', errors='replace').read()
    text = re.sub(r'\\\r?\n', '', text)
    problems, live, snaps, ids, specs = [], [], [], [], None
    for m in re.finditer(r'DynamicModuleBox\[\{', text):
        j = _balanced(text, m.end())
        body = text[m.end():j - 1]
        if '$CellContext`' not in body: continue
        try:
            st, dups, unp = assignments(body, lambda t: t.get('_dd') and _manipulate_var(t))
        except Exception as ex:  # reported, not fatal
            problems.append(f'live state at offset {m.start()}: {ex}'); continue
        if dups: problems.append(f'live state at offset {m.start()}: different repeated values for {dups}')
        if unp: problems.append(f'live state at offset {m.start()}: {unp} element(s) not read')
        if st and all(to_json_x(st) != to_json_x(s) for s in live): live.append(st)
    for m in re.finditer(r'"Variables"\s*:>\s*\{', text):
        j = _balanced(text, m.end())
        st, dups, unp = assignments(text[m.end():j - 1], _manipulate_var)
        if dups or unp: problems.append(f'initial settings: repeated {dups}, {unp} element(s) not read')
        if specs is None: specs = st
        elif to_json_x(specs) != to_json_x(st): problems.append('more than one different "Variables" list')
    for k, m in enumerate(re.finditer(r'"Settings"\s*:>\s*\{', text), 1):
        j = _balanced(text, m.end())
        st, dups, unp = assignments(text[m.end():j - 1], lambda t: t.get('_ctx') == '$CellContext')
        if dups: problems.append(f'snapshot {k}: different repeated values for {dups}')
        if unp: problems.append(f'snapshot {k}: {unp} element(s) not read')
        snaps.append(st)
        cid = re.match(r'[\s}]*,(?:\s*CellTags\s*->\s*(?:"[^"]*"|\{[^}]*\})\s*,)?\s*CellID\s*->\s*(\d+)', text[j:j + 400])
        ids.append(int(cid.group(1)) if cid else None)
    return {'states': live, 'specs': specs, 'snapshots': snaps, 'snapshotCellIds': ids, 'problems': problems}


FORMAT_NOTE = ('Numbers: a JSON integer is an exact Wolfram integer (|x| <= 2^53 - 1; larger ones are {"wl": digits}); '
               'a JSON number written with a decimal point or an exponent is a machine real (the shortest text that reads '
               'back as the identical double); any other exact number (Rational, rational multiple of Pi, arbitrary-'
               'precision real, an unevaluated Sin[...], Infinity) is {"wl": a Wolfram-readable form (not necessarily '
               'InputForm: compare exact values by value), "n": its double} - "n" is the correctly rounded double for a '
               'Rational or rational multiple of Pi, Python\'s double evaluation otherwise, and absent for Infinity. '
               'Symbols are {"sym": name}, other expressions {"head": name, "args": [...]}; variable names without context '
               'and $$, Greek letters as Unicode. packedTypes maps the JSON pointer of a decoded packed array that was '
               'stored with a narrower element type (CompressedData tag b) to that type. snapshots["k"] belongs to the '
               'picture docs/original-snapshots/<dir>-k.png (cells in file order).')


def _dump(v, ind=0):
    """JSON with one line per variable (diffable, without one line per number)."""
    if isinstance(v, dict) and v and ind < 2 and 'wl' not in v:
        pad = ' ' * (ind + 1)
        return ('{\n' + ',\n'.join(pad + json.dumps(k, ensure_ascii=False) + ': ' + _dump(x, ind + 1) for k, x in v.items())
                + '\n' + ' ' * ind + '}')
    if isinstance(v, list) and ind == 1 and v and all(isinstance(x, dict) for x in v):
        return '[\n' + ',\n'.join(' ' * (ind + 1) + _dump(x, ind + 1) for x in v) + '\n' + ' ' * ind + ']'
    return json.dumps(v, ensure_ascii=False, separators=(',', ':'), allow_nan=False)


def snapshots_document(nb):
    r = notebook_states(nb)
    doc = {'source': os.path.basename(nb),
           'note': 'Manipulate states saved in the ORIGINAL notebook, computed by the original Mathematica code: '
                   'states[0] = the live state of the output cell, specs = the initial settings (the Manipulate\'s stored '
                   '"Variables"), snapshots = the Settings stored with each snapshot cell. Extracted with '
                   'tools/extract_state.py --snapshots. Golden parity fixture (CC BY-NC-SA 3.0, as the original).',
           'format': FORMAT_NOTE,
           'specs': None, 'states': None, 'snapshots': None,
           'snapshotCellIds': {str(k): c for k, c in enumerate(r['snapshotCellIds'], 1)}}
    types = {}
    doc['specs'] = to_json_x(r['specs'], '/specs', types)
    doc['states'] = [to_json_x(s, f'/states/{i}', types) for i, s in enumerate(r['states'])]
    doc['snapshots'] = {str(k): to_json_x(s, f'/snapshots/{k}', types) for k, s in enumerate(r['snapshots'], 1)}
    if types: doc['packedTypes'] = types
    return doc, r['problems']


def write_snapshots_json(nb, out_file):
    doc, problems = snapshots_document(nb)
    with open(out_file, 'w', encoding='utf-8', newline='\n') as f:
        f.write(_dump(doc) + '\n')
    return doc, problems


USAGE = '''Usage:
  python tools/extract_state.py NOTEBOOK.nb OUT.json [var1 var2 ...]   live state(s), legacy values (as before)
  python tools/extract_state.py --snapshots NOTEBOOK.nb OUT.json      live state, initial settings and the Settings
                                                                       of every snapshot cell, exact values
  python tools/extract_state.py --self-test                           checks of both modes (no notebook needed)'''

if __name__ == '__main__':
    if sys.argv[1:2] == ['--self-test']:
        from extract_state_selftest import run
        sys.exit(run())
    if sys.argv[1:2] == ['--snapshots']:
        if len(sys.argv) != 4: sys.exit(USAGE)
        doc, problems = write_snapshots_json(sys.argv[2], sys.argv[3])
        print(sys.argv[3], len(doc['states']), 'live state(s),', len(doc['snapshots']), 'snapshot(s),',
              'initial settings' if doc['specs'] is not None else 'no initial settings')
        for p in problems: print('  warning:', p)
        sys.exit(0)
    if len(sys.argv) < 3 or sys.argv[1].startswith('--'): sys.exit(USAGE)
    nb, out_file, *names = sys.argv[1:]
    sts = states(nb)
    if names: sts = [{k: s.get(k) for k in names} for s in sts]
    json.dump({'source': os.path.basename(nb),
               'note': 'Saved Manipulate state(s) of the ORIGINAL notebook, computed by the original Mathematica code. '
                       'Golden parity fixture (CC BY-NC-SA 3.0, as the original).',
               'states': sts}, open(out_file, 'w', encoding='utf-8'), indent=1)
    print(out_file, len(sts), 'state(s);', ', '.join(sorted(sts[0].keys())) if sts else '')
