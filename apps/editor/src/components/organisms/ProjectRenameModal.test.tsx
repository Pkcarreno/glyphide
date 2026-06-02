import { render, fireEvent, cleanup } from "@solidjs/testing-library";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { ProjectRenameModal } from "./ProjectRenameModal";
import { createSignal } from "solid-js";

const dispatchMock = vi.fn();
const [mockIsOpen, setMockIsOpen] = createSignal(false);

vi.mock("../../core/context", () => ({
  useEditor: () => ({
    dispatcher: { dispatch: dispatchMock },
    project: {
      name: () => "TestProject"
    },
    overlays: {
      isOpen: (id: string) => id === "project-rename" && mockIsOpen()
    }
  })
}));

describe("ProjectRenameModal", () => {
  beforeEach(() => {
    dispatchMock.mockClear();
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
    const { getByRole, getByPlaceholderText } = render(() => <ProjectRenameModal />);
    expect(getByRole("dialog")).toBeTruthy();
    expect(getByPlaceholderText("Enter project name...")).toBeTruthy();
  });

  it("submits the RENAME_PROJECT action on enter key", () => {
    setMockIsOpen(true);
    const { getByPlaceholderText } = render(() => <ProjectRenameModal />);
    const input = getByPlaceholderText("Enter project name...");
    
    fireEvent.input(input, { target: { value: "NewProjectName" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(dispatchMock).toHaveBeenCalledWith({ type: "RENAME_PROJECT", name: "NewProjectName" });
  });

  it("does not dispatch if name is empty spaces", () => {
    setMockIsOpen(true);
    const { getByPlaceholderText } = render(() => <ProjectRenameModal />);
    const input = getByPlaceholderText("Enter project name...");
    
    fireEvent.input(input, { target: { value: "   " } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(dispatchMock).not.toHaveBeenCalledWith(expect.objectContaining({ type: "RENAME_PROJECT" }));
  });
});
