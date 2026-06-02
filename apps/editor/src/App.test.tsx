import { describe, expect, it, vi, beforeAll } from "vitest";
import { render } from "@solidjs/testing-library";
import App from "./App";

vi.mock("./core/context", () => ({
  useEditor: () => ({
    buffer: { content: () => "" },
    project: { name: () => "TEST_PROJECT" },
    engine: { engineStatus: () => "idle", activeEngineId: () => "quickjs", activeLanguage: () => "javascript" },
    output: { entries: () => [] },
    settings: { settings: { theme: "system", isWordWrapEnabled: false, isAutoRunEnabled: false, isClearOnRunEnabled: true } },
    dispatcher: { dispatch: vi.fn() },
    overlays: { isOpen: () => false }
  })
}));

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
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

describe("App", () => {
  it("renders the EditorPage component", () => {
    const { getByText } = render(() => <App />);
    expect(getByText(/TEST_PROJECT/)).toBeTruthy();
  });
});
