# Design document: Probabilistic Roadmap Method with Seven-Link Articulated Robot

| | |
|---|---|
| Code version: | 0.1.12 |
| Document revision | 3 (2026-10-06) — published on the main site (private-preview banner removed) |
| Status | describes the app as implemented; changes go through *Proposed changes* (§8) and [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md) |
| Original | Wolfram Demonstrations Project, "Probabilistic Roadmap Method with Seven-Link Articulated Robot", contributed by Aaron T. Becker and Yitong Lu, published April 29, 2020 (CC BY-NC-SA 3.0). <https://demonstrations.wolfram.com/ProbabilisticRoadmapMethodWithSevenLinkArticulatedRobot/>. Readable source: [`docs/original-source/prm-seven-link.txt`](../../docs/original-source/prm-seven-link.txt); snapshots: `docs/original-snapshots/prm-seven-link-*.png` |
| Port files | `model.js` (constants, geometry, one evaluation of the Manipulate body; pure), `main.js` (SVG drawing, locators, controls), `index.html` |
| Role in the project | further demonstration (extra proof of concept alongside the motion-planning port); developed in a separate, unpublished repository and added to this site in v0.1.12 |

## 1. Purpose and background

A puzzle: drag the joints of a seven-link planar robot (brown) from its start configuration to one of seven goal
configurations (green) while touching the blue obstacles as rarely as possible. The scene reproduces Figure 2 of
Kavraki et al. (1996), the paper that introduced the probabilistic roadmap method; the Demonstration itself contains
no planner and no random sampling — it lets the user feel why planning in a 7-dimensional configuration space is hard.

## 2. Scope

In scope: the original's controls (restart, movement relative/absolute, goal 1–7), the seven invisible joint
locators, the rate-limited joint motion, collision counting, the status and success texts, the drawing.
Out of scope (would need a design entry first): an actual PRM planner, more goals, undo, sound.

## 3. Users and use cases

| ID | User | Use case |
|----|------|----------|
| UC-SL-01 | student | move the robot joint by joint to a goal configuration and see the collision count |
| UC-SL-02 | student | compare "relative" (one joint angle) with "absolute" (rotate the rest of the chain) movement |
| UC-SL-03 | tester | compare the port with the original's saved state and snapshots |

## 4. Features

### 4.1 Controls

| ID | Feature | Why | Since | Verified by |
|----|---------|-----|-------|-------------|
| F-SL-01 | "restart" button: collisions = 0, isCollide = False, loc = locOld = locstart (the goal and movement settings are kept) | start over (UC-SL-01) | v0.1.0 | e2e "colliding turns the robot red, counts one collision and disables the movement setter, then restart resets"; unit "restart resets collisions, isCollide and both locator lists" |
| F-SL-02 | "movement" setter: relative (default) / absolute; disabled while the robot is in collision (`Enabled -> Dynamic[!isCollide]`) | the two ways of moving the chain (UC-SL-02) | v0.1.0 | e2e "has the controls of the original: restart button, movement and goal setters"; e2e "absolute movement rotates the following links with the dragged one" |
| F-SL-03 | "goal" setter 1–7 (default 1), selecting rows c2…c8 of the original's goal table | choose the target configuration | v0.1.0 | e2e "a goal button redraws the goal configuration and the worst error" |
| F-SL-04 | Seven joint locators (`{{loc, locstart}, {18, 7}, {884, 884}, Locator, Appearance -> None}`): invisible, draggable, positions clamped to the workspace box | moving the robot (UC-SL-01) | v0.1.0 | e2e "dragging joint 7 with the mouse turns the last link a little per update" |

### 4.2 Model (`model.js`)

| ID | Feature | Why | Since | Verified by |
|----|---------|-----|-------|-------------|
| F-SL-05 | One evaluation of the Manipulate body per front-end update: the first joint whose locator moved turns by `Clip[angDiff[θ, θold], 0.05 {-1, 1}]` about the previous joint; link length stays 140 | the original's rate-limited, one-joint-at-a-time motion (Q-SL-01) | v0.1.0 | unit "a drag moves the link by at most 0.05 rad per evaluation"; unit "only the first changed locator is processed (Break)"; e2e "dragging joint 7 with the mouse turns the last link a little per update" |
| F-SL-06 | "relative": the following joints are translated by the dragged joint's displacement; "absolute": the following links are rotated by the same angle | the two movement modes | v0.1.0 | unit "relative movement translates all following joints by the displacement of the dragged joint"; unit "absolute movement rotates all following links by the same angle" |
| F-SL-07 | Collision test: any joint outside x 18…884 / y 7…884, or any link joint i → joint i+1 (i = 1…6) crossing an obstacle edge (`segmentIntersectionQ`, inclusive end points, parallel segments never intersect) | detect collisions as the original does (Q-SL-02, Q-SL-03) | v0.1.0 | unit "segmentIntersectionQ: crossing segments intersect, separate ones do not"; unit "segmentIntersectionQ: touching at an end point counts (inclusive 0 <= Gamma <= 1)"; unit "a joint outside the workspace counts as a collision" |
| F-SL-08 | Collision handling: the first colliding update counts one collision and keeps the colliding position in `loc` (robot drawn at `locOld`, in red); a further colliding update restores `loc = locOld`; a collision-free update accepts the move | the original's collision counter and "undo" | v0.1.0 | unit "first entry into a collision counts once and keeps loc, then the next colliding update reverts loc"; e2e "colliding turns the robot red, counts one collision and disables the movement setter, then restart resets" |
| F-SL-09 | Goal configuration og from the accumulated relative angles of the goal row; worst error = largest distance between corresponding joints of og and the robot (base included); success when worst error < 20 and no collision | the puzzle's objective | v0.1.0 | unit "goal configuration: og starts at the base and has 8 points, links of length 140"; unit "success needs worst error < 20 and no collision in the PREVIOUS evaluation"; golden "seven-link: worst error of the start position for goal 1 is 669.7, as in the original snapshot" |
| F-SL-10 | Constants of the original: 7 obstacles (Fig. 2 of [1]), base (445, 846), start joints, goal table, workspace 18…884 × 7…884 | same scene as the original | v0.1.0 | golden "seven-link: the saved state is the state after the first evaluation of the initial settings"; golden "seven-link: evaluating the saved state again changes nothing" |

### 4.3 Graphics (SVG)

| ID | Feature | Why | Since | Verified by |
|----|---------|-----|-------|-------------|
| F-SL-11 | Text "`n` collisions, worst error = `e`" above the workspace (worst error rounded to 0.1) and, on success, "Congratulations! You solved goal `g` in only `n` collisions!" | feedback to the player | v0.1.0 | e2e "status text reads "0 collisions, worst error = 669.7" at the start (as the original snapshot)"; e2e "success message when the robot matches the goal" |
| F-SL-12 | Drawing order and colours of the original: white workspace rectangle with thick black edge; blue obstacles with thick black edges; goal chain as a darker-green line with large points; robot as a brown line (red while colliding), Thickness 0.005; locator glyphs at the robot's accepted joints (`Locator /@ locOld`) | same picture as the original | v0.1.0 | e2e "loads without errors and draws workspace, obstacles, robot and goal"; review |
| F-SL-13 | Title, caption and details text of the original | explains the Demonstration | v0.1.0 | M-SL-01 |

### 4.4 Port additions

| ID | Feature | Why | Since | Verified by |
|----|---------|-----|-------|-------------|
| A-SL-01 | "Initial settings" button: all controls and the robot back to the opening state | stands in for the Manipulate ⊕ menu → Initial Settings | v0.1.0 | e2e "Initial settings restores the opening state" |
| A-SL-02 | Arrow keys move a focused joint locator (5 units; Shift = 25); each key press is one update, so the rate limit applies | keyboard access | v0.1.0 | e2e "arrow keys move a focused joint locator (port addition)" |
| A-SL-03 | `window.__demo` automation hook (state, view values, `moveLocator`, `setState`) | automated tests | v0.1.0 | e2e "success message when the robot matches the goal" |
| A-SL-04 | "All demos" link (the private-preview banner of v0.1.0–v0.1.1 was removed in v0.1.12, when publication was cleared) | site navigation | v0.1.0 | inventory; M-GEN-01 |
| A-SL-05 | Credit footer: original title, authors, licence, adaptation notice | required by CC BY-NC-SA 3.0 | v0.1.0 | e2e "attribution on" |
| A-SL-06 | Start-up notice (watchdog, `<noscript>`) when the page cannot start (DEC-22) | a clear message instead of an empty page | v0.1.0 | e2e "start-up notice when" |

## 5. UI inventory

Every interactive element of the page, identified by its `data-testid` (or that of the nearest ancestor); `*`
matches any text. Checked by the browser test "every control on … is specified in its design document".

| data-testid | Feature |
|-------------|---------|
| `button-restart` | F-SL-01 |
| `setter-movement-*` | F-SL-02 |
| `setter-goal-*` | F-SL-03 |
| `locator-*` | F-SL-04, A-SL-02 |
| `reset` | A-SL-01 |
| `crumbs` | A-SL-04 |
| `details` | F-SL-13 |
| `credits` | A-SL-05 |

## 6. Design

- `model.js` holds the original's constants and functions (`Gamma`, `lineIntersectionPoint`,
  `segmentIntersectionQ`, `angDiff`, `lineList`, `listofAllLines`) and `evaluate(state)`, which performs exactly one
  evaluation of the Manipulate body: worst error and success (from the state *before* the update), the joint update,
  the collision test and the collision bookkeeping. It has no DOM code and is unit-tested.
- `main.js` keeps the Manipulate variables (`loc`, `locOld`, `isCollide`, `collideState`, `collisions`, `movement`,
  `goal`) and calls `evaluate` after every control change — as Mathematica re-evaluates the body. A locator drag
  sets `loc[i]` to the pointer position once per animation frame (the port's "front-end update", see D-SL-01) and
  evaluates.
- The invisible Manipulate locators sit at `loc`; the drawn locator glyphs sit at `locOld`, as in the original.
- Mathematica's tolerant comparisons (`==`, `<=` on machine reals) come from `shared/mma.js`.
- Drawing uses `shared/svg-plot.js` (PlotRange → viewBox, Thickness/PointSize as fractions of the plot width,
  container-level locator hit-testing).

## 7. Deviations (D), quirks kept (Q), known issues (K) and notes (N)

| ID | Kind | Description |
|----|------|-------------|
| Q-SL-01 | quirk kept | Each update turns the dragged link by at most 0.05 rad, and only the first changed joint (lowest index) is processed (`Break[]`). How far a drag gets therefore depends on how many updates happen during it. |
| Q-SL-02 | quirk kept | `segmentIntersectionQ` treats parallel or collinear overlapping segments as not intersecting; touching an edge at an end point counts as a collision. |
| Q-SL-03 | quirk kept | The first link (base → joint 1) is never collision-checked — without visible effect, because joint 1 always stays at y ≥ 706 while every obstacle ends at y = 620; links are never tested against each other (self-collision), which is visible. |
| Q-SL-04 | quirk kept | "worst error" and the success test use the state before the current update; the collision count in the text is the updated one. |
| Q-SL-05 | quirk kept | On the first colliding update the colliding joints stay in `loc` (the invisible locators stay there) while the robot is drawn at `locOld`; the next update reverts. |
| D-SL-01 | deviation | What counts as one update differs: Mathematica's front end decides how often it re-evaluates during a drag; the port evaluates once per animation frame with the latest pointer position (and once per arrow key). The rate limit per update is the same; the speed of a drag may differ. To be compared with the original by hand (M-SL-02). |
| D-SL-02 | deviation | `Beep[]` on a new collision is not reproduced (no sound); the count is shown as in the original. Default chosen until the owner decides whether the port should beep. |
| D-SL-03 | deviation | Font, point sizes and line widths approximate Mathematica's (`Medium` text ≈ 13 px; `PointSize[Large]` = 1.8 % of the plot width, measured on the original's snapshot). `Opacity[6]` (> 1) is drawn as opaque. |
| D-SL-04 | deviation | When several joints collide with exact touching geometry, Mathematica may compare exact integers (unmoved joints keep integer coordinates) where the port uses machine numbers. Not observed; listed as a lead (K-SL-01). |
| D-SL-05 | deviation (resolved in v0.1.1) | Locator picking now follows Mathematica's LocatorPane, which "by default directs any click to the nearest locator" ([LocatorPane reference](https://reference.wolfram.com/language/ref/LocatorPane.html), Details); Manipulate `Locator` controls are LocatorPane locators. PORT DEVIATION: a press within 12 CSS px grabs that joint's invisible locator where it is (no jump; the distance at which Mathematica grabs without a jump is unknown, M-SL-06); a press also gives the locator keyboard focus; a press anywhere else moves the nearest joint's locator to the press point, and the evaluation then turns that link by at most 0.05 rad toward it (Q-SL-01). Ties: lower joint number. While dragging, the body runs once per animation frame (D-SL-01). After a first collision the invisible locators are not under the drawn glyphs (Q-SL-05); the nearest-locator rule still picks the joint nearest to the press. Still unknown in the original: the distance at which a press grabs without a jump, and the tie rule (M-SL-06). Verified by e2e "a press away from every locator turns the nearest joint toward the press point". |
| K-SL-01 | known issue (lead) | Exact (integer/rational) vs machine arithmetic in `segmentIntersectionQ` for segments whose ends are all integers (unmoved joints against obstacle edges): the port computes `Det` exactly for integer entries and with Mathematica's LU-based `Det` (bit-exact, `shared/mma-exact.js`) otherwise, and `ArcTan` correctly rounded; the intersection point and `Gamma` are machine numbers where Mathematica has exact rationals. Only matters at exact touching. `Cos`/`Sin` are the browser's (last-bit differences possible). |
| K-SL-02 | known issue (lead, important) | **Does Mathematica evaluate the body again after the body assigns its own control variables** (`loc[[i]] = …`, `locOld = loc`, `collideState = …`)? The port evaluates once per update. If the original re-evaluates until nothing changes, holding a link against an obstacle behaves very differently: measured with the port's model over 120 updates, one pass gives 1 collision and a red robot; re-running to a fixed point gives 108 collisions and the robot never turns red. No snapshot shows a red robot; snapshots 4–5 show 14 and 36 collisions — suggestive, not proof. To check by hand (M-SL-03). If the original re-runs, `main.js` should loop `evaluate` until `loc`, `locOld` and `collideState` stop changing (a proposed change, §8). **Owner evidence (2026-10-06):** the owner's saved state after playing goal 7 in Mathematica 15.0.1 has **132 collisions** with the robot not in collision (owner state 1; golden "seven-link: evaluating owner state 1 again changes nothing and keeps the count of 132 collisions"). Under the port's one-pass rule each collision needs a separate entry into an obstacle after a collision-free update, so 132 would mean 132 separate bumps; under re-evaluation a few seconds of pushing gives that many. Strongly suggestive of re-evaluation, still not proof: the owner is asked whether the count kept climbing while he pushed and whether the robot stayed red (M-SL-03). |
| K-SL-03 | known issue (lead, mostly resolved in v0.1.1) | Which invisible locator a press grabs, from how far, and what a press on empty space does in the original. Resolved from the LocatorPane reference and the owner's car-paths and art-gallery observations (the same front-end mechanism): any press goes to the nearest locator (D-SL-05). Open: the no-jump grab distance and the tie rule (M-SL-06). |
| K-SL-04 | known issue (lead, resolved in v0.1.1) | Is `locOld[[i]] != loc[[i]]` (Unequal on point lists) tolerant? extra-checks.wls, Mathematica 15.0.1, owner run 2026-10-06: `{1., 2.} != {1. + 2.^-52, 2.}` → False, `{1., 2.} != {1.001, 2.}` → True. Tolerant, as the port's `samePoint` (`mEqual` per coordinate, `shared/mma.js`). No change. |
| O-SL-01 | owner observation (2026-10-06) | "In neither version do relative/absolute appear to change anything (same collision counts and worst error)." Explanation: with joint 7 (the usual one to drag) there is no following link, so both modes are identical; for joints 1–6 the difference per update is small (one 0.05 rad step: "relative" shifts the following joints parallel, "absolute" rotates them with the link). Visible when joint 2 or 3 is dragged through about 30° (M-SL-04, reworded). Both modes are implemented as in the original (F-SL-06, unit tests). |
| O-SL-02 | owner observation (2026-10-06) | Owner state 1 (goal 7, 132 collisions, not colliding, "relative"): the port reproduces it — every link 140 long, no collision, re-evaluation changes nothing; the port's status text for it is "132 collisions, worst error = 489.2" (owner to compare with the saved output, M-SL-07). Evidence for K-SL-02. |
| N-SL-01 | note | `For[i==1, …]` in the original is a comparison, not an assignment; it works because the Module sets `i = 1`. |
| N-SL-02 | note | The goal table has 8 rows; the setter offers 1–7, row 8 is the robot's start (c1 in the original's comments). |

## 8. Proposed changes

No open proposal. Template (see [`docs/DESIGN_PROCESS.md`](../../docs/DESIGN_PROCESS.md)):

| ID | Status | Requested by / date | Change | Reason | Acceptance criteria |
|----|--------|---------------------|--------|--------|---------------------|

## 9. Revision history

| Doc rev. | Code version | Date | Change |
|----------|--------------|------|--------|
| 1 | v0.1.0 | 2026-10-06 | first AI conversion: feature list, quirks and deviations written with the port |
| 2 | v0.1.1 | 2026-10-06 | owner testing round 1 (Mathematica 15.0.1): nearest-locator picking (D-SL-05 resolved, K-SL-03 mostly resolved); K-SL-04 resolved (tolerant Unequal, no change); owner state 1 golden tests; O-SL-01 (relative/absolute explained), O-SL-02, 12 px no-jump grab zone marked as a port deviation and the 132-collision evidence for K-SL-02; checklist M-SL-04/06 reworded, M-SL-07 added. Beep (D-SL-02) still awaiting the owner's decision. |
| 3 | v0.1.12 | 2026-10-06 | added to this repository and published: private-preview banner removed (A-SL-04), role line updated; no other feature changes. Versions v0.1.0 and v0.1.1 in this document (Since column, rows above) are versions of the separate repository the app was developed in, not of this repository |

## 10. Improvements to consider (not implemented)

| ID | Improvement | Benefit | Cost / risk | Related |
|----|-------------|---------|-------------|---------|
| I-SL-01 | Collision-check links against each other (self-collision); checking the first link adds nothing, since it cannot reach an obstacle | the puzzle would match physical intuition | differs from the original | Q-SL-03 |
| I-SL-02 | Make the rate limit time-based (rad per second) instead of per update | the same feel on every computer and browser | departs from the original's per-evaluation rule | Q-SL-01, D-SL-01 |
| I-SL-03 | Show the locators at `loc` while colliding, or not keep the colliding position | less confusing collision feedback | changes the original's behaviour | Q-SL-05 |
