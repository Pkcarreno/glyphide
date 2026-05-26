import { render } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import { Icon } from "./Icon";

import type { LucideProps } from "lucide-solid";

/** Minimal stub that mimics a lucide-solid icon component. */
function MockIcon(props: LucideProps) {
  return (
    <svg
      data-testid="mock-icon"
      width={props.size}
      height={props.size}
      class={props.class}
      aria-hidden={props["aria-hidden"]}
      aria-label={props["aria-label"]}
    />
  );
}

describe("Icon", () => {
  it("when rendered with defaults, uses size 14", () => {
    const { getByTestId } = render(() => <Icon icon={MockIcon} />);
    const svg = getByTestId("mock-icon");
    expect(svg.getAttribute("width")).toBe("14");
    expect(svg.getAttribute("height")).toBe("14");
  });

  it("when custom size is provided, passes it through", () => {
    const { getByTestId } = render(() => (
      <Icon icon={MockIcon} size={20} />
    ));
    const svg = getByTestId("mock-icon");
    expect(svg.getAttribute("width")).toBe("20");
  });

  it("when no label, marks icon as decorative (aria-hidden)", () => {
    const { getByTestId } = render(() => <Icon icon={MockIcon} />);
    expect(getByTestId("mock-icon").getAttribute("aria-hidden")).toBe(
      "true",
    );
  });

  it("when label is provided, exposes it as aria-label", () => {
    const { getByTestId } = render(() => (
      <Icon icon={MockIcon} label="Settings" />
    ));
    const svg = getByTestId("mock-icon");
    expect(svg.getAttribute("aria-label")).toBe("Settings");
    expect(svg.getAttribute("aria-hidden")).not.toBe("true");
  });

  it("when custom class is provided, merges it", () => {
    const { getByTestId } = render(() => (
      <Icon icon={MockIcon} class="text-primary" />
    ));
    const svg = getByTestId("mock-icon");
    expect(svg.getAttribute("class")).toContain("text-primary");
    expect(svg.getAttribute("class")).toContain("shrink-0");
  });
});
