#!/usr/bin/env wolframscript
(* SPDX-FileCopyrightText: 2026 Tico Hannan
   SPDX-License-Identifier: MIT *)
(* tools/wolfram/extra-checks-2.wls — round 2 of the lead checks (v0.1.1), after the owner's first run of
   extra-checks.wls. Plain Wolfram Language expressions only; contains no code from the Demonstrations (the elbow
   manipulator's Jacobian for K-RS-05 is written out from standard kinematics, unit link lengths).
   Run from the repository folder (writes test-output\extra-checks-2.txt):
       wolframscript -file tools\wolfram\extra-checks-2.wls
   NOT RUN by the author's tool (no Mathematica available there): a line printing $Failed or an unevaluated
   expression is itself the answer to report. *)

$out = FileNameJoin[{Directory[], "test-output"}];
Quiet[CreateDirectory[$out]];
$log = OpenWrite[FileNameJoin[{$out, "extra-checks-2.txt"}], CharacterEncoding -> "UTF-8"];
emit[s_String] := (WriteString[$log, s, "\n"]; Print[s]);

SetAttributes[show, HoldRest];
show[id_String, desc_String, expr_] := Module[{r},
  r = Quiet@Check[expr, $Failed];
  emit["### " <> id <> " -- " <> desc];
  emit[ToString[r, InputForm]];
  emit[""]];

emit["extra-checks-2.wls run " <> DateString[] <> " on " <> $Version];
emit[""];

(* art-gallery: how far does the SameQ / pattern tolerance reach? (1 ulp was confirmed in round 1) *)
show["K-AG-08b", "SameQ, MatchQ, Position for 1, 2, 3 and 8 ulps above 1.5 (ulp of 1.5 = 2^-52)",
  Table[{k, SameQ[1.5, 1.5 + k 2^-52], MatchQ[1.5 + k 2^-52, 1.5], Position[{1.5 + k 2^-52}, 1.5]}, {k, {1, 2, 3, 8}}]];
(* art-gallery: which length does Normalize use? *)
show["K-AG-10", "Normalize vs v (1/Norm[v]): {Normalize, v/Norm, v (1/Norm)} of {1.5, 2.5}",
  {Normalize[{1.5, 2.5}], {1.5, 2.5}/Norm[{1.5, 2.5}], {1.5, 2.5} (1/Norm[{1.5, 2.5}])}];
show["K-AG-10b", "same for {0.3, -1.7} and {1.*^-3, 7.}",
  Table[{Normalize[v], v (1/Norm[v])}, {v, {{0.3, -1.7}, {1.*^-3, 7.}}}]];

(* robot-singularities: where is MatrixRank's cut-off? (round 1: 1e-13 -> rank 3, 1e-17 -> rank 2) *)
show["K-RS-05b", "MatrixRank[DiagonalMatrix[{1., x, .5}]] for x = 1.5e-16, 3e-16, 1e-15, 1e-14",
  Table[{x, MatrixRank[DiagonalMatrix[{1., x, .5}]]}, {x, {1.5*^-16, 3.*^-16, 1.*^-15, 1.*^-14}}]];
elbowJ[q1_, q2_, q3_] := N[{{-2 Cos[q2 + q3/2] Cos[q3/2] Sin[q1], -Cos[q1] (Sin[q2] + Sin[q2 + q3]), -Cos[q1] Sin[q2 + q3]},
  {2 Cos[q1] Cos[q2 + q3/2] Cos[q3/2], -Sin[q1] (Sin[q2] + Sin[q2 + q3]), -Sin[q1] Sin[q2 + q3]},
  {0, Cos[q2] + Cos[q2 + q3], Cos[q2 + q3]}}];
rankInfo[j_] := {MatrixRank[j], SingularValueList[j, Tolerance -> 0], MatrixRank[SingularValueDecomposition[j][[2]]/2]};
show["K-RS-05c", "elbow Jacobian, slider steps k = 119, 75, 101 (theta3 at the slider centre): port gives rank 2, sigma = 2.23606797749979, 1.3690942118573777, 3.309242227288563e-16",
  rankInfo[elbowJ[0.56548667764616312, -0.81681408993334603, 4.4408920985006262*^-16]]];
show["K-RS-05d", "elbow Jacobian, all three thetas at the slider centre: port gives rank 2, sigma = 2.236..., 2, 1.986e-16",
  rankInfo[elbowJ[4.4408920985006262*^-16, 4.4408920985006262*^-16, 4.4408920985006262*^-16]]];
show["K-RS-05e", "is the slider centre value -1.01 Pi + 101 (0.01 Pi) equal to 4.4408920985006262*^-16?",
  {-1.01 Pi + 101 (0.01 Pi), N[-1.01 Pi + 101 (0.01 Pi)] === 4.4408920985006262*^-16}];

Close[$log];
