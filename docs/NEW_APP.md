# Writing a new app (for Mathematica users)

This page is for someone who knows Mathematica and wants to put a `Manipulate` in this repository — a port of a similar
Demonstration or a new one in the same style — writing as little JavaScript as possible. The course ports in `demos/`
are **faithful** ports: they reproduce the originals bit for bit and therefore use exact-numerics helpers
(`shared/mma.js` tolerant comparisons, `mma-exact.js`, `exact-pi.js`) and long comments about Mathematica's
behaviour. **A new app does not need any of that** ("simple mode"): ordinary JavaScript arithmetic, the list functions
of `shared/wl.js` and the Manipulate layer `shared/manipulate.js` are enough. The process for faithful course ports is
in [DESIGN_PROCESS.md](DESIGN_PROCESS.md).

## 1. Start from the generator

```
npm run new-app -- my-demo --title "Title of the Demonstration" --slug WolframSlug --authors "A. Author; B. Author"
```

Add `--3d` for a three-dimensional picture. The command writes a small working app (a point you drag on a circle, or a
3D scene), registers it on the landing page, in the browser-test app list, `LICENSE.md`, the README and
`docs/DESIGN_PROCESS.md`, and all tests pass at once (`npm test`, `npm run test:e2e`). `--dry-run` lists what it would
write; `npm run new-app -- --remove my-demo` takes it out again (only an app the generator made).

Then edit three files:

| File | What goes there | Mathematica counterpart |
|---|---|---|
| `demos/my-demo/model.js` | the body: a function of the Manipulate variables that returns the picture as Graphics data (and, if you want, values for the tests) | the first argument of `Manipulate` and its helper functions |
| `demos/my-demo/main.js` | one `Manipulate({ body, controls, graphics })` call | the control specs and options of `Manipulate` |
| `demos/my-demo/DESIGN.md` | what the app does and how each feature is checked (the tests read it) | — |

`index.html` (title, caption, credits) needs only text changes; the unit test (`tests/unit/my-demo.test.js`) and the
browser test (`tests/e2e/my-demo.spec.js`) are starting points.

## 2. Manipulate → `Manipulate({…})`

```js
import { Manipulate, Locator } from '../../shared/manipulate.js';
import { Graphics, Red, Disk, Line, Style, Italic } from '../../shared/graphics.js';

Manipulate({
  name: 'my-demo',
  body: ({ r, p }) => [Red, Disk(p, r), Line([[0, 0], p])],
  graphics: { PlotRange: [[-2, 2], [-2, 2]], ImageSize: 400, Axes: true },
  controls: [
    [['r', 1, Style('r', Italic)], 0.1, 2, 0.1, { Appearance: 'Labeled' }],
    [['p', [1, 1]], [-2, -2], [2, 2], Locator],
  ],
});
```

| Mathematica | Here |
|---|---|
| `{{r, 1, "radius"}, 0.1, 2, 0.1, Appearance -> "Labeled"}` | `[['r', 1, 'radius'], 0.1, 2, 0.1, { Appearance: 'Labeled' }]` |
| `{x, 0, 1}` (continuous) | `[['x', 0], 0, 1]` |
| `{{n, 3}, {2, 3, 5}}` setter bar, `{{show, True}, {False, True}}` checkbox | `[['n', 3], [2, 3, 5]]`, `[['show', true], [false, true]]` |
| `ControlType -> PopupMenu` / `Slider` / `VerticalSlider` | `{ ControlType: PopupMenu }` (import `PopupMenu` …) |
| `{{p, {0, 0}}, Locator}`, `Appearance -> None` | `[['p', [0, 0]], [xmin, ymin], [xmax, ymax], Locator, { Appearance: None }]` |
| locator `Appearance -> Graphics[…]` (also depending on other variables) | `{ Appearance: [Blue, Disk([0, 0], 0.1)] }` or `{ Appearance: (s) => [s.on ? Red : Blue, Disk([0, 0], 0.1)] }` — coordinates relative to the point |
| `Button["Reset", …]`, `Row[{…}]`, `Delimiter`, `"heading"` | `Button('Reset', (s) => { … })`, `Row([…])`, `Delimiter`, `'heading'` |
| `ControlPlacement -> Top` (Mathematica's default) | `ControlPlacement: 'Top'` in the spec (the pages' default is beside) |
| `Initialization :> (…)` | ordinary code at the top of `model.js` |
| `x` changed inside the body | return `{ state: { …s, x: newX }, graphics: […] }` |
| `TrackedSymbols`, `SaveDefinitions` | not needed |

## 3. Graphics → Graphics data

The names are Mathematica's (`shared/graphics.js`): `Line`, `Polygon`, `Disk`, `Circle`, `Rectangle`, `Point`,
`Arrow`, `Text`, `Rotate`, `Translate`, `Inset`, `Tooltip`; `Red`, `RGBColor(…)`, `GrayLevel(…)`, `Lighter`, `Darker`,
`Opacity`, `Thickness`, `AbsoluteThickness`, `Thick`, `Dashed`, `PointSize`, `EdgeForm`, `FaceForm`, `Style(…, 14,
Italic, Bold)` or `Style(…, 'Medium')`; `ArrayPlot(matrix, { DataRange, ColorRules })`. Lists are arrays: `{Red,
Disk[…]}` is `[Red, Disk(…)]`, and directives stay inside their list as in Mathematica. `If[c, g]` inside a list is
`c && g`.

Options of the picture go in `graphics: {…}`: `PlotRange`, `ImageSize`, `Background`, `PlotRangePadding`, and the
frame options `Axes: true`, `Ticks: [1, 0.5]`, `AxesLabel: ['x', 'y']`, `AxesOrigin`, `Frame: true`,
`FrameTicks`, `FrameLabel: ['t', 'value']`, `PlotLabel: 'title'` (room for the labels is made automatically). Several
pictures side by side: `graphics: [{ id: 'graphic', … }, { id: 'graphic2', … }]` and a body that returns one list per
picture. 3D: see the generated `--3d` app (`Graphics3D` data drawn by `shared/graphics3d-view.js`; primitives
`Sphere`, `Cylinder`, `Cone`, `Tube`, `Cuboid`, `Polygon`, `Line`, `Arrow`, `InfinitePlane`, `InfiniteLine`, `Text`).
`Ellipsoid[c, Σ]` in 2D draws the ellipse of a 2 × 2 matrix; `Hue[h]` is available.

### Plots (`shared/plot.js`)

| Mathematica | Here |
|---|---|
| `Plot[{f[x], g[x]}, {x, a, b}, opts]` | `Plot((x) => [f(x), g(x)], [a, b], { … })` |
| `ListPlot[data, Filling -> 0]`, `ListLinePlot[data]` | `ListPlot(data, { Filling: 0 })`, `ListLinePlot(data)` |
| `ParametricPlot[{x[t], y[t]}, {t, a, b}]` | `ParametricPlot((t) => [x(t), y(t)], [a, b])` |
| `Show[plot1, plot2]` | `Show(plot1, plot2)` |
| `PlotStyle -> {Red, {Dashed, Purple}}`, `Filling -> 0` or `{1 -> {2}}` | `PlotStyle: [[Red], [Dashed, Purple]]`, `Filling: 0` or `{ 1: [2] }` |
| `PlotLegends -> {"a", "b"}`, `PlotLegends -> Placed[{…}, {.6, .8}]` | `PlotLegends: ['a', 'b']`, `PlotLegends: Placed([…], [0.6, 0.8])` |
| `PlotRange -> {All, {0, 1}}`, `Frame -> {True, True, False, False}`, `FrameLabel`, `AxesLabel`, `Epilog`, `ImagePadding`, `AspectRatio`, `ImageSize -> {w, h}` | the same keys |
| `Ticks -> {{0, π/2, π}, Automatic}` | `Ticks: [[[0, '0'], [Pi / 2, 'π/2'], [Pi, 'π']], 'Automatic']` (labels as text) |
| `ColorData[97, 2]` | `ColorData(97, 2)` |

A plot is a `Graphics` value: return it from the body like any picture (one per picture). Its frame, ticks and legend
are redrawn when they change (e.g. an automatic plot range), and a Locator on a plot works in the plot's coordinates.
Curves are sampled adaptively (not Mathematica's sampler: identical to well under a pixel); a value that is not a
number (NaN) leaves a gap.

### Geometry (`shared/geometry.js`)

`ConvexHull`, `PolygonArea`, `RegionMember` (point in polygon), `SignedArea`, `SegmentIntersection`, `RegionNearest`,
`RegionDistance`, `SegmentsClosestPoints` (2D or 3D), `Eigensystem2`, `CircumCircle`, `RollPitchYawMatrix`.

## 4. Language → `shared/wl.js`

```js
import { Table, Total, Times, Cos, Sin, Pi } from '../../shared/wl.js';
const pts = Table((t) => [Cos(t), Sin(t)], [0, 2 * Pi, Pi / 12]);   // Table[{Cos[t], Sin[t]}, {t, 0, 2 Pi, Pi/12}]
const c = Times(1 / pts.length, Total(pts));                          // Total[pts]/Length[pts]
```

| Mathematica | Here | Watch out |
|---|---|---|
| `f[x_] := …`, `Module[{a}, …]` | `const f = (x) => …`, a block with `const a = …` | |
| `#^2 &`, `f /@ list`, `Map[f, list]` | `(x) => x ** 2`, `list.map(f)` | |
| `Table[f, {i, n}]`, `{i, a, b}`, `{i, a, b, d}`, `{x, list}` | `Table((i) => f, [n])`, `[a, b]`, `[a, b, d]`, `[list]` | several iterators: `Table((i, j) => …, [n], [m])` |
| `Range`, `Subdivide`, `ConstantArray`, `Array` | same names | |
| `list[[i]]`, `list[[-1]]`, `First`, `Last`, `Most`, `Rest`, `Take`, `Drop` | `Part(list, i)` or `list[i - 1]`, `list.at(-1)`, same names | JavaScript arrays count from 0 |
| `Length`, `Join`, `Append`, `Reverse`, `Flatten`, `Partition`, `Transpose`, `Riffle` | same names | `AppendTo[list, x]` is `list.push(x)` (or `list = Append(list, x)`) |
| `Select`, `Position`, `Count`, `MemberQ`, `DeleteDuplicates`, `Union`, `Tally`, `SortBy`, `MinimalBy` | same names | `Position` returns 1-based positions `[[i]]` |
| `Fold`, `FoldList`, `Nest`, `NestList`, `NestWhile`, `FixedPoint`, `MapThread`, `MapIndexed`, `Outer`, `Tuples` | same names | |
| `a + b`, `a - b`, `k a`, `a / k` on vectors | `Plus(a, b)`, `Subtract(a, b)`, `Times(k, a)`, `Divide(a, k)` | JavaScript's `+` does not work on arrays |
| `a . b`, `Cross`, `Norm`, `Normalize`, `EuclideanDistance`, `Det`, `Inverse`, `RotationMatrix[θ]` | `Dot(a, b)` and the same names | |
| `Total`, `Mean`, `Median`, `Max`, `Min`, `Accumulate`, `Differences` | same names | |
| `ArcTan[x, y]` | `ArcTan(x, y)` | `Math.atan2` takes `(y, x)` — use `ArcTan` |
| `PDF[NormalDistribution[μ, σ], x]`, `CDF`, `RandomVariate`, `Erf`, `Binomial`, `Ordering` | `PDF(NormalDistribution(mu, sigma), x)` and the same names (also `UniformDistribution`, `TriangularDistribution`) | random draws agree in distribution only |
| `Round`, `Mod[m, n]`, `Quotient`, `Clip`, `Rescale`, `Chop`, `Boole` | same names | `Math.round` rounds halves up; `Round` rounds them to even, as in Mathematica; `%` is not `Mod` for negative numbers |
| `Pi`, `E`, `Degree`, `Sin`, `Cos`, `Sqrt`, `Exp`, `Log[b, x]` | same names | |
| `RandomReal[{0, 1}, n]`, `RandomInteger`, `RandomChoice`, `RandomSample` | same names | `SeedRandom[n]`: pass a seeded source as the last argument — the Manipulate's `rng` (with `random: true` in the spec; `body: (s, { rng }) => RandomReal([0, 1], 3, rng)`, `?seed=N` in the page URL) or `createRng({ seed: n })` of `shared/random.js` |
| a value computed only when its inputs change (`If[a =!= aOld, …]`) | `const cached = cacheLast(); … cached([a, b], () => compute(a, b))` | |
| `x == y`, `x < y` | `===`, `<` (or `Math.abs(x - y) < 1e-9`) | Mathematica's tolerant comparison only matters for faithful ports |

Results agree with Mathematica up to rounding, not bit for bit. That is enough for a new app; do not mix `shared/wl.js`
with the exact helpers in one computation.

## 5. Checking the result

Write unit tests for `model.js` (values you can compute by hand or in Mathematica) and a browser test for the controls
(`window.__demo.setState({…})`, `window.__demo.moveLocator(name, [x, y])`, `window.__demo.view()` and `graphics(0)`
are available on every page). Every feature row of `DESIGN.md` names the tests that check it (`e2e "start of the test
title"`, `unit "…"`, a checklist item `M-XX-nn` or `inventory`); `npm test` fails while a reference does not exist.
