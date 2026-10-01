import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectRenameModal } from "./ProjectRenameModal.tsx";

const mockSetProjectName = vi.fn();
const mockOpen = vi.fn();
const mockClose = vi.fn();
const [mockIsOpen, setMockIsOpen] = createSignal(false);

vi.mock("../../core/context", () => ({
  useEditor: () => ({
    overlays: {
      close: mockClose,
      isOpen: (id: string) => id === "project-rename" && mockIsOpen(),
      open: mockOpen,
    },
    session: {
      projectName: () => "TestProject",
      setProjectName: mockSetProjectName,
    },
  }),
}));

describe("ProjectRenameModal", () => {
  beforeEach(() => {
    mockSetProjectName.mockClear();
    mockOpen.mockClear();
    mockClose.mockClear();
    setMockIsOpen(false);
  });

  afterEach(() => {
    cleanup();
  });

  it("when core.overlays is false, dialog is not in the DOM", () => {
    const { queryByRole } = render(() => <ProjectRenameModal />);
    expect(queryByRole("dialog")).toBeNull();
  });

  it("when core.overlays is true, dialog is rendered with input", () => {
    setMockIsOpen(true);
    const { getByRole, getByPlaceholderText } = render(() => (
      <ProjectRenameModal />
    ));
    expect(getByRole("dialog")).toBeTruthy();
    expect(getByPlaceholderText("Enter project name...")).toBeTruthy();
  });

  it("submits the project name on enter key", () => {
    setMockIsOpen(true);
    const { getByPlaceholderText } = render(() => <ProjectRenameModal />);
    const input = getByPlaceholderText("Enter project name...");

    fireEvent.input(input, { target: { value: "NewProjectName" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(mockSetProjectName).toHaveBeenCalledWith("NewProjectName");
    expect(mockClose).toHaveBeenCalledWith("project-rename");
  });

  it("does not rename if name is empty spaces", () => {
    setMockIsOpen(true);
    const { getByPlaceholderText } = render(() => <ProjectRenameModal />);
    const input = getByPlaceholderText("Enter project name...");

    fireEvent.input(input, { target: { value: "   " } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(mockSetProjectName).not.toHaveBeenCalled();
    expect(mockClose).toHaveBeenCalledWith("project-rename");
  });
});
