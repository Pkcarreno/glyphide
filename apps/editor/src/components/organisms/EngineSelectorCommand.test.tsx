import { cleanup, fireEvent, render, waitFor } from "@solidjs/testing-library";
import { createMemo, createRoot, createSignal, flush } from "solid-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EngineSelectorCommand } from "./EngineSelectorCommand.tsx";

const mockSelectEngine = vi.fn();
const mockCloseOverlay = vi.fn();
const mockOpenOverlay = vi.fn();
const [mockIsOpen, setMockIsOpen] = createSignal(false);
const [mockEngineId, setMockEngineId] = createSignal("quickjs");
const [mockLanguage, setMockLanguage] = createSignal("javascript");

interface MockEngineValue {
  engineId: string;
  language: string;
}

let engineResolver:
  | ((entry: MockEngineValue) => MockEngineValue | Promise<MockEngineValue>)
  | null = null;
let disposeRoot: (() => void) | null = null;

function createEngineAccessor() {
  let memo!: ReturnType<typeof createMemo<MockEngineValue>>;
  createRoot((dispose) => {
    disposeRoot = dispose;
    memo = createMemo<MockEngineValue>(() => {
      const entry = {
        engineId: mockEngineId(),
        language: mockLanguage(),
      };
      return engineResolver ? engineResolver(entry) : entry;
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

vi.mock("../../core/engine/registry", async (importOriginal) => {
  const actual = (await importOriginal()) as object;
  return {
    ...actual,
    getEngineEntries: () => [
      {
        engineId: "quickjs",
        label: "QuickJS — JavaScript",
        language: "javascript",
      },
      {
        engineId: "mock",
        label: "Mock Engine — Plaintext",
        language: "plaintext",
      },
    ],
  };
});

vi.mock("../../core/context", () => ({
  useEditor: () => ({
    commands: { selectEngine: mockSelectEngine },
    engine: {
      activeEngineId: () => mockEngineId(),
      activeLanguage: () => mockLanguage(),
      engine: currentEngineMemo,
    },
    engineRegistry: {},
    overlays: {
      close: mockCloseOverlay,
      isOpen: (id: string) => id === "engine-selector" && mockIsOpen(),
      open: mockOpenOverlay,
    },
  }),
}));

describe("EngineSelectorCommand", () => {
  beforeEach(() => {
    mockSelectEngine.mockClear();
    mockCloseOverlay.mockClear();
    mockOpenOverlay.mockClear();
    setMockIsOpen(false);
    setMockEngineId("quickjs");
    setMockLanguage("javascript");
    engineResolver = null;
    disposeRoot?.();
    flush();
    currentEngineMemo = createEngineAccessor();
  });

  afterEach(() => {
    cleanup();
    disposeRoot?.();
  });

  it("when core.overlays is false, command menu is not in the DOM", () => {
    const { queryByRole } = render(() => <EngineSelectorCommand />);
    expect(queryByRole("dialog")).toBeNull();
  });

  it("renders dynamic entries from getEngineEntries", () => {
    setMockIsOpen(true);
    const { getByRole, getByText } = render(() => <EngineSelectorCommand />);
    expect(getByRole("dialog")).toBeTruthy();
    expect(getByText("QuickJS — JavaScript")).toBeTruthy();
    expect(getByText("Mock Engine — Plaintext")).toBeTruthy();
  });

  it("calls commands.selectEngine with correct language and closes overlay", () => {
    setMockIsOpen(true);
    const { getByText } = render(() => <EngineSelectorCommand />);

    fireEvent.click(getByText("Mock Engine — Plaintext"));

    expect(mockSelectEngine).toHaveBeenCalledWith("mock", "plaintext");
    expect(mockCloseOverlay).toHaveBeenCalledWith("engine-selector");
  });

  it("renders spinner on the target engine item derived from isPending during switch", async () => {
    const switchDeferred = createDeferred<MockEngineValue>();
    engineResolver = (entry) =>
      entry.engineId === "mock" ? switchDeferred.promise : entry;
    currentEngineMemo = createEngineAccessor();

    setMockIsOpen(true);
    const { getByText, queryByLabelText } = render(() => (
      <EngineSelectorCommand />
    ));

    expect(queryByLabelText("Initializing engine")).toBeNull();

    setMockEngineId("mock");
    setMockLanguage("plaintext");
    flush();

    const spinner = queryByLabelText("Initializing engine");
    expect(spinner).toBeTruthy();
    expect(
      getByText("Mock Engine — Plaintext").parentElement?.contains(spinner)
    ).toBe(true);

    switchDeferred.resolve({ engineId: "mock", language: "plaintext" });

    await waitFor(() => {
      expect(queryByLabelText("Initializing engine")).toBeNull();
    });
  });

  it("renders spinner via Loading fallback during initial engine load", () => {
    const initDeferred = createDeferred<MockEngineValue>();
    engineResolver = () => initDeferred.promise;
    currentEngineMemo = createEngineAccessor();

    setMockIsOpen(true);
    const { getByText, queryByLabelText } = render(() => (
      <EngineSelectorCommand />
    ));

    const spinner = queryByLabelText("Initializing engine");
    expect(spinner).toBeTruthy();
    expect(
      getByText("QuickJS — JavaScript").parentElement?.contains(spinner)
    ).toBe(true);

    initDeferred.resolve({ engineId: "quickjs", language: "javascript" });
  });
});
