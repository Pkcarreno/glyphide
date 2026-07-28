import { render } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import { SafeAreaContainer } from "./SafeAreaContainer.tsx";

describe("SafeAreaContainer", () => {
  it("when rendered with children, renders them correctly", () => {
    const { getByText } = render(() => (
      <SafeAreaContainer>
        <span>Test Child</span>
      </SafeAreaContainer>
    ));

    expect(getByText("Test Child")).toBeTruthy();
  });

  it("when rendered, applies safe-area padding classes", () => {
    const { container } = render(() => (
      <SafeAreaContainer>
        <span>Child</span>
      </SafeAreaContainer>
    ));

    const div = container.querySelector("div");
    expect(div?.className).toContain("pt-safearea-t");
    expect(div?.className).toContain("pb-safearea-b");
    expect(div?.className).toContain("pl-safearea-l");
    expect(div?.className).toContain("pr-safearea-r");
  });

  it("when custom class is provided, merges with safe-area classes", () => {
    const { container } = render(() => (
      <SafeAreaContainer class="custom-padding">
        <span>Child</span>
      </SafeAreaContainer>
    ));

    const div = container.querySelector("div");
    expect(div?.className).toContain("custom-padding");
    expect(div?.className).toContain("pt-safearea-t");
  });

  it("when rendered with no children, applies safe-area padding without errors", () => {
    const { container } = render(() => <SafeAreaContainer />);

    const div = container.querySelector("div");
    expect(div?.className).toContain("pt-safearea-t");
    expect(div?.className).toContain("pb-safearea-b");
  });
});
