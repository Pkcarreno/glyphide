import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CompactNumberInput } from "./CompactNumberInput.tsx";

describe("CompactNumberInput", () => {
  afterEach(cleanup);

  it("renders correctly with initial value", () => {
    const { getByRole } = render(() => (
      <CompactNumberInput onValueChange={() => undefined} value={42} />
    ));
    const input = getByRole("spinbutton") as HTMLInputElement;
    expect(input.value).toBe("42");
  });

  it("increments the value when + is clicked", () => {
    const handleValueChange = vi.fn();
    const { getByLabelText } = render(() => (
      <CompactNumberInput onValueChange={handleValueChange} value={10} />
    ));
    fireEvent.click(getByLabelText("Increase"));
    expect(handleValueChange).toHaveBeenCalledWith(11);
  });

  it("decrements the value when - is clicked", () => {
    const handleValueChange = vi.fn();
    const { getByLabelText } = render(() => (
      <CompactNumberInput onValueChange={handleValueChange} value={10} />
    ));
    fireEvent.click(getByLabelText("Decrease"));
    expect(handleValueChange).toHaveBeenCalledWith(9);
  });

  it("uses custom step value", () => {
    const handleValueChange = vi.fn();
    const { getByLabelText } = render(() => (
      <CompactNumberInput
        onValueChange={handleValueChange}
        step={0.5}
        value={10}
      />
    ));
    fireEvent.click(getByLabelText("Increase"));
    expect(handleValueChange).toHaveBeenCalledWith(10.5);
  });

  it("respects max constraint", () => {
    const handleValueChange = vi.fn();
    const { getByLabelText } = render(() => (
      <CompactNumberInput
        max={10}
        onValueChange={handleValueChange}
        value={10}
      />
    ));

    const increaseBtn = getByLabelText("Increase") as HTMLButtonElement;
    expect(increaseBtn.disabled).toBe(true);

    fireEvent.click(increaseBtn);
    expect(handleValueChange).not.toHaveBeenCalled();
  });

  it("respects min constraint", () => {
    const handleValueChange = vi.fn();
    const { getByLabelText } = render(() => (
      <CompactNumberInput min={0} onValueChange={handleValueChange} value={0} />
    ));

    const decreaseBtn = getByLabelText("Decrease") as HTMLButtonElement;
    expect(decreaseBtn.disabled).toBe(true);

    fireEvent.click(decreaseBtn);
    expect(handleValueChange).not.toHaveBeenCalled();
  });

  it("calls onValueChange when input value changes directly", () => {
    const handleValueChange = vi.fn();
    const { getByRole } = render(() => (
      <CompactNumberInput onValueChange={handleValueChange} value={10} />
    ));

    const input = getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "15" } });

    expect(handleValueChange).toHaveBeenCalledWith(15);
  });
});
