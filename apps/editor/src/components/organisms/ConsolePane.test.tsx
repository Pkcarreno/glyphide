import type { ConsoleToken } from "@glyphide/quickjs-engine/types";
import { render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { describe, expect, it, vi } from "vitest";
import type { ConsoleVariant } from "../../core/engine/output-formatter.ts";
import { ConsolePane } from "./ConsolePane.tsx";

const dispatchMock = vi.fn();
const [entries, setEntries] = createSignal<
  { id: string; type: string; data: unknown }[]
>([]);

/** Minimal formatter mock for QuickJS-style engines. */
const quickjsFormatter = {
  format(entry: {
    id: number;
    timestamp: number;
    type: string;
    data: unknown;
  }) {
    if (Array.isArray(entry.data)) {
      return {
        tokens: entry.data as ConsoleToken[],
        variant: entry.type as ConsoleVariant,
      };
    }
    return {
      text: String(entry.data ?? ""),
      variant: entry.type as ConsoleVariant,
    };
  },
};

vi.mock("../../core/context", () => ({
  useEditor: () => ({
    dispatcher: { dispatch: dispatchMock },
    engine: { activeEngineId: () => "quickjs" },
    engineRegistry: {
      getDefinition: (id: string) => ({
        id,
        outputFormatter: id === "quickjs" ? quickjsFormatter : undefined,
      }),
    },
    output: { entries },
  }),
}));

describe("ConsolePane", () => {
  it("when rendered, displays the Output header", () => {
    setEntries([]);
    const { getByText } = render(() => <ConsolePane />);
    expect(getByText("Output")).toBeTruthy();
  });

  it("renders a Clear button", () => {
    setEntries([]);
    const { getByText } = render(() => <ConsolePane />);
    expect(getByText("Clear")).toBeTruthy();
  });

  it("when custom class is provided, merges it", () => {
    setEntries([]);
    const { container } = render(() => <ConsolePane class="w-1/2" />);
    expect(container.firstElementChild?.className).toContain("w-1/2");
    expect(container.firstElementChild?.className).toContain("bg-surface");
  });

  it("renders a plain string entry as text", () => {
    setEntries([
      { data: "Server running at http://localhost:3000", id: "1", type: "log" },
    ]);
    const { getByText } = render(() => <ConsolePane />);
    expect(getByText("Server running at http://localhost:3000")).toBeTruthy();
  });

  it("system entry renders with system styling (bypasses engine formatter)", () => {
    setEntries([{ data: "Engine ready.", id: "2", type: "system" }]);
    const { getByText } = render(() => <ConsolePane />);
    const messageElement = getByText("Engine ready.");
    // system variant adds italic class via CVA
    expect(messageElement.className).toContain("italic");
  });

  it("system error entry renders with error styling (bypasses engine formatter)", () => {
    setEntries([
      { data: "ReferenceError: x is not defined", id: "3", type: "error" },
    ]);
    const { getByText } = render(() => <ConsolePane />);
    const messageElement = getByText("ReferenceError: x is not defined");
    expect(messageElement.className).toContain("text-error");
  });

  it("engine error entry renders via ConsoleTokenView using formatter", () => {
    setEntries([
      {
        data: [{ message: "Engine error", name: "TypeError", type: "error" }],
        id: "3.5",
        type: "error",
      },
    ]);
    const { container } = render(() => <ConsolePane />);
    // ConsoleTokenView should render the Error token
    expect(container.textContent).toContain("TypeError");
    expect(container.textContent).toContain("Engine error");
  });

  it("token entry (ConsoleToken array) renders via ConsoleTokenView", () => {
    setEntries([
      {
        data: [{ type: "number", value: 42 }],
        id: "4",
        type: "log",
      },
    ]);
    const { container } = render(() => <ConsolePane />);
    // ConsoleTokenView renders the number as its string value
    expect(container.textContent).toContain("42");
  });

  it("unknown output type falls back to log variant (no crash)", () => {
    setEntries([{ data: "some debug info", id: "5", type: "unknown-type" }]);
    // QuickJS formatter falls through to defaultFormat for unknown types
    const { getByText } = render(() => <ConsolePane />);
    expect(getByText("some debug info")).toBeTruthy();
  });

  it("table entry renders via ConsoleTableView", () => {
    setEntries([
      {
        data: [{ elements: [], length: 0, type: "array" }],
        id: "5.5",
        type: "table",
      },
    ]);
    const { container } = render(() => <ConsolePane />);
    // ConsoleTableView renders a table element
    expect(container.querySelector("table")).toBeDefined();
  });

  it("renders multiple entries", () => {
    setEntries([
      { data: "first", id: "6", type: "log" },
      { data: "second", id: "7", type: "warn" },
    ]);
    const { getByText } = render(() => <ConsolePane />);
    expect(getByText("first")).toBeTruthy();
    expect(getByText("second")).toBeTruthy();
  });

  it("renders group and groupCollapsed nodes correctly", () => {
    setEntries([
      { data: [{ type: "string", value: "My Group" }], id: "8", type: "group" },
      { data: "Inside group", id: "9", type: "log" },
      { data: undefined, id: "10", type: "groupEnd" },
      {
        data: [{ type: "string", value: "Hidden Group" }],
        id: "11",
        type: "groupCollapsed",
      },
      { data: "Inside collapsed", id: "12", type: "log" },
    ]);
    const { container, getByText } = render(() => <ConsolePane />);

    // Group label visible
    expect(getByText("My Group")).toBeTruthy();

    // Inside group log visible because defaultExpanded is true for "group"
    expect(getByText("Inside group")).toBeTruthy();

    // Collapsed group label visible
    expect(getByText("Hidden Group")).toBeTruthy();

    // Inside collapsed log NOT visible because defaultExpanded is false for "groupCollapsed"
    expect(container.textContent).not.toContain("Inside collapsed");
  });
});
