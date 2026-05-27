import { render } from "@solidjs/testing-library";
import { describe, expect, it, beforeAll } from "vitest";
import { EditorPane } from "./EditorPane";

beforeAll(() => {
  if (typeof window !== "undefined" && typeof window.Range !== "undefined") {
    window.Range.prototype.getBoundingClientRect = () => ({
      bottom: 0, height: 0, left: 0, right: 0, top: 0, width: 0, x: 0, y: 0, toJSON: () => { }
    });
    window.Range.prototype.getClientRects = () => ({
      item: () => null,
      length: 0,
      [Symbol.iterator]: function* () { },
    } as any);
  }
});

describe("EditorPane", () => {
  it("when rendered, displays the CodeField editor", () => {
    const { container } = render(() => <EditorPane />);
    expect(container.querySelector(".cm-editor")).not.toBeNull();
  });

  it("when custom class is provided, merges it", () => {
    const { container } = render(() => <EditorPane class="hidden" />);
    expect(container.firstElementChild?.className).toContain("hidden");
    expect(container.firstElementChild?.className).toContain("flex-1");
  });
});
