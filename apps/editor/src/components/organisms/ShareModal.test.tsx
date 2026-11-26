import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ShareModal } from "./ShareModal.tsx";

const mockDownloadBufferToFile = vi.fn().mockResolvedValue(undefined);
const [mockIsOpen, setMockIsOpen] = createSignal(false);

vi.mock("../../core/context", () => ({
  useEditor: () => ({
    commands: { downloadBufferToFile: mockDownloadBufferToFile },
    engine: {
      activeLanguage: () => "javascript",
    },
    overlays: {
      isOpen: (id: string) => id === "share" && mockIsOpen(),
    },
    session: {
      code: () => "console.log('hi')",
      isUrlShareable: () => true,
      projectName: () => "TestProject",
    },
  }),
}));

Object.defineProperty(navigator, "clipboard", {
  configurable: true,
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});

describe("ShareModal", () => {
  beforeEach(() => {
    mockDownloadBufferToFile.mockClear();
    setMockIsOpen(false);
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
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

  it("when Download as file is clicked, calls commands.downloadBufferToFile", () => {
    setMockIsOpen(true);
    const { getByText } = render(() => <ShareModal />);
    fireEvent.click(getByText("Download as file"));
    expect(mockDownloadBufferToFile).toHaveBeenCalled();
  });

  it.each([{ buttonLabel: "Copy Link" }, { buttonLabel: "Copy iframe" }])(
    "clears pending $buttonLabel indicator timer on unmount",
    async ({ buttonLabel }) => {
      vi.useFakeTimers();
      setMockIsOpen(true);
      const { getByText, unmount } = render(() => <ShareModal />);

      fireEvent.click(getByText(buttonLabel));
      await vi.advanceTimersByTimeAsync(0);

      expect(getByText("Copied!")).toBeTruthy();
      expect(vi.getTimerCount()).toBe(1);

      unmount();

      expect(vi.getTimerCount()).toBe(0);
    }
  );

  it.each([{ buttonLabel: "Copy Link" }, { buttonLabel: "Copy iframe" }])(
    "resets $buttonLabel indicator timer on repeated clicks",
    async ({ buttonLabel }) => {
      vi.useFakeTimers();
      setMockIsOpen(true);
      const { getByRole } = render(() => <ShareModal />);

      const button = getByRole("button", { name: buttonLabel });
      fireEvent.click(button);
      await vi.advanceTimersByTimeAsync(0);
      expect(button.textContent).toBe("Copied!");

      await vi.advanceTimersByTimeAsync(1500);
      expect(button.textContent).toBe("Copied!");

      fireEvent.click(button);
      await vi.advanceTimersByTimeAsync(0);

      await vi.advanceTimersByTimeAsync(1000);
      expect(button.textContent).toBe("Copied!");

      await vi.advanceTimersByTimeAsync(1000);
      expect(button.textContent).toBe(buttonLabel);
    }
  );

  it.each([{ buttonLabel: "Copy Link" }, { buttonLabel: "Copy iframe" }])(
    "handles $buttonLabel clipboard rejection without throwing unhandled errors",
    async ({ buttonLabel }) => {
      vi.useFakeTimers();
      vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(
        new Error("Clipboard permission denied")
      );
      setMockIsOpen(true);
      const { getByRole } = render(() => <ShareModal />);

      const button = getByRole("button", { name: buttonLabel });
      fireEvent.click(button);
      await vi.advanceTimersByTimeAsync(0);

      expect(button.textContent).toBe(buttonLabel);
      expect(vi.getTimerCount()).toBe(0);
    }
  );

  it("does not schedule indicator timer when unmounted before clipboard write resolves", async () => {
    vi.useFakeTimers();
    let resolveWrite!: () => void;
    vi.mocked(navigator.clipboard.writeText).mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveWrite = resolve;
        })
    );
    setMockIsOpen(true);
    const { getByRole, unmount } = render(() => <ShareModal />);

    fireEvent.click(getByRole("button", { name: "Copy Link" }));
    unmount();

    resolveWrite();
    await vi.advanceTimersByTimeAsync(0);

    expect(vi.getTimerCount()).toBe(0);
  });
});
