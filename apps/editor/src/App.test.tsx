import { render } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";
import App from "./App.tsx";

vi.mock("./core/context", () => ({
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
    dispatcher: { dispatch: vi.fn() },
    engine: {
      activeEngineId: () => "quickjs",
      activeInitParams: () => ({}),
      activeLanguage: () => "javascript",
      engineStatus: () => "idle",
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
    overlays: { isOpen: () => false },
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
