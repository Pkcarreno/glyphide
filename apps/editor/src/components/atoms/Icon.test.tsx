import { render } from "@solidjs/testing-library";
import type { LucideProps } from "lucide-solid";
import { describe, expect, it } from "vitest";
import { Icon } from "./Icon.tsx";

/** Minimal stub that mimics a lucide-solid icon component. */
function MockIcon(props: LucideProps) {
  return (
    <svg
      aria-hidden={props["aria-hidden"]}
      aria-label={props["aria-label"]}
      class={props.class}
      data-testid="mock-icon"
      height={props.size}
      width={props.size}
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
    const { getByTestId } = render(() => <Icon icon={MockIcon} size={20} />);
    const svg = getByTestId("mock-icon");
    expect(svg.getAttribute("width")).toBe("20");
  });

  it("when no label, marks icon as decorative (aria-hidden)", () => {
    const { getByTestId } = render(() => <Icon icon={MockIcon} />);
    expect(getByTestId("mock-icon").getAttribute("aria-hidden")).toBe("true");
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
      <Icon class="text-primary" icon={MockIcon} />
    ));
    const svg = getByTestId("mock-icon");
    expect(svg.getAttribute("class")).toContain("text-primary");
    expect(svg.getAttribute("class")).toContain("shrink-0");
  });
});
