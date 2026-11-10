// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Shiva Shahrokhi and Aaron T. Becker
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/wall-friction/errata-mode.js — what the switch "errors of the original: corrected" changes in this app
// (shared/errata.js; DESIGN.md §11). Shown on the page and in docs/CORRECTED_MODE.md.
export const CORRECTIONS = [
  {
    id: 'E-WF-01',
    original: 'when two markers are dropped closer than ϵ and robot 2 cannot be moved away (it is at the edge of the workspace), a missing semicolon in the code skips the intended step: robot 1 is always put at distance ϵ from robot 2 toward the centre of the workspace.',
    corrected: 'robot 1 is moved straight away from robot 2 to distance ϵ; only if that would leave the workspace is it put toward the centre. Both modes keep the spacing ϵ.',
  },
];
