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
