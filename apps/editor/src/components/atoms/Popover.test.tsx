import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { afterEach, describe, expect, it } from "vitest";
import { Popover } from "./Popover.tsx";

afterEach(() => cleanup());

describe("Popover", () => {
  it("renders trigger and ignores content when closed", () => {
    render(() => (
      <Popover.Root>
        <Popover.Trigger>Open Popover</Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner>
            <Popover.Popup>Hidden Content</Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    ));

    expect(screen.queryByText("Open Popover")).not.toBeNull();
    expect(screen.queryByText("Hidden Content")).toBeNull();
  });

  it("opens popup on trigger click", async () => {
    render(() => (
      <Popover.Root>
        <Popover.Trigger>Open Popover</Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner>
            <Popover.Popup>Hidden Content</Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    ));

    expect(screen.queryByText("Hidden Content")).toBeNull();

    fireEvent.click(screen.getByText("Open Popover"));

    // Allow portal to render
    await Promise.resolve();

    expect(screen.queryByText("Hidden Content")).not.toBeNull();
  });

  it("when open, popup uses shadow-md, ring-1, text-xs, and p-2.5", async () => {
    render(() => (
      <Popover.Root>
        <Popover.Trigger>Open</Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner>
            <Popover.Popup data-testid="popup">Content</Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    ));

    fireEvent.click(screen.getByText("Open"));
    await Promise.resolve();

    const popup = screen.getByTestId("popup");
    expect(popup.className).toContain("shadow-md");
    expect(popup.className).toContain("ring-1");
    expect(popup.className).toContain("ring-on-surface/10");
    expect(popup.className).toContain("text-xs");
    expect(popup.className).toContain("p-2.5");
  });
});
