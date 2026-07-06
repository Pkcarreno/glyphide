import { describe, expect, it } from "vitest";
import { decode as codecDecode } from "./codec.ts";
import { MigrationError } from "./errors.ts";
import { buildCurrentUrl, detectVersion, migrateUrl } from "./index.ts";
import { FIXTURES } from "./test-fixtures.ts";
import type { CanonicalState } from "./types.ts";

describe("detectVersion (public API)", () => {
  it("returns the version tag for known formats", () => {
    expect(detectVersion(FIXTURES.v1.simple)).toBe("v1");
    expect(detectVersion(FIXTURES.v2.simple)).toBe("v2");
    expect(detectVersion(FIXTURES.v3.quickjs)).toBe("v3");
  });

  it("throws UNKNOWN_VERSION for unversioned URLs", () => {
    expect(() => detectVersion(FIXTURES.invalid.unknownVersion)).toThrow(
      MigrationError
    );
  });
});

describe("migrateUrl", () => {
  it("migrates a v1 URL end-to-end", () => {
    const result = migrateUrl(FIXTURES.v1.simple);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.code).toBe("console.log(1)");
      expect(result.state.name).toBe("Hello");
      expect(result.state.engine).toBe("quickjs");
      expect(result.version).toBe("v1");
    }
  });

  it("migrates a v2 URL with code-only", () => {
    const result = migrateUrl(FIXTURES.v2.codeOnly);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.code).toBe("console.log(1)");
      expect(result.state.name).toBe("");
      expect(result.version).toBe("v2");
    }
  });

  it("migrates a v3 URL preserving the engine", () => {
    const result = migrateUrl(FIXTURES.v3.micropython);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.engine).toBe("micropython");
      expect(result.state.language).toBe("python");
      expect(result.version).toBe("v3");
    }
  });

  it("returns EMPTY_INPUT for empty string", () => {
    const result = migrateUrl(FIXTURES.invalid.empty);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("EMPTY_INPUT");
    }
  });

  it("returns EMPTY_INPUT for whitespace-only input", () => {
    const result = migrateUrl(FIXTURES.invalid.whitespace);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("EMPTY_INPUT");
    }
  });

  it("returns INVALID_URL for non-URL strings", () => {
    const result = migrateUrl(FIXTURES.invalid.notAUrl);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_URL");
    }
  });

  it("returns UNKNOWN_VERSION for URLs without recognized markers", () => {
    const result = migrateUrl(FIXTURES.invalid.unknownVersion);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("UNKNOWN_VERSION");
    }
  });

  it("returns DECODE_FAILED for corrupted v1 base64", () => {
    const result = migrateUrl("https://glyphide.com/#code=!!!invalid!!!");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("DECODE_FAILED");
    }
  });
});

describe("buildCurrentUrl", () => {
  it("returns a URL targeting https://glyphide.com/ with all params", () => {
    const state: CanonicalState = {
      code: "console.log(1)",
      name: "Test",
      engine: "quickjs",
      language: "javascript",
    };
    const result = buildCurrentUrl(state);
    expect(result.url.startsWith("https://glyphide.com/?")).toBe(true);
    const parsed = new URL(result.url);
    expect(parsed.searchParams.has("code")).toBe(true);
    expect(parsed.searchParams.has("name")).toBe(true);
    expect(parsed.searchParams.has("engine")).toBe(true);
    expect(result.warning).toBeNull();
  });

  it("encodes the engine param as 'engineId' when language is default", () => {
    const state: CanonicalState = {
      code: "x",
      name: "y",
      engine: "quickjs",
      language: "javascript",
    };
    const result = buildCurrentUrl(state);
    const parsed = new URL(result.url);
    // Engine param is fflate-encoded; round-trip decode to confirm
    // the value embedded in the URL is `quickjs` (not `quickjs:javascript`).
    const engineRaw = parsed.searchParams.get("engine");
    if (engineRaw === null) {
      throw new Error("expected engine param in output URL");
    }
    const decoded = codecDecode(engineRaw);
    expect(decoded).toBe("quickjs");
  });

  it("encodes the engine param as 'engineId:language' for multi-language engines", () => {
    const state: CanonicalState = {
      code: "print(1)",
      name: "Greet",
      engine: "micropython",
      language: "python",
    };
    const result = buildCurrentUrl(state);
    const parsed = new URL(result.url);
    const engineRaw = parsed.searchParams.get("engine");
    if (engineRaw === null) {
      throw new Error("expected engine param in output URL");
    }
    const decoded = codecDecode(engineRaw);
    expect(decoded).toBe("micropython:python");
  });

  it("omits the name param when the name is empty", () => {
    const state: CanonicalState = {
      code: "console.log(1)",
      name: "",
      engine: "quickjs",
      language: "javascript",
    };
    const result = buildCurrentUrl(state);
    const parsed = new URL(result.url);
    expect(parsed.searchParams.has("code")).toBe(true);
    expect(parsed.searchParams.has("name")).toBe(false);
    expect(parsed.searchParams.has("engine")).toBe(true);
  });

  it("returns a warning when the URL exceeds 8000 characters", () => {
    // Use a high-entropy payload so deflate cannot compress it.
    // 2M random printable chars → ~11k+ base64 output, well over 8000.
    const chars: string[] = [];
    for (let i = 0; i < 2_000_000; i++) {
      chars.push(String.fromCharCode(33 + ((i * 2_654_435_761) % 94)));
    }
    const longCode = chars.join("");
    const state: CanonicalState = {
      code: longCode,
      name: "Big",
      engine: "quickjs",
      language: "javascript",
    };
    const result = buildCurrentUrl(state);
    expect(result.url.length).toBeGreaterThan(8000);
    expect(result.warning).toContain("8000 characters");
  });
});
