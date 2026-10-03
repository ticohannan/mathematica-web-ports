#!/usr/bin/env python3
"""Extract readable source + text from Mathematica .nb files without a Wolfram kernel.

Parses only the top-level notebook expression structure (heads, lists, strings,
numbers, symbols, rules) and renders box structures (RowBox, SubscriptBox...)
back to linear Wolfram Language text. Output cells are skipped (they hold cached
graphics / DynamicModule state, not source).
"""
import re, sys

SKIP = {'DynamicModuleBox','DynamicBox','ManipulateBoxes','GraphicsBox','Graphics3DBox','CompressedData','GraphicsData','RasterBox','Graphics3D','Graphics'}

class P:
    def __init__(s, t): s.t, s.i, s.n = t, 0, len(t)
    def ws(s):
        while s.i < s.n:
            c = s.t[s.i]
            if c in ' \t\r\n': s.i += 1
            elif s.t.startswith('(*', s.i):
                d, s.i = 1, s.i + 2
                while d and s.i < s.n:
                    if s.t.startswith('(*', s.i): d += 1; s.i += 2
                    elif s.t.startswith('*)', s.i): d -= 1; s.i += 2
                    else: s.i += 1
            elif s.t.startswith('\\\r\n', s.i): s.i += 3
            elif s.t.startswith('\\\n', s.i): s.i += 2
            else: break
    def skip_balanced(s):
        d = 0
        while True:
            c = s.t[s.i]
            if c == '"':
                s.i += 1
                while s.t[s.i] != '"':
                    s.i += 2 if s.t[s.i] == '\\' else 1
            elif c == '[': d += 1
            elif c == ']':
                d -= 1
                if d == 0: s.i += 1; return
            s.i += 1
    def expr(s):
        s.ws(); e = s.prim()
        while True:
            s.ws()
            if s.t.startswith('->', s.i): s.i += 2; e = ('Rule', [e, s.expr()])
            elif s.t.startswith(':>', s.i): s.i += 2; e = ('RuleDelayed', [e, s.expr()])
            else: return e
    def args(s, close):
        out = []; s.ws()
        if s.t[s.i] == close: s.i += 1; return out
        while True:
            out.append(s.expr()); s.ws()
            c = s.t[s.i]; s.i += 1
            if c == ',': continue
            if c == close: return out
            raise ValueError(f'unexpected {c!r} at {s.i}: {s.t[s.i-40:s.i+40]!r}')
    def prim(s):
        c = s.t[s.i]
        if c == '"':
            j = s.i + 1; buf = []
            while True:
                ch = s.t[j]
                if ch == '\\':
                    nxt = s.t[j+1]
                    if nxt == '\r' and s.t[j+2] == '\n': j += 3; continue
                    if nxt == '\n': j += 2; continue
                    buf.append(s.t[j:j+2]); j += 2; continue
                if ch == '"': break
                buf.append(ch); j += 1
            s.i = j + 1
            e = ('Str', ''.join(buf))
        elif c == '{':
            s.i += 1; e = ('List', s.args('}'))
        elif c == '(':
            s.i += 1; e = s.expr(); s.ws(); assert s.t[s.i] == ')'; s.i += 1
        elif c == '-' or c.isdigit() or c == '.':
            m = re.compile(r'-?(\d+\.?\d*|\.\d+)(`+-?[\d.]*)?(\*\^-?\d+)?').match(s.t, s.i)
            s.i = m.end(); e = ('Num', m.group(0))
        else:
            m = re.compile(r'[$A-Za-z][$A-Za-z0-9`]*').match(s.t, s.i)
            if not m: raise ValueError(f'bad char {c!r} at {s.i}: {s.t[s.i-60:s.i+60]!r}')
            s.i = m.end(); e = ('Sym', m.group(0))
            if e[1] in SKIP:
                s.ws()
                if s.i < s.n and s.t[s.i] == '[':
                    s.skip_balanced(); return ('Call', e, [('Str', '')])
        while True:
            s.ws()
            if s.i < s.n and s.t[s.i] == '[':
                s.i += 1; e = ('Call', e, s.args(']'))
            else: return e

NAMED = {'IndentingNewLine': '\n', 'Degree': '°', 'Rule': '->', 'RuleDelayed': ':>',
         'LeftDoubleBracket': '[[', 'RightDoubleBracket': ']]', 'Equal': '==', 'Element': '∈',
         'NonBreakingSpace': ' ', 'LessEqual': '<=', 'GreaterEqual': '>=', 'NotEqual': '!=',
         'Times': '×', 'InvisibleSpace': '', 'InvisibleTimes': '', 'Pi': 'π', 'Infinity': '∞'}

def unesc(t):
    t = re.sub(r'\\\[(\w+)\]', lambda m: NAMED.get(m.group(1), m.group(1) if len(m.group(1)) > 1 and m.group(1)[0].isupper() and m.group(1) in ('Alpha','Beta','Gamma','Theta','Phi','Psi','Omega') else '\\[' + m.group(1) + ']'), t)
    greek = {'Alpha':'α','Beta':'β','Gamma':'γ','Theta':'θ','Phi':'φ','Psi':'ψ','Omega':'ω','Delta':'δ','Epsilon':'ε','Lambda':'λ','Mu':'μ','Sigma':'σ','Tau':'τ','Rho':'ρ','Chi':'χ','Eta':'η','Kappa':'κ','Nu':'ν','Xi':'ξ','Zeta':'ζ','CapitalTheta':'Θ','CapitalPhi':'Φ','CapitalPsi':'Ψ','CapitalOmega':'Ω','CapitalDelta':'Δ'}
    t = re.sub(r'\\\[(\w+)\]', lambda m: greek.get(m.group(1), '\\[' + m.group(1) + ']'), t)
    t = t.replace('\\"', '"').replace('\\\\', '\\').replace('\\n', '\n').replace('\\t', '\t')
    t = re.sub(r'\\:([0-9a-fA-F]{4})', lambda m: chr(int(m.group(1), 16)), t)
    return t

def head(e): return e[1][1] if e[0] == 'Call' and e[1][0] == 'Sym' else None

def box(e):
    k = e[0]
    if k == 'Str': return unesc(e[1])
    if k == 'Num': return e[1]
    if k == 'Sym': return e[1]
    if k == 'List': return ''.join(box(x) for x in e[1])
    if k in ('Rule', 'RuleDelayed'): return ''
    h, a = head(e), e[2]
    if h == 'RowBox': return ''.join(box(x) for x in a[0][1])
    if h in ('BoxData', 'StyleBox', 'TagBox', 'FormBox', 'AdjustmentBox', 'ItemBox', 'InterpretationBox', 'TooltipBox', 'FrameBox', 'DynamicWrapperBox', 'PaneBox'):
        return box(a[0])
    if h == 'SubscriptBox': return f'Subscript[{box(a[0])}, {box(a[1])}]'
    if h == 'SuperscriptBox': return f'{box(a[0])}^{box(a[1])}'
    if h == 'SubsuperscriptBox': return f'Subscript[{box(a[0])},{box(a[1])}]^{box(a[2])}'
    if h == 'FractionBox': return f'({box(a[0])})/({box(a[1])})'
    if h == 'SqrtBox': return f'Sqrt[{box(a[0])}]'
    if h == 'OverscriptBox': return f'Overscript[{box(a[0])}, {box(a[1])}]'
    if h == 'UnderscriptBox': return f'Underscript[{box(a[0])}, {box(a[1])}]'
    if h == 'TextData': return box(a[0])
    if h == 'ButtonBox': return box(a[0])
    if h == 'Cell': return box(a[0])
    if h == 'GraphicsBox': return '<<GraphicsBox>>'
    if h == 'Graphics3DBox': return '<<Graphics3DBox>>'
    if h == 'GridBox': return '<<Grid:' + ' | '.join(box(r) for r in a[0][1]) + '>>'
    if h == 'TemplateBox': return '<<TemplateBox:' + box(a[0]) + '>>'
    return f'<<{h}>>'

def cells(nb):
    out = []
    def walk(e):
        h = head(e)
        if h == 'Cell':
            a = e[2]
            if a and head(a[0]) == 'CellGroupData':
                for c in a[0][2][0][1]: walk(c)
                return
            style = a[1][1] if len(a) > 1 and a[1][0] == 'Str' else ''
            out.append((style, a[0], a))
        elif h == 'Notebook':
            for c in e[2][0][1]: walk(c)
    walk(nb)
    return out

if __name__ == '__main__':
    src = open(sys.argv[1], encoding='utf-8', errors='replace').read()
    start = src.index('Notebook[{')
    nb = P(src[start:]).expr()
    for style, content, a in cells(nb):
        if style in ('Output',): print(f'\n### [{style}] (skipped cached output)'); continue
        opts = [x for x in a[2:] if x[0] in ('Rule', 'RuleDelayed')]
        init = any(o[1][0][0] == 'Sym' and o[1][0][1] == 'InitializationCell' and box(o[1][1]) == 'True' for o in opts)
        print(f'\n### [{style}]{" (init)" if init else ""}')
        try: print(box(content))
        except Exception as ex: print('<<render error', ex, '>>')
