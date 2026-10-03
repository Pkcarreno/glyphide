import type { ConsoleToken } from "@glyphide/quickjs-engine/types";
import { fireEvent, render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ConsoleVariant } from "../../core/engine/output-formatter.ts";
import { ConsolePane } from "./ConsolePane.tsx";

const clearEntriesMock = vi.fn();
const [entries, setEntries] = createSignal<
  { id: string; type: string; data: unknown }[]
>([]);
const [stats, setStats] = createSignal({
  bufferDropped: 0,
  totalDropped: 0,
  workerDropped: 0,
});

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
    engine: { activeEngineId: () => "quickjs" },
    engineRegistry: {
      getDefinition: (id: string) => ({
        id,
        outputFormatter: id === "quickjs" ? quickjsFormatter : undefined,
      }),
    },
    output: { clearEntries: clearEntriesMock, entries, stats },
  }),
}));

const OMITTED_LOGS_PATTERN = /omitted/i;

describe("ConsolePane", () => {
  beforeEach(() => {
    clearEntriesMock.mockClear();
    setStats({ bufferDropped: 0, totalDropped: 0, workerDropped: 0 });
  });

  it("when rendered, displays the Output header", () => {
    setEntries([]);
    const { getByText } = render(() => <ConsolePane />);
    expect(getByText("Output")).toBeTruthy();
  });

  it("when totalDropped is 0, does not render omitted count indicator", () => {
    setEntries([]);
    const { queryByText } = render(() => <ConsolePane />);
    expect(queryByText(OMITTED_LOGS_PATTERN)).toBeNull();
  });

  it("when totalDropped > 0, renders omitted counter in header", () => {
    setEntries([]);
    setStats({ bufferDropped: 200, totalDropped: 1200, workerDropped: 1000 });
    const { getByText } = render(() => <ConsolePane />);
    expect(getByText("(1.2k omitted)")).toBeTruthy();
  });

  it("renders a Clear button and calls clearEntries on click", () => {
    setEntries([]);
    const { getByText } = render(() => <ConsolePane />);
    const clearButton = getByText("Clear");
    expect(clearButton).toBeTruthy();
    fireEvent.click(clearButton);
    expect(clearEntriesMock).toHaveBeenCalledTimes(1);
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

  it("protects message render items with an error boundary falling back to raw string rendering", () => {
    // Suppress console.error in test runner for expected error boundary test
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {
        // Intentionally empty: suppress expected error boundary log
      });

    const corruptToken = {
      get type(): string {
        throw new Error("Simulated AST render explosion");
      },
    };

    setEntries([
      {
        data: "Normal previous message",
        id: "13",
        type: "log",
      },
      {
        data: [corruptToken],
        id: "14",
        type: "log",
      },
      {
        data: "Normal next message",
        id: "15",
        type: "log",
      },
    ]);

    expect(() => {
      const { container, getByText } = render(() => <ConsolePane />);
      expect(getByText("Normal previous message")).toBeTruthy();
      expect(getByText("Normal next message")).toBeTruthy();
      expect(container.textContent).toContain("Simulated AST render explosion");
    }).not.toThrow();

    consoleErrorSpy.mockRestore();
  });
});
