if (
  typeof (globalThis as unknown as Record<string, unknown>).ResizeObserver ===
  "undefined"
) {
  (globalThis as unknown as Record<string, unknown>).ResizeObserver =
    class ResizeObserver {
      observe() {
        /* mocked */
      }
      unobserve() {
        /* mocked */
      }
      disconnect() {
        /* mocked */
      }
    };
}

if (
  typeof (globalThis as unknown as Record<string, unknown>)
    .requestAnimationFrame === "undefined"
) {
  (globalThis as unknown as Record<string, unknown>).requestAnimationFrame = (
    callback: (time: number) => void
  ) => {
    callback(Date.now());
    return 0;
  };
  (globalThis as unknown as Record<string, unknown>).cancelAnimationFrame =
    () => {
      /* mocked */
    };
} else {
  // If jsdom provides it, override it for synchronous test execution
  (globalThis as unknown as Record<string, unknown>).requestAnimationFrame = (
    callback: (time: number) => void
  ) => {
    callback(Date.now());
    return 0;
  };
  (globalThis as unknown as Record<string, unknown>).cancelAnimationFrame =
    () => {
      /* mocked */
    };
}

if (typeof window !== "undefined" && typeof window.matchMedia === "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => true,
    }),
  });
}
