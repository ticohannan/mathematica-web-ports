// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// shared/ui-extra.js — further Manipulate-style controls (Button, Checkbox, CheckboxBar (v0.1.33), PopupMenu, vertical
// slider, Setter used as radio row) for the second set of ports. Kept separate from shared/ui.js so
// that file stays unchanged for the first three apps. Every element gets a stable data-testid.
import { el, fmt } from './ui.js';

/** Button["label", action] — data-testid "button-<name>" */
export function addButton(controls, { name, label, onClick, parent }) {
  const b = el('button', { type: 'button', class: 'ctl-button', 'data-testid': `button-${name}` }, label);
  b.addEventListener('click', () => onClick());
  const row = el('div', { class: 'ctl ctl-buttonrow', 'data-testid': `ctl-${name}` }, b);
  (parent ?? controls.root).append(row);
  const api = { row, button: b, setEnabled: (on) => { b.disabled = !on; row.classList.toggle('is-disabled', !on); } };
  controls.controls.set(name, api);
  return api;
}

/** Checkbox control {{x, False, "label"}, {False, True}} — data-testid "check-<name>" */
export function addCheckbox(controls, { name, label, value = false, onChange, parent }) {
  const input = el('input', { type: 'checkbox', 'data-testid': `check-${name}` });
  input.checked = !!value;
  input.addEventListener('change', () => onChange?.(input.checked));
  const row = el('label', { class: 'ctl ctl-check', 'data-testid': `ctl-${name}` }, input, el('span', {}, label));
  (parent ?? controls.root).append(row);
  const api = { row, get: () => input.checked, set: (v) => { input.checked = !!v; }, setEnabled: (on) => { input.disabled = !on; row.classList.toggle('is-disabled', !on); } };
  controls.controls.set(name, api);
  return api;
}

/**
 * CheckboxBar {{x, {v1, …}, "label"}, {v1 -> "label1", …}, ControlType -> CheckboxBar} (v0.1.33): one checkbox per choice;
 * the value is the list of the checked values: a newly checked value is appended, an unchecked one removed (the order
 * in which they were checked, as Mathematica's CheckboxBar is believed to keep it; set(v) takes v's order). data-testid "checkbar-<name>-<i>" (i from 1);
 * an option's html (typeset label) replaces its text.
 */
export function addCheckboxBar(controls, { name, label = '', options, value = [], onChange, parent, toggler = false }) {
  // toggler (TogglerBar, v0.1.41): each value is a toggle button (aria-pressed) instead of a check box; same value rule
  const boxes = options.map((o, i) => {
    const input = toggler
      ? el('button', { type: 'button', class: 'ctl-toggler', 'data-testid': `toggler-${name}-${i + 1}`, 'aria-pressed': 'false' })
      : el('input', { type: 'checkbox', 'data-testid': `checkbar-${name}-${i + 1}` });
    const span = el('span', {}, o.label ?? String(o.value));
    if (o.html && o.html !== o.label) span.innerHTML = o.html;
    if (o.tooltip) (toggler ? input : span).setAttribute('title', o.tooltip);
    if (toggler) { input.append(span); if (o.tooltip) input.setAttribute('aria-label', `${o.label ?? o.value}: ${o.tooltip}`); }
    return { input, item: toggler ? input : el('label', { class: 'ctl-checkbar-item' }, input, span), value: o.value };
  });
  let order = [];
  const get = () => [...order];
  const isOn = (b) => (toggler ? b.input.getAttribute('aria-pressed') === 'true' : b.input.checked);
  const mark = (b, on) => { if (toggler) { b.input.setAttribute('aria-pressed', on ? 'true' : 'false'); b.input.classList.toggle('on', on); } else b.input.checked = on; };
  const set = (v) => {
    const on = Array.isArray(v) ? v : [];
    order = on.filter((x) => boxes.some((b) => b.value === x));
    boxes.forEach((b) => mark(b, on.some((x) => x === b.value)));
  };
  set(value);
  const flip = (b) => {
    if (toggler) mark(b, !isOn(b));
    order = isOn(b) ? [...order.filter((x) => x !== b.value), b.value] : order.filter((x) => x !== b.value);
    onChange?.(get());
  };
  boxes.forEach((b) => b.input.addEventListener(toggler ? 'click' : 'change', () => flip(b)));
  const row = el('div', { class: `ctl ctl-checkbar${toggler ? ' ctl-togglerbar' : ''}`, role: 'group', 'aria-label': label || name, 'data-testid': `ctl-${name}` },
    label ? el('span', { class: 'ctl-label' }, label) : null, ...boxes.map((b) => b.item));
  (parent ?? controls.root).append(row);
  const api = { row, get, set, setEnabled: (on) => { boxes.forEach((b) => { b.input.disabled = !on; }); row.classList.toggle('is-disabled', !on); } };
  controls.controls.set(name, api);
  return api;
}

/** PopupMenu {{x, v0, ""}, {v -> "label", ...}, PopupMenu} — data-testid "popup-<name>" */
export function addPopup(controls, { name, label = '', options, value, onChange, parent }) {
  const sel = el('select', { class: 'ctl-popup', 'data-testid': `popup-${name}`, 'aria-label': label || name });
  options.forEach((o, i) => { const opt = el('option', { value: String(i) }, o.label ?? String(o.value)); sel.append(opt); });
  const idx = (v) => options.findIndex((o) => o.value === v);
  sel.value = String(Math.max(0, idx(value)));
  sel.addEventListener('change', () => onChange?.(options[Number(sel.value)].value));
  const row = el('div', { class: 'ctl ctl-popuprow', 'data-testid': `ctl-${name}` }, label ? el('label', { class: 'ctl-label' }, label) : null, sel);
  (parent ?? controls.root).append(row);
  const api = {
    row, get: () => options[Number(sel.value)].value, set: (v) => { sel.value = String(Math.max(0, idx(v))); },
    setEnabled: (on) => { sel.disabled = !on; row.classList.toggle('is-disabled', !on); },
  };
  controls.controls.set(name, api);
  return api;
}

/**
 * VerticalSlider — data-testid "vslider-<name>"; value shown below.
 * Home = minimum, End = maximum in every engine (WAI-ARIA slider pattern). WebKit's native vertical range input maps
 * Home to the TOP, i.e. the maximum (found in Tico's WebKit run of v0.1.16: Home put prm-3d's blue_z at 2, not 0),
 * so the two keys are handled here; arrows and PageUp/PageDown stay native (they agree in all three engines).
 */
export function addVerticalSlider(controls, { name, label = '', min, max, step = 0, value, onInput, parent }) {
  const range = el('input', { type: 'range', class: 'vslider', min, max, step: step || 'any', value, 'data-testid': `vslider-${name}`, 'aria-label': label || name, 'aria-orientation': 'vertical' });
  const out = el('span', { class: 'ctl-vvalue', 'data-testid': `value-${name}` }, fmt(value, step || 0.01));
  range.addEventListener('input', () => { out.textContent = fmt(Number(range.value), step || 0.01); onInput?.(Number(range.value)); });
  range.addEventListener('keydown', (e) => {
    if (e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    range.value = String(e.key === 'Home' ? min : max);
    range.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const row = el('div', { class: 'ctl ctl-vslider', 'data-testid': `ctl-${name}` }, label ? el('label', { class: 'ctl-label' }, label) : null, range, out);
  (parent ?? controls.root).append(row);
  const api = { row, get: () => Number(range.value), set: (v) => { range.value = String(v); out.textContent = fmt(Number(v), step || 0.01); } };
  controls.controls.set(name, api);
  return api;
}

/** A horizontal group to lay controls side by side (Row[{...}] in a Manipulate). */
export function addRow(controls, { name } = {}) {
  const row = el('div', { class: 'ctl-row', style: 'display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap', 'data-testid': name ? `row-${name}` : undefined });
  controls.root.append(row);
  return row;
}

/**
 * RadioButtonBar (v0.1.37): Mathematica's {{x, x0, "label"}, {v1 -> "a", v2 -> "b"}, RadioButton} (ControlType ->
 * RadioButton; Appearance -> "Vertical" stacks the choices). data-testid "radio-<name>-<i>" (i from 1), the row
 * "ctl-<name>"; an option's html (typeset label) replaces its text.
 */
export function addRadioButtons(controls, { name, label = '', options, value, onChange, parent, vertical = false }) {
  const group = `radio-${name}-${Math.random().toString(36).slice(2, 8)}`;
  const items = options.map((o, i) => {
    const input = el('input', { type: 'radio', name: group, 'data-testid': `radio-${name}-${i + 1}` });
    const span = el('span', {}, o.label ?? String(o.value));
    if (o.html && o.html !== o.label) span.innerHTML = o.html;
    input.addEventListener('change', () => { if (input.checked) onChange?.(o.value); });
    return { input, value: o.value, item: el('label', { class: 'ctl-radio-item', style: vertical ? 'display:block' : 'margin-right:8px' }, input, span) };
  });
  const set = (v) => items.forEach((it) => { it.input.checked = it.value === v; });
  set(value);
  const box = el('span', { class: 'ctl-radio', style: vertical ? 'display:inline-block' : 'display:inline-flex;flex-wrap:wrap' }, ...items.map((it) => it.item));
  const row = el('div', { class: 'ctl ctl-radiobar', 'data-testid': `ctl-${name}` }, label ? el('span', { class: 'ctl-label' }, label) : null, box);
  (parent ?? controls.root).append(row);
  const api = {
    row, get: () => items.find((it) => it.input.checked)?.value, set,
    setEnabled: (on) => { items.forEach((it) => { it.input.disabled = !on; }); row.classList.toggle('is-disabled', !on); },
  };
  controls.controls.set(name, api);
  return api;
}

/**
 * Trigger (v0.1.37): Mathematica's {{t, t0, "label"}, tmin, tmax, dt, ControlType -> Trigger, AnimationRate -> r}: a
 * play/pause button (data-testid "trigger-play-<name>") and a reset button ("trigger-reset-<name>"). Play runs the value
 * from where it is up to tmax at r units per second of the page clock (shared/clock.js; default (tmax − tmin)/5), in
 * steps of dt when dt > 0, then stops (Mathematica's Trigger runs once); pause holds it; reset puts it back to tmin and
 * stops. The value is shown as Mathematica's Trigger does not: the ports that need it draw it themselves.
 */
export function addTrigger(controls, { name, label = '', min, max, step = 0, value, onInput, parent, rate, animate, elements, repetitions = 1 }) {
  // v0.1.41: AppearanceElements (any of "PlayPauseButton", "ResetButton", "FasterSlowerButtons"; default play/pause and
  // reset) and AnimationRepetitions (Infinity: start again at min after max, as Mathematica's Trigger does)
  let r = rate > 0 ? rate : Number.isFinite(max - min) ? (max - min) / 5 : 1; // Mathematica: 5 s over a finite range, 1 unit/s over an infinite one
  let v = value ?? min, stop = null;
  const has = (e) => (Array.isArray(elements) ? elements.includes(e) : e !== 'FasterSlowerButtons');
  const loops = repetitions === Infinity || repetitions === 'Infinity' ? Infinity : Math.max(1, repetitions || 1);
  const quant = (x) => (step > 0 ? Math.min(max, min + Math.floor((x - min) / step + 1e-9) * step) : Math.min(max, x));
  const play = el('button', { type: 'button', class: 'trigger-play', 'data-testid': `trigger-play-${name}`, 'aria-label': `play ${label || name}` }, '▶');
  const reset = el('button', { type: 'button', class: 'trigger-reset', 'data-testid': `trigger-reset-${name}`, 'aria-label': `reset ${label || name}` }, '⏮');
  const faster = el('button', { type: 'button', class: 'trigger-faster', 'data-testid': `trigger-faster-${name}`, 'aria-label': `faster ${label || name}` }, '⇈');
  const slower = el('button', { type: 'button', class: 'trigger-slower', 'data-testid': `trigger-slower-${name}`, 'aria-label': `slower ${label || name}` }, '⇊');
  const show = () => { play.textContent = stop ? '❚❚' : '▶'; play.setAttribute('aria-pressed', stop ? 'true' : 'false'); };
  const halt = () => { if (stop) { stop(); stop = null; } show(); };
  let start = min, base = 0, done = 0; // the run so far: value at its start, time already run, loops finished
  const run = () => {
    stop = animate((t, dt, elapsed) => {
      let x = start + r * (elapsed - base);
      if (x >= max && max !== Infinity && done + 1 < loops) { done += 1; base = elapsed; start = min; x = min; }
      const nv = quant(x);
      if (nv !== v) { v = nv; onInput?.(v); }
      if (v >= max) { stop = null; show(); return false; }
      return true;
    });
  };
  play.addEventListener('click', () => {
    if (stop) { halt(); return; }
    start = v >= max ? min : v; base = 0; done = 0;
    if (start !== v) { v = start; onInput?.(v); }
    run();
    show();
  });
  const respeed = (k) => { r *= k; if (stop) { halt(); start = v; base = 0; run(); show(); } };
  faster.addEventListener('click', () => respeed(1.25));
  slower.addEventListener('click', () => respeed(1 / 1.25));
  reset.addEventListener('click', () => { halt(); v = min; onInput?.(v); });
  const row = el('div', { class: 'ctl ctl-trigger', 'data-testid': `ctl-${name}` }, label ? el('span', { class: 'ctl-label' }, label) : null,
    has('PlayPauseButton') ? play : null, has('ResetButton') ? reset : null, has('FasterSlowerButtons') ? faster : null, has('FasterSlowerButtons') ? slower : null);
  (parent ?? controls.root).append(row);
  const api = { row, get: () => v, set: (x) => { v = x; }, stop: halt, isPlaying: () => !!stop, rate: () => r };
  controls.controls.set(`${name}#trigger`, api);
  return api;
}

/**
 * Animator (v0.1.41): Mathematica's ControlType -> Animator — a value that runs over [min, max] by itself.
 *   elements  AppearanceElements: any of "ProgressSlider", "PlayPauseButton", "ResetButton", "DirectionButton",
 *             "FasterSlowerButtons" (default: ProgressSlider, PlayPauseButton, FasterSlowerButtons, DirectionButton)
 *   running   AnimationRunning (default true: it starts when the page opens)
 *   duration  DefaultDuration in seconds for one sweep (default 5), a number or a function () → number read every frame
 *   rate      AnimationRate in units per second (instead of the duration)
 *   direction AnimationDirection 'Forward' (default) | 'Backward' | 'ForwardBackward'; the direction button cycles them
 *   step      the values min + k·step (0: continuous)
 * It loops for ever (Mathematica's AnimationRepetitions -> Infinity); faster/slower multiply/divide the speed by 1.25.
 * Test ids: animator-<name> (the slider), animator-play-<name>, animator-reset-<name>, animator-direction-<name>,
 * animator-faster-<name>, animator-slower-<name>.
 */
export function addAnimator(controls, { name, label = '', min, max, step = 0, value, onInput, parent, animate, elements, running = true, duration = 5, rate, direction = 'Forward' }) {
  const has = (e) => (Array.isArray(elements) ? elements : ['ProgressSlider', 'PlayPauseButton', 'FasterSlowerButtons', 'DirectionButton']).includes(e);
  const dirs = ['Forward', 'Backward', 'ForwardBackward'];
  const arrow = { Forward: '→', Backward: '←', ForwardBackward: '↔' };
  let pos = value ?? min, v = pos, dir = dirs.includes(direction) ? direction : 'Forward', sign = dir === 'Backward' ? -1 : 1, speed = 1, stop = null;
  const quant = (x) => (step > 0 ? Math.min(max, min + Math.round((x - min) / step + 1e-9) * step) : x);
  const unitsPerSecond = () => (rate > 0 ? rate : (max - min) / Math.max(1e-9, typeof duration === 'function' ? duration() : duration)) * speed;
  const slider = el('input', { type: 'range', class: 'ctl-animator-slider', 'data-testid': `animator-${name}`, 'aria-label': label || name, min: String(min), max: String(max), step: step > 0 ? String(step) : 'any', value: String(v) });
  const play = el('button', { type: 'button', class: 'animator-play', 'data-testid': `animator-play-${name}`, 'aria-label': `play ${label || name}` }, '▶');
  const reset = el('button', { type: 'button', class: 'animator-reset', 'data-testid': `animator-reset-${name}`, 'aria-label': `reset ${label || name}` }, '⏮');
  const dirBtn = el('button', { type: 'button', class: 'animator-direction', 'data-testid': `animator-direction-${name}`, 'aria-label': `direction ${label || name}` }, arrow[dir]);
  const faster = el('button', { type: 'button', class: 'animator-faster', 'data-testid': `animator-faster-${name}`, 'aria-label': `faster ${label || name}` }, '⇈');
  const slower = el('button', { type: 'button', class: 'animator-slower', 'data-testid': `animator-slower-${name}`, 'aria-label': `slower ${label || name}` }, '⇊');
  const show = () => { play.textContent = stop ? '❚❚' : '▶'; play.setAttribute('aria-pressed', stop ? 'true' : 'false'); dirBtn.textContent = arrow[dir]; };
  const emit = () => { const nv = quant(pos); slider.value = String(nv); if (nv !== v) { v = nv; onInput?.(v); } };
  const tick = (t, dt) => {
    const span = max - min;
    if (!(span > 0)) return true;
    pos += sign * unitsPerSecond() * dt;
    if (dir === 'ForwardBackward') {
      while (pos > max || pos < min) { if (pos > max) { pos = 2 * max - pos; sign = -1; } else { pos = 2 * min - pos; sign = 1; } }
    } else {
      while (pos > max) pos -= span;
      while (pos < min) pos += span;
    }
    emit();
    return true;
  };
  const start = () => { if (!stop) { stop = animate(tick); show(); } };
  const halt = () => { if (stop) { stop(); stop = null; } show(); };
  play.addEventListener('click', () => (stop ? halt() : start()));
  reset.addEventListener('click', () => { pos = min; emit(); });
  dirBtn.addEventListener('click', () => { dir = dirs[(dirs.indexOf(dir) + 1) % dirs.length]; sign = dir === 'Backward' ? -1 : 1; show(); });
  faster.addEventListener('click', () => { speed *= 1.25; });
  slower.addEventListener('click', () => { speed /= 1.25; });
  slider.addEventListener('input', () => { pos = Number(slider.value); emit(); });
  const row = el('div', { class: 'ctl ctl-animator', 'data-testid': `ctl-${name}` }, label ? el('span', { class: 'ctl-label' }, label) : null,
    has('ProgressSlider') ? slider : null, has('PlayPauseButton') ? play : null, has('ResetButton') ? reset : null,
    has('DirectionButton') ? dirBtn : null, has('FasterSlowerButtons') ? faster : null, has('FasterSlowerButtons') ? slower : null);
  (parent ?? controls.root).append(row);
  show();
  if (running) start();
  const api = {
    row, get: () => v, set: (x) => { pos = x; v = x; slider.value = String(x); },
    stop: halt, play: start, isPlaying: () => !!stop, direction: () => dir, speed: () => unitsPerSecond(),
    setEnabled: (on) => { [slider, play, reset, dirBtn, faster, slower].forEach((b) => { b.disabled = !on; }); row.classList.toggle('is-disabled', !on); },
  };
  controls.controls.set(name, api);
  return api;
}
