import { render } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";
import { ConsolePane } from "./ConsolePane";

vi.mock("../../core/context", () => ({
  useEditor: () => ({
    output: {
      entries: () => [
        { id: "1", type: "system", data: "Engine initialized in 42ms" },
        { id: "2", type: "log", data: "Server running at http://localhost:3000" }
      ]
    },
    dispatcher: { dispatch: vi.fn() }
  })
}));

describe("ConsolePane", () => {
  it("when rendered, displays the Output header", () => {
    const { getByText } = render(() => <ConsolePane />);
    expect(getByText("Output")).toBeTruthy();
  });

  it("when rendered, displays output entries from the core", () => {
    const { getByText } = render(() => <ConsolePane />);
    expect(getByText("Engine initialized in 42ms")).toBeTruthy();
    expect(getByText("Server running at http://localhost:3000")).toBeTruthy();
  });

  it("when custom class is provided, merges it", () => {
    const { container } = render(() => <ConsolePane class="w-1/2" />);
    expect(container.firstElementChild?.className).toContain("w-1/2");
    expect(container.firstElementChild?.className).toContain("bg-surface");
  });
});
