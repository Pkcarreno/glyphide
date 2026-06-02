import { fireEvent, render } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";
import { Input } from "./Input.tsx";

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
    const { getByRole } = render(() => (
      <Input aria-label="test-input" variant="ghost" />
    ));
    const wrapper = getByRole("textbox").parentElement;
    expect(wrapper?.className).toContain("bg-transparent");
    expect(wrapper?.className).toContain("border-none");
  });

  it("when rendered with bottomBorder variant, applies bottom-border classes", () => {
    const { getByRole } = render(() => (
      <Input aria-label="test-input" variant="bottomBorder" />
    ));
    const wrapper = getByRole("textbox").parentElement;
    expect(wrapper?.className).toContain("border-b");
    expect(wrapper?.className).toContain("rounded-none");
  });

  it("when rendered with inputSize, applies appropriate size classes to wrapper", () => {
    const { getByRole } = render(() => (
      <Input aria-label="test-input" inputSize="sm" />
    ));
    const wrapper = getByRole("textbox").parentElement;
    expect(wrapper?.className).toContain("h-8");
    expect(wrapper?.className).toContain("text-xs");
  });

  it("when startIcon is provided, renders the icon", () => {
    const { getByText } = render(() => (
      <Input
        aria-label="test-input"
        startIcon={<span data-testid="start-icon">Start</span>}
      />
    ));
    expect(getByText("Start")).toBeTruthy();
  });

  it("when endIcon is provided, renders the icon", () => {
    const { getByText } = render(() => (
      <Input
        aria-label="test-input"
        endIcon={<span data-testid="end-icon">End</span>}
      />
    ));
    expect(getByText("End")).toBeTruthy();
  });

  it("when wrapperClass is provided, appends class to the wrapper", () => {
    const { getByRole } = render(() => (
      <Input aria-label="test-input" wrapperClass="custom-wrapper" />
    ));
    const wrapper = getByRole("textbox").parentElement;
    expect(wrapper?.className).toContain("custom-wrapper");
  });

  it("when class is provided, appends class to the input element", () => {
    const { getByRole } = render(() => (
      <Input aria-label="test-input" class="custom-input" />
    ));
    const input = getByRole("textbox");
    expect(input.className).toContain("custom-input");
  });

  it("when typing, updates the value and triggers events", () => {
    const handler = vi.fn();
    const { getByRole } = render(() => (
      <Input aria-label="test-input" onInput={handler} />
    ));
    const input = getByRole("textbox") as HTMLInputElement;
    fireEvent.input(input, { target: { value: "test" } });
    expect(handler).toHaveBeenCalledOnce();
    expect(input.value).toBe("test");
  });

  it("when disabled, passes the disabled attribute to the input element", () => {
    const { getByRole } = render(() => (
      <Input aria-label="test-input" disabled />
    ));
    const input = getByRole("textbox") as HTMLInputElement;
    expect(input.disabled).toBe(true);
    expect(input.className).toContain("disabled:opacity-50");
  });

  it("when placeholder is provided, sets the placeholder attribute", () => {
    const { getByRole } = render(() => (
      <Input aria-label="test-input" placeholder="Type here" />
    ));
    const input = getByRole("textbox") as HTMLInputElement;
    expect(input.placeholder).toBe("Type here");
  });
});
