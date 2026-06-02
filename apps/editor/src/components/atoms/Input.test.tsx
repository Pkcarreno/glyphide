import { render, fireEvent } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";
import { Input } from "./Input";

describe("Input", () => {
  it("when rendered with defaults, applies default variant classes to wrapper", () => {
    const { getByRole } = render(() => <Input aria-label="test-input" />);
    const input = getByRole("textbox");
    const wrapper = input.parentElement;
    expect(wrapper).toBeInstanceOf(HTMLDivElement);
    expect(wrapper?.className).toContain("bg-surface");
    expect(wrapper?.className).toContain("border-outline-variant");
  });

  it("when rendered with ghost variant, applies ghost classes", () => {
    const { getByRole } = render(() => <Input variant="ghost" aria-label="test-input" />);
    const wrapper = getByRole("textbox").parentElement;
    expect(wrapper?.className).toContain("bg-transparent");
    expect(wrapper?.className).toContain("border-none");
  });

  it("when rendered with bottomBorder variant, applies bottom-border classes", () => {
    const { getByRole } = render(() => <Input variant="bottomBorder" aria-label="test-input" />);
    const wrapper = getByRole("textbox").parentElement;
    expect(wrapper?.className).toContain("border-b");
    expect(wrapper?.className).toContain("rounded-none");
  });

  it("when rendered with inputSize, applies appropriate size classes to wrapper", () => {
    const { getByRole } = render(() => <Input inputSize="sm" aria-label="test-input" />);
    const wrapper = getByRole("textbox").parentElement;
    expect(wrapper?.className).toContain("h-8");
    expect(wrapper?.className).toContain("text-xs");
  });

  it("when startIcon is provided, renders the icon", () => {
    const { getByText } = render(() => (
      <Input startIcon={<span data-testid="start-icon">Start</span>} aria-label="test-input" />
    ));
    expect(getByText("Start")).toBeTruthy();
  });

  it("when endIcon is provided, renders the icon", () => {
    const { getByText } = render(() => (
      <Input endIcon={<span data-testid="end-icon">End</span>} aria-label="test-input" />
    ));
    expect(getByText("End")).toBeTruthy();
  });

  it("when wrapperClass is provided, appends class to the wrapper", () => {
    const { getByRole } = render(() => (
      <Input wrapperClass="custom-wrapper" aria-label="test-input" />
    ));
    const wrapper = getByRole("textbox").parentElement;
    expect(wrapper?.className).toContain("custom-wrapper");
  });

  it("when class is provided, appends class to the input element", () => {
    const { getByRole } = render(() => <Input class="custom-input" aria-label="test-input" />);
    const input = getByRole("textbox");
    expect(input.className).toContain("custom-input");
  });

  it("when typing, updates the value and triggers events", () => {
    const handler = vi.fn();
    const { getByRole } = render(() => <Input onInput={handler} aria-label="test-input" />);
    const input = getByRole("textbox") as HTMLInputElement;
    fireEvent.input(input, { target: { value: "test" } });
    expect(handler).toHaveBeenCalledOnce();
    expect(input.value).toBe("test");
  });

  it("when disabled, passes the disabled attribute to the input element", () => {
    const { getByRole } = render(() => <Input disabled aria-label="test-input" />);
    const input = getByRole("textbox") as HTMLInputElement;
    expect(input.disabled).toBe(true);
    expect(input.className).toContain("disabled:opacity-50");
  });

  it("when placeholder is provided, sets the placeholder attribute", () => {
    const { getByRole } = render(() => <Input placeholder="Type here" aria-label="test-input" />);
    const input = getByRole("textbox") as HTMLInputElement;
    expect(input.placeholder).toBe("Type here");
  });
});
