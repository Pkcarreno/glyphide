import { render } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";
import { SplitButton } from "./SplitButton";

describe("SplitButton", () => {
  it("when rendered, contains two buttons", () => {
    const { getAllByRole } = render(() => (
      <SplitButton>Run</SplitButton>
    ));
    expect(getAllByRole("button")).toHaveLength(2);
  });

  it("when main button is clicked, fires onMainClick", () => {
    const mainHandler = vi.fn();
    const { getAllByRole } = render(() => (
      <SplitButton onMainClick={mainHandler}>Run</SplitButton>
    ));
    const [mainBtn] = getAllByRole("button");
    mainBtn.click();
    expect(mainHandler).toHaveBeenCalledOnce();
  });

  it("when dropdown button is clicked, fires onDropdownClick", () => {
    const dropdownHandler = vi.fn();
    const { getAllByRole } = render(() => (
      <SplitButton onDropdownClick={dropdownHandler}>Run</SplitButton>
    ));
    const [, dropdownBtn] = getAllByRole("button");
    dropdownBtn.click();
    expect(dropdownHandler).toHaveBeenCalledOnce();
  });

  it("when disabled is true, both buttons are disabled", () => {
    const { getAllByRole } = render(() => (
      <SplitButton disabled>Run</SplitButton>
    ));
    const [mainBtn, dropdownBtn] = getAllByRole("button");
    expect(mainBtn).toHaveProperty("disabled", true);
    expect(dropdownBtn).toHaveProperty("disabled", true);
  });

  it("when variant is provided, applies to both buttons", () => {
    const { getAllByRole } = render(() => (
      <SplitButton variant="primary">Run</SplitButton>
    ));
    const [mainBtn, dropdownBtn] = getAllByRole("button");
    expect(mainBtn.className).toContain("bg-surface-variant");
    expect(dropdownBtn.className).toContain("bg-surface-variant");
  });

  it("when dropdownLabel is provided, sets aria-label on dropdown button", () => {
    const { getAllByRole } = render(() => (
      <SplitButton dropdownLabel="Custom Options">Run</SplitButton>
    ));
    const [, dropdownBtn] = getAllByRole("button");
    expect(dropdownBtn.getAttribute("aria-label")).toBe("Custom Options");
  });

  it("when no dropdownLabel is provided, uses default aria-label", () => {
    const { getAllByRole } = render(() => (
      <SplitButton>Run</SplitButton>
    ));
    const [, dropdownBtn] = getAllByRole("button");
    expect(dropdownBtn.getAttribute("aria-label")).toBe("More options");
  });
});
