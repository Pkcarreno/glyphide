import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StatusBar } from "./StatusBar.tsx";

const { mockCursorPositionFn, dispatchMock } = vi.hoisted(() => ({
  mockCursorPositionFn: vi.fn(() => ({
    line: 1,
    column: 5,
    selectionLength: 0,
    selectionLines: 0,
  })),
  dispatchMock: vi.fn(),
}));

let mockStatus = "idle";
let mockEngineId = "quickjs";

vi.mock("../../core/context.tsx", () => ({
  useEditor: () => ({
    buffer: {
      content: () => "line1\nline2",
      cursorPosition: mockCursorPositionFn,
    },
    engine: {
      engineStatus: () => mockStatus,
      activeEngineId: () => mockEngineId,
      activeLanguage: () => "javascript",
    },
    notifications: {
      unreadCount: () => 0,
      items: () => [],
      activeToasts: () => [],
    },
    dispatcher: { dispatch: dispatchMock },
  }),
}));

afterEach(() => {
  cleanup();
  mockStatus = "idle";
  mockEngineId = "quickjs";
  mockCursorPositionFn.mockReturnValue({
    line: 1,
    column: 5,
    selectionLength: 0,
    selectionLines: 0,
  });
  dispatchMock.mockClear();
});

const JS_REGEX = /javascript/i;

describe("StatusBar", () => {
  it("when rendered with defaults, shows idle status and 'idle'", () => {
    const { getByText } = render(() => <StatusBar />);
    expect(getByText("idle")).toBeTruthy();
  });

  it("when status provided via core, displays it", () => {
    mockStatus = "running";
    const { getByText } = render(() => <StatusBar />);
    expect(getByText("running")).toBeTruthy();
  });

  it("when rendered, displays hardcoded environment info", () => {
    const { getByText } = render(() => <StatusBar />);
    expect(getByText(JS_REGEX)).toBeTruthy();
    expect(getByText("1:5", { exact: false })).toBeTruthy();
  });

  it("when there is a selection, displays the selection lines and length", () => {
    mockCursorPositionFn.mockReturnValue({
      line: 2,
      column: 10,
      selectionLength: 42,
      selectionLines: 4,
    });

    const { getByText } = render(() => <StatusBar />);
    expect(getByText("2:10", { exact: false })).toBeTruthy();
    expect(getByText("(4l, 42c)", { exact: false })).toBeTruthy();
  });

  it("when custom class is provided, merges it", () => {
    const { container } = render(() => <StatusBar class="mt-auto" />);
    expect(container.firstElementChild?.className).toContain("mt-auto");
  });
});

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
    const el = container.firstElementChild;
    expect(el).not.toBeNull();
    expect(el?.className).toContain("flex");
    expect(el?.className).toContain("items-center");
    expect(el?.className).toContain("px-1.5");
  });

  it("when custom class is provided, merges with defaults", () => {
    const { container } = render(() => (
      <StatusBar.Item class="ml-2">Content</StatusBar.Item>
    ));
    const el = container.firstElementChild;
    expect(el).not.toBeNull();
    expect(el?.className).toContain("ml-2");
    expect(el?.className).toContain("flex");
  });
});

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
    expect(screen.queryByRole("tooltip")?.textContent).toContain("Help text");
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
    expect(popup?.textContent).toContain("⌘S");
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
    expect(popup?.textContent).toContain("Select the execution engine");
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
