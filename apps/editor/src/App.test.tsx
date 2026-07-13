import { render } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";
import App from "./App.tsx";

vi.mock("./core/context", () => ({
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
      engineStatus: () => "idle",
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
    dispatcher: { dispatch: vi.fn() },
    overlays: { isOpen: () => false },
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

describe("App", () => {
  it("renders the EditorPage component", () => {
    const { getByText } = render(() => <App />);
    expect(getByText(TEST_PROJECT_REGEX)).toBeTruthy();
  });
});
