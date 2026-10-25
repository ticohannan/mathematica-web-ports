// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Shiva Shahrokhi
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/four-bar-linkage/main.js — the Manipulate: separation slider, link-lengths interval slider, the locator and the
// two pictures of Row[{configuration space, linkage}] as Graphics data, on shared/manipulate.js (browser only).
import { Manipulate, Locator, None, IntervalSlider } from '../../shared/manipulate.js';
import { Style, Subscript, Row, Italic } from '../../shared/graphics.js';
import {
  useRecordedSamples, initialSettings, evaluate, fromSettings, CS_RANGE, LINKAGE_RANGE, IMAGE_SIZE, SPACING_SLIDER, LINKS_SLIDER,
} from './fourbar.js';

const copy = (x) => JSON.parse(JSON.stringify(x));

// ---- start: the original's recorded samples (§6.3), then the Manipulate -------------------------------------------
fetch('./recorded-samples.json').then((r) => {
  if (!r.ok) throw new Error(`recorded-samples.json: HTTP ${r.status}`);
  return r.json();
}).then((table) => {
  useRecordedSamples(table);
  const L = (k) => Subscript(Style('L', Italic), k);
  const m = Manipulate({
    name: 'four-bar-linkage',
    initial: initialSettings, // the live state = snapshot 1's Settings (F-FB-13)
    body: evaluate, // { state, view, graphics: Row[{Show[plot, Graphics[{Locator[pnear]}]], Graphics[…]}] (fourbar.js) }
    graphics: [
      { PlotRange: CS_RANGE, ImageSize: IMAGE_SIZE, PlotRangePadding: 0, id: 'cspace', testid: 'cspace-svg', label: 'Configuration space: the angles (θ, φ) the linkage can take' },
      // PlotRange -> {{-1.25, 2}, {-1.5, 1.5}}, explicit: no padding, everything outside is cut (snapshot 1: the blue circle at x −1.25)
      { PlotRange: LINKAGE_RANGE, ImageSize: IMAGE_SIZE, PlotRangePadding: 0, id: 'linkage', testid: 'linkage-svg', label: 'The four-bar linkage in the selected configuration' },
    ],
    controls: [
      ['pnear', null, None], ['plot', null, None], ['pvals', null, None],
      // {{p, {-.9, -1}}, Locator, Appearance -> None}: invisible, in the configuration-space plot. PORT DEVIATION (D-FB-07):
      // LocatorPane picking; p limited to the plot range [-π, π]² (K-FB-07); one evaluation per frame while dragging (D-FB-06)
      [['p', [-0.9, -1]], [-Math.PI, -Math.PI], [Math.PI, Math.PI], Locator, { Appearance: None }],
      [['spacingOld', -1], None], [['linksOld', [-1, -1]], None],
      // {{spacing, 0.75, Row[{"separation (", Subscript[Style["L", Italic], 4], ")"}]}, 0, 1.5, .05, ImageSize -> 180, Appearance -> "Labeled"}
      [['spacing', 0.75, Row(['separation (', L(4), ')'])], SPACING_SLIDER.min, SPACING_SLIDER.max, SPACING_SLIDER.step,
        { Appearance: 'Labeled', label: 'separation (L4)' }], // label: the plain text (aria-label) as before
      // {{links, {1.35, 2}, Row[{"link lengths (", L1, ",", L2, ",", L3, ")"}]}, 0, 2.49, 0.05, ControlType -> IntervalSlider,
      //  Method -> "Push", MinIntervalSize -> 0.1, Appearance -> "Labeled", ImageSize -> {300, 20}}
      [['links', [1.35, 2], Row(['link lengths (', L(1), ',', L(2), ',', L(3), ')'])], LINKS_SLIDER.min, LINKS_SLIDER.max, LINKS_SLIDER.step, {
        ControlType: IntervalSlider, Method: 'Push', MinIntervalSize: LINKS_SLIDER.minIntervalSize, Appearance: 'Labeled',
        label: 'link lengths (L1,L2,L3)', trackPress: true, look: 'mma', // the snapshots' colours (D-FB-05)
      }],
    ],
    locators: { describe: () => 'configuration locator (θ, φ); arrow keys move it' },
    hook: { // port addition A-FB-03
      view: (v, s) => ({
        lenlengths: v.lenlengths, impossibleLinks: v.impossibleLinks, Thetav: v.Thetav, Phiv: v.Phiv, Alpha: v.Alpha,
        resampled: v.resampled, crankTip: v.linkage.crankTip, couplerEnd: v.linkage.couplerEnd, rockerTip: v.linkage.rockerTip,
        lines: s.plot.lines.map((c) => c.map((x) => x.length)), text: s.plot.text, linksText: m.controls.get('links').text(),
      }),
      getState: (ctx) => () => copy({ ...ctx.state, plot: undefined, pvalsCount: ctx.state.pvals.length }),
      /** every sample point Flatten[pvals, 1] in record order */
      samples: (ctx) => () => copy(ctx.state.pvals.flat(1)),
      /** move the locator p to (θ, φ), as one front-end update */
      moveLocator: (ctx) => (p) => { ctx.moveLocator('p', p); return copy(ctx.state.pnear); },
      /** assign Manipulate variables (a snapshot's Settings may be passed whole); linksExact: exactness of the shown links */
      setState: (ctx) => (partial, { linksExact } = {}) => {
        const p = copy(partial);
        ctx.setState(p.plot && (p.plot.head || p.plot.h) ? fromSettings({ ...ctx.state, ...p }) : p, { moved: true, exact: linksExact });
      },
      linkageToClient: (ctx) => (p) => ctx.plots[1].worldToClient(p),
    },
  });
}).catch((e) => {
  const n = document.createElement('div');
  Object.assign(n, { className: 'requirements-notice', textContent: `This demonstration could not start: ${e.message}` });
  n.dataset.testid = 'requirements-notice';
  document.getElementById('cspace').append(n);
  throw e;
});
