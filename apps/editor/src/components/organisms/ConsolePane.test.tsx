import { render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { describe, expect, it, vi } from "vitest";
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
      return { variant: entry.type as any, tokens: entry.data };
    }
    return { variant: entry.type as any, text: String(entry.data ?? "") };
  },
};

vi.mock("../../core/context", () => ({
  useEditor: () => ({
    output: { entries },
    dispatcher: { dispatch: dispatchMock },
    engine: { activeEngineId: () => "quickjs" },
    engineRegistry: {
      getDefinition: (id: string) => ({
        id,
        outputFormatter: id === "quickjs" ? quickjsFormatter : undefined,
      }),
    },
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
      { id: "1", type: "log", data: "Server running at http://localhost:3000" },
    ]);
    const { getByText } = render(() => <ConsolePane />);
    expect(getByText("Server running at http://localhost:3000")).toBeTruthy();
  });

  it("system entry renders with system styling (bypasses engine formatter)", () => {
    setEntries([{ id: "2", type: "system", data: "Engine ready." }]);
    const { getByText } = render(() => <ConsolePane />);
    const messageElement = getByText("Engine ready.");
    // system variant adds italic class via CVA
    expect(messageElement.className).toContain("italic");
  });

  it("system error entry renders with error styling (bypasses engine formatter)", () => {
    setEntries([
      { id: "3", type: "error", data: "ReferenceError: x is not defined" },
    ]);
    const { getByText } = render(() => <ConsolePane />);
    const messageElement = getByText("ReferenceError: x is not defined");
    expect(messageElement.className).toContain("text-error");
  });

  it("engine error entry renders via ConsoleTokenView using formatter", () => {
    setEntries([
      {
        id: "3.5",
        type: "error",
        data: [{ type: "error", name: "TypeError", message: "Engine error" }],
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
        id: "4",
        type: "log",
        data: [{ type: "number", value: 42 }],
      },
    ]);
    const { container } = render(() => <ConsolePane />);
    // ConsoleTokenView renders the number as its string value
    expect(container.textContent).toContain("42");
  });

  it("unknown output type falls back to log variant (no crash)", () => {
    setEntries([{ id: "5", type: "unknown-type", data: "some debug info" }]);
    // QuickJS formatter falls through to defaultFormat for unknown types
    const { getByText } = render(() => <ConsolePane />);
    expect(getByText("some debug info")).toBeTruthy();
  });

  it("table entry renders via ConsoleTableView", () => {
    setEntries([
      {
        id: "5.5",
        type: "table",
        data: [{ type: "array", elements: [], length: 0 }],
      },
    ]);
    const { container } = render(() => <ConsolePane />);
    // ConsoleTableView renders a table element
    expect(container.querySelector("table")).toBeDefined();
  });

  it("renders multiple entries", () => {
    setEntries([
      { id: "6", type: "log", data: "first" },
      { id: "7", type: "warn", data: "second" },
    ]);
    const { getByText } = render(() => <ConsolePane />);
    expect(getByText("first")).toBeTruthy();
    expect(getByText("second")).toBeTruthy();
  });
});
