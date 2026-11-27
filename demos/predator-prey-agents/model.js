// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Hiroki Sayama
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/predator-prey-agents/model.js — "Predator-Prey Ecosystem: A Real-Time Agent-Based Simulation": one evaluation
// of the Manipulate body, the state in, { view, state, graphics } out (pure apart from the random source it is given,
// no DOM). Simple mode: the original's initialAgents, updateAgents and visualize; while "run simulation" is checked
// every evaluation moves the agents one step and asks for the next (Refresh[…, UpdateInterval -> 0]).
import { Annotation, Point, AbsolutePointSize, RGBColor } from '../../shared/graphics.js';
import { createRng } from '../../shared/random.js';

/** Fox = 1., Rabbit = 2., maxRabbits = maxFoxes = 500., dummyPoint = {-1., -1.} */
export const Fox = 1, Rabbit = 2, maxRabbits = 500, maxFoxes = 500;
export const dummyPoint = Object.freeze([-1, -1]);
const F = Fox, R = Rabbit;

/**
 * The agents of the notebook's live state (its saved `ag`, 93 rabbits and 7 foxes, all fed): the opening picture. An
 * agent is {x, y, steps without food, kind}.
 */
export const SAVED_AGENTS = Object.freeze([
  [0.30483175260294426, 0.5742256013272056, R],
  [0.49443224937898966, 0.7112731576024116, R],
  [0.36657783104886454, 0.606418070090994, R],
  [0.988133855378523, 0.8832904078882968, R],
  [0.712384930232677, 0.9825056031130228, R],
  [0.5987730912415401, 0.05975067108964338, R],
  [0.46486163208541664, 0.5797304695184411, R],
  [0.8754016817809567, 0.721941531707734, R],
  [0.07262153444717545, 0.7652255972808595, R],
  [0.08016185821580946, 0.6614598273893888, F],
  [0.9674357286451853, 0.48897238820583744, R],
  [0.9869298648168272, 0.21082405190884002, R],
  [0.13022404141711874, 0.4824946068954674, R],
  [0.790861360187529, 0.03371134385890229, R],
  [0.05388629978940851, 0.7046017960752844, R],
  [0.11235113002758235, 0.22908978678220682, R],
  [0.10211070117330712, 0.8895526816287291, R],
  [0.9656611294071911, 0.558353391520664, R],
  [0.783844044276887, 0.8287886999499423, F],
  [0.1115740980414539, 0.6547493729760665, R],
  [0.49758986300780883, 0.015683368912356777, R],
  [0.13845847456215088, 0.6040168746001764, R],
  [0.6854952953147566, 0.49979631902766464, R],
  [0.6624741225216084, 0.35384181777697377, R],
  [0.9279925210652604, 0.8233063581695905, R],
  [0.8602175426304404, 0.10162779059085136, F],
  [0.6960693670918152, 0.7933290217182871, R],
  [0.7327152618253236, 0.3560835095717545, R],
  [0.5483141631266975, 0.1286981745807858, R],
  [0.27122636484893325, 0.12155641710001297, R],
  [0.9529412643430624, 0.7912304673718193, R],
  [0.9342061943717357, 0.9540024998062322, R],
  [0.5630145273461999, 0.7723023866566401, F],
  [0.6319092048411077, 0.9087531812232732, R],
  [0.8052916414798563, 0.7848382696760954, R],
  [0.19948100898110432, 0.9953983707106053, R],
  [0.5322933600712294, 0.8922883565189297, R],
  [0.4600723933941222, 0.579003170763293, R],
  [0.32759114956906643, 0.45053015418219866, R],
  [0.014764253603300137, 0.7279243888688636, R],
  [0.44815342769009736, 0.6161086509443292, R],
  [0.4730099458432784, 0.32406484100940136, F],
  [0.2444105127373577, 0.11756668405843973, R],
  [0.6598179235355508, 0.13927806394899034, R],
  [0.4264372976904154, 0.6645970583462892, R],
  [0.5347635418166494, 0.5285827789716602, R],
  [0.1701741954848468, 0.3979738459104112, R],
  [0.5084536775308091, 0.15021935981821377, R],
  [0.5907669275435008, 0.22946809974671267, F],
  [0.7005400767010717, 0.23842063282213877, R],
  [0.044254846555479954, 0.5623028554312408, R],
  [0.0440960966945787, 0.596914309818553, R],
  [0.50715810920303, 0.779670162889547, R],
  [0.6098768816762481, 0.5427651742702224, R],
  [0.9968144646576207, 0.5138398097122308, R],
  [0.16006242469881649, 0.12908290054813754, R],
  [0.06173527139062984, 0.6607988063163288, R],
  [0.2976023350660717, 0.16088793770116028, R],
  [0.4715550720363355, 0.4868341997712873, R],
  [0.5061395325166886, 0.15914125503972976, R],
  [0.5265785717876212, 0.7311269509534593, R],
  [0.7732652953149068, 0.16014983289547002, R],
  [0.08676083432525483, 0.3613149149987882, R],
  [0.0461078081401598, 0.8040160045412088, R],
  [0.06854611005101607, 0.3273482558481189, R],
  [0.7462470353271144, 0.6587138648251134, R],
  [0.8321082009416203, 0.06376713675281787, R],
  [0.8239486160594973, 0.23553542188123666, R],
  [0.061154779712605745, 0.14507714564154317, R],
  [0.9686966819157843, 0.04388878753044856, R],
  [0.28847433308564674, 0.7207692494203333, R],
  [0.10607313411439856, 0.2184930249792807, R],
  [0.43352776196890597, 0.002250294091968641, R],
  [0.6799854322796326, 0.9279493135377084, R],
  [0.21328959702038364, 0.23130694978395105, R],
  [0.5343672063379434, 0.009852145155063052, R],
  [0.6840348965582825, 0.10932689850334443, R],
  [0.9993327428906678, 0.14249155609793318, R],
  [0.4609216311807023, 0.9166137775050471, R],
  [0.28169162378702683, 0.4096585636522396, R],
  [0.12823135649209094, 0.5274533849949208, R],
  [0.48913165167005523, 0.42731129297323833, R],
  [0.607712694531902, 0.008281287474320775, R],
  [0.305816756171682, 0.7703419781975502, R],
  [0.7952436548239723, 0.7057875566598606, R],
  [0.05868527078805563, 0.747591114634826, R],
  [0.48939365768415555, 0.6697949140451895, R],
  [0.45218188727908526, 0.7794235868467416, R],
  [0.004519282194866081, 0.8426152217079854, R],
  [0.8128485625518138, 0.8778321293072822, R],
  [0.39343194656782265, 0.15707172225803978, R],
  [0.13299319516003538, 0.3396463584846847, R],
  [0.04688929303900835, 0.7021427751797609, R],
  [0.5466135510039498, 0.2617169306591671, R],
  [0.334102087521132, 0.13428964156830125, R],
  [0.6075572200948189, 0.013788148915541143, R],
  [0.302401984504056, 0.3295460796905372, R],
  [0.031782161218241844, 0.24407138127969552, R],
  [0.44997292454015714, 0.8024182801940929, F],
  [0.6279534335072658, 0.42743469251521216, R]
].map(([x, y, kind]) => Object.freeze([x, y, 0, kind])));

export const initialState = () => ({
  rabbitGrowthRate: 0.5, rabbitMobility: 0.03, foxGrowthRate: 0.5, foxMobility: 0.05, foxEndurance: 10, moving: false,
  ag: SAVED_AGENTS.map((a) => [...a]),
});

/** initialAgents[]: 100 agents at random places, each a fox with probability 0.1 (the browser's random source by default). */
export function initialAgents(rng = createRng({ seed: null })) {
  return Array.from({ length: 100 }, () => {
    const p = [rng.randomReal([0, 1]), rng.randomReal([0, 1])];
    return [...p, 0, rng.randomReal([0, 1]) < 0.1 ? Fox : Rabbit];
  });
}

/** Nearest[points][p][[1]]: the closest point (the first of equals), from a list that ends with the dummy point. */
function nearest(points, p) {
  let best = points[0], d = Infinity;
  for (const q of points) { const e = (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2; if (e < d) { d = e; best = q; } }
  return best;
}
const clip = (v) => Math.min(1, Math.max(0, v));

/**
 * updateAgents[agents, rabbitGrowthRate, rabbitMobility, foxGrowthRate, foxMobility, foxEndurance]: each agent in turn
 * takes a random step (RandomReal[{-m, m}, 2], clipped to the square); a rabbit survives if no fox (at the foxes' old
 * places) is within 0.02 of its new place, and then gets a copy with probability rabbitGrowthRate (1 − rabbits/500); a
 * fox that finds no rabbit within 0.02 goes hungry (dies when it has gone foxEndurance steps without food), one that
 * finds one is fed and gets a copy with probability foxGrowthRate (1 − foxes/500).
 */
export function updateAgents(agents, rgr, rmob, fgr, fmob, fend, rng) {
  const foxes = agents.filter((a) => a[3] === Fox), rabbits = agents.filter((a) => a[3] === Rabbit);
  const foxPop = foxes.length, rabbitPop = rabbits.length;
  const foxPts = [...foxes.map((a) => [a[0], a[1]]), dummyPoint];
  const rabbitPts = [...rabbits.map((a) => [a[0], a[1]]), dummyPoint];
  const out = [];
  for (const a of agents) {
    const m = a[3] === Rabbit ? rmob : fmob;
    const next = [clip(a[0] + rng.randomReal([-m, m])), clip(a[1] + rng.randomReal([-m, m]))];
    if (a[3] === Rabbit) {
      const q = nearest(foxPts, next);
      if (Math.hypot(q[0] - next[0], q[1] - next[1]) > 0.02) {
        out.push([...next, 0, Rabbit]);
        if (rng.randomReal([0, 1]) < rgr * (1 - rabbitPop / maxRabbits)) out.push([...next, 0, Rabbit]);
      }
    } else {
      const q = nearest(rabbitPts, next);
      if (Math.hypot(q[0] - next[0], q[1] - next[1]) > 0.02) {
        if (a[2] < fend) out.push([...next, a[2] + 1, Fox]); // starving but still survive
      } else {
        out.push([...next, 0, Fox]); // just ate rabbit(s) and survive
        if (rng.randomReal([0, 1]) < fgr * (1 - foxPop / maxFoxes)) out.push([...next, 0, Fox]);
      }
    }
  }
  return out;
}

/** visualize[agents]: the foxes (orange, 10 px), then the rabbits (purple) over them, in the unit square. */
export function visualize(agents) {
  const foxes = agents.filter((a) => a[3] === Fox).map((a) => [a[0], a[1]]);
  const rabbits = agents.filter((a) => a[3] === Rabbit).map((a) => [a[0], a[1]]);
  return [
    AbsolutePointSize(10), RGBColor(0.9, 0.42, 0.17), Annotation(Point(foxes.length ? foxes : [dummyPoint]), 'foxes'),
    AbsolutePointSize(10), RGBColor(0.48, 0.11, 0.56), Annotation(Point(rabbits.length ? rabbits : [dummyPoint]), 'rabbits'),
  ];
}

/** The Manipulate body: If[moving, ag = updateAgents[…]]; visualize[ag]. */
export function evaluate(state, ctx = {}) {
  let { ag } = state;
  if (state.moving) {
    ag = updateAgents(ag, state.rabbitGrowthRate, state.rabbitMobility, state.foxGrowthRate, state.foxMobility, state.foxEndurance, ctx.rng ?? createRng({ seed: 1 }));
  }
  const foxes = ag.filter((a) => a[3] === Fox).length;
  return { view: { foxes, rabbits: ag.length - foxes, agents: ag.length }, state: state.moving ? { ...state, ag } : state, graphics: visualize(ag) };
}
