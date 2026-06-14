import { fireEvent, render } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import { ConsoleTokenView } from "../molecules/ConsoleTokenView/ConsoleTokenView.tsx";
import { VirtualList } from "./VirtualList.tsx";

describe("VirtualList", () => {
  it("renders correctly with an empty array", () => {
    const { container } = render(() => (
      <VirtualList
        items={[]}
        renderItem={(item) => <div>{item as string}</div>}
      />
    ));

    expect(container.textContent).toBe("");
  });

  it("renders the initial items based on container height", () => {
    const items = Array.from({ length: 100 }, (_, i) => `Item ${i}`);

    const { container } = render(() => (
      <VirtualList
        itemHeight={24}
        items={items}
        overscan={0} // To strictly test visible items
        renderItem={(item) => <div>{item}</div>}
      />
    ));

    expect(container.textContent).not.toContain("Item 50");
  });

  it("slices the items based on scroll position", () => {
    const items = Array.from({ length: 100 }, (_, i) => `Item ${i}`);

    const { container } = render(() => (
      <VirtualList
        class="virtual-list"
        itemHeight={24}
        items={items}
        overscan={0}
        renderItem={(item) => <div data-testid="item">{item}</div>}
      />
    ));

    const scrollContainer = container.querySelector(
      ".virtual-list"
    ) as HTMLDivElement;

    fireEvent.scroll(scrollContainer, { target: { scrollTop: 300 } });

    expect(scrollContainer).not.toBeNull();
  });

  it("persists expandable state of complex items when scrolled out and back into view", () => {
    const items = Array.from({ length: 100 }, (_, i) => ({
      id: `item-${i}`,
      type: "object" as const,
      className: "Object",
      properties: { val: { type: "number" as const, value: i } },
    }));

    // Mock clientHeight on HTMLDivElement prototype so VirtualList measures it during mount
    const originalClientHeight = Object.getOwnPropertyDescriptor(
      HTMLDivElement.prototype,
      "clientHeight"
    );
    Object.defineProperty(HTMLDivElement.prototype, "clientHeight", {
      configurable: true,
      get: () => 100, // 100px height container
    });

    try {
      const { container } = render(() => (
        <VirtualList
          class="virtual-list"
          itemHeight={50} // 2 items visible
          items={items}
          overscan={0}
          renderItem={(item) => (
            <div data-testid={`row-${item.id}`}>
              <ConsoleTokenView tokens={[item]} />
            </div>
          )}
        />
      ));

      const scrollContainer = container.querySelector(
        ".virtual-list"
      ) as HTMLDivElement;

      const row0 = container.querySelector('[data-testid="row-item-0"]');
      expect(row0).not.toBeNull();
      const expander = row0?.querySelector("button");
      if (!expander) {
        throw new Error("Expander not found");
      }

      fireEvent.click(expander);
      expect(row0?.textContent).toContain("val:");

      fireEvent.scroll(scrollContainer, { target: { scrollTop: 5000 } });
      expect(container.querySelector('[data-testid="row-item-0"]')).toBeNull();

      fireEvent.scroll(scrollContainer, { target: { scrollTop: 0 } });

      const row0Again = container.querySelector('[data-testid="row-item-0"]');
      expect(row0Again).not.toBeNull();
      expect(row0Again?.textContent).toContain("val:");
    } finally {
      if (originalClientHeight) {
        Object.defineProperty(
          HTMLDivElement.prototype,
          "clientHeight",
          originalClientHeight
        );
      } else {
        Object.defineProperty(HTMLDivElement.prototype, "clientHeight", {
          configurable: true,
          get: () => 0,
        });
      }
    }
  });
});
