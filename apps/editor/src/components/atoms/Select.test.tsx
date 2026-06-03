import { fireEvent, render } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";
import { Select } from "./Select.tsx";

describe("Select", () => {
  it("renders a select element with options", () => {
    const { getByRole, getAllByRole } = render(() => (
      <Select>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </Select>
    ));

    const select = getByRole("combobox");
    expect(select).toBeTruthy();

    const options = getAllByRole("option");
    expect(options).toHaveLength(2);
    expect(options[0].textContent).toBe("Light");
  });

  it("applies custom classes along with base styles", () => {
    const { getByRole } = render(() => (
      <Select class="custom-select-class">
        <option value="test">Test</option>
      </Select>
    ));

    const select = getByRole("combobox");
    expect(select.className).toContain("custom-select-class");
    expect(select.className).toContain("appearance-none");
  });

  it("handles onChange events", () => {
    const handleChange = vi.fn();
    const { getByRole } = render(() => (
      <Select onChange={handleChange}>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </Select>
    ));

    const select = getByRole("combobox");
    fireEvent.change(select, { target: { value: "dark" } });

    expect(handleChange).toHaveBeenCalled();
  });

  it("respects the disabled state", () => {
    const { getByRole } = render(() => (
      <Select disabled>
        <option value="light">Light</option>
      </Select>
    ));

    const select = getByRole("combobox") as HTMLSelectElement;
    expect(select.disabled).toBe(true);
    expect(select.className).toContain("disabled:opacity-50");
  });

  it("reflects the selected value", () => {
    const { getByRole } = render(() => (
      <Select value="dark">
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </Select>
    ));

    const select = getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe("dark");
  });
});
