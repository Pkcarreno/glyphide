import { describe, expect, it } from "vitest";
import type { UrlStatePort } from "../ports/url-state.ts";
import { createBufferModel } from "./buffer.ts";

const createMockUrlState = (
  initialValues: Record<string, string> = {}
): UrlStatePort => {
  const store = new Map(Object.entries(initialValues));
  return {
    get: (key) => store.get(key) ?? null,
    remove: (key) => {
      store.delete(key);
    },
    set: (key, val) => {
      store.set(key, val);
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

  it("initializes cursor position and updates it correctly", () => {
    const mockState = createMockUrlState();
    const buffer = createBufferModel(mockState);
    expect(buffer.cursorPosition()).toEqual({
      column: 1,
      line: 1,
      selectionLength: 0,
      selectionLines: 0,
    });
    buffer.setCursorPosition(5, 10, 15, 2);
    expect(buffer.cursorPosition()).toEqual({
      column: 10,
      line: 5,
      selectionLength: 15,
      selectionLines: 2,
    });
  });

  describe("pristine flag (isShowingDefaultCode)", () => {
    it("is false initially when no initial content and no URL code", () => {
      const buffer = createBufferModel(createMockUrlState());
      expect(buffer.isShowingDefaultCode()).toBe(false);
    });

    it("is false initially when content comes from URL (URL-shared is user code)", () => {
      const buffer = createBufferModel(
        createMockUrlState({ code: "console.log('shared')" })
      );
      expect(buffer.isShowingDefaultCode()).toBe(false);
    });

    it("is true initially when default-source initial content is provided and URL is empty", () => {
      const buffer = createBufferModel(
        createMockUrlState(),
        "// default code",
        { source: "default" }
      );
      expect(buffer.isShowingDefaultCode()).toBe(true);
    });

    it("is false initially when user-source initial content is provided", () => {
      const buffer = createBufferModel(
        createMockUrlState(),
        "// user content",
        { source: "user" }
      );
      expect(buffer.isShowingDefaultCode()).toBe(false);
    });

    it("is false when default source flag is passed but initial content is empty", () => {
      const buffer = createBufferModel(createMockUrlState(), "", {
        source: "default",
      });
      expect(buffer.isShowingDefaultCode()).toBe(false);
    });

    it("URL code always wins — flag stays disarmed even with default source", () => {
      const buffer = createBufferModel(
        createMockUrlState({ code: "from-url" }),
        "// default",
        { source: "default" }
      );
      expect(buffer.isShowingDefaultCode()).toBe(false);
    });

    it("setContent with source: 'default' arms the flag", () => {
      const buffer = createBufferModel(createMockUrlState());
      expect(buffer.isShowingDefaultCode()).toBe(false);
      buffer.setContent("// new default", { source: "default" });
      expect(buffer.isShowingDefaultCode()).toBe(true);
    });

    it("setContent with source: 'user' disarms the flag", () => {
      const buffer = createBufferModel(createMockUrlState(), "// default", {
        source: "default",
      });
      expect(buffer.isShowingDefaultCode()).toBe(true);
      buffer.setContent("// user edit", { source: "user" });
      expect(buffer.isShowingDefaultCode()).toBe(false);
    });

    it("setContent without options disarms the flag (backward-compatible default)", () => {
      const buffer = createBufferModel(createMockUrlState(), "// default", {
        source: "default",
      });
      expect(buffer.isShowingDefaultCode()).toBe(true);
      buffer.setContent("// whatever");
      expect(buffer.isShowingDefaultCode()).toBe(false);
    });

    it("re-arming works after disarm — setContent({ source: 'default' }) arms again", () => {
      const buffer = createBufferModel(createMockUrlState(), "// default", {
        source: "default",
      });
      buffer.setContent("// user", { source: "user" });
      expect(buffer.isShowingDefaultCode()).toBe(false);
      buffer.setContent("// reset default", { source: "default" });
      expect(buffer.isShowingDefaultCode()).toBe(true);
    });
  });
});
