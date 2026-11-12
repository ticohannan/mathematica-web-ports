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
export function addCheckboxBar(controls, { name, label = '', options, value = [], onChange, parent }) {
  const boxes = options.map((o, i) => {
    const input = el('input', { type: 'checkbox', 'data-testid': `checkbar-${name}-${i + 1}` });
    const span = el('span', {}, o.label ?? String(o.value));
    if (o.html && o.html !== o.label) span.innerHTML = o.html;
    return { input, item: el('label', { class: 'ctl-checkbar-item' }, input, span), value: o.value };
  });
  let order = [];
  const get = () => [...order];
  const set = (v) => {
    const on = Array.isArray(v) ? v : [];
    order = on.filter((x) => boxes.some((b) => b.value === x));
    boxes.forEach((b) => { b.input.checked = on.some((x) => x === b.value); });
  };
  set(value);
  boxes.forEach((b) => b.input.addEventListener('change', () => {
    order = b.input.checked ? [...order.filter((x) => x !== b.value), b.value] : order.filter((x) => x !== b.value);
    onChange?.(get());
  }));
  const row = el('div', { class: 'ctl ctl-checkbar', role: 'group', 'aria-label': label || name, 'data-testid': `ctl-${name}` },
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
 * Home to the TOP, i.e. the maximum (found in the owner's WebKit run of v0.1.16: Home put prm-3d's blue_z at 2, not 0),
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
export function addTrigger(controls, { name, label = '', min, max, step = 0, value, onInput, parent, rate, animate }) {
  const r = rate > 0 ? rate : (max - min) / 5;
  let v = value ?? min, stop = null;
  const quant = (x) => (step > 0 ? Math.min(max, min + Math.floor((x - min) / step + 1e-9) * step) : Math.min(max, x));
  const play = el('button', { type: 'button', class: 'trigger-play', 'data-testid': `trigger-play-${name}`, 'aria-label': `play ${label || name}` }, '▶');
  const reset = el('button', { type: 'button', class: 'trigger-reset', 'data-testid': `trigger-reset-${name}`, 'aria-label': `reset ${label || name}` }, '⏮');
  const show = () => { play.textContent = stop ? '❚❚' : '▶'; play.setAttribute('aria-pressed', stop ? 'true' : 'false'); };
  const halt = () => { if (stop) { stop(); stop = null; } show(); };
  play.addEventListener('click', () => {
    if (stop) { halt(); return; }
    let start = v >= max ? min : v;
    if (start !== v) { v = start; onInput?.(v); }
    stop = animate((t, dt, elapsed) => {
      const nv = quant(start + r * elapsed);
      if (nv !== v) { v = nv; onInput?.(v); }
      if (v >= max) { stop = null; show(); return false; }
      return true;
    });
    show();
  });
  reset.addEventListener('click', () => { halt(); v = min; onInput?.(v); });
  const row = el('div', { class: 'ctl ctl-trigger', 'data-testid': `ctl-${name}` }, label ? el('span', { class: 'ctl-label' }, label) : null, play, reset);
  (parent ?? controls.root).append(row);
  const api = { row, get: () => v, set: (x) => { v = x; }, stop: halt, isPlaying: () => !!stop };
  controls.controls.set(`${name}#trigger`, api);
  return api;
}
