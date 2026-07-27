import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Tabs } from "./Tabs.tsx";

afterEach(() => {
  cleanup();
});

/** Helper: dispatch a KeyboardEvent with the given key on the element. */
function pressKey(el: HTMLElement, key: string) {
  fireEvent.keyDown(el, { key });
}

describe("Tabs", () => {
  describe("Tab Selection", () => {
    it("activates the trigger matching defaultValue on mount", () => {
      render(() => (
        <Tabs.Root defaultValue="b">
          <Tabs.List>
            <Tabs.Trigger value="a">Tab A</Tabs.Trigger>
            <Tabs.Trigger value="b">Tab B</Tabs.Trigger>
            <Tabs.Trigger value="c">Tab C</Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="a">Content A</Tabs.Content>
          <Tabs.Content value="b">Content B</Tabs.Content>
          <Tabs.Content value="c">Content C</Tabs.Content>
        </Tabs.Root>
      ));

      const triggerA = screen.getByRole("tab", { name: "Tab A" });
      const triggerB = screen.getByRole("tab", { name: "Tab B" });
      const triggerC = screen.getByRole("tab", { name: "Tab C" });

      expect(triggerA.getAttribute("aria-selected")).toBe("false");
      expect(triggerB.getAttribute("aria-selected")).toBe("true");
      expect(triggerC.getAttribute("aria-selected")).toBe("false");

      // All panels are mounted; non-active ones carry the `hidden` attribute.
      const panels = screen.getAllByRole("tabpanel", { hidden: true });
      const panelA = panels.find((p) => p.textContent === "Content A");
      const panelB = panels.find((p) => p.textContent === "Content B");
      const panelC = panels.find((p) => p.textContent === "Content C");

      expect(panelA).toBeDefined();
      expect(panelB).toBeDefined();
      expect(panelC).toBeDefined();
      expect(panelA?.hasAttribute("hidden")).toBe(true);
      expect(panelB?.hasAttribute("hidden")).toBe(false);
      expect(panelC?.hasAttribute("hidden")).toBe(true);
    });

    it("updates the active trigger and panel when clicked", () => {
      render(() => (
        <Tabs.Root defaultValue="a">
          <Tabs.List>
            <Tabs.Trigger value="a">Tab A</Tabs.Trigger>
            <Tabs.Trigger value="b">Tab B</Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="a">Content A</Tabs.Content>
          <Tabs.Content value="b">Content B</Tabs.Content>
        </Tabs.Root>
      ));

      const triggerA = screen.getByRole("tab", { name: "Tab A" });
      const triggerB = screen.getByRole("tab", { name: "Tab B" });

      expect(triggerA.getAttribute("aria-selected")).toBe("true");

      fireEvent.click(triggerB);

      expect(triggerA.getAttribute("aria-selected")).toBe("false");
      expect(triggerB.getAttribute("aria-selected")).toBe("true");

      const panels = screen.getAllByRole("tabpanel", { hidden: true });
      const panelA = panels.find((p) => p.textContent === "Content A");
      const panelB = panels.find((p) => p.textContent === "Content B");
      expect(panelA?.hasAttribute("hidden")).toBe(true);
      expect(panelB?.hasAttribute("hidden")).toBe(false);
    });

    it("supports controlled mode via value and onValueChange", () => {
      const onValueChange = vi.fn();

      render(() => (
        <Tabs.Root onValueChange={onValueChange} value="a">
          <Tabs.List>
            <Tabs.Trigger value="a">Tab A</Tabs.Trigger>
            <Tabs.Trigger value="b">Tab B</Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="a">Content A</Tabs.Content>
          <Tabs.Content value="b">Content B</Tabs.Content>
        </Tabs.Root>
      ));

      const triggerB = screen.getByRole("tab", { name: "Tab B" });
      fireEvent.click(triggerB);

      // In controlled mode, the parent decides — visible tab stays at "a"
      expect(onValueChange).toHaveBeenCalledWith("b");
      const triggerA = screen.getByRole("tab", { name: "Tab A" });
      expect(triggerA.getAttribute("aria-selected")).toBe("true");
      expect(triggerB.getAttribute("aria-selected")).toBe("false");
    });
  });

  describe("Keyboard Navigation", () => {
    it("ArrowRight moves focus and activates the next trigger", () => {
      render(() => (
        <Tabs.Root defaultValue="a">
          <Tabs.List>
            <Tabs.Trigger value="a">Tab A</Tabs.Trigger>
            <Tabs.Trigger value="b">Tab B</Tabs.Trigger>
            <Tabs.Trigger value="c">Tab C</Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="a">Content A</Tabs.Content>
          <Tabs.Content value="b">Content B</Tabs.Content>
          <Tabs.Content value="c">Content C</Tabs.Content>
        </Tabs.Root>
      ));

      const triggerA = screen.getByRole("tab", { name: "Tab A" });
      const triggerB = screen.getByRole("tab", { name: "Tab B" });
      triggerA.focus();

      pressKey(triggerA, "ArrowRight");

      expect(document.activeElement).toBe(triggerB);
      expect(triggerB.getAttribute("aria-selected")).toBe("true");
    });

    it("ArrowLeft from the first trigger wraps focus to the last", () => {
      render(() => (
        <Tabs.Root defaultValue="a">
          <Tabs.List>
            <Tabs.Trigger value="a">Tab A</Tabs.Trigger>
            <Tabs.Trigger value="b">Tab B</Tabs.Trigger>
            <Tabs.Trigger value="c">Tab C</Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="a">Content A</Tabs.Content>
          <Tabs.Content value="b">Content B</Tabs.Content>
          <Tabs.Content value="c">Content C</Tabs.Content>
        </Tabs.Root>
      ));

      const triggerA = screen.getByRole("tab", { name: "Tab A" });
      const triggerC = screen.getByRole("tab", { name: "Tab C" });
      triggerA.focus();

      pressKey(triggerA, "ArrowLeft");

      expect(document.activeElement).toBe(triggerC);
      expect(triggerC.getAttribute("aria-selected")).toBe("true");
    });

    it("ArrowDown navigates vertically when orientation is vertical", () => {
      render(() => (
        <Tabs.Root defaultValue="a" orientation="vertical">
          <Tabs.List>
            <Tabs.Trigger value="a">Tab A</Tabs.Trigger>
            <Tabs.Trigger value="b">Tab B</Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="a">Content A</Tabs.Content>
          <Tabs.Content value="b">Content B</Tabs.Content>
        </Tabs.Root>
      ));

      const triggerA = screen.getByRole("tab", { name: "Tab A" });
      const triggerB = screen.getByRole("tab", { name: "Tab B" });
      triggerA.focus();

      pressKey(triggerA, "ArrowDown");

      expect(document.activeElement).toBe(triggerB);
      expect(triggerB.getAttribute("aria-selected")).toBe("true");
    });

    it("Home moves focus and activates the first trigger", () => {
      render(() => (
        <Tabs.Root defaultValue="c">
          <Tabs.List>
            <Tabs.Trigger value="a">Tab A</Tabs.Trigger>
            <Tabs.Trigger value="b">Tab B</Tabs.Trigger>
            <Tabs.Trigger value="c">Tab C</Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="a">Content A</Tabs.Content>
          <Tabs.Content value="b">Content B</Tabs.Content>
          <Tabs.Content value="c">Content C</Tabs.Content>
        </Tabs.Root>
      ));

      const triggerA = screen.getByRole("tab", { name: "Tab A" });
      const triggerC = screen.getByRole("tab", { name: "Tab C" });
      triggerC.focus();

      pressKey(triggerC, "Home");

      expect(document.activeElement).toBe(triggerA);
      expect(triggerA.getAttribute("aria-selected")).toBe("true");
    });

    it("End moves focus and activates the last trigger", () => {
      render(() => (
        <Tabs.Root defaultValue="a">
          <Tabs.List>
            <Tabs.Trigger value="a">Tab A</Tabs.Trigger>
            <Tabs.Trigger value="b">Tab B</Tabs.Trigger>
            <Tabs.Trigger value="c">Tab C</Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="a">Content A</Tabs.Content>
          <Tabs.Content value="b">Content B</Tabs.Content>
          <Tabs.Content value="c">Content C</Tabs.Content>
        </Tabs.Root>
      ));

      const triggerA = screen.getByRole("tab", { name: "Tab A" });
      const triggerC = screen.getByRole("tab", { name: "Tab C" });
      triggerA.focus();

      pressKey(triggerA, "End");

      expect(document.activeElement).toBe(triggerC);
      expect(triggerC.getAttribute("aria-selected")).toBe("true");
    });

    it("skips disabled triggers during keyboard navigation", () => {
      render(() => (
        <Tabs.Root defaultValue="a">
          <Tabs.List>
            <Tabs.Trigger value="a">Tab A</Tabs.Trigger>
            <Tabs.Trigger disabled value="b">
              Tab B
            </Tabs.Trigger>
            <Tabs.Trigger value="c">Tab C</Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="a">Content A</Tabs.Content>
          <Tabs.Content value="b">Content B</Tabs.Content>
          <Tabs.Content value="c">Content C</Tabs.Content>
        </Tabs.Root>
      ));

      const triggerA = screen.getByRole("tab", { name: "Tab A" });
      const triggerC = screen.getByRole("tab", { name: "Tab C" });
      triggerA.focus();

      // ArrowRight should jump from "a" straight to "c" since "b" is disabled
      pressKey(triggerA, "ArrowRight");

      expect(document.activeElement).toBe(triggerC);
    });
  });

  describe("Disabled Trigger", () => {
    it("does not change active state when a disabled trigger is clicked", () => {
      render(() => (
        <Tabs.Root defaultValue="a">
          <Tabs.List>
            <Tabs.Trigger value="a">Tab A</Tabs.Trigger>
            <Tabs.Trigger disabled value="b">
              Tab B
            </Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="a">Content A</Tabs.Content>
          <Tabs.Content value="b">Content B</Tabs.Content>
        </Tabs.Root>
      ));

      const triggerA = screen.getByRole("tab", { name: "Tab A" });
      const triggerB = screen.getByRole("tab", { name: "Tab B" });

      fireEvent.click(triggerB);

      expect(triggerA.getAttribute("aria-selected")).toBe("true");
      expect(triggerB.getAttribute("aria-selected")).toBe("false");
    });

    it("applies disabled styling (opacity-50 + cursor-not-allowed)", () => {
      render(() => (
        <Tabs.Root defaultValue="a">
          <Tabs.List>
            <Tabs.Trigger value="a">Tab A</Tabs.Trigger>
            <Tabs.Trigger disabled value="b">
              Tab B
            </Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="a">Content A</Tabs.Content>
          <Tabs.Content value="b">Content B</Tabs.Content>
        </Tabs.Root>
      ));

      const triggerB = screen.getByRole("tab", { name: "Tab B" });
      expect(triggerB.classList.contains("opacity-50")).toBe(true);
      expect(triggerB.classList.contains("cursor-not-allowed")).toBe(true);
      expect(triggerB.hasAttribute("disabled")).toBe(true);
    });
  });

  describe("ARIA Roles and Attributes", () => {
    it("renders tablist, tab, and tabpanel roles", () => {
      render(() => (
        <Tabs.Root defaultValue="a">
          <Tabs.List>
            <Tabs.Trigger value="a">Tab A</Tabs.Trigger>
            <Tabs.Trigger value="b">Tab B</Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="a">Content A</Tabs.Content>
          <Tabs.Content value="b">Content B</Tabs.Content>
        </Tabs.Root>
      ));

      expect(screen.getByRole("tablist")).not.toBeNull();
      expect(screen.getAllByRole("tab")).toHaveLength(2);
      expect(screen.getAllByRole("tabpanel", { hidden: true })).toHaveLength(2);
    });

    it("links triggers to panels via aria-controls and aria-labelledby", () => {
      render(() => (
        <Tabs.Root defaultValue="a">
          <Tabs.List>
            <Tabs.Trigger value="a">Tab A</Tabs.Trigger>
            <Tabs.Trigger value="b">Tab B</Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="a">Content A</Tabs.Content>
          <Tabs.Content value="b">Content B</Tabs.Content>
        </Tabs.Root>
      ));

      const triggerA = screen.getByRole("tab", { name: "Tab A" });
      const triggerB = screen.getByRole("tab", { name: "Tab B" });
      const triggerAId = triggerA.id;
      const triggerBId = triggerB.id;
      const controlsA = triggerA.getAttribute("aria-controls");
      const controlsB = triggerB.getAttribute("aria-controls");
      expect(controlsA).toBeTruthy();
      expect(controlsB).toBeTruthy();
      expect(controlsA).not.toBe(controlsB);

      const panels = screen.getAllByRole("tabpanel", { hidden: true });
      const panelA = panels.find((p) => p.textContent === "Content A");
      const panelB = panels.find((p) => p.textContent === "Content B");
      expect(panelA?.id).toBe(controlsA);
      expect(panelB?.id).toBe(controlsB);
      expect(panelA?.getAttribute("aria-labelledby")).toBe(triggerAId);
      expect(panelB?.getAttribute("aria-labelledby")).toBe(triggerBId);
    });

    it("sets aria-orientation matching the orientation prop", () => {
      render(() => (
        <Tabs.Root defaultValue="a" orientation="vertical">
          <Tabs.List>
            <Tabs.Trigger value="a">Tab A</Tabs.Trigger>
            <Tabs.Trigger value="b">Tab B</Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="a">Content A</Tabs.Content>
          <Tabs.Content value="b">Content B</Tabs.Content>
        </Tabs.Root>
      ));

      const list = screen.getByRole("tablist");
      expect(list.getAttribute("aria-orientation")).toBe("vertical");
    });

    it("sets roving tabindex: active trigger has tabIndex=0, others -1", () => {
      render(() => (
        <Tabs.Root defaultValue="a">
          <Tabs.List>
            <Tabs.Trigger value="a">Tab A</Tabs.Trigger>
            <Tabs.Trigger value="b">Tab B</Tabs.Trigger>
            <Tabs.Trigger value="c">Tab C</Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="a">Content A</Tabs.Content>
          <Tabs.Content value="b">Content B</Tabs.Content>
          <Tabs.Content value="c">Content C</Tabs.Content>
        </Tabs.Root>
      ));

      const triggerA = screen.getByRole("tab", { name: "Tab A" });
      const triggerB = screen.getByRole("tab", { name: "Tab B" });
      const triggerC = screen.getByRole("tab", { name: "Tab C" });

      expect(triggerA.tabIndex).toBe(0);
      expect(triggerB.tabIndex).toBe(-1);
      expect(triggerC.tabIndex).toBe(-1);
    });

    it("moves tabIndex to the newly active trigger after click", () => {
      render(() => (
        <Tabs.Root defaultValue="a">
          <Tabs.List>
            <Tabs.Trigger value="a">Tab A</Tabs.Trigger>
            <Tabs.Trigger value="b">Tab B</Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="a">Content A</Tabs.Content>
          <Tabs.Content value="b">Content B</Tabs.Content>
        </Tabs.Root>
      ));

      const triggerA = screen.getByRole("tab", { name: "Tab A" });
      const triggerB = screen.getByRole("tab", { name: "Tab B" });
      expect(triggerA.tabIndex).toBe(0);

      fireEvent.click(triggerB);

      expect(triggerA.tabIndex).toBe(-1);
      expect(triggerB.tabIndex).toBe(0);
    });

    it("renders tabpanels with tabIndex=0 to allow focus", () => {
      render(() => (
        <Tabs.Root defaultValue="a">
          <Tabs.List>
            <Tabs.Trigger value="a">Tab A</Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="a">Content A</Tabs.Content>
        </Tabs.Root>
      ));

      const panel = screen.getByRole("tabpanel", { name: "Tab A" });
      expect(panel.tabIndex).toBe(0);
    });
  });

  describe("Visual States", () => {
    it("applies active trigger styling (border-outline-variant, bg-surface-variant)", () => {
      render(() => (
        <Tabs.Root defaultValue="a">
          <Tabs.List>
            <Tabs.Trigger value="a">Tab A</Tabs.Trigger>
            <Tabs.Trigger value="b">Tab B</Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="a">Content A</Tabs.Content>
          <Tabs.Content value="b">Content B</Tabs.Content>
        </Tabs.Root>
      ));

      const triggerA = screen.getByRole("tab", { name: "Tab A" });
      const triggerB = screen.getByRole("tab", { name: "Tab B" });

      expect(triggerA.classList.contains("bg-surface-variant")).toBe(true);
      expect(triggerA.classList.contains("text-on-surface")).toBe(true);

      // Inactive trigger has muted text color
      expect(triggerB.classList.contains("text-on-surface-variant")).toBe(true);
    });
  });
});
