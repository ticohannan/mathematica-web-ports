#!/usr/bin/env wolframscript
(* SPDX-FileCopyrightText: 2026 Tico Hannan
   SPDX-License-Identifier: MIT *)
(* tools/wolfram/extra-checks.wls — answers to leads (K- entries in the seven DESIGN.md files) that only Mathematica
   can settle. Plain Wolfram Language expressions; the only one taken from a Demonstration is ubPlot (K-UB-01), which
   repeats the Plot3D settings of the unit-balls original so that its automatic plot range can be measured.
   Round 1 (run by the owner in Mathematica 15.0.1 on 2026-10-06; follow-up checks are in extra-checks-2.wls).
   Run from the repository folder (writes test-output\extra-checks.txt and test-output\arc-test.png):
       wolframscript -file tools\wolfram\extra-checks.wls
   NOT RUN by the author's tool (no Mathematica available there): if a check prints $Failed or an unevaluated
   expression, that line is the answer to report, not a reason to stop. *)

$out = FileNameJoin[{Directory[], "test-output"}];
Quiet[CreateDirectory[$out]];
$log = OpenWrite[FileNameJoin[{$out, "extra-checks.txt"}], CharacterEncoding -> "UTF-8"];
emit[s_String] := (WriteString[$log, s, "\n"]; Print[s]);

SetAttributes[show, HoldRest];
show[id_String, desc_String, expr_] := Module[{r},
  r = Quiet@Check[expr, $Failed];
  emit["### " <> id <> " -- " <> desc];
  emit[ToString[r, InputForm]];
  emit[""]];

emit["extra-checks.wls run " <> DateString[] <> " on " <> $Version];
emit[""];

(* art-gallery *)
show["K-AG-04", "ColorData[100, \"ColorList\"] (guard colours)", ColorData[100, "ColorList"]];
show["K-AG-03", "Norm of a machine vector: 2.91547594742265 (dnrm2) or 2.9154759474226504 (correctly rounded)",
  Norm[{1.5, 2.5}]];
show["K-AG-08", "Position with reals differing in the last bit (pattern match tolerance)",
  {Position[{{0.1 + 0.2, 1.}}, {0.3, 1.}, 1, 1], SameQ[0.1 + 0.2, 0.3], MatchQ[0.1 + 0.2, 0.3]}];

(* unit-balls: automatic z range of the 2D mode's Plot3D, per p (K-UB-01) *)
ubPlot[p_] := Plot3D[{If[p < 100, (Abs[x]^p + Abs[y]^p)^(1/p), Max[Abs[x], Abs[y]]], 1}, {x, -1.5, 1.5}, {y, -1.5, 1.5},
  MaxRecursion -> 5, PlotStyle -> {Automatic, Opacity[0.5]}, PerformanceGoal -> "Quality", Exclusions -> None,
  Mesh -> None, Ticks -> None];
show["K-UB-01", "{p, PlotRange} of the 2D-mode Plot3D for each p",
  Table[{p, PlotRange /. AbsoluteOptions[ubPlot[p], PlotRange]}, {p, {1/4, 1/2, 1, 2, 3, 4, 9, 16, Infinity, 0.1, 0.5}}]];
show["K-UB-08", "FullForm of the plot label product Row[{p, \"-norm\"}] Invisible[1/2]",
  FullForm[Row[{0.5, "\[Hyphen]norm"}] Invisible[1/2]]];

(* car-paths: direction of Circle[c, r, {a0, a1}] with a1 < a0 (K-CP-01) *)
show["K-CP-01", "picture test-output/arc-test.png: LEFT Circle[{0,0},1,{Pi/2,0}] (decreasing), RIGHT Circle[{3,0},1,{0,Pi/2}]; red = start angle, blue = end angle",
  Export[FileNameJoin[{$out, "arc-test.png"}],
    Graphics[{Circle[{0, 0}, 1, {Pi/2, 0}], Circle[{3, 0}, 1, {0, Pi/2}],
      PointSize[Large], Red, Point[{0, 1}], Point[{4, 0}], Blue, Point[{1, 0}], Point[{3, 1}]},
      Axes -> True, PlotRange -> {{-1.3, 4.3}, {-1.3, 1.3}}, ImageSize -> 500]]];
show["K-CP-07", "Round[x, 0.01] display of a few values (string form as in a label)",
  {ToString[Round[24.0801, 0.01]], ToString[Round[669.68, .1]], ToString[Round[670.02, .1]], ToString[N[Round[20.6213, 0.01]]]}];

(* prm / prm-robot-arm: Nearest with a DistanceFunction, ties and the radius (K-PR-01), A* tie (Q-PR-01).
   v0.1.1: relabelled to the DESIGN.md IDs; the 2026-10-06 run printed them as K-PR-04 and K-PR-06. *)
show["K-PR-01", "tie order of Nearest[..., {10, 1.}, DistanceFunction -> f] (four points at distance 1, input order E N W S)",
  Nearest[{{1., 0.}, {0., 1.}, {-1., 0.}, {0., -1.}}, {0., 0.}, {10, 1.}, DistanceFunction -> (Sqrt[Total[(#1 - #2)^2]] &)]];
show["K-PR-01b", "same with the default distance", Nearest[{{1., 0.}, {0., 1.}, {-1., 0.}, {0., -1.}}, {0., 0.}, {10, 1.}]];
show["K-PR-01c", "is the radius in Nearest[..., {n, r}] inclusive? (point exactly at distance 1.)",
  Nearest[{{0.5, 0.}, {1., 0.}, {1.0000001, 0.}}, {0., 0.}, {10, 1.}, DistanceFunction -> (Sqrt[Total[(#1 - #2)^2]] &)]];
show["Q-PR-01", "First@@Position with two and with three equal minima (A* openSet tie)",
  {openSet = {7, 3}; openSet[[First @@ Position[{2., 2.}, 2.]]], First @@ Position[{2., 2., 2.}, 2.]}];

(* robot-singularities *)
show["K-RS-04", "SVD of the CNC arm's Jacobian (all singular values equal): which U Mathematica returns",
  SingularValueDecomposition[N@{{0, 1, 0}, {0, 0, 1}, {1, 0, 0}}]];
show["K-RS-05", "MatrixRank tolerance on tiny singular values",
  {MatrixRank[DiagonalMatrix[{1., 1.*^-13, 0.5}]], MatrixRank[DiagonalMatrix[{1., 1.*^-17, 0.5}]]}];
show["K-RS-10", "default Lighting of Graphics3D (AbsoluteOptions)", AbsoluteOptions[Graphics3D[Sphere[]], Lighting]];

(* seven-link: does Equal/Unequal on lists of reals use the tolerance (locOld != loc) *)
show["K-SL-04", "Unequal on point lists differing in the last bit", {{1., 2.} != {1. + 2.^-52, 2.}, {1., 2.} != {1.001, 2.}}];

Close[$log];
