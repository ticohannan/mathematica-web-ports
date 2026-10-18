#!/usr/bin/env wolframscript
(* SPDX-FileCopyrightText: 2026 Tico Hannan *)
(* SPDX-License-Identifier: MIT *)
(* tools/wolfram/manipulate-harness.wls -- run the code stored in a Manipulate output cell headless (no front end)
   and record what it computes, for golden tests of the web ports. Design: HARNESS-WL (requirement IDs HW-nn).

   Usage (normally started by tools/run-harness.mjs, which writes the wire file):
     wolframscript -file tools/wolfram/manipulate-harness.wls <notebook.nb> <scenarios.wire.json> <out.json> [options]
   Options
     --smoke            structure report, Initialization, one evaluation of the initial settings (HARNESS-WL 10.1)
     --self-check       structure report and one evaluation each of the initial settings, the live state and every
                        snapshot, listing the Manipulate variables that changed (HW-73, HW-74)
     --only=H-XX-nn,..  run only these scenarios
     --partial=FILE     append every finished scenario to FILE as one JSON line (HW-63)
     --images=DIR       export each scenario's final Body value to DIR/<id>.png (HW-57; needs a front end)
     --allow-multiple   accept several distinct copies of the stored code (uses copy 1, or --use-copy=n)
     --use-copy=n       use the n-th Manipulate output cell (HW-34)
     --front-end        allow UsingFrontEnd for %plotRange (HW-50 method 3)

   What it does (HARNESS-WL 5): reads the notebook HELD (ReadList[..., Hold[Expression]]: nothing is evaluated),
   finds the Manipulate output cell structurally, evaluates its stored Initialization once, assigns start states
   (initial settings = the stored "Variables", the live state of the DynamicModuleBox, or a snapshot's Settings),
   runs the scenario steps (set, drag, press, settle, seed, setFrom) by assigning the Manipulate variables and
   evaluating the stored Body -- instrumented only to copy captured locals out at the exit of their scope -- and
   writes JSON with bit-exact doubles (the self-tested writer of mp-original.wls).

   Licence note: this file is MIT. It contains none of the Demonstrations' code; it reads and runs the code from
   the notebook file it is given. *)

$HistoryLength = 0;
Off[General::stop];
hwToolVersion = "1.0.0";
hwStartTime = AbsoluteTime[];

(* ======================================================================== 0. console and options *)
hwAsciiLine[s_String] := StringJoin[Map[If[# < 128, FromCharacterCode[#], "\\u" <> IntegerString[#, 16, 4]] &,
    ToCharacterCode[s]]];
hwAsciiLine[s_] := hwAsciiLine[ToString[s, InputForm]];
hwSay[parts___] := WriteString["stdout",
    hwAsciiLine[StringJoin[Map[If[StringQ[#], #, ToString[#, InputForm]] &, {parts}]]], "\n"];
hwPhaseName = "start";
hwPhase[name_String] := (hwPhaseName = name; hwSay["[harness] ", name]);

hwArgs = $ScriptCommandLine;
If[!ListQ[hwArgs] || Length[hwArgs] < 4,
  hwSay["usage: wolframscript -file manipulate-harness.wls <notebook.nb> <scenarios.wire.json> <out.json> [options]"];
  Exit[2]];
hwScriptFile = hwArgs[[1]];
hwNbFile = hwArgs[[2]];
hwScenFile = hwArgs[[3]];
hwOutFile = hwArgs[[4]];
hwOpts = Drop[hwArgs, 4];
hwFlag[name_String] := MemberQ[hwOpts, "--" <> name];
hwOptValue[name_String, default_] := Module[{m = Select[hwOpts, StringStartsQ[#, "--" <> name <> "="] &]},
  If[m === {}, default, StringDrop[First[m], StringLength[name] + 3]]];
hwKnownOptions = {"smoke", "self-check", "only", "partial", "images", "allow-multiple", "use-copy", "front-end"};
Scan[Function[o, If[!MemberQ[hwKnownOptions, First[StringSplit[StringDrop[o, Min[2, StringLength[o]]], "=", 2], ""]],
    hwSay["warning: unknown option ", o]]], hwOpts];
hwMode = Which[hwFlag["smoke"], "smoke", hwFlag["self-check"], "self-check", True, "run"];
hwOnly = Select[StringSplit[hwOptValue["only", ""], ","], StringLength[#] > 0 &];
hwPartialFile = hwOptValue["partial", None];
hwImagesDir = hwOptValue["images", None];
hwAllowMultiple = hwFlag["allow-multiple"];
hwUseCopy = Quiet[Check[ToExpression[hwOptValue["use-copy", "0"]], 0]];
If[!IntegerQ[hwUseCopy], hwUseCopy = 0];
hwFrontEnd = hwFlag["front-end"];
(* first console line: the mode the harness actually runs in (tools/run-harness.mjs checks it against what it asked for) *)
hwSay["HARNESS-MODE: ", hwMode, "  (harness ", hwToolVersion, ", options ", StringRiffle[hwOpts, " "], ")"];
hwSay["Wolfram ", $Version];

(* ======================================================================== 1. JSON writer *)
(* strings: printable ASCII fast path, otherwise every character escaped (non-ASCII as \uXXXX) *)
hwJsonCode[k_Integer] := Which[k == 34, "\\\"", k == 92, "\\\\", k == 10, "\\n", k == 13, "\\r", k == 9, "\\t",
  32 <= k <= 126, FromCharacterCode[k],
  k < 65536, "\\u" <> IntegerString[k, 16, 4],
  True, With[{v = k - 65536},
    "\\u" <> IntegerString[55296 + Quotient[v, 1024], 16, 4] <> "\\u" <> IntegerString[56320 + Mod[v, 1024], 16, 4]]];
hwJStr[s_String] := If[StringMatchQ[s, RegularExpression["[ !#-\\[\\]-~]*"]],
  "\"" <> s <> "\"",
  "\"" <> StringJoin[Map[hwJsonCode, ToCharacterCode[s]]] <> "\""];
hwJStr[s_] := hwJStr[ToString[s, InputForm]];
hwClip[s_String, k_Integer] := If[StringLength[s] > k, StringTake[s, k] <> "...", s];

(* machine reals: the exact binary value with 20 significant digits, or InputForm once self-tested (mp-original) *)
hwFmtRealExact[x_] := Module[{q = SetPrecision[x, Infinity], d, e},
  If[q == 0, "0.0",
    {d, e} = RealDigits[Abs[q], 10, 20];
    If[q < 0, "-", ""] <> "0." <> StringJoin[Map[ToString, d]] <> "e" <> ToString[e]]];
hwFmtRealFast[x_] := Module[{t = StringReplace[ToString[x, InputForm], "*^" -> "e"]},
  t = StringReplace[t, "." ~~ "e" -> ".0e"];
  If[StringEndsQ[t, "."], t <> "0", t]];
hwFastOK = False;
hwFmtReal[x_] := If[hwFastOK && MachineNumberQ[x], hwFmtRealFast[x], hwFmtRealExact[x]];

(* records (our own structures): Association -> object, List -> array, hwRaw[json] -> as is *)
hwJ[a_Association] := "{" <> StringRiffle[KeyValueMap[Function[{k, v},
      hwJStr[If[StringQ[k], k, ToString[k, InputForm]]] <> ":" <> hwJ[v]], a], ","] <> "}";
hwJ[l_List] := "[" <> StringRiffle[Map[hwJ, l], ","] <> "]";
hwJ[hwRaw[s_String]] := s;
hwJ[s_String] := hwJStr[s];
hwJ[True] := "true";
hwJ[False] := "false";
hwJ[Null] := "null";
hwJ[None] := "null";
hwJ[x_Integer] := ToString[x];
hwJ[x_Real] := If[MachineNumberQ[x], hwFmtReal[x], hwEncode[x]];
hwJ[x_] := hwEncode[x];

(* ======================================================================== 2. encoding of Wolfram values (HW-45) *)
SetAttributes[hwSymFull, HoldAllComplete];
hwSymFull[s_Symbol] := Block[{$ContextPath = {"System`"}, $Context = "hwNoSuchContext`"},
  ToString[Unevaluated[s], InputForm]];
SetAttributes[hwSymName, HoldAllComplete];
hwSymName[s_Symbol] := SymbolName[Unevaluated[s]];
SetAttributes[hwIsTempSym, HoldAllComplete];
hwIsTempSym[s_Symbol] := MemberQ[Attributes[s], Temporary] ||
  StringMatchQ[SymbolName[Unevaluated[s]], __ ~~ "$" ~~ DigitCharacter ..];
hwNumOrNull[r_] := Module[{d = Quiet[N[r]]},
  Which[MachineNumberQ[d] && Head[d] === Real, hwFmtReal[d],
    MachineNumberQ[d] && Head[d] === Integer, hwFmtReal[N[d]],
    True, With[{e = Quiet[SetPrecision[r, MachinePrecision]]}, If[MachineNumberQ[e] && Head[e] === Real, hwFmtReal[e], "null"]]]];
(* integers: a plain JSON integer when |x| <= 2^53 - 1 (JavaScript's Number.isSafeInteger), else {"wl": digits} *)
hwEncInt[x_Integer] := If[Abs[x] <= 2^53 - 1, ToString[x], "{\"wl\":" <> hwJStr[ToString[x]] <> "}"];
hwEncReal[x_Real] := If[MachineNumberQ[x], hwFmtReal[x],
  "{\"wl\":" <> hwJStr[ToString[x, InputForm]] <> ",\"n\":" <> hwNumOrNull[x] <>
    ",\"precision\":" <> hwNumOrNull[Precision[x]] <> "}"];
hwEncComplex[z_] := "{\"wl\":" <> hwJStr[ToString[z, InputForm]] <> ",\"re\":" <> hwNumOrNull[Re[z]] <>
  ",\"im\":" <> hwNumOrNull[Im[z]] <> "}";
hwEncExact[x_] := Module[{n = Quiet[N[x]]},
  If[Head[n] === Complex, hwEncComplex[x],
    "{\"wl\":" <> hwJStr[ToString[x, InputForm]] <> ",\"n\":" <> hwNumOrNull[x] <> "}"]];
SetAttributes[hwEncSym, HoldAllComplete];
hwEncSym[s_Symbol] := Module[{full = hwSymFull[s]},
  Which[full === "True", "true", full === "False", "false", full === "Null", "null",
    full === "Indeterminate" || full === "ComplexInfinity", "{\"wl\":" <> hwJStr[full] <> "}",
    hwIsTempSym[s], "null",
    True, "{\"sym\":" <> hwJStr[full] <> "}"]];
SetAttributes[hwEncHead, HoldAllComplete];
hwEncHead[h_Symbol] := hwJStr[hwSymFull[h]];
hwEncHead[h_] := hwEnc[h];
SetAttributes[hwEncCompound, HoldAllComplete];
hwEncCompound[h_[args___]] := "{\"h\":" <> hwEncHead[h] <> ",\"a\":[" <>
  StringRiffle[Apply[List, Map[hwEnc, HoldComplete[args]]], ","] <> "]}";
hwEncAssoc[a_] := "{\"h\":\"Association\",\"a\":[" <> StringRiffle[KeyValueMap[Function[{k, v},
      "{\"h\":\"Rule\",\"a\":[" <> hwEncode[k] <> "," <> hwEncode[v] <> "]}"], a], ","] <> "]}";
hwEncOtherAtom[x_] := Which[
  Head[x] === SparseArray, "{\"h\":\"SparseArray\",\"normal\":" <> hwEncode[Normal[x]] <> "}",
  MemberQ[{"NumericArray", "RawArray", "ByteArray"}, ToString[Head[x]]],
    "{\"h\":" <> hwJStr[ToString[Head[x]]] <> ",\"normal\":" <> hwEncode[Normal[x]] <> "}",
  True, "{\"wl\":" <> hwJStr[hwClip[ToString[x, InputForm], 2000]] <> "}"];
SetAttributes[hwEnc, HoldAllComplete];
hwEnc[x_] := Which[
  Head[Unevaluated[x]] === Symbol, hwEncSym[x],
  Head[Unevaluated[x]] === Integer, hwEncInt[x],
  Head[Unevaluated[x]] === Real, hwEncReal[x],
  Head[Unevaluated[x]] === Rational, hwEncExact[x],
  Head[Unevaluated[x]] === Complex, hwEncComplex[x],
  Head[Unevaluated[x]] === String, hwJStr[x],
  Head[Unevaluated[x]] === List,
    "[" <> StringRiffle[Apply[List, Map[hwEnc, Apply[HoldComplete, Unevaluated[x]]]], ","] <> "]",
  AssociationQ[Unevaluated[x]], hwEncAssoc[x],
  AtomQ[Unevaluated[x]], hwEncOtherAtom[x],
  Head[Unevaluated[x]] === DirectedInfinity, "{\"wl\":" <> hwJStr[ToString[Unevaluated[x], InputForm]] <> "}",
  NumericQ[Unevaluated[x]], hwEncExact[x],
  True, hwEncCompound[x]];
hwEncode[v_] := hwEnc[v];

(* ======================================================================== 3. small utilities *)
hwSha[file_String] := Quiet[Check[IntegerString[FileHash[file, "SHA256"], 16, 64], Null]];
hwWriteText[file_String, text_String] := Module[{s = OpenWrite[file, CharacterEncoding -> "ASCII"]},
  WriteString[s, text]; Close[s]];
hwAppendLine[file_String, text_String] := Module[{s = OpenAppend[file, CharacterEncoding -> "ASCII"]},
  WriteString[s, text, "\n"]; Close[s]];
hwLexSort[l_List] := Module[{m = Max[Append[Map[Length, l], 0]]}, SortBy[l, PadRight[#, m, 0] &]];
(* positions of held expressions: the nearest ancestor (proper prefix) whose part matches a pattern *)
hwAncestor[expr_, p_List, test_] := Module[{r = None},
  Do[If[test[Extract[expr, Take[p, i], Hold]], r = Take[p, i]; Break[]], {i, Length[p] - 1, 1, -1}]; r];
hwInputString[x_] := ToString[x, InputForm];
hwKey[v_] := If[hwFastOK, ToString[v, InputForm], ToString[Quiet[SetPrecision[v, Infinity]], InputForm]];

(* exact real numbers on the wire: {"$r": "m*2^e"} (HW-07) *)
hwDecodeReal[s_String] := Module[{p = StringSplit[s, "*2^"], m, e},
  If[Length[p] =!= 2, $Failed,
    m = Quiet[Check[ToExpression[p[[1]]], $Failed]]; e = Quiet[Check[ToExpression[p[[2]]], $Failed]];
    If[!IntegerQ[m] || !IntegerQ[e], $Failed, If[m === 0, 0., N[m*2^e]]]]];
hwDecodeReal[_] := $Failed;
hwWireNumber[x_, default_] := Which[
  AssociationQ[x] && KeyExistsQ[x, "$r"], hwDecodeReal[x["$r"]],
  NumberQ[x], x, True, default];

(* ======================================================================== 3b. library: names, wl: code, messages, instrumentation *)
SetAttributes[hwSymEntry, HoldAllComplete];
hwSymEntry[s_Symbol] := {SymbolName[Unevaluated[s]], HoldComplete[s]};
hwListSymbols[h_] := Cases[h, (HoldPattern[(Set | SetDelayed)[s_Symbol, _]] | HoldPattern[s_Symbol]) :> hwSymEntry[s], {2}];
hwCollectSyms[h_] := DeleteDuplicates[Cases[h, s_Symbol :> HoldComplete[s], {0, Infinity}, Heads -> True]];
(* Module/With/Block scopes of a held Body, k = file (lexicographic) order, with depth, ancestors and locals *)
hwAnalyzeScopes[body_Hold] := Module[{pos = hwLexSort[Position[body, HoldPattern[(Module | With | Block)[_List, _]]]], scs},
  scs = MapIndexed[Function[{p, k}, <|"k" -> First[k], "pos" -> p, "kind" -> ToString[Extract[body, Append[p, 0]]],
       "locals" -> hwListSymbols[Extract[body, Append[p, 1], Hold]]|>], pos];
  Map[Function[sc, Module[{anc = Select[scs, hwIsPrefix[#["pos"], sc["pos"]] &]},
       Join[sc, <|"depth" -> Length[anc], "ancestors" -> Map[#["k"] &, anc],
         "parent" -> If[anc === {}, None, Last[SortBy[anc, Length[#["pos"]] &]]["k"]]|>]]], scs]];
hwIsPrefix[a_List, b_List] := Length[a] < Length[b] && Take[b, Length[a]] === a;
hwLocalJson[n_String] := If[StringEndsQ[n, "$"] && !StringEndsQ[n, "$$"], StringDrop[n, -1], n];
hwNamedChar[n_String] := Module[{c = Quiet[Check[ToExpression["\"\\[" <> n <> "]\""], $Failed]]},
  If[StringQ[c] && StringLength[c] == 1, c, "\\[" <> n <> "]"]];
hwUnescape[s_String] := StringReplace[s, "\\[" ~~ (n : Repeated[LetterCharacter | DigitCharacter]) ~~ "]" :> hwNamedChar[n]];
hwGreekNames = {"Alpha", "Beta", "Gamma", "Delta", "Epsilon", "CurlyEpsilon", "Zeta", "Eta", "Theta", "CurlyTheta",
  "Iota", "Kappa", "CurlyKappa", "Lambda", "Mu", "Nu", "Xi", "Omicron", "Pi", "CurlyPi", "Rho", "CurlyRho", "Sigma",
  "FinalSigma", "Tau", "Upsilon", "Phi", "CurlyPhi", "Chi", "Psi", "Omega", "CapitalAlpha", "CapitalBeta",
  "CapitalGamma", "CapitalDelta", "CapitalEpsilon", "CapitalZeta", "CapitalEta", "CapitalTheta", "CapitalIota",
  "CapitalKappa", "CapitalLambda", "CapitalMu", "CapitalNu", "CapitalXi", "CapitalOmicron", "CapitalPi", "CapitalRho",
  "CapitalSigma", "CapitalTau", "CapitalUpsilon", "CapitalPhi", "CapitalChi", "CapitalPsi", "CapitalOmega"};
hwGreekRules = SortBy[Select[Map[# -> hwNamedChar[#] &, hwGreekNames], StringLength[Last[#]] == 1 &], -StringLength[First[#]] &];
(* Wolfram's \[Phi] is U+03D5 and \[CurlyPhi] U+03C6 (\[Epsilon] U+03F5, \[CurlyEpsilon] U+03B5): a JSON name typed
   with the other code point is tried with the swapped letter *)
hwVariantRules = {FromCharacterCode[966] -> FromCharacterCode[981], FromCharacterCode[981] -> FromCharacterCode[966],
  FromCharacterCode[949] -> FromCharacterCode[1013], FromCharacterCode[1013] -> FromCharacterCode[949]};
hwNameCandidates[name_String] := Module[{b = hwUnescape[name], out, v, s},
  out = {{b, None}};
  v = StringReplace[b, hwVariantRules];
  If[v =!= b, AppendTo[out, {v, "unicode-variant"}]];
  s = StringReplace[b, hwGreekRules];
  If[s =!= b, AppendTo[out, {s, "spelled-out"}]];
  out];
hwParseWL[code_String] := Quiet[Check[Block[{$Context = "$CellContext`", $ContextPath = {"System`"}},
    ToExpression[code, InputForm, Hold]], $Failed]];
hwIterHeads = Alternatives[Table, Do, Sum, Product, Plot, Plot3D, ParametricPlot, ParametricPlot3D, ContourPlot,
  RegionPlot, RegionPlot3D, DensityPlot, NSum, NProduct, Integrate, NIntegrate, Array];
(* symbols the expression scopes itself: Module/With/Block lists, iterators, Function parameters -- left alone *)
hwBoundSyms[h_] := With[{ih = hwIterHeads}, DeleteDuplicates[Flatten[{
    Cases[h, HoldPattern[(Module | With | Block)[{vars___}, _]] :>
      Cases[HoldComplete[vars], (HoldPattern[(Set | SetDelayed)[s_Symbol, _]] | HoldPattern[s_Symbol]) :> HoldComplete[s], {1}], {0, Infinity}],
    Cases[h, HoldPattern[ih[_, iters__]] :> Cases[HoldComplete[iters], HoldPattern[{s_Symbol, ___}] :> HoldComplete[s], {1}], {0, Infinity}],
    Cases[h, HoldPattern[Function[s_Symbol, _, ___]] :> HoldComplete[s], {0, Infinity}],
    Cases[h, HoldPattern[Function[{vars___Symbol}, _, ___]] :> Apply[List, Map[HoldComplete, HoldComplete[vars]]], {0, Infinity}]}]]];
hwRule[HoldComplete[a_], HoldComplete[b_]] := (HoldPattern[a] :> b);
(* evaluate with messages going to a temporary stream (mp-original's method) instead of the console; names from
   $MessageList when a localized $MessageList works in this kernel (tested below), else from the stream text *)
hwMLWorks = False;
hwRunCapturing[expr_] := Module[{strm = OpenWrite[], r, ml = {}, file, txt},
  r = Block[{$Messages = {strm}},
    If[hwMLWorks, Block[{$MessageList = {}}, With[{v = CheckAbort[expr, $Aborted]}, ml = $MessageList; v]],
      CheckAbort[expr, $Aborted]]];
  file = Close[strm]; txt = Quiet[Check[ReadString[file], ""]]; If[!StringQ[txt], txt = ""]; Quiet[DeleteFile[file]];
  <|"result" -> r, "names" -> hwMessageNames[ml, txt], "text" -> txt|>];
SetAttributes[hwRunCapturing, HoldAll];
hwMessageNames[ml_, txt_String] := Module[{n = Quiet[Check[Map[ToString, ml], {}]]},
  If[ListQ[n] && n =!= {}, n, StringCases[txt, RegularExpression["[A-Za-z$][A-Za-z0-9$`]*::[A-Za-z0-9$]+"]]]];
(* texts of single messages: the stream text cut at each message name *)
hwMessageRecords[names_List, txt_String, extra_Association] := Module[{pos = 1, starts},
  starts = Map[Function[nm, With[{q = StringPosition[StringDrop[txt, pos - 1], nm <> ":", 1]},
       If[q === {}, None, pos = pos - 1 + q[[1, 1]] + 1; pos - 1]]], names];
  MapIndexed[Function[{nm, i}, With[{a = starts[[First[i]]],
       b = SelectFirst[Drop[starts, First[i]], IntegerQ, StringLength[txt] + 1]},
      Join[<|"name" -> nm, "text" -> If[IntegerQ[a], StringTrim[StringTake[txt, {a, Max[a, b - 1]}]], ""]|>, extra]]], names]];

hwAssign[HoldComplete[s_], v_] := (s = v);
hwAssignHeldValue[HoldComplete[s_], Hold[v_]] := (s = v);
hwScopeCaps = <||>; hwExits = <||>; hwEvalCount = 0;
SetAttributes[hwExit, HoldAll];
hwExit[k_, caps_, b_] := Module[{hwR}, hwR = b; hwStoreCaps[k, caps]; hwR];
hwStoreCaps[k_, Hold[l_]] := (hwExits[k] = Lookup[hwExits, k, 0] + 1; hwScopeCaps[k] = Association[l]);
SetAttributes[hwC, HoldRest];
hwC[label_, e_] := label -> Quiet[e];
SetAttributes[hwExitI, HoldAll];
hwOneCapHeld[{label_String, (Hold | HoldComplete)[e_]}] := Hold[hwC[label, e]];
hwInstrument[body_Hold, capsByScope_Association, scopes_List] := Module[{b = body, new},
  Do[With[{kk = k, pos = scopes[[k]]["pos"]},
      new = Replace[{Replace[Join @@ Map[hwOneCapHeld, capsByScope[k]], Hold[x___] :> Hold[{x}]], Extract[b, Append[pos, 2], Hold]},
        {Hold[c_], Hold[x_]} :> hwExitI[kk, Hold[c], x]];
      b = ReplacePart[b, Append[pos, 2] -> new]],
    {k, Reverse[Sort[Keys[capsByScope]]]}];
  b /. hwExitI -> hwExit];
(* the Dynamic setter of a custom control: evaluate the control function on Dynamic[var] as the front end does when it
   builds the control, take the first Dynamic[var, f] in the result (HW-25) *)
(* Dynamic[v, f] gives f; Dynamic[v, {f, fend}] and Dynamic[v, {fstart, f, fend}] give f, the function applied during
   a drag. The front end limits a dial's pointer to the dial's plot range before the setter runs (LocatorPane range,
   COMMON-DECISIONS 5, K-TC-04); the harness does NOT apply that clamp to custom controls -- scenarios give pointer
   values inside the dial. Messages while building the control are suppressed (Quiet), not treated as failure. *)
hwSetterFrom[fh_Hold, vh_HoldComplete] := Module[{made, setters},
  made = Quiet[Replace[{fh, vh}, {Hold[f_], HoldComplete[s_]} :> f[Dynamic[s]]]];
  setters = Replace[vh, HoldComplete[s_] :> Cases[made, HoldPattern[Dynamic[s, g_, ___]] :> Hold[g], {0, Infinity}]];
  setters = Replace[setters, {Hold[{_, f_, _}] :> Hold[f], Hold[{f_, _}] :> Hold[f]}, {1}];
  setters = Select[setters, !MatchQ[#, Hold[None | Automatic | Temporary]] &];
  If[setters === {}, None, First[setters]]];
hwApplySetter[setter_Hold, vh_HoldComplete, value_] := With[{val = value}, Replace[{setter, vh}, {Hold[g_], HoldComplete[s_]} :> g[val, s]]];

(* ======================================================================== 4. internal self-tests *)
hwSelfTests = <||>;
SetAttributes[hwTest, HoldRest];
hwTest[name_String, expr_] := Module[{r = Quiet[Check[TrueQ[expr], False]]},
  hwSelfTests[name] = r; If[!r, hwSay["SELF-TEST FAILED: ", name]]; r];

hwPhase["internal self-tests"];
(* number format (HW-46): the exact writer, then the fast InputForm path on 2 710 values *)
hwFmtOK = And @@ Map[
  SetPrecision[N[ToExpression[StringReplace[hwFmtRealExact[#], "e" -> "*^"]]], Infinity] === SetPrecision[#, Infinity] &,
  {0.1 + 0.2, 1/3., -1/Sqrt[2.], 1.*^-17, 2.75, -4.65, 123456.789}];
hwFastSample = BlockRandom[SeedRandom[20261016];
  Join[{0.1 + 0.2, 1/3., -1/Sqrt[2.], 1.*^-17, 2.75, -4.65, 2., -0.5, 1.*^20, 123456.789},
    RandomReal[{-10, 10}, 2000], RandomReal[{-1, 1}, 500] 10.^-12, RandomReal[{-1, 1}, 200] 10.^-300]];
hwFastOK = And @@ Map[With[{t = hwFmtRealFast[#]},
    !StringContainsQ[t, "`"] && StringMatchQ[t, RegularExpression["-?[0-9]+\\.[0-9]+(e-?[0-9]+)?"]] &&
    SetPrecision[N[ToExpression[StringReplace[t, "e" -> "*^"]]], Infinity] === SetPrecision[#, Infinity]] &, hwFastSample];
hwSelfTests["numberFormatExact"] = hwFmtOK;
hwSelfTests["numberFormatFast"] = hwFastOK;
hwSay["number format: ", If[hwFastOK, "fast (InputForm, self-tested on " <> ToString[Length[hwFastSample]] <> " values)",
  "exact digits (slower)"], If[hwFmtOK, "", "  WARNING: exact writer self-test FAILED"]];
hwTest["wire real 0.1", hwDecodeReal["3602879701896397*2^-55"] === 0.1 &&
  SetPrecision[hwDecodeReal["3602879701896397*2^-55"], Infinity] === SetPrecision[0.1, Infinity]];
hwTest["wire real -0.75", hwDecodeReal["-3*2^-2"] === -0.75];
hwTest["wire real 0", MachineNumberQ[hwDecodeReal["0*2^0"]] && hwDecodeReal["0*2^0"] == 0];
hwTest["wire real 2^60", hwDecodeReal["1*2^60"] === N[2^60]];
hwTest["json string", hwJStr["a\"b\\c\n"] === "\"a\\\"b\\\\c\\n\""];
hwTest["json string non-ASCII", hwJStr[FromCharacterCode[952] <> "1"] === "\"\\u03b81\""];
hwTest["encode list", hwEncode[{1, 2., "x", True, Null}] === "[1,2.0,\"x\",true,null]"];
hwTest["encode rational", hwEncode[1/2] === "{\"wl\":\"1/2\",\"n\":0.5}"];
hwTest["encode exact numeric", StringStartsQ[hwEncode[Pi/2], "{\"wl\":\"Pi/2\",\"n\":1.570796326794896"]];
hwTest["encode big integer", hwEncode[2^60] === "{\"wl\":\"1152921504606846976\"}"];
hwTest["encode compound", hwEncode[Hold[hwTestSymbolWithValue]] === "{\"h\":\"Hold\",\"a\":[{\"sym\":\"Global`hwTestSymbolWithValue\"}]}"];
hwTestSymbolWithValue = 5;
hwTest["encode held symbol with value", hwEncode[Hold[hwTestSymbolWithValue]] === "{\"h\":\"Hold\",\"a\":[{\"sym\":\"Global`hwTestSymbolWithValue\"}]}"];
hwTest["encode complex", StringStartsQ[hwEncode[1. + 2. I], "{\"wl\":"] && StringContainsQ[hwEncode[1. + 2. I], "\"im\":2.0"]];
hwTest["encode -0.5 and 1e-17", hwEncode[{-0.5, 1.*^-17}] === "[-0.5,1.0e-17]" || !hwFastOK];
hwTest["record writer", hwJ[<|"a" -> {1, 2.5}, "b" -> hwRaw["{}"], "c" -> "s"|>] === "{\"a\":[1,2.5],\"b\":{},\"c\":\"s\"}" || !hwFastOK];
(* the harness's own machinery on synthetic code (symbols in the test context hwT`), so that a failure of a Wolfram
   Language primitive the harness relies on is reported by name, before any notebook is involved *)
hwTest["lexicographic positions", hwLexSort[{{1, 2, 3}, {1, 3}, {1, 2}}] === {{1, 2}, {1, 2, 3}, {1, 3}}];
hwTest["named character escape", hwUnescape["\\[CapitalSigma]x"] === FromCharacterCode[931] <> "x"];
hwTest["spelled-out alias", MemberQ[hwNameCandidates["goalThetaloc"], {"goal" <> FromCharacterCode[952] <> "loc", "spelled-out"}]];
hwTest["unicode variant alias", MemberQ[hwNameCandidates[FromCharacterCode[966] <> "v"], {FromCharacterCode[981] <> "v", "unicode-variant"}]];
hwTest["wl: parse into $CellContext`", With[{h = hwParseWL["hwTestFreshName + 1"]},
  MatchQ[h, Hold[_Plus]] && MemberQ[Map[hwSymFull @@ # &, hwCollectSyms[h]], "$CellContext`hwTestFreshName"]]];
hwTest["wl: bound symbols (iterator, Module list)", Length[hwBoundSyms[hwParseWL["Module[{a = 1}, Table[a i, {i, 3}]]"]]] == 2];
hwTestMsg::x = "harness self-test message";
hwMLWorks = (Block[{$Messages = {}}, Block[{$MessageList = {}}, Message[hwTestMsg::x]; Map[ToString, $MessageList]]] === {"hwTestMsg::x"});
(* Message capture must be tested WITHOUT hwTest's Quiet[Check[...]]: inside Quiet a message is not issued at all (it
   reaches neither $Messages nor $MessageList), and Check would turn any message into False. Run 1 (2026-10-16) failed
   these two tests for that reason only; the capture itself worked (Det::luc recorded in motion planning). *)
hwSelfTestDetail = <||>;
SetAttributes[hwTestLoud, HoldRest];
hwTestLoud[name_String, expr_] := Module[{r = CheckAbort[TrueQ[expr], False]},
  hwSelfTests[name] = r; If[!r, hwSay["SELF-TEST FAILED: ", name]]; r];
hwMsgTestRun = hwRunCapturing[{1/0, Log[0, 0, 0]}];
hwMsgTestRecs = hwMessageRecords[hwMsgTestRun["names"], hwMsgTestRun["text"], <||>];
hwSelfTestDetail["messages"] = <|"names" -> hwMsgTestRun["names"], "text" -> hwClip[hwMsgTestRun["text"], 400],
  "records" -> Length[hwMsgTestRecs]|>;
hwTestLoud["messages captured with names", MemberQ[hwMsgTestRun["names"], "Power::infy"] &&
  StringContainsQ[hwMsgTestRun["text"], "Power::infy"]];
hwTestLoud["message texts cut per message", Length[hwMsgTestRecs] >= 2 && hwMsgTestRecs[[1]]["name"] === "Power::infy" &&
  StringStartsQ[hwMsgTestRecs[[1]]["text"], "Power::infy"] && !StringContainsQ[hwMsgTestRecs[[1]]["text"], hwMsgTestRecs[[2]]["name"] <> ":"]];
hwTest["held assignment", (hwAssignHeldValue[HoldComplete[hwT`sv], Hold[1 + 1]]; hwT`sv === 2) &&
  (hwAssign[HoldComplete[hwT`sv], {3., 4}]; hwT`sv === {3., 4})];
hwTestBody = Hold[Module[{hwT`a$ = 1, hwT`b$}, hwT`b$ = hwT`a$ + 1;
    With[{hwT`c = 3}, Module[{hwT`d$ = 10}, hwT`d$ + hwT`b$ hwT`c]]]];
hwTestScopes = hwAnalyzeScopes[hwTestBody];
hwTest["Body scopes found (Module, With, Module; depths 0, 1, 2)",
  Map[{#["kind"], #["depth"]} &, hwTestScopes] === {{"Module", 0}, {"With", 1}, {"Module", 2}} &&
  Map[#[[1]] &, hwTestScopes[[1]]["locals"]] === {"a$", "b$"}];
hwTest["instrumented Body: same value, locals copied out at scope exit (HW-39)", Module[{instr, r},
  instr = hwInstrument[hwTestBody, <|1 -> {{"a", HoldComplete[hwT`a$]}, {"b", HoldComplete[hwT`b$]}},
      3 -> {{"d", HoldComplete[hwT`d$]}, {"wl:d+b", Hold[hwT`d$ + hwT`b$]}}|>, hwTestScopes];
  hwScopeCaps = <||>; hwExits = <||>;
  r = ReleaseHold[instr];
  r === ReleaseHold[hwTestBody] && r === 16 && hwScopeCaps[1]["a"] === 1 && hwScopeCaps[1]["b"] === 2 &&
    hwScopeCaps[3]["d"] === 10 && hwScopeCaps[3]["wl:d+b"] === 12 && hwExits[3] === 1 && !KeyExistsQ[hwScopeCaps, 2]]];
hwScopeCaps = <||>; hwExits = <||>;
hwT`mk[Dynamic[hwT`pt_]] := LocatorPane[Dynamic[hwT`pt, (hwT`pt = Normalize[#]) &], Graphics[{Circle[]}]];
hwTest["custom control setter found and applied (HW-25)", With[{st = hwSetterFrom[Hold[hwT`mk[#] &], HoldComplete[hwT`pv]]},
  MatchQ[st, Hold[_Function]] && (hwApplySetter[st, HoldComplete[hwT`pv], {3., 4.}]; Max[Abs[hwT`pv - {0.6, 0.8}]] < 10^-12)]];
hwT`mk3[Dynamic[hwT`pt_]] := LocatorPane[Dynamic[hwT`pt, {None, (hwT`pt = 2 #) &, None}], Graphics[{Circle[]}]];
hwTest["setter in the {start, during, end} form uses 'during'", With[{st = hwSetterFrom[Hold[hwT`mk3[#] &], HoldComplete[hwT`pw]]},
  MatchQ[st, Hold[_Function]] && (hwApplySetter[st, HoldComplete[hwT`pw], 3]; hwT`pw === 6)]];
hwTest["tagged Throw/Catch", Catch[Throw["x", hwSelfTestTag]; "y", hwSelfTestTag] === "x"];
hwTest["bit-exact key distinguishes the last bit", hwKey[1.] =!= hwKey[1.0000000000000002] && hwKey[{1, 2.}] === hwKey[{1, 2.}]];
hwTest["held Dynamic is encoded unevaluated (HW-49)", StringContainsQ[hwEncode[Dynamic[hwTestSymbolWithValue]], "hwTestSymbolWithValue"]];

(* ======================================================================== 5. state of the run and fatal errors *)
hwStructure = <||>;
hwResults = {};
hwImageProblem = None;
hwTop[] := <|"schema" -> If[hwMode === "run", "manipulate-harness/results-1", "manipulate-harness/" <> hwMode <> "-1"],
  "mode" -> hwMode, "tool" -> "tools/wolfram/manipulate-harness.wls", "toolVersion" -> hwToolVersion,
  "toolSha256" -> hwSha[hwScriptFile], "wolframVersion" -> $Version, "versionNumber" -> $VersionNumber,
  "releaseNumber" -> $ReleaseNumber, "systemID" -> $SystemID,
  "runDate" -> hwRunDate[], "timeZone" -> $TimeZone,
  "notebook" -> <|"file" -> FileNameTake[hwNbFile], "sha256" -> hwSha[hwNbFile]|>,
  "scenarioFile" -> <|"file" -> FileNameTake[hwScenFile], "sha256" -> hwSha[hwScenFile]|>,
  "numberFormatSelfTest" -> (hwFmtOK && hwFastOK),
  "numberFormat" -> <|"exactWriter" -> hwFmtOK, "fastPath" -> hwFastOK, "fastSampleSize" -> Length[hwFastSample]|>,
  "internalSelfTest" -> hwSelfTests, "kernelFeatures" -> <|"localizedMessageList" -> hwMLWorks|>, "selfTestDetail" -> hwSelfTestDetail, "phase" -> hwPhaseName|>;
(* UTC, ISO 8601 ("2026-10-16T19:05:03Z"); falls back to local time without the Z if the conversion is unavailable *)
hwRunDate[] := Quiet[Check[DateString[TimeZoneConvert[Now, 0],
     {"Year", "-", "Month", "-", "Day", "T", "Hour", ":", "Minute", ":", "Second", "Z"}], DateString[Now, "ISODateTime"]]];
(* preliminary result file: written as soon as something is known and overwritten at the end, so a kernel that dies
   later still leaves the structure report and the phase it reached *)
hwWritePreliminary[] := Quiet[Check[hwWriteText[hwOutFile, hwJ[Join[hwTop[], <|"preliminary" -> True, "structure" -> hwStructure,
      "seconds" -> AbsoluteTime[] - hwStartTime|>]]], Null]];
hwFatal[msg_String] := Module[{out},
  hwSay["FATAL (", hwPhaseName, "): ", msg];
  out = Join[hwTop[], <|"fatal" -> msg, "structure" -> hwStructure, "scenarios" -> hwResults,
     "seconds" -> AbsoluteTime[] - hwStartTime|>];
  Quiet[Check[hwWriteText[hwOutFile, hwJ[out]], hwSay["could not write ", hwOutFile]]];
  Exit[3]];

(* ======================================================================== 6. scenario (wire) file *)
hwPhase["read scenario file"];
hwWire = Quiet[Check[Import[hwScenFile, "RawJSON"], $Failed]];
If[!AssociationQ[hwWire], hwFatal["cannot read the scenario wire file " <> hwScenFile]];
hwScenarios = Lookup[hwWire, "scenarios", {}];
If[!ListQ[hwScenarios], hwFatal["\"scenarios\" is not a list"]];
If[hwOnly =!= {}, hwScenarios = Select[hwScenarios, MemberQ[hwOnly, Lookup[#, "id", ""]] &];
  If[hwScenarios === {} && hwMode === "run", hwFatal["--only matched no scenario"]]];
hwFileTimeLimit = hwWireNumber[Lookup[hwWire, "timeLimit", 60], 60];
hwScenarioTimeLimit = hwWireNumber[Lookup[hwWire, "scenarioTimeLimit", 1800], 1800];
hwMaxStringChars = Lookup[hwWire, "maxStringChars", 5000000];
hwFileStart = Lookup[hwWire, "start", "initial"];
hwSay["scenarios: ", Length[hwScenarios], "  (app ", Lookup[hwWire, "app", "?"], ")"];

(* ======================================================================== 7. read the notebook held (HW-30) *)
hwPhase["read notebook"];
If[!FileExistsQ[hwNbFile], hwFatal["notebook not found: " <> hwNbFile]];
hwHeldList = Check[ReadList[hwNbFile, Hold[Expression]], $Failed];
If[!ListQ[hwHeldList] || hwHeldList === {},
  hwHeldList = Quiet[Check[{ToExpression[ReadString[hwNbFile], InputForm, Hold]}, $Failed]]];
If[!ListQ[hwHeldList] || hwHeldList === {} || !MatchQ[hwHeldList, {__Hold}], hwFatal["could not read " <> hwNbFile]];
hwNB = Join @@ hwHeldList;
hwNbText = Quiet[Check[ReadString[hwNbFile], ""]];
If[!StringQ[hwNbText], hwNbText = ""];
hwLineAt[charPos_Integer] := StringCount[StringTake[hwNbText, {1, Min[charPos, StringLength[hwNbText]]}], "\n"] + 1;

(* ======================================================================== 8. the Manipulate output cell (HW-31...34) *)
hwPhase["locate the Manipulate output cell"];
hwMBPositions = hwLexSort[Position[hwNB, HoldPattern[Manipulate`ManipulateBoxes[___]]]];
If[hwMBPositions === {}, hwFatal["no Manipulate output cell (Manipulate`ManipulateBoxes) in the notebook"]];
hwDMBOf[p_] := hwAncestor[hwNB, p, MatchQ[#, Hold[_DynamicModuleBox]] &];
hwMBRule[mb_Hold, key_String] := Cases[mb, HoldPattern[(RuleDelayed | Rule)[key, v_]] :> Hold[v], {2}];
hwCopies = Map[Function[p, Module[{d = hwDMBOf[p], mb = Extract[hwNB, p, Hold], dmb},
    dmb = If[d === None, Hold[], Extract[hwNB, d, Hold]];
    <|"mbPos" -> p, "dmbPos" -> d, "mb" -> mb, "dmb" -> dmb,
      "body" -> First[hwMBRule[mb, "Body"], None], "variables" -> First[hwMBRule[mb, "Variables"], None],
      "specs" -> First[hwMBRule[mb, "Specifications"], None], "options" -> First[hwMBRule[mb, "Options"], None],
      "init" -> If[d === None, None, First[Cases[dmb, HoldPattern[RuleDelayed[Initialization, v_]] :> Hold[v], {2}], None]]|>]],
  hwMBPositions];
hwCountDistinct[key_] := With[{l = DeleteCases[Map[#[key] &, hwCopies], None]}, <|"copies" -> Length[l], "distinct" -> Length[DeleteDuplicates[l]]|>];
hwStructure["copies"] = <|"manipulateCells" -> Length[hwCopies], "Body" -> hwCountDistinct["body"],
  "Initialization" -> hwCountDistinct["init"], "Specifications" -> hwCountDistinct["specs"], "Variables" -> hwCountDistinct["variables"]|>;
hwSay["stored copies: ", hwStructure["copies"]];
(* only a different Body or Initialization makes the copy matter; differing Specifications/Variables (an author notebook
   whose snapshots are full output cells, each with its own initial values) are reported and copy 1 is used *)
hwDistinctCode = Max[hwStructure["copies"]["Body"]["distinct"], hwStructure["copies"]["Initialization"]["distinct"]];
If[hwDistinctCode <= 1 && Max[hwStructure["copies"]["Specifications"]["distinct"], hwStructure["copies"]["Variables"]["distinct"]] > 1,
  hwStructure["copiesNote"] = "Body and Initialization identical in all copies; Specifications/Variables differ; copy 1 used";
  hwSay["note: ", hwStructure["copiesNote"]]];
If[hwUseCopy =!= 0 && !(1 <= hwUseCopy <= Length[hwCopies]),
  hwSay["warning: --use-copy=", hwUseCopy, " is out of range (the notebook has ", Length[hwCopies], " Manipulate output cells)"];
  hwFatal["--use-copy=" <> ToString[hwUseCopy] <> " is out of range 1.." <> ToString[Length[hwCopies]]]];
(* identical Body and Initialization in all copies: copy 1 is used *)
hwCopyIndex = Which[
  hwUseCopy >= 1 && hwUseCopy <= Length[hwCopies], hwUseCopy,
  hwDistinctCode > 1 && !hwAllowMultiple,
    hwFatal["the notebook holds " <> ToString[hwDistinctCode] <> " different copies of the stored Body or Initialization; choose one with --use-copy=n"],
  True, 1];
hwCopy = hwCopies[[hwCopyIndex]];
hwStructure["usedCopy"] = hwCopyIndex;
If[hwCopy["dmbPos"] === None, hwFatal["the Manipulate boxes are not inside a DynamicModuleBox"]];
If[hwCopy["body"] === None, hwFatal["no \"Body\" :> in the Manipulate output cell"]];
If[hwCopy["init"] === None, hwSay["note: the output cell has no Initialization"]];
hwDMB = hwCopy["dmb"];
hwLiveHeld = Extract[hwDMB, {1, 1}, Hold];
hwVariablesHeld = hwCopy["variables"];
hwSpecsHeld = If[hwCopy["specs"] === None, Hold[{}], hwCopy["specs"]];
hwOptionsHeld = If[hwCopy["options"] === None, Hold[{}], hwCopy["options"]];
hwInitHeld = hwCopy["init"];

(* Body preparation (HW-37): an outer Quiet goes, so messages reach the harness *)
hwBodyHeld = hwCopy["body"];
hwQuietRemoved = False;
If[MatchQ[hwBodyHeld, Hold[Quiet[_]]], hwBodyHeld = Replace[hwBodyHeld, Hold[Quiet[m_]] :> Hold[m]]; hwQuietRemoved = True];
If[MatchQ[hwBodyHeld, Hold[(Module | With | Block)[_List, Quiet[_]]]],
  hwBodyHeld = Replace[hwBodyHeld, Hold[(sc : (Module | With | Block))[l_List, Quiet[m_]]] :> Hold[sc[l, m]]]; hwQuietRemoved = True];
hwStructure["quietRemoved"] = hwQuietRemoved;
hwStructure["bodyHead"] = ToString[Extract[hwBodyHeld, {1, 0}]];

(* ======================================================================== 9. Manipulate variables, Body scopes, symbols *)
hwPhase["analyse variables and Body scopes"];
hwJsonOfVar[n_String] := If[StringEndsQ[n, "$$"], StringDrop[n, -2], n];
hwVarEntries = If[hwVariablesHeld === None,
  Select[hwListSymbols[hwLiveHeld], StringEndsQ[#[[1]], "$$"] && !StringMatchQ[#[[1]], __ ~~ "$" ~~ DigitCharacter .. ~~ "$$"] &&
    StringStartsQ[hwSymFull @@ #[[2]], "$CellContext`"] &],
  Select[hwListSymbols[hwVariablesHeld], StringEndsQ[#[[1]], "$$"] &]];
hwManip = Association[Map[hwJsonOfVar[#[[1]]] -> #[[2]] &, hwVarEntries]];
hwManipSymNames = Map[#[[1]] &, hwVarEntries];
If[Length[hwManip] == 0, hwFatal["no Manipulate variables found"]];
hwStructure["variables"] = Keys[hwManip];

hwScopes = hwAnalyzeScopes[hwBodyHeld];
hwLocalsByName = <||>;
Scan[Function[sc, Scan[Function[e, With[{nm = hwLocalJson[e[[1]]]},
      hwLocalsByName[nm] = Append[Lookup[hwLocalsByName, nm, {}], <|"k" -> sc["k"], "depth" -> sc["depth"], "sym" -> e[[2]]|>]]],
    sc["locals"]]], hwScopes];
hwOuterScope = If[hwScopes === {}, None, First[SortBy[hwScopes, {#["depth"], #["k"]} &]]["k"]];
hwStructure["scopes"] = Map[<|"k" -> #["k"], "kind" -> #["kind"], "depth" -> #["depth"], "parent" -> #["parent"],
    "locals" -> Map[Function[e, hwLocalJson[e[[1]]]], #["locals"]]|> &, hwScopes];

hwCellSymQ[hc_HoldComplete] := StringStartsQ[hwSymFull @@ hc, "$CellContext`"];
hwGlobals = <||>;
hwAddGlobals[h_] := Scan[Function[hc, With[{n = hwSymName @@ hc},
     If[hwCellSymQ[hc] && !StringEndsQ[n, "$"] && !KeyExistsQ[hwGlobals, n], hwGlobals[n] = hc]]], hwCollectSyms[h]];
If[hwInitHeld =!= None, hwAddGlobals[hwInitHeld]];

(* ======================================================================== 10. names: JSON -> symbols (HW-11, HW-12) *)
(* HW-12 shadowing: a name declared by several scopes resolves to the deepest one; two scopes at that depth (siblings,
   e.g. RRT's two Modules declaring parent) make the capture ambiguous (prelude-failed). The deepest scope wins even
   when the capture is meant for an outer one -- write name$ is not enough then; use a wl: capture in that scope. *)
hwLookupLocal[b_String] := Module[{l = Lookup[hwLocalsByName, b, {}], d, top},
  If[l === {}, Missing["none"],
    d = Max[Map[#["depth"] &, l]]; top = Select[l, #["depth"] == d &];
    If[Length[top] > 1, <|"kind" -> "local", "name" -> b, "ambiguous" -> Map[#["k"] &, top]|>,
      <|"kind" -> "local", "name" -> b, "scope" -> top[[1]]["k"], "sym" -> top[[1]]["sym"]|>]]];
hwManipRec[b_String] := <|"kind" -> "manipulate", "name" -> b, "sym" -> hwManip[b]|>;
hwLookupName[nm_String, mode_String] := Which[
  StringEndsQ[nm, "$$"], With[{b = StringDrop[nm, -2]}, If[KeyExistsQ[hwManip, b], hwManipRec[b], Missing["none"]]],
  mode === "capture" && StringEndsQ[nm, "$"], hwLookupLocal[StringDrop[nm, -1]],
  mode === "manip", If[KeyExistsQ[hwManip, nm], hwManipRec[nm], Missing["none"]],
  mode === "value", Which[KeyExistsQ[hwManip, nm], hwManipRec[nm],
    KeyExistsQ[hwGlobals, nm], <|"kind" -> "global", "name" -> nm, "sym" -> hwGlobals[nm]|>, True, Missing["none"]],
  True, Module[{r = hwLookupLocal[nm]},
    Which[AssociationQ[r], If[KeyExistsQ[hwManip, nm], Append[r, "clash" -> True], r],
      KeyExistsQ[hwManip, nm], hwManipRec[nm],
      KeyExistsQ[hwGlobals, nm], <|"kind" -> "global", "name" -> nm, "sym" -> hwGlobals[nm]|>,
      True, Missing["none"]]]];
hwResolve[name_String, mode_String] := Module[{r = Missing["none"]},
  Do[With[{x = hwLookupName[c[[1]], mode]}, If[AssociationQ[x], r = If[c[[2]] === None, x, Append[x, "alias" -> c[[1]] <> " (" <> c[[2]] <> ")"]]; Break[]]],
    {c, hwNameCandidates[name]}];
  r];
hwResolvedJson[r_Association] := KeyDrop[r, {"sym"}];

(* ======================================================================== 11. wl: expressions (HW-12) *)
(* mode "capture" (locals allowed) or "value"; returns <|"held", "scopes", "aliases", "fresh"|> or a failure string *)
hwMapWL[code_String, mode_String] := Module[{h = hwParseWL[code], bound, syms, rules = {}, scopes = {}, aliases = {}, fresh = {}},
  If[!MatchQ[h, Hold[_]], "cannot parse wl: expression " <> code,
  bound = hwBoundSyms[h];
  syms = Complement[hwCollectSyms[h], bound];
  Scan[Function[hc, Module[{full = hwSymFull @@ hc, n = hwSymName @@ hc, r},
      Which[
        StringStartsQ[full, "$CellContext`"],
          r = hwResolve[n, mode];
          If[AssociationQ[r] && KeyExistsQ[r, "sym"],
            If[r["sym"] =!= hc, AppendTo[rules, hwRule[hc, r["sym"]]]];
            If[r["kind"] === "local", AppendTo[scopes, r["scope"]]];
            If[KeyExistsQ[r, "alias"], AppendTo[aliases, n -> r["alias"]]],
            AppendTo[fresh, n]],
        !StringContainsQ[full, "`"] && (KeyExistsQ[hwManip, n] || (mode === "capture" && KeyExistsQ[hwLocalsByName, n])),
          r = hwResolve[n, mode];
          If[AssociationQ[r] && KeyExistsQ[r, "sym"],
            AppendTo[rules, hwRule[hc, r["sym"]]]; If[r["kind"] === "local", AppendTo[scopes, r["scope"]]]],
        True, Null]]], syms];
  <|"held" -> If[rules === {}, h, h /. rules], "scopes" -> DeleteDuplicates[scopes], "aliases" -> aliases, "fresh" -> fresh|>]];
(* the scope a wl: capture is spliced into: the deepest of its locals' scopes (one ancestor chain), else the outer one *)
hwScopeForWL[ks_List] := Module[{deep},
  If[ks === {}, hwOuterScope,
    deep = Last[SortBy[ks, hwScopes[[#]]["depth"] &]];
    If[AllTrue[ks, # === deep || MemberQ[hwScopes[[deep]]["ancestors"], #] &], deep, $Failed]]];

(* ======================================================================== 12. controls, buttons, setters (HW-10, HW-18, HW-25) *)
SetAttributes[hwManipNameOfSym, HoldAllComplete];
hwManipNameOfSym[s_Symbol] := With[{n = SymbolName[Unevaluated[s]]}, If[MemberQ[hwManipSymNames, n], StringDrop[n, -2], None]];
hwManipNameOfSym[_] := None;
SetAttributes[hwListHeaderName, HoldAllComplete];
hwListHeaderName[{{s_Symbol, ___}, ___}] := hwManipNameOfSym[s];
hwListHeaderName[{s_Symbol, ___}] := hwManipNameOfSym[s];
hwListHeaderName[_] := None;
hwSpecCandidates = Position[hwSpecsHeld, l_List /; hwListHeaderName[l] =!= None];
hwSpecPosOf = <||>;
Scan[Function[p, With[{n = Extract[hwSpecsHeld, p, hwListHeaderName]},
    If[StringQ[n] && (!KeyExistsQ[hwSpecPosOf, n] || Length[p] < Length[hwSpecPosOf[n]]), hwSpecPosOf[n] = p]]],
  hwSpecCandidates];
hwSpecElements[n_String] := If[KeyExistsQ[hwSpecPosOf, n],
  Rest[Cases[Extract[hwSpecsHeld, hwSpecPosOf[n], Hold], x_ :> Hold[x], {2}]], {}];
hwIsOptionH[h_Hold] := MatchQ[h, Hold[(Rule | RuleDelayed)[_Symbol, _]]];
hwControlInfo[n_String] := Module[{els = hwSpecElements[n], opts, non, ctype, info = <|"kind" -> "other"|>, lists},
  opts = Select[els, hwIsOptionH]; non = Select[els, !hwIsOptionH[#] &];
  ctype = Cases[opts, Hold[(Rule | RuleDelayed)[ControlType, t_]] :> ToString[Unevaluated[t]]];
  If[ctype =!= {}, info["controlType"] = First[ctype]];
  Which[
    Length[non] == 1 && MatchQ[First[non], Hold[_List]], info["kind"] = "values";
      info["values"] = Replace[Cases[First[non], x_ :> Hold[x], {2}], Hold[(Rule | RuleDelayed)[a_, _]] :> Hold[a], {1}],
    AnyTrue[non, MatchQ[#, Hold[_Function]] &], info["kind"] = "custom";
      info["function"] = First[Select[non, MatchQ[#, Hold[_Function]] &]]];
  If[MemberQ[ctype, "Locator"] || MemberQ[non, Hold[Locator]],
    lists = Select[non, MatchQ[#, Hold[_List]] &];
    info["kind"] = "locator";
    info["bounds"] = If[Length[lists] >= 2, Quiet[Map[ReleaseHold, Take[lists, 2]]], Automatic]];
  If[MemberQ[ctype, "None"], info["kind"] = "none"];
  info];
hwControls = Association[Map[# -> hwControlInfo[#] &, Keys[hwManip]]];
hwLabelString[l_] := If[StringQ[l], l, ToString[l, InputForm]];
hwButtons = Join[
  Cases[hwSpecsHeld, HoldPattern[Button[l_, a_, ___]] :> {hwLabelString[l], Hold[a]}, {0, Infinity}],
  Flatten[Cases[hwSpecsHeld, HoldPattern[ButtonBar[{r___}, ___]] :>
      Cases[Hold[{r}], HoldPattern[(RuleDelayed | Rule)[l_, a_]] :> {hwLabelString[l], Hold[a]}, {2}], {0, Infinity}], 1]];
hwStructure["controls"] = Map[Function[c, <|"kind" -> c["kind"], "controlType" -> Lookup[c, "controlType", None],
     "values" -> If[KeyExistsQ[c, "values"], Length[c["values"]], None],
     "bounds" -> If[KeyExistsQ[c, "bounds"], hwRaw[hwEncode[c["bounds"]]], None]|>], hwControls];
hwStructure["buttons"] = Map[First, hwButtons];
hwStructure["options"] = Cases[hwOptionsHeld, x_ :> ToString[Unevaluated[x], InputForm], {2}];
hwSynchronousFalse = !FreeQ[hwOptionsHeld, HoldPattern[SynchronousUpdating -> False]];
hwStructure["synchronousUpdatingFalse"] = hwSynchronousFalse;

(* ======================================================================== 13. snapshots (HW-27, HW-29) *)
hwPhase["snapshots"];
hwSettingsPos = Select[hwLexSort[Position[hwNB, HoldPattern[RuleDelayed["Settings", _List]]]],
  hwAncestor[hwNB, #, MatchQ[#, Hold[(Rule | RuleDelayed)[TaggingRules, _]]] &] =!= None &];
hwSettingsTextPos = Quiet[Check[StringPosition[hwNbText, RegularExpression["\"Settings\"\\s*:>\\s*\\{"]], {}]];
hwSnapshots = MapIndexed[Function[{p, k}, Module[{cell = hwAncestor[hwNB, p, MatchQ[#, Hold[_Cell]] &], tags = {}},
     If[cell =!= None, tags = Cases[Extract[hwNB, cell, Hold], HoldPattern[Rule[CellTags, t_]] :> ToString[t, InputForm], {2}]];
     <|"k" -> First[k], "settings" -> Extract[hwNB, Append[p, 2], Hold], "cellTags" -> tags,
       "line" -> If[Length[hwSettingsTextPos] == Length[hwSettingsPos], hwLineAt[hwSettingsTextPos[[First[k], 1]]], None]|>]],
  hwSettingsPos];
hwSettingsNames[h_Hold] := Cases[h, HoldPattern[Set[s_Symbol, _]] :> SymbolName[Unevaluated[s]], {2}];
hwStructure["snapshots"] = Map[Function[sn, With[{names = hwSettingsNames[sn["settings"]]},
     <|"k" -> sn["k"], "line" -> sn["line"], "cellTags" -> sn["cellTags"], "variables" -> names,
       "extraSettings" -> Complement[names, Keys[hwManip]], "missingSettings" -> Complement[Keys[hwManip], names]|>]], hwSnapshots];
hwSay["Manipulate variables ", Length[hwManip], ", Body scopes ", Length[hwScopes], ", snapshots ", Length[hwSnapshots],
  ", buttons ", Length[hwButtons]];

(* Typeset`specs$$ cross-check (HW-32): same variables, same order? *)
hwTypesetVars = Cases[hwLiveHeld, HoldPattern[Set[Typeset`specs$$, v_]] :>
   Cases[Hold[v], HoldPattern[Hold[s_Symbol]] :> SymbolName[Unevaluated[s]], {0, Infinity}], {2}];
hwTypesetVars = If[hwTypesetVars === {}, {}, Map[hwJsonOfVar, First[hwTypesetVars]]];
hwStructure["typesetSpecs"] = <|"variables" -> hwTypesetVars, "sameVariables" -> (Sort[hwTypesetVars] === Sort[Keys[hwManip]]),
  "sameOrder" -> (hwTypesetVars === Keys[hwManip])|>;
hwWritePreliminary[];

(* ======================================================================== 14. Initialization (HW-35) and definitions (HW-36) *)
hwPhase["evaluate the stored Initialization"];
hwInitTimeLimit = hwWireNumber[Lookup[hwWire, "initTimeLimit", 600], 600];
hwInitRun = If[hwInitHeld === None, <|"result" -> Null, "names" -> {}, "text" -> ""|>,
  hwRunCapturing[TimeConstrained[ReleaseHold[hwInitHeld], hwInitTimeLimit, hwInitTimedOutTag]]];
hwStructure["initializationProblem"] = Which[
  hwInitRun["result"] === hwInitTimedOutTag, "the Initialization did not finish within " <> ToString[hwInitTimeLimit] <> " s",
  hwInitRun["result"] === $Aborted, "the Initialization was aborted",
  True, None];
If[StringQ[hwStructure["initializationProblem"]], hwSay["PROBLEM: ", hwStructure["initializationProblem"]]];
hwStructure["initializationMessages"] = hwMessageRecords[hwInitRun["names"], hwInitRun["text"], <||>];
hwSay["Initialization: ", Length[hwInitRun["names"]], " message(s)",
  If[hwInitRun["names"] === {}, "", "  " <> StringRiffle[DeleteDuplicates[hwInitRun["names"]], ", "]]];

hwDefinitions = Map[If[StringStartsQ[#, "wl:"], StringDrop[#, 3], #] &, Lookup[hwWire, "definitions", {}]];
(* a definition that does not parse, fails or produces messages is recorded; every scenario is then prelude-failed
   (HW-55), smoke and self-check continue *)
hwDefinitionMessages = {};
hwDefinitionProblems = {};
If[hwDefinitions =!= {}, hwPhase["evaluate the scenario file's definitions"]];
MapIndexed[Function[{code, i}, Module[{h = hwParseWL[code], run},
    If[!MatchQ[h, Hold[_]],
      AppendTo[hwDefinitionProblems, "definition " <> ToString[First[i]] <> " does not parse: " <> hwClip[code, 200]],
      hwAddGlobals[h];
      run = hwRunCapturing[ReleaseHold[h]];
      hwDefinitionMessages = Join[hwDefinitionMessages, run["names"]];
      If[run["names"] =!= {} || run["result"] === $Failed || run["result"] === $Aborted,
        AppendTo[hwDefinitionProblems, "definition " <> ToString[First[i]] <> " failed" <>
          If[run["names"] === {}, "", " with messages " <> StringRiffle[run["names"], ", "]]]]]]],
  hwDefinitions];
hwStructure["definitions"] = <|"count" -> Length[hwDefinitions], "messages" -> hwDefinitionMessages, "problems" -> hwDefinitionProblems|>;
If[hwDefinitionProblems =!= {}, hwSay["PROBLEM: ", StringRiffle[hwDefinitionProblems, "; "]]];
hwWritePreliminary[];

(* every $CellContext` function the Body calls has definitions (HW-35) *)
hwBodyHeads = DeleteDuplicates[Cases[hwBodyHeld, (h_Symbol)[___] :> HoldComplete[h], {0, Infinity}]];
hwUndefinedHeads = Select[hwBodyHeads, Function[hc, hwCellSymQ[hc] && !StringEndsQ[hwSymName @@ hc, "$"] &&
     Replace[hc, HoldComplete[s_] :> (DownValues[s] === {} && SubValues[s] === {} && OwnValues[s] === {} && UpValues[s] === {})]]];
hwStructure["bodyHeadsUndefined"] = Map[hwSymName @@ # &, hwUndefinedHeads];
If[hwUndefinedHeads =!= {}, hwSay["note: Body heads without definitions: ", hwStructure["bodyHeadsUndefined"]]];

(* ======================================================================== 15. hooks: ControlActive (HW-24), random draws (HW-52), tracing (HW-43) *)
hwPhase["install hooks"];
hwCAKernel = <|"attributes" -> Map[ToString, Attributes[ControlActive]],
  "value12" -> hwRaw[hwEncode[Quiet[ControlActive[1, 2]]]]|>;
hwCASide = 0;
hwCABlockWorks = Quiet[Check[Block[{ControlActive = Function[Null, If[hwCAActive, #1, #2], HoldAll], hwCAActive = True},
     ControlActive[1, hwCASide = 1]], $Failed]] === 1 && hwCASide === 0;
If[!hwCABlockWorks,
  hwSay["warning: Block override of ControlActive did not work; using a conditional definition"];
  Unprotect[ControlActive];
  ControlActive[a_, b_] /; TrueQ[hwCAOn] := If[TrueQ[hwCAActive], a, b];
  Protect[ControlActive]];
hwCAKernel["blockOverride"] = hwCABlockWorks;
hwSelfTests["controlActive override"] = hwCABlockWorks;
SetAttributes[hwWithCA, HoldRest];
hwWithCA[a_, expr_] := If[hwCABlockWorks,
  Block[{ControlActive = Function[Null, If[hwCAActive, #1, #2], HoldAll], hwCAActive = TrueQ[a]}, expr],
  Block[{hwCAOn = True, hwCAActive = TrueQ[a]}, expr]];

hwRandomOn = False; hwInRandom = False;
hwDraws = <||>; hwDrawN = 0; hwCurStep = 0; hwCurEval = 0;
hwRecordDraw[fn_String, args_List, r_] := (hwDrawN++; hwDraws[hwDrawN] = {fn, args, r, hwCurStep, hwCurEval});
hwInstallRandom[name_String] := With[{f = Symbol[name], nm = name},
  Unprotect[f];
  f[args___] /; (TrueQ[hwRandomOn] && !TrueQ[hwInRandom]) :=
    Block[{hwInRandom = True}, With[{r = f[args]}, hwRecordDraw[nm, {args}, r]; r]];
  Protect[f]];
Scan[hwInstallRandom, {"RandomReal", "RandomInteger", "RandomChoice", "RandomSample", "RandomVariate", "RandomPoint"}];
hwTest["random draws recorded, stream unchanged", Module[{a, b},
  a = BlockRandom[SeedRandom[7]; {RandomReal[], RandomInteger[{1, 9}], RandomReal[{-1., 1.}, 2]}];
  hwDraws = <||>; hwDrawN = 0;
  b = BlockRandom[SeedRandom[7]; Block[{hwRandomOn = True}, {RandomReal[], RandomInteger[{1, 9}], RandomReal[{-1., 1.}, 2]}]];
  With[{ok = (hwKey[a] === hwKey[b]) && hwDrawN == 3}, hwDraws = <||>; hwDrawN = 0; ok]]];

hwTraceOn = False; hwTraceCount = 0; hwTraceSeen = <||>; hwTraceRecs = <||>;
hwTraceLimit = Lookup[hwWire, "traceLimit", 300000];
hwTraceRecord[name_, args_, r_] := If[hwTraceOn && hwTraceCount < hwTraceLimit,
  With[{key = name <> ToString[args, InputForm]},
    If[!KeyExistsQ[hwTraceSeen, key], hwTraceSeen[key] = True; hwTraceCount++; hwTraceRecs[hwTraceCount] = {name, args, r}]]];
hwInstallUserTrace[name_String] := With[{f = Symbol["$CellContext`" <> name], g = Symbol["hwOrig`" <> name]},
  If[DownValues[f] === {}, hwSay["warning: cannot trace ", name, " (no DownValues)"],
    DownValues[g] = Replace[DownValues[f], (Verbatim[HoldPattern][lhs_] :> rhs_) :> ((HoldPattern[lhs] /. f -> g) :> rhs), {1}];
    DownValues[f] = {};
    With[{ff = f, gg = g, nm = name},
      ff[args___] := With[{r = gg[args]}, hwTraceRecord[nm, {args}, r]; r /; Head[Unevaluated[r]] =!= gg]]]];
hwGuardAny = False;
hwInstallSystemTrace[name_String] := With[{f = Symbol[name], nm = name},
  Unprotect[f];
  f[args___] /; (hwTraceOn && !hwGuardAny && VectorQ[Flatten[{args}], MachineNumberQ]) :=
    Block[{hwGuardAny = True}, With[{r = f[args]}, hwTraceRecord[nm, {args}, r]; r]];
  Protect[f]];
Scan[hwInstallUserTrace, Lookup[hwWire, "traceFunctions", {}]];
Scan[hwInstallSystemTrace, Lookup[hwWire, "traceSystemFunctions", {}]];

(* probes, probe formulas, built-in definitions, wlChecks (HW-43, as mp-original) *)
hwDeepNum[x_Association] := hwWireNumber[x, $Failed];
hwDeepNum[x_String] := Quiet[N[ToExpression[x]]];
hwDeepNum[x_List] := Map[hwDeepNum, x];
hwDeepNum[x_] := N[x];
hwProbes = Lookup[hwWire, "probes", <||>];
hwProbeResults = Association[KeyValueMap[Function[{fn, argLists},
     fn -> Map[Function[a, hwRaw[hwEncode[Quiet[Apply[Symbol[fn], hwDeepNum[a]]]]]], argLists]], hwProbes]];
hwProbeFormulas = Lookup[hwWire, "probeFormulas", <||>];
hwProbeFormulaResults = Association[KeyValueMap[Function[{fn, forms}, fn -> Association[Map[Function[form,
        form -> With[{f = ToExpression[form], argsN = Map[hwDeepNum, Lookup[hwProbes, fn, {}]]},
          Count[Map[Function[a, Quiet[SetPrecision[Apply[f, a], Infinity] === SetPrecision[Apply[Symbol[fn], a], Infinity]]], argsN], True]]],
       forms]]], KeyTake[hwProbeFormulas, Keys[hwProbes]]]];
hwBuiltinDefinitions = Association[Map[# -> Quiet[Check[With[{sym = Symbol[#]},
       Unprotect[sym]; ClearAttributes[sym, ReadProtected]; Protect[sym];
       hwClip[ToString[Definition[sym], InputForm], 6000]], "unavailable"]] &, Lookup[hwWire, "inspectDefinitions", {}]]];
hwWlChecks = Association[KeyValueMap[#1 -> Quiet[hwClip[Block[{$Context = "$CellContext`"}, ToString[ToExpression[#2], InputForm]], 20000]] &,
   Lookup[hwWire, "wlChecks", <||>]]];

(* ======================================================================== 16. state isolation (HW-38) *)
hwPhase["save the post-Initialization state"];
hwSaveDefs[hc_HoldComplete] := Replace[hc, HoldComplete[s_] :> {hc, Attributes[s], OwnValues[s], DownValues[s], SubValues[s],
    UpValues[s], DefaultValues[s], FormatValues[s], NValues[s]}];
hwRestoreDefs[{HoldComplete[s_], attr_, ov_, dv_, sv_, uv_, dfv_, fv_, nv_}] := (
  Quiet[Unprotect[s]]; Quiet[ClearAll[s]];
  OwnValues[s] = ov; DownValues[s] = dv; SubValues[s] = sv; UpValues[s] = uv;
  DefaultValues[s] = dfv; FormatValues[s] = fv; NValues[s] = nv;
  Attributes[s] = attr);
hwNamesNow[] := Names["$CellContext`*"];
hwSavedNames = hwNamesNow[];
hwSaved = Map[Function[n, hwSaveDefs[ToExpression[n, InputForm, HoldComplete]]], hwSavedNames];
hwRestoreState[] := Module[{new = Complement[hwNamesNow[], hwSavedNames]},
  If[new =!= {}, Quiet[Apply[Remove, new]]];
  Scan[Function[d, Quiet[hwRestoreDefs[d]]], hwSaved];
  hwRandomOn = False; hwDraws = <||>; hwDrawN = 0; hwCurStep = 0; hwCurEval = 0];
hwSay["saved ", Length[hwSaved], " $CellContext` symbols"];
hwTest["state restore: new symbols removed, saved symbols reset (HW-38)",
  (ToExpression["$CellContext`hwTestAfterSave = 1; $CellContext`hwTestFreshName = 7"]; hwRestoreState[];
   !NameQ["$CellContext`hwTestAfterSave"] && ToExpression["OwnValues[$CellContext`hwTestFreshName]"] === {})];

(* ======================================================================== 17. start states (HW-05, HW-27) *)
(* returns a list of JSON names assigned, or a failure string *)
hwAssignStart[start_String] := Module[{k, sn, names = {}, extra = {}},
  Which[
    start === "initial",
      If[hwVariablesHeld === None, "the notebook has no stored \"Variables\"",
        Quiet[ReleaseHold[hwVariablesHeld]];
        Map[hwJsonOfVar[#[[1]]] &, hwListSymbols[hwVariablesHeld]]],
    start === "live",
      (* only $CellContext` Manipulate variables: not Typeset`... bookkeeping, not ControllerLinking shadows x$nnn$$ *)
      Scan[Function[e, With[{hc = Replace[e, Hold[Set[s_Symbol, _]] :> HoldComplete[s]]},
          If[MatchQ[hc, HoldComplete[_Symbol]] && hwCellSymQ[hc] && MemberQ[hwManipSymNames, hwSymName @@ hc],
            AppendTo[names, hwJsonOfVar[hwSymName @@ hc]]; Quiet[ReleaseHold[e]]]]],
        Cases[hwLiveHeld, x_ :> Hold[x], {2}]];
      names,
    StringMatchQ[start, "snapshot:" ~~ DigitCharacter ..],
      k = ToExpression[StringDrop[start, 9]];
      If[k < 1 || k > Length[hwSnapshots], "snapshot " <> ToString[k] <> " does not exist (" <> ToString[Length[hwSnapshots]] <> " snapshots)",
        sn = hwSnapshots[[k]];
        Scan[Function[e, With[{n = Replace[e, Hold[Set[s_, _]] :> SymbolName[Unevaluated[s]]]},
            If[KeyExistsQ[hwManip, n], AppendTo[names, n]; Quiet[Replace[e, Hold[Set[_, v_]] :> hwAssignHeldValue[hwManip[n], Hold[v]]]],
              AppendTo[extra, n]]]],
          Cases[sn["settings"], x : HoldPattern[Set[_Symbol, _]] :> Hold[x], {2}]];
        names],
    True, "unknown start state " <> start]];

(* ======================================================================== 18. Body evaluation *)
hwTimedOut = hwTimedOutTag;
hwRunBody = hwBodyHeld;
(* one evaluation; returns <|"result", "seconds", "names", "text"|> *)
hwEvalBody[active_, limit_] := Module[{run, t},
  hwScopeCaps = <||>; hwExits = <||>; hwEvalCount++; hwCurEval = hwEvalCount;
  {t, run} = AbsoluteTiming[hwRunCapturing[Catch[hwWithCA[active, TimeConstrained[ReleaseHold[hwRunBody], limit, hwTimedOut]]]]];
  Append[run, "seconds" -> t]];
hwBadResult[r_] := Which[r === hwTimedOut, "timeout", r === $Aborted, "error: aborted", r === $Failed, "error: $Failed",
  MatchQ[r, _Hold], "error: unevaluated Hold[...]", True, None];

(* ======================================================================== 19. captures (HW-39...44, section 6) *)
hwSpecialCaps = {"%out", "%g", "%g3d", "%primitives", "%text", "%messages", "%plotRange", "$RandomDraws"};
hwPreludeTag = hwPreludeTagSymbol;
hwPreludeFail[msg_String] := Throw[msg, hwPreludeTag];
(* plan: <|"label", "type" (special|manip|global|local|wl), "scope", "held", "resolved"|> *)
hwPlanCapture[c_String] := Module[{r, m, k},
  Which[
    MemberQ[hwSpecialCaps, c] || StringStartsQ[c, "%options:"], <|"label" -> c, "type" -> "special"|>,
    StringStartsQ[c, "%"] || StringStartsQ[c, "$"], hwPreludeFail["unknown special capture " <> c],
    StringStartsQ[c, "wl:"],
      m = hwMapWL[StringDrop[c, 3], "capture"];
      If[StringQ[m], hwPreludeFail[m]];
      k = hwScopeForWL[m["scopes"]];
      If[k === $Failed, hwPreludeFail["capture " <> c <> " uses locals of sibling scopes " <> ToString[m["scopes"]]]];
      <|"label" -> c, "type" -> "wl", "scope" -> k, "held" -> m["held"], "usesLocals" -> (m["scopes"] =!= {}),
        "resolved" -> <|"kind" -> "wl", "scope" -> k, "aliases" -> Association[m["aliases"]], "fresh" -> m["fresh"]|>|>,
    True,
      r = hwResolve[c, "capture"];
      If[!AssociationQ[r], hwPreludeFail["capture " <> c <> " does not resolve to a Manipulate variable, Body local or Initialization global"]];
      If[KeyExistsQ[r, "ambiguous"], hwPreludeFail["capture " <> c <> " is declared by sibling scopes " <> ToString[r["ambiguous"]]]];
      <|"label" -> c, "type" -> r["kind"], "scope" -> Lookup[r, "scope", None], "held" -> r["sym"], "resolved" -> hwResolvedJson[r]|>]];
hwCapsByScope[plans_List] := Module[{a = <||>},
  Scan[Function[p, If[(p["type"] === "local" || p["type"] === "wl") && IntegerQ[p["scope"]],
      a[p["scope"]] = Append[Lookup[a, p["scope"], {}], {p["label"], p["held"]}]]], plans];
  a];

hwOutermostGraphics[out_, heads_] := Module[{pos = Position[out, (h_Symbol /; MemberQ[heads, h])[___]]},
  pos = Select[pos, Function[p, !AnyTrue[pos, hwIsPrefix[#, p] &]]];
  hwLexSort[pos]];
hwPrimHeads = {Point, Line, Polygon, Triangle, Rectangle, Disk, Circle, Annulus, Arrow, BezierCurve, BSplineCurve,
  JoinedCurve, FilledCurve, Text, Inset, Locator, Raster, Raster3D, Sphere, Ball, Cylinder, Cone, Cuboid, Tube, Ellipsoid,
  InfinitePlane, Polyhedron, Parallelogram, Simplex, Hexahedron, Tetrahedron, Prism, Pyramid, CapsuleShape, InfiniteLine,
  HalfLine, Parallelepiped};
hwWrapHeads = {GraphicsComplex, GraphicsGroup, GeometricTransformation, Rotate, Translate, Scale, Tooltip, Annotation};
SetAttributes[hwPrimWalk, HoldAllComplete];
hwPrimWalk[x_] := Which[
  AtomQ[Unevaluated[x]], Null,
  Head[Unevaluated[x]] === Dynamic, Null,
  MemberQ[hwPrimHeads, Head[Unevaluated[x]]], Sow[<|"h" -> hwSymName @@ {Head[Unevaluated[x]]}, "dims" -> hwFirstDims[x]|>, hwPrimTag]; hwPrimArgs[x],
  MemberQ[hwWrapHeads, Head[Unevaluated[x]]], Sow[<|"h" -> hwSymName @@ {Head[Unevaluated[x]]}, "wrapper" -> True|>, hwPrimTag]; hwPrimArgs[x],
  True, hwPrimArgs[x]];
SetAttributes[hwPrimArgs, HoldAllComplete];
hwPrimArgs[_[a___]] := Scan[hwPrimWalk, HoldComplete[a]];
SetAttributes[hwFirstDims, HoldAllComplete];
hwFirstDims[_[a_, ___]] := Dimensions[Unevaluated[a]];
hwFirstDims[_] := {};
hwPrimitives[out_] := Module[{l = Reap[hwPrimWalk[out], hwPrimTag][[2]]},
  l = If[l === {}, {}, First[l]];
  <|"list" -> l, "counts" -> Counts[Map[#["h"] &, l]]|>];
hwTexts[out_] := Cases[out, t_Text :> hwTextRec[t], {0, Infinity}];
hwTextRec[Text[a_, rest___]] := <|"input" -> ToString[Unevaluated[a], InputForm], "plain" -> ToString[Unevaluated[a]],
  "boxes" -> Quiet[Check[ToString[ToBoxes[a, StandardForm], InputForm], Null]],
  "pos" -> If[Length[{rest}] >= 1, hwRaw[hwEncode[First[{rest}]]], Null]|>;
(* Extract[expr, {}] treats {} as an EMPTY LIST OF POSITIONS and gives {}: the position {} of the whole expression (a
   Body whose value is the Graphics itself) needs its own case. Run 1 recorded %g3d/%plotRange of DH as {} because of it. *)
hwPart[out_, p_List] := If[p === {}, out, Extract[out, p]];
hwEncPart[out_, p_List] := If[p === {}, hwEncode[out], Extract[out, p, hwEnc]];
hwOptionsCapture[out_, names_List] := Map[Function[p, With[{g = hwPart[out, p]},
     <|"head" -> ToString[Head[g]], "options" -> Association[Map[Function[nm, nm -> With[{o = Quiet[ToExpression[nm]]},
            If[MemberQ[Keys[Options[Head[g]]], o], hwRaw[hwEncode[Quiet[AbsoluteOptions[g, o]]]], <|"notAnOption" -> True|>]]], names]]|>]],
  hwOutermostGraphics[out, {Graphics, Graphics3D}]];
hwNumericRange[r_] := MatrixQ[r, NumericQ];
(* HW-50, K-HW-01: the methods in order; the first numeric result wins and "method" says which. "stored" = an explicit
   numeric PlotRange option of the graphic; "regionBounds" = bounds of the primitives (RegionBounds of
   DiscretizeGraphics: PlotRange -> All semantics, WITHOUT the front end's padding) -- a different quantity, marked as
   such; "unavailable" = no method gave numbers (value null). "storedOption" is always the option as written. *)
hwPlotRangeOne[g_] := Module[{r, m = "unavailable", tried = {}},
  r = Quiet[PlotRange /. AbsoluteOptions[g, PlotRange]]; AppendTo[tried, "AbsoluteOptions"];
  If[hwNumericRange[r], m = "AbsoluteOptions",
    r = Quiet[PlotRange[g]]; AppendTo[tried, "PlotRange[g]"];
    If[hwNumericRange[r], m = "PlotRange[g]",
      If[hwFrontEnd, r = Quiet[UsingFrontEnd[PlotRange /. AbsoluteOptions[g, PlotRange]]]; AppendTo[tried, "UsingFrontEnd"]];
      If[hwFrontEnd && hwNumericRange[r], m = "UsingFrontEnd",
        r = Quiet[PlotRange /. Options[g, PlotRange]]; AppendTo[tried, "stored"];
        If[hwNumericRange[r], m = "stored",
          r = Quiet[TimeConstrained[RegionBounds[DiscretizeGraphics[g]], 30, $Failed]]; AppendTo[tried, "regionBounds"];
          If[hwNumericRange[r], m = "regionBounds", r = Null]]]]];
  <|"head" -> ToString[Head[g]], "value" -> hwRaw[hwEncode[r]], "method" -> m, "tried" -> tried,
    "storedOption" -> hwRaw[hwEncode[Quiet[PlotRange /. Options[g, PlotRange]]]]|>];
hwPlotRangeCapture[out_] := Map[Function[p, hwPlotRangeOne[hwPart[out, p]]], hwOutermostGraphics[out, {Graphics, Graphics3D}]];
hwTest["Extract position {} = the whole expression (%g of a Body that IS the graphic)",
  hwEncPart[Graphics[Point[{1, 2}]], {}] === hwEncode[Graphics[Point[{1, 2}]]] && hwPart[{a, b}, {}] === {a, b} &&
  hwPart[{a, b}, {2}] === b];
hwTest["plot range of an explicit range is numeric and names its method",
  With[{pr = hwPlotRangeOne[Graphics[Point[{1, 2}], PlotRange -> {{0, 3}, {0, 4}}]]},
    MemberQ[{"AbsoluteOptions", "PlotRange[g]", "stored"}, pr["method"]] && StringStartsQ[pr["value"][[1]], "[["]]];
hwOutCapture[out_] := Module[{s = ToString[out, InputForm]},
  If[StringLength[s] <= hwMaxStringChars, s,
    <|"text" -> StringTake[s, hwMaxStringChars], "sha256" -> Quiet[Check[IntegerString[Hash[s, "SHA256"], 16, 64], Null]],
      "length" -> StringLength[s], "truncated" -> True|>]];
hwDrawRecords[l_List] := Map[<|"fn" -> #[[1]], "args" -> hwRaw[hwEncode[#[[2]]]], "value" -> hwRaw[hwEncode[#[[3]]]],
     "step" -> #[[4]], "evaluation" -> #[[5]], "nested" -> False|> &, l];

(* all captures at this point; evaluated = the step evaluated the Body; ctx = <|"result", "messages", "draws"|> *)
hwCaptureAll[plans_List, evaluated_, ctx_Association] := Association[Map[Function[p, p["label"] -> Quiet[Check[
      hwCaptureOne[p, evaluated, ctx], <|"error" -> "messages while capturing " <> p["label"]|>]]], plans]];
hwCaptureOne[p_Association, evaluated_, ctx_Association] := Module[{c = p["label"], out = ctx["result"], k},
  Switch[p["type"],
    "special",
      Which[
        c === "$RandomDraws", hwDrawRecords[ctx["draws"]],
        c === "%messages", ctx["messages"],
        out === hwNoResult, <|"notEvaluated" -> True|>,
        c === "%out", hwOutCapture[out],
        c === "%g", Map[hwRaw[hwEncPart[out, #]] &, hwOutermostGraphics[out, {Graphics}]],
        c === "%g3d", Map[hwRaw[hwEncPart[out, #]] &, hwOutermostGraphics[out, {Graphics3D}]],
        c === "%primitives", hwPrimitives[out],
        c === "%text", hwTexts[out],
        c === "%plotRange", hwPlotRangeCapture[out],
        StringStartsQ[c, "%options:"], hwOptionsCapture[out, StringTrim /@ StringSplit[StringDrop[c, 9], ","]],
        True, <|"error" -> "unknown capture"|>],
    "manipulate" | "global", hwRaw[hwEncode[ReleaseHold[p["held"]]]],
    "local" | "wl",
      k = p["scope"];
      Which[
        p["type"] === "wl" && !TrueQ[p["usesLocals"]] && (!evaluated || k === None), hwRaw[hwEncode[ReleaseHold[p["held"]]]],
        !evaluated, <|"notEvaluated" -> True|>,
        !KeyExistsQ[hwScopeCaps, k], <|"notReached" -> True|>,
        True, hwRaw[hwEncode[hwScopeCaps[k][c]]]],
    _, <|"error" -> "unknown capture type"|>]];

(* ======================================================================== 20. values (HW-07...10) *)
hwCtlValue[spec_String, where_String] := Module[{parts = StringSplit[spec, "#"], r, ctl, k},
  If[Length[parts] =!= 2, hwPreludeFail[where <> ": bad ctl: value " <> spec]];
  r = hwResolve[parts[[1]], "manip"];
  If[!AssociationQ[r], hwPreludeFail[where <> ": ctl: variable " <> parts[[1]] <> " is not a Manipulate variable"]];
  ctl = hwControls[r["name"]];
  If[ctl["kind"] =!= "values", hwPreludeFail[where <> ": control " <> parts[[1]] <> " has no value list"]];
  k = Quiet[ToExpression[parts[[2]]]];
  If[!IntegerQ[k] || k < 1 || k > Length[ctl["values"]],
    hwPreludeFail[where <> ": ctl: index " <> parts[[2]] <> " out of range; values: " <> ToString[Map[ReleaseHold, ctl["values"]], InputForm]]];
  ReleaseHold[ctl["values"][[k]]]];
hwValueWL[code_String, where_String] := Module[{m = hwMapWL[code, "value"], r},
  If[StringQ[m], hwPreludeFail[where <> ": " <> m]];
  r = hwRunCapturing[ReleaseHold[m["held"]]];
  If[r["names"] =!= {} || r["result"] === $Failed || r["result"] === $Aborted,
    hwPreludeFail[where <> ": wl: value " <> code <> " failed" <> If[r["names"] === {}, "", " with messages " <> StringRiffle[r["names"], ", "]]]];
  r["result"]];
hwDecodeValue[v_, where_String] := Which[
  AssociationQ[v] && KeyExistsQ[v, "$r"], With[{x = hwDecodeReal[v["$r"]]},
    If[MachineNumberQ[x], x, hwPreludeFail[where <> ": bad real " <> ToString[v["$r"]]]]],
  IntegerQ[v] || v === True || v === False, v,
  Head[v] === Real, v,
  StringQ[v] && StringStartsQ[v, "wl:"], hwValueWL[StringDrop[v, 3], where],
  StringQ[v] && StringStartsQ[v, "ctl:"], hwCtlValue[StringDrop[v, 4], where],
  StringQ[v], v,
  ListQ[v], Map[hwDecodeValue[#, where] &, v],
  True, hwPreludeFail[where <> ": unsupported value " <> ToString[v, InputForm]]];
hwManipOrFail[name_String, where_String] := With[{r = hwResolve[name, "manip"]},
  If[AssociationQ[r], r, hwPreludeFail[where <> ": " <> name <> " is not a Manipulate variable"]]];

(* drag (HW-25): the control's stored Dynamic setter, or Locator bounds *)
hwSetterOf[n_String] := With[{ctl = hwControls[n]}, If[ctl["kind"] =!= "custom", None, hwSetterFrom[ctl["function"], hwManip[n]]]];
hwClipTo[v_, {lo_List, hi_List}] := If[ListQ[v] && Length[v] == Length[lo] == Length[hi],
  MapThread[Clip[#1, {#2, #3}] &, {v, lo, hi}], v];
hwClipTo[v_, _] := v;
hwApplyDrag[n_String, value_, where_String] := Module[{ctl = hwControls[n], vh = hwManip[n], setter, cur},
  Which[
    AssociationQ[value],
      If[ctl["kind"] =!= "locator", hwPreludeFail[where <> ": drag with index needs a Locator control (" <> n <> ")"]];
      cur = ReleaseHold[vh];
      If[!ListQ[cur] || value["index"] > Length[cur], hwPreludeFail[where <> ": locator index out of range for " <> n]];
      hwAssign[vh, ReplacePart[cur, value["index"] -> hwClipTo[value["to"], ctl["bounds"]]]],
    ctl["kind"] === "custom",
      setter = hwSetterOf[n];
      If[setter === None, hwPreludeFail[where <> ": no Dynamic setter found in the custom control of " <> n]];
      hwApplySetter[setter, vh, value],
    ctl["kind"] === "locator", hwAssign[vh, hwClipTo[value, ctl["bounds"]]],
    True, hwPreludeFail[where <> ": " <> n <> " has no setter and is not a Locator: use set"]]];

(* ======================================================================== 21. one scenario *)
hwStopTag = hwStopTagSymbol;
hwRefHead = None;
hwScenarioRecord[sc_Association] := Module[{id = Lookup[sc, "id", "?"], plans = {}, steps, rec, stepRecs = {},
    echo = {}, status = "ok", notes = {}, msgs = {}, lastResult = hwNoResult, limit, t0 = AbsoluteTime[], evaluations = 0,
    prelude, caps = <||>, resolved = <||>, aliases = <||>, startNames = {}, scStart, eachStep, lastEvaluated = False},
  hwRestoreState[];
  SeedRandom[0];
  hwDraws = <||>; hwDrawN = 0;
  limit = hwWireNumber[Lookup[sc, "timeLimit", hwFileTimeLimit], hwFileTimeLimit];
  scStart = Lookup[sc, "start", hwFileStart];
  steps = Lookup[sc, "steps", {}];
  eachStep = TrueQ[Lookup[sc, "captureEachStep", False]];
  (* prelude: start state (assigned without evaluating the Body, HW-05), capture plan, instrumentation *)
  prelude = Catch[
    If[hwDefinitionProblems =!= {}, hwPreludeFail["file-level definitions failed: " <> StringRiffle[hwDefinitionProblems, "; "]]];
    startNames = hwAssignStart[scStart];
    If[StringQ[startNames], hwPreludeFail["start " <> scStart <> ": " <> startNames]];
    plans = Map[hwPlanCapture, Lookup[sc, "capture", {}]];
    Scan[Function[p, resolved[p["label"]] = Lookup[p, "resolved", "special"];
        If[AssociationQ[p["resolved"]] && KeyExistsQ[p["resolved"], "alias"], aliases[p["label"]] = p["resolved"]["alias"]]], plans];
    hwRunBody = hwInstrument[hwBodyHeld, hwCapsByScope[plans], hwScopes];
    "done", hwPreludeTag];
  If[prelude =!= "done", status = "prelude-failed"; AppendTo[notes, If[StringQ[prelude], prelude, ToString[prelude, InputForm]]]];
  hwTraceOn = TrueQ[Lookup[sc, "trace", False]]; hwTraceRecs = <||>; hwTraceSeen = <||>; hwTraceCount = 0;
  hwRandomOn = True;
  If[status === "ok", Do[Module[{st = steps[[s]], kind, srec, evals = {}, evalSecs = {}, smsgs = {}, changed = {},
        d0 = hwDrawN, active, evalOnce, outcome},
      hwCurStep = s;
      kind = If[AssociationQ[st], SelectFirst[{"set", "drag", "press", "settle", "seed", "setFrom"}, KeyExistsQ[st, #] &, None], None];
      active = AssociationQ[st] && TrueQ[Lookup[st, "controlActive", False]];
      srec = <|"step" -> s, "kind" -> kind|>;
      If[active, srec["controlActive"] = True];
      (* one Body evaluation; returns None or the reason the scenario must stop *)
      evalOnce[] := Module[{run = hwEvalBody[active, limit], bad},
        evaluations++; AppendTo[evals, hwEvalCount]; AppendTo[evalSecs, run["seconds"]];
        lastResult = run["result"];
        With[{mr = hwMessageRecords[run["names"], run["text"], <|"step" -> s, "evaluation" -> hwEvalCount|>]},
          smsgs = Join[smsgs, mr]; msgs = Join[msgs, mr]];
        bad = hwBadResult[run["result"]];
        If[bad === None && hwRefHead =!= None && Head[run["result"]] =!= hwRefHead,
          bad = "error: the Body returned " <> ToString[Head[run["result"]]] <> " instead of " <> ToString[hwRefHead]];
        If[bad =!= None, status = If[StringStartsQ[bad, "timeout"], "timeout", "error"];
          AppendTo[notes, "step " <> ToString[s] <> ": " <> bad]];
        bad];
      outcome = Catch[Catch[
        If[AbsoluteTime[] - t0 > hwScenarioTimeLimit, status = "timeout";
          AppendTo[notes, "scenarioTimeLimit exceeded before step " <> ToString[s]]; Throw[None, hwStopTag]];
        If[kind === None, hwPreludeFail["step " <> ToString[s] <> ": no step kind"]];
        Switch[kind,
          "set", Module[{names = Keys[st["set"]], recs, vals},
            recs = Map[hwManipOrFail[#, "step " <> ToString[s] <> " set"] &, names];
            vals = Map[hwDecodeValue[st["set"][#], "step " <> ToString[s] <> " set " <> #] &, names];
            MapThread[Function[{n, r, v}, AppendTo[echo, <|"step" -> s, "name" -> n, "value" -> hwRaw[hwEncode[v]]|>];
                If[KeyExistsQ[r, "alias"], aliases[n] = r["alias"]]; resolved[n] = hwResolvedJson[r]], {names, recs, vals}];
            MapThread[hwAssign[#1["sym"], #2] &, {recs, vals}];
            If[evalOnce[] =!= None, Throw[None, hwStopTag]]],
          "drag", Module[{names = Keys[st["drag"]], recs, vals},
            recs = Map[hwManipOrFail[#, "step " <> ToString[s] <> " drag"] &, names];
            vals = Map[Function[n, With[{v = st["drag"][n]}, If[AssociationQ[v] && KeyExistsQ[v, "index"],
                 <|"index" -> v["index"], "to" -> hwDecodeValue[v["to"], "step " <> ToString[s] <> " drag " <> n]|>,
                 hwDecodeValue[v, "step " <> ToString[s] <> " drag " <> n]]]], names];
            MapThread[Function[{n, r, v}, AppendTo[echo, <|"step" -> s, "name" -> n, "value" -> hwRaw[hwEncode[If[AssociationQ[v], v["to"], v]]]|>];
                If[KeyExistsQ[r, "alias"], aliases[n] = r["alias"]]; resolved[n] = hwResolvedJson[r]], {names, recs, vals}];
            MapThread[hwApplyDrag[#1["name"], #2, "step " <> ToString[s] <> " drag"] &, {recs, vals}];
            If[evalOnce[] =!= None, Throw[None, hwStopTag]]],
          "press", Module[{b = SelectFirst[hwButtons, #[[1]] === st["press"] &, None]},
            If[b === None, hwPreludeFail["step " <> ToString[s] <> ": no button labelled " <> ToString[st["press"]] <>
              "; labels: " <> ToString[Map[First, hwButtons], InputForm]]];
            srec["label"] = st["press"];
            Quiet[ReleaseHold[b[[2]]]];
            If[evalOnce[] =!= None, Throw[None, hwStopTag]]],
          "settle", Module[{max = Lookup[st, "maxEvaluations", 50], before, after, done = False, i = 0},
            While[!done && i < max,
              i++;
              before = Map[hwKey[ReleaseHold[#]] &, hwManip];
              If[evalOnce[] =!= None, Throw[None, hwStopTag]];
              after = Map[hwKey[ReleaseHold[#]] &, hwManip];
              With[{ch = Select[Keys[hwManip], before[#] =!= after[#] &]},
                AppendTo[changed, ch]; srec["changed"] = changed; If[ch === {}, done = True]]];
            If[!done, status = "not-converged";
              AppendTo[notes, "step " <> ToString[s] <> ": settle did not converge in " <> ToString[max] <> " evaluations"];
              Throw[None, hwStopTag]]],
          "seed", If[!IntegerQ[st["seed"]], hwPreludeFail["step " <> ToString[s] <> ": seed must be an integer"]];
            srec["seed"] = st["seed"]; SeedRandom[st["seed"]],
          "setFrom", Module[{r = hwAssignStart[st["setFrom"]]},
            If[StringQ[r], hwPreludeFail["step " <> ToString[s] <> " setFrom: " <> r]];
            srec["setFrom"] = st["setFrom"];
            If[Lookup[st, "evaluate", True] =!= False, If[evalOnce[] =!= None, Throw[None, hwStopTag]]]]];
        "done", hwStopTag], hwPreludeTag];
      If[StringQ[outcome] && outcome =!= "done", status = "prelude-failed"; AppendTo[notes, outcome]];
      srec["evaluations"] = Length[evals];
      srec["seconds"] = Total[evalSecs];
      If[evalSecs =!= {}, srec["evaluationSeconds"] = evalSecs];
      If[!hwSynchronousFalse && AnyTrue[evalSecs, # > 5 &], srec["feTimeoutRisk"] = True];
      srec["messages"] = Map[#["name"] &, smsgs];
      srec["randomDraws"] = hwDrawN - d0;
      If[evals =!= {} && hwExits =!= <||>, srec["scopeExits"] = KeyMap[ToString, hwExits]];
      lastEvaluated = (evals =!= {});
      If[eachStep && status =!= "prelude-failed",
        hwRandomOn = False;
        srec["capture"] = hwCaptureAll[plans, lastEvaluated, <|"result" -> lastResult, "messages" -> smsgs, "draws" -> Values[hwDraws]|>];
        If[MemberQ[Lookup[sc, "capture", {}], "$RandomDraws"],
          srec["randomDrawRecords"] = hwDrawRecords[Take[Values[hwDraws], {d0 + 1, hwDrawN}]]];
        hwRandomOn = True];
      AppendTo[stepRecs, srec];
      If[outcome =!= "done", Break[]]],
    {s, Length[steps]}]];
  hwRandomOn = False; hwTraceOn = False;
  If[plans =!= {} && prelude === "done",
    caps = hwCaptureAll[plans, lastEvaluated, <|"result" -> lastResult, "messages" -> msgs, "draws" -> Values[hwDraws]|>]];
  If[hwImagesDir =!= None && hwImageProblem === None && lastResult =!= hwNoResult,
    Module[{f = FileNameJoin[{hwImagesDir, id <> ".png"}], ok},
      ok = Quiet[Check[Export[f, lastResult, "PNG"], $Failed]];
      If[ok === $Failed, ok = Quiet[Check[UsingFrontEnd[Export[f, lastResult, "PNG"]], $Failed]]];
      If[ok === $Failed, hwImageProblem = "PNG export failed (needs the Wolfram front end)"; hwSay["warning: ", hwImageProblem]]]];
  rec = <|"id" -> id, "status" -> status, "start" -> scStart, "startVariables" -> If[ListQ[startNames], startNames, {}],
    "seconds" -> AbsoluteTime[] - t0, "evaluations" -> evaluations, "aliases" -> aliases, "resolved" -> resolved,
    "inputEcho" -> echo, "steps" -> stepRecs, "capture" -> caps, "messages" -> msgs, "notes" -> notes,
    "scenarioSha256" -> Lookup[sc, "sha256", Null]|>;
  If[TrueQ[Lookup[sc, "trace", False]], rec["trace"] = Map[hwRaw[hwEncode[#]] &, Values[hwTraceRecs]]];
  rec];

(* ======================================================================== 22. structure evaluations (smoke, self-check, reference head) *)
hwVarKeys[] := Map[hwKey[ReleaseHold[#]] &, hwManip];
(* a changed variable's values before and after one evaluation (self-check): encoded when short, else length + hash;
   for numeric arrays of equal shape also the largest absolute difference (tells last-bit drift from real changes) *)
hwShortEnc[v_] := With[{e = hwEncode[v]}, If[StringLength[e] <= 4000, hwRaw[e],
    <|"length" -> StringLength[e], "sha256" -> IntegerString[Hash[e, "SHA256"], 16, 64]|>]];
hwChangeRecord[b_, a_] := Module[{d = Quiet[Check[If[ArrayQ[b, _, NumericQ] && ArrayQ[a, _, NumericQ] && Dimensions[a] === Dimensions[b],
        N[Max[Abs[Flatten[{a - b}]]]], None], None]]},
  <|"before" -> hwShortEnc[b], "after" -> hwShortEnc[a], "maxAbsDiff" -> If[MachineNumberQ[d], d, Null]|>];
hwStateEval[start_String] := Module[{names, before, after, run, r, beforeVals, changed},
  hwRestoreState[]; SeedRandom[0]; hwRunBody = hwBodyHeld; hwLastStateResult = hwNoResult;
  names = hwAssignStart[start];
  If[StringQ[names], <|"state" -> start, "status" -> "prelude-failed", "note" -> names|>,
    beforeVals = Map[ReleaseHold, hwManip];
    before = hwVarKeys[];
    hwRandomOn = True; run = hwEvalBody[False, hwFileTimeLimit]; hwRandomOn = False;
    after = hwVarKeys[];
    r = run["result"];
    hwLastStateResult = r;
    <|"state" -> start, "status" -> With[{b = hwBadResult[r]}, If[b === None, "ok", b]], "head" -> ToString[Head[r]],
      "seconds" -> run["seconds"], "assigned" -> names, "changed" -> (changed = Select[Keys[hwManip], before[#] =!= after[#] &]),
      "changedValues" -> Association[Map[# -> Quiet[Check[hwChangeRecord[beforeVals[#], ReleaseHold[hwManip[#]]], <|"error" -> "encoding failed"|>]] &, changed]],
      "messages" -> hwMessageRecords[run["names"], run["text"], <||>], "randomDraws" -> hwDrawN|>]];
hwLeads[r_] := <|
  "K-HW-01 plotRange" -> Quiet[Check[hwPlotRangeCapture[r], <|"error" -> "failed"|>]],
  "K-HW-02 boxes in the Body value" -> !FreeQ[r, _GraphicsBox | _RasterBox | _TagBox | _StyleBox],
  "K-HW-03 Charting`ResolvePlotTheme exists" -> NameQ["Charting`ResolvePlotTheme"],
  "K-HW-06 ControlActive in the kernel" -> hwCAKernel|>;
hwStructureOut[] := hwStructure;
hwWriteOut[extra_Association] := Module[{out = Join[hwTop[], <|"structure" -> hwStructureOut[], "imageProblem" -> hwImageProblem,
       "probes" -> hwProbeResults, "probeFormulas" -> hwProbeFormulaResults, "builtinDefinitions" -> hwBuiltinDefinitions,
       "wlChecks" -> hwWlChecks|>, extra, <|"seconds" -> AbsoluteTime[] - hwStartTime|>]},
  hwWriteText[hwOutFile, hwJ[out]];
  hwSay["wrote ", hwOutFile]];

(* encoded start states for the structure report (HW-58) *)
hwStateSnapshot[start_String] := Module[{names},
  hwRestoreState[]; names = hwAssignStart[start];
  If[StringQ[names], <|"error" -> names|>, Association[Map[# -> hwRaw[hwEncode[ReleaseHold[hwManip[#]]]] &, Keys[hwManip]]]]];

hwPhase["mode: " <> hwMode];
Switch[hwMode,
  "smoke", Module[{e = hwStateEval["initial"]},
    hwSay["initial settings: ", e["status"], "  head ", Lookup[e, "head", "?"], "  ", Lookup[e, "seconds", 0], " s  changed ", Lookup[e, "changed", {}]];
    hwWriteOut[<|"evaluations" -> {e}, "leads" -> hwLeads[hwLastStateResult]|>]],
  "self-check", Module[{states = Join[{"initial", "live"}, Table["snapshot:" <> ToString[k], {k, Length[hwSnapshots]}]], evs, lead, startEnc},
    evs = Map[Function[st, With[{e = hwStateEval[st]}, If[st === "initial", lead = hwLeads[hwLastStateResult]];
        hwSay[st, ": ", e["status"], "  ", Lookup[e, "seconds", 0], " s  changed ", Lookup[e, "changed", {}]]; e]], states];
    startEnc = <|"initial" -> hwStateSnapshot["initial"], "live" -> hwStateSnapshot["live"]|>;
    hwWriteOut[<|"evaluations" -> evs, "leads" -> lead, "startStateValues" -> startEnc,
      "initialEqualsLive" -> (startEnc["initial"] === startEnc["live"])|>]],
  _, Module[{ref = hwStateEval["initial"]},
    If[ref["status"] === "ok", hwRefHead = Head[hwLastStateResult]];
    hwSay["reference evaluation (initial settings): ", ref["status"], ", head ", Lookup[ref, "head", "?"]];
    If[StringQ[hwPartialFile], hwWriteText[hwPartialFile, hwJ[Join[hwTop[], <|"partialHeader" -> True, "structure" -> hwStructure, "referenceEvaluation" -> ref|>]] <> "\n"]];
    If[hwImagesDir =!= None && !DirectoryQ[hwImagesDir], Quiet[CreateDirectory[hwImagesDir, CreateIntermediateDirectories -> True]]];
    Do[Module[{sc = hwScenarios[[i]], rec, line},
        rec = hwScenarioRecord[sc];
        line = hwJ[rec];
        If[StringQ[hwPartialFile], hwAppendLine[hwPartialFile, line]];
        AppendTo[hwResults, hwRaw[line]];
        hwSay[rec["id"], ": ", rec["status"], "  ", ToString[NumberForm[rec["seconds"], {7, 2}]], " s",
          If[rec["messages"] === {}, "", "  messages: " <> StringRiffle[DeleteDuplicates[Map[#["name"] &, rec["messages"]]], ", "]],
          If[rec["notes"] === {}, "", "  -- " <> StringRiffle[rec["notes"], "; "]]]],
      {i, Length[hwScenarios]}];
    hwWriteOut[<|"referenceEvaluation" -> ref, "scenarios" -> hwResults|>]]];
Exit[0];
