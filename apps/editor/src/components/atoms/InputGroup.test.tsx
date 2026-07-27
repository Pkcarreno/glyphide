import { fireEvent, render } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from "./InputGroup.tsx";

describe("InputGroup", () => {
  describe("InputGroup (Root)", () => {
    it("renders with default classes and data-slot", () => {
      const { container } = render(() => (
        <InputGroup>
          <InputGroupInput aria-label="test" />
        </InputGroup>
      ));

      const root = container.firstElementChild as HTMLElement;
      expect(root).toBeInstanceOf(HTMLFieldSetElement);
      expect(root.getAttribute("data-slot")).toBe("input-group");
      expect(root.className).toContain("group/input-group");
      expect(root.className).toContain("border-outline-variant");
      expect(root.className).toContain("bg-surface");
      expect(root.className).toContain("h-7");
      expect(root.className).toContain("rounded-sm");
    });

    it("merges custom class with default classes", () => {
      const { container } = render(() => (
        <InputGroup class="custom-class">
          <InputGroupInput aria-label="test" />
        </InputGroup>
      ));

      const root = container.firstElementChild as HTMLElement;
      expect(root.className).toContain("custom-class");
      expect(root.className).toContain("group/input-group");
    });
  });

  describe("InputGroupAddon", () => {
    it("renders with inline-start alignment by default", () => {
      const { container } = render(() => (
        <InputGroup>
          <InputGroupAddon data-testid="addon">
            <span>Prefix</span>
          </InputGroupAddon>
          <InputGroupInput aria-label="test" />
        </InputGroup>
      ));

      const addon = container.querySelector(
        "[data-testid='addon']"
      ) as HTMLElement;
      expect(addon.getAttribute("data-align")).toBe("inline-start");
      expect(addon.className).toContain("order-first");
    });

    it("applies inline-end alignment variant", () => {
      const { container } = render(() => (
        <InputGroup>
          <InputGroupInput aria-label="test" />
          <InputGroupAddon align="inline-end" data-testid="addon">
            <span>Suffix</span>
          </InputGroupAddon>
        </InputGroup>
      ));

      const addon = container.querySelector(
        "[data-testid='addon']"
      ) as HTMLElement;
      expect(addon.getAttribute("data-align")).toBe("inline-end");
      expect(addon.className).toContain("order-last");
    });
  });

  describe("InputGroupButton", () => {
    it("renders with default xs size and ghost-like styling", () => {
      const { getByRole } = render(() => (
        <InputGroup>
          <InputGroupAddon>
            <InputGroupButton data-testid="btn">X</InputGroupButton>
          </InputGroupAddon>
          <InputGroupInput aria-label="test" />
        </InputGroup>
      ));

      const btn = getByRole("button");
      expect(btn.getAttribute("type")).toBe("button");
      expect(btn.getAttribute("data-size")).toBe("xs");
      expect(btn.className).toContain("bg-transparent");
      expect(btn.className).toContain("text-on-surface-variant");
    });

    it("fires onClick handler when clicked", () => {
      const handleClick = vi.fn();
      const { getByRole } = render(() => (
        <InputGroup>
          <InputGroupAddon>
            <InputGroupButton onClick={handleClick}>Click</InputGroupButton>
          </InputGroupAddon>
          <InputGroupInput aria-label="test" />
        </InputGroup>
      ));

      fireEvent.click(getByRole("button"));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("applies disabled styles when disabled", () => {
      const { getByRole } = render(() => (
        <InputGroup>
          <InputGroupAddon>
            <InputGroupButton disabled>Click</InputGroupButton>
          </InputGroupAddon>
          <InputGroupInput aria-label="test" />
        </InputGroup>
      ));

      const btn = getByRole("button") as HTMLButtonElement;
      expect(btn.disabled).toBe(true);
      expect(btn.className).toContain("disabled:pointer-events-none");
      expect(btn.className).toContain("disabled:opacity-50");
    });
  });

  describe("InputGroupText", () => {
    it("renders text with muted styling", () => {
      const { container } = render(() => (
        <InputGroup>
          <InputGroupAddon>
            <InputGroupText data-testid="text">USD</InputGroupText>
          </InputGroupAddon>
          <InputGroupInput aria-label="amount" />
        </InputGroup>
      ));

      const text = container.querySelector(
        "[data-testid='text']"
      ) as HTMLElement;
      expect(text.tagName).toBe("SPAN");
      expect(text.className).toContain("text-on-surface-variant");
      expect(text.className).toContain("text-xs/relaxed");
    });
  });

  describe("InputGroupInput", () => {
    it("renders with stripped styles and data-slot", () => {
      const { getByRole } = render(() => (
        <InputGroup>
          <InputGroupInput aria-label="test" />
        </InputGroup>
      ));

      const input = getByRole("textbox");
      expect(input.getAttribute("data-slot")).toBe("input-group-control");
      expect(input.className).toContain("bg-transparent");
      expect(input.className).toContain("border-0");
      expect(input.className).toContain("outline-none");
    });

    it("defaults to text type when no type is specified", () => {
      const { getByRole } = render(() => (
        <InputGroup>
          <InputGroupInput aria-label="test" />
        </InputGroup>
      ));

      const input = getByRole("textbox") as HTMLInputElement;
      expect(input.type).toBe("text");
    });

    it("allows overriding the input type", () => {
      const { container } = render(() => (
        <InputGroup>
          <InputGroupInput aria-label="amount" type="number" />
        </InputGroup>
      ));

      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.type).toBe("number");
    });
  });
});
