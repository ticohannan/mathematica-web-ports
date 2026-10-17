#!/usr/bin/env python3
# SPDX-FileCopyrightText: 2026 Tico Hannan
# SPDX-License-Identifier: MIT
"""tools/harness/check-scenarios.py -- static check of Mathematica-harness scenario files against the notebooks (HW-62).

Runs without Mathematica: it reads the definition notebook as plain text with a bracket-aware scanner, finds the
Manipulate output cell (Variables, Specifications, Body, Initialization, live state) and the snapshot Settings,
and checks every scenario of tests/harness/<dir>.scenarios.json:

  * set / drag / setFrom names resolve to Manipulate variables (HW-11, HW-12; spelled-out Greek aliases such as
    "Theta1" and Unicode variants such as U+03C6 for Wolfram's \\[Phi] are reported as INFO),
  * capture names resolve lexically (innermost Body scope that declares the name, else Manipulate variable, else
    Initialization global); a name that is both a Body local and a Manipulate variable is flagged (HW-13);
    ambiguous names (declared by two sibling scopes) are errors,
  * symbols inside "wl:" values and captures resolve, and one wl: capture never mixes locals of sibling scopes,
  * press labels exist (HW-18), "ctl:<var>#<k>" indices are in range (HW-10), snapshot numbers exist (HW-28),
    drag has a setter or a Locator control (HW-25), local functions are captured through wl: (HW-14).

Usage
  python tools/harness/check-scenarios.py <dir> [<notebook.nb>] [--scenarios FILE] [--originals DIR] [--out FILE]
  python tools/harness/check-scenarios.py --all [--originals DIR]
  python tools/harness/check-scenarios.py --structure <notebook.nb>     (structure report only)

Notebooks are looked up by the scenario file's "notebook" name in --originals folders (repeatable), the folders in
the environment variable HARNESS_ORIGINALS (os.pathsep-separated), _internal/originals and
_internal/originals/batch-ab. Writes test-output/harness/<dir>.index.json. Exit status: 0 no errors, 1 errors
found, 2 usage problem or notebook missing.
"""
import bisect
import json
import os
import re
import sys
import unicodedata
# Windows consoles and pipes default to a legacy code page; print Greek variable names (θ1) as UTF-8 instead of failing
for _s in (sys.stdout, sys.stderr):
    try: _s.reconfigure(encoding='utf-8', errors='backslashreplace')
    except (AttributeError, ValueError): pass

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
OPEN = {'[': ']', '{': '}', '(': ')'}
CLOSE = set(OPEN.values())

# ---------------------------------------------------------------- Greek letters: Wolfram names <-> Unicode
# Wolfram's \[Phi] is U+03D5 and \[CurlyPhi] U+03C6; \[Epsilon] is U+03F5 and \[CurlyEpsilon] U+03B5.
_SPECIAL = {0x3C6: 'CurlyPhi', 0x3D5: 'Phi', 0x3B5: 'CurlyEpsilon', 0x3F5: 'Epsilon', 0x3D1: 'CurlyTheta',
            0x3C2: 'FinalSigma', 0x3D6: 'CurlyPi', 0x3F1: 'CurlyRho', 0x3F0: 'CurlyKappa', 0x3D2: 'CapitalUpsilon'}
UNI2WL = {}
for cp in list(range(0x391, 0x3AA)) + list(range(0x3B1, 0x3CA)) + list(_SPECIAL):
    if cp in _SPECIAL:
        UNI2WL[chr(cp)] = _SPECIAL[cp]
        continue
    try:
        nm = unicodedata.name(chr(cp))
    except ValueError:
        continue
    m = re.match(r'GREEK (SMALL|CAPITAL) LETTER (\w+)$', nm)
    if not m:
        continue
    base = m.group(2).capitalize().replace('Lamda', 'Lambda')
    UNI2WL[chr(cp)] = ('Capital' + base) if m.group(1) == 'CAPITAL' else base
WL2UNI = {v: k for k, v in UNI2WL.items()}
GREEK_NAMES = sorted(WL2UNI, key=len, reverse=True)           # longest first (HW-11c)
SPELLED_RE = re.compile('|'.join(GREEK_NAMES))
VARIANTS = {'CurlyPhi': 'Phi', 'Phi': 'CurlyPhi', 'CurlyEpsilon': 'Epsilon', 'Epsilon': 'CurlyEpsilon'}
LETTER_NAMED = re.compile(r'(Capital|Curly|Script|Gothic|DoubleStruck|Formal)?(%s)$' % '|'.join(GREEK_NAMES + ['[A-Z]', '[a-z]']))


def to_wl(name):
    """JSON name (Unicode or with \\[Name] escapes) -> Wolfram text form with \\[Name] for Greek letters."""
    return ''.join('\\[%s]' % UNI2WL[c] if c in UNI2WL else c for c in name)


def to_uni(name):
    return re.sub(r'\\\[(\w+)\]', lambda m: WL2UNI.get(m.group(1), m.group(0)), name)


# ---------------------------------------------------------------- bracket-aware notebook text
class Text:
    def __init__(self, text):
        self.t = text
        self.lines = [0] + [m.end() for m in re.finditer('\n', text)]

    def line(self, i):
        return bisect.bisect_right(self.lines, i)

    def skip_special(self, i):
        t = self.t
        n = t[i + 1] if i + 1 < len(t) else ''
        if n == '[':
            j = t.index(']', i + 2)
            return j + 1
        if n == '\r' and t[i + 2:i + 3] == '\n':
            return i + 3
        if n == ':':
            return i + 6
        if n == '.':
            return i + 4
        return i + 2

    def skip_string(self, j):
        t = self.t
        j += 1
        while t[j] != '"':
            j += 2 if t[j] == '\\' else 1
        return j + 1

    def match(self, i):
        """i at an opening bracket: index of the matching closing bracket."""
        t = self.t
        stack = [t[i]]
        j = i + 1
        while stack:
            c = t[j]
            if c == '"':
                j = self.skip_string(j)
                continue
            if c == '\\':
                j = self.skip_special(j)
                continue
            if c == '(' and t[j + 1:j + 2] == '*':
                d, j = 1, j + 2
                while d:
                    if t.startswith('(*', j):
                        d, j = d + 1, j + 2
                    elif t.startswith('*)', j):
                        d, j = d - 1, j + 2
                    else:
                        j += 1
                continue
            if c in OPEN:
                stack.append(c)
            elif c in CLOSE:
                o = stack.pop()
                if OPEN[o] != c:
                    raise ValueError('bracket mismatch %s%s at line %d' % (o, c, self.line(j)))
            j += 1
        return j - 1

    def split_top(self, a, b):
        """Split t[a:b] at depth-0 commas: list of (start, end)."""
        t = self.t
        out, s, j, depth = [], a, a, 0
        while j < b:
            c = t[j]
            if c == '"':
                j = self.skip_string(j)
                continue
            if c == '\\':
                j = self.skip_special(j)
                continue
            if c in OPEN:
                depth += 1
            elif c in CLOSE:
                depth -= 1
            elif c == ',' and depth == 0:
                out.append((s, j))
                s = j + 1
            j += 1
        if t[s:b].strip():
            out.append((s, b))
        return out


def norm(s):
    s = re.sub(r'\\\r?\n', '', s)
    return re.sub(r'\s+', ' ', s).strip()


SYM_CHAR = r'(?:\\\[[A-Za-z]+\]|[^\W_]|\$)'          # letters (any script), digits, $, named letters
SYM_START = r'(?:\\\[[A-Za-z]+\]|[^\W\d_]|\$)'
SYMBOL_RE = re.compile(r'(?<![^\W_]|[$`\]])(%s%s*(?:`%s%s*)*)' % (SYM_START, SYM_CHAR, SYM_START, SYM_CHAR))


def symbols_in(code):
    """Symbols (with context) in Wolfram code text, outside strings and comments, in order of appearance."""
    out = []
    i, n = 0, len(code)
    buf = []
    while i < n:
        c = code[i]
        if c == '"':
            j = i + 1
            while j < n and code[j] != '"':
                j += 2 if code[j] == '\\' else 1
            buf.append(' ')
            i = j + 1
            continue
        if code.startswith('(*', i):
            j = code.find('*)', i + 2)
            i = n if j < 0 else j + 2
            buf.append(' ')
            continue
        buf.append(c)
        i += 1
    clean = to_wl(''.join(buf))
    # numbers (incl. precision marks), but not the digits inside names such as p1 or \[Theta]1
    clean = re.sub(r'(?<![^\W_]|[$`\]])\d+\.?\d*(`\d*\.?\d*)?(\*\^-?\d+)?', ' ', clean)
    for m in SYMBOL_RE.finditer(clean):
        s = m.group(1)
        for nm in re.findall(r'\\\[([A-Za-z]+)\]', s):
            if not LETTER_NAMED.match(nm):
                s = None
                break
        if s and not s[0].isdigit():
            out.append(s)
    return out


def strip_ctx(sym):
    return sym.rsplit('`', 1)[-1]


ITERATOR_HEADS = ('Table', 'Do', 'Sum', 'Product', 'Plot', 'Plot3D', 'ParametricPlot', 'ParametricPlot3D', 'ContourPlot',
                  'RegionPlot', 'RegionPlot3D', 'DensityPlot', 'NSum', 'NProduct', 'Integrate', 'NIntegrate', 'Array')


def bound_names(code):
    """Names that a wl: expression scopes itself: Module/With/Block lists, iterators of Table, Plot, … and
    Function parameters. The harness leaves these symbols alone (they are not the notebook's locals)."""
    t = Text(code + ' ')
    out = set()
    for m in re.finditer(r'(?<![A-Za-z0-9`$])(Module|With|Block|Function|%s)\[' % '|'.join(ITERATOR_HEADS), code):
        o = m.end() - 1
        try:
            args = t.split_top(o + 1, t.match(o))
        except Exception:
            continue
        if m.group(1) in ('Module', 'With', 'Block', 'Function'):
            first = code[args[0][0]:args[0][1]].strip() if args else ''
            if first.startswith('{'):
                items = t.split_top(args[0][0] + code[args[0][0]:].index('{') + 1, t.match(args[0][0] + code[args[0][0]:].index('{')))
                for (s, e) in items:
                    mm = re.match(r'\s*(%s%s*)' % (SYM_START, SYM_CHAR), code[s:e])
                    if mm:
                        out.add(mm.group(1))
            elif m.group(1) == 'Function' and len(args) > 1:
                mm = re.match(r'\s*(%s%s*)\s*$' % (SYM_START, SYM_CHAR), first)
                if mm:
                    out.add(mm.group(1))
        else:
            for (s, e) in args[1:]:
                mm = re.match(r'\s*\{\s*(%s%s*)\s*,' % (SYM_START, SYM_CHAR), code[s:e])
                if mm:
                    out.add(mm.group(1))
    return out


# ---------------------------------------------------------------- notebook model
class Notebook:
    def __init__(self, path):
        self.path = path
        with open(path, encoding='utf-8', errors='replace') as fh:
            self.x = Text(fh.read())
        t = self.x.t
        self.mb = [m.start() for m in re.finditer(r'Manipulate`ManipulateBoxes\[', t)]
        if not self.mb:
            raise ValueError('no Manipulate output cell (Manipulate`ManipulateBoxes) in %s' % path)
        self.copies = len(self.mb)
        i = self.mb[0]
        dmb = t.rfind('DynamicModuleBox[', 0, i)
        self.dmb_open = dmb + len('DynamicModuleBox')
        self.dmb_close = self.x.match(self.dmb_open)
        if not (self.dmb_open < i < self.dmb_close):
            raise ValueError('the Manipulate boxes are not inside a DynamicModuleBox')
        args = self.x.split_top(self.dmb_open + 1, self.dmb_close)
        self.live_span = args[0]
        mbo = i + len('Manipulate`ManipulateBoxes')
        mbc = self.x.match(mbo)
        self.parts = {}
        for (s, e) in self.x.split_top(mbo + 1, mbc):
            m = re.match(r'\s*"(\w+)"\s*:>\s*', t[s:e])
            if m:
                self.parts[m.group(1)] = (s + m.end(), e)
        self.init_span = None
        for (s, e) in args[2:]:
            m = re.match(r'\s*Initialization\s*:>\s*', t[s:e])
            if m:
                self.init_span = (s + m.end(), e)
        self.bodies = []
        for k in self.mb:
            o = k + len('Manipulate`ManipulateBoxes')
            c = self.x.match(o)
            for (s, e) in self.x.split_top(o + 1, c):
                m = re.match(r'\s*"Body"\s*:>\s*', t[s:e])
                if m:
                    self.bodies.append(norm(t[s + m.end():e]))
        self._variables()
        self._live()
        self._scopes()
        self._globals()
        self._specs()
        self._snapshots()

    def text(self, span):
        return self.x.t[span[0]:span[1]] if span else ''

    def _list_items(self, span):
        """Items of a {…} list whose text is t[span]."""
        t = self.x.t
        s = span[0]
        while t[s] in ' \t\r\n\\':
            s += 1
        if t[s] != '{':
            return []
        e = self.x.match(s)
        return self.x.split_top(s + 1, e)

    def _variables(self):
        self.manip = []          # Wolfram text names without $$ (e.g. \[Theta]1)
        self.var_init = {}
        for (s, e) in self._list_items(self.parts['Variables']):
            seg = norm(self.x.t[s:e])
            m = re.match(r'\$CellContext`(\S+?)\$\$\s*(?:=\s*(.*))?$', seg, re.S)
            if m:
                self.manip.append(m.group(1))
                self.var_init[m.group(1)] = (m.group(2) or '')[:200]

    def _live(self):
        self.live = []
        self.typeset_specs_vars = []
        t = self.x.t
        for (s, e) in self._list_items(self.live_span):
            seg = norm(t[s:e])
            name = seg.split('=')[0].strip()
            if name.startswith('Typeset`specs$$'):
                self.typeset_specs_vars = [strip_ctx(v)[:-2] for v in re.findall(r'Hold\[(\$CellContext`(?:\\\[[A-Za-z]+\]|[^\],\\])+?\$\$)\]', seg)]
            if name.startswith('$CellContext`') and name.endswith('$$') and not re.search(r'\$\d+\$\$$', name):
                self.live.append(strip_ctx(name)[:-2])

    def _scopes(self):
        """Module/With/Block scopes of the Body: k (file order), kind, span, locals, parent, depth."""
        t = self.x.t
        a, b = self.parts['Body']
        self.scopes = []
        for m in re.finditer(r'(?<![A-Za-z0-9`$])(Module|With|Block)\[', t[a:b]):
            o = a + m.end() - 1
            c = self.x.match(o)
            items = self.x.split_top(o + 1, c)
            if not items or not norm(t[items[0][0]:items[0][1]]).startswith('{'):
                continue
            locs = []
            for (s, e) in self._list_items(items[0]):
                seg = norm(t[s:e])
                mm = re.match(r'(?:\$CellContext`)?(%s%s*?)\$?\s*(?::?=.*)?$' % (SYM_START, SYM_CHAR), seg, re.S)
                if mm:
                    locs.append(mm.group(1))
            self.scopes.append({'k': len(self.scopes) + 1, 'kind': m.group(1), 'span': (o, c), 'locals': locs,
                                'line': self.x.line(o)})
        for sc in self.scopes:
            anc = [p for p in self.scopes if p is not sc and p['span'][0] < sc['span'][0] and sc['span'][1] < p['span'][1]]
            sc['depth'] = len(anc)
            sc['parent'] = max(anc, key=lambda p: p['span'][0])['k'] if anc else None
            sc['ancestors'] = [p['k'] for p in anc]
        body = self.text(self.parts['Body'])
        self.local_functions = sorted(set(m.group(1) for m in re.finditer(
            r'\$CellContext`(%s%s*?)\$\[[^\]]*\]\s*:?=' % (SYM_START, SYM_CHAR), norm(body))))
        self.body_head = norm(body)[:30]

    def _globals(self):
        init = norm(self.text(self.init_span))
        self.globals = set()
        for s in symbols_in(init):
            if s.startswith('$CellContext`') and not s.endswith('$'):
                self.globals.add(strip_ctx(s))

    def _specs(self):
        t = self.x.t
        a, b = self.parts['Specifications']
        self.controls = {}
        self.buttons = []
        manip = set(self.manip)

        def header_name(seg):
            seg = norm(seg)
            m = re.match(r'\{?\s*\$CellContext`(\S+?)\$\$\s*[,}]', seg + ',')
            return m.group(1) if m and m.group(1) in manip else None

        def visit(s, e):
            seg = t[s:e].strip()
            st = s + (len(t[s:e]) - len(t[s:e].lstrip()))
            if seg.startswith('{'):
                close = self.x.match(st)
                items = self.x.split_top(st + 1, close)
                if items:
                    h = header_name(t[items[0][0]:items[0][1]])
                    if h and h not in self.controls:
                        self.controls[h] = self._classify(items)
                        return
                for (s2, e2) in items:
                    visit(s2, e2)
            else:
                m = re.match(r'([A-Za-z`]+)\[', seg)
                if m:
                    o = st + m.end() - 1
                    if m.group(1) == 'Button':
                        it = self.x.split_top(o + 1, self.x.match(o))
                        lab = norm(t[it[0][0]:it[0][1]])
                        self.buttons.append(json.loads(lab) if lab.startswith('"') else lab)
                        return
                    if m.group(1) == 'ButtonBar':
                        it = self.x.split_top(o + 1, self.x.match(o))
                        for (s3, e3) in self._list_items(it[0]):
                            mm = re.match(r'\s*("(?:[^"\\]|\\.)*")\s*(:>|->)', t[s3:e3])
                            if mm:
                                self.buttons.append(json.loads(mm.group(1)))
                        return
                    for (s2, e2) in self.x.split_top(o + 1, self.x.match(o)):
                        visit(s2, e2)
        for (s, e) in self._list_items((a, b)):
            visit(s, e)

    def _classify(self, items):
        t = self.x.t
        rest = [norm(t[s:e]) for (s, e) in items[1:]]
        opts = [r for r in rest if re.match(r'[A-Za-z]+\s*(->|:>)', r)]
        nonopt = [(r, sp) for r, sp in zip(rest, items[1:]) if r not in opts]
        info = {'kind': 'other'}
        ctype = next((re.sub(r'.*?(->|:>)\s*', '', o) for o in opts if o.startswith('ControlType')), None)
        if ctype:
            info['controlType'] = ctype
        if len(nonopt) == 1 and nonopt[0][0].startswith('{'):
            vals = [norm(t[s:e]) for (s, e) in self._list_items(nonopt[0][1])]
            info.update(kind='values', values=[re.split(r'\s*(?:->|:>)\s*', v)[0] if re.search(r'->|:>', v) else v for v in vals])
        elif any(r.endswith('&') for r, _ in nonopt):
            info.update(kind='custom', function=next(r for r, _ in nonopt if r.endswith('&'))[:120])
        if ctype == 'Locator' or any(r == 'Locator' for r, _ in nonopt):
            lists = [r for r, _ in nonopt if r.startswith('{')]
            info.update(kind='locator', bounds=lists[:2] if len(lists) >= 2 else 'Automatic')
        if ctype == 'None':
            info['kind'] = 'none'
        return info

    def _snapshots(self):
        t = self.x.t
        self.snapshots = []
        for m in re.finditer(r'"Settings"\s*:>\s*\{', t):
            a = m.end() - 1
            e = self.x.match(a)
            before = t.rfind('TaggingRules', max(0, m.start() - 400), m.start())
            if before < 0:
                continue
            names = []
            for (s, ee) in self.x.split_top(a + 1, e):
                seg = norm(t[s:ee])
                mm = re.match(r'\$CellContext`(\S+?)\s*=', seg)
                if mm:
                    names.append(mm.group(1))
            cell = t.rfind('\nCell[', 0, m.start())
            tags = None
            if cell >= 0:
                try:
                    ce = self.x.match(cell + len('\nCell'))
                    mt = re.search(r'CellTags->\s*("[^"]*"|\{[^}]*\})', t[e:ce])
                    tags = mt.group(1) if mt else None
                except Exception:
                    tags = None
            self.snapshots.append({'k': len(self.snapshots) + 1, 'line': self.x.line(m.start()), 'cellTags': tags, 'variables': names})

    def structure(self):
        manip = set(self.manip)
        return {
            'file': os.path.basename(self.path),
            'manipulateCopies': self.copies,
            'bodyCopies': len(self.bodies), 'bodyDistinct': len(set(self.bodies)),
            'lines': {k: self.x.line(v[0]) for k, v in self.parts.items()} | ({'Initialization': self.x.line(self.init_span[0])} if self.init_span else {}),
            'variables': [to_uni(v) for v in self.manip],
            'liveNamesDifferFromVariables': sorted(to_uni(v) for v in set(self.live) ^ manip),
            'typesetSpecs': {'sameVariables': set(self.typeset_specs_vars) == manip, 'sameOrder': self.typeset_specs_vars == self.manip,
                             'order': [to_uni(v) for v in self.typeset_specs_vars]},
            'bodyHead': self.body_head,
            'scopes': [{'k': s['k'], 'kind': s['kind'], 'line': s['line'], 'depth': s['depth'], 'parent': s['parent'],
                        'locals': [to_uni(x) for x in s['locals']]} for s in self.scopes],
            'localFunctions': [to_uni(x) for x in self.local_functions],
            'controls': {to_uni(k): v for k, v in self.controls.items()},
            'buttons': self.buttons,
            'snapshots': [{**s, 'variables': [to_uni(v) for v in s['variables']],
                           'extraSettings': [to_uni(v) for v in s['variables'] if v not in manip],
                           'missingSettings': [to_uni(v) for v in self.manip if v not in s['variables']]} for s in self.snapshots],
            'initializationGlobals': len(self.globals),
        }


# ---------------------------------------------------------------- resolution (HW-11, HW-12)
class Resolver:
    def __init__(self, nb, extra_globals=()):
        self.nb = nb
        self.manip = set(nb.manip)
        self.globals = set(nb.globals) | set(extra_globals)
        self.locals = {}
        for s in nb.scopes:
            for x in s['locals']:
                self.locals.setdefault(x, []).append(s)

    def candidates(self, name):
        """[(wl_name, alias_kind)] in the order HW-11 tries them."""
        wl = to_wl(name)
        out = [(wl, None)]
        if re.search(r'\\\[(CurlyPhi|Phi|CurlyEpsilon|Epsilon)\]', wl):
            out.append((re.sub(r'\\\[(CurlyPhi|Phi|CurlyEpsilon|Epsilon)\]', lambda m: '\\[%s]' % VARIANTS[m.group(1)], wl), 'unicode-variant'))
        sp = SPELLED_RE.sub(lambda m: '\\[%s]' % m.group(0), wl)
        if sp != wl:
            out.append((sp, 'spelled-out'))
        return out

    def lookup(self, wl, mode):
        """mode 'manip' (set/drag/setFrom) or 'capture'. Returns dict or None; 'ambiguous' flag for sibling scopes."""
        if wl.endswith('$$'):
            base = wl[:-2]
            return {'kind': 'manipulate', 'symbol': base} if base in self.manip else None
        if wl.endswith('$') and mode == 'capture':
            base = wl[:-1]
            return self._local(base)
        if mode == 'manip':
            return {'kind': 'manipulate', 'symbol': wl} if wl in self.manip else None
        r = self._local(wl)
        if r:
            if wl in self.manip:
                r['clash'] = 'also a Manipulate variable (HW-13): "%s$$" names the variable' % to_uni(wl)
            return r
        if wl in self.manip:
            return {'kind': 'manipulate', 'symbol': wl}
        if wl in self.globals:
            return {'kind': 'global', 'symbol': wl}
        return None

    def _local(self, base):
        scs = self.locals.get(base)
        if not scs:
            return None
        deepest = max(s['depth'] for s in scs)
        top = [s for s in scs if s['depth'] == deepest]
        r = {'kind': 'local', 'scope': top[0]['k'], 'symbol': base}
        if len(top) > 1:
            r['ambiguous'] = [s['k'] for s in top]
        return r

    def resolve(self, name, mode):
        for wl, alias in self.candidates(name):
            r = self.lookup(wl, mode)
            if r:
                if alias:
                    r['alias'] = '%s (%s)' % (to_uni(wl), alias)
                return r
        return None


SPECIAL_CAPTURES = {'%out', '%g', '%g3d', '%primitives', '%text', '%messages', '%plotRange', '$RandomDraws'}


def definitions_globals(defs):
    out = set()
    for d in defs or []:
        d = d[3:] if d.startswith('wl:') else d
        for m in re.finditer(r'(?:^|;)\s*(%s%s*)\s*(?::=|=)(?!=)' % (SYM_START, SYM_CHAR), d):
            out.add(to_wl(m.group(1)))
    return out


def check_scenarios(nb, sfile):
    res = Resolver(nb, definitions_globals(sfile.get('definitions')))
    nsnap = len(nb.snapshots)
    out = []
    for sc in sfile['scenarios']:
        issues = []
        resolved = {}

        def issue(level, msg):
            issues.append({'level': level, 'msg': msg})

        def start_ok(st, where):
            m = re.match(r'snapshot:(\d+)$', st or '')
            if m and int(m.group(1)) > nsnap:
                issue('ERROR', '%s: snapshot %s does not exist (%d snapshots, HW-28)' % (where, m.group(1), nsnap))

        start_ok(sc.get('start', sfile.get('start')), 'start')

        def wl_symbols(code, where, mode):
            scopes = set()
            wlcode = to_wl(code)
            # names the expression scopes itself (iterators {i, …}, Module/With/Block lists) or uses as a pure
            # symbol (Subscript[q, i]): a fresh $CellContext` symbol is what the author meant
            own = bound_names(wlcode)
            own |= set(re.findall(r'Subscript\[\s*(%s%s*)\s*,' % (SYM_START, SYM_CHAR), wlcode))
            for s in symbols_in(code):
                if '`' in s and not s.startswith('$CellContext`'):
                    continue
                base = strip_ctx(s)
                if base in own:
                    continue                                     # scoped by the expression itself
                if mode == 'value':
                    r = res.resolve(to_uni(base), 'manip') or ({'kind': 'global', 'symbol': base} if base in res.globals else None)
                else:
                    r = res.resolve(to_uni(base), 'capture')
                if r:
                    if r.get('alias'):
                        issue('INFO', '%s: symbol %s resolved through alias %s' % (where, to_uni(base), r['alias']))
                    if r['kind'] == 'local':
                        scopes.add(r['scope'])
                        if mode == 'value':
                            issue('ERROR', '%s: %s is a Body local; values cannot use locals' % (where, to_uni(base)))
                    continue
                if base[0].isupper() or base.startswith('$'):
                    continue                                     # presumably a System symbol
                issue('WARN', '%s: symbol %s is neither a Manipulate variable, a Body local nor an Initialization '
                      'global: it will be a fresh $CellContext` symbol' % (where, to_uni(base)))
            if len(scopes) > 1:
                chain = [s for s in nb.scopes if s['k'] in scopes]
                deepest = max(chain, key=lambda s: s['depth'])
                if not all(k == deepest['k'] or k in deepest['ancestors'] for k in scopes):
                    issue('ERROR', '%s: uses locals of sibling scopes %s (HW-39)' % (where, sorted(scopes)))
            return scopes

        def check_value(v, where):
            if isinstance(v, list):
                for i, x in enumerate(v):
                    check_value(x, '%s[%d]' % (where, i))
            elif isinstance(v, str) and v.startswith('wl:'):
                wl_symbols(v[3:], where, 'value')
            elif isinstance(v, str) and v.startswith('ctl:'):
                m = re.match(r'ctl:(.+)#(\d+)$', v)
                if not m:
                    issue('ERROR', '%s: bad ctl: form %r' % (where, v))
                    return
                r = res.resolve(m.group(1), 'manip')
                ctl = nb.controls.get(r['symbol']) if r else None
                if not r:
                    issue('ERROR', '%s: ctl: variable %s unknown' % (where, m.group(1)))
                elif not ctl or ctl.get('kind') != 'values':
                    issue('ERROR', '%s: control %s has no value list (HW-10)' % (where, m.group(1)))
                elif not 1 <= int(m.group(2)) <= len(ctl['values']):
                    issue('ERROR', '%s: index %s out of range 1..%d of %s' % (where, m.group(2), len(ctl['values']), m.group(1)))

        for i, step in enumerate(sc['steps']):
            w = 'step %d' % (i + 1)
            if 'set' in step or 'drag' in step:
                kind = 'set' if 'set' in step else 'drag'
                for name, v in step[kind].items():
                    r = res.resolve(name, 'manip')
                    if not r:
                        issue('ERROR', '%s: %s %s is not a Manipulate variable' % (w, kind, name))
                        continue
                    resolved.setdefault(name, {'kind': 'manipulate', 'symbol': to_uni(r['symbol']) + '$$', **({'alias': r['alias']} if 'alias' in r else {})})
                    if 'alias' in r:
                        issue('INFO', '%s: %s resolved through alias %s' % (w, name, r['alias']))
                    if kind == 'drag':
                        ctl = nb.controls.get(r['symbol'], {})
                        if isinstance(v, dict):
                            if ctl.get('kind') != 'locator':
                                issue('ERROR', '%s: drag of %s with "index" needs a Locator control' % (w, name))
                            check_value(v.get('to'), '%s.drag.%s.to' % (w, name))
                            continue
                        if ctl.get('kind') not in ('custom', 'locator'):
                            issue('ERROR', '%s: %s has no setter and is not a Locator: use set (HW-25)' % (w, name))
                    check_value(v, '%s.%s.%s' % (w, kind, name))
            elif 'press' in step:
                if step['press'] not in nb.buttons:
                    issue('ERROR', '%s: no button labelled %r (labels: %s)' % (w, step['press'], nb.buttons))
            elif 'setFrom' in step:
                start_ok(step['setFrom'], w)
        for cap in sc['capture']:
            if cap in SPECIAL_CAPTURES:
                continue
            if cap.startswith('%options:'):
                for o in cap[len('%options:'):].split(','):
                    if not re.match(r'[A-Z][A-Za-z0-9]*$', o.strip()):
                        issue('ERROR', 'capture %s: option name %r' % (cap, o))
                continue
            if cap.startswith('%') or cap.startswith('$'):
                issue('ERROR', 'capture %s: unknown special capture' % cap)
                continue
            if cap.startswith('wl:'):
                scopes = wl_symbols(cap[3:], 'capture ' + cap, 'capture')
                resolved[cap] = {'kind': 'wl', 'scopes': sorted(scopes)}
                continue
            r = res.resolve(cap, 'capture')
            if not r:
                issue('ERROR', 'capture %s does not resolve (HW-11/12)' % cap)
                continue
            if 'ambiguous' in r:
                issue('ERROR', 'capture %s is declared by sibling scopes %s' % (cap, r['ambiguous']))
            if 'clash' in r:
                issue('INFO', 'capture %s: Body local; %s' % (cap, r['clash']))
            if 'alias' in r:
                issue('INFO', 'capture %s resolved through alias %s' % (cap, r['alias']))
            if r['kind'] == 'local' and r['symbol'] in nb.local_functions:
                issue('WARN', 'capture %s is a local function: capture it through wl: (HW-14)' % cap)
            resolved[cap] = {k: (to_uni(v) if k == 'symbol' else v) for k, v in r.items() if k != 'clash'}
        out.append({'id': sc['id'], 'resolved': resolved, 'issues': issues})
    return out


# ---------------------------------------------------------------- command line
def find_notebook(name, extra_dirs):
    dirs = list(extra_dirs)
    if os.environ.get('HARNESS_ORIGINALS'):
        dirs += os.environ['HARNESS_ORIGINALS'].split(os.pathsep)
    dirs += [os.path.join(ROOT, '_internal', 'originals'), os.path.join(ROOT, '_internal', 'originals', 'batch-ab')]
    for d in dirs:
        p = os.path.join(d, name)
        if os.path.isfile(p):
            return p
    for d in dirs:
        for dp, _dn, fns in os.walk(d) if os.path.isdir(d) else []:
            if name in fns:
                return os.path.join(dp, name)
    return None


def run_app(d, nb_path, scen_path, out_path, quiet=False):
    with open(scen_path, encoding='utf-8') as fh:
        sfile = json.load(fh)
    nb = Notebook(nb_path)
    results = check_scenarios(nb, sfile)
    counts = {'ERROR': 0, 'WARN': 0, 'INFO': 0}
    for r in results:
        for i in r['issues']:
            counts[i['level']] += 1
    index = {'app': d, 'notebook': os.path.basename(nb_path), 'structure': nb.structure(), 'counts': counts, 'scenarios': results}
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, 'w', encoding='utf-8') as fh:
        json.dump(index, fh, indent=1, ensure_ascii=False)
    if not quiet:
        print('%-26s %3d scenarios  ERROR %d  WARN %d  INFO %d' % (d, len(results), counts['ERROR'], counts['WARN'], counts['INFO']))
        for r in results:
            for i in r['issues']:
                if i['level'] != 'INFO':
                    print('   %s %s: %s' % (i['level'], r['id'], i['msg']))
    return counts


def main(argv):
    args, opts, extra = [], {}, []
    it = iter(argv)
    for a in it:
        if a in ('--scenarios', '--out', '--originals'):
            v = next(it, None)
            if v is None:
                print('missing value for ' + a)
                return 2
            if a == '--originals':
                extra.append(v)
            else:
                opts[a] = v
        elif a.startswith('--'):
            opts[a] = True
        else:
            args.append(a)
    if '--help' in opts or (not args and '--all' not in opts):
        print(__doc__)
        return 0 if '--help' in opts else 2
    if '--structure' in opts:
        nb = Notebook(args[0])
        print(json.dumps(nb.structure(), indent=1, ensure_ascii=False))
        return 0
    hdir = os.path.join(ROOT, 'tests', 'harness')
    dirs = sorted(f[:-len('.scenarios.json')] for f in os.listdir(hdir) if f.endswith('.scenarios.json')) if '--all' in opts else [args[0]]
    worst = 0
    for d in dirs:
        scen = opts.get('--scenarios') or os.path.join(hdir, d + '.scenarios.json')
        with open(scen, encoding='utf-8') as fh:
            nbname = json.load(fh)['notebook']
        nbp = args[1] if len(args) > 1 and '--all' not in opts else find_notebook(nbname, extra)
        if not nbp:
            print('%-26s notebook %s not found (use --originals DIR)' % (d, nbname))
            worst = max(worst, 2)
            continue
        out = opts.get('--out') if '--all' not in opts and opts.get('--out') else os.path.join(ROOT, 'test-output', 'harness', d + '.index.json')
        c = run_app(d, nbp, scen, out)
        if c['ERROR']:
            worst = max(worst, 1)
    return worst


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
