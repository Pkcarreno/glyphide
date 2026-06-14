import { fireEvent, render } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";
import type { FlatConsoleItem } from "../../helpers/console-hierarchy.ts";
import { ConsoleGroupView } from "./ConsoleGroupView.tsx";

describe("ConsoleGroupView", () => {
  const mockOutputEntry = {
    id: 0,
    timestamp: 0,
    type: "log",
    data: "",
  } as import("../../core/models/output.ts").OutputEntry;

  const mockItem: FlatConsoleItem = {
    id: 0,
    entry: mockOutputEntry,
    rendered: { variant: "group" },
    depth: 0,
    isGroup: true,
    isCollapsed: false,
    groupLabel: [],
  };

  it("renders a <no label> preview when label is empty", () => {
    const { container } = render(() => (
      <ConsoleGroupView
        item={mockItem}
        onToggle={() => {
          /* noop */
        }}
      />
    ));
    expect(container.textContent).toContain("<no label>");
  });

  it("renders the label using ConsoleTokenView when tokens are provided", () => {
    const itemWithLabel = {
      ...mockItem,
      groupLabel: [{ type: "string" as const, value: "My Custom Group" }],
    };
    const { container } = render(() => (
      <ConsoleGroupView
        item={itemWithLabel}
        onToggle={() => {
          /* noop */
        }}
      />
    ));
    expect(container.textContent).toContain("My Custom Group");
  });

  it("fires onToggle when the button is clicked", () => {
    const onToggle = vi.fn();
    const { getByRole } = render(() => (
      <ConsoleGroupView item={mockItem} onToggle={onToggle} />
    ));
    fireEvent.click(getByRole("button"));
    expect(onToggle).toHaveBeenCalledOnce();
  });
});
