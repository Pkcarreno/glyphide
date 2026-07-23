import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectRenameModal } from "./ProjectRenameModal.tsx";

const dispatchMock = vi.fn();
const [mockIsOpen, setMockIsOpen] = createSignal(false);

vi.mock("../../core/context", () => ({
  useEditor: () => ({
    dispatcher: { dispatch: dispatchMock },
    overlays: {
      isOpen: (id: string) => id === "project-rename" && mockIsOpen(),
    },
    project: {
      name: () => "TestProject",
    },
  }),
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
    const { getByRole, getByPlaceholderText } = render(() => (
      <ProjectRenameModal />
    ));
    expect(getByRole("dialog")).toBeTruthy();
    expect(getByPlaceholderText("Enter project name...")).toBeTruthy();
  });

  it("submits the RENAME_PROJECT action on enter key", () => {
    setMockIsOpen(true);
    const { getByPlaceholderText } = render(() => <ProjectRenameModal />);
    const input = getByPlaceholderText("Enter project name...");

    fireEvent.input(input, { target: { value: "NewProjectName" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(dispatchMock).toHaveBeenCalledWith({
      name: "NewProjectName",
      type: "RENAME_PROJECT",
    });
  });

  it("does not dispatch if name is empty spaces", () => {
    setMockIsOpen(true);
    const { getByPlaceholderText } = render(() => <ProjectRenameModal />);
    const input = getByPlaceholderText("Enter project name...");

    fireEvent.input(input, { target: { value: "   " } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(dispatchMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "RENAME_PROJECT" })
    );
  });
});
