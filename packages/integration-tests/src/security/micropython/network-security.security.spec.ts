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
  MP_NETWORK_FETCH_LOCALHOST,
  MP_NETWORK_XHR_ARBITRARY_URL,
  type SecurityScenario,
} from "../helpers/security-test-utils.ts";

/**
 * MicroPython network security probes.
 *
 * Verifies that the engine either:
 *  - rejects arbitrary outbound HTTP (preferred)
 *  - or restricts it to a documented allowlist
 *
 * Today both vectors are reachable through `import js` → XHR, so
 * the tests fail in the RED phase.
 *
 * @public
 */
describe("MicroPython: network security", () => {
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
    ctx = await createSecurityContext("micropython", {
      memoryLimit: 10 * 1024 * 1024,
      timeout: 5000,
    });
  });

  afterEach(() => {
    disposeAll(ctx);
  });

  it(`${MP_NETWORK_XHR_ARBITRARY_URL.id}: ${MP_NETWORK_XHR_ARBITRARY_URL.title}`, async () => {
    const output = await ctx.runPoC(MP_NETWORK_XHR_ARBITRARY_URL.poc, 50);
    try {
      expectSecureRejection(output, MP_NETWORK_XHR_ARBITRARY_URL);
    } catch (err) {
      if (isVulnerabilityObserved(output, MP_NETWORK_XHR_ARBITRARY_URL)) {
        throw new Error(
          `[${MP_NETWORK_XHR_ARBITRARY_URL.id}] VULNERABILITY CONFIRMED — ` +
            `HTTP to arbitrary origin accepted. Output: ${output.slice(0, 400)}`,
          { cause: err }
        );
      }
      throw err;
    }
  });

  it(`${MP_NETWORK_FETCH_LOCALHOST.id}: ${MP_NETWORK_FETCH_LOCALHOST.title}`, async () => {
    // Inject the test server URL so the PoC targets a known endpoint.
    const poc: SecurityScenario = {
      ...MP_NETWORK_FETCH_LOCALHOST,
      poc: injectTarget(MP_NETWORK_FETCH_LOCALHOST.poc, server.url),
    };
    const output = await ctx.runPoC(poc.poc, 100);
    try {
      expectSecureRejection(output, poc);
    } catch (err) {
      if (isVulnerabilityObserved(output, poc)) {
        throw new Error(
          `[${poc.id}] VULNERABILITY CONFIRMED — ` +
            `localhost fetch reachable from MicroPython. Output: ${output.slice(0, 400)}`,
          { cause: err }
        );
      }
      throw err;
    }
  });
});
