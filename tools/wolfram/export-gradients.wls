#!/usr/bin/env wolframscript
(* SPDX-FileCopyrightText: 2026 Tico Hannan
   SPDX-License-Identifier: MIT *)
(* tools/wolfram/export-gradients.wls — exports the colour gradients of ColorData["Gradients"] for the port of
   "Voronoi Diagrams" (its "color scheme" menu is ColorData["Gradients"]). Plain Wolfram Language; contains no code from
   the Demonstrations. For each gradient: its colour function as text (usually Blend[{{x, RGBColor[...]}, ...}, #]&)
   and 65 samples (x = 0, 1/64, ..., 1) as RGB values, so the port can check its reading of the function.
   Run from the repository folder (writes test-output\gradients.json):
       wolframscript -file tools\wolfram\export-gradients.wls
   NOT RUN by the author's tool (no Mathematica in its sandbox): a $Failed or an error message is itself the answer
   to report. *)

$out = FileNameJoin[{Directory[], "test-output"}];
Quiet[CreateDirectory[$out]];
names = ColorData["Gradients"];
rgb[c_] := Round[List @@ ColorConvert[c, "RGB"][[1 ;; 3]], 10.^-6];
entry[g_] := <|
  "name" -> g,
  "function" -> ToString[ColorData[g, "ColorFunction"], InputForm],
  "samples" -> Table[rgb[ColorData[g][x]], {x, 0, 1, 1/64}]
|>;
data = <|"version" -> $Version, "count" -> Length[names], "gradients" -> (entry /@ names)|>;
file = FileNameJoin[{$out, "gradients.json"}];
Export[file, data, "RawJSON", "Compact" -> True];
Print["wrote ", file, ": ", Length[names], " gradients, ", $Version];
