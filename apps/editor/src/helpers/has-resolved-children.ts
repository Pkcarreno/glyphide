import type { ChildrenReturn } from "solid-js";

/**
 * Checks whether a resolved `children()` memo contains any renderable node.
 * Ignores nullish values, booleans, and empty strings so empty conditional
 * wrappers still trigger fallback UI.
 */
export function hasResolvedChildren(resolved: ChildrenReturn): boolean {
  return resolved
    .toArray()
    .some(
      (child) =>
        child !== null &&
        child !== undefined &&
        typeof child !== "boolean" &&
        child !== ""
    );
}
