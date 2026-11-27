import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@solidjs/testing-library";
import {
  affects,
  createMemo,
  createRoot,
  createSignal,
  flush,
  refresh,
} from "solid-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EngineSettingsModal } from "./EngineSettingsModal.tsx";

const updateEngineConfigMock = vi.fn();
const retryEngineInitMock = vi.fn();
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

interface MockParamDescriptor {
  inputProps?: Record<string, unknown>;
  inputType?: "compact-number" | "text";
  isEditable: boolean;
  key: string;
  label: string;
  toModel?: (val: unknown) => unknown;
  toView?: (val: unknown) => unknown;
}

const DEFAULT_PARAM_DESCRIPTORS: MockParamDescriptor[] = [
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
];

let currentParamDescriptors: MockParamDescriptor[] = DEFAULT_PARAM_DESCRIPTORS;

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
    commands: {
      retryEngineInit: () => {
        retryEngineInitMock();
        affects(currentEngineMemo);
        return refresh(currentEngineMemo).catch(() => undefined);
      },
    },
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
        paramDescriptors: currentParamDescriptors,
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
  currentParamDescriptors = DEFAULT_PARAM_DESCRIPTORS;
  setMockIsBlocked(false);
  setMockIsRunning(false);
  flush();
  currentEngineMemo = createEngineAccessor();
  updateEngineConfigMock.mockClear();
  retryEngineInitMock.mockClear();
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

describe("EngineSettingsForm accessibility and editability", () => {
  beforeEach(() => {
    setMockIsOpen(true);
    setMockIsBlocked(false);
    setMockIsRunning(false);
    flush();
  });

  afterEach(cleanup);

  it("renders editable inputs and Apply button when engine is ready without status text", () => {
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

  it("wires inputAriaLabel and matching createUniqueId() IDs to StepperInput and text inputs", () => {
    currentParamDescriptors = [
      ...DEFAULT_PARAM_DESCRIPTORS,
      {
        inputType: "text",
        isEditable: true,
        key: "tag",
        label: "Tag",
      },
    ];

    render(() => <EngineSettingsModal />);

    const timeoutLabel = screen.getByText("Timeout (s)") as HTMLLabelElement;
    const timeoutInput = screen.getByRole("spinbutton") as HTMLInputElement;
    expect(timeoutInput.getAttribute("aria-label")).toBe("Timeout (s)");
    expect(timeoutLabel.htmlFor).toBeTruthy();
    expect(timeoutLabel.htmlFor).toBe(timeoutInput.id);
    expect(timeoutLabel.control).toBe(timeoutInput);
    expect(screen.getByLabelText("Timeout (s)")).toBe(timeoutInput);

    const retriesLabel = screen.getByText("Retries") as HTMLLabelElement;
    const retriesInput = screen.getByLabelText("Retries") as HTMLInputElement;
    expect(retriesLabel.htmlFor).toBeTruthy();
    expect(retriesLabel.htmlFor).toBe(retriesInput.id);
    expect(retriesLabel.control).toBe(retriesInput);

    const tagLabel = screen.getByText("Tag") as HTMLLabelElement;
    const tagInput = screen.getByLabelText("Tag") as HTMLInputElement;
    expect(tagLabel.htmlFor).toBeTruthy();
    expect(tagLabel.htmlFor).toBe(tagInput.id);
    expect(tagLabel.control).toBe(tagInput);
    expect(tagInput.id).not.toBe(timeoutInput.id);
    expect(retriesInput.id).not.toBe(timeoutInput.id);

    const onTimeoutClick = vi.fn();
    timeoutInput.addEventListener("click", onTimeoutClick);
    fireEvent.click(timeoutLabel);
    expect(onTimeoutClick).toHaveBeenCalledOnce();

    const onTagClick = vi.fn();
    tagInput.addEventListener("click", onTagClick);
    fireEvent.click(tagLabel);
    expect(onTagClick).toHaveBeenCalledOnce();
  });
});

describe("EngineSettingsStatus variants and transitions", () => {
  beforeEach(() => {
    setMockIsOpen(true);
    setMockIsBlocked(false);
    setMockIsRunning(false);
    flush();
  });

  afterEach(cleanup);

  it("renders blocked status without editable form when engine is blocked", () => {
    setMockIsBlocked(true);
    flush();
    render(() => <EngineSettingsModal />);

    expect(
      screen.getByText(
        "The engine initializes when you grant trust. Parameters can be modified once initialized."
      )
    ).toBeTruthy();
    expect(screen.queryByRole("spinbutton")).toBeNull();
    expect(screen.queryByRole("button", { name: "Apply" })).toBeNull();
  });

  it("renders loading status without editable form when engine is initializing", () => {
    const deferred = createDeferred<MockEngineData | null>();
    engineResolver = () => deferred.promise;
    currentEngineMemo = createEngineAccessor();

    render(() => <EngineSettingsModal />);

    expect(
      screen.getByText("The engine is initializing. Please wait...")
    ).toBeTruthy();
    expect(screen.queryByRole("spinbutton")).toBeNull();
    expect(screen.queryByRole("button", { name: "Apply" })).toBeNull();

    deferred.resolve(null);
  });

  it("renders loading status without editable form during held refresh", async () => {
    let deferred: ReturnType<
      typeof createDeferred<MockEngineData | null>
    > | null = null;
    engineResolver = () => {
      if (deferred) {
        return deferred.promise;
      }
      return {
        engineId: "mock-engine",
        initParams: { retries: 3, timeout: 5000 },
        language: "plaintext",
      };
    };
    currentEngineMemo = createEngineAccessor();

    render(() => <EngineSettingsModal />);
    expect(screen.getByRole("spinbutton")).toBeTruthy();

    deferred = createDeferred<MockEngineData | null>();
    affects(currentEngineMemo);
    void refresh(currentEngineMemo);
    flush();

    expect(
      screen.getByText("The engine is initializing. Please wait...")
    ).toBeTruthy();
    expect(screen.queryByRole("spinbutton")).toBeNull();
    expect(screen.queryByRole("button", { name: "Apply" })).toBeNull();

    deferred.resolve({
      engineId: "mock-engine",
      initParams: { retries: 3, timeout: 5000 },
      language: "plaintext",
    });

    await waitFor(() => {
      expect(screen.getByRole("spinbutton")).toBeTruthy();
    });
  });

  it("renders running status without editable form when engine is running", () => {
    setMockIsRunning(true);
    flush();
    render(() => <EngineSettingsModal />);

    expect(
      screen.getByText(
        "The engine is currently running. Stop execution to modify parameters."
      )
    ).toBeTruthy();
    expect(screen.queryByRole("spinbutton")).toBeNull();
    expect(screen.queryByRole("button", { name: "Apply" })).toBeNull();
  });

  it("renders uninitialized status without editable form when engine is null", () => {
    engineResolver = () => null;
    currentEngineMemo = createEngineAccessor();

    render(() => <EngineSettingsModal />);

    expect(
      screen.getByText(
        "The engine initializes when you run code. Parameters can be modified once initialized."
      )
    ).toBeTruthy();
    expect(screen.queryByRole("spinbutton")).toBeNull();
    expect(screen.queryByRole("button", { name: "Apply" })).toBeNull();
  });

  it("renders error status with retry button and recovers when retried", async () => {
    let shouldFail: boolean;
    shouldFail = true;
    engineResolver = () => {
      if (shouldFail) {
        return Promise.reject(new Error("Init failed"));
      }
      return {
        engineId: "mock-engine",
        initParams: { retries: 3, timeout: 5000 },
        language: "plaintext",
      };
    };
    currentEngineMemo = createEngineAccessor();

    render(() => <EngineSettingsModal />);

    await waitFor(() => {
      expect(
        screen.getByText(
          "Engine initialization failed. Retry to modify parameters."
        )
      ).toBeTruthy();
    });
    expect(screen.queryByRole("spinbutton")).toBeNull();
    expect(screen.queryByRole("button", { name: "Apply" })).toBeNull();

    shouldFail = false;
    const retryButton = screen.getByRole("button", { name: "Retry" });
    fireEvent.click(retryButton);

    expect(retryEngineInitMock).toHaveBeenCalledOnce();

    await waitFor(() => {
      expect(screen.getByRole("spinbutton")).toBeTruthy();
      expect(screen.getByRole("button", { name: "Apply" })).toBeTruthy();
    });
    expect(
      screen.queryByText(
        "Engine initialization failed. Retry to modify parameters."
      )
    ).toBeNull();
  });

  it("transition: blocked → ready switches from status to editable form", () => {
    setMockIsBlocked(true);
    flush();
    render(() => <EngineSettingsModal />);

    expect(
      screen.getByText(
        "The engine initializes when you grant trust. Parameters can be modified once initialized."
      )
    ).toBeTruthy();
    expect(screen.queryByRole("spinbutton")).toBeNull();

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

  it("transition: ready → running switches from editable form to status", () => {
    render(() => <EngineSettingsModal />);

    const inputReady = screen.getByRole("spinbutton") as HTMLInputElement;
    expect(inputReady.disabled).toBe(false);

    setMockIsRunning(true);
    flush();

    expect(screen.queryByRole("spinbutton")).toBeNull();
    expect(
      screen.getByText(
        "The engine is currently running. Stop execution to modify parameters."
      )
    ).toBeTruthy();
  });
});
