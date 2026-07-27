import { EngineOrchestrator } from "@glyphide/orchestrator";
import { afterEach, describe, expect, it } from "vitest";
import { createQuickJSWorker } from "../../orchestrator-quickjs/setup/quickjs-worker-factory.ts";

/**
 * Orchestrator worker-cleanup probes.
 *
 * Verifies that after a memory-bomb crash the orchestrator is
 * still usable and the worker is actually disposed (no orphan
 * processes / leaked WASM contexts).
 *
 * Today the adapter's `dispose()` is called by the worker's
 * `terminate()` shim, but a second `init()` on the SAME
 * orchestrator reuses the runtime, which can keep a stale
 * large allocation alive. The test asserts that:
 *
 *  1. The memory-bomb does not crash the host process.
 *  2. The orchestrator's `terminate()` is idempotent.
 *  3. A fresh `init()` after `terminate()` produces a working engine.
 *
 * @public
 */
describe("Orchestrator: worker cleanup", () => {
  let orchestrator: EngineOrchestrator | null = null;

  afterEach(() => {
    orchestrator?.terminate();
    orchestrator = null;
  });

  it("R-SEC-ORC-02: worker is cleaned up after OOM crash", async () => {
    orchestrator = new EngineOrchestrator({
      createWorker: createQuickJSWorker,
    });
    await orchestrator.init({ memoryLimit: 2 * 1024 * 1024, timeout: 5000 });

    // Trigger a memory bomb. The adapter should reject the alloc
    // OR throw a graceful error; in either case the run promise
    // must reject (not hang).
    await expect(
      orchestrator.run(`
        const arr = [];
        try {
          while (true) arr.push(new Array(100000).fill(0));
        } catch (e) {
          console.log("REJECTED:", e.message);
          throw e;
        }
        console.log("VULNERABILITY: memory bomb succeeded");
      `)
    ).rejects.toThrow();

    // terminate() must be idempotent and not throw.
    expect(() => orchestrator?.terminate()).not.toThrow();
    expect(() => orchestrator?.terminate()).not.toThrow();

    // A fresh init must produce a working engine. If the worker
    // is leaking, this will fail with "Orchestrator not initialized"
    // or with a worker-spawn error.
    await orchestrator.init({ memoryLimit: 10 * 1024 * 1024, timeout: 5000 });
    await expect(orchestrator.run("1 + 1")).resolves.toBeUndefined();
  });
});
