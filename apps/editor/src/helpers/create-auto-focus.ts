import { onSettled } from "solid-js";

/**
 * Options for `createAutoFocus`.
 */
export interface CreateAutoFocusOptions {
  /** Select the element text after focusing when `select()` exists. */
  select?: boolean;
}

function hasSelectMethod(
  element: HTMLElement
): element is HTMLElement & { select: () => void } {
  return "select" in element && typeof element.select === "function";
}

/**
 * Creates a Solid `ref` callback that focuses the target element on the next
 * macrotask after mount and cancels the pending timer on unmount.
 */
export function createAutoFocus<T extends HTMLElement = HTMLElement>(
  options?: CreateAutoFocusOptions
): (element: T) => void {
  let target: T | undefined;

  onSettled(() => {
    const element = target;
    if (!element) {
      return;
    }

    const timerId = setTimeout(() => {
      element.focus();
      if (options?.select && hasSelectMethod(element)) {
        element.select();
      }
    }, 0);

    return () => clearTimeout(timerId);
  });

  return (element: T) => {
    target = element;
  };
}
