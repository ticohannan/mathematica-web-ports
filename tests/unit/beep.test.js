// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// tests/unit/beep.test.js — shared/beep.js with a recording stand-in AudioContext (Node has no Web Audio)
import { describe, it, expect, afterEach } from 'vitest';
import { createBeeper } from '../../shared/beep.js';

/** A stand-in AudioContext that records every call the beeper makes. */
function makeFakeAudio({ startState = 'suspended', resumeRejects = false, ctorThrows = false } = {}) {
  const log = [];
  let made = 0;
  class FakeAudioContext {
    constructor() {
      if (ctorThrows) throw new Error('no audio device');
      made++;
      this.state = startState;
      this.currentTime = 2.5;
      this.destination = { name: 'destination' };
    }
    resume() {
      log.push(['resume']);
      if (resumeRejects) return Promise.reject(new Error('not allowed'));
      this.state = 'running';
      return Promise.resolve();
    }
    createOscillator() {
      const o = {
        name: 'osc', type: '', frequency: { value: 0 },
        connect: (n) => { log.push(['connect', 'osc', n.name]); return n; },
        start: (t) => log.push(['start', t]),
        stop: (t) => log.push(['stop', t]),
      };
      return o;
    }
    createGain() {
      const g = {
        name: 'gain',
        gain: {
          setValueAtTime: (v, t) => log.push(['setValueAtTime', v, t]),
          exponentialRampToValueAtTime: (v, t) => log.push(['ramp', v, t]),
        },
        connect: (n) => { log.push(['connect', 'gain', n.name]); return n; },
        disconnect: () => log.push(['disconnect', 'gain']),
      };
      return g;
    }
  }
  return { FakeAudioContext, log, made: () => made };
}

describe('shared/beep.js', () => {
  afterEach(() => { delete globalThis.AudioContext; delete globalThis.webkitAudioContext; });

  it('is silent until the first pointer press, then plays one tone per beep', async () => {
    const fake = makeFakeAudio();
    globalThis.AudioContext = fake.FakeAudioContext;
    const target = new EventTarget();
    const b = createBeeper({ target });
    expect(b.state).toBe('not started');
    expect(b.beep()).toBe(false);
    target.dispatchEvent(new Event('pointerdown'));
    await Promise.resolve();
    expect(b.state).toBe('running');
    expect(b.beep()).toBe(true);
    expect(b.beep()).toBe(true);
    expect(b.played).toBe(2);
    target.dispatchEvent(new Event('keydown'));
    target.dispatchEvent(new Event('touchend'));
    expect(fake.made()).toBe(1); // one context for the page
  });

  it('plays a 0.15 s tone at 880 Hz from volume 0.2 down to 0.001, wired to the speakers', () => {
    const fake = makeFakeAudio({ startState: 'running' });
    globalThis.AudioContext = fake.FakeAudioContext;
    const target = new EventTarget();
    const b = createBeeper({ target });
    target.dispatchEvent(new Event('click'));
    expect(b.beep()).toBe(true);
    const calls = fake.log.filter((c) => c[0] !== 'resume');
    expect(calls).toEqual([
      ['setValueAtTime', 0.2, 2.5],
      ['ramp', 0.001, 2.5 + 0.15],
      ['connect', 'osc', 'gain'],
      ['connect', 'gain', 'destination'],
      ['start', 2.5],
      ['stop', 2.5 + 0.15],
    ]);
  });

  it('plays nothing while muted and again after unmuting', async () => {
    const fake = makeFakeAudio();
    globalThis.AudioContext = fake.FakeAudioContext;
    const target = new EventTarget();
    const b = createBeeper({ target });
    target.dispatchEvent(new Event('keydown'));
    await Promise.resolve();
    b.setMuted(true);
    expect(b.muted).toBe(true);
    expect(b.beep()).toBe(false);
    b.setMuted(false);
    expect(b.beep()).toBe(true);
    expect(b.played).toBe(1);
  });

  it('does not queue tones while the browser keeps the audio suspended', async () => {
    const fake = makeFakeAudio({ resumeRejects: true });
    globalThis.AudioContext = fake.FakeAudioContext;
    const target = new EventTarget();
    const b = createBeeper({ target });
    target.dispatchEvent(new Event('pointerdown')); // resume() rejects: no unhandled rejection, still suspended
    await Promise.resolve();
    expect(b.state).toBe('suspended');
    expect(b.beep()).toBe(false);
    expect(fake.log.some((c) => c[0] === 'start')).toBe(false);
  });

  it('uses webkitAudioContext where AudioContext is missing', async () => {
    const fake = makeFakeAudio();
    globalThis.webkitAudioContext = fake.FakeAudioContext;
    const target = new EventTarget();
    const b = createBeeper({ target });
    target.dispatchEvent(new Event('pointerup'));
    await Promise.resolve();
    expect(b.beep()).toBe(true);
  });

  it('stays silent when the audio context cannot be created', () => {
    const fake = makeFakeAudio({ ctorThrows: true });
    globalThis.AudioContext = fake.FakeAudioContext;
    const target = new EventTarget();
    const b = createBeeper({ target });
    target.dispatchEvent(new Event('pointerdown'));
    expect(b.state).toBe('not started');
    expect(b.beep()).toBe(false);
  });

  it('stays silent without Web Audio', () => {
    const target = new EventTarget();
    const b = createBeeper({ target });
    target.dispatchEvent(new Event('pointerdown'));
    expect(b.state).toBe('unavailable');
    expect(b.beep()).toBe(false);
  });
});
