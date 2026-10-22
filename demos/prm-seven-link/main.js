// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Aaron T. Becker and Yitong Lu
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/prm-seven-link/main.js — the Manipulate: restart, movement and goal, the seven joint locators and the Graphics
// (status texts, workspace, obstacles, goal configuration, robot, joint glyphs), on shared/manipulate.js (browser only).
import { Manipulate, Locator, Button, None } from '../../shared/manipulate.js';
import {
  Annotation, Rectangle, Polygon, Line, Point, Disk, Text, Translate, EdgeForm, Directive, Thick, Thickness, PointSize,
  Opacity, CapForm, FontSize, GrayLevel, Darker, White, Black, Blue, Green, Red, Brown,
} from '../../shared/graphics.js';
import { addCheckbox } from '../../shared/ui-extra.js';
import { createBeeper } from '../../shared/beep.js';
import { mmaNumberString } from '../../shared/mma-extra.js';
import { initialState, evaluate, restart, OBS, ORIGIN, MIN_X, MIN_Y, MAX_X, MAX_Y, LOC_START, roundTenth } from './model.js';

const MID = (MIN_X + MAX_X) / 2;
// PointSize[Large]: measured on the original's snapshot as about 1.8 % of the plot width (D-SL-03)
const GOAL_POINT_SIZE = PointSize(0.018);
/** Locator[p] as a primitive: the default glyph with a grey ring (shared/svg-plot.js locatorGlyph as data, 17 px). */
const R = (17 / 2.4) * ((MAX_X - MIN_X) * 1.04 / 400); // ring radius in world units (world units per px: padded range / 400)
const HAIRS = [[-1.6, -0.45], [0.45, 1.6]].flatMap(([a, b]) => [[[a * R, 0], [b * R, 0]], [[0, a * R], [0, b * R]]]);
const jointGlyph = (p) => Translate([GrayLevel(0.25), [GrayLevel(0.75), Opacity(0.8), EdgeForm(GrayLevel(0.25)), Disk([0, 0], R)],
  CapForm('Butt'), Line(HAIRS)], p);
let beeps = 0;
// Beep[] as a short Web Audio tone; sound starts after the first press or key press on the page (F-SL-14, D-SL-02)
const beeper = createBeeper();
// port addition A-SL-07: mute the collision beep (a page preference: "Initial settings" leaves it as it is)
const muteCtl = addCheckbox({ controls: new Map() }, { // outside the Manipulate's controls, in the panel's tool bar
  name: 'mute', label: 'mute beep', value: false, parent: document.querySelector('.panel-tools'), onChange: (m) => beeper.setMuted(m),
});

Manipulate({
  name: 'prm-seven-link',
  initial: initialState,
  body: evaluate,
  draw: ({ og, worstError, success }, s) => [
    // Black, Style[Text[StringForm["`` collisions, worst error = ``", …]], Medium], If[success, Style[Text[…], Medium]]
    [FontSize(13), Annotation(Text(`${s.collisions} collisions, worst error = ${mmaNumberString(roundTenth(worstError), { isReal: true })}`, [MID, MAX_Y + 50]), 'status-text'),
      success && Annotation(Text(`Congratulations! You solved goal ${s.goal} in only ${s.collisions} collisions!`, [MID, MAX_Y + 20]), 'success-text')],
    // White, EdgeForm[Directive[Thick, Black]], Rectangle[{minX, minY}, {maxX, maxY}], Blue, Polygon[obs]
    White, EdgeForm(Directive(Thick, Black)), Annotation(Rectangle([MIN_X, MIN_Y], [MAX_X, MAX_Y]), 'workspace'),
    Blue, OBS.map((o, i) => Annotation(Polygon(o), `obstacle-${i + 1}`)),
    // PointSize[Large], {Opacity[6], Darker[Green], Line[og], Point[og]}
    [Darker(Green), Annotation(Line(og), 'goal-line'), GOAL_POINT_SIZE, og.map((p) => Point(p))],
    // Thickness[0.005], If[isCollide, Red, Brown], Line[Prepend[locOld, origin]]
    [Thickness(0.005), s.isCollide ? Red : Brown, Annotation(Line([ORIGIN, ...s.locOld]), 'robot')],
    // Locator /@ locOld (glyphs only; the draggable Manipulate locators are invisible, at loc)
    s.locOld.map(jointGlyph),
  ],
  // Graphics[…, ImageSize -> 400]; automatic PlotRange: x from the workspace (obstacle 4 starts at x = 16, 2 units left
  // of it — negligible, not reproduced), y up to the first text line at maxY + 50
  graphics: {
    PlotRange: [[MIN_X, MAX_X], [MIN_Y, MAX_Y + 50]], ImageSize: 400,
    label: 'Workspace with the seven-link robot (brown), the goal configuration (green) and the obstacles (blue)',
  },
  controls: [ // ControlPlacement -> Left
    // Button["restart", collisions = 0; isCollide = False; loc = locstart; locOld = locstart]
    Button('restart', (s, m) => { m.state = restart(s); }),
    // {movement, {"relative", "absolute"}, Enabled -> Dynamic[!isCollide]}
    [['movement', 'relative'], ['relative', 'absolute'], { Enabled: (s) => !s.isCollide }],
    [['goal', 1], [1, 2, 3, 4, 5, 6, 7]], // {goal, {1, …, 7}, ControlType -> Setter}
    // {{loc, locstart}, {18, 7}, {884, 884}, Locator, Appearance -> None}: one locator per joint, named loc-1 … loc-7
    [['loc', LOC_START.map((p) => [...p])], [MIN_X, MIN_Y], [MAX_X, MAX_Y], Locator, { Appearance: None }],
  ],
  // the joint locators keep their test ids locator-1 … locator-7 (the layer names a list's locators loc-1 … loc-7)
  locators: { keyStep: 5, testid: (n) => `locator-${n.slice(4)}`, describe: (n) => `joint ${n.slice(4)} locator; arrow keys move it` },
  after: (m) => {
    if (m.view.beep) { beeps++; beeper.beep(); } // Beep[] on a newly counted collision (F-SL-14)
  },
  hook: { // port addition A-SL-03
    beeps: () => () => beeps,
    /** tones actually started (not muted, audio available) and the audio state (F-SL-14, A-SL-07) */
    sounds: () => () => beeper.played,
    audio: () => () => ({ state: beeper.state, muted: beeper.muted, checkbox: muteCtl.get() }),
    /** move locator n (1..7) to world point p, as one front-end update */
    moveLocator: (m) => (n, p) => { m.moveLocator(`loc-${n}`, p); return window.__demo.getState(); },
  },
});
