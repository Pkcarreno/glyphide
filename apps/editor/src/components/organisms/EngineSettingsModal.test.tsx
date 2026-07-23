import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EngineSettingsModal } from "./EngineSettingsModal.tsx";

const dispatchMock = vi.fn();
const [mockIsOpen, setMockIsOpen] = createSignal(false);
const [mockEngineStatus, setMockEngineStatus] = createSignal("ready");

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
      activeInitParams: () => ({ retries: 3, timeout: 5000 }),
      engineStatus: () => mockEngineStatus(),
    },
    engineRegistry: {
      getDefinition: () => ({
        defaultInitParams: {},
        paramDescriptors: [
          {
            inputProps: { max: 120, min: 1, step: 1 },
            inputType: "compact-number",
            isEditable: true,
            key: "timeout",
            label: "Timeout (s)",
            toModel: (val: unknown) => Number(val) * 1000,
            toView: (val: unknown) => Number(val) / 1000,
          },
          {
            inputType: "text",
            isEditable: false,
            key: "retries",
            label: "Retries",
          },
        ],
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
    setMockEngineStatus("ready");
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
    setMockEngineStatus("ready");
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
      patch: { retries: 3, timeout: 2000 },
      type: "UPDATE_ENGINE_CONFIG",
    });
    expect(dispatchMock).toHaveBeenCalledWith({
      overlayId: "engine-settings",
      type: "CLOSE_OVERLAY",
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
      overlayId: "engine-settings",
      type: "CLOSE_OVERLAY",
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

describe("EngineSettingsModal ready-state gate", () => {
  beforeEach(() => {
    setMockIsOpen(true);
    setMockEngineStatus("ready");
    dispatchMock.mockClear();
  });

  afterEach(cleanup);

  it("disables all inputs and Apply button when engine is idle", () => {
    setMockEngineStatus("idle");
    render(() => <EngineSettingsModal />);

    const input = screen.getByRole("spinbutton") as HTMLInputElement;
    expect(input.disabled).toBe(true);
    const decreaseBtn = screen.getByLabelText("Decrease") as HTMLButtonElement;
    const increaseBtn = screen.getByLabelText("Increase") as HTMLButtonElement;
    expect(decreaseBtn.disabled).toBe(true);
    expect(increaseBtn.disabled).toBe(true);
    const retriesInput = screen.getByLabelText("Retries") as HTMLInputElement;
    expect(retriesInput.disabled).toBe(true);
    expect(
      (screen.getByRole("button", { name: "Apply" }) as HTMLButtonElement)
        .disabled
    ).toBe(true);
    expect(
      screen.getByText(
        "The engine initializes when you run code. Parameters can be modified once initialized."
      )
    ).toBeTruthy();
  });

  it("disables all inputs and Apply button when engine is initializing", () => {
    setMockEngineStatus("initializing");
    render(() => <EngineSettingsModal />);

    const input = screen.getByRole("spinbutton") as HTMLInputElement;
    expect(input.disabled).toBe(true);
    const decreaseBtn = screen.getByLabelText("Decrease") as HTMLButtonElement;
    const increaseBtn = screen.getByLabelText("Increase") as HTMLButtonElement;
    expect(decreaseBtn.disabled).toBe(true);
    expect(increaseBtn.disabled).toBe(true);
    const retriesInput = screen.getByLabelText("Retries") as HTMLInputElement;
    expect(retriesInput.disabled).toBe(true);
    expect(
      (screen.getByRole("button", { name: "Apply" }) as HTMLButtonElement)
        .disabled
    ).toBe(true);
    expect(
      screen.getByText("The engine is initializing. Please wait...")
    ).toBeTruthy();
  });

  it("disables all inputs and Apply button when engine is running", () => {
    setMockEngineStatus("running");
    render(() => <EngineSettingsModal />);

    const input = screen.getByRole("spinbutton") as HTMLInputElement;
    expect(input.disabled).toBe(true);
    const decreaseBtn = screen.getByLabelText("Decrease") as HTMLButtonElement;
    const increaseBtn = screen.getByLabelText("Increase") as HTMLButtonElement;
    expect(decreaseBtn.disabled).toBe(true);
    expect(increaseBtn.disabled).toBe(true);
    const retriesInput = screen.getByLabelText("Retries") as HTMLInputElement;
    expect(retriesInput.disabled).toBe(true);
    expect(
      (screen.getByRole("button", { name: "Apply" }) as HTMLButtonElement)
        .disabled
    ).toBe(true);
    expect(
      screen.getByText(
        "The engine is currently running. Stop execution to modify parameters."
      )
    ).toBeTruthy();
  });

  it("disables all inputs and Apply button when engine is in error", () => {
    setMockEngineStatus("error");
    render(() => <EngineSettingsModal />);

    const input = screen.getByRole("spinbutton") as HTMLInputElement;
    expect(input.disabled).toBe(true);
    const decreaseBtn = screen.getByLabelText("Decrease") as HTMLButtonElement;
    const increaseBtn = screen.getByLabelText("Increase") as HTMLButtonElement;
    expect(decreaseBtn.disabled).toBe(true);
    expect(increaseBtn.disabled).toBe(true);
    const retriesInput = screen.getByLabelText("Retries") as HTMLInputElement;
    expect(retriesInput.disabled).toBe(true);
    expect(
      (screen.getByRole("button", { name: "Apply" }) as HTMLButtonElement)
        .disabled
    ).toBe(true);
    expect(
      screen.getByText(
        "Engine initialization failed. Retry to modify parameters."
      )
    ).toBeTruthy();
  });

  it("enables editable inputs and Apply button when engine is ready", () => {
    setMockEngineStatus("ready");
    render(() => <EngineSettingsModal />);

    const input = screen.getByRole("spinbutton") as HTMLInputElement;
    expect(input.disabled).toBe(false);
    const decreaseBtn = screen.getByLabelText("Decrease") as HTMLButtonElement;
    const increaseBtn = screen.getByLabelText("Increase") as HTMLButtonElement;
    expect(decreaseBtn.disabled).toBe(false);
    expect(increaseBtn.disabled).toBe(false);
    expect(
      (screen.getByRole("button", { name: "Apply" }) as HTMLButtonElement)
        .disabled
    ).toBe(false);
    expect(
      screen.queryByText(
        "The engine initializes when you run code. Parameters can be modified once initialized."
      )
    ).toBeNull();
    expect(
      screen.queryByText("The engine is initializing. Please wait...")
    ).toBeNull();
    expect(
      screen.queryByText(
        "The engine is currently running. Stop execution to modify parameters."
      )
    ).toBeNull();
    expect(
      screen.queryByText(
        "Engine initialization failed. Retry to modify parameters."
      )
    ).toBeNull();
  });

  it("isEditable:false input stays disabled even when engine is ready", () => {
    setMockEngineStatus("ready");
    render(() => <EngineSettingsModal />);

    const retriesInput = screen.getByLabelText("Retries") as HTMLInputElement;
    expect(retriesInput.disabled).toBe(true);
  });

  it("isEditable:true input is disabled when engine is NOT ready (gate overrides)", () => {
    setMockEngineStatus("idle");
    render(() => <EngineSettingsModal />);

    const input = screen.getByRole("spinbutton") as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });

  it("transition: idle → ready enables inputs and hides message", () => {
    setMockEngineStatus("idle");
    const { unmount: unmount1 } = render(() => <EngineSettingsModal />);

    const inputIdle = screen.getByRole("spinbutton") as HTMLInputElement;
    expect(inputIdle.disabled).toBe(true);
    expect(
      screen.getByText(
        "The engine initializes when you run code. Parameters can be modified once initialized."
      )
    ).toBeTruthy();

    unmount1();
    setMockEngineStatus("ready");
    render(() => <EngineSettingsModal />);

    const inputReady = screen.getByRole("spinbutton") as HTMLInputElement;
    expect(inputReady.disabled).toBe(false);
    expect(
      screen.queryByText(
        "The engine initializes when you run code. Parameters can be modified once initialized."
      )
    ).toBeNull();
  });

  it("transition: ready → running disables inputs and shows message", () => {
    setMockEngineStatus("ready");
    const { unmount: unmount1 } = render(() => <EngineSettingsModal />);

    const inputReady = screen.getByRole("spinbutton") as HTMLInputElement;
    expect(inputReady.disabled).toBe(false);
    expect(
      screen.queryByText(
        "The engine is currently running. Stop execution to modify parameters."
      )
    ).toBeNull();

    unmount1();
    setMockEngineStatus("running");
    render(() => <EngineSettingsModal />);

    const inputRunning = screen.getByRole("spinbutton") as HTMLInputElement;
    expect(inputRunning.disabled).toBe(true);
    expect(
      screen.getByText(
        "The engine is currently running. Stop execution to modify parameters."
      )
    ).toBeTruthy();
  });
});
