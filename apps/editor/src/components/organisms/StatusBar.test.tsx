import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@solidjs/testing-library";
import {
  action,
  affects,
  createMemo,
  createRoot,
  createSignal,
  flush,
  refresh,
} from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StatusBar } from "./StatusBar.tsx";

const { mockCursorPositionFn, retryEngineInitMock, openOverlayMock } =
  vi.hoisted(() => ({
    mockCursorPositionFn: vi.fn(() => ({
      column: 5,
      line: 1,
      selectionLength: 0,
      selectionLines: 0,
    })),
    openOverlayMock: vi.fn(),
    retryEngineInitMock: vi.fn(),
  }));

interface MockEngineEntry {
  engineId: string;
  language: string;
}

const [mockEngineId, setMockEngineId] = createSignal("quickjs");
const [mockLanguage, setMockLanguage] = createSignal("javascript");
const [mockIsRunning, setMockIsRunning] = createSignal(false);
const [mockIsDirty, setMockIsDirty] = createSignal(false);
const [mockIsBlocked, setMockIsBlocked] = createSignal(false);
const [mockRunState, setMockRunState] = createSignal(0);
const [mockExecutionState, setMockExecutionState] = createSignal(0);
let engineResolver:
  | ((
      entry: MockEngineEntry
    ) => MockEngineEntry | null | Promise<MockEngineEntry | null>)
  | null = null;
let disposeRoot: (() => void) | null = null;

const createEngineAccessor = () => {
  let memo!: ReturnType<typeof createMemo<MockEngineEntry | null>>;
  createRoot((dispose) => {
    disposeRoot = dispose;
    memo = createMemo<MockEngineEntry | null>(() => {
      const entry = {
        engineId: mockEngineId(),
        language: mockLanguage(),
      };
      if (engineResolver) {
        return engineResolver(entry);
      }
      if (mockIsBlocked()) {
        return null;
      }
      return entry;
    });
  });
  return memo;
};

let currentEngineMemo = createEngineAccessor();

function createDeferred<T>() {
  let resolvePromise!: (value: T) => void;
  let rejectPromise!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolvePromise = res;
    rejectPromise = rej;
  });
  return { promise, reject: rejectPromise, resolve: resolvePromise };
}

vi.mock("../../core/context.tsx", () => ({
  useEditor: () => ({
    commands: {
      retryEngineInit: () => {
        retryEngineInitMock();
        affects(currentEngineMemo);
        return refresh(currentEngineMemo).catch(() => undefined);
      },
      runState: () => mockRunState(),
    },
    engine: {
      activeEngineId: () => mockEngineId(),
      activeLanguage: () => mockLanguage(),
      engine: currentEngineMemo,
      executionState: () => mockExecutionState(),
      isBlocked: () => mockIsBlocked(),
      isDirty: () => mockIsDirty(),
      isRunning: () => mockIsRunning(),
    },
    engineRegistry: {
      getDefinition: () => ({ paramDescriptors: [] }),
    },
    notifications: {
      activeToasts: () => [],
      items: () => [],
      unreadCount: () => 0,
    },
    overlays: {
      isOpen: () => false,
      open: openOverlayMock,
    },
    session: {
      code: () => "line1\nline2",
      cursorPosition: mockCursorPositionFn,
    },
    shortcuts: {
      getBinding: () => undefined,
    },
  }),
}));

afterEach(() => {
  cleanup();
  disposeRoot?.();
  engineResolver = null;
  setMockEngineId("quickjs");
  setMockLanguage("javascript");
  setMockIsRunning(false);
  setMockIsDirty(false);
  setMockIsBlocked(false);
  flush();
  currentEngineMemo = createEngineAccessor();
  mockCursorPositionFn.mockReturnValue({
    column: 5,
    line: 1,
    selectionLength: 0,
    selectionLines: 0,
  });
  retryEngineInitMock.mockClear();
  openOverlayMock.mockClear();
});

const JS_REGEX = /javascript/iu;
const PYTHON_REGEX = /^python$/iu;

describe("StatusBar", () => {
  it("when rendered with defaults, shows ready status", () => {
    const { getByText } = render(() => <StatusBar />);
    expect(getByText("ready")).toBeTruthy();
  });

  it("when initial engine computation is pending, shows Loading fallback with initializing and spinner", () => {
    const deferred = createDeferred<MockEngineEntry | null>();
    engineResolver = () => deferred.promise;
    currentEngineMemo = createEngineAccessor();

    const { container, getByText } = render(() => <StatusBar />);
    expect(getByText("initializing")).toBeTruthy();
    expect(container.textContent).toContain("⠋");

    deferred.resolve({ engineId: "quickjs", language: "javascript" });
  });

  it("when engine is blocked, displays blocked status", () => {
    setMockIsBlocked(true);
    flush();
    const { getByText } = render(() => <StatusBar />);
    expect(getByText("blocked")).toBeTruthy();
  });

  it("when running is true, displays running status", () => {
    setMockIsRunning(true);
    flush();
    const { getByText } = render(() => <StatusBar />);
    expect(getByText("running")).toBeTruthy();
  });

  it("binds braille spinner and running status to action isPending and settles on success", async () => {
    const deferred = createDeferred<void>();
    const runAction = action(function* () {
      setMockRunState((state) => state + 1);
      setMockExecutionState((state) => state + 1);
      yield deferred.promise;
    });

    const { container, getByText } = render(() => <StatusBar />);
    expect(getByText("ready")).toBeTruthy();

    const runPromise = runAction();
    flush();

    expect(getByText("running")).toBeTruthy();
    expect(container.textContent).toContain("⠋");

    deferred.resolve();
    await runPromise;
    flush();

    await waitFor(() => {
      expect(getByText("ready")).toBeTruthy();
      expect(container.textContent).not.toContain("⠋");
    });
  });

  it("stops braille animation and returns to ready when action rejects", async () => {
    const deferred = createDeferred<void>();
    const runAction = action(function* () {
      setMockRunState((state) => state + 1);
      setMockExecutionState((state) => state + 1);
      try {
        yield deferred.promise;
      } catch {
        // Settle cleanly on error
      }
    });

    const { container, getByText } = render(() => <StatusBar />);

    const runPromise = runAction();
    flush();

    expect(getByText("running")).toBeTruthy();
    expect(container.textContent).toContain("⠋");

    deferred.reject(new Error("Execution failed"));
    await runPromise;
    flush();

    await waitFor(() => {
      expect(getByText("ready")).toBeTruthy();
      expect(container.textContent).not.toContain("⠋");
    });
  });

  it("holds previous engine UI state and shows isPending spinner until switched engine resolves", async () => {
    const switchDeferred = createDeferred<MockEngineEntry | null>();
    engineResolver = (entry) => {
      if (entry.engineId === "micropython") {
        return switchDeferred.promise;
      }
      return entry;
    };
    currentEngineMemo = createEngineAccessor();

    const { container, getByText } = render(() => <StatusBar />);
    expect(getByText("ready")).toBeTruthy();
    expect(getByText("quickjs")).toBeTruthy();
    expect(getByText(JS_REGEX)).toBeTruthy();

    setMockEngineId("micropython");
    setMockLanguage("python");
    flush();

    // UI holds previous engine/language while isPending displays initializing + spinner
    expect(getByText("initializing")).toBeTruthy();
    expect(container.textContent).toContain("⠋");
    expect(getByText("quickjs")).toBeTruthy();
    expect(getByText(JS_REGEX)).toBeTruthy();

    switchDeferred.resolve({ engineId: "micropython", language: "python" });

    await waitFor(() => {
      expect(getByText("ready")).toBeTruthy();
      expect(getByText("micropython")).toBeTruthy();
      expect(getByText(PYTHON_REGEX)).toBeTruthy();
    });
  });

  it("when isDirty is true, displays the EXECUTION STALE badge", () => {
    setMockIsDirty(true);
    flush();
    const { getByText } = render(() => <StatusBar />);
    expect(getByText("Execution Stale")).toBeTruthy();
  });

  it("when rendered, displays hardcoded environment info", () => {
    const { getByText } = render(() => <StatusBar />);
    expect(getByText(JS_REGEX)).toBeTruthy();
    expect(getByText("1:5", { exact: false })).toBeTruthy();
  });

  it("when there is a selection, displays the selection lines and length", () => {
    mockCursorPositionFn.mockReturnValue({
      column: 10,
      line: 2,
      selectionLength: 42,
      selectionLines: 4,
    });

    const { getByText } = render(() => <StatusBar />);
    expect(getByText("2:10", { exact: false })).toBeTruthy();
    expect(getByText("(4l, 42c)", { exact: false })).toBeTruthy();
  });

  it("when custom class is provided, merges it", () => {
    const { container } = render(() => <StatusBar class="mt-auto" />);
    expect(container.firstElementChild?.className).toContain("mt-auto");
  });
});

describe("StatusBar.Item", () => {
  it("when rendered, displays children", () => {
    const { getByText } = render(() => (
      <StatusBar.Item>Line 42</StatusBar.Item>
    ));
    expect(getByText("Line 42")).toBeTruthy();
  });

  it("when rendered, applies flexbox and padding classes", () => {
    const { container } = render(() => (
      <StatusBar.Item>Content</StatusBar.Item>
    ));
    const el = container.firstElementChild;
    expect(el).not.toBeNull();
    expect(el?.className).toContain("flex");
    expect(el?.className).toContain("items-center");
    expect(el?.className).toContain("px-1.5");
  });

  it("when custom class is provided, merges with defaults", () => {
    const { container } = render(() => (
      <StatusBar.Item class="ml-2">Content</StatusBar.Item>
    ));
    const el = container.firstElementChild;
    expect(el).not.toBeNull();
    expect(el?.className).toContain("ml-2");
    expect(el?.className).toContain("flex");
  });
});

describe("StatusBar.Button", () => {
  it("when rendered, renders a native button element", () => {
    const { getByRole } = render(() => (
      <StatusBar.Button>Click</StatusBar.Button>
    ));
    expect(getByRole("button").tagName).toBe("BUTTON");
  });

  it("when clicked, fires onClick handler", () => {
    const handler = vi.fn();
    const { getByRole } = render(() => (
      <StatusBar.Button onClick={handler}>Click</StatusBar.Button>
    ));
    getByRole("button").click();
    expect(handler).toHaveBeenCalledOnce();
  });

  it("when rendered without tooltip, does not inject tooltip in the DOM", () => {
    const { queryByRole } = render(() => (
      <StatusBar.Button>No tip</StatusBar.Button>
    ));
    expect(queryByRole("tooltip")).toBeNull();
  });

  it("when rendered with tooltip and hovered, shows tooltip popup", () => {
    const { getByRole } = render(() => (
      <StatusBar.Button tooltip="Help text">Hover me</StatusBar.Button>
    ));
    expect(screen.queryByRole("tooltip")).toBeNull();
    fireEvent.mouseEnter(getByRole("button"));
    expect(screen.queryByRole("tooltip")).not.toBeNull();
    expect(screen.queryByRole("tooltip")?.textContent).toContain("Help text");
  });

  it("when rendered with tooltip and shortcut, shows shortcut in popup", () => {
    const { getByRole } = render(() => (
      <StatusBar.Button tooltip="Save" tooltipShortcut="⌘S">
        Save
      </StatusBar.Button>
    ));
    fireEvent.mouseEnter(getByRole("button"));
    const popup = screen.queryByRole("tooltip");
    expect(popup).not.toBeNull();
    expect(popup?.textContent).toContain("⌘S");
  });

  it("when rendered with tooltip and description, shows description in popup", () => {
    const { getByRole } = render(() => (
      <StatusBar.Button
        tooltip="Engine"
        tooltipDescription="Select the execution engine"
      >
        QuickJS
      </StatusBar.Button>
    ));
    fireEvent.mouseEnter(getByRole("button"));
    const popup = screen.queryByRole("tooltip");
    expect(popup).not.toBeNull();
    expect(popup?.textContent).toContain("Select the execution engine");
  });

  it("when rendered with hover classes, applies them", () => {
    const { getByRole } = render(() => (
      <StatusBar.Button>Styled</StatusBar.Button>
    ));
    const btn = getByRole("button");
    expect(btn.className).toContain("cursor-pointer");
    expect(btn.className).toContain("transition-colors");
  });

  it("when custom class is provided, merges with defaults", () => {
    const { getByRole } = render(() => (
      <StatusBar.Button class="gap-2">Custom</StatusBar.Button>
    ));
    const btn = getByRole("button");
    expect(btn.className).toContain("gap-2");
    expect(btn.className).toContain("rounded-md");
  });

  it("reactively switches between plain button and tooltip button when tooltip changes", () => {
    const [tooltip, setTooltip] = createSignal("");
    const { getByRole } = render(() => (
      <StatusBar.Button tooltip={tooltip()}>Toggle tip</StatusBar.Button>
    ));

    fireEvent.mouseEnter(getByRole("button"));
    expect(screen.queryByRole("tooltip")).toBeNull();

    setTooltip("Reactive help");
    flush();

    fireEvent.mouseEnter(getByRole("button"));
    const popup = screen.queryByRole("tooltip");
    expect(popup).not.toBeNull();
    expect(popup?.textContent).toContain("Reactive help");
  });
});

describe("StatusBar - Errored boundary & Mobile Visibility", () => {
  it("when ready status, engine selector has hidden md:block class for mobile visibility toggle", () => {
    const { container } = render(() => <StatusBar />);

    const engineSelectorBtn = Array.from(
      container.querySelectorAll("button")
    ).find((btn) => btn.textContent?.includes(mockEngineId()));
    expect(engineSelectorBtn).toBeTruthy();

    const parentItem = engineSelectorBtn?.closest(".hidden");
    expect(parentItem).toBeTruthy();
  });

  it("when ready status, engine settings has hidden md:block class for mobile visibility toggle", () => {
    const { container } = render(() => <StatusBar />);

    const engineSettingsBtn = container.querySelector(
      "#engine-settings-trigger"
    );
    expect(engineSettingsBtn).toBeTruthy();

    const wrapper = engineSettingsBtn?.closest(".hidden");
    expect(wrapper).toBeTruthy();
  });

  it("when engine initialization fails, Errored boundary renders error status and retry button", async () => {
    engineResolver = () => Promise.reject(new Error("WASM load failed"));
    currentEngineMemo = createEngineAccessor();

    const { container, getByText } = render(() => <StatusBar />);

    await waitFor(() => {
      expect(getByText("error")).toBeTruthy();
    });

    const buttons = container.querySelectorAll("button");
    const retryBtn = Array.from(buttons).find((btn) =>
      btn.querySelector("svg")?.classList.contains("text-red-500")
    );
    expect(retryBtn).toBeTruthy();

    const engineSettingsBtn = container.querySelector(
      "#engine-settings-trigger"
    );
    expect(engineSettingsBtn).toBeFalsy();
  });

  it("clicking retry button triggers retryEngineInit and recovers Errored boundary via refresh", async () => {
    let shouldFail: boolean;
    shouldFail = true;
    engineResolver = (entry) =>
      shouldFail ? Promise.reject(new Error("WASM load failed")) : entry;
    currentEngineMemo = createEngineAccessor();

    const { container, getByText } = render(() => <StatusBar />);

    await waitFor(() => {
      expect(getByText("error")).toBeTruthy();
    });

    shouldFail = false;
    const buttons = container.querySelectorAll("button");
    const retryBtn = Array.from(buttons).find((btn) =>
      btn.querySelector("svg")?.classList.contains("text-red-500")
    );
    expect(retryBtn).toBeDefined();
    if (retryBtn) {
      fireEvent.click(retryBtn);
    }

    expect(retryEngineInitMock).toHaveBeenCalledOnce();

    await waitFor(() => {
      expect(getByText("ready")).toBeTruthy();
      expect(container.querySelector("#engine-settings-trigger")).toBeTruthy();
    });
  });

  it("clicking engine selector button opens engine-selector overlay", () => {
    const { container } = render(() => <StatusBar />);
    const engineSelectorBtn = Array.from(
      container.querySelectorAll("button")
    ).find((btn) => btn.textContent?.includes(mockEngineId()));
    expect(engineSelectorBtn).toBeDefined();
    if (engineSelectorBtn) {
      fireEvent.click(engineSelectorBtn);
    }
    expect(openOverlayMock).toHaveBeenCalledWith("engine-selector");
  });

  it("clicking engine settings button opens engine-settings overlay", () => {
    const { container } = render(() => <StatusBar />);
    const engineSettingsBtn = container.querySelector(
      "#engine-settings-trigger"
    );
    expect(engineSettingsBtn).toBeDefined();
    if (engineSettingsBtn) {
      fireEvent.click(engineSettingsBtn);
    }
    expect(openOverlayMock).toHaveBeenCalledWith("engine-settings");
  });
});
