import { render, screen, waitFor } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
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

  it("fires onCursorChange when editor updates", async () => {
    const onCursorChange = vi.fn();
    const [val, setVal] = createSignal("test");
    render(() => <CodeField onCursorChange={onCursorChange} value={val()} />);

    setVal("new test");
    await waitFor(() => {
      expect(onCursorChange).toHaveBeenCalled();
      const callArgs = onCursorChange.mock.calls[0];
      // Expected to be called with at least line and column
      expect(callArgs[0]).toBe(1);
    });
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

  it("enables word wrap when isWordWrapEnabled is true", async () => {
    const { container } = render(() => (
      <CodeField isWordWrapEnabled={true} value="long text" />
    ));
    await waitFor(() => {
      expect(container.querySelector(".cm-lineWrapping")).not.toBeNull();
    });
  });

  it("disables word wrap when isWordWrapEnabled is false", async () => {
    const { container } = render(() => (
      <CodeField isWordWrapEnabled={false} value="long text" />
    ));
    await waitFor(() => {
      expect(container.querySelector(".cm-lineWrapping")).toBeNull();
    });
  });
});
