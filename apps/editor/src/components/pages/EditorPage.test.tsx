import { render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EditorPage from "./EditorPage.tsx";

vi.spyOn(console, "info").mockImplementation(() => undefined);

vi.mock("../atoms/CodeField/CodeField.tsx", () => ({
  CodeField: () => <div data-testid="code-field-stub" />,
}));

const toggleOverlayMock = vi.fn((id: string) => {
  if (id === "settings") {
    setMockIsOpen(!mockIsOpen());
  }
});
const openOverlayMock = vi.fn();
const closeOverlayMock = vi.fn();
let mockStatus = "idle";
const [mockIsOpen, setMockIsOpen] = createSignal(false);

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
      selectEngine: vi.fn(),
      updateBuffer: vi.fn(),
    },
    engine: {
      activeEngineId: () => "quickjs",
      activeInitParams: () => ({}),
      activeLanguage: () => "javascript",
      engineStatus: () => mockStatus,
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

const TEST_PROJECT_REGEX = /TEST_PROJECT/;

describe("EditorPage", () => {
  beforeEach(() => {
    toggleOverlayMock.mockClear();
    openOverlayMock.mockClear();
    closeOverlayMock.mockClear();
    mockStatus = "idle";
    setMockIsOpen(false);
  });

  it("when rendered, displays the full application layout", () => {
    const { getByText, getByRole } = render(() => <EditorPage />);

    expect(getByText(TEST_PROJECT_REGEX)).toBeTruthy();
    expect(getByText("Output")).toBeTruthy();
    expect(getByText("idle")).toBeTruthy();
    expect(getByRole("main")).toBeTruthy();
  });
});
