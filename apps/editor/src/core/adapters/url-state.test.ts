import {
  beforeEach,
  describe,
  expect,
  it,
  type MockInstance,
  vi,
} from "vitest";
import { createBrowserUrlStateAdapter } from "./url-state.ts";

describe("UrlStateAdapter", () => {
  let replaceStateSpy: MockInstance;

  beforeEach(() => {
    window.history.replaceState(null, "", "/");
    replaceStateSpy = vi.spyOn(window.history, "replaceState");
  });

  it("gets parameters from the URL", () => {
    window.history.replaceState(null, "", "/?test=value");
    const adapter = createBrowserUrlStateAdapter();

    expect(adapter.get("test")).toBe("value");
    expect(adapter.get("missing")).toBeNull();
  });

  it("sets parameters without triggering navigation", () => {
    const adapter = createBrowserUrlStateAdapter();
    adapter.set("test", "newValue");

    expect(window.location.search).toContain("test=newValue");
    expect(replaceStateSpy).toHaveBeenCalled();
  });

  it("removes parameters correctly", () => {
    window.history.replaceState(null, "", "/?toDelete=123");
    const adapter = createBrowserUrlStateAdapter();

    adapter.remove("toDelete");

    expect(window.location.search).not.toContain("toDelete=123");
    expect(replaceStateSpy).toHaveBeenCalled();
  });
});
