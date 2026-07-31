import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import type { JSX } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Dropdown } from "./Dropdown.tsx";

afterEach(() => cleanup());

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
  });
});
