import { render, cleanup } from "@solidjs/testing-library";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { FloatingLayer } from "./FloatingLayer";
import { createSignal } from "solid-js";

const [mockIsOpen, setMockIsOpen] = createSignal(false);

vi.mock("../../core/context", () => ({
  useEditor: () => ({
    settings: {
      settings: {
        theme: "system",
        isWordWrapEnabled: false,
        isAutoRunEnabled: false,
        isClearOnRunEnabled: true
      },
      updateSettings: vi.fn()
    },
    dispatcher: { dispatch: vi.fn() },
    overlays: {
      isOpen: (id: string) => id === "settings" && mockIsOpen()
    }
  })
}));

describe("FloatingLayer", () => {
  beforeEach(() => {
    setMockIsOpen(false);
  });

  afterEach(() => {
    cleanup();
  });

  it("when rendered and settings overlay is closed, dialog is null", () => {
    const { queryByRole } = render(() => <FloatingLayer />);
    expect(queryByRole("dialog")).toBeNull();
  });

  it("when rendered and settings overlay is open, displays SettingsModal", () => {
    setMockIsOpen(true);
    const { getByRole, getByText } = render(() => <FloatingLayer />);
    expect(getByRole("dialog")).toBeTruthy();
    expect(getByText("Settings")).toBeTruthy();
  });
});
