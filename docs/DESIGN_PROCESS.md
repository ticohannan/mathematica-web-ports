# Design process: features are specified before they are built

This repository holds browser ports of twenty-six Wolfram Demonstrations. Each app has a **design
document** that lists every feature the app implements, why it exists, since which version, and how
it is verified:

| App | Design document | Code |
|-----|-----------------|------|
| Motion Planning for Robot Path around Obstacles | [`demos/motion-planning/DESIGN.md`](../demos/motion-planning/DESIGN.md) | `demos/motion-planning/` |
| Three Parametrizations of Rotations | [`demos/three-parametrizations/DESIGN.md`](../demos/three-parametrizations/DESIGN.md) | `demos/three-parametrizations/` |
| Euler Angles: Precession, Nutation, and Spin | [`demos/euler-angles/DESIGN.md`](../demos/euler-angles/DESIGN.md) | `demos/euler-angles/` |
| Probabilistic Roadmap Method with Seven-Link Articulated Robot | [`demos/prm-seven-link/DESIGN.md`](../demos/prm-seven-link/DESIGN.md) | `demos/prm-seven-link/` |
| Shortest Path for Forward and Reverse Motion of a Car | [`demos/car-paths/DESIGN.md`](../demos/car-paths/DESIGN.md) | `demos/car-paths/` |
| Unit Balls for Different p-Norms in 2D and 3D | [`demos/unit-balls/DESIGN.md`](../demos/unit-balls/DESIGN.md) | `demos/unit-balls/` |
| Art Gallery Problem | [`demos/art-gallery/DESIGN.md`](../demos/art-gallery/DESIGN.md) | `demos/art-gallery/` |
| Probabilistic Roadmap Method | [`demos/prm/DESIGN.md`](../demos/prm/DESIGN.md) | `demos/prm/` |
| Probabilistic Roadmap Method for Robot Arm | [`demos/prm-robot-arm/DESIGN.md`](../demos/prm-robot-arm/DESIGN.md) | `demos/prm-robot-arm/` |
| Robot Singularities in Three-Link Manipulators | [`demos/robot-singularities/DESIGN.md`](../demos/robot-singularities/DESIGN.md) | `demos/robot-singularities/` |
| Forward and Inverse Kinematics for Two-Link Arm | [`demos/two-link-kinematics/DESIGN.md`](../demos/two-link-kinematics/DESIGN.md) | `demos/two-link-kinematics/` |
| Robot Motion with Obstacles | [`demos/robot-motion-obstacles/DESIGN.md`](../demos/robot-motion-obstacles/DESIGN.md) | `demos/robot-motion-obstacles/` |
| Breadth-First Search Robot Motion Planning | [`demos/bfs-motion-planning/DESIGN.md`](../demos/bfs-motion-planning/DESIGN.md) | `demos/bfs-motion-planning/` |
| Distance Norms in Robot Workspace and Phase Space | [`demos/distance-norms/DESIGN.md`](../demos/distance-norms/DESIGN.md) | `demos/distance-norms/` |
| Shortest Path for the Dubins Car | [`demos/dubins-path/DESIGN.md`](../demos/dubins-path/DESIGN.md) | `demos/dubins-path/` |
| Isochrons for a Dubins Car | [`demos/dubins-isochrons/DESIGN.md`](../demos/dubins-isochrons/DESIGN.md) | `demos/dubins-isochrons/` |
| Rapidly Exploring Random Tree (RRT) and RRT* | [`demos/rrt/DESIGN.md`](../demos/rrt/DESIGN.md) | `demos/rrt/` |
| Measuring Distance and Orientation Using Camera and Lasers | [`demos/camera-lasers/DESIGN.md`](../demos/camera-lasers/DESIGN.md) | `demos/camera-lasers/` |
| Minkowski Sum of Convex Robot and Obstacle | [`demos/minkowski-sum/DESIGN.md`](../demos/minkowski-sum/DESIGN.md) | `demos/minkowski-sum/` |
| Configuration Space for Four-Bar Linkage | [`demos/four-bar-linkage/DESIGN.md`](../demos/four-bar-linkage/DESIGN.md) | `demos/four-bar-linkage/` |
| Denavit-Hartenberg Parameters for a Three-Link Robot | [`demos/dh-parameters/DESIGN.md`](../demos/dh-parameters/DESIGN.md) | `demos/dh-parameters/` |
| Chart for a Torus | [`demos/torus-chart/DESIGN.md`](../demos/torus-chart/DESIGN.md) | `demos/torus-chart/` |
| Manipulability Ellipsoid of a Robot Arm | [`demos/manipulability-ellipsoid/DESIGN.md`](../demos/manipulability-ellipsoid/DESIGN.md) | `demos/manipulability-ellipsoid/` |
| Common Robot Arm Configurations | [`demos/arm-configurations/DESIGN.md`](../demos/arm-configurations/DESIGN.md) | `demos/arm-configurations/` |
| Robot Manipulator Workspaces | [`demos/manipulator-workspaces/DESIGN.md`](../demos/manipulator-workspaces/DESIGN.md) | `demos/manipulator-workspaces/` |
| Probabilistic Roadmap Method in 3D | [`demos/prm-3d/DESIGN.md`](../demos/prm-3d/DESIGN.md) | `demos/prm-3d/` |

The originals came without design documents. Version 0.1.6 added best-effort design documents
reconstructed from the original notebooks (their code, captions and details text) and from the
port as built. From 0.1.6 on, the design document is the specification: **the code implements the
design document, not the other way round.** The seven apps added in v0.1.12 were written together with
their design documents from their first conversion on (in a companion repository; their *Since* versions v0.1.0 and
v0.1.1 refer to that repository).

## Rules

1. **No feature without a design entry.** A new or changed user-visible behaviour (a control, a
   view, an output, a computation, a keyboard or mouse interaction, a URL parameter, text on the page)
   is first written into the app's design document under *Proposed changes*, with a requested-by,
   a reason and acceptance criteria. Code is written only after the owner has marked it *approved*.
2. **Every feature has an ID and a reason.** `F-xx-nn` = feature of the original Demonstration;
   `A-xx-nn` = addition made by the port. The *Why* column says what the feature is for. IDs are
   never reused; a removed feature keeps its row with status *removed in vX*.
3. **Every feature is verified.** The *Verified by* column names automated tests (`unit "…"`,
   `golden "…"`, `e2e "…"` — the quoted text is part of a test title), manual checklist items
   (`M-xx-nn` in [`MANUAL_TEST_CHECKLIST.md`](MANUAL_TEST_CHECKLIST.md) or [`checklists/`](checklists/)), `inventory` (the UI
   inventory test) or `compare` (the automated comparison with the original, `npm run compare:original`).
4. **Deviations and quirks are recorded.** Where the port behaves differently from the original it
   gets a `D-xx-nn` entry; where it deliberately keeps an oddity of the original it gets a `Q-xx-nn`
   entry; known open problems get `K-xx-nn` entries. Fixing a deviation or a known issue is a change
   like any other: proposed, approved, then built.
5. **Improvements are collected, not built.** Section 10 of each design document, *Improvements to
   consider*, lists ideas that would make an app better than the original (`I-xx-nn`: improvement,
   benefit, cost/risk, related entries). The delivered code reproduces the original's behaviour, so
   nothing in section 10 is implemented; an idea is built only after it has become an approved
   proposal (rule 1), which then names its I- ID.
6. **Design documents are tied to code versions.** Each design document states the code version it
   describes (`Code version:`), which must equal `version` in `package.json`; every feature row says
   since which version it exists; the revision history lists what changed in each version.

Rules 7–9 are the owner's rules of 2026-10-17 (R-A, R-B, R-C). They apply to every app, existing and new.

7. **Every app can be built and deployed on its own (R-A).** `tools/bundle-app.mjs <dir>` (`npm run bundle`)
   copies one app with exactly the files it needs into `dist/<dir>/`, with the licence texts, a generated README and
   a root `index.html`. Each design document describes this in a subsection of §6, *6.x Building and deploying this
   app alone* (the command, the list of bundled files, requirements such as WebGL 2); a test bundles every app and
   opens it from the bundle folder alone.
8. **Every check done by a person in Mathematica is an operator procedure (R-B).** A manual checklist item that
   involves the original notebook ([`MANUAL_TEST_CHECKLIST.md`](MANUAL_TEST_CHECKLIST.md), [`checklists/`](checklists/))
   is written so that someone who has never seen the project can follow it, under these headings, in this order:
   - **Open** — the exact notebook by its path in the repository (e.g.
     `_internal\originals\batch-ab\Demonstration-Rapidly-Exploring-Random-Tree-RRT-and-RRT-1-0-0-definition.nb`),
     opened with Mathematica 15.0.1 via File > Open…; Enable Dynamics if the yellow bar offers it; no cell is
     evaluated (no Shift+Enter) unless the item says so.
   - **Prepare** — how to reach the starting state: ⊕ (top right of the Manipulate panel) > Initial Settings, named
     controls set to stated values (where each control is and how it is labelled), or a saved state file.
   - **Do** — numbered actions, each naming the control or the thing in the picture, where it is, how far or how
     long, and what to watch.
   - **Record** — exactly what to write down (numbers, texts, colours, yes/no) in the test-run file
     `_internal\test-runs\<YYYY-MM-DD>_<dir>.md` (one per app and day; `npm run test-run -- <dir>` writes it).
   - **Save** — "File > Close, Don't Save" (default), or, when the state is to become golden data, File > Save As…
     `_internal\originals\saved\<dir>_<item>_<YYYY-MM-DD>.nb`; the downloaded original is never overwritten.
   - **Port** — the same actions in the browser port and what the port is expected to show.
   - **Expected / what it decides** — the expected result in the original if known, and which lead (K-) or test it
     settles.

   The general procedure (starting Mathematica, Enable Dynamics, the ⊕ menu, what not to do, where files go, how to
   send results back) is written once in [`MATHEMATICA_CHECKS.md`](MATHEMATICA_CHECKS.md); the items refer to it but
   still name every file and control. Items that involve only the browser port keep their own short form but are
   equally concrete.
9. **Errors in the original are listed, not silently kept or fixed (R-C).** Section 11 of each design document,
   *Errors in the original (conceptual and mathematical)*, is its last section. It lists where the original is
   probably wrong — as distinct from quirks that are merely unusual (`Q-`) and from the port's own deviations
   (`D-`) — and leaves each as an open question for the owner. One row per finding:

   | ID | Kind | Where in the original | What is (probably) wrong | What the port does | Effect of correcting it | Status |
   |----|------|-----------------------|--------------------------|--------------------|-------------------------|--------|

   - **ID** `E-XX-nn` (XX = the app's prefix); never reused, never used for another entry.
   - **Kind**, exactly one of: `conceptual` (the code computes something other than what the Demonstration claims or
     plainly intends, e.g. a "Manhattan distance" implemented as Chebyshev distance, a "BFS" that is another search, a
     convex test used on a concave obstacle), `mathematical` (a wrong formula, sign, index, inequality or a typo in an
     expression), `numerical` (tolerance, precision or rounding problems that give wrong answers in reachable cases),
     `text` (the title, caption, Details or a label states something false).
   - **Where in the original**: the function or expression, quoted, and the Details sentence if relevant.
   - **What the port does**: by default it keeps the original's behaviour (faithful port, DEC-04/DEC-19) and cites
     the `Q-` entry that documents it; where the port already deviates on purpose, the `D-` entry.
   - **Effect of correcting it**: what would visibly or numerically change for the user; which golden data,
     snapshot comparisons and tests would no longer match the original (to be re-baselined or kept as an "original
     mode"); whether the correction could be offered as an option (an `I-` entry); risks.
   - **Status**, exactly one of: `open` (the default: an open question for the owner), `kept` (the owner decided to
     keep the original's behaviour), `corrected in vX.Y.Z` (the owner approved a correction through a `P-` proposal,
     named in the row).
   - If nothing was found, a single row `| — | none found | — | <what was checked> | — | — | — |`.

   Sources: the app's `Q-` quirks, `N-` notes and review findings first; each formula is checked against the
   mathematics it claims, with a small independent computation where useful. A correction is a change like any
   other (rule 1): it needs an approved proposal, and the faithful behaviour stays the default until then.

## Required sections of a design document

Header table (with `Code version:`), then: 1. Purpose and background · 2. Scope · 3. Users and use cases ·
4. Features · 5. UI inventory · 6. Design (with 6.x *Building and deploying this app alone*, rule 7) ·
7. Deviations, quirks, known issues and notes · 8. Proposed changes · 9. Revision history · 10. Improvements to
consider · **11. Errors in the original (conceptual and mathematical)** (last, rule 9).

`npm run new-app` (`tools/new-app.mjs`, see [NEW_APP.md](NEW_APP.md)) writes a design document with all these sections
and references that the tests accept, for a new app to fill in.

## Lifecycle of a feature request

| Status | Meaning | Who |
|--------|---------|-----|
| proposed | entry written in *Proposed changes* (P-xx-nn): request, reason, acceptance criteria | anyone |
| approved | owner agrees; may get a target version | owner |
| implemented | code + tests done; the entry moves to the feature table with its new F-/A- ID and *Since* version | developer |
| rejected / withdrawn | stays in the table with the reason; a worthwhile idea moves to section 10 | owner |

## What the tests enforce

- `tests/unit/design-docs.test.js` (runs with `npm test`):
  each design document names the current code version; IDs are unique; every feature row has a
  reason, a *Since* version and at least one verification reference, and every referenced test title
  and checklist item exists; every UI-inventory row points to a feature of the document; every
  improvement in section 10 has a unique I- ID, a benefit and a cost/risk; section 11 is the last section, its
  table has the seven columns of rule 9, `E-XX-nn` IDs (unique, not used elsewhere in the document) or the single
  "none found" row, the Kind and Status vocabularies, and no empty cell.
- `tests/unit/new-test-run.test.js`: the test-run template (`tools/new-test-run.mjs`, rule 8) lists every
  checklist item of an app.
- `tests/e2e/site.spec.js`, test "every control on … is specified in its design document":
  every interactive element on each app page (buttons, inputs, links, locators, …) must match a row
  of the UI inventory in that app's design document, and every inventory row must match something on
  the page. A control added without a design entry, or removed without updating the document, fails
  the browser tests, so `npm run publish:tested` refuses to publish it.

Behaviour that is not a visible control (a change in a computation, for example) cannot be detected
mechanically; for that, rule 1 relies on review, the golden tests and the comparison with the original.

## Releasing a version

1. Raise `version` in `package.json`.
2. In every design document: set `Code version:` to the new version and add a revision-history row
   (even if only "no feature changes"); update section 11 if the version corrects an error of the original.
3. `npm run publish:tested` (unit + Firefox + Chromium + WebKit browser tests, then tag and push).
