import { render } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import { ConsolePane } from "./ConsolePane";

describe("ConsolePane", () => {
  it("when rendered, displays the Output header", () => {
    const { getByText } = render(() => <ConsolePane />);
    expect(getByText("Output")).toBeTruthy();
  });

  it("when rendered, displays the static log messages", () => {
    const { getByText } = render(() => <ConsolePane />);
    expect(getByText("Engine initialized in 42ms")).toBeTruthy();
    expect(getByText("Server running at http://localhost:3000")).toBeTruthy();
    expect(getByText("[Warn] Deprecated API usage detected")).toBeTruthy();
    expect(getByText("> GET /")).toBeTruthy();
    expect(getByText("Execution terminated (code 1)")).toBeTruthy();
  });

  it("when custom class is provided, merges it", () => {
    const { container } = render(() => <ConsolePane class="w-1/2" />);
    expect(container.firstElementChild?.className).toContain("w-1/2");
    expect(container.firstElementChild?.className).toContain("bg-surface");
  });
});
