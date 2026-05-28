import { render, screen, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import {
  CommandRoot,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
} from "./Command";

describe("Command", () => {
  it("renders and filters items correctly", async () => {
    const handleSelect1 = vi.fn();
    const handleSelect2 = vi.fn();

    render(() => (
      <CommandRoot>
        <CommandInput placeholder="Search test..." />
        <CommandList>
          <CommandEmpty>No results</CommandEmpty>
          <CommandItem value="apple" onSelect={handleSelect1}>
            Apple
          </CommandItem>
          <CommandItem value="banana" onSelect={handleSelect2}>
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
});
