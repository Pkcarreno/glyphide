import { describe, expect, it } from "vitest";
import { defaultFormat, isConsoleTokenArray } from "./output-formatter.ts";

function makeEntry(type: string, data: unknown) {
  return { data, id: 0, timestamp: 0, type };
}

describe("defaultFormat", () => {
  describe("type-to-variant mapping", () => {
    it.each([
      ["log", "log"],
      ["print", "log"],
      ["info", "info"],
      ["debug", "debug"],
      ["table", "table"],
      ["stdout", "log"],
      ["warn", "warn"],
      ["error", "error"],
      ["stderr", "error"],
      ["system", "system"],
    ])("when type is %s, returns variant %s", (type, expectedVariant) => {
      const result = defaultFormat(makeEntry(type, "msg"));
      expect(result.variant).toBe(expectedVariant);
    });

    it("when type is unknown, falls back to log variant", () => {
      const result = defaultFormat(makeEntry("unknown_custom_type", "msg"));
      expect(result.variant).toBe("log");
    });

    it("when type is empty string, falls back to log variant", () => {
      const result = defaultFormat(makeEntry("", "msg"));
      expect(result.variant).toBe("log");
    });
  });

  describe("data coercion", () => {
    it("coerces string data to text as-is", () => {
      const result = defaultFormat(makeEntry("log", "hello world"));
      expect(result.text).toBe("hello world");
    });

    it("coerces number data via String()", () => {
      const result = defaultFormat(makeEntry("log", 42));
      expect(result.text).toBe("42");
    });

    it("coerces null data to empty string", () => {
      const result = defaultFormat(makeEntry("log", null));
      expect(result.text).toBe("");
    });

    it("coerces undefined data to empty string", () => {
      const result = defaultFormat(makeEntry("log", undefined));
      expect(result.text).toBe("");
    });

    it("never sets tokens field", () => {
      const result = defaultFormat(
        makeEntry("log", [{ type: "string", value: "x" }])
      );
      expect(result.tokens).toBeUndefined();
    });
  });
});

describe("isConsoleTokenArray", () => {
  it("returns true for an array of ConsoleToken-shaped objects", () => {
    expect(isConsoleTokenArray([{ type: "string", value: "hello" }])).toBe(
      true
    );
  });

  it("returns true for an empty array", () => {
    expect(isConsoleTokenArray([])).toBe(true);
  });

  it("returns false for a plain string", () => {
    expect(isConsoleTokenArray("hello")).toBe(false);
  });

  it("returns false for null", () => {
    expect(isConsoleTokenArray(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isConsoleTokenArray(undefined)).toBe(false);
  });

  it("returns false for a number", () => {
    expect(isConsoleTokenArray(42)).toBe(false);
  });

  it("returns false for an array of non-token objects (missing type)", () => {
    expect(isConsoleTokenArray([{ value: "hello" }])).toBe(false);
  });

  it("returns false when first element is null or undefined", () => {
    expect(isConsoleTokenArray([null])).toBe(false);
    expect(isConsoleTokenArray([undefined])).toBe(false);
  });

  it("returns true in constant-time O(1) without iterating across full array even if subsequent elements are malformed", () => {
    const mixedArray = [
      { type: "string", value: "valid-first-token" },
      null,
      undefined,
      42,
      { corrupted: true },
    ];
    expect(isConsoleTokenArray(mixedArray)).toBe(true);
  });

  it("executes in O(1) on very large arrays without iterating", () => {
    const largeArray = new Array(100_000);
    largeArray[0] = { type: "string", value: "head" };
    // Remaining elements are empty slots / undefined
    const startTime = performance.now();
    const result = isConsoleTokenArray(largeArray);
    const duration = performance.now() - startTime;

    expect(result).toBe(true);
    expect(duration).toBeLessThan(50);
  });
});
