import { render } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./Button.tsx";

describe("Button", () => {
  it("when rendered with defaults, applies ghost variant classes", () => {
    const { getByRole } = render(() => <Button>Click</Button>);
    const btn = getByRole("button");
    expect(btn).toBeInstanceOf(HTMLButtonElement);
    expect(btn.className).toContain("bg-transparent");
    expect(btn.className).toContain("text-on-surface-variant");
    expect(btn.className).toContain("h-7");
    expect(btn.className).toContain("focus-ring");
  });

  it("when rendered with primary variant, applies primary classes", () => {
    const { getByRole } = render(() => <Button variant="primary">Run</Button>);
    const btn = getByRole("button");
    expect(btn.className).toContain("bg-surface-variant");
    expect(btn.className).toContain("border");
  });

  it("when rendered with outline variant, applies outline classes", () => {
    const { getByRole } = render(() => (
      <Button variant="outline">Share</Button>
    ));
    const btn = getByRole("button");
    expect(btn.className).toContain("border-outline-variant");
  });

  it("when rendered with icon size, applies icon dimensions", () => {
    const { getByRole } = render(() => <Button size="icon">X</Button>);
    const btn = getByRole("button");
    expect(btn.className).toContain("px-1");
    expect(btn.className).toContain("h-7");
    expect(btn.className).toContain("w-7");
  });

  it("when rendered with sm size, applies small padding", () => {
    const { getByRole } = render(() => <Button size="sm">S</Button>);
    const btn = getByRole("button");
    expect(btn.className).toContain("px-1.5");
  });

  it("when custom class is provided, merges with defaults", () => {
    const { getByRole } = render(() => <Button class="mt-4">Custom</Button>);
    const btn = getByRole("button");
    expect(btn.className).toContain("mt-4");
    expect(btn.className).toContain("inline-flex");
  });

  it("when custom class conflicts with variant, custom wins", () => {
    const { getByRole } = render(() => (
      <Button class="bg-red-500" variant="primary">
        Override
      </Button>
    ));
    const btn = getByRole("button");
    expect(btn.className).toContain("bg-red-500");
    expect(btn.className).not.toContain("bg-surface-variant");
  });

  it("when clicked, fires onClick handler", () => {
    const handler = vi.fn();
    const { getByRole } = render(() => (
      <Button onClick={handler}>Click me</Button>
    ));
    getByRole("button").click();
    expect(handler).toHaveBeenCalledOnce();
  });

  it("when disabled, has disabled attribute and reduced opacity", () => {
    const handler = vi.fn();
    const { getByRole } = render(() => (
      <Button disabled onClick={handler}>
        Nope
      </Button>
    ));
    const btn = getByRole("button");
    expect(btn).toHaveProperty("disabled", true);
    expect(btn.className).toContain("disabled:opacity-50");
  });

  it("when rendered, includes touch-target sizing variable", () => {
    const { getByRole } = render(() => <Button>Touch</Button>);
    const btn = getByRole("button");
    expect(btn.className).toContain("min-h-[var(--ui-target-size)]");
  });

  it("when rendered, applies focus-ring utility and SVG sizing in base styles", () => {
    const { getByRole } = render(() => <Button>Test</Button>);
    const btn = getByRole("button");
    expect(btn.className).toContain("focus-ring");
    expect(btn.className).toContain(
      "active:not-aria-[haspopup]:translate-y-px"
    );
    expect(btn.className).toContain("[&_svg]:size-3.5");
  });

  it("when children is a complex JSX node, renders it", () => {
    const { getByRole, getByText } = render(() => (
      <Button>
        <span>Icon</span> Run
      </Button>
    ));
    expect(getByRole("button")).toBeTruthy();
    expect(getByText("Icon")).toBeTruthy();
  });
});
