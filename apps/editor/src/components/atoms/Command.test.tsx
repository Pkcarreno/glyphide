import { fireEvent, render, screen } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";
import {
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
  CommandRoot,
} from "./Command.tsx";

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
});
