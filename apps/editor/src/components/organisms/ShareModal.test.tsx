import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ShareModal } from "./ShareModal.tsx";

const dispatchMock = vi.fn();
const [mockIsOpen, setMockIsOpen] = createSignal(false);

vi.mock("../../core/context", () => ({
  useEditor: () => ({
    buffer: {
      content: () => "console.log('hi')",
    },
    dispatcher: { dispatch: dispatchMock },
    engine: {
      activeLanguage: () => "javascript",
    },
    overlays: {
      isOpen: (id: string) => id === "share" && mockIsOpen(),
    },
    project: {
      isUrlShareable: () => true,
      name: () => "TestProject",
    },
  }),
}));

Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});

describe("ShareModal", () => {
  beforeEach(() => {
    dispatchMock.mockClear();
    setMockIsOpen(false);
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("when core.overlays is false, dialog is not in the DOM", () => {
    const { queryByRole } = render(() => <ShareModal />);
    expect(queryByRole("dialog")).toBeNull();
  });

  it("when core.overlays is true, dialog is rendered", () => {
    setMockIsOpen(true);
    const { getByRole, getByText } = render(() => <ShareModal />);
    expect(getByRole("dialog")).toBeTruthy();
    expect(getByText("Share Project")).toBeTruthy();
  });

  it("copies link when Copy Link button is clicked", async () => {
    setMockIsOpen(true);
    const { getByText } = render(() => <ShareModal />);

    const copyBtn = getByText("Copy Link");
    fireEvent.click(copyBtn);

    await Promise.resolve();

    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });

  it("updates URL when Include project name is toggled", () => {
    window.history.replaceState({}, "", "?name=TestProject");
    setMockIsOpen(true);
    const { getByRole } = render(() => <ShareModal />);

    const toggle = getByRole("switch", { name: "Include project name" });
    const input = getByRole("textbox") as HTMLInputElement;

    const urlBefore = input.value;

    fireEvent.click(toggle);

    const urlAfter = input.value;
    expect(urlBefore).not.toBe(urlAfter);
  });

  it("renders a Download as file button in the button row", () => {
    setMockIsOpen(true);
    const { getByText } = render(() => <ShareModal />);
    expect(getByText("Download as file")).toBeTruthy();
  });

  it("when Download as file is clicked, dispatches DOWNLOAD_BUFFER_TO_FILE", () => {
    setMockIsOpen(true);
    const { getByText } = render(() => <ShareModal />);
    fireEvent.click(getByText("Download as file"));
    expect(dispatchMock).toHaveBeenCalledWith({
      type: "DOWNLOAD_BUFFER_TO_FILE",
    });
  });
});
