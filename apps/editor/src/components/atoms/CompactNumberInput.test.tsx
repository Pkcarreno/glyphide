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

  describe("disabled prop", () => {
    it("disables the input and both stepper buttons when disabled=true", () => {
      const { getByRole, getByLabelText } = render(() => (
        <CompactNumberInput
          disabled={true}
          onValueChange={() => undefined}
          value={5}
        />
      ));

      const input = getByRole("spinbutton") as HTMLInputElement;
      const decreaseBtn = getByLabelText("Decrease") as HTMLButtonElement;
      const increaseBtn = getByLabelText("Increase") as HTMLButtonElement;

      expect(input.disabled).toBe(true);
      expect(decreaseBtn.disabled).toBe(true);
      expect(increaseBtn.disabled).toBe(true);
    });

    it("applies disabled:opacity-50 class to root wrapper when disabled", () => {
      const { container } = render(() => (
        <CompactNumberInput
          disabled={true}
          onValueChange={() => undefined}
          value={5}
        />
      ));

      const root = container.firstElementChild as HTMLElement;
      expect(root.className).toContain("disabled:opacity-50");
    });

    it("keeps input and steppers enabled when disabled is not passed (default)", () => {
      const { getByRole, getByLabelText } = render(() => (
        <CompactNumberInput onValueChange={() => undefined} value={5} />
      ));

      const input = getByRole("spinbutton") as HTMLInputElement;
      const decreaseBtn = getByLabelText("Decrease") as HTMLButtonElement;
      const increaseBtn = getByLabelText("Increase") as HTMLButtonElement;

      expect(input.disabled).toBe(false);
      expect(decreaseBtn.disabled).toBe(false);
      expect(increaseBtn.disabled).toBe(false);
    });

    it("does not apply disabled:opacity-50 class when disabled=false", () => {
      const { container } = render(() => (
        <CompactNumberInput
          disabled={false}
          onValueChange={() => undefined}
          value={5}
        />
      ));

      const root = container.firstElementChild as HTMLElement;
      expect(root.className).not.toContain("disabled:opacity-50");
    });

    it("disabled prop overrides value-based guards (both buttons disabled even within min/max range)", () => {
      const { getByLabelText } = render(() => (
        <CompactNumberInput
          disabled={true}
          max={100}
          min={0}
          onValueChange={() => undefined}
          value={50}
        />
      ));

      // Value is in range, so with disabled=false both buttons would be enabled.
      // With disabled=true, both MUST be disabled regardless.
      const decreaseBtn = getByLabelText("Decrease") as HTMLButtonElement;
      const increaseBtn = getByLabelText("Increase") as HTMLButtonElement;
      expect(decreaseBtn.disabled).toBe(true);
      expect(increaseBtn.disabled).toBe(true);
    });
  });
});
