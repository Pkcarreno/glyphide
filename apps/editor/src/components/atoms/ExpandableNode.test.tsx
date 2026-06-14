import { fireEvent, render } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import { ExpandableNode } from "./ExpandableNode.tsx";

describe("ExpandableNode", () => {
  it("renders the preview content", () => {
    const { container } = render(() => (
      <ExpandableNode preview={<span>Preview Text</span>}>
        <div>Expanded Content</div>
      </ExpandableNode>
    ));
    expect(container.textContent).toContain("Preview Text");
  });

  it("is collapsed by default when defaultExpanded is false", () => {
    const { container } = render(() => (
      <ExpandableNode preview={<span>Preview Text</span>}>
        <div>Expanded Content</div>
      </ExpandableNode>
    ));
    expect(container.textContent).not.toContain("Expanded Content");
  });

  it("is expanded by default when defaultExpanded is true", () => {
    const { container } = render(() => (
      <ExpandableNode defaultExpanded preview={<span>Preview Text</span>}>
        <div>Expanded Content</div>
      </ExpandableNode>
    ));
    expect(container.textContent).toContain("Expanded Content");
  });

  it("toggles expanded state when the trigger button is clicked", () => {
    const { container } = render(() => (
      <ExpandableNode preview={<span>Preview Text</span>}>
        <div>Expanded Content</div>
      </ExpandableNode>
    ));

    const toggleButton = container.querySelector("button");
    if (!toggleButton) {
      throw new Error("Button not found");
    }

    expect(container.textContent).not.toContain("Expanded Content");

    fireEvent.click(toggleButton);
    expect(container.textContent).toContain("Expanded Content");

    fireEvent.click(toggleButton);
    expect(container.textContent).not.toContain("Expanded Content");
  });
  it("persists expanded state across remounts using stateKey", () => {
    const key = { some: "reference" };
    const { container, unmount } = render(() => (
      <ExpandableNode preview={<span>Preview</span>} stateKey={key}>
        <div>Expanded Content</div>
      </ExpandableNode>
    ));

    const toggleButton = container.querySelector("button");
    if (!toggleButton) {
      throw new Error("Button not found");
    }

    fireEvent.click(toggleButton);
    expect(container.textContent).toContain("Expanded Content");

    unmount();

    const { container: container2 } = render(() => (
      <ExpandableNode preview={<span>Preview</span>} stateKey={key}>
        <div>Expanded Content</div>
      </ExpandableNode>
    ));

    expect(container2.textContent).toContain("Expanded Content");
  });
});
