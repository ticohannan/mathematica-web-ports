// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Yitong Lu
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/prm-3d/errata-mode.js — what the switch "errors of the original: corrected" changes in this app
// (shared/errata.js; DESIGN.md §11). Shown on the page and in docs/CORRECTED_MODE.md.
export const CORRECTIONS = [
  { id: 'E-P3-01', original: 'the search named A* adds the distance of a node to itself (always 0) as its estimate, so it is Dijkstra\'s algorithm.', corrected: 'the estimate is the distance from the node to the goal (A*). The path found has the same length; between equally short paths another one may be drawn.' },
  { id: 'E-P3-03', original: 'a start or goal that is in collision still gets a direct "path" to a configuration closer than the connection radius (the direct test comes before the collision tests and never tests its end points).', corrected: 'a direct path needs a start and a goal that are not in collision; otherwise "No path possible" is shown.' },
];
