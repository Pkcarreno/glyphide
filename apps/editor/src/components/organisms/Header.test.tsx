import { render } from "@solidjs/testing-library";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { Header } from "./Header";

vi.stubGlobal("alert", vi.fn());

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

  it("when settings button clicked, dispatches TOGGLE_OVERLAY action", () => {
    const { getByRole } = render(() => <Header />);
    getByRole("button", { name: "Settings" }).click();
    expect(dispatchMock).toHaveBeenCalledWith({ type: "TOGGLE_OVERLAY", overlayId: "settings" });
  });

  it("when share button clicked, shows alert", () => {
    const { getByRole } = render(() => <Header />);
    getByRole("button", { name: "Share workspace" }).click();
    expect(window.alert).toHaveBeenCalledWith("Share functionality coming soon!");
  });

  it("when run button clicked, dispatches RUN_CODE action", () => {
    const { getAllByRole } = render(() => <Header />);
    const buttons = getAllByRole("button", { name: /Run/ });
    buttons[0].click();
    expect(dispatchMock).toHaveBeenCalledWith({ type: "RUN_CODE" });
  });

  it("when custom class is provided, merges it", () => {
    const { container } = render(() => <Header class="mb-4" />);
    expect(container.firstElementChild?.className).toContain("mb-4");
  });
});
