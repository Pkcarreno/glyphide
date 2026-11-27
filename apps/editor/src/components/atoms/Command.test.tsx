import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { createSignal, flush, resetErrorHalt, Show } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Command, useCommand } from "./Command.tsx";

afterEach(() => {
  cleanup();
  resetErrorHalt();
});

describe("Command", () => {
  it("renders and filters items correctly", async () => {
    const handleSelect1 = vi.fn();
    const handleSelect2 = vi.fn();

    render(() => (
      <Command.Root>
        <Command.Input placeholder="Search test..." />
        <Command.List>
          <Command.Empty>No results</Command.Empty>
          <Command.Item onSelect={handleSelect1} value="apple">
            Apple
          </Command.Item>
          <Command.Item onSelect={handleSelect2} value="banana">
            Banana
          </Command.Item>
        </Command.List>
      </Command.Root>
    ));

    expect(screen.getByPlaceholderText("Search test...")).toBeTruthy();
    expect(screen.getByText("Apple")).toBeTruthy();
    expect(screen.getByText("Banana")).toBeTruthy();

    const input = screen.getByPlaceholderText("Search test...");

    fireEvent.input(input, { target: { value: "app" } });

    await Promise.resolve();

    expect(screen.getByText("Apple")).toBeTruthy();
    expect(screen.queryByText("Banana")).toBeNull();

    fireEvent.click(screen.getByText("Apple"));
    expect(handleSelect1).toHaveBeenCalledTimes(1);
    expect(handleSelect2).not.toHaveBeenCalled();
  });

  it("root uses shadow-md and ring-1 instead of border", () => {
    render(() => (
      <Command.Root data-testid="command-root">
        <Command.List>
          <Command.Item value="test">Test</Command.Item>
        </Command.List>
      </Command.Root>
    ));

    const root = screen.getByTestId("command-root");
    expect(root.className).toContain("shadow-md");
    expect(root.className).toContain("ring-1");
    expect(root.className).toContain("ring-on-surface/10");
  });

  it("item uses min-h-7, text-xs, rounded-sm, and compact padding", () => {
    render(() => (
      <Command.Root>
        <Command.List>
          <Command.Item value="test">Test Item</Command.Item>
        </Command.List>
      </Command.Root>
    ));

    const item = screen.getByText("Test Item");
    expect(item.className).toContain("min-h-7");
    expect(item.className).toContain("text-xs");
    expect(item.className).toContain("rounded-sm");
    expect(item.className).toContain("px-2.5");
    expect(item.className).toContain("py-1.5");
  });

  it("derives initial selection to first visible item and resets to first match when search changes", async () => {
    const { getByPlaceholderText, getByRole, getByText } = render(() => (
      <Command.Root>
        <Command.Input placeholder="Filter..." />
        <Command.List>
          <Command.Empty>No results</Command.Empty>
          <Command.Item value="alpha">Alpha</Command.Item>
          <Command.Item value="beta">Beta</Command.Item>
        </Command.List>
      </Command.Root>
    ));

    const alpha = getByText("Alpha");
    const beta = getByText("Beta");
    expect(alpha.getAttribute("aria-selected")).toBe("true");
    expect(beta.getAttribute("aria-selected")).toBe("false");

    const root = getByRole("combobox");
    fireEvent.keyDown(root, { key: "ArrowDown" });
    await Promise.resolve();
    expect(beta.getAttribute("aria-selected")).toBe("true");

    const input = getByPlaceholderText("Filter...");
    fireEvent.input(input, { target: { value: "bet" } });
    await Promise.resolve();
    expect(getByText("Beta").getAttribute("aria-selected")).toBe("true");

    fireEvent.input(input, { target: { value: "" } });
    await Promise.resolve();
    expect(getByText("Alpha").getAttribute("aria-selected")).toBe("true");
  });

  it("chains onInput and composes ref on Command.Input without breaking auto-focus", async () => {
    const callerOnInput = vi.fn();
    let callerInputRef: HTMLInputElement | undefined;

    render(() => (
      <Command.Root>
        <Command.Input
          onInput={callerOnInput}
          placeholder="Search..."
          ref={(el) => {
            callerInputRef = el;
          }}
        />
        <Command.List>
          <Command.Item value="apple">Apple</Command.Item>
          <Command.Item value="banana">Banana</Command.Item>
        </Command.List>
      </Command.Root>
    ));

    const input = screen.getByPlaceholderText("Search...");
    expect(callerInputRef).toBe(input);

    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(document.activeElement).toBe(input);

    fireEvent.input(input, { target: { value: "ban" } });
    await Promise.resolve();

    expect(callerOnInput).toHaveBeenCalledOnce();
    expect(screen.queryByText("Apple")).toBeNull();
    expect(screen.getByText("Banana")).toBeTruthy();
  });

  it("chains handlers and composes ref on Command.Item and Command.Root", async () => {
    const onRootKeyDown = vi.fn();
    const onSelect = vi.fn();
    const onItemClick = vi.fn();
    const onItemKeyDown = vi.fn();
    const onItemMouseEnter = vi.fn();
    let rootEl: HTMLDivElement | undefined;
    let itemEl: HTMLDivElement | undefined;

    const { getByRole, getByText } = render(() => (
      <Command.Root
        onKeyDown={onRootKeyDown}
        ref={(el) => {
          rootEl = el;
        }}
      >
        <Command.List>
          <Command.Item value="alpha">Alpha</Command.Item>
          <Command.Item
            onClick={onItemClick}
            onKeyDown={onItemKeyDown}
            onMouseEnter={onItemMouseEnter}
            onSelect={onSelect}
            ref={(el) => {
              itemEl = el;
            }}
            value="beta"
          >
            Beta
          </Command.Item>
        </Command.List>
      </Command.Root>
    ));

    const root = getByRole("combobox");
    const beta = getByText("Beta");
    expect(rootEl).toBe(root);
    expect(itemEl).toBe(beta);

    fireEvent.keyDown(root, { key: "ArrowDown" });
    await Promise.resolve();
    expect(onRootKeyDown).toHaveBeenCalledOnce();
    expect(beta.getAttribute("aria-selected")).toBe("true");

    fireEvent.mouseEnter(beta);
    await Promise.resolve();
    expect(onItemMouseEnter).toHaveBeenCalledOnce();
    expect(beta.getAttribute("aria-selected")).toBe("true");

    fireEvent.keyDown(beta, { key: " " });
    expect(onItemKeyDown).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledTimes(1);

    fireEvent.click(beta);
    expect(onItemClick).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledTimes(2);
  });

  it("Command.Empty resolves children before falling back to default message", () => {
    const [hasCustomEmpty, setHasCustomEmpty] = createSignal(false);

    render(() => (
      <Command.Root>
        <Command.List>
          <Command.Empty>
            <Show when={hasCustomEmpty()}>
              <span>Nothing matched</span>
            </Show>
          </Command.Empty>
        </Command.List>
      </Command.Root>
    ));

    expect(screen.getByText("No results found.")).toBeTruthy();
    expect(screen.queryByText("Nothing matched")).toBeNull();

    setHasCustomEmpty(true);
    flush();

    expect(screen.queryByText("No results found.")).toBeNull();
    expect(screen.getByText("Nothing matched")).toBeTruthy();
  });

  it("throws native ContextNotFoundError when useCommand is called outside Command.Root", () => {
    function OrphanConsumer() {
      useCommand();
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

  it("defaults Command.Input placeholder to Search... and tracks reactive shouldFilter", async () => {
    const [shouldFilter, setShouldFilter] = createSignal(true);
    const { getByPlaceholderText } = render(() => (
      <Command.Root shouldFilter={shouldFilter()}>
        <Command.Input />
        <Command.List>
          <Command.Item value="apple">Apple</Command.Item>
          <Command.Item value="banana">Banana</Command.Item>
        </Command.List>
      </Command.Root>
    ));

    const input = getByPlaceholderText("Search...");
    fireEvent.input(input, { target: { value: "app" } });
    await Promise.resolve();

    expect(screen.getByText("Apple")).toBeTruthy();
    expect(screen.queryByText("Banana")).toBeNull();

    setShouldFilter(false);
    flush();

    expect(screen.getByText("Apple")).toBeTruthy();
    expect(screen.getByText("Banana")).toBeTruthy();
  });

  it("renders Command.Group with optional heading", () => {
    render(() => (
      <Command.Root>
        <Command.List>
          <Command.Group heading="Engines">
            <Command.Item value="quickjs">QuickJS</Command.Item>
          </Command.Group>
        </Command.List>
      </Command.Root>
    ));

    expect(screen.getByText("Engines")).toBeTruthy();
    expect(screen.getByText("QuickJS")).toBeTruthy();
  });
});

describe("Command.Dialog", () => {
  it("uses top-aligned Dialog.Content with max-w-lg and p-0, and merges custom class", () => {
    const [isOpen, setIsOpen] = createSignal(false);
    const { queryByRole, getByRole } = render(() => (
      <Command.Dialog
        class="max-w-xl"
        isOpen={isOpen()}
        onOpenChange={setIsOpen}
      >
        <Command.Root>
          <Command.List>
            <Command.Item value="item">Item</Command.Item>
          </Command.List>
        </Command.Root>
      </Command.Dialog>
    ));

    expect(queryByRole("dialog")).toBeNull();

    setIsOpen(true);
    flush();

    const dialog = getByRole("dialog");
    expect(dialog.className).toContain("p-0");
    expect(dialog.className).toContain("max-w-xl");

    const wrapper = dialog.parentElement as HTMLElement;
    expect(wrapper.className).toContain("items-start");
    expect(wrapper.className).toContain("pt-[15vh]");
  });

  it("closes via shared Dialog backdrop overlay", () => {
    const onOpenChange = vi.fn();
    const { container, getByRole } = render(() => (
      <Command.Dialog isOpen onOpenChange={onOpenChange}>
        <Command.Root>
          <Command.List>
            <Command.Item value="item">Item</Command.Item>
          </Command.List>
        </Command.Root>
      </Command.Dialog>
    ));

    const dialog = getByRole("dialog");
    expect(dialog.className).toContain("max-w-lg");
    expect(dialog.className).toContain("p-0");

    const overlay = container.querySelector('[aria-hidden="true"]');
    expect(overlay).not.toBeNull();
    overlay?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
