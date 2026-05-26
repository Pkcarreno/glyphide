import { render } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import { EditorPane } from "./EditorPane";

describe("EditorPane", () => {
  it("when rendered, displays code lines", () => {
    const { getByText } = render(() => <EditorPane />);
    expect(getByText("1")).toBeTruthy();
    expect(getByText("serve")).toBeTruthy();
    expect(getByText('"@glyphide/quickjs"')).toBeTruthy();
  });

  it("when rendered, includes line numbers", () => {
    const { getByText } = render(() => <EditorPane />);
    expect(getByText("1")).toBeTruthy();
    expect(getByText("6")).toBeTruthy();
  });

  it("when custom class is provided, merges it", () => {
    const { container } = render(() => <EditorPane class="hidden" />);
    expect(container.firstElementChild?.className).toContain("hidden");
    expect(container.firstElementChild?.className).toContain("flex-1");
  });
});
