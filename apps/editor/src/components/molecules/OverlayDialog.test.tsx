import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { createSignal, flush } from "solid-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OverlayId } from "../../core/models/overlay.ts";
import type { CommandId } from "../../core/shortcuts/registry.ts";
import { Dialog } from "../atoms/Dialog.tsx";
import { OverlayDialog } from "./OverlayDialog.tsx";

const [activeOverlays, setActiveOverlays] = createSignal<Set<OverlayId>>(
  new Set()
);
const mockOpen = vi.fn((id: OverlayId) => {
  setActiveOverlays((prev) => {
    const next = new Set(prev);
    next.add(id);
    return next;
  });
});
const mockClose = vi.fn((id: OverlayId) => {
  setActiveOverlays((prev) => {
    const next = new Set(prev);
    next.delete(id);
    return next;
  });
});

vi.mock("../../core/context.tsx", () => ({
  useEditor: () => ({
    overlays: {
      close: mockClose,
      isOpen: (id: OverlayId) => activeOverlays().has(id),
      open: mockOpen,
    },
    shortcuts: {
      getBinding: (commandId: CommandId) => {
        if (commandId === "close-all-overlays") {
          return { commandId: "close-all-overlays", label: "Escape" };
        }
        if (commandId === "toggle-settings") {
          return { commandId: "toggle-settings", label: "Ctrl+," };
        }
      },
    },
  }),
}));

beforeEach(() => {
  setActiveOverlays(new Set<OverlayId>());
  mockOpen.mockClear();
  mockClose.mockClear();
});

afterEach(() => {
  cleanup();
});

describe("OverlayDialog.Root", () => {
  it("reflects core.overlays.isOpen state reactively", () => {
    const { queryByRole } = render(() => (
      <OverlayDialog.Root overlayId="settings">
        <OverlayDialog.Content>
          <OverlayDialog.Header>
            <OverlayDialog.Title>Settings</OverlayDialog.Title>
          </OverlayDialog.Header>
        </OverlayDialog.Content>
      </OverlayDialog.Root>
    ));

    expect(queryByRole("dialog")).toBeNull();

    setActiveOverlays(new Set<OverlayId>(["settings"]));
    flush();
    expect(queryByRole("dialog")).not.toBeNull();

    setActiveOverlays(new Set<OverlayId>());
    flush();
    expect(queryByRole("dialog")).toBeNull();
  });

  it("opens and closes via core.overlays and invokes secondary onOpenChange", () => {
    const onOpenChange = vi.fn();
    const { getByTestId, queryByRole } = render(() => (
      <OverlayDialog.Root onOpenChange={onOpenChange} overlayId="share">
        <OverlayDialog.Trigger data-testid="trigger">
          Open
        </OverlayDialog.Trigger>
        <OverlayDialog.Content>
          <OverlayDialog.Close data-testid="close-btn">X</OverlayDialog.Close>
        </OverlayDialog.Content>
      </OverlayDialog.Root>
    ));

    getByTestId("trigger").click();
    expect(mockOpen).toHaveBeenCalledWith("share");
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(queryByRole("dialog")).not.toBeNull();

    getByTestId("close-btn").click();
    expect(mockClose).toHaveBeenCalledWith("share");
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(queryByRole("dialog")).toBeNull();
  });

  it("closes via core.overlays and invokes secondary onOpenChange on backdrop click", () => {
    const onOpenChange = vi.fn();
    setActiveOverlays(new Set<OverlayId>(["load-file"]));
    const { container, queryByRole } = render(() => (
      <OverlayDialog.Root onOpenChange={onOpenChange} overlayId="load-file">
        <OverlayDialog.Content>Content</OverlayDialog.Content>
      </OverlayDialog.Root>
    ));

    const backdrop = container.querySelector('[aria-hidden="true"]');
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop as HTMLElement);

    expect(mockClose).toHaveBeenCalledWith("load-file");
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(queryByRole("dialog")).toBeNull();
  });

  it("does not close on backdrop click when preventBackdropClose is true", () => {
    const onOpenChange = vi.fn();
    setActiveOverlays(new Set<OverlayId>(["trust-required"]));
    const { container, queryByRole } = render(() => (
      <OverlayDialog.Root
        onOpenChange={onOpenChange}
        overlayId="trust-required"
      >
        <OverlayDialog.Content preventBackdropClose>
          Content
        </OverlayDialog.Content>
      </OverlayDialog.Root>
    ));

    const backdrop = container.querySelector('[aria-hidden="true"]');
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop as HTMLElement);

    expect(mockClose).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(queryByRole("dialog")).not.toBeNull();
  });

  it("reactively tracks overlayId changes", () => {
    const [overlayId, setOverlayId] = createSignal<OverlayId>("settings");
    setActiveOverlays(new Set<OverlayId>(["share"]));

    const { getByTestId, queryByRole } = render(() => (
      <OverlayDialog.Root overlayId={overlayId()}>
        <OverlayDialog.Content>
          <OverlayDialog.Close data-testid="close-btn">X</OverlayDialog.Close>
        </OverlayDialog.Content>
      </OverlayDialog.Root>
    ));

    expect(queryByRole("dialog")).toBeNull();

    setOverlayId("share");
    flush();
    expect(queryByRole("dialog")).not.toBeNull();

    getByTestId("close-btn").click();
    expect(mockClose).toHaveBeenCalledWith("share");
  });
});

describe("OverlayDialog.Close", () => {
  it("shows tooltip with close-all-overlays shortcut on hover", () => {
    setActiveOverlays(new Set<OverlayId>(["settings"]));
    const { getByRole } = render(() => (
      <OverlayDialog.Root overlayId="settings">
        <OverlayDialog.Content>
          <OverlayDialog.Close aria-label="Close settings">
            X
          </OverlayDialog.Close>
        </OverlayDialog.Content>
      </OverlayDialog.Root>
    ));

    const closeBtn = getByRole("button", { name: "Close settings" });
    expect(closeBtn.getAttribute("type")).toBe("button");

    fireEvent.mouseEnter(closeBtn);
    const tooltip = screen.queryByRole("tooltip");
    expect(tooltip).not.toBeNull();
    expect(tooltip?.textContent).toContain("Close");
    expect(tooltip?.textContent).toContain("Escape");
  });

  it("supports overriding text and commandId and chains onClick and ref", () => {
    const onCallerClick = vi.fn();
    let closeEl: HTMLButtonElement | undefined;
    setActiveOverlays(new Set<OverlayId>(["settings"]));

    const { getByRole, queryByRole } = render(() => (
      <OverlayDialog.Root overlayId="settings">
        <OverlayDialog.Content>
          <OverlayDialog.Close
            aria-label="Dismiss"
            class="custom-close"
            commandId="toggle-settings"
            onClick={onCallerClick}
            ref={(el) => {
              closeEl = el;
            }}
            text="Dismiss"
          >
            X
          </OverlayDialog.Close>
        </OverlayDialog.Content>
      </OverlayDialog.Root>
    ));

    const closeBtn = getByRole("button", { name: "Dismiss" });
    expect(closeEl).toBe(closeBtn);
    expect(closeBtn.className).toContain("custom-close");

    fireEvent.mouseEnter(closeBtn);
    const tooltip = screen.queryByRole("tooltip");
    expect(tooltip).not.toBeNull();
    expect(tooltip?.textContent).toContain("Dismiss");
    expect(tooltip?.textContent).toContain("Ctrl+,");

    closeBtn.click();
    expect(onCallerClick).toHaveBeenCalledOnce();
    expect(mockClose).toHaveBeenCalledWith("settings");
    expect(queryByRole("dialog")).toBeNull();
  });
});

describe("OverlayDialog subparts", () => {
  it("re-exports Dialog modal subparts", () => {
    expect(OverlayDialog.Content).toBe(Dialog.Content);
    expect(OverlayDialog.Header).toBe(Dialog.Header);
    expect(OverlayDialog.Overlay).toBe(Dialog.Overlay);
    expect(OverlayDialog.Title).toBe(Dialog.Title);
    expect(OverlayDialog.Trigger).toBe(Dialog.Trigger);
  });
});
