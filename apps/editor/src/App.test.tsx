import { render } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";
import App from "./App.tsx";

vi.mock("./core/context", () => ({
  useEditor: () => ({
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
