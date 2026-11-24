import { describe, expect, it } from "vitest";
import { loadLanguageExtension } from "./language.ts";

describe("loadLanguageExtension", () => {
  it("loads the JavaScript language extension", async () => {
    const extension = await loadLanguageExtension("javascript");
    expect(extension).toBeDefined();
    expect(Array.isArray(extension)).toBe(false);
  });

  it("loads the Python language extension", async () => {
    const extension = await loadLanguageExtension("python");
    expect(extension).toBeDefined();
    expect(Array.isArray(extension)).toBe(false);
  });

  it("returns an empty extension array for plaintext, unsupported, or undefined languages", async () => {
    expect(await loadLanguageExtension("plaintext")).toEqual([]);
    expect(await loadLanguageExtension("rust")).toEqual([]);
    expect(await loadLanguageExtension(undefined)).toEqual([]);
  });
});
