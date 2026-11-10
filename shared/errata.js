// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// shared/errata.js — the switch "errors of the original: kept | corrected" (a port addition, v0.1.34).
//
// Each design document lists the errors found in the original Demonstration (DESIGN.md §11). A faithful port
// reproduces them. An app that offers corrections adds ONE Manipulate variable, `errata`, with the values
// 'original' (the default: every result is the original's) and 'corrected' (only the code named in the app's
// errata-mode.js takes its corrected branch):
//
//   import { ErrataControl } from '../../shared/errata.js';
//   import { CORRECTIONS } from './errata-mode.js';
//   Manipulate({ …, controls: [ …the original's controls…, ErrataControl(CORRECTIONS) ] });
//
// and its model asks `isCorrected(state)` (a state without the variable is the original, so saved states, golden
// data and harness scenarios need no change). The control is a setter bar placed in the page's `.panel-tools` row;
// the list of what "corrected" changes is shown under the Details as a <details data-testid="errata-details">.
//
// CORRECTIONS: [{ id: 'E-XX-nn', original: '…', corrected: '…' }, …] — plain text or simple inline HTML written by the
// app (never user input): what the original does, and what the corrected mode does instead.

export const ORIGINAL = 'original';
export const CORRECTED = 'corrected';
/** The Manipulate variable's name. */
export const ERRATA = 'errata';

/** True when the state asks for the corrected behaviour; a state without the variable is the original. */
export const isCorrected = (state) => !!state && state[ERRATA] === CORRECTED;

const el = (tag, attrs = {}, html = '') => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (html) e.innerHTML = html;
  return e;
};

/** The note under the Details: what the corrected mode changes (built once per page). */
export function renderErrataNote(corrections, doc = document) {
  if (doc.querySelector('[data-testid=errata-details]')) return doc.querySelector('[data-testid=errata-details]');
  const note = el('details', { class: 'details errata-note', 'data-testid': 'errata-details' });
  note.append(el('summary', {}, 'Errors of the original: what "corrected" changes'));
  note.append(el('p', {}, 'The switch "errors of the original" is an addition of this port. With <b>kept</b> (the default) the page computes and draws what the original Demonstration does, including the errors found in it. With <b>corrected</b> only the following changes:'));
  const list = el('ul', { class: 'errata-list' });
  for (const c of corrections) {
    const item = el('li', { 'data-errata-id': c.id });
    item.append(el('b', {}, c.id), el('span', {}, ` — original: ${c.original} `), el('span', { class: 'errata-corrected' }, `<b>Corrected:</b> ${c.corrected}`));
    list.append(item);
  }
  note.append(list);
  note.append(el('p', {}, 'Everything else is the same in both modes. The other findings about the original (for example errors in its texts) are listed in this app\'s design document (DESIGN.md §11) and are not affected by the switch. "Initial settings" returns to "kept".'));
  const anchor = doc.querySelector('[data-testid=details]') ?? doc.querySelector('.manipulate');
  if (anchor) anchor.insertAdjacentElement('afterend', note);
  return note;
}

/**
 * The control spec of the switch for shared/manipulate.js (a setter bar in the page's `.panel-tools` row) — also
 * writes the note. `corrections` is the app's CORRECTIONS list.
 */
export function ErrataControl(corrections = []) {
  let parent;
  if (typeof document !== 'undefined') {
    renderErrataNote(corrections);
    parent = document.querySelector('.panel-tools') ?? undefined;
  }
  return [[ERRATA, ORIGINAL, 'errors of the original'],
    [{ rule: true, value: ORIGINAL, label: 'kept' }, { rule: true, value: CORRECTED, label: 'corrected' }],
    { ControlType: { controlType: 'SetterBar' }, parent }];
}
