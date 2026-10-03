#!/usr/bin/env wolframscript
(* SPDX-FileCopyrightText: 2026 Tico Hannan *)
(* SPDX-License-Identifier: MIT *)
(* tools/wolfram/mp-original.wls -- run the ORIGINAL motion-planning Demonstration headless.

   Usage (normally called by tools/compare-with-original.mjs):
     wolframscript -file tools/wolfram/mp-original.wls <notebook.nb> <scenes.json> <results.json> [imagesDir]

   What it does
   1. Reads the author notebook WITHOUT evaluating it (ReadList[..., Hold[Expression]]).
   2. Takes the original code exactly as stored in the published Manipulate output cell:
        Initialization :> ( ...all helper definitions... )
        "Body"         :> Quiet[Module[{...}, ...; Graphics[...]]]
      No code is retyped or translated; the stored expressions are evaluated as they are.
   3. Adds instrumentation only:
        - the single Graphics[...] at the end of the Body is wrapped so the Module's local
          variables (path, validity, C-obstacles, ...) are copied out just before drawing;
        - the outer Quiet is removed and messages go to a temporary stream instead, so the
          report can show which messages the original produced (values are not affected).
   4. For each scene: sets the Manipulate variables like the front end would (locators as machine
      reals), clears the original's change-detection caches (oldLocatorsO$$ etc.) so everything is
      recomputed, evaluates the Body, and records the results.
      A scene may carry a "prelude" (partial state evaluated first WITHOUT clearing the caches
      afterwards) to reproduce interactive history, e.g. obstacles placed while the robot was elsewhere.
   5. Writes JSON. Reals are written with 20 significant digits from their exact binary value, so a
      JavaScript reader gets the identical double (bit-exact comparison is possible).

   Licence note: this file is MIT. It contains none of the original Demonstration's code; it reads
   and runs the code from the notebook file you point it at. *)

$HistoryLength = 0;
Off[General::stop];

args = $ScriptCommandLine;
If[Length[args] < 4,
  Print["usage: wolframscript -file mp-original.wls <notebook.nb> <scenes.json> <results.json> [imagesDir]"];
  Exit[2]];
nbFile = args[[2]]; scenesFile = args[[3]]; outFile = args[[4]];
imagesDir = If[Length[args] >= 5 && StringLength[args[[5]]] > 0, args[[5]], None];
If[imagesDir =!= None && !DirectoryQ[imagesDir], CreateDirectory[imagesDir, CreateIntermediateDirectories -> True]];

say[s___] := (WriteString["stdout", s, "\n"]);
fail[s___] := (WriteString["stdout", "ERROR: ", s, "\n"]; Exit[3]);

say["Wolfram ", $Version];

(* ---------------------------------------------------------------- 1. read the notebook, held *)
If[!FileExistsQ[nbFile], fail["notebook not found: ", nbFile]];
held = Check[ReadList[nbFile, Hold[Expression]], $Failed];     (* messages (if any) are printed *)
If[!ListQ[held] || held === {},
  held = Quiet @ Check[{ToExpression[ReadString[nbFile], InputForm, Hold]}, $Failed]];
If[!ListQ[held] || held === {}, fail["could not read ", nbFile]];

(* ---------------------------------------------------------------- 2. stored code *)
inits = Cases[held, HoldPattern[RuleDelayed[Initialization, i_]] :> Hold[i], Infinity];
inits = Select[inits, !FreeQ[#, $CellContext`ConvexMinkowskiSumRev3] &];
bodies = Cases[held, HoldPattern[RuleDelayed["Body", b_]] :> Hold[b], Infinity];
bodies = Select[bodies, !FreeQ[#, $CellContext`robotobstconfig$] &];
If[inits === {}, fail["no Initialization with the planner definitions found in ", nbFile]];
If[bodies === {}, fail["no Manipulate \"Body\" found in ", nbFile]];
say["stored copies: Initialization ", Length[inits], " (distinct ", Length[Union[inits]], "), Body ",
  Length[bodies], " (distinct ", Length[Union[bodies]], ")"];

ReleaseHold[First[inits]];
If[DownValues[$CellContext`ConvexMinkowskiSumRev3] === {} || DownValues[$CellContext`myAstarRev2] === {},
  fail["Initialization did not define the planner functions"]];

(* ---------------------------------------------------------------- 3. instrumentation *)
body = First[bodies];
body = Replace[body, Hold[Quiet[m_]] :> Hold[m]];           (* messages -> our stream, see runBody *)
If[Count[body, HoldPattern[Graphics[___]], Infinity] =!= 1,
  fail["expected exactly one Graphics[...] in the Body, found ", Count[body, HoldPattern[Graphics[___]], Infinity]]];

SetAttributes[mpCapture, HoldAll];      (* inert while we splice it in *)
body = body /. HoldPattern[Graphics[g___]] :> mpCapture[{
    "path" -> $CellContext`path$,
    "robotinsideobstcond" -> $CellContext`robotinsideobstcond$,
    "obstCollision" -> $CellContext`obstCollision$,
    "configBoundary" -> $CellContext`configBoundary$,
    "robotobstconfig" -> $CellContext`robotobstconfig$,
    "obstaclepoly" -> $CellContext`obstaclepoly$,
    "robotStartPoly" -> $CellContext`robotStartPoly$,
    "robotEndPoly" -> $CellContext`robotEndPoly$,
    "borderpoly" -> $CellContext`borderpoly$,
    "allPoints" -> $CellContext`allPoints$,
    "allLines" -> $CellContext`allLines$,
    "startPoint" -> $CellContext`startPoint$,
    "endPoint" -> $CellContext`endPoint$,
    "noInterConfig" -> $CellContext`noInterConfig$,
    "discretePath" -> $CellContext`discretePath$$,
    "linesStarttoObstacles" -> $CellContext`linesStarttoObstacles$$,
    "linesEndtoObstacles" -> $CellContext`linesEndtoObstacles$$,
    "verticestoVertices" -> $CellContext`verticestoVertices$$
  }, Graphics[g]];
(* Defined only now, after the splice. The Module renames its local symbols inside mpCapture[...]
   too, so `data` holds the locals; evaluating it copies their values just before drawing. *)
mpCapture[data_, gr_] := (mpCaptured = Association[data]; gr);

(* ---------------------------------------------------------------- 4. scenes *)
num[s_String] := N[ToExpression[s]];   (* exact "m/2^k" strings from the Node tool -> the identical double *)
num[x_?NumericQ] := N[x];
pt[v_List] := num /@ v;

resetCaches[] := (
  $CellContext`oldLocatorsO$$ = Null; $CellContext`oldLocatorsR$$ = Null; $CellContext`nPrev$$ = Null;
  $CellContext`prevRobotobstconfig$$ = Null; $CellContext`prevObstaclepoly$$ = Null;
  $CellContext`prevRobotStartPoly$$ = Null; $CellContext`prevRobotEndPoly$$ = Null;
  $CellContext`prevVerticestoVertices$$ = Null; $CellContext`prevLinesStarttoObstacles$$ = Null;
  $CellContext`prevLinesEndtoObstacles$$ = Null; $CellContext`prevLineStarttoEnd$$ = Null;
  $CellContext`linesStarttoObstacles$$ = Null; $CellContext`linesEndtoObstacles$$ = Null;
  $CellContext`verticestoVertices$$ = Null; $CellContext`discretePath$$ = Null);

setScene[sc_Association] := (
  $CellContext`configOrWork$$ = Lookup[sc, "configOrWork", "workspace"];
  $CellContext`x$$ = Round[num[sc["x"]]];
  $CellContext`n$$ = Round[num[sc["n"]]];
  $CellContext`s$$ = 1;
  $CellContext`r1$$ = pt[sc["r1"]]; $CellContext`r2$$ = pt[sc["r2"]];
  $CellContext`o1$$ = pt[sc["o1"]]; $CellContext`o2$$ = pt[sc["o2"]];
  $CellContext`o3$$ = pt[sc["o3"]]; $CellContext`o4$$ = pt[sc["o4"]]);

runBody[limit_] := Module[{strm, file, res, t, txt},
  mpCaptured = Missing["NotReached"];
  strm = OpenWrite[];
  t = First @ AbsoluteTiming[
    res = Block[{$Messages = {strm}}, TimeConstrained[ReleaseHold[body], limit, $TimedOut]]];
  file = Close[strm];
  txt = Quiet @ Check[ReadString[file], ""];
  If[!StringQ[txt], txt = ""];
  Quiet @ DeleteFile[file];
  <|"result" -> res, "seconds" -> t, "messageText" -> txt|>];

messageNames[txt_String] := Union @ StringCases[txt, RegularExpression["[A-Za-z$][A-Za-z0-9$`]*::[A-Za-z0-9$]+"]];

(* ---------------------------------------------------------------- 5. JSON with exact reals *)
clip[s_String, k_Integer] := If[StringLength[s] > k, StringTake[s, k] <> "...", s];
fmtReal[x_] := Module[{q = SetPrecision[x, Infinity], d, e},   (* exact binary value of the double *)
  If[q == 0, "0.0",
    {d, e} = RealDigits[Abs[q], 10, 20];
    If[q < 0, "-", ""] <> "0." <> StringJoin[ToString /@ d] <> "e" <> ToString[e]]];
jsonChar[c_String] := Module[{k = First[ToCharacterCode[c, "Unicode"]]},
  Which[c === "\"", "\\\"", c === "\\", "\\\\", k == 10, "\\n", k == 13, "\\r", k == 9, "\\t",
    32 <= k <= 126, c, k < 65536, "\\u" <> IntegerString[k, 16, 4], True, "?"]];
toJSON[Null] = "null"; toJSON[True] = "true"; toJSON[False] = "false";
toJSON[s_String] := "\"" <> StringJoin[jsonChar /@ Characters[s]] <> "\"";
toJSON[x_Integer] := ToString[x];
toJSON[x_Real] := fmtReal[x];
toJSON[x_Rational] := fmtReal[N[x]];
toJSON[l_List] := "[" <> StringRiffle[toJSON /@ l, ","] <> "]";
toJSON[a_Association] := "{" <> StringRiffle[MapThread[(toJSON[ToString[#1]] <> ":" <> toJSON[#2]) &, {Keys[a], Values[a]}], ","] <> "}";
toJSON[x_Symbol] := If[MemberQ[Attributes[x], Temporary] || StringMatchQ[SymbolName[x], __ ~~ "$" ~~ DigitCharacter ..],
  "null",                                                     (* a Module local that was never assigned *)
  toJSON["WL:" <> ToString[x, InputForm]]];                   (* $Failed, Indeterminate, ... stay visible *)
toJSON[x_ /; NumericQ[x] && Im[x] == 0] := fmtReal[N[x]];
toJSON[x_] := toJSON[clip["WL:" <> ToString[x, InputForm], 2000]];   (* unevaluated / odd values *)

(* self-test of the number format: the written digits must read back as the identical double *)
fmtOK = And @@ Map[   (* compare exact values: SameQ on machine reals ignores the last bit *)
    SetPrecision[N[ToExpression[StringReplace[fmtReal[#], "e" -> "*^"]]], Infinity] === SetPrecision[#, Infinity] &,
  {0.1 + 0.2, 1/3., -1/Sqrt[2.], 1.*^-17, 2.75, -4.65, 123456.789}];
If[!fmtOK, say["WARNING: number formatting self-test failed; bit-exact comparisons will not be reliable"]];

(* ---------------------------------------------------------------- 6. run *)
input = Import[scenesFile, "RawJSON"];
If[!AssociationQ[input] || !ListQ[input["scenes"]], fail["bad scenes file ", scenesFile]];
limit = Lookup[input, "timeLimit", 60];
results = {};
imageProblem = None;

Do[
  Module[{sc = scene, pre, preRun = None, run, cap, res, rec, img},
    resetCaches[];
    pre = Lookup[sc, "prelude", None];
    If[AssociationQ[pre], setScene[Join[sc, pre]]; preRun = runBody[limit]];   (* history: caches NOT cleared *)
    setScene[sc];
    run = runBody[limit];
    res = run["result"]; cap = mpCaptured;
    rec = <|"id" -> sc["id"],
      "status" -> Which[
        preRun =!= None && Head[preRun["result"]] =!= Graphics, "prelude-failed",
        res === $TimedOut, "timeout", AssociationQ[cap] && Head[res] === Graphics, "ok", True, "error"],
      "seconds" -> run["seconds"],
      "messages" -> messageNames[run["messageText"]],
      "messageText" -> clip[run["messageText"], 3000]|>;
    If[AssociationQ[cap], rec = Join[rec, cap]];
    If[imagesDir =!= None && imageProblem === None && Head[res] === Graphics,
      img = Quiet @ Check[Export[FileNameJoin[{imagesDir, ToString[sc["id"]] <> ".png"}], res, "PNG"], $Failed];
      If[img === $Failed && imageProblem === None, imageProblem = "PNG export failed (needs the Wolfram front end)"; say["warning: ", imageProblem]]];
    say[ToString[sc["id"]], ": ", rec["status"], "  ", ToString[NumberForm[run["seconds"], {6, 2}]], " s",
      If[rec["messages"] =!= {}, "  messages: " <> StringRiffle[rec["messages"], ", "], ""]];
    AppendTo[results, rec]],
  {scene, input["scenes"]}];

out = <|"tool" -> "tools/wolfram/mp-original.wls", "wolframVersion" -> $Version,
  "versionNumber" -> $VersionNumber, "releaseNumber" -> $ReleaseNumber,
  "notebook" -> nbFile, "numberFormatSelfTest" -> fmtOK, "initCopies" -> Length[inits], "initDistinct" -> Length[Union[inits]],
  "bodyCopies" -> Length[bodies], "bodyDistinct" -> Length[Union[bodies]],
  "imageProblem" -> imageProblem, "scenes" -> results|>;
strm = OpenWrite[outFile, CharacterEncoding -> "ASCII"];
WriteString[strm, toJSON[out]];
Close[strm];
say["wrote ", outFile, " (", Length[results], " scenes)"];
Exit[0];
