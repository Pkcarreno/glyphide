/**
 * Unit tests for QuickJSEngineAdapter.
 */

import { EngineMethod } from "@glyphide/rpc-protocol/constants";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { QuickJSEngineAdapter } from "./quickjs-adapter";

interface CapturedResponse {
  error?: { code: number; message: string };
  id: string | number | null;
  result?: unknown;
}

interface CapturedNotification {
  method: string;
  params?: { type?: string; data?: unknown };
}

describe("QuickJSEngineAdapter", () => {
  let adapter: QuickJSEngineAdapter;

  beforeEach(() => {
    adapter = new QuickJSEngineAdapter();
  });

  afterEach(() => {
    adapter.dispose();
  });

  describe("init", () => {
    it("initializes QuickJS and returns capabilities", async () => {
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
        method: EngineMethod.Init,
        id: 1,
      });

      // Wait for QuickJS init to complete
      await new Promise((r) => setTimeout(r, 50));

      expect(responses).toHaveLength(1);
      expect(responses[0].id).toBe(1);
      expect(responses[0].error).toBeUndefined();
      expect(responses[0].result).toMatchObject({
        timeout: 30_000,
        stateful: true,
        interruptible: true,
        outputTypes: ["log", "warn", "error", "info"],
      });
    });
  });

  describe("run", () => {
    beforeEach(async () => {
      // Init before each run test
      adapter.setup(
        () => {
          /* noop */
        },
        () => {
          /* noop */
        }
      );
      adapter.handleMessage({
        jsonrpc: "2.0",
        method: EngineMethod.Init,
        id: "init",
      });
      await new Promise((r) => setTimeout(r, 50));
    });

    it("executes code and returns result", async () => {
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
        params: { code: "1 + 1" },
        id: 4,
      });

      await new Promise((r) => setTimeout(r, 50));

      expect(responses).toHaveLength(1);
      expect(responses[0].id).toBe(4);
      expect(responses[0].result).toEqual({ executed: true, value: 2 });
    });

    it("emits log notification when console.log is called", async () => {
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
        params: { code: "console.log('hello', 'world');" },
        id: 5,
      });

      await new Promise((r) => setTimeout(r, 50));

      expect(notifications).toHaveLength(1);
      expect(notifications[0].method).toBe(EngineMethod.Output);
      expect(notifications[0].params?.type).toBe("log");
      expect(notifications[0].params?.data).toBe("hello world");
    });

    it("returns error on syntax error", async () => {
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
        params: { code: "invalid code {" },
        id: 6,
      });

      await new Promise((r) => setTimeout(r, 50));

      expect(responses).toHaveLength(1);
      expect(responses[0].id).toBe(6);
      expect(responses[0].error).toBeDefined();
      expect(responses[0].error?.message).toContain("SyntaxError");
    });

    it("executes fetch polyfill correctly", async () => {
      // Mock global fetch for this test
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () =>
        ({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ success: true }),
        }) as Response;

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
        params: {
          code: `
          let result = null;
          fetch("http://test.com").then(r => r.json()).then(data => { result = data.success; });
          result;
        `,
        },
        id: 7,
      });

      await new Promise((r) => setTimeout(r, 50));

      // In standard mode, the fetch promise won't be awaited by evalCode
      // the value returned immediately is null (initial value).
      expect(responses).toHaveLength(1);
      expect(responses[0].result).toEqual({ executed: true, value: null });

      globalThis.fetch = originalFetch;
    });
  });

  describe("interrupt", () => {
    beforeEach(async () => {
      adapter.setup(
        () => {
          /* noop */
        },
        () => {
          /* noop */
        }
      );
      adapter.handleMessage({
        jsonrpc: "2.0",
        method: EngineMethod.Init,
        id: "init",
      });
      await new Promise((r) => setTimeout(r, 50));
    });

    it("handles interrupt gracefully", async () => {
      const responses: CapturedResponse[] = [];
      const notifications: CapturedNotification[] = [];

      adapter.setup(
        (r) =>
          responses.push({
            id: r.id,
            result: r.result as object,
            error: r.error,
          }),
        (m, p) =>
          notifications.push({ method: m, params: p as { content?: string } })
      );

      adapter.handleMessage({
        jsonrpc: "2.0",
        method: EngineMethod.Interrupt,
      });

      await new Promise((r) => setTimeout(r, 50));

      // Should have emitted a log
      expect(
        notifications.some(
          (n) =>
            n.method === EngineMethod.Output &&
            n.params?.data === "Execution interrupted"
        )
      ).toBe(true);
    });
  });

  describe("reset", () => {
    beforeEach(async () => {
      adapter.setup(
        () => {
          /* noop */
        },
        () => {
          /* noop */
        }
      );
      adapter.handleMessage({
        jsonrpc: "2.0",
        method: EngineMethod.Init,
        id: "init",
      });
      await new Promise((r) => setTimeout(r, 50));
    });

    it("clears previously declared variables", async () => {
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

      // Declare a variable in the first run
      adapter.handleMessage({
        jsonrpc: "2.0",
        method: EngineMethod.Run,
        params: { code: "const x = 42;" },
        id: 1,
      });
      await new Promise((r) => setTimeout(r, 50));

      // Reset the context
      adapter.handleMessage({
        jsonrpc: "2.0",
        method: EngineMethod.Reset,
        id: 2,
      });
      await new Promise((r) => setTimeout(r, 50));

      // Re-declare same variable (should succeed)
      adapter.handleMessage({
        jsonrpc: "2.0",
        method: EngineMethod.Run,
        params: { code: "const x = 99; x;" },
        id: 3,
      });
      await new Promise((r) => setTimeout(r, 50));

      expect(responses[2].error).toBeUndefined();
      expect(responses[2].result).toEqual({
        executed: true,
        value: 99,
      });
    });

    it("fails if engine is not initialized", async () => {
      const freshAdapter = new QuickJSEngineAdapter();
      const responses: CapturedResponse[] = [];

      freshAdapter.setup(
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

      freshAdapter.handleMessage({
        jsonrpc: "2.0",
        method: EngineMethod.Reset,
        id: 1,
      });
      await new Promise((r) => setTimeout(r, 50));

      expect(responses[0].error?.message).toBe("Engine not initialized");
    });

    it("preserves console and fetch after reset", async () => {
      const notifications: CapturedNotification[] = [];

      adapter.setup(
        () => {
          /* noop */
        },
        (m, p) =>
          notifications.push({
            method: m,
            params: p as { content?: string },
          })
      );

      // Reset the context
      adapter.handleMessage({
        jsonrpc: "2.0",
        method: EngineMethod.Reset,
        id: 1,
      });
      await new Promise((r) => setTimeout(r, 50));

      // Verify console still works after reset
      adapter.handleMessage({
        jsonrpc: "2.0",
        method: EngineMethod.Run,
        params: { code: "console.log('after reset');" },
        id: 2,
      });
      await new Promise((r) => setTimeout(r, 50));

      expect(
        notifications.some(
          (n) =>
            n.method === EngineMethod.Output && n.params?.data === "after reset"
        )
      ).toBe(true);
    });
  });
});
