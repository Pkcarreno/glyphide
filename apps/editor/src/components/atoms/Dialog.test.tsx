import { render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { describe, expect, it, vi } from "vitest";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTrigger,
} from "./Dialog";

function renderDialog(defaultOpen = false) {
  return render(() => (
    <Dialog defaultOpen={defaultOpen}>
      <DialogTrigger data-testid="trigger">Open</DialogTrigger>
      <DialogContent data-testid="content">
        <DialogHeader>
          <h2>Title</h2>
          <DialogClose data-testid="close-btn">X</DialogClose>
        </DialogHeader>
        <p>Body content</p>
      </DialogContent>
    </Dialog>
  ));
}

describe("Dialog", () => {
  it("when rendered closed, content is not in the DOM", () => {
    const { queryByRole } = renderDialog(false);
    expect(queryByRole("dialog")).toBeNull();
  });

  it("when trigger is clicked, dialog opens", () => {
    const { getByTestId, queryByRole } = renderDialog(false);
    expect(queryByRole("dialog")).toBeNull();
    getByTestId("trigger").click();
    expect(queryByRole("dialog")).not.toBeNull();
  });

  it("when rendered with defaultOpen, content is visible", () => {
    const { getByRole } = renderDialog(true);
    expect(getByRole("dialog")).toBeTruthy();
  });

  it("when close button is clicked, dialog closes", () => {
    const { getByTestId, queryByRole } = renderDialog(true);
    expect(queryByRole("dialog")).not.toBeNull();
    getByTestId("close-btn").click();
    expect(queryByRole("dialog")).toBeNull();
  });

  it("when dialog is open, has aria-modal=true", () => {
    const { getByRole } = renderDialog(true);
    expect(getByRole("dialog").getAttribute("aria-modal")).toBe("true");
  });

  it("when onOpenChange is provided, fires on open", () => {
    const handler = vi.fn();
    const { getByTestId } = render(() => (
      <Dialog onOpenChange={handler}>
        <DialogTrigger data-testid="trigger">Open</DialogTrigger>
        <DialogContent>Content</DialogContent>
      </Dialog>
    ));
    getByTestId("trigger").click();
    expect(handler).toHaveBeenCalledWith(true);
  });

  it("when onOpenChange is provided, fires on close", () => {
    const handler = vi.fn();
    const { getByTestId } = render(() => (
      <Dialog defaultOpen onOpenChange={handler}>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogClose data-testid="close-btn">X</DialogClose>
        </DialogContent>
      </Dialog>
    ));
    getByTestId("close-btn").click();
    expect(handler).toHaveBeenCalledWith(false);
  });

  it("when used as controlled, reflects external state", () => {
    const [isOpen, setIsOpen] = createSignal(false);
    const { queryByRole } = render(() => (
      <Dialog isOpen={isOpen()} onOpenChange={setIsOpen}>
        <DialogTrigger data-testid="trigger">Open</DialogTrigger>
        <DialogContent>Controlled</DialogContent>
      </Dialog>
    ));
    expect(queryByRole("dialog")).toBeNull();
    setIsOpen(true);
    expect(queryByRole("dialog")).not.toBeNull();
    setIsOpen(false);
    expect(queryByRole("dialog")).toBeNull();
  });

  it("when dialog content has custom class, merges it", () => {
    const { getByRole } = render(() => (
      <Dialog defaultOpen>
        <DialogContent class="max-w-lg">Styled</DialogContent>
      </Dialog>
    ));
    const dialog = getByRole("dialog");
    expect(dialog.className).toContain("max-w-lg");
    expect(dialog.className).toContain("bg-surface");
  });
});
