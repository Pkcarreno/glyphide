import { render } from "@solidjs/testing-library";
import { beforeAll, describe, expect, it, vi } from "vitest";
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
    project: { name: () => "TEST_PROJECT" },
    engine: {
      engineStatus: () => "idle",
      activeEngineId: () => "quickjs",
      activeLanguage: () => "javascript",
    },
    output: { entries: () => [] },
    settings: {
      settings: {
        theme: "system",
        isWordWrapEnabled: false,
        isAutoRunEnabled: false,
        isClearOnRunEnabled: true,
      },
    },
    dispatcher: { dispatch: vi.fn() },
    overlays: { isOpen: () => false },
    notifications: {
      unreadCount: () => 0,
      items: () => [],
      activeToasts: () => [],
    },
  }),
}));

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

const TEST_PROJECT_REGEX = /TEST_PROJECT/;

describe("App", () => {
  it("renders the EditorPage component", () => {
    const { getByText } = render(() => <App />);
    expect(getByText(TEST_PROJECT_REGEX)).toBeTruthy();
  });
});
