// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-FileCopyrightText: Original Wolfram Demonstration by Ed Pegg Jr, Jeff Bryant and Theodore W. Gray
// SPDX-License-Identifier: CC-BY-NC-SA-3.0
// demos/voronoi-diagrams/gradients.js — the colour gradients of the "color scheme" menu (the original's
// ColorData["Gradients"]) as samples (x in 0 … 1, RGB 0 … 255), read linearly between samples. INTERIM (v0.1.35,
// D-VD-04): only the five gradients of the snapshots, measured on them — each Voronoi cell is one flat colour, and site k
// of n has the value (k − 1)/(n − 1), so a snapshot with n sites gives n exact samples of its gradient (8-bit). The full
// list follows from Mathematica's own values, exported with tools/wolfram/export-gradients.wls (owner question Q-1).
export const GRADIENTS = Object.freeze({
  BeachColors: { source: 'measured', samples: [[0.0,[218,128,66]],[0.111111,[223,153,71]],[0.222222,[227,175,75]],[0.333333,[228,190,85]],[0.444444,[221,197,103]],[0.555556,[206,195,136]],[0.666667,[191,189,177]],[0.777778,[187,191,218]],[0.888889,[204,209,247]],[1.0,[255,255,255]]] },
  DarkRainbow: { source: 'measured', samples: [[0.0,[61,87,147]],[0.1,[65,88,142]],[0.2,[67,108,98]],[0.3,[74,122,69]],[0.4,[106,142,62]],[0.5,[159,172,67]],[0.6,[207,195,77]],[0.7,[224,186,83]],[0.8,[207,132,77]],[0.9,[186,61,59]],[1.0,[186,61,59]]] },
  LakeColors: { source: 'measured', samples: [[0.0,[75,15,135]],[0.1,[96,51,164]],[0.2,[116,87,193]],[0.3,[137,123,222]],[0.4,[154,151,232]],[0.5,[169,175,232]],[0.6,[184,200,233]],[0.7,[199,217,231]],[0.8,[213,222,225]],[0.9,[226,226,219]],[1.0,[240,231,213]]] },
  PlumColors: { source: 'measured', samples: [[0.0,[0,0,0]],[0.034483,[17,4,4]],[0.068966,[35,8,8]],[0.103448,[52,12,12]],[0.137931,[70,16,17]],[0.172414,[80,20,24]],[0.206897,[89,24,31]],[0.241379,[97,28,39]],[0.275862,[106,32,46]],[0.310345,[111,36,55]],[0.344828,[114,41,63]],[0.37931,[117,45,72]],[0.413793,[121,50,81]],[0.448276,[123,56,89]],[0.482759,[124,62,97]],[0.517241,[126,68,105]],[0.551724,[127,74,113]],[0.586207,[129,81,120]],[0.62069,[131,90,125]],[0.655172,[134,98,130]],[0.689655,[137,107,135]],[0.724138,[141,116,139]],[0.758621,[148,128,139]],[0.793103,[156,140,139]],[0.827586,[163,151,139]],[0.862069,[171,164,138]],[0.896552,[187,180,131]],[0.931034,[202,195,124]],[0.965517,[218,211,117]],[1.0,[233,227,110]]] },
  SunsetColors: { source: 'measured', samples: [[0.0,[0,0,0]],[0.034483,[20,7,27]],[0.068966,[39,14,53]],[0.103448,[59,21,80]],[0.137931,[79,29,107]],[0.172414,[99,36,127]],[0.206897,[121,42,115]],[0.241379,[142,49,102]],[0.275862,[164,55,90]],[0.310345,[186,62,77]],[0.344828,[204,70,65]],[0.37931,[214,80,54]],[0.413793,[224,90,42]],[0.448276,[235,100,30]],[0.482759,[245,110,19]],[0.517241,[250,121,15]],[0.551724,[251,133,19]],[0.586207,[252,146,23]],[0.62069,[254,158,28]],[0.655172,[255,170,32]],[0.689655,[255,181,46]],[0.724138,[255,192,65]],[0.758621,[255,202,84]],[0.793103,[255,213,103]],[0.827586,[255,223,122]],[0.862069,[255,230,148]],[0.896552,[255,236,174]],[0.931034,[255,243,201]],[0.965517,[255,249,228]],[1.0,[255,255,255]]] },
});
export const GRADIENT_NAMES = Object.freeze(Object.keys(GRADIENTS));
/** ColorData[name][x] as RGB 0 … 1: linear between the two samples around x (clamped to 0 … 1). */
export function gradientColor(name, x) {
  const s = GRADIENTS[name].samples, t = Math.min(1, Math.max(0, x));
  let i = 0;
  while (i + 2 < s.length && s[i + 1][0] < t) i++;
  const [x0, c0] = s[i], [x1, c1] = s[Math.min(i + 1, s.length - 1)];
  const f = x1 > x0 ? Math.min(1, Math.max(0, (t - x0) / (x1 - x0))) : 0;
  return c0.map((v, j) => (v + (c1[j] - v) * f) / 255);
}
