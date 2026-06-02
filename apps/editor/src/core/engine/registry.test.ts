import { describe, expect, it } from "vitest";
import { createEngineRegistry, getEngineEntries } from "./registry.ts";

describe("EngineRegistry", () => {
  it("initializes with default engines", () => {
    const registry = createEngineRegistry();
    expect(registry.engines.length).toBe(2);
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
    expect(entries.length).toBeGreaterThanOrEqual(2);
    expect(
      entries.some(
        (e) => e.engineId === "quickjs" && e.language === "javascript"
      )
    ).toBe(true);
    expect(
      entries.some((e) => e.engineId === "mock" && e.language === "plaintext")
    ).toBe(true);
  });
});
