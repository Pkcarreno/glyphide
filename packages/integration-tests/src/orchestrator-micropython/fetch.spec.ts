import { EngineOrchestrator } from "@glyphide/orchestrator";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { createTestServer, type TestServer } from "../shared/test-server.ts";
import { createMicropythonWorker } from "./setup/micropython-worker-factory.ts";

describe("Orchestrator + Micropython Fetch Integration", () => {
  let server: TestServer;
  let orchestrator: EngineOrchestrator;
  let outputs: Array<{ data: unknown; type: string }> = [];

  beforeAll(async () => {
    server = createTestServer();
    await server.start();
    if (typeof globalThis.location !== "undefined") {
      try {
        globalThis.location.href = `${server.url}/`;
      } catch {
        // ignore
      }
    }
  });

  afterAll(async () => {
    await server.stop();
  });

  beforeEach(() => {
    outputs = [];
    orchestrator = new EngineOrchestrator({
      createWorker: createMicropythonWorker,
      events: {
        onOutput: (payload) =>
          outputs.push({
            data: payload.data,
            type: payload.type,
          }),
      },
    });
  });

  afterEach(() => {
    orchestrator.terminate();
  });

  it("performs GET requests and parses JSON", async () => {
    await orchestrator.init();
    await orchestrator.run(`
import requests
import json

try:
    res = requests.get("${server.url}/json")
    print(json.dumps(res.json()))
except Exception as e:
    print(f"Error: {e}")
    `);

    const logOutputs = outputs.filter((o) => o.type === "stdout");
    expect(logOutputs.length).toBeGreaterThan(0);

    const loggedValue = logOutputs[0].data as string;
    expect(loggedValue).toContain('{"message": "success"}');
  });

  // NOTE: happy-dom's synchronous XMLHttpRequest drops POST payloads.
  // This test is skipped in the vitest environment but the underlying implementation
  // works correctly in real browsers.
  // biome-ignore lint/suspicious/noSkippedTests: happy-dom bug
  it.skip("performs POST requests with payloads and headers", async () => {
    await orchestrator.init();
    await orchestrator.run(`
import requests
import json

try:
    headers = {"Content-Type": "application/json", "X-Custom": "test-header"}
    res = requests.post("${server.url}/echo", json={"hello": "world"}, headers=headers)
    print(json.dumps(res.json()))
except Exception as e:
    print(f"Error: {e}")
    `);

    const logOutputs = outputs.filter((o) => o.type === "stdout");
    expect(logOutputs.length).toBeGreaterThan(0);

    const loggedValue = logOutputs[0].data as string;
    const parsed = JSON.parse(loggedValue);

    expect(parsed.body).toBe('{"hello": "world"}');
    expect(parsed.headers["content-type"]).toBe("application/json");
    expect(parsed.headers["x-custom"]).toBe("test-header");
  });

  it("handles non-200 HTTP status codes", async () => {
    await orchestrator.init();
    await orchestrator.run(`
import requests

try:
    res = requests.get("${server.url}/status/404")
    print(res.status_code)
except Exception as e:
    print(f"Error: {e}")
    `);

    const logOutputs = outputs.filter((o) => o.type === "stdout");
    expect(logOutputs.length).toBeGreaterThan(0);

    const loggedValue = logOutputs[0].data as string;
    expect(loggedValue).toContain("404");
  });
});
