import { render } from "@solidjs/testing-library";
import { describe, expect, it, vi, beforeEach } from "vitest";
import EditorPage from "./EditorPage";

vi.stubGlobal("alert", vi.fn());

const dispatchMock = vi.fn();
let mockStatus = "idle";

vi.mock("../../core/context", () => ({
  useEditor: () => ({
    buffer: { content: () => "" },
    project: { name: () => "TEST_PROJECT" },
    engine: { status: () => mockStatus, activeEngineId: () => "quickjs" },
    output: { entries: () => [] },
    settings: { settings: { theme: "system", isWordWrapEnabled: false, isAutoRunEnabled: false, isClearOnRunEnabled: true } },
    dispatcher: { dispatch: dispatchMock }
  })
}));

describe("EditorPage", () => {
  beforeEach(() => {
    dispatchMock.mockClear();
    mockStatus = "idle";
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

  it("when rendered, displays the full application layout", () => {
    const { getByText, getByRole } = render(() => <EditorPage />);

    expect(getByText("[ TEST_PROJECT ]")).toBeTruthy();
    expect(getByText("Output")).toBeTruthy();
    expect(getByText("idle")).toBeTruthy();
    expect(getByRole("main")).toBeTruthy();
  });

  it("when settings button is clicked, modal opens", () => {
    const { queryByRole, getByLabelText } = render(() => <EditorPage />);

    expect(queryByRole("dialog")).toBeNull();
    getByLabelText("Settings").click();
    expect(queryByRole("dialog")).toBeTruthy();
  });

  it("when run button is clicked, dispatches RUN_CODE", () => {
    const { getAllByRole } = render(() => <EditorPage />);

    const runButtons = getAllByRole("button", { name: /Run/ });
    runButtons[0].click();

    expect(dispatchMock).toHaveBeenCalledWith({ type: "RUN_CODE" });
  });
});
