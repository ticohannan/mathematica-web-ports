// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// shared/beep.js — a short alert tone with the Web Audio API, standing in for Mathematica's Beep[].
// Browsers allow sound only after a user gesture, so the AudioContext is created, and resumed whenever it is not
// running, on the user's presses, touches, clicks and key presses on the page. A beep is played only while the
// context is running — a beep before the first gesture, or while the browser holds the audio suspended, is silent
// (not queued). Without Web Audio (e.g. Playwright's WebKit on Windows) every beep is silent.
// Mathematica's Beep[] plays the operating system's alert sound; this is a plain tone instead.

const GESTURES = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'];

/**
 * @param {{frequency?: number, duration?: number, volume?: number, target?: EventTarget}} [opts]
 * @returns {{beep: () => boolean, setMuted: (m: boolean) => void, readonly muted: boolean, readonly played: number,
 *   readonly state: string}}
 */
export function createBeeper({ frequency = 880, duration = 0.15, volume = 0.2, target = globalThis.document } = {}) {
  const AC = globalThis.AudioContext ?? globalThis.webkitAudioContext;
  let ctx = null;
  let muted = false;
  let played = 0;
  const unlock = () => {
    if (!AC) return;
    try {
      if (!ctx) ctx = new AC();
      // 'suspended' before a gesture; Safari also has 'interrupted' (after a call or an app switch)
      if (ctx.state !== 'running' && ctx.state !== 'closed') Promise.resolve(ctx.resume()).catch(() => {});
    } catch { ctx = null; } // audio not available: stay silent
  };
  for (const ev of GESTURES) target?.addEventListener(ev, unlock, { capture: true });
  return {
    /** play one tone; returns whether a tone was started (false when muted, or when audio is not running) */
    beep() {
      if (muted || !ctx || ctx.state !== 'running') return false;
      try {
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = frequency;
        gain.gain.setValueAtTime(volume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
        osc.connect(gain).connect(ctx.destination);
        osc.onended = () => gain.disconnect();
        osc.start(t);
        osc.stop(t + duration);
        played++;
        return true;
      } catch { return false; }
    },
    setMuted(m) { muted = !!m; },
    get muted() { return muted; },
    /** number of tones started */
    get played() { return played; },
    /** 'unavailable' (no Web Audio), 'not started' (no gesture yet), or the AudioContext state */
    get state() { return ctx ? ctx.state : (AC ? 'not started' : 'unavailable'); },
  };
}
