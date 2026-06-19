import { render } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import { LogoSquare } from "./LogoSquare.tsx";

describe("LogoSquare", () => {
  it("when rendered, renders a 24x24 SVG logo", () => {
    const { getByRole } = render(() => <LogoSquare />);
    const logo = getByRole("img", { hidden: true });
    expect(logo.getAttribute("width")).toBe("24");
    expect(logo.getAttribute("height")).toBe("24");
  });

  it("when rendered, applies default styling class", () => {
    const { getByRole } = render(() => <LogoSquare />);
    const logo = getByRole("img", { hidden: true });
    expect(logo.getAttribute("class")).toContain("h-6");
    expect(logo.getAttribute("class")).toContain("w-6");
  });

  it("when alt text is provided, uses it as aria-label", () => {
    const { getByRole } = render(() => <LogoSquare alt="Custom Logo" />);
    const logo = getByRole("img");
    expect(logo.getAttribute("aria-label")).toBe("Custom Logo");
  });

  it("when no alt text, marks decoration as aria-hidden", () => {
    const { getByRole } = render(() => <LogoSquare />);
    const logo = getByRole("img", { hidden: true });
    expect(logo.getAttribute("aria-hidden")).toBe("true");
  });
});
