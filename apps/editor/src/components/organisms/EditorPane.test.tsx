import { render } from "@solidjs/testing-library";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { EditorPane } from "./EditorPane.tsx";

const dispatchMock = vi.fn();

vi.mock("../../core/context", () => ({
  useEditor: () => ({
    buffer: { content: () => "" },
    settings: { settings: { theme: "system", isWordWrapEnabled: false } },
    engine: { activeLanguage: () => "javascript" },
    dispatcher: { dispatch: dispatchMock },
  }),
}));

beforeAll(() => {
  if (typeof window !== "undefined") {
    if (typeof window.Range !== "undefined") {
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

    // Mock matchMedia
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
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
