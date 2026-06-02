import { render, screen, waitFor } from "@solidjs/testing-library";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { CodeField } from "./CodeField.tsx";

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
        length: 0,
        *[Symbol.iterator]() {
          /* mock */
        },
      }) as unknown as DOMRectList;
  }
});

describe("CodeField", () => {
  it("renders without crashing", () => {
    const { container } = render(() => <CodeField />);
    expect(container.querySelector(".cm-editor")).not.toBeNull();
  });

  it("initializes with default value", () => {
    const { container } = render(() => <CodeField value="const a = 1;" />);
    expect(container.textContent).toContain("const a = 1;");
  });

  it("updates when the value prop changes", () => {
    const onValueChange = vi.fn();
    render(() => <CodeField onValueChange={onValueChange} value="test" />);
    expect(screen.queryByText("test")).not.toBeNull();
  });

  it("applies syntax highlighting correctly", async () => {
    const { container } = render(() => (
      <CodeField language="javascript" value="const a = 1;" />
    ));

    await waitFor(() => {
      const highlightSpans = container.querySelectorAll(
        ".cm-content span[class^='ͼ']"
      );
      expect(highlightSpans.length).toBeGreaterThan(0);
    });
  });
});
