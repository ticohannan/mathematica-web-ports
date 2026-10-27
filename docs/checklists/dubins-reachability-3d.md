# Manual checks — 3D Reachability Set for a Dubins Car (`demos/dubins-reachability-3d/`)

Each item compares the original in Mathematica with the port, as an operator procedure (owner rule R-B); the general
procedure is in [`docs/MATHEMATICA_CHECKS.md`](../MATHEMATICA_CHECKS.md). Record every result in the test-run file
`_internal\test-runs\<YYYY-MM-DD>_dubins-reachability-3d.md` (create it with `npm run test-run -- dubins-reachability-3d`).

Original notebook (all items): `_internal\originals\3DReachabilitySetForADubinsCar.nb`.
Port (all items): `http://127.0.0.1:8080/demos/dubins-reachability-3d/` (after `npm run serve`).

### M-D3-01 Texts
**Open** — `_internal\originals\3DReachabilitySetForADubinsCar.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing; scroll to the title.
**Do** —
1. Compare title, caption and Details with the port's.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_dubins-reachability-3d.md`, under the heading M-D3-01: per text: "same" or the differing words.
**Save** — File > Close, Don't Save.
**Port** — the page's caption, `details` and `credits`.
**Expected / what it decides** — identical texts, including "until t τ₁" for the second command (E-D3-01) (F-D3-17).

### M-D3-02 Opening picture
**Open** — `_internal\originals\3DReachabilitySetForADubinsCar.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — do not touch any control.
**Do** —
1. Compare the picture and every control's value with the port's opening page.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_dubins-reachability-3d.md`, under the heading M-D3-02: per difference: what, where.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — the 3D set as snapshot 1 (blue LSL on the left, green RSL and orange RSR on the right, the orange sphere below the front of the green surface, ticks −5, 0, 5 on x, −5 … 10 on y, 0 and 5 on θ) and the values dimension 3D, r 1.8, t 10, path type RSR, switching times 0.5 and 0.75, path progress 100 (F-D3-14).

### M-D3-03 Each control
**Open** — `_internal\originals\3DReachabilitySetForADubinsCar.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — nothing.
**Do** —
1. Move **r** from 0.5 to 10 and **t** from 0.1 to 14, slowly, in 3D; then the same in 2D (click **2D**).
2. In 2D, choose each **path type**, move both ends of **switching times τ** (drag the lower end past the upper one) and move **path progress** from 100 to 0.
3. Click **3D** and repeat step 2.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_dubins-reachability-3d.md`, under the heading M-D3-03: per control: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — r and t reshape the set (larger r: a thinner, lower spiral; larger t: a larger set) and the 2D picture; the path type changes the car's path, its colour and the sphere; dragging one end of τ past the other pushes it along (Method Push); path progress moves the car back along its path to the start car, and the sphere along the path in 3D (F-D3-01…F-D3-06, F-D3-13).

### M-D3-04 Initial settings
**Open** — `_internal\originals\3DReachabilitySetForADubinsCar.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — move every control away from its opening value.
**Do** —
1. ⊕ (top-right) > **Initial Settings**; on the port, **Initial settings**.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_dubins-reachability-3d.md`, under the heading M-D3-04: "same" or the difference.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — both return to the opening picture: the 3D set with r 1.8, t 10, RSR, τ {0.5, 0.75}, p 100 (A-D3-01).

### M-D3-05 The page works on its own
**Steps** — open the port's page; move every control once; switch the dimension twice; turn the 3D picture by dragging it; press **Initial settings**.
**Record** — anything that does not respond, or an error message on the page.
**Expected** — every control changes the picture; the 3D picture turns; Initial settings restores the opening picture (A-D3-01).

### M-D3-06 Turning the 3D set
**Open** — `_internal\originals\3DReachabilitySetForADubinsCar.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — the opening state (3D).
**Do** —
1. Drag the 3D picture slowly to turn it about a quarter turn to the left, then tilt it to look from below.
2. Move **path progress** once while it is turned.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_dubins-reachability-3d.md`, under the heading M-D3-06: per step: "same" or the difference (colours and highlights of the surfaces, the box edges where the surfaces cover them, whether the view stays).
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — the six surfaces keep their colours and white highlights while turning (lights fixed to the view), the box edges stay hidden behind the surfaces, the curves show as coloured seams between the surfaces; whether Mathematica keeps the turned view when path progress moves is recorded (the port keeps it) (F-D3-12, F-D3-16, D-D3-03, D-D3-07).

### M-D3-07 The 2D picture and the car
**Open** — `_internal\originals\3DReachabilitySetForADubinsCar.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the port's page next to it.
**Prepare** — click **2D**; path type RSL, switching times 0.17 and 0.52 (as snapshot 2).
**Do** —
1. Compare the seven curves, the legend (its place and texts), the two shades of gray, the dashed circles and the radius arrow.
2. Look for a label "r" right of the radius arrow (about a third of the way down).
3. Compare the green car (headlights, front wheels turned left), its thick green path and the red start car.
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_dubins-reachability-3d.md`, under the heading M-D3-07: per item: "same" or the difference; for step 2 whether an "r" is drawn.
**Save** — File > Close, Don't Save.
**Port** — the same steps on the port's page.
**Expected / what it decides** — the same drawing; no "r" label in either (Q-D3-03) — if Mathematica 15 draws one, Q-D3-03 is revised; the legend reads "RLR, Δθ = 0" (N-D3-06) (F-D3-09…F-D3-11).

### M-D3-08 Snapshots
**Open** — `_internal\originals\3DReachabilitySetForADubinsCar.nb` with Mathematica via File > Open…; if a yellow bar offers **Enable Dynamics**, click it; do not
evaluate any cell. Open the review screenshots `test-output\review-screenshots\chromium\dubins-reachability-3d-snapshot-1…4.png` (made by `npx playwright test tests/e2e/dubins-reachability-3d.spec.js`) next to it.
**Prepare** — scroll to the Snapshots section of the notebook.
**Do** —
1. Compare each of the four snapshot pictures with the screenshot of the same number: the surfaces and their colours, the curves, the sphere, the box and its ticks (snapshots 1 and 3); the curves, gray regions, legend, cars and path (snapshots 2 and 4).
**Record** — in `_internal\test-runs\<YYYY-MM-DD>_dubins-reachability-3d.md`, under the heading M-D3-08: per snapshot: "same" or the differences.
**Save** — File > Close, Don't Save.
**Port** — the review screenshots.
**Expected / what it decides** — the same pictures and control values; known small differences: the box size and place (D-D3-05), the highlights (K-D3-01), the legend font (D-D3-04) and snapshot 2's legend text (N-D3-06) (F-D3-15).

### M-D3-09 Narrow window
**Steps** — make the browser window about 360 px wide (or use a phone); use every control and switch the dimension.
**Record** — anything cut off, overlapping or not reachable.
**Expected** — the page stays usable; both pictures scale down with the window.
