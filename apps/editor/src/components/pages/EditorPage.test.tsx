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
        line: 1,
        column: 1,
        selectionLength: 0,
        selectionLines: 0,
      }),
    },
    project: { name: () => "TEST_PROJECT", displayName: () => "TEST_PROJECT" },
    engine: {
      engineStatus: () => mockStatus,
      activeEngineId: () => "quickjs",
      activeLanguage: () => "javascript",
      isDirty: () => false,
      activeInitParams: () => ({}),
    },
    engineRegistry: {
      getDefinition: () => ({ paramDescriptors: [] }),
    },
    output: { entries: () => [] },
    settings: {
      settings: {
        theme: "system",
        isWordWrapEnabled: false,
        isAutoRunEnabled: false,
        isClearOnRunEnabled: true,
        uiFontSize: 14,
        bufferFontSize: 15,
        bufferLineHeight: 1.3,
      },
    },
    dispatcher: { dispatch: dispatchMock },
    overlays: { isOpen: (id: string) => id === "settings" && mockIsOpen() },
    trust: { isTrustRequired: () => false },
    pwa: { updateAvailable: () => false, applyUpdate: vi.fn() },
    notifications: {
      unreadCount: () => 0,
      items: () => [],
      activeToasts: () => [],
    },
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
