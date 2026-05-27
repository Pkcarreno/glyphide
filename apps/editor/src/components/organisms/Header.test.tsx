import { render } from "@solidjs/testing-library";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { Header } from "./Header";

const dispatchMock = vi.fn();
vi.mock("../../core/context", () => ({
  useEditor: () => ({
    project: { name: () => "TEST_PROJECT" },
    engine: { status: () => "idle" },
    dispatcher: { dispatch: dispatchMock }
  })
}));

describe("Header", () => {
  beforeEach(() => {
    dispatchMock.mockClear();
  });

  it("when rendered, displays the app title", () => {
    const { getByText } = render(() => <Header />);
    expect(getByText("[ TEST_PROJECT ]")).toBeTruthy();
  });

  it("when settings button clicked, fires onSettingsClick", () => {
    const handler = vi.fn();
    const { getByRole } = render(() => <Header onSettingsClick={handler} />);
    getByRole("button", { name: "Settings" }).click();
    expect(handler).toHaveBeenCalledOnce();
  });

  it("when share button clicked, fires onShareClick", () => {
    const handler = vi.fn();
    const { getByRole } = render(() => <Header onShareClick={handler} />);
    getByRole("button", { name: "Share workspace" }).click();
    expect(handler).toHaveBeenCalledOnce();
  });

  it("when run button clicked, dispatches RUN_CODE action", () => {
    const { getAllByRole } = render(() => <Header />);
    const buttons = getAllByRole("button", { name: /Run/ });
    buttons[0].click();
    expect(dispatchMock).toHaveBeenCalledWith({ type: "RUN_CODE" });
  });

  it("when run options clicked, fires onRunOptionsClick", () => {
    const handler = vi.fn();
    const { getByRole } = render(() => <Header onRunOptionsClick={handler} />);
    getByRole("button", { name: "Run options" }).click();
    expect(handler).toHaveBeenCalledOnce();
  });

  it("when custom class is provided, merges it", () => {
    const { container } = render(() => <Header class="mb-4" />);
    expect(container.firstElementChild?.className).toContain("mb-4");
  });
});
