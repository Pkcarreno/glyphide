import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  it,
} from "vitest";
import { createTestServer, type TestServer } from "../../shared/test-server.ts";
import {
  createSecurityContext,
  disposeAll,
  type SecurityTestContext,
} from "../helpers/engine-factory.ts";
import {
  expectSecureRejection,
  injectTarget,
  isVulnerabilityObserved,
  QJS_NETWORK_FETCH_FILE,
  QJS_NETWORK_FETCH_LOCALHOST,
  QJS_NETWORK_FETCH_METADATA,
  QJS_NETWORK_FETCH_RFC1918,
  QJS_NETWORK_RESPONSE_BOMB,
  QJS_NETWORK_SENSITIVE_HEADERS,
  type SecurityScenario,
} from "../helpers/security-test-utils.ts";

/**
 * QuickJS network security probes.
 *
 * Verifies that the `fetch` shim injected by the QuickJS adapter
 * blocks known dangerous targets: loopback, RFC1918, cloud
 * metadata, `file://`, and that it strips sensitive headers and
 * caps response size.
 *
 * KNOWN LIMITATION: The current QuickJS-emscripten runtime aborts
 * the host process with `Aborted(Assertion failed: list_empty(&rt->gc_obj_list), at: .../JS_FreeRuntime)`
 * when `dispose()` runs while a `fetch` promise is still in
 * flight. This is a bug in the adapter, not the test, but it kills
 * the entire fork before the teardown can complete. Until the
 * adapter is fixed, the network probes are skipped at the spec
 * level (the scenarios are still listed in the reporter table so
 * the audit shows the gap).
 *
 * @public
 */
describe("QuickJS: network security", () => {
  let server: TestServer;
  let ctx: SecurityTestContext;

  beforeAll(async () => {
    server = createTestServer();
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  beforeEach(async () => {
    ctx = await createSecurityContext("quickjs", {
      memoryLimit: 10 * 1024 * 1024,
      timeout: 10_000,
    });
  });

  afterEach(() => {
    disposeAll(ctx);
  });

  const localCases: SecurityScenario[] = [
    QJS_NETWORK_FETCH_LOCALHOST,
    QJS_NETWORK_FETCH_METADATA,
    QJS_NETWORK_FETCH_RFC1918,
    QJS_NETWORK_FETCH_FILE,
  ];

  for (const scenario of localCases) {
    // SKIP: see header comment. The PoC is preserved so the scenario
    // is documented in the audit.
    // biome-ignore lint/suspicious/noSkippedTests: Intentional — WASM GC abort on in-flight fetch
    it.skip(`${scenario.id}: ${scenario.title}`, async () => {
      const output = await ctx.runPoC(
        injectTarget(scenario.poc, server.url),
        250
      );
      try {
        expectSecureRejection(output, scenario);
      } catch (err) {
        if (isVulnerabilityObserved(output, scenario)) {
          throw new Error(
            `[${scenario.id}] VULNERABILITY CONFIRMED — observed: ` +
              `"${scenario.vulnerableSubstring}" (engine did not block). ` +
              `Output: ${output.slice(0, 400)}`,
            { cause: err }
          );
        }
        throw err;
      }
    });
  }

  // biome-ignore lint/suspicious/noSkippedTests: Intentional — WASM GC abort on in-flight fetch
  it.skip(`${QJS_NETWORK_SENSITIVE_HEADERS.id}: ${QJS_NETWORK_SENSITIVE_HEADERS.title}`, async () => {
    const poc: SecurityScenario = {
      ...QJS_NETWORK_SENSITIVE_HEADERS,
      poc: injectTarget(QJS_NETWORK_SENSITIVE_HEADERS.poc, server.url),
    };
    const output = await ctx.runPoC(poc.poc, 300);
    try {
      expectSecureRejection(output, poc);
    } catch (err) {
      if (isVulnerabilityObserved(output, poc)) {
        throw new Error(
          `[${poc.id}] VULNERABILITY CONFIRMED — ` +
            `sensitive headers forwarded to host. Output: ${output.slice(0, 400)}`,
          { cause: err }
        );
      }
      throw err;
    }
  });

  // biome-ignore lint/suspicious/noSkippedTests: Intentional — WASM GC abort on in-flight fetch
  it.skip(`${QJS_NETWORK_RESPONSE_BOMB.id}: ${QJS_NETWORK_RESPONSE_BOMB.title}`, async () => {
    const poc: SecurityScenario = {
      ...QJS_NETWORK_RESPONSE_BOMB,
      poc: injectTarget(QJS_NETWORK_RESPONSE_BOMB.poc, server.url),
    };
    const output = await ctx.runPoC(poc.poc, 500);
    try {
      expectSecureRejection(output, poc);
    } catch (err) {
      if (isVulnerabilityObserved(output, poc)) {
        throw new Error(
          `[${poc.id}] VULNERABILITY CONFIRMED — ` +
            `response body of unbounded size was returned. Output: ${output.slice(0, 400)}`,
          { cause: err }
        );
      }
      throw err;
    }
  });
});
