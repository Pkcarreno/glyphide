import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EngineSettingsPopover } from "./EngineSettingsPopover.tsx";

const dispatchMock = vi.fn();
const activeInitParamsMock = vi.fn(() => ({ timeout: 1000 }));

vi.mock("../../core/context.tsx", () => ({
  useEditor: () => ({
    dispatcher: { dispatch: dispatchMock },
    engine: {
      activeEngineId: () => "mock-engine",
      activeInitParams: activeInitParamsMock,
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
      }),
    },
    overlays: {
      isOpen: (id: string) => id === "engine-settings",
    },
  }),
}));

afterEach(() => {
  cleanup();
  dispatchMock.mockClear();
  activeInitParamsMock.mockClear();
});

describe("EngineSettingsPopover", () => {
  it("renders popover with form when open", () => {
    render(() => <EngineSettingsPopover />);
    expect(screen.queryByText("Timeout (s)")).not.toBeNull();
  });

  it("dispatches UPDATE_ENGINE_CONFIG when unmounted/closed", () => {
    const { unmount } = render(() => <EngineSettingsPopover />);

    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "2" } });

    unmount();

    expect(dispatchMock).toHaveBeenCalledWith({
      type: "UPDATE_ENGINE_CONFIG",
      patch: { timeout: 2000 },
    });
  });
});
