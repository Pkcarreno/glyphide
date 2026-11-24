import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@solidjs/testing-library";
import { createMemo, createRoot, createSignal, flush } from "solid-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EngineSettingsModal } from "./EngineSettingsModal.tsx";

const updateEngineConfigMock = vi.fn();
const openOverlayMock = vi.fn();
const closeOverlayMock = vi.fn();
const [mockIsOpen, setMockIsOpen] = createSignal(false);
const [mockIsBlocked, setMockIsBlocked] = createSignal(false);
const [mockIsRunning, setMockIsRunning] = createSignal(false);

interface MockEngineData {
  engineId: string;
  initParams: Record<string, unknown>;
  language: string;
}

let engineResolver:
  | (() => MockEngineData | null | Promise<MockEngineData | null>)
  | null = null;
let disposeRoot: (() => void) | null = null;

function createEngineAccessor() {
  let memo!: ReturnType<typeof createMemo<MockEngineData | null>>;
  createRoot((dispose) => {
    disposeRoot = dispose;
    memo = createMemo<MockEngineData | null>(() => {
      if (engineResolver) {
        return engineResolver();
      }
      if (mockIsBlocked()) {
        return null;
      }
      return {
        engineId: "mock-engine",
        initParams: { retries: 3, timeout: 5000 },
        language: "plaintext",
      };
    });
  });
  return memo;
}

let currentEngineMemo = createEngineAccessor();

function createDeferred<T>() {
  let resolvePromise!: (value: T) => void;
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });
  return { promise, resolve: resolvePromise };
}

vi.mock("../../core/context.tsx", () => ({
  useEditor: () => ({
    engine: {
      activeEngineId: () => "mock-engine",
      activeInitParams: () => ({ retries: 3, timeout: 5000 }),
      engine: currentEngineMemo,
      executionState: () => 0,
      isBlocked: () => mockIsBlocked(),
      isRunning: () => mockIsRunning(),
      updateEngineConfig: updateEngineConfigMock,
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
      close: closeOverlayMock,
      isOpen: (id: string) => id === "engine-settings" && mockIsOpen(),
      open: openOverlayMock,
    },
  }),
}));

afterEach(() => {
  cleanup();
  disposeRoot?.();
  engineResolver = null;
  setMockIsBlocked(false);
  setMockIsRunning(false);
  flush();
  currentEngineMemo = createEngineAccessor();
  updateEngineConfigMock.mockClear();
  openOverlayMock.mockClear();
  closeOverlayMock.mockClear();
});

describe("EngineSettingsModal", () => {
  beforeEach(() => {
    setMockIsOpen(false);
    setMockIsBlocked(false);
    setMockIsRunning(false);
    flush();
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
    setMockIsBlocked(false);
    setMockIsRunning(false);
    flush();
    updateEngineConfigMock.mockClear();
    openOverlayMock.mockClear();
    closeOverlayMock.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it("clicking Apply updates engine config with correct patch and closes overlay", () => {
    render(() => <EngineSettingsModal />);

    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "2" } });

    const applyButton = screen.getByRole("button", { name: "Apply" });
    fireEvent.click(applyButton);

    expect(updateEngineConfigMock).toHaveBeenCalledWith({
      retries: 3,
      timeout: 2000,
    });
    expect(closeOverlayMock).toHaveBeenCalledWith("engine-settings");
  });

  it("closing dialog without clicking Apply does NOT update engine config", () => {
    render(() => <EngineSettingsModal />);

    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "3" } });

    const closeButton = screen.getByRole("button", {
      name: "Close engine settings",
    });
    fireEvent.click(closeButton);

    expect(updateEngineConfigMock).not.toHaveBeenCalled();
    expect(closeOverlayMock).toHaveBeenCalledWith("engine-settings");
  });

  it("closing via Escape key does NOT update engine config", () => {
    render(() => <EngineSettingsModal />);

    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "5" } });

    const dialog = screen.getByRole("dialog");
    fireEvent.keyDown(dialog, { key: "Escape" });

    expect(updateEngineConfigMock).not.toHaveBeenCalled();
  });
});

describe("EngineSettingsModal ready-state gate", () => {
  beforeEach(() => {
    setMockIsOpen(true);
    setMockIsBlocked(false);
    setMockIsRunning(false);
    flush();
    updateEngineConfigMock.mockClear();
    openOverlayMock.mockClear();
    closeOverlayMock.mockClear();
  });

  afterEach(cleanup);

  it("disables all inputs and Apply button when engine is blocked", () => {
    setMockIsBlocked(true);
    flush();
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
        "The engine initializes when you grant trust. Parameters can be modified once initialized."
      )
    ).toBeTruthy();
  });

  it("disables all inputs and Apply button when engine is initializing", () => {
    const deferred = createDeferred<MockEngineData | null>();
    engineResolver = () => deferred.promise;
    currentEngineMemo = createEngineAccessor();

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

    deferred.resolve(null);
  });

  it("disables all inputs and Apply button when engine is running", () => {
    setMockIsRunning(true);
    flush();
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

  it("disables all inputs and Apply button when engine fails to initialize", async () => {
    engineResolver = () => Promise.reject(new Error("Init failed"));
    currentEngineMemo = createEngineAccessor();

    render(() => <EngineSettingsModal />);

    await waitFor(() => {
      expect(
        screen.getByText(
          "Engine initialization failed. Retry to modify parameters."
        )
      ).toBeTruthy();
    });

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
  });

  it("enables editable inputs and Apply button when engine is ready", () => {
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
    render(() => <EngineSettingsModal />);

    const retriesInput = screen.getByLabelText("Retries") as HTMLInputElement;
    expect(retriesInput.disabled).toBe(true);
  });

  it("transition: blocked → ready enables inputs and hides message", () => {
    setMockIsBlocked(true);
    flush();
    render(() => <EngineSettingsModal />);

    const inputBlocked = screen.getByRole("spinbutton") as HTMLInputElement;
    expect(inputBlocked.disabled).toBe(true);
    expect(
      screen.getByText(
        "The engine initializes when you grant trust. Parameters can be modified once initialized."
      )
    ).toBeTruthy();

    setMockIsBlocked(false);
    flush();

    const inputReady = screen.getByRole("spinbutton") as HTMLInputElement;
    expect(inputReady.disabled).toBe(false);
    expect(
      screen.queryByText(
        "The engine initializes when you grant trust. Parameters can be modified once initialized."
      )
    ).toBeNull();
  });

  it("transition: ready → running disables inputs and shows message", () => {
    render(() => <EngineSettingsModal />);

    const inputReady = screen.getByRole("spinbutton") as HTMLInputElement;
    expect(inputReady.disabled).toBe(false);

    setMockIsRunning(true);
    flush();

    const inputRunning = screen.getByRole("spinbutton") as HTMLInputElement;
    expect(inputRunning.disabled).toBe(true);
    expect(
      screen.getByText(
        "The engine is currently running. Stop execution to modify parameters."
      )
    ).toBeTruthy();
  });
});
