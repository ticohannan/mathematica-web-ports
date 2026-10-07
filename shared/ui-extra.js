// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// shared/ui-extra.js — further Manipulate-style controls (Button, Checkbox, PopupMenu, vertical
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

/** PopupMenu {{x, v0, ""}, {v -> "label", ...}, PopupMenu} — data-testid "popup-<name>" */
export function addPopup(controls, { name, label = '', options, value, onChange, parent }) {
  const sel = el('select', { class: 'ctl-popup', 'data-testid': `popup-${name}`, 'aria-label': label || name });
  options.forEach((o, i) => { const opt = el('option', { value: String(i) }, o.label ?? String(o.value)); sel.append(opt); });
  const idx = (v) => options.findIndex((o) => o.value === v);
  sel.value = String(Math.max(0, idx(value)));
  sel.addEventListener('change', () => onChange?.(options[Number(sel.value)].value));
  const row = el('div', { class: 'ctl ctl-popuprow', 'data-testid': `ctl-${name}` }, label ? el('label', { class: 'ctl-label' }, label) : null, sel);
  (parent ?? controls.root).append(row);
  const api = { row, get: () => options[Number(sel.value)].value, set: (v) => { sel.value = String(Math.max(0, idx(v))); } };
  controls.controls.set(name, api);
  return api;
}

/** VerticalSlider — data-testid "vslider-<name>"; value shown below */
export function addVerticalSlider(controls, { name, label = '', min, max, step = 0, value, onInput, parent }) {
  const range = el('input', { type: 'range', class: 'vslider', min, max, step: step || 'any', value, 'data-testid': `vslider-${name}`, 'aria-label': label || name, 'aria-orientation': 'vertical' });
  const out = el('span', { class: 'ctl-vvalue', 'data-testid': `value-${name}` }, fmt(value, step || 0.01));
  range.addEventListener('input', () => { out.textContent = fmt(Number(range.value), step || 0.01); onInput?.(Number(range.value)); });
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
