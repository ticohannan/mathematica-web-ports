#!/usr/bin/env wolframscript
(* SPDX-FileCopyrightText: 2026 Tico Hannan
   SPDX-License-Identifier: MIT *)
(* tools/wolfram/export-control-reference.wls — reference values from Mathematica for the v0.1.37 control and signal
   ports and for the shared modules they use (shared/control.js, ode.js, numeric.js, control-plots.js). Plain Wolfram
   Language written for this project: the formulas are the textbook ones the ports implement; it contains no code of the
   Demonstrations. Each block is evaluated with Check, so one failure does not stop the others: a "$Failed" or a
   message in the output is itself the answer to report.
   Run from the repository folder (writes test-output\control-reference.json, about a minute):
       wolframscript -file tools\wolfram\export-control-reference.wls
   Owner to-do (v0.1.37): run it once and send the file; the ports' tests then compare against it.
   NOT RUN by the author's tool (no Mathematica in its sandbox). *)

$out = FileNameJoin[{Directory[], "test-output"}];
Quiet[CreateDirectory[$out]];
r6[x_] := If[NumericQ[x], N[Round[x, 10.^-10]], ToString[x, InputForm]];
cpx[z_] := {r6[Re[z]], r6[Im[z]]};
safe[expr_] := Check[expr, "$Failed: " <> ToString[$MessageList, InputForm]];
SetAttributes[safe, HoldFirst];

(* link budget: antenna gain 20 Log10[π D/λ], λ = 3*10^8/(fc 10^6) *)
gain[d_, fc_] := 20 Log10[(Pi d)/((3.*10^8)/(fc 10^6))];
lb = safe[Table[r6[gain[d, fc]], {d, {1, 0.08, 0.05, 0.2, 0.1, 2}}, {fc, {500, 1000, 2000, 2400}}]];

(* harmonic distortion: the DFT bins 0, 256, 512, 768 of the clipped and the polynomial output *)
x = Table[Sin[2 Pi 1000 i], {i, 0, 4095/16000, 1/16000}];
spec[z_] := (2/4096) Take[Abs[Fourier[z, FourierParameters -> {1, -1}]], 2048];
hd = safe[<|
  "poly" -> (r6 /@ spec[x + 0.4 x^2 + 0.2 x^3][[{1, 257, 513, 769}]]),
  "clip07" -> (r6 /@ spec[Clip[x, {-0.7, 0.7}]][[{1, 257, 513, 769, 1025}]])|>];

(* first-order response to a sine: which maximum FindMaximum[{f, 0.05 <= t <= 10}, {t, 0.05}] reaches *)
fo[a_, T_, w_][t_] := (a w T)/(w^2 T^2 + 1) Exp[-t/T] + a/Sqrt[w^2 T^2 + 1] Sin[w t - ArcTan[w T]];
foMax = safe[Table[With[{m = FindMaximum[{fo[3, 5, w][t], 0.05 <= t <= 10}, {t, 0.05}]}, {w, r6[m[[1]]], r6[t /. m[[2]]]}],
  {w, {0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5}}]];

(* OutputResponse: steps with dead time, second order with three dampings, a sine input *)
or1 = safe[Table[r6[First[OutputResponse[TransferFunctionModel[{{10 Exp[-2 s]}}, {{7 s + 1}}, s], UnitStep[t], t]] /. t -> tt], {tt, {1, 3, 9, 40}}]];
or2 = safe[Table[r6[First[OutputResponse[TransferFunctionModel[10 Exp[-2 s]/(49 s^2 + 14 z s + 1), s], UnitStep[t], t]] /. t -> tt],
  {z, {0.2, 1, 1.6, -0.05}}, {tt, {5, 20, 60}}]];
or3 = safe[Table[r6[Re[First[OutputResponse[TransferFunctionModel[(0.165 + 0.85 s)/(0.165 + 0.85 s + s^2), s], 0.1 Sin[2 Pi t], t]] /. t -> tt]],
  {tt, {0.5, 3, 7.75, 14.5}}]];

(* the integral criteria of the PI loop: Mathematica's NIntegrate as the Demonstration calls it, and with the kinks
   given as breakpoints (WorkingPrecision 20) *)
bb[q_] := InverseLaplaceTransform[1/s (q (1 + s))/(q + 5 s (1 + 3 s + 2 s^2)), s, t];
crit[q_] := With[{b = bb[q]}, {
  r6[Quiet@NIntegrate[Abs[1 - b], {t, 0, 5000}]], r6[Quiet@NIntegrate[(1 - b)^2, {t, 0, 5000}]], r6[Quiet@NIntegrate[t Abs[1 - b], {t, 0, 5000}]],
  r6[NIntegrate[Abs[1 - b], {t, 0, 400}, Method -> "LocalAdaptive", WorkingPrecision -> 20, MaxRecursion -> 30]],
  r6[NIntegrate[t Abs[1 - b], {t, 0, 400}, Method -> "LocalAdaptive", WorkingPrecision -> 20, MaxRecursion -> 30]]}];
ie = safe[Table[{q, crit[q]}, {q, {1, 1.25, 1.5, 2.1}}]];

(* NDSolve: the proportional and the PI temperature control, the nonlinear absorber, the two-mass suspension *)
pt = safe[Module[{sol}, sol = NDSolve[{100*4.19 TR'[t] == 10*4.19 (20 - TR[t]) + Q[t], Q'[t] == Max[0, 2500 + 300 (80 - Ts[t])] - Q[t],
    Ts'[t] == (TR[t] - Ts[t])/2, TR[0] == 20, Ts[0] == 20, Q[0] == 2500}, {TR, Q, Ts}, {t, 0, 150}];
  Table[r6[TR[tt] /. sol[[1]]], {tt, {2, 5, 10, 50, 150}}]]];
st = safe[Module[{sol, e}, e = 80 - TR[t];
  sol = NDSolve[{TR'[t] == 3/100 (Piecewise[{{20, t < 120}}, 40] - TR[t]) + Q[t]/100, Q'[t] == Max[0, 100 + 10 e + 10/4 int[t]] - Q[t],
    Ts'[t] == (TR[t] - Ts[t])/2, int'[t] == e, TR[0] == 20, Q[0] == 1, Ts[0] == 15, int[0] == 0}, {TR, Q, Ts, int}, {t, 0, 200}];
  Table[r6[TR[tt] /. sol[[1]]], {tt, {10, 50, 119, 125, 200}}]]];
as = safe[Module[{sol}, sol = NDSolve[{0.1 y''[t] + (1 - Exp[-10 y[t]^2]) y'[t] + y[t] == 0, y[0] == 0.1, y'[0] == 0.2}, y, {t, 0, 50}];
  Table[r6[y[tt] /. sol[[1]]], {tt, {1, 5, 20, 35}}]]];
qd = safe[Module[{sol, f}, f[tt_] := 80000 If[2 <= tt <= 3, 0.15 Sin[Pi (tt - 2)], 0];
  sol = NDSolve[{400 x1''[t] + 20000 (x1[t] - x2[t]) + 2000 (x1'[t] - x2'[t]) == 0,
    30 x2''[t] + 20000 (x2[t] - x1[t]) + 2000 (x2'[t] - x1'[t]) + 80000 x2[t] == f[t],
    x1[0] == 0, x1'[0] == 0, x2[0] == 0, x2'[0] == 0}, {x1, x2}, {t, 0, 10}];
  Table[r6[{x1[tt], x2[tt]} /. sol[[1]]], {tt, {2.5, 2.8, 3, 5}}]]];

(* root locus: the closed-loop poles of the three loops at four gains *)
zp = safe[Table[cpx /@ (s /. NSolve[Denominator[g] + k Numerator[g] == 0, s]),
  {g, {1/((s + 0.5) (s + 1) (s - 0.1)), 1/((s + 0.5) (s + 1)), (s - 0.3)/((s + 0.5) (s + 1) (s - 0.1))}}, {k, {0.2, 0.5, 0.628, 1}}]];

(* the feedback loop: margins, the automatic Bode range and the poles for four controllers *)
loop[kp_, ki_, kd_, z_] := TransferFunctionModel[(kp + ki/s + kd s) 1/(s^2 + 2 z s + 1), s];
fc = safe[Table[With[{L = loop @@ c}, <|"controller" -> c,
    "gain" -> (Map[r6, GainMargins[L], {2}]), "phase" -> (Map[r6, PhaseMargins[L], {2}]),
    "bodeRange" -> (r6 /@ (10^# & /@ (PlotRange /. AbsoluteOptions[First[BodePlot[L, PlotLayout -> "List"]], PlotRange])[[1]])),
    "poles" -> (cpx /@ Flatten[TransferFunctionPoles[SystemsModelFeedbackConnect[L]]])|>],
  {c, {{10, 3.73, 0.697, 0.77}, {2, 1, 0, 0.77}, {5, 0, 1, 0.3}, {1, 0, 0, 0.77}}}]];

data = <|"version" -> $Version, "linkBudgetGains" -> lb, "harmonicDistortion" -> hd, "firstOrderFindMaximum" -> foMax,
  "outputResponse" -> <|"fopdt" -> or1, "sopdt" -> or2, "quarterCar" -> or3|>, "integralCriteria" -> ie,
  "ndsolve" -> <|"proportionalTemperature" -> pt, "stirredTank" -> st, "activeShockAbsorber" -> as, "doubleSpring" -> qd|>,
  "rootLocus" -> zp, "feedbackLoop" -> fc|>;
file = FileNameJoin[{$out, "control-reference.json"}];
Export[file, data, "RawJSON", "Compact" -> True];
Print["wrote ", file, ", ", $Version];
