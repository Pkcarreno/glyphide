/**
 * Unit tests for QuickJSEngineAdapter.
 */

import { EngineMethod } from "@glyphide/rpc-protocol/constants";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { QuickJSEngineAdapter } from "./quickjs-adapter.ts";
import type { ConsoleToken } from "./types.ts";

const INTERRUPTED_REGEX = /interrupted/i;

interface CapturedResponse {
  error?: { code: number; message: string };
  id: string | number | null;
  result?: unknown;
}

interface CapturedNotification {
  method: string;
  params?: { type?: string; data?: unknown };
}

const TIME_LOG_REGEX = /^foo: \d+ ms$/;

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
            error: r.error,
            id: r.id,
            result: r.result as object,
          }),
        () => {
          /* noop */
        }
      );

      adapter.handleMessage({
        id: 1,
        jsonrpc: "2.0",
        method: EngineMethod.Init,
      });

      // Wait for QuickJS init to complete
      await new Promise((r) => setTimeout(r, 50));

      expect(responses).toHaveLength(1);
      expect(responses[0].id).toBe(1);
      expect(responses[0].error).toBeUndefined();
      expect(responses[0].result).toMatchObject({
        id: "quickjs",
        isInterruptible: true,
        isStateful: true,
        outputTypes: [
          "log",
          "warn",
          "error",
          "info",
          "debug",
          "table",
          "group",
          "groupCollapsed",
          "groupEnd",
          "timeLog",
          "timeEnd",
          "count",
          "assert",
          "trace",
        ],
        supportedLanguages: ["javascript"],
        timeout: 30_000,
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
        id: "init",
        jsonrpc: "2.0",
        method: EngineMethod.Init,
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
        id: 4,
        jsonrpc: "2.0",
        method: EngineMethod.Run,
        params: { code: "1 + 1" },
      });

      await new Promise((r) => setTimeout(r, 50));

      expect(responses).toHaveLength(1);
      expect(responses[0].id).toBe(4);
      expect(responses[0].result).toEqual({ executed: true, value: 2 });
    });

    it("emits log notification with structured tokens", async () => {
      const notifications: CapturedNotification[] = [];

      adapter.setup(
        () => {
          /* noop */
        },
        (m, p) =>
          notifications.push({ method: m, params: p as { content?: string } })
      );

      adapter.handleMessage({
        id: 5,
        jsonrpc: "2.0",
        method: EngineMethod.Run,
        params: { code: "console.log('hello', 'world');" },
      });

      await new Promise((r) => setTimeout(r, 50));

      expect(notifications).toHaveLength(1);
      expect(notifications[0].method).toBe(EngineMethod.Output);
      expect(notifications[0].params?.type).toBe("log");
      expect(notifications[0].params?.data).toEqual([
        { type: "string", value: "hello" },
        { type: "string", value: "world" },
      ]);
    });

    it("tokenizes primitives correctly", async () => {
      const notifications: CapturedNotification[] = [];

      adapter.setup(
        () => {
          /* noop */
        },
        (m, p) =>
          notifications.push({ method: m, params: p as { data?: unknown } })
      );

      adapter.handleMessage({
        id: 5,
        jsonrpc: "2.0",
        method: EngineMethod.Run,
        params: { code: "console.log(42, true, null, undefined);" },
      });

      await new Promise((r) => setTimeout(r, 50));

      expect(notifications[0].params?.data).toEqual([
        { type: "number", value: 42 },
        { type: "boolean", value: true },
        { type: "null" },
        { type: "undefined" },
      ]);
    });

    it("tokenizes objects and arrays", async () => {
      const notifications: CapturedNotification[] = [];

      adapter.setup(
        () => {
          /* noop */
        },
        (m, p) =>
          notifications.push({ method: m, params: p as { data?: unknown } })
      );

      adapter.handleMessage({
        id: 5,
        jsonrpc: "2.0",
        method: EngineMethod.Run,
        params: { code: "console.log({ a: 1 }, [1, 'two']);" },
      });

      await new Promise((r) => setTimeout(r, 50));

      expect(notifications[0].params?.data).toEqual([
        {
          properties: {
            a: { type: "number", value: 1 },
          },
          type: "object",
        },
        {
          elements: [
            { type: "number", value: 1 },
            { type: "string", value: "two" },
          ],
          length: 2,
          type: "array",
        },
      ]);
    });

    it("tokenizes complex native objects (Map, Set, Error, RegExp, Date, BigInt, Promise)", async () => {
      const notifications: CapturedNotification[] = [];

      adapter.setup(
        () => {
          /* noop */
        },
        (m, p) =>
          notifications.push({ method: m, params: p as { data?: unknown } })
      );

      adapter.handleMessage({
        id: 5,
        jsonrpc: "2.0",
        method: EngineMethod.Run,
        params: {
          code: `
            console.log(
              new Map([["k", "v"]]),
              new Set([1]),
              new Error("test error"),
              /abc/g,
              new Date("2020-01-01T00:00:00.000Z"),
              123n,
              new Promise(() => {})
            );
          `,
        },
      });

      await new Promise((r) => setTimeout(r, 50));

      expect(notifications).toHaveLength(1);
      const tokens = notifications[0].params?.data as ConsoleToken[];
      expect(tokens[0]).toEqual({
        entries: [
          [
            { type: "string", value: "k" },
            { type: "string", value: "v" },
          ],
        ],
        size: 1,
        type: "map",
      });
      expect(tokens[1]).toEqual({
        elements: [{ type: "number", value: 1 }],
        size: 1,
        type: "set",
      });
      expect(tokens[2].type).toBe("error");
      expect(tokens[2].name).toBe("Error");
      expect(tokens[2].message).toBe("test error");
      expect(typeof tokens[2].stack).toBe("string");
      expect(tokens[3]).toEqual({ flags: "g", source: "abc", type: "regexp" });
      expect(tokens[4]).toEqual({
        type: "date",
        value: "2020-01-01T00:00:00.000Z",
      });
      expect(tokens[5]).toEqual({ type: "bigint", value: "123" });
      expect(tokens[6]).toEqual({ type: "promise" });
    });

    it("handles circular references without crashing", async () => {
      const notifications: CapturedNotification[] = [];

      adapter.setup(
        () => {
          /* noop */
        },
        (m, p) =>
          notifications.push({ method: m, params: p as { data?: unknown } })
      );

      adapter.handleMessage({
        id: 5,
        jsonrpc: "2.0",
        method: EngineMethod.Run,
        params: { code: "const a = {}; a.self = a; console.log(a);" },
      });

      await new Promise((r) => setTimeout(r, 50));

      expect(notifications).toHaveLength(1);
      const tokens = notifications[0].params?.data as Array<{
        type: string;
        properties?: Record<string, { type: string }>;
      }>;
      expect(tokens[0].type).toBe("object");
      expect(tokens[0].properties?.self).toEqual({ type: "circular" });
    });

    it("tokenizes functions with name", async () => {
      const notifications: CapturedNotification[] = [];

      adapter.setup(
        () => {
          /* noop */
        },
        (m, p) =>
          notifications.push({ method: m, params: p as { data?: unknown } })
      );

      adapter.handleMessage({
        id: 5,
        jsonrpc: "2.0",
        method: EngineMethod.Run,
        params: {
          code: "function myFn() {}; console.log(myFn);",
        },
      });

      await new Promise((r) => setTimeout(r, 50));

      expect(notifications[0].params?.data).toEqual([
        { name: "myFn", source: "function myFn() {}", type: "function" },
      ]);
    });

    it("applies WHATWG format specifiers", async () => {
      const notifications: CapturedNotification[] = [];

      adapter.setup(
        () => {
          /* noop */
        },
        (m, p) =>
          notifications.push({ method: m, params: p as { data?: unknown } })
      );

      adapter.handleMessage({
        id: 5,
        jsonrpc: "2.0",
        method: EngineMethod.Run,
        params: {
          code: 'console.log("Hello %s, you are %d", "World", 42);',
        },
      });

      await new Promise((r) => setTimeout(r, 50));

      expect(notifications[0].params?.data).toEqual([
        { type: "string", value: "Hello World, you are 42" },
      ]);
    });

    it("preserves console method type for error", async () => {
      const notifications: CapturedNotification[] = [];

      adapter.setup(
        () => {
          /* noop */
        },
        (m, p) =>
          notifications.push({ method: m, params: p as { data?: unknown } })
      );

      adapter.handleMessage({
        id: 5,
        jsonrpc: "2.0",
        method: EngineMethod.Run,
        params: { code: "console.error('oops');" },
      });

      await new Promise((r) => setTimeout(r, 50));

      expect(notifications[0].params?.type).toBe("error");
    });

    it("returns error on syntax error", async () => {
      const responses: CapturedResponse[] = [];

      adapter.setup(
        (r) =>
          responses.push({
            error: r.error,
            id: r.id,
            result: r.result as object,
          }),
        () => {
          /* noop */
        }
      );

      adapter.handleMessage({
        id: 6,
        jsonrpc: "2.0",
        method: EngineMethod.Run,
        params: { code: "invalid code {" },
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
        id: 7,
        jsonrpc: "2.0",
        method: EngineMethod.Run,
        params: {
          code: `
          let result = null;
          fetch("http://test.com").then(r => r.json()).then(data => { result = data.success; });
          result;
        `,
        },
      });

      await new Promise((r) => setTimeout(r, 50));

      // In standard mode, the fetch promise won't be awaited by evalCode
      // the value returned immediately is null (initial value).
      expect(responses).toHaveLength(1);
      expect(responses[0].result).toEqual({ executed: true, value: null });

      globalThis.fetch = originalFetch;
    });
    it("emits debug notification with structured tokens", async () => {
      const notifications: CapturedNotification[] = [];

      adapter.setup(
        () => {
          /* noop */
        },
        (m, p) =>
          notifications.push({ method: m, params: p as { content?: string } })
      );

      adapter.handleMessage({
        id: 8,
        jsonrpc: "2.0",
        method: EngineMethod.Run,
        params: { code: "console.debug('debug message');" },
      });

      await new Promise((r) => setTimeout(r, 50));

      expect(notifications).toHaveLength(1);
      expect(notifications[0].method).toBe(EngineMethod.Output);
      expect(notifications[0].params?.type).toBe("debug");
      expect(notifications[0].params?.data).toEqual([
        { type: "string", value: "debug message" },
      ]);
    });

    it("emits table notification with structured tokens", async () => {
      const notifications: CapturedNotification[] = [];

      adapter.setup(
        () => {
          /* noop */
        },
        (m, p) =>
          notifications.push({ method: m, params: p as { content?: string } })
      );

      adapter.handleMessage({
        id: 9,
        jsonrpc: "2.0",
        method: EngineMethod.Run,
        params: { code: "console.table([{a: 1}]);" },
      });

      await new Promise((r) => setTimeout(r, 50));

      expect(notifications).toHaveLength(1);
      expect(notifications[0].method).toBe(EngineMethod.Output);
      expect(notifications[0].params?.type).toBe("table");
      expect(notifications[0].params?.data).toEqual([
        {
          elements: [
            {
              properties: {
                a: { type: "number", value: 1 },
              },
              type: "object",
            },
          ],
          length: 1,
          type: "array",
        },
      ]);
    });

    it("gracefully interrupts execution if timeout is exceeded", async () => {
      adapter.handleMessage({
        id: "init-short",
        jsonrpc: "2.0",
        method: EngineMethod.Init,
        params: { timeout: 100 },
      });
      await new Promise((r) => setTimeout(r, 50));

      const capturedResponses: CapturedResponse[] = [];

      adapter.setup(
        (r) =>
          capturedResponses.push({
            error: r.error,
            id: r.id,
            result: r.result as object,
          }),
        () => {
          /* noop */
        }
      );

      adapter.handleMessage({
        id: 99,
        jsonrpc: "2.0",
        method: EngineMethod.Run,
        params: { code: "while(true) {}" },
      });

      // The runtime's setInterruptHandler will throw an InternalError inside the WASM environment
      // which we intercept and pass back via the RPC protocol
      await new Promise((r) => setTimeout(r, 150));

      expect(capturedResponses).toHaveLength(1);
      expect(capturedResponses[0].id).toBe(99);
      expect(capturedResponses[0].error).toBeDefined();
      expect(capturedResponses[0].error?.message).toMatch(INTERRUPTED_REGEX);
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
        id: "init",
        jsonrpc: "2.0",
        method: EngineMethod.Init,
      });
      await new Promise((r) => setTimeout(r, 50));
    });

    it("clears previously declared variables", async () => {
      const responses: CapturedResponse[] = [];

      adapter.setup(
        (r) =>
          responses.push({
            error: r.error,
            id: r.id,
            result: r.result as object,
          }),
        () => {
          /* noop */
        }
      );

      // Declare a variable in the first run
      adapter.handleMessage({
        id: 1,
        jsonrpc: "2.0",
        method: EngineMethod.Run,
        params: { code: "const x = 42;" },
      });
      await new Promise((r) => setTimeout(r, 50));

      // Reset the context
      adapter.handleMessage({
        id: 2,
        jsonrpc: "2.0",
        method: EngineMethod.Reset,
      });
      await new Promise((r) => setTimeout(r, 50));

      // Re-declare same variable (should succeed)
      adapter.handleMessage({
        id: 3,
        jsonrpc: "2.0",
        method: EngineMethod.Run,
        params: { code: "const x = 99; x;" },
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
            error: r.error,
            id: r.id,
            result: r.result as object,
          }),
        () => {
          /* noop */
        }
      );

      freshAdapter.handleMessage({
        id: 1,
        jsonrpc: "2.0",
        method: EngineMethod.Reset,
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
        id: 1,
        jsonrpc: "2.0",
        method: EngineMethod.Reset,
      });
      await new Promise((r) => setTimeout(r, 50));

      // Verify console still works after reset
      adapter.handleMessage({
        id: 2,
        jsonrpc: "2.0",
        method: EngineMethod.Run,
        params: { code: "console.log('after reset');" },
      });
      await new Promise((r) => setTimeout(r, 50));

      expect(
        notifications.some((n) => {
          if (n.method !== EngineMethod.Output) {
            return false;
          }
          if (!Array.isArray(n.params?.data)) {
            return false;
          }
          const data = n.params.data as Array<{
            type: string;
            value?: string;
          }>;
          return data[0]?.value === "after reset";
        })
      ).toBe(true);
    });
  });

  describe("promise serialization", () => {
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
        id: "init",
        jsonrpc: "2.0",
        method: EngineMethod.Init,
      });
      await new Promise((r) => setTimeout(r, 50));
    });

    it("returns success when evalCode result is an unresolved Promise", async () => {
      const responses: CapturedResponse[] = [];

      adapter.setup(
        (r) =>
          responses.push({
            error: r.error,
            id: r.id,
            result: r.result as object,
          }),
        () => {
          /* noop */
        }
      );

      adapter.handleMessage({
        id: 10,
        jsonrpc: "2.0",
        method: EngineMethod.Run,
        params: { code: "new Promise(() => {})" },
      });

      await new Promise((r) => setTimeout(r, 50));

      expect(responses).toHaveLength(1);
      expect(responses[0].error).toBeUndefined();
      expect(responses[0].result).toEqual({
        executed: true,
        value: undefined,
      });
    });

    it("returns success when evalCode result is a resolved Promise", async () => {
      const responses: CapturedResponse[] = [];

      adapter.setup(
        (r) =>
          responses.push({
            error: r.error,
            id: r.id,
            result: r.result as object,
          }),
        () => {
          /* noop */
        }
      );

      adapter.handleMessage({
        id: 11,
        jsonrpc: "2.0",
        method: EngineMethod.Run,
        params: { code: "Promise.resolve(42)" },
      });

      await new Promise((r) => setTimeout(r, 50));

      expect(responses).toHaveLength(1);
      expect(responses[0].error).toBeUndefined();
      expect(responses[0].result).toMatchObject({ executed: true });
    });

    it("does not crash on Promise.reject as last expression", async () => {
      const responses: CapturedResponse[] = [];

      adapter.setup(
        (r) =>
          responses.push({
            error: r.error,
            id: r.id,
            result: r.result as object,
          }),
        () => {
          /* noop */
        }
      );

      adapter.handleMessage({
        id: 12,
        jsonrpc: "2.0",
        method: EngineMethod.Run,
        params: { code: "Promise.reject('oops')" },
      });

      await new Promise((r) => setTimeout(r, 50));

      expect(responses).toHaveLength(1);
      expect(responses[0].error).toBeUndefined();
      expect(responses[0].result).toMatchObject({ executed: true });
    });
  });

  describe("fetch async lifecycle", () => {
    let originalFetch: typeof globalThis.fetch;

    beforeEach(async () => {
      originalFetch = globalThis.fetch;
      adapter.setup(
        () => {
          /* noop */
        },
        () => {
          /* noop */
        }
      );
      adapter.handleMessage({
        id: "init",
        jsonrpc: "2.0",
        method: EngineMethod.Init,
      });
      await new Promise((r) => setTimeout(r, 50));
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it("emits console output after async fetch resolves", async () => {
      globalThis.fetch = () =>
        new Promise((resolve) => {
          setTimeout(
            () =>
              resolve({
                ok: true,
                status: 200,
                text: async () => JSON.stringify({ msg: "hello" }),
              } as Response),
            30
          );
        });

      const responses: CapturedResponse[] = [];
      const notifications: CapturedNotification[] = [];

      adapter.setup(
        (r) =>
          responses.push({
            error: r.error,
            id: r.id,
            result: r.result as object,
          }),
        (m, p) =>
          notifications.push({
            method: m,
            params: p as { type?: string; data?: unknown },
          })
      );

      adapter.handleMessage({
        id: 20,
        jsonrpc: "2.0",
        method: EngineMethod.Run,
        params: {
          code: 'fetch("http://test.com").then(r => r.json()).then(d => console.log(d.msg));',
        },
      });

      // Run response should arrive immediately without error
      await new Promise((r) => setTimeout(r, 20));
      expect(responses).toHaveLength(1);
      expect(responses[0].error).toBeUndefined();
      expect(responses[0].result).toMatchObject({ executed: true });

      // Wait for the async fetch + microtasks to complete
      await new Promise((r) => setTimeout(r, 200));

      const logNotification = notifications.find(
        (n) => n.method === EngineMethod.Output && n.params?.type === "log"
      );
      expect(logNotification).toBeDefined();
      expect(logNotification?.params?.data).toEqual([
        { type: "string", value: "hello" },
      ]);
    });

    it("emits console output for fetch().then(r => r.text())", async () => {
      globalThis.fetch = async () =>
        ({
          ok: true,
          status: 200,
          text: async () => "plain text response",
        }) as Response;

      const notifications: CapturedNotification[] = [];

      adapter.setup(
        () => {
          /* noop */
        },
        (m, p) =>
          notifications.push({
            method: m,
            params: p as { type?: string; data?: unknown },
          })
      );

      adapter.handleMessage({
        id: 21,
        jsonrpc: "2.0",
        method: EngineMethod.Run,
        params: {
          code: 'fetch("http://test.com").then(r => r.text()).then(t => console.log(t));',
        },
      });

      await new Promise((r) => setTimeout(r, 200));

      const logNotification = notifications.find(
        (n) => n.method === EngineMethod.Output && n.params?.type === "log"
      );
      expect(logNotification).toBeDefined();
      expect(logNotification?.params?.data).toEqual([
        { type: "string", value: "plain text response" },
      ]);
    });

    it("handles fetch network error without crashing the engine", async () => {
      globalThis.fetch = () => Promise.reject(new Error("Network failure"));

      const responses: CapturedResponse[] = [];
      const notifications: CapturedNotification[] = [];

      adapter.setup(
        (r) =>
          responses.push({
            error: r.error,
            id: r.id,
            result: r.result as object,
          }),
        (m, p) =>
          notifications.push({
            method: m,
            params: p as { type?: string; data?: unknown },
          })
      );

      adapter.handleMessage({
        id: 22,
        jsonrpc: "2.0",
        method: EngineMethod.Run,
        params: {
          code: 'fetch("http://bad.url").catch(e => console.error(e));',
        },
      });

      await new Promise((r) => setTimeout(r, 200));

      // Run should succeed (the promise itself is the return value)
      expect(responses).toHaveLength(1);
      expect(responses[0].error).toBeUndefined();

      // The .catch handler should have emitted an error log
      const errorNotification = notifications.find(
        (n) => n.method === EngineMethod.Output && n.params?.type === "error"
      );
      expect(errorNotification).toBeDefined();
    });

    it("executes chained .then() microtasks in order", async () => {
      globalThis.fetch = async () =>
        ({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ step: 1 }),
        }) as Response;

      const notifications: CapturedNotification[] = [];

      adapter.setup(
        () => {
          /* noop */
        },
        (m, p) =>
          notifications.push({
            method: m,
            params: p as { type?: string; data?: unknown },
          })
      );

      adapter.handleMessage({
        id: 23,
        jsonrpc: "2.0",
        method: EngineMethod.Run,
        params: {
          code: `
            fetch("http://test.com")
              .then(r => r.json())
              .then(d => { console.log("step1", d.step); return d.step + 1; })
              .then(v => console.log("step2", v));
          `,
        },
      });

      await new Promise((r) => setTimeout(r, 200));

      const logs = notifications.filter(
        (n) => n.method === EngineMethod.Output && n.params?.type === "log"
      );

      expect(logs).toHaveLength(2);
      expect(logs[0].params?.data).toEqual([
        { type: "string", value: "step1" },
        { type: "number", value: 1 },
      ]);
      expect(logs[1].params?.data).toEqual([
        { type: "string", value: "step2" },
        { type: "number", value: 2 },
      ]);
    });
  });

  describe("console.group / groupCollapsed / groupEnd", () => {
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
        id: "init",
        jsonrpc: "2.0",
        method: EngineMethod.Init,
      });
      await new Promise((r) => setTimeout(r, 50));
    });

    it("console.group emits 'group' notification with label token", async () => {
      const notifications: CapturedNotification[] = [];

      adapter.setup(
        () => {
          /* noop */
        },
        (m, p) =>
          notifications.push({
            method: m,
            params: p as { type?: string; data?: unknown },
          })
      );

      adapter.handleMessage({
        id: 30,
        jsonrpc: "2.0",
        method: EngineMethod.Run,
        params: { code: 'console.group("Outer");' },
      });

      await new Promise((r) => setTimeout(r, 50));

      expect(notifications).toHaveLength(1);
      expect(notifications[0].method).toBe(EngineMethod.Output);
      expect(notifications[0].params?.type).toBe("group");
      expect(notifications[0].params?.data).toEqual([
        { type: "string", value: "Outer" },
      ]);
    });

    it("console.group with no arguments emits empty token array", async () => {
      const notifications: CapturedNotification[] = [];

      adapter.setup(
        () => {
          /* noop */
        },
        (m, p) =>
          notifications.push({
            method: m,
            params: p as { type?: string; data?: unknown },
          })
      );

      adapter.handleMessage({
        id: 31,
        jsonrpc: "2.0",
        method: EngineMethod.Run,
        params: { code: "console.group();" },
      });

      await new Promise((r) => setTimeout(r, 50));

      expect(notifications[0].params?.type).toBe("group");
      expect(notifications[0].params?.data).toEqual([]);
    });

    it("console.groupCollapsed emits 'groupCollapsed' notification", async () => {
      const notifications: CapturedNotification[] = [];

      adapter.setup(
        () => {
          /* noop */
        },
        (m, p) =>
          notifications.push({
            method: m,
            params: p as { type?: string; data?: unknown },
          })
      );

      adapter.handleMessage({
        id: 32,
        jsonrpc: "2.0",
        method: EngineMethod.Run,
        params: { code: 'console.groupCollapsed("Collapsed");' },
      });

      await new Promise((r) => setTimeout(r, 50));

      expect(notifications[0].params?.type).toBe("groupCollapsed");
      expect(notifications[0].params?.data).toEqual([
        { type: "string", value: "Collapsed" },
      ]);
    });

    it("console.groupEnd emits 'groupEnd' notification with empty token array", async () => {
      const notifications: CapturedNotification[] = [];

      adapter.setup(
        () => {
          /* noop */
        },
        (m, p) =>
          notifications.push({
            method: m,
            params: p as { type?: string; data?: unknown },
          })
      );

      adapter.handleMessage({
        id: 33,
        jsonrpc: "2.0",
        method: EngineMethod.Run,
        params: { code: "console.groupEnd();" },
      });

      await new Promise((r) => setTimeout(r, 50));

      expect(notifications[0].params?.type).toBe("groupEnd");
      expect(notifications[0].params?.data).toEqual([]);
    });

    it("group sequence emits expected notification types in order", async () => {
      const notifications: CapturedNotification[] = [];

      adapter.setup(
        () => {
          /* noop */
        },
        (m, p) =>
          notifications.push({
            method: m,
            params: p as { type?: string; data?: unknown },
          })
      );

      adapter.handleMessage({
        id: 34,
        jsonrpc: "2.0",
        method: EngineMethod.Run,
        params: {
          code: [
            'console.group("outer");',
            'console.log("child");',
            "console.groupEnd();",
          ].join("\n"),
        },
      });

      await new Promise((r) => setTimeout(r, 50));

      expect(notifications).toHaveLength(3);
      expect(notifications[0].params?.type).toBe("group");
      expect(notifications[1].params?.type).toBe("log");
      expect(notifications[2].params?.type).toBe("groupEnd");
    });
  });

  describe("console extended methods (trace, time, count, assert)", () => {
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
        id: "init",
        jsonrpc: "2.0",
        method: EngineMethod.Init,
      });
      await new Promise((r) => setTimeout(r, 50));
    });

    it("console.assert emits 'assert' notification with formatted error message when condition is false", async () => {
      const notifications: CapturedNotification[] = [];
      adapter.setup(
        () => undefined,
        (m, p) =>
          notifications.push({
            method: m,
            params: p as { type?: string; data?: unknown },
          })
      );

      adapter.handleMessage({
        id: 40,
        jsonrpc: "2.0",
        method: EngineMethod.Run,
        params: { code: 'console.assert(false, "Expected %d", 42);' },
      });

      await new Promise((r) => setTimeout(r, 50));
      expect(notifications).toHaveLength(1);
      expect(notifications[0].params?.type).toBe("assert");
      expect(notifications[0].params?.data).toEqual([
        { type: "string", value: "Assertion failed: Expected 42" },
      ]);
    });

    it("console.assert does not emit when condition is true", async () => {
      const notifications: CapturedNotification[] = [];
      adapter.setup(
        () => undefined,
        (m, p) =>
          notifications.push({
            method: m,
            params: p as { type?: string; data?: unknown },
          })
      );

      adapter.handleMessage({
        id: 41,
        jsonrpc: "2.0",
        method: EngineMethod.Run,
        params: { code: 'console.assert(true, "Expected %d", 42);' },
      });

      await new Promise((r) => setTimeout(r, 50));
      expect(notifications).toHaveLength(0);
    });

    it("console.time, timeLog, timeEnd emit appropriate notifications", async () => {
      const notifications: CapturedNotification[] = [];
      adapter.setup(
        () => undefined,
        (m, p) =>
          notifications.push({
            method: m,
            params: p as { type?: string; data?: unknown },
          })
      );

      adapter.handleMessage({
        id: 42,
        jsonrpc: "2.0",
        method: EngineMethod.Run,
        params: {
          code: [
            'console.time("foo");',
            'console.timeLog("foo", "step");',
            'console.timeEnd("foo");',
          ].join("\n"),
        },
      });

      await new Promise((r) => setTimeout(r, 50));
      // time() doesn't emit unless it warns
      expect(notifications).toHaveLength(2);
      expect(notifications[0].params?.type).toBe("timeLog");
      const logData = notifications[0].params?.data as ConsoleToken[];
      expect(logData[0].type).toBe("string");
      expect(logData[0].value).toMatch(TIME_LOG_REGEX);
      expect(logData[1]).toEqual({ type: "string", value: "step" });

      expect(notifications[1].params?.type).toBe("timeEnd");
      const endData = notifications[1].params?.data as ConsoleToken[];
      expect(endData[0].type).toBe("string");
      expect(endData[0].value).toMatch(TIME_LOG_REGEX);
    });

    it("console.count emits incremental values", async () => {
      const notifications: CapturedNotification[] = [];
      adapter.setup(
        () => undefined,
        (m, p) =>
          notifications.push({
            method: m,
            params: p as { type?: string; data?: unknown },
          })
      );

      adapter.handleMessage({
        id: 43,
        jsonrpc: "2.0",
        method: EngineMethod.Run,
        params: {
          code: [
            "console.count();",
            'console.count("foo");',
            'console.count("foo");',
            'console.countReset("foo");',
            'console.count("foo");',
          ].join("\n"),
        },
      });

      await new Promise((r) => setTimeout(r, 50));
      expect(notifications).toHaveLength(4);
      expect(notifications[0].params?.type).toBe("count");
      expect(notifications[0].params?.data).toEqual([
        { type: "string", value: "default: 1" },
      ]);
      expect(notifications[1].params?.data).toEqual([
        { type: "string", value: "foo: 1" },
      ]);
      expect(notifications[2].params?.data).toEqual([
        { type: "string", value: "foo: 2" },
      ]);
      // countReset does not emit
      expect(notifications[3].params?.data).toEqual([
        { type: "string", value: "foo: 1" },
      ]);
    });

    it("console.trace emits groupCollapsed, trace, and groupEnd", async () => {
      const notifications: CapturedNotification[] = [];
      adapter.setup(
        () => undefined,
        (m, p) =>
          notifications.push({
            method: m,
            params: p as { type?: string; data?: unknown },
          })
      );

      adapter.handleMessage({
        id: 44,
        jsonrpc: "2.0",
        method: EngineMethod.Run,
        params: {
          code: 'function myTrace() { console.trace("here"); } myTrace();',
        },
      });

      await new Promise((r) => setTimeout(r, 50));
      expect(notifications).toHaveLength(3);
      expect(notifications[0].params?.type).toBe("groupCollapsed");
      expect(notifications[0].params?.data).toEqual([
        { type: "string", value: "here" },
      ]);

      expect(notifications[1].params?.type).toBe("trace");
      const traceData = notifications[1].params?.data as ConsoleToken[];
      expect(traceData[0].type).toBe("string");
      expect(traceData[0].value).toContain("myTrace");

      expect(notifications[2].params?.type).toBe("groupEnd");
    });
  });
});
