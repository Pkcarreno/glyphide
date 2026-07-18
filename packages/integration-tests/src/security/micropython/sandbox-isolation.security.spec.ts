import { afterEach, beforeEach, describe, it } from "vitest";
import {
  createSecurityContext,
  disposeAll,
  type SecurityTestContext,
} from "../helpers/engine-factory.ts";
import {
  expectSecureRejection,
  isVulnerabilityObserved,
  MP_SANDBOX_GLOBALTHIS_INDEXEDDB,
  MP_SANDBOX_GLOBALTHIS_LOCALSTORAGE,
  MP_SANDBOX_GLOBALTHIS_WORKER,
  MP_SANDBOX_GLOBALTHIS_XHR,
  MP_SANDBOX_IMPORT_JS_EXFIL,
  type SecurityScenario,
} from "../helpers/security-test-utils.ts";

/**
 * MicroPython sandbox isolation probes.
 *
 * Each test executes a PoC that tries to reach a host-side global
 * through PyScript's `import js`. The PoC prints either
 * `VULNERABILITY: ...` if the global is reachable, or `BLOCKED: ...`
 * if the engine rejects the access.
 *
 * The test asserts the SECURE branch. In the RED phase the assertion
 * fails — that failure IS the evidence documented in
 * `docs/security/audit-2026-07.md` by the custom reporter.
 *
 * @public
 */
describe("MicroPython: sandbox isolation", () => {
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

  const cases: SecurityScenario[] = [
    MP_SANDBOX_GLOBALTHIS_INDEXEDDB,
    MP_SANDBOX_GLOBALTHIS_LOCALSTORAGE,
    MP_SANDBOX_GLOBALTHIS_WORKER,
    MP_SANDBOX_IMPORT_JS_EXFIL,
    MP_SANDBOX_GLOBALTHIS_XHR,
  ];

  for (const scenario of cases) {
    it(`${scenario.id}: ${scenario.title}`, async () => {
      const output = await ctx.runPoC(scenario.poc, 50);

      // RED-phase evidence: the test fails because the engine
      // printed the VULNERABILITY line. We surface the leaked
      // text in the assertion error so the reporter can include
      // it verbatim in the audit markdown.
      try {
        expectSecureRejection(output, scenario);
      } catch (err) {
        if (isVulnerabilityObserved(output, scenario)) {
          throw new Error(
            `[${scenario.id}] VULNERABILITY CONFIRMED — observed: ` +
              `"${scenario.vulnerableSubstring}". ` +
              `Hardening required. Captured output: ${output.slice(0, 400)}`
          );
        }
        throw err;
      }
    });
  }
});
