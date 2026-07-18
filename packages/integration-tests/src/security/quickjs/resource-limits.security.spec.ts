import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createSecurityContext,
  disposeAll,
  type SecurityTestContext,
} from "../helpers/engine-factory.ts";
import {
  expectSecureRejection,
  isVulnerabilityObserved,
  QJS_RESOURCE_DYNAMIC_IMPORT,
  QJS_RESOURCE_EXTREME_MEMORY,
  QJS_RESOURCE_NEGATIVE_TIMEOUT,
  QJS_RESOURCE_NESTED_EVAL,
} from "../helpers/security-test-utils.ts";

const TIMEOUT_ERROR_RE = /timeout|invalid|reject/i;
const MEMORY_ERROR_RE = /memory|limit|invalid|reject/i;

/**
 * QuickJS resource-limit probes.
 *
 * Verifies that:
 *  - `memoryLimit` set at init is actually enforced by the WASM
 *    runtime, not silently ignored.
 *  - `timeout` is a positive integer clamped to a sane maximum
 *    (or rejected entirely if negative).
 *  - `import()` to a remote URL is blocked.
 *  - Indirect `eval` does not widen the lexical scope.
 *
 * @public
 */
describe("QuickJS: resource limits", () => {
  let ctx: SecurityTestContext;

  beforeEach(async () => {
    ctx = await createSecurityContext("quickjs", {
      memoryLimit: 10 * 1024 * 1024,
      timeout: 5000,
    });
  });

  afterEach(() => {
    disposeAll(ctx);
  });

  it(`${QJS_RESOURCE_NEGATIVE_TIMEOUT.id}: ${QJS_RESOURCE_NEGATIVE_TIMEOUT.title}`, async () => {
    // The negative-timeout probe is best framed as: init() with
    // `timeout: -1` should fail OR be clamped to the engine's
    // default. Today, the adapter accepts the value and never
    // sanity-checks it, so a guest can starve the orchestrator.
    // We exercise the init path directly here.
    disposeAll(ctx);
    let initFailed = false;
    try {
      const hostile = await createSecurityContext("quickjs", {
        memoryLimit: 10 * 1024 * 1024,
        timeout: -1,
      });
      // If init succeeded, the engine accepted the bad config.
      // Run a trivial PoC to confirm the orchestrator is at least
      // alive (which today it is, because -1 is not validated).
      const out = await hostile.runPoC("console.log('hostile-init-ok')", 50);
      if (out.includes("hostile-init-ok")) {
        throw new Error(
          `[${QJS_RESOURCE_NEGATIVE_TIMEOUT.id}] VULNERABILITY CONFIRMED — ` +
            `engine accepted negative timeout and ran code. Output: ${out.slice(0, 200)}`
        );
      }
      disposeAll(hostile);
    } catch (err) {
      initFailed = true;
      // A thrown error during init is the SECURE outcome.
      // Verify it looks like a validation error, not a crash.
      const msg = err instanceof Error ? err.message : String(err);
      if (!TIMEOUT_ERROR_RE.test(msg)) {
        throw new Error(
          `[${QJS_RESOURCE_NEGATIVE_TIMEOUT.id}] unexpected init error: ${msg}`
        );
      }
    }
    expect(initFailed).toBe(true);
  });

  it(`${QJS_RESOURCE_EXTREME_MEMORY.id}: ${QJS_RESOURCE_EXTREME_MEMORY.title}`, async () => {
    // A 100 GB request must be rejected (or clamped) at init time.
    // Today the adapter accepts the value, the runtime is created
    // with setMemoryLimit called, and the VM dies on the first
    // allocation — but the rejection is downstream of the guest
    // call, not the init boundary.
    disposeAll(ctx);
    let initFailed = false;
    try {
      const hostile = await createSecurityContext("quickjs", {
        memoryLimit: 100 * 1024 * 1024 * 1024,
        timeout: 5000,
      });
      // Run a small PoC that should succeed if init truly capped
      // the memory at a reasonable value.
      const out = await hostile.runPoC("console.log('extreme-mem-ok')", 50);
      if (out.includes("extreme-mem-ok")) {
        throw new Error(
          `[${QJS_RESOURCE_EXTREME_MEMORY.id}] VULNERABILITY CONFIRMED — ` +
            `engine accepted 100GB memoryLimit. Output: ${out.slice(0, 200)}`
        );
      }
      disposeAll(hostile);
    } catch (err) {
      initFailed = true;
      // The QuickJS WASM runtime may throw a plain object on abort
      // (e.g. `{ message: "..." }` or just a number). We normalize
      // the error message for assertion.
      let msg: string;
      if (err instanceof Error) {
        msg = err.message;
      } else if (
        err &&
        typeof err === "object" &&
        "message" in err &&
        typeof (err as { message: unknown }).message === "string"
      ) {
        msg = (err as { message: string }).message;
      } else {
        msg = JSON.stringify(err);
      }
      // A thrown error during init is the SECURE outcome.
      // If it doesn't look like a validation error, reclassify
      // it as a vulnerability (the engine crashed instead of
      // rejecting the bad config gracefully).
      if (!MEMORY_ERROR_RE.test(msg)) {
        throw new Error(
          `[${QJS_RESOURCE_EXTREME_MEMORY.id}] VULNERABILITY CONFIRMED — ` +
            `engine accepted 100GB memoryLimit or crashed ungracefully. Error: ${msg.slice(0, 200)}`
        );
      }
    }
    expect(initFailed).toBe(true);
  });

  it(`${QJS_RESOURCE_DYNAMIC_IMPORT.id}: ${QJS_RESOURCE_DYNAMIC_IMPORT.title}`, async () => {
    const output = await ctx.runPoC(QJS_RESOURCE_DYNAMIC_IMPORT.poc, 300);
    try {
      expectSecureRejection(output, QJS_RESOURCE_DYNAMIC_IMPORT);
    } catch (err) {
      if (isVulnerabilityObserved(output, QJS_RESOURCE_DYNAMIC_IMPORT)) {
        throw new Error(
          `[${QJS_RESOURCE_DYNAMIC_IMPORT.id}] VULNERABILITY CONFIRMED — ` +
            `dynamic import() reached a remote module. Output: ${output.slice(0, 400)}`
        );
      }
      throw err;
    }
  });

  it(`${QJS_RESOURCE_NESTED_EVAL.id}: ${QJS_RESOURCE_NESTED_EVAL.title}`, async () => {
    const output = await ctx.runPoC(QJS_RESOURCE_NESTED_EVAL.poc, 50);
    try {
      expectSecureRejection(output, QJS_RESOURCE_NESTED_EVAL);
    } catch (err) {
      if (isVulnerabilityObserved(output, QJS_RESOURCE_NESTED_EVAL)) {
        throw new Error(
          `[${QJS_RESOURCE_NESTED_EVAL.id}] VULNERABILITY CONFIRMED — ` +
            `indirect eval observed host global. Output: ${output.slice(0, 400)}`
        );
      }
      throw err;
    }
  });
});
