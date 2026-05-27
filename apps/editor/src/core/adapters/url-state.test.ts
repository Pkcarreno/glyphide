import { describe, expect, it, vi, beforeEach } from "vitest";
import { createUrlStateAdapter } from "./url-state";

describe("UrlStateAdapter", () => {
  let replaceStateSpy: any;

  beforeEach(() => {
    window.history.replaceState(null, "", "/");
    replaceStateSpy = vi.spyOn(window.history, "replaceState");
  });

  it("gets parameters from the URL", () => {
    window.history.replaceState(null, "", "/?test=value");
    const adapter = createUrlStateAdapter();

    expect(adapter.get("test")).toBe("value");
    expect(adapter.get("missing")).toBeNull();
  });

  it("sets parameters without triggering navigation", () => {
    const adapter = createUrlStateAdapter();
    adapter.set("test", "newValue");

    expect(window.location.search).toContain("test=newValue");
    expect(replaceStateSpy).toHaveBeenCalled();
  });

  it("removes parameters correctly", () => {
    window.history.replaceState(null, "", "/?toDelete=123");
    const adapter = createUrlStateAdapter();

    adapter.remove("toDelete");

    expect(window.location.search).not.toContain("toDelete=123");
    expect(replaceStateSpy).toHaveBeenCalled();
  });
});
