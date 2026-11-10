// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Shreyas Poyrekar, Aaron T. Becker and Arifa Sultana
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/motion-planning/errata-mode.js — what the switch "errors of the original: corrected" changes in this app
// (shared/errata.js; DESIGN.md §11). Shown on the page and in docs/CORRECTED_MODE.md.
export const CORRECTIONS = [
  {
    id: 'E-MP-01',
    original: 'the search named A* adds the distance of a vertex to itself (always 0) as its estimate, so it is Dijkstra\'s algorithm.',
    corrected: 'the estimate is the straight distance from the vertex to the goal (A*). The path has the same length; between equally short routes another one may be drawn.',
  },
  {
    id: 'E-MP-02',
    original: 'in the rotational sweep, two vertices on one ray from the sweep point are ordered by comparing a distance with an angle.',
    corrected: 'on the same ray the nearer vertex comes first. Visibility lines can change only in scenes with such collinear vertices.',
  },
  {
    id: 'E-MP-03',
    original: 'the test "is the segment from a collinear previous vertex blocked?" is written with the wrong argument shape and never runs: the vertex behind it simply inherits the previous answer.',
    corrected: 'the test runs: a vertex behind a collinear one is visible only when no edge crosses the segment between them.',
  },
  {
    id: 'E-MP-04',
    original: 'the clockwise angle used by the sweep is forced to 0 whenever the two directions agree in one coordinate (for example a vertex at exactly the height of the sweep point).',
    corrected: 'the angle is 0 only for equal directions. Visibility lines can change where a vertex and the start, goal or another vertex share an <i>x</i> or a <i>y</i> coordinate exactly.',
  },
  {
    id: 'E-MP-06',
    original: 'a line that passes exactly through corners of a grown obstacle, or along contacts, is never counted as blocked: when start and goal line up with two corners of an obstacle the path goes straight through it (scene B1: length 4.00).',
    corrected: 'the straight start–goal line and every line of the graph are also tested against the interiors of all grown obstacles and dropped when they pass through one; touching a corner or running along an edge stays allowed. The path goes around the obstacle (scene B1: 4.36), or "No path exists." is shown.',
  },
];
