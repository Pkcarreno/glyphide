import type { JSX } from "@solidjs/web";
import type { Accessor } from "solid-js";
import {
  createEffect,
  createMemo,
  createSignal,
  For,
  onSettled,
  untrack,
} from "solid-js";

type ItemKey<T> = T | string | number;

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
  /** Optional key resolver for stable item identity across reference changes */
  getKey?: (item: T) => string | number;
  /** Estimated height for unmeasured items */
  itemHeight?: number;
  /** The full array of items */
  items: T[];
  /** Number of items to render outside the visible window */
  overscan?: number;
  /** Render callback for each item */
  renderItem: (item: T, index: Accessor<number>) => JSX.Element;
}

interface VirtualRowProps<T> {
  children: JSX.Element;
  elementToKeyMap: WeakMap<Element, ItemKey<T>>;
  itemHeights: Map<ItemKey<T>, number>;
  itemKey: ItemKey<T>;
  observer?: ResizeObserver;
  offset: number;
}

function VirtualRow<T>(props: VirtualRowProps<T>) {
  let element: HTMLDivElement | undefined;

  onSettled(() => {
    if (element) {
      props.elementToKeyMap.set(element, props.itemKey);
      const height = element.offsetHeight;
      if (height > 0 && props.itemHeights.get(props.itemKey) !== height) {
        props.itemHeights.set(props.itemKey, height);
      }
    }
    return () => {
      if (element) {
        props.elementToKeyMap.delete(element);
      }
    };
  });

  createEffect(
    () => props.observer,
    (observer) => {
      const observedElement = element;
      if (!(observedElement && observer)) {
        return;
      }
      observer.observe(observedElement);
      return () => {
        observer.unobserve(observedElement);
      };
    }
  );

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
  const itemHeights = new Map<ItemKey<T>, number>();
  const [itemHeightsVersion, setItemHeightsVersion] = createSignal(0);

  const defaultItemHeight = () => props.itemHeight ?? 24;
  const resolveKey = (item: T): ItemKey<T> =>
    props.getKey ? props.getKey(item) : item;

  const computedLayout = createMemo(() => {
    itemHeightsVersion(); // Recompute when item heights change
    const { items } = props;

    if (items.length === 0) {
      itemHeights.clear();
    }

    const defaultSize = defaultItemHeight();
    const itemVerticalOffsets = new Float64Array(items.length);
    const activeKeys =
      itemHeights.size > 0 && items.length > 0
        ? new Set<ItemKey<T>>()
        : undefined;
    let totalScrollHeight = 0;

    for (let i = 0; i < items.length; i += 1) {
      itemVerticalOffsets[i] = totalScrollHeight;
      const key = resolveKey(items[i]);
      activeKeys?.add(key);
      const cachedHeight = itemHeights.get(key);
      totalScrollHeight +=
        cachedHeight !== undefined && cachedHeight > 0
          ? cachedHeight
          : defaultSize;
    }

    if (activeKeys) {
      for (const cachedKey of itemHeights.keys()) {
        if (!activeKeys.has(cachedKey)) {
          itemHeights.delete(cachedKey);
        }
      }
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

  const elementToKeyMap = new WeakMap<Element, ItemKey<T>>();
  const [itemHeightObserver, setItemHeightObserver] =
    createSignal<ResizeObserver>();

  onSettled(() => {
    if (!scrollContainerElement) {
      return;
    }

    // ResizeObserver tracks dynamic changes in item heights
    const observer = new ResizeObserver((entries) => {
      let hasHeightChanged = false;
      for (const entry of entries) {
        const key = elementToKeyMap.get(entry.target);
        if (key !== undefined) {
          const height =
            entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
          if (itemHeights.get(key) !== height) {
            itemHeights.set(key, height);
            hasHeightChanged = true;
          }
        }
      }
      if (hasHeightChanged) {
        setItemHeightsVersion((version) => version + 1);
      }
    });
    setItemHeightObserver(observer);

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
      observer.disconnect();
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
        <For each={visibleItems()} keyed={resolveKey}>
          {(item, reactiveVisibleIndex) => {
            const absoluteItemIndex = () =>
              visibleRange().start + reactiveVisibleIndex();
            // Read once on mount so object replacement with the same key preserves row state.
            const initialItem = untrack(item);

            return (
              <VirtualRow
                elementToKeyMap={elementToKeyMap}
                itemHeights={itemHeights}
                itemKey={resolveKey(initialItem)}
                observer={itemHeightObserver()}
                offset={
                  computedLayout().itemVerticalOffsets[absoluteItemIndex()] ?? 0
                }
              >
                {props.renderItem(initialItem, absoluteItemIndex)}
              </VirtualRow>
            );
          }}
        </For>
      </div>
    </div>
  );
}
