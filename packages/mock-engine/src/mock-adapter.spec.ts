/**
 * Unit tests for MockEngineAdapter.
 */

import { EngineMethod, RpcErrorCode } from "@glyphide/rpc-protocol/constants";
import { describe, expect, it } from "vitest";
import { MockEngineAdapter } from "./mock-adapter.ts";

interface CapturedResponse {
  error?: { code: number; message: string };
  id: string | number | null;
  result?: unknown;
}

interface CapturedNotification {
  method: string;
  params?: { type?: string; data?: unknown };
}

describe("MockEngineAdapter", () => {
  describe("init", () => {
    it("returns capabilities with default config", async () => {
      const adapter = new MockEngineAdapter();
      const responses: CapturedResponse[] = [];

      adapter.setup(
        (r) => responses.push({ id: r.id, result: r.result as object }),
        () => {
          /* noop */
        }
      );

      adapter.handleMessage({
        jsonrpc: "2.0",
        method: EngineMethod.Init,
        id: 1,
      });

      await new Promise((r) => setTimeout(r, 10));

      expect(responses).toHaveLength(1);
      expect(responses[0].id).toBe(1);
      expect(responses[0].result).toMatchObject({
        id: "mock",
        timeout: 30_000,
        supportedLanguages: ["plaintext"],
        isStateful: true,
        isInterruptible: true,
        outputTypes: ["print", "log", "warn"],
      });

      adapter.dispose();
    });

    it("respects initDelay configuration", async () => {
      const adapter = new MockEngineAdapter({ initDelay: 50 });
      const responses: CapturedResponse[] = [];

      adapter.setup(
        (r) => responses.push({ id: r.id, result: r.result as object }),
        () => {
          /* noop */
        }
      );

      const start = Date.now();

      adapter.handleMessage({
        jsonrpc: "2.0",
        method: EngineMethod.Init,
        id: 2,
      });

      await new Promise((r) => setTimeout(r, 70));
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(45);
      expect(responses).toHaveLength(1);

      adapter.dispose();
    });

    it("uses custom capabilities when provided", async () => {
      const adapter = new MockEngineAdapter({
        capabilities: {
          supportedLanguages: ["plaintext"],
          isStateful: false,
          isInterruptible: false,
          outputTypes: ["print"],
        },
      });
      const responses: CapturedResponse[] = [];

      adapter.setup(
        (r) => responses.push({ id: r.id, result: r.result as object }),
        () => {
          /* noop */
        }
      );

      adapter.handleMessage({
        jsonrpc: "2.0",
        method: EngineMethod.Init,
        id: 3,
      });

      await new Promise((r) => setTimeout(r, 10));

      expect(responses[0].result).toMatchObject({
        supportedLanguages: ["plaintext"],
        isStateful: false,
        isInterruptible: false,
        outputTypes: ["print"],
      });

      adapter.dispose();
    });
  });

  describe("run", () => {
    it("executes and returns result", async () => {
      const adapter = new MockEngineAdapter();
      const responses: CapturedResponse[] = [];

      adapter.setup(
        (r) => responses.push({ id: r.id, result: r.result as object }),
        () => {
          /* noop */
        }
      );

      adapter.handleMessage({
        jsonrpc: "2.0",
        method: EngineMethod.Run,
        params: { code: "console.log('hello')" },
        id: 4,
      });

      await new Promise((r) => setTimeout(r, 20));

      expect(responses).toHaveLength(1);
      expect(responses[0].id).toBe(4);
      expect(responses[0].result).toEqual({ executed: true });

      adapter.dispose();
    });

    it("emits print notification with code content", async () => {
      const adapter = new MockEngineAdapter();
      const notifications: CapturedNotification[] = [];

      adapter.setup(
        () => {
          /* noop */
        },
        (m, p) =>
          notifications.push({ method: m, params: p as { content?: string } })
      );

      adapter.handleMessage({
        jsonrpc: "2.0",
        method: EngineMethod.Run,
        params: { code: "test code" },
        id: 5,
      });

      await new Promise((r) => setTimeout(r, 20));

      expect(notifications).toHaveLength(1);
      expect(notifications[0].method).toBe(EngineMethod.Output);
      expect(notifications[0].params?.type).toBe("print");
      expect(notifications[0].params?.data).toBe("test code");

      adapter.dispose();
    });

    it("respects runDelay configuration", async () => {
      const adapter = new MockEngineAdapter({ runDelay: 50 });
      const responses: CapturedResponse[] = [];

      adapter.setup(
        (r) => responses.push({ id: r.id, result: r.result as object }),
        () => {
          /* noop */
        }
      );

      const start = Date.now();

      adapter.handleMessage({
        jsonrpc: "2.0",
        method: EngineMethod.Run,
        params: { code: "test" },
        id: 6,
      });

      await new Promise((r) => setTimeout(r, 70));
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(45);
      expect(responses).toHaveLength(1);

      adapter.dispose();
    });

    it("returns error when runError is configured", async () => {
      const adapter = new MockEngineAdapter({
        runError: "Simulated execution error",
      });
      const responses: CapturedResponse[] = [];

      adapter.setup(
        (r) =>
          responses.push({
            id: r.id,
            result: r.result as object,
            error: r.error,
          }),
        () => {
          /* noop */
        }
      );

      adapter.handleMessage({
        jsonrpc: "2.0",
        method: EngineMethod.Run,
        params: { code: "test" },
        id: 7,
      });

      await new Promise((r) => setTimeout(r, 20));

      expect(responses).toHaveLength(1);
      expect(responses[0].id).toBe(7);
      expect(responses[0].error).toEqual({
        code: RpcErrorCode.InternalError,
        message: "Simulated execution error",
      });

      adapter.dispose();
    });

    it("handles empty code parameter", async () => {
      const adapter = new MockEngineAdapter();
      const responses: CapturedResponse[] = [];
      const notifications: CapturedNotification[] = [];

      adapter.setup(
        (r) => responses.push({ id: r.id, result: r.result as object }),
        (m, p) =>
          notifications.push({ method: m, params: p as { content?: string } })
      );

      adapter.handleMessage({
        jsonrpc: "2.0",
        method: EngineMethod.Run,
        params: {},
        id: 8,
      });

      await new Promise((r) => setTimeout(r, 20));

      expect(responses[0].result).toEqual({ executed: true });
      expect(notifications[0].params?.data).toBe("");

      adapter.dispose();
    });
  });

  describe("interrupt", () => {
    it("returns interrupted result when interrupt called during run", async () => {
      const adapter = new MockEngineAdapter({ runDelay: 100 });
      const responses: CapturedResponse[] = [];

      adapter.setup(
        (r) => responses.push({ id: r.id, result: r.result as object }),
        () => {
          /* noop */
        }
      );

      adapter.handleMessage({
        jsonrpc: "2.0",
        method: EngineMethod.Run,
        params: { code: "test" },
        id: 9,
      });

      adapter.handleMessage({
        jsonrpc: "2.0",
        method: EngineMethod.Interrupt,
      });

      await new Promise((r) => setTimeout(r, 150));

      expect(responses).toHaveLength(1);
      expect(responses[0].result).toEqual({ interrupted: true });

      adapter.dispose();
    });

    it("emits log notification when interrupted", async () => {
      const adapter = new MockEngineAdapter({ runDelay: 200 });
      const notifications: CapturedNotification[] = [];

      adapter.setup(
        () => {
          /* noop */
        },
        (m, p) =>
          notifications.push({ method: m, params: p as { content?: string } })
      );

      adapter.handleMessage({
        jsonrpc: "2.0",
        method: EngineMethod.Run,
        params: { code: "test" },
        id: 10,
      });

      adapter.handleMessage({
        jsonrpc: "2.0",
        method: EngineMethod.Interrupt,
      });

      await new Promise((r) => setTimeout(r, 250));

      expect(notifications).toHaveLength(1);
      expect(notifications[0].method).toBe(EngineMethod.Output);
      expect(notifications[0].params?.type).toBe("log");
      expect(notifications[0].params?.data).toBe("Execution interrupted");

      adapter.dispose();
    });

    it("emits print notification when not interrupted", async () => {
      const adapter = new MockEngineAdapter({ runDelay: 50 });
      const responses: CapturedResponse[] = [];
      const notifications: CapturedNotification[] = [];

      adapter.setup(
        (r) => responses.push({ id: r.id, result: r.result as object }),
        (m, p) =>
          notifications.push({ method: m, params: p as { content?: string } })
      );

      adapter.handleMessage({
        jsonrpc: "2.0",
        method: EngineMethod.Run,
        params: { code: "test" },
        id: 11,
      });

      await new Promise((r) => setTimeout(r, 80));

      expect(responses).toHaveLength(1);
      expect(responses[0].result).toEqual({ executed: true });
      expect(notifications).toHaveLength(1);
      expect(notifications[0].method).toBe(EngineMethod.Output);

      adapter.dispose();
    });

    it("does nothing when no run is in progress", () => {
      const adapter = new MockEngineAdapter();
      const responses: CapturedResponse[] = [];
      const notifications: CapturedNotification[] = [];

      adapter.setup(
        (r) => responses.push({ id: r.id, result: r.result as object }),
        (m, p) =>
          notifications.push({ method: m, params: p as { content?: string } })
      );

      adapter.handleMessage({
        jsonrpc: "2.0",
        method: EngineMethod.Interrupt,
      });

      expect(responses).toHaveLength(0);
      expect(notifications).toHaveLength(0);

      adapter.dispose();
    });

    it("handles interrupt called multiple times", async () => {
      const adapter = new MockEngineAdapter({ runDelay: 100 });
      const responses: CapturedResponse[] = [];

      adapter.setup(
        (r) => responses.push({ id: r.id, result: r.result as object }),
        () => {
          /* noop */
        }
      );

      adapter.handleMessage({
        jsonrpc: "2.0",
        method: EngineMethod.Run,
        params: { code: "test" },
        id: 12,
      });

      adapter.handleMessage({
        jsonrpc: "2.0",
        method: EngineMethod.Interrupt,
      });

      adapter.handleMessage({
        jsonrpc: "2.0",
        method: EngineMethod.Interrupt,
      });

      await new Promise((r) => setTimeout(r, 150));

      expect(responses).toHaveLength(1);
      expect(responses[0].result).toEqual({ interrupted: true });

      adapter.dispose();
    });
  });

  describe("edge cases", () => {
    it("ignores non-request messages", () => {
      const adapter = new MockEngineAdapter();
      const responses: CapturedResponse[] = [];

      adapter.setup(
        (r) => responses.push({ id: r.id, result: r.result as object }),
        () => {
          /* noop */
        }
      );

      adapter.handleMessage({
        jsonrpc: "2.0",
        method: EngineMethod.Output,
        params: { content: "test" },
      } as never);

      expect(responses).toHaveLength(0);

      adapter.dispose();
    });

    it("handles null id in request", async () => {
      const adapter = new MockEngineAdapter();
      const responses: CapturedResponse[] = [];

      adapter.setup(
        (r) => responses.push({ id: r.id, result: r.result as object }),
        () => {
          /* noop */
        }
      );

      adapter.handleMessage({
        jsonrpc: "2.0",
        method: EngineMethod.Init,
        id: null,
      });

      await new Promise((r) => setTimeout(r, 10));

      expect(responses).toHaveLength(1);
      expect(responses[0].id).toBeNull();

      adapter.dispose();
    });

    it("handles string id in request", async () => {
      const adapter = new MockEngineAdapter();
      const responses: CapturedResponse[] = [];

      adapter.setup(
        (r) => responses.push({ id: r.id, result: r.result as object }),
        () => {
          /* noop */
        }
      );

      adapter.handleMessage({
        jsonrpc: "2.0",
        method: EngineMethod.Init,
        id: "req-123",
      });

      await new Promise((r) => setTimeout(r, 10));

      expect(responses).toHaveLength(1);
      expect(responses[0].id).toBe("req-123");

      adapter.dispose();
    });
  });

  describe("input request", () => {
    it("emits INPUT_REQUEST for each configured prompt during run", async () => {
      const adapter = new MockEngineAdapter({
        inputPrompts: ["Name: ", "Age: "],
      });
      const requests: Array<{ method: string; id: unknown; params?: object }> =
        [];

      adapter.setup(
        () => {
          /* noop */
        },
        () => {
          /* noop */
        },
        (method, id, params) => requests.push({ method, id, params })
      );

      adapter.handleMessage({
        jsonrpc: "2.0",
        method: EngineMethod.Run,
        params: { code: "test" },
        id: 1,
      });

      await new Promise((r) => setTimeout(r, 20));

      // First input request should be emitted
      expect(requests).toHaveLength(1);
      expect(requests[0].method).toBe(EngineMethod.InputRequest);
      expect(requests[0].params).toEqual({ prompt: "Name: " });

      // Reply to first input request
      adapter.handleMessage({
        jsonrpc: "2.0",
        id: requests[0].id,
        result: { value: "Alice" },
      } as never);

      await new Promise((r) => setTimeout(r, 20));

      // Second input request should be emitted
      expect(requests).toHaveLength(2);
      expect(requests[1].params).toEqual({ prompt: "Age: " });

      // Reply to second
      adapter.handleMessage({
        jsonrpc: "2.0",
        id: requests[1].id,
        result: { value: "25" },
      } as never);

      await new Promise((r) => setTimeout(r, 20));

      adapter.dispose();
    });

    it("includes collected input values in output notification", async () => {
      const adapter = new MockEngineAdapter({
        inputPrompts: ["Name: "],
      });
      const notifications: CapturedNotification[] = [];
      const requests: Array<{ method: string; id: unknown; params?: object }> =
        [];
      const responses: CapturedResponse[] = [];

      adapter.setup(
        (r) => responses.push({ id: r.id, result: r.result as object }),
        (m, p) =>
          notifications.push({
            method: m,
            params: p as { type?: string; data?: unknown },
          }),
        (method, id, params) => requests.push({ method, id, params })
      );

      adapter.handleMessage({
        jsonrpc: "2.0",
        method: EngineMethod.Run,
        params: { code: "hello" },
        id: 2,
      });

      await new Promise((r) => setTimeout(r, 20));

      // Reply to input request
      adapter.handleMessage({
        jsonrpc: "2.0",
        id: requests[0].id,
        result: { value: "World" },
      } as never);

      await new Promise((r) => setTimeout(r, 20));

      // Should have code output + input values output
      expect(notifications).toHaveLength(2);
      expect(notifications[0].params?.data).toBe("hello");
      expect(notifications[1].params?.data).toBe("World");

      // Run should complete
      expect(responses).toHaveLength(1);
      expect(responses[0].result).toEqual({ executed: true });

      adapter.dispose();
    });

    it("works normally when inputPrompts is not set", async () => {
      const adapter = new MockEngineAdapter();
      const responses: CapturedResponse[] = [];
      const requests: Array<{ method: string; id: unknown }> = [];

      adapter.setup(
        (r) => responses.push({ id: r.id, result: r.result as object }),
        () => {
          /* noop */
        },
        (method, id) => requests.push({ method, id })
      );

      adapter.handleMessage({
        jsonrpc: "2.0",
        method: EngineMethod.Run,
        params: { code: "test" },
        id: 3,
      });

      await new Promise((r) => setTimeout(r, 20));

      expect(requests).toHaveLength(0);
      expect(responses).toHaveLength(1);
      expect(responses[0].result).toEqual({ executed: true });

      adapter.dispose();
    });
  });
});
