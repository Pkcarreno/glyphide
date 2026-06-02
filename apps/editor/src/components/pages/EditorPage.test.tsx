import { render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EditorPage from "./EditorPage.tsx";

vi.stubGlobal("console", { info: vi.fn() });

const dispatchMock = vi.fn();
let mockStatus = "idle";
const [mockIsOpen, setMockIsOpen] = createSignal(false);

vi.mock("../../core/context", () => ({
  useEditor: () => ({
    buffer: { content: () => "" },
    project: { name: () => "TEST_PROJECT" },
    engine: {
      engineStatus: () => mockStatus,
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
    dispatcher: { dispatch: dispatchMock },
    overlays: { isOpen: (id: string) => id === "settings" && mockIsOpen() },
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

  it("when rendered, displays the full application layout", () => {
    const { getByText, getByRole } = render(() => <EditorPage />);

    expect(getByText(TEST_PROJECT_REGEX)).toBeTruthy();
    expect(getByText("Output")).toBeTruthy();
    expect(getByText("idle")).toBeTruthy();
    expect(getByRole("main")).toBeTruthy();
  });
});
