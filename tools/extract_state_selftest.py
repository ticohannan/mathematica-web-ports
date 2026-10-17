#!/usr/bin/env python3
# SPDX-FileCopyrightText: 2026 Tico Hannan
# SPDX-License-Identifier: MIT
"""Self-test of tools/extract_state.py and tools/mdecode.py (no notebook needed).

Run:  python tools/extract_state.py --self-test     (or: python tools/extract_state_selftest.py)
The vitest suite runs it when a Python 3 interpreter is found (tests/unit/extract-state.test.js).
Checks: bit-exact machine reals (incl. the *^ exponent), exact numbers, Greek names, repeated Settings variables,
live state / initial settings / snapshot Settings of a small synthetic notebook, the byte-packed integer arrays of
mdecode, and that the legacy output (the default CLI) is unchanged, pinned on the same synthetic notebook.
"""
import base64, json, os, struct, subprocess, sys, tempfile, zlib
from fractions import Fraction
# Windows consoles and pipes default to a legacy code page; print Greek variable names (θ1) as UTF-8 instead of failing
for _s in (sys.stdout, sys.stderr):
    try: _s.reconfigure(encoding='utf-8', errors='backslashreplace')
    except (AttributeError, ValueError): pass

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import extract_state as E  # noqa: E402
from mdecode import dec  # noqa: E402

CHECKS = []


def check(name, got, want):
    ok = got == want and type(got) is type(want)
    CHECKS.append((name, ok, got, want))


def parse(text):
    return E.to_json_x(E.ExactParser(E.tokenize_x(text)).expr())


def compressed(raw_body):
    """CompressedData["1:..."] text for a binary body (the "!boR" header is added)."""
    return '"1:' + base64.b64encode(zlib.compress(b'!boR' + raw_body)).decode() + '"'


def packed_bytes(dims, values):
    return b'b' + struct.pack('<i', len(dims)) + struct.pack('<' + 'i' * len(dims), *dims) + bytes(values)


# A small notebook in the layout of a Wolfram definition notebook: one output cell with the live DynamicModule
# state and the Manipulate's stored "Variables", and two snapshot cells with TaggingRules "Settings".
NOTEBOOK = r'''Notebook[{
Cell[BoxData[
 TagBox[
  StyleBox[
   DynamicModuleBox[{$CellContext`p$$ = 0.5, $CellContext`\[Theta]1$$ = Rational[-1, 2] Pi, $CellContext`locs$$ = {{-10, -5}, {
    -10., -3.}}, $CellContext`h$$ = 1.2246467991473532`*^-5, Typeset`show$$ = True, $CellContext`x$12345$$ = 7}, "body"],
   "Manipulate"],
  Manipulate`InterpretManipulate[1]]], "Output",
 TaggingRules->{"Variables" :> {$CellContext`p$$ = 0.5, $CellContext`\[Theta]1$$ = 0, $CellContext`locs$$ = {}, \
$CellContext`h$$ = 0}}],
Cell[BoxData[GraphicsBox[{}]], "Output",
 TaggingRules->{
  "Settings" :> {$CellContext`p = 1, $CellContext`p = 1, $CellContext`\[Theta]1 = 0.25, $CellContext`locs = {{1, 2}}, \
$CellContext`h = 0}},
 CellID->111],
Cell[BoxData[GraphicsBox[{}]], "Output",
 TaggingRules->{
  "Settings" :> {$CellContext`p = DirectedInfinity[1], $CellContext`\[Theta]1 = Cos[Rational[5, 32] Pi], \
$CellContext`locs = BYTES, $CellContext`h = 1.5`20.}},
 CellTags->"Snapshot",
 CellID->222]
}]
'''

# legacy (default CLI) output for NOTEBOOK, pinned when the exact mode was added (v0.1.14); it must never change
# (the legacy reader drops the Greek name \[Theta]1, keeping '$CellContext': null, and reads *^ with a rounding error)
LEGACY = ("{\n \"source\": \"selftest.nb\",\n \"note\": \"Saved Manipulate state(s) of the ORIGINAL notebook, computed b"
          "y the original Mathematica code. Golden parity fixture (CC BY-NC-SA 3.0, as the original).\",\n \"state"
          "s\": [\n  {\n   \"p\": 0.5,\n   \"$CellContext\": null,\n   \"locs\": [\n    [\n     -10,\n     -5\n    ],\n    [\n  "
          "   -10.0,\n     -3.0\n    ]\n   ],\n   \"h\": 1.2246467991473534e-05,\n   \"show\": true,\n   \"x$12345\": 7\n  }"
          "\n ]\n}")


def run():
    # --- numbers
    check('machine real', E.num_x('2.1'), 2.1)
    check('machine real with trailing point', E.num_x('2.'), 2.0)
    check('machine real with backtick', E.num_x('1.2822762395363814`'), 1.2822762395363814)
    check('exact integer', E.num_x('2'), 2)
    check('*^ exponent read with correct rounding', E.num_x('1.2246467991473532`*^-5'), 1.2246467991473532e-05)
    check('the legacy reader rounds that one differently (kept as it was)', E.num('1.2246467991473532`*^-5'), 1.2246467991473534e-05)
    check('integer with *^', E.num_x('5*^3'), 5000)
    check('integer with negative *^ is a rational', E.to_json_x(E.num_x('5*^-1')), {'wl': '1/2', 'n': 0.5})
    check('arbitrary precision real keeps its text', E.to_json_x(E.num_x('1.5`20.')), {'wl': '1.5`20.', 'n': 1.5})
    # --- exact expressions
    check('Rational', parse('Rational[1, 2]'), {'wl': '1/2', 'n': 0.5})
    check('Rational times Pi', parse('Rational[-1, 2] Pi'), {'wl': '-Pi/2', 'n': -1.5707963267948966})
    check('(-2) Pi', parse('(-2) Pi'), {'wl': '-2*Pi', 'n': -6.283185307179586})
    check('3 Pi / 2 correctly rounded', parse('Rational[3, 2] Pi'), {'wl': '3*Pi/2', 'n': float(Fraction(3, 2) * E.PI_F)})
    check('Pi alone', parse('Pi'), {'wl': 'Pi', 'n': 3.141592653589793})
    check('Infinity', parse('DirectedInfinity[1]'), {'wl': 'Infinity'})
    check('minus Infinity', parse('DirectedInfinity[-1]'), {'wl': '-Infinity'})
    check('unevaluated Cos', parse('Cos[Rational[5, 32] Pi]')['wl'], 'Cos[5*Pi/32]')
    check('list of integer and real', parse('{1, 2.}'), [1, 2.0])
    check('Greek string', parse('Subscript["\\[Theta]", 1]'), {'head': 'Subscript', 'args': ['θ', 1]})
    check('rule', parse('PlotLabel -> "Phase Space"'), {'head': 'Rule', 'args': [{'sym': 'PlotLabel'}, 'Phase Space']})
    check('big integer kept as digits without a double', E.to_json_x(E.num_x('12345678901234567890')), {'wl': '12345678901234567890'})
    check('2^53 - 1 is a plain integer', E.to_json_x(2 ** 53 - 1), 9007199254740991)
    check('2^53 is written as digits', E.to_json_x(2 ** 53), {'wl': '9007199254740992'})
    # --- assignments: Greek names, repeated variables
    st, dups, unp = E.assignments('$CellContext`\\[Theta]1 = 0.5, $CellContext`p = 1, $CellContext`p = 1')
    check('Greek variable name', list(st), ['θ1', 'p'])
    check('equal repeats are not reported', dups, [])
    _, dups, _ = E.assignments('$CellContext`p = 1, $CellContext`p = 2')
    check('different repeats are reported', dups, ['p'])
    # --- mdecode: packed integer array stored as unsigned bytes
    raw = b'!boR' + packed_bytes([2, 3], [1, 2, 200, 249, 0, 127])
    check('byte-packed array decoded unsigned, element type recorded', dec(raw, 4)[0], ('Packed', (2, 3), [1, 2, 200, 249, 0, 127], 'UnsignedInteger8'))
    try:
        dec(raw, 4, byte_arrays=False); refused = False
    except ValueError:
        refused = True
    check('byte-packed array refused in legacy mode', refused, True)
    # --- a synthetic notebook: exact mode and pinned legacy output
    text = NOTEBOOK.replace('BYTES', 'CompressedData[' + compressed(packed_bytes([1, 3], [1, 200, 3])) + ']')
    with tempfile.TemporaryDirectory() as d:
        nb = os.path.join(d, 'selftest.nb')
        with open(nb, 'w', encoding='utf-8', newline='\n') as f: f.write(text)
        doc, problems = E.snapshots_document(nb)
        check('no problems reported', problems, [])
        check('live state: Manipulate variables only (no Typeset`, no localised copies)', doc['states'],
              [{'p': 0.5, 'θ1': {'wl': '-Pi/2', 'n': -1.5707963267948966}, 'locs': [[-10, -5], [-10.0, -3.0]], 'h': 1.2246467991473532e-05}])
        check('initial settings', doc['specs'], {'p': 0.5, 'θ1': 0, 'locs': [], 'h': 0})
        check('snapshot 1 (repeated p kept once)', doc['snapshots']['1'], {'p': 1, 'θ1': 0.25, 'locs': [[1, 2]], 'h': 0})
        check('snapshot 2 (Infinity, Cos, byte array, arbitrary precision)', doc['snapshots']['2'],
              {'p': {'wl': 'Infinity'}, 'θ1': {'wl': 'Cos[5*Pi/32]', 'n': doc['snapshots']['2']['θ1']['n']},
               'locs': [[1, 200, 3]], 'h': {'wl': '1.5`20.', 'n': 1.5}})
        check('element type of the byte-packed array recorded by JSON pointer', doc.get('packedTypes'), {'/snapshots/2/locs': 'UnsignedInteger8'})
        check('snapshot cell ids (with and without CellTags)', doc['snapshotCellIds'], {'1': 111, '2': 222})
        out = os.path.join(d, 'out.json')
        E.write_snapshots_json(nb, out)
        with open(out, encoding='utf-8') as f: written = json.load(f)
        check('written file reads back identically', written['snapshots'], doc['snapshots'])
        # legacy CLI: same output as before v0.1.14 (byte for byte)
        legacy_out = os.path.join(d, 'legacy.json')
        subprocess.run([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'extract_state.py'), nb, legacy_out],
                       check=True, capture_output=True)
        with open(legacy_out, encoding='utf-8') as f: check('legacy CLI output unchanged', f.read(), LEGACY)
    failed = [c for c in CHECKS if not c[1]]
    for name, _, got, want in failed:
        print(f'FAIL {name}: got {got!r}, want {want!r}')
    print(f'extract_state self-test: {len(CHECKS) - len(failed)} of {len(CHECKS)} checks passed')
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(run())
