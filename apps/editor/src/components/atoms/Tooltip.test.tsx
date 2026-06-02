import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { afterEach, describe, expect, it } from "vitest";
import {
  TooltipPopup,
  TooltipPortal,
  TooltipPositioner,
  TooltipRoot,
  TooltipTrigger,
  useTooltip,
} from "./Tooltip.tsx";

afterEach(() => cleanup());

function renderTooltip() {
  return render(() => (
    <TooltipRoot>
      <TooltipTrigger as="button" data-testid="trigger">
        Hover me
      </TooltipTrigger>
      <TooltipPortal>
        <TooltipPositioner>
          <TooltipPopup data-testid="popup">Tooltip content</TooltipPopup>
        </TooltipPositioner>
      </TooltipPortal>
    </TooltipRoot>
  ));
}

describe("Tooltip", () => {
  it("when rendered, popup is not in the DOM initially", () => {
    renderTooltip();
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("when trigger receives mouseenter, popup appears", () => {
    const { getByTestId } = renderTooltip();
    fireEvent.mouseEnter(getByTestId("trigger"));
    expect(screen.queryByRole("tooltip")).not.toBeNull();
  });

  it("when trigger receives mouseleave, popup disappears", () => {
    const { getByTestId } = renderTooltip();
    fireEvent.mouseEnter(getByTestId("trigger"));
    expect(screen.queryByRole("tooltip")).not.toBeNull();
    fireEvent.mouseLeave(getByTestId("trigger"));
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("when trigger uses as='button', renders a button element", () => {
    const { getByTestId } = renderTooltip();
    expect(getByTestId("trigger").tagName).toBe("BUTTON");
  });

  it("when trigger uses default as, renders a div element", () => {
    const { getByTestId } = render(() => (
      <TooltipRoot>
        <TooltipTrigger data-testid="trigger">Content</TooltipTrigger>
        <TooltipPortal>
          <TooltipPositioner>
            <TooltipPopup>Tip</TooltipPopup>
          </TooltipPositioner>
        </TooltipPortal>
      </TooltipRoot>
    ));
    expect(getByTestId("trigger").tagName).toBe("DIV");
  });

  it("when popup has custom class, merges with base classes", () => {
    const { getByTestId } = render(() => (
      <TooltipRoot>
        <TooltipTrigger as="button" data-testid="trigger">
          Hover
        </TooltipTrigger>
        <TooltipPortal>
          <TooltipPositioner>
            <TooltipPopup class="custom-class">Tip</TooltipPopup>
          </TooltipPositioner>
        </TooltipPortal>
      </TooltipRoot>
    ));
    fireEvent.mouseEnter(getByTestId("trigger"));
    const popup = screen.queryByRole("tooltip");
    expect(popup).not.toBeNull();
    expect(popup?.className).toContain("custom-class");
    expect(popup?.className).toContain("bg-surface");
  });

  it("when useTooltip is used outside TooltipRoot, throws error", () => {
    function BadComponent() {
      useTooltip();
      return <div />;
    }

    expect(() => {
      render(() => <BadComponent />);
    }).toThrow("Tooltip compound components must be used within <TooltipRoot>");
  });

  it("when popup is visible, has role='tooltip'", () => {
    const { getByTestId } = renderTooltip();
    fireEvent.mouseEnter(getByTestId("trigger"));
    const popup = screen.queryByRole("tooltip");
    expect(popup).not.toBeNull();
    expect(popup?.getAttribute("role")).toBe("tooltip");
  });
});
