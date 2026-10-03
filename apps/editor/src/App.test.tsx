import { render } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";
import App from "./App.tsx";

vi.mock("./core/context", () => ({
  useEditor: () => ({
    commands: {
      downloadBufferToFile: vi.fn(),
      grantTrust: vi.fn(),
      interruptExecution: vi.fn(),
      loadFile: vi.fn(),
      resetProjectState: vi.fn(),
      retryEngineInit: vi.fn(),
      runCode: vi.fn(),
      selectEngine: vi.fn(),
      updateBuffer: vi.fn(),
    },
    engine: {
      activeEngineId: () => "quickjs",
      activeInitParams: () => ({}),
      activeLanguage: () => "javascript",
      engineStatus: () => "idle",
      isDirty: () => false,
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
      close: vi.fn(),
      isOpen: () => false,
      open: vi.fn(),
      toggle: vi.fn(),
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

vi.mock("./components/atoms/CodeField/CodeField.tsx", () => ({
  CodeField: () => <div data-testid="code-field-stub" />,
}));

const TEST_PROJECT_REGEX = /TEST_PROJECT/;

describe("App", () => {
  it("renders the EditorPage component", () => {
    const { getByText } = render(() => <App />);
    expect(getByText(TEST_PROJECT_REGEX)).toBeTruthy();
  });

  it("renders the CodeField stub instead of instantiating CodeMirror", () => {
    const { getByTestId } = render(() => <App />);
    expect(getByTestId("code-field-stub")).toBeTruthy();
  });
});
