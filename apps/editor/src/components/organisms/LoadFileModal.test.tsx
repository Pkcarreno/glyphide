import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LoadFileModal } from "./LoadFileModal.tsx";

const dispatchMock = vi.fn();
const [mockIsOpen, setMockIsOpen] = createSignal(false);
const mockReadFile = vi.fn();
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
    dispatcher: { dispatch: dispatchMock },
    fileIo: { readFile: mockReadFile, writeFile: vi.fn() },
    fileLoad: {
      error: () => null,
      pendingFile: () => null,
      resolveEngine: (ext: string) => EXTENSION_MAP[ext] ?? null,
      setError: vi.fn(),
      setPendingFile: vi.fn(),
    },
    buffer: { content: mockBufferContent },
    overlays: {
      isOpen: (id: string) => id === "load-file" && mockIsOpen(),
    },
  }),
}));

describe("LoadFileModal", () => {
  beforeEach(() => {
    dispatchMock.mockClear();
    setMockIsOpen(false);
    mockBufferContent.mockReturnValue("");
    mockReadFile.mockReset();
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

  it("renders a Choose File trigger and a Cancel button", () => {
    setMockIsOpen(true);
    const { getByText } = render(() => <LoadFileModal />);
    expect(getByText("Choose File")).toBeTruthy();
    expect(getByText("Cancel")).toBeTruthy();
  });

  it("renders instructions about supported file types", () => {
    setMockIsOpen(true);
    const { container } = render(() => <LoadFileModal />);
    const instructions = container.querySelector(
      "[data-testid='load-file-instructions']"
    );
    expect(instructions).toBeTruthy();
    expect(instructions?.textContent).toContain(".js");
    expect(instructions?.textContent).toContain(".py");
  });

  it("Cancel button closes the modal without state changes", () => {
    setMockIsOpen(true);
    const { getByText } = render(() => <LoadFileModal />);
    fireEvent.click(getByText("Cancel"));
    expect(dispatchMock).toHaveBeenCalledWith({
      type: "CLOSE_OVERLAY",
      overlayId: "load-file",
    });
  });

  it("Choose File button calls fileIo.readFile", async () => {
    setMockIsOpen(true);
    mockReadFile.mockResolvedValue({
      name: "x.js",
      content: "1",
      extension: ".js",
    });

    const { getByText } = render(() => <LoadFileModal />);
    fireEvent.click(getByText("Choose File"));
    await Promise.resolve();

    expect(mockReadFile).toHaveBeenCalled();
  });

  it("when buffer is non-empty and a file is picked, shows overwrite confirmation", async () => {
    setMockIsOpen(true);
    mockBufferContent.mockReturnValue("existing");
    mockReadFile.mockResolvedValue({
      name: "x.js",
      content: "1",
      extension: ".js",
    });

    const { getByText } = render(() => <LoadFileModal />);
    fireEvent.click(getByText("Choose File"));
    await Promise.resolve();
    await Promise.resolve();

    expect(getByText(OVERWRITE_RE)).toBeTruthy();
  });

  it("when overwrite is confirmed, dispatches RESET and LOAD_FILE_FROM_DISK", async () => {
    setMockIsOpen(true);
    mockBufferContent.mockReturnValue("existing");
    mockReadFile.mockResolvedValue({
      name: "x.js",
      content: "1",
      extension: ".js",
    });

    const { getByText } = render(() => <LoadFileModal />);
    fireEvent.click(getByText("Choose File"));
    await Promise.resolve();
    await Promise.resolve();

    fireEvent.click(getByText("Overwrite"));

    expect(dispatchMock).toHaveBeenCalledWith({ type: "RESET_PROJECT_STATE" });
    expect(dispatchMock).toHaveBeenCalledWith({
      type: "LOAD_FILE_FROM_DISK",
      name: "x.js",
      content: "1",
      engineId: "quickjs",
      language: "javascript",
    });
    expect(dispatchMock).toHaveBeenCalledWith({
      type: "CLOSE_OVERLAY",
      overlayId: "load-file",
    });
  });

  it("when buffer is empty, picks file and dispatches LOAD_FILE_FROM_DISK directly", async () => {
    setMockIsOpen(true);
    mockBufferContent.mockReturnValue("");
    mockReadFile.mockResolvedValue({
      name: "x.js",
      content: "1",
      extension: ".js",
    });

    const { getByText } = render(() => <LoadFileModal />);
    fireEvent.click(getByText("Choose File"));
    await Promise.resolve();
    await Promise.resolve();

    expect(dispatchMock).toHaveBeenCalledWith({
      type: "LOAD_FILE_FROM_DISK",
      name: "x.js",
      content: "1",
      engineId: "quickjs",
      language: "javascript",
    });
  });

  it("when file with unsupported extension is picked, shows inline error", async () => {
    setMockIsOpen(true);
    mockReadFile.mockResolvedValue({
      name: "x.txt",
      content: "1",
      extension: ".txt",
    });

    const { getByText } = render(() => <LoadFileModal />);
    fireEvent.click(getByText("Choose File"));
    await Promise.resolve();
    await Promise.resolve();

    expect(getByText(UNSUPPORTED_RE)).toBeTruthy();
  });
});
