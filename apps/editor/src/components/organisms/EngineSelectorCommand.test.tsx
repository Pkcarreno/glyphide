import { render, fireEvent } from "@solidjs/testing-library";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { EngineSelectorCommand } from "./EngineSelectorCommand";
import { createSignal } from "solid-js";

const dispatchMock = vi.fn();
const [mockIsOpen, setMockIsOpen] = createSignal(false);

vi.mock("../../core/context", () => ({
  useEditor: () => ({
    dispatcher: { dispatch: dispatchMock },
    overlays: {
      isOpen: (id: string) => id === "engine-selector" && mockIsOpen()
    }
  })
}));

describe("EngineSelectorCommand", () => {
  beforeEach(() => {
    dispatchMock.mockClear();
    setMockIsOpen(false);
  });


  it("when core.overlays is false, command menu is not in the DOM", () => {
    const { queryByRole } = render(() => <EngineSelectorCommand />);
    expect(queryByRole("dialog")).toBeNull();
  });

  it("when core.overlays is true, command menu is rendered with options", () => {
    setMockIsOpen(true);
    const { getByRole, getByText, getByPlaceholderText } = render(() => <EngineSelectorCommand />);
    expect(getByRole("dialog")).toBeTruthy();
    expect(getByPlaceholderText("Select execution engine...")).toBeTruthy();
    expect(getByText("QuickJS Engine")).toBeTruthy();
    expect(getByText("Mock Test Engine")).toBeTruthy();
  });

  it("when quickjs is selected, fires dispatcher SELECT_ENGINE and closes overlay", () => {
    setMockIsOpen(true);
    const { getByText } = render(() => <EngineSelectorCommand />);

    fireEvent.click(getByText("QuickJS Engine"));

    expect(dispatchMock).toHaveBeenCalledWith({ type: "SELECT_ENGINE", engineId: "quickjs" });
    expect(dispatchMock).toHaveBeenCalledWith({ type: "CLOSE_OVERLAY", overlayId: "engine-selector" });
  });

  it("when mock is selected, fires dispatcher SELECT_ENGINE and closes overlay", () => {
    setMockIsOpen(true);
    const { getByText } = render(() => <EngineSelectorCommand />);

    fireEvent.click(getByText("Mock Test Engine"));

    expect(dispatchMock).toHaveBeenCalledWith({ type: "SELECT_ENGINE", engineId: "mock" });
    expect(dispatchMock).toHaveBeenCalledWith({ type: "CLOSE_OVERLAY", overlayId: "engine-selector" });
  });
});
