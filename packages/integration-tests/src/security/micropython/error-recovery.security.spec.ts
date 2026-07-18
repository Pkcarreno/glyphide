import { afterEach, beforeEach, describe, it } from "vitest";
import {
  createSecurityContext,
  disposeAll,
  type SecurityTestContext,
} from "../helpers/engine-factory.ts";
import {
  expectSecureRejection,
  MP_RECOVERY_AFTER_GLOBALTHIS_ACCESS,
} from "../helpers/security-test-utils.ts";

/**
 * MicroPython error-recovery probes.
 *
 * Verifies that after a security-sensitive exception, the engine
 * is still usable and a fresh guest statement runs to completion.
 * A passing test today is itself a vulnerability finding (recovery
 * is fine — what is NOT fine is that the exception did not deny
 * the access in the first place).
 *
 * @public
 */
describe("MicroPython: error recovery", () => {
  let ctx: SecurityTestContext;

  beforeEach(async () => {
    ctx = await createSecurityContext("micropython", {
      memoryLimit: 10 * 1024 * 1024,
      timeout: 5000,
    });
  });

  afterEach(() => {
    disposeAll(ctx);
  });

  it(`${MP_RECOVERY_AFTER_GLOBALTHIS_ACCESS.id}: ${MP_RECOVERY_AFTER_GLOBALTHIS_ACCESS.title}`, async () => {
    const output = await ctx.runPoC(
      MP_RECOVERY_AFTER_GLOBALTHIS_ACCESS.poc,
      50
    );

    // Today the engine will swallow the inner exception and continue.
    // We assert that the engine REJECTS the access and also stays
    // operational — both must hold after hardening.
    try {
      expectSecureRejection(output, MP_RECOVERY_AFTER_GLOBALTHIS_ACCESS);
    } catch (err) {
      if (
        output.includes(MP_RECOVERY_AFTER_GLOBALTHIS_ACCESS.vulnerableSubstring)
      ) {
        throw new Error(
          `[${MP_RECOVERY_AFTER_GLOBALTHIS_ACCESS.id}] VULNERABILITY CONFIRMED — ` +
            `globalThis access was permitted (no exception). Output: ${output.slice(0, 400)}`
        );
      }
      // The PoC is structured so that even if the access is denied
      // via a non-`BLOCKED` path, we still want a healthy "RECOVERED"
      // follow-up. If the engine is half-broken, fail with context.
      if (
        !output.includes(MP_RECOVERY_AFTER_GLOBALTHIS_ACCESS.secureSubstring)
      ) {
        throw new Error(
          `[${MP_RECOVERY_AFTER_GLOBALTHIS_ACCESS.id}] engine did not recover — output: ${output.slice(0, 400)}`
        );
      }
      throw err;
    }
  });
});
