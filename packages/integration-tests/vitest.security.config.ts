import { defineConfig } from "vitest/config";

/**
 * Security-specific Vitest configuration.
 *
 * Security tests are expected to FAIL in the RED phase. They run
 * against real engine adapters via the in-process fake Worker pattern
 * and probe attack vectors. They are kept isolated from functional
 * tests by:
 *
 * - A dedicated config file (does NOT inherit from `vitest.config.ts`)
 * - 10s hard per-test timeout (WASM init + memory bombs are slow)
 * - Sequential execution (avoids OOM from parallel WASM init)
 * - A custom reporter that produces `docs/security/audit-2026-07.md`
 *
 * Run with: `pnpm test:security`
 */
export default defineConfig({
  test: {
    environment: "node",
    exclude: [
      "src/shared/**",
      "src/orchestrator-*/**",
      "src/orchestrator-mock/**",
    ],
    hookTimeout: 10_000,
    include: ["src/security/**/*.security.spec.ts"],
    // One file per fork. The QuickJS runtime aborts the process if
    // dispose() runs with a non-empty GC list, so isolating each
    // test file in its own process prevents one file's abort from
    // killing the rest of the suite.
    maxWorkers: 1,
    passWithNoTests: true,
    pool: "forks",
    reporters: ["default", "./src/security/helpers/security-reporter.ts"],
    sequence: {
      concurrent: false,
    },
    teardownTimeout: 5000,
    testTimeout: 10_000,
  },
});
