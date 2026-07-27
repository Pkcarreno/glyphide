import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TrustRequiredModal } from "./TrustRequiredModal.tsx";

const dispatchMock = vi.fn();
const [mockIsOpen, setMockIsOpen] = createSignal(false);

const SHARED_CODE_REGEX = /shared code/i;
const UNKNOWN_SOURCE_REGEX = /unknown source/i;
const DENY_REGEX = /deny/i;

vi.mock("../../core/context", () => ({
  useEditor: () => ({
    dispatcher: { dispatch: dispatchMock },
    overlays: {
      isOpen: (id: string) => id === "trust-required" && mockIsOpen(),
    },
  }),
}));

describe("TrustRequiredModal", () => {
  beforeEach(() => {
    dispatchMock.mockClear();
    setMockIsOpen(false);
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("when overlay is closed, dialog is not in the DOM", () => {
    const { queryByRole } = render(() => <TrustRequiredModal />);
    expect(queryByRole("dialog")).toBeNull();
  });

  it("when overlay is open, displays Trust Required dialog", () => {
    setMockIsOpen(true);
    const { getByRole, getByText } = render(() => <TrustRequiredModal />);
    expect(getByRole("dialog")).toBeTruthy();
    expect(getByText("Trust Required")).toBeTruthy();
  });

  it("displays warning about shared code from unknown source", () => {
    setMockIsOpen(true);
    const { getByText } = render(() => <TrustRequiredModal />);
    expect(getByText(SHARED_CODE_REGEX)).toBeTruthy();
    expect(getByText(UNKNOWN_SOURCE_REGEX)).toBeTruthy();
  });

  it("has a Trust button that dispatches GRANT_TRUST", () => {
    setMockIsOpen(true);
    const { getByText } = render(() => <TrustRequiredModal />);
    const button = getByText("Trust");
    fireEvent.click(button);
    expect(dispatchMock).toHaveBeenCalledWith({ type: "GRANT_TRUST" });
  });

  it("has a Deny button that dispatches CLOSE_OVERLAY", () => {
    setMockIsOpen(true);
    const { getByRole } = render(() => <TrustRequiredModal />);
    const denyBtn = getByRole("button", { name: DENY_REGEX });
    fireEvent.click(denyBtn);
    expect(dispatchMock).toHaveBeenCalledWith({
      overlayId: "trust-required",
      type: "CLOSE_OVERLAY",
    });
  });

  it("when preventBackdropClose is set, clicking backdrop does not close dialog", () => {
    setMockIsOpen(true);
    const { container, getByRole } = render(() => <TrustRequiredModal />);
    expect(getByRole("dialog")).toBeTruthy();

    // Find the backdrop overlay (aria-hidden button rendered by DialogOverlay)
    const overlay = container.querySelector('[aria-hidden="true"]');
    expect(overlay).not.toBeNull();
    if (overlay) {
      overlay.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    }

    // Dialog should still be in the DOM — preventBackdropClose blocked dismissal
    expect(getByRole("dialog")).toBeTruthy();
    // CLOSE_OVERLAY should NOT have been dispatched
    expect(dispatchMock).not.toHaveBeenCalledWith({
      overlayId: "trust-required",
      type: "CLOSE_OVERLAY",
    });
  });
});
