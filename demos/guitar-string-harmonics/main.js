// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Connor Davenport and Edmon Perkins
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/guitar-string-harmonics/main.js — the page: the original's Manipulate (shared/manipulate.js) with the controls
// on the left (popup "harmonic", Trigger "time"), the picture and, beside it, the text column of the body's Row.
import { Manipulate, PopupMenu, Trigger, Rule } from '../../shared/manipulate.js';
import { initialState, initialSettings, evaluate, L, FORCED_NODES, harmonicFrequencies } from './model.js';

// ---- the text column: Text@Grid[{{"standing wave equation"}, {Row[…]}, {"\nwavelength equation"}, …}, Alignment -> Center]
// (static: it does not depend on n or t). Divide[a, b] is a built-up fraction, Sqrt[…] a radical.
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const it = (s) => `<i>${esc(s)}</i>`;
const frac = (num, den) => `<span class="gs-frac"><span class="gs-num">${num}</span><span class="gs-den">${den}</span></span>`;
const sqrt = (x) => `<span class="gs-sqrt"><span class="gs-radical">√</span><span class="gs-radicand">${x}</span></span>`;
const grid = (rows, testid) => `<table class="gs-grid" data-testid="${testid}"><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
const panel = document.getElementById('text-panel');
if (panel) {
  panel.innerHTML = [
    '<div class="gs-head">standing wave equation</div>',
    // Row[{Style["y", Italic], " = 2 ", Style["A", Italic], " sin(", Row[{"2 π ", Style["x", Italic]}]/" λ", ") cos(ω ", Style["t", Italic], ")"}]
    `<div class="gs-eq" data-testid="eq-wave">${it('y')} = 2 ${it('A')} sin(${frac(`2 π ${it('x')}`, 'λ')}) cos(ω ${it('t')})</div>`,
    '<div class="gs-head gs-gap">wavelength equation</div>',
    // Row[{"λ = ", Row[{"2 ", Style["L", Italic]}]/Style["n", Italic]}]
    `<div class="gs-eq" data-testid="eq-wavelength">λ = ${frac(`2 ${it('L')}`, it('n'))}</div>`,
    '<div class="gs-head gs-gap">frequency equation</div>',
    // Row[{"ω = ", Row[{Style["n", Italic], " π"}]/Style["L", Italic], Sqrt[Style["T", Italic]/ρ]}]
    `<div class="gs-eq" data-testid="eq-frequency">ω = ${frac(`${it('n')} π`, it('L'))} ${sqrt(frac(it('T'), 'ρ'))}</div>`,
    '<div class="gs-head gs-gap">forced nodes</div>',
    grid(FORCED_NODES, 'forced-nodes'),
    '<div class="gs-head gs-gap">harmonic frequencies</div>',
    grid(harmonicFrequencies(), 'harmonic-frequencies'),
  ].join('');
}

Manipulate({
  name: 'guitar-string-harmonics',
  initial: initialState, // the notebook's live state: n = 1, t = 0.27
  initialSettings, // ⊕ > Initial Settings: n = 1, t = 0
  body: evaluate,
  // Graphics[…, PlotRange -> {{-1.5, 6.5}, {0, L}}, ImageSize -> {263, 500}]: the range fills the 500 px height, so the
  // picture is 157 px wide, centred in the 263 px box as Mathematica centres it (CSS in index.html)
  graphics: {
    PlotRange: [[-1.5, 6.5], [0, L]], ImageSize: [263, 500], PlotRangePadding: 0, maxWidth: '157px',
    label: 'Guitar fretboard: six strings, frets, sound hole; the sixth string vibrates in the chosen harmonic',
  },
  ControlPlacement: 'Left',
  resetStops: true, // Initial settings stops a running Trigger
  controls: [
    [['n', 1, 'harmonic'], [Rule(1, '1st'), Rule(2, '2nd'), Rule(3, '3rd'), Rule(4, '4th'), Rule(5, '5th')], { ControlType: PopupMenu, Appearance: 'Large' }],
    [['t', 0, 'time'], 0, 1, 0.01, { ControlType: Trigger, AnimationRate: 0.05 }],
  ],
  // TrackedSymbols :> {n}: Mathematica evaluates the Row again only when n changes; the picture inside it is Dynamic and
  // follows t. Here the body is evaluated after every change, which shows the same (N-GA-01).
});
