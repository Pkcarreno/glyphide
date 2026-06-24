import { render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { EditorPane } from "./EditorPane.tsx";

const dispatchMock = vi.fn();
const [mockIsTrustRequired, setMockIsTrustRequired] = createSignal(false);

vi.mock("../../core/context", () => ({
  useEditor: () => ({
    buffer: { content: () => "" },
    settings: { settings: { theme: "system", isWordWrapEnabled: false } },
    engine: { activeLanguage: () => "javascript" },
    dispatcher: { dispatch: dispatchMock },
    trust: { isTrustRequired: () => mockIsTrustRequired() },
  }),
}));

beforeAll(() => {
  if (typeof window !== "undefined" && typeof window.Range !== "undefined") {
    window.Range.prototype.getBoundingClientRect = () => ({
      bottom: 0,
      height: 0,
      left: 0,
      right: 0,
      top: 0,
      width: 0,
      x: 0,
      y: 0,
      toJSON: () => {
        /* mock */
      },
    });
    window.Range.prototype.getClientRects = () =>
      ({
        item: () => null,
        *[Symbol.iterator]() {
          /* mock */
        },
      }) as unknown as DOMRectList;
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

  it("when trust is required, editor is read-only", () => {
    setMockIsTrustRequired(true);
    const { container } = render(() => <EditorPane />);
    const editor = container.querySelector(".cm-editor");
    expect(editor).not.toBeNull();
    // CodeMirror sets contenteditable="false" when read-only
    const content = editor?.querySelector(".cm-content");
    expect(content?.getAttribute("contenteditable")).toBe("false");
    setMockIsTrustRequired(false);
  });

  it("when trust is not required, editor is editable", () => {
    setMockIsTrustRequired(false);
    const { container } = render(() => <EditorPane />);
    const editor = container.querySelector(".cm-editor");
    expect(editor).not.toBeNull();
    const content = editor?.querySelector(".cm-content");
    expect(content?.getAttribute("contenteditable")).toBe("true");
  });
});
