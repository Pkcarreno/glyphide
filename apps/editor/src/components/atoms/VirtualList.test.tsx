import { fireEvent, render } from "@solidjs/testing-library";
import { createSignal, flush } from "solid-js";
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
        renderItem={(item, index) => (
          <div>
            {index()}: {item}
          </div>
        )}
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
        renderItem={(item, index) => (
          <div data-testid="item">
            {index()}: {item}
          </div>
        )}
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
      className: "Object",
      id: `item-${i}`,
      properties: { val: { type: "number" as const, value: i } },
      type: "object" as const,
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

  it("preserves DOM nodes and expansion state across object replacement when getKey matches", () => {
    const createToken = (val: number) => ({
      className: "Object",
      properties: { val: { type: "number" as const, value: val } },
      type: "object" as const,
    });

    const [items, setItems] = createSignal([
      { id: "row-a", token: createToken(1) },
      { id: "row-b", token: createToken(2) },
    ]);

    const { container } = render(() => (
      <VirtualList
        getKey={(item) => item.id}
        itemHeight={24}
        items={items()}
        renderItem={(item) => (
          <div data-testid={`item-${item.id}`}>
            <ConsoleTokenView tokens={[item.token]} />
          </div>
        )}
      />
    ));

    const rowABefore = container.querySelector('[data-testid="item-row-a"]');
    const expanderBefore = rowABefore?.querySelector("button");
    if (!(rowABefore && expanderBefore)) {
      throw new Error("Row or expander not found");
    }

    fireEvent.click(expanderBefore);
    expect(rowABefore.textContent).toContain("val:");

    // Replace items with new object and token instances sharing the same keys.
    setItems([
      { id: "row-a", token: createToken(10) },
      { id: "row-b", token: createToken(20) },
    ]);
    flush();

    const rowAAfter = container.querySelector('[data-testid="item-row-a"]');
    expect(rowAAfter).toBe(rowABefore);
    expect(rowAAfter?.querySelector("button")).toBe(expanderBefore);
    expect(rowAAfter?.textContent).toContain("val:");
  });

  it("updates index reactively in renderItem when preceding items change", () => {
    const [items, setItems] = createSignal([
      { id: "a", label: "Alpha" },
      { id: "b", label: "Beta" },
      { id: "c", label: "Gamma" },
    ]);

    const { container } = render(() => (
      <VirtualList
        getKey={(item) => item.id}
        itemHeight={24}
        items={items()}
        renderItem={(item, index) => (
          <div data-testid={`item-${item.id}`}>
            {index()}:{item.label}
          </div>
        )}
      />
    ));

    const betaEl = container.querySelector('[data-testid="item-b"]');
    const gammaEl = container.querySelector('[data-testid="item-c"]');
    expect(betaEl?.textContent).toBe("1:Beta");
    expect(gammaEl?.textContent).toBe("2:Gamma");

    setItems([
      { id: "b", label: "Beta" },
      { id: "c", label: "Gamma" },
    ]);
    flush();

    expect(container.querySelector('[data-testid="item-b"]')).toBe(betaEl);
    expect(container.querySelector('[data-testid="item-c"]')).toBe(gammaEl);
    expect(betaEl?.textContent).toBe("0:Beta");
    expect(gammaEl?.textContent).toBe("1:Gamma");

    setItems([
      { id: "z", label: "Zeta" },
      { id: "b", label: "Beta" },
      { id: "c", label: "Gamma" },
    ]);
    flush();

    expect(container.querySelector('[data-testid="item-b"]')).toBe(betaEl);
    expect(betaEl?.textContent).toBe("1:Beta");
    expect(gammaEl?.textContent).toBe("2:Gamma");
  });

  it("caches heights by resolved key and prunes stale keys when items shrink or clear", () => {
    const originalResizeObserver = globalThis.ResizeObserver;
    const observers: {
      callback: ResizeObserverCallback;
      targets: Set<Element>;
    }[] = [];

    class MockResizeObserver implements ResizeObserver {
      private readonly record: {
        callback: ResizeObserverCallback;
        targets: Set<Element>;
      };

      constructor(callback: ResizeObserverCallback) {
        this.record = { callback, targets: new Set() };
        observers.push(this.record);
      }

      observe(target: Element) {
        this.record.targets.add(target);
      }

      unobserve(target: Element) {
        this.record.targets.delete(target);
      }

      disconnect() {
        this.record.targets.clear();
      }
    }

    globalThis.ResizeObserver =
      MockResizeObserver as unknown as typeof ResizeObserver;

    const triggerRowResize = (target: Element, height: number) => {
      for (const observer of observers) {
        if (observer.targets.has(target)) {
          observer.callback(
            [
              {
                borderBoxSize: [
                  { blockSize: height, inlineSize: 100 } as ResizeObserverSize,
                ],
                contentRect: { height } as DOMRectReadOnly,
                target,
              } as unknown as ResizeObserverEntry,
            ],
            {} as ResizeObserver
          );
        }
      }
      flush();
    };

    try {
      const [items, setItems] = createSignal([
        { id: "a", label: "Alpha" },
        { id: "b", label: "Beta" },
      ]);

      const { container } = render(() => (
        <VirtualList
          class="virtual-list"
          getKey={(item) => item.id}
          itemHeight={24}
          items={items()}
          renderItem={(item) => (
            <div data-testid={`item-${item.id}`}>{item.label}</div>
          )}
        />
      ));

      const scrollContainer = container.querySelector(
        ".virtual-list"
      ) as HTMLDivElement;
      const spacer = scrollContainer.firstElementChild as HTMLDivElement;
      expect(spacer.style.height).toBe("48px");

      const rowAWrapper = container.querySelector('[data-testid="item-a"]')
        ?.parentElement as HTMLDivElement;
      triggerRowResize(rowAWrapper, 80);
      expect(spacer.style.height).toBe("104px");

      const rowBWrapper = container.querySelector('[data-testid="item-b"]')
        ?.parentElement as HTMLDivElement;
      expect(rowBWrapper.style.transform).toBe("translateY(80px)");

      // Object replacement with the same key reuses the cached height.
      setItems([
        { id: "a", label: "Alpha v2" },
        { id: "b", label: "Beta" },
      ]);
      flush();
      expect(spacer.style.height).toBe("104px");

      // Shrinking removes "a" and prunes its cached height.
      setItems([{ id: "b", label: "Beta" }]);
      flush();
      expect(spacer.style.height).toBe("24px");

      setItems([
        { id: "a", label: "Alpha re-added" },
        { id: "b", label: "Beta" },
      ]);
      flush();
      expect(spacer.style.height).toBe("48px");

      // Clearing removes all cached heights.
      triggerRowResize(
        container.querySelector('[data-testid="item-b"]')
          ?.parentElement as HTMLDivElement,
        60
      );
      expect(spacer.style.height).toBe("84px");

      setItems([]);
      flush();
      expect(spacer.style.height).toBe("0px");

      setItems([{ id: "b", label: "Beta re-added" }]);
      flush();
      expect(spacer.style.height).toBe("24px");
    } finally {
      globalThis.ResizeObserver = originalResizeObserver;
    }
  });
});
