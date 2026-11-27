import { cleanup, render } from "@solidjs/testing-library";
import type { JSX } from "@solidjs/web";
import type { ParentProps } from "solid-js";
import { createSignal, flush, omit, resetErrorHalt } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Dialog, useDialog } from "./Dialog.tsx";

afterEach(() => {
  cleanup();
  resetErrorHalt();
});

function renderDialog(defaultOpen = false) {
  return render(() => (
    <Dialog.Root defaultOpen={defaultOpen}>
      <Dialog.Trigger data-testid="trigger">Open</Dialog.Trigger>
      <Dialog.Content data-testid="content">
        <Dialog.Header>
          <Dialog.Title>Title</Dialog.Title>
          <Dialog.Close data-testid="close-btn">X</Dialog.Close>
        </Dialog.Header>
        <p>Body content</p>
      </Dialog.Content>
    </Dialog.Root>
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
      <Dialog.Root onOpenChange={handler}>
        <Dialog.Trigger data-testid="trigger">Open</Dialog.Trigger>
        <Dialog.Content>Content</Dialog.Content>
      </Dialog.Root>
    ));
    getByTestId("trigger").click();
    expect(handler).toHaveBeenCalledWith(true);
  });

  it("when onOpenChange is provided, fires on close", () => {
    const handler = vi.fn();
    const { getByTestId } = render(() => (
      <Dialog.Root defaultOpen onOpenChange={handler}>
        <Dialog.Trigger>Open</Dialog.Trigger>
        <Dialog.Content>
          <Dialog.Close data-testid="close-btn">X</Dialog.Close>
        </Dialog.Content>
      </Dialog.Root>
    ));
    getByTestId("close-btn").click();
    expect(handler).toHaveBeenCalledWith(false);
  });

  it("when used as controlled, reflects external state", () => {
    const [isOpen, setIsOpen] = createSignal(false);
    const { queryByRole } = render(() => (
      <Dialog.Root isOpen={isOpen()} onOpenChange={setIsOpen}>
        <Dialog.Trigger data-testid="trigger">Open</Dialog.Trigger>
        <Dialog.Content>Controlled</Dialog.Content>
      </Dialog.Root>
    ));
    expect(queryByRole("dialog")).toBeNull();
    setIsOpen(true);
    flush();
    expect(queryByRole("dialog")).not.toBeNull();
    setIsOpen(false);
    flush();
    expect(queryByRole("dialog")).toBeNull();
  });

  it("when dialog content has custom class, merges it", () => {
    const { getByRole } = render(() => (
      <Dialog.Root defaultOpen>
        <Dialog.Content class="max-w-lg">Styled</Dialog.Content>
      </Dialog.Root>
    ));
    const dialog = getByRole("dialog");
    expect(dialog.className).toContain("max-w-lg");
    expect(dialog.className).toContain("bg-surface");
  });

  it("when dialog content is open, uses shadow-md and ring-1 instead of border", () => {
    const { getByRole } = render(() => (
      <Dialog.Root defaultOpen>
        <Dialog.Content>Content</Dialog.Content>
      </Dialog.Root>
    ));
    const dialog = getByRole("dialog");
    expect(dialog.className).toContain("shadow-md");
    expect(dialog.className).toContain("ring-1");
    expect(dialog.className).toContain("ring-on-surface/10");
    expect(dialog.className).toContain("p-4");
  });

  it("centers dialog content by default and supports align='top'", () => {
    const [align, setAlign] = createSignal<"center" | "top">("center");
    const { getByRole } = render(() => (
      <Dialog.Root defaultOpen>
        <Dialog.Content align={align()}>Aligned</Dialog.Content>
      </Dialog.Root>
    ));

    const getWrapper = () => getByRole("dialog").parentElement as HTMLElement;
    expect(getWrapper().className).toContain("items-center");
    expect(getWrapper().className).toContain("p-4");
    expect(getWrapper().className).not.toContain("pt-[15vh]");

    setAlign("top");
    flush();

    expect(getWrapper().className).toContain("items-start");
    expect(getWrapper().className).toContain("pt-[15vh]");
    expect(getWrapper().className).not.toContain("items-center");
  });

  it("when dialog is open, overlay has bg-transparent and no backdrop-blur", () => {
    const { container } = render(() => (
      <Dialog.Root defaultOpen>
        <Dialog.Content>Content</Dialog.Content>
      </Dialog.Root>
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
      <Dialog.Root defaultOpen onOpenChange={handler}>
        <Dialog.Content preventBackdropClose>
          <p>Cannot dismiss via backdrop</p>
        </Dialog.Content>
      </Dialog.Root>
    ));
    const overlay = container.querySelector('[aria-hidden="true"]');
    expect(overlay).not.toBeNull();
    if (overlay) {
      overlay.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    }
    expect(handler).not.toHaveBeenCalledWith(false);
  });

  it("when preventBackdropClose is not set, clicking backdrop closes dialog", () => {
    const handler = vi.fn();
    const { container } = render(() => (
      <Dialog.Root defaultOpen onOpenChange={handler}>
        <Dialog.Content>
          <p>Can dismiss via backdrop</p>
        </Dialog.Content>
      </Dialog.Root>
    ));
    const overlay = container.querySelector('[aria-hidden="true"]');
    expect(overlay).not.toBeNull();
    if (overlay) {
      overlay.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    }
    expect(handler).toHaveBeenCalledWith(false);
  });

  it("chains caller onClick and forwards ref on Dialog.Trigger", () => {
    const callerClick = vi.fn();
    let triggerEl: HTMLButtonElement | undefined;
    const { getByTestId, queryByRole } = render(() => (
      <Dialog.Root>
        <Dialog.Trigger
          data-testid="trigger"
          onClick={callerClick}
          ref={(el) => {
            triggerEl = el;
          }}
        >
          Open
        </Dialog.Trigger>
        <Dialog.Content>Content</Dialog.Content>
      </Dialog.Root>
    ));

    expect(triggerEl).toBe(getByTestId("trigger"));
    getByTestId("trigger").click();
    expect(callerClick).toHaveBeenCalledOnce();
    expect(queryByRole("dialog")).not.toBeNull();
  });

  it("chains caller onClick and forwards ref on Dialog.Close", () => {
    const callerClick = vi.fn();
    let closeEl: HTMLButtonElement | undefined;
    const { getByTestId, queryByRole } = render(() => (
      <Dialog.Root defaultOpen>
        <Dialog.Content>
          <Dialog.Close
            data-testid="close-btn"
            onClick={callerClick}
            ref={(el) => {
              closeEl = el;
            }}
          >
            Close
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Root>
    ));

    expect(closeEl).toBe(getByTestId("close-btn"));
    expect(closeEl?.tagName).toBe("BUTTON");
    expect(closeEl?.getAttribute("type")).toBe("button");
    getByTestId("close-btn").click();
    expect(callerClick).toHaveBeenCalledOnce();
    expect(queryByRole("dialog")).toBeNull();
  });

  it("Dialog.Close supports polymorphic as prop with intrinsic tags and custom components", () => {
    function CustomClose(
      props: ParentProps<JSX.HTMLAttributes<HTMLButtonElement>>
    ) {
      const rest = omit(props, "children");
      return (
        <button data-custom="true" type="button" {...rest}>
          {props.children}
        </button>
      );
    }

    const { getByTestId, queryByRole } = render(() => (
      <Dialog.Root defaultOpen>
        <Dialog.Content>
          <Dialog.Close as="a" data-testid="close-link" href="#closed">
            Cancel link
          </Dialog.Close>
          <Dialog.Close as={CustomClose} data-testid="close-custom">
            Custom close
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Root>
    ));

    const link = getByTestId("close-link");
    expect(link.tagName).toBe("A");
    expect(link.getAttribute("type")).toBeNull();
    expect(link.getAttribute("href")).toBe("#closed");

    const custom = getByTestId("close-custom");
    expect(custom.tagName).toBe("BUTTON");
    expect(custom.getAttribute("data-custom")).toBe("true");

    custom.click();
    expect(queryByRole("dialog")).toBeNull();
  });

  it("chains caller onClick and forwards ref on Dialog.Overlay", () => {
    const callerClick = vi.fn();
    let overlayEl: HTMLButtonElement | undefined;
    const onOpenChange = vi.fn();
    const { getByTestId } = render(() => (
      <Dialog.Root defaultOpen onOpenChange={onOpenChange}>
        <Dialog.Overlay
          data-testid="overlay"
          onClick={callerClick}
          ref={(el) => {
            overlayEl = el;
          }}
        />
      </Dialog.Root>
    ));

    expect(overlayEl).toBe(getByTestId("overlay"));
    getByTestId("overlay").click();
    expect(callerClick).toHaveBeenCalledOnce();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("reactively tracks preventBackdropClose changes", () => {
    const handler = vi.fn();
    const [preventBackdropClose, setPreventBackdropClose] = createSignal(true);
    const { container } = render(() => (
      <Dialog.Root defaultOpen onOpenChange={handler}>
        <Dialog.Content preventBackdropClose={preventBackdropClose()}>
          <p>Reactive backdrop</p>
        </Dialog.Content>
      </Dialog.Root>
    ));

    const overlay = container.querySelector('[aria-hidden="true"]');
    expect(overlay).not.toBeNull();
    overlay?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(handler).not.toHaveBeenCalled();

    setPreventBackdropClose(false);
    flush();

    overlay?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(handler).toHaveBeenCalledWith(false);
  });
});

describe("Dialog.Title", () => {
  it("when rendered with default settings, renders an h2 element with the title text", () => {
    const { getByRole } = render(() => (
      <Dialog.Root defaultOpen>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>Default Title</Dialog.Title>
          </Dialog.Header>
        </Dialog.Content>
      </Dialog.Root>
    ));
    const heading = getByRole("heading", { level: 2 });
    expect(heading.textContent).toBe("Default Title");
  });

  it("when as prop is h3, renders an h3 element with the title text", () => {
    const { getByRole } = render(() => (
      <Dialog.Root defaultOpen>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title as="h3">Sub Title</Dialog.Title>
          </Dialog.Header>
        </Dialog.Content>
      </Dialog.Root>
    ));
    const heading = getByRole("heading", { level: 3 });
    expect(heading.textContent).toBe("Sub Title");
  });

  it("when rendered, applies default typography classes (font-semibold, text-on-surface, text-sm, tracking-wide)", () => {
    const { getByRole } = render(() => (
      <Dialog.Root defaultOpen>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>Title</Dialog.Title>
          </Dialog.Header>
        </Dialog.Content>
      </Dialog.Root>
    ));
    const heading = getByRole("heading", { level: 2 });
    expect(heading.className).toContain("font-semibold");
    expect(heading.className).toContain("text-on-surface");
    expect(heading.className).toContain("text-sm");
    expect(heading.className).toContain("tracking-wide");
  });

  it("when class prop is provided, merges it with the default classes", () => {
    const { getByRole } = render(() => (
      <Dialog.Root defaultOpen>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title class="mb-2">Title</Dialog.Title>
          </Dialog.Header>
        </Dialog.Content>
      </Dialog.Root>
    ));
    const heading = getByRole("heading", { level: 2 });
    expect(heading.className).toContain("font-semibold");
    expect(heading.className).toContain("mb-2");
  });

  it("when as prop is an invalid heading value, still renders without throwing", () => {
    const { queryByText } = render(() => (
      <Dialog.Root defaultOpen>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title as="div">Div Title</Dialog.Title>
          </Dialog.Header>
        </Dialog.Content>
      </Dialog.Root>
    ));
    expect(queryByText("Div Title")).toBeTruthy();
  });

  it("when children include JSX elements, renders them inside the heading", () => {
    const { getByRole } = render(() => (
      <Dialog.Root defaultOpen>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>
              <span>Icon</span> Title
            </Dialog.Title>
          </Dialog.Header>
        </Dialog.Content>
      </Dialog.Root>
    ));
    const heading = getByRole("heading", { level: 2 });
    expect(heading.textContent).toBe("Icon Title");
    expect(heading.querySelector("span")).not.toBeNull();
  });

  it("reactively updates heading tag when as prop changes", () => {
    const [tag, setTag] = createSignal<"h2" | "h3">("h2");
    const { getByRole, queryByRole } = render(() => (
      <Dialog.Root defaultOpen>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title as={tag()}>Dynamic Title</Dialog.Title>
          </Dialog.Header>
        </Dialog.Content>
      </Dialog.Root>
    ));

    expect(getByRole("heading", { level: 2 }).textContent).toBe(
      "Dynamic Title"
    );
    expect(queryByRole("heading", { level: 3 })).toBeNull();

    setTag("h3");
    flush();

    expect(queryByRole("heading", { level: 2 })).toBeNull();
    expect(getByRole("heading", { level: 3 }).textContent).toBe(
      "Dynamic Title"
    );
  });
});

describe("Dialog.Header default classes", () => {
  it("when rendered without overrides, includes px-5 py-4 bg-surface border-b border-outline-variant", () => {
    const { getByRole } = render(() => (
      <Dialog.Root defaultOpen>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>Title</Dialog.Title>
          </Dialog.Header>
        </Dialog.Content>
      </Dialog.Root>
    ));
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
      <Dialog.Root defaultOpen>
        <Dialog.Content>
          <Dialog.Header class="px-3">
            <Dialog.Title>Title</Dialog.Title>
          </Dialog.Header>
        </Dialog.Content>
      </Dialog.Root>
    ));
    const heading = getByRole("heading", { level: 2 });
    const header = heading.parentElement as HTMLElement;
    expect(header.className).toContain("px-3");
    expect(header.className).toContain("py-4");
  });
});

describe("Dialog context contract", () => {
  it("throws native ContextNotFoundError when useDialog is called outside Dialog.Root", () => {
    function OrphanConsumer() {
      useDialog();
      return null;
    }

    let caught: unknown;
    try {
      render(() => <OrphanConsumer />);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).constructor.name).toBe("ContextNotFoundError");
    expect((caught as Error).message).toContain(
      "has no provider above this read"
    );
  });
});
