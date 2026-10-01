import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TrustRequiredModal } from "./TrustRequiredModal.tsx";

const mockGrantTrust = vi.fn();
const mockClose = vi.fn();
const mockOpen = vi.fn();
const [mockIsOpen, setMockIsOpen] = createSignal(false);

const SHARED_CODE_REGEX = /shared code/i;
const UNKNOWN_SOURCE_REGEX = /unknown source/i;
const DENY_REGEX = /deny/i;

vi.mock("../../core/context", () => ({
  useEditor: () => ({
    commands: {
      grantTrust: mockGrantTrust,
    },
    overlays: {
      close: mockClose,
      isOpen: (id: string) => id === "trust-required" && mockIsOpen(),
      open: mockOpen,
    },
  }),
}));

describe("TrustRequiredModal", () => {
  beforeEach(() => {
    mockGrantTrust.mockClear();
    mockClose.mockClear();
    mockOpen.mockClear();
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

  it("has a Trust button that calls commands.grantTrust", () => {
    setMockIsOpen(true);
    const { getByText } = render(() => <TrustRequiredModal />);
    const button = getByText("Trust");
    fireEvent.click(button);
    expect(mockGrantTrust).toHaveBeenCalled();
  });

  it("has a Deny button that closes overlay", () => {
    setMockIsOpen(true);
    const { getByRole } = render(() => <TrustRequiredModal />);
    const denyBtn = getByRole("button", { name: DENY_REGEX });
    fireEvent.click(denyBtn);
    expect(mockClose).toHaveBeenCalledWith("trust-required");
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
    expect(mockClose).not.toHaveBeenCalledWith("trust-required");
  });
});
