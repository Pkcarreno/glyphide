import { fireEvent, render } from "@solidjs/testing-library";
import { createSignal, flush, Show } from "solid-js";
import { describe, expect, it, vi } from "vitest";
import {
  ExpandableNode,
  ExpandableScope,
  ExpandableTrigger,
} from "./ExpandableNode.tsx";

const EXPANDABLE_CONTENT_REGEX = /^expandable-content-/u;

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

  it("persists expanded state and content id across remounts inside ExpandableScope", () => {
    const key = { some: "reference" };
    const [isVisible, setIsVisible] = createSignal(true);
    const { container } = render(() => (
      <ExpandableScope>
        <Show when={isVisible()}>
          <ExpandableNode preview={<span>Preview</span>} stateKey={key}>
            <div>Expanded Content</div>
          </ExpandableNode>
        </Show>
      </ExpandableScope>
    ));

    const toggleButton = container.querySelector("button");
    if (!toggleButton) {
      throw new Error("Button not found");
    }
    const firstContentId = toggleButton.getAttribute("aria-controls");

    fireEvent.click(toggleButton);
    expect(container.textContent).toContain("Expanded Content");

    setIsVisible(false);
    flush();
    expect(container.textContent).not.toContain("Preview");

    setIsVisible(true);
    flush();
    const remountedButton = container.querySelector("button");
    expect(container.textContent).toContain("Expanded Content");
    expect(remountedButton?.getAttribute("aria-expanded")).toBe("true");
    expect(remountedButton?.getAttribute("aria-controls")).toBe(firstContentId);
  });

  it("isolates stateKey expansion state across separate ExpandableScope instances", () => {
    const sharedKey = { shared: "reference" };
    const scopeOne = render(() => (
      <ExpandableScope>
        <ExpandableNode preview={<span>Scope 1</span>} stateKey={sharedKey}>
          <div>Expanded 1</div>
        </ExpandableNode>
      </ExpandableScope>
    ));
    const scopeTwo = render(() => (
      <ExpandableScope>
        <ExpandableNode preview={<span>Scope 2</span>} stateKey={sharedKey}>
          <div>Expanded 2</div>
        </ExpandableNode>
      </ExpandableScope>
    ));

    const buttonOne = scopeOne.container.querySelector("button");
    const buttonTwo = scopeTwo.container.querySelector("button");
    if (!(buttonOne && buttonTwo)) {
      throw new Error("Expected buttons in both scopes");
    }

    fireEvent.click(buttonOne);
    expect(scopeOne.container.textContent).toContain("Expanded 1");
    expect(buttonOne.getAttribute("aria-expanded")).toBe("true");
    expect(scopeTwo.container.textContent).not.toContain("Expanded 2");
    expect(buttonTwo.getAttribute("aria-expanded")).toBe("false");
  });

  it("falls back to per-instance state when rendered outside ExpandableScope", () => {
    const key = { isolated: "reference" };
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

    expect(container2.textContent).not.toContain("Expanded Content");
  });

  it("button has data-expanded attribute matching isExpanded state", () => {
    const { container } = render(() => (
      <ExpandableNode preview={<span>Preview</span>}>
        <div>Content</div>
      </ExpandableNode>
    ));

    const button = container.querySelector("button");
    expect(button?.getAttribute("data-expanded")).toBe("false");

    if (button) {
      fireEvent.click(button);
    }
    expect(button?.getAttribute("data-expanded")).toBe("true");
  });

  it("button has aria-expanded attribute matching isExpanded state", () => {
    const { container } = render(() => (
      <ExpandableNode preview={<span>Preview</span>}>
        <div>Content</div>
      </ExpandableNode>
    ));

    const button = container.querySelector("button");
    expect(button?.getAttribute("aria-expanded")).toBe("false");

    if (button) {
      fireEvent.click(button);
    }
    expect(button?.getAttribute("aria-expanded")).toBe("true");
  });

  it("button aria-controls references content panel id", () => {
    const { container } = render(() => (
      <ExpandableNode preview={<span>Preview</span>}>
        <div>Content</div>
      </ExpandableNode>
    ));

    const button = container.querySelector("button");
    const contentId = button?.getAttribute("aria-controls");
    expect(contentId).toBeTruthy();
    expect(EXPANDABLE_CONTENT_REGEX.test(contentId ?? "")).toBe(true);

    const contentPanel = container.querySelector(`#${contentId}`);
    expect(contentPanel).not.toBeNull();
  });

  it("button aria-controls uses stateKey for stable id when provided", () => {
    const key = { custom: "reference" };
    const { container } = render(() => (
      <ExpandableNode preview={<span>Preview</span>} stateKey={key}>
        <div>Content</div>
      </ExpandableNode>
    ));

    const button = container.querySelector("button");
    const contentId = button?.getAttribute("aria-controls");
    expect(contentId).toBeTruthy();
    expect(contentId?.startsWith("expandable-content-")).toBe(true);

    const contentPanel = container.querySelector(`#${contentId}`);
    expect(contentPanel).not.toBeNull();
  });

  it("only renders ChevronRight icon (no ChevronDown)", () => {
    const { container } = render(() => (
      <ExpandableNode preview={<span>Preview</span>}>
        <div>Content</div>
      </ExpandableNode>
    ));

    const chevronDown = container.querySelector('[data-lucide="chevron-down"]');
    expect(chevronDown).toBeNull();

    const svg = container.querySelector("button svg");
    expect(svg).not.toBeNull();
  });

  it("icon span has motion-safe transition classes", () => {
    const { container } = render(() => (
      <ExpandableNode preview={<span>Preview</span>}>
        <div>Content</div>
      </ExpandableNode>
    ));

    const iconSpan = container.querySelector("button > span");
    expect(iconSpan).not.toBeNull();
    const classList = iconSpan?.className ?? "";
    expect(classList.includes("motion-safe:transition-transform")).toBe(true);
    expect(classList.includes("motion-safe:duration-150")).toBe(true);
    expect(classList.includes("data-[expanded=true]:rotate-90")).toBe(true);
    expect(classList.includes("rotate-0")).toBe(true);
  });

  it("content panel has id matching aria-controls", () => {
    const { container } = render(() => (
      <ExpandableNode preview={<span>Preview</span>}>
        <div>Content</div>
      </ExpandableNode>
    ));

    const button = container.querySelector("button");
    const contentId = button?.getAttribute("aria-controls");
    const contentPanel = container.querySelector(`#${contentId}`);

    expect(contentPanel).not.toBeNull();
    expect(contentPanel?.getAttribute("id")).toBe(contentId ?? "");
  });

  describe("ExpandableTrigger", () => {
    it("exposes aria-expanded and data-expanded matching isExpanded", () => {
      const [isExpanded, setIsExpanded] = createSignal(false);
      const onClick = vi.fn();
      const { getByRole } = render(() => (
        <ExpandableTrigger isExpanded={isExpanded()} onClick={onClick}>
          <span>Trigger Label</span>
        </ExpandableTrigger>
      ));

      const button = getByRole("button");
      expect(button.getAttribute("type")).toBe("button");
      expect(button.getAttribute("aria-expanded")).toBe("false");
      expect(button.getAttribute("data-expanded")).toBe("false");

      setIsExpanded(true);
      flush();
      expect(button.getAttribute("aria-expanded")).toBe("true");
      expect(button.getAttribute("data-expanded")).toBe("true");

      fireEvent.click(button);
      expect(onClick).toHaveBeenCalledOnce();
    });
  });
});
