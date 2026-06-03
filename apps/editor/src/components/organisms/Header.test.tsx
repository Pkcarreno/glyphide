import { render } from "@solidjs/testing-library";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Header } from "./Header.tsx";

vi.stubGlobal("console", { info: vi.fn() });

const dispatchMock = vi.fn();
vi.mock("../../core/context", () => ({
  useEditor: () => ({
    project: { name: () => "TEST_PROJECT" },
    engine: { engineStatus: () => "idle" },
    dispatcher: { dispatch: dispatchMock },
  }),
}));

const TEST_PROJECT_REGEX = /TEST_PROJECT/;
const RUN_REGEX = /Run/;

describe("Header", () => {
  beforeEach(() => {
    dispatchMock.mockClear();
  });

  it("when rendered, displays the app title", () => {
    const { getByText } = render(() => <Header />);
    expect(getByText(TEST_PROJECT_REGEX)).toBeTruthy();
  });

  it("when settings button clicked, dispatches TOGGLE_OVERLAY action", () => {
    const { getByRole } = render(() => <Header />);
    getByRole("button", { name: "Settings" }).click();
    expect(dispatchMock).toHaveBeenCalledWith({
      type: "TOGGLE_OVERLAY",
      overlayId: "settings",
    });
  });

  it("when share button clicked, dispatches OPEN_OVERLAY action for share", () => {
    const { getByRole } = render(() => <Header />);
    getByRole("button", { name: "Share workspace" }).click();
    expect(dispatchMock).toHaveBeenCalledWith({
      type: "OPEN_OVERLAY",
      overlayId: "share",
    });
  });

  it("when run button clicked, dispatches RUN_CODE action", () => {
    const { getAllByRole } = render(() => <Header />);
    const buttons = getAllByRole("button", { name: RUN_REGEX });
    buttons[0].click();
    expect(dispatchMock).toHaveBeenCalledWith({ type: "RUN_CODE" });
  });

  it("when custom class is provided, merges it", () => {
    const { container } = render(() => <Header class="mb-4" />);
    expect(container.firstElementChild?.className).toContain("mb-4");
  });
});
