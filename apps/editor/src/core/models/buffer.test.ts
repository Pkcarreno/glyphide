import { describe, expect, it } from "vitest";
import { createBufferModel } from "./buffer";

describe("BufferModel", () => {
  it("initializes with empty string by default", () => {
    const buffer = createBufferModel();
    expect(buffer.content()).toBe("");
  });

  it("initializes with provided content", () => {
    const buffer = createBufferModel("console.log('hello');");
    expect(buffer.content()).toBe("console.log('hello');");
  });

  it("updates content reactively", () => {
    const buffer = createBufferModel();
    buffer.setContent("new content");
    expect(buffer.content()).toBe("new content");
  });
});
