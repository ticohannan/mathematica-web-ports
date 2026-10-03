// SPDX-FileCopyrightText: 2026 Tico Hannan
// SPDX-License-Identifier: MIT
// vitest.config.js — unit + golden-parity tests (run in Node, no browser needed)
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.js', 'tests/golden/**/*.test.js'],
    environment: 'node',
    reporters: ['default'],
  },
});
