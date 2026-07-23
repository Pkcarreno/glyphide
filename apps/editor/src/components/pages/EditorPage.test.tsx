import { render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EditorPage from "./EditorPage.tsx";

vi.spyOn(console, "info").mockImplementation(() => undefined);

const dispatchMock = vi.fn();
let mockStatus = "idle";
const [mockIsOpen, setMockIsOpen] = createSignal(false);

vi.mock("../../core/context", () => ({
  useEditor: () => ({
    buffer: {
      content: () => "",
      cursorPosition: () => ({
        column: 1,
        line: 1,
        selectionLength: 0,
        selectionLines: 0,
      }),
    },
    dispatcher: { dispatch: dispatchMock },
    engine: {
      activeEngineId: () => "quickjs",
      activeInitParams: () => ({}),
      activeLanguage: () => "javascript",
      engineStatus: () => mockStatus,
      isDirty: () => false,
    },
    engineRegistry: {
      getDefinition: () => ({ paramDescriptors: [] }),
    },
    notifications: {
      activeToasts: () => [],
      items: () => [],
      unreadCount: () => 0,
    },
    output: { entries: () => [] },
    overlays: { isOpen: (id: string) => id === "settings" && mockIsOpen() },
    project: { displayName: () => "TEST_PROJECT", name: () => "TEST_PROJECT" },
    pwa: { applyUpdate: vi.fn(), updateAvailable: () => false },
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
    trust: { isTrustRequired: () => false },
  }),
}));

const TEST_PROJECT_REGEX = /TEST_PROJECT/;

describe("EditorPage", () => {
  beforeEach(() => {
    dispatchMock.mockClear();
    mockStatus = "idle";
    setMockIsOpen(false);
    dispatchMock.mockImplementation((action) => {
      if (action.type === "TOGGLE_OVERLAY" && action.overlayId === "settings") {
        setMockIsOpen(!mockIsOpen());
      }
    });
  });

  it("when rendered, displays the full application layout", () => {
    const { getByText, getByRole } = render(() => <EditorPage />);

    expect(getByText(TEST_PROJECT_REGEX)).toBeTruthy();
    expect(getByText("Output")).toBeTruthy();
    expect(getByText("idle")).toBeTruthy();
    expect(getByRole("main")).toBeTruthy();
  });
});
