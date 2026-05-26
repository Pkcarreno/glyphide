import { render, fireEvent, screen, cleanup } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StatusBar } from "./StatusBar";

afterEach(() => cleanup());


/* ---------- Organism ---------- */

describe("StatusBar", () => {
  it("when rendered with defaults, shows idle status and 'Idle'", () => {
    const { getByText } = render(() => <StatusBar />);
    expect(getByText("Idle")).toBeTruthy();
  });

  it("when status provided, displays it", () => {
    const { getByText } = render(() => (
      <StatusBar status="running" />
    ));
    expect(getByText("Running")).toBeTruthy();
  });

  it("when rendered, displays hardcoded environment info", () => {
    const { getByText } = render(() => <StatusBar />);
    expect(getByText("TypeScript")).toBeTruthy();
  });

  it("when custom class is provided, merges it", () => {
    const { container } = render(() => <StatusBar class="mt-auto" />);
    expect(container.firstElementChild?.className).toContain("mt-auto");
  });
});

/* ---------- StatusBar.Item ---------- */

describe("StatusBar.Item", () => {
  it("when rendered, displays children", () => {
    const { getByText } = render(() => (
      <StatusBar.Item>Line 42</StatusBar.Item>
    ));
    expect(getByText("Line 42")).toBeTruthy();
  });

  it("when rendered, applies flexbox and padding classes", () => {
    const { container } = render(() => (
      <StatusBar.Item>Content</StatusBar.Item>
    ));
    const el = container.firstElementChild!;
    expect(el.className).toContain("flex");
    expect(el.className).toContain("items-center");
    expect(el.className).toContain("px-1.5");
  });

  it("when custom class is provided, merges with defaults", () => {
    const { container } = render(() => (
      <StatusBar.Item class="ml-2">Content</StatusBar.Item>
    ));
    const el = container.firstElementChild!;
    expect(el.className).toContain("ml-2");
    expect(el.className).toContain("flex");
  });
});

/* ---------- StatusBar.Button ---------- */

describe("StatusBar.Button", () => {
  it("when rendered, renders a native button element", () => {
    const { getByRole } = render(() => (
      <StatusBar.Button>Click</StatusBar.Button>
    ));
    expect(getByRole("button").tagName).toBe("BUTTON");
  });

  it("when clicked, fires onClick handler", () => {
    const handler = vi.fn();
    const { getByRole } = render(() => (
      <StatusBar.Button onClick={handler}>Click</StatusBar.Button>
    ));
    getByRole("button").click();
    expect(handler).toHaveBeenCalledOnce();
  });

  it("when rendered without tooltip, does not inject tooltip in the DOM", () => {
    const { queryByRole } = render(() => (
      <StatusBar.Button>No tip</StatusBar.Button>
    ));
    expect(queryByRole("tooltip")).toBeNull();
  });

  it("when rendered with tooltip and hovered, shows tooltip popup", () => {
    const { getByRole } = render(() => (
      <StatusBar.Button tooltip="Help text">Hover me</StatusBar.Button>
    ));
    expect(screen.queryByRole("tooltip")).toBeNull();
    fireEvent.mouseEnter(getByRole("button"));
    expect(screen.queryByRole("tooltip")).not.toBeNull();
    expect(screen.queryByRole("tooltip")!.textContent).toContain("Help text");
  });

  it("when rendered with tooltip and shortcut, shows shortcut in popup", () => {
    const { getByRole } = render(() => (
      <StatusBar.Button tooltip="Save" tooltipShortcut="⌘S">
        Save
      </StatusBar.Button>
    ));
    fireEvent.mouseEnter(getByRole("button"));
    const popup = screen.queryByRole("tooltip");
    expect(popup).not.toBeNull();
    expect(popup!.textContent).toContain("⌘S");
  });

  it("when rendered with tooltip and description, shows description in popup", () => {
    const { getByRole } = render(() => (
      <StatusBar.Button
        tooltip="Engine"
        tooltipDescription="Select the execution engine"
      >
        QuickJS
      </StatusBar.Button>
    ));
    fireEvent.mouseEnter(getByRole("button"));
    const popup = screen.queryByRole("tooltip");
    expect(popup).not.toBeNull();
    expect(popup!.textContent).toContain("Select the execution engine");
  });

  it("when rendered with hover classes, applies them", () => {
    const { getByRole } = render(() => (
      <StatusBar.Button>Styled</StatusBar.Button>
    ));
    const btn = getByRole("button");
    expect(btn.className).toContain("cursor-pointer");
    expect(btn.className).toContain("transition-colors");
  });

  it("when custom class is provided, merges with defaults", () => {
    const { getByRole } = render(() => (
      <StatusBar.Button class="gap-2">Custom</StatusBar.Button>
    ));
    const btn = getByRole("button");
    expect(btn.className).toContain("gap-2");
    expect(btn.className).toContain("rounded-md");
  });
});
