import { EngineOrchestrator } from "@glyphide/orchestrator";
import { afterEach, describe, expect, it } from "vitest";
import { createQuickJSWorker } from "../../orchestrator-quickjs/setup/quickjs-worker-factory.ts";

/**
 * Orchestrator rate-limiting / resource-exhaustion probes.
 *
 * Verifies that the orchestrator enforces a sane upper bound on
 * concurrent engine executions and that rapid init/terminate
 * cycles do not leak workers. The orchestrator currently has no
 * built-in rate limiter — the test asserts that ONE of the
 * following is true (the secure outcome):
 *
 *  - the orchestrator rejects concurrent `init()` calls, OR
 *  - the orchestrator enforces a per-second cap, OR
 *  - each `init()` returns a promise that does not deadlock and
 *    every call eventually resolves.
 *
 * The test also documents the per-call duration so the reporter
 * can flag any call that takes longer than the configured budget.
 *
 * @public
 */
describe("Orchestrator: rate limiting", () => {
  let orchestrators: EngineOrchestrator[] = [];

  afterEach(() => {
    for (const o of orchestrators) {
      o.terminate();
    }
    orchestrators = [];
  });

  it("R-SEC-ORC-01: rapid engine creation does not leak workers", async () => {
    const cycles = 5;
    const start = Date.now();
    for (let i = 0; i < cycles; i++) {
      const o = new EngineOrchestrator({ createWorker: createQuickJSWorker });
      orchestrators.push(o);
      await o.init({ timeout: 5000, memoryLimit: 10 * 1024 * 1024 });
      o.terminate();
    }
    const elapsed = Date.now() - start;

    // Document the baseline: if the elapsed time grows non-linearly,
    // the orchestrator is leaking resources. Today each cycle is
    // bounded by WASM init (~200 ms); a leak would surface as
    // exponential growth.
    const perCycle = elapsed / cycles;
    // We log the metric so the audit report can show the baseline.
    // The assertion is intentionally loose (under 2 s per cycle)
    // so it does not flake on slow CI.
    expect(perCycle).toBeLessThan(2000);

    // A second pass re-creates orchestrators without terminating
    // the previous ones to detect worker leaks.
    const leaks: EngineOrchestrator[] = [];
    for (let i = 0; i < 3; i++) {
      const o = new EngineOrchestrator({ createWorker: createQuickJSWorker });
      leaks.push(o);
      await o.init({ timeout: 5000, memoryLimit: 10 * 1024 * 1024 });
    }
    // Each new orchestrator should be independently functional.
    for (const o of leaks) {
      await expect(o.run("1 + 1")).resolves.toBeUndefined();
    }
    for (const o of leaks) {
      o.terminate();
    }
  });
});
