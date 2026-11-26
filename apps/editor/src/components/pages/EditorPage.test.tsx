import { cleanup, render } from "@solidjs/testing-library";
import { createSignal, flush } from "solid-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import EditorPage from "./EditorPage.tsx";

vi.spyOn(console, "info").mockImplementation(() => undefined);

vi.mock("../atoms/CodeField/CodeField.tsx", () => ({
  CodeField: (props: { isDark?: boolean }) => (
    <div
      data-dark={String(Boolean(props.isDark))}
      data-testid="code-field-stub"
    />
  ),
}));

const toggleOverlayMock = vi.fn((id: string) => {
  if (id === "settings") {
    setMockIsOpen(!mockIsOpen());
  }
});
const openOverlayMock = vi.fn();
const closeOverlayMock = vi.fn();
const [mockIsOpen, setMockIsOpen] = createSignal(false);
const [mockResolvedTheme, setMockResolvedTheme] = createSignal<
  "light" | "dark"
>("light");

vi.mock("../../core/context", () => ({
  useEditor: () => ({
    commands: {
      downloadBufferToFile: vi.fn(),
      grantTrust: vi.fn(),
      interruptExecution: vi.fn(),
      loadFile: vi.fn(),
      resetProjectState: vi.fn(),
      retryEngineInit: vi.fn(),
      runCode: vi.fn(),
      runState: () => 0,
      selectEngine: vi.fn(),
      updateBuffer: vi.fn(),
    },
    engine: {
      activeEngineId: () => "quickjs",
      activeInitParams: () => ({}),
      activeLanguage: () => "javascript",
      engine: () => ({
        capabilities: {
          id: "quickjs",
          isInterruptible: true,
          isStateful: true,
          supportedLanguages: ["javascript"],
        },
        engineId: "quickjs",
        initParams: { language: "javascript" },
        language: "javascript",
      }),
      executionState: () => 0,
      isBlocked: () => false,
      isDirty: () => false,
      isRunning: () => false,
      updateEngineConfig: vi.fn(),
    },
    engineRegistry: {
      getDefinition: () => ({ paramDescriptors: [] }),
    },
    notifications: {
      activeToasts: () => [],
      dismissToast: vi.fn(),
      items: () => [],
      unreadCount: () => 0,
    },
    output: {
      clearEntries: vi.fn(),
      entries: () => [],
      reportWorkerDropped: vi.fn(),
      stats: () => ({
        bufferDropped: 0,
        totalDropped: 0,
        workerDropped: 0,
      }),
    },
    overlays: {
      close: closeOverlayMock,
      isOpen: (id: string) => id === "settings" && mockIsOpen(),
      open: openOverlayMock,
      toggle: toggleOverlayMock,
    },
    pwa: { applyUpdate: vi.fn(), updateAvailable: () => false },
    session: {
      code: () => "",
      cursorPosition: () => ({
        column: 1,
        line: 1,
        selectionLength: 0,
        selectionLines: 0,
      }),
      displayName: () => "TEST_PROJECT",
      isTrustRequired: () => false,
      isUrlShareable: () => true,
      projectName: () => "TEST_PROJECT",
      setCursorPosition: vi.fn(),
      setProjectName: vi.fn(),
    },
    settings: {
      resolvedTheme: () => mockResolvedTheme(),
      settings: {
        bufferFontSize: 15,
        bufferLineHeight: 1.3,
        isAutoRunEnabled: false,
        isClearOnRunEnabled: true,
        isWordWrapEnabled: false,
        theme: "system",
        uiFontSize: 14,
      },
    },
    shortcuts: {
      getBinding: () => undefined,
    },
  }),
}));

const TEST_PROJECT_REGEX = /TEST_PROJECT/u;

describe("EditorPage", () => {
  beforeEach(() => {
    toggleOverlayMock.mockClear();
    openOverlayMock.mockClear();
    closeOverlayMock.mockClear();
    setMockIsOpen(false);
    setMockResolvedTheme("light");
    document.documentElement.classList.remove("dark");
  });

  afterEach(() => {
    cleanup();
    document.documentElement.classList.remove("dark");
  });

  it("when rendered, displays the full application layout", () => {
    const { getByText, getByRole } = render(() => <EditorPage />);

    expect(getByText(TEST_PROJECT_REGEX)).toBeTruthy();
    expect(getByText("Output")).toBeTruthy();
    expect(getByText("ready")).toBeTruthy();
    expect(getByRole("main")).toBeTruthy();
  });

  it("syncs document root dark class and CodeField isDark prop when resolvedTheme changes", () => {
    const { getByTestId } = render(() => <EditorPage />);

    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(getByTestId("code-field-stub").getAttribute("data-dark")).toBe(
      "false"
    );

    setMockResolvedTheme("dark");
    flush();

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(getByTestId("code-field-stub").getAttribute("data-dark")).toBe(
      "true"
    );

    setMockResolvedTheme("light");
    flush();

    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(getByTestId("code-field-stub").getAttribute("data-dark")).toBe(
      "false"
    );
  });
});
