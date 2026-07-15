import { describe, expect, it } from "vitest";
import { PYTHON_DEFAULT_BUFFER_CODE } from "../data/python-default-buffer-code.ts";
import { QUICKJS_DEFAULT_BUFFER_CODE } from "../data/quickjs-default-buffer-code.ts";
import { createEngineRegistry, getEngineEntries } from "./registry.ts";

describe("EngineRegistry", () => {
  it("initializes with default engines", () => {
    const registry = createEngineRegistry();
    expect(registry.engines.length).toBe(3);
    expect(registry.engines.some((e) => e.id === "micropython")).toBe(true);
    expect(registry.engines.some((e) => e.id === "quickjs")).toBe(true);
    expect(registry.engines.some((e) => e.id === "mock")).toBe(true);
  });

  it("retrieves a definition by ID", () => {
    const registry = createEngineRegistry();
    const def = registry.getDefinition("mock");
    expect(def.id).toBe("mock");
    expect(def.label).toBe("Mock Test Engine");
  });

  it("throws when getting an unknown definition", () => {
    const registry = createEngineRegistry();
    expect(() => registry.getDefinition("unknown" as "mock")).toThrowError(
      'Unknown engine: "unknown"'
    );
  });

  it("loads factories correctly (mock)", async () => {
    const registry = createEngineRegistry();
    const factory = await registry.loadFactory("mock");
    expect(typeof factory).toBe("function");
  });

  it("expands engines into entries", () => {
    const registry = createEngineRegistry();
    const entries = getEngineEntries(registry);
    expect(entries.length).toBeGreaterThanOrEqual(3);
    expect(
      entries.some(
        (e) => e.engineId === "micropython" && e.language === "python"
      )
    ).toBe(true);
    expect(
      entries.some(
        (e) => e.engineId === "quickjs" && e.language === "javascript"
      )
    ).toBe(true);
    expect(
      entries.some((e) => e.engineId === "mock" && e.language === "plaintext")
    ).toBe(true);
  });

  describe("Per-engine default buffer code", () => {
    it("quickjs definition exposes QUICKJS_DEFAULT_BUFFER_CODE as defaultBufferCode", () => {
      const def = createEngineRegistry().getDefinition("quickjs");
      expect(def.defaultBufferCode).toBe(QUICKJS_DEFAULT_BUFFER_CODE);
    });

    it("micropython definition exposes PYTHON_DEFAULT_BUFFER_CODE as defaultBufferCode", () => {
      const def = createEngineRegistry().getDefinition("micropython");
      expect(def.defaultBufferCode).toBe(PYTHON_DEFAULT_BUFFER_CODE);
    });

    it("mock definition does NOT define a defaultBufferCode (dev-only)", () => {
      const def = createEngineRegistry().getDefinition("mock");
      expect(def.defaultBufferCode).toBeUndefined();
    });
  });
});

function makeEntry(type: string, data: unknown) {
  return { id: 0, timestamp: 0, type, data };
}

describe("Engine output formatters", () => {
  const registry = createEngineRegistry();

  describe("each engine has an outputFormatter defined", () => {
    it.each([
      "quickjs",
      "micropython",
      "mock",
    ])("%s engine has outputFormatter", (engineId) => {
      const engineDefinition = registry.getDefinition(engineId);
      expect(engineDefinition.outputFormatter).toBeDefined();
    });
  });

  describe("QuickJS formatter", () => {
    const quickjsDefinition = registry.getDefinition("quickjs");
    if (!quickjsDefinition.outputFormatter) {
      throw new Error("QuickJS outputFormatter missing");
    }
    const formatter = quickjsDefinition.outputFormatter;

    it("returns tokens when data is a ConsoleToken array", () => {
      const tokens = [{ type: "number", value: 42 }];
      const result = formatter.format(makeEntry("log", tokens));
      expect(result.variant).toBe("log");
      expect(result.tokens).toEqual(tokens);
      expect(result.text).toBeUndefined();
    });

    it("maps warn type to warn variant with tokens", () => {
      const tokens = [{ type: "string", value: "oops" }];
      const result = formatter.format(makeEntry("warn", tokens));
      expect(result.variant).toBe("warn");
    });

    it("maps error type to error variant with tokens", () => {
      const tokens = [{ type: "string", value: "fail" }];
      const result = formatter.format(makeEntry("error", tokens));
      expect(result.variant).toBe("error");
    });

    it("falls back to text when data is a plain string (not ConsoleToken[])", () => {
      const result = formatter.format(makeEntry("log", "plain string"));
      expect(result.variant).toBe("log");
      expect(result.text).toBe("plain string");
      expect(result.tokens).toBeUndefined();
    });

    it("falls back to text when data is null", () => {
      const result = formatter.format(makeEntry("log", null));
      expect(result.text).toBeDefined();
      expect(result.tokens).toBeUndefined();
    });

    it("renders system entry as system variant with text", () => {
      const result = formatter.format(makeEntry("system", "Engine ready."));
      expect(result.variant).toBe("system");
      expect(result.text).toBe("Engine ready.");
      expect(result.tokens).toBeUndefined();
    });
  });

  describe("MicroPython formatter", () => {
    const micropythonDefinition = registry.getDefinition("micropython");
    if (!micropythonDefinition.outputFormatter) {
      throw new Error("MicroPython outputFormatter missing");
    }
    const formatter = micropythonDefinition.outputFormatter;

    it("maps stdout to log variant", () => {
      const result = formatter.format(makeEntry("stdout", "hello"));
      expect(result.variant).toBe("log");
      expect(result.text).toBe("hello");
    });

    it("maps stderr to error variant", () => {
      const result = formatter.format(makeEntry("stderr", "TypeError"));
      expect(result.variant).toBe("error");
      expect(result.text).toBe("TypeError");
    });

    it("maps system to system variant", () => {
      const result = formatter.format(makeEntry("system", "Initializing..."));
      expect(result.variant).toBe("system");
    });

    it("falls back to defaultFormat for unknown type", () => {
      const result = formatter.format(makeEntry("unknown-type", "msg"));
      expect(result.variant).toBe("log");
    });
  });

  describe("Mock formatter", () => {
    const mockDefinition = registry.getDefinition("mock");
    if (!mockDefinition.outputFormatter) {
      throw new Error("Mock outputFormatter missing");
    }
    const formatter = mockDefinition.outputFormatter;

    it("maps log to log variant", () => {
      const result = formatter.format(makeEntry("log", "test"));
      expect(result.variant).toBe("log");
    });

    it("maps print to log variant", () => {
      const result = formatter.format(makeEntry("print", "test"));
      expect(result.variant).toBe("log");
    });

    it("maps warn to warn variant", () => {
      const result = formatter.format(makeEntry("warn", "test"));
      expect(result.variant).toBe("warn");
    });

    it("maps system to system variant", () => {
      const result = formatter.format(makeEntry("system", "msg"));
      expect(result.variant).toBe("system");
    });

    it("falls back to defaultFormat for unknown type", () => {
      const result = formatter.format(makeEntry("unknown-type", "msg"));
      expect(result.variant).toBe("log");
    });
  });
});
