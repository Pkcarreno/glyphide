import { describe, expect, it, vi, beforeEach } from "vitest";
import { createLocalStorageAdapter } from "./local-storage";

describe("LocalStorageAdapter", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("sets and gets values with a namespace prefix", () => {
    const adapter = createLocalStorageAdapter();
    adapter.set("testKey", "testValue");

    expect(adapter.get("testKey")).toBe("testValue");
    expect(localStorage.getItem("glyphide:testKey")).toBe("testValue");
  });

  it("returns null for non-existent keys", () => {
    const adapter = createLocalStorageAdapter();
    expect(adapter.get("nonExistent")).toBeNull();
  });

  it("removes values correctly", () => {
    const adapter = createLocalStorageAdapter();
    adapter.set("deleteMe", "data");
    adapter.remove("deleteMe");

    expect(adapter.get("deleteMe")).toBeNull();
    expect(localStorage.getItem("glyphide:deleteMe")).toBeNull();
  });

  it("fails silently if localStorage throws", () => {
    const setSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Quota exceeded");
    });
    const getSpy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("Access denied");
    });
    const removeSpy = vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("Access denied");
    });

    const adapter = createLocalStorageAdapter();

    expect(() => adapter.set("key", "val")).not.toThrow();
    expect(() => adapter.get("key")).not.toThrow();
    expect(adapter.get("key")).toBeNull();
    expect(() => adapter.remove("key")).not.toThrow();

    setSpy.mockRestore();
    getSpy.mockRestore();
    removeSpy.mockRestore();
  });
});
