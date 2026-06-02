import { describe, expect, it } from "vitest";
import type { UrlStatePort } from "../ports/url-state.ts";
import { createBufferModel } from "./buffer.ts";

const createMockUrlState = (
  initialValues: Record<string, string> = {}
): UrlStatePort => {
  const store = new Map(Object.entries(initialValues));
  return {
    get: (key) => store.get(key) ?? null,
    set: (key, val) => {
      store.set(key, val);
    },
    remove: (key) => {
      store.delete(key);
    },
  };
};

describe("BufferModel", () => {
  it("initializes with empty string by default", () => {
    const buffer = createBufferModel(createMockUrlState());
    expect(buffer.content()).toBe("");
  });

  it("initializes with provided content", () => {
    const buffer = createBufferModel(
      createMockUrlState(),
      "console.log('hello');"
    );
    expect(buffer.content()).toBe("console.log('hello');");
  });

  it("initializes from URL if code exists", () => {
    const code = "console.log('from url');";
    const mockState = createMockUrlState({ code });
    const buffer = createBufferModel(mockState);
    expect(buffer.content()).toBe(code);
  });

  it("updates content reactively and syncs to URL", () => {
    const mockState = createMockUrlState();
    const buffer = createBufferModel(mockState);
    buffer.setContent("new content");
    expect(buffer.content()).toBe("new content");
    expect(mockState.get("code")).toBe("new content");
  });
});
