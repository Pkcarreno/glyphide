import type { JSX } from "@solidjs/web";
import { createMemo, createSignal, For, onSettled } from "solid-js";

/**
 * Configuration props for the VirtualList component.
 *
 * Intent: Describes the item collection, rendering strategy, and dimensions required
 * for layout computation.
 *
 * Edge cases: If `items` is empty, it renders an empty container.
 *
 * Side effects: None.
 */
interface VirtualListProps<T> {
  /** CSS classes for the scroll container */
  class?: string;
  /** Estimated height for unmeasured items */
  itemHeight?: number;
  /** The full array of items */
  items: T[];
  /** Number of items to render outside the visible window */
  overscan?: number;
  /** Render callback for each item */
  renderItem: (item: T, index: number) => JSX.Element;
}

interface VirtualRowProps<T> {
  children: JSX.Element;
  elementToItemMap: WeakMap<Element, T>;
  item: T;
  itemHeights: Map<T, number>;
  observer?: ResizeObserver;
  offset: number;
}

function VirtualRow<T>(props: VirtualRowProps<T>) {
  let element: HTMLDivElement | undefined;

  onSettled(() => {
    if (element) {
      if (props.observer) {
        props.observer.observe(element);
      }
      props.elementToItemMap.set(element, props.item);
      const height = element.offsetHeight;
      if (height > 0 && props.itemHeights.get(props.item) !== height) {
        props.itemHeights.set(props.item, height);
      }
    }
    return () => {
      if (element) {
        if (props.observer) {
          props.observer.unobserve(element);
        }
        props.elementToItemMap.delete(element);
      }
    };
  });

  return (
    <div
      class="absolute top-0 left-0 w-full"
      ref={(el) => {
        element = el;
      }}
      style={{
        transform: `translateY(${props.offset}px)`,
      }}
    >
      {props.children}
    </div>
  );
}

/**
 * A highly optimized, dependency-free Virtual List for dynamic height items.
 * Uses Prefix Sums for O(N) layout calculations and Binary Search for O(log N) scroll positioning.
 */
export function VirtualList<T>(props: VirtualListProps<T>) {
  let scrollContainerElement: HTMLDivElement | undefined;
  const [scrollTop, setScrollTop] = createSignal(0);
  const [clientHeight, setClientHeight] = createSignal(0);

  // Mutable map for ultra-fast, reference-stable height caching.
  // We use a version signal to tell Solid when it needs to recalculate layout.
  const itemHeights = new Map<T, number>();
  const [itemHeightsVersion, setItemHeightsVersion] = createSignal(0);

  const defaultItemHeight = () => props.itemHeight ?? 24;

  const computedLayout = createMemo(() => {
    itemHeightsVersion(); // Recompute when item heights change
    const { items } = props;

    const defaultSize = defaultItemHeight();
    const itemVerticalOffsets = new Float64Array(items.length);
    let totalScrollHeight = 0;

    for (let i = 0; i < items.length; i += 1) {
      itemVerticalOffsets[i] = totalScrollHeight;
      const cachedHeight = itemHeights.get(items[i]);
      totalScrollHeight +=
        cachedHeight !== undefined && cachedHeight > 0
          ? cachedHeight
          : defaultSize;
    }

    return { itemVerticalOffsets, totalScrollHeight };
  });

  // Binary search to find the first item index that is visible at the current scrollTop
  function findStartIndex(
    itemVerticalOffsets: Float64Array,
    currentScrollTop: number
  ) {
    let low = 0;
    let high = itemVerticalOffsets.length - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (itemVerticalOffsets[mid] < currentScrollTop) {
        low = mid + 1;
      } else if (itemVerticalOffsets[mid] > currentScrollTop) {
        high = mid - 1;
      } else {
        return mid;
      }
    }
    return low > 0 ? low - 1 : 0;
  }

  const visibleRange = createMemo(() => {
    const { itemVerticalOffsets } = computedLayout();
    const currentScrollTop = scrollTop();
    const viewportHeight = clientHeight();
    const totalItemsCount = props.items.length;

    if (totalItemsCount === 0) {
      return { end: 0, start: 0 };
    }

    const start = findStartIndex(itemVerticalOffsets, currentScrollTop);
    let end = start;

    while (
      end < totalItemsCount &&
      itemVerticalOffsets[end] < currentScrollTop + viewportHeight
    ) {
      end += 1;
    }

    const overscan = props.overscan ?? 10;
    return {
      end: Math.min(totalItemsCount, end + overscan),
      start: Math.max(0, start - overscan),
    };
  });

  const elementToItemMap = new WeakMap<Element, T>();
  let itemHeightObserver: ResizeObserver | undefined;

  onSettled(() => {
    if (!scrollContainerElement) {
      return;
    }

    // ResizeObserver tracks dynamic changes in item heights
    itemHeightObserver = new ResizeObserver((entries) => {
      let hasHeightChanged = false;
      for (const entry of entries) {
        const item = elementToItemMap.get(entry.target);
        if (item !== undefined) {
          const height =
            entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
          if (itemHeights.get(item) !== height) {
            itemHeights.set(item, height);
            hasHeightChanged = true;
          }
        }
      }
      if (hasHeightChanged) {
        setItemHeightsVersion((version) => version + 1);
      }
    });

    const handleScroll = () => {
      if (scrollContainerElement) {
        setScrollTop(scrollContainerElement.scrollTop);
      }
    };

    const handleResize = () => {
      if (scrollContainerElement) {
        setClientHeight(scrollContainerElement.clientHeight);
      }
    };

    scrollContainerElement.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    // Initial measure
    handleResize();

    // Observe container resizes
    const containerResizeObserver = new ResizeObserver(handleResize);
    containerResizeObserver.observe(scrollContainerElement);

    return () => {
      scrollContainerElement?.removeEventListener("scroll", handleScroll);
      containerResizeObserver.disconnect();
      itemHeightObserver?.disconnect();
    };
  });

  // Return the raw slice to maintain referential stability for Solid's <For>
  const visibleItems = createMemo(() => {
    const { start, end } = visibleRange();
    return props.items.slice(start, end);
  });

  return (
    <div
      class={`relative overflow-x-hidden overflow-y-auto ${props.class ?? ""}`}
      ref={(containerElement) => {
        scrollContainerElement = containerElement;
      }}
    >
      <div
        class="relative w-full"
        style={{ height: `${computedLayout().totalScrollHeight}px` }}
      >
        <For each={visibleItems()}>
          {(item, reactiveVisibleIndex) => {
            const absoluteItemIndex = () =>
              visibleRange().start + reactiveVisibleIndex();

            return (
              <VirtualRow
                elementToItemMap={elementToItemMap}
                item={item}
                itemHeights={itemHeights}
                observer={itemHeightObserver}
                offset={
                  computedLayout().itemVerticalOffsets[absoluteItemIndex()]
                }
              >
                {props.renderItem(item, absoluteItemIndex())}
              </VirtualRow>
            );
          }}
        </For>
      </div>
    </div>
  );
}
