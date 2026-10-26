# Manual checks — Steering Multiple Radio Control (RC) Cars with One Joystick (`demos/steering-rc-cars/`)

Each item compares the original in Mathematica with the port, as an operator procedure (owner rule R-B); the general
procedure is in [`docs/MATHEMATICA_CHECKS.md`](../MATHEMATICA_CHECKS.md). Record every result in the test-run file
`_internal\test-runs\<YYYY-MM-DD>_steering-rc-cars.md` (create it with `npm run test-run -- steering-rc-cars`).

Original notebook (all items): `_internal\originals\SteeringMultipleRadioControlRCCarsWithOneJoystick.nb`.
Port (all items): `http://127.0.0.1:8080/demos/steering-rc-cars/` (after `npm run serve`).

### M-SR-01 Texts
**Open** — `_internal\originals\SteeringMultipleRadioControlRCCarsWithOneJoystick.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing; scroll to the title.
**Do** —
1. Compare title, caption and Details with the port's.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_steering-rc-cars.md`, under the heading M-SR-01: per text: "same" or the differing words.
**Save** — File > Close, Don't Save.
**Port** — the page's caption, `details` and `credits`.
**Expected / what it decides** — identical texts (F-SR-14).

### M-SR-02 Opening picture
**Open** — `_internal\originals\SteeringMultipleRadioControlRCCarsWithOneJoystick.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — do not touch any control.
**Do** —
1. Compare the picture and every control's value with the port's opening page.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_steering-rc-cars.md`, under the heading M-SR-02: per difference: what, where.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — the same picture (four RC cars, their numbers and blue arrows, eight locators, the gray disks "1,3", "2,3", "3,4" and "2,4" at the same places, "1,2" just outside on the left) and the values n = 4, radius 0.143, mode setup, robot RC car, range 1, offset {0, 0} (F-SR-12).

### M-SR-03 Setup locators
**Open** — `_internal\originals\SteeringMultipleRadioControlRCCarsWithOneJoystick.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — mode setup.
**Do** —
1. Drag car 2 (its locator) a little to the right.
2. Drag the locator at the tip of car 2's arrow around car 2 by a quarter turn.
3. Drag car 1 and then its arrow's locator.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_steering-rc-cars.md`, under the heading M-SR-03: per step: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — a car's locator moves the car, its arrow locator follows at the same distance, the gray disks of its pairs move; an arrow locator turns the car and snaps back to the arrow; the disks move with it (F-SR-03, F-SR-04).

### M-SR-04 Running
**Open** — `_internal\originals\SteeringMultipleRadioControlRCCarsWithOneJoystick.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — mode setup, opening state.
**Do** —
1. Click **running**.
2. Drag the single locator about a quarter of the picture to the right and up; wait until the cars stop.
3. Drag it on along a curve, then wait.
4. Click **setup**.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_steering-rc-cars.md`, under the heading M-SR-04: per step: "same" or the difference (speed, paths, where the cars stop).
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — in running there is one locator, at car 1; dragging it drives car 1 toward it at about one unit per second and every other car along the same path turned by its heading difference; the paths are drawn in the cars' colours; the gray disks show where car 1 must be for two cars to collide (they do not move while driving); back in setup the cars stay where they stopped and eight locators return (F-SR-05…F-SR-08).

### M-SR-05 Each control
**Open** — `_internal\originals\SteeringMultipleRadioControlRCCarsWithOneJoystick.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing.
**Do** —
1. Move **n** from 2 to 10 (setup), **radius** from end to end, **range** from 1 to 2, and the **offset** pad to each corner.
2. Click **cell**, then **particle**, then **RC car**.
3. In running mode, try to move **n**.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_steering-rc-cars.md`, under the heading M-SR-05: per control: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — n makes n new random cars (random in both, D-SR-01) and n(n − 1)/2 disks; radius scales the cars and the disks; range zooms out (10^(range − 1)) and lengthens the arrows (10^(range/2)); offset shifts the view; the robot setter changes all pictures; n is disabled in running (F-SR-01, F-SR-02, F-SR-09…F-SR-11).

### M-SR-06 Initial settings
**Open** — `_internal\originals\SteeringMultipleRadioControlRCCarsWithOneJoystick.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — move every control away from its opening value.
**Do** —
1. ⊕ (top-right) > **Initial Settings**; on the port, **Initial settings**.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_steering-rc-cars.md`, under the heading M-SR-06: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — both show four new random RC cars in setup (not the opening cars) with radius 0.143, range 1, offset {0, 0} (A-SR-01, Q-SR-01).

### M-SR-07 The page works on its own
**Steps** — open the port's page; move every control once; drag every locator once; switch to running, drive, switch back; press **Initial settings**.
**Record** — anything that does not respond, or an error message on the page.
**Expected** — every control and locator changes the picture; the cars drive in running; Initial settings gives four new cars (A-SR-01).

### M-SR-08 Narrow window
**Steps** — make the browser window about 360 px wide (or use a phone); use every control.
**Record** — anything cut off, overlapping or not reachable.
**Expected** — the page stays usable; the picture scales down with the window.

### M-SR-09 Snapshots
**Open** — `_internal\originals\SteeringMultipleRadioControlRCCarsWithOneJoystick.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the review screenshots `test-output\review-screenshots\chromium\steering-rc-cars-snapshot-1…5.png` (made by `npx playwright test tests/e2e/steering-rc-cars.spec.js`) next to it.
**Prepare** — scroll to the Snapshots section of the notebook.
**Do** —
1. Compare each of the five snapshot pictures with the screenshot of the same number: cars, cells or particles, numbers, arrows, locators, gray disks and their labels.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_steering-rc-cars.md`, under the heading M-SR-09: per snapshot: "same" or the differences.
**Save** — File > Close, Don't Save.
**Port** — the review screenshots.
**Expected / what it decides** — the same pictures; the radius field shows 0.142857 where Mathematica shows 1/7 (N-SR-02) (F-SR-13).
