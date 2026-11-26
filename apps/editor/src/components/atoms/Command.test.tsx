import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
  CommandRoot,
} from "./Command.tsx";

afterEach(() => cleanup());

describe("Command", () => {
  it("renders and filters items correctly", async () => {
    const handleSelect1 = vi.fn();
    const handleSelect2 = vi.fn();

    render(() => (
      <CommandRoot>
        <CommandInput placeholder="Search test..." />
        <CommandList>
          <CommandEmpty>No results</CommandEmpty>
          <CommandItem onSelect={handleSelect1} value="apple">
            Apple
          </CommandItem>
          <CommandItem onSelect={handleSelect2} value="banana">
            Banana
          </CommandItem>
        </CommandList>
      </CommandRoot>
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
      <CommandRoot data-testid="command-root">
        <CommandList>
          <CommandItem value="test">Test</CommandItem>
        </CommandList>
      </CommandRoot>
    ));

    const root = screen.getByTestId("command-root");
    expect(root.className).toContain("shadow-md");
    expect(root.className).toContain("ring-1");
    expect(root.className).toContain("ring-on-surface/10");
  });

  it("item uses min-h-7, text-xs, rounded-sm, and compact padding", () => {
    render(() => (
      <CommandRoot>
        <CommandList>
          <CommandItem value="test">Test Item</CommandItem>
        </CommandList>
      </CommandRoot>
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
      <CommandRoot>
        <CommandInput placeholder="Filter..." />
        <CommandList>
          <CommandEmpty>No results</CommandEmpty>
          <CommandItem value="alpha">Alpha</CommandItem>
          <CommandItem value="beta">Beta</CommandItem>
        </CommandList>
      </CommandRoot>
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

  it("chains onInput and composes ref on CommandInput without breaking auto-focus", async () => {
    const callerOnInput = vi.fn();
    let callerInputRef: HTMLInputElement | undefined;

    render(() => (
      <CommandRoot>
        <CommandInput
          onInput={callerOnInput}
          placeholder="Search..."
          ref={(el) => {
            callerInputRef = el;
          }}
        />
        <CommandList>
          <CommandItem value="apple">Apple</CommandItem>
          <CommandItem value="banana">Banana</CommandItem>
        </CommandList>
      </CommandRoot>
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

  it("chains handlers and composes ref on CommandItem and CommandRoot", async () => {
    const onRootKeyDown = vi.fn();
    const onSelect = vi.fn();
    const onItemClick = vi.fn();
    const onItemKeyDown = vi.fn();
    const onItemMouseEnter = vi.fn();
    let rootEl: HTMLDivElement | undefined;
    let itemEl: HTMLDivElement | undefined;

    const { getByRole, getByText } = render(() => (
      <CommandRoot
        onKeyDown={onRootKeyDown}
        ref={(el) => {
          rootEl = el;
        }}
      >
        <CommandList>
          <CommandItem value="alpha">Alpha</CommandItem>
          <CommandItem
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
          </CommandItem>
        </CommandList>
      </CommandRoot>
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
});
