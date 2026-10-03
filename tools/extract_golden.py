"""Extract saved control states (and the original program's computed results)
from the cached Manipulate outputs inside the original .nb files.
These are produced by the ORIGINAL Mathematica code, so they serve as
golden reference fixtures for parity tests."""
import re, base64, zlib, json, sys
from mdecode import dec

def to_py(e):
    if isinstance(e, tuple):
        if e[0] in ('Sym', 'Str', 'Big'): return e[1] if e[0] != 'Big' else float(e[1].split('`')[0])
        if e[0] == 'Packed':
            dims, d = e[1], e[2]
            if len(dims) == 1: return d
            c = dims[-1]; rows = [d[k*c:(k+1)*c] for k in range(len(d)//c)]
            if len(dims) == 2: return rows
            b = dims[1]; return [rows[k*b:(k+1)*b] for k in range(dims[0])]
        h, a = e
        if h == ('Sym', 'List'): return [to_py(x) for x in a]
        return {'head': to_py(h), 'args': [to_py(x) for x in a]}
    return e

NUM = re.compile(r'-?\d+\.?\d*(?:`[\d.]*)?(?:\*\^-?\d+)?')
def parse_literal(v):
    v = re.sub(r'\\\r?\n', '', v)
    if v.startswith('CompressedData['):
        j = v.index('"]'); s = re.sub(r'[\s\\]', '', v[16:j])
        return to_py(dec(zlib.decompress(base64.b64decode(s[2:])), 4)[0])
    v = v.strip()
    if v.startswith('"'): return v.strip('"').replace('\\"', '')
    # numeric scalar or nested list of numbers
    js = NUM.sub(lambda m: repr(float(m.group(0).split('`')[0].replace('*^', 'e'))), v)
    return json.loads(js.replace('{', '[').replace('}', ']'))

def grab(seg, name):
    mm = re.search(r'(?:\$CellContext`|`)' + re.escape(name) + r'\$\$\s*=\s*', seg)
    if not mm: return None
    v = seg[mm.end():]; d = 0; out = ''
    instr = False
    for ch in v:
        if ch == '"' and not out.endswith('\\'): instr = not instr
        if not instr:
            if ch in '{[(': d += 1
            if ch in '}])': d -= 1
            if (ch == ',' and d == 0) or d < 0: break
        out += ch
    return parse_literal(out)

def states(path, names):
    t = re.sub(r'\\\r?\n', '', open(path, encoding='utf-8').read())
    res = []
    for m in re.finditer(r'DynamicModuleBox\[\{', t):
        seg = t[m.end():m.end() + 400000]
        res.append({n: grab(seg, n) for n in names})
    # de-duplicate identical states (thumbnail repeats the first snapshot)
    uniq = []
    for s in res:
        if s not in uniq: uniq.append(s)
    return uniq

if __name__ == '__main__':
    src, kind, out = sys.argv[1:4]
    if kind == 'motion':
        names = ['configOrWork', 'x', 'n', 's', 'r1', 'r2', 'o1', 'o2', 'o3', 'o4',
                 'discretePath', 'linesStarttoObstacles', 'linesEndtoObstacles',
                 'verticestoVertices', 'prevRobotobstconfig', 'prevObstaclepoly',
                 'prevRobotStartPoly', 'prevRobotEndPoly']
    elif kind == 'threeparam':
        names = ['typeRot', 'progress', 'angle', 'axis', '\\[Alpha]', '\\[Beta]', '\\[Gamma]',
                 '\\[Theta]', '\\[Phi]', '\\[Psi]']
    else:
        names = ['a1', 'a2', 'a3']
    st = states(src, names)
    clean = [{k.replace('\\[', '').replace(']', ''): v for k, v in s.items()} for s in st]
    json.dump({'source': src.split('/')[-1],
               'note': 'Saved Manipulate states from the ORIGINAL notebook (thumbnail + snapshots). '
                       'Values computed by the original Mathematica code; used as golden parity fixtures.',
               'states': clean}, open(out, 'w'), indent=1)
    print(out, len(clean), 'unique states')
