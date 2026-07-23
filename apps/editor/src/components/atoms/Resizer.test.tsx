import { render } from "@solidjs/testing-library";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Resizer } from "./Resizer.tsx";

describe("Resizer", () => {
  beforeEach(() => {
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    HTMLElement.prototype.setPointerCapture = vi.fn();
    HTMLElement.prototype.releasePointerCapture = vi.fn();
    HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(true);
  });

  it("when rendered, has role=separator", () => {
    const { getByRole } = render(() => <Resizer />);
    expect(getByRole("separator")).toBeTruthy();
  });

  it("when rendered, has vertical orientation", () => {
    const { getByRole } = render(() => <Resizer />);
    expect(getByRole("separator").getAttribute("aria-orientation")).toBe(
      "vertical"
    );
  });

  it("when rendered, is focusable via tabIndex", () => {
    const { getByRole } = render(() => <Resizer />);
    expect(getByRole("separator").getAttribute("tabindex")).toBe("0");
  });

  it("when rendered, applies resizer visual styles", () => {
    const { getByRole } = render(() => <Resizer />);
    const el = getByRole("separator");
    expect(el.className).toContain("cursor-col-resize");
    expect(el.className).toContain("bg-outline-variant");
  });

  it("when custom class is provided, merges it", () => {
    const { getByRole } = render(() => <Resizer class="mx-1" />);
    expect(getByRole("separator").className).toContain("mx-1");
  });

  it("when pointer down fires, sets cursor on body", () => {
    const { getByRole } = render(() => <Resizer />);
    const sep = getByRole("separator");
    sep.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        clientX: 100,
        pointerId: 1,
      })
    );
    expect(document.body.style.cursor).toBe("col-resize");

    sep.dispatchEvent(
      new PointerEvent("pointerup", { bubbles: true, pointerId: 1 })
    );
    expect(document.body.style.cursor).toBe("");
  });

  it("when dragged, fires onResizeDelta with movementX", () => {
    const onResizeDelta = vi.fn();
    const { getByRole } = render(() => (
      <Resizer onResizeDelta={onResizeDelta} />
    ));
    const sep = getByRole("separator");

    sep.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        pointerId: 1,
      })
    );
    sep.dispatchEvent(
      new PointerEvent("pointermove", {
        bubbles: true,
        movementX: 50,
        pointerId: 1,
      })
    );
    expect(onResizeDelta).toHaveBeenCalledWith(50);

    sep.dispatchEvent(
      new PointerEvent("pointerup", { bubbles: true, pointerId: 1 })
    );
  });

  it("when drag ends, fires onResizeEnd", () => {
    const onResizeEnd = vi.fn();
    const { getByRole } = render(() => <Resizer onResizeEnd={onResizeEnd} />);
    const sep = getByRole("separator");

    sep.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        clientX: 100,
        pointerId: 1,
      })
    );
    sep.dispatchEvent(
      new PointerEvent("pointerup", { bubbles: true, pointerId: 1 })
    );
    expect(onResizeEnd).toHaveBeenCalledOnce();
  });
});
