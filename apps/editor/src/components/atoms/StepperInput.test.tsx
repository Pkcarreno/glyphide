import { fireEvent, render } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StepperInput } from "./StepperInput.tsx";

describe("StepperInput", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders with InputGroup structure and data-slot", () => {
    const { container } = render(() => (
      <StepperInput onValueChange={() => undefined} value={42} />
    ));

    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("data-slot")).toBe("input-group");
  });

  it("renders with initial value in the input", () => {
    const { getByRole } = render(() => (
      <StepperInput onValueChange={() => undefined} value={42} />
    ));
    const input = getByRole("spinbutton") as HTMLInputElement;
    expect(input.value).toBe("42");
  });

  it("renders decrement and increment buttons with correct labels", () => {
    const { getByLabelText } = render(() => (
      <StepperInput onValueChange={() => undefined} value={10} />
    ));
    expect(getByLabelText("Decrease")).toBeDefined();
    expect(getByLabelText("Increase")).toBeDefined();
  });

  it("increments value by step when clicking increment button", () => {
    const handleChange = vi.fn();
    const { getByLabelText } = render(() => (
      <StepperInput onValueChange={handleChange} value={10} />
    ));

    fireEvent.click(getByLabelText("Increase"));
    expect(handleChange).toHaveBeenCalledWith(11);
  });

  it("decrements value by step when clicking decrement button", () => {
    const handleChange = vi.fn();
    const { getByLabelText } = render(() => (
      <StepperInput onValueChange={handleChange} value={10} />
    ));

    fireEvent.click(getByLabelText("Decrease"));
    expect(handleChange).toHaveBeenCalledWith(9);
  });

  it("respects custom step value", () => {
    const handleChange = vi.fn();
    const { getByLabelText } = render(() => (
      <StepperInput onValueChange={handleChange} step={5} value={10} />
    ));

    fireEvent.click(getByLabelText("Increase"));
    expect(handleChange).toHaveBeenCalledWith(15);

    fireEvent.click(getByLabelText("Decrease"));
    expect(handleChange).toHaveBeenCalledWith(5);
  });

  it("disables decrement button at min boundary", () => {
    const handleChange = vi.fn();
    const { getByLabelText } = render(() => (
      <StepperInput min={0} onValueChange={handleChange} value={0} />
    ));

    const decrementBtn = getByLabelText("Decrease") as HTMLButtonElement;
    expect(decrementBtn.disabled).toBe(true);

    fireEvent.click(decrementBtn);
    expect(handleChange).not.toHaveBeenCalled();
  });

  it("disables increment button at max boundary", () => {
    const handleChange = vi.fn();
    const { getByLabelText } = render(() => (
      <StepperInput max={10} onValueChange={handleChange} value={10} />
    ));

    const incrementBtn = getByLabelText("Increase") as HTMLButtonElement;
    expect(incrementBtn.disabled).toBe(true);

    fireEvent.click(incrementBtn);
    expect(handleChange).not.toHaveBeenCalled();
  });

  it("calls onValueChange when input value changes directly", () => {
    const handleChange = vi.fn();
    const { getByRole } = render(() => (
      <StepperInput onValueChange={handleChange} value={10} />
    ));

    const input = getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "15" } });

    expect(handleChange).toHaveBeenCalledWith(15);
  });

  it("applies disabled state to all interactive elements", () => {
    const { container, getByRole, getByLabelText } = render(() => (
      <StepperInput disabled={true} onValueChange={() => undefined} value={5} />
    ));

    const root = container.firstElementChild as HTMLElement;
    const input = getByRole("spinbutton") as HTMLInputElement;
    const decrementBtn = getByLabelText("Decrease") as HTMLButtonElement;
    const incrementBtn = getByLabelText("Increase") as HTMLButtonElement;

    expect(root.className).toContain("opacity-50");
    expect(input.disabled).toBe(true);
    expect(decrementBtn.disabled).toBe(true);
    expect(incrementBtn.disabled).toBe(true);
  });

  it("handles decimal step values correctly", () => {
    const handleChange = vi.fn();
    const { getByLabelText } = render(() => (
      <StepperInput onValueChange={handleChange} step={0.1} value={1.0} />
    ));

    fireEvent.click(getByLabelText("Increase"));
    expect(handleChange).toHaveBeenCalledWith(1.1);

    fireEvent.click(getByLabelText("Decrease"));
    expect(handleChange).toHaveBeenCalledWith(0.9);
  });
});
