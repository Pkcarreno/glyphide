import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EngineSettingsModal } from "./EngineSettingsModal.tsx";

const dispatchMock = vi.fn();
const [mockIsOpen, setMockIsOpen] = createSignal(false);

vi.mock("../../core/context.tsx", () => ({
  useEditor: (): {
    dispatcher: { dispatch: typeof dispatchMock };
    engine: {
      activeEngineId: () => string;
      activeInitParams: () => Record<string, unknown>;
      engineStatus: () => string;
    };
    engineRegistry: {
      getDefinition: () => {
        paramDescriptors: Array<{
          key: string;
          label: string;
          isEditable: boolean;
          inputType: string;
          inputProps?: { min?: number; max?: number; step?: number };
          toModel?: (val: unknown) => unknown;
          toView?: (val: unknown) => unknown;
        }>;
        defaultInitParams: Record<string, unknown>;
      };
    };
    overlays: {
      isOpen: (id: string) => boolean;
    };
  } => ({
    dispatcher: { dispatch: dispatchMock },
    engine: {
      activeEngineId: () => "mock-engine",
      activeInitParams: () => ({ timeout: 1000 }),
      engineStatus: () => "ready",
    },
    engineRegistry: {
      getDefinition: () => ({
        paramDescriptors: [
          {
            key: "timeout",
            label: "Timeout (s)",
            isEditable: true,
            inputType: "compact-number",
            inputProps: { min: 1, max: 120, step: 1 },
            toModel: (val: unknown) => Number(val) * 1000,
            toView: (val: unknown) => Number(val) / 1000,
          },
        ],
        defaultInitParams: {},
      }),
    },
    overlays: {
      isOpen: (id: string) => id === "engine-settings" && mockIsOpen(),
    },
  }),
}));

afterEach(() => {
  cleanup();
  dispatchMock.mockClear();
});

describe("EngineSettingsModal", () => {
  beforeEach(() => {
    setMockIsOpen(false);
  });

  it("when core.overlays is false, dialog is not in the DOM", () => {
    const { queryByRole } = render(() => <EngineSettingsModal />);
    expect(queryByRole("dialog")).toBeNull();
  });

  it("when core.overlays is true, dialog is rendered with title", () => {
    setMockIsOpen(true);
    const { getByRole, getByText } = render(() => <EngineSettingsModal />);
    expect(getByRole("dialog")).toBeTruthy();
    expect(getByText("Engine Settings")).toBeTruthy();
  });

  it("has aria-modal attribute for accessibility", () => {
    setMockIsOpen(true);
    const { getByRole } = render(() => <EngineSettingsModal />);
    const dialog = getByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
  });
});

describe("EngineSettingsModal Apply behavior", () => {
  beforeEach(() => {
    setMockIsOpen(true);
    dispatchMock.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it("clicking Apply dispatches UPDATE_ENGINE_CONFIG with correct patch and closes overlay", () => {
    render(() => <EngineSettingsModal />);

    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "2" } });

    const applyButton = screen.getByRole("button", { name: "Apply" });
    fireEvent.click(applyButton);

    expect(dispatchMock).toHaveBeenCalledWith({
      type: "UPDATE_ENGINE_CONFIG",
      patch: { timeout: 2000 },
    });
    expect(dispatchMock).toHaveBeenCalledWith({
      type: "CLOSE_OVERLAY",
      overlayId: "engine-settings",
    });
  });

  it("closing dialog without clicking Apply does NOT dispatch UPDATE_ENGINE_CONFIG", () => {
    render(() => <EngineSettingsModal />);

    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "3" } });

    // Click the DialogClose button (X icon)
    const closeButton = screen.getByRole("button", {
      name: "Close engine settings",
    });
    fireEvent.click(closeButton);

    expect(dispatchMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "UPDATE_ENGINE_CONFIG" })
    );
    expect(dispatchMock).toHaveBeenCalledWith({
      type: "CLOSE_OVERLAY",
      overlayId: "engine-settings",
    });
  });

  it("closing via Escape key does NOT dispatch UPDATE_ENGINE_CONFIG", () => {
    render(() => <EngineSettingsModal />);

    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "5" } });

    // Simulate Escape key
    const dialog = screen.getByRole("dialog");
    fireEvent.keyDown(dialog, { key: "Escape" });

    expect(dispatchMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "UPDATE_ENGINE_CONFIG" })
    );
  });
});
