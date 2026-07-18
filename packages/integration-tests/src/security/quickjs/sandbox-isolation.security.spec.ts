import { afterEach, beforeEach, describe, it } from "vitest";
import {
  createSecurityContext,
  disposeAll,
  type SecurityTestContext,
} from "../helpers/engine-factory.ts";
import {
  expectSecureRejection,
  QJS_SANDBOX_CONSTRUCTOR_ESCAPE,
  QJS_SANDBOX_GLOBALTHIS_INDEXEDDB,
  QJS_SANDBOX_GLOBALTHIS_WORKER,
  QJS_SANDBOX_PROTOTYPE_POLLUTION,
  type SecurityScenario,
} from "../helpers/security-test-utils.ts";

/**
 * QuickJS sandbox-isolation probes.
 *
 * QuickJS runs inside WASM with a curated global object, but the
 * adapter still injects `console` and `fetch`. This suite verifies
 * that no other host-side objects (Worker, IndexedDB, Function
 * constructor, etc.) leak into the guest.
 *
 * @public
 */
describe("QuickJS: sandbox isolation", () => {
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

  const cases: SecurityScenario[] = [
    QJS_SANDBOX_GLOBALTHIS_INDEXEDDB,
    QJS_SANDBOX_GLOBALTHIS_WORKER,
    QJS_SANDBOX_PROTOTYPE_POLLUTION,
    QJS_SANDBOX_CONSTRUCTOR_ESCAPE,
  ];

  for (const scenario of cases) {
    it(`${scenario.id}: ${scenario.title}`, async () => {
      const output = await ctx.runPoC(scenario.poc, 50);
      try {
        expectSecureRejection(output, scenario);
      } catch (err) {
        if (output.includes(scenario.vulnerableSubstring)) {
          throw new Error(
            `[${scenario.id}] VULNERABILITY CONFIRMED — observed: ` +
              `"${scenario.vulnerableSubstring}". ` +
              `Hardening required. Output: ${output.slice(0, 400)}`
          );
        }
        throw err;
      }
    });
  }
});
