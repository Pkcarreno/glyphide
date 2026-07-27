import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LoadFileModal } from "./LoadFileModal.tsx";

const dispatchMock = vi.fn();
const [mockIsOpen, setMockIsOpen] = createSignal(false);
const mockReadFileFromFile = vi.fn();
const mockBufferContent = vi.fn(() => "");

const EXTENSION_MAP: Record<
  string,
  { engineId: string; language: string } | null
> = {
  ".js": { engineId: "quickjs", language: "javascript" },
  ".py": { engineId: "micropython", language: "python" },
  ".txt": null,
};

const OVERWRITE_RE = /overwrite/i;
const UNSUPPORTED_RE = /unsupported file type/i;

vi.mock("../../core/context", () => ({
  useEditor: () => ({
    buffer: { content: mockBufferContent },
    dispatcher: { dispatch: dispatchMock },
    fileIo: {
      readFile: vi.fn(),
      readFileFromFile: mockReadFileFromFile,
      writeFile: vi.fn(),
    },
    fileLoad: {
      error: () => null,
      pendingFile: () => null,
      resolveEngine: (ext: string) => EXTENSION_MAP[ext] ?? null,
      setError: vi.fn(),
      setPendingFile: vi.fn(),
    },
    overlays: {
      isOpen: (id: string) => id === "load-file" && mockIsOpen(),
    },
  }),
}));

/**
 * Drops a file onto the FileDrop zone inside the modal. jsdom does not
 * carry `dataTransfer` reliably, so we synthesize a minimal shape that
 * the component reads.
 */
function dropFileOnZone(zone: HTMLElement, file: File): void {
  fireEvent.drop(zone, {
    dataTransfer: { files: [file], types: ["Files"] },
  });
}

describe("LoadFileModal", () => {
  beforeEach(() => {
    dispatchMock.mockClear();
    setMockIsOpen(false);
    mockBufferContent.mockReturnValue("");
    mockReadFileFromFile.mockReset();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("when overlay is closed, dialog is not in the DOM", () => {
    const { queryByRole } = render(() => <LoadFileModal />);
    expect(queryByRole("dialog")).toBeNull();
  });

  it("when overlay is open, dialog is rendered with header", () => {
    setMockIsOpen(true);
    const { getByRole, getByText } = render(() => <LoadFileModal />);
    expect(getByRole("dialog")).toBeTruthy();
    expect(getByText("Load Project from File")).toBeTruthy();
  });

  it("renders the FileDrop drop zone and a Cancel button", () => {
    setMockIsOpen(true);
    const { getByTestId, getByText } = render(() => <LoadFileModal />);
    expect(getByTestId("file-drop")).toBeTruthy();
    expect(getByText("Cancel")).toBeTruthy();
  });

  it("Cancel button closes the modal without state changes", () => {
    setMockIsOpen(true);
    const { getByText } = render(() => <LoadFileModal />);
    fireEvent.click(getByText("Cancel"));
    expect(dispatchMock).toHaveBeenCalledWith({
      overlayId: "load-file",
      type: "CLOSE_OVERLAY",
    });
  });

  it("dropping a valid file with empty buffer loads immediately", async () => {
    setMockIsOpen(true);
    mockBufferContent.mockReturnValue("");
    mockReadFileFromFile.mockResolvedValue({
      content: "1",
      extension: ".js",
      name: "x.js",
    });

    const { getByTestId } = render(() => <LoadFileModal />);
    const file = new File(["1"], "x.js");
    dropFileOnZone(getByTestId("file-drop"), file);

    // Wait for the async readFileFromFile promise to settle.
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockReadFileFromFile).toHaveBeenCalledWith(file);
    expect(dispatchMock).toHaveBeenCalledWith({
      content: "1",
      engineId: "quickjs",
      language: "javascript",
      name: "x.js",
      type: "LOAD_FILE_FROM_DISK",
    });
  });

  it("click-to-pick with a valid file through input triggers load", async () => {
    setMockIsOpen(true);
    mockBufferContent.mockReturnValue("");
    mockReadFileFromFile.mockResolvedValue({
      content: "2",
      extension: ".js",
      name: "picked.js",
    });

    const { container } = render(() => <LoadFileModal />);
    const input = container.querySelector(
      "input[type='file']"
    ) as HTMLInputElement;

    const file = new File(["2"], "picked.js");
    Object.defineProperty(input, "files", {
      value: [file],
      writable: false,
    });
    fireEvent.change(input);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockReadFileFromFile).toHaveBeenCalledWith(file);
    expect(dispatchMock).toHaveBeenCalledWith({
      content: "2",
      engineId: "quickjs",
      language: "javascript",
      name: "picked.js",
      type: "LOAD_FILE_FROM_DISK",
    });
  });

  it("dropping a valid file with non-empty buffer shows overwrite confirmation", async () => {
    setMockIsOpen(true);
    mockBufferContent.mockReturnValue("existing");
    mockReadFileFromFile.mockResolvedValue({
      content: "1",
      extension: ".js",
      name: "x.js",
    });

    const { getByTestId, getByText } = render(() => <LoadFileModal />);
    dropFileOnZone(getByTestId("file-drop"), new File(["1"], "x.js"));

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(getByText(OVERWRITE_RE)).toBeTruthy();
    // No direct load before confirmation.
    expect(dispatchMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "LOAD_FILE_FROM_DISK" })
    );
  });

  it("when overwrite is confirmed, dispatches RESET and LOAD_FILE_FROM_DISK", async () => {
    setMockIsOpen(true);
    mockBufferContent.mockReturnValue("existing");
    mockReadFileFromFile.mockResolvedValue({
      content: "1",
      extension: ".js",
      name: "x.js",
    });

    const { getByTestId, getByText } = render(() => <LoadFileModal />);
    dropFileOnZone(getByTestId("file-drop"), new File(["1"], "x.js"));

    await new Promise((resolve) => setTimeout(resolve, 0));

    fireEvent.click(getByText("Overwrite"));

    expect(dispatchMock).toHaveBeenCalledWith({ type: "RESET_PROJECT_STATE" });
    expect(dispatchMock).toHaveBeenCalledWith({
      content: "1",
      engineId: "quickjs",
      language: "javascript",
      name: "x.js",
      type: "LOAD_FILE_FROM_DISK",
    });
    expect(dispatchMock).toHaveBeenCalledWith({
      overlayId: "load-file",
      type: "CLOSE_OVERLAY",
    });
  });

  it("dropping a file with unsupported extension surfaces inline error", async () => {
    setMockIsOpen(true);
    mockReadFileFromFile.mockResolvedValue({
      content: "1",
      extension: ".txt",
      name: "x.txt",
    });

    const { getByTestId, getByRole } = render(() => <LoadFileModal />);
    dropFileOnZone(getByTestId("file-drop"), new File(["1"], "x.txt"));

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(getByRole("alert").textContent).toMatch(UNSUPPORTED_RE);
  });

  it("does not dispatch LOAD_FILE_FROM_DISK for unsupported extension", async () => {
    setMockIsOpen(true);
    mockReadFileFromFile.mockResolvedValue({
      content: "1",
      extension: ".txt",
      name: "x.txt",
    });

    const { getByTestId } = render(() => <LoadFileModal />);
    dropFileOnZone(getByTestId("file-drop"), new File(["1"], "x.txt"));

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(dispatchMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "LOAD_FILE_FROM_DISK" })
    );
  });

  it("removing selected file resets overwrite confirmation state", async () => {
    setMockIsOpen(true);
    mockBufferContent.mockReturnValue("existing");
    mockReadFileFromFile.mockResolvedValue({
      content: "1",
      extension: ".js",
      name: "x.js",
    });

    const { getByTestId, queryByText } = render(() => <LoadFileModal />);
    dropFileOnZone(getByTestId("file-drop"), new File(["1"], "x.js"));

    await new Promise((resolve) => setTimeout(resolve, 0));

    // Overwrite confirmation should be visible
    expect(queryByText(OVERWRITE_RE)).toBeTruthy();

    // Click the remove button
    fireEvent.click(getByTestId("file-drop-remove"));

    // Overwrite confirmation should be gone
    expect(queryByText(OVERWRITE_RE)).toBeNull();
  });
});
