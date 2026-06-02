import {
  beforeEach,
  describe,
  expect,
  it,
  type MockInstance,
  vi,
} from "vitest";
import type { UrlStatePort } from "../ports/url-state.ts";
import { composeSizeLimitedUrlState } from "./url-state-limit.ts";

describe("composeSizeLimitedUrlState", () => {
  const mockBasePort: UrlStatePort = {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
  };

  const onShareabilityChange = vi.fn();
  const maxLength = 100;

  const decorator = composeSizeLimitedUrlState(
    mockBasePort,
    maxLength,
    onShareabilityChange
  );

  let replaceStateSpy: MockInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState(null, "", "/");
    replaceStateSpy = vi.spyOn(window.history, "replaceState");
  });

  it("sets value normally when under limit", () => {
    decorator.set("test", "short");
    expect(mockBasePort.set).toHaveBeenCalledWith("test", "short");
    expect(onShareabilityChange).toHaveBeenCalledWith(true);
    expect(replaceStateSpy).not.toHaveBeenCalled();
  });

  it("blocks set and clears URL when over limit", () => {
    const longString = "a".repeat(150);
    decorator.set("test", longString);

    expect(mockBasePort.set).not.toHaveBeenCalled();
    expect(onShareabilityChange).toHaveBeenCalledWith(false);
    expect(replaceStateSpy).toHaveBeenCalledWith(
      null,
      "",
      window.location.pathname
    );
  });

  it("passes get and remove transparently", () => {
    vi.mocked(mockBasePort.get).mockReturnValue("val");
    expect(decorator.get("test")).toBe("val");
    expect(mockBasePort.get).toHaveBeenCalledWith("test");

    decorator.remove("test");
    expect(mockBasePort.remove).toHaveBeenCalledWith("test");
  });
});
