# Checking the originals in Mathematica — operator procedure

This is the general procedure for every manual check that involves an original Wolfram notebook (owner rule R-B,
[`DESIGN_PROCESS.md`](DESIGN_PROCESS.md) rule 8). The checklist items in
[`MANUAL_TEST_CHECKLIST.md`](MANUAL_TEST_CHECKLIST.md) and [`checklists/`](checklists/) say WHAT to do, under the fixed
headings **Open**, **Prepare**, **Do**, **Record**, **Save**, **Port**, **Expected / what it decides**; this page says
HOW, once, so that someone who has never seen the project can follow the items. Every item still names its notebook
file and every control it uses.

Paths in this page are relative to the repository folder (the folder that contains `package.json`) and written the
Windows way (`_internal\originals\…`). `_internal\` is private and git-ignored: nothing in it is ever published.

## 1. What you need

- **Mathematica 15.0.1** on Windows (Help > About Wolfram Mathematica shows the version). With another version,
  carry on and write the version into the test-run file.
- **The original notebooks** in `_internal\originals\` and `_internal\originals\batch-ab\` (list in §12).
- **The test-run file** of the app and day (§2).
- **Node.js** (LTS, with npm; <https://nodejs.org>) and `npm install` run once in the repository folder: it is needed
  already for §2 (`npm run test-run` makes the test-run file) and for the **Port** step (local server, §10). Without
  Node.js you can make the test-run file by hand (§2, last paragraph), but the **Port** step still needs a local server.
- For the **Port** step: a browser (Firefox unless the item says otherwise), see §10.

## 2. Before you start: create the test-run file

Results go into one file per app and day, `_internal\test-runs\<YYYY-MM-DD>_<dir>.md` (`<dir>` = the app's folder
name under `demos\`, e.g. `car-paths`). Create it from the template, in a Command Prompt in the repository folder:

```bat
npm run test-run -- car-paths
```

This writes `_internal\test-runs\<today>_car-paths.md` with a heading, the **Record** instructions and empty result
fields for every `M-…` item of that app (`npm run test-run -- general` for the `M-GEN-…` items). It never overwrites
an existing file; to continue a file of the same day, just open it again. Open the file in any text editor
(Notepad is fine) and fill in the header lines first: tester, date, Mathematica version, operating system, port
version (`git log -1 --oneline`), browser and version.

Without Node.js: create the file `_internal\test-runs\<YYYY-MM-DD>_<dir>.md` in a text editor yourself — first the
header lines above (one per line), then for every item of `docs\checklists\<dir>.md` (its `### M-…` headings, in
order) this block, with the item's ID and title and its **Record** text copied from the checklist:

```
---

## M-XX-nn  <title of the item>

Record: <the item's Record text>

Original:
Port:
Result: [ ] PASS  [ ] FAIL  [ ] UNSURE
Notes:
```

This is the layout `npm run test-run` writes, so the file reads the same either way.

## 3. Opening a notebook (the **Open** step)

1. Start Mathematica 15.0.1 (Start menu > Wolfram Mathematica 15.0). A Welcome Screen may appear; leave it open
   or close it, it does not matter.
2. Choose **File > Open…**, go to the repository folder, then to the folder the item names (e.g.
   `_internal\originals\`), select the file the item names and click **Open**. (You can also paste the whole path
   into the "File name" field.)
3. If a **yellow bar** appears at the top of the notebook window saying that the notebook contains dynamic content
   (or "Dynamic content is disabled") with a button **Enable Dynamics**, click that button. If no bar appears,
   dynamics are already enabled.
4. If a dialog asks **"Do you want to automatically evaluate all the initialization cells in the notebook?"**, click
   **No**, unless the item says otherwise. Write in the test-run file that the question appeared.
5. Find the **Manipulate panel**: the framed panel with controls (sliders, buttons) and a picture, with a small ⊕
   at its top right. In the newer notebooks (`Demonstration-…-definition.nb`) it is under the heading
   **Manipulate**; in the `…-author.nb` notebooks it is the first output in the notebook. Scroll there with the
   mouse wheel. Use this first panel; the pictures further down (section "Snapshots") are the authors' stored
   examples, not live controls, unless an item names one.
6. Wait until the panel shows its picture (§7). A grey box, "$Aborted" or a pink box: see §9.

**Never evaluate a cell** unless the item says so: do not press Shift+Enter, do not use the Evaluation menu, do not
type into the notebook. If you typed something by accident, press Ctrl+Z (Edit > Undo). Typing into a control's
own value field (§4) is not evaluating a cell and is allowed when the item asks for it.

## 4. Controls, the ⊕ menu and Initial Settings (the **Prepare** step)

- **The panel's ⊕ menu**: the small circled plus in the TOP RIGHT corner of the Manipulate panel. Click it; a menu
  opens with, among others, **Initial Settings** (puts every control and locator back to the notebook's stored
  initial values), **Add To Bookmarks**, **Paste Snapshot**, **Autorun**, and — in notebooks that have bookmarks,
  such as the Euler angles — the bookmark names (pos0, pos1, …) and **Animate Bookmarks**. "⊕ > Initial Settings"
  in an item means: click the ⊕, then click Initial Settings.
- **A slider's own +** (also drawn as a small ⊕ or ⊞ just right of a slider): opens that slider's animation panel
  under the slider, with a value field, play ▶ / pause, step back |◀ / step forward ▶|, faster/slower and direction
  buttons. Click it again to close the panel.
- **Value fields**: sliders shown "Labeled" have a number to their right (or in the animation panel). To set an
  exact value: click into the field, select everything (Ctrl+A), type the value as the item gives it (e.g. `0.14`,
  `1/4`, `Pi`), press Enter.
- **Setter bars** (a row of buttons such as `1 2 3 … 8` or `Reeds–Shepp | Dubins`): click the button with that
  label; the pressed one looks sunken/white. **Checkboxes**: click the box. **Popup menus** (a box with arrows,
  such as "elbow robot arm"): click it, then click the entry.
- **2D slider pads** (a square with a cross-hair, e.g. "blue_xy"): drag the thumb inside the square.

## 5. Locators, also invisible ones

A locator is a point of the picture that you drag with the left mouse button (positions of robots, cars, guards,
joints, start and goal). Two kinds:

- **Visible locators** are drawn as a small circle with a cross (a target), or as a coloured icon of that shape.
- **Invisible locators** (`Appearance -> None` in the code) are not drawn at all; often a car, a disk or a joint
  glyph is drawn at the same place, sometimes nothing. Each item says where they are, in the picture's coordinates
  and by a landmark.

Mathematica sends a press anywhere in the picture to the NEAREST locator (LocatorPane rule): pressing on empty space
makes the nearest locator jump there. To find out whether a press grabbed a locator, press, move the mouse a few
pixels, and watch whether the picture changes; then release. "Drag X to (a, b)" means: press on X, move to the place
with those coordinates (read them from the axes, or from the landmarks the item gives), release. "Slowly" means about
1 cm per second on the screen; "quickly" means the whole movement in under half a second. Distances "in pixels" are
screen pixels; at 100 % display scaling 1 cm on a typical monitor is about 40 pixels.

## 6. Doing the actions (the **Do** step)

Follow the numbered actions in order, one at a time, and after each one wait until the picture has settled (§7)
before you look or record. Watch what the action says to watch. If an action is impossible (a control is greyed
out, a locator cannot be found), write that into the test-run file and go on with the next action.

## 7. How long to wait

- After each action, wait until the picture stops changing. Most apps answer in under a second.
- Longer computations: the probabilistic-roadmap apps after "add 50 vertices", "add 100 vertices", a radius change or
  an obstacle move (up to 30 s), the robot-arm phase space with "show obstacles" ticked (up to 10 s), the unit balls
  in 3D (up to 5 s). While the kernel is busy the notebook window's title shows "Running…" and the cell bracket at
  the right edge is highlighted.
- If nothing happens within 30 s, or "$Aborted" appears in the picture: write it down with the action that caused
  it, then continue with the next action (§9).
- For animations ("play", "Animate Bookmarks"), watch for at least 10 s unless the item says otherwise.

## 8. Recording results (the **Record** step)

- Write into `_internal\test-runs\<YYYY-MM-DD>_<dir>.md`, under the item's heading, exactly what the item's
  **Record** step asks for: numbers with all the digits shown on screen, texts copied letter for letter (including
  capitals and the number of decimals, e.g. `0.` versus `0`), colours by name (red, light blue, …), yes/no answers.
- Fill in the lines **Original:** and **Port:** separately, then tick one result box: replace `[ ]` by `[x]` in
  `PASS` (original and port agree as expected), `FAIL` (they differ, or the expected result does not appear) or
  `UNSURE`. A difference is worth recording even when you are not sure it is a fault.
- Screenshots: Win+Shift+S, select the area, paste into Paint, save as
  `_internal\test-runs\<YYYY-MM-DD>_<dir>_<item>_<what>.png` (e.g. `2026-10-18_car-paths_M-CP-02_original.png`)
  and write the file name under the item.
- Do not record anything personal (no user names, no folder names outside the repository).

## 9. Saving or not (the **Save** step) and what to do on errors

- **Default: File > Close, then "Don't Save"** when Mathematica asks whether to save the changes. The downloaded
  originals in `_internal\originals\` and `_internal\originals\batch-ab\` must stay exactly as downloaded (their
  SHA-256 checksums are listed in `tools/harness/apps.mjs`).
- **When an item asks to keep the state as golden data:** File > Save As…, go to `_internal\originals\saved\`
  (create the folder if it does not exist), file name `<dir>_<item>_<YYYY-MM-DD>.nb`, e.g.
  `car-paths_M-CP-06_2026-10-18.nb`, type "Notebook (*.nb)", click Save; then File > Close. If that name exists
  already, add `_2`, `_3`. Never save into `_internal\originals\` or `_internal\originals\batch-ab\` and never
  over a downloaded file. If that happened by mistake, write it into the test-run file; the owner downloads the
  original again.
- **When an item asks you to evaluate something** (rare; the item says so explicitly): first make a working copy
  with File > Save As… as above, so the original stays untouched. In the working copy run Evaluation > Evaluate
  Initialization Cells (wait until "Running…" disappears), click below the last cell of the notebook (a horizontal
  insertion line appears), type the input exactly as the item gives it, press Shift+Enter, and copy the output into
  the test-run file (right-click the output > Copy As > Plain Text, then paste). Then File > Save and File > Close.
- **If the notebook asks to update or convert itself** (a dialog or bar mentioning an older version, "Update", or
  "Convert"): choose the option that leaves the file unchanged (No / Cancel / Don't Update) and write the exact
  message into the test-run file. If the notebook cannot be used without updating, update, never save it, and write
  that down.
- **If the notebook shows errors**: a pink or red-framed box in the picture, "$Aborted", red text, or messages such as
  `Part::partw` (they may also appear in Window > Messages). Copy the exact text into the test-run file with the
  action that caused it. Do not evaluate anything to repair it unless the item says how (some items name
  Evaluation > Evaluate Initialization Cells as the remedy).
- **If Mathematica hangs**: Evaluation > Abort Evaluation (Alt+.), wait 10 s; if it still hangs, Evaluation > Quit
  Kernel > Local, then File > Close, Don't Save, and open the notebook again. Write down what happened.

## 10. The same actions in the port (the **Port** step)

1. In a Command Prompt in the repository folder: `npm run serve` (leave the window open).
2. In the browser open `http://127.0.0.1:8080/demos/<dir>/` (e.g. `http://127.0.0.1:8080/demos/car-paths/`). The
   published site `https://ticohannan.github.io/mathematica-web-ports/demos/<dir>/` works too; write down which one
   you used.
3. The port's controls carry the same labels as the original's. The port's **Initial settings** button (under the
   controls) does what ⊕ > Initial Settings does in the original; each slider's small ⊕ opens the same kind of
   animation panel. Locators work by the same nearest-locator rule; a focused locator can also be moved with the
   arrow keys.
4. Do the actions the item lists and record what the port shows in the **Port:** line.

## 11. Sending results back

When you are done (or when something failed — failures are the most useful results), zip the test-run files and any
saved notebooks. In a Command Prompt in the repository folder:

```bat
tar -a -c -f "%USERPROFILE%\Desktop\test-runs-<YYYY-MM-DD>.zip" _internal\test-runs _internal\originals\saved
```

(Leave out `_internal\originals\saved` if you saved nothing.) Attach the zip file to your message in a new session
or e-mail. The files stay private: `_internal\` is never published.

## 12. Where the original notebooks are

The first ten apps (in `_internal\originals\`):

| App (`demos\<dir>`) | Notebook |
|---|---|
| `motion-planning` | `_internal\originals\MotionPlanningForRobotPathAroundObstacles-author.nb` |
| `three-parametrizations` | `_internal\originals\ThreeParametrizationsOfRotations-author.nb` |
| `euler-angles` | `_internal\originals\EulerAnglesPrecessionNutationAndSpin-author.nb` |
| `prm-seven-link` | `_internal\originals\Demonstration-Probabilistic-Roadmap-Method-with-Seven-Link-Articulated-Robot-1-0-0-definition.nb` |
| `car-paths` | `_internal\originals\Demonstration-Shortest-Path-for-Forward-and-Reverse-Motion-of-a-Car-1-0-0-definition.nb` |
| `unit-balls` | `_internal\originals\Demonstration-Unit-Balls-for-Different-p-Norms-in-2D-and-3D-1-0-0-definition.nb` |
| `art-gallery` | `_internal\originals\Demonstration-Art-Gallery-Problem-1-0-0-definition.nb` |
| `prm` | `_internal\originals\Demonstration-Probabilistic-Roadmap-Method-2-0-0-definition.nb` |
| `prm-robot-arm` | `_internal\originals\Demonstration-Probabilistic-Roadmap-Method-for-Robot-Arm-2-0-0-definition.nb` |
| `robot-singularities` | `_internal\originals\Demonstration-Robot-Singularities-in-Three-Link-Manipulators-1-0-0-definition.nb` |

The three `…-author.nb` file names are those under which the author notebooks were given to the project; the seven
`Demonstration-…-definition.nb` names are the ones `tools/harness/apps.mjs` expects (with their checksums). An older
download of the seven may carry a shorter name without `Demonstration-` and `-1-0-0`/`-2-0-0` (e.g.
`Art-Gallery-Problem-definition.nb`, downloaded 2026-10-05); if your folder only has such a file, use it and write
its name into the test-run file.

The sixteen notebooks of batch A/B (in `_internal\originals\batch-ab\`, names as in `tools/harness/apps.mjs`):
`Demonstration-Minkowski-Sum-of-Convex-Robot-and-Obstacle-1-0-0-definition.nb`,
`Demonstration-Configuration-Space-for-Four-Bar-Linkage-1-0-0-definition.nb`,
`Demonstration-Shortest-Path-for-the-Dubins-Car-2-0-0-definition.nb`,
`Demonstration-Isochrons-for-a-Dubins-Car-1-0-0-definition.nb`,
`Demonstration-Forward-and-Inverse-Kinematics-for-Two-Link-Arm-1-0-0-definition.nb`,
`Demonstration-Distance-Norms-in-Robot-Workspace-and-Phase-Space-1-0-0-definition.nb`,
`Demonstration-Robot-Motion-with-Obstacles-1-0-0-definition.nb`,
`Demonstration-Breadth-First-Search-Robot-Motion-Planning-1-0-0-definition.nb`,
`Demonstration-Rapidly-Exploring-Random-Tree-RRT-and-RRT-1-0-0-definition.nb`,
`Demonstration-Measuring-Distance-and-Orientation-Using-Camera-and-Lasers-1-0-0-definition.nb`,
`Demonstration-Manipulability-Ellipsoid-of-a-Robot-Arm-1-0-0-definition.nb`,
`Demonstration-Denavit-Hartenberg-Parameters-for-a-Three-Link-Robot-1-0-0-definition.nb`,
`Demonstration-Common-Robot-Arm-Configurations-1-0-0-definition.nb`,
`Demonstration-Robot-Manipulator-Workspaces-1-0-0-definition.nb`,
`Demonstration-Chart-for-a-Torus-1-0-0-definition.nb`,
`Demonstration-Probabilistic-Roadmap-Method-in-3D-1-0-0-definition.nb`.

Saved states (owner states, golden data) go to `_internal\originals\saved\` (§9). An owner state saved before this
procedure existed (e.g. the seven-link game with 132 collisions of 2026-10-06) is used by an item under the name the
item gives; copy it there under that name first if it is kept elsewhere.
