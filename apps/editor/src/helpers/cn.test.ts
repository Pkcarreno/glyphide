import { describe, expect, it } from "vitest";
import { cn } from "./cn.ts";

describe("cn", () => {
  it("when called with no arguments, returns empty string", () => {
    expect(cn()).toBe("");
  });

  it("when called with a single class, returns it unchanged", () => {
    expect(cn("px-2")).toBe("px-2");
  });

  it("when called with multiple classes, merges them", () => {
    expect(cn("px-2", "py-1")).toBe("px-2 py-1");
  });

  it("when given conflicting Tailwind classes, last one wins", () => {
    const result = cn("px-2", "px-4");
    expect(result).toBe("px-4");
  });

  it("when given falsy values, filters them out", () => {
    const result = cn("px-2", false, null, undefined, "py-1");
    expect(result).toBe("px-2 py-1");
  });

  it("when given conditional expressions, includes only truthy ones", () => {
    const isActive: boolean = true;
    const isDisabled: boolean = false;
    const result = cn(
      "base",
      isActive && "bg-primary",
      isDisabled && "opacity-50"
    );
    expect(result).toBe("base bg-primary");
  });

  it("when given arrays of classes, flattens and merges them", () => {
    const result = cn(["px-2", "py-1"], "mt-4");
    expect(result).toBe("px-2 py-1 mt-4");
  });

  it("when given complex conflicting utilities, resolves correctly", () => {
    const result = cn(
      // biome-ignore lint/nursery/useSortedClasses: it's an intentional test for conflicting classes
      "text-sm font-bold text-red-500",
      // biome-ignore lint/nursery/useSortedClasses: it's an intentional test for conflicting classes
      "text-lg text-blue-500"
    );
    expect(result).toBe("font-bold text-lg text-blue-500");
  });

  it("when given object syntax via clsx, resolves conditionals", () => {
    const result = cn({ "bg-primary": true, "bg-surface": false }, "px-2");
    expect(result).toBe("bg-primary px-2");
  });

  it("when given pb-safearea-b and pb-4, pb-4 wins (last-wins in padding group)", () => {
    const result = cn("pb-safearea-b", "pb-4");
    expect(result).toBe("pb-4");
  });

  it("when given pt-safearea-t and pt-2, pt-2 wins (last-wins in padding group)", () => {
    const result = cn("pt-safearea-t", "pt-2");
    expect(result).toBe("pt-2");
  });

  it("when given all safearea padding classes, merges them together", () => {
    const result = cn(
      "pt-safearea-t",
      "pr-safearea-r",
      "pb-safearea-b",
      "pl-safearea-l"
    );
    expect(result).toBe(
      "pt-safearea-t pr-safearea-r pb-safearea-b pl-safearea-l"
    );
  });
});
