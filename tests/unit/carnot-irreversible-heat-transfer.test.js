// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Rachael L. Baumann, Megan Maguire and John L. Falconer
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// tests/unit/carnot-irreversible-heat-transfer.test.js — the model of "Carnot Cycles with Irreversible Heat Transfer":
// the original's balances against hand derivations, and the labels at the three snapshots' saved settings against the
// numbers printed in the snapshot pictures (docs/original-snapshots/carnot-irreversible-heat-transfer-*.png).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { initialState, cycle, evaluate } from '../../demos/carnot-irreversible-heat-transfer/model.js';

const golden = JSON.parse(readFileSync(new URL('../golden/carnot-irreversible-heat-transfer.original-states.json', import.meta.url), 'utf8'));

describe('carnot-irreversible-heat-transfer model', () => {
  it('the opening state is the notebook live state', () => {
    expect(initialState()).toEqual(golden.states[0]);
    expect(initialState()).toEqual(golden.specs);
  });

  it('heat engine: Qh = -1250 J, Qc and the work from the engine temperatures', () => {
    const c = cycle({ csb: 1, 'ΔT1': 10, 'ΔT2': 12 });
    expect([c.Th, c.Tc, c.TH, c.TC]).toEqual([500, 275, 490, 287]);
    expect(c.QH).toBe(-1250);
    expect(c.QC).toBeCloseTo(1250 * 287 / 490, 12); // QC = −QH TC/TH
    expect(c.eta).toBeCloseTo(203 / 490, 14);
    expect(c.W).toBeCloseTo((203 / 490) * -1250, 12); // W = η QH
    // energy balance of the cycle: the heat in equals the heat out plus the work (signs of the original's labels)
    expect(-c.QH).toBeCloseTo(c.QC + -c.W, 10);
    expect(c.dStotal).toBeCloseTo(-1250 / 500 + c.QC / 275, 14);
  });

  it('heat pump: Qc = -600 J, COP = TC/(TH - TC), W = -QC/COP', () => {
    const c = cycle({ csb: 2, 'ΔT1': 8, 'ΔT2': 36 });
    expect([c.Th, c.Tc, c.TH, c.TC]).toEqual([325, 275, 333, 239]);
    expect(c.QC).toBe(-600);
    expect(c.QH).toBeCloseTo(600 * 333 / 239, 12); // QH = −QC TH/TC
    expect(c.COP).toBeCloseTo(239 / 94, 14);
    expect(c.W).toBeCloseTo(600 / (239 / 94), 12);
    expect(c.QH).toBeCloseTo(600 + c.W, 10); // the hot side receives the cold heat plus the work
  });

  it('without temperature differences the total entropy change is zero (reversible)', () => {
    for (const csb of [1, 2]) expect(cycle({ csb, 'ΔT1': 0, 'ΔT2': 0 }).dStotal).toBeCloseTo(0, 13);
    // and it grows with either difference
    const a = cycle({ csb: 1, 'ΔT1': 10, 'ΔT2': 10 }).dStotal, b = cycle({ csb: 1, 'ΔT1': 30, 'ΔT2': 10 }).dStotal;
    expect(b).toBeGreaterThan(a);
    expect(a).toBeGreaterThan(0);
  });

  it('the snapshot settings give the numbers printed in the snapshot pictures', () => {
    const printed = {
      1: { performance: 'η = 0.41', W: '−518.', Qh: '−1250.', Qc: '732.', QH: '1250.', QC: '−732.', dSh: '−2.50', dSc: '2.66', dStotal: '0.16', TH: 490, TC: 287 },
      2: { performance: 'η = 0.4', W: '−498.', Qh: '−1250.', Qc: '752.', QH: '1250.', QC: '−752.', dSh: '−2.50', dSc: '2.73', dStotal: '0.23', TH: 474, TC: 285 },
      3: { performance: 'COP = 2.5', W: '236.', Qh: '836.', Qc: '−600.', QH: '−836.', QC: '600.', dSh: '2.57', dSc: '−2.18', dStotal: '0.39', TH: 333, TC: 239 },
    };
    for (const [k, want] of Object.entries(printed)) {
      const { view } = evaluate(golden.snapshots[k]);
      const { TH, TC, ...labels } = want;
      expect(view.labels, `snapshot ${k}`).toEqual(labels);
      expect([view.TH, view.TC]).toEqual([TH, TC]);
    }
  });

  it('the picture: the cycle, the arrows, the seven boxes and the labels', () => {
    const ids = [];
    const walk = (g) => { if (Array.isArray(g)) g.forEach(walk); else if (g?.head === 'Annotation') { ids.push(g.id); walk(g.g); } };
    walk(evaluate(initialState()).graphics);
    for (const id of ['cycle-circle', 'cycle-strokes', 'arrow-work', 'arrow-hot', 'arrow-cold', 'hot-reservoir', 'cold-reservoir',
      'box-work', 'box-performance', 'box-total', 'box-dSh', 'box-dSc', 'box-QH', 'box-QC', 'label-hot', 'label-cold', 'label-W',
      'label-performance', 'label-Th', 'label-Tc', 'label-TH', 'label-TC', 'label-Qh', 'label-Qc', 'label-QH', 'label-QC',
      'label-dSh', 'label-dSc', 'label-dStotal']) expect(ids, id).toContain(id);
  });

  it('the stroke heads: at 1/3, 2/3 and the end for the engine, backwards at 0, 1/3 and 2/3 for the pump', () => {
    const heads = (csb) => {
      let found = null;
      const walk = (g) => { if (Array.isArray(g)) g.forEach(walk); else if (g?.head === 'Annotation') { if (g.id === 'cycle-strokes') found = g.g; else walk(g.g); } };
      walk(evaluate({ csb, 'ΔT1': 10, 'ΔT2': 12 }).graphics);
      return found.find((d) => d?.dir === 'arrowheads').value;
    };
    expect(heads(1)).toEqual([[0.03, 1 / 3], [0.03, 2 / 3], [0.03, 1]]);
    expect(heads(2)).toEqual([[-0.03, 0], [-0.03, 1 / 3], [-0.03, 2 / 3]]);
  });
});

describe('corrected mode (E-CI)', () => {
  it('the heat pump label shows TH/(TH - TC); the work, heats and entropies are unchanged; the engine is unchanged', () => {
    const st = { csb: 2, 'ΔT1': 8, 'ΔT2': 36 };
    const o = evaluate(st).view, c = evaluate({ ...st, errata: 'corrected' }).view;
    expect(o.labels.performance).toBe('COP = 2.5');
    expect(c.labels.performance).toBe('COP = 3.5'); // 333/94 = 3.54
    expect(c.COPshown).toBeCloseTo(c.QH / c.W, 12); // the heat delivered to the hot side per unit of work
    const { performance: _a, ...restO } = o.labels, { performance: _b, ...restC } = c.labels;
    expect(restC).toEqual(restO);
    const e = { csb: 1, 'ΔT1': 10, 'ΔT2': 12 };
    expect(evaluate({ ...e, errata: 'corrected' }).view.labels).toEqual(evaluate(e).view.labels);
  });
});
