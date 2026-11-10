// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Shiva Shahrokhi
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/four-bar-linkage/errata-mode.js — what the switch "errors of the original: corrected" changes in this app
// (shared/errata.js; DESIGN.md §11). Shown on the page and in docs/CORRECTED_MODE.md.
export const CORRECTIONS = [
  {
    id: 'E-FB-01',
    original: 'the test "a link is longer than the other three together" compares <i>L</i><sub>3</sub> with <i>L</i><sub>1</sub> + <i>L</i><sub>2</sub> + <i>L</i><sub>3</sub>, which is never true: a too-long <i>L</i><sub>3</sub> is not reported and the old curve stays.',
    corrected: '<i>L</i><sub>3</sub> is compared with <i>L</i><sub>1</sub> + <i>L</i><sub>2</sub> + <i>L</i><sub>4</sub>: a too-long <i>L</i><sub>3</sub> shows "invalid link lengths, no configuration possible", and <i>L</i><sub>3</sub> = <i>L</i><sub>1</sub> + <i>L</i><sub>2</sub> + <i>L</i><sub>4</sub> shows the single configuration (π, π).',
  },
  {
    id: 'E-FB-02',
    original: 'where the two solution branches meet (γ² = α² + β²) no angle is returned, so the turning and bifurcation points are missing from the curves.',
    corrected: 'the single solution φ = arctan(α, β) at these points is kept. This shows only when a sample of the curve falls exactly on such a point; the curves are sampled by the port itself in this mode (the samples recorded from the original for the four snapshot settings are not used), so their points can differ slightly from the original\'s.',
  },
];
