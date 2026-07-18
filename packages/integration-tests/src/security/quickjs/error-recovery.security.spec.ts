import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createSecurityContext,
  disposeAll,
  type SecurityTestContext,
} from "../helpers/engine-factory.ts";
import {
  expectSecureRejection,
  QJS_RECOVERY_AFTER_BLOCKED_FETCH,
  QJS_RECOVERY_AFTER_THROWN,
} from "../helpers/security-test-utils.ts";

/**
 * QuickJS error-recovery probes.
 *
 * Verifies that the engine remains usable after a guest statement
 * throws or after a fetch is rejected. A correct implementation
 * must:
 *  1. Reject the dangerous access (the BLOCKED branch of the PoC)
 *  2. Keep the WASM context alive for further guest statements
 *  3. Continue to enforce the security policy on subsequent runs
 *
 * @public
 */
describe("QuickJS: error recovery", () => {
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

  it(`${QJS_RECOVERY_AFTER_BLOCKED_FETCH.id}: ${QJS_RECOVERY_AFTER_BLOCKED_FETCH.title}`, async () => {
    const output = await ctx.runPoC(QJS_RECOVERY_AFTER_BLOCKED_FETCH.poc, 200);
    try {
      expectSecureRejection(output, QJS_RECOVERY_AFTER_BLOCKED_FETCH);
    } catch {
      // The PoC swallows the rejected promise, so the only output
      // we ever see is the RECOVERED line. The "VULNERABILITY"
      // branch never fires here, so we instead verify that the
      // blocked-fetch actually surfaced as a console error (the
      // .catch swallowed it) AND that the engine kept running.
      if (!output.includes(QJS_RECOVERY_AFTER_BLOCKED_FETCH.secureSubstring)) {
        throw new Error(
          `[${QJS_RECOVERY_AFTER_BLOCKED_FETCH.id}] engine did not recover — ` +
            `output: ${output.slice(0, 400)}`
        );
      }
      // The PoC is structured so that, in the RED phase, the fetch
      // succeeds (reaches the network stack). We surface that as
      // a vulnerability evidence.
      throw new Error(
        `[${QJS_RECOVERY_AFTER_BLOCKED_FETCH.id}] VULNERABILITY CONFIRMED — ` +
          "loopback fetch was permitted (engine did not enforce URL policy). " +
          `Output: ${output.slice(0, 400)}`
      );
    }
  });

  it(`${QJS_RECOVERY_AFTER_THROWN.id}: ${QJS_RECOVERY_AFTER_THROWN.title}`, async () => {
    // First run: the guest throws. The orchestrator must surface the
    // error, NOT silently keep the broken context.
    const firstRun = await ctx.runPoC(QJS_RECOVERY_AFTER_THROWN.poc, 50);
    // The run rejected, which `runPoC` surfaces as a captured output
    // entry of type "error" or "stderr". Either way, the message
    // should mention the intentional error.
    expect(firstRun.toLowerCase()).toMatch(RECOVERY_RE);

    // Second run on the same context: must succeed. If the adapter
    // leaks the broken context, this run will either hang or fail
    // with the same exception.
    const followUp = await ctx.runPoC(
      "console.log('RECOVERED: 1+1 =', 1 + 1)",
      50
    );
    expect(followUp).toContain("RECOVERED");
  });
});

const RECOVERY_RE = /intentional|throw|error/;
