import { render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { describe, expect, it, vi } from "vitest";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./Dialog.tsx";

vi.mock("../../core/context", () => ({
  useEditor: () => ({
    shortcuts: { bindings: [] },
  }),
}));

function renderDialog(defaultOpen = false) {
  return render(() => (
    <Dialog defaultOpen={defaultOpen}>
      <DialogTrigger data-testid="trigger">Open</DialogTrigger>
      <DialogContent data-testid="content">
        <DialogHeader>
          <DialogTitle>Title</DialogTitle>
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

  it("when dialog content is open, uses shadow-md and ring-1 instead of border", () => {
    const { getByRole } = render(() => (
      <Dialog defaultOpen>
        <DialogContent>Content</DialogContent>
      </Dialog>
    ));
    const dialog = getByRole("dialog");
    expect(dialog.className).toContain("shadow-md");
    expect(dialog.className).toContain("ring-1");
    expect(dialog.className).toContain("ring-on-surface/10");
    expect(dialog.className).toContain("p-4");
  });

  it("when dialog is open, overlay has bg-transparent and no backdrop-blur", () => {
    const { container } = render(() => (
      <Dialog defaultOpen>
        <DialogContent>Content</DialogContent>
      </Dialog>
    ));
    const overlay = container.querySelector(
      '[aria-hidden="true"]'
    ) as HTMLElement;
    expect(overlay).not.toBeNull();
    expect(overlay.className).toContain("bg-transparent");
    expect(overlay.className).not.toContain("backdrop-blur");
  });

  it("when preventBackdropClose is true, clicking backdrop does not close dialog", () => {
    const handler = vi.fn();
    const { container } = render(() => (
      <Dialog defaultOpen onOpenChange={handler}>
        <DialogContent preventBackdropClose>
          <p>Cannot dismiss via backdrop</p>
        </DialogContent>
      </Dialog>
    ));
    // Find the backdrop overlay button
    const overlay = container.querySelector('[aria-hidden="true"]');
    expect(overlay).not.toBeNull();
    if (overlay) {
      overlay.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    }
    // onOpenChange should NOT have been called with false (dialog should NOT close)
    expect(handler).not.toHaveBeenCalledWith(false);
  });

  it("when preventBackdropClose is not set, clicking backdrop closes dialog", () => {
    const handler = vi.fn();
    const { container } = render(() => (
      <Dialog defaultOpen onOpenChange={handler}>
        <DialogContent>
          <p>Can dismiss via backdrop</p>
        </DialogContent>
      </Dialog>
    ));
    const overlay = container.querySelector('[aria-hidden="true"]');
    expect(overlay).not.toBeNull();
    if (overlay) {
      overlay.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    }
    expect(handler).toHaveBeenCalledWith(false);
  });
});

describe("DialogTitle", () => {
  it("when rendered with default settings, renders an h2 element with the title text", () => {
    const { getByRole } = render(() => (
      <Dialog defaultOpen>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Default Title</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    ));
    const heading = getByRole("heading", { level: 2 });
    expect(heading.textContent).toBe("Default Title");
  });

  it("when as prop is h3, renders an h3 element with the title text", () => {
    const { getByRole } = render(() => (
      <Dialog defaultOpen>
        <DialogContent>
          <DialogHeader>
            <DialogTitle as="h3">Sub Title</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    ));
    const heading = getByRole("heading", { level: 3 });
    expect(heading.textContent).toBe("Sub Title");
  });

  it("when rendered, applies default typography classes (font-semibold, text-on-surface, text-sm, tracking-wide)", () => {
    const { getByRole } = render(() => (
      <Dialog defaultOpen>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Title</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    ));
    const heading = getByRole("heading", { level: 2 });
    expect(heading.className).toContain("font-semibold");
    expect(heading.className).toContain("text-on-surface");
    expect(heading.className).toContain("text-sm");
    expect(heading.className).toContain("tracking-wide");
  });

  it("when class prop is provided, merges it with the default classes", () => {
    const { getByRole } = render(() => (
      <Dialog defaultOpen>
        <DialogContent>
          <DialogHeader>
            <DialogTitle class="mb-2">Title</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    ));
    const heading = getByRole("heading", { level: 2 });
    expect(heading.className).toContain("font-semibold");
    expect(heading.className).toContain("mb-2");
  });

  it("when as prop is an invalid heading value, still renders without throwing", () => {
    const { queryByText } = render(() => (
      <Dialog defaultOpen>
        <DialogContent>
          <DialogHeader>
            <DialogTitle as="div">Div Title</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    ));
    expect(queryByText("Div Title")).toBeTruthy();
  });

  it("when children include JSX elements, renders them inside the heading", () => {
    const { getByRole } = render(() => (
      <Dialog defaultOpen>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <span>Icon</span> Title
            </DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    ));
    const heading = getByRole("heading", { level: 2 });
    expect(heading.textContent).toBe("Icon Title");
    expect(heading.querySelector("span")).not.toBeNull();
  });
});

describe("DialogHeader default classes", () => {
  it("when rendered without overrides, includes px-5 py-4 bg-surface border-b border-outline-variant", () => {
    const { getByRole } = render(() => (
      <Dialog defaultOpen>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Title</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    ));
    // DialogHeader is the parent of the heading
    const heading = getByRole("heading", { level: 2 });
    const header = heading.parentElement as HTMLElement;
    expect(header.className).toContain("px-5");
    expect(header.className).toContain("py-4");
    expect(header.className).toContain("bg-surface");
    expect(header.className).toContain("border-b");
    expect(header.className).toContain("border-outline-variant");
  });

  it("when consumer class overrides padding, the consumer value wins via cn merge", () => {
    const { getByRole } = render(() => (
      <Dialog defaultOpen>
        <DialogContent>
          <DialogHeader class="px-3">
            <DialogTitle>Title</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    ));
    const heading = getByRole("heading", { level: 2 });
    const header = heading.parentElement as HTMLElement;
    expect(header.className).toContain("px-3");
    // py-4 should remain because consumer only overrode px
    expect(header.className).toContain("py-4");
  });
});
