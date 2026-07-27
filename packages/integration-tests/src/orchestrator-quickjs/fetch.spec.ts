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
import { createQuickJSWorker } from "./setup/quickjs-worker-factory.ts";

describe("Orchestrator + QuickJS Fetch Integration", () => {
  let server: TestServer;
  let orchestrator: EngineOrchestrator;
  let outputs: Array<{ data: unknown; type: string }> = [];

  beforeAll(async () => {
    server = createTestServer();
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  beforeEach(() => {
    outputs = [];
    orchestrator = new EngineOrchestrator({
      createWorker: createQuickJSWorker,
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
      fetch("${server.url}/json")
        .then(res => res.json())
        .then(data => console.log(JSON.stringify(data)))
        .catch(err => console.error(err.message));
    `);

    // Give time for the async promise in JS to resolve
    await new Promise((r) => setTimeout(r, 150));

    const logOutputs = outputs.filter((o) => o.type === "log");
    expect(logOutputs).toHaveLength(1);

    const loggedValue = (logOutputs[0].data as Array<{ value: unknown }>)[0]
      .value;
    expect(loggedValue).toBe('{"message":"success"}');
  });

  it("performs POST requests with payloads and headers", async () => {
    await orchestrator.init();
    await orchestrator.run(`
      fetch("${server.url}/echo", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Custom": "test-header" },
        body: JSON.stringify({ hello: "world" })
      })
        .then(res => res.json())
        .then(data => console.log(JSON.stringify(data)))
        .catch(err => console.error(err.message));
    `);

    await new Promise((r) => setTimeout(r, 150));

    const logOutputs = outputs.filter((o) => o.type === "log");
    if (logOutputs.length === 0) {
      console.log("ALL OUTPUTS:", JSON.stringify(outputs, null, 2));
    }
    expect(logOutputs).toHaveLength(1);

    const loggedValue = (logOutputs[0].data as Array<{ value: unknown }>)[0]
      .value as string;
    const parsed = JSON.parse(loggedValue);

    expect(parsed.body).toBe('{"hello":"world"}');
    expect(parsed.headers["content-type"]).toBe("application/json");
    expect(parsed.headers["x-custom"]).toBe("test-header");
  });

  it("handles non-200 HTTP status codes", async () => {
    await orchestrator.init();
    await orchestrator.run(`
      fetch("${server.url}/status/404")
        .then(res => console.log(res.status))
        .catch(err => console.error(err.message));
    `);

    await new Promise((r) => setTimeout(r, 150));

    const logOutputs = outputs.filter((o) => o.type === "log");
    expect(logOutputs).toHaveLength(1);

    const loggedValue = (logOutputs[0].data as Array<{ value: unknown }>)[0]
      .value;
    expect(loggedValue).toBe(404);
  });
});
