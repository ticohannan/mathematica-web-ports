/* SPDX-FileCopyrightText: 2026 Tico Hannan
   SPDX-License-Identifier: MIT */
/* shared/requirements.js — CLASSIC script (ES5 on purpose, so that old browsers can run it).
   Shows a clear notice instead of an empty page when the browser cannot run the demonstration
   (owner decision DEC-22: WebGL apps require WebGL 2, no graceful degradation; every app gets a
   start-up watchdog). Include in <head> BEFORE the module script:
     <script src="../../shared/requirements.js" data-needs-webgl2></script>   (3D apps)
     <script src="../../shared/requirements.js"></script>                     (2D/SVG apps)
   The notice is written into #graphic (or the top of <body>) with data-testid="requirements-notice". */
(function () {
  var me = document.currentScript;
  var needsWebGL2 = !!(me && me.hasAttribute('data-needs-webgl2'));
  var WATCHDOG_MS = 8000;
  var shown = false;
  var started = false;

  function show(reason) {
    if (shown) return;
    shown = true;
    var box = document.createElement('div');
    box.className = 'requirements-notice';
    box.setAttribute('data-testid', 'requirements-notice');
    box.setAttribute('role', 'alert');
    var what = needsWebGL2 ? 'JavaScript modules and WebGL 2 (3D graphics)' : 'JavaScript modules';
    box.innerHTML = '<strong>This demonstration could not start in this browser.</strong> ' +
      'It needs a current browser with ' + what + ', for example a recent Firefox, Chrome, Edge or Safari.' +
      (needsWebGL2 ? ' If your browser is current, WebGL may be switched off or blocked for your graphics card.' : '') +
      ' <span class="requirements-reason">(' + reason + ')</span>';
    var target = document.getElementById('graphic') || document.body;
    if (target.firstChild) target.insertBefore(box, target.firstChild); else target.appendChild(box);
    window.__requirementsNotice = reason;
  }

  function checkStatic() {
    if (!('noModule' in HTMLScriptElement.prototype)) { show('no JavaScript module support'); return; }
    if (needsWebGL2) {
      var ok = false;
      try {
        var c = document.createElement('canvas');
        var gl = c.getContext('webgl2');
        ok = !!gl;
        if (gl && gl.getExtension('WEBGL_lose_context')) gl.getExtension('WEBGL_lose_context').loseContext();
      } catch (e) { ok = false; }
      if (!ok) show('WebGL 2 is not available');
    }
  }

  window.addEventListener('error', function (e) {
    if (!started) show('start-up error: ' + (e && e.message ? e.message : 'unknown'));
  });
  window.addEventListener('unhandledrejection', function () { if (!started) show('start-up error (promise rejected)'); });

  function watch() {
    var t0 = Date.now();
    var id = setInterval(function () {
      if (window.__demo && window.__demo.ready === true) { started = true; clearInterval(id); return; }
      if (Date.now() - t0 > WATCHDOG_MS) { clearInterval(id); show('the page did not finish starting within ' + WATCHDOG_MS / 1000 + ' s'); }
    }, 200);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { checkStatic(); watch(); });
  else { checkStatic(); watch(); }
})();
