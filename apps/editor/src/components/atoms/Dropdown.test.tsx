import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import type { JSX } from "@solidjs/web";
import { createSignal, flush, resetErrorHalt } from "solid-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Dropdown, useDropdown } from "./Dropdown.tsx";

const { computePositionSpy } = vi.hoisted(() => ({
  computePositionSpy: vi.fn(),
}));

vi.mock("@floating-ui/dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@floating-ui/dom")>();
  computePositionSpy.mockImplementation(actual.computePosition);
  return {
    ...actual,
    computePosition: computePositionSpy,
  };
});

beforeEach(() => {
  computePositionSpy.mockClear();
});

afterEach(() => {
  cleanup();
  resetErrorHalt();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Dropdown", () => {
  describe("Open/Close", () => {
    it("renders trigger and ignores content when closed", () => {
      render(() => (
        <Dropdown.Root>
          <Dropdown.Trigger>Menu</Dropdown.Trigger>
          <Dropdown.Portal>
            <Dropdown.Content>
              <Dropdown.Item>Item 1</Dropdown.Item>
              <Dropdown.Item>Item 2</Dropdown.Item>
            </Dropdown.Content>
          </Dropdown.Portal>
        </Dropdown.Root>
      ));

      expect(screen.getByText("Menu")).not.toBeNull();
      expect(screen.queryByText("Item 1")).toBeNull();
      expect(screen.queryByText("Item 2")).toBeNull();
    });

    it("opens content on trigger click", async () => {
      render(() => (
        <Dropdown.Root>
          <Dropdown.Trigger>Menu</Dropdown.Trigger>
          <Dropdown.Portal>
            <Dropdown.Content>
              <Dropdown.Item>Item 1</Dropdown.Item>
            </Dropdown.Content>
          </Dropdown.Portal>
        </Dropdown.Root>
      ));

      expect(screen.queryByText("Item 1")).toBeNull();

      fireEvent.click(screen.getByText("Menu"));
      await Promise.resolve();

      expect(screen.getByText("Item 1")).not.toBeNull();
    });

    it("closes on outside click", async () => {
      render(() => (
        <Dropdown.Root>
          <Dropdown.Trigger>Menu</Dropdown.Trigger>
          <Dropdown.Portal>
            <Dropdown.Content>
              <Dropdown.Item>Item 1</Dropdown.Item>
            </Dropdown.Content>
          </Dropdown.Portal>
        </Dropdown.Root>
      ));

      fireEvent.click(screen.getByText("Menu"));
      await Promise.resolve();

      expect(screen.getByText("Item 1")).not.toBeNull();

      fireEvent.mouseDown(document.body);
      await Promise.resolve();

      expect(screen.queryByText("Item 1")).toBeNull();
    });

    it("closes on Escape key", async () => {
      render(() => (
        <Dropdown.Root>
          <Dropdown.Trigger>Menu</Dropdown.Trigger>
          <Dropdown.Portal>
            <Dropdown.Content>
              <Dropdown.Item>Item 1</Dropdown.Item>
            </Dropdown.Content>
          </Dropdown.Portal>
        </Dropdown.Root>
      ));

      fireEvent.click(screen.getByText("Menu"));
      await Promise.resolve();

      expect(screen.getByText("Item 1")).not.toBeNull();

      const content = screen.getByRole("menu");
      fireEvent.keyDown(content, { key: "Escape" });
      await Promise.resolve();

      expect(screen.queryByText("Item 1")).toBeNull();
    });
  });

  describe("Keyboard Navigation", () => {
    it("ArrowDown moves through items and wraps", async () => {
      render(() => (
        <Dropdown.Root>
          <Dropdown.Trigger>Menu</Dropdown.Trigger>
          <Dropdown.Portal>
            <Dropdown.Content>
              <Dropdown.Item>Item 1</Dropdown.Item>
              <Dropdown.Item>Item 2</Dropdown.Item>
              <Dropdown.Item>Item 3</Dropdown.Item>
            </Dropdown.Content>
          </Dropdown.Portal>
        </Dropdown.Root>
      ));

      fireEvent.click(screen.getByText("Menu"));
      await Promise.resolve();

      const content = screen.getByRole("menu");

      // No item active on open — first ArrowDown goes to Item 1
      fireEvent.keyDown(content, { key: "ArrowDown" });
      await Promise.resolve();
      expect(screen.getByText("Item 1").getAttribute("data-active")).toBe(
        "true"
      );

      fireEvent.keyDown(content, { key: "ArrowDown" });
      await Promise.resolve();
      expect(screen.getByText("Item 2").getAttribute("data-active")).toBe(
        "true"
      );

      fireEvent.keyDown(content, { key: "ArrowDown" });
      await Promise.resolve();
      expect(screen.getByText("Item 3").getAttribute("data-active")).toBe(
        "true"
      );

      // Wraps to first
      fireEvent.keyDown(content, { key: "ArrowDown" });
      await Promise.resolve();
      expect(screen.getByText("Item 1").getAttribute("data-active")).toBe(
        "true"
      );
    });

    it("ArrowUp moves to previous item and wraps to last", async () => {
      render(() => (
        <Dropdown.Root>
          <Dropdown.Trigger>Menu</Dropdown.Trigger>
          <Dropdown.Portal>
            <Dropdown.Content>
              <Dropdown.Item>Item 1</Dropdown.Item>
              <Dropdown.Item>Item 2</Dropdown.Item>
              <Dropdown.Item>Item 3</Dropdown.Item>
            </Dropdown.Content>
          </Dropdown.Portal>
        </Dropdown.Root>
      ));

      fireEvent.click(screen.getByText("Menu"));
      await Promise.resolve();

      const content = screen.getByRole("menu");

      // No item active — ArrowUp wraps to last item
      fireEvent.keyDown(content, { key: "ArrowUp" });
      await Promise.resolve();
      expect(screen.getByText("Item 3").getAttribute("data-active")).toBe(
        "true"
      );

      fireEvent.keyDown(content, { key: "ArrowUp" });
      await Promise.resolve();
      expect(screen.getByText("Item 2").getAttribute("data-active")).toBe(
        "true"
      );
    });

    it("Home moves to first item", async () => {
      render(() => (
        <Dropdown.Root>
          <Dropdown.Trigger>Menu</Dropdown.Trigger>
          <Dropdown.Portal>
            <Dropdown.Content>
              <Dropdown.Item>Item 1</Dropdown.Item>
              <Dropdown.Item>Item 2</Dropdown.Item>
            </Dropdown.Content>
          </Dropdown.Portal>
        </Dropdown.Root>
      ));

      fireEvent.click(screen.getByText("Menu"));
      await Promise.resolve();

      const content = screen.getByRole("menu");

      // Navigate to Item 2
      fireEvent.keyDown(content, { key: "ArrowDown" });
      await Promise.resolve();
      fireEvent.keyDown(content, { key: "ArrowDown" });
      await Promise.resolve();
      expect(screen.getByText("Item 2").getAttribute("data-active")).toBe(
        "true"
      );

      // Home goes to Item 1
      fireEvent.keyDown(content, { key: "Home" });
      await Promise.resolve();
      expect(screen.getByText("Item 1").getAttribute("data-active")).toBe(
        "true"
      );
    });

    it("End moves to last item", async () => {
      render(() => (
        <Dropdown.Root>
          <Dropdown.Trigger>Menu</Dropdown.Trigger>
          <Dropdown.Portal>
            <Dropdown.Content>
              <Dropdown.Item>Item 1</Dropdown.Item>
              <Dropdown.Item>Item 2</Dropdown.Item>
            </Dropdown.Content>
          </Dropdown.Portal>
        </Dropdown.Root>
      ));

      fireEvent.click(screen.getByText("Menu"));
      await Promise.resolve();

      const content = screen.getByRole("menu");

      fireEvent.keyDown(content, { key: "End" });
      await Promise.resolve();
      expect(screen.getByText("Item 2").getAttribute("data-active")).toBe(
        "true"
      );
    });

    it("Enter activates focused item", async () => {
      const handleSelect = vi.fn();

      render(() => (
        <Dropdown.Root>
          <Dropdown.Trigger>Menu</Dropdown.Trigger>
          <Dropdown.Portal>
            <Dropdown.Content>
              <Dropdown.Item onSelect={handleSelect}>Item 1</Dropdown.Item>
              <Dropdown.Item>Item 2</Dropdown.Item>
            </Dropdown.Content>
          </Dropdown.Portal>
        </Dropdown.Root>
      ));

      fireEvent.click(screen.getByText("Menu"));
      await Promise.resolve();

      const content = screen.getByRole("menu");

      // Navigate to Item 1 first
      fireEvent.keyDown(content, { key: "ArrowDown" });
      await Promise.resolve();

      fireEvent.keyDown(content, { key: "Enter" });
      await Promise.resolve();

      expect(handleSelect).toHaveBeenCalledTimes(1);
    });

    it("Space activates focused item", async () => {
      const handleSelect = vi.fn();

      render(() => (
        <Dropdown.Root>
          <Dropdown.Trigger>Menu</Dropdown.Trigger>
          <Dropdown.Portal>
            <Dropdown.Content>
              <Dropdown.Item onSelect={handleSelect}>Item 1</Dropdown.Item>
            </Dropdown.Content>
          </Dropdown.Portal>
        </Dropdown.Root>
      ));

      fireEvent.click(screen.getByText("Menu"));
      await Promise.resolve();

      const content = screen.getByRole("menu");

      // Navigate to Item 1 first
      fireEvent.keyDown(content, { key: "ArrowDown" });
      await Promise.resolve();

      fireEvent.keyDown(content, { key: " " });
      await Promise.resolve();

      expect(handleSelect).toHaveBeenCalledTimes(1);
    });
  });

  describe("CheckboxItem", () => {
    it("toggles checked state on Enter", async () => {
      const handleCheckedChange = vi.fn();

      render(() => (
        <Dropdown.Root>
          <Dropdown.Trigger>Menu</Dropdown.Trigger>
          <Dropdown.Portal>
            <Dropdown.Content>
              <Dropdown.CheckboxItem
                isChecked={false}
                onCheckedChange={handleCheckedChange}
              >
                Toggle Me
              </Dropdown.CheckboxItem>
            </Dropdown.Content>
          </Dropdown.Portal>
        </Dropdown.Root>
      ));

      fireEvent.click(screen.getByText("Menu"));
      await Promise.resolve();

      const content = screen.getByRole("menu");

      // Navigate to checkbox item first
      fireEvent.keyDown(content, { key: "ArrowDown" });
      await Promise.resolve();

      fireEvent.keyDown(content, { key: "Enter" });
      await Promise.resolve();

      expect(handleCheckedChange).toHaveBeenCalledWith(true);
    });

    it("shows check icon when checked", async () => {
      render(() => (
        <Dropdown.Root>
          <Dropdown.Trigger>Menu</Dropdown.Trigger>
          <Dropdown.Portal>
            <Dropdown.Content>
              <Dropdown.CheckboxItem isChecked={true}>
                Checked Item
              </Dropdown.CheckboxItem>
            </Dropdown.Content>
          </Dropdown.Portal>
        </Dropdown.Root>
      ));

      fireEvent.click(screen.getByText("Menu"));
      await Promise.resolve();

      const checkIcon = screen.getByTestId("dropdown-check-icon");
      expect(checkIcon).not.toBeNull();
    });
  });

  describe("Styling Props", () => {
    it("content uses ring-1 instead of border", async () => {
      render(() => (
        <Dropdown.Root>
          <Dropdown.Trigger>Menu</Dropdown.Trigger>
          <Dropdown.Portal>
            <Dropdown.Content>
              <Dropdown.Item>Item 1</Dropdown.Item>
            </Dropdown.Content>
          </Dropdown.Portal>
        </Dropdown.Root>
      ));

      fireEvent.click(screen.getByText("Menu"));
      await Promise.resolve();

      const content = screen.getByRole("menu");
      expect(content.classList.contains("ring-1")).toBe(true);
      expect(content.classList.contains("ring-on-surface/10")).toBe(true);
      expect(content.classList.contains("border")).toBe(false);
    });

    it("applies inset padding when inset=true", async () => {
      render(() => (
        <Dropdown.Root>
          <Dropdown.Trigger>Menu</Dropdown.Trigger>
          <Dropdown.Portal>
            <Dropdown.Content>
              <Dropdown.Item inset>Inset Item</Dropdown.Item>
            </Dropdown.Content>
          </Dropdown.Portal>
        </Dropdown.Root>
      ));

      fireEvent.click(screen.getByText("Menu"));
      await Promise.resolve();

      const item = screen.getByText("Inset Item");
      expect(item.classList.contains("pl-7")).toBe(true);
    });

    it("applies destructive variant styling", async () => {
      render(() => (
        <Dropdown.Root>
          <Dropdown.Trigger>Menu</Dropdown.Trigger>
          <Dropdown.Portal>
            <Dropdown.Content>
              <Dropdown.Item variant="destructive">Delete</Dropdown.Item>
            </Dropdown.Content>
          </Dropdown.Portal>
        </Dropdown.Root>
      ));

      fireEvent.click(screen.getByText("Menu"));
      await Promise.resolve();

      const item = screen.getByText("Delete");
      expect(item.classList.contains("text-error")).toBe(true);
    });

    it("item applies min-h-7 and py-1 for compact density", async () => {
      render(() => (
        <Dropdown.Root>
          <Dropdown.Trigger>Menu</Dropdown.Trigger>
          <Dropdown.Portal>
            <Dropdown.Content>
              <Dropdown.Item>Item</Dropdown.Item>
            </Dropdown.Content>
          </Dropdown.Portal>
        </Dropdown.Root>
      ));

      fireEvent.click(screen.getByText("Menu"));
      await Promise.resolve();

      const item = screen.getByText("Item");
      expect(item.classList.contains("min-h-7")).toBe(true);
      expect(item.classList.contains("py-1")).toBe(true);
    });

    it("renders Shortcut right-aligned with muted color", async () => {
      render(() => (
        <Dropdown.Root>
          <Dropdown.Trigger>Menu</Dropdown.Trigger>
          <Dropdown.Portal>
            <Dropdown.Content>
              <Dropdown.Item>
                Settings
                <Dropdown.Shortcut>⌘,</Dropdown.Shortcut>
              </Dropdown.Item>
            </Dropdown.Content>
          </Dropdown.Portal>
        </Dropdown.Root>
      ));

      fireEvent.click(screen.getByText("Menu"));
      await Promise.resolve();

      const shortcut = screen.getByText("⌘,");
      expect(shortcut.classList.contains("ml-auto")).toBe(true);
      expect(shortcut.classList.contains("text-on-surface-variant")).toBe(true);
    });
  });

  describe("Controlled Mode", () => {
    it("calls onOpenChange when controlled", async () => {
      const onOpenChange = vi.fn();

      render(() => (
        <Dropdown.Root isOpen={false} onOpenChange={onOpenChange}>
          <Dropdown.Trigger>Menu</Dropdown.Trigger>
          <Dropdown.Portal>
            <Dropdown.Content>
              <Dropdown.Item>Item 1</Dropdown.Item>
            </Dropdown.Content>
          </Dropdown.Portal>
        </Dropdown.Root>
      ));

      fireEvent.click(screen.getByText("Menu"));
      await Promise.resolve();

      expect(onOpenChange).toHaveBeenCalledWith(true);
    });
  });

  describe("Link", () => {
    it("renders <a> with role='menuitem' and href passthrough", async () => {
      render(() => (
        <Dropdown.Root>
          <Dropdown.Trigger>Menu</Dropdown.Trigger>
          <Dropdown.Portal>
            <Dropdown.Content>
              <Dropdown.Link href="/home">Home</Dropdown.Link>
            </Dropdown.Content>
          </Dropdown.Portal>
        </Dropdown.Root>
      ));

      fireEvent.click(screen.getByText("Menu"));
      await Promise.resolve();

      const link = screen.getByText("Home");
      expect(link.tagName).toBe("A");
      expect(link.getAttribute("role")).toBe("menuitem");
      expect(link.getAttribute("href")).toBe("/home");
    });

    it("ArrowDown focuses link and sets data-active='true'", async () => {
      render(() => (
        <Dropdown.Root>
          <Dropdown.Trigger>Menu</Dropdown.Trigger>
          <Dropdown.Portal>
            <Dropdown.Content>
              <Dropdown.Item>Item 1</Dropdown.Item>
              <Dropdown.Link href="/home">Home</Dropdown.Link>
            </Dropdown.Content>
          </Dropdown.Portal>
        </Dropdown.Root>
      ));

      fireEvent.click(screen.getByText("Menu"));
      await Promise.resolve();

      const content = screen.getByRole("menu");

      // First ArrowDown -> Item 1
      fireEvent.keyDown(content, { key: "ArrowDown" });
      await Promise.resolve();
      expect(screen.getByText("Item 1").getAttribute("data-active")).toBe(
        "true"
      );

      // Second ArrowDown -> Link
      fireEvent.keyDown(content, { key: "ArrowDown" });
      await Promise.resolve();
      expect(screen.getByText("Home").getAttribute("data-active")).toBe("true");
    });

    it("click calls onSelect and closes dropdown", async () => {
      const handleSelect = vi.fn();

      render(() => (
        <Dropdown.Root>
          <Dropdown.Trigger>Menu</Dropdown.Trigger>
          <Dropdown.Portal>
            <Dropdown.Content>
              <Dropdown.Link href="/home" onSelect={handleSelect}>
                Home
              </Dropdown.Link>
            </Dropdown.Content>
          </Dropdown.Portal>
        </Dropdown.Root>
      ));

      fireEvent.click(screen.getByText("Menu"));
      await Promise.resolve();

      fireEvent.click(screen.getByText("Home"));
      await Promise.resolve();

      expect(handleSelect).toHaveBeenCalledTimes(1);
      expect(screen.queryByText("Home")).toBeNull();
    });

    it("isDisabled prevents onSelect and keyboard activation", async () => {
      const handleSelect = vi.fn();

      render(() => (
        <Dropdown.Root>
          <Dropdown.Trigger>Menu</Dropdown.Trigger>
          <Dropdown.Portal>
            <Dropdown.Content>
              <Dropdown.Link href="/home" isDisabled onSelect={handleSelect}>
                Home
              </Dropdown.Link>
            </Dropdown.Content>
          </Dropdown.Portal>
        </Dropdown.Root>
      ));

      fireEvent.click(screen.getByText("Menu"));
      await Promise.resolve();

      const content = screen.getByRole("menu");

      // ArrowDown to focus the link
      fireEvent.keyDown(content, { key: "ArrowDown" });
      await Promise.resolve();

      // Enter should not trigger onSelect
      fireEvent.keyDown(content, { key: "Enter" });
      await Promise.resolve();

      expect(handleSelect).not.toHaveBeenCalled();
      expect(screen.getByText("Home")).not.toBeNull();
    });

    it("polymorphic as prop renders custom component", async () => {
      function CustomLink(props: { href: string; children: JSX.Element }) {
        return <a data-testid="custom-link" {...props} />;
      }

      render(() => (
        <Dropdown.Root>
          <Dropdown.Trigger>Menu</Dropdown.Trigger>
          <Dropdown.Portal>
            <Dropdown.Content>
              <Dropdown.Link as={CustomLink} href="/home">
                Home
              </Dropdown.Link>
            </Dropdown.Content>
          </Dropdown.Portal>
        </Dropdown.Root>
      ));

      fireEvent.click(screen.getByText("Menu"));
      await Promise.resolve();

      const customLink = screen.getByTestId("custom-link");
      expect(customLink).not.toBeNull();
      expect(customLink.getAttribute("href")).toBe("/home");
    });

    it("passes target and rel props to anchor", async () => {
      render(() => (
        <Dropdown.Root>
          <Dropdown.Trigger>Menu</Dropdown.Trigger>
          <Dropdown.Portal>
            <Dropdown.Content>
              <Dropdown.Link
                href="https://github.com"
                rel="noopener noreferrer"
                target="_blank"
              >
                GitHub
              </Dropdown.Link>
            </Dropdown.Content>
          </Dropdown.Portal>
        </Dropdown.Root>
      ));

      fireEvent.click(screen.getByText("Menu"));
      await Promise.resolve();

      const link = screen.getByText("GitHub");
      expect(link.getAttribute("href")).toBe("https://github.com");
      expect(link.getAttribute("target")).toBe("_blank");
      expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    });
  });

  describe("Caption", () => {
    it("renders <div> with role='presentation'", async () => {
      render(() => (
        <Dropdown.Root>
          <Dropdown.Trigger>Menu</Dropdown.Trigger>
          <Dropdown.Portal>
            <Dropdown.Content>
              <Dropdown.Caption>Glyphide v1.0</Dropdown.Caption>
            </Dropdown.Content>
          </Dropdown.Portal>
        </Dropdown.Root>
      ));

      fireEvent.click(screen.getByText("Menu"));
      await Promise.resolve();

      const caption = screen.getByText("Glyphide v1.0");
      expect(caption.tagName).toBe("DIV");
      expect(caption.getAttribute("role")).toBe("presentation");
    });

    it("excluded from keyboard navigation", async () => {
      render(() => (
        <Dropdown.Root>
          <Dropdown.Trigger>Menu</Dropdown.Trigger>
          <Dropdown.Portal>
            <Dropdown.Content>
              <Dropdown.Item>Item 1</Dropdown.Item>
              <Dropdown.Caption>Glyphide v1.0</Dropdown.Caption>
              <Dropdown.Item>Item 2</Dropdown.Item>
            </Dropdown.Content>
          </Dropdown.Portal>
        </Dropdown.Root>
      ));

      fireEvent.click(screen.getByText("Menu"));
      await Promise.resolve();

      const content = screen.getByRole("menu");

      // Navigate to Item 1
      fireEvent.keyDown(content, { key: "ArrowDown" });
      await Promise.resolve();
      expect(screen.getByText("Item 1").getAttribute("data-active")).toBe(
        "true"
      );

      // ArrowDown should skip Caption and go to Item 2
      fireEvent.keyDown(content, { key: "ArrowDown" });
      await Promise.resolve();
      expect(screen.getByText("Item 2").getAttribute("data-active")).toBe(
        "true"
      );

      // Caption should never have data-active
      expect(
        screen.getByText("Glyphide v1.0").getAttribute("data-active")
      ).toBeNull();
    });

    it("does not register with dropdown context", async () => {
      render(() => (
        <Dropdown.Root>
          <Dropdown.Trigger>Menu</Dropdown.Trigger>
          <Dropdown.Portal>
            <Dropdown.Content>
              <Dropdown.Item>Item 1</Dropdown.Item>
              <Dropdown.Caption>Glyphide v1.0</Dropdown.Caption>
            </Dropdown.Content>
          </Dropdown.Portal>
        </Dropdown.Root>
      ));

      fireEvent.click(screen.getByText("Menu"));
      await Promise.resolve();

      const content = screen.getByRole("menu");
      const menuitems = content.querySelectorAll('[role="menuitem"]');
      expect(menuitems).toHaveLength(1);
      expect(menuitems[0].textContent).toBe("Item 1");
    });

    it("does not have font-medium class", async () => {
      render(() => (
        <Dropdown.Root>
          <Dropdown.Trigger>Menu</Dropdown.Trigger>
          <Dropdown.Portal>
            <Dropdown.Content>
              <Dropdown.Caption>Glyphide v1.0</Dropdown.Caption>
            </Dropdown.Content>
          </Dropdown.Portal>
        </Dropdown.Root>
      ));

      fireEvent.click(screen.getByText("Menu"));
      await Promise.resolve();

      const caption = screen.getByText("Glyphide v1.0");
      expect(caption.classList.contains("font-medium")).toBe(false);
      expect(caption.classList.contains("text-on-surface-variant")).toBe(true);
      expect(caption.classList.contains("text-xs")).toBe(true);
    });

    it("merges custom class without overriding base classes", async () => {
      render(() => (
        <Dropdown.Root>
          <Dropdown.Trigger>Menu</Dropdown.Trigger>
          <Dropdown.Portal>
            <Dropdown.Content>
              <Dropdown.Caption class="mt-2">Glyphide v1.0</Dropdown.Caption>
            </Dropdown.Content>
          </Dropdown.Portal>
        </Dropdown.Root>
      ));

      fireEvent.click(screen.getByText("Menu"));
      await Promise.resolve();

      const caption = screen.getByText("Glyphide v1.0");
      expect(caption.classList.contains("mt-2")).toBe(true);
      expect(caption.classList.contains("text-xs")).toBe(true);
      expect(caption.classList.contains("text-on-surface-variant")).toBe(true);
    });
  });

  describe("Composition", () => {
    it("opens dropdown when trigger is composed via 'as' prop with extra event handlers", async () => {
      // Mimics the real composition chain: Tooltip → Popover.Trigger → Dynamic(as=Dropdown.Trigger)
      // The wrapper component renders Dropdown.Trigger with extra event handlers
      // and ref, just like Popover.Trigger does.
      function ComposedTrigger(props: {
        children: JSX.Element;
        "aria-label"?: string;
      }) {
        const noop = vi.fn();
        return (
          <Dropdown.Trigger
            aria-label={props["aria-label"]}
            as="button"
            onBlur={noop}
            onFocus={noop}
            onMouseEnter={noop}
            onMouseLeave={noop}
          >
            {props.children}
          </Dropdown.Trigger>
        );
      }

      render(() => (
        <Dropdown.Root>
          <ComposedTrigger aria-label="Menu Trigger">Menu</ComposedTrigger>
          <Dropdown.Portal>
            <Dropdown.Content>
              <Dropdown.Item>Item 1</Dropdown.Item>
            </Dropdown.Content>
          </Dropdown.Portal>
        </Dropdown.Root>
      ));

      expect(screen.queryByText("Item 1")).toBeNull();

      fireEvent.click(screen.getByText("Menu"));
      await Promise.resolve();

      expect(screen.getByText("Item 1")).not.toBeNull();
    });

    it("chains onClick when parent passes its own onClick to trigger", async () => {
      const parentClick = vi.fn();

      render(() => (
        <Dropdown.Root>
          <Dropdown.Trigger as="button" onClick={parentClick}>
            Menu
          </Dropdown.Trigger>
          <Dropdown.Portal>
            <Dropdown.Content>
              <Dropdown.Item>Item 1</Dropdown.Item>
            </Dropdown.Content>
          </Dropdown.Portal>
        </Dropdown.Root>
      ));

      fireEvent.click(screen.getByText("Menu"));
      await Promise.resolve();

      expect(parentClick).toHaveBeenCalledTimes(1);
      expect(screen.getByText("Item 1")).not.toBeNull();
    });

    it("forwards ref and chains handlers across Content, Item, CheckboxItem, and Link", async () => {
      const triggerClick = vi.fn();
      const contentKeyDown = vi.fn();
      const itemSelect = vi.fn();
      const itemClick = vi.fn();
      const checkboxChange = vi.fn();
      const checkboxClick = vi.fn();
      const checkboxKeyDown = vi.fn();
      const linkSelect = vi.fn();
      const linkClick = vi.fn();

      let triggerEl: HTMLButtonElement | undefined;
      let contentEl: HTMLDivElement | undefined;
      let itemEl: HTMLDivElement | undefined;
      let checkboxEl: HTMLDivElement | undefined;
      let linkEl: HTMLAnchorElement | undefined;

      render(() => (
        <Dropdown.Root>
          <Dropdown.Trigger
            onClick={triggerClick}
            ref={(el) => {
              triggerEl = el;
            }}
          >
            Menu
          </Dropdown.Trigger>
          <Dropdown.Portal>
            <Dropdown.Content
              onKeyDown={contentKeyDown}
              ref={(el) => {
                contentEl = el;
              }}
            >
              <Dropdown.Item
                onClick={itemClick}
                onSelect={itemSelect}
                ref={(el) => {
                  itemEl = el;
                }}
              >
                Action Item
              </Dropdown.Item>
              <Dropdown.CheckboxItem
                isChecked={false}
                onCheckedChange={checkboxChange}
                onClick={checkboxClick}
                onKeyDown={checkboxKeyDown}
                ref={(el) => {
                  checkboxEl = el;
                }}
              >
                Check Item
              </Dropdown.CheckboxItem>
              <Dropdown.Link
                href="/docs"
                onClick={linkClick}
                onSelect={linkSelect}
                ref={(el) => {
                  linkEl = el;
                }}
              >
                Docs Link
              </Dropdown.Link>
            </Dropdown.Content>
          </Dropdown.Portal>
        </Dropdown.Root>
      ));

      const trigger = screen.getByText("Menu");
      expect(triggerEl).toBe(trigger);

      fireEvent.click(trigger);
      await Promise.resolve();
      expect(triggerClick).toHaveBeenCalledTimes(1);

      const content = screen.getByRole("menu");
      const item = screen.getByText("Action Item");
      const checkbox = screen.getByText("Check Item");
      const link = screen.getByText("Docs Link");

      expect(contentEl).toBe(content);
      expect(itemEl).toBe(item);
      expect(checkboxEl).toBe(checkbox);
      expect(linkEl).toBe(link);

      // CheckboxItem chains both onKeyDown and onClick alongside onCheckedChange
      fireEvent.keyDown(checkbox, { key: "Enter" });
      expect(checkboxKeyDown).toHaveBeenCalledTimes(1);
      expect(checkboxChange).toHaveBeenCalledWith(true);
      expect(contentKeyDown).toHaveBeenCalledTimes(1);

      fireEvent.click(checkbox);
      expect(checkboxClick).toHaveBeenCalledTimes(1);
      expect(checkboxChange).toHaveBeenCalledTimes(2);

      // Content onKeyDown chains without breaking keyboard navigation
      fireEvent.keyDown(content, { key: "ArrowDown" });
      await Promise.resolve();
      expect(contentKeyDown).toHaveBeenCalledTimes(2);
      expect(item.getAttribute("data-active")).toBe("true");

      // Outside click still works (proves internal triggerRef and contentRef remain wired)
      fireEvent.mouseDown(content);
      await Promise.resolve();
      expect(screen.queryByRole("menu")).not.toBeNull();

      // Item chains onClick and still invokes onSelect and closes menu
      fireEvent.click(item);
      await Promise.resolve();
      expect(itemClick).toHaveBeenCalledTimes(1);
      expect(itemSelect).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole("menu")).toBeNull();

      // Re-open to verify Link chains onClick and closes menu
      fireEvent.click(trigger);
      await Promise.resolve();

      fireEvent.click(screen.getByText("Docs Link"));
      await Promise.resolve();
      expect(linkClick).toHaveBeenCalledTimes(1);
      expect(linkSelect).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole("menu")).toBeNull();
    });
  });

  describe("Positioning", () => {
    it("passes default offset (4) and placement ('bottom-start') to computePosition", async () => {
      vi.useFakeTimers();

      render(() => (
        <Dropdown.Root>
          <Dropdown.Trigger>Menu</Dropdown.Trigger>
          <Dropdown.Portal>
            <Dropdown.Content>
              <Dropdown.Item>Item 1</Dropdown.Item>
            </Dropdown.Content>
          </Dropdown.Portal>
        </Dropdown.Root>
      ));

      fireEvent.click(screen.getByText("Menu"));
      await vi.advanceTimersByTimeAsync(20);

      expect(computePositionSpy).toHaveBeenCalled();
      const lastOptions = computePositionSpy.mock.lastCall?.[2] as {
        middleware: { name: string; options?: unknown }[];
        placement: string;
      };
      expect(lastOptions.placement).toBe("bottom-start");
      expect(lastOptions.middleware).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: "offset", options: 4 }),
        ])
      );
    });

    it("passes custom offset and placement props from Dropdown.Root to computePosition and updates reactively", async () => {
      vi.useFakeTimers();
      const [offset, setOffset] = createSignal(12);
      const [placement, setPlacement] = createSignal<"top-end" | "right-start">(
        "top-end"
      );

      render(() => (
        <Dropdown.Root offset={offset()} placement={placement()}>
          <Dropdown.Trigger>Menu</Dropdown.Trigger>
          <Dropdown.Portal>
            <Dropdown.Content>
              <Dropdown.Item>Item 1</Dropdown.Item>
            </Dropdown.Content>
          </Dropdown.Portal>
        </Dropdown.Root>
      ));

      fireEvent.click(screen.getByText("Menu"));
      await vi.advanceTimersByTimeAsync(20);

      expect(computePositionSpy).toHaveBeenCalled();
      const initialOptions = computePositionSpy.mock.lastCall?.[2] as {
        middleware: { name: string; options?: unknown }[];
        placement: string;
      };
      expect(initialOptions.placement).toBe("top-end");
      expect(initialOptions.middleware).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: "offset", options: 12 }),
        ])
      );

      computePositionSpy.mockClear();
      setOffset(20);
      setPlacement("right-start");
      flush();
      await vi.advanceTimersByTimeAsync(20);

      expect(computePositionSpy).toHaveBeenCalled();
      const updatedOptions = computePositionSpy.mock.lastCall?.[2] as {
        middleware: { name: string; options?: unknown }[];
        placement: string;
      };
      expect(updatedOptions.placement).toBe("right-start");
      expect(updatedOptions.middleware).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: "offset", options: 20 }),
        ])
      );
    });
  });

  describe("Lifecycle Cleanup", () => {
    it("cancels pending focus requestAnimationFrame when Dropdown.Content unmounts", async () => {
      vi.useFakeTimers();
      const cancelSpy = vi.spyOn(globalThis, "cancelAnimationFrame");

      const { unmount } = render(() => (
        <Dropdown.Root isOpen={true}>
          <Dropdown.Trigger>Menu</Dropdown.Trigger>
          <Dropdown.Portal>
            <Dropdown.Content>
              <Dropdown.Item>Item 1</Dropdown.Item>
            </Dropdown.Content>
          </Dropdown.Portal>
        </Dropdown.Root>
      ));

      const content = screen.getByRole("menu");
      const focusSpy = vi.spyOn(content, "focus");

      unmount();

      expect(cancelSpy).toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(50);
      expect(focusSpy).not.toHaveBeenCalled();
    });
  });

  describe("Context contract", () => {
    it("throws native ContextNotFoundError when useDropdown is called outside Dropdown.Root", () => {
      function OrphanConsumer() {
        useDropdown();
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
});
