import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createSecurityContext,
  disposeAll,
  type SecurityTestContext,
} from "../helpers/engine-factory.ts";
import {
  expectSecureRejection,
  isVulnerabilityObserved,
  MP_RESOURCE_CPU_INTENSIVE,
  MP_RESOURCE_INFINITE_LOOP,
  MP_RESOURCE_MEMORY_BOMB_DICT,
  MP_RESOURCE_MEMORY_BOMB_LIST,
} from "../helpers/security-test-utils.ts";

/**
 * MicroPython resource-limit probes.
 *
 * Verifies that the engine enforces:
 *  - `memoryLimit` (today it does not — memory bombs succeed)
 *  - `timeout` for runaway loops (today the orchestrator does, but
 *    the underlying Python VM continues consuming resources until
 *    the worker is terminated)
 *
 * Note: in Vitest, the `expectSecureRejection` helper expects the
 * engine to surface a graceful "BLOCKED" message. For hard
 * timeouts the engine throws — we accept either shape via the
 * dual-assertion pattern.
 *
 * @public
 */
describe("MicroPython: resource limits", () => {
  let ctx: SecurityTestContext;

  beforeEach(async () => {
    ctx = await createSecurityContext("micropython", {
      memoryLimit: 10 * 1024 * 1024,
      timeout: 2000,
    });
  });

  afterEach(() => {
    disposeAll(ctx);
  });

  /**
   * Hard ceiling: a single test must not exceed this. If the
   * engine hangs after a memory bomb, the test fails cleanly
   * instead of stalling the entire suite.
   */
  const HARD_TIMEOUT_MS = 8000;

  async function runWithTimeout(
    pocCode: string,
    microtaskDelayMs: number
  ): Promise<string> {
    return await Promise.race([
      ctx.runPoC(pocCode, microtaskDelayMs),
      new Promise<string>((_resolve, reject) => {
        setTimeout(
          () => reject(new Error("hard test timeout reached")),
          HARD_TIMEOUT_MS
        );
      }),
    ]);
  }

  it(`${MP_RESOURCE_MEMORY_BOMB_LIST.id}: ${MP_RESOURCE_MEMORY_BOMB_LIST.title}`, async () => {
    const output = await runWithTimeout(MP_RESOURCE_MEMORY_BOMB_LIST.poc, 50);
    try {
      expectSecureRejection(output, MP_RESOURCE_MEMORY_BOMB_LIST);
    } catch {
      if (isVulnerabilityObserved(output, MP_RESOURCE_MEMORY_BOMB_LIST)) {
        throw new Error(
          `[${MP_RESOURCE_MEMORY_BOMB_LIST.id}] VULNERABILITY CONFIRMED — ` +
            `memory bomb via list succeeded. Output: ${output.slice(0, 400)}`
        );
      }
      // Worker may have been force-terminated; any non-vulnerable
      // outcome is acceptable here (already protected by outer timeout).
      expect(output).toBeDefined();
    }
  });

  // KNOWN LIMITATION: MicroPython's `runPython` is synchronous and
  // blocks the Node.js main thread. Memory bombs via dict allocation
  // stall the WASM indefinitely — `Promise.race` timeouts cannot fire
  // because the event loop is blocked. Skipped to prevent the entire
  // suite from hanging. The scenario metadata is kept so the reporter
  // still lists the gap.
  // biome-ignore lint/suspicious/noSkippedTests: Intentional — WASM blocks event loop, timeout cannot fire
  it.skip(`${MP_RESOURCE_MEMORY_BOMB_DICT.id}: ${MP_RESOURCE_MEMORY_BOMB_DICT.title} [WASM-BLOCKING]`, async () => {
    const output = await runWithTimeout(MP_RESOURCE_MEMORY_BOMB_DICT.poc, 50);
    try {
      expectSecureRejection(output, MP_RESOURCE_MEMORY_BOMB_DICT);
    } catch {
      if (isVulnerabilityObserved(output, MP_RESOURCE_MEMORY_BOMB_DICT)) {
        throw new Error(
          `[${MP_RESOURCE_MEMORY_BOMB_DICT.id}] VULNERABILITY CONFIRMED — ` +
            `memory bomb via dict succeeded. Output: ${output.slice(0, 400)}`
        );
      }
      expect(output).toBeDefined();
    }
  });

  // KNOWN LIMITATION: MicroPython's `runPython` is synchronous and
  // blocks the Node.js main thread. The orchestrator's timeout-based
  // interrupt cannot fire while a tight loop holds the WASM, so the
  // test stalls until the suite-level timeout aborts the worker.
  // Skipped until the engine provides either an off-thread
  // execution mode or a WASM-heap preemption hook. The scenario
  // metadata is kept so the reporter still lists the gap.
  // biome-ignore lint/suspicious/noSkippedTests: Intentional — WASM blocks event loop, timeout cannot fire
  it.skip(`${MP_RESOURCE_INFINITE_LOOP.id}: ${MP_RESOURCE_INFINITE_LOOP.title} [WASM-BLOCKING]`, async () => {
    const output = await runWithTimeout(MP_RESOURCE_INFINITE_LOOP.poc, 50);
    const rejected =
      output.includes(MP_RESOURCE_INFINITE_LOOP.secureSubstring) ||
      output.toLowerCase().includes("interrupted") ||
      output.toLowerCase().includes("terminated") ||
      output.toLowerCase().includes("timeout");
    if (!rejected) {
      if (isVulnerabilityObserved(output, MP_RESOURCE_INFINITE_LOOP)) {
        throw new Error(
          `[${MP_RESOURCE_INFINITE_LOOP.id}] VULNERABILITY CONFIRMED — ` +
            `infinite loop not interrupted. Output: ${output.slice(0, 400)}`
        );
      }
      throw new Error(
        `[${MP_RESOURCE_INFINITE_LOOP.id}] unexpected output: ${output.slice(0, 400)}`
      );
    }
    expect(rejected).toBe(true);
  });

  it(`${MP_RESOURCE_CPU_INTENSIVE.id}: ${MP_RESOURCE_CPU_INTENSIVE.title}`, async () => {
    // This scenario is a positive control: the loop should COMPLETE
    // within the configured timeout. The test asserts that the
    // engine did not over-protect (false-positive OOM) and that
    // legitimate computation runs to the end.
    const output = await runWithTimeout(MP_RESOURCE_CPU_INTENSIVE.poc, 50);
    expect(output).toContain(MP_RESOURCE_CPU_INTENSIVE.secureSubstring);
  });
});
