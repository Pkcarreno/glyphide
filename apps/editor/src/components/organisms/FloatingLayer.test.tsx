import { cleanup, render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FloatingLayer } from "./FloatingLayer.tsx";

const [mockIsOpen, setMockIsOpen] = createSignal(false);

vi.mock("../../core/context", () => ({
  useEditor: () => ({
    settings: {
      settings: {
        theme: "system",
        isWordWrapEnabled: false,
        isAutoRunEnabled: false,
        isClearOnRunEnabled: true,
      },
      updateSettings: vi.fn(),
    },
    dispatcher: { dispatch: vi.fn() },
    overlays: {
      isOpen: (id: string) => id === "settings" && mockIsOpen(),
    },
    notifications: {
      unreadCount: () => 0,
      items: () => [],
      activeToasts: () => [],
    },
  }),
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
