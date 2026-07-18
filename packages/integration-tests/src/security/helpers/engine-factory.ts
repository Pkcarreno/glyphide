import { EngineOrchestrator } from "@glyphide/orchestrator";
import { createMicropythonWorker } from "../../orchestrator-micropython/setup/micropython-worker-factory.ts";
import { createQuickJSWorker } from "../../orchestrator-quickjs/setup/quickjs-worker-factory.ts";

/**
 * Type of engine under test. Each maps to a real engine adapter
 * wrapped in the in-process fake Worker harness used by functional
 * tests — the security boundary IS the adapter, not the thread.
 */
export type SecurityEngine = "quickjs" | "micropython";

/**
 * Structured output captured from an engine.
 *
 * - `Micropython` produces `{ type: "stdout" | "stderr" | "system", data: string }`.
 * - `QuickJS` produces `{ type: "log" | ... | "system", data: ConsoleToken[] }`
 *   where each token has a `type` and a `value` (or other shape).
 *
 * Tests use {@link flattenOutputs} to normalize both shapes to plain strings.
 * @public
 */
export interface EngineOutput {
  data: unknown;
  type: string;
}

/**
 * Configuration applied to the engine adapter at `init()` time.
 * Mirrors the field names exposed by `QuickJSEngineConfig` and
 * `MicropythonEngineConfig`.
 */
export interface SecurityEngineOptions {
  /** Hard memory ceiling in bytes. Default: 10 MB for QuickJS, 50 MB for MP. */
  memoryLimit?: number;
  /** Hard per-execution timeout in ms. Default: 5 s. */
  timeout?: number;
}

/**
 * A security test context wraps a real `EngineOrchestrator` together
 * with helpers to run PoC code and inspect its output. The context
 * owns the worker and MUST be disposed via {@link SecurityTestContext.dispose}
 * (typically in `afterEach`).
 */
export interface SecurityTestContext {
  /**
   * Tears down the worker and frees the WASM context. Idempotent.
   * Called automatically via `afterEach` in helper wrappers.
   */
  dispose: () => void;
  readonly engine: SecurityEngine;
  readonly orchestrator: EngineOrchestrator;
  readonly outputs: EngineOutput[];
  /**
   * Executes `pocCode` against the engine, waits for the response,
   * and returns the captured outputs as a normalized string.
   * `microtaskDelayMs` is the time the caller wants to wait after
   * the engine responds so that any pending microtasks (Promises
   * like `fetch`) have a chance to flush before assertions read the output.
   */
  runPoC: (pocCode: string, microtaskDelayMs?: number) => Promise<string>;
}

const DEFAULT_OPTIONS: Record<
  SecurityEngine,
  Required<SecurityEngineOptions>
> = {
  quickjs: { memoryLimit: 10 * 1024 * 1024, timeout: 5000 },
  micropython: { memoryLimit: 10 * 1024 * 1024, timeout: 5000 },
};

/**
 * Extracts a plain string from a structured output payload so that
 * tests can `toContain(...)` against it. QuickJS tokens are unwrapped
 * by reading `.value` (or the token's `description`, `name`, etc.).
 * Unknown shapes are JSON-stringified.
 */
function flattenOutputs(outputs: EngineOutput[]): string {
  const lines: string[] = [];
  for (const out of outputs) {
    if (out.type === "system") {
      // System messages (e.g. "Execution interrupted") are not part of guest output.
      continue;
    }
    const data = out.data;
    if (typeof data === "string") {
      lines.push(data);
      continue;
    }
    if (Array.isArray(data)) {
      // QuickJS ConsoleToken[] — concatenate the printable representation.
      const flat = data
        .map((tok) => {
          if (tok && typeof tok === "object" && "value" in tok) {
            return String((tok as { value: unknown }).value);
          }
          if (tok && typeof tok === "object" && "description" in tok) {
            return String((tok as { description: unknown }).description);
          }
          if (tok && typeof tok === "object" && "name" in tok) {
            return String((tok as { name: unknown }).name);
          }
          return JSON.stringify(tok);
        })
        .join(" ");
      lines.push(flat);
      continue;
    }
    if (data && typeof data === "object") {
      lines.push(JSON.stringify(data));
      continue;
    }
    lines.push(String(data));
  }
  return lines.join("\n");
}

/**
 * Creates a security test context for the requested engine.
 *
 * Each call spawns a fresh `EngineOrchestrator` and initializes it
 * with hardened defaults (10 MB memory, 5 s timeout). Output is
 * captured via the orchestrator's `onOutput` event and exposed as
 * a flat string via `runPoC()`.
 *
 * @param engine - Which real engine adapter to spin up.
 * @param options - Override memory or timeout for individual tests.
 */
export async function createSecurityContext(
  engine: SecurityEngine,
  options: SecurityEngineOptions = {}
): Promise<SecurityTestContext> {
  const merged: Required<SecurityEngineOptions> = {
    memoryLimit: options.memoryLimit ?? DEFAULT_OPTIONS[engine].memoryLimit,
    timeout: options.timeout ?? DEFAULT_OPTIONS[engine].timeout,
  };

  const outputs: EngineOutput[] = [];

  const orchestrator = new EngineOrchestrator({
    createWorker:
      engine === "quickjs" ? createQuickJSWorker : createMicropythonWorker,
    events: {
      onOutput: (payload) => {
        outputs.push({ type: String(payload.type), data: payload.data });
      },
    },
  });

  await orchestrator.init({
    memoryLimit: merged.memoryLimit,
    timeout: merged.timeout,
  });

  return {
    engine,
    orchestrator,
    outputs,
    runPoC: async (pocCode, microtaskDelayMs = 0) => {
      outputs.length = 0;
      try {
        await orchestrator.run(pocCode);
      } catch (err) {
        // Capture the error in the output stream so tests can assert on it.
        outputs.push({
          type: engine === "quickjs" ? "error" : "stderr",
          data: err instanceof Error ? err.message : String(err),
        });
      }
      if (microtaskDelayMs > 0) {
        // After the run returns, wait for a "quiet period" so any
        // pending microtasks (notably QuickJS fetch promises) have
        // a chance to flush before the test continues. The QuickJS
        // runtime aborts the process if `dispose()` runs with
        // non-empty GC lists, so we need every in-flight fetch
        // promise to have resolved (or rejected) first.
        const quietMs = Math.min(microtaskDelayMs, 500);
        const baselineLength = outputs.length;
        const baselineData = outputs
          .map((o) => JSON.stringify(o.data))
          .join("|");
        const deadline = Date.now() + microtaskDelayMs;
        while (Date.now() < deadline) {
          await new Promise((r) => setTimeout(r, quietMs));
          const currentData = outputs
            .map((o) => JSON.stringify(o.data))
            .join("|");
          if (
            outputs.length === baselineLength ||
            currentData === baselineData
          ) {
            // No new outputs for the quiet window — assume flush is done.
            break;
          }
        }
      }
      return flattenOutputs(outputs);
    },
    dispose: () => {
      orchestrator.terminate();
    },
  };
}

/**
 * Convenience guard: `afterEach(disposeAll(...))` style helper.
 * Accepts a list of contexts and calls `dispose()` on each, swallowing
 * errors so a failing teardown does not mask an earlier assertion.
 */
export function disposeAll(
  ...contexts: Array<SecurityTestContext | undefined>
): void {
  for (const ctx of contexts) {
    try {
      ctx?.dispose();
    } catch {
      /* swallow — best effort cleanup */
    }
  }
}
