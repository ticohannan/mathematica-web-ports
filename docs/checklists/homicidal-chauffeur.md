# Manual checks — The Homicidal Chauffeur Problem (`demos/homicidal-chauffeur/`)

Each item compares the original in Mathematica with the port, as an operator procedure (owner rule R-B); the general
procedure is in [`docs/MATHEMATICA_CHECKS.md`](../MATHEMATICA_CHECKS.md). Record every result in the test-run file
`_internal\test-runs\<YYYY-MM-DD>_homicidal-chauffeur.md` (create it with `npm run test-run -- homicidal-chauffeur`).

Original notebook (all items): `_internal\originals\TheHomicidalChauffeurProblem.nb`.
Port (all items): `http://127.0.0.1:8080/demos/homicidal-chauffeur/` (after `npm run serve`).

### M-HC-01 Texts
**Open** — `_internal\originals\TheHomicidalChauffeurProblem.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing; scroll to the title.
**Do** —
1. Compare title, caption and Details with the port's.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_homicidal-chauffeur.md`, under the heading M-HC-01: per text: "same" or the differing words.
**Save** — File > Close, Don't Save.
**Port** — the page's caption, `details` and `credits`.
**Expected / what it decides** — identical texts, also the six equations and the three references (F-HC-14).

### M-HC-02 Opening picture
**Open** — `_internal\originals\TheHomicidalChauffeurProblem.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — do not touch any control.
**Do** —
1. Compare the picture and every control's value with the port's opening page.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_homicidal-chauffeur.md`, under the heading M-HC-02: per difference: what, where.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — the same picture (the pedestrian at the left under a locator, the red car with its yellow beams pointing up and right, a locator at its rear axle and one at its front, the two dashed turning circles, "pedestrian missed." at the top, "running time   0.0 s" at the bottom) and the values r<sub>min</sub> 3, v<sub>car</sub>/v<sub>pedestrian</sub> 2, mode setup (F-HC-11).

### M-HC-03 Setup locators
**Open** — `_internal\originals\TheHomicidalChauffeurProblem.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — mode setup.
**Do** —
1. Drag the pedestrian (its locator) a little down and left.
2. Drag the locator at the car's rear axle a few units down.
3. Drag the locator at the car's front around the car by a quarter turn, and far away from it.
4. Drag the pedestrian onto the car.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_homicidal-chauffeur.md`, under the heading M-HC-03: per step: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — the pedestrian follows its locator; the car follows its rear-axle locator with the same heading, the front locator going along; the front locator turns the car and snaps back to 2 units ahead of it, the turning circles turn with the car; on the car the text reads "pedestrian hit!" but nothing else happens (F-HC-04, F-HC-12).

### M-HC-04 Running
**Open** — `_internal\originals\TheHomicidalChauffeurProblem.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — mode setup, opening state.
**Do** —
1. Click **running**; watch the numbers above the car.
2. Drag the single locator to the left and keep moving it away from the car; watch the pedestrian and the car for about half a minute.
3. Stop moving the locator and wait until the car hits the pedestrian.
4. Click **running** again; then click **setup**.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_homicidal-chauffeur.md`, under the heading M-HC-04: per step: "same" or the difference (speeds, the countdown, the car's turns, the end).
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — running: one locator at the pedestrian, the paths cleared, the sliders disabled, a blue 3, 2, 1 countdown at the top for three seconds while the car waits; the pedestrian runs to the locator at about one unit per second with swinging arms and stands still facing right when there; the car then turns (at most on its dashed circles) away from or toward the pedestrian and leaves a red path; the hit stops everything with "pedestrian hit!", neither mode button pressed, the locator on the pedestrian and the running time at the bottom; running again hits at once (Q-HC-02); setup brings back three locators and keeps the paths (F-HC-05…F-HC-10).

### M-HC-05 Each control
**Open** — `_internal\originals\TheHomicidalChauffeurProblem.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing.
**Do** —
1. In setup move **r<sub>min</sub>** from end to end and **v<sub>car</sub>/v<sub>pedestrian</sub>** from end to end.
2. Click **running** and try to move both sliders.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_homicidal-chauffeur.md`, under the heading M-HC-05: per control: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — r<sub>min</sub> changes the dashed circles' radius (0.001 … 5), v<sub>car</sub>/v<sub>pedestrian</sub> changes nothing in the picture (1.1 … 5) until running; in running both are disabled (F-HC-01…F-HC-03).

### M-HC-06 Initial settings
**Open** — `_internal\originals\TheHomicidalChauffeurProblem.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — move every control and locator away from its opening value; click **running**.
**Do** —
1. ⊕ (top-right) > **Initial Settings**; on the port, **Initial settings**.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_homicidal-chauffeur.md`, under the heading M-HC-06: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — both return to the opening picture in setup and stop the run (A-HC-01).

### M-HC-07 The page works on its own
**Steps** — open the port's page; move every control once; drag every locator once; switch to running, play until the car hits the pedestrian, switch back; press **Initial settings**.
**Record** — anything that does not respond, or an error message on the page.
**Expected** — every control and locator changes the picture; the game runs in real time; Initial settings restores the opening picture (A-HC-01).

### M-HC-08 Narrow window
**Steps** — make the browser window about 360 px wide (or use a phone); use every control.
**Record** — anything cut off, overlapping or not reachable.
**Expected** — the page stays usable; the picture scales down with the window.

### M-HC-09 Snapshots
**Open** — `_internal\originals\TheHomicidalChauffeurProblem.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the review screenshots `test-output\review-screenshots\chromium\homicidal-chauffeur-snapshot-1…5.png` (made by `npx playwright test tests/e2e/homicidal-chauffeur.spec.js`) next to it.
**Prepare** — scroll to the Snapshots section of the notebook.
**Do** —
1. Compare each of the five snapshot pictures with the screenshot of the same number: paths, car, pedestrian, turning circles, locators, the two texts and the controls.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_homicidal-chauffeur.md`, under the heading M-HC-09: per snapshot: "same" or the differences.
**Save** — File > Close, Don't Save.
**Port** — the review screenshots.
**Expected / what it decides** — the same pictures and texts ("running time   0.0 s", "23.8", "26.9", "6.2", "10.7"; "pedestrian hit!" in 2 and 4), no mode button pressed in 2 to 5 (Q-HC-06); the r<sub>min</sub> field shows "5" where Mathematica shows "5." in 4 and 5 (K-HC-01) (F-HC-13).

### M-HC-10 Speed and feel
**Open** — `_internal\originals\TheHomicidalChauffeurProblem.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it, on a display of 60 Hz.
**Prepare** — opening state in both; v<sub>car</sub>/v<sub>pedestrian</sub> 2.
**Do** —
1. Click **running** in both at the same moment; keep the pedestrian's locator about five units to the left of the pedestrian.
2. Compare by eye the countdown's pace, the pedestrian's speed, the arms' swing and the car's speed and turns.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_homicidal-chauffeur.md`, under the heading M-HC-10: "same" or what feels different.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — the same pace in real time: one second per countdown number, the pedestrian about one unit per second, the arms swinging about three times per second, the car twice as fast as the pedestrian; the paths of the port are smoother (one point per frame) (F-HC-06, F-HC-07, N-HC-01, D-HC-02).
