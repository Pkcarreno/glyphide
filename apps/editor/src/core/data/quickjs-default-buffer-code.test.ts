import { describe, expect, it } from "vitest";
import { QUICKJS_DEFAULT_BUFFER_CODE } from "./quickjs-default-buffer-code.ts";

const THROWS_ERROR_REGEX = /throw\s+new\s+Error/;
const LARGE_LOOP_REGEX = /index\s*<\s*(100000|1000000|5000000)\b/;
const USES_PROXY_REGEX = /new\s+Proxy\b/;

describe("QUICKJS_DEFAULT_BUFFER_CODE", () => {
  it("is a non-empty string", () => {
    expect(typeof QUICKJS_DEFAULT_BUFFER_CODE).toBe("string");
    expect(QUICKJS_DEFAULT_BUFFER_CODE.trim().length).toBeGreaterThan(0);
  });

  it("contains at least one console.log call demonstrating output", () => {
    expect(QUICKJS_DEFAULT_BUFFER_CODE).toContain("console.log");
  });

  it("does not contain hostile objects that throw on read", () => {
    // Hostile trap getters that throw on enumeration would derail beginners.
    expect(THROWS_ERROR_REGEX.test(QUICKJS_DEFAULT_BUFFER_CODE)).toBe(false);
  });

  it("does not contain performance traps (large iteration loops)", () => {
    // Reject 100k+ loops that would visibly slow first paint.
    expect(LARGE_LOOP_REGEX.test(QUICKJS_DEFAULT_BUFFER_CODE)).toBe(false);
  });

  it("does not use Proxy (too advanced for the beginner tour)", () => {
    expect(USES_PROXY_REGEX.test(QUICKJS_DEFAULT_BUFFER_CODE)).toBe(false);
  });
});
