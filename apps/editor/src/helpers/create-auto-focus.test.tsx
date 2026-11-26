import { cleanup, render } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAutoFocus } from "./create-auto-focus.ts";

describe("createAutoFocus", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("focuses the attached element on the next macrotask", () => {
    vi.useFakeTimers();

    const { getByRole } = render(() => (
      <input ref={[createAutoFocus<HTMLInputElement>()]} type="text" />
    ));

    const input = getByRole("textbox") as HTMLInputElement;
    expect(document.activeElement).not.toBe(input);

    vi.runAllTimers();
    expect(document.activeElement).toBe(input);
  });

  it("selects the element text when select option is true", () => {
    vi.useFakeTimers();

    const { getByRole } = render(() => (
      <input
        ref={[createAutoFocus<HTMLInputElement>({ select: true })]}
        type="text"
        value="glyphide"
      />
    ));

    const input = getByRole("textbox") as HTMLInputElement;
    const selectSpy = vi.spyOn(input, "select");

    vi.runAllTimers();

    expect(document.activeElement).toBe(input);
    expect(selectSpy).toHaveBeenCalledOnce();
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe("glyphide".length);
  });

  it("does not select text when select option is omitted or false", () => {
    vi.useFakeTimers();

    const { getByRole } = render(() => (
      <input
        ref={[createAutoFocus<HTMLInputElement>()]}
        type="text"
        value="glyphide"
      />
    ));

    const input = getByRole("textbox") as HTMLInputElement;
    const selectSpy = vi.spyOn(input, "select");

    vi.runAllTimers();

    expect(document.activeElement).toBe(input);
    expect(selectSpy).not.toHaveBeenCalled();
  });

  it("ignores select option when the element does not implement select()", () => {
    vi.useFakeTimers();

    const { getByRole } = render(() => (
      <button
        ref={[createAutoFocus<HTMLButtonElement>({ select: true })]}
        type="button"
      >
        Action
      </button>
    ));

    const button = getByRole("button");
    vi.runAllTimers();

    expect(document.activeElement).toBe(button);
  });

  it("cancels the pending focus timeout when unmounted before it fires", () => {
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");

    const { getByRole, unmount } = render(() => (
      <input
        ref={[createAutoFocus<HTMLInputElement>({ select: true })]}
        type="text"
      />
    ));

    const input = getByRole("textbox") as HTMLInputElement;
    const focusSpy = vi.spyOn(input, "focus");
    const selectSpy = vi.spyOn(input, "select");

    unmount();
    vi.runAllTimers();

    expect(clearTimeoutSpy).toHaveBeenCalledOnce();
    expect(focusSpy).not.toHaveBeenCalled();
    expect(selectSpy).not.toHaveBeenCalled();
  });
});
