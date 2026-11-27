import type { Placement } from "@floating-ui/dom";
import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { createSignal, flush, Show } from "solid-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFloatingAnchor } from "./create-floating-anchor.ts";

const { autoUpdateCleanupSpy, autoUpdateSpy, computePositionSpy } = vi.hoisted(
  () => ({
    autoUpdateCleanupSpy: vi.fn(),
    autoUpdateSpy: vi.fn(),
    computePositionSpy: vi.fn(),
  })
);

vi.mock("@floating-ui/dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@floating-ui/dom")>();
  computePositionSpy.mockImplementation(async () => ({ x: 12.6, y: 24.4 }));
  autoUpdateSpy.mockImplementation(
    (_reference: Element, _floating: Element, update: () => void) => {
      update();
      return autoUpdateCleanupSpy;
    }
  );
  return {
    ...actual,
    autoUpdate: autoUpdateSpy,
    computePosition: computePositionSpy,
  };
});

describe("createFloatingAnchor", () => {
  beforeEach(() => {
    autoUpdateCleanupSpy.mockClear();
    autoUpdateSpy.mockClear();
    computePositionSpy.mockClear();
    computePositionSpy.mockImplementation(async () => ({ x: 12.6, y: 24.4 }));
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("tracks triggerEl and floatingEl signals and computes rounded coordinates when open", async () => {
    const [isOpen, setIsOpen] = createSignal(false);
    let anchorRef!: ReturnType<typeof createFloatingAnchor>;

    const { getByTestId } = render(() => {
      anchorRef = createFloatingAnchor({
        isOpen,
        offset: () => 6,
        onOutsideClick: vi.fn(),
        placement: () => "bottom-start",
      });

      return (
        <div>
          <button
            data-testid="trigger"
            ref={anchorRef.setTriggerRef}
            type="button"
          >
            Trigger
          </button>
          <Show when={isOpen()}>
            <div data-testid="floating" ref={anchorRef.setFloatingRef}>
              Floating
            </div>
          </Show>
        </div>
      );
    });

    expect(anchorRef.triggerEl()).toBe(getByTestId("trigger"));
    expect(anchorRef.floatingEl()).toBeUndefined();
    expect(anchorRef.isPositioned()).toBe(false);
    expect(anchorRef.coords()).toEqual({ left: 0, top: 0 });
    expect(autoUpdateSpy).not.toHaveBeenCalled();

    setIsOpen(true);
    flush();

    await vi.waitFor(() => {
      expect(anchorRef.floatingEl()).toBe(getByTestId("floating"));
      expect(autoUpdateSpy).toHaveBeenCalledOnce();
      expect(computePositionSpy).toHaveBeenCalledWith(
        getByTestId("trigger"),
        getByTestId("floating"),
        expect.objectContaining({
          placement: "bottom-start",
        })
      );
      expect(anchorRef.coords()).toEqual({ left: 13, top: 24 });
      expect(anchorRef.isPositioned()).toBe(true);
    });
  });

  it("repositions automatically when offset or placement changes and cleans up previous autoUpdate", async () => {
    const [isOpen, setIsOpen] = createSignal(true);
    const [offset, setOffset] = createSignal(4);
    const [placement, setPlacement] = createSignal<Placement>("bottom");

    render(() => {
      const anchor = createFloatingAnchor({
        isOpen,
        offset,
        onOutsideClick: vi.fn(),
        placement,
      });

      return (
        <div>
          <button ref={anchor.setTriggerRef} type="button">
            Trigger
          </button>
          <Show when={isOpen()}>
            <div ref={anchor.setFloatingRef}>Floating</div>
          </Show>
        </div>
      );
    });

    flush();
    await Promise.resolve();

    expect(autoUpdateSpy).toHaveBeenCalledTimes(1);
    expect(computePositionSpy).toHaveBeenCalledTimes(1);

    setOffset(16);
    setPlacement("top-end");
    flush();
    await Promise.resolve();

    expect(autoUpdateCleanupSpy).toHaveBeenCalledTimes(1);
    expect(autoUpdateSpy).toHaveBeenCalledTimes(2);
    expect(computePositionSpy).toHaveBeenCalledTimes(2);
    const latestOptions = computePositionSpy.mock.lastCall?.[2] as {
      middleware: { name: string; options?: unknown }[];
      placement: Placement;
    };
    expect(latestOptions.placement).toBe("top-end");
    expect(latestOptions.middleware).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "offset", options: 16 }),
      ])
    );

    setIsOpen(false);
    flush();
    expect(autoUpdateCleanupSpy).toHaveBeenCalledTimes(2);
  });

  it("resets isPositioned on close and ignores stale async computePosition resolutions", async () => {
    let resolvePosition!: (coords: { x: number; y: number }) => void;
    computePositionSpy.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolvePosition = resolve;
        })
    );

    const [isOpen, setIsOpen] = createSignal(true);
    let anchorRef!: ReturnType<typeof createFloatingAnchor>;

    render(() => {
      anchorRef = createFloatingAnchor({
        isOpen,
        offset: () => 4,
        onOutsideClick: vi.fn(),
        placement: () => "bottom",
      });

      return (
        <div>
          <button ref={anchorRef.setTriggerRef} type="button">
            Trigger
          </button>
          <Show when={isOpen()}>
            <div ref={anchorRef.setFloatingRef}>Floating</div>
          </Show>
        </div>
      );
    });

    flush();
    expect(anchorRef.isPositioned()).toBe(false);

    // Close before computePosition resolves
    setIsOpen(false);
    flush();

    resolvePosition({ x: 99, y: 88 });
    await Promise.resolve();

    expect(anchorRef.isPositioned()).toBe(false);
    expect(anchorRef.coords()).toEqual({ left: 0, top: 0 });
  });

  it("calls onOutsideClick only when open and target is outside trigger and floating, and cleans up listener on unmount", () => {
    const [isOpen, setIsOpen] = createSignal(false);
    const onOutsideClick = vi.fn();

    const { getByTestId, unmount } = render(() => {
      const anchor = createFloatingAnchor({
        isOpen,
        offset: () => 4,
        onOutsideClick,
        placement: () => "bottom",
      });

      return (
        <div>
          <button
            data-testid="trigger"
            ref={anchor.setTriggerRef}
            type="button"
          >
            Trigger
          </button>
          <Show when={isOpen()}>
            <div data-testid="floating" ref={anchor.setFloatingRef}>
              <span>Inside</span>
            </div>
          </Show>
        </div>
      );
    });

    // Closed: outside click should not fire callback
    fireEvent.mouseDown(document.body);
    expect(onOutsideClick).not.toHaveBeenCalled();

    setIsOpen(true);
    flush();

    // Clicking trigger or floating should not fire onOutsideClick
    fireEvent.mouseDown(getByTestId("trigger"));
    fireEvent.mouseDown(getByTestId("floating"));
    expect(onOutsideClick).not.toHaveBeenCalled();

    // Clicking outside should fire onOutsideClick
    fireEvent.mouseDown(document.body);
    expect(onOutsideClick).toHaveBeenCalledTimes(1);

    // Unmount should remove document mousedown listener and run autoUpdate cleanup
    unmount();
    expect(autoUpdateCleanupSpy).toHaveBeenCalled();

    fireEvent.mouseDown(document.body);
    expect(onOutsideClick).toHaveBeenCalledTimes(1);
  });
});
