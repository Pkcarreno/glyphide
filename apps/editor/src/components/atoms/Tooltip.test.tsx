import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { afterEach, describe, expect, it } from "vitest";
import { Tooltip } from "./Tooltip.tsx";

afterEach(() => cleanup());

describe("Tooltip", () => {
  it("when rendered, popup is not in the DOM initially", () => {
    render(() => (
      <Tooltip data-testid="trigger" text="Tooltip content">
        Hover me
      </Tooltip>
    ));
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("when trigger receives mouseenter, popup appears", () => {
    const { getByTestId } = render(() => (
      <Tooltip data-testid="trigger" text="Tooltip content">
        Hover me
      </Tooltip>
    ));
    fireEvent.mouseEnter(getByTestId("trigger"));
    expect(screen.queryByRole("tooltip")).not.toBeNull();
  });

  it("when trigger receives mouseleave, popup disappears", () => {
    const { getByTestId } = render(() => (
      <Tooltip data-testid="trigger" text="Tooltip content">
        Hover me
      </Tooltip>
    ));
    fireEvent.mouseEnter(getByTestId("trigger"));
    expect(screen.queryByRole("tooltip")).not.toBeNull();
    fireEvent.mouseLeave(getByTestId("trigger"));
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("when popup is visible, has role='tooltip'", () => {
    const { getByTestId } = render(() => (
      <Tooltip data-testid="trigger" text="Tooltip content">
        Hover me
      </Tooltip>
    ));
    fireEvent.mouseEnter(getByTestId("trigger"));
    const popup = screen.queryByRole("tooltip");
    expect(popup).not.toBeNull();
    expect(popup?.getAttribute("role")).toBe("tooltip");
  });

  it("renders text, shortcut, and meta correctly", () => {
    const { getByTestId } = render(() => (
      <Tooltip
        as="button"
        data-testid="trigger"
        meta="Copies the selection"
        shortcut="Ctrl+C"
        text="Copy"
      >
        Trigger
      </Tooltip>
    ));

    fireEvent.mouseEnter(getByTestId("trigger"));
    const popup = screen.queryByRole("tooltip");
    expect(popup).not.toBeNull();

    expect(popup?.textContent).toContain("Copy");
    expect(popup?.textContent).toContain("Ctrl+C");
    expect(popup?.textContent).toContain("Copies the selection");
  });

  it("renders only text if shortcut and meta are absent", () => {
    const { getByTestId } = render(() => (
      <Tooltip data-testid="trigger" text="Paste">
        Trigger
      </Tooltip>
    ));

    fireEvent.mouseEnter(getByTestId("trigger"));
    const popup = screen.queryByRole("tooltip");

    expect(popup?.textContent).toContain("Paste");
    expect(popup?.textContent).not.toContain("Ctrl+");
  });
});
